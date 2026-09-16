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

   The private residence is one unit with as many places as the source says
   it sleeps (six); the Sathorn Penthouse is six bedrooms, Room A – F.

   NO PRE-RESERVED ROOMS (Owner override, 15 Sep 2026). Nothing is held for
   the Bride & Groom, the family or anyone else in advance: every unit is
   available until a guest actually books a place in it, and the couple book
   their own two places like every other guest. The seed's historical
   `held` notes have no effect here. Capacity is units × places, never a
   separate counter, and only real bookings consume it.

   A guest holds at most one place per STAGE of the journey: the wedding
   window is one stage whether spent in the hotel or in the residence.
   ========================================================================== */

import { SEED, FIXED } from './inventory-seed.js';

export const PLACES = 2;
/* the retired labels, exported for readers of old records only — no unit carries them any more */
export const HELD_FOR_HOSTS = 'Bride & Groom';
export const HELD_FOR_FAMILY = 'Family';
const OCC = 'occ:';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/* a window (the first segment of a key) belongs to one stage of the journey */
const STAGE_OF = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', 'airbnb-2br': 'wedstay', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };
export function stageOf(key) { const w = String(key || '').split('/')[0]; return STAGE_OF[w] || w; }

/* the persistent units of one category — pure, deterministic, seed-derived */
export function unitsOf(key) {
  const s = SEED[key];
  if (!s) return [];
  if (s.unit === 'guest') {
    return [{ key, label: 'A', name: s.name, kind: 'property', places: s.capacity, reservedFor: null }];
  }
  const out = [];
  /* exactly one unit per physical room — never a Room G for six rooms; the first `held` rooms are the Master's reservation */
  for (let i = 0; i < s.capacity; i++) {
    const label = i < 26 ? LETTERS[i] : LETTERS[Math.floor(i / 26) - 1] + LETTERS[i % 26];
    out.push({ key, label, name: 'Room ' + label, kind: 'room',
      /* the Owner's rule: two guest places per room; a single room stays what it is */
      places: s.occupancy === 1 ? 1 : PLACES,
      reservedFor: i < (s.held || 0) && s.heldFor ? s.heldFor : null });
  }
  return out;
}
export function allUnits() {
  const out = [];
  for (const key of Object.keys(SEED)) out.push(...unitsOf(key));
  return out;
}
export function unitOf(key, label) { return unitsOf(key).find((u) => u.label === String(label || '').toUpperCase()) || null; }

/* may this identity take a place in this unit — any authenticated guest may, in any unit (Owner, 15 Sep 2026) */
/* who may take a place in a unit (Owner, 16 Sep 2026): an open room — any authenticated guest; a room reserved for the
   Bride & Groom — the hosts only; a room reserved for the Family — nobody through the website (Guest Relations assign it) */
/* the fixed allocation of one guest in one stage (null when none) */
export function fixedFor(guestId, stage) { return FIXED.find((f) => f.guestId === guestId && stageOf(f.key) === stage) || null; }
export function mayJoin(unit, identity) {
  if (!unit) return { ok: false, error: 'unknown room' };
  if (!identity) return { ok: false, error: 'unauthorised' };
  if (unit.reservedFor === 'Bride & Groom') return identity.hosts ? { ok: true } : { ok: false, error: 'reserved · bride & groom' };
  if (unit.reservedFor) return { ok: false, error: 'reserved · ' + String(unit.reservedFor).toLowerCase() };
  return { ok: true };
}

export class Rooms {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  /* every place held, as { key, label, guestId, invitationId, partyId, name, at } */
  /* every occupancy: the hosts' FIXED allocation first (never stored, never released), then the stored holds — a stored
     hold of a fixed guest in the fixed stage is inert (the fixed room is theirs, nothing else in that stage) */
  async occupancies() {
    const map = await this.storage.list({ prefix: OCC });
    const out = FIXED.map((f) => ({ ...f, partyId: null, at: null, fixed: true }));
    for (const [k, v] of map) {
      const parts = k.slice(OCC.length).split('|');   /* occ:<key>|<label>|<guestId> */
      if (fixedFor(parts[2], stageOf(parts[0]))) continue;
      out.push({ key: parts[0], label: parts[1], guestId: parts[2], ...v });
    }
    return out;
  }
  keyOf(key, label, guestId) { return OCC + key + '|' + label + '|' + guestId; }
  async mineIn(stage, guestId, occ) {
    const list = occ || await this.occupancies();
    return list.filter((o) => o.guestId === guestId && stageOf(o.key) === stage);
  }

  /* the engine as one guest sees it. With an identity: first names and the
   * guest's own places; without one: counts only, no name, no id. */
  async view(identity) {
    const occ = await this.occupancies();
    const units = {}, mine = {};
    for (const key of Object.keys(SEED)) {
      units[key] = unitsOf(key).map((u) => {
        const here = occ.filter((o) => o.key === key && o.label === u.label);
        const taken = here.length;
        const occupants = identity
          ? here.map((o) => ({ name: o.name || '', mine: o.guestId === identity.guestId, party: !!(identity.partyId && o.partyId === identity.partyId), ...(o.guestId === identity.guestId ? { guestId: o.guestId } : {}) }))
          : here.map(() => ({}));
        /* nobody joins without an identity; a guest with a fixed room in this stage is eligible for that room alone */
        const fx = identity ? fixedFor(identity.guestId, stageOf(key)) : null;
        const elig = !identity ? { ok: false } : fx ? { ok: fx.key === key && fx.label === u.label } : mayJoin(u, identity);
        return { label: u.label, name: u.name, kind: u.kind, places: u.places, reservedFor: u.reservedFor,
                 eligible: elig.ok, occupants, taken, free: Math.max(0, u.places - taken), full: taken >= u.places };
      });
    }
    if (identity) for (const o of occ) if (o.guestId === identity.guestId) mine[stageOf(o.key)] = { key: o.key, label: o.label };
    /* the category as a whole: TOTAL is the physical stock; AVAILABLE is what this guest may still take — a reserved room
       (the hosts', the family's) is never available to a guest, its places never counted (Owner, 16 Sep 2026) */
    const summary = {};
    for (const key of Object.keys(units)) {
      /* open = the rooms bookable through the website: every unreserved room, plus a reserved room this guest may take */
      const list = units[key], open = list.filter((u) => !u.reservedFor || u.eligible);
      summary[key] = { units: list.length, places: list.reduce((n, u) => n + u.places, 0),
                       reserved: list.filter((u) => u.reservedFor).length, reservedFor: (list.find((u) => u.reservedFor) || {}).reservedFor || null,
                       free: open.reduce((n, u) => n + u.free, 0), rooms: open.filter((u) => u.free > 0).length,
                       name: SEED[key].name, kind: list.length && list[0].kind };
    }
    return { ok: true, units, summary, mine, places: PLACES };
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
      return json({ ok: true, mine: v.mine });
    }

    if (op === 'join' || op === 'leave') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      const key = String(body && body.key || '').trim();
      const label = String(body && body.label || '').trim().toUpperCase();
      const name = String(body && body.name || '').slice(0, 24);
      return await this.state.blockConcurrencyWhile(async () => {
        if (op === 'leave') {
          const stage = key ? stageOf(key) : String(body && body.stage || '');
          if (!stage) return json({ ok: false, error: 'invalid release' }, 400);
          if (fixedFor(guestId, stage)) return json({ ...(await this.view(identity)), ok: false, error: 'fixed host allocation' }, 403);
          const had = await this.mineIn(stage, guestId);
          for (const o of had) await this.storage.delete(this.keyOf(o.key, o.label, o.guestId));
          return json({ ok: true, released: had.map((o) => ({ key: o.key, label: o.label })), ...(await this.view(identity)) });
        }
        const unit = unitOf(key, label);
        if (!unit) return json({ ok: false, error: 'unknown room' }, 404);
        /* the hosts' fixed room: a fixed guest neither moves within that stage nor is moved; nobody else joins the fixed room */
        if (fixedFor(guestId, stageOf(key))) return json({ ...(await this.view(identity)), ok: false, error: 'fixed host allocation' }, 403);
        if (FIXED.some((f) => f.key === key && f.label === label)) return json({ ...(await this.view(identity)), ok: false, error: 'reserved · bride & groom' }, 403);
        const may = mayJoin(unit, identity);
        if (!may.ok) return json({ ...(await this.view(identity)), ok: false, error: may.error }, 403);
        const occ = await this.occupancies();
        const already = occ.some((o) => o.key === key && o.label === label && o.guestId === guestId);
        const others = occ.filter((o) => o.key === key && o.label === label && o.guestId !== guestId).length;
        if (!already && others >= unit.places) return json({ ...(await this.view(identity)), ok: false, error: 'full' }, 409);   /* the last place was just filled: one wins, the other chooses another room */
        /* HOLD THE NEW PLACE FIRST … */
        await this.storage.put(this.keyOf(key, label, guestId), { invitationId, partyId: identity.partyId || null, name, at: new Date().toISOString() });
        /* … AND ONLY THEN LET THE OLD ONE GO — every other place of this stage */
        const stage = stageOf(key);
        for (const o of occ) {
          if (o.guestId === guestId && stageOf(o.key) === stage && !(o.key === key && o.label === label)) await this.storage.delete(this.keyOf(o.key, o.label, o.guestId));
        }
        return json({ ok: true, joined: { key, label }, ...(await this.view(identity)) });
      });
    }

    /* ---- Guest Relations only ---- */
    if (!gr) return json({ ok: false, error: 'unknown rooms operation' }, 404);

    if (op === 'plan') {
      const occ = await this.occupancies();
      const out = { ok: true, places: PLACES, units: {} };
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
          if (FIXED.some((f) => f.key === key && f.label === label) || fixedFor(guestId, stageOf(key))) { refused.push({ ...o, error: 'fixed host allocation' }); continue; }
          const occ = await this.occupancies();
          const others = occ.filter((x) => x.key === key && x.label === label && x.guestId !== guestId).length;
          if (others >= unit.places && !body.force) { refused.push({ ...o, error: 'full' }); continue; }
          await this.storage.put(this.keyOf(key, label, guestId), { invitationId: String(o.invitationId), partyId: o.partyId || null, name: String(o.name || '').slice(0, 24), at: new Date().toISOString(), by: String(body.actor || 'guest-relations') });
          const stage = stageOf(key);
          for (const x of occ) if (x.guestId === guestId && stageOf(x.key) === stage && !(x.key === key && x.label === label)) await this.storage.delete(this.keyOf(x.key, x.label, x.guestId));
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
        const had = occ.filter((o) => !o.fixed && o.guestId === guestId && (!stage || stageOf(o.key) === stage));
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
