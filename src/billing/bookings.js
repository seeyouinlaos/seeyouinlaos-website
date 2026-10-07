/* ============================================================================
   H&S WEDDING 2027 — CONFIRMED BOOKINGS, AS THE BILLING ENGINE NEEDS THEM
   Governing document: GUEST SETTLEMENT ARCHITECTURE v2.2 FINAL (Freeze · A, B, H).

   SELECTION SOURCE OF TRUTH (Freeze · A), in this order:
     1. the Confirmed Booking
     2. the Room Assignment, subordinate to it
     3. My Bag, which is a temporary selection and NEVER a billing source
   This module therefore reads the version of the trip the guest SENT that
   Guest Relations CONFIRMED (reg:<inv> + conf:<inv>) and, only for a confirmed
   room line that carries no unit, the ROOMS actor; it never reads the cart.

   WHAT IT DOES NOT DO. It does not price anything: it produces the booking
   rows and src/billing/engine.js decides every amount. It also does not guess
   the bridge between a website product and a Google Item. That bridge is
   DATA, supplied by the Owner in 002 as the `Site_Product_Key` column; when a
   product carries no Item_ID the booking is still returned, carrying
   `Item_ID: null`, so the engine reports MANUAL_REVIEW_REQUIRED instead of
   quietly dropping something a guest confirmed.

   WHY A BOOKING_ID GENERATION. Freeze · H forbids editing a Booking_ID in
   place: an amendment marks the old one AMENDED and mints a new id. The
   generation counter lives in the BillingLedger, so an id is stable once
   issued and a re-read never renumbers it.
   ========================================================================== */

import { BOOKING_STATE, bookingIdOf, roomUnitIdOf } from './model.js';
import { confirmationStands } from '../confirmation.js';
import { canonicalKey, canonicalLines } from '../legacy-keys.js';
/* ONE source for each (Owner, 5 Oct 2026): the Site_Product_Key map and the
 * nights value both come from the 002 adapter, so this module cannot grow a
 * second, independently maintained copy of either. */
import { siteProductKeyIndex, nightsOfItem, SourceDataError, SITE_PRODUCT_KEY_COLUMN, NUMBER_OF_NIGHTS_COLUMN } from './source.js';

const clean = (v) => String(v == null ? '' : v).trim();

export { SITE_PRODUCT_KEY_COLUMN, NUMBER_OF_NIGHTS_COLUMN };

/**
 * `siteKey -> Item_ID`, strictly. A key claimed by two ACTIVE Items is never
 * resolved by order or by name: it is left out of the index and reported, so
 * the booking carries Item_ID null and the engine says MANUAL_REVIEW_REQUIRED.
 */
export function itemIndexBySiteKey(items) {
  return siteProductKeyIndex(items).index;
}

/** The duplicate Site_Product_Key claims, for the Activation Gate and drift. */
export function siteKeyDuplicates(items) {
  return siteProductKeyIndex(items).duplicates;
}

/** Nights for an Item, strictly from 002's own "Number of Nights" row. */
function nightsOf(items, itemId) {
  return nightsOfItem(items && items[itemId]);
}

/* --------------------------------------------------- the site's own state */

/** One guest's room assignments, from the ROOMS actor (Freeze · A step 2). */
/* The ROOMS actor answers `mine` as one hold per stay stage:
 * { <stage>: { key, label } } (src/rooms.js · view). A reply this module cannot
 * read is NOT "no rooms": a settlement priced without the rooms its guest holds
 * would be wrong, so the read fails visibly instead (Owner, 5 Oct 2026). */
async function roomAssignments(env, identity) {
  if (!env.ROOMS) throw new SourceDataError('ROOMS_UNAVAILABLE', 'the Rooms engine is not bound; room bookings cannot be read');
  if (!clean(identity && identity.guestId)) {
    throw new SourceDataError('ROOMS_NO_PERSON', 'room bookings are read per person and no person was resolved');
  }
  let v;
  try {
    const stub = env.ROOMS.get(env.ROOMS.idFromName('rooms'));
    const res = await stub.fetch(new Request('https://rooms/api/rooms/mine', {
      headers: { 'x-siyl-identity': JSON.stringify(identity) },
    }));
    v = await res.json();
  } catch (e) {
    throw new SourceDataError('ROOMS_UNREADABLE', 'the Rooms engine did not answer: ' + clean(e && e.message).slice(0, 120));
  }
  const mine = v && v.ok === true ? v.mine : undefined;
  if (Array.isArray(mine)) return mine;
  if (mine && typeof mine === 'object') return Object.values(mine).filter((u) => u && typeof u === 'object');
  throw new SourceDataError('ROOMS_SHAPE', 'the Rooms engine answered without a readable `mine`');
}

/** The stored registration record: what this invitation sent. */
async function registrationRecord(env, holderId) {
  if (!env.REG_KV) throw new SourceDataError('REGISTRATION_UNAVAILABLE', 'the registration store is not bound; confirmed bookings cannot be read');
  const raw = await env.REG_KV.get('reg:' + holderId);
  if (raw == null || raw === '') return null;          /* nothing sent yet is a fact */
  try { return JSON.parse(raw); }
  catch (e) { throw new SourceDataError('REGISTRATION_UNREADABLE', 'the stored registration of ' + holderId + ' is not readable'); }
}

/** Guest Relations' confirmation record of this invitation, or null. */
async function confirmationRecord(env, holderId) {
  const raw = await env.REG_KV.get('conf:' + holderId);
  if (raw == null || raw === '') return null;
  try { return JSON.parse(raw); }
  catch (e) { throw new SourceDataError('CONFIRMATION_UNREADABLE', 'the confirmation record of ' + holderId + ' is not readable'); }
}

/** The website product a sent selection names: a room as `window/room`, anything else by its id. */
export function siteKeyOfSelection(line) {
  const id = clean(line && line.id);
  if (!id) return '';
  const room = clean(line.room);
  return room ? id + '/' + room : id;
}

/* ------------------------------------------------------------ the mapping */

/** What the booking list stands on — carried beside it, never a booking itself. */
export const CONFIRMATION = Object.freeze({
  NONE: 'NONE',                 /* nothing sent */
  UNCONFIRMED: 'UNCONFIRMED',   /* sent, Guest Relations has not confirmed it */
  LAPSED: 'LAPSED',             /* confirmed once, a later send is not confirmed yet */
  CONFIRMED: 'CONFIRMED',
});

/**
 * Confirmed Bookings for ONE Holder, shaped exactly as engine.calculate wants
 * (Freeze · A, Codex final review 5 Oct 2026).
 *
 *   1. THE CONFIRMED BOOKING is the version of the trip this invitation SENT
 *      that Guest Relations CONFIRMED (conf:<inv>, src/confirmation.js) — its
 *      `registration.selections`, nothing else. A hold the guest has not sent,
 *      or a sent change not yet confirmed, is never billed.
 *   2. THE ROOM ASSIGNMENT is subordinate: a confirmed room line carries the
 *      unit it held when it was sent; only a line without one asks the ROOMS
 *      actor which unit this person holds for that same product.
 *   3. My Bag is never read.
 *
 * Every row is per Person × Item (Freeze · B). A ROOM-quota item additionally
 * carries the Room_Unit_ID that groups the persons sharing one physical room.
 * The returned array carries `confirmation` (not enumerable): the state above,
 * so a caller can refuse to issue a statement nobody confirmed.
 *
 * `assume` ({ version }) — THE ADMIN CONSOLE'S WHAT-IF only (billing-routes.js · admin/confirm GET): the bookings of
 * the sent version as they WOULD stand once that very version is confirmed, so the confirmation dialog can say
 * whether Issue would then be available. Only the version sent now is assumed; the stamp says `assumed`, and the
 * caller never issues from it (no proposal hash leaves an assumed assessment).
 */
export async function loadConfirmedBookings({ env, identity, holderId, items, generations, overrides, assume }) {
  const holder = clean(holderId) || clean(identity && identity.invitationId);
  const out = [];
  const stamp = (state, extra) => Object.defineProperty(out, 'confirmation',
    { value: Object.freeze({ state, ...(extra || {}) }), enumerable: false });
  if (!holder) return stamp(CONFIRMATION.NONE);

  const rec = await registrationRecord(env, holder);
  if (!rec || !rec.submissionId) return stamp(CONFIRMATION.NONE);
  const conf = await confirmationRecord(env, holder);
  const version = Number(rec.version || 1);
  const assumed = !!(assume && Number(assume.version) === version) && !confirmationStands(conf, rec);
  if (!assumed && !confirmationStands(conf, rec)) {
    return stamp(conf && conf.confirmedAt ? CONFIRMATION.LAPSED : CONFIRMATION.UNCONFIRMED, { version });
  }

  const reg = rec.registration && typeof rec.registration === 'object' ? rec.registration : {};
  const person = clean(reg.guestId);
  const asked = clean(identity && identity.guestId);
  if (!person) throw new SourceDataError('REGISTRATION_NO_PERSON', 'the confirmed registration of ' + holder + ' names no guest');
  if (asked && asked !== person) {
    throw new SourceDataError('REGISTRATION_PERSON_MISMATCH', 'the confirmed registration of ' + holder + ' names another guest than the invitation');
  }

  /* the ROOMS actor is asked only when a confirmed room line carries no unit */
  let held = null;
  const unitFor = async (siteKey) => {
    if (!held) {
      held = {};
      for (const u of await roomAssignments(env, { invitationId: holder, guestId: person })) {
        const k = canonicalKey(clean(u.key || u.productKey));
        if (k) held[k] = clean(u.label || u.unit);
      }
    }
    return held[siteKey] || '';
  };

  out.push(...await bookingsOfSelections({ holderId: holder, personId: person, selections: reg.selections, items, generations, overrides,
    unitOf: unitFor, source: 'CONFIRMED_REGISTRATION', version }));
  if (assumed) return stamp(CONFIRMATION.CONFIRMED, { version, confirmedAt: null, assumed: true });
  return stamp(CONFIRMATION.CONFIRMED, { version, confirmedAt: clean(conf && conf.confirmedAt) || null,
    /* who confirmed, in which capacity, from where (src/confirmation.js) — Guest Relations or a BILLING_ADMIN, the same record */
    confirmedBy: clean(conf && conf.actor) || null, role: clean(conf && conf.role) || null, source: clean(conf && conf.source) || null });
}

/**
 * THE ONE MAPPING from selected lines to engine rows (Freeze · A, B, E) — the Confirmed Booking above, and the admin
 * console's Booked value (src/billing/booked.js, display only) both use it, so the two can never price a line
 * differently. An interest is never a booking; a product without an 002 Item_ID stays a row with Item_ID null, so the
 * engine names it for review instead of dropping it. `unitOf(siteKey)` (optional) names the room unit of a room line
 * that carries none — the Confirmed Booking asks the ROOMS actor; one person's Booked value needs no unit (a unit only
 * groups several persons sharing one room), so it passes none.
 */
export async function bookingsOfSelections({ holderId, personId, selections, items, generations, overrides, unitOf, source, version }) {
  const holder = clean(holderId), person = clean(personId);
  const index = itemIndexBySiteKey(items);
  const gen = generations || {};
  const billTo = overrides || {};
  const out = [];
  for (const l of canonicalLines(Array.isArray(selections) ? selections : [])) {
    if (!l || typeof l !== 'object') continue;
    if (l.interest) continue;                     /* an interest is not a booking */
    const siteKey = siteKeyOfSelection(l);
    if (!siteKey) continue;
    const itemId = index[siteKey] || null;
    const label = l.room ? (clean(l.unit) || (unitOf ? await unitOf(siteKey) : '')) : '';
    const g = Number(gen[[holder, person, itemId].join('|')]) || 1;
    out.push({
      Booking_ID: itemId ? bookingIdOf(holder, person, itemId, g) : null,
      Holder_ID: holder,
      Person_ID: person,
      Item_ID: itemId,
      Room_Unit_ID: itemId && label ? roomUnitIdOf(itemId, label) : null,
      Bill_To_Holder_ID: clean(billTo[person]) || holder,
      State: BOOKING_STATE.CONFIRMED,
      Nights: nightsOf(items, itemId),
      Quantity: Number(l.qty) > 0 ? Number(l.qty) : 1,
      /* Freeze · E — a selected line is the guest's own choice */
      Selected: true,
      Site_Product_Key: siteKey,
      source: source || 'CONFIRMED_REGISTRATION',
      confirmedVersion: version ?? null,
    });
  }
  return out;
}

/**
 * Freeze · H — an amendment never edits an immutable Booking_ID. This returns
 * the pair of rows the ledger should store: the old one marked AMENDED and a
 * new CONFIRMED row whose id carries the next generation.
 */
export function amend(previous, changes, nextGeneration) {
  const old = { ...previous, State: BOOKING_STATE.AMENDED };
  const next = {
    ...previous,
    ...changes,
    State: BOOKING_STATE.CONFIRMED,
    Booking_ID: bookingIdOf(previous.Holder_ID, previous.Person_ID, previous.Item_ID, nextGeneration),
    Amends: previous.Booking_ID,
  };
  return { old, next };
}

/** Which website products confirmed by this Holder have no Item_ID in 002. */
export function unmappedProducts(bookings) {
  return [...new Set((bookings || [])
    .filter((b) => !b.Item_ID)
    .map((b) => b.Site_Product_Key)
    .filter(Boolean))];
}
