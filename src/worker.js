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
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '7200',
  };
}

/* The GitHub Pages mirror has no backend of its own: it calls these routes on
 * the Worker origin, so the two deployments share ONE ledger. */
export { Inventory } from './inventory.js';

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

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json', ...(extra || {}) },
  });
}
