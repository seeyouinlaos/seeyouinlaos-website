/* ============================================================================
   H&S WEDDING 2027 — THE MANDATORY ACTIVATION GATE
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · AB).

   THIS IS NOT AN AUTOMATED TEST SUITE. It is an APPROVAL RECORD. It is not
   wired into `npm test`, it does not run on a commit and it never passes by
   itself: condition 5 is a human act by Haruthai or Suthep, recorded as data.

   Until the gate is approved, Issue & Publish MUST remain disabled
   (src/billing/settlement.js · canIssue refuses without it).

   The amounts below are the Owner-approved REFERENCE OUTPUTS from Freeze · G
   and · AB — the answers the engine has to reproduce. They are acceptance
   criteria, never a price source: the engine itself reads every rate from the
   structured Google data and knows none of these numbers.
   ========================================================================== */

import { MANUAL_REVIEW_REQUIRED, DRIFT_BLOCKING, RATE_STATUS, BOOKING_STATE, fromCents, toCents, itemMetadataGaps } from './model.js';
import { calculate } from './engine.js';
import { nightsOfItem } from './source.js';

/**
 * Condition 4 · why a DRAFT item is NOT valid through named special rates
 * alone, or '' when it is. `activeRates` are the ACTIVE 009 rows.
 *
 * Valid means every ACTIVE 009 row on this Item_ID
 *   · carries Approved_By (the approval condition 3 asks for),
 *   · names a Person_ID — a Holder-only row would open the item to the whole
 *     party, which is not a named rate (engine.js · findSpecialRate),
 *   · is computable exactly as the engine computes it: a Rate_Per_Person_Night
 *     and a Nights_Rule that is blank, ALL or a whole number,
 *   · and no two of them name the same person over overlapping dates, because
 *     the engine would silently keep the first.
 */
function namedOnlyGap(id, activeRates) {
  const clean = (v) => String(v == null ? '' : v).trim();
  const rows = activeRates.filter((r) => clean(r.Item_ID) === id);
  if (!rows.length) return 'DRAFT and no ACTIVE named special rate covers it';
  const bad = [];
  for (const r of rows) {
    const who = clean(r.Person_ID);
    if (!clean(r.Approved_By)) bad.push(`a rate for ${who || '(no Person_ID)'} has no Approved_By`);
    if (!who) bad.push(`a rate names no Person_ID${clean(r.Holder_ID) ? ' (Holder-only)' : ''}`);
    if (toCents(r.Rate_Per_Person_Night) == null) bad.push(`the rate for ${who || '(no Person_ID)'} has no Rate_Per_Person_Night`);
    const rule = clean(r.Nights_Rule);
    if (rule && rule.toUpperCase() !== 'ALL' && !(/^\d+$/.test(rule) && Number.isFinite(Number(rule)))) {
      bad.push(`the rate for ${who || '(no Person_ID)'} has Nights_Rule "${rule}"`);
    }
  }
  /* the dates compare as the engine compares them: whole strings, unbounded when blank */
  const span = (r) => [clean(r.Effective_From), clean(r.Effective_To) || '￿'];
  for (let a = 0; a < rows.length; a++) {
    for (let b = a + 1; b < rows.length; b++) {
      const p = clean(rows[a].Person_ID);
      if (!p || p !== clean(rows[b].Person_ID)) continue;
      const [fa, ta] = span(rows[a]), [fb, tb] = span(rows[b]);
      if (fa <= tb && fb <= ta) bad.push(`two ACTIVE rates name ${p} over overlapping dates`);
    }
  }
  return bad.length ? 'DRAFT and ' + [...new Set(bad)].join('; ') : '';
}

/* who × which Item each case books. Never an amount: the amounts come from
 * 002 / 009 through the engine. Named cases use the Person_IDs 009 names (as
 * migrated on 5 Oct 2026, the four couples and the zero-rate couples sit on
 * D1 items); standard cases use a person no 009 row can ever name. */
const ref = (holderId, personId, itemId) => Object.freeze({ holderId, personId, itemId });
const named = (itemId, ...persons) => Object.freeze(persons.map((p) => ref('INV-' + p, p, itemId)));
const STANDARD = (itemId) => Object.freeze([ref('REF-HOLDER', 'REF-STANDARD', itemId)]);
/* the engine path each case must take, so an amount reached the wrong way
   (a zero from a wrong category instead of an approved USD 0 rate) fails */
const SPECIAL = 'SPECIAL_RATE', STANDARD_RATE = 'STANDARD_RATE', HOSTED = 'HOSTED';

/** Freeze · G / AB — the approved reference cases, verbatim. */
export const REFERENCE_CASES = Object.freeze([
  Object.freeze({ id: 'seray-paddy', who: 'Seray / Paddy',
    item: 'Package C · Heritage Executive', expectPerPersonUSD: 225,
    note: 'named special rate',
    bookings: named('C-HERITAGE-EXECUTIVE', 'G003', 'G007'), rateSource: SPECIAL }),
  Object.freeze({ id: 'peggy-steffi', who: 'Peggy / Steffi',
    item: 'Package C · Heritage Executive', expectPerPersonUSD: 130,
    note: 'named special rate',
    bookings: named('C-HERITAGE-EXECUTIVE', 'G001', 'G002'), rateSource: SPECIAL }),
  Object.freeze({ id: 'd1-standard-heritage', who: 'D1 standard · The Heritage · 2 nights',
    item: 'Package D1 · The Heritage', expectPerPersonUSD: 145,
    note: 'USD 145 per person; the second night is USD 0 (SECOND_NIGHT_COMPLIMENTARY)',
    bookings: STANDARD('D1-HERITAGE'), rateSource: STANDARD_RATE }),
  Object.freeze({ id: 'four-couples-150', who: 'Wanlee & Suvit · Somsri & Pattanapong · Kanokporn & Chatchai · Nipapat & Weerapat',
    item: 'Package C', expectPerPersonUSD: 150,
    note: 'USD 150 per person for both nights',
    bookings: named('D1-HERITAGE-EXECUTIVE', 'G015', 'G035', 'G016', 'G036', 'G037', 'G017', 'G091', 'G092'), rateSource: SPECIAL }),
  Object.freeze({ id: 'zero-rate-couples', who: 'Nongyao & Suthee · Karunrat & Kornjirat',
    item: 'Package C', expectPerPersonUSD: 0,
    note: 'a named special rate of USD 0 is a decision, not an absence',
    bookings: named('D1-GRAND-MAJESTIC', 'G011', 'G012', 'G013', 'G014'), rateSource: SPECIAL }),
  Object.freeze({ id: 'temple-offering', who: 'each selected person',
    item: 'Temple Offering', expectPerPersonUSD: 15,
    note: 'SELECTED_GUEST_ONLY',
    bookings: STANDARD('TEMPLE-OFFERING'), rateSource: STANDARD_RATE }),
  Object.freeze({ id: 'guest-house-d2', who: 'Guest House D2',
    item: 'D2 Guest House', expectPerPersonUSD: 0,
    note: 'HOSTED_NO_GUEST_CHARGE · quota 4 PERSON',
    bookings: STANDARD('D2-GUEST-HOUSE'), rateSource: HOSTED }),
  Object.freeze({ id: 'bride-groom-presidential', who: 'Haruthai + Suthep',
    item: 'Package C · Souphattra Presidential', expectPerPersonUSD: 150,
    expectCombinedUSD: 300,
    note: 'USD 75 per person per night × 2 nights = USD 150 per person, USD 300 combined. ' +
          'The engine reads G18 / Standard_Rate — never the G19 / G20 display totals, and G20 stays USD 150.',
    bookings: named('C-SOUPHATTRA-PRESIDENTIAL', 'G048', 'G049'), rateSource: SPECIAL }),
]);

/**
 * Run ONE reference case against the real engine.
 * `fixture` must supply { bookings, items, specialRates, asOf } exactly as the
 * structured Google data would — the caller builds it from 002 / 009, never
 * from numbers typed here.
 */
export function evaluateCase(refCase, fixture) {
  const result = calculate(fixture && fixture.bookings, fixture);
  const out = {
    id: refCase.id, who: refCase.who, item: refCase.item,
    expectPerPersonUSD: refCase.expectPerPersonUSD,
    expectCombinedUSD: refCase.expectCombinedUSD ?? null,
    actualPerPersonUSD: null, actualCombinedUSD: null,
    matches: false, manualReview: result.manualReview.map((l) => l.reviewReason),
  };
  if (result.manualReview.length) return out;

  /* every billed line took the engine path the case is about */
  if (refCase.rateSource && result.blockA.some((l) => l.rateSource !== refCase.rateSource)) {
    out.manualReview = ['priced through ' + [...new Set(result.blockA.map((l) => l.rateSource))].join(', ') +
      ', not ' + refCase.rateSource];
    return out;
  }
  /* and every booked person appears in Block A */
  const booked = new Set(((fixture && fixture.bookings) || []).map((b) => b.Person_ID));
  const billed = new Set(result.blockA.map((l) => l.Person_ID));
  if ([...booked].some((p) => !billed.has(p))) {
    out.manualReview = ['not every booked person was billed in Block A'];
    return out;
  }

  const byPerson = {};
  for (const l of result.blockA) {
    const p = l.Person_ID || '(unassigned)';
    byPerson[p] = (byPerson[p] || 0) + (Number.isFinite(l.amountCents) ? l.amountCents : 0);
  }
  const amounts = Object.values(byPerson);
  if (!amounts.length) return out;

  const first = amounts[0];
  const allSame = amounts.every((a) => a === first);
  out.actualPerPersonUSD = fromCents(first);
  out.actualCombinedUSD = fromCents(amounts.reduce((a, b) => a + b, 0));

  const perPersonOk = allSame && out.actualPerPersonUSD === refCase.expectPerPersonUSD;
  const combinedOk = refCase.expectCombinedUSD == null
    ? true
    : out.actualCombinedUSD === refCase.expectCombinedUSD;
  out.matches = perPersonOk && combinedOk;
  return out;
}

/**
 * THE canonical reference-case run (Owner, 5 Oct 2026) — the one input the
 * gate's condition 1 accepts, used by the gate display and the gate approval
 * alike. Each case's bookings are built from its fixture with 002's own
 * Number of Nights and priced by `evaluateCase` → engine.js `calculate`, the
 * production engine; nothing here multiplies. A case that cannot be priced
 * (unknown Item_ID, a throw, a manual review) comes back `matches: false`, so
 * the gate stays closed rather than skipping it.
 */
export function runReferenceCases({ items, specialRates, asOf }) {
  const its = items && typeof items === 'object' ? items : {};
  return REFERENCE_CASES.map((c) => {
    const missing = c.bookings.map((b) => b.itemId).filter((id) => !its[id]);
    if (missing.length) {
      return { id: c.id, who: c.who, item: c.item, expectPerPersonUSD: c.expectPerPersonUSD,
        expectCombinedUSD: c.expectCombinedUSD ?? null, actualPerPersonUSD: null, actualCombinedUSD: null,
        matches: false, manualReview: ['no structured item metadata for ' + [...new Set(missing)].join(', ')] };
    }
    const bookings = c.bookings.map((b, i) => ({
      Booking_ID: 'REF-' + c.id + '-' + (i + 1),
      Holder_ID: b.holderId, Person_ID: b.personId, Item_ID: b.itemId,
      Bill_To_Holder_ID: b.holderId, State: BOOKING_STATE.CONFIRMED,
      Nights: nightsOfItem(its[b.itemId]), Quantity: 1, Selected: true,
    }));
    try {
      return evaluateCase(c, { bookings, items: its, specialRates: Array.isArray(specialRates) ? specialRates : [], asOf });
    } catch (e) {
      return { id: c.id, who: c.who, item: c.item, expectPerPersonUSD: c.expectPerPersonUSD,
        expectCombinedUSD: c.expectCombinedUSD ?? null, actualPerPersonUSD: null, actualCombinedUSD: null,
        matches: false, manualReview: ['the engine refused this case: ' + String((e && e.message) || e).slice(0, 200)] };
    }
  });
}

/**
 * Freeze · AB — the gate is complete only when ALL FIVE conditions hold.
 * `approval` is the recorded human act; nothing here can forge it.
 */
export function evaluateGate({ caseResults, drifts, specialRates, items, approval, fx, siteKeyDuplicates, nightsGaps }) {
  const conditions = [];

  /* 1 — engine output matches every reference case */
  /* every approved case exactly once, each reproducing its approved amount */
  const results = (Array.isArray(caseResults) ? caseResults : []).filter((r) => r && typeof r === 'object');
  const resultOf = (id) => results.filter((r) => r.id === id);
  const absent = REFERENCE_CASES.filter((c) => resultOf(c.id).length !== 1).map((c) => c.id);
  const unmatched = REFERENCE_CASES.filter((c) => resultOf(c.id).length === 1 && resultOf(c.id)[0].matches !== true).map((c) => c.id);
  conditions.push({
    n: 1, name: 'Engine output matches all reference cases',
    ok: results.length === REFERENCE_CASES.length && !absent.length && !unmatched.length,
    detail: absent.length || results.length !== REFERENCE_CASES.length
      ? `${REFERENCE_CASES.length - absent.length} of ${REFERENCE_CASES.length} cases evaluated exactly once` + (absent.length ? ' (missing or repeated: ' + absent.join(', ') + ')' : '')
      : (unmatched.length ? 'not matching: ' + unmatched.join(', ') : 'all cases reproduce the approved amounts'),
  });

  /* 2 — no unresolved issue-blocking Drift */
  const blocking = (Array.isArray(drifts) ? drifts : [])
    .filter((d) => !d.resolved && DRIFT_BLOCKING.includes(String(d.code || d)))
    .map((d) => String(d.code || d));
  conditions.push({
    n: 2, name: 'No unresolved issue-blocking Drift',
    ok: blocking.length === 0,
    detail: blocking.length ? blocking.join(', ') : 'clear',
  });

  /* 3 — 009_Special_Rates approved by BILLING_ADMIN */
  const rates = Array.isArray(specialRates) ? specialRates : [];
  const active = rates.filter((r) => String(r.Rate_Status || '').trim() === RATE_STATUS.ACTIVE);
  const unapproved = active.filter((r) => !String(r.Approved_By || '').trim()).length;
  conditions.push({
    n: 3, name: '009_Special_Rates approved by BILLING_ADMIN',
    ok: active.length > 0 && unapproved === 0,
    detail: !active.length ? '009_Special_Rates holds no ACTIVE rate yet'
      : (unapproved ? `${unapproved} ACTIVE rate(s) carry no Approved_By` : `${active.length} ACTIVE rates, all approved`),
  });

  /* 4 — required structured metadata is ACTIVE (Owner, 5 Oct 2026).
   * Not every product column of 002 is a general product, so not every item
   * is REQUIRED to be ACTIVE:
   *   · RETIRED — legacy history kept for humans (002 column AA). Never required.
   *   · DRAFT   — not generally available. It does not block activation ONLY
   *     while it is valid through approved Named Special Rates alone: the
   *     Souphattra Presidential suite, Bride & Groom only, which carries no
   *     general Standard_Rate. The engine still refuses a DRAFT item to every
   *     person 009 does not name (engine.js · computeLine); nothing here makes
   *     it bookable.
   *   · ACTIVE  — required, and structurally complete.
   * Anything else — a blank or unknown status, a DRAFT item no approved rate
   * covers — blocks. */
  const all = Object.values(items || {});
  const status = (i) => String(i.Rate_Status || '').trim();
  const itemId = (i) => String(i.Item_ID || '').trim() || '(no Item_ID)';
  const activeItems = [], namedOnly = [], retired = [], blockingItems = [];
  for (const i of all) {
    if (!i || typeof i !== 'object') { blockingItems.push('(no item): not an item record'); continue; }
    const s = status(i), gaps = itemMetadataGaps(i);
    if (s === RATE_STATUS.RETIRED) retired.push(itemId(i));
    else if (s === RATE_STATUS.ACTIVE) {
      if (gaps.length) blockingItems.push(`${itemId(i)}: ACTIVE but incomplete (${gaps.join(', ')})`);
      else activeItems.push(itemId(i));
    } else if (s === RATE_STATUS.DRAFT) {
      const why = gaps.length ? `DRAFT and incomplete (${gaps.join(', ')})` : namedOnlyGap(itemId(i), active);
      if (why) blockingItems.push(`${itemId(i)}: ${why}`);
      else namedOnly.push(itemId(i));
    } else blockingItems.push(`${itemId(i)}: Rate_Status ${s ? `"${s}" is not a known status` : 'is blank'}`);
  }
  conditions.push({
    n: 4, name: 'Required structured item metadata is ACTIVE',
    ok: all.length > 0 && activeItems.length > 0 && blockingItems.length === 0,
    detail: !all.length ? 'no structured item metadata loaded'
      : !activeItems.length && !blockingItems.length ? 'no ACTIVE item loaded'
      : [
        `${activeItems.length} ACTIVE`,
        namedOnly.length ? `${namedOnly.length} DRAFT valid only through approved named special rates (${namedOnly.join(', ')})` : '',
        retired.length ? `${retired.length} RETIRED, not required (${retired.join(', ')})` : '',
        blockingItems.length ? `blocking: ${blockingItems.join('; ')}` : 'no blocking item',
      ].filter(Boolean).join(' · '),
  });

  /* 5 — an explicit BILLING_ADMIN approval, recorded by Haruthai or Suthep */
  const by = String((approval && approval.approvedBy) || '').trim().toLowerCase();
  const admin = by === 'haruthai' || by === 'suthep';
  conditions.push({
    n: 5, name: 'Explicit BILLING_ADMIN approval recorded',
    ok: !!(admin && String((approval && approval.approvedAt) || '').trim()),
    detail: admin ? `recorded by ${by} at ${(approval && approval.approvedAt) || '(no timestamp)'}`
      : 'not recorded — Haruthai or Suthep must approve explicitly',
  });

  /* --- 6 and 7 — the FX pair resolves, from 011_Billing_Config only -------
   * (Owner, 5 Oct 2026). Exactly one applicable ACTIVE value per key; zero,
   * several or an unusable Value are all failures, and no default exists. */
  const fxGaps = (fx && Array.isArray(fx.gaps) ? fx.gaps : []);
  const thbOk = !!(fx && Number(fx.FX_USD_THB) > 0) && !fxGaps.some((g) => String(g).startsWith('FX_USD_THB'));
  const eurOk = !!(fx && Number(fx.FX_USD_EUR) > 0) && !fxGaps.some((g) => String(g).startsWith('FX_USD_EUR'));
  conditions.push({
    n: 6, name: 'An applicable ACTIVE FX_USD_THB exists in 011_Billing_Config',
    ok: thbOk,
    detail: thbOk ? 'resolved to ' + fx.FX_USD_THB : (fxGaps.find((g) => String(g).startsWith('FX_USD_THB')) || 'not resolved'),
  });
  conditions.push({
    n: 7, name: 'An applicable ACTIVE FX_USD_EUR exists in 011_Billing_Config',
    ok: eurOk,
    detail: eurOk ? 'resolved to ' + fx.FX_USD_EUR : (fxGaps.find((g) => String(g).startsWith('FX_USD_EUR')) || 'not resolved'),
  });

  /* --- 8 — the website-to-Item bridge is unambiguous --------------------- */
  /* an input that was never supplied is "not evaluated", never a silent pass */
  const dupes = Array.isArray(siteKeyDuplicates) ? siteKeyDuplicates : [];
  conditions.push({
    n: 8, name: 'No ambiguous Site_Product_Key mapping exists',
    ok: Array.isArray(siteKeyDuplicates) && dupes.length === 0,
    detail: !Array.isArray(siteKeyDuplicates) ? 'not evaluated — the Site_Product_Key index was not supplied'
      : dupes.length
      ? dupes.map((d) => d.Site_Product_Key + ' → ' + (d.Item_IDs || []).join(' / ')).join('; ')
      : 'every mapped website product resolves to exactly one Item_ID',
  });

  /* --- 9 — every nightly Item carries a usable Number of Nights ---------- */
  const nGaps = Array.isArray(nightsGaps) ? nightsGaps : [];
  conditions.push({
    n: 9, name: 'All required Number of Nights values are valid',
    ok: Array.isArray(nightsGaps) && nGaps.length === 0,
    detail: !Array.isArray(nightsGaps) ? 'not evaluated — the Number of Nights check was not supplied'
      : nGaps.length ? 'missing or unusable for: ' + nGaps.join(', ') : 'all nightly items carry a usable value',
  });

  const approved = conditions.every((c) => c.ok);
  return {
    approved,
    conditions,
    /* Freeze · AB — before approval, Issue & Publish MUST remain disabled. */
    issueAndPublishEnabled: approved,
    open: conditions.filter((c) => !c.ok).map((c) => `${c.n}. ${c.name} — ${c.detail}`),
  };
}

/** The gate's resting state before anyone has run it: closed. */
export const GATE_NOT_RUN = Object.freeze({
  approved: false,
  issueAndPublishEnabled: false,
  conditions: [],
  open: ['the Mandatory Activation Gate has not been run'],
  note: MANUAL_REVIEW_REQUIRED,
});
