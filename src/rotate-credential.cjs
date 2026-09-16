'use strict';
/**
 * Rotate ONE guest's access credential (Owner authorisation, 16 Sep 2026) — private, narrow.
 *
 *   node src/rotate-credential.cjs <guestId>
 *
 * Only the credential changes: the guest keeps the guest id, the invitation id
 * (INV-<guestId>), the party, the record payload (decrypted with the old code and
 * re-encrypted, byte-for-byte the same content), the hosts flag and every engine
 * record (rooms, seats, cart, answers, tickets, submissions are keyed by the
 * invitation / guest id, never by the credential). The other guests' shipped
 * records and index entries are not touched — not even re-encrypted.
 *
 * Writes: src/invitation-tokens.private.csv (the row's token + link),
 *         register/invitations.enc.json (one record replaced),
 *         register/auth-index.json (one entry replaced).
 * Prints counts only — never the old or the new credential.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const TOKENS = path.join(ROOT, 'src', 'invitation-tokens.private.csv');
const OUT = path.join(ROOT, 'register', 'invitations.enc.json');
const INDEX = path.join(ROOT, 'register', 'auth-index.json');
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const newToken = () => [...crypto.randomBytes(16)].map((b) => ALPHABET[b % ALPHABET.length]).join('');
const guestId = process.argv[2];
if (!/^G\d{3}$/.test(guestId || '')) { console.error('usage: node src/rotate-credential.cjs <guestId>'); process.exit(2); }

async function main() {
  const { tokenId, encryptInvitation, decryptInvitation, bearerOf, authIdOf } = await import('../register/crypto.mjs');
  const lines = fs.readFileSync(TOKENS, 'utf8').split('\n');
  const rowIdx = lines.findIndex((l, i) => i > 0 && l.startsWith(guestId + ','));
  if (rowIdx < 0) throw new Error(guestId + ': not in the register');
  const cells = lines[rowIdx].split(',');
  if (cells[7] !== 'ACTIVE' || !cells[5]) throw new Error(guestId + ': not an active guest with a code');
  const oldToken = cells[5];
  const records = JSON.parse(fs.readFileSync(OUT, 'utf8'));
  const index = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  const oldId = await tokenId(oldToken);
  const at = records.findIndex((r) => r.id === oldId);
  if (at < 0) throw new Error(guestId + ': no shipped record answers the current code');
  const payload = await decryptInvitation(oldToken, records[at]);
  if (!payload || payload.guestId !== guestId || payload.invitationId !== 'INV-' + guestId) throw new Error(guestId + ': the record is not this guest');
  const oldAuth = await authIdOf(await bearerOf(oldToken));
  const entry = index.entries[oldAuth];
  if (!entry || entry.g !== guestId) throw new Error(guestId + ': the index entry is not this guest');

  /* the new credential — unique against every other row */
  const others = new Set(lines.slice(1).filter(Boolean).map((l) => l.split(',')[5]).filter(Boolean));
  let token = newToken(); while (others.has(token)) token = newToken();
  const salt = crypto.randomBytes(16).toString('hex'), iv = crypto.randomBytes(12).toString('hex');
  const record = { id: await tokenId(token), salt, iv, ct: await encryptInvitation(token, salt, iv, payload) };
  const check = await decryptInvitation(token, record);
  if (JSON.stringify(check) !== JSON.stringify(payload)) throw new Error('re-encryption mismatch');

  /* replace exactly one record and one index entry; everything else stays byte-identical */
  records.splice(at, 1, record); records.sort((a, b) => a.id.localeCompare(b.id));
  delete index.entries[oldAuth];
  index.entries[await authIdOf(await bearerOf(token))] = entry;
  const sorted = {}; Object.keys(index.entries).sort().forEach((k) => { sorted[k] = index.entries[k]; });
  cells[5] = token; cells[6] = '/register/?invite=' + token; lines[rowIdx] = cells.join(',');

  const outText = JSON.stringify(records), indexText = JSON.stringify({ v: 2, entries: sorted });
  for (const t of [token, oldToken]) if (outText.includes(t) || indexText.includes(t)) throw new Error('PLAINTEXT LEAK in output');
  fs.writeFileSync(OUT, outText);
  fs.writeFileSync(INDEX, indexText);
  fs.writeFileSync(TOKENS, lines.join('\n'));
  console.log('ROTATED                        ' + guestId + ' (' + payload.invitationId + ', party ' + payload.partyId + ')');
  console.log('RECORDS REPLACED               1 of ' + records.length);
  console.log('INDEX ENTRIES REPLACED         1 of ' + Object.keys(sorted).length);
  console.log('PAYLOAD                        identical (decrypted with the old code, re-encrypted under the new one)');
  console.log('OLD CREDENTIAL                 no longer answers any record or index entry');
}
main().catch((e) => { console.error(e.message || e); process.exit(1); });
