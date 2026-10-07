/* ============================================================================
   H&S WEDDING 2027 — THE AUTHENTICATED BILLING SURFACE
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL
   Owner infrastructure authorization, 4 October 2026.

   ONE entry point, `handleBilling`, mounted under /api/billing/. Every route
   here is authenticated: a guest reaches only their own Holder, and the admin
   routes resolve server-side to Haruthai and Suthep through an explicit
   allowlist (src/billing/admin.js), never through a client-supplied flag.

   WHERE THE MONEY COMES FROM. Rates, special rates, evidence and the payment
   journal are read from the Google workbook (src/billing/source.js); the
   amount itself is produced only by src/billing/engine.js. This file arranges
   and serves. It never multiplies.

   THE PAYMENT WRITE PATH IS GOOGLE OR NOTHING (Freeze · J, Owner · 1). A
   reported payment is appended directly to 008_Payment_Journal. There is no
   website-side fallback journal: if Google will not take the append, the
   guest is told plainly that it failed, and nothing is stored anywhere else.

   ISSUE & PUBLISH STAYS DISABLED until the Mandatory Activation Gate has been
   approved by a human BILLING_ADMIN (Freeze · AB). Nothing in this file can
   approve it; `gate/approve` only records who did and when.
   ========================================================================== */

import { identify, loadIndex } from './auth.js';
import { requireBillingAdmin, isBillingAdmin, roleOf, adminLabel } from './billing/admin.js';
import {
  loadItems, loadSpecialRates, loadEvidenceIndex, loadPaymentJournal,
  appendPaymentJournalRow, loadBillingConfig, resolveFx, updatePaymentVerification,
  siteProductKeyIndex, nightsGaps, nightsOfItem, sourceHash, SourceDataError,
  PAYMENT_JOURNAL_COLUMNS, loadGuestNationalities, nationalityOf, prefetchTabs, SOURCE_TAB_KEYS, loadGuestRegister,
} from './billing/source.js';
import { SNAPSHOT_COMPARISON } from './billing-ledger.js';
import { confirmationStands, writeConfirmation, CONFIRMATION_ROLE } from './confirmation.js';
import { loadBookedSelection, priceSelection, BOOKED_SOURCE } from './billing/booked.js';
import { composeStatementMail } from './mail-templates.js';
import { pricingSource, catalogueKey } from './billing/catalogue-cache.js';
import { effectivePreference, routeFor, destinationOf, firstVerifiedPayment, isChannel, PREFERENCE_SOURCE } from './billing/preference.js';
import { GoogleSheetsUnavailable } from './google-sheets.js';
import { calculate, perPerson } from './billing/engine.js';
import {
  buildSnapshot, canIssue, dueDateFor, freezeFx, inPreferredCurrency,
  paymentStatus, isDuplicateSuspect, nextRevisionState,
} from './billing/settlement.js';
import { loadConfirmedBookings, unmappedProducts, siteKeyOfSelection } from './billing/bookings.js';
import { canonicalLines } from './legacy-keys.js';
import { renderSettlementPdf } from './billing/pdf.js';
import { buildRevenueOverview } from './billing/revenue.js';
import { detectDrift, blockingOf, monitoringSignals, proposeRevisionDraft, reconciliationReport } from './billing/reconciliation.js';
import { REFERENCE_CASES, evaluateGate, runReferenceCases, GATE_NOT_RUN } from './billing/activation-gate.js';
import { PAYMENT_CHANNEL, CHANNEL_CURRENCY, RECORD_STATUS, ENTRY_TYPE, REVISION_STATE, toCents, fromCents } from './billing/model.js';

const clean = (v) => String(v == null ? '' : v).trim();
const cfgOf = (env) => ({ spreadsheetId: clean(env.SHEETS_ID) });
/* today as a UTC calendar day: the day FX is resolved for when none is given */
const utcDay = () => new Date().toISOString().slice(0, 10);
/* ONE evaluation day for every calculation (Codex final review, 5 Oct 2026):
   the day asked for when it is a real YYYY-MM-DD, otherwise today — never
   none, so a rate's effective window is always judged */
const evaluationDay = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(clean(v)) ? clean(v) : utcDay());

function jsonRes(obj, status, extra) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...(extra || {}) },
  });
}

/** The ledger answered, but not with the record its contract promises. */
class LedgerContractError extends Error {
  constructor(message) { super(message); this.name = 'LedgerContractError'; }
}

/** A source failure is always visible and never silently substituted. */
function sourceFailure(e, cors) {
  if (e instanceof LedgerContractError) {
    return jsonRes({ ok: false, error: 'the billing ledger record is unavailable or inconsistent',
      detail: clean(e.message).slice(0, 300), retry: true }, 503, cors);
  }
  const unavailable = e instanceof GoogleSheetsUnavailable || e instanceof SourceDataError;
  return jsonRes({
    ok: false,
    error: unavailable ? 'the financial source is unavailable' : 'billing source error',
    detail: clean(e && e.message).slice(0, 300),
    retry: true,
  }, 503, cors);
}

function ledger(env) {
  return env.BILLING_LEDGER ? env.BILLING_LEDGER.get(env.BILLING_LEDGER.idFromName('billing')) : null;
}
async function ledgerCall(env, op, body) {
  const stub = ledger(env);
  if (!stub) throw new Error('billing ledger unavailable');
  const res = await stub.fetch(new Request('https://billing/api/billing-ledger/' + op, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }));
  return await res.json();
}

/* ------------------------------------------- what the ledger really holds */

/* Every ledger operation answers with an envelope ({ ok, holder }, { ok, gate },
 * { ok, drift } …). These readers are the ONLY place the routes unwrap one, and
 * each checks the record before anything relies on it: a missing or malformed
 * record is an error or a closed gate, never a silent default. */

/** Freeze · AB — the STORED gate record, and whether it really is approved. */
async function readGate(env) {
  const reply = await ledgerCall(env, 'gate-read', null);
  const g = reply && reply.ok === true ? reply.gate : null;
  const record = g && typeof g === 'object' && !Array.isArray(g) ? g : null;
  return { record, approved: !!record && record.approved === true && record.issueAndPublishEnabled === true };
}

/** The ledger's holder listing — an unreadable answer is an error, never an empty operation. */
async function readHolders(env) {
  const reply = await ledgerCall(env, 'holders', null);
  if (!reply || reply.ok !== true || !Array.isArray(reply.holders)) throw new LedgerContractError('no holder listing');
  return reply.holders.filter((h) => h && typeof h === 'object' && clean(h.Holder_ID));
}

/** The drift entries of one Holder, or of the whole operation when holderId is null. */
async function readDrifts(env, holderId) {
  if (holderId) {
    const reply = await ledgerCall(env, 'drift-read', { holderId });
    const d = reply && reply.ok === true && reply.drift && typeof reply.drift === 'object' ? reply.drift : null;
    if (!d || !Array.isArray(d.drifts)) throw new LedgerContractError('no drift record for ' + holderId);
    return d.drifts;
  }
  const reply = await ledgerCall(env, 'drift-read', null);
  if (!reply || reply.ok !== true || !Array.isArray(reply.drifts)) throw new LedgerContractError('no drift listing');
  return reply.drifts.flatMap((r) => (r && Array.isArray(r.drifts) ? r.drifts : []));
}

/**
 * Freeze · I, R — the ledger's view of ONE Holder, through its `read`
 * operation. `issuedRevision` is the current ISSUED revision's immutable
 * snapshot (with its Revision_State beside it): every figure a guest or an
 * admin is shown for an issued statement — total, due date, FX — comes from
 * there and nowhere else. If the settlement names an issued revision the
 * ledger cannot produce whole, that is an error, never "nothing issued".
 */
async function holderState(env, holderId) {
  const reply = await ledgerCall(env, 'read', { holderId });
  const v = reply && reply.ok === true && reply.holder && typeof reply.holder === 'object' ? reply.holder : null;
  if (!v || clean(v.Holder_ID) !== clean(holderId)) {
    throw new LedgerContractError('the billing ledger returned no holder view for ' + holderId);
  }
  const s = v.settlement && typeof v.settlement === 'object' ? v.settlement : null;
  let issuedRevision = null;
  if (s && s.issuedRevision != null) {
    const rec = v.issued && typeof v.issued === 'object' ? v.issued : null;
    const snap = rec && rec.snapshot && typeof rec.snapshot === 'object' ? rec.snapshot : null;
    if (!snap || rec.Revision_State !== REVISION_STATE.ISSUED
        || Number(snap.Revision) !== Number(s.issuedRevision)
        || clean(snap.Settlement_ID) !== clean(s.Settlement_ID)) {
      throw new LedgerContractError('revision ' + s.issuedRevision + ' of ' + clean(s.Settlement_ID) +
        ' is named as issued but the ledger holds no matching immutable snapshot');
    }
    issuedRevision = Object.freeze({ ...snap, Revision_State: rec.Revision_State, snapshot: snap });
  }
  return {
    Holder_ID: v.Holder_ID,
    Settlement_ID: s ? s.Settlement_ID : null,
    state: v.state || null,
    settlement: s,
    latestRevision: s ? Number(s.latestRevision) || 0 : 0,
    issuedRevision,
    /* the Holder's stored payment method record (or null): see preferenceOf */
    paymentPreference: v.paymentPreference && typeof v.paymentPreference === 'object' ? v.paymentPreference : null,
    /* not held by this ledger; the booking loader uses its own defaults */
    generations: {}, overrides: {},
  };
}

/* ------------------------------------------------------------- the source */

/** Load everything the engine needs for one calculation, once — for ONE evaluation day,
    so 002's item versions are told apart by the same day the engine prices on. */
async function loadSource(env, asOf, opts) {
  /* ONE read request for the five tabs (values:batchGet · Owner, 6 Oct 2026). The
     prefetched grids serve these five loaders only and never leave this function:
     `cfg` below is the plain configuration, so every later read — above all the
     check before a payment decision is written — goes to Google again (round 7). */
  const base = { ...cfgOf(env), asOf: evaluationDay(asOf) };
  /* the admin console's guest view reads the 006 register in the SAME batch request (names, nationality) */
  const withRegister = !!(opts && opts.register);
  const pre = await prefetchTabs(env, base, withRegister ? [...SOURCE_TAB_KEYS, 'guestlist'] : SOURCE_TAB_KEYS);
  const [items, specialRates, evidenceRows, journalRows, configRows] = await Promise.all([
    loadItems(env, pre), loadSpecialRates(env, pre), loadEvidenceIndex(env, pre),
    loadPaymentJournal(env, pre), loadBillingConfig(env, pre),
  ]);
  const cfg = base;
  /* the two integration checks the Owner made gate conditions (5 Oct 2026) */
  const { duplicates } = siteProductKeyIndex(items);
  const register = withRegister ? await loadGuestRegister(env, pre) : null;
  return {
    cfg, items, specialRates, evidenceRows, journalRows, configRows,
    siteKeyDuplicates: duplicates,
    nightsGaps: nightsGaps(items),
    ...(register ? { register, nationalities: nationalitiesOf(register) } : {}),
  };
}

/* the 006 register as the payment route reads it: one Nationality per ID, an ID on two rows ambiguous */
function nationalitiesOf(register) {
  const out = {};
  for (const [id, r] of Object.entries(register || {})) out[id] = r && r.ambiguous ? { ambiguous: true } : clean(r && r.nationality);
  return out;
}

/** The gaps that block an issue, named rather than filled. */
function sourceGapsOf(src) {
  const gaps = [];
  for (const d of src.siteKeyDuplicates || []) {
    gaps.push('SITE_PRODUCT_KEY ambiguous: ' + d.Site_Product_Key + ' → ' + (d.Item_IDs || []).join(' / '));
  }
  for (const id of src.nightsGaps || []) gaps.push('Number of Nights missing or unusable for ' + id);
  return gaps;
}

/**
 * The person a Holder's own bookings are read for, when the caller is not that
 * guest (the admin views). Taken from the authentication index the Worker
 * already trusts: exactly one entry must carry this Holder_ID, otherwise the
 * settlement is not computed at all — a Holder priced as "nobody" would
 * otherwise come out at USD 0.
 */
async function holderIdentity(env, origin, holderId) {
  const entries = await loadIndex(env, origin, false);
  const hits = Object.values(entries || {}).filter((e) => e && clean(e.i) === holderId && clean(e.g));
  if (hits.length !== 1) {
    throw new SourceDataError('HOLDER_PERSON', 'Holder ' + holderId + ' resolves to ' + hits.length +
      ' persons in the authentication index; its settlement is not computed on a guess');
  }
  return { invitationId: holderId, guestId: clean(hits[0].g), partyId: hits[0].p || null, hosts: hits[0].h === 1,
    contactId: clean(hits[0].c) || null };
}

/**
 * THE PAYMENT METHOD IN FORCE for one Holder (Owner, 5 Oct 2026 · Freeze · L).
 * The ledger's stored method wins; without one, the approved routing decides
 * (the couple by role, an explicit Owner decision, else the Nationality the
 * guest register 006 holds for the person this invitation names). `locked` is
 * true from the first VERIFIED payment of the settlement in 008 on, whether
 * or not the ledger has recorded that lock yet.
 */
async function preferenceOf(env, origin, holderId, state, src, register) {
  const who = await holderIdentity(env, origin, holderId);
  const reg = register || await loadGuestNationalities(env, src.cfg);
  const route = routeFor({ holderId, nationality: nationalityOf(reg, who.contactId) });
  const pref = effectivePreference({ record: state.paymentPreference, route });
  const verified = firstVerifiedPayment(src.journalRows, state.Settlement_ID);
  return {
    ...pref,
    locked: pref.locked || !!verified,
    lockedBy: (state.paymentPreference && state.paymentPreference.lockedBy) || (verified ? clean(verified.Payment_ID) : null),
    verifiedPaymentId: verified ? clean(verified.Payment_ID) : null,
  };
}

/* what a guest or an admin is told about the method — reasons, never the register's words */
const preferenceView = (pref, issued, env) => ({
  Payment_Preference: pref.channel, currency: pref.currency, source: pref.source,
  determined: pref.determined, reviewRequired: !pref.determined, reason: pref.reason,
  route: pref.route || null, basis: pref.basis || null,
  /* the methods this Holder may pick, each with where its money goes */
  options: (pref.options || []).map((c) => destinationOf(c, env)),
  destination: pref.channel ? destinationOf(pref.channel, env) : null,
  locked: pref.locked, lockedBy: pref.lockedBy || null,
  /* the method the current issued statement was issued with — fixed in its snapshot */
  issuedWith: issued ? issued.Payment_Preference || null : null,
  issuedCurrency: issued ? issued.Payment_Currency || null : null,
  issuedRecipient: issued ? issued.Payment_Recipient || null : null,
});

/** The engine result for one Holder — the ONE calculation path (Freeze · V). `assume` is the admin console's what-if
    only (loadConfirmedBookings): never passed on an issue. */
async function calculateHolder(env, identity, holderId, src, asOf, origin, assume) {
  if (!clean(identity && identity.guestId)) identity = await holderIdentity(env, origin, holderId);
  const state = await holderState(env, holderId);
  const bookings = await loadConfirmedBookings({
    env, identity, holderId, items: src.items,
    generations: (state && state.generations) || {},
    overrides: (state && state.overrides) || {},
    ...(assume ? { assume } : {}),
  });
  const result = calculate(bookings, { items: src.items, specialRates: src.specialRates, asOf: evaluationDay(asOf) });
  return { state, bookings, result, unmapped: unmappedProducts(bookings),
    confirmation: (bookings && bookings.confirmation) || { state: 'NONE' } };
}

/* ------------------------------------------------------------------ guest */

async function guestSettlement(env, identity, url, cors) {
  const holderId = clean(identity.invitationId);
  /* MY PROFILE'S STATEMENT asks first whether a statement exists at all
     (Owner, 6 Oct 2026). Until one is issued the ledger alone answers: no
     Google read, no draft figure — a draft is not a statement. */
  if (url.searchParams.get('view') === 'statement') {
    const held = await holderState(env, holderId);
    if (!held.issuedRevision) return jsonRes({ ok: true, issued: false, Settlement_ID: null, revision: null }, 200, cors);
  }
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await loadSource(env, asOf);
  const { state, result, unmapped, confirmation } = await calculateHolder(env, identity, holderId, src, asOf);

  const settlementId = state && state.Settlement_ID;
  const issued = state.issuedRevision;
  /* AN ISSUED STATEMENT CONVERTS ONLY WITH ITS OWN FROZEN FX (Freeze · M, R).
   * Today's 011 rate is never applied to it. Only while nothing is issued is
   * the currently effective approved rate used, as a preview. */
  const fx = issued
    ? freezeFx({ FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR })
    : freezeFx(resolveFx(src.configRows, asOf || utcDay()));
  const fxSource = issued ? 'ISSUED_REVISION' : 'CURRENT_PREVIEW';

  /* Freeze · O — Soll is the current valid ISSUED revision, never the draft. */
  const sollCents = issued ? issued.Total_Payable_Cents : null;
  const dueDate = issued ? issued.Due_Date : null;
  const pay = paymentStatus({
    sollCents, journalRows: src.journalRows, settlementId, today: asOf, dueDate,
  });

  /* the method in force; when it cannot be determined nothing is converted and
     the guest is told a review is pending — never a silent PayPal default */
  const pref = await preferenceOf(env, url.origin, holderId, state, src);
  const channel = pref.channel;
  return jsonRes({
    ok: true,
    issued: !!issued,
    Settlement_ID: settlementId || null,
    revision: issued ? issued.Revision : null,
    state: state ? state.state : null,
    /* Block A is payable, Block B is informational and never summed in (Freeze · S) */
    blockA: result.blockA, blockB: result.blockB,
    perPerson: perPerson(result),
    draftTotal: result.totalPayable,
    issuedTotal: issued ? fromCents(issued.Total_Payable_Cents) : null,
    hostedValue: fromCents(result.hostedValueCents),
    manualReview: result.manualReview.map((l) => l.reviewReason),
    unmappedProducts: unmapped,
    /* the figures stand only on the trip Guest Relations confirmed (Freeze · A) — the state, never who confirmed it */
    bookingConfirmation: confirmation ? { state: confirmation.state, version: confirmation.version ?? null, confirmedAt: confirmation.confirmedAt || null } : confirmation,
    payment: pay,
    Payment_Preference: channel,
    paymentPreference: preferenceView(pref, issued, env),
    amountInPreferredCurrency: channel ? inPreferredCurrency(pay.balanceCents, channel, fx) : null,
    fx: { source: fxSource, revision: issued ? issued.Revision : null,
      FX_USD_THB: fx.FX_USD_THB, FX_USD_EUR: fx.FX_USD_EUR, gaps: fx.gaps },
    dueDate,
    /* the issue date of the current statement, from its own frozen snapshot */
    issueDate: issued ? issued.Issue_Date || null : null,
    wording: 'settled within 21 days after your statement is issued',
    pdf: issued ? '/api/billing/pdf?rev=' + issued.Revision : null,
  }, 200, cors);
}

/**
 * Freeze · J — the guest's "I have paid". Authenticated, the Holder is
 * resolved server-side, and the row is appended straight into Google 008.
 */
async function reportPayment(env, identity, request, cors) {
  const body = await request.json().catch(() => null);
  if (!body) return jsonRes({ ok: false, error: 'invalid body' }, 400, cors);

  const holderId = clean(identity.invitationId);
  const src = await loadSource(env);
  const state = await holderState(env, holderId);
  const settlementId = state.Settlement_ID;
  if (!settlementId) return jsonRes({ ok: false, error: 'no settlement for this holder' }, 409, cors);

  const method = clean(body.Method);
  if (!PAYMENT_CHANNEL[method]) return jsonRes({ ok: false, error: 'unknown payment method' }, 400, cors);
  const amountPaid = Number(body.Amount_Paid);
  if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
    return jsonRes({ ok: false, error: 'an amount is required' }, 400, cors);
  }

  const reportedAt = new Date().toISOString();
  const issued = state.issuedRevision || null;
  const fx = issued ? { FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR }
                    : freezeFx(resolveFx(src.configRows, reportedAt.slice(0, 10)));

  /* The guest pays in their own currency; the journal also carries the USD
   * figure, converted with the revision's FROZEN rate (Freeze · M). */
  let amountUsd = null;
  /* the method decides the currency (Freeze · L, M): PromptPay is THB, PayPal is EUR, SEPA is EUR */
  const currencyPaid = CHANNEL_CURRENCY[method];
  if (clean(body.Currency_Paid) && clean(body.Currency_Paid).toUpperCase() !== currencyPaid) {
    return jsonRes({ ok: false, error: method + ' settles in ' + currencyPaid + ', not ' + clean(body.Currency_Paid) }, 400, cors);
  }
  if (currencyPaid === 'USD') amountUsd = amountPaid;
  else if (currencyPaid === 'THB' && Number(fx.FX_USD_THB)) amountUsd = amountPaid / Number(fx.FX_USD_THB);
  else if (currencyPaid === 'EUR' && Number(fx.FX_USD_EUR)) amountUsd = amountPaid / Number(fx.FX_USD_EUR);
  /* NO RATE, NO ROW. The financial payload of a 008 row is immutable once
     appended and the balance counts Amount_USD only, so a row without its
     accounting amount could never be repaired or counted. Nothing is appended
     until an approved rate converts it; the guest is told so. */
  if (amountUsd == null || !Number.isFinite(amountUsd) || amountUsd <= 0) {
    return jsonRes({ ok: false, recorded: null, retry: true,
      error: 'your payment could not be recorded yet: no approved ' + currencyPaid + ' rate is in force to convert it; please try again later or contact Guest Relations',
      reasons: ['FX_UNAVAILABLE: ' + ((fx.gaps || []).join('; ') || currencyPaid)] }, 409, cors);
  }

  const candidate = {
    Settlement_ID: settlementId, Method: method,
    Amount_Paid: amountPaid, Reported_At: reportedAt,
  };
  /* Freeze · J — a duplicate is STILL appended, only flagged. Never deduplicated. */
  const duplicate = isDuplicateSuspect(candidate, src.journalRows);

  const row = {
    Payment_ID: 'PAY-' + settlementId + '-' + reportedAt.replace(/[^0-9]/g, ''),
    Settlement_ID: settlementId,
    Holder_ID: holderId,
    Revision_Ref: issued ? 'V' + issued.Revision : '',
    Entry_Type: ENTRY_TYPE.PAYMENT,
    Method: method,
    Amount_Paid: amountPaid,
    Currency_Paid: currencyPaid,
    Amount_USD: amountUsd == null ? '' : Math.round(amountUsd * 100) / 100,
    Reported_By: holderId,
    Reported_At: reportedAt,
    Provider_Reference: clean(body.Provider_Reference).slice(0, 120),
    Evidence: '',
    Verified_By: '', Verified_At: '',
    Record_Status: RECORD_STATUS.REPORTED,
    Reject_Reason: '',
    Duplicate_Suspect: duplicate ? 'TRUE' : 'FALSE',
  };

  /* Google or nothing (Owner · 1). A failure is visible and stored nowhere. */
  await appendPaymentJournalRow(env, src.cfg, row);

  return jsonRes({
    ok: true, recorded: RECORD_STATUS.REPORTED,
    Payment_ID: row.Payment_ID, Duplicate_Suspect: duplicate,
    note: 'Guest Relations verifies every reported payment; only a VERIFIED entry changes your balance.',
  }, 200, cors);
}

/**
 * THE CATALOGUE QUOTE (Owner · 4). The guest area has to show what a product
 * would cost BEFORE it is booked. That is still a financial rule, so it is
 * still decided here: the engine prices a prospective booking for this very
 * person from the same 002 metadata and the same 009 special rates. The
 * browser receives finished amounts and only formats them, which is why
 * assets/pricing.js can stop multiplying without a second engine appearing.
 */
/** ONE prospective booking of one Item for this person, priced by the one engine — never stored. */
function quoteOfItem(itemId, item, src, holderId, personId, asOf) {
  const nights = nightsOfItem(item) ?? NaN;
  const probe = [{
    Booking_ID: null, Holder_ID: holderId, Person_ID: personId, Item_ID: itemId,
    Bill_To_Holder_ID: holderId, State: 'CONFIRMED',
    Nights: Number.isFinite(nights) ? nights : null, Quantity: 1, Selected: true,
  }];
  const r = calculate(probe, { items: src.items, specialRates: src.specialRates, asOf });
  const line = r.lines[0] || null;
  return {
    Item_ID: itemId,
    Billing_Category: line && line.Billing_Category,
    Rate_Basis: line && line.Rate_Basis,
    rateSource: line && line.rateSource,
    ratePerNight: line && line.rateCents != null ? fromCents(line.rateCents) : null,
    nights: Number.isFinite(nights) ? nights : null,
    payableNights: line ? line.payableNights : null,
    total: line && line.amountCents != null ? fromCents(line.amountCents) : null,
    block: line ? line.block : null,
    hosted: !!(line && line.hosted),
    manualReview: line && line.review ? line.reviewReason : null,
  };
}
const keysOfItem = (item) => clean(item && item.Site_Product_Key).split(/[,|]/).map(clean).filter(Boolean);

/** The shared pricing source — held about a minute (catalogue-cache.js) unless `fresh`. */
function pricing(env, asOf, fresh) {
  return pricingSource(catalogueKey(env.SHEETS_ID, asOf), () => loadSource(env, asOf), { fresh: !!fresh });
}

async function catalogueQuotes(env, identity, url, cors) {
  const holderId = clean(identity.invitationId);
  const personId = clean(identity.guestId);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  /* the SHARED pricing source (002 + 009, the same for every guest, held ~60 s);
     this guest's own quotes are computed from it here, per request, and never held */
  const src = await pricing(env, asOf, false);

  const out = {};
  /* a key two items claim is never priced by either (Codex round 7): no amount, named as such */
  const ambiguous = new Set(siteProductKeyIndex(src.items).duplicates.map((d) => clean(d.Site_Product_Key)));
  for (const [itemId, item] of Object.entries(src.items)) {
    const keys = keysOfItem(item);
    if (!keys.length) continue;
    const quote = quoteOfItem(itemId, item, src, holderId, personId, asOf);
    for (const k of keys) {
      out[k] = ambiguous.has(k)
        ? { Item_ID: null, total: null, block: null, rateSource: null, hosted: false, manualReview: 'AMBIGUOUS_SITE_PRODUCT_KEY' }
        : quote;
    }
  }
  return jsonRes({ ok: true, asOf, quotes: out, engine: 'server',
    source: { at: new Date(src.at).toISOString(), cached: src.cached, stale: src.stale } }, 200, cors);
}

/**
 * THE AUTHORITATIVE CHECK BEFORE A TRIP IS SENT (Owner, 6 Oct 2026). The browser
 * may show amounts it holds for a few minutes; it never sends on them. Review &
 * Send posts the lines it is about to send, and this route prices every line the
 * server prices from a FRESH read of the source (never the held catalogue, never
 * stale), for this very guest. Any difference, or no answer, refuses the send.
 * Lines the server does not price (block B, or not in 002) are not its to check.
 */
async function validateSelections(env, identity, request, url, cors) {
  const body = await request.json().catch(() => null);
  const lines = body && Array.isArray(body.selections) ? body.selections.slice(0, 200) : null;
  if (!lines) return jsonRes({ ok: false, error: 'selections required' }, 400, cors);
  const holderId = clean(identity.invitationId);
  const personId = clean(identity.guestId);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await pricing(env, asOf, true);
  const { index, duplicates } = siteProductKeyIndex(src.items);
  /* A KEY TWO ITEMS CLAIM IS NOT "NOT THE SERVER'S" (Codex round 7): it is a product
     the server cannot price unambiguously, so a trip that carries one is not sent
     until 002 is corrected — never waved through unchecked. */
  const ambiguous = new Set(duplicates.map((d) => clean(d.Site_Product_Key)));
  const blocked = lines.filter((l) => l && typeof l === 'object' && !l.interest && ambiguous.has(siteKeyOfSelection(l))).map(siteKeyOfSelection);
  if (blocked.length) {
    return jsonRes({ ok: false, error: 'a selected product maps to more than one 002 item; Guest Relations corrects 002 first',
      ambiguous: [...new Set(blocked)] }, 409, cors);
  }

  const cents = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
  const mismatches = [], quotes = {};
  let checked = 0;
  for (const l of lines) {
    if (!l || typeof l !== 'object' || l.interest) continue;
    const key = siteKeyOfSelection(l);
    const itemId = key ? index[key] : null;
    if (!itemId) continue;
    const q = quoteOfItem(itemId, src.items[itemId], src, holderId, personId, asOf);
    if (q.block === 'B') continue;
    quotes[key] = q;
    checked++;
    const sent = cents(l.price), server = cents(q.total);
    if (sent !== server) mismatches.push({ key, sent: sent == null ? null : sent / 100, server: server == null ? null : server / 100 });
  }
  return jsonRes({ ok: true, valid: mismatches.length === 0, checked, mismatches, quotes, asOf,
    source: { at: new Date(src.at).toISOString(), fresh: true } }, 200, cors);
}

/* ------------------------------------------------------- private documents */

const QR_KEYS = {
  PROMPTPAY_THB: 'billing/qr/promptpay-thb.jpg',
  /* the existing approved PayPal code, byte-identical. It carries no currency and
     no amount (a PayPal app link to Suthep's account), so it serves the EUR route
     as it is: the currency comes from the method (CHANNEL_CURRENCY), never from
     the image (Owner, 5 Oct 2026). The "usd" in its earlier file name was
     legacy naming only. */
  PAYPAL_EUR: 'billing/qr/paypal-eur.png',
};

/** Owner · 5 — the approved QR, byte-identical, from private R2, never public. */
async function serveQr(env, identity, url, cors) {
  const channel = clean(url.searchParams.get('channel')).toUpperCase();
  const key = QR_KEYS[channel];
  if (!key) return jsonRes({ ok: false, error: 'unknown payment channel' }, 400, cors);
  if (!env.DOCS) return jsonRes({ ok: false, error: 'document store unavailable' }, 503, cors);

  const obj = await env.DOCS.get(key);
  if (!obj) {
    return jsonRes({ ok: false, error: 'the approved payment code has not been uploaded yet', key }, 404, cors);
  }
  return new Response(obj.body, {
    headers: {
      'content-type': channel === 'PROMPTPAY_THB' ? 'image/jpeg' : 'image/png',
      'cache-control': 'private, no-store',
      ...(cors || {}),
    },
  });
}

/** Owner · 6 — the issued PDF, immutable, versioned, never overwritten. */
function pdfKey(settlementId, revision) {
  return 'settlements/' + settlementId + '/V' + revision + '.pdf';
}

/* THE ISSUED PDF, as its write-once R2 object: rendered ONCE from the immutable snapshot on its first read and never
   re-rendered after that. The download (servePdf) and the statement email (admin/send) read this same object. */
async function issuedPdf(env, holderId, askedRevision) {
  const state = await holderState(env, holderId);
  const settlementId = state.Settlement_ID;
  if (!settlementId) return { status: 404, error: 'no settlement' };
  const rev = Number(askedRevision) || (state.issuedRevision && state.issuedRevision.Revision);
  if (!rev) return { status: 404, error: 'no issued revision' };
  if (!env.DOCS) return { status: 503, error: 'document store unavailable' };
  const key = pdfKey(settlementId, rev);
  let obj = await env.DOCS.get(key);
  if (!obj) {
    const view = await ledgerCall(env, 'read', { holderId, revision: rev });
    const one = view && view.ok === true && view.holder ? view.holder.revision : null;
    const snapshot = one && one.snapshot && Number(one.snapshot.Revision) === rev ? one.snapshot : null;
    if (!snapshot) return { status: 404, error: 'no snapshot for that revision' };
    const bytes = renderSettlementPdf(snapshot, {});
    await env.DOCS.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
    obj = await env.DOCS.get(key);
    if (!obj) return { status: 503, error: 'the statement could not be stored' };
  }
  return { obj, settlementId, revision: rev };
}

async function servePdf(env, identity, url, cors) {
  const admin = isBillingAdmin(identity);
  const askedHolder = clean(url.searchParams.get('holder'));
  const holderId = admin && askedHolder ? askedHolder : clean(identity.invitationId);
  const pdf = await issuedPdf(env, holderId, url.searchParams.get('rev'));
  if (!pdf.obj) return jsonRes({ ok: false, error: pdf.error }, pdf.status || 404, cors);
  return new Response(pdf.obj.body, {
    headers: { 'content-type': 'application/pdf', 'cache-control': 'private, no-store', ...(cors || {}) },
  });
}

/* ------------------------------------------------------------------ admin */

async function adminHolders(env, identity, url, cors) {
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await loadSource(env, asOf);
  const list = { holders: await readHolders(env) };
  const register = await loadGuestNationalities(env, src.cfg);
  const holders = [];
  for (const h of (list && list.holders) || []) {
    const id = clean(h.Holder_ID);
    const { state, result } = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, url.origin);
    const issued = state && state.issuedRevision;
    const pay = paymentStatus({
      sollCents: issued ? issued.Total_Payable_Cents : null,
      journalRows: src.journalRows, settlementId: state && state.Settlement_ID,
      today: asOf, dueDate: issued ? issued.Due_Date : null,
    });
    const drifts = await readDrifts(env, id);
    holders.push({
      Holder_ID: id, Settlement_ID: state && state.Settlement_ID,
      state: state && state.state, revision: issued ? issued.Revision : null,
      draftTotal: result.totalPayable,
      issuedTotal: issued ? fromCents(issued.Total_Payable_Cents) : null,
      payment: pay, dueDate: issued ? issued.Due_Date : null,
      drift: drifts,
      manualReview: result.manualReview.length,
      /* the method in force, and whether a BILLING_ADMIN has to state it */
      paymentPreference: preferenceView(await preferenceOf(env, url.origin, id, state, src, register), issued, env),
    });
  }
  return jsonRes({ ok: true, audience: adminLabel(identity), holders }, 200, cors);
}

/* what an engine result says, line by line — to tell whether a stored draft is
   still the engine's answer on the current source (no amount is computed here) */
function resultFingerprint(result) {
  if (!result || !Array.isArray(result.lines)) return null;
  const lines = result.lines.map((l) => [l.Booking_ID, l.Person_ID, l.Item_ID, l.Bill_To_Holder_ID,
    l.rateSource, l.rateCents, l.payableNights, l.amountCents, l.block, l.review || null].map((v) => (v == null ? '' : String(v))).join('|'));
  return JSON.stringify({ lines: lines.sort(), total: result.totalPayableCents ?? null,
    review: (result.manualReview || []).length, engine: result.engineVersion || null });
}

/**
 * Issue & Publish (Freeze · I, R, AB) — ONE contract, ONE issuer.
 *
 * This route only assembles the authoritative inputs from Google; the ledger
 * (revision-issue) takes the decision and builds and freezes the snapshot
 * itself, from the revision's own stored engine result and the exact FX pair
 * it was handed and checked. No snapshot is ever built here.
 *
 *   · body.revision given — that stored READY_FOR_REVIEW revision is issued as
 *     it stands (an issued one is refused as immutable by the ledger);
 *   · otherwise — the Settlement is allocated if needed, a revision is created
 *     from the engine's result for `asOf`, readied by this BILLING_ADMIN and
 *     issued. The same canIssue decision is asked first, so a blocked issue
 *     leaves no revision behind; the ledger asks it again before it writes.
 */
/* a value as canonical JSON — object keys sorted at every depth — so two equal proposals hash equally */
const stableJson = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.keys(x).sort().reduce((o, kk) => { o[kk] = x[kk]; return o; }, {}) : x));
async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* why a statement waits for the booking — said to the BILLING_ADMINs, who can confirm it themselves (Owner, 7 Oct 2026) */
const CONFIRMATION_WORDS = Object.freeze({
  NONE: 'the guest has not submitted this trip yet',
  UNCONFIRMED: 'waiting for confirmation — Haruthai or Suthep can confirm this submitted booking (Confirm booking)',
  LAPSED: 'the guest sent a newer version after the confirmation — Haruthai or Suthep can confirm the new submitted booking (Confirm booking)',
});

/**
 * WHAT AN ISSUE WOULD DO, NOW — read-only (Owner, 7 Oct 2026 · admin console · Codex plan review).
 *
 * ONE assessment for the console's Preview and for Issue & Publish, so the two can never judge differently. It
 * assembles exactly what adminIssue hands the ledger — FX for the day, the source gaps, the gate re-check inputs,
 * the drift on the current source — and judges it the way the ledger's revision-issue will: the stored entries that
 * compare with an OLDER snapshot do not block, the gate is evaluated again on these inputs (condition 5 stays the
 * stored human approval), canIssue decides. Nothing is written.
 *
 * `proposalHash` binds the WHOLE statement this issue would freeze — the snapshot built by the same buildSnapshot the
 * ledger uses (every line field, the rate references, FX, the payment method, the issue and due date, the source hash),
 * less the ids the ledger allocates, plus the confirmed version of the trip. Issue refuses PREVIEW_CHANGED unless the
 * console confirms this very hash: what was previewed is what is issued.
 */
async function assessIssue(env, holderId, src, asOf, origin, opts) {
  const o = opts || {};
  /* THE WHAT-IF of the confirmation dialog (admin/confirm GET): the sent version as if confirmed — never issued from */
  const assume = Number.isInteger(o.assumeConfirmedVersion) ? { version: o.assumeConfirmedVersion } : null;
  const fx = freezeFx(resolveFx(src.configRows, asOf));
  const sourceGaps = sourceGapsOf(src);
  const state = await holderState(env, holderId);
  const pref = await preferenceOf(env, origin, holderId, state, src, src.nationalities || undefined);
  const destination = pref.channel ? destinationOf(pref.channel, env) : null;
  const current = await calculateHolder(env, { invitationId: holderId, guestId: null }, holderId, src, asOf, origin, assume);
  const inputs = gateInputs(src, asOf);
  const gateCheck = { caseResults: inputs.caseResults, siteKeyDuplicates: inputs.siteKeyDuplicates, nightsGaps: inputs.nightsGaps };
  const currentDrifts = detectDrift({
    snapshot: null, result: current.result,
    items: src.items, specialRates: src.specialRates, bookings: current.bookings,
    evidenceRows: src.evidenceRows, journalRows: src.journalRows, cartLines: [], asOf, holderId,
    settlementId: current.state.Settlement_ID || null,
  }).map((d) => ({ code: d.code, detail: d.detail || d.message || '' }));
  /* the ledger's own drift treatment (billing-ledger.js · revision-issue) */
  const drifts = [...(await readDrifts(env, holderId)).filter((d) => !SNAPSHOT_COMPARISON.includes(clean(d && d.code))),
    ...currentDrifts.map((d) => ({ code: clean(d.code), resolved: false, detail: clean(d.detail).slice(0, 300) }))];
  const gate = await readGate(env);
  const gateNow = gate.approved ? evaluateGate({
    caseResults: gateCheck.caseResults, drifts, specialRates: src.specialRates, items: src.items,
    approval: gate.record && gate.record.approval, fx,
    siteKeyDuplicates: gateCheck.siteKeyDuplicates, nightsGaps: gateCheck.nightsGaps,
  }) : null;
  const gateApproved = gate.approved && !!gateNow && gateNow.approved === true;
  const verdict = canIssue({ result: current.result, drifts, activationGateApproved: gateApproved, fx, sourceGaps });

  const reasons = [];
  if (!pref.determined) reasons.push('PAYMENT_PREFERENCE_UNDETERMINED: ' + pref.reason + ' — a BILLING_ADMIN states the method first');
  else if (!destination || !destination.complete) reasons.push('PAYMENT_DESTINATION_INCOMPLETE: ' + pref.channel + ' has no configured account');
  const confirmation = current.confirmation || { state: 'NONE' };
  if (confirmation.state !== 'CONFIRMED') reasons.push('BOOKING_NOT_CONFIRMED: ' + (confirmation.state || 'NONE') + ' — ' + (CONFIRMATION_WORDS[confirmation.state] || CONFIRMATION_WORDS.NONE));
  if (!verdict.allowed) reasons.push(...verdict.reasons);
  if (gateNow && !gateNow.approved) reasons.push(...gateNow.open.map((o) => 'GATE_NOW: ' + o));

  const hash = await sourceHash({ items: src.items, specialRates: src.specialRates });
  const proposal = pref.channel ? buildSnapshot({
    settlementId: null, revision: null, holderId, result: current.result,
    items: src.items, specialRates: src.specialRates, fx, issueDate: asOf, dueDateOverride: clean(o.dueDateOverride),
    evidenceStatus: clean(o.evidenceStatus), sourceHash: hash, calculatedAt: null, paymentPreference: pref.channel,
  }) : null;
  /* NOTHING NEW, NOTHING ISSUED (review, 7 Oct 2026): a revision whose substance is exactly the issued one's would only
     supersede it with itself — and be e-mailed as a new statement */
  const issuedNow = state.issuedRevision || null;
  const substance = (x) => (x ? stableJson({ lines: x.lines, total: x.Total_Payable_Cents, method: x.Payment_Preference,
    fx: [x.FX_USD_THB, x.FX_USD_EUR], blockB: x.Block_B_Informational, hosted: x.Hosted_Value_Cents }) : null);
  if (issuedNow && proposal && substance(proposal) === substance(issuedNow)) {
    reasons.push('NO_CHANGE: revision ' + issuedNow.Revision + ' already holds exactly this statement');
  }
  /* the hash binds the statement AND the settlement it was previewed on: after any issue or new revision it no longer
     matches, so one preview issues at most once */
  const proposalHash = proposal && !confirmation.assumed
    ? await sha256Hex(stableJson({ proposal: { ...proposal, calculated_at: null }, confirmedVersion: confirmation.version ?? null,
      settlement: { id: state.Settlement_ID || null, latestRevision: Number(state.latestRevision) || 0, issuedRevision: issuedNow ? issuedNow.Revision : null } }))
    : null;
  return {
    asOf, fx, sourceGaps, state, pref, destination, current, confirmation, gateCheck, currentDrifts, drifts,
    gate: { stored: gate.approved, now: gateNow ? { approved: gateNow.approved, open: gateNow.open || [] } : null },
    allowed: reasons.length === 0, reasons, proposal, proposalHash, sourceHash: hash,
  };
}

/**
 * Issue & Publish (Freeze · I, R, AB) — ONE contract, ONE issuer.
 *
 * This route only assembles the authoritative inputs from Google; the ledger
 * (revision-issue) takes the decision and builds and freezes the snapshot
 * itself, from the revision's own stored engine result and the exact FX pair
 * it was handed and checked. No snapshot is ever built here.
 *
 *   · body.revision given — that stored READY_FOR_REVIEW revision is issued as
 *     it stands (an issued one is refused as immutable by the ledger);
 *   · otherwise — the Settlement is allocated if needed, a revision is created
 *     from the engine's result for `asOf`, readied by this BILLING_ADMIN and
 *     issued. The same assessment the console previewed is asked first
 *     (assessIssue), so a blocked issue leaves no revision behind; the ledger
 *     asks again before it writes.
 *   · body.expectedProposal (the console always sends it) — the hash of the
 *     previewed statement; anything else is refused PREVIEW_CHANGED.
 */
async function adminIssue(env, identity, request, cors) {
  const body = await request.json().catch(() => null);
  const holderId = clean(body && body.holderId);
  if (!holderId) return jsonRes({ ok: false, error: 'holderId required' }, 400, cors);

  const asOf = clean(body.asOf) || utcDay();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return jsonRes({ ok: false, error: 'asOf must be YYYY-MM-DD' }, 400, cors);
  if (clean(body.dueDateOverride) && !/^\d{4}-\d{2}-\d{2}$/.test(clean(body.dueDateOverride))) {
    return jsonRes({ ok: false, error: 'dueDateOverride must be YYYY-MM-DD' }, 400, cors);
  }
  const asked = body.revision == null || clean(body.revision) === '' ? null : Number(body.revision);
  if (asked != null && (!Number.isInteger(asked) || asked < 1)) {
    return jsonRes({ ok: false, error: 'revision must be a positive integer' }, 400, cors);
  }
  const by = adminLabel(identity);
  const src = await loadSource(env, asOf);
  const origin = new URL(request.url).origin;
  const a = await assessIssue(env, holderId, src, asOf, origin, { dueDateOverride: body.dueDateOverride, evidenceStatus: body.evidenceStatus });
  const { fx, sourceGaps, pref, current, gateCheck, currentDrifts } = a;
  let revision = asked;
  let settlementId = null;

  /* the payment method the statement will be issued with: stored, or the
     register's nationality default — never guessed (Owner, 5 Oct 2026) */
  if (!pref.determined) {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['PAYMENT_PREFERENCE_UNDETERMINED: ' + pref.reason + ' — a BILLING_ADMIN states the method first'] }, 409, cors);
  }
  if (!a.destination || !a.destination.complete) {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['PAYMENT_DESTINATION_INCOMPLETE: ' + pref.channel + ' has no configured account'] }, 409, cors);
  }
  /* NOTHING CONFIRMED, NOTHING ISSUED (Freeze · A): the statement stands on the
     version of the trip Guest Relations confirmed — never on a hold the guest
     has not sent, or on a sent change nobody has confirmed yet */
  if (!current.confirmation || current.confirmation.state !== 'CONFIRMED') {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['BOOKING_NOT_CONFIRMED: ' + ((current.confirmation && current.confirmation.state) || 'NONE') +
        ' — ' + (CONFIRMATION_WORDS[current.confirmation && current.confirmation.state] || CONFIRMATION_WORDS.NONE)] }, 409, cors);
  }
  /* WHAT WAS PREVIEWED IS WHAT IS ISSUED (Owner, 7 Oct 2026): the console names the statement it showed */
  const expected = clean(body.expectedProposal);
  if (expected && expected !== a.proposalHash) {
    return jsonRes({ ok: false, error: 'the statement has changed since it was previewed; preview it again',
      reasons: ['PREVIEW_CHANGED'] }, 409, cors);
  }

  if (revision == null) {
    /* judged as the ledger will judge it, before anything is created */
    if (!a.allowed) {
      return jsonRes({ ok: false, error: 'Issue & Publish is blocked', reasons: a.reasons }, 409, cors);
    }
    const { state, result } = current;
    settlementId = state.Settlement_ID;
    if (!settlementId) {
      const made = await ledgerCall(env, 'settlement', { holderId, create: true, by });
      settlementId = made && made.ok === true && made.settlement ? clean(made.settlement.Settlement_ID) : '';
      if (!settlementId) return jsonRes({ ok: false, error: (made && made.error) || 'the ledger allocated no Settlement' }, 409, cors);
    }
    /* the settlement as it was assessed: a concurrent issue of the same preview is refused by the ledger, in its turn */
    const created = await ledgerCall(env, 'revision-create', { holderId, result, by, expectedLatestRevision: Number(state.latestRevision) || 0 });
    revision = created && created.ok === true && created.revision ? Number(created.revision.Revision) : null;
    if (!Number.isInteger(revision)) {
      return jsonRes({ ok: false, error: (created && created.error) || 'the ledger created no revision',
        reasons: created && created.stale ? ['PREVIEW_CHANGED'] : [] }, 409, cors);
    }
    const readied = await ledgerCall(env, 'revision-state', { holderId, revision, action: 'READY', by, note: 'readied for Issue & Publish' });
    if (!readied || readied.ok !== true) return jsonRes({ ok: false, error: (readied && readied.error) || 'the revision could not be readied' }, 409, cors);
  }

  if (asked != null) {
    /* a stored revision is issued only while it still is what the engine says
     * today: its draft was calculated earlier, and the snapshot records the
     * CURRENT source. If the two differ, issuing would freeze figures under a
     * source they did not come from — refused; a new revision is the answer. */
    const view = await ledgerCall(env, 'read', { holderId, revision });
    const stored = view && view.ok === true && view.holder ? view.holder.revision : null;
    if (!stored) return jsonRes({ ok: false, error: 'revision ' + revision + ' of ' + holderId + ' does not exist' }, 404, cors);
    if (!stored.snapshot && stored.Revision_State !== REVISION_STATE.ISSUED) {
      const { result } = current;
      if (resultFingerprint(stored.draft) !== resultFingerprint(result)) {
        return jsonRes({ ok: false, error: 'revision ' + revision + ' was calculated on a source that has changed since; create a new revision',
          reasons: ['STALE_REVISION_DRAFT'] }, 409, cors);
      }
    }
  }

  const issued = await ledgerCall(env, 'revision-issue', {
    holderId, revision, by,
    items: src.items, specialRates: src.specialRates, fx, sourceGaps,
    sourceHash: a.sourceHash,
    issueDate: asOf, dueDateOverride: clean(body.dueDateOverride),
    evidenceStatus: clean(body.evidenceStatus), calculatedAt: new Date().toISOString(),
    paymentPreference: pref.channel, paymentPreferenceSource: pref.source,
    /* the ledger freezes this exact method or refuses: its destination is the one checked above */
    expectedPaymentPreference: pref.channel,
    gateCheck, currentDrifts,
  });
  const snapshot = issued && issued.ok === true && issued.snapshot && typeof issued.snapshot === 'object' ? issued.snapshot : null;
  if (!snapshot) {
    return jsonRes({ ok: false, error: (issued && issued.error) || 'the ledger refused the issue',
      reasons: (issued && issued.reasons) || [], immutable: !!(issued && issued.immutable), revision }, 409, cors);
  }
  return jsonRes({
    ok: true, Settlement_ID: snapshot.Settlement_ID, revision: snapshot.Revision,
    issueDate: snapshot.Issue_Date, dueDate: snapshot.Due_Date,
    totalPayable: fromCents(snapshot.Total_Payable_Cents),
    FX_USD_THB: snapshot.FX_USD_THB, FX_USD_EUR: snapshot.FX_USD_EUR,
    Payment_Preference: snapshot.Payment_Preference, Payment_Currency: snapshot.Payment_Currency,
    superseded: issued.superseded || null,
  }, 200, cors);
}

async function adminRevenue(env, identity, url, cors) {
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await loadSource(env, asOf);
  const list = { holders: await readHolders(env) };
  const holders = [];
  for (const h of (list && list.holders) || []) {
    const id = clean(h.Holder_ID);
    const { state, bookings } = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, url.origin);
    holders.push({ Holder_ID: id, Settlement_ID: state.Settlement_ID, bookings, settlement: state });
  }
  /* Freeze · U — the overview reuses the engine; it owns no formula. */
  const overview = buildRevenueOverview({
    holders, items: src.items, specialRates: src.specialRates,
    journalRows: src.journalRows,
    issuedRevisions: holders.map((h) => h.settlement && h.settlement.issuedRevision).filter(Boolean),
    asOf,
  });
  return jsonRes({ ok: true, ...overview }, 200, cors);
}

async function adminReconcile(env, identity, request, cors) {
  const body = await request.json().catch(() => ({}));
  const asOf = clean(body && body.asOf) || new Date().toISOString().slice(0, 10);
  const src = await loadSource(env, asOf);
  const list = { holders: await readHolders(env) };

  const all = [], monitoring = [], proposals = [], payments = {};
  for (const h of (list && list.holders) || []) {
    const id = clean(h.Holder_ID);
    const { state, bookings, result } = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, new URL(request.url).origin);
    const snapshot = state && state.issuedRevision ? state.issuedRevision : null;
    const drifts = detectDrift({
      snapshot, result, items: src.items, specialRates: src.specialRates, bookings,
      evidenceRows: src.evidenceRows, journalRows: src.journalRows, cartLines: [], asOf,
    });
    /* the Agent may set drift state and propose a DRAFT; it may never issue.
       The proposal is the engine's current result in the ledger's own
       revision-create contract, created once while nothing newer is open, and
       every answer is checked — a refused write is reported, never success. */
    const set = await ledgerCall(env, 'drift-set', { holderId: id, drifts });
    if (!set || set.ok !== true) throw new LedgerContractError('drift for ' + id + ' was not recorded');
    if (blockingOf(drifts).length && snapshot) {
      const proposal = proposeRevisionDraft({ holderId: id, settlementId: state.Settlement_ID,
        currentRevision: snapshot.Revision, result, drifts });
      if (Number(state.latestRevision) > Number(snapshot.Revision)) {
        proposals.push({ Holder_ID: id, created: false, reason: 'revision ' + state.latestRevision + ' is already open' });
      } else {
        const made = await ledgerCall(env, 'revision-create', { holderId: id, result, by: 'reconciliation',
          note: 'proposed after drift: ' + blockingOf(drifts).map((d) => d.code || d).join(', ') });
        proposals.push(made && made.ok === true && made.revision
          ? { Holder_ID: id, created: true, revision: made.revision.Revision, proposal }
          : { Holder_ID: id, created: false, error: (made && made.error) || 'the ledger created no revision' });
      }
    }
    all.push(...drifts);
    /* monitoring and the report read each Holder's calculated payment position,
       never the raw journal (Codex final review, 5 Oct 2026) */
    const pay = paymentStatus({
      sollCents: snapshot ? snapshot.Total_Payable_Cents : null, journalRows: src.journalRows,
      settlementId: state && state.Settlement_ID, today: asOf, dueDate: snapshot ? snapshot.Due_Date : null,
    });
    payments[id] = pay;
    monitoring.push(...monitoringSignals({ snapshot, payment: pay, journalRows: src.journalRows, asOf, holderId: id }));
  }
  return jsonRes({ ok: true, report: reconciliationReport({ holders: (list && list.holders) || [], drifts: all, payments, monitoring, asOf }), drifts: all, monitoring, proposals }, 200, cors);
}

/**
 * Everything the gate judges that comes from Google, from ONE loadSource read
 * (Owner, 5 Oct 2026). The gate display and the gate approval both build their
 * input here, so the stored verdict is judged on exactly what is shown: the
 * FX pair resolved strictly from 011_Billing_Config for `fxAsOf` (a UTC
 * calendar day), never a default, plus the two integration checks.
 */
function gateInputs(src, fxAsOf) {
  const resolved = resolveFx(src.configRows, fxAsOf);
  return {
    items: src.items, specialRates: src.specialRates,
    fx: freezeFx(resolved), fxAsOf, fxProvenance: resolved.provenance,
    siteKeyDuplicates: src.siteKeyDuplicates, nightsGaps: src.nightsGaps,
    /* condition 1: the canonical run of the eight approved cases through the
       production engine, on this very source and for this very day */
    caseResults: runReferenceCases({ items: src.items, specialRates: src.specialRates, asOf: fxAsOf }),
  };
}

async function gateRead(env, identity, url, cors) {
  const { record } = await readGate(env);
  const stored = record || GATE_NOT_RUN;
  /* the stored verdict is shown beside a failure, never AS the answer: without
     the source the conditions cannot be judged now, and the reply says so */
  let src;
  try { src = await loadSource(env); }
  catch (e) {
    return jsonRes({ ok: false, error: 'the financial source is unavailable; the gate cannot be judged now',
      detail: clean(e && e.message).slice(0, 300), stored, referenceCases: REFERENCE_CASES, retry: true }, 503, cors);
  }

  /* dated like an approval made now: an expired FX row must not look valid here */
  const inputs = gateInputs(src, clean(url.searchParams.get('asOf')).slice(0, 10) || utcDay());
  const evaluated = evaluateGate({
    caseResults: inputs.caseResults,
    drifts: await readDrifts(env, null),
    specialRates: inputs.specialRates, items: inputs.items,
    approval: record && record.approval,
    /* the four conditions the Owner added on 5 Oct 2026 */
    fx: inputs.fx,
    siteKeyDuplicates: inputs.siteKeyDuplicates,
    nightsGaps: inputs.nightsGaps,
  });
  return jsonRes({ ok: true, gate: evaluated, stored, caseResults: inputs.caseResults, referenceCases: REFERENCE_CASES }, 200, cors);
}

/* ===================================================================== THE ADMIN CONSOLE (Owner, 7 Oct 2026)
   /admin/billing reads and acts only through these routes, all behind the same BILLING_ADMIN gate as every
   administration route (handleBilling: a guest gets 403 before anything is read). The Worker runs on the Free plan
   (10 ms CPU, 50 subrequests per request), so the list of every guest is ONE cheap read — the served auth index, ONE
   Sheets batch (006 + 008) and ONE ledger listing — and what needs a per-guest engine run (Guest Relations'
   confirmation, the draft total, manual review) comes in chunks of at most ten, asked one after another. */

/* ≤ 6 holders a request (Booked value, 7 Oct 2026): per holder one ledger read, one Drafts read, the registration and
   confirmation reads (+ a ROOMS call at most) — far inside the 50 a request may make, whatever the guest count */
const ADMIN_STATUS_CHUNK = 6;
const INVITATION_RE = /^INV-[A-Z0-9-]+$/;
const EMAIL_RE = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
const goodEmail = (v) => { const e = clean(v).toLowerCase(); return e.length <= 254 && EMAIL_RE.test(e) ? e : ''; };
const METHOD_WORDS = { PAYPAL_EUR: 'PayPal (EUR)', SEPA_EUR: 'Bank transfer — SEPA (EUR)', PROMPTPAY_THB: 'PromptPay (THB)' };

/* the register's name for one 006 ID — never a guess: an ID on two rows names nobody */
function nameOf(register, contactId) {
  const r = register && register[clean(contactId)];
  if (!r || r.ambiguous) return null;
  const full = [r.first, r.last].filter(Boolean).join(' ');
  return full ? { full, first: r.first || null, nick: r.nick && r.nick !== r.first ? r.nick : null } : null;
}
/* every invitation of the served index, once: Holder_ID, the person, the 006 ID, hosts */
function holdersOfIndex(entries) {
  const byInv = new Map();
  for (const e of Object.values(entries || {})) {
    const i = clean(e && e.i);
    if (!INVITATION_RE.test(i)) continue;
    const row = { Holder_ID: i, guestId: clean(e.g) || null, contactId: clean(e.c) || null, hosts: e.h === 1 };
    const had = byInv.get(i);
    byInv.set(i, had && (had.guestId !== row.guestId || had.contactId !== row.contactId) ? { ...had, ambiguous: true } : row);
  }
  return [...byInv.values()];
}
async function kvJson(env, key) {
  if (!env.REG_KV) return null;
  try { const raw = await env.REG_KV.get(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
/* THE GUEST'S E-MAIL (brief §16): the server-persisted contact of the invitation; else the address the guest's own sent
   trip went to; else none — "Email unavailable", never a guess */
async function recipientOf(env, holderId) {
  const c = await kvJson(env, 'contact:' + holderId);
  const contact = goodEmail(c && c.email);
  if (contact) return { email: contact, source: 'CONTACT', contact: c };
  /* a contact address that is there but not usable is not replaced by an older one — the guest is asked, not guessed */
  if (c && clean(c.email)) return { email: null, source: 'CONTACT_INVALID', contact: c };
  const r = await kvJson(env, 'reg:' + holderId);
  const sent = goodEmail(r && r.recipient && r.recipient.email);
  return sent ? { email: sent, source: 'SENT_TRIP', contact: c } : { email: null, source: null, contact: c };
}
const lineView = (l, people) => ({
  Person_ID: l.Person_ID || null, person: (people && people[l.Person_ID]) || null,
  Item_ID: l.Item_ID || null, Billing_Category: l.Billing_Category || null, Rate_Basis: l.Rate_Basis || null,
  rateSource: l.rateSource || null, rate: l.rateCents == null ? null : fromCents(l.rateCents),
  nights: l.nights ?? null, payableNights: l.payableNights ?? null, quantity: l.quantity ?? null,
  amount: l.amountCents == null ? null : fromCents(l.amountCents), block: l.block || null,
  hosted: !!l.hosted, review: l.review ? (l.reviewReason || 'MANUAL_REVIEW_REQUIRED') : null,
  Room_Unit_ID: l.Room_Unit_ID || null, Booking_ID: l.Booking_ID || null,
  /* payable because H&S booked and paid it for the guest (a 009 Billing_Category): the item's own category */
  paidByHS: l.categoryOverride ? l.categoryOverride.from || null : (l.Category_Override_From || null),
});
/* the names of the persons on a set of lines, from the index (guestId → 006 ID) and the register */
function peopleOf(entries, register, lines) {
  const ids = new Set((lines || []).map((l) => clean(l && l.Person_ID)).filter(Boolean));
  const out = {};
  for (const e of Object.values(entries || {})) {
    const g = clean(e && e.g);
    if (ids.has(g) && !out[g]) { const n = nameOf(register, e.c); if (n) out[g] = n.full; }
  }
  return out;
}

/* a selection as what it books — product key and quantity, interests aside — to tell whether two versions differ at all */
const selectionSignature = (sels) => JSON.stringify((canonicalLines(Array.isArray(sels) ? sels : []) || [])
  .filter((l) => l && typeof l === 'object' && !l.interest).map((l) => [siteKeyOfSelection(l), Number(l.qty) > 0 ? Number(l.qty) : 1]).sort());
const pricedTotal = (r) => fromCents((r.blockA || []).reduce((t, l) => t + (Number.isFinite(l.amountCents) ? l.amountCents : 0), 0));
/* BOOKED VALUE (Owner, 7 Oct 2026) — what the guest has selected now, priced by the engine now. DISPLAY ONLY: never a
   billing source, never stored, never issued (src/billing/booked.js). `detail` adds the lines and the sent version. */
async function bookedOf(env, holderId, personId, src, asOf, detail, people) {
  const sel = await loadBookedSelection({ env, holderId, withSent: !!detail });
  const empty = { source: sel.source, updatedAt: sel.updatedAt, total: 0, selected: 0, lines: 0, onRequest: 0, unmapped: [] };
  if (sel.source === BOOKED_SOURCE.NONE) return detail ? { ...empty, items: [], blockB: [], sent: null } : empty;
  const r = await priceSelection({ holderId, personId, selections: sel.selections, items: src.items, specialRates: src.specialRates, asOf, source: sel.source });
  const unmapped = r.unmapped || [];
  /* the engine's own sum of its Block A amounts (engine.calculate); a statement withholds it while a line needs review,
     the booked value shows it and names those lines beside it ("+ n on request") — never as zero */
  const out = { source: sel.source, updatedAt: sel.updatedAt, total: pricedTotal(r), complete: r.manualReview.length === 0,
    selected: r.lines.length, lines: (r.blockA || []).length, onRequest: r.manualReview.length, unmapped };
  if (!detail) return out;
  let sent = null;
  if (sel.sent && sel.source === BOOKED_SOURCE.CURRENT) {
    const s = await priceSelection({ holderId, personId, selections: sel.sent.selections, items: src.items, specialRates: src.specialRates, asOf, source: BOOKED_SOURCE.SENT });
    sent = { version: sel.sent.version, lastSentAt: sel.sent.lastSentAt, total: pricedTotal(s), onRequest: s.manualReview.length,
      differs: selectionSignature(sel.sent.selections) !== selectionSignature(sel.selections) };
  } else if (sel.sent) sent = { version: sel.sent.version, lastSentAt: sel.sent.lastSentAt, total: pricedTotal(r), onRequest: r.manualReview.length, differs: false };
  /* the engine's lines include Block B: the table above the Block B table shows the rest — payable and to review */
  return { ...out, items: r.lines.filter((l) => l.block !== 'B').map((l) => lineView(l, people)), blockB: (r.blockB || []).map((l) => lineView(l, people)),
    reviewReasons: r.manualReview.map((l) => l.reviewReason).filter(Boolean), sent };
}

/** GET admin/overview — every holder of the register, cheap. */
async function adminOverview(env, identity, url, cors) {
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const entries = await loadIndex(env, url.origin, false);
  const holders = holdersOfIndex(entries);
  if (!holders.length) return jsonRes({ ok: false, error: 'the register index is not readable just now', retry: true }, 503, cors);
  const pre = await prefetchTabs(env, { ...cfgOf(env), asOf }, ['guestlist', 'paymentJournal']);
  const [register, journalRows] = await Promise.all([loadGuestRegister(env, pre), loadPaymentJournal(env, pre)]);
  const listing = await ledgerCall(env, 'holders', null);
  if (!listing || listing.ok !== true || !Array.isArray(listing.holders)) throw new LedgerContractError('no holder listing');
  const settlements = new Map(listing.holders.filter((h) => h && clean(h.Holder_ID)).map((h) => [clean(h.Holder_ID), h]));
  const stored = listing.preferences && typeof listing.preferences === 'object' ? listing.preferences : {};
  const natReg = nationalitiesOf(register);
  const gate = await readGate(env);

  const rows = holders.map((h) => {
    const s = settlements.get(h.Holder_ID) || null;
    const issued = !!(s && s.issuedRevision);
    const pay = issued ? paymentStatus({
      sollCents: s.issuedTotalPayableCents, journalRows, settlementId: s.Settlement_ID, today: asOf, dueDate: s.Due_Date,
    }) : null;
    /* the method: an issued statement keeps its own; otherwise the stored choice, else the approved route's default */
    let method;
    if (issued && s.issuedPaymentPreference) {
      method = { channel: s.issuedPaymentPreference, currency: s.issuedPaymentCurrency || CHANNEL_CURRENCY[s.issuedPaymentPreference] || null,
        determined: true, source: 'ISSUED_REVISION' };
    } else {
      const p = effectivePreference({ record: stored[h.Holder_ID] || null,
        route: routeFor({ holderId: h.Holder_ID, nationality: nationalityOf(natReg, h.contactId) }) });
      method = { channel: p.channel || null, currency: p.currency || null, determined: !!p.determined, source: p.source || null, reason: p.reason || null };
    }
    return {
      Holder_ID: h.Holder_ID, guestId: h.guestId, hosts: h.hosts, ambiguous: !!h.ambiguous,
      name: nameOf(register, h.contactId), billingAdmin: isBillingAdmin({ invitationId: h.Holder_ID, guestId: h.guestId, hosts: h.hosts }),
      settlement: s ? {
        Settlement_ID: s.Settlement_ID, state: s.Settlement_State, latestRevision: s.latestRevision || 0,
        issuedRevision: s.issuedRevision || null, issueDate: s.Issue_Date || null, dueDate: s.Due_Date || null,
        issuedTotal: s.issuedTotalPayable == null ? null : s.issuedTotalPayable, draftReview: s.draftReview || null,
      } : null,
      payment: pay ? { status: pay.status, ist: pay.ist, balance: pay.balance, overdue: (pay.flags || []).includes('OVERDUE'),
        pendingCount: pay.pendingCount || 0, flags: pay.flags || [] } : null,
      method,
      drift: { count: s ? s.driftCount || 0 : 0, blocking: s ? s.blockingDriftCount || 0 : 0 },
    };
  }).sort((a, b) => clean(a.name && a.name.full || a.Holder_ID).localeCompare(clean(b.name && b.name.full || b.Holder_ID)));

  return jsonRes({ ok: true, asOf, audience: adminLabel(identity), chunk: ADMIN_STATUS_CHUNK,
    gate: { approved: gate.approved }, holders: rows }, 200, cors);
}

/** GET admin/status?ids=… — Guest Relations' confirmation and the draft, for up to ten holders. */
async function adminStatus(env, identity, url, cors) {
  const ids = [...new Set(clean(url.searchParams.get('ids')).split(',').map(clean).filter((x) => INVITATION_RE.test(x)))];
  if (!ids.length) return jsonRes({ ok: false, error: 'ids required' }, 400, cors);
  if (ids.length > ADMIN_STATUS_CHUNK) return jsonRes({ ok: false, error: 'at most ' + ADMIN_STATUS_CHUNK + ' ids per request' }, 400, cors);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  /* the held pricing source, never an old one: a stale answer is refused, not shown as a current check */
  const src = await pricing(env, asOf, false);
  if (src.stale) {
    return jsonRes({ ok: false, stale: true, retry: true, error: 'the financial source is unavailable just now; nothing is judged on old figures' }, 503, cors);
  }
  /* the person whose rates apply, resolved as the statement path resolves it (holderIdentity): exactly one register entry */
  const inRegister = new Map(holdersOfIndex(await loadIndex(env, url.origin, false)).map((h) => [h.Holder_ID, h]));
  const rows = [];
  for (const id of ids) {
    const who = inRegister.get(id);
    if (!who || who.ambiguous || !who.guestId) {
      rows.push({ Holder_ID: id, error: 'HOLDER_PERSON: ' + id + ' is not one person of the register (or the register is not readable just now)',
        booked: { error: 'HOLDER_PERSON: no single person of the register' } });
      continue;
    }
    /* the Booked value stands apart: a selection that cannot be read is named on its own, never as zero */
    let booked;
    try { booked = await bookedOf(env, id, who.guestId, src, asOf, false); }
    catch (e) { booked = { error: clean(e && e.message).slice(0, 200) || 'not readable' }; }
    try {
      const { state, result, unmapped, confirmation } = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, url.origin);
      rows.push({ booked,
        Holder_ID: id,
        confirmation: { state: confirmation.state || 'NONE', version: confirmation.version ?? null, confirmedAt: confirmation.confirmedAt || null },
        draft: confirmation.state === 'CONFIRMED' ? {
          total: result.totalPayable, lines: result.lines.length, manualReview: result.manualReview.length,
          reviewReasons: result.manualReview.map((l) => l.reviewReason).filter(Boolean).slice(0, 5), unmapped,
        } : null,
        Settlement_ID: state.Settlement_ID || null,
      });
    } catch (e) {
      rows.push({ Holder_ID: id, booked, error: clean(e && e.message).slice(0, 200) || 'not readable' });
    }
  }
  return jsonRes({ ok: true, asOf, source: { at: new Date(src.at).toISOString(), cached: src.cached }, rows }, 200, cors);
}

/** GET admin/holder?holder=INV — one guest in full: identity, preview, the issued statement, payments, e-mail log. */
async function adminHolder(env, identity, url, cors) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const entries = await loadIndex(env, url.origin, false);
  const entry = holdersOfIndex(entries).find((h) => h.Holder_ID === holderId);
  if (!entry || entry.ambiguous) return jsonRes({ ok: false, error: holderId + ' is not one invitation of the register' }, 404, cors);

  const src = await loadSource(env, asOf, { register: true });
  /* the issued statement and its payments never depend on the preview: a trip that cannot be calculated now (a
     registration or a ROOMS read failing) leaves the preview unavailable, and everything already issued visible */
  let a = null, previewError = null;
  try { a = await assessIssue(env, holderId, src, asOf, url.origin); }
  catch (e) { if (e instanceof LedgerContractError) throw e; previewError = clean(e && e.message).slice(0, 300) || 'the trip could not be calculated'; }
  const state = a ? a.state : await holderState(env, holderId);
  const view = await ledgerCall(env, 'read', { holderId });
  if (!view || view.ok !== true || !view.holder) throw new LedgerContractError('no holder view for ' + holderId);
  const issued = state.issuedRevision || null;
  const sid = state.Settlement_ID || null;
  const people = peopleOf(entries, src.register, [...(a ? a.current.result.lines : []), ...((issued && issued.lines) || [])]);
  const recipient = await recipientOf(env, holderId);
  const name = nameOf(src.register, entry.contactId);

  const rows = sid ? src.journalRows.filter((r) => clean(r.Settlement_ID) === sid) : [];
  /* ONE ledger read for every reported payment's decision — however many a guest reports */
  const reportedIds = rows.filter((r) => clean(r.Record_Status) === RECORD_STATUS.REPORTED && clean(r.Payment_ID)).map((r) => clean(r.Payment_ID));
  const dec = reportedIds.length ? await ledgerCall(env, 'payment-decision', { action: 'read', paymentIds: reportedIds }) : null;
  const decisions = dec && dec.ok === true && dec.decisions ? dec.decisions : null;
  const payments = [];
  for (const r of rows) {
    const status = clean(r.Record_Status);
    let decision = null;
    if (status === RECORD_STATUS.REPORTED && clean(r.Payment_ID)) decision = decisions ? decisions[clean(r.Payment_ID)] || null : { unreadable: true };
    payments.push({
      Payment_ID: clean(r.Payment_ID), Entry_Type: clean(r.Entry_Type) || ENTRY_TYPE.PAYMENT, Method: clean(r.Method),
      Amount_Paid: r.Amount_Paid, Currency_Paid: clean(r.Currency_Paid), Amount_USD: r.Amount_USD,
      Reported_By: clean(r.Reported_By), Reported_At: clean(r.Reported_At), Provider_Reference: clean(r.Provider_Reference),
      Record_Status: status, Verified_By: clean(r.Verified_By), Verified_At: clean(r.Verified_At),
      Reject_Reason: clean(r.Reject_Reason), Duplicate_Suspect: clean(r.Duplicate_Suspect) === 'TRUE', decision,
    });
  }
  const pay = paymentStatus({ sollCents: issued ? issued.Total_Payable_Cents : null, journalRows: src.journalRows,
    settlementId: sid, today: asOf, dueDate: issued ? issued.Due_Date : null });
  const mail = issued ? await ledgerCall(env, 'statement-mail', { settlementId: sid, revision: issued.Revision, action: 'read' }) : null;
  let booked;
  if (!entry.guestId) booked = { error: 'HOLDER_PERSON: the register names no person for ' + holderId };
  else try {
    const bookedPeople = { ...people, ...peopleOf(entries, src.register, [{ Person_ID: entry.guestId }]) };
    booked = await bookedOf(env, holderId, entry.guestId, src, asOf, true, bookedPeople);
  } catch (e) { booked = { error: clean(e && e.message).slice(0, 300) || 'not readable' }; }
  const r = a ? a.current.result : null;
  const issuedFx = issued ? freezeFx({ FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR }) : null;
  /* THE SUBMITTED BOOKING and its confirmation — what Confirm booking stands on; unreadable is said, never "not sent" */
  let submission;
  try {
    if (!entry.guestId) throw new SourceDataError('HOLDER_PERSON', 'the register names no person for ' + holderId);
    const sub = await submittedOf(env, holderId, entry.guestId, false);
    const st = await standingOf(env, holderId, sub);
    submission = { submitted: sub.submitted, version: sub.submitted ? sub.version : null, sentAt: sub.submitted ? sub.sentAt : null, ...st.view };
  } catch (e) {
    if (e instanceof LedgerContractError) throw e;
    submission = { state: 'UNREADABLE', submitted: null, error: clean(e && e.message).slice(0, 300) || 'not readable' };
  }

  return jsonRes({
    ok: true, asOf, Holder_ID: holderId,
    guest: { name, guestId: entry.guestId, hosts: entry.hosts,
      contactName: recipient.contact ? [clean(recipient.contact.firstName), clean(recipient.contact.lastName)].filter(Boolean).join(' ') || null : null,
      email: recipient.email, emailSource: recipient.source },
    booked, submission,
    confirmation: a ? a.confirmation : { state: 'UNREADABLE' },
    method: a ? { channel: a.pref.channel || null, currency: a.pref.currency || null, determined: !!a.pref.determined,
      source: a.pref.source || null, reason: a.pref.reason || null, locked: !!a.pref.locked,
      destinationComplete: !!(a.destination && a.destination.complete) }
      : { channel: issued ? issued.Payment_Preference : null, currency: issued ? issued.Payment_Currency : null, determined: !!issued, source: issued ? 'ISSUED_REVISION' : null, reason: previewError },
    settlement: { Settlement_ID: sid, state: state.state || null, latestRevision: state.latestRevision || 0,
      revisions: (view.holder.revisions || []).map((x) => ({ Revision: x.Revision, Revision_State: x.Revision_State, Issue_Date: x.Issue_Date,
        Due_Date: x.Due_Date, total: x.Total_Payable_Cents == null ? null : fromCents(x.Total_Payable_Cents), issuedAt: x.issuedAt,
        issuedBy: x.issuedBy, supersededAt: x.supersededAt })) },
    preview: !a ? { error: previewError, issuable: false, reasons: ['PREVIEW_UNAVAILABLE: ' + previewError], proposalHash: null, lines: [], blockB: [] } : {
      total: r.totalPayable, hostedValue: fromCents(r.hostedValueCents), lines: r.lines.filter((l) => l.block !== 'B').map((l) => lineView(l, people)),
      blockB: (r.blockB || []).map((l) => lineView(l, people)), manualReview: r.manualReview.map((l) => l.reviewReason).filter(Boolean),
      unmapped: a.current.unmapped, issueDate: a.proposal ? a.proposal.Issue_Date : asOf, dueDate: a.proposal ? a.proposal.Due_Date : null,
      fx: { FX_USD_THB: a.fx.FX_USD_THB, FX_USD_EUR: a.fx.FX_USD_EUR, gaps: a.fx.gaps || [] },
      inCurrency: a.pref.channel ? inPreferredCurrency(r.totalPayableCents, a.pref.channel, a.fx) : null,
      issuable: a.allowed, reasons: a.reasons, proposalHash: a.allowed ? a.proposalHash : null,
      gate: a.gate, drifts: a.drifts.filter((d) => !d.resolved).map((d) => ({ code: d.code, detail: d.detail || '' })),
    },
    issued: issued ? {
      Settlement_ID: issued.Settlement_ID, revision: issued.Revision, issueDate: issued.Issue_Date, dueDate: issued.Due_Date,
      total: fromCents(issued.Total_Payable_Cents), hostedValue: fromCents(issued.Hosted_Value_Cents),
      lines: (issued.lines || []).map((l) => lineView(l, people)), blockB: issued.Block_B_Informational || [],
      fx: { FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR },
      method: issued.Payment_Preference, currency: issued.Payment_Currency, recipient: issued.Payment_Recipient,
      inCurrency: issued.Payment_Preference ? inPreferredCurrency(issued.Total_Payable_Cents, issued.Payment_Preference, issuedFx) : null,
      engineVersion: issued.Engine_Version, evidence: issued.Evidence_Status,
    } : null,
    payment: issued ? { status: pay.status, soll: pay.soll, ist: pay.ist, balance: pay.balance, flags: pay.flags || [],
      pendingCount: pay.pendingCount || 0, overdue: (pay.flags || []).includes('OVERDUE') } : null,
    payments,
    mail: mail && mail.ok === true ? { attempts: mail.attempts || [], open: mail.open || null } : (issued ? { unreadable: true } : null),
  }, 200, cors);
}

/* ------------------------------------------------ CONFIRM BOOKING (Owner, 7 Oct 2026) */

/**
 * THE SUBMITTED BOOKING of one invitation, as a confirmation reads it: `reg:<inv>`, the version the guest SENT — never
 * the saved trip. It fails closed: a record that cannot be read, carries no readable booking, names no person or
 * another person than the register holds for this invitation is an error, never "nothing sent" and never confirmable.
 * `digest` (withDigest) names the exact submission: its reference, version, time and the lines exactly as stored.
 */
async function submittedOf(env, holderId, personId, withDigest) {
  if (!env.REG_KV) throw new SourceDataError('REGISTRATION_UNAVAILABLE', 'the registration store is not bound');
  const raw = await env.REG_KV.get('reg:' + holderId);
  if (raw == null || raw === '') return { submitted: false };
  let rec;
  try { rec = JSON.parse(raw); } catch (e) { rec = undefined; }
  if (!rec || typeof rec !== 'object') throw new SourceDataError('SENT_UNREADABLE', 'the submitted booking of ' + holderId + ' is not readable');
  if (!clean(rec.submissionId)) return { submitted: false };
  const reg = rec.registration;
  if (!reg || typeof reg !== 'object' || (reg.selections != null && !Array.isArray(reg.selections))) {
    throw new SourceDataError('SENT_UNREADABLE', 'the submitted booking of ' + holderId + ' carries no readable selection');
  }
  const version = Number(rec.version || 1);
  if (!Number.isInteger(version) || version < 1) throw new SourceDataError('SENT_UNREADABLE', 'the submitted booking of ' + holderId + ' names no usable version');
  const person = clean(reg.guestId);
  if (!person) throw new SourceDataError('SENT_NO_PERSON', 'the submitted booking of ' + holderId + ' names no guest');
  if (person !== clean(personId)) throw new SourceDataError('SENT_PERSON_MISMATCH', 'the submitted booking of ' + holderId + ' names another guest than the register');
  const selections = Array.isArray(reg.selections) ? reg.selections : [];
  const out = { submitted: true, record: rec, submissionId: clean(rec.submissionId), version, sentAt: clean(rec.lastSentAt || rec.submittedAt) || null, selections };
  if (withDigest) out.digest = await sha256Hex(stableJson({ submissionId: out.submissionId, version, sentAt: out.sentAt, selections }));
  return out;
}

/** The stored confirmation (`conf:<inv>`) beside the submission, by the one rule (src/confirmation.js). Unreadable fails closed. */
async function standingOf(env, holderId, sub) {
  const raw = await env.REG_KV.get('conf:' + holderId);
  let conf = null;
  if (raw != null && raw !== '') {
    try { conf = JSON.parse(raw); } catch (e) { conf = undefined; }
    if (!conf || typeof conf !== 'object') throw new SourceDataError('CONFIRMATION_UNREADABLE', 'the confirmation record of ' + holderId + ' is not readable');
  }
  const state = !sub.submitted ? 'NONE' : confirmationStands(conf, sub.record) ? 'CONFIRMED' : conf && conf.confirmedAt ? 'LAPSED' : 'UNCONFIRMED';
  return { conf, raw: raw == null || raw === '' ? null : raw, state, view: { state,
    confirmedVersion: conf && conf.confirmedAt && conf.version != null ? Number(conf.version) : null,
    confirmedAt: (conf && conf.confirmedAt) || null, confirmedBy: clean(conf && conf.actor) || null,
    role: clean(conf && conf.role) || null, source: clean(conf && conf.source) || null } };
}

/* the guest's current saved trip against the submission — only to say whether it moved; it is never what is confirmed */
async function currentAgainst(env, holderId, sub) {
  try {
    const sel = await loadBookedSelection({ env, holderId, withSent: false });
    if (sel.source !== BOOKED_SOURCE.CURRENT) return { readable: true, changed: false, sel: null };
    return { readable: true, changed: selectionSignature(sel.selections) !== selectionSignature(sub.selections), sel };
  } catch (e) {
    return { readable: false, changed: null, error: clean(e && e.message).slice(0, 200) || 'not readable', sel: null };
  }
}

/** GET admin/confirm?holder=INV — what the confirmation dialog shows. Reads only; nothing is confirmed here. */
async function adminConfirmGet(env, identity, url, cors) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const entry = holdersOfIndex(await loadIndex(env, url.origin, false)).find((h) => h.Holder_ID === holderId);
  if (!entry || entry.ambiguous || !entry.guestId) return jsonRes({ ok: false, error: holderId + ' is not one person of the register' }, 404, cors);
  let sub, standing;
  try {
    sub = await submittedOf(env, holderId, entry.guestId, true);
    standing = await standingOf(env, holderId, sub);
  } catch (e) {
    if (e instanceof SourceDataError) return jsonRes({ ok: false, canConfirm: false, error: e.message + '; nothing can be confirmed', reasons: [e.code] }, 409, cors);
    throw e;
  }
  const src = await loadSource(env, asOf, { register: true });
  const name = nameOf(src.register, entry.contactId);
  if (!sub.submitted) {
    return jsonRes({ ok: true, Holder_ID: holderId, name, submitted: false, state: 'NONE', canConfirm: false,
      why: 'The guest has not submitted this trip yet.' }, 200, cors);
  }
  /* the submitted version, priced by the engine on today's source exactly as the Booked value prices a selection */
  const priced = await priceSelection({ holderId, personId: entry.guestId, selections: sub.selections, items: src.items,
    specialRates: src.specialRates, asOf, source: BOOKED_SOURCE.SENT });
  const cur = await currentAgainst(env, holderId, sub);
  let current = { readable: cur.readable, changed: cur.changed, error: cur.error || null };
  if (cur.changed) {
    const c = await priceSelection({ holderId, personId: entry.guestId, selections: cur.sel.selections, items: src.items,
      specialRates: src.specialRates, asOf, source: BOOKED_SOURCE.CURRENT });
    current = { ...current, updatedAt: cur.sel.updatedAt, total: pricedTotal(c), onRequest: c.manualReview.length };
  }
  /* WHAT ISSUE WOULD SAY once exactly this version is confirmed — the same assessment as Preview, with the
     confirmation assumed; it returns no proposal hash, so nothing can ever be issued from it */
  let afterConfirm = null;
  if (standing.state !== 'CONFIRMED') {
    try {
      const a = await assessIssue(env, holderId, src, asOf, url.origin, { assumeConfirmedVersion: sub.version });
      afterConfirm = { assumedVersion: sub.version, issuable: a.allowed, reasons: a.reasons, total: a.current.result.totalPayable,
        dueDate: a.proposal ? a.proposal.Due_Date : null };
    } catch (e) {
      if (e instanceof LedgerContractError) throw e;
      afterConfirm = { assumedVersion: sub.version, issuable: false, error: clean(e && e.message).slice(0, 300) || 'the statement could not be calculated' };
    }
  }
  return jsonRes({ ok: true, Holder_ID: holderId, asOf, name, guestId: entry.guestId, submitted: true,
    state: standing.state, canConfirm: standing.state === 'UNCONFIRMED' || standing.state === 'LAPSED',
    confirmation: standing.view,
    snapshot: { submissionId: sub.submissionId, version: sub.version, sentAt: sub.sentAt, digest: sub.digest },
    sent: { total: pricedTotal(priced), complete: priced.manualReview.length === 0, payableLines: (priced.blockA || []).length,
      onRequest: priced.manualReview.length, selected: priced.lines.filter((l) => l.block !== 'B').length,
      providerSettled: (priced.blockB || []).length, unmapped: priced.unmapped || [] },
    current, afterConfirm }, 200, cors);
}

/**
 * POST admin/confirm { holderId, expected: { submissionId, version, digest }, acknowledgeChange } — a BILLING_ADMIN
 * confirms the SUBMITTED booking the dialog showed, as Guest Relations would: the same record (src/confirmation.js ·
 * writeConfirmation), naming who (the audit label), in which capacity (BILLING_ADMIN) and from where (admin-billing).
 * Everything is read again here: nothing sent → NOT_SENT; another version sent since → SENT_CHANGED; unreadable or not
 * this invitation's person → refused (fail closed); a current selection that moved since the submission (or cannot
 * be read) must be acknowledged; the version already confirmed → nothing written (idempotent). Never issues, never
 * e-mails; an issued statement is never touched.
 */
async function adminConfirmPost(env, identity, request, url, cors) {
  const body = await request.json().catch(() => null);
  const holderId = clean(body && body.holderId);
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holderId required' }, 400, cors);
  const exp = body && body.expected && typeof body.expected === 'object' ? body.expected : null;
  if (!exp || !clean(exp.submissionId) || !Number.isInteger(Number(exp.version)) || !/^[0-9a-f]{64}$/.test(clean(exp.digest))) {
    return jsonRes({ ok: false, error: 'the submitted version the dialog showed is required (expected)' }, 400, cors);
  }
  const entry = holdersOfIndex(await loadIndex(env, url.origin, false)).find((h) => h.Holder_ID === holderId);
  if (!entry || entry.ambiguous || !entry.guestId) return jsonRes({ ok: false, error: holderId + ' is not one person of the register' }, 404, cors);
  let sub, standing;
  try {
    sub = await submittedOf(env, holderId, entry.guestId, true);
    standing = await standingOf(env, holderId, sub);
  } catch (e) {
    if (e instanceof SourceDataError) return jsonRes({ ok: false, error: e.message + '; nothing was confirmed', reasons: [e.code] }, 409, cors);
    throw e;
  }
  if (!sub.submitted) return jsonRes({ ok: false, error: 'The guest has not submitted this trip yet; nothing was confirmed.', reasons: ['NOT_SENT'] }, 409, cors);
  if (sub.submissionId !== clean(exp.submissionId) || sub.version !== Number(exp.version) || sub.digest !== clean(exp.digest)) {
    return jsonRes({ ok: false, error: 'The guest has sent another version since this dialog was opened; nothing was confirmed.', reasons: ['SENT_CHANGED'],
      snapshot: { submissionId: sub.submissionId, version: sub.version, sentAt: sub.sentAt } }, 409, cors);
  }
  if (standing.state === 'CONFIRMED') return jsonRes({ ok: true, Holder_ID: holderId, unchanged: true, confirmation: standing.view }, 200, cors);
  const cur = await currentAgainst(env, holderId, sub);
  if (cur.changed !== false && body.acknowledgeChange !== true) {
    return jsonRes({ ok: false, error: cur.changed ? 'The current selection has changed since submission: confirm that you confirm the submitted version.'
      : 'The current selection cannot be read: confirm that you confirm the submitted version.', reasons: ['ACKNOWLEDGE_CHANGE'], changed: cur.changed }, 409, cors);
  }
  /* the record as it stands right before the write: a Guest Relations change since it was read is never overwritten
     blind (KV has no compare-and-swap; this narrows the window to the write itself) */
  const again = await env.REG_KV.get('conf:' + holderId);
  if ((again == null || again === '' ? null : again) !== standing.raw) {
    return jsonRes({ ok: false, error: 'The confirmation record changed meanwhile; nothing was confirmed — open the dialog again.', reasons: ['CONFIRMATION_CHANGED'] }, 409, cors);
  }
  const by = adminLabel(identity);
  const w = await writeConfirmation(env.REG_KV, {
    invitationId: holderId, action: 'confirm', actor: by, role: CONFIRMATION_ROLE.BILLING_ADMIN, source: 'admin-billing',
    note: 'Confirm booking from the admin console' + (cur.changed ? ' · the current selection differed from the submitted version (acknowledged)'
      : cur.changed === null ? ' · the current selection could not be read (acknowledged)' : ''),
    record: sub.record, current: standing.conf,
    extra: { digest: sub.digest, acknowledgedChange: cur.changed !== false },
  });
  const c = w.conf;
  return jsonRes({ ok: true, Holder_ID: holderId, unchanged: !!w.unchanged, acknowledgedChange: cur.changed !== false,
    confirmation: { state: 'CONFIRMED', confirmedVersion: c.version != null ? Number(c.version) : null, confirmedAt: c.confirmedAt,
      confirmedBy: clean(c.actor) || null, role: clean(c.role) || null, source: clean(c.source) || null } }, 200, cors);
}

/* what the send dialog shows, and what the send checks again: the CURRENT issued revision and the e-mail resolved NOW */
async function sendContext(env, url, holderId) {
  const state = await holderState(env, holderId);
  const issued = state.issuedRevision || null;
  if (!issued) return { issued: null };
  const recipient = await recipientOf(env, holderId);
  const entries = await loadIndex(env, url.origin, false);
  const entry = holdersOfIndex(entries).find((h) => h.Holder_ID === holderId) || null;
  let name = null;
  try {
    const pre = await prefetchTabs(env, cfgOf(env), ['guestlist']);
    name = nameOf(await loadGuestRegister(env, pre), entry && entry.contactId);
  } catch (e) { name = null; }   /* the name is a greeting, never a condition: the contact's own name stands in */
  const c = recipient.contact || {};
  const firstName = (name && (name.nick || name.first)) || clean(c.firstName) || null;
  const fullName = (name && name.full) || [clean(c.firstName), clean(c.lastName)].filter(Boolean).join(' ') || null;
  const fx = freezeFx({ FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR });
  return { state, issued, recipient, firstName, fullName,
    inCurrency: issued.Payment_Preference ? inPreferredCurrency(issued.Total_Payable_Cents, issued.Payment_Preference, fx) : null };
}

/** GET admin/send?holder=INV — the facts the confirmation shows before anything is sent. */
async function adminSendGet(env, identity, url, cors) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  const ctx = await sendContext(env, url, holderId);
  if (!ctx.issued) return jsonRes({ ok: true, Holder_ID: holderId, issued: false }, 200, cors);
  const log = await ledgerCall(env, 'statement-mail', { settlementId: ctx.issued.Settlement_ID, revision: ctx.issued.Revision, action: 'read' });
  return jsonRes({ ok: true, Holder_ID: holderId, issued: true,
    recipientName: ctx.fullName, firstName: ctx.firstName, email: ctx.recipient.email, emailSource: ctx.recipient.source,
    Settlement_ID: ctx.issued.Settlement_ID, revision: ctx.issued.Revision, totalPayable: fromCents(ctx.issued.Total_Payable_Cents),
    dueDate: ctx.issued.Due_Date, issueDate: ctx.issued.Issue_Date, inCurrency: ctx.inCurrency,
    attempts: log && log.ok === true ? log.attempts : null, open: log && log.ok === true ? log.open : null }, 200, cors);
}

const base64Of = (bytes) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * POST admin/send { holderId, revision, email, sendKey, again } — the issued statement to the guest, once, on a
 * BILLING_ADMIN's explicit confirmation. Only the current issued revision, only to the e-mail the dialog showed (it is
 * resolved again here and must be the same), claimed in the ledger under the confirmation's own key first. The PDF
 * is the write-once object the download serves, attached — never a link.
 */
async function adminSendPost(env, identity, request, url, cors, deps) {
  const body = await request.json().catch(() => null);
  const holderId = clean(body && body.holderId);
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holderId required' }, 400, cors);
  const sendMail = deps && typeof deps.sendMail === 'function' ? deps.sendMail : null;
  if (!sendMail) return jsonRes({ ok: false, error: 'the mail transport is not available here' }, 503, cors);
  const ctx = await sendContext(env, url, holderId);
  if (!ctx.issued) return jsonRes({ ok: false, error: 'no issued statement', reasons: ['NOT_ISSUED'] }, 409, cors);
  if (Number(body.revision) !== Number(ctx.issued.Revision)) {
    return jsonRes({ ok: false, error: 'revision ' + clean(body.revision) + ' is not the current statement', reasons: ['NOT_CURRENT_REVISION'] }, 409, cors);
  }
  if (!ctx.recipient.email) return jsonRes({ ok: false, error: 'Email unavailable', reasons: ['EMAIL_UNAVAILABLE'] }, 409, cors);
  if (goodEmail(body.email) !== ctx.recipient.email) {
    return jsonRes({ ok: false, error: 'the guest\'s e-mail has changed since the confirmation was shown', reasons: ['EMAIL_CHANGED'] }, 409, cors);
  }
  const sid = ctx.issued.Settlement_ID, rev = ctx.issued.Revision, by = adminLabel(identity);
  const claim = await ledgerCall(env, 'statement-mail', { action: 'claim', settlementId: sid, revision: rev, by,
    sendKey: clean(body.sendKey), again: body.again === true, to: ctx.recipient.email });
  if (!claim || claim.ok !== true || !claim.token) {
    if (claim && claim.replay && claim.attempt) {
      return jsonRes({ ok: claim.attempt.outcome === 'SENT', replay: true, outcome: claim.attempt.outcome, attempt: claim.attempt, attempts: claim.attempts }, 200, cors);
    }
    return jsonRes({ ok: false, error: (claim && claim.error) || 'the send could not be claimed',
      reasons: [claim && claim.alreadySent ? 'ALREADY_SENT' : claim && claim.inProgress ? 'IN_PROGRESS' : 'NOT_CLAIMED'],
      attempts: claim && claim.attempts, open: claim && claim.open }, 409, cors);
  }
  const finish = (fields) => ledgerCall(env, 'statement-mail', { action: 'complete', settlementId: sid, revision: rev, token: claim.token, ...fields });

  let bytes;
  try {
    const pdf = await issuedPdf(env, holderId, rev);
    if (!pdf.obj) throw new Error(pdf.error || 'no PDF');
    bytes = new Uint8Array(await pdf.obj.arrayBuffer());
  } catch (e) {
    const done = await finish({ outcome: 'NOT_SENT', error: 'the statement PDF is not available: ' + clean(e && e.message) });
    return jsonRes({ ok: false, outcome: 'NOT_SENT', error: 'the statement PDF is not available just now; nothing was sent', attempt: done && done.attempt }, 503, cors);
  }
  const mail = composeStatementMail({
    firstName: ctx.firstName, settlementId: sid, revision: rev, totalPayable: fromCents(ctx.issued.Total_Payable_Cents),
    issueDate: ctx.issued.Issue_Date, dueDate: ctx.issued.Due_Date, inCurrency: ctx.inCurrency,
    method: METHOD_WORDS[ctx.issued.Payment_Preference] || null, profileUrl: url.origin + '/profile#statement',
  });
  const sent = await sendMail(env, ctx.recipient.email, ctx.fullName || ctx.recipient.email, mail.subject, mail.text, mail.html,
    [{ name: 'Statement-' + sid + '-V' + rev + '.pdf', content: base64Of(bytes) }]);
  const outcome = sent && ['SENT', 'REJECTED', 'NOT_SENT'].includes(sent.outcome) ? sent.outcome : 'UNCERTAIN';
  const done = await finish({ outcome, provider: sent && sent.provider, messageId: sent && sent.id, status: sent && sent.status, error: sent && sent.error });
  return jsonRes({ ok: outcome === 'SENT', outcome, provider: sent && sent.provider, error: outcome === 'SENT' ? null : (sent && sent.error) || null,
    attempt: done && done.ok === true ? done.attempt : null, recorded: !!(done && done.ok === true) }, outcome === 'SENT' ? 200 : 502, cors);
}

/* ------------------------------------------------------------ the router */

const GUEST_ROUTES = new Set(['mine', 'payment/report', 'pdf', 'qr', 'catalogue', 'validate', 'preference']);

/**
 * THE PAYMENT METHOD, read or changed (Owner, 5 Oct 2026 · Freeze · L).
 * GET answers the method in force, the methods the route offers and where
 * each one's money goes. POST { Payment_Preference } changes it: the Holder
 * for their own invitation, among their route's methods; a BILLING_ADMIN for
 * any Holder (body.holderId), among all approved methods. From the first VERIFIED payment of the settlement on the
 * method is locked — that lock is recorded in the ledger the moment it is
 * seen, and the change is refused. An issued revision keeps the method in its
 * own snapshot; a change takes effect for the next statement and for how the
 * open balance is shown, converted only with that revision's frozen FX.
 */
async function paymentPreference(env, identity, request, url, cors) {
  const admin = isBillingAdmin(identity);
  const body = request.method === 'POST' ? await request.json().catch(() => null) : null;
  if (request.method === 'POST' && !body) return jsonRes({ ok: false, error: 'invalid body' }, 400, cors);
  const asked = clean((body && body.holderId) || url.searchParams.get('holder'));
  if (asked && asked !== clean(identity.invitationId) && !admin) {
    return jsonRes({ ok: false, error: 'billing administration is restricted' }, 403, cors);
  }
  const holderId = asked || clean(identity.invitationId);
  const src = await loadSource(env);
  const state = await holderState(env, holderId);
  const pref = await preferenceOf(env, url.origin, holderId, state, src);

  if (request.method !== 'POST') {
    return jsonRes({ ok: true, Holder_ID: holderId, paymentPreference: preferenceView(pref, state.issuedRevision, env) }, 200, cors);
  }

  const channel = clean(body.Payment_Preference);
  if (!isChannel(channel)) return jsonRes({ ok: false, error: 'unknown payment method' }, 400, cors);
  const byAdminForOther = admin && holderId !== clean(identity.invitationId);
  const by = admin ? adminLabel(identity) : holderId;
  /* a Holder picks only among the methods their approved route offers; a
     route that cannot be determined is stated by a BILLING_ADMIN, never by a
     guess of the guest's own */
  if (!byAdminForOther) {
    if (!pref.route) {
      return jsonRes({ ok: false, error: 'no approved payment route is known for this invitation; Guest Relations states the method',
        paymentPreference: preferenceView(pref, state.issuedRevision, env) }, 409, cors);
    }
    if (!pref.options.includes(channel)) {
      return jsonRes({ ok: false, error: channel + ' is not offered on this route; available: ' + pref.options.join(', '),
        paymentPreference: preferenceView(pref, state.issuedRevision, env) }, 409, cors);
    }
  }

  if (pref.verifiedPaymentId && !(state.paymentPreference && state.paymentPreference.lockedAt)) {
    /* the journal already holds a VERIFIED payment: the lock is recorded now */
    await ledgerCall(env, 'payment-preference', { holderId, action: 'lock', verifiedPaymentId: pref.verifiedPaymentId,
      channel: pref.channel, source: pref.source, by });
  }
  if (pref.locked) {
    return jsonRes({ ok: false, locked: true, error: 'the payment method is locked since the first VERIFIED payment',
      paymentPreference: preferenceView({ ...pref, locked: true }, state.issuedRevision, env) }, 409, cors);
  }
  const reply = await ledgerCall(env, 'payment-preference', {
    holderId, action: 'set', channel, by, note: clean(body.note).slice(0, 200),
    source: byAdminForOther ? PREFERENCE_SOURCE.BILLING_ADMIN : PREFERENCE_SOURCE.HOLDER,
  });
  if (!reply || reply.ok !== true || !reply.preference) {
    return jsonRes({ ok: false, locked: !!(reply && reply.locked), error: (reply && reply.error) || 'the change was not recorded' }, 409, cors);
  }
  const now = await preferenceOf(env, url.origin, holderId, { ...state, paymentPreference: reply.preference }, src);
  return jsonRes({ ok: true, Holder_ID: holderId, paymentPreference: preferenceView(now, state.issuedRevision, env) }, 200, cors);
}

export async function handleBilling(request, env, url, cors, deps) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  const op = url.pathname.replace(/^\/api\/billing\/?/, '').replace(/\/$/, '') || 'mine';

  const identity = await identify(request, env);
  if (!identity) return jsonRes({ ok: false, error: 'not authenticated' }, 401, cors);

  if (!env.BILLING_LEDGER) return jsonRes({ ok: false, error: 'billing ledger unavailable' }, 503, cors);
  if (!clean(env.SHEETS_ID)) return jsonRes({ ok: false, error: 'the financial source is not configured' }, 503, cors);

  const admin = requireBillingAdmin(identity);
  if (!GUEST_ROUTES.has(op) && !admin.ok) {
    return jsonRes({ ok: false, error: 'billing administration is restricted' }, 403, cors);
  }

  try {
    switch (op) {
      /* ---- guest --------------------------------------------------- */
      case 'mine': return await guestSettlement(env, identity, url, cors);
      case 'payment/report':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
        return await reportPayment(env, identity, request, cors);
      case 'catalogue': return await catalogueQuotes(env, identity, url, cors);
      case 'validate':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
        return await validateSelections(env, identity, request, url, cors);
      case 'preference': return await paymentPreference(env, identity, request, url, cors);
      case 'pdf': return await servePdf(env, identity, url, cors);
      case 'qr': return await serveQr(env, identity, url, cors);

      /* ---- BILLING_ADMIN ------------------------------------------- */
      case 'holders': return await adminHolders(env, identity, url, cors);
      /* the admin console (/admin/billing · Owner, 7 Oct 2026) */
      case 'admin/overview': return await adminOverview(env, identity, url, cors);
      case 'admin/status': return await adminStatus(env, identity, url, cors);
      case 'admin/holder': return await adminHolder(env, identity, url, cors);
      case 'admin/send':
        return request.method === 'POST' ? await adminSendPost(env, identity, request, url, cors, deps) : await adminSendGet(env, identity, url, cors);
      /* Confirm booking: a BILLING_ADMIN confirms the submitted booking, as Guest Relations would (Owner, 7 Oct 2026) */
      case 'admin/confirm':
        return request.method === 'POST' ? await adminConfirmPost(env, identity, request, url, cors) : await adminConfirmGet(env, identity, url, cors);
      case 'issue': return await adminIssue(env, identity, request, cors);
      case 'revenue': return await adminRevenue(env, identity, url, cors);
      case 'reconcile': return await adminReconcile(env, identity, request, cors);
      case 'gate': return await gateRead(env, identity, url, cors);
      case 'gate/approve': {
        const body = await request.json().catch(() => ({}));
        /* Freeze · AB — a human act, recorded verbatim. Nothing here approves itself.
         * The ledger judges the conditions on the source as it stands at this
         * moment: FX for the approval's own UTC day, read from 011_Billing_Config.
         * If Google cannot be read, nothing is recorded (sourceFailure, 503). */
        const approvedAt = new Date().toISOString();
        const src = await loadSource(env);
        const reply = await ledgerCall(env, 'gate-approve', {
          approvedBy: adminLabel(identity) === 'BRIDE' ? 'haruthai' : 'suthep',
          approvedAt,
          note: clean(body && body.note).slice(0, 300),
          ...gateInputs(src, approvedAt.slice(0, 10)),
        });
        if (!reply || reply.ok !== true || !reply.gate || typeof reply.gate !== 'object') {
          return jsonRes({ ok: false, error: (reply && reply.error) || 'the ledger recorded no gate decision' }, (reply && reply.ok === false) ? 409 : 503, cors);
        }
        return jsonRes({ ok: true, gate: reply.gate, approved: reply.gate.approved === true, open: reply.gate.open || [] }, 200, cors);
      }
      case 'override': {
        const body = await request.json().catch(() => ({}));
        const stored = await ledgerCall(env, 'override-set', {
          holderId: clean(body.holderId), personId: clean(body.personId),
          billToHolderId: clean(body.billToHolderId), by: adminLabel(identity),
        });
        if (!stored || stored.ok !== true) {
          return jsonRes({ ok: false, error: (stored && stored.error) || 'the override was not recorded' }, 409, cors);
        }
        return jsonRes({ ok: true, override: stored }, 200, cors);
      }
      case 'payment/decision-resolve': {
        /* A DECISION THAT NEVER COMPLETED IS RESUMED, NEVER RELEASED (Codex round 4).
           Google cannot write conditionally: a request the first writer sent may
           still commit later. The claim fixed its whole payload when it was made,
           so a BILLING_ADMIN resumes it here — at least ten minutes on — by sending
           exactly that payload again: whichever write lands, and in whatever order,
           008 ends with the one decision the claim made. A different decision is
           never possible for a claimed payment. */
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
        const body = await request.json().catch(() => ({}));
        const paymentId = clean(body && body.Payment_ID);
        if (!paymentId) return jsonRes({ ok: false, error: 'Payment_ID required' }, 400, cors);
        const by = adminLabel(identity);
        const resumed = await ledgerCall(env, 'payment-decision', { paymentId, action: 'resume', by });
        if (!resumed || resumed.ok !== true || !resumed.claim) {
          return jsonRes({ ok: false, error: (resumed && resumed.error) || 'nothing to resume', inProgress: !!(resumed && resumed.inProgress) }, 409, cors);
        }
        const c = resumed.claim, pl = c.payload || {};
        if (!pl.Record_Status || !pl.Verified_By || !pl.Verified_At) {
          return jsonRes({ ok: false, error: 'the claim on ' + paymentId + ' carries no fixed payload; it is reconciled by hand' }, 409, cors);
        }
        const src = await loadSource(env);
        try {
          await updatePaymentVerification(env, src.cfg, { Payment_ID: paymentId, decision: pl.Record_Status,
            verifiedBy: pl.Verified_By, verifiedAt: pl.Verified_At, rejectReason: pl.Reject_Reason });
        } catch (e) {
          if (e instanceof SourceDataError && e.code === 'SOURCE_ALREADY_DECIDED') {
            /* 008 is decided already: it completes the claim only if it holds the
               claim's OWN four values (Codex round 5) — read fresh, field by field */
            const now = await loadPaymentJournal(env, src.cfg, { fresh: true });
            const row = (now || []).find((r) => clean(r.Payment_ID) === paymentId) || {};
            const same = ['Record_Status', 'Verified_By', 'Verified_At', 'Reject_Reason'].every((f) => clean(row[f]) === clean(pl[f]));
            if (!same) {
              /* 008 holds something else than the claim decided — an edit nobody
                 here made. Nothing is overwritten; the claim and its lock stand for
                 Guest Relations to reconcile by hand. */
              return jsonRes({ ok: false, conflict: true, error: '008 holds ' + (clean(row.Record_Status) || 'another state') + ' for ' + paymentId +
                ' that is not the decision its claim fixed (' + pl.Record_Status + ' by ' + pl.Verified_By + '); nothing was changed — reconcile by hand' }, 409, cors);
            }
            /* Google already holds exactly this claim's row: it is completed below */
          } else if (e instanceof SourceDataError) {
            return jsonRes({ ok: false, error: clean(e.message).slice(0, 300), code: e.code }, 409, cors);
          } else {
            return jsonRes({ ok: false, outcomeUncertain: true, error: 'Google did not confirm; the claim stands — resume it again later',
              detail: clean(e && e.message).slice(0, 300) }, 503, cors);
          }
        }
        const closed = await ledgerCall(env, 'payment-decision', { paymentId, action: 'complete', token: c.token, by });
        if (!closed || closed.ok !== true) return jsonRes({ ok: false, error: (closed && closed.error) || 'the claim could not be completed' }, 409, cors);
        return jsonRes({ ok: true, Payment_ID: paymentId, decision: pl.Record_Status, completed: true, claim: closed.claim }, 200, cors);
      }
      case 'payment/verify': case 'payment/reject': {
        /* OWNER CLARIFICATION, 5 Oct 2026. The financial movement is immutable
         * for ever; the single administrative decision that was pending when
         * the guest reported it is completed exactly once, here. The adapter
         * refuses a second decision and any way back to REPORTED, and the
         * written range covers only the four verification columns. A wrong
         * VERIFIED movement is corrected by appending a REFUND or ADJUSTMENT
         * with its own Payment_ID, never by editing this row. */
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
        const body = await request.json().catch(() => ({}));
        const paymentId = clean(body && body.Payment_ID);
        if (!paymentId) return jsonRes({ ok: false, error: 'Payment_ID required' }, 400, cors);
        const by = adminLabel(identity);
        const src = await loadSource(env);
        const decision = op === 'payment/verify' ? RECORD_STATUS.VERIFIED : RECORD_STATUS.REJECTED;
        const row = (src.journalRows || []).find((r) => clean(r.Payment_ID) === paymentId) || null;
        if (!row) return jsonRes({ ok: false, error: 'no payment ' + paymentId + ' in 008_Payment_Journal' }, 404, cors);
        const rejectReason = clean(body.Reject_Reason).slice(0, 300);
        if (decision === RECORD_STATUS.REJECTED && !rejectReason) return jsonRes({ ok: false, error: 'a rejection must carry a Reject_Reason' }, 400, cors);
        const holder = clean(row.Holder_ID);
        const locks = decision === RECORD_STATUS.VERIFIED && !!holder
          && (clean(row.Entry_Type) || ENTRY_TYPE.PAYMENT) === ENTRY_TYPE.PAYMENT;
        /* THE FIRST VERIFIED PAYMENT LOCKS THE METHOD (Owner, 5 Oct 2026), and
           the lock is taken BEFORE the decision reaches Google, in the same
           ledger turn that claims the decision: the first claim wins, a second
           administrator is refused, and no preference change can land between
           the verification and its lock. */
        const pref = locks ? await preferenceOf(env, url.origin, holder, await holderState(env, holder), src) : null;
        const claim = await ledgerCall(env, 'payment-decision', { paymentId, action: 'claim', decision, rejectReason,
          holderId: holder || null, lockPreference: locks, channel: pref && pref.channel, source: pref && pref.source, by });
        if (!claim || claim.ok !== true || !claim.claim) {
          return jsonRes({ ok: false, error: (claim && claim.error) || 'the decision could not be claimed',
            decided: !!(claim && claim.decided), inProgress: !!(claim && claim.inProgress) }, 409, cors);
        }
        const token = clean(claim.claim.token);
        /* the claim's FIXED payload — the one any resumed write will send again */
        const pl = claim.claim.payload || {};
        /* THE FENCE (Codex final review, round 3): right before the write the ledger
           confirms the claim is still this writer's and names the deadline after
           which the transport sends nothing — a writer fenced off by a later
           resolution can never reach Google */
        let sent = false;
        const beforeWrite = async () => {
          const c = await ledgerCall(env, 'payment-decision', { paymentId, action: 'check', token, by });
          if (!c || c.ok !== true || !Number.isFinite(Number(c.notAfter))) {
            throw new SourceDataError('CLAIM_LOST', (c && c.error) || 'the decision claim could not be confirmed; nothing was written');
          }
          sent = true;
          return { notAfter: Number(c.notAfter) };
        };
        let written;
        try {
          written = await updatePaymentVerification(env, src.cfg, {
            Payment_ID: paymentId, decision: pl.Record_Status || decision, verifiedBy: pl.Verified_By || by,
            verifiedAt: pl.Verified_At, rejectReason: pl.Reject_Reason,
          }, { beforeWrite });
        } catch (e) {
          /* A WRITE WHOSE OUTCOME IS UNKNOWN STAYS CLAIMED. If the request may have
             reached Google (sent, and not certainly refused before sending), the
             claim and its lock stand until a BILLING_ADMIN resumes it with the same
             payload — a lost answer never unlocks a payment Google took. */
          if (sent && !(e && e.notSent === true)) {
            return jsonRes({ ok: false, outcomeUncertain: true, retry: false,
              error: 'Google did not confirm the decision on ' + paymentId + '; it stays claimed — resume it through payment/decision-resolve after ten minutes',
              detail: clean(e && e.message).slice(0, 300) }, 503, cors);
          }
          /* certainly not written: the claim is given back; its lock is lifted —
             unless 008 holds the payment VERIFIED already, which makes it final */
          const alreadyVerified = e instanceof SourceDataError && e.code === 'SOURCE_ALREADY_DECIDED' && /already VERIFIED/.test(clean(e.message));
          await ledgerCall(env, 'payment-decision', { paymentId, action: 'release', token, alreadyVerified, by }).catch(() => null);
          if (e instanceof SourceDataError && (e.code === 'SOURCE_ALREADY_DECIDED' || e.code === 'SOURCE_ROW_INCOMPLETE' || e.code === 'CLAIM_LOST')) {
            return jsonRes({ ok: false, error: clean(e.message).slice(0, 300), code: e.code }, 409, cors);
          }
          if (e instanceof SourceDataError && e.code === 'SOURCE_PAYMENT_NOT_FOUND') {
            return jsonRes({ ok: false, error: clean(e.message).slice(0, 300), code: e.code }, 404, cors);
          }
          throw e;
        }
        const closed = await ledgerCall(env, 'payment-decision', { paymentId, action: 'complete', token, by }).catch(() => null);
        const p = claim.preference || null;
        const preferenceLock = locks
          ? { locked: !!(p && p.lockedAt), Holder_ID: holder, Payment_Preference: p ? p.Payment_Preference : null,
            lockedBy: p ? p.lockedBy : null, claimClosed: !!(closed && closed.ok === true) }
          : null;
        return jsonRes({
          ok: true, ...written, preferenceLock,
          note: decision === RECORD_STATUS.VERIFIED
            ? 'this entry now affects the calculated balance'
            : 'a rejected entry never affects the balance',
          columns: PAYMENT_JOURNAL_COLUMNS,
        }, 200, cors);
      }
      default:
        return jsonRes({ ok: false, error: 'unknown billing operation' }, 404, cors);
    }
  } catch (e) {
    return sourceFailure(e, cors);
  }
}
