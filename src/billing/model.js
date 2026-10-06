/* ============================================================================
   H&S WEDDING 2027 — GUEST SETTLEMENT · DATA MODEL FOUNDATIONS
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze).

   This module carries the identifiers and the closed vocabularies of the
   Freeze and nothing else. It holds NO rates, NO quotas and NO financial
   values: every amount the engine computes comes from the structured Google
   source at run time (Freeze · A, D). A value that is missing there is never
   inferred here.

   IDENTITY (Freeze · B). Four separate things, deliberately not merged:
     Holder_ID  — the stable billing account. One Settlement per Holder.
     Person_ID  — one travelling person.
     Account_ID — the website login object.
     Invitation code — an access credential that REFERENCES a Holder_ID.

   In the existing site these already exist under other names (src/auth.js):
   the invitation id is the holder, the guest id is the person, the bearer is
   the credential. `holderOfIdentity` / `personOfIdentity` are the only places
   that mapping is written down.
   ========================================================================== */

/* ----------------------------------------------------------- vocabularies */

/** Freeze · E — exactly one primary category per Item. */
export const BILLING_CATEGORY = Object.freeze({
  GUEST_SETTLEMENT_REQUIRED: 'GUEST_SETTLEMENT_REQUIRED',
  HOSTED_NO_GUEST_CHARGE: 'HOSTED_NO_GUEST_CHARGE',
  GUEST_SELF_PAYMENT: 'GUEST_SELF_PAYMENT',
  GUEST_SELF_BOOKING: 'GUEST_SELF_BOOKING',
  EXCLUDE_FROM_GUEST_SETTLEMENT: 'EXCLUDE_FROM_GUEST_SETTLEMENT',
});

/** Freeze · E — modifiers, additive to the primary category. */
export const MODIFIER = Object.freeze({
  SELECTED_GUEST_ONLY: 'SELECTED_GUEST_ONLY',
  SECOND_NIGHT_COMPLIMENTARY: 'SECOND_NIGHT_COMPLIMENTARY',
  EXCLUDE_FROM_DISPLAY: 'EXCLUDE_FROM_DISPLAY',
});

/** Freeze · C — the supported rate bases. Nothing else is computable. */
export const RATE_BASIS = Object.freeze({
  PER_PERSON_PER_NIGHT: 'PER_PERSON_PER_NIGHT',
  PER_PERSON: 'PER_PERSON',
  PER_ROOM: 'PER_ROOM',
  PER_HOLDER: 'PER_HOLDER',
  FLAT: 'FLAT',
});

/** Freeze · C — what one unit of quota is. */
export const QUOTA_UNIT = Object.freeze({ ROOM: 'ROOM', PERSON: 'PERSON' });

/** Freeze · C — only ACTIVE metadata is engine input. */
export const RATE_STATUS = Object.freeze({ ACTIVE: 'ACTIVE', DRAFT: 'DRAFT', RETIRED: 'RETIRED' });

/** Freeze · H */
export const BOOKING_STATE = Object.freeze({
  CONFIRMED: 'CONFIRMED', AMENDED: 'AMENDED', CANCELLED: 'CANCELLED', FULFILLED: 'FULFILLED',
});

/** Freeze · H — Holder phase. */
export const HOLDER_PHASE = Object.freeze({
  PLANNING: 'PLANNING', CONFIRMED: 'CONFIRMED', LOCKED: 'LOCKED',
  COMPLETED: 'COMPLETED', ARCHIVED: 'ARCHIVED',
});

/** Freeze · I */
export const SETTLEMENT_STATE = Object.freeze({
  NOT_CREATED: 'NOT_CREATED', OPEN: 'OPEN', ISSUED: 'ISSUED',
  CHANGE_DETECTED: 'CHANGE_DETECTED', CLOSED: 'CLOSED',
});

/** Freeze · I */
export const REVISION_STATE = Object.freeze({
  DRAFT: 'DRAFT', READY_FOR_REVIEW: 'READY_FOR_REVIEW', ISSUED: 'ISSUED',
  SUPERSEDED: 'SUPERSEDED', VOID: 'VOID',
});

/** Freeze · K */
export const ENTRY_TYPE = Object.freeze({ PAYMENT: 'PAYMENT', REFUND: 'REFUND', ADJUSTMENT: 'ADJUSTMENT' });

/** Freeze · K — only VERIFIED entries affect balances. */
export const RECORD_STATUS = Object.freeze({ REPORTED: 'REPORTED', VERIFIED: 'VERIFIED', REJECTED: 'REJECTED' });

/** Freeze · L — the approved H&S payment methods (Owner, 5 Oct 2026). There is
 *  no PayPal-USD method; SEPA is an additional option beside PayPal. */
export const PAYMENT_CHANNEL = Object.freeze({
  PROMPTPAY_THB: 'PROMPTPAY_THB', PAYPAL_EUR: 'PAYPAL_EUR', SEPA_EUR: 'SEPA_EUR',
});

/** Freeze · L, M — the currency each payment method settles in. The ONE map. */
export const CHANNEL_CURRENCY = Object.freeze({
  PROMPTPAY_THB: 'THB', PAYPAL_EUR: 'EUR', SEPA_EUR: 'EUR',
});

/** Freeze · O */
export const PAYMENT_STATUS = Object.freeze({
  NOTHING_DUE: 'NOTHING_DUE', UNPAID: 'UNPAID', PARTIAL: 'PARTIAL',
  PAID: 'PAID', OVERPAID: 'OVERPAID',
});

/** Freeze · Q */
export const EVIDENCE_STATUS = Object.freeze({ MISSING: 'MISSING', PRESENT: 'PRESENT', MISMATCH: 'MISMATCH' });

/** Freeze · Y */
export const ROLE = Object.freeze({
  GUEST: 'GUEST', BILLING_ADMIN: 'BILLING_ADMIN', ENGINE: 'ENGINE', AGENT: 'AGENT',
});

/** Freeze · X — a material unresolved issue-blocking Drift prevents Issue & Publish. */
export const DRIFT_BLOCKING = Object.freeze([
  'RATE_DRIFT', 'SPECIAL_RATE_MISMATCH', 'SETTLEMENT_MISMATCH', 'INVOICE_DRIFT',
  'QUOTA_DRIFT', 'CATEGORY_DRIFT', 'BOOKING_DRIFT', 'EVIDENCE_MISMATCH',
]);

/** Freeze · X — reported, never blocking. */
export const DRIFT_REPORT_ONLY = Object.freeze([
  'CART_DRIFT', 'EVIDENCE_MISSING', 'PAYMENT_MISMATCH',
  'PAYMENT_UNMATCHED', 'PAYMENT_CURRENCY_MISMATCH',
]);

/** Freeze · X — monitoring signals, not Drift. */
export const MONITORING = Object.freeze(['OVERDUE', 'VERIFICATION_AGING', 'OVERPAID_NO_REFUND']);

/** The single reason code the engine emits instead of inventing a number. */
export const MANUAL_REVIEW_REQUIRED = 'MANUAL_REVIEW_REQUIRED';

/** Freeze · M — accounting currency. */
export const ACCOUNTING_CURRENCY = 'USD';

/** Freeze · H — default Change_Cutoff unless an item overrides it in Google. */
export const DEFAULT_CHANGE_CUTOFF = '2026-11-30';

/** Freeze · N — absolute payment tolerance, never a percentage. */
export const PAYMENT_TOLERANCE_USD = 5;

/* ------------------------------------------------------------ identifiers */

const clean = (v) => String(v == null ? '' : v).trim();

/**
 * Freeze · B — the invitation code is a credential that REFERENCES a Holder.
 * The site's existing identity (src/auth.js · identify) carries the invitation
 * id and the guest id; this is the one place they become billing identifiers.
 */
export function holderOfIdentity(identity) {
  const v = clean(identity && identity.invitationId);
  return v || null;
}
export function personOfIdentity(identity) {
  const v = clean(identity && identity.guestId);
  return v || null;
}

/** Freeze · I — exactly one Settlement per Holder. Format per Freeze · S. */
export function settlementIdOf(holderId, sequence) {
  const h = clean(holderId);
  if (!h) return null;
  const n = Number(sequence);
  if (!Number.isInteger(n) || n < 1) return null;
  return 'HS-2027-' + String(n).padStart(4, '0');
}

/**
 * Freeze · B — Booking_ID is created per Person × Item and is IMMUTABLE.
 * An amendment never edits it in place: the old booking becomes AMENDED and a
 * NEW id is minted, which is why the generation is part of the identifier.
 */
export function bookingIdOf(holderId, personId, itemId, generation) {
  const h = clean(holderId), p = clean(personId), i = clean(itemId);
  const g = Number(generation);
  if (!h || !p || !i || !Number.isInteger(g) || g < 1) return null;
  return ['BK', h, p, i, 'g' + g].join('·');
}

/**
 * Freeze · B — ROOM-quota items consume one room per Room_Unit_ID, which
 * groups 1..Max_Pax Persons. The site's room engine (src/rooms.js) already
 * labels physical units per product key; this wraps that label as the
 * billing-side identifier so the two never diverge.
 */
export function roomUnitIdOf(itemId, unitLabel) {
  const i = clean(itemId), l = clean(unitLabel).toUpperCase();
  if (!i || !l) return null;
  return 'RU·' + i + '·' + l;
}

/* ------------------------------------------------------------ money (USD) */
/* Amounts are carried as integer cents so that a rate such as 112.5 or 167.50
 * never drifts through repeated addition. Nothing downstream re-rounds. */

export function toCents(amount) {
  if (amount == null || amount === '') return null;
  const n = typeof amount === 'number' ? amount : Number(String(amount).replace(/[, ]/g, ''));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}
export function fromCents(cents) {
  if (cents == null || !Number.isFinite(cents)) return null;
  return Math.round(cents) / 100;
}
export function formatUSD(cents) {
  const v = fromCents(cents);
  return v == null ? null : 'USD ' + v.toFixed(2);
}

/* -------------------------------------------------- metadata completeness */

/**
 * Freeze · C — "No ACTIVE structured metadata: Engine computes nothing."
 *
 * STRUCTURAL requirements only: what an Item must carry before any rate rule
 * can even be applied. Deliberately NOT included here (Owner, 5 Oct 2026):
 *
 *   · Standard_Rate — the frozen rate priority puts a Named Special Rate at
 *     step 2 and Standard_Rate at step 4. A line that an ACTIVE 009 rate fully
 *     determines must never be rejected for lacking a step-4 value it will
 *     never read. The engine therefore demands Standard_Rate at step 4, where
 *     it is actually needed, and not a moment earlier.
 *   · Rate_Status — a DRAFT item is not sellable to the public, but that is a
 *     statement about the general rate, not about a named person the Owner has
 *     already priced in 009. The engine decides availability with the special
 *     rate in hand (engine.js · computeLine), so a DRAFT item stays unavailable
 *     to everyone EXCEPT the person an ACTIVE Named Special Rate names.
 */
export function itemMetadataGaps(item) {
  const gaps = [];
  if (!item || typeof item !== 'object') return ['item'];
  if (!clean(item.Item_ID)) gaps.push('Item_ID');
  if (!BILLING_CATEGORY[clean(item.Billing_Category)]) gaps.push('Billing_Category');
  if (!RATE_BASIS[clean(item.Rate_Basis)]) gaps.push('Rate_Basis');
  if (!clean(item.Currency)) gaps.push('Currency');
  return gaps;
}

/** Freeze · C — an item is only engine input while ACTIVE and in window. */
export function itemIsActiveOn(item, isoDate) {
  if (!item || clean(item.Rate_Status) !== RATE_STATUS.ACTIVE) return false;
  const d = clean(isoDate);
  if (!d) return true;
  const from = clean(item.Effective_From), to = clean(item.Effective_To);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
