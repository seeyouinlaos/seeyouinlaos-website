/* ============================================================================
   H&S WEDDING 2027 — THE REVENUE OVERVIEW (BILLING_ADMIN only)
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · U).

   WHY THIS FILE CARRIES NO ARITHMETIC OF ITS OWN. A revenue screen is exactly
   where a second financial formula creeps into a billing system. Somebody
   needs "the total", the rate table is one import away, and a rate gets
   multiplied by a number of nights right there in the view. From that moment
   the operation has two answers and no way of telling which one is wrong.
   The Freeze closes that door (Freeze · U, V): src/billing/engine.js is the
   only place a guest amount is derived, and this module is an aggregator. It
   groups, labels and adds up figures that the engine and
   src/billing/settlement.js have already produced. There is no rate, no night
   count, no tolerance and no multiplication below.

   Concretely, every number here traces to one of four sanctioned sources:
     · engine.calculate()        — Confirmed Revenue, hosted value, Block B,
                                   and the quota usage it ran through
                                   engine.quotaUsage over every booking
     · the Revision Snapshot     — the issued amount, frozen at Issue & Publish
                                   (Freeze · R), read, never recomputed
     · settlement.journalPosition — VERIFIED payments net VERIFIED refunds
     · settlement.paymentStatus  — the Soll/Ist position, its status under the
                                   Freeze · N tolerance, and the OVERDUE flag

   HOW IT BEHAVES WHEN DATA IS MISSING. It refuses, exactly as the engine
   does. A KPI whose inputs are incomplete carries `cents: null`,
   `complete: false`, `review: MANUAL_REVIEW_REQUIRED` and a `gaps` list
   naming every Holder and reason; the furthest the sanctioned functions got
   is offered separately as `partial`, clearly marked, so the Billing Manager
   can see the computable part without ever mistaking it for the total.
   Nothing is inferred, averaged or filled in.

   ONE CALCULATION PASS, NOT ONE PER HOLDER. Every Confirmed Booking of every
   Holder goes through a single engine.calculate() call, because PER_ROOM,
   PER_HOLDER and FLAT items are collapsed to the one Bill_To_Holder_ID that
   carries them (Freeze · B). Calculating holder by holder would hand each
   holder its own view of a shared room and double-count it in the portfolio.
   The breakdown is then attributed by Bill_To_Holder_ID, which is the account
   the Freeze says the charge belongs to.

   SELF-PAY AND SELF-BOOK ARE NOT REVENUE. The engine puts them in Block B
   with no amount at all, because the guest settles them with the provider.
   They are reported as a count of lines and the items involved, never as
   money, and they never touch a total (Freeze · E, S).

   READ ONLY, AND NOT A GUEST SURFACE. This module appends nothing, issues
   nothing and knows no credentials: it takes the journal rows it is handed
   and returns a payload. 008_Payment_Journal in Google stays the canonical
   journal, and no figure here is ever written back. The Worker route that
   serves this MUST refuse any role other than BILLING_ADMIN (Freeze · Y);
   the payload states its own audience so the surface can assert it.

   DETERMINISTIC. No clock, no network, no storage. `asOf` is supplied by the
   caller, holder rows come back in Holder_ID order, so the same inputs always
   render the same table.

   INPUTS
     holders   — array (or map keyed by Holder_ID) of
                 { Holder_ID, Settlement_ID, Phase?, label?,
                   bookings: [...], drifts: [{ code, resolved }] }
     items     — the structured item metadata, keyed by Item_ID, as the engine
                 expects it
     specialRates  — the 009_Special_Rates rows
     journalRows   — the 008_Payment_Journal rows
     issuedRevisions — revision records, each carrying Settlement_ID,
                 Revision, Revision_State and either the Snapshot (`snapshot`)
                 or its Total_Payable_Cents / Issue_Date / Due_Date directly
     asOf      — 'YYYY-MM-DD', the date the overview is read on
   ========================================================================== */

import {
  ACCOUNTING_CURRENCY, DRIFT_BLOCKING, MANUAL_REVIEW_REQUIRED, PAYMENT_STATUS,
  RECORD_STATUS, REVISION_STATE, ROLE, formatUSD, fromCents, toCents,
} from './model.js';
import { calculate } from './engine.js';
import { dueDateFor, journalPosition, paymentStatus } from './settlement.js';
import { siteKeyOf, keyStage } from './owner-bookings.js';
import { revenueClassesOf } from './revenue-classes.js';

export const REVENUE_VERSION = 'billing-revenue/2.5.0';

/** Freeze · Y — the only role this overview may ever be served to. */
export const REVENUE_AUDIENCE = ROLE.BILLING_ADMIN;

const UNATTRIBUTED = '(unattributed)';

const clean = (v) => String(v == null ? '' : v).trim();
const asArray = (v) => (Array.isArray(v) ? v : []);
const isTrue = (v) => v === true || clean(v).toUpperCase() === 'TRUE';
const day = (v) => clean(v).slice(0, 10) || null;
const byText = (a, b) => (a < b ? -1 : (a > b ? 1 : 0));

/** Cents stay the figure; the display string is only ever derived from them. */
function money(cents) {
  const c = Number.isFinite(cents) ? cents : null;
  return { cents: c, amount: fromCents(c), display: formatUSD(c) };
}

/* ------------------------------------------------------------ accumulators */
/* An accumulator adds up figures the sanctioned functions returned and
 * remembers, per Holder, every place one was missing. It never substitutes. */

function openAcc() { return { cents: 0, counted: 0, contributors: [], gaps: [] }; }

function add(acc, holderId, cents) {
  if (!Number.isFinite(cents)) return;
  acc.cents += cents;
  acc.counted += 1;
  if (cents !== 0) acc.contributors.push(holderId);
}

function gap(acc, holderId, reason) {
  acc.gaps.push({ Holder_ID: holderId || null, reason });
}

/**
 * `best` is the figure the sanctioned functions reached. A KPI is only
 * `complete` when that figure exists AND no gap was recorded; otherwise the
 * KPI reports null and hands over, under its own name, the furthest those
 * functions got: `best` when it exists, else the part that was attributable.
 */
function kpi(definition, acc, best, extra) {
  const complete = acc.gaps.length === 0 && Number.isFinite(best);
  const out = {
    definition,
    ...money(complete ? best : null),
    partial: complete ? null : money(Number.isFinite(best) ? best : acc.cents),
    complete,
    review: complete ? null : MANUAL_REVIEW_REQUIRED,
    countedHolders: acc.counted,
    contributors: acc.contributors,
    gaps: acc.gaps,
    currency: ACCOUNTING_CURRENCY,
  };
  if (extra) Object.assign(out, extra);
  return out;
}

/* ----------------------------------------------------------------- holders */

function normaliseHolders(holders) {
  let entries;
  if (Array.isArray(holders)) entries = holders.map((h) => [null, h]);
  else if (holders && typeof holders === 'object') entries = Object.entries(holders);
  else entries = [];

  const out = [];
  for (const [key, h] of entries) {
    if (!h || typeof h !== 'object') continue;
    out.push({
      Holder_ID: clean(h.Holder_ID || h.holderId || key) || null,
      Settlement_ID: clean(h.Settlement_ID || h.settlementId) || null,
      Phase: clean(h.Phase || h.phase) || null,
      label: clean(h.label || h.Label || h.Display_Name) || null,
      bookings: asArray(h.bookings || h.Bookings),
      drifts: asArray(h.drifts || h.Drifts),
      /* the ledger holds no settlement for this holder at all (a confirmed trip before its first statement) */
      noSettlementRecord: h.noSettlementRecord === true,
      /* BOOKED REVENUE (2.3.0 · Owner, 15 Nov 2026): the state of each source of this holder's bookings — the guest's own sent
         trip (registration) and the Owners' recorded bookings — decided apart, never through their combination */
      regState: clean(h.regState) || 'NONE',
      ownerState: clean(h.ownerState) || 'NONE',
      ownerProblems: asArray(h.ownerProblems).map(clean).filter(Boolean),
      extraBeds: asArray(h.extraBeds).map(clean).filter(Boolean),
      cancelled: h.cancelled === true,
    });
  }
  out.sort((a, b) => byText(clean(a.Holder_ID), clean(b.Holder_ID)));
  return out;
}

/* Freeze · X — the same test canIssue applies: unresolved AND issue-blocking. */
function blockingDriftsOf(drifts) {
  const out = [];
  for (const d of asArray(drifts)) {
    const code = clean(d && (d.code || d.Code) ? (d.code || d.Code) : d);
    if (!code) continue;
    const resolved = !!(d && (d.resolved === true || isTrue(d.Resolved)));
    if (!resolved && DRIFT_BLOCKING.includes(code) && out.indexOf(code) < 0) out.push(code);
  }
  return out;
}

/* ------------------------------------------------- the engine's own output */

function emptyGroup() {
  return {
    payableCents: 0, payableLines: 0,
    hostedValueCents: 0, hostedLines: 0, hostedGaps: 0,
    selfServiceLines: 0, selfServiceItems: [], review: [],
  };
}

/**
 * Attribute the engine's lines to the account that is billed for them
 * (Freeze · B — Bill_To_Holder_ID carries a whole-item charge). Nothing is
 * recalculated: the line amounts are added up exactly as calculate() adds
 * them up for its own total.
 */
function groupByBilledHolder(result) {
  const groups = new Map();
  const touch = (id) => {
    const k = clean(id) || UNATTRIBUTED;
    let g = groups.get(k);
    if (!g) { g = emptyGroup(); groups.set(k, g); }
    return g;
  };

  for (const l of asArray(result.blockA)) {
    const g = touch(l.Bill_To_Holder_ID || l.Holder_ID);
    if (l.hosted) {
      g.hostedLines += 1;
      if (Number.isFinite(l.hostedValueCents)) g.hostedValueCents += l.hostedValueCents;
      else g.hostedGaps += 1;          /* no Standard_Rate: the engine declined to value it */
      continue;
    }
    g.payableLines += 1;
    if (Number.isFinite(l.amountCents)) g.payableCents += l.amountCents;
  }
  for (const l of asArray(result.blockB)) {
    const g = touch(l.Bill_To_Holder_ID || l.Holder_ID);
    g.selfServiceLines += 1;
    const id = clean(l.Item_ID);
    if (id && g.selfServiceItems.indexOf(id) < 0) g.selfServiceItems.push(id);
  }
  for (const l of asArray(result.manualReview)) {
    const g = touch(l.Bill_To_Holder_ID || l.Holder_ID);
    g.review.push(clean(l.reviewReason) || MANUAL_REVIEW_REQUIRED);
  }
  return groups;
}

/* --------------------------------------------------------------- revisions */

/**
 * Freeze · I — "the current valid ISSUED revision". ISSUED and SUPERSEDED are
 * terminal records, so the current one is the highest-numbered revision of
 * that Settlement whose state is ISSUED. A row that carries no Revision_State
 * at all is taken at the parameter's word and reported, never assumed away.
 */
export function currentIssuedRevision(issuedRevisions, settlementId) {
  const sid = clean(settlementId);
  const out = { row: null, matches: 0, stateMissing: false };
  if (!sid) return out;

  let bestN = -Infinity;
  for (const r of asArray(issuedRevisions)) {
    if (!r || typeof r !== 'object') continue;
    const snap = r.snapshot || r.Snapshot || {};
    if (clean(r.Settlement_ID || snap.Settlement_ID) !== sid) continue;
    const state = clean(r.Revision_State || r.State);
    if (state && state !== REVISION_STATE.ISSUED) continue;
    if (!state) out.stateMissing = true;
    out.matches += 1;
    const n = Number(r.Revision != null ? r.Revision : snap.Revision);
    const rank = Number.isFinite(n) ? n : 0;
    if (!out.row || rank > bestN) { out.row = r; bestN = rank; }
  }
  return out;
}

/** Read the frozen total out of the Snapshot. Never recompute it. */
function issuedAmountOf(row) {
  if (!row) return { cents: null, reason: null };   /* nothing issued is a fact, not a gap */
  const snap = row.snapshot || row.Snapshot || {};
  let cents = null;
  if (Number.isFinite(row.Total_Payable_Cents)) cents = row.Total_Payable_Cents;
  else if (Number.isFinite(snap.Total_Payable_Cents)) cents = snap.Total_Payable_Cents;
  else cents = toCents(row.Total_Payable != null ? row.Total_Payable : snap.Total_Payable);

  if (cents == null) return { cents: null, reason: 'the ISSUED revision carries no Total_Payable_Cents' };
  const currency = clean(row.Currency || snap.Currency) || ACCOUNTING_CURRENCY;
  if (currency !== ACCOUNTING_CURRENCY) {
    return { cents: null, reason: 'the ISSUED revision is booked in ' + currency + ', not ' + ACCOUNTING_CURRENCY };
  }
  return { cents, reason: null };
}

/** The Due_Date as issued; only settlement.dueDateFor may derive a missing one. */
function issuedDatesOf(row) {
  if (!row) return { issueDate: null, dueDate: null, engineVersion: null };
  const snap = row.snapshot || row.Snapshot || {};
  const issueDate = day(row.Issue_Date || snap.Issue_Date);
  const override = day(row.Due_Date_Override || snap.Due_Date_Override);
  const stored = day(row.Due_Date || snap.Due_Date);
  return {
    issueDate,
    dueDate: stored || (issueDate || override ? dueDateFor(issueDate, override) : null),
    engineVersion: clean(row.Engine_Version || snap.Engine_Version) || null,
  };
}

/* ----------------------------------------------------------------- journal */

/**
 * Report-only integrity of 008_Payment_Journal. Duplicates stay counted: the
 * Freeze appends them with Duplicate_Suspect = TRUE and forbids deduplication
 * (Freeze · J), so the overview surfaces the count and lets a human decide.
 * A VERIFIED row whose Amount_USD will not parse is silently skipped by
 * paymentPosition, which would understate cash, so it is raised as a gap.
 */
function checkJournal(journal, knownSettlements) {
  const out = {
    rows: journal.length, verifiedUnparseable: 0, unmatchedRows: 0,
    missingSettlementId: 0, duplicateSuspects: 0,
  };
  for (const r of journal) {
    if (!r || typeof r !== 'object') continue;
    const sid = clean(r.Settlement_ID);
    if (!sid) out.missingSettlementId += 1;
    else if (!knownSettlements.has(sid)) out.unmatchedRows += 1;
    if (clean(r.Record_Status) === RECORD_STATUS.VERIFIED && toCents(r.Amount_USD) == null) {
      out.verifiedUnparseable += 1;
    }
    if (isTrue(r.Duplicate_Suspect)) out.duplicateSuspects += 1;
  }
  return out;
}

/* ===================================================== booked revenue (2.3.0) */
/*
 * BOOKED REVENUE (Owner, 15 Nov 2026 · "gebuchter Umsatz"). What is booked, line by line, from exactly two sanctioned
 * sources and never a formula:
 *   · the engine's lines of the ONE calculate() pass — the bookings a holder has CONFIRMED now (the guest's own sent
 *     trip, Booking_ID "BK·…", and the Owners' recorded bookings, "OB·…"; an unconfirmed booking never reaches the engine);
 *   · the frozen Revision Snapshot lines of the current ISSUED revision — for a source of the holder that exists but is
 *     not confirmed now (a lapsed confirmation, an Owners' record changed since): the last binding agreement stands
 *     until the change is confirmed; and for a CANCELLED holder (no longer in the register) with a statement: as issued.
 * Each source of a holder is decided on its own state (never on the two combined), so a confirmed source is never
 * dropped because the other one waits. Then, by Booking_ID, against the issued statement: booked and not yet invoiced,
 * changed since issue (engine today against the frozen snapshot: a rate change since issue lands here, never in "not yet
 * invoiced"), invoiced but no longer booked. The same person booked for the same stay twice — on two holders, or the
 * guest's own trip and the Owners' record of the same holder (the rule the Issue gate uses, owner-bookings.js · keyStage)
 * — is a DOUBLE BOOKING, and it is NEVER settled here: which booking stands is the Owners' decision. Every holder in such
 * a pair becomes a named gap of the booked AND the confirmed figure (both lines listed); the computable rest is offered as
 * `partial`. A CANCELLED holder (no longer in the register) books nothing: its statement stays issued and receivable as
 * the ledger says, and appears as invoiced but no longer booked. The Owners' bookings with a problem the Issue gate refuses
 * (an extra bed without its own approved 009 row, a room over capacity …) are a named gap, never revenue.
 */
const isOwnerLine = (l) => clean(l && l.Booking_ID).startsWith('OB·');
const linePayable = (l) => l && l.block === 'A' && Number.isFinite(l.amountCents);
function issuedLinesOf(row) {
  if (!row) return [];
  const snap = row.snapshot || row.Snapshot || row;
  return asArray(snap.lines || row.lines).filter(linePayable);
}
function sumCents(lines) { let c = 0; for (const l of lines) c += l.amountCents; return c; }

function bookedPicture({ perHolder, result, items, journal }) {
  /* the engine's own lines, by the account billed (Freeze · B) — payable and hosted (Block A), and the lines under review */
  const engineBy = new Map(), reviewBy = new Map();
  for (const l of asArray(result.blockA)) { const k = clean(l.Bill_To_Holder_ID || l.Holder_ID); if (!engineBy.has(k)) engineBy.set(k, []); engineBy.get(k).push(l); }
  for (const l of asArray(result.manualReview)) { const k = clean(l.Bill_To_Holder_ID || l.Holder_ID); reviewBy.set(k, (reviewBy.get(k) || 0) + 1); }

  const acc = { booked: openAcc(), notYet: openAcc(), changed: openAcc(), notBooked: openAcc() };
  const holders = [];          /* per holder: the booked lines and where they came from */
  const extraBeds = new Set();
  const cancelledHolders = [];
  const lapsed = [];
  const lapsedNotCounted = [];   /* a newer version sent, nothing confirmed or issued: not counted until confirmed */
  const ownerWaiting = [];   /* the Owners' records changed since their confirmation: booked as last issued, or not at all */

  for (const x of perHolder) {
    const { h, holderId, key } = x;
    for (const b of h.extraBeds) extraBeds.add(b);
    if (h.cancelled) cancelledHolders.push({ Holder_ID: holderId, Settlement_ID: h.Settlement_ID, issued: x.issuedRow ? money(x.issuedCents) : null });
    if (h.regState === 'LAPSED' && x.issuedRow) lapsed.push(holderId);
    else if (h.regState === 'LAPSED') lapsedNotCounted.push(holderId);
    if (h.ownerState === 'RECORDED') ownerWaiting.push({ Holder_ID: holderId, asIssued: !!x.issuedRow });
    const eng = (engineBy.get(holderId) || []).filter(linePayable);
    const snap = issuedLinesOf(x.issuedRow);
    const lines = [], sources = [];
    if (h.cancelled) {
      /* no longer in the register: nothing of theirs is booked (no cancellation charge exists in Google or the engine) — an
         issued statement stays issued and receivable, and is shown as invoiced but no longer booked */
      sources.push('cancelled — nothing booked');
    } else {
      /* the guest's own trip: confirmed now → the engine; exists but not confirmed now → as issued */
      const regLines = eng.filter((l) => !isOwnerLine(l));
      if (h.regState === 'CONFIRMED') { lines.push(...regLines.map((l) => ({ ...l, _src: 'engine' }))); if (regLines.length) sources.push('confirmed trip'); }
      else if (['LAPSED', 'UNCONFIRMED'].includes(h.regState) && x.issuedRow) { const s0 = snap.filter((l) => !isOwnerLine(l)); lines.push(...s0.map((l) => ({ ...l, _src: 'issued' }))); if (s0.length) sources.push('trip as issued (newer version not confirmed)'); }
      else if (regLines.length) lines.push(...regLines.map((l) => ({ ...l, _src: 'engine' })));   /* a booking billed here for another holder's person */
      /* the Owners' recorded bookings: the same rule */
      const ownLines = eng.filter(isOwnerLine);
      if (h.ownerState === 'CONFIRMED') { lines.push(...ownLines.map((l) => ({ ...l, _src: 'engine' }))); if (ownLines.length) sources.push('recorded by the Owners'); }
      else if (h.ownerState === 'RECORDED' && x.issuedRow) { const s1 = snap.filter(isOwnerLine); lines.push(...s1.map((l) => ({ ...l, _src: 'issued' }))); if (s1.length) sources.push('Owners\' bookings as issued (a change not confirmed)'); }
    }
    const snapMismatch = x.issuedRow && Number.isFinite(x.issuedCents) && sumCents(snap) !== x.issuedCents
      ? 'the issued statement\'s lines (' + formatUSD(sumCents(snap)) + ') do not add up to its total (' + formatUSD(x.issuedCents) + ')' : null;
    holders.push({ x, lines, sources, review: (reviewBy.get(holderId) || 0) > 0 || x.underReview, ownerProblems: h.ownerProblems, snapMismatch });
  }

  /* DOUBLE BOOKING: one person, one stay, twice — on two holders, or twice on one holder (the guest's own trip and the
     Owners' record). Never settled here: both sides are listed and every holder involved becomes a named gap. */
  const seen = new Map(), pairs = [], gapHolders = new Map();
  const STAY_AS_ROOMS = (st) => (st === 'guesthouse' ? 'wedstay' : st);   /* the Rooms engine's own reading: listed, never acted on */
  const seenRooms = new Map(), roomsReading = [];
  for (const hh of holders) for (const l of hh.lines) {
    const person = clean(l.Person_ID), stage = keyStage(siteKeyOf(items, l.Item_ID)) || clean(l.Item_ID);
    if (!person || !stage) continue;
    const k = person + '|' + stage, prev = seen.get(k);
    const side = { Holder_ID: hh.x.holderId, Booking_ID: clean(l.Booking_ID), Item_ID: clean(l.Item_ID), amount: money(l.amountCents), from: isOwnerLine(l) ? 'recorded by the Owners' : 'the guest\'s own trip' };
    if (prev && !(prev.hh === hh && isOwnerLine(prev.l) === isOwnerLine(l))) {
      pairs.push({ Person_ID: person, stage, sides: [prev.side, side] });
      for (const id of [prev.hh.x.holderId, hh.x.holderId]) gapHolders.set(id, (gapHolders.get(id) || []).concat(person + ' · ' + stage));
    } else if (!prev) seen.set(k, { hh, l, side });
    /* the Rooms engine counts the Guest House and the wedding-stay hotel as one stay — a match only under that reading is listed */
    const k2 = person + '|' + STAY_AS_ROOMS(stage), prev2 = seenRooms.get(k2);
    if (prev2 && prev2.stage !== stage) roomsReading.push({ Person_ID: person, stays: [prev2.stage, stage].sort(byText), holders: [prev2.holderId, hh.x.holderId].sort(byText) });
    else if (!prev2) seenRooms.set(k2, { stage, holderId: hh.x.holderId });
  }

  /* per holder: booked, and against the issued statement by Booking_ID */
  const rows = new Map();
  for (const hh of holders) {
    const { x } = hh, id = x.holderId;
    const kept = hh.lines;
    const bookedCents = sumCents(kept);
    const gapReason = hh.review ? MANUAL_REVIEW_REQUIRED + ' on the confirmed bookings'
      : hh.ownerProblems.length && hh.x.h.ownerState === 'CONFIRMED' ? 'the Owners\' bookings cannot be billed as recorded: ' + hh.ownerProblems.join(' · ')
      : hh.snapMismatch ? hh.snapMismatch
      : gapHolders.has(id) ? 'DOUBLE_BOOKING ' + gapHolders.get(id).join(', ') + ' — the Owners decide which booking stands' : null;
    if (gapReason) { gap(acc.booked, id, gapReason); gap(acc.notYet, id, gapReason); gap(acc.changed, id, gapReason); gap(acc.notBooked, id, gapReason); }
    else add(acc.booked, x.key, bookedCents);
    let notYet = 0, changed = 0, notBooked = 0;
    if (!gapReason) {
      const snap = issuedLinesOf(x.issuedRow);
      const snapBy = new Map(snap.map((l) => [clean(l.Booking_ID), l]));
      const keptIds = new Set(kept.map((l) => clean(l.Booking_ID)));
      for (const l of kept) {
        const s0 = snapBy.get(clean(l.Booking_ID));
        if (!s0) notYet += l.amountCents; else if (s0.amountCents !== l.amountCents) changed += l.amountCents - s0.amountCents;
      }
      for (const l of snap) if (!keptIds.has(clean(l.Booking_ID))) notBooked += l.amountCents;
      add(acc.notYet, x.key, notYet); add(acc.changed, x.key, changed); add(acc.notBooked, x.key, notBooked);
    }
    rows.set(id, { booked: money(gapReason ? null : bookedCents), bookedFrom: hh.sources, notYetInvoiced: money(gapReason ? null : notYet),
      changedSinceIssue: money(gapReason ? null : changed), invoicedNotBooked: money(gapReason ? null : notBooked), lines: kept, gapReason });
  }

  /* THE BREAKDOWN — exactly the lines behind the booked figure: accommodation (a stay window's room or house, the website's
     own key "window/room") by category and by room unit, the extra beds among them; every other product an extra service */
  const cat = new Map(), unit = new Map(), extra = new Map();
  let roomsCents = 0, extrasCents = 0, unclassifiedCents = 0; const unclassified = new Set();
  for (const [, r] of rows) {
    if (r.gapReason) continue;
    for (const l of r.lines) {
      const key = siteKeyOf(items, l.Item_ID), id = clean(l.Item_ID), person = clean(l.Person_ID), billed = clean(l.Bill_To_Holder_ID || l.Holder_ID);
      const hosted = l.hosted === true || clean(l.rateSource) === 'HOSTED';
      const bed = extraBeds.has(clean(l.Booking_ID));
      const qty = Number(l.quantity) > 0 ? Number(l.quantity) : 1;   /* places, as the line carries them — never amount ÷ persons */
      if (key.includes('/')) {
        roomsCents += l.amountCents;
        if (!cat.has(id)) cat.set(id, { Item_ID: id, key, cents: 0, lines: 0, places: 0, persons: new Set(), units: new Set(), extraBeds: 0, extraBedCents: 0, hostedLines: 0, complimentaryLines: 0 });
        const c = cat.get(id); c.cents += l.amountCents; c.lines += 1; c.places += qty; if (person) c.persons.add(person); if (l.Room_Unit_ID) c.units.add(clean(l.Room_Unit_ID));
        if (bed) { c.extraBeds += 1; c.extraBedCents += l.amountCents; } if (hosted) c.hostedLines += 1; else if (l.amountCents === 0 && clean(l.rateSource) === 'SPECIAL_RATE' && !l.collapsedInto) c.complimentaryLines += 1;
        const u = clean(l.Room_Unit_ID) || '(no unit) ' + id;
        if (!unit.has(u)) unit.set(u, { Room_Unit_ID: clean(l.Room_Unit_ID) || null, Item_ID: id, cents: 0, places: 0, persons: new Set(), payers: new Set(), extraBeds: 0, hostedLines: 0, basis: clean(items[id] && items[id].Rate_Basis) || null });
        const v = unit.get(u); v.cents += l.amountCents; v.places += qty; if (person) v.persons.add(person); if (billed) v.payers.add(billed); if (bed) v.extraBeds += 1; if (hosted) v.hostedLines += 1;
      } else if (key) {
        extrasCents += l.amountCents;
        if (!extra.has(id)) extra.set(id, { Item_ID: id, key, cents: 0, lines: 0, places: 0, persons: new Set() });
        const e = extra.get(id); e.cents += l.amountCents; e.lines += 1; e.places += qty; if (person) e.persons.add(person);
      } else { unclassifiedCents += l.amountCents; unclassified.add(id || '(no item)'); }
    }
  }
  const bookedComplete = acc.booked.cents;
  const reconciled = roomsCents + extrasCents + unclassifiedCents === bookedComplete;
  if (!reconciled) gap(acc.booked, null, 'the breakdown does not add up to the booked figure');
  const sharedUnits = [...unit.values()].filter((u) => u.Room_Unit_ID && u.payers.size > 1).map((u) => ({ Room_Unit_ID: u.Room_Unit_ID, payers: [...u.payers].sort(byText), wholeRoomCharge: /ROOM|FLAT/.test(u.basis || '') }));

  /* PAYMENTS by method — verified through the sanctioned journalPosition, reported (not yet verified) as recorded */
  const methods = new Map();
  const m = (k) => { if (!methods.has(k)) methods.set(k, { method: k, rows: [] }); return methods.get(k); };
  for (const r of journal) if (r && typeof r === 'object') m(clean(r.Method) || '(no method)').rows.push(r);
  const reported = { rows: 0, cents: 0, duplicateSuspects: 0, duplicateCents: 0, unreadable: 0 };
  const payments = [...methods.values()].map((x) => {
    const pos = journalPosition(x.rows);
    let rep = 0, repN = 0;
    for (const r of x.rows) {
      if (clean(r.Record_Status) !== RECORD_STATUS.REPORTED) continue;
      const c = toCents(r.Amount_USD);
      if (c == null) { reported.unreadable += 1; continue; }
      if (isTrue(r.Duplicate_Suspect)) { reported.duplicateSuspects += 1; reported.duplicateCents += c; continue; }
      rep += c; repN += 1; reported.rows += 1; reported.cents += c;
    }
    return { method: x.method, verified: money(pos.verifiedCents), reported: money(rep), reportedRows: repN };
  }).sort((a, b) => byText(a.method, b.method));
  const byInvoiceMethod = new Map();
  for (const x of perHolder) {
    if (!x.issuedRow || !Number.isFinite(x.issuedCents)) continue;
    const k = x.paymentPreference || '(no method)';
    if (!byInvoiceMethod.has(k)) byInvoiceMethod.set(k, { method: k, statements: 0, invoicedCents: 0, outstandingCents: 0 });
    const v = byInvoiceMethod.get(k); v.statements += 1; v.invoicedCents += x.issuedCents; if (Number.isFinite(x.outstandingCents)) v.outstandingCents += x.outstandingCents;
  }

  const list = (mp, f) => [...mp.values()].sort((a, b) => byText(a.Item_ID || a.Room_Unit_ID || '', b.Item_ID || b.Room_Unit_ID || '')).map(f);
  return {
    rows,
    extraBedIds: [...extraBeds].sort(byText),
    bookedRevenue: kpi('the confirmed bookings of every holder (the engine) — a source not confirmed now as last issued', acc.booked,
      acc.booked.cents, { source: 'engine.calculate() lines; Revision Snapshot lines where a source is not confirmed now', doubleBookings: pairs.length }),
    notYetInvoiced: kpi('booked lines no issued statement carries yet', acc.notYet, acc.notYet.cents, { source: 'by Booking_ID against the current ISSUED revision' }),
    changedSinceIssue: kpi('the difference of lines whose amount changed since the statement was issued', acc.changed, acc.changed.cents, { source: 'by Booking_ID against the current ISSUED revision' }),
    invoicedNotBooked: kpi('issued lines no longer booked (a revision is due)', acc.notBooked, acc.notBooked.cents, { source: 'by Booking_ID against the current ISSUED revision' }),
    paymentsReported: { definition: 'payments the guests reported, not yet verified — never counted as received', ...money(reported.cents), rows: reported.rows,
      duplicateSuspects: reported.duplicateSuspects, duplicateSuspectAmount: money(reported.duplicateCents), unreadable: reported.unreadable, isReceived: false },
    breakdown: {
      definition: 'the lines behind the booked figure: accommodation by room category and by room, extra services by product',
      /* the breakdown covers exactly the holders the booked figure counts: while that figure is incomplete, so is this */
      complete: acc.booked.gaps.length === 0, reconciled, roomsTotal: money(roomsCents), extrasTotal: money(extrasCents), unclassifiedTotal: money(unclassifiedCents), unclassifiedItems: [...unclassified].sort(byText),
      roomsByCategory: list(cat, (c) => ({ Item_ID: c.Item_ID, key: c.key, ...money(c.cents), lines: c.lines, places: c.places, persons: c.persons.size, rooms: c.units.size, extraBeds: c.extraBeds, extraBedAmount: money(c.extraBedCents), hostedLines: c.hostedLines, complimentaryLines: c.complimentaryLines })),
      roomsByUnit: list(unit, (u) => ({ Room_Unit_ID: u.Room_Unit_ID, Item_ID: u.Item_ID, ...money(u.cents), places: u.places, persons: u.persons.size, payers: u.payers.size, extraBeds: u.extraBeds, hostedLines: u.hostedLines })),
      extras: list(extra, (e) => ({ Item_ID: e.Item_ID, key: e.key, ...money(e.cents), lines: e.lines, places: e.places, persons: e.persons.size })),
      sharedUnits,
    },
    payments: { byMethod: payments, invoicesByMethod: [...byInvoiceMethod.values()].sort((a, b) => byText(a.method, b.method)).map((v) => ({ method: v.method, statements: v.statements, invoiced: money(v.invoicedCents), outstanding: money(v.outstandingCents) })) },
    doubleBookings: pairs, stayReadingDiffers: roomsReading, cancelledHolders, lapsedConfirmations: lapsed.sort(byText),
    ownerRecordsWaiting: ownerWaiting.sort((a, b) => byText(a.Holder_ID, b.Holder_ID)),
    /* the holders the confirmed figure cannot stand for either (a double booking, the Owners' bookings with a problem) */
    /* (a statement whose lines miss its total stops only the booked figure — the confirmed figure never reads the statement) */
    confirmedGaps: [...rows].filter(([id, r]) => r.gapReason && !/^MANUAL_REVIEW/.test(r.gapReason) && !(holders.find((hh) => hh.x.holderId === id) || {}).snapMismatch)
      .map(([id, r]) => ({ Holder_ID: id, reason: r.gapReason })),
    lapsedNotCounted: lapsedNotCounted.sort(byText),
  };
}

/* ================================================================ overview */

export function buildRevenueOverview(input) {
  const src = input && typeof input === 'object' ? input : {};
  const items = src.items && typeof src.items === 'object' ? src.items : {};
  const specialRates = asArray(src.specialRates);
  const journal = asArray(src.journalRows);
  const revisions = asArray(src.issuedRevisions);
  const asOf = day(src.asOf);
  const holders = normaliseHolders(src.holders);

  /* --- the one calculation path, over every booking at once -------------- */
  const bookings = [];
  for (const h of holders) for (const b of h.bookings) bookings.push(b);
  const result = calculate(bookings, { items, specialRates, asOf });
  const groups = groupByBilledHolder(result);

  const acc = {
    confirmed: openAcc(), issued: openAcc(), cash: openAcc(), outstanding: openAcc(),
    overdue: openAcc(), refund: openAcc(), hosted: openAcc(), drift: openAcc(),
  };

  const rows = [];
  const manualReview = [];
  const holderSeen = new Set();
  const knownSettlements = new Set();
  const integrity = {
    duplicateHolderIds: [], duplicateSettlementIds: [], holdersWithoutSettlementId: [],
    multipleIssuedRevisions: [], revisionStateMissing: [], issuedByOlderEngine: [],
    unattributed: { billedHolders: [], lines: 0, payableCents: 0, linesUnderReview: 0 },
    journal: null,
  };
  let hostedGapLines = 0;
  let issuedCount = 0;
  const perHolder = [];
  let selfServiceLines = 0;
  const selfServiceItems = [];

  for (const h of holders) {
    const holderId = h.Holder_ID;
    const settlementId = h.Settlement_ID;
    const key = holderId || UNATTRIBUTED;
    const reasons = [];
    const notes = [];

    const group = (holderId && groups.get(holderId)) || emptyGroup();
    if (holderId) groups.delete(holderId);      /* what stays behind is unattributed */

    if (!holderId) notes.push('HOLDER_ID_MISSING');
    else if (holderSeen.has(holderId)) {
      notes.push('DUPLICATE_HOLDER_ID');
      if (integrity.duplicateHolderIds.indexOf(holderId) < 0) integrity.duplicateHolderIds.push(holderId);
    }
    if (holderId) holderSeen.add(holderId);

    /* Freeze · I — exactly ONE Settlement per Holder. A second holder naming
     * the same Settlement_ID would count the same revision and the same
     * journal rows twice, so only the first claim feeds the portfolio. */
    let firstClaim = false;
    /* NOT ISSUED YET (closeout, 7 Oct 2026): a confirmed trip before its first statement has no Settlement_ID, and nothing can
     * be paid against it — its issued, cash, outstanding, overdue and refund figures are a fact, zero. Only a journal row that
     * names this holder without a settlement is a real gap. */
    const notIssued = !settlementId && h.noSettlementRecord;
    const orphanRows = settlementId ? 0 : journal.filter((r) => r && clean(r.Holder_ID) === holderId && !clean(r.Settlement_ID)).length;
    if (!settlementId && (orphanRows || !notIssued)) {
      notes.push('SETTLEMENT_ID_MISSING');
      integrity.holdersWithoutSettlementId.push(holderId);
    } else if (!settlementId) {
      notes.push('NOT_ISSUED');
    } else if (knownSettlements.has(settlementId)) {
      notes.push('DUPLICATE_SETTLEMENT_ID');
      if (integrity.duplicateSettlementIds.indexOf(settlementId) < 0) {
        integrity.duplicateSettlementIds.push(settlementId);
      }
    } else {
      knownSettlements.add(settlementId);
      firstClaim = true;
    }

    /* --- confirmed: the engine's figure, or nothing ---------------------- */
    const underReview = group.review.length > 0;
    const confirmedCents = underReview ? null : group.payableCents;
    if (underReview) {
      gap(acc.confirmed, holderId, MANUAL_REVIEW_REQUIRED + ' on ' + group.review.length + ' line(s)');
      for (const r of group.review) reasons.push(r);
    } else {
      add(acc.confirmed, key, confirmedCents);
    }

    /* --- hosted value: informational, never revenue (Freeze · U) --------- */
    add(acc.hosted, key, group.hostedValueCents);
    hostedGapLines += group.hostedGaps;

    /* --- self-pay and self-book: Block B, counted and never valued ------- */
    selfServiceLines += group.selfServiceLines;
    for (const id of group.selfServiceItems) {
      if (selfServiceItems.indexOf(id) < 0) selfServiceItems.push(id);
    }

    /* --- the issued revision and the payment position ------------------- */
    const picked = currentIssuedRevision(revisions, settlementId);
    const issued = issuedAmountOf(picked.row);
    const dates = issuedDatesOf(picked.row);
    perHolder.push({ h, holderId, key, firstClaim, issuedRow: firstClaim ? picked.row : null, issuedCents: firstClaim ? issued.cents : null,
      underReview: group.review.length > 0, paymentPreference: picked.row ? clean((picked.row.snapshot || picked.row).Payment_Preference) || null : null });
    if (picked.row) issuedCount += 1;
    if (picked.matches > 1 && settlementId) integrity.multipleIssuedRevisions.push(settlementId);
    if (picked.stateMissing && settlementId) integrity.revisionStateMissing.push(settlementId);
    if (dates.engineVersion && dates.engineVersion !== result.engineVersion) {
      integrity.issuedByOlderEngine.push({ Settlement_ID: settlementId, Engine_Version: dates.engineVersion });
    }

    /* a holder without a Settlement_ID has no payment position at all */
    let position = null;
    if (settlementId) {
      position = paymentStatus({
        sollCents: issued.cents, journalRows: journal,
        settlementId, today: asOf, dueDate: dates.dueDate,
      });
    }

    let outstandingCents = null, overdueCents = null, refundCents = null;

    if (notIssued && !orphanRows) {
      /* nothing issued, nothing paid: zero is the figure, not a gap */
      outstandingCents = 0; overdueCents = 0; refundCents = 0;
      add(acc.issued, key, 0); add(acc.cash, key, 0);
      add(acc.outstanding, key, 0); add(acc.overdue, key, 0); add(acc.refund, key, 0);
    } else if (!settlementId) {
      const why = 'no Settlement_ID, so neither a revision nor a journal row can be attributed';
      gap(acc.issued, holderId, why);
      gap(acc.cash, holderId, why);
      gap(acc.outstanding, holderId, why);
      gap(acc.overdue, holderId, why);
      gap(acc.refund, holderId, why);
      reasons.push(why);
    } else if (!firstClaim) {
      reasons.push('counted once, under the first Holder holding ' + settlementId);
    } else {
      add(acc.cash, key, position.istCents);

      if (!picked.row) {
        /* nothing issued yet: nothing is receivable, which is a fact */
        add(acc.issued, key, 0);
        if (position.istCents === 0) {
          outstandingCents = 0; overdueCents = 0; refundCents = 0;
          add(acc.outstanding, key, 0); add(acc.overdue, key, 0); add(acc.refund, key, 0);
        } else {
          const why = 'verified payments stand against no ISSUED revision';
          gap(acc.outstanding, holderId, why);
          gap(acc.overdue, holderId, why);
          gap(acc.refund, holderId, why);
          reasons.push(why);
        }
      } else if (issued.cents == null) {
        gap(acc.issued, holderId, issued.reason);
        gap(acc.outstanding, holderId, issued.reason);
        gap(acc.overdue, holderId, issued.reason);
        gap(acc.refund, holderId, issued.reason);
        reasons.push(issued.reason);
      } else {
        add(acc.issued, key, issued.cents);

        /* settlement.paymentStatus has already judged this position under the
         * Freeze · N tolerance. The overview only reads its verdict and turns
         * the sign of the balance it produced; it never re-judges a balance,
         * so a difference inside the USD 5 tolerance stays PAID and is
         * neither outstanding nor a refund. */
        const st = position.status;
        if (st === PAYMENT_STATUS.UNPAID || st === PAYMENT_STATUS.PARTIAL) {
          outstandingCents = position.balanceCents;
          add(acc.outstanding, key, outstandingCents);
          refundCents = 0;
          add(acc.refund, key, 0);
          if (position.flags.indexOf('OVERDUE') >= 0) {
            overdueCents = outstandingCents;
            add(acc.overdue, key, overdueCents);
          } else if (!dates.dueDate) {
            const why = 'the ISSUED revision carries no Due_Date, so OVERDUE cannot be decided';
            gap(acc.overdue, holderId, why);
            reasons.push(why);
          } else {
            overdueCents = 0;
            add(acc.overdue, key, 0);
          }
        } else if (st === PAYMENT_STATUS.OVERPAID) {
          refundCents = -position.balanceCents;
          add(acc.refund, key, refundCents);
          outstandingCents = 0; overdueCents = 0;
          add(acc.outstanding, key, 0); add(acc.overdue, key, 0);
        } else {
          outstandingCents = 0; overdueCents = 0; refundCents = 0;
          add(acc.outstanding, key, 0); add(acc.overdue, key, 0); add(acc.refund, key, 0);
        }
      }
    }

    /* --- drift exposure: the payable that an unresolved blocker puts in
     *     question. The engine's confirmed figure is the payable (Freeze · V);
     *     the issued figure travels in the row beside it. */
    const blocking = blockingDriftsOf(h.drifts);
    if (blocking.length) {
      if (confirmedCents == null) {
        gap(acc.drift, holderId, 'blocking drift and ' + MANUAL_REVIEW_REQUIRED);
      } else {
        add(acc.drift, key, confirmedCents);
      }
    }

    if (reasons.length || notes.length) {
      manualReview.push({ Holder_ID: holderId, Settlement_ID: settlementId, notes, reasons });
    }
    perHolder[perHolder.length - 1].outstandingCents = outstandingCents;

    rows.push({
      Holder_ID: holderId,
      Settlement_ID: settlementId,
      label: h.label,
      Phase: h.Phase,
      confirmed: money(confirmedCents),
      issued: money(firstClaim ? issued.cents : null),
      cashCollected: money(position ? position.istCents : (notIssued && !orphanRows ? 0 : null)),
      outstanding: money(outstandingCents),
      overdue: money(overdueCents),
      refundDue: money(refundCents),
      hostedValue: money(group.hostedValueCents),
      paymentStatus: position ? position.status : null,
      paymentFlags: position ? position.flags : [],
      pendingVerification: position ? position.pendingCount : 0,
      rejectedEntries: position ? position.rejectedCount : 0,
      revision: picked.row ? (Number(picked.row.Revision) || null) : null,
      issueDate: dates.issueDate,
      dueDate: dates.dueDate,
      issuedEngineVersion: dates.engineVersion,
      blockingDrift: blocking,
      selfService: { lines: group.selfServiceLines, itemIds: group.selfServiceItems },
      lines: {
        payable: group.payableLines, hosted: group.hostedLines,
        selfService: group.selfServiceLines, underReview: group.review.length,
      },
      review: group.review.length ? MANUAL_REVIEW_REQUIRED : null,
      notes,
      reasons,
    });
  }

  /* --- billed accounts that no Holder row covers ------------------------- */
  for (const [billed, g] of groups) {
    integrity.unattributed.billedHolders.push(billed);
    integrity.unattributed.lines += g.payableLines + g.hostedLines + g.selfServiceLines;
    integrity.unattributed.payableCents += g.payableCents;
    integrity.unattributed.linesUnderReview += g.review.length;
    hostedGapLines += g.hostedGaps;
    if (g.review.length) {
      gap(acc.confirmed, null, MANUAL_REVIEW_REQUIRED + ' on ' + g.review.length +
        ' line(s) billed to ' + billed + ', which no Holder row covers');
    }
  }

  /* The engine refuses a total while any line is under review; make sure the
   * KPI says why even when no single Holder owns the refusal. */
  if (result.manualReview.length && !acc.confirmed.gaps.length) {
    gap(acc.confirmed, null, MANUAL_REVIEW_REQUIRED + ' x ' + result.manualReview.length);
  }
  if (hostedGapLines) {
    gap(acc.hosted, null, hostedGapLines + ' hosted line(s) carry no Standard_Rate, so the hosted value is understated');
  }
  if (!asOf) {
    gap(acc.overdue, null, 'no asOf date was supplied, so no Due_Date can be compared');
  }

  /* --- cash: the whole journal, through the sanctioned function ---------- */
  integrity.journal = checkJournal(journal, knownSettlements);
  const wholeJournal = journalPosition(journal);
  if (integrity.journal.verifiedUnparseable) {
    gap(acc.cash, null, integrity.journal.verifiedUnparseable +
      ' VERIFIED journal row(s) carry an unreadable Amount_USD and were skipped');
  }
  if (integrity.journal.unmatchedRows || integrity.journal.missingSettlementId) {
    gap(acc.cash, null, (integrity.journal.unmatchedRows + integrity.journal.missingSettlementId) +
      ' journal row(s) belong to no known Settlement_ID');
  }

  /* --- booked revenue, its breakdown and the payments by method (2.3.0) — before the KPIs, so the confirmed figure carries
         the same gaps (a double booking or the Owners' bookings with a problem is never confirmed revenue either) --- */
  const bp = bookedPicture({ perHolder, result, items, journal });
  /* a holder the confirmed figure cannot stand for (a double booking, the Owners' bookings with a problem) leaves it entirely:
     out of the attributed sum and the partial, its row without an amount — exactly as a manual-review gap (pricing review) */
  for (const g of bp.confirmedGaps) {
    const r = rows.find((x) => x.Holder_ID === g.Holder_ID);
    if (r && Number.isFinite(r.confirmed.cents)) {
      acc.confirmed.cents -= r.confirmed.cents;
      acc.confirmed.counted -= 1;
      acc.confirmed.contributors = acc.confirmed.contributors.filter((c) => c !== g.Holder_ID);
      r.confirmed = money(null);
    }
    if (r) r.confirmedGap = g.reason;
    gap(acc.confirmed, g.Holder_ID, g.reason);
  }

  /* --- quota, exactly as engine.quotaUsage returned it ------------------- */
  const quotaUtilisation = Object.values(result.quota).map((q) => ({
    Item_ID: q.Item_ID,
    Quota_Unit: q.Quota_Unit,
    Quota: q.Quota,
    used: q.used,
    remaining: q.remaining,
    overQuota: q.overQuota,
    utilisation: q.Quota ? Math.round((q.used / q.Quota) * 1000) / 10 : null,
    roomUnits: q.roomUnits.length,
    persons: q.persons.length,
  })).sort((a, b) => byText(clean(a.Item_ID), clean(b.Item_ID)));

  const kpis = {
    confirmedRevenue: kpi('Confirmed Bookings run through the current engine',
      acc.confirmed, bp.confirmedGaps.length ? null : result.totalPayableCents, {
        source: 'engine.calculate().totalPayableCents',
        attributed: money(acc.confirmed.cents),
        bookings: bookings.length,
        linesUnderReview: result.manualReview.length,
      }),
    issuedRevenue: kpi('the totals of the current valid ISSUED revisions',
      acc.issued, acc.issued.cents, {
        source: 'the Total_Payable_Cents frozen in each Revision Snapshot',
        issuedRevisions: issuedCount,
      }),
    cashCollected: kpi('VERIFIED payments net VERIFIED refunds',
      acc.cash, wholeJournal.verifiedCents, {
        source: 'settlement.journalPosition over 008_Payment_Journal',
        attributed: money(acc.cash.cents),
        reconciled: wholeJournal.verifiedCents === acc.cash.cents,
        pendingVerification: wholeJournal.pendingCount,
        rejectedEntries: wholeJournal.rejectedCount,
      }),
    outstanding: kpi('issued amount minus verified net payments',
      acc.outstanding, acc.outstanding.cents, {
        source: 'settlement.paymentStatus balance of UNPAID and PARTIAL positions',
      }),
    overdue: kpi('outstanding whose Due_Date has passed relative to asOf',
      acc.overdue, acc.overdue.cents, {
        source: 'settlement.paymentStatus OVERDUE flag',
        asOf,
      }),
    refundDue: kpi('overpaid positions',
      acc.refund, acc.refund.cents, {
        source: 'settlement.paymentStatus OVERPAID positions',
      }),
    hostedValue: kpi('hosted value, informational only and never revenue',
      acc.hosted, result.hostedValueCents, {
        source: 'engine.calculate().hostedValueCents',
        informational: true,
        isRevenue: false,
        note: 'what Haruthai & Suthep host. It is never added to any revenue figure.',
      }),
    driftExposure: kpi('the summed payable of holders carrying unresolved blocking drift',
      acc.drift, acc.drift.cents, {
        source: 'engine payable of the holders whose Drift is unresolved and issue-blocking',
        holders: acc.drift.contributors.length,
      }),
  };

  kpis.bookedRevenue = bp.bookedRevenue; kpis.notYetInvoiced = bp.notYetInvoiced; kpis.changedSinceIssue = bp.changedSinceIssue; kpis.invoicedNotBooked = bp.invoicedNotBooked;
  for (const r of rows) {
    const b = bp.rows.get(r.Holder_ID);
    if (b) { r.booked = b.booked; r.bookedFrom = b.bookedFrom; r.notYetInvoiced = b.notYetInvoiced; r.changedSinceIssue = b.changedSinceIssue; r.invoicedNotBooked = b.invoicedNotBooked; r.bookedGap = b.gapReason || null; }
  }

  const incomplete = Object.keys(kpis).filter((k) => !kpis[k].complete);
  /* one failure of the class split names itself — every figure above stands */
  const classesOf = () => {
    try {
      return revenueClassesOf({
        booked: [...bp.rows].map(([id, r]) => ({ Holder_ID: id, lines: r.lines, gapReason: r.gapReason || null })),
        issued: new Map(perHolder.filter((x) => x.issuedRow && Number.isFinite(x.issuedCents)).map((x) => [x.holderId, { lines: issuedLinesOf(x.issuedRow), cents: x.issuedCents }])),
        positions: rows, items,
        kpis: { booked: kpis.bookedRevenue, issued: kpis.issuedRevenue, cash: kpis.cashCollected, outstanding: kpis.outstanding, refund: kpis.refundDue },
      });
    } catch (e) { return { version: null, complete: false, error: 'the split of the guest billing by class could not be made just now' }; }
  };

  const overview = {
    revenueVersion: REVENUE_VERSION,
    engineVersion: result.engineVersion,
    audience: REVENUE_AUDIENCE,
    asOf,
    currency: ACCOUNTING_CURRENCY,

    confirmedRevenue: kpis.confirmedRevenue,
    issuedRevenue: kpis.issuedRevenue,
    cashCollected: kpis.cashCollected,
    outstanding: kpis.outstanding,
    overdue: kpis.overdue,
    refundDue: kpis.refundDue,
    hostedValue: kpis.hostedValue,
    driftExposure: kpis.driftExposure,
    bookedRevenue: kpis.bookedRevenue,
    notYetInvoiced: kpis.notYetInvoiced,
    changedSinceIssue: kpis.changedSinceIssue,
    invoicedNotBooked: kpis.invoicedNotBooked,
    paymentsReported: bp.paymentsReported,
    /* GUEST BILLING BY CLASS (2.5.0 · the Owners' consolidated order, 19 Nov 2026): the same lines, each in one class — the
       Souphattra's accommodation revenue, other accommodation, pass-through services; China flagged apart (revenue-classes.js) */
    classes: classesOf(),
    breakdown: bp.breakdown,
    payments: bp.payments,
    doubleBookings: bp.doubleBookings,
    stayReadingDiffers: bp.stayReadingDiffers,
    cancelledHolders: bp.cancelledHolders,
    lapsedConfirmations: bp.lapsedConfirmations,
    ownerRecordsWaiting: bp.ownerRecordsWaiting,
    lapsedNotCounted: bp.lapsedNotCounted,
    quotaUtilisation,

    /* Freeze · E, S — excluded from H&S revenue by category, taken from the
     * engine's Block B, and carrying no amount because the guest settles
     * these directly with the provider. */
    selfService: {
      definition: 'self-pay and self-book items, excluded from H&S revenue',
      lines: selfServiceLines,
      itemIds: selfServiceItems.slice().sort(byText),
      holders: rows.filter((r) => r.selfService.lines > 0).length,
      excludedFromRevenue: true,
      amount: null,
      note: 'the guest settles these with the provider, so no H&S amount exists to report',
    },

    holders: rows,
    counts: {
      holders: rows.length,
      settlements: knownSettlements.size,
      issuedRevisions: issuedCount,
      holdersWithBlockingDrift: rows.filter((r) => r.blockingDrift.length > 0).length,
      holdersUnderReview: rows.filter((r) => r.review).length,
      bookings: bookings.length,
      journalRows: journal.length,
    },
    integrity,
    manualReview,
    incompleteKpis: incomplete,
    review: incomplete.length ? MANUAL_REVIEW_REQUIRED : null,
  };
  /* THE BOOKED LINES, for the budget comparison (billing-budget/1.0.0 · 15 Nov 2026): exactly the lines behind the booked
     figure, per holder, with its gap — NOT enumerable, so the overview's JSON is byte-identical with or without it, and
     no arithmetic of the comparison ever lives in this module (src/billing/budget.js holds it) */
  Object.defineProperty(overview, 'bookedLines', {
    enumerable: false,
    value: Object.freeze({
      holders: [...bp.rows].map(([id, r]) => ({ Holder_ID: id, lines: r.lines, gapReason: r.gapReason || null, bookedFrom: r.bookedFrom,
        Settlement_ID: (rows.find((x) => x.Holder_ID === id) || {}).Settlement_ID || null })),
      extraBedIds: bp.extraBedIds,
    }),
  });
  return overview;
}
