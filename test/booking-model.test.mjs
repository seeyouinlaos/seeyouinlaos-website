/* THE BOOKING MODEL (the Owner, 20 Sep 2026 · rebuilt 21 Sep 2026 — the global My Trip rebuild, no packages).
   002_Overview defines the journey: stages by letter (A · B · C · D …), alternatives by number within a stage (A1 · A2 · A3 are
   three stays for stage A; D1 · D2 · D3 are three stays for stage D, the WEDDING EVENT accommodation). 003_Accommodation_Details
   is the product record only: a Souphattra room category labelled "C + D1" there is USABLE in C and in D1 — the label never
   composes anything. There is no package: a guest says where they join us, the graph names the stages, the guest chooses each.
   Stage D: 1 SOUPHATTRA HERITAGE (every category from The Heritage USD 145 upward; two nights, the second complimentary —
   the total is ONE nightly rate, never twice) and 2 GUEST HOUSE (USD 0,
   complimentary, both nights hosted, six shared places). D1 exhausted → the waiting list, never a silent move to D2 / D3. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, roomsFetch, doState, plain, src, PEGGY, LIN } from './sandbox.mjs';
import { Rooms, unitsOf, stageOf, STAGES } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';

const SOUPHATTRA = ['heritage', 'heritage-executive', 'heritage-grand-premier', 'noble-courtyard', 'grand-majestic', 'souphattra-majestic', 'souphattra-presidential'];
const RATES = { heritage: 145, 'heritage-executive': 155, 'heritage-grand-premier': 170, 'noble-courtyard': 240, 'grand-majestic': 250, 'souphattra-majestic': 290, 'souphattra-presidential': 750 };
const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, name: s.preferredName || '' });
const other = (n) => ({ invitationId: 'INV-X' + n, guestId: 'g-x' + n, partyId: 'INV-X' + n, hosts: false });
const call = (rooms) => async (who, op, body) => {
  const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who) }, body: JSON.stringify(body || {}) }));
  return { status: r.status, d: await r.json() };
};
const holdAs = (c) => (who, key, label, need) => c(who, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: 'X', need: need || 1 });
const wedding = (w) => { w.SIYL_GUEST.setScope({ vientianeWedding: true }); return w; };
const seg = (J, key) => J.SEGMENTS.find((s) => s.key === key);

test('A/O · the Overview\'s structure is the site\'s: a stage by letter, its alternatives by number — the same hotel in two stages (Souphattra in C and in D1) never merges those stages; nothing composes a package', () => {
  const w = page({ auth: PEGGY }); const R = w.SIYL_ROOMS, J = w.SIYL_JOURNEY;
  assert.deepEqual(plain(R.souphattra.windows.map((x) => x.id)), ['prewed', 'wedstay'], 'one product record, two stages it serves');
  assert.equal(stageOf('prewed/heritage-executive'), 'prewed'); assert.equal(stageOf('wedstay/heritage-executive'), 'wedstay');
  const keys = plain(J.SEGMENTS.map((s) => s.key));
  assert.ok(keys.includes('prewed') && keys.includes('wedstay'), 'both stages exist in the journey — separately');
  assert.equal(w.SIYL_PACKAGES, undefined, 'no package data'); for (const k of ['packages', 'packagePlan', 'packageOrder', 'planSignature', 'packageStages']) assert.equal(J[k], undefined, 'no ' + k);
  /* the Pre-Wedding Stay is its own sheet: joining the wedding alone asks for D only, never C */
  wedding(w); assert.deepEqual(plain(J.relevantSegments().map((s) => s.key)), ['wedstay'], 'Wedding only → D');
  w.SIYL_GUEST.setScope({ vientianePreWedding: true }); assert.deepEqual(plain(J.relevantSegments().map((s) => s.key)), ['prewed', 'wedstay'], 'both Vientiane sheets → C + D, no transport between them');
});

test('B/C/D · stage D, 1 SOUPHATTRA HERITAGE: every category from The Heritage upward, the default first; USD 145 total for the two wedding nights (the second complimentary) — never USD 290; the Executive USD 155, never USD 465 with C', () => {
  const w = wedding(page({ auth: PEGGY })); const P = w.SIYL_PRICE, R = w.SIYL_ROOMS;
  assert.deepEqual(plain(R.souphattra.rooms.map((r) => r.slug)), SOUPHATTRA, 'the categories in ascending order, The Heritage the default');
  for (const [slug, rate] of Object.entries(RATES)) {
    const q = P.quote('wedstay', slug);
    assert.equal(q.rate, rate, slug + ' rate'); assert.equal(q.nights, 2); assert.equal(q.pay, 1); assert.equal(q.hosted, 1);
    assert.equal(q.total, rate, slug + ': the total for two nights is one nightly rate'); assert.notEqual(q.total, rate * 2, 'never charged twice');
    assert.match(q.contribution, /second night hosted by Haruthai & Suthep/);
  }
  assert.equal(P.quote('wedstay', 'heritage').total, 145); assert.equal(P.quote('wedstay', 'heritage-executive').total, 155);
  assert.equal(P.quote('prewed', 'heritage-executive').total, 310, 'the Pre-Wedding Stay charges both nights — the rule is the wedding window\'s alone');
  assert.equal(P.quote('prewed', 'heritage-executive').total + P.quote('wedstay', 'heritage-executive').total, 465, 'C + D1 exists in arithmetic — and is composed by nobody');
  assert.equal(R.souphattra.windows.find((x) => x.id === 'wedstay').dates, '27 February – 01 March 2027');
  /* the journeys page: the order and the words */
  const jn = src('journeys.html');
  assert.ok(jn.indexOf('id="j-wedstay"') < jn.indexOf('id="j-guesthouse"'), 'Souphattra · Riverside · Guest House');
  assert.match(jn, /Second night complimentary · You pay for the first night only/); assert.match(jn, /USD 0 · Complimentary<\/p><p class="pb" data-private>Both nights hosted by Haruthai &amp; Suthep/);
});

test('E/F · 2 GUEST HOUSE: USD 0, complimentary, six shared places — one line for stage D, the previous place released, the amount the chosen alternative\'s own', async () => {
  for (const [win, slug, price] of [['guesthouse', 'guest-house', 0]]) {
    const rooms = new Rooms(doState());
    const w = wedding(page({ auth: LIN, fetch: await roomsFetch(rooms, identity(LIN)) })); await w.SIYL_UNITS.load(true);
    const J = w.SIYL_JOURNEY, ST = w.SIYL_STAY, B = w.SIYL_BAG, U = w.SIYL_UNITS, P = w.SIYL_PRICE;
    assert.deepEqual(plain(await ST.select('wedstay', 'heritage')), { ok: true, unit: 'A' });
    assert.deepEqual(plain(U.view().mine), { wedstay: { key: 'wedstay/heritage', label: 'A' } }); assert.equal(B.total(), 145);
    const sel = await ST.select(win, slug); assert.equal(sel.ok, true, win);
    const lines = B.get().filter((x) => stageOf(x.id) === 'wedstay');
    assert.equal(lines.length, 1, 'one line for stage D'); assert.equal(lines[0].id, win); assert.equal(lines[0].room, slug); assert.equal(lines[0].price, price); assert.equal(B.total(), price);
    assert.deepEqual(plain(Object.keys(U.view().mine)), ['wedstay']); assert.equal(U.view().mine.wedstay.key, win + '/' + slug, 'the Heritage place is released, the alternative held');
    assert.equal(J.state(seg(J, 'wedstay')), 'selected'); assert.deepEqual(plain(w.SIYL_GUEST.missingFor('journey')), [], 'stage D answered');
    if (win === 'guesthouse') { assert.equal(lines[0].complimentary, true); assert.equal(unitsOf('guesthouse/guest-house')[0].places, 6); }
  }
});

test('G/H · D1 full for the party → the waiting list is the guest\'s own choice, an answered stage at USD 0; D2 / D3 remain the guest\'s alternatives — nobody is moved', async () => {
  const rooms = new Rooms(doState()), c = call(rooms), hold = holdAs(c);
  let n = 0; for (const s of SOUPHATTRA) for (const u of unitsOf('wedstay/' + s)) for (let i = 0; i < u.places; i++) assert.equal((await hold(other(++n), 'wedstay/' + s, u.label, 1)).status, 200);
  const w = wedding(page({ auth: PEGGY, fetch: await roomsFetch(rooms, identity(PEGGY)) })); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, U = w.SIYL_UNITS, G = w.SIYL_GUEST, B = w.SIYL_BAG;
  for (const s of SOUPHATTRA) assert.equal(U.soldOut('wedstay', s), true, s + ' sold out');
  assert.equal(J.state(seg(J, 'wedstay')), 'open'); assert.ok(G.missingFor('journey').some((m) => m.key === 'stage:wedstay'), 'D is still a question');
  const wr = await U.wait('wedstay', J.partySize(), SOUPHATTRA.map((s) => 'wedstay/' + s)); assert.equal(wr.ok, true); assert.equal(U.waitlisted('wedstay').position, 1);
  assert.equal(J.state(seg(J, 'wedstay')), 'waitlisted'); assert.ok(!G.missingFor('journey').some((m) => m.key === 'stage:wedstay'), 'the waiting list answers the stage');
  assert.equal(B.total(), 0); assert.deepEqual(plain(U.view().mine), {}, 'nothing held — the line, not a room');
  assert.equal(U.units('guesthouse', 'guest-house')[0].free, 6, 'D2: six places, untouched'); /* THE RIVERSIDE IS RETIRED (Owner, 23 Sep 2026): stage D is the Souphattra and the Guest House, and the retired house has no stock at all */
  assert.deepEqual(unitsOf('riverside/superior-window'), [], 'the retired Riverside has no units');
});

test('M/N · A1 / A2 / A3 are alternatives within stage A, D1 / D2 / D3 alternatives within stage D — one stage each in the journey, one hold per stage, never three stages', () => {
  const w = page({ auth: PEGGY }); const J = w.SIYL_JOURNEY;
  const A = ['bkk-stay/penthouse', 'bkk-stay/u-sathorn-superior-garden', 'bkk-stay/shama-king-studio-balcony'];
  const D = ['wedstay/heritage', 'guesthouse/guest-house'];
  for (const k of A) { assert.ok(SEED[k], k); assert.equal(stageOf(k), 'bkk-stay', k + ' is an alternative of stage A'); }
  for (const k of D) { assert.ok(SEED[k], k); assert.equal(stageOf(k), 'wedstay', k + ' is an alternative of stage D'); }
  const keys = plain(J.SEGMENTS.map((s) => s.key));
  assert.equal(keys.filter((k) => k === 'bkk-stay').length, 1); assert.equal(keys.filter((k) => k === 'wedstay').length, 1);
  assert.ok(!keys.some((k) => /riverside|guesthouse|u-sathorn|shama/.test(k)), 'no alternative is a stage of its own');
  assert.equal(STAGES.filter((s) => /riverside|guesthouse/.test(s)).length, 0);
  assert.deepEqual(plain(seg(J, 'wedstay').ids), ['wedstay', 'guesthouse'], 'stage D in the Owner\'s order: Souphattra · Guest House');
});
