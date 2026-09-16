/* ============================================================================
   ROOMS — the occupancy engine (Owner decision, 14 Sep 2026).

   Every room unit has two guest places · a category of N rooms is N persistent
   units · a guest holds one place per stage · join is atomic, a change holds
   the new place before the old one goes · a full room is full · Bride & Groom
   units open only to the hosts · Family units to nobody · first names are
   shown to authenticated guests · migration is a Guest Relations act.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Rooms, unitsOf, allUnits, mayJoin, stageOf, PLACES } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
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

test('ROOMS · 1 room = 2 places; 5 rooms = 10 places; units are persistent labels A, B, C …', () => {
  assert.equal(PLACES, 2);
  const five = unitsOf('wedstay/heritage');
  assert.deepEqual(five.map((u) => u.label), ['A', 'B', 'C', 'D', 'E']);
  assert.equal(five.reduce((n, u) => n + u.places, 0), 10);
  assert.deepEqual(unitsOf('wedstay/heritage'), five, 'the same identities on every derivation');
  const one = unitsOf('prewed/souphattra-presidential');
  assert.equal(one.length, 1); assert.equal(one[0].places, 2, 'the Presidential is one room of two guest places');
  /* the six-bedroom Penthouse (Owner, 15 Sep 2026): Room A – F, twelve places */
  assert.deepEqual(unitsOf('bkk-stay/penthouse').map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(unitsOf('bkk-stay/penthouse').reduce((n, u) => n + u.places, 0), 12);
  assert.equal(unitsOf('airbnb-2br/private-residence')[0].kind, 'property'); assert.equal(unitsOf('airbnb-2br/private-residence')[0].places, 6);
  assert.equal(unitsOf('kmg/light-french')[0].places, 2, 'the Light French Suite sleeps two adults (Accommodation_Details Pax)');
  assert.equal(allUnits().length, Object.keys(SEED).reduce((n, k) => n + (SEED[k].unit === 'guest' ? 1 : SEED[k].capacity), 0));
});

test('ROOMS · the Master\'s reservations (Owner, 16 Sep 2026): a Bride & Groom room is the hosts\' alone, a Family room is nobody\'s through the website, every other room is open to every authenticated guest; nobody without an identity', () => {
  const pres = unitsOf('wedstay/souphattra-presidential')[0];
  assert.equal(pres.reservedFor, 'Bride & Groom');
  assert.equal(mayJoin(pres, HAR).ok, true); assert.equal(mayJoin(pres, SUT).ok, true); assert.equal(mayJoin(pres, PEG).ok, false); assert.equal(mayJoin(pres, PEG).error, 'reserved · bride & groom');
  assert.equal(mayJoin(pres, null).ok, false);
  const fam = unitsOf('wedstay/grand-majestic');
  assert.deepEqual(fam.map((u) => u.reservedFor), ['Family', 'Family']); assert.equal(mayJoin(fam[0], HAR).ok, false); assert.equal(mayJoin(fam[0], LIN).ok, false); assert.equal(mayJoin(fam[0], LIN).error, 'reserved · family');
  assert.equal(mayJoin(unitsOf('wedstay/heritage')[0], LIN).ok, true);
  /* the Penthouse: six bedrooms, Room A the hosts', B – F open — never a Room G */
  const pent = unitsOf('bkk-stay/penthouse');
  assert.deepEqual(pent.map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']); assert.equal(pent[0].reservedFor, 'Bride & Groom'); assert.deepEqual(pent.slice(1).map((u) => u.reservedFor), [null, null, null, null, null]);
  assert.equal(mayJoin(pent[0], PEG).ok, false); assert.equal(mayJoin(pent[1], PEG).ok, true); assert.equal(mayJoin(pent[0], HAR).ok, true);
  /* Kunming: the Solarium (the Master's Status) is the hosts'; Lijiang: the 270° View Suite, all four rooms */
  assert.equal(unitsOf('kmg/solarium')[0].reservedFor, 'Bride & Groom'); assert.equal(unitsOf('kmg/standard-single')[0].reservedFor, null);
  assert.deepEqual(unitsOf('ljg/view-suite-270').map((u) => u.reservedFor), ['Bride & Groom', 'Bride & Groom', 'Bride & Groom', 'Bride & Groom']);
  assert.equal(stageOf('airbnb-2br/private-residence'), 'wedstay', 'the residence is the wedding stage');
});

test('ROOMS · guest 1 joins A → 1/2; guest 2 joins A → 2/2 with both first names; guest 3 cannot', async () => {
  const rooms = new Rooms(doState()), key = 'wedstay/souphattra-presidential';
  let r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key, label: 'A', name: 'Haruthai' }, HAR);
  assert.equal(r.status, 200); assert.equal(unit(r.d, key, 'A').taken, 1); assert.equal(unit(r.d, key, 'A').free, 1);
  assert.deepEqual(r.d.mine, { wedstay: { key, label: 'A' } });
  r = await call(rooms, 'read', null, SUT);
  const seen = unit(r.d, key, 'A');
  assert.deepEqual(seen.occupants.map((o) => [o.name, o.mine, o.party]), [['Haruthai', false, true]], 'Suthep sees Haruthai in Room A, as his party');
  r = await call(rooms, 'join', { invitationId: SUT.invitationId, guestId: SUT.guestId, key, label: 'A', name: 'Suthep' }, SUT);
  assert.equal(r.status, 200); assert.equal(unit(r.d, key, 'A').full, true);
  assert.deepEqual(unit(r.d, key, 'A').occupants.map((o) => o.name), ['Haruthai', 'Suthep']);
  r = await call(rooms, 'join', { invitationId: LIN.invitationId, guestId: LIN.guestId, key: 'wedstay/heritage', label: 'A', name: 'Lin' }, LIN);
  assert.equal(r.status, 200);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200);
  r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'Steffie' }, STE);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full', 'guest 3 cannot join a full room');
  assert.equal(r.d.mine.wedstay, undefined, 'and holds nothing');
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
  /* the residence is the same stage as the hotel */
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'airbnb-2br/private-residence', label: 'A', name: 'Peggy' }, PEG);
  assert.equal(unit(r.d, 'wedstay/heritage-executive', 'C').taken, 0);
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

test('ROOMS · a write is the identity\'s own: another guest, another invitation, no identity — refused', async () => {
  const rooms = new Rooms(doState());
  let r = await call(rooms, 'join', { invitationId: STE.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403, 'Peggy cannot book Steffie a room');
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: STE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, null);
  assert.equal(r.status, 401);
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'wedstay/souphattra-presidential', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403, 'the Presidential is the Bride & Groom\'s — Peggy is refused (Owner, 16 Sep 2026)'); assert.equal(r.d.error, 'reserved · bride & groom');
  r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key: 'wedstay/souphattra-presidential', label: 'A', name: 'Haruthai' }, HAR);
  assert.equal(r.status, 200, 'the hosts take their reserved room');
  r = await call(rooms, 'join', { invitationId: HAR.invitationId, guestId: HAR.guestId, key: 'wedstay/grand-majestic', label: 'A', name: 'x' }, HAR);
  assert.equal(r.status, 403, 'the Grand Majestic is the Family\'s — Guest Relations assign it, the website offers it to nobody'); assert.equal(r.d.error, 'reserved · family');
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'bkk-stay/penthouse', label: 'A', name: 'x' }, PEG);
  assert.equal(r.status, 403, 'Penthouse Room A is the hosts\'');
  r = await call(rooms, 'join', { invitationId: PEG.invitationId, guestId: PEG.guestId, key: 'bkk-stay/penthouse', label: 'B', name: 'Peggy' }, PEG);
  assert.equal(r.status, 200, 'Room B is open'); assert.equal(r.d.summary['bkk-stay/penthouse'].units, 6); assert.equal(r.d.summary['bkk-stay/penthouse'].reserved, 1); assert.equal(r.d.summary['bkk-stay/penthouse'].rooms, 5); assert.equal(r.d.summary['bkk-stay/penthouse'].free, 9, 'ten bookable places, one taken');
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
