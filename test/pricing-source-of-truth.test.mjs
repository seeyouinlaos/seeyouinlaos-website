/* ============================================================================
   THE PRICING SOURCE OF TRUTH (Owner, 8 Oct 2026) — Google 002 / 009 → Billing Engine → Booked Value / Settlement → Website.
   Synthetic guests and ids only (public repository); the products and the amounts are the Owner's.

   · two guests sharing one room, each named in 009 at the amount Haruthai paid for them — USD 109.00 for Yifangju Designer
     Courtyard (F-JINRI-TERRACE-DOUBLE, 3 nights) and USD 232.62 for Luye Baisha · Rizhao Jinshan (H-PRIVATE-SOUP-VIEW, 2 nights):
     EACH repays USD 341.62 — on every surface: engine, Booked value, statement, PDF, the trip pages, the e-mail. A per-person
     amount is never divided by the room's occupancy again.
   · a per-room rate is charged once, for the room — never split by inference; a named 009 rate beats 002 for the person it names
   · once the server has answered, no figure of the website's own replaces it; a sending that cannot check stores no amount
   · gate F1 (src/pricing-guard.mjs) runs in the release check and names every difference from Google
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, PEGGY } from './sandbox.mjs';
import { calculate } from '../src/billing/engine.js';
import { buildSnapshot } from '../src/billing/settlement.js';
import { renderSettlementPdf } from '../src/billing/pdf.js';
import { loadItems, loadSpecialRates, RANGE } from '../src/billing/source.js';
import { composeGuestMail, composeOwnerMail } from '../src/mail-templates.js';
import { markPaidByHS } from '../src/worker.js';
import { clearCatalogueCache } from '../src/billing/catalogue-cache.js';
import { invariants, codeAgainstGoogle, snapshotOf, diffSnapshots, raw009, digestsOf, baselineVerdict, markerVerdict, acceptPlan, committedValid } from '../src/pricing-guard.mjs';
import fs from 'node:fs';

const DAY = '2026-10-08';
const PAYABLE = 'GUEST_SETTLEMENT_REQUIRED';
/* the two hotels as 002 states them: per person per night, the guest pays the hotel — unless H&S already paid it */
const ITEMS = {
  'F-JINRI-TERRACE-DOUBLE': { Item_ID: 'F-JINRI-TERRACE-DOUBLE', Site_Product_Key: 'kmg/jinri-terrace-double', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 18.16666667, Currency: 'USD', Max_Pax: 2, 'Number of Nights': 3 },
  'H-PRIVATE-SOUP-VIEW': { Item_ID: 'H-PRIVATE-SOUP-VIEW', Site_Product_Key: 'ljg/private-soup-view', Billing_Category: 'GUEST_SELF_PAYMENT', Rate_Status: 'ACTIVE',
    Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 58.155, Currency: 'USD', Max_Pax: 2, 'Number of Nights': 2 },
};
const NOTE = 'Haruthai has already paid this hotel booking for you. Please repay Haruthai & Suthep through this settlement.';
const paid = (p, item, rate, nights) => ({ Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: item, Rate_Per_Person_Night: rate, Nights_Rule: String(nights),
  Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep (Owner order 8 Oct 2026)', Note: NOTE, Billing_Category: PAYABLE });
const ROWS = ['GA', 'GB'].flatMap((p) => [paid(p, 'F-JINRI-TERRACE-DOUBLE', '36.33333333', 3), paid(p, 'H-PRIVATE-SOUP-VIEW', '116.31', 2)]);
const stays = (p) => [
  { Booking_ID: 'B-' + p + '-KMG', Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'F-JINRI-TERRACE-DOUBLE', State: 'CONFIRMED', Quantity: 1, Nights: 3, Room_Unit_ID: 'KMG-A' },
  { Booking_ID: 'B-' + p + '-LJG', Holder_ID: 'INV-' + p, Person_ID: p, Item_ID: 'H-PRIVATE-SOUP-VIEW', State: 'CONFIRMED', Quantity: 1, Nights: 2, Room_Unit_ID: 'LJG-A' },
];

test('HOTELS H&S PAID · each of the two guests sharing the rooms repays USD 109.00 + USD 232.62 = USD 341.62 — never half of it', () => {
  for (const p of ['GA', 'GB']) {
    const r = calculate(stays(p), { items: ITEMS, specialRates: ROWS, asOf: DAY });
    const [kmg, ljg] = r.lines;
    assert.deepEqual([kmg.amountCents, kmg.payableNights, kmg.rateSource, kmg.block], [10900, 3, 'SPECIAL_RATE', 'A'], p + ' Yifangju');
    assert.deepEqual([ljg.amountCents, ljg.payableNights, ljg.rateSource, ljg.block], [23262, 2, 'SPECIAL_RATE', 'A'], p + ' Luye Baisha');
    assert.equal(r.totalPayableCents, 34162, p + ': USD 341.62 for the two hotels');
    for (const l of r.lines) assert.deepEqual([l.Billing_Category, l.categoryOverride && l.categoryOverride.from], [PAYABLE, 'GUEST_SELF_PAYMENT'], 'payable to H&S, because H&S paid it — never provider-settled');
    assert.notEqual(kmg.amountCents, 5450); assert.notEqual(ljg.amountCents, 11631);
  }
  /* a guest no row names still pays the hotel themselves: nothing payable to H&S */
  const other = calculate(stays('GC'), { items: ITEMS, specialRates: ROWS, asOf: DAY });
  assert.deepEqual(other.lines.map((l) => [l.amountCents, l.block]), [[0, 'B'], [0, 'B']]);
});

test('HOTELS H&S PAID · the statement and its PDF carry USD 109.00, USD 232.62 and the total USD 341.62 for each guest', () => {
  for (const p of ['GA', 'GB']) {
    const result = calculate(stays(p), { items: ITEMS, specialRates: ROWS, asOf: DAY });
    const snap = buildSnapshot({ settlementId: 'S-TEST-' + p, revision: 1, holderId: 'INV-' + p, result, items: ITEMS, specialRates: ROWS,
      fx: { FX_USD_THB: 33.68, FX_USD_EUR: 0.89 }, issueDate: DAY, sourceHash: 'f'.repeat(64), paymentPreference: 'SEPA_EUR' });
    assert.deepEqual(snap.lines.map((l) => l.amountCents), [10900, 23262]);
    assert.equal(snap.Total_Payable_Cents, 34162);
    assert.ok(snap.lines.every((l) => l.Category_Override_From === 'GUEST_SELF_PAYMENT' && l.specialRateRef === NOTE));
    const pdf = Buffer.from(renderSettlementPdf(snap, {})).toString('latin1');
    for (const figure of ['109.00', '232.62', '341.62']) assert.ok(pdf.includes(figure), p + ': the PDF prints ' + figure);
    /* the rate column prints the night's rate (USD 36.33, USD 116.31); no line or total is the half (54.50 · 170.81) */
    for (const half of ['54.50', '170.81']) assert.ok(!pdf.includes(half), p + ': no half figure ' + half);
  }
});

test('HOTELS H&S PAID · My Bag, the trip, the room and the stay card show the guest\'s USD 109 and USD 232.62 — the listing\'s 18.17 × 3 never', () => {
  const quotes = {
    'kmg/jinri-terrace-double': { Item_ID: 'F-JINRI-TERRACE-DOUBLE', total: 109, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 36.33, nights: 3, payableNights: 3, paidByHS: 'GUEST_SELF_PAYMENT', listRate: 18.16666667 },
    'ljg/private-soup-view': { Item_ID: 'H-PRIVATE-SOUP-VIEW', total: 232.62, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 116.31, nights: 2, payableNights: 2, paidByHS: 'GUEST_SELF_PAYMENT', listRate: 58.155 },
  };
  const w = page({ auth: PEGGY, quotes });
  const P = w.SIYL_PRICE;
  let total = 0;
  for (const [win, slug, amount, words] of [['kmg', 'jinri-terrace-double', 109, 'USD 109 per person'], ['ljg', 'private-soup-view', 232.62, 'USD 232.62 per person']]) {
    const q = P.quote(win, slug);
    assert.deepEqual([q.total, q.personal, q.booking], [amount, 'prepaid', 'prepaid'], win);
    const line = P.items(win, slug)[0];
    assert.equal(line.price, amount, win + ': the bag line');
    w.SIYL_BAG.put(line);
    assert.match(w.SIYL_JOURNEY.quantityLine(line), new RegExp('^' + words + ' · already paid for you by Haruthai'), win + ': Your Journey');
    assert.equal(P.fromLine(win), words, win + ': the stay card says the guest\'s own amount beside "already paid"');
    assert.equal(P.bookingOf(win).method, 'prepaid');
    total += line.price;
  }
  assert.equal(Math.round(total * 100), 34162, 'USD 341.62 in the bag for the two hotels');
  /* before the server answers nothing is claimed; a guest the server does not mark keeps the hotel's own listing */
  const other = page({ auth: PEGGY }).SIYL_PRICE;
  assert.match(other.fromLine('kmg'), /^From USD [\d.]+ per person · from USD [\d.]+ per person per night$/);
});

test('HOTELS H&S PAID · the trip e-mails say USD 109 and USD 232.62 per person, already paid by Haruthai — never a half', () => {
  const sel = [
    { id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', name: 'Yifangju Designer Courtyard · Kunming', meta: '1 – 4 March 2027 · Jinri Building Scenic Terrace Tub Double', price: 109, rate: 18.16666667, nights: 3, pay: 3, qty: 1, paidByHS: true },
    { id: 'ljg', stay: 'lijiang', room: 'private-soup-view', name: 'Luye Baisha · Rizhao Jinshan · Lijiang', meta: '4 – 6 March 2027 · Snow Mountain Private Soup View', price: 232.62, rate: 58.155, nights: 2, pay: 2, qty: 1, paidByHS: true },
  ];
  const rec = { invitationId: 'INV-GA', guestId: 'GA', submissionId: 'SYL-GA-TEST0001', version: 1, kind: 'initial', submittedAt: '2026-10-08T09:00:00.000Z', lastSentAt: '2026-10-08T09:00:00.000Z',
    recipient: { email: 'sam.example@example.org' },
    registration: { lang: 'en', contact: { email: 'sam.example@example.org' }, personal: { firstName: 'Sam', lastName: 'Example' }, selections: sel, totalUsd: 341.62,
      guestRecord: { partyName: 'Sam', scope: { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: true, none: false },
        guests: [{ guestId: 'GA', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } };
  const g = composeGuestMail(rec), o = composeOwnerMail(rec);
  assert.match(g.text, /USD 109 per person — Already paid for you by Haruthai/);
  assert.match(g.text, /USD 232\.62 per person — Already paid for you by Haruthai/);
  assert.match(o.text, /USD 109 — already paid by Haruthai; repaid through the settlement/);
  assert.match(o.text, /USD 232\.62 — already paid by Haruthai; repaid through the settlement/);
  for (const m of [g, o]) assert.doesNotMatch(m.text + m.html, /USD 54\.5|USD 116\.31|USD 170\.81|Guest will book by themselves|Book with the hotel/);
});

test('NEVER DIVIDED · a per-person rate is charged in full to everyone in the room; a per-room rate once, for the room; a named rate beats 002', () => {
  const items = {
    'T-STAY': { Item_ID: 'T-STAY', Billing_Category: PAYABLE, Rate_Status: 'ACTIVE', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 130, Currency: 'USD', Max_Pax: 2 },
    'T-ROOM': { Item_ID: 'T-ROOM', Billing_Category: PAYABLE, Rate_Status: 'ACTIVE', Rate_Basis: 'PER_ROOM', Standard_Rate: 300, Currency: 'USD', Max_Pax: 2 },
  };
  const b = (p, item, o) => ({ Booking_ID: 'B-' + p + item, Holder_ID: 'INV-X', Bill_To_Holder_ID: 'INV-X', Person_ID: p, Item_ID: item, State: 'CONFIRMED', Quantity: 1, Nights: 2, Room_Unit_ID: 'U1', ...o });
  /* per person: USD 130 × 2 nights for EACH of the two persons in the room — never USD 65 */
  assert.deepEqual(calculate([b('P1', 'T-STAY'), b('P2', 'T-STAY')], { items, specialRates: [], asOf: DAY }).lines.map((l) => l.amountCents), [26000, 26000]);
  /* per room, because its unit says so: charged once for the room — never split 150 / 150, never doubled */
  const room = calculate([b('P1', 'T-ROOM'), b('P2', 'T-ROOM')], { items, specialRates: [], asOf: DAY });
  assert.deepEqual(room.lines.map((l) => l.amountCents), [30000, 0]); assert.equal(room.totalPayableCents, 30000);
  /* a named 009 rate beats 002 for exactly the person it names */
  const named = [{ Holder_ID: 'INV-X', Person_ID: 'P1', Item_ID: 'T-STAY', Rate_Per_Person_Night: 65, Nights_Rule: '2', Rate_Status: 'ACTIVE', Approved_By: 'Haruthai & Suthep' }];
  const r = calculate([b('P1', 'T-STAY'), b('P2', 'T-STAY')], { items, specialRates: named, asOf: DAY });
  assert.deepEqual(r.lines.map((l) => [l.amountCents, l.rateSource]), [[13000, 'SPECIAL_RATE'], [26000, 'STANDARD_RATE']]);
});

test('NO LOCAL OVERRIDE · the server\'s rate replaces the website\'s own figure; a local figure that differs from a readable 002 rate fails gate F1', async () => {
  const P = page({ auth: PEGGY, quotes: { 'kmg/jinri-terrace-double': { total: 0, block: 'B', rateSource: 'GUEST_SELF_PAYMENT', listRate: 20 } } }).SIYL_PRICE;
  const room = P.locate('kmg').stay.rooms.find((r) => r.slug === 'jinri-terrace-double');
  assert.equal(P.rateOf('kmg', room), 20, 'the server\'s 002 rate, not the catalogue\'s 18.16666667');
  /* the same comparison F1 runs against live Google, on a synthetic 002 / 009 */
  const label = (l, ...cells) => [l, ...cells];
  const g002 = [label('Item_ID', 'F-JINRI-TERRACE-DOUBLE'), label('Site_Product_Key', 'kmg/jinri-terrace-double'), label('Billing_Category', 'GUEST_SELF_PAYMENT'),
    label('Rate_Status', 'ACTIVE'), label('Rate_Basis', 'PER_PERSON_PER_NIGHT'), label('Standard_Rate', 18.16666667), label('Currency', 'USD'), label('Number of Nights', 3),
    label('Max_Pax', 2), ...['Effective_From', 'Effective_To', 'Quota', 'Quota_Unit', 'Change_Cutoff', 'Cancellation_Cutoff', 'Modifiers'].map((l) => label(l, ''))];
  const g009 = [['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Visibility', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Approved_At', 'Note', 'Billing_Category'],
    ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', 36.33333333, '3', 'GUEST', 'ACTIVE', '', '', 'Haruthai & Suthep', DAY, NOTE, PAYABLE]];
  const load = async (a, b) => {
    const cfg = { spreadsheetId: 'test', asOf: DAY, grids: { [RANGE.ACCOMMODATION_DETAILS]: a, [RANGE.SPECIAL_RATES]: b } };
    return { source: { items: await loadItems({}, cfg), specialRates: await loadSpecialRates({}, cfg) }, g002: a, g009: b };
  };
  const ok = await codeAgainstGoogle(await load(g002, g009), DAY);
  assert.deepEqual(ok.problems, []); assert.equal(ok.stats.named, 1); assert.equal(ok.stats.website, 1);
  /* a 002 key no website room carries is named; a room the website prices itself without a listed 002 rate is named */
  const stray = await codeAgainstGoogle(await load(g002.map((r) => (r[0] === 'Site_Product_Key' ? ['Site_Product_Key', 'kmg/no-such-room'] : r)), g009), DAY);
  assert.ok(stray.info.some((i) => /002 stay keys no website room carries: kmg\/no-such-room/.test(i)), stray.info.join(' | '));
  assert.ok(stray.info.some((i) => /no ACTIVE per-person 002 rate behind it: .*kmg\/jinri-terrace-double \(18\.16666667\)/.test(i)), stray.info.join(' | '));
  /* Google now says 20: the website's own 18.16666667 is a local figure overriding a readable rate — F1 fails and says where */
  const moved = g002.map((r) => (r[0] === 'Standard_Rate' ? ['Standard_Rate', 20] : r));
  const bad = await codeAgainstGoogle(await load(moved, g009), DAY);
  assert.ok(bad.problems.some((p) => /^website kmg\/jinri-terrace-double: its own figure 18\.16666667 differs from 002 20/.test(p)), bad.problems.join(' | '));
});

test('GATE F1 · the rules hold, a changed 009 amount is named by row and product (never by person), and the release check runs it', async () => {
  assert.deepEqual(await invariants(), []);
  const head = ['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Approved_By', 'Billing_Category'];
  const grid = (rate) => [head, ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', rate, '3', 'ACTIVE', 'Haruthai & Suthep', PAYABLE]];
  assert.equal(raw009(grid('36.33333333'))[0].row, 2);
  const before = snapshotOf({ g002: [['Item_ID']], g009: grid('36.33333333') }), after = snapshotOf({ g002: [['Item_ID']], g009: grid('18.16666667') });
  assert.deepEqual(diffSnapshots(before, before), []);
  assert.deepEqual(diffSnapshots(before, after), ['009 row 2 · F-JINRI-TERRACE-DOUBLE · Rate_Per_Person_Night: 36.33333333 → 18.16666667']);
  /* two rows of the same person and product swapped in the tab: the same rows — no difference */
  const two = [head, ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', '36.33333333', '3', 'ACTIVE', 'Haruthai & Suthep', PAYABLE], ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', '18.16666667', '3', 'RETIRED', 'Haruthai & Suthep', PAYABLE]];
  const swapped = [head, two[2], two[1]];
  assert.deepEqual(diffSnapshots(snapshotOf({ g002: [['Item_ID']], g009: two }), snapshotOf({ g002: [['Item_ID']], g009: swapped })), []);
  /* --accept states how many differences the Owner's order covers */
  assert.match(src('src/pricing-guard.mjs'), /if \(!Number\.isInteger\(expect\) \|\| expect !== diff\.length\)/);
  const rc = src('src/release-check.cjs');
  assert.match(rc, /gate\('F1', 'Pricing source of truth: Google 002 \/ 009 → engine → website, no rate divided, overridden or changed unseen', r\.status === 0,/);
  assert.match(rc, /spawnSync\('node', \[path\.join\(__dirname, 'pricing-guard\.mjs'\)\]/);
  /* read only: the guard has no write path to Google or the Worker, and --live reads two exact paths */
  const guard = src('src/pricing-guard.mjs');
  assert.doesNotMatch(guard, /updateRange|appendRow|method:\s*'(POST|PUT|PATCH|DELETE)'/);
  assert.match(guard, /const ALLOWED = \[\/\^\\\/api\\\/billing\\\/catalogue\$\/, \/\^\\\/api\\\/billing\\\/admin\\\/holder\\\?holder=\[A-Za-z0-9-\]\+\$\/\];/);
  assert.match(src('.gitignore'), /^src\/\*\.private\.json$/m, 'the baseline (holder and person ids) is never committed');
});

test('NO LOCAL AMOUNT AT SENDING · a stay the device calls prepaid, which the server could not check, is stored with no amount ("Price to follow")', async () => {
  clearCatalogueCache();
  const lines = [{ id: 'kmg', stay: 'kunming', room: 'jinri-terrace-double', qty: 1, price: 54.5, rate: 18.16666667, pay: 3 }, { id: 'train', qty: 1, price: 105 }];
  const out = await markPaidByHS({ SHEETS_ID: 'unreadable-in-this-test' }, { invitationId: 'INV-GA', guestId: 'GA' }, lines, new Set(['kmg/jinri-terrace-double']), 50);
  assert.deepEqual([out[0].prepaidUnverified, out[0].price, out[0].paidByHS], [true, null, undefined]);
  assert.deepEqual([out[1].price, out[1].prepaidUnverified], [105, undefined], 'every other line exactly as sent');
  clearCatalogueCache();
});

test('PORTABLE BASELINE · the committed digests are canonical (moving a row is no change, changing a cell is) and carry no id or amount', () => {
  const head = ['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Approved_By', 'Billing_Category'];
  const a = ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', 36.33333333, '3', 'ACTIVE', 'Haruthai & Suthep', PAYABLE];
  const b = ['INV-GB', 'GB', 'H-PRIVATE-SOUP-VIEW', 116.31, '2', 'ACTIVE', 'Haruthai & Suthep', PAYABLE];
  const g002 = [['Item_ID', 'X-ONE'], ['Standard_Rate', 10]];
  const one = digestsOf(snapshotOf({ g002, g009: [head, a, b] })), swapped = digestsOf(snapshotOf({ g002, g009: [head, b, a] }));
  const halved = digestsOf(snapshotOf({ g002, g009: [head, [...a.slice(0, 3), 18.16666667, ...a.slice(4)], b] }));
  assert.equal(one.ref, swapped.ref, 'the order of the rows in the tab is not a financial fact');
  assert.notEqual(one.ref, halved.ref, 'a halved rate is a different state');
  assert.deepEqual([one.products, one.rows009, /^[0-9a-f]{12}$/.test(one.ref)], [1, 2, true]);
  /* the committed file in this repository: digests, a reference, dates — nothing a guest could be found by */
  const committed = JSON.parse(src('infra/pricing-baseline.json'));
  assert.ok(committedValid(committed));
  assert.deepEqual(Object.keys(committed).sort(), ['about', 'acknowledged', 'digest002', 'digest009', 'products', 'ref', 'rows009']);
  /* no id, no order text, no amount — every value is a digest, a reference, a count, a date or the fixed description */
  assert.doesNotMatch(JSON.stringify(committed), /INV-|CON\d|"order"/);
  for (const [k, v] of Object.entries(committed)) if (k !== 'about' && k !== 'acknowledged') assert.match(String(v), /^([0-9a-f]{12}|[0-9a-f]{64}|\d+)$/, k);
  assert.doesNotMatch(committed.about, /\d+\.\d{2}/);
  for (const e of committed.acknowledged) assert.deepEqual(Object.keys(e).sort(), ['at', 'changes', 'ref']);
});

test('PORTABLE BASELINE · F1 fails closed: no committed baseline, a tampered one, or a Google change nobody acknowledged — and names the change where the private detail matches', () => {
  const head = ['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Approved_By', 'Billing_Category'];
  const snap = (rate) => snapshotOf({ g002: [['Item_ID', 'X-ONE'], ['Standard_Rate', 10]], g009: [head, ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', rate, '3', 'ACTIVE', 'Haruthai & Suthep', PAYABLE]] });
  const approved = snap(36.33333333), d = digestsOf(approved);
  const committed = { about: 'x', ref: d.ref, digest002: d.digest002, digest009: d.digest009, products: 1, rows009: 1, acknowledged: [{ at: '2026-10-08T00:00:00Z', ref: d.ref, changes: 0 }] };
  const detail = { ...approved, ref: d.ref };
  assert.deepEqual(baselineVerdict({ committed, detail, now: approved }).problems, []);
  assert.deepEqual(baselineVerdict({ committed, detail: null, now: approved }).problems, [], 'a fresh checkout without the private detail still compares');
  assert.match(baselineVerdict({ committed: null, detail, now: approved }).problems[0], /^no committed baseline/);
  assert.match(baselineVerdict({ committed: { ...committed, digest009: '0'.repeat(64) }, detail, now: approved }).problems[0], /malformed or its digests do not match/);
  const changed = baselineVerdict({ committed, detail, now: snap(18.16666667) }).problems;
  assert.match(changed[0], /^CHANGED SINCE THE OWNER'S LAST ACKNOWLEDGED ORDER \(ref [0-9a-f]{12}, 2026-10-08\): Google 009 financial cells differ$/);
  assert.equal(changed[1], 'CHANGED — 009 row 2 · F-JINRI-TERRACE-DOUBLE · Rate_Per_Person_Night: 36.33333333 → 18.16666667');
  assert.match(baselineVerdict({ committed, detail: null, now: snap(18.16666667) }).problems[1], /cannot be named in this environment/);
});

test('PORTABLE BASELINE · only an OWNER-PRICING-CHANGE naming the ref may change it; git unreadable fails; --accept refuses without the matching detail or the stated number', () => {
  const ref = 'a4a18a221d85';
  assert.deepEqual(markerVerdict({ commits: [{ hash: 'c1', message: 'X\n\nOWNER-PRICING-CHANGE: first [ref ' + ref + ']\nCo-Authored-By: x' }], dirty: false, ref }), []);
  assert.match(markerVerdict({ commits: [{ hash: 'c1', message: 'no trailer' }], dirty: false, ref })[0], /without an OWNER-PRICING-CHANGE trailer/);
  /* a body line quoting the syntax, or an empty trailer line, is no trailer */
  assert.equal(markerVerdict({ commits: [{ hash: 'c1', message: 'Use OWNER-PRICING-CHANGE: [ref ' + ref + '] next time\nOWNER-PRICING-CHANGE: [ref ' + ref + ']\n\nCo-Authored-By: x' }], dirty: false, ref }).length, 1);
  assert.equal(markerVerdict({ commits: [{ hash: 'c1', message: 'X\n\nOWNER-PRICING-CHANGE:\nCo-Authored-By: [ref ' + ref + ']' }], dirty: false, ref }).length, 1);
  assert.match(markerVerdict({ commits: [{ hash: 'c2', message: 'OWNER-PRICING-CHANGE: old [ref 000000000000]' }], dirty: false, ref })[0], /does not name ref/);
  assert.match(markerVerdict({ commits: [], dirty: true, env: '', ref })[0], /OWNER_PRICING_CHANGE must name/);
  assert.deepEqual(markerVerdict({ commits: [], dirty: true, env: 'order [ref ' + ref + ']', ref }), []);
  assert.match(markerVerdict({ gitError: 'not a git repository', ref })[0], /cannot be verified/);
  /* the commit that set today's baseline must name it; an older unmarked one is superseded by it (never a permanent block) */
  assert.deepEqual(markerVerdict({ commits: [{ hash: 'c3', message: 'OWNER-PRICING-CHANGE: y [ref ' + ref + ']' }, { hash: 'c1', message: 'unmarked' }], dirty: false, ref }), []);
  assert.equal(markerVerdict({ commits: [{ hash: 'c1', message: 'unmarked' }, { hash: 'c0', message: 'OWNER-PRICING-CHANGE: y [ref ' + ref + ']' }], dirty: false, ref }).length, 1);

  const head = ['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Approved_By', 'Billing_Category'];
  const snap = (rate) => snapshotOf({ g002: [['Item_ID', 'X-ONE'], ['Standard_Rate', 10]], g009: [head, ['INV-GA', 'GA', 'F-JINRI-TERRACE-DOUBLE', rate, '3', 'ACTIVE', 'Haruthai & Suthep', PAYABLE]] });
  const a = snap(36.33333333), d = digestsOf(a);
  const committed = { about: 'x', ref: d.ref, digest002: d.digest002, digest009: d.digest009, products: 1, rows009: 1, acknowledged: [{ at: 'x', ref: d.ref, changes: 0 }] };
  const order = 'Owner order 9 Oct 2026: the rate is changed';
  assert.match(acceptPlan({ committed, detail: null, now: snap(40), order, expect: 1 }).refused, /no local detail/);
  assert.match(acceptPlan({ committed, detail: { ...snap(1), ref: 'ffffffffffff' }, now: snap(40), order, expect: 1 }).refused, /not the committed baseline/);
  assert.match(acceptPlan({ committed, detail: { ...a, ref: d.ref }, now: snap(40), order, expect: NaN }).refused, /1 difference\(s\) found; --expect <n>/);
  assert.match(acceptPlan({ committed, detail: { ...a, ref: d.ref }, now: snap(40), order: 'short', expect: 1 }).refused, /order in words/);
  assert.match(acceptPlan({ committed, detail: { ...a, ref: d.ref }, now: a, order, expect: 0 }).refused, /nothing to accept/);
  assert.equal(acceptPlan({ committed, detail: { ...a, ref: d.ref }, now: snap(40), order, expect: 1 }).diff.length, 1);
  /* a deleted baseline is restored from git, never started again; a first one only with --bootstrap where git never held it */
  assert.match(acceptPlan({ committed: null, detail: { ...a, ref: d.ref }, now: snap(40), order, expect: 1, inHistory: true, bootstrap: true }).refused, /restore it \(git checkout/);
  assert.match(acceptPlan({ committed: null, detail: { ...a, ref: d.ref }, now: a, order, expect: 0, inHistory: false }).refused, /only --bootstrap starts one/);
  assert.equal(acceptPlan({ committed: null, detail: { ...a, ref: d.ref }, now: a, order, expect: 0, inHistory: false, bootstrap: true }).refused, undefined);
  /* test-mode overrides never reach a release run */
  assert.match(src('src/release-check.cjs'), /for \(const k of \['PRICING_GUARD_TEST', 'PRICING_GUARD_KEY', 'PRICING_BASELINE_DETAIL', 'PRICING_BASELINE_COMMITTED'\]\) delete env\[k\];/);
  assert.match(src('src/pricing-guard.mjs'), /if \(TEST_MODE\) problems\.push\('TEST MODE/);
  /* nothing but the guard reads the baselines — the release tools read only its reference: no figure can come from them */
  const RELEASE_TOOLS = ['src/release-attest.mjs', 'src/release-verify.cjs'];
  for (const dir of ['src', 'assets']) for (const f of fs.readdirSync(dir, { recursive: true })) {
    const file = dir + '/' + f; if (!/\.(m?js|cjs)$/.test(file) || file === 'src/pricing-guard.mjs') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (RELEASE_TOOLS.includes(file)) { for (const m of text.matchAll(/pricing-baseline\.json'\), 'utf8'\)\)(\.\w+)/g)) assert.equal(m[1], '.ref', file); continue; }
    assert.doesNotMatch(text, /pricing-baseline/, file);
  }
});
