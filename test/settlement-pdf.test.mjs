/* ============================================================================
   THE GUEST SETTLEMENT PDF · its lines (layout 1.1, Owner, 7 Oct 2026) —
   src/billing/pdf.js read back from its own uncompressed content streams.
   Fictional settlements, persons and figures only.
     · no rule runs through, or touches, a line of text — on any page
     · rules mark structure only: masthead, section headings, the total, the
       footer, a further page's "continued" line; never one per table row and
       never two on top of each other
     · every label, product key and agreed-rate note is printed in full
       (a key breaks after a hyphen), nothing is cut to "..."
     · layout only: every figure, date, rate and sentence is still on the page;
       the same Snapshot gives the same bytes
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSettlementPdf, PDF_WRITER_VERSION } from '../src/billing/pdf.js';
import { formatUSD } from '../src/billing/model.js';

const L = (o) => ({ Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rateSource: 'STANDARD', quantity: 1, modifiers: [], block: 'A', ...o });
const BASE = {
  Settlement_ID: 'S-TEST-0001', Revision: 1, Holder_ID: 'INV-T1', Issue_Date: '2026-10-07', Due_Date: '2026-10-28',
  Due_Date_Override: null, FX_USD_THB: 33.68, FX_USD_EUR: 0.89, Currency: 'USD',
  Engine_Version: 'billing-engine/test', Source_Hash: 'f'.repeat(64),
};
const AGREED = 'Bride & Groom only · USD 150 per room per night, the suite shared by two';

/* the shape of a real first statement: six payable lines (two at a named rate), five of the guest's own */
const ORDINARY = {
  ...BASE,
  lines: [
    L({ Person_ID: 'GT1', Item_ID: 'A2-U-SATHORN', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 6781, nights: 3, payableNights: 3, amountCents: 20342 }),
    L({ Person_ID: 'GT1', Item_ID: 'B-TRAIN-BKK-NKI', Rate_Basis: 'PER_PERSON', rateCents: 10000, nights: 1, payableNights: 1, amountCents: 10000 }),
    L({ Person_ID: 'GT1', Item_ID: 'C-SOUPHATTRA-PRESIDENTIAL', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 7500, nights: 2, payableNights: 2, amountCents: 15000, rateSource: 'SPECIAL_RATE', specialRateRef: AGREED }),
    L({ Person_ID: 'GT1', Item_ID: 'D1-SOUPHATTRA-PRESIDENTIAL', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 7500, nights: 2, payableNights: 2, amountCents: 15000, rateSource: 'SPECIAL_RATE', specialRateRef: AGREED }),
    L({ Person_ID: 'GT1', Item_ID: 'G-TRAIN-KMG-LJG', Rate_Basis: 'PER_PERSON', rateCents: 10500, nights: 1, payableNights: 1, amountCents: 10500 }),
    L({ Person_ID: 'GT1', Item_ID: 'TEMPLE-OFFERING', Rate_Basis: 'PER_PERSON', rateCents: 1500, nights: 1, payableNights: 1, amountCents: 1500 }),
    ...['E2-FLIGHT-VTE-KMG', 'I-FLIGHT-LJG-BKK'].map((Item_ID) => L({ Person_ID: 'GT1', Item_ID, Billing_Category: 'GUEST_SELF_BOOKING', block: 'B', amountCents: 0 })),
    ...['J-JATU-ROOM', 'F-JINRI-FAMILY-SUITE', 'H-VIEW-SUITE-270'].map((Item_ID) => L({ Person_ID: 'GT1', Item_ID, Billing_Category: 'GUEST_SELF_PAYMENT', block: 'B', amountCents: 0 })),
  ],
  Block_A_Total_Cents: 72342, Total_Payable_Cents: 72342,
  Block_B_Informational: ['E2-FLIGHT-VTE-KMG', 'I-FLIGHT-LJG-BKK', 'J-JATU-ROOM', 'F-JINRI-FAMILY-SUITE', 'H-VIEW-SUITE-270'],
};

/* three pages: long names, long keys, long notes, a hosted line, a refused amount, a hand-set due date, notes */
const LONG = {
  ...BASE, Settlement_ID: 'S-TEST-0002', Revision: 3, Due_Date: '2026-11-30', Due_Date_Override: '2026-11-30',
  lines: [
    ...Array.from({ length: 26 }, (_, i) => L({
      Person_ID: 'GT' + (10 + (i % 4)), Item_ID: 'X' + i + '-VERY-LONG-PRODUCT-KEY-WITHOUT-ANY-SPACES-' + i,
      Rate_Basis: i % 3 ? 'PER_PERSON_PER_NIGHT' : 'PER_ROOM', rateCents: 123456, nights: 3, payableNights: i % 2 ? 2 : 3,
      quantity: i % 5 ? 1 : 2, amountCents: 1234567 + i, rateSource: i % 4 ? 'STANDARD' : 'SPECIAL_RATE',
      specialRateRef: i % 4 ? null : 'Bride & Groom only · a long agreed note that runs over more than one line of the item column',
    })),
    L({ Person_ID: 'GT10', Item_ID: 'W-WEDDING-DINNER', Billing_Category: 'HOSTED_NO_GUEST_CHARGE', Rate_Basis: 'FLAT', amountCents: 0 }),
    L({ Person_ID: 'GT11', Item_ID: 'Q-UNPRICED-EXCURSION', Billing_Category: null, Rate_Basis: null, amountCents: null, block: null }),
    ...[1, 2, 3, 4, 5, 6].map((n) => L({ Person_ID: 'GT12', Item_ID: 'B' + n + '-SELF-BOOKED-FLIGHT-WITH-A-LONG-KEY', Billing_Category: 'GUEST_SELF_BOOKING', block: 'B', amountCents: 0 })),
  ],
  Block_A_Total_Cents: 32098742, Total_Payable_Cents: null, Block_B_Informational: [],
};
const LONG_OPTS = {
  persons: { GT10: 'Maximilian Alexander von Testenburg-Sigmaringen', GT11: 'Peggy Test', GT12: 'Somchai Testanapanich', GT13: 'An' },
  notes: ['Put the statement number in the reference line so the transfer is matched to it.'], notesHeading: 'How to pay',
};

/* LETTER paper, two totals, Block B named only, one very long informational key */
const NAMED = {
  ...BASE, Settlement_ID: 'S-TEST-0003',
  lines: [L({ Person_ID: 'GT1', Item_ID: 'A2-U-SATHORN', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 6781, nights: 3, payableNights: 3, amountCents: 20342 })],
  Block_A_Total_Cents: 20342, Total_Payable_Cents: 20300,
  Block_B_Informational: ['E2-FLIGHT-VTE-KMG', 'A-VERY-LONG-INFORMATIONAL-ITEM-KEY-THAT-NEEDS-TO-WRAP-ACROSS-THE-COLUMN'],
};
const EMPTY = { ...BASE, Settlement_ID: 'S-TEST-0004', lines: [], Block_A_Total_Cents: 0, Total_Payable_Cents: 0, Block_B_Informational: [] };

const CASES = [['ordinary', ORDINARY, {}], ['three pages', LONG, LONG_OPTS], ['letter', NAMED, { pageSize: 'LETTER' }], ['empty', EMPTY, {}]];

/* the content streams as drawn: text runs and rules */
function read(bytes) {
  const s = Buffer.from(bytes).toString('latin1');
  return [...s.matchAll(/stream\n([\s\S]*?)\nendstream/g)].map((m) => {
    const texts = [], rules = [];
    for (const line of m[1].split('\n')) {
      let t = /^BT \/(F\d) ([\d.]+) Tf 1 0 0 1 ([-\d.]+) ([-\d.]+) Tm \((.*)\) Tj ET$/.exec(line);
      if (t) { texts.push({ size: +t[2], x: +t[3], y: +t[4], s: t[5].replace(/\\(\d{3})/g, (_, o) => String.fromCharCode(parseInt(o, 8))).replace(/\\([()\\])/g, '$1') }); continue; }
      t = /^([\d.]+) G ([\d.]+) w ([-\d.]+) ([-\d.]+) m ([-\d.]+) ([-\d.]+) l S$/.exec(line);
      if (t) rules.push({ w: +t[2], x1: +t[3], y: +t[4], x2: +t[5] });
    }
    return { texts, rules };
  });
}
const text = (pages) => pages.flatMap((p) => p.texts.map((t) => t.s));

test('PDF LINES · no rule runs through or touches a line of text, on any page (descenders and capitals clear by 2pt)', () => {
  for (const [name, snap, opts] of CASES) {
    const pages = read(renderSettlementPdf(snap, opts));
    pages.forEach((p, i) => {
      for (const r of p.rules) for (const t of p.texts) {
        if (r.x2 <= t.x || r.x1 >= t.x + 4) continue;
        const below = t.y - 0.23 * t.size, above = t.y + 0.75 * t.size;
        assert.ok(r.y < below - 2 || r.y > above + 2,
          name + ' page ' + (i + 1) + ': the rule at ' + r.y + ' touches "' + t.s + '" (baseline ' + t.y + ')');
      }
    });
  }
});

test('PDF LINES · rules mark structure only — five on an ordinary statement, never one per row, never doubled', () => {
  const [page] = read(renderSettlementPdf(ORDINARY, {}));
  /* masthead · "Payable to Haruthai & Suthep" · the total · "Your own arrangements" · the footer */
  assert.equal(page.rules.length, 5, 'the 1.0 layout drew 19 here: one per row, and one doubled over the total');
  const ys = page.rules.map((r) => r.y).sort((a, b) => b - a);
  const heading = (s) => page.texts.find((t) => t.s === s).y;
  assert.ok(ys.some((y) => y < heading('Payable to Haruthai & Suthep') && y > heading('PERSON')), 'the section rule sits under its heading');
  const total = page.texts.find((t) => t.s === 'Total payable to Haruthai & Suthep');
  const temple = page.texts.find((t) => t.s === 'TEMPLE-OFFERING');
  const totalRules = ys.filter((y) => y > total.y && y < temple.y);
  assert.equal(totalRules.length, 1, 'one rule above the total, between it and the last row');
  assert.equal(ys.filter((y) => y < total.y && y > heading('Your own arrangements')).length, 0, 'no rule under the total');
  for (const [name, snap, opts] of CASES) {
    read(renderSettlementPdf(snap, opts)).forEach((p, i) => {
      assert.ok(p.rules.length <= 5, name + ' page ' + (i + 1) + ': ' + p.rules.length + ' rules');
      const y = p.rules.map((r) => r.y).sort((a, b) => b - a);
      y.forEach((v, k) => k && assert.ok(y[k - 1] - v >= 14, name + ' page ' + (i + 1) + ': two rules ' + (y[k - 1] - v) + 'pt apart'));
    });
  }
});

test('PDF LINES · every label, key and agreed-rate note is printed in full — a key breaks after a hyphen, nothing ends in "..."', () => {
  for (const [name, snap, opts] of CASES) {
    const runs = text(read(renderSettlementPdf(snap, opts)));
    assert.deepEqual(runs.filter((s) => /\.\.\.$/.test(s)), [], name + ': nothing is cut short');
    const flat = runs.join('').replace(/\s+/g, '');
    const labels = [...(snap.lines || []).flatMap((l) => [opts.persons && opts.persons[l.Person_ID] || l.Person_ID, l.Item_ID, l.specialRateRef]),
      ...snap.Block_B_Informational].filter(Boolean);
    for (const label of labels) assert.ok(flat.includes(label.replace(/\s+/g, '')), name + ': "' + label + '" in full');
  }
  const ordinary = text(read(renderSettlementPdf(ORDINARY, {})));
  assert.ok(ordinary.includes('D1-SOUPHATTRA-PRESIDENTIAL'), 'the suite key on one line, not "...PRESIDENTIA" + "L"');
  const long = text(read(renderSettlementPdf(LONG, LONG_OPTS)));
  assert.ok(long.includes('X0-VERY-LONG-PRODUCT-KEY-') && long.includes('WITHOUT-ANY-SPACES-0'), 'a long key breaks after a hyphen');
  assert.ok(['Maximilian Alexander', 'von', 'Testenburg-', 'Sigmaringen'].every((s) => long.includes(s)), 'a long name wraps (after its hyphen), never cut');
});

test('PDF LINES · layout only — every figure, rate, date, FX row and sentence is still printed; three pages break cleanly', () => {
  for (const [name, snap, opts] of CASES) {
    const pages = read(renderSettlementPdf(snap, opts));
    const runs = text(pages);
    for (const l of snap.lines) {
      if (l.block === 'B') continue;
      if (Number.isFinite(l.amountCents)) assert.ok(runs.includes(formatUSD(l.amountCents)), name + ': ' + formatUSD(l.amountCents));
      if (Number.isFinite(l.rateCents)) assert.ok(runs.includes('at ' + formatUSD(l.rateCents)), name + ': the rate');
    }
    if (Number.isFinite(snap.Total_Payable_Cents)) assert.ok(runs.includes(formatUSD(snap.Total_Payable_Cents)), name + ': the total');
    else assert.ok(runs.includes('Manual review required'), name + ': no total is stated');
    for (const s of [snap.Issue_Date, snap.Due_Date, '1 USD = 33.68 THB', '1 USD = 0.89 EUR', 'Total payable to Haruthai & Suthep',
      'Please arrange your transfer so that this settlement is settled within 21 days after your statement is issued.']) {
      assert.ok(runs.join(' ').replace(/\s+/g, ' ').includes(s), name + ': "' + s + '"');
    }
    pages.forEach((p, i) => {
      /* the content stays above the footer's rule (78pt) by the footer's own band; only the footer lives below it */
      for (const t of p.texts) if (t.y > 78) assert.ok(t.y - 0.23 * t.size >= 90, name + ' page ' + (i + 1) + ': "' + t.s + '" in the footer band');
      assert.ok(p.texts.some((t) => t.s === 'page ' + (i + 1) + ' of ' + pages.length), name + ': page ' + (i + 1) + ' is numbered');
    });
  }
  const long = read(renderSettlementPdf(LONG, LONG_OPTS));
  assert.equal(long.length, 3);
  assert.ok(long[1].texts.some((t) => t.s === 'ITEM'), 'a further page repeats the column labels');
  const lastRow = long.findIndex((p) => p.texts.some((t) => t.s === 'Q-UNPRICED-EXCURSION'));
  assert.ok(long[lastRow].texts.some((t) => t.s === 'Total payable to Haruthai & Suthep'), 'the total is never left alone on a page without its last row');
});

test('PDF LINES · the same Snapshot gives the same bytes, and the file names this layout\'s writer', () => {
  const a = renderSettlementPdf(LONG, LONG_OPTS), b = renderSettlementPdf(LONG, LONG_OPTS);
  assert.deepEqual(a, b);
  assert.equal(PDF_WRITER_VERSION, 'guest-settlement-pdf/1.1');
  assert.match(Buffer.from(a).toString('latin1'), /\/Producer \(guest-settlement-pdf\/1\.1\)/);
});

test('PDF LINES · layout only — every cell is still printed: persons, bases, rates, nights, named rates, markers, notes, sentences', () => {
  const count = (runs, s) => runs.filter((t) => t === s).length;
  const flat = (runs) => runs.join(' ').replace(/\s+/g, ' ');

  const o = text(read(renderSettlementPdf(ORDINARY, {})));
  assert.equal(count(o, 'GT1'), 11, 'one person cell per line');
  assert.equal(count(o, 'per person per night'), 3); assert.equal(count(o, 'per person'), 3);
  assert.equal(count(o, '3 nights'), 1); assert.equal(count(o, '2 nights'), 2); assert.equal(count(o, '1 night'), 3);
  assert.equal(count(o, 'named special rate'), 2);
  assert.equal(count(o, 'you book and pay this yourself'), 2); assert.equal(count(o, 'you pay this yourself on site'), 3);
  for (const s of ['Guest Settlement', 'S-TEST-0001 · Revision V1', 'ISSUED', 'DUE', 'CURRENCY', 'USD', 'Payable to Haruthai & Suthep',
    'Your own arrangements', 'Exchange rates frozen with this statement', 'PERSON', 'ITEM', 'BASIS', 'NIGHTS / QTY', 'AMOUNT', 'HOW IT WORKS']) {
    assert.ok(o.includes(s), s);
  }
  for (const s of ['Shown for your information only. You arrange and pay for these yourself, and they are never added to the amount payable to Haruthai & Suthep above.',
    'These rates were frozen when this statement was issued and do not move afterwards. The settlement itself is kept in USD.']) assert.ok(flat(o).includes(s), s);

  const l = text(read(renderSettlementPdf(LONG, LONG_OPTS)));
  assert.equal(count(l, 'named special rate'), 7);
  assert.equal(count(l, 'per room'), 9); assert.equal(count(l, 'per person per night'), 17); assert.equal(count(l, 'at USD 1234.56'), 26);
  assert.equal(count(l, '3 nights'), 10); assert.equal(count(l, '2 of 3 nights'), 10);
  assert.equal(count(l, '3 nights x 2'), 3); assert.equal(count(l, '2 of 3 nights x 2'), 3);
  for (const s of ['hosted, no charge', 'USD 0.00', 'not yet determined', 'REVIEW', 'How to pay']) assert.ok(l.includes(s), s);
  assert.equal(count(l, 'Manual review required'), 2, 'the review box and the total');
  for (const s of ['This due date was set by hand and replaces the standard schedule.',
    'At least one amount on this statement could not be derived from the structured source, so no total is stated.',
    'Put the statement number in the reference line so the transfer is matched to it.']) assert.ok(flat(l).includes(s), s);

  const n = text(read(renderSettlementPdf(NAMED, { pageSize: 'LETTER' })));
  assert.ok(n.includes('Block A')); assert.equal(count(n, 'USD 203.42'), 2); assert.ok(n.includes('USD 203.00'));
  assert.ok(text(read(renderSettlementPdf(EMPTY, {}))).includes('No items are payable to Haruthai & Suthep on this statement.'));
});

/* rows on a fixed grid, swept across every page boundary: n two-line rows, the first one k lines taller, three of the guest's own */
function boundary(n, k) {
  const rows = Array.from({ length: n }, (_, i) => L({ Person_ID: 'GT1', Item_ID: 'R' + i, Rate_Basis: 'PER_PERSON', rateCents: 1000, nights: 1, payableNights: 1, amountCents: 1000 }));
  const own = [1, 2, 3].map((j) => L({ Person_ID: 'GT1', Item_ID: 'OWN-' + j, Billing_Category: 'GUEST_SELF_PAYMENT', block: 'B', amountCents: 0 }));
  return read(renderSettlementPdf({ ...BASE, lines: [...rows, ...own], Block_A_Total_Cents: 1000 * n, Total_Payable_Cents: 1000 * n,
    Block_B_Informational: own.map((x) => x.Item_ID) }, { items: { R0: 'word '.repeat(7 * k).trim() } }));
}
const SWEEP = [];
for (let n = 12; n <= 34; n++) for (let k = 0; k <= 8; k++) SWEEP.push([n, k, boundary(n, k)]);

test('PDF LINES · page breaks: the total never stands alone — the last row keeps it company (swept across the boundary)', () => {
  let decisive = 0;
  for (const [n, k, pages] of SWEEP) {
    const pageOf = (s) => pages.findIndex((p) => p.texts.some((t) => t.s === s));
    const last = 'R' + (n - 1), at = pageOf(last);
    assert.equal(pageOf('Total payable to Haruthai & Suthep'), at, n + '/' + k + ': the total on the last row\'s page');
    /* the case the keep is for: the last row opens its page although the page before had room for that row alone */
    const rowsHere = pages[at].texts.filter((t) => /^R\d+$/.test(t.s));
    if (at > 0 && rowsHere.length === 1) {
      const before = pages[at - 1].texts.filter((t) => /^R\d+$/.test(t.s)).map((t) => t.y);
      const next = Math.min(...before) - 19.5 - 10.5;   /* the baseline the last row would have taken */
      if (before.length && next - 30 >= 96 && next - 30 - 15 < 96) decisive++;
    }
  }
  assert.ok(decisive > 0, 'the sweep reaches the page break the keep exists for');
});

test('PDF LINES · page breaks: a heading never stands alone at the foot of a page — its first row, and the FX rates, come with it', () => {
  for (const [n, k, pages] of SWEEP) {
    const page = (s) => pages.find((p) => p.texts.some((t) => t.s === s));
    const a = page('Payable to Haruthai & Suthep');
    assert.ok(a.texts.some((t) => t.s === 'USD 10.00'), n + '/' + k + ': Block A\'s heading with a first row');
    const b = page('Your own arrangements');
    assert.ok(b.texts.some((t) => t.s === 'OWN-1'), n + '/' + k + ': Block B\'s heading with its first row');
    const fx = page('Exchange rates frozen with this statement');
    assert.ok(fx.texts.some((t) => t.s === '1 USD = 0.89 EUR') && fx.texts.some((t) => /^These rates were frozen/.test(t.s)),
      n + '/' + k + ': the FX heading with its rates and sentence');
  }
});
