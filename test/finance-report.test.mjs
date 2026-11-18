/* ============================================================================
   THE FINANCE REPORT (Owners' review, 18 Nov 2026) — src/billing/finance-report.js. Synthetic names and figures only.
   Google 012 is matched for room numbers (uncertain → "verify", a tie → no number), a hotel's cost exists only where an
   agreement states it, the approved budget is 004's own, the triple-occupancy supplement is a decision (never in the forecast),
   THB is never added to USD, and every gap is named.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { match012, nameLikeness, roomTypeKey, hotelPerformance, financeReportOf, unitId } from '../src/billing/finance-report.js';
import { buildBudgetComparison } from '../src/billing/budget.js';

const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100 });
const thb = (cents) => ({ currency: 'THB', cents, amount: cents / 100 });
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

test('REPORT · approved = 004 TOTAL BUDGET; forecast unchanged; the supplement only a decision; THB never added; gaps named; nothing guessed', () => {
  const budget = { totals: { totalBudget: 2000, totalBudgetCell: 'A2', budgetLeft: -500, budgetLeftCell: 'F2' }, lines: [
    { row: 8, item: 'Rooms', vendor: 'Hotel Alpha', category: 'Accommodation', budget: 1500, paid: null },
    { row: 9, item: 'Cake', vendor: 'Sweet Co', category: 'Food & Beverage', budget: 800, paid: null },
    { row: 10, item: 'Cottage', vendor: 'Cottage Co', category: 'Accommodation', budget: 200, paid: 20, payDateText: '01.08.2030' }] };
  const dashboard = { costs: { original: usd(250000), forecast: usd(310000), adjustments: [{ vendor: 'Souphattra Heritage Vientiane', rows: [8], planned004: usd(150000), contract: usd(210000), difference: usd(60000) }] },
    position: { stated: true, projectedOwnerFunded: usd(200000) } };
  const suppliers = [
    { vendor: 'Souphattra Heritage Vientiane', stages: ['W1'], contract: usd(210000), payments: [{ counted: true, amount: usd(105000) }], stays: [{ stage: 'W1', uncovered: [{ night: '2031-02-27', others: [] }] }], possibleDuplicates: { rows: [], partlyRows: [9] } },
    { vendor: 'Sky Bakery', stages: [], contract: thb(3000000), payments: [{ counted: true, amount: thb(1500000) }] },
    { vendor: 'Mystery Vendor', stages: [], contract: thb(100000), payments: [] }];
  const rep = financeReportOf({ budget, suppliers, centres: CENTRES, plan: PLAN, contracts: CONTRACTS, dashboard,
    roomContractMeta: { supplement: { perRoomNight: 60, source: 'agreement' } }, rates009: { ok: true, rows: [{ row: 6, Person_ID: 'G048', Rate_Per_Person_Night: 75 }] },
    revenue: { booked: { cents: 110000, complete: true } }, receipts: { cashCollected: { cents: 10000, complete: true } }, fx: { day: '2030-10-07', FX_USD_THB: 33.68 }, list012: LIST });
  assert.deepEqual([rep.approved.cents, rep.approved.cell, rep.planned.cents, rep.forecast.cents], [200000, 'A2', 250000, 310000], 'the forecast is the dashboard\'s, unchanged');
  assert.deepEqual([rep.varianceToApproved.cents, rep.plannedVsApproved.cents, rep.budgetLeftSheet.cents], [110000, 50000, -50000]);
  const sup = rep.exceptions.find((e) => /Triple occupancy/.test(e.text));
  assert.ok(sup && sup.kind === 'DECISION'); assert.equal(sup.amount.cents, 1 * 2 * 6000, 'room I: one person above its places, 2 nights × USD 60');
  assert.equal(sup.ifAccepted.cents, 310000 + 12000); assert.equal(rep.forecast.cents, 310000, 'not in the forecast');
  const cat = (n) => rep.byCategory.find((c) => c.category === n);
  assert.deepEqual([cat('Accommodation').planned.cents, cat('Accommodation').forecast.cents, cat('Accommodation').variance.cents], [170000, 230000, 60000]);
  assert.deepEqual(cat('Food & Beverage').committed, [thb(3000000)], 'THB stays THB');
  assert.equal(cat('Unassigned').suppliers[0], 'Mystery Vendor', 'an unmapped supplier is listed, never dropped');
  assert.deepEqual(rep.paid, [usd(105000), thb(1500000)]);
  assert.equal(rep.cash.ownerStillToProvide.cents, (310000 - 105000) - (110000 - 10000)); assert.equal(rep.cash.complete, false);
  assert.match(rep.cash.why.join(' '), /THB 15,000\.00 are not deducted/);
  assert.equal(rep.indicative.rate, 33.68); assert.match(rep.indicative.words, /never added to a figure/);
  assert.equal(rep.forecastComplete, false); assert.ok(rep.forecastGaps.some((g) => g.centre === 'P1' && /F · 203/.test(g.text)) && rep.forecastGaps.some((g) => g.centre === 'K1'));
  assert.ok(!rep.forecastGaps.some((g) => g.centre === 'W1'), 'a night the agreement buys is no gap');
  const texts = rep.exceptions.map((e) => e.kind + ' ' + e.area + ' ' + e.text).join('\n');
  assert.match(texts, /DECISION Budget 004 Souphattra Heritage Vientiane: 004 rows 8 plan USD 1,500\.00; the agreement is USD 2,100\.00.*no line for the night 27\.02\.2031 \(W1\); 004 row 9 may lie inside the agreement\. Update 004\?/);
  assert.match(texts, /DECISION Currency 007 holds commitments and payments in THB/);
  assert.match(texts, /INFO 009 009 rows 6 still state a rate for the couple/);
  assert.match(texts, /DATA Budget 004 004 row 10 \(Cottage, Cottage Co\) records USD 20\.00 paid on 01\.08\.2030 — not in 007; not counted/);
  assert.match(texts, /DATA 012 Hotel Alpha · wedding stay · room A \(Heritage, Quentin Absent, Rosa Absent\): booked, but not in 012/);
  assert.match(texts, /DATA 012 012 room 202 \(The Heritage\) lists Olga Nobody — no booked room matches/);
  assert.ok(rep.hotel.length === 3 && rep.rooms012.available);
});

test('REPORT · rides beside the comparison without changing it; a failure is named, never a broken budget', () => {
  const empty = buildBudgetComparison({ asOf: '2026-11-18' });
  assert.equal(empty.available, false, 'unread sources: no report is pretended');
  const r = financeReportOf({});
  assert.deepEqual([r.approved, r.forecast, r.hotel.length, r.rooms012.available, r.exceptions.length], [null, null, 0, false, 1]);
  assert.match(r.exceptions[0].text, /012 could not be read/);
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
  const dashboard = { costs: { original: usd(100000), forecast: usd(100000), adjustments: [{ vendor: 'X', rows: [8], planned004: null, contract: usd(1), difference: usd(1) }] } };
  const rep = financeReportOf({ budget: { totals: {}, lines: [{ row: 8, item: 'Rooms', category: 'Accommodation', budget: 1000, readable: true }, { row: 9, item: 'Lump', category: 'Misc', budget: 500, readable: false }] },
    dashboard, centres: [], plan: [], contracts: [], list012: [] });
  assert.equal(rep.byCategory.find((c) => c.category === 'Misc'), undefined);
  const t = rep.exceptions.map((e) => e.text).join('\n');
  assert.match(t, /004 row 9 is not readable/); assert.match(t, /The check of the agreement against 004 could not be made just now/);
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
