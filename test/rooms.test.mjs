/* ============================================================================
   ROOMS — the occupancy engine (Owner decision, 14 Sep 2026 · the canonical
   booking model, 19 Sep 2026).

   Every room unit has two guest places · a category of N rooms is N persistent
   units · the Guest House complimentary is ONE property of SIX shared places ·
   a guest holds one place per stage · join is atomic, a change holds the new
   place before the old one goes · a full room is full · a unit takes the whole
   party or none of it · NOTHING is reserved for anyone in advance — the hosts
   start at zero and book like every guest · first names are shown to
   authenticated guests · the waiting list is the engine's own line per stage,
   positioned by time · migration, assignment and the clean reset are Guest
   Relations acts.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, unitsOf, unitOf, allUnits, mayJoin, stageOf, STAGES, PLACES } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { doState } from './sandbox.mjs';

const HAR = { invitationId: 'INV-G048', guestId: 'G048', partyId: 'INV-001', hosts: true };
const SUT = { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', hosts: true };
const PEG = { invitationId: 'INV-G001', guestId: 'G001', partyId: 'INV-002', hosts: false };
const STE = { invitationId: 'INV-G002', guestId: 'G002', partyId: 'INV-002', hosts: false };
const LIN = { invitationId: 'INV-G003', guestId: 'G003', partyId: 'INV-003', hosts: false };

function req(op, body, identity, gr) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET',
    headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : k === 'x-gr-verified' ? (gr ? 'yes' : null) : null) },
    json: async () => body || {} };
}
async function call(rooms, op, body, identity, gr) { const r = await rooms.fetch(req(op, body, identity, gr)); return { status: r.status, d: JSON.parse(await r.text()) }; }
const unit = (d, key, label) => d.units[key].find((u) => u.label === label);
/* the waiting list, as a guest takes and leaves it */
const wait = (rooms, who, stage, size, wanted, name) => call(rooms, 'wait', { invitationId: who.invitationId, guestId: who.guestId, stage, size, wanted, name }, who);
const unwait = (rooms, who, stage) => call(rooms, 'unwait', { invitationId: who.invitationId, guestId: who.guestId, stage }, who);
const tick = () => new Promise((r) => setTimeout(r, 3));   /* the line is positioned by time: a later entry is later */

test('ROOMS · 1 room = 2 places; 5 rooms = 10 places; units are persistent labels A, B, C …; the Guest House complimentary is ONE property of SIX shared places (Owner, 19 Sep 2026)', () => {
  assert.equal(PLACES, 2);
  const five = unitsOf('wedstay/heritage');
  assert.deepEqual(five.map((u) => u.label), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(five.reduce((n, u) => n + u.places, 0), 10);
  assert.deepEqual(unitsOf('wedstay/heritage'), five, 'the same identities on every derivation');
  const one = unitsOf('prewed/souphattra-presidential');
  assert.equal(one.length, 1); assert.equal(one[0].places, 2, 'the Presidential is one room of two guest places');
  /* U Sathorn Bangkok (the Master, 16 Sep 2026): six rooms, Room A – F, twelve places */
  assert.deepEqual(unitsOf('bkk-stay/u-sathorn-superior-garden').map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(unitsOf('bkk-stay/u-sathorn-superior-garden').reduce((n, u) => n + u.places, 0), 12);
  /* SATHORN PENTHOUSE BANGKOK IS DELETED (Owner, 24 Sep 2026 · Edit 6): no stock, no units */
  assert.equal(SEED['bkk-stay/penthouse'], undefined, 'the Sathorn Penthouse is not a product'); assert.deepEqual(unitsOf('bkk-stay/penthouse'), []);
  assert.deepEqual(Object.keys(SEED).filter((k) => k.startsWith('bkk-stay/')), ['bkk-stay/u-sathorn-superior-garden'], 'one Bangkok address (Shama Yen-Akat deleted, 24 Sep 2026)'); assert.equal(SEED['bkk-stay/shama-king-studio-balcony'], undefined); assert.deepEqual(unitsOf('bkk-stay/shama-king-studio-balcony'), [], 'the deleted Shama has no units');
  /* D2 · GUEST HOUSE COMPLIMENTARY (Owner, 19 Sep 2026): one shared house = one unit A of kind property with SIX places — never "Private Residence", never "up to 4" */
  const house = unitsOf('guesthouse/guest-house');
  assert.equal(house.length, 1);
  assert.deepEqual(house[0], { key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null });
  assert.equal(SEED['guesthouse/guest-house'].unit, 'guest'); assert.equal(SEED['guesthouse/guest-house'].capacity, 6);
  assert.equal(SEED['airbnb-2br/private-residence'], undefined, 'the invented "Private Residence" key no longer exists'); assert.deepEqual(unitsOf('airbnb-2br/private-residence'), []);
  assert.equal(unitsOf('kmg/light-french')[0].places, 2, 'the Light French Suite sleeps two adults (Accommodation_Details Pax)');
  /* the current Operations Master (19 Sep 2026): Lijiang six rooms per category, Kempinski six */
  for (const key of Object.keys(SEED).filter((k) => k.startsWith('ljg/'))) assert.equal(unitsOf(key).length, 6, key + ' is six rooms');
  assert.equal(unitsOf('kempinski/deluxe-balcony-king').length, 6);
  assert.equal(allUnits().length, Object.keys(SEED).reduce((n, k) => n + (SEED[k].unit === 'guest' ? 1 : SEED[k].capacity), 0));
});

test('ROOMS · nothing is reserved (Owner, 19 Sep 2026): no unit is anyone\'s in advance, mayJoin asks only for an identity, the hosts are ordinary guests, every room of every stay is open to every authenticated guest; nobody without an identity', () => {
  assert.deepEqual(FIXED, [], 'no fixed allocation exists — an empty export');
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.equal(s.heldFor, undefined, key + ' is held for nobody'); }
  assert.ok(allUnits().every((u) => u.reservedFor === null), 'every unit of every category is open');
  /* the Presidential: no Bride & Groom reservation — a guest, a host, anyone with an identity */
  const pres = unitsOf('wedstay/souphattra-presidential')[0];
  assert.equal(pres.reservedFor, null);
  assert.equal(mayJoin(pres, HAR).ok, true); assert.equal(mayJoin(pres, SUT).ok, true); assert.equal(mayJoin(pres, PEG).ok, true, 'the Presidential is open to Peggy'); assert.equal(mayJoin(pres, LIN).ok, true);
  assert.deepEqual(mayJoin(pres, null), { ok: false, error: 'unauthorised' }, 'nobody without an identity');
  assert.deepEqual(mayJoin(null, PEG), { ok: false, error: 'unknown room' });
  assert.deepEqual(mayJoin(pres, { guestId: 'G999' }), { ok: true }, 'an identity is all a unit asks for — no hosts flag, no party');
  const fam = unitsOf('wedstay/grand-majestic');
  assert.deepEqual(fam.map((u) => u.reservedFor), [null, null]); assert.equal(mayJoin(fam[0], HAR).ok, true); assert.equal(mayJoin(fam[0], LIN).ok, true);
  assert.equal(mayJoin(unitsOf('wedstay/heritage')[0], LIN).ok, true);
  /* U Sathorn: six rooms A – F, every one open to every guest — the hosts included, first come first served; never a Room G */
  const usat = unitsOf('bkk-stay/u-sathorn-superior-garden');
  assert.deepEqual(usat.map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']); assert.deepEqual(usat.map((u) => u.reservedFor), [null, null, null, null, null, null]);
  assert.equal(mayJoin(usat[0], PEG).ok, true, 'Room A is nobody\'s before it is booked'); assert.equal(mayJoin(usat[0], HAR).ok, true); assert.equal(mayJoin(usat[1], PEG).ok, true);
  assert.equal(unitOf('bkk-stay/u-sathorn-superior-garden', 'G'), null, 'there is no Room G'); assert.equal(unitOf('bkk-stay/penthouse', 'A'), null, 'the deleted Penthouse has no Room A');
  /* Kunming: the Solarium and Lijiang: the 270° View Suite are open to everyone (Owner, Edit 5 · 18 Sep 2026) */
  assert.equal(unitsOf('kmg/solarium')[0].reservedFor, null); assert.equal(unitsOf('kmg/standard-single')[0].reservedFor, null);
  assert.deepEqual(unitsOf('ljg/view-suite-270').map((u) => u.reservedFor), [null, null, null, null, null, null]);
  /* the stages of the journey: the Guest House is the wedding stage, as the hotel is (the Riverside was retired 23 Sep 2026) */
  assert.deepEqual(STAGES, ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']);
  assert.equal(stageOf('guesthouse/guest-house'), 'wedstay', 'the Guest House is the wedding stage'); assert.equal(stageOf('wedstay/heritage'), 'wedstay');
  assert.equal(stageOf('bkk-stay/u-sathorn-superior-garden'), 'bkk-stay'); assert.equal(stageOf('prewed/heritage'), 'prewed');
});

test('ROOMS · guest 1 joins A → 1/2; guest 2 joins A → 2/2 with both first names; guest 3 cannot; no `fixed` map anywhere; a unit takes the whole party or none of it (Owner, 19 Sep 2026)', async () => {
  const rooms = new Rooms(doState()), key = 'wedstay/souphattra-presidential';
  let r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key, label: 'A', name: 'Haruthai' }, HAR);
  assert.equal(r.status, 200); assert.equal(unit(r.d, key, 'A').taken, 1); assert.equal(unit(r.d, key, 'A').free, 1);
  assert.deepEqual(r.d.mine, { wedstay: { key, label: 'A' } }, 'mine = the places she chose — a host starts at zero and books like every guest');
  assert.equal(r.d.fixed, undefined, 'no fixed arrangement exists (Owner, 19 Sep 2026)'); assert.equal('fixed' in r.d, false);
  assert.deepEqual(Object.keys(r.d).sort(), ['complimentary', 'joined', 'mine', 'ok', 'places', 'summary', 'units', 'waiting', 'waitlist'], 'the view: units, summary, mine, waitlist, waiting, places, the complimentary allocation and the guest\'s own extension (22 Sep 2026) — and the place just joined');
  r = await call(rooms, 'read', null, SUT);
  const seen = unit(r.d, key, 'A');
  assert.deepEqual(seen.occupants.map((o) => [o.name, o.mine, o.party]), [['Haruthai', false, true]], 'Suthep sees Haruthai in Room A, as his party');
  assert.equal(r.d.fixed, undefined); assert.deepEqual(r.d.mine, {}, 'nothing is his before he books');
  r = await call(rooms, 'join', { invitationId: SUT.invitationId, guestId: SUT.guestId, key, label: 'A', name: 'Suthep' }, SUT);
  assert.equal(r.status, 200); assert.equal(unit(r.d, key, 'A').full, true);
  assert.deepEqual(unit(r.d, key, 'A').occupants.map((o) => o.name).sort(), ['Haruthai', 'Suthep']);
  r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/heritage', label: 'A', name: 'Lin' }, LIN);
  assert.equal(r.status, 200);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200);
  r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'Steffie' }, STE);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full', 'guest 3 cannot join a full room');
  assert.equal(r.d.mine.wedstay, undefined, 'and holds nothing');
  /* PARTY CAPACITY (Owner, 19 Sep 2026): `need` = the party's places; a unit takes them all or none — nobody is partially booked */
  r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'B', name: 'Steffie', need: 2 }, STE);
  assert.equal(r.status, 200, 'an empty room of two takes a party of two'); assert.deepEqual(r.d.mine.wedstay, { key: 'wedstay/heritage', label: 'B' });
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'B', name: 'Peggy', need: 2 }, PEG);
  assert.equal(r.status, 200, 'her own party member already there counts for her'); assert.equal(unit(r.d, 'wedstay/heritage', 'B').full, true);
  assert.deepEqual(unit(r.d, 'wedstay/heritage', 'B').occupants.map((o) => [o.name, o.party]).sort(), [['Peggy', true], ['Steffie', true]]);
  assert.equal(unit(r.d, 'wedstay/heritage', 'A').taken, 1, 'one place per stage: Peggy left Room A to Lin');
  r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'Steffie', need: 2 }, STE);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party', 'one stranger in a room of two leaves no room for a party of two'); assert.equal(r.d.need, 2); assert.equal(r.d.free, 1);
  assert.deepEqual(r.d.mine.wedstay, { key: 'wedstay/heritage', label: 'B' }, 'a refused change leaves her where she was'); assert.equal(unit(r.d, 'wedstay/heritage', 'A').taken, 1);
  r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/heritage', label: 'C', name: 'Lin', need: 3 }, LIN);
  assert.equal(r.status, 200, 'a party of three is larger than a room: it fills Room C and keeps its third place in the next room (release 014)');
  assert.deepEqual(r.d.mine.wedstay, { key: 'wedstay/heritage', label: 'C' }); assert.equal(unit(r.d, 'wedstay/heritage', 'C').taken, 2); assert.ok(unit(r.d, 'wedstay/heritage', 'A').occupants.every((o) => o.placeholder && o.name === 'Your party'), 'her own place in A is gone; what stands in A is a place kept for her party');
  assert.equal(r.d.units['wedstay/heritage'].filter((u) => u.occupants.some((o) => o.placeholder)).length, 2, 'two rooms carry places kept for her party');
  assert.equal((await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/heritage', label: 'A', name: 'Lin', need: 3 }, LIN)).status, 200, 'she may move again');
  r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/souphattra-majestic', label: 'A', name: 'Lin', need: 3 }, LIN);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party'); assert.equal(r.d.need, 3, 'one room of two places cannot take three at all');
  /* the Guest House takes a party among its six shared places — the same wedding stage, so the hotel place goes */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'guesthouse/guest-house', label: 'A', name: 'Peggy', need: 2 }, PEG);
  assert.equal(r.status, 200); assert.equal(unit(r.d, 'guesthouse/guest-house', 'A').taken, 2, 'her place and the place kept for her party member'); assert.equal(unit(r.d, 'guesthouse/guest-house', 'A').free, 4);
  assert.deepEqual(unit(r.d, 'guesthouse/guest-house', 'A').occupants.map((o) => o.name), ['Peggy', 'Your party']);
  assert.deepEqual(r.d.mine.wedstay, { key: 'guesthouse/guest-house', label: 'A' }); assert.equal(unit(r.d, 'wedstay/heritage', 'B').taken, 1, 'Steffie stays in Room B');
});

test('ROOMS · a change holds the new place first and releases the old one only then; a full target leaves the old room', async () => {
  const rooms = new Rooms(doState());
  await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }, PEG);
  let r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'B', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200);
  assert.equal(unit(r.d, 'wedstay/heritage', 'A').taken, 0, 'the old place is released');
  assert.equal(unit(r.d, 'wedstay/heritage', 'B').taken, 1);
  /* change category inside the same stage: one place per stage, never two */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage-executive', label: 'C', name: 'Peggy' }, PEG);
  assert.equal(unit(r.d, 'wedstay/heritage', 'B').taken, 0);
  assert.deepEqual(r.d.mine.wedstay, { key: 'wedstay/heritage-executive', label: 'C' });
  /* the Guest House complimentary is the same stage as the hotel (Owner, 19 Sep 2026) */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'guesthouse/guest-house', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200); assert.equal(unit(r.d, 'wedstay/heritage-executive', 'C').taken, 0); assert.equal(unit(r.d, 'guesthouse/guest-house', 'A').taken, 1);
  assert.deepEqual(r.d.mine.wedstay, { key: 'guesthouse/guest-house', label: 'A' });
  /* THE RIVERSIDE IS RETIRED (Owner, 23 Sep 2026): it has no stock, so it cannot be joined and the guest keeps the house they have */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'riverside/superior-window', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 404, 'the retired Riverside cannot be booked');
  const stillHouse = await call(rooms, 'read', null, PEG);
  assert.deepEqual(stillHouse.d.mine.wedstay, { key: 'guesthouse/guest-house', label: 'A' }, 'the refusal left the guest\'s stay exactly as it was');
  /* a different stage is independent */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'prewed/heritage', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(Object.keys(r.d.mine).sort().join(','), 'prewed,wedstay');
  /* fill a room, then try to change into it: refused, the old room remains */
  await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'prewed/heritage', label: 'B', name: 'Lin' }, LIN);
  await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'prewed/heritage', label: 'B', name: 'Steffie' }, STE);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'prewed/heritage', label: 'B', name: 'Peggy' }, PEG);
  assert.equal(r.status, 409);
  assert.deepEqual(r.d.mine.prewed, { key: 'prewed/heritage', label: 'A' }, 'Peggy keeps Room A');
  /* leave releases exactly the stage */
  r = await call(rooms, 'leave', { invitationId: PEG.invitationId, guestId: PEG.guestId, stage: 'prewed' }, PEG);
  assert.equal(r.d.mine.prewed, undefined); assert.ok(r.d.mine.wedstay);
});

test('ROOMS · a write is the identity\'s own: another guest, another invitation, no identity — refused; every room is open to every identity, the hosts included (Owner, 19 Sep 2026)', async () => {
  const rooms = new Rooms(doState());
  let r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403, 'Peggy cannot book Steffie a room');
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, null);
  assert.equal(r.status, 401);
  /* the Presidential is open to anyone now — no Bride & Groom reservation (Owner, 19 Sep 2026) */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/souphattra-presidential', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200, 'Peggy takes a place in the Presidential'); assert.deepEqual(r.d.mine.wedstay, { key: 'wedstay/souphattra-presidential', label: 'A' });
  r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key: 'wedstay/souphattra-presidential', label: 'A', name: 'Haruthai' }, HAR);
  assert.equal(r.status, 200, 'a host books like every guest — the second place of the same room'); assert.equal(unit(r.d, 'wedstay/souphattra-presidential', 'A').full, true);
  assert.deepEqual(unit(r.d, 'wedstay/souphattra-presidential', 'A').occupants.map((o) => o.name).sort(), ['Haruthai', 'Peggy']);
  r = await call(rooms, 'join', { invitationId: SUT.invitationId, guestId: SUT.guestId, key: 'wedstay/souphattra-presidential', label: 'A', name: 'Suthep' }, SUT);
  assert.equal(r.status, 409, 'a full room refuses a host like anyone'); assert.equal(r.d.error, 'full'); assert.equal(r.d.mine.wedstay, undefined);
  r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key: 'wedstay/grand-majestic', label: 'A', name: 'x' }, HAR);
  assert.equal(r.status, 200, 'the Grand Majestic is open to everyone (Owner, Edit 5 · 18 Sep 2026)'); assert.equal(unit(r.d, 'wedstay/souphattra-presidential', 'A').taken, 1, 'one place per stage: her Presidential place goes');
  /* U Sathorn: Room A is nobody's in advance — Peggy takes it; nothing reserved, twelve places, eleven free */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'bkk-stay/u-sathorn-superior-garden', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200, 'U Sathorn Room A is open'); assert.deepEqual(r.d.mine['bkk-stay'], { key: 'bkk-stay/u-sathorn-superior-garden', label: 'A' });
  const s = r.d.summary['bkk-stay/u-sathorn-superior-garden'];
  assert.equal(r.d.summary['bkk-stay/penthouse'], undefined, 'the deleted Penthouse has no summary');
  assert.equal(s.units, 6); assert.equal(s.places, 12); assert.equal(s.reserved, 0); assert.equal(s.reservedFor, null); assert.equal(s.rooms, 6); assert.equal(s.free, 11, 'twelve bookable places, one taken'); assert.equal(s.largestFree, 2); assert.equal(s.soldOut, false);
  r = await call(rooms, 'leave', { invitationId: STE.invitationId, guestId: STE.guestId, stage: 'wedstay' }, PEG);
  assert.equal(r.status, 403);
});

test('ROOMS · without an identity the plan shows counts only: no name, no id', async () => {
  const rooms = new Rooms(doState());
  await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }, PEG);
  const r = await call(rooms, 'read', null, null);
  const u = unit(r.d, 'wedstay/heritage', 'A');
  assert.equal(u.taken, 1);
  assert.deepEqual(u.occupants, [{}]);
  assert.equal(JSON.stringify(r.d).includes('Peggy'), false);
  assert.equal(JSON.stringify(r.d).includes('G001'), false);
  assert.equal(u.eligible, false, 'nobody may join without an identity');
});

test('ROOMS · migration and the plan are Guest Relations acts, refused to a client', async () => {
  const rooms = new Rooms(doState());
  let r = await call(rooms, 'migrate', { occupants: [{ key: 'wedstay/heritage', label: 'A', invitationId: 'INV-G048', guestId: 'G048', partyId: 'INV-001', name: 'Haruthai' }] }, HAR, false);
  assert.equal(r.status, 404, 'not a guest operation');
  r = await call(rooms, 'migrate', { occupants: [
    { key: 'wedstay/heritage', label: 'A', invitationId: 'INV-G048', guestId: 'G048', partyId: 'INV-001', name: 'Haruthai' },
    { key: 'wedstay/heritage', label: 'A', invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', name: 'Suthep' },
    { key: 'wedstay/heritage', label: 'A', invitationId: 'INV-G001', guestId: 'G001', partyId: 'INV-002', name: 'Peggy' },
  ] }, null, true);
  assert.equal(r.d.done.length, 2); assert.equal(r.d.refused.length, 1); assert.equal(r.d.refused[0].error, 'full', 'capacity holds for Guest Relations too');
  r = await call(rooms, 'plan', null, null, true);
  const u = r.d.units['wedstay/heritage'].find((x) => x.label === 'A');
  assert.deepEqual(u.occupants.map((o) => o.invitationId), ['INV-G048', 'INV-G049']);
  r = await call(rooms, 'plan', null, PEG, false);
  assert.equal(r.status, 404);
  r = await call(rooms, 'unassign', { guestId: 'G049', stage: 'wedstay' }, null, true);
  assert.equal(r.d.released.length, 1);
});

/* ─────────────────────────── THE WAITING LIST (Owner, 19 Sep 2026) ─────────────────────────── */
test('WAITING LIST · a guest no room can take waits for the STAGE: one entry, positioned by time, nothing held, nothing charged; waiting twice is one entry; a place held in the stage refuses the line; another guest sees the length only; leaving the line renumbers everyone behind', async () => {
  const rooms = new Rooms(doState()), key = 'kmg/italian';
  await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key, label: 'A', name: 'Haruthai' }, HAR);
  await call(rooms, 'join', { invitationId: SUT.invitationId, guestId: SUT.guestId, key, label: 'A', name: 'Suthep' }, SUT);
  let r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key, label: 'A', name: 'Lin' }, LIN);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  /* Lin takes a place in the line: position 1, her party size and her wishes kept, nothing held */
  r = await wait(rooms, LIN, 'kmg', 1, [key], 'Lin');
  assert.equal(r.status, 200); assert.equal(r.d.ok, true); assert.equal(r.d.waited, 'kmg');
  assert.equal(r.d.waitlist.kmg.position, 1); assert.equal(r.d.waitlist.kmg.size, 1); assert.deepEqual(r.d.waitlist.kmg.wanted, [key]); assert.match(String(r.d.waitlist.kmg.at), /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(r.d.waiting, { kmg: 1 }); assert.deepEqual(r.d.mine, {}, 'nothing is held'); assert.equal(r.d.fixed, undefined);
  const linAt = r.d.waitlist.kmg.at;
  /* positions by time: Peggy second, Steffie third */
  await tick();
  r = await wait(rooms, PEG, 'kmg', 2, [key, 'kmg/light-french'], 'Peggy');
  assert.equal(r.d.waitlist.kmg.position, 2); assert.equal(r.d.waitlist.kmg.size, 2); assert.deepEqual(r.d.waitlist.kmg.wanted, [key, 'kmg/light-french']); assert.equal(r.d.waiting.kmg, 2);
  await tick();
  r = await wait(rooms, STE, 'kmg', 2, [key], 'Steffie');
  assert.equal(r.d.waitlist.kmg.position, 3); assert.equal(r.d.waiting.kmg, 3);
  /* waiting twice is one entry — the place in the line is kept, not retaken */
  await tick();
  r = await wait(rooms, LIN, 'kmg', 1, [key], 'Lin');
  assert.equal(r.status, 200); assert.equal(r.d.waitlist.kmg.position, 1, 'still first'); assert.equal(r.d.waitlist.kmg.at, linAt, 'the time it was taken stands'); assert.equal(r.d.waiting.kmg, 3, 'still three in line');
  /* a guest with a place in the stage does not wait for it */
  r = await wait(rooms, HAR, 'kmg', 1, [key], 'Haruthai');
  assert.equal(r.status, 409); assert.equal(r.d.ok, false); assert.equal(r.d.error, 'a place is held in this stage'); assert.deepEqual(r.d.mine, { kmg: { key, label: 'A' } }); assert.equal(r.d.waiting.kmg, 3);
  /* only a real stage; only the identity's own guest; nobody without an identity */
  r = await wait(rooms, PEG, 'bogus', 1, [], 'Peggy'); assert.equal(r.status, 400); assert.equal(r.d.error, 'invalid stage');
  r = await call(rooms, 'wait', { invitationId: STE.invitationId, guestId: STE.guestId, stage: 'ljg', size: 1, name: 'x' }, PEG); assert.equal(r.status, 403, 'Peggy cannot put Steffie in a line');
  r = await call(rooms, 'wait', { invitationId: PEG.invitationId, guestId: PEG.guestId, stage: 'ljg', size: 1, name: 'x' }, null); assert.equal(r.status, 401);
  /* another guest sees the length of the line and no entry of anyone; the public sees the length only — no name, no id */
  r = await call(rooms, 'read', null, SUT);
  assert.deepEqual(r.d.waitlist, {}, 'no entry of his own'); assert.equal(r.d.waiting.kmg, 3, 'but how many wait');
  r = await call(rooms, 'read', null, null);
  assert.deepEqual(r.d.waitlist, {}); assert.equal(r.d.waiting.kmg, 3);
  assert.equal(JSON.stringify(r.d).includes('Peggy'), false); assert.equal(JSON.stringify(r.d).includes('G001'), false); assert.equal(JSON.stringify(r.d).includes('INV-'), false);
  /* Peggy leaves the line: Steffie is renumbered to 2, Lin stays 1 */
  r = await unwait(rooms, PEG, 'kmg');
  assert.equal(r.status, 200); assert.equal(r.d.ok, true); assert.equal(r.d.waitlist.kmg, undefined); assert.equal(r.d.waiting.kmg, 2);
  assert.equal((await call(rooms, 'read', null, STE)).d.waitlist.kmg.position, 2, 'everyone behind moves up');
  assert.equal((await call(rooms, 'read', null, LIN)).d.waitlist.kmg.position, 1);
  /* leaving a line one is not in changes nothing */
  r = await unwait(rooms, PEG, 'kmg'); assert.equal(r.status, 200); assert.equal(r.d.ok, true); assert.equal(r.d.waiting.kmg, 2);
  r = await unwait(rooms, PEG, 'bogus'); assert.equal(r.status, 400);
  /* a different stage is its own line */
  r = await wait(rooms, STE, 'ljg', 2, ['ljg/viewing-270'], 'Steffie');
  assert.deepEqual(Object.fromEntries(Object.entries(r.d.waitlist).map(([s, w]) => [s, w.position])), { kmg: 2, ljg: 1 }); assert.deepEqual(r.d.waiting, { kmg: 2, ljg: 1 });
  r = await call(rooms, 'mine', null, STE);
  assert.deepEqual(r.d, { ok: true, mine: {}, waitlist: r.d.waitlist, complimentary: r.d.complimentary }); assert.deepEqual(Object.keys(r.d.waitlist).sort(), ['kmg', 'ljg'], '`mine` carries the holds, the waits, the guest\'s own extension and the complimentary allocation — nothing else');
  assert.equal(r.d.complimentary.key, 'guesthouse/guest-house'); assert.equal(r.d.complimentary.max, 6, 'the six places are the seed\'s, never a number typed into a page');
});

test('WAITING LIST · a place held resolves the line: a join clears the guest\'s wait of that stage and no other; a Guest Relations assignment resolves it too; the plan lists the line with its positions; the clean reset clears every hold AND every wait — a client cannot', async () => {
  const rooms = new Rooms(doState()), key = 'kmg/italian';
  await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key, label: 'A', name: 'Haruthai' }, HAR);
  await call(rooms, 'join', { invitationId: SUT.invitationId, guestId: SUT.guestId, key, label: 'A', name: 'Suthep' }, SUT);
  await wait(rooms, LIN, 'kmg', 1, [key], 'Lin'); await tick();
  await wait(rooms, PEG, 'kmg', 2, [key, 'kmg/light-french'], 'Peggy'); await tick();
  let r = await wait(rooms, LIN, 'ljg', 1, ['ljg/viewing-270'], 'Lin');
  assert.deepEqual(Object.fromEntries(Object.entries(r.d.waitlist).map(([s, w]) => [s, w.position])), { kmg: 1, ljg: 1 }); assert.deepEqual(r.d.waiting, { kmg: 2, ljg: 1 });
  /* Haruthai gives her place up; Lin takes it: her kmg wait is resolved, her ljg wait stays, Peggy moves up to 1 */
  r = await call(rooms, 'leave', { invitationId: HAR.invitationId, guestId: HAR.guestId, key }, HAR);
  assert.deepEqual(r.d.released, [{ key, label: 'A' }]); assert.equal(unit(r.d, key, 'A').free, 1);
  r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key, label: 'A', name: 'Lin' }, LIN);
  assert.equal(r.status, 200); assert.deepEqual(r.d.mine, { kmg: { key, label: 'A' } });
  assert.deepEqual(Object.keys(r.d.waitlist), ['ljg'], 'the place held resolves the kmg wait; the ljg wait is untouched'); assert.equal(r.d.waitlist.ljg.position, 1);
  assert.deepEqual(r.d.waiting, { kmg: 1, ljg: 1 });
  assert.equal((await call(rooms, 'read', null, PEG)).d.waitlist.kmg.position, 1, 'Peggy is first in line now');
  /* Guest Relations: the plan lists the line — every entry with its stage, position, party, size and wishes; a client is refused */
  r = await call(rooms, 'plan', null, PEG, false); assert.equal(r.status, 404);
  r = await call(rooms, 'plan', null, null, true);
  assert.equal(r.d.ok, true); assert.ok(Array.isArray(r.d.waitlist)); assert.equal(r.d.waitlist.length, 2);
  const peg = r.d.waitlist.find((w) => w.stage === 'kmg'), lin = r.d.waitlist.find((w) => w.stage === 'ljg');
  assert.deepEqual([peg.guestId, peg.invitationId, peg.partyId, peg.name, peg.position, peg.size, peg.wanted], ['G001', 'INV-G001', 'INV-002', 'Peggy', 1, 2, [key, 'kmg/light-french']]);
  assert.deepEqual([lin.guestId, lin.invitationId, lin.name, lin.position, lin.size, lin.wanted], ['G003', 'INV-G003', 'Lin', 1, 1, ['ljg/viewing-270']]); assert.match(String(lin.at), /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual(unit(r.d, key, 'A').occupants.map((o) => o.guestId).sort(), ['G003', 'G049']);
  /* an assignment by Guest Relations resolves the entry — Peggy is placed, her kmg wait goes */
  r = await call(rooms, 'assign', { occupants: [{ key: 'kmg/light-french', label: 'A', guestId: PEG.guestId, invitationId: PEG.invitationId, partyId: PEG.partyId, name: 'Peggy' }] }, null, true);
  assert.equal(r.d.ok, true); assert.deepEqual(r.d.done, [{ key: 'kmg/light-french', label: 'A', guestId: 'G001' }]); assert.deepEqual(r.d.refused, []);
  r = await call(rooms, 'read', null, PEG);
  assert.deepEqual(r.d.waitlist, {}); assert.deepEqual(r.d.mine, { kmg: { key: 'kmg/light-french', label: 'A' } }); assert.deepEqual(r.d.waiting, { ljg: 1 });
  assert.equal((await call(rooms, 'plan', null, null, true)).d.waitlist.length, 1, 'the plan lists Lin\'s ljg wait alone');
  /* an unassignment releases the hold and puts nobody back in a line */
  r = await call(rooms, 'unassign', { guestId: LIN.guestId, stage: 'kmg' }, null, true); assert.deepEqual(r.d.released, [{ key, label: 'A' }]);
  r = await call(rooms, 'read', null, LIN); assert.deepEqual(r.d.mine, {}); assert.deepEqual(Object.keys(r.d.waitlist), ['ljg']); assert.deepEqual(r.d.waiting, { ljg: 1 });
  /* THE CLEAN RESET: a client cannot; the dry run names every hold and every wait and clears nothing; the run clears both */
  r = await call(rooms, 'reset', { dryRun: false }, PEG, false); assert.equal(r.status, 404, 'not a guest operation');
  r = await call(rooms, 'reset', { snapshot: true }, null, true);
  assert.equal(r.status, 200); assert.equal(r.d.dryRun, true, 'a reset is a dry run unless told otherwise');
  assert.equal(r.d.occupancies, 2); assert.equal(r.d.waitlisted, 1); assert.equal(r.d.fixed, 0, 'nothing fixed exists to report');
  assert.deepEqual(r.d.rows.map((x) => x.key + '|' + x.label + '|' + x.guestId).sort(), ['kmg/italian|A|G049', 'kmg/light-french|A|G001']);
  assert.deepEqual(r.d.waits.map((w) => [w.stage, w.guestId, w.storageKey]), [['ljg', 'G003', 'wl:ljg|G003']]); assert.equal(r.d.waits[0].value.name, 'Lin'); assert.equal(r.d.waits[0].value.invitationId, 'INV-G003');
  r = await call(rooms, 'read', null, LIN); assert.deepEqual(Object.keys(r.d.waitlist), ['ljg'], 'a dry run clears nothing'); assert.equal(unit(r.d, key, 'A').taken, 1);
  r = await call(rooms, 'reset', { dryRun: false }, null, true);
  assert.equal(r.d.ok, true); assert.equal(r.d.dryRun, false); assert.equal(r.d.cleared, 2); assert.equal(r.d.waitlistCleared, 1); assert.equal(r.d.remaining, 0); assert.equal(r.d.waitlistRemaining, 0); assert.equal(r.d.fixed, 0);
  r = await call(rooms, 'read', null, LIN);
  assert.deepEqual(r.d.mine, {}); assert.deepEqual(r.d.waitlist, {}); assert.deepEqual(r.d.waiting, {});
  assert.ok(Object.values(r.d.summary).every((s) => s.free === s.places && s.soldOut === false), 'every place of every category is free again — nothing was held in advance, so nothing remains');
  assert.equal((await call(rooms, 'plan', null, null, true)).d.waitlist.length, 0);
});
