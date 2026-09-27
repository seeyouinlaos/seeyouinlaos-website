/* THE PENANG SUITE SLEEPS FOUR (Owner, 27 Sep 2026 · a production bug): the Penang Forest Nanyang-Style Deluxe Suite in Kunming
   was booked as a room of two places, so a party of two found "No room here for the 2 of you together" beside a single guest.
   The suite takes up to four guests — the seed's own occupancy, honoured for this one room (honourOccupancy); every other room
   keeps its two places. The engine, the availability object and the words all read the same unit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, roomsFetch, plain, PEGGY, STEFFIE } from './sandbox.mjs';
import { doState } from './sandbox.mjs';
import { Rooms, unitsOf, PLACES } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';

const KEY = 'kmg/penang';
const ID = (g) => ({ invitationId: g.invitationId, guestId: g.guestId, partyId: g.partyId, hosts: !!g.hosts, firstName: String(g.preferredName || '').split(/\s+/)[0] });
function req(op, body, identity) {
  return { url: 'https://x/api/rooms/' + op, method: body ? 'POST' : 'GET', headers: { get: (k) => (k === 'x-siyl-identity' ? (identity ? JSON.stringify(identity) : null) : null) }, json: async () => body || {} };
}
async function call(rooms, op, body, identity) { const r = await rooms.fetch(req(op, body, identity)); return { status: r.status, d: JSON.parse(await r.text()) }; }
const join = (rooms, who, key, label, need) => call(rooms, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.guestId, need }, who);
const stranger = (n) => ({ invitationId: 'INV-Z' + n, guestId: 'Z' + n, partyId: 'INV-Z' + n, hosts: false, firstName: 'Zed' });
const unitA = (d) => d.units[KEY].find((u) => u.label === 'A');
async function strangers(rooms, n) { for (let i = 1; i <= n; i++) assert.equal((await join(rooms, stranger('S' + i), KEY, 'A', 1)).status, 200); }

test('THE PENANG SUITE · ONE unit of FOUR places, from the seed\'s own occupancy; every other room keeps exactly what it had; the price is untouched', () => {
  assert.equal(SEED[KEY].occupancy, 4); assert.equal(SEED[KEY].capacity, 1, 'one physical suite');
  const u = unitsOf(KEY); assert.equal(u.length, 1); assert.equal(u[0].places, 4, 'max occupancy 4');
  assert.deepEqual(Object.keys(SEED).filter((k) => SEED[k].honourOccupancy), [KEY], 'the Penang suite alone is opened to its occupancy');
  assert.equal(PLACES, 2, 'the rule of every other room stands');
  for (const key of Object.keys(SEED)) {
    if (key === KEY) continue;
    const s = SEED[key];
    for (const x of unitsOf(key)) assert.equal(x.places, s.unit === 'guest' ? s.capacity : s.occupancy === 1 ? 1 : 2, key + ' unchanged');
  }
  assert.match(src('assets/rooms-data.js'), /slug: 'penang'[\s\S]*?\['Occupancy', '4 guests on this website \(the suite sleeps up to 4 adults\)'\][\s\S]*?rate: 79 \}/, 'the words say four; the per-person rate stays USD 79');
  assert.match(src('src/i18n-th.json'), /"4 guests on this website \(the suite sleeps up to 4 adults\)":"จองผ่านเว็บไซต์นี้ได้ 4 ท่าน/);
  assert.doesNotMatch(src('src/i18n-th.json'), /"2 guests on this website \(the suite sleeps up to 4 adults\)"/);
});

test('PARTIES · 1, 2, 3 and 4 take the suite whole (the places the absent members need are kept for them); a party of 5 is refused', async () => {
  for (const n of [1, 2, 3, 4]) {
    const R = new Rooms(doState());
    const r = await join(R, stranger('P' + n), KEY, 'A', n);
    assert.equal(r.status, 200, 'a party of ' + n);
    const a = unitA(r.d); assert.equal(a.places, 4); assert.equal(a.free, 4 - n, 'a party of ' + n + ' leaves ' + (4 - n));
    assert.equal(r.d.summary[KEY].sourcePlaces, 4); assert.equal(r.d.summary[KEY].remainingPlaces, 4 - n);
  }
  const R5 = new Rooms(doState());
  const five = await join(R5, stranger('P5'), KEY, 'A', 5);
  assert.equal(five.status, 409); assert.equal(five.d.error, 'full for your party', 'five never fit one suite of four'); assert.equal(five.d.free, 4);
  assert.equal(unitA(five.d).free, 4, 'nothing held');
});

test('REMAINING PLACES · the real free places decide: one guest there (production today) leaves 3 — a party of 2 or 3 fits, 4 does not; with 3 there, a party of 2 is refused for capacity, not for the room', async () => {
  let R = new Rooms(doState()); await strangers(R, 1);
  let r = await join(R, { ...ID(PEGGY) }, KEY, 'A', 2); assert.equal(r.status, 200, 'the reported case: a party of 2 beside one guest'); assert.equal(unitA(r.d).free, 1);
  R = new Rooms(doState()); await strangers(R, 1);
  assert.equal((await join(R, stranger('Q3'), KEY, 'A', 3)).status, 200, 'a party of 3 beside one guest');
  R = new Rooms(doState()); await strangers(R, 1);
  r = await join(R, stranger('Q4'), KEY, 'A', 4); assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party'); assert.equal(r.d.free, 3);
  R = new Rooms(doState()); await strangers(R, 3);
  r = await join(R, stranger('Q2'), KEY, 'A', 2); assert.equal(r.status, 409); assert.equal(r.d.free, 1, 'one place left: the remaining capacity refuses a party of 2');
  assert.equal((await join(R, stranger('Q1'), KEY, 'A', 1)).status, 200, 'the fourth place is taken');
  r = await join(R, stranger('Q0'), KEY, 'A', 1); assert.equal(r.status, 409); assert.equal(r.d.error, 'full', 'four is full');
  assert.equal(r.d.summary[KEY].soldOut, true);
});

test('THE WORDS (the shipped client on the shipped engine, as Peggy · a party of 2) · beside one guest the suite can be chosen and says 3 places free; beside three it says there is no room for the 2 of you', async () => {
  const R = new Rooms(doState()); await strangers(R, 1);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(R, ID(PEGGY)) });
  const U = w.SIYL_UNITS; await U.load(true); assert.equal(U.ready(), true);
  const a = U.units('kmg', 'penang')[0];
  assert.equal(a.places, 4); assert.equal(a.free, 3);
  assert.equal(U.fitsParty('kmg', 'penang', a, 2), true); assert.equal(U.canTake('kmg', 'penang', 2), true);
  assert.equal(U.ctaWords('kmg', 'penang'), '', 'no "No room here for the 2 of you together" for a party that fits');
  assert.match(U.unitWords(a), /3 places free/);
  assert.deepEqual(plain(U.count('kmg', 'penang')), { rooms: 1, places: 4, reserved: 0, free: 3, open: 1, empty: 0, shared: 3 });
  await strangers(R, 3).catch(() => {});   /* S1 is already there: two more fill it to three */
  await U.load(true);
  const b = U.units('kmg', 'penang')[0];
  assert.equal(b.free, 1);
  assert.equal(U.canTake('kmg', 'penang', 2), false);
  assert.equal(U.ctaWords('kmg', 'penang'), U.need('kmg') > 1 ? 'No room here for the ' + U.need('kmg') + ' of you together' : '', 'refused for the remaining capacity');
  assert.equal(U.canTake('kmg', 'penang', 1), true, 'a guest alone still fits the last place');
  assert.ok(STEFFIE);
});
