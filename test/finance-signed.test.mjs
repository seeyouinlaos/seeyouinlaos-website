/* ============================================================================
   THE OWNERS' CONSOLIDATED ORDER (19 Nov 2026) — Finance on 004 with its signs, the guests' billing by class, the occupancy per hotel.
   Synthetic names, products and amounts only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorPairs } from '../src/billing/budget-source.js';
import { signed004Of, sheetCents, financeReportOf } from '../src/billing/finance-report.js';
import { revenueClassesOf, classOfItem, CLASS } from '../src/billing/revenue-classes.js';
import { occupancyOf } from '../src/billing/assignments.js';
import { CHINA_STAGES, PASS_THROUGH } from '../src/billing/budget-map.js';

const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100 });
const line = (row, item, vendor, category, details, rate, qty, mult) => ({ row, item, vendor, category, details, rate, qty, mult, budget: rate * qty * mult, readable: true, currency: 'USD' });

/* a positive row and its mirror, a private China pair, a lone cost and a lone negative row — sums that only round right once */
const LINES = [
  line(10, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', 'Room, (Testa)', 406.83 / 6, 1, 3),
  line(11, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', 'Room, (Testa)', 406.83 / 6, -1, 3),
  line(12, 'Yifangju Designer Courtyard', 'Trip.com', 'Accommodation', 'Suite, (Alpha + Beta)', 87.92, 1, 3),
  line(13, 'Yifangju Designer Courtyard', 'Trip.com', 'Accommodation', 'Suite, (Alpha + Beta)', 87.92, -1, 3),
  line(14, 'Wedding Cake', 'Bakery', 'Food & Beverage', 'Cake', 500, 1, 1),
  line(15, 'Alms Giving Ceremony', 'Hotel', 'Guest Experience', 'Offering', 15, 50, 1),
  line(16, 'Alms Giving Ceremony', 'Hotel', 'Guest Experience', 'Offering', 15, -50, 1),
  line(17, 'Refund', 'Somebody', 'Miscellaneous', 'Credit', 10, -1, 1),
  line(18, 'Dinner in Kunming', 'Restaurant', 'Food & Beverage', 'Dinner', 40, 1, 1),
];
const raw = (f) => LINES.reduce((t, l) => t + (f(l) ? l.budget : 0), 0);
const TOTALS = { totalBudget: 5000, totalBudgetCell: 'A2', totalPlanned: raw(() => true), totalPlannedCell: 'J2', grossCost: raw((l) => l.budget > 0), grossCostCell: 'A5',
  guestContributions: Math.abs(raw((l) => l.budget < 0)), guestContributionsCell: 'G5', netHostCost: raw(() => true), netHostCostCell: 'J5' };

test('004 SIGNED · a negative row pairs one-to-one with the row it mirrors; a lone negative row is named; the sums meet A5, G5, J2 and J5 to the cent', () => {
  const m = mirrorPairs(LINES);
  assert.deepEqual(m.pairs, [{ negative: 11, positive: 10 }, { negative: 13, positive: 12 }, { negative: 16, positive: 15 }, { negative: 17, positive: null }]);
  /* two identical pairs are paired one-to-one, never twice to the same row */
  const twin = mirrorPairs([line(1, 'Flight X', 'Air', 'Transportation', 'Seat', 100, 1, 1), line(2, 'Flight X', 'Air', 'Transportation', 'Seat', 100, -1, 1),
    line(3, 'Flight X', 'Air', 'Transportation', 'Seat', 100, 1, 1), line(4, 'Flight X', 'Air', 'Transportation', 'Seat', 100, -1, 1)]);
  assert.deepEqual(twin.pairs, [{ negative: 2, positive: 1 }, { negative: 4, positive: 3 }]);
  const s = signed004Of({ lines: LINES, totals: TOTALS });
  assert.equal(s.reconciled, true, JSON.stringify(s.checks));
  assert.deepEqual(s.checks.map((c) => [c.cell, c.equal]), [['A5', true], ['G5', true], ['J2', true], ['J5', true]]);
  assert.equal(s.whole.net.cents, sheetCents(TOTALS.totalPlanned));
  assert.equal(sheetCents(4639.905), 463991, 'half a cent rounds away from zero, as the sheet shows it');
  assert.equal(sheetCents(-4639.905), -463991);
  assert.deepEqual(s.unpaired, [17], 'a negative row without a mirror is counted with its sign and named');
  assert.deepEqual(s.toCheck, [18], 'a line naming the China trip that no rule reads stays in the wedding, named');
  /* the China pair is apart and nets to zero; the wedding keeps everything else */
  assert.deepEqual([s.china.gross.cents, s.china.neutralising.cents, s.china.net.cents], [26376, -26376, 0]);
  assert.equal(s.wedding.net.cents + s.china.net.cents, s.whole.net.cents);
  assert.ok(s.lines.find((l) => l.row === 13).cls === 'CHINA' && s.lines.find((l) => l.row === 13).sign === 'NEUTRALISING', 'a negative row takes the class of the row it mirrors');
  /* a sheet whose cell differs from its lines is named, never repaired */
  const off = signed004Of({ lines: LINES, totals: { ...TOTALS, totalPlanned: TOTALS.totalPlanned + 1 } });
  assert.equal(off.checks.find((c) => c.cell === 'J2').equal, false);
  assert.equal(off.reconciled, false);
});

test('004 SIGNED · the finance report: planned = the wedding\'s net, its gross beside it; the China trip apart; the neutralising entries set against what the guests booked', () => {
  const classes = { version: 'revenue-classes/1.0.0', complete: true,
    classes: { SOUPHATTRA_ACCOMMODATION: { booked: usd(90000), invoiced: usd(90000), received: usd(0) }, OTHER_ACCOMMODATION: { booked: usd(30000), invoiced: usd(30000), received: usd(0) },
      PASS_THROUGH: { booked: usd(52500), invoiced: usd(52500), received: usd(0) }, NOT_CLASSIFIED: { booked: usd(0), invoiced: usd(0), received: usd(0) } },
    china: { booked: usd(26376), invoiced: usd(26376), received: usd(0) }, totalGuestBilling: { booked: usd(198876) },
    otherAccommodation: [{ stage: 'A2', property: 'U Sathorn Bangkok', china: false, booked: usd(30000), invoiced: usd(30000) }],
    passThrough: [{ Item_ID: 'TEMPLE-OFFERING', stage: null, china: false, booked: usd(52500), invoiced: usd(52500) }], notClassified: [] };
  const rep = financeReportOf({ budget: { lines: LINES, totals: TOTALS }, suppliers: [{ vendor: 'Yifangju Designer Courtyard', stages: ['F'], contract: usd(26376), payments: [{ counted: true, amount: usd(26376) }] }],
    centres: [], plan: [], contracts: [], dashboard: { costs: { adjustments: [] } }, revenue: { classes, booked: { cents: 198876, complete: true } }, receipts: { cashCollected: { cents: 0, complete: true } } });
  const s = rep.budget004;
  assert.equal(rep.planned.cents, s.wedding.net.cents, 'planned = the wedding\'s net (004\'s J2 view without the China trip)');
  assert.equal(rep.plannedGross.cents, s.wedding.gross.cents);
  assert.deepEqual(rep.paid, [], 'a China supplier\'s payment is not a wedding payment');
  assert.equal(rep.china.paidUsd.total.cents, 26376);
  assert.ok(!rep.byCategory.some((c) => c.suppliers.includes('Yifangju Designer Courtyard')));
  /* the position: the wedding's guest billing (China apart) − the gross forecast; 004's net view and the difference beside it */
  assert.equal(rep.position.net.cents, 90000 + 30000 + 52500 - rep.forecastGross.cents);
  assert.equal(rep.position.net004.cents, 90000 - rep.forecast.cents);
  assert.equal(rep.position.differenceTo004.cents, rep.position.net.cents - rep.position.net004.cents);
  const g = Object.fromEntries(rep.collectionsBeside004.map((x) => [x.key, x]));
  assert.deepEqual([g.A2.booked.cents, g.A2.neutralising004.cents, g.A2.difference.cents], [30000, sheetCents(406.83 / 2), 30000 - sheetCents(406.83 / 2)]);
  assert.deepEqual([g['TEMPLE-OFFERING'].neutralising004.cents, g['TEMPLE-OFFERING'].booked.cents, g['TEMPLE-OFFERING'].difference.cents], [75000, 52500, -22500], 'the offering: 004 neutralises 50, the guests booked 35');
  const texts = rep.exceptions.map((e) => e.area + ' ' + e.text).join('\n');
  assert.match(texts, /Collections vs 004 TEMPLE-OFFERING: the guests booked USD 525\.00; 004 neutralises USD 750\.00 \(row 16\) — a difference of −USD 225\.00/);
  assert.match(texts, /004 row 17 is a negative \(neutralising\) row without a positive row it mirrors/);
  assert.match(texts, /004 row 18 names the China trip but no rule reads it/);
  assert.doesNotMatch(texts, /positive lines add up|disagree in sign/);
});

const ITEMS = { 'D1-SUITE': { Site_Product_Key: 'wedstay/heritage' }, 'C-SUITE': { Site_Product_Key: 'prewed/heritage-executive' }, 'A2-ROOM': { Site_Product_Key: 'bkk-stay/room' },
  'F-ROOM': { Site_Product_Key: 'kmg/room' }, 'TEMPLE-OFFERING': { Site_Product_Key: 'sangkhathan' }, 'G-TRAIN-KMG-LJG': { Site_Product_Key: 'c86' }, 'X-SPA': { Site_Product_Key: 'spa' } };
const L = (b, it, p, c, u, n) => ({ Booking_ID: b, Item_ID: it, Person_ID: p, amountCents: c, Room_Unit_ID: u || null, nights: n || null });

test('CLASSES · every booked line in one part: the Souphattra, other accommodation, pass-through (named one by one), the China trip apart; paid in full / unpaid / partly paid', () => {
  assert.equal(classOfItem(ITEMS, 'D1-SUITE').cls, CLASS.SOUPHATTRA);
  assert.equal(classOfItem(ITEMS, 'A2-ROOM').cls, CLASS.OTHER);
  assert.deepEqual([classOfItem(ITEMS, 'F-ROOM').cls, classOfItem(ITEMS, 'F-ROOM').china], [CLASS.OTHER, true]);
  assert.equal(classOfItem(ITEMS, 'TEMPLE-OFFERING').cls, CLASS.PASS);
  assert.equal(classOfItem(ITEMS, 'X-SPA').cls, CLASS.NONE, 'a service nobody named is not assumed to be a pass-through');
  assert.ok(PASS_THROUGH.every((p) => !/USD|THB|EUR|\d+[.,]\d/.test(p.basis)), 'no amount is typed into a basis (the amount is 002\'s)');
  assert.deepEqual(CHINA_STAGES, ['E2', 'F', 'G', 'H', 'I', 'J']);
  const booked = [
    { Holder_ID: 'INV-T1', lines: [L('b1', 'D1-SUITE', 'T1', 14500, 'RU1', 2), L('b2', 'TEMPLE-OFFERING', 'T1', 1500), L('b3', 'C-SUITE', 'T1', 30000, 'RU2', 2)] },
    { Holder_ID: 'INV-T2', lines: [L('b4', 'A2-ROOM', 'T2', 20342, 'RU3', 3), L('b5', 'F-ROOM', 'T2', 10900, 'RU4', 3), L('b6', 'G-TRAIN-KMG-LJG', 'T2', 10500), L('b7', 'X-SPA', 'T2', 500)] },
    { Holder_ID: 'INV-T3', lines: [L('b8', 'D1-SUITE', 'T3', 14500, 'RU1', 2)] },
    { Holder_ID: 'INV-T4', lines: [L('b9', 'D1-SUITE', 'T4', 9900, 'RU5', 2)], gapReason: 'DOUBLE_BOOKING T4 · wedstay' }];
  const issued = new Map([['INV-T1', { lines: booked[0].lines, cents: 46000 }], ['INV-T2', { lines: booked[1].lines, cents: 42242 }], ['INV-T3', { lines: booked[2].lines, cents: 14500 }]]);
  const positions = [{ Holder_ID: 'INV-T1', paymentStatus: 'PAID', cashCollected: usd(46000) }, { Holder_ID: 'INV-T2', paymentStatus: 'UNPAID', outstanding: usd(42242) },
    { Holder_ID: 'INV-T3', paymentStatus: 'PARTIAL', cashCollected: usd(5000), outstanding: usd(9500) }];
  const r = revenueClassesOf({ booked, issued, positions, items: ITEMS, kpis: { booked: usd(102742), issued: usd(102742), cash: usd(51000), outstanding: usd(51742), refund: usd(0) } });
  const c = (k) => r.classes[k];
  assert.deepEqual([c(CLASS.SOUPHATTRA).booked.cents, c(CLASS.SOUPHATTRA).invoiced.cents, c(CLASS.SOUPHATTRA).received.cents, c(CLASS.SOUPHATTRA).outstanding.cents], [59000, 59000, 44500, 0],
    'a partly paid statement is invoiced by class (its lines) but its payment is not allocated');
  assert.deepEqual([r.unallocated.received.cents, r.unallocated.outstanding.cents, r.unallocated.invoiced.cents], [5000, 9500, 0]);
  assert.equal(c(CLASS.OTHER).booked.cents, 20342, 'Kunming is not in "other accommodation" — it is the China trip\'s');
  assert.equal(c(CLASS.PASS).booked.cents, 1500);
  assert.equal(c(CLASS.NONE).booked.cents, 500);
  assert.deepEqual([r.china.booked.cents, r.china.byClass[CLASS.OTHER].booked.cents, r.china.byClass[CLASS.PASS].booked.cents], [21400, 10900, 10500]);
  assert.equal(r.totalGuestBilling.booked.cents, 59000 + 20342 + 1500 + 500 + 21400, 'the parts add up without counting the China trip twice');
  assert.deepEqual(r.unallocated.statements.map((x) => [x.Holder_ID, x.status]), [['INV-T3', 'PARTIAL']]);
  assert.deepEqual(r.excluded, [{ Holder_ID: 'INV-T4', reason: 'DOUBLE_BOOKING T4 · wedstay' }], 'a holder with a gap stays out of booked, named');
  assert.deepEqual(Object.values(r.reconciliation).map((x) => x.equal), [true, true, true, true]);
  assert.equal(r.complete, false, 'not classified + not allocated + a gap: not complete');
  assert.deepEqual(r.souphattra.byPeriod.map((p) => [p.label, p.booked.cents, p.guests]), [['Early arrival (before the wedding)', 30000, 1], ['Wedding stay', 29000, 2]]);
  assert.equal(r.souphattra.guestsAcrossPeriods, 2, 'a guest in both periods is one guest');
  assert.deepEqual(r.souphattra.byBooking.map((b) => [b.Booking_ID, b.status]), [['b3', 'PAID'], ['b1', 'PAID'], ['b8', 'PARTIAL']]);
  /* an overpayment is the refund due, never revenue */
  const over = revenueClassesOf({ booked: [booked[2]], issued: new Map([['INV-T3', { lines: booked[2].lines, cents: 14500 }]]), positions: [{ Holder_ID: 'INV-T3', paymentStatus: 'OVERPAID', cashCollected: usd(15000) }],
    items: ITEMS, kpis: { booked: usd(14500), issued: usd(14500), cash: usd(15000), outstanding: usd(0), refund: usd(500) } });
  assert.deepEqual([over.classes[CLASS.SOUPHATTRA].received.cents, over.reconciliation.received.equal, over.reconciliation.received.refundDue.cents], [14500, true, 500]);
});

test('OCCUPANCY · per hotel, each person once: the agreement\'s rooms are booked even when empty, an empty allocation unit elsewhere is not hotel inventory', () => {
  const unit = (label, ...g) => ({ label, places: 2, occupants: g.map((x) => ({ guestId: x })) });
  const stays = [
    { window: 'pre', stage: 'pre', label: 'Before', hotel: 'Hotel Agreement', checkIn: '2031-02-25', checkOut: '2031-02-27', categories: [
      { key: 'pre/suite', item: 'P1-SUITE', nights: 2, units: [unit('A')] }, { key: 'pre/room', item: 'P1-ROOM', nights: 2, units: [unit('A', 'G1', 'G2'), unit('B')] }] },
    { window: 'wed', stage: 'wed', label: 'Wedding', hotel: 'Hotel Agreement', checkIn: '2031-02-27', checkOut: '2031-03-01', categories: [
      { key: 'wed/room', item: 'W1-ROOM', nights: 2, units: [unit('A', 'G1', 'G2'), unit('B', 'G3'), unit('C')] }] },
    { window: 'city', stage: 'city', label: 'City', hotel: 'Hotel Elsewhere', checkIn: '2031-02-21', checkOut: '2031-02-24', categories: [
      { key: 'city/room', item: 'A9-ROOM', nights: 3, units: [unit('A', 'G1'), unit('B'), unit('C')] }] }];
  const o = occupancyOf(stays, [{ guestId: 'G9', stage: 'wed' }], { rooms: { W1: '*', P1: ['P1-SUITE'] }, agreement: { rooms: { W1: 3, P1: 1 } } });
  assert.deepEqual([o.uniqueGuests, o.placesHeld], [3, 6], 'three persons, six places');
  const H = Object.fromEntries(o.hotels.map((h) => [h.hotel, h]));
  const pre = H['Hotel Agreement'].periods[0], wed = H['Hotel Agreement'].periods[1];
  assert.deepEqual([pre.bookedRooms, pre.occupiedRooms, pre.bookedUnoccupied, pre.emptyAllocationUnits], [2, 1, 1, 1], 'the named suite is bought, empty; the other empty unit is not');
  assert.deepEqual([wed.bookedRooms, wed.occupiedRooms, wed.bookedUnoccupied, wed.emptyAllocationUnits, wed.unassigned], [3, 2, 1, 0, 1]);
  assert.deepEqual([wed.availableInventory.verified, wed.availableInventory.rooms, wed.bookedRoomNights], [true, 1, 6]);
  assert.equal(wed.agreementCheck, null, 'the agreement buys 3, the booking system holds 3');
  assert.deepEqual([H['Hotel Agreement'].guests, H['Hotel Agreement'].places], [3, 5]);
  const city = H['Hotel Elsewhere'].periods[0];
  assert.deepEqual([city.bookedRooms, city.emptyAllocationUnits, city.availableInventory.verified, city.occupancyPct], [1, 2, false, 100]);
  const short = occupancyOf(stays.slice(1, 2), [], { rooms: { W1: '*' }, agreement: { rooms: { W1: 26 } } });
  assert.match(short.hotels[0].periods[0].agreementCheck, /the agreement buys 26 rooms here; the booking system holds 3/);
});

test('FORECAST · a China supplier\'s adjustment never enters the wedding forecast, even without stages of its own', () => {
  const rep = financeReportOf({ budget: { lines: LINES, totals: TOTALS }, suppliers: [{ vendor: 'Luye Baisha', stages: ['H'], contract: usd(50000), payments: [] }],
    centres: [], plan: [], contracts: [], dashboard: { costs: { adjustments: [{ vendor: 'Luye Baisha', difference: usd(20000) }] } } });
  assert.equal(rep.forecast.cents, rep.planned.cents);
  const wed = financeReportOf({ budget: { lines: LINES, totals: TOTALS }, suppliers: [{ vendor: 'Hotel Gamma', stages: ['D1'], contract: usd(50000), payments: [] }],
    centres: [], plan: [], contracts: [], dashboard: { costs: { adjustments: [{ vendor: 'Hotel Gamma', difference: usd(20000) }] } } });
  assert.equal(wed.forecast.cents, wed.planned.cents + 20000, 'a wedding supplier\'s adjustment does');
});

test('ENGINE · a person-named USD 0 rate (009) charges that person nothing for the whole stay; the room mate keeps the standard rate; two rows for one person go to review', async () => {
  const { calculate } = await import('../src/billing/engine.js');
  const items = { 'A9-ROOM': { Item_ID: 'A9-ROOM', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 67.805, Currency: 'USD', Site_Product_Key: 'city/room', 'Number of Nights': 3 } };
  const bk = (h, p) => ({ Booking_ID: 'BK·' + h + '·' + p, Holder_ID: h, Person_ID: p, Item_ID: 'A9-ROOM', Bill_To_Holder_ID: h, Room_Unit_ID: 'RU·A9-ROOM·B', State: 'CONFIRMED', Nights: 3, Quantity: 1 });
  const row = (h, p) => ({ Holder_ID: h, Person_ID: p, Item_ID: 'A9-ROOM', Rate_Per_Person_Night: 0, Nights_Rule: '3', Visibility: 'GUEST', Rate_Status: 'ACTIVE', Approved_By: 'Synthetic order', Billing_Category: '' });
  const r = calculate([bk('INV-T1', 'T1'), bk('INV-T2', 'T2')], { items, specialRates: [row('INV-T1', 'T1')], asOf: '2026-11-19' });
  const by = Object.fromEntries(r.lines.map((l) => [l.Person_ID, l]));
  assert.deepEqual([by.T1.amountCents, by.T1.rateSource, by.T1.payableNights], [0, 'SPECIAL_RATE', 3]);
  assert.deepEqual([by.T2.amountCents, by.T2.rateSource], [20342, 'STANDARD_RATE'], 'the room mate: 67.805 × 3, unchanged');
  const tie = calculate([bk('INV-T1', 'T1')], { items, specialRates: [row('INV-T1', 'T1'), row('INV-T1', 'T1')], asOf: '2026-11-19' });
  assert.ok(tie.manualReview.length >= 1 || tie.lines.some((l) => l.review), 'two rows for one person: never a guess');
});
