/* ============================================================================
   H&S WEDDING 2027 — GUEST ARRIVALS & TRANSPORTATION · the Worker's half (HS-059 · Owners, 24 Nov 2026)

   "EVERY NUMBER MUST BE TRACEABLE TO ACTUAL GUEST NAMES. EVERY KNOWN GUEST MUST BE TRACKED, INCLUDING THOSE TRAVELLING OR STAYING
   INDEPENDENTLY. WE NEED TO KNOW WHO IS WHERE, WHEN THEY ARRIVE, WHERE THEY STAY AND WHEN THEY LEAVE."

   PURE: shapes what GET admin/arrivals (src/billing-routes.js · BILLING_ADMIN only) read — nothing is read, written or stored here.
   LIGHT BY DESIGN (Owners: "within the existing Cloudflare Workers resource limits"): the read comes in small parts, like the
   console's guest checks —
     · the base     the served index's guests, the Rooms engine's room plan (real occupants only — a kept place is nobody), the
                    hotel's own room numbers, 002's dates, the Owners' room list 012 and the bookings the Owners recorded;
     · the facts    of at most ARRIVAL_FACTS_MAX invitations per request: their own sent trip (reg:) and, only where it decides the
                    state, its confirmation (conf:) — the booking state, the parts joined as sent, the legs, the flight document.
   The console (assets/arrivals-model.js) puts them together: nights, days, lists and checks. One source, no second database.

   NAME-FREE: guest ids only; the console names them from its own guest list. The one exception is 012's `typed` — the names exactly
   as the Owners typed them in 012, shown as such and never used to match anything (012 is compared by HOTEL ROOM NUMBER and night).
   ========================================================================== */

import { guestsOfIndex, coupleOfEntries, bookingStateOf, GUEST_ID_RE, STAYS } from './assignments.js';
import { hotelRoomOf } from '../hotel-rooms.js';
import { normalizeScope } from '../stage-graph.js';
import { date012 } from './finance-report.js';

export const ARRIVALS_VERSION = 'arrivals/1.0.0';
export const ARRIVAL_FACTS_MAX = 12;
const clean = (v) => (v == null ? '' : String(v)).trim();
const arr = (v) => (Array.isArray(v) ? v : []);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const ISO = /^\d{4}-\d{2}-\d{2}$/;
/* G001 < G099 < G100 < G1000 — never a locale (no ICU on a read path) */
export const byId = (a, b) => { const x = clean(a), y = clean(b); return x.length - y.length || (x < y ? -1 : x > y ? 1 : 0); };
const sortIds = (l) => [...new Set(l)].sort(byId);

/* the stay windows and the legs of the journey (src/stage-graph.js · STAGES) — the console's model reads the same names */
export const PLACE_OF = Object.freeze({ 'bkk-stay': 'BANGKOK', kempinski: 'BANGKOK', prewed: 'VIENTIANE', wedstay: 'VIENTIANE', guesthouse: 'VIENTIANE', kmg: 'CHINA', ljg: 'CHINA' });
export const LEG_KEYS = Object.freeze(['train', 'mu9646', 'c86', 'return']);
const RECEIVED = /^(received|provided|replaced|reviewed)$/i;
const windowOf = (key) => clean(key).split('/')[0];

/* the confirmation decides a state only for a trip sent and not declined (bookingStateOf answers NOT_SENT / DECLINED first) */
export function confirmationNeeded(record) {
  if (!record || !record.submissionId) return false;
  const gr = obj(record.registration && record.registration.guestRecord);
  return !(gr.scope && gr.scope.none);
}

/** One invitation's facts from its own sent trip and confirmation — nothing else of the trip leaves the Worker. */
export function factsOf(record, conf) {
  const booking = bookingStateOf(record, conf);
  if (!record || !record.submissionId) return { booking, sent: null, legs: [], stays: [], flightDoc: null, confirmedAt: null };
  const reg = obj(record.registration), gr = obj(reg.guestRecord), stages = obj(reg.stages);
  const words = {};
  for (const [k, v] of Object.entries(stages)) if (/^(selected|waitlisted|declined|open)$/.test(clean(v))) words[k] = clean(v);
  const scope = normalizeScope(gr.scope, { prewed: words.prewed || null });
  /* the lines the guest sent (an interest or a request is no booking) */
  const lines = arr(reg.selections).filter((l) => l && typeof l === 'object' && !l.interest && !l.request).map((l) => clean(l.id));
  const docs = reg.documents && Array.isArray(reg.documents.guests) && reg.documents.guests[0] && Array.isArray(reg.documents.guests[0].documents) ? reg.documents.guests[0].documents : [];
  const fl = docs.find((d) => d && clean(d.kind) === 'flight');
  return {
    booking, confirmedAt: booking === 'CONFIRMED' && conf ? clean(conf.confirmedAt) || null : null,
    sent: { version: Number(record.version || 1), lastSentAt: clean(record.lastSentAt || record.submittedAt) || null,
      scope: scope ? Object.fromEntries(['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china', 'none'].map((k) => [k, !!scope[k]])) : null, stages: words },
    legs: sortIds(lines.filter((id) => LEG_KEYS.includes(id))), stays: [...new Set(lines.filter((id) => PLACE_OF[id]))],
    flightDoc: fl && RECEIVED.test(clean(fl.state)) ? 'RECEIVED' : 'NOT_ADDED',
  };
}

/** The room plan as the overview needs it: real occupants only (a kept place `~…` is counted apart), ids only, the hotel's numbers. */
export function planOf(plan) {
  if (!plan || typeof plan !== 'object' || !plan.units) return null;
  const assigned = plan.hotelRooms && plan.hotelRooms.rooms ? plan.hotelRooms.rooms : {};
  const units = [];
  for (const [key, list] of Object.entries(plan.units)) {
    const w = windowOf(key); if (!PLACE_OF[w]) continue;
    for (const u of arr(list)) {
      const occ = arr(u.occupants).filter((o) => o && GUEST_ID_RE.test(clean(o.guestId)));
      const hr = hotelRoomOf(key, u.label, assigned);
      units.push({ key, window: w, label: clean(u.label), kind: clean(u.kind) || null, places: Number(u.places) || 0,
        kept: arr(u.occupants).filter((o) => o && !GUEST_ID_RE.test(clean(o.guestId))).length,
        hotelRoom: hr ? { display: hr.display, numbers: hr.numbers, building: hr.building, type: hr.type } : null,
        occupants: occ.map((o) => ({ guestId: clean(o.guestId), ...(o.bed ? { bed: true } : {}) })).sort((a, b) => byId(a.guestId, b.guestId)) });
    }
  }
  const waitlist = arr(plan.waitlist).filter((w) => w && GUEST_ID_RE.test(clean(w.guestId))).map((w) => ({ stage: clean(w.stage), guestId: clean(w.guestId), position: w.position || null }));
  return { units, waitlist };
}

/** 012 rows with readable dates (ISO, '' → null, unreadable → 'BAD') and their room numbers as a set (a suite "210 / 211"). */
export function list012Of(rows) {
  if (!Array.isArray(rows)) return null;
  return rows.map((r) => {
    const typed = arr(r.guests).map(clean).filter(Boolean);
    return { row: r.row, building: clean(r.building) || null, roomType: clean(r.roomType) || null, roomNo: clean(r.roomNo) || null,
      numbers: clean(r.roomNo).split(/\s*(?:\/|\+|,|&|\band\b)\s*/).map(clean).filter(Boolean).sort(),
      checkIn: date012(r.checkIn), checkOut: date012(r.checkOut), typed };
  }).filter((r) => r.typed.length || r.checkIn);   /* a free room of the list says nothing about a guest */
}

/** The base answer: who the guests are, the room plan, the dates, 012 and the Owners' records — no trip is read here. */
export function arrivalsBase({ entries, plan, dates, list012, owner, gaps }) {
  const index = guestsOfIndex(entries), couple = coupleOfEntries(entries) || {};
  const role = {}; for (const [k, c] of Object.entries(couple)) if (c && c.g) role[c.g] = k;
  const guests = Object.values(index).filter((g) => !g.ambiguous).map((g) => ({ guestId: g.guestId, invitationId: g.invitationId, partyId: g.partyId, couple: role[g.guestId] || null }))
    .sort((a, b) => byId(a.guestId, b.guestId));
  /* 002's dates of the stays and legs only */
  const D = {};
  if (dates) for (const [key, d] of Object.entries(dates)) if ((PLACE_OF[windowOf(key)] || LEG_KEYS.includes(key)) && d) D[key] = { item: d.item || null, checkIn: ISO.test(clean(d.checkIn)) ? d.checkIn : null, checkOut: ISO.test(clean(d.checkOut)) ? d.checkOut : null, nights: d.nights == null ? null : d.nights };
  return {
    version: ARRIVALS_VERSION, guests, ambiguous: sortIds(Object.values(index).filter((g) => g.ambiguous).map((g) => g.guestId)),
    plan: planOf(plan), dates: dates ? D : null, list012: list012Of(list012), owner: owner || {},
    stays: STAYS.map((s) => ({ window: s.window, place: PLACE_OF[s.window], label: s.label, hotel: s.hotel })),
    gaps: arr(gaps).map((g) => clean(g).slice(0, 200)).slice(0, 6),
  };
}
