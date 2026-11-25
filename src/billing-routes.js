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
import { effectivePreference, routeFor, statedNationality, destinationOf, firstVerifiedPayment, isChannel, PREFERENCE_SOURCE } from './billing/preference.js';
import { GoogleSheetsUnavailable, batchReadRanges } from './google-sheets.js';
import { calculate, perPerson, matchSpecialRate, COUPLE_PERSONS } from './billing/engine.js';
import { unitOf as roomUnitOf, COUPLE_GUESTS } from './rooms.js';
import { SEED as ROOM_SEED } from './inventory-seed.js';
import { arrivalsBase, factsOf as arrivalFactsOf, confirmationNeeded as arrivalConfirmationNeeded, ARRIVAL_FACTS_MAX, ARRIVALS_VERSION } from './billing/arrivals.js';
import { ASSIGNMENTS_VERSION, EVENTS as ASSIGNMENT_EVENTS, coupleOfEntries, guestsOfIndex, personName, attendanceOf, rosterOf, staysOf, occupancyOf, hotelRoomsMeta, hotelChecksOf, seatChangeOf, roomChangeOf, roomMovesOf, sentRoomLines, confirmationDecides } from './billing/assignments.js';
import { priceDifference } from './billing/price-difference.js';
import {
  buildSnapshot, canIssue, dueDateFor, freezeFx, inPreferredCurrency,
  paymentStatus, isDuplicateSuspect, nextRevisionState,
} from './billing/settlement.js';
import { loadConfirmedBookings, unmappedProducts, siteKeyOfSelection, nightsOf, selectionLinesOf, registrationState } from './billing/bookings.js';
import { OWNER_BOOKING_STATE, obkKey, OBK_INDEX_KEY, readRecord, stateOf as ownerStateOf, stageOf, keyStage, holdPlan, applyAction, toBookings, occupancy, problemsOf, combinedConfirmation } from './billing/owner-bookings.js';
import { canonicalLines, canonicalKey } from './legacy-keys.js';
import { isPrintable } from './billing/pdf.js';
import { CURRENT_LAYOUT, LAYOUT_12, layoutOfRevision, ISSUE_RULES } from './billing/pdf-layouts.js';
import { pdfOptionsFor, renderIssuedPdf } from './billing/pdf-writers.js';
import { recipientOfIssue } from './billing/recipient.js';
import { wordsForIssue, paymentOptionsFor, optionView, correctionOf, bankOfIssue } from './billing/statement-inputs.js';
import { qrImageOf } from './billing/pdf-image.js';
import { buildRevenueOverview } from './billing/revenue.js';
import { buildBudgetComparison } from './billing/budget.js';
import { BUDGET_TABS, rangeOfTab, parseBudget004, parseVendors007, parseItemDisplay, parseSpecialRateRows, parseRoomList012 } from './billing/budget-source.js';
import { VENDORS } from './billing/budget-map.js';
import { quickFinanceOf, participationOf } from './billing/quick-overview.js';
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
  return stateOfView(v, holderId);
}

/** The ledger's raw views of several holders in ONE request (read-many) — Map(id → view); judged per holder by the caller. */
async function holderViews(env, holderIds) {
  const ids = [...new Set((holderIds || []).map(clean).filter(Boolean))];
  const out = new Map();
  if (!ids.length) return out;
  const reply = await ledgerCall(env, 'read-many', { holderIds: ids });
  const views = reply && reply.ok === true && Array.isArray(reply.holders) ? reply.holders : null;
  if (!views || views.length !== ids.length) throw new LedgerContractError('the billing ledger returned no holder views');
  ids.forEach((id, i) => out.set(id, views[i] && typeof views[i] === 'object' ? views[i] : null));
  return out;
}
/* a REG_KV that answers a repeated read of the same key from this request's first answer (raw values only, never an error);
   for read-only routes — a route that re-reads before it writes must use the real binding */
function memoKv(kv) {
  if (!kv || typeof kv.get !== 'function') return kv;
  const seen = new Map();
  return new Proxy(kv, { get(target, prop) {
    if (prop !== 'get') { const v = target[prop]; return typeof v === 'function' ? v.bind(target) : v; }
    return (key, type) => {
      const t = typeof type === 'string' ? type : (type && type.type) || 'text';
      if (t !== 'text' && t !== 'json') return target.get(key, type);   /* streams and buffers: never shared */
      const k = String(key);
      if (!seen.has(k)) seen.set(k, Promise.resolve(target.get(key)).catch((e) => { seen.delete(k); throw e; }));
      /* each reader gets its own value: the raw text, or a fresh parse of it */
      return seen.get(k).then((raw) => (t === 'json' ? (raw == null ? null : JSON.parse(raw)) : raw));
    };
  } });
}
/** Many holders' states in ONE ledger request (the Revenue Overview) — the same checks as holderState, holder by holder. */
async function holderStates(env, holderIds) {
  const out = new Map();
  for (const [id, view] of await holderViews(env, holderIds)) out.set(id, stateOfView(view, id));
  return out;
}

function stateOfView(v, holderId) {
  if (!v || clean(v.Holder_ID) !== clean(holderId)) {
    throw new LedgerContractError('the billing ledger returned no holder view for ' + holderId);
  }
  const s = v.settlement && typeof v.settlement === 'object' ? v.settlement : null;
  let issuedRevision = null, issuedRecord = null;
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
    issuedRecord = Object.freeze({ Pdf_Layout: rec.Pdf_Layout || null, Recipient: rec.Recipient || null, Person_Names: rec.Person_Names || null,
      Item_Words: rec.Item_Words || null, Payment_Options: rec.Payment_Options || null, Payment_Bank: rec.Payment_Bank || null,
      Correction: rec.Correction || null });
  }
  return {
    Holder_ID: v.Holder_ID,
    Settlement_ID: s ? s.Settlement_ID : null,
    state: v.state || null,
    settlement: s,
    latestRevision: s ? Number(s.latestRevision) || 0 : 0,
    issuedRevision,
    /* what the issued revision froze beside its snapshot (layout, names, words, ways to pay — HS-004) */
    issuedRecord,
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
  const nat = nationalityOf(reg, who.contactId);
  const stated = await statedOf(env, holderId, who, nat);
  const route = routeFor({ holderId, nationality: nat, stated });
  const verified = firstVerifiedPayment(src.journalRows, state.Settlement_ID);
  /* a VERIFIED payment in 008 locks the method even before the ledger has recorded the lock: a stored default never gives way then */
  const rec = state.paymentPreference;
  const pref = effectivePreference({ record: verified && rec && !clean(rec.lockedAt) ? { ...rec, lockedAt: 'VERIFIED_IN_008' } : rec, route });
  return {
    ...pref,
    locked: pref.locked || !!verified,
    lockedBy: (state.paymentPreference && state.paymentPreference.lockedBy) || (verified ? clean(verified.Payment_ID) : null),
    verifiedPaymentId: verified ? clean(verified.Payment_ID) : null,
    /* the method that first verified payment used — what a lock records (HS-004.19) */
    verifiedMethod: verified && isChannel(clean(verified.Method)) ? clean(verified.Method) : null,
  };
}

/* THE GUEST'S OWN WORD (Owners, 18 Nov 2026): read only where the person's 006 row holds no nationality — two KV reads, nothing else */
async function statedOf(env, holderId, who, nat) {
  if (!nat || !nat.found || clean(nat.value)) return null;
  /* a read that fails is said as such — never taken for "nothing there" */
  const read = async (key) => { if (!env.REG_KV) throw new Error('no store'); const raw = await env.REG_KV.get(key); return raw ? JSON.parse(raw) : null; };
  try {
    const [record, contact] = await Promise.all([read('reg:' + holderId), read('contact:' + holderId)]);
    return statedNationality({ record, contact, guestId: who.guestId, contactId: who.contactId });
  } catch (e) { return statedNationality({ unreadable: true }); }
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
async function calculateHolder(env, identity, holderId, src, asOf, origin, assume, known, opts) {
  if (!clean(identity && identity.guestId)) identity = await holderIdentity(env, origin, holderId);
  /* `known`: the holder's state already read in a batch (the Revenue Overview) — never a second ledger request */
  const state = known || await holderState(env, holderId);
  const registered = await loadConfirmedBookings({
    env, identity, holderId, items: src.items,
    generations: (state && state.generations) || {},
    overrides: (state && state.overrides) || {},
    ...(assume ? { assume } : {}),
  });
  const regConfirmation = (registered && registered.confirmation) || { state: 'NONE' };
  /* THE OWNERS' OWN BOOKINGS (15 Nov 2026): billed beside the guest's confirmed trip once the Owners confirmed them; the
     guest's own view (opts.owner === false) keeps to the trip they sent until a statement is issued */
  const owner = opts && opts.owner === false ? null : await ownerBookingsOf(env, holderId, src, { guestId: identity && identity.guestId, origin, asOf: evaluationDay(asOf) });
  const bookings = owner && owner.state === OWNER_BOOKING_STATE.CONFIRMED ? [...registered, ...owner.rows] : [...registered];
  const result = calculate(bookings, { items: src.items, specialRates: src.specialRates, asOf: evaluationDay(asOf) });
  return { state, bookings, result, unmapped: unmappedProducts(bookings),
    confirmation: owner ? combinedConfirmation(regConfirmation, owner.view) : regConfirmation, owner, regConfirmation };
}

/**
 * THE OWNERS' BOOKINGS OF ONE PAYING INVITATION (src/billing/owner-bookings.js) — the record, its state, the engine rows and
 * what stands in the way of billing them: an extra bed without its own 009 row, a room over its capacity, a person the same
 * stay is already booked for elsewhere (their own sent trip, or another paying invitation's record — read at calculation
 * time, not only when an entry was recorded). An unreadable record fails the calculation; it is never taken as empty.
 */
async function ownerBookingsOf(env, holderId, src, ctx) {
  if (!env.REG_KV) return null;
  const c = ctx || {};
  const rec = readRecord(await env.REG_KV.get(obkKey(holderId)));
  const st = ownerStateOf(rec);
  const unreadable = [];
  let index = {};
  const rawIndex = await env.REG_KV.get(OBK_INDEX_KEY);
  if (rawIndex) { try { index = JSON.parse(rawIndex) || {}; } catch (e) { index = {}; unreadable.push('the index of recorded persons'); } }
  const recordOf = async (h) => { try { return readRecord(await env.REG_KV.get(obkKey(h))); } catch (e) { unreadable.push('the record of ' + h); return null; } };
  const elsewhere = [];
  /* the persons this payer recorded: their own sent trip, and other payers' records */
  for (const p of [...new Set(rec.entries.map((e) => e.personId))]) {
    const own = 'INV-' + p;
    const reg = await kvJson(env, 'reg:' + own);
    const sels = reg && reg.submissionId && reg.registration ? reg.registration.selections : null;
    if (sels) for (const l of selectionLinesOf(sels)) {
      const key = siteKeyOfSelection(l); if (key) elsewhere.push({ personId: p, stage: keyStage(key), by: own + '\'s own sent trip' });
    }
    for (const other of (Array.isArray(index[p]) ? index[p] : []).filter((h) => h !== holderId)) {
      const o = await recordOf(other);
      for (const e of (o && o.entries) || []) if (e.personId === p) elsewhere.push({ personId: p, stage: stageOf(src.items, e.itemId), by: 'the record of ' + other });
    }
  }
  /* THE OTHER WAY ROUND (review, 15 Nov 2026): this invitation's own person, recorded by another payer for a stay their own sent trip
     books too — named on this statement as well, so neither statement bills the stay twice */
  const ownPerson = clean(c.guestId);
  const recordedElsewhere = ownPerson ? (Array.isArray(index[ownPerson]) ? index[ownPerson] : []).filter((h) => h !== holderId) : [];
  const reverse = [];
  if (recordedElsewhere.length) {
    const reg = await kvJson(env, 'reg:' + holderId);
    const sels = reg && reg.submissionId && reg.registration ? reg.registration.selections : null;
    const mine = new Set(sels ? selectionLinesOf(sels).map((l) => siteKeyOfSelection(l)).filter(Boolean).map(keyStage) : []);
    for (const other of recordedElsewhere) {
      const o = await recordOf(other);
      for (const e of (o && o.entries) || []) {
        const stage = stageOf(src.items, e.itemId);
        if (e.personId === ownPerson && mine.has(stage)) reverse.push('DOUBLE_BOOKING: ' + ownPerson + ' has the ' + stage + ' stay in their own trip and in the record of ' + other);
      }
    }
  }
  let active = null;
  if (c.origin && rec.entries.length) {
    /* fail closed: a register that cannot be read is named, never taken as "everyone is still active" */
    try { const list = holdersOfIndex(await loadIndex(env, c.origin, false)).filter((h) => !h.ambiguous && h.guestId); if (!list.length) throw new Error('empty'); active = new Set(list.map((h) => h.guestId)); }
    catch (e) { active = null; unreadable.push('the register (who is still an active guest)'); }
  }
  const problems = [...new Set([...problemsOf({ holderId, rec, items: src.items, specialRates: src.specialRates, elsewhere, asOf: c.asOf, active, unreadable }), ...reverse])];
  return { rec, state: st, rows: st === OWNER_BOOKING_STATE.NONE ? [] : toBookings(holderId, rec, src.items, nightsOf), problems,
    view: { state: st, rev: rec.rev, confirmedBy: rec.confirmed && rec.confirmed.by, confirmedAt: rec.confirmed && rec.confirmed.at } };
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
  const { state, result, unmapped, confirmation } = await calculateHolder(env, identity, holderId, src, asOf, undefined, undefined, undefined, { owner: false });

  const settlementId = state && state.Settlement_ID;
  const issued = state.issuedRevision;
  /* AN ISSUED STATEMENT CONVERTS ONLY WITH ITS OWN FROZEN FX (Freeze · M, R).
   * Today's 011 rate is never applied to it. Only while nothing is issued is
   * the currently effective approved rate used, as a preview. */
  const fx = issued
    ? freezeFx({ FX_USD_THB: issued.FX_USD_THB, FX_USD_EUR: issued.FX_USD_EUR })
    : freezeFx(resolveFx(src.configRows, await fxReferenceDay(env, asOf || utcDay())));   /* the project's reference (17 Nov 2026) */
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
                    : freezeFx(resolveFx(src.configRows, await fxReferenceDay(env, reportedAt.slice(0, 10))));

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
/** ONE prospective booking of one Item for this person, priced by the one engine — never stored. Gate F1 (src/pricing-guard.mjs) runs it too. */
export function quoteOfItem(itemId, item, src, holderId, personId, asOf) {
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
    /* 002's own Standard_Rate per person per night, at 002's precision (closeout, 7 Oct 2026): the figure the website lists
       beside a stay — a hotel the guest pays directly included — so the website never keeps a rate of its own */
    listRate: listRateOf(item),
    /* already paid by H&S for this guest (a 009 Billing_Category): the guest repays it — the item's own category */
    paidByHS: line && line.categoryOverride ? line.categoryOverride.from || null : null,
  };
}
export function listRateOf(item) {
  /* the website labels it "per person per night" and multiplies it by the nights: nothing else is sent */
  if (!item || clean(item.Rate_Basis) !== 'PER_PERSON_PER_NIGHT' || clean(item.Rate_Status) !== 'ACTIVE') return null;
  const raw = item.Standard_Rate;
  if (raw == null || clean(raw) === '') return null;
  const v = typeof raw === 'number' ? raw : Number(String(raw).replace(/[, ]/g, ''));
  return Number.isFinite(v) && v > 0 ? v : null;
}
const keysOfItem = (item) => clean(item && item.Site_Product_Key).split(/[,|]/).map(clean).filter(Boolean);

/** The shared pricing source — held about a minute (catalogue-cache.js) unless `fresh`. */
function pricing(env, asOf, fresh) {
  return pricingSource(catalogueKey(env.SHEETS_ID, asOf), () => loadSource(env, asOf), { fresh: !!fresh });
}

/**
 * THE SUBMITTED TRIP'S STAYS H&S ALREADY PAID (Edit 10, Owner, 7 Oct 2026). Which of these lines the engine prices, for this
 * very person, as a booking Haruthai & Suthep already paid (a 009 Billing_Category) — from the same shared pricing source the
 * catalogue reads. The trip e-mails and Guest Relations' record say "already paid" only for a line the server knows this way; a
 * device's claim counts for nothing. Returns Map(site product key → { total }). Throws when the source cannot be read.
 */
export async function paidByHSOf(env, holderId, personId, lines, asOf) {
  const out = new Map();
  if (!env.SHEETS_ID || !Array.isArray(lines) || !lines.length) return out;
  const day = evaluationDay(asOf);
  /* read FRESH (Owner, 8 Oct 2026 · closeout): the amount a sent trip states for a stay H&S paid is Google's at the moment of
     sending, never a held or stale copy — a failed read throws, and the caller says "Price to follow" */
  const src = await pricing(env, day, true);
  const { index } = siteProductKeyIndex(src.items);
  for (const l of lines) {
    const key = siteKeyOfSelection(l);
    const itemId = key && index[key];
    if (!itemId) continue;
    const q = quoteOfItem(itemId, src.items[itemId], src, clean(holderId), clean(personId), day);
    if (q.paidByHS) out.set(key, { total: q.total });
  }
  return out;
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
    /* THE COMPLETE STATEMENT (Owners, 18 Nov 2026): the payment section — the method frozen with this revision, its amount at the
       frozen rate, the payee, the account or the approved payment code — read once, here, from the authoritative payment source,
       and frozen into the write-once PDF; an existing PDF is never rendered again (above) */
    /* a version already replaced carries no instruction to pay (it points to the current one) */
    const current = Number(state.issuedRevision && state.issuedRevision.Revision) || null;
    /* THE LAYOUT OF THIS REVISION (HS-004.7): its own — a revision issued before layouts were recorded is the frozen 1.2 writer's,
       exactly as before; a layout this build does not know is never guessed */
    const layout = layoutOfRevision(one);
    if (!layout) return { status: 500, error: 'the revision names a PDF layout this build cannot render; nothing was produced' };
    if (layout !== LAYOUT_12 && !(one.Recipient && one.Person_Names && one.Item_Words)) return { status: 500, error: 'the revision carries no frozen recipient; nothing was produced' };
    const payment = current && rev !== current ? { supersededBy: 'V' + current }
      : layout === LAYOUT_12 ? await paymentForPdf(env, snapshot) : await paymentOptionsForPdf(env, snapshot, one.Payment_Options, one.Payment_Bank || null);
    /* FAIL CLOSED: a payment section that cannot be read completely just now (the code, the account) is never frozen into the
       original — nothing is stored, the request is answered "try again", the e-mail records NOT_SENT */
    if (payment.incomplete) return { status: 503, error: 'the statement cannot be prepared just now (' + payment.incomplete + '); please try again in a moment' };
    const bytes = renderIssuedPdf(layout, snapshot, pdfOptionsFor(layout, one, payment));
    await env.DOCS.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { writer: layout,
      method: clean(payment.method || (payment.options || []).map((o) => o.method).join('+')) || '', qrSha256: payment.qrSha256 || '',
      /* whether this original prints the frozen bank and BIC (HS-PROMPT-040) — absent for every revision issued before them */
      bank: one && one.Payment_Bank ? 'frozen' : '' } });
    obj = await env.DOCS.get(key);
    if (!obj) return { status: 503, error: 'the statement could not be stored' };
  }
  return { obj, settlementId, revision: rev };
}

/* the payment facts of one issued revision, exactly as the guest's statement page shows them (assets/statement.js · How to pay):
   the snapshot's frozen method and rates, the destination of src/billing/preference.js (the IBAN from its Worker secret), the
   approved payment code from the document store — nothing invented; what cannot be read is left out and the PDF says where to
   find it (My Profile) */
async function paymentForPdf(env, snapshot) {
  const total = Number(snapshot && snapshot.Total_Payable_Cents);
  if (!Number.isFinite(total) || total <= 0) return { nothingDue: Number.isFinite(total) && total <= 0, method: null };
  const channel = clean(snapshot && snapshot.Payment_Preference);
  /* the method and its currency frozen with the revision must agree, or no instruction is printed (Guest Relations tells) */
  if (!isChannel(channel) || (clean(snapshot.Payment_Currency) && clean(snapshot.Payment_Currency) !== CHANNEL_CURRENCY[channel])) return { method: null };
  const dest = destinationOf(channel, env) || {};
  if (channel === 'SEPA_EUR' && !dest.iban) return { incomplete: 'the bank account is not configured' };
  const fx = { FX_USD_THB: snapshot.FX_USD_THB, FX_USD_EUR: snapshot.FX_USD_EUR };
  let qr = null, qrSha256 = '';
  if (QR_KEYS[channel]) {
    if (!env.DOCS) return { incomplete: 'the document store is not reachable' };
    let raw = null;
    try { const obj = await env.DOCS.get(QR_KEYS[channel]); raw = obj ? new Uint8Array(await obj.arrayBuffer()) : null; } catch (e) { raw = null; }
    if (!raw) return { incomplete: 'the approved payment code cannot be read' };
    qr = await qrImageOf(raw);
    if (!qr) return { incomplete: 'the approved payment code cannot be embedded' };
    qrSha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map((x) => x.toString(16).padStart(2, '0')).join('');   /* the code's own bytes — which approved image this PDF carries */
  }
  return { method: channel, amount: inPreferredCurrency(total, channel, fx), totalUsd: fromCents(total),
    dueDate: clean(snapshot.Due_Date) || null, recipient: dest.recipient || null, iban: dest.iban || null, reference: clean(snapshot.Settlement_ID) || null, qr, qrSha256 };
}

/* LAYOUT 1.3 · every way to pay the revision froze (HS-004.16), each read completely or the PDF is not produced (fail closed) */
async function paymentOptionsForPdf(env, snapshot, frozenOptions, frozenBank) {
  const total = Number(snapshot && snapshot.Total_Payable_Cents);
  if (!Number.isFinite(total) || total <= 0) return { nothingDue: Number.isFinite(total) && total <= 0, options: [] };
  const channel = clean(snapshot && snapshot.Payment_Preference);
  if (!isChannel(channel) || (clean(snapshot.Payment_Currency) && clean(snapshot.Payment_Currency) !== CHANNEL_CURRENCY[channel])) return { method: null, options: [] };
  const methods = (Array.isArray(frozenOptions) && frozenOptions.length ? frozenOptions : [channel]).map(clean).filter(isChannel);
  const fx = { FX_USD_THB: snapshot.FX_USD_THB, FX_USD_EUR: snapshot.FX_USD_EUR };
  const options = [], shas = [];
  for (const m of methods) {
    const dest = destinationOf(m, env) || {};
    if (m === 'SEPA_EUR' && !dest.iban) return { incomplete: 'the bank account is not configured' };
    let qr = null;
    if (QR_KEYS[m]) {
      if (!env.DOCS) return { incomplete: 'the document store is not reachable' };
      let raw = null;
      try { const obj = await env.DOCS.get(QR_KEYS[m]); raw = obj ? new Uint8Array(await obj.arrayBuffer()) : null; } catch (e) { raw = null; }
      if (!raw) return { incomplete: 'the approved payment code cannot be read' };
      qr = await qrImageOf(raw);
      if (!qr) return { incomplete: 'the approved payment code cannot be embedded' };
      shas.push([...new Uint8Array(await crypto.subtle.digest('SHA-256', raw))].map((x) => x.toString(16).padStart(2, '0')).join(''));
    }
    options.push(optionView(m, total, fx, dest, qr, frozenBank || null));
  }
  return { options, totalUsd: fromCents(total), dueDate: clean(snapshot.Due_Date) || null, reference: clean(snapshot.Settlement_ID) || null, qrSha256: shas.join('+') };
}

async function pdfStateOf(env, sid, x) {
  if (!sid || !(x.Revision_State === 'ISSUED' || x.Revision_State === 'SUPERSEDED') || !env.DOCS || typeof env.DOCS.head !== 'function') return null;
  try { const h = await env.DOCS.head(pdfKey(sid, x.Revision)); return h ? { produced: true, writer: (h.customMetadata && h.customMetadata.writer) || 'guest-settlement-pdf/1.1 or earlier' } : { produced: false, layout: layoutOfRevision(x) }; } catch (e) { return null; }
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
  OWNER_RECORDED: 'the bookings Haruthai & Suthep recorded are not confirmed in this version — confirm them in "Recorded by Haruthai & Suthep"',
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
/* THE PROJECT'S EXCHANGE-RATE REFERENCE (Owners, 17 Nov 2026): every statement and every revision freezes the Google 011 rates in
   effect on the day the project's first statement was issued (the ledger's earliest issued Issue_Date, immutable); before any
   statement exists, the day of issue. Never a new rate source and never a change to a statement already issued. */
async function fxReferenceDay(env, day) {
  try { const r = await ledgerCall(env, 'fx-reference', null); if (r && r.ok && /^\d{4}-\d{2}-\d{2}$/.test(clean(r.firstIssueDate))) return clean(r.firstIssueDate); } catch (e) { /* the day itself */ }
  return day;
}

/* the names the statement will carry (HS-004.6): the served index and the 006 register — read once per request */
async function namesForIssue(env, origin, holderId, src, lines) {
  let entries = {};
  try { entries = await loadIndex(env, origin, false); } catch (e) { entries = {}; }
  let register = src && src.register;
  if (!register) {
    try { register = await loadGuestRegister(env, await prefetchTabs(env, cfgOf(env), ['guestlist'])); } catch (e) { register = null; }
    if (register && src && Object.isExtensible(src)) src.register = register;
  }
  return recipientOfIssue({ entries, register, holderId, lines, printable: isPrintable });
}

async function assessIssue(env, holderId, src, asOf, origin, opts) {
  const o = opts || {};
  /* THE WHAT-IF of the confirmation dialog (admin/confirm GET): the sent version as if confirmed — never issued from */
  const assume = Number.isInteger(o.assumeConfirmedVersion) ? { version: o.assumeConfirmedVersion } : null;
  const fx = freezeFx(resolveFx(src.configRows, await fxReferenceDay(env, evaluationDay(asOf))));
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
  if (confirmation.state !== 'CONFIRMED') reasons.push('BOOKING_NOT_CONFIRMED: ' + (confirmation.state || 'NONE') + ' — ' + (confirmation.ownerRecorded && confirmation.ownerRecorded.state === OWNER_BOOKING_STATE.RECORDED && confirmation.state === 'UNCONFIRMED'
    ? CONFIRMATION_WORDS.OWNER_RECORDED : (CONFIRMATION_WORDS[confirmation.state] || CONFIRMATION_WORDS.NONE)));
  /* the Owners' bookings: what stands in the way of billing them (an unpriced extra bed, a room over capacity, a double booking) */
  if (current.owner && current.owner.problems && current.owner.problems.length) reasons.push(...current.owner.problems.map((x) => 'OWNER_BOOKING · ' + x));
  /* an extra bed a guest booked themselves is priced only by their own 009 row (pricing guard C2, 17 Nov 2026) */
  reasons.push(...await extraBedReasons(env, current, src, asOf).catch(() => ['EXTRA_BED_UNCHECKED: the room list could not be read just now — the extra bed of this statement cannot be checked']));
  if (!verdict.allowed) reasons.push(...verdict.reasons);
  if (gateNow && !gateNow.approved) reasons.push(...gateNow.open.map((o) => 'GATE_NOW: ' + o));
  /* THE RECIPIENT (HS-004.6 · critical): every statement names its recipient and every person on its lines in full — missing,
     ambiguous or unprintable names block the issue; the product words (HS-004.9) and the ways to pay (HS-004.16) likewise */
  const names = await namesForIssue(env, origin, holderId, src, current.result.lines);
  const words = wordsForIssue(current.result.lines, src.items);
  const paymentOptions = paymentOptionsFor(pref);
  /* with SEPA, the account holder, bank and BIC are frozen with the version (HS-PROMPT-040) — all three, or no issue */
  const paymentBank = bankOfIssue(paymentOptions, destinationOf('SEPA_EUR', env));
  const statementBlockers = [...names.reasons];
  if (paymentBank && paymentBank.missing) statementBlockers.push('PAYMENT_BANK_INCOMPLETE: the bank transfer cannot name its bank and BIC for the configured account');
  if (words.missing.length) statementBlockers.push('ITEM_NAME_MISSING: ' + words.missing.join(', ') + ' — the statement has no name for this product');
  for (const m of paymentOptions) { const d = destinationOf(m, env); if (!d || !d.complete) statementBlockers.push('PAYMENT_DESTINATION_INCOMPLETE: ' + m + ' has no configured account'); }
  /* no corrected statement dated before 21 November 2026 (Owners, HS-PROMPT-013 Nr. 12) */
  if (state.issuedRevision && !(clean(asOf) >= ISSUE_RULES.floor)) statementBlockers.push('ISSUE_DATE_TOO_EARLY: no corrected statement is dated before ' + ISSUE_RULES.floor + ' (UTC; 07:00 in Vientiane)');
  reasons.push(...statementBlockers);

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
  /* what the new version freezes beside its snapshot; a version of an earlier layout (no names) is corrected by a new one */
  const bankNow = paymentBank && !paymentBank.missing ? paymentBank : null;
  const frozen = { layout: CURRENT_LAYOUT, recipient: names.recipient, persons: names.personNames, words: words.words, options: paymentOptions.length ? paymentOptions : null, bank: bankNow };
  const frozenOf = (r) => (r ? { layout: r.Pdf_Layout || null, recipient: r.Recipient || null, persons: r.Person_Names || null, words: r.Item_Words || null, options: r.Payment_Options || null, bank: r.Payment_Bank || null } : null);
  const correction = issuedNow && proposal ? correctionOf(issuedNow, proposal, words.words, { legacy: !(state.issuedRecord && state.issuedRecord.Pdf_Layout),
    wasOptions: state.issuedRecord ? state.issuedRecord.Payment_Options : null, nowOptions: paymentOptions,
    wasBank: state.issuedRecord ? state.issuedRecord.Payment_Bank : null, nowBank: bankNow }) : null;
  if (issuedNow && proposal && substance(proposal) === substance(issuedNow) && stableJson(frozenOf(state.issuedRecord)) === stableJson(frozen)) {
    reasons.push('NO_CHANGE: revision ' + issuedNow.Revision + ' already holds exactly this statement');
  }
  /* the hash binds the statement AND the settlement it was previewed on: after any issue or new revision it no longer
     matches, so one preview issues at most once */
  const proposalHash = proposal && !confirmation.assumed
    ? await sha256Hex(stableJson({ proposal: { ...proposal, calculated_at: null }, frozen, correction, confirmedVersion: confirmation.version ?? null,
      ownerRecorded: confirmation.ownerRecorded ? { state: confirmation.ownerRecorded.state, rev: confirmation.ownerRecorded.rev } : null,
      settlement: { id: state.Settlement_ID || null, latestRevision: Number(state.latestRevision) || 0, issuedRevision: issuedNow ? issuedNow.Revision : null } }))
    : null;
  return {
    asOf, fx, sourceGaps, state, pref, destination, current, confirmation, gateCheck, currentDrifts, drifts,
    gate: { stored: gate.approved, now: gateNow ? { approved: gateNow.approved, open: gateNow.open || [] } : null },
    allowed: reasons.length === 0, reasons, proposal, proposalHash, sourceHash: hash,
    names, words, paymentOptions, paymentBank: bankNow, correction, frozen, statementBlockers,
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
  /* NEVER BACKDATED (Owners, HS-PROMPT-013 Nr. 12): a statement carries the day it is issued, never an earlier one */
  if (asOf < ISSUE_RULES.today()) return jsonRes({ ok: false, error: 'a statement is never dated before the day it is issued', reasons: ['ISSUE_BACKDATED'] }, 409, cors);
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
    const c = current.confirmation || {};
    const ownerPending = c.ownerRecorded && c.ownerRecorded.state === OWNER_BOOKING_STATE.RECORDED && c.state === 'UNCONFIRMED';
    return jsonRes({ ok: false, error: 'Issue & Publish is blocked',
      reasons: ['BOOKING_NOT_CONFIRMED: ' + (c.state || 'NONE') + ' — ' + (ownerPending ? CONFIRMATION_WORDS.OWNER_RECORDED : (CONFIRMATION_WORDS[c.state] || CONFIRMATION_WORDS.NONE))] }, 409, cors);
  }
  /* WHAT WAS PREVIEWED IS WHAT IS ISSUED (Owner, 7 Oct 2026): the console names the statement it showed */
  const expected = clean(body.expectedProposal);
  if (expected && expected !== a.proposalHash) {
    return jsonRes({ ok: false, error: 'the statement has changed since it was previewed; preview it again',
      reasons: ['PREVIEW_CHANGED'] }, 409, cors);
  }
  /* as sent, and today (Owner, 8 Oct 2026): the statement uses today's amounts; a difference from what the guest was sent is
     issued only once it has been seen — asked on both paths, after every other block, before anything is created */
  const unseenDifference = async () => {
    const who = holdersOfIndex(await loadIndex(env, origin, false)).find((h) => h.Holder_ID === holderId);
    const sub = who && who.guestId ? await submittedOf(env, holderId, who.guestId, false) : null;
    if (!sub || !sub.submitted) return null;
    const diff = await sentDifference(src, holderId, who.guestId, sub.selections, asOf, sub);
    return diff.material && clean(body.acknowledgePriceDifference) !== diff.digest
      ? jsonRes({ ok: false, error: PRICE_DIFFERENCE_WORDS, reasons: ['PRICE_DIFFERENCE'], priceDifference: priceDifferenceView(diff) }, 409, cors) : null;
  };

  if (revision == null) {
    /* judged as the ledger will judge it, before anything is created */
    if (!a.allowed) {
      return jsonRes({ ok: false, error: 'Issue & Publish is blocked', reasons: a.reasons }, 409, cors);
    }
    const unseen = await unseenDifference(); if (unseen) return unseen;
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

  /* an existing revision: the as-sent check comes last, right before it is issued */
  if (asked != null) { const unseen = await unseenDifference(); if (unseen) return unseen; }
  /* NO STATEMENT WITHOUT ITS RECIPIENT (HS-004.6), on both paths */
  if (a.statementBlockers.length) return jsonRes({ ok: false, error: 'Issue & Publish is blocked', reasons: a.statementBlockers }, 409, cors);
  const issued = await ledgerCall(env, 'revision-issue', {
    holderId, revision, by,
    items: src.items, specialRates: src.specialRates, fx, sourceGaps,
    sourceHash: a.sourceHash,
    issueDate: asOf, dueDateOverride: clean(body.dueDateOverride),
    evidenceStatus: clean(body.evidenceStatus), calculatedAt: new Date().toISOString(),
    paymentPreference: pref.channel, paymentPreferenceSource: pref.source, paymentPreferenceBasis: pref.basis || null,
    /* the ledger freezes this exact method or refuses: its destination is the one checked above */
    expectedPaymentPreference: pref.channel,
    /* frozen beside the snapshot (HS-004): the layout, the recipient and the persons by name, the product words, the ways to pay,
       the correction note */
    pdfLayout: CURRENT_LAYOUT, recipient: a.names.recipient, personNames: a.names.personNames, itemWords: a.words.words,
    paymentOptions: a.paymentOptions, paymentBank: a.paymentBank || null, correction: a.correction,
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

/**
 * THE REVENUE OVERVIEW (Freeze · U · closeout, Owner, 7 Oct 2026). Its population is every holder it has something to say
 * about: a settlement in the ledger (issued, paid, outstanding, overdue, refund due), a Guest Relations / BILLING_ADMIN
 * confirmation on record (Confirmed Revenue — issued or not yet), and any drift record (Drift Exposure, which now receives the
 * ledger's drift entries). A guest who has confirmed nothing and holds no statement contributes to no figure, so the accounting
 * definitions are not stretched to list them. One ledger request reads every state; one listing reads the confirmations.
 */
async function adminRevenue(env, identity, url, cors) {
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await loadSource(env, asOf);
  /* one read per key in this request (the Owners' records and the persons' trips are read by several checks) */
  env = { ...env, REG_KV: memoKv(env.REG_KV) };
  const [ledgerHolders, driftRecords, confirmed, recorded] = await Promise.all([readHolders(env), readDriftRecords(env), confirmationHolders(env), ownerRecordHolders(env)]);
  /* THE REGISTER, read once: a holder is CANCELLED only when the register reads as the real one and names nobody for it —
     an unreadable or empty register is never "everyone cancelled" (fail closed) */
  const indexEntries = Object.values((await loadIndex(env, url.origin, false)) || {}).filter((e) => e && clean(e.i));
  if (!indexEntries.length) return jsonRes({ ok: false, retry: true, error: 'the register could not be read just now; nothing is judged on an empty register' }, 503, cors);
  /* the budget comparison's own reads (billing-budget/1.0.0), started beside the holders' calculation — nothing of them is
     used before every revenue figure below is final, and none of them can fail it */
  const budgetReads = readBudgetSources(env);
  const personsOf = (id) => indexEntries.filter((e) => clean(e.i) === id && clean(e.g)).length;
  const drifts = new Map(driftRecords.map((r) => [clean(r.Holder_ID), Array.isArray(r.drifts) ? r.drifts : []]));
  const withSettlement = ledgerHolders.map((h) => clean(h.Holder_ID));
  const withDrift = [...drifts].filter(([, d]) => d.length).map(([h]) => h);
  const owners = new Set(recorded);
  const ids = [...new Set([...withSettlement, ...confirmed, ...withDrift, ...recorded])].filter(Boolean).sort();
  const states = await holderStates(env, ids);
  const holders = [], unresolved = [];
  for (const id of ids) {
    /* one holder that cannot be read (an ambiguous person, a store that does not answer) is named as a gap — it never takes the
       whole overview down, and its figures are never guessed (review, 7 Oct 2026) */
    try {
      /* the Owners' recorded bookings are read for the holders that have a record (2.3.0); the others keep their budget */
      const c = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, url.origin, undefined, states.get(id),
        owners.has(id) ? undefined : { owner: false });
      const own = c.owner || null;
      holders.push({ Holder_ID: id, Settlement_ID: c.state.Settlement_ID, bookings: c.bookings, settlement: c.state, drifts: drifts.get(id) || [],
        noSettlementRecord: !c.state.settlement,
        regState: (c.regConfirmation && c.regConfirmation.state) || 'NONE',
        ownerState: own ? own.state : 'NONE', ownerProblems: own ? own.problems : [],
        extraBeds: own ? own.rows.filter((b) => b.extraBed).map((b) => b.Booking_ID) : [] });
    } catch (e) {
      if (e instanceof LedgerContractError || e instanceof GoogleSheetsUnavailable) throw e;
      /* CANCELLED (Owner, 15 Nov 2026 · the final list): the register names nobody for this invitation any more — nothing of it
         is booked; a statement already issued stays issued and receivable, exactly as the ledger holds it */
      if (e instanceof SourceDataError && e.code === 'HOLDER_PERSON' && personsOf(id) === 0 && states.get(id)) {
        const st = states.get(id);
        holders.push({ Holder_ID: id, Settlement_ID: st.Settlement_ID, bookings: [], settlement: st, drifts: drifts.get(id) || [],
          noSettlementRecord: !st.settlement, cancelled: true, regState: 'CANCELLED', ownerState: 'NONE' });
        continue;
      }
      unresolved.push({ Holder_ID: id, reason: clean(e && e.message).slice(0, 200) || 'not readable' });
    }
  }
  /* THE COUPLE (Owners, 17 Nov 2026): what Haruthai and Suthep book for their own use is complimentary — never paying-guest
     revenue. Their invitations are read like every other and reported apart: an issued statement stands, immutable, until the
     Owners issue a revision; its amount is listed here, never counted as revenue, receivable or overdue. */
  const coupleIds = new Set(COUPLE_PERSONS.map((g) => 'INV-' + g));
  const paying = holders.filter((h) => !coupleIds.has(h.Holder_ID));
  /* the couple's own payment-journal rows go with their statements — never paying-guest receipts, never a row of "no settlement" */
  const coupleSids = new Set(holders.filter((h) => coupleIds.has(h.Holder_ID)).map((h) => clean(h.Settlement_ID)).filter(Boolean));
  const journalOf = (sid) => (src.journalRows || []).filter((r) => clean(r.Settlement_ID) === sid);
  const couple = holders.filter((h) => coupleIds.has(h.Holder_ID)).map((h) => {
    const iss = h.settlement && h.settlement.issuedRevision;
    const issuedCents = iss ? Number(iss.Total_Payable_Cents ?? (iss.snapshot && iss.snapshot.Total_Payable_Cents)) : null;
    const now = calculate(h.bookings, { items: src.items, specialRates: src.specialRates, asOf });
    return { Holder_ID: h.Holder_ID, issuedRevision: iss ? Number(iss.Revision) || null : null, issueDate: iss ? iss.Issue_Date || null : null,
      issued: Number.isFinite(issuedCents) ? fromCents(issuedCents) : null, payableNow: fromCents(now.totalPayableCents), hostedValue: fromCents(now.hostedValueCents),
      revisionDue: Number.isFinite(issuedCents) && issuedCents !== now.totalPayableCents,
      journal: journalOf(clean(h.Settlement_ID)).map((r) => ({ type: clean(r.Entry_Type) || null, status: clean(r.Record_Status) || null })) };
  });
  /* Freeze · U — the overview reuses the engine; it owns no formula. */
  const overview = buildRevenueOverview({
    holders: paying, items: src.items, specialRates: src.specialRates,
    journalRows: (src.journalRows || []).filter((r) => !coupleSids.has(clean(r.Settlement_ID))),
    issuedRevisions: paying.map((h) => h.settlement && h.settlement.issuedRevision).filter(Boolean),
    asOf,
  });
  /* an unread holder leaves every figure it could belong to incomplete, named — the computable part stays offered as partial */
  const KPI_KEYS = ['confirmedRevenue', 'issuedRevenue', 'cashCollected', 'outstanding', 'overdue', 'refundDue', 'driftExposure',
    'bookedRevenue', 'notYetInvoiced', 'changedSinceIssue', 'invoicedNotBooked'];
  for (const u of unresolved) for (const k of KPI_KEYS) {
    const kpi = overview[k]; if (!kpi || typeof kpi !== 'object') continue;
    if (kpi.complete !== false) { kpi.partial = { cents: kpi.cents, amount: kpi.amount, display: kpi.display }; kpi.cents = null; kpi.amount = null; kpi.display = null; kpi.complete = false; kpi.review = 'MANUAL_REVIEW_REQUIRED'; }
    kpi.gaps = [...(kpi.gaps || []), { Holder_ID: u.Holder_ID, reason: 'not readable: ' + u.reason }];
  }
  if (unresolved.length) overview.incompleteKpis = [...new Set([...(overview.incompleteKpis || []), ...KPI_KEYS])];
  if (unresolved.length && overview.breakdown) { overview.breakdown.incomplete = true; overview.breakdown.complete = false; }
  /* the split by class covers only the holders read: incomplete, named (2.5.0) */
  if (unresolved.length && overview.classes && overview.classes.version) { overview.classes.complete = false; overview.classes.unresolved = unresolved.map((u) => u.Holder_ID); }
  /* the project's exchange-rate reference (Owners, 17 Nov 2026): the day of the first issued statement and the 011 rates in effect */
  let fxReference = null;
  /* the first issued statement's day from the ledger listing already read (no further request) */
  const issuedDays = ledgerHolders.map((h) => clean(h.Issue_Date || (h.settlement && h.settlement.Issue_Date))).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  try { const day = issuedDays[0] || asOf; const fx = freezeFx(resolveFx(src.configRows, day)); fxReference = { day, FX_USD_THB: fx.FX_USD_THB, FX_USD_EUR: fx.FX_USD_EUR, gaps: fx.gaps || [], firstIssued: day !== asOf || null }; } catch (e) { fxReference = { error: 'not readable just now' }; }
  /* REVENUE AND BUDGET: built from the final figures above, beside them — the statements' exchange-rate reference (011) rides along
     only to be compared with the Owners' reporting reference rates (budget-map REPORTING_FX, 18 Nov 2026); it never changes a figure */
  const budget = await budgetBesideRevenue(env, budgetReads, { overview, src, asOf, indexEntries, unresolved, couple, fx: fxReference && !fxReference.error ? fxReference : null });
  /* the extra bed of a room the guests booked themselves (17 Nov 2026): a room holding more persons than its own places says so */
  extraBedsBeyondPlaces(overview.breakdown, src.items);
  /* where every active guest stands — only CONFIRMED bookings are revenue above; the rest is named here, never as money */
  let progress; try { progress = await bookingProgress(env, indexEntries, { ownerRecords: recorded.length > 0 }); } catch (e) { progress = { error: clean(e && e.message).slice(0, 200) || 'not readable' }; }
  const body = { ok: true, ...overview, unresolved, calculatedAt: new Date().toISOString(), bookingProgress: progress, fxReference,
    population: { holders: ids.length, withSettlement: withSettlement.length, withConfirmation: confirmed.length, withDrift: withDrift.length,
      withOwnerBookings: recorded.length, cancelled: holders.filter((h) => h.cancelled).length, couple: couple.length }, couple, budget };
  /* THE OVERVIEW (HS-034, Owners HS-PROMPT-052): counts and ratios of the figures above, read beside them — a fault in it never
     touches this answer, which the Finance, Revenue and Rooms & rates tabs read as before */
  try { body.quick = quickFinanceOf(body); } catch (e) { body.quick = { status: 'NOT_AVAILABLE', why: 'the overview figures could not be formed just now' }; }
  return jsonRes(body, 200, cors);
}

/* ------------------------------------------------------------ revenue and budget */

/* THE SUPPLIER SIDE, read for the Revenue tab only (billing-budget/1.0.0 · Owners, 15 Nov 2026): ONE values read (004, 007,
   002, 009, 006) and ONE formulas read (004, 007 — a figure the sheet computes is told apart from one the Owners typed),
   never inside the billing source's own batch (pricing guard C4), and the Rooms engine's plan (the rooming list, read only).
   Settled, never rejected: a read that fails is a named gap of the comparison, never of a revenue figure. */
function readBudgetSources(env) {
  const id = cfgOf(env).spreadsheetId;
  return Promise.allSettled([
    batchReadRanges(env, id, [BUDGET_TABS.budget, BUDGET_TABS.payments, BUDGET_TABS.items, BUDGET_TABS.rates, BUDGET_TABS.register].map(rangeOfTab)),
    batchReadRanges(env, id, [BUDGET_TABS.budget, BUDGET_TABS.payments].map(rangeOfTab), { render: 'FORMULA' }),
    roomsGr(env, 'plan'),
    /* Google 012, read apart: a missing or renamed tab never takes the budget reads down (reconciliation reference only) */
    batchReadRanges(env, id, [rangeOfTab(BUDGET_TABS.roomList)]),
  ]);
}

/* the persons' and payers' names for the comparison, from the index and the 006 register — an id that names nobody
   (or two rows) stays an id */
function budgetNames(entries, register) {
  const persons = {}, holders = {};
  for (const e of entries || []) {
    const g = clean(e && e.g);
    if (g && !persons[g]) { const n = nameOf(register, e.c); if (n) persons[g] = n.full; }
  }
  for (const h of holdersOfIndex(entries)) {
    if (h.ambiguous) continue;
    const n = nameOf(register, h.contactId); if (n) holders[h.Holder_ID] = n.full;
  }
  return { persons, holders };
}

/* the revenue figures never wait long on the comparison: reads still out after this are a named gap (review, 17 Nov 2026) */
const BUDGET_WAIT_MS = 8000;
async function budgetBesideRevenue(env, reads, { overview, src, asOf, indexEntries, unresolved, couple, fx }) {
  const gap = (why) => ({ available: false, gap: why + ' — every revenue figure above stands as it is' });
  try {
    let timer;
    const wait = Number(env.BUDGET_WAIT_MS) > 0 ? Number(env.BUDGET_WAIT_MS) : BUDGET_WAIT_MS;   /* configuration, not a secret */
    const settled = await Promise.race([reads, new Promise((res) => { timer = setTimeout(() => res(null), wait); })]);
    clearTimeout(timer);
    if (!settled) return gap('The budget sources did not answer within ' + (wait >= 1000 ? Math.round(wait / 1000) + ' seconds' : wait + ' ms'));
    const [values, formulas, plan, list012] = settled;
    if (values.status !== 'fulfilled') return gap('The budget tabs (004, 007, 002, 009, 006) could not be read from Google just now');
    const [g004, g007, g002, g009, g006] = values.value;
    const f = formulas.status === 'fulfilled' ? formulas.value : null;
    const readProblems = [];
    if (!f) readProblems.push('The formulas of 004 and 007 could not be read just now: no 007 figure counts as typed, and 004 "Actual USD" is not judged');
    let names = null;
    try {
      names = budgetNames(indexEntries, await loadGuestRegister(env, { ...cfgOf(env), grids: { [rangeOfTab(BUDGET_TABS.register)]: g006 } }));
    } catch (e) { readProblems.push('006 could not be read just now — guests and payers are shown by their ids'); }
    const rooms = plan.status === 'fulfilled' && plan.value && plan.value.ok === true ? plan.value : null;
    const kpi = (k) => (k && typeof k === 'object' ? { cents: k.cents, display: k.display, complete: k.complete } : null);
    return buildBudgetComparison({
      asOf, booked: overview.bookedLines, items: src.items,
      display: parseItemDisplay(g002), budget: parseBudget004(g004, f ? f[0] : null), vendors: parseVendors007(g007, f ? f[1] : null),
      rates009: parseSpecialRateRows(g009), names, rooms, quota: overview.quotaUtilisation, bookedRevenue: overview.bookedRevenue,
      receipts: { cashCollected: kpi(overview.cashCollected), refundDue: kpi(overview.refundDue),
        source: '008_Payment_Journal — the verified receipts and the refunds due, as the overview above counts them' },
      unresolved, readProblems,
      /* the Revenue Report's paying-guest figures for the financial dashboard (Owners, 17 Nov 2026) — read, never recomputed */
      revenue: { classes: overview.classes || null, invoiced: kpi(overview.issuedRevenue), booked: kpi(overview.bookedRevenue), notYetInvoiced: kpi(overview.notYetInvoiced),
        changedSinceIssue: kpi(overview.changedSinceIssue), invoicedNotBooked: kpi(overview.invoicedNotBooked) },
      couple: couple || null, fx: fx || null,
      roomList012: list012 && list012.status === 'fulfilled' && Array.isArray(list012.value) ? parseRoomList012(list012.value[0]) : null,
    });
  } catch (e) {
    return gap('The budget comparison could not be built just now');
  }
}

/** Every paying invitation with a record of the Owners' own bookings — one listing of the store, like the confirmations. */
async function ownerRecordHolders(env) {
  const kv = env.REG_KV;
  if (!kv || typeof kv.list !== 'function') return [];
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: 'obk:', ...(cursor ? { cursor } : {}) });
    for (const k of (page && page.keys) || []) { const id = clean(k && k.name).slice('obk:'.length); if (INVITATION_RE.test(id)) out.push(id); }
    cursor = page && !page.list_complete && page.cursor ? page.cursor : null;
  } while (cursor);
  return out;
}

/* BOOKING PROGRESS (Owners, 17 Nov 2026): where each ACTIVE guest of the register stands while the Owners and the guests book —
   CONFIRMED (their own trip confirmed, or a confirmed Owners' record names them) · AWAITING CONFIRMATION (a trip sent, or an
   Owners' record not yet confirmed) · NOT SENT (a room held or a Bag with lines, nothing sent) · NO BOOKING. Read from the same
   records the statements read (registrationState, the Owners' records through their index, the Rooms plan, the guest's saved
   Bag); counts and invitations only, never an amount. A guest whose records cannot be read is named as unreadable. */
async function bookingProgress(env, indexEntries, opts) {
  /* the guests — the couple organise the wedding and book complimentary (17 Nov 2026), they are not counted here */
  const persons = [...new Map(indexEntries.filter((e) => clean(e.g) && clean(e.i) && e.h !== 1).map((e) => [clean(e.i), clean(e.g)])).entries()];
  /* the Rooms engine is asked once, never waited on longer than the budget's own limit */
  const wait = Number(env.BUDGET_WAIT_MS) > 0 ? Number(env.BUDGET_WAIT_MS) : BUDGET_WAIT_MS;
  let plan = null, timer;
  try { plan = await Promise.race([roomsGr(env, 'plan'), new Promise((res) => { timer = setTimeout(() => res(null), wait); })]); } catch (e) { plan = null; } finally { clearTimeout(timer); }
  const noRecords = !!(opts && opts.ownerRecords === false);
  const holding = new Set();
  if (plan && plan.units) for (const units of Object.values(plan.units)) for (const u of units || []) for (const o of (u && u.occupants) || []) if (o && o.guestId) holding.add(clean(o.guestId));
  const memo = {};
  const out = { guests: persons.length, confirmed: [], awaitingConfirmation: [], notSent: [], noBooking: [], unreadable: [], roomsReadable: !!plan };
  const stageOfPerson = async ([id, g]) => {
    const reg = await registrationState(env, id);
    const recs = noRecords ? [] : await recordedElsewhere(env, g, '', memo);
    if (recs === null || recs.some((r) => r.state === 'UNREADABLE')) return 'unreadable';
    if (reg === 'CONFIRMED' || recs.some((r) => r.state === OWNER_BOOKING_STATE.CONFIRMED)) return 'confirmed';
    if (reg === 'UNCONFIRMED' || reg === 'LAPSED' || recs.some((r) => r.state === OWNER_BOOKING_STATE.RECORDED)) return 'awaitingConfirmation';
    if (holding.has(g)) return 'notSent';
    const raw = await env.REG_KV.get('draft:' + id);
    if (raw) {
      let bag = [];
      try { const d = JSON.parse(raw); const keys = (d && (d.keys || (d.draft && d.draft.keys))) || {}; bag = JSON.parse(keys['siyl.bag'] || '[]'); } catch (e) { return 'unreadable'; }
      if (Array.isArray(bag) && bag.length) return 'notSent';
    }
    return 'noBooking';
  };
  const stages = await Promise.all(persons.map((p) => stageOfPerson(p).catch(() => 'unreadable')));
  persons.forEach(([id], i) => out[stages[i]].push(id));
  for (const k of ['confirmed', 'awaitingConfirmation', 'notSent', 'noBooking', 'unreadable']) out[k].sort();
  out.complete = out.confirmed.length === out.guests && !out.unreadable.length;
  return out;
}

/* A ROOM BEYOND ITS OWN PLACES (17 Nov 2026): a unit holding more persons than the seed gives it places is using its extra bed —
   counted per unit (never which person is on it) beside the beds the Owners' records mark; the amounts stay the engine's. */
function extraBedsBeyondPlaces(breakdown, items) {
  if (!breakdown || !Array.isArray(breakdown.roomsByUnit)) return;
  const byItem = new Map();
  for (const u of breakdown.roomsByUnit) {
    const parts = clean(u.Room_Unit_ID).split('·'); if (parts.length < 3) continue;
    const label = parts[parts.length - 1], itemId = parts.slice(1, -1).join('·');
    const unit = roomUnitOf(clean(items && items[itemId] && items[itemId].Site_Product_Key).split(/[,|]/)[0], label);
    const beyond = unit ? Math.max(0, (Number(u.persons) || 0) - unit.places) : 0;
    if (beyond > (Number(u.extraBeds) || 0)) u.extraBeds = beyond;
    byItem.set(itemId, (byItem.get(itemId) || 0) + (Number(u.extraBeds) || 0));
  }
  for (const c of breakdown.roomsByCategory || []) if (byItem.has(c.Item_ID) && byItem.get(c.Item_ID) > (Number(c.extraBeds) || 0)) c.extraBeds = byItem.get(c.Item_ID);
}

/** The ledger's drift records, holder by holder ({ Holder_ID, drifts }). */
async function readDriftRecords(env) {
  const reply = await ledgerCall(env, 'drift-read', null);
  if (!reply || reply.ok !== true || !Array.isArray(reply.drifts)) throw new LedgerContractError('no drift listing');
  return reply.drifts.filter((r) => r && typeof r === 'object' && clean(r.Holder_ID));
}

/** Every invitation with a confirmation record — one listing of the store (withdrawn ones price to nothing). */
async function confirmationHolders(env) {
  const kv = env.REG_KV;
  if (!kv || typeof kv.list !== 'function') return [];
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: 'conf:', ...(cursor ? { cursor } : {}) });
    for (const k of (page && page.keys) || []) {
      /* a withdrawn confirmation (metadata confirmedAt null) prices to nothing and is not counted */
      if (k && k.metadata && Object.prototype.hasOwnProperty.call(k.metadata, 'confirmedAt') && !k.metadata.confirmedAt) continue;
      const id = clean(k && k.name).slice('conf:'.length); if (id) out.push(id);
    }
    cursor = page && !page.list_complete && page.cursor ? page.cursor : null;
  } while (cursor);
  return out;
}

async function adminReconcile(env, identity, request, cors, write) {
  /* `write` (a POST): drift state is recorded and a DRAFT may be proposed. Otherwise (a GET) the same report is computed and
     nothing is written — no drift-set, no revision-create */
  const body = write ? await request.json().catch(() => ({})) : { asOf: new URL(request.url).searchParams.get('asOf') };
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
    if (write) {
      const set = await ledgerCall(env, 'drift-set', { holderId: id, drifts });
      if (!set || set.ok !== true) throw new LedgerContractError('drift for ' + id + ' was not recorded');
    }
    if (blockingOf(drifts).length && snapshot) {
      const proposal = proposeRevisionDraft({ holderId: id, settlementId: state.Settlement_ID,
        currentRevision: snapshot.Revision, result, drifts });
      if (Number(state.latestRevision) > Number(snapshot.Revision)) {
        proposals.push({ Holder_ID: id, created: false, reason: 'revision ' + state.latestRevision + ' is already open' });
      } else if (!write) {
        proposals.push({ Holder_ID: id, created: false, preview: true, proposal });
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
  return jsonRes({ ok: true, written: !!write, report: reconciliationReport({ holders: (list && list.holders) || [], drifts: all, payments, monitoring, asOf }), drifts: all, monitoring, proposals }, 200, cors);
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
    const row = { Holder_ID: i, guestId: clean(e.g) || null, contactId: clean(e.c) || null, hosts: e.h === 1, partyId: clean(e.p) || null };
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
  /* the 009 row's own words for such a line (printed on the PDF too): who paid, what the guest repays */
  paidNote: (l.categoryOverride || l.Category_Override_From) ? (l.specialRateRef || null) : null,
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
  /* the guest's own sent word, only for the holders without a stored or issued method whose 006 row holds no nationality */
  const stated = {};
  const candidates = holders.filter((h) => {
    const s = settlements.get(h.Holder_ID) || null;
    return !((s && s.issuedRevision && s.issuedPaymentPreference) || (stored[h.Holder_ID] && isChannel(stored[h.Holder_ID].Payment_Preference)) || h.ambiguous);
  });
  for (let k = 0; k < candidates.length; k += 10) {   /* ten at a time */
    await Promise.all(candidates.slice(k, k + 10).map(async (h) => { stated[h.Holder_ID] = await statedOf(env, h.Holder_ID, h, nationalityOf(natReg, h.contactId)); }));
  }

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
        route: routeFor({ holderId: h.Holder_ID, nationality: nationalityOf(natReg, h.contactId), stated: stated[h.Holder_ID] || null }) });
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

/* BOOKED FOR A GUEST BY ANOTHER PAYER (Owners, 17 Nov 2026 — the booking completeness view): the Owners' records of OTHER
   paying invitations that name this guest, read through the index of recorded persons; each record is read and must still
   name the guest, and carries its own state (RECORDED / CONFIRMED). null when the index cannot be read — never guessed. */
async function recordedElsewhere(env, guestId, holderId, memo) {
  const m = memo || {};
  const g = clean(guestId); if (!g || !env.REG_KV) return [];
  if (m.index === undefined) { try { const raw = await env.REG_KV.get(OBK_INDEX_KEY); m.index = raw ? JSON.parse(raw) || {} : {}; } catch (e) { m.index = null; } }
  if (!m.index) return null;
  m.records = m.records || new Map();
  const out = [];
  for (const h of (Array.isArray(m.index[g]) ? m.index[g] : []).map(clean).filter((x) => x && x !== holderId)) {
    if (!m.records.has(h)) { let rec; try { rec = readRecord(await env.REG_KV.get(obkKey(h))); } catch (e) { rec = false; } m.records.set(h, rec); }
    const rec = m.records.get(h);
    if (rec === false) out.push({ Holder_ID: h, state: 'UNREADABLE' });
    else if (rec.entries.some((e) => clean(e && e.personId) === g)) out.push({ Holder_ID: h, state: ownerStateOf(rec) });
  }
  return out;
}

/**
 * GET admin/readiness?ids=… — INVOICE READINESS (Owners, 17 Nov 2026): for up to ADMIN_STATUS_CHUNK paying invitations, what
 * Issue would say right now — the very assessment Preview and Issue run (assessIssue), its reasons word for word and the
 * total it would freeze. Reads only: nothing is issued, confirmed, recorded or sent. One holder that cannot be read fails
 * only its own row.
 */
async function adminReadiness(env, identity, url, cors) {
  const ids = [...new Set(clean(url.searchParams.get('ids')).split(',').map(clean).filter((x) => INVITATION_RE.test(x)))];
  if (!ids.length) return jsonRes({ ok: false, error: 'ids required' }, 400, cors);
  if (ids.length > ADMIN_STATUS_CHUNK) return jsonRes({ ok: false, error: 'at most ' + ADMIN_STATUS_CHUNK + ' ids per request' }, 400, cors);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const src = await loadSource(env, asOf, { register: true });
  env = { ...env, REG_KV: memoKv(env.REG_KV) };
  const rows = [];
  for (const id of ids) {
    try {
      const a = await assessIssue(env, id, src, asOf, url.origin);
      const r = a.current.result;
      rows.push({ Holder_ID: id, allowed: a.allowed, reasons: a.reasons, total: r.totalPayable, manualReview: r.manualReview.length,
        confirmation: (a.confirmation && a.confirmation.state) || 'NONE', issuedRevision: a.state.issuedRevision ? a.state.issuedRevision.Revision : null });
    } catch (e) {
      if (e instanceof LedgerContractError || e instanceof GoogleSheetsUnavailable) throw e;
      rows.push({ Holder_ID: id, error: clean(e && e.message).slice(0, 200) || 'not readable' });
    }
  }
  return jsonRes({ ok: true, asOf, rows }, 200, cors);
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
  /* ONE ledger request for the chunk (closeout, 8 Oct 2026 — it was one per holder); each holder's view is judged inside its own
     row, so one unreadable holder still fails only its row, and an unanswered batch falls back to the per-holder read */
  let views = null;
  try { views = await holderViews(env, ids.filter((id) => { const w = inRegister.get(id); return w && !w.ambiguous && w.guestId; })); } catch (e) { views = null; }
  /* this request reads a sent trip once, however many of its steps ask for it (a read-only route: nothing here writes REG_KV) */
  env = { ...env, REG_KV: memoKv(env.REG_KV) };
  const obMemo = {};
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
      const known = views && views.has(id) ? stateOfView(views.get(id), id) : undefined;
      const { state, result, unmapped, confirmation } = await calculateHolder(env, { invitationId: id, guestId: null }, id, src, asOf, url.origin, undefined, known);
      /* booked for this guest by another paying invitation (the Owners' records naming them) — the completeness view */
      let elsewhere = null; try { elsewhere = await recordedElsewhere(env, who.guestId, id, obMemo); } catch (e) { elsewhere = null; }
      rows.push({ booked, elsewhere,
        Holder_ID: id,
        confirmation: { state: confirmation.state || 'NONE', version: confirmation.version ?? null, confirmedAt: confirmation.confirmedAt || null,
          ownerRecorded: confirmation.ownerRecorded ? { state: confirmation.ownerRecorded.state, rev: confirmation.ownerRecorded.rev } : null },
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

/** GET admin/preview-pdf?holder=INV — THE CORRECTED STATEMENT BEFORE IT IS ISSUED (Owners, HS-PROMPT-032): the very version Issue would
 *  freeze — layout 1.3, the recipient and names, the product words, the ways to pay, the correction note — rendered for the Owners to
 *  open, marked as a preview. Nothing is stored, issued or sent; the issued originals are not touched. A correction carries the first
 *  day it may be issued (21 Nov 2026), as it will when the Owners issue it. */
async function adminPreviewPdf(env, identity, url, cors) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  const held = await holderState(env, holderId);
  const today = utcDay();
  const asOf = held.issuedRevision && today < ISSUE_RULES.floor ? ISSUE_RULES.floor : today;
  const src = await loadSource(env, asOf, { register: true });
  const a = await assessIssue(env, holderId, src, asOf, url.origin);
  if (!a.proposal) return jsonRes({ ok: false, error: 'no statement can be previewed for this guest just now', reasons: a.reasons }, 409, cors);
  if (a.names.reasons.length || a.words.missing.length) return jsonRes({ ok: false, error: 'the statement cannot name its recipient or products', reasons: a.statementBlockers }, 409, cors);
  const revision = (Number(a.state.latestRevision) || 0) + 1;
  const snapshot = { ...a.proposal, Settlement_ID: a.state.Settlement_ID || 'not issued yet', Revision: revision, Holder_ID: holderId };
  const rec = { Recipient: a.names.recipient, Person_Names: a.names.personNames, Item_Words: a.words.words, Payment_Options: a.paymentOptions, Payment_Bank: a.paymentBank || null, Correction: a.correction };
  const payment = await paymentOptionsForPdf(env, snapshot, a.paymentOptions, a.paymentBank || null);
  if (payment.incomplete) return jsonRes({ ok: false, error: 'the preview cannot be prepared just now (' + payment.incomplete + '); please try again in a moment' }, 503, cors);
  const bytes = renderIssuedPdf(CURRENT_LAYOUT, snapshot, { ...pdfOptionsFor(CURRENT_LAYOUT, rec, payment), preview: true });
  return new Response(bytes, { status: 200, headers: { ...cors, 'content-type': 'application/pdf', 'cache-control': 'no-store',
    'content-disposition': 'inline; filename="Statement-' + snapshot.Settlement_ID + '-V' + revision + '-PREVIEW.pdf"' } });
}

/**
 * GET admin/profile?holder=INV — HS-035 P1 · THE ADMIN GUEST PROFILE (Owners, 21 Nov 2026 · E31–E37): one guest's information
 * for Haruthai and Suthep, without signing in as the guest. READ ONLY and LIGHT: no Google, no Billing Engine, no ledger — the
 * money stays in admin/holder, opened from the profile on purpose. The invitation must be exactly one person of the served
 * register; the reads (src/worker.js · profileOf) touch this one invitation only, and the answer is an allowlist
 * (src/admin-profile.js): no amount, no code, no mail data, no document file name. Nothing is written.
 */
async function adminProfile(env, url, cors, deps) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  if (!deps || typeof deps.profileOf !== 'function') return jsonRes({ ok: false, error: 'the guest profile is not available here' }, 503, cors);
  const entries = await loadIndex(env, url.origin, false);
  const all = Object.values(entries || {}).filter((e) => e && clean(e.i) === holderId);
  const row = holdersOfIndex(entries).find((h) => h.Holder_ID === holderId);
  if (!row || row.ambiguous || !row.guestId || !all.length) return jsonRes({ ok: false, error: holderId + ' is not one invitation of the register' }, 404, cors);
  /* the raw index entry (it carries the couple flag and the role the holder row leaves out) */
  const entry = all.find((e) => clean(e.g) === row.guestId) || all[0];
  const profile = await deps.profileOf(env, url.origin, entry, entries);
  return jsonRes({ ok: true, holderId, at: new Date().toISOString(), profile }, 200, cors);
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
  /* the rooms of this statement whose extra bed is in use, with who is recorded on it — the Owners may correct that attribution */
  let extraBedRooms = []; try { extraBedRooms = a ? await extraBedRoomsOf(env, a.current, src) : []; } catch (e) { extraBedRooms = [{ error: clean(e && e.message).slice(0, 160) || 'the room list could not be read' }]; }
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
    /* as sent, and today — shown beside Confirm booking and Issue (display only) */
    if (sub.submitted) {
      try { submission.priceDifference = priceDifferenceView(await sentDifference(src, holderId, entry.guestId, sub.selections, asOf, sub)); }
      catch (e) { if (e instanceof LedgerContractError) throw e; submission.priceDifference = { unavailable: clean(e && e.message).slice(0, 200) || 'the comparison could not be made' }; }
    }
  } catch (e) {
    if (e instanceof LedgerContractError) throw e;
    submission = { state: 'UNREADABLE', submitted: null, error: clean(e && e.message).slice(0, 300) || 'not readable' };
  }

  return jsonRes({
    ok: true, asOf, Holder_ID: holderId,
    guest: { name, guestId: entry.guestId, hosts: entry.hosts,
      contactName: recipient.contact ? [clean(recipient.contact.firstName), clean(recipient.contact.lastName)].filter(Boolean).join(' ') || null : null,
      email: recipient.email, emailSource: recipient.source },
    booked, submission, extraBedRooms,
    confirmation: a ? a.confirmation : { state: 'UNREADABLE' },
    method: a ? { channel: a.pref.channel || null, currency: a.pref.currency || null, determined: !!a.pref.determined,
      source: a.pref.source || null, reason: a.pref.reason || null, locked: !!a.pref.locked,
      destinationComplete: !!(a.destination && a.destination.complete) }
      : { channel: issued ? issued.Payment_Preference : null, currency: issued ? issued.Payment_Currency : null, determined: !!issued, source: issued ? 'ISSUED_REVISION' : null, reason: previewError },
    settlement: { Settlement_ID: sid, state: state.state || null, latestRevision: state.latestRevision || 0,
      /* the layout a revision issued from now on is stamped with; an unproduced revision reports its own (pdf.layout) */
      newRevisionLayout: CURRENT_LAYOUT,
      revisions: await Promise.all((view.holder.revisions || []).map(async (x) => ({ Revision: x.Revision, Revision_State: x.Revision_State, Issue_Date: x.Issue_Date,
        Due_Date: x.Due_Date, total: x.Total_Payable_Cents == null ? null : fromCents(x.Total_Payable_Cents), issuedAt: x.issuedAt,
        issuedBy: x.issuedBy, supersededAt: x.supersededAt,
        /* the original PDF: produced (and by which writer — before 18 Nov 2026 always 1.1) or not yet — read with a HEAD, never rendered here */
        pdf: await pdfStateOf(env, sid, x) }))) },
    preview: !a ? { error: previewError, issuable: false, reasons: ['PREVIEW_UNAVAILABLE: ' + previewError], proposalHash: null, lines: [], blockB: [] } : {
      total: r.totalPayable, hostedValue: fromCents(r.hostedValueCents), lines: r.lines.filter((l) => l.block !== 'B').map((l) => lineView(l, people)),
      blockB: (r.blockB || []).map((l) => lineView(l, people)), manualReview: r.manualReview.map((l) => l.reviewReason).filter(Boolean),
      unmapped: a.current.unmapped, issueDate: a.proposal ? a.proposal.Issue_Date : asOf, dueDate: a.proposal ? a.proposal.Due_Date : null,
      fx: { FX_USD_THB: a.fx.FX_USD_THB, FX_USD_EUR: a.fx.FX_USD_EUR, gaps: a.fx.gaps || [] },
      inCurrency: a.pref.channel ? inPreferredCurrency(r.totalPayableCents, a.pref.channel, a.fx) : null,
      issuable: a.allowed, reasons: a.reasons, proposalHash: a.allowed ? a.proposalHash : null,
      /* what the issue freezes beside the snapshot (HS-004): shown before the click */
      recipient: a.names ? a.names.recipient : null, personNames: a.names ? a.names.personNames : null, itemWords: a.words ? a.words.words : null,
      paymentOptions: a.paymentOptions || [], paymentBank: a.paymentBank || null, correction: a.correction || null,
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
      /* what this revision froze beside its snapshot (HS-004) — none for a revision of the earlier layout */
      itemWords: state.issuedRecord ? state.issuedRecord.Item_Words : null, recipientName: state.issuedRecord && state.issuedRecord.Recipient ? state.issuedRecord.Recipient.name : null,
      paymentOptions: state.issuedRecord ? state.issuedRecord.Payment_Options : null, paymentBank: state.issuedRecord ? state.issuedRecord.Payment_Bank || null : null,
      correction: state.issuedRecord ? state.issuedRecord.Correction : null,
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
/* AS SENT, AND TODAY (Owner, 8 Oct 2026 · production safety): the submitted version's lines as the guest was sent them, beside
   the Billing Engine today — display only (src/billing/price-difference.js). A material difference is confirmed or issued only
   by someone who has seen it: the acknowledgement names exactly this comparison (its digest). */
async function sentDifference(src, holderId, personId, selections, asOf, sub) {
  const priced = await priceSelection({ holderId, personId, selections, items: src.items, specialRates: src.specialRates, asOf, source: BOOKED_SOURCE.SENT });
  return priceDifference({ selections, result: priced, context: { holderId, version: sub ? sub.version : null, submissionId: sub ? sub.submissionId || null : null } });
}
const priceDifferenceView = (d) => ({ material: d.material, digest: d.digest, statedCents: d.statedCents, engineCents: d.engineCents, lines: d.lines });
const PRICE_DIFFERENCE_WORDS = 'The amounts this guest was sent differ from today\'s Billing Engine amounts. Nothing was changed: confirm that you have seen them (acknowledgePriceDifference = the digest shown).';

/** GET /api/gr/price-check (Guest Relations): the comparison for one invitation's submitted version. Throws when it cannot be made. */
export async function grPriceCheck(env, origin, invitationId) {
  const entry = holdersOfIndex(await loadIndex(env, origin, false)).find((h) => h.Holder_ID === clean(invitationId));
  if (!entry || entry.ambiguous || !entry.guestId) throw new SourceDataError('HOLDER_PERSON', invitationId + ' is not one person of the register');
  const sub = await submittedOf(env, clean(invitationId), entry.guestId, false);
  if (!sub.submitted) return { submitted: false, material: false, lines: [] };
  const day = evaluationDay();
  const src = await pricing(env, day, false);
  if (src.stale) throw new GoogleSheetsUnavailable('the pricing source is stale');
  return { submitted: true, version: sub.version, ...priceDifferenceView(await sentDifference(src, clean(invitationId), entry.guestId, sub.selections, day, sub)) };
}

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
    priceDifference: priceDifferenceView(await priceDifference({ selections: sub.selections, result: priced, context: { holderId, version: sub.version, submissionId: sub.submissionId || null } })),
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
  /* as sent, and today: a material difference is confirmed only once it has been seen */
  const day = evaluationDay(), srcNow = await loadSource(env, day);   /* the same fresh read the dialog was built on */
  const diff = await sentDifference(srcNow, holderId, entry.guestId, sub.selections, day, sub);
  if (diff.material && clean(body.acknowledgePriceDifference) !== diff.digest) {
    return jsonRes({ ok: false, error: PRICE_DIFFERENCE_WORDS, reasons: ['PRICE_DIFFERENCE'], priceDifference: priceDifferenceView(diff) }, 409, cors);
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
      : cur.changed === null ? ' · the current selection could not be read (acknowledged)' : '')
      + (diff.material ? ' · the amounts sent to the guest differ from today\'s Billing Engine (seen: ' + diff.digest.slice(0, 12) + ')' : ''),
    record: sub.record, current: standing.conf,
    extra: { digest: sub.digest, acknowledgedChange: cur.changed !== false, ...(diff.material ? { priceDifference: diff.digest } : {}) },
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

/* the way(s) to pay the issued revision froze (HS-004.16/.19): SEPA first and PayPal on the EUR route, as on the PDF; else its one method */
function methodWordsOf(ctx) {
  const opts = ctx && ctx.state && ctx.state.issuedRecord && Array.isArray(ctx.state.issuedRecord.Payment_Options) ? ctx.state.issuedRecord.Payment_Options.filter((m) => METHOD_WORDS[m]) : [];
  if (opts.length > 1) return opts.map((m) => METHOD_WORDS[m]).join(', or ');
  return METHOD_WORDS[opts[0] || (ctx && ctx.issued && ctx.issued.Payment_Preference)] || null;
}

/* THE BANK TRANSFER IN THE E-MAIL (Owners, 20 Nov 2026 · HS-PROMPT-040): for a revision that offers SEPA, the complete connection —
   account holder, bank, IBAN, BIC, the statement's reference and the amount in euros at its own frozen rate. The account is read from
   the configuration as the statement page reads it; an incomplete one is left out (the e-mail then points to My Profile). The ledger's
   mail log keeps no body. */
function sepaForMail(env, ctx) {
  const rec = ctx && ctx.state && ctx.state.issuedRecord;
  const offered = rec && Array.isArray(rec.Payment_Options) ? rec.Payment_Options.includes('SEPA_EUR') : clean(ctx && ctx.issued && ctx.issued.Payment_Preference) === 'SEPA_EUR';
  if (!offered || !ctx.issued || !(Number(ctx.issued.Total_Payable_Cents) > 0)) return null;
  const dest = destinationOf('SEPA_EUR', env);
  if (!dest || !dest.complete || !dest.iban || !dest.bank || !dest.bic) return null;
  const fx = freezeFx({ FX_USD_THB: ctx.issued.FX_USD_THB, FX_USD_EUR: ctx.issued.FX_USD_EUR });
  const eur = inPreferredCurrency(ctx.issued.Total_Payable_Cents, 'SEPA_EUR', fx);
  if (!eur || eur.amount == null) return null;
  return { holder: dest.recipient, bank: dest.bank, iban: dest.iban, bic: dest.bic, reference: clean(ctx.issued.Settlement_ID), amount: eur };
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
    dueDate: ctx.issued.Due_Date, issueDate: ctx.issued.Issue_Date, inCurrency: ctx.inCurrency, method: methodWordsOf(ctx),
    /* the name the PDF prints (frozen at issue) and the correction note the e-mail names */
    frozenRecipient: ctx.state.issuedRecord && ctx.state.issuedRecord.Recipient ? ctx.state.issuedRecord.Recipient.name : null,
    correction: ctx.state.issuedRecord ? ctx.state.issuedRecord.Correction : null,
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
    method: methodWordsOf(ctx), profileUrl: url.origin + '/profile#statement',
    correction: ctx.state && ctx.state.issuedRecord ? ctx.state.issuedRecord.Correction : null,
    sepa: sepaForMail(env, ctx),
  });
  const sent = await sendMail(env, ctx.recipient.email, ctx.fullName || ctx.recipient.email, mail.subject, mail.text, mail.html,
    [{ name: 'Statement-' + sid + '-V' + rev + '.pdf', content: base64Of(bytes) }]);
  const outcome = sent && ['SENT', 'REJECTED', 'NOT_SENT'].includes(sent.outcome) ? sent.outcome : 'UNCERTAIN';
  const done = await finish({ outcome, provider: sent && sent.provider, messageId: sent && sent.id, status: sent && sent.status, error: sent && sent.error });
  return jsonRes({ ok: outcome === 'SENT', outcome, provider: sent && sent.provider, error: outcome === 'SENT' ? null : (sent && sent.error) || null,
    attempt: done && done.ok === true ? done.attempt : null, recorded: !!(done && done.ok === true) }, outcome === 'SENT' ? 200 : 502, cors);
}

/* ----------------------------------------------- the Owners' own bookings */

/* the Rooms engine, as Guest Relations asks it (the actor trusts the Worker's own header; no guest request carries it) */
async function roomsGr(env, op, body) {
  if (!env.ROOMS) throw new SourceDataError('ROOMS_UNAVAILABLE', 'the Rooms engine is not bound');
  const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
  const res = await stub.fetch(new Request('https://rooms/api/rooms/' + op, { method: body ? 'POST' : 'GET', headers: { 'x-gr-verified': 'yes', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }));
  const j = await res.json().catch(() => null);
  if (!j) throw new SourceDataError('ROOMS_UNREADABLE', 'the Rooms engine did not answer');
  return j;
}
/* AN EXTRA BED IS PRICED ONLY BY ITS OWN 009 ROW (pricing guard C2, 17 Nov 2026): a person of this statement in a room that has an
   extra bed (src/inventory-seed.js), while the Rooms engine holds more persons there than the room's own places, must have an
   approved 009 row naming them in effect — else Issue waits, named. The person checked is the one whose booking took the bed
   (marked by the Rooms engine); a guest on a regular place is never held up by it. No price is computed; nothing is written.
   The room list is read only when a line is in such a room; a room it does not list is named, never passed. */
/* THE ROOMS OF A STATEMENT WITH THEIR EXTRA BED IN USE (Owners, 17 Nov 2026): for each line in a room the seed gives an extra bed
   while the room holds more persons than its places — its occupants (guest id, first name) and who the Rooms engine records on the
   bed. Read only; the Owners change the attribution with admin/extra-bed. */
async function extraBedRoomsOf(env, current, src) {
  const out = [], seen = new Set();
  let plan = null;
  for (const l of ((current && current.result && current.result.lines) || [])) {
    const ru = clean(l.Room_Unit_ID); if (!ru || seen.has(ru)) continue;
    const parts = ru.split('·'), label = parts[parts.length - 1], itemId = parts.slice(1, -1).join('·');
    const it = src.items && src.items[itemId]; if (!it) continue;
    const key = clean(it.Site_Product_Key).split(/[,|]/)[0];
    const unit = roomUnitOf(key, label); if (!unit || !unit.extraBeds) continue;
    seen.add(ru);
    if (!plan) plan = await roomsGr(env, 'plan');
    const u = ((plan.units && plan.units[key]) || []).find((x) => x.label === unit.label); if (!u) continue;
    const occ = (u.occupants || []).filter((o) => o.guestId);
    if ((u.occupants || []).length <= unit.places) continue;
    out.push({ key, label: unit.label, itemId, places: unit.places, inRoom: (u.occupants || []).length,
      bed: (occ.find((o) => o.bed) || {}).guestId || null, occupants: occ.map((o) => ({ guestId: o.guestId, name: clean(o.name) || null, bed: !!o.bed })) });
  }
  return out;
}

/**
 * POST admin/extra-bed { key, label, guestId } — the Owners name who sleeps on a room's extra bed (17 Nov 2026). Nobody moves,
 * no place is taken or given back; the Rooms engine records the attribution (op 'bed'), and the statement check then asks that
 * person — only that person — for their own approved 009 row. BILLING_ADMIN only; nothing is priced, issued or e-mailed here.
 */
async function adminExtraBed(env, identity, request, cors) {
  const body = await request.json().catch(() => null);
  const key = clean(body && body.key), label = clean(body && body.label).toUpperCase(), guestId = clean(body && body.guestId);
  if (!key || !label || !/^G\d{3,}$/.test(guestId)) return jsonRes({ ok: false, error: 'key, label and the guest id are required' }, 400, cors);
  const r = await roomsGr(env, 'bed', { key, label, guestId, actor: adminLabel(identity) });
  return jsonRes(r, r.ok ? 200 : 409, cors);
}

/* ======================================================================================================================
   THE OWNERS' SEATING & ROOM ASSIGNMENTS (Owners, 18 Nov 2026 · EMERGENCY P1 · src/billing/assignments.js) — BILLING_ADMIN only.
   The seating ledger and the room engine are asked as Guest Relations asks them, AND with the Owner named (x-siyl-admin): the
   engines accept their admin operations from this route only (the public /api/seating and /api/rooms never forward the header).
   Every guest a write names is resolved HERE from the served index — never from what the console sent; the actor of every change
   is the Owner's audit label (BRIDE / GROOM), never a name. Nothing here reads 009 or 012, prices anything or touches a booking,
   a statement or a payment.
   ====================================================================================================================== */
async function engineAdmin(env, ns, name, op, admin, body, couple) {
  if (!env[ns]) throw new SourceDataError(ns + '_UNAVAILABLE', 'the ' + name + ' engine is not bound');
  const h = { 'x-gr-verified': 'yes', 'x-siyl-admin': admin, 'content-type': 'application/json' };
  if (couple) h['x-siyl-couple'] = JSON.stringify(couple);
  const stub = env[ns].get(env[ns].idFromName(name));
  const res = await stub.fetch(new Request('https://' + name + '/api/' + name + '/' + op, { method: body ? 'POST' : 'GET', headers: h, body: body ? JSON.stringify(body) : undefined }));
  const j = await res.json().catch(() => null);
  if (!j) throw new SourceDataError(ns + '_UNREADABLE', 'the ' + name + ' engine did not answer');
  return { status: res.status, j };
}
/* the sent trips and their confirmations of the given invitations — read in small groups, a read that fails is null (named, never guessed).
   A confirmation is read only where it decides the state (assignments.confirmationDecides: a trip sent and not declined) —
   HS-032, 24 Nov 2026: the same booking states with fewer KV reads */
async function recordsOf(env, invs) {
  const records = {}, confs = {};
  const list = [...new Set(invs)].filter((i) => /^INV-[A-Z0-9-]+$/.test(i));
  for (let i = 0; i < list.length; i += 16) {
    await Promise.all(list.slice(i, i + 16).map(async (inv) => {
      records[inv] = await kvJson(env, 'reg:' + inv);
      confs[inv] = confirmationDecides(records[inv]) ? await kvJson(env, 'conf:' + inv) : null;
    }));
  }
  return { records, confs };
}
/* 002 (a stay's dates) and 006 (names) in ONE read — never 009, never 012; a read that fails or is slow is a named gap */
async function assignmentSources(env, waitMs) {
  const id = cfgOf(env).spreadsheetId, ranges = [rangeOfTab(BUDGET_TABS.items), rangeOfTab(BUDGET_TABS.register)], wait = waitMs || 8000;
  let timer;
  try {
    const grids = await Promise.race([batchReadRanges(env, id, ranges), new Promise((res) => { timer = setTimeout(() => res(null), wait); })]);
    clearTimeout(timer);
    if (!grids) return { register: null, datesOf: null, gaps: ['Google did not answer within ' + Math.round(wait / 1000) + ' seconds — names are the guests\' first names, stay dates are not shown'] };
    const gaps = [];
    let register = null, datesOf = null;
    try { register = await loadGuestRegister(env, { ...cfgOf(env), grids: { [ranges[1]]: grids[1] } }); } catch (e) { gaps.push('006 could not be read just now — names are the guests\' first names'); }
    try {
      const items = await loadItems(env, { ...cfgOf(env), grids: { [ranges[0]]: grids[0] } });
      const display = parseItemDisplay(grids[0]).items || {};
      const { index } = siteProductKeyIndex(items);
      datesOf = {};
      for (const [key, itemId] of Object.entries(index)) { const d = display[itemId] || {}; datesOf[key.split(/[,|]/)[0]] = { item: itemId, checkIn: d.checkIn || null, checkOut: d.checkOut || null, nights: nightsOfItem(items[itemId]) }; }
    } catch (e) { gaps.push('002 could not be read just now — stay dates are not shown'); }
    return { register, datesOf, gaps };
  } catch (e) {
    clearTimeout(timer);
    return { register: null, datesOf: null, gaps: ['Google could not be read just now — names are the guests\' first names, stay dates are not shown'] };
  }
}

/* THE SOURCES OF THE OWNERS' READ, KEPT FIVE MINUTES (HS-032, 24 Nov 2026): Seating and Room assignments read admin/assignments
   again after every change, and a seat or a room never changes 006 or 002 — so a complete read (no gap) of this isolate is used
   again for five minutes instead of asking Google and parsing both tabs once more. Only the names this read shows (first, last,
   nickname) and 002's dates are kept, frozen; a read with a gap is never kept; nothing in flight is shared between requests.
   ONLY the read route uses it — a write (adminSeatingApply) still asks Google itself. A 006 name or 002 date edited in Google
   shows here within five minutes. */
export const ASSIGNMENT_SOURCES_MS = 5 * 60 * 1000;
let assignmentSourcesKept = null;
export function forgetAssignmentSources() { assignmentSourcesKept = null; }
async function assignmentSourcesForRead(env) {
  const id = cfgOf(env).spreadsheetId, now = Date.now(), k = assignmentSourcesKept;
  if (k && k.id === id && now >= k.at && now - k.at < ASSIGNMENT_SOURCES_MS) return k.value;
  const v = await assignmentSources(env);
  if (v && !(v.gaps && v.gaps.length) && v.register && v.datesOf) {
    const register = {};
    for (const [cid, r] of Object.entries(v.register)) register[cid] = Object.freeze(r && r.ambiguous ? { ambiguous: true } : { first: r.first, last: r.last, nick: r.nick });
    const datesOf = {};
    for (const [key, d] of Object.entries(v.datesOf)) datesOf[key] = Object.freeze({ ...d });
    const value = Object.freeze({ register: Object.freeze(register), datesOf: Object.freeze(datesOf), gaps: Object.freeze([]) });
    assignmentSourcesKept = { id, at: now, value };
    return value;
  }
  return v;
}

/* HS-058 · THE PRE-WEDDING DINNER (Owners, 22 Nov 2026): every active guest's own order in ONE read of the seating ledger, and the
   Owners' release to the restaurant — recorded in the ledger, never sent anywhere. Nothing here prices a booking, issues, e-mails
   or pays. */
async function adminPwdGuests(env, url) {
  const entries = await loadIndex(env, url.origin, false);
  if (!entries || !Object.keys(entries).length) return null;
  return Object.values(guestsOfIndex(entries)).filter((g) => !g.ambiguous);
}
async function adminPwd(env, identity, url, cors) {
  const list = await adminPwdGuests(env, url);
  if (!list) return jsonRes({ ok: false, retry: true, error: 'the register index is not readable just now' }, 503, cors);
  const out = await engineAdmin(env, 'SEATING', 'seating', 'admin-pwd-read', adminLabel(identity), { active: list.map((g) => g.guestId) });
  if (!out.j.ok) return jsonRes(out.j, out.status, cors);
  /* LIGHT (HS-032, review 22 Nov 2026): the index and ONE ledger read — no Google read; the first names are the ones the guests'
     own verified sessions gave the ledger (their order, their seat), never a guess */
  const byId = Object.fromEntries((out.j.orders || []).map((o) => [o.guestId, o.firstName || '']));
  const guests = list.map((g) => ({ guestId: g.guestId, invitationId: g.invitationId, first: byId[g.guestId] || (out.j.names || {})[g.guestId] || '', hosts: !!g.hosts }))
    .sort((a, b) => a.guestId.localeCompare(b.guestId, 'en', { numeric: true }));
  const { names, ...rest } = out.j;
  return jsonRes({ ...rest, guests }, 200, cors);
}
async function adminPwdRelease(env, identity, request, url, cors) {
  const body = await request.json().catch(() => null);
  const list = await adminPwdGuests(env, url);
  if (!list) return jsonRes({ ok: false, retry: true, error: 'the register index is not readable just now' }, 503, cors);
  const out = await engineAdmin(env, 'SEATING', 'seating', 'admin-pwd-release', adminLabel(identity),
    { action: clean(body && body.action), expectDigest: clean(body && body.expectDigest), active: list.map((g) => g.guestId) });
  return jsonRes(out.j, out.status, cors);
}

/** GET admin/assignments — the seating plans, the rooming list and every guest, in one read; nothing is written. */
async function adminAssignments(env, identity, url, cors) {
  const admin = adminLabel(identity);
  const entries = await loadIndex(env, url.origin, false);
  if (!entries || !Object.keys(entries).length) return jsonRes({ ok: false, retry: true, error: 'the register index is not readable just now' }, 503, cors);
  const couple = coupleOfEntries(entries);
  const guests = guestsOfIndex(entries);
  const [seat, room, src, kv] = await Promise.all([
    engineAdmin(env, 'SEATING', 'seating', 'admin-read', admin, null, couple),
    engineAdmin(env, 'ROOMS', 'rooms', 'admin-read', admin),
    assignmentSourcesForRead(env),
    recordsOf(env, Object.values(guests).map((g) => g.invitationId)),
  ]);
  if (!seat.j.ok || !room.j.ok) return jsonRes({ ok: false, retry: true, error: 'the seating ledger or the room engine could not be read just now' }, 503, cors);
  const seedNames = Object.fromEntries(Object.keys(ROOM_SEED).map((k) => [k, ROOM_SEED[k].name]));
  const roster = rosterOf({ entries, register: src.register, records: kv.records, confs: kv.confs, seating: seat.j, rooms: room.j, couple });
  const stays = staysOf({ rooms: room.j, seedNames, datesOf: src.datesOf });
  const body = { ok: true, version: ASSIGNMENTS_VERSION, at: new Date().toISOString(), audience: admin, events: ASSIGNMENT_EVENTS,
    people: seat.j.people, capacity: seat.j.capacity,
    seating: { open: seat.j.open, frozen: seat.j.frozen, events: seat.j.events, log: seat.j.log },
    rooms: { stays, digest: room.j.digest, final: room.j.final, waitlist: room.j.waitlist || [], log: room.j.log,
      hotelRooms: hotelRoomsMeta(room.j.hotelRooms), hotelChecks: hotelChecksOf(roster),
      /* per hotel, each person once (Owners' consolidated order, 19 Nov 2026) — beside the stays, never instead of them */
      occupancy: occupancyOf(stays, room.j.waitlist || [], (VENDORS.find((v) => v.roomContract) || {}).roomContract || null) },
    roster, gaps: src.gaps };
  /* THE OVERVIEW (HS-034, Owners HS-PROMPT-052): only when the Overview asks (?overview=1) — Seating and Room assignments read this
     route after every change and keep exactly today's answer; guest ids and counts only, a fault never touches the answer */
  if (url.searchParams.get('overview') === '1') {
    try { body.participation = participationOf({ roster, records: kv.records, seating: seat.j, stays, gaps: src.gaps }); }
    catch (e) { body.participation = { status: 'NOT_AVAILABLE', why: 'the programme figures could not be formed just now' }; }
  }
  return jsonRes(body, 200, cors);
}

/* ======================================================================================================================
   HS-059 · GUEST ARRIVALS & TRANSPORTATION (Owners, 24 Nov 2026) — Section F of the Overview on its own LIGHT read, BILLING_ADMIN
   only (the gate above every admin route). src/billing/arrivals.js shapes it; here it is read, once each:
     · the served index (cached) · the Rooms engine's `plan` (Guest Relations' read: the units and their occupants, no log, no
       digest) · every guest's sent trip `reg:` and, only where it decides the state, its confirmation `conf:` · the index of the
       Owners' recorded bookings and the records it names · ONE Google read of 002 (dates) and 012 (the Owners' room list) —
       never 006, 009, 004 or 007, never the seating ledger, never the billing engine, no collator.
   Name-free (guest ids; the console names them from its own guest list) except 012's names exactly as the Owners typed them.
   Nothing is written, priced, confirmed or sent. 002 / 012 of a complete read are used again for five minutes; a read with a
   gap is never kept; nothing in flight is shared between requests.
   ====================================================================================================================== */
export const ARRIVAL_SOURCES_MS = 5 * 60 * 1000;
let arrivalSourcesKept = null;
export function forgetArrivalSources() { arrivalSourcesKept = null; }
async function arrivalSources(env) {
  const id = cfgOf(env).spreadsheetId, now = Date.now(), k = arrivalSourcesKept;
  if (k && k.id === id && now >= k.at && now - k.at < ARRIVAL_SOURCES_MS) return k.value;
  const ranges = [rangeOfTab(BUDGET_TABS.items), rangeOfTab(BUDGET_TABS.roomList)];
  let timer, grids = null;
  try { grids = await Promise.race([batchReadRanges(env, id, ranges), new Promise((res) => { timer = setTimeout(() => res(null), 8000); })]); }
  catch (e) { grids = null; }
  finally { clearTimeout(timer); }
  if (!grids) return { dates: null, keyOfItem: {}, list012: null, gaps: ['Google could not be read just now — no date and no comparison with 012 are shown'] };
  const gaps = [], keyOfItem = {};
  let dates = null, list012 = null;
  try {
    const items = await loadItems(env, { ...cfgOf(env), grids: { [ranges[0]]: grids[0] } });
    const display = parseItemDisplay(grids[0]).items || {};
    const { index } = siteProductKeyIndex(items);
    dates = {};
    for (const [key, itemId] of Object.entries(index)) { const d = display[itemId] || {}; dates[key.split(/[,|]/)[0]] = Object.freeze({ item: itemId, checkIn: d.checkIn || null, checkOut: d.checkOut || null, nights: nightsOfItem(items[itemId]) }); }
    for (const [itemId, it] of Object.entries(items)) { const key = clean(it && it.Site_Product_Key).split(/[,|]/)[0]; if (key) keyOfItem[itemId] = key; }
  } catch (e) { dates = null; gaps.push('002 could not be read just now — no date is shown'); }
  try { list012 = parseRoomList012(grids[1]).map((r) => Object.freeze({ ...r, guests: Object.freeze([...r.guests]) })); } catch (e) { list012 = null; gaps.push('012 could not be read just now — no comparison with 012'); }
  const value = Object.freeze({ dates: dates && Object.freeze(dates), keyOfItem: Object.freeze(keyOfItem), list012: list012 && Object.freeze(list012), gaps: Object.freeze(gaps) });
  if (!gaps.length) arrivalSourcesKept = { id, at: now, value };
  return value;
}
/* the Owners' recorded bookings (src/billing/owner-bookings.js): the index of recorded persons, then each record it names */
async function arrivalOwnerEntries(env) {
  if (!env.REG_KV) return { entries: [], gap: null };
  let index;
  try { index = JSON.parse((await env.REG_KV.get(OBK_INDEX_KEY)) || '{}') || {}; } catch (e) { return { entries: [], gap: 'the bookings recorded by the Owners could not be read just now' }; }
  const holders = [...new Set(Object.values(index).flatMap((l) => (Array.isArray(l) ? l : [])).map(clean).filter(Boolean))];
  const entries = []; let unreadable = 0;
  await Promise.all(holders.map(async (h) => {
    let rec; try { rec = readRecord(await env.REG_KV.get(obkKey(h))); } catch (e) { unreadable += 1; return; }
    const state = ownerStateOf(rec);
    for (const e of rec.entries) { const g = clean(e && e.personId); if (/^G\d{3,}$/.test(g)) entries.push({ guestId: g, holderId: h, entryId: e.id == null ? null : e.id, itemId: clean(e.itemId), state }); }
  }));
  return { entries, gap: unreadable ? unreadable + ' record(s) of the bookings the Owners recorded could not be read just now' : null };
}
/** GET admin/arrivals — the base: the guests, the room plan, 002's dates, 012, the Owners' records; nothing is written.
    GET admin/arrivals?facts=INV-…,INV-… — at most ARRIVAL_FACTS_MAX invitations of the register: their own sent trip's facts. */
async function adminArrivals(env, identity, url, cors) {
  const entries = await loadIndex(env, url.origin, false);
  if (!entries || !Object.keys(entries).length) return jsonRes({ ok: false, retry: true, error: 'the register index is not readable just now' }, 503, cors);
  const facts = url.searchParams.get('facts');
  if (facts != null) {
    const known = new Set(Object.values(guestsOfIndex(entries)).filter((g) => !g.ambiguous).map((g) => g.invitationId));
    const invs = [...new Set(facts.split(',').map(clean).filter(Boolean))];
    if (!invs.length || invs.length > ARRIVAL_FACTS_MAX || invs.some((i) => !known.has(i))) return jsonRes({ ok: false, error: 'facts: 1 to ' + ARRIVAL_FACTS_MAX + ' invitations of the register' }, 400, cors);
    const out = {};
    await Promise.all(invs.map(async (inv) => {
      const record = await kvJson(env, 'reg:' + inv);
      const conf = arrivalConfirmationNeeded(record) ? await kvJson(env, 'conf:' + inv) : null;
      out[inv] = arrivalFactsOf(record, conf);
    }));
    return jsonRes({ ok: true, version: ARRIVALS_VERSION, at: new Date().toISOString(), facts: out }, 200, cors);
  }
  const [plan, src, obk] = await Promise.all([roomsGr(env, 'plan').catch(() => null), arrivalSources(env), arrivalOwnerEntries(env)]);
  const owner = {}, gaps = [...src.gaps];
  if (obk.gap) gaps.push(obk.gap);
  if (!plan || plan.ok === false || !plan.units) gaps.push('the room plan could not be read just now — no room is shown');
  let unkeyed = 0;
  for (const x of obk.entries) { const key = src.keyOfItem[x.itemId]; if (!key) { unkeyed += 1; continue; } (owner[x.guestId] = owner[x.guestId] || []).push({ holderId: x.holderId, entryId: x.entryId, key, state: x.state }); }
  if (unkeyed && src.dates) gaps.push(unkeyed + ' booking(s) recorded by the Owners name a product 002 does not list');
  const base = arrivalsBase({ entries, plan: plan && plan.ok !== false ? plan : null, dates: src.dates, list012: src.list012, owner, gaps });
  return jsonRes({ ok: true, at: new Date().toISOString(), audience: adminLabel(identity), factsMax: ARRIVAL_FACTS_MAX, ...base }, 200, cors);
}

/* the guests a write names, resolved from the index: guest id → { invitationId, partyId, name } — or the ids that resolve to nobody */
function resolveGuests(entries, ids, register) {
  const g = guestsOfIndex(entries), out = {}, unknown = [];
  for (const id of ids) {
    const e = g[id];
    if (!e || e.ambiguous) { unknown.push(id); continue; }
    const n = personName(register, e.contactId);
    out[id] = { invitationId: e.invitationId, partyId: e.partyId, name: n ? (n.nick || n.first || '') : '' };
  }
  return { guests: out, unknown };
}
/* what the Owners are told before they confirm a seat: a guest seated who answered "not joining", has not sent the trip, or is not
   coming to the wedding (a seat makes them part of the Wedding Circle) — said, never refused */
function seatWarnings(change, records, entries) {
  const g = guestsOfIndex(entries), out = [];
  for (const [seatId, guestId] of Object.entries(change.target)) {
    if (!guestId || change.expect[seatId] === guestId || !g[guestId]) continue;
    const a = attendanceOf(records[g[guestId].invitationId] || null, guestId, g[guestId].hosts);
    const v = a[change.event];
    if (v === 'no') out.push({ guestId, seatId, text: a.wedding === false ? 'is not coming to the wedding in Vientiane (their sent trip says so)' : 'answered "not joining" for the ' + ASSIGNMENT_EVENTS[change.event].name });
    else if (v === 'not-sent') out.push({ guestId, seatId, text: 'has not sent their trip yet' });
    else if (v === 'undecided') out.push({ guestId, seatId, text: 'has not decided yet for the ' + ASSIGNMENT_EVENTS[change.event].name });
  }
  return out;
}

/** POST admin/seating/apply { event, target, expect, dryRun } — one confirmed change of a seating plan (or its dry run). */
async function adminSeatingApply(env, identity, request, url, cors, deps) {
  const change = seatChangeOf(await request.json().catch(() => null));
  if (change.error) return jsonRes({ ok: false, reason: 'INVALID', error: change.error }, 400, cors);
  const entries = await loadIndex(env, url.origin, false);
  const couple = coupleOfEntries(entries);
  if (change.event === 'ceremony' && !couple) return jsonRes({ ok: false, retry: true, reason: 'COUPLE_UNKNOWN', error: 'the couple\'s places cannot be named just now — nothing was changed' }, 503, cors);
  const named = Object.values(change.target).filter(Boolean);
  /* the register's first name for a new hold — read for the confirmation only, never for a review (the ledger shows its own learned
     names; a name is display, never identity) */
  const src = named.length && !change.dryRun ? await assignmentSources(env, 3000) : { register: null };
  const r = resolveGuests(entries, named, src.register);
  if (r.unknown.length) return jsonRes({ ok: false, reason: 'UNKNOWN_GUEST', error: 'not a guest of the register: ' + r.unknown.join(', ') }, 400, cors);
  if (!change.dryRun && deps && deps.resetLocked && await deps.resetLocked(env)) return jsonRes({ ok: false, retry: true, reason: 'RESET', error: 'the clean reset is running — try again in a moment' }, 503, cors);
  const kv = await recordsOf(env, named.map((g) => r.guests[g].invitationId));
  const warnings = seatWarnings(change, kv.records, entries);
  const out = await engineAdmin(env, 'SEATING', 'seating', 'admin-apply', adminLabel(identity), { event: change.event, target: change.target, expect: change.expect, guests: r.guests, dryRun: change.dryRun }, couple);
  /* a seat given or taken changes who is joined (the Wedding Circle's union): read again at once */
  if (out.j.ok && !change.dryRun && deps && deps.cohortStale) deps.cohortStale(env);
  return jsonRes({ ...out.j, warnings }, out.status, cors);
}
/** POST admin/seating/final { event, action: release | withdraw, expectDigest } */
async function adminSeatingFinal(env, identity, request, url, cors, deps) {
  const body = await request.json().catch(() => null);
  if (deps && deps.resetLocked && await deps.resetLocked(env)) return jsonRes({ ok: false, retry: true, reason: 'RESET', error: 'the clean reset is running — try again in a moment' }, 503, cors);
  const couple = coupleOfEntries(await loadIndex(env, url.origin, false));
  const out = await engineAdmin(env, 'SEATING', 'seating', 'admin-final', adminLabel(identity), { event: clean(body && body.event), action: clean(body && body.action), expectDigest: clean(body && body.expectDigest) }, couple);
  return jsonRes(out.j, out.status, cors);
}
/** POST admin/seating/state { open?, frozen? } — guests' own seat choice, by the Owners */
async function adminSeatingState(env, identity, request, cors, deps) {
  const body = await request.json().catch(() => null);
  const ask = {}; if (body && typeof body.open === 'boolean') ask.open = body.open; if (body && typeof body.frozen === 'boolean') ask.frozen = body.frozen;
  if (!Object.keys(ask).length) return jsonRes({ ok: false, reason: 'INVALID', error: 'open or frozen (true / false) is required' }, 400, cors);
  if (deps && deps.resetLocked && await deps.resetLocked(env)) return jsonRes({ ok: false, retry: true, reason: 'RESET', error: 'the clean reset is running — try again in a moment' }, 503, cors);
  const out = await engineAdmin(env, 'SEATING', 'seating', 'admin-state', adminLabel(identity), ask);
  if (out.j.ok && deps && deps.cohortStale) deps.cohortStale(env);
  return jsonRes(out.j, out.status, cors);
}
/** POST admin/rooms/apply { target, expect, approveRoomCount, dryRun } — one confirmed re-arrangement of one room category. */
async function adminRoomsApply(env, identity, request, url, cors, deps) {
  const change = roomChangeOf(await request.json().catch(() => null));
  if (change.error) return jsonRes({ ok: false, reason: 'INVALID', error: change.error }, 400, cors);
  const entries = await loadIndex(env, url.origin, false), g = guestsOfIndex(entries);
  const moves = roomMovesOf(change);
  const problems = [];
  const unknown = moves.filter((m) => !g[m.guestId] || g[m.guestId].ambiguous).map((m) => m.guestId);
  if (unknown.length) return jsonRes({ ok: false, reason: 'UNKNOWN_GUEST', error: 'not a guest of the register: ' + unknown.join(', ') }, 400, cors);
  if (moves.length) {
    /* A BOOKED ROOM STAYS THE BOOKED ROOM (pricing guard, 18 Nov 2026): a guest whose sent room line carries no room label (its billed
       room would follow the engine) or whose room is fixed by a booking the Owners recorded is never moved by an assignment */
    const kv = await recordsOf(env, moves.map((m) => g[m.guestId].invitationId));
    let obkIndex = null; try { obkIndex = JSON.parse((env.REG_KV && await env.REG_KV.get(OBK_INDEX_KEY)) || '{}') || {}; } catch (e) { obkIndex = null; }
    for (const m of moves) {
      const key = canonicalKey(m.to.slice(0, m.to.lastIndexOf('|')));
      const lines = sentRoomLines(kv.records[g[m.guestId].invitationId], key, canonicalKey);
      if (lines.some((l) => !l.unit)) problems.push({ guestId: m.guestId, reason: 'NO_BILLED_ROOM', text: 'their sent booking names no room label — the booking decides their room' });
      if (obkIndex === null) problems.push({ guestId: m.guestId, reason: 'UNREADABLE', text: 'the Owners\' recorded bookings cannot be read just now' });
      else if (Array.isArray(obkIndex[m.guestId]) && obkIndex[m.guestId].length) problems.push({ guestId: m.guestId, reason: 'OWNER_RECORDED', text: 'their room is fixed by a booking you recorded — change it in that booking' });
    }
  }
  if (problems.length) return jsonRes({ ok: false, reason: 'REFUSED', error: 'the change cannot be made — nothing was changed', problems }, 409, cors);
  if (!change.dryRun && deps && deps.resetLocked && await deps.resetLocked(env)) return jsonRes({ ok: false, retry: true, reason: 'RESET', error: 'the clean reset is running — try again in a moment' }, 503, cors);
  const out = await engineAdmin(env, 'ROOMS', 'rooms', 'admin-apply', adminLabel(identity), { target: change.target, expect: change.expect, approveRoomCount: change.approveRoomCount, dryRun: change.dryRun });
  return jsonRes(out.j, out.status, cors);
}
/** POST admin/rooms/hotel { set: { '<key>|<label>': ['105'] | ['210', '211'] | null }, expectVersion, note, dryRun } — the Owners' hotel
    room numbers of the Souphattra's units (src/hotel-rooms.js · the room engine checks them against the official list and keeps
    them). A number never moves a guest, never changes a place, a booking, a rate, a statement or a cost. */
async function adminRoomsHotel(env, identity, request, cors) {
  const body = await request.json().catch(() => null);
  const set = body && body.set && typeof body.set === 'object' && !Array.isArray(body.set) ? body.set : null;
  const okNos = (v) => v === null || (Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every((n) => typeof n === 'string' && /^\d{3}$/.test(n.trim())));
  if (!set || !Object.keys(set).length || Object.keys(set).length > 80) return jsonRes({ ok: false, reason: 'INVALID', error: 'a change names 1 to 80 rooms' }, 400, cors);
  for (const [k, v] of Object.entries(set)) if (!/^[a-z0-9-]+\/[a-z0-9-]+\|[A-Z]{1,2}$/.test(k) || !okNos(v)) return jsonRes({ ok: false, reason: 'INVALID', error: 'invalid room ' + String(k).slice(0, 48) }, 400, cors);
  if (!Number.isInteger(Number(body.expectVersion)) || Number(body.expectVersion) < 0) return jsonRes({ ok: false, reason: 'INVALID', error: 'expectVersion required' }, 400, cors);
  const out = await engineAdmin(env, 'ROOMS', 'rooms', 'admin-hotel-rooms', adminLabel(identity), { set, expectVersion: Number(body.expectVersion), note: clean(body.note).slice(0, 300), dryRun: body.dryRun === true });
  return jsonRes(out.j, out.status, cors);
}
/** POST admin/rooms/final { action: release | withdraw, expectDigest } */
async function adminRoomsFinal(env, identity, request, cors, deps) {
  const body = await request.json().catch(() => null);
  if (deps && deps.resetLocked && await deps.resetLocked(env)) return jsonRes({ ok: false, retry: true, reason: 'RESET', error: 'the clean reset is running — try again in a moment' }, 503, cors);
  const out = await engineAdmin(env, 'ROOMS', 'rooms', 'admin-final', adminLabel(identity), { action: clean(body && body.action), expectDigest: clean(body && body.expectDigest) });
  return jsonRes(out.j, out.status, cors);
}

/**
 * THE HOTEL ROOM RATE LIST — APPROVED VERSIONS (Owners, 17 Nov 2026). The list itself is generated in the console from the budget
 * comparison's own per-room lines (bookings · 002 · 009 · the Rooms engine); the Owners approve what they see, and that version is
 * frozen here with who, when and its SHA-256: GET admin/rate-list?stay=<centre> lists the versions (the latest with its rows);
 * POST { stay, rows } freezes one (an unchanged list is not a new version). KV `ratelist:<centre>`, the last 20 versions.
 */
async function adminRateList(env, identity, request, url, cors) {
  const stay = clean(request.method === 'POST' ? (await request.clone().json().catch(() => ({}))).stay : url.searchParams.get('stay'));
  if (!/^[A-Z][A-Z0-9]{0,3}$/.test(stay)) return jsonRes({ ok: false, error: 'stay required (a stay of 002, e.g. D1)' }, 400, cors);
  const key = 'ratelist:' + stay;
  let rec = { versions: [] };
  try { const raw = await env.REG_KV.get(key); if (raw) rec = JSON.parse(raw); } catch (e) { return jsonRes({ ok: false, error: 'the approved versions are not readable just now' }, 503, cors); }
  const meta = (v) => ({ n: v.n, at: v.at, by: v.by, hash: v.hash, count: (v.rows || []).length });
  if (request.method !== 'POST') {
    const latest = rec.versions[rec.versions.length - 1] || null;
    return jsonRes({ ok: true, stay, versions: rec.versions.map(meta), latest: latest ? { ...meta(latest), rows: latest.rows } : null }, 200, cors);
  }
  const body = await request.json().catch(() => null);
  const rows = Array.isArray(body && body.rows) ? body.rows.slice(0, 400) : null;
  if (!rows || !rows.length) return jsonRes({ ok: false, error: 'rows required' }, 400, cors);
  const hash = await sha256Hex(stableJson(rows));
  const last = rec.versions[rec.versions.length - 1];
  if (last && last.hash === hash) return jsonRes({ ok: true, unchanged: true, stay, version: meta(last) }, 200, cors);
  const v = { n: (last ? last.n : 0) + 1, at: new Date().toISOString(), by: adminLabel(identity), hash, rows };
  rec.versions = [...rec.versions, v].slice(-20);
  await env.REG_KV.put(key, JSON.stringify(rec));
  return jsonRes({ ok: true, stay, version: meta(v) }, 200, cors);
}

async function extraBedReasons(env, current, src, asOf) {
  const out = [];
  let units = null;
  for (const l of ((current && current.result && current.result.lines) || [])) {
    const ru = clean(l.Room_Unit_ID); if (!ru) continue;
    const parts = ru.split('·'), label = parts[parts.length - 1], itemId = parts.slice(1, -1).join('·');
    const it = src.items && src.items[itemId]; if (!it) continue;
    const key = clean(it.Site_Product_Key).split(/[,|]/)[0];
    const unit = roomUnitOf(key, label);
    if (!unit || !unit.extraBeds) continue;
    if (!units) units = await unitsForOwners(env, src.items);
    const u = ((units && units[key]) || []).find((x) => x.label === unit.label);
    if (!u) { out.push('EXTRA_BED_UNCHECKED: room ' + unit.label + ' of ' + itemId + ' is not in the room list just now — the extra bed of this statement cannot be checked'); continue; }
    const inRoom = u.holders.length + (u.kept || 0);
    if (inRoom <= unit.places) continue;
    /* the guest the Rooms engine seated on the bed is the one checked; a room beyond its places with nobody marked (an older
       booking) checks everyone in it — fail closed */
    if (Array.isArray(u.beds) && u.beds.length && !u.beds.includes(clean(l.Person_ID))) continue;
    const m = matchSpecialRate(src.specialRates || [], { holderId: clean(l.Holder_ID), personId: clean(l.Person_ID), itemId, asOf: evaluationDay(asOf) });
    if (!(m.rate && m.personScoped)) out.push('EXTRA_BED_UNPRICED: ' + clean(l.Person_ID) + ' is in room ' + unit.label + ' of ' + itemId + ', which holds ' + inRoom + ' for its ' + unit.places + ' places — no approved 009 row of their own is in effect');
  }
  return [...new Set(out)];
}

/* every unit of the products the Owners can record a room in: its places, who holds them (ids and first names) and what is free */
async function unitsForOwners(env, items) {
  const keys = new Set(Object.values(items).filter((it) => clean(it.Quota_Unit) === 'ROOM' && clean(it.Rate_Status) !== 'RETIRED')
    .map((it) => clean(it.Site_Product_Key).split(/[,|]/)[0]).filter((k) => k.includes('/')));
  const plan = await roomsGr(env, 'plan');
  const out = {};
  for (const k of keys) {
    const units = (plan.units && plan.units[k]) || [];
    out[k] = units.filter((u) => !u.dedicatedTo).map((u) => ({ label: u.label, places: u.places,
      /* the couple's suite (Owners, 19 Nov 2026): Haruthai's and Suthep's alone — recorded for nobody else */
      ...(u.couple ? { couple: true } : {}),
      /* a place kept for a party carries the guest id "~…" — it is a kept place, never a person */
      holders: (u.occupants || []).filter((o) => o.guestId && !String(o.guestId).startsWith('~')).map((o) => o.guestId), kept: (u.occupants || []).filter((o) => !o.guestId || String(o.guestId).startsWith('~')).length,
      keptFor: (u.occupants || []).filter((o) => !o.guestId || String(o.guestId).startsWith('~')).map((o) => o.partyId || null),
      /* the guests whose booking took the extra bed (src/rooms.js marks them) */
      beds: (u.occupants || []).filter((o) => o.guestId && o.bed).map((o) => o.guestId),
      free: Math.max(0, u.places - (u.occupants || []).length),
      /* the extra bed beyond the room's own places (src/inventory-seed.js, Owner 17 Nov 2026): its count only, never who may use it */
      ...(u.extraBeds ? { extraBeds: u.extraBeds } : {}) }));
  }
  return out;
}

/**
 * GET admin/owner-bookings?holder=INV — the bookings Haruthai & Suthep recorded for one paying invitation: each entry with the
 * engine's price for it (002 standard rate or the person's 009 named rate for this payer, nights charged, amount), who sleeps in
 * each recorded room, what still stands in the way of billing, the state (RECORDED / CONFIRMED) and the log; and what the form
 * offers — the register's active guests and the 002 products. A read never writes.
 */
async function adminOwnerBookingsGet(env, identity, url, cors) {
  const holderId = clean(url.searchParams.get('holder'));
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holder required' }, 400, cors);
  const asOf = evaluationDay(url.searchParams.get('asOf'));
  const entries = await loadIndex(env, url.origin, false);
  const holder = holdersOfIndex(entries).find((h) => h.Holder_ID === holderId);
  if (!holder || holder.ambiguous) return jsonRes({ ok: false, error: holderId + ' is not one invitation of the register' }, 404, cors);
  const src = await loadSource(env, asOf, { register: true });
  const ob = await ownerBookingsOf(env, holderId, src, { guestId: holder.guestId, origin: url.origin, asOf });
  const rows = ob.rec.entries.length ? calculate(toBookings(holderId, ob.rec, src.items, nightsOf), { items: src.items, specialRates: src.specialRates, asOf }) : null;
  const persons = holdersOfIndex(entries).filter((h) => !h.ambiguous && h.guestId).map((h) => ({ guestId: h.guestId, name: (nameOf(src.register, h.contactId) || {}).full || h.guestId }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const names = Object.fromEntries(persons.map((p) => [p.guestId, p.name]));
  return jsonRes({ ok: true, asOf, Holder_ID: holderId, payerGuestId: holder.guestId, rev: ob.rec.rev, state: ob.state,
    confirmed: ob.rec.confirmed, problems: ob.problems,
    /* each entry with its own engine line, matched by the Booking_ID the entry gave it (OB·holder·person·item·entry) */
    entries: ob.rec.entries.map((e) => {
      const l = rows ? rows.lines.find((x) => clean(x.Booking_ID).split('·').pop() === e.id) : null;
      return { id: e.id, personId: e.personId, person: names[e.personId] || e.personId, itemId: e.itemId, room: e.room, extraBed: !!e.extraBed, note: e.note, held: e.held || null,
        recordedBy: e.recordedBy, recordedAt: e.recordedAt, line: l ? lineView(l, names) : null };
    }),
    total: rows ? rows.totalPayable : 0, manualReview: rows ? rows.manualReview.length : 0,
    rooms: occupancy(ob.rec, src.items).map((r) => ({ ...r, names: r.persons.map((p) => names[p] || p) })),
    log: ob.rec.log.slice(-20),
    /* THE REAL UNITS (Owner, 15 Nov 2026): what is free in each room product now, so the Owners pick a unit that exists and is free */
    units: await unitsForOwners(env, src.items).catch((e) => ({ error: clean(e && e.message).slice(0, 160) })),
    choices: { persons, items: Object.entries(src.items).filter(([, it]) => clean(it.Rate_Status) !== 'RETIRED')
      .map(([id, it]) => ({ itemId: id, key: clean(it.Site_Product_Key).split(/[,|]/)[0] || null, rate: listRateOf(it), basis: clean(it.Rate_Basis) || null, maxPax: Number(it.Max_Pax) || null })) },
  }, 200, cors);
}

/**
 * POST admin/owner-bookings { holderId, expectedRev, action: add|remove|confirm, entry|entryId } — a BILLING_ADMIN records,
 * removes or confirms the Owners' bookings of one paying invitation. The revision shown must still be the stored one (STALE
 * otherwise — KV has no compare-and-swap: this narrows the window to the write itself, and Issue binds the confirmed revision
 * in its proposal hash). Confirm is refused while anything stands in the way of billing. Never issues, never e-mails.
 */
async function adminOwnerBookingsPost(env, identity, request, url, cors) {
  const body = await request.json().catch(() => null);
  const holderId = clean(body && body.holderId);
  if (!INVITATION_RE.test(holderId)) return jsonRes({ ok: false, error: 'holderId required' }, 400, cors);
  if (!env.REG_KV) return jsonRes({ ok: false, error: 'the booking store is not bound' }, 503, cors);
  const action = clean(body.action);
  if (!['add', 'remove', 'confirm'].includes(action)) return jsonRes({ ok: false, error: 'action must be add, remove or confirm' }, 400, cors);
  const entries = await loadIndex(env, url.origin, false);
  const holders = holdersOfIndex(entries);
  const holder = holders.find((h) => h.Holder_ID === holderId);
  if (!holder || holder.ambiguous) return jsonRes({ ok: false, error: holderId + ' is not one invitation of the register' }, 404, cors);
  const asOf = evaluationDay();
  /* a fresh read of 002/009: recording and confirming are financial acts, never judged on a held copy */
  const src = await pricing(env, asOf, true);
  const raw = await env.REG_KV.get(obkKey(holderId));
  const rec = readRecord(raw);
  if (Number(body.expectedRev) !== rec.rev) return jsonRes({ ok: false, error: 'the bookings changed since they were shown; nothing was written', reasons: ['STALE'], rev: rec.rev }, 409, cors);
  let held = null;
  if (action === 'confirm') {
    /* the couple's suite, recorded for anyone else before the rule — with or without a room — is never confirmed (review, 19 Nov 2026) */
    const strangers = (rec.entries || []).filter((e) => { const it = src.items[clean(e.itemId)], key = it ? clean(it.Site_Product_Key).split(/[,|]/)[0] : ''; return key && ROOM_SEED[key] && ROOM_SEED[key].couple && !COUPLE_GUESTS.includes(clean(e.personId)); });
    if (strangers.length) return jsonRes({ ok: false, error: 'the Souphattra Presidential is the couple\'s suite — remove the entries of anyone else first; nothing was confirmed', reasons: strangers.map((e) => 'COUPLE_SUITE: ' + clean(e.personId)) }, 409, cors);
    const ob = await ownerBookingsOf(env, holderId, src, { guestId: holder.guestId, origin: url.origin, asOf });
    if (ob.problems.length) return jsonRes({ ok: false, error: 'these bookings cannot be confirmed yet', reasons: ob.problems }, 409, cors);
    /* THE ROOM IS RESERVED, NOT ONLY NAMED (Owner, 15 Nov 2026): every person recorded in a room holds their place in that very
       unit of the Rooms engine before the confirmation is written — the room's own places first, the extra bed beyond them —
       so no place of it is offered to anyone else. A unit another guest holds a place in is refused, nothing is confirmed. */
    const plan = holdPlan(rec, src.items);
    if (plan.length) {
      const free = await unitsForOwners(env, src.items);
      const byHolderIndex = new Map(holders.filter((h) => !h.ambiguous && h.guestId).map((h) => [h.guestId, h]));
      const recorded = new Set(plan.map((x) => x.personId));
      /* THE PAYING GUEST'S OWN PLACE IS THIS BOOKING'S (Owner, 17 Nov 2026): the payer keeps her room through her own selection and
         the Owners record the others into it — her place is not "another guest's", recorded or not, exactly as the form shows it
         ("held by this booking's guests"); it fills one of the room's own places all the same */
      const ours = new Set([...recorded, clean(holder.guestId)].filter(Boolean));
      /* the recorded persons' own parties: a place kept for one of them is theirs, not a stranger's */
      const ourParties = new Set(plan.map((x) => (byHolderIndex.get(x.personId) || {}).partyId).filter(Boolean));
      for (const [k, label] of [...new Set(plan.map((x) => x.key + '|' + x.label))].map((x) => x.split('|'))) {
        const unit = (free[k] || []).find((u) => u.label === label);
        if (!unit) return jsonRes({ ok: false, error: 'room ' + label + ' is not a unit of ' + k, reasons: ['ROOM_UNKNOWN: ' + k + ' · ' + label] }, 409, cors);
        if (unit.couple && plan.some((x) => x.key === k && x.label === label && !COUPLE_GUESTS.includes(x.personId))) return jsonRes({ ok: false, error: 'room ' + label + ' is the couple\'s suite — Haruthai\'s and Suthep\'s alone', reasons: ['COUPLE_SUITE: ' + k + ' · ' + label] }, 409, cors);
        const strangers = unit.holders.filter((g) => !ours.has(g)).length + (unit.keptFor || []).filter((pid) => !pid || !ourParties.has(pid)).length;
        /* counted per unit (review, 17 Nov 2026): a place one of ours holds HERE fills one of its own places unless that person is
           recorded into this very unit — an entry of hers in another unit or stage never hides it */
        const inUnit = new Set(plan.filter((x) => x.key === k && x.label === label).map((x) => x.personId));
        const own = plan.filter((x) => x.key === k && x.label === label && !x.extraBed).length + unit.holders.filter((g) => ours.has(g) && !inUnit.has(g)).length;
        if (strangers > 0) return jsonRes({ ok: false, error: 'room ' + label + ' is held by another guest', reasons: ['ROOM_TAKEN: ' + k + ' · ' + label + ' holds ' + strangers + ' place(s) of another guest'] }, 409, cors);
        if (own > unit.places) return jsonRes({ ok: false, error: 'room ' + label + ' has ' + unit.places + ' places', reasons: ['ROOM_OVER_CAPACITY: ' + k + ' · ' + label] }, 409, cors);
      }
      const names = await loadGuestRegister(env, await prefetchTabs(env, cfgOf(env), ['guestlist'])).catch(() => null);
      const occupants = plan.map((x) => { const h = byHolderIndex.get(x.personId) || {}; const n = names ? nameOf(names, h.contactId) : null;
        return { key: x.key, label: x.label, guestId: x.personId, invitationId: h.Holder_ID || ('INV-' + x.personId), partyId: h.partyId || null, name: (n && (n.nick || n.first)) || '' }; });
      /* a person who already holds exactly this unit keeps that place — a second confirmation (after a change, or twice) asks
         the Rooms engine only for the places still missing (review, 15 Nov 2026) */
      const holdsIt = (o) => ((free[o.key] || []).find((u) => u.label === o.label) || { holders: [] }).holders.includes(o.guestId);
      /* the room's own places, then the extra bed — the one place beyond the unit's capacity, and only for a person recorded as such */
      const regular = occupants.filter((o, i) => !plan[i].extraBed && !holdsIt(o)), beds = occupants.filter((o, i) => plan[i].extraBed && !holdsIt(o));
      const a = regular.length ? await roomsGr(env, 'assign', { occupants: regular }) : { ok: true, done: [] };
      const b = beds.length ? await roomsGr(env, 'assign', { occupants: beds, force: true }) : { ok: true, done: [] };
      if (!a.ok || !b.ok) return jsonRes({ ok: false, error: 'the room could not be reserved; nothing was confirmed', reasons: [...(a.refused || []), ...(b.refused || [])].map((x) => 'ROOM_REFUSED: ' + x.guestId + ' · ' + x.key + ' · ' + x.label + ' · ' + x.error) }, 409, cors);
      held = new Map(plan.map((x) => [x.entryId, { key: x.key, label: x.label }]));
    }
  }
  const persons = new Map(holders.filter((h) => !h.ambiguous && h.guestId).map((h) => [h.guestId, h.guestId]));
  /* THE COUPLE'S SUITE (Owners, 19 Nov 2026): the Souphattra Presidential is recorded for Haruthai and Suthep only — refused when it
     is added, not only when the room is held at Confirm */
  if (action === 'add' && body.entry && typeof body.entry === 'object') {
    const it = src.items[clean(body.entry.itemId)], key = it ? clean(it.Site_Product_Key).split(/[,|]/)[0] : '';
    if (key && ROOM_SEED[key] && ROOM_SEED[key].couple && !COUPLE_GUESTS.includes(clean(body.entry.personId))) {
      return jsonRes({ ok: false, error: 'the Souphattra Presidential is the couple\'s suite — Haruthai\'s and Suthep\'s alone; nothing was written', reasons: ['COUPLE_SUITE: ' + key] }, 409, cors);
    }
  }
  const r = applyAction(rec, action, { entry: body.entry, entryId: body.entryId, by: adminLabel(identity), at: new Date().toISOString(), items: src.items, persons });
  if (!r.ok) return jsonRes({ ok: false, error: r.error }, 409, cors);
  /* the entries the confirmation holds a place for carry it (a removal gives that place back) */
  if (held && r.record) r.record.entries = r.record.entries.map((e) => (held.has(e.id) ? { ...e, held: held.get(e.id) } : e));
  if (r.unchanged) return jsonRes({ ok: true, unchanged: true, rev: rec.rev, state: ownerStateOf(rec) }, 200, cors);
  /* the record as it stands right before the write */
  if ((await env.REG_KV.get(obkKey(holderId))) !== raw) return jsonRes({ ok: false, error: 'the bookings changed meanwhile; nothing was written', reasons: ['STALE'] }, 409, cors);
  /* which paying invitations hold which persons (the double-booking check across payers) — read before anything is written: an
     unreadable index is never overwritten, nothing is written at all */
  let index = {};
  if (action !== 'confirm') {
    try { index = JSON.parse((await env.REG_KV.get(OBK_INDEX_KEY)) || '{}') || {}; } catch (e) { index = null; }
    if (!index) return jsonRes({ ok: false, error: 'the index of recorded persons is not readable; nothing was written', reasons: ['OWNER_RECORD_UNREADABLE'] }, 503, cors);
  }
  await env.REG_KV.put(obkKey(holderId), JSON.stringify(r.record));
  /* a removed entry whose place the Owners' confirmation held gives that place back to the room */
  if (action === 'remove') {
    const gone = rec.entries.find((e) => e.id === clean(body.entryId));
    if (gone && gone.held) await roomsGr(env, 'unassign', { guestId: gone.personId, key: gone.held.key }).catch(() => null);
  }
  if (action !== 'confirm') {
    const mine = new Set(r.record.entries.map((e) => e.personId));
    for (const p of Object.keys(index)) index[p] = (index[p] || []).filter((h) => h !== holderId || mine.has(p));
    for (const p of mine) index[p] = [...new Set([...(index[p] || []), holderId])];
    for (const p of Object.keys(index)) if (!index[p].length) delete index[p];
    await env.REG_KV.put(OBK_INDEX_KEY, JSON.stringify(index));
  }
  return jsonRes({ ok: true, rev: r.record.rev, state: ownerStateOf(r.record) }, 200, cors);
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
      channel: pref.verifiedMethod || pref.channel, source: pref.source, by });
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
      case 'admin/readiness': return await adminReadiness(env, identity, url, cors);
      case 'admin/holder': return await adminHolder(env, identity, url, cors);
      case 'admin/profile': return await adminProfile(env, url, cors, deps);
      case 'admin/preview-pdf': return await adminPreviewPdf(env, identity, url, cors);
      case 'admin/send':
        return request.method === 'POST' ? await adminSendPost(env, identity, request, url, cors, deps) : await adminSendGet(env, identity, url, cors);
      /* Confirm booking: a BILLING_ADMIN confirms the submitted booking, as Guest Relations would (Owner, 7 Oct 2026) */
      case 'admin/confirm':
        return request.method === 'POST' ? await adminConfirmPost(env, identity, request, url, cors) : await adminConfirmGet(env, identity, url, cors);
      /* the Owners' own bookings (15 Nov 2026): recorded, removed and confirmed by a BILLING_ADMIN; billed only once confirmed */
      case 'admin/owner-bookings':
        return request.method === 'POST' ? await adminOwnerBookingsPost(env, identity, request, url, cors) : await adminOwnerBookingsGet(env, identity, url, cors);
      case 'admin/rate-list': return await adminRateList(env, identity, request, url, cors);
      case 'admin/extra-bed':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminExtraBed(env, identity, request, cors);
      /* THE OWNERS' SEATING & ROOM ASSIGNMENTS (Owners, 18 Nov 2026) — read with GET, every write a POST */
      case 'admin/assignments': return await adminAssignments(env, identity, url, cors);
      case 'admin/arrivals': return await adminArrivals(env, identity, url, cors);
      case 'admin/pwd': return await adminPwd(env, identity, url, cors);
      case 'admin/pwd/release':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminPwdRelease(env, identity, request, url, cors);
      case 'admin/seating/apply':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminSeatingApply(env, identity, request, url, cors, deps);
      case 'admin/seating/final':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminSeatingFinal(env, identity, request, url, cors, deps);
      case 'admin/seating/state':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminSeatingState(env, identity, request, cors, deps);
      case 'admin/rooms/apply':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminRoomsApply(env, identity, request, url, cors, deps);
      case 'admin/rooms/final':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminRoomsFinal(env, identity, request, cors, deps);
      case 'admin/rooms/hotel':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST only' }, 405, cors);
        return await adminRoomsHotel(env, identity, request, cors);
      /* A READ NEVER WRITES (Owner, 8 Oct 2026 · closeout): every route below that records something in the ledger answers only a
         POST; a GET of reconcile is its read-only preview — the same report, nothing recorded (written: false) */
      case 'issue':
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
        return await adminIssue(env, identity, request, cors);
      case 'revenue': return await adminRevenue(env, identity, url, cors);
      case 'reconcile': return await adminReconcile(env, identity, request, cors, request.method === 'POST');
      case 'gate': return await gateRead(env, identity, url, cors);
      case 'gate/approve': {
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
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
        if (request.method !== 'POST') return jsonRes({ ok: false, error: 'POST required' }, 405, cors);
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
          /* the lock takes the method the guest actually paid with, where 008 names one (HS-004.19) */
          holderId: holder || null, lockPreference: locks,
          channel: (pref && pref.verifiedMethod) || (isChannel(clean(row.Method)) ? clean(row.Method) : pref && pref.channel),
          source: pref && pref.source, basis: (pref && pref.basis) || null, by });
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
