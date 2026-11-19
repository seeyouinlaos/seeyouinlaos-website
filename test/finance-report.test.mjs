/* ============================================================================
   THE FINANCE REPORT (Owners' review, 18 Nov 2026) — src/billing/finance-report.js. Synthetic names and figures only.
   Google 012 is matched for a reference room number (uncertain → "verify", a tie → no number), a hotel's cost exists only where an
   agreement or an Owner-confirmed rate states it, the approved budget is 004's own, the hotel's purchase from the bookings is set
   beside 004 row by row (never counted twice, never removed), another currency keeps its own amount beside a labelled USD
   equivalent, and every gap is named.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { match012, nameLikeness, roomTypeKey, hotelPerformance, financeReportOf, unitId, hotelPurchaseOf, usdEquivalentOf } from '../src/billing/finance-report.js';
import { buildBudgetComparison } from '../src/billing/budget.js';

const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100 });
const thb = (cents) => ({ currency: 'THB', cents, amount: cents / 100 });
/* the guests' billing by class as revenue-classes hands it over (synthetic) */
const part3 = (b, i, r) => ({ booked: usd(b), invoiced: usd(i), received: usd(r), outstanding: usd(i - r) });
const CLASSES = { version: 'revenue-classes/1.0.0', complete: true, classes: { SOUPHATTRA_ACCOMMODATION: part3(80000, 50000, 10000), OTHER_ACCOMMODATION: part3(20000, 2000, 0),
  PASS_THROUGH: part3(10000, 10000, 0), NOT_CLASSIFIED: part3(0, 0, 0) }, china: part3(5000, 5000, 0), totalGuestBilling: part3(115000, 67000, 10000),
  otherAccommodation: [{ stage: 'K1', property: 'Lodge Beta', china: false, booked: usd(20000), invoiced: usd(2000) }], passThrough: [{ Item_ID: 'T-OFFER', stage: null, china: false, booked: usd(10000), invoiced: usd(10000) }], notClassified: [] };
const occ = (id, name, bed) => ({ guestId: id, name, bed: !!bed });
const unit = (key, label, type, item, occupants, places) => ({ key, label, type, item, places: places || 2, extraBeds: 0, occupants });
const row = (r, type, no, ci, co, guests) => ({ row: r, building: 'X', roomType: type, roomNo: no, checkIn: ci, checkOut: co, guests });
const PLAN = [
  { stay: 'P1', place: 'Hotel Alpha · prewedding', from: '2031-02-25', to: '2031-02-27', rooms: [
    unit('pre/exec', 'F', 'Grand Exec', 'P1-EXEC', [occ('GA1', 'Tomasz Ardent'), occ('GA2', 'Ulla Ardent')]),
    unit('pre/suite', 'A', 'Alpha Presidential', 'P1-SUITE', [occ('GH1', 'Host One'), occ('GH2', 'Host Two')]),
  ] },
  { stay: 'W1', place: 'Hotel Alpha · wedding stay', from: '2031-02-27', to: '2031-03-01', rooms: [
    unit('wed/exec', 'F', 'Grand Exec', 'W1-EXEC', [occ('GA1', 'Tomasz Ardent'), occ('GA2', 'Ulla Ardent')]),
    unit('wed/exec', 'H', 'Grand Exec', 'W1-EXEC', [occ('GB1', 'Bartholomew Quill'), occ('GB2', 'Vera Quill')]),
    unit('wed/exec', 'I', 'Grand Exec', 'W1-EXEC', [occ('GC1', 'Wilma Dorne'), occ('GC2', 'Xaver Dorne'), occ('GC3', 'Yara Pell', true)]),
    unit('wed/exec', 'J', 'Grand Exec', 'W1-EXEC', [occ('GD1', 'Wilma Kettering'), occ('GD2', 'Zeno Kettering')]),
    unit('wed/her', 'A', 'Heritage', 'W1-HER', [occ('GE1', 'Quentin Absent'), occ('GE2', 'Rosa Absent')]),
    unit('wed/her', 'B', 'Heritage', 'W1-HER', []),
    unit('wed/suite', 'A', 'Alpha Presidential', 'W1-SUITE', [occ('GH1', 'Host One'), occ('GH2', 'Host Two')]),
  ] },
  { stay: 'K1', place: 'Hotel Beta', from: '2031-03-01', to: '2031-03-03', rooms: [unit('kbeta/room', 'A', 'Beta Room', 'K1-ROOM', [occ('GA1', 'Tomasz Ardent')])] },
];
const LIST = [
  row(2, 'Grand Exec (Twin)', '203', '25.02.2031', '01.03.2031', ['Tomasz', 'Ulla']),
  row(3, 'Grand Exec', '305', '27.02.2031', '01.03.2031', ['Bartho', 'Vera']),                 /* a nickname: "verify" */
  row(4, 'Grand Exec (No Bath tub)', '107', '27.02.2031', '01.03.2031', ['Wilma', 'Xaver', 'Yara']),
  row(5, 'Grand Exec', '304', '27.02.2031', '01.03.2031', ['Wilma', 'Zeno']),
  row(6, 'The Heritage', '102', '', '01.03.2031', []),
  row(7, 'The Heritage', '202', '', '01.03.2031', ['Olga Nobody']),                          /* booked by nobody */
  row(8, 'Alpha Presidential Suite', '210 / 211', '25.02.2031', '01.03.2031', ['Host', 'Host']),
];

test('012 · names and types: equal after "The", "(…)" and "Suite"; a nickname is SIMILAR; a different word is no match', () => {
  assert.equal(roomTypeKey('The Heritage'), roomTypeKey('Heritage'));
  assert.equal(roomTypeKey('Grand Exec (No Bath tub)'), 'grand exec');
  assert.equal(roomTypeKey('Alpha Presidential Suite'), roomTypeKey('Alpha Presidential'));
  assert.notEqual(roomTypeKey('Heritage'), roomTypeKey('Heritage Executive'), 'never a prefix');
  assert.equal(nameLikeness('Tomasz', 'Tomasz Ardent'), 'EXACT');
  assert.equal(nameLikeness('Bartho', 'Bartholomew Quill'), 'SIMILAR');
  assert.equal(nameLikeness('Steffie', 'Steffanie Q'), 'SIMILAR', 'five letters in common');
  assert.equal(nameLikeness('Olga', 'Tomasz Ardent'), null);
});

test('012 · room numbers by the guests\' names within each stay\'s dates; verify where uncertain; another hotel is outside 012', () => {
  const m = match012(PLAN, LIST);
  const no = (stay, key, label) => (m.units[stay + '|' + key + '|' + label] || {}).roomNo;
  assert.equal(no('P1', 'pre/exec', 'F'), '203'); assert.equal(no('W1', 'wed/exec', 'F'), '203', 'the same room on both stays');
  assert.equal(no('W1', 'wed/exec', 'I'), '107'); assert.equal(no('W1', 'wed/exec', 'J'), '304', 'two Wilmas: the second name decides');
  const h = m.units['W1|wed/exec|H'];
  assert.deepEqual([h.roomNo, h.status], ['305', 'VERIFY']); assert.match(h.verify.join(' '), /spelt differently/);
  assert.equal(no('W1', 'wed/suite', 'A'), '210 / 211');
  assert.deepEqual(m.notIn012.map((x) => x.stay + ' ' + x.label), ['W1 A'], 'the booked Heritage A is not in 012');
  assert.equal(m.units['K1|kbeta/room|A'], undefined); assert.ok(!m.notIn012.some((x) => x.stay === 'K1'), 'another hotel is outside 012, not missing from it');
  assert.deepEqual(m.notBooked.map((x) => x.roomNo), ['202']);
  assert.deepEqual(m.free, [{ roomType: 'heritage', label: 'The Heritage', roomNos: ['102'] }]);
  assert.deepEqual(m.dates, [], 'the 25.02 rows are explained by the prewedding stay');
  /* a 012 check-in no stay explains is a difference */
  const late = match012([PLAN[1]], LIST);
  assert.ok(late.dates.some((d) => d.roomNo === '203' && d.in012 === '2031-02-25' && d.booked === '2031-02-27'));
});

test('012 · a tie gives no room number; a row outside the stay\'s dates never pairs; no 012 → nothing guessed', () => {
  const twin = [row(2, 'Grand Exec', '401', '27.02.2031', '01.03.2031', ['Wilma']), row(3, 'Grand Exec', '402', '27.02.2031', '01.03.2031', ['Wilma'])];
  const plan = [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'I', 'Grand Exec', 'W1-EXEC', [occ('GC1', 'Wilma Dorne')])] }];
  const m = match012(plan, twin);
  assert.equal(m.units['W1|wed/exec|I'], undefined); assert.equal(m.ambiguous.length, 1);
  const away = match012(plan, [row(2, 'Grand Exec', '501', '01.03.2031', '03.03.2031', ['Wilma'])]);
  assert.equal(away.units['W1|wed/exec|I'], undefined, 'dates do not overlap');
  assert.deepEqual([match012(plan, null).available, Object.keys(match012(plan, null).units).length], [false, 0]);
});

const CONTRACTS = [{ stay: 'W1', items: '*', ratePerRoomNight: 150 }, { stay: 'P1', items: ['P1-SUITE'], ratePerRoomNight: 150 }];
const CENTRES = [
  { id: 'P1', place: 'Hotel Alpha · prewedding', status: 'NOT_COMPLETE', missing: ['25.02.2031: no approved supplier cost'], rooms: [{ label: 'F', item: 'P1-EXEC', lines: [{ person: 'GA1', amount: usd(26000) }, { person: 'GA2', amount: usd(26000) }] }] },
  { id: 'W1', place: 'Hotel Alpha · wedding stay', status: 'NOT_COMPLETE', missing: ['27.02.2031: covered by nothing in 004'], rooms: [{ label: 'F', item: 'W1-EXEC', lines: [{ person: 'GA1', amount: usd(14500) }, { person: 'GA2', amount: usd(14500) }] },
    { label: 'I', item: 'W1-EXEC', lines: [{ person: 'GC3', amount: usd(7500) }] }] },
  { id: 'K1', place: 'Hotel Beta', status: 'NOT_COMPLETE', missing: ['01.03.2031: no approved supplier cost'], rooms: [] },
];

test('HOTELS · the agreement\'s cost for every room it buys (occupied or not); a room it does not buy leaves the cost incomplete and no surplus', () => {
  const m = match012(PLAN, LIST);
  const h = hotelPerformance({ plan: PLAN, contracts: CONTRACTS, centres: CENTRES, suppliers: [{ vendor: 'Beta Hotel', stages: ['K1'], contract: thb(900000) }], rooms012: m });
  const w = h.find((x) => x.stay === 'W1'), p = h.find((x) => x.stay === 'P1'), k = h.find((x) => x.stay === 'K1');
  assert.deepEqual([w.roomsBought, w.roomsOccupied, w.emptyBought, w.cost.cents, w.revenue.cents, w.surplus.cents, w.costComplete], [7, 6, 1, 7 * 2 * 15000, 36500, 36500 - 210000, true]);
  assert.deepEqual([p.roomsBought, p.cost.cents, p.costComplete, p.surplus], [1, 30000, false, null]);
  assert.deepEqual(p.uncontracted.map((u) => u.label + ' ' + u.roomNo), ['F 203']);
  assert.deepEqual([k.cost, k.costBasis, k.surplus], [null, 'SUPPLIER_TOTAL_UNSTATED', null]);
  assert.equal(w.cost.cents + p.cost.cents, 7 * 2 * 15000 + 2 * 15000, 'the agreement total: every room of the wedding stay and the suite');
});

test('REPORT · approved = 004 TOTAL BUDGET; planned = 004 net + the hotel purchase not in 004 (1.2.0); THB keeps THB beside a labelled USD equivalent; gaps named; nothing guessed', () => {
  const budget = { totals: { totalBudget: 2000, totalBudgetCell: 'A2', budgetLeft: -500, budgetLeftCell: 'F2' }, lines: [
    { row: 8, item: 'Rooms', vendor: 'Hotel Alpha', category: 'Accommodation', budget: 1500, paid: null },
    { row: 9, item: 'Cake', vendor: 'Sweet Co', category: 'Food & Beverage', budget: 800, paid: null },
    { row: 10, item: 'Cottage', vendor: 'Cottage Co', category: 'Accommodation', budget: 200, paid: 20, payDateText: '01.08.2030' }] };
  const dashboard = { costs: { original: usd(250000), forecast: usd(262000), adjustments: [{ vendor: 'Hotel Alpha', category: 'Accommodation', basis: 'BOOKINGS', stages: ['W1', 'P1'], rows: [8], difference: usd(12000) }] },
    position: { stated: true, projectedOwnerFunded: usd(152000), currentOwnerFunded: usd(200000), coverageProjected: 42 } };
  const suppliers = [
    { vendor: 'Hotel Alpha', stages: ['W1'], contract: usd(210000), payments: [{ counted: true, amount: usd(105000) }] },
    { vendor: 'Sky Bakery', stages: [], contract: thb(3000000), payments: [{ counted: true, amount: thb(1500000) }] },
    { vendor: 'Mystery Vendor', stages: [], contract: thb(100000), payments: [] }];
  const rep = financeReportOf({ budget, suppliers, centres: CENTRES, plan: PLAN, contracts: CONTRACTS, dashboard,
    rates009: { ok: true, rows: [{ row: 6, Person_ID: 'G048', Rate_Per_Person_Night: 75 }] },
    revenue: { booked: { cents: 110000, complete: true }, classes: CLASSES }, receipts: { cashCollected: { cents: 10000, complete: true } }, fx: { day: '2030-10-07', FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, list012: LIST });
  assert.deepEqual([rep.approved.cents, rep.approved.cell, rep.planned.cents, rep.forecast.cents], [200000, 'A2', 250000, 262000], '004 net (no negative line here) + the hotel purchase not in 004');
  assert.deepEqual([rep.varianceToApproved.cents, rep.plannedVsApproved.cents, rep.budgetLeftSheet.cents], [62000, 50000, -50000]);
  const cat = (n) => rep.byCategory.find((c) => c.category === n);
  assert.deepEqual([cat('Accommodation').planned.cents, cat('Accommodation').forecast.cents, cat('Accommodation').variance.cents], [170000, 182000, 12000]);
  assert.deepEqual(cat('Food & Beverage').committed, [thb(3000000)], 'THB stays THB');
  assert.equal(cat('Food & Beverage').committedUsd.total.cents, Math.round(3000000 / 33.68), 'its USD equivalent beside it');
  assert.ok(cat('Unassigned').suppliers.includes('Mystery Vendor'), 'an unmapped supplier is listed, never dropped');
  assert.deepEqual(rep.paid, [usd(105000), thb(1500000)]);
  assert.equal(rep.paidUsd.total.cents, 105000 + Math.round(1500000 / 33.68)); assert.match(rep.paidUsd.words, /reference conversion, not a transaction rate/);
  assert.equal(rep.cash.ownerStillToProvide.cents, (262000 - rep.paidUsd.total.cents) - (110000 - 10000), 'gross: the wedding\'s forecast − its supplier payments − (its guest billing − what those guests paid)');
  assert.equal(rep.cash.complete, false, 'the forecast still misses costs'); assert.match(rep.cash.formula, /USD equivalent at the reference rates/);
  assert.deepEqual([rep.reportingFx.USD_THB, rep.reportingFx.USD_EUR], [33.68, 0.89]);
  assert.deepEqual([rep.position.stated, rep.position.net.cents, rep.position.today.cents], [true, -152000, -200000], 'the wedding\'s guest billing (China apart) − the gross forecast cost');
  assert.deepEqual([rep.position.souphattra.cents, rep.position.otherCollections.cents, rep.position.net004.cents, rep.position.differenceTo004.cents], [80000, 30000, 80000 - 262000, 30000], 'the 004 net view and the difference beside it');
  assert.equal(rep.forecastComplete, false); assert.ok(rep.forecastGaps.some((g) => g.centre === 'K1'));
  assert.ok(!rep.forecastGaps.some((g) => g.centre === 'W1' || g.centre === 'P1'), 'the agreement\'s stays are no service gap');
  const texts = rep.exceptions.map((e) => e.kind + ' ' + e.area + ' ' + e.text).join('\n');
  assert.doesNotMatch(texts, /DECISION|Update 004|Approve a reporting rate|Triple occupancy|009 rows|DATA 012/, 'the Owners decided these on 18 Nov 2026');
  assert.match(texts, /DATA Budget 004 004 row 10 \(Cottage, Cottage Co\) records USD 20\.00 paid on 01\.08\.2030 — 007 has no column for this supplier, so it is not counted/);
  assert.ok(rep.hotel.length === 3 && rep.rooms012.available);
  /* 011 holding another rate than the reference is named — the reference stays */
  const other = financeReportOf({ budget, suppliers, centres: [], plan: [], contracts: [], dashboard, fx: { FX_USD_THB: 34, FX_USD_EUR: 0.89 } });
  assert.match(other.exceptions.map((e) => e.text).join(' '), /011 holds USD\/THB 34.*reports use the approved reference rates 33\.68 and 0\.89/);
  assert.deepEqual(usdEquivalentOf([{ currency: 'EUR', cents: 8900 }]).total, usd(10000), '1 USD = 0.89 EUR');
});

/* ---- THE HOTEL'S PURCHASE FROM THE BOOKINGS, BESIDE 004 (Owners' order, 18 Nov 2026) — synthetic names only ---- */
const META = { ratePerRoomNight: 150, rooms: { W1: '*', P1: ['P1-SUITE'] }, agreement: { rooms: { W1: 7, P1: 1 }, total: 2400 },
  additional: { ratePerRoomNight: 150 }, supplement: { perRoomNight: 60, confirmed: true } };
const RULE = { category: 'Accommodation', item: /^hotel\s+alpha\b/i };
const L004 = (row, details, rate, qty, mult, period) => ({ row, item: 'Hotel Alpha', category: 'Accommodation', details, rate, qty, mult, budget: rate * qty * mult, readable: true,
  periodText: period || '', period: period ? { from: period.split('|')[0], to: period.split('|')[1] } : null });
const BOOKED = [{ id: 'P1', rooms: [{ label: 'F', item: 'P1-EXEC', lines: [{ person: 'GA1' }, { person: 'GA2' }] }] },
  { id: 'W1', rooms: [{ label: 'I', item: 'W1-EXEC', lines: [{ person: 'GC1' }, { person: 'GC3' }] }] }];
const buy = (lines004, plan) => hotelPurchaseOf({ plan: plan || PLAN, roomContract: META, contracts: CONTRACTS, lines004, rule: RULE, centres: BOOKED, vendor: /^hotel\s+alpha\b/i });

test('PURCHASE · the agreement\'s block, a named suite row and a named earlier-arrival row are each set once; only the additional-person charge is open', () => {
  const hp = buy([L004(8, 'All Categories Rooms', 150, 7, 2, '2031-02-27|2031-03-01'), L004(9, 'Alpha President (Host & Two)', 150, 1, 2, '2031-02-25|2031-02-27'),
    L004(10, 'All Categories Rooms (Tomasz + Ulla)', 150, 1, 2, '2031-02-28|2031-03-01')]);
  assert.equal(hp.available, true);
  assert.deepEqual([hp.totals.contract.cents, hp.totals.additional.cents, hp.totals.supplement.cents], [7 * 2 * 15000 + 2 * 15000, 2 * 15000, 2 * 6000]);
  assert.deepEqual(hp.rows004.map((r) => r.row + ' ' + r.role), ['8 CONTRACT', '9 CONTRACT', '10 ADDITIONAL'], 'the named row takes the prewedding room, never the wedding room the block holds');
  assert.deepEqual(hp.proposals.map((p) => [p.kind, p.stay, p.label, p.total.cents, p.status, p.confirmed]), [['SUPPLEMENT', 'W1', 'I', 12000, 'NEW', true]], 'one charge per room per night, never per guest');
  assert.equal(hp.proposals[0].guests.map((g) => g.guestId).join(), 'GC3', 'the extra-bed guest');
  assert.match(hp.proposals[0].suggested.details, /^Additional-person charge, Grand Exec Room I \(Yara\)$/);
  assert.equal(hp.notIn004.cents, 12000);
  assert.deepEqual(hp.corrections.map((c) => c.row), [10], 'row 10 records 25–27.02 but reads 28.02–01.03');
  assert.equal(hp.unsettled.length, 0);
});

test('PURCHASE · what 004 lacks becomes an exact proposal; a held room is pending, not in the forecast; a short row is raised by the difference', () => {
  const none = buy([L004(8, 'All Categories Rooms', 150, 7, 2, '2031-02-27|2031-03-01')]);
  const kinds = none.proposals.map((p) => p.kind + ' ' + p.stay + ' ' + (p.label || '') + ' ' + p.total.cents + ' ' + p.status);
  assert.deepEqual(kinds, ['CONTRACT P1  30000 NEW', 'ADDITIONAL P1 F 30000 NEW', 'SUPPLEMENT W1 I 12000 NEW']);
  const add = none.proposals.find((p) => p.kind === 'ADDITIONAL');
  assert.deepEqual([add.suggested.details, add.suggested.rate, add.suggested.qty, add.suggested.nights, add.suggested.budget, add.suggested.period], ['Grand Exec Room F (Tomasz + Ulla)', 150, 1, 2, 300, '25.02-27.02.2031']);
  assert.equal(none.notIn004.cents, 30000 + 30000 + 12000);
  /* the same room only held (no confirmed booked line): pending */
  const held = hotelPurchaseOf({ plan: PLAN, roomContract: META, contracts: CONTRACTS, lines004: [L004(8, 'All Categories Rooms', 150, 7, 2)], rule: RULE, centres: [], vendor: /^hotel alpha/i });
  assert.deepEqual([held.proposals.find((p) => p.kind === 'ADDITIONAL').confirmed, held.pending.cents], [false, 30000 + 12000]);
  assert.equal(held.notIn004.cents, 30000, 'only the agreement\'s own suite is in the forecast');
  /* a row naming the room's guests at less than it costs: raised by the difference — the booking governs */
  const short = buy([L004(8, 'All Categories Rooms', 150, 7, 2), L004(9, 'Alpha President (Host & Two)', 150, 1, 2), L004(10, 'Rooms (Tomasz + Ulla)', 125, 1, 2)]);
  const raise = short.proposals.find((p) => p.kind === 'ADDITIONAL');
  assert.deepEqual([raise.status, raise.total.cents, raise.existing004], ['RAISE', 5000, [10]]);
  assert.match(short.checks.map((c) => c.text).join(' '), /004 row 10 states USD 250\.00 for room F .* costs USD 300\.00 — the booking governs/);
});

test('PURCHASE · never counted twice: an unnamed row uses the open nights up to its amount, the rest is named; a second row for one room is a duplicate', () => {
  const block = L004(8, 'All Categories Rooms', 150, 7, 2), suite = L004(9, 'Alpha President (Host & Two)', 150, 1, 2);
  const lump = buy([block, suite, L004(10, 'Extra rooms prewedding', 150, 2, 2, '2031-02-25|2031-02-27')]);
  const r10 = lump.rows004.find((r) => r.row === 10);
  assert.deepEqual([r10.role, r10.rest.cents], ['ADDITIONAL', 30000], 'USD 600 against one open room of USD 300');
  assert.deepEqual(lump.proposals.map((p) => p.kind), ['SUPPLEMENT'], 'the open room is not proposed again');
  assert.equal(lump.unsettled.length, 1); assert.match(lump.checks.map((c) => c.text).join(' '), /USD 300\.00 more than the bookings, kept in 004 as written/);
  const twice = buy([block, suite, L004(10, 'Room (Tomasz + Ulla)', 150, 1, 2), L004(11, 'Room again (Ulla)', 150, 1, 2)]);
  assert.equal(twice.rows004.find((r) => r.row === 11).role, 'DUPLICATE');
  assert.match(twice.checks.map((c) => c.text).join(' '), /004 row 11 .* already recorded by 004 row 10/);
  const stray = buy([block, suite, L004(12, 'Rooms (Olga)', 150, 1, 2)]);
  assert.equal(stray.rows004.find((r) => r.row === 12).role, 'ADDITIONAL', 'an unnamed-in-the-plan row still takes the open room, never adds it again');
  const block2 = buy([block, L004(13, 'All Categories Rooms', 150, 7, 2)]);
  assert.equal(block2.rows004.find((r) => r.row === 13).role, 'DUPLICATE', 'a second block beyond the stay\'s nights');
  /* inputs missing: nothing set, the reason named */
  assert.deepEqual([hotelPurchaseOf({ plan: [], roomContract: META, rule: RULE }).available, hotelPurchaseOf({ plan: [], roomContract: META, rule: RULE }).why], [false, 'the room plan (Rooms engine) is not readable just now']);
});

test('PURCHASE · review 18 Nov: an unconfirmed extra person is pending; a kept place counts as a person; a named duplicate, a foreign period and a wrong charge row take nothing', () => {
  const block = L004(8, 'All Categories Rooms', 150, 7, 2, '2031-02-27|2031-03-01'), suite = L004(9, 'Alpha President (Host & Two)', 150, 1, 2);
  /* the extra-bed guest of room I has no booked line: the charge is pending, never in the forecast */
  const noBed = hotelPurchaseOf({ plan: PLAN, roomContract: META, contracts: CONTRACTS, lines004: [block, suite], rule: RULE, vendor: /^hotel alpha/i,
    centres: [BOOKED[0], { id: 'W1', rooms: [{ label: 'I', item: 'W1-EXEC', lines: [{ person: 'GC1' }, { person: 'GC2' }] }] }] });
  const sup = noBed.proposals.find((p) => p.kind === 'SUPPLEMENT');
  assert.deepEqual([sup.confirmed, noBed.notIn004.cents, noBed.pending.cents, noBed.confirmed.supplement.cents], [false, 30000, 12000, 0]);
  assert.equal(noBed.lines.find((l) => l.stay === 'W1' && l.label === 'I').status, 'CONFIRMED', 'the room itself is confirmed');
  /* a kept place beyond the room's places: a person, its charge pending */
  const kept = [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'K', 'Grand Exec', 'W1-EXEC', [occ('GK1', 'Kai One'), occ('GK2', 'Kai Two'), { kept: true }])] }];
  const k = hotelPurchaseOf({ plan: kept, roomContract: { ...META, agreement: {} }, contracts: CONTRACTS, lines004: [], rule: RULE, centres: [{ id: 'W1', rooms: [{ label: 'K', item: 'W1-EXEC', lines: [{ person: 'GK1' }, { person: 'GK2' }] }] }] });
  assert.deepEqual([k.lines[0].extraPersons, k.lines[0].supplementStatus, k.pending.cents], [1, 'HELD', 12000]);
  /* a row naming guests whose room the block already holds is a duplicate — it never takes another couple's earlier arrival */
  const dup = buy([block, suite, L004(10, 'Grand Exec (Bartholomew + Vera)', 150, 1, 2)]);
  assert.equal(dup.rows004.find((r) => r.row === 10).role, 'DUPLICATE'); assert.ok(dup.proposals.some((p) => p.kind === 'ADDITIONAL' && p.label === 'F'), 'room F stays proposed');
  /* a period meeting no stay of the agreement takes nothing */
  const away = buy([block, suite, L004(11, 'Rooms', 150, 1, 2, '2031-03-05|2031-03-07')]);
  assert.deepEqual([away.rows004.find((r) => r.row === 11).role, away.unsettled.length], ['UNMATCHED', 1]);
  /* an additional-person row naming a guest without a third person in the room takes no charge */
  const wrong = buy([block, suite, L004(12, 'Extra bed (Tomasz)', 60, 1, 2)]);
  assert.equal(wrong.rows004.find((r) => r.row === 12).role, 'UNMATCHED'); assert.ok(wrong.proposals.some((p) => p.kind === 'SUPPLEMENT' && p.label === 'I'));
  /* a block whose Qty drifts stays the agreement's block, the difference named and raised — never additional nights */
  const drift = buy([L004(8, 'All Categories Rooms', 150, 3, 2), suite]);
  assert.equal(drift.rows004.find((r) => r.row === 8).role, 'CONTRACT');
  assert.match(drift.checks.map((c) => c.text).join(' '), /004 row 8 buys 3 rooms; the agreement buys 7 rooms/);
  assert.deepEqual(drift.proposals.map((p) => p.kind + ' ' + p.stay + ' ' + p.status + ' ' + p.total.cents), ['CONTRACT W1 RAISE 120000', 'ADDITIONAL P1 NEW 30000', 'SUPPLEMENT W1 NEW 12000']);
  /* two rows of one night each for one room: both set, nothing raised twice */
  const nightly = buy([block, suite, L004(13, 'Room (Tomasz + Ulla)', 150, 1, 1), L004(14, 'Room night two (Tomasz + Ulla)', 150, 1, 1)]);
  assert.deepEqual(nightly.rows004.filter((r) => r.row >= 13).map((r) => r.role), ['ADDITIONAL', 'ADDITIONAL']); assert.ok(!nightly.proposals.some((p) => p.kind === 'ADDITIONAL'));
  /* re-review: the block whose Qty is the agreement's own comes first, whatever the row order */
  const order = buy([L004(7, 'All Categories Rooms', 150, 2, 2), block, suite]);
  assert.deepEqual(order.rows004.map((r) => r.row + ' ' + r.role), ['7 DUPLICATE', '8 CONTRACT', '9 CONTRACT']);
  assert.ok(!order.proposals.some((p) => p.kind === 'CONTRACT'), 'the agreement is not raised by a stray row');
  /* re-review: without a bed flag the charge is confirmed only when more guests are confirmed than the room has places — never by guest order */
  const three = (ids) => [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'T', 'Grand Exec', 'W1-EXEC', ids.map((i) => occ(i, 'Tess ' + i)))] }];
  const conf2 = [{ id: 'W1', rooms: [{ label: 'T', item: 'W1-EXEC', lines: [{ person: 'GT1' }, { person: 'GT2' }] }] }];
  const st = (ids) => hotelPurchaseOf({ plan: three(ids), roomContract: { ...META, agreement: {} }, contracts: CONTRACTS, lines004: [], rule: RULE, centres: conf2 }).lines[0].supplementStatus;
  assert.deepEqual([st(['GT1', 'GT2', 'GT3']), st(['GT3', 'GT1', 'GT2'])], ['HELD', 'HELD']);
  /* the shortfall of a room split over two rows is said once, after both, and only when it remains */
  assert.doesNotMatch(nightly.checks.map((c) => c.text).join(' '), /difference is a proposed addition/);
  /* no budget rule: nothing is set */
  assert.equal(hotelPurchaseOf({ plan: PLAN, roomContract: META, contracts: CONTRACTS, lines004: [block] }).available, false);
});

test('PURCHASE · hotel performance: the agreement, confirmed additional nights and charges are the stay\'s cost; a report missing its room plan names the gap', () => {
  const hp = buy([L004(8, 'All Categories Rooms', 150, 7, 2), L004(9, 'Alpha President (Host & Two)', 150, 1, 2)]);
  const h = hotelPerformance({ plan: PLAN, contracts: CONTRACTS, centres: CENTRES, suppliers: [], rooms012: { units: {} }, purchase: hp });
  const p = h.find((x) => x.stay === 'P1'), w = h.find((x) => x.stay === 'W1');
  assert.deepEqual([p.cost.cents, p.costParts.additional.cents, p.roomsAdditional, p.costComplete, p.surplus.cents], [60000, 30000, 1, true, 52000 - 60000]);
  assert.deepEqual([w.cost.cents, w.costParts.supplement.cents, w.surplus.cents], [7 * 2 * 15000 + 12000, 12000, 36500 - (210000 + 12000)]);
  const rep = financeReportOf({ budget: { totals: {}, lines: [] }, plan: [], contracts: CONTRACTS, centres: [], roomContractMeta: META, dashboard: { costs: { original: usd(1000), forecast: usd(1000) } } });
  assert.equal(rep.forecastComplete, false); assert.match(rep.forecastGaps[0].text, /purchase costs could not be set beside 004/);
  assert.match(rep.exceptions.map((e) => e.text).join(' '), /The hotel's purchase costs could not be set beside 004/);
});

test('REPORT · rides beside the comparison without changing it; a failure is named, never a broken budget', () => {
  const empty = buildBudgetComparison({ asOf: '2026-11-18' });
  assert.equal(empty.available, false, 'unread sources: no report is pretended');
  const r = financeReportOf({});
  assert.deepEqual([r.approved, r.forecast, r.hotel.length, r.rooms012.available, r.exceptions.length], [null, null, 0, false, 0], '012 is a reference: its absence is no exception');
  assert.equal(unitId('W1', { key: 'a/b', label: 'C' }), 'W1|a/b|C');
});

test('012 · review 18 Nov: one guest counts once (a shared surname never wins a room), ISO and slash dates read, a contested row goes to nobody', () => {
  const plan = [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'X', 'Grand Exec', 'W1-EXEC', [occ('GM1', 'Hans Mullerton')])] }];
  const m = match012(plan, [row(2, 'Grand Exec', '101', '27.02.2031', '01.03.2031', ['Hans Mullerton']), row(3, 'Grand Exec', '102', '27.02.2031', '01.03.2031', ['Anna Mullerton', 'Peter Mullerton'])]);
  assert.deepEqual([m.units['W1|wed/exec|X'].roomNo, m.units['W1|wed/exec|X'].status], ['101', 'OK']);
  assert.deepEqual(m.notBooked.map((r) => r.roomNo), ['102']);
  assert.equal(nameLikeness('Anna Mullerton', 'Hans Mullerton'), 'SIMILAR', 'a surname alone is never EXACT');
  assert.equal(nameLikeness('and', 'Andrew Fell'), null, 'a filler word is no name');
  const iso = match012(plan, [row(2, 'Grand Exec', '201', '2031-05-01', '2031-05-03', ['Hans'])]);
  assert.equal(iso.units['W1|wed/exec|X'], undefined, 'an ISO-dated row of May never pairs with a February stay');
  const slash = match012(plan, [row(2, 'Grand Exec', '202', '27/02/2031', '1/3/2031', ['Hans'])]);
  assert.deepEqual([slash.units['W1|wed/exec|X'].roomNo, slash.units['W1|wed/exec|X'].status], ['202', 'OK']);
  const bad = match012(plan, [row(2, 'Grand Exec', '203', 'soon', '01.03.2031', ['Hans'])]);
  assert.match(bad.units['W1|wed/exec|X'].verify.join(' '), /check-in date of room 203 is not readable/);
  const two = [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'X', 'Grand Exec', 'W1-EXEC', [occ('GM1', 'Wilma A')]), unit('wed/exec', 'Y', 'Grand Exec', 'W1-EXEC', [occ('GM2', 'Wilma B')])] }];
  const t = match012(two, [row(2, 'Grand Exec', '301', '27.02.2031', '01.03.2031', ['Wilma'])]);
  assert.deepEqual([t.units['W1|wed/exec|X'], t.units['W1|wed/exec|Y'], t.ambiguous.length], [undefined, undefined, 2], 'two rooms, one row: nobody gets it');
});

test('REPORT · review 18 Nov: an unreadable 004 line stays out of the categories and is named; one failing check never empties the list', () => {
  const dashboard = { costs: { original: usd(100000), forecast: usd(100000), adjustments: [] } };
  const rep = financeReportOf({ budget: { totals: {}, lines: [{ row: 8, item: 'Rooms', category: 'Accommodation', budget: 1000, readable: true }, { row: 9, item: 'Lump', category: 'Misc', budget: 500, readable: false }] },
    dashboard, centres: [], plan: [], contracts: [], list012: [], suppliers: [{ get vendor() { throw new Error('unreadable'); }, contract: null, payments: [] }], vendor: /^x/ });
  assert.equal(rep.byCategory.find((c) => c.category === 'Misc'), undefined);
  const t = rep.exceptions.map((e) => e.text).join('\n');
  assert.match(t, /004 row 9 is not readable/); assert.match(t, /The check of the hotel's purchase against 004 could not be made just now/);
  assert.equal(rep.approved, null); assert.match(rep.approvedWhy, /no TOTAL BUDGET/);
});

test('012 · re-review 18 Nov: another surname is another person; a room whose rows went to a tie is ambiguous; impossible ISO dates are not readable', () => {
  assert.equal(nameLikeness('Anna Jones', 'Anna Smith'), null);
  assert.equal(nameLikeness('Anna Jonesy', 'Anna Jones'), 'SIMILAR'); assert.equal(nameLikeness('Anna', 'Anna Smith'), 'EXACT');
  const plan = [{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'A', 'Grand Exec', 'W1-EXEC', [occ('G1', 'Anna Smith')]),
    unit('wed/exec', 'B', 'Grand Exec', 'W1-EXEC', [occ('G2', 'Anna Jones'), occ('G3', 'Carl Jones')])] }];
  const m = match012(plan, [row(2, 'Grand Exec', '102', '27.02.2031', '01.03.2031', ['Anna Jones'])]);
  assert.equal(m.units['W1|wed/exec|A'], undefined, 'Anna Smith never takes Anna Jones\'s room');
  assert.equal(m.units['W1|wed/exec|B'].roomNo, '102'); assert.match(m.units['W1|wed/exec|B'].verify.join(' '), /1 of the 1 name in 012 match; the room holds 2 guests/);
  const t = match012([{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'A', 'Grand Exec', 'W1-EXEC', [occ('G1', 'Anna Smith'), occ('G4', 'Ben Smith')]),
    unit('wed/exec', 'B', 'Grand Exec', 'W1-EXEC', [occ('G2', 'Anna Jones')])] }], [row(2, 'Grand Exec', '201', '', '', ['Anna']), row(3, 'Grand Exec', '202', '', '', ['Anna'])]);
  assert.equal(t.notIn012.length, 0); assert.equal(t.ambiguous.length, 2);
  const d = match012([{ stay: 'W1', place: 'W', from: '2031-02-27', to: '2031-03-01', rooms: [unit('wed/exec', 'A', 'Grand Exec', 'W1-EXEC', [occ('G1', 'Anna Smith')])] }],
    [row(2, 'Grand Exec', '301', '2031-02-31', '2031-03-01', ['Anna'])]);
  assert.match(d.units['W1|wed/exec|A'].verify.join(' '), /check-in date of room 301 is not readable/);
});

test('PURCHASE · THE OWNERS\' ASSIGNMENT (18 Nov 2026): guests billed in room F whom the Owners placed in room G of the same category keep their room confirmed — stay, item and guest the same, the billed label among where they were; the costs do not move', () => {
  const moved = JSON.parse(JSON.stringify(PLAN));
  const p1 = moved.find((s) => s.stay === 'P1');
  p1.rooms[0] = unit('pre/exec', 'G', 'Grand Exec', 'P1-EXEC', [{ ...occ('GA1', 'Tomasz Ardent'), placedFrom: ['F'] }, { ...occ('GA2', 'Ulla Ardent'), placedFrom: ['F'] }]);
  const lines = [L004(8, 'All Categories Rooms', 150, 7, 2, '2031-02-27|2031-03-01')];
  const a = buy(lines), b = buy(lines, moved);
  const addA = a.proposals.find((p) => p.kind === 'ADDITIONAL'), addB = b.proposals.find((p) => p.kind === 'ADDITIONAL');
  assert.equal(addA.confirmed, true); assert.equal(addB.confirmed, true, 'the moved room is the booked room');
  assert.equal(addB.label, 'G'); assert.equal(addB.total.cents, addA.total.cents);
  assert.equal(b.notIn004.cents, a.notIn004.cents); assert.equal(b.pending.cents, a.pending.cents);
  /* the label alone never confirms: another guest in G, nobody's billed label among where they were — held */
  const other = JSON.parse(JSON.stringify(PLAN)); other.find((s) => s.stay === 'P1').rooms[0] = unit('pre/exec', 'G', 'Grand Exec', 'P1-EXEC', [{ ...occ('GZ9', 'Zed Other'), placedFrom: ['F'] }]);
  assert.equal(buy(lines, other).proposals.find((p) => p.kind === 'ADDITIONAL').confirmed, false);
});
