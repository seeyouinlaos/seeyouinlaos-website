/* THE BOOKING MODEL (the Owner's correction, 20 Sep 2026) — the data model itself, so the C + D1 mistake cannot return.
   002_Overview defines the journey: stages by letter (A · B · C · D …), alternatives by number within a stage (A1 · A2 · A3 are
   three stays for stage A; D1 · D2 · D3 are three stays for stage D, the WEDDING EVENT accommodation). 003_Accommodation_Details
   is the product record only: a Souphattra room category labelled "C + D1" there is USABLE in C and in D1 — the label never
   composes a package. The Essential trip covers stage D alone, D1 preselected (the Souphattra Heritage, the Heritage
   Executive); D2 / D3 are the guest's own alternatives; D1 exhausted → the waiting list, never a silent move to D2 / D3.
   Tests A – O as the Owner listed them. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, roomsFetch, doState, session, plain, PEGGY, LIN } from './sandbox.mjs';
import { Rooms, unitsOf, stageOf, STAGES } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';

const SOUPHATTRA = ['heritage-executive', 'heritage', 'heritage-grand-premier', 'noble-courtyard', 'grand-majestic', 'souphattra-majestic', 'souphattra-presidential'];
const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, name: s.preferredName || '' });
const other = (n) => ({ invitationId: 'INV-X' + n, guestId: 'g-x' + n, partyId: 'INV-X' + n, hosts: false });
const call = (rooms) => async (who, op, body) => {
  const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who) }, body: JSON.stringify(body || {}) }));
  return { status: r.status, d: await r.json() };
};
const holdAs = (c) => (who, key, label, need) => c(who, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: 'X', need: need || 1 });
/* one stranger in every place but one of every unit of a category: no party of two fits, a party of one fits everywhere */
const leaveOnePlace = async (hold, key, from) => { let n = from; for (const u of unitsOf(key)) for (let i = 0; i < u.places - 1; i++) { const r = await hold(other(++n), key, u.label, 1); assert.equal(r.status, 200, key + ' ' + u.label); } return n; };
const vientiane = (w) => { w.SIYL_GUEST.setScope({ vientiane: true }); return w; };

test('A/O · the Overview\'s structure is the site\'s: a stage by letter, its alternatives by number — the same hotel in two stages (Souphattra in C and in D1) never merges those stages, and a product usable in several stages never composes a package', () => {
  const w = page({ auth: PEGGY }); const R = w.SIYL_ROOMS, J = w.SIYL_JOURNEY, PK = w.SIYL_PACKAGES;
  /* the Souphattra Heritage is ONE hotel record with TWO windows — usable in stage C (the Pre-Wedding Stay) and in stage D (D1, the Wedding Stay); the Accommodation Details' "C + D1" label means exactly this */
  assert.deepEqual(plain(R.souphattra.windows.map((x) => x.id)), ['prewed', 'wedstay'], 'one product record, two stages it serves');
  assert.equal(stageOf('prewed/heritage-executive'), 'prewed'); assert.equal(stageOf('wedstay/heritage-executive'), 'wedstay');
  assert.notEqual(stageOf('prewed/heritage-executive'), stageOf('wedstay/heritage-executive'), 'C and D1 are two stages of the journey, never one');
  const keys = plain(J.SEGMENTS.map((s) => s.key));
  assert.ok(keys.includes('prewed') && keys.includes('wedstay'), 'both stages exist in the journey — separately');
  /* no package is composed by "the stages a product can serve" */
  for (const pk of Object.values(PK)) for (const [stage, chain] of Object.entries(pk.stages)) if (Array.isArray(chain)) for (const k of chain) assert.equal(stageOf(k), stage, pk.key + ': ' + k + ' answers its own stage only');
  assert.deepEqual(plain(Object.keys(PK.essential.stages)), ['wedstay'], 'the Essential trip is not "every stage the Heritage Executive can serve"');
  /* the same hotel appears in two package stages of the Complete trip without merging them: two rows, two stages, two prices */
  vientiane(w); const cp = J.packagePlan('complete');
  const rows = cp.rows.filter((r) => /^(prewed|wedstay)$/.test(r.seg.key));
  assert.equal(rows.length, 2); assert.deepEqual(plain(rows.map((r) => r.seg.key)), ['prewed', 'wedstay']); assert.notEqual(rows[0].amount, rows[1].amount, 'each stage prices its own nights');
});

test('B/K/L · the Heritage Executive is tagged for C and for D1 — that never implies Essential = C + D1: Essential adds nothing of C, and its total is the wedding stay\'s USD 155, never USD 465', () => {
  const w = vientiane(page({ auth: PEGGY })); const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, B = w.SIYL_BAG;
  const both = ['prewed', 'wedstay'].map((win) => P.items(win, 'heritage-executive')[0]);
  assert.ok(both.every((it) => it && it.room === 'heritage-executive'), 'the same product in both stages');
  assert.equal(both[0].price + both[1].price, 465, 'the C + D1 sum exists in arithmetic — and nowhere in the Essential trip');
  const plan = J.packagePlan('essential');
  assert.deepEqual(plain(plan.rows.map((r) => r.seg.key)), ['wedstay'], 'D only');
  assert.equal(plan.total, 155); assert.notEqual(plan.total, 465);
  assert.deepEqual(plain(plan.add.map((x) => x.id)), ['wedstay']); assert.ok(!plan.add.some((x) => x.id === 'prewed'), 'C is not auto-added');
  assert.equal(J.packageStages('essential').length, 1);
  assert.doesNotMatch(J.planSignature(plan), /prewed/);
  /* a pre-wedding stay the guest chose by hand (stage C) is neither replaced nor removed nor counted by Essential */
  P.items('prewed', 'heritage').forEach((it) => B.put(it));
  const again = J.packagePlan('essential');
  assert.deepEqual(plain(again.remove), []); assert.equal(again.total, 155); assert.equal(again.counts.stages, 1); assert.equal(again.rows[0].seg.key, 'wedstay');
});

test('C/D · the Essential default is D1 → the Souphattra Heritage → the Heritage Executive, for the Wedding Stay 27 February – 01 March 2027 — one payable night, the second hosted; the initial relevant accommodation is D only', () => {
  const w = vientiane(page({ auth: PEGGY })); const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, PK = w.SIYL_PACKAGES, R = w.SIYL_ROOMS;
  assert.equal(PK.essential.stages.wedstay[0], 'wedstay/heritage-executive');
  assert.deepEqual(plain(PK.essential.stages.wedstay), SOUPHATTRA.map((s) => 'wedstay/' + s), 'the house in the hotel\'s order — the Souphattra only');
  const plan = J.packagePlan('essential'); const [row] = plan.rows;
  assert.equal(plan.rows.length, 1); assert.equal(row.seg.key, 'wedstay'); assert.equal(row.why, 'default'); assert.equal(row.key, 'wedstay/heritage-executive');
  const it = row.items[0]; assert.equal(it.stay, 'souphattra'); assert.equal(it.room, 'heritage-executive'); assert.equal(it.nights, 2); assert.equal(it.pay, 1); assert.equal(it.price, 155);
  assert.equal(R.souphattra.windows.find((x) => x.id === 'wedstay').dates, '27 February – 01 March 2027');
  assert.match(P.quote('wedstay', 'heritage-executive').contribution, /second night hosted by Haruthai & Suthep/);
  assert.equal(row.seg.when, '27 FEB – 01 MAR');
  assert.deepEqual(plain(PK.essential.alternatives && Object.keys(PK.essential.alternatives)), ['wedstay'], 'the guest\'s alternatives (D2 · D3) are named for the covered stage');
  assert.match(PK.essential.alternatives.wedstay.words, /Guest House complimentary/); assert.match(PK.essential.alternatives.wedstay.words, /Riverside Hotel/);
});

test('E/F · an Essential guest changes the Wedding Stay to D2 (the Guest House complimentary) or to D3 (the Riverside Hotel): one line for stage D, the package\'s room released, the amount the chosen alternative\'s own', async () => {
  for (const [win, slug, price] of [['guesthouse', 'guest-house', 0], ['riverside', 'superior-window', 60]]) {
    const rooms = new Rooms(doState());
    const w = vientiane(page({ auth: LIN, fetch: await roomsFetch(rooms, identity(LIN)) })); await w.SIYL_UNITS.load(true);
    const J = w.SIYL_JOURNEY, ST = w.SIYL_STAY, B = w.SIYL_BAG, U = w.SIYL_UNITS;
    const plan = J.packagePlan('essential');
    assert.deepEqual(plain(await ST.select('wedstay', 'heritage-executive', plan.rows[0].unit, plan.need)), { ok: true, unit: 'A' });
    assert.deepEqual(plain(U.view().mine), { wedstay: { key: 'wedstay/heritage-executive', label: 'A' } });
    /* the guest's own choice of another D alternative */
    const sel = await ST.select(win, slug, undefined, plan.need); assert.equal(sel.ok, true, win);
    const lines = B.get().filter((x) => stageOf(x.id) === 'wedstay');
    assert.equal(lines.length, 1, 'one line for stage D'); assert.equal(lines[0].id, win); assert.equal(lines[0].room, slug); assert.equal(lines[0].price, price);
    assert.deepEqual(plain(Object.keys(U.view().mine)), ['wedstay']); assert.equal(U.view().mine.wedstay.key, win + '/' + slug, 'the Executive place is released, the alternative held');
    assert.equal(J.state(J.SEGMENTS.find((s) => s.key === 'wedstay')), 'selected');
    /* Essential computed again names what it would replace — nothing is applied by looking */
    const p2 = J.packagePlan('essential'); assert.equal(p2.rows[0].replaces && p2.rows[0].replaces.id, win); assert.equal(B.get()[0].id, win);
  }
});

test('G/H · D1 internal fallback: the Heritage Executive full for the party → the next Souphattra category; every Souphattra category full → D1 WAITLISTED — the guest is never moved to D2 or D3 by the package', async () => {
  const rooms = new Rooms(doState()), c = call(rooms), hold = holdAs(c);
  const w = vientiane(page({ auth: PEGGY, fetch: await roomsFetch(rooms, identity(PEGGY)) })); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, U = w.SIYL_UNITS;
  assert.equal(J.partySize(), 2);
  let n = await leaveOnePlace(hold, 'wedstay/heritage-executive', 0); await U.load(true);
  let plan = J.packagePlan('essential'); let row = plan.rows[0];
  assert.deepEqual(plain([row.why, row.wanted, row.key, row.amount, row.tried]), ['fallback', 'wedstay/heritage-executive', 'wedstay/heritage', 145, ['wedstay/heritage-executive', 'wedstay/heritage']]);
  for (const s of SOUPHATTRA.slice(1)) n = await leaveOnePlace(hold, 'wedstay/' + s, n);
  await U.load(true);
  plan = J.packagePlan('essential'); row = plan.rows[0];
  assert.equal(row.why, 'waitlist'); assert.equal(row.key, null); assert.deepEqual(plain(row.tried), SOUPHATTRA.map((s) => 'wedstay/' + s));
  assert.ok(!row.tried.some((k) => /riverside|guesthouse/.test(k)), 'D2 and D3 were never tried');
  assert.equal(U.unitForParty('guesthouse', 'guest-house', 2).label, 'A', 'the Guest House could take the party — and the package still does not move the guest there');
  assert.equal(U.unitForParty('riverside', 'superior-window', 2).label, 'A', 'the Riverside could too');
  assert.deepEqual(plain(plan.waitlist), ['wedstay']); assert.equal(plan.total, 0);
  const wr = await U.wait('wedstay', plan.need, row.tried); assert.equal(wr.ok, true); assert.equal(U.waitlisted('wedstay').position, 1);
  assert.deepEqual(plain(U.view().mine), {}, 'nothing held — the line, not a room');
});

test('I/J · D2 and D3 availability and capacity are independent of D1: with every Souphattra category full, the Guest House keeps its six places and the Riverside its rooms; a guest chooses either by hand', async () => {
  const rooms = new Rooms(doState()), c = call(rooms), hold = holdAs(c);
  let n = 0; for (const s of SOUPHATTRA) for (const u of unitsOf('wedstay/' + s)) for (let i = 0; i < u.places; i++) assert.equal((await hold(other(++n), 'wedstay/' + s, u.label, 1)).status, 200);
  const w = vientiane(page({ auth: LIN, fetch: await roomsFetch(rooms, identity(LIN)) })); await w.SIYL_UNITS.load(true);
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, J = w.SIYL_JOURNEY;
  for (const s of SOUPHATTRA) assert.equal(U.soldOut('wedstay', s), true, s + ' sold out');
  assert.equal(U.units('guesthouse', 'guest-house')[0].free, 6, 'D2: six places, untouched'); assert.equal(U.units('guesthouse', 'guest-house')[0].places, 6);
  assert.equal(U.summary('riverside', 'superior-window').remainingPlaces, unitsOf('riverside/superior-window').reduce((a, u) => a + u.places, 0), 'D3: every place free');
  assert.equal(J.packagePlan('essential').rows[0].why, 'waitlist', 'D1 waits — D2 / D3 are the guest\'s to choose');
  assert.equal((await ST.select('guesthouse', 'guest-house', undefined, 1)).ok, true); assert.equal(U.units('guesthouse', 'guest-house')[0].free, 5);
  assert.equal((await ST.select('riverside', 'superior-window', undefined, 1)).ok, true); assert.equal(U.units('guesthouse', 'guest-house')[0].free, 6, 'one selection per stage: the Guest House place is given back');
  assert.equal(U.view().mine.wedstay.key, 'riverside/superior-window');
});

test('M/N · A1 / A2 / A3 are alternatives within stage A, D1 / D2 / D3 alternatives within stage D — one stage each in the journey, one hold per stage, never three stages', () => {
  const w = page({ auth: PEGGY }); const J = w.SIYL_JOURNEY, PK = w.SIYL_PACKAGES;
  const A = ['bkk-stay/penthouse', 'bkk-stay/u-sathorn-superior-garden', 'bkk-stay/shama-king-studio-balcony'];
  const D = ['wedstay/heritage-executive', 'riverside/superior-window', 'guesthouse/guest-house'];
  for (const k of A) { assert.ok(SEED[k], k); assert.equal(stageOf(k), 'bkk-stay', k + ' is an alternative of stage A'); }
  for (const k of D) { assert.ok(SEED[k], k); assert.equal(stageOf(k), 'wedstay', k + ' is an alternative of stage D'); }
  const keys = plain(J.SEGMENTS.map((s) => s.key));
  assert.equal(keys.filter((k) => k === 'bkk-stay').length, 1); assert.equal(keys.filter((k) => k === 'wedstay').length, 1);
  assert.ok(!keys.some((k) => /riverside|guesthouse|u-sathorn|shama/.test(k)), 'no alternative is a stage of its own');
  assert.equal(STAGES.filter((s) => /riverside|guesthouse/.test(s)).length, 0);
  /* the Complete trip's chains: stage A's three alternatives in one chain, stage D's three houses in one chain */
  assert.deepEqual(plain(PK.complete.stages['bkk-stay']), A);
  assert.deepEqual(plain(PK.complete.stages.wedstay.slice(-2)), ['riverside/superior-window', 'guesthouse/guest-house']);
  assert.ok(PK.complete.stages.wedstay.every((k) => stageOf(k) === 'wedstay'));
  /* the Essential trip's D chain names only D1's categories; D2 / D3 are the guest's, named as alternatives */
  assert.ok(PK.essential.stages.wedstay.every((k) => k.startsWith('wedstay/')));
});
