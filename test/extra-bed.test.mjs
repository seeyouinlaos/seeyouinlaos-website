/* ============================================================================
   A ROOM FOR THREE WITH AN EXTRA BED, A ROOM FOR TWO — EACH GUEST BOOKS THEIR OWN PLACE (Owner, 17 Nov 2026).
   The wedding stay's Heritage Executive Room I is configured for three: its two places and one extra bed, the bed for the
   three guest ids the Owners priced for that room (009, Owner order 15 Nov 2026) and for nobody else. Each person signs in
   with their own code and books their own place, whatever the order and whether or not the first one has sent her trip;
   the engine prices each by the 009 row naming them. Room E takes two. Roles only, synthetic codes and amounts — the real
   figures are checked by the read-only pricing guard (gate F1), never committed here.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { doState, plain } from './sandbox.mjs';
import { Rooms, unitsOf, unitsFor, bedsFor } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { bookingsOfSelections } from '../src/billing/bookings.js';
import { calculate } from '../src/billing/engine.js';

const KEY = 'wedstay/heritage-executive';
/* the three of Room I (the seed's guest ids), the couple of Room E, and guests the room is not configured for */
const who = (gid, party, extra) => ({ invitationId: 'INV-' + gid, guestId: gid, partyId: party || ('INV-P' + gid), hosts: false, firstName: 'N' + gid.slice(-3), ...(extra || {}) });
const PAYER = who('G032'), SECOND = who('G120'), THIRD = who('G121');
const PARENT1 = who('G124', 'INV-PE'), PARENT2 = who('G125', 'INV-PE');
const STRANGER = who('G050'), OTHER = who('G051'), MATE = who('G060', 'INV-PAYERPARTY');
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const view = async (rooms, as) => (await rooms.fetch(new Request('https://x/api/rooms/', { headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {} }))).json();
const join = (rooms, as, label, extra) => call(rooms, 'join', { invitationId: as.invitationId, guestId: as.guestId, key: KEY, label, ...(extra || {}) }, as);
const leave = (rooms, as) => call(rooms, 'leave', { invitationId: as.invitationId, guestId: as.guestId, key: KEY }, as);
const unitIn = (v, label) => v.units[KEY].find((u) => u.label === label);
const inI = async (rooms) => unitIn(await view(rooms, OTHER), 'I').taken;

test('EXTRA BED · the seed: the Owners give Room I (Heritage Executive) and Room D (The Heritage) of the wedding stay one extra bed each — a property of the room, never of a guest', () => {
  assert.deepEqual(plain(SEED[KEY].extraBeds), [{ label: 'I', beds: 1 }]);
  assert.deepEqual(plain(SEED['wedstay/heritage'].extraBeds), [{ label: 'D', beds: 1 }]);
  const units = unitsOf(KEY);
  assert.equal(units.length, 13, 'thirteen rooms, none added, none removed');
  const i = units.find((u) => u.label === 'I');
  assert.deepEqual([i.places, i.extraBeds, i.extraBedFor], [2, 1, undefined], 'two places of its own, the extra bed beyond them, no guest list');
  assert.ok(units.filter((u) => u.label !== 'I').every((u) => u.places === 2 && !u.extraBeds), 'no other Heritage Executive room changes');
  const d = unitsOf('wedstay/heritage').find((u) => u.label === 'D');
  assert.deepEqual([d.places, d.extraBeds], [2, 1]);
  assert.ok(unitsOf('wedstay/heritage').filter((u) => u.label !== 'D').every((u) => !u.extraBeds));
  assert.ok(!SEED['prewed/heritage-executive'].extraBeds && !SEED['prewed/heritage'].extraBeds, 'the pre-wedding window is another period: no extra bed there');
  /* HS-058 (Owners, 22 Nov 2026): the Grand Majestic Suite's Room B sleeps three; Room A keeps its two places */
  assert.deepEqual(plain(SEED['wedstay/grand-majestic'].extraBeds), [{ label: 'B', beds: 1 }]);
  const gm = unitsOf('wedstay/grand-majestic');
  assert.deepEqual(gm.map((u) => [u.label, u.places, u.extraBeds || 0]), [['A', 2, 0], ['B', 2, 1]], 'two suites, only B with the bed');
  assert.deepEqual([bedsFor(i, 'G121'), bedsFor(i, 'G050'), bedsFor(i), bedsFor(units[0], 'G121')], [1, 1, 1, 0], 'the same for every guest');
});

test('EXTRA BED · what each guest sees: everyone — signed in or not — sees Room I with its two places and the bed; the counts never pass the source', async () => {
  const rooms = new Rooms(doState());
  for (const g of [PAYER, SECOND, THIRD, STRANGER, null]) {
    const v = await view(rooms, g), u = unitIn(v, 'I');
    assert.deepEqual([u.places, u.extraBeds, u.free, u.full], [2, 1, 3, false], g ? g.guestId : 'signed out');
    assert.deepEqual([v.summary[KEY].sourcePlaces, v.summary[KEY].remainingPlaces], [27, 27], 'the bed counted in the source too');
  }
  assert.ok(!/extraBedFor/.test(JSON.stringify(unitIn(await view(rooms, PAYER), 'I'))));
});

test('EXTRA BED · an open selection holds one place and hides none; the next guests book theirs — whoever comes third takes the bed and is marked; then the room is full for everyone', async () => {
  const rooms = new Rooms(doState());
  assert.equal((await join(rooms, PAYER, 'I')).status, 200, 'an open selection: a place held, nothing sent');
  let seen = unitIn(await view(rooms, SECOND), 'I');
  assert.deepEqual([seen.free, seen.full], [2, false], 'her open selection hides no place: a place and the bed are free');
  assert.equal((await join(rooms, SECOND, 'I')).status, 200);
  for (const g of [THIRD, STRANGER]) { seen = unitIn(await view(rooms, g), 'I'); assert.deepEqual([seen.free, seen.full], [1, false], 'the bed is open to ' + g.guestId); }
  const third = await join(rooms, THIRD, 'I');
  assert.equal(third.status, 200, JSON.stringify(third.d)); assert.deepEqual(third.d.joined, { key: KEY, label: 'I' });
  assert.equal(await inI(rooms), 3);
  for (const g of [PAYER, SECOND, THIRD, STRANGER]) { const u = unitIn(await view(rooms, g), 'I'); assert.deepEqual([u.free, u.full], [0, true], g.guestId); }
  const r = await join(rooms, STRANGER, 'I'); assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  const plan = await (await rooms.fetch(new Request('https://x/api/rooms/plan', { headers: { 'x-gr-verified': 'yes' } }))).json();
  assert.deepEqual(plan.units[KEY].find((u) => u.label === 'I').occupants.filter((o) => o.bed).map((o) => o.guestId), ['G121'], 'the third booking is the bed');
});

test('EXTRA BED · in any order: whoever comes third takes the bed', async () => {
  for (const order of [[THIRD, SECOND, PAYER], [SECOND, PAYER, THIRD], [STRANGER, PAYER, OTHER]]) {
    const rooms = new Rooms(doState());
    for (const g of order) { const r = await join(rooms, g, 'I'); assert.equal(r.status, 200, order.map((x) => x.guestId).join('>') + ' ' + g.guestId + ' ' + JSON.stringify(r.d)); }
    assert.equal(await inI(rooms), 3);
  }
});

test('ROOM D · The Heritage: two guests hold its places, any third guest books the extra bed — no name needed in advance; a fourth is refused', async () => {
  const rooms = new Rooms(doState());
  const H = (g) => call(rooms, 'join', { invitationId: g.invitationId, guestId: g.guestId, key: 'wedstay/heritage', label: 'D' }, g);
  const BAM = who('G091'), BOON = who('G092'), ANY = who('G110');
  assert.equal((await H(BAM)).status, 200); assert.equal((await H(BOON)).status, 200);
  const d = (await view(rooms, ANY)).units['wedstay/heritage'].find((u) => u.label === 'D');
  assert.deepEqual([d.places, d.extraBeds, d.taken, d.free, d.full], [2, 1, 2, 1, false], 'not full while the bed is free');
  assert.equal((await H(ANY)).status, 200, 'the third place, booked by a guest nobody named beforehand');
  const full = (await view(rooms, STRANGER)).units['wedstay/heritage'].find((u) => u.label === 'D');
  assert.deepEqual([full.taken, full.free, full.full], [3, 0, true]);
  const r = await H(STRANGER); assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  const plan = await (await rooms.fetch(new Request('https://x/api/rooms/plan', { headers: { 'x-gr-verified': 'yes' } }))).json();
  assert.deepEqual(plan.units['wedstay/heritage'].find((u) => u.label === 'D').occupants.map((o) => o.guestId + (o.bed ? '·bed' : '')), ['G091', 'G092', 'G110·bed']);
});

test('EXTRA BED · the bed is one guest\'s own seat: never a place kept for a party member, never a party squeezed onto it', async () => {
  const PAYER_P = who('G032', 'INV-PAYERPARTY');
  let rooms = new Rooms(doState());
  assert.equal((await join(rooms, STRANGER, 'I')).status, 200);
  let r = await join(rooms, PAYER_P, 'I', { need: 2 });
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party'); assert.equal(await inI(rooms), 1, 'nothing held, nothing kept');
  rooms = new Rooms(doState());
  assert.equal((await join(rooms, STRANGER, 'I')).status, 200); assert.equal((await join(rooms, OTHER, 'I')).status, 200);
  r = await join(rooms, PAYER_P, 'I', { need: 2 });
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full for your party');
  r = await join(rooms, PAYER_P, 'I', { need: 1 });
  assert.equal(r.status, 200, JSON.stringify(r.d)); assert.equal(await inI(rooms), 3);
  assert.equal(unitIn(await view(rooms, MATE), 'I').occupants.filter((o) => o.placeholder).length, 0, 'no place kept on the bed');
});

test('EXTRA BED · leaving gives the place back; a move out of Room I frees it again', async () => {
  const rooms = new Rooms(doState());
  for (const g of [PAYER, SECOND, THIRD]) assert.equal((await join(rooms, g, 'I')).status, 200);
  assert.equal((await leave(rooms, THIRD)).status, 200);
  assert.deepEqual([unitIn(await view(rooms, THIRD), 'I').free, unitIn(await view(rooms, STRANGER), 'I').free], [1, 1]);
  assert.equal((await join(rooms, SECOND, 'H')).status, 200, 'a move: the new place first, then the old one goes');
  assert.equal(await inI(rooms), 1);
  assert.equal((await join(rooms, THIRD, 'I')).status, 200); assert.equal((await join(rooms, SECOND, 'I')).status, 200);
  assert.equal(await inI(rooms), 3);
});

test('ROOM E · the couple book theirs: the first keeps the second place for the couple, the second takes it; then Room E is full', async () => {
  const rooms = new Rooms(doState());
  const a = await join(rooms, PARENT1, 'E', { need: 2 });
  assert.equal(a.status, 200, JSON.stringify(a.d));
  assert.equal((await join(rooms, STRANGER, 'E')).status, 409, 'the kept place is the couple\'s');
  assert.equal((await join(rooms, PARENT2, 'E')).status, 200);
  const e = unitIn(await view(rooms, OTHER), 'E');
  assert.deepEqual([e.taken, e.free, e.full, e.extraBeds || 0], [2, 0, true, 0]);
});

test('GUEST RELATIONS · the plan shows the bed; an assignment may use it for anyone and marks it; beyond it only the Owners\' force', async () => {
  const rooms = new Rooms(doState());
  for (const g of [PAYER, SECOND]) assert.equal((await join(rooms, g, 'I')).status, 200);
  const plan = await (await rooms.fetch(new Request('https://x/api/rooms/plan', { headers: { 'x-gr-verified': 'yes' } }))).json();
  const i = plan.units[KEY].find((u) => u.label === 'I');
  assert.deepEqual([i.places, i.extraBeds, i.extraBedFor, i.occupants.length], [2, 1, undefined, 2]);
  const gr = (occupants) => rooms.fetch(new Request('https://x/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants }) })).then((r) => r.json());
  const yes = await gr([{ key: KEY, label: 'I', guestId: 'G050', invitationId: 'INV-G050' }]);
  assert.equal(yes.ok, true, JSON.stringify(yes));
  assert.equal(await inI(rooms), 3);
  const no = await gr([{ key: KEY, label: 'I', guestId: 'G051', invitationId: 'INV-G051' }]);
  assert.equal(no.ok, false); assert.equal(no.refused[0].error, 'full');
  const p2 = await (await rooms.fetch(new Request('https://x/api/rooms/plan', { headers: { 'x-gr-verified': 'yes' } }))).json();
  assert.deepEqual(p2.units[KEY].find((u) => u.label === 'I').occupants.filter((o) => o.bed).map((o) => o.guestId), ['G050']);
});

/* ---- THROUGH THE WORKER: sign in with a code (bearer → the deployed index → the verified identity) → read the rooms → book the
   own place → the occupancy shown — every step the shipped Worker and the Rooms engine take in production ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const memKv = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, delete: async (k) => { m.delete(k); },
  list: async ({ prefix } = {}) => ({ keys: [...m.keys()].filter((k) => !prefix || k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }), getWithMetadata: async (k) => ({ value: m.has(k) ? m.get(k) : null, metadata: null }) }; };
async function workerWorld() {
  const w = (await import('../src/worker.js')).default;
  const people = { PAYER: ['synthetic-code-0001', 'G032', 'INV-PA'], SECOND: ['synthetic-code-0002', 'G120', 'INV-PB'], THIRD: ['synthetic-code-0003', 'G121', 'INV-PC'],
    PARENT1: ['synthetic-code-0004', 'G124', 'INV-PE'], PARENT2: ['synthetic-code-0005', 'G125', 'INV-PE'], STRANGER: ['synthetic-code-0006', 'G050', 'INV-PS'] };
  const entries = {}, bearers = {};
  for (const [k, [code, g, p]] of Object.entries(people)) { bearers[k] = await bearerOf(code); entries[await authIdOf(bearers[k])] = { i: 'INV-' + g, g, p, c: 'CON-S' + g }; }
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState());
  const env = { ASSETS: { fetch: (r) => new Response(new URL(r.url).pathname === '/register/auth-index.json' ? index : 'asset', { status: 200 }) },
    ROOMS: { get: () => rooms, idFromName: () => 'rooms' }, REG_KV: memKv(), GR_TOKEN: 'gr-secret' };
  const as = (k) => ({ 'x-siyl-auth': bearers[k], 'content-type': 'application/json' });
  const id = (k) => ({ invitationId: 'INV-' + people[k][1], guestId: people[k][1] });
  const get = async (k) => (await w.fetch(new Request(ORIGIN + '/api/rooms', { headers: k ? as(k) : {} }), env)).json();
  const book = async (k, label, extra) => { const r = await w.fetch(new Request(ORIGIN + '/api/rooms/join', { method: 'POST', headers: as(k), body: JSON.stringify({ ...id(k), key: KEY, label, ...(extra || {}) }) }), env); return { status: r.status, d: await r.json() }; };
  const plan = async () => (await w.fetch(new Request(ORIGIN + '/api/rooms/plan', { headers: { 'x-gr-token': 'gr-secret' } }), env)).json();
  return { w, env, get, book, plan, bearers };
}

test('THROUGH THE WORKER · each signs in with their own code and books their own place: Room I for three (the bed to the third), Room E for two — the occupancy as the engine holds it', async () => {
  const { get, book, plan } = await workerWorld();
  assert.deepEqual([unitIn(await get('PAYER'), 'I').free, unitIn(await get('STRANGER'), 'I').free, unitIn(await get(null), 'I').free], [3, 3, 3], 'the room\'s bed, the same for everyone');
  assert.equal((await book('PAYER', 'I')).status, 200, 'the first books and sends nothing');
  assert.equal((await book('SECOND', 'I')).status, 200);
  const third = await book('THIRD', 'I'); assert.equal(third.status, 200, JSON.stringify(third.d));
  assert.equal((await book('STRANGER', 'I')).status, 409, 'three in: Room I is full');
  assert.equal((await book('PARENT1', 'E', { need: 2 })).status, 200);
  assert.equal((await book('PARENT2', 'E')).status, 200);
  const seen = await get('THIRD');
  assert.deepEqual([unitIn(seen, 'I').taken, unitIn(seen, 'I').full, unitIn(seen, 'E').taken, unitIn(seen, 'E').full], [3, true, 2, true]);
  assert.equal(unitIn(seen, 'I').occupants.filter((o) => o.mine).length, 1, 'the guest sees their own place among the three');
  assert.deepEqual(seen.mine.wedstay, { key: KEY, label: 'I' });
  const p = await plan();
  assert.deepEqual(p.units[KEY].find((u) => u.label === 'I').occupants.map((o) => o.guestId).sort(), ['G032', 'G120', 'G121']);
  assert.deepEqual(p.units[KEY].find((u) => u.label === 'E').occupants.map((o) => o.guestId).sort(), ['G124', 'G125']);
});

test('THROUGH THE WORKER · a client cannot claim the bed: a forged identity header or another guest id in the body is never trusted', async () => {
  const { w, env, book, bearers } = await workerWorld();
  for (const k of ['PAYER', 'SECOND']) assert.equal((await book(k, 'I')).status, 200);
  const r = await w.fetch(new Request(ORIGIN + '/api/rooms/join', { method: 'POST', headers: { 'x-siyl-auth': bearers.STRANGER, 'content-type': 'application/json',
    'x-siyl-identity': JSON.stringify({ invitationId: 'INV-G121', guestId: 'G121' }) }, body: JSON.stringify({ invitationId: 'INV-G121', guestId: 'G121', key: KEY, label: 'I' }) }), env);
  assert.ok(r.status === 403 || r.status === 409, 'refused: ' + r.status);
  const p = await (await w.fetch(new Request(ORIGIN + '/api/rooms/plan', { headers: { 'x-gr-token': 'gr-secret' } }), env)).json();
  assert.deepEqual(p.units[KEY].find((u) => u.label === 'I').occupants.map((o) => o.guestId).sort(), ['G032', 'G120']);
});

/* ---- THE RATES, AUTOMATICALLY: each sent trip mapped to engine rows exactly as the server maps it (bookingsOfSelections), under
   the guest's OWN invitation; the engine prices each by the 009 row naming them — synthetic amounts here, the real ones by gate F1 ---- */
test('THE RATES · five trips, each under the guest\'s own invitation: each priced by the row naming them, night 2 by the row\'s own rule — no review, no fallback', async () => {
  const items = { 'D1-HE': { Item_ID: 'D1-HE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: 99, Currency: 'USD', Quota: 13, Quota_Unit: 'ROOM', Max_Pax: 2, Site_Product_Key: KEY, 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] } };
  const row = (person, rate, nights) => ({ Holder_ID: 'INV-G032', Person_ID: person, Item_ID: 'D1-HE', Rate_Per_Person_Night: rate, Nights_Rule: String(nights), Rate_Status: 'ACTIVE', Approved_By: 'synthetic' });
  const specialRates = [row('G032', 10, 1), row('G120', 20, 1), row('G121', 5, 1), row('G124', 30, 2), row('G125', 40, 2)];
  const bookings = [];
  for (const [g, unit] of [['G032', 'I'], ['G120', 'I'], ['G121', 'I'], ['G124', 'E'], ['G125', 'E']]) {
    bookings.push(...await bookingsOfSelections({ holderId: 'INV-' + g, personId: g, selections: [{ id: 'wedstay', room: 'heritage-executive', unit, qty: 1 }], items, source: 'CONFIRMED_REGISTRATION', version: 1 }));
  }
  const out = calculate(bookings, { items, specialRates, asOf: '2026-11-17' });
  assert.deepEqual(out.lines.map((l) => [l.Person_ID, l.Holder_ID, l.Room_Unit_ID, l.rateSource, l.payableNights, l.amountCents]), [
    ['G032', 'INV-G032', 'RU·D1-HE·I', 'SPECIAL_RATE', 1, 1000], ['G120', 'INV-G120', 'RU·D1-HE·I', 'SPECIAL_RATE', 1, 2000],
    ['G121', 'INV-G121', 'RU·D1-HE·I', 'SPECIAL_RATE', 1, 500], ['G124', 'INV-G124', 'RU·D1-HE·E', 'SPECIAL_RATE', 2, 6000],
    ['G125', 'INV-G125', 'RU·D1-HE·E', 'SPECIAL_RATE', 2, 8000]]);
  assert.equal(out.manualReview.length, 0);
  assert.ok(out.lines.every((l) => l.Bill_To_Holder_ID === l.Holder_ID), 'each on their own invitation unless the Owners set the ledger\'s bill-to');
});

test('GRAND MAJESTIC ROOM B (HS-058.17) · the third person sleeps on the extra bed: priced by their own row × its Nights_Rule, never the room\'s standard rate — and the suite stays ONE room', async () => {
  /* synthetic roles and amounts only: two guests of the suite on a complimentary row (rule 2), the third on the bed with an own row
     (rule 1); the real figures are Google's and gate F1's, never committed here */
  const items = { 'D1-GM': { Item_ID: 'D1-GM', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT',
    Standard_Rate: 99, Currency: 'USD', Quota: 2, Quota_Unit: 'ROOM', Max_Pax: 2, Site_Product_Key: 'wedstay/grand-majestic', 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] } };
  const row = (person, rate, nights) => ({ Holder_ID: 'INV-' + person, Person_ID: person, Item_ID: 'D1-GM', Rate_Per_Person_Night: rate, Nights_Rule: String(nights), Rate_Status: 'ACTIVE', Approved_By: 'synthetic' });
  const bookings = [];
  for (const g of ['GB1', 'GB2', 'GB3']) {
    bookings.push(...await bookingsOfSelections({ holderId: 'INV-' + g, personId: g, selections: [{ id: 'wedstay', room: 'grand-majestic', unit: 'B', qty: 1 }], items, source: 'CONFIRMED_REGISTRATION', version: 1 }));
  }
  const priced = (specialRates) => calculate(bookings, { items, specialRates, asOf: '2026-11-23' });
  const withRow = priced([row('GB1', 0, 2), row('GB2', 0, 2), row('GB3', 7, 1)]);
  assert.deepEqual(withRow.lines.map((l) => [l.Person_ID, l.Room_Unit_ID, l.rateSource, l.payableNights, l.amountCents]), [
    ['GB1', 'RU·D1-GM·B', 'SPECIAL_RATE', 2, 0], ['GB2', 'RU·D1-GM·B', 'SPECIAL_RATE', 2, 0], ['GB3', 'RU·D1-GM·B', 'SPECIAL_RATE', 1, 700]]);
  assert.equal(withRow.manualReview.length, 0);
  assert.deepEqual([withRow.quota['D1-GM'].used, withRow.quota['D1-GM'].overQuota], [1, false], 'three persons in Room B use ONE room of the quota, never a second');
  /* without the bed guest's own row the engine falls back to the room's standard rate — which is why Issue waits (EXTRA_BED_UNPRICED) */
  const without = priced([row('GB1', 0, 2), row('GB2', 0, 2)]);
  assert.deepEqual([without.lines[2].rateSource, without.lines[2].amountCents], ['STANDARD_RATE', 9900]);
  assert.equal(without.quota['D1-GM'].used, 1);
});

/* ---- THE PAGE, AS SHIPPED: the browser's room module (assets/rooms.js) reading the real engine for one signed-in guest — the words a
   guest sees for the room, the Choose button's answer, the occupancy sentence; never a second calculation ---- */
import { page, session, roomsFetch } from './sandbox.mjs';
const pageFor = async (rooms, g) => {
  const auth = session({ guestId: g.guestId, partyId: g.partyId, partyName: 'Synthetic', fullName: 'Synthetic ' + g.guestId, preferredName: g.firstName, members: [{ guestId: g.guestId, preferredName: g.firstName }] });
  const w = page({ auth, fetch: await roomsFetch(rooms, g) });
  await w.SIYL_UNITS.load(true);
  return w;
};
const roomI = (w) => w.SIYL_UNITS.units('wedstay', 'heritage-executive').find((u) => u.label === 'I');
test('THE PAGE · every guest reads Room I with its bed and can choose it to the last place — the engine\'s words, no second count', async () => {
  const rooms = new Rooms(doState());
  let w = await pageFor(rooms, THIRD);
  assert.equal(w.SIYL_UNITS.stateOf(roomI(w)).state, 'empty · 2 places and the extra bed');
  assert.equal((await join(rooms, PAYER, 'I')).status, 200, 'the first: an open selection');
  assert.equal((await join(rooms, SECOND, 'I')).status, 200);
  w = await pageFor(rooms, THIRD);
  assert.equal(w.SIYL_UNITS.stateOf(roomI(w)).state, 'the extra bed free');
  assert.equal(w.SIYL_UNITS.fitsParty('wedstay', 'heritage-executive', roomI(w), 1), true, 'the third can choose Room I');
  assert.equal(w.SIYL_UNITS.fitsParty('wedstay', 'heritage-executive', roomI(w), 2), false, 'never a party onto the bed — as the engine refuses it');
  const s = await pageFor(rooms, STRANGER);
  assert.equal(s.SIYL_UNITS.stateOf(roomI(s)).state, 'the extra bed free', 'the bed is the room\'s, open to him too');
  assert.equal(s.SIYL_UNITS.fitsParty('wedstay', 'heritage-executive', roomI(s), 1), true);
  /* the page's own Choose: the browser asks the engine to join, the third lands on the bed */
  const r = await w.SIYL_UNITS.join('wedstay', 'heritage-executive', 'I');
  assert.ok(r && r.ok !== false, JSON.stringify(r));
  w = await pageFor(rooms, THIRD);
  assert.equal(w.SIYL_UNITS.stateOf(roomI(w)).state, 'full');
  assert.equal(w.SIYL_UNITS.occupancySentence(roomI(w)), 'Room I has two sleeping places and an extra bed. You, N and N hold them; the room is full.');
  /* the sentence as the room fills, read by the first of the three */
  const rooms2 = new Rooms(doState());
  assert.equal((await join(rooms2, PAYER, 'I')).status, 200);
  let one = await pageFor(rooms2, PAYER);
  assert.equal(one.SIYL_UNITS.occupancySentence(roomI(one)), 'Room I has two sleeping places and an extra bed. You hold one; two are free.');
  assert.equal(one.SIYL_UNITS.stateOf(roomI(one)).state, '1 place free · the extra bed free');
  assert.equal((await join(rooms2, SECOND, 'I')).status, 200);
  one = await pageFor(rooms2, PAYER);
  assert.equal(one.SIYL_UNITS.occupancySentence(roomI(one)), 'Room I has two sleeping places and an extra bed. You and N hold two; one is free.');
});

/* ---- REVIEW FIXES (17 Nov 2026): a place kept for a party stays theirs while the bed is in use; a guest without the bed reads the
   bed once the room uses it; the new words read in Thai ---- */
test('EXTRA BED · a place kept for a party stays the party\'s while the bed is in use: the partner takes it, nobody else does', async () => {
  /* a couple the seed does not name books Room I first, keeping the second place; one of the three then takes the bed */
  const C1 = who('G070', 'INV-PCOUPLE'), C2 = who('G071', 'INV-PCOUPLE');
  let rooms = new Rooms(doState());
  assert.equal((await join(rooms, C1, 'I', { need: 2 })).status, 200);
  assert.equal((await join(rooms, PAYER, 'I')).status, 200, 'the regular places are the couple\'s: she takes the bed');
  const r = await join(rooms, C2, 'I', { need: 2 });
  assert.equal(r.status, 200, 'the kept place is the partner\'s: ' + JSON.stringify(r.d));
  assert.equal(await inI(rooms), 3);
  assert.equal(unitIn(await view(rooms, OTHER), 'I').occupants.filter((o) => o.placeholder).length, 0, 'the kept place was taken, not doubled');
  assert.equal((await join(rooms, SECOND, 'I')).status, 409, 'three in: full for the others of the three too');
  /* the same for a party mate of one of the three who is not on the bed list */
  rooms = new Rooms(doState());
  const PAYER_P = who('G032', 'INV-PAYERPARTY');
  assert.equal((await join(rooms, PAYER_P, 'I', { need: 2 })).status, 200, 'she keeps a place for her mate');
  assert.equal((await join(rooms, SECOND, 'I')).status, 200, 'the second of the three on the bed');
  const m = await join(rooms, MATE, 'I', { need: 2 });
  assert.equal(m.status, 200, JSON.stringify(m.d));
  assert.equal(await inI(rooms), 3);
  /* a party larger than the room: its place kept here is taken although the bed is in use */
  rooms = new Rooms(doState());
  const T1 = who('G080', 'INV-PTRIO'), T2 = who('G081', 'INV-PTRIO');
  assert.equal((await join(rooms, T1, 'I', { need: 3 })).status, 200, 'one place kept here, one in another room');
  assert.equal((await join(rooms, THIRD, 'I')).status, 200, 'the bed');
  const t = await join(rooms, T2, 'I', { need: 3 });
  assert.equal(t.status, 200, JSON.stringify(t.d)); assert.equal(await inI(rooms), 3);
});

test('THE PAGE · a guest on a regular place reads the extra bed once the room uses it — never "two places" held by three', async () => {
  const rooms = new Rooms(doState());
  for (const g of [STRANGER, PAYER, SECOND]) assert.equal((await join(rooms, g, 'I')).status, 200, g.guestId);
  const s = await pageFor(rooms, STRANGER);
  assert.equal(s.SIYL_UNITS.occupancySentence(roomI(s)), 'Room I has two sleeping places and an extra bed. You, N and N hold them; the room is full.');
  assert.equal(s.SIYL_UNITS.stateOf(roomI(s)).state, 'full');
  /* two in a two-place room: no bed said to anyone it is not for */
  const rooms2 = new Rooms(doState());
  for (const g of [STRANGER, OTHER]) assert.equal((await join(rooms2, g, 'I')).status, 200);
  const o = await pageFor(rooms2, STRANGER);
  assert.equal(o.SIYL_UNITS.occupancySentence(roomI(o)), 'Room I has two sleeping places and an extra bed. You and N hold two; one is free.');
});

test('THAI · every new room phrase reads in Thai — no English word left (the room letter and names aside)', async () => {
  const core = (await import('../src/i18n-core.js')).default, T = core.translator(JSON.parse(src('src/i18n-th.json')));
  for (const s of ['empty · 2 places and the extra bed', '1 place free · the extra bed free', 'the extra bed free', 'You · 1 place free · the extra bed free',
    'Room I has two sleeping places and an extra bed. You hold one; two are free.',
    'Room I has two sleeping places and an extra bed. You and A guest hold two; one is free.',
    'Room I has two sleeping places and an extra bed. You, A guest and A guest hold them; the room is full.',
    'Room E has two sleeping places. You hold one; one is kept for A guest.', 'Room I has two sleeping places. You hold one; one is free.']) {
    const th = T.tr(s); assert.doesNotMatch(th, /[A-Za-z]{2,}/, s + ' → ' + th);
  }
});

/* ---- THE WHOLE WAY, THROUGH THE SHIPPED WORKER (Owner, 17 Nov 2026): each of the five signs in with their own code, reads the
   rooms, books their own place, completes step 01 and sends the trip; Haruthai confirms each in her own admin view (the
   dialog's version, then Confirm booking); each statement is priced by the 009 row naming the person with no extra-bed reason;
   the Rooms engine and the Revenue overview show Room I for three and Room E for two. Google is a synthetic workbook at the
   fetch boundary; codes, contacts and amounts are synthetic; nothing is issued, nothing is e-mailed. ---- */
import crypto from 'node:crypto';
import { src } from './sandbox.mjs';
import { BillingLedger } from '../src/billing-ledger.js';
import { Drafts } from '../src/drafts.js';
import { PAYMENT_JOURNAL_COLUMNS } from '../src/billing/source.js';
import { complete } from './complete.mjs';

const WW_ITEMS = { 'D1-HE': { Item_ID: 'D1-HE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 99, Quota: 13,
  Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', Site_Product_Key: KEY, 'Number of Nights': 2, Modifiers: 'SECOND_NIGHT_COMPLIMENTARY' } };
/* synthetic 009 rows naming each person (rate per night, Nights_Rule), under the payer's invitation as the Owners keep them */
const WW_RATES = { G032: [10, 1], G120: [20, 1], G121: [5, 1], G124: [30, 2], G125: [40, 2] };
function wwWorkbook() {
  const labels = ['Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To', 'Rate_Basis', 'Standard_Rate', 'Quota', 'Quota_Unit', 'Max_Pax', 'Change_Cutoff', 'Cancellation_Cutoff', 'Currency', 'Site_Product_Key', 'Number of Nights', 'Modifiers'];
  const cols = Object.values(WW_ITEMS);
  return {
    '002_Accommodation_Details': [['002 · synthetic'], ...labels.map((l) => [l, ...cols.map((it) => (it[l] == null ? '' : it[l]))])],
    '008_Payment_Journal': [[...PAYMENT_JOURNAL_COLUMNS]],
    '009_Special_Rates': [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note'],
      ...Object.entries(WW_RATES).map(([g, [rate, rule]]) => ['INV-G032', g, 'D1-HE', rate, String(rule), 'ACTIVE', '', '', 'Synthetic Owner order', 'synthetic'])],
    '010_Booking_Evidence_Index': [['Booking_ID', 'Settlement_ID', 'Holder_ID', 'Evidence_Status']],
    '011_Billing_Config': [['Config_Key', 'Value', 'Effective_From', 'Effective_To', 'Status', 'Approved_By', 'Approved_At', 'Note']],
    '006_Guestlist': [['ID', 'Firstname', 'Surname', 'Nationality'], ...['G032', 'G120', 'G121', 'G124', 'G125', 'G050', 'G048'].map((g) => ['CON-S' + g, 'Synth' + g, 'Example', 'Thai'])],
  };
}
function wwSheets(wb) {
  const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  return async (url) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) return res(200, { access_token: 'synthetic', expires_in: 3600, token_type: 'Bearer' });
    if (/\/values:batchGet\?/.test(u)) return res(200, { valueRanges: [...new URL(u).searchParams.getAll('ranges')].map((range) => ({ range, values: wb[range.split('!')[0].replace(/^'|'$/g, '')] || [] })) });
    const m = u.match(/\/values\/([^?]+)\?/); const tab = m ? decodeURIComponent(m[1]).split('!')[0].replace(/^'|'$/g, '') : '';
    if (wb[tab]) return res(200, { values: wb[tab] });
    if (/googleapis\.com/.test(u)) return res(400, { error: { message: 'Unable to parse range' } });
    throw new Error('the whole-way test reached the network: ' + u.slice(0, 80));
  };
}
const wwKv = () => { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v: String(v), meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); },
  list: async ({ prefix = '' } = {}) => ({ keys: [...m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name, metadata: m.get(name).meta })), list_complete: true }),
  getWithMetadata: async (k) => ({ value: m.has(k) ? m.get(k).v : null, metadata: m.has(k) ? m.get(k).meta || null : null }) }; };
const { privateKey: WW_KEY } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
async function wholeWay() {
  const w = (await import('../src/worker.js')).default;
  /* the five, a stranger and Haruthai (a Billing Admin by invitation AND guest id AND the hosts flag) — synthetic codes */
  const people = { PAYER: ['G032', 'INV-PA'], SECOND: ['G120', 'INV-PB'], THIRD: ['G121', 'INV-PC'], PARENT1: ['G124', 'INV-PE'], PARENT2: ['G125', 'INV-PE'], STRANGER: ['G050', 'INV-PS'], HARUTHAI: ['G048', 'INV-001', 1] };
  const entries = {}, bearers = {}; let n = 0;
  for (const [k, [g, p, h]] of Object.entries(people)) { bearers[k] = await bearerOf('synthetic-whole-way-' + String(++n).padStart(2, '0')); entries[await authIdOf(bearers[k])] = { i: 'INV-' + g, g, p, c: 'CON-S' + g, ...(h ? { h: 1 } : {}) }; }
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()), led = new BillingLedger(doState());
  const env = { ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 })) },
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, REG_KV: wwKv(), GR_TOKEN: 'gr-secret', MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com',
    BILLING_LEDGER: { idFromName: () => 'billing', get: () => ({ fetch: (r) => led.fetch(r) }) },
    SHEETS_ID: 'sheet-whole-way', GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ client_email: 'whole-way@test.invalid', private_key: WW_KEY, private_key_id: 'ww' }) };
  const actors = {}; env.DRAFTS = { idFromName: (x) => x, get: (x) => { if (!actors[x]) { const a = new Drafts(doState(), env); actors[x] = { fetch: (r) => a.fetch(r) }; } return actors[x]; } };
  const call = async (k, path, body, method) => {
    const headers = { 'content-type': 'application/json', ...(k === 'GR' ? { 'x-gr-token': 'gr-secret' } : k ? { 'x-siyl-auth': bearers[k] } : {}) };
    const r = await w.fetch(new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers, body: body ? JSON.stringify(body) : undefined }), env);
    return { status: r.status, j: await r.json().catch(() => null) };
  };
  return { call, people, env };
}

test('THE WHOLE WAY · sign in → choose the room → book the place → send → Haruthai confirms in her admin view → each priced by their own 009 row → Room I for three, Room E for two', async () => {
  const was = globalThis.fetch; globalThis.fetch = wwSheets(wwWorkbook());
  try {
    const { call, people } = await wholeWay();
    const plan = [['PAYER', 'I'], ['SECOND', 'I'], ['THIRD', 'I'], ['PARENT1', 'E'], ['PARENT2', 'E']];
    const engineAmount = (g) => WW_RATES[g][0] * WW_RATES[g][1];
    for (const [k, label] of plan) {
      const g = people[k][0], inv = 'INV-' + g;
      /* signed in with the own code: the rooms as this guest sees them */
      const v = await call(k, '/api/rooms'); assert.equal(v.status, 200, k);
      /* open to them: a free place (the bed for the three), or the place kept for their own party (as the page reads it) */
      const u = unitIn(v.j, label), keptForMe = !!u && u.occupants.some((o) => o.placeholder && o.party);
      assert.ok(u && (!u.full || keptForMe), k + ' sees ' + label + ' open: ' + JSON.stringify(u && { free: u.free, full: u.full, keptForMe }));
      /* choose the room, book the place */
      const j = await call(k, '/api/rooms/join', { invitationId: inv, guestId: g, key: KEY, label, need: k === 'PARENT1' ? 2 : 1 });
      assert.equal(j.status, 200, k + ' ' + JSON.stringify(j.j).slice(0, 300)); assert.deepEqual(j.j.mine.wedstay, { key: KEY, label });
      /* step 01 (synthetic) and the trip as the page keeps and sends it */
      const c = await call(k, '/api/contact', { invitationId: inv, email: 'synthetic.' + g.toLowerCase() + '@test.invalid', phone: '+66 81 000 0000', birthdate: '1990-01-01', nationality: 'Thai',
        address1: '1 Synthetic Road', postal: '10000', city: 'Bangkok', country: 'Thailand' });
      assert.equal(c.status, 200, k + ' contact ' + JSON.stringify(c.j));
      const selections = [{ id: 'wedstay', name: 'Wedding stay', meta: 'Heritage Executive · Room ' + label, price: engineAmount(g), qty: 1, stay: 'souphattra', room: 'heritage-executive', unit: label, unitName: 'Room ' + label }];
      const d = await call(k, '/api/draft', { invitationId: inv, keys: { 'siyl.bag': JSON.stringify(selections) } }, 'PUT');
      assert.equal(d.status, 200, k + ' draft ' + JSON.stringify(d.j).slice(0, 200));
      const reg = complete({ channel: 'journey-shop', guestId: g, totalUsd: engineAmount(g), contact: { email: 'synthetic.' + g.toLowerCase() + '@test.invalid', phone: '+66 81 000 0000' }, selections,
        stages: { wedstay: 'selected' }, guestRecord: { guests: [{ guestId: g, name: 'Synth' + g, source: { fullName: 'Synth ' + g, preferredName: 'Synth' } }] } }, { scope: { bangkok: false, vientianeWedding: true } });
      const s = await call(k, '/api/register', { invitationId: inv, registration: reg, text: 'SEE YOU IN LAOS — JOURNEY SELECTION (synthetic)' });
      /* stored and under review; 202 because no mail provider is configured here — nothing is e-mailed */
      assert.ok([200, 202].includes(s.status) && s.j.stored === true && s.j.submissionId, k + ' send ' + JSON.stringify(s.j).slice(0, 500));
    }
    /* a stranger: Room I full, refused */
    assert.equal(unitIn((await call('STRANGER', '/api/rooms')).j, 'I').full, true);
    assert.equal((await call('STRANGER', '/api/rooms/join', { invitationId: 'INV-G050', guestId: 'G050', key: KEY, label: 'I' })).status, 409);
    /* Haruthai, in her own admin view: the dialog shows the sent version and what Issue would say; she confirms it */
    for (const [k] of plan) {
      const g = people[k][0], holder = 'INV-' + g;
      const dlg = await call('HARUTHAI', '/api/billing/admin/confirm?holder=' + holder);
      assert.equal(dlg.status, 200, k + ' dialog ' + JSON.stringify(dlg.j).slice(0, 300)); assert.equal(dlg.j.submitted, true);
      assert.ok(!((dlg.j.afterConfirm && dlg.j.afterConfirm.reasons) || []).some((r) => /^EXTRA_BED_/.test(r)), k + ' ' + JSON.stringify(dlg.j.afterConfirm));
      const ok = await call('HARUTHAI', '/api/billing/admin/confirm', { holderId: holder, expected: dlg.j.snapshot });
      assert.equal(ok.status, 200, k + ' confirm ' + JSON.stringify(ok.j).slice(0, 400));
      /* the statement as the Owners read it: confirmed, the person's own 009 row, night 2 by its rule, no extra-bed reason */
      const st = await call('HARUTHAI', '/api/billing/admin/holder?holder=' + holder);
      assert.equal(st.status, 200, k + ' holder'); assert.equal(st.j.confirmation.state, 'CONFIRMED', k);
      const line = st.j.preview.lines.find((l) => l.Item_ID === 'D1-HE');
      assert.ok(line, k + ' ' + JSON.stringify(st.j.preview).slice(0, 300));
      assert.deepEqual([line.Person_ID, line.rateSource, line.rate, line.payableNights, line.amount], [g, 'SPECIAL_RATE', WW_RATES[g][0], WW_RATES[g][1], engineAmount(g)], k);
      assert.ok(!st.j.preview.reasons.some((r) => /^EXTRA_BED_/.test(r)), k + ' ' + JSON.stringify(st.j.preview.reasons));
    }
    /* the occupancy: the Rooms engine (Guest Relations' plan) and the Revenue overview */
    const p = await call('GR', '/api/rooms/plan');
    const occ = (l) => p.j.units[KEY].find((x) => x.label === l).occupants.map((o) => o.guestId).sort();
    assert.deepEqual(occ('I'), ['G032', 'G120', 'G121']); assert.deepEqual(occ('E'), ['G124', 'G125']);
    const rev = await call('HARUTHAI', '/api/billing/revenue');
    assert.equal(rev.status, 200, JSON.stringify(rev.j).slice(0, 300));
    const ru = (l) => rev.j.breakdown.roomsByUnit.find((x) => x.Room_Unit_ID === 'RU·D1-HE·' + l);
    assert.deepEqual([ru('I').places, ru('I').cents], [3, (engineAmount('G032') + engineAmount('G120') + engineAmount('G121')) * 100]);
    assert.deepEqual([ru('E').places, ru('E').cents], [2, (engineAmount('G124') + engineAmount('G125')) * 100]);
    assert.equal(rev.j.issuedRevenue.cents, 0, 'nothing issued');
  } finally { globalThis.fetch = was; }
});
