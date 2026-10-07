/* ============================================================================
   H&S WEDDING 2027 · THE BILLING LEDGER
   (Owner, 4 Oct 2026 · OWNER-INFRA-CHANGE: the authorized fifth Durable Object)
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL, section 2 of
   the Owner authorization (Freeze · B, I, R, X, AB).

   ONE Durable Object instance, id "billing", holds the website side of the
   Guest Settlement. Allocating a Settlement_ID, opening a revision and issuing
   one are all read-then-write steps, and Cloudflare routes every request for
   that id to a single actor which handles them one at a time. That is the whole
   reason this is an actor and not a KV namespace: two Billing Manager tabs can
   never mint the same Settlement_ID, and no revision can be issued twice.

   WHAT THIS IS NOT. It is not the payment journal. 008_Payment_Journal in
   Google is the canonical guest payment journal; nothing here mirrors, caches
   or replaces it. A website-side fallback journal would become a second truth
   within a day, so when Google refuses an append the operation must fail
   visibly at the caller instead of being absorbed in this ledger.

   IT NEVER DERIVES AN AMOUNT. Every figure it holds arrives verbatim from the
   one calculation path, src/billing/engine.js, and a stored draft is checked
   against ENGINE_VERSION before it is accepted: a result from another engine
   version is refused and has to be recomputed, never migrated. The ledger
   copies totals, it does not add them up, which is why the Billing Manager
   listing carries no grand total. A revenue figure is engine output
   (Freeze · U), not a sum of rows in a store.

   ISSUED IS IMMUTABLE. Once a revision carries a Settlement Snapshot it is the
   record of what was sent, not a document that can still be edited. Any write
   that would alter it is refused with an explicit error and nothing is merged.
   The one transition an issued revision accepts is SUPERSEDE through
   settlement.js · nextRevisionState, which records that a later revision
   replaced it and leaves every stored figure untouched. ISSUE is deliberately
   not reachable through revision-state, so the ISSUED state can only ever
   exist together with the snapshot that justifies it.

   THE GATE CANNOT APPROVE ITSELF. Issue & Publish is refused until the stored
   gate record says approved, and that record is only ever written by
   gate-approve carrying a human name and a timestamp, judged by
   activation-gate.js · evaluateGate over all five conditions. A request that
   tries to carry the verdict itself is refused outright, and the ledger will
   not record itself, the engine or an agent as the approver.

   NO SECRETS REACH THIS FILE. The constructor takes only `state` on purpose:
   there is no `env` here, so GOOGLE_SERVICE_ACCOUNT_JSON is not reachable from
   the ledger, cannot be logged by it and cannot appear in one of its responses.

   KEY SPACE (this.state.storage, key/value):
     seq:settlement            the monotonic counter behind settlementIdOf()
     sid:<Settlement_ID>       reverse index, Settlement_ID to Holder_ID
     settlement:<Holder_ID>    the settlement record and its revision pointers
     revision:<SID>:<n>        one revision, its state and its frozen snapshot
     draft:<Holder_ID>         the latest recomputed engine result (a view)
     override:<Holder_ID>      Bill_To_Holder_ID overrides, with their trail
     roomunit:<Room_Unit_ID>   which holders and persons share one room unit
     drift:<Holder_ID>         current drift state
     paypref:<Holder_ID>       the Holder's payment method, its trail and its lock
     paydec:<Payment_ID>       the one BILLING_ADMIN decision on a reported payment
                               (PENDING while Google is written, then DONE)
     gate                      the Activation Gate approval record

   OPERATIONS (the last path segment names the operation, JSON in and out):
     read              ?holder=&revision=         the ledger, or one holder
     settlement        { holderId, create, by }    read, or allocate one
     draft             { holderId, revision?, result, asOf, sourceHash }
     revision-create   { holderId, result?, by }
     revision-state    { holderId, revision, action, by }
     revision-issue    { holderId, revision, items, specialRates, fx,
                         issueDate, dueDateOverride, evidenceStatus, sourceHash }
     override-set      { holderId, billToHolderId|clear, by, note }
     gate-read
     gate-approve      { approvedBy, approvedAt, caseResults, items, specialRates,
                         fx, fxAsOf, fxProvenance, siteKeyDuplicates, nightsGaps }
     drift-set         { holderId, drifts, by }
     payment-preference { holderId, action: read | set | lock, channel, source, by,
                         verifiedPaymentId, note }
     payment-decision  { paymentId, action: claim | check | complete | release | resume, decision,
                         rejectReason, holderId, lockPreference, channel, source, token,
                         alreadyVerified, by }
     drift-read        ?holder=
     holders                                      the Billing Manager listing
   ========================================================================== */

import {
  SETTLEMENT_STATE, REVISION_STATE, MANUAL_REVIEW_REQUIRED, ACCOUNTING_CURRENCY,
  DRIFT_BLOCKING, DRIFT_REPORT_ONLY, MONITORING, settlementIdOf, fromCents,
} from './billing/model.js';
import { ENGINE_VERSION } from './billing/engine.js';
import {
  buildSnapshot, canIssue, freezeFx, nextRevisionState, settlementStateAfterDrift,
} from './billing/settlement.js';
import { evaluateGate, GATE_NOT_RUN } from './billing/activation-gate.js';
import { isChannel, PREFERENCE_SOURCE } from './billing/preference.js';

const SEQ = 'seq:settlement';
const GATE = 'gate';
const SID = 'sid:';
const SETTLEMENT = 'settlement:';
const REVISION = 'revision:';
const DRAFT = 'draft:';
const OVERRIDE = 'override:';
const ROOM_UNIT = 'roomunit:';
const DRIFT = 'drift:';
const PAYPREF = 'paypref:';
const PAYDEC = 'paydec:';
/* THE STATEMENT E-MAIL LOG (Owner, 7 Oct 2026 · admin console): one record per issued revision, every attempt kept */
const STMTMAIL = 'stmtmail:';
/* the drift codes that compare the live source with an ISSUED snapshot */
export const SNAPSHOT_COMPARISON = ['RATE_DRIFT', 'SPECIAL_RATE_MISMATCH', 'INVOICE_DRIFT', 'SETTLEMENT_MISMATCH', 'CATEGORY_DRIFT', 'BOOKING_DRIFT'];
/* a claim whose Worker never came back (crash between claim and Google write)
   is never taken over or released; after this long a BILLING_ADMIN may resume
   it — re-sending the claim's own fixed payload (action resume) */
const CLAIM_STALE_MS = 10 * 60 * 1000;
/* THE LEASE (Codex final review, round 3). A claim's writer may send its Google
   write only until CLAIM_STALE_MS − WRITE_MARGIN_MS after the claim (the
   transport refuses to dispatch later and aborts 30 s after); a claim can be
   resolved only once the whole lease has run out, so no fenced-off writer can
   still reach Google when another decision is allowed. */
const WRITE_MARGIN_MS = 3 * 60 * 1000;

const OPS = ['read', 'settlement', 'draft', 'revision-create', 'revision-state',
  'revision-issue', 'override-set', 'gate-read', 'gate-approve', 'drift-set',
  'drift-read', 'holders', 'payment-preference', 'payment-decision', 'statement-mail'];
/* a send whose Worker never reported back is never taken over silently: after this long it counts as UNCERTAIN */
const MAIL_CLAIM_MS = 5 * 60 * 1000;

/* Freeze · AB condition 5 is a human act. These names are never a human, and
   the first of them is this ledger: it must not be able to approve itself. */
const NEVER_THE_APPROVER = ['ledger', 'billing ledger', 'billingledger', 'billing_ledger',
  'engine', 'agent', 'system', 'worker', 'automation', 'claude', 'codex', 'bot', 'cron'];

/* A revision whose figures are already a record. Nothing merges into these. */
const FROZEN_STATES = [REVISION_STATE.ISSUED, REVISION_STATE.SUPERSEDED];

const clean = (v) => String(v == null ? '' : v).trim();
const yes = (v) => v === true || v === 1 || v === 'true' || v === '1' || v === 'yes';
const nowIso = () => new Date().toISOString();

export class BillingLedger {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  /* ----------------------------------------------------------------- reads */

  /* every key under one prefix, as [suffix, value] pairs */
  async listOf(prefix) {
    const map = await this.storage.list({ prefix });
    const out = [];
    for (const [k, v] of map) out.push([k.slice(prefix.length), v]);
    return out;
  }

  settlementOf(holderId) { return this.storage.get(SETTLEMENT + holderId); }
  draftOf(holderId) { return this.storage.get(DRAFT + holderId); }
  overrideOf(holderId) { return this.storage.get(OVERRIDE + holderId); }
  revisionKey(settlementId, n) { return REVISION + settlementId + ':' + n; }
  revisionOf(settlementId, n) { return this.storage.get(this.revisionKey(settlementId, n)); }

  async driftOf(holderId) {
    const rec = await this.storage.get(DRIFT + holderId);
    return rec || { Holder_ID: holderId, drifts: [], blocking: [], updatedAt: null };
  }

  /* every revision of one settlement, oldest first */
  async revisionsOf(settlementId) {
    const rows = await this.listOf(REVISION + settlementId + ':');
    return rows
      .map(([n, rec]) => ({ n: Number(n), rec }))
      .sort((a, b) => a.n - b.n)
      .map((r) => r.rec);
  }

  /* the drift of the whole operation, which is what the gate's condition 2 asks about */
  async allDrifts() {
    const rows = await this.listOf(DRIFT);
    const out = [];
    for (const [, rec] of rows) for (const d of (rec && rec.drifts) || []) out.push(d);
    return out;
  }

  /* a revision as the listing shows it: the state and the figures the snapshot
     already fixed, without carrying the whole snapshot in every response */
  static revisionSummary(rec) {
    if (!rec) return null;
    return {
      Settlement_ID: rec.Settlement_ID, Revision: rec.Revision,
      Revision_State: rec.Revision_State,
      hasSnapshot: !!rec.snapshot,
      Issue_Date: rec.Issue_Date || null, Due_Date: rec.Due_Date || null,
      Total_Payable_Cents: rec.Total_Payable_Cents == null ? null : rec.Total_Payable_Cents,
      snapshotGaps: rec.snapshotGaps || [],
      issuedAt: rec.issuedAt || null, issuedBy: rec.issuedBy || null,
      supersededAt: rec.supersededAt || null, supersededBy: rec.supersededBy || null,
      createdAt: rec.createdAt || null, updatedAt: rec.updatedAt || null,
    };
  }

  /* everything the Billing Manager and the guest view need for one Holder */
  async holderView(holderId, revisionWanted) {
    const s = await this.settlementOf(holderId);
    const revisions = s ? await this.revisionsOf(s.Settlement_ID) : [];
    const issued = s && s.issuedRevision
      ? revisions.find((r) => r.Revision === s.issuedRevision) || null
      : null;
    const one = revisionWanted != null
      ? revisions.find((r) => r.Revision === revisionWanted) || null
      : null;
    const roomUnits = [];
    for (const ru of (s && s.roomUnitIds) || []) {
      const rec = await this.storage.get(ROOM_UNIT + ru);
      if (rec) roomUnits.push(rec);
    }
    return {
      Holder_ID: holderId,
      Settlement_ID: s ? s.Settlement_ID : null,
      state: s ? s.Settlement_State : SETTLEMENT_STATE.NOT_CREATED,
      settlement: s || null,
      revisions: revisions.map(BillingLedger.revisionSummary),
      issued,
      revision: one,
      draft: (await this.draftOf(holderId)) || null,
      override: (await this.overrideOf(holderId)) || null,
      paymentPreference: (await this.storage.get(PAYPREF + holderId)) || null,
      drift: await this.driftOf(holderId),
      roomUnits,
    };
  }

  /* --------------------------------------------------------------- writes */

  /* Freeze · B: ROOM quota is consumed per Room_Unit_ID, not per Person, so
     billing has to know which persons and which holders sit in one unit. The
     relationship is read straight off the engine's own lines: no new identifier
     is minted here and no amount is touched. A unit this holder has left is
     released, never silently kept. */
  async indexRoomUnits(holderId, settlementId, lines, previous, at) {
    const wanted = new Map();
    for (const l of Array.isArray(lines) ? lines : []) {
      const ru = clean(l && l.Room_Unit_ID);
      if (!ru) continue;
      let info = wanted.get(ru);
      if (!info) { info = { Item_ID: clean(l.Item_ID) || null, Bill_To_Holder_ID: clean(l.Bill_To_Holder_ID) || null, Person_IDs: [] }; wanted.set(ru, info); }
      const p = clean(l.Person_ID);
      if (p && !info.Person_IDs.includes(p)) info.Person_IDs.push(p);
    }

    for (const ru of Array.isArray(previous) ? previous : []) {
      if (wanted.has(ru)) continue;
      const rec = await this.storage.get(ROOM_UNIT + ru);
      if (!rec || !rec.holders) continue;
      delete rec.holders[holderId];
      rec.updatedAt = at;
      if (Object.keys(rec.holders).length) await this.storage.put(ROOM_UNIT + ru, rec);
      else await this.storage.delete(ROOM_UNIT + ru);
    }

    for (const [ru, info] of wanted) {
      const rec = (await this.storage.get(ROOM_UNIT + ru)) || { Room_Unit_ID: ru, Item_ID: info.Item_ID, holders: {} };
      rec.Item_ID = rec.Item_ID || info.Item_ID;
      rec.holders[holderId] = { Settlement_ID: settlementId, Person_IDs: info.Person_IDs, Bill_To_Holder_ID: info.Bill_To_Holder_ID };
      rec.updatedAt = at;
      await this.storage.put(ROOM_UNIT + ru, rec);
    }
    return [...wanted.keys()];
  }

  /* An engine result, or the reason it is not one. The ledger accepts figures
     from exactly one producer and one version of it (Freeze · U, V). */
  static checkResult(result) {
    if (!result || typeof result !== 'object' || !Array.isArray(result.lines)) {
      return 'a draft must be the verbatim result of src/billing/engine.js calculate()';
    }
    const v = clean(result.engineVersion);
    if (v !== ENGINE_VERSION) {
      return 'this result carries ' + (v || 'no engine version') + ' and the ledger stores '
        + ENGINE_VERSION + ' only; recompute it through the engine';
    }
    return null;
  }

  /* The draft record: the engine's own object, kept whole, plus the pointers a
     listing needs. Every number below is copied, none is calculated. */
  static draftRecord({ holderId, settlementId, revision, result, asOf, sourceHash, calculatedAt, by, at }) {
    const review = (result.manualReview || []).length;
    return {
      Holder_ID: holderId, Settlement_ID: settlementId,
      Revision: revision == null ? null : revision,
      engineVersion: result.engineVersion,
      result,
      totalPayableCents: result.totalPayableCents == null ? null : result.totalPayableCents,
      totalPayable: result.totalPayable == null ? null : result.totalPayable,
      hostedValueCents: result.hostedValueCents == null ? null : result.hostedValueCents,
      currency: clean(result.currency) || ACCOUNTING_CURRENCY,
      lineCount: result.lines.length,
      lineHolders: [...new Set(result.lines.map((l) => clean(l && l.Holder_ID)).filter(Boolean))],
      manualReviewCount: review,
      review: review ? MANUAL_REVIEW_REQUIRED : null,
      reviewReasons: (result.manualReview || []).map((l) => l.reviewReason).filter(Boolean),
      asOf: clean(asOf) || null,
      sourceHash: clean(sourceHash) || null,
      calculatedAt: clean(calculatedAt) || null,
      storedAt: at, storedBy: clean(by) || null,
    };
  }

  /* -------------------------------------------------------------- the actor */

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');
    let op = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
    if (!op || op === 'billing' || op === 'billing-ledger') op = 'read';

    const body = (await safeJson(request)) || {};
    const holderId = clean(body.holderId || url.searchParams.get('holder'));
    const by = clean(body.by || body.actor);
    const at = nowIso();

    /* ---------------------------------------------------------------- read */
    if (op === 'read') {
      if (holderId) {
        const r = url.searchParams.get('revision') != null ? Number(url.searchParams.get('revision')) : (body.revision != null ? Number(body.revision) : null);
        return json({ ok: true, holder: await this.holderView(holderId, Number.isInteger(r) ? r : null) });
      }
      const settlements = await this.listOf(SETTLEMENT);
      const gate = await this.storage.get(GATE);
      return json({
        ok: true,
        engineVersion: ENGINE_VERSION,
        currency: ACCOUNTING_CURRENCY,
        sequence: Number(await this.storage.get(SEQ)) || 0,
        settlements: settlements.length,
        gate: gate || GATE_NOT_RUN,
        issueAndPublishEnabled: !!(gate && gate.issueAndPublishEnabled),
        journal: '008_Payment_Journal in Google is canonical; this ledger holds no payments',
      });
    }

    /* ------------------------------------------------- settlement (Freeze · I) */
    if (op === 'settlement') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      if (!yes(body.create) && !yes(url.searchParams.get('create'))) {
        const rec = await this.settlementOf(holderId);
        return json({ ok: true, created: false, settlement: rec || null,
          state: rec ? rec.Settlement_State : SETTLEMENT_STATE.NOT_CREATED });
      }
      /* allocation is never a side effect of a read: a Settlement_ID is minted
         only when the caller asks for one, inside one turn of this actor */
      return await this.state.blockConcurrencyWhile(async () => {
        const existing = await this.settlementOf(holderId);
        if (existing) return json({ ok: true, created: false, settlement: existing, state: existing.Settlement_State });

        const sequence = (Number(await this.storage.get(SEQ)) || 0) + 1;
        const settlementId = settlementIdOf(holderId, sequence);
        if (!settlementId) return json({ ok: false, error: 'settlementIdOf refused this Holder_ID', review: MANUAL_REVIEW_REQUIRED }, 400);
        const taken = await this.storage.get(SID + settlementId);
        if (taken) {
          return json({ ok: false, review: MANUAL_REVIEW_REQUIRED,
            error: 'Settlement_ID ' + settlementId + ' already belongs to ' + taken + '; the counter is out of step and no id is minted' }, 409);
        }

        const rec = {
          Holder_ID: holderId,
          Settlement_ID: settlementId,
          Settlement_State: SETTLEMENT_STATE.OPEN,
          sequence,
          currentRevision: null,
          latestRevision: 0,
          issuedRevision: null,
          issuedTotalPayableCents: null,
          Due_Date: null,
          draftTotalPayableCents: null,
          draftReview: null,
          draftStoredAt: null,
          driftCount: 0,
          blockingDriftCount: 0,
          roomUnitIds: [],
          createdAt: at, createdBy: by || null, updatedAt: at,
        };
        /* the counter moves first: a gap in the sequence is harmless, a reused
           Settlement_ID is not */
        await this.storage.put(SEQ, sequence);
        await this.storage.put(SID + settlementId, holderId);
        await this.storage.put(SETTLEMENT + holderId, rec);
        return json({ ok: true, created: true, settlement: rec, state: rec.Settlement_State });
      });
    }

    /* --------------------------------------------------------------- draft */
    if (op === 'draft') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      const bad = BillingLedger.checkResult(body.result);
      if (bad) return json({ ok: false, error: bad }, 409);

      return await this.state.blockConcurrencyWhile(async () => {
        const s = await this.settlementOf(holderId);
        if (!s) return json({ ok: false, error: 'no Settlement for ' + holderId + '; allocate one first' }, 404);

        let revision = null;
        if (body.revision != null && clean(body.revision) !== '') {
          revision = Number(body.revision);
          if (!Number.isInteger(revision) || revision < 1) return json({ ok: false, error: 'revision must be a positive integer' }, 400);
          const rev = await this.revisionOf(s.Settlement_ID, revision);
          if (!rev) return json({ ok: false, error: 'revision ' + revision + ' of ' + s.Settlement_ID + ' does not exist' }, 404);
          if (FROZEN_STATES.includes(rev.Revision_State) || rev.snapshot) {
            return json({ ok: false, immutable: true,
              error: 'revision ' + revision + ' of ' + s.Settlement_ID + ' is ' + rev.Revision_State
                + '; its figures are a record and are never replaced. Open a new revision instead.' }, 409);
          }
          if (rev.Revision_State === REVISION_STATE.VOID) {
            return json({ ok: false, error: 'revision ' + revision + ' is VOID and takes no further draft' }, 409);
          }
          rev.draft = body.result;
          rev.draftStoredAt = at;
          rev.Total_Payable_Cents = body.result.totalPayableCents == null ? null : body.result.totalPayableCents;
          rev.updatedAt = at;
          await this.storage.put(this.revisionKey(s.Settlement_ID, revision), rev);
        }

        const draft = BillingLedger.draftRecord({
          holderId, settlementId: s.Settlement_ID, revision, result: body.result,
          asOf: body.asOf, sourceHash: body.sourceHash, calculatedAt: body.calculatedAt, by, at,
        });
        await this.storage.put(DRAFT + holderId, draft);

        s.roomUnitIds = await this.indexRoomUnits(holderId, s.Settlement_ID, body.result.lines, s.roomUnitIds, at);
        s.draftTotalPayableCents = draft.totalPayableCents;
        s.draftReview = draft.review;
        s.draftStoredAt = at;
        s.updatedAt = at;
        await this.storage.put(SETTLEMENT + holderId, s);

        return json({ ok: true, draft, settlement: s, revision });
      });
    }

    /* ----------------------------------------------- revision-create (Freeze · I) */
    if (op === 'revision-create') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      if (body.result != null) {
        const bad = BillingLedger.checkResult(body.result);
        if (bad) return json({ ok: false, error: bad }, 409);
      }
      return await this.state.blockConcurrencyWhile(async () => {
        const s = await this.settlementOf(holderId);
        if (!s) return json({ ok: false, error: 'no Settlement for ' + holderId + '; allocate one first' }, 404);
        if (s.Settlement_State === SETTLEMENT_STATE.CLOSED) {
          return json({ ok: false, error: 'Settlement ' + s.Settlement_ID + ' is CLOSED; reopening it is a decision, not a write' }, 409);
        }
        /* THE CONSOLE'S ISSUE NAMES THE SETTLEMENT IT PREVIEWED (Owner, 7 Oct 2026 · review): two issues of one preview —
           two tabs, two admins, a retried request — find the second revision already there and are refused here, inside
           this turn, before anything is created */
        if (body.expectedLatestRevision != null && Number(s.latestRevision || 0) !== Number(body.expectedLatestRevision)) {
          return json({ ok: false, stale: true, error: 'Settlement ' + s.Settlement_ID + ' has moved on since the preview (revision ' +
            (Number(s.latestRevision) || 0) + ' exists); preview it again' }, 409);
        }
        const n = (Number(s.latestRevision) || 0) + 1;
        const rec = {
          Settlement_ID: s.Settlement_ID, Revision: n, Holder_ID: holderId,
          Revision_State: REVISION_STATE.DRAFT,
          draft: body.result || null,
          snapshot: null,
          Total_Payable_Cents: body.result && body.result.totalPayableCents != null ? body.result.totalPayableCents : null,
          Issue_Date: null, Due_Date: null,
          snapshotGaps: [],
          createdAt: at, createdBy: by || null, updatedAt: at,
          history: [{ state: REVISION_STATE.DRAFT, action: 'CREATE', by: by || null, at }],
        };
        await this.storage.put(this.revisionKey(s.Settlement_ID, n), rec);
        s.latestRevision = n;
        s.currentRevision = n;
        if (s.Settlement_State === SETTLEMENT_STATE.NOT_CREATED) s.Settlement_State = SETTLEMENT_STATE.OPEN;
        s.updatedAt = at;
        await this.storage.put(SETTLEMENT + holderId, s);
        return json({ ok: true, revision: rec, settlement: s });
      });
    }

    /* ------------------------------------------------ revision-state (Freeze · I) */
    if (op === 'revision-state') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      const n = Number(body.revision);
      const action = clean(body.action).toUpperCase();
      if (!Number.isInteger(n) || n < 1) return json({ ok: false, error: 'revision must be a positive integer' }, 400);
      if (!action) return json({ ok: false, error: 'action required' }, 400);
      /* ISSUE is not a state change. It writes the snapshot, so it has its own
         operation and the ISSUED state can never exist without that record. */
      if (action === 'ISSUE') {
        return json({ ok: false, error: 'ISSUE runs through revision-issue, which writes the immutable snapshot in the same step' }, 409);
      }

      return await this.state.blockConcurrencyWhile(async () => {
        const s = await this.settlementOf(holderId);
        if (!s) return json({ ok: false, error: 'no Settlement for ' + holderId }, 404);
        const rec = await this.revisionOf(s.Settlement_ID, n);
        if (!rec) return json({ ok: false, error: 'revision ' + n + ' of ' + s.Settlement_ID + ' does not exist' }, 404);

        const next = nextRevisionState(rec.Revision_State, action);
        if (!next) {
          return json({ ok: false, immutable: FROZEN_STATES.includes(rec.Revision_State),
            error: 'revision ' + n + ' is ' + rec.Revision_State + ' and the Freeze allows no ' + action + ' from there' }, 409);
        }

        /* an issued revision keeps every figure and its snapshot: SUPERSEDE only
           adds the fact that a later revision replaced it */
        if (rec.Revision_State === REVISION_STATE.ISSUED) {
          rec.supersededAt = at;
          rec.supersededBy = body.supersededBy == null ? null : Number(body.supersededBy) || null;
          if (s.issuedRevision === n && rec.supersededBy !== n) s.issuedRevision = rec.supersededBy || null;
        }
        rec.Revision_State = next;
        rec.updatedAt = at;
        rec.history = [...(rec.history || []), { state: next, action, by: by || null, at, note: clean(body.note) || null }];
        await this.storage.put(this.revisionKey(s.Settlement_ID, n), rec);
        s.updatedAt = at;
        await this.storage.put(SETTLEMENT + holderId, s);
        return json({ ok: true, revision: rec, settlement: s });
      });
    }

    /* ------------------------------------------ revision-issue (Freeze · R, AB) */
    if (op === 'revision-issue') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      const n = Number(body.revision);
      if (!Number.isInteger(n) || n < 1) return json({ ok: false, error: 'revision must be a positive integer' }, 400);

      return await this.state.blockConcurrencyWhile(async () => {
        const s = await this.settlementOf(holderId);
        if (!s) return json({ ok: false, error: 'no Settlement for ' + holderId }, 404);
        const rec = await this.revisionOf(s.Settlement_ID, n);
        if (!rec) return json({ ok: false, error: 'revision ' + n + ' of ' + s.Settlement_ID + ' does not exist' }, 404);

        /* the refusal that matters most in this file */
        if (rec.snapshot || FROZEN_STATES.includes(rec.Revision_State)) {
          return json({ ok: false, immutable: true,
            error: 'revision ' + n + ' of ' + s.Settlement_ID + ' is ' + rec.Revision_State
              + (rec.issuedAt ? ' since ' + rec.issuedAt : '')
              + '; an issued revision and its snapshot are immutable and are never overwritten' }, 409);
        }
        if (nextRevisionState(rec.Revision_State, 'ISSUE') !== REVISION_STATE.ISSUED) {
          return json({ ok: false, error: 'revision ' + n + ' is ' + rec.Revision_State + '; only READY_FOR_REVIEW can be issued' }, 409);
        }

        const draft = rec.draft || ((await this.draftOf(holderId)) || {}).result || null;
        const bad = BillingLedger.checkResult(draft);
        if (bad) return json({ ok: false, review: MANUAL_REVIEW_REQUIRED, error: 'nothing issuable is stored for this revision: ' + bad }, 409);

        const gate = await this.storage.get(GATE);
        const storedApproved = !!gate && typeof gate === 'object' && gate.approved === true && gate.issueAndPublishEnabled === true;
        const drift = await this.driftOf(holderId);
        /* the very FX pair checked here is the pair frozen into the snapshot below:
           a missing or unusable rate refuses the issue instead of becoming a gap */
        const issueFx = freezeFx(body.fx);
        /* the source gaps the caller found in Google (ambiguous Site_Product_Key,
           missing Number of Nights); not supplied is not "none" */
        const sourceGaps = Array.isArray(body.sourceGaps) ? body.sourceGaps : ['the source gap check was not supplied'];
        /* THIS HOLDER'S DRIFT AS IT STANDS NOW (Codex final review, 5 Oct 2026):
           the stored state may be older than the source; the caller detects drift
           on the current source (010 evidence included) and it counts beside the
           stored entries. Not supplied is not "none". */
        const currentDrifts = Array.isArray(body.currentDrifts)
          ? body.currentDrifts.filter((d) => d && typeof d === 'object').map((d) => ({ code: clean(d.code), resolved: false, detail: clean(d.detail).slice(0, 300) }))
          : null;
        if (!currentDrifts) {
          return json({ ok: false, reasons: ['CURRENT_DRIFT_NOT_SUPPLIED'], error: 'the issue must carry the drift detected on the current source' }, 400);
        }
        /* the stored entries that compare the source with an OLDER issued
           snapshot are what a revision built from the current source resolves;
           they cannot block it. Every other stored entry still counts. */
        const drifts = [...(drift.drifts || []).filter((d) => !SNAPSHOT_COMPARISON.includes(clean(d && d.code))), ...currentDrifts];
        /* THE GATE IS JUDGED AGAIN, NOW (Codex final review, 5 Oct 2026). The
           stored approval is the human act of condition 5 and it stays required;
           every other condition is re-evaluated on the inputs of THIS issue —
           reference cases on today's source, the 009 approvals, the item
           metadata, this FX pair, the mapping and the nights — so an approval
           given on yesterday's source can never issue on today's. Condition 2 is
           judged for this Holder here; the operation-wide view belongs to the
           approval itself. */
        const check = body.gateCheck && typeof body.gateCheck === 'object' ? body.gateCheck : null;
        const now = storedApproved && check ? evaluateGate({
          caseResults: check.caseResults, drifts,
          specialRates: body.specialRates, items: body.items,
          approval: gate.approval, fx: issueFx,
          siteKeyDuplicates: check.siteKeyDuplicates, nightsGaps: check.nightsGaps,
        }) : null;
        const gateApproved = storedApproved && !!now && now.approved === true;
        const verdict = canIssue({ result: draft, drifts, activationGateApproved: gateApproved, fx: issueFx, sourceGaps });
        if (!verdict.allowed) {
          const reasons = [...verdict.reasons];
          if (storedApproved && !check) reasons.push('GATE_RECHECK_NOT_SUPPLIED');
          if (now && !now.approved) reasons.push(...now.open.map((o) => 'GATE_NOW: ' + o));
          return json({ ok: false, error: 'Issue & Publish refused', reasons,
            issueAndPublishEnabled: gateApproved }, 403);
        }

        /* the structured rate reference is what makes an issued revision
           recomputable years later (Freeze · R); without it nothing is issued */
        const items = body.items && typeof body.items === 'object' ? body.items : null;
        if (!items || !Object.keys(items).length) {
          return json({ ok: false, review: MANUAL_REVIEW_REQUIRED,
            error: 'the snapshot needs the structured item metadata for its Standard_Rate reference; none was supplied' }, 409);
        }
        if (!Array.isArray(body.specialRates)) {
          return json({ ok: false, review: MANUAL_REVIEW_REQUIRED,
            error: 'the snapshot needs the 009 special rates for its Special_Rate_Reference; none were supplied' }, 409);
        }
        if (clean(body.issueDate) && !/^\d{4}-\d{2}-\d{2}$/.test(clean(body.issueDate))) {
          return json({ ok: false, error: 'issueDate must be YYYY-MM-DD' }, 400);
        }
        if (clean(body.dueDateOverride) && !/^\d{4}-\d{2}-\d{2}$/.test(clean(body.dueDateOverride))) {
          return json({ ok: false, error: 'dueDateOverride must be YYYY-MM-DD' }, 400);
        }

        const issueDate = clean(body.issueDate) || at.slice(0, 10);
        /* ONE FX RESOLUTION ONLY (Owner, 5 Oct 2026). The caller resolves the
         * rate strictly from 011_Billing_Config and hands the frozen pair in;
         * the ledger never picks a rate itself, and the raw-rows branch that
         * used to let it do so is gone. A missing pair is recorded as a gap,
         * never filled. */
        const fx = issueFx;
        /* THE PAYMENT METHOD (Owner, 5 Oct 2026). A method this ledger already
           holds for the Holder wins over anything offered; otherwise the
           caller's nationality default is taken and stored with the issue. No
           method, no issue: the default is never guessed here. */
        const prefRec = await this.storage.get(PAYPREF + holderId);
        const offered = clean(body.paymentPreference);
        const channel = prefRec && isChannel(prefRec.Payment_Preference) ? clean(prefRec.Payment_Preference)
          : (isChannel(offered) ? offered : null);
        if (!channel) {
          return json({ ok: false, review: MANUAL_REVIEW_REQUIRED, reasons: ['PAYMENT_PREFERENCE_UNDETERMINED'],
            error: 'no payment method can be determined for ' + holderId + '; a BILLING_ADMIN must state it' }, 409);
        }
        /* THE METHOD THE CALLER VALIDATED IS THE METHOD FROZEN. The route checked
           this exact method's destination (a SEPA account must be configured,
           the ledger never sees it); a method changed in between is refused
           here, inside the same turn that would freeze it — never issued with
           a destination nobody checked. */
        const expected = clean(body.expectedPaymentPreference);
        if (!isChannel(expected)) {
          return json({ ok: false, reasons: ['PAYMENT_PREFERENCE_UNVALIDATED'],
            error: 'the issue must name the payment method whose destination was validated' }, 400);
        }
        if (channel !== expected) {
          return json({ ok: false, reasons: ['PAYMENT_PREFERENCE_CHANGED'],
            error: 'the payment method changed to ' + channel + ' after ' + expected + ' was validated; issue again' }, 409);
        }
        const snapshot = buildSnapshot({
          settlementId: s.Settlement_ID, revision: n, holderId,
          result: draft, items, specialRates: body.specialRates,
          fx, issueDate, dueDateOverride: body.dueDateOverride,
          evidenceStatus: body.evidenceStatus, sourceHash: body.sourceHash,
          calculatedAt: body.calculatedAt, paymentPreference: channel,
        });

        /* what the snapshot could not be given is named, never filled in — and
           an incomplete snapshot is not issued: nothing is written */
        const gaps = [];
        if (!snapshot.Source_Hash) gaps.push('Source_Hash');
        if (snapshot.FX_USD_THB == null) gaps.push('FX_USD_THB');
        if (snapshot.FX_USD_EUR == null) gaps.push('FX_USD_EUR');
        if (!snapshot.Due_Date) gaps.push('Due_Date');
        if (!snapshot.Payment_Preference || !snapshot.Payment_Currency || !snapshot.Payment_Recipient) gaps.push('Payment_Preference');
        if (gaps.length) {
          return json({ ok: false, review: MANUAL_REVIEW_REQUIRED, snapshotGaps: gaps,
            error: 'the snapshot would be incomplete (' + gaps.join(', ') + '); nothing was issued' }, 409);
        }

        if (!prefRec) {
          await this.storage.put(PAYPREF + holderId, {
            Holder_ID: holderId, Payment_Preference: channel,
            source: clean(body.paymentPreferenceSource) || PREFERENCE_SOURCE.DEFAULT_ROUTING,
            setAt: at, setBy: by || null, note: 'stored with the issue of revision ' + n,
            lockedAt: null, lockedBy: null,
            history: [{ action: 'ISSUE_DEFAULT', Payment_Preference: channel, by: by || null, at, revision: n }],
          });
        }
        rec.snapshot = snapshot;
        rec.Revision_State = REVISION_STATE.ISSUED;
        rec.Issue_Date = snapshot.Issue_Date;
        rec.issueDateSource = clean(body.issueDate) ? 'request' : 'ledger clock';
        rec.Due_Date = snapshot.Due_Date;
        rec.Total_Payable_Cents = snapshot.Total_Payable_Cents;
        rec.Engine_Version = snapshot.Engine_Version;
        rec.snapshotGaps = gaps;
        rec.issuedAt = at;
        rec.issuedBy = by || null;
        rec.updatedAt = at;
        rec.history = [...(rec.history || []), { state: REVISION_STATE.ISSUED, action: 'ISSUE', by: by || null, at }];
        await this.storage.put(this.revisionKey(s.Settlement_ID, n), rec);

        /* exactly one valid issued revision: the previous one becomes a
           SUPERSEDED record and keeps every figure it was issued with */
        let superseded = null;
        const prevN = Number(s.issuedRevision) || null;
        if (prevN && prevN !== n) {
          const prev = await this.revisionOf(s.Settlement_ID, prevN);
          if (prev && prev.Revision_State === REVISION_STATE.ISSUED) {
            prev.Revision_State = nextRevisionState(REVISION_STATE.ISSUED, 'SUPERSEDE');
            prev.supersededAt = at;
            prev.supersededBy = n;
            prev.updatedAt = at;
            prev.history = [...(prev.history || []), { state: prev.Revision_State, action: 'SUPERSEDE', by: by || null, at }];
            await this.storage.put(this.revisionKey(s.Settlement_ID, prevN), prev);
            superseded = prevN;
          }
        }

        /* the comparisons against the superseded snapshot are resolved by this
           issue, by name; the next reconciliation compares with revision n */
        if ((drift.drifts || []).some((d) => !d.resolved && SNAPSHOT_COMPARISON.includes(clean(d.code)))) {
          const resolvedDrifts = drift.drifts.map((d) => (!d.resolved && SNAPSHOT_COMPARISON.includes(clean(d.code))
            ? { ...d, resolved: true, resolvedBy: 'issue of revision ' + n, resolvedAt: at } : d));
          await this.storage.put(DRIFT + holderId, { ...drift, drifts: resolvedDrifts,
            blocking: resolvedDrifts.filter((d) => !d.resolved && DRIFT_BLOCKING.includes(d.code)).map((d) => d.code),
            updatedAt: at, updatedBy: by || null });
        }

        s.issuedRevision = n;
        s.currentRevision = n;
        s.Settlement_State = SETTLEMENT_STATE.ISSUED;
        s.issuedTotalPayableCents = snapshot.Total_Payable_Cents;
        s.Due_Date = snapshot.Due_Date;
        /* what the admin overview lists without opening the revision (Owner, 7 Oct 2026) */
        s.Issue_Date = snapshot.Issue_Date;
        s.Payment_Preference = snapshot.Payment_Preference;
        s.Payment_Currency = snapshot.Payment_Currency;
        s.updatedAt = at;
        await this.storage.put(SETTLEMENT + holderId, s);

        return json({ ok: true, revision: BillingLedger.revisionSummary(rec), snapshot, superseded, snapshotGaps: gaps, settlement: s });
      });
    }

    /* ------------------------------------------- override-set (Freeze · B) */
    if (op === 'override-set') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      if (!by) return json({ ok: false, error: 'by required: an override is attributed to the person who made it' }, 400);
      const target = clean(body.billToHolderId);
      const clearing = yes(body.clear) || !target;
      if (!clearing && target === holderId) {
        return json({ ok: false, error: 'billToHolderId equals holderId, which is the default and not an override' }, 400);
      }

      return await this.state.blockConcurrencyWhile(async () => {
        if (!clearing) {
          /* no chains. Resolving one would mean deciding how far to follow it,
             and that is a judgement neither this ledger nor the engine makes. */
          const onward = await this.storage.get(OVERRIDE + target);
          if (onward && onward.Bill_To_Holder_ID) {
            return json({ ok: false, review: MANUAL_REVIEW_REQUIRED,
              error: target + ' is itself billed to ' + onward.Bill_To_Holder_ID + '; a chain is refused, not resolved' }, 409);
          }
        }
        const prev = await this.storage.get(OVERRIDE + holderId);
        const rec = {
          Holder_ID: holderId,
          Bill_To_Holder_ID: clearing ? null : target,
          setBy: by, setAt: at, note: clean(body.note) || null,
          history: [...((prev && prev.history) || []),
            { Bill_To_Holder_ID: clearing ? null : target, by, at, note: clean(body.note) || null }],
        };
        await this.storage.put(OVERRIDE + holderId, rec);
        const s = await this.settlementOf(holderId);
        /* an issued revision already recorded its own Bill_To_Holder_IDs and is
           untouched by this: the change surfaces through drift, as it should */
        return json({ ok: true, override: rec,
          issuedRevision: s ? s.issuedRevision || null : null,
          note: s && s.issuedRevision ? 'the issued revision keeps the Bill_To_Holder_IDs it was issued with; recompute the draft to raise the drift' : null });
      });
    }

    /* --------------------------------------- the Activation Gate (Freeze · AB) */
    if (op === 'gate-read') {
      const gate = await this.storage.get(GATE);
      return json({ ok: true, gate: gate || GATE_NOT_RUN, issueAndPublishEnabled: !!(gate && gate.issueAndPublishEnabled) });
    }

    if (op === 'gate-approve') {
      /* the verdict is never an input */
      if (body.approved !== undefined || body.issueAndPublishEnabled !== undefined || body.conditions !== undefined) {
        return json({ ok: false, error: 'approved, issueAndPublishEnabled and conditions are not inputs; the five conditions are judged here' }, 400);
      }
      const approvedBy = clean(body.approvedBy);
      if (!approvedBy) return json({ ok: false, error: 'approvedBy required: condition 5 is a human act by Haruthai or Suthep' }, 400);
      if (NEVER_THE_APPROVER.includes(approvedBy.toLowerCase())) {
        return json({ ok: false, error: 'the gate cannot be approved by ' + approvedBy + '; only Haruthai or Suthep approve it' }, 403);
      }
      const approvedAt = clean(body.approvedAt) || at;

      return await this.state.blockConcurrencyWhile(async () => {
        const previous = await this.storage.get(GATE);
        /* condition 2 asks about the whole operation, so the stored drift is the
           default answer: the gate reads the ledger's own truth */
        const drifts = Array.isArray(body.drifts) ? body.drifts : await this.allDrifts();
        /* FX (Owner, 5 Oct 2026): the worker resolves the pair from
           011_Billing_Config for the approval's UTC day and hands it in; it is
           re-validated here and judged as given. Absent or unusable FX stays a
           gap, so conditions 6 and 7 close the gate — nothing is defaulted. */
        const fx = freezeFx(body.fx);
        const verdict = evaluateGate({
          caseResults: body.caseResults, drifts,
          specialRates: body.specialRates, items: body.items,
          approval: { approvedBy, approvedAt },
          fx,
          siteKeyDuplicates: body.siteKeyDuplicates,
          nightsGaps: body.nightsGaps,
        });
        const rec = {
          approved: verdict.approved,
          issueAndPublishEnabled: verdict.issueAndPublishEnabled,
          conditions: verdict.conditions,
          open: verdict.open,
          approval: { approvedBy, approvedAt, note: clean(body.note) || null },
          /* the reference-case results condition 1 was judged on, as run */
          caseResults: Array.isArray(body.caseResults) ? body.caseResults.map((r) => ({
            id: r && r.id, matches: !!(r && r.matches === true),
            expectPerPersonUSD: r ? r.expectPerPersonUSD ?? null : null, actualPerPersonUSD: r ? r.actualPerPersonUSD ?? null : null,
            expectCombinedUSD: r ? r.expectCombinedUSD ?? null : null, actualCombinedUSD: r ? r.actualCombinedUSD ?? null : null,
            manualReview: r && Array.isArray(r.manualReview) ? r.manualReview : [],
          })) : [],
          /* the exact FX the verdict was judged on — audit evidence only; an
             issued revision freezes its own pair at issue time */
          fx: { FX_USD_THB: fx.FX_USD_THB, FX_USD_EUR: fx.FX_USD_EUR, gaps: fx.gaps,
            asOf: clean(body.fxAsOf) || null,
            provenance: body.fxProvenance && typeof body.fxProvenance === 'object' ? body.fxProvenance : null },
          casesEvaluated: (Array.isArray(body.caseResults) ? body.caseResults : []).length,
          driftsConsidered: drifts.length,
          engineVersion: ENGINE_VERSION,
          recordedAt: at,
          history: [...((previous && previous.history) || []),
            { approved: verdict.approved, approvedBy, approvedAt, recordedAt: at, open: verdict.open }].slice(-20),
        };
        await this.storage.put(GATE, rec);
        /* the attempt is recorded either way: a write that succeeded while the
           gate stays closed is not a failed write, it is the honest record of
           which of the five conditions are still open */
        return json({ ok: true, gate: rec, approved: rec.approved, open: rec.open,
          issueAndPublishEnabled: rec.issueAndPublishEnabled });
      });
    }

    /* ------------------------------------------------ drift (Freeze · I, X) */
    if (op === 'drift-set') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      if (!Array.isArray(body.drifts)) return json({ ok: false, error: 'drifts must be an array' }, 400);

      return await this.state.blockConcurrencyWhile(async () => {
        const drifts = body.drifts.map((d) => ({
          code: clean(d && (d.code || d)),
          detail: clean(d && d.detail) || null,
          resolved: !!(d && d.resolved),
          resolvedBy: clean(d && d.resolvedBy) || null,
          at: clean(d && d.at) || at,
        }));
        const blocking = drifts.filter((d) => !d.resolved && DRIFT_BLOCKING.includes(d.code)).map((d) => d.code);
        /* a code the Freeze does not list is NOT quietly treated as harmless:
           it is named and sent to review, and it decides nothing by itself */
        const unknown = drifts
          .map((d) => d.code)
          .filter((c) => c && !DRIFT_BLOCKING.includes(c) && !DRIFT_REPORT_ONLY.includes(c) && !MONITORING.includes(c));
        const rec = {
          Holder_ID: holderId, drifts, blocking, unknown,
          review: unknown.length ? MANUAL_REVIEW_REQUIRED : null,
          updatedAt: at, updatedBy: by || null,
        };
        await this.storage.put(DRIFT + holderId, rec);

        const s = await this.settlementOf(holderId);
        if (s) {
          s.Settlement_State = settlementStateAfterDrift(s.Settlement_State, blocking.length > 0);
          s.driftCount = drifts.length;
          s.blockingDriftCount = blocking.length;
          s.updatedAt = at;
          await this.storage.put(SETTLEMENT + holderId, s);
        }
        return json({ ok: true, drift: rec, settlement: s || null, state: s ? s.Settlement_State : SETTLEMENT_STATE.NOT_CREATED });
      });
    }

    if (op === 'drift-read') {
      if (holderId) return json({ ok: true, drift: await this.driftOf(holderId) });
      const rows = await this.listOf(DRIFT);
      const all = rows.map(([h, rec]) => rec || { Holder_ID: h, drifts: [] });
      return json({ ok: true, drifts: all,
        blocking: all.reduce((keys, r) => keys.concat(r.blocking || []), []) });
    }

    /* ------------------------------ payment-preference (Freeze · L, Owner 5 Oct) */
    if (op === 'payment-preference') {
      if (!holderId) return json({ ok: false, error: 'holderId required' }, 400);
      const action = clean(body.action).toLowerCase() || 'read';
      if (action === 'read') return json({ ok: true, preference: (await this.storage.get(PAYPREF + holderId)) || null });

      return await this.state.blockConcurrencyWhile(async () => {
        const prev = (await this.storage.get(PAYPREF + holderId)) || null;

        /* the first VERIFIED payment locks the method for good */
        if (action === 'lock') {
          const ref = clean(body.verifiedPaymentId);
          if (!ref) return json({ ok: false, error: 'a lock names the VERIFIED Payment_ID that causes it' }, 400);
          if (prev && prev.lockedAt) return json({ ok: true, preference: prev, alreadyLocked: true });
          const offered = clean(body.channel);
          const rec = prev ? { ...prev } : { Holder_ID: holderId, Payment_Preference: null, source: null, setAt: null, setBy: null, history: [] };
          if (!isChannel(rec.Payment_Preference) && isChannel(offered)) {
            rec.Payment_Preference = offered;
            rec.source = clean(body.source) || PREFERENCE_SOURCE.DEFAULT_ROUTING;
            rec.setAt = at; rec.setBy = by || null;
          }
          rec.lockedAt = at;
          rec.lockedBy = ref;
          rec.history = [...(rec.history || []), { action: 'LOCK', Payment_Preference: rec.Payment_Preference, by: by || null, at, verifiedPaymentId: ref }];
          await this.storage.put(PAYPREF + holderId, rec);
          return json({ ok: true, preference: rec, locked: true });
        }

        if (action === 'set') {
          if (prev && prev.lockedAt) {
            return json({ ok: false, locked: true, preference: prev,
              error: 'the payment method is locked since the first VERIFIED payment (' + prev.lockedBy + ')' }, 409);
          }
          const channel = clean(body.channel);
          if (!isChannel(channel)) return json({ ok: false, error: 'unknown payment method' }, 400);
          const source = clean(body.source);
          if (source !== PREFERENCE_SOURCE.HOLDER && source !== PREFERENCE_SOURCE.BILLING_ADMIN) {
            return json({ ok: false, error: 'a payment method is set by the Holder or a BILLING_ADMIN' }, 400);
          }
          if (!by) return json({ ok: false, error: 'by required: a change is attributed to whoever made it' }, 400);
          const rec = {
            Holder_ID: holderId, Payment_Preference: channel, source,
            setAt: at, setBy: by, note: clean(body.note) || null,
            lockedAt: null, lockedBy: null,
            history: [...((prev && prev.history) || []), { action: 'SET', Payment_Preference: channel, source, by, at, note: clean(body.note) || null }],
          };
          await this.storage.put(PAYPREF + holderId, rec);
          return json({ ok: true, preference: rec });
        }

        return json({ ok: false, error: 'unknown payment-preference action ' + action }, 400);
      });
    }

    /* ------------------------------------------------ payment-decision (Freeze · K)
       THE ONE DECISION ON A REPORTED PAYMENT, serialised here (Codex final review,
       5 Oct 2026). Google 008 cannot serialise two administrators: both would read
       REPORTED and both would write. So a decision is CLAIMED in this actor first
       — the first claim wins, a second is refused — and a VERIFIED PAYMENT takes
       the Holder's method lock in the same turn, BEFORE Google is written, so no
       preference change can slip in between. `complete` closes the claim once
       Google holds the decision; `release` gives it back when Google refused or
       failed, and undoes the lock this claim took unless told the row is in fact
       VERIFIED already. */
    if (op === 'payment-decision') {
      /* READ MANY (admin console): where the decisions on several payments stand, in one call — never a token */
      if (clean(body.action).toLowerCase() === 'read' && Array.isArray(body.paymentIds)) {
        const decisions = {};
        for (const id of body.paymentIds.map(clean).filter(Boolean).slice(0, 500)) {
          const d = (await this.storage.get(PAYDEC + id)) || null;
          decisions[id] = d ? { state: d.state || null, decision: d.decision || null, by: d.by || null, claimedAt: d.claimedAt || null,
            completedAt: d.completedAt || null, writeNotAfter: d.writeNotAfter || null,
            resumable: d.state === 'PENDING' && !!d.claimedAt && Date.parse(at) - Date.parse(d.claimedAt) >= CLAIM_STALE_MS } : null;
        }
        return json({ ok: true, decisions });
      }
      const paymentId = clean(body.paymentId);
      if (!paymentId) return json({ ok: false, error: 'paymentId required' }, 400);
      const action = clean(body.action).toLowerCase();

      /* THE LOCK KNOWS EVERY VERIFIED CLAIM THAT STANDS ON IT (Codex round 2): a
         lock taken for a pending verification is undone only when no other
         verification of the same Holder is pending or done — one failed write can
         never lift the lock another VERIFIED payment needs — and any completed
         VERIFIED decision makes it final. */
      const lockRec = async (holder) => {
        const p = (await this.storage.get(PAYPREF + holder)) || null;
        const rec = p ? { ...p } : { Holder_ID: holder, Payment_Preference: null, source: null, setAt: null, setBy: null, history: [] };
        rec.lockClaims = { ...(rec.lockClaims || {}) };
        return rec;
      };
      /* a payment KNOWN to be VERIFIED makes the lock permanent: its DONE mark
         stays in lockClaims for good, so no later release can ever lift it */
      const finalise = (rec, id) => {
        rec.lockClaims[id] = 'DONE';
        if (!rec.lockedAt) { rec.lockedAt = at; rec.lockedBy = id; }
        rec.lockPending = false;
      };
      /* a claim that did NOT verify gives its part back; the lock is lifted only
         when it is still pending and nothing — pending or done — stands on it */
      const giveBack = (rec, id) => {
        delete rec.lockClaims[id];
        const others = Object.keys(rec.lockClaims);
        if (rec.lockPending && !others.length) {
          rec.history = [...(rec.history || []), { action: 'UNLOCK', reason: 'the verification of ' + id + ' was not recorded in Google', by, at }];
          rec.lockedAt = null; rec.lockedBy = null; rec.lockPending = false;
          return true;
        }
        if (rec.lockedBy === id && others.length) rec.lockedBy = others[0];
        return false;
      };
      const tokenOk = (claim) => !!claim && !!clean(claim.token) && clean(body.token) === clean(claim.token);

      /* READ (Owner, 7 Oct 2026 · admin console): where a decision on this payment stands — never its token */
      if (action === 'read') {
        const d = (await this.storage.get(PAYDEC + paymentId)) || null;
        return json({ ok: true, decision: d ? { state: d.state || null, decision: d.decision || null, by: d.by || null,
          claimedAt: d.claimedAt || null, completedAt: d.completedAt || null, writeNotAfter: d.writeNotAfter || null,
          resumable: d.state === 'PENDING' && !!d.claimedAt && Date.parse(at) - Date.parse(d.claimedAt) >= CLAIM_STALE_MS } : null });
      }

      return await this.state.blockConcurrencyWhile(async () => {
        const prev = (await this.storage.get(PAYDEC + paymentId)) || null;
        const age = prev && prev.claimedAt ? Date.parse(at) - Date.parse(prev.claimedAt) : 0;

        if (action === 'claim') {
          const decision = clean(body.decision).toUpperCase();
          if (decision !== 'VERIFIED' && decision !== 'REJECTED') return json({ ok: false, error: 'decision must be VERIFIED or REJECTED' }, 400);
          if (!by) return json({ ok: false, error: 'by required: a decision is attributed to whoever made it' }, 400);
          if (prev && prev.state === 'DONE') {
            return json({ ok: false, decided: true, decision: prev.decision,
              error: 'payment ' + paymentId + ' is already ' + prev.decision + ' (' + prev.by + ', ' + prev.completedAt + '); a decision is made once' }, 409);
          }
          /* NEVER TAKEN OVER (Codex round 2): a request that read REPORTED may still
             be on its way to Google, so a second claim is refused however old the
             first one is. A claim that never came back is RESUMED by a
             BILLING_ADMIN (action resume): its own fixed payload, sent again. */
          if (prev && prev.state === 'PENDING') {
            return json({ ok: false, inProgress: true, stale: age >= CLAIM_STALE_MS, claimedAt: prev.claimedAt, decision: prev.decision,
              error: 'a decision on payment ' + paymentId + ' (' + prev.decision + ') is being recorded by ' + prev.by +
                (age >= CLAIM_STALE_MS ? ' and has not completed; a BILLING_ADMIN resumes it (payment/decision-resolve)' : '; try again in a moment') }, 409);
          }
          const holder = clean(body.holderId);
          let preference = null, locks = false;
          if (decision === 'VERIFIED' && yes(body.lockPreference) && holder) {
            const rec = await lockRec(holder);
            if (!rec.lockedAt) {
              const offered = clean(body.channel);
              if (!isChannel(rec.Payment_Preference) && isChannel(offered)) {
                rec.Payment_Preference = offered;
                rec.source = clean(body.source) || PREFERENCE_SOURCE.DEFAULT_ROUTING;
                rec.setAt = at; rec.setBy = by;
              }
              rec.lockedAt = at; rec.lockedBy = paymentId; rec.lockPending = true;
              rec.history = [...(rec.history || []), { action: 'LOCK', Payment_Preference: rec.Payment_Preference, by, at, verifiedPaymentId: paymentId, pending: true }];
            }
            rec.lockClaims[paymentId] = 'PENDING';
            await this.storage.put(PAYPREF + holder, rec);
            preference = rec; locks = true;
          }
          const rejectReason = clean(body.rejectReason).slice(0, 300);
          if (decision === 'REJECTED' && !rejectReason) return json({ ok: false, error: 'a rejection carries its Reject_Reason' }, 400);
          /* the WHOLE payload is fixed here, once: every write of this claim — the
             first or a resumed one — sends exactly these four values */
          const claim = { Payment_ID: paymentId, decision, holderId: holder || null, state: 'PENDING', by, claimedAt: at, locks,
            payload: { Record_Status: decision, Verified_By: by, Verified_At: at, Reject_Reason: decision === 'REJECTED' ? rejectReason : '' },
            token: crypto.randomUUID(), writeNotAfter: new Date(Date.parse(at) + CLAIM_STALE_MS - WRITE_MARGIN_MS).toISOString() };
          await this.storage.put(PAYDEC + paymentId, claim);
          return json({ ok: true, claim, preference });
        }

        /* THE LAST WORD BEFORE THE WRITE: is this still the writer's own claim, and
           how long may it still send? Refused once the claim moved on or its
           window closed — then nothing is written at all. */
        if (action === 'check') {
          if (!prev || prev.state !== 'PENDING' || !tokenOk(prev)) {
            return json({ ok: false, error: 'the claim on payment ' + paymentId + ' is no longer this writer\'s' }, 409);
          }
          const notAfter = Date.parse(prev.writeNotAfter);
          if (!Number.isFinite(notAfter) || Date.parse(at) >= notAfter) {
            return json({ ok: false, expired: true, error: 'the write window of the claim on ' + paymentId + ' has closed; nothing is written' }, 409);
          }
          return json({ ok: true, notAfter });
        }

        if (action === 'complete') {
          /* idempotent for the claim's own token: two resumptions of one claim both
             wrote the identical row, and both may close it */
          if (prev && prev.state === 'DONE' && tokenOk(prev)) return json({ ok: true, claim: prev, already: true });
          if (!prev || prev.state !== 'PENDING') return json({ ok: false, error: 'no open claim on payment ' + paymentId }, 409);
          if (!tokenOk(prev)) return json({ ok: false, error: 'the claim on payment ' + paymentId + ' is not this writer\'s' }, 409);
          const done = { ...prev, state: 'DONE', completedAt: at };
          await this.storage.put(PAYDEC + paymentId, done);
          if (prev.locks && prev.holderId && prev.decision === 'VERIFIED') {
            const rec = await lockRec(prev.holderId);
            finalise(rec, paymentId);
            await this.storage.put(PAYPREF + prev.holderId, rec);
          }
          return json({ ok: true, claim: done });
        }

        /* a definite NO from before the write (nothing reached Google). With
           `alreadyVerified` the row turned out VERIFIED in 008 already: the lock
           is then made permanent instead of given back. */
        if (action === 'release') {
          if (!prev || prev.state !== 'PENDING') return json({ ok: true, released: false });
          if (!tokenOk(prev)) return json({ ok: false, error: 'the claim on payment ' + paymentId + ' is not this writer\'s' }, 409);
          /* RELEASE AND RESUME NEVER MEET (Codex round 5). A release is only the
             first writer's own "nothing was sent", so it is accepted only while the
             claim is younger than its lease and was never resumed; resume is only
             possible after the lease. Once another writer may have been given the
             claim, it can no longer be given back — only completed. */
          if ((prev.resumes && prev.resumes.length) || age >= CLAIM_STALE_MS) {
            return json({ ok: false, resumed: !!(prev.resumes && prev.resumes.length),
              error: 'the claim on payment ' + paymentId + ' is past its lease and can only be completed (payment/decision-resolve)' }, 409);
          }
          await this.storage.delete(PAYDEC + paymentId);
          let unlocked = false;
          if (prev.locks && prev.holderId) {
            const rec = await lockRec(prev.holderId);
            if (yes(body.alreadyVerified)) finalise(rec, paymentId);
            else unlocked = giveBack(rec, paymentId);
            await this.storage.put(PAYPREF + prev.holderId, rec);
          }
          return json({ ok: true, released: true, unlocked });
        }

        /* A CLAIM THAT NEVER COMPLETED IS RESUMED, NEVER RELEASED (Codex round 4).
           Google cannot write conditionally, so a request the first writer sent may
           still commit at any later time. The claim therefore fixed its WHOLE
           payload when it was made — decision, Verified_By, Verified_At,
           Reject_Reason — and whoever resumes it writes exactly that payload again:
           a late commit of the first request is then byte-identical, never a second
           decision. Resuming hands the claim (and its token) back once its lease has
           run out; the route re-sends the same payload and completes it. */
        if (action === 'resume') {
          if (!prev || prev.state !== 'PENDING') return json({ ok: false, error: 'no open claim on payment ' + paymentId }, 409);
          if (age < CLAIM_STALE_MS) return json({ ok: false, inProgress: true, error: 'the claim on ' + paymentId + ' is still recent; wait for it' }, 409);
          if (!by) return json({ ok: false, error: 'by required' }, 400);
          const resumed = { ...prev, resumes: [...(prev.resumes || []), { by, at }].slice(-20) };
          await this.storage.put(PAYDEC + paymentId, resumed);
          return json({ ok: true, claim: resumed });
        }

        return json({ ok: false, error: 'unknown payment-decision action ' + action }, 400);
      });
    }

    /* ------------------------------ statement-mail (Owner, 7 Oct 2026 · admin console)
       THE ISSUED STATEMENT, SENT BY E-MAIL ONLY ON A BILLING_ADMIN'S EXPLICIT ACT, NEVER TWICE BY ACCIDENT.
       One record per issued revision (stmtmail:<SID>:<rev>) keeps every attempt. A send is CLAIMED first under a key
       the admin's confirmation carries: the same key never sends twice (a replay answers the recorded outcome); an
       open claim blocks every other send; a claim nobody completed counts as UNCERTAIN once MAIL_CLAIM_MS have passed;
       once anything may have reached the guest (SENT or UNCERTAIN) another send needs `again`, itself a new explicit
       confirmation. */
    if (op === 'statement-mail') {
      const sid = clean(body.settlementId), rev = Number(body.revision);
      if (!sid || !Number.isInteger(rev) || rev < 1) return json({ ok: false, error: 'settlementId and revision required' }, 400);
      const key = STMTMAIL + sid + ':' + rev;
      const action = clean(body.action) || 'read';
      const view = (r) => ({ attempts: (r && r.attempts) || [], open: r && r.claim ? { at: r.claim.at, by: r.claim.by, to: r.claim.to } : null });
      /* an unfinished claim older than MAIL_CLAIM_MS becomes an UNCERTAIN attempt: it may have been sent */
      const settle = (r, now) => {
        if (r && r.claim && Date.parse(now) - Date.parse(r.claim.at) >= MAIL_CLAIM_MS) {
          r.attempts = [...(r.attempts || []), { sendKey: r.claim.sendKey, to: r.claim.to, by: r.claim.by, claimedAt: r.claim.at,
            outcome: 'UNCERTAIN', reason: 'the send was never reported back', recordedAt: now }];
          r.claim = null;
          return true;
        }
        return false;
      };
      if (action === 'read') {
        const r = (await this.storage.get(key)) || null;
        if (r && settle(r, at)) await this.storage.put(key, r);
        return json({ ok: true, ...view(r) });
      }
      return await this.state.blockConcurrencyWhile(async () => {
        const r = (await this.storage.get(key)) || { Settlement_ID: sid, Revision: rev, attempts: [], claim: null };
        settle(r, at);
        const sendKey = clean(body.sendKey);
        if (action === 'claim') {
          if (!by) return json({ ok: false, error: 'by required' }, 400);
          if (!/^[A-Za-z0-9_-]{16,80}$/.test(sendKey)) return json({ ok: false, error: 'sendKey required' }, 400);
          const done = (r.attempts || []).find((x) => x.sendKey === sendKey);
          if (done) { await this.storage.put(key, r); return json({ ok: false, replay: true, attempt: done, ...view(r) }, 409); }
          if (r.claim) {
            await this.storage.put(key, r);
            return json({ ok: false, inProgress: r.claim.sendKey !== sendKey ? true : 'same', error: 'a send of this statement is in progress', ...view(r) }, 409);
          }
          const reached = (r.attempts || []).filter((x) => x.outcome === 'SENT' || x.outcome === 'UNCERTAIN');
          if (reached.length && !yes(body.again)) {
            await this.storage.put(key, r);
            return json({ ok: false, alreadySent: true, error: 'this statement may already have reached the guest; sending it again needs its own confirmation', ...view(r) }, 409);
          }
          const token = crypto.randomUUID();
          r.claim = { sendKey, token, at, by, to: clean(body.to).slice(0, 254), again: yes(body.again) };
          await this.storage.put(key, r);
          return json({ ok: true, token, ...view(r) });
        }
        if (action === 'complete') {
          if (!r.claim || r.claim.token !== clean(body.token)) {
            await this.storage.put(key, r);
            return json({ ok: false, error: 'no open claim with this token', ...view(r) }, 409);
          }
          /* NOT_SENT: nothing left this server (no PDF, no transport) — like REJECTED it blocks no later send */
          const outcome = ['SENT', 'REJECTED', 'UNCERTAIN', 'NOT_SENT'].includes(clean(body.outcome)) ? clean(body.outcome) : 'UNCERTAIN';
          r.attempts = [...(r.attempts || []), { sendKey: r.claim.sendKey, to: r.claim.to, by: r.claim.by, claimedAt: r.claim.at, again: !!r.claim.again,
            outcome, provider: clean(body.provider).slice(0, 20) || null, messageId: clean(body.messageId).slice(0, 200) || null,
            status: Number(body.status) || 0, error: clean(body.error).slice(0, 200) || null, recordedAt: at }];
          r.claim = null;
          await this.storage.put(key, r);
          return json({ ok: true, attempt: r.attempts[r.attempts.length - 1], ...view(r) });
        }
        return json({ ok: false, error: 'unknown statement-mail action ' + action }, 400);
      });
    }

    /* ------------------------------------- holders: the Billing Manager list */
    if (op === 'holders') {
      const settlements = await this.listOf(SETTLEMENT);
      const overrides = new Map(await this.listOf(OVERRIDE));
      const gate = await this.storage.get(GATE);
      /* an issued revision's own facts, from the settlement — or, for a settlement issued before they were kept there,
         from the immutable revision record itself */
      const issuedFacts = new Map();
      for (const [h, s] of settlements) {
        if (!s.issuedRevision) continue;
        if (s.Issue_Date && s.Payment_Preference) {
          issuedFacts.set(h, { Issue_Date: s.Issue_Date, Payment_Preference: s.Payment_Preference, Payment_Currency: s.Payment_Currency || null });
          continue;
        }
        const rec = await this.revisionOf(s.Settlement_ID, s.issuedRevision);
        const snap = rec && rec.snapshot ? rec.snapshot : null;
        issuedFacts.set(h, { Issue_Date: (snap && snap.Issue_Date) || rec && rec.Issue_Date || null,
          Payment_Preference: snap ? snap.Payment_Preference || null : null, Payment_Currency: snap ? snap.Payment_Currency || null : null });
      }
      const rows = settlements
        .map(([h, s]) => {
          const ov = overrides.get(h);
          const f = issuedFacts.get(h) || {};
          return {
            Holder_ID: h,
            Settlement_ID: s.Settlement_ID,
            Settlement_State: s.Settlement_State,
            latestRevision: s.latestRevision || 0,
            currentRevision: s.currentRevision || null,
            issuedRevision: s.issuedRevision || null,
            issuedTotalPayableCents: s.issuedTotalPayableCents == null ? null : s.issuedTotalPayableCents,
            issuedTotalPayable: fromCents(s.issuedTotalPayableCents),
            Due_Date: s.Due_Date || null,
            Issue_Date: f.Issue_Date || null,
            issuedPaymentPreference: f.Payment_Preference || null,
            issuedPaymentCurrency: f.Payment_Currency || null,
            draftTotalPayableCents: s.draftTotalPayableCents == null ? null : s.draftTotalPayableCents,
            draftTotalPayable: fromCents(s.draftTotalPayableCents),
            draftReview: s.draftReview || null,
            draftStoredAt: s.draftStoredAt || null,
            driftCount: s.driftCount || 0,
            blockingDriftCount: s.blockingDriftCount || 0,
            Bill_To_Holder_ID: ov ? ov.Bill_To_Holder_ID || null : null,
            roomUnitIds: s.roomUnitIds || [],
            updatedAt: s.updatedAt || null,
          };
        })
        .sort((a, b) => String(a.Settlement_ID).localeCompare(String(b.Settlement_ID)));

      /* the stored payment method of EVERY holder, settlement or not — the overview's method column without one read per guest */
      const preferences = {};
      for (const [h, p] of await this.listOf(PAYPREF)) {
        if (p && typeof p === 'object') preferences[h] = { Payment_Preference: p.Payment_Preference || null, source: p.source || null, lockedAt: p.lockedAt || null };
      }
      return json({
        ok: true, holders: rows, count: rows.length, preferences,
        engineVersion: ENGINE_VERSION, currency: ACCOUNTING_CURRENCY,
        issueAndPublishEnabled: !!(gate && gate.issueAndPublishEnabled),
        /* deliberately no grand total: a revenue figure is engine output
           (Freeze · U), not a sum of stored rows */
        grandTotal: null,
        grandTotalNote: 'the Revenue Overview calls src/billing/engine.js; the ledger never adds rows up',
      });
    }

    return json({ ok: false, error: 'unknown billing ledger operation: ' + op, operations: OPS }, 404);
  }
}

async function safeJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
