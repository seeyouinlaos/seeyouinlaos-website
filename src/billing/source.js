/* ============================================================================
   H&S WEDDING 2027 — THE GOOGLE SOURCE ADAPTER
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL
   (Freeze · A, C, D, J, K, M, Q, R).

   Google is the source of truth for every rate, quota, special rate and guest
   payment. This module is the ONLY place the billing code reads it, and it
   does exactly one job: turn the tabs into the shapes src/billing/engine.js
   and src/billing/settlement.js already expect. It performs NO arithmetic. It
   knows no rate, no quota and no amount, so there is nothing here to drift
   away from the sheet.

   A BLANK CELL IS ABSENT, NOT ZERO. The loaders omit the key entirely rather
   than writing '' or null, and the reason is concrete: `Number('')` and
   `Number(null)` are both 0, while `Number(undefined)` is NaN. Quota is read
   downstream with a bare `Number(...)`, so a blank quota that arrived as ''
   would quietly become "quota 0 — everything is over quota". Absent keeps it
   unknown, which is what the sheet actually says. A blank Standard_Rate
   likewise stays absent and the engine answers MANUAL_REVIEW_REQUIRED instead
   of charging nothing.

   COLUMNS ARE MATCHED BY THE HEADER ROW, never by position, so inserting a
   column in Google cannot slide a rate into the quota field. 002 is the one
   transposed tab (Owner, 5 Oct 2026): products in columns, metadata in
   labelled rows, so there the ROWS are matched by their label in column A,
   never by position, for the same reason. 008 is stricter
   still: its header is compared against PAYMENT_JOURNAL_HEADER before every
   read and before every append, because the Worker writing column 7 while the
   sheet means column 8 is how a payment lands on the wrong guest.

   NOTHING IS SWALLOWED. A missing tab or a failing API call propagates as the
   transport's GoogleSheetsUnavailable, and an empty grid is refused outright:
   an empty array returned from here would read as "no special rates" and
   silently change someone's bill. That is the one failure mode this file
   exists to make impossible.

   008 IS APPEND-ONLY and canonical (Freeze · J, K). There is no website-side
   journal and no fallback store: if Google rejects the append, the operation
   fails in the caller's face. A duplicate is appended with Duplicate_Suspect
   TRUE, never deduplicated here or anywhere else.

   CREDENTIALS NEVER PASS THROUGH HERE. GOOGLE_SERVICE_ACCOUNT_JSON is read by
   the transport from the Worker `env` and stays there; this module hands the
   transport `env` and a range, and returns rows. It logs nothing.
   ========================================================================== */

/* The transport is a sibling module (src/google-sheets.js) that owns the
 * service-account token, the fetch and the retries. It is bound as a namespace
 * rather than with named imports on purpose: a name this adapter guessed
 * wrongly would otherwise be a module-link failure that takes the whole Worker
 * down at boot, instead of a clear refusal on a billing call. */
import { readRange, batchReadRanges, appendRow, updateRange } from '../google-sheets.js';

/* THE TRANSPORT'S REAL SIGNATURE (wired 4 Oct 2026, once src/google-sheets.js
 * existed): readRange(env, spreadsheetId, a1Range) and
 * appendRow(env, spreadsheetId, a1Range, rowValues). The spreadsheet id is
 * configuration carried on cfg; the credential never passes through here. */
function spreadsheetIdOf(cfg) {
  const id = String((cfg && cfg.spreadsheetId) || '').trim();
  if (!id) refuse('SOURCE_UNCONFIGURED', 'no spreadsheetId was supplied to the billing source');
  return id;
}
import { RATE_STATUS, MODIFIER, itemIsActiveOn } from './model.js';

const clean = (v) => String(v == null ? '' : v).trim();

/* ------------------------------------------------------------- the refusal */

/**
 * Raised when the sheet IS readable but says something this adapter must not
 * interpret: an ambiguous rate row, a drifted journal header, an undefined
 * modifier, an incomplete payment row. Distinct from the transport's
 * GoogleSheetsUnavailable, which means Google itself could not be reached.
 */
export class SourceDataError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'SourceDataError';
    this.code = code;
  }
}
const refuse = (code, message) => { throw new SourceDataError(code, message); };

/* --------------------------------------------------------- tabs and ranges */

/** Freeze · A, C, D, J, Q — the tabs the settlement reads. */
export const TAB = Object.freeze({
  ACCOMMODATION_DETAILS: '002_Accommodation_Details',
  PAYMENT_JOURNAL: '008_Payment_Journal',
  SPECIAL_RATES: '009_Special_Rates',
  BOOKING_EVIDENCE_INDEX: '010_Booking_Evidence_Index',
  /* 011_Billing_Config (Owner, 5 Oct 2026): the canonical home of FX and of
   * any later explicitly approved global billing configuration. It replaces
   * the FX tab name this adapter had guessed. No tab is repurposed. */
  BILLING_CONFIG: '011_Billing_Config',
  /* the existing guest register (Owner, 5 Oct 2026 · payment preference): read
   * for ONE column, Nationality, and only by the 006 ID; never written */
  GUESTLIST: '006_Guestlist',
});

/** Mapping from the cfg override key to the default tab name. */
const TAB_OF_KEY = Object.freeze({
  accommodationDetails: TAB.ACCOMMODATION_DETAILS,
  paymentJournal: TAB.PAYMENT_JOURNAL,
  specialRates: TAB.SPECIAL_RATES,
  bookingEvidenceIndex: TAB.BOOKING_EVIDENCE_INDEX,
  billingConfig: TAB.BILLING_CONFIG,
  guestlist: TAB.GUESTLIST,
});

/* Wide enough for every documented column plus anything an operator adds to
 * the right of it; the loaders read by header name, so extra width is free. */
const LAST_COLUMN = 'AZ';
const quoteTab = (tab) => "'" + String(tab).replace(/'/g, "''") + "'";
const a1 = (tab) => quoteTab(tab) + '!A1:' + LAST_COLUMN;

/** The read ranges, in A1 notation, as the Worker should use them. */
export const RANGE = Object.freeze({
  ACCOMMODATION_DETAILS: a1(TAB.ACCOMMODATION_DETAILS),
  PAYMENT_JOURNAL: a1(TAB.PAYMENT_JOURNAL),
  SPECIAL_RATES: a1(TAB.SPECIAL_RATES),
  BOOKING_EVIDENCE_INDEX: a1(TAB.BOOKING_EVIDENCE_INDEX),
  BILLING_CONFIG: a1(TAB.BILLING_CONFIG),
  /* Appends are addressed at the top of the tab; Google places the row after
   * the last populated one. */
  PAYMENT_JOURNAL_APPEND: quoteTab(TAB.PAYMENT_JOURNAL) + '!A1',
});

/**
 * The column that identifies the table inside its tab. 002 opens with prose
 * and carries display rows, so the header is NOT simply the first row with
 * text in it: it is the row naming this column, and a record is a row that
 * fills it. Overridable per tab with cfg.headerKeys if a tab is ever renamed.
 */
export const HEADER_KEY = Object.freeze({
  accommodationDetails: 'Item_ID',
  paymentJournal: 'Payment_ID',
  specialRates: 'Item_ID',
  bookingEvidenceIndex: 'Booking_ID',
  billingConfig: 'Config_Key',
  guestlist: 'ID',
});

const tabFor = (cfg, key) => clean(cfg && cfg.tabs && cfg.tabs[key]) || TAB_OF_KEY[key];
const rangeFor = (cfg, key) => a1(tabFor(cfg, key));
const keyFor = (cfg, key) => clean(cfg && cfg.headerKeys && cfg.headerKeys[key]) || HEADER_KEY[key];

/* ------------------------------------------------------------- transport */

/* The accepted export names, in order of preference. The transport only has
 * to provide one of each; anything else is a visible refusal naming what was
 * looked for, which is a great deal easier to fix than a silent empty array. */


/**
 * One read. GoogleSheetsUnavailable from the transport is NOT caught: a tab
 * that is missing or an API call that failed must reach the caller.
 */
async function readGrid(env, cfg, range) {
  /* a grid this read already fetched in its one batch request (prefetchTabs) */
  if (cfg && cfg.grids && Object.prototype.hasOwnProperty.call(cfg.grids, range)) return cfg.grids[range];
  const got = await readRange(env, spreadsheetIdOf(cfg), range);
  const grid = Array.isArray(got) ? got
    : (got && Array.isArray(got.values) ? got.values : null);
  if (!grid) {
    refuse('SOURCE_UNREADABLE', 'the transport returned no value grid for ' + range);
  }
  return grid;
}

/* ------------------------------------------------------------ table shape */

/**
 * The header is the first row that names `key`; a record is a row below it
 * that fills that column. 002 opens with prose and keeps display rows (the
 * G19 / G20 style "per room" and "total" lines) in among the data, and none of
 * those is metadata, so neither "the first row with text in it" nor "every row
 * below it" would do.
 *
 * Blank cells are left out of the record (see the note at the top of this
 * file) and `sheetRow` is kept so a refusal can name the row an operator has
 * to open. A tab with no such header is refused rather than reported as "no
 * rows": the two are indistinguishable downstream and one of them is a wrong
 * tab name.
 */
function readTable(grid, range, key) {
  let headerAt = -1;
  for (let i = 0; i < grid.length; i++) {
    if ((grid[i] || []).some((c) => clean(c) === key)) { headerAt = i; break; }
  }
  if (headerAt < 0) {
    refuse('SOURCE_NO_HEADER', range + ' has no header row naming ' + key);
  }

  const header = (grid[headerAt] || []).map(clean);
  const keyAt = header.indexOf(key);
  const records = [];
  for (let i = headerAt + 1; i < grid.length; i++) {
    const cells = grid[i] || [];
    if (!clean(cells[keyAt])) continue;
    const values = {};
    for (let c = 0; c < header.length; c++) {
      const name = header[c];
      if (!name) continue;
      const raw = cells[c];
      if (raw == null || String(raw).trim() === '') continue;
      values[name] = typeof raw === 'string' ? raw.trim() : raw;
    }
    records.push({ values, sheetRow: i + 1 });
  }
  return { header, records };
}

/** 0-based column index → A1 column letters (0 → A, 26 → AA). */
function columnLetter(index) {
  let n = index + 1, s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

/**
 * 002 IS PRODUCT-IN-COLUMNS (Owner, 5 Oct 2026). Each product is one column
 * (B:AA today) and each piece of structured metadata is one LABELLED ROW, the
 * label sitting in the same column as the `key` cell (column A). The existing
 * "Number of Nights" row stays the single nights source even though it sits
 * ABOVE the Item_ID row, so the whole label column is searched, not only the
 * rows below the key. Google is not reshaped to suit a reader: this reader
 * follows Google.
 *
 * Every contracted label must appear exactly once. A missing label is refused
 * rather than read as "blank everywhere": a renamed Modifiers row would
 * otherwise drop SECOND_NIGHT_COMPLIMENTARY and charge a night the Owner gave
 * away, and a lost Effective_To would make an expired rate look unbounded.
 * Individual blank CELLS stay allowed and stay absent, as everywhere else.
 *
 * A product is a column to the right of the label column whose key cell is
 * filled. A column that carries metadata in a contracted row but no key is
 * refused, never skipped, and so is a sheet with no product at all.
 */
function readItemColumns(grid, range, key, labels) {
  const keyCells = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] || [];
    for (let c = 0; c < row.length; c++) if (clean(row[c]) === key) keyCells.push({ r, c });
  }
  if (!keyCells.length) refuse('SOURCE_NO_HEADER', range + ' has no row labelled ' + key);
  if (keyCells.length > 1) {
    refuse('SOURCE_AMBIGUOUS', range + ' labels ' + key + ' in ' +
      keyCells.map((k) => columnLetter(k.c) + (k.r + 1)).join(' and ') + '; the label row has to be unique');
  }
  const { r: keyRow, c: labelCol } = keyCells[0];

  const rowOf = {};
  for (let r = 0; r < grid.length; r++) {
    const label = clean((grid[r] || [])[labelCol]);
    if (!labels.includes(label)) continue;
    if (rowOf[label] !== undefined) {
      refuse('SOURCE_AMBIGUOUS', range + ' labels "' + label + '" in rows ' + (rowOf[label] + 1) + ' and ' + (r + 1));
    }
    rowOf[label] = r;
  }
  const missing = labels.filter((l) => rowOf[l] === undefined);
  if (missing.length) {
    refuse('SOURCE_NO_HEADER', range + ' has no row labelled ' + missing.join(', ') +
      ' in column ' + columnLetter(labelCol));
  }

  const width = Math.max(0, ...labels.map((l) => (grid[rowOf[l]] || []).length));
  const records = [];
  for (let c = labelCol + 1; c < width; c++) {
    const values = {};
    for (const label of labels) {
      const raw = (grid[rowOf[label]] || [])[c];
      if (raw == null || String(raw).trim() === '') continue;
      values[label] = typeof raw === 'string' ? raw.trim() : raw;
    }
    const where = 'column ' + columnLetter(c);
    if (!clean((grid[keyRow] || [])[c])) {
      if (Object.keys(values).length) {
        refuse('SOURCE_NO_KEY', where + ' of ' + range + ' carries ' + Object.keys(values).join(', ') +
          ' but no ' + key);
      }
      continue;
    }
    records.push({ values, where });
  }
  if (!records.length) refuse('SOURCE_EMPTY', range + ' names no product in its ' + key + ' row');
  return records;
}

/** The five tabs one settlement calculation reads, in the order they are fetched. */
export const SOURCE_TAB_KEYS = Object.freeze(['accommodationDetails', 'specialRates', 'bookingEvidenceIndex', 'paymentJournal', 'billingConfig']);

/**
 * ONE READ REQUEST FOR THE WHOLE SOURCE (Owner, 6 Oct 2026). The tabs named by
 * `keys` are fetched together through values:batchGet and handed to the loaders
 * below as `cfg.grids`, so loading items, rates, evidence, journal and config
 * costs one request against the Sheets quota instead of five. Nothing is parsed
 * differently: every loader still reads its own range from the grid it gets.
 */
export async function prefetchTabs(env, cfg, keys) {
  const list = (Array.isArray(keys) ? keys : SOURCE_TAB_KEYS).filter((k) => TAB_OF_KEY[k]);
  const ranges = list.map((k) => rangeFor(cfg, k));
  const grids = await batchReadRanges(env, spreadsheetIdOf(cfg), ranges);
  const out = {};
  ranges.forEach((r, i) => { out[r] = grids[i]; });
  return { ...cfg, grids: out };
}

/* A WRITE, AND THE CHECK BEFORE IT, ALWAYS READ GOOGLE NOW (Codex round 7): a grid
   prefetched for a calculation is a snapshot, and deciding a payment on a snapshot
   could overwrite a decision made since. Every path that writes 008 drops it. */
const live = (cfg) => { if (!cfg || !cfg.grids) return cfg; const { grids, ...rest } = cfg; return rest; };

/** One tab, read and shaped: the range, the header and the records. */
async function readTab(env, cfg, key) {
  const range = rangeFor(cfg, key);
  const grid = await readGrid(env, cfg, range);
  const table = readTable(grid, range, keyFor(cfg, key));
  return { range, tab: tabFor(cfg, key), header: table.header, records: table.records };
}

/** Project a record onto a contracted field list, keeping the values verbatim. */
function pick(values, fields) {
  const out = {};
  for (const f of fields) if (values[f] !== undefined) out[f] = values[f];
  return out;
}

/* ------------------------------------------ 002 · structured item metadata */

/** Freeze · C — the structured columns that are engine input. */
export const ITEM_FIELDS = Object.freeze([
  'Item_ID', 'Billing_Category', 'Rate_Status', 'Effective_From', 'Effective_To',
  'Rate_Basis', 'Standard_Rate', 'Quota', 'Quota_Unit', 'Max_Pax',
  'Change_Cutoff', 'Cancellation_Cutoff', 'Currency',
  /* INTEGRATION METADATA, NOT A FINANCIAL VALUE (Owner, 5 Oct 2026): which
   * website product this Item covers. Item_ID stays the canonical billing
   * identifier; this column only bridges to the site's own product keys and
   * may never carry price logic. */
  'Site_Product_Key',
  /* THE ONE NIGHTS SOURCE (Owner, 5 Oct 2026): 002 already carries this row,
   * so no second, independently maintained nights field is created. It is
   * normalised to `nights` for the engine and never inferred from display
   * text; Check-in / Check-out serve reconciliation, never substitution. */
  'Number of Nights',
]);

/** The 002 column that carries the authoritative nights value. */
export const NUMBER_OF_NIGHTS_COLUMN = 'Number of Nights';
/** The 002 column that bridges an Item to the website's product keys. */
export const SITE_PRODUCT_KEY_COLUMN = 'Site_Product_Key';

/** Optional, comma or pipe separated (Freeze · E). */
export const ITEM_MODIFIERS_COLUMN = 'Modifiers';

const MODIFIER_NAMES = Object.freeze(Object.values(MODIFIER));

/**
 * Modifiers are the one field this adapter interprets rather than passes on,
 * so an undefined token is refused instead of dropped: a mistyped
 * SECOND_NIGHT_COMPLIMENTARY that is quietly ignored charges the guest for a
 * night the Owner gave away. Defined tokens are kept verbatim and matched
 * verbatim by the engine.
 */
function parseModifiers(raw, itemId, where, tab) {
  const text = clean(raw);
  if (!text) return null;
  const tokens = text.split(/[,|]/).map(clean).filter(Boolean);
  if (!tokens.length) return null;
  for (const t of tokens) {
    if (!MODIFIER_NAMES.includes(t)) {
      refuse('SOURCE_UNKNOWN_MODIFIER', where + ' of ' + tab + ' gives ' + itemId +
        ' the modifier "' + t + '", which the Freeze does not define');
    }
  }
  return tokens;
}

/**
 * Freeze · C — only ACTIVE metadata is engine input, so an ACTIVE row is
 * preferred over a DRAFT or RETIRED predecessor carrying the same Item_ID, and
 * among several ACTIVE rows the one in force on `asOf` wins. Two that are both
 * in force is an ambiguous rate: picking either one would decide a guest's
 * bill by column order, so it is refused. A single item is handed over even
 * when it is not ACTIVE, because the engine's own answer is more useful than
 * pretending the item does not exist (and a DRAFT item still serves the
 * person an ACTIVE 009 rate names). Several candidates with no single ACTIVE
 * one in force are refused too: silently taking the last one would let column
 * order decide which nights, category or rate a guest is billed on.
 */
function chooseItemRow(itemId, list, asOf, tab) {
  if (list.length === 1) return list[0].item;
  const where = (cands) => cands.map((c) => c.where).join(' and ') + ' of ' + tab;
  const active = list.filter((c) => clean(c.item.Rate_Status) === RATE_STATUS.ACTIVE);
  if (!active.length) {
    refuse('SOURCE_AMBIGUOUS', where(list) + ' all describe ' + itemId + ' and none of them is ACTIVE');
  }
  if (active.length === 1) return active[0].item;

  const inForce = active.filter((c) => itemIsActiveOn(c.item, asOf));
  if (inForce.length === 1) return inForce[0].item;
  refuse('SOURCE_AMBIGUOUS', where(inForce.length ? inForce : active) +
    (inForce.length ? ' both describe an ACTIVE ' : ' describe an ACTIVE ') + itemId +
    (inForce.length
      ? (clean(asOf) ? ' on ' + clean(asOf) : ' and no cfg.asOf was given to tell them apart')
      : ' and none of them is in force' + (clean(asOf) ? ' on ' + clean(asOf) : '')));
}

/** The labelled 002 rows this adapter reads: the contracted fields plus Modifiers. */
export const ITEM_ROW_LABELS = Object.freeze([...ITEM_FIELDS, ITEM_MODIFIERS_COLUMN]);

/**
 * Freeze · C, D — the structured item metadata, keyed by Item_ID, exactly as
 * engine.calculate expects it in ctx.items. 002 is read PRODUCT-IN-COLUMNS
 * (readItemColumns): one Item per product column, each field taken from its
 * labelled row in that same column, the nights from the existing "Number of
 * Nights" row. Display rows carry no contracted label and are never read.
 *
 * Pass cfg.asOf (the calculation date) so a superseded ACTIVE column from an
 * earlier window is not mistaken for a second answer.
 */
export async function loadItems(env, cfg) {
  const tab = tabFor(cfg, 'accommodationDetails');
  const range = rangeFor(cfg, 'accommodationDetails');
  const grid = await readGrid(env, cfg, range);
  const records = readItemColumns(grid, range, keyFor(cfg, 'accommodationDetails'), ITEM_ROW_LABELS);

  const candidates = new Map();
  for (const rec of records) {
    const itemId = clean(rec.values.Item_ID);
    const item = pick(rec.values, ITEM_FIELDS);
    item.Item_ID = itemId;
    const mods = parseModifiers(rec.values[ITEM_MODIFIERS_COLUMN], itemId, rec.where, tab);
    if (mods) item.Modifiers = mods;
    const list = candidates.get(itemId);
    if (list) list.push({ item, where: rec.where });
    else candidates.set(itemId, [{ item, where: rec.where }]);
  }

  const asOf = clean(cfg && cfg.asOf);
  const out = {};
  for (const [itemId, list] of candidates) out[itemId] = chooseItemRow(itemId, list, asOf, tab);
  return out;
}

/* ----------------------------------------------------- 009 · special rates */

/** Freeze · A, F — the fields a Named Special Rate carries. Nothing else is read. */
export const SPECIAL_RATE_FIELDS = Object.freeze([
  'Holder_ID', 'Person_ID', 'Item_ID', 'Rate_Per_Person_Night', 'Nights_Rule',
  'Rate_Status', 'Effective_From', 'Effective_To', 'Approved_By', 'Note',
]);

/**
 * Freeze · A, F — Named Special Rates come ONLY from 009. Prose in 002 is
 * human documentation and is never machine-read.
 *
 * Every row naming an Item_ID is carried, including one this holder's
 * calculation can never match, because 009 is also the Activation Gate's
 * evidence (Freeze · AB condition 3, "ACTIVE rates all carry Approved_By") and
 * the gate has to see what is really in the tab, not a filtered view of it.
 */
export async function loadSpecialRates(env, cfg) {
  const { records } = await readTab(env, cfg, 'specialRates');
  return records.map((r) => pick(r.values, SPECIAL_RATE_FIELDS));
}

/* -------------------------------------------------- 010 · evidence index */

/**
 * Freeze · Q — the booking evidence index, carried column for column exactly
 * as the tab spells it. No projection: unlike 002, 009 and 008, no contract in
 * this codebase fixes 010's columns, so narrowing it to a guessed field list
 * would be this adapter inventing a schema and dropping whatever the Freeze
 * adds next.
 */
/* ------------------------------------------------- 006 · the guest register */

/**
 * The register's Nationality per 006 ID (CONxxx), and nothing else of the row:
 * the payment-preference default needs exactly this one fact. An ID that
 * appears twice is ambiguous and is answered as such, never by the first row.
 */
export async function loadGuestNationalities(env, cfg) {
  const { records } = await readTab(env, cfg, 'guestlist');
  const out = {};
  for (const r of records) {
    const id = clean(r.values.ID);
    if (!id) continue;
    out[id] = out[id] === undefined ? clean(r.values.Nationality) : { ambiguous: true };
  }
  return out;
}

/** The register's answer for one 006 ID: { found, value, reason }. */
export function nationalityOf(register, contactId) {
  const id = clean(contactId);
  if (!id) return { found: false, value: null, reason: 'PERSON_NOT_IN_REGISTER' };
  const v = register ? register[id] : undefined;
  if (v === undefined) return { found: false, value: null, reason: 'PERSON_NOT_IN_REGISTER' };
  if (v && typeof v === 'object') return { found: false, value: null, reason: 'REGISTER_ID_AMBIGUOUS' };
  return { found: true, value: v, reason: null };
}

export async function loadEvidenceIndex(env, cfg) {
  const { records } = await readTab(env, cfg, 'bookingEvidenceIndex');
  return records.map((r) => r.values);
}

/* ----------------------------------------------------- 008 · the journal */

/**
 * Freeze · J, K — the documented column order of the canonical guest payment
 * journal. It is exported so that the Worker's append and the sheet's layout
 * are the same list in one place and cannot drift apart.
 */
export const PAYMENT_JOURNAL_COLUMNS = Object.freeze([
  'Payment_ID', 'Settlement_ID', 'Holder_ID', 'Revision_Ref', 'Entry_Type', 'Method',
  'Amount_Paid', 'Currency_Paid', 'Amount_USD', 'Reported_By', 'Reported_At',
  'Provider_Reference', 'Evidence', 'Verified_By', 'Verified_At',
  'Record_Status', 'Reject_Reason', 'Duplicate_Suspect',
]);

/**
 * The header row 008 must carry, in this order. It is deliberately the same
 * list as the write order: `checkJournalHeader` compares the tab against it
 * before every read and every append, so a renamed or reordered column stops
 * the operation instead of misfiling a payment.
 */
export const PAYMENT_JOURNAL_HEADER = Object.freeze([...PAYMENT_JOURNAL_COLUMNS]);

/**
 * The fields an appended row must carry. Reported_At is among them because
 * settlement.isDuplicateSuspect returns false without it: a row with no
 * reported time would never be recognised as a duplicate of anything.
 * Amount_USD is NOT required, because converting it is not this adapter's job
 * (Freeze · M — the only FX that counts is the one frozen in the Snapshot).
 */
export const PAYMENT_JOURNAL_REQUIRED = Object.freeze([
  'Payment_ID', 'Settlement_ID', 'Entry_Type', 'Method',
  'Amount_Paid', 'Currency_Paid', 'Reported_At', 'Record_Status',
]);

function checkJournalHeader(header, range) {
  const got = header.map(clean);
  for (let i = 0; i < PAYMENT_JOURNAL_HEADER.length; i++) {
    if (got[i] === PAYMENT_JOURNAL_HEADER[i]) continue;
    refuse('SOURCE_HEADER_DRIFT', range + ' column ' + (i + 1) + ' reads "' +
      (got[i] || '(blank)') + '" where the journal contract says "' +
      PAYMENT_JOURNAL_HEADER[i] + '"');
  }
}

/** Freeze · K — the journal as it stands, for paymentPosition and duplicate checks. */
export async function loadPaymentJournal(env, cfg, opts) {
  /* opts.fresh: read 008 now, never from a prefetched grid (a decision is checked on it) */
  const { range, header, records } = await readTab(env, opts && opts.fresh ? live(cfg) : cfg, 'paymentJournal');
  checkJournalHeader(header, range);
  return records.map((r) => pick(r.values, PAYMENT_JOURNAL_COLUMNS));
}

/* TRUE / FALSE because that is what the sheet and Freeze · J speak; an absent
 * value stays blank rather than becoming a FALSE nobody recorded. */
const cellOf = (v) => (v === true ? 'TRUE' : v === false ? 'FALSE' : (v == null ? '' : v));

/**
 * Freeze · J, K — append ONE row to the canonical journal, in the documented
 * column order. The header is verified first, so the write cannot land in
 * shifted columns. Nothing is computed on the way: the amounts, the status and
 * the Duplicate_Suspect flag are the caller's recorded facts.
 *
 * There is no fallback. If Google rejects the append, GoogleSheetsUnavailable
 * propagates and the operation fails visibly; the website never keeps a second
 * journal of its own.
 */
export async function appendPaymentJournalRow(env, cfg, row) {
  const r = row && typeof row === 'object' ? row : {};
  const missing = PAYMENT_JOURNAL_REQUIRED.filter((f) => !clean(r[f]));
  if (missing.length) {
    refuse('SOURCE_ROW_INCOMPLETE',
      'a payment journal row cannot be appended without ' + missing.join(', '));
  }

  const { range, header } = await readTab(env, live(cfg), 'paymentJournal');
  checkJournalHeader(header, range);

  const values = PAYMENT_JOURNAL_COLUMNS.map((c) => cellOf(r[c]));
  const target = quoteTab(tabFor(cfg, 'paymentJournal')) + '!A1';
  const result = await appendRow(env, spreadsheetIdOf(cfg), target, values);
  return { range: target, columns: PAYMENT_JOURNAL_COLUMNS, values, result: result ?? null };
}

/* --------------------------------------------------------------- FX rows */

/**
 * Freeze · M — the FX rows settlement.freezeFx picks from. It reads
 * Effective_From, FX_USD_THB and FX_USD_EUR; the rows are handed over whole so
 * an added column (who recorded the rate, where it came from) survives into
 * the Snapshot's reference rather than being dropped here.
 */
export async function loadBillingConfig(env, cfg) {
  const { records, tab } = await readTab(env, cfg, 'billingConfig');
  return records.map((r) => ({ ...r.values, _sheetRow: r.sheetRow, _tab: tab }));
}

/** The config keys the Freeze requires before Issue & Publish (Owner · 4). */
export const REQUIRED_CONFIG_KEYS = Object.freeze(['FX_USD_THB', 'FX_USD_EUR']);

/**
 * Resolve ONE applicable ACTIVE value for a Config_Key (Owner, 5 Oct 2026).
 *
 * There is NO fallback of any kind. Zero applicable rows, more than one, or an
 * unusable Value are all the same answer: the engine must not decide, so the
 * caller receives a gap and Issue & Publish is blocked. A "most recent wins"
 * heuristic is exactly what this replaces.
 *
 * WHAT COUNTS AS USABLE (Owner, 5 Oct 2026 · FX wiring of the gate). The row
 * must be Owner-approved (Approved_By), its Value a plain positive decimal
 * ("36.25", never "36,25" or "1,234") and its Effective dates blank or ISO
 * YYYY-MM-DD, read as UTC calendar days; the evaluation date must be a valid
 * YYYY-MM-DD as well. A date the sheet renders in its own
 * locale (e.g. 01/10/2026) cannot be compared safely, so an ACTIVE row
 * carrying one blocks its key instead of being guessed in or out of force.
 */
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function isoDayOf(v) {
  const s = clean(v);
  if (!s) return '';
  if (!ISO_DAY.test(s)) return null;
  const t = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === s ? s : null;
}
function configNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? v : null;
  const s = clean(v);
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function resolveConfigValue(configRows, key, isoDate) {
  /* the day the value must be in force on. Without a valid one no validity
     window can be checked, so nothing resolves — never an undated guess */
  const d = isoDayOf(isoDate);
  if (!d) {
    return { value: null, row: null,
      gap: key + ': no valid evaluation date (YYYY-MM-DD) to check Effective_From / Effective_To against' };
  }
  const active = (Array.isArray(configRows) ? configRows : [])
    .filter((r) => clean(r.Config_Key) === key && clean(r.Status) === RATE_STATUS.ACTIVE);
  const undated = active.filter((r) => isoDayOf(r.Effective_From) === null || isoDayOf(r.Effective_To) === null);
  if (undated.length) {
    return { value: null, row: null,
      gap: key + ': Effective_From / Effective_To is not an ISO date YYYY-MM-DD (rows ' +
        undated.map((r) => r._sheetRow).join(', ') + ')' };
  }
  const applicable = active.filter((r) => {
    const from = isoDayOf(r.Effective_From);
    const to = isoDayOf(r.Effective_To);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  if (!applicable.length) {
    return { value: null, row: null, gap: key + ': no applicable ACTIVE value in ' + TAB.BILLING_CONFIG };
  }
  if (applicable.length > 1) {
    return { value: null, row: null,
      gap: key + ': ' + applicable.length + ' applicable ACTIVE values (rows ' +
        applicable.map((r) => r._sheetRow).join(', ') + ') — exactly one is required' };
  }
  const row = applicable[0];
  if (!clean(row.Approved_By)) {
    return { value: null, row, gap: key + ': ACTIVE value carries no Approved_By (row ' + row._sheetRow + ')' };
  }
  const n = configNumber(row.Value);
  if (n == null) {
    return { value: null, row, gap: key + ': Value is not a usable number (row ' + row._sheetRow + ')' };
  }
  return { value: n, row, gap: null };
}

/* where one resolved config value came from — audit evidence, never an input */
function provenanceOf(res) {
  const r = res && res.row;
  if (!r || res.value == null) return null;
  return {
    Value: res.value,
    Effective_From: isoDayOf(r.Effective_From) || null,
    Effective_To: isoDayOf(r.Effective_To) || null,
    Approved_By: clean(r.Approved_By) || null,
    Approved_At: clean(r.Approved_At) || null,
    sheetRow: r._sheetRow ?? null,
  };
}

/**
 * The FX pair for an Issue Date, resolved strictly from 011_Billing_Config.
 * `gaps` is empty only when BOTH rates resolved to exactly one ACTIVE value.
 */
export function resolveFx(configRows, isoDate) {
  const thb = resolveConfigValue(configRows, 'FX_USD_THB', isoDate);
  const eur = resolveConfigValue(configRows, 'FX_USD_EUR', isoDate);
  return {
    FX_USD_THB: thb.value,
    FX_USD_EUR: eur.value,
    Effective_From: (thb.row && clean(thb.row.Effective_From)) || null,
    Approved_By: (thb.row && clean(thb.row.Approved_By)) || null,
    gaps: [thb.gap, eur.gap].filter(Boolean),
    /* per currency, so an audit names both approvals, not THB's alone */
    provenance: { FX_USD_THB: provenanceOf(thb), FX_USD_EUR: provenanceOf(eur) },
  };
}

/* ------------------------------------------------- the Site_Product_Key map */

/**
 * `Site_Product_Key -> Item_ID`, strictly (Owner, 5 Oct 2026).
 *
 * One ACTIVE site key maps to exactly one ACTIVE Item_ID. A key claimed by two
 * ACTIVE Items is NOT resolved by order or by name similarity: it is reported
 * as a duplicate so the caller raises MANUAL_REVIEW_REQUIRED. Nothing here
 * ever guesses from a room name or a display label.
 */
export function siteProductKeyIndex(items) {
  const index = {};
  const duplicates = [];
  const claims = {};
  for (const [itemId, it] of Object.entries(items || {})) {
    const raw = clean(it && it[SITE_PRODUCT_KEY_COLUMN]);
    if (!raw) continue;
    for (const key of raw.split(/[,|]/).map(clean).filter(Boolean)) {
      (claims[key] || (claims[key] = [])).push(itemId);
    }
  }
  for (const [key, owners] of Object.entries(claims)) {
    const unique = [...new Set(owners)];
    if (unique.length > 1) duplicates.push({ Site_Product_Key: key, Item_IDs: unique });
    else index[key] = unique[0];
  }
  return { index, duplicates };
}

/** The authoritative nights for an Item: 002's own row, or nothing. */
export function nightsOfItem(item) {
  const raw = item == null ? '' : item[NUMBER_OF_NIGHTS_COLUMN];
  if (raw === undefined || raw === null || clean(raw) === '') return null;
  const n = Number(String(raw).replace(/[, ]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Items used by a settlement whose Number of Nights is missing or unusable. */
export function nightsGaps(items, itemIds) {
  const wanted = Array.isArray(itemIds) && itemIds.length ? itemIds : Object.keys(items || {});
  const out = [];
  for (const id of wanted) {
    const it = (items || {})[id];
    if (!it) continue;
    /* only a nightly basis needs nights */
    if (clean(it.Rate_Basis) !== 'PER_PERSON_PER_NIGHT') continue;
    if (nightsOfItem(it) == null) out.push(id);
  }
  return out;
}

/* ================= the one-time verification of a payment row ==============
   OWNER CLARIFICATION, 5 October 2026. The journal stays append-only in the
   sense that matters: a Payment_ID row is created once and its FINANCIAL
   payload is immutable for ever. What is completed afterwards is the single
   administrative decision that was still pending when the guest reported it.

   Writable exactly once, by BILLING_ADMIN:
       Record_Status · Verified_By · Verified_At · Reject_Reason
   Allowed:   REPORTED -> VERIFIED      REPORTED -> REJECTED
   Forbidden: a second decision, and any way back to REPORTED.

   A VERIFIED movement that later turns out wrong is NEVER edited: a new
   REFUND or ADJUSTMENT row is appended with its own Payment_ID.

   In 008 the four fields are contiguous, so the write covers that block and
   nothing else. Amount, method, currency and the duplicate flag are never in
   the written range, which is checked here rather than assumed.
   ========================================================================= */

const COLUMN_LETTER = (n) => {
  let out = '', i = n;
  while (i >= 0) { out = String.fromCharCode(65 + (i % 26)) + out; i = Math.floor(i / 26) - 1; }
  return out;
};

/** The fields a verification may write, and nothing else. */
export const VERIFICATION_FIELDS = Object.freeze(['Verified_By', 'Verified_At', 'Record_Status', 'Reject_Reason']);

function verificationBlock() {
  const idx = VERIFICATION_FIELDS.map((f) => PAYMENT_JOURNAL_COLUMNS.indexOf(f));
  if (idx.some((i) => i < 0)) {
    refuse('SOURCE_HEADER_DRIFT', 'the payment journal column order no longer carries the verification fields');
  }
  const min = Math.min(...idx), max = Math.max(...idx);
  if (max - min + 1 !== VERIFICATION_FIELDS.length) {
    refuse('SOURCE_HEADER_DRIFT', 'the verification fields are no longer contiguous: a write would touch a financial column');
  }
  return { first: COLUMN_LETTER(min), last: COLUMN_LETTER(max), order: PAYMENT_JOURNAL_COLUMNS.slice(min, max + 1) };
}

/**
 * Record the one-time BILLING_ADMIN decision on a reported payment.
 * `decision` is 'VERIFIED' or 'REJECTED'. Each refusal carries its own code so
 * the caller can tell "no such payment" from "already decided".
 */
export async function updatePaymentVerification(env, cfg, input, opts) {
  const paymentId = clean(input && input.Payment_ID);
  const decision = clean(input && input.decision).toUpperCase();
  const verifiedBy = clean(input && input.verifiedBy);
  const verifiedAt = clean(input && input.verifiedAt);
  const rejectReason = clean(input && input.rejectReason);

  if (!paymentId) refuse('SOURCE_ROW_INCOMPLETE', 'a Payment_ID is required to record a verification');
  if (decision !== 'VERIFIED' && decision !== 'REJECTED') {
    refuse('SOURCE_ROW_INCOMPLETE', 'the decision must be VERIFIED or REJECTED, not ' + (decision || '(none)'));
  }
  if (!verifiedBy || !verifiedAt) refuse('SOURCE_ROW_INCOMPLETE', 'a verification must record who decided and when');
  if (decision === 'REJECTED' && !rejectReason) refuse('SOURCE_ROW_INCOMPLETE', 'a rejection must carry a Reject_Reason');

  const { records, tab } = await readTab(env, live(cfg), 'paymentJournal');
  const hit = records.find((r) => clean(r.values.Payment_ID) === paymentId);
  if (!hit) refuse('SOURCE_PAYMENT_NOT_FOUND', 'no payment ' + paymentId + ' in ' + tab);

  const current = clean(hit.values.Record_Status) || 'REPORTED';
  if (current !== 'REPORTED') {
    refuse('SOURCE_ALREADY_DECIDED', 'payment ' + paymentId + ' is already ' + current +
      ' — a decided payment is never re-decided; append a REFUND or ADJUSTMENT instead');
  }

  const block = verificationBlock();
  const written = {
    Verified_By: verifiedBy,
    Verified_At: verifiedAt,
    Record_Status: decision,
    Reject_Reason: decision === 'REJECTED' ? rejectReason : '',
  };
  const range = quoteTab(tab) + '!' + block.first + hit.sheetRow + ':' + block.last + hit.sheetRow;
  /* THE FENCE (Codex final review, round 3): the caller's last word before the
     write — it may refuse (the claim is no longer this writer's) and it names
     the deadline after which nothing is sent */
  const fence = opts && typeof opts.beforeWrite === 'function' ? await opts.beforeWrite() : null;
  await updateRange(env, spreadsheetIdOf(cfg), range, block.order.map((f) => written[f]),
    { notAfter: fence && fence.notAfter ? fence.notAfter : 0 });
  return { Payment_ID: paymentId, sheetRow: hit.sheetRow, range, ...written };
}

/* ---------------------------------------------------------- source hash */

/* Object keys are sorted so that the same data hashes the same whatever order
 * the loaders happened to build the objects in. Array order is preserved: the
 * row order of a tab is part of what was read, and reordering rows to make the
 * hash stable would hide a change in the source rather than report it. */
function canonicalise(value) {
  if (Array.isArray(value)) return value.map(canonicalise);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      const v = canonicalise(value[key]);
      if (v !== undefined) out[key] = v;
    }
    return out;
  }
  return value;
}

/**
 * Freeze · R — the Source_Hash stored in the immutable Settlement Snapshot.
 * It is a fingerprint of the loaded source, so a later change in Google can be
 * detected (Freeze · X · drift) without re-reading what the revision was
 * issued from. Deterministic: same source, same hash, forever.
 *
 * `payload` is whatever the caller loaded, typically
 *   { items, specialRates, fx, evidence }
 */
export async function sourceHash(payload) {
  const canonical = JSON.stringify(canonicalise(payload)) ?? 'null';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
