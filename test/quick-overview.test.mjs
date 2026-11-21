/* ============================================================================
   THE OVERVIEW · its figures (HS-034 + HS-035, Owners HS-PROMPT-052, 21 Nov 2026) — src/billing/quick-overview.js

   Pure readings of answers the console already reads, with SYNTHETIC data only (no real guest, rate or document):
     · finance: mutually exclusive statement states that add up to the issued statements; the couple apart; a share only of
       complete figures (an incomplete one is never 0); "to verify" never counted as paid
     · the pricing rule: every amount is the route's own cents passed through — no amount per person, night or room
     · hotels: the wedding hotels' share rests on the server's own total, the China trip has its own 100 %
     · the Souphattra per night against its 26 rooms (provisional · E15a), the third-party occupancy unknown (E15b)
     · participation: who joins what as sent, the seats of the ledger, persons per night from the room plan, the documents and
       the food-allergy answer as sent — ids and counts only: no name, no free text, no file name, no key
     · every list a figure opens has exactly the figure's count; E16's 50 lives only in its named constant
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { quickFinanceOf, participationOf, OWNER_DINNER_ALTERNATIVE, souphattraCapacity } from '../src/billing/quick-overview.js';

const m = (cents) => ({ cents, amount: cents == null ? null : cents / 100, display: '' });
const holder = (id, status, o) => ({ Holder_ID: id, revision: 1, paymentStatus: status, paymentFlags: [], pendingVerification: 0, ...(o || {}) });
function revenue(o) {
  return {
    calculatedAt: '2026-11-21T08:00:00.000Z', asOf: '2026-11-21',
    issuedRevenue: { cents: 100000, complete: true }, cashCollected: { cents: 40000, complete: true }, outstanding: { cents: 60000, complete: true },
    overdue: { cents: 10000, complete: true }, refundDue: { cents: 0, complete: true }, bookedRevenue: { cents: 120000, complete: true },
    notYetInvoiced: { cents: 20000, complete: true, contributors: ['INV-G905'] },
    paymentsReported: { cents: 5000, rows: 2, duplicateSuspects: 0, unreadable: 0 },
    holders: [
      holder('INV-G901', 'PAID'), holder('INV-G902', 'UNPAID', { paymentFlags: ['OVERDUE'] }), holder('INV-G903', 'PARTIAL', { pendingVerification: 2 }),
      holder('INV-G904', 'NOTHING_DUE'), holder('INV-G906', 'OVERPAID'), holder('INV-G907', 'UNPAID'),
      { Holder_ID: 'INV-G905', revision: null, paymentStatus: null, paymentFlags: [], pendingVerification: 0 },
    ],
    couple: [{ Holder_ID: 'INV-G048' }, { Holder_ID: 'INV-G049' }],
    classes: { complete: true, classes: { SOUPHATTRA_ACCOMMODATION: { label: 'Souphattra', booked: m(80000), invoiced: m(70000), received: m(30000), outstanding: m(40000) } },
      china: { label: 'China trip', booked: m(10000), invoiced: m(10000), received: m(0), outstanding: m(10000) }, totalGuestBilling: { booked: m(90000), invoiced: m(80000), received: m(30000), outstanding: m(50000) } },
    quotaUtilisation: [{ Item_ID: 'B-TRAIN', Quota: 12, used: 3, overQuota: false, persons: 3 }, { Item_ID: 'B-VAN', Quota: 12, used: 2, overQuota: false, persons: 2 }],
    breakdown: { extras: [{ Item_ID: 'TEMPLE-OFFERING', persons: 7 }] },
    budget: {
      available: true, inventory: [{ Item_ID: 'C-ROOM', centre: 'C', unit: 'ROOM', quota: 22 }],
      centres: [{ id: 'B', kind: 'ROUTE', place: 'Night train', from: '2027-02-24', to: '2027-02-25', items: ['B-TRAIN', 'B-VAN'], status: 'COMPLETE',
        guest: [{ person: 'G901', item: 'B-TRAIN' }, { person: 'G902', item: 'B-TRAIN' }, { person: 'G901', item: 'B-VAN' }, { person: 'G903', item: 'B-TRAIN' }, { person: 'G902', item: 'B-VAN' }] },
        { id: 'E2', kind: 'ROUTE', place: 'Flight', from: '2027-03-01', to: '2027-03-01', items: ['E2-FLIGHT'], status: 'OUTSIDE', guest: [] }],
      suppliers: [{ vendor: 'Souphattra', category: 'Accommodation', contract: { currency: 'USD', cents: 810000 }, paidCounted: [{ currency: 'USD', cents: 405000 }], outstanding: { currency: 'USD', cents: 405000 } }],
      report: {
        byHotel: { reconciliation: { revenueHotelsCents: 100000, revenueAgree: true }, complete: true,
          wedding: [{ id: 'souphattra', name: 'Souphattra', revenue: { booked: { cents: 75000 }, invoiced: { cents: 70000 }, received: { cents: 30000 }, outstanding: { cents: 40000 }, notSplit: 0 },
            forecast: { cents: 900000 }, committed: [{ currency: 'USD', cents: 810000 }], paid: [{ currency: 'USD', cents: 405000 }] },
            { id: 'usathorn', name: 'U Sathorn', revenue: { booked: { cents: 25000 }, invoiced: { cents: 0 }, received: { cents: 0 }, outstanding: { cents: 0 }, notSplit: 0 },
              forecast: { cents: 100000 }, committed: [], paid: [] }],
          china: [{ id: 'yifangju', name: 'Yifangju', china: true, revenue: { booked: { cents: 10000 } }, forecast: null, committed: [{ currency: 'CNY', cents: 50000 }], paid: [] }] },
        hotel: [{ stay: 'C', place: 'Souphattra', from: '2027-02-25', to: '2027-02-27', roomsBought: 1, roomsAdditional: 5, roomsOccupied: 6, guests: 12, emptyBought: 0 },
          { stay: 'D1', place: 'Souphattra', from: '2027-02-27', to: '2027-03-01', roomsBought: 26, roomsAdditional: 0, roomsOccupied: 24, guests: 49, emptyBought: 2 },
          { stay: 'A2', place: 'U Sathorn', from: '2027-02-21', to: '2027-02-24', roomsBought: null, roomsOccupied: 3, guests: 6 }],
      },
    },
    ...(o || {}),
  };
}

test('FINANCE · the statement states exclude each other and add up to the issued statements; the couple apart; "nothing due" is not paid', () => {
  const Q = quickFinanceOf(revenue()).finance;
  const sum = Q.buckets.reduce((n, b) => n + b.n, 0);
  assert.equal(sum, Q.statements.issued); assert.equal(Q.statements.issued, 6); assert.equal(Q.statements.notIssued, 1);
  const by = Object.fromEntries(Q.buckets.map((b) => [b.key, b.ids]));
  assert.deepEqual(by.OVERDUE, ['INV-G902']); assert.deepEqual(by.UNPAID, ['INV-G907'], 'overdue is its own state, never also unpaid');
  assert.deepEqual(by.PAID, ['INV-G901']); assert.deepEqual(by.NOTHING_DUE, ['INV-G904']);
  for (const b of Q.buckets) assert.equal(b.ids.length, b.n, b.key + ': the list is exactly the figure');
  assert.equal(Q.statements.couple, 2); assert.ok(!JSON.stringify(Q.buckets).includes('INV-G048'), 'the couple is never in the paying states');
  assert.deepEqual(Q.reported.ids, ['INV-G903']); assert.equal(Q.reported.counted, false, 'a reported payment is never counted as received');
  assert.deepEqual(Q.notYetInvoicedIds, ['INV-G905']); assert.deepEqual(Q.statements.notIssuedIds, ['INV-G905']);
  assert.deepEqual(Q.ratios.received, { num: 40000, den: 100000, pct: 40, base: 'RECEIVED_OF_INVOICED', status: 'OK' });
});

test('FINANCE · an incomplete figure stays incomplete: no share, never 0, the known part only as a part', () => {
  const Q = quickFinanceOf(revenue({ cashCollected: { cents: null, complete: false, partial: { cents: 30000 }, gaps: [{ Holder_ID: 'INV-G903' }] } })).finance;
  assert.equal(Q.amounts.received.cents, null); assert.equal(Q.amounts.received.partialCents, 30000); assert.equal(Q.amounts.received.status, 'KPI_INCOMPLETE');
  assert.equal(Q.ratios.received.pct, null); assert.equal(Q.ratios.received.status, 'KPI_INCOMPLETE');
  const P = quickFinanceOf(revenue({ issuedRevenue: { cents: 100000, complete: false } })).finance;
  assert.equal(P.ratios.received.pct, null, 'a partial base gives no share');
  const Z = quickFinanceOf(revenue({ issuedRevenue: { cents: 0, complete: true }, cashCollected: { cents: 0, complete: true } })).finance;
  assert.equal(Z.ratios.received.status, 'NO_BASE');
});

test('PRICING RULE · every amount is the route\'s own cents, passed through — no amount per person, night or room is formed', () => {
  const R = revenue(), Q = quickFinanceOf(R);
  const allowed = new Set();
  const collect = (v) => { if (Array.isArray(v)) v.forEach(collect); else if (v && typeof v === 'object') { for (const [k, x] of Object.entries(v)) { if (k === 'cents' && typeof x === 'number') allowed.add(x); collect(x); } } };
  collect(R);
  const out = [];
  const walk = (v, path) => { if (Array.isArray(v)) v.forEach((x, i) => walk(x, path + '[' + i + ']')); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) {
    if (/(cents|Cents|booked|invoiced|received|outstanding|forecast)$/.test(k) && typeof x === 'number') out.push([path + '.' + k, x]); walk(x, path + '.' + k); } };
  walk(Q, 'quick');
  for (const [p, x] of out) assert.ok(allowed.has(x) || /\.(den|num)$/.test(p), p + ' = ' + x + ' is not a figure of the route');
  /* the only sums are share bases (never shown as a figure): the wedding hotels' forecasts and the China hotels' guest billing */
  assert.equal(Q.hotels.wedding[0].revenueShare.den, 100000, 'the wedding share rests on the server\'s own total');
  assert.equal(Q.hotels.china[0].revenueShare.pct, 100, 'the China trip has its own 100 %');
  assert.equal(Q.hotels.wedding[0].forecastShare.pct, 90);
  assert.deepEqual(Q.hotels.wedding[0].paidShare, [{ currency: 'USD', pct: 50 }], 'paid of committed, within one currency');
  assert.deepEqual(Q.hotels.china[0].committed, [{ currency: 'CNY', cents: 50000 }], 'never converted');
  assert.deepEqual(Q.hotels.suppliers[0].outstanding, { currency: 'USD', cents: 405000 }, 'the supplier\'s open balance is the server\'s');
  assert.equal(Q.classes.rows.find((r) => r.key === 'CHINA').outsideWeddingBudget, true);
  const src = fs.readFileSync(new URL('../src/billing/quick-overview.js', import.meta.url), 'utf8');
  assert.ok(!/\/\s*(guests|persons|nights|rooms)\b/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')), 'no division by guests, persons, nights or rooms');
});

test('HOTELS · not available without the report: a named gap, no figure', () => {
  const Q = quickFinanceOf(revenue({ budget: { available: false, gap: '004: not read' } }));
  assert.equal(Q.hotels.status, 'NOT_AVAILABLE'); assert.match(Q.hotels.why, /004/);
  assert.equal(Q.souphattra.status, 'NOT_AVAILABLE'); assert.equal(Q.souphattra.capacity.status, 'PROVISIONAL');
  assert.equal(Q.legs.status, 'NOT_AVAILABLE', 'no legs is said, never an empty list'); assert.match(Q.legs.why, /004/);
});

test('SOUPHATTRA · per night against its 26 rooms (provisional · E15a), our allocation beside it (E19a), third parties unknown (E15b)', () => {
  const S = quickFinanceOf(revenue()).souphattra;
  assert.equal(souphattraCapacity(), 26); assert.deepEqual(S.capacity, { rooms: 26, status: 'PROVISIONAL', decision: 'E15a' });
  assert.deepEqual(S.nights.map((n) => n.night), ['2027-02-25', '2027-02-26', '2027-02-27', '2027-02-28']);
  const n25 = S.nights[0], n27 = S.nights[2];
  assert.deepEqual([n25.bought, n25.occupied, n25.allocation, n25.guests], [6, 6, 22, 12]);
  assert.deepEqual([n27.bought, n27.occupied, n27.boughtEmpty], [26, 24, 2]);
  assert.equal(n27.shareBought.pct, 100); assert.equal(n27.shareOccupied.pct, 92.3);
  for (const n of S.nights) assert.deepEqual(n.thirdParty, { value: null, status: 'UNKNOWN', decision: 'E15b' });
  assert.deepEqual(S.total, { capacityRoomNights: 104, boughtRoomNights: 64, occupiedRoomNights: 60 });
  assert.equal(S.otherHotels[0].capacity.status, 'NOT_DOCUMENTED');
});

test('LEGS · one meter per item against its own quota — never the quotas of a train and a van added up; a leg the guests book is not counted', () => {
  const Q = quickFinanceOf(revenue());
  assert.equal(Q.legs.status, 'OK');
  const B = Q.legs.rows.find((l) => l.id === 'B');
  assert.deepEqual(B.ids, ['G901', 'G902', 'G903']); assert.equal(B.persons, 3); assert.equal(B.kind, 'HS_BUYS');
  const train = B.items.find((i) => i.itemId === 'B-TRAIN'), van = B.items.find((i) => i.itemId === 'B-VAN');
  assert.deepEqual([train.persons, train.quota, train.share.pct], [3, 12, 25]); assert.deepEqual([van.persons, van.quota], [2, 12]);
  assert.ok(!JSON.stringify(B).includes('"quota":24'), 'never 12 + 12');
  const E2 = Q.legs.rows.find((l) => l.id === 'E2');
  assert.deepEqual([E2.kind, E2.persons, E2.status, E2.items.length], ['GUEST_BOOKS', null, 'NOT_RECORDED', 0], 'not "0 persons" as a fact');
  assert.deepEqual(Q.offering, { persons: 7, status: 'OK', note: 'NOT_THE_ATTENDANCE_COUNT' });
});

test('FINANCE · a guest the register no longer names (cancelled) is not a paying guest without a statement', () => {
  const Q = quickFinanceOf(revenue({ cancelledHolders: [{ Holder_ID: 'INV-G905' }] })).finance;
  assert.deepEqual(Q.statements.notIssuedIds, []); assert.equal(Q.statements.cancelled, 1); assert.equal(Q.statements.paying, 6);
});

/* ------------------------------------------------------------ participation */
const sent = (g, o) => ({ submissionId: 'S-' + g, version: 1, guestId: g, registration: {
  guestId: g, guestRecord: { scope: { vientianeWedding: true }, guests: [{ name: 'Secret Name', allergy: o.allergy || { answer: 'No' }, profile: {} }] },
  templeCeremony: { guests: [{ guestId: g, events: o.events || {}, finaleKey: o.finale || '', sangkhathanState: o.sang || '' }] },
  documents: { guests: [{ documents: o.docs || [] }] }, selections: o.selections || [] } });
function assignInput() {
  const roster = [
    { guestId: 'G048', invitationId: 'INV-G048', partyId: 'INV-001', hosts: true, couple: 'BRIDE', booking: 'CONFIRMED', attendance: { ceremony: 'yes', dinner: 'yes' }, group: { size: 2 } },
    { guestId: 'G049', invitationId: 'INV-G049', partyId: 'INV-001', hosts: true, couple: 'GROOM', booking: 'CONFIRMED', attendance: { ceremony: 'yes', dinner: 'yes' }, group: { size: 2 } },
    { guestId: 'G901', invitationId: 'INV-G901', partyId: 'INV-900', booking: 'CONFIRMED', attendance: { ceremony: 'yes', dinner: 'yes' }, group: { size: 2 } },
    { guestId: 'G902', invitationId: 'INV-G902', partyId: 'INV-900', booking: 'SENT', attendance: { ceremony: 'yes', dinner: 'no' }, group: { size: 2 } },
    { guestId: 'G903', invitationId: 'INV-G903', partyId: 'INV-903', booking: 'NOT_SENT', attendance: { ceremony: 'not-sent', dinner: 'not-sent' }, group: { size: 1 } },
    { guestId: 'G904', invitationId: 'INV-G904', partyId: 'INV-904', booking: 'DECLINED', attendance: { ceremony: 'no', dinner: 'no', wedding: false }, group: { size: 1 } },
  ];
  const records = {
    'INV-G901': sent('G901', { events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, finale: 'pool', allergy: { answer: 'Yes', details: 'Peanut-secret' },
      docs: [{ kind: 'passport', state: 'received', receivedAt: '2026-10-01T10:00:00Z', filename: 'secret-file.pdf', sha256: 'deadbeef' }, { kind: 'flight', state: 'none' }],
      selections: [{ id: '1872', name: 'Tea at 1872', request: true }] }),
    'INV-G902': sent('G902', { events: { temple: 'Not joining', coffee: 'Joining' }, selections: [{ id: 'tea1872', name: 'Tea at 1872', request: true }] }),
    'INV-G904': { submissionId: 'S-G904', version: 1, guestId: 'G904', registration: { guestId: 'G904', guestRecord: { scope: { none: true } } } },
  };
  const seat = (id, g, state) => ({ seatId: id, guestId: g, state: state || 'held', by: null });
  const seating = { open: true, capacity: { ceremony: { guestSeats: 52, left: 22, right: 30, couple: 2, totalPeople: 54 }, dinner: { guestSeats: 54, top: 27, bottom: 27, totalPeople: 54 } },
    events: { ceremony: { seats: [seat('C-L-01-01', 'G901'), seat('C-R-01-01', 'G902'), seat('C-R-01-02', null, 'available')] },
      dinner: { seats: [seat('D-T-01', 'G048'), seat('D-T-02', 'G049'), seat('D-B-01', 'G902', 'allocated')] } } };
  const stays = [{ window: 'prewed', categories: [{ checkIn: '2027-02-25', checkOut: '2027-02-27', units: [{ occupants: [{ guestId: 'G901' }] }] }] },
    { window: 'wedstay', categories: [{ checkIn: '2027-02-27', checkOut: '2027-03-01', units: [{ occupants: [{ guestId: 'G901' }, { guestId: 'G902' }] }] }] },
    { window: 'kmg', categories: [{ checkIn: '2027-03-01', checkOut: '2027-03-04', units: [{ occupants: [{ guestId: 'G902' }] }] }] }];
  return { roster, records, seating, stays };
}

test('PARTICIPATION · the booking states, the couple counted and shown, households; temple and coffee as sent', () => {
  const P = participationOf(assignInput());
  assert.equal(P.people.invited, 6); assert.equal(P.people.couple, 2); assert.equal(P.people.households, 4);
  assert.deepEqual(P.people.booking.NOT_SENT, ['G903']); assert.deepEqual(P.people.booking.DECLINED, ['G904']); assert.equal(P.people.tripSent, 5);
  assert.deepEqual(P.events.temple.yes, ['G048', 'G049', 'G901']); assert.deepEqual(P.events.temple.no, ['G902']);
  assert.deepEqual(P.events.temple.notSent, ['G903']); assert.deepEqual(P.events.temple.away, ['G904']);
  assert.equal(P.events.temple.capacityStatus, 'NOT_DOCUMENTED');
  const t = P.events.temple; assert.equal(t.yes.length + t.no.length + t.away.length + t.undecided.length + t.notSent.length, P.people.invited, 'every invited person exactly once');
});

test('PARTICIPATION · seats from the ledger, the couple\'s two ceremony places, joining without a seat; the dinner\'s 54 | 50 (E16) side by side', () => {
  const P = participationOf(assignInput());
  const C = P.events.ceremony, D = P.events.dinner;
  assert.equal(C.capacity, 54); assert.equal(C.seated, 4, 'two guests + the couple\'s two fixed places'); assert.equal(C.free, 50);
  assert.deepEqual(C.sides, { L: { cap: 22, seated: 1 }, R: { cap: 30, seated: 1 } });
  assert.equal(D.seated, 3); assert.deepEqual(D.joiningNoSeat, ['G901'], 'joining (the ledger\'s reading) without a dinner seat');
  assert.deepEqual(D.seatNotJoining, ['G902']); assert.equal(D.placedByOwners, 0);
  assert.deepEqual(D.capacityDecision, { id: 'E16', alternative: OWNER_DINNER_ALTERNATIVE, freeAtAlternative: 47, overAlternative: 0, status: 'PENDING' });
  assert.equal(D.capacity, 54, 'the system\'s capacity stays the capacity');
});

test('PARTICIPATION · persons per night and city from the room plan, first and last nights, nobody counted twice', () => {
  const P = participationOf(assignInput());
  const night = (d) => P.presence.find((x) => x.night === d);
  assert.deepEqual(night('2027-02-25').VIENTIANE, ['G901']); assert.deepEqual(night('2027-02-27').VIENTIANE, ['G901', 'G902']);
  assert.deepEqual(night('2027-03-01').CHINA, ['G902']);
  for (const x of P.presence) assert.equal(x.total, new Set([...x.BANGKOK, ...x.VIENTIANE, ...x.CHINA, ...x.OTHER]).size);
  assert.deepEqual(P.movements.arrivals.map((a) => [a.date, a.ids]), [['2027-02-25', ['G901']], ['2027-02-27', ['G902']]]);
  assert.deepEqual(P.movements.departures.map((a) => [a.date, a.ids]), [['2027-03-01', ['G901']], ['2027-03-04', ['G902']]]);
  for (const a of P.movements.arrivals) assert.equal(a.n, a.ids.length);
});

test('PARTICIPATION · documents and the food allergy AS SENT — never a file name, a hash, the allergy\'s text or a name', () => {
  const P = participationOf(assignInput());
  assert.deepEqual(P.care.documents.passport.received, ['G901']); assert.deepEqual(P.care.documents.flight.notReceived, ['G901', 'G902', 'G904']);
  assert.equal(P.care.documents.passport.optional, true);
  assert.deepEqual(P.care.allergy.yes, ['G901']); assert.equal(P.care.allergy.basis, 'AS_SENT');
  const j = JSON.stringify(P);
  for (const bad of ['secret-file', 'deadbeef', 'Peanut-secret', 'Secret Name', 'filename', 'sha256', 'doc/']) assert.ok(!j.includes(bad), bad + ' must never leave the server');
  assert.ok(!/"(first|last|nick|name|email|phone|details)"/.test(j.replace(/"name":"Tea at 1872"/g, '')), 'no personal field — only a product name of a request');
});

test('PARTICIPATION · requests as sent: 1872 counted as tables per party, never a reservation; the finale and the offering apart', () => {
  const P = participationOf(assignInput());
  const t = P.requests.find((r) => r.id === '1872');
  assert.equal(t.tables, 1, 'two guests of one party: one table'); assert.equal(t.persons, null); assert.equal(t.status, 'REQUEST_NOT_A_RESERVATION');
  assert.deepEqual(P.finale.pool, ['G901']); assert.equal(P.finale.capacityStatus, 'NOT_DOCUMENTED');
  assert.deepEqual(P.transport.vehicles.status, 'NOT_COMPUTABLE'); assert.equal(P.transport.flights.status, 'NOT_RECORDED');
});

test('ROBUST · garbage in never throws: empty, missing and malformed inputs give named gaps', () => {
  for (const x of [undefined, null, {}, { holders: 'x', budget: 5 }, { budget: { available: true, report: { byHotel: 3, hotel: 'y' } } }]) assert.doesNotThrow(() => quickFinanceOf(x));
  for (const x of [undefined, null, {}, { roster: [{}], records: { x: 1 }, seating: { events: 'z' }, stays: [{ categories: 'q' }] }]) assert.doesNotThrow(() => participationOf(x));
  const P = participationOf({ roster: [{ guestId: 'G1', invitationId: 'INV-G1', booking: 'SENT' }], records: { 'INV-G1': { submissionId: 'S', registration: { selections: 'bad' } } } });
  assert.equal(P.people.invited, 1);
});

test('E16 · 50 lives only in its named constant; 54 never in the module (the ledger\'s capacity is read)', () => {
  const src = fs.readFileSync(new URL('../src/billing/quick-overview.js', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.equal((src.match(/\b50\b/g) || []).length, 1); assert.match(src, /OWNER_DINNER_ALTERNATIVE = 50;/);
  assert.ok(!/\b54\b/.test(src));
});

test('ROOM DATES UNREADABLE (review F1) · a room without dates is a named gap — never "no room", never zero nights', () => {
  const I = assignInput();
  I.stays = [{ window: 'wedstay', categories: [{ checkIn: null, checkOut: null, units: [{ occupants: [{ guestId: 'G901' }, { guestId: 'G902' }] }] }] }];
  I.roster.find((r) => r.guestId === 'G901').rooms = [{ key: 'wedstay/x' }]; I.roster.find((r) => r.guestId === 'G902').rooms = [{ key: 'wedstay/x' }];
  I.gaps = ['002 could not be read just now — stay dates are not shown'];
  const P = participationOf(I);
  assert.equal(P.movements.status, 'PARTIAL'); assert.deepEqual(P.movements.undatedIds, ['G901', 'G902']);
  assert.ok(!P.movements.withoutRoom.includes('G901') && !P.movements.withoutRoom.includes('G902'), 'they have rooms');
  assert.deepEqual(P.gaps, ['002 could not be read just now — stay dates are not shown']);
});

test('OFFERING STATES (review F3) · a guest\'s own value is never a key: "constructor", "__proto__" and the like fall into Other, nothing throws', () => {
  const I = assignInput();
  for (const [inv, v] of [['INV-G901', 'constructor'], ['INV-G902', '__proto__']]) I.records[inv].registration.templeCeremony.guests[0].sangkhathanState = v;
  let P; assert.doesNotThrow(() => { P = participationOf(I); });
  assert.deepEqual(P.sangkhathan.Other, ['G901', 'G902']); assert.equal(Object.getPrototypeOf(P.sangkhathan), Object.prototype);
});

test('HOUSEHOLDS (review F4) · by size counts households, and they add up to the households', () => {
  const P = participationOf(assignInput());
  const sum = Object.values(P.people.householdsBySize).reduce((n, v) => n + v, 0);
  assert.equal(sum, P.people.households); assert.deepEqual(P.people.householdsBySize, { 1: 2, 2: 2 });
});
