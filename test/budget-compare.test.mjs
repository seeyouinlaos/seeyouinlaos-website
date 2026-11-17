/* ============================================================================
   REVENUE AND BUDGET, SIDE BY SIDE (billing-budget/1.0.0 · Owners, 15 Nov 2026) — src/billing/budget.js.
   The guests' side is the shipped engine's own booked lines (buildRevenueOverview → bookedLines); the supplier side is
   004 / 007 / 002 parsed from grids. Every person, invitation, amount and date here is invented; only the stage ids and
   the supplier words follow the reviewed map (src/billing/budget-map.js).
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBudgetComparison, LABELS } from '../src/billing/budget.js';
import { parseBudget004, parseVendors007, parseItemDisplay, parseSpecialRateRows } from '../src/billing/budget-source.js';
import { buildRevenueOverview } from '../src/billing/revenue.js';
import { calculate } from '../src/billing/engine.js';

const ASOF = '2030-11-17';
const ITEMS = {
  'D1-EXEC': { Item_ID: 'D1-EXEC', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 145,
    Quota: 3, Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', Site_Product_Key: 'wedstay/heritage-executive', 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] },
  'D1-MAJ': { Item_ID: 'D1-MAJ', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 250,
    Quota: 1, Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', Site_Product_Key: 'wedstay/grand-majestic', 'Number of Nights': 2, Modifiers: ['SECOND_NIGHT_COMPLIMENTARY'] },
  'B-TRAIN': { Item_ID: 'B-TRAIN', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 100,
    Quota: 12, Quota_Unit: 'PERSON', Currency: 'USD', Site_Product_Key: 'train', 'Number of Nights': 1 },
  'G-TRAIN': { Item_ID: 'G-TRAIN', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 100,
    Quota: 7, Quota_Unit: 'PERSON', Currency: 'USD', Site_Product_Key: 'c86', 'Number of Nights': 1 },
  'X-TEMPLE': { Item_ID: 'X-TEMPLE', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON', Standard_Rate: 15,
    Currency: 'USD', Site_Product_Key: 'sangkhathan' },
  'J-HOTEL': { Item_ID: 'J-HOTEL', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 0,
    Currency: 'USD', Site_Product_Key: 'kempinski/jatu-room', 'Number of Nights': 2 },
};
/* 002's display rows, one column per product (the layout of the workbook) */
const COLS = [
  ['D1-EXEC', 'Heritage Executive', '27.02.2031', '01.03.2031', 2, 'D1', 'Accommodation'],
  ['D1-MAJ', 'Grand Majestic Suite', '27.02.2031', '01.03.2031', 2, 'D1', 'Accommodation'],
  ['B-TRAIN', 'Night train', '24.02.2031', '25.02.2031', 1, 'B', 'Transportation'],
  ['G-TRAIN', 'China train', '04.03.2031', '04.03.2031', 1, 'G', 'Transportation'],
  ['X-TEMPLE', 'Temple Offering', '28.02.2031', '28.02.2031', 1, '', 'Special Items'],
  ['J-HOTEL', 'Jatu Room', '06.03.2031', '08.03.2031', 2, 'J', 'Accommodation'],
];
const GRID002 = [['SEE YOU'], ['Name', ...COLS.map((c) => c[1])], ['Check In Date', ...COLS.map((c) => c[2])], ['Check Out Date', ...COLS.map((c) => c[3])],
  ['Number of Nights', ...COLS.map((c) => c[4])], ['Rooms available', ...COLS.map(() => '')], ['Room', ...COLS.map((c) => c[1])], ['Package', ...COLS.map((c) => c[5])],
  ['Category', ...COLS.map((c) => c[6])], ['— STRUCTURED'], ['Item_ID', ...COLS.map((c) => c[0])]];

/* 004: the header by its labels, a summary block above it */
const HEAD = ['ID', 'Item', 'Vendor', 'Category', 'Details', 'Rate USD', 'Qty', 'Nights, Rooms, EA', 'Rspn.', 'Budget USD', 'Actual USD', 'Amount paid USD', 'Paid by',
  'Pay Date', 'Status', 'Date or period', 'Location', 'Currency', 'Suthep approval', 'Done'];
const L = (o) => { const r = Array(HEAD.length).fill(''); for (const [k, v] of Object.entries(o)) r[HEAD.indexOf(k)] = v; return r; };
const OK = 'Approve by S., 01.01.2030';
const BLOCK27 = { Item: 'Souphattra Heritage Vientiane', Vendor: 'Souphattra', Category: 'Accommodation', Details: 'All Categories Rooms', 'Rate USD': 150, Qty: 4, 'Nights, Rooms, EA': 1, 'Budget USD': 600, 'Date or period': '27-28.02.2031', Currency: 'USD', 'Suthep approval': OK };
const BLOCK28 = { ...BLOCK27, 'Date or period': '28.02-01.03..2031' };
const TRAIN = { Item: 'Train Bangkok - Nong Khai', Vendor: 'Rail', Category: 'Transportation', Details: 'Guests', 'Rate USD': 80, Qty: 3, 'Nights, Rooms, EA': 1, 'Budget USD': 240, 'Date or period': '24.02.2031', Currency: 'USD', 'Suthep approval': OK };
const VAN = { Item: 'Nong Khai - Souphattra', Vendor: 'Van Co', Category: 'Transportation', Details: 'Van for the guests', 'Rate USD': 400, Qty: 1, 'Nights, Rooms, EA': 1, 'Budget USD': 400, 'Date or period': '25.02.2031', Currency: 'USD', 'Suthep approval': OK };
const CHINA = { Item: 'Train Kunming - Lijiang', Vendor: 'Rail', Category: 'Transportation', Details: 'Guests', 'Rate USD': 100, Qty: 2, 'Nights, Rooms, EA': 1, 'Budget USD': 200, 'Date or period': '04.03.2031', Currency: 'USD', 'Suthep approval': OK };
const CAKE = { Item: 'Cake', Vendor: 'Bakery', Category: 'Food & Beverage', Details: '-', 'Rate USD': 150, Qty: 1, 'Nights, Rooms, EA': 1, 'Budget USD': 150, 'Date or period': '28.02.2031', Currency: 'USD', 'Suthep approval': OK };
const PLAN = { Item: 'Souphattra Heritage Vientiane', Vendor: 'Souphattra', Category: 'Accommodation', Details: '002 - Heritage Executive (3)', 'Rate USD': -145, Qty: 2, 'Nights, Rooms, EA': 2, 'Budget USD': -580, 'Date or period': '27. - 28.02.2031', Currency: 'USD', 'Suthep approval': OK };
function grid004(lines, totals) {
  const t = totals || {};
  return [['TOTAL PLANNED BUDGET', '', 'GUEST CONTRIBUTIONS'], [t.planned != null ? t.planned : '', '', t.contributions != null ? t.contributions : ''], [], HEAD, ...lines.map(L)];
}
const FORMULAS = (g) => g.map((r, i) => r.map((c, j) => (HEAD[j] === 'Actual USD' && i > 3 ? '=J' + (i + 1) : c)));

/* 007: the Souphattra column typed in USD (THB converted inside the sheet); one payment by today, one after it */
const V7 = [['Vendor', 'Souphattra Heritage Vientiane'], ['Category', 'Hotel'], ['Total Price THB', 33250], ['Total Price USD', 1000], [], ['Deposit %', 50], ['Deposit Amount USD', 500], [],
  ['Ann USD', 250], ['Paid Amount', 250], ['Payment Date', '01.09.2030'], ['Paid By', 'Ann'], [], ['Ben USD', 250], ['Paid Amount', 250], ['Payment Date', '03.09.2031'], ['Paid By', 'Ben']];
const F7 = V7.map((r, i) => r.map((c, j) => (i === 2 && j === 1 ? '=B4*33.25' : c)));

const bk = (holder, person, item, unit) => ({ Booking_ID: ['BK', holder, person, item, 'g1'].join('·'), Holder_ID: holder, Person_ID: person, Item_ID: item, Bill_To_Holder_ID: holder,
  Room_Unit_ID: unit ? 'RU·' + item + '·' + unit : null, State: 'CONFIRMED', Nights: ITEMS[item]['Number of Nights'] || null, Quantity: 1, Selected: true });
const BOOKINGS = {
  'INV-GA': [bk('INV-GA', 'GA1', 'D1-EXEC', 'A'), bk('INV-GA', 'GA2', 'D1-EXEC', 'A'), bk('INV-GA', 'GA1', 'B-TRAIN'), bk('INV-GA', 'GA1', 'X-TEMPLE'), bk('INV-GA', 'GA1', 'G-TRAIN')],
  'INV-GB': [bk('INV-GB', 'GB1', 'D1-MAJ', 'A'), bk('INV-GB', 'GB2', 'D1-MAJ', 'A'), bk('INV-GB', 'GB1', 'B-TRAIN'), bk('INV-GB', 'GB2', 'B-TRAIN'), bk('INV-GB', 'GB1', 'G-TRAIN')],
  'INV-GC': [bk('INV-GC', 'GC1', 'D1-EXEC', 'B')],
};
const H = (id, bookings) => ({ Holder_ID: id, bookings, drifts: [], regState: 'CONFIRMED', ownerState: 'NONE', ownerProblems: [], extraBeds: [], noSettlementRecord: true });

function world(o = {}) {
  const items = o.items || ITEMS;
  const bookings = o.bookings || BOOKINGS;
  const specialRates = o.specialRates || [];
  const ov = buildRevenueOverview({ holders: Object.entries(bookings).map(([id, b]) => H(id, b)), items, specialRates, journalRows: [], issuedRevisions: [], asOf: ASOF });
  const lines = o.lines004 || [BLOCK27, BLOCK28, TRAIN, VAN, CHINA, CAKE, PLAN];
  const g = grid004(lines, o.totals);
  const input = {
    asOf: ASOF, booked: o.booked ? o.booked(ov.bookedLines) : ov.bookedLines, items, display: parseItemDisplay(GRID002),
    budget: parseBudget004(g, o.noFormulas ? null : FORMULAS(g)), vendors: parseVendors007(V7, o.noFormulas ? null : F7),
    rates009: parseSpecialRateRows(o.grid009 || [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Approved_By']]),
    names: o.names || null, rooms: o.rooms || null, quota: ov.quotaUtilisation, bookedRevenue: o.bookedRevenue || ov.bookedRevenue,
    receipts: null, unresolved: o.unresolved || [], readProblems: [],
  };
  return { ov, input, out: buildBudgetComparison(input) };
}
const C = (out, id) => out.centres.find((c) => c.id === id);
const K = (out, cat) => out.categories.find((c) => c.category === cat);
const engineCents = (holderIds, itemIds) => calculate(Object.entries(BOOKINGS).filter(([h]) => holderIds.includes(h)).flatMap(([, b]) => b),
  { items: ITEMS, specialRates: [], asOf: ASOF }).lines.filter((l) => itemIds.includes(l.Item_ID)).reduce((t, l) => t + l.amountCents, 0);

test('BUDGET · the guests\' side is exactly the booked figure: every engine line once, reconciled, the overview\'s JSON unchanged by it', () => {
  const { ov, out } = world();
  assert.equal(out.available, true);
  assert.equal(out.reconciliation.contributions.cents, ov.bookedRevenue.cents); assert.equal(out.reconciliation.contributionsEqualBooked, true);
  assert.equal(JSON.stringify(ov).includes('bookedLines'), false, 'the kept lines are not enumerable: the payload is what it was');
  assert.equal(C(out, 'D1').contribution.cents, engineCents(['INV-GA', 'INV-GB', 'INV-GC'], ['D1-EXEC', 'D1-MAJ']), 'amountCents only, never rate × nights');
  assert.deepEqual(out.categories.map((c) => c.category), ['Accommodation', 'Transportation', 'Special Items'], 'Accommodation and Transportation first');
});

test('BUDGET · a stay covered night by night by approved block lines: the blocks as stated (unsold rooms included), never re-priced or split — the hosts\' cost', () => {
  const { out } = world();
  const d1 = C(out, 'D1');
  assert.equal(d1.status, 'COMPLETE'); assert.deepEqual(d1.missing, []);
  assert.equal(d1.cost.cents, 120000, 'two blocks of four rooms × USD 150, though three rooms are booked');
  assert.equal(d1.difference.cents, d1.contribution.cents - 120000); assert.equal(d1.label, 'HOST_COST'); assert.equal(d1.labelText, LABELS.HOST_COST);
  assert.deepEqual(d1.coverage, { covered: 6, total: 6, unit: 'room-night' });
  assert.deepEqual(d1.notBooked.map((n) => [n.row, n.night, n.rooms, n.inBlock]), [[5, '2031-02-27', 1, 4], [6, '2031-02-28', 1, 4]]);
  assert.deepEqual(d1.assumptions, ['A-3']);
  const room = d1.rooms.find((r) => r.unit === 'RU·D1-EXEC·A');
  assert.deepEqual(room.nights.map((n) => [n.night, n.row, n.perRoomNight.cents]), [['2031-02-27', 5, 15000], ['2031-02-28', 6, 15000]], 'the block\'s per-room rate shown, never a per-room difference');
  assert.equal(room.lines.length, 2); assert.deepEqual(room.lines.map((g) => g.nightsWords), ['charged 1 · hosted 1', 'charged 1 · hosted 1']);
  assert.ok(room.lines.every((g) => g.payer === 'INV-GA' && g.rateSource === '002' && g.source === 'the guest\'s own trip'));
  /* the planned guest contribution of 004 is a comparison figure only — never revenue, never part of the difference */
  const plan = d1.lines004.find((x) => x.role === 'PLANNED_CONTRIBUTION');
  assert.equal(plan.row, 11); assert.deepEqual(plan.scope, ['D1-EXEC']); assert.equal(d1.plannedContributions.cents, 58000);
  assert.equal(K(out, 'Accommodation').plannedContributions.cents, 58000);
  assert.ok(!d1.usedRows.includes(11));
});

test('BUDGET · no partial difference: a night without an approved supplier line leaves the stay and its category without one — the known part side by side', () => {
  const { out } = world({ lines004: [BLOCK27, TRAIN, VAN, CHINA] });
  const d1 = C(out, 'D1');
  assert.equal(d1.status, 'NOT_COMPLETE'); assert.equal(d1.difference, null); assert.equal(d1.cost, null); assert.equal(d1.label, null);
  assert.equal(d1.known.cents, 60000, 'the cost known so far, never subtracted');
  assert.match(d1.missing.join(' '), /28\.02\.2031: no approved supplier cost for Grand Majestic Suite, Heritage Executive in 004/);
  const acc = K(out, 'Accommodation');
  assert.equal(acc.differenceAvailable, false); assert.equal(acc.difference, null); assert.deepEqual(acc.notComplete.centres, ['D1']);
  assert.deepEqual(acc.outside, ['J'], 'the stay the guests book and pay themselves is outside');
  /* an unapproved line is never used */
  const un = world({ lines004: [BLOCK27, { ...BLOCK28, 'Suthep approval': '' }, TRAIN, VAN, CHINA] }).out;
  assert.equal(C(un, 'D1').status, 'NOT_COMPLETE');
  assert.match(C(un, 'D1').lines004.find((x) => x.row === 6).why, /not approved/);
});

test('BUDGET · two lines on one room-night, a block too small, an extra bed or a room paid by H&S: never complete, each named', () => {
  const overlap = world({ lines004: [BLOCK27, BLOCK28, { ...BLOCK27, Details: 'Heritage Executive rooms', Qty: 2, 'Budget USD': 300 }, TRAIN, VAN, CHINA] }).out;
  assert.equal(C(overlap, 'D1').status, 'NOT_COMPLETE'); assert.match(C(overlap, 'D1').missing.join(' '), /27\.02\.2031: budget rows 5 and 7 both cover Heritage Executive/);
  const small = world({ lines004: [{ ...BLOCK27, Qty: 2, 'Budget USD': 300 }, BLOCK28, TRAIN, VAN, CHINA] }).out;
  assert.match(C(small, 'D1').missing.join(' '), /27\.02\.2031: 3 rooms booked, budget row 5 holds 2/);
  const bed = world({ booked: (b) => ({ ...b, extraBedIds: ['BK·INV-GC·GC1·D1-EXEC·g1'] }) }).out;
  assert.equal(C(bed, 'D1').status, 'NOT_COMPLETE'); assert.match(C(bed, 'D1').missing.join(' '), /extra bed for GC1 in room B: no supplier cost line/);
  const paid = world({ booked: (b) => ({ ...b, holders: b.holders.map((h) => ({ ...h, lines: h.lines.map((l) => (l.Person_ID === 'GC1' ? { ...l, categoryOverride: { from: 'GUEST_SELF_PAYMENT' } } : l)) })) }) }).out;
  assert.equal(C(paid, 'D1').status, 'NOT_COMPLETE');
  assert.match(C(paid, 'D1').missing.join(' '), /room B \(Heritage Executive\) was booked and paid by H&S: what H&S paid is not stated in Google/);
  assert.equal(C(paid, 'D1').rooms.find((r) => r.label === 'B').lines[0].paidByHSWords, 'booked and paid by H&S; the guest repays the 009 amount');
});

test('BUDGET · a line naming persons is their own place (A-2): never a guest\'s cost or coverage — a billed guest of the same first name is flagged', () => {
  const own = { ...BLOCK27, Item: 'Souphattra Heritage Vientiane, Alex', Details: 'Heritage Executive', Qty: 1, 'Budget USD': 150 };
  const { out } = world({ lines004: [own, TRAIN, VAN, CHINA], names: { persons: { GA1: 'Alex Example', GA2: 'Sam Example' }, holders: { 'INV-GA': 'Alex Example' } } });
  const d1 = C(out, 'D1');
  const x = d1.lines004.find((l) => l.row === 5);
  assert.equal(x.whose, 'PERSON_NAMED'); assert.deepEqual(x.names, ['Alex']); assert.equal(x.usable, false); assert.equal(x.assumption, 'A-2');
  assert.equal(d1.status, 'NOT_COMPLETE'); assert.equal(d1.known.cents, 0, 'the persons\' own line covers no guest\'s night');
  assert.match(d1.checks.map((c) => c.text).join(' '), /Budget row 5 budgets Alex's own place as a host cost; Alex Example \(INV-GA\) is billed for Heritage Executive — possibly paid twice/);
  assert.equal(d1.planned.persons.cents, 15000); assert.equal(d1.planned.guest.cents, 0);
  assert.ok(out.assumptions.some((a) => a.id === 'A-2'));
  assert.equal(d1.rooms[0].lines[0].payerName, 'Alex Example');
});

test('BUDGET · a route: tickets at the 004 rate × the tickets booked, the van as a whole vehicle once — never per person', () => {
  const { out } = world();
  const b = C(out, 'B');
  assert.equal(b.status, 'COMPLETE'); assert.equal(b.tickets, 3);
  assert.deepEqual(b.services.map((s) => [s.service, s.basis, s.unit && s.unit.cents, s.tickets, s.cost.cents]),
    [['Train', 'per ticket', 8000, 3, 24000], ['Van', 'the whole vehicle or booking, as stated', null, 3, 40000]]);
  assert.equal(b.cost.cents, 64000, 'USD 80 × 3 tickets + the van USD 400 once (never USD 400 × 3)');
  assert.equal(b.difference.cents, 30000 - 64000); assert.equal(b.label, 'HOST_COST');
  /* six guests on the same van: its cost does not move */
  const six = world({ bookings: { ...BOOKINGS, 'INV-GD': ['GD1', 'GD2', 'GD3'].map((p) => bk('INV-GD', p, 'B-TRAIN')) } }).out;
  assert.equal(C(six, 'B').services.find((s) => s.service === 'Van').cost.cents, 40000);
  assert.equal(C(six, 'B').services.find((s) => s.service === 'Train').cost.cents, 8000 * 6);
  /* without an approved van line the route is not complete, and says which service is missing */
  const noVan = world({ lines004: [BLOCK27, BLOCK28, TRAIN, CHINA] }).out;
  assert.equal(C(noVan, 'B').status, 'NOT_COMPLETE'); assert.deepEqual(C(noVan, 'B').missing, ['no approved supplier cost for the guests\' van in 004']);
  assert.equal(K(noVan, 'Transportation').differenceAvailable, false);
});

test('BUDGET · "At cost" only where the guest\'s own ticket price equals the stated unit cost; within a cent per ticket a rounding difference', () => {
  const at = C(world().out, 'G');
  assert.equal(at.difference.cents, 0); assert.equal(at.label, 'AT_COST');
  const round = C(world({ lines004: [BLOCK27, BLOCK28, TRAIN, VAN, { ...CHINA, 'Rate USD': 100.01, 'Budget USD': 200.02 }] }).out, 'G');
  assert.equal(round.difference.cents, -2); assert.equal(round.label, 'ROUNDING');
  const more = C(world({ lines004: [BLOCK27, BLOCK28, TRAIN, VAN, { ...CHINA, 'Rate USD': 90, 'Budget USD': 180 }] }).out, 'G');
  assert.equal(more.difference.cents, 2000); assert.equal(more.label, 'SURPLUS'); assert.equal(more.labelText, LABELS.SURPLUS);
});

test('BUDGET · categories: a difference only when every stay or route of it is complete; complete and incomplete parts never added to each other', () => {
  const { out } = world();
  const acc = K(out, 'Accommodation'), tr = K(out, 'Transportation'), sp = K(out, 'Special Items');
  assert.equal(acc.differenceAvailable, true); assert.equal(acc.difference.cents, C(out, 'D1').difference.cents);
  assert.equal(tr.differenceAvailable, true); assert.equal(tr.difference.cents, C(out, 'B').difference.cents + C(out, 'G').difference.cents);
  assert.equal(sp.differenceAvailable, false, 'the temple offering has no supplier line');
  assert.deepEqual(C(out, 'X-TEMPLE').missing, ['no approved supplier cost for X-TEMPLE ("Temple Offering") in 004']);
  assert.equal(sp.complete.cost, null); assert.equal(sp.notComplete.contribution.cents, 1500);
  /* one category complete, one not: the complete one keeps its difference, the other none — and nothing is summed across */
  const mixed = world({ lines004: [BLOCK27, TRAIN, VAN, CHINA] }).out;
  assert.equal(K(mixed, 'Accommodation').differenceAvailable, false); assert.equal(K(mixed, 'Transportation').differenceAvailable, true);
  assert.equal(Object.keys(mixed).includes('difference'), false, 'there is no overall difference');
  /* a budget line that buys no guest service stays under its own 004 category */
  assert.deepEqual(out.noGuestService.map((g) => [g.category, g.lines.map((l) => l.row), g.total.cents]), [['Food & Beverage', [10], 15000]]);
});

test('BUDGET · suppliers: only typed 007 figures count, a payment dated after today is not paid, currencies never converted or added', () => {
  const { out } = world();
  const s = out.suppliers.find((x) => /^Souphattra/.test(x.vendor));
  assert.deepEqual(s.stages, ['D1']); assert.equal(s.contract.cents, 100000); assert.equal(s.contract.currency, 'USD');
  assert.deepEqual(s.converted.map((x) => x.currency), ['THB'], 'the THB total is computed inside 007 — never used');
  assert.deepEqual(s.payments.map((p) => [p.amount.cents, p.counted]), [[25000, true], [25000, false]]);
  assert.match(s.payments[1].why, /after today — not counted as paid/);
  const acc = K(out, 'Accommodation');
  assert.deepEqual(acc.verified.map((m) => [m.currency, m.cents]), [['USD', 100000]]);
  assert.deepEqual(acc.paid.map((m) => [m.currency, m.cents]), [['USD', 25000]]); assert.deepEqual(acc.paidNotCounted.map((m) => [m.currency, m.cents]), [['USD', 25000]]);
  assert.equal(s.contractVsPlan.cents, 100000 - 120000, 'the typed contract against the 004 lines of its stays');
  assert.match(out.currencies, /no approved reporting conversion/);
  /* without the formula read nothing counts as typed */
  const blind = world({ noFormulas: true }).out.suppliers.find((x) => /^Souphattra/.test(x.vendor));
  assert.equal(blind.contract, null); assert.ok(blind.payments.every((p) => !p.counted));
});

test('BUDGET · the sheet\'s own totals checked against its lines; an unreadable 004 or 002 is a named gap, never a cost of 0', () => {
  const { out } = world({ totals: { planned: 1610, contributions: 999 } });
  const checks = out.reconciliation.budget004.checks;
  assert.deepEqual(checks.map((c) => [c.cell, c.equal]), [['A2', true], ['C2', false]]);
  assert.ok(out.checks.some((c) => c.severity === 'data' && /004 C2 states 999\.00; the negative lines \(planned guest contributions\) add up to 580\.00/.test(c.text)));
  assert.equal(out.reconciliation.budget004.actualIsBudget, 7, '"Actual USD" =J<row> is the budget again');
  const gone = buildBudgetComparison({ ...world().input, budget: parseBudget004([['nothing']], []) });
  assert.equal(gone.available, false); assert.match(gone.gap, /004_Budget_Finance: 004 has no header row/);
  const no002 = buildBudgetComparison({ ...world().input, display: parseItemDisplay([['no ids']]) });
  assert.equal(no002.available, false); assert.match(no002.gap, /002_Accommodation_Details/);
});

test('BUDGET · pure: the same input gives the same answer, and the engine\'s lines are never touched', () => {
  const { input } = world();
  const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o)) deepFreeze(v); } return o; };
  const before = JSON.stringify(input.booked);
  deepFreeze(input.booked); deepFreeze(input.budget); deepFreeze(input.vendors); deepFreeze(input.display);
  const a = buildBudgetComparison(input), b = buildBudgetComparison(input);
  assert.deepEqual(a, b); assert.equal(JSON.stringify(input.booked), before);
});

test('BUDGET · the rooming list: a guest billed in another room than the list holds, and a held place nobody bills, are named — never changed', () => {
  const rooms = { ok: true, units: {
    'wedstay/heritage-executive': [{ label: 'A', occupants: [{ guestId: 'GA1' }, { guestId: 'GC1' }] }, { label: 'B', occupants: [{ guestId: 'GX9' }] }],
    'wedstay/grand-majestic': [{ label: 'A', occupants: [{ guestId: 'GB1' }, { guestId: 'GB2' }] }],
  } };
  const t = C(world({ rooms }).out, 'D1').checks.map((c) => c.severity + ': ' + c.text);
  assert.ok(t.includes('data: GA2 is billed in room A (Heritage Executive); the rooming list holds them in no room of it'), t.join('\n'));
  assert.ok(t.includes('data: GC1 is billed in room B (Heritage Executive); the rooming list holds them in room A'));
  assert.ok(t.includes('info: Room B (heritage-executive): the rooming list holds GX9, no counted booking of this stay bills them'));
  assert.match(C(world().out, 'D1').checks.map((c) => c.text).join(' '), /rooming list \(Rooms engine\) could not be read just now/);
});

/* ---------------------------------------------------------------- the independent review's findings (17 Nov 2026) */

test('BUDGET · bookings not counted keep their stay without a difference: a holder set aside names its stays; an unreadable one stops every difference', () => {
  const aside = world({ booked: (b) => ({ ...b, holders: b.holders.map((h) => (h.Holder_ID === 'INV-GC' ? { ...h, gapReason: 'DOUBLE_BOOKING — waiting for the Owners' } : h)) }) }).out;
  const d1 = C(aside, 'D1');
  assert.equal(d1.status, 'NOT_COMPLETE'); assert.equal(d1.difference, null);
  assert.match(d1.missing.join(' '), /the bookings of INV-GC here are not counted \(DOUBLE_BOOKING — waiting for the Owners\) — their contribution is missing/);
  assert.equal(K(aside, 'Accommodation').differenceAvailable, false);
  assert.equal(C(aside, 'B').status, 'COMPLETE', 'a route the set-aside holder never booked keeps its difference');
  const unread = world({ unresolved: [{ Holder_ID: 'INV-GZ', reason: 'not readable' }] }).out;
  assert.ok(unread.centres.filter((c) => c.status !== 'OUTSIDE').every((c) => c.status === 'NOT_COMPLETE' && /not every booking is counted just now \(not readable just now: INV-GZ\)/.test(c.missing.join(' '))));
  assert.ok(unread.categories.every((c) => !c.differenceAvailable));
});

test('BUDGET · every approved block of a stay costs what it states, booked or not; two lines on one night overlap even where nothing is booked', () => {
  const EXEC27 = { ...BLOCK27, Details: 'Heritage Executive rooms', Qty: 2, 'Budget USD': 300 }, EXEC28 = { ...EXEC27, 'Date or period': '28.02-01.03..2031' };
  const MAJ27 = { ...BLOCK27, Details: 'Grand Majestic Suite', 'Rate USD': 250, Qty: 1, 'Budget USD': 250 }, MAJ28 = { ...MAJ27, 'Date or period': '28.02-01.03..2031' };
  const noMaj = { 'INV-GA': BOOKINGS['INV-GA'], 'INV-GC': BOOKINGS['INV-GC'] };
  const d1 = C(world({ bookings: noMaj, lines004: [EXEC27, EXEC28, MAJ27, MAJ28, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.equal(d1.status, 'COMPLETE');
  assert.equal(d1.cost.cents, 30000 + 30000 + 25000 + 25000, 'the unbooked Grand Majestic Suite costs its block too');
  assert.deepEqual(d1.usedRows, [5, 6, 7, 8]);
  assert.ok(d1.notBooked.some((n) => n.row === 7 && n.rooms === 1 && n.booked === 0));
  /* an "All Categories" block and a Grand Majestic block on the same night: an overlap, though no Grand Majestic room is booked */
  const both = C(world({ bookings: noMaj, lines004: [BLOCK27, BLOCK28, MAJ27, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.equal(both.status, 'NOT_COMPLETE'); assert.match(both.missing.join(' '), /27\.02\.2031: budget rows 5 and 7 both cover Grand Majestic Suite/);
});

test('BUDGET · a route\'s label follows its difference: never "At cost" at a difference, never "At cost" when ticket prices differ', () => {
  const zeroOne = (b) => ({ ...b, holders: b.holders.map((h) => ({ ...h, lines: h.lines.map((l) => (l.Item_ID === 'G-TRAIN' && l.Person_ID === 'GB1' ? { ...l, amountCents: 0 } : l)) })) });
  const g1 = C(world({ booked: zeroOne }).out, 'G');
  assert.equal(g1.difference.cents, -10000); assert.equal(g1.label, 'HOST_COST', 'the unit price equals the cost, the charge does not');
  const split = (b) => ({ ...b, holders: b.holders.map((h) => ({ ...h, lines: h.lines.map((l) => (l.Item_ID !== 'G-TRAIN' ? l : l.Person_ID === 'GA1' ? { ...l, rateCents: 11000, amountCents: 11000 } : { ...l, rateCents: 9000, amountCents: 9000 })) })) });
  const g2 = C(world({ booked: split }).out, 'G');
  assert.equal(g2.difference.cents, 0); assert.equal(g2.label, null); assert.equal(g2.labelText, null);
  assert.match(g2.checks.map((c) => c.text).join(' '), /ticket prices differ from the 004 unit cost \(100\.00\) — not called "At cost"/);
  const cat = K(world({ booked: split, lines004: [BLOCK27, BLOCK28, TRAIN, { ...VAN, 'Rate USD': 60, 'Budget USD': 60 }, CHINA] }).out, 'Transportation');
  assert.equal(cat.difference.cents, 0); assert.equal(cat.label, null, 'a category at 0 with a route not at cost is not "At cost"');
});

test('BUDGET · a category never shows a difference of its complete part alone; refused readings are said, not guessed', () => {
  const mixed = K(world({ lines004: [BLOCK27, BLOCK28, TRAIN, CHINA] }).out, 'Transportation');
  assert.equal(mixed.differenceAvailable, false); assert.deepEqual(mixed.complete.centres, ['G']);
  assert.equal('difference' in mixed.complete, false); assert.equal('label' in mixed.complete, false);
  const { out } = world({ lines004: [BLOCK27, BLOCK28, TRAIN, VAN, CHINA, { ...CAKE, Category: 'Accommodation', Item: 'Souphattra Heritage Vientiane', 'Rate USD': -50, 'Budget USD': 100 },
    { ...TRAIN, 'Suthep approval': 'pending', 'Date or period': '24.02.2031' }, { ...VAN, Currency: 'THB' }] });
  assert.match(out.checks.map((c) => c.text).join(' '), /Budget row 10 \(Souphattra Heritage Vientiane\): Rate USD -50 and Budget USD 100 disagree in sign/);
  const b = C(out, 'B');
  assert.equal(b.lines004.find((x) => x.row === 11).approved, false); assert.match(b.lines004.find((x) => x.row === 11).why, /approval entry "pending" is not the sheet's "Approve by …"/);
  /* a line in another currency enters no USD figure: not on the route, not in its planned cost — said apart */
  assert.equal(b.lines004.some((x) => x.row === 12), false); assert.equal(b.planned.all.cents, 24000 + 40000 + 24000, 'rows 7, 8 and 11 — never the THB row 12');
  assert.match(out.checks.map((c) => c.text).join(' '), /Budget row 12 \(Nong Khai - Souphattra\): its Currency is THB — never converted, in no USD figure/);
  const two = buildBudgetComparison({ ...world().input, items: { ...ITEMS, 'B-VAN': { ...ITEMS['B-TRAIN'], Item_ID: 'B-VAN' } },
    display: parseItemDisplay(GRID002.map((r) => (r[0] === 'Item_ID' ? [...r, 'B-VAN'] : r[0] === 'Package' ? [...r, 'B'] : r[0] === 'Category' ? [...r, 'Transportation'] : r[0] === 'Check In Date' ? [...r, '24.02.2031'] : r[0] === 'Check Out Date' ? [...r, '25.02.2031'] : r))) });
  assert.match(C(two, 'B').missing.join(' '), /the route has 2 products \(B-TRAIN, B-VAN\): its tickets cannot be counted per service/);
});

test('BUDGET · only the sheet\'s own approval entry approves; a gap of the booked figure no holder explains stops every difference; a category of rounding is rounding', () => {
  for (const [text, ok] of [['Approve by Suthep, 29.09.2030', true], ['Approved by Suthep', true], ['Awaiting approval', false], ['Unapproved', false],
    ['To be approved', false], ['Approval requested', false], ['Disapproved', false], ['OK', false]]) {
    const x = C(world({ lines004: [{ ...BLOCK27, 'Suthep approval': text }, BLOCK28, TRAIN, VAN, CHINA] }).out, 'D1').lines004.find((l) => l.row === 5);
    assert.equal(x.approved, ok, text);
  }
  const aside = (b) => ({ ...b, holders: b.holders.map((h) => (h.Holder_ID === 'INV-GC' ? { ...h, gapReason: 'MANUAL_REVIEW' } : h)) });
  const more = world({ booked: aside, bookedRevenue: { cents: 1, complete: false, gaps: [{ Holder_ID: 'INV-GC', reason: 'MANUAL_REVIEW' }, { reason: 'the breakdown does not add up' }] } }).out;
  assert.equal(C(more, 'B').status, 'NOT_COMPLETE', 'a gap no set-aside holder explains reaches every route too');
  assert.match(C(more, 'B').missing.join(' '), /not every booking is counted just now/);
  const only = world({ booked: aside, bookedRevenue: { cents: 1, complete: false, gaps: [{ Holder_ID: 'INV-GC', reason: 'MANUAL_REVIEW' }] } }).out;
  assert.equal(C(only, 'B').status, 'COMPLETE', 'a gap the set-aside holder explains stays with its own stays');
  const rounding = K(world({ lines004: [BLOCK27, BLOCK28, { ...TRAIN, 'Rate USD': 100, 'Budget USD': 300 }, { ...VAN, 'Rate USD': 0, 'Budget USD': 0 }, { ...CHINA, 'Rate USD': 100.01, 'Budget USD': 200.02 }] }).out, 'Transportation');
  assert.equal(rounding.difference.cents, -2); assert.equal(rounding.label, 'ROUNDING');
});
