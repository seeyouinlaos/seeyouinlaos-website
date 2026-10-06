/* ============================================================================
   H&S WEDDING 2027 — THE REVENUE & BILLING RECONCILIATION AGENT
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · W, X).

   WHAT THIS AGENT IS FOR. An issued Revision is immutable (Freeze · I), but
   the structured Google source behind it keeps moving: a rate is corrected in
   002, a named special rate is approved or retired in 009, a guest amends a
   booking, an evidence row in 010 is marked. The moment any of that happens,
   the paper a guest is holding and the live source no longer agree. Someone
   has to notice. That noticing is Drift, and Drift is all this module does.

   IT COMPARES, IT NEVER DECIDES. Every number that leaves this file is QUOTED
   from one of exactly two places: the output of src/billing/engine.js, or a
   stored Settlement Snapshot. There is no third figure. The module holds no
   rate, no quota and no tolerance of its own, derives no amount, and when two
   sources disagree it reports BOTH as found and corrects neither. A missing
   value is never filled in: it is reported, and the engine's own
   MANUAL_REVIEW_REQUIRED is carried through untouched.

   WHAT IT MAY DO (Freeze · W):
     detect Drift · raise alerts · propose a Revision DRAFT · set
     CHANGE_DETECTED · set READY_FOR_REVIEW · prepare a reconciliation report.

   WHAT IT MAY NEVER DO (Freeze · W, Y, AC) — and how that is enforced here,
   not merely promised:
     · invent a rate. No literal amount exists in this file. Every figure is
       read from the snapshot or from the engine result handed in.
     · verify a payment. Nothing here writes Record_Status. The payment
       position is accepted as an argument and only ever read.
     · Issue & Publish. No export returns an ISSUED state and no export calls
       nextRevisionState with ISSUE. The only transition proposed is
       DRAFT -> READY_FOR_REVIEW, the state in which a human looks at it.
       canIssue() in src/billing/settlement.js remains the only gate, and it
       stays shut until the Mandatory Activation Gate is approved (Freeze · AB).
     · send financial communication. There is no template, no message, no
       recipient and no transport in this file. The report is BILLING_ADMIN
       reading material, never guest-facing copy.
     · alter the Google financial source. The module is pure: no fetch, no
       binding, no storage, no credential, no clock. 008_Payment_Journal stays
       canonical and append-only, and nothing here appends to it.
     · silently edit an issued Revision. A proposal always names a NEW
       revision number and records which revision it would supersede. It can
       never address the issued one.

   A Drift object this module creates is frozen. Resolution is a recorded human
   act, so nothing downstream can clear a finding by assigning resolved = true;
   it has to record a resolution of its own.

   MONITORING IS NOT DRIFT (Freeze · X). OVERDUE, VERIFICATION_AGING and
   OVERPAID_NO_REFUND describe how an operation is going, not a disagreement
   between sources. They never gate Issue & Publish, so they are kept in their
   own array and are never mixed into the Drift list.
   ========================================================================== */

import {
  DRIFT_BLOCKING, DRIFT_REPORT_ONLY, MONITORING,
  BOOKING_STATE, RATE_STATUS, EVIDENCE_STATUS, PAYMENT_STATUS,
  RECORD_STATUS, ENTRY_TYPE, CHANNEL_CURRENCY,
  SETTLEMENT_STATE, REVISION_STATE,
  MANUAL_REVIEW_REQUIRED, ACCOUNTING_CURRENCY,
  toCents, formatUSD, itemIsActiveOn,
} from './model.js';
import { ENGINE_VERSION, quotaUsage } from './engine.js';
import {
  parseDay, refundDueDateFor, settlementStateAfterDrift, nextRevisionState,
} from './settlement.js';

/** The agent's own authority, as data, so a caller can read it as well as the header. */
export const AGENT_CAPABILITIES = Object.freeze({
  agent: 'H&S Revenue & Billing Reconciliation Agent',
  freeze: 'GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL · W, X',
  may: Object.freeze([
    'detect Drift', 'create alerts', 'create Revision Drafts',
    'set CHANGE_DETECTED', 'set READY_FOR_REVIEW', 'prepare reconciliation reports',
  ]),
  mayNever: Object.freeze([
    'invent rates', 'verify payments', 'Issue & Publish',
    'send financial communication', 'alter the Google financial source',
    'silently edit an issued revision',
  ]),
  writes: 'none',
  calculationPath: 'src/billing/engine.js only',
});

const clean = (v) => String(v == null ? '' : v).trim();
const day10 = (v) => clean(v).slice(0, 10);
const DAY = 86400000;
const isLive = (s) => s === BOOKING_STATE.CONFIRMED || s === BOOKING_STATE.FULFILLED;

/* ------------------------------------------------------------ drift codes */

/* The codes are the Freeze's, not this module's. They are listed once and
 * checked against model.js at load, so this file and the Freeze vocabulary can
 * never quietly drift apart: a typo or a renamed code fails the Worker at
 * start-up rather than producing a finding nobody recognises. */
const CODE = Object.freeze({
  RATE_DRIFT: 'RATE_DRIFT',
  SPECIAL_RATE_MISMATCH: 'SPECIAL_RATE_MISMATCH',
  SETTLEMENT_MISMATCH: 'SETTLEMENT_MISMATCH',
  INVOICE_DRIFT: 'INVOICE_DRIFT',
  QUOTA_DRIFT: 'QUOTA_DRIFT',
  CATEGORY_DRIFT: 'CATEGORY_DRIFT',
  BOOKING_DRIFT: 'BOOKING_DRIFT',
  EVIDENCE_MISMATCH: 'EVIDENCE_MISMATCH',
  CART_DRIFT: 'CART_DRIFT',
  EVIDENCE_MISSING: 'EVIDENCE_MISSING',
  PAYMENT_MISMATCH: 'PAYMENT_MISMATCH',
  PAYMENT_UNMATCHED: 'PAYMENT_UNMATCHED',
  PAYMENT_CURRENCY_MISMATCH: 'PAYMENT_CURRENCY_MISMATCH',
});

const SIGNAL = Object.freeze({
  OVERDUE: 'OVERDUE',
  VERIFICATION_AGING: 'VERIFICATION_AGING',
  OVERPAID_NO_REFUND: 'OVERPAID_NO_REFUND',
});

for (const code of Object.values(CODE)) {
  if (!DRIFT_BLOCKING.includes(code) && !DRIFT_REPORT_ONLY.includes(code)) {
    throw new Error('reconciliation uses a drift code the Freeze does not define: ' + code);
  }
}
for (const signal of Object.values(SIGNAL)) {
  if (!MONITORING.includes(signal)) {
    throw new Error('reconciliation uses a monitoring signal the Freeze does not define: ' + signal);
  }
}

export const SEVERITY = Object.freeze({ BLOCKING: 'BLOCKING', REPORT_ONLY: 'REPORT_ONLY', MONITORING: 'MONITORING' });

/** Severity is read from the Freeze lists, never chosen here (Freeze · X). */
function severityOf(code) {
  if (DRIFT_BLOCKING.includes(code)) return SEVERITY.BLOCKING;
  if (DRIFT_REPORT_ONLY.includes(code)) return SEVERITY.REPORT_ONLY;
  throw new TypeError('unknown drift code ' + code);
}

/**
 * The one place a finding is made. `ref` is what the finding is about (an
 * Item_ID, a Booking_ID, a journal row reference) and is also the deduplication
 * key, so the same disagreement found twice is reported once.
 */
function collector(defaultHolderId) {
  const out = [];
  const seen = new Set();
  return {
    drifts: out,
    add(code, detail, ref, holderId) {
      const key = code + '|' + clean(ref);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(Object.freeze({
        code,
        severity: severityOf(code),
        holderId: clean(holderId) || clean(defaultHolderId) || null,
        detail: clean(detail),
        ref: clean(ref) || null,
        resolved: false,
      }));
    },
  };
}

/* ------------------------------------------------------------ the sources */

/* Both sides of every comparison are quoted as they were found, which is why
 * a figure is rendered through formatUSD and never recomputed: the reader sees
 * the snapshot's number and the live number, and decides. */
const quote = (cents) => (cents == null ? '(none)' : formatUSD(cents));

function rowRef(row, index) {
  return clean(row && (row.Journal_ID || row.Entry_ID || row.Payment_ID || row.Row_ID))
    || ('row#' + index + (clean(row && row.Reported_At) ? '@' + clean(row.Reported_At) : ''));
}
function evidenceRef(row, index) {
  return clean(row && (row.Evidence_ID || row.Row_ID || row.Booking_ID || row.Item_ID))
    || ('evidence#' + index);
}
function specialRateKey(row) {
  return [clean(row && row.Holder_ID), clean(row && row.Person_ID), clean(row && row.Item_ID)].join('|');
}

/* Freeze · L, M — the channel decides the currency a guest actually paid in:
   CHANNEL_CURRENCY, the one map in model.js */

/* ---------------------------------------------------------- drift detection */

/**
 * Compare one Holder's issued baseline against the live source.
 *
 * Returns a plain array of frozen findings
 *   { code, severity: 'BLOCKING' | 'REPORT_ONLY', holderId, detail, resolved: false }
 * ready for canIssue() in src/billing/settlement.js. The array also carries a
 * non-enumerable `monitoring` property holding the Freeze · X monitoring
 * signals, which are NOT Drift and are kept apart on purpose; monitoringSignals()
 * below returns the same thing on its own.
 *
 * `snapshot` is the issued baseline and `result` is the engine's output for the
 * SAME Holder recomputed from today's source. With no snapshot there is no
 * baseline, so nothing can have drifted from it: only the live-source findings
 * (quota, cart, evidence, journal) are reported, and whether the open
 * settlement is right at all remains the engine's business, not this module's.
 */
export function detectDrift({
  snapshot, result, items, specialRates, bookings, evidenceRows, journalRows,
  cartLines, asOf, holderId, settlementId: settlementIdIn, payment, agingDays,
} = {}) {
  const liveItems = (items && typeof items === 'object') ? items : {};
  const liveRates = Array.isArray(specialRates) ? specialRates : [];
  const liveBookings = Array.isArray(bookings) ? bookings : [];
  const evidence = Array.isArray(evidenceRows) ? evidenceRows : [];
  const journal = Array.isArray(journalRows) ? journalRows : [];
  const cart = Array.isArray(cartLines) ? cartLines : [];
  const on = day10(asOf);

  const holder = clean(holderId)
    || clean(snapshot && snapshot.Holder_ID)
    || clean(liveBookings.length && liveBookings[0].Holder_ID)
    || null;
  const settlementId = clean(snapshot && snapshot.Settlement_ID) || clean(settlementIdIn) || null;

  const c = collector(holder);

  if (snapshot) {
    checkItemMetadata(c, snapshot, liveItems, on);
    checkSpecialRates(c, snapshot, liveRates, on);
    checkTotals(c, snapshot, result);
    checkSnapshotInternals(c, snapshot);
    checkBookings(c, snapshot, liveBookings, holder);
  }
  checkQuota(c, result, liveBookings, liveItems);
  checkEvidence(c, snapshot, evidence, holder, settlementId);
  checkCart(c, cart, liveBookings);
  checkJournal(c, journal, holder, settlementId);

  const drifts = c.drifts;
  /* Not enumerable: JSON.stringify(drifts) stays a clean array of Drift, so a
   * monitoring signal can never reach a gate or a report as if it were one. */
  Object.defineProperty(drifts, 'monitoring', {
    value: monitoringSignals({
      snapshot, payment, journalRows: journal, asOf: on, holderId: holder, agingDays,
    }),
    enumerable: false, writable: false, configurable: false,
  });
  return drifts;
}

/**
 * RATE_DRIFT and CATEGORY_DRIFT. The snapshot carries Standard_Rate_Reference,
 * which is what 002 said at Issue; this compares it with what 002 says now.
 * Rate_Basis belongs to the rate: the same number on a different basis is a
 * different price, so a changed basis is rate drift too.
 */
function checkItemMetadata(c, snapshot, liveItems, on) {
  const ref = (snapshot.Standard_Rate_Reference && typeof snapshot.Standard_Rate_Reference === 'object')
    ? snapshot.Standard_Rate_Reference : {};
  /* ONLY THE ITEMS THIS STATEMENT USED (Codex final review, 5 Oct 2026). The
     reference records the whole 002 source for audit, but an item no line of
     this revision priced cannot have moved this revision's figures; a change
     there is drift for whoever booked it, through checkBookings. A snapshot
     without its Item_IDs is compared item by item, as before. */
  const used = Array.isArray(snapshot.Item_IDs) ? new Set(snapshot.Item_IDs.map(clean)) : null;

  for (const [itemId, was] of Object.entries(ref)) {
    if (used && !used.has(clean(itemId))) continue;
    const now = liveItems[itemId];
    if (!now) {
      c.add(CODE.RATE_DRIFT, 'item ' + itemId + ' is no longer in the structured source, so the issued rate cannot be confirmed', itemId);
      continue;
    }
    const wasCents = toCents(was && was.Standard_Rate);
    const nowCents = toCents(now.Standard_Rate);
    if (wasCents !== nowCents) {
      c.add(CODE.RATE_DRIFT, 'item ' + itemId + ' Standard_Rate was ' + quote(wasCents) + ' at issue and is ' + quote(nowCents) + ' now', itemId);
    }
    const wasBasis = clean(was && was.Rate_Basis), nowBasis = clean(now.Rate_Basis);
    if (wasBasis !== nowBasis) {
      c.add(CODE.RATE_DRIFT, 'item ' + itemId + ' Rate_Basis moved from ' + (wasBasis || '(none)') + ' to ' + (nowBasis || '(none)'), itemId + '·basis');
    }
    /* a status is drift when it CHANGED since issue: an item issued as DRAFT
       through an approved named rate (the Presidential suite) and still DRAFT
       has not moved; an ACTIVE item that left ACTIVE, or any other move, has */
    const wasStatus = clean(was && was.Rate_Status), nowStatus = clean(now.Rate_Status);
    const recorded = !!was && Object.prototype.hasOwnProperty.call(was, 'Rate_Status');
    if (recorded ? wasStatus !== nowStatus : nowStatus !== RATE_STATUS.ACTIVE) {
      c.add(CODE.RATE_DRIFT, 'item ' + itemId + ' Rate_Status moved from ' + (wasStatus || '(none)') + ' to ' + (nowStatus || '(none)'), itemId + '·status');
    } else if (nowStatus === RATE_STATUS.ACTIVE && on && !itemIsActiveOn(now, on)) {
      c.add(CODE.RATE_DRIFT, 'item ' + itemId + ' is outside its effective window on ' + on, itemId + '·window');
    }
    const wasCat = clean(was && was.Billing_Category), nowCat = clean(now.Billing_Category);
    if (wasCat !== nowCat) {
      c.add(CODE.CATEGORY_DRIFT, 'item ' + itemId + ' Billing_Category moved from ' + (wasCat || '(none)') + ' to ' + (nowCat || '(none)'), itemId);
    }
  }
}

/**
 * SPECIAL_RATE_MISMATCH. Freeze · A, F: 009_Special_Rates is the only machine
 * source for a named rate, and a rate of USD 0 there is a decision. Three ways
 * it can move after issue: the row changed, the row went away or was retired,
 * or a new ACTIVE row appeared that would now decide a line the issued revision
 * priced on the standard rate. Only ACTIVE newcomers count, because the engine
 * reads nothing else.
 */
function checkSpecialRates(c, snapshot, liveRates, on) {
  const refRows = Array.isArray(snapshot.Special_Rate_Reference) ? snapshot.Special_Rate_Reference : [];
  const live = new Map();
  for (const r of liveRates) live.set(specialRateKey(r), r);
  const wasKeys = new Set(refRows.map(specialRateKey));

  for (const was of refRows) {
    const key = specialRateKey(was);
    const now = live.get(key);
    const label = 'special rate ' + key;
    if (!now) {
      c.add(CODE.SPECIAL_RATE_MISMATCH, label + ' is gone from 009_Special_Rates since issue', key);
      continue;
    }
    const wasCents = toCents(was.Rate_Per_Person_Night), nowCents = toCents(now.Rate_Per_Person_Night);
    if (wasCents !== nowCents) {
      c.add(CODE.SPECIAL_RATE_MISMATCH, label + ' was ' + quote(wasCents) + ' per person per night at issue and is ' + quote(nowCents) + ' now', key);
      continue;
    }
    const wasRule = clean(was.Nights_Rule), nowRule = clean(now.Nights_Rule);
    if (wasRule !== nowRule) {
      c.add(CODE.SPECIAL_RATE_MISMATCH, label + ' Nights_Rule moved from ' + (wasRule || '(all)') + ' to ' + (nowRule || '(all)'), key + '·nights');
      continue;
    }
    const wasStatus = clean(was.Rate_Status), nowStatus = clean(now.Rate_Status);
    if (wasStatus !== nowStatus) {
      c.add(CODE.SPECIAL_RATE_MISMATCH, label + ' was ' + (wasStatus || '(none)') + ' at issue and is ' + (nowStatus || '(none)') + ' now', key + '·status');
    }
  }

  const persons = new Set((snapshot.Person_IDs || []).map(clean).filter(Boolean));
  const itemIds = new Set((snapshot.Item_IDs || []).map(clean).filter(Boolean));
  const holder = clean(snapshot.Holder_ID);

  for (const [key, now] of live) {
    if (wasKeys.has(key)) continue;
    if (clean(now.Rate_Status) !== RATE_STATUS.ACTIVE) continue;
    if (on) {
      const from = day10(now.Effective_From), to = day10(now.Effective_To);
      if (from && on < from) continue;
      if (to && on > to) continue;
    }
    const touchesHolder = clean(now.Holder_ID) && clean(now.Holder_ID) === holder;
    const touchesPerson = clean(now.Person_ID) && persons.has(clean(now.Person_ID));
    if (!touchesHolder && !touchesPerson) continue;
    if (itemIds.size && clean(now.Item_ID) && !itemIds.has(clean(now.Item_ID))) continue;
    c.add(CODE.SPECIAL_RATE_MISMATCH, 'an ACTIVE special rate ' + key + ' appeared in 009_Special_Rates after this revision was issued', key + '·new');
  }
}

/**
 * SETTLEMENT_MISMATCH. The engine is re-run by the caller on today's source;
 * this only compares its total with the issued one. A recomputation that can no
 * longer produce a total at all is still a mismatch, and the engine's reason is
 * carried through verbatim rather than being worked around.
 */
function checkTotals(c, snapshot, result) {
  if (!result) return;
  const was = Number.isFinite(snapshot.Total_Payable_Cents) ? snapshot.Total_Payable_Cents : null;
  const now = Number.isFinite(result.totalPayableCents) ? result.totalPayableCents : null;
  const review = Array.isArray(result.manualReview) ? result.manualReview : [];

  if (now == null) {
    if (was == null) return;
    const why = review.length
      ? MANUAL_REVIEW_REQUIRED + ' × ' + review.length + ': ' + review.map((l) => clean(l.reviewReason)).filter(Boolean).join('; ')
      : 'the engine returned no total';
    c.add(CODE.SETTLEMENT_MISMATCH, 'the issued total is ' + quote(was) + ' and the holder can no longer be recomputed to a total (' + why + ')', 'total');
    return;
  }
  if (was == null) return;
  if (was !== now) {
    c.add(CODE.SETTLEMENT_MISMATCH, 'the issued total is ' + quote(was) + ' and recomputing the holder on the live source yields ' + quote(now), 'total');
  }
}

/**
 * INVOICE_DRIFT. A self-consistency check inside one stored revision: the sum
 * of its own Block A lines against the total printed on it. The sum exists only
 * to be compared; it is never offered as a corrected amount and never replaces
 * the stored figure. A snapshot that carries no total at all is not drift here,
 * it is MANUAL_REVIEW_REQUIRED, and canIssue() already refuses it.
 */
function checkSnapshotInternals(c, snapshot) {
  const stored = Number.isFinite(snapshot.Total_Payable_Cents) ? snapshot.Total_Payable_Cents : null;
  if (stored == null) return;
  const lines = Array.isArray(snapshot.lines) ? snapshot.lines : [];
  let sum = 0;
  for (const l of lines) {
    if (l.block !== 'A') continue;
    if (!Number.isFinite(l.amountCents)) {
      c.add(CODE.INVOICE_DRIFT, 'stored line ' + (clean(l.Booking_ID) || '(no Booking_ID)') + ' carries no amount, so the revision cannot agree with its own lines', 'line·' + clean(l.Booking_ID));
      return;
    }
    sum += l.amountCents;
  }
  if (sum !== stored) {
    c.add(CODE.INVOICE_DRIFT, 'the revision total is ' + quote(stored) + ' and its own Block A lines read ' + quote(sum), 'total');
  }
  const blockA = Number.isFinite(snapshot.Block_A_Total_Cents) ? snapshot.Block_A_Total_Cents : null;
  if (blockA != null && blockA !== stored) {
    c.add(CODE.INVOICE_DRIFT, 'the revision carries Block_A_Total_Cents ' + quote(blockA) + ' and Total_Payable_Cents ' + quote(stored), 'blockA');
  }
}

/**
 * BOOKING_DRIFT. Freeze · B: a Booking_ID is immutable and an amendment mints a
 * new one, so an amendment legitimately shows up twice, as the old id turning
 * AMENDED and as a new id appearing. Both are reported: together they are the
 * complete description of what the guest changed.
 */
function checkBookings(c, snapshot, liveBookings, holder) {
  const inSnapshot = new Set((snapshot.Booking_IDs || []).map(clean).filter(Boolean));
  const seenLive = new Set();

  for (const b of liveBookings) {
    const bookingHolder = clean(b && b.Holder_ID);
    if (holder && bookingHolder && bookingHolder !== holder) continue;
    const id = clean(b && b.Booking_ID);
    if (!id) {
      c.add(CODE.BOOKING_DRIFT, 'a live booking for ' + (holder || 'this holder') + ' carries no Booking_ID', 'no-id·' + clean(b && b.Item_ID));
      continue;
    }
    seenLive.add(id);
    const state = clean(b.State) || BOOKING_STATE.CONFIRMED;

    if (!inSnapshot.has(id)) {
      if (isLive(state)) {
        c.add(CODE.BOOKING_DRIFT, 'booking ' + id + ' (' + (clean(b.Item_ID) || 'no item') + ') is ' + state + ' and was not in the issued revision', id);
      }
      continue;
    }
    if (state === BOOKING_STATE.AMENDED) {
      c.add(CODE.BOOKING_DRIFT, 'booking ' + id + ' from the issued revision has been AMENDED and superseded by a new booking id', id);
    } else if (state === BOOKING_STATE.CANCELLED) {
      c.add(CODE.BOOKING_DRIFT, 'booking ' + id + ' from the issued revision has been CANCELLED' + (clean(b.Cancelled_At) ? ' on ' + day10(b.Cancelled_At) : ''), id);
    }
  }

  for (const id of inSnapshot) {
    if (!seenLive.has(id)) {
      c.add(CODE.BOOKING_DRIFT, 'booking ' + id + ' is in the issued revision and is absent from the live source', id);
    }
  }
}

/** QUOTA_DRIFT. The engine owns quota (Freeze · B, C); this reads its verdict. */
function checkQuota(c, result, liveBookings, liveItems) {
  const quota = (result && result.quota) || quotaUsage(liveBookings, liveItems);
  for (const rec of Object.values(quota || {})) {
    if (!rec || !rec.overQuota) continue;
    c.add(CODE.QUOTA_DRIFT, 'item ' + rec.Item_ID + ' uses ' + rec.used + ' of ' + rec.Quota + ' ' + (rec.Quota_Unit || 'unit') + ' quota', rec.Item_ID);
  }
}

/**
 * EVIDENCE_MISMATCH (blocking) and EVIDENCE_MISSING (report only). Freeze · Q:
 * Issue & Publish is allowed while evidence is MISSING, so an absence is
 * reported and never gates. A MISMATCH is a contradiction between the operation
 * and its own evidence and does gate.
 */
function checkEvidence(c, snapshot, evidence, holder, settlementId) {
  evidence.forEach((row, index) => {
    const rowSid = clean(row && row.Settlement_ID);
    const rowHolder = clean(row && row.Holder_ID);
    /* a 010 row is this settlement's when it names this Settlement_ID, or this
       Holder; a row of somebody else's settlement never counts here */
    const mineBySettlement = !!(settlementId && rowSid && rowSid === settlementId);
    const mineByHolder = !!(holder && rowHolder && rowHolder === holder);
    if (!mineBySettlement && !mineByHolder) return;

    const status = clean(row.Evidence_Status);
    const ref = evidenceRef(row, index);
    const what = clean(row.Booking_ID) || clean(row.Item_ID) || ref;
    if (status === EVIDENCE_STATUS.MISMATCH) {
      c.add(CODE.EVIDENCE_MISMATCH, '010 marks the evidence for ' + what + ' as MISMATCH' + (clean(row.Note) ? ': ' + clean(row.Note) : ''), ref, rowHolder || holder);
    } else if (status === EVIDENCE_STATUS.MISSING) {
      c.add(CODE.EVIDENCE_MISSING, '010 expects evidence for ' + what + ' and has none', ref, rowHolder || holder);
    }
  });

  const snapStatus = clean(snapshot && snapshot.Evidence_Status);
  if (snapStatus === EVIDENCE_STATUS.MISMATCH) {
    c.add(CODE.EVIDENCE_MISMATCH, 'the issued revision itself records Evidence_Status MISMATCH', 'snapshot');
  } else if (snapStatus === EVIDENCE_STATUS.MISSING) {
    c.add(CODE.EVIDENCE_MISSING, 'the issued revision records Evidence_Status MISSING', 'snapshot');
  }
}

/**
 * CART_DRIFT, report only and never billing. Freeze · A: My Bag is a selection,
 * not an input to a charge. A cart line with no Confirmed Booking behind it is
 * worth telling Guest Relations about, because the guest believes something is
 * arranged; it changes no amount and blocks nothing.
 */
function checkCart(c, cart, liveBookings) {
  if (!cart.length) return;
  const confirmed = new Set();
  for (const b of liveBookings) {
    const state = clean(b && b.State) || BOOKING_STATE.CONFIRMED;
    if (!isLive(state)) continue;
    const item = clean(b.Item_ID);
    if (!item) continue;
    confirmed.add(item);
    confirmed.add(item + '|' + clean(b.Person_ID));
  }

  cart.forEach((line, index) => {
    const item = clean(line && (line.Item_ID || line.Product_Key || line.key));
    if (!item) return;
    const person = clean(line && line.Person_ID);
    const ref = item + (person ? '|' + person : '') + '#' + index;
    const matched = person ? confirmed.has(item + '|' + person) : confirmed.has(item);
    if (!matched) {
      c.add(CODE.CART_DRIFT, 'cart line ' + item + (person ? ' for ' + person : '') + ' has no confirmed booking; a selection is never billed', ref, clean(line.Holder_ID));
    }
  });
}

/**
 * The journal findings, all report only. 008_Payment_Journal in Google is
 * canonical and append-only (Freeze · J, K): a duplicate is appended and flagged,
 * never removed, and nothing here deduplicates, reconciles away or verifies a
 * row. Only rows that cannot be placed in a balance, or that are attributed to
 * the wrong settlement, are surfaced for a human.
 *
 * Freeze · I gives exactly one Settlement per Holder, which is what makes a
 * mis-attributed row detectable at all: a row carrying this Holder_ID and some
 * other Settlement_ID cannot be right.
 */
function checkJournal(c, journal, holder, settlementId) {
  journal.forEach((row, index) => {
    const rowSid = clean(row && row.Settlement_ID);
    const rowHolder = clean(row && row.Holder_ID);
    const ref = rowRef(row, index);

    if (!rowSid && !rowHolder) {
      c.add(CODE.PAYMENT_UNMATCHED, 'journal row ' + ref + ' names neither a Settlement nor a Holder', ref, null);
      return;
    }
    const mine = (settlementId && rowSid === settlementId) || (holder && rowHolder === holder);
    if (!mine) return;

    if (settlementId && rowSid && rowSid !== settlementId) {
      c.add(CODE.PAYMENT_UNMATCHED, 'journal row ' + ref + ' carries Holder ' + rowHolder + ' and names settlement ' + rowSid + ', not this holder’s ' + settlementId, ref, rowHolder || holder);
      return;
    }
    if (!rowSid) {
      c.add(CODE.PAYMENT_UNMATCHED, 'journal row ' + ref + ' carries Holder ' + rowHolder + ' and no Settlement_ID, so it cannot be placed', ref, rowHolder || holder);
    }
    if (settlementId && rowSid === settlementId && rowHolder && holder && rowHolder !== holder) {
      c.add(CODE.PAYMENT_MISMATCH, 'journal row ' + ref + ' names settlement ' + rowSid + ' but Holder ' + rowHolder, ref, rowHolder);
    }

    const status = clean(row.Record_Status);
    if (status && !RECORD_STATUS[status]) {
      c.add(CODE.PAYMENT_MISMATCH, 'journal row ' + ref + ' carries an unknown Record_Status ' + status, ref + '·status', rowHolder || holder);
    }
    const type = clean(row.Entry_Type);
    if (type && !ENTRY_TYPE[type]) {
      c.add(CODE.PAYMENT_MISMATCH, 'journal row ' + ref + ' carries an unknown Entry_Type ' + type, ref + '·type', rowHolder || holder);
    }
    const usdCents = toCents(row.Amount_USD);
    if (status === RECORD_STATUS.VERIFIED && usdCents == null) {
      c.add(CODE.PAYMENT_MISMATCH, 'journal row ' + ref + ' is VERIFIED with no readable Amount_USD, so it cannot enter the balance', ref + '·amount', rowHolder || holder);
    }

    const method = clean(row.Method);
    const stated = clean(row.Currency).toUpperCase();
    const channelCurrency = CHANNEL_CURRENCY[method] || null;
    if (stated && channelCurrency && stated !== channelCurrency) {
      c.add(CODE.PAYMENT_CURRENCY_MISMATCH, 'journal row ' + ref + ' was paid by ' + method + ' and records ' + stated, ref + '·currency', rowHolder || holder);
    } else if (stated && stated !== ACCOUNTING_CURRENCY && usdCents == null) {
      c.add(CODE.PAYMENT_CURRENCY_MISMATCH, 'journal row ' + ref + ' records ' + stated + ' and no ' + ACCOUNTING_CURRENCY + ' accounting amount', ref + '·currency', rowHolder || holder);
    }
  });
}

/* ----------------------------------------------------------------- gating */

/** Freeze · X — only an unresolved issue-blocking Drift stands in the way. */
export function blockingOf(drifts) {
  return (Array.isArray(drifts) ? drifts : []).filter((d) => {
    if (!d || d.resolved) return false;
    return DRIFT_BLOCKING.includes(clean(d.code || d));
  });
}
export function isBlocking(drifts) {
  return blockingOf(drifts).length > 0;
}
export function reportOnlyOf(drifts) {
  return (Array.isArray(drifts) ? drifts : []).filter((d) => {
    if (!d || d.resolved) return false;
    return DRIFT_REPORT_ONLY.includes(clean(d.code || d));
  });
}

/* ------------------------------------------------------------- monitoring */

/**
 * Freeze · X — the three monitoring signals, in their own array because they
 * are explicitly NOT Drift: they describe the state of an operation, not a
 * disagreement between sources, and they never gate Issue & Publish.
 *
 * `payment` is a paymentStatus() result from src/billing/settlement.js, handed
 * in by the caller. This module never derives a payment position and never
 * verifies a row, so with no payment position the two payment-dependent signals
 * are simply not evaluated rather than guessed.
 *
 * `agingDays` is an operational patience, not a financial value: nothing about
 * it touches an amount. It has no Freeze default, so a caller that names none
 * gets no VERIFICATION_AGING signal rather than one measured against a number
 * invented here.
 */
export function monitoringSignals({ snapshot, payment, journalRows, asOf, holderId, agingDays } = {}) {
  const out = [];
  const holder = clean(holderId) || clean(snapshot && snapshot.Holder_ID) || null;
  const settlementId = clean(snapshot && snapshot.Settlement_ID) || null;
  const rows = Array.isArray(journalRows) ? journalRows : [];
  const today = day10(asOf);
  const add = (code, detail) => out.push(Object.freeze({
    code, severity: SEVERITY.MONITORING, holderId: holder, detail: clean(detail), resolved: false,
  }));

  const status = clean(payment && payment.status) || null;
  const dueDate = day10(snapshot && snapshot.Due_Date);
  const flags = Array.isArray(payment && payment.flags) ? payment.flags : [];

  /* OVERDUE — settlement.js already raises the flag when it was given a date;
   * the fallback compares the two dates and computes nothing financial. */
  const unpaidish = status === PAYMENT_STATUS.UNPAID || status === PAYMENT_STATUS.PARTIAL;
  if (flags.includes(SIGNAL.OVERDUE) || (unpaidish && today && dueDate && today > dueDate)) {
    add(SIGNAL.OVERDUE, 'payment is ' + (status || 'outstanding') + ' and the Due_Date ' + (dueDate || '(unknown)') + ' has passed'
      + (payment && Number.isFinite(payment.balanceCents) ? '; outstanding ' + quote(payment.balanceCents) : ''));
  }

  /* VERIFICATION_AGING — a REPORTED entry affects no balance (Freeze · K), so
   * one left sitting is an operational backlog, not a financial problem. */
  const patience = Number(agingDays);
  if (Number.isFinite(patience) && patience >= 0 && today) {
    const now = parseDay(today);
    for (const [index, row] of rows.entries()) {
      const rowSid = clean(row && row.Settlement_ID);
      if (settlementId && rowSid && rowSid !== settlementId) continue;
      if (!rowSid && holder && clean(row && row.Holder_ID) !== holder) continue;
      if (clean(row && row.Record_Status) !== RECORD_STATUS.REPORTED) continue;
      const at = parseDay(day10(row && row.Reported_At));
      if (at == null || now == null) continue;
      const age = Math.floor((now - at) / DAY);
      if (age > patience) {
        add(SIGNAL.VERIFICATION_AGING, 'journal row ' + rowRef(row, index) + ' has been REPORTED and unverified for ' + age + ' days');
      }
    }
  }

  /* OVERPAID_NO_REFUND — Freeze · P gives a refund 14 days from the Issue_Date;
   * the date is read from settlement.js, and no refund is ever created here. */
  if (status === PAYMENT_STATUS.OVERPAID) {
    const hasRefund = rows.some((row) => {
      const rowSid = clean(row && row.Settlement_ID);
      if (settlementId && rowSid && rowSid !== settlementId) return false;
      if (!rowSid && holder && clean(row && row.Holder_ID) !== holder) return false;
      return clean(row && row.Entry_Type) === ENTRY_TYPE.REFUND;
    });
    if (!hasRefund) {
      const refundDue = refundDueDateFor(clean(snapshot && snapshot.Issue_Date));
      const late = refundDue && today && today > refundDue;
      add(SIGNAL.OVERPAID_NO_REFUND, 'the settlement is OVERPAID'
        + (payment && Number.isFinite(payment.balanceCents) ? ' by ' + quote(Math.abs(payment.balanceCents)) : '')
        + ' and the journal holds no refund entry'
        + (refundDue ? '; refund due ' + refundDue + (late ? ', already passed' : '') : ''));
    }
  }

  return out;
}

/* -------------------------------------------------- the revision proposal */

/**
 * Freeze · W — the agent may create a Revision DRAFT. This builds the proposal
 * and nothing else: it is a plain object, it is frozen, it is not written
 * anywhere and it is not an issue.
 *
 * It always names a NEW revision number and records the revision it would
 * supersede, which is how "never silently edit an issued revision" is enforced
 * rather than promised: there is no path through this function that addresses
 * the current revision. Every figure is quoted from the engine result handed
 * in; where the engine refused to produce a total, the proposal carries
 * MANUAL_REVIEW_REQUIRED and the engine's own reasons, and no total at all.
 *
 * `settlementState` is the settlement's state today and defaults to ISSUED,
 * because a revision proposal only arises for a settlement that has been
 * issued. settlementStateAfterDrift() in src/billing/settlement.js turns it
 * into CHANGE_DETECTED when a blocking Drift stands; that decision is not
 * duplicated here.
 */
export function proposeRevisionDraft({
  holderId, settlementId, currentRevision, result, drifts, settlementState,
} = {}) {
  const list = Array.isArray(drifts) ? drifts : [];
  const unresolved = list.filter((d) => d && !d.resolved);
  const blocking = blockingOf(unresolved);
  const reportOnly = reportOnlyOf(unresolved);

  const review = Array.isArray(result && result.manualReview) ? result.manualReview : [];
  const reviewReasons = review.map((l) => clean(l && l.reviewReason)).filter(Boolean);

  const n = Number(currentRevision);
  const current = Number.isInteger(n) && n >= 1 ? n : null;
  if (current == null) reviewReasons.push('currentRevision is not a positive integer, so no successor revision can be named');

  const totalCents = (review.length || !result || !Number.isFinite(result.totalPayableCents))
    ? null : result.totalPayableCents;

  const blockers = blocking.map((d) => d.code);
  if (review.length) blockers.push(MANUAL_REVIEW_REQUIRED);

  return Object.freeze({
    kind: 'REVISION_DRAFT_PROPOSAL',
    Holder_ID: clean(holderId) || null,
    Settlement_ID: clean(settlementId) || null,
    supersedes_Revision: current,
    Revision: current == null ? null : current + 1,
    Revision_State: REVISION_STATE.DRAFT,
    /* Freeze · I — the settlement moves to CHANGE_DETECTED, decided in settlement.js */
    Settlement_State: settlementStateAfterDrift(
      clean(settlementState) || SETTLEMENT_STATE.ISSUED, blocking.length > 0,
    ),
    /* the only transition this agent ever proposes */
    mayAdvanceTo: nextRevisionState(REVISION_STATE.DRAFT, 'READY'),
    mayIssue: false,
    issueNote: 'the reconciliation agent never issues; canIssue() in src/billing/settlement.js is the only gate',
    issueBlockedBy: Object.freeze(blockers),
    Total_Payable_Cents: totalCents,
    Total_Payable_Display: totalCents == null ? null : formatUSD(totalCents),
    Currency: ACCOUNTING_CURRENCY,
    Engine_Version: clean(result && result.engineVersion) || null,
    /* quoted from the engine result, line for line, with nothing recomputed */
    lines: Object.freeze(((result && result.lines) || []).map((l) => Object.freeze({
      Booking_ID: l.Booking_ID, Item_ID: l.Item_ID, Person_ID: l.Person_ID,
      Bill_To_Holder_ID: l.Bill_To_Holder_ID, Room_Unit_ID: l.Room_Unit_ID,
      Billing_Category: l.Billing_Category, Rate_Basis: l.Rate_Basis,
      rateSource: l.rateSource, rateCents: l.rateCents,
      nights: l.nights, payableNights: l.payableNights, quantity: l.quantity,
      amountCents: l.amountCents, block: l.block,
      review: l.review || null, reviewReason: l.reviewReason || null,
    }))),
    review: (review.length || current == null) ? MANUAL_REVIEW_REQUIRED : null,
    reviewReasons: Object.freeze(reviewReasons),
    drifts: Object.freeze(unresolved.map((d) => d.code)),
    blockingDrifts: Object.freeze(blocking.map((d) => d.code)),
    reportOnlyDrifts: Object.freeze(reportOnly.map((d) => d.code)),
    writes: 'none',
  });
}

/**
 * Freeze · W — the agent may set READY_FOR_REVIEW. That is the state in which a
 * human looks at the draft, so a blocking Drift does not stand in its way; it
 * stands in the way of Issue & Publish, which this module cannot reach. The
 * transition itself comes from nextRevisionState(), so the revision flow is
 * defined in exactly one place.
 */
export function markReadyForReview(proposal) {
  if (!proposal || proposal.kind !== 'REVISION_DRAFT_PROPOSAL') {
    return { ok: false, error: 'not a revision draft proposal' };
  }
  if (proposal.Revision == null) {
    return { ok: false, error: 'the proposal names no successor revision' };
  }
  const next = nextRevisionState(proposal.Revision_State, 'READY');
  if (next !== REVISION_STATE.READY_FOR_REVIEW) {
    return { ok: false, error: 'only a DRAFT proposal can be made READY_FOR_REVIEW' };
  }
  return { ok: true, proposal: Object.freeze({ ...proposal, Revision_State: next }) };
}

/* ------------------------------------------------------------ the report */

function asList(v) {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return Object.values(v);
  return [];
}
function flatList(v) {
  const out = [];
  for (const entry of asList(v)) {
    if (Array.isArray(entry)) out.push(...entry);
    else if (entry) out.push(entry);
  }
  return out;
}
function countBy(list, key) {
  const out = {};
  for (const row of list) {
    const k = clean(row && row[key]) || '(none)';
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
/** payments may arrive keyed by Holder_ID or Settlement_ID, or as rows carrying either. */
function paymentFor(payments, holderId, settlementId) {
  if (!payments) return null;
  if (!Array.isArray(payments) && typeof payments === 'object') {
    if (holderId && payments[holderId]) return payments[holderId];
    if (settlementId && payments[settlementId]) return payments[settlementId];
  }
  for (const row of asList(payments)) {
    if (!row || typeof row !== 'object') continue;
    const h = clean(row.holderId || row.Holder_ID);
    const s = clean(row.settlementId || row.Settlement_ID);
    if (holderId && h && h === holderId) return row;
    if (settlementId && s && s === settlementId) return row;
  }
  return null;
}

/**
 * The reconciliation report: what a BILLING_ADMIN needs to read in order to act
 * (Freeze · W, Z). It is internal reading material, never guest-facing copy and
 * never a communication, and the module that builds it cannot send it anywhere.
 *
 * IT COUNTS, IT DOES NOT TOTAL MONEY. Confirmed Revenue and the Revenue
 * Overview come from src/billing/engine.js and from nowhere else (Freeze · U,
 * V), so this report adds no amounts together across holders. Each holder's
 * figure is quoted exactly as the engine or the snapshot gave it; everything
 * aggregated here is a count of findings.
 *
 *   holders  — rows of { holderId, settlementId, settlementState, revision,
 *              dueDate, totalPayableCents } (an array, or a map keyed by holder)
 *   drifts   — the findings, flat or grouped per holder
 *   payments — paymentStatus() results, keyed by holder or settlement
 */
export function reconciliationReport({ holders, drifts, payments, monitoring, asOf } = {}) {
  const holderRows = asList(holders);
  const allDrifts = flatList(drifts).filter((d) => d && clean(d.code));
  const allSignals = flatList(monitoring).filter((s) => s && clean(s.code));
  const unresolved = allDrifts.filter((d) => !d.resolved);

  const byHolder = new Map();
  for (const d of unresolved) {
    const key = clean(d.holderId) || '(unattributed)';
    if (!byHolder.has(key)) byHolder.set(key, []);
    byHolder.get(key).push(d);
  }
  const signalsByHolder = new Map();
  for (const s of allSignals) {
    const key = clean(s.holderId) || '(unattributed)';
    if (!signalsByHolder.has(key)) signalsByHolder.set(key, []);
    signalsByHolder.get(key).push(s);
  }

  const attention = [];
  const rows = holderRows.map((h) => {
    const holderId = clean(h && (h.holderId || h.Holder_ID)) || null;
    const settlementId = clean(h && (h.settlementId || h.Settlement_ID)) || null;
    const mine = byHolder.get(holderId || '(unattributed)') || [];
    const blocking = blockingOf(mine).map((d) => d.code);
    const reportOnly = reportOnlyOf(mine).map((d) => d.code);
    const signals = (signalsByHolder.get(holderId || '(unattributed)') || []).map((s) => s.code);
    const payment = paymentFor(payments, holderId, settlementId);
    const totalCents = Number.isFinite(h && h.totalPayableCents) ? h.totalPayableCents
      : (Number.isFinite(h && h.Total_Payable_Cents) ? h.Total_Payable_Cents : null);

    const label = (holderId || '(unattributed)') + (settlementId ? ' · ' + settlementId : '');
    if (blocking.length) attention.push(label + ' · ISSUE BLOCKED: ' + blocking.join(', '));
    if (payment && clean(payment.status)) {
      const quoted = Number.isFinite(payment.istCents) && Number.isFinite(payment.sollCents)
        ? ' (' + quote(payment.istCents) + ' of ' + quote(payment.sollCents) + ')' : '';
      const extra = Array.isArray(payment.flags) && payment.flags.length ? ' · ' + payment.flags.join(', ') : '';
      attention.push(label + ' · payment ' + clean(payment.status) + quoted + extra);
    }
    if (signals.length) attention.push(label + ' · monitoring: ' + signals.join(', '));

    return Object.freeze({
      holderId,
      settlementId,
      settlementState: clean(h && (h.settlementState || h.Settlement_State)) || null,
      revision: Number.isFinite(Number(h && (h.revision ?? h.Revision)))
        ? Number(h.revision ?? h.Revision) : null,
      dueDate: day10(h && (h.dueDate || h.Due_Date)) || null,
      totalPayableCents: totalCents,
      totalPayable: totalCents == null ? null : formatUSD(totalCents),
      paymentStatus: clean(payment && payment.status) || null,
      paymentFlags: Object.freeze(Array.isArray(payment && payment.flags) ? [...payment.flags] : []),
      pendingVerification: Number.isFinite(payment && payment.pendingCount) ? payment.pendingCount : null,
      blockingDrifts: Object.freeze(blocking),
      reportOnlyDrifts: Object.freeze(reportOnly),
      monitoring: Object.freeze(signals),
      issueBlocked: blocking.length > 0,
    });
  });

  /* a finding that belongs to nobody must still be read by someone, so it is
   * listed on its own unless a holder row already carried that bucket */
  const unattributedShown = rows.some((r) => r.holderId === null);
  if (!unattributedShown) {
    for (const d of byHolder.get('(unattributed)') || []) {
      attention.push('(unattributed) · ' + d.code + ': ' + d.detail);
    }
  }

  return Object.freeze({
    kind: 'RECONCILIATION_REPORT',
    generatedFor: 'BILLING_ADMIN',
    asOf: day10(asOf) || null,
    engineVersion: ENGINE_VERSION,
    currency: ACCOUNTING_CURRENCY,
    holders: Object.freeze(rows),
    drift: Object.freeze({
      total: allDrifts.length,
      unresolved: unresolved.length,
      blocking: blockingOf(unresolved).length,
      reportOnly: reportOnlyOf(unresolved).length,
      byCode: Object.freeze(countBy(unresolved, 'code')),
      bySeverity: Object.freeze(countBy(unresolved, 'severity')),
    }),
    payments: Object.freeze({
      byStatus: Object.freeze(countBy(rows.filter((r) => r.paymentStatus), 'paymentStatus')),
      holdersWithPendingVerification: rows.filter((r) => r.pendingVerification > 0).length,
    }),
    monitoring: Object.freeze({
      total: allSignals.length,
      byCode: Object.freeze(countBy(allSignals, 'code')),
      note: 'Freeze · X — monitoring signals are not Drift and never gate Issue & Publish',
    }),
    issueBlockedHolders: Object.freeze(rows.filter((r) => r.issueBlocked).map((r) => r.holderId)),
    attention: Object.freeze(attention),
    note: 'counts and quoted figures only; every amount comes from src/billing/engine.js or from a stored Snapshot, '
      + 'no amount is totalled across holders here, and this report is never sent to a guest',
  });
}
