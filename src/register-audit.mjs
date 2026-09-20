/* ============================================================================
   THE REGISTER AUDIT (Owner, 15 Sep 2026 · final release) — private, deterministic.

   ONE ACTIVE GUEST = ONE GUEST ID = ONE INVITATION = ONE UNIQUE ACCESS CODE.
   Reads the private guest list, the private code register, the shipped
   encrypted bundle and the shipped auth index, and proves for every ACTIVE
   guest: the invitation exists (INV-<guestId>), exactly one code exists, the
   code opens exactly that guest's record (name, party), the code's bearer is
   in the auth index under that guest and that party, and no other guest's
   record opens with it. Cancelled / inactive guests: no code, no index entry.
   Prints counts only — never a code, never a bearer, never a hash.

     node src/register-audit.mjs [--export]     (--export writes the Owner distribution file)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lookupByToken, bearerOf, authIdOf, tokenId } from '../register/crypto.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const list = JSON.parse(rd('src/guestlist.private.json'));
const rows = rd('src/invitation-tokens.private.csv').split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], partyId: c[2], partyName: c[3], name: c[4], token: c[5], link: c[6], status: c[7] }; });
const records = JSON.parse(rd('register/invitations.enc.json'));
const index = JSON.parse(rd('register/auth-index.json'));
const ORIGIN = process.env.SIYL_ORIGIN || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';

const activeParty = (p) => (p.status || 'ACTIVE') === 'ACTIVE';
const active = [], inactive = [];
for (const p of list) for (const g of p.guests) ((activeParty(p) && (g.status || 'ACTIVE') === 'ACTIVE') ? active : inactive).push({ p, g });
const errors = [], seenTokens = new Map(), seenAuth = new Map();
let missing = 0, duplicates = 0, authErrors = 0;
const byGuest = new Map(rows.map((r) => [r.guestId, r]));
for (const { p, g } of active) {
  const r = byGuest.get(g.guestId);
  if (!r || !r.token || r.status !== 'ACTIVE') { missing++; errors.push(g.guestId + ': no active code'); continue; }
  if (r.invitationId !== 'INV-' + g.guestId) { authErrors++; errors.push(g.guestId + ': invitation id is not INV-<guestId>'); }
  if (r.partyId !== p.invitationId) { authErrors++; errors.push(g.guestId + ': party id differs from the guest list'); }
  if (seenTokens.has(r.token)) { duplicates++; errors.push(g.guestId + ': code duplicates ' + seenTokens.get(r.token)); } seenTokens.set(r.token, g.guestId);
  /* the code opens exactly this guest's record */
  const inv = await lookupByToken(r.token, records);
  if (!inv) { authErrors++; errors.push(g.guestId + ': the code opens no record'); continue; }
  if (inv.guestId !== g.guestId || inv.invitationId !== 'INV-' + g.guestId || inv.partyId !== p.invitationId) { authErrors++; errors.push(g.guestId + ': the record belongs to another guest or party'); }
  if ((inv.preferredName || '') !== (g.preferredName || '') || (inv.fullName || '') !== (g.fullName || '')) { authErrors++; errors.push(g.guestId + ': the record carries another name'); }
  if (!!inv.hosts !== !!p.hosts) { authErrors++; errors.push(g.guestId + ': the hosts flag differs'); }
  /* the bearer is in the index under this guest */
  const bearer = await bearerOf(r.token), aid = await authIdOf(bearer), e = index.entries[aid];
  if (!e) { authErrors++; errors.push(g.guestId + ': bearer not in the auth index'); continue; }
  if (e.g !== g.guestId || e.i !== 'INV-' + g.guestId || e.p !== p.invitationId || !!e.h !== !!p.hosts) { authErrors++; errors.push(g.guestId + ': the index maps the bearer to another guest / party / role'); }
  if (seenAuth.has(aid)) { duplicates++; errors.push(g.guestId + ': auth id shared with ' + seenAuth.get(aid)); } seenAuth.set(aid, g.guestId);
  /* the code opens nobody else */
  const id = await tokenId(r.token); const hits = records.filter((x) => x.id === id).length; if (hits !== 1) { authErrors++; errors.push(g.guestId + ': ' + hits + ' records answer the code'); }
}
for (const { p, g } of inactive) {
  const r = byGuest.get(g.guestId);
  if (r && r.token) { authErrors++; errors.push(g.guestId + ': a cancelled guest still has a code'); }
  if (Object.values(index.entries).some((e) => e.g === g.guestId)) { authErrors++; errors.push(g.guestId + ': a cancelled guest is in the auth index'); }
  if (records.some((x) => x.guestId === g.guestId)) { authErrors++; errors.push(g.guestId + ': a cancelled guest has a shipped record'); }
}
/* the shipped bundle and index carry exactly the active set */
if (records.length !== active.length) { authErrors++; errors.push('the encrypted bundle holds ' + records.length + ' records for ' + active.length + ' active guests'); }
if (Object.keys(index.entries).length !== active.length) { authErrors++; errors.push('the auth index holds ' + Object.keys(index.entries).length + ' entries for ' + active.length + ' active guests'); }
/* the deployed bundle and index are the committed ones */
let deployed = 'not checked';
try {
  const [a, b] = await Promise.all([fetch(ORIGIN + '/register/auth-index.json').then((r) => r.text()), fetch(ORIGIN + '/register/invitations.enc.json').then((r) => r.text())]);
  deployed = (a === rd('register/auth-index.json') && b === rd('register/invitations.enc.json')) ? 'identical to the repository' : 'DIFFERS from the repository';
  if (deployed !== 'identical to the repository') { authErrors++; errors.push('the deployed register differs from the repository'); }
} catch (e) { deployed = 'unreachable'; }

const parties = list.filter(activeParty).length;
console.log('ACTIVE GUESTS                  ' + active.length);
console.log('INDIVIDUAL INVITATIONS         ' + active.length + ' (INV-<guestId>, one per active guest)');
console.log('UNIQUE ACCESS CODES            ' + seenTokens.size);
console.log('PARTIES                        ' + parties + ' active (' + list.length + ' in the list)');
console.log('CANCELLED / INACTIVE GUESTS    ' + inactive.length + ' (no code, no index entry, no record)');
console.log('MISSING CODES                  ' + missing);
console.log('DUPLICATE CODES                ' + duplicates);
console.log('AUTH ERRORS                    ' + authErrors);
console.log('DEPLOYED REGISTER              ' + deployed + ' (' + ORIGIN + ')');
if (errors.length) console.log('ERRORS:\n- ' + errors.join('\n- '));

/* ---- the Owner distribution file: one line per guest, ready to send individually — private, gitignored ---- */
if (process.argv.includes('--export')) {
  /* the Owner's permanent person id (CONxxx) and couple id (COUPLxxx · SIGL) lead every line (20 Sep 2026), with the sending route the sheet names */
  const out = ['contactId,coupleId,guestId,fullName,preferredName,partyId,partyName,invitationId,status,sendingRoute,accessCode,personalLink'];
  const txt = ['SEE YOU IN LAOS — INVITATION CODES · one per active guest · PRIVATE · never share this file, send each guest only their own line', ''];
  const byContact = [...active].sort((x, y) => String(x.g.contactId || 'zzz').localeCompare(String(y.g.contactId || 'zzz')));
  for (const { p, g } of byContact) {
    const r = byGuest.get(g.guestId);
    out.push([g.contactId || '', g.couple || '', g.guestId, g.fullName, g.preferredName, p.invitationId, p.partyName || '', r.invitationId, 'ACTIVE', g.route || '', r.token, r.link].map((v) => '"' + String(v || '').replace(/"/g, '""') + '"').join(','));
    txt.push((g.contactId ? g.contactId + ' · ' : '') + g.fullName + ' (' + g.preferredName + ') · ' + (g.couple || 'SIGL') + ' · party ' + (p.partyName || p.invitationId) + ' · invitation ' + r.invitationId + (g.route ? ' · send via ' + g.route : ''));
    txt.push('  Your invitation code: ' + r.token);
    txt.push('  Your personal link:   ' + r.link);
    txt.push('');
  }
  for (const { p, g } of inactive) out.push([g.contactId || '', g.couple || '', g.guestId, g.fullName, g.preferredName, p.invitationId, p.partyName || '', '', 'CANCELLED', '', '', ''].map((v) => '"' + String(v || '').replace(/"/g, '""') + '"').join(','));
  fs.writeFileSync(path.join(ROOT, 'src/invitation-distribution.private.csv'), out.join('\n') + '\n');
  fs.writeFileSync(path.join(ROOT, 'src/invitation-distribution.private.txt'), txt.join('\n'));
  console.log('EXPORT                         src/invitation-distribution.private.csv + .txt (gitignored) · ' + active.length + ' guests');
}
process.exit(missing || duplicates || authErrors ? 1 : 0);
