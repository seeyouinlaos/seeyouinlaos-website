/* ============================================================================
   H&S WEDDING 2027 — BOOKINGS RECORDED BY THE OWNERS (Owner, 15 Nov 2026)

   Guest Settlement bills a booking a guest SENT and Guest Relations CONFIRMED
   (src/billing/bookings.js · loadConfirmedBookings). Some arrangements are made
   by Haruthai & Suthep themselves — a family whose rooms one person pays, a
   guest who never books on the site. This module holds those bookings as the
   Owners record them in the admin console, and nothing else.

   ONE RECORD PER PAYING INVITATION, in REG_KV `obk:<Holder_ID>`:
     { rev, nextId, entries: [{ id, personId, itemId, room, extraBed, note, recordedBy, recordedAt }],
       confirmed: { rev, by, at } | null, log: [ … the last 50 actions ] }
   · the paying invitation is the Holder (Bill_To) of every entry; the person is
     any active guest of the register — the payer's family need not share a party;
   · an entry is never edited: a change is a removal and a new entry (an entry id
     is never reused, so a Booking_ID once issued names one thing for ever);
   · CONFIRMED only while `confirmed.rev === rev`: any change after a confirmation
     needs the Owners' confirmation again (as a sent change lapses a guest's);
   · the note is the Owners' own and never reaches a booking row or a statement.

   PRICES are the engine's, from Google: 002 Standard_Rate, else the person's 009
   Named Special Rate for this payer (Holder_ID + Person_ID + Item_ID) with its
   own Nights_Rule. An EXTRA BED is a person with `extraBed` — it is priced only
   by that person's own 009 row; without one the booking cannot be confirmed.

   This file is pure: no storage, no network, no clock of its own.
   ========================================================================== */

import { roomUnitIdOf } from './model.js';
import { matchSpecialRate } from './engine.js';

export const OWNER_BOOKING_STATE = Object.freeze({ NONE: 'NONE', RECORDED: 'RECORDED', CONFIRMED: 'CONFIRMED' });
export const OWNER_BOOKING_SOURCE = 'OWNER_RECORDED';
export const LOG_MAX = 50;
export const MAX_ENTRIES = 40;

const clean = (v) => String(v == null ? '' : v).trim();
export const obkKey = (holderId) => 'obk:' + clean(holderId);
/* which paying invitations hold an entry for which person — the double-booking check across payers */
export const OBK_INDEX_KEY = 'obk-index';

export function emptyRecord() { return { rev: 0, nextId: 1, entries: [], confirmed: null, log: [] }; }

/** A stored record as this module reads it; anything unreadable is refused, never treated as empty. */
export function readRecord(raw) {
  if (raw == null || raw === '') return emptyRecord();
  const r = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!r || !Array.isArray(r.entries) || !Number.isInteger(r.rev)) throw new Error('the Owners\' booking record is not readable');
  return { rev: r.rev, nextId: Number.isInteger(r.nextId) ? r.nextId : r.entries.length + 1, entries: r.entries, confirmed: r.confirmed || null, log: Array.isArray(r.log) ? r.log : [] };
}

export function stateOf(rec) {
  if (!rec || !rec.entries || !rec.entries.length) return OWNER_BOOKING_STATE.NONE;
  return rec.confirmed && rec.confirmed.rev === rec.rev ? OWNER_BOOKING_STATE.CONFIRMED : OWNER_BOOKING_STATE.RECORDED;
}

/** The stay a product belongs to (002 Site_Product_Key "wedstay/heritage-executive" → "wedstay"): two rooms of one stay are one stay. */
export function stageOf(items, itemId) {
  const key = clean(items && items[itemId] && items[itemId].Site_Product_Key).split(/[,|]/)[0];
  return key.includes('/') ? key.split('/')[0] : clean(itemId);
}

/** One new entry, checked. `persons` = Map(guestId → name) of the register's ACTIVE guests. */
export function checkEntry(entry, { items, persons }) {
  const e = entry && typeof entry === 'object' ? entry : {};
  const personId = clean(e.personId), itemId = clean(e.itemId), room = clean(e.room), note = clean(e.note);
  if (!personId || !persons.has(personId)) return { ok: false, error: 'PERSON: ' + (personId || '(none)') + ' is not an active guest of the register' };
  const item = items && items[itemId];
  if (!item) return { ok: false, error: 'ITEM: ' + (itemId || '(none)') + ' is not a product of 002' };
  if (clean(item.Rate_Status) === 'RETIRED') return { ok: false, error: 'ITEM: ' + itemId + ' is retired in 002' };
  if (room && !/^[A-Za-z0-9][A-Za-z0-9 \-]{0,19}$/.test(room)) return { ok: false, error: 'ROOM: a room is named by its unit letter (up to 20 letters or digits)' };
  if (note.length > 200) return { ok: false, error: 'NOTE: at most 200 characters' };
  return { ok: true, entry: { personId, itemId, room: room || null, extraBed: e.extraBed === true, note: note || null } };
}

/**
 * One action on a record → { ok, record } or { ok: false, error }. Never mutates the input.
 *   add     { entry }   — refused when this record already books the person for the same stay
 *   remove  { entryId }
 *   confirm             — the Owners confirm exactly this revision (at least one entry)
 */
export function applyAction(rec, action, { entry, entryId, by, at, items, persons }) {
  const r = { ...rec, entries: rec.entries.slice(), log: rec.log.slice() };
  const who = clean(by) || 'BILLING_ADMIN', when = clean(at);
  const log = (what) => { r.log.push({ at: when, by: who, what }); while (r.log.length > LOG_MAX) r.log.shift(); };
  if (action === 'add') {
    const c = checkEntry(entry, { items, persons });
    if (!c.ok) return c;
    if (r.entries.length >= MAX_ENTRIES) return { ok: false, error: 'at most ' + MAX_ENTRIES + ' bookings per paying invitation' };
    const stage = stageOf(items, c.entry.itemId);
    const same = r.entries.find((x) => x.personId === c.entry.personId && stageOf(items, x.itemId) === stage);
    if (same) return { ok: false, error: 'DOUBLE_BOOKING: ' + c.entry.personId + ' already has ' + same.itemId + ' for this stay (entry ' + same.id + ')' };
    const id = 'e' + r.nextId;
    r.nextId += 1;
    r.entries.push({ id, ...c.entry, recordedBy: who, recordedAt: when });
    r.rev += 1; log('add ' + id + ' ' + c.entry.personId + ' ' + c.entry.itemId + (c.entry.room ? ' room ' + c.entry.room : '') + (c.entry.extraBed ? ' extra bed' : ''));
    return { ok: true, record: r };
  }
  if (action === 'remove') {
    const i = r.entries.findIndex((x) => x.id === clean(entryId));
    if (i < 0) return { ok: false, error: 'no entry ' + clean(entryId) };
    const [gone] = r.entries.splice(i, 1);
    r.rev += 1; log('remove ' + gone.id + ' ' + gone.personId + ' ' + gone.itemId);
    return { ok: true, record: r };
  }
  if (action === 'confirm') {
    if (!r.entries.length) return { ok: false, error: 'nothing recorded to confirm' };
    if (r.confirmed && r.confirmed.rev === r.rev) return { ok: true, record: rec, unchanged: true };
    r.confirmed = { rev: r.rev, by: who, at: when };
    log('confirm rev ' + r.rev);
    return { ok: true, record: r };
  }
  return { ok: false, error: 'unknown action' };
}

/** The engine's rows for a record's entries — the paying invitation is Holder and Bill_To of each. */
export function toBookings(holderId, rec, items, nightsOf) {
  const h = clean(holderId);
  return (rec.entries || []).map((e) => ({
    Booking_ID: ['OB', h, e.personId, e.itemId, e.id].join('·'),
    Holder_ID: h, Person_ID: e.personId, Item_ID: e.itemId, Bill_To_Holder_ID: h,
    /* THE REAL ROOM (Owner, 15 Nov 2026 · "Room I is the actual room identifier"): the room is named by the website's own unit
       letter — the same physical room the Rooms engine holds (RU·<item>·<unit>), so a room the Owners record and a room a
       guest holds are one room, never two */
    Room_Unit_ID: e.room ? roomUnitIdOf(e.itemId, e.room) : null,
    State: 'CONFIRMED', Nights: nightsOf ? nightsOf(items, e.itemId) : null, Quantity: 1, Selected: true,
    source: OWNER_BOOKING_SOURCE, ownerEntry: e.id, extraBed: !!e.extraBed,
  }));
}

/** Who sleeps in each recorded room: persons, extra beds, and the room's own capacity (002 Max_Pax). */
export function occupancy(rec, items) {
  const rooms = new Map();
  for (const e of rec.entries || []) {
    if (!e.room) continue;
    const k = e.itemId + '|' + e.room;
    if (!rooms.has(k)) rooms.set(k, { itemId: e.itemId, room: e.room, persons: [], extraBeds: 0, maxPax: Number(items && items[e.itemId] && items[e.itemId].Max_Pax) || null });
    const r = rooms.get(k); r.persons.push(e.personId); if (e.extraBed) r.extraBeds += 1;
  }
  return [...rooms.values()].map((r) => ({ ...r, occupants: r.persons.length, overCapacity: !!(r.maxPax && r.persons.length - r.extraBeds > r.maxPax) }));
}

/**
 * What stands in the way of billing these bookings (each a reason Issue refuses with):
 *   EXTRA_BED_UNPRICED  an extra bed with no 009 row of its own for this payer, person and product
 *   ROOM_OVER_CAPACITY  more occupants than the room's 002 Max_Pax, extra beds aside
 *   DOUBLE_BOOKING      the person's own sent trip, or another paying invitation's record, already books the same stay
 *   PERSON_NOT_ACTIVE   a person recorded here is no longer an active guest of the register
 *   OWNER_RECORD_UNREADABLE  a record or the index the checks need could not be read — the check fails closed
 * `elsewhere` = [{ personId, stage, by }] — the stays the persons hold anywhere else (read by the caller); `active` = Set of the
 * register's active guest ids (optional); `unreadable` = what the caller could not read.
 */
export function problemsOf({ holderId, rec, items, specialRates, elsewhere, asOf, active, unreadable }) {
  const out = (unreadable || []).map((x) => 'OWNER_RECORD_UNREADABLE: ' + x);
  const h = clean(holderId);
  for (const e of rec.entries || []) {
    if (!e.extraBed) continue;
    /* exactly the row the engine will apply: ACTIVE, approved, in effect, naming this person — else the bed would be billed at the standard rate */
    const m = matchSpecialRate(specialRates || [], { holderId: h, personId: e.personId, itemId: e.itemId, asOf });
    if (!m.rate || !m.personScoped) out.push('EXTRA_BED_UNPRICED: ' + e.personId + ' (' + e.itemId + ') has no approved 009 row of its own in effect for ' + h);
  }
  if (active) for (const e of rec.entries || []) if (!active.has(e.personId)) out.push('PERSON_NOT_ACTIVE: ' + e.personId + ' is no longer an active guest of the register');
  for (const r of occupancy(rec, items)) if (r.overCapacity) out.push('ROOM_OVER_CAPACITY: room ' + r.room + ' of ' + r.itemId + ' holds ' + r.occupants + ' for ' + r.maxPax + ' places (' + r.extraBeds + ' extra bed)');
  for (const e of rec.entries || []) {
    const stage = stageOf(items, e.itemId);
    for (const x of elsewhere || []) if (x.personId === e.personId && x.stage === stage) out.push('DOUBLE_BOOKING: ' + e.personId + ' already has the ' + stage + ' stay in ' + x.by);
  }
  return [...new Set(out)];
}

/**
 * THE ONE CONFIRMATION a statement stands on, the guest's sent trip and the Owners' record together.
 *   the guest's sent trip awaiting confirmation (UNCONFIRMED / LAPSED) → that state: nothing is billed half-confirmed;
 *   the Owners' record not confirmed (RECORDED)                       → UNCONFIRMED, named as the Owners' own;
 *   neither                                                           → NONE;
 *   otherwise                                                         → CONFIRMED.
 */
export function combinedConfirmation(reg, owner) {
  const r = reg || { state: 'NONE' };
  const o = owner || { state: OWNER_BOOKING_STATE.NONE };
  if (o.state === OWNER_BOOKING_STATE.NONE) return r;
  if (r.state === 'UNCONFIRMED' || r.state === 'LAPSED') return { ...r, ownerRecorded: { state: o.state, rev: o.rev } };
  if (o.state === OWNER_BOOKING_STATE.RECORDED) return { state: 'UNCONFIRMED', version: r.version ?? null, ownerRecorded: { state: o.state, rev: o.rev } };
  return { ...(r.state === 'CONFIRMED' ? r : { state: 'CONFIRMED', version: null }), state: 'CONFIRMED',
    ownerRecorded: { state: o.state, rev: o.rev, confirmedBy: o.confirmedBy || null, confirmedAt: o.confirmedAt || null } };
}
