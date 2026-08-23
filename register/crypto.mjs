/**
 * See You In Laos — invitation crypto (shared browser/Node, WebCrypto only).
 *
 * The public bundle ships ONLY `invitations.enc.json`: per-invitation
 * AES-256-GCM ciphertexts keyed by the invitation token. Without a token no
 * guest data is readable — no names, no directory, nothing enumerable.
 * Tokens are high-entropy, distributed privately (invitation letter / QR).
 * The plaintext list and the token register live in `src/*.private.*`,
 * excluded from deployment and from git.
 */

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export function fromHex(s) {
  return new Uint8Array((s.match(/../g) || []).map((h) => parseInt(h, 16)));
}

/** Public lookup id for a token (safe to ship: preimage-resistant). */
export async function tokenId(token) {
  const d = await subtle.digest('SHA-256', enc.encode('siyl.id:' + token.trim().toLowerCase()));
  return hex(d).slice(0, 24);
}

async function deriveKey(token, saltHex) {
  const base = await subtle.importKey('raw', enc.encode(token.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: 150000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
  );
}

export async function encryptInvitation(token, saltHex, ivHex, payloadObj) {
  const key = await deriveKey(token, saltHex);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv: fromHex(ivHex) }, key, enc.encode(JSON.stringify(payloadObj)));
  return hex(ct);
}

/** Returns the invitation object or null (wrong/unknown token). */
export async function decryptInvitation(token, record) {
  try {
    const key = await deriveKey(token, record.salt);
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: fromHex(record.iv) }, key, fromHex(record.ct));
    return JSON.parse(dec.decode(pt));
  } catch (e) {
    return null;
  }
}

/** Find + decrypt against the shipped records array. */
export async function lookupByToken(token, records) {
  if (!token || !String(token).trim()) return null;
  const id = await tokenId(token);
  const rec = (records || []).find((r) => r.id === id);
  if (!rec) return null;
  const inv = await decryptInvitation(token, rec);
  if (inv) inv.token = String(token).trim().toLowerCase();
  return inv;
}
