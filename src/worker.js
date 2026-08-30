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
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '7200',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
