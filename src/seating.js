/* ============================================================================
   SEE YOU IN LAOS — THE SEATING LEDGER (G).

   ONE Durable Object instance ("seating") holds two independent inventories:
   CEREMONY and DINNER. Every guest, in every browser, on either deployment,
   talks to the same actor, and the actor handles one request at a time — so
   two people choosing the same chair in the same moment are serialised: the
   first holds it, the second is told it is taken.

   A SEAT BELONGS TO A NAMED GUEST, never to a party. Changing a seat is
   atomic in the only safe order: hold the new chair first; only when that
   succeeded, release the old one.

   NO FAMILY CHAIR IS INVENTED HERE. The floor plan is configuration, uploaded
   by Guest Relations through the protected route and validated against the
   Owner's binding geometry (override of 2026-09-11):
     CEREMONY  50 guest seats · LEFT 10 rows × 2 chairs = 20 · RIGHT 10 rows ×
               3 chairs = 30 · centre aisle · the asymmetry is deliberate
     DINNER    one long table · 50 people · TOP 24 guest seats · BOTTOM 24 guest
               seats = 48 guest seats · BRIDE and GROOM two fixed central
               positions, never guest inventory, never selectable
   FAMILY chairs (six per event, conceptually) stay RESERVED · FAMILY when the
   configuration marks them; their exact ids are unresolved and are never
   assumed. Until Guest Relations configures and opens, both inventories are
   unconfigured and the guest sees SEATING NOT OPEN YET.

   Global state: SEATING_OPEN (guests may choose) and SEATING_FROZEN (guests
   see their authoritative allocation and cannot self-change; Guest Relations
   keeps the operational path). No freeze date is invented: frozen is a flag.
   ========================================================================== */

export const RULES = {
  /* C-L-[ROW]-[SEAT] · C-R-[ROW]-[SEAT] · rows 01–10 · left seats 01–02 · right seats 01–03 */
  ceremony: { rows: 10, perRow: { L: 2, R: 3 }, guestSeats: 50, id: /^C-([LR])-(0[1-9]|10)-(0[1-3])$/ },
  /* D-T-01 … D-T-24 · D-B-01 … D-B-24 · BRIDE and GROOM fixed, outside the guest ids */
  dinner:   { perSide: 24, guestSeats: 48, fixed: ['BRIDE', 'GROOM'], totalPeople: 50, id: /^D-([TB])-(0[1-9]|1[0-9]|2[0-4])$/ },
};
export const CAPACITY = {
  ceremony: { guestSeats: 50, left: 20, right: 30 },
  dinner: { guestSeats: 48, top: 24, bottom: 24, fixed: 2, totalPeople: 50 },
};
export const EVENTS = ['ceremony', 'dinner'];
const MAX_PER_INVITATION = 6;   /* a party never holds more chairs than people it could have */
const HOLD = 'hold:';

/* ---- the geometry contract ---------------------------------------------
 * ceremony: { rows: [ { side: 'L'|'R', row: n, seats: [ { seatId, family } ] } ] }
 * dinner:   { sides: { T: [ { seatId, family } ], B: [ ... ] } }   BRIDE/GROOM fixed, not seats
 * Either event may be null (not configured). Returns { ok, errors, config }. */
export function validateGeometry(input) {
  const errors = [];
  const out = { ceremony: null, dinner: null };
  const cfg = input || {};

  if (cfg.ceremony) {
    const rows = Array.isArray(cfg.ceremony.rows) ? cfg.ceremony.rows : null;
    if (!rows) errors.push('ceremony.rows must be a list');
    else {
      const count = { L: 0, R: 0 }, seen = { L: new Set(), R: new Set() }, ids = new Set();
      const norm = [];
      for (const r of rows) {
        const side = r.side === 'L' || r.side === 'R' ? r.side : null;
        const row = Number.isInteger(r.row) && r.row >= 1 && r.row <= RULES.ceremony.rows ? r.row : null;
        if (!side || !row || !Array.isArray(r.seats)) { errors.push('ceremony row malformed (side L|R, row 1–10, seats)'); continue; }
        if (seen[side].has(row)) errors.push('ceremony ' + side + ' row ' + row + ' appears twice');
        seen[side].add(row);
        const want = RULES.ceremony.perRow[side];
        if (r.seats.length !== want) errors.push('ceremony ' + (side === 'L' ? 'left' : 'right') + ' row ' + row + ' must hold ' + want + ' chairs, has ' + r.seats.length);
        const seats = [];
        for (const s of r.seats) {
          const seatId = String(s && s.seatId || '');
          const m = RULES.ceremony.id.exec(seatId);
          if (!m) { errors.push('ceremony seat id ' + seatId + ' does not follow C-L-[ROW]-[SEAT] (rows 01–10, left 01–02, right 01–03)'); continue; }
          if (m[1] !== side || Number(m[2]) !== row) errors.push('ceremony seat ' + seatId + ' is not in its own side/row');
          if (Number(m[3]) > want) errors.push('ceremony seat ' + seatId + ' exceeds the chairs of its row');
          if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
          ids.add(seatId);
          count[side]++;
          seats.push({ seatId, family: !!s.family });
        }
        norm.push({ side, row, seats });
      }
      if (seen.L.size !== RULES.ceremony.rows) errors.push('ceremony left must have ' + RULES.ceremony.rows + ' rows, has ' + seen.L.size);
      if (seen.R.size !== RULES.ceremony.rows) errors.push('ceremony right must have ' + RULES.ceremony.rows + ' rows, has ' + seen.R.size);
      if (count.L !== CAPACITY.ceremony.left) errors.push('ceremony left must hold ' + CAPACITY.ceremony.left + ' guest seats, has ' + count.L);
      if (count.R !== CAPACITY.ceremony.right) errors.push('ceremony right must hold ' + CAPACITY.ceremony.right + ' guest seats, has ' + count.R);
      if (count.L + count.R !== CAPACITY.ceremony.guestSeats && !errors.length) errors.push('ceremony must hold ' + CAPACITY.ceremony.guestSeats + ' guest seats');
      /* FAMILY chairs: optional until the Owner supplies their ids — never required, never assumed */
      out.ceremony = { rows: norm.sort((a, b) => a.row - b.row || (a.side < b.side ? -1 : 1)) };
    }
  }

  if (cfg.dinner) {
    const sides = cfg.dinner.sides || {};
    const ids = new Set();
    const norm = { T: [], B: [] };
    for (const side of ['T', 'B']) {
      const list = Array.isArray(sides[side]) ? sides[side] : null;
      if (!list) { errors.push('dinner.sides.' + side + ' must be a list (T = top, B = bottom)'); continue; }
      for (const s of list) {
        const seatId = String(s && s.seatId || '');
        const m = RULES.dinner.id.exec(seatId);
        if (!m) { errors.push('dinner seat id ' + seatId + ' does not follow D-T-[01–24] / D-B-[01–24]'); continue; }
        if (m[1] !== side) errors.push('dinner seat ' + seatId + ' is not on its own side');
        if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
        ids.add(seatId);
        norm[side].push({ seatId, family: !!s.family });
      }
      if (norm[side].length !== RULES.dinner.perSide) errors.push('dinner ' + (side === 'T' ? 'top' : 'bottom') + ' must hold ' + RULES.dinner.perSide + ' guest seats, has ' + norm[side].length);
    }
    if (sides.L || sides.R) errors.push('dinner sides are T (top) and B (bottom); the retired L/R model is not accepted');
    /* BRIDE and GROOM are fixed central positions — metadata, never guest seats, never selectable */
    out.dinner = { sides: norm, fixed: RULES.dinner.fixed.slice(), totalPeople: RULES.dinner.totalPeople };
  }
  return { ok: errors.length === 0, errors, config: out };
}

/* every seat of an event as a flat list */
export function seatsOf(config, event) {
  if (event === 'ceremony') {
    const c = config && config.ceremony;
    if (!c) return [];
    return c.rows.flatMap((r) => r.seats.map((s, i) => ({ seatId: s.seatId, family: s.family, side: r.side, row: r.row, position: i + 1 })));
  }
  const d = config && config.dinner;
  if (!d) return [];
  return ['T', 'B'].flatMap((side) => d.sides[side].map((s, i) => ({ seatId: s.seatId, family: s.family, side, position: i + 1 })));
}

export class Seating {
  constructor(state) {
    this.state = state;
    this.storage = state.storage;
  }

  async config() {
    return (await this.storage.get('config')) || { ceremony: null, dinner: null, open: false, frozen: false, updatedAt: null };
  }
  async holds(event) {
    const map = await this.storage.list({ prefix: HOLD + event + ':' });
    const out = {};
    for (const [k, v] of map) out[k.slice((HOLD + event + ':').length)] = v;
    return out;
  }
  /* the seats a named guest of an invitation holds in one event */
  async holdOf(event, invitationId, guestId) {
    const holds = await this.holds(event);
    for (const [seatId, h] of Object.entries(holds)) {
      if (h.invitationId === invitationId && h.guestId === guestId) return { seatId, ...h };
    }
    return null;
  }

  /* what a guest may see: every seat's state, their own chairs by name,
   * nobody else's name — a taken chair is simply taken */
  async view(invitationId) {
    const cfg = await this.config();
    const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null,
                  configured: { ceremony: !!cfg.ceremony, dinner: !!cfg.dinner }, capacity: CAPACITY, mine: { ceremony: {}, dinner: {} } };
    for (const event of EVENTS) {
      const holds = await this.holds(event);
      const seats = seatsOf(cfg, event).map((s) => {
        const h = holds[s.seatId];
        let state = 'available';
        if (s.family) state = 'family';
        else if (h) state = (invitationId && h.invitationId === invitationId) ? 'yours' : 'taken';
        const row = { ...s, state };
        if (state === 'yours') { row.guestId = h.guestId; row.allocated = h.state === 'allocated'; out.mine[event][h.guestId] = s.seatId; }
        return row;
      });
      out[event] = event === 'ceremony'
        ? (cfg.ceremony ? { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => seats.find((x) => x.seatId === s.seatId)) })) } : null)
        : (cfg.dinner ? { sides: { T: seats.filter((s) => s.side === 'T'), B: seats.filter((s) => s.side === 'B') }, fixed: RULES.dinner.fixed.slice(), totalPeople: RULES.dinner.totalPeople } : null);
    }
    return out;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/seating\/?/, '') || 'read';
    const gr = request.headers.get('x-gr-verified') === 'yes';   /* set only by the Worker after the token check */

    if (op === 'read') return json(await this.view(url.searchParams.get('invitation') || ''));

    if (op === 'mine') {
      const inv = url.searchParams.get('invitation') || '';
      const v = await this.view(inv);
      return json({ ok: true, open: v.open, frozen: v.frozen, configured: v.configured, mine: v.mine });
    }

    if (op === 'select') {
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      const event = String(body && body.event || '');
      const seatId = String(body && body.seatId || '');
      if (!invitationId || !guestId || !EVENTS.includes(event) || !seatId) return json({ ok: false, error: 'invalid selection' }, 400);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (!cfg.open) return json({ ok: false, error: 'seating is not open' }, 423);
        if (cfg.frozen) return json({ ok: false, error: 'seating is frozen' }, 423);
        const seat = seatsOf(cfg, event).find((s) => s.seatId === seatId);
        if (!seat) return json({ ok: false, error: 'unknown seat' }, 404);
        if (seat.family) return json({ ok: false, error: 'reserved for family' }, 409);
        const holds = await this.holds(event);
        const current = holds[seatId];
        if (current && !(current.invitationId === invitationId && current.guestId === guestId)) {
          return json({ ok: false, error: 'taken', ...(await this.view(invitationId)) }, 409);
        }
        const previous = await this.holdOf(event, invitationId, guestId);
        if (previous && previous.state === 'allocated') return json({ ok: false, error: 'allocated by Guest Relations' }, 423);
        const held = Object.values(holds).filter((h) => h.invitationId === invitationId && !(previous && h.guestId === guestId)).length;
        if (held >= MAX_PER_INVITATION) return json({ ok: false, error: 'too many seats for one invitation' }, 409);
        /* HOLD THE NEW CHAIR FIRST … */
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, at: new Date().toISOString(), state: 'held' });
        /* … AND ONLY THEN LET THE OLD ONE GO */
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, guestId, ...(await this.view(invitationId)) });
      });
    }

    if (op === 'release') {
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      const event = String(body && body.event || '');
      if (!invitationId || !guestId || !EVENTS.includes(event)) return json({ ok: false, error: 'invalid release' }, 400);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (cfg.frozen) return json({ ok: false, error: 'seating is frozen' }, 423);
        const previous = await this.holdOf(event, invitationId, guestId);
        if (previous && previous.state === 'allocated') return json({ ok: false, error: 'allocated by Guest Relations' }, 423);
        if (previous) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, released: previous ? previous.seatId : null, ...(await this.view(invitationId)) });
      });
    }

    /* ---- Guest Relations only: geometry, state, allocations, the plan ---- */
    if (!gr) return json({ ok: false, error: 'unknown seating operation' }, 404);

    if (op === 'config') {
      const body = await safeJson(request);
      const v = validateGeometry(body);
      if (!v.ok) return json({ ok: false, error: 'geometry rejected', errors: v.errors }, 422);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        const next = { ...cfg, ceremony: v.config.ceremony, dinner: v.config.dinner, updatedAt: new Date().toISOString(),
                       actor: String(body && body.actor || 'guest-relations') };
        await this.storage.put('config', next);
        /* a chair that no longer exists cannot stay held */
        for (const event of EVENTS) {
          const ids = new Set(seatsOf(next, event).map((s) => s.seatId));
          for (const seatId of Object.keys(await this.holds(event))) if (!ids.has(seatId)) await this.storage.delete(HOLD + event + ':' + seatId);
        }
        return json({ ok: true, configured: { ceremony: !!next.ceremony, dinner: !!next.dinner }, updatedAt: next.updatedAt });
      });
    }

    if (op === 'state') {
      const body = await safeJson(request);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (typeof body.open === 'boolean') cfg.open = body.open;
        if (typeof body.frozen === 'boolean') cfg.frozen = body.frozen;
        cfg.updatedAt = new Date().toISOString();
        await this.storage.put('config', cfg);
        return json({ ok: true, open: cfg.open, frozen: cfg.frozen, updatedAt: cfg.updatedAt });
      });
    }

    if (op === 'assign' || op === 'unassign') {
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      const event = String(body && body.event || '');
      const seatId = String(body && body.seatId || '');
      if (!invitationId || !guestId || !EVENTS.includes(event) || (op === 'assign' && !seatId)) return json({ ok: false, error: 'invalid allocation' }, 400);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        const previous = await this.holdOf(event, invitationId, guestId);
        if (op === 'unassign') {
          if (previous) await this.storage.delete(HOLD + event + ':' + previous.seatId);
          return json({ ok: true, released: previous ? previous.seatId : null });
        }
        const seat = seatsOf(cfg, event).find((s) => s.seatId === seatId);
        if (!seat) return json({ ok: false, error: 'unknown seat' }, 404);
        if (seat.family) return json({ ok: false, error: 'reserved for family' }, 409);
        const holds = await this.holds(event);
        const current = holds[seatId];
        if (current && !(current.invitationId === invitationId && current.guestId === guestId) && !body.force) {
          return json({ ok: false, error: 'taken', by: current }, 409);
        }
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, at: new Date().toISOString(), state: 'allocated', by: String(body.actor || 'guest-relations') });
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, invitationId, guestId, state: 'allocated' });
      });
    }

    /* the operations output: every seat, its state, who holds it */
    if (op === 'plan') {
      const cfg = await this.config();
      const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null, capacity: CAPACITY, events: {} };
      for (const event of EVENTS) {
        const holds = await this.holds(event);
        const seats = seatsOf(cfg, event).map((s) => {
          const h = holds[s.seatId];
          return { ...s, state: s.family ? 'family' : h ? h.state : 'available', invitationId: h ? h.invitationId : null, guestId: h ? h.guestId : null, at: h ? h.at : null };
        });
        out.events[event] = {
          configured: seats.length > 0,
          seats,
          guestSeats: seats.length,
          capacity: event === 'ceremony' ? { guestSeats: CAPACITY.ceremony.guestSeats, left: CAPACITY.ceremony.left, right: CAPACITY.ceremony.right }
                                        : { guestSeats: CAPACITY.dinner.guestSeats, top: CAPACITY.dinner.top, bottom: CAPACITY.dinner.bottom, fixed: RULES.dinner.fixed.slice(), totalPeople: CAPACITY.dinner.totalPeople },
          family: seats.filter((s) => s.family).length,
          held: seats.filter((s) => s.state === 'held').length,
          allocated: seats.filter((s) => s.state === 'allocated').length,
          available: seats.filter((s) => s.state === 'available').length,
        };
      }
      return json(out);
    }

    return json({ ok: false, error: 'unknown seating operation' }, 404);
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
