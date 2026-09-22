/* ============================================================================
   SEE YOU IN LAOS — THE ROOM OCCUPANCY ENGINE (Owner decision, 14 Sep 2026).

   A room is no longer an abstract count. Every category of every stay is a
   set of persistent ALLOCATION UNITS — ROOM A, ROOM B, ROOM C … — derived
   once from the seed and never renumbered: a category of five rooms is five
   units, and every room unit has TWO GUEST PLACES. A guest chooses the unit
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

   A guest holds at most one place per STAGE of the journey: the wedding window is one stage whether spent in the hotel,
   the Riverside or the Guest House.

   PARTY CAPACITY (Owner, 19 Sep 2026 · the package model): a booking that must fit a party names `need` — the places the
   party still needs in the unit; a unit whose free places cannot take them is refused ("full for your party") and the
   package moves to the next defined option. Nobody is ever partially booked.

   THE WAITING LIST (Owner, 19 Sep 2026): when no defined option of a stage can take the guest, the guest is waitlisted for
   the STAGE — one record per guest and stage, positioned by the time it was taken, renumbered as earlier entries resolve;
   a place held in the stage (by the guest or by Guest Relations) resolves it. No cost, no product, visibly unresolved.
   ========================================================================== */

import { SEED } from './inventory-seed.js';
import { displayName } from './auth.js';
import { COMPLIMENTARY, EXTENSION, deadlineState, extensionQuote, validNights } from './stay-plan.js';

export const PLACES = 2;
const OCC = 'occ:';
const WL = 'wl:';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* a window (the first segment of a key) belongs to one stage of the journey */
/* THE EXTENSION IS ITS OWN STAGE (Owner, 22 Sep 2026): `stayext` is never part of the wedding window, so holding, changing or
   dropping paid nights can never release the complimentary place underneath them */
const STAGE_OF = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', guesthouse: 'wedstay', riverside: 'wedstay', stayext: 'stayext', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };
export function stageOf(key) { const w = String(key || '').split('/')[0]; return STAGE_OF[w] || w; }
export const STAGES = ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski'];

/* the persistent units of one category — pure, deterministic, seed-derived; nothing is reserved for anyone */
export function unitsOf(key) {
  const s = SEED[key];
  if (!s) return [];
  if (s.unit === 'guest') {
    return [{ key, label: 'A', name: s.name, kind: 'property', places: s.capacity, reservedFor: null }];
  }
  const out = [];
  /* exactly one unit per physical room — never a Room G for six rooms */
  for (let i = 0; i < s.capacity; i++) {
    const label = i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26];
    out.push({ key, label, name: 'Room ' + label, kind: 'room',
      /* the Owner's rule (15 Sep 2026): two guest places per room; a single room stays what it is */
      places: s.occupancy === 1 ? 1 : PLACES,
      reservedFor: null });
  }
  return out;
}
export function allUnits() {
  const out = [];
  for (const key of Object.keys(SEED)) out.push(...unitsOf(key));
  return out;
}
export function unitOf(key, label) { return unitsOf(key).find((u) => u.label === String(label || '').toUpperCase()) || null; }

/* who may take a place in a unit: any authenticated guest, in any unit (Owner, 15 Sep 2026 · 19 Sep 2026) */
export function mayJoin(unit, identity) {
  if (!unit) return { ok: false, error: 'unknown room' };
  if (!identity) return { ok: false, error: 'unauthorised' };
  return { ok: true };
}

/* ONE CANONICAL AVAILABILITY OBJECT per category (Owner, 16 Sep 2026): the source inventory minus the real guest bookings —
   the same object every surface renders, the same rule the booking answers by. soldOut is remainingPlaces === 0 and nothing
   else: never a guest's own selection, never the CTA. */
export function availabilityOf(key, list) {
  const sourcePlaces = list.reduce((n, u) => n + u.places, 0);
  const remainingPlaces = list.reduce((n, u) => n + u.free, 0), remainingRooms = list.filter((u) => u.free > 0).length;
  return {
    units: list.length, places: sourcePlaces,
    sourceRooms: list.length, sourcePlaces,
    ownerReservedRooms: 0, ownerReservedPlaces: 0,
    guestOccupiedRooms: list.filter((u) => u.taken > 0).length, guestOccupiedPlaces: list.reduce((n, u) => n + u.taken, 0),
    remainingRooms, remainingPlaces, soldOut: remainingPlaces === 0,
    reserved: 0, reservedFor: null,
    /* the largest number of places still free together in one unit — what a party can be booked into as one */
    largestFree: list.reduce((m, u) => Math.max(m, u.free), 0),
    free: remainingPlaces, rooms: remainingRooms,
    name: SEED[key].name, kind: list.length ? list[0].kind : 'room',
  };
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
      if (!SEED[parts[0]]) continue;   /* a row of a retired key (an older release) is nobody's and blocks nothing */
      out.push({ key: parts[0], label: parts[1], guestId: parts[2], placeholder: parts[2].charAt(0) === '~', ...v });
    }
    return out;
  }
  /* PARTY PLACES (Owner, 19 Sep 2026 · never partially booked): when a guest of a party of N takes a unit with `need` N, the
     places the absent members will take are KEPT in the unit as party places — a stranger cannot take them; each party
     member's own join consumes one; they leave with the last party member, and a member who says "not joining" gives one back */
  partyKey(key, label, partyId, n) { return this.keyOf(key, label, '~' + partyId + '~' + n); }
  async partyPlaces(key, label, partyId, occ) {
    const list = occ || await this.occupancies();
    return list.filter((o) => o.placeholder && o.key === key && o.label === label && o.partyId === partyId);
  }
  keyOf(key, label, guestId) { return OCC + key + '|' + label + '|' + guestId; }
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

  /* the engine as one guest sees it. With an identity: first names and the
   * guest's own places; without one: counts only, no name, no id. */
  async view(identity) {
    const occ = await this.occupancies();
    const units = {}, mine = {};
    for (const key of Object.keys(SEED)) {
      units[key] = unitsOf(key).map((u) => {
        const here = occ.filter((o) => o.key === key && o.label === u.label);
        const taken = here.length;
        /* THE OCCUPANCY IS VISIBLE (Owner, 19 Sep 2026): every authenticated guest sees who already holds a place — the first
           name only; never an email, a phone number, a code */
        const occupants = identity
          ? here.map((o) => (o.placeholder
              ? { name: identity.partyId && o.partyId === identity.partyId ? 'Your party' : 'Reserved', mine: false, party: !!(identity.partyId && o.partyId === identity.partyId), placeholder: true }
              : { name: o.name || '', mine: o.guestId === identity.guestId, party: !!(identity.partyId && o.partyId === identity.partyId), ...(o.guestId === identity.guestId ? { guestId: o.guestId } : {}) }))
          : here.map(() => ({}));
        const elig = !identity ? { ok: false } : mayJoin(u, identity);
        return { label: u.label, name: u.name, kind: u.kind, places: u.places, reservedFor: null,
                 eligible: elig.ok, occupants, taken, free: Math.max(0, u.places - taken), full: taken >= u.places };
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
    /* THE GUEST'S OWN EXTENSION: the nights the engine holds, priced by the one rule */
    let extension = null;
    if (identity) {
      const own = occ.find((o) => !o.placeholder && o.guestId === identity.guestId && o.key === EXTENSION.key);
      if (own) extension = { ...extensionQuote(own.nights || 1), label: own.label, at: own.at, confirmed: true };
    }
    const extensionAvailable = !!(summary[EXTENSION.key] && summary[EXTENSION.key].remainingPlaces > 0);
    return { ok: true, units, summary, mine, waitlist, waiting, places: PLACES, complimentary, extension, extensionAvailable };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/rooms\/?/, '') || 'read';
    const gr = request.headers.get('x-gr-verified') === 'yes';
    let identity = null;
    try { identity = JSON.parse(request.headers.get('x-siyl-identity') || 'null'); } catch (e) { identity = null; }

    if (op === 'read') return json(await this.view(identity));
    if (op === 'mine') {
      const v = await this.view(identity);
      return json({ ok: true, mine: v.mine, waitlist: v.waitlist, extension: v.extension, complimentary: v.complimentary });
    }

    if (op === 'join' || op === 'leave' || op === 'wait' || op === 'unwait') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      const key = String(body && body.key || '').trim();
      const label = String(body && body.label || '').trim().toUpperCase();
      const name = displayName(body && body.name);   /* letters, marks, spaces, ' - . — never markup; 24 characters */
      return await this.state.blockConcurrencyWhile(async () => {
        if (op === 'leave') {
          const stage = key ? stageOf(key) : String(body && body.stage || '');
          if (!stage) return json({ ok: false, error: 'invalid release' }, 400);

          /* A RELEASE NAMES ITS WINDOW (Codex confirming pass, release 012): a device that still shows the Souphattra it removed
             must not release the Riverside the guest holds meanwhile — with `window` only the places of that window go; the
             stage-wide release (no window) stays for the planner's own reconciliation */
          const win = String(body && body.window || '').trim();
          const occ0 = await this.occupancies();
          const had = (await this.mineIn(stage, guestId, occ0)).filter((o) => !win || String(o.key).split('/')[0] === win);
          for (const o of had) await this.storage.delete(this.keyOf(o.key, o.label, o.guestId));
          if (identity.partyId) {
            if (had.length) {
              /* the last real party member leaving a unit takes the party's kept places with them */
              for (const o of had) {
                const others = occ0.filter((x) => !x.placeholder && x.key === o.key && x.label === o.label && x.partyId === identity.partyId && x.guestId !== guestId);
                if (!others.length) for (const ph of await this.partyPlaces(o.key, o.label, identity.partyId, occ0)) await this.storage.delete(this.keyOf(ph.key, ph.label, ph.guestId));
                /* …and with the last real member of the party in the whole category, every place kept for it there */
                const anyLeft = occ0.some((x) => !x.placeholder && x.key === o.key && x.partyId === identity.partyId && x.guestId !== guestId);
                if (!anyLeft) for (const ph of occ0.filter((x) => x.placeholder && x.key === o.key && x.partyId === identity.partyId)) await this.storage.delete(this.keyOf(ph.key, ph.label, ph.guestId));
              }
            } else {
              /* a member who holds nothing in the stage and says "not joining" gives ONE kept party place of the stage back */
              const ph = occ0.filter((x) => x.placeholder && x.partyId === identity.partyId && stageOf(x.key) === stage && (!win || String(x.key).split('/')[0] === win))[0];
              if (ph) await this.storage.delete(this.keyOf(ph.key, ph.label, ph.guestId));
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
          const size = Math.max(1, Math.min(6, parseInt(body && body.size, 10) || 1));
          const wanted = (Array.isArray(body && body.wanted) ? body.wanted : []).map((x) => String(x).slice(0, 64)).filter((x) => SEED[x]).slice(0, 12);
          /* a second wait keeps the place in the line (`at`) and updates what is asked for (a party that grew, another chain) */
          await this.storage.put(this.wlKey(stage, guestId), { invitationId, partyId: identity.partyId || null, name, at: cur && cur.at ? cur.at : new Date().toISOString(), size, wanted });
          return json({ ok: true, waited: stage, ...(await this.view(identity)) });
        }
        const unit = unitOf(key, label);
        if (!unit) return json({ ok: false, error: 'unknown room' }, 404);
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
        const may = mayJoin(unit, identity);
        if (!may.ok) return json({ ...(await this.view(identity)), ok: false, error: may.error }, 403);
        const occ = await this.occupancies();
        const already = occ.some((o) => o.key === key && o.label === label && o.guestId === guestId);
        const myParty = (o) => !!(identity.partyId && o.partyId === identity.partyId);
        /* a place kept for this guest's party is theirs to take: it does not count against them */
        const others = occ.filter((o) => o.key === key && o.label === label && o.guestId !== guestId && !(o.placeholder && myParty(o))).length;
        if (!already && others >= unit.places) return json({ ...(await this.view(identity)), ok: false, error: 'full' }, 409);   /* the last place was just filled: one wins, the other chooses another room */
        /* PARTY CAPACITY (Owner, 19 Sep 2026 · never partially booked): `need` = the party's size. A party that fits ONE unit
           takes it whole (the members already here and the places kept for them count). A party larger than a unit fills
           this unit and keeps the rest of its places in the other units of the category — or is refused as a whole. */
        const need = Math.max(1, Math.min(6, parseInt(body && body.need, 10) || 1));
        const partyHere = identity.partyId ? occ.filter((o) => o.key === key && o.label === label && myParty(o) && o.guestId !== guestId).length : 0;
        const freeForMe = unit.places - others;
        const catUnits = unitsOf(key);
        const freeIn = (u) => u.places - occ.filter((o) => o.key === key && o.label === u.label && o.guestId !== guestId && !(o.placeholder && myParty(o))).length;
        /* the party in a unit of the category: its members (not this guest) and the places kept for it — except the places kept
           in a unit this guest is about to leave alone (they move with the guest) */
        const realOthersIn = (u) => occ.filter((o) => !o.placeholder && o.key === key && o.label === u.label && myParty(o) && o.guestId !== guestId).length;
        const leaving = (u) => u.label !== label && occ.some((o) => !o.placeholder && o.key === key && o.label === u.label && o.guestId === guestId) && realOthersIn(u) === 0;
        const partyIn = (u) => identity.partyId ? occ.filter((o) => o.key === key && o.label === u.label && myParty(o) && o.guestId !== guestId && !(o.placeholder && leaving(u))).length : 0;
        const keptHere = identity.partyId ? await this.partyPlaces(key, label, identity.partyId, occ) : [];
        /* what the party still needs once this guest sits here: the members and kept places of the whole category count (a kept
           place this guest takes is theirs, not a second person) */
        const partyCat = catUnits.reduce((n, u) => n + partyIn(u), 0);
        const remainingNeed = already ? 0 : Math.max(0, need - partyCat - 1 + (keptHere.length ? 1 : 0));
        let keepHere = 0, spread = [];   /* places kept here, and [unit, places] kept in other units for a party larger than this unit */
        if (!already) {
          if (need <= unit.places) {
            if (need - partyHere > freeForMe) return json({ ...(await this.view(identity)), ok: false, error: 'full for your party', need, free: freeForMe }, 409);
            keepHere = Math.min(remainingNeed, freeForMe - 1);
          } else {
            if (freeForMe < 1) return json({ ...(await this.view(identity)), ok: false, error: 'full' }, 409);
            keepHere = Math.max(0, Math.min(remainingNeed, freeForMe - 1));
            let rest = remainingNeed - keepHere;
            const others2 = catUnits.filter((u) => u.label !== label).map((u) => [u, freeIn(u)]).sort((x, y) => y[1] - x[1]);
            for (const [u, f] of others2) { if (rest <= 0) break; const take = Math.min(rest, f); if (take > 0) { spread.push([u, take]); rest -= take; } }
            if (rest > 0) return json({ ...(await this.view(identity)), ok: false, error: 'full for your party', need, free: catUnits.reduce((n, u) => n + freeIn(u), 0) }, 409);
          }
        }
        /* HOLD THE NEW PLACE FIRST … */
        await this.storage.put(this.keyOf(key, label, guestId), { invitationId, partyId: identity.partyId || null, name, at: new Date().toISOString() });
        if (identity.partyId) {
          /* … this guest's own join takes one place kept for the party here; the places the absent members still need are kept */
          if (keptHere.length) await this.storage.delete(this.keyOf(keptHere[0].key, keptHere[0].label, keptHere[0].guestId));
          const stamp = Date.now();
          for (let n = 0; n < keepHere; n++) await this.storage.put(this.partyKey(key, label, identity.partyId, stamp + '-' + n), { invitationId: null, partyId: identity.partyId, name: '', at: new Date().toISOString(), by: guestId });
          for (const [u, take] of spread) for (let n = 0; n < take; n++) await this.storage.put(this.partyKey(key, u.label, identity.partyId, stamp + '-' + u.label + n), { invitationId: null, partyId: identity.partyId, name: '', at: new Date().toISOString(), by: guestId });
        }
        /* … AND ONLY THEN LET THE OLD ONE GO — every other place of this stage; a place held resolves the waiting-list entry */
        const stage = stageOf(key);
        for (const o of occ) {
          if (o.guestId === guestId && stageOf(o.key) === stage && !(o.key === key && o.label === label)) {
            await this.storage.delete(this.keyOf(o.key, o.label, o.guestId));
            /* the party's kept places leave the old unit with its last real party member */
            if (identity.partyId && !occ.some((x) => !x.placeholder && x.key === o.key && x.label === o.label && myParty(x) && x.guestId !== guestId)) {
              for (const ph of await this.partyPlaces(o.key, o.label, identity.partyId, occ)) await this.storage.delete(this.keyOf(ph.key, ph.label, ph.guestId));
            }
          }
        }
        await this.resolveWait(stage, guestId);
        return json({ ok: true, joined: { key, label }, ...(await this.view(identity)) });
      });
    }

    /* ---- THE PAID EXTENSION (Owner, 22 Sep 2026) --------------------------
       ONE room of the designated hotel for one to four nights AFTER the included
       stay. The guest chooses only the number of nights: the hotel, the dates,
       the price, the availability and the final amount are decided here, inside
       the one actor, so two guests asking for the last room are answered one
       after the other. Changing the number of nights UPDATES the guest's own
       extension — it never creates a second one — and neither extending nor
       dropping it touches any other stage the guest holds. */
    if (op === 'extend' || op === 'unextend') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      const name = displayName(body && body.name);
      return await this.state.blockConcurrencyWhile(async () => {
        const occ = await this.occupancies();
        const own = occ.find((o) => !o.placeholder && o.guestId === guestId && o.key === EXTENSION.key) || null;

        if (op === 'unextend') {
          /* ONLY the extension goes. The complimentary stay, every other stage and every other guest stand. */
          if (own) await this.storage.delete(this.keyOf(own.key, own.label, own.guestId));
          return json({ ok: true, removed: own ? { key: own.key, label: own.label, nights: own.nights || null } : null, ...(await this.view(identity)) });
        }

        const nights = body && body.nights;
        if (!validNights(nights)) return json({ ok: false, error: 'invalid nights', max: EXTENSION.maxNights }, 400);
        const quote = extensionQuote(nights);
        /* THE PRICE THE GUEST REVIEWED (Owner, 22 Sep 2026): a confirmation that names a different amount than the one on
           screen is refused, with the authoritative quote — nothing is held, nothing is charged, the guest reviews again */
        if (body && body.expect != null && Number(body.expect) !== quote.total) {
          return json({ ok: false, error: 'price changed', quote, ...(await this.view(identity)) }, 409);
        }

        let label = own ? own.label : null;
        if (!label) {
          /* a room a party member already extends into first (they stay together), then the first room with a place free */
          const list = unitsOf(EXTENSION.key);
          const freeIn = (u) => u.places - occ.filter((o) => o.key === EXTENSION.key && o.label === u.label && o.guestId !== guestId).length;
          const withParty = identity.partyId ? list.find((u) => freeIn(u) > 0 && occ.some((o) => o.key === EXTENSION.key && o.label === u.label && o.partyId === identity.partyId)) : null;
          const pick = withParty || list.find((u) => freeIn(u) > 0);
          if (!pick) return json({ ...(await this.view(identity)), ok: false, error: 'extension unavailable', message: 'The hotel has no room for those nights.' }, 409);
          label = pick.label;
        }
        await this.storage.put(this.keyOf(EXTENSION.key, label, guestId), {
          invitationId, partyId: identity.partyId || null, name, nights: quote.nights,
          at: own && own.at ? own.at : new Date().toISOString(), changedAt: new Date().toISOString()
        });
        const view = await this.view(identity);
        return json({ ok: true, extended: { ...quote, label }, changed: !!own, ...view });
      });
    }

    /* ---- Guest Relations only ---- */
    if (!gr) return json({ ok: false, error: 'unknown rooms operation' }, 404);

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
      const out = { ok: true, places: PLACES, units: {}, waitlist: await this.waitlist() };
      for (const key of Object.keys(SEED)) {
        out.units[key] = unitsOf(key).map((u) => ({ ...u, occupants: occ.filter((o) => o.key === key && o.label === u.label).map((o) => ({ invitationId: o.invitationId, guestId: o.guestId, partyId: o.partyId, name: o.name, at: o.at })) }));
      }
      return json(out);
    }
    if (op === 'migrate' || op === 'assign') {
      const body = await safeJson(request);
      const list = Array.isArray(body && body.occupants) ? body.occupants : [];
      return await this.state.blockConcurrencyWhile(async () => {
        const done = [], refused = [];
        for (const o of list) {
          const key = String(o.key || ''), label = String(o.label || '').toUpperCase(), guestId = String(o.guestId || '');
          const unit = unitOf(key, label);
          if (!unit || !guestId || !o.invitationId) { refused.push({ ...o, error: 'invalid' }); continue; }
          const occ = await this.occupancies();
          const others = occ.filter((x) => x.key === key && x.label === label && x.guestId !== guestId).length;
          if (others >= unit.places && !body.force) { refused.push({ ...o, error: 'full' }); continue; }
          await this.storage.put(this.keyOf(key, label, guestId), { invitationId: String(o.invitationId), partyId: o.partyId || null, name: String(o.name || '').slice(0, 24), at: new Date().toISOString(), by: String(body.actor || 'guest-relations') });
          const stage = stageOf(key);
          for (const x of occ) if (x.guestId === guestId && stageOf(x.key) === stage && !(x.key === key && x.label === label)) await this.storage.delete(this.keyOf(x.key, x.label, x.guestId));
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
        for (const o of had) await this.storage.delete(this.keyOf(o.key, o.label, o.guestId));
        return json({ ok: true, released: had.map((o) => ({ key: o.key, label: o.label })) });
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
