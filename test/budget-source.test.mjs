/* ============================================================================
   THE BUDGET SOURCES, AS READ (billing-budget/1.0.0 · Owners, 15 Nov 2026) — src/billing/budget-source.js.
   004_Budget_Finance, 007_Deposit/Payment_Details and the 002 display rows, parsed from grids. Every supplier, person,
   figure and date here is invented; only the layout follows the workbook.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBudget004, parseVendors007, parseItemDisplay, parsePeriod, parseDate, readNumber, nightsBetween } from '../src/billing/budget-source.js';

const HEAD = ['ID', 'Item', 'Vendor', 'Link', 'Category', 'Details', 'Rate USD', 'Qty', 'Nights, Rooms, EA', 'Rspn.', 'Budget USD', 'Actual USD', 'Balance',
  'Amount paid\nUSD', 'Paid by', 'Pay Date', 'Balance pay on the wedding day', 'Haruthai Recheck', 'Status', 'Date or period', 'Location', 'Currency', 'Suthep approval', ' Done'];
const line = (o) => { const r = Array(HEAD.length).fill(''); const at = (h) => HEAD.indexOf(h); for (const [k, v] of Object.entries(o)) r[at(k)] = v; return r; };
const SUMMARY = [
  ['TOTAL BUDGET', '', '', '', '', 'BUDGET LEFT', 'COMMITTED', '', '', 'TOTAL PLANNED BUDGET', '', '', 'BUDGET CONFIRM (Actual)', '', 'AMOUNT PAID', '', '', '', '', '', 'COST PER GUEST'],
  [1000, '', '', '', '', 10, 0, '', '', 990, '', '', 990, '', 12.5, '', '', '', '', '', 99],
  ['planned', '', '', '', '', '', 'signed', '', '', 'still to secure'],
  ['GROSS PROJECT COST', '', '', '', '', '', 'GUEST CONTRIBUTIONS', '', '', 'NET HOST COST'],
  [1190, '', '', '', '', '', 200, '', '', 990],
  [],
];
const GRID004 = [...SUMMARY, HEAD,
  line({ Item: 'Garden Lodge', Vendor: 'Garden Lodge', Category: 'Accommodation', Details: 'All Categories Rooms', 'Rate USD': 100, Qty: 10, 'Nights, Rooms, EA': 1, 'Budget USD': 1000, 'Actual USD': 1000, 'Date or period': '11.03-12.03..2030', Currency: 'USD', 'Suthep approval': 'Approve by S., 01.01.2030', Status: 'Open', ' Done': true }),
  line({ Item: 'Garden Lodge ', Vendor: 'Garden Lodge', Category: 'Accommodation', Details: '002 - Lake Room (4)', 'Rate USD': -50, Qty: 2, 'Nights, Rooms, EA': 2, 'Budget USD': -200, 'Actual USD': -200, 'Date or period': '10. - 11.03.2030', Currency: 'USD', 'Suthep approval': 'Approve by S., 01.01.2030' }),
  [],
  line({ Item: 'Coach Alpha - Beta, Alex', Vendor: 'Coach Co', Category: 'Transportation', Details: 'Seat', 'Rate USD': 40, Qty: 1, 'Nights, Rooms, EA': 1, 'Budget USD': 40, 'Actual USD': 40, 'Amount paid\nUSD': 12.5, 'Paid by': 'Alex', 'Pay Date': '01.02.2030', 'Date or period': '10.03.2030', Currency: 'USD' }),
  line({ Item: 'Cake', Vendor: 'Bakery', Category: 'Food & Beverage', Details: '-', 'Rate USD': 'tbc', Qty: 1, 'Nights, Rooms, EA': 1, 'Budget USD': 150, 'Actual USD': 150, 'Date or period': '', Currency: 'USD' }),
  line({ Item: 'Mismatch Inn', Vendor: 'Mismatch Inn', Category: 'Accommodation', Details: '09-12.03.2030', 'Rate USD': 30, Qty: 1, 'Nights, Rooms, EA': 3, 'Budget USD': 90, 'Actual USD': 90, 'Date or period': '10. - 12.03.2030', Currency: 'USD' }),
  [],
  line({ Item: 'TOTAL, ALL POSITIONS', 'Budget USD': 1080 }),
  line({ Item: 'after the total', 'Rate USD': 1, Qty: 1, 'Nights, Rooms, EA': 1, 'Budget USD': 1 }),
];
const FORM004 = GRID004.map((r, i) => r.map((c, j) => (HEAD[j] === 'Budget USD' && i > SUMMARY.length && c !== '' ? '=H' + (i + 1) + '*G' + (i + 1) + '*I' + (i + 1)
  : HEAD[j] === 'Actual USD' && i > SUMMARY.length && c !== '' ? '=K' + (i + 1) : c)));

test('BUDGET SOURCE · 004: the header by its labels, every line with its sheet row, the summary block by its labels', () => {
  const b = parseBudget004(GRID004, FORM004);
  assert.equal(b.ok, true); assert.equal(b.headerRow, SUMMARY.length + 1);
  assert.equal(b.lines.length, 5, 'empty rows skipped, nothing after the TOTAL row');
  assert.equal(b.totalRow, SUMMARY.length + 9);
  assert.deepEqual(b.lines.map((l) => l.row), [8, 9, 11, 12, 13]);
  const [block, contrib, ticket, cake, mismatch] = b.lines;
  assert.equal(block.budget, 1000); assert.equal(block.qty, 10); assert.equal(block.done, true); assert.equal(block.approval, 'Approve by S., 01.01.2030');
  assert.deepEqual(block.period.nights, ['2030-03-11']);
  assert.equal(contrib.rate, -50); assert.equal(contrib.item, 'Garden Lodge', 'trimmed');
  assert.equal(ticket.paid, 12.5); assert.equal(ticket.payDate, '2030-02-01'); assert.equal(ticket.period.single, true); assert.equal(ticket.approval, null);
  assert.equal(cake.readable, false, 'a Rate USD that is not a number makes the line unreadable — never 0');
  assert.match(cake.problems.join(' '), /Rate USD/); assert.equal(cake.rate, null); assert.equal(cake.period, null);
  assert.deepEqual(mismatch.detailsPeriod.nights, ['2030-03-09', '2030-03-10', '2030-03-11'], 'a period written in Details is read for the conflict check');
  assert.equal(block.actualIsBudget, true, '"Actual USD" that is =K<row> is the budget again, not an actual');
  assert.equal(block.budgetIsFormula, true);
  assert.equal(b.totals.grossCost, 1190); assert.equal(b.totals.guestContributions, 200); assert.equal(b.totals.totalPlanned, 990);
  assert.equal(b.totals.amountPaid, 12.5); assert.equal(b.totals.committed, 0); assert.equal(b.totals.grossCostCell, 'A5');
  assert.equal('costPerGuest' in b.totals, false, 'COST PER GUEST is never read');
});

test('BUDGET SOURCE · 004: a missing or doubled header label refuses the whole tab, named', () => {
  const noHeader = parseBudget004([['nothing here']], []);
  assert.equal(noHeader.ok, false); assert.match(noHeader.problems[0], /no header row/);
  const drop = GRID004.map((r, i) => (i === SUMMARY.length ? r.map((c) => (c === 'Date or period' ? 'When' : c)) : r));
  const a = parseBudget004(drop, []);
  assert.equal(a.ok, false); assert.match(a.problems.join(' '), /"Date or period"/); assert.equal(a.lines.length, 0);
  const twice = GRID004.map((r, i) => (i === SUMMARY.length ? r.map((c) => (c === 'Rspn.' ? 'Qty' : c)) : r));
  const t = parseBudget004(twice, []);
  assert.equal(t.ok, false); assert.match(t.problems.join(' '), /"Qty" in columns H and J/);
});

test('BUDGET SOURCE · periods: the workbook\'s own forms, nights from (incl.) to (excl.), anything else unreadable', () => {
  assert.deepEqual(parsePeriod('22. - 24.02.2031').nights, ['2031-02-22', '2031-02-23']);
  assert.deepEqual(parsePeriod('25-27..02.2031').nights, ['2031-02-25', '2031-02-26']);
  assert.deepEqual(parsePeriod('28.02-01.03..2031').nights, ['2031-02-28']);
  assert.deepEqual(parsePeriod('26.02. - 01.03.2031').nights, ['2031-02-26', '2031-02-27', '2031-02-28']);
  assert.deepEqual(parsePeriod('27-28.02.2031').nights, ['2031-02-27']);
  assert.equal(parsePeriod('24.02.2031').single, true); assert.equal(parsePeriod('24.02.2031').from, '2031-02-24');
  assert.equal(parsePeriod('25. - 02.03..2031'), null, 'a range that would end before it starts is unreadable, not guessed');
  assert.equal(parsePeriod('31.02.2031'), null, 'not a calendar date');
  assert.equal(parsePeriod('Februar'), null); assert.equal(parsePeriod(''), null);
  assert.equal(parseDate('03.09.2031'), '2031-09-03'); assert.equal(parseDate('3.9.2031'), '2031-09-03'); assert.equal(parseDate('x'), null);
  assert.deepEqual(nightsBetween('2031-02-28', '2031-03-02'), ['2031-02-28', '2031-03-01']);
  assert.deepEqual(readNumber('1,234.50'), { ok: true, value: 1234.5 }); assert.equal(readNumber('').empty, true); assert.equal(readNumber('tbc').bad, true);
});

/* 007 — vendor columns B and D (C between them empty), the payer blocks, a payment without labels, the sheet's own constants */
const V7 = [
  ['Vendor', 'Lakeside Hotel', '', 'Sweet Bakery'],
  ['Category', 'Hotel', '', 'Cake'],
  ['Total Price THB', 33250, '', 9000],
  ['Total Price EUR', 868.3, '', 234.7],
  ['Total Price USD', 1000, '', 270.7],
  [],
  ['Deposit %', 50, '', 50],
  ['Deposit Amount THB', 16625, '', 4500],
  ['Deposit Amount USD', 500],
  [],
  ['Ann THB', 8312.5],
  ['Ann USD', 250],
  [],
  ['Paid Amount', 250],
  ['Payment Date', '01.09.2031'],
  ['Paid By', 'Ann'],
  ['Payment Method', 'Card'],
  [],
  ['Ben THB', 8312.5, '', ''],
  ['Ben USD', 250, 'a note', ''],
  ['Paid Amount', 250, '', 4500],
  ['Payment Date', '01.09.2029', '', '02.09.2029'],
  ['Paid By', 'Ben', '', 'Ben'],
  ['Payment Method', 'Card', '', 'Transfer'],
  [],
  ['EUR', '', '', 1234],
  [38.3, '', '', '03.09.2029'],
  ['USD'],
  [33.25],
];
const F7 = V7.map((r, i) => r.map((c, j) => {
  if (j === 1 && i === 2) return '=B5*A29';        /* THB converted from the typed USD */
  if (i === 3 && (j === 1 || j === 3)) return '=' + (j === 1 ? 'B' : 'D') + '3/A27';
  if (i === 4 && j === 3) return '=D3/A29';        /* the bakery's USD converted from its typed THB */
  if (i === 7 && j === 1) return '=B9*A29';
  if ((i === 10 || i === 18) && j === 1) return '=B' + (i + 2) + '*A29';
  return c;
}));

test('BUDGET SOURCE · 007: typed figures told from converted ones; a payment read in the currency of the typed figure it equals', () => {
  const r = parseVendors007(V7, F7);
  assert.equal(r.ok, true); assert.deepEqual(r.vendors.map((v) => [v.col, v.vendor, v.category]), [['B', 'Lakeside Hotel', 'Hotel'], ['D', 'Sweet Bakery', 'Cake']]);
  const [hotel, bakery] = r.vendors;
  assert.equal(hotel.total.USD.typed, true); assert.equal(hotel.total.THB.typed, false, 'converted inside the sheet'); assert.match(hotel.total.THB.formula, /^=B5\*A29$/);
  assert.equal(bakery.total.THB.typed, true); assert.equal(bakery.total.USD.typed, false);
  assert.deepEqual(hotel.payments.map((p) => [p.block, p.amount, p.currency, p.date]), [['Ann', 250, 'USD', '2031-09-01'], ['Ben', 250, 'USD', '2029-09-01']]);
  assert.match(hotel.payments[0].currencyBasis, /payer's own figure in USD/);
  assert.deepEqual(bakery.payments.map((p) => [p.block, p.amount, p.currency, p.by]), [['Ben', 4500, 'THB', 'Ben']]);
  assert.match(bakery.payments[0].currencyBasis, /deposit in THB/);
  assert.deepEqual(r.constants, [{ currency: 'EUR', value: 38.3, cell: 'A27' }, { currency: 'USD', value: 33.25, cell: 'A29' }]);
  /* the payment written under rows without a payment label is named, not read; so is a note outside a supplier column */
  assert.deepEqual(r.unread.map((u) => [u.row, u.cells.map((c) => c.col + ':' + (c.vendor || '-')).join(',')]), [[20, 'C:-'], [26, 'D:Sweet Bakery'], [27, 'D:Sweet Bakery']]);
});

test('BUDGET SOURCE · 007: an amount no typed figure equals stays "currency not stated"; no Vendor row refuses the tab', () => {
  const V = [['Vendor', 'Hall'], ['Total Price THB', 5000], ['Max THB', ''], ['Paid Amount', 777], ['Payment Date', '01.01.2030']];
  const r = parseVendors007(V, V);
  assert.equal(r.vendors[0].payments[0].currency, null); assert.match(r.vendors[0].payments[0].currencyBasis, /currency not stated/);
  assert.equal(parseVendors007([['Supplier', 'x']], []).ok, false);
});

test('BUDGET SOURCE · 002 display rows: per Item_ID, by label; a repeated label blanks only its own field', () => {
  const G = [
    ['SEE YOU', ''], ['Room', 'Lake Room Garden Lodge', 'Coach seat'], ['Name', 'Lake Room\n', 'Coach'], ['Check In Date', '10.03.2030', '10.03.2030'],
    ['Check Out Date', '12.03.2030', '10.03.2030'], ['Number of Nights', 2, 1], ['Rooms available', 4, 20], ['Package', 'S1', 'R1'], ['Category', 'Accommodation', 'Transportation'],
    ['— STRUCTURED', ''], ['Item_ID', 'S1-LAKE', 'R1-COACH'], ['Standard_Rate', 50, 40],
  ];
  const d = parseItemDisplay(G);
  assert.equal(d.ok, true); assert.deepEqual(d.problems, []);
  assert.deepEqual(d.items['S1-LAKE'], { Item_ID: 'S1-LAKE', column: 'B', category: 'Accommodation', package: 'S1', checkIn: '2030-03-10', checkOut: '2030-03-12',
    checkInText: '10.03.2030', checkOutText: '12.03.2030', name: 'Lake Room', room: 'Lake Room Garden Lodge', roomsAvailable: 4, nights: 2 });
  const twice = G.concat([['Package', 'X', 'Y']]);
  const t = parseItemDisplay(twice);
  assert.equal(t.items['S1-LAKE'].package, null); assert.equal(t.items['S1-LAKE'].category, 'Accommodation'); assert.match(t.problems[0], /"Package" in rows 8 and 13/);
  assert.equal(parseItemDisplay([['no ids']]).ok, false);
});

test('BUDGET SOURCE · without the formula read nothing is known to be typed; "Actual USD" is the budget again only as a reference to its own row\'s Budget cell', () => {
  const r = parseVendors007(V7, null);
  assert.equal(r.ok, true); assert.equal(r.typedKnown, false);
  assert.ok(r.vendors.every((v) => Object.values(v.total).every((t) => t.typed === null)), 'typed: unknown, never assumed');
  assert.ok(r.vendors.every((v) => v.payments.every((p) => p.typed === null)));
  const b = parseBudget004(GRID004, null);
  assert.ok(b.lines.every((l) => l.actualIsBudget === null && l.budgetIsFormula === null));
  /* =K of ANOTHER row, or another column, is not this line's budget */
  const other = FORM004.map((r, i) => (i === SUMMARY.length + 1 ? r.map((c, j) => (HEAD[j] === 'Actual USD' ? '=K' + (i + 2) : c)) : r));
  const o = parseBudget004(GRID004, other);
  assert.equal(o.lines[0].actualIsBudget, false); assert.equal(o.lines[1].actualIsBudget, true);
});

test('BUDGET SOURCE · every "Paid Amount" is a payment of its own: a payer named twice, or paying twice in one block, is never overwritten', () => {
  const V = [['Vendor', 'Lakeside Hotel'], ['Total Price USD', 1000], [],
    ['Ann USD', 250], ['Paid Amount', 250], ['Payment Date', '01.09.2030'], ['Paid Amount', 100], ['Payment Date', '02.09.2030'], [],
    ['Ben USD', 300], ['Paid Amount', 300], ['Payment Date', '03.09.2030'], [],
    ['Ann USD', 300], ['Paid Amount', 300], ['Payment Date', '04.09.2030'], ['Payment Date', '05.09.2030']];
  const r = parseVendors007(V, V);
  assert.deepEqual(r.vendors[0].payments.map((p) => [p.block, p.row, p.amount, p.date]),
    [['Ann', 5, 250, '2030-09-01'], ['Ann', 7, 100, '2030-09-02'], ['Ben', 11, 300, '2030-09-03'], ['Ann', 15, 300, '2030-09-04']]);
  assert.match(r.problems.join(' '), /007 names the payer "Ann" again in row 14 \(first in row 4\) — read as a separate block/);
  assert.deepEqual(r.unread.map((u) => [u.row, u.cells[0].value]), [[17, '05.09.2030']], 'a second date for one payment is named, not read over the first');
});

test('BUDGET SOURCE · rows below 004\'s TOTAL row are said, never dropped silently', () => {
  const b = parseBudget004(GRID004, FORM004);
  assert.match(b.problems.join(' '), /004 row 16 below the TOTAL row 15 is not read as budget lines/);
});

test('BUDGET SOURCE · two amounts, then two dates: paired in order, never the first payment left without its date', () => {
  const V = [['Vendor', 'Lakeside Hotel'], ['Total Price USD', 1000], [], ['Ann USD', 250], ['Paid Amount', 250], ['Paid Amount', 100],
    ['Payment Date', '01.09.2030'], ['Payment Date', '02.09.2030'], ['Paid By', 'Ann']];
  const r = parseVendors007(V, V);
  assert.deepEqual(r.vendors[0].payments.map((p) => [p.amount, p.date, p.by]), [[250, '2030-09-01', 'Ann'], [100, '2030-09-02', null]]);
  assert.deepEqual(r.unread, []);
});

test('BUDGET SOURCE · a blank date keeps its payment\'s place: the next payment\'s date is never moved up to it', () => {
  const V = [['Vendor', 'Lakeside Hotel'], ['Total Price USD', 1000], [], ['Ann USD', 250], ['Paid Amount', 250], ['Payment Date', ''], ['Paid By', 'Ann'],
    ['Paid Amount', 100], ['Payment Date', '02.09.2030'], ['Paid By', 'Ann']];
  const r = parseVendors007(V, V);
  assert.deepEqual(r.vendors[0].payments.map((p) => [p.amount, p.date, p.by]), [[250, null, 'Ann'], [100, '2030-09-02', 'Ann']]);
});
