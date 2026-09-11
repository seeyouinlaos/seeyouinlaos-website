/**
 * Cloudflare Worker — See You In Laos wedding website.
 *
 * Static guest site served from the ASSETS binding, plus ONE operational
 * route: POST /api/register — the Guest Registration submission endpoint.
 *
 * The endpoint degrades safely: it accepts the structured registration,
 * stores it in KV when a REG_KV binding exists, and forwards a copy to
 * Guest Relations via MailChannels when running on Cloudflare. If neither
 * storage nor forwarding succeeds it returns 503 and the client falls back
 * to the mailto channel — a registration is never silently lost.
 *
 * Plus the SHARED INVENTORY routes — /api/inventory[/reserve|/release|/mine].
 * They are proxied to ONE Durable Object instance ("ledger") so that every
 * guest, in every browser and on either deployment, reads and writes the same
 * stock, and a reservation is decided by a single-threaded actor rather than
 * by whoever happens to submit first.
 *
 * No payment collection, no railway/hotel booking APIs, no guest directory.
 */

const GR_EMAIL = 'guest.relation.seeyouinlaos@gmail.com';
const MAX_BODY = 64 * 1024; // 64 KB — structured registrations are small

const ALLOWED_ORIGINS = [
  'https://seeyouinlaos.github.io',
  'https://seeyouinlaos-website.suthep-hrg.workers.dev',
];
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.includes(origin)) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    /* the document endpoint authenticates with the invitation the client
     * already holds, so those headers must survive the preflight */
    'access-control-allow-headers': 'content-type, x-invitation, x-guest, x-kind, x-filename',
    'access-control-max-age': '7200',
  };
}

/* The GitHub Pages mirror has no backend of its own: it calls these routes on
 * the Worker origin, so the two deployments share ONE ledger. */
export { Inventory } from './inventory.js';
export { Seating } from './seating.js';

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
const GR_SEATING_OPS = ['config', 'state', 'assign', 'unassign', 'plan'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/inventory' || url.pathname.startsWith('/api/inventory/')) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (!env.INVENTORY) {
        return json({ ok: false, error: 'inventory unavailable' }, 503, corsHeaders(request));
      }
      /* one id, one actor, one truth — every request lands on the same object */
      const stub = env.INVENTORY.get(env.INVENTORY.idFromName('ledger'));
      const res = await stub.fetch(request);
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
      headers.delete('x-gr-verified');                     /* a client can never claim the gate */
      if (GR_SEATING_OPS.includes(op)) {
        if (!env.GR_TOKEN) return json({ ok: false, error: 'seating operations are not enabled' }, 503);
        if (!grAuthorised(request, env)) return json({ ok: false, error: 'unauthorised' }, 401);
        headers.set('x-gr-verified', 'yes');
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

  const submittedAt = (registration && registration.registration_submitted_at) || new Date().toISOString();
  // stable registration identifier: one durable record per invitation —
  // a normal repeat submission/retry OVERWRITES the same key (no accidental
  // duplicates); the previous state is kept alongside as a bounded history.
  const regKey = 'reg:' + invitationId;
  let stored = false;
  let mailed = false;

  // 1) DURABLE PERSISTENCE FIRST (HSW-001-ED-FER-001 §1). Without a stored
  //    record the endpoint reports failure and the client falls back to the
  //    clearly-labelled emergency channel — success is never simulated.
  if (env.REG_KV) {
    try {
      const record = JSON.stringify({ invitationId, submittedAt, registration, text });
      const prev = await env.REG_KV.get(regKey);
      await env.REG_KV.put(regKey, record, { metadata: { invitationId, submittedAt } });
      if (prev && prev !== record) {
        await env.REG_KV.put(regKey + ':prev:' + submittedAt, prev, {
          metadata: { invitationId, supersededBy: submittedAt },
          expirationTtl: 60 * 60 * 24 * 90,
        });
      }
      stored = true;
    } catch (e) { /* persistence failed — reported honestly below */ }
  }

  // 2) forward the structured record to Guest Relations
  try {
    const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: GR_EMAIL, name: 'Guest Relations' }] }],
        from: { email: 'registration@seeyouinlaos-website.suthep-hrg.workers.dev', name: 'See You In Laos — Registration' },
        subject: 'Guest Registration — ' + invitationId,
        content: [{ type: 'text/plain', value: text }],
      }),
    });
    mailed = r.ok;
  } catch (e) { /* fall through */ }

  // §1.5: only durable persistence counts as digital submission success.
  // A mailed-but-not-stored state is NOT success; notification failure on a
  // stored record does not destroy the registration.
  if (!stored) {
    return json({ ok: false, error: 'registration could not be stored', mailed }, 503, corsHeaders(request));
  }
  return json({ ok: true, status: 'UNDER_REVIEW', stored, mailed, submittedAt }, 202, corsHeaders(request));
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
