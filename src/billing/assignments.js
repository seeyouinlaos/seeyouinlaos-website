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

   THE HOTEL'S OWN ROOM NUMBERS (Owners, 18 / 19 Nov 2026): a unit of the Souphattra carries the room of the house the Owners
   assigned it (src/hotel-rooms.js · the room engine's store) — `hotelRoom` beside the allocation label, never in its place; a
   suite of two numbers is still one room.
   ========================================================================== */

import { confirmationStands } from '../confirmation.js';
import { hotelRoomOf } from '../hotel-rooms.js';
import { SEED } from '../inventory-seed.js';

export const ASSIGNMENTS_VERSION = 'assignments/1.0.0';
const clean = (v) => (v == null ? '' : String(v)).trim();
const INV_RE = /^INV-[A-Z0-9-]+$/;
export const GUEST_ID_RE = /^G\d{3,}$/;
export const SEAT_ID_RE = /^C-[LR]-\d{2}-\d{2}$|^D-[TB]-\d{2}$/;

/* THE EVENTS (assets/temple.js · the active wedding programme, 28 February 2027) — the seating ledger's two events */
export const EVENTS = Object.freeze({
  ceremony: { name: 'Vow Ceremony', date: '2027-02-28', time: '15:30', dateWords: 'Sunday, 28 February 2027 · 15:30', venue: 'Souphattra Heritage Vientiane', answer: 'vows' },
  dinner: { name: 'Wedding Dinner', date: '2027-02-28', time: '19:30', dateWords: 'Sunday, 28 February 2027 · 19:30', venue: 'Souphattra Heritage Vientiane · Green Doors', answer: 'dinner' },
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
    (roomsOf[o.guestId] = roomsOf[o.guestId] || []).push({ key, window: key.split('/')[0], label: u.label, kind: u.kind, bed: !!o.bed, placed: /^owners:/.test(clean(o.by)),
      hotelRoom: hotelRoomOf(key, u.label, rooms.hotelRooms && rooms.hotelRooms.rooms) });
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
        ...(u.couple ? { couple: true } : {}), hotelRoom: hotelRoomOf(key, u.label, rooms.hotelRooms && rooms.hotelRooms.rooms),
        occupants: (u.occupants || []).map((o) => ({ guestId: o.guestId, bed: !!o.bed, by: o.by || null, placedAt: o.placedAt || null, placedFrom: o.placedFrom || null })) }));
      return { key, name: (seedNames && seedNames[key]) || key, item: d.item || null, checkIn: d.checkIn || null, checkOut: d.checkOut || null, nights: d.nights == null ? null : d.nights,
        units: list, guests: list.reduce((n, u) => n + u.occupants.length, 0), places: list.reduce((n, u) => n + u.places, 0) };
    });
    return { window: st.window, stage: st.stage, label: st.label, hotel: st.hotel, categories: cats,
      checkIn: cats.map((c) => c.checkIn).filter(Boolean).sort()[0] || null, checkOut: cats.map((c) => c.checkOut).filter(Boolean).sort().slice(-1)[0] || null,
      guests: cats.reduce((n, c) => n + c.guests, 0) };
  }).filter(Boolean);
}

/* WHO STAYS WHERE — PER HOTEL (Owners' consolidated order, 19 Nov 2026): "88 guests in rooms" added places across stays (one
   person in two stays counted twice). Here every hotel has its own figures and the persons are counted once each:
   · unique guests      — distinct persons with a place at that hotel (all its periods); the total line counts each person once;
   · places held        — places held across the hotel's periods (a person in two periods holds two places);
   · booked rooms       — rooms the hotel has sold to H&S for these nights. Only the Souphattra holds an agreement: it buys the
                          rooms budget-map roomContract.rooms names (by 002 Item_ID — the same source the finance report's hotel
                          purchase reads), and every other room one of its guests occupies is bought as an additional room (Owners,
                          18 Nov 2026). Every other hotel sells the rooms its guests occupy — no block is held for H&S;
   · empty allocation units — the console's room cards without a guest that the hotel has NOT sold to H&S: a free place there is
                          not hotel availability (never "available inventory");
   · available inventory — stated only where it is verified (the agreement's booked rooms still empty), else "not verified".
   Nothing here is a price, a cost or a booking. */
export function occupancyOf(stays, waitlist, roomContract) {
  const R = (roomContract && roomContract.rooms) || {};
  const stageOf = (item) => { const m = /^([A-Z][0-9]?)-/.exec(clean(item)); return m ? m[1] : null; };
  const stagesOf = (st) => [...new Set((st.categories || []).map((c) => stageOf(c.item)).filter(Boolean))];
  const covered = (c) => { const k = R[stageOf(c.item)]; return k === '*' || (Array.isArray(k) && k.includes(clean(c.item))); };
  const hotels = new Map();
  const waiting = new Map();
  /* the waiting list is kept per stage of the room engine (two stays may share one — the wedding stay and the Guest House): a
     waiting guest is counted once, at the first stay of that stage */
  for (const w of waitlist || []) { const k = clean(w && (w.stage || w.window || clean(w.key).split('/')[0])); if (k) waiting.set(k, (waiting.get(k) || 0) + (Number(w.size) > 0 ? Number(w.size) : 1)); }
  const counted = new Set();
  const everyone = new Set();
  let placesAll = 0;
  for (const st of stays || []) {
    if (!hotels.has(st.hotel)) hotels.set(st.hotel, { hotel: st.hotel, periods: [], persons: new Set() });
    const H = hotels.get(st.hotel);
    const p = { window: st.window, label: st.label, checkIn: st.checkIn, checkOut: st.checkOut, nights: null, persons: new Set(), places: 0,
      units: 0, occupied: 0, booked: 0, bookedEmpty: 0, emptyUnits: 0, bookedRoomNights: 0, occupiedRoomNights: 0, roomNightsKnown: true, coveredUnits: 0,
      agreement: stagesOf(st).some((x) => Object.prototype.hasOwnProperty.call(R, x)), stages: stagesOf(st),
      itemsUnknown: (st.categories || []).some((c) => !c.item), unassigned: 0 };
    const wk = waiting.has(st.window) ? st.window : st.stage;
    if (!counted.has(wk)) { p.unassigned = waiting.get(wk) || 0; counted.add(wk); }
    for (const c of st.categories || []) {
      const n = Number.isFinite(c.nights) ? c.nights : null;
      if (n != null) p.nights = Math.max(p.nights || 0, n); else p.roomNightsKnown = false;
      for (const u of c.units || []) {
        const occ = (u.occupants || []).filter((o) => o && o.guestId);
        const inAgreement = covered(c), isBooked = inAgreement || occ.length > 0;
        if (inAgreement) p.coveredUnits += 1;
        p.units += 1; p.places += occ.length; placesAll += occ.length;
        for (const o of occ) { p.persons.add(o.guestId); H.persons.add(o.guestId); everyone.add(o.guestId); }
        if (occ.length) { p.occupied += 1; if (n != null) p.occupiedRoomNights += n; }
        if (isBooked) { p.booked += 1; if (n != null) p.bookedRoomNights += n; if (!occ.length) p.bookedEmpty += 1; } else p.emptyUnits += 1;
      }
    }
    H.periods.push(p);
  }
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);
  const want = (roomContract && roomContract.agreement && roomContract.agreement.rooms) || {};
  const agreementWords = (p) => {
    const stated = p.stages.map((x) => want[x]).filter((n) => Number.isFinite(n));
    if (!stated.length) return null;
    const n = stated.reduce((t, x) => t + x, 0);
    return p.coveredUnits === n ? null : 'the agreement buys ' + n + ' room' + (n === 1 ? '' : 's') + ' here; the booking system holds ' + p.coveredUnits + ' room' + (p.coveredUnits === 1 ? '' : 's') + ' of it';
  };
  const list = [...hotels.values()].map((H) => {
    const periods = H.periods.map((p) => ({
      window: p.window, label: p.label, checkIn: p.checkIn, checkOut: p.checkOut, nights: p.nights,
      guests: p.persons.size, places: p.places, unassigned: p.unassigned,
      bookedRooms: p.booked, occupiedRooms: p.occupied, bookedUnoccupied: p.bookedEmpty, emptyAllocationUnits: p.emptyUnits,
      bookedRoomNights: p.roomNightsKnown ? p.bookedRoomNights : null, occupiedRoomNights: p.roomNightsKnown ? p.occupiedRoomNights : null,
      availableInventory: p.agreement ? { verified: true, rooms: p.bookedEmpty, basis: 'rooms the hotel agreement buys that no guest occupies yet' } : { verified: false, rooms: null, basis: 'no block is held for H&S at this hotel — its free rooms are not known' },
      occupancyPct: pct(p.occupied, p.booked),
      basis: p.agreement ? 'the Souphattra agreement buys ' + (p.stages.some((x) => R[x] === '*') ? 'every room of this stay' : 'the rooms it names for this stay') + '; every other room a guest occupies is an additional room' : 'the hotel sells the rooms its guests occupy',
      /* the agreement's own count of rooms beside the rooms it covers here — a difference is named, never adjusted */
      agreementCheck: p.agreement ? agreementWords(p) : null,
      itemsUnknown: p.itemsUnknown,
    }));
    const sumP = (k) => periods.reduce((t, p) => t + (p[k] || 0), 0);
    return { hotel: H.hotel, guests: H.persons.size, places: sumP('places'), bookedRooms: sumP('bookedRooms'), occupiedRooms: sumP('occupiedRooms'),
      bookedUnoccupied: sumP('bookedUnoccupied'), emptyAllocationUnits: sumP('emptyAllocationUnits'), unassigned: sumP('unassigned'),
      bookedRoomNights: periods.every((p) => p.bookedRoomNights != null) ? sumP('bookedRoomNights') : null,
      occupiedRoomNights: periods.every((p) => p.occupiedRoomNights != null) ? sumP('occupiedRoomNights') : null,
      checkIn: periods.map((p) => p.checkIn).filter(Boolean).sort()[0] || null, checkOut: periods.map((p) => p.checkOut).filter(Boolean).sort().slice(-1)[0] || null,
      periods };
  });
  return { version: 'occupancy/1.0.0', uniqueGuests: everyone.size, placesHeld: placesAll, hotels: list,
    definition: 'unique guests count each person once; places held count one place per person per stay' };
}

/* who set the hotel room numbers, and when — never the numbers twice (they travel with each unit) */
export function hotelRoomsMeta(h) {
  return h ? { version: h.version || 0, at: h.at || null, by: h.by || null, note: h.note || null, list: h.list || null, assigned: Object.keys(h.rooms || {}).length } : null;
}
/* WHAT THE NUMBERS SAY ABOUT THE GUESTS (Owners, 19 Nov 2026): anyone but the couple holding a place in the couple's suite; a guest of the
   Souphattra whose room has no hotel number yet, and a guest
   who sleeps in one room of the house before the wedding and in another from 27 February (the two windows are separate stock — a
   move in one window alone changes their room): named, never corrected here */
export function hotelChecksOf(roster) {
  const out = [];
  for (const p of roster || []) {
    /* the couple's suite holds the couple alone (Owners, 19 Nov 2026): anyone else found there is named — moving them is a booking
       change and the Owners' decision, never made here */
    for (const r of (p.rooms || [])) if (SEED[r.key] && SEED[r.key].couple && !p.couple) out.push({ kind: 'COUPLE_SUITE_OTHER', guestId: p.guestId, key: r.key, label: r.label });
    const soup = (p.rooms || []).filter((r) => r.window === 'prewed' || r.window === 'wedstay');
    for (const r of soup) if (!r.hotelRoom) out.push({ kind: 'NO_NUMBER', guestId: p.guestId, key: r.key, label: r.label });
    const pre = soup.find((r) => r.window === 'prewed'), wed = soup.find((r) => r.window === 'wedstay');
    if (pre && wed && pre.hotelRoom && wed.hotelRoom && pre.hotelRoom.display !== wed.hotelRoom.display) {
      out.push({ kind: 'ROOM_CHANGES', guestId: p.guestId, from: pre.hotelRoom.display, to: wed.hotelRoom.display });
    }
  }
  return out;
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
