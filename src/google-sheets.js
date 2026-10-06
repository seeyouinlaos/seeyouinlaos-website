/* ============================================================================
   H&S WEDDING 2027 — THE GOOGLE SHEETS CLIENT (server side only)
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · A, D, M, Z).

   WHY THIS FILE EXISTS. Google is the financial source of truth: 002 carries
   the structured item metadata, 008_Payment_Journal is the canonical and
   append-only guest payment journal, 009_Special_Rates carries the named
   rates, 010_Booking_Evidence_Index the evidence. The Worker therefore has to
   read and append rows in Google itself, and there is exactly one way in.

   WHY IT IS HAND WRITTEN. The `googleapis` package assumes Node: streams, the
   http module, a filesystem for the key. None of that exists in a Worker. So
   the whole of Google's authentication is done here with WebCrypto: a JWT
   assertion signed RS256 with the service account's PKCS#8 key, exchanged at
   oauth2.googleapis.com for a short-lived access token. That is about eighty
   lines, it has no dependencies, and every byte of it is auditable.

   WHERE THE CREDENTIAL LIVES. Only in the Worker secret
   GOOGLE_SERVICE_ACCOUNT_JSON, read from `env` inside this module and nowhere
   else. It is never written to a response, an asset, a log line or an error
   message: this file contains no logging at all, and every error detail taken
   from Google is scrubbed of the token, the assertion and any key block before
   it is attached. The spreadsheet id is NOT a secret; it names the workbook
   and does not open it, so the caller supplies it as configuration.

   THE TOKEN CACHE is module scope, which in a Worker means per isolate: one
   assertion is signed, the token is held until a minute before Google says it
   expires, and concurrent callers share the one mint in flight. A token
   Google rejects (HTTP 401) is dropped and minted once more, which is also
   how a rotated service account key is picked up without a redeploy.

   NO SILENT FALLBACK, EVER (Freeze · M, Z). Every function here throws
   GoogleSheetsUnavailable when the secret is absent or the API refuses, and
   it carries the HTTP status. There is no website-side journal, no cached
   copy, no "assume zero": an operation that cannot reach Google FAILS
   VISIBLY, and the surface above decides what the human is told. This module
   computes nothing financial. The only calculation path is src/billing/engine.js.

   TWO READING DECISIONS WORTH KNOWING:
     · values are fetched UNFORMATTED. A cell displayed as "$225.00" arrives
       from Google as the number 225, which model.toCents can read; the
       formatted string could not be parsed and would be mistaken for missing
       metadata, which would send a computable settlement to manual review.
     · dates are fetched FORMATTED_STRING, so 2027-01-30 stays the text
       "2027-01-30" for settlement.parseDay instead of a serial number.

   ONE WRITING DECISION: an append is never retried after an ambiguous
   failure. The journal is append-only and duplicates are kept and marked
   Duplicate_Suspect, never deduplicated, so a blind retry would plant an
   unmarked twin. If an append fails, the journal itself is the only place to
   look before anybody writes again. The single retry this module does make is
   on HTTP 401, where Google rejected the request before applying it.
   ========================================================================== */

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const ASSERTION_TTL = 3600;        /* seconds; Google's maximum for an assertion */
const EXPIRY_SKEW = 60000;         /* ms; a token is retired a minute early */
const DETAIL_MAX = 300;            /* characters of Google's own message we keep */

const clean = (v) => String(v == null ? '' : v).trim();

/* ------------------------------------------------------------------ errors */

/**
 * The one failure type this module raises. `status` is the HTTP status of the
 * refused call, or 0 when no HTTP exchange took place (missing secret,
 * unusable key, unreachable host). Nothing secret is ever put in it.
 */
export class GoogleSheetsUnavailable extends Error {
  constructor(reason, { status = 0, detail = '', notSent = false } = {}) {
    const where = status ? ' (HTTP ' + status + ')' : '';
    super(detail ? reason + where + ': ' + detail : reason + where);
    this.name = 'GoogleSheetsUnavailable';
    this.reason = reason;
    this.status = status;
    this.detail = detail;
    /* true only when it is CERTAIN no request reached Google (the write deadline
       had passed before sending); every other failure of a write is uncertain */
    this.notSent = !!notSent;
  }
}

/* A WRITE DEADLINE (Codex final review, round 3). A write that carries `notAfter`
   is never dispatched after that moment, and one in flight is aborted
   WRITE_GRACE_MS later — so whoever holds the decision on a payment knows that
   no request of an earlier, fenced-off writer can reach Google after it. */
const WRITE_GRACE_MS = 30 * 1000;

const unavailable = (reason, status, detail) =>
  new GoogleSheetsUnavailable(reason, { status: status || 0, detail: detail || '' });

/* Google's error bodies do not contain our credentials, but they are written
   by somebody else, so they are scrubbed before being shown to anyone. */
function redact(text, secrets) {
  let out = String(text == null ? '' : text);
  for (const s of secrets || []) {
    const v = typeof s === 'string' ? s : '';
    if (v.length > 8) out = out.split(v).join('[redacted]');
  }
  out = out.replace(/ya29\.[A-Za-z0-9._-]+/g, '[redacted]');
  out = out.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, '[redacted]');
  return out.replace(/\s+/g, ' ').trim().slice(0, DETAIL_MAX);
}

/* Google's own words about the refusal, which is what a human needs. */
function apiMessage(data, text, secrets) {
  const e = data && data.error;
  const said =
    (data && typeof data.error_description === 'string' && data.error_description) ||
    (e && typeof e.message === 'string' && e.message) ||
    (typeof e === 'string' && e) ||
    text;
  return redact(said, secrets);
}

async function bodyText(res) {
  try { return await res.text(); } catch (e) { return ''; }
}

/* ------------------------------------------------------------- credentials */

/**
 * The service account, parsed fresh from the secret on every call. Parsing a
 * couple of kilobytes of JSON is cheaper than keeping a second copy of a
 * credential alive in module memory.
 */
function credentials(env) {
  const raw = clean(env && env.GOOGLE_SERVICE_ACCOUNT_JSON);
  if (!raw) throw unavailable('the Worker secret GOOGLE_SERVICE_ACCOUNT_JSON is not configured');
  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) {
    throw unavailable('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw unavailable('GOOGLE_SERVICE_ACCOUNT_JSON is not a service account object');
  }
  const clientEmail = clean(parsed.client_email);
  const privateKey = typeof parsed.private_key === 'string' ? parsed.private_key : '';
  if (!clientEmail) throw unavailable('the service account JSON has no client_email');
  if (!privateKey) throw unavailable('the service account JSON has no private_key');
  const keyId = clean(parsed.private_key_id);
  /* The cache identity carries no key material. token_uri from the secret is
     deliberately ignored: the assertion only ever goes to Google's own
     endpoint, so a tampered secret cannot redirect it somewhere else. */
  return { clientEmail, privateKey, keyId, identity: clientEmail + '#' + (keyId || 'no-key-id') };
}

/* ---------------------------------------------------------------- the JWT */

const utf8 = (s) => new TextEncoder().encode(s);

function base64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** The PKCS#8 DER body of the PEM in the secret, ready for importKey. */
function pkcs8(privateKey) {
  /* A key pasted through a shell or a form often arrives with literal \n
     escapes instead of newlines; that is the same key, so it is accepted. */
  const text = privateKey.replace(/\\n/g, '\n');
  if (/BEGIN RSA PRIVATE KEY/.test(text)) {
    throw unavailable('the service account private key is PKCS#1; Workers import PKCS#8 only, so the key needs the "BEGIN PRIVATE KEY" form');
  }
  const block = /-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/.exec(text);
  if (!block) throw unavailable('the service account private key is not a PKCS#8 PEM block');
  let bin;
  try { bin = atob(block[1].replace(/\s+/g, '')); } catch (e) {
    throw unavailable('the service account private key is not valid base64');
  }
  const der = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i);
  return der;
}

/** header.claim.signature, RS256, valid for one hour, scoped to spreadsheets. */
async function assertion(cred) {
  const der = pkcs8(cred.privateKey);
  const now = Math.floor(Date.now() / 1000);
  const head = base64url(utf8(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claim = base64url(utf8(JSON.stringify({
    iss: cred.clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + ASSERTION_TTL,
  })));
  const signing = head + '.' + claim;
  let signature;
  try {
    const key = await crypto.subtle.importKey(
      'pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
    );
    signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, utf8(signing));
  } catch (e) {
    throw unavailable('the service account private key could not be imported or used to sign');
  }
  return signing + '.' + base64url(new Uint8Array(signature));
}

/* -------------------------------------------------------- the access token */

/* identity -> { token, expiresAt } once minted, { pending } while minting */
const tokens = new Map();

async function mint(cred) {
  const jwt = await assertion(cred);
  const form = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
               '&assertion=' + encodeURIComponent(jwt);
  let res;
  try {
    res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
  } catch (e) {
    throw unavailable('the Google token endpoint could not be reached');
  }
  const text = await bodyText(res);
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  const token = data && typeof data.access_token === 'string' ? data.access_token : '';
  if (!res.ok || !token) {
    throw unavailable(
      'Google refused the service account assertion',
      res.status, apiMessage(data, text, [jwt, cred.privateKey])
    );
  }
  const ttl = Number(data.expires_in);
  const life = Number.isFinite(ttl) && ttl > 0 ? ttl * 1000 : ASSERTION_TTL * 1000;
  return { token, expiresAt: Date.now() + Math.max(0, life - EXPIRY_SKEW) };
}

/** The held token while it is still good, otherwise one shared fresh mint. */
async function accessToken(cred) {
  const held = tokens.get(cred.identity);
  if (held && held.token && Date.now() < held.expiresAt) return held.token;
  if (held && held.pending) return held.pending;
  const pending = mint(cred).then(
    (fresh) => { tokens.set(cred.identity, fresh); return fresh.token; },
    (err) => { tokens.delete(cred.identity); throw err; }
  );
  tokens.set(cred.identity, { pending });
  return pending;
}

/* ------------------------------------------------------------- the request */

async function send(path, method, payload, token, opts) {
  const o = opts || {};
  if (o.notAfter && Date.now() > o.notAfter) {
    throw new GoogleSheetsUnavailable('the write deadline had passed; nothing was sent', { notSent: true });
  }
  const init = { method, headers: { authorization: 'Bearer ' + token, accept: 'application/json' } };
  if (o.signal) init.signal = o.signal;
  if (payload != null) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(payload);
  }
  try {
    return await fetch(SHEETS_BASE + path, init);
  } catch (e) {
    /* For a read this is simply a failure. For an append it is AMBIGUOUS: the
       row may already be in the journal, so the caller must look, not retry. */
    throw unavailable('the Google Sheets API could not be reached');
  }
}

/* QUOTA (Owner, 6 Oct 2026). The Sheets API allows 60 read requests per minute
   for one service account; above it Google answers 429 and applies nothing. A
   READ that meets 429 (or a 503) is asked again a bounded number of times, with
   exponential backoff, honouring Google's Retry-After within the cap — so a
   moment's quota pressure is not turned into a failure. Writes are never retried
   here: a payment's journal append and its one decision stay the caller's call.
   env.SHEETS_READ_RETRY_BASE_MS tunes the first delay (configuration, not a secret). */
export const READ_RETRY = Object.freeze({ attempts: 3, baseMs: 400, capMs: 3000 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function retryDelay(env, attempt, res) {
  const base = Number(env && env.SHEETS_READ_RETRY_BASE_MS);
  const b = Number.isFinite(base) && base >= 0 ? base : READ_RETRY.baseMs;
  const cap = Math.min(READ_RETRY.capMs, Math.max(b, b * 8));
  const after = Number(res && res.headers && res.headers.get ? res.headers.get('retry-after') : NaN);
  const wanted = Number.isFinite(after) && after > 0 ? after * 1000 : b * Math.pow(3, attempt);
  return Math.min(cap, wanted) + Math.floor(Math.random() * Math.max(1, b / 4));
}

async function call(env, path, { method = 'GET', payload = null, notAfter = 0, signal = null } = {}) {
  const cred = credentials(env);
  let token = await accessToken(cred);
  let res = await send(path, method, payload, token, { notAfter, signal });
  if (res.status === 401) {
    /* 401 means Google rejected the request before applying it, so minting a
       new token and sending it once more cannot duplicate a write. This is
       also what picks up a rotated service account key. */
    tokens.delete(cred.identity);
    token = await accessToken(cred);
    res = await send(path, method, payload, token, { notAfter, signal });
  }
  for (let attempt = 0; method === 'GET' && (res.status === 429 || res.status === 503) && attempt < READ_RETRY.attempts; attempt++) {
    await bodyText(res);
    await sleep(retryDelay(env, attempt, res));
    res = await send(path, method, payload, token, { notAfter, signal });
  }
  const text = await bodyText(res);
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = null; }
  if (!res.ok) {
    throw unavailable(
      'Google Sheets refused the request',
      res.status, apiMessage(data, text, [token, cred.privateKey])
    );
  }
  if (!data || typeof data !== 'object') {
    throw unavailable('Google Sheets answered with a body that is not JSON', res.status);
  }
  return data;
}

function target(spreadsheetId, a1Range) {
  const id = clean(spreadsheetId);
  const range = clean(a1Range);
  if (!id) throw unavailable('no spreadsheet id was supplied (the id is configuration, env.SHEETS_ID)');
  if (!range) throw unavailable('no A1 range was supplied');
  return { id: encodeURIComponent(id), range: encodeURIComponent(range), raw: range };
}

/* --------------------------------------------------------------- the reads */

/**
 * The rows of an A1 range, each row an array of cell values.
 *
 * Google omits trailing empty cells, so rows are not all the same length, and
 * a range with nothing in it answers with no rows at all. An empty array here
 * therefore means "Google answered, the range is empty", never "the read did
 * not happen": that case throws.
 */
export async function readRange(env, spreadsheetId, a1Range) {
  const t = target(spreadsheetId, a1Range);
  const query = 'majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING';
  const data = await call(env, '/' + t.id + '/values/' + t.range + '?' + query);
  const rows = Array.isArray(data.values) ? data.values : [];
  return rows.map((row) => (Array.isArray(row) ? row : []));
}

/**
 * SEVERAL RANGES IN ONE READ REQUEST (values:batchGet · Owner, 6 Oct 2026). The
 * grids come back in the order asked, each exactly as readRange would give it;
 * an answer that does not carry one value range per range asked is refused, never
 * matched up by guess. One call counts as ONE read against the quota.
 */
export async function batchReadRanges(env, spreadsheetId, a1Ranges) {
  const ranges = (Array.isArray(a1Ranges) ? a1Ranges : []).map(clean).filter(Boolean);
  if (!ranges.length) throw unavailable('batchReadRanges was given no range');
  const id = target(spreadsheetId, ranges[0]).id;
  const query = ranges.map((r) => 'ranges=' + encodeURIComponent(r)).join('&') +
    '&majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING';
  const data = await call(env, '/' + id + '/values:batchGet?' + query);
  const got = Array.isArray(data.valueRanges) ? data.valueRanges : null;
  if (!got || got.length !== ranges.length) {
    throw unavailable('Google Sheets answered the batch read with ' + (got ? got.length : 'no') + ' value ranges for ' + ranges.length + ' asked');
  }
  return got.map((vr) => (Array.isArray(vr && vr.values) ? vr.values : []).map((row) => (Array.isArray(row) ? row : [])));
}

/**
 * The same range as objects keyed by its first row.
 *
 * Header cells are trimmed. A column with no header cannot be named, so it is
 * left out. A row that is entirely empty is a spacer in a human-maintained
 * workbook and is skipped. A cell Google omitted comes back as '', which
 * model.toCents and the engine's gap check both read as absent.
 *
 * A header name that appears TWICE throws. Two columns of the same name make
 * every value under it ambiguous, and a financial source is never read on a
 * guess: the sheet is corrected, not guessed at.
 */
export async function readRangeAsObjects(env, spreadsheetId, a1Range) {
  const rows = await readRange(env, spreadsheetId, a1Range);
  if (!rows.length) return [];
  const header = rows[0].map((h) => clean(h));
  const seen = new Set();
  for (const name of header) {
    if (!name) continue;
    if (seen.has(name)) {
      throw unavailable('the header row of ' + clean(a1Range) + ' names the column "' + name + '" twice');
    }
    seen.add(name);
  }
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((cell) => clean(cell) !== '')) continue;
    const record = {};
    for (let c = 0; c < header.length; c++) {
      if (!header[c]) continue;
      record[header[c]] = c < row.length && row[c] != null ? row[c] : '';
    }
    out.push(record);
  }
  return out;
}

/* -------------------------------------------------------------- the append */

/**
 * Append ONE row at the end of the table the A1 range points at, and return
 * the API result (its `updates` block names the row Google actually wrote).
 *
 * INSERT_ROWS, so a row is inserted rather than written over whatever sits
 * below the table. RAW, so values are stored exactly as handed over: a date
 * is not reinterpreted by the sheet's locale, and a leading "=" is text, not
 * a formula. Nothing is formatted or rounded here; the amount arrives already
 * decided by src/billing/engine.js.
 *
 * A refusal throws. There is no local journal to fall back to and no retry:
 * 008_Payment_Journal in Google is the canonical record, duplicates are kept
 * and marked rather than removed, so a second attempt is a human decision
 * taken after reading the journal.
 */
export async function appendRow(env, spreadsheetId, a1Range, rowValues) {
  const t = target(spreadsheetId, a1Range);
  if (!Array.isArray(rowValues) || !rowValues.length) {
    throw unavailable('appendRow was given no row to append');
  }
  const values = [rowValues.map((v) => (v == null ? '' : v))];
  const query = 'valueInputOption=RAW&insertDataOption=INSERT_ROWS&includeValuesInResponse=false';
  return await call(env, '/' + t.id + '/values/' + t.range + ':append?' + query, {
    method: 'POST',
    payload: { range: t.raw, majorDimension: 'ROWS', values },
  });
}

/**
 * Write values into ONE existing range (values.update).
 *
 * Added 5 Oct 2026 for the Owner's append-only clarification: a payment's
 * financial payload is immutable, but its one-time verification state
 * (Record_Status · Verified_By · Verified_At · Reject_Reason) is completed
 * after reporting. That is a write into an existing row, so it needs update
 * rather than append — and the caller must have established, by reading the
 * row first, that the transition is allowed. This function performs no such
 * check: it is transport, and src/billing/source.js owns the rule.
 *
 * RAW, like appendRow: the sheet's locale never reinterprets what we send.
 */
export async function updateRange(env, spreadsheetId, a1Range, rowValues, opts) {
  const t = target(spreadsheetId, a1Range);
  if (!Array.isArray(rowValues) || !rowValues.length) {
    throw unavailable('updateRange was given no values to write');
  }
  const values = [rowValues.map((v) => (v == null ? '' : v))];
  const query = 'valueInputOption=RAW&includeValuesInResponse=false';
  /* opts.notAfter (ms since epoch): the write deadline — see WRITE_GRACE_MS */
  const notAfter = Number(opts && opts.notAfter) || 0;
  const ctrl = notAfter && typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), Math.max(0, notAfter - Date.now()) + WRITE_GRACE_MS) : null;
  try {
    return await call(env, '/' + t.id + '/values/' + t.range + '?' + query, {
      method: 'PUT',
      payload: { range: t.raw, majorDimension: 'ROWS', values },
      notAfter, signal: ctrl ? ctrl.signal : null,
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
