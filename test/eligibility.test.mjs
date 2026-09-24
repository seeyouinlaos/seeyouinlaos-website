/* ROOM INVENTORY (Owner override, 15 Sep 2026 · reaffirmed 19 Sep 2026, release 014). NO PRE-RESERVED ROOMS, NO FIXED
   ARRANGEMENT: nothing is held for the Bride & Groom, the family or anyone else in advance — every physical room is
   available until a guest actually books a place in it, and the hosts start at zero and book their own places like
   every guest. The PHYSICAL ROOM COUNT is the inventory: one physical room = one persistent allocation unit = two
   individual guest places (no room in the source is a single); the Guest House complimentary is ONE shared unit of SIX
   places. Capacity is units × places, never a separate counter; only real bookings consume it. The rule lives in the
   engine and the browser must agree with it. No access code appears here. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { Rooms, unitsOf, mayJoin, stageOf, STAGES, PLACES } from '../src/rooms.js';
import { HARUTHAI, SUTHEP, PEGGY, STEFFIE, LIN, page, roomsFetch, plain } from './sandbox.mjs';

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
  return { call, R };
}
const asId = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });
const join = (E, s, key, label) => E.call('join', { invitationId: s.invitationId, guestId: s.guestId, key, label, name: s.preferredName }, asId(s));
const other = (id, name) => ({ ...LIN, guestId: 'g-' + id, invitationId: 'INV-g-' + id, preferredName: name || 'Lin' });

/* the guest surfaces and scripts whose words the guest reads (block comments stripped: a note about the retired concept is not the concept) */
const SURFACES = ['your-journey.html', 'profile.html', 'review.html', 'cart.html', 'journeys.html', 'room.html', 'accommodation.html',
  'assets/rooms.js', 'assets/stay.js', 'assets/journey.js', 'assets/stage-graph.js', 'assets/guest.js', 'assets/rooms-data.js',
  'src/rooms.js', 'src/inventory-seed.js', 'src/worker.js', 'src/mail-templates.js'];
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '');

test('NO RESERVATIONS, NO FIXED ARRANGEMENT (Owner, 15 Sep 2026 · reaffirmed 19 Sep 2026, release 014) · nothing is held for anyone in advance; every room of every category is open to any authenticated guest — the hosts have no special room and start at zero like every guest; nobody joins without an identity; the words never say RESERVED, arranged or fixed', async () => {
  /* the seed: FIXED is an empty export; no entry holds anything for anybody */
  assert.deepEqual(FIXED, []);
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.ok(!('heldFor' in s), key + ' is held for nobody'); }
  /* the units: reservedFor is null everywhere; mayJoin asks only for an identity — a guest, a host, anyone signed in */
  for (const key of Object.keys(SEED)) for (const u of unitsOf(key)) {
    assert.equal(u.reservedFor, null, key + ' ' + u.label + ' is reserved for nobody');
    for (const who of [PEGGY, LIN, HARUTHAI, SUTHEP]) assert.equal(mayJoin(u, asId(who)).ok, true, key + ' ' + u.label + ' is open to ' + who.preferredName);
    assert.equal(mayJoin(u, null).ok, false, 'nobody joins without an identity');
  }
  assert.equal(mayJoin(null, asId(PEGGY)).ok, false, 'no unit, no place');
  /* the former Bride & Groom rooms: nobody's before a booking; the first guest to choose them has them; the hosts hold nothing there */
  const E = engine();
  const v0 = await E.call('read', null, asId(HARUTHAI));
  assert.deepEqual(v0.mine, {}, 'the hosts start at zero'); assert.deepEqual(v0.waitlist, {});
  for (const key of ['bkk-stay/u-sathorn-superior-garden', 'prewed/souphattra-presidential', 'wedstay/souphattra-presidential']) {
    const a = v0.units[key][0];
    assert.equal(a.taken, 0, key + ' Room A is nobody\'s before a booking'); assert.deepEqual(a.occupants, []); assert.equal(a.full, false); assert.equal(a.eligible, true); assert.equal(a.reservedFor, null);
    assert.equal(v0.summary[key].reserved, 0, key); assert.equal(v0.summary[key].reservedFor, null); assert.equal(v0.summary[key].ownerReservedRooms, 0); assert.equal(v0.summary[key].ownerReservedPlaces, 0);
    const p = await join(E, PEGGY, key, 'A'); assert.equal(p.status, 200, key + ' Room A is Peggy\'s the moment she books it');
    assert.deepEqual(p.units[key][0].occupants.map((o) => [o.name, o.mine]), [['Peggy', true]]);
  }
  /* U Sathorn Room A (the six-room Bangkok category since the Sathorn Penthouse was deleted, Edit 6) is a room like any other: a host joins the guest already there; the second host finds it full */
  const h = await join(E, HARUTHAI, 'bkk-stay/u-sathorn-superior-garden', 'A'); assert.equal(h.status, 200); assert.equal(h.units['bkk-stay/u-sathorn-superior-garden'][0].full, true);
  const s = await join(E, SUTHEP, 'bkk-stay/u-sathorn-superior-garden', 'A'); assert.equal(s.status, 409); assert.equal(s.ok, false); assert.equal(s.error, 'full', 'a host is refused a full room like any guest — never 403, never a reservation');
  assert.equal((await join(E, SUTHEP, 'bkk-stay/u-sathorn-superior-garden', 'B')).status, 200, 'and books the next room like any guest');
  /* the wedding window is ONE stage whether spent in the hotel, the Guest House or the Riverside */
  assert.deepEqual(STAGES, ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']);
  assert.equal(stageOf('guesthouse/guest-house'), 'wedstay'); assert.equal(stageOf('wedstay/heritage'), 'wedstay');
  /* D2 · the Guest House complimentary: ONE shared unit of FOUR places (one bedroom, Edit 7), kind property, named as the Owner names it; the invented key is gone */
  assert.deepEqual(unitsOf('guesthouse/guest-house').map((u) => [u.label, u.kind, u.places, u.name, u.reservedFor]), [['A', 'property', 4, 'Guest House complimentary', null]]);
  assert.deepEqual(unitsOf('airbnb-2br/private-residence'), [], 'there is no Private Residence');
  assert.ok(!('airbnb-2br/private-residence' in SEED)); assert.equal(SEED['guesthouse/guest-house'].capacity, 4);

  /* the pages, signed in as a host on a fresh engine: nothing arranged, nothing fixed, nothing reserved — the Bag carries only actual selections and stands at USD 0 with nothing chosen */
  const E2 = engine();
  const w = page({ auth: HARUTHAI, fetch: await roomsFetch(E2.R, asId(HARUTHAI)) });
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  await U.load(true); assert.equal(U.ready(), true); ST.sync();
  assert.equal(w.SIYL_ARRANGED, undefined, 'window.SIYL_ARRANGED does not exist');
  assert.equal(U.fixed('bkk-stay'), false); assert.equal(U.fixedUnit('bkk-stay'), null); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.reserved('bkk-stay', 'u-sathorn-superior-garden'), false); assert.equal(U.reserved('wedstay', 'souphattra-presidential'), false);
  assert.equal(ST.fixed('bkk-stay'), false); assert.equal(ST.fixedSlug('bkk-stay'), '');
  assert.equal(U.mine('bkk-stay'), null, 'no Sathorn room is the hosts\' before they book it'); assert.deepEqual(plain(U.view().mine), {});
  assert.deepEqual(plain(B.get()), [], 'the Bag carries only actual selections'); assert.equal(B.total(), 0);
  assert.ok(J.SEGMENTS.length === 10 && J.SEGMENTS.every((seg) => J.state(seg) === 'open'), 'every stage of the hosts\' trip is open — none is arranged');
  const c = J.counts();
  assert.equal(c.confirmed, 0); assert.equal(c.bagItems, 0); assert.equal(c.bagTotal, 0); assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open);
  /* the unit chooser: six rooms, six Choose buttons — Room A included; no room reads Reserved */
  const html = ST.unitsHtml('bkk-stay', 'u-sathorn-superior-garden');
  assert.equal((html.match(/data-join="bkk-stay\|u-sathorn-superior-garden\|[A-F]"/g) || []).length, 6, 'six rooms, six Choose buttons'); assert.match(html, /data-join="bkk-stay\|u-sathorn-superior-garden\|A"/);
  assert.doesNotMatch(html, /Reserved|data-reserved|Arranged|Fixed/i); assert.equal((html.match(/Choose this room/g) || []).length, 6);
  const gh = ST.unitsHtml('guesthouse', 'guest-house');
  assert.match(gh, /Guest House complimentary/); assert.match(gh, /4 places available/); assert.match(gh, /data-join="guesthouse\|guest-house\|A"/); assert.doesNotMatch(gh, /Private Residence|up to 4/i);

  /* the words: the fixed arrangement, the reservation and the invented residence are gone from every guest surface and script */
  assert.ok(!fs.existsSync(path.join(ROOT, 'assets/arranged.js')), 'assets/arranged.js is deleted');
  for (const f of SURFACES) {
    const t = code(f);
    assert.doesNotMatch(t, /arranged\.js|SIYL_ARRANGED|Arranged for you|Fixed arrangement|fixedStagesOf|withoutFixed/i, f + ' carries no fixed arrangement');
    assert.doesNotMatch(t, /Reserved for (bride|family)|held for you|This category is reserved|Reserved · Bride/i, f + ' carries no reservation wording');
    /* "up to four" was the invented residence's capacity; since Edit 7 (Owner, 24 Sep 2026) the Guest House itself is one bedroom
       shared by up to four guests, so the ban is on the invented residence, never on the house's own true number */
    assert.doesNotMatch(t, /Private Residence|private-residence|airbnb-2br/i, f + ' never says Private Residence');
  }
  for (const f of ['src/rooms.js', 'assets/rooms.js', 'assets/stay.js']) assert.doesNotMatch(code(f), /\.hosts\b|hostRole|Haruthai|Suthep/, f + ' special-cases nobody');
  const hostsFn = src('assets/pricing.js').match(/hosts: function \(\) \{[^}]*\}/)[0];
  assert.doesNotMatch(hostsFn, /Haruthai|Suthep|preferredName|fullName/, 'no name decides anything in the calculation source');
});

test('PHYSICAL ROOM COUNT IS AUTHORITATIVE · 1 room → 1 unit → 2 places; 5 → 5 → 10; 6 → A–F → 12, never a Room G; the two former "singles" sleep two adults as the source says', () => {
  assert.equal(PLACES, 2);
  const one = unitsOf('prewed/souphattra-presidential'); assert.equal(one.length, 1); assert.deepEqual(one.map((u) => u.label), ['A']); assert.equal(one[0].places, 2);
  const five = unitsOf('wedstay/heritage'); assert.equal(five.length, 5); assert.deepEqual(five.map((u) => u.label), ['A', 'B', 'C', 'D', 'E']); assert.equal(five.reduce((n, u) => n + u.places, 0), 10);
  /* a six-room category (U Sathorn Bangkok — the Sathorn Penthouse deleted, Edit 6): exactly Room A – F, exactly twelve guest places */
  const pent = unitsOf('bkk-stay/u-sathorn-superior-garden');
  assert.equal(SEED['bkk-stay/penthouse'], undefined, 'the Sathorn Penthouse is deleted (Edit 6, 24 Sep 2026)'); assert.equal(pent.length, 6); assert.deepEqual(pent.map((u) => u.label), ['A', 'B', 'C', 'D', 'E', 'F']); assert.equal(pent.reduce((n, u) => n + u.places, 0), 12);
  assert.ok(!pent.some((u) => u.label === 'G')); assert.ok(pent.every((u) => u.kind === 'room' && u.places === 2));
  const thirteen = unitsOf('wedstay/heritage-executive'); assert.equal(thirteen.length, 13); assert.equal(thirteen.reduce((n, u) => n + u.places, 0), 26);
  /* the Light French Suite and the Snow Mountain Viewing Room: Pax "2 Adults" in Accommodation_Details → two places each (final release, 15 Sep 2026) */
  for (const key of ['kmg/light-french', 'ljg/snow-mountain-viewing']) for (const u of unitsOf(key)) assert.equal(u.places, 2, key + ' sleeps two adults: two places');
  assert.ok(!Object.values(SEED).some((s) => s.unit === 'room' && s.occupancy === 1), 'no room is seeded as a single');
  /* the invariant across the whole inventory: units = source room count; places = count × 2 for standard rooms */
  for (const [key, s] of Object.entries(SEED)) {
    const units = unitsOf(key);
    if (s.unit === 'guest') { assert.equal(units.length, 1, key); assert.equal(units[0].places, s.capacity, key + ' sleeps what the source says'); continue; }
    assert.equal(units.length, s.capacity, key + ' units = source room count');
    assert.equal(units.reduce((n, u) => n + u.places, 0), s.capacity * (s.occupancy === 1 ? 1 : 2), key + ' places = rooms × 2 (singles × 1)');
  }
});

test('BOOKING · one occupant → 1 place available; two → FULL; a third guest is refused and the room is unchanged; separate codes join the same room', async () => {
  const E = engine(), key = 'prewed/noble-courtyard';   /* one open room of two places */
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

test('CAPACITY · the six-room U Sathorn category fills at twelve and never beyond; Room A is nobody\'s before a booking and the hosts fill the rooms like any guest; a thirteenth guest waits in line and takes the first place freed; counters are derived from the units, never a separate stock', async () => {
  const E = engine(), key = 'bkk-stay/u-sathorn-superior-garden';
  /* twelve guests — a guest first, then the hosts among the rest — two per room */
  const guests = [PEGGY, HARUTHAI, SUTHEP, STEFFIE, LIN, other('6'), other('7'), other('8'), other('9'), other('10'), other('11'), other('12')];
  /* before anyone books: six physical rooms, twelve places, all of them available to any guest — nothing reserved, nothing fixed */
  const v0 = await E.call('read', null, asId(PEGGY));
  assert.equal(v0.summary[key].units, 6); assert.equal(v0.summary[key].places, 12); assert.equal(v0.summary[key].reserved, 0); assert.equal(v0.summary[key].reservedFor, null);
  assert.equal(v0.summary[key].rooms, 6); assert.equal(v0.summary[key].free, 12); assert.equal(v0.summary[key].largestFree, 2); assert.equal(v0.summary[key].soldOut, false);
  const a0 = v0.units[key][0]; assert.equal(a0.taken, 0); assert.equal(a0.free, 2); assert.equal(a0.full, false); assert.deepEqual(a0.occupants, []); assert.equal(a0.eligible, true); assert.equal(a0.reservedFor, null);
  let i = 0;
  for (const label of ['A', 'B', 'C', 'D', 'E', 'F']) for (let k = 0; k < 2; k++) { const r = await join(E, guests[i++], key, label); assert.equal(r.status, 200, label + ' ' + k); }
  const v = await E.call('read', null, asId(PEGGY));
  assert.equal(v.summary[key].units, 6); assert.equal(v.summary[key].places, 12); assert.equal(v.summary[key].free, 0); assert.equal(v.summary[key].rooms, 0); assert.equal(v.summary[key].largestFree, 0); assert.equal(v.summary[key].soldOut, true);
  assert.equal(v.units[key].reduce((n, u) => n + u.taken, 0), 12, 'twelve places taken by twelve real bookings'); assert.ok(v.units[key].every((u) => u.full));
  assert.deepEqual(v.units[key][0].occupants.map((o) => o.name).sort(), ['Haruthai', 'Peggy'], 'Room A: a guest and a host, first come first served');
  /* a thirteenth guest: A is full like any other room (409, never a reservation), F is full, there is no Room G */
  const g13 = other('13');
  const a = await join(E, g13, key, 'A'); assert.equal(a.status, 409); assert.equal(a.error, 'full', 'A is full — not the hosts\''); assert.equal((await join(E, g13, key, 'F')).status, 409, 'F is full');
  const g = await join(E, g13, key, 'G'); assert.equal(g.status, 404, 'there is no Room G');
  /* … and takes a place in the line for the stage: one entry, position 1, nothing held, nothing charged */
  const wl = await E.call('wait', { invitationId: g13.invitationId, guestId: g13.guestId, stage: 'bkk-stay', size: 1, wanted: [key], name: g13.preferredName }, asId(g13));
  assert.equal(wl.status, 200); assert.equal(wl.waited, 'bkk-stay'); assert.equal(wl.waitlist['bkk-stay'].position, 1); assert.equal(wl.waitlist['bkk-stay'].size, 1); assert.deepEqual(wl.waitlist['bkk-stay'].wanted, [key]); assert.equal(wl.waiting['bkk-stay'], 1); assert.deepEqual(wl.mine, {});
  /* release one → exactly one place, one room; the summary is the sum of the units */
  const left = await E.call('leave', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key }, asId(PEGGY));
  assert.equal(left.summary[key].free, 1); assert.equal(left.summary[key].rooms, 1); assert.equal(left.summary[key].largestFree, 1); assert.equal(left.summary[key].soldOut, false);
  assert.equal(left.summary[key].free, left.units[key].reduce((n, u) => n + u.free, 0), 'the summary is the sum of the units');
  assert.equal(left.summary[key].guestOccupiedPlaces, 11); assert.equal(left.summary[key].places - left.summary[key].guestOccupiedPlaces, left.summary[key].remainingPlaces, 'capacity is units × places minus the real bookings');
  /* the thirteenth takes the freed place and leaves the line */
  const r13 = await join(E, g13, key, 'A'); assert.equal(r13.status, 200); assert.deepEqual(r13.mine, { 'bkk-stay': { key, label: 'A' } });
  assert.deepEqual(r13.waitlist, {}, 'a place held resolves the waiting-list entry'); assert.equal(r13.waiting['bkk-stay'] || 0, 0); assert.equal(r13.summary[key].free, 0);
});

test('CHANGE · atomic: the new place is held first, the old one released only then; a full target leaves the guest where they were', async () => {
  const E = engine(), key = 'wedstay/heritage';
  await join(E, HARUTHAI, key, 'A');
  const moved = await join(E, HARUTHAI, key, 'B');
  assert.equal(moved.status, 200); assert.equal(moved.units[key][0].taken, 0); assert.equal(moved.units[key][1].taken, 1); assert.deepEqual(moved.mine, { wedstay: { key, label: 'B' } });
  await join(E, PEGGY, key, 'C'); await join(E, STEFFIE, key, 'C');
  const blocked = await join(E, HARUTHAI, key, 'C');
  assert.equal(blocked.status, 409); assert.deepEqual(blocked.mine, { wedstay: { key, label: 'B' } }, 'still in B'); assert.equal(blocked.units[key][2].taken, 2, 'C unchanged');
  /* never counted twice: one place per stage across the hotel and the Guest House — the wedding window is one stage */
  const res = await join(E, HARUTHAI, 'guesthouse/guest-house', 'A');
  assert.equal(res.status, 200); assert.equal(res.units[key][1].taken, 0, 'the hotel place is released for the Guest House'); assert.deepEqual(res.mine, { wedstay: { key: 'guesthouse/guest-house', label: 'A' } });
  assert.equal(res.units['guesthouse/guest-house'][0].places, 4); assert.equal(res.units['guesthouse/guest-house'][0].free, 3);
  /* a refresh returns the authoritative occupancy */
  const again = await E.call('read', null, asId(PEGGY));
  assert.equal(again.units[key][2].taken, 2); assert.equal(again.units[key][2].full, true);
});

test('PRESETS · the approved rooms come from the open inventory; the Presidential is a room like any other', () => {
  const { P } = priceWith(PEGGY);
  assert.equal(P.premium('prewed').slug, 'souphattra-presidential', 'the dearest room a guest may take is the Presidential — nothing is held back');
  assert.ok(P.approved('prewed').slug); assert.ok(P.cheapest('prewed').slug);
});

test('THE WORDS · category lines are derived from the physical rooms the engine reports: rooms with a place left · unused places; a category full of real bookings says SOLD OUT (the engine\'s word, never a reservation); the Guest House counts its four shared places; a unit takes a whole party or not at all; "Your place is held" only for a real allocation; the waiting list has a position', async () => {
  const E = engine();
  const NOOR = other('noor', 'Noor'), ADA = other('ada', 'Ada'), BEN = other('ben', 'Ben');
  /* real bookings by other guests: the Heritage A half taken, B full; the Presidential full; Steffie (Peggy's party) in the Guest House */
  assert.equal((await join(E, HARUTHAI, 'wedstay/heritage', 'A')).status, 200);
  assert.equal((await join(E, LIN, 'wedstay/heritage', 'B')).status, 200); assert.equal((await join(E, NOOR, 'wedstay/heritage', 'B')).status, 200);
  assert.equal((await join(E, ADA, 'wedstay/souphattra-presidential', 'A')).status, 200); assert.equal((await join(E, BEN, 'wedstay/souphattra-presidential', 'A')).status, 200);
  assert.equal((await join(E, STEFFIE, 'guesthouse/guest-house', 'A')).status, 200);
  /* the shipped client reads the shipped engine, as Peggy */
  const w = page({ auth: PEGGY, modules: ['assets/rooms-data.js', 'assets/pricing.js', 'assets/rooms.js'], fetch: await roomsFetch(E.R, asId(PEGGY)) });
  const U = w.SIYL_UNITS; await U.load(true); assert.equal(U.ready(), true); assert.equal(U.error(), null);
  assert.equal(U.label('wedstay', 'heritage'), '4 rooms · 7 places available');
  assert.deepEqual(plain(U.count('wedstay', 'heritage')), { rooms: 5, places: 10, reserved: 0, free: 7, open: 4 });
  assert.equal(U.unitWords(U.units('wedstay', 'heritage')[0]), 'Haruthai · 1 place available');
  assert.equal(U.unitWords(U.units('wedstay', 'heritage')[1]), 'Lin · Noor · Full');
  assert.equal(U.unitWords(U.units('wedstay', 'heritage')[2]), '2 places · Available');
  /* a category full of real bookings: SOLD OUT — remainingPlaces === 0 and nothing else; never RESERVED, never "booked" */
  assert.equal(U.label('wedstay', 'souphattra-presidential'), 'Sold out'); assert.equal(U.soldOut('wedstay', 'souphattra-presidential'), true); assert.equal(U.fits('wedstay', 'souphattra-presidential'), false); assert.equal(U.ctaWords('wedstay', 'souphattra-presidential'), 'Sold out');
  assert.equal(U.reserved('wedstay', 'souphattra-presidential'), false); assert.equal(U.reserved('bkk-stay', 'u-sathorn-superior-garden'), false);
  assert.equal(U.unitWords(U.units('wedstay', 'souphattra-presidential')[0]), 'Ada · Ben · Full');
  /* U Sathorn: every room counts as available — Room A is nobody's */
  assert.equal(U.label('bkk-stay', 'u-sathorn-superior-garden'), '6 rooms · 12 places available'); assert.equal(U.unitWords(U.units('bkk-stay', 'u-sathorn-superior-garden')[0]), '2 places · Available'); assert.equal(U.fits('bkk-stay', 'u-sathorn-superior-garden'), true); assert.equal(U.ctaWords('bkk-stay', 'u-sathorn-superior-garden'), '');
  assert.deepEqual(plain(U.count('bkk-stay', 'u-sathorn-superior-garden')), { rooms: 6, places: 12, reserved: 0, free: 12, open: 6 });
  /* D2 · the Guest House complimentary: four shared places, one taken, the first name visible */
  const gh = U.units('guesthouse', 'guest-house')[0];
  assert.equal(U.label('guesthouse', 'guest-house'), '3 places available'); assert.equal(U.unitName(gh), 'Guest House complimentary'); assert.equal(U.unitWords(gh), 'Steffie · 3 places available');
  assert.deepEqual(plain(U.count('guesthouse', 'guest-house')), { rooms: 1, places: 4, reserved: 0, free: 3, open: 1 });
  assert.deepEqual(gh.occupants.map((o) => [o.name, o.party, o.mine]), [['Steffie', true, false]], 'a party member already in the house');
  /* PARTY CAPACITY: a unit takes the whole party (the members already in it count) or not at all */
  const heritage = U.units('wedstay', 'heritage');
  assert.equal(U.fitsParty('wedstay', 'heritage', heritage[0], 1), true); assert.equal(U.fitsParty('wedstay', 'heritage', heritage[0], 2), false, 'Room A has one place: not for a party of two'); assert.equal(U.fitsParty('wedstay', 'heritage', heritage[1], 1), false);
  assert.equal(U.unitForParty('wedstay', 'heritage', 2).label, 'C', 'the first room that takes both'); assert.equal(U.unitForParty('wedstay', 'heritage', 1).label, 'A');
  assert.equal(U.fitsParty('guesthouse', 'guest-house', gh, 2), true, 'Steffie is already there: one more place takes the party'); assert.equal(U.unitForParty('guesthouse', 'guest-house', 2).label, 'A');
  assert.equal(U.unitForParty('wedstay', 'souphattra-presidential', 1), null);
  /* "Your place is held" only for a real allocation: Peggy holds Room C through the shipped join */
  const j = await U.join('wedstay', 'heritage', 'C'); assert.equal(j.ok, true); assert.equal(j.status, 200);
  assert.equal(U.label('wedstay', 'heritage'), 'Your place is held · Room C'); assert.deepEqual(plain(U.mine('wedstay')), { key: 'wedstay/heritage', label: 'C' }); assert.equal(U.mineFor('wedstay', 'heritage').label, 'C'); assert.equal(U.mineFor('wedstay', 'souphattra-presidential'), null);
  assert.equal(U.unitWords(U.units('wedstay', 'heritage')[2]), 'You · 1 place available');
  assert.equal(U.label('bkk-stay', 'u-sathorn-superior-garden'), '6 rooms · 12 places available', 'another stage is untouched');
  /* THE WAITING LIST: a stage no room could take — one entry, positioned; a stage where a place is held refuses the line */
  const refused = await U.wait('wedstay', 2, ['wedstay/souphattra-presidential']); assert.equal(refused.ok, false); assert.equal(refused.status, 409); assert.equal(refused.error, 'a place is held in this stage');
  const waited = await U.wait('kmg', 2, ['kmg/solarium']); assert.equal(waited.ok, true);
  assert.equal(U.waitlisted('kmg').position, 1); assert.equal(U.waitlisted('kmg').size, 2); assert.deepEqual(plain(U.waitlisted('kmg').wanted), ['kmg/solarium']); assert.deepEqual(plain(U.waitlistedStages()), ['kmg']); assert.equal(U.waiting('kmg'), 1); assert.equal(U.waitlisted('wedstay'), null);
  assert.equal(U.label('kmg', 'solarium'), '1 room · 2 places available', 'the line holds nothing');
  /* a place held in the stage resolves the entry */
  const k = await U.join('kmg', 'solarium', 'A'); assert.equal(k.ok, true);
  assert.equal(U.waitlisted('kmg'), null); assert.deepEqual(plain(U.waitlistedStages()), []); assert.equal(U.waiting('kmg'), 0); assert.equal(U.label('kmg', 'solarium'), 'Your place is held · Room A');
  const un = await U.unwait('kmg'); assert.equal(un.ok, true, 'leaving a line one is not in changes nothing');
});

test('SURFACES · the room page shows every physical room of the category with its places; the journeys rows carry no reservation state; the engine read carries the bearer', () => {
  const room = src('room.html'), journeys = src('journeys.html'), inv = src('assets/rooms.js'), stay = src('assets/stay.js');
  assert.match(room, /data-rooms-box="' \+ w\.id \+ '"/); assert.match(room, /box\.innerHTML = ST\.unitsHtml\(w\.id, room\.slug\)/); assert.match(room, /assets\/prep\.css/);
  assert.doesNotMatch(room, /rsvline|P\.eligible\(room\)|P\.eligible\(r\)/);
  assert.doesNotMatch(journeys, /' rsvd'|yours to choose/);
  assert.match(inv, /h\['x-siyl-auth'\] = a\.bearer/);
  assert.match(stay, /var state = reserved \? 'Reserved · ' \+ esc\(x\.reservedFor\) : fullForMe \? 'Full' : keptForMe && !x\.free \? \(/, 'the factual states: available · places available · Full · a place kept for the party (release 014)');
  assert.doesNotMatch(stay, /Reserved for/);
  const hostsFn = src('assets/pricing.js').match(/hosts: function \(\) \{[^}]*\}/)[0];
  assert.doesNotMatch(hostsFn, /Haruthai|Suthep|preferredName|fullName/, 'no name decides anything in the calculation source');
});
