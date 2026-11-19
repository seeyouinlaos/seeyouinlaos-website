/* ============================================================================
   H&S WEDDING 2027 — THE BUDGET SOURCES, AS READ (billing-budget/1.0.0 · Owners, 15 Nov 2026)

   The comparison on the Revenue tab sets the guests' contributions (the Billing Engine) beside what the Owners recorded
   about their suppliers. This module only READS those records, from grids the Worker has already fetched:
     · 004_Budget_Finance          — the budget lines (one row per line, a labelled header row, a summary block above it)
     · 007_Deposit/Payment_Details — one column per supplier: contract totals, deposits and payments, labelled rows
     · 002_Accommodation_Details   — the DISPLAY rows of each product (Category, Package, Check In / Out Date, Name, …)

   PURE. No network, no clock, nothing written, nothing cached. A cell that cannot be read is NAMED, never read as 0;
   a figure the sheet computes from another (a formula) is told apart from one the Owners typed, because a currency
   conversion done inside a sheet is not an approved reporting conversion (Owners' order, 15 Nov 2026).

   NOT A PRICING SOURCE. Nothing here is a guest rate: the engine prices from the structured 002 rows and 009 only
   (docs/PRICING-SOURCE-OF-TRUTH.md). The 002 display labels read here are never added to ITEM_FIELDS, and a missing or
   repeated display label only blanks that field for the comparison — it never touches the engine's own 002 read.
   ========================================================================== */

/** The tabs the comparison reads, beside (never inside) the billing source's own batch read (pricing guard C4). */
export const BUDGET_TABS = Object.freeze({
  budget: '004_Budget_Finance', payments: '007_Deposit/Payment_Details', items: '002_Accommodation_Details', register: '006_Guestlist',
  rates: '009_Special_Rates', roomList: '012_Room Number and Rate List',
});

/** GOOGLE 012 — the Owners' room number and rate list (Owners, 17 Nov 2026): a READ-ONLY reconciliation reference. One row per hotel
    room: building, room type, the hotel's room number, dates and up to three guests (their names as the Owners typed them). Never
    a source of a rate or a booking; a row without a room type is skipped. */
export function parseRoomList012(grid) {
  const rows = Array.isArray(grid) ? grid : [];
  const head = (rows[0] || []).map((c) => clean(c).toLowerCase());
  const at = (name) => head.findIndex((h) => h === name);
  const guestCols = head.map((h, i) => (/^guest\s*0?\d+$/.test(h) ? i : -1)).filter((i) => i >= 0);
  const out = [];
  let building = '';
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    if (clean(row[at('building')])) building = clean(row[at('building')]);
    const roomType = clean(row[at('room type')]); if (!roomType) continue;
    out.push({ row: r + 1, building, roomType, roomNo: clean(row[at('rm no.')]), checkIn: clean(row[at('check in date')]), checkOut: clean(row[at('check out date')]),
      guests: guestCols.map((i) => clean(row[i])).filter(Boolean) });
  }
  return out;
}
/** A tab's whole read range, quoted exactly as src/billing/source.js quotes its own (so a prefetched grid is found). */
export const rangeOfTab = (tab) => "'" + String(tab).replace(/'/g, "''") + "'!A1:AZ";

const clean = (v) => String(v == null ? '' : v).trim();
const norm = (v) => clean(v).replace(/\s+/g, ' ').toLowerCase();
const isFormula = (f) => typeof f === 'string' && f.trim().startsWith('=');
const asRows = (g) => (Array.isArray(g) ? g.map((r) => (Array.isArray(r) ? r : [])) : []);
const colLetter = (j) => { let s = '', n = j + 1; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
export { colLetter };

/** A number as the sheet holds it: a finite number, or a plain numeric text (thousands commas / spaces allowed).
    '' → { empty: true }; anything else → { bad: true } — never 0. */
export function readNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? { ok: true, value: v } : { bad: true };
  const s = clean(v);
  if (!s) return { empty: true };
  const t = s.replace(/[,\s]/g, '');
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { bad: true };
  return { ok: true, value: Number(t) };
}
const numOrNull = (v) => { const n = readNumber(v); return n.ok ? n.value : null; };

/* ------------------------------------------------------------------ dates */

const pad = (n) => String(n).padStart(2, '0');
function isoOf(y, m, d) {
  if (!(y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return y + '-' + pad(m) + '-' + pad(d);
}
/** "DD.MM.YYYY" (the workbook's own date form) → 'YYYY-MM-DD'; a sheet serial date number also reads; else null. */
export function parseDate(v) {
  if (typeof v === 'number' && Number.isFinite(v) && v > 20000 && v < 80000) {
    const dt = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000);
    return isoOf(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(clean(v).replace(/\s+/g, ''));
  return m ? isoOf(+m[3], +m[2], +m[1]) : null;
}
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d) + n * 86400000); return dt.getUTCFullYear() + '-' + pad(dt.getUTCMonth() + 1) + '-' + pad(dt.getUTCDate()); };
/** The nights of a stay: every date from `from` (incl.) to `to` (excl.). */
export function nightsBetween(from, to) {
  const out = [];
  if (!from || !to || from >= to) return out;
  for (let d = from; d < to && out.length < 400; d = addDays(d, 1)) out.push(d);
  return out;
}

/**
 * A "Date or period" cell, in the forms the workbook uses: "24.02.2027", "22. - 24.02.2027", "25-27..02.2027",
 * "28.02-01.03..2027", "26.02. - 01.03.2027" (spaces and doubled dots normalised). A range gives its nights (from incl. …
 * to excl.); a single date is a day (a ticket, an event). Anything else — or a range that ends before it starts — is null:
 * the line has no readable period and is never matched by date.
 */
export function parsePeriod(text) {
  const raw = clean(text);
  if (!raw) return null;
  const t = raw.replace(/\s+/g, '').replace(/\.{2,}/g, '.');
  let m, from = null, to = null;
  if ((m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t))) {
    const d = isoOf(+m[3], +m[2], +m[1]);
    return d ? { text: raw, single: true, from: d, to: d, nights: [] } : null;
  }
  if ((m = /^(\d{1,2})\.?-(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t))) { from = isoOf(+m[4], +m[3], +m[1]); to = isoOf(+m[4], +m[3], +m[2]); }
  else if ((m = /^(\d{1,2})\.(\d{1,2})\.?-(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t))) { from = isoOf(+m[5], +m[2], +m[1]); to = isoOf(+m[5], +m[4], +m[3]); }
  else return null;
  if (!from || !to || from >= to) return null;
  return { text: raw, single: false, from, to, nights: nightsBetween(from, to) };
}

/* ------------------------------------------------------- 004 · the budget */

/** The 004 header labels (as the sheet writes them, compared whitespace- and case-insensitively). */
export const BUDGET_LABELS = Object.freeze({
  id: 'ID', item: 'Item', vendor: 'Vendor', category: 'Category', details: 'Details', rate: 'Rate USD', qty: 'Qty',
  mult: 'Nights, Rooms, EA', resp: 'Rspn.', budget: 'Budget USD', actual: 'Actual USD', paid: 'Amount paid USD',
  paidBy: 'Paid by', payDate: 'Pay Date', recheck: 'Haruthai Recheck', status: 'Status', period: 'Date or period',
  location: 'Location', currency: 'Currency', approval: 'Suthep approval', done: 'Done',
});
const BUDGET_REQUIRED = ['item', 'vendor', 'category', 'details', 'rate', 'qty', 'mult', 'budget', 'actual', 'paid', 'status', 'period', 'currency', 'approval'];
/** The summary block above the header (label cell, the value in the cell below it). COST PER GUEST is never read. */
export const BUDGET_TOTAL_LABELS = Object.freeze({
  totalBudget: 'TOTAL BUDGET', budgetLeft: 'BUDGET LEFT', committed: 'COMMITTED', totalPlanned: 'TOTAL PLANNED BUDGET',
  budgetConfirm: 'BUDGET CONFIRM (Actual)', amountPaid: 'AMOUNT PAID', grossCost: 'GROSS PROJECT COST',
  guestContributions: 'GUEST CONTRIBUTIONS', netHostCost: 'NET HOST COST',
});

/**
 * 004_Budget_Finance, read. `values` is the grid as Google computes it (UNFORMATTED_VALUE), `formulas` the same range
 * with FORMULA rendering (optional — without it no cell is known to be typed). Returns
 *   { ok, problems[], headerRow, columns{key: letter}, lines[], totals{}, totalRow }
 * Every line keeps its sheet row; a line whose Rate / Qty / "Nights, Rooms, EA" / Budget cannot be read is kept with
 * `readable: false` and its reasons — it is never read as 0.
 */
export function parseBudget004(values, formulas) {
  const V = asRows(values), F = asRows(formulas);
  const known = Array.isArray(formulas);
  const problems = [];
  const want = Object.fromEntries(Object.entries(BUDGET_LABELS).map(([k, l]) => [k, norm(l)]));
  let headerRow = -1;
  for (let r = 0; r < Math.min(V.length, 60); r++) {
    const cells = V[r].map(norm);
    if (cells.includes(want.item) && cells.includes(want.category) && cells.includes(want.budget)) { headerRow = r; break; }
  }
  if (headerRow < 0) return { ok: false, problems: ['004 has no header row naming Item, Category and Budget USD'], lines: [], totals: {}, columns: {} };
  const cols = {};
  const head = V[headerRow].map(norm);
  for (const [k, label] of Object.entries(want)) {
    const at = head.reduce((a, c, j) => (c === label ? a.concat(j) : a), []);
    if (at.length > 1) problems.push('004 header names "' + BUDGET_LABELS[k] + '" in columns ' + at.map(colLetter).join(' and '));
    if (at.length === 1) cols[k] = at[0];
  }
  const missing = BUDGET_REQUIRED.filter((k) => cols[k] === undefined);
  if (missing.length || problems.length) {
    return { ok: false, problems: problems.concat(missing.length ? ['004 header lacks ' + missing.map((k) => '"' + BUDGET_LABELS[k] + '"').join(', ')] : []),
      lines: [], totals: {}, columns: {}, headerRow: headerRow + 1 };
  }
  const cell = (r, k) => (cols[k] === undefined ? '' : V[r][cols[k]]);
  const form = (r, k) => (cols[k] === undefined ? '' : (F[r] || [])[cols[k]]);

  /* the summary block: a known label, its value in the cell right below */
  const totals = {};
  const wantTotals = Object.entries(BUDGET_TOTAL_LABELS).map(([k, l]) => [k, norm(l)]);
  for (let r = 0; r < headerRow; r++) {
    V[r].forEach((c, j) => {
      const hit = wantTotals.find(([, l]) => l === norm(c));
      if (!hit) return;
      const n = readNumber((V[r + 1] || [])[j]);
      totals[hit[0]] = n.ok ? n.value : null;
      totals[hit[0] + 'Cell'] = colLetter(j) + (r + 2);
      /* the cell's own formula, as the sheet holds it (1.1.0): only to NAME the rows it sums — never to repair or recompute it */
      const f = (F[r + 1] || [])[j];
      totals[hit[0] + 'Formula'] = known && isFormula(f) ? clean(f) : null;
    });
  }

  const lines = [];
  let totalRow = null;
  for (let r = headerRow + 1; r < V.length; r++) {
    const row = V[r];
    if (!row.some((c) => clean(c) !== '')) continue;
    const item = clean(cell(r, 'item'));
    if (/^total\b/i.test(item)) {
      totalRow = r + 1;
      const after = [];
      for (let q = r + 1; q < V.length; q++) if (V[q].some((c) => clean(c) !== '')) after.push(q + 1);
      if (after.length) problems.push('004 row' + (after.length === 1 ? ' ' : 's ') + after.join(', ') + ' below the TOTAL row ' + (r + 1) + (after.length === 1 ? ' is' : ' are') + ' not read as budget lines');
      break;
    }
    const why = [];
    const n = {};
    for (const k of ['rate', 'qty', 'mult', 'budget']) {
      const x = readNumber(cell(r, k));
      if (x.ok) n[k] = x.value; else { n[k] = null; why.push('"' + BUDGET_LABELS[k] + '" ' + (x.empty ? 'is empty' : 'is not a number')); }
    }
    const actual = readNumber(cell(r, 'actual')), paid = readNumber(cell(r, 'paid'));
    if (paid.bad) why.push('"Amount paid USD" is not a number');
    const fActual = clean(form(r, 'actual'));
    const done = cell(r, 'done');
    lines.push({
      row: r + 1,
      id: clean(cell(r, 'id')) || null,
      item, vendor: clean(cell(r, 'vendor')), category: clean(cell(r, 'category')), details: clean(cell(r, 'details')),
      rate: n.rate, qty: n.qty, mult: n.mult, budget: n.budget,
      actual: actual.ok ? actual.value : null,
      /* "Actual USD" that is only the same row's Budget cell again (=K<row>) is not an actual cost */
      actualIsBudget: known ? new RegExp('^=\\s*\\$?' + colLetter(cols.budget) + '\\$?' + (r + 1) + '\\s*$', 'i').test(fActual) : null,
      budgetIsFormula: known ? isFormula(form(r, 'budget')) : null,
      paid: paid.ok ? paid.value : null,
      paidBy: clean(cell(r, 'paidBy')) || null, payDateText: clean(cell(r, 'payDate')) || null, payDate: parseDate(cell(r, 'payDate')),
      status: clean(cell(r, 'status')) || null,
      periodText: clean(cell(r, 'period')) || null, period: parsePeriod(cell(r, 'period')),
      detailsPeriod: parsePeriod(cell(r, 'details')),
      location: clean(cell(r, 'location')) || null, currency: clean(cell(r, 'currency')) || null,
      approval: clean(cell(r, 'approval')) || null,
      done: done === true || clean(done).toUpperCase() === 'TRUE' ? true : (done === false || clean(done).toUpperCase() === 'FALSE' ? false : null),
      readable: why.length === 0,
      problems: why,
    });
  }
  return { ok: true, problems, headerRow: headerRow + 1, columns: Object.fromEntries(Object.entries(cols).map(([k, j]) => [k, colLetter(j)])), lines, totals, totalRow };
}

/* -------------------------------------------- 007 · suppliers and payments */

const CURRENCIES = ['THB', 'EUR', 'USD'];
/* typed: true (the Owners typed it), false (the sheet computes it), null (the formula read is missing — not known, so never
   counted as typed) */
const money = (v, f, known) => { const n = readNumber(v); return n.ok ? { value: n.value, typed: known ? !isFormula(f) : null, formula: known && isFormula(f) ? clean(f) : null } : null; };

/**
 * 007_Deposit/Payment_Details, read: one supplier per column under the "Vendor" row, the facts in labelled rows of
 * column A. A payer block opens at "<Name> THB|EUR|USD" and carries "Paid Amount", "Payment Date", "Paid By",
 * "Payment Method". "Paid Amount" states no currency: it is read in the currency whose TYPED figure in the same column
 * equals it (the block's own figures first, then the deposit, then the total) — else "currency not stated".
 * Cells under a row without a known label are returned in `unread` (named, not read); a currency label directly above a
 * number in column A is the sheet's own exchange constant (`constants`), never a reporting conversion.
 */
export function parseVendors007(values, formulas) {
  const V = asRows(values), F = asRows(formulas);
  const known = Array.isArray(formulas);
  const problems = [], unread = [], constants = [];
  const label = (r) => norm(V[r][0]);
  const vendorRow = V.findIndex((row, r) => label(r) === 'vendor');
  if (vendorRow < 0) return { ok: false, problems: ['007 has no "Vendor" row'], vendors: [], unread, constants };
  const vcols = [];
  V[vendorRow].forEach((c, j) => { if (j > 0 && clean(c)) vcols.push(j); });
  const vendors = vcols.map((j) => ({ col: colLetter(j), j, vendor: clean(V[vendorRow][j]), category: null, total: {}, depositPct: null, deposit: {}, payments: [] }));
  const byJ = new Map(vendors.map((v) => [v.j, v]));
  let block = null, blockNo = 0;   /* the payer block the rows below belong to — every payer row starts a new one */
  const blockPay = new Map();       /* `${blockNo}|${j}` → { block, stated, list: the payments of that column, in row order } */
  const payerRows = new Map();      /* a payer named twice is read as two blocks, and said */
  /* a row naming what is still owed or already summed ("Balance USD", "Outstanding THB", "Amount due USD", …) is no payer: it is
     named as unread, never read as a payment block (pricing guard, 17 Nov 2026) */
  const NOT_PAYER = /^(balance|outstanding|remaining|remainder|rest|due|amount due|open|open balance|unpaid|refund|total|subtotal|sum|paid)\b/;
  const knownLabel = (l) => l === 'vendor' || l === 'category' || /^total price (thb|eur|usd)$/.test(l) || l === 'deposit %' ||
    /^deposit amount (thb|eur|usd)$/.test(l) || (/^[a-z][a-z .'-]* (thb|eur|usd)$/.test(l) && !NOT_PAYER.test(l)) ||
    ['paid amount', 'payment date', 'paid by', 'payment method'].includes(l);

  for (let r = 0; r < V.length; r++) {
    const row = V[r];
    const l = label(r);
    if (r === vendorRow) continue;
    const anyCell = row.some((c, j) => j > 0 && clean(c) !== '');
    /* the sheet's own exchange constant: a currency code in column A with a number right below it */
    if (CURRENCIES.includes(clean(V[r][0]).toUpperCase()) && readNumber((V[r + 1] || [])[0]).ok) {
      constants.push({ currency: clean(V[r][0]).toUpperCase(), value: readNumber(V[r + 1][0]).value, cell: 'A' + (r + 2) });
    }
    if (!knownLabel(l)) {
      /* a balance-like row ("Balance USD", …) ends the payer block above it: a "Paid Amount" below it is never credited to that payer */
      if (/^[a-z][a-z .'-]* (thb|eur|usd)$/.test(l) && NOT_PAYER.test(l)) { block = null; blockNo += 1; }
      if (anyCell) unread.push({ row: r + 1, label: clean(V[r][0]) || null, cells: row.map((c, j) => ({ j, c })).filter((x) => x.j > 0 && clean(x.c) !== '')
        .map((x) => ({ col: colLetter(x.j), vendor: byJ.has(x.j) ? byJ.get(x.j).vendor : null, value: clean(x.c) })) });
      continue;
    }
    /* a known row: every non-empty cell outside a supplier column is named as unread */
    row.forEach((c, j) => { if (j > 0 && !byJ.has(j) && clean(c) !== '') unread.push({ row: r + 1, label: clean(V[r][0]), cells: [{ col: colLetter(j), vendor: null, value: clean(c) }] }); });
    let m;
    for (const v of vendors) {
      const x = row[v.j], f = (F[r] || [])[v.j];
      if (l === 'category') { v.category = clean(x) || null; continue; }
      if ((m = /^total price (thb|eur|usd)$/.exec(l))) { const a = money(x, f, known); if (a) v.total[m[1].toUpperCase()] = a; continue; }
      if (l === 'deposit %') { v.depositPct = numOrNull(x); continue; }
      if ((m = /^deposit amount (thb|eur|usd)$/.exec(l))) { const a = money(x, f, known); if (a) v.deposit[m[1].toUpperCase()] = a; continue; }
    }
    if ((m = /^([a-z][a-z .'-]*) (thb|eur|usd)$/.exec(l)) && !/^total price$|^deposit amount$/.test(m[1]) && !NOT_PAYER.test(m[1])) {
      const name = clean(V[r][0]).replace(/\s+(THB|EUR|USD)$/i, '');
      /* "Ann THB" then "Ann USD" open ONE block; the same payer again after a payment row opens a new one */
      const paidInBlock = [...blockPay].some(([k, b]) => k.startsWith(blockNo + '|') && b.list.length > 0);
      if (block !== name || paidInBlock) {
        blockNo += 1;
        const seen = payerRows.get(name.toLowerCase());
        if (seen) problems.push('007 names the payer "' + name + '" again in row ' + (r + 1) + ' (first in row ' + seen + ') — read as a separate block');
        else payerRows.set(name.toLowerCase(), r + 1);
      }
      block = name;
      for (const v of vendors) {
        const a = money(row[v.j], (F[r] || [])[v.j], known);
        const k = blockNo + '|' + v.j;
        if (!blockPay.has(k)) blockPay.set(k, { block, stated: {}, list: [] });
        if (a) blockPay.get(k).stated[m[2].toUpperCase()] = a;
      }
      continue;
    }
    if (['paid amount', 'payment date', 'paid by', 'payment method'].includes(l)) {
      for (const v of vendors) {
        const k = blockNo + '|' + v.j;
        if (!blockPay.has(k)) blockPay.set(k, { block: block || null, stated: {}, list: [] });
        const B = blockPay.get(k), x = row[v.j], f = (F[r] || [])[v.j];
        /* every "Paid Amount" is a payment of its own; the rows below it describe the latest one — never overwrite one */
        if (l === 'paid amount') { if (clean(x) !== '') B.list.push({ amount: money(x, f, known), amountText: clean(x), row: r + 1 }); continue; }
        const field = l === 'payment date' ? 'dateText' : l === 'paid by' ? 'by' : 'method';
        /* paired in order: the first payment of this column still without it (two amounts, then two dates, pair 1-1 and 2-2);
           a blank cell uses up its payment's place, so the next value is the next payment's (review, 17 Nov 2026) */
        const p = B.list.find((y) => y[field] == null);
        if (clean(x) === '') { if (p) p[field] = ''; continue; }
        if (!p) { unread.push({ row: r + 1, label: clean(V[r][0]), cells: [{ col: v.col, vendor: v.vendor, value: clean(x) }] }); continue; }
        if (field === 'dateText') { p.dateText = clean(x); p.date = parseDate(x); } else p[field] = clean(x);
      }
    }
  }

  /* the payments: a "Paid Amount" in the currency whose TYPED figure in the same column equals it */
  for (const [k, B] of blockPay) for (const p0 of B.list) {
    const p = { ...p0, block: B.block, stated: B.stated };
    if (!p.amount && !p.amountText) continue;
    const v = byJ.get(Number(k.split('|').pop()));
    if (!v) continue;
    const pay = { block: p.block, row: p.row, cell: v.col + p.row, amount: p.amount ? p.amount.value : null, amountText: p.amountText || null,
      typed: p.amount ? p.amount.typed : null, date: p.date || null, dateText: p.dateText || null, by: p.by || null, method: p.method || null,
      currency: null, currencyBasis: null };
    if (!p.amount) { pay.currencyBasis = 'the amount is not a number'; v.payments.push(pay); continue; }
    const tiers = [['the payer\'s own figure', p.stated], ['the deposit', v.deposit], ['the total price', v.total]];
    for (const [what, set] of tiers) {
      const eq = CURRENCIES.filter((c) => set[c] && set[c].typed === true && Math.round(set[c].value * 100) === Math.round(p.amount.value * 100));
      if (eq.length === 1) { pay.currency = eq[0]; pay.currencyBasis = 'equals ' + what + ' in ' + eq[0] + ' (typed)'; break; }
      if (eq.length > 1) { pay.currencyBasis = 'equals ' + what + ' in ' + eq.join(' and ') + ' — currency not stated'; break; }
    }
    if (!pay.currency && !pay.currencyBasis) pay.currencyBasis = known ? 'currency not stated (no typed figure of this supplier equals it)' : 'currency not stated (the typed figures could not be read)';
    v.payments.push(pay);
  }
  for (const v of vendors) v.payments.sort((a, b) => (a.row || 0) - (b.row || 0));
  if (!known) problems.push('007 was read without its formulas: no figure is known to be typed, so none counts as a contract or a payment');
  return { ok: true, problems, typedKnown: known, vendors: vendors.map(({ j, ...rest }) => rest), unread, constants, vendorRow: vendorRow + 1 };
}

/* ------------------------------------------------ 002 · the display rows */

/** The display labels of 002 the comparison reads (never engine input — the engine reads ITEM_FIELDS only). */
export const DISPLAY_LABELS = Object.freeze({
  category: 'Category', package: 'Package', checkIn: 'Check In Date', checkOut: 'Check Out Date',
  name: 'Name', room: 'Room', roomsAvailable: 'Rooms available', nights: 'Number of Nights',
});

/**
 * 002 product-in-columns: per Item_ID, the display facts of its column. A label that is missing or written twice blanks
 * that field (named in `problems`), nothing else. An Item_ID in two columns (an older version beside the current one)
 * keeps the first column whose facts agree; a disagreement is named.
 */
export function parseItemDisplay(grid) {
  const V = asRows(grid);
  const problems = [];
  let labelCol = -1, idRow = -1;
  for (let r = 0; r < V.length && idRow < 0; r++) { const j = V[r].findIndex((c) => clean(c) === 'Item_ID'); if (j >= 0) { idRow = r; labelCol = j; } }
  if (idRow < 0) return { ok: false, problems: ['002 has no Item_ID row'], items: {} };
  const rowsOf = {};
  for (const [k, l] of Object.entries(DISPLAY_LABELS)) {
    const at = V.reduce((a, row, r) => (norm(row[labelCol]) === norm(l) ? a.concat(r) : a), []);
    if (at.length === 1) rowsOf[k] = at[0];
    else problems.push('002 ' + (at.length ? 'labels "' + l + '" in rows ' + at.map((r) => r + 1).join(' and ') : 'has no row labelled "' + l + '"'));
  }
  const items = {};
  V[idRow].forEach((c, j) => {
    const id = clean(c);
    if (j === labelCol || !id) return;
    const at = (k) => (rowsOf[k] === undefined ? '' : V[rowsOf[k]][j]);
    const rec = {
      Item_ID: id, column: colLetter(j),
      category: clean(at('category')) || null, package: clean(at('package')) || null,
      checkIn: parseDate(at('checkIn')), checkOut: parseDate(at('checkOut')),
      checkInText: clean(at('checkIn')) || null, checkOutText: clean(at('checkOut')) || null,
      name: clean(at('name')).replace(/\s+/g, ' ') || null, room: clean(at('room')).replace(/\s+/g, ' ') || null,
      roomsAvailable: numOrNull(at('roomsAvailable')), nights: numOrNull(at('nights')),
    };
    if (!items[id]) { items[id] = rec; return; }
    const a = items[id];
    if (['category', 'package', 'checkIn', 'checkOut'].some((k) => a[k] !== rec[k])) problems.push('002 carries ' + id + ' in columns ' + a.column + ' and ' + rec.column + ' with different display facts — the first is read');
  });
  return { ok: true, problems, items, labelColumn: colLetter(labelCol), rows: Object.fromEntries(Object.entries(rowsOf).map(([k, r]) => [k, r + 1])) };
}

/* ------------------------------------------------ 009 · rows, with their sheet row */

/**
 * 009_Special_Rates as rows that keep their SHEET ROW (for naming the row behind a line H&S booked and paid — pricing
 * guard, 16 Nov 2026). Read from the budget's own grid: the engine's own 009 read (loadSpecialRates) is never touched,
 * because its records feed the statement's source hash. Every header cell becomes a field, exactly as written.
 */
export function parseSpecialRateRows(grid) {
  const V = asRows(grid);
  const h = V.findIndex((r) => r.some((c) => clean(c) === 'Item_ID') && r.some((c) => clean(c) === 'Rate_Per_Person_Night'));
  if (h < 0) return { ok: false, problems: ['009 has no header row naming Item_ID and Rate_Per_Person_Night'], rows: [] };
  const head = V[h].map(clean);
  const rows = [];
  for (let r = h + 1; r < V.length; r++) {
    if (!V[r].some((c) => clean(c) !== '')) continue;
    const o = { row: r + 1 };
    head.forEach((k, j) => { if (k) o[k] = V[r][j] === undefined ? '' : V[r][j]; });
    rows.push(o);
  }
  return { ok: true, problems: [], rows };
}

/* ------------------------------------- 004 · a negative row and the row it neutralises */

/**
 * THE NEUTRALISING ENTRIES OF 004 (Owners' consolidated order, 19 Nov 2026): 004 records a cost the hosts do not carry — a guest's
 * own room, a guest's ticket, a private trip — as a positive row AND its mirror with a negative quantity, so its net total (J2)
 * leaves it out. Each negative row is paired ONE-TO-ONE with the positive row it mirrors: the same Item, Vendor, Category and
 * Details, the same |Rate| and the same |Budget USD| — the nearest such row above it first, a row used once only. A negative row
 * without such a row is returned unpaired (named on the console, never guessed).
 * @returns {{ pairs: Array<{ negative: number, positive: number|null }>, mirrorOf: Map<number, number>, neutralisedBy: Map<number, number> }}
 */
export function mirrorPairs(lines) {
  const L = (Array.isArray(lines) ? lines : []).filter((l) => l && l.readable !== false && Number.isFinite(l.budget));
  const key = (l) => [l.item, l.vendor, l.category, l.details].map((x) => clean(x).toLowerCase().replace(/\s+/g, ' ')).join('|');
  const cents = (n) => Math.round(Math.abs(n) * 100);
  const used = new Set(), pairs = [], mirrorOf = new Map(), neutralisedBy = new Map();
  for (const neg of L.filter((l) => l.budget < 0).sort((a, b) => a.row - b.row)) {
    const cands = L.filter((p) => p.budget > 0 && !used.has(p.row) && key(p) === key(neg) && cents(p.budget) === cents(neg.budget) &&
      (p.rate == null || neg.rate == null || cents(p.rate) === cents(neg.rate)));
    const above = cands.filter((p) => p.row < neg.row).sort((a, b) => b.row - a.row);
    const below = cands.filter((p) => p.row > neg.row).sort((a, b) => a.row - b.row);
    const hit = above[0] || below[0] || null;
    if (hit) { used.add(hit.row); mirrorOf.set(neg.row, hit.row); neutralisedBy.set(hit.row, neg.row); }
    pairs.push({ negative: neg.row, positive: hit ? hit.row : null });
  }
  return { pairs, mirrorOf, neutralisedBy };
}
