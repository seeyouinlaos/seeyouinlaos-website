/**
 * Cloudflare Worker — See You In Laos wedding website.
 *
 * Static guest site served from the ASSETS binding, plus ONE operational
 * route: POST /api/register — the Guest Registration submission endpoint.
 *
 * The endpoint degrades safely: it accepts the structured registration,
 * stores it in KV when a REG_KV binding exists, and forwards a copy to
 * Guest Relations and the guest through the configured email provider (Brevo or Resend, a Worker secret). If neither
 * storage nor forwarding succeeds it returns 503 and the client falls back
 * to the mailto channel — a registration is never silently lost.
 *
 * Plus the ROOM OCCUPANCY routes — /api/rooms[/join|/leave|/mine] — proxied
 * to ONE Durable Object instance ("rooms"): every guest, in every browser and
 * on either deployment, reads and writes the same allocation units, and a
 * place is decided by a single-threaded actor rather than by whoever happens
 * to tap first. The retired category ledger (/api/inventory) answers 410.
 *
 * ONE CODE = ONE GUEST (Owner, 14 Sep 2026): every write — a seat, a room, a
 * journey — is tied to the guest the bearer resolves to (src/auth.js). The
 * identity is passed to the objects in a header the Worker sets itself and
 * strips from every incoming request, so a client can never claim one.
 *
 * No payment collection, no railway/hotel booking APIs, no guest directory.
 */

const GR_EMAIL = 'guest.relation.seeyouinlaos@gmail.com';
const MAX_BODY = 64 * 1024; // 64 KB — structured registrations are small

/* ONE LIVE SITE (Owner, 18 Sep 2026): the Worker is the only runtime; the GitHub Pages mirror is retired and no longer an allowed origin */
const ALLOWED_ORIGINS = [
  'https://seeyouinlaos-website.suthep-hrg.workers.dev',
];
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
    /* the document endpoint authenticates with the invitation the client
     * already holds, so those headers must survive the preflight */
    'access-control-allow-headers': 'content-type, x-invitation, x-guest, x-kind, x-filename, x-siyl-auth',
    'access-control-max-age': '7200',
  };
}

/* The Worker is the one runtime: pages and API share this origin, so there is ONE ledger. */
export { Inventory } from './inventory.js';
export { Seating } from './seating.js';
export { Rooms } from './rooms.js';
export { Drafts } from './drafts.js';
import { identify, owns, loadIndex } from './auth.js';
import { SEED } from './inventory-seed.js';
import { stageOf } from './rooms.js';
import { composeGuestMail, composeOwnerMail } from './mail-templates.js';
import { completion as graphCompletion, normalizeScope as graphScope, isRelevant as graphRelevant, STAGES as GRAPH_STAGES, STAGE_IDS as GRAPH_IDS } from './stage-graph.js';

/* ---- the Guest Relations gate (F + G) ------------------------------------
 * A secret set with `wrangler secret put GR_TOKEN`, compared in constant
 * time. It never appears in client code; the guest cannot confirm a journey,
 * open seating or allocate a chair. */
function grAuthorised(request, env) {
  const given = request.headers.get('x-gr-token') || '';
  const secret = env.GR_TOKEN || '';
  if (!secret || !given || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
const GR_SEATING_OPS = ['config', 'state', 'assign', 'unassign', 'plan', 'rekey', 'reset'];
const GR_ROOMS_OPS = ['plan', 'migrate', 'assign', 'unassign', 'reset'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* THE RETIRED CATEGORY LEDGER: replaced by the room occupancy engine */
    if (url.pathname === '/api/inventory' || url.pathname.startsWith('/api/inventory/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return json({ ok: false, error: 'retired — use /api/rooms' }, 410, corsHeaders(request));
    }

    /* THE ROOM OCCUPANCY ENGINE: guests read, join and leave allocation units
     * in their own name; Guest Relations reads the plan and migrates */
    if (url.pathname === '/api/rooms' || url.pathname.startsWith('/api/rooms/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (!env.ROOMS) return json({ ok: false, error: 'rooms unavailable' }, 503, corsHeaders(request));
      const op = url.pathname.replace(/^\/api\/rooms\/?/, '') || 'read';
      const headers = new Headers(request.headers);
      headers.delete('x-gr-verified'); headers.delete('x-siyl-identity');   /* a client can never claim either */
      if (GR_ROOMS_OPS.includes(op)) {
        if (!env.GR_TOKEN) return json({ ok: false, error: 'rooms operations are not enabled' }, 503);
        if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
        headers.set('x-gr-verified', 'yes');
      } else {
        const who = await identify(request, env);
        if (who) headers.set('x-siyl-identity', JSON.stringify(who));
        else if (op === 'join' || op === 'leave' || op === 'wait' || op === 'unwait') return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
        if ((op === 'join' || op === 'leave' || op === 'wait' || op === 'unwait') && await resetLocked(env)) return json({ ok: false, error: 'the room engine is being reset — try again in a moment', retry: true }, 503, corsHeaders(request));
      }
      const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
      const res = await stub.fetch(new Request(request, { headers }));
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(corsHeaders(request))) out.headers.set(k, v);
      return out;
    }

    /* GUEST DOCUMENTS. Write-only, authenticated by the invitation the client
     * already holds. Bytes never touch the repository, the browser's storage or
     * any public URL: they go straight to the private object store bound as
     * DOCS. When that binding is absent the endpoint says so honestly (503) and
     * the guest surface keeps the document as NOT PROVIDED — it never claims a
     * receipt that did not happen. There is deliberately NO public read route.
     * Owner decision still required: the storage bucket and the retention
     * period. Both are configuration, not code. */
    if (url.pathname === '/api/document') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      }
      return handleDocument(request, env);
    }

    /* THE GUEST'S CONTACT (Owner, 16 Sep 2026 · EMAIL FIRST): the email and mobile number persisted on the server under
       the authenticated guest's own invitation — the one recipient of the confirmation email, the same on every device */
    if (url.pathname === '/api/contact') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return handleContact(request, env);
    }
    /* THE PROFILE PHOTO (Owner, 18 Sep 2026 · MY PROFILE): one small image per authenticated guest, stored under the
       guest's own invitation in the register store — read, replaced and removed only with that guest's bearer; there is
       no public URL, no listing, and the bytes never enter the repository. */
    if (url.pathname === '/api/profile/photo') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return handleProfilePhoto(request, env);
    }
    /* THE JOURNEY DRAFT (Owner, 16 Sep 2026 · FINAL QUICKFIX): ONE server-side draft per authenticated guest — the complete
       journey (contact, answers, bag, wedding, documents state, sent stamp) keyed by the invitation; the browser is a cache.
       GET reads it with the submission state (draft / sent / changes not yet sent); PUT stores it. */
    if (url.pathname === '/api/draft') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      /* a page-hide beacon cannot set headers: the bearer travels in the body and becomes the header here */
      if (url.searchParams.get('beacon') === '1' && request.method === 'POST' && !request.headers.get('x-siyl-auth')) {
        try { const raw = await request.text(); const b = JSON.parse(raw); const h = new Headers(request.headers); if (b && typeof b.bearer === 'string') h.set('x-siyl-auth', b.bearer); delete b.bearer; return handleDraft(new Request(request.url, { method: 'PUT', headers: h, body: JSON.stringify(b) }), env); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400); }
      }
      return handleDraft(request, env);
    }
    /* THE CLEAN RESET (Owner, 19 Sep 2026): every guest-generated transactional state, in one Guest-Relations-protected
       operation — dry run by default, execution only with the exact confirmation words */
    if (url.pathname === '/api/gr/reset') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
      return handleGrReset(request, env);
    }
    /* GUEST RELATIONS: one guest's stored submission record as it was sent (the source of both emails) — the GR token only */
    if (url.pathname === '/api/gr/record') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
      const inv = String(url.searchParams.get('invitation') || '').trim();
      if (!/^INV-[A-Z0-9-]+$/.test(inv)) return json({ ok: false, error: 'invitation required' }, 400);
      let rec = null; try { rec = JSON.parse(await env.REG_KV.get('reg:' + inv) || 'null'); } catch (e) { rec = null; }
      if (!rec) return json({ ok: true, invitationId: inv, record: null });
      const { mail, ...record } = rec;   /* the provider answers stay in the summary the listing gives */
      return json({ ok: true, invitationId: inv, record, guestMail: composeGuestMail(rec), ownerMail: composeOwnerMail(rec, url.origin + '/api/status?invitation=' + encodeURIComponent(inv)) });
    }
    /* GUEST RELATIONS: every guest's canonical current data (draft, submission, rooms, seats, mail) — the GR token only */
    if (url.pathname === '/api/gr/journeys') {
      if (!env.GR_TOKEN) return json({ ok: false, error: 'not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      return handleGrJourneys(request, env);
    }
    /* THE JOURNEY'S STATUS (F): received / confirmed, read by the guest site */
    if (url.pathname === '/api/status') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      return handleStatus(request, env);
    }
    /* THE CONFIRMATION (F): Guest Relations only, idempotent, never self-service */
    if (url.pathname === '/api/confirm') {
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
      if (!env.GR_TOKEN) return json({ ok: false, error: 'confirmation is not enabled' }, 503);
      if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
      return handleConfirm(request, env);
    }
    /* THE SEATING LEDGER (G): guests read and hold; Guest Relations configures */
    if (url.pathname === '/api/seating' || url.pathname.startsWith('/api/seating/')) {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (!env.SEATING) return json({ ok: false, error: 'seating unavailable' }, 503, corsHeaders(request));
      const op = url.pathname.replace(/^\/api\/seating\/?/, '') || 'read';
      const headers = new Headers(request.headers);
      headers.delete('x-gr-verified'); headers.delete('x-siyl-identity');   /* a client can never claim either */
      if (GR_SEATING_OPS.includes(op)) {
        if (!env.GR_TOKEN) return json({ ok: false, error: 'seating operations are not enabled' }, 503);
        if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
        headers.set('x-gr-verified', 'yes');
      } else {
        const who = await identify(request, env);
        if (who) headers.set('x-siyl-identity', JSON.stringify(who));
        else if (op === 'select' || op === 'release') return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
        if ((op === 'select' || op === 'release') && await resetLocked(env)) return json({ ok: false, error: 'the seating ledger is being reset — try again in a moment', retry: true }, 503, corsHeaders(request));
      }
      const forwarded = new Request(request, { headers });
      const stub = env.SEATING.get(env.SEATING.idFromName('seating'));
      const res = await stub.fetch(forwarded);
      const out = new Response(res.body, res);
      for (const [k, v] of Object.entries(corsHeaders(request))) out.headers.set(k, v);
      return out;
    }

    if (url.pathname === '/api/register') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      }
      return handleRegister(request, env);
    }
    /* the confirmation emails, sent again for a journey already stored — never a new submission (Owner, 16 Sep 2026) */
    if (url.pathname === '/api/register/mail-retry') {
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });
      if (request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
      return handleMailRetry(request, env);
    }

    /* HISTORICAL FIREWALL (final pre-release run, 11 SEP 2026): the invitation
     * letters link to /register/?invite=…, the entry of the superseded
     * registration engine. That engine (register/index.html, app.mjs, data.mjs,
     * logic.mjs) carries retired truth and is no longer served (.assetsignore);
     * its entry redirects into the accepted product. The two files the accepted
     * product loads from that directory — crypto.mjs and the encrypted
     * invitation bundle — pass through untouched. */
    if (url.pathname === '/register' || url.pathname.startsWith('/register/')) {
      const keep = /^\/register\/(crypto\.mjs|invitations\.enc\.json|auth-index\.json)$/.test(url.pathname);
      if (!keep) return Response.redirect(url.origin + '/invitation.html', 302);
    }

    return env.ASSETS.fetch(request);
  },
};

const MAX_DOC = 12 * 1024 * 1024; // 12 MB — a passport photograph, not a film
const DOC_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf'];

async function handleDocument(request, env) {
  const invitationId = request.headers.get('x-invitation') || '';
  const guestId = request.headers.get('x-guest') || '';
  const kind = request.headers.get('x-kind') || '';
  const filename = (request.headers.get('x-filename') || 'document').slice(0, 120);
  const type = request.headers.get('content-type') || '';

  if (!/^INV-[A-Za-z0-9_-]{1,32}$/.test(invitationId) || !/^[A-Za-z0-9_-]{1,32}$/.test(guestId)) {
    return json({ ok: false, error: 'invalid invitation or guest' }, 400, corsHeaders(request));
  }
  /* a document is sent by the guest it belongs to, and by nobody else */
  if (!owns(await identify(request, env), invitationId, guestId)) {
    return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  }
  if (kind !== 'passport' && kind !== 'flight') {
    return json({ ok: false, error: 'unknown document kind' }, 400, corsHeaders(request));
  }
  if (!DOC_TYPES.includes(type.split(';')[0].trim())) {
    return json({ ok: false, error: 'unsupported file type' }, 415, corsHeaders(request));
  }
  if (!env.DOCS) {
    // No store, no receipt. The guest is told the truth by the client.
    return json({ ok: false, error: 'document storage is not enabled yet', enabled: false }, 503, corsHeaders(request));
  }

  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ ok: false, error: 'empty file' }, 400, corsHeaders(request));
  if (bytes.byteLength > MAX_DOC) return json({ ok: false, error: 'file too large' }, 413, corsHeaders(request));

  const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  const receivedAt = new Date().toISOString();
  const key = `doc/${invitationId}/${guestId}/${kind}/${receivedAt}-${digest.slice(0, 12)}`;

  try {
    await env.DOCS.put(key, bytes, {
      httpMetadata: { contentType: type },
      customMetadata: { invitationId, guestId, kind, filename, receivedAt, sha256: digest },
    });
  } catch (e) {
    return json({ ok: false, error: 'document could not be stored' }, 503, corsHeaders(request));
  }
  // RECEIVED means received. Never reviewed, verified or approved.
  return json({ ok: true, status: 'RECEIVED', key, sha256: digest, receivedAt, bytes: bytes.byteLength },
    201, corsHeaders(request));
}

async function handleRegister(request, env) {
  let body;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ ok: false, error: 'payload too large' }, 413);
    body = JSON.parse(raw);
  } catch (e) {
    return json({ ok: false, error: 'invalid JSON' }, 400);
  }
  const { invitationId, registration, text } = body || {};
  if (!invitationId || typeof text !== 'string' || !text.startsWith('SEE YOU IN LAOS')) {
    return json({ ok: false, error: 'invalid registration payload' }, 400);
  }
  /* a journey is sent by the guest it belongs to, under their own invitation */
  const who = await identify(request, env);
  if (!who || who.invitationId !== String(invitationId).trim() || (registration && registration.guestId && registration.guestId !== who.guestId)) {
    return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  }

  const submittedAt = (registration && registration.registration_submitted_at) || new Date().toISOString();
  // ONE LOGICAL JOURNEY per invitation (Owner, 16 Sep 2026): the first submission sets the reference; every later send is an
  // UPDATE of the same journey — same submissionId, version + 1, the previous state kept alongside as a bounded history.
  const regKey = 'reg:' + invitationId;
  let existing = null; if (env.REG_KV) { try { existing = JSON.parse(await env.REG_KV.get(regKey) || 'null'); } catch (e) { existing = null; } }
  const isUpdate = !!(existing && existing.submissionId);
  const submissionId = isUpdate ? existing.submissionId : await submissionIdOf(invitationId, submittedAt);
  const version = isUpdate ? (existing.version || 1) + 1 : 1;
  let stored = false;

  // 1) DURABLE PERSISTENCE FIRST. Without a stored record the endpoint reports
  //    failure and the client falls back to the clearly-labelled emergency
  //    channel — success is never simulated. The record carries the submission
  //    id; the provider's answer is written to it after the emails (step 2).
  /* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): nothing is stripped from a submission — every line is the guest's own selection */
  /* THE RECIPIENT (Owner, 16 Sep 2026 · EMAIL FIRST): the authenticated guest → the contact persisted on the server under
     their invitation → the confirmation email. A journey without a valid email is not accepted: the guest is sent back to
     the email field; the email they add is persisted server-side and Review & Send is open again. */
  const recipient = await resolveRecipient(env, who, registration);
  if (!recipient.email) {
    return json({ ok: false, error: 'email required', message: 'Please add your email address so we can send your confirmation.', field: 'email' }, 422, corsHeaders(request));
  }
  /* THE PERSISTED ROOMS (Owner, 16 Sep 2026): the rooms this guest holds are read from the room engine on the server —
     the emails name the room the engine persists, never a room the client claims */
  const rooms = await engineRooms(env, who);
  /* THE ONE VALIDATOR (Owner, 21 Sep 2026 · the global My Trip rebuild): the same graph the pages read decides here whether the
     trip is complete — every relevant stage answered (a hold or a waiting-list place the engine persists, a chosen transport,
     an explicit "not joining this stage" where the stage allows it), the wedding's answers, the seats while seating is open,
     About You. A guest not joining the trip sends a complete response with nothing else. An incomplete trip is refused. */
  const done = await completionOf(env, who, registration, rooms);
  if (!done.canSend) {
    return json({ ok: false, error: 'incomplete', message: 'Your trip is not complete yet.', missing: done.missing, unresolved: done.unresolved }, 422, corsHeaders(request));
  }
  let record = null;
  if (env.REG_KV) {
    try {
      const draftFingerprint = await journeyFingerprint(env, who);
      const now = new Date().toISOString();
      record = { invitationId, submittedAt: isUpdate ? existing.submittedAt : submittedAt, submissionId, version, kind: isUpdate ? 'update' : 'initial',
        firstSentAt: isUpdate ? (existing.firstSentAt || existing.submittedAt) : submittedAt, lastSentAt: now, updatedAt: now,
        guestId: who.guestId, hosts: !!who.hosts, registration, text, rooms, recipient, draftFingerprint, mail: null };
      /* THE PERMANENT PERSON ID (Owner, 20 Sep 2026): CONxxx and COUPLxxx are the register's — stamped from the auth index, never taken from the body */
      if (registration && typeof registration === 'object') { const person = await personOf(env, new URL(request.url).origin, who); if (person.contactId) registration.contactId = person.contactId; else delete registration.contactId; if (person.couple) registration.couple = person.couple; else delete registration.couple; }
      const prev = await env.REG_KV.get(regKey);
      await env.REG_KV.put(regKey, JSON.stringify(record), { metadata: { invitationId, submittedAt: record.submittedAt, submissionId, version, lastSentAt: now } });
      if (prev) {
        let prevObj = null; try { prevObj = JSON.parse(prev); } catch (e) {}
        if (!prevObj || (prevObj.lastSentAt || prevObj.submittedAt) !== now) {
          await env.REG_KV.put(regKey + ':prev:' + now, prev, {
            metadata: { invitationId, supersededBy: now },
            expirationTtl: 60 * 60 * 24 * 90,
          });
        }
      }
      stored = true;
    } catch (e) { /* persistence failed — reported honestly below */ }
  }
  if (!stored) {
    return json({ ok: false, error: 'registration could not be stored', mailed: false }, 503, corsHeaders(request));
  }

  // 2) THE TWO EMAILS — Guest Relations and the guest — through the configured
  //    provider; the provider's acceptance and message ids are recorded on the
  //    stored record. An email failure never loses the booking: the journey is
  //    saved, the client says so and offers the retry.
  const mail = await sendJourneyMail(env, record, request);
  try { await env.REG_KV.put(regKey, JSON.stringify({ ...record, mail, mailSummary: mailSummary(mail) }), { metadata: { invitationId, submittedAt, submissionId } }); } catch (e) { /* the record stands; the mail result is in the response */ }
  return json({ ok: true, status: 'UNDER_REVIEW', stored, mailed: !!(mail.owner && mail.owner.accepted), submittedAt: record.submittedAt, lastSentAt: record.lastSentAt, submissionId, version, kind: record.kind, mail: publicMail(mail), mailSummary: mailSummary(mail), submission: submissionStateOf(record, false) }, 202, corsHeaders(request));
}
/* ---- THE JOURNEY DRAFT ------------------------------------------------------------------------------------------
   draft:<invitationId> = { invitationId, guestId, keys: { 'siyl.guest': <json string>, 'siyl.bag': …, 'siyl.temple': …,
   'siyl.docs': … (states only, never a document byte), 'siyl.sent': …, 'siyl.skip': …, 'siyl.skip.by': … }, updatedAt,
   savedAt, fingerprint }. The fingerprint covers what the guest chose and answered (histories and stamps left out) plus
   the rooms and seats the engines hold for them — the submission stores the fingerprint it was sent with, so
   "changes not yet sent" is a comparison, never a guess. */
const DRAFT_KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
const draftKey = (invitationId) => 'draft:' + invitationId;
/* the draft lives in the per-invitation actor (src/drafts.js); the KV mirror answers only where the actor is not bound */
function draftActor(env, invitationId) { return env.DRAFTS ? env.DRAFTS.get(env.DRAFTS.idFromName(invitationId)) : null; }
async function draftOp(env, invitationId, op, body) { const stub = draftActor(env, invitationId); const r = await stub.fetch(new Request('https://drafts/' + op, { method: 'POST', body: JSON.stringify({ invitationId, ...(body || {}) }) })); return { status: r.status, ...(await r.json()) }; }
/* strict: a failed read is thrown (the draft endpoint answers 503 instead of pretending an empty draft); otherwise null */
async function storedDraft(env, invitationId, strict) {
  if (env.DRAFTS) { try { const r = await draftOp(env, invitationId, 'get'); if (!r.ok) throw new Error(r.error || 'draft could not be read'); return r.draft || null; } catch (e) { if (strict) throw e; return null; } }
  if (!env.REG_KV) return null; try { return JSON.parse(await env.REG_KV.get(draftKey(invitationId)) || 'null'); } catch (e) { return null; }
}
/* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): nothing is stripped from a draft — every Bag line is the guest's own selection */
const totalOf = (list) => (Array.isArray(list) ? list : []).reduce((t, x) => t + (Number(x && x.price) || 0) * (Number(x && x.qty) || 1), 0);
function draftContent(keys) {
  const out = {};
  for (const k of ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.skip', 'siyl.skip.by']) {
    let v = null; try { v = JSON.parse(keys && keys[k] || 'null'); } catch (e) { v = keys && keys[k] || null; }
    if (v && typeof v === 'object' && !Array.isArray(v)) { delete v.history; delete v.contactSyncedAt; if (v.guests) for (const g of Object.values(v.guests)) if (g && typeof g === 'object') delete g.history; }
    out[k] = v;
  }
  return out;
}
async function sha256Hex(text) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
/* the trip as the server can prove it, in the graph's words (see src/stage-graph.js · completion) */
async function completionOf(env, who, registration, rooms) {
  const reg = registration && typeof registration === 'object' ? registration : {};
  const gr = reg.guestRecord && typeof reg.guestRecord === 'object' ? reg.guestRecord : {};
  const claimed = reg.stages && typeof reg.stages === 'object' ? reg.stages : {};
  const lines = Array.isArray(reg.selections) ? reg.selections : [];
  const lineOf = (ids) => lines.find((x) => x && ids.includes(String(x.id)));
  const scope = graphScope(gr.scope, { prewed: claimed.prewed || 'open' });
  const stages = {};
  GRAPH_STAGES.forEach((st) => {
    const ids = GRAPH_IDS[st.key] || [st.key];
    const said = String(claimed[st.key] || 'open');
    const line = lineOf(ids);
    if (st.kind === 'stay' && rooms) {
      /* a stay is answered by the engine's own record: a room held or a waiting-list place in this guest's name */
      const held = ids.map((id) => rooms[id]).find(Boolean);
      if (held) stages[st.key] = held.waitlisted ? 'waitlisted' : 'selected';
      else if (line && line.interest) stages[st.key] = 'selected';
      else stages[st.key] = said === 'declined' ? 'declined' : 'open';
    } else if (st.kind === 'stay') {
      stages[st.key] = ['selected', 'waitlisted', 'declined'].includes(said) ? said : 'open';   /* the engine could not be read: the sent state stands */
    } else {
      stages[st.key] = line ? 'selected' : (said === 'declined' ? 'declined' : 'open');
    }
  });
  /* the wedding, in the record's words */
  const tc = reg.templeCeremony && Array.isArray(reg.templeCeremony.guests) ? (reg.templeCeremony.guests.find((g) => g && g.guestId === who.guestId) || reg.templeCeremony.guests[0]) : null;
  const word = (v) => v === 'Joining' ? 'yes' : v === 'Not joining' ? 'no' : null;
  const events = {}; ['temple', 'coffee', 'vows', 'dinner'].forEach((k) => { events[k] = tc && tc.events ? word(String(tc.events[k] || '')) : null; });
  const sangkhathan = !tc ? null : (tc.sangkhathanState === 'Decision required' ? null : !!tc.sangkhathan);
  const seatView = await engineSeatView(env, who);
  const seats = seatView && seatView.mine ? { ceremony: (seatView.mine.ceremony || {})[who.guestId] || null, dinner: (seatView.mine.dinner || {})[who.guestId] || null } : {};
  const about = [];
  const allergy = gr.allergy || {};
  if (allergy.answer !== 'no' && !(allergy.answer === 'yes' && String(allergy.details || '').trim())) about.push({ key: 'allergy', label: 'Food allergies', href: 'about-you.html#allergy' });
  if (!gr.photo) about.push({ key: 'photo', label: 'Photography acknowledgement', href: 'about-you.html#photo' });
  /* a room or a waiting-list place the engine still holds for a stage outside the trip must have been released first */
  const stale = scope ? Object.keys(rooms || {}).filter((stage) => GRAPH_IDS[stage] && !graphRelevant(stage, scope)).map((stage) => ({ key: 'release:' + stage, label: 'A place still held for a stage outside your trip', href: 'your-journey.html#scope' })) : [];
  return graphCompletion({
    scope, stages, stale,
    contact: { missing: [] },
    wedding: { events, sangkhathan, dress: !!(gr.dress && gr.dress.all), hosts: !!who.hosts,
      seating: seatView ? { open: !!seatView.open, frozen: !!seatView.frozen, configured: seatView.configured || {}, seats } : { open: false } },
    about: { missing: scope && scope.none ? [] : about },
  });
}
async function engineSeatView(env, who) {
  if (!env.SEATING || !who) return null;
  try { const stub = env.SEATING.get(env.SEATING.idFromName('seating')); const r = await stub.fetch(new Request('https://seating/api/seating/mine?invitation=' + encodeURIComponent(who.invitationId), { headers: { 'x-siyl-identity': JSON.stringify(who) } })); const v = await r.json(); return v && v.ok ? v : null; } catch (e) { return null; }
}
async function engineSeats(env, who) {
  if (!env.SEATING || !who) return null;
  try { const stub = env.SEATING.get(env.SEATING.idFromName('seating')); const r = await stub.fetch(new Request('https://seating/api/seating/mine?invitation=' + encodeURIComponent(who.invitationId), { headers: { 'x-siyl-identity': JSON.stringify(who) } })); const v = await r.json(); return v && v.mine ? v.mine : null; } catch (e) { return null; }
}
async function journeyFingerprint(env, who, draft) {
  const d = draft === undefined ? await storedDraft(env, who.invitationId) : draft;
  const [rooms, seats] = await Promise.all([engineRooms(env, who), engineSeats(env, who)]);
  /* the fingerprint is the guest's OWN journey: a waiting-list position moves when others leave the line — not a change of theirs */
  const own = rooms ? Object.fromEntries(Object.entries(rooms).map(([k, v]) => [k, v && v.waitlisted ? { stage: v.stage, waitlisted: true, size: v.size } : v])) : rooms;
  return sha256Hex(JSON.stringify({ draft: draftContent(d && d.keys), rooms: own, seats }));
}
function submissionStateOf(record, hasUnsentChanges) {
  if (!record || !record.submissionId) return { submissionStatus: 'draft', submissionId: null, submittedAt: null, lastSentAt: null, version: 0, hasUnsentChanges: false };
  return { submissionStatus: hasUnsentChanges ? 'changes-not-sent' : 'sent', submissionId: record.submissionId, submittedAt: record.submittedAt, lastSentAt: record.lastSentAt || record.submittedAt, version: record.version || 1, hasUnsentChanges: !!hasUnsentChanges, mail: record.mailSummary || null };
}
async function submissionFor(env, who, draft) {
  let record = null; try { record = JSON.parse(await env.REG_KV.get('reg:' + who.invitationId) || 'null'); } catch (e) { record = null; }
  if (!record) return submissionStateOf(null, false);
  const fp = await journeyFingerprint(env, who, draft === undefined ? undefined : draft);
  return submissionStateOf(record, !!record.draftFingerprint && record.draftFingerprint !== fp);
}
async function handleDraft(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  if (request.method === 'GET') {
    let d, actorEpoch = null; try { const r = env.DRAFTS ? await draftOp(env, who.invitationId, 'get') : null; if (r) { if (!r.ok) throw new Error(r.error || 'draft could not be read'); d = r.draft || null; actorEpoch = r.epoch || null; } else d = await storedDraft(env, who.invitationId, true); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); }
    const submission = await submissionFor(env, who, d);
    let resetAt = actorEpoch; if (!resetAt) { try { resetAt = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); } }
    return json({ ok: true, invitationId: who.invitationId, guestId: who.guestId, draft: d ? { keys: d.keys, updatedAt: d.updatedAt, savedAt: d.savedAt, clientUpdatedAt: d.clientUpdatedAt || null } : null, submission, ...(resetAt ? { resetAt } : {}) }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  let body; try { const raw = await request.text(); if (raw.length > MAX_BODY) return json({ ok: false, error: 'payload too large' }, 413, corsHeaders(request)); body = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  if (body && body.invitationId && String(body.invitationId) !== who.invitationId) return json({ ok: false, error: 'not your invitation' }, 403, corsHeaders(request));
  const incoming = {};
  for (const k of DRAFT_KEYS) if (body && body.keys && typeof body.keys[k] === 'string') incoming[k] = body.keys[k];
  if (!Object.keys(incoming).length) return json({ ok: false, error: 'nothing to save' }, 400, corsHeaders(request));
  /* THE WRITE IS THE ACTOR'S (Codex P1-1): the revision comparison, the merge over the stored keys and
     the write happen inside one serialised step per invitation — two devices, or two overlapping autosaves, can never both
     pass the same base revision. A stale device (an older `baseUpdatedAt`, or none against a stored draft) is refused with the
     current draft; its independent edits are merged on the device against the base it last read (assets/draft.js). */
  const base = body && typeof body.baseUpdatedAt === 'string' ? body.baseUpdatedAt : null;
  /* THE CLEAN RESET (Owner, 19 Sep 2026): a device that has not read the server since the reset cannot write — its cached
     journey would come back as the draft. It learns the epoch from the read, clears, and reads again (assets/draft.js). */
  let epoch; try { epoch = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'draft store unavailable', retry: true }, 503, corsHeaders(request)); }   /* fail closed: a store that cannot be read is not "no reset" */
  if (epoch && (!body || body.seenReset !== epoch)) return json({ ok: false, error: 'reset', resetAt: epoch }, 409, corsHeaders(request));
  let d = null;
  if (env.DRAFTS) {
    const r = await draftOp(env, who.invitationId, 'put', { keys: incoming, baseUpdatedAt: base, clientUpdatedAt: body && body.clientUpdatedAt || null, reason: body && body.reason || null, guestId: who.guestId, seenReset: body && body.seenReset || null });
    if (r.status === 409 && r.error === 'reset') return json({ ok: false, error: 'reset', resetAt: r.resetAt }, 409, corsHeaders(request));
    if (r.status === 409) { const submission = await submissionFor(env, who, r.draft); return json({ ok: false, error: 'stale', invitationId: who.invitationId, draft: { keys: r.draft.keys, updatedAt: r.draft.updatedAt, savedAt: r.draft.savedAt }, submission }, 409, corsHeaders(request)); }
    if (!r.ok) return json({ ok: false, error: r.error || 'draft could not be stored', ...(r.retry ? { retry: true } : {}) }, r.status === 400 ? 400 : 503, corsHeaders(request));
    d = r.draft;
  } else {
    /* no actor bound (a reduced test environment): the same rules, one request at a time */
    const prevDraft = await storedDraft(env, who.invitationId);
    if (prevDraft && prevDraft.updatedAt && base !== prevDraft.updatedAt) { const submission = await submissionFor(env, who, prevDraft); return json({ ok: false, error: 'stale', invitationId: who.invitationId, draft: { keys: prevDraft.keys, updatedAt: prevDraft.updatedAt, savedAt: prevDraft.savedAt }, submission }, 409, corsHeaders(request)); }
    const keys = Object.assign({}, prevDraft && prevDraft.keys || {}, incoming);
    let now = new Date().toISOString(); if (prevDraft && prevDraft.updatedAt && now <= prevDraft.updatedAt) now = new Date(Date.parse(prevDraft.updatedAt) + 1).toISOString();
    d = { invitationId: who.invitationId, guestId: who.guestId, keys, updatedAt: now, savedAt: now, clientUpdatedAt: body && body.clientUpdatedAt || null, reason: body && body.reason || null };
    try { await env.REG_KV.put(draftKey(who.invitationId), JSON.stringify(d), { metadata: { invitationId: who.invitationId, guestId: who.guestId, updatedAt: now } }); } catch (e) { return json({ ok: false, error: 'draft could not be stored' }, 503, corsHeaders(request)); }
  }
  const keys = d.keys, now = d.updatedAt;
  /* the contact inside the draft is the server contact too (the recipient of the confirmation) */
  try { const g = JSON.parse(keys['siyl.guest'] || 'null'); const c = g && g.contact; if (c && (validEmail(c.email) || c.phone)) { const prev = await storedContact(env, who.invitationId) || {}; const email = validEmail(c.email) || prev.email || '', phone = (c.phone || '').trim().slice(0, 40) || prev.phone || ''; if (email !== (prev.email || '') || phone !== (prev.phone || '')) await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify({ invitationId: who.invitationId, guestId: who.guestId, email, phone, at: now, from: 'draft' })); } } catch (e) { /* the draft stands */ }
  const submission = await submissionFor(env, who, d);
  return json({ ok: true, invitationId: who.invitationId, savedAt: now, updatedAt: now, submission }, 200, corsHeaders(request));
}
/* ---- THE CLEAN RESET (Owner, 19 Sep 2026 · hardened after the Codex pre-deploy review) ------------------------------
   Every guest starts as though they had never used the private planning system: every room occupancy the engine stores
   (the FIXED allocation is configuration, never stored), every seat hold, every draft actor, and the KV records a guest
   generated — draft mirrors, contacts, profile photos, submissions and their history. Invitations, codes, the register,
   the seating geometry and its open / frozen state and the inventory definitions are never touched.
   Three modes, all Guest-Relations-only:
     · dry run (default)  what would go — counts and ids — nothing written;
     · snapshot            the same, with every stored value (KV values with their metadata, binary as base64; the engine's
                           occupancy records; the seat holds; the drafts) — the caller writes and verifies its private
                           backup from this, BEFORE anything is deleted; the answer carries a digest of the key set;
     · execute             `dryRun: false`, the exact words `confirm: "RESET ALL GUEST STATE"` and the snapshot's `digest`:
                           refused when the key set changed since the snapshot (snapshot again). The order fences writes
                           in flight: every draft actor takes the epoch first (a write without it is refused inside the
                           actor, KV or no KV), then the epoch is published in KV, then the engine, the ledger and the KV
                           records are cleared. Nothing is read from the answer to recover — the backup already exists. */
const RESET_WORDS = 'RESET ALL GUEST STATE';
const RESET_PREFIXES = ['draft:', 'contact:', 'avatar:', 'reg:'];
/* the epoch: a failed read is a failed read, never "no reset" (fail closed) */
async function resetEpoch(env) { if (!env.REG_KV) return null; return (await env.REG_KV.get('reset:epoch')) || null; }
async function digestOf(keys) { const data = new TextEncoder().encode(keys.slice().sort().join('\n')); const h = await crypto.subtle.digest('SHA-256', data); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
function b64(buf) { const bytes = new Uint8Array(buf); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
async function handleGrReset(request, env) {
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
  let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
  const execute = body && body.dryRun === false;
  if (execute && body.confirm !== RESET_WORDS) return json({ ok: false, error: 'the confirmation words are missing' }, 400);
  if (execute && !(body.digest && /^[a-f0-9]{64}$/.test(String(body.digest)))) return json({ ok: false, error: 'the snapshot digest is missing — snapshot first, keep the backup, then execute' }, 400);
  const snapshot = !execute && body && body.snapshot === true;
  const origin = new URL(request.url).origin;
  const at = new Date().toISOString();
  const out = { ok: true, mode: execute ? 'execute' : snapshot ? 'snapshot' : 'dry-run', dryRun: !execute, at, rooms: null, seating: null, drafts: { actors: 0, had: 0, cleared: 0, ids: [] }, kv: { keys: [], deleted: 0 }, backup: snapshot ? {} : undefined, digest: null };
  const grHeaders = { 'content-type': 'application/json', 'x-gr-verified': 'yes' };
  /* the key set: every invitation the register knows, plus every mirror or record key in KV */
  const invs = new Set();
  const entries = await loadIndex(env, origin, true);
  for (const e of Object.values(entries || {})) if (e && e.i) invs.add(e.i);
  const keys = [];
  for (const prefix of RESET_PREFIXES) {
    let cursor; do { const l = await env.REG_KV.list({ prefix, cursor }); for (const k of l.keys) { keys.push(k.name); const inv = k.name.slice(prefix.length).split(':')[0]; if (inv) invs.add(inv); } cursor = l.list_complete ? null : l.cursor; } while (cursor);
  }
  keys.sort(); out.kv.keys = keys;
  const roomsStub = env.ROOMS ? env.ROOMS.get(env.ROOMS.idFromName('rooms')) : null;
  const seatStub = env.SEATING ? env.SEATING.get(env.SEATING.idFromName('seating')) : null;
  const readRooms = async () => roomsStub ? (await roomsStub.fetch(new Request('https://rooms/api/rooms/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: true, snapshot: true }) }))).json() : null;
  const readSeats = async () => seatStub ? (await seatStub.fetch(new Request('https://seating/api/seating/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: true, snapshot: true }) }))).json() : null;
  /* the digest binds an execution to the state that was snapshotted — the VALUES, not only the keys: every KV value's bytes,
     every occupancy and hold record, every draft's revision (Codex final review) */
  const rooms0 = await readRooms(), seats0 = await readSeats();
  const draftIds = [], signature = [];
  if (env.DRAFTS) for (const inv of [...invs].sort()) { const r = await draftOp(env, inv, 'reset', { dryRun: true, snapshot: true }); out.drafts.actors++; if (r && r.had) { out.drafts.had++; draftIds.push(inv); signature.push('draft-actor:' + inv + '@' + (r.draft && r.draft.updatedAt || '')); if (snapshot && r.draft) out.backup['do:draft:' + inv] = r.draft; } }
  out.drafts.ids = draftIds;
  for (const r of (rooms0 && rooms0.rows || [])) signature.push('occ:' + r.key + '|' + r.label + '|' + r.guestId + '@' + JSON.stringify(r.value || null));
  for (const w of (rooms0 && rooms0.waits || [])) signature.push('wl:' + w.stage + '|' + w.guestId + '@' + JSON.stringify(w.value || null));
  for (const r of (seats0 && seats0.rows || [])) signature.push('hold:' + r.event + ':' + r.seatId + ':' + r.guestId + '@' + JSON.stringify(r.value || null));
  const kvValues = {};
  for (const k of keys) {
    /* lossless: the bytes as base64 with the metadata; a value that cannot be read is a failed snapshot, never a silent gap */
    const got = await env.REG_KV.getWithMetadata(k, { type: 'arrayBuffer' });
    if (got === null || got.value === null) { signature.push('kv:' + k + '@missing'); kvValues[k] = null; continue; }
    const v = { base64: b64(got.value), metadata: got.metadata || null, bytes: got.value.byteLength };
    kvValues[k] = v; signature.push('kv:' + k + '@' + await digestOf([v.base64]));
  }
  out.digest = await digestOf(signature);
  out.rooms = rooms0 ? { occupancies: rooms0.occupancies, fixed: 0, waitlisted: rooms0.waitlisted || 0, rows: (rooms0.rows || []).map((r) => ({ key: r.key, label: r.label, guestId: r.guestId })), waits: (rooms0.waits || []).map((w) => ({ stage: w.stage, guestId: w.guestId })) } : null;
  out.seating = seats0 ? { holds: seats0.holds, rows: (seats0.rows || []).map((r) => ({ event: r.event, seatId: r.seatId, guestId: r.guestId, invitationId: r.invitationId })) } : null;
  if (snapshot) {
    for (const r of (rooms0 && rooms0.rows || [])) out.backup[r.storageKey] = r.value;
    for (const w of (rooms0 && rooms0.waits || [])) out.backup[w.storageKey] = w.value;
    for (const r of (seats0 && seats0.rows || [])) out.backup[r.storageKey] = r.value;
    for (const k of keys) out.backup[k] = kvValues[k];
    return json(out);
  }
  if (!execute) return json(out);
  if (body.digest !== out.digest) return json({ ok: false, error: 'the state changed since the snapshot — snapshot again', digest: out.digest, snapshotDigest: body.digest }, 409);
  /* 0 · the gate: while the sweep runs, no guest write reaches the engine or the ledger (the Worker refuses join / leave /
       select / release with 503 retry); a lock older than five minutes is stale (a sweep that never finished) and ignored */
  await env.REG_KV.put('reset:lock', at, { metadata: { at } });
  try {
    /* 1 · every draft actor takes the epoch and forgets its draft — one serialised step each; a write in flight without the epoch is refused there */
    if (env.DRAFTS) for (const inv of [...invs].sort()) { const r = await draftOp(env, inv, 'reset', { dryRun: false, epoch: at }); if (r && r.cleared) out.drafts.cleared++; }
    /* 2 · the epoch every device honours, published before anything else goes */
    await env.REG_KV.put('reset:epoch', at, { metadata: { at, actor: String(body.actor || 'guest-relations').slice(0, 64), digest: out.digest } });
    out.epoch = at;
    /* 3 · the engine and the ledger */
    if (roomsStub) out.rooms = await (await roomsStub.fetch(new Request('https://rooms/api/rooms/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: false }) }))).json();
    if (seatStub) out.seating = await (await seatStub.fetch(new Request('https://seating/api/seating/reset', { method: 'POST', headers: grHeaders, body: JSON.stringify({ dryRun: false }) }))).json();
    /* 4 · the KV records */
    for (const k of keys) { await env.REG_KV.delete(k); out.kv.deleted++; }
  } finally {
    await env.REG_KV.delete('reset:lock');
  }
  /* 5 · what is left, read again */
  const rooms1 = await readRooms(), seats1 = await readSeats();
  let kvLeft = 0; for (const prefix of RESET_PREFIXES) { const l = await env.REG_KV.list({ prefix }); kvLeft += l.keys.length; }
  out.remaining = { occupancies: rooms1 ? rooms1.occupancies : null, waitlisted: rooms1 ? rooms1.waitlisted : null, holds: seats1 ? seats1.holds : null, kvKeys: kvLeft };
  return json(out);
}
/* the sweep's gate on guest writes to the engine and the ledger (never on reads, never on Guest Relations) */
async function resetLocked(env) {
  if (!env.REG_KV) return false;
  let at = null; try { at = await env.REG_KV.get('reset:lock'); } catch (e) { return true; }   /* a store that cannot be read: hold the write, it is retried */
  if (!at) return false;
  return Date.now() - Date.parse(at) < 5 * 60 * 1000;
}
/* ---- GUEST RELATIONS: the canonical current data of every guest with a draft or a submission ---- */
async function handleGrJourneys(request, env) {
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503);
  const entries = await loadIndex(env, new URL(request.url).origin, false);
  const byInv = {}; for (const e of Object.values(entries || {})) byInv[e.i] = e;
  const invs = new Set();
  for (const prefix of ['draft:', 'reg:']) { let cursor; do { const l = await env.REG_KV.list({ prefix, cursor }); for (const k of l.keys) { const inv = k.name.slice(prefix.length); if (!inv.includes(':')) invs.add(inv); } cursor = l.list_complete ? null : l.cursor; } while (cursor); }
  const out = [];
  for (const inv of [...invs].sort()) {
    const e = byInv[inv] || null, who = e ? { invitationId: inv, guestId: e.g, partyId: e.p, hosts: e.h === 1, contactId: e.c || null, couple: e.k || null } : { invitationId: inv, guestId: inv.replace(/^INV-/, ''), partyId: null, hosts: false };
    const d = await storedDraft(env, inv); let rec = null; try { rec = JSON.parse(await env.REG_KV.get('reg:' + inv) || 'null'); } catch (x) { rec = null; }
    const content = draftContent(d && d.keys), g = content['siyl.guest'] || {}, sub = await submissionFor(env, who, d);
    const [rooms, seats] = await Promise.all([engineRooms(env, who), engineSeats(env, who)]);
    const contact = await storedContact(env, inv);
    out.push({ invitationId: inv, guestId: who.guestId, partyId: who.partyId, hosts: who.hosts, contactId: who.contactId || null, couple: who.couple || null, name: rec ? guestNameOf(rec) : null,
      status: sub.submissionStatus, submissionId: sub.submissionId, version: sub.version, submittedAt: sub.submittedAt, lastSentAt: sub.lastSentAt, hasUnsentChanges: sub.hasUnsentChanges,
      draftUpdatedAt: d ? d.updatedAt : null, contact: contact ? publicContact(contact) : (g.contact || null),
      bag: content['siyl.bag'] || null, wedding: content['siyl.temple'] || null, aboutYou: g.guests ? Object.values(g.guests).map((x) => ({ submitted: x.submitted, profile: x.profile })) : null, documents: content['siyl.docs'] || null,
      rooms, seats, mail: rec ? (rec.mailSummary || null) : null, text: rec ? rec.text : null });
  }
  return json({ ok: true, at: new Date().toISOString(), journeys: out });
}
/* the flat mail record the Owner asked for, beside the provider answers */
function mailSummary(mail) {
  const o = mail && mail.owner || {}, g = mail && mail.guest || {};
  return { ownerMailStatus: o.accepted ? 'accepted' : 'failed', ownerMessageId: o.id || null, guestMailStatus: g.accepted ? 'accepted' : 'failed', guestMessageId: g.id || null, guestTo: g.to || null, mailLastError: g.error || o.error || null, at: mail && mail.at || null };
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (e) => typeof e === 'string' && EMAIL_RE.test(e.trim()) ? e.trim() : '';
const contactKey = (invitationId) => 'contact:' + invitationId;
async function storedContact(env, invitationId) {
  if (!env.REG_KV) return null;
  try { const raw = await env.REG_KV.get(contactKey(invitationId)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
/* the authenticated guest's contact: GET reads it, PUT/POST stores it — the guest's own invitation only */
/* the register's person id (CONxxx) and couple state (COUPLxxx · SIGL) of an authenticated guest — read from the served index entry
   of their own invitation (the auth authority itself is frozen: this reads beside it, never through a client body) */
async function personOf(env, origin, who) {
  try { const entries = await loadIndex(env, origin, false); const e = Object.values(entries || {}).find((x) => x && x.i === who.invitationId && x.g === who.guestId); return { contactId: e && typeof e.c === 'string' ? e.c : null, couple: e && typeof e.k === 'string' ? e.k : null }; } catch (e) { return { contactId: null, couple: null }; }
}
/* THE GUEST'S OWN NAME (Owner, 21 Sep 2026): First Name · Last Name are the guest's to correct — profile data under the same
   invitation, never the identity (guestId · CONxxx · COUPLxxx stay the register's; no code, no auth changes) */
const PERSONAL_KEYS = ['firstName', 'lastName', 'birthdate', 'nationality', 'address1', 'address2', 'postal', 'city', 'region', 'country'];
const PERSONAL_MAX = { firstName: 80, lastName: 80, birthdate: 10, nationality: 80, address1: 160, address2: 160, postal: 20, city: 80, region: 80, country: 80 };
const validBirthdate = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return false; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return +m[1] >= 1900 && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && d.getTime() < Date.now(); };
const publicContact = (c) => { const out = { email: c.email || '', phone: c.phone || '' }; for (const k of PERSONAL_KEYS) out[k] = c[k] || ''; return out; };
async function handleContact(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  /* THE CLEAN RESET (Owner, 19 Sep 2026): the contact channel honours the epoch as the draft does — the read names it, a
     write without it is refused, a store that cannot be read fails closed */
  let epoch; try { epoch = await resetEpoch(env); } catch (e) { return json({ ok: false, error: 'contact store unavailable', retry: true }, 503, corsHeaders(request)); }
  if (request.method === 'GET') {
    const c = await storedContact(env, who.invitationId);
    return json({ ok: true, invitationId: who.invitationId, contact: c ? { ...publicContact(c), at: c.at } : null, ...(epoch ? { resetAt: epoch } : {}) }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  let body; try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  if (body && body.invitationId && String(body.invitationId) !== who.invitationId) return json({ ok: false, error: 'not your invitation' }, 403, corsHeaders(request));
  if (epoch && body.seenReset !== epoch) return json({ ok: false, error: 'reset', resetAt: epoch }, 409, corsHeaders(request));
  const prev = await storedContact(env, who.invitationId) || {};
  const email = body && typeof body.email === 'string' ? body.email.trim().slice(0, 254) : prev.email || '';
  const phone = body && typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) : prev.phone || '';
  if (email && !validEmail(email)) return json({ ok: false, error: 'invalid email', field: 'email' }, 422, corsHeaders(request));
  /* THE PERSONAL DETAILS (Owner, 20 Sep 2026): the guest's own — stored with the contact under the guest's own invitation;
     the identity (guestId · CONxxx · COUPLxxx) is never taken from the body */
  const personal = {};
  for (const k of PERSONAL_KEYS) personal[k] = body && typeof body[k] === 'string' ? body[k].trim().slice(0, PERSONAL_MAX[k] || 120) : (prev[k] || '');
  if (personal.birthdate && !validBirthdate(personal.birthdate)) return json({ ok: false, error: 'invalid date of birth', field: 'birthdate' }, 422, corsHeaders(request));
  const contact = { invitationId: who.invitationId, guestId: who.guestId, email, phone, ...personal, at: new Date().toISOString() };
  try { await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify(contact), { metadata: { invitationId: who.invitationId, at: contact.at } }); } catch (e) { return json({ ok: false, error: 'contact could not be stored' }, 503, corsHeaders(request)); }
  return json({ ok: true, invitationId: who.invitationId, contact: { ...publicContact(contact), at: contact.at } }, 200, corsHeaders(request));
}
/* the profile photo: GET returns the bytes to the owner (or 404), PUT/POST stores a JPEG · PNG · WebP of at most
   MAX_PHOTO bytes (the client already reduces the picture to a small square), DELETE removes it — the guest's own only */
const MAX_PHOTO = 1024 * 1024; // 1 MB — a reduced square portrait, never an original
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const photoKey = (invitationId) => 'avatar:' + invitationId;
async function handleProfilePhoto(request, env) {
  const who = await identify(request, env);
  if (!who) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'photo storage is not enabled yet', enabled: false }, 503, corsHeaders(request));
  /* WHO SITS WHERE (Owner, 20 Sep 2026): an authenticated guest may read ANOTHER guest's portrait by its opaque guest id (the
     seat plan shows it beside the name) — read only, never a write, never without a session */
  const of = request.method === 'GET' ? String(new URL(request.url).searchParams.get('of') || '').trim() : '';
  if (of && !/^[A-Z]\d{3}$/.test(of)) return json({ ok: false, error: 'unknown guest' }, 404, corsHeaders(request));
  const key = photoKey(of ? 'INV-' + of : who.invitationId);
  if (request.method === 'GET') {
    let got = null; try { got = await env.REG_KV.getWithMetadata(key, { type: 'arrayBuffer' }); } catch (e) { got = null; }
    if (!got || !got.value || !got.value.byteLength) return json({ ok: false, error: 'no photo' }, 404, corsHeaders(request));
    const meta = got.metadata || {};
    return new Response(got.value, { status: 200, headers: Object.assign({ 'content-type': PHOTO_TYPES.includes(meta.type) ? meta.type : 'image/jpeg',
      'cache-control': 'private, no-store', 'x-photo-at': meta.at || '' }, corsHeaders(request)) });
  }
  if (request.method === 'DELETE') {
    try { await env.REG_KV.delete(key); } catch (e) { return json({ ok: false, error: 'photo could not be removed' }, 503, corsHeaders(request)); }
    return json({ ok: true, removed: true }, 200, corsHeaders(request));
  }
  if (request.method !== 'PUT' && request.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405, corsHeaders(request));
  const type = (request.headers.get('content-type') || '').split(';')[0].trim();
  if (!PHOTO_TYPES.includes(type)) return json({ ok: false, error: 'unsupported file type' }, 415, corsHeaders(request));
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return json({ ok: false, error: 'empty file' }, 400, corsHeaders(request));
  if (bytes.byteLength > MAX_PHOTO) return json({ ok: false, error: 'file too large' }, 413, corsHeaders(request));
  const at = new Date().toISOString();
  try { await env.REG_KV.put(key, bytes, { metadata: { type, at, guestId: who.guestId, bytes: bytes.byteLength } }); } catch (e) { return json({ ok: false, error: 'photo could not be stored' }, 503, corsHeaders(request)); }
  return json({ ok: true, at, bytes: bytes.byteLength, type }, 200, corsHeaders(request));
}
/* THE IDENTITY CHAIN: authenticated guest → canonical guestId → the contact email persisted on the server → the recipient.
   The server-side contact wins; a valid email carried by the journey itself is accepted once and persisted (so the next
   device and the retry read the same one); a fixture shape (guests[0].contact) is read last. */
async function resolveRecipient(env, who, registration) {
  const stored = await storedContact(env, who.invitationId);
  if (stored && validEmail(stored.email)) return { email: validEmail(stored.email), phone: stored.phone || '', source: 'server contact' };
  const r = registration || {};
  const candidates = [[r.contact && r.contact.email, 'journey contact'], [r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.email, 'journey guest record'],
    [Array.isArray(r.guests) && r.guests[0] && r.guests[0].contact && r.guests[0].contact.email, 'journey guests[0]']];
  for (const [e, source] of candidates) {
    const email = validEmail(e);
    if (!email) continue;
    const phone = (r.contact && r.contact.phone) || (r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.phone) || '';
    if (env.REG_KV) { try { await env.REG_KV.put(contactKey(who.invitationId), JSON.stringify({ invitationId: who.invitationId, guestId: who.guestId, email, phone, at: new Date().toISOString(), from: source })); } catch (e) { /* the send still goes to it */ } }
    return { email, phone, source };
  }
  return { email: '', phone: '', source: 'none' };
}

/* the submission reference: SYL-<guest>-<8 hex of the stored record's time and invitation> — no code, no bearer */
async function submissionIdOf(invitationId, submittedAt) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('siyl.submission:' + invitationId + ':' + submittedAt));
  return 'SYL-' + String(invitationId).replace(/^INV-/, '') + '-' + [...new Uint8Array(d)].slice(0, 4).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}
const MAIL_FROM_NAME = 'See You In Laos — Guest Relations';
/* the email provider — the API key is a Worker secret, never in the repository:
 *   BREVO_API_KEY   → https://api.brevo.com/v3/smtp/email (sender = MAIL_FROM, a sender validated in Brevo)
 *   RESEND_API_KEY  → https://api.resend.com/emails       (sender = MAIL_FROM, a domain verified in Resend)
 * Without a key nothing is sent and the answer says so: { provider: 'none', accepted: false }. */
async function sendMail(env, to, toName, subject, text, html) {
  const from = (env.MAIL_FROM || GR_EMAIL).trim();
  const out = { provider: 'none', accepted: false, id: null, status: 0, error: null, at: new Date().toISOString() };
  try {
    if (env.BREVO_API_KEY) {
      out.provider = 'brevo';
      const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: { email: from, name: MAIL_FROM_NAME }, to: [{ email: to, name: toName || to }], replyTo: { email: GR_EMAIL, name: 'Guest Relations' }, subject, textContent: text, ...(html ? { htmlContent: html } : {}) }) });
      out.status = r.status; let d = null; try { d = await r.json(); } catch (e) {}
      out.accepted = r.ok; out.id = d && (d.messageId || null); if (!r.ok) out.error = (d && (d.message || d.code)) || ('HTTP ' + r.status);
    } else if (env.RESEND_API_KEY) {
      out.provider = 'resend';
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ from: MAIL_FROM_NAME + ' <' + from + '>', to: [to], reply_to: GR_EMAIL, subject, text, ...(html ? { html } : {}) }) });
      out.status = r.status; let d = null; try { d = await r.json(); } catch (e) {}
      out.accepted = r.ok; out.id = d && (d.id || null); if (!r.ok) out.error = (d && (d.message || d.name)) || ('HTTP ' + r.status);
    } else {
      out.error = 'no email provider configured (set the Worker secret BREVO_API_KEY or RESEND_API_KEY and the variable MAIL_FROM)';
    }
  } catch (e) { out.error = String(e && e.message || e).slice(0, 160); }
  return out;
}
function guestEmailOf(record) {
  if (record && record.recipient && validEmail(record.recipient.email)) return validEmail(record.recipient.email);
  const r = record && record.registration || {};
  for (const e of [r.contact && r.contact.email, r.guestRecord && r.guestRecord.contact && r.guestRecord.contact.email, Array.isArray(r.guests) && r.guests[0] && r.guests[0].contact && r.guests[0].contact.email]) { const v = validEmail(e); if (v) return v; }
  return '';
}
function guestNameOf(record) {
  const r = record && record.registration || {};
  const gr = r.guestRecord && Array.isArray(r.guestRecord.guests) && r.guestRecord.guests[0] || null;
  const g = Array.isArray(r.guests) && r.guests[0] || null;
  return (gr && gr.source && gr.source.fullName) || (gr && gr.name) || (g && (g.fullName || g.name)) || record && record.guestId || r.guestId || 'Guest';
}
/* the guest's rooms as the engine persists them: { stage: { key, label, name } } — read server-side under the guest's own identity */
async function engineRooms(env, who) {
  if (!env.ROOMS || !who) return null;
  try {
    const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
    const r = await stub.fetch(new Request('https://rooms/api/rooms/mine', { headers: { 'x-siyl-identity': JSON.stringify(who) } }));
    const v = await r.json();
    if (!v || !v.ok || !v.mine) return null;
    const out = {};
    const entry = (m, stage) => { const s = SEED[m.key]; return { stage, key: m.key, label: m.label, name: s ? s.name : m.key, stay: s && s.stay ? s.stay : null, room: s && s.unit === 'guest' ? s.name : 'Room ' + m.label }; };
    for (const [stage, m] of Object.entries(v.mine)) out[stage] = entry(m, stage);
    /* THE WAITING LIST (Owner, 19 Sep 2026): a stage the guest waits for, with the position — no product, no amount */
    for (const [stage, w] of Object.entries(v.waitlist || {})) if (!out[stage]) out[stage] = { stage, waitlisted: true, position: w.position, since: w.at, size: w.size || 1 };
    return out;
  } catch (e) { return null; }
}
/* both emails for one stored record — the content is the journey as sent, never an access code */
async function sendJourneyMail(env, record, request) {
  const origin = new URL(request.url).origin;
  const name = guestNameOf(record);
  /* the words and the look come from src/mail-templates.js (See You In Laos CI); the facts are the stored record's */
  const ownerMail = composeOwnerMail(record, origin + '/api/status?invitation=' + encodeURIComponent(record.invitationId));
  const owner = await sendMail(env, GR_EMAIL, 'Guest Relations', ownerMail.subject, ownerMail.text, ownerMail.html);
  const guestTo = guestEmailOf(record);
  const guestMail = composeGuestMail(record);
  const guest = guestTo ? await sendMail(env, guestTo, name, guestMail.subject, guestMail.text, guestMail.html) : { provider: 'none', accepted: false, id: null, status: 0, error: 'no valid guest email address in the journey', at: new Date().toISOString() };
  return { owner, guest: { ...guest, to: guestTo ? guestTo.replace(/^(.).*(@.*)$/, '$1…$2') : null }, at: new Date().toISOString() };
}
function publicMail(mail) { const pick = (m) => m ? { provider: m.provider, accepted: !!m.accepted, id: m.id || null, error: m.error || null, to: m.to || undefined } : null; return { owner: pick(mail.owner), guest: pick(mail.guest), at: mail.at }; }
/* the retry: the stored record's emails once more — the guest's own record only, no new submission */
async function handleMailRetry(request, env) {
  let body; try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400, corsHeaders(request)); }
  const invitationId = String(body && body.invitationId || '').trim();
  const who = await identify(request, env);
  if (!who || !invitationId || who.invitationId !== invitationId) return json({ ok: false, error: 'unauthorised' }, 401, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: false, error: 'no store' }, 503, corsHeaders(request));
  const raw = await env.REG_KV.get('reg:' + invitationId);
  if (!raw) return json({ ok: false, error: 'no stored journey to confirm' }, 404, corsHeaders(request));
  let record; try { record = JSON.parse(raw); } catch (e) { return json({ ok: false, error: 'stored journey unreadable' }, 500, corsHeaders(request)); }
  if (!record.submissionId) record.submissionId = await submissionIdOf(invitationId, record.submittedAt || '');
  if (!record.guestId) record.guestId = who.guestId;
  /* the recipient is resolved again — the contact the guest has since added on the server is the one used */
  const recipient = await resolveRecipient(env, who, record.registration);
  if (!recipient.email) return json({ ok: false, error: 'email required', message: 'Please add your email address so we can send your confirmation.', field: 'email', submissionId: record.submissionId }, 422, corsHeaders(request));
  record.recipient = recipient;
  const mail = await sendJourneyMail(env, record, request);
  try { await env.REG_KV.put('reg:' + invitationId, JSON.stringify({ ...record, mail, mailSummary: mailSummary(mail), mailRetries: (record.mailRetries || 0) + 1 }), { metadata: { invitationId, submittedAt: record.submittedAt, submissionId: record.submissionId } }); } catch (e) {}
  return json({ ok: true, submissionId: record.submissionId, submittedAt: record.submittedAt, mailed: !!(mail.owner && mail.owner.accepted), mail: publicMail(mail), mailSummary: mailSummary(mail) }, 200, corsHeaders(request));
}

/* ---- F · status and confirmation --------------------------------------- */
const INV_RE = /^INV-[A-Za-z0-9_-]{1,32}$/;

async function handleStatus(request, env) {
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitation') || '';
  if (!INV_RE.test(invitationId)) return json({ ok: false, error: 'invalid invitation' }, 400, corsHeaders(request));
  if (!env.REG_KV) return json({ ok: true, received: false, confirmed: false, store: false }, 200, corsHeaders(request));
  const reg = await env.REG_KV.getWithMetadata('reg:' + invitationId);
  const conf = await env.REG_KV.get('conf:' + invitationId, 'json');
  const received = !!(reg && reg.value);
  const receivedAt = received ? ((reg.metadata && reg.metadata.submittedAt) || null) : null;
  return json({
    ok: true,
    received, receivedAt,
    confirmed: !!(conf && conf.confirmedAt),
    confirmedAt: conf && conf.confirmedAt || null,
  }, 200, corsHeaders(request));
}

async function handleConfirm(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'invalid JSON' }, 400); }
  const invitationId = String(body && body.invitationId || '').trim();
  const action = body && body.action === 'unconfirm' ? 'unconfirm' : 'confirm';
  const actor = String(body && body.actor || 'guest-relations').slice(0, 80);
  const note = String(body && body.note || '').slice(0, 400);
  if (!INV_RE.test(invitationId)) return json({ ok: false, error: 'invalid invitation' }, 400);
  if (!env.REG_KV) return json({ ok: false, error: 'store unavailable' }, 503);
  const key = 'conf:' + invitationId;
  const now = new Date().toISOString();
  const current = (await env.REG_KV.get(key, 'json')) || { invitationId, confirmedAt: null, history: [] };
  /* idempotent: confirming a confirmed journey changes nothing */
  if (action === 'confirm' && current.confirmedAt) {
    return json({ ok: true, invitationId, confirmedAt: current.confirmedAt, unchanged: true }, 200);
  }
  if (action === 'unconfirm' && !current.confirmedAt) {
    return json({ ok: true, invitationId, confirmedAt: null, unchanged: true }, 200);
  }
  const next = {
    invitationId,
    confirmedAt: action === 'confirm' ? now : null,
    actor, source: 'gr-endpoint', note,
    history: (current.history || []).concat([{ action, at: now, actor, note }]).slice(-20),
  };
  await env.REG_KV.put(key, JSON.stringify(next), { metadata: { invitationId, confirmedAt: next.confirmedAt } });
  return json({ ok: true, invitationId, confirmedAt: next.confirmedAt, actor, at: now }, 200);
}

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', ...(extra || {}) },
  });
}
