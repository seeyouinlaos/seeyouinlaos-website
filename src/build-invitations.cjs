'use strict';
/**
 * Build the deployed invitation bundle from the PRIVATE guest list.
 *
 *   node src/build-invitations.cjs            # build (creates missing codes)
 *   node src/build-invitations.cjs --dry-run  # counts only, writes nothing
 *
 * ONE GUEST = ONE INVITATION = ONE ACCESS CODE (Owner decision, 14 Sep 2026).
 * Every ACTIVE named guest of every ACTIVE party receives their own
 * invitation record, keyed by their own code. The party stays as metadata:
 * `partyId` (the former invitation id), the party name, and the first names
 * of the members — for room sharing, the seat plan and Guest Relations.
 *
 * Inputs (never deployed, never committed):
 *   src/guestlist.private.json          — parties/guests from the rooming sheet
 *   src/invitation-tokens.private.csv   — the code register, one row per guest:
 *                                         guestId,invitationId,partyId,partyName,name,token,link,status
 *                                         A register in the retired party
 *                                         format (invitationId,partyName,token,link,status)
 *                                         is migrated on the first run: the
 *                                         party's code stays with the party
 *                                         lead (or, when the lead is not
 *                                         active, with the remaining active
 *                                         guest), every other guest receives a
 *                                         new code, and the old register is
 *                                         kept beside it as a dated backup.
 *
 * Outputs (deployed, safe):
 *   register/invitations.enc.json       — AES-256-GCM ciphertexts only
 *   register/auth-index.json            — sha256(bearer) → { invitation, guest,
 *                                         party, hosts }: what the Worker needs
 *                                         to tie a write to exactly one guest.
 *                                         No code, no name, no bearer in it.
 *
 * Codes are 16-char base32 (≈80 bit) random values; Guest Relations
 * distributes them through the invitation letters (link: /register/?invite=CODE).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const LIST = path.join(ROOT, 'src', 'guestlist.private.json');
const TOKENS = path.join(ROOT, 'src', 'invitation-tokens.private.csv');
const OUT = path.join(ROOT, 'register', 'invitations.enc.json');
const INDEX = path.join(ROOT, 'register', 'auth-index.json');
const DRY = process.argv.includes('--dry-run');

const HEADER = 'guestId,invitationId,partyId,partyName,name,token,link,status';
const LEGACY_HEADER = 'invitationId,partyName,token,link,status';
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/l/i
const newToken = () => [...crypto.randomBytes(16)].map((b) => ALPHABET[b % ALPHABET.length]).join('');

/* a small CSV reader that respects JSON-quoted fields */
function parseCsv(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((x) => x.trim()));
  }
  return rows;
}
const quote = (s) => JSON.stringify(String(s == null ? '' : s));
const invitationIdOf = (guestId) => 'INV-' + guestId;
const activeParty = (p) => (p.status || 'ACTIVE') === 'ACTIVE';
const activeGuest = (p, g) => activeParty(p) && (g.status || 'ACTIVE') === 'ACTIVE';

/* the guest who keeps the party's former code: the lead when active, else the first active guest */
function codeKeeper(p) {
  const lead = p.guests.find((g) => g.guestId === p.partyLead);
  if (lead && activeGuest(p, lead)) return lead.guestId;
  const first = p.guests.find((g) => activeGuest(p, g));
  return first ? first.guestId : null;
}

/* read the register: { byGuest: {guestId → token}, legacy: {partyId → token} | null } */
function readRegister() {
  if (!fs.existsSync(TOKENS)) return { byGuest: {}, legacy: null, format: 'none' };
  const rows = parseCsv(fs.readFileSync(TOKENS, 'utf8'));
  const head = rows.shift() || [];
  if (head.join(',') === LEGACY_HEADER) {
    const legacy = {};
    for (const r of rows) if (r[0] && r[2]) legacy[r[0]] = r[2];
    return { byGuest: {}, legacy, format: 'party' };
  }
  if (head.join(',') !== HEADER) throw new Error('unknown register format: ' + head.join(','));
  const byGuest = {};
  for (const r of rows) if (r[0] && r[5]) byGuest[r[0]] = r[5];
  return { byGuest, legacy: null, format: 'guest' };
}

async function main() {
  const { tokenId, encryptInvitation, bearerOf, authIdOf } = await import('../register/crypto.mjs');
  const list = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const reg = readRegister();

  /* every code is decided here, before anything is written */
  const counts = { activeGuests: 0, invitations: 0, partiesRetained: 0, codesRetainedForLeads: 0, codesRetainedByRemainingGuest: 0, newCodes: 0, cancelledParties: 0, cancelledGuests: 0 };
  const tokens = {};   /* guestId → token */
  const rows = [];     /* the new register */
  const records = [];
  const index = {};
  const csvNames = [];

  for (const p of list) {
    if (activeParty(p)) counts.partiesRetained++; else counts.cancelledParties++;
    const keeper = reg.legacy ? codeKeeper(p) : null;
    for (const g of p.guests) {
      const active = activeGuest(p, g);
      const invitationId = invitationIdOf(g.guestId);
      let token = reg.byGuest[g.guestId] || '';
      let how = token ? 'kept' : '';
      if (!token && reg.legacy && keeper === g.guestId && reg.legacy[p.invitationId]) {
        token = reg.legacy[p.invitationId];
        how = g.guestId === p.partyLead ? 'lead' : 'remaining';
      }
      if (!token && active) { token = newToken(); how = 'new'; }
      if (!active) { counts.cancelledGuests++; }
      else {
        counts.activeGuests++; counts.invitations++;
        if (how === 'lead') counts.codesRetainedForLeads++;
        else if (how === 'remaining') counts.codesRetainedByRemainingGuest++;
        else if (how === 'new') counts.newCodes++;
      }
      tokens[g.guestId] = token;
      const status = !activeParty(p) ? (p.status || 'CANCELLED') : (g.status || 'ACTIVE');
      rows.push([g.guestId, invitationId, p.invitationId, quote(p.partyName), quote(g.preferredName || g.fullName), token, token ? '/register/?invite=' + token : '', status].join(','));
      csvNames.push(g.preferredName, g.fullName);
      if (!active) continue;   /* a cancelled guest keeps no working code and ships nowhere */

      const members = p.guests.filter((x) => activeGuest(p, x)).map((x) => ({ guestId: x.guestId, preferredName: x.preferredName || x.fullName }));
      const payload = {
        invitationId, guestId: g.guestId,
        partyId: p.invitationId, partyName: p.partyName, partyLead: p.partyLead,
        fullName: g.fullName, preferredName: g.preferredName || g.fullName,
        members,
        ...(g.hostRole === 'BRIDE' || g.hostRole === 'GROOM' ? { hostRole: g.hostRole } : {}),
        ...(p.hosts === true ? { hosts: true } : {}),
        /* the Sangkhathan is the guest's own choice; eligibility stays explicit
         * source truth — the party's PAIR/NONE, or a per-guest override */
        sangkhathan: g.givingEligibility === 'NONE' || p.givingEligibility === 'NONE' ? 'NONE'
                   : g.givingEligibility === 'ELIGIBLE' || p.givingEligibility === 'PAIR' ? 'ELIGIBLE' : 'UNRESOLVED',
        ...(p.unresolvedMapping ? { unresolvedMapping: true } : {}),
      };
      const salt = crypto.randomBytes(16).toString('hex');
      const iv = crypto.randomBytes(12).toString('hex');
      records.push({ id: await tokenId(token), salt, iv, ct: await encryptInvitation(token, salt, iv, payload) });
      index[await authIdOf(await bearerOf(token))] = { i: invitationId, g: g.guestId, p: p.invitationId, ...(p.hosts === true ? { h: 1 } : {}) };
    }
  }

  console.log('ACTIVE GUESTS                       ' + counts.activeGuests);
  console.log('INDIVIDUAL INVITATIONS CREATED      ' + counts.invitations);
  console.log('PARTIES RETAINED                    ' + counts.partiesRetained + (counts.cancelledParties ? ' (+ ' + counts.cancelledParties + ' cancelled, inactive)' : ''));
  console.log('CODES RETAINED FOR LEADS            ' + (reg.legacy ? counts.codesRetainedForLeads : 'n/a (register already per guest)'));
  if (counts.codesRetainedByRemainingGuest) console.log('CODES RETAINED · REMAINING GUEST    ' + counts.codesRetainedByRemainingGuest + ' (party lead not active)');
  console.log('NEW CODES GENERATED                 ' + counts.newCodes);
  console.log('CANCELLED GUESTS (inactive)         ' + counts.cancelledGuests);
  if (DRY) { console.log('dry run — nothing written'); return; }

  /* the old register survives beside the new one, dated, private */
  if (reg.format === 'party') {
    const stampd = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(ROOT, 'src', 'invitation-tokens.party.' + stampd + '.backup.private.csv');
    fs.copyFileSync(TOKENS, backup);
    console.log('legacy register backed up: ' + path.basename(backup) + ' (KEEP PRIVATE)');
  }
  records.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(OUT, JSON.stringify(records));
  const sortedIndex = {};
  Object.keys(index).sort().forEach((k) => { sortedIndex[k] = index[k]; });
  fs.writeFileSync(INDEX, JSON.stringify({ v: 2, entries: sortedIndex }));
  fs.writeFileSync(TOKENS, [HEADER].concat(rows).join('\n') + '\n');
  const plain = fs.readFileSync(OUT, 'utf8') + fs.readFileSync(INDEX, 'utf8');
  const leak = csvNames.filter(Boolean).filter((n) => plain.includes(n));
  const tokenLeak = Object.values(tokens).filter(Boolean).filter((t) => plain.includes(t));
  if (leak.length || tokenLeak.length) throw new Error('PLAINTEXT LEAK in output');
  console.log('invitations.enc.json: ' + records.length + ' encrypted invitations, 0 plaintext leaks');
  console.log('auth-index.json: ' + Object.keys(index).length + ' auth ids (no code, no name)');
  console.log('code register: src/invitation-tokens.private.csv (KEEP PRIVATE)');
}
main().catch((e) => { console.error(e); process.exit(1); });
