/* ============================================================================
   H&S WEDDING 2027 — THE DETERMINISTIC BILLING ENGINE
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · V).

   THIS IS THE ONLY PLACE A GUEST AMOUNT IS DERIVED. The same function powers
   the Draft Settlement, the Revision calculation, Confirmed Revenue and the
   Revenue Overview (Freeze · U, V). There is no second financial formula, and
   no surface downstream multiplies, rounds or re-derives an amount.

   DETERMINISTIC means: no clock, no network, no storage, no randomness. Every
   input arrives as an argument, so the same inputs always produce the same
   output and a Revision can be recomputed from its Snapshot years later.

   WHAT THE ENGINE WILL NOT DO (Freeze · AC):
     · never infer a financial value that is missing from Google — it emits
       MANUAL_REVIEW_REQUIRED instead
     · never read a display total (the G19 / G20 style "per room" or "total"
       rows) as a Standard_Rate; only Standard_Rate in the configured
       Rate_Basis is engine input (Freeze · D)
     · never invent a 50/50 room split: PER_ROOM, PER_HOLDER and FLAT items
       carry ONE Bill_To_Holder_ID for the whole item (Freeze · B)
     · never invent a cancellation charge (Freeze · F)
     · never issue, verify a payment or send anything (Freeze · Y)

   MY BAG IS NEVER AN INPUT (Freeze · A). The engine reads Confirmed Bookings
   and the Room Assignment subordinate to them. A cart line is a selection.
   ========================================================================== */

import {
  BILLING_CATEGORY, MODIFIER, RATE_BASIS, QUOTA_UNIT, RATE_STATUS, BOOKING_STATE,
  MANUAL_REVIEW_REQUIRED, ACCOUNTING_CURRENCY, DEFAULT_CHANGE_CUTOFF,
  toCents, fromCents, itemMetadataGaps, itemIsActiveOn,
} from './model.js';

/* 2.2.1 (5 Oct 2026): approved, person-scoped, unambiguous named rates only; a charge rounded once
   2.3.0 (7 Oct 2026): a booking H&S booked and paid for a guest is payable — named by a person-scoped 009 row */
export const ENGINE_VERSION = 'billing-engine/2.3.0';

/* THE BOOKING H&S PAID FOR THE GUEST (Owner, 7 Oct 2026). Where Haruthai & Suthep booked and paid a provider on a
   guest's behalf — an item the guest would otherwise settle with the provider — the guest reimburses H&S, so the line
   is payable to H&S whatever the item's own category says. Only an approved, ACTIVE 009 row that names the PERSON can
   say so, by Billing_Category GUEST_SETTLEMENT_REQUIRED; a row without that column stays exactly what it was (the
   informational self-payment rows included). The charge is the row's Rate_Per_Person_Night — the price actually paid —
   and never the catalogue's: without it the line asks for the price and the statement cannot be issued. */
const PAYABLE_BY_ROW = BILLING_CATEGORY.GUEST_SETTLEMENT_REQUIRED;
const PROVIDER_SETTLED = [BILLING_CATEGORY.GUEST_SELF_PAYMENT, BILLING_CATEGORY.GUEST_SELF_BOOKING];
export const PRICE_REQUIRED = 'PRICE REQUIRED';

const clean = (v) => String(v == null ? '' : v).trim();
const isLive = (s) => s === BOOKING_STATE.CONFIRMED || s === BOOKING_STATE.FULFILLED;

/* ------------------------------------------------------------------ rates */

/**
 * Freeze · A, F — Named Special Rates are read ONLY from 009_Special_Rates.
 * Prose in 002 is human documentation and is never machine-read after the
 * migration. The most specific ACTIVE rate wins: a rate naming the Person
 * beats a rate naming only the Holder.
 */
export function findSpecialRate(specialRates, query) {
  const m = matchSpecialRate(specialRates, query);
  return m.ambiguous ? null : m.rate;
}

/**
 * The full match: { rate, personScoped, ambiguous }. Only an APPROVED ACTIVE
 * row counts (Approved_By is what condition 3 asks for; an unapproved row is
 * never engine input, whatever the gate says). Two rows equally specific for
 * the same line are AMBIGUOUS: neither is chosen by order, the line goes to
 * review (Codex final review, 5 Oct 2026).
 */
export function matchSpecialRate(specialRates, { holderId, personId, itemId, asOf }) {
  const list = Array.isArray(specialRates) ? specialRates : [];
  const item = clean(itemId), holder = clean(holderId), person = clean(personId);
  let best = null, bestScore = -1, tie = false;

  for (const r of list) {
    if (clean(r && r.Rate_Status) !== RATE_STATUS.ACTIVE) continue;
    if (!clean(r.Approved_By)) continue;
    if (clean(r.Item_ID) !== item) continue;

    const d = clean(asOf);
    if (d) {
      const from = clean(r.Effective_From), to = clean(r.Effective_To);
      if (from && d < from) continue;
      if (to && d > to) continue;
    }

    const rPerson = clean(r.Person_ID), rHolder = clean(r.Holder_ID);
    let score;
    if (rPerson && rPerson === person) score = 2;             /* names this person */
    else if (!rPerson && rHolder && rHolder === holder) score = 1; /* names this holder */
    else continue;

    if (score > bestScore) { best = r; bestScore = score; tie = false; }
    else if (score === bestScore) tie = true;
  }
  return { rate: tie ? null : best, personScoped: !tie && bestScore === 2, ambiguous: tie };
}

/**
 * Freeze · F step 3 — the item's own standard rule. Today exactly one such
 * rule exists: SECOND_NIGHT_COMPLIMENTARY. It applies only to a nightly
 * basis, and only when no Named Special Rate has already decided the line.
 */
function payableNightsFor(item, nights) {
  if (nights == null || clean(nights) === '') return null;
  const n = Number(nights);
  if (!Number.isFinite(n) || n < 0) return null;
  const mods = Array.isArray(item.Modifiers) ? item.Modifiers.map(clean) : [];
  if (mods.includes(MODIFIER.SECOND_NIGHT_COMPLIMENTARY)) return Math.max(0, n - 1);
  return n;
}

/* ROUNDED ONCE, AT THE END (Codex final review, 5 Oct 2026). A rate is kept at
   the precision 002 / 009 state it — 109 / 3 nights is 36.33333333 — and only
   the finished charge is rounded to the cent: 36.33333333 × 3 = USD 109.00,
   never 36.33 × 3 = USD 108.99. `rateCents` stays the rounded rate for display. */
function chargeCents(rate, units) {
  if (rate == null || rate === '') return null;
  const r = typeof rate === 'number' ? rate : Number(String(rate).replace(/[, ]/g, ''));   /* parsed as toCents parses */
  const u = Number(units);
  if (!Number.isFinite(r) || !Number.isFinite(u)) return null;
  return Math.round(r * u * 100);
}

/** A 009 row that marks this person's booking as paid by H&S without counting as engine input yet. */
function pendingPaidByHS(specialRates, holderId, personId, itemId) {
  return (Array.isArray(specialRates) ? specialRates : []).some((r) => r && clean(r.Billing_Category) &&
    clean(r.Item_ID) === itemId && clean(r.Person_ID) === personId && (!clean(r.Holder_ID) || clean(r.Holder_ID) === holderId) &&
    clean(r.Rate_Status) !== RATE_STATUS.RETIRED);
}

/* --------------------------------------------------------------- one line */

/**
 * Compute ONE billing line for ONE Confirmed Booking (Person × Item).
 *
 * Returns a line whose `amountCents` is null whenever the Freeze forbids the
 * engine from deciding; `review` then carries MANUAL_REVIEW_REQUIRED and
 * `reviewReason` says exactly what is missing. An amount is never guessed.
 */
export function computeLine(booking, ctx) {
  const items = (ctx && ctx.items) || {};
  const specialRates = (ctx && ctx.specialRates) || [];
  const asOf = clean(ctx && ctx.asOf) || '';

  const itemId = clean(booking && booking.Item_ID);
  const personId = clean(booking && booking.Person_ID);
  const holderId = clean(booking && booking.Holder_ID);
  const state = clean(booking && booking.State) || BOOKING_STATE.CONFIRMED;

  const line = {
    Booking_ID: clean(booking && booking.Booking_ID) || null,
    Item_ID: itemId || null,
    Person_ID: personId || null,
    Holder_ID: holderId || null,
    Bill_To_Holder_ID: clean(booking && booking.Bill_To_Holder_ID) || holderId || null,
    Room_Unit_ID: clean(booking && booking.Room_Unit_ID) || null,
    State: state,
    Billing_Category: null,
    Rate_Basis: null,
    rateSource: null,
    rateCents: null,
    nights: null,
    payableNights: null,
    quantity: Number(booking && booking.Quantity) > 0 ? Number(booking.Quantity) : 1,
    modifiers: [],
    block: null,
    hosted: false,
    amountCents: null,
    currency: ACCOUNTING_CURRENCY,
    Change_Cutoff: null,
    Cancellation_Cutoff: null,
    review: null,
    reviewReason: null,
    note: null,
  };

  /* --- an AMENDED booking has been superseded by a new immutable id ------ */
  if (state === BOOKING_STATE.AMENDED) {
    line.block = null; line.amountCents = 0; line.rateSource = 'SUPERSEDED';
    line.note = 'superseded by the amending booking';
    return line;
  }

  /* --- the item must carry ACTIVE structured metadata (Freeze · C) ------- */
  const item = items[itemId];
  if (!item) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'no structured item metadata for ' + (itemId || '(no Item_ID)');
    return line;
  }
  const gaps = itemMetadataGaps(item);
  if (gaps.length) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'item metadata incomplete: ' + gaps.join(', ');
    return line;
  }
  /* THE RATE PRIORITY DECIDES AVAILABILITY, NOT THE OTHER WAY ROUND
   * (Owner, 5 Oct 2026). The Named Special Rate is looked up BEFORE the item's
   * own status is judged, because step 2 of the frozen priority can fully
   * determine this Person × Item charge without step 4 ever being read.
   *
   * A DRAFT item therefore stays unavailable to everyone EXCEPT the person an
   * ACTIVE 009 rate names. That is exactly the Souphattra Presidential case:
   * the suite carries no public rate and is not generally bookable, while
   * Haruthai's and Suthep's approved special rate resolves their own billing.
   * No rate is ever invented for anybody else. */
  const match = matchSpecialRate(specialRates, { holderId, personId, itemId, asOf });
  if (match.ambiguous) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'two approved special rates apply equally to this person and item; 009 must name one';
    return line;
  }
  const special = match.rate;

  /* A NON-ACTIVE ITEM OPENS ONLY TO THE PERSON A RATE NAMES. A Holder-only row
     would open a DRAFT item (the Presidential suite) to a whole party, so it
     never makes one available; it may still price an ACTIVE item. */
  if (!itemIsActiveOn(item, asOf) && !(special && match.personScoped)) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'item is not ACTIVE on ' + (asOf || 'the calculation date') +
      ' and no approved special rate names this person';
    return line;
  }

  line.Billing_Category = clean(item.Billing_Category);
  line.Rate_Basis = clean(item.Rate_Basis);
  line.modifiers = Array.isArray(item.Modifiers) ? item.Modifiers.map(clean) : [];
  line.Change_Cutoff = clean(item.Change_Cutoff) || DEFAULT_CHANGE_CUTOFF;
  line.Cancellation_Cutoff = clean(item.Cancellation_Cutoff) || null;
  line.currency = clean(item.Currency) || ACCOUNTING_CURRENCY;

  /* --- priority 1: a booking H&S paid for this person (see PAYABLE_BY_ROW) - */
  const rowCategory = special ? clean(special.Billing_Category) : '';
  /* a row that says so but does not count yet (DRAFT, unapproved, out of its dates) never lets the line fall back to
     the guest's own arrangement: the statement waits for it. A RETIRED row is a withdrawal and is read as none. */
  if (!rowCategory && pendingPaidByHS(specialRates, holderId, personId, itemId)) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'a 009 row marks this booking as paid by H&S but is not ACTIVE, approved and in date';
    return line;
  }
  if (rowCategory) {
    if (rowCategory !== PAYABLE_BY_ROW) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = '009 Billing_Category ' + rowCategory + ' is not one the engine applies (only ' + PAYABLE_BY_ROW + ')';
      return line;
    }
    if (!match.personScoped) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'a 009 Billing_Category must name the person it makes payable, not only the holder';
      return line;
    }
    if (line.Billing_Category !== PAYABLE_BY_ROW && !PROVIDER_SETTLED.includes(line.Billing_Category)) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = '009 makes a ' + (line.Billing_Category || 'category-less') + ' item payable — only an item the guest settles with the provider can become one';
      return line;
    }
    /* the row prices ONE person in the accounting currency: a whole-item basis or another currency is not its to decide */
    const basis = clean(item.Rate_Basis);
    if (basis !== RATE_BASIS.PER_PERSON_PER_NIGHT && basis !== RATE_BASIS.PER_PERSON) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = '009 makes a ' + (basis || 'basis-less') + ' item payable — a price per person cannot carry a whole-item charge';
      return line;
    }
    if (line.currency !== ACCOUNTING_CURRENCY) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = '009 makes a ' + line.currency + ' item payable — the price paid is stated in ' + ACCOUNTING_CURRENCY + ' only';
      return line;
    }
    if (line.Billing_Category !== PAYABLE_BY_ROW) line.categoryOverride = { from: line.Billing_Category };
    line.Billing_Category = PAYABLE_BY_ROW;
  }

  /* --- priority 1a: the category excludes the item outright -------------- */
  if (line.Billing_Category === BILLING_CATEGORY.EXCLUDE_FROM_GUEST_SETTLEMENT) {
    line.rateSource = 'EXCLUDED'; line.amountCents = 0; line.block = null;
    line.note = 'excluded from guest settlement';
    return line;
  }

  /* --- priority 1b: a cancelled booking (Freeze · F) --------------------- */
  if (state === BOOKING_STATE.CANCELLED) {
    if (!line.Cancellation_Cutoff) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'booking is CANCELLED and the item has no Cancellation_Cutoff';
      return line;
    }
    const cancelledAt = clean(booking && booking.Cancelled_At);
    if (!cancelledAt) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'booking is CANCELLED without a Cancelled_At date';
      return line;
    }
    if (cancelledAt.slice(0, 10) <= line.Cancellation_Cutoff.slice(0, 10)) {
      line.rateSource = 'CANCELLED_FREE'; line.amountCents = 0; line.block = null;
      line.note = 'cancelled within the free cancellation window';
      return line;
    }
    /* after the cutoff the provider may charge — the engine never invents it */
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'cancelled after Cancellation_Cutoff — the charge is not an engine decision';
    return line;
  }

  if (!isLive(state)) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'unknown booking state ' + state;
    return line;
  }

  /* --- SELECTED_GUEST_ONLY: only a person who selected it is charged ----- */
  if (line.modifiers.includes(MODIFIER.SELECTED_GUEST_ONLY) && booking && booking.Selected === false) {
    line.rateSource = 'NOT_SELECTED'; line.amountCents = 0; line.block = null;
    line.note = 'not selected by this person';
    return line;
  }

  /* --- categories that never produce an H&S charge ----------------------- */
  if (line.Billing_Category === BILLING_CATEGORY.HOSTED_NO_GUEST_CHARGE) {
    line.rateSource = 'HOSTED'; line.amountCents = 0; line.block = 'A'; line.hosted = true;
    line.note = 'hosted by Haruthai & Suthep';
    line.hostedValueCents = hostedValueOf(item, booking, line);
    return line;
  }
  if (line.Billing_Category === BILLING_CATEGORY.GUEST_SELF_PAYMENT ||
      line.Billing_Category === BILLING_CATEGORY.GUEST_SELF_BOOKING) {
    line.rateSource = line.Billing_Category; line.amountCents = 0; line.block = 'B';
    line.note = line.Billing_Category === BILLING_CATEGORY.GUEST_SELF_BOOKING
      ? 'you book and pay this yourself'
      : 'you pay this yourself on site';
    return line;
  }

  /* --- GUEST_SETTLEMENT_REQUIRED: the payable path ---------------------- */
  /* absent nights stay absent: Number(null) and Number('') are both 0, which
   * would price a nightly item at zero nights instead of asking for review */
  const rawNights = booking && booking.Nights;
  const nights = rawNights == null || clean(rawNights) === '' ? NaN : Number(rawNights);
  line.nights = Number.isFinite(nights) ? nights : null;

  /* priority 2 — a Named Special Rate overrides every standard rule, and a
   * Named Special Rate of USD 0 is a decision, not an absence (Freeze · F).
   * It was resolved above, before the item's own status was judged. */
  if (special) {
    const rateCents = toCents(special.Rate_Per_Person_Night);
    if (rateCents == null) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = rowCategory
        ? PRICE_REQUIRED + ' — the price H&S paid for this booking is not in 009 (Rate_Per_Person_Night) yet'
        : 'special rate has no Rate_Per_Person_Night';
      /* the row's own words (who paid, what the guest repays) stay with a line whose price is still asked for */
      if (rowCategory) line.specialRateRef = clean(special.Note) || clean(special.Approved_By) || 'named special rate';
      return line;
    }
    if (rowCategory && rateCents <= 0) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = PRICE_REQUIRED + ' — a price H&S paid must be above USD 0 (009 states ' + special.Rate_Per_Person_Night + ')';
      line.specialRateRef = clean(special.Note) || clean(special.Approved_By) || 'named special rate';
      return line;
    }
    const rule = clean(special.Nights_Rule);
    let payable;
    if (!rule || rule.toUpperCase() === 'ALL') payable = line.nights;
    else if (/^\d+$/.test(rule)) payable = Number(rule);
    else {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'special rate Nights_Rule is not a number or ALL: ' + rule;
      return line;
    }
    if (payable == null || !Number.isFinite(payable)) {
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'special rate needs nights and the booking carries none';
      return line;
    }
    line.rateSource = 'SPECIAL_RATE';
    line.rateCents = rateCents;
    line.payableNights = payable;
    line.specialRateRef = clean(special.Note) || clean(special.Approved_By) || 'named special rate';
    line.amountCents = chargeCents(special.Rate_Per_Person_Night, payable * line.quantity);
    line.block = 'A';
    return line;
  }

  /* priority 3 + 4 — the item's own standard rule, then Standard_Rate ----- */
  const std = toCents(item.Standard_Rate);
  if (std == null) {
    line.review = MANUAL_REVIEW_REQUIRED;
    line.reviewReason = 'item has no Standard_Rate';
    return line;
  }
  line.rateSource = 'STANDARD_RATE';
  line.rateCents = std;

  switch (line.Rate_Basis) {
    case RATE_BASIS.PER_PERSON_PER_NIGHT: {
      const payable = payableNightsFor(item, line.nights);
      if (payable == null) {
        line.review = MANUAL_REVIEW_REQUIRED;
        line.reviewReason = 'a nightly rate needs Nights on the booking';
        return line;
      }
      line.payableNights = payable;
      line.amountCents = chargeCents(item.Standard_Rate, payable * line.quantity);
      break;
    }
    case RATE_BASIS.PER_PERSON:
      line.amountCents = chargeCents(item.Standard_Rate, line.quantity);
      break;

    /* Freeze · B — ONE Bill_To_Holder_ID carries the whole item. The charge
     * is attributed once, to the designated holder, and never divided. */
    case RATE_BASIS.PER_ROOM:
    case RATE_BASIS.PER_HOLDER:
    case RATE_BASIS.FLAT:
      line.wholeItemCharge = true;
      line.amountCents = chargeCents(item.Standard_Rate, line.quantity);
      break;

    default:
      line.review = MANUAL_REVIEW_REQUIRED;
      line.reviewReason = 'unsupported Rate_Basis ' + line.Rate_Basis;
      return line;
  }
  line.block = 'A';
  return line;
}

/** Hosted value is informational only (Freeze · U) and never a guest charge. */
function hostedValueOf(item, booking, line) {
  const std = toCents(item.Standard_Rate);
  if (std == null) return null;
  if (clean(item.Rate_Basis) === RATE_BASIS.PER_PERSON_PER_NIGHT) {
    const n = Number(booking && booking.Nights);
    return Number.isFinite(n) ? std * n * line.quantity : null;
  }
  return std * line.quantity;
}

/* ------------------------------------------------- the whole-item collapse */

/**
 * Freeze · B — for PER_ROOM / PER_HOLDER / FLAT items the charge belongs to
 * the item (or the Room_Unit), not to each person in it. Several Persons can
 * share one such booking; exactly one of their lines keeps the amount and the
 * rest become zero companions, so the total can never double-count and the
 * engine never improvises a split.
 */
function collapseWholeItemCharges(lines) {
  const seen = new Map();
  for (const l of lines) {
    if (!l.wholeItemCharge || l.amountCents == null) continue;
    const key = [l.Item_ID, l.Room_Unit_ID || '', l.Bill_To_Holder_ID || ''].join('|');
    if (!seen.has(key)) { seen.set(key, l); continue; }
    l.amountCents = 0;
    l.note = 'charged once on this ' + (l.Room_Unit_ID ? 'room' : 'item');
    l.collapsedInto = seen.get(key).Booking_ID;
  }
  return lines;
}

/* ------------------------------------------------------------------ quota */

/**
 * Freeze · B, C — hotel quota is not consumed per Person. A ROOM-quota item
 * consumes one unit per distinct Room_Unit_ID; a PERSON-quota item consumes
 * one per person. The engine may calculate and enforce quota (Freeze · Y).
 */
export function quotaUsage(bookings, items) {
  const out = {};
  for (const b of Array.isArray(bookings) ? bookings : []) {
    if (!isLive(clean(b.State) || BOOKING_STATE.CONFIRMED)) continue;
    const itemId = clean(b.Item_ID);
    const item = items && items[itemId];
    if (!item) continue;
    const unit = clean(item.Quota_Unit);
    const rec = out[itemId] || (out[itemId] = {
      Item_ID: itemId, Quota_Unit: unit || null,
      Quota: Number.isFinite(Number(item.Quota)) ? Number(item.Quota) : null,
      used: 0, roomUnits: new Set(), persons: new Set(), overQuota: false,
    });
    if (unit === QUOTA_UNIT.ROOM) {
      const ru = clean(b.Room_Unit_ID);
      if (ru) rec.roomUnits.add(ru);
    } else if (unit === QUOTA_UNIT.PERSON) {
      const p = clean(b.Person_ID);
      if (p) rec.persons.add(p);
    }
  }
  for (const rec of Object.values(out)) {
    rec.used = rec.Quota_Unit === QUOTA_UNIT.ROOM ? rec.roomUnits.size : rec.persons.size;
    rec.remaining = rec.Quota == null ? null : rec.Quota - rec.used;
    rec.overQuota = rec.Quota != null && rec.used > rec.Quota;
    rec.roomUnits = [...rec.roomUnits];
    rec.persons = [...rec.persons];
  }
  return out;
}

/* ------------------------------------------------------ the one entry point */

/**
 * THE engine function (Freeze · V). Draft Settlement, Revision calculation,
 * Confirmed Revenue and the Revenue Overview all call exactly this.
 *
 * ctx = { items, specialRates, asOf, fx }
 * Returns { lines, blockA, blockB, totalPayableCents, hostedValueCents,
 *           manualReview, quota, engineVersion }
 */
export function calculate(bookings, ctx) {
  const list = Array.isArray(bookings) ? bookings : [];
  const items = (ctx && ctx.items) || {};
  const lines = collapseWholeItemCharges(list.map((b) => computeLine(b, ctx)));

  const blockA = lines.filter((l) => l.block === 'A');
  const blockB = lines.filter((l) => l.block === 'B');
  const manualReview = lines.filter((l) => l.review === MANUAL_REVIEW_REQUIRED);

  let totalPayableCents = 0;
  for (const l of blockA) if (Number.isFinite(l.amountCents)) totalPayableCents += l.amountCents;

  let hostedValueCents = 0;
  for (const l of lines) if (Number.isFinite(l.hostedValueCents)) hostedValueCents += l.hostedValueCents;

  return {
    engineVersion: ENGINE_VERSION,
    lines,
    blockA,
    blockB,
    /* Block B is informational and NEVER contributes to the H&S total (Freeze · S) */
    totalPayableCents: manualReview.length ? null : totalPayableCents,
    totalPayable: manualReview.length ? null : fromCents(totalPayableCents),
    hostedValueCents,
    manualReview,
    quota: quotaUsage(list, items),
    currency: ACCOUNTING_CURRENCY,
  };
}

/** Per-person subtotal of what a Holder owes (Freeze · B — lines stay per Person). */
export function perPerson(result) {
  const out = {};
  for (const l of (result && result.blockA) || []) {
    const p = l.Person_ID || '(unassigned)';
    const rec = out[p] || (out[p] = { Person_ID: p, lines: [], amountCents: 0 });
    rec.lines.push(l);
    if (Number.isFinite(l.amountCents)) rec.amountCents += l.amountCents;
  }
  for (const rec of Object.values(out)) rec.amount = fromCents(rec.amountCents);
  return out;
}
