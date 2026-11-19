/* THE SOUPHATTRA'S OWN ROOM NUMBERS AND THE COUPLE'S SUITE (Owners, 18 / 19 Nov 2026) — src/hotel-rooms.js, src/rooms.js.
   The official list is the hotel's (building · type · number); which unit is which room is the Owners' assignment, kept in the room
   engine's store and checked against the list. The Presidential is ONE suite of two numbers — one unit of two places, the couple's
   alone: nobody else joins it, is placed, assigned or migrated into it, or has a party place kept there. Synthetic guests only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUPHATTRA_ROOMS, CATEGORY_TYPES, roomsInCategory, suiteOf, hotelRoomOf, checkHotelRooms, isSouphattraKey } from '../src/hotel-rooms.js';
import { Rooms, unitsOf, isCouplePerson } from '../src/rooms.js';
import { hotelChecksOf } from '../src/billing/assignments.js';
import { SEED } from '../src/inventory-seed.js';
import { doState } from './sandbox.mjs';

const BRIDE = { invitationId: 'INV-G048', guestId: 'G048', partyId: 'INV-001', hosts: true, firstName: 'Haruthai' };
const GROOM = { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', hosts: true, firstName: 'Suthep' };
const ADA = { invitationId: 'INV-G901', guestId: 'G901', partyId: 'INV-901', hosts: false, firstName: 'Ada' };
const PRES = 'wedstay/souphattra-presidential';
const H = (extra) => ({ 'x-gr-verified': 'yes', 'content-type': 'application/json', ...(extra || {}) });
async function op(rooms, name, body, headers) {
  const r = await rooms.fetch(new Request('https://rooms/api/rooms/' + name, { method: body ? 'POST' : 'GET', headers: headers || H({ 'x-siyl-admin': 'GROOM' }), body: body ? JSON.stringify(body) : undefined }));
  return { status: r.status, d: await r.json() };
}
async function join(rooms, who, key, label, extra) {
  const r = await rooms.fetch(new Request('https://rooms/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who), 'content-type': 'application/json' },
    body: JSON.stringify({ invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.firstName, ...(extra || {}) }) }));
  return { status: r.status, d: await r.json() };
}
/* a complete synthetic assignment built from the list itself: each category's numbers in order onto its units A, B, C … */
function fullAssignment(window) {
  const out = {};
  for (const cat of Object.keys(CATEGORY_TYPES)) {
    const key = window + '/' + cat; if (!SEED[key]) continue;
    const rooms = []; for (const r of SOUPHATTRA_ROOMS.filter((x) => CATEGORY_TYPES[cat].includes(x.type))) { const s = r.suite ? suiteOf(r.no) : [r.no]; if (!rooms.some((x) => x.join() === s.join())) rooms.push(s); }
    unitsOf(key).forEach((u, i) => { if (rooms[i]) out[key + '|' + u.label] = rooms[i]; });
  }
  return out;
}

test('HOTEL ROOMS · the official list: 27 numbers, 26 rooms — the Presidential is ONE suite of 210 + 211; every category holds exactly as many rooms as the engine has units, in both Vientiane windows', () => {
  assert.equal(SOUPHATTRA_ROOMS.length, 27); assert.equal(new Set(SOUPHATTRA_ROOMS.map((r) => r.no)).size, 27, 'no number twice');
  assert.deepEqual(suiteOf('210'), ['210', '211']); assert.deepEqual(suiteOf('211'), ['210', '211']); assert.equal(suiteOf('105'), null);
  assert.equal(Object.keys(CATEGORY_TYPES).reduce((n, c) => n + roomsInCategory(c), 0), 26, 'twenty-six rooms of the house — the suite counts once');
  for (const cat of Object.keys(CATEGORY_TYPES)) for (const w of ['prewed', 'wedstay']) {
    const key = w + '/' + cat; if (!SEED[key]) continue;
    assert.equal(unitsOf(key).length, roomsInCategory(cat), key + ': one unit per room of the house');
  }
  assert.ok(SOUPHATTRA_ROOMS.every((r) => Object.values(CATEGORY_TYPES).some((t) => t.includes(r.type))), 'every number belongs to a category of the engine');
  const at = (no) => SOUPHATTRA_ROOMS.find((r) => r.no === no);
  assert.deepEqual([at('105').building, at('105').type], ['C', 'The Heritage']); assert.deepEqual([at('201').building, at('209').building], ['B', 'E'], 'the two Grand Majestic suites in two buildings');
  assert.deepEqual([at('206').type, at('109').type], ['Heritage Executive (Twin)', 'Heritage Executive (No Bath tub)']); assert.deepEqual([at('210').building, at('211').building], ['F', 'F']);
  assert.ok(isSouphattraKey(PRES) && isSouphattraKey('prewed/heritage') && !isSouphattraKey('bkk-stay/u-sathorn-superior-garden') && !isSouphattraKey('guesthouse/guest-house'));
});

test('HOTEL ROOMS · an assignment fits the list or is refused as a whole: official numbers of the category\'s own types, a suite as all of its numbers in one unit, one number per ordinary room, no number twice in one window; the same room in both windows is fine', () => {
  for (const w of ['prewed', 'wedstay']) assert.deepEqual(checkHotelRooms(fullAssignment(w), unitsOf), { ok: true, problems: [] }, w + ': a complete assignment fits');
  assert.equal(checkHotelRooms({ ...fullAssignment('prewed'), ...fullAssignment('wedstay') }, unitsOf).ok, true, 'the same physical room in both windows');
  const reason = (a) => checkHotelRooms(a, unitsOf).problems.map((p) => p.reason);
  assert.deepEqual(reason({ [PRES + '|A']: ['210'] }), ['SUITE'], '210 alone is never a room');
  assert.deepEqual(reason({ [PRES + '|A']: ['211'] }), ['SUITE']);
  assert.deepEqual(reason({ 'wedstay/heritage|A': ['210', '211'] }), ['WRONG_TYPE'], 'the suite is no Heritage room');
  assert.deepEqual(reason({ 'wedstay/heritage-executive|A': ['105'] }), ['WRONG_TYPE'], '105 is The Heritage');
  assert.deepEqual(reason({ 'wedstay/heritage|A': ['105', '102'] }), ['SUITE'], 'one room, one number');
  assert.deepEqual(reason({ 'wedstay/heritage|A': ['999'] }), ['UNKNOWN_NUMBER']);
  assert.deepEqual(reason({ 'wedstay/heritage|Z': ['105'] }), ['UNKNOWN_UNIT']);
  assert.deepEqual(reason({ 'bkk-stay/u-sathorn-superior-garden|A': ['105'] }), ['NOT_SOUPHATTRA'], 'no other hotel has supplied numbers');
  assert.deepEqual(reason({ 'wedstay/heritage|A': ['102'], 'wedstay/heritage|B': ['102'] }), ['TWICE'], 'one room is never two units of one window');
  assert.deepEqual(reason({ 'prewed/heritage|A': ['202'], 'wedstay/heritage|B': ['202'] }), [], 'two windows are two different nights');
  assert.deepEqual(reason({ 'wedstay/heritage|A': '105' }), ['INVALID']);
});

test('HOTEL ROOMS · what a unit is in the house: "105 · building C", the suite "210 + 211 · building F" — one room; nothing where no number is assigned or the hotel is not the Souphattra', () => {
  const a = { 'wedstay/heritage|B': ['202'], [PRES + '|A']: ['211', '210'] };
  assert.deepEqual(hotelRoomOf('wedstay/heritage', 'b', a), { hotel: 'Souphattra Heritage Vientiane', numbers: ['202'], display: '202', building: 'C', type: 'The Heritage', suite: false });
  assert.deepEqual(hotelRoomOf(PRES, 'A', a), { hotel: 'Souphattra Heritage Vientiane', numbers: ['210', '211'], display: '210 + 211', building: 'F', type: 'Souphattra Presidential', suite: true });
  assert.equal(hotelRoomOf('wedstay/heritage', 'A', a), null, 'not assigned: nothing, never a guess');
  assert.equal(hotelRoomOf('bkk-stay/u-sathorn-superior-garden', 'A', { 'bkk-stay/u-sathorn-superior-garden|A': ['105'] }), null);
  assert.equal(hotelRoomOf('wedstay/heritage', 'B', { 'wedstay/heritage|B': ['999'] }), null, 'an unknown number is never shown');
});

test('HOTEL ROOMS · the engine keeps the Owners\' numbers: admin only, the version read must still stand, the whole assignment checked before anything is written, a dry run writes nothing, logged; a number never moves a guest; a clean reset leaves the numbers standing', async () => {
  const rooms = new Rooms(doState());
  assert.equal((await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|B': ['301'] }, expectVersion: 0 }, H())).status, 404, 'never without the Owner named');
  assert.equal((await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|B': ['301'] }, expectVersion: 0 }, { 'x-siyl-admin': 'GROOM' })).status, 404, 'never without the verified route');
  assert.equal((await join(rooms, ADA, 'wedstay/heritage', 'B')).status, 200);
  const before = (await op(rooms, 'admin-read')).d;
  assert.deepEqual([before.hotelRooms.version, before.hotelRooms.rooms], [0, {}]);
  let r = await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|B': ['301'], 'wedstay/heritage|C': ['301'] }, expectVersion: 0 });
  assert.equal(r.status, 409); assert.equal(r.d.reason, 'REFUSED'); assert.deepEqual(r.d.problems.map((p) => p.reason), ['TWICE']);
  r = await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|B': ['301'] }, expectVersion: 0, dryRun: true });
  assert.equal(r.status, 200); assert.equal(r.d.dryRun, true); assert.deepEqual(r.d.changed, [{ unit: 'wedstay/heritage|B', from: null, to: '301' }]);
  assert.equal((await op(rooms, 'admin-read')).d.hotelRooms.version, 0, 'a dry run writes nothing');
  r = await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|B': ['301'], [PRES + '|A']: ['210', '211'] }, expectVersion: 0, note: 'synthetic' });
  assert.equal(r.status, 200); assert.equal(r.d.hotelRooms.version, 1); assert.equal(r.d.hotelRooms.by, 'GROOM');
  assert.equal((await op(rooms, 'admin-hotel-rooms', { set: { 'wedstay/heritage|C': ['205'] }, expectVersion: 0 })).d.reason, 'CONFLICT', 'a stale version is refused');
  const after = (await op(rooms, 'admin-read')).d;
  assert.deepEqual(after.hotelRooms.rooms, { 'wedstay/heritage|B': ['301'], [PRES + '|A']: ['210', '211'] });
  assert.equal(after.digest, before.digest, 'no place moved, no guest changed');
  assert.ok(after.log.some((e) => e.type === 'HOTEL_ROOMS' && e.version === 1 && e.by === 'GROOM' && e.changed === 2));
  assert.deepEqual((await op(rooms, 'plan', null, H())).d.hotelRooms.rooms, after.hotelRooms.rooms, 'the room plan (finance, rooming list) reads the same numbers');
  assert.equal((await op(rooms, 'reset', { dryRun: false }, H())).status, 200);
  assert.equal((await op(rooms, 'admin-read')).d.hotelRooms.version, 1, 'a clean reset clears places, never the rooms of the house');
});

test('THE COUPLE\'S SUITE · Haruthai\'s and Suthep\'s alone on every write path: a guest\'s join (403, nothing written), Guest Relations\' assign and migrate (even with force), the Owners\' assignments (COUPLE_ONLY); the couple themselves take it; never a third place', async () => {
  const rooms = new Rooms(doState());
  let r = await join(rooms, ADA, PRES, 'A');
  assert.equal(r.status, 403); assert.equal(r.d.error, 'the couple\'s suite');
  assert.deepEqual((await op(rooms, 'admin-read')).d.units[PRES][0].occupants, [], 'nothing written');
  /* Guest Relations: the register ids decide — the invitation AND the guest of the allowlist; force never opens it */
  r = await op(rooms, 'assign', { occupants: [{ key: PRES, label: 'A', guestId: 'G901', invitationId: 'INV-G901' }], force: true }, H());
  assert.deepEqual(r.d.refused.map((x) => x.error), ['the couple\'s suite']);
  r = await op(rooms, 'migrate', { occupants: [{ key: PRES, label: 'A', guestId: 'G048', invitationId: 'INV-G901' }] }, H());
  assert.deepEqual(r.d.refused.map((x) => x.error), ['the couple\'s suite'], 'a couple guest id under another invitation is not the couple');
  assert.equal(isCouplePerson({ guestId: 'G048', invitationId: 'INV-G048' }), true); assert.equal(isCouplePerson({ guestId: 'G048' }), false);
  r = await op(rooms, 'assign', { occupants: [{ key: PRES, label: 'A', guestId: 'G048', invitationId: 'INV-G048', partyId: 'INV-001', name: 'Haruthai' }] }, H());
  assert.equal(r.d.refused.length, 0, 'the Bride is assigned');
  assert.equal((await join(rooms, GROOM, PRES, 'A')).status, 200, 'the Groom joins her');
  const u = (await op(rooms, 'admin-read')).d.units[PRES][0];
  assert.deepEqual([u.places, u.couple, u.occupants.map((o) => o.guestId).sort()], [2, true, ['G048', 'G049']]);
  assert.equal((await op(rooms, 'assign', { occupants: [{ key: PRES, label: 'A', guestId: 'G901', invitationId: 'INV-G901' }], force: true }, H())).d.refused[0].error, 'the couple\'s suite', 'never a third place, force or not');
  /* the Owners' assignments: a target for the suite naming anyone but the couple is refused */
  const digest = (await op(rooms, 'admin-read')).d.digest;
  r = await op(rooms, 'admin-apply', { target: { [PRES + '|A']: ['G048', 'G901'] }, expect: { [PRES + '|A']: ['G048', 'G049'] }, expectDigest: digest, dryRun: true });
  assert.equal(r.status, 409); assert.ok(r.d.problems.some((p) => p.reason === 'COUPLE_ONLY'), JSON.stringify(r.d.problems));
  /* every guest sees it as the room it is — held by the couple, never free to them; the couple see their own room */
  const seen = await rooms.fetch(new Request('https://rooms/api/rooms/read', { headers: { 'x-siyl-identity': JSON.stringify(ADA) } })).then((x) => x.json());
  assert.deepEqual([seen.units[PRES][0].free, seen.units[PRES][0].full, seen.units[PRES][0].eligible, seen.summary[PRES].soldOut, seen.summary[PRES].sourceRooms], [0, true, false, true, 1]);
  assert.deepEqual(seen.units[PRES][0].occupants.map((o) => o.name).sort(), ['Haruthai', 'Suthep'], 'first names, as for every room');
  const anon = await rooms.fetch(new Request('https://rooms/api/rooms/read')).then((x) => x.json());
  assert.equal(anon.summary[PRES].remainingPlaces, 0); assert.equal(anon.summary[PRES].emptyRooms, 0);
});

test('THE COUPLE\'S SUITE · a party larger than its room never keeps a place in a room it may not take — not in the couple\'s suite, not in another guest\'s dedicated room (review, 19 Nov 2026)', async () => {
  const rooms = new Rooms(doState());
  const K = 'kempinski/jatu-room';
  for (const [g, l] of [['G911', 'A'], ['G912', 'A'], ['G913', 'B'], ['G914', 'B']]) assert.equal((await join(rooms, { invitationId: 'INV-' + g, guestId: g, partyId: 'INV-' + g, hosts: false, firstName: 'X' }, K, l)).status, 200);
  const LEAD = { invitationId: 'INV-G920', guestId: 'G920', partyId: 'INV-920', hosts: false, firstName: 'Lead', partyNeed: { kempinski: 3 } };
  const r = await join(rooms, LEAD, K, 'C', { need: 3 });
  assert.equal(r.status, 409, 'room C takes two; A and B are full; the dedicated Room D is not this party\'s'); assert.equal(r.d.error, 'full for your party');
  const d = (await op(rooms, 'admin-read')).d.units[K].find((u) => u.label === 'D');
  assert.equal(d.kept, 0, 'no place kept in the dedicated room');
});

test('THE COUPLE\'S SUITE · the console names anyone but the couple found holding a place there (moving them is the Owners\' booking decision), a Souphattra guest without a hotel number, and a guest whose room of the house changes on 27 February', () => {
  const hr = (d) => ({ display: d });
  const roster = [
    { guestId: 'G048', couple: 'BRIDE', rooms: [{ key: PRES, window: 'wedstay', label: 'A', hotelRoom: hr('S') }] },
    { guestId: 'G901', couple: null, rooms: [{ key: PRES, window: 'wedstay', label: 'A', hotelRoom: hr('S') }] },
    { guestId: 'G902', couple: null, rooms: [{ key: 'prewed/heritage', window: 'prewed', label: 'A', hotelRoom: hr('1') }, { key: 'wedstay/heritage', window: 'wedstay', label: 'B', hotelRoom: hr('2') }] },
    { guestId: 'G903', couple: null, rooms: [{ key: 'wedstay/heritage', window: 'wedstay', label: 'C', hotelRoom: null }, { key: 'bkk-stay/u-sathorn-superior-garden', window: 'bkk-stay', label: 'A', hotelRoom: null }] },
  ];
  assert.deepEqual(hotelChecksOf(roster).map((x) => x.kind + ':' + x.guestId), ['COUPLE_SUITE_OTHER:G901', 'ROOM_CHANGES:G902', 'NO_NUMBER:G903'], 'other hotels have no numbers to miss');
});
