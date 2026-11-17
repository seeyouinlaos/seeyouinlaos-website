/* ============================================================================
   FINANCE · 17 Nov 2026 (Owners): the couple's own bookings are complimentary (engine 2.4.0), who sleeps on a room's extra bed is
   the Owners' attribution (rooms op 'bed'), Google 012 is a read-only reconciliation reference, and the activation gate's
   reference cases follow the Owners' orders. Synthetic data only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate, COUPLE_PERSONS, ENGINE_VERSION } from '../src/billing/engine.js';
import { BILLING_ADMINS } from '../src/billing/admin.js';
import { REFERENCE_CASES } from '../src/billing/activation-gate.js';
import { parseRoomList012 } from '../src/billing/budget-source.js';
import { Rooms } from '../src/rooms.js';
import { doState } from './sandbox.mjs';

const ITEMS = { 'T-SUITE': { Item_ID: 'T-SUITE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 120,
  Currency: 'USD', Quota: 1, Quota_Unit: 'ROOM', Max_Pax: 2, Site_Product_Key: 'wedstay/x', 'Number of Nights': 2, Modifiers: '' } };
const bk = (person) => ({ Booking_ID: 'BK·INV-' + person + '·' + person + '·T-SUITE·g1', Holder_ID: 'INV-' + person, Person_ID: person, Item_ID: 'T-SUITE', State: 'CONFIRMED', Nights: 2, Quantity: 1 });

test('COUPLE · the couple\'s own bookings are hosted at USD 0 whatever 009 names for them; a guest beside them pays; the couple are the Billing Admins', () => {
  assert.equal(ENGINE_VERSION, 'billing-engine/2.4.0');
  assert.deepEqual([...COUPLE_PERSONS], BILLING_ADMINS.map((a) => a.guestId));
  const rates = [{ Holder_ID: 'INV-G048', Person_ID: 'G048', Item_ID: 'T-SUITE', Rate_Per_Person_Night: 75, Nights_Rule: '2', Rate_Status: 'ACTIVE', Approved_By: 'synthetic' }];
  const r = calculate([bk('G048'), bk('G049'), bk('GX01')], { items: ITEMS, specialRates: rates, asOf: '2026-11-17' });
  const by = (p) => r.lines.find((l) => l.Person_ID === p);
  assert.deepEqual([by('G048').rateSource, by('G048').amountCents, by('G048').hosted, by('G048').couple], ['HOSTED', 0, true, true]);
  assert.deepEqual([by('G049').rateSource, by('G049').amountCents], ['HOSTED', 0]);
  assert.ok(by('G048').hostedValueCents > 0, 'its value stays visible as hosted value');
  assert.deepEqual([by('GX01').rateSource, by('GX01').amountCents], ['STANDARD_RATE', 24000]);
  assert.equal(r.totalPayableCents, 24000, 'only the paying guest');
});

test('GATE · the reference cases follow the Owners\' orders: Rooms A, B, C at 0 (named rate), the fourth couple at 150, the couple\'s suite hosted at 0', () => {
  const c = (id) => REFERENCE_CASES.find((x) => x.id === id);
  assert.equal(c('four-couples-150'), undefined);
  assert.deepEqual([c('rooms-abc-complimentary').expectPerPersonUSD, c('rooms-abc-complimentary').rateSource, c('rooms-abc-complimentary').bookings.length], [0, 'SPECIAL_RATE', 6]);
  assert.deepEqual([c('couple-150').expectPerPersonUSD, c('couple-150').bookings.map((b) => b.personId)], [150, ['G091', 'G092']]);
  assert.deepEqual([c('bride-groom-presidential').expectPerPersonUSD, c('bride-groom-presidential').expectCombinedUSD, c('bride-groom-presidential').rateSource], [0, 0, 'HOSTED']);
});

test('EXTRA BED · the Owners name who sleeps on a room\'s extra bed: one occupant, nobody moves; refused for a stranger or a room within its places', async () => {
  const rooms = new Rooms(doState());
  const who = (g) => ({ invitationId: 'INV-' + g, guestId: g, partyId: 'INV-P' + g, hosts: false, firstName: 'N' });
  const join = (g, label) => rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who(g)) }, body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, key: 'wedstay/heritage', label }) }));
  const gr = (op, body) => rooms.fetch(new Request('https://x/api/rooms/' + op, { method: body ? 'POST' : 'GET', headers: { 'x-gr-verified': 'yes' }, body: body ? JSON.stringify(body) : undefined })).then(async (r) => ({ status: r.status, j: await r.json() }));
  for (const g of ['G091', 'G110', 'G092']) assert.equal((await join(g, 'D')).status, 200);
  const bed = async () => (await gr('plan')).j.units['wedstay/heritage'].find((u) => u.label === 'D').occupants.filter((o) => o.bed).map((o) => o.guestId);
  assert.deepEqual(await bed(), ['G092'], 'the last booking took the bed');
  const ok = await gr('bed', { key: 'wedstay/heritage', label: 'D', guestId: 'G110' });
  assert.equal(ok.status, 200, JSON.stringify(ok.j)); assert.deepEqual(await bed(), ['G110']);
  const plan = (await gr('plan')).j.units['wedstay/heritage'].find((u) => u.label === 'D');
  assert.deepEqual(plan.occupants.map((o) => o.guestId).sort(), ['G091', 'G092', 'G110'], 'nobody moved');
  assert.equal((await gr('bed', { key: 'wedstay/heritage', label: 'D', guestId: 'G050' })).status, 409, 'not an occupant');
  assert.equal((await gr('bed', { key: 'wedstay/heritage', label: 'A', guestId: 'G091' })).status, 400, 'no extra bed in this room');
  const v = await rooms.fetch(new Request('https://x/api/rooms/bed', { method: 'POST', body: JSON.stringify({ key: 'wedstay/heritage', label: 'D', guestId: 'G091' }) }));
  assert.equal(v.status, 404, 'Guest Relations only');
});

test('012 · the Owners\' room number and rate list is parsed for reconciliation only: building carried down, guests per room', () => {
  const grid = [['Building', 'Room Type', 'Rm No.', 'CON ID', 'Check in date', 'Check out date', 'Guest 01', 'Rate 25.02.', 'Guest 02', 'Rate 25.02.', 'Guest 03'],
    ['B', 'Noble Courtyard Suite', '101', '', '', '01.03.2027'], ['', 'Heritage Executive', '107', '', '27.02.2027', '01.03.2027', 'Ann', '', 'Ben', '', 'Cy'], ['', '', '', ''], ['C', 'The Heritage', '205', '', '', '', 'Dee']];
  assert.deepEqual(parseRoomList012(grid).map((r) => [r.row, r.building, r.roomType, r.roomNo, r.guests.join('/')]),
    [[2, 'B', 'Noble Courtyard Suite', '101', ''], [3, 'B', 'Heritage Executive', '107', 'Ann/Ben/Cy'], [5, 'C', 'The Heritage', '205', 'Dee']]);
  assert.deepEqual(parseRoomList012(null), []);
});
