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
  const g = o.grid004 || grid004(lines, o.totals);
  const input = {
    asOf: ASOF, booked: o.booked ? o.booked(ov.bookedLines) : ov.bookedLines, items, display: parseItemDisplay(o.grid002 || GRID002),
    budget: parseBudget004(g, o.noFormulas ? null : (o.formulas004 || FORMULAS)(g)), vendors: parseVendors007(o.v7 || V7, o.noFormulas ? null : (o.f7 || F7)),
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
  assert.match(out.currencies, /own currency; a USD equivalent at the Owners' reporting reference rates .* labelled/);
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

test('BUDGET · THE OWNERS\' ASSIGNMENT (18 Nov 2026): a guest billed in room B whom the Owners placed in room A of the same category is the same booking — said as info, never a data warning; every amount stays what it was', () => {
  const base = { ok: true, units: { 'wedstay/heritage-executive': [{ label: 'A', occupants: [{ guestId: 'GA1' }] }, { label: 'B', occupants: [] }], 'wedstay/grand-majestic': [{ label: 'A', occupants: [{ guestId: 'GB1' }, { guestId: 'GB2' }] }] } };
  const placed = JSON.parse(JSON.stringify(base)); placed.units['wedstay/heritage-executive'][0].occupants.push({ guestId: 'GC1', placedFrom: ['B'], by: 'owners:BRIDE' });
  const unplaced = JSON.parse(JSON.stringify(base)); unplaced.units['wedstay/heritage-executive'][0].occupants.push({ guestId: 'GC1' });
  const p = world({ rooms: placed }).out, u = world({ rooms: unplaced }).out;
  const t = C(p, 'D1').checks.map((c) => c.severity + ': ' + c.text);
  assert.ok(t.includes('info: GC1 is billed in room B (Heritage Executive); the Owners placed them in room A of the same category — the booking and its amounts are unchanged'), t.join('\n'));
  assert.ok(!t.some((x) => /^data: GC1 is billed in room B/.test(x)));
  assert.ok(C(u, 'D1').checks.some((c) => c.severity === 'data' && /GC1 is billed in room B/.test(c.text)), 'without the Owners\' placement it stays a data warning');
  assert.equal(C(p, 'D1').contribution.cents, C(u, 'D1').contribution.cents); assert.equal(C(p, 'D1').cost.cents, C(u, 'D1').cost.cents);
  assert.equal(p.reconciliation.contributions.cents, u.reconciliation.contributions.cents);
  const occ = p.roomPlan.find((s) => s.stay === 'D1').rooms.find((r) => r.key === 'wedstay/heritage-executive' && r.label === 'A').occupants.find((o) => o.guestId === 'GC1');
  assert.deepEqual(occ.placedFrom, ['B'], 'the room overview names where the booking was made');
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

/* ---- billing-budget/1.1.0 (Owners, 17 Nov 2026): the review of the Souphattra figures — why a 007 total and its 004 lines
   differ, what is still owed, why a sheet total differs from its lines. Nothing excluded, split, re-priced or explained by an
   inferred figure (independent review + pricing guard conditions 1–4). ---- */
const PAIR = { ...BLOCK28, Details: 'All Categories Rooms (Alex + Sam)', Qty: 1, 'Budget USD': 150 };
const SOUP = (out) => out.suppliers.find((v) => /^Souphattra/.test(v.vendor));

test('BUDGET 1.1 · a room line inside a block of every room of the stay is named as possibly counted twice (A-5) — never dropped, never split', () => {
  const { out } = world({ lines004: [BLOCK27, BLOCK28, PAIR, TRAIN, VAN, CHINA] });
  const d1 = C(out, 'D1');
  const x = d1.lines004.find((l) => l.row === 7);
  assert.equal(x.whose, 'PERSON_NAMED');
  assert.deepEqual(x.insideBlock, { rows: [6], nights: ['2031-02-28'], wholly: true });
  assert.match(x.notes.join(' '), /inside budget row 6 on 28\.02\.2031 — row 6 buys all 4 rooms of this stay \(A-5\): possibly counted twice/);
  assert.deepEqual([d1.possibleDuplicates.rows, d1.possibleDuplicates.amount.cents, d1.possibleDuplicates.partlyRows], [[7], 15000, []]);
  assert.equal(d1.planned.all.cents, 60000 + 60000 + 15000, 'the sums stay 004 as stated — the line is named, not removed');
  assert.equal(d1.status, 'COMPLETE', 'a named line of named persons changes no coverage');
  assert.ok(d1.checks.some((c) => c.severity === 'data' && /^Budget row 7 \(USD 150\.00\) budgets a room inside budget row 6 on 28\.02\.2031 — row 6 buys all 4 rooms of this stay \(A-5\): possibly counted twice$/.test(c.text)));
  assert.deepEqual([K(out, 'Accommodation').possibleDuplicates.rows, K(out, 'Accommodation').possibleDuplicates.amount.cents], [[7], 15000]);
  assert.deepEqual([SOUP(out).possibleDuplicates.rows, SOUP(out).possibleDuplicates.amount.cents], [[7], 15000]);
  assert.ok(out.assumptions.some((a) => a.id === 'A-5'));
  /* its own cells disagree on its nights (period 1 night, "Nights, Rooms, EA" 2): named, NO amount — the conflict is never settled here */
  const odd = C(world({ lines004: [BLOCK27, BLOCK28, { ...PAIR, 'Nights, Rooms, EA': 2, 'Budget USD': 300 }, TRAIN, VAN, CHINA] }).out, 'D1');
  const o = odd.lines004.find((l) => l.row === 7);
  assert.deepEqual(o.insideBlock, { rows: [6], nights: ['2031-02-28'], wholly: false });
  assert.match(o.notes.join(' '), /by its period inside budget row 6 on 28\.02\.2031; its own cells disagree on its nights — what of it row 6 already buys is not stated \(A-5\)/);
  assert.deepEqual([odd.possibleDuplicates.rows, odd.possibleDuplicates.amount, odd.possibleDuplicates.partlyRows], [[], null, [7]]);
  assert.doesNotMatch(odd.checks.map((c) => c.text).join(' '), /USD 300\.00\) budgets a room/, 'no amount put on a line whose cells disagree');
  const oddOut = world({ lines004: [BLOCK27, BLOCK28, { ...PAIR, 'Nights, Rooms, EA': 2, 'Budget USD': 300 }, TRAIN, VAN, CHINA] }).out;
  for (const d of [K(oddOut, 'Accommodation').possibleDuplicates, SOUP(oddOut).possibleDuplicates]) assert.deepEqual([d.rows, d.amount, d.partlyRows], [[], null, [7]]);
  const supText = oddOut.checks.find((c) => /^Souphattra Heritage Vientiane: the typed 007 total/.test(c.text)).text;
  assert.match(supText, /; row 7 possibly inside row 6$/); assert.doesNotMatch(supText, /row 7 \(USD/, 'no amount for it at the supplier either');
  /* a block of every room typed twice (the copy unapproved), and an approved line inside an unapproved block: both named, no amount */
  const twice = C(world({ lines004: [BLOCK27, { ...BLOCK27, 'Suthep approval': '' }, BLOCK28, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.deepEqual([twice.possibleDuplicates.rows, twice.possibleDuplicates.amount, twice.possibleDuplicates.partlyRows], [[], null, [5, 6]]);
  assert.match(twice.checks.map((c) => c.text).join(' '), /Budget row 6 is a second block of every room of this stay on 27\.02\.2031 beside budget row 5 — one of them possibly counted twice; which one is not stated \(A-5\)/);
  assert.equal(twice.planned.all.cents, 180000, 'the sum stays as 004 states it — named, not taken out');
  const twiceOut = world({ lines004: [BLOCK27, { ...BLOCK27, 'Suthep approval': '' }, BLOCK28, TRAIN, VAN, CHINA] }).out;
  const twiceText = twiceOut.checks.find((c) => /^Souphattra Heritage Vientiane: the typed 007 total/.test(c.text)).text;
  assert.match(twiceText, /; rows 5 and 6 are two blocks of every room on 27\.02\.2031 — which one is counted twice is not stated$/);
  assert.doesNotMatch(twiceText, /possibly inside/, 'said once, never circularly');
  const inUnapproved = C(world({ lines004: [{ ...BLOCK27, 'Suthep approval': '' }, { ...BLOCK27, Details: 'Heritage Executive rooms', Qty: 3, 'Budget USD': 450 }, BLOCK28, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.deepEqual(inUnapproved.lines004.find((l) => l.row === 6).insideBlock, { rows: [5], nights: ['2031-02-27'], wholly: true });
  /* partly inside: named, its amount never split or attributed */
  const part = C(world({ lines004: [BLOCK28, { ...PAIR, 'Date or period': '27.02-01.03..2031', 'Nights, Rooms, EA': 2, 'Budget USD': 300 }, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.deepEqual(part.lines004.find((l) => l.row === 6).insideBlock, { rows: [5], nights: ['2031-02-28'], wholly: false });
  assert.match(part.lines004.find((l) => l.row === 6).notes.join(' '), /partly inside budget row 5 \(28\.02\.2031\) — the rest of it is not/);
  assert.deepEqual([part.possibleDuplicates.rows, part.possibleDuplicates.amount, part.possibleDuplicates.partlyRows], [[], null, [6]]);
  /* inside two whole-hotel blocks, night by night */
  const two = C(world({ lines004: [BLOCK27, BLOCK28, { ...PAIR, 'Date or period': '27.02-01.03..2031', 'Nights, Rooms, EA': 2, 'Budget USD': 300 }, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.deepEqual(two.lines004.find((l) => l.row === 7).insideBlock, { rows: [5, 6], nights: ['2031-02-27', '2031-02-28'], wholly: true });
  assert.equal(two.possibleDuplicates.amount.cents, 30000);
  /* a block holding fewer rooms than the stay's 002 quotas does not buy every room: nothing is named */
  const smaller = C(world({ lines004: [{ ...BLOCK27, Qty: 3, 'Budget USD': 450 }, { ...BLOCK28, Qty: 3, 'Budget USD': 450 }, PAIR, TRAIN, VAN, CHINA] }).out, 'D1');
  assert.equal(smaller.possibleDuplicates, null); assert.equal(smaller.lines004.find((l) => l.row === 7).insideBlock, null);
  assert.equal(world().out.centres.every((c) => c.possibleDuplicates == null), true, 'nothing to name in the plain world');
  assert.equal(world().out.assumptions.some((a) => a.id === 'A-5'), false);
});

test('BUDGET 1.1 · a named person booked at no charge is said so — never "paid twice" — in ONE check with the block the line lies in', () => {
  const casey = { Holder_ID: 'INV-GC', Person_ID: 'GC1', Item_ID: 'D1-EXEC', Rate_Per_Person_Night: 0, Nights_Rule: '2', Rate_Status: 'ACTIVE', Approved_By: 'H&S' };
  const { out } = world({ lines004: [BLOCK27, BLOCK28, { ...PAIR, Details: 'All Categories Rooms (Casey + Dana)' }, TRAIN, VAN, CHINA], specialRates: [casey],
    names: { persons: { GC1: 'Casey Example', GA1: 'Alex Example', GA2: 'Sam Example' }, holders: { 'INV-GC': 'Casey Example', 'INV-GA': 'Alex Example' } } });
  const texts = C(out, 'D1').checks.map((c) => c.text).filter((t) => /^Budget row 7 /.test(t));
  assert.equal(texts.length, 1, 'one check for the line');
  assert.match(texts[0], /^Budget row 7 budgets Casey's own place as a host cost; Casey Example \(INV-GC\) is booked for Heritage Executive at no charge \(009 rate 0\) — what the hosts pay for it may be counted twice; the line is inside budget row 6 on 28\.02\.2031 — row 6 buys all 4 rooms of this stay \(A-5\): possibly counted twice$/);
});

test('BUDGET 1.1 · a supplier\'s 007 total beside its 004 lines: what 007 cannot say, the lines possibly counted twice — the difference itself unchanged and never explained by an inferred figure', () => {
  const { out } = world({ lines004: [BLOCK28, PAIR, TRAIN, VAN, CHINA] });
  const s = SOUP(out);
  assert.equal(s.contractVsPlan.cents, 100000 - (60000 + 15000), 'the arithmetic is unchanged — the 007 typed total less the 004 lines as stated');
  assert.deepEqual(s.stays, [{ stage: 'D1', uncovered: [{ night: '2031-02-27', items: ['Grand Majestic Suite', 'Heritage Executive'], others: [] }] }]);
  const t = out.checks.find((c) => c.severity === 'data' && /^Souphattra Heritage Vientiane: the typed 007 total/.test(c.text)).text;
  assert.equal(t, 'Souphattra Heritage Vientiane: the typed 007 total is USD 1000.00; the 004 lines of its stays (rows 5, 6) add up to USD 750.00 — 007 does not say what its total covers; row 6 (USD 150.00) lies inside row 5 — possibly counted twice');
  assert.doesNotMatch(t, /not a cost|explain|missing cost/i);
  assert.deepEqual(SOUP(world().out).stays, [{ stage: 'D1', uncovered: [] }], 'every night of its stays covered: none named');
});

function withA2() {
  const items = { ...ITEMS, 'A2-UST': { Item_ID: 'A2-UST', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 70,
    Quota: 3, Quota_Unit: 'ROOM', Max_Pax: 2, Currency: 'USD', Site_Product_Key: 'bangkok/u-sathorn', 'Number of Nights': 2 } };
  const grid002 = GRID002.map((r) => ({ Item_ID: [...r, 'A2-UST'], Name: [...r, 'Deluxe Room'], Room: [...r, 'Deluxe Room'], 'Check In Date': [...r, '21.02.2031'],
    'Check Out Date': [...r, '23.02.2031'], 'Number of Nights': [...r, 2], 'Rooms available': [...r, ''], Package: [...r, 'A2'], Category: [...r, 'Accommodation'] }[r[0]] || r));
  const bookings = { ...BOOKINGS, 'INV-GA': [...BOOKINGS['INV-GA'], { ...bk('INV-GA', 'GA1', 'D1-EXEC', 'A'), Booking_ID: 'BK·INV-GA·GA1·A2-UST·g1', Item_ID: 'A2-UST', Room_Unit_ID: 'RU·A2-UST·A', Nights: 2 }] };
  return { items, grid002, bookings };
}
test('BUDGET 1.1 · the nights no approved 004 line covers name the lines that do cover them and why they do not count (a stay whose rule says no "whose")', () => {
  const ust = { Item: 'U Sathorn Bangkok', Vendor: 'Hotel', Category: 'Accommodation', Details: '21-23.02.2031', 'Rate USD': 100, Qty: 1, 'Nights, Rooms, EA': 2, 'Budget USD': 200,
    'Date or period': '21-23.02.2031', Currency: 'USD', 'Suthep approval': OK };
  const { out } = world({ ...withA2(), lines004: [BLOCK27, BLOCK28, TRAIN, VAN, CHINA, ust] });
  const a2 = C(out, 'A2');
  assert.equal(a2.status, 'NOT_COMPLETE');
  assert.deepEqual(a2.uncovered.map((u) => [u.night, u.items, u.others.map((x) => [x.row, x.why])]), [
    ['2031-02-21', ['Deluxe Room'], [[10, 'does not say whose place it is — a question for the Owners']]],
    ['2031-02-22', ['Deluxe Room'], [[10, 'does not say whose place it is — a question for the Owners']]]]);
});

test('BUDGET 1.1 · outstanding = the typed total less the payments counted — stated only when every payment 007 records counts and every cell of its column is read', () => {
  const v7of = (rows) => ({ v7: rows, f7: rows.map((r, i) => r.map((c, j) => (i === 2 && j === 1 ? '=B4*33.25' : c))) });
  /* one payment dated after today: what is owed is not stated — the payment is named, never deducted, never re-dated */
  const { out } = world();
  const s = SOUP(out);
  assert.equal(s.outstanding, null); assert.equal(s.paidAbove, null);
  assert.equal(s.outstandingWhy, 'payment B15 recorded in 007 but not counted (dated 03.09.2031, after today — not counted as paid)');
  assert.deepEqual(s.notCounted.map((m) => [m.currency, m.cents]), [['USD', 25000]]);
  assert.deepEqual(K(out, 'Accommodation').outstanding, []); assert.deepEqual(K(out, 'Accommodation').outstandingNotStated, ['Souphattra Heritage Vientiane']);
  /* every payment counted: USD 1,000 less USD 500 */
  const paid = world(v7of(V7.map((r) => (r[0] === 'Payment Date' && r[1] === '03.09.2031' ? ['Payment Date', '01.10.2030'] : r)))).out;
  assert.deepEqual([SOUP(paid).outstanding.currency, SOUP(paid).outstanding.cents], ['USD', 50000]); assert.equal(SOUP(paid).outstandingWhy, null);
  assert.deepEqual(K(paid, 'Accommodation').outstanding.map((m) => [m.currency, m.cents]), [['USD', 50000]]); assert.deepEqual(K(paid, 'Accommodation').outstandingNotStated, []);
  /* more paid than the total: said as paid above it, never a negative balance */
  const above = world(v7of(V7.map((r) => (r[0] === 'Payment Date' && r[1] === '03.09.2031' ? ['Payment Date', '01.10.2030'] : r[0] === 'Ben USD' ? ['Ben USD', 900] : r)).map((r, i, all) => (r[0] === 'Paid Amount' && all[i - 1][0] === 'Ben USD' ? ['Paid Amount', 900] : r)))).out;
  assert.equal(SOUP(above).outstanding, null); assert.deepEqual([SOUP(above).paidAbove.currency, SOUP(above).paidAbove.cents], ['USD', 15000]);
  assert.deepEqual(K(above, 'Accommodation').paidAbove.map((m) => m.cents), [15000]); assert.deepEqual(K(above, 'Accommodation').outstandingNotStated, []);
  /* a cell of its column under a row 007 does not label — or a stated balance row, never read as a payer — nothing is stated */
  for (const label of ['Remark', 'Balance USD', 'Outstanding THB', 'Amount due USD']) {
    const odd = world(v7of([...V7, [label, 500]])).out;
    assert.equal(SOUP(odd).outstanding, null, label); assert.match(SOUP(odd).outstandingWhy, /^007 row 18 of its column is not read$/, label);
    assert.equal(SOUP(odd).payments.length, 2, label + ' is no payment block');
    assert.ok(odd.checks.some((c) => new RegExp('007 row 18 \\("' + label + '"\\) has no known label').test(c.text)), label + ' is named');
  }
  /* a payment in another currency than the total: never converted, nothing stated */
  const thb = world(v7of(V7.map((r) => (r[0] === 'Ann USD' ? ['Ann THB', 8312.5] : r[0] === 'Payment Date' && r[1] === '03.09.2031' ? ['Payment Date', '01.10.2030'] : r))
    .map((r, i, all) => (r[0] === 'Paid Amount' && all[i - 1][0] === 'Ann THB' ? ['Paid Amount', 8312.5] : r)))).out;
  assert.deepEqual(SOUP(thb).payments.map((p) => [p.amount.currency, p.counted]), [['THB', true], ['USD', true]]);
  assert.equal(SOUP(thb).outstanding, null); assert.match(SOUP(thb).outstandingWhy, /^a payment is in another currency than the total — never converted$/);
  /* a "Balance USD" row ends the payer block above it: the payment below it is nobody's block, never the last payer's */
  const bal = SOUP(world(v7of([...V7, ['Balance USD', 500], ['Paid Amount', 500], ['Payment Date', '01.10.2030']])).out);
  assert.equal(bal.payments.length, 3); assert.equal(bal.payments[2].block, null); assert.equal(bal.outstanding, null);
  /* two suppliers of one category: while one has no stated figure, the category states none — never a partial sum */
  const a2 = withA2();
  const two7 = (rows) => rows.map((r) => (!r.length ? r : r[0] === 'Vendor' ? [...r, 'U Sathorn Bangkok'] : r[0] === 'Category' ? [...r, 'Hotel'] : r[0] === 'Total Price USD' ? [...r, 300] : [...r, '']));
  const both = world({ ...a2, lines004: [BLOCK27, BLOCK28, TRAIN, VAN, CHINA], v7: two7(V7), f7: two7(V7).map((r, i) => r.map((c, j) => (i === 2 && j === 1 ? '=B4*33.25' : c))) }).out;
  assert.deepEqual([both.suppliers.find((v) => /^U Sathorn/.test(v.vendor)).outstanding.cents, SOUP(both).outstanding], [30000, null]);
  assert.deepEqual(K(both, 'Accommodation').outstanding, [], 'U Sathorn alone is no category figure');
  assert.deepEqual(K(both, 'Accommodation').outstandingNotStated, ['Souphattra Heritage Vientiane']);
  const allPaid = two7(V7.map((r) => (r[0] === 'Payment Date' && r[1] === '03.09.2031' ? ['Payment Date', '01.10.2030'] : r)));
  const both2 = world({ ...a2, lines004: [BLOCK27, BLOCK28, TRAIN, VAN, CHINA], v7: allPaid, f7: allPaid.map((r, i) => r.map((c, j) => (i === 2 && j === 1 ? '=B4*33.25' : c))) }).out;
  assert.deepEqual(K(both2, 'Accommodation').outstanding.map((m) => [m.currency, m.cents]), [['USD', 50000 + 30000]]);
  assert.match(SOUP(world({ v7: V7.map((r) => (r[0] === 'Total Price THB' ? ['Total Price THB', 33250] : r)), f7: V7 }).out).outstandingWhy, /^typed in USD and THB — no single total$/);
  /* no typed total: nothing owed can be stated */
  assert.match(SOUP(world({ noFormulas: true }).out).outstandingWhy, /^no typed contract total$/);
});

test('BUDGET 1.1 · a sheet total that differs from its lines names its formula\'s range only when the rows outside it are the difference; NET HOST COST carries it', () => {
  const lines = [BLOCK27, BLOCK28, TRAIN, VAN, CHINA, CAKE, PLAN];   /* rows 5–11: CAKE row 10, PLAN row 11 */
  const g = [['TOTAL PLANNED BUDGET', '', 'GUEST CONTRIBUTIONS', 'GROSS PROJECT COST', 'NET HOST COST'], [1610, '', 580, 2040, 1460], [], HEAD, ...lines.map(L)];
  const withRow2 = (row2) => (x) => FORMULAS(x).map((r, i) => (i === 1 ? row2 : r));
  const w = world({ grid004: g, formulas004: withRow2(['=SUM(J5:J11)', '', '=ABS(SUMIF(J5:J11, "<0"))', '=SUMIF($J$5:$J$9, ">0")', '=D2-C2']) });
  assert.equal(w.input.budget.totals.grossCostFormula, '=SUMIF($J$5:$J$9, ">0")');
  const ck = w.out.reconciliation.budget004.checks;
  assert.deepEqual(ck.map((c) => [c.cell, c.equal]), [['A2', true], ['D2', false], ['C2', true], ['E2', false]]);
  const gross = ck.find((c) => c.cell === 'D2');
  assert.equal(gross.sheet.cents, 204000, 'the cell as stated'); assert.deepEqual(gross.range, { from: 5, to: 9 });
  assert.deepEqual(gross.outside.map((x) => [x.row, x.amount.cents]), [[10, 15000]]);
  assert.deepEqual(ck.find((c) => c.cell === 'E2').carries, ['D2']);
  const texts = w.out.checks.map((c) => c.text).join('\n');
  assert.match(texts, /^004 D2 states 2040\.00; the positive lines add up to 2190\.00 — its formula sums rows 5–9; row 10 \(150\.00\) lies outside it$/m);
  assert.match(texts, /^004 E2 states 1460\.00; the positive lines less the planned guest contributions add up to 1610\.00 — E2 is =D2-C2 and carries D2's difference$/m);
  /* two ranges, a criteria range in another column, a range in another column, or no formula read: the plain sentence, nothing guessed */
  for (const f of ['=SUM(J5:J8)+SUM(J9:J9)', '=SUMIF(P5:P9, "x", J5:J9)', '=SUM(K5:K9)', '=D2']) {
    const o = world({ grid004: g, formulas004: withRow2(['=SUM(J5:J11)', '', '=ABS(SUMIF(J5:J11, "<0"))', f, '=D2-C2']) }).out;
    assert.equal(o.reconciliation.budget004.checks.find((c) => c.cell === 'D2').range, null, f);
    assert.match(o.checks.map((c) => c.text).join('\n'), /^004 D2 states 2040\.00; the positive lines add up to 2190\.00$/m, f);
  }
  const g2 = g.map((r, i) => (i === 1 ? [1610, '', 580, 2000, 999] : r));
  const off = world({ grid004: g2, formulas004: withRow2(['=SUM(J5:J11)', '', '=ABS(SUMIF(J5:J11, "<0"))', '=SUMIF($J$5:$J$9, ">0")', '=D2-C2-461']) }).out.reconciliation.budget004.checks;
  assert.equal(off.find((c) => c.cell === 'D2').range, null, 'row 10 (150) is not the difference of 190 — nothing named');
  assert.equal(off.find((c) => c.cell === 'E2').carries, null, 'E2 is out by 611, D2 by 190 — no carry claimed');
  const spur = world({ grid004: g, formulas004: withRow2(['=SUM(J5:J11)', '', '=ABS(SUMIF(J5:J11, "<0"))', '=SUMIF($J$5:$J$9, ">0")', '=SUMIF(D20:D30,"x")+1']) }).out.reconciliation.budget004.checks;
  assert.equal(spur.find((c) => c.cell === 'E2').carries, null, 'D20:D30 is no reference to D2');
  const blind = world({ grid004: g, noFormulas: true });
  assert.equal(blind.input.budget.totals.grossCostFormula, null); assert.equal(blind.out.reconciliation.budget004.checks.find((c) => c.cell === 'D2').range, null);
});

/* ---- THE FINANCIAL DASHBOARD (Owners, 17 Nov 2026): 004 gross costs, the forecast with a confirmed whole-contract supplier,
   007 commitments, the Revenue Report's paying-guest revenue and the owner-funded position — derived, nothing written ---- */
const REV = (invoiced, booked, extra) => ({ invoiced: { cents: invoiced, complete: true }, booked: { cents: booked, complete: true },
  notYetInvoiced: { cents: Math.max(0, booked - invoiced) }, changedSinceIssue: { cents: Math.min(0, booked - invoiced) }, invoicedNotBooked: { cents: 0 }, ...(extra || {}) });
test('DASHBOARD · costs are 004 gross (never reduced by revenue); the forecast takes the whole hotel contract in place of its stays\' lines; the position follows invoiced and expected revenue', () => {
  const w = world();
  const out = buildBudgetComparison({ ...w.input, revenue: REV(30000, 45000) });
  const D = out.dashboard, gross = { lines: out.reconciliation.grossLines };
  const positive = out.centres.flatMap((c) => c.lines004).concat(out.noGuestService.flatMap((x) => x.lines)).filter((l) => l.budget.cents > 0);
  assert.equal(D.costs.original.cents, gross.lines.cents, 'original = every positive 004 line');
  assert.ok(D.costs.original.cents >= positive.reduce((t, l) => t + l.budget.cents, 0) - 0, 'never less than the positive lines the comparison places');
  /* the Owners' order (18 Nov 2026): the agreement's hotel is never replaced by its 007 total — without the room plan nothing is added,
     004 stays as written and the report names the gap */
  assert.ok(SOUP(out).coversAll); assert.equal(D.costs.adjustments.length, 0, 'no room plan: no hotel adjustment');
  assert.equal(D.costs.forecast.cents, gross.lines.cents);
  assert.ok(out.report.forecastGaps.some((g) => /purchase costs could not be set beside 004/.test(g.text)), 'the missing room plan is a named gap');
  assert.equal(D.costs.variance.cents, D.costs.forecast.cents - D.costs.original.cents);
  assert.deepEqual([D.revenue.invoiced.cents, D.revenue.expectedTotal.cents, D.revenue.expectedNotYetInvoiced.cents], [30000, 45000, 15000], 'invoiced counted once inside the expected total');
  assert.deepEqual([D.position.stated, D.position.currentOwnerFunded.cents, D.position.projectedOwnerFunded.cents], [true, D.costs.forecast.cents - 30000, D.costs.forecast.cents - 45000]);
  assert.equal(D.position.coverageInvoiced, Math.round((30000 / D.costs.forecast.cents) * 1000) / 10);
  assert.ok(D.costs.plannedContributionsNote && /never counted twice/.test(D.costs.plannedContributionsNote), '004\'s planned contributions are a plan only');
  /* an incomplete Revenue Report states no position */
  const half = buildBudgetComparison({ ...w.input, revenue: { ...REV(30000, 45000), booked: { cents: 45000, complete: false } } }).dashboard;
  assert.deepEqual([half.position.stated, half.revenue.invoiced], [false, null]);
  /* with the room plan: the agreement's rooms (4 here, 2 nights) against 004's two blocks of one night each — held, nothing added */
  const rooms = { ok: true, units: {
    'wedstay/heritage-executive': [{ label: 'A', occupants: [{ guestId: 'GA1' }, { guestId: 'GA2' }] }, { label: 'B', occupants: [{ guestId: 'GC1' }] }, { label: 'C', occupants: [] }],
    'wedstay/grand-majestic': [{ label: 'A', occupants: [{ guestId: 'GB1' }, { guestId: 'GB2' }] }] } };
  const withRooms = buildBudgetComparison({ ...world({ rooms }).input, revenue: REV(30000, 45000) });
  const hp = withRooms.report.purchase, a0 = withRooms.dashboard.costs.adjustments[0];
  assert.deepEqual([hp.available, hp.totals.contract.cents, hp.recorded.contract.cents, hp.notIn004.cents], [true, 4 * 2 * 15000, 120000, 0]);
  assert.deepEqual(hp.rows004.map((r) => r.role), ['CONTRACT', 'CONTRACT'], 'one block per night');
  assert.deepEqual([a0.basis, a0.difference.cents, withRooms.dashboard.costs.forecast.cents], ['BOOKINGS', 0, withRooms.reconciliation.grossLines.cents]);
  assert.ok(withRooms.report.exceptions.some((e) => /the agreement buys 26 rooms, the room plan holds 4/.test(e.text)), 'the agreement\'s own count against the plan');
  assert.equal(withRooms.roomPlan.find((p) => p.stay === 'D1').rooms.find((u) => u.label === 'C').hotelCostBasis, 'CONTRACT', 'an empty room the agreement buys');
  /* a set row keeps every check that is not a "counted twice" reading: the 002 quota check of a block of 5 rooms stays */
  const five = buildBudgetComparison({ ...world({ rooms, lines004: [{ ...BLOCK27, Qty: 5, 'Budget USD': 750 }, { ...BLOCK28, Qty: 5, 'Budget USD': 750 }, TRAIN, VAN, CHINA, CAKE, PLAN] }).input, revenue: REV(30000, 45000) });
  assert.deepEqual(five.report.purchase.rows004.map((r) => r.role), ['CONTRACT', 'CONTRACT']);
  assert.ok(C(five, 'D1').checks.some((c) => /holds 5 rooms; the 002 quotas of this stay add up to 4 rooms/.test(c.text)), 'the quota check stays');
  /* the hotel contracts' rooms for the rate list: the whole wedding stay and the suite of 25–27.02, at USD 150 per room night */
  assert.deepEqual(out.roomContracts.map((x) => [x.stay, x.items, x.ratePerRoomNight]).sort((a, b) => (a[0] < b[0] ? -1 : 1)), [['C', ['C-SOUPHATTRA-PRESIDENTIAL'], 150], ['D1', '*', 150]]);
});

test('BUDGET · THE HOTEL\'S OWN ROOMS (Owners, 18 / 19 Nov 2026): a unit of the room plan carries the room of the house the Owners assigned it — beside its label; every count and every cost stays per unit, so a number (or a suite of two) never doubles a room or its purchase', () => {
  const units = { 'wedstay/heritage-executive': [{ label: 'A', occupants: [{ guestId: 'GA1' }, { guestId: 'GA2' }] }, { label: 'B', occupants: [{ guestId: 'GC1' }] }, { label: 'C', occupants: [] }],
    'wedstay/grand-majestic': [{ label: 'A', occupants: [{ guestId: 'GB1' }, { guestId: 'GB2' }] }] };
  const plain = { ok: true, units };
  const numbered = { ok: true, units, hotelRooms: { version: 1, rooms: { 'wedstay/heritage-executive|A': ['304'], 'wedstay/grand-majestic|A': ['201'] } } };
  const a = buildBudgetComparison({ ...world({ rooms: plain }).input, revenue: REV(30000, 45000) });
  const b = buildBudgetComparison({ ...world({ rooms: numbered }).input, revenue: REV(30000, 45000) });
  const d1 = (x) => x.roomPlan.find((p) => p.stay === 'D1').rooms;
  const he = d1(b).find((u) => u.key === 'wedstay/heritage-executive' && u.label === 'A'), gm = d1(b).find((u) => u.key === 'wedstay/grand-majestic');
  assert.deepEqual([he.hotelRoom.display, he.hotelRoom.building, he.hotelRoom.type], ['304', 'D', 'Heritage Executive (Twin)']);
  assert.deepEqual([gm.hotelRoom.display, gm.hotelRoom.building], ['201', 'B']);
  assert.equal(d1(b).find((u) => u.label === 'B').hotelRoom, null, 'not assigned: nothing, never a guess');
  assert.equal(d1(a).length, d1(b).length, 'the same units'); assert.deepEqual(d1(a).map((u) => u.hotelCost), d1(b).map((u) => u.hotelCost), 'the same cost per room');
  assert.equal(a.report.purchase.totals.contract.cents, b.report.purchase.totals.contract.cents, 'the purchase never changes by a number');
  assert.equal(a.dashboard.costs.forecast.cents, b.dashboard.costs.forecast.cents);
});
