/* ============================================================================
   THE FINANCE REPORT (Owners' review, 18 Nov 2026) — src/billing/budget.js calls it beside the comparison it already builds.

   Pure: it reads only what the comparison has read (004, 007, 009, 012, the Rooms engine's room plan, the Revenue Report's
   figures) and derives the report the console arranges — nothing here writes, books, invoices or prices anything, and no
   figure of the comparison or of the dashboard changes because of it.

     · approved      — 004's own TOTAL BUDGET (the approved budget, incl. its reserve), beside the planned lines and the forecast
     · byCategory    — 004 planned per category · forecast · 007 committed and paid (in their own currencies) · variance
     · cash          — supplier payments made, guest receipts still to come, and what the Owners still provide (USD; payments in
                       another currency are named, never converted without an approved reporting rate)
     · hotel         — per hotel and period: rooms the contract buys, rooms occupied, hotel cost (purchase), guest revenue (sale),
                       surplus — a cost only where a contract states it, never estimated
     · rooms012      — Google 012 (read only) matched to the rooms by their guests' names, for the room number; every
                       uncertain match says "verify", a tie or a missing row gives no number
     · exceptions    — the Owners' decisions, data gaps and differences, each named with its source

   A figure whose inputs are incomplete carries complete:false and its named gaps — never a silent partial total.
   ========================================================================== */
import { SUPPLIER_CATEGORY } from './budget-map.js';
import { BILLING_ADMINS } from './admin.js';
import { parseDate } from './budget-source.js';

export const REPORT_VERSION = 'finance-report/1.0.0';
const COUPLE = new Set(BILLING_ADMINS.map((a) => a.guestId));
const clean = (v) => String(v == null ? '' : v).trim();
const asArray = (v) => (Array.isArray(v) ? v : []);
const amt = (cents, currency) => (cents == null || !Number.isFinite(cents) ? null : { currency: currency || 'USD', cents: Math.round(cents), amount: Math.round(cents) / 100 });
const sum = (xs) => xs.reduce((t, x) => t + x, 0);
const dmy = (iso) => (iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4) : '');
const usdText = (c) => 'USD ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nightsOf = (from, to) => { const a = Date.parse(from), b = Date.parse(to); return a && b && b > a ? Math.round((b - a) / 86400000) : null; };
const CURRENCIES = ['USD', 'THB', 'EUR'];
const perCurrency = (list) => CURRENCIES.map((cur) => amt(sum(list.filter((m) => m && m.currency === cur).map((m) => m.cents)), cur)).filter((m) => m && m.cents);

/* ------------------------------------------------------------------ 012 */

/** A room type as both sides write it: "The Heritage" = "Heritage", "Heritage Executive (Twin)" = "Heritage Executive",
    "Grand Majestic Suite" = "Grand Majestic". Equality after this, never a prefix. */
export const roomTypeKey = (t) => clean(t).toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/^the\s+/, '').replace(/\bsuite\b/g, ' ').replace(/\s+/g, ' ').trim();
const FILLER = new Set(['and', 'mr', 'mrs', 'ms', 'miss', 'dr', 'khun', 'the']);
const tokens = (n) => clean(n).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter((t) => t.length >= 2 && !FILLER.has(t));
const commonPrefix = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const alike = (a, b) => (Math.min(a.length, b.length) >= 3 && (a.startsWith(b) || b.startsWith(a))) || commonPrefix(a, b) >= 5;
/** How a 012 name (usually a first name) fits a guest's full name: 'EXACT' when the first names are the same; 'SIMILAR' when one
    starts the other (≥ 3 letters, a nickname), they share ≥ 5 first letters (a spelling) or only a later word (a surname) is the
    same; else null. */
export function nameLikeness(name012, guestName) {
  const A = tokens(name012), B = tokens(guestName);
  if (!A.length || !B.length) return null;
  if (A[0] === B[0]) {
    /* the same first name: a surname written on both sides must agree too — another surname is another person */
    if (A.length > 1 && B.length > 1) {
      if (A.slice(1).some((a) => B.slice(1).includes(a))) return 'EXACT';
      return A.slice(1).some((a) => B.slice(1).some((b) => alike(a, b))) ? 'SIMILAR' : null;
    }
    return 'EXACT';
  }
  if (alike(A[0], B[0])) return 'SIMILAR';
  if (A.length > 1 && A.slice(1).some((a) => B.slice(1).includes(a))) return 'SIMILAR';
  return null;
}
export const unitId = (stay, u) => stay + '|' + u.key + '|' + u.label;
/** 012 dates as written there: DD.MM.YYYY, D/M/YYYY or YYYY-MM-DD (or a sheet serial). '' → null; anything else → 'BAD'. */
function date012(v) {
  const t = clean(v);
  if (!t) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (iso) return parseDate(iso[3] + '.' + iso[2] + '.' + iso[1]) || 'BAD';
  const sl = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const d = parseDate(sl ? sl[1] + '.' + sl[2] + '.' + sl[3] : /^\d+(\.\d+)?$/.test(t) && !t.includes('.') ? Number(t) : t);
  return d || 'BAD';
}
/** The guests of a 012 row set against the room's occupants one to one (a guest counts once): { matched, exact, similar } */
function pairNames(names012, occ) {
  const free = occ.slice(); let matched = 0, exact = 0, similar = 0;
  for (const g of names012) {
    let best = null, bi = -1;
    free.forEach((o, i) => { const l = nameLikeness(g, o.name); if (l === 'EXACT' && best !== 'EXACT') { best = l; bi = i; } else if (l && !best) { best = l; bi = i; } });
    if (bi >= 0) { free.splice(bi, 1); matched++; if (best === 'EXACT') exact++; else similar++; }
  }
  return { matched, exact, similar };
}

/**
 * 012 beside the room plan. Per stay, each room with guests is paired with the 012 row of the same room type whose dates
 * overlap the stay (a row without a readable date may pair, marked "verify") and whose guests are the room's own, set one to one;
 * a row that lists exactly the room's guests ranks first, then the most guests matched, then exact names; one row per room per
 * stay; an equal rival (two rows or two rooms) gives no number at all and leaves the contested row to nobody.
 * Returns { available, units: { [unitId]: { roomNo, roomType, building, checkIn, checkOut, row, status, verify[] } },
 *           ambiguous[], notIn012[], notBooked[], free[], dates[] }.
 */
export function match012(plan, list) {
  const out = { available: Array.isArray(list), units: {}, ambiguous: [], notIn012: [], notBooked: [], free: [], dates: [] };
  if (!Array.isArray(list)) return out;
  const rows = list.map((r) => ({ ...r, ci: date012(r.checkIn), co: date012(r.checkOut), guests: asArray(r.guests).map(clean).filter(Boolean) }));
  const day = (d) => (d && d !== 'BAD' ? d : null);
  const matchedRows = new Map();   /* row → the stays' units paired with it */
  /* 012 lists one hotel's rooms: a room type it never names (another hotel) is outside it, not missing from it */
  const types012 = new Set(rows.map((r) => roomTypeKey(r.roomType)));
  for (const s of asArray(plan)) {
    const units = asArray(s.rooms).filter((u) => asArray(u.occupants).some((o) => o && o.guestId) && types012.has(roomTypeKey(u.type)));
    const pairs = [];
    for (const u of units) {
      const occ = u.occupants.filter((o) => o && o.guestId);
      for (const r of rows) {
        if (!r.guests.length || roomTypeKey(r.roomType) !== roomTypeKey(u.type)) continue;
        const ci = day(r.ci), co = day(r.co);
        if ((ci && !(ci < s.to)) || (co && !(co > s.from))) continue;   /* outside the stay by whichever date 012 gives */
        const m = pairNames(r.guests, occ);
        if (!m.matched) continue;
        const whole = m.matched === r.guests.length && m.matched === occ.length;
        pairs.push({ u, r, whole, score: m.matched, exact: m.exact, similar: m.similar > 0, ci, co });
      }
    }
    const rank = (p) => [Number(p.whole), p.score, p.exact];
    const cmp = (a, b) => { const x = rank(a), y = rank(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return y[i] - x[i]; return 0; };
    pairs.sort(cmp);
    const usedU = new Set(), usedR = new Set(), tied = new Set(), contested = new Set();
    for (const p of pairs) {
      if (usedU.has(p.u) || usedR.has(p.r) || tied.has(p.u) || contested.has(p.r)) continue;
      const rivals = pairs.filter((q) => q !== p && cmp(p, q) === 0 && !usedU.has(q.u) && !usedR.has(q.r) && (q.u === p.u || q.r === p.r));
      if (rivals.length) { tied.add(p.u); contested.add(p.r); for (const q of rivals) { tied.add(q.u); contested.add(q.r); } continue; }
      usedU.add(p.u); usedR.add(p.r);
      const verify = [];
      if (!p.whole) verify.push(p.score + ' of the ' + p.r.guests.length + ' name' + (p.r.guests.length === 1 ? '' : 's') + ' in 012 match; the room holds ' + p.u.occupants.filter((o) => o && o.guestId).length + ' guest' + (p.u.occupants.filter((o) => o && o.guestId).length === 1 ? '' : 's'));
      if (p.similar) verify.push('a name is spelt differently in 012');
      for (const [k, w] of [['ci', 'check-in'], ['co', 'check-out']]) {
        if (p.r[k] === 'BAD') verify.push('the 012 ' + w + ' date of room ' + p.r.roomNo + ' is not readable');
        else if (!p.r[k]) verify.push('012 has no ' + w + ' date for room ' + p.r.roomNo);
      }
      out.units[unitId(s.stay, p.u)] = { roomNo: p.r.roomNo, roomType: p.r.roomType, building: p.r.building || null, checkIn: p.ci, checkOut: p.co, row: p.r.row,
        status: verify.length ? 'VERIFY' : 'OK', verify };
      if (!matchedRows.has(p.r)) matchedRows.set(p.r, []);
      matchedRows.get(p.r).push({ stay: s.stay, from: s.from, to: s.to, label: p.u.label });
    }
    for (const u of units) {
      if (out.units[unitId(s.stay, u)]) continue;
      const entry = { stay: s.stay, place: s.place, label: u.label, type: u.type, guests: u.occupants.filter((o) => o && o.guestId).map((o) => o.name || o.guestId) };
      if (tied.has(u) || pairs.some((q) => q.u === u && contested.has(q.r))) out.ambiguous.push(entry); else out.notIn012.push(entry);
    }
  }
  /* the dates 012 gives a room beside the stays booked in it (a guest of 25.02 in 012 who books from 27.02 is a difference) */
  for (const [r, stays] of matchedRows) {
    const from = stays.map((x) => x.from).sort()[0], to = stays.map((x) => x.to).sort().slice(-1)[0];
    if (day(r.ci) && r.ci !== from) out.dates.push({ roomNo: r.roomNo, row: r.row, what: 'check-in', in012: r.ci, booked: from });
    if (day(r.co) && r.co !== to) out.dates.push({ roomNo: r.roomNo, row: r.row, what: 'check-out', in012: r.co, booked: to });
  }
  for (const r of rows) {
    if (r.guests.length && !matchedRows.has(r)) out.notBooked.push({ roomNo: r.roomNo, roomType: r.roomType, row: r.row, guests: r.guests });
    if (!r.guests.length) {
      const f = out.free.find((x) => x.roomType === roomTypeKey(r.roomType));
      if (f) f.roomNos.push(r.roomNo); else out.free.push({ roomType: roomTypeKey(r.roomType), label: r.roomType, roomNos: [r.roomNo] });
    }
  }
  return out;
}

/* ------------------------------------------------------------- the hotels */

/**
 * Per stay of the room plan: the rooms a hotel contract buys (roomContracts), the rooms occupied, the hotel's cost (rate per
 * room night × the stay's nights, every room the contract buys — occupied or not), the guests' revenue for its rooms (the
 * booked room lines of that stay) and the surplus. A room with guests no contract buys has no cost here: the stay's cost is
 * then incomplete and no surplus is stated.
 */
export function hotelPerformance({ plan, contracts, centres, suppliers, rooms012 }) {
  const byStay = new Map(asArray(centres).map((c) => [c.id, c]));
  return asArray(plan).map((s) => {
    const n = nightsOf(s.from, s.to);
    const k = asArray(contracts).find((x) => x.stay === s.stay) || null;
    const covered = (u) => !!(k && (k.items === '*' || asArray(k.items).includes(u.item)));
    const units = asArray(s.rooms);
    const occupied = units.filter((u) => asArray(u.occupants).some((o) => o && o.guestId));
    const bought = k ? units.filter(covered) : [];
    const cost = k && n ? bought.length * k.ratePerRoomNight * n * 100 : null;
    const uncontracted = occupied.filter((u) => !covered(u)).map((u) => ({ label: u.label, type: u.type, roomNo: (rooms012 && rooms012.units[unitId(s.stay, u)] || {}).roomNo || null,
      guests: u.occupants.filter((o) => o && o.guestId).length, nights: n }));
    const c = byStay.get(s.stay);
    const revenue = sum(asArray(c && c.rooms).flatMap((r) => asArray(r.lines)).map((l) => (l.amount ? l.amount.cents : 0)));
    const guests = sum(occupied.map((u) => u.occupants.filter((o) => o && o.guestId).length));
    const sup = asArray(suppliers).filter((x) => asArray(x.stages).includes(s.stay)).map((x) => ({ vendor: x.vendor, contract: x.contract, covers: x.coversAll || null }));
    const complete = !!(k && n && !uncontracted.length);
    return {
      stay: s.stay, place: s.place, from: s.from, to: s.to, nights: n, rate: k ? amt(k.ratePerRoomNight * 100) : null,
      roomsBought: k ? bought.length : null, roomsOccupied: occupied.length, guests,
      cost: amt(cost), costBasis: k ? 'AGREEMENT' : (sup.length ? 'SUPPLIER_TOTAL_UNSTATED' : 'NONE'), costComplete: complete, uncontracted,
      suppliers: sup, revenue: amt(revenue), surplus: complete ? amt(revenue - cost) : null,
      emptyBought: k ? bought.filter((u) => !occupied.includes(u)).length : null,
    };
  });
}

/* ------------------------------------------------------------- the report */

export function financeReportOf({ budget, suppliers, centres, plan, contracts, roomContractMeta, dashboard, rates009, revenue, receipts, fx, list012 }) {
  const D = dashboard || {}, C = D.costs || {};
  const T = (budget && budget.totals) || {};
  const forecast = C.forecast ? C.forecast.cents : null, planned = C.original ? C.original.cents : null;
  const approved = Number.isFinite(T.totalBudget) ? Math.round(T.totalBudget * 100) : null;
  const rooms012 = safe(() => match012(plan, list012), { available: false, units: {}, ambiguous: [], notIn012: [], notBooked: [], free: [], dates: [], error: 'not readable just now' });
  const hotel = safe(() => hotelPerformance({ plan, contracts, centres, suppliers, rooms012 }), []);
  const contractStays = new Set(asArray(contracts).map((x) => x.stay));

  /* ---- what the forecast does not hold yet: guest services without a supplier cost, rooms no contract buys ---- */
  const gaps = [];
  for (const h of hotel) if (contractStays.has(h.stay) && h.uncontracted.length) {
    gaps.push({ centre: h.stay, place: h.place, text: h.uncontracted.length + ' room' + (h.uncontracted.length === 1 ? '' : 's') + ' with guests the hotel agreement does not buy (' +
      h.uncontracted.map((u) => 'room ' + u.label + (u.roomNo ? ' · ' + u.roomNo : '')).join(', ') + ', ' + dmy(h.from) + ' – ' + dmy(h.to) + '): no hotel cost agreed' });
  }
  for (const c of asArray(centres)) if (!contractStays.has(c.id) && c.status === 'NOT_COMPLETE' && asArray(c.missing).length) gaps.push({ centre: c.id, place: c.place, text: asArray(c.missing).join(' · ') });

  /* ---- 004 planned, forecast, 007 committed and paid — per 004 category ---- */
  const byCategory = safe(() => {
    const lines = asArray(budget && budget.lines).filter((l) => l.readable !== false && Number.isFinite(l.budget) && l.budget > 0);
    const cats = new Map();
    const row = (name) => { if (!cats.has(name)) cats.set(name, { category: name, planned: 0, adjust: 0, committed: [], paid: [], suppliers: [] }); return cats.get(name); };
    for (const l of lines) row(l.category || '(no category)').planned += Math.round(l.budget * 100);
    const catOf = (vendor) => (SUPPLIER_CATEGORY.find((m) => m.vendor.test(clean(vendor))) || {}).category || null;
    for (const s of asArray(suppliers)) {
      const r = row(catOf(s.vendor) || 'Unassigned');
      r.suppliers.push(s.vendor);
      if (s.contract) r.committed.push(s.contract);
      for (const p of asArray(s.payments)) if (p.counted && p.amount) r.paid.push(p.amount);
    }
    for (const a of asArray(C.adjustments)) { const r = row(catOf(a.vendor) || 'Unassigned'); r.adjust += a.difference ? a.difference.cents : 0; }
    const list = [...cats.values()].map((r) => {
      const committed = perCurrency(r.committed), paid = perCurrency(r.paid);
      const usdCommitted = (committed.find((m) => m.currency === 'USD') || {}).cents || 0;
      return { category: r.category, planned: amt(r.planned), forecast: amt(r.planned + r.adjust), variance: amt(r.adjust), committed, paid, suppliers: r.suppliers,
        committedAboveForecast: usdCommitted > r.planned + r.adjust ? amt(usdCommitted - (r.planned + r.adjust)) : null };
    }).sort((a, b) => (a.category === 'Unassigned') - (b.category === 'Unassigned') || b.planned.cents - a.planned.cents);
    return list;
  }, []);
  const committedAll = perCurrency(asArray(suppliers).map((s) => s.contract).filter(Boolean));
  const paidAll = perCurrency(asArray(suppliers).flatMap((s) => asArray(s.payments).filter((p) => p.counted && p.amount).map((p) => p.amount)));

  /* ---- the cash still to move (USD; another currency is named, never converted) ---- */
  const R = revenue || {};
  const expected = R.booked && R.booked.complete !== false && Number.isFinite(R.booked.cents) ? R.booked.cents : null;
  const received = receipts && receipts.cashCollected && receipts.cashCollected.complete !== false && Number.isFinite(receipts.cashCollected.cents) ? receipts.cashCollected.cents : null;
  const paidUsd = (paidAll.find((m) => m.currency === 'USD') || {}).cents || 0;
  const paidOther = paidAll.filter((m) => m.currency !== 'USD');
  const remainingSupplier = forecast == null ? null : forecast - paidUsd;
  const remainingGuests = expected == null || received == null ? null : expected - received;
  const indicative = fx && Number(fx.FX_USD_THB) > 0 ? { rate: Number(fx.FX_USD_THB), day: fx.day || null,
    paidOtherUsd: amt(sum(paidOther.filter((m) => m.currency === 'THB').map((m) => m.cents / Number(fx.FX_USD_THB)))),
    committedOtherUsd: amt(sum(committedAll.filter((m) => m.currency === 'THB').map((m) => m.cents / Number(fx.FX_USD_THB)))),
    words: 'indicative only — THB at USD/THB ' + fx.FX_USD_THB + ' (011, the day of the first issued statement' + (fx.day ? ', ' + dmy(fx.day) : '') + '); no reporting rate is approved, so it is never added to a figure' } : null;
  const cash = {
    paidToSuppliers: paidAll, remainingSupplierPaymentsUsd: amt(remainingSupplier), guestReceiptsToCome: amt(remainingGuests), received: amt(received), expected: amt(expected),
    ownerStillToProvide: remainingSupplier == null || remainingGuests == null ? null : amt(remainingSupplier - remainingGuests),
    complete: !!(remainingSupplier != null && remainingGuests != null && !paidOther.length && !gaps.length),
    why: [paidOther.length ? 'payments made in ' + paidOther.map((m) => m.currency + ' ' + (m.cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).join(' and ') + ' are not deducted (no approved reporting rate)' : null,
      gaps.length ? 'the forecast does not hold ' + gaps.length + ' cost' + (gaps.length === 1 ? '' : 's') + ' yet (see "Costs not yet in the forecast")' : null,
      remainingGuests == null ? 'the guest figures are not complete just now' : null].filter(Boolean),
    formula: 'forecast cost − supplier payments made in USD − (expected guest revenue − guest payments received)',
  };

  /* ---- the exceptions: decisions, data, differences ---- */
  const ex = [];
  const add = (kind, area, text, extra) => ex.push({ kind, area, text, ...(extra || {}) });
  /* each check on its own: one that cannot be made is named, the others stand */
  const check = (what, fn) => { try { fn(); } catch (e) { add('DATA', 'Report', 'The check of ' + what + ' could not be made just now.'); } };
  check('the agreement against 004', () => {
    for (const a of asArray(C.adjustments)) {
      const s = asArray(suppliers).find((x) => x.vendor === a.vendor) || {};
      const nights = asArray(s.stays).flatMap((st) => asArray(st.uncovered).filter((u) => !asArray(u.others).length).map((u) => dmy(u.night) + ' (' + st.stage + ')'));
      const dup = s.possibleDuplicates && asArray(s.possibleDuplicates.partlyRows).concat(asArray(s.possibleDuplicates.rows));
      add('DECISION', 'Budget 004', a.vendor + ': 004 rows ' + asArray(a.rows).join(', ') + ' plan ' + usdText(a.planned004.cents) + '; the agreement is ' + usdText(a.contract.cents) +
        '. The forecast uses the agreement (' + (a.difference.cents >= 0 ? '+' : '−') + usdText(Math.abs(a.difference.cents)) + '); 004 itself is unchanged' +
        (nights.length ? ' — it has no line for the night' + (nights.length === 1 ? ' ' : 's ') + nights.join(', ') : '') +
        (dup && dup.length ? '; 004 row' + (dup.length === 1 ? ' ' : 's ') + dup.join(', ') + ' may lie inside the agreement' : '') + '. Update 004?', { amount: a.difference });
      /* the agreement's own total against the rooms it buys at its rate (every room, every night of its stays) */
      const stays = new Set(asArray(contracts).map((k) => k.stay));
      const bought = sum(hotel.filter((h) => stays.has(h.stay) && h.cost).map((h) => h.cost.cents));
      if (bought && bought !== a.contract.cents) add('DATA', 'Hotel agreement', 'The rooms the agreement buys at its rate come to ' + usdText(bought) + ', its total is ' + usdText(a.contract.cents) + ' — the room plan and the agreement differ.');
    }
  });
  check('triple occupancy', () => {
    const sup = roomContractMeta && roomContractMeta.supplement;
    if (!sup) return;
    const over = [];
    for (const s of asArray(plan)) {
      const k = asArray(contracts).find((x) => x.stay === s.stay); if (!k) continue;
      const n = nightsOf(s.from, s.to);
      for (const u of asArray(s.rooms)) {
        if (!(k.items === '*' || asArray(k.items).includes(u.item))) continue;
        const occ = asArray(u.occupants).filter((o) => o && o.guestId).length;
        if (occ > u.places && n) over.push({ stay: s.stay, label: u.label, roomNo: (rooms012.units[unitId(s.stay, u)] || {}).roomNo || null, extra: occ - u.places, nights: n });
      }
    }
    if (!over.length) return;
    const cents = sum(over.map((o) => o.extra * o.nights * sup.perRoomNight * 100));
    add('DECISION', 'Hotel agreement', 'Triple occupancy: ' + over.map((o) => 'room ' + o.label + (o.roomNo ? ' (' + o.roomNo + ')' : '') + ' ' + o.stay + ', ' + o.nights + ' night' + (o.nights === 1 ? '' : 's')).join('; ') +
      ' — a third person each. The agreement states USD ' + sup.perRoomNight + ' net per room night for it: ' + usdText(cents) + ' if the hotel charges it. Not in 004 and not in the forecast until you confirm it.',
      { amount: amt(cents), ifAccepted: forecast == null ? null : amt(forecast + cents), source: sup.source });
  });
  check('rooms the agreement does not buy', () => {
    for (const h of hotel) if (contractStays.has(h.stay) && h.uncontracted.length) {
      add('DECISION', 'Hotel agreement', h.place + ' ' + dmy(h.from) + ' – ' + dmy(h.to) + ': ' + h.uncontracted.length + ' room' + (h.uncontracted.length === 1 ? '' : 's') + ' with guests (' +
        h.uncontracted.map((u) => u.roomNo || ('room ' + u.label)).join(', ') + ') are not bought by the agreement for these nights. Their hotel cost is not agreed — no figure is assumed; their guests\' payments are counted.');
    }
  });
  check('the currencies', () => {
    if (paidOther.length || committedAll.some((m) => m.currency !== 'USD')) {
      add('DECISION', 'Currency', '007 holds commitments and payments in THB (' + committedAll.filter((m) => m.currency !== 'USD').map((m) => m.currency + ' ' + (m.cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })).join(', ') +
        ' committed). They are shown in THB and never added to a USD figure: no reporting rate is approved.' + (indicative ? ' At the statements\' reference rate (' + indicative.rate + ') they would be about ' + usdText(indicative.committedOtherUsd.cents) + ' committed, ' + usdText(indicative.paidOtherUsd.cents) + ' paid.' : '') + ' Approve a reporting rate?');
    }
  });
  check('009', () => {
    if (!(rates009 && rates009.ok)) return;
    const rows = asArray(rates009.rows).filter((r) => COUPLE.has(clean(r.Person_ID)) && Number(String(r.Rate_Per_Person_Night).replace(/,/g, '')) > 0);
    if (rows.length) add('INFO', '009', '009 rows ' + rows.map((r) => r.row).join(', ') + ' still state a rate for the couple; the couple\'s own bookings are complimentary, so they are not charged. Set them to 0 on your order only.');
  });
  check('004', () => {
    for (const l of asArray(budget && budget.lines)) if (Number.isFinite(l.paid) && l.paid > 0) {
      const in007 = asArray(suppliers).some((s) => clean(s.vendor) && clean(l.vendor) && clean(s.vendor).toLowerCase() === clean(l.vendor).toLowerCase());
      add('DATA', 'Budget 004', '004 row ' + l.row + ' (' + l.item + (l.vendor ? ', ' + l.vendor : '') + ') records ' + usdText(Math.round(l.paid * 100)) + ' paid' + (l.payDateText ? ' on ' + l.payDateText : '') +
        (in007 ? ' — its supplier is in 007, where payments are counted.' : ' — not in 007; not counted as a supplier payment.'), { amount: amt(Math.round(l.paid * 100)) });
    }
    const unread = asArray(budget && budget.lines).filter((l) => l.readable === false);
    if (unread.length) add('DATA', 'Budget 004', '004 row' + (unread.length === 1 ? ' ' : 's ') + unread.map((l) => l.row).join(', ') + (unread.length === 1 ? ' is' : ' are') + ' not readable and not in any category above.');
    const catSum = sum(byCategory.filter((c) => c.planned).map((c) => c.planned.cents));
    if (planned != null && byCategory.length && catSum !== planned) add('DATA', 'Budget 004', 'The 004 categories add up to ' + usdText(catSum) + ', the planned lines to ' + usdText(planned) + '.');
  });
  check('012', () => {
    if (!rooms012.available) add('DATA', '012', 'Google 012 could not be read just now: no room numbers are shown.');
    for (const u of rooms012.notIn012) add('DATA', '012', u.place + ' · room ' + u.label + ' (' + u.type + ', ' + u.guests.join(', ') + '): booked, but not in 012.');
    for (const u of rooms012.ambiguous) add('DATA', '012', u.place + ' · room ' + u.label + ' (' + u.guests.join(', ') + '): more than one 012 row fits — no room number until 012 is clear.');
    for (const r of rooms012.notBooked) add('DATA', '012', '012 room ' + r.roomNo + ' (' + r.roomType + ') lists ' + r.guests.join(', ') + ' — no booked room matches.');
    for (const d of rooms012.dates) add('DATA', '012', '012 room ' + d.roomNo + ': ' + d.what + ' ' + dmy(d.in012) + ' in 012, ' + dmy(d.booked) + ' as booked.');
    const said = new Set();
    for (const u of Object.values(rooms012.units)) for (const v of u.verify.filter((x) => /date/.test(x))) if (!said.has(v)) { said.add(v); add('DATA', '012', v.charAt(0).toUpperCase() + v.slice(1) + '.'); }
  });
  check('costs not yet in the forecast', () => { for (const g of gaps.filter((x) => !contractStays.has(x.centre))) add('DATA', 'Costs not yet in the forecast', g.place + ': ' + g.text); });
  if (roomContractMeta && roomContractMeta.agreementDates) add('INFO', 'Hotel agreement', roomContractMeta.agreementDates);

  const approvedM = amt(approved);
  return {
    version: REPORT_VERSION,
    approved: approvedM ? { ...approvedM, cell: T.totalBudgetCell || null } : null,
    approvedWhy: approvedM ? null : '004 states no TOTAL BUDGET just now',
    planned: amt(planned), forecast: amt(forecast),
    forecastComplete: !gaps.length, forecastGaps: gaps,
    varianceToApproved: approved != null && forecast != null ? amt(forecast - approved) : null,
    plannedVsApproved: approved != null && planned != null ? amt(planned - approved) : null,
    budgetLeftSheet: Number.isFinite(T.budgetLeft) ? { ...amt(Math.round(T.budgetLeft * 100)), cell: T.budgetLeftCell || null } : null,
    committed: committedAll, paid: paidAll, byCategory, cash, indicative, hotel, rooms012,
    exceptions: ex,
  };
}

function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
