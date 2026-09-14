/* ============================================================================
   SEE YOU IN LAOS — WHO IS WRITING (Owner decision, 14 Sep 2026).

   ONE ACCESS CODE AUTHORISES EXACTLY ONE GUEST. The code itself never reaches
   the server. The browser derives a BEARER from it (register/crypto.mjs ·
   bearerOf) and sends that on every write in the `x-siyl-auth` header; the
   Worker derives the AUTH ID from the bearer and looks it up in the deployed
   index (register/auth-index.json, built from the private register). The
   index holds only one-way digests and ids: no code, no bearer, no name.

   A write is accepted only when the identity the bearer resolves to is the
   identity the body claims — invitation id and guest id both. Party
   membership is context, never authorisation: a guest cannot hold a seat, a
   room or a journey for anyone but themselves.
   ========================================================================== */

const INDEX_PATH = '/register/auth-index.json';
const TTL_MS = 60 * 1000;
let cache = { at: 0, entries: null, origin: '' };

async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function authIdOf(bearer) {
  return sha256hex('siyl.auth:' + String(bearer || '').trim().toLowerCase());
}

/* the index as deployed beside the site — read through the ASSETS binding so
 * the Worker and the pages always agree on the same build */
export async function loadIndex(env, origin, force) {
  const now = Date.now();
  if (!force && cache.entries && now - cache.at < TTL_MS && cache.origin === origin) return cache.entries;
  try {
    const res = await env.ASSETS.fetch(new Request(origin + INDEX_PATH));
    if (!res.ok) throw new Error('index ' + res.status);
    const j = await res.json();
    const entries = (j && j.entries) || {};
    cache = { at: now, entries, origin };
    return entries;
  } catch (e) {
    return cache.entries || {};
  }
}

/* { invitationId, guestId, partyId, hosts } for a valid bearer, else null */
export async function identify(request, env) {
  const bearer = (request.headers.get('x-siyl-auth') || '').trim();
  if (!/^[0-9a-f]{64}$/.test(bearer)) return null;
  const origin = new URL(request.url).origin;
  const id = await authIdOf(bearer);
  let entries = await loadIndex(env, origin, false);
  let e = entries[id];
  /* a code issued since the last read: one fresh read before saying no */
  if (!e) { entries = await loadIndex(env, origin, true); e = entries[id]; }
  if (!e) return null;
  return { invitationId: e.i, guestId: e.g, partyId: e.p || null, hosts: e.h === 1 };
}

/* does the body speak for the guest the bearer authorises */
export function owns(identity, invitationId, guestId) {
  return !!(identity && identity.invitationId === String(invitationId || '').trim() && identity.guestId === String(guestId || '').trim());
}

/* a first name as it may appear beside a seat or a room: letters, a few
 * marks, never long, never anything that could be an address or a code */
export function displayName(v) {
  const s = String(v == null ? '' : v).replace(/[^\p{L}\p{M}' \-.]/gu, '').replace(/\s+/g, ' ').trim();
  return s.slice(0, 24);
}
