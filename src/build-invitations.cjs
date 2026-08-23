'use strict';
/**
 * Build register/invitations.enc.json from the PRIVATE guest list.
 *
 *   node src/build-invitations.cjs
 *
 * Inputs (never deployed, never committed):
 *   src/guestlist.private.json          — parties/guests from the rooming sheet
 *   src/invitation-tokens.private.csv   — token register (created on first run)
 *
 * Output (deployed, safe):
 *   register/invitations.enc.json       — AES-256-GCM ciphertexts only
 *
 * Tokens are 16-char base32 (≈80 bit) random values; Guest Relations
 * distributes them via the invitation letters (link: /register/?invite=TOKEN).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'src', 'guestlist.private.json');
const TOKENS = path.join(ROOT, 'src', 'invitation-tokens.private.csv');
const OUT = path.join(ROOT, 'register', 'invitations.enc.json');

async function main() {
  const { tokenId, encryptInvitation } = await import('../register/crypto.mjs');
  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));

  // token register: reuse existing tokens, create missing ones
  const tokens = {};
  if (fs.existsSync(TOKENS)) {
    for (const line of fs.readFileSync(TOKENS, 'utf8').split('\n').slice(1)) {
      const [id, party, token] = line.split(',');
      if (id && token) tokens[id.trim()] = token.trim();
    }
  }
  const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i
  const newToken = () => [...crypto.randomBytes(16)].map((b) => ALPHABET[b % ALPHABET.length]).join('');

  const records = [];
  const csv = ['invitationId,partyName,token,link'];
  for (const inv of list) {
    const token = tokens[inv.invitationId] || newToken();
    tokens[inv.invitationId] = token;
    const salt = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(12).toString('hex');
    const payload = {
      invitationId: inv.invitationId, partyName: inv.partyName,
      partyLead: inv.partyLead, guests: inv.guests,
      ...(inv.unresolvedMapping ? { unresolvedMapping: true } : {}),
    };
    records.push({ id: await tokenId(token), salt, iv, ct: await encryptInvitation(token, salt, iv, payload) });
    csv.push([inv.invitationId, JSON.stringify(inv.partyName), token, '/register/?invite=' + token].join(','));
  }
  // shuffle records so file order reveals nothing about the list order
  records.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(OUT, JSON.stringify(records));
  fs.writeFileSync(TOKENS, csv.join('\n') + '\n');
  const plain = fs.readFileSync(OUT, 'utf8');
  const leak = list.flatMap((i) => i.guests.map((g) => g.preferredName)).filter((n) => plain.includes(n));
  if (leak.length) throw new Error('PLAINTEXT LEAK in output: ' + leak.join(','));
  console.log('invitations.enc.json: ' + records.length + ' encrypted invitations, 0 plaintext leaks');
  console.log('token register: src/invitation-tokens.private.csv (KEEP PRIVATE)');
}
main().catch((e) => { console.error(e); process.exit(1); });
