import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  contributionPerGuest, partyCharges, partyTotal,
  trainContribution, journeyTotal,
  createInventory, remaining, availabilityLabel, requestAllocation,
  holdAllocation, confirmAllocation, releaseAllocation, ALLOC,
  inventorySnapshot, partyAllocation, isLocked,
  validateRegistration, buildNotification, nextInvitationState,
} from '../register/logic.mjs';
import { ACCOMMODATIONS, SELECTABLE_ACCOMMODATIONS, TRAIN, DEMO_MODE } from '../register/data.mjs';
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

/* ---------------- Contribution logic (§20) ---------------- */

const EXPECTED = {
  heritage: 140.00, 'the-heritage': 150.00, 'heritage-grand-premier': 162.50,
  'noble-courtyard': 225.00, 'grand-majestic-suite': 235.00,
  'souphattra-majestic-suite': 275.00, villa: 0,
};
for (const [id, per] of Object.entries(EXPECTED)) {
  test('approved contribution — ' + id + ' = USD ' + per + ' per Guest', () => {
    assert.equal(contributionPerGuest(byId(id)), per);
  });
}

test('two linked Guests produce two separate individual charges', () => {
  const charges = partyCharges(byId('the-heritage'), ['g1', 'g2']);
  assert.equal(charges.length, 2);
  assert.deepEqual(charges.map((c) => c.amount), [150, 150]);
  assert.notEqual(charges[0].guestId, charges[1].guestId);
});

test('Party total equals sum of individual contributions', () => {
  assert.equal(partyTotal(byId('the-heritage'), ['g1', 'g2']), 300);
  assert.equal(partyTotal(byId('heritage-grand-premier'), ['g1', 'g2']), 325);
  assert.equal(partyTotal(byId('villa'), ['g1', 'g2']), 0);
});

test('room count never multiplies the per-Guest contribution', () => {
  // one Party = one room regardless of category size; charges depend on guests only
  const one = partyTotal(byId('noble-courtyard'), ['g1', 'g2']);
  assert.equal(one, 450); // 225 × 2 guests, not × rooms
});

/* ---------------- Inventory logic (§25) ---------------- */

test('capacities match the brief', () => {
  const inv = createInventory(RES);
  assert.equal(inv.villa.capacity_total, 4);
  assert.equal(inv.heritage.capacity_total, 4);
  assert.equal(inv['the-heritage'].capacity_total, 13);
  assert.equal(inv['heritage-grand-premier'].capacity_total, 3);
  assert.equal(inv['noble-courtyard'].capacity_total, 1);
  assert.equal(inv['grand-majestic-suite'].capacity_total, 2);
  assert.equal(inv['souphattra-majestic-suite'].capacity_total, 1);
  assert.equal(inv.train.capacity_total, 8);
  assert.equal(inv.train.selection_scope, 'GUEST');
  assert.equal(inv.villa.selection_scope, 'PARTY');
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

test('no overbooking: more Parties than rooms produce exactly capacity requests, rest waitlisted', () => {
  const inv = createInventory(RES);
  const results = [];
  for (let i = 1; i <= 6; i++) {
    results.push(requestAllocation(inv, 'heritage-grand-premier',
      { partyId: 'P' + i, units: 1, submittedAt: '2027-01-0' + i + 'T10:00:00Z' }));
  }
  const requested = results.filter((r) => r.status === ALLOC.REQUESTED);
  const waitlisted = results.filter((r) => r.status === ALLOC.WAITLISTED);
  assert.equal(requested.length, 3);           // capacity is 3
  assert.equal(waitlisted.length, 3);
  assert.deepEqual(waitlisted.map((w) => w.waitlist_position), [1, 2, 3]);
  assert.equal(inventorySnapshot(inv['heritage-grand-premier']).available, 0);
  // the single-room categories can never take a second Party
  const solo = ['noble-courtyard', 'souphattra-majestic-suite'];
  for (const id of solo) {
    const first = requestAllocation(inv, id, { partyId: 'A', units: 1, submittedAt: 't1' });
    const second = requestAllocation(inv, id, { partyId: 'B', units: 1, submittedAt: 't2' });
    assert.equal(first.status, ALLOC.REQUESTED);
    assert.equal(second.status, ALLOC.WAITLISTED);
  }
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

test('all seven Souphattra categories plus the villa are present and complete', () => {
  const names = ACCOMMODATIONS.map((a) => a.name);
  assert.deepEqual(names, [
    'Vientiane Urban Cozy Villa 2 (4BR)',
    'The Heritage', 'Heritage Executive', 'Heritage Grand Premier',
    'Noble Courtyard Suite', 'Grand Majestic Suite', 'Souphattra Majestic Suite',
    'Souphattra Presidential',
  ]);
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
  assert.equal(p.contributionPerGuest, null);
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
const ctx = (inv) => ({ invitation: inv, accommodations: ACCOMMODATIONS, trainCapacity: TRAIN.capacityTotal });

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

test('train contribution stays null until an amount is approved; journey total = stay only', () => {
  assert.equal(TRAIN.contributionPerGuest ?? null, null);
  assert.equal(trainContribution(TRAIN, 2), null);
  const acc = ACCOMMODATIONS.find((a) => a.id === 'the-heritage');
  assert.equal(journeyTotal(acc, ['g1', 'g2'], TRAIN, 2), 300);
  assert.equal(journeyTotal(null, [], TRAIN, 2), 0);
});

test('an approved train amount flows into the journey total (single calculation path)', () => {
  const t = { ...TRAIN, contributionPerGuest: 25 };
  assert.equal(trainContribution(t, 2), 50);
  const acc = ACCOMMODATIONS.find((a) => a.id === 'the-heritage');
  assert.equal(journeyTotal(acc, ['g1', 'g2'], t, 2), 350);
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
  assert.ok(text.includes('Contribution: USD 150'));
  assert.ok(text.includes('Property: Souphattra Heritage Vientiane'));
  assert.ok(text.includes('Room Category: Heritage Executive'));
  assert.ok(text.includes('Guests: Amara Demo; Theo Demo'));
  assert.ok(text.includes('Guest Contribution: USD 150 each'));
  assert.ok(text.includes('Party Contribution: USD 300'));
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

test('solo and couple party contributions across every category', () => {
  const cases = [
    ['villa', 0, 0], ['heritage', 140, 280], ['the-heritage', 150, 300],
    ['heritage-grand-premier', 162.5, 325], ['noble-courtyard', 225, 450],
    ['grand-majestic-suite', 235, 470], ['souphattra-majestic-suite', 275, 550],
  ];
  for (const [id, solo, couple] of cases) {
    assert.equal(partyTotal(byId(id), ['g1']), solo, id + ' solo');
    assert.equal(partyTotal(byId(id), ['g1', 'g2']), couple, id + ' couple');
  }
});
