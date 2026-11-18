/* ============================================================================
   H&S WEDDING 2027 — REVENUE AND BUDGET, SIDE BY SIDE (billing-budget/1.0.0 · Owners, 15 Nov 2026)

   The comparison on the Revenue tab: what the guests contribute (the Billing Engine's booked lines — exactly the lines
   behind the booked figure, src/billing/revenue.js) beside what the Owners recorded about their suppliers
   (004_Budget_Finance, 007_Deposit/Payment_Details): per category, per stay (property + period), per route (departure +
   service) and per other billable service.

   THE RULES IT KEEPS (Owners' order of 15 Nov 2026 · pricing guard C1–C12 · independent review):
   · GUEST AMOUNTS are the engine's line amounts (amountCents) and nothing else — never a rate × nights, never split by
     night or person, never recomputed. Supplier figures are 004 / 007 cells exactly as Google returns them.
   · A DIFFERENCE exists only for a stay or route whose supplier cost is stated for the same period and service, every
     booked room-night or ticket of it. There is no partial difference: otherwise contributions and the cost known so far
     stand side by side, unsubtracted, with what is missing named. A category shows a difference only when every one of
     its stays/routes is complete; complete and incomplete parts are never added to each other.
   · A HOTEL BLOCK costs what its 004 line states — all its rooms, booked or not — never re-priced by the rooms booked and
     never split per room (a room row shows the block's per-room rate, not a difference). A TICKET costs its 004 rate ×
     the tickets booked. A rented house or a vehicle costs its 004 line, once.
   · A line H&S BOOKED AND PAID for a guest (a 009 Billing_Category row) stays on the guest side: Google does not state
     what H&S paid the supplier for it, so its stay is not complete (pricing guard C1).
   · 004's PLANNED GUEST CONTRIBUTIONS are a comparison figure, never revenue. Only lines carrying a Suthep approval enter
     a comparison. A line naming persons is their own place (assumption A-2). Every reading a figure rests on is returned
     with that figure (`assumptions`), and every gap as an Owner question.
   · 007: only figures the Owners TYPED count (a currency the sheet converts is not a reporting conversion); a payment
     dated after `asOf` is not counted as paid. Currencies are never converted or added across.
   PURE: no network, no clock (`asOf` is given), no storage; the input lines are never mutated. All supplier-side
   arithmetic of the comparison lives here — none in revenue.js.

   1.1.0 (Owners' review of the Souphattra figures, 17 Nov 2026) — what the figures are, said where they stand; no figure
   added, split, excluded or re-priced:
   · a room line inside a block of every room of its stay is NAMED as possibly counted twice (A-5) — the sums stay 004 as
     stated; an amount is attributed only to a line wholly inside and consistent in its own cells;
   · a supplier's 007 total beside its 004 lines names what 007 cannot say, the nights of its stays no approved 004 line
     covers (night by night, with the lines that do not count and why) and the lines possibly counted twice;
   · OUTSTANDING = the typed 007 total less the payments counted, only when every payment 007 records for it counts;
   · a 004 summary cell that differs from its lines names its formula's own range when that alone explains it.
   ========================================================================== */

import { RULES, STAGES, VENDORS, BUDGET_MAP_VERSION, personNamed, roomScopeOf } from './budget-map.js';
import { nightsBetween } from './budget-source.js';
import { matchSpecialRate } from './engine.js';
import { nightsOfItem } from './source.js';
import { toCents } from './model.js';
import { financeReportOf, unitId, hotelPurchaseOf } from './finance-report.js';

export const BUDGET_VERSION = 'billing-budget/1.3.0';

const clean = (v) => String(v == null ? '' : v).trim();
const norm = (v) => clean(v).replace(/\s+/g, ' ').toLowerCase();
const byText = (a, b) => (a < b ? -1 : (a > b ? 1 : 0));
const asArray = (v) => (Array.isArray(v) ? v : []);
const CURRENCIES = ['USD', 'THB', 'EUR'];
const amt = (cents, currency) => (cents == null || !Number.isFinite(cents) ? null : { currency: currency || 'USD', cents: Math.round(cents), amount: Math.round(cents) / 100 });
const unitLabelOf = (ru) => { const p = clean(ru).split('·'); return p.length > 2 ? p[p.length - 1] : (clean(ru) || null); };
const holderOfLine = (l) => clean(l.Holder_ID) || clean(clean(l.Booking_ID).split('·')[1]) || clean(l.Bill_To_Holder_ID) || null;
const dmy = (iso) => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4) : '');
const sumCents = (xs) => xs.reduce((t, x) => t + x, 0);

/* The readings a figure may rest on — returned with every figure that uses one, and put to the Owners. */
export const ASSUMPTIONS = Object.freeze({
  'A-2': 'A budget line that names persons ("…, Name" or "(A & B)") is those persons\' own place or ticket — the hosts\' or their staff\'s. It never counts as a guest\'s cost, coverage or quantity; where a guest billed for the same stay or route carries one of those first names it is listed as a possible double.',
  'A-3': 'An approved budget line for "All Categories Rooms" buys every room of that stay — all its room categories — for the nights of its own period.',
  'A-4': 'The Guest House line is the hosted guests\' whole rental: its period may be longer than their stay, and it is never split by night.',
  'A-5': 'A block of every room 002 offers for a stay (its Qty equals the stay\'s 002 room quotas added up) is the whole hotel for its nights: another room line of that stay on one of those nights may already be inside it. 002 quotas are what the site offers, not a hotel inventory — so it is named as possible, never removed from a sum.',
});

export const LABELS = Object.freeze({
  HOST_COST: 'Cost still to be covered by the hosts', SURPLUS: 'Expected surplus', AT_COST: 'At cost', ROUNDING: 'Rounding difference',
});

/* only the sheet's own approval entry approves — "Approve by Suthep, 29.09.2026" / "Approved by …"; any other text
   ("Awaiting approval", "Unapproved", "To be approved", …) is listed as not recognised, never read as an approval */
function approves(text) { return /^approved?\s+by\b/i.test(clean(text)); }

function labelOf(diffCents, roundingWithin) {
  if (diffCents === 0) return 'AT_COST';
  if (roundingWithin != null && Math.abs(diffCents) <= roundingWithin) return 'ROUNDING';
  return diffCents < 0 ? 'HOST_COST' : 'SURPLUS';
}

/* ------------------------------------------------------- the cost centres */

function centresOf(items, display) {
  const centres = new Map(), byItem = new Map();
  for (const id of Object.keys(items || {}).sort(byText)) {
    const d = display.items[id];
    if (!d || !clean(d.category)) continue;
    const stage = clean(d.package) || null;
    const key = stage || id;
    if (!centres.has(key)) {
      const cat = norm(d.category);
      centres.set(key, { id: key, stage, category: clean(d.category), kind: cat === 'accommodation' ? 'STAY' : cat === 'transportation' ? 'ROUTE' : 'SERVICE',
        place: (stage && STAGES[stage] && STAGES[stage].place) || d.name || d.room || id, items: [], from: null, to: null, checks: [] });
    }
    const c = centres.get(key);
    if (norm(c.category) !== norm(d.category)) c.checks.push({ severity: 'data', text: '002 gives ' + id + ' the category "' + d.category + '", its stage ' + key + ' "' + c.category + '"' });
    c.items.push(id);
    byItem.set(id, c);
    if (d.checkIn && (!c.from || d.checkIn < c.from)) c.from = d.checkIn;
    if (d.checkOut && (!c.to || d.checkOut > c.to)) c.to = d.checkOut;
    const n = nightsOfItem(items[id]);
    if (c.kind === 'STAY' && d.checkIn && d.checkOut && n != null && nightsBetween(d.checkIn, d.checkOut).length !== n) {
      c.checks.push({ severity: 'data', text: '002 dates of ' + id + ' (' + d.checkInText + ' – ' + d.checkOutText + ') do not give its ' + n + ' night' + (n === 1 ? '' : 's') });
    }
    if (d.nights != null && n != null && d.nights !== n) c.checks.push({ severity: 'data', text: '002 changed between two reads: ' + id + ' has ' + n + ' / ' + d.nights + ' nights' });
  }
  return { centres, byItem };
}

/* --------------------------------------------------------- the guest side */

function guestLines({ booked, items, display, byItem, names, rates009, asOf, rooms }) {
  const extraBeds = new Set(asArray(booked.extraBedIds).map(clean));
  /* the Rooms engine's own record of who sleeps on a room's extra bed (17 Nov 2026) — by item and unit label, beside the Owners' flag */
  const onBed = new Set();
  for (const [key, units] of Object.entries((rooms && rooms.units) || {})) for (const u of units || []) for (const o of (u && u.occupants) || []) {
    if (o && o.bed && o.guestId) for (const [id, it] of Object.entries(items || {})) if (clean(it.Site_Product_Key).split(/[,|]/)[0] === key) onBed.add(id + '|' + u.label + '|' + o.guestId);
  }
  const holders = asArray(booked.holders);
  const settlementOf = new Map(holders.map((h) => [clean(h.Holder_ID), h.Settlement_ID || null]));
  const persons = (names && names.persons) || {}, payers = (names && names.holders) || {};
  const excluded = [], gapUnits = new Map(), unclassified = [], perCentre = new Map();
  const rowOf009 = (l, holder) => {
    if (!rates009 || !rates009.ok) return { row: null, why: '009 not readable just now' };
    const m = matchSpecialRate(rates009.rows, { holderId: holder, personId: l.Person_ID, itemId: l.Item_ID, asOf });
    if (!m || !m.rate || m.ambiguous) return { row: null, why: '009 row not identifiable' };
    if (toCents(m.rate.Rate_Per_Person_Night) !== l.rateCents) return { row: null, why: '009 row not identifiable (today\'s 009 differs from the rate this line was priced on)' };
    return { row: m.rate.row };
  };
  for (const h of holders) {
    const lines = asArray(h.lines).filter((l) => l && l.block === 'A' && Number.isFinite(l.amountCents));
    if (h.gapReason) {
      excluded.push({ Holder_ID: clean(h.Holder_ID), reason: h.gapReason, lines: lines.length, amount: amt(sumCents(lines.map((l) => l.amountCents))),
        centres: [...new Set(lines.map((l) => (byItem.get(clean(l.Item_ID)) || {}).id).filter(Boolean))].sort(byText) });
      for (const l of lines) if (clean(l.Room_Unit_ID)) gapUnits.set(clean(l.Room_Unit_ID), clean(h.Holder_ID));
      continue;
    }
    for (const l of lines) {
      const id = clean(l.Item_ID), it = items[id] || {}, d = display.items[id] || {};
      const basis = clean(l.Rate_Basis) || clean(it.Rate_Basis);
      const n = l.nights != null && clean(l.nights) !== '' && Number.isFinite(Number(l.nights)) ? Number(l.nights) : nightsOfItem(it);
      const hosted = l.hosted === true || clean(l.rateSource) === 'HOSTED';
      const special = clean(l.rateSource) === 'SPECIAL_RATE';
      const rateCents = Number.isFinite(l.rateCents) ? l.rateCents : null;
      const p = l.payableNights != null && clean(l.payableNights) !== '' && Number.isFinite(Number(l.payableNights)) ? Number(l.payableNights) : null;
      const qty = Number(l.quantity) > 0 ? Number(l.quantity) : 1;
      let charged = null, hostedN = null, compl = null, words;
      if (hosted) { hostedN = n; words = 'hosted' + (n != null ? ' · ' + n + ' night' + (n === 1 ? '' : 's') : ''); }
      else if (/NIGHT/.test(basis)) {
        if (special && rateCents === 0) { compl = n; words = 'complimentary (009)' + (n != null ? ' · ' + n + ' night' + (n === 1 ? '' : 's') : ''); }
        else if (p != null && n != null && p < n) { charged = p; hostedN = n - p; words = 'charged ' + p + ' · hosted ' + (n - p); }
        else { charged = p; words = 'charged ' + (p != null ? p : '—'); }
      } else words = qty + ' place' + (qty === 1 ? '' : 's');
      const holder = holderOfLine(l), payer = clean(l.Bill_To_Holder_ID) || holder;
      const paidByHS = !!(l.categoryOverride || clean(l.Category_Override_From));
      const view = {
        bookingId: clean(l.Booking_ID) || null, holder, payer, payerName: payers[payer] || null, statement: settlementOf.get(payer) || null,
        person: clean(l.Person_ID) || null, personName: persons[clean(l.Person_ID)] || null,
        item: id, itemName: d.name || id, unit: clean(l.Room_Unit_ID) || null, unitLabel: unitLabelOf(l.Room_Unit_ID),
        rate: amt(rateCents), rateBasis: basis || null,
        rateSource: hosted ? 'hosted (002)' : special ? '009' : clean(l.rateSource) === 'STANDARD_RATE' ? '002' : (clean(l.rateSource) || null),
        rate009: special ? rowOf009(l, holder) : null,
        nights: n, payableNights: p, quantity: qty, chargedNights: charged, hostedNights: hostedN, complimentaryNights: compl, nightsWords: words,
        extraBed: extraBeds.has(clean(l.Booking_ID)) || onBed.has(clean(l.Item_ID) + '|' + clean(l.Room_Unit_ID).split('·').pop() + '|' + clean(l.Person_ID)), paidByHS,
        paidByHSWords: paidByHS ? 'booked and paid by H&S; the guest repays the 009 amount' : null,
        source: clean(l.Booking_ID).startsWith('OB·') ? 'recorded by the Owners' : 'the guest\'s own trip',
        asInvoiced: l._src === 'issued', amount: amt(l.amountCents),
      };
      const c = byItem.get(id);
      if (!c) { unclassified.push(view); continue; }
      if (!perCentre.has(c.id)) perCentre.set(c.id, []);
      perCentre.get(c.id).push(view);
    }
  }
  return { perCentre, excluded, gapUnits, unclassified };
}

/* --------------------------------------------------------- 004, assigned */

function itemsNamed(c, words, display) {
  return c.items.filter((id) => words.test(clean(display.items[id] && display.items[id].name)));
}

function assign004(budget, centres, display) {
  const perCentre = new Map(), noGuest = [], unassigned = [];
  const byStage = new Map([...centres.values()].filter((c) => c.stage).map((c) => [c.stage, c]));
  for (const l of asArray(budget && budget.lines)) {
    const base = { row: l.row, item: l.item, vendor: l.vendor, category: l.category, details: l.details, rate: l.rate, qty: l.qty, mult: l.mult,
      budget: amt(toCents(l.budget)), actual: amt(toCents(l.actual)), actualIsBudget: l.actualIsBudget, paid: amt(toCents(l.paid)), paidBy: l.paidBy,
      payDate: l.payDate, payDateText: l.payDateText, status: l.status, periodText: l.periodText, period: l.period, location: l.location,
      currency: l.currency, approval: l.approval, approved: approves(l.approval), done: l.done };
    if (!l.readable) { unassigned.push({ ...base, why: 'not readable: ' + l.problems.join(', ') }); continue; }
    /* 004's figures are USD by its own headers: a line whose Currency names another currency enters no USD sum and no
       comparison — listed apart, never converted */
    const otherCurrency = clean(l.currency) && clean(l.currency).toUpperCase() !== 'USD' ? clean(l.currency).toUpperCase() : null;
    if (otherCurrency) { unassigned.push({ ...base, why: 'its Currency is ' + otherCurrency + ' — never converted, in no USD figure' }); continue; }
    const role = l.rate < 0 && l.budget <= 0 ? 'PLANNED_CONTRIBUTION' : (l.rate >= 0 && l.budget >= 0 ? 'SUPPLIER_COST' : null);
    if (!role) { unassigned.push({ ...base, why: 'Rate USD ' + l.rate + ' and Budget USD ' + l.budget + ' disagree in sign — read as neither a cost nor a contribution' }); continue; }
    const rule = RULES.find((r) => norm(r.category) === norm(l.category) && r.item.test(clean(l.item)));
    if (!rule) { noGuest.push({ ...base, role }); continue; }
    const cands = rule.stages.map((s) => byStage.get(s)).filter(Boolean);
    const p = l.period;
    let c = null, rel = null;
    if (p) {
      const inside = cands.filter((x) => x.from && x.to && (p.single ? (p.from >= x.from && p.from <= x.to) : (p.from >= x.from && p.to <= x.to)));
      if (inside.length === 1) { c = inside[0]; rel = 'WITHIN'; }
      else if (!inside.length) {
        const over = cands.filter((x) => x.from && x.to && (p.single ? (p.from >= x.from && p.from <= x.to) : (p.from < x.to && p.to > x.from)));
        if (over.length === 1) { c = over[0]; rel = 'BEYOND'; }
      }
    } else if (cands.length === 1) { c = cands[0]; rel = 'UNREADABLE'; }
    if (!c) {
      unassigned.push({ ...base, rule: rule.id, role, why: p ? 'its period ' + p.text + ' fits ' + (cands.length ? 'none or several of the stays ' + cands.map((x) => x.id).join(' / ') : 'no stay') : 'no readable period, and it may belong to ' + cands.map((x) => x.id).join(' or ') });
      continue;
    }
    /* what the line buys */
    const names = role === 'SUPPLIER_COST' ? personNamed(l) : [];
    let whose = null, scope = null, assumption = null;
    const s = roomScopeOf(l.details);
    if (role === 'PLANNED_CONTRIBUTION') scope = s ? (s.all ? 'ALL' : itemsNamed(c, s.words, display)) : null;
    else if (names.length) { whose = 'PERSON_NAMED'; assumption = 'A-2'; }
    else if (rule.whose === 'BY_SCOPE') {
      if (!s) whose = 'UNSTATED';
      else if (s.all) { whose = 'GUEST_SERVICE'; scope = 'ALL'; assumption = 'A-3'; }
      else { scope = itemsNamed(c, s.words, display); whose = scope.length ? 'GUEST_SERVICE' : 'UNSTATED'; }
    } else { whose = rule.whose; if (whose === 'GUEST_SERVICE') { scope = 'ALL'; if (rule.model === 'FLAT' && c.kind === 'STAY') assumption = 'A-4'; } }
    /* what in the line itself disagrees (a room-night line only: its period against Details and "Nights, Rooms, EA") */
    const conflicts = [], notes = [];
    if (role === 'SUPPLIER_COST' && rule.model === 'ROOM_BLOCK') {
      if (!p) conflicts.push('no readable "Date or period"');
      else if (p.single) conflicts.push('a single date, not a stay');
      else {
        const dp = l.detailsPeriod;
        if (dp && !dp.single && (dp.from !== p.from || dp.to !== p.to)) conflicts.push('Details give ' + dp.text + ', "Date or period" ' + p.text);
        if (l.mult !== p.nights.length) conflicts.push('"Nights, Rooms, EA" states ' + l.mult + ', the period ' + p.text + ' has ' + p.nights.length + ' night' + (p.nights.length === 1 ? '' : 's'));
      }
      if (toCents(l.rate * l.qty * l.mult) !== toCents(l.budget)) notes.push('Budget USD is not Rate USD × Qty × "Nights, Rooms, EA" — no per-room rate is shown');
    }
    if (role === 'SUPPLIER_COST' && rule.model === 'FLAT' && !p) conflicts.push('no readable "Date or period"');
    if (rel === 'BEYOND') notes.push('its period ' + p.text + ' is longer than the stay ' + dmy(c.from) + ' – ' + dmy(c.to));
    if (rel === 'UNREADABLE') notes.push('no readable period — placed by its name alone');
    const scoped = scope === 'ALL' || (Array.isArray(scope) && scope.length > 0);
    const usable = role === 'SUPPLIER_COST' && whose === 'GUEST_SERVICE' && base.approved && !conflicts.length && !!p && scoped;
    const why = role !== 'SUPPLIER_COST' ? 'a planned guest contribution — comparison only, never revenue'
      : whose === 'PERSON_NAMED' ? 'names ' + names.join(' & ') + ' — their own place or ticket (A-2)'
      : whose === 'UNSTATED' ? 'does not say whose place it is — a question for the Owners'
      : !base.approved ? (clean(l.approval) ? 'its approval entry "' + clean(l.approval) + '" is not the sheet\'s "Approve by …" — not used' : 'not approved (no Suthep approval) — not used')
      : conflicts.length ? 'its own cells disagree: ' + conflicts.join('; ')
      : !p ? 'no readable "Date or period" — not used'
      : !scoped ? 'names no room category of this stay — not used' : null;
    const out = { ...base, rule: rule.id, role, whose, scope, names, model: rule.model, service: rule.service || null, rel, conflicts, notes, usable, why, assumption, insideBlock: null,
      perRoomNight: usable && rule.model === 'ROOM_BLOCK' && !notes.some((x) => /per-room rate/.test(x)) ? amt(toCents(l.rate)) : null };
    if (!perCentre.has(c.id)) perCentre.set(c.id, []);
    perCentre.get(c.id).push(out);
  }
  return { perCentre, noGuest, unassigned };
}

/* ------------------------------------------------------ the comparison */

function covers(x, night) { return x.period && !x.period.single && night >= x.period.from && night < x.period.to; }
function inScope(x, item) { return x.scope === 'ALL' || (Array.isArray(x.scope) && x.scope.includes(item)); }

function compareStay(c, guest, lines, ctx) {
  const missing = [], assumptions = new Set();
  const units = new Map();
  for (const g of guest) {
    const k = g.unit || '(no room) ' + (g.bookingId || g.person || '');
    if (!units.has(k)) units.set(k, { unit: g.unit, label: g.unitLabel, item: g.item, itemName: g.itemName, lines: [] });
    units.get(k).lines.push(g);
  }
  /* EVERY approved line that buys the guests' rooms of this stay costs its Budget USD as stated — booked or not: a block
     costs what it states, its unsold rooms included (review P0-2) */
  const usable = lines.filter((x) => x.usable && (x.model === 'ROOM_BLOCK' || x.model === 'FLAT'));
  const used = new Set(usable);
  for (const x of usable) if (x.assumption) assumptions.add(x.assumption);
  if (!units.size) missing.push('nothing of it is booked yet — no contribution to set beside its cost');
  /* two lines on one night for the same room category — an "All Categories" block and another line, or two category lines —
     overlap, whether or not a room of that category is booked */
  const nameOf = (id) => (ctx.display.items[id] && ctx.display.items[id].name) || id;
  const overlaps = new Map();
  for (const n of (c.from && c.to ? nightsBetween(c.from, c.to) : [])) for (const id of c.items) {
    const cover = usable.filter((x) => covers(x, n) && inScope(x, id));
    if (cover.length < 2) continue;
    const k = n + '|' + cover.map((x) => x.row).join(' and ');
    if (!overlaps.has(k)) overlaps.set(k, new Set());
    overlaps.get(k).add(nameOf(id));
  }
  for (const [k, names] of [...overlaps].sort((x, y) => byText(x[0], y[0]))) {
    const [n, rows] = k.split('|');
    missing.push(dmy(n) + ': budget rows ' + rows + ' both cover ' + [...names].sort(byText).join(', '));
  }
  let covered = 0, total = 0;
  const perLineNight = new Map();   /* `${row}|${night}` → booked rooms on it (block capacity) */
  const rooms = [];
  for (const u of units.values()) {
    const d = ctx.display.items[u.item] || {};
    const nights = d.checkIn && d.checkOut ? nightsBetween(d.checkIn, d.checkOut) : [];
    const row = { unit: u.unit, label: u.label, item: u.item, itemName: u.itemName, lines: u.lines, nights: [],
      contribution: amt(sumCents(u.lines.map((g) => g.amount.cents))), notes: [] };
    if (!u.unit) { missing.push('a booked room has no room recorded (' + u.lines.map((g) => g.personName || g.person).join(', ') + ')'); row.notes.push('no room recorded'); }
    if (u.unit && ctx.gapUnits.has(u.unit)) { missing.push('room ' + u.label + ' (' + u.itemName + ') is shared with ' + ctx.gapUnits.get(u.unit) + ', not counted'); row.notes.push('shared with an invitation not counted'); }
    if (u.lines.some((g) => g.paidByHS)) {
      const rows009 = [...new Set(u.lines.filter((g) => g.paidByHS).map((g) => (g.rate009 && g.rate009.row ? 'row ' + g.rate009.row : (g.rate009 && g.rate009.why) || 'row not identifiable')))];
      missing.push('room ' + (u.label || '—') + ' (' + u.itemName + ') was booked and paid by H&S: what H&S paid is not stated in Google (009 ' + rows009.join(', ') + ')');
      row.notes.push('booked and paid by H&S — supplier cost not stated in Google');
    }
    for (const g of u.lines) if (g.extraBed && !usable.some((x) => /extra\s*bed/i.test(x.details) || /extra\s*bed/i.test(x.item))) {
      missing.push('extra bed for ' + (g.personName || g.person) + ' in room ' + u.label + ': no supplier cost line');
      row.notes.push('extra bed — no supplier cost line');
    }
    if (!nights.length) { missing.push('no stay dates for ' + u.item); row.notes.push('no stay dates'); }
    for (const n of nights) {
      total += 1;
      const cover = usable.filter((x) => covers(x, n) && inScope(x, u.item));
      if (cover.length === 1) {
        covered += 1;
        const k = cover[0].row + '|' + n; perLineNight.set(k, (perLineNight.get(k) || 0) + 1);
        row.nights.push({ night: n, row: cover[0].row, perRoomNight: cover[0].perRoomNight, model: cover[0].model });
      } else if (cover.length > 1) row.nights.push({ night: n, row: null, overlap: cover.map((x) => x.row) });   /* said once above */
      else row.nights.push({ night: n, row: null });
    }
    rooms.push(row);
  }
  /* the nights without a supplier cost, said once per night and product */
  const uncovered = new Map();
  for (const r of rooms) for (const n of r.nights) if (!n.row && !n.overlap) { const k = n.night; if (!uncovered.has(k)) uncovered.set(k, new Set()); uncovered.get(k).add(r.itemName); }
  for (const [n, names] of [...uncovered].sort((a, b) => byText(a[0], b[0]))) missing.push(dmy(n) + ': no approved supplier cost for ' + [...names].sort(byText).join(', ') + ' in 004');
  /* the same nights, structured (1.1.0): per night the booked room categories without a supplier cost, and the 004 lines of
     this stay whose period does cover the night but which do not count for the guests' rooms — each with why */
  const uncoveredList = [...uncovered].sort((a, b) => byText(a[0], b[0])).map(([n, names]) => ({ night: n, items: [...names].sort(byText),
    others: lines.filter((x) => x.role === 'SUPPLIER_COST' && !x.usable && (x.model === 'ROOM_BLOCK' || x.model === 'FLAT') && covers(x, n))
      .map((x) => ({ row: x.row, why: x.why || (x.conflicts.length ? 'its own cells disagree: ' + x.conflicts.join('; ') : 'not used') })) }));
  /* block capacity: never more rooms booked than the block holds; its unsold rooms listed, night by night */
  const notBooked = [];
  for (const x of usable) if (x.model === 'ROOM_BLOCK') {
    for (const n of x.period.nights) {
      const b = perLineNight.get(x.row + '|' + n) || 0;
      if (b > x.qty) missing.push(dmy(n) + ': ' + b + ' rooms booked, budget row ' + x.row + ' holds ' + x.qty);
      else if (x.qty - b > 0) notBooked.push({ row: x.row, night: n, rooms: x.qty - b, perRoomNight: x.perRoomNight, inBlock: x.qty, booked: b });
    }
  }
  return { rooms, notBooked, missing, used, assumptions, uncovered: uncoveredList, coverage: { covered, total, unit: 'room-night' } };
}

/* A ROOM LINE INSIDE A WHOLE-HOTEL BLOCK (1.1.0 · A-5): a block of every room 002 offers for the stay — an "All Categories"
   room line, its own cells consistent, its Qty the stay's 002 room quotas added up (every product of the stay counted in
   rooms) — holds every room for its nights; another room line of the stay on one of those nights may already be in it.
   Only lines the night-by-night overlap check does not see (it already names two usable lines on one night) and only room
   lines (no extra bed, breakfast, supplement or check-in/out charge). WHOLLY inside — every night of its period inside the
   blocks and its own cells consistent — attributes its Budget USD as stated; anything else is named, no amount: a line is
   never split and its own disagreeing cells are never settled here (pricing guard condition 1). Nothing is removed from a sum. */
function insideWholeHotel(c, lines, items) {
  const quotas = c.items.map((id) => (clean(items[id] && items[id].Quota_Unit) === 'ROOM' && clean(items[id].Quota) !== '' ? Number(items[id].Quota) : NaN));
  if (!quotas.length || !quotas.every((n) => Number.isFinite(n))) return { lines: [], full: [] };
  const all = sumCents(quotas);
  const full = lines.filter((x) => x.role === 'SUPPLIER_COST' && x.model === 'ROOM_BLOCK' && x.scope === 'ALL' && !x.conflicts.length && x.period && !x.period.single && x.qty === all);
  if (!full.length) return { lines: [], full: [] };
  const found = [];
  for (const x of lines) {
    if (x.role !== 'SUPPLIER_COST' || x.model !== 'ROOM_BLOCK' || !x.period || x.period.single) continue;
    if (/extra\s*bed|breakfast|supplement|check[\s-]*(in|out)/i.test(clean(x.item) + ' ' + clean(x.details))) continue;
    const hit = full.filter((b) => b !== x && b.period.nights.some((n) => x.period.nights.includes(n)));
    if (!hit.length) continue;
    /* two USABLE lines on one night are named by the night-by-night overlap check already — every other pairing is named here
       (an approved line inside an unapproved block, a block of every room typed twice), so none goes unnamed (review, 17 Nov 2026) */
    if (x.usable && hit.every((b) => b.usable)) continue;
    const blockNights = new Set(hit.flatMap((b) => b.period.nights));
    const nights = x.period.nights.filter((n) => blockNights.has(n));
    const block = full.includes(x);
    const partly = nights.length < x.period.nights.length;
    /* an amount only for a line wholly inside, its own cells consistent, and itself no block of every room: of two such
       blocks on one night, which one is counted twice is not stated */
    found.push({ line: x, rows: hit.map((b) => b.row), nights, wholly: !block && !partly && !x.conflicts.length, partly, block, rooms: all });
  }
  return { lines: found, full };
}
function insideWords(f) {
  const many = f.rows.length > 1;
  const where = (many ? 'budget rows ' : 'budget row ') + f.rows.join(' and ');
  const short = (many ? 'rows ' : 'row ') + f.rows.join(' and ');
  const on = f.nights.map(dmy).join(', ');
  if (f.block) return 'a second block of every room of this stay on ' + on + ' beside ' + where + ' — one of them possibly counted twice; which one is not stated (A-5)';
  if (f.wholly) return 'inside ' + where + ' on ' + on + ' — ' + short + (many ? ' buy' : ' buys') + ' all ' + f.rooms + ' rooms of this stay (A-5): possibly counted twice';
  if (f.partly) return 'partly inside ' + where + ' (' + on + ') — the rest of it is not' + (f.line.conflicts.length ? ', and its own cells disagree on its nights' : '') + '; what of it is inside is not stated (A-5)';
  return 'by its period inside ' + where + ' on ' + on + '; its own cells disagree on its nights — what of it ' + short + ' already ' + (many ? 'buy' : 'buys') + ' is not stated (A-5)';
}

function compareRoute(c, guest, lines, ctx) {
  const missing = [], used = new Set(), assumptions = new Set();
  const services = (c.stage && STAGES[c.stage] && STAGES[c.stage].services) || ['Service'];
  const tickets = sumCents(guest.map((g) => g.quantity));
  const usable = lines.filter((x) => x.usable);
  if (!guest.length) missing.push('nothing of it is booked yet — no contribution to set beside its cost');
  /* one product per route: with several, the tickets of one service cannot be told from another's — never guessed */
  if (c.items.length > 1) missing.push('the route has ' + c.items.length + ' products (' + c.items.join(', ') + '): its tickets cannot be counted per service');
  const rows = [];
  let unitCents = 0, perUnitOnly = true, costCents = 0;
  for (const s of services) {
    const mine = usable.filter((x) => (x.service || 'Service') === s);
    const per = mine.filter((x) => x.model === 'PER_UNIT'), flat = mine.filter((x) => x.model === 'FLAT');
    const rates = [...new Set(per.map((x) => toCents(x.rate)))];
    if (per.length && !flat.length && rates.length === 1) {
      /* the 004 Rate USD × the tickets booked, rounded once (never a rounded rate multiplied) */
      const cost = toCents(per[0].rate * tickets);
      per.forEach((x) => used.add(x)); unitCents += rates[0]; costCents += cost;
      rows.push({ service: s, rows: per.map((x) => x.row), basis: 'per ticket', unit: amt(rates[0]), tickets, cost: amt(cost) });
    } else if (flat.length === 1 && !per.length) {
      /* a vehicle or one booking: its Budget USD as stated, once — never × the guests carried (Owners, 17 Nov 2026) */
      used.add(flat[0]); perUnitOnly = false; costCents += flat[0].budget.cents;
      rows.push({ service: s, rows: [flat[0].row], basis: 'the whole vehicle or booking, as stated', unit: null, tickets, cost: flat[0].budget });
    } else {
      perUnitOnly = false;
      const what = c.kind === 'SERVICE' ? c.id + (c.place && c.place !== c.id ? ' ("' + c.place + '")' : '') : 'the guests\' ' + s.toLowerCase();
      rows.push({ service: s, rows: mine.map((x) => x.row), basis: null, unit: null, tickets, cost: null });
      missing.push(!mine.length ? 'no approved supplier cost for ' + what + ' in 004'
        : 'budget rows ' + mine.map((x) => x.row).join(', ') + ' give more than one cost for ' + what);
    }
  }
  for (const g of guest) if (g.paidByHS) missing.push((g.personName || g.person) + ': booked and paid by H&S — what H&S paid is not stated in Google (009 ' + (g.rate009 && g.rate009.row ? 'row ' + g.rate009.row : 'row not identifiable') + ')');
  return { services: rows, missing, used, assumptions, tickets, costCents: missing.length ? null : costCents, unitCents: perUnitOnly ? unitCents : null,
    coverage: { covered: rows.filter((r) => r.cost).length, total: rows.length, unit: 'service' } };
}

/* -------------------------------------------------------------- suppliers */

function suppliersOf(vendors, centres, perCentre004, asOf, built, unassigned) {
  const out = [];
  const byId = new Map(asArray(built).map((c) => [c.id, c]));
  for (const v of asArray(vendors && vendors.vendors)) {
    const map = VENDORS.find((m) => m.vendor.test(clean(v.vendor)));
    const stages = map ? map.stages.filter((s) => centres.has(s)) : [];
    const typedTotals = CURRENCIES.filter((c) => v.total[c] && v.total[c].typed === true);
    const contract = typedTotals.length === 1 ? amt(toCents(v.total[typedTotals[0]].value), typedTotals[0]) : null;
    const converted = CURRENCIES.filter((c) => v.total[c] && v.total[c].typed === false).map((c) => ({ currency: c, formula: v.total[c].formula }));
    const typedDeposit = CURRENCIES.filter((c) => v.deposit[c] && v.deposit[c].typed === true);
    const payments = v.payments.map((p) => {
      const why = p.typed !== true ? (p.typed === false ? 'computed by the sheet, not typed' : 'not known to be typed')
        : !p.currency ? p.currencyBasis : !p.date ? 'no readable payment date' : p.date > asOf ? 'dated ' + p.dateText + ', after today — not counted as paid' : null;
      return { block: p.block, cell: p.cell, amount: p.currency ? amt(toCents(p.amount), p.currency) : null, amountText: p.amountText, currencyBasis: p.currencyBasis,
        date: p.date, dateText: p.dateText, by: p.by, method: p.method, counted: !why, why };
    });
    const lines004 = stages.flatMap((s) => perCentre004.get(s) || []).filter((x) => x.role === 'SUPPLIER_COST');
    const planned004 = sumCents(lines004.map((x) => x.budget.cents));
    /* OUTSTANDING (1.1.0): the typed total less the payments counted — stated only when EVERY payment 007 records for this
       supplier counts and every cell of its column is read; a payment above the total is said as such, never a negative
       balance. Never a figure 007 does not give: no conversion, no payment moved, no date corrected. */
    const unreadRows = [...new Set(asArray(vendors && vendors.unread).filter((u) => asArray(u.cells).some((x) => x.col === v.col)).map((u) => u.row))].sort((a, b) => a - b);
    const notCountedP = payments.filter((p) => !p.counted);
    let outstanding = null, outstandingWhy = null, paidAbove = null;
    if (!contract) outstandingWhy = typedTotals.length > 1 ? 'typed in ' + typedTotals.join(' and ') + ' — no single total' : 'no typed contract total';
    else if (unreadRows.length) outstandingWhy = '007 row' + (unreadRows.length === 1 ? ' ' : 's ') + unreadRows.join(', ') + ' of its column ' + (unreadRows.length === 1 ? 'is' : 'are') + ' not read';
    else if (notCountedP.length) outstandingWhy = 'payment' + (notCountedP.length === 1 ? ' ' : 's ') + notCountedP.map((p) => p.cell).join(', ') + ' recorded in 007 but not counted (' + [...new Set(notCountedP.map((p) => p.why))].join('; ') + ')';
    else if (payments.some((p) => p.amount && p.amount.currency !== contract.currency)) outstandingWhy = 'a payment is in another currency than the total — never converted';
    else {
      const rest = contract.cents - sumCents(payments.map((p) => p.amount.cents));
      if (rest >= 0) outstanding = amt(rest, contract.currency); else paidAbove = amt(-rest, contract.currency);
    }
    /* what the 007 total cannot be read against (1.1.0): the nights of its stays no approved 004 line covers, the lines possibly
       counted twice, and its stays' 004 lines that fit no single stay — beside the difference, never its explanation */
    const stays = stages.map((s) => byId.get(s)).filter((c) => c && c.kind === 'STAY').map((c) => ({ stage: c.id, uncovered: c.uncovered || [] }));
    const dup = stages.map((s) => byId.get(s)).filter(Boolean).map((c) => c.possibleDuplicates).filter(Boolean);
    const dupRows = dup.flatMap((d) => d.rows), dupPartly = dup.flatMap((d) => d.partlyRows);
    const ruleIds = new Set(RULES.filter((r) => r.stages.some((s) => stages.includes(s))).map((r) => r.id));
    const notPlaced = asArray(unassigned).filter((u) => u.rule && ruleIds.has(u.rule) && u.role === 'SUPPLIER_COST').map((u) => ({ row: u.row, why: u.why }));
    out.push({ vendor: v.vendor, column: v.col, category: v.category, stages, ...(map && map.coversAll ? { coversAll: map.coversAll } : {}),
      contract, contractNote: typedTotals.length > 1 ? 'typed in ' + typedTotals.join(' and ') : (!typedTotals.length ? (converted.length ? 'only figures the sheet converts — no typed total' : 'no total') : null),
      converted, depositPct: v.depositPct, deposit: typedDeposit.length === 1 ? amt(toCents(v.deposit[typedDeposit[0]].value), typedDeposit[0]) : null,
      payments, paidCounted: CURRENCIES.map((c) => amt(sumCents(payments.filter((p) => p.counted && p.amount && p.amount.currency === c).map((p) => p.amount.cents)), c)).filter((m) => m && m.cents),
      notCounted: CURRENCIES.map((c) => amt(sumCents(notCountedP.filter((p) => p.amount && p.amount.currency === c).map((p) => p.amount.cents)), c)).filter((m) => m && m.cents),
      outstanding, outstandingWhy, paidAbove,
      planned004: lines004.length ? amt(planned004) : null, planned004Rows: lines004.map((x) => x.row),
      contractVsPlan: contract && contract.currency === 'USD' && lines004.length ? amt(contract.cents - planned004) : null,
      stays, possibleDuplicates: dupRows.length || dupPartly.length ? { rows: dupRows, amount: dupRows.length ? amt(sumCents(dup.map((d) => (d.amount ? d.amount.cents : 0)))) : null, partlyRows: dupPartly } : null,
      notPlaced });
  }
  return out;
}

/* ----------------------------------------------------------- the rooming */

function roomingCheck(c, guest, items, rooms) {
  if (!rooms || !rooms.units) return [{ severity: 'data', text: 'The rooming list (Rooms engine) could not be read just now — rooms not checked for ' + c.id }];
  const out = [];
  const keys = new Set(c.items.map((id) => clean(items[id] && items[id].Site_Product_Key).split(/[,|]/)[0]).filter((k) => k.includes('/')));
  const booked = new Set();
  for (const g of guest) {
    if (!g.unit) continue;
    const key = clean(items[g.item] && items[g.item].Site_Product_Key).split(/[,|]/)[0];
    const unit = asArray(rooms.units[key]).find((u) => clean(u.label) === clean(g.unitLabel));
    const held = unit ? asArray(unit.occupants).map((o) => clean(o.guestId)) : [];
    booked.add(key + '|' + g.person);
    if (!unit) out.push({ severity: 'data', text: (g.personName || g.person) + ' is billed in room ' + g.unitLabel + ' (' + g.itemName + '), which the rooming list does not have' });
    else if (g.person && !held.includes(g.person)) {
      const where = asArray(rooms.units[key]).filter((u) => asArray(u.occupants).some((o) => clean(o.guestId) === g.person)).map((u) => u.label);
      /* THE OWNERS' ASSIGNMENT (18 Nov 2026): a guest the Owners moved from the billed room to another room of the same category is the
         same booking — said as such; the booking, its billed room and its amounts are unchanged */
      const placed = asArray(rooms.units[key]).find((u) => asArray(u.occupants).some((o) => clean(o.guestId) === g.person && asArray(o.placedFrom).map(clean).includes(clean(g.unitLabel))));
      if (placed) out.push({ severity: 'info', text: (g.personName || g.person) + ' is billed in room ' + g.unitLabel + ' (' + g.itemName + '); the Owners placed them in room ' + placed.label + ' of the same category — the booking and its amounts are unchanged' });
      else out.push({ severity: 'data', text: (g.personName || g.person) + ' is billed in room ' + g.unitLabel + ' (' + g.itemName + '); the rooming list holds them ' + (where.length ? 'in room ' + where.join(', ') : 'in no room of it') });
    }
  }
  for (const k of keys) for (const u of asArray(rooms.units[k])) for (const o of asArray(u.occupants)) {
    const gid = clean(o.guestId);
    if (!gid || gid.startsWith('~')) { out.push({ severity: 'info', text: 'Room ' + u.label + ' (' + k.split('/')[1] + '): a place held for a party, no guest named yet' }); continue; }
    if (!booked.has(k + '|' + gid)) out.push({ severity: 'info', text: 'Room ' + u.label + ' (' + k.split('/')[1] + '): the rooming list holds ' + gid + ', no counted booking of this stay bills them' });
  }
  return out;
}

/* ===================================================================== build */

/**
 * The comparison. Inputs (all already read; nothing here reads or writes):
 *   asOf, booked (the overview's non-enumerable `bookedLines`), items (the engine's 002 read), display (002 display rows,
 *   parseItemDisplay), budget (parseBudget004), vendors (parseVendors007), rates009 (parseSpecialRateRows),
 *   names ({ persons, holders } or null), rooms (the Rooms engine plan or null), quota (the overview's quotaUtilisation),
 *   bookedRevenue (the overview KPI), receipts ({ cashCollected, refundDue, paymentsReported } — the overview's own),
 *   unresolved (holders the overview could not read), readProblems (what the reads could not get).
 */
/* THE FINANCIAL DASHBOARD (Owners, 17 Nov 2026) — derived, nothing written to Google:
   · COSTS from 004 (gross: its positive lines, every row, never reduced by revenue); the CURRENT FORECAST adds to them what the
     bookings cost at the agreement's hotel and 004 does not hold yet (the Owners' order, 18 Nov 2026: hotelPurchaseOf — the agreement,
     the confirmed rooms' additional nights and additional-person charges; 004's own rows are never reduced or replaced); another
     supplier confirmed to cover its stays wholly (coversAll) still takes its 007 contract in place of its stays' 004 lines;
     COMMITTED and PAID from 007 as typed / counted, each currency apart;
   · REVENUE from the Revenue Report, paying guests only (the couple's own bookings are complimentary): INVOICED = the issued
     statements, EXPECTED TOTAL = the bookings as they stand (invoiced counted once), the rest named — not yet invoiced, revisions due;
   · POSITION: owner-funded = forecast − revenue (now: invoiced; projected: expected total); coverage = revenue ÷ forecast.
   A figure whose inputs are incomplete is null with its reason — never a partial total. */
const pct = (num, den) => (den > 0 && num != null ? Math.round((num / den) * 1000) / 10 : null);
function dashboardOf({ grossLines, suppliers, categories, revenue, couple, purchase, contractVendor }) {
  const cents = (m) => (m && Number.isFinite(m.cents) ? m.cents : null);
  const original = cents(grossLines);
  const isHotel = (v) => !!(contractVendor && contractVendor.vendor.test(clean(v)));
  /* the agreement's hotel: what its bookings cost and 004 does not hold (keyed on the agreement, never on a 007 column) */
  const hotel = contractVendor && purchase && purchase.available ? [{ vendor: (suppliers || []).map((s) => s.vendor).find(isHotel) || 'Souphattra Heritage', category: 'Accommodation', basis: 'BOOKINGS',
    stages: Object.keys(contractVendor.roomContract.rooms), rows: purchase.rows004.map((r) => r.row), planned004: amt(sumCents(purchase.rows004.map((r) => r.amount.cents))),
    bookingDerived: purchase.totals.total, notIn004: purchase.notIn004, pending: purchase.pending, difference: purchase.notIn004 }] : [];
  const adjustments = hotel.concat((suppliers || []).filter((s) => !isHotel(s.vendor) && s.coversAll && s.contract && s.contract.currency === 'USD' && s.planned004)
    .map((s) => ({ vendor: s.vendor, rows: s.planned004Rows, planned004: s.planned004, contract: s.contract, coversAll: s.coversAll,
      difference: amt(s.contract.cents - s.planned004.cents) })));
  const forecast = original == null ? null : original + adjustments.reduce((t, a) => t + a.difference.cents, 0);
  const perCur = (list) => CURRENCIES.map((cur) => amt(sumCents(list.filter((m) => m && m.currency === cur).map((m) => m.cents)), cur)).filter((m) => m && m.cents);
  const committed = perCur((suppliers || []).map((s) => s.contract));
  const paid = perCur((suppliers || []).flatMap((s) => s.payments.filter((p) => p.counted).map((p) => p.amount)));
  const R = revenue || {};
  const complete = !!(R.invoiced && R.invoiced.complete !== false && R.booked && R.booked.complete !== false);
  const invoiced = complete ? cents(R.invoiced) : null, expectedTotal = complete ? cents(R.booked) : null;
  /* a supplier's forecast adjustment belongs to the category whose stays it serves */
  const adjOf = (c) => adjustments.filter((a) => { const st = a.stages || ((suppliers || []).find((x) => x.vendor === a.vendor) || {}).stages || []; return st.some((x) => (c.centres || []).includes(x)); })
    .reduce((t, a) => t + a.difference.cents, 0);
  const rev = {
    complete, why: complete ? null : 'the Revenue Report is not complete just now — no position is stated on a partial figure',
    invoiced: amt(invoiced), expectedTotal: amt(expectedTotal),
    expectedNotYetInvoiced: complete ? amt(expectedTotal - invoiced) : null,
    notYetInvoiced: R.notYetInvoiced ? amt(cents(R.notYetInvoiced)) : null,
    revisionsDue: R.changedSinceIssue && R.invoicedNotBooked ? amt(cents(R.changedSinceIssue) - cents(R.invoicedNotBooked)) : null,
    byCategory: (categories || []).map((c) => ({ category: c.category, expected: c.contribution, planned004: c.planned,
      forecast: amt(c.planned.cents + adjOf(c)), contribution: amt(c.contribution.cents - c.planned.cents - adjOf(c)),
      plannedContributions004: c.plannedContributions })),
    couple: couple || null,
  };
  const position = forecast == null || !complete ? { stated: false, why: forecast == null ? '004 could not be read' : rev.why } : {
    stated: true,
    currentOwnerFunded: amt(forecast - invoiced), projectedOwnerFunded: amt(forecast - expectedTotal),
    coverageInvoiced: pct(invoiced, forecast), coverageProjected: pct(expectedTotal, forecast),
  };
  return {
    currency: 'USD', note: 'Costs are 004 as stated (gross); revenue offsets them only here, never inside 004. Other currencies are listed apart.',
    costs: { original: amt(original), forecast: amt(forecast), variance: forecast == null ? null : amt(forecast - original), adjustments,
      committed, paid, plannedContributions004: amt(sumCents((categories || []).map((c) => c.plannedContributions ? c.plannedContributions.cents : 0))),
      plannedContributionsNote: '004\'s planned guest contributions (its negative lines) are a plan only: the Revenue Report replaces them here and they are never counted twice' },
    revenue: rev, position,
  };
}

/* a room category's name from its site key ("wedstay/heritage-executive" → "Heritage Executive") — words only, for the room overview */
const SEED_NAME = (key) => clean(String(key).split('/')[1] || key).split('-').map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');

export function buildBudgetComparison(input) {
  const src = input && typeof input === 'object' ? input : {};
  const asOf = clean(src.asOf).slice(0, 10);
  /* without the budget lines (004) or the stays and routes they meet (002 display rows) there is nothing to set side by
     side: the comparison says so — it never shows a supplier side of nothing as a cost of 0 */
  const unread = [['004_Budget_Finance', src.budget], ['002_Accommodation_Details', src.display]].filter(([, x]) => !x || x.ok !== true);
  if (unread.length) {
    return { available: false, version: BUDGET_VERSION, mapVersion: BUDGET_MAP_VERSION, asOf,
      gap: unread.map(([t, x]) => t + ': ' + ((x && Array.isArray(x.problems) && x.problems.length ? x.problems.join('; ') : 'not read'))).join(' · ') };
  }
  const items = src.items && typeof src.items === 'object' ? src.items : {};
  const display = src.display && src.display.items ? src.display : { items: {} };
  const booked = src.booked || { holders: [], extraBedIds: [] };
  const { centres, byItem } = centresOf(items, display);
  const g = guestLines({ booked, items, display, byItem, names: src.names, rates009: src.rates009, asOf, rooms: src.rooms });
  const a = assign004(src.budget, centres, display);
  const checks = [], questions = [];
  const push = (severity, text, centre) => checks.push({ severity, text, centre: centre || null });

  /* ---- not every booking counted (review P0-1): a holder set aside names the stays / routes of its lines; an unreadable
     holder — or a booked figure incomplete for a reason no line shows — leaves EVERY stay and route without a difference ---- */
  const brIn = src.bookedRevenue || {};
  const unreadHolders = asArray(src.unresolved), lineless = g.excluded.filter((x) => !x.lines);
  const asideIds = new Set(g.excluded.map((x) => x.Holder_ID));
  const otherGaps = asArray(brIn.gaps).filter((x) => !x || !clean(x.Holder_ID) || !asideIds.has(clean(x.Holder_ID)));
  const unknownGap = unreadHolders.length > 0 || lineless.length > 0 || (brIn.complete === false && (!g.excluded.length || otherGaps.length > 0));
  const unknownWhy = unreadHolders.length ? 'not readable just now: ' + unreadHolders.map((x) => x.Holder_ID).join(', ')
    : lineless.length ? 'not counted, with no line to place: ' + lineless.map((x) => x.Holder_ID).join(', ') : 'the booked revenue is not complete just now';

  /* ---- each stay / route / service ---- */
  const out = [];
  for (const c of [...centres.values()].sort((x, y) => byText(x.from || '9', y.from || '9') || byText(x.id, y.id))) {
    const guest = g.perCentre.get(c.id) || [];
    const lines = a.perCentre.get(c.id) || [];
    const contribution = sumCents(guest.map((x) => x.amount.cents));
    const selfOnly = c.items.every((id) => /^GUEST_SELF_/.test(clean(items[id] && items[id].Billing_Category)));
    const base = { id: c.id, stage: c.stage, category: c.category, kind: c.kind, place: c.place, from: c.from, to: c.to, items: c.items,
      contribution: amt(contribution), lines004: lines, checks: c.checks.slice() };
    const planned = (w) => amt(sumCents(lines.filter((x) => x.role === 'SUPPLIER_COST' && (w ? x.whose === w : true)).map((x) => x.budget.cents)));
    base.planned = { all: planned(null), guest: planned('GUEST_SERVICE'), persons: planned('PERSON_NAMED'), unstated: planned('UNSTATED') };
    base.plannedContributions = amt(sumCents(lines.filter((x) => x.role === 'PLANNED_CONTRIBUTION').map((x) => -x.budget.cents)));
    if (!guest.length && selfOnly) {
      out.push({ ...base, status: 'OUTSIDE', why: 'guests book or pay the provider themselves (002) — nothing H&S bills, nothing compared', guest: [] });
      continue;
    }
    let r;
    if (c.kind === 'STAY') r = compareStay(c, guest, lines, { display, gapUnits: g.gapUnits });
    else r = compareRoute(c, guest, lines, { display });
    for (const x of g.excluded) if (x.centres.includes(c.id)) r.missing.push('the bookings of ' + x.Holder_ID + ' here are not counted (' + x.reason + ') — their contribution is missing');
    if (unknownGap) r.missing.push('not every booking is counted just now (' + unknownWhy + ') — no difference until it is');
    let costCents = null, known = null;
    if (c.kind === 'STAY') known = sumCents([...r.used].map((x) => x.budget.cents));
    else known = sumCents(r.services.filter((s) => s.cost).map((s) => s.cost.cents));
    const complete = r.missing.length === 0 && (c.kind !== 'STAY' || r.coverage.total > 0);
    if (complete) costCents = c.kind === 'STAY' ? known : r.costCents;
    const diff = complete && costCents != null ? contribution - costCents : null;
    /* "At cost" for tickets only where the guest's own unit charge equals the stated unit cost, line by line */
    let label = null, unequalAtZero = false;
    if (diff != null) {
      if (c.kind !== 'STAY' && r.unitCents != null) {
        const offs = guest.map((x) => (x.rate ? x.rate.cents - r.unitCents : null));
        if (diff === 0) { label = offs.every((o) => o === 0) ? 'AT_COST' : null; unequalAtZero = label === null; }
        else label = labelOf(diff, offs.every((o) => o != null && Math.abs(o) <= 1) ? guest.length : null);
      } else label = labelOf(diff, null);
    }
    const assumptions = [...r.assumptions].sort(byText);
    /* a room line inside a block of every room of the stay (1.1.0 · A-5): named on the line, never removed from a sum */
    const inside = c.kind === 'STAY' ? insideWholeHotel(c, lines, items).lines : [];
    for (const f of inside) { f.line.insideBlock = { rows: f.rows, nights: f.nights, wholly: f.wholly, ...(f.block ? { block: true } : {}) }; f.line.notes.push(insideWords(f)); }
    const whollyIn = inside.filter((f) => f.wholly);
    const centre = { ...base, status: complete ? 'COMPLETE' : 'NOT_COMPLETE', guest,
      rooms: r.rooms || null, notBooked: r.notBooked || null, services: r.services || null, tickets: r.tickets != null ? r.tickets : null,
      coverage: r.coverage, cost: complete ? amt(costCents) : null, known: amt(known), difference: amt(diff), label, labelText: label ? LABELS[label] : null,
      assumptions, missing: r.missing, usedRows: [...r.used].map((x) => x.row).sort((x, y) => x - y),
      uncovered: r.uncovered || null,
      possibleDuplicates: inside.length ? { rows: whollyIn.map((f) => f.line.row), amount: whollyIn.length ? amt(sumCents(whollyIn.map((f) => f.line.budget.cents))) : null,
        partlyRows: inside.filter((f) => !f.wholly).map((f) => f.line.row) } : null };
    if (unequalAtZero) centre.checks.push({ severity: 'data', text: 'The guests\' charges add up to the supplier cost, but their ticket prices differ from the 004 unit cost (' + (r.unitCents / 100).toFixed(2) + ') — not called "At cost"' });
    /* the persons a budget line names, against the guests billed for the same stay or route (A-2) — one check per line; a guest
       booked there at no charge is said so (never "paid twice"), and a line inside a whole-hotel block says that in the same check */
    const merged = new Set();
    for (const x of lines.filter((y) => y.whose === 'PERSON_NAMED')) {
      const scopeItems = Array.isArray(x.scope) ? x.scope : null;
      const firsts = new Map(guest.filter((y) => !scopeItems || scopeItems.includes(y.item)).map((y) => [norm(clean(y.personName).split(/\s+/)[0]), y]));
      const hits = x.names.map((n) => [n, firsts.get(norm(n))]).filter(([, h]) => h);
      if (hits.length) {
        const free = hits.every(([, h]) => h.amount.cents === 0);
        const said = hits.map(([, h]) => (h.personName || h.person) + ' (' + h.payer + ') is ' + (h.amount.cents === 0
          ? 'booked for ' + h.itemName + ' at no charge' + (h.rateSource === '009' ? ' (009 rate 0)' : h.rateSource === 'hosted (002)' ? ' (hosted, 002)' : '')
          : 'billed for ' + h.itemName));
        const f = inside.find((y) => y.line === x);
        if (f) merged.add(x);
        centre.checks.push({ severity: 'data', assumption: 'A-2', row: x.row, text: 'Budget row ' + x.row + ' budgets ' + hits.map(([n]) => n).join(' & ') + '\'s own ' + (c.kind === 'STAY' ? 'place' : 'ticket') + ' as a host cost; ' +
          said.join('; ') + (free ? ' — what the hosts pay for it may be counted twice' : ' — possibly paid twice') + (f ? '; the line is ' + insideWords(f) : '') });
      }
      const sc = roomScopeOf(x.details);
      if (sc && !sc.all) {
        const inScopeItems = itemsNamed(c, sc.words, display);
        const others = guest.filter((y) => inScopeItems.includes(y.item) && !x.names.some((n) => norm(n) === norm(clean(y.personName).split(/\s+/)[0])));
        if (others.length) centre.checks.push({ severity: 'data', assumption: 'A-2', row: x.row, text: 'Budget row ' + x.row + ' names ' + x.names.join(' & ') + ' for ' + inScopeItems.map((id) => (display.items[id] || {}).name || id).join(', ') + '; billed there: ' + [...new Set(others.map((y) => (y.personName || y.person) + ' (' + y.payer + ')'))].join(', ') });
      }
    }
    /* every other room line inside a whole-hotel block: one check of its own (A-5) */
    for (const f of inside.filter((y) => !merged.has(y.line))) {
      centre.checks.push({ severity: 'data', assumption: 'A-5', row: f.line.row, text: 'Budget row ' + f.line.row + (f.block ? ' is ' : (f.wholly ? ' (USD ' + (f.line.budget.cents / 100).toFixed(2) + ')' : '') + ' budgets a room ') + insideWords(f) });
    }
    /* 004's planned guest contributions, per room category: the rate against 002, the rooms against the booked */
    for (const x of lines.filter((y) => y.role === 'PLANNED_CONTRIBUTION')) {
      const sc = Array.isArray(x.scope) ? x.scope : [];
      for (const id of sc) {
        const std = toCents(items[id] && items[id].Standard_Rate);
        const name = (display.items[id] || {}).name || id;
        if (std == null) centre.checks.push({ severity: 'info', text: 'Budget row ' + x.row + ' plans ' + name + ' at USD ' + Math.abs(x.rate).toFixed(2) + '; 002 states no Standard_Rate for it' });
        else if (std !== toCents(Math.abs(x.rate))) centre.checks.push({ severity: 'data', text: 'Budget row ' + x.row + ' plans ' + name + ' at USD ' + Math.abs(x.rate).toFixed(2) + ', 002 states USD ' + (std / 100).toFixed(2) });
      }
      if (!sc.length) centre.checks.push({ severity: 'data', text: 'Budget row ' + x.row + ' (a planned contribution) names no room category of this stay' });
    }
    /* a block that buys every room of the stay, against the rooms 002 offers for it (Quota) */
    if (c.kind === 'STAY') for (const x of [...r.used].filter((y) => y.model === 'ROOM_BLOCK' && y.scope === 'ALL')) {
      const rooms = c.items.filter((id) => clean(items[id] && items[id].Quota_Unit) === 'ROOM');
      const q = rooms.map((id) => Number(items[id].Quota));
      if (rooms.length && q.every((n) => Number.isFinite(n)) && sumCents(q) !== x.qty) {
        centre.checks.push({ severity: 'data', text: 'Budget row ' + x.row + ' holds ' + x.qty + ' rooms; the 002 quotas of this stay add up to ' + sumCents(q) + ' rooms' });
      }
    }
    if (c.kind === 'STAY') centre.checks.push(...roomingCheck(c, guest, items, src.rooms));
    out.push(centre);
  }

  /* THE ROOM OVERVIEW (Owners, 17 Nov 2026): every room of every stay as the Rooms engine holds it — its occupants (held, sent or
     confirmed alike), the extra bed's attribution, the 006 name — beside the confirmed lines above; read, never a second source */
  const roomPlan = out.filter((c) => c.kind === 'STAY').map((c) => {
    const keys = [...new Set(asArray(c.items).map((id) => clean(items[id] && items[id].Site_Product_Key).split(/[,|]/)[0]).filter((k) => k.includes('/')))];
    const persons = (src.names && src.names.persons) || {};
    return { stay: c.id, place: c.place, from: c.from, to: c.to, rooms: keys.flatMap((key) => asArray(src.rooms && src.rooms.units && src.rooms.units[key]).map((u) => ({
      key, label: u.label, name: u.name, type: (src.rooms.units[key] && SEED_NAME(key)) || key, places: u.places, extraBeds: u.extraBeds || 0, item: asArray(c.items).find((id) => clean(items[id] && items[id].Site_Product_Key).split(/[,|]/)[0] === key) || null,
      /* a place kept for a party (guest id "~…") is not a person; a room the Owners moved a guest to names the rooms they held before
         (placedFrom — the same booking, Owners' assignments, 18 Nov 2026) */
      occupants: asArray(u.occupants).map((o) => (o.guestId && !clean(o.guestId).startsWith('~') ? { guestId: o.guestId, name: persons[o.guestId] || clean(o.name) || null, bed: !!o.bed, ...(Array.isArray(o.placedFrom) && o.placedFrom.length ? { placedFrom: o.placedFrom.map(clean) } : {}) } : { kept: true })) }))) };
  });
  /* the hotel contracts' cost per room night by stay (budget-map VENDORS · roomContract) — the rate list's purchase side */
  const contractVendor = VENDORS.find((v) => v.roomContract) || null;
  const roomContracts = VENDORS.filter((v) => v.roomContract).flatMap((v) => Object.entries(v.roomContract.rooms).map(([stay, its]) =>
    ({ stay, items: its === '*' ? '*' : [...its], ratePerRoomNight: v.roomContract.ratePerRoomNight, source: v.coversAll })));
  /* THE HOTEL'S PURCHASE COST FROM THE BOOKINGS, BESIDE 004 (Owners' order, 18 Nov 2026 · src/billing/finance-report.js): before the
     suppliers and the dashboard, which take it; a failure names itself and leaves 004 as written */
  let purchase;
  try {
    purchase = contractVendor ? hotelPurchaseOf({ plan: roomPlan, roomContract: contractVendor.roomContract, contracts: roomContracts, lines004: src.budget && src.budget.lines,
      rule: RULES.find((r) => r.id === 'SOUPHATTRA') || null, centres: out, vendor: contractVendor.vendor }) : null;
  } catch (e) { purchase = { available: false, why: 'the hotel\'s purchase costs could not be set beside 004 just now', lines: [], rows004: [], proposals: [], included: [], corrections: [], checks: [], unsettled: [] }; }
  /* each room's hotel cost: the agreement's or the additional nights' purchase, the additional-person charge, the 004 row holding it */
  const byUnit = new Map(((purchase && purchase.lines) || []).map((l) => [l.id, l]));
  for (const s of roomPlan) {
    const k = roomContracts.find((x) => x.stay === s.stay), n = nightsBetween(s.from, s.to).length;
    for (const u of s.rooms) {
      const l = byUnit.get(unitId(s.stay, u));
      const covered = !!(k && (k.items === '*' || k.items.includes(u.item)));
      u.hotelCost = l ? (l.covered ? amt(l.cost.contract) : (l.cost.additional ? amt(l.cost.additional) : null)) : (covered && n ? amt(k.ratePerRoomNight * n * 100) : null);
      u.hotelCostBasis = l ? (l.covered ? 'CONTRACT' : l.cost.additional ? 'ADDITIONAL' : null) : (covered ? 'CONTRACT' : null);
      u.hotelSupplement = l && l.cost.supplement ? amt(l.cost.supplement) : null;
      u.hotelNights = l ? { contract: l.contractNights, additional: l.additionalNights } : null;
      u.hotelStatus = l ? l.status : null;
      u.hotelSupplementStatus = l ? l.supplementStatus : null;
      u.hotelIn004 = l ? { contract: l.rows.contract, additional: l.rows.additional, supplement: l.rows.supplement,
        open: Math.max(0, (l.cost.contract || 0) - l.recorded.contract) + (l.status === 'CONFIRMED' ? Math.max(0, (l.cost.additional || 0) - l.recorded.additional) : 0) +
          (l.supplementStatus === 'CONFIRMED' ? Math.max(0, (l.cost.supplement || 0) - l.recorded.supplement) : 0) } : null;
      u.room012 = null;
    }
  }
  /* a 004 row the reconciliation sets against the booked rooms is no longer "possibly counted twice" (the Owners' order, 18 Nov 2026):
     its A-5 note and its A-2 / A-5 checks give way to what it records — only for the hotel's rows that are wholly set, nothing else */
  if (purchase && purchase.available) {
    const set = new Map(purchase.rows004.filter((r) => ['CONTRACT', 'ADDITIONAL', 'SUPPLEMENT'].includes(r.role) && !r.rest).map((r) => [r.row, r]));
    const stays = new Set(roomContracts.map((k) => k.stay));
    for (const c of out.filter((x) => stays.has(x.id))) {
      for (const x of c.lines004.filter((y) => set.has(y.row))) { x.insideBlock = null; x.notes = asArray(x.notes).filter((t) => !/\(A-5\)/.test(t)); }
      const mine = [...set.values()].filter((r) => c.lines004.some((y) => y.row === r.row));
      /* only the "possibly counted twice" readings (A-2, A-5) of a row the reconciliation sets — every other check stays */
      c.checks = c.checks.filter((x) => !(x.assumption && mine.some((r) => r.row === x.row)));
      for (const r of mine) c.checks.push({ severity: 'info', text: 'Budget row ' + r.row + ' is set against the booked rooms: ' + (r.role === 'CONTRACT' ? 'the hotel agreement' : r.role === 'ADDITIONAL' ? 'additional room nights' : 'the additional-person charge') +
        ' — ' + r.rooms.length + ' room' + (r.rooms.length === 1 ? '' : 's') + ' (' + [...new Set(r.rooms.map((x) => x.stay))].join(', ') + '); not a duplicate (the Owners, 18 Nov 2026)' });
      if (c.possibleDuplicates) {
        const rows = c.possibleDuplicates.rows.filter((n) => !set.has(n)), partly = c.possibleDuplicates.partlyRows.filter((n) => !set.has(n));
        const lines = c.lines004.filter((y) => rows.includes(y.row));
        c.possibleDuplicates = rows.length || partly.length ? { rows, amount: rows.length ? amt(sumCents(lines.map((y) => y.budget.cents))) : null, partlyRows: partly } : null;
      }
    }
  }

  /* ---- the categories: complete and incomplete parts apart, never added to each other ---- */
  const order = (cat) => (norm(cat) === 'accommodation' ? 0 : norm(cat) === 'transportation' ? 1 : 2);
  const cats = [...new Set(out.map((c) => c.category))].sort((x, y) => order(x) - order(y) || byText(x, y));
  const suppliers = suppliersOf(src.vendors, centres, a.perCentre, asOf, out, a.unassigned);
  const categories = cats.map((cat) => {
    const mine = out.filter((c) => c.category === cat);
    const inCmp = mine.filter((c) => c.status !== 'OUTSIDE');
    const done = inCmp.filter((c) => c.status === 'COMPLETE'), open = inCmp.filter((c) => c.status === 'NOT_COMPLETE');
    const doneContribution = sumCents(done.map((c) => c.contribution.cents)), doneCost = sumCents(done.map((c) => c.cost.cents));
    const stages = new Set(mine.map((c) => c.id));
    const sup = suppliers.filter((s) => s.stages.some((x) => stages.has(x)));
    const perCurrency = (list) => CURRENCIES.map((cur) => amt(sumCents(list.filter((m) => m && m.currency === cur).map((m) => m.cents)), cur)).filter((m) => m && m.cents);
    const lines = mine.flatMap((c) => c.lines004);
    const differenceAvailable = inCmp.length > 0 && open.length === 0;
    const diff = differenceAvailable ? doneContribution - doneCost : null;
    /* the category's label follows its difference; "At cost" only when every one of its stays / routes is at cost */
    const catLabel = diff == null ? null
      : diff === 0 ? (done.every((c) => c.label === 'AT_COST') ? 'AT_COST' : null)
      : done.every((c) => c.label === 'AT_COST' || c.label === 'ROUNDING') ? 'ROUNDING' : labelOf(diff, null);
    return {
      category: cat, centres: mine.map((c) => c.id), billable: inCmp.length > 0,
      contribution: amt(sumCents(inCmp.map((c) => c.contribution.cents))),
      /* the complete stays / routes: contributions and supplier cost side by side — their differences stand on each stay or route
         alone; the category has one only when every stay / route of it is complete (never a partial, review P1-2) */
      complete: { centres: done.map((c) => c.id), contribution: amt(doneContribution), cost: done.length ? amt(doneCost) : null,
        assumptions: [...new Set(done.flatMap((c) => c.assumptions))].sort(byText) },
      notComplete: { centres: open.map((c) => c.id), contribution: amt(sumCents(open.map((c) => c.contribution.cents))), known: amt(sumCents(open.map((c) => c.known ? c.known.cents : 0))) },
      outside: mine.filter((c) => c.status === 'OUTSIDE').map((c) => c.id),
      differenceAvailable, difference: amt(diff), label: catLabel, labelText: catLabel ? LABELS[catLabel] : null,
      planned: amt(sumCents(lines.filter((x) => x.role === 'SUPPLIER_COST').map((x) => x.budget.cents))),
      plannedGuestServices: amt(sumCents(lines.filter((x) => x.role === 'SUPPLIER_COST' && x.whose === 'GUEST_SERVICE').map((x) => x.budget.cents))),
      plannedPersons: amt(sumCents(lines.filter((x) => x.role === 'SUPPLIER_COST' && x.whose === 'PERSON_NAMED').map((x) => x.budget.cents))),
      plannedUnstated: amt(sumCents(lines.filter((x) => x.role === 'SUPPLIER_COST' && x.whose === 'UNSTATED').map((x) => x.budget.cents))),
      plannedContributions: amt(sumCents(lines.filter((x) => x.role === 'PLANNED_CONTRIBUTION').map((x) => -x.budget.cents))),
      verified: perCurrency(sup.map((s) => s.contract)),
      paid: perCurrency(sup.flatMap((s) => s.payments.filter((p) => p.counted).map((p) => p.amount))),
      paidNotCounted: perCurrency(sup.flatMap((s) => s.payments.filter((p) => !p.counted && p.amount).map((p) => p.amount))),
      paid004: amt(sumCents(lines.filter((x) => x.paid).map((x) => x.paid.cents))),
      suppliers: sup.map((s) => s.vendor),
      /* 1.1.0: what is still owed to its suppliers — per currency, only where a supplier's figure is stated (a fully paid one
         counts as 0); the suppliers without one named — and the 004 lines possibly counted twice, never removed from a sum */
      /* never a partial sum: while one supplier's figure is not stated, the category states none (its suppliers named) */
      outstanding: sup.some((s) => !s.outstanding && !s.paidAbove) ? [] : CURRENCIES.filter((cur) => sup.some((s) => s.outstanding && s.outstanding.currency === cur))
        .map((cur) => amt(sumCents(sup.filter((s) => s.outstanding && s.outstanding.currency === cur).map((s) => s.outstanding.cents)), cur)),
      paidAbove: perCurrency(sup.map((s) => s.paidAbove)),
      outstandingNotStated: sup.filter((s) => !s.outstanding && !s.paidAbove).map((s) => s.vendor),
      possibleDuplicates: mine.some((c) => c.possibleDuplicates) ? (() => {
        const d = mine.map((c) => c.possibleDuplicates).filter(Boolean), rows = d.flatMap((x) => x.rows);
        return { rows, amount: rows.length ? amt(sumCents(d.map((x) => (x.amount ? x.amount.cents : 0)))) : null, partlyRows: d.flatMap((x) => x.partlyRows) };
      })() : null,
    };
  });

  /* ---- budget lines that buy no guest service, under their own 004 category ---- */
  const noGuest = new Map();
  for (const l of a.noGuest) { const k = l.category || '(no category)'; if (!noGuest.has(k)) noGuest.set(k, []); noGuest.get(k).push(l); }
  const noGuestService = [...noGuest].map(([category, lines]) => ({ category, lines, total: amt(sumCents(lines.filter((l) => l.role === 'SUPPLIER_COST').map((l) => l.budget.cents))) }))
    .sort((x, y) => byText(x.category, y.category));

  /* ---- inventory: quota (002), booked, the engine's own count; 004's planned rooms beside them ---- */
  const quota = new Map(asArray(src.quota).map((q) => [clean(q.Item_ID), q]));
  const inventory = [];
  for (const c of out) for (const id of c.items) {
    const it = items[id] || {}, d = display.items[id] || {}, q = quota.get(id);
    const unit = clean(it.Quota_Unit) || null;
    const qn = Number.isFinite(Number(it.Quota)) && clean(it.Quota) !== '' ? Number(it.Quota) : null;
    const gl = (c.guest || []).filter((x) => x.item === id);
    if (!gl.length && qn == null && !q) continue;
    const booked = unit === 'ROOM' ? new Set(gl.map((x) => x.unit).filter(Boolean)).size : sumCents(gl.map((x) => x.quantity));
    const plannedLines = (c.lines004 || []).filter((x) => x.role === 'PLANNED_CONTRIBUTION' && Array.isArray(x.scope) && x.scope.includes(id));
    inventory.push({ Item_ID: id, name: d.name || id, centre: c.id, unit, quota: qn, booked, remaining: qn == null ? null : qn - booked,
      persons: new Set(gl.map((x) => x.person).filter(Boolean)).size,
      engineUsed: q ? q.used : null, engineRemaining: q ? q.remaining : null,
      planned004: plannedLines.length ? sumCents(plannedLines.map((x) => x.qty)) : null, plannedRows: plannedLines.map((x) => x.row),
      /* 002's own "Rooms available" — beside a stay's rooms, or where it differs from a stated quota; never for a seat or a place */
      roomsAvailable: d.roomsAvailable != null && d.roomsAvailable !== qn && (c.kind === 'STAY' || qn != null) ? d.roomsAvailable : null });
  }

  /* ---- reconciliation ---- */
  const contributions = sumCents(out.map((c) => c.contribution.cents)) + sumCents(g.unclassified.map((x) => x.amount.cents));
  const br = src.bookedRevenue || {};
  const bl = asArray(src.budget && src.budget.lines), rl = bl.filter((l) => l.readable);
  const T = (src.budget && src.budget.totals) || {};
  const cols004 = (src.budget && src.budget.columns) || {};
  /* the ONE closed range a SUM / SUMIF / SUMIFS summary formula adds, in the very column its check reads ($ and a sheet
     prefix allowed) — several ranges, another column or any other formula: null, nothing guessed (1.1.0) */
  const rangeIn = (formula, col) => {
    const f = clean(formula);
    if (!col || !/^=\s*(ABS\s*\(\s*)?(SUM|SUMIF|SUMIFS)\s*\(/i.test(f)) return null;
    const refs = [...f.matchAll(/(?:'[^']*'!|[A-Za-z0-9_.]+!)?\$?([A-Za-z]{1,3})\$?(\d+)\s*:\s*\$?([A-Za-z]{1,3})\$?(\d+)/g)];
    const keys = [...new Set(refs.map((m) => [m[1], m[2], m[3], m[4]].join('|').toUpperCase()))];
    if (keys.length !== 1) return null;
    const [c1, r1, c2, r2] = keys[0].split('|');
    return c1 === col && c2 === col ? { from: Math.min(+r1, +r2), to: Math.max(+r1, +r2) } : null;
  };
  /* a summary cell against its lines: the cell as stated, the lines' own sum beside it; where they differ, the rows outside the
     cell's formula range are named ONLY when they are exactly the difference (never a repair, never a recomputed cell) */
  const sheet = (k, keep, sign, field, what) => {
    if (T[k] == null) return null;
    const val = (l) => sign * (toCents(field === 'paid' ? l.paid : l.budget) || 0);
    const cents = sumCents(rl.filter(keep).map(val));
    const c = { what, cell: T[k + 'Cell'], sheet: amt(toCents(T[k])), lines: amt(cents), equal: toCents(T[k]) === cents, formula: T[k + 'Formula'] || null, range: null, outside: [], carries: null };
    if (!c.equal && c.formula) {
      const range = rangeIn(c.formula, cols004[field]);
      const outside = range ? rl.filter((l) => keep(l) && (l.row < range.from || l.row > range.to) && val(l) !== 0) : [];
      if (outside.length && sumCents(outside.map(val)) === cents - toCents(T[k])) { c.range = range; c.outside = outside.map((l) => ({ row: l.row, amount: amt(val(l)) })); }
    }
    return c;
  };
  const checks004 = [
    sheet('totalPlanned', () => true, 1, 'budget', 'every line'),
    sheet('grossCost', (l) => l.budget > 0, 1, 'budget', 'the positive lines'),
    sheet('guestContributions', (l) => l.budget < 0, -1, 'budget', 'the negative lines (planned guest contributions)'),
    sheet('amountPaid', () => true, 1, 'paid', '"Amount paid USD"'),
    sheet('netHostCost', () => true, 1, 'budget', 'the positive lines less the planned guest contributions'),
  ].filter(Boolean);
  /* a cell computed from other summary cells (J5 = A5 − G5) carries their difference — said, not counted as a second one */
  for (const c of checks004) if (!c.equal && c.formula && !c.range) {
    const refs = new Set([...c.formula.toUpperCase().matchAll(/(?<![:A-Z$])\$?([A-Z]{1,3})\$?(\d+)(?!\d|\s*:)/g)].map((m) => m[1] + m[2]));
    const carried = checks004.filter((o) => o !== c && !o.equal && refs.has(o.cell));
    const off = (o) => o.lines.cents - o.sheet.cents;
    /* said only when the cells it refers to differ by exactly its own difference (the rule the range naming keeps) */
    if (carried.length && sumCents(carried.map(off)) === off(c)) c.carries = carried.map((o) => o.cell);
  }
  /* 004's gross cost from its own readable lines (every positive line, whatever its summary cells say) — the dashboard's original */
  const grossLines = rl.length ? sumCents(rl.filter((l) => (toCents(l.budget) || 0) > 0).map((l) => toCents(l.budget) || 0)) : null;
  const reconciliation = {
    contributions: amt(contributions), grossLines: amt(grossLines), bookedRevenue: br && br.complete ? amt(br.cents) : null,
    contributionsEqualBooked: br && br.complete ? contributions === br.cents : null,
    unclassified: g.unclassified.map((x) => ({ item: x.item, person: x.person, amount: x.amount })),
    excluded: g.excluded,
    budget004: { lines: bl.length, readable: rl.length, unreadable: bl.filter((l) => !l.readable).map((l) => ({ row: l.row, why: l.problems.join(', ') })),
      checks: checks004,
      committed: T.committed == null ? null : amt(toCents(T.committed)),
      actualIsBudget: bl.filter((l) => l.actualIsBudget === true).length },
  };
  if (reconciliation.contributionsEqualBooked === false) push('blocking', 'The comparison\'s contributions (' + (contributions / 100).toFixed(2) + ') do not add up to the booked revenue (' + (br.cents / 100).toFixed(2) + ')');
  if (br && br.complete === false) push('blocking', 'The booked revenue is not complete just now — the comparison covers only the counted bookings');
  for (const x of asArray(src.unresolved)) push('blocking', 'Not readable just now: ' + x.Holder_ID + ' — its bookings are missing from every figure');
  for (const x of g.excluded) push('blocking', 'Not counted: ' + x.Holder_ID + ' — ' + x.reason);
  for (const x of g.unclassified) push('data', 'A booked line of ' + x.item + ' belongs to no stay or route of 002 (' + (x.amount ? (x.amount.cents / 100).toFixed(2) : '—') + ')');
  for (const c of reconciliation.budget004.checks) if (!c.equal) push('data', '004 ' + c.cell + ' states ' + (c.sheet.cents / 100).toFixed(2) + '; ' + c.what + ' add up to ' + (c.lines.cents / 100).toFixed(2) +
    (c.range ? ' — its formula sums rows ' + c.range.from + '–' + c.range.to + '; ' + (c.outside.length === 1 ? 'row ' : 'rows ') + c.outside.map((x) => x.row + ' (' + (x.amount.cents / 100).toFixed(2) + ')').join(', ') + (c.outside.length === 1 ? ' lies' : ' lie') + ' outside it' : '') +
    (c.carries ? ' — ' + c.cell + ' is ' + c.formula + ' and carries ' + c.carries.join(' and ') + '\'s difference' : ''));
  for (const u of reconciliation.budget004.unreadable) push('data', 'Budget row ' + u.row + ' is not readable: ' + u.why);
  if (reconciliation.budget004.actualIsBudget) push('info', '"Actual USD" repeats the Budget USD (a formula) on ' + reconciliation.budget004.actualIsBudget + ' budget rows — it is not an actual cost, and is never used as one');
  /* an unreadable line is said once (above); every other line no stay or route takes, with its reason */
  for (const u of a.unassigned) if (!/^not readable:/.test(u.why)) push('data', 'Budget row ' + u.row + ' (' + u.item + '): ' + u.why);
  for (const p of asArray(src.readProblems)) push('data', p);
  for (const p of asArray(src.display && src.display.problems)) push('data', p);
  for (const p of asArray(src.budget && src.budget.problems)) push('data', p);
  for (const p of asArray(src.vendors && src.vendors.problems)) push('data', p);
  for (const u of asArray(src.vendors && src.vendors.unread)) push('data', '007 row ' + u.row + (u.label ? ' ("' + u.label + '")' : '') + ' has no known label — cells ' + u.cells.map((x) => x.col + (x.vendor ? ' (' + x.vendor + ')' : '')).join(', ') + ' are not read');
  for (const k of asArray(src.vendors && src.vendors.constants)) push('info', '007 ' + k.cell + ' (' + k.value + ' per ' + k.currency + ') is the sheet\'s own exchange constant — not an approved reporting conversion; figures computed from it are never used');
  for (const s of suppliers) {
    for (const p of s.payments.filter((x) => !x.counted)) push('data', s.vendor + ', ' + p.cell + ' (' + (p.block || 'payment') + '): ' + p.why);
    /* the 007 total beside its stays' 004 lines (1.1.0): what 007 cannot say is said, the lines possibly counted twice are named —
       the difference is never split, explained by an inferred figure or adjusted (pricing guard condition 2) */
    /* the agreement's hotel: its rows are set against the booked rooms (the Owners' order, 18 Nov 2026) — the question is answered */
    const settled = purchase && purchase.available && !asArray(purchase.unsettled).length && contractVendor && contractVendor.vendor.test(clean(s.vendor));
    if (s.contractVsPlan && s.contractVsPlan.cents && !settled) {
      const ins = out.filter((c) => s.stages.includes(c.id)).flatMap((c) => c.lines004.filter((x) => x.insideBlock));
      push('data', s.vendor + ': the typed 007 total is USD ' + (s.contract.cents / 100).toFixed(2) + '; the 004 lines of its stays (rows ' + s.planned004Rows.join(', ') + ') add up to USD ' +
        (s.planned004.cents / 100).toFixed(2) + ' — 007 does not say what its total covers' +
        ins.filter((x) => !x.insideBlock.block).map((x) => { const r = (x.insideBlock.rows.length > 1 ? 'rows ' : 'row ') + x.insideBlock.rows.join(' and ');
          return '; row ' + x.row + (x.insideBlock.wholly ? ' (USD ' + (x.budget.cents / 100).toFixed(2) + ') lies inside ' + r + ' — possibly counted twice' : ' possibly inside ' + r); }).join('') +
        /* blocks of every room sharing a night: said once per set, never circularly (review, 17 Nov 2026) */
        [...new Map(ins.filter((x) => x.insideBlock.block).map((x) => { const rows = [...new Set([x.row, ...x.insideBlock.rows])].sort((p, q) => p - q);
          return [rows.join(','), { rows, nights: x.insideBlock.nights }]; })).values()]
          .map((b) => '; rows ' + b.rows.join(' and ') + ' are ' + (b.rows.length === 2 ? 'two' : b.rows.length) + ' blocks of every room on ' + b.nights.map(dmy).join(', ') + ' — which one is counted twice is not stated').join('') +
        (s.notPlaced.length ? '; 004 row' + (s.notPlaced.length === 1 ? ' ' : 's ') + s.notPlaced.map((x) => x.row).join(', ') + ' of its stays fit' + (s.notPlaced.length === 1 ? 's' : '') + ' no single stay and ' + (s.notPlaced.length === 1 ? 'is' : 'are') + ' not among them' : ''));
    }
  }
  for (const c of out) for (const x of c.checks) checks.push({ ...x, centre: c.id });
  for (const c of out) for (const m of (c.missing || [])) checks.push({ severity: 'blocking', text: m, centre: c.id });

  /* ---- the Owners' questions: what would complete the comparison ---- */
  for (const c of out.filter((x) => x.status === 'NOT_COMPLETE')) questions.push({ centre: c.id, text: c.place + (c.from ? ' (' + dmy(c.from) + (c.to && c.to !== c.from ? ' – ' + dmy(c.to) : '') + ')' : '') + ': ' + c.missing.join(' · ') });
  for (const c of out) for (const x of c.lines004.filter((y) => y.whose === 'UNSTATED' && y.role === 'SUPPLIER_COST')) questions.push({ centre: c.id, text: 'Budget row ' + x.row + ' (' + x.item + (x.details ? ' · ' + x.details : '') + '): whose place or service is it?' });
  for (const s of suppliers.filter((x) => x.stages.length && x.contract && !(contractVendor && contractVendor.roomContract && contractVendor.coversAll && contractVendor.vendor.test(clean(x.vendor))))) questions.push({ centre: s.stages.join(' + '), text: s.vendor + ': what does the typed 007 total of ' + s.contract.currency + ' ' + (s.contract.cents / 100).toFixed(2) + ' cover (rooms, nights, stays)? Google does not say.' });

  const used = new Set(out.flatMap((c) => c.assumptions || []));
  if (out.some((c) => c.lines004.some((x) => x.whose === 'PERSON_NAMED'))) used.add('A-2');
  if (out.some((c) => c.lines004.some((x) => x.insideBlock))) used.add('A-5');
  const rank = { blocking: 0, data: 1, info: 2 };
  const dashboard = dashboardOf({ grossLines: reconciliation.grossLines, suppliers, categories, revenue: src.revenue || null, couple: src.couple || null, purchase, contractVendor });
  /* THE FINANCE REPORT (Owners' review, 18 Nov 2026) — beside everything above, never changing it; a failure names itself */
  let report;
  try {
    report = financeReportOf({ budget: src.budget, suppliers, centres: out, plan: roomPlan, contracts: roomContracts,
      roomContractMeta: contractVendor ? contractVendor.roomContract : null, dashboard, rates009: src.rates009, revenue: src.revenue || null,
      receipts: src.receipts || null, fx: src.fx || null, list012: src.roomList012 || null, purchase, vendor: contractVendor ? contractVendor.vendor : null });
    /* each room carries its 012 room number — a reference only (012 is a historical template): a certain match, never a "verify" */
    for (const s of roomPlan) for (const u of s.rooms) { const m = report.rooms012.units[unitId(s.stay, u)]; u.room012 = m && m.status === 'OK' ? { roomNo: m.roomNo, status: 'OK', reference: true } : null; }
  } catch (e) { report = { version: null, error: 'the finance report could not be built just now' }; }
  return {
    available: true, version: BUDGET_VERSION, mapVersion: BUDGET_MAP_VERSION, asOf, dashboard, report,
    /* Google 012 (the Owners' room number and rate list), parsed for reconciliation only — never a source of any figure */
    roomList012: src.roomList012 || null,
    roomPlan, roomContracts,
    currencies: 'Amounts keep their own currency; a USD equivalent at the Owners\' reporting reference rates (1 USD = 33.68 THB · 1 USD = 0.89 EUR) is shown beside them, labelled — statements keep the rates they were issued with (011).',
    categories, centres: out, suppliers, noGuestService, inventory,
    checks: checks.sort((x, y) => rank[x.severity] - rank[y.severity]),
    questions, assumptions: [...used].sort(byText).map((id) => ({ id, text: ASSUMPTIONS[id] })),
    receipts: src.receipts || null, reconciliation,
  };
}
