/* ============================================================================
   FINAL AUTOMATED PRE-RELEASE RUN · F · what a CONFIRMED journey may claim.

   The release walk drives this in a real browser with two devices. This is the
   same decision, taken apart: the predicates are EXTRACTED VERBATIM from the
   shipped review.html and evaluated against every state the record can be in,
   including the two a browser walk cannot easily produce — a confirmed journey
   with no submission stamp on the record (the email backup channel), and a
   record read back older than this device's own send (an eventually consistent
   read, or a clock behind this one).

   Nothing is reimplemented here: if review.html changes, the extraction fails
   loudly rather than testing a stale copy. Needs no browser, no server and no
   guest code, so it runs anywhere.

     node docs/acceptance/2026-09-11-final-run/supersession-state-table.mjs [out.json]
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const src = fs.readFileSync(path.join(ROOT, 'review.html'), 'utf8');
const OUT = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), 'supersession-state-table.json');

const grab = (re, what) => {
  const m = src.match(re);
  if (!m) { console.error('FAIL extraction — review.html no longer contains: ' + what); process.exit(2); }
  return m[0];
};

/* the shipped decision, lifted out of paintState() */
const mineLine = grab(/var mine=.*?,held=C\.receivedAt\(\);/, 'mine / held');
const currentLine = grab(/var current=!!\(mine&&held&&snap\.at===held\);/, 'current');
const laterLine = grab(/var later=.*?,elsewhere=.*?;/, 'later / elsewhere');
const saidLine = grab(/var said=[\s\S]*?;\n/, 'said');
const recvCond = grab(/if\(sn&&sn\.invitationId===p\.invitationId&&sn\.at&&C\.receivedAt\(\)&&C\.receivedAt\(\)>sn\.at\)/, 'RECEIVED supersession test').slice(3, -1);

const decide = new Function('snap', 'p', 'C', `
  ${mineLine}
  ${currentLine}
  var later = false, elsewhere = false, said = null;
  if (!current) { ${laterLine} ${saidLine} }
  var sn = snap;
  return { current: current, later: later, elsewhere: elsewhere, said: said, receivedNotice: !!(${recvCond}) };
`);

const P = { invitationId: 'INV-002' };
const C = (receivedAt) => ({ receivedAt: () => receivedAt });
const T1 = '2026-09-13T10:00:00.000Z', T2 = '2026-09-13T11:00:00.000Z';
const snapAt = (at, inv) => ({ invitationId: inv || 'INV-002', at });

const cases = [
  ['walk 11b · this device holds the version Guest Relations holds', snapAt(T2), T2,
    { current: true, receivedNotice: false }],
  ['walk 11b · a later send from another device supersedes this one', snapAt(T1), T2,
    { current: false, later: true, elsewhere: false, said: /sent again from another device after this one/, receivedNotice: true }],
  ['walk 11 · nothing was ever sent from this device', null, T2,
    { current: false, later: false, elsewhere: true, said: /were sent from another device/, receivedNotice: false }],
  ['no stamp on the record (email backup channel), this device did send', snapAt(T1), null,
    { current: false, later: false, elsewhere: false, saidNot: /another device/, receivedNotice: false }],
  ['no stamp on the record, nothing sent from this device either', null, null,
    { current: false, later: false, elsewhere: false, saidNot: /another device/, receivedNotice: false }],
  ['the record reads OLDER than this device\'s own send', snapAt(T2), T1,
    { current: false, later: false, elsewhere: false, saidNot: /another device/, receivedNotice: false }],
  ['a snapshot left by a different invitation is not this party\'s', snapAt(T2, 'INV-009'), T2,
    { current: false, later: false, elsewhere: true, said: /were sent from another device/, receivedNotice: false }],
  ['a snapshot without a stamp cannot be the confirmed version', { invitationId: 'INV-002' }, T2,
    { current: false, later: false, elsewhere: true, said: /were sent from another device/, receivedNotice: false }],
];

const results = [];
for (const [name, snap, receivedAt, exp] of cases) {
  const r = decide(snap, P, C(receivedAt));
  const bad = [];
  for (const k of ['current', 'later', 'elsewhere', 'receivedNotice']) if (k in exp && r[k] !== exp[k]) bad.push(k + '=' + r[k] + ' want ' + exp[k]);
  if (exp.said && !exp.said.test(r.said || '')) bad.push('said ' + JSON.stringify(r.said));
  if (exp.saidNot && exp.saidNot.test(r.said || '')) bad.push('said claims a device it cannot know: ' + JSON.stringify(r.said));
  const ok = !bad.length;
  results.push({ id: name, ok, detail: ok ? (r.current ? 'the confirmed journey is painted from this device\'s snapshot' : r.said) : bad.join('; ') });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' — ' + bad.join('; ')));
}

const failed = results.filter((r) => !r.ok).length;
fs.writeFileSync(OUT, JSON.stringify({ source: 'review.html', at: new Date().toISOString(), results }, null, 1) + '\n');
console.log('\n' + (results.length - failed) + '/' + results.length + ' — ' + OUT);
process.exit(failed ? 1 : 0);
