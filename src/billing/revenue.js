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

export const REVENUE_VERSION = 'billing-revenue/2.2.0';

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
      acc.confirmed, result.totalPayableCents, {
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

  const incomplete = Object.keys(kpis).filter((k) => !kpis[k].complete);

  return {
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
}
