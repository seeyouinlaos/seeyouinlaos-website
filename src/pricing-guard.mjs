/* ============================================================================
   GATE F1 — THE PRICING SOURCE OF TRUTH (Owner, 8 Oct 2026)

   Google 002 / 009 → Billing Engine → Booked Value / Settlement → Website. Never the reverse: no website or local figure
   overrides a readable Google rate, no code divides a rate Google states per person, and no Owner-approved amount is
   "corrected" by inference. Two guests were shown USD 54.50 and USD 116.31 where the Owner had approved USD 109.00 and
   USD 232.62 per person; this gate turns such a difference into a failed release, not a figure on a statement.

     node src/pricing-guard.mjs            gate F1 (src/release-check.cjs): THIS checkout's code against the live Google source
     node src/pricing-guard.mjs --live     after a deploy: the deployed Worker against the live Google source (GET only;
                                           SIYL_ADMIN_INVITATION names the Billing Admin's invitation in the local token file)
     node src/pricing-guard.mjs --accept "<the Owner's order>" --expect <n>
                                           records today's Google figures as the acknowledged baseline — only on an explicit
                                           Owner order that covers every difference listed (CLAUDE.md · pricing source of truth)

   What it proves:
     1. the rules, on synthetic data: a per-person rate is never divided by the room's occupancy; a person-scoped 009 amount
        is charged in full to each person it names; a PER_ROOM charge is charged once, never split; a named 009 rate beats
        002; the website shows the server's amount once the server has answered.
     2. this code against Google: every 002 product the website exposes — the server reads 002's Standard_Rate unchanged,
        lists it unchanged, prices it rate × payable nights, and the website's own catalogue figure is the same number;
        every approved 009 row — the engine charges exactly Rate_Per_Person_Night × Nights_Rule to the person it names.
     3. nothing changed unseen: the financial cells of 002 and 009 equal the acknowledged baseline
        (src/pricing-baseline.private.json, local and git-ignored — it holds holder and person ids). A difference fails
        until the Owner's order for it is recorded with --accept. On a difference: ask the Owner. Never write Google to make
        a figure match the baseline, never record a baseline the Owner has not ordered.

   Exit 0 PASS · 1 FAIL · 2 UNAVAILABLE (Google or the Worker could not be read: still blocking — run it again).
   READ ONLY: it never writes Google or the Worker and prints no guest name; a 009 row is named by its row and Item_ID.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculate } from './billing/engine.js';
import { prefetchTabs, loadItems, loadSpecialRates, RANGE, nightsOfItem } from './billing/source.js';
import { quoteOfItem, listRateOf } from './billing-routes.js';
import { itemIsActiveOn } from './billing/model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILE = path.join(ROOT, 'src/google-service-account.private.json');
const BASELINE = path.join(ROOT, 'src/pricing-baseline.private.json');
const TOKENS = path.join(ROOT, 'src/invitation-tokens.private.csv');

const clean = (v) => (v == null ? '' : String(v).trim());
const num = (v) => { if (v == null || clean(v) === '') return null; const n = typeof v === 'number' ? v : Number(String(v).replace(/[, ]/g, '')); return Number.isFinite(n) ? n : null; };
/* the engine's own rounding (engine.js chargeCents): the rate at the precision Google states it, rounded once, at the end */
const chargeCents = (rate, units) => Math.round(rate * units * 100);
const centsOf = (amount) => (amount == null ? null : Math.round(Number(amount) * 100));
const usd = (c) => (c == null ? '—' : 'USD ' + (c / 100).toFixed(2));
const utcDay = () => new Date().toISOString().slice(0, 10);
const PAYABLE = 'GUEST_SETTLEMENT_REQUIRED';
const PROVIDER_SETTLED = ['GUEST_SELF_PAYMENT', 'GUEST_SELF_BOOKING'];
const BASES = ['PER_PERSON_PER_NIGHT', 'PER_PERSON', 'PER_ROOM', 'PER_HOLDER', 'FLAT'];

export class Unavailable extends Error {}

/* ------------------------------------------------------- 1 · the rules */

/** The rules on synthetic data — no network, the same in every run. Returns the problems found. */
export async function invariants() {
  const problems = [];
  const item = (o) => ({ Billing_Category: PAYABLE, Rate_Status: 'ACTIVE', Currency: 'USD', Rate_Basis: 'PER_PERSON_PER_NIGHT', Max_Pax: 2, ...o });
  const items = {
    'F1-KMG': item({ Item_ID: 'F1-KMG', Billing_Category: 'GUEST_SELF_PAYMENT', Standard_Rate: 18.16666667, 'Number of Nights': 3 }),
    'F1-LJG': item({ Item_ID: 'F1-LJG', Billing_Category: 'GUEST_SELF_PAYMENT', Standard_Rate: 58.155, 'Number of Nights': 2 }),
    'F1-STAY': item({ Item_ID: 'F1-STAY', Standard_Rate: 130, 'Number of Nights': 2 }),
    'F1-ROOM': item({ Item_ID: 'F1-ROOM', Rate_Basis: 'PER_ROOM', Standard_Rate: 300 }),
  };
  const booking = (p, itemId, nights, o) => ({ Booking_ID: 'B-' + p + '-' + itemId, Holder_ID: 'H-' + p, Person_ID: p, Item_ID: itemId,
    State: 'CONFIRMED', Quantity: 1, Nights: nights, Selected: true, ...o });
  const row = (p, itemId, rate, nights, o) => ({ Holder_ID: 'H-' + p, Person_ID: p, Item_ID: itemId, Rate_Per_Person_Night: rate,
    Nights_Rule: String(nights), Rate_Status: 'ACTIVE', Approved_By: 'Owner', ...o });
  const day = '2026-10-08';

  /* two persons sharing ONE two-person room, each named at a per-person amount H&S paid: each owes it in full */
  const paid = ['PA', 'PB'].flatMap((p) => [row(p, 'F1-KMG', 36.33333333, 3, { Billing_Category: PAYABLE }), row(p, 'F1-LJG', 116.31, 2, { Billing_Category: PAYABLE })]);
  for (const p of ['PA', 'PB']) {
    const r = calculate([booking(p, 'F1-KMG', 3, { Room_Unit_ID: 'U-KMG' }), booking(p, 'F1-LJG', 2, { Room_Unit_ID: 'U-LJG' })], { items, specialRates: paid, asOf: day });
    const got = r.lines.map((l) => l.amountCents).concat(r.totalPayableCents);
    if (got.join() !== '10900,23262,34162') problems.push('a per-person amount H&S paid is not charged in full to each person sharing the room: ' + got.join(' / ') + ' cents (expected 10900 / 23262 / 34162)');
    if (r.lines.some((l) => l.block !== 'A' || !l.categoryOverride)) problems.push('a stay H&S paid for a guest is not payable to H&S (block A, paid by H&S)');
  }
  /* a per-person 002 rate × the nights — never divided by the room's occupancy */
  const shared = calculate([booking('PC', 'F1-STAY', 2, { Room_Unit_ID: 'U1', Holder_ID: 'H-X' }), booking('PD', 'F1-STAY', 2, { Room_Unit_ID: 'U1', Holder_ID: 'H-X' })], { items, specialRates: [], asOf: day });
  if (shared.lines.map((l) => l.amountCents).join() !== '26000,26000') problems.push('a per-person standard rate is divided by the room\'s occupancy: ' + shared.lines.map((l) => l.amountCents).join(' / '));
  const self = calculate([booking('PC', 'F1-KMG', 3)], { items, specialRates: [], asOf: day }).lines[0];
  if (self.amountCents !== 0 || self.block !== 'B') problems.push('a hotel the guest pays directly became an H&S charge without a 009 row');
  /* a PER_ROOM charge belongs to the room: charged once, never split by inference */
  const room = calculate([booking('PC', 'F1-ROOM', 1, { Room_Unit_ID: 'U9', Holder_ID: 'H-X', Bill_To_Holder_ID: 'H-X' }), booking('PD', 'F1-ROOM', 1, { Room_Unit_ID: 'U9', Holder_ID: 'H-X', Bill_To_Holder_ID: 'H-X' })], { items, specialRates: [], asOf: day });
  if (room.lines.map((l) => l.amountCents).sort((a, b) => b - a).join() !== '30000,0') problems.push('a PER_ROOM charge is split or doubled: ' + room.lines.map((l) => l.amountCents).join(' / '));
  /* a named 009 rate beats 002 for the person it names; everyone else keeps 002 */
  const named = [row('PE', 'F1-STAY', 65, 2)];
  const a = calculate([booking('PE', 'F1-STAY', 2)], { items, specialRates: named, asOf: day }).lines[0];
  const b = calculate([booking('PF', 'F1-STAY', 2)], { items, specialRates: named, asOf: day }).lines[0];
  if (a.amountCents !== 13000 || a.rateSource !== 'SPECIAL_RATE' || b.amountCents !== 26000 || b.rateSource !== 'STANDARD_RATE') problems.push('the named 009 rate does not beat 002 for exactly the person it names');

  /* the website: once the server has answered, its amount — the prepaid stay's USD 109, never the listing's 18.17 × 3 */
  const { page, PEGGY } = await import('../test/sandbox.mjs');
  const quotes = { 'kmg/jinri-terrace-double': { total: 109, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 36.33, nights: 3, payableNights: 3, paidByHS: 'GUEST_SELF_PAYMENT', listRate: 18.16666667 } };
  const P = page({ auth: PEGGY, quotes }).SIYL_PRICE;
  const q = P.quote('kmg', 'jinri-terrace-double'), line = P.items('kmg', 'jinri-terrace-double')[0];
  if (!q || q.total !== 109 || !line || line.price !== 109) problems.push('the website does not show the server\'s amount for a stay H&S paid (quote ' + (q && q.total) + ', bag line ' + (line && line.price) + ')');
  if (P.fromLine('kmg') !== 'USD 109 per person') problems.push('the stay card beside "already paid" lists another figure: ' + JSON.stringify(P.fromLine('kmg')));
  const listed = page({ auth: PEGGY, quotes: { 'prewed/heritage-executive': { total: 130, block: 'A', rateSource: 'STANDARD_RATE', ratePerNight: 65, listRate: 65 } } }).SIYL_PRICE;
  const he = listed.locate('prewed').stay.rooms.find((r) => r.slug === 'heritage-executive');
  if (listed.rateOf('prewed', he) !== 65) problems.push('the website keeps its own rate after the server named another');
  return problems;
}

/* ------------------------------------------------- 2 · Google, read only */

function sheetsId() {
  const m = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8').match(/"SHEETS_ID"\s*:\s*"([^"]+)"/);
  if (!m) throw new Unavailable('wrangler.jsonc names no SHEETS_ID');
  return m[1];
}

/** 002 and 009 in ONE batchGet: the server's own loaders over it, and the raw grids of the same response. */
export async function readGoogle(asOf) {
  if (!fs.existsSync(KEY_FILE)) throw new Unavailable('no local service-account key (src/google-service-account.private.json) — F1 cannot prove the rates');
  const env = { GOOGLE_SERVICE_ACCOUNT_JSON: fs.readFileSync(KEY_FILE, 'utf8') };
  let pre;
  try { pre = await prefetchTabs(env, { spreadsheetId: sheetsId(), asOf }, ['accommodationDetails', 'specialRates']); }
  catch (e) { throw new Unavailable('Google could not be read: ' + clean(e && e.message).slice(0, 160)); }
  const [items, specialRates] = await Promise.all([loadItems(env, pre), loadSpecialRates(env, pre)]);
  const grid = (r) => { const g = pre.grids[r]; return Array.isArray(g) ? g : (g && g.values) || []; };
  return { source: { items, specialRates }, g002: grid(RANGE.ACCOMMODATION_DETAILS), g009: grid(RANGE.SPECIAL_RATES) };
}

const FIELDS_002 = ['Item_ID', 'Site_Product_Key', 'Billing_Category', 'Rate_Status', 'Rate_Basis', 'Standard_Rate', 'Currency', 'Number of Nights', 'Modifiers', 'Effective_From', 'Effective_To'];
const FIELDS_009 = ['Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule', 'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Billing_Category'];

/** 002 read independently of the server's loader: labels in column A, one product per column. */
export function raw002(grid) {
  const rowOf = {};
  grid.forEach((r, i) => { const l = clean((r || [])[0]); if (l && rowOf[l] === undefined) rowOf[l] = i; });
  const display = Object.keys(rowOf).find((l) => /^Total per Person/i.test(l));
  const idRow = rowOf.Item_ID;
  const out = new Map();
  if (idRow === undefined) return out;
  const width = Math.max(...grid.map((r) => (r || []).length));
  for (let c = 1; c < width; c++) {
    const id = clean((grid[idRow] || [])[c]);
    if (!id) continue;
    const rec = { column: c };
    for (const f of FIELDS_002) if (rowOf[f] !== undefined) rec[f] = clean((grid[rowOf[f]] || [])[c]);
    if (display) rec.display = clean((grid[rowOf[display]] || [])[c]);
    if (!out.has(id)) out.set(id, []);
    out.get(id).push(rec);
  }
  return out;
}

/** 009 read independently: its header row, one row each, with the sheet's row number. */
export function raw009(grid) {
  const head = (grid[0] || []).map(clean);
  return grid.slice(1).map((r, i) => {
    const rec = { row: i + 2 };
    head.forEach((h, j) => { if (FIELDS_009.includes(h) || h === 'Note') rec[h] = clean((r || [])[j]); });
    return rec;
  }).filter((r) => r.Item_ID);
}

const keysOf = (v) => clean(v).split(/[,|]/).map(clean).filter(Boolean);
function unitsOf(rec) {
  const basis = rec.Rate_Basis, nights = num(rec['Number of Nights']);
  if (basis === 'PER_PERSON_PER_NIGHT') return nights == null ? null : (/SECOND_NIGHT_COMPLIMENTARY/i.test(rec.Modifiers || '') ? Math.max(0, nights - 1) : nights);
  return BASES.includes(basis) ? 1 : null;
}

/** THIS code against Google. */
export async function codeAgainstGoogle({ source, g002, g009 }, asOf) {
  const problems = [], info = [];
  const items = raw002(g002), rows = raw009(g009);
  const stats = { products: 0, priced: 0, listed: 0, website: 0, dated: 0, named: 0, provider: 0 };
  const { page, PEGGY } = await import('../test/sandbox.mjs');
  const W = page({ auth: PEGGY, billing: 'failed' }), P = W.SIYL_PRICE;   /* the website's own figures: what it shows without the server */
  const displayGaps = [], listedKeys = new Set(), unmatchedKeys = [];

  for (const [id, cols] of items) {
    const it = source.items[id];
    /* the column in force: the only one, else the one ACTIVE column in force today (dated variants — the engine's own rule) */
    const inForce = cols.filter((x) => itemIsActiveOn(x, asOf));
    const c = cols.length === 1 ? cols[0] : inForce.length === 1 ? inForce[0] : null;
    if (cols.length > 1) stats.dated++;
    if (!c) {
      if (it && !cols.some((x) => num(x.Standard_Rate) === num(it.Standard_Rate))) problems.push('002 ' + id + ': the server reads Standard_Rate ' + it.Standard_Rate + ', which none of its ' + cols.length + ' columns states');
      else info.push('002 ' + id + ': ' + cols.length + ' columns and ' + inForce.length + ' in force today — no rate to compare');
      continue;
    }
    const rate = num(c.Standard_Rate);
    if (!it) { problems.push('002 ' + id + ': in the sheet but not read by the server'); continue; }
    stats.products++;
    if (num(it.Standard_Rate) !== rate) problems.push('002 ' + id + ': the server reads Standard_Rate ' + it.Standard_Rate + ', the sheet states ' + c.Standard_Rate);
    const active = c.Rate_Status === 'ACTIVE', pppn = c.Rate_Basis === 'PER_PERSON_PER_NIGHT';
    /* the rate the website lists: 002's own, unchanged — or none */
    const expectList = active && pppn && rate > 0 ? rate : null;
    if (listRateOf(it) !== expectList) problems.push('002 ' + id + ': the server lists ' + listRateOf(it) + ', 002 states ' + expectList);
    if (expectList != null) stats.listed++;
    /* the website's own catalogue figure for every stay key it maps: the same number */
    if (expectList != null) for (const key of keysOf(c.Site_Product_Key)) {
      const [win, slug] = key.split('/'), at = P.locate(win), room = at && slug && at.stay.rooms.find((r) => r.slug === slug);
      if (!room) { unmatchedKeys.push(key); continue; }
      listedKeys.add(at.win.id + '/' + room.slug);
      const own = P.rateOf(win, room);
      if (own == null || Math.abs(Number(own) - rate) > 1e-6) problems.push('website ' + key + ': its own figure ' + own + ' differs from 002 ' + rate + ' (' + id + ')');
      stats.website++;
    }
    /* the standard charge for a person nobody names: rate × payable nights, never divided */
    if (active && c.Billing_Category === PAYABLE && rate != null) {
      const units = unitsOf(c), q = quoteOfItem(id, it, source, 'F1-NOBODY', 'F1-NOBODY', asOf);
      if (units == null) { if (q.total != null) problems.push('002 ' + id + ': priced although 002 gives it no nights'); continue; }
      const expect = chargeCents(rate, units);
      if (q.rateSource !== 'STANDARD_RATE' || centsOf(q.total) !== expect) problems.push('002 ' + id + ': the engine charges ' + usd(centsOf(q.total)) + ' (' + q.rateSource + '), 002 says ' + rate + ' × ' + units + ' = ' + usd(expect));
      stats.priced++;
      if (pppn && c.display && num(c.display) != null && centsOf(num(c.display)) !== expect) displayGaps.push(id);
    } else if (active && pppn && rate != null && c.display && num(c.display) != null && centsOf(num(c.display)) !== chargeCents(rate, unitsOf(c) ?? 0)) displayGaps.push(id);
  }
  /* the other way round: every room the website prices itself has its rate in 002 — a local figure with no listed rate is named */
  const unlisted = [];
  for (const k of Object.keys(W.SIYL_ROOMS || {})) for (const win of W.SIYL_ROOMS[k].windows || []) for (const room of W.SIYL_ROOMS[k].rooms || []) {
    if (room.interest || !P.offeredIn(win.id, room)) continue;
    const own = P.rateOf(win.id, room);
    if (own == null || !(Number(own) > 0) || listedKeys.has(win.id + '/' + room.slug)) continue;
    unlisted.push(win.id + '/' + room.slug + ' (' + own + ')');
  }
  if (unlisted.length) info.push('website rooms showing a figure of their own with no ACTIVE per-person 002 rate behind it: ' + unlisted.join(', '));
  if (unmatchedKeys.length) info.push('002 stay keys no website room carries: ' + unmatchedKeys.join(', '));
  if (displayGaps.length) info.push('002 display row "Total per Person, all Nights" differs from Standard_Rate × nights for ' + displayGaps.length + ' product(s): ' + displayGaps.join(', ') + ' — a display row, never engine input (Freeze · D); an Owner question, not a release blocker');

  /* every approved 009 row the engine applies: exactly Rate_Per_Person_Night × Nights_Rule, to the person it names */
  const live = rows.filter((r) => r.Rate_Status === 'ACTIVE' && r.Approved_By && (!r.Effective_From || asOf >= r.Effective_From) && (!r.Effective_To || asOf <= r.Effective_To));
  const whoOf = (r) => (r.Person_ID ? 'P:' + r.Person_ID : 'H:' + r.Holder_ID) + '|' + r.Item_ID;
  const count = {}; live.forEach((r) => { count[whoOf(r)] = (count[whoOf(r)] || 0) + 1; });
  for (const r of live) {
    const name = '009 row ' + r.row + ' · ' + r.Item_ID;
    const rate = num(r.Rate_Per_Person_Night);
    if (rate == null) { info.push(name + ': no price yet (PRICE REQUIRED)'); continue; }
    if (count[whoOf(r)] > 1) { info.push(name + ': two approved rows name the same person and item — the engine asks for review'); continue; }
    const it = source.items[r.Item_ID];
    if (!it) { problems.push(name + ': names a product 002 does not have'); continue; }
    const rule = r.Nights_Rule, units = /^\d+$/.test(rule) ? Number(rule) : (!rule || /^ALL$/i.test(rule)) ? nightsOfItem(it) : null;
    if (units == null) { problems.push(name + ': Nights_Rule "' + rule + '" gives no nights'); continue; }
    const expect = chargeCents(rate, units);
    const q = quoteOfItem(r.Item_ID, it, source, r.Holder_ID, r.Person_ID || 'F1-ANY-MEMBER', asOf);
    /* a named rate on a product H&S does not charge (the hotel the guest pays, a hosted stay) is the rate the guest meets
       there — never an H&S charge; only 009's Billing_Category makes such a booking payable (engine 2.3.0) */
    const category = r.Billing_Category === PAYABLE ? PAYABLE : clean(it.Billing_Category);
    if (category !== PAYABLE) {
      const none = PROVIDER_SETTLED.includes(category) ? q.block === 'B' && centsOf(q.total) === 0 : category === 'HOSTED_NO_GUEST_CHARGE' ? q.hosted && centsOf(q.total) === 0 : true;
      if (!none) problems.push(name + ': a ' + category + ' product named at ' + rate + ' became an H&S charge of ' + usd(centsOf(q.total)));
      else stats.provider++;
      continue;
    }
    if (q.rateSource !== 'SPECIAL_RATE' || centsOf(q.total) !== expect) {
      problems.push(name + ': the engine charges ' + usd(centsOf(q.total)) + ' (' + (q.rateSource || q.manualReview || 'no amount') + '), 009 says ' + rate + ' × ' + units + ' = ' + usd(expect));
      continue;
    }
    if (r.Billing_Category === PAYABLE && PROVIDER_SETTLED.includes(clean(it.Billing_Category)) && !q.paidByHS) problems.push(name + ': H&S paid it for the guest, but the engine does not say so');
    stats.named++;
    /* the row's own words print on the statement: a USD figure in them that is not the charge is worth a look */
    const figures = (r.Note || '').match(/USD\s*[\d,]+(?:\.\d+)?/gi) || [];
    if (figures.length && !figures.some((f) => centsOf(num(f.replace(/USD/i, ''))) === expect)) info.push(name + ': its Note quotes ' + figures.join(', ') + '; the row charges ' + usd(expect));
  }
  return { problems, info, stats };
}

/* ------------------------------------------------ 3 · the acknowledged baseline */

export function snapshotOf({ g002, g009 }) {
  const items = {};
  for (const [id, cols] of raw002(g002)) items[id] = cols.map((c) => Object.fromEntries(FIELDS_002.map((f) => [f, c[f] || ''])));
  const special = raw009(g009).map((r) => Object.fromEntries(['row', ...FIELDS_009].map((f) => [f, r[f] ?? ''])));
  return { items, special };
}

/** The differences between two snapshots, named by product and 009 row — never by person. */
export function diffSnapshots(base, now) {
  const out = [];
  for (const id of new Set([...Object.keys(base.items || {}), ...Object.keys(now.items || {})])) {
    const a = JSON.stringify((base.items || {})[id] || null), b = JSON.stringify((now.items || {})[id] || null);
    if (a === b) continue;
    if (a === 'null') { out.push('002 ' + id + ': new product'); continue; }
    if (b === 'null') { out.push('002 ' + id + ': product removed'); continue; }
    const x = base.items[id], y = now.items[id];
    if (x.length !== y.length) { out.push('002 ' + id + ': ' + x.length + ' → ' + y.length + ' dated columns'); continue; }
    x.forEach((col, k) => FIELDS_002.forEach((f) => { if (col[f] !== y[k][f]) out.push('002 ' + id + ' · ' + f + ': ' + (col[f] || '—') + ' → ' + (y[k][f] || '—')); }));
  }
  const ident = (r) => [r.Holder_ID, r.Person_ID, r.Item_ID].join('|');
  /* rows naming the same holder, person and product are compared in a stable order, never by their position in the tab */
  const order = (r) => JSON.stringify(FIELDS_009.map((f) => r[f] ?? ''));
  const group = (list) => { const m = new Map(); for (const r of list || []) { const k = ident(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r); } for (const g of m.values()) g.sort((a, b) => (order(a) < order(b) ? -1 : order(a) > order(b) ? 1 : 0)); return m; };
  const A = group(base.special), B = group(now.special);
  for (const k of new Set([...A.keys(), ...B.keys()])) {
    const xs = A.get(k) || [], ys = B.get(k) || [];
    for (let i = 0; i < Math.max(xs.length, ys.length); i++) {
      const x = xs[i], y = ys[i];
      if (!x) { out.push('009 row ' + y.row + ' · ' + y.Item_ID + ': new row'); continue; }
      if (!y) { out.push('009 · ' + x.Item_ID + ' (was row ' + x.row + '): row removed'); continue; }
      for (const f of FIELDS_009) if (f !== 'Holder_ID' && f !== 'Person_ID' && f !== 'Item_ID' && x[f] !== y[f]) out.push('009 row ' + y.row + ' · ' + y.Item_ID + ' · ' + f + ': ' + (x[f] || '—') + ' → ' + (y[f] || '—'));
    }
  }
  return out;
}

function readBaseline() {
  if (!fs.existsSync(BASELINE)) return null;
  try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { return { broken: true }; }
}

/* ---------------------------------------------- --live · the deployed Worker */

async function liveChecks(google, asOf) {
  const problems = [], info = [], stats = { listed: 0, booked: 0, holders: 0, rows: 0, rowsChecked: 0 };
  const infra = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/PRODUCTION.json'), 'utf8'));
  const origin = infra.publicOrigin;
  const admin = clean(process.env.SIYL_ADMIN_INVITATION);
  if (!admin) throw new Unavailable('--live needs SIYL_ADMIN_INVITATION (the Billing Admin\'s invitation id in src/invitation-tokens.private.csv)');
  if (!fs.existsSync(TOKENS)) throw new Unavailable('no local token file (src/invitation-tokens.private.csv)');
  const csv = fs.readFileSync(TOKENS, 'utf8').split(/\r?\n/), h = csv[0].split(',');
  const row = csv.slice(1).map((l) => l.split(',')).find((c) => c[h.indexOf('invitationId')] === admin);
  if (!row) throw new Unavailable('the token file has no ' + admin);
  const { bearerOf } = await import(path.join(ROOT, 'register/crypto.mjs'));
  const headers = { 'x-siyl-auth': await bearerOf(row[h.indexOf('token')]) };
  /* exactly these two read-only paths, one request at a time (a GET elsewhere is not necessarily free of effects) */
  const ALLOWED = [/^\/api\/billing\/catalogue$/, /^\/api\/billing\/admin\/holder\?holder=[A-Za-z0-9-]+$/];
  const get = async (p) => {
    if (!ALLOWED.some((re) => re.test(p))) throw new Error('F1 --live refuses ' + p.split('?')[0]);
    let r; try { r = await fetch(origin + p, { headers, cache: 'no-store' }); } catch (e) { throw new Unavailable('the Worker could not be reached: ' + clean(e && e.message)); }
    if (r.status >= 500 || r.status === 429) throw new Unavailable('the Worker answered ' + r.status + ' for ' + p.split('?')[0]);
    return { status: r.status, j: await r.json().catch(() => null) };
  };
  /* the live catalogue lists 002's own rate for every product */
  const cat = await get('/api/billing/catalogue');
  const quotes = (cat.j && cat.j.quotes) || {};
  for (const [id, cols] of raw002(google.g002)) {
    if (cols.length !== 1) continue;
    const c = cols[0], rate = num(c.Standard_Rate);
    if (c.Rate_Status !== 'ACTIVE' || c.Rate_Basis !== 'PER_PERSON_PER_NIGHT' || !(rate > 0)) continue;
    for (const key of keysOf(c.Site_Product_Key)) {
      const q = quotes[key];
      if (!q) { problems.push('live ' + key + ': not in the live catalogue (' + id + ')'); continue; }
      if (q.listRate !== rate) problems.push('live ' + key + ': lists ' + q.listRate + ', 002 states ' + rate);
      stats.listed++;
    }
  }
  /* every approved, priced, person-scoped 009 row: the Booked value and the statement preview charge exactly that */
  const rows = raw009(google.g009).filter((r) => r.Rate_Status === 'ACTIVE' && r.Approved_By && r.Person_ID && num(r.Rate_Per_Person_Night) != null &&
    (!r.Effective_From || asOf >= r.Effective_From) && (!r.Effective_To || asOf <= r.Effective_To));
  const byHolder = new Map(); rows.forEach((r) => { if (!byHolder.has(r.Holder_ID)) byHolder.set(r.Holder_ID, []); byHolder.get(r.Holder_ID).push(r); });
  stats.rows = rows.length;
  const unchecked = [];
  for (const [holder, list] of byHolder) {
    const d = await get('/api/billing/admin/holder?holder=' + encodeURIComponent(holder));
    if (d.status !== 200 || !d.j) { problems.push('live holder of 009 row ' + list[0].row + ': admin view answered ' + d.status); continue; }
    stats.holders++;
    const lines = [...((d.j.booked && d.j.booked.items) || []), ...((d.j.preview && d.j.preview.lines) || [])];
    for (const r of list) {
      const it = google.source.items[r.Item_ID]; if (!it) continue;
      const mine = lines.filter((l) => l && l.Person_ID === r.Person_ID && l.Item_ID === r.Item_ID);
      if (!mine.length) { unchecked.push(r.row); continue; }   /* the guest has not chosen it: nothing is charged to check */
      stats.rowsChecked++;
      const category = r.Billing_Category === PAYABLE ? PAYABLE : clean(it.Billing_Category), rate = num(r.Rate_Per_Person_Night), rule = r.Nights_Rule;
      for (const l of mine) {
        stats.booked++;
        const name = 'live 009 row ' + r.row + ' · ' + r.Item_ID;
        if (category !== PAYABLE) { if (l.amount != null && centsOf(l.amount) !== 0) problems.push(name + ': a ' + category + ' product became an H&S charge of ' + usd(centsOf(l.amount))); continue; }
        if (/^\d+$/.test(rule) && Number(l.payableNights) !== Number(rule)) problems.push(name + ': ' + l.payableNights + ' payable nights, 009 says ' + rule);
        const units = (/^\d+$/.test(rule) ? Number(rule) : num(l.nights)) * (Number(l.quantity) || 1);
        const expect = chargeCents(rate, units);
        if (centsOf(l.amount) !== expect) problems.push(name + ': charged ' + usd(centsOf(l.amount)) + ' (' + (l.rateSource || l.review || '') + '), 009 says ' + rate + ' × ' + units + ' = ' + usd(expect));
      }
    }
  }
  if (unchecked.length) info.push('live: ' + unchecked.length + ' approved 009 row(s) the guest has not chosen, nothing charged to check — rows ' + unchecked.join(', '));
  return { problems, info, stats };
}

/* ------------------------------------------------------------------ main */

async function main(argv) {
  const live = argv.includes('--live'), accept = argv.indexOf('--accept');
  const asOf = utcDay();
  const google = await readGoogle(asOf);
  const now = snapshotOf(google);

  if (accept >= 0) {
    const order = clean(argv[accept + 1]);
    if (order.length < 12) { console.log('REFUSED: --accept needs the Owner\'s order in words (what was approved, by whom, when)'); return 1; }
    const base = readBaseline(), diff = base && !base.broken ? diffSnapshots(base, now) : ['(no earlier baseline)'];
    /* the order covers what it covers: the number of differences it acknowledges is stated, and must be the number found */
    const ex = argv.indexOf('--expect'), expected = ex >= 0 ? Number(argv[ex + 1]) : NaN;
    if (base && !base.broken && expected !== diff.length) { diff.forEach((d) => console.log('FOUND ' + d)); console.log('REFUSED: ' + diff.length + ' difference(s) found; --expect ' + (Number.isFinite(expected) ? expected : '<n>') + ' must state that number'); return 1; }
    diff.forEach((d) => console.log('ACCEPTED ' + d));
    const history = ((base && base.history) || []).concat([{ at: new Date().toISOString(), order, changes: diff.length }]);
    fs.writeFileSync(BASELINE, JSON.stringify({ takenAt: new Date().toISOString(), note: 'The financial cells of Google 002 and 009 as read at takenAt. Recorded on the Owner order in history — not a source of truth: Google is.', history, ...now }, null, 1) + '\n');
    console.log('PRICING BASELINE: recorded (' + Object.keys(now.items).length + ' products · ' + now.special.length + ' 009 rows)');
    return 0;
  }

  const problems = [], info = [];
  problems.push(...(await invariants()));
  const code = await codeAgainstGoogle(google, asOf);
  problems.push(...code.problems); info.push(...code.info);
  const base = readBaseline();
  if (!base) problems.push('no acknowledged baseline (src/pricing-baseline.private.json) — record the Owner\'s figures with --accept');
  else if (base.broken) problems.push('the baseline file cannot be read');
  else diffSnapshots(base, now).forEach((d) => problems.push('CHANGED SINCE THE OWNER\'S LAST ACKNOWLEDGED ORDER — ' + d));
  let liveStats = null;
  if (live) { const l = await liveChecks(google, asOf); problems.push(...l.problems); info.push(...l.info); liveStats = l.stats; }

  for (const i of info) console.log('INFO ' + i);
  for (const p of problems) console.log('FAIL ' + p);
  const s = code.stats;
  const summary = s.products + ' products (' + s.priced + ' priced, ' + s.listed + ' listed, ' + s.website + ' website figures, ' + s.dated + ' dated) · ' +
    s.named + ' named 009 charges, ' + s.provider + ' named rates the guest pays the provider' + (liveStats ? ' · live: ' + liveStats.listed + ' listed rates, ' + liveStats.rowsChecked + ' of ' + liveStats.rows + ' approved 009 rows charged (' + liveStats.booked + ' lines, ' + liveStats.holders + ' holders)' : '');
  console.log(problems.length ? 'PRICING SOURCE OF TRUTH: BLOCKED — ' + problems.length + ' difference(s) · ' + summary : 'PRICING SOURCE OF TRUTH: INTACT — ' + summary);
  return problems.length ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => {
    if (e instanceof Unavailable) { console.log('PRICING SOURCE OF TRUTH: UNAVAILABLE — ' + e.message); process.exit(2); }
    console.log('PRICING SOURCE OF TRUTH: ERROR — ' + clean(e && e.stack).split('\n').slice(0, 3).join(' · '));
    process.exit(1);
  });
}
