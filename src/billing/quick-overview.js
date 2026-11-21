/* ============================================================================
   THE OVERVIEW · HS-034 + HS-035 (Owners HS-PROMPT-047 / -052, 20–21 Nov 2026) — pure: no I/O, no clock, no Google.

   Two readings the admin console's Overview draws, each added to an answer the console already reads:
     · quickFinanceOf(rev)      → revenue.quick — the statements' payment state, the guests' revenue and the purchase per hotel,
                                  the Souphattra per night, the programme legs. Counts and ratios of the revenue route's own
                                  figures, passed through unchanged (pricing rule, agent check 21 Nov 2026): no amount is
                                  derived — never per person, night or room; a missing figure stays missing (never 0); the
                                  couple stays apart; no figure of the route is added up again from its lines.
     · participationOf(input)   → admin/assignments?overview=1 · participation — who joins what as sent, the seats of the
                                  seating ledger, persons per night from the room plan, the documents and the food-allergy
                                  answer as sent. Guest ids and counts only: never a name, a free text, a file name or a key.
   Every list a figure opens carries the ids of exactly that figure. Open Owner decisions are never decided here: they travel
   as `decision` markers (E15, E16, E19, E20, E21, E22, E29). E17 and E18 are decided (Owners HS-PROMPT-053, 21 Nov 2026): the bases below.
   ========================================================================== */
import { journeyModel } from '../mail-templates.js';
import { CATEGORY_TYPES, roomsInCategory, SOUPHATTRA } from '../hotel-rooms.js';
import { STAGES } from './budget-map.js';

/* the Souphattra's stays, by the budget map's own places (C, D1 today) — never a list kept here */
const SOUPHATTRA_STAYS = Object.keys(STAGES).filter((k) => String(STAGES[k].place || '').indexOf(SOUPHATTRA.replace(/ Vientiane$/, '')) === 0);

export const QUICK_OVERVIEW_VERSION = 'quick-overview/1.0.0';

/* E16 · OPEN (register, 20 Nov 2026): the seating ledger holds the dinner's capacity (src/seating.js CAPACITY). The Owners'
   HS-PROMPT-047 names "50 Personen einschließlich Brautpaar". It is shown beside the system's figure — never used as the capacity,
   never written anywhere — until the Owners decide. This is its only place in the code. */
export const OWNER_DINNER_ALTERNATIVE = 50;

/* E17 + E18 · OWNER DECIDED (HS-PROMPT-053, 21 Nov 2026) — how the programme figures load and what every share rests on */
export const PROVISIONAL_DEFAULTS = Object.freeze({
  E17: 'the programme figures load by themselves when the Overview opens, at most once per console visit, never retried by themselves',
  E18: 'paid share = received of invoiced, the couple apart; participation share = confirmed participation of all invited persons, the couple included; persons, households and statements are separate counts',
});

const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const clean = (v) => String(v == null ? '' : v).trim();
const uniq = (list) => [...new Set(list.filter(Boolean))].sort();
const pct = (n, d) => (isNum(n) && isNum(d) && d > 0 ? Math.round((n / d) * 1000) / 10 : null);

/* a figure of the route, passed through: its cents (or null), whether it is complete, the part known — never promoted */
function figure(k) {
  if (!k || typeof k !== 'object') return { cents: null, complete: false, partialCents: null, gaps: 0, status: 'NOT_AVAILABLE' };
  const cents = isNum(k.cents) ? k.cents : null;
  const complete = cents != null && k.complete !== false;
  return { cents, complete, partialCents: k.partial && isNum(k.partial.cents) ? k.partial.cents : null,
    gaps: arr(k.gaps).length, status: cents == null ? 'KPI_INCOMPLETE' : complete ? 'OK' : 'PARTIAL' };
}
/* a share of two figures of the route — only when both are complete and the base is above zero */
function share(num, den, base) {
  if (!num.complete || !den.complete) return { num: num.cents, den: den.cents, pct: null, base, status: 'KPI_INCOMPLETE' };
  if (!(den.cents > 0)) return { num: num.cents, den: den.cents, pct: null, base, status: 'NO_BASE' };
  return { num: num.cents, den: den.cents, pct: pct(num.cents, den.cents), base, status: 'OK' };
}
const countShare = (n, d, base) => ({ num: n, den: d, pct: pct(n, d), base, status: d > 0 ? 'OK' : 'NO_BASE' });
const centsOf = (m) => (m && isNum(m.cents) ? m.cents : null);
const moneyList = (list) => arr(list).filter((m) => m && isNum(m.cents) && clean(m.currency)).map((m) => ({ currency: clean(m.currency), cents: m.cents }));

/* ------------------------------------------------------------------ finance */
const BUCKETS = ['OVERDUE', 'UNPAID', 'PARTIAL', 'PAID', 'OVERPAID', 'NOTHING_DUE', 'UNKNOWN'];
function bucketOf(h) {
  const s = clean(h.paymentStatus), late = arr(h.paymentFlags).includes('OVERDUE');
  if ((s === 'UNPAID' || s === 'PARTIAL') && late) return 'OVERDUE';
  return BUCKETS.includes(s) ? s : 'UNKNOWN';
}

function financeOf(rev) {
  /* the paying guests' holders — the route keeps the couple apart (rev.couple); a guest the register no longer names (cancelled)
     is listed by the route but is not a paying guest here */
  const cancelled = new Set(arr(rev.cancelledHolders).map((c) => clean(c && c.Holder_ID)));
  const holders = arr(rev.holders).filter((h) => h && !cancelled.has(clean(h.Holder_ID)));
  const issued = holders.filter((h) => h && h.revision != null);
  const notIssued = holders.filter((h) => h && h.revision == null);
  const buckets = BUCKETS.map((key) => {
    const ids = issued.filter((h) => bucketOf(h) === key).map((h) => clean(h.Holder_ID));
    return { key, n: ids.length, ids, share: countShare(ids.length, issued.length, 'ISSUED_STATEMENTS_OF_PAYING_GUESTS') };
  });
  const invoiced = figure(rev.issuedRevenue), received = figure(rev.cashCollected), outstanding = figure(rev.outstanding);
  const overdue = figure(rev.overdue), refundDue = figure(rev.refundDue), booked = figure(rev.bookedRevenue);
  const notYet = figure(rev.notYetInvoiced);
  const rep = obj(rev.paymentsReported);
  const reportedIds = holders.filter((h) => h && Number(h.pendingVerification) > 0).map((h) => clean(h.Holder_ID));
  const couple = arr(rev.couple);
  return {
    base: 'PAYING_STATEMENTS',
    amounts: { invoiced, received, outstanding, overdue, refundDue, booked, notYetInvoiced: notYet },
    ratios: { received: share(received, invoiced, 'RECEIVED_OF_INVOICED'), open: share(outstanding, invoiced, 'OUTSTANDING_OF_INVOICED') },
    statements: { paying: holders.length, issued: issued.length, notIssued: notIssued.length, notIssuedIds: notIssued.map((h) => clean(h.Holder_ID)),
      couple: couple.length, cancelled: cancelled.size },
    buckets,
    overdueIds: (buckets.find((b) => b.key === 'OVERDUE') || { ids: [] }).ids,
    reported: { rows: isNum(rep.rows) ? rep.rows : null, cents: isNum(rep.cents) ? rep.cents : null, duplicateSuspects: isNum(rep.duplicateSuspects) ? rep.duplicateSuspects : 0,
      unreadable: isNum(rep.unreadable) ? rep.unreadable : 0, ids: reportedIds, counted: false },
    notYetInvoicedIds: uniq(arr(rev.notYetInvoiced && rev.notYetInvoiced.contributors).map(clean)),
  };
}

/* ------------------------------------------------------------------ revenue by class (passed through) */
function classesOf(rev) {
  const C = obj(rev.classes);
  if (!C.classes) return { status: 'NOT_AVAILABLE', rows: [] };
  const rows = Object.entries(obj(C.classes)).map(([key, c]) => ({ key, label: clean(c.label), booked: centsOf(c.booked), invoiced: centsOf(c.invoiced),
    received: centsOf(c.received), outstanding: centsOf(c.outstanding) }));
  const china = obj(C.china);
  rows.push({ key: 'CHINA', label: clean(china.label) || 'China trip', booked: centsOf(china.booked), invoiced: centsOf(china.invoiced),
    received: centsOf(china.received), outstanding: centsOf(china.outstanding), outsideWeddingBudget: true });
  const total = obj(C.totalGuestBilling);
  return { status: C.complete === false ? 'PARTIAL' : 'OK', complete: C.complete !== false, rows,
    total: { booked: centsOf(total.booked), invoiced: centsOf(total.invoiced), received: centsOf(total.received), outstanding: centsOf(total.outstanding) } };
}

/* ------------------------------------------------------------------ hotels */
function hotelRow(h, den) {
  const r = h.revenue && typeof h.revenue === 'object' ? h.revenue : null;
  const booked = r ? centsOf(r.booked) : null;
  return {
    id: clean(h.id), name: clean(h.name), location: clean(h.location) || null, china: !!h.china,
    revenue: r ? { booked, invoiced: centsOf(r.invoiced), received: centsOf(r.received), outstanding: centsOf(r.outstanding),
      notSplit: isNum(r.notSplit) ? r.notSplit : 0, complete: r.complete !== false } : null,
    revenueShare: booked == null || !(den > 0) ? { pct: null, status: booked == null ? 'NOT_AVAILABLE' : 'NO_BASE' } : { num: booked, den, pct: pct(booked, den), status: 'OK' },
    forecast: centsOf(h.forecast),
    committed: moneyList(h.committed), paid: moneyList(h.paid),
    paidShare: moneyList(h.committed).map((c) => { const p = moneyList(h.paid).find((x) => x.currency === c.currency);
      return { currency: c.currency, pct: p ? pct(p.cents, c.cents) : 0 }; }),
  };
}
function hotelsOfReport(rev) {
  const B = obj(rev.budget), R = obj(B.report), H = R.byHotel && typeof R.byHotel === 'object' ? R.byHotel : null;
  if (!B.available || !H) return { status: 'NOT_AVAILABLE', why: clean(B.gap) || 'the hotel report is not available just now', wedding: [], china: [] };
  const X = obj(H.reconciliation);
  /* the wedding hotels' share rests on the server's own total of the hotels' guest billing; the China trip has its own 100 % */
  const weddingDen = isNum(X.revenueHotelsCents) ? X.revenueHotelsCents : null;
  const chinaRows = arr(H.china);
  const chinaDen = chinaRows.length && chinaRows.every((h) => h.revenue && isNum(centsOf(h.revenue.booked)))
    ? chinaRows.reduce((n, h) => n + centsOf(h.revenue.booked), 0) : null;
  const wedding = arr(H.wedding).map((h) => hotelRow(h, weddingDen));
  const forecasts = wedding.map((h) => h.forecast);
  const forecastDen = forecasts.length && forecasts.every(isNum) ? forecasts.reduce((n, c) => n + c, 0) : null;
  wedding.forEach((h) => { h.forecastShare = h.forecast == null || !(forecastDen > 0) ? { pct: null, status: 'NOT_AVAILABLE' } : { pct: pct(h.forecast, forecastDen), status: 'OK' }; });
  /* the suppliers' open balance is the server's own reading of 007 (budget.suppliers) — never committed − paid in the client */
  const suppliers = arr(B.suppliers).map((s) => ({ vendor: clean(s.vendor), category: clean(s.category), contract: s.contract && isNum(s.contract.cents) ? { currency: clean(s.contract.currency), cents: s.contract.cents } : null,
    paid: moneyList(s.paidCounted), outstanding: s.outstanding && isNum(s.outstanding.cents) ? { currency: clean(s.outstanding.currency), cents: s.outstanding.cents } : null,
    outstandingWhy: s.outstanding ? null : clean(s.outstandingWhy) || null }));
  return { status: H.complete === false || X.revenueAgree === false ? 'PARTIAL' : 'OK', wedding, china: chinaRows.map((h) => hotelRow(h, chinaDen)),
    weddingBase: weddingDen == null ? 'NOT_AVAILABLE' : 'WEDDING_HOTELS_GUEST_BILLING', chinaBase: chinaDen == null ? 'NOT_AVAILABLE' : 'CHINA_HOTELS_GUEST_BILLING',
    shareDecision: 'E14', budgetDecision: 'E29', suppliers };
}

/* ------------------------------------------------------------------ the Souphattra per night */
export function souphattraCapacity() { return Object.keys(CATEGORY_TYPES).reduce((n, c) => n + roomsInCategory(c), 0); }
const addDay = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
function nightsBetween(from, to) { const out = []; if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) return out; for (let d = from; d < to && out.length < 40; d = addDay(d, 1)) out.push(d); return out; }

function souphattraOf(rev) {
  const B = obj(rev.budget), R = obj(B.report), stays = arr(R.hotel);
  const capacity = souphattraCapacity();
  const mine = stays.filter((s) => SOUPHATTRA_STAYS.includes(clean(s.stay)));
  if (!B.available || !mine.length) return { status: 'NOT_AVAILABLE', why: clean(B.gap) || 'the room plan of the Souphattra is not available just now', capacity: { rooms: capacity, status: 'PROVISIONAL', decision: 'E15a' }, nights: [] };
  /* our allocation per stay: the website's own room quotas of that stay (002, budget.inventory) — beside the house, never instead */
  const inv = arr(B.inventory);
  const allocationOf = (stay) => { const q = inv.filter((x) => clean(x.centre) === stay && clean(x.unit).toUpperCase() !== 'PERSON').map((x) => x.quota);
    return q.length && q.every(isNum) ? q.reduce((n, v) => n + v, 0) : null; };
  const nights = [];
  for (const s of mine) for (const night of nightsBetween(clean(s.from), clean(s.to))) {
    const bought = isNum(s.roomsBought) ? s.roomsBought + (isNum(s.roomsAdditional) ? s.roomsAdditional : 0) : null;
    nights.push({ night, stay: clean(s.stay), allocation: allocationOf(clean(s.stay)), bought, occupied: isNum(s.roomsOccupied) ? s.roomsOccupied : null,
      boughtEmpty: isNum(s.emptyBought) ? s.emptyBought : null, guests: isNum(s.guests) ? s.guests : null,
      shareBought: countShare(bought, capacity, 'HOUSE_CAPACITY'), shareOccupied: countShare(isNum(s.roomsOccupied) ? s.roomsOccupied : null, capacity, 'HOUSE_CAPACITY'),
      thirdParty: { value: null, status: 'UNKNOWN', decision: 'E15b' } });
  }
  nights.sort((a, b) => (a.night < b.night ? -1 : a.night > b.night ? 1 : 0));
  const sumOf = (k) => (nights.every((n) => isNum(n[k])) ? nights.reduce((t, n) => t + n[k], 0) : null);
  return { status: 'OK', capacity: { rooms: capacity, status: 'PROVISIONAL', decision: 'E15a' }, nights, allocationDecision: 'E19a',
    total: { capacityRoomNights: capacity * nights.length, boughtRoomNights: sumOf('bought'), occupiedRoomNights: sumOf('occupied') },
    otherHotels: stays.filter((s) => !SOUPHATTRA_STAYS.includes(clean(s.stay))).map((s) => ({ stay: clean(s.stay), place: clean(s.place), from: clean(s.from), to: clean(s.to),
      occupied: isNum(s.roomsOccupied) ? s.roomsOccupied : null, guests: isNum(s.guests) ? s.guests : null, capacity: { status: 'NOT_DOCUMENTED' },
      /* U Sathorn: a block of rooms bought, or only the rooms occupied? (E19c) — said, never assumed */
      ...(clean(s.stay) === 'A2' ? { blockDecision: 'E19c' } : {}) })) };
}

/* ------------------------------------------------------------------ legs and the offering */
function legsOf(rev) {
  const B = obj(rev.budget), centres = arr(B.centres), quota = arr(rev.quotaUtilisation), inv = arr(B.inventory);
  if (!B.available) return { status: 'NOT_AVAILABLE', why: clean(B.gap) || 'the legs are not available just now', rows: [] };
  const rows = centres.filter((c) => c && c.kind === 'ROUTE').map((c) => {
    const lines = arr(c.guest);
    /* one meter per item (a train, a van …): its persons against its own 002 quota — the quotas of services the same people
       use one after another are never added up */
    const items = arr(c.items).map((itemId) => {
      const q = quota.find((x) => clean(x.Item_ID) === clean(itemId)) || null, nm = inv.find((x) => clean(x.Item_ID) === clean(itemId));
      const its = lines.filter((l) => clean(l && l.item) === clean(itemId));
      const ids = uniq(its.map((l) => clean(l.person)));
      const quotaN = q && isNum(q.Quota) ? q.Quota : null;
      return { itemId: clean(itemId), name: clean(nm && nm.name) || clean(its[0] && its[0].itemName) || clean(itemId), persons: ids.length, ids, quota: quotaN,
        share: quotaN ? countShare(ids.length, quotaN, 'QUOTA_002') : { pct: null, status: 'NO_QUOTA' }, overQuota: !!(q && q.overQuota) };
    }).filter((x) => x.persons > 0 || x.quota != null);
    const outside = c.status === 'OUTSIDE';
    const ids = uniq(lines.map((l) => clean(l && l.person)));
    return { id: clean(c.id), place: clean(c.place), from: clean(c.from) || null, to: clean(c.to) || null,
      kind: outside ? 'GUEST_BOOKS' : 'HS_BUYS', items: outside ? [] : items,
      /* a leg the guests book themselves is not in our figures: no count, said as such */
      persons: outside ? null : ids.length, ids: outside ? [] : ids, status: outside ? 'NOT_RECORDED' : 'OK' };
  });
  return { status: 'OK', rows };
}
function offeringOf(rev) {
  const extras = arr(rev.breakdown && rev.breakdown.extras);
  const x = extras.find((e) => /TEMPLE-OFFERING/.test(clean(e.Item_ID)));
  return x ? { persons: isNum(x.persons) ? x.persons : null, status: 'OK', note: 'NOT_THE_ATTENDANCE_COUNT' } : { persons: null, status: 'NOT_AVAILABLE' };
}

export function quickFinanceOf(rev) {
  const R = obj(rev);
  return {
    version: QUICK_OVERVIEW_VERSION,
    stamp: { calculatedAt: clean(R.calculatedAt) || null, asOf: clean(R.asOf) || null },
    finance: financeOf(R),
    classes: classesOf(R),
    hotels: hotelsOfReport(R),
    souphattra: souphattraOf(R),
    legs: legsOf(R),
    offering: offeringOf(R),
    defaults: PROVISIONAL_DEFAULTS,
  };
}

/* ================================================================== participation */
const CITY = { 'bkk-stay': 'BANGKOK', prewed: 'VIENTIANE', wedstay: 'VIENTIANE', guesthouse: 'VIENTIANE', kmg: 'CHINA', ljg: 'CHINA', kempinski: 'BANGKOK' };
const RECEIVED = /^(received|provided|replaced|reviewed)$/i;
const TABLE_PRODUCTS = ['1872', 'tea1872'];

/* one guest's answers as sent — the same reading as the profile and Guest Relations' e-mail (journeyModel) */
function answersOf(record) {
  if (!record || !record.submissionId || !record.registration) return null;
  let M; try { M = journeyModel(record); } catch (e) { return { unreadable: true }; }
  const ans = {}; for (const e of arr(M.wedding)) ans[e.key] = clean(e.answer);
  const reg = record.registration, docsList = reg.documents && Array.isArray(reg.documents.guests) && reg.documents.guests[0] && Array.isArray(reg.documents.guests[0].documents)
    ? reg.documents.guests[0].documents : [];
  const docs = {};
  for (const d of docsList) { const k = clean(d && d.kind); if (!k) continue; docs[k] = { received: RECEIVED.test(clean(d.state)), receivedAt: RECEIVED.test(clean(d.state)) ? clean(d.receivedAt).slice(0, 10) || null : null }; }
  const allergy = /^yes\b/i.test(clean(M.allergy)) ? 'YES' : /^no\b/i.test(clean(M.allergy)) ? 'NO' : 'NOT_ANSWERED';
  const sang = clean(M.sangkhathanState);
  return { away: !!M.away, notJoining: !!M.notJoining, events: ans, finale: /pool/i.test(clean(M.finale)) ? 'POOL' : /baron/i.test(clean(M.finale)) ? 'BARON' : clean(M.finale) ? 'OTHER' : '',
    sangkhathan: /^Yes\b/.test(sang) ? 'Selected' : sang || '',
    requests: arr(M.experiences).filter((x) => x && (x.request || x.interest)).map((x) => ({ id: clean(x.id), name: clean(x.name), kind: x.interest ? 'INTEREST' : 'REQUEST' })),
    docs, allergy };
}
const answerWord = (v) => (v === 'Joining' ? 'yes' : v === 'Not joining' ? 'no' : v ? 'undecided' : 'undecided');

export function participationOf(input) {
  const I = obj(input);
  const roster = arr(I.roster), records = obj(I.records), seating = obj(I.seating), stays = arr(I.stays);
  const byG = {}; for (const r of roster) if (r && r.guestId) byG[r.guestId] = r;
  const A = {}; let unreadable = 0;
  for (const r of roster) { const a = answersOf(records[r.invitationId]); if (a && a.unreadable) unreadable += 1; A[r.guestId] = a && !a.unreadable ? a : null; }
  const ids = (pred) => roster.filter(pred).map((r) => r.guestId).sort();

  /* people and the RSVP state (assignments.bookingStateOf — the booking system's own words) */
  const states = ['CONFIRMED', 'SENT', 'DECLINED', 'NOT_SENT'];
  const booking = Object.fromEntries(states.map((s) => [s, ids((r) => r.booking === s)]));
  const couple = ids((r) => !!r.couple || r.hosts === true);
  const households = new Set(roster.map((r) => clean(r.partyId) || r.guestId)).size;
  const partyOf = new Map(); for (const r of roster) partyOf.set(clean(r.partyId) || r.guestId, (partyOf.get(clean(r.partyId) || r.guestId) || 0) + 1);
  const bySize = {}; for (const n of partyOf.values()) { const k = String(n); bySize[k] = (bySize[k] || 0) + 1; }   /* households per size */
  const declinedBoth = ids((r) => r.booking === 'CONFIRMED' && r.attendance && r.attendance.ceremony === 'no' && r.attendance.dinner === 'no' && r.attendance.wedding !== false);

  /* the wedding moments — the temple and coffee answers as sent; the vow ceremony and the dinner as the seating ledger reads them */
  const eventOf = (key) => {
    const out = { yes: [], no: [], away: [], undecided: [], notSent: [] };
    for (const r of roster) {
      if (r.booking === 'NOT_SENT' && !(r.hosts === true || r.couple)) { out.notSent.push(r.guestId); continue; }
      if (r.hosts === true || r.couple) { out.yes.push(r.guestId); continue; }
      const a = A[r.guestId];
      if (!a) { out.undecided.push(r.guestId); continue; }
      if (a.away || a.notJoining) { out.away.push(r.guestId); continue; }
      out[answerWord(a.events[key])].push(r.guestId);
    }
    Object.values(out).forEach((l) => l.sort());
    return out;
  };
  const seatEvent = (ev) => {
    const E = obj(seating.events && seating.events[ev]), seats = arr(E.seats), cap = obj(seating.capacity && seating.capacity[ev]);
    const holders = uniq(seats.filter((s) => s && s.guestId && s.state !== 'available').map((s) => clean(s.guestId)));
    const couplePlaces = ev === 'ceremony' ? (isNum(cap.couple) ? cap.couple : 0) : 0;
    const seated = holders.length + couplePlaces;
    const answer = { yes: [], no: [], undecided: [], notSent: [] };
    for (const r of roster) { const w = r.attendance ? r.attendance[ev] : 'undecided'; (answer[w === 'not-sent' ? 'notSent' : w] || answer.undecided).push(r.guestId); }
    const seatOf = new Set(holders);
    const joiningNoSeat = roster.filter((r) => !(r.hosts === true || r.couple) && r.attendance && r.attendance[ev] === 'yes' && !seatOf.has(r.guestId)).map((r) => r.guestId).sort();
    const seatNotJoining = roster.filter((r) => seatOf.has(r.guestId) && r.attendance && r.attendance[ev] === 'no').map((r) => r.guestId).sort();
    const total = isNum(cap.totalPeople) ? cap.totalPeople : null;
    const held = (re) => seats.filter((s) => s && s.guestId && s.state !== 'available' && re.test(clean(s.seatId))).length;
    /* a chair a legacy family flag keeps is nobody's seat and not free either (src/seating.js: no family mechanism any more) */
    const familyHeld = seats.filter((s) => s && !s.guestId && s.state === 'family').length;
    const sides = ev === 'ceremony' ? { L: { cap: isNum(cap.left) ? cap.left : null, seated: held(/^C-L-/) }, R: { cap: isNum(cap.right) ? cap.right : null, seated: held(/^C-R-/) } }
      : { A: { cap: isNum(cap.top) ? cap.top : null, seated: held(/^D-T-/) }, B: { cap: isNum(cap.bottom) ? cap.bottom : null, seated: held(/^D-B-/) } };
    for (const k of Object.keys(answer)) answer[k].sort();
    const out = { capacity: total, seated, familyHeld, free: total == null ? null : total - seated - familyHeld, share: countShare(seated, total, 'SYSTEM_CAPACITY'), seatedIds: holders,
      couplePlaces, sides, answer, joiningNoSeat, seatNotJoining, final: !!(E.final && E.final.active !== false && E.final.current !== false), open: !!seating.open,
      placedByOwners: seats.filter((s) => s.state === 'allocated' && /^owners:/.test(clean(s.by))).length, basis: 'SEATING_LEDGER' };
    if (ev === 'dinner') out.capacityDecision = { id: 'E16', alternative: OWNER_DINNER_ALTERNATIVE, freeAtAlternative: OWNER_DINNER_ALTERNATIVE - seated,
      overAlternative: Math.max(0, seated - OWNER_DINNER_ALTERNATIVE), status: 'PENDING' };
    return out;
  };

  /* the finale, the offering as sent, the requests */
  const finale = { pool: ids((r) => A[r.guestId] && A[r.guestId].finale === 'POOL'), baron: ids((r) => A[r.guestId] && A[r.guestId].finale === 'BARON') };
  /* the offering's states are a fixed list — a guest's own value is never a key of its own */
  const SANG = ['Selected', 'Not selected', 'Decision required', 'Not eligible', 'Not available yet', 'Not applicable', 'Not answered', 'Not sent', 'Other'];
  const sangkhathan = {}; SANG.forEach((k) => { sangkhathan[k] = []; });
  for (const r of roster) { const a = A[r.guestId]; let k = a && a.sangkhathan ? a.sangkhathan : (a ? 'Not answered' : 'Not sent'); if (SANG.indexOf(k) < 0) k = 'Other'; sangkhathan[k].push(r.guestId); }
  SANG.forEach((k) => { if (!sangkhathan[k].length) delete sangkhathan[k]; });
  const reqMap = new Map();
  for (const r of roster) { const a = A[r.guestId]; if (!a) continue; for (const q of a.requests) {
    const key = TABLE_PRODUCTS.includes(q.id) ? '1872' : q.id || q.name;
    if (!reqMap.has(key)) reqMap.set(key, { id: key, name: q.name, kind: q.kind, ids: [], parties: new Set(), table: TABLE_PRODUCTS.includes(q.id) });
    const m = reqMap.get(key); m.ids.push(r.guestId); m.parties.add(clean(r.partyId) || r.guestId); } }
  const requests = [...reqMap.values()].map((m) => ({ id: m.id, name: m.name, kind: m.kind, persons: m.table ? null : uniq(m.ids).length, tables: m.table ? m.parties.size : null,
    ids: uniq(m.ids), basis: 'AS_SENT', status: 'REQUEST_NOT_A_RESERVATION' })).sort((a, b) => (a.name < b.name ? -1 : 1));

  /* persons per night and city, first and last night — from the room plan only (a self-booked stay is not in it) */
  const nightsOf = {};   /* guestId → [{ night, city }] */
  const allNights = new Set(), undated = new Set();
  for (const s of stays) for (const c of arr(s.categories)) {
    const nights = nightsBetween(clean(c.checkIn), clean(c.checkOut));
    for (const u of arr(c.units)) for (const o of arr(u.occupants)) {
      if (!o || !o.guestId) continue;
      /* a room whose dates 002 does not give just now: the guest has a room, the nights are unknown — never "no room" */
      if (!nights.length) { undated.add(o.guestId); continue; }
      for (const night of nights) { allNights.add(night); (nightsOf[o.guestId] = nightsOf[o.guestId] || []).push({ night, city: CITY[clean(s.window)] || 'OTHER' }); }
    }
  }
  const dates = [...allNights].sort();
  const presence = dates.map((night) => {
    const per = { BANGKOK: [], VIENTIANE: [], CHINA: [], OTHER: [] };
    for (const [g, list] of Object.entries(nightsOf)) { const hit = list.find((x) => x.night === night); if (hit) per[hit.city].push(g); }
    Object.values(per).forEach((l) => l.sort());
    return { night, BANGKOK: per.BANGKOK, VIENTIANE: per.VIENTIANE, CHINA: per.CHINA, OTHER: per.OTHER, total: Object.values(per).reduce((n, l) => n + l.length, 0) };
  });
  const firstLast = Object.entries(nightsOf).map(([g, list]) => { const s = list.map((x) => x.night).sort(); const first = list.find((x) => x.night === s[0]);
    return { g, first: s[0], firstCity: first ? first.city : 'OTHER', last: s[s.length - 1] }; });
  const arrivals = {}, departures = {};
  for (const f of firstLast) { (arrivals[f.first] = arrivals[f.first] || { date: f.first, ids: [], byCity: {} }).ids.push(f.g); arrivals[f.first].byCity[f.firstCity] = (arrivals[f.first].byCity[f.firstCity] || 0) + 1;
    const out = addDay(f.last, 1); (departures[out] = departures[out] || { date: out, ids: [] }).ids.push(f.g); }
  const movements = { arrivals: Object.values(arrivals).map((a) => ({ ...a, ids: a.ids.sort(), n: a.ids.length })).sort((a, b) => (a.date < b.date ? -1 : 1)),
    departures: Object.values(departures).map((d) => ({ ...d, ids: d.ids.sort(), n: d.ids.length })).sort((a, b) => (a.date < b.date ? -1 : 1)),
    /* from the room engine itself (roster[].rooms), not from dated nights */
    withoutRoom: ids((r) => !(Array.isArray(r.rooms) && r.rooms.length) && r.booking !== 'NOT_SENT' && r.booking !== 'DECLINED'), basis: 'ROOM_PLAN',
    status: undated.size ? 'PARTIAL' : 'OK', undatedIds: [...undated].sort() };

  /* the documents and the food-allergy answer as sent — never a file name, a key or the allergy's text */
  const docKinds = ['passport', 'flight'];
  const documents = Object.fromEntries(docKinds.map((k) => {
    const sent = roster.filter((r) => A[r.guestId]);
    const got = sent.filter((r) => A[r.guestId].docs[k] && A[r.guestId].docs[k].received);
    return [k, { received: got.map((r) => r.guestId).sort(), notReceived: sent.filter((r) => !got.includes(r)).map((r) => r.guestId).sort(), notSent: ids((r) => !A[r.guestId]),
      basis: 'AS_SENT', optional: true }];
  }));
  const allergy = { yes: ids((r) => A[r.guestId] && A[r.guestId].allergy === 'YES'), no: ids((r) => A[r.guestId] && A[r.guestId].allergy === 'NO'),
    notAnswered: ids((r) => A[r.guestId] && A[r.guestId].allergy === 'NOT_ANSWERED'), notSent: ids((r) => !A[r.guestId]), basis: 'AS_SENT' };

  /* checks the Owners asked about (E27) — guest ids only, no correction. The train passengers without a room on their night of
     arrival are matched in the console: the passengers come from the revenue answer, the nights from this room plan */
  const flags = { confirmedBothEventsDeclined: declinedBoth, decision: 'E27' };

  return {
    version: QUICK_OVERVIEW_VERSION, basis: 'AS_SENT', unreadable,
    /* what the route could not read just now (Google out of reach, 002 dates) — said on the page, never hidden */
    gaps: arr(I.gaps).map((g) => clean(g).slice(0, 200)).slice(0, 5),
    people: { invited: roster.length, couple: couple.length, coupleIds: couple, households, householdsBySize: bySize, booking,
      tripSent: roster.length - booking.NOT_SENT.length },
    events: { temple: { ...eventOf('temple'), capacity: null, capacityStatus: 'NOT_DOCUMENTED', decision: 'E20' },
      coffee: { ...eventOf('coffee'), capacity: null, capacityStatus: 'NOT_DOCUMENTED', decision: 'E20' },
      ceremony: seatEvent('ceremony'), dinner: seatEvent('dinner') },
    finale: { ...finale, capacityStatus: 'NOT_DOCUMENTED', decision: 'E20' },
    sangkhathan,
    requests,
    presence, movements,
    care: { documents, allergy },
    flags,
    transport: { flights: { status: 'NOT_RECORDED', decision: 'E22' }, vehicles: { status: 'NOT_COMPUTABLE', decision: 'E21',
      missing: ['seats per van', 'luggage capacity', 'bags per guest', 'Guest Relations team size'] } },
    defaults: PROVISIONAL_DEFAULTS,
  };
}
