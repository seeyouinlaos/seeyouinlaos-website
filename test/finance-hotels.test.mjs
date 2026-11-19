/* ============================================================================
   FINANCE SECTION B · EACH HOTEL ON ITS OWN (Owners, 19 Nov 2026 · HS-012.2) and the console's iPhone status bar (HS-025.1).
   Synthetic lines, suppliers and figures only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { financeReportOf, hotelsOf, rowsText } from '../src/billing/finance-report.js';
import { HOTELS, RULES, SUPPLIER_CATEGORY, CHINA_STAGES, BUDGET_MAP_VERSION } from '../src/billing/budget-map.js';

const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100 });
const thb = (cents) => ({ currency: 'THB', cents, amount: cents / 100 });
const line = (row, item, vendor, category, budget, location) => ({ row, item, vendor, category, details: 'Room, (Testa)', rate: budget, qty: 1, mult: 1, budget, readable: true, currency: 'USD', location: location || null });
const four = (b, i, r, o) => ({ booked: usd(b), invoiced: usd(i), received: usd(r), outstanding: usd(o) });

test('HOTELS · one entry per hotel rule of 004, each 007 accommodation supplier in exactly one, the China trip\'s hotels marked', () => {
  assert.equal(BUDGET_MAP_VERSION, 'budget-map/1.4.0');
  for (const h of HOTELS) {
    const r = RULES.find((x) => x.id === h.id);
    assert.ok(r && r.category === 'Accommodation', h.id + ' is a 004 accommodation rule');
    assert.deepEqual([...h.stages], [...r.stages], h.id + ' serves the stays of its rule');
    assert.equal(h.china, h.stages.every((s) => CHINA_STAGES.includes(s)));
  }
  for (const s of SUPPLIER_CATEGORY.filter((x) => x.category === 'Accommodation')) {
    const sample = s.lines.replace(/^004\s+/, '');
    assert.equal(HOTELS.filter((h) => h.vendor && h.vendor.test(sample)).length, 1, sample + ' is one hotel\'s own supplier');
  }
  assert.deepEqual(HOTELS.filter((h) => h.china).map((h) => h.id), ['YIFANGJU', 'LUYE-BAISHA', 'MUSE']);
  assert.equal(rowsText([28, 20, 21, 22, 45, 10]), '10, 20–22, 28, 45');
});

/* two hotels whose own rounding differs from the category's single rounding; a line no hotel rule reads; a mirror pair; the China trip */
const LINES = [
  line(10, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', 50.005),
  line(11, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', 30),
  line(12, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', -30),
  line(20, 'Souphattra Heritage Vientiane', 'Souphattra Heritage', 'Accommodation', 100.005, 'Vientiane'),
  line(29, 'Guest House', 'Airbnb', 'Accommodation', 12),
  line(40, 'Riverside Inn', 'Somebody', 'Accommodation', 7),
  line(30, 'Yifangju Designer Courtyard', 'Trip.com', 'Accommodation', 80),
  line(31, 'Yifangju Designer Courtyard', 'Trip.com', 'Accommodation', -80),
  line(50, 'Wedding Cake', 'Bakery', 'Food & Beverage', 500),
];
const SUPPLIERS = [
  { vendor: 'U Sathorn Bangkok', stages: ['A2'], contract: thb(4194601), payments: [{ counted: true, amount: thb(4194601) }, { counted: false, amount: thb(100) }] },
  { vendor: 'Souphattra Heritage Vientiane', stages: ['C', 'D1'], contract: usd(810000), payments: [{ counted: true, amount: usd(405000) }] },
  { vendor: 'Yifangju Designer Courtyard', stages: ['F'], contract: thb(884430), payments: [{ counted: true, amount: thb(884430) }] },
  { vendor: 'Sky Bakery', stages: [], contract: thb(3000000), payments: [] },
];
const CLASSES = { version: 'revenue-classes/1.0.0', complete: true,
  classes: { SOUPHATTRA_ACCOMMODATION: { ...four(800500, 800500, 134500, 666000), guests: 57, rooms: 27, roomNights: 60 }, OTHER_ACCOMMODATION: four(20342, 81368, 0, 81368), PASS_THROUGH: four(0, 0, 0, 0), NOT_CLASSIFIED: four(0, 0, 0, 0) },
  otherAccommodation: [
    { stage: 'A2', property: 'U Sathorn Bangkok', china: false, ...four(20342, 81368, 0, 81368), guests: 4, rooms: 2, roomNights: 6 },
    { stage: 'D2', property: 'Guest House', china: false, ...four(0, 0, 0, 0), guests: 2, rooms: 1, roomNights: 0 },
    { stage: 'F', property: 'Yifangju Designer Courtyard, Kunming', china: true, ...four(21800, 21800, 0, 21800), guests: 2, rooms: 1, roomNights: 3 }],
  china: four(21800, 21800, 0, 21800), unallocated: { statements: [{ Holder_ID: 'INV-T9', status: 'PARTIAL', china: false }] }, souphattra: {}, passThrough: [], notClassified: [], withoutProduct: [] };
const ADJ = [
  { vendor: 'Souphattra Heritage Vientiane', category: 'Accommodation', stages: ['C'], difference: usd(150000) },
  { vendor: 'Two Hotels Group', category: 'Accommodation', stages: ['A2', 'C'], difference: usd(1000) },
  { vendor: 'Sky Bakery', category: 'Food & Beverage', stages: [], difference: usd(5000) },
];
const report = (classes) => financeReportOf({ budget: { lines: LINES, totals: {} }, suppliers: SUPPLIERS, dashboard: { costs: { adjustments: ADJ } }, revenue: { classes } });

test('BY HOTEL · 004 rows by their hotel rule, a line no rule reads kept as "no hotel stated", the hotels add up to the Accommodation category (a cent of rounding named), China apart', () => {
  const rep = report(CLASSES), H = rep.byHotel;
  assert.deepEqual(H.wedding.map((h) => h.id), ['SOUPHATTRA', 'U-SATHORN', 'GUEST-HOUSE', 'NO-HOTEL']);
  assert.deepEqual(H.china.map((h) => h.id), ['YIFANGJU']);
  const by = Object.fromEntries(H.wedding.concat(H.china).map((h) => [h.id, h]));
  assert.equal(by['U-SATHORN'].label, 'U Sathorn · Bangkok'); assert.equal(by['U-SATHORN'].rowsText, '10–12');
  assert.deepEqual([by['U-SATHORN'].gross.cents, by['U-SATHORN'].neutralising.cents, by['U-SATHORN'].planned.cents], [8001, -3000, 5001]);
  assert.equal(by.SOUPHATTRA.label, 'Souphattra Heritage · Vientiane', 'the location from 004 where it states one');
  assert.equal(by['GUEST-HOUSE'].location, null, 'no location invented');
  assert.deepEqual(by['NO-HOTEL'].rows, [40], 'an accommodation line no hotel rule reads is named, never dropped');
  /* forecast: each hotel's own adjustments; one naming two hotels goes to "no hotel stated"; another category's never */
  assert.equal(by.SOUPHATTRA.forecast.cents, by.SOUPHATTRA.planned.cents + 150000);
  assert.equal(by['U-SATHORN'].variance.cents, 0);
  assert.equal(by['NO-HOTEL'].variance.cents, 1000);
  /* 007: the hotel's own column, counted payments only, own currency */
  assert.deepEqual(by['U-SATHORN'].committed, [thb(4194601)]); assert.deepEqual(by['U-SATHORN'].paid, [thb(4194601)]);
  assert.equal(by['GUEST-HOUSE'].hasSupplier, false);
  /* the China trip's hotel: its own figures, never a wedding forecast */
  assert.equal(by.YIFANGJU.planned.cents, 0); assert.equal(by.YIFANGJU.forecast, null); assert.deepEqual(by.YIFANGJU.paid, [thb(884430)]);
  /* reconciliation: unrounded sums agree; the hotels rounded one by one are a cent above the category */
  const acc = rep.byCategory.find((c) => c.category === 'Accommodation');
  const sumW = (f) => H.wedding.reduce((t, h) => t + (h[f] ? h[f].cents : 0), 0);
  assert.equal(H.reconciliation.rawAgree, true);
  assert.equal(acc.planned.cents - sumW('planned'), H.reconciliation.netResidualCents);
  assert.equal(H.reconciliation.netResidualCents, -1, '100.005 + 50.005 round to 100.01 + 50.01, the category once to 150.01');
  assert.equal(acc.forecast.cents - sumW('forecast'), -1);
  assert.deepEqual(acc.committed, [usd(810000), thb(4194601)]);
  assert.ok(rep.exceptions.some((e) => /each hotel is rounded to the cent/.test(e.text || e.message || JSON.stringify(e))), 'the cent is named');
});

test('BY HOTEL · the guests\' billing is revenue-classes\' own, by hotel; what the class split cannot allocate is named; an unmapped property makes the split incomplete', () => {
  const H = report(CLASSES).byHotel;
  const by = Object.fromEntries(H.wedding.concat(H.china).map((h) => [h.id, h]));
  assert.deepEqual(by.SOUPHATTRA.revenue.booked, usd(800500)); assert.deepEqual(by.SOUPHATTRA.revenue.received, usd(134500));
  assert.deepEqual(by['U-SATHORN'].revenue.invoiced, usd(81368)); assert.equal(by['U-SATHORN'].revenue.guests, 4);
  assert.deepEqual(by.YIFANGJU.revenue.booked, usd(21800), 'the China trip\'s hotel takes the China entry');
  assert.equal(by.SOUPHATTRA.revenue.notSplit, 1, 'a partly paid wedding statement is left out of received / outstanding, and said');
  assert.equal(by.YIFANGJU.revenue.notSplit, 0);
  assert.equal(H.reconciliation.revenueAgree, true); assert.equal(H.complete, true);
  const odd = { ...CLASSES, otherAccommodation: CLASSES.otherAccommodation.concat([{ stage: 'Z9', property: 'Unknown Lodge', china: false, ...four(1000, 0, 0, 0) }]) };
  const H2 = report(odd).byHotel;
  assert.equal(H2.complete, false); assert.equal(H2.reconciliation.unmappedRevenue[0].property, 'Unknown Lodge');
  assert.equal(report(null).byHotel.wedding.every((h) => h.revenue === null), true, 'no classes: no revenue invented');
});

test('CONSOLE · the iPhone status bar: the header starts below it and a strip of the header\'s paper covers it while the page scrolls (built admin page)', () => {
  const page = fs.readFileSync(new URL('../src/admin/billing.html', import.meta.url), 'utf8');
  const built = fs.readFileSync(new URL('../src/admin-page.js', import.meta.url), 'utf8');
  const builtPage = JSON.parse(built.slice(built.indexOf('"'), built.lastIndexOf('"') + 1));
  assert.equal(builtPage, page, 'the built page is the page');
  for (const h of [page]) {
    assert.match(h, /viewport-fit=cover/);
    assert.match(h, /\.hd\{[^}]*padding:calc\(14px \+ var\(--ab-sat,env\(safe-area-inset-top,0px\)\)\) 20px 14px/);
    assert.match(h, /body::before\{content:"";position:fixed;top:0;left:0;right:0;height:var\(--ab-sat,env\(safe-area-inset-top,0px\)\);background:#F3EEE7;z-index:60;pointer-events:none\}/);
  }
});

test('BY HOTEL · the review\'s edges: every column reconciled (a gross cent named while net agrees), a China hotel never takes a wedding supplier or adjustment, no cards without 004', () => {
  /* gross residual while net agrees: 50.005 + 100.005 − 0.005 */
  const lines = [line(10, 'U Sathorn Bangkok', 'Hotel', 'Accommodation', 50.005), line(20, 'Souphattra Heritage Vientiane', 'Souphattra Heritage', 'Accommodation', 100.005),
    line(21, 'Souphattra Heritage Vientiane', 'Souphattra Heritage', 'Accommodation', -0.005)];
  const r1 = financeReportOf({ budget: { lines, totals: {} }, suppliers: [], dashboard: { costs: { adjustments: [] } }, revenue: { classes: CLASSES } });
  const X = r1.byHotel.reconciliation;
  assert.equal(X.residualCents.gross, -1, 'the gross column is a cent apart'); assert.equal(X.residualCents.planned, 0);
  assert.ok(r1.exceptions.some((e) => /gross adds up to the Accommodation category apart from USD 0\.01/.test(JSON.stringify(e))));
  /* a Yifangju 007 column without China stays and a stage-less Yifangju adjustment are the wedding's, as the category table counts them */
  const sup = [{ vendor: 'Yifangju Designer Courtyard', stages: [], contract: usd(5000), payments: [] }];
  const adj = [{ vendor: 'Yifangju Designer Courtyard', category: 'Accommodation', stages: [], difference: usd(70000) }];
  const r2 = financeReportOf({ budget: { lines: LINES, totals: {} }, suppliers: sup, dashboard: { costs: { adjustments: adj } }, revenue: { classes: CLASSES } });
  const by2 = Object.fromEntries(r2.byHotel.wedding.concat(r2.byHotel.china).map((h) => [h.id, h]));
  assert.deepEqual(by2['NO-HOTEL'].committed, [usd(5000)]); assert.equal(by2['NO-HOTEL'].variance.cents, 70000);
  assert.ok(!by2.YIFANGJU || !by2.YIFANGJU.committed.length, 'never on the China card');
  assert.deepEqual(r2.byHotel.reconciliation.flowAgree, { committed: true, paid: true });
  assert.equal(r2.byHotel.reconciliation.residualCents.forecast, r2.byHotel.reconciliation.residualCents.planned, 'the forecast column reconciles too');
  /* 004 unreadable: 007 alone draws no card */
  const H3 = hotelsOf({ s004Lines: [], budgetLines: [], suppliers: SUPPLIERS, adjustments: [], classes: CLASSES });
  assert.equal(H3.reconciliation.read004, false); assert.equal(H3.reconciliation.rawAgree, false);
  /* no class split: every card says so instead of "no booked guest stay" */
  assert.equal(report(null).byHotel.revenueAvailable, false);
});
