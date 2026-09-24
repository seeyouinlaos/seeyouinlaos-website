/* ============================================================================
   THE PAID EXTENSION IS WITHDRAWN (Owner, 23 September 2026).

   Guests must not be shown a cheap alternative beside the stay that was chosen
   for them. The self-service extension — one to four paid nights at a
   designated hotel after the included stay — is therefore gone from the guest
   booking engine entirely: no stock, no engine operation, no API route, no
   price rule, no control, no line, no email component, no placeholder. Extra
   nights are arranged by Guest Relations outside this engine, and the website
   names no hotel for them.

   WHAT MUST SURVIVE, and is asserted here too:
   · `riverside/superior-window` — the Riverside as a WEDDING-STAY alternative.
     It carries the word "Riverside" and is a DIFFERENT canonical product.
   · the Guest House complimentary: four places (one bedroom, Edit 7), the 30 November 2026 deadline.
   · the Souphattra, and every other stay and amount.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { page, plain, src, PEGGY } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { COMPLIMENTARY } from '../src/stay-plan.js';
import { doState } from './sandbox.mjs';

const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
/* the contract is about BEHAVIOUR: a comment that records why the feature went is allowed to name it */
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

const G = (n) => ({ invitationId: 'INV-G' + n, guestId: 'G' + n, partyId: null, hosts: false });
function req(op, body, identity) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET',
    headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : null) },
    json: async () => body || {} };
}
async function call(rooms, op, body, identity) { const r = await rooms.fetch(req(op, body, identity)); return { status: r.status, d: JSON.parse(await r.text()) }; }

test('THE ENGINE · there is no extension stock, no extend operation and no extension in the view', async () => {
  /* the stock is gone, and the WEDDING-STAY Riverside is not */
  assert.equal(SEED['stayext/riverside-superior'], undefined, 'the withdrawn extension still has stock');
  /* RIVERSIDE HOTEL VIENTIANE IS NOW COMPLETELY RETIRED (Owner, 23 Sep 2026): the wedding-stay alternative went too */
  assert.equal(SEED['riverside/superior-window'], undefined, 'the wedding-stay Riverside still has stock');
  assert.equal(Object.keys(SEED).filter((k) => /riverside/i.test(k)).length, 0, 'no Riverside product has stock');
  assert.equal(Object.keys(SEED).filter((k) => /^stayext\//.test(k)).length, 0);

  const rooms = new Rooms(doState(), {});
  const a = G(901);
  for (const op of ['extend', 'unextend']) {
    const r = await call(rooms, op, { invitationId: a.invitationId, guestId: a.guestId, nights: 2 }, a);
    assert.equal(r.status, 404, 'the engine still answers ' + op);
    assert.equal(r.d.error, 'unknown rooms operation');
  }
  /* the view says nothing about an extension any more */
  const v = await call(rooms, 'read', null, a);
  assert.equal('extension' in v.d, false);
  assert.equal('extensionAvailable' in v.d, false);
  const mine = await call(rooms, 'mine', null, a);
  assert.equal('extension' in mine.d, false);
  /* and the complimentary allocation is the seed's own: four places since Edit 7 (Owner, 24 Sep 2026) */
  assert.equal(v.d.complimentary.key, 'guesthouse/guest-house');
  assert.equal(v.d.complimentary.max, 4, 'four places, one bedroom (Edit 7)'); assert.equal(v.d.complimentary.max, SEED['guesthouse/guest-house'].capacity, 'derived from the seed');
  assert.equal(COMPLIMENTARY.deadline, '2026-11-30');
});

test('THE ONE RULE · the stay plan declares the complimentary stay alone', () => {
  const plan = code('src/stay-plan.js');
  for (const gone of ['EXTENSION', 'extensionQuote', 'extensionDates', 'NIGHT_OPTIONS', 'validNights', 'clampNights']) {
    assert.doesNotMatch(plan, new RegExp('\\b' + gone + '\\b'), 'the one rule still declares ' + gone);
  }
  assert.match(plan, /deadline: '2026-11-30'/);
  assert.match(plan, /name: 'Guest House complimentary'/);
  /* the generated browser copy follows the source */
  assert.doesNotMatch(code('assets/stay-plan.js'), /\bEXTENSION\b|extensionQuote|NIGHT_OPTIONS/);
});

test('THE WORKER · no extension write is routed and no extension component is stored', () => {
  const w = code('src/worker.js');
  assert.match(w, /const GUEST_ROOMS_WRITES = \['join', 'leave', 'wait', 'unwait'\];/);
  assert.doesNotMatch(w, /'extend'|'unextend'|out\.stayext/);
  /* the emails compose no extended stay, and add nothing to the amount */
  const m = code('src/mail-templates.js');
  /* the emails may RECOGNISE a record sent before the withdrawal, only to refuse charging for it; they may never COMPOSE one */
  assert.doesNotMatch(m, /'Extended stay'|stays\.push\(\{ name: ext/);
  assert.match(m, /const total = total0;/, 'the amount is the guest\'s own lines, with nothing added');
  /* A RECORD SENT BEFORE THE WITHDRAWAL still names the extension and its figure still includes it: such a record is
     recomputed from the lines it carries, so no guest is billed for something the website no longer offers. */
  assert.match(m, /const withdrawn = !!\(record\.rooms && record\.rooms\.stayext\);/);
  assert.match(m, /const total0 = stated == null \? null : \(\(dropped \|\| withdrawn\) \? linesTotal : stated\);/);
});

test('THE GUEST\'S SURFACES · no control, no line, no placeholder, and no hotel is named', () => {
  for (const f of ['profile.html', 'cart.html', 'review.html', 'your-journey.html']) {
    const h = code(f);
    assert.doesNotMatch(h, /Extend your stay|Select additional nights|data-ext-|NIGHT_OPTIONS|extensionLine|SIYL_BAG\.lines\(\)/, f + ' still offers the withdrawn extension');
    assert.doesNotMatch(h, /Extended stay/, f + ' still shows an Extended stay');
  }
  /* My Profile keeps the approved record: every confirmed stay, chronological, one card system, no photography */
  const prof = read('profile.html');
  assert.match(prof, /function stayLines\(\)/);
  assert.match(prof, /J\.sorted\(B\.get\(\)\.filter\(function\(x\)\{return group\(x\)==='stay'\}\)\)/, 'the stays are sorted by when they happen');
  assert.match(prof, /kicker:st\.complimentary\?'Complimentary stay':'Your stay'/);
  assert.doesNotMatch(code('profile.html'), /Riverside/, 'My Profile names no hotel for extra nights');
  /* the bag is the guest's own lines again, and the total is their sum */
  const bag = src('assets/bag.js');
  assert.match(bag, /total:function\(\)\{return this\.get\(\)\.reduce\(function\(t,x\)\{return t\+\(x\.price\|\|0\)\*x\.qty\},0\)\}/);
  assert.doesNotMatch(code('assets/bag.js'), /extensionLine|extensionCost|lines:function/);
  assert.doesNotMatch(code('assets/rooms.js'), /extend:|unextend:|extension:\s*function/);
  /* the chronology no longer reserves a place for it */
  assert.doesNotMatch(code('assets/journey.js'), /stayext/);
});

test('THE BAG AND THE TOTAL · the guest\'s own lines, summed once, with nothing derived', () => {
  const w = page({ auth: PEGGY, modules: ['assets/stay-plan.js', 'assets/bag.js'],
    seed: { 'siyl.bag': [{ id: 'sangkhathan', price: 15, qty: 1 }, { id: 'guesthouse', price: 0, qty: 1, complimentary: true }, { id: 'prewed', price: 290, qty: 1 }] } });
  const B = w.SIYL_BAG;
  /* the shape of the one guest who held paid nights on production: 15 + 0 + 290 */
  assert.equal(B.total(), 305, 'the total is the guest\'s own lines');
  assert.equal(typeof B.lines, 'undefined', 'there is no derived list any more');
  assert.equal(typeof B.extensionLine, 'undefined');
  assert.equal(typeof B.extensionCost, 'undefined');
  assert.deepEqual(plain(B.get()).map((x) => x.id), ['sangkhathan', 'guesthouse', 'prewed']);
});

test('THE RELEASE GATE holds the withdrawal, so it cannot come back unnoticed', () => {
  const g = read('src/release-check.cjs');
  assert.match(g, /the engine still carries the withdrawn extension/);
  assert.match(g, /the withdrawn extension still has stock/);
  assert.match(g, /a retired Riverside product still has stock/);
  assert.match(g, /still carries the retired Riverside Hotel/);
  assert.match(g, /still shows the retired Riverside Hotel/);
  assert.match(g, /the Worker still routes an extension write/);
  assert.match(g, /the emails still compose an extended stay/);
  assert.match(g, /still offers the withdrawn extension/);
});
