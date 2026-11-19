/* ============================================================================
   THE FINANCE REPORT (Owners' review, 18 Nov 2026) — src/billing/budget.js calls it beside the comparison it already builds.

   Pure: it reads only what the comparison has read (004, 007, 009, 012, the Rooms engine's room plan, the Revenue Report's
   figures) and derives the report the console arranges — nothing here writes, books, invoices or prices anything, and no
   figure of the comparison or of the dashboard changes because of it.

     · approved      — 004's own TOTAL BUDGET (the approved budget, incl. its reserve), beside the planned lines and the forecast
     · byCategory    — 004 planned per category · forecast · 007 committed and paid (in their own currencies) · variance
     · cash          — supplier payments made, guest receipts still to come, and what the Owners still provide (USD; an amount in
                       another currency keeps its own currency and is shown beside its USD equivalent at the Owners' reporting
                       reference rates — labelled, never a transaction rate)
     · purchase      — THE HOTEL'S PURCHASE COST FROM THE BOOKINGS (Owners' order, 18 Nov 2026): every booked room of the agreement's
                       hotel — the agreement's rooms, additional room nights, the additional-person charge — set beside 004 row by
                       row: what 004 already holds, what it does not (proposed additions, never written), text corrections
     · hotel         — per hotel and period: rooms bought, rooms occupied, hotel cost (purchase), guest revenue (sale), surplus —
                       a cost only where an agreement or an Owner-confirmed rate states it, never estimated
     · rooms012      — Google 012 (a historical template, read only) matched to the rooms by their guests' names: a REFERENCE room
                       number only, never required, never a source of any figure, never above the bookings
     · exceptions    — data gaps and differences, each named with its source

   The booking system decides what guests booked and owe; 004 holds the project's recorded costs; 009 never overrides a confirmed
   booking price (a note beside it is not a difference).

   A figure whose inputs are incomplete carries complete:false and its named gaps — never a silent partial total.
   ========================================================================== */
import { SUPPLIER_CATEGORY, REPORTING_FX, roomScopeOf, RULES, CHINA_STAGES, PASS_THROUGH } from './budget-map.js';
import { BILLING_ADMINS } from './admin.js';
import { parseDate, mirrorPairs } from './budget-source.js';

export const REPORT_VERSION = 'finance-report/1.2.0';
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

/* ------------------------------------------------- the hotel's purchase cost */

const SUPPLEMENT_WORDS = /supplement|extra[\s-]*(bed|person)|third\s+person|triple|additional[\s-]+person/i;
const firstName = (n) => tokens(n)[0] || null;
const overlaps = (period, s) => !!(period && period.from && period.to && period.from < s.to && period.to > s.from);
const dmyRange = (from, to) => (from && to ? dmy(from).slice(0, 5) + '–' + dmy(to) : '');

/**
 * THE HOTEL'S PURCHASE COST FROM THE BOOKINGS, BESIDE 004 (Owners' order, 18 Nov 2026).
 *
 * Every room of the agreement's stays as the Rooms engine holds it (held, sent or confirmed alike):
 *   · the agreement's rooms (every night of their stay, occupied or not) at its rate per room night;
 *   · every other booked room of those stays: additional room nights at the Owners' confirmed purchase rate;
 *   · a third person in a room: the hotel's additional-person charge per room per night (charged once per room, never per guest).
 * Purchase prices only — never a guest's selling price, never divided per guest.
 *
 * Then 004's rows of the hotel (category + item of its budget rule) are set against those costs, one row at a time, in a fixed order:
 *   (1) a block of every room ("All Categories", no booked guest named) → the agreement of the stay it meets (by its period, else the
 *       one stay whose agreement buys several rooms); a Qty other than the rooms bought is named, never turned into another cost;
 *   (2) a row naming booked guests (their first names, exactly) → the one room they sleep in, rooms a block already holds aside: an
 *       agreement room records the agreement, another room its additional nights, an additional-person row (its words) the charge —
 *       up to what is still open, the rest named; a row naming guests whose rooms 004 already holds is a duplicate;
 *   (3) any other row of the hotel → an agreement room of the category it names, else the open additional nights (or charges) of the
 *       stay its period meets (a row with no period: any stay), room by room in label order, up to its amount — the rest named; a row
 *       whose period meets no stay of the agreement is set against nothing.
 * A room's booked cost governs: what 004 does not hold of a CONFIRMED booking (the additional-person charge: of a confirmed extra
 * person) is a proposed addition (in the forecast); of a booking only held, pending (listed, not in the forecast). A row that matches
 * nothing, or holds more than its rooms cost, stays in 004 as written and is named — never removed, never added again. Nothing here
 * writes to 004.
 */
export function hotelPurchaseOf({ plan, roomContract, contracts, lines004, rule, centres, couple, vendor }) {
  const out = { available: false, why: null, lines: [], rows004: [], totals: null, confirmed: null, pending: null, recorded: null, notIn004: null, notIn004Parts: null,
    proposals: [], included: [], corrections: [], checks: [], gaps: [], unsettled: [] };
  if (!roomContract || !roomContract.rooms) { out.why = 'no hotel agreement is recorded'; return out; }
  if (!rule || !rule.item) { out.why = 'the hotel\'s 004 rows cannot be told apart (no budget rule)'; return out; }
  const stays = Object.keys(roomContract.rooms);
  const P = asArray(plan).filter((s) => stays.includes(s.stay)).sort((a, b) => String(a.from).localeCompare(String(b.from)));
  if (!P.length || !P.some((s) => asArray(s.rooms).length)) { out.why = 'the room plan (Rooms engine) is not readable just now'; return out; }
  const cents = (x) => (Number.isFinite(Number(x)) ? Math.round(Number(x) * 100) : null);
  const rate = cents(roomContract.ratePerRoomNight);
  const addRate = roomContract.additional ? cents(roomContract.additional.ratePerRoomNight) : null;
  const supRate = roomContract.supplement && roomContract.supplement.confirmed ? cents(roomContract.supplement.perRoomNight) : null;
  const hosts = couple instanceof Set ? couple : couple ? new Set(asArray(couple)) : COUPLE;
  const check = (text, extra) => out.checks.push({ kind: 'DATA', text, ...(extra || {}) });

  /* the bookings: a guest with a booked (confirmed) line for this very room, or the couple's own place, is confirmed */
  const bookedIn = new Set();
  for (const c of asArray(centres)) for (const r of asArray(c.rooms)) for (const l of asArray(r.lines)) bookedIn.add(c.id + '|' + (r.item || l.item) + '|' + r.label + '|' + l.person);
  for (const s of P) {
    const k = asArray(contracts).find((x) => x.stay === s.stay), n = nightsOf(s.from, s.to) || 0;
    if (!n) { const t = s.place + ': the stay states no nights — its rooms have no hotel cost here'; out.gaps.push({ text: t }); check(t + '.'); }
    for (const u of asArray(s.rooms)) {
      const occ = asArray(u.occupants), guests = occ.filter((o) => o && o.guestId), kept = occ.filter((o) => o && o.kept).length;
      const covered = !!(k && (k.items === '*' || asArray(k.items).includes(u.item)));
      /* a guest the Owners moved here from another room of the same category (placedFrom) is confirmed by the booking billed in that
         room — stay, item and guest the same, the billed label among the rooms they held before (Owners' assignments, 18 Nov 2026) */
      const isConf = (o) => hosts.has(o.guestId) || bookedIn.has(s.stay + '|' + u.item + '|' + u.label + '|' + o.guestId)
        || (Array.isArray(o.placedFrom) && o.placedFrom.some((l) => bookedIn.has(s.stay + '|' + u.item + '|' + l + '|' + o.guestId)));
      const conf = guests.filter(isConf);
      const booked = guests.length > 0 || kept > 0;
      /* a third person: the guest the extra bed is attributed to, else every person (a kept place too) beyond the room's places */
      const places = Number(u.places) || guests.length + kept;
      const beds = guests.filter((o) => o.bed);
      const extra = booked ? Math.max(beds.length, guests.length + kept - places) : 0;
      const extraGuests = beds.length ? beds : guests.length > places ? guests.slice(places) : [];
      /* the charge (once per room) is confirmed only when its extra person is a confirmed guest — never a kept place alone */
      const supStatus = !extra ? null : beds.length ? (beds.every(isConf) ? 'CONFIRMED' : 'HELD') : conf.length > places ? 'CONFIRMED' : 'HELD';
      if (extra > 1) check(s.place + ' · room ' + u.label + ' holds ' + extra + ' persons above its places; the hotel\'s additional-person charge is stated per room per night and is counted once.');
      out.lines.push({ id: unitId(s.stay, u), stay: s.stay, place: s.place, from: s.from, to: s.to, nights: n, key: u.key, label: u.label, type: u.type, item: u.item, places: u.places,
        guests: guests.map((o) => ({ guestId: o.guestId, name: o.name || null, bed: !!o.bed, confirmed: conf.includes(o) })), kept,
        status: !booked ? 'EMPTY' : conf.length ? 'CONFIRMED' : 'HELD', supplementStatus: supStatus, covered,
        contractNights: covered ? n : 0, additionalNights: !covered && booked ? n : 0, extraPersons: extra, extraGuests: extraGuests.map((o) => o.guestId),
        cost: { contract: covered ? rate * n : 0, additional: !covered && booked ? (addRate == null ? null : addRate * n) : 0, supplement: extra ? (supRate == null ? null : supRate * n) : 0 },
        recorded: { contract: 0, additional: 0, supplement: 0 }, rows: { contract: [], additional: [], supplement: [] } });
    }
  }
  const L = out.lines;
  const stayOf = (id) => P.find((s) => s.stay === id);
  /* a cost of the line is in the forecast when its booking is confirmed: the agreement always, additional nights with a confirmed
     guest, the additional-person charge with a confirmed extra person */
  const counts = (l, k) => (k === 'contract' ? true : k === 'additional' ? l.status === 'CONFIRMED' : l.supplementStatus === 'CONFIRMED');

  /* what the agreement states against the room plan — a different count is named, never adjusted */
  const A = roomContract.agreement || {};
  for (const s of P) {
    const want = A.rooms && A.rooms[s.stay], have = L.filter((l) => l.stay === s.stay && l.covered).length;
    if (Number.isFinite(want) && want !== have) check(s.place + ': the agreement buys ' + want + ' room' + (want === 1 ? '' : 's') + ', the room plan holds ' + have + ' — the room plan and the agreement differ.');
  }
  const contractAll = sum(L.map((l) => l.cost.contract));
  if (Number.isFinite(A.total) && contractAll !== Math.round(A.total * 100)) check('The rooms the agreement buys at its rate come to ' + usdText(contractAll) + ', its total is ' + usdText(Math.round(A.total * 100)) + ' — the room plan and the agreement differ.');
  for (const s of asArray(plan)) if (!stays.includes(s.stay) && vendor && vendor.test(clean(s.place)) && asArray(s.rooms).some((u) => asArray(u.occupants).some((o) => o && o.guestId))) {
    const t = s.place + ' ' + dmyRange(s.from, s.to) + ': rooms with guests at the agreement\'s hotel outside the agreement\'s stays — their additional room nights have no purchase cost here yet';
    check(t + '.'); out.gaps.push({ text: t });
  }

  /* 004's rows of the hotel */
  const rows = asArray(lines004).filter((l) => l && l.readable !== false && Number.isFinite(l.budget) && l.budget > 0 &&
    (!rule.category || clean(l.category).toLowerCase() === String(rule.category).toLowerCase()) && rule.item.test(clean(l.item)))
    .map((l) => { const text = clean(l.item) + ' ' + clean(l.details); return { l, row: l.row, cents: Math.round(l.budget * 100), text, toks: new Set(tokens(text)),
      supp: SUPPLEMENT_WORDS.test(text), scope: roomScopeOf(l.details), period: l.period && l.period.from && l.period.to ? l.period : null, role: null, lines: [], rest: 0, why: null }; });
  const named = (r, l) => l.guests.some((g) => r.toks.has(firstName(g.name)));
  const open = (l, kind) => (l.cost[kind] || 0) - l.recorded[kind];
  const take = (r, l, kind, c) => { l.recorded[kind] += c; if (!l.rows[kind].includes(r.row)) l.rows[kind].push(r.row); if (!r.lines.includes(l)) r.lines.push(l); };

  /* (1) blocks of every room the agreement buys in a stay — as many as the stay has nights (one per night or one for all) */
  const blockOf = new Map();   /* stay → { rows: [004 rows], nights: nights they state } */
  const inBlock = (l) => !!(blockOf.has(l.stay) && l.rows.contract.some((x) => blockOf.get(l.stay).rows.includes(x)));
  const multi = P.filter((s) => L.filter((l) => l.stay === s.stay && l.covered).length > 1);
  const blockStay = (r) => { if (r.supp || !(r.scope && r.scope.all) || L.some((l) => named(r, l))) return null; const pick = r.period ? multi.filter((s) => overlaps(r.period, s)) : multi; return pick.length === 1 ? pick[0] : null; };
  const fits = (r) => { const st = blockStay(r); return !!st && Number(r.l.qty) === L.filter((l) => l.stay === st.stay && l.covered).length; };
  /* a row whose Qty is the agreement's own number of rooms is its block before a row whose Qty differs */
  for (const r of rows.filter(fits).concat(rows.filter((x) => !fits(x)))) {
    const s = blockStay(r);
    if (!s) continue;
    const n = nightsOf(s.from, s.to) || 0;
    const b = blockOf.get(s.stay) || { rows: [], nights: 0 };
    if (b.rows.length && b.nights + (Number(r.l.mult) || n) > n) { r.role = 'DUPLICATE'; r.why = 'another block of every room of ' + s.place + ' beside 004 row' + (b.rows.length === 1 ? ' ' : 's ') + b.rows.join(', ') + ', more nights than the stay has'; continue; }
    const cov = L.filter((l) => l.stay === s.stay && l.covered);
    b.rows.push(r.row); b.nights += Number(r.l.mult) || n; blockOf.set(s.stay, b); r.role = 'CONTRACT';
    let left = r.cents; cov.forEach((l, i) => { const c = i === cov.length - 1 ? left : Math.round(r.cents / cov.length); left -= c; take(r, l, 'contract', c); });
    if (Number(r.l.qty) !== cov.length) check('004 row ' + r.row + ' buys ' + (r.l.qty == null ? 'no stated number of' : r.l.qty) + ' rooms; the agreement buys ' + cov.length + ' rooms of ' + s.place + ' — it is read as the agreement\'s block, its amount as written.');
    if (!Number(r.l.mult)) check('004 row ' + r.row + ' states no nights for its rooms.');
    else if (r.cents !== cov.length * Number(r.l.mult) * rate) check('004 row ' + r.row + ' states ' + usdText(r.cents) + ' for ' + cov.length + ' rooms × ' + r.l.mult + ' nights; at the agreement\'s rate that is ' + usdText(cov.length * Number(r.l.mult) * rate) + '.');
  }

  /* (2) rows naming booked guests: the one room they sleep in, up to what is still open */
  for (const r of rows.filter((x) => !x.role)) {
    const kind = (l) => (r.supp ? 'supplement' : l.covered ? 'contract' : 'additional');
    const all = L.filter((l) => named(r, l));
    if (!all.length) continue;
    let cands = all.filter((l) => (r.supp ? l.extraPersons > 0 : true) && !(l.covered && !r.supp && inBlock(l)));
    if (!cands.length) {
      r.role = r.supp ? 'UNMATCHED' : 'DUPLICATE';
      r.why = r.supp ? 'the guests it names sleep in no room with a third person' : 'the guests it names sleep in rooms 004 already holds (row ' + [...new Set(all.flatMap((l) => l.rows.contract))].join(', ') + ')';
      continue;
    }
    if (cands.length > 1) { const near = cands.filter((l) => overlaps(r.period, stayOf(l.stay))); if (near.length) cands = near; }
    if (cands.length > 1) { const free = cands.filter((l) => open(l, kind(l)) > 0); if (free.length) cands = free; }
    if (cands.length !== 1) { r.role = 'AMBIGUOUS'; r.why = 'the guests it names sleep in ' + cands.length + ' rooms of the hotel (' + cands.map((l) => l.stay + ' room ' + l.label).join(', ') + ')'; continue; }
    const l = cands[0], k = kind(l), o = open(l, k);
    if (!(o > 0)) {
      if (!l.cost[k]) { r.role = 'UNMATCHED'; r.why = 'room ' + l.label + ' (' + l.stay + ') has no hotel cost to set here (its stay states no nights or no rate)'; continue; }
      r.role = 'DUPLICATE'; r.why = 'room ' + l.label + ' (' + l.stay + ') is already recorded by 004 row ' + l.rows[k].join(', '); continue;
    }
    const c = Math.min(o, r.cents);
    r.role = k.toUpperCase(); take(r, l, k, c); r.rest = r.cents - c;
  }

  /* (3) every other row of the hotel: an agreement room of the category it names, else the open additional nights (or charges) of the
     stay its period meets, room by room */
  for (const r of rows.filter((x) => !x.role)) {
    const k = r.supp ? 'supplement' : 'additional';
    const typeOk = (l) => !r.scope || r.scope.all || r.scope.words.test(clean(l.type));
    const meets = (l) => !r.period || overlaps(r.period, stayOf(l.stay));
    if (r.period && !P.some((s) => overlaps(r.period, s))) { r.role = 'UNMATCHED'; r.why = 'its period (' + clean(r.l.periodText) + ') meets no stay of the agreement'; continue; }
    /* an agreement room named by its category and not yet recorded (a suite written without names) comes first */
    if (!r.supp && r.scope && !r.scope.all) {
      const suite = L.filter((l) => l.covered && typeOk(l) && meets(l) && open(l, 'contract') > 0 && !inBlock(l));
      if (suite.length === 1) {
        const c = Math.min(open(suite[0], 'contract'), r.cents); r.role = 'CONTRACT'; take(r, suite[0], 'contract', c); r.rest = r.cents - c;
        continue;
      }
    }
    const pool = L.filter((l) => (!l.covered || k === 'supplement') && typeOk(l) && meets(l) && open(l, k) > 0)
      .sort((a, b) => String(a.from).localeCompare(String(b.from)) || String(a.label).localeCompare(String(b.label)));
    let left = r.cents;
    for (const l of pool) { if (left <= 0) break; const c = Math.min(left, open(l, k)); take(r, l, k, c); left -= c; }
    r.rest = left;
    r.role = r.lines.length ? k.toUpperCase() : 'UNMATCHED';
    if (!r.lines.length) r.why = 'it meets no booked room of the hotel that 004 does not already hold';
  }
  /* a room 004 holds for less than it costs, once every row is set: the booking governs, the difference is proposed */
  for (const l of L) for (const k of ['contract', 'additional', 'supplement']) {
    if (!(l.recorded[k] > 0) || !(l.cost[k] > l.recorded[k]) || (k === 'contract' && inBlock(l))) continue;
    check('004 row' + (l.rows[k].length === 1 ? ' ' : 's ') + l.rows[k].join(', ') + ' state' + (l.rows[k].length === 1 ? 's ' : ' ') + usdText(l.recorded[k]) + ' for room ' + l.label + ' (' + l.place + ', ' + dmyRange(l.from, l.to) + '); booked, it costs ' + usdText(l.cost[k]) + ' — the booking governs; the difference is a proposed addition.');
  }
  for (const r of rows) {
    if (r.role === 'UNMATCHED' || r.role === 'AMBIGUOUS' || r.role === 'DUPLICATE') check('004 row ' + r.row + ' (' + clean(r.l.details || r.l.item) + ', ' + usdText(r.cents) + ') is not set against a booked room: ' + r.why + ' — it stays in 004 as written; check it before adding a proposed entry.', { row: r.row, amount: amt(r.cents) });
    else if (r.rest > 0) check('004 row ' + r.row + ' (' + clean(r.l.details || r.l.item) + ') states ' + usdText(r.cents) + '; the open booked rooms it meets cost ' + usdText(r.cents - r.rest) + ' — ' + usdText(r.rest) + ' more than the bookings, kept in 004 as written.', { row: r.row, amount: amt(r.rest) });
    /* the row's own period against the booked nights it records (a text correction — no amount) */
    if (r.lines.length && ['CONTRACT', 'ADDITIONAL', 'SUPPLEMENT'].includes(r.role)) {
      const from = r.lines.map((l) => l.from).sort()[0], to = r.lines.map((l) => l.to).sort().slice(-1)[0];
      /* a block of one night of a longer stay is checked against the stay's window only, never asked to span it */
      const partial = r.role === 'CONTRACT' && r.lines.length > 1 && Number(r.l.mult) > 0 && Number(r.l.mult) < (nightsOf(from, to) || 0);
      const off = !r.period || (partial ? r.period.from < from || r.period.to > to : r.period.from !== from || r.period.to !== to);
      if (off && from && to) out.corrections.push({ row: r.row, field: 'Date or period', reads: r.l.periodText || '', booked: dmy(from) + '–' + dmy(to), from, to, nights: nightsOf(from, to),
        text: '004 row ' + r.row + ' "Date or period" reads "' + (r.l.periodText || '') + '"; the booked ' + (r.role === 'CONTRACT' ? 'rooms of the agreement' : 'room') + ' it records ' + (r.lines.length > 1 ? 'are' : 'is') + ' ' + dmy(from) + '–' + dmy(to) + ' (' + nightsOf(from, to) + ' nights). Text only — no amount changes.' });
    }
    out.rows004.push({ row: r.row, item: clean(r.l.item), details: clean(r.l.details), periodText: r.l.periodText || null, rate: r.l.rate, qty: r.l.qty, nights: r.l.mult, amount: amt(r.cents),
      role: r.role, rooms: r.lines.map((l) => ({ stay: l.stay, label: l.label, type: l.type })), rest: r.rest ? amt(r.rest) : null, why: r.why });
  }

  /* what 004 does not hold: the agreement per stay (one entry), a room's additional nights and its charge (one entry each) */
  const tot = (pick, k) => sum(L.filter(pick).map((l) => l.cost[k] || 0));
  out.totals = { contract: amt(tot(() => true, 'contract')), additional: amt(tot(() => true, 'additional')), supplement: amt(tot(() => true, 'supplement')) };
  out.totals.total = amt(out.totals.contract.cents + out.totals.additional.cents + out.totals.supplement.cents);
  out.confirmed = { additional: amt(tot((l) => counts(l, 'additional'), 'additional')), supplement: amt(tot((l) => counts(l, 'supplement'), 'supplement')) };
  out.recorded = { contract: amt(sum(L.map((l) => l.recorded.contract))), additional: amt(sum(L.map((l) => l.recorded.additional))), supplement: amt(sum(L.map((l) => l.recorded.supplement))) };
  const period = (l) => dmy(l.from).slice(0, 5) + '-' + dmy(l.to);
  const who = (gs) => gs.map((g) => (firstName(g.name) ? g.name.trim().split(/\s+/)[0] : g.guestId));
  for (const s of P) {
    const cov = L.filter((l) => l.stay === s.stay && l.covered), o = sum(cov.map((l) => Math.max(0, open(l, 'contract'))));
    if (o > 0) out.proposals.push({ kind: 'CONTRACT', stay: s.stay, place: s.place, from: s.from, to: s.to, nights: nightsOf(s.from, s.to), rooms: cov.length, type: cov.length > 1 ? 'every room of the agreement' : clean(cov[0].type),
      guests: [], rate: amt(rate), total: amt(o), existing004: [...new Set(cov.flatMap((l) => l.rows.contract))], status: cov.some((l) => l.rows.contract.length) ? 'RAISE' : 'NEW', confirmed: true,
      suggested: { item: 'Souphattra Heritage', category: 'Accommodation', details: cov.length > 1 ? 'All Categories Rooms' : clean(cov[0].type), rate: rate / 100, qty: cov.length, nights: nightsOf(s.from, s.to), budget: o / 100, period: dmy(s.from).slice(0, 5) + '-' + dmy(s.to) } });
  }
  for (const l of L) for (const k of ['additional', 'supplement']) {
    const o = open(l, k); if (!(o > 0)) continue;
    const gs = k === 'supplement' ? l.guests.filter((g) => l.extraGuests.includes(g.guestId)) : l.guests;
    out.proposals.push({ kind: k === 'additional' ? 'ADDITIONAL' : 'SUPPLEMENT', stay: l.stay, place: l.place, from: l.from, to: l.to, nights: l.nights, rooms: 1, label: l.label, type: l.type,
      guests: gs.map((g) => ({ guestId: g.guestId, name: g.name })), rate: amt(k === 'additional' ? addRate : supRate), total: amt(o), existing004: l.rows[k], status: l.rows[k].length ? 'RAISE' : 'NEW', confirmed: counts(l, k),
      suggested: { item: 'Souphattra Heritage', category: 'Accommodation',
        details: k === 'additional' ? clean(l.type) + ' Room ' + l.label + ' (' + who(gs).join(' + ') + ')' : 'Additional-person charge, ' + clean(l.type) + ' Room ' + l.label + (gs.length ? ' (' + who(gs).join(' + ') + ')' : ''),
        rate: (k === 'additional' ? addRate : supRate) / 100, qty: 1, nights: l.nights, budget: o / 100, period: period(l) } });
  }
  for (const l of L) for (const k of ['contract', 'additional', 'supplement']) if (l.recorded[k] > 0 && !(k === 'contract' && inBlock(l))) {
    out.included.push({ kind: k.toUpperCase(), stay: l.stay, place: l.place, from: l.from, to: l.to, label: l.label, type: l.type, guests: l.guests.map((g) => ({ guestId: g.guestId, name: g.name })), rows: l.rows[k], recorded: amt(l.recorded[k]), cost: amt(l.cost[k]) });
  }
  for (const [stay, b] of blockOf) { const cov = L.filter((l) => l.stay === stay && l.covered); out.included.push({ kind: 'CONTRACT', stay, place: stayOf(stay).place, from: stayOf(stay).from, to: stayOf(stay).to, label: null, type: 'every room of the agreement (' + cov.length + ')', guests: [], rows: b.rows.slice(), recorded: amt(sum(cov.map((l) => l.recorded.contract))), cost: amt(sum(cov.map((l) => l.cost.contract))) }); }
  const inForecast = out.proposals.filter((p) => p.confirmed);
  const part = (kind) => amt(sum(inForecast.filter((p) => p.kind === kind).map((p) => p.total.cents)));
  out.notIn004 = amt(sum(inForecast.map((p) => p.total.cents)));
  out.notIn004Parts = { contract: part('CONTRACT'), additional: part('ADDITIONAL'), supplement: part('SUPPLEMENT') };
  out.pending = amt(sum(out.proposals.filter((p) => !p.confirmed).map((p) => p.total.cents)));
  out.unsettled = out.rows004.filter((r) => ['UNMATCHED', 'AMBIGUOUS', 'DUPLICATE'].includes(r.role) || r.rest);
  if (L.some((l) => l.cost.additional == null || l.cost.supplement == null)) { const t = 'A booked room\'s additional nights or additional-person charge has no confirmed purchase rate — not in any figure'; check(t + '.'); out.gaps.push({ text: t }); }
  out.available = true;
  return out;
}

/* ------------------------------------------------------------- the hotels */

/**
 * Per stay of the room plan: the rooms bought, the rooms occupied, the hotel's cost (purchase), the guests' revenue for its rooms
 * (the booked room lines of that stay) and the surplus. At the agreement's hotel the cost is the purchase above (the agreement's rooms,
 * the confirmed rooms' additional nights and additional-person charges; a room only held is named apart, not counted); elsewhere a
 * cost exists only where an agreement states it — the stay's cost is then incomplete and no surplus is stated.
 */
export function hotelPerformance({ plan, contracts, centres, suppliers, rooms012, purchase }) {
  const byStay = new Map(asArray(centres).map((c) => [c.id, c]));
  const hp = purchase && purchase.available ? purchase : null;
  return asArray(plan).map((s) => {
    const n = nightsOf(s.from, s.to);
    const k = asArray(contracts).find((x) => x.stay === s.stay) || null;
    const covered = (u) => !!(k && (k.items === '*' || asArray(k.items).includes(u.item)));
    const units = asArray(s.rooms);
    const occupied = units.filter((u) => asArray(u.occupants).some((o) => o && o.guestId));
    const bought = k ? units.filter(covered) : [];
    const c = byStay.get(s.stay);
    const revenue = sum(asArray(c && c.rooms).flatMap((r) => asArray(r.lines)).map((l) => (l.amount ? l.amount.cents : 0)));
    const guests = sum(occupied.map((u) => u.occupants.filter((o) => o && o.guestId).length));
    const sup = asArray(suppliers).filter((x) => asArray(x.stages).includes(s.stay)).map((x) => ({ vendor: x.vendor, contract: x.contract, covers: x.coversAll || null }));
    const mine = hp ? hp.lines.filter((l) => l.stay === s.stay) : [];
    if (k && mine.length) {
      const part = (list, key) => sum(list.map((l) => l.cost[key] || 0));
      const contract = part(mine, 'contract'), additional = part(mine.filter((l) => l.status === 'CONFIRMED'), 'additional'), supplement = part(mine.filter((l) => l.supplementStatus === 'CONFIRMED'), 'supplement');
      const unknown = mine.some((l) => (l.status === 'CONFIRMED' && l.cost.additional == null) || (l.supplementStatus === 'CONFIRMED' && l.cost.supplement == null));
      const held = mine.filter((l) => (!l.covered && l.status === 'HELD') || l.supplementStatus === 'HELD');
      const cost = contract + additional + supplement;
      return { stay: s.stay, place: s.place, from: s.from, to: s.to, nights: n, rate: amt(k.ratePerRoomNight * 100),
        roomsBought: bought.length, roomsAdditional: mine.filter((l) => !l.covered && l.status !== 'EMPTY').length, roomsOccupied: occupied.length, guests,
        cost: amt(cost), costParts: { contract: amt(contract), additional: amt(additional), supplement: amt(supplement) },
        held: held.map((l) => ({ label: l.label, type: l.type, cost: amt((!l.covered && l.status === 'HELD' ? l.cost.additional || 0 : 0) + (l.supplementStatus === 'HELD' ? l.cost.supplement || 0 : 0)) })),
        costBasis: 'AGREEMENT', costComplete: !unknown, uncontracted: [], suppliers: sup, revenue: amt(revenue), surplus: unknown ? null : amt(revenue - cost),
        emptyBought: bought.filter((u) => !occupied.includes(u)).length };
    }
    const cost = k && n ? bought.length * k.ratePerRoomNight * n * 100 : null;
    const uncontracted = occupied.filter((u) => !covered(u)).map((u) => ({ label: u.label, type: u.type, roomNo: (rooms012 && rooms012.units[unitId(s.stay, u)] || {}).roomNo || null,
      guests: u.occupants.filter((o) => o && o.guestId).length, nights: n }));
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

/* ------------------------------------------------------- reference currency */

/** An amount kept in its own currency beside its USD equivalent at the Owners' reporting reference rates (a reference only). */
export function usdEquivalentOf(list, fxRef) {
  const F = fxRef || REPORTING_FX;
  const per = { USD: 1, THB: F.USD_THB, EUR: F.USD_EUR };
  const parts = asArray(list).filter((m) => m && Number.isFinite(m.cents)).map((m) => ({ currency: m.currency, original: amt(m.cents, m.currency),
    usd: per[m.currency] > 0 ? amt(m.cents / per[m.currency]) : null }));
  const known = parts.every((p) => p.usd);
  return { parts, total: known ? amt(sum(parts.map((p) => p.usd.cents))) : null, converted: parts.some((p) => p.currency !== 'USD'),
    words: 'USD equivalent at the reporting reference rates (1 USD = ' + F.USD_THB + ' THB · 1 USD = ' + F.USD_EUR + ' EUR) — a reference conversion, not a transaction rate' };
}

/* ------------------------------------------------- 004 with its signs (1.2.0) */

/** Cents of a sheet amount, rounded the way the sheet shows it (half away from zero, on the decimal value — 4639.905 → 4,639.91). */
export const sheetCents = (x) => (Number.isFinite(x) ? Math.sign(x) * Math.round(Number((Math.abs(x) * 100).toFixed(6))) : null);
const CHINA_WORDS = /\b(kunming|lijiang|kmg|ljg|china|yunnan)\b/i;

/**
 * GOOGLE 004 AS SIGNED LINES (the Owners' consolidated order, 19 Nov 2026): every readable USD line with its sign. A positive line is
 * a cost; a negative line is 004's own neutralising entry ("GUEST CONTRIBUTIONS") — the mirror of a positive row whose cost the
 * hosts do not carry (a guest's own room or ticket, a private trip). Nothing is dropped, nothing is read from a colour.
 *   class  WEDDING        — the wedding project;
 *          CHINA          — a line of the China trip and its return (its RULE's stage is in CHINA_STAGES; a negative row takes the
 *                           class of the row it mirrors) — outside the wedding budget, reported apart;
 *   toCheck — a line no RULE reads whose words name the China trip: counted in WEDDING until the Owners say otherwise, and named.
 * Sums are taken over the sheet's own values and rounded once, as the sheet rounds them — so they meet A5, G5 and J2/J5 exactly,
 * or the difference is named.
 */
export function signed004Of(budget) {
  const all = asArray(budget && budget.lines);
  const T = (budget && budget.totals) || {};
  const unread = all.filter((l) => l.readable === false || !Number.isFinite(l.budget));
  const otherCurrency = all.filter((l) => l.readable !== false && Number.isFinite(l.budget) && clean(l.currency) && clean(l.currency).toUpperCase() !== 'USD');
  const L = all.filter((l) => l.readable !== false && Number.isFinite(l.budget) && !otherCurrency.includes(l));
  const { mirrorOf, neutralisedBy } = mirrorPairs(L);
  const byRow = new Map(L.map((l) => [l.row, l]));
  const ruleOf = (l) => RULES.find((r) => clean(r.category).toLowerCase() === clean(l.category).toLowerCase() && r.item.test(clean(l.item))) || null;
  const china = (l) => { const r = ruleOf(l); return !!(r && r.stages.length && r.stages.every((x) => CHINA_STAGES.includes(x))); };
  const lines = L.map((l) => {
    const neg = l.budget < 0;
    const mirror = neg ? (mirrorOf.get(l.row) || null) : (neutralisedBy.get(l.row) || null);
    const basisLine = neg && mirror ? byRow.get(mirror) : l;
    const isChina = china(basisLine);
    const r = ruleOf(basisLine);
    const toCheck = !isChina && !r && CHINA_WORDS.test([l.item, l.vendor, l.details, l.location].map(clean).join(' '));
    return { row: l.row, item: l.item, vendor: l.vendor, category: l.category, details: l.details, raw: l.budget, budget: amt(sheetCents(l.budget)),
      sign: neg ? 'NEUTRALISING' : 'COST', cls: isChina ? 'CHINA' : 'WEDDING', mirror, rule: r ? r.id : null,
      stage: r && r.stages.length === 1 ? r.stages[0] : null, toCheck };
  });
  const tot = (list) => sheetCents(list.reduce((t, l) => t + l.raw, 0));
  const part = (list) => ({ gross: amt(tot(list.filter((l) => l.raw > 0))), neutralising: amt(tot(list.filter((l) => l.raw < 0))), net: amt(tot(list)), lines: list.length });
  const wedding = lines.filter((l) => l.cls === 'WEDDING'), chinaLines = lines.filter((l) => l.cls === 'CHINA');
  const whole = part(lines);
  const cell = (k, mine, what) => {
    if (!Number.isFinite(T[k])) return null;
    const sheet = sheetCents(T[k]);
    return { cell: T[k + 'Cell'] || null, what, formula: T[k + 'Formula'] || null, sheet: amt(sheet), lines: amt(mine), equal: sheet === mine, difference: amt(mine - sheet) };
  };
  const checks = [
    cell('grossCost', whole.gross.cents, 'the positive lines (gross project cost)'),
    cell('guestContributions', -whole.neutralising.cents, 'the negative lines (neutralising entries), as a positive figure'),
    cell('totalPlanned', whole.net.cents, 'every line with its sign (the net total)'),
    cell('netHostCost', whole.net.cents, 'every line with its sign (the net host cost)'),
  ].filter(Boolean);
  return {
    definition: 'Google 004, every readable USD line with its sign: positive = a cost, negative = 004\'s own neutralising entry of the row it mirrors; WEDDING and CHINA apart',
    lines: lines.map(({ raw, ...x }) => x),
    whole, wedding: part(wedding), china: part(chinaLines),
    checks, reconciled: checks.length > 0 && checks.every((c) => c.equal),
    unpaired: lines.filter((l) => l.sign === 'NEUTRALISING' && !l.mirror).map((l) => l.row),
    toCheck: lines.filter((l) => l.toCheck).map((l) => l.row),
    unread: unread.map((l) => l.row), otherCurrency: otherCurrency.map((l) => ({ row: l.row, currency: clean(l.currency).toUpperCase() })),
  };
}

/* the wedding's neutralising entries beside what the guests actually booked for the same stay or service (the booking system is the
   truth for what the guests pay): per group — a stay of a RULE (A2, B …) or a pass-through product 004 records apart (budget-map
   PASS_THROUGH.item004). The difference is the gap between 004's plan and the bookings — named, never written to 004. */
function collectionsBeside004(s004, classes) {
  const groups = new Map();
  const g = (k, label) => { if (!groups.has(k)) groups.set(k, { key: k, label, rows: [], neutralising: 0, booked: 0, invoiced: 0 }); return groups.get(k); };
  const byRow = new Map(s004.lines.map((l) => [l.row, l]));
  for (const l of s004.lines.filter((x) => x.cls === 'WEDDING' && x.sign === 'NEUTRALISING')) {
    const base = l.mirror ? byRow.get(l.mirror) : l;
    const pt = PASS_THROUGH.find((x) => x.item004 && x.item004.test(clean(base.item)));
    /* a Souphattra room's neutralising entry: what its guests pay is Souphattra revenue (D), never a collection to set against it */
    const soup = base.rule === 'SOUPHATTRA';
    const key = soup ? 'SOUPHATTRA' : pt ? pt.itemId : (base.stage || base.rule || 'row ' + l.row);
    const x = g(key, soup ? 'Souphattra Heritage — its guests\' payments are its accommodation revenue (D), not set against 004 here' : pt ? pt.itemId : (base.item || key));
    x.rows.push(l.row); x.neutralising += -(l.budget ? l.budget.cents : 0);
  }
  const C = classes || {};
  for (const p of asArray(C.otherAccommodation).filter((x) => !x.china)) { const x = g(p.stage || p.property, p.property); x.booked += (p.booked || {}).cents || 0; x.invoiced += (p.invoiced || {}).cents || 0; }
  for (const p of asArray(C.passThrough).filter((x) => !x.china)) {
    const key = groups.has(p.Item_ID) ? p.Item_ID : (p.stage && groups.has(p.stage) ? p.stage : p.Item_ID);
    const x = g(key, p.Item_ID); x.booked += (p.booked || {}).cents || 0; x.invoiced += (p.invoiced || {}).cents || 0;
  }
  for (const p of asArray(C.notClassified).filter((x) => !x.china)) { const x = g(p.Item_ID, p.Item_ID + ' (not classified)'); x.booked += (p.booked || {}).cents || 0; x.invoiced += (p.invoiced || {}).cents || 0; }
  return [...groups.values()].map((x) => ({ key: x.key, label: x.label, rows: x.rows, neutralising004: amt(x.neutralising), booked: x.key === 'SOUPHATTRA' ? null : amt(x.booked), invoiced: amt(x.invoiced),
    difference: x.key === 'SOUPHATTRA' ? null : amt(x.booked - x.neutralising) })).sort((a, b) => (a.key < b.key ? -1 : 1));
}

/* ------------------------------------------------------------- the report */

export function financeReportOf({ budget, suppliers, centres, plan, contracts, roomContractMeta, dashboard, rates009, revenue, receipts, fx, list012, purchase, rule, vendor }) {
  const D = dashboard || {}, C = D.costs || {};
  const T = (budget && budget.totals) || {};
  const approved = Number.isFinite(T.totalBudget) ? sheetCents(T.totalBudget) : null;
  const rooms012 = safe(() => match012(plan, list012), { available: false, units: {}, ambiguous: [], notIn012: [], notBooked: [], free: [], dates: [], error: 'not readable just now' });
  const hp = purchase || safe(() => hotelPurchaseOf({ plan, roomContract: roomContractMeta, contracts, lines004: budget && budget.lines, rule, centres, couple: COUPLE, vendor }),
    { available: false, why: 'the hotel\'s purchase costs could not be set beside 004 just now', lines: [], rows004: [], proposals: [], included: [], corrections: [], checks: [], unsettled: [] });
  const hotel = safe(() => hotelPerformance({ plan, contracts, centres, suppliers, rooms012, purchase: hp }), []);
  const contractStays = new Set(asArray(contracts).map((x) => x.stay));

  /* ---- 004 WITH ITS SIGNS (1.2.0 · Owners, 19 Nov 2026): the wedding's planned cost is its net (004's own J2 view, the China trip
     apart); its gross stays beside it. The forecast adds what the bookings cost at the agreement's hotel and 004 does not hold yet. */
  const s004 = budget && asArray(budget.lines).length ? safe(() => signed004Of(budget), null) : null;
  const isChinaSupplier = (sup) => { const st = asArray(sup && sup.stages); return st.length > 0 && st.every((x) => CHINA_STAGES.includes(x)); };
  /* an adjustment's stays: its own, else its supplier's (dashboardOf names stages on the hotel's adjustment only) */
  const stagesOfAdj = (a) => asArray(a.stages).length ? asArray(a.stages) : asArray((asArray(suppliers).find((x) => x.vendor === a.vendor) || {}).stages);
  const adjustments = asArray(C.adjustments).filter((a) => { const st = stagesOfAdj(a); return !(st.length && st.every((x) => CHINA_STAGES.includes(x))); });
  const adjustCents = adjustments.reduce((t, a) => t + (a.difference ? a.difference.cents : 0), 0);
  const planned = s004 ? s004.wedding.net.cents : null, plannedGross = s004 ? s004.wedding.gross.cents : null;
  const forecast = planned == null ? null : planned + adjustCents, forecastGross = plannedGross == null ? null : plannedGross + adjustCents;

  /* ---- what the forecast does not hold yet: guest services without a supplier cost, the hotel's purchase not set beside 004 ---- */
  const gaps = [];
  const hotelGap = (text) => gaps.push({ centre: [...contractStays].join(' + '), place: 'Souphattra Heritage', text, hotel: true });
  if (roomContractMeta && !hp.available) hotelGap('the hotel\'s purchase costs could not be set beside 004 (' + (hp.why || 'not readable') + ') — 004 is counted as written');
  for (const r of asArray(hp.unsettled)) hotelGap('004 row ' + r.row + ' (' + usdText((r.rest || r.amount).cents) + ') is not set against a booked room — it may already hold a proposed addition');
  for (const g of asArray(hp.gaps)) hotelGap(g.text);
  for (const c of asArray(centres)) if (!contractStays.has(c.id) && c.status === 'NOT_COMPLETE' && asArray(c.missing).length) gaps.push({ centre: c.id, place: c.place, text: asArray(c.missing).join(' · '), china: CHINA_STAGES.includes(c.id) });
  /* a China stay's missing price is the China trip's, never the wedding forecast's */
  const weddingGaps = gaps.filter((g) => !g.china);

  /* ---- 004 per category (WEDDING lines: gross, neutralising, net, forecast) · 007 committed and paid (the China trip's suppliers apart) ---- */
  const byCategory = safe(() => {
    const cats = new Map();
    const row = (name) => { if (!cats.has(name)) cats.set(name, { category: name, gross: 0, neutralising: 0, raw: 0, adjust: 0, committed: [], paid: [], suppliers: [] }); return cats.get(name); };
    const rawOf = new Map(asArray(budget && budget.lines).map((l) => [l.row, l.budget]));
    for (const l of asArray(s004 && s004.lines).filter((x) => x.cls === 'WEDDING')) {
      const r = row(l.category || '(no category)'), v = rawOf.get(l.row) || 0;
      r.raw += v; if (v > 0) r.gross += v; else r.neutralising += v;
    }
    const catOf = (v) => (SUPPLIER_CATEGORY.find((m) => m.vendor.test(clean(v))) || {}).category || null;
    for (const sp of asArray(suppliers).filter((x) => !isChinaSupplier(x))) {
      const r = row(catOf(sp.vendor) || 'Unassigned');
      r.suppliers.push(sp.vendor);
      if (sp.contract) r.committed.push(sp.contract);
      for (const p of asArray(sp.payments)) if (p.counted && p.amount) r.paid.push(p.amount);
    }
    for (const a of adjustments) { const r = row(a.category || catOf(a.vendor) || 'Unassigned'); r.adjust += a.difference ? a.difference.cents : 0; }
    return [...cats.values()].map((r) => {
      const committed = perCurrency(r.committed), paid = perCurrency(r.paid);
      const usdCommitted = (committed.find((m) => m.currency === 'USD') || {}).cents || 0;
      const net = sheetCents(r.raw), gross = sheetCents(r.gross);
      return { category: r.category, gross: amt(gross), neutralising: amt(sheetCents(r.neutralising)), planned: amt(net), forecast: amt(net + r.adjust), forecastGross: amt(gross + r.adjust),
        variance: amt(r.adjust), committed, paid, suppliers: r.suppliers, committedUsd: usdEquivalentOf(committed), paidUsd: usdEquivalentOf(paid),
        /* a 007 commitment is gross: it is set against the category's gross forecast, never its net */
        committedAboveForecast: usdCommitted > gross + r.adjust ? amt(usdCommitted - (gross + r.adjust)) : null };
    }).sort((a, b) => (a.category === 'Unassigned') - (b.category === 'Unassigned') || b.planned.cents - a.planned.cents);
  }, []);
  const weddingSuppliers = asArray(suppliers).filter((x) => !isChinaSupplier(x)), chinaSuppliers = asArray(suppliers).filter(isChinaSupplier);
  const paidOf = (list) => perCurrency(list.flatMap((sp) => asArray(sp.payments).filter((p) => p.counted && p.amount).map((p) => p.amount)));
  const committedAll = perCurrency(weddingSuppliers.map((sp) => sp.contract).filter(Boolean));
  const paidAll = paidOf(weddingSuppliers);
  const committedUsd = usdEquivalentOf(committedAll), paidUsd = usdEquivalentOf(paidAll);
  const chinaPaid = paidOf(chinaSuppliers), chinaCommitted = perCurrency(chinaSuppliers.map((sp) => sp.contract).filter(Boolean));

  /* ---- THE GUESTS' BILLING BY CLASS (revenue-classes): the Souphattra's accommodation revenue; other accommodation and
     pass-through collections; the China trip apart ---- */
  const R = revenue || {};
  const K = R.classes && R.classes.version ? R.classes : null;
  const cc = (m) => (m && Number.isFinite(m.cents) ? m.cents : null);
  const part = (k) => (K && K.classes && K.classes[k]) || null;
  const SOU = part('SOUPHATTRA_ACCOMMODATION'), OTH = part('OTHER_ACCOMMODATION'), PAS = part('PASS_THROUGH'), NON = part('NOT_CLASSIFIED');
  const weddingParts = [SOU, OTH, PAS, NON].filter(Boolean);
  const sumF = (list, f) => (list.length && list.every((x) => cc(x[f]) != null) ? sum(list.map((x) => cc(x[f]))) : null);
  const classesOk = !!(K && K.complete !== false);
  const weddingBooked = K ? sumF(weddingParts, 'booked') : null, weddingInvoiced = K ? sumF(weddingParts, 'invoiced') : null;
  /* a partly paid statement's receipt is not split by class: it counts with the wedding in full, and is named */
  const partlyPaid = K && K.unallocated ? sum(asArray(K.unallocated.statements).filter((x) => x.status === 'PARTIAL' && !x.china).map((x) => cc(x.received) || 0)) : 0;
  const weddingReceived = K ? (sumF(weddingParts, 'received') == null ? null : sumF(weddingParts, 'received') + partlyPaid) : null;
  const collections = K ? safe(() => collectionsBeside004(s004 || { lines: [] }, K), []) : [];

  /* ---- THE PROJECTED WEDDING FINANCIAL POSITION (gross, the booking system's collections): what the guests booked for the wedding
     (the Souphattra's accommodation, other accommodation and pass-through collections — the China trip apart) − the wedding's gross
     forecast cost (004's positive lines + the hotel purchase not in 004 yet). Pass-through items are on both sides, so they add
     nothing; the China trip is on neither. 004's own net view (its J2: the Souphattra revenue against the net cost) is shown beside
     it, and the difference is exactly the collections against 004's neutralising entries, item by item. ---- */
  const posComplete = classesOk && forecastGross != null && !weddingGaps.length;
  const position = forecastGross == null || weddingBooked == null ? { stated: false, why: forecastGross == null ? '004 could not be read' : 'the guest billing by class is not available just now' } : {
    stated: true,
    net: amt(weddingBooked - forecastGross), today: weddingInvoiced == null ? null : amt(weddingInvoiced - forecastGross),
    souphattra: amt(cc(SOU && SOU.booked)), otherCollections: amt(sumF([OTH, PAS, NON].filter(Boolean), 'booked')), forecastGross: amt(forecastGross),
    coverage: forecastGross > 0 ? Math.round((weddingBooked / forecastGross) * 1000) / 10 : null,
    net004: SOU && forecast != null ? amt(cc(SOU.booked) - forecast) : null,
    differenceTo004: SOU && forecast != null ? amt((weddingBooked - forecastGross) - (cc(SOU.booked) - forecast)) : null,
    complete: posComplete,
    formula: 'the wedding\'s guest billing as booked (Souphattra accommodation + other accommodation + pass-through collections; the China trip apart) − the wedding\'s gross forecast cost (004 positive lines + the hotel purchase not in 004 yet)',
  };

  /* ---- the cash still to move (gross, USD; a payment in another currency at its USD equivalent, labelled) ---- */
  const received = receipts && receipts.cashCollected && receipts.cashCollected.complete !== false && Number.isFinite(receipts.cashCollected.cents) ? receipts.cashCollected.cents : null;
  const expected = R.booked && R.booked.complete !== false && Number.isFinite(R.booked.cents) ? R.booked.cents : null;
  const paidEq = paidUsd.total ? paidUsd.total.cents : null;
  const remainingSupplier = forecastGross == null || paidEq == null ? null : forecastGross - paidEq;
  const remainingGuests = weddingBooked == null || weddingReceived == null ? null : weddingBooked - weddingReceived;
  const reportingFx = { USD_THB: REPORTING_FX.USD_THB, USD_EUR: REPORTING_FX.USD_EUR, source: REPORTING_FX.source,
    statementReference: fx && (fx.FX_USD_THB || fx.FX_USD_EUR) ? { day: fx.day || null, USD_THB: Number(fx.FX_USD_THB) || null, USD_EUR: Number(fx.FX_USD_EUR) || null } : null };
  const chinaPaidUsd = usdEquivalentOf(chinaPaid);
  const cash = {
    paidToSuppliers: paidAll, paidToSuppliersUsd: paidUsd, remainingSupplierPaymentsUsd: amt(remainingSupplier), guestReceiptsToCome: amt(remainingGuests), received: amt(received), expected: amt(expected),
    weddingReceived: amt(weddingReceived),
    ownerStillToProvide: remainingSupplier == null || remainingGuests == null ? null : amt(remainingSupplier - remainingGuests),
    complete: !!(remainingSupplier != null && remainingGuests != null && !weddingGaps.length && classesOk),
    why: [weddingGaps.length ? 'the forecast does not hold ' + weddingGaps.length + ' cost' + (weddingGaps.length === 1 ? '' : 's') + ' yet (see "Costs not yet in the forecast")' : null,
      remainingGuests == null ? 'the guest figures are not complete just now' : null, K && !classesOk ? 'the guest billing by class is not complete just now' : null,
      partlyPaid ? 'a partly paid statement\'s receipt (' + usdText(partlyPaid) + ') counts with the wedding in full (statements without a China line)' : null,
      K && asArray(K.unallocated && K.unallocated.statements).some((x) => x.status !== 'PARTIAL' || x.china) ? 'a receipt not split by class is not counted here (named in E)' : null].filter(Boolean),
    formula: 'wedding gross forecast cost − supplier payments made to the wedding\'s suppliers (USD equivalent at the reference rates) − (the wedding\'s guest billing as booked − what those guests have paid); the China trip apart',
    china: { paidToSuppliers: chinaPaid, paidToSuppliersUsd: chinaPaidUsd, committed: chinaCommitted, collectionsBooked: K ? K.china.booked : null, collectionsReceived: K ? K.china.received : null },
  };

  /* ---- the exceptions: data and differences ---- */
  const ex = [];
  const add = (kind, area, text, extra) => ex.push({ kind, area, text, ...(extra || {}) });
  /* each check on its own: one that cannot be made is named, the others stand */
  const check = (what, fn) => { try { fn(); } catch (e) { add('DATA', 'Report', 'The check of ' + what + ' could not be made just now.'); } };
  check('the hotel\'s purchase against 004', () => {
    if (roomContractMeta && !hp.available) add('DATA', 'Hotel purchase', 'The hotel\'s purchase costs could not be set beside 004: ' + (hp.why || 'not readable') + '. 004 is counted as written.');
    for (const c of asArray(hp.checks)) add('DATA', 'Hotel purchase', c.text, c.amount ? { amount: c.amount } : null);
    const sp = asArray(suppliers).find((x) => vendor && vendor.test(clean(x.vendor)));
    if (hp.available && sp && sp.contract && sp.contract.currency === 'USD' && hp.totals && hp.totals.contract.cents !== sp.contract.cents) {
      add('DATA', 'Hotel purchase', sp.vendor + ': 007 states ' + usdText(sp.contract.cents) + ' for the agreement; its rooms at its rate come to ' + usdText(hp.totals.contract.cents) + '.');
    }
  });
  check('the reporting rates', () => {
    const r = reportingFx.statementReference;
    if (r && ((r.USD_THB && r.USD_THB !== REPORTING_FX.USD_THB) || (r.USD_EUR && r.USD_EUR !== REPORTING_FX.USD_EUR))) {
      add('DATA', 'Currency', '011 holds USD/THB ' + r.USD_THB + ', USD/EUR ' + r.USD_EUR + '; the reports use the approved reference rates ' + REPORTING_FX.USD_THB + ' and ' + REPORTING_FX.USD_EUR + '. Statements keep the rate they were issued with.');
    }
  });
  check('004', () => {
    for (const l of asArray(budget && budget.lines)) if (Number.isFinite(l.paid) && l.paid > 0) {
      const in007 = asArray(suppliers).some((x) => clean(x.vendor) && clean(l.vendor) && clean(x.vendor).toLowerCase() === clean(l.vendor).toLowerCase());
      add('DATA', 'Budget 004', '004 row ' + l.row + ' (' + l.item + (l.vendor ? ', ' + l.vendor : '') + ') records ' + usdText(sheetCents(l.paid)) + ' paid' + (l.payDateText ? ' on ' + l.payDateText : '') +
        (in007 ? ' — its supplier is in 007, where payments are counted.' : ' — 007 has no column for this supplier, so it is not counted as a supplier payment; a row in 007 would count it.'), { amount: amt(sheetCents(l.paid)) });
    }
    if (!s004) { if (budget && asArray(budget.lines).length) add('DATA', 'Budget 004', '004 could not be read with its signs just now.'); return; }
    if (s004.unread.length) add('DATA', 'Budget 004', '004 row' + (s004.unread.length === 1 ? ' ' : 's ') + s004.unread.join(', ') + (s004.unread.length === 1 ? ' is' : ' are') + ' not readable and in no figure.');
    for (const o of s004.otherCurrency) add('DATA', 'Budget 004', '004 row ' + o.row + ' is in ' + o.currency + ' — never converted, in no USD figure.');
    for (const c of s004.checks) if (!c.equal) add('DATA', 'Budget 004', '004 ' + c.cell + ' states ' + usdText(c.sheet.cents) + '; ' + c.what + ' add up to ' + usdText(c.lines.cents) + (c.formula ? ' (the cell is ' + c.formula + ')' : '') + '.');
    for (const r of s004.unpaired) add('DATA', 'Budget 004', '004 row ' + r + ' is a negative (neutralising) row without a positive row it mirrors — counted with its sign, its purpose to be stated.');
    for (const r of s004.toCheck) add('DATA', 'Budget 004', '004 row ' + r + ' names the China trip but no rule reads it — counted in the wedding until you say it belongs to the China trip.');
    const catSum = sum(byCategory.map((c) => c.planned ? c.planned.cents : 0));
    if (planned != null && byCategory.length && catSum !== planned) add('DATA', 'Budget 004', 'The 004 categories add up to ' + usdText(catSum) + ' net, the wedding lines to ' + usdText(planned) + ' (rounding per category).');
  });
  check('the guests\' collections against 004\'s neutralising entries', () => {
    for (const g of collections) if (g.difference && g.difference.cents && (g.neutralising004.cents || g.booked.cents)) {
      add('DATA', 'Collections vs 004', g.label + ': the guests booked ' + usdText(g.booked.cents) + '; 004 neutralises ' + usdText(g.neutralising004.cents) + (g.rows.length ? ' (row' + (g.rows.length === 1 ? ' ' : 's ') + g.rows.join(', ') + ')' : ' (no 004 row)') +
        ' — a difference of ' + (g.difference.cents > 0 ? '+' : '−') + usdText(Math.abs(g.difference.cents)) + '. The position counts the bookings; 004 is not changed.', { amount: g.difference });
    }
  });
  check('the Souphattra revenue', () => {
    const fromStays = sum(hotel.filter((h) => contractStays.has(h.stay)).map((h) => (h.revenue ? h.revenue.cents : 0)));
    if (SOU && cc(SOU.booked) != null && hotel.some((h) => contractStays.has(h.stay)) && fromStays !== cc(SOU.booked)) {
      add('DATA', 'Souphattra revenue', 'The Souphattra\'s room lines per stay add up to ' + usdText(fromStays) + '; its accommodation revenue by class is ' + usdText(cc(SOU.booked)) + '.');
    }
    if (K && !classesOk) add('DATA', 'Guest billing by class', 'The split of the guests\' billing by class is not complete just now' + (K.error ? ': ' + K.error : '') + ' — the position and the Souphattra figures are not stated as complete.');
    for (const x of asArray(K && K.notClassified)) add('DATA', 'Guest billing by class', x.Item_ID + ' (' + usdText(cc(x.booked) || 0) + ' booked) is a guest service not yet classified — named in the wedding\'s collections until you say what it is.');
    for (const x of asArray(K && K.withoutProduct)) add('DATA', 'Guest billing by class', 'Booked lines of ' + x.Item_ID + ' (' + usdText(cc(x.booked) || 0) + ') carry no product key — in the total, in no part.');
    for (const x of asArray(K && K.unallocated && K.unallocated.statements)) add('DATA', 'Guest billing by class', x.Holder_ID + (x.Settlement_ID ? ' (' + x.Settlement_ID + ')' : '') + ': ' + x.why + '.');
  });
  check('costs not yet in the forecast', () => { for (const g of gaps.filter((x) => !x.hotel && !contractStays.has(x.centre))) add('DATA', g.china ? 'China trip — costs not stated' : 'Costs not yet in the forecast', g.place + ': ' + g.text); });
  if (roomContractMeta && roomContractMeta.agreementDates) add('INFO', 'Hotel agreement', roomContractMeta.agreementDates);

  const approvedM = amt(approved);
  return {
    version: REPORT_VERSION,
    approved: approvedM ? { ...approvedM, cell: T.totalBudgetCell || null } : null,
    approvedWhy: approvedM ? null : '004 states no TOTAL BUDGET just now',
    /* the wedding's planned cost: 004 net (its J2 view, the China trip apart); its gross and its neutralising entries beside it */
    planned: amt(planned), plannedGross: amt(plannedGross), plannedNeutralising: s004 ? s004.wedding.neutralising : null,
    forecast: amt(forecast), forecastGross: amt(forecastGross),
    forecastComplete: !weddingGaps.length, forecastGaps: weddingGaps, chinaGaps: gaps.filter((g) => g.china),
    varianceToApproved: approved != null && forecast != null ? amt(forecast - approved) : null,
    plannedVsApproved: approved != null && planned != null ? amt(planned - approved) : null,
    remainingBudget: approved != null && forecast != null ? amt(approved - forecast) : null,
    budgetLeftSheet: Number.isFinite(T.budgetLeft) ? { ...amt(sheetCents(T.budgetLeft)), cell: T.budgetLeftCell || null } : null,
    budget004: s004,
    committed: committedAll, paid: paidAll, committedUsd, paidUsd, reportingFx, byCategory, cash, purchase: hp, hotel, rooms012,
    /* the guests' billing by class, as the Revenue Report split it (revenue-classes) — the Finance tab's own figures */
    guestBilling: K ? { complete: classesOk, souphattra: SOU, other: OTH, passThrough: PAS, notClassified: NON, china: K.china, total: K.totalGuestBilling,
      wedding: { booked: amt(weddingBooked), invoiced: amt(weddingInvoiced), received: amt(weddingReceived) } } : null,
    collectionsBeside004: collections,
    china: { label: 'China trip and its return — outside the wedding budget', stages: CHINA_STAGES, costs004: s004 ? s004.china : null,
      committed: chinaCommitted, paid: chinaPaid, paidUsd: chinaPaidUsd, collections: K ? K.china : null, suppliers: chinaSuppliers.map((x) => x.vendor) },
    position,
    exceptions: ex,
  };
}

function safe(fn, fallback) { try { return fn(); } catch (e) { return fallback; } }
