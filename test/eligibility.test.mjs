/* ROOM INVENTORY (Owner override, 15 Sep 2026). NO PRE-RESERVED ROOMS: nothing
   is held for the Bride & Groom, the family or anyone else in advance — every
   physical room is available until a guest actually books a place in it, and
   the couple book their own two places like everyone else. The PHYSICAL ROOM
   COUNT is the inventory: one physical room = one persistent allocation unit
   = two individual guest places (a single room = one place). Capacity is units
   × places, never a separate counter; only real bookings consume it. The rule
   lives in the engine and the browser must agree with it. No access code
   appears here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SEED } from '../src/inventory-seed.js';
import { Rooms, unitsOf, mayJoin, PLACES } from '../src/rooms.js';
import { HARUTHAI, SUTHEP, PEGGY, STEFFIE, LIN } from './sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* the browser calculation source with a given session */
function priceWith(auth) {
  const store = new Map(); if (auth) store.set('siyl.auth', JSON.stringify(auth));
  const sb = { window: {}, document: { addEventListener() {} }, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null) } };
  sb.window = sb; vm.createContext(sb);
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js']) vm.runInContext(src(f), sb, { filename: f });
  return { P: sb.window.SIYL_PRICE, ROOMS: sb.window.SIYL_ROOMS };
}

/* the engine: a Durable Object stand-in, the identity as the Worker verified it */
function engine() {
  const m = new Map();
  const state = { storage: { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix))) }, blockConcurrencyWhile: (fn) => fn() };
  const R = new Rooms(state);
  const call = async (op, body, as) => { const r = await R.fetch(new Request('https://x/api/rooms/' + op, { method: body ? 'POST' : 'GET', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: body ? JSON.stringify(body) : undefined })); return { status: r.status, ...(await r.json()) }; };
  return { call };
}
const asId = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });
const join = (E, s, key, label) => E.call('join', { invitationId: s.invitationId, guestId: s.guestId, key, label, name: s.preferredName }, asId(s));

test('NO PRE-RESERVED ROOMS · no unit carries a reservation; the historical held notes have no effect; any guest may take any unit', () => {
  for (const key of Object.keys(SEED)) for (const u of unitsOf(key)) assert.equal(u.reservedFor, null, key + ' ' + u.label);
  /* the categories the Master once marked are open like every other */
  for (const key of ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'kmg/solarium', 'ljg/view-suite-270', 'prewed/grand-majestic', 'wedstay/grand-majestic']) {
    assert.equal(mayJoin(unitsOf(key)[0], asId(PEGGY)).ok, true, key + ' open to a guest');
    assert.equal(mayJoin(unitsOf(key)[0], asId(LIN)).ok, true, key + ' open to a guest without a hosts flag');
    assert.equal(mayJoin(unitsOf(key)[0], asId(HARUTHAI)).ok, true, key + ' open to the hosts like everyone');
  }
  assert.equal(mayJoin(unitsOf('kmg/solarium')[0], null).ok, false, 'nobody joins without an identity');
  /* the browser agrees: no room is reserved for anyone */
  const { P, ROOMS } = priceWith(PEGGY);
  for (const [, s] of Object.entries(ROOMS)) for (const r of s.rooms || []) { assert.equal(P.eligible(r), true, r.name); assert.equal(r.reserved, undefined, r.name + ' carries no reservation label'); }
  assert.equal(P.reservedFor({ reserved: 'Reserved for bride & groom' }), null);
  assert.equal(priceWith(HARUTHAI).P.hosts(), true, 'the hosts flag still says who the hosts are (ceremony positions) — it opens no room');
  /* no guest-facing reservation wording remains on the active surfaces */
  for (const f of ['journeys.html', 'room.html', 'your-journey.html', 'assets/stay.js', 'assets/rooms.js', 'assets/journey.js']) {
    assert.doesNotMatch(src(f).replace(/\/\*[\s\S]*?\*\//g, ''), /Reserved for (bride|family)|RESERVED FOR|yours to choose|held for you|This category is reserved/i, f);
  }
});

test('PHYSICAL ROOM COUNT IS AUTHORITATIVE · 1 room → 1 unit → 2 places; 5 → 5 → 10; 6 → A–F → 12, never a Room G; a single room is one place', () => {
  assert.equal(PLACES, 2);
  const one = unitsOf('prewed/souphattra-presidential'); assert.equal(one.length, 1); assert.deepEqual(one.map((u) => u.label), ['A']); assert.equal(one[0].places, 2);
  const five = unitsOf('wedstay/heritage'); assert.equal(five.length, 5); assert.deepEqual(five.map((u) => u.label), ['A', 'B', 'C', 'D', 'E']); assert.equal(five.reduce((n, u) => n + u.places, 0), 10);
  /* the Owner's six-room Penthouse: exactly Room A – F, exactly twelve guest places */
  const pent = unitsOf('bkk-stay/penthouse'); assert.equal(pent.length, 6); assert.deepEqual(pent.map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']); assert.equal(pent.reduce((n, u) => n + u.places, 0), 12);
  assert.ok(!pent.some((u) => u.label === 'G')); assert.ok(pent.every((u) => u.kind === 'room' && u.places === 2));
  const thirteen = unitsOf('wedstay/heritage-executive'); assert.equal(thirteen.length, 13); assert.equal(thirteen.reduce((n, u) => n + u.places, 0), 26);
  /* singles */
  for (const key of ['kmg/light-french', 'ljg/snow-mountain-viewing']) for (const u of unitsOf(key)) assert.equal(u.places, 1, key + ' is a single room: one place');
  /* the invariant across the whole inventory: units = source room count; places = count × 2 for standard rooms */
  for (const [key, s] of Object.entries(SEED)) {
    const units = unitsOf(key);
    if (s.unit === 'guest') { assert.equal(units.length, 1, key); assert.equal(units[0].places, s.capacity, key + ' sleeps what the source says'); continue; }
    assert.equal(units.length, s.capacity, key + ' units = source room count');
    assert.equal(units.reduce((n, u) => n + u.places, 0), s.capacity * (s.occupancy === 1 ? 1 : 2), key + ' places = rooms × 2 (singles × 1)');
  }
});

test('BOOKING · one occupant → 1 place available; two → FULL; a third guest is refused and the room is unchanged; separate codes join the same room', async () => {
  const E = engine(), key = 'prewed/souphattra-presidential';
  const r0 = await E.call('read', null, asId(HARUTHAI));
  assert.equal(r0.units[key][0].free, 2); assert.equal(r0.units[key][0].eligible, true); assert.equal(r0.summary[key].free, 2); assert.equal(r0.summary[key].rooms, 1);
  const h = await join(E, HARUTHAI, key, 'A'); assert.equal(h.status, 200);
  assert.equal(h.units[key][0].free, 1); assert.deepEqual(h.units[key][0].occupants.map((o) => o.name), ['Haruthai']);
  /* Suthep, on his own code, sees Haruthai and one place, and joins the same room */
  const seen = await E.call('read', null, asId(SUTHEP));
  assert.deepEqual(seen.units[key][0].occupants.map((o) => [o.name, o.mine]), [['Haruthai', false]]); assert.equal(seen.units[key][0].free, 1);
  const s = await join(E, SUTHEP, key, 'A'); assert.equal(s.status, 200); assert.equal(s.units[key][0].full, true);
  assert.deepEqual(s.units[key][0].occupants.map((o) => o.name), ['Haruthai', 'Suthep']);
  /* a third guest is refused — the room stays exactly as it was */
  const p = await join(E, PEGGY, key, 'A'); assert.equal(p.status, 409); assert.equal(p.ok, false); assert.equal(p.error, 'full');
  const after = await E.call('read', null, asId(PEGGY));
  assert.deepEqual(after.units[key][0].occupants.map((o) => o.name), ['Haruthai', 'Suthep']); assert.equal(after.summary[key].free, 0); assert.equal(after.summary[key].rooms, 0);
  /* a guest is refused a place for another guest */
  const forOther = await E.call('join', { invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, key: 'wedstay/heritage', label: 'A', name: 'x' }, asId(PEGGY));
  assert.equal(forOther.status, 403);
  /* the plan, without an identity: counts only */
  const plain = await E.call('read');
  assert.equal(plain.units[key][0].taken, 2); assert.deepEqual(plain.units[key][0].occupants, [{}, {}]);
});

test('CAPACITY · the six-room Penthouse fills at twelve and never beyond; counters are derived from the units, never a separate stock', async () => {
  const E = engine(), key = 'bkk-stay/penthouse';
  const guests = [HARUTHAI, SUTHEP, PEGGY, STEFFIE, LIN, { ...LIN, guestId: 'g-6', invitationId: 'INV-g-6' }, { ...LIN, guestId: 'g-7', invitationId: 'INV-g-7' }, { ...LIN, guestId: 'g-8', invitationId: 'INV-g-8' },
    { ...LIN, guestId: 'g-9', invitationId: 'INV-g-9' }, { ...LIN, guestId: 'g-10', invitationId: 'INV-g-10' }, { ...LIN, guestId: 'g-11', invitationId: 'INV-g-11' }, { ...LIN, guestId: 'g-12', invitationId: 'INV-g-12' }];
  let i = 0;
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) for (let k = 0; k < 2; k++) { const r = await join(E, guests[i++], key, label); assert.equal(r.status, 200, label + ' ' + k); }
  const v = await E.call('read', null, asId(HARUTHAI));
  assert.equal(v.summary[key].units, 6); assert.equal(v.summary[key].places, 12); assert.equal(v.summary[key].free, 0); assert.equal(v.summary[key].rooms, 0);
  const g13 = { ...LIN, guestId: 'g-13', invitationId: 'INV-g-13' };
  for (const label of ['A', 'F']) { const no = await join(E, g13, key, label); assert.equal(no.status, 409, label + ' is full'); }
  const g = await join(E, g13, key, 'G'); assert.equal(g.status, 404, 'there is no Room G');
  /* release one → exactly one place, one room */
  const left = await E.call('leave', { invitationId: SUTHEP.invitationId, guestId: SUTHEP.guestId, key }, asId(SUTHEP));
  assert.equal(left.summary[key].free, 1); assert.equal(left.summary[key].rooms, 1);
  assert.equal(left.summary[key].free, left.units[key].reduce((n, u) => n + u.free, 0), 'the summary is the sum of the units');
});

test('CHANGE · atomic: the new place is held first, the old one released only then; a full target leaves the guest where they were', async () => {
  const E = engine(), key = 'wedstay/heritage';
  await join(E, HARUTHAI, key, 'A');
  const moved = await join(E, HARUTHAI, key, 'B');
  assert.equal(moved.status, 200); assert.equal(moved.units[key][0].taken, 0); assert.equal(moved.units[key][1].taken, 1); assert.deepEqual(moved.mine, { wedstay: { key, label: 'B' } });
  await join(E, PEGGY, key, 'C'); await join(E, STEFFIE, key, 'C');
  const blocked = await join(E, HARUTHAI, key, 'C');
  assert.equal(blocked.status, 409); assert.deepEqual(blocked.mine, { wedstay: { key, label: 'B' } }, 'still in B'); assert.equal(blocked.units[key][2].taken, 2, 'C unchanged');
  /* never counted twice: one place per stage across the hotel and the residence */
  const res = await join(E, HARUTHAI, 'airbnb-2br/private-residence', 'A');
  if (res.status === 200) { assert.equal(res.units[key][1].taken, 0, 'the hotel place is released for the residence'); assert.deepEqual(res.mine, { wedstay: { key: 'airbnb-2br/private-residence', label: 'A' } }); }
  /* a refresh returns the authoritative occupancy */
  const again = await E.call('read', null, asId(PEGGY));
  assert.equal(again.units[key][2].taken, 2); assert.equal(again.units[key][2].full, true);
});

test('PRESETS · the approved rooms come from the open inventory; the Presidential is a room like any other', () => {
  const { P } = priceWith(PEGGY);
  assert.equal(P.premium('prewed').slug, 'souphattra-presidential', 'the dearest room a guest may take is the Presidential — nothing is held back');
  assert.ok(P.approved('prewed').slug); assert.ok(P.cheapest('prewed').slug);
});

test('THE WORDS · category lines are derived from the physical rooms: rooms with a place left · unused places; "Your place is held" only for a real allocation', () => {
  const store = new Map(); store.set('siyl.auth', JSON.stringify(PEGGY));
  const sb = { window: {}, document: { addEventListener() {}, dispatchEvent() {} }, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) }, location: { hostname: 'localhost' }, CustomEvent: class { constructor(t) { this.type = t; } }, fetch: () => Promise.reject(new Error('no network')) };
  sb.window = sb; vm.createContext(sb);
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/rooms.js']) vm.runInContext(src(f), sb, { filename: f });
  const U = sb.window.SIYL_UNITS;
  const view = { ok: true, places: 2, mine: {}, units: {
    'wedstay/heritage': [{ label: 'A', name: 'Room A', kind: 'room', places: 2, reservedFor: null, eligible: true, occupants: [{ name: 'Haruthai' }], taken: 1, free: 1, full: false },
                         { label: 'B', name: 'Room B', kind: 'room', places: 2, reservedFor: null, eligible: true, occupants: [{ name: 'Lin' }, { name: 'Noor' }], taken: 2, free: 0, full: true },
                         { label: 'C', name: 'Room C', kind: 'room', places: 2, reservedFor: null, eligible: true, occupants: [], taken: 0, free: 2, full: false }],
    'wedstay/souphattra-presidential': [{ label: 'A', name: 'Room A', kind: 'room', places: 2, reservedFor: null, eligible: true, occupants: [{ name: 'Haruthai' }, { name: 'Suthep' }], taken: 2, free: 0, full: true }],
    'airbnb-2br/private-residence': [{ label: 'A', name: 'Private Residence', kind: 'property', places: 6, reservedFor: null, eligible: true, occupants: [], taken: 0, free: 6, full: false }] },
    summary: { 'wedstay/heritage': { units: 3, places: 6, free: 3, rooms: 2, reservedFor: null }, 'wedstay/souphattra-presidential': { units: 1, places: 2, free: 0, rooms: 0, reservedFor: null }, 'airbnb-2br/private-residence': { units: 1, places: 6, free: 6, rooms: 1, reservedFor: null } } };
  U._set(view);
  assert.equal(U.label('wedstay', 'heritage'), '2 rooms · 3 places available');
  assert.equal(U.label('wedstay', 'souphattra-presidential'), 'Fully booked');
  assert.equal(U.label('airbnb-2br', 'private-residence'), '6 places available');
  assert.deepEqual(JSON.parse(JSON.stringify(U.count('wedstay', 'heritage'))), { rooms: 3, places: 6, free: 3, open: 2 });
  assert.equal(U.unitWords(view.units['wedstay/heritage'][0]), 'Haruthai · 1 place available');
  assert.equal(U.unitWords(view.units['wedstay/heritage'][1]), 'Lin · Noor · Full');
  assert.equal(U.unitWords(view.units['wedstay/heritage'][2]), '2 places · Available');
  view.mine = { wedstay: { key: 'wedstay/heritage', label: 'A' } }; view.units['wedstay/heritage'][0].occupants[0].mine = true; U._set(view);
  assert.equal(U.label('wedstay', 'heritage'), 'Your place is held · Room A');
  assert.equal(U.unitWords(view.units['wedstay/heritage'][0]), 'You · 1 place available');
});

test('SURFACES · the room page shows every physical room of the category with its places; the journeys rows carry no reservation state; the engine read carries the bearer', () => {
  const room = src('room.html'), journeys = src('journeys.html'), inv = src('assets/rooms.js'), stay = src('assets/stay.js');
  assert.match(room, /data-rooms-box="' \+ w\.id \+ '"/); assert.match(room, /box\.innerHTML = ST\.unitsHtml\(w\.id, room\.slug\)/); assert.match(room, /assets\/prep\.css/);
  assert.doesNotMatch(room, /rsvline|P\.eligible\(room\)|P\.eligible\(r\)/);
  assert.doesNotMatch(journeys, /' rsvd'|yours to choose/);
  assert.match(inv, /h\['x-siyl-auth'\] = a\.bearer/);
  assert.match(stay, /var state = x\.full \? 'Full' : \(x\.free === 1 \? '1 place available' : x\.free \+ ' places available'\);/);
  assert.doesNotMatch(stay, /Reserved for/);
  const hostsFn = src('assets/pricing.js').match(/hosts: function \(\) \{[^}]*\}/)[0];
  assert.doesNotMatch(hostsFn, /Haruthai|Suthep|preferredName|fullName/, 'no name decides anything in the calculation source');
});
