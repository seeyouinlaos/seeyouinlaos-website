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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/register') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'method not allowed' }, 405);
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
  let stored = false;
  let mailed = false;

  // 1) durable record when a KV binding is configured (owner step: create the
  //    namespace and add `REG_KV` to wrangler.jsonc — see docs/RELEASE-GATES.md)
  if (env.REG_KV) {
    try {
      await env.REG_KV.put(
        'reg:' + invitationId + ':' + submittedAt,
        JSON.stringify({ invitationId, submittedAt, registration, text }),
        { metadata: { invitationId, submittedAt } }
      );
      stored = true;
    } catch (e) { /* fall through */ }
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

  if (!stored && !mailed) {
    // nothing durable happened — tell the client so it falls back to mailto
    return json({ ok: false, error: 'submission channels unavailable' }, 503);
  }
  return json({ ok: true, status: 'UNDER_REVIEW', stored, mailed, submittedAt }, 202);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status, headers: { 'content-type': 'application/json' },
  });
}
