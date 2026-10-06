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
  PAYMENT_JOURNAL_COLUMNS, loadGuestNationalities, nationalityOf, prefetchTabs, SOURCE_TAB_KEYS,
} from './billing/source.js';
import { pricingSource, catalogueKey } from './billing/catalogue-cache.js';
import { effectivePreference, routeFor, destinationOf, firstVerifiedPayment, isChannel, PREFERENCE_SOURCE } from './billing/preference.js';
import { GoogleSheetsUnavailable } from './google-sheets.js';
import { calculate, perPerson } from './billing/engine.js';
import {
  buildSnapshot, canIssue, dueDateFor, freezeFx, inPreferredCurrency,
  paymentStatus, isDuplicateSuspect, nextRevisionState,
} from './billing/settlement.js';
import { loadConfirmedBookings, unmappedProducts, siteKeyOfSelection } from './billing/bookings.js';
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
async function loadSource(env, asOf) {
  /* ONE read request for the five tabs (values:batchGet · Owner, 6 Oct 2026). The
     prefetched grids serve these five loaders only and never leave this function:
     `cfg` below is the plain configuration, so every later read — above all the
     check before a payment decision is written — goes to Google again (round 7). */
  const base = { ...cfgOf(env), asOf: evaluationDay(asOf) };
  const pre = await prefetchTabs(env, base, SOURCE_TAB_KEYS);
  const [items, specialRates, evidenceRows, journalRows, configRows] = await Promise.all([
    loadItems(env, pre), loadSpecialRates(env, pre), loadEvidenceIndex(env, pre),
    loadPaymentJournal(env, pre), loadBillingConfig(env, pre),
  ]);
  const cfg = base;
  /* the two integration checks the Owner made gate conditions (5 Oct 2026) */
  const { duplicates } = siteProductKeyIndex(items);
  return {
    cfg, items, specialRates, evidenceRows, journalRows, configRows,
    siteKeyDuplicates: duplicates,
    nightsGaps: nightsGaps(items),
  };
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

/** The engine result for one Holder — the ONE calculation path (Freeze · V). */
async function calculateHolder(env, identity, holderId, src, asOf, origin) {
  if (!clean(identity && identity.guestId)) identity = await holderIdentity(env, origin, holderId);
  const state = await holderState(env, holderId);
  const bookings = await loadConfirmedBookings({
    env, identity, holderId, items: src.items,
    generations: (state && state.generations) || {},
    overrides: (state && state.overrides) || {},
  });
  const result = calculate(bookings, { items: src.items, specialRates: src.specialRates, asOf: evaluationDay(asOf) });
  return { state, bookings, result, unmapped: unmappedProducts(bookings),
    confirmation: (bookings && bookings.confirmation) || { state: 'NONE' } };
}

/* ------------------------------------------------------------------ guest */

async function guestSettlement(env, identity, url, cors) {
  const holderId = clean(identity.invitationId);
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
    /* the figures stand only on the trip Guest Relations confirmed (Freeze · A) */
    bookingConfirmation: confirmation,
    payment: pay,
    Payment_Preference: channel,
    paymentPreference: preferenceView(pref, issued, env),
    amountInPreferredCurrency: channel ? inPreferredCurrency(pay.balanceCents, channel, fx) : null,
    fx: { source: fxSource, revision: issued ? issued.Revision : null,
      FX_USD_THB: fx.FX_USD_THB, FX_USD_EUR: fx.FX_USD_EUR, gaps: fx.gaps },
    dueDate,
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

async function servePdf(env, identity, url, cors) {
  const admin = isBillingAdmin(identity);
  const askedHolder = clean(url.searchParams.get('holder'));
  const holderId = admin && askedHolder ? askedHolder : clean(identity.invitationId);

  const state = await holderState(env, holderId);
  const settlementId = state.Settlement_ID;
  if (!settlementId) return jsonRes({ ok: false, error: 'no settlement' }, 404, cors);

  const rev = Number(url.searchParams.get('rev')) || (state.issuedRevision && state.issuedRevision.Revision);
  if (!rev) return jsonRes({ ok: false, error: 'no issued revision' }, 404, cors);

  const key = pdfKey(settlementId, rev);
  if (!env.DOCS) return jsonRes({ ok: false, error: 'document store unavailable' }, 503, cors);

  let obj = await env.DOCS.get(key);
  if (!obj) {
    /* First read of an issued revision renders it ONCE from the immutable
     * snapshot and stores it write-once; it is never re-rendered after that. */
    const view = await ledgerCall(env, 'read', { holderId, revision: rev });
    const one = view && view.ok === true && view.holder ? view.holder.revision : null;
    const snapshot = one && one.snapshot && Number(one.snapshot.Revision) === rev ? one.snapshot : null;
    if (!snapshot) return jsonRes({ ok: false, error: 'no snapshot for that revision' }, 404, cors);
    const bytes = renderSettlementPdf(snapshot, {});
    await env.DOCS.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
    obj = await env.DOCS.get(key);
  }
  return new Response(obj.body, {
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
  /* FX is resolved for the issue day before anything else, and this very pair
   * is the one the ledger checks and freezes (Owner · 4) */
  const fx = freezeFx(resolveFx(src.configRows, asOf));
  const sourceGaps = sourceGapsOf(src);
  let revision = asked;
  let settlementId = null;
  const origin = new URL(request.url).origin;

  /* the payment method the statement will be issued with: stored, or the
     register's nationality default — never guessed (Owner, 5 Oct 2026) */
  const pref = await preferenceOf(env, origin, holderId, await holderState(env, holderId), src);
  if (!pref.determined) {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['PAYMENT_PREFERENCE_UNDETERMINED: ' + pref.reason + ' — a BILLING_ADMIN states the method first'] }, 409, cors);
  }
  const destination = destinationOf(pref.channel, env);
  if (!destination || !destination.complete) {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['PAYMENT_DESTINATION_INCOMPLETE: ' + pref.channel + ' has no configured account'] }, 409, cors);
  }

  /* THE CURRENT SOURCE DECIDES (Codex final review, 5 Oct 2026): the gate
     conditions are re-judged on this issue's inputs and this Holder's drift is
     detected now — 010 evidence included — never only read from an older store */
  const gateCheck = (({ caseResults, siteKeyDuplicates, nightsGaps }) => ({ caseResults, siteKeyDuplicates, nightsGaps }))(gateInputs(src, asOf));
  const current = await calculateHolder(env, { invitationId: holderId, guestId: null }, holderId, src, asOf, origin);
  /* NOTHING CONFIRMED, NOTHING ISSUED (Freeze · A): the statement stands on the
     version of the trip Guest Relations confirmed — never on a hold the guest
     has not sent, or on a sent change nobody has confirmed yet */
  if (!current.confirmation || current.confirmation.state !== 'CONFIRMED') {
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['BOOKING_NOT_CONFIRMED: ' + ((current.confirmation && current.confirmation.state) || 'NONE') +
        ' — Guest Relations confirms the sent trip first'] }, 409, cors);
  }
  /* judged against the revision ABOUT TO BE ISSUED — the current engine
     result — not against an older issued snapshot it supersedes: quota, 010
     evidence and the journal on today's source */
  const currentDrifts = detectDrift({
    snapshot: null, result: current.result,
    items: src.items, specialRates: src.specialRates, bookings: current.bookings,
    evidenceRows: src.evidenceRows, journalRows: src.journalRows, cartLines: [], asOf, holderId,
    settlementId: current.state.Settlement_ID || null,
  }).map((d) => ({ code: d.code, detail: d.detail || d.message || '' }));

  if (revision == null) {
    const { state, result } = current;
    const gate = await readGate(env);
    const decision = canIssue({
      result, drifts: [...await readDrifts(env, holderId), ...currentDrifts],
      activationGateApproved: gate.approved, fx, sourceGaps,
    });
    if (!decision.allowed) {
      return jsonRes({ ok: false, error: 'Issue & Publish is blocked', reasons: decision.reasons }, 409, cors);
    }
    settlementId = state.Settlement_ID;
    if (!settlementId) {
      const made = await ledgerCall(env, 'settlement', { holderId, create: true, by });
      settlementId = made && made.ok === true && made.settlement ? clean(made.settlement.Settlement_ID) : '';
      if (!settlementId) return jsonRes({ ok: false, error: (made && made.error) || 'the ledger allocated no Settlement' }, 409, cors);
    }
    const created = await ledgerCall(env, 'revision-create', { holderId, result, by });
    revision = created && created.ok === true && created.revision ? Number(created.revision.Revision) : null;
    if (!Number.isInteger(revision)) return jsonRes({ ok: false, error: (created && created.error) || 'the ledger created no revision' }, 409, cors);
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
    sourceHash: await sourceHash({ items: src.items, specialRates: src.specialRates }),
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

export async function handleBilling(request, env, url, cors) {
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
