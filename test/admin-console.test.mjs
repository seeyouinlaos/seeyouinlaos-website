/* ============================================================================
   THE H&S ADMIN CONSOLE · its server side (Owner, 7 Oct 2026).

   The shipped billing routes and the BillingLedger actor, with Google replaced at
   the fetch boundary by an in-memory workbook of SYNTHETIC data and the mail
   transport by a recorder. No real guest, rate, account or address.
     · a guest never reaches an admin route (403, and nothing is read)
     · the overview lists every invitation from ONE Sheets batch + ONE ledger read
     · status comes in chunks of at most ten
     · preview → issue binds the exact previewed statement (PREVIEW_CHANGED)
     · view / PDF / send: the issued revision; the e-mail only on an explicit act,
       once per confirmation key, never again by accident
   The Activation Gate's reference cases name real 002 items, which this synthetic
   workbook does not carry: for the routes only, runReferenceCases answers "all
   match"; every other gate condition is the real evaluation, in the ledger too.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const GATE_URL = pathToFileURL(path.join(ROOT, 'src/billing/activation-gate.js')).href;
const AUTH_STUB = 'data:text/javascript,' + encodeURIComponent(`
export async function identify() { return globalThis.__billingIdentity || null; }
export async function loadIndex() { return globalThis.__billingIndex || {}; }
export function owns() { return true; }
export async function authIdOf() { return null; }
export function displayName(v) { return String(v || ''); }`);
const GATE_STUB = 'data:text/javascript,' + encodeURIComponent(`
export * from ${JSON.stringify(GATE_URL)};
import { REFERENCE_CASES } from ${JSON.stringify(GATE_URL)};
export function runReferenceCases() { return REFERENCE_CASES.map((c) => ({ id: c.id, who: c.who, item: c.item, matches: true, manualReview: [] })); }`);
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  const fromRoutes = context.parentURL && context.parentURL.endsWith('/src/billing-routes.js');
  if (fromRoutes && specifier === './auth.js') return { url: ${JSON.stringify(AUTH_STUB)}, shortCircuit: true };
  if (fromRoutes && specifier === './billing/activation-gate.js') return { url: ${JSON.stringify(GATE_STUB)}, shortCircuit: true };
  return next(specifier, context);
}`));

const { handleBilling } = await import('../src/billing-routes.js');
const { BillingLedger } = await import('../src/billing-ledger.js');
const { PAYMENT_JOURNAL_COLUMNS } = await import('../src/billing/source.js');
const { composeStatementMail } = await import('../src/mail-templates.js');
const { clearCatalogueCache } = await import('../src/billing/catalogue-cache.js');

/* ------------------------------------------------------------ the doubles */
function doState() {
  const map = new Map();
  let turn = Promise.resolve(), inside = false;
  return {
    storage: {
      get: async (k) => (map.has(k) ? structuredClone(map.get(k)) : undefined),
      put: async (k, v) => { map.set(k, structuredClone(v)); },
      delete: async (k) => map.delete(k),
      list: async ({ prefix = '' } = {}) => new Map([...map].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])),
    },
    blockConcurrencyWhile: (fn) => {
      if (inside) return Promise.resolve().then(fn);
      const next = turn.then(() => { inside = true; return fn(); }).finally(() => { inside = false; });
      turn = next.then(() => undefined, () => undefined);
      return next;
    },
    _map: map,
  };
}
const kv = (o) => ({ get: async (k) => (o[k] === undefined ? null : (typeof o[k] === 'string' ? o[k] : JSON.stringify(o[k]))) });
function r2() {
  const map = new Map(); let puts = 0;
  return { _puts: () => puts, put: async (k, v) => { puts++; map.set(k, new Uint8Array(v)); },
    get: async (k) => { if (!map.has(k)) return null; const b = map.get(k); return { body: b, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; } };
}

const SHEET = '1adminconsolesheet';
const ITEMS = {
  'T-STAY': { Item_ID: 'T-STAY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: 145, Currency: 'USD', Site_Product_Key: 'wedstay/heritage', 'Number of Nights': 2 },
  'T-TRAIN': { Item_ID: 'T-TRAIN', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON',
    Standard_Rate: 100, Currency: 'USD', Site_Product_Key: 'train', 'Number of Nights': 1 },
  /* the same price as the train: a swap between the two changes the selection, not its value */
  'T-BUS': { Item_ID: 'T-BUS', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON',
    Standard_Rate: 100, Currency: 'USD', Site_Product_Key: 'bus', 'Number of Nights': 1 },
};
function book(extraJournal) {
  const labels = ['Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To', 'Rate_Basis', 'Standard_Rate', 'Quota',
    'Quota_Unit', 'Max_Pax', 'Change_Cutoff', 'Cancellation_Cutoff', 'Currency', 'Site_Product_Key', 'Number of Nights', 'Modifiers'];
  const cols = Object.values(ITEMS);
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...labels.map((l) => [l, ...cols.map((it) => (it[l] == null ? '' : it[l]))])],
    '008_Payment_Journal': [[...PAYMENT_JOURNAL_COLUMNS],
      ['PAY-OTHER-1', 'S-OTHER', 'INV-T9', 'V1', 'PAYMENT', 'PAYPAL_EUR', 89, 'EUR', 100, 'INV-T9', '2026-10-03T10:00:00Z', '', '', 'BRIDE', '2026-10-03T12:00:00Z', 'VERIFIED', '', 'FALSE'],
      ...(extraJournal || [])],
    /* one approved, person-scoped rate for somebody else (Activation Gate condition 3 needs an ACTIVE approved 009) */
    '009_Special_Rates': [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note'],
      ['', 'GT9', 'T-STAY', 75, 'ALL', 'ACTIVE', '', '', 'Suthep', 'synthetic']],
    '010_Booking_Evidence_Index': [['Booking_ID', 'Settlement_ID', 'Holder_ID', 'Evidence_Status']],
    '011_Billing_Config': [['Config_Key', 'Value', 'Effective_From', 'Effective_To', 'Status', 'Approved_By', 'Approved_At', 'Note'],
      ['FX_USD_THB', '33.68', '2026-01-01', '', 'ACTIVE', 'Suthep', '2026-10-05T19:20:14Z', 'synthetic'],
      ['FX_USD_EUR', '0.89', '2026-01-01', '', 'ACTIVE', 'Suthep', '2026-10-05T19:20:14Z', 'synthetic']],
    '006_Guestlist': [['ID', 'Firstname', 'Surname', 'Nickname', 'Nationality'],
      ['CON-T1', 'Testa', 'Example', 'Tess', 'German'], ['CON-T2', 'Probe', 'Sample', '', ''], ['CON-G049', 'Groom', 'Synthetic', '', 'German']],
  };
}
function sheetsFetch(workbook, log) {
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return res(200, { access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(u)) {
      const ranges = [...new URL(u).searchParams.getAll('ranges')];
      log.push(['batchGet', ranges.map((r) => r.split('!')[0].replace(/^'|'$/g, ''))]);
      return res(200, { valueRanges: ranges.map((range) => ({ range, values: workbook[range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'")] || [] })) });
    }
    const m = u.match(/\/values\/([^?]+)\?/);
    if (!m) return res(404, { error: { message: 'unknown' } });
    let range = decodeURIComponent(m[1]);
    const append = range.endsWith(':append'); if (append) range = range.slice(0, -':append'.length);
    const tab = range.split('!')[0].replace(/^'|'$/g, '').replace(/''/g, "'");
    if (append) { const row = JSON.parse(init.body).values[0]; workbook[tab].push(row); log.push(['append', tab]); return res(200, { updates: {} }); }
    if ((init.method || 'GET') === 'PUT') { log.push(['update', tab]); return res(200, {}); }
    log.push(['get', tab]);
    return res(200, { values: workbook[tab] || [] });
  };
}
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });

const GROOM = { invitationId: 'INV-G049', guestId: 'G049', hosts: true };
const GUEST = { invitationId: 'INV-T1', guestId: 'GT1' };
const INDEX = {
  a: { i: 'INV-T1', g: 'GT1', c: 'CON-T1' },
  b: { i: 'INV-T2', g: 'GT2', c: 'CON-T2' },
  g: { i: 'INV-G049', g: 'G049', c: 'CON-G049', h: 1 },
};
const SENT = { submissionId: 'SYL-T1-1', version: 1, lastSentAt: '2026-10-01T10:00:00Z',
  registration: { guestId: 'GT1', selections: [{ id: 'wedstay', room: 'heritage', unit: 'A', qty: 1 }, { id: 'train', qty: 1 }] } };

/* the invitations' Drafts actors: { INV: draft | 'FAIL' } — a saved trip holds its bag as a JSON string, as the site stores it */
function draftsActor(drafts, calls) {
  return { idFromName: (n) => n, get: (id) => ({ fetch: async (req) => {
    const body = await req.json(); calls && calls.push(body.invitationId);
    const d = drafts[body.invitationId];
    if (d === 'FAIL') return Response.json({ ok: false, error: 'draft could not be read', retry: true }, { status: 503 });
    return Response.json({ ok: true, draft: d || null });
  } }) };
}
const savedTrip = (bag, updatedAt) => ({ invitationId: 'x', guestId: 'x', updatedAt: updatedAt || '2026-10-06T09:00:00Z', keys: { 'siyl.bag': JSON.stringify(bag) } });
function world({ store, journal, drafts } = {}) {
  clearCatalogueCache();
  const st = doState(); const led = new BillingLedger(st);
  const docs = r2();
  const env = {
    SHEETS_ID: SHEET,
    GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'synthetic@test.invalid', private_key: privateKey, private_key_id: 'admin' }),
    BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (req) => led.fetch(req) }) },
    REG_KV: kv(store || {
      'reg:INV-T1': SENT, 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 },
      'contact:INV-T1': { email: 'Tess.Example@Example.invalid', firstName: 'Tess' },
    }),
    DOCS: docs,
  };
  const draftCalls = [];
  if (drafts) env.DRAFTS = draftsActor(drafts, draftCalls);
  const workbook = book(journal);
  const log = [];
  const sent = [];
  const deps = { sendMail: async (...a) => { sent.push(a); return deps.answer ? deps.answer(a) : { provider: 'brevo', accepted: true, id: 'msg-' + sent.length, status: 201, error: null, outcome: 'SENT' }; } };
  return { st, led, env, docs, workbook, log, sent, deps, draftCalls };
}
async function approveGate(st) {
  await st.storage.put('gate', { approved: true, issueAndPublishEnabled: true, approval: { approvedBy: 'suthep', approvedAt: '2026-10-05T10:00:00Z' } });
}
async function hit(W, identity, pathq, body, method) {
  globalThis.__billingIdentity = identity;
  globalThis.__billingIndex = INDEX;
  const url = new URL('https://stage.invalid/api/billing/' + pathq);
  const req = new Request(url, body ? { method: method || 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {});
  const was = globalThis.fetch;
  globalThis.fetch = sheetsFetch(W.workbook, W.log);
  try {
    const r = await handleBilling(req, W.env, url, {}, W.deps);
    const type = r.headers.get('content-type') || '';
    return { status: r.status, type, j: /json/.test(type) ? await r.json().catch(() => null) : null, bytes: /pdf/.test(type) ? new Uint8Array(await r.arrayBuffer()) : null };
  } finally { globalThis.fetch = was; }
}

/* ================================================================ tests */

test('ADMIN · a guest reaches no admin route: 403, nothing read, no admin data', async () => {
  const W = world();
  for (const [p, body] of [['admin/overview'], ['admin/status?ids=INV-T1'], ['admin/holder?holder=INV-T1'], ['admin/send?holder=INV-T1'],
    ['admin/send', { holderId: 'INV-T1', revision: 1, email: 'x@y.invalid', sendKey: 'k'.repeat(32) }], ['revenue'], ['holders'],
    ['issue', { holderId: 'INV-T1' }], ['payment/verify', { Payment_ID: 'PAY-OTHER-1' }]]) {
    const r = await hit(W, GUEST, p, body);
    assert.equal(r.status, 403, p);
    assert.ok(!r.j.holders && !r.j.guest && !r.j.preview, p + ' carries no admin data');
  }
  assert.equal(W.log.length, 0, 'nothing was read from Google for a refused request');
  assert.equal(W.sent.length, 0);
  const anon = await hit(W, null, 'admin/overview');
  assert.equal(anon.status, 401);
});

test('ADMIN · the overview lists every invitation from ONE Sheets batch (006 + 008) and the ledger — names, method, nothing issued', async () => {
  const W = world();
  const r = await hit(W, GROOM, 'admin/overview');
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.deepEqual(W.log, [['batchGet', ['006_Guestlist', '008_Payment_Journal']]], 'one read request, two tabs');
  assert.equal(r.j.holders.length, 3);
  const t1 = r.j.holders.find((h) => h.Holder_ID === 'INV-T1');
  assert.equal(t1.name.full, 'Testa Example'); assert.equal(t1.name.nick, 'Tess');
  assert.equal(t1.method.channel, 'PAYPAL_EUR'); assert.equal(t1.method.currency, 'EUR'); assert.equal(t1.method.determined, true);
  assert.equal(t1.settlement, null); assert.equal(t1.payment, null);
  const t2 = r.j.holders.find((h) => h.Holder_ID === 'INV-T2');
  assert.equal(t2.method.determined, false, 'no nationality in 006: the method is a BILLING_ADMIN\'s to state, never guessed');
  assert.equal(r.j.holders.find((h) => h.Holder_ID === 'INV-G049').billingAdmin, true);
  assert.equal(r.j.chunk, 6);
});

test('ADMIN · status in chunks of at most ten: Guest Relations\' confirmation and the draft, per holder', async () => {
  const W = world();
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1,INV-T2');
  assert.equal(r.status, 200, JSON.stringify(r.j));
  const t1 = r.j.rows.find((x) => x.Holder_ID === 'INV-T1'), t2 = r.j.rows.find((x) => x.Holder_ID === 'INV-T2');
  assert.equal(t1.confirmation.state, 'CONFIRMED'); assert.equal(t1.draft.total, 390); assert.equal(t1.draft.lines, 2); assert.equal(t1.draft.manualReview, 0);
  assert.equal(t2.confirmation.state, 'NONE'); assert.equal(t2.draft, null);
  const many = Array.from({ length: 7 }, (_, i) => 'INV-X' + i).join(',');
  assert.equal((await hit(W, GROOM, 'admin/status?ids=' + many)).status, 400);
  assert.equal((await hit(W, GROOM, 'admin/status?ids=nonsense')).status, 400);
});

test('ADMIN · preview → issue: only the very statement previewed is issued; a changed one is refused and nothing is created', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.status, 200, JSON.stringify(h.j));
  assert.equal(h.j.guest.name.full, 'Testa Example');
  assert.equal(h.j.guest.email, 'tess.example@example.invalid'); assert.equal(h.j.guest.emailSource, 'CONTACT');
  assert.equal(h.j.confirmation.state, 'CONFIRMED');
  assert.equal(h.j.preview.total, 390); assert.equal(h.j.preview.lines.length, 2);
  assert.equal(h.j.preview.lines[0].person, 'Testa Example', 'the person is named from the register');
  assert.equal(h.j.preview.issuable, true, JSON.stringify(h.j.preview.reasons));
  assert.match(h.j.preview.proposalHash, /^[0-9a-f]{64}$/);
  assert.equal(h.j.issued, null);

  const wrong = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: 'f'.repeat(64) });
  assert.equal(wrong.status, 409); assert.deepEqual(wrong.j.reasons, ['PREVIEW_CHANGED']);
  const none = await hit(W, GROOM, 'admin/overview');
  assert.equal(none.j.holders.find((x) => x.Holder_ID === 'INV-T1').settlement, null, 'a refused issue leaves no settlement and no revision');

  /* the trip moves after the preview: the same hash no longer issues */
  const W2 = world(); await approveGate(W2.st);
  const h2 = await hit(W2, GROOM, 'admin/holder?holder=INV-T1');
  W2.workbook['002_Accommodation_Details'] = book()['002_Accommodation_Details'].map((row) => (row[0] === 'Standard_Rate' ? ['Standard_Rate', 150, 100, 100] : row));
  const moved = await hit(W2, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h2.j.preview.proposalHash });
  assert.equal(moved.status, 409); assert.deepEqual(moved.j.reasons, ['PREVIEW_CHANGED']);

  const ok = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  assert.equal(ok.status, 200, JSON.stringify(ok.j));
  assert.equal(ok.j.totalPayable, 390); assert.equal(ok.j.revision, 1); assert.equal(ok.j.Payment_Preference, 'PAYPAL_EUR');
  assert.equal(W.sent.length, 0, 'issuing never sends an e-mail');
});

test('ADMIN · issue is refused before anything is created when Guest Relations has not confirmed the trip', async () => {
  const W = world({ store: { 'reg:INV-T1': SENT } }); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.preview.issuable, false);
  assert.match(h.j.preview.reasons.join(' '), /BOOKING_NOT_CONFIRMED: UNCONFIRMED/);
  assert.equal(h.j.preview.proposalHash, null, 'nothing to confirm');
  const r = await hit(W, GROOM, 'issue', { holderId: 'INV-T1' });
  assert.equal(r.status, 409);
  assert.equal([...W.st._map.keys()].filter((k) => k.startsWith('settlement:') || k.startsWith('revision:')).length, 0);
});

test('ADMIN · view, PDF and the overview after issue: the immutable revision, its own dates and method', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  const ok = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  assert.equal(ok.status, 200, JSON.stringify(ok.j));
  const v = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(v.j.issued.revision, 1); assert.equal(v.j.issued.total, 390); assert.equal(v.j.issued.method, 'PAYPAL_EUR');
  assert.equal(v.j.issued.fx.FX_USD_EUR, 0.89); assert.equal(v.j.issued.inCurrency.amount, 347.1);
  assert.equal(v.j.issued.lines.length, 2);
  assert.equal(v.j.payment.status, 'UNPAID'); assert.equal(v.j.payment.balance, 390);
  const o = await hit(W, GROOM, 'admin/overview');
  const row = o.j.holders.find((x) => x.Holder_ID === 'INV-T1');
  assert.equal(row.settlement.issuedRevision, 1); assert.equal(row.settlement.issuedTotal, 390);
  assert.ok(row.settlement.issueDate); assert.ok(row.settlement.dueDate);
  assert.equal(row.method.source, 'ISSUED_REVISION'); assert.equal(row.payment.status, 'UNPAID');
  const pdf = await hit(W, GROOM, 'pdf?holder=INV-T1&rev=1');
  assert.equal(pdf.status, 200); assert.match(pdf.type, /application\/pdf/);
  assert.equal(String.fromCharCode(...pdf.bytes.slice(0, 5)), '%PDF-');
  await hit(W, GROOM, 'pdf?holder=INV-T1&rev=1');
  assert.equal(W.docs._puts(), 1, 'rendered once, kept write-once');
  /* a guest's `holder` is ignored: INV-T1 gets its own statement, INV-T2 (nothing issued) gets nothing of INV-T1's */
  const own = await hit(W, GUEST, 'pdf?holder=INV-T9&rev=1');
  assert.equal(own.status, 200); assert.deepEqual(own.bytes, pdf.bytes);
  const other = await hit(W, { invitationId: 'INV-T2', guestId: 'GT2' }, 'pdf?holder=INV-T1&rev=1');
  assert.equal(other.status, 404, 'never another guest\'s document');
});

test('ADMIN · send: the dialog\'s facts, the PDF attached, once per confirmation — never twice by accident', async () => {
  const W = world(); await approveGate(W.st);
  const before = await hit(W, GROOM, 'admin/send?holder=INV-T1');
  assert.equal(before.j.issued, false);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  const g = await hit(W, GROOM, 'admin/send?holder=INV-T1');
  assert.equal(g.status, 200, JSON.stringify(g.j));
  assert.equal(g.j.recipientName, 'Testa Example'); assert.equal(g.j.email, 'tess.example@example.invalid');
  assert.equal(g.j.totalPayable, 390); assert.ok(g.j.dueDate); assert.ok(g.j.Settlement_ID); assert.equal(g.j.revision, 1);
  const k1 = crypto.randomBytes(16).toString('hex');

  const changed = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: 'someone@else.invalid', sendKey: k1 });
  assert.equal(changed.status, 409); assert.deepEqual(changed.j.reasons, ['EMAIL_CHANGED']);
  const oldRev = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 2, email: g.j.email, sendKey: k1 });
  assert.deepEqual(oldRev.j.reasons, ['NOT_CURRENT_REVISION']);
  assert.equal(W.sent.length, 0);

  const s1 = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: g.j.email, sendKey: k1 });
  assert.equal(s1.status, 200, JSON.stringify(s1.j)); assert.equal(s1.j.outcome, 'SENT');
  assert.equal(W.sent.length, 1);
  const [, to, toName, subject, text, html, files] = W.sent[0];
  assert.equal(to, 'tess.example@example.invalid'); assert.equal(toName, 'Testa Example');
  assert.match(subject, /Your statement/); assert.match(text, /My Profile → Your statement/); assert.match(html, /profile#statement/);
  assert.equal(files.length, 1); assert.match(files[0].name, /^Statement-.*-V1\.pdf$/);
  assert.equal(Buffer.from(files[0].content, 'base64').subarray(0, 5).toString(), '%PDF-', 'the issued PDF, attached');
  assert.doesNotMatch(text + html, /\/api\/billing\/pdf|bearer|IBAN/i, 'no PDF link, no bearer, no bank account in the mail');

  const replay = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: g.j.email, sendKey: k1 });
  assert.equal(replay.j.replay, true); assert.equal(W.sent.length, 1, 'the same confirmation never sends twice');
  const k2 = crypto.randomBytes(16).toString('hex');
  const second = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: g.j.email, sendKey: k2 });
  assert.equal(second.status, 409); assert.deepEqual(second.j.reasons, ['ALREADY_SENT']); assert.equal(W.sent.length, 1);
  const again = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: g.j.email, sendKey: k2, again: true });
  assert.equal(again.j.outcome, 'SENT'); assert.equal(W.sent.length, 2, 'a deliberate second send, confirmed as such');
  const log = await hit(W, GROOM, 'admin/send?holder=INV-T1');
  assert.deepEqual(log.j.attempts.map((a) => a.outcome), ['SENT', 'SENT']);
});

test('ADMIN · an uncertain or refused delivery is recorded as such: uncertain blocks a plain resend, a refusal does not', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  const email = 'tess.example@example.invalid';
  W.deps.answer = () => ({ provider: 'brevo', accepted: false, id: null, status: 400, error: 'invalid', outcome: 'REJECTED' });
  const rej = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email, sendKey: crypto.randomBytes(16).toString('hex') });
  assert.equal(rej.j.outcome, 'REJECTED');
  W.deps.answer = () => ({ provider: 'brevo', accepted: false, id: null, status: 0, error: 'network', outcome: 'UNCERTAIN' });
  const unc = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email, sendKey: crypto.randomBytes(16).toString('hex') });
  assert.equal(unc.j.outcome, 'UNCERTAIN', 'a refusal did not block this send');
  W.deps.answer = null;
  const blocked = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email, sendKey: crypto.randomBytes(16).toString('hex') });
  assert.deepEqual(blocked.j.reasons, ['ALREADY_SENT'], 'it may have reached the guest');
  /* a claim whose Worker never reported back becomes UNCERTAIN after five minutes */
  const key = [...W.st._map.keys()].find((k) => k.startsWith('stmtmail:'));
  const rec = await W.st.storage.get(key);
  rec.attempts = []; rec.claim = { sendKey: 'z'.repeat(32), token: 't', at: '2026-01-01T00:00:00Z', by: 'GROOM', to: email };
  await W.st.storage.put(key, rec);
  const after = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email, sendKey: crypto.randomBytes(16).toString('hex') });
  assert.deepEqual(after.j.reasons, ['ALREADY_SENT']);
  assert.equal((await W.st.storage.get(key)).attempts[0].outcome, 'UNCERTAIN');
});

test('ADMIN · "Email unavailable": no contact and no sent-trip address — nothing is guessed and nothing is sent', async () => {
  const W = world({ store: { 'reg:INV-T1': SENT, 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 } } }); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.guest.email, null);
  await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  const g = await hit(W, GROOM, 'admin/send?holder=INV-T1');
  assert.equal(g.j.email, null);
  const r = await hit(W, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: '', sendKey: crypto.randomBytes(16).toString('hex') });
  assert.equal(r.status, 409); assert.deepEqual(r.j.reasons, ['EMAIL_UNAVAILABLE']); assert.equal(W.sent.length, 0);
  /* and without a mail transport nothing is attempted */
  const noDeps = { ...W, deps: null };
  const n = await hit(noDeps, GROOM, 'admin/send', { holderId: 'INV-T1', revision: 1, email: 'a@b.invalid', sendKey: crypto.randomBytes(16).toString('hex') });
  assert.equal(n.status, 503);
});

test('ADMIN · payments: the holder\'s own 008 rows only, with the decision state; verify goes through the existing protections', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  const ok = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  const sid = ok.j.Settlement_ID;
  W.workbook['008_Payment_Journal'].push(['PAY-' + sid + '-1', sid, 'INV-T1', 'V1', 'PAYMENT', 'PAYPAL_EUR', 100, 'EUR', 112.36, 'INV-T1', '2026-10-06T10:00:00Z', 'PP-1', '', '', '', 'REPORTED', '', 'FALSE']);
  const v = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.deepEqual(v.j.payments.map((p) => p.Payment_ID), ['PAY-' + sid + '-1'], 'never another settlement\'s rows');
  assert.equal(v.j.payments[0].Record_Status, 'REPORTED'); assert.equal(v.j.payments[0].decision, null);
  assert.equal(v.j.payment.pendingCount, 1); assert.equal(v.j.payment.ist, 0);
  const verify = await hit(W, GROOM, 'payment/verify', { Payment_ID: 'PAY-' + sid + '-1' });
  assert.equal(verify.status, 200, JSON.stringify(verify.j));
  assert.ok(W.log.some((x) => x[0] === 'update'), 'the decision was written to 008');
});

test('ADMIN · the statement e-mail: the issued figures, My Profile → Your statement, no code, no bearer, no account number', () => {
  const m = composeStatementMail({ firstName: 'Tess', settlementId: 'S-TEST-0001', revision: 2, totalPayable: 1234.5, issueDate: '2026-10-07',
    dueDate: '2026-10-28', inCurrency: { currency: 'EUR', amount: 1098.71 }, method: 'PayPal (EUR)', profileUrl: 'https://stage.invalid/profile#statement' });
  assert.match(m.subject, /S-TEST-0001/);
  for (const t of [m.text, m.html]) {
    assert.match(t, /S-TEST-0001/); assert.match(t, /USD 1,234\.50/); assert.match(t, /EUR 1,098\.71/); assert.match(t, /21 days after it is issued/);
    assert.doesNotMatch(t, /IBAN|bearer|invitation code is|\/api\//i);
  }
  assert.match(m.text, /My Profile → Your statement: https:\/\/stage\.invalid\/profile#statement/);
});

/* ---- independent review (7 Oct 2026) ---- */
test('REVIEW · one preview issues at most once: a replay and a concurrent second issue are refused; an unchanged re-issue is not offered', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  const hash = h.j.preview.proposalHash;
  const [x, y] = await Promise.all([
    hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: hash }),
    hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: hash }),
  ]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409], JSON.stringify([x.j, y.j]));
  const lost = x.status === 409 ? x : y;
  assert.deepEqual(lost.j.reasons, ['PREVIEW_CHANGED']);
  const replay = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: hash });
  assert.equal(replay.status, 409); assert.deepEqual(replay.j.reasons, ['PREVIEW_CHANGED']);
  const revs = [...W.st._map.keys()].filter((k) => k.startsWith('revision:'));
  assert.equal(revs.length, 1, 'exactly one revision exists');
  const after = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(after.j.preview.issuable, false);
  assert.match(after.j.preview.reasons.join(' '), /NO_CHANGE: revision 1 already holds exactly this statement/);
  const again = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: after.j.preview.proposalHash || 'x' });
  assert.equal(again.status, 409);
});

test('REVIEW · the issued statement stays visible when the current trip cannot be calculated; the preview says why', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal((await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash })).status, 200);
  /* the stored registration now names another person: the engine refuses to calculate, the statement stands */
  W.env.REG_KV = kv({ 'reg:INV-T1': { ...SENT, registration: { ...SENT.registration, guestId: 'GT-OTHER' } }, 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 },
    'contact:INV-T1': { email: 'tess.example@example.invalid' } });
  const v = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(v.status, 200, JSON.stringify(v.j));
  assert.equal(v.j.issued.revision, 1); assert.equal(v.j.payment.status, 'UNPAID');
  assert.equal(v.j.preview.issuable, false); assert.match(v.j.preview.reasons[0], /^PREVIEW_UNAVAILABLE: /);
});

test('REVIEW · every reported payment\'s decision in ONE ledger read; an unusable contact address is never replaced by an older one', async () => {
  const W = world(); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  const sid = (await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash })).j.Settlement_ID;
  for (let i = 0; i < 40; i++) W.workbook['008_Payment_Journal'].push(['PAY-' + sid + '-R' + i, sid, 'INV-T1', 'V1', 'PAYMENT', 'PAYPAL_EUR', 1, 'EUR', 1.12, 'INV-T1', '2026-10-06T10:00:00Z', '', '', '', '', 'REPORTED', '', 'FALSE']);
  let ledgerCalls = 0; const real = W.led.fetch.bind(W.led);
  W.env.BILLING_LEDGER = { idFromName: () => 'billing', get: () => ({ fetch: (req) => { ledgerCalls++; return real(req); } }) };
  const v = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(v.status, 200); assert.equal(v.j.payments.length, 40);
  assert.ok(v.j.payments.every((p) => p.decision === null));
  assert.ok(ledgerCalls < 15, 'forty reported payments do not mean forty ledger reads (' + ledgerCalls + ')');

  const W2 = world({ store: { 'reg:INV-T1': { ...SENT, recipient: { email: 'old.address@example.invalid' } }, 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 },
    'contact:INV-T1': { email: 'not an address' } } });
  const g = await hit(W2, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(g.j.guest.email, null, 'the guest corrects the address; the old one is not used'); assert.equal(g.j.guest.emailSource, 'CONTACT_INVALID');
});

/* ---- BOOKED VALUE (Owner, 7 Oct 2026) ---- */
const BAG_FULL = [{ id: 'wedstay', room: 'heritage', qty: 1 }, { id: 'train', qty: 1 }, { id: 'spa', interest: true }];
const statusOf = (r, id) => r.j.rows.find((x) => x.Holder_ID === id);

test('BOOKED VALUE · not sent: the guest\'s current selection, priced by the engine — no statement, no confirmation needed', async () => {
  const W = world({ store: {}, drafts: { 'INV-T1': savedTrip([...BAG_FULL, { id: 'mystery-product', qty: 1 }]) } });
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1');
  const t1 = statusOf(r, 'INV-T1');
  assert.equal(t1.confirmation.state, 'NONE'); assert.equal(t1.draft, null, 'nothing confirmed, nothing in the statement draft');
  assert.equal(t1.booked.source, 'CURRENT_SELECTION');
  assert.equal(t1.booked.total, 390, 'room 2 × 145 + train 100 — the interest is not a booking');
  assert.equal(t1.booked.onRequest, 1); assert.deepEqual(t1.booked.unmapped, ['mystery-product'], 'a product without an 002 item is named, never priced at zero');
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.booked.total, 390); assert.equal(h.j.booked.items.length, 3);
  assert.deepEqual(h.j.booked.items.map((l) => [l.Item_ID, l.amount]), [['T-STAY', 290], ['T-TRAIN', 100], [null, null]]);
  assert.equal(h.j.booked.items[0].person, 'Testa Example');
  assert.equal(h.j.booked.sent, null);
  assert.equal(h.j.preview.issuable, false, 'a booked value never makes a guest issuable');
  assert.match(h.j.preview.reasons.join(' '), /BOOKING_NOT_CONFIRMED: NONE/);
});

test('BOOKED VALUE · sent, not confirmed: the current selection, and the version sent beside it when they differ', async () => {
  const W = world({ store: { 'reg:INV-T1': SENT }, drafts: { 'INV-T1': savedTrip([{ id: 'train', qty: 1 }]) } });
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1');
  const t1 = statusOf(r, 'INV-T1');
  assert.equal(t1.confirmation.state, 'UNCONFIRMED'); assert.equal(t1.booked.total, 100);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.booked.source, 'CURRENT_SELECTION'); assert.equal(h.j.booked.total, 100);
  assert.deepEqual([h.j.booked.sent.version, h.j.booked.sent.total, h.j.booked.sent.differs], [1, 390, true]);
  assert.equal(h.j.issued, null); assert.equal(h.j.preview.issuable, false);
  /* the saved trip gone: the version sent is what was booked */
  const W2 = world({ store: { 'reg:INV-T1': SENT }, drafts: {} });
  const t = statusOf(await hit(W2, GROOM, 'admin/status?ids=INV-T1'), 'INV-T1');
  assert.equal(t.booked.source, 'SENT_VERSION'); assert.equal(t.booked.total, 390);
});

test('BOOKED VALUE · no bookings: "nothing selected", not a zero statement; an unreadable selection is named, never zero', async () => {
  const W = world({ store: {}, drafts: { 'INV-T2': savedTrip([]), 'INV-T1': 'FAIL' } });
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1,INV-T2,INV-G049');
  const t2 = statusOf(r, 'INV-T2'), g = statusOf(r, 'INV-G049'), t1 = statusOf(r, 'INV-T1');
  assert.deepEqual([t2.booked.source, t2.booked.total, t2.booked.selected], ['CURRENT_SELECTION', 0, 0]);
  assert.deepEqual([g.booked.source, g.booked.total], ['NONE', 0]);
  assert.match(t1.booked.error, /not readable/); assert.equal(t1.confirmation.state, 'NONE', 'the rest of the row stands');
});

test('BOOKED VALUE · an issued statement: the booked value and the statement total stay two different figures', async () => {
  const W = world({ drafts: { 'INV-T1': savedTrip(BAG_FULL) } }); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal((await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash })).status, 200);
  /* the guest drops the room afterwards: the booked value follows the selection, the statement stays as issued */
  W.env.DRAFTS = draftsActor({ 'INV-T1': savedTrip([{ id: 'train', qty: 1 }]) });
  const v = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(v.j.booked.total, 100); assert.equal(v.j.issued.total, 390); assert.equal(v.j.payment.balance, 390);
  const o = await hit(W, GROOM, 'admin/overview');
  assert.equal(o.j.holders.find((x) => x.Holder_ID === 'INV-T1').settlement.issuedTotal, 390);
});

test('BOOKED VALUE · display only and bounded: nothing is written, one Drafts read per guest, at most six guests a request', async () => {
  const W = world({ store: {}, drafts: { 'INV-T1': savedTrip(BAG_FULL), 'INV-T2': savedTrip([{ id: 'train', qty: 2 }]) } });
  const before = [...W.st._map.keys()].sort();
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1,INV-T2,INV-G049');
  assert.equal(statusOf(r, 'INV-T2').booked.total, 200);
  await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.deepEqual([...W.st._map.keys()].sort(), before, 'the ledger holds exactly what it held');
  assert.equal(W.log.filter((x) => x[0] === 'append' || x[0] === 'update').length, 0, 'nothing written to Google');
  assert.deepEqual(W.draftCalls.slice(0, 3), ['INV-T1', 'INV-T2', 'INV-G049'], 'one Drafts read per guest in the chunk');
  const seven = ['INV-T1', 'INV-T2', 'INV-G049', 'INV-X1', 'INV-X2', 'INV-X3', 'INV-X4'].join(',');
  assert.equal((await hit(W, GROOM, 'admin/status?ids=' + seven)).status, 400, 'at most six a request');
  assert.equal((await hit(W, GROOM, 'admin/overview')).j.chunk, 6);
});

/* ---- independent review of the Booked value (7 Oct 2026) ---- */
test('BOOKED VALUE · priced only for the one person of the register — never on a guessed or missing person', async () => {
  const W = world({ store: {}, drafts: { 'INV-T1': savedTrip(BAG_FULL), 'INV-X9': savedTrip(BAG_FULL) } });
  const r = await hit(W, GROOM, 'admin/status?ids=INV-T1,INV-X9');
  assert.equal(statusOf(r, 'INV-T1').booked.total, 390);
  const x9 = statusOf(r, 'INV-X9');
  assert.match(x9.error, /^HOLDER_PERSON/); assert.match(x9.booked.error, /^HOLDER_PERSON/);
  assert.ok(!W.draftCalls.includes('INV-X9'), 'an id outside the register wakes no actor');
  /* the register not readable (empty index): nothing is priced as "nobody" */
  const was = INDEX.a; delete INDEX.a;
  try {
    const r2 = await hit(W, GROOM, 'admin/status?ids=INV-T1');
    assert.match(statusOf(r2, 'INV-T1').booked.error, /^HOLDER_PERSON/);
  } finally { INDEX.a = was; }
});

test('BOOKED VALUE · a changed selection is a change even at the same price; the same selection in another order is not', async () => {
  const W = world({ store: { 'reg:INV-T1': { ...SENT, registration: { guestId: 'GT1', selections: [{ id: 'train', qty: 1 }, { id: 'wedstay', room: 'heritage', qty: 1 }] } } },
    drafts: { 'INV-T1': savedTrip([{ id: 'wedstay', room: 'heritage', qty: 1 }, { id: 'bus', qty: 1 }]) } });
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.booked.total, 390); assert.equal(h.j.booked.sent.total, 390);
  assert.equal(h.j.booked.sent.differs, true, 'the train became a bus: not "as it stands"');
  const W2 = world({ store: { 'reg:INV-T1': { ...SENT, registration: { guestId: 'GT1', selections: [{ id: 'train', qty: 1 }, { id: 'wedstay', room: 'heritage', qty: 1 }] } } },
    drafts: { 'INV-T1': savedTrip([{ id: 'wedstay', room: 'heritage', qty: 1 }, { id: 'train', qty: 1 }, { id: 'spa', interest: true }]) } });
  assert.equal((await hit(W2, GROOM, 'admin/holder?holder=INV-T1')).j.booked.sent.differs, false);
});

test('BOOKED VALUE · a line settled with the provider (Block B) is listed once, in its own table — never among the payable lines', async () => {
  const W = world({ store: {}, drafts: { 'INV-T1': savedTrip([{ id: 'train', qty: 1 }, { id: 'selfstay', qty: 1 }]) } });
  W.workbook['002_Accommodation_Details'] = book()['002_Accommodation_Details'].map((row, i) => (i === 0 ? row : [...row, ({ Item_ID: 'T-SELF', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Currency: 'USD', Site_Product_Key: 'selfstay', 'Number of Nights': 2 })[row[0]] ?? '']));
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.deepEqual(h.j.booked.items.map((l) => l.Item_ID), ['T-TRAIN']);
  assert.deepEqual(h.j.booked.blockB.map((l) => l.Item_ID), ['T-SELF']);
  assert.equal(h.j.booked.total, 100);
});

/* ================================================================ A HOTEL H&S BOOKED AND PAID (Owner, 7 Oct 2026)
   A stay the guest would pay the hotel for, which Haruthai booked and paid for them: a 009 row naming the person with
   Billing_Category GUEST_SETTLEMENT_REQUIRED makes it payable to H&S at the price paid (engine 2.3). */
test('PAID BY H&S · the hotel is payable in the admin preview; PRICE REQUIRED blocks the issue; with the price paid it is in the total, the issued statement, the PDF and the outstanding amount', async () => {
  const sent = { ...SENT, registration: { guestId: 'GT1', selections: [...SENT.registration.selections, { id: 'selfstay', qty: 1 }] } };
  const W = world({ store: { 'reg:INV-T1': sent, 'conf:INV-T1': { confirmedAt: '2026-10-02T09:00:00Z', version: 1 },
    'contact:INV-T1': { email: 'Tess.Example@Example.invalid', firstName: 'Tess' } } });
  await approveGate(W.st);
  W.workbook['002_Accommodation_Details'] = book()['002_Accommodation_Details'].map((row, i) => (i === 0 ? row : [...row, ({ Item_ID: 'T-SELF', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: '18.16666667', Currency: 'USD', Site_Product_Key: 'selfstay', 'Number of Nights': 2 })[row[0]] ?? '']));
  const rates = (price) => [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note', 'Billing_Category'],
    ['', 'GT9', 'T-STAY', 75, 'ALL', 'ACTIVE', '', '', 'Suthep', 'synthetic', ''],
    ['INV-T1', 'GT1', 'T-SELF', price, 'ALL', 'ACTIVE', '', '', 'Haruthai & Suthep', 'Booked and paid by Haruthai · reimbursed to Haruthai & Suthep', 'GUEST_SETTLEMENT_REQUIRED']];

  /* before the price paid is known: the line is there, payable, and asks for its price — nothing can be issued */
  W.workbook['009_Special_Rates'] = rates('');
  const asked = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(asked.status, 200, JSON.stringify(asked.j));
  const hotel = asked.j.preview.lines.find((l) => l.Item_ID === 'T-SELF');
  assert.ok(hotel, 'the hotel is among the payable lines, not the guest\'s own');
  assert.equal(hotel.paidByHS, 'GUEST_SELF_PAYMENT'); assert.equal(hotel.amount, null);
  assert.match(hotel.review, /^PRICE REQUIRED/);
  assert.deepEqual(asked.j.preview.blockB, [], 'nothing left among the guest\'s own arrangements');
  assert.equal(asked.j.preview.total, null); assert.equal(asked.j.preview.issuable, false);
  assert.match(asked.j.preview.reasons.join(' '), /MANUAL_REVIEW/);
  const refused = await hit(W, GROOM, 'issue', { holderId: 'INV-T1' });
  assert.equal(refused.status, 409);
  assert.equal([...W.st._map.keys()].filter((k) => k.startsWith('revision:')).length, 0, 'no revision without the price');
  /* the guest's own quote says the same: an H&S amount still to come, never "pay the hotel" */
  const quote = await hit(W, GUEST, 'catalogue');
  const q = Object.values(quote.j.quotes || quote.j.items || quote.j).flat().find((x) => x && x.Item_ID === 'T-SELF');
  assert.ok(q, JSON.stringify(quote.j).slice(0, 300)); assert.notEqual(q.block, 'B'); assert.equal(q.total, null); assert.match(q.manualReview, /^PRICE REQUIRED/);
  assert.equal(q.paidByHS, 'GUEST_SELF_PAYMENT', 'the guest\'s trip is told it is already paid (Edit 10)');
  assert.equal(hotel.paidNote, 'Booked and paid by Haruthai · reimbursed to Haruthai & Suthep', 'the console shows the 009 row\'s own words');

  /* the price paid is entered in 009: payable at it — never at the catalogue's 18.17 */
  W.workbook['009_Special_Rates'] = rates('20');
  const priced = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  const line = priced.j.preview.lines.find((l) => l.Item_ID === 'T-SELF');
  assert.equal(line.amount, 40); assert.equal(line.block, 'A'); assert.equal(line.Billing_Category, 'GUEST_SETTLEMENT_REQUIRED'); assert.equal(line.review, null);
  assert.equal(priced.j.preview.total, 430, '390 as before + the hotel, 2 nights × USD 20');
  assert.equal(priced.j.preview.issuable, true, JSON.stringify(priced.j.preview.reasons));
  const ok = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: priced.j.preview.proposalHash });
  assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.equal(ok.j.totalPayable, 430);

  const after = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(after.j.issued.total, 430);
  assert.ok(after.j.issued.lines.some((l) => l.Item_ID === 'T-SELF' && l.amount === 40 && l.block === 'A'), 'the issued statement carries the hotel');
  assert.equal(after.j.payment.soll, 430); assert.equal(after.j.payment.balance, 430, 'outstanding until paid');
  const pdf = await hit(W, GROOM, 'pdf?holder=INV-T1&rev=1');
  const text = Buffer.from(pdf.bytes).toString('latin1');
  for (const s of ['(T-SELF)', '(USD 40.00)', '(USD 430.00)', '(named special rate)']) assert.ok(text.includes(s), s + ' in the PDF');
  assert.ok(/Booked and paid by Haruthai/.test(text), 'the PDF says why');
  assert.ok(!text.includes('(Your own arrangements)'), 'no own-arrangements section: the hotel is payable');
  assert.equal(W.sent.length, 0, 'nothing e-mailed');
});

/* EDIT 10 — the sent trip's stays H&S already paid are marked by the SERVER (the engine on the shared source), never the device */
test('PAID BY H&S · at sending, the server marks the paid stay and gives it the engine\'s amount; a device\'s mark alone counts for nothing; no source → "unverified"', async () => {
  const { paidByHSOf } = await import('../src/billing-routes.js');
  const { markPaidByHS } = await import('../src/worker.js');
  const W = world();
  W.workbook['002_Accommodation_Details'] = book()['002_Accommodation_Details'].map((row, i) => (i === 0 ? row : [...row, ({ Item_ID: 'T-SELF', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: '18.16666667', Currency: 'USD', Site_Product_Key: 'selfstay', 'Number of Nights': 3 })[row[0]] ?? '']));
  W.workbook['009_Special_Rates'] = [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note', 'Billing_Category'],
    ['', 'GT9', 'T-STAY', 75, 'ALL', 'ACTIVE', '', '', 'Suthep', 'synthetic', ''],
    ['INV-T1', 'GT1', 'T-SELF', '18.16666667', '3', 'ACTIVE', '', '', 'Haruthai & Suthep', 'Haruthai has already paid this hotel booking for you.', 'GUEST_SETTLEMENT_REQUIRED']];
  const was = globalThis.fetch; globalThis.fetch = sheetsFetch(W.workbook, W.log);
  try {
    const stay = { id: 'selfstay', stay: 'x', qty: 1, price: 99, rate: 33, pay: 3 };
    const paid = await paidByHSOf(W.env, 'INV-T1', 'GT1', [stay, { id: 'train', qty: 1 }]);
    assert.deepEqual([...paid.entries()], [['selfstay', { total: 54.5 }]], 'the hotel, at the engine\'s USD 54.50 — the train is no such stay');
    assert.equal((await paidByHSOf(W.env, 'INV-T2', 'GT2', [stay])).size, 0, 'the party mate the row does not name');
    const out = await markPaidByHS(W.env, { invitationId: 'INV-T1', guestId: 'GT1' }, [{ ...stay, paidByHS: true }, { id: 'train', qty: 1, paidByHS: true }], new Set(['selfstay', 'train']));
    assert.deepEqual([out[0].paidByHS, out[0].price, out[1].paidByHS], [true, 54.5, undefined], 'the device\'s mark on the train is dropped');
    /* a trip whose device names no paid stay is never asked about: nothing read, every line as sent (a device mark dropped) */
    const reads = W.log.length;
    const none = await markPaidByHS(W.env, { invitationId: 'INV-T1', guestId: 'GT1' }, [{ ...stay, paidByHS: true }], new Set());
    assert.deepEqual([none[0].paidByHS, none[0].price, W.log.length], [undefined, 99, reads]);
    const other = await markPaidByHS(W.env, { invitationId: 'INV-T2', guestId: 'GT2' }, [{ ...stay, paidByHS: true }], new Set(['selfstay']));
    assert.equal(other[0].paidByHS, undefined, 'claimed by the device, not by the server: no mark');
  } finally { globalThis.fetch = was; }
  /* Google unreachable: the sending goes on; a stay the device called prepaid says neither */
  clearCatalogueCache();
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const out = await markPaidByHS(W.env, { invitationId: 'INV-T1', guestId: 'GT1' }, [{ id: 'selfstay', stay: 'x', qty: 1 }, { id: 'ljg', stay: 'y', room: 'z', qty: 1 }], new Set(['selfstay']));
    assert.deepEqual([out[0].prepaidUnverified, out[0].paidByHS, out[1].prepaidUnverified], [true, undefined, undefined]);
  } finally { globalThis.fetch = was; }
  /* Google hangs: the sending waits no longer than the limit, and says neither */
  clearCatalogueCache();
  globalThis.fetch = () => new Promise(() => {});
  try {
    const t0 = Date.now();
    const out = await markPaidByHS(W.env, { invitationId: 'INV-T1', guestId: 'GT1' }, [{ id: 'selfstay', stay: 'x', qty: 1 }], new Set(['selfstay']), 50);
    assert.ok(Date.now() - t0 < 1000); assert.equal(out[0].prepaidUnverified, true);
  } finally { globalThis.fetch = was; clearCatalogueCache(); }
  /* a stay whose price paid is still asked for: marked, with no amount (the e-mail says "price to follow") */
  W.workbook['009_Special_Rates'][2][3] = '';
  globalThis.fetch = sheetsFetch(W.workbook, W.log);
  try {
    const out = await markPaidByHS(W.env, { invitationId: 'INV-T1', guestId: 'GT1' }, [{ id: 'selfstay', stay: 'x', qty: 1, price: 54.5 }], new Set(['selfstay']));
    assert.deepEqual([out[0].paidByHS, out[0].price], [true, null]);
  } finally { globalThis.fetch = was; }
});

/* ================================================================ CONFIRM BOOKING (Owner, 7 Oct 2026)
   Haruthai and Suthep confirm a SENT, not yet confirmed booking from the console — the exact submitted version, the
   same `conf:<inv>` record Guest Relations' endpoint writes (src/confirmation.js), never the saved trip. */
const { confirmationStands, writeConfirmation } = await import('../src/confirmation.js');
const HARUTHAI = { invitationId: 'INV-G048', guestId: 'G048', hosts: true };
/* a registration store that can be written, recording every write */
function writableKv(o, writes) {
  return { get: async (k, type) => { const v = o[k]; if (v === undefined) return null; const t = typeof v === 'string' ? v : JSON.stringify(v); return type === 'json' ? JSON.parse(t) : t; },
    put: async (k, v) => { writes.push(k); o[k] = v; } };
}
function confirmWorld(store, opts = {}) {
  const W = world({ store, drafts: opts.drafts });
  W.store = store; W.writes = [];
  W.env.REG_KV = writableKv(store, W.writes);
  return W;
}
const sentOnly = () => ({ 'reg:INV-T1': structuredClone(SENT), 'contact:INV-T1': { email: 'Tess.Example@Example.invalid', firstName: 'Tess' } });
const expectedOf = (ctx) => ({ submissionId: ctx.snapshot.submissionId, version: ctx.snapshot.version, digest: ctx.snapshot.digest });

test('CONFIRM BOOKING · Suthep confirms a SENT, unconfirmed booking: the exact submitted version, the record Guest Relations writes — and Issue unlocks', async () => {
  const W = confirmWorld(sentOnly()); await approveGate(W.st);
  const before = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(before.j.submission.state, 'UNCONFIRMED'); assert.equal(before.j.submission.version, 1);
  assert.equal(before.j.preview.issuable, false);
  assert.match(before.j.preview.reasons.join(' '), /BOOKING_NOT_CONFIRMED: UNCONFIRMED — waiting for confirmation — Haruthai or Suthep can confirm this submitted booking/);
  assert.doesNotMatch(before.j.preview.reasons.join(' '), /Guest Relations confirms the sent trip first/, 'the dead end is gone');

  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.equal(ctx.status, 200, JSON.stringify(ctx.j));
  assert.equal(ctx.j.canConfirm, true); assert.equal(ctx.j.state, 'UNCONFIRMED'); assert.equal(ctx.j.name.full, 'Testa Example');
  assert.deepEqual([ctx.j.snapshot.submissionId, ctx.j.snapshot.version, ctx.j.snapshot.sentAt], ['SYL-T1-1', 1, '2026-10-01T10:00:00Z']);
  assert.match(ctx.j.snapshot.digest, /^[0-9a-f]{64}$/);
  assert.deepEqual([ctx.j.sent.total, ctx.j.sent.payableLines, ctx.j.sent.onRequest], [390, 2, 0]);
  assert.equal(ctx.j.current.changed, false);
  assert.deepEqual([ctx.j.afterConfirm.issuable, ctx.j.afterConfirm.total], [true, 390], 'after confirmation Issue would be available');
  assert.ok(!JSON.stringify(ctx.j).includes('proposalHash'), 'the what-if carries no hash: nothing can be issued from it');
  assert.equal(W.writes.length, 0, 'opening the dialog writes nothing');

  const t0 = Date.now();
  const r = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  assert.equal(r.status, 200, JSON.stringify(r.j));
  assert.deepEqual([r.j.confirmation.state, r.j.confirmation.confirmedVersion, r.j.confirmation.confirmedBy, r.j.confirmation.role, r.j.confirmation.source],
    ['CONFIRMED', 1, 'GROOM', 'BILLING_ADMIN', 'admin-billing']);
  assert.deepEqual(W.writes, ['conf:INV-T1'], 'one write: the confirmation record, nothing else');
  const conf = JSON.parse(W.store['conf:INV-T1']);
  assert.deepEqual([conf.version, conf.actor, conf.role, conf.source, conf.submissionId, conf.digest, conf.sentAt],
    [1, 'GROOM', 'BILLING_ADMIN', 'admin-billing', 'SYL-T1-1', ctx.j.snapshot.digest, '2026-10-01T10:00:00Z']);
  assert.ok(Date.parse(conf.confirmedAt) >= t0 - 1000 && Date.parse(conf.confirmedAt) <= Date.now() + 1000, 'the time of the confirmation');
  assert.deepEqual(conf.history.map((x) => [x.action, x.actor, x.role, x.source, x.version]), [['confirm', 'GROOM', 'BILLING_ADMIN', 'admin-billing', 1]]);
  /* the very record Guest Relations' endpoint writes — the console adds only its submission fingerprint and the acknowledgement */
  const gr = await writeConfirmation(writableKv({}, []), { invitationId: 'INV-T1', action: 'confirm', actor: 'guest-relations', role: 'GUEST_RELATIONS', source: 'gr-endpoint', note: '', record: SENT, current: null });
  assert.deepEqual(Object.keys(conf).filter((x) => !['digest', 'acknowledgedChange'].includes(x)).sort(), Object.keys(gr.conf).sort());
  assert.equal(confirmationStands(conf, W.store['reg:INV-T1']), true, 'the one rule the guest pages and billing read counts it');

  const after = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(after.j.confirmation.state, 'CONFIRMED'); assert.equal(after.j.confirmation.confirmedBy, 'GROOM');
  assert.deepEqual([after.j.submission.state, after.j.submission.confirmedBy, after.j.submission.role], ['CONFIRMED', 'GROOM', 'BILLING_ADMIN']);
  assert.equal(after.j.preview.issuable, true, JSON.stringify(after.j.preview.reasons));
  const st = statusOf(await hit(W, GROOM, 'admin/status?ids=INV-T1'), 'INV-T1');
  assert.equal(st.confirmation.state, 'CONFIRMED', 'the list reads it as confirmed');
  const issued = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: after.j.preview.proposalHash });
  assert.equal(issued.status, 200, JSON.stringify(issued.j)); assert.equal(issued.j.totalPayable, 390);
  assert.equal(W.sent.length, 0, 'confirming and issuing never e-mail');
});

test('CONFIRM BOOKING · Haruthai confirms too; a second confirmation of the same version is idempotent and writes nothing', async () => {
  const W = confirmWorld(sentOnly());
  const ctx = await hit(W, HARUTHAI, 'admin/confirm?holder=INV-T1');
  const r = await hit(W, HARUTHAI, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  assert.equal(r.status, 200, JSON.stringify(r.j)); assert.equal(r.j.confirmation.confirmedBy, 'BRIDE'); assert.equal(r.j.unchanged, false);
  const firstAt = JSON.parse(W.store['conf:INV-T1']).confirmedAt;
  const again = await hit(W, HARUTHAI, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  const bySuthep = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  for (const x of [again, bySuthep]) { assert.equal(x.status, 200); assert.equal(x.j.unchanged, true); assert.equal(x.j.confirmation.confirmedBy, 'BRIDE'); }
  assert.equal(W.writes.length, 1, 'one record, written once');
  assert.equal(JSON.parse(W.store['conf:INV-T1']).confirmedAt, firstAt);
  const shown = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.deepEqual([shown.j.state, shown.j.canConfirm, shown.j.afterConfirm], ['CONFIRMED', false, null]);
});

test('CONFIRM BOOKING · an ordinary guest gets 403 on the dialog and on the confirmation — nothing read, nothing written', async () => {
  const W = confirmWorld(sentOnly());
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  W.log.length = 0;
  for (const [who, p, body] of [[GUEST, 'admin/confirm?holder=INV-T1'], [GUEST, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) }],
    [{ ...GROOM, hosts: false }, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) }],
    [{ invitationId: 'INV-G049', guestId: 'G048', hosts: true }, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) }]]) {
    const r = await hit(W, who, p, body);
    assert.equal(r.status, 403, p); assert.ok(!r.j.snapshot && !r.j.confirmation && !r.j.sent, 'no booking facts');
  }
  assert.equal(W.writes.length, 0); assert.equal(W.log.length, 0, 'nothing read from Google for a refused request');
  assert.equal(W.store['conf:INV-T1'], undefined);
});

test('CONFIRM BOOKING · NOT SENT: nothing to confirm — the dialog says so, a confirmation is refused and nothing is fabricated', async () => {
  const W = confirmWorld({ 'contact:INV-T1': { email: 'tess@example.invalid' } }, { drafts: { 'INV-T1': savedTrip(BAG_FULL) } });
  await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.submission.state, 'NONE'); assert.equal(h.j.submission.submitted, false);
  assert.equal(h.j.booked.total, 390, 'the booked value is still shown');
  assert.match(h.j.preview.reasons.join(' '), /BOOKING_NOT_CONFIRMED: NONE — the guest has not submitted this trip yet/);
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.deepEqual([ctx.status, ctx.j.submitted, ctx.j.canConfirm, ctx.j.why], [200, false, false, 'The guest has not submitted this trip yet.']);
  const r = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: { submissionId: 'SYL-T1-1', version: 1, digest: 'a'.repeat(64) } });
  assert.equal(r.status, 409); assert.deepEqual(r.j.reasons, ['NOT_SENT']);
  assert.equal((await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1' })).status, 400, 'no confirmation without the submitted version it confirms');
  assert.equal(W.writes.length, 0); assert.equal(W.store['conf:INV-T1'], undefined);
});

test('CONFIRM BOOKING · a corrupt, foreign or moved submitted snapshot fails closed — nothing is confirmed', async () => {
  const cases = [
    ['{not json', 'SENT_UNREADABLE'],
    [{ ...SENT, registration: { guestId: 'GT1', selections: 'everything' } }, 'SENT_UNREADABLE'],
    [{ ...SENT, registration: 'x' }, 'SENT_UNREADABLE'],
    [{ ...SENT, version: 'two' }, 'SENT_UNREADABLE'],
    [{ ...SENT, registration: { selections: SENT.registration.selections } }, 'SENT_NO_PERSON'],
    [{ ...SENT, registration: { ...SENT.registration, guestId: 'GT2' } }, 'SENT_PERSON_MISMATCH'],
  ];
  for (const [reg, code] of cases) {
    const W = confirmWorld({ 'reg:INV-T1': reg });
    const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
    assert.equal(ctx.status, 409, code); assert.deepEqual(ctx.j.reasons, [code]); assert.equal(ctx.j.canConfirm, false);
    const r = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: { submissionId: 'SYL-T1-1', version: 1, digest: 'a'.repeat(64) } });
    assert.equal(r.status, 409, code); assert.deepEqual(r.j.reasons, [code]);
    const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
    assert.equal(h.j.submission.state, 'UNREADABLE', code); assert.match(h.j.submission.error, /submitted booking/);
    assert.equal(W.writes.length, 0, code);
  }
  /* an unreadable confirmation record is never overwritten blind */
  const Wc = confirmWorld({ ...sentOnly(), 'conf:INV-T1': '{broken' });
  assert.deepEqual((await hit(Wc, GROOM, 'admin/confirm?holder=INV-T1')).j.reasons, ['CONFIRMATION_UNREADABLE']);
  assert.equal(Wc.writes.length, 0);
  /* the guest sends again after the dialog was opened: the dialog's version is no longer the submitted one */
  const W = confirmWorld(sentOnly());
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  W.store['reg:INV-T1'] = { ...SENT, version: 2, lastSentAt: '2026-10-07T08:00:00Z', registration: { guestId: 'GT1', selections: [{ id: 'train', qty: 1 }] } };
  const moved = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  assert.equal(moved.status, 409); assert.deepEqual(moved.j.reasons, ['SENT_CHANGED']); assert.equal(moved.j.snapshot.version, 2);
  const forged = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: { ...expectedOf(ctx.j), version: 2 } });
  assert.deepEqual(forged.j.reasons, ['SENT_CHANGED'], 'the version alone is not enough: the exact lines must match');
  assert.equal(W.writes.length, 0);
});

test('CONFIRM BOOKING · a current selection changed since submission: shown beside the sent value, acknowledged — and never billed instead of the submitted version', async () => {
  const current = [{ id: 'wedstay', room: 'heritage', qty: 1 }, { id: 'train', qty: 1 }, { id: 'bus', qty: 1 }];
  const W = confirmWorld(sentOnly(), { drafts: { 'INV-T1': savedTrip(current) } }); await approveGate(W.st);
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.deepEqual([ctx.j.current.changed, ctx.j.current.total, ctx.j.sent.total], [true, 490, 390]);
  assert.equal(ctx.j.afterConfirm.total, 390, 'what Issue would freeze is the submitted version');
  const plain = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  assert.equal(plain.status, 409); assert.deepEqual(plain.j.reasons, ['ACKNOWLEDGE_CHANGE']); assert.equal(W.writes.length, 0);
  const ok = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j), acknowledgeChange: true });
  assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.equal(ok.j.acknowledgedChange, true);
  const conf = JSON.parse(W.store['conf:INV-T1']);
  assert.equal(conf.version, 1); assert.equal(conf.acknowledgedChange, true); assert.match(conf.note, /differed from the submitted version \(acknowledged\)/);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.booked.total, 490, 'the booked value stays the current selection');
  assert.equal(h.j.preview.total, 390); assert.deepEqual(h.j.preview.lines.map((l) => l.Item_ID).sort(), ['T-STAY', 'T-TRAIN'], 'the bus the guest has not sent is not billed');
  const issued = await hit(W, GROOM, 'issue', { holderId: 'INV-T1', expectedProposal: h.j.preview.proposalHash });
  assert.equal(issued.j.totalPayable, 390);
  assert.deepEqual(W.store['reg:INV-T1'], SENT, 'the submitted booking itself is never rewritten');
  /* a saved trip that cannot be read counts as a possible change: it must be acknowledged too */
  const Wf = confirmWorld(sentOnly(), { drafts: { 'INV-T1': 'FAIL' } });
  const cf = await hit(Wf, GROOM, 'admin/confirm?holder=INV-T1');
  assert.equal(cf.j.current.changed, null); assert.equal(cf.j.canConfirm, true);
  assert.deepEqual((await hit(Wf, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(cf.j) })).j.reasons, ['ACKNOWLEDGE_CHANGE']);
  assert.equal((await hit(Wf, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(cf.j), acknowledgeChange: true })).status, 200);
});

test('CONFIRM BOOKING · a newer submission after a confirmation: waiting again, and the console confirms the new version', async () => {
  const store = { ...sentOnly(), 'reg:INV-T1': { ...SENT, version: 2, lastSentAt: '2026-10-06T10:00:00Z' },
    'conf:INV-T1': JSON.stringify({ invitationId: 'INV-T1', confirmedAt: '2026-10-02T09:00:00Z', version: 1, actor: 'guest-relations', source: 'gr-endpoint', history: [{ action: 'confirm', at: '2026-10-02T09:00:00Z', actor: 'guest-relations', version: 1 }] }) };
  const W = confirmWorld(store);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.deepEqual([h.j.submission.state, h.j.submission.version, h.j.submission.confirmedVersion], ['LAPSED', 2, 1]);
  assert.match(h.j.preview.reasons.join(' '), /BOOKING_NOT_CONFIRMED: LAPSED — the guest sent a newer version/);
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.equal(ctx.j.canConfirm, true); assert.equal(ctx.j.snapshot.version, 2);
  assert.equal((await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) })).status, 200);
  const conf = JSON.parse(W.store['conf:INV-T1']);
  assert.equal(conf.version, 2);
  assert.deepEqual(conf.history.map((x) => [x.actor, x.version]), [['guest-relations', 1], ['GROOM', 2]], 'the history keeps both, in order');
});

test('CONFIRM BOOKING · after confirmation Issue unlocks only when every other check passes — the dialog names what still waits', async () => {
  const W = confirmWorld(sentOnly());   /* the Activation Gate is not approved here */
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  assert.equal(ctx.j.afterConfirm.issuable, false);
  assert.ok(ctx.j.afterConfirm.reasons.length > 0);
  assert.ok(!ctx.j.afterConfirm.reasons.some((r) => /BOOKING_NOT_CONFIRMED/.test(r)), 'the booking is no longer what waits');
  await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.equal(h.j.confirmation.state, 'CONFIRMED'); assert.equal(h.j.preview.issuable, false, 'confirmed is not issuable while the gate is closed');
  assert.equal((await hit(W, GROOM, 'issue', { holderId: 'INV-T1' })).status, 409);
});

test('CONFIRM BOOKING · ONE record: Guest Relations\' endpoint and the console write the same conf:<inv>, by the same rule', async () => {
  const store = {}, writes = [];
  const k = writableKv(store, writes);
  const rec = { submissionId: 'SYL-X', version: 3, lastSentAt: '2026-10-05T10:00:00Z' };
  const gr = await writeConfirmation(k, { invitationId: 'INV-X', action: 'confirm', actor: 'guest-relations', role: 'GUEST_RELATIONS', source: 'gr-endpoint', note: '', record: rec, current: null });
  const admin = await writeConfirmation(k, { invitationId: 'INV-X', action: 'confirm', actor: 'GROOM', role: 'BILLING_ADMIN', source: 'admin-billing', note: '', record: rec, current: gr.conf });
  assert.equal(admin.unchanged, true, 'already confirmed by Guest Relations: the console writes nothing');
  const after = { ...rec, version: 4 };
  const second = await writeConfirmation(k, { invitationId: 'INV-X', action: 'confirm', actor: 'GROOM', role: 'BILLING_ADMIN', source: 'admin-billing', note: '', record: after, current: gr.conf });
  assert.deepEqual(Object.keys(second.conf).filter((x) => x !== 'history').sort(), Object.keys(gr.conf).filter((x) => x !== 'history').sort(), 'the same fields');
  assert.equal(confirmationStands(second.conf, after), true); assert.equal(confirmationStands(gr.conf, after), false);
  assert.deepEqual(writes, ['conf:INV-X', 'conf:INV-X']);
});

test('CONFIRM BOOKING · the guest sees that the booking is confirmed — never who confirmed it', async () => {
  const W = confirmWorld(sentOnly());
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  const mine = await hit(W, GUEST, 'mine');
  assert.equal(mine.status, 200, JSON.stringify(mine.j));
  assert.deepEqual(Object.keys(mine.j.bookingConfirmation).sort(), ['confirmedAt', 'state', 'version']);
  assert.equal(mine.j.bookingConfirmation.state, 'CONFIRMED');
  assert.doesNotMatch(JSON.stringify(mine.j), /GROOM|BILLING_ADMIN|admin-billing/);
});

test('CONFIRM BOOKING · a confirmation names its journey: after a reset, a new first send is never "confirmed" by the old record', async () => {
  const store = { ...sentOnly(), 'reg:INV-T1': { ...SENT, submissionId: 'SYL-T1-NEW', lastSentAt: '2026-10-07T09:00:00Z' },
    'conf:INV-T1': JSON.stringify({ invitationId: 'INV-T1', confirmedAt: '2026-10-02T09:00:00Z', version: 1, submissionId: 'SYL-T1-1', actor: 'GROOM', role: 'BILLING_ADMIN', source: 'admin-billing', history: [] }) };
  const W = confirmWorld(store); await approveGate(W.st);
  const h = await hit(W, GROOM, 'admin/holder?holder=INV-T1');
  assert.notEqual(h.j.confirmation.state, 'CONFIRMED'); assert.equal(h.j.preview.issuable, false);
  assert.equal(h.j.submission.state, 'LAPSED');
  assert.equal(confirmationStands(JSON.parse(store['conf:INV-T1']), store['reg:INV-T1']), false);
  assert.equal(confirmationStands(JSON.parse(store['conf:INV-T1']), SENT), true, 'the journey it confirmed still is');
});

test('CONFIRM BOOKING · a confirmation record that changed between the read and the write is never overwritten blind', async () => {
  const store = sentOnly(), writes = [];
  const W = confirmWorld(store);
  const ctx = await hit(W, GROOM, 'admin/confirm?holder=INV-T1');
  let confReads = 0;
  const base = writableKv(store, writes);
  W.env.REG_KV = { put: base.put, get: async (k, t) => {
    if (k === 'conf:INV-T1' && ++confReads === 2) store[k] = JSON.stringify({ invitationId: 'INV-T1', confirmedAt: null, version: null, actor: 'guest-relations', history: [{ action: 'unconfirm' }] });
    return base.get(k, t);
  } };
  const r = await hit(W, GROOM, 'admin/confirm', { holderId: 'INV-T1', expected: expectedOf(ctx.j) });
  assert.equal(r.status, 409); assert.deepEqual(r.j.reasons, ['CONFIRMATION_CHANGED']);
  assert.equal(writes.length, 0);
});
