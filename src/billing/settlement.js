/* ============================================================================
   H&S WEDDING 2027 — SETTLEMENT, SNAPSHOT, FX, DUE DATE, PAYMENT STATUS
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL
   (Freeze · I, M, N, O, P, R, S).

   Everything here is pure: the calling code supplies the engine result, the
   payment journal rows and the dates. Nothing reads a clock, a binding or the
   network, so an ISSUED Revision can be recomputed from its Snapshot and must
   come out identical (Freeze · I — issued revisions are immutable).

   THE AMOUNT ALWAYS COMES FROM src/billing/engine.js. This module never
   derives a price; it arranges, freezes and compares what the engine produced
   (Freeze · U — no duplicate financial calculation exists anywhere).
   ========================================================================== */

import {
  ENTRY_TYPE, RECORD_STATUS, PAYMENT_STATUS, REVISION_STATE, SETTLEMENT_STATE,
  EVIDENCE_STATUS, PAYMENT_TOLERANCE_USD, ACCOUNTING_CURRENCY, CHANNEL_CURRENCY,
  DRIFT_BLOCKING, MANUAL_REVIEW_REQUIRED, toCents, fromCents,
} from './model.js';
import { ENGINE_VERSION } from './engine.js';
import { CHANNEL_DESTINATION } from './preference.js';

const clean = (v) => String(v == null ? '' : v).trim();

/* ------------------------------------------------------------------ dates */

const DAY = 86400000;
/** 'YYYY-MM-DD' → epoch ms (UTC midnight); null when unparseable. */
export function parseDay(iso) {
  const s = clean(iso).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(s + 'T00:00:00Z');
  return Number.isFinite(t) ? t : null;
}
export function addDays(iso, days) {
  const t = parseDay(iso);
  if (t == null) return null;
  return new Date(t + days * DAY).toISOString().slice(0, 10);
}

/** Freeze · P — the 30.11.2026 hinge. */
export const DUE_DATE_HINGE = '2026-11-30';

/**
 * Freeze · P.
 *   Issue_Date  < 30.11.2026 → max(Issue+7, min(Issue+21, 30.11.2026))
 *   Issue_Date >= 30.11.2026 → Issue+21
 * A BILLING_ADMIN override wins and MUST be stored in the Snapshot.
 */
export function dueDateFor(issueDate, override) {
  const ov = clean(override);
  if (ov) return ov.slice(0, 10);
  const issue = parseDay(issueDate);
  if (issue == null) return null;
  const hinge = parseDay(DUE_DATE_HINGE);
  if (issue >= hinge) return addDays(issueDate, 21);
  const plus7 = parseDay(addDays(issueDate, 7));
  const plus21 = parseDay(addDays(issueDate, 21));
  const inner = Math.min(plus21, hinge);
  return new Date(Math.max(plus7, inner)).toISOString().slice(0, 10);
}

/** Freeze · P — an OVERPAID revision has no payment due date; refund in 14 days. */
export function refundDueDateFor(issueDate) { return addDays(issueDate, 14); }

/* --------------------------------------------------------------------- FX */

/**
 * Freeze · M — at Issue & Publish the active FX values are frozen into the
 * Revision Snapshot. An issued revision never changes because FX later moves.
 *
 * WHERE THE RESOLUTION LIVES (Owner, 5 Oct 2026). Choosing WHICH rate applies
 * is a source decision and belongs to src/billing/source.js · resolveFx, which
 * reads 011_Billing_Config and insists on exactly ONE applicable ACTIVE value
 * per key. The earlier "most recent Effective_From wins" rule is gone: it was
 * a heuristic, and a heuristic that picks between two approved rates is the
 * engine deciding a financial question it may not decide.
 *
 * This function therefore only VALIDATES what resolveFx produced before it is
 * frozen. A gap is carried through, never filled: no hardcoded fallback rate
 * exists anywhere, and Issue & Publish is blocked while one stands.
 */
export function freezeFx(resolved) {
  const r = resolved || {};
  const thb = Number(r.FX_USD_THB);
  const eur = Number(r.FX_USD_EUR);
  const gaps = Array.isArray(r.gaps) ? r.gaps.slice() : [];
  if (!Number.isFinite(thb) || thb <= 0) {
    if (!gaps.length) gaps.push('FX_USD_THB: no usable ACTIVE value');
  }
  if (!Number.isFinite(eur) || eur <= 0) {
    if (!gaps.length) gaps.push('FX_USD_EUR: no usable ACTIVE value');
  }
  return {
    FX_USD_THB: Number.isFinite(thb) && thb > 0 ? thb : null,
    FX_USD_EUR: Number.isFinite(eur) && eur > 0 ? eur : null,
    Effective_From: clean(r.Effective_From) || null,
    Approved_By: clean(r.Approved_By) || null,
    gaps,
  };
}

/** Convert a USD cent amount into the guest's preferred currency using frozen FX. */
export function inPreferredCurrency(cents, channel, fx) {
  const usd = fromCents(cents);
  if (usd == null) return null;
  /* the method decides the currency (PromptPay THB · PayPal EUR · SEPA EUR);
     without an approved method nothing is converted */
  const currency = CHANNEL_CURRENCY[channel];
  const r = currency === 'THB' ? fx && Number(fx.FX_USD_THB)
    : currency === 'EUR' ? fx && Number(fx.FX_USD_EUR) : null;
  return r ? { currency, amount: Math.round(usd * r * 100) / 100, rate: r } : null;
}

/* --------------------------------------------------------- payment status */

/**
 * Freeze · K, O — ONLY VERIFIED entries affect balances.
 *   Ist = VERIFIED payments − VERIFIED refunds + VERIFIED adjustments
 * Everything still REPORTED raises PENDING_VERIFICATION and is not counted.
 *
 * ONE SETTLEMENT ONLY. Without a Settlement_ID there is no position: nothing
 * is counted (a guest without a settlement must never see — or be credited
 * with — the rows of anyone else). The whole-journal total is a separate,
 * administrative function: journalPosition().
 */
export function paymentPosition(journalRows, settlementId) {
  const sid = clean(settlementId);
  if (!sid) return { verifiedCents: 0, pendingCount: 0, rejectedCount: 0 };
  return positionOf((Array.isArray(journalRows) ? journalRows : []).filter((r) => clean(r && r.Settlement_ID) === sid));
}

/** The whole 008 journal as one position — for BILLING_ADMIN reporting only. */
export function journalPosition(journalRows) {
  return positionOf(Array.isArray(journalRows) ? journalRows : []);
}

function positionOf(rows) {
  let verifiedCents = 0, pending = 0, rejected = 0;

  for (const r of rows) {
    const status = clean(r.Record_Status);
    if (status === RECORD_STATUS.REPORTED) { pending++; continue; }
    if (status === RECORD_STATUS.REJECTED) { rejected++; continue; }
    if (status !== RECORD_STATUS.VERIFIED) continue;

    const cents = toCents(r.Amount_USD);
    if (cents == null) continue;
    const type = clean(r.Entry_Type);
    if (type === ENTRY_TYPE.PAYMENT) verifiedCents += cents;
    else if (type === ENTRY_TYPE.REFUND) verifiedCents -= cents;
    else if (type === ENTRY_TYPE.ADJUSTMENT) verifiedCents += cents;
  }
  return { verifiedCents, pendingCount: pending, rejectedCount: rejected };
}

/**
 * Freeze · O — calculated, never typed by hand.
 * `sollCents` is the amount of the current valid ISSUED Revision.
 * Tolerance (Freeze · N) is an absolute USD 5 equivalent and applies ONLY to
 * the payment balance; it never suppresses a financial-source Drift.
 */
export function paymentStatus({ sollCents, journalRows, settlementId, today, dueDate }) {
  const pos = paymentPosition(journalRows, settlementId);
  const soll = Number.isFinite(sollCents) ? sollCents : null;
  const ist = pos.verifiedCents;
  const flags = [];
  if (pos.pendingCount) flags.push('PENDING_VERIFICATION');

  if (soll == null) {
    return { status: null, sollCents: null, istCents: ist, balanceCents: null, flags,
      review: MANUAL_REVIEW_REQUIRED, ...pos };
  }

  const balance = soll - ist;                       /* > 0 outstanding, < 0 overpaid */
  const tol = PAYMENT_TOLERANCE_USD * 100;

  let status;
  if (soll === 0 && ist === 0) status = PAYMENT_STATUS.NOTHING_DUE;
  else if (balance <= -tol) status = PAYMENT_STATUS.OVERPAID;
  else if (Math.abs(balance) <= tol) status = PAYMENT_STATUS.PAID;
  else if (ist <= 0) status = PAYMENT_STATUS.UNPAID;
  else status = PAYMENT_STATUS.PARTIAL;

  const d = parseDay(today), due = parseDay(dueDate);
  if (d != null && due != null && d > due &&
      (status === PAYMENT_STATUS.UNPAID || status === PAYMENT_STATUS.PARTIAL)) flags.push('OVERDUE');

  return {
    status, sollCents: soll, istCents: ist, balanceCents: balance,
    soll: fromCents(soll), ist: fromCents(ist), balance: fromCents(balance),
    toleranceCents: tol, flags, ...pos,
  };
}

/**
 * Freeze · J — a duplicate report is STILL appended; it is only flagged.
 * Same Settlement_ID + Method + Amount within 24 hours.
 */
export function isDuplicateSuspect(candidate, journalRows) {
  const rows = Array.isArray(journalRows) ? journalRows : [];
  const sid = clean(candidate && candidate.Settlement_ID);
  const method = clean(candidate && candidate.Method);
  const amount = toCents(candidate && candidate.Amount_Paid);
  const at = Date.parse(clean(candidate && candidate.Reported_At));
  if (!sid || !Number.isFinite(at)) return false;

  for (const r of rows) {
    if (clean(r.Settlement_ID) !== sid) continue;
    if (clean(r.Method) !== method) continue;
    if (toCents(r.Amount_Paid) !== amount) continue;
    const t = Date.parse(clean(r.Reported_At));
    if (Number.isFinite(t) && Math.abs(at - t) <= DAY) return true;
  }
  return false;
}

/* --------------------------------------------------------------- snapshot */

/**
 * Freeze · R — the immutable Settlement Snapshot taken BEFORE Issue & Publish.
 * It carries everything needed to recompute the revision byte for byte, so a
 * later change in Google can never alter an issued document.
 */
export function buildSnapshot({
  settlementId, revision, holderId, result, items, specialRates,
  fx, issueDate, dueDateOverride, evidenceStatus, sourceHash, calculatedAt,
  paymentPreference,
}) {
  const lines = (result && result.lines) || [];
  const dueDate = dueDateFor(issueDate, dueDateOverride);

  return Object.freeze({
    Settlement_ID: clean(settlementId) || null,
    Revision: Number(revision) || null,
    Holder_ID: clean(holderId) || null,
    Person_IDs: [...new Set(lines.map((l) => l.Person_ID).filter(Boolean))],
    Booking_IDs: lines.map((l) => l.Booking_ID).filter(Boolean),
    Room_Unit_IDs: [...new Set(lines.map((l) => l.Room_Unit_ID).filter(Boolean))],
    Bill_To_Holder_IDs: [...new Set(lines.map((l) => l.Bill_To_Holder_ID).filter(Boolean))],
    Item_IDs: [...new Set(lines.map((l) => l.Item_ID).filter(Boolean))],
    lines: lines.map((l) => Object.freeze({
      Booking_ID: l.Booking_ID, Item_ID: l.Item_ID, Person_ID: l.Person_ID,
      Bill_To_Holder_ID: l.Bill_To_Holder_ID, Room_Unit_ID: l.Room_Unit_ID,
      Billing_Category: l.Billing_Category, Rate_Basis: l.Rate_Basis,
      rateSource: l.rateSource, rateCents: l.rateCents,
      nights: l.nights, payableNights: l.payableNights, quantity: l.quantity,
      modifiers: l.modifiers, amountCents: l.amountCents, block: l.block,
      Change_Cutoff: l.Change_Cutoff, Cancellation_Cutoff: l.Cancellation_Cutoff,
      Currency: l.currency, specialRateRef: l.specialRateRef || null,
    })),
    Standard_Rate_Reference: itemRateReference(items),
    Special_Rate_Reference: specialRateReference(specialRates),
    FX_USD_THB: fx ? fx.FX_USD_THB : null,
    FX_USD_EUR: fx ? fx.FX_USD_EUR : null,
    /* the payment method in force at issue and the currency it settles in
       (Freeze · L, M); this revision never takes another one */
    Payment_Preference: clean(paymentPreference) || null,
    Payment_Currency: CHANNEL_CURRENCY[clean(paymentPreference)] || null,
    Payment_Recipient: (CHANNEL_DESTINATION[clean(paymentPreference)] || {}).recipient || null,
    Issue_Date: clean(issueDate) || null,
    Due_Date: dueDate,
    Due_Date_Override: clean(dueDateOverride) || null,
    Block_A_Total_Cents: result ? result.totalPayableCents : null,
    Block_B_Informational: ((result && result.blockB) || []).map((l) => l.Item_ID),
    Total_Payable_Cents: result ? result.totalPayableCents : null,
    Hosted_Value_Cents: result ? result.hostedValueCents : null,
    Currency: ACCOUNTING_CURRENCY,
    Engine_Version: ENGINE_VERSION,
    Source_Hash: clean(sourceHash) || null,
    Evidence_Status: clean(evidenceStatus) || EVIDENCE_STATUS.MISSING,
    calculated_at: clean(calculatedAt) || null,
  });
}

function itemRateReference(items) {
  const out = {};
  for (const [id, it] of Object.entries(items || {})) {
    out[id] = { Standard_Rate: it.Standard_Rate ?? null, Rate_Basis: it.Rate_Basis ?? null,
      Rate_Status: it.Rate_Status ?? null, Billing_Category: it.Billing_Category ?? null };
  }
  return out;
}
function specialRateReference(specialRates) {
  return (Array.isArray(specialRates) ? specialRates : []).map((r) => ({
    Holder_ID: r.Holder_ID ?? null, Person_ID: r.Person_ID ?? null, Item_ID: r.Item_ID ?? null,
    Rate_Per_Person_Night: r.Rate_Per_Person_Night ?? null, Nights_Rule: r.Nights_Rule ?? null,
    Rate_Status: r.Rate_Status ?? null, Approved_By: r.Approved_By ?? null,
  }));
}

/* ----------------------------------------------------------------- gating */

/**
 * Freeze · I, Q, X — may this revision be issued?
 * Issue & Publish is allowed with Evidence_Status MISSING; it is NOT allowed
 * while a material issue-blocking Drift or any MANUAL_REVIEW_REQUIRED stands,
 * and never before the Mandatory Activation Gate is approved (Freeze · AB).
 */
export function canIssue({ result, drifts, activationGateApproved, fx, sourceGaps }) {
  const reasons = [];
  if (!activationGateApproved) reasons.push('ACTIVATION_GATE_NOT_APPROVED');
  const review = (result && result.manualReview) || [];
  if (review.length) reasons.push(MANUAL_REVIEW_REQUIRED + ' × ' + review.length);
  /* Owner, 5 Oct 2026 — an unresolved FX value blocks the issue outright, and
   * so does any other named source gap (an ambiguous Site_Product_Key, a
   * missing Number of Nights). None of them is ever filled by a default. */
  for (const g of (fx && fx.gaps) || []) reasons.push('FX: ' + g);
  for (const g of Array.isArray(sourceGaps) ? sourceGaps : []) reasons.push(String(g));
  for (const d of Array.isArray(drifts) ? drifts : []) {
    const code = clean(d && (d.code || d));
    const resolved = !!(d && d.resolved);
    if (!resolved && DRIFT_BLOCKING.includes(code)) reasons.push(code);
  }
  return { allowed: reasons.length === 0, reasons };
}

/** Freeze · I — the revision flow. ISSUED and SUPERSEDED are terminal records. */
export function nextRevisionState(current, action) {
  const c = clean(current), a = clean(action);
  const flow = {
    DRAFT: { READY: REVISION_STATE.READY_FOR_REVIEW, VOID: REVISION_STATE.VOID },
    READY_FOR_REVIEW: { ISSUE: REVISION_STATE.ISSUED, BACK: REVISION_STATE.DRAFT, VOID: REVISION_STATE.VOID },
    ISSUED: { SUPERSEDE: REVISION_STATE.SUPERSEDED },
  };
  return (flow[c] && flow[c][a]) || null;
}

/** Freeze · I — a settlement whose source moved becomes CHANGE_DETECTED. */
export function settlementStateAfterDrift(current, hasBlockingDrift) {
  if (clean(current) === SETTLEMENT_STATE.ISSUED && hasBlockingDrift) return SETTLEMENT_STATE.CHANGE_DETECTED;
  return clean(current) || SETTLEMENT_STATE.NOT_CREATED;
}
