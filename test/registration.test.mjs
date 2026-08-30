import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contributionPerGuest, partyCharges, partyTotal,
  trainContribution, transfersTotal, journeyTotal,
  createInventory, remaining, availabilityLabel, requestAllocation,
  holdAllocation, confirmAllocation, releaseAllocation, ALLOC,
  inventorySnapshot, partyAllocation, isLocked,
  validateRegistration, buildNotification, nextInvitationState,
} from '../register/logic.mjs';
import { ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN, TRANSFERS, DEMO_MODE, BANGKOK_STAYS, POST_WEDDING } from '../register/data.mjs';
import { EVENTS } from '../register/data.mjs';
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

const GUEST_MATRIX = {
  heritage: 145, 'the-heritage': 155, 'heritage-grand-premier': 170,
  'noble-courtyard': 240, 'grand-majestic-suite': 250,
  'souphattra-majestic-suite': 290, 'souphattra-presidential': 750,
};
for (const [id, per] of Object.entries(GUEST_MATRIX)) {
  test('guest contribution — ' + id + ' = USD ' + per + ' per guest', () => {
    assert.equal(contributionPerGuest(byId(id)), per);
    assert.equal(partyTotal(byId(id), ['g1']), per);
    assert.equal(partyTotal(byId(id), ['g1', 'g2']), per * 2);
  });
}

test('couple examples from the final matrix', () => {
  assert.equal(partyTotal(byId('heritage'), ['g1', 'g2']), 290);
  assert.equal(partyTotal(byId('the-heritage'), ['g1', 'g2']), 310);
  assert.equal(partyTotal(byId('heritage-grand-premier'), ['g1', 'g2']), 340);
  assert.equal(partyTotal(byId('noble-courtyard'), ['g1', 'g2']), 480);
  assert.equal(partyTotal(byId('grand-majestic-suite'), ['g1', 'g2']), 500);
  assert.equal(partyTotal(byId('souphattra-majestic-suite'), ['g1', 'g2']), 580);
  assert.equal(partyTotal(byId('souphattra-presidential'), ['g1', 'g2']), 1500);
});

test('Majestic Suite and Presidential are RESERVED: never normally requestable', () => {
  for (const id of ['souphattra-majestic-suite', 'souphattra-presidential']) {
    const a = byId(id);
    assert.equal(a.selectable, false, id);
    assert.equal(a.reservedNote, 'Reserved', id);
    assert.ok(!SELECTABLE_ACCOMMODATIONS.includes(a), id);
  }
  const inv = createInventory(RES);
  assert.equal(inv['souphattra-majestic-suite'], undefined);
  assert.equal(inv['souphattra-presidential'], undefined);
});

test('internal rate columns never exist in the model (Public/Selling Rate stay internal)', () => {
  const banned = /publicRate|sellingRate|discount/i;
  for (const a of ACCOMMODATIONS) assert.ok(!banned.test(JSON.stringify(a)), a.name);
});

test('no room-per-night pricing exists anywhere in the model', () => {
  for (const a of ACCOMMODATIONS) {
    assert.equal(a.ratePerNight, undefined, a.name);
    assert.equal(a.roomTotal, undefined, a.name);
  }
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

test('live Journey Cost: stay + train + transfers from one calculation path', () => {
  // Heritage Executive couple 310 + 2×88 train + 1 Jaguar pickup 25 = 511
  const total = journeyTotal(byId('the-heritage'), ['g1', 'g2'], TRAIN, 2, TRANSFERS,
    [{ transferId: 'apt-pickup-jaguar', units: 1 }]);
  assert.equal(total, 511);
  assert.equal(journeyTotal(null, [], TRAIN, 0, TRANSFERS, []), 0);
});

test('airport transfers carry flight fields; LCR transfers carry train fields; shuttle is complimentary', () => {
  for (const t of TRANSFERS) {
    if (t.id === 'shuttle-shared') { assert.equal(t.pricePerUnit, 0); continue; } // shared shuttle: no charge, no questionnaire
    if (t.group === 'Airport') assert.equal(t.fieldsFor, 'flight');
    else assert.equal(t.fieldsFor, 'train');
  }
});

/* ---------------- Inventory logic (§25) ---------------- */

test('capacities match the final matrix: 26 physical rooms, 24 requestable', () => {
  const inv = createInventory(RES);
  assert.equal(inv.heritage.capacity_total, 5);
  assert.equal(inv['the-heritage'].capacity_total, 13);
  assert.equal(inv['heritage-grand-premier'].capacity_total, 3);
  assert.equal(inv['noble-courtyard'].capacity_total, 1);
  assert.equal(inv['grand-majestic-suite'].capacity_total, 2);
  assert.equal(inv.train.capacity_total, 8);
  assert.equal(inv.train.selection_scope, 'GUEST');
  assert.equal(inv.villa, undefined); // the cancelled 4BR villa has no inventory
  const modelRooms = ACCOMMODATIONS.filter((a) => a.capacityUnit === 'Room')
    .reduce((s, a) => s + a.capacityTotal, 0);
  assert.equal(modelRooms, 26); // full physical Souphattra inventory incl. the two RESERVED suites
  const requestable = Object.values(inv).filter((r) => r.capacity_unit === 'Room')
    .reduce((s, r) => s + r.capacity_total, 0);
  assert.equal(requestable, 24); // reserved suites carry no request inventory
  assert.equal(inv['airbnb-2br'].capacity_total, 1);
  assert.equal(inv['airbnb-2br'].capacity_unit, 'Party allocation');
});

test('the 2BR Airbnb is a complimentary limited-availability option, never priced (owner 2026-08-28)', () => {
  const b = ACCOMMODATIONS.find((a) => a.id === 'airbnb-2br');
  assert.equal(b.kind, 'airbnb');
  assert.equal(b.contributionPerGuest, null); // NO guest-facing amount exists
  assert.equal(b.badge, 'Alternative stay');  // §G differentiated hierarchy label
  assert.equal(b.property, 'Alternative Stay · Vientiane'); // §G differentiated hierarchy
  assert.equal(b.occupancy, 'Up to 4 adults');
  assert.equal(b.stay, '27 February – 1 March 2027');
  assert.equal(b.imageSlots, undefined); // real photos delivered 2026-08-26 replace the slots
  assert.deepEqual(b.images, [
    'assets/images/airbnb/airbnb-01.jpg',
    'assets/images/airbnb/airbnb-02.jpg',
    'assets/images/airbnb/airbnb-03.jpg',
  ]);
  assert.match(b.referenceUrl, /airbnb\.com\/rooms\/23930245/);
  assert.equal(b.status, 'Complimentary · limited availability'); // prominent status (owner §18)
  assert.match(b.blurb, /limited number of guests/i);             // §20 final description, no redundant status repeat
  const banned = /USD 0|fully hosted|nothing to book|guest rate/i;
  assert.ok(!banned.test(JSON.stringify(b)), 'the residence is never priced or over-promised');
  assert.equal(partyTotal(b, ['g1', 'g2']), 0); // internal neutral total, never displayed as USD 0
});

test('the airbnb GR record says ARRANGED SEPARATELY, never USD 0 or hosted', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.stay = { accommodationId: 'airbnb-2br', occupantGuestIds: ['g1', 'g2'], rooms: 1 };
  const text = buildNotification(reg, ctx(inv));
  assert.ok(text.includes('Guest Contribution: ARRANGED SEPARATELY'));
  assert.ok(text.includes('Stay: Arranged separately'));
  assert.ok(!/Guest Contribution: USD 0|Second Night: Complimentary[\s\S]{0,40}$/m.test(text.split('ACCOMMODATION')[1].split('OVERNIGHT TRAIN')[0].includes('Second Night') ? 'Second Night leaked' : ''));
  const accBlock = text.split('ACCOMMODATION')[1].split('OVERNIGHT TRAIN')[0];
  assert.ok(!accBlock.includes('Second Night'), 'hosted second-night claim must not apply to the Airbnb');
  assert.ok(!accBlock.includes('USD 0'));
});

test('the internal 4BR booking value never reaches any guest-facing source', async () => {
  const fs = await import('node:fs');
  for (const f of ['../register/data.mjs', '../register/app.mjs', '../register/logic.mjs', '../index.html', '../register/index.html']) {
    const t = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!t.includes('123.8'), 'internal booking value leaked into ' + f);
  }
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
  const a = requestAllocation(inv, 'noble-courtyard', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 't2');
  confirmAllocation(inv, a.allocId, 't3');
  assert.equal(isLocked(inv, 'noble-courtyard', 'P1'), true);
  assert.throws(() => releaseAllocation(inv, a.allocId, 't4'), /locked/);
  assert.equal(inventorySnapshot(inv['noble-courtyard']).locked, 1);
  releaseAllocation(inv, a.allocId, 't5', { force: true });
  assert.equal(isLocked(inv, 'noble-courtyard', 'P1'), false);
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
  const matrix = { heritage: 5, 'the-heritage': 13, 'heritage-grand-premier': 3, 'noble-courtyard': 1, 'grand-majestic-suite': 2 };
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

test('the removed villa can never be requested', () => {
  const inv = createInventory(RES);
  assert.equal(inv.villa, undefined);
  assert.throws(() => requestAllocation(inv, 'villa', { partyId: 'X', units: 1, submittedAt: 't' }), /unknown resource/);
});


/* ---------------- Accommodation model (complete room presentation) ------- */

test('the active accommodation master is complete (final matrix, no villa)', () => {
  const names = ACCOMMODATIONS.map((a) => a.name);
  assert.deepEqual(names, [
    'The Heritage', 'Heritage Executive', 'Heritage Grand Premier',
    'Noble Courtyard Suite', 'Grand Majestic Suite', 'Souphattra Majestic Suite',
    'Souphattra Presidential', 'Private Residence', // §G: differentiated alternative-stay identity
  ]);
  assert.ok(!names.some((n) => /Cozy Villa|4BR/i.test(n)), 'the cancelled 4BR villa never returns');
  assert.ok(!names.some((n) => /Heritage Exclusive/i.test(n)), 'it is Heritage Executive, never Exclusive');
  const noble = ACCOMMODATIONS.find((a) => a.id === 'noble-courtyard');
  assert.ok(/two bathrooms/.test(noble.blurb), 'Noble Courtyard keeps its full description');
  assert.equal(noble.location, 'Ground floor · central greenery · one suite only');
  for (const a of ACCOMMODATIONS) {
    assert.ok(a.size, a.name + ' needs a size');
    assert.ok(a.bed, a.name + ' needs a bed configuration');
    assert.ok(a.occupancy, a.name + ' needs an occupancy');
    assert.ok(a.location, a.name + ' needs a location');
    assert.ok(a.blurb && a.blurb.length > 20, a.name + ' needs a description');
    assert.ok((a.amenities || []).length >= 4, a.name + ' needs amenities');
    if (a.kind !== 'airbnb') {
      assert.ok((a.images || []).length >= 3, a.name + ' needs a hero image and gallery');
    }
    for (const src of a.images) assert.match(src, /^assets\/images\/(rooms|airbnb)\/[a-z0-9-]+\.jpg$/);
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

test('the Presidential is priced at USD 750 and RESERVED', () => {
  const p = ACCOMMODATIONS.find((a) => a.id === 'souphattra-presidential');
  assert.equal(contributionPerGuest(p), 750);
  assert.equal(p.capacityTotal, 1);
  assert.equal(p.selectable, false);
});

test('the Guest Relations record traces the category back to the approved buy-out row', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  const text = buildNotification(reg, { invitation: inv, accommodations: ACCOMMODATIONS });
  assert.ok(text.includes('Room Category: Heritage Executive'));
  assert.ok(text.includes('Buy-out Row: The Heritage'));
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
  const a = requestAllocation(inv, 'noble-courtyard', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 'h1');
  const b = requestAllocation(inv, 'noble-courtyard', { partyId: 'P2', units: 1, submittedAt: 't2' });
  assert.equal(b.status, ALLOC.WAITLISTED);
  assert.equal(b.waitlist_position, 1);
});

test('pending requests block over-allocation before Guest Relations holds', () => {
  const inv = createInventory(RES);
  requestAllocation(inv, 'noble-courtyard', { partyId: 'P1', units: 1, submittedAt: 't1' });
  const b = requestAllocation(inv, 'noble-courtyard', { partyId: 'P2', units: 1, submittedAt: 't2' });
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
  assert.equal(availabilityLabel(inv.heritage), '5 of 5 rooms remaining');
  const a = requestAllocation(inv, 'heritage', { partyId: 'P1', units: 1, submittedAt: 't1' });
  holdAllocation(inv, a.allocId, 'h');
  assert.equal(availabilityLabel(inv.heritage), '4 of 5 rooms remaining');
  const g = requestAllocation(inv, 'noble-courtyard', { partyId: 'P2', units: 1, submittedAt: 't2' });
  assert.equal(availabilityLabel(inv['noble-courtyard']), 'Last room');
  holdAllocation(inv, g.allocId, 'h2');
  assert.equal(availabilityLabel(inv['noble-courtyard']), 'Fully allocated');
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
    dressAck: { alms: true, ceremony: true, dinner: true }, // per-event acknowledgement (§21)
    registration_submitted_at: '2027-01-01T10:00:00Z',
  };
}
const ctx = (inv) => ({ invitation: inv, accommodations: ACCOMMODATIONS, trainCapacity: TRAIN.capacityTotal, train: TRAIN, transfers: TRANSFERS, events: EVENTS });

test('each wedding moment needs its OWN dress code acknowledgement (§21)', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.dressAck = { alms: true, ceremony: true, dinner: false };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('dress code for the Wedding Dinner')));
  reg.dressAck = { alms: false, ceremony: true, dinner: true };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('dress code for the Alms Giving')));
  // NOT JOINING an optional moment needs no acknowledgement for it
  reg.guests.forEach((g) => { g.events.alms = false; });
  assert.ok(!validateRegistration(reg, ctx(inv)).some((e) => e.includes('Alms')));
  // the mandatory ceremony still needs its own explicit acknowledgement
  reg.dressAck = { alms: true, ceremony: false, dinner: true };
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('dress code for the Vow Ceremony')));
});

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
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => e.includes('not in invitation')));
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
  assert.equal(journeyTotal(acc, ['g1', 'g2'], TRAIN, 2, TRANSFERS, []), 310 + 176);
  assert.equal(journeyTotal(null, [], TRAIN, 2, TRANSFERS, []), 176);
});

test('a transfer request needs NO questionnaire (full service); unknown services are rejected', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.transfers = [{ transferId: 'apt-pickup-jaguar', units: 1, details: {} }];
  assert.deepEqual(validateRegistration(reg, ctx(inv)), []); // Guest Relations completes details personally
  reg.transfers = [{ transferId: 'shuttle-shared', units: 1, details: {} }];
  assert.deepEqual(validateRegistration(reg, ctx(inv)), []); // complimentary shared shuttle bookable as-is
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
  assert.ok(text.includes('TOTAL: USD 430')); // stay 310 + transfers 120
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
  assert.ok(text.includes('Name: Amara & Theo'));
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
  assert.ok(text.includes('Guest Contribution: USD 155 each'));
  assert.ok(text.includes('Stay Total: USD 310 (2 guests)'));
  assert.ok(text.includes('JOURNEY COST'));
  assert.ok(text.includes('Train: 1 × USD 88 = USD 88'));
  assert.ok(text.includes('TOTAL: USD 398'));
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

test('per-guest charges: one charge record per occupying guest', () => {
  const charges = partyCharges(byId('noble-courtyard'), ['g1', 'g2']);
  assert.equal(charges.length, 2);
  assert.deepEqual(charges.map((c) => c.amount), [240, 240]);
});


/* ---------------- journey extension · currency · safety (cumulative instruction) ---------------- */

test('displayMoney: USD is the master and the fallback — never a fabricated rate', async () => {
  const { displayMoney } = await import('../register/logic.mjs');
  assert.equal(displayMoney(656, 'USD', { EUR: 0.9, THB: 35 }), 'USD 656');
  assert.equal(displayMoney(656, 'EUR', null), 'USD 656');
  assert.equal(displayMoney(656, 'EUR', {}), 'USD 656');
  assert.equal(displayMoney(100, 'EUR', { EUR: 0.9, THB: 35 }), 'EUR 90.00');
  assert.equal(displayMoney(100, 'THB', { EUR: 0.9, THB: 35.4 }), 'THB 3,540');
});

test('nongkhai-vte transfer: owner set contribution USD 20, arrival direction', () => {
  const t = TRANSFERS.find((x) => x.id === 'nongkhai-vte');
  assert.ok(t, 'Nong Khai onward transfer exists');
  assert.equal(t.pricePerUnit, 20);
  assert.equal(t.direction, 'arrival');
});

test('allergy declared without kitchen detail blocks completion (§30)', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.guests[0].allergy = 'yes';
  reg.guests[0].allergyDetail = '';
  assert.ok(validateRegistration(reg, ctx(inv)).some((e) => /allergy under My Profile/.test(e)));
  reg.guests[0].allergyDetail = 'Peanuts — strictly no traces';
  assert.ok(!validateRegistration(reg, ctx(inv)).some((e) => /allergy under My Profile/.test(e)));
});

test('post wedding architecture: no invented contributions, no China vehicle', () => {
  assert.equal(POST_WEDDING.length, 5);
  for (const c of POST_WEDDING) assert.equal(c.contribution, null);
  const flat = JSON.stringify(POST_WEDDING).toLowerCase();
  assert.ok(!flat.includes('car'), 'no vehicle assumption in China (§14)');
  assert.equal(BANGKOK_STAYS.length, 2);
  assert.ok(BANGKOK_STAYS.every((h) => !('contributionPerGuest' in h) && !('price' in h)));
});

test('registration payload accepts bangkokStay and postWedding without new errors', () => {
  const inv = lookupInvitation('demo-amara');
  const reg = baseReg(inv);
  reg.bangkokStay = { property: 'mandarin-oriental', from: '2027-02-24', to: '2027-02-26' };
  reg.postWedding = { joined: true };
  assert.deepEqual(validateRegistration(reg, ctx(inv)), []);
});

test('event naming: Wedding Dinner without Reception (§25)', () => {
  const dinner = EVENTS.find((e) => e.id === 'dinner');
  assert.equal(dinner.label, 'Wedding Dinner');
});
