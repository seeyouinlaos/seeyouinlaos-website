/* ============================================================================
   SEE YOU IN LAOS — THE OWNERS' SEATING & ROOM ASSIGNMENTS (Owners, 18 Nov 2026 · EMERGENCY P1).

   The admin console's central view of who sits where at the Vow Ceremony and the Wedding Dinner and who sleeps in which room —
   for Haruthai and Suthep, without anyone's code and without signing in as a guest. PURE: everything here shapes what the
   routes (src/billing-routes.js · BILLING_ADMIN only) already read; nothing is read, written or stored by this file.

   ONE SOURCE, NO SECOND DATABASE. The seats are the seating ledger's (src/seating.js), the rooms the room engine's
   (src/rooms.js), the guests the register's (the served index · 006 names), the answers and the booking state the guest's own
   sent trip (reg:<INV>) and its confirmation (conf:<INV>). A change the Owners confirm is written to the ledger / the engine and
   nowhere else, so the guest's profile, the booking engine, the plans and every export read the same state at once.

   NEVER A PRICE, A RATE, AN INVOICE OR A PAYMENT: nothing here reads 009 or 012, nothing computes an amount. Google 002 is read
   for a stay's dates only, 006 for names only.
   ========================================================================== */

import { confirmationStands } from '../confirmation.js';

export const ASSIGNMENTS_VERSION = 'assignments/1.0.0';
const clean = (v) => (v == null ? '' : String(v)).trim();
const INV_RE = /^INV-[A-Z0-9-]+$/;
export const GUEST_ID_RE = /^G\d{3,}$/;
export const SEAT_ID_RE = /^C-[LR]-\d{2}-\d{2}$|^D-[TB]-\d{2}$/;

/* THE EVENTS (assets/temple.js · the active wedding programme, 28 February 2027) — the seating ledger's two events */
export const EVENTS = Object.freeze({
  ceremony: { name: 'Vow Ceremony', date: '2027-02-28', time: '15:30', dateWords: 'Sunday, 28 February 2027 · 15:30', venue: 'Souphattra Heritage Vientiane', answer: 'vows' },
  dinner: { name: 'Wedding Dinner', date: '2027-02-28', time: '19:30', dateWords: 'Sunday, 28 February 2027 · 19:30', venue: 'Souphattra Heritage Vientiane · poolside', answer: 'dinner' },
});
/* the stays of the room engine (a window is the first segment of a key), with the hotel the 002 / budget map names */
export const STAYS = Object.freeze([
  { window: 'bkk-stay', stage: 'bkk-stay', label: 'Bangkok', hotel: 'U Sathorn Bangkok' },
  { window: 'prewed', stage: 'prewed', label: 'Vientiane · before the wedding', hotel: 'Souphattra Heritage Vientiane' },
  { window: 'wedstay', stage: 'wedstay', label: 'Vientiane · the wedding', hotel: 'Souphattra Heritage Vientiane' },
  { window: 'guesthouse', stage: 'wedstay', label: 'Vientiane · the wedding', hotel: 'Guest House complimentary · Vientiane' },
  { window: 'kmg', stage: 'kmg', label: 'Kunming', hotel: 'Yifangju Designer Courtyard, Kunming' },
  { window: 'ljg', stage: 'ljg', label: 'Lijiang', hotel: 'Luye Baisha, Lijiang' },
  { window: 'kempinski', stage: 'kempinski', label: 'Back in Bangkok', hotel: 'Hotel Muse Bangkok' },
]);

/* the register's Bride and Groom (h = 1 · r = B / G), for the seating ledger's x-siyl-couple — never from a name */
const COUPLE_NAMES = { B: 'Haruthai', G: 'Suthep' };
export function coupleOfEntries(entries) {
  const out = {};
  for (const e of Object.values(entries || {})) {
    if (!e || e.h !== 1 || (e.r !== 'B' && e.r !== 'G') || !e.g) continue;
    out[e.r === 'B' ? 'BRIDE' : 'GROOM'] = { g: String(e.g), p: e.p ? String(e.p) : null, n: COUPLE_NAMES[e.r] };
  }
  return Object.keys(out).length ? out : null;
}

/* every guest of the served index once: guest id → { invitationId, partyId, contactId, hosts, role }; a guest id on two
   invitations is ambiguous and is never resolved (a write naming them is refused) */
export function guestsOfIndex(entries) {
  const out = {};
  for (const e of Object.values(entries || {})) {
    const g = clean(e && e.g), i = clean(e && e.i);
    if (!GUEST_ID_RE.test(g) || !INV_RE.test(i)) continue;
    const row = { guestId: g, invitationId: i, partyId: clean(e.p) || null, contactId: clean(e.c) || null, hosts: e.h === 1, role: e.h === 1 && (e.r === 'B' || e.r === 'G') ? (e.r === 'B' ? 'BRIDE' : 'GROOM') : null };
    out[g] = out[g] && out[g].invitationId !== i ? { ...out[g], ambiguous: true } : row;
  }
  return out;
}

/* the register's name for one 006 ID — first and last apart; an ID on two rows names nobody */
export function personName(register, contactId) {
  const r = register && register[clean(contactId)];
  if (!r || r.ambiguous) return null;
  return { first: clean(r.first) || null, last: clean(r.last) || null, nick: clean(r.nick) && clean(r.nick) !== clean(r.first) ? clean(r.nick) : null };
}

/* the guest's own answer for one event, from the trip they SENT (registration.templeCeremony): yes · no · undecided — or
   not-sent while nothing was sent; a trip that says "not joining us" answers no; the couple always join */
export function attendanceOf(record, guestId, hosts) {
  if (hosts) return { ceremony: 'yes', dinner: 'yes', wedding: true, source: 'the couple' };
  if (!record || !record.submissionId || !record.registration) return { ceremony: 'not-sent', dinner: 'not-sent', wedding: null, source: 'nothing sent yet' };
  const reg = record.registration, gr = reg.guestRecord || {};
  if (gr.scope && gr.scope.none) return { ceremony: 'no', dinner: 'no', wedding: false, source: 'not joining us' };
  const wedding = gr.scope ? gr.scope.vientianeWedding !== false : null;
  const list = reg.templeCeremony && Array.isArray(reg.templeCeremony.guests) ? reg.templeCeremony.guests : [];
  const tc = list.find((x) => x && x.guestId === guestId) || null;
  const word = (v) => (v === 'Joining' ? 'yes' : v === 'Not joining' ? 'no' : 'undecided');
  if (wedding === false) return { ceremony: 'no', dinner: 'no', wedding: false, source: 'not at the wedding in Vientiane' };
  return { ceremony: tc && tc.events ? word(clean(tc.events[EVENTS.ceremony.answer])) : 'undecided', dinner: tc && tc.events ? word(clean(tc.events[EVENTS.dinner.answer])) : 'undecided', wedding, source: 'the sent trip' };
}

/* the booking as the booking system knows it: CONFIRMED (Guest Relations / the Owners confirmed the version sent) · SENT
   (waiting for confirmation) · DECLINED (sent: not joining) · NOT_SENT */
export function bookingStateOf(record, conf) {
  if (!record || !record.submissionId) return 'NOT_SENT';
  const gr = (record.registration && record.registration.guestRecord) || {};
  if (gr.scope && gr.scope.none) return 'DECLINED';
  return confirmationStands(conf, record) ? 'CONFIRMED' : 'SENT';
}

/* the room lines a guest SENT for one room product — the label each carries (a line without one would take its billed room from
   the live engine: such a guest is never moved by an assignment) */
export function sentRoomLines(record, key, canonicalKey) {
  const sels = record && record.registration && Array.isArray(record.registration.selections) ? record.registration.selections : [];
  const canon = typeof canonicalKey === 'function' ? canonicalKey : (k) => k;
  return sels.filter((l) => l && typeof l === 'object' && l.room && !l.interest && canon(clean(l.id) + '/' + clean(l.room)) === key).map((l) => ({ unit: clean(l.unit) || null }));
}

/* THE ROSTER: every guest of the register once, with the seats and rooms the engines hold for them */
export function rosterOf({ entries, register, records, confs, seating, rooms, couple }) {
  const guests = guestsOfIndex(entries);
  const seatOf = { ceremony: {}, dinner: {} }, placedSeat = { ceremony: {}, dinner: {} }, learned = {};
  for (const event of ['ceremony', 'dinner']) for (const s of ((seating && seating.events && seating.events[event] && seating.events[event].seats) || [])) {
    if (!s || !s.guestId) continue;
    seatOf[event][s.guestId] = s.seatId;
    if (s.state === 'allocated' && /^owners:/.test(clean(s.by))) placedSeat[event][s.guestId] = true;
    if (s.name && !learned[s.guestId]) learned[s.guestId] = s.name;
  }
  const roomsOf = {};
  for (const [key, units] of Object.entries((rooms && rooms.units) || {})) for (const u of units || []) for (const o of u.occupants || []) {
    if (!o || !o.guestId) continue;
    (roomsOf[o.guestId] = roomsOf[o.guestId] || []).push({ key, window: key.split('/')[0], label: u.label, kind: u.kind, bed: !!o.bed, placed: /^owners:/.test(clean(o.by)) });
    if (o.name && !learned[o.guestId]) learned[o.guestId] = o.name;
  }
  const party = {};
  for (const g of Object.values(guests)) if (g.partyId) (party[g.partyId] = party[g.partyId] || []).push(g.guestId);
  const firstOf = (g) => { const n = personName(register, guests[g] && guests[g].contactId); return (n && (n.nick || n.first)) || learned[g] || g; };
  const out = Object.values(guests).map((g) => {
    const n = personName(register, g.contactId);
    const rec = records ? records[g.invitationId] || null : null, conf = confs ? confs[g.invitationId] || null : null;
    const coupleRole = couple && Object.keys(couple).find((k) => couple[k] && couple[k].g === g.guestId) || null;
    const members = g.partyId ? (party[g.partyId] || []).filter((x) => x !== g.guestId) : [];
    return {
      guestId: g.guestId, invitationId: g.invitationId, partyId: g.partyId, ambiguous: !!g.ambiguous,
      first: n ? n.first : (learned[g.guestId] || null), last: n ? n.last : null, nick: n ? n.nick : null, named: !!n,
      hosts: g.hosts, couple: coupleRole,
      group: { id: g.partyId, size: members.length + 1, with: members.map(firstOf).sort() },
      booking: bookingStateOf(rec, conf),
      attendance: attendanceOf(rec, g.guestId, g.hosts),
      seats: { ceremony: coupleRole ? coupleRole : seatOf.ceremony[g.guestId] || null, dinner: seatOf.dinner[g.guestId] || null },
      placed: { ceremony: !!placedSeat.ceremony[g.guestId], dinner: !!placedSeat.dinner[g.guestId] },
      rooms: (roomsOf[g.guestId] || []).sort((a, b) => STAYS.findIndex((x) => x.window === a.window) - STAYS.findIndex((x) => x.window === b.window)),
    };
  });
  return out.sort((a, b) => (clean(a.last) + ' ' + clean(a.first)).localeCompare(clean(b.last) + ' ' + clean(b.first)) || a.guestId.localeCompare(b.guestId));
}

/* THE STAYS of the room engine, in journey order: per stay its categories and their rooms — with 002's dates where 002 could be
   read (else null, named) and the guests in each room */
export function staysOf({ rooms, seedNames, datesOf }) {
  const units = (rooms && rooms.units) || {};
  return STAYS.map((st) => {
    const keys = Object.keys(units).filter((k) => k.split('/')[0] === st.window);
    if (!keys.length) return null;
    const cats = keys.map((key) => {
      const d = (datesOf && datesOf[key]) || {};
      const list = (units[key] || []).map((u) => ({ label: u.label, name: u.name, kind: u.kind, places: u.places, extraBeds: u.extraBeds || 0, dedicated: !!u.dedicated, kept: u.kept || 0,
        occupants: (u.occupants || []).map((o) => ({ guestId: o.guestId, bed: !!o.bed, by: o.by || null, placedAt: o.placedAt || null, placedFrom: o.placedFrom || null })) }));
      return { key, name: (seedNames && seedNames[key]) || key, item: d.item || null, checkIn: d.checkIn || null, checkOut: d.checkOut || null, nights: d.nights == null ? null : d.nights,
        units: list, guests: list.reduce((n, u) => n + u.occupants.length, 0), places: list.reduce((n, u) => n + u.places, 0) };
    });
    return { window: st.window, stage: st.stage, label: st.label, hotel: st.hotel, categories: cats,
      checkIn: cats.map((c) => c.checkIn).filter(Boolean).sort()[0] || null, checkOut: cats.map((c) => c.checkOut).filter(Boolean).sort().slice(-1)[0] || null,
      guests: cats.reduce((n, c) => n + c.guests, 0) };
  }).filter(Boolean);
}

/* ---- the inputs of a write, shaped and bounded (the ledger / the engine check everything again in their own turn) ---- */
export function seatChangeOf(body) {
  const event = clean(body && body.event);
  if (event !== 'ceremony' && event !== 'dinner') return { error: 'event must be ceremony or dinner' };
  const target = body && body.target && typeof body.target === 'object' && !Array.isArray(body.target) ? body.target : null;
  const expect = body && body.expect && typeof body.expect === 'object' && !Array.isArray(body.expect) ? body.expect : null;
  if (!target || !expect) return { error: 'target and expect are required' };
  const keys = Object.keys(target);
  if (!keys.length || keys.length > 60) return { error: 'a change names 1 to 60 seats' };
  const ok = (v) => v === null || (typeof v === 'string' && GUEST_ID_RE.test(v));
  for (const k of keys) if (!SEAT_ID_RE.test(k) || !ok(target[k]) || !(k in expect) || !ok(expect[k])) return { error: 'invalid seat ' + String(k).slice(0, 16) };
  if (Object.keys(expect).length !== keys.length) return { error: 'every seat of the change must name what was seen there' };
  return { event, target, expect, dryRun: body.dryRun === true };
}
export function roomChangeOf(body) {
  const target = body && body.target && typeof body.target === 'object' && !Array.isArray(body.target) ? body.target : null;
  const expect = body && body.expect && typeof body.expect === 'object' && !Array.isArray(body.expect) ? body.expect : null;
  if (!target || !expect) return { error: 'target and expect are required' };
  const keys = Object.keys(target);
  if (!keys.length || keys.length > 20) return { error: 'a change names 1 to 20 rooms' };
  const ok = (v) => Array.isArray(v) && v.length <= 8 && v.every((g) => typeof g === 'string' && GUEST_ID_RE.test(g));
  for (const k of keys) if (!/^[a-z0-9-]+\/[a-z0-9-]+\|[A-Z]{1,2}$/.test(k) || !ok(target[k]) || !(k in expect) || !ok(expect[k])) return { error: 'invalid room ' + String(k).slice(0, 48) };
  if (Object.keys(expect).length !== keys.length) return { error: 'every room of the change must name who was seen there' };
  return { target, expect, dryRun: body.dryRun === true, approveRoomCount: body.approveRoomCount === true };
}
/* who moves in a room change: guest → { from, to } (labels) */
export function roomMovesOf(change) {
  const from = {}, to = {};
  for (const [k, list] of Object.entries(change.expect)) for (const g of list) from[g] = k;
  for (const [k, list] of Object.entries(change.target)) for (const g of list) to[g] = k;
  return Object.keys(to).filter((g) => from[g] !== to[g]).map((g) => ({ guestId: g, from: from[g] || null, to: to[g] }));
}
/* the guests whose seat a seat change gives or takes */
export function seatGuestsOf(change) {
  const out = new Set();
  for (const k of Object.keys(change.target)) { if (change.target[k]) out.add(change.target[k]); if (change.expect[k]) out.add(change.expect[k]); }
  return [...out];
}
