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

   NO GEOMETRY IS INVENTED HERE. The floor plan is configuration, uploaded by
   Guest Relations through the protected route and validated against the
   frozen source truth:
     CEREMONY  40 guest seats · 20 left · 20 right · centre aisle ·
               6 FAMILY reserved within the 40 · left 4 · right 2 · 34 selectable
     DINNER    one long table · 40 guest positions · 20 each side ·
               6 FAMILY reserved within the 40 · 34 selectable
   Bride & Groom are positions outside the guest inventory and are drawn by the
   client, never stored as seats. Row counts, chairs per row and the exact
   FAMILY chair ids are NOT authoritative until Guest Relations configures
   them: until then both inventories are unconfigured and the guest sees
   SEATING NOT OPEN YET.

   Global state: SEATING_OPEN (guests may choose) and SEATING_FROZEN (guests
   see their authoritative allocation and cannot self-change; Guest Relations
   keeps the operational path). No freeze date is invented: frozen is a flag.
   ========================================================================== */

export const RULES = {
  ceremony: { perSide: 20, family: { L: 4, R: 2 }, id: /^C-[LR]-\d{1,2}-\d{1,2}$/ },
  dinner:   { perSide: 20, family: 6,              id: /^D-[LR]-\d{1,2}$/ },
};
export const EVENTS = ['ceremony', 'dinner'];
const MAX_PER_INVITATION = 6;   /* a party never holds more chairs than people it could have */
const HOLD = 'hold:';

/* ---- the geometry contract ---------------------------------------------
 * ceremony: { rows: [ { side: 'L'|'R', row: n, seats: [ { seatId, family } ] } ] }
 * dinner:   { sides: { L: [ { seatId, family } ], R: [ ... ] } }
 * Either event may be null (not configured). Returns { ok, errors, config }. */
export function validateGeometry(input) {
  const errors = [];
  const out = { ceremony: null, dinner: null };
  const cfg = input || {};

  if (cfg.ceremony) {
    const rows = Array.isArray(cfg.ceremony.rows) ? cfg.ceremony.rows : null;
    if (!rows) errors.push('ceremony.rows must be a list');
    else {
      const count = { L: 0, R: 0 }, fam = { L: 0, R: 0 }, ids = new Set();
      const norm = [];
      for (const r of rows) {
        const side = r.side === 'L' || r.side === 'R' ? r.side : null;
        const row = Number.isInteger(r.row) && r.row > 0 ? r.row : null;
        if (!side || !row || !Array.isArray(r.seats)) { errors.push('ceremony row malformed'); continue; }
        const seats = [];
        for (const s of r.seats) {
          const seatId = String(s && s.seatId || '');
          if (!RULES.ceremony.id.test(seatId)) { errors.push('ceremony seat id ' + seatId + ' does not follow C-L-[ROW]-[SEAT]'); continue; }
          if (!seatId.startsWith('C-' + side + '-' + row + '-')) errors.push('ceremony seat ' + seatId + ' is not in its own side/row');
          if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
          ids.add(seatId);
          count[side]++;
          if (s.family) fam[side]++;
          seats.push({ seatId, family: !!s.family });
        }
        norm.push({ side, row, seats });
      }
      if (count.L !== RULES.ceremony.perSide) errors.push('ceremony left must hold ' + RULES.ceremony.perSide + ' guest seats, has ' + count.L);
      if (count.R !== RULES.ceremony.perSide) errors.push('ceremony right must hold ' + RULES.ceremony.perSide + ' guest seats, has ' + count.R);
      if (fam.L !== RULES.ceremony.family.L) errors.push('ceremony left must reserve ' + RULES.ceremony.family.L + ' family seats, has ' + fam.L);
      if (fam.R !== RULES.ceremony.family.R) errors.push('ceremony right must reserve ' + RULES.ceremony.family.R + ' family seats, has ' + fam.R);
      out.ceremony = { rows: norm.sort((a, b) => a.row - b.row || (a.side < b.side ? -1 : 1)) };
    }
  }

  if (cfg.dinner) {
    const sides = cfg.dinner.sides || {};
    const ids = new Set();
    let fam = 0;
    const norm = { L: [], R: [] };
    for (const side of ['L', 'R']) {
      const list = Array.isArray(sides[side]) ? sides[side] : null;
      if (!list) { errors.push('dinner.sides.' + side + ' must be a list'); continue; }
      for (const s of list) {
        const seatId = String(s && s.seatId || '');
        if (!RULES.dinner.id.test(seatId)) { errors.push('dinner seat id ' + seatId + ' does not follow D-L-[POSITION]'); continue; }
        if (!seatId.startsWith('D-' + side + '-')) errors.push('dinner seat ' + seatId + ' is not on its own side');
        if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
        ids.add(seatId);
        if (s.family) fam++;
        norm[side].push({ seatId, family: !!s.family });
      }
      if (norm[side].length !== RULES.dinner.perSide) errors.push('dinner side ' + side + ' must hold ' + RULES.dinner.perSide + ' guest positions, has ' + norm[side].length);
    }
    if (fam !== RULES.dinner.family) errors.push('dinner must reserve ' + RULES.dinner.family + ' family positions, has ' + fam);
    out.dinner = { sides: norm };
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
  return ['L', 'R'].flatMap((side) => d.sides[side].map((s, i) => ({ seatId: s.seatId, family: s.family, side, position: i + 1 })));
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
                  configured: { ceremony: !!cfg.ceremony, dinner: !!cfg.dinner }, mine: { ceremony: {}, dinner: {} } };
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
        : (cfg.dinner ? { sides: { L: seats.filter((s) => s.side === 'L'), R: seats.filter((s) => s.side === 'R') } } : null);
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
      const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null, events: {} };
      for (const event of EVENTS) {
        const holds = await this.holds(event);
        const seats = seatsOf(cfg, event).map((s) => {
          const h = holds[s.seatId];
          return { ...s, state: s.family ? 'family' : h ? h.state : 'available', invitationId: h ? h.invitationId : null, guestId: h ? h.guestId : null, at: h ? h.at : null };
        });
        out.events[event] = {
          configured: seats.length > 0,
          seats,
          total: seats.length,
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
