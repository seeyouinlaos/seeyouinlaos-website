/* ============================================================================
   SEE YOU IN LAOS — THE ROOM OCCUPANCY ENGINE (Owner decision, 14 Sep 2026).

   A room is no longer an abstract count. Every category of every stay is a
   set of persistent ALLOCATION UNITS — ROOM A, ROOM B, ROOM C … — derived
   once from the seed and never renumbered: a category of five rooms is five
   units, and every room unit has TWO GUEST PLACES (a room the Owner opened to its
   own occupancy has that many — honourOccupancy in the seed). A guest chooses the unit
   they belong in, exactly as they choose a chair: a place is held in the
   guest's own name, the first names of the guests already there are shown
   to every authenticated guest, and a full unit is full.

   The labels are allocation labels, not hotel room numbers — the hotel has
   not supplied any, and this file never pretends it has.

   ONE actor holds every place ("rooms"): requests are serialised, so two
   guests joining the last place of ROOM A in the same moment are decided one
   after the other. Changing room is atomic in the only safe order — the new
   place is held first, the old one is released only once that succeeded — so
   a guest is never double-booked and never left without a room by a failed
   change.

   The Guest House complimentary (D2) is ONE shared unit of SIX guest places (Owner, 19 Sep 2026): whoever holds a place there
   is visible by first name to every other authenticated guest — the sleeping arrangement itself is the friends' own affair,
   never an algorithm's.

   NO PRE-RESERVED ROOMS, NO FIXED ARRANGEMENT (Owner, 15 Sep 2026 · reaffirmed 19 Sep 2026). Nothing is held for the
   Bride & Groom, the family or anyone else in advance; no "fixed allocation" exists: every unit is available until a guest
   actually books a place in it, and the couple book their own places like every other guest. Capacity is units × places,
   never a separate counter, and only real bookings consume it. Planning names in the Operations Master are never bookings.
   ONE EXCEPTION BY OWNER ORDER — THE COUPLE'S SUITE (19 Nov 2026): the Souphattra Presidential (one suite, one unit of two places —
   src/inventory-seed.js `couple`) is the couple's alone. Every guest still SEES it as the
   room it is (held by the couple, never free to them), but nobody else may join it, be placed, assigned or migrated into it, or
   have a party place kept in it (mayJoin, the join path, the Owners' assignments, Guest Relations' assign/migrate). The couple
   are the Billing Admin allowlist (src/billing/admin.js) — the verified identity for a join, the register ids for a write.
   A clean reset clears their places like everyone's; they take them again themselves.
   ONE EXCEPTION BY OWNER ORDER — AN EXTRA BED (17 Nov 2026): a room the seed gives `extraBeds` has one more sleeping place
   beyond its own — the room's capacity, open to every signed-in guest like its other places, nothing held in advance. The
   bed is a guest's own seat — never a place kept for a party member; the guest whose booking takes it is marked `bed`.

   A guest holds at most one place per STAGE of the journey: the wedding window is one stage whether spent in the hotel,
   the Souphattra or the Guest House.

   PARTY CAPACITY (Owner, 19 Sep 2026 · the package model): a booking that must fit a party names `need` — the places the
   party still needs in the unit; a unit whose free places cannot take them is refused ("full for your party") and the
   package moves to the next defined option. Nobody is ever partially booked.

   THE WAITING LIST (Owner, 19 Sep 2026): when no defined option of a stage can take the guest, the guest is waitlisted for
   the STAGE — one record per guest and stage, positioned by the time it was taken, renumbered as earlier entries resolve;
   a place held in the stage (by the guest or by Guest Relations) resolves it. No cost, no product, visibly unresolved.
   ========================================================================== */

import { SEED } from './inventory-seed.js';
import { canonicalKey } from './legacy-keys.js';
import { COMPLIMENTARY, deadlineState } from './stay-plan.js';
import { BILLING_ADMINS, isBillingAdmin } from './billing/admin.js';
import { checkHotelRooms, HOTEL_ROOMS_VERSION, hotelRoomOf } from './hotel-rooms.js';

export const PLACES = 2;
const OCC = 'occ:';
const WL = 'wl:';
const FN = 'fn:';   /* fn:<guestId> → the guest's first name, as the Worker last verified it from the register (PRQ-GAP-02) */
/* FIRST NAMES ONLY, FROM THE REGISTER (PRQ-GAP-02 · W7-140): the name an occupant is shown by is the first name the Worker
   put on the verified identity — one word, never a surname, never the registered display name, never what a browser sent */
export function firstNameOf(identity) {
  const s = String(identity && identity.firstName || '').replace(/[^\p{L}\p{M}' \-.]/gu, '').trim().split(/\s+/)[0] || '';
  return s.slice(0, 24);
}
/* the name shown for a stored place: the learned first name, else the first word of what the place stored — never more */
function shownName(o, names) {
  const learned = o && o.guestId && names[o.guestId];
  if (learned) return learned;
  return (String(o && o.name || '').trim().split(/\s+/)[0] || '').slice(0, 24);
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
/* THE OWNERS' ROOM ASSIGNMENTS (Owners, 18 Nov 2026) — the admin console's writes, kept in THIS engine (no second store):
   an occupancy the Owners placed carries by ('owners:BRIDE' | 'owners:GROOM'), placedAt and placedFrom (the labels of the same
   category the guest held before each placement, newest last); log:<at>:<n> is the change log; final is the released rooming list. */
const LOG = 'log:';
const LOG_KEEP = 1000;
const HISTORY_KEEP = 6;
const ADMIN_ROLES = ['BRIDE', 'GROOM'];
/* THE COUPLE'S SUITE (Owners, 19 Nov 2026): who may hold a place in a `couple` unit — the verified identity of a guest's own join
   (strict: hosts === true AND the allowlisted invitation + guest), or, for a write that names persons (Guest Relations, the Owners'
   bookings), the register ids themselves: the allowlisted invitation AND guest id together */
export function isCouple(identity) { return isBillingAdmin(identity); }
export function isCouplePerson(o) {
  const g = String((o && o.guestId) || ''), inv = String((o && o.invitationId) || '');
  return BILLING_ADMINS.some((a) => a.guestId === g && a.invitationId === inv);
}
export const COUPLE_GUESTS = Object.freeze(BILLING_ADMINS.map((a) => a.guestId));
/* the Owners' hotel room numbers of the Souphattra's units (src/hotel-rooms.js) — the engine's own store, beside the places */
const HOTEL = 'hotelrooms';
/* the fields of an occupancy that record WHO placed it — carried on by every rewrite of the same place (join again, extra bed) */
function placementOf(o) {
  return o ? { ...(o.by ? { by: o.by } : {}), ...(o.placedAt ? { placedAt: o.placedAt } : {}), ...(Array.isArray(o.placedFrom) ? { placedFrom: o.placedFrom } : {}) } : {};
}
async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* a window (the first segment of a key) belongs to one stage of the journey */
/* ONE SELECTION PER STAGE: a hold in one window releases the hold in the same window. (The withdrawn paid extension had its
   own stage so that changing it could never touch the wedding stay; with the feature gone, the stage is gone with it.) */
const STAGE_OF = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', guesthouse: 'wedstay', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };
export function stageOf(key) { const w = String(key || '').split('/')[0]; return STAGE_OF[w] || w; }
export const STAGES = ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski'];
/* the places a party booking of a stage may take: never more than the members who travel in it (the Worker's partyNeed) */
export function capNeed(identity, stage, asked) {
  const cap = identity && identity.partyNeed && Number(identity.partyNeed[stage]);
  return cap >= 1 ? Math.max(1, Math.min(asked, cap)) : asked;
}

/* the persistent units of one category — pure, deterministic, seed-derived; nothing is reserved for anyone */
export function unitsOf(key) {
  const s = SEED[key];
  if (!s) return [];
  if (s.unit === 'guest') {
    return [{ key, label: 'A', name: s.name, kind: 'property', places: s.capacity, reservedFor: null }];
  }
  const out = [];
  /* AN EXTRA BED (Owner, 17 Nov 2026): one more sleeping place beyond a room's own, for the guest ids the seed names only */
  const beds = new Map((s.extraBeds || []).map((b) => [String(b.label || '').toUpperCase(), b]));
  /* exactly one unit per physical room — never a Room G for six rooms */
  for (let i = 0; i < s.capacity; i++) {
    const label = i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26];
    const bed = beds.get(label);
    out.push({ key, label, name: 'Room ' + label, kind: 'room',
      /* the Owner's rule (15 Sep 2026): two guest places per room; a single room stays what it is; a room the Owner opened to its
         whole occupancy (honourOccupancy — the Penang suite, 27 Sep 2026) has that many */
      places: s.occupancy === 1 ? 1 : s.honourOccupancy ? s.occupancy : PLACES,
      reservedFor: null,
      ...(s.couple ? { couple: true } : {}),
      ...(s.ownersOnly ? { ownersOnly: true } : {}),
      ...(bed && Number(bed.beds) > 0 ? { extraBeds: Number(bed.beds) } : {}) });
  }
  /* A DEDICATED ROOM (002 · W · Owner, 29 Sep 2026): one more unit of the same category, for one register id only — its own
     label after the standard pool, its own place count; never the standard pool's */
  for (const d of s.dedicated || []) out.push({ key, label: d.label, name: 'Room ' + d.label, kind: 'room', places: d.places, reservedFor: null, dedicatedTo: d.contactId, rate: d.rate || null });
  return out;
}
/* the units ONE guest may see and take: the guest a dedicated room belongs to sees that room alone (never the standard pool);
   everyone else — and a view without an identity — the standard pool alone (a dedicated room is nobody else's, not even to count) */
export function unitsFor(key, identity) {
  const all = unitsOf(key), cid = identity && identity.contactId;
  const own = cid ? all.filter((u) => u.dedicatedTo === cid) : [];
  return own.length ? own : all.filter((u) => !u.dedicatedTo);
}
/* the stages in which this register id has a room of their own (the Worker leaves them out of their party's booking there) */
export function dedicatedStages(contactId) {
  if (!contactId) return [];
  return [...new Set(Object.keys(SEED).filter((k) => (SEED[k].dedicated || []).some((d) => d.contactId === contactId)).map(stageOf))];
}
export function allUnits() {
  const out = [];
  for (const key of Object.keys(SEED)) out.push(...unitsOf(key));
  return out;
}
export function unitOf(key, label) { return unitsOf(key).find((u) => u.label === String(label || '').toUpperCase()) || null; }
/* THE EXTRA BEDS OF A UNIT (Owners, 17 Nov 2026): the room's own, the same for every guest — capacity is the room's, never a
   guest's permission. The bed is a guest's own seat only — never a place kept for a party member (review, 17 Nov 2026). */
export function bedsFor(unit) {
  return unit && unit.extraBeds ? unit.extraBeds : 0;
}

/* who may take a place in a unit: any authenticated guest, in any unit (Owner, 15 Sep 2026 · 19 Sep 2026) */
export function mayJoin(unit, identity) {
  if (!unit) return { ok: false, error: 'unknown room' };
  if (!identity) return { ok: false, error: 'unauthorised' };
  /* the couple's suite (Owners, 19 Nov 2026): Haruthai's and Suthep's alone */
  if (unit.couple && !isCouple(identity)) return { ok: false, error: 'the couple\'s suite' };
  /* the Owners' placement only (Owners, 27 Nov 2026 · HS-060): never taken by a guest — its holders keep the place the Owners gave them */
  if (unit.ownersOnly) return { ok: false, error: 'not offered' };
  return { ok: true };
}

/* ONE CANONICAL AVAILABILITY OBJECT per category (Owner, 16 Sep 2026): the source inventory minus the real guest bookings —
   the same object every surface renders, the same rule the booking answers by. soldOut is remainingPlaces === 0 and nothing
   else: never a guest's own selection, never the CTA. */
export function availabilityOf(key, list) {
  /* a bed this viewer may use counts in the source too — never "27 of 26" (review, 17 Nov 2026) */
  const sourcePlaces = list.reduce((n, u) => n + u.places + (u.extraBeds || 0), 0);
  const remainingPlaces = list.reduce((n, u) => n + u.free, 0), remainingRooms = list.filter((u) => u.free > 0).length;
  /* THE COUNTING GRAMMAR (PRQ-03-09): an EMPTY room is one nobody holds a place in; a SHARED free place is a free place
     inside a room someone already holds — "rooms left" counts the first, never a half-held room */
  /* a room is empty only where a place is free to this viewer — the couple's suite is never an empty room to a guest */
  const emptyRooms = list.filter((u) => u.taken === 0 && u.free > 0).length;
  const sharedFree = list.filter((u) => u.taken > 0).reduce((n, u) => n + u.free, 0);
  return {
    units: list.length, places: sourcePlaces,
    sourceRooms: list.length, sourcePlaces,
    ownerReservedRooms: 0, ownerReservedPlaces: 0,
    guestOccupiedRooms: list.filter((u) => u.taken > 0).length, guestOccupiedPlaces: list.reduce((n, u) => n + u.taken, 0),
    remainingRooms, remainingPlaces, soldOut: remainingPlaces === 0,
    emptyRooms, sharedFree,
    reserved: 0, reservedFor: null,
    /* the largest number of places still free together in one unit — what a party can be booked into as one */
    largestFree: list.reduce((m, u) => Math.max(m, u.free), 0),
    free: remainingPlaces, rooms: remainingRooms,
    name: SEED[key].name, kind: list.length ? list[0].kind : 'room',
  };
}

/* one guest's placement history per stage: [{ key, label }] (same category), newest last — what the Worker undoes to recognise
   the trip as the guest sent it */
export function placedOfGuest(occ, guestId) {
  const out = {};
  for (const o of occ || []) if (!o.placeholder && o.guestId === guestId && Array.isArray(o.placedFrom) && o.placedFrom.length) out[stageOf(o.key)] = o.placedFrom.map((l) => ({ key: o.key, label: l }));
  return out;
}

export class Rooms {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  /* every place held, as { key, label, guestId, invitationId, partyId, name, at } — the stored holds and nothing else */
  async occupancies() {
    const map = await this.storage.list({ prefix: OCC });
    const out = [];
    for (const [k, v] of map) {
      const parts = k.slice(OCC.length).split('|');   /* occ:<key>|<label>|<guestId>  ·  a party place: guestId '~<partyId>~<n>' */
      /* A REPLACED PRODUCT IS READ AS ITS SUCCESSOR (Owner, 28 Sep 2026 · src/legacy-keys.js): a hold stored under the Siam
         Kempinski's room is a hold of Hotel Muse Bangkok's Jatu Room — the same guest, unit and time, counted once. The row stays
         where it is until that guest's own write; `sk` is where it really lives, so a release always reaches it. */
      const key = canonicalKey(parts[0]);
      if (!SEED[key]) continue;   /* a row of a retired key (an older release) is nobody's and blocks nothing */
      const row = { key, label: parts[1], guestId: parts[2], placeholder: parts[2].charAt(0) === '~', ...v };
      Object.defineProperty(row, 'sk', { value: k, enumerable: false });
      out.push(row);
    }
    return out;
  }
  /* PARTY PLACES (Owner, 19 Sep 2026 · never partially booked): when a guest of a party of N takes a unit with `need` N, the
     places the absent members will take are KEPT in the unit as party places — a stranger cannot take them; each party
     member's own join consumes one; they leave with the last party member, and a member who says "not joining" gives one back */
  /* the places kept for this guest's party in a stage, trimmed to the members who still travel there: one kept place for each
     member who travels in the stage (by their own answer) and holds no place of their own in it; the surplus goes (newest
     first). Only anonymous kept places — never a guest's own hold. A waiting-list entry of this guest asks for no more places
     than travel. */
  async trimParty(identity) {
    const occ = await this.occupancies(), trimmed = [], T = identity.partyTravels && typeof identity.partyTravels === 'object' ? identity.partyTravels : null;
    for (const stage of STAGES) {
      if (T) {
        const inStage = occ.filter((o) => stageOf(o.key) === stage && o.partyId === identity.partyId);
        const holders = new Set(inStage.filter((o) => !o.placeholder).map((o) => o.guestId));
        /* places are kept only beside a member who holds one — a stage the party holds nothing in is left as it is */
        if (holders.size) {
          /* a place is kept for each member who travels in this stage and holds no place of their own in it */
          const owed = Object.keys(T).filter((g) => T[g] && T[g][stage] === true && !holders.has(g)).length;
          const kept = inStage.filter((o) => o.placeholder).sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
          for (const ph of kept.slice(0, Math.max(0, kept.length - owed))) { await this.storage.delete(this.rowKey(ph)); trimmed.push(ph.key + '|' + ph.label); }
        }
      }
      const need = Number(identity.partyNeed[stage]);
      if (need >= 1) {
        const w = await this.storage.get(this.wlKey(stage, identity.guestId));
        if (w && (w.size || 1) > need) await this.storage.put(this.wlKey(stage, identity.guestId), { ...w, size: need });
      }
    }
    return trimmed;
  }
  partyKey(key, label, partyId, n) { return this.keyOf(key, label, '~' + partyId + '~' + n); }
  async partyPlaces(key, label, partyId, occ) {
    const list = occ || await this.occupancies();
    return list.filter((o) => o.placeholder && o.key === key && o.label === label && o.partyId === partyId);
  }
  keyOf(key, label, guestId) { return OCC + key + '|' + label + '|' + guestId; }
  /* where an occupancy row really lives (a legacy row keeps its former key until its guest writes) */
  rowKey(o) { return o.sk || this.keyOf(o.key, o.label, o.guestId); }
  /* the guest's own HOLDS in a stage */
  async mineIn(stage, guestId, occ) {
    const list = occ || await this.occupancies();
    return list.filter((o) => o.guestId === guestId && stageOf(o.key) === stage);
  }
  /* THE WAITING LIST: every entry, positioned per stage by the time it was taken (1 = first) */
  async waitlist() {
    const map = await this.storage.list({ prefix: WL });
    const rows = [];
    for (const [k, v] of map) { const parts = k.slice(WL.length).split('|'); rows.push({ stage: parts[0], guestId: parts[1], ...v }); }   /* wl:<stage>|<guestId> */
    rows.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.guestId < b.guestId ? -1 : 1));
    const pos = {};
    for (const r of rows) { pos[r.stage] = (pos[r.stage] || 0) + 1; r.position = pos[r.stage]; }
    return rows;
  }
  wlKey(stage, guestId) { return WL + stage + '|' + guestId; }
  /* a place held in a stage resolves the guest's waiting-list entry for it */
  async resolveWait(stage, guestId) { await this.storage.delete(this.wlKey(stage, guestId)); }
  /* every first name the engine has learned — a place taken before the rule is re-labelled on read, never rewritten */
  async firstNames() {
    const map = await this.storage.list({ prefix: FN });
    const out = {};
    for (const [k, v] of map) out[k.slice(FN.length)] = v;
    return out;
  }
  async logOf(limit) {
    const map = await this.storage.list({ prefix: LOG });
    return [...map.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)) || (b.n || 0) - (a.n || 0)).slice(0, limit || 300);
  }
  /* the Owners' hotel room numbers: { version, at, by, note, rooms: { '<key>|<label>': ['105'] } } — version 0 while none is stored */
  async hotelRooms() {
    const h = await this.storage.get(HOTEL);
    return h && typeof h === 'object' ? { version: h.version || 0, at: h.at || null, by: h.by || null, note: h.note || null, rooms: h.rooms || {}, list: HOTEL_ROOMS_VERSION }
      : { version: 0, at: null, by: null, note: null, rooms: {}, list: HOTEL_ROOMS_VERSION };
  }
  async logWrites(entries) {
    const at = new Date().toISOString(), puts = {}, dels = [];
    /* a key of its own for every entry — two confirmed writes in the same millisecond never overwrite each other's log */
    const tag = (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, '').slice(0, 10);
    entries.forEach((e, n) => { puts[LOG + at + ':' + tag + ':' + String(n).padStart(3, '0')] = { at, n, ...e }; });
    const keys = [...(await this.storage.list({ prefix: LOG })).keys()].sort();
    const over = keys.length + entries.length - LOG_KEEP;
    for (let i = 0; i < over; i++) dels.push(keys[i]);
    return { puts, dels };
  }
  async learnName(identity) {
    const nm = firstNameOf(identity);
    if (!nm || !identity.guestId) return;
    if ((await this.storage.get(FN + identity.guestId)) !== nm) await this.storage.put(FN + identity.guestId, nm);
  }

  /* the engine as one guest sees it. With an identity: first names and the
   * guest's own places; without one: counts only, no name, no id. */
  async view(identity) {
    const occ = await this.occupancies();
    const names = identity ? await this.firstNames() : {};
    const units = {}, mine = {};
    for (const key of Object.keys(SEED)) {
      units[key] = unitsFor(key, identity).map((u) => {
        const here = occ.filter((o) => o.key === key && o.label === u.label);
        const taken = here.length;
        /* THE OCCUPANCY IS VISIBLE (Owner, 19 Sep 2026): every authenticated guest sees who already holds a place — the first
           name only; never an email, a phone number, a code */
        const occupants = identity
          ? here.map((o) => (o.placeholder
              /* a place kept for a party is not a person: no name, the state words say it (GAP-082) */
              ? { name: '', mine: false, party: !!(identity.partyId && o.partyId === identity.partyId), placeholder: true }
              : { name: shownName(o, names), mine: o.guestId === identity.guestId, party: !!(identity.partyId && o.partyId === identity.partyId), ...(o.guestId === identity.guestId ? { guestId: o.guestId } : {}) }))
          : here.map(() => ({}));
        const elig = !identity ? { ok: false } : mayJoin(u, identity);
        /* the room's extra bed, the same for everyone (Owners, 17 Nov 2026) */
        const beds = bedsFor(u);
        /* the couple's suite is seen as the room it is — and never as a free place by anyone but the couple (Owners, 19 Nov 2026) */
        const closed = !!u.couple && !isCouple(identity);
        /* the Owners' placement only (HS-060) is never a free place for anyone: its holders see their own place in it */
        const shut = closed || !!u.ownersOnly;
        return { key, label: u.label, name: u.name, kind: u.kind, places: u.places, reservedFor: null, ...(u.dedicatedTo ? { dedicated: true, rate: u.rate } : {}),
                 ...(u.couple ? { couple: true } : {}),
                 ...(u.ownersOnly ? { ownersOnly: true } : {}),
                 ...(beds ? { extraBeds: beds } : {}),
                 eligible: elig.ok, occupants, taken, free: shut ? 0 : Math.max(0, u.places + beds - taken), full: shut || taken >= u.places + beds };
      });
    }
    if (identity) for (const o of occ) if (!o.placeholder && o.guestId === identity.guestId) mine[stageOf(o.key)] = { key: o.key, label: o.label };
    const summary = {};
    for (const key of Object.keys(units)) summary[key] = availabilityOf(key, units[key]);
    /* the waiting list: the guest's own entries with their positions; every stage's length for everyone */
    const wl = await this.waitlist();
    const waitlist = {}, waiting = {};
    for (const r of wl) { waiting[r.stage] = (waiting[r.stage] || 0) + 1; if (identity && r.guestId === identity.guestId) waitlist[r.stage] = { at: r.at, position: r.position, size: r.size || 1, wanted: r.wanted || [] }; }
    /* THE COMPLIMENTARY ALLOCATION (Owner, 22 Sep 2026): one object, from the stock and the holds — never a number typed into
       a page. `max` is the seed's capacity, `remaining` what is actually free, `closed` the deadline or a full house. */
    const cs = summary[COMPLIMENTARY.key] || null, dl = deadlineState(new Date());
    const complimentary = {
      key: COMPLIMENTARY.key, max: cs ? cs.sourcePlaces : 0, taken: cs ? cs.guestOccupiedPlaces : 0, remaining: cs ? cs.remainingPlaces : 0,
      full: !!cs && cs.remainingPlaces <= 0, phase: dl.phase, days: dl.days, deadline: dl.deadline, deadlineWords: dl.deadlineWords,
      open: dl.open && !!cs && cs.remainingPlaces > 0,
      mine: !!(identity && occ.some((o) => !o.placeholder && o.guestId === identity.guestId && o.key === COMPLIMENTARY.key))
    };
    return { ok: true, units, summary, mine, waitlist, waiting, places: PLACES, complimentary };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/rooms\/?/, '') || 'read';
    const gr = request.headers.get('x-gr-verified') === 'yes';
    let identity = null;
    try { identity = JSON.parse(request.headers.get('x-siyl-identity') || 'null'); } catch (e) { identity = null; }

    if (identity) await this.learnName(identity);
    /* WHO OF THE PARTY TRAVELS (Owner, 25 Sep 2026 · mixed attendance): the Worker names, per stay stage, the places a booking
       of this guest may take — the guest and the members whose own answer keeps that stage (src/stage-graph.js · partyNeed).
       A place kept for a member who is not travelling there is given back — the rule a member who says "not joining" always
       had, now applied whoever of the party is on the page, so an answer given earlier never leaves a phantom traveller. */
    if (identity && identity.partyId && identity.partyNeed && typeof identity.partyNeed === 'object') await this.state.blockConcurrencyWhile(() => this.trimParty(identity));
    if (op === 'read') return json(await this.view(identity));
    if (op === 'mine') {
      const v = await this.view(identity);
      /* THE OWNERS' PLACEMENT IS THEIRS, NOT THE GUEST'S (Owners, 18 Nov 2026): beside `mine` — never inside it, `mine` is part of the
         trip's fingerprint — the labels this guest held before each placement by the Owners, per stage */
      const placed = identity ? placedOfGuest(await this.occupancies(), identity.guestId) : {};
      return json({ ok: true, mine: v.mine, waitlist: v.waitlist, complimentary: v.complimentary, ...(Object.keys(placed).length ? { placed } : {}) });
    }
    /* GUEST RELATIONS' OVERVIEW (28 Sep 2026): every guest's own `mine` and waiting-list entries in ONE read — exactly what `mine`
       answers one guest at a time (the same order, the same fields); the Guest Relations token only; nothing is written */
    if (op === 'gr-mine') {
      if (!gr) return json({ ok: false, error: 'unauthorised' }, 401);
      const occ = await this.occupancies(), wl = await this.waitlist(), byGuest = {};
      const of = (g) => byGuest[g] || (byGuest[g] = { mine: {}, waitlist: {} });
      for (const o of occ) if (!o.placeholder && o.guestId) of(o.guestId).mine[stageOf(o.key)] = { key: o.key, label: o.label };
      for (const o of occ) if (!o.placeholder && o.guestId && Array.isArray(o.placedFrom) && o.placedFrom.length) (of(o.guestId).placed = of(o.guestId).placed || {})[stageOf(o.key)] = o.placedFrom.map((l) => ({ key: o.key, label: l }));
      for (const r of wl) if (r.guestId) of(r.guestId).waitlist[r.stage] = { at: r.at, position: r.position, size: r.size || 1, wanted: r.wanted || [] };
      return json({ ok: true, byGuest });
    }
    /* HS-058.7 · THE GUEST'S OWN ROOM ON THE SITE PLAN (Owners, 22 Nov 2026): for ONE guest id — the Worker's verified bearer
       (/api/my-room), never an id a client chose — the Souphattra-stay places that guest holds now, each with the hotel number the
       Owners assigned to that unit ("a number is enough": none assigned → null, and the guest reads a neutral note). Verified
       callers only: /api/rooms never forwards x-gr-verified for this op, so no guest can ask for another guest's room. Nothing is
       written; no other guest's place, name or number is read out. */
    if (op === 'gr-own-room') {
      if (!gr) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request), gid = String((body && body.guestId) || '');
      if (!/^G\d{3,}$/.test(gid)) return json({ ok: false, error: 'invalid guest' }, 400);
      const own = (await this.occupancies()).filter((o) => !o.placeholder && o.guestId === gid && (stageOf(o.key) === 'prewed' || stageOf(o.key) === 'wedstay'));
      const assigned = (await this.hotelRooms()).rooms;
      return json({ ok: true, stays: own.map((o) => ({ stage: stageOf(o.key), key: o.key, label: o.label, name: (SEED[o.key] && SEED[o.key].name) || '', bed: !!o.bed, placedFrom: Array.isArray(o.placedFrom) ? o.placedFrom.map(String) : [], hotelRoom: hotelRoomOf(o.key, o.label, assigned) })) });
    }
    /* WHO STAYS WHERE (Owner, 2 Oct 2026): every real place held — the guest id, the stay and its unit, the first name the engine
       learned — for the Worker's Wedding Circle, which joins it to the joining cohort by guest id and returns no unit label, no
       invitation and no party; a place kept for a party is not a person and is not listed. Verified callers only; nothing is written. */
    if (op === 'gr-occupants') {
      if (!gr) return json({ ok: false, error: 'unauthorised' }, 401);
      const occ = await this.occupancies(), names = await this.firstNames();
      return json({ ok: true, occupants: occ.filter((o) => !o.placeholder && o.guestId).map((o) => ({ guestId: o.guestId, key: o.key, label: o.label, name: shownName(o, names),
        ...(Array.isArray(o.placedFrom) && o.placedFrom.length ? { placedFrom: o.placedFrom } : {}) })) });
    }

    if (op === 'join' || op === 'leave' || op === 'wait' || op === 'unwait') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      const key = canonicalKey(String(body && body.key || '').trim());   /* the former key is read as its successor; only the canonical one is written */
      const label = String(body && body.label || '').trim().toUpperCase();
      /* the name a browser sends is not trusted (PRQ-GAP-02): the place carries the register's first name the Worker verified */
      const name = firstNameOf(identity);
      return await this.state.blockConcurrencyWhile(async () => {
        if (op === 'leave') {
          const stage = key ? stageOf(key) : String(body && body.stage || '');
          if (!stage) return json({ ok: false, error: 'invalid release' }, 400);

          /* A RELEASE NAMES ITS WINDOW (Codex confirming pass, release 012): a device that still shows the Souphattra it removed
             must not release the other house the guest holds meanwhile — with `window` only the places of that window go; the
             stage-wide release (no window) stays for the planner's own reconciliation */
          const win = String(body && body.window || '').trim();
          const occ0 = await this.occupancies();
          const had = (await this.mineIn(stage, guestId, occ0)).filter((o) => !win || String(o.key).split('/')[0] === win);
          for (const o of had) await this.storage.delete(this.rowKey(o));
          if (identity.partyId) {
            if (had.length) {
              /* the last real party member leaving a unit takes the party's kept places with them */
              for (const o of had) {
                const others = occ0.filter((x) => !x.placeholder && x.key === o.key && x.label === o.label && x.partyId === identity.partyId && x.guestId !== guestId);
                if (!others.length) for (const ph of await this.partyPlaces(o.key, o.label, identity.partyId, occ0)) await this.storage.delete(this.rowKey(ph));
                /* …and with the last real member of the party in the whole category, every place kept for it there */
                const anyLeft = occ0.some((x) => !x.placeholder && x.key === o.key && x.partyId === identity.partyId && x.guestId !== guestId);
                if (!anyLeft) for (const ph of occ0.filter((x) => x.placeholder && x.key === o.key && x.partyId === identity.partyId)) await this.storage.delete(this.rowKey(ph));
              }
            } else {
              /* a member who holds nothing in the stage and says "not joining" gives ONE kept party place of the stage back */
              const ph = occ0.filter((x) => x.placeholder && x.partyId === identity.partyId && stageOf(x.key) === stage && (!win || String(x.key).split('/')[0] === win))[0];
              if (ph) await this.storage.delete(this.rowKey(ph));
            }
          }
          return json({ ok: true, released: had.map((o) => ({ key: o.key, label: o.label })), ...(await this.view(identity)) });
        }
        /* THE WAITING LIST: the guest takes a place in the line for a stage (once), or leaves it */
        if (op === 'wait' || op === 'unwait') {
          const stage = String(body && body.stage || '');
          if (!STAGES.includes(stage)) return json({ ok: false, error: 'invalid stage' }, 400);
          if (op === 'unwait') { await this.storage.delete(this.wlKey(stage, guestId)); return json({ ok: true, ...(await this.view(identity)) }); }
          if ((await this.mineIn(stage, guestId)).length) return json({ ...(await this.view(identity)), ok: false, error: 'a place is held in this stage' }, 409);
          const cur = await this.storage.get(this.wlKey(stage, guestId));
          const size = capNeed(identity, stage, Math.max(1, Math.min(6, parseInt(body && body.size, 10) || 1)));
          const wanted = (Array.isArray(body && body.wanted) ? body.wanted : []).map((x) => canonicalKey(String(x).slice(0, 64))).filter((x) => SEED[x]).slice(0, 12);
          /* a second wait keeps the place in the line (`at`) and updates what is asked for (a party that grew, another chain) */
          await this.storage.put(this.wlKey(stage, guestId), { invitationId, partyId: identity.partyId || null, name, at: cur && cur.at ? cur.at : new Date().toISOString(), size, wanted });
          return json({ ok: true, waited: stage, ...(await this.view(identity)) });
        }
        const unit = unitsFor(key, identity).find((u) => u.label === label) || null;
        /* a dedicated room is its guest's alone, and that guest's room is the dedicated one (002 · W): anyone else asking for it —
           or its guest asking for a room of the standard pool — is refused, nothing is written */
        if (!unit) return unitOf(key, label) ? json({ ...(await this.view(identity)), ok: false, error: 'not your room' }, 403) : json({ ok: false, error: 'unknown room' }, 404);
        /* THE COMPLIMENTARY DEADLINE (Owner, 22 Sep 2026): after 30 November 2026 no NEW place in the Guest House may be
           claimed — a place released afterwards is an administrative decision, never a silent reopening. A guest who already
           holds a place there keeps it, and may confirm it again; every paid option stays open. */
        if (key === COMPLIMENTARY.key) {
          const dl = deadlineState(new Date());
          if (!dl.open) {
            const hasIt = (await this.occupancies()).some((o) => !o.placeholder && o.guestId === guestId && o.key === COMPLIMENTARY.key);
            if (!hasIt) return json({ ...(await this.view(identity)), ok: false, error: 'complimentary closed', deadline: dl }, 409);
          }
        }
        /* THE OWNERS' PLACEMENT ONLY (HS-060): the guest the Owners placed there asking for it again keeps it, nothing is written;
           anyone else is refused below (mayJoin) */
        if (unit.ownersOnly && (await this.occupancies()).some((o) => !o.placeholder && o.key === key && o.label === label && o.guestId === guestId)) {
          return json({ ...(await this.view(identity)), ok: true, unchanged: true });
        }
        const may = mayJoin(unit, identity);
        if (!may.ok) return json({ ...(await this.view(identity)), ok: false, error: may.error }, 403);
        const occ = await this.occupancies();
        const already = occ.some((o) => o.key === key && o.label === label && o.guestId === guestId);
        const myParty = (o) => !!(identity.partyId && o.partyId === identity.partyId);
        /* a place kept for this guest's party is theirs to take: it does not count against them */
        const others = occ.filter((o) => o.key === key && o.label === label && o.guestId !== guestId && !(o.placeholder && myParty(o))).length;
        /* a place KEPT here for this guest's party is theirs: taking it adds nobody to the room — never "full", never the bed
           (review, 17 Nov 2026: a person on the extra bed must not count against a place the party already holds) */
        const keptMine = identity.partyId ? await this.partyPlaces(key, label, identity.partyId, occ) : [];
        /* the guest's own seat may be the extra bed the seed names for them (Owner, 17 Nov 2026) */
        const beds = bedsFor(unit, guestId);
        if (!already && !keptMine.length && others >= unit.places + beds) return json({ ...(await this.view(identity)), ok: false, error: 'full' }, 409);   /* the last place was just filled: one wins, the other chooses another room */
        /* the room's own places are taken: this guest's seat is the extra bed — theirs alone, nobody of the party beside it */
        const onBed = !already && !keptMine.length && beds > 0 && others >= unit.places;
        /* PARTY CAPACITY (Owner, 19 Sep 2026 · never partially booked): `need` = the party's size. A party that fits ONE unit
           takes it whole (the members already here and the places kept for them count). A party larger than a unit fills
           this unit and keeps the rest of its places in the other units of the category — or is refused as a whole. */
        /* a dedicated room takes its one guest and nobody of the party: no place is ever kept there for a party member */
        const need = unit.dedicatedTo ? 1 : capNeed(identity, stageOf(key), Math.max(1, Math.min(6, parseInt(body && body.need, 10) || 1)));
        const partyHere = identity.partyId ? occ.filter((o) => o.key === key && o.label === label && myParty(o) && o.guestId !== guestId).length : 0;
        const freeForMe = unit.places - others;
        /* only the units this guest may see and take: never a dedicated room of someone else, never the couple's suite */
        const catUnits = unitsFor(key, identity).filter((u) => mayJoin(u, identity).ok);
        const freeIn = (u) => u.places - occ.filter((o) => o.key === key && o.label === u.label && o.guestId !== guestId && !(o.placeholder && myParty(o))).length;
        /* the party in a unit of the category: its members (not this guest) and the places kept for it — except the places kept
           in a unit this guest is about to leave alone (they move with the guest) */
        const realOthersIn = (u) => occ.filter((o) => !o.placeholder && o.key === key && o.label === u.label && myParty(o) && o.guestId !== guestId).length;
        const leaving = (u) => u.label !== label && occ.some((o) => !o.placeholder && o.key === key && o.label === u.label && o.guestId === guestId) && realOthersIn(u) === 0;
        const partyIn = (u) => identity.partyId ? occ.filter((o) => o.key === key && o.label === u.label && myParty(o) && o.guestId !== guestId && !(o.placeholder && leaving(u))).length : 0;
        const keptHere = keptMine;
        /* what the party still needs once this guest sits here: the members and kept places of the whole category count (a kept
           place this guest takes is theirs, not a second person) */
        const partyCat = catUnits.reduce((n, u) => n + partyIn(u), 0);
        const remainingNeed = already ? 0 : Math.max(0, need - partyCat - 1 + (keptHere.length ? 1 : 0));
        let keepHere = 0, spread = [];   /* places kept here, and [unit, places] kept in other units for a party larger than this unit */
        if (onBed) {
          /* the extra bed takes this guest alone: a party still needing places beside them here is refused, nothing kept */
          if (need - partyHere > 1) return json({ ...(await this.view(identity)), ok: false, error: 'full for your party', need, free: 1 }, 409);
        } else if (!already) {
          if (need <= unit.places) {
            if (need - partyHere > freeForMe) return json({ ...(await this.view(identity)), ok: false, error: 'full for your party', need, free: freeForMe }, 409);
            keepHere = Math.max(0, Math.min(remainingNeed, freeForMe - 1));
          } else {
            if (freeForMe < 1 && !keptMine.length) return json({ ...(await this.view(identity)), ok: false, error: 'full' }, 409);
            keepHere = Math.max(0, Math.min(remainingNeed, freeForMe - 1));
            let rest = remainingNeed - keepHere;
            const others2 = catUnits.filter((u) => u.label !== label).map((u) => [u, freeIn(u)]).sort((x, y) => y[1] - x[1]);
            for (const [u, f] of others2) { if (rest <= 0) break; const take = Math.min(rest, f); if (take > 0) { spread.push([u, take]); rest -= take; } }
            if (rest > 0) return json({ ...(await this.view(identity)), ok: false, error: 'full for your party', need, free: catUnits.reduce((n, u) => n + freeIn(u), 0) }, 409);
          }
        }
        /* HOLD THE NEW PLACE FIRST … — a place this guest already holds here under the former key is the same place: it is
           re-keyed to the canonical key with its own time, never released and taken again */
        const heldHere = occ.find((o) => !o.placeholder && o.key === key && o.label === label && o.guestId === guestId);
        /* the guest whose booking takes the extra bed is marked: the statement check asks for that person's own rate only */
        await this.storage.put(this.keyOf(key, label, guestId), { invitationId, partyId: identity.partyId || null, name, at: heldHere && heldHere.at ? heldHere.at : new Date().toISOString(),
          ...((onBed || (heldHere && heldHere.bed)) ? { bed: true } : {}),
          /* the same place joined again stays the Owners' placement (who placed it, from where) */
          ...placementOf(heldHere) });
        if (heldHere && this.rowKey(heldHere) !== this.keyOf(key, label, guestId)) await this.storage.delete(this.rowKey(heldHere));
        if (identity.partyId) {
          /* … this guest's own join takes one place kept for the party here; the places the absent members still need are kept */
          if (keptHere.length) await this.storage.delete(this.rowKey(keptHere[0]));
          const stamp = Date.now();
          for (let n = 0; n < keepHere; n++) await this.storage.put(this.partyKey(key, label, identity.partyId, stamp + '-' + n), { invitationId: null, partyId: identity.partyId, name: '', at: new Date().toISOString(), by: guestId });
          for (const [u, take] of spread) for (let n = 0; n < take; n++) await this.storage.put(this.partyKey(key, u.label, identity.partyId, stamp + '-' + u.label + n), { invitationId: null, partyId: identity.partyId, name: '', at: new Date().toISOString(), by: guestId });
        }
        /* … AND ONLY THEN LET THE OLD ONE GO — every other place of this stage; a place held resolves the waiting-list entry */
        const stage = stageOf(key);
        for (const o of occ) {
          if (o.guestId === guestId && stageOf(o.key) === stage && !(o.key === key && o.label === label)) {
            await this.storage.delete(this.rowKey(o));
            /* the party's kept places leave the old unit with its last real party member */
            if (identity.partyId && !occ.some((x) => !x.placeholder && x.key === o.key && x.label === o.label && myParty(x) && x.guestId !== guestId)) {
              for (const ph of await this.partyPlaces(o.key, o.label, identity.partyId, occ)) await this.storage.delete(this.rowKey(ph));
            }
          }
        }
        await this.resolveWait(stage, guestId);
        return json({ ok: true, joined: { key, label }, ...(await this.view(identity)) });
      });
    }

    /* THE PAID EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): the `extend` and `unextend` operations, the stock they held and
       the one-to-four-nights workflow are gone from this engine. A guest cannot self-book extra nights, and the website names
       no hotel for them: Guest Relations arranges them outside this engine. The Riverside Hotel Vientiane was retired
       COMPLETELY the same day — neither of its products exists any more, and the wedding window is the Souphattra and the
       Guest House. */

    /* ---- Guest Relations only ---- */
    if (!gr) return json({ ok: false, error: 'unknown rooms operation' }, 404);

    /* ---- THE OWNERS' ROOM ASSIGNMENTS (Owners, 18 Nov 2026) ----------------------------------------------------------------
       Only through the admin console's routes (src/billing-routes.js · BILLING_ADMIN): the Worker sets x-gr-verified AND names the
       Owner (x-siyl-admin: BRIDE | GROOM); the public /api/rooms route never forwards either.
       THE SCOPE IS AN ASSIGNMENT, NEVER A BOOKING: guests are re-arranged among the rooms of ONE category of ONE stay — a move into a
       free place, a swap, a new arrangement. Nobody is added to or removed from a stay, no category or stay changes (that changes
       the rate, the nights or the payer: a booking change), an extra bed in use, a place kept for a party and a guest's own
       dedicated room are never touched, and no room is filled beyond its own places — so no booked rate, statement, payment or
       stay length can change by an assignment. A change that changes how many rooms of the category are occupied (the hotel's
       purchase side) is named and needs the Owners' explicit approval. */
    if (op.startsWith('admin-')) {
      const admin = ADMIN_ROLES.includes(request.headers.get('x-siyl-admin') || '') ? request.headers.get('x-siyl-admin') : null;
      if (!admin) return json({ ok: false, error: 'unknown rooms operation' }, 404);
      const by = 'owners:' + admin;
      const realOf = (occ, key, label) => occ.filter((o) => !o.placeholder && o.key === key && o.label === label);
      const digestOf = async (occ) => {
        const rows = occ.filter((o) => !o.placeholder && o.guestId).map((o) => [o.key, o.label, o.guestId, o.bed ? 1 : 0]).sort((a, b) => (a.join('|') < b.join('|') ? -1 : 1));
        return { rows, digest: await sha256Hex(JSON.stringify(rows)) };
      };

      if (op === 'admin-read') {
        const occ = await this.occupancies(), names = await this.firstNames(), d = await digestOf(occ);
        const fin = (await this.storage.get('final')) || null;
        const units = {};
        for (const key of Object.keys(SEED)) {
          units[key] = unitsOf(key).map((u) => ({ label: u.label, name: u.name, kind: u.kind, places: u.places, extraBeds: u.extraBeds || 0, dedicated: !!u.dedicatedTo, ...(u.couple ? { couple: true } : {}), ...(u.ownersOnly ? { ownersOnly: true } : {}),
            kept: occ.filter((o) => o.placeholder && o.key === key && o.label === u.label).length,
            occupants: realOf(occ, key, u.label).map((o) => ({ guestId: o.guestId, invitationId: o.invitationId || null, partyId: o.partyId || null, name: shownName(o, names), at: o.at || null,
              ...(o.bed ? { bed: true } : {}), ...(o.by ? { by: o.by } : {}), ...(o.placedAt ? { placedAt: o.placedAt } : {}), ...(Array.isArray(o.placedFrom) ? { placedFrom: o.placedFrom } : {}) })) }));
        }
        return json({ ok: true, units, waitlist: await this.waitlist(), digest: d.digest, hotelRooms: await this.hotelRooms(),
          final: fin ? { version: fin.version, at: fin.at, by: fin.by, digest: fin.digest, rows: fin.rows, active: fin.active !== false, withdrawnAt: fin.withdrawnAt || null, current: fin.active !== false && fin.digest === d.digest } : null,
          log: (await this.logOf(300)) });
      }

      if (op === 'admin-apply') {
        const body = await safeJson(request);
        const target = body && body.target && typeof body.target === 'object' ? body.target : null;
        const expect = body && body.expect && typeof body.expect === 'object' ? body.expect : null;
        if (!target || !expect) return json({ ok: false, error: 'invalid change', reason: 'INVALID' }, 400);
        const tk = Object.keys(target).sort(), ek = Object.keys(expect).sort();
        if (!tk.length || tk.length > 20) return json({ ok: false, error: 'a change names 1 to 20 rooms', reason: 'INVALID' }, 400);
        if (JSON.stringify(tk) !== JSON.stringify(ek)) return json({ ok: false, error: 'every room of the change must name who was seen there', reason: 'INVALID' }, 400);
        const list = (v) => (Array.isArray(v) ? v.map(String) : null);
        for (const k of tk) if (!list(target[k]) || !list(expect[k]) || [...target[k], ...expect[k]].some((g) => !/^G\d{3,}$/.test(String(g)))) return json({ ok: false, error: 'invalid guests for ' + k, reason: 'INVALID' }, 400);
        const parts = tk.map((k) => { const i = k.lastIndexOf('|'); return { k, key: canonicalKey(k.slice(0, i)), label: k.slice(i + 1).toUpperCase() }; });
        const key = parts[0].key;
        /* ONE CATEGORY OF ONE STAY: another category or stay is a booking change (rate · nights · payer) — never an assignment */
        if (parts.some((p) => p.key !== key)) return json({ ok: false, error: 'a change of room category or stay is a booking change, not a room assignment', reason: 'BOOKING_CHANGE', categories: [...new Set(parts.map((p) => p.key))] }, 409);
        return await this.state.blockConcurrencyWhile(async () => {
          const occ = await this.occupancies();
          const problems = [];
          const sorted = (a) => a.slice().sort();
          for (const p of parts) {
            const unit = unitOf(p.key, p.label);
            if (!unit) { problems.push({ unit: p.k, reason: 'UNKNOWN_ROOM' }); continue; }
            if (unit.dedicatedTo) problems.push({ unit: p.k, reason: 'DEDICATED' });
            /* the couple's suite takes the couple alone (Owners, 19 Nov 2026) */
            if (unit.couple && target[p.k].some((g) => !COUPLE_GUESTS.includes(String(g)))) problems.push({ unit: p.k, reason: 'COUPLE_ONLY' });
            const real = realOf(occ, p.key, p.label), kept = occ.filter((o) => o.placeholder && o.key === p.key && o.label === p.label).length;
            if (JSON.stringify(sorted(real.map((o) => o.guestId))) !== JSON.stringify(sorted(expect[p.k].map(String)))) problems.push({ unit: p.k, reason: 'CHANGED', now: sorted(real.map((o) => o.guestId)) });
            if (kept) problems.push({ unit: p.k, reason: 'KEPT_PLACES' });
            /* A ROOM WITH AN EXTRA BED is never re-arranged here (pricing guard, 18 Nov 2026): its extra bed is the Owners' extra-bed
               attribution (admin/extra-bed) and its person is priced by their own 009 row — whether the bed is in use or not */
            if (unit.extraBeds || real.length + kept > unit.places || real.some((o) => o.bed)) problems.push({ unit: p.k, reason: 'EXTRA_BED' });
            if (target[p.k].length > unit.places) problems.push({ unit: p.k, reason: 'BEYOND_PLACES', places: unit.places });
          }
          /* nobody joins or leaves the stay: the guests of the touched rooms are the same guests after the change */
          const was = sorted(tk.flatMap((k) => expect[k].map(String))), will = sorted(tk.flatMap((k) => target[k].map(String)));
          if (JSON.stringify(was) !== JSON.stringify(will)) problems.push({ reason: 'BOOKING_CHANGE', why: 'a guest would be added to or removed from this stay' });
          if (new Set(will).size !== will.length) problems.push({ reason: 'TWO_ROOMS', why: 'a guest is named in two rooms' });
          const conflict = problems.some((p) => p.reason === 'CHANGED');
          if (problems.length) return json({ ok: false, error: conflict ? 'the rooms changed since they were read — nothing was changed' : 'the change cannot be made — nothing was changed', reason: conflict ? 'CONFLICT' : problems.some((p) => p.reason === 'BOOKING_CHANGE') ? 'BOOKING_CHANGE' : 'REFUSED', problems }, 409);
          /* the change per guest, and how many rooms of the category are occupied before and after (the hotel's purchase side) */
          const fromOf = {}, toOf = {};
          for (const k of tk) { const l = parts.find((p) => p.k === k).label; for (const g of expect[k]) fromOf[g] = l; for (const g of target[k]) toOf[g] = l; }
          const changes = Object.keys(toOf).filter((g) => fromOf[g] !== toOf[g]).map((g) => ({ guestId: g, key, from: fromOf[g], to: toOf[g], type: 'MOVE' }));
          for (const c of changes) if (changes.some((d) => d !== c && d.from === c.to && d.to === c.from)) c.type = 'SWAP';
          const occupiedBefore = tk.filter((k) => expect[k].length > 0).length, occupiedAfter = tk.filter((k) => target[k].length > 0).length;
          const impacts = occupiedBefore !== occupiedAfter ? [{ kind: 'ROOM_COUNT', key, before: occupiedBefore, after: occupiedAfter,
            words: 'Occupied rooms of this category in the change: ' + occupiedBefore + ' → ' + occupiedAfter + ' — the hotel\'s purchase cost may change (Google 004 is not changed by this)' }] : [];
          if (body.dryRun) return json({ ok: true, dryRun: true, key, changes, impacts });
          if (!changes.length) return json({ ok: true, key, changes: [], unchanged: true });
          if (impacts.length && body.approveRoomCount !== true) return json({ ok: false, error: 'the number of occupied rooms changes — the Owners\' explicit approval is needed', reason: 'APPROVAL_REQUIRED', impacts, changes }, 409);
          const now = new Date().toISOString(), puts = {}, dels = [];
          for (const c of changes) {
            const o = occ.find((x) => !x.placeholder && x.key === key && x.label === c.from && x.guestId === c.guestId);
            /* where the row really lives (a legacy key until its guest writes) goes; the place is written under the canonical key */
            dels.push(this.rowKey(o));
            const hist = (Array.isArray(o.placedFrom) ? o.placedFrom : []).concat(o.placedFrom && o.placedFrom[o.placedFrom.length - 1] === c.from ? [] : [c.from]).slice(-HISTORY_KEEP);
            puts[this.keyOf(key, c.to, c.guestId)] = { invitationId: o.invitationId, partyId: o.partyId || null, name: o.name, at: o.at, by, placedAt: now, placedFrom: hist };
          }
          const batch = now + '·' + admin;
          const lw = await this.logWrites(changes.map((c) => ({ type: c.type, key, guestId: c.guestId, from: c.from, to: c.to, by: admin, status: 'CONFIRMED', batch, ...(impacts.length ? { roomCountApproved: true } : {}) })));
          const writes = [];
          for (const k of dels) if (!puts[k]) writes.push(this.storage.delete(k));
          for (const [k, v] of Object.entries({ ...puts, ...lw.puts })) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          console.log('[rooms] the Owners re-arranged ' + key, admin, changes.length);
          return json({ ok: true, key, changes, impacts, by: admin, at: now });
        });
      }

      /* THE OWNERS' REBOOKING (Owners, 27 Nov 2026 · HS-060): a booking change the Owners make themselves — named guests move to
         ANOTHER category of the SAME stay. Only through the Worker's admin/rebook, which changes the sent trip, the draft and the
         statement's basis with it (never here). All or nothing, in one serialised step: every guest holds exactly the place named
         (else CHANGED — nothing is written); a stay never changes; after every move no room holds more than its own places; a place
         kept for a party, an extra bed, a dedicated room and the couple's suite are never touched. A guest already at the target
         (a re-run) is left as is. Logged as REBOOK. */
      if (op === 'admin-rebook') {
        const body = await safeJson(request);
        const list = Array.isArray(body && body.moves) ? body.moves : null;
        if (!list || !list.length || list.length > 12) return json({ ok: false, error: 'a rebooking names 1 to 12 moves', reason: 'INVALID' }, 400);
        const moves = [];
        for (const m of list) {
          const f = m && m.from, t = m && m.to, g = String(m && m.guestId || '');
          if (!/^G\d{3,}$/.test(g) || !f || !t || typeof f.key !== 'string' || typeof t.key !== 'string') return json({ ok: false, error: 'invalid move', reason: 'INVALID' }, 400);
          moves.push({ guestId: g, from: { key: canonicalKey(f.key), label: String(f.label || '').toUpperCase() }, to: { key: canonicalKey(t.key), label: String(t.label || '').toUpperCase() } });
        }
        return await this.state.blockConcurrencyWhile(async () => {
          const occ = await this.occupancies();
          const problems = [], seen = new Set(), todo = [], done = [];
          const at = (g, p) => occ.find((o) => !o.placeholder && o.guestId === g && o.key === p.key && o.label === p.label) || null;
          for (const m of moves) {
            const stage = stageOf(m.from.key), id = m.guestId + '|' + stage;
            if (seen.has(id)) { problems.push({ guestId: m.guestId, reason: 'TWICE', stage }); continue; }
            seen.add(id);
            if (stageOf(m.to.key) !== stage) { problems.push({ guestId: m.guestId, reason: 'STAGE_CHANGE', why: 'a rebooking never changes the stay' }); continue; }
            if (m.to.key === m.from.key) { problems.push({ guestId: m.guestId, reason: 'SAME_CATEGORY', why: 'a move inside one category is an assignment (admin-apply)' }); continue; }
            const fu = unitOf(m.from.key, m.from.label), tu = unitOf(m.to.key, m.to.label);
            if (!fu || !tu) { problems.push({ guestId: m.guestId, reason: 'UNKNOWN_ROOM' }); continue; }
            if (fu.dedicatedTo || tu.dedicatedTo) problems.push({ guestId: m.guestId, reason: 'DEDICATED' });
            if (fu.couple || tu.couple) problems.push({ guestId: m.guestId, reason: 'COUPLE_ONLY' });
            const here = at(m.guestId, m.from), there = at(m.guestId, m.to);
            if (!here && there) { done.push(m); continue; }   /* a re-run: already where the Owners placed them */
            if (!here) { problems.push({ guestId: m.guestId, reason: 'CHANGED', now: occ.filter((o) => !o.placeholder && o.guestId === m.guestId && stageOf(o.key) === stage).map((o) => o.key + '|' + o.label) }); continue; }
            if (here.bed) problems.push({ guestId: m.guestId, reason: 'EXTRA_BED' });
            todo.push({ ...m, row: here });
          }
          /* every room the change touches, after all its moves: its own places only — no extra bed, no place kept for a party */
          const touched = new Map();
          for (const m of todo) for (const p of [m.from, m.to]) touched.set(p.key + '|' + p.label, p);
          for (const [k, p] of touched) {
            const u = unitOf(p.key, p.label);
            const stay = occ.filter((o) => !o.placeholder && o.key === p.key && o.label === p.label && !todo.some((m) => m.guestId === o.guestId && m.from.key === p.key && m.from.label === p.label));
            const coming = todo.filter((m) => m.to.key === p.key && m.to.label === p.label && !stay.some((o) => o.guestId === m.guestId));
            const kept = occ.filter((o) => o.placeholder && o.key === p.key && o.label === p.label).length;
            if (kept) problems.push({ unit: k, reason: 'KEPT_PLACES' });
            if (u.extraBeds || occ.some((o) => !o.placeholder && o.key === p.key && o.label === p.label && o.bed)) problems.push({ unit: k, reason: 'EXTRA_BED' });
            if (stay.length + coming.length > u.places) problems.push({ unit: k, reason: 'BEYOND_PLACES', places: u.places, after: stay.length + coming.length });
          }
          if (problems.length) {
            const conflict = problems.some((p) => p.reason === 'CHANGED');
            return json({ ok: false, error: conflict ? 'the rooms changed since they were read — nothing was changed' : 'the rebooking cannot be made — nothing was changed', reason: conflict ? 'CONFLICT' : 'REFUSED', problems }, 409);
          }
          const plan = todo.map((m) => ({ guestId: m.guestId, from: m.from, to: m.to })), already = done.map((m) => ({ guestId: m.guestId, to: m.to }));
          if (body.dryRun) return json({ ok: true, dryRun: true, moves: plan, already });
          if (!todo.length) return json({ ok: true, moves: [], already, unchanged: true });
          const now = new Date().toISOString(), batch = now + '·' + admin, writes = [];
          const order = String(body.order || '').slice(0, 40);
          /* the log first (it lists the store), then every write of the change in one batch — as admin-apply writes */
          const lw = await this.logWrites(todo.map((m) => ({ type: 'REBOOK', guestId: m.guestId, from: m.from.key.split('/')[1] + ' · Room ' + m.from.label,
            to: m.to.key.split('/')[1] + ' · Room ' + m.to.label, stage: stageOf(m.from.key), by: admin, status: 'APPLIED', batch, ...(order ? { order } : {}) })));
          for (const m of todo) {
            writes.push(this.storage.delete(this.rowKey(m.row)));
            writes.push(this.storage.put(this.keyOf(m.to.key, m.to.label, m.guestId), { invitationId: m.row.invitationId, partyId: m.row.partyId || null, name: m.row.name, at: m.row.at,
              by, placedAt: now, rebookedFrom: { key: m.from.key, label: m.from.label } }));
          }
          for (const [k, v] of Object.entries(lw.puts)) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          console.log('[rooms] the Owners rebooked', admin, todo.length);
          return json({ ok: true, moves: plan, already, by: admin, at: now });
        });
      }

      if (op === 'admin-final') {
        const body = await safeJson(request);
        const action = String(body && body.action || '');
        if (!['release', 'withdraw'].includes(action)) return json({ ok: false, error: 'invalid release', reason: 'INVALID' }, 400);
        return await this.state.blockConcurrencyWhile(async () => {
          const d = await digestOf(await this.occupancies()), prev = (await this.storage.get('final')) || null, now = new Date().toISOString();
          if (action === 'release' && String(body.expectDigest || '') !== d.digest) return json({ ok: false, error: 'the rooms changed since they were read — read them again before releasing', reason: 'CONFLICT' }, 409);
          if (action === 'withdraw' && !(prev && prev.active !== false)) return json({ ok: false, error: 'no final rooming list is released', reason: 'NONE' }, 409);
          const rec = action === 'release' ? { version: ((prev && prev.version) || 0) + 1, at: now, by: admin, digest: d.digest, rows: d.rows, active: true } : { ...prev, active: false, withdrawnAt: now, withdrawnBy: admin };
          const lw = await this.logWrites([{ type: action === 'release' ? 'FINAL_RELEASED' : 'FINAL_WITHDRAWN', version: rec.version, by: admin, status: action === 'release' ? 'RELEASED' : 'WITHDRAWN' }]);
          const writes = [this.storage.put('final', rec)];
          for (const [k, v] of Object.entries(lw.puts)) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          return json({ ok: true, final: { version: rec.version, at: rec.at, by: rec.by, digest: rec.digest, active: rec.active !== false, withdrawnAt: rec.withdrawnAt || null } });
        });
      }

      /* THE HOTEL ROOM NUMBERS (Owners, 18 / 19 Nov 2026): which Souphattra unit is which room of the house — the Owners'
         assignment, checked against the official list (src/hotel-rooms.js) as a whole before anything is written: official
         numbers of the category's own types, a suite as all its numbers in ONE unit, no number twice in one window. A unit's
         number never moves a guest, never changes a place, a booking, a rate or a cost; a clean reset leaves it standing. */
      if (op === 'admin-hotel-rooms') {
        const body = await safeJson(request);
        const set = body && body.set && typeof body.set === 'object' && !Array.isArray(body.set) ? body.set : null;
        if (!set || !Object.keys(set).length || Object.keys(set).length > 80) return json({ ok: false, error: 'a change names 1 to 80 rooms', reason: 'INVALID' }, 400);
        return await this.state.blockConcurrencyWhile(async () => {
          const cur = await this.hotelRooms();
          if (Number(body.expectVersion) !== cur.version) return json({ ok: false, error: 'the hotel room numbers changed since they were read — read them again', reason: 'CONFLICT', version: cur.version }, 409);
          const rooms = { ...cur.rooms }, changed = [];
          for (const [unit, nos] of Object.entries(set)) {
            const i = unit.lastIndexOf('|'), k = i > 0 ? canonicalKey(unit.slice(0, i)) + '|' + unit.slice(i + 1).toUpperCase() : unit;
            const before = rooms[k] ? rooms[k].join(' + ') : null;
            if (nos === null) delete rooms[k]; else rooms[k] = Array.isArray(nos) ? nos.map((n) => String(n).trim()).sort() : nos;
            const after = rooms[k] ? [].concat(rooms[k]).join(' + ') : null;
            if (before !== after) changed.push({ unit: k, from: before, to: after });
          }
          const check = checkHotelRooms(rooms, unitsOf);
          if (!check.ok) return json({ ok: false, error: 'the hotel room numbers do not fit the official list — nothing was written', reason: 'REFUSED', problems: check.problems }, 409);
          if (body.dryRun === true || !changed.length) return json({ ok: true, dryRun: body.dryRun === true, unchanged: !changed.length, changed, hotelRooms: cur });
          const rec = { version: cur.version + 1, at: new Date().toISOString(), by: admin, note: String(body.note || '').slice(0, 300) || null, rooms };
          const lw = await this.logWrites([{ type: 'HOTEL_ROOMS', version: rec.version, by: admin, status: 'SET', changed: changed.length, note: rec.note }]);
          const writes = [this.storage.put(HOTEL, rec)];
          for (const [k, v] of Object.entries(lw.puts)) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          return json({ ok: true, changed, hotelRooms: await this.hotelRooms() });
        });
      }
      return json({ ok: false, error: 'unknown rooms operation' }, 404);
    }

    /* THE CLEAN RESET (Owner, 19 Sep 2026): every guest-generated occupancy goes — every `occ:` record, whoever wrote it and
       however it got there (a join, a migration, an assignment), and every waiting-list entry; nothing is held for anyone in advance, so nothing else is
       touched. `dryRun` names what would go without writing. */
    if (op === 'reset') {
      const body = await safeJson(request);
      return await this.state.blockConcurrencyWhile(async () => {
        const map = await this.storage.list({ prefix: OCC });
        const rows = [...map.entries()].map(([k, v]) => { const p = k.slice(OCC.length).split('|'); return { key: p[0], label: p[1], guestId: p[2], ...(body && body.snapshot ? { storageKey: k, value: v } : {}) }; });
        const wmap = await this.storage.list({ prefix: WL });
        const waits = [...wmap.entries()].map(([k, v]) => { const p = k.slice(WL.length).split('|'); return { stage: p[0], guestId: p[1], ...(body && body.snapshot ? { storageKey: k, value: v } : {}) }; });
        if (!(body && body.dryRun === false)) return json({ ok: true, dryRun: true, occupancies: rows.length, rows, waitlisted: waits.length, waits, fixed: 0 });
        for (const k of map.keys()) await this.storage.delete(k);
        for (const k of wmap.keys()) await this.storage.delete(k);
        const left = await this.storage.list({ prefix: OCC }), wleft = await this.storage.list({ prefix: WL });
        return json({ ok: true, dryRun: false, cleared: rows.length, rows, waitlistCleared: waits.length, remaining: left.size, waitlistRemaining: wleft.size, fixed: 0, at: new Date().toISOString() });
      });
    }

    if (op === 'plan') {
      const occ = await this.occupancies();
      const out = { ok: true, places: PLACES, units: {}, waitlist: await this.waitlist(), hotelRooms: await this.hotelRooms() };
      for (const key of Object.keys(SEED)) {
        out.units[key] = unitsOf(key).map((u) => ({ ...u, occupants: occ.filter((o) => o.key === key && o.label === u.label).map((o) => ({ invitationId: o.invitationId, guestId: o.guestId, partyId: o.partyId, name: o.name, at: o.at, ...(o.bed ? { bed: true } : {}),
          ...(Array.isArray(o.placedFrom) && o.placedFrom.length ? { placedFrom: o.placedFrom, by: o.by || null } : {}) })) }));
      }
      return json(out);
    }
    if (op === 'migrate' || op === 'assign') {
      const body = await safeJson(request);
      const list = Array.isArray(body && body.occupants) ? body.occupants : [];
      return await this.state.blockConcurrencyWhile(async () => {
        const done = [], refused = [];
        for (const o of list) {
          const key = canonicalKey(String(o.key || '')), label = String(o.label || '').toUpperCase(), guestId = String(o.guestId || '');
          const unit = unitOf(key, label);
          if (!unit || !guestId || !o.invitationId) { refused.push({ ...o, error: 'invalid' }); continue; }
          /* a dedicated room is assigned to its own guest only (the register id must be named) */
          if (unit.dedicatedTo && o.contactId !== unit.dedicatedTo) { refused.push({ ...o, error: 'dedicated room' }); continue; }
          /* the couple's suite is the couple's alone — before any capacity rule, `force` included (Owners, 19 Nov 2026) */
          if (unit.couple && !isCouplePerson({ guestId, invitationId: o.invitationId })) { refused.push({ ...o, error: 'the couple\'s suite' }); continue; }
          /* the Owners' placement only (HS-060): placed by the Owners' rebooking alone (admin-rebook), never by an assignment or a recorded booking */
          if (unit.ownersOnly) { refused.push({ ...o, error: 'not offered' }); continue; }
          const occ = await this.occupancies();
          const others = occ.filter((x) => x.key === key && x.label === label && x.guestId !== guestId).length;
          /* the room's extra bed counts like its places (Owners, 17 Nov 2026); beyond it only the Owners' force */
          if (others >= unit.places + bedsFor(unit) && !body.force) { refused.push({ ...o, error: 'full' }); continue; }
          const legacyHere = occ.find((x) => !x.placeholder && x.key === key && x.label === label && x.guestId === guestId && this.rowKey(x) !== this.keyOf(key, label, guestId));
          if (legacyHere) await this.storage.delete(this.rowKey(legacyHere));
          await this.storage.put(this.keyOf(key, label, guestId), { invitationId: String(o.invitationId), partyId: o.partyId || null, name: String(o.name || '').slice(0, 24), at: new Date().toISOString(), by: String(body.actor || 'guest-relations'),
            ...(others >= unit.places ? { bed: true } : {}) });
          const stage = stageOf(key);
          for (const x of occ) if (x.guestId === guestId && stageOf(x.key) === stage && !(x.key === key && x.label === label)) await this.storage.delete(this.rowKey(x));
          await this.resolveWait(stage, guestId);   /* an assignment by Guest Relations resolves the waiting-list entry */
          done.push({ key, label, guestId });
        }
        return json({ ok: refused.length === 0, done, refused });
      });
    }
    if (op === 'unassign') {
      const body = await safeJson(request);
      const guestId = String(body && body.guestId || '');
      const stage = body && body.key ? stageOf(body.key) : String(body && body.stage || '');
      return await this.state.blockConcurrencyWhile(async () => {
        const occ = await this.occupancies();
        const had = occ.filter((o) => o.guestId === guestId && (!stage || stageOf(o.key) === stage));
        for (const o of had) await this.storage.delete(this.rowKey(o));
        return json({ ok: true, released: had.map((o) => ({ key: o.key, label: o.label })) });
      });
    }
    /* WHO SLEEPS ON THE EXTRA BED (Owners, 17 Nov 2026): set by the Owners for a room that holds more persons than its own places
       — one of its occupants, named by guest id; nobody moves, no place is taken or given back, only the attribution changes.
       The statement check prices the extra bed by that person's own 009 row (src/billing-routes.js · extraBedReasons). */
    if (op === 'bed') {
      const body = await safeJson(request);
      const key = canonicalKey(String(body && body.key || '')), label = String(body && body.label || '').toUpperCase(), guestId = String(body && body.guestId || '');
      const unit = unitOf(key, label);
      if (!unit || !unit.extraBeds) return json({ ok: false, error: 'this room has no extra bed' }, 400);
      return await this.state.blockConcurrencyWhile(async () => {
        const occ = (await this.occupancies()).filter((o) => o.key === key && o.label === label);
        const real = occ.filter((o) => !o.placeholder);
        if (!real.some((o) => o.guestId === guestId)) return json({ ok: false, error: 'not an occupant of this room' }, 409);
        if (occ.length <= unit.places) return json({ ok: false, error: 'the extra bed is not in use: the room holds no more than its own places' }, 409);
        for (const o of real) {
          const want = o.guestId === guestId;
          if (!!o.bed === want) continue;
          const v = { invitationId: o.invitationId, partyId: o.partyId || null, name: o.name, at: o.at, ...placementOf(o), ...(want ? { bed: true } : {}) };
          await this.storage.put(this.rowKey(o), v);
        }
        return json({ ok: true, key, label, bed: guestId, by: String(body && body.actor || 'guest-relations').slice(0, 60) });
      });
    }
    return json({ ok: false, error: 'unknown rooms operation' }, 404);
  }
}

async function safeJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
