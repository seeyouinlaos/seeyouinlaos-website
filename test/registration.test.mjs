import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ratePerNight, roomTotal, partyTotal,
  trainContribution, transfersTotal, journeyTotal,
  createInventory, remaining, availabilityLabel, requestAllocation,
  holdAllocation, confirmAllocation, releaseAllocation, ALLOC,
  inventorySnapshot, partyAllocation, isLocked,
  validateRegistration, buildNotification, nextInvitationState,
} from '../register/logic.mjs';
import { ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN, TRANSFERS, DEMO_MODE } from '../register/data.mjs';
import { tokenId, encryptInvitation, lookupByToken } from '../register/crypto.mjs';
import { FIXTURE_INVITATIONS, lookupInvitation } from './fixtures.mjs';

const byId = (id) => ACCOMMODATIONS.find((a) => a.id === id);
const RES = [...SELECTABLE_ACCOMMODATIONS, TRAIN];

/* ---------------- Party logic ---------------- */

test('single Guest recognition (solo invitation, no invented partner)', () => {
  const inv = lookupInvitation('Lin Demo');
  assert.equal(inv.invitationId, 'INV-DEMO-002');
  assert.equal(inv.guests.length, 1);
});

test('linked couple recognition by token and by exact name', () => {
  assert.equal(lookupInvitation('demo-amara').partyName, 'Amara & Theo');
  assert.equal(lookupInvitation('theo demo').invitationId, 'INV-DEMO-001');
});

test('multi-person Party loads all predefined members', () => {
  const inv = lookupInvitation('demo-family');
  assert.equal(inv.guests.length, 3);
});

test('unresolved partner mapping stays flagged, not silently linked', () => {
  const inv = lookupInvitation('demo-noor');
  assert.equal(inv.unresolvedMapping, true);
  assert.equal(inv.guests.length, 1);
});

test('no free additional-guest creation: unknown guest fails validation', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.guests.push({ guestId: 'intruder', email: 'x@example.com', journey: {}, events: { dinner: true } });
  const errors = validateRegistration(reg, ctx(inv));
  assert.ok(errors.some((e) => e.includes('unrecognised guest')));
});

/* ---------------- Journey cost (Owner price master) ---------------- */

const RATE_MASTER = {
  heritage: [155, 310], 'the-heritage': [180, 360],
  'heritage-grand-premier': [255, 510], 'grand-majestic-suite': [275, 550],
  'souphattra-majestic-suite': [310, 620], villa: [0, 0],
};
for (const [id, [night, total]] of Object.entries(RATE_MASTER)) {
  test('room rate — ' + id + ' = USD ' + night + '/night, USD ' + total + ' for 2 nights', () => {
    assert.equal(ratePerNight(byId(id)), night);
    assert.equal(roomTotal(byId(id)), total);
    assert.equal(partyTotal(byId(id)), total);
    if (night) assert.equal(night * byId(id).nights, total); // 155×2=310 etc.
  });
}

test('the room price never multiplies with the guest count', () => {
  const acc = byId('the-heritage');
  assert.equal(partyTotal(acc), 360); // one room, one price — solo or couple
});

test('Night Train is USD 88 per participating guest — only riders are charged', () => {
  assert.equal(TRAIN.contributionPerGuest, 88);
  assert.equal(trainContribution(TRAIN, 1), 88);
  assert.equal(trainContribution(TRAIN, 2), 176);
  assert.equal(trainContribution(TRAIN, 0), 0);
});

test('transfer price master: per unit, never per guest', () => {
  const price = (id) => TRANSFERS.find((t) => t.id === id).pricePerUnit;
  assert.equal(price('apt-pickup-jaguar'), 25);
  assert.equal(price('apt-dropoff-jaguar'), 25);
  assert.equal(price('apt-pickup-merc'), 40);
  assert.equal(price('apt-dropoff-merc'), 40);
  assert.equal(price('lcr-pickup-jaguar'), 40);
  assert.equal(price('lcr-dropoff-jaguar'), 40);
  assert.equal(price('lcr-pickup-merc'), 60);
  assert.equal(price('lcr-dropoff-merc'), 60);
  assert.equal(transfersTotal(TRANSFERS, [{ transferId: 'apt-pickup-jaguar', units: 1 }]), 25);
  assert.equal(transfersTotal(TRANSFERS, [{ transferId: 'lcr-pickup-merc', units: 2 }]), 120);
});

test('live Journey Cost: room + train + transfers from one calculation path', () => {
  // §26 example: Heritage Executive 360 + 2×88 train + 1 Jaguar pickup 25 = 561
  const total = journeyTotal(byId('the-heritage'), TRAIN, 2, TRANSFERS,
    [{ transferId: 'apt-pickup-jaguar', units: 1 }]);
  assert.equal(total, 561);
  assert.equal(journeyTotal(null, TRAIN, 0, TRANSFERS, []), 0);
});

test('airport transfers carry flight fields; LCR transfers carry train fields', () => {
  for (const t of TRANSFERS) {
    if (t.group === 'Airport') assert.equal(t.fieldsFor, 'flight');
    else assert.equal(t.fieldsFor, 'train');
  }
});

/* ---------------- Inventory logic (§25) ---------------- */

test('capacities match the brief', () => {
  const inv = createInventory(RES);
  assert.equal(inv.villa.capacity_total, 4);
  assert.equal(inv.heritage.capacity_total, 4);
  assert.equal(inv['the-heritage'].capacity_total, 13);
  assert.equal(inv['heritage-grand-premier'].capacity_total, 3);
  assert.equal(inv['grand-majestic-suite'].capacity_total, 2);
  assert.equal(inv['souphattra-majestic-suite'].capacity_total, 1);
  assert.equal(inv.train.capacity_total, 8);
  assert.equal(inv.train.selection_scope, 'GUEST');
  assert.equal(inv.villa.selection_scope, 'PARTY');
  const activeRooms = ['heritage', 'the-heritage', 'heritage-grand-premier', 'grand-majestic-suite', 'souphattra-majestic-suite']
    .reduce((s, id) => s + inv[id].capacity_total, 0);
  assert.equal(activeRooms, 23); // active guest inventory
  assert.equal(inv['noble-courtyard'], undefined); // cancelled — no inventory record
});

test('hold + confirm reduce remaining; release restores it', () => {
  const inv = createInventory(RES);
  const a = requestAllocation(inv, 'the-heritage', { partyId: 'P1', units: 1, submittedAt: 't1' });
  assert.equal(a.status, ALLOC.REQUESTED);
  assert.equal(remaining(inv['the-heritage']), 13); // request alone does not reduce public remaining
  holdAllocation(inv, a.allocId, 't2');
  assert.equal(remaining(inv['the-heritage']), 12);
  confirmAllocation(inv, a.allocId, 't3');
  assert.equal(remaining(inv['the-heritage']), 12);
  releaseAllocation(inv, a.allocId, 't4', { force: true }); // confirmed capacity is locked
  assert.equal(remaining(inv['the-heritage']), 13);
});

test('confirmed capacity is locked: release needs an explicit Guest Relations force', () => {
  const inv = createInventory(RES);
  const a = requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 't2');
  confirmAllocation(inv, a.allocId, 't3');
  assert.equal(isLocked(inv, 'souphattra-majestic-suite', 'P1'), true);
  assert.throws(() => releaseAllocation(inv, a.allocId, 't4'), /locked/);
  assert.equal(inventorySnapshot(inv['souphattra-majestic-suite']).locked, 1);
  releaseAllocation(inv, a.allocId, 't5', { force: true });
  assert.equal(isLocked(inv, 'souphattra-majestic-suite', 'P1'), false);
});

test('inventory snapshot carries total / requested / confirmed / available / waitlist', () => {
  const inv = createInventory(RES);
  const a = requestAllocation(inv, 'grand-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1' });
  requestAllocation(inv, 'grand-majestic-suite', { partyId: 'P2', units: 1, submittedAt: 't2' });
  let s = inventorySnapshot(inv['grand-majestic-suite']);
  assert.deepEqual(
    { total: s.total, requested: s.requested, confirmed: s.confirmed, available: s.available, waitlisted: s.waitlisted },
    { total: 2, requested: 2, confirmed: 0, available: 0, waitlisted: 0 });
  holdAllocation(inv, a.allocId, 't3');
  confirmAllocation(inv, a.allocId, 't4');
  s = inventorySnapshot(inv['grand-majestic-suite']);
  assert.equal(s.confirmed, 1);
  assert.equal(s.locked, 1);
  assert.equal(s.remaining, 1);
  assert.equal(s.available, 0); // one room left, but P2 already asked for it
});

test('§09 capacity matrix: request N allowed, request N+1 never a normal allocation', () => {
  const matrix = { heritage: 4, 'the-heritage': 13, 'heritage-grand-premier': 3, 'grand-majestic-suite': 2, 'souphattra-majestic-suite': 1 };
  const inv = createInventory(RES);
  for (const [id, cap] of Object.entries(matrix)) {
    const results = [];
    for (let i = 1; i <= cap + 1; i++) {
      results.push(requestAllocation(inv, id,
        { partyId: id + '-P' + i, units: 1, submittedAt: '2027-01-01T10:' + String(i).padStart(2, '0') + ':00Z' }));
    }
    assert.equal(results.filter((r) => r.status === ALLOC.REQUESTED).length, cap, id);
    const extra = results[cap];
    assert.equal(extra.status, ALLOC.WAITLISTED, id + ' request ' + (cap + 1) + ' must not become a normal allocation');
    assert.equal(extra.waitlist_position, 1);
    assert.equal(inventorySnapshot(inv[id]).available, 0);
  }
});

test('cancelled and reserved categories can never be requested', () => {
  const inv = createInventory(RES);
  assert.equal(inv['noble-courtyard'], undefined);
  assert.equal(inv['souphattra-presidential'], undefined);
  assert.throws(() => requestAllocation(inv, 'noble-courtyard', { partyId: 'X', units: 1, submittedAt: 't' }), /unknown resource/);
  assert.throws(() => requestAllocation(inv, 'souphattra-presidential', { partyId: 'X', units: 1, submittedAt: 't' }), /unknown resource/);
});

test('the villa cannot be over-allocated beyond its four Party allocations', () => {
  const inv = createInventory(RES);
  const out = [];
  for (let i = 1; i <= 6; i++) {
    out.push(requestAllocation(inv, 'villa', { partyId: 'V' + i, units: 1, submittedAt: 't' + i }));
  }
  assert.equal(out.filter((o) => o.status === ALLOC.REQUESTED).length, 4);
  assert.equal(out.filter((o) => o.status === ALLOC.WAITLISTED).length, 2);
});

/* ---------------- Accommodation model (complete room presentation) ------- */

test('the active accommodation master is complete (Noble Courtyard cancelled)', () => {
  const names = ACCOMMODATIONS.map((a) => a.name);
  assert.deepEqual(names, [
    'Vientiane Urban Cozy Villa 2 (4BR)',
    'The Heritage', 'Heritage Executive', 'Heritage Grand Premier',
    'Grand Majestic Suite', 'Souphattra Majestic Suite',
    'Souphattra Presidential',
  ]);
  assert.ok(!names.some((n) => /Noble Courtyard/.test(n)), 'Noble Courtyard is cancelled');
  assert.ok(!names.some((n) => /Heritage Exclusive/i.test(n)), 'it is Heritage Executive, never Exclusive');
  for (const a of ACCOMMODATIONS) {
    assert.ok(a.size, a.name + ' needs a size');
    assert.ok(a.bed, a.name + ' needs a bed configuration');
    assert.ok(a.occupancy, a.name + ' needs an occupancy');
    assert.ok(a.location, a.name + ' needs a location');
    assert.ok(a.blurb && a.blurb.length > 20, a.name + ' needs a description');
    assert.ok((a.amenities || []).length >= 4, a.name + ' needs amenities');
    assert.ok((a.images || []).length >= 3, a.name + ' needs a hero image and gallery');
    for (const src of a.images) assert.match(src, /^assets\/images\/rooms\/[a-z0-9-]+\.jpg$/);
  }
});

test('room images exist on disk (no placeholders)', async () => {
  const fs = await import('node:fs');
  for (const a of ACCOMMODATIONS) {
    for (const src of a.images) {
      const p = new URL('../' + src, import.meta.url);
      assert.ok(fs.existsSync(p), 'missing image: ' + src);
      assert.ok(fs.statSync(p).size > 20000, 'suspiciously small image: ' + src);
    }
  }
});

test('the Presidential is visible, never selectable and never priced', () => {
  const p = ACCOMMODATIONS.find((a) => a.id === 'souphattra-presidential');
  assert.equal(p.selectable, false);
  assert.equal(p.ratePerNight, null);
  assert.equal(p.roomTotal, null);
  assert.match(p.reservedNote, /Bride & Groom/);
  assert.ok(!SELECTABLE_ACCOMMODATIONS.includes(p));
  const inv = createInventory(RES);
  assert.equal(inv['souphattra-presidential'], undefined); // no inventory, no requests
});

test('a registration naming a non-selectable category is rejected', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.stay = { accommodationId: 'souphattra-presidential', occupantGuestIds: ['g1', 'g2'], rooms: 1 };
  assert.ok(validateRegistration(reg, ctx(inv))
    .some((e) => e.includes('not available for guest requests')));
});

test('the Guest Relations record traces the category back to the approved buy-out row', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  const text = buildNotification(reg, { invitation: inv, accommodations: ACCOMMODATIONS });
  assert.ok(text.includes('Room Category: Heritage Executive'));
  assert.ok(text.includes('Buy-out Row: The Heritage'));
});

test('villa uses Party allocations; selection decreases by one per Party', () => {
  const inv = createInventory(RES);
  for (let i = 1; i <= 4; i++) {
    const a = requestAllocation(inv, 'villa', { partyId: 'P' + i, units: 1, submittedAt: 't' + i });
    holdAllocation(inv, a.allocId, 'h' + i);
  }
  assert.equal(remaining(inv.villa), 0);
  assert.equal(availabilityLabel(inv.villa), 'Fully allocated');
});

test('train seats count per Guest; linked Guests may choose differently', () => {
  const inv = createInventory(RES);
  // party of two, only one joins the train => one seat
  const a = requestAllocation(inv, 'train', { partyId: 'P1', guestIds: ['g1'], units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 'h1');
  assert.equal(remaining(inv.train), 7);
});

test('zero capacity triggers waitlist, not a request', () => {
  const inv = createInventory(RES);
  const a = requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 'h1');
  const b = requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P2', units: 1, submittedAt: 't2' });
  assert.equal(b.status, ALLOC.WAITLISTED);
  assert.equal(b.waitlist_position, 1);
});

test('pending requests block over-allocation before Guest Relations holds', () => {
  const inv = createInventory(RES);
  requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1' });
  const b = requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P2', units: 1, submittedAt: 't2' });
  assert.equal(b.status, ALLOC.WAITLISTED); // simultaneous-request protection
});

test('completed registration timestamp determines order', () => {
  const inv = createInventory(RES);
  requestAllocation(inv, 'heritage', { partyId: 'LATE', units: 1, submittedAt: '2027-01-02T10:00Z' });
  requestAllocation(inv, 'heritage', { partyId: 'EARLY', units: 1, submittedAt: '2027-01-01T09:00Z' });
  assert.deepEqual(inv.heritage.allocations.map((a) => a.partyId), ['EARLY', 'LATE']);
});

test('duplicate submission does not double-decrease capacity (idempotent)', () => {
  const inv = createInventory(RES);
  const a1 = requestAllocation(inv, 'grand-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1' });
  const a2 = requestAllocation(inv, 'grand-majestic-suite', { partyId: 'P1', units: 1, submittedAt: 't1-retry' });
  assert.equal(a1, a2);
  assert.equal(inv['grand-majestic-suite'].allocations.length, 1);
});

test('exact availability labels', () => {
  const inv = createInventory(RES);
  assert.equal(availabilityLabel(inv.heritage), '4 of 4 rooms remaining');
  const a = requestAllocation(inv, 'heritage', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 'h');
  assert.equal(availabilityLabel(inv.heritage), '3 of 4 rooms remaining');
  const g = requestAllocation(inv, 'souphattra-majestic-suite', { partyId: 'P2', units: 1, submittedAt: 't2' });
  assert.equal(availabilityLabel(inv['souphattra-majestic-suite']), 'Last room');
  holdAllocation(inv, g.allocId, 'h2');
  assert.equal(availabilityLabel(inv['souphattra-majestic-suite']), 'Fully allocated');
  assert.equal(availabilityLabel(inv.train), '8 of 8 seats remaining');
});

/* ---------------- Conditional / validation logic (§31) ---------------- */

function baseReg(inv) {
  return {
    guests: inv.guests.map((g) => ({
      guestId: g.guestId, preferredName: g.preferredName,
      email: g.preferredName.toLowerCase() + '@example.com', phone: '',
      journey: { bangkok: false, train: false, independent: true },
      events: { alms: true, ceremony: true, dinner: true },
      diet: 'No restrictions', allergy: 'no',
    })),
    stay: { accommodationId: 'the-heritage', occupantGuestIds: inv.guests.map((g) => g.guestId), rooms: 1 },
    arrival: { mode: 'flight', date: '2027-02-27', time: '11:30', point: 'Wattay International Airport (VTE)', ref: 'TG570', pickupRequested: true },
    departure: { date: '2027-03-01', point: 'Wattay International Airport (VTE)', transferRequested: true },
    registration_submitted_at: '2027-01-01T10:00:00Z',
  };
}
const ctx = (inv) => ({ invitation: inv, accommodations: ACCOMMODATIONS, trainCapacity: TRAIN.capacityTotal, train: TRAIN, transfers: TRANSFERS });

test('valid couple registration passes', () => {
  const inv = lookupInvitation('demo-amara');
  assert.deepEqual(validateRegistration(baseReg(inv), ctx(inv)), []);
});

test('each active Guest needs own contact data', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.guests[1].email = ''; reg.guests[1].phone = '';
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('contact details missing')));
});

test('dinner-only selective attendance is valid', () => {
  const inv = lookupInvitation('demo-lin');
  const reg = baseReg(inv);
  reg.guests[0].events = { alms: false, ceremony: false, dinner: true };
  assert.deepEqual(validateRegistration(reg, ctx(inv)), []);
});

test('pickup without arrival details fails; with details passes', () => {
  const inv = lookupInvitation('demo-lin');
  const reg = baseReg(inv);
  reg.arrival = { mode: 'flight', pickupRequested: true };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('pickup requires arrival details')));
});

test('departure transfer requires departure date', () => {
  const inv = lookupInvitation('demo-lin');
  const reg = baseReg(inv);
  reg.departure = { transferRequested: true };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('departure transfer')));
});

test('stay occupants outside the Party are rejected', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.stay.occupantGuestIds = ['g1', 'g99'];
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('not in Party')));
});

test('a registration without a stay is rejected (no digital no-room flow)', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.stay = { accommodationId: null };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('please select a stay')));
});

test('train is a confirmed USD 88 product inside the journey total', () => {
  assert.equal(trainContribution(TRAIN, 2), 176);
  const acc = ACCOMMODATIONS.find((a) => a.id === 'the-heritage');
  assert.equal(journeyTotal(acc, TRAIN, 2, TRANSFERS, []), 360 + 176);
  assert.equal(journeyTotal(null, TRAIN, 2, TRANSFERS, []), 176);
});

test('a transfer request needs its travel date; unknown services are rejected', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.transfers = [{ transferId: 'apt-pickup-jaguar', units: 1, details: {} }];
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('travel date')));
  reg.transfers = [{ transferId: 'apt-pickup-jaguar', units: 1, details: { date: '2027-02-27' } }];
  assert.deepEqual(validateRegistration(reg, ctx(inv)), []);
  reg.transfers = [{ transferId: 'ghost-service', units: 1, details: { date: '2027-02-27' } }];
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('unknown transfer service')));
});

test('the Guest Relations record carries transfers with units, price and status', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.transfers = [{ transferId: 'lcr-pickup-merc', units: 2, details: { date: '2027-02-27', time: '14:30', ref: 'C82', place: 'Kunming', location: 'Vientiane LCR station' } }];
  const text = buildNotification(reg, ctx(inv));
  assert.ok(text.includes('TRANSFERS'));
  assert.ok(text.includes('Service: LCR Station to Hotel by Mercedes-Benz'));
  assert.ok(text.includes('Units: 2 × USD 60'));
  assert.ok(text.includes('Train Number: C82'));
  assert.ok(text.includes('Transfers Total: USD 120'));
  assert.ok(text.includes('TOTAL: USD 480')); // room 360 + transfers 120
});

test('a Party may request exactly one room', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.stay.rooms = 2;
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('exactly one room')));
});

test('train over capacity is rejected', () => {
  const inv = lookupInvitation('demo-family');
  const reg = baseReg(inv);
  reg.guests.forEach((g) => { g.journey.train = true; });
  const errors = validateRegistration(reg, { ...ctx(inv), trainCapacity: 2 });
  assert.ok(errors.some((e) => e.includes('train selection exceeds')));
});

/* ---------------- Notification (§30) ---------------- */

test('notification carries party, per-guest data, charges, statuses', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.guests[0].journey = { bangkok: true, train: true, independent: false };
  reg.guests[0].berth = 'Sleeper berth · lower';
  reg.trainNote = 'Light sleeper, lower deck please';
  const text = buildNotification(reg, ctx(inv));
  assert.ok(text.includes('SEE YOU IN LAOS — NEW GUEST REGISTRATION'));
  assert.ok(text.includes('Party: Amara & Theo'));
  assert.ok(text.includes('Overnight Train (seat requested)'));
  // dedicated OVERNIGHT TRAIN section, separate from flight/arrival info
  assert.ok(text.includes('OVERNIGHT TRAIN'));
  assert.ok(text.includes('Train Requested: YES — 1 seat(s)'));
  assert.ok(text.includes('Amara Demo (Sleeper berth · lower)'));
  assert.ok(text.includes('Nong Khai Arrival: Nong Khai Railway Station'));
  assert.ok(text.includes('Special Requirement: Light sleeper, lower deck please'));
  assert.ok(text.includes('Property: Souphattra Heritage Vientiane'));
  assert.ok(text.includes('Room Category: Heritage Executive'));
  assert.ok(text.includes('Guests: Amara Demo; Theo Demo'));
  assert.ok(text.includes('Room Rate: USD 180 per room / night × 2 nights'));
  assert.ok(text.includes('Room Total: USD 360'));
  assert.ok(text.includes('JOURNEY COST'));
  assert.ok(text.includes('Train: 1 × USD 88 = USD 88'));
  assert.ok(text.includes('TOTAL: USD 448'));
  assert.ok(text.includes('Second Night: Complimentary / Hosted by Haruthai & Suthep'));
  assert.ok(text.includes('Status: REQUESTED / UNDER REVIEW'));
  // privacy: no internal figures
  assert.ok(!/7,?800|21,?600|286\.77|USD 170\b|C00[0-7]/.test(text));
});

/* ---------------- Production lookup (crypto) ---------------- */

test('production bundle: DEMO_MODE is off', () => {
  assert.equal(DEMO_MODE, false);
});

test('token crypto roundtrip: encrypt → lookup decrypts the party', async () => {
  const token = 'kxw3m9tqv7z2r4hj';
  const salt = '00112233445566778899aabbccddeeff';
  const iv = '0102030405060708090a0b0c';
  const payload = { invitationId: 'INV-T1', partyName: 'Test Party', partyLead: 'g1',
    guests: [{ guestId: 'g1', fullName: 'Test One', preferredName: 'Test' }] };
  const record = { id: await tokenId(token), salt, iv, ct: await encryptInvitation(token, salt, iv, payload) };
  const inv = await lookupByToken(token, [record]);
  assert.equal(inv.partyName, 'Test Party');
  assert.equal(inv.token, token);
  // ciphertext leaks nothing readable
  assert.ok(!record.ct.includes('Test'));
});

test('wrong token resolves to null, not an error', async () => {
  const token = 'kxw3m9tqv7z2r4hj';
  const salt = '00112233445566778899aabbccddeeff';
  const iv = '0102030405060708090a0b0c';
  const payload = { invitationId: 'INV-T1', partyName: 'Test Party', partyLead: 'g1', guests: [] };
  const record = { id: await tokenId(token), salt, iv, ct: await encryptInvitation(token, salt, iv, payload) };
  assert.equal(await lookupByToken('wrong-token-here', [record]), null);
  assert.equal(await lookupByToken('', [record]), null);
});

test('shipped invitations.enc.json contains no plaintext guest data', async () => {
  const fs = await import('node:fs');
  const raw = fs.readFileSync(new URL('../register/invitations.enc.json', import.meta.url), 'utf8');
  for (const name of ['Peggy', 'Steffie', 'Seray', 'Orhan', 'Marcel', 'Nongyao', 'Vipavee', 'partyName', 'fullName']) {
    assert.ok(!raw.includes(name), 'leak: ' + name);
  }
  const records = JSON.parse(raw);
  assert.ok(records.length >= 10);
  for (const r of records) {
    assert.deepEqual(Object.keys(r).sort(), ['ct', 'id', 'iv', 'salt']);
  }
});

/* ---------------- invitation overlay state machine ---------------- */

test('user-opened invitation can never transition back to OPEN', () => {
  const cur = { state: 'closed' };
  const r = nextInvitationState(cur, { to: 'open', userOpened: true });
  assert.equal(r.state, 'closed');
  assert.equal(r.blocked, 'BLOCKED_INVALID_TRANSITION');
});

test('stale async callbacks cannot reopen the overlay', () => {
  const cur = { state: 'closed' };
  // callback created at version 0, but a user click already advanced to 2
  const r = nextInvitationState(cur, { to: 'open', userOpened: false, version: 0, currentVersion: 2 });
  assert.equal(r.state, 'closed');
  assert.equal(r.blocked, 'STALE_ASYNC_CALLBACK');
});

test('explicit reopen link (force) is the only allowed reopen after user action', () => {
  const cur = { state: 'closed' };
  const r = nextInvitationState(cur, { to: 'open', userOpened: true, force: true });
  assert.equal(r.state, 'open');
  assert.equal(r.blocked, null);
});

test('normal init transitions work: loading -> open, loading -> closed', () => {
  assert.equal(nextInvitationState({ state: 'loading' }, { to: 'open' }).state, 'open');
  assert.equal(nextInvitationState({ state: 'loading' }, { to: 'closed' }).state, 'closed');
});

test('storage-unavailable session: userOpened flag alone keeps CLOSED', () => {
  // simulates private mode where nothing persists — the in-memory flag suffices
  let cur = { state: 'open' };
  cur = { state: nextInvitationState(cur, { to: 'closed', userOpened: true }).state };
  assert.equal(cur.state, 'closed');
  const again = nextInvitationState(cur, { to: 'open', userOpened: true });
  assert.equal(again.state, 'closed');
  assert.ok(again.blocked);
});


/* ---------------- approved-contribution publication matrix ---------------- */

test('rates are APPROVED for publication (Gate 1 closed by owner)', async () => {
  const data = (await import('node:fs')).readFileSync(new URL('../register/data.mjs', import.meta.url), 'utf8');
  assert.ok(/rates:\s*'APPROVED'/.test(data));
});

test('room totals are identical for solo and couple parties (per-room pricing)', () => {
  const cases = [
    ['villa', 0], ['heritage', 310], ['the-heritage', 360],
    ['heritage-grand-premier', 510], ['grand-majestic-suite', 550],
    ['souphattra-majestic-suite', 620],
  ];
  for (const [id, total] of cases) {
    assert.equal(partyTotal(byId(id)), total, id);
  }
});
