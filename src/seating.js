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

   ONE CODE = ONE GUEST (Owner, 14 Sep 2026): a chair is held or released
   only by the guest the Worker has identified (src/auth.js), for that guest
   and nobody else. A hold carries the guest's first name and party, so the
   plan can show every authenticated guest where the people they know sit —
   first names only, never a surname, never a code.

   NO FAMILY CHAIR IS INVENTED HERE. The floor plan is configuration, uploaded
   by Guest Relations through the protected route and validated against the
   Owner's binding geometry (override of 2026-09-11):
     CEREMONY  50 guest seats · LEFT 10 rows × 2 chairs = 20 · RIGHT 10 rows ×
               3 chairs = 30 · centre aisle · the asymmetry is deliberate ·
               BRIDE and GROOM two fixed positions at the FRONT CENTRE (Owner,
               13 Sep 2026): not guest chairs, no seat id, never selectable,
               never counted as inventory — the couple's ceremony place
     DINNER    one long table · 50 guest seats (Owner override, 25 Sep 2026 — supersedes the 48 of
               OQ-03): TOP 25 · BOTTOM 25 — the seats numbered 13 are never on the plan and NOTHING is
               renumbered: A1–A12, A14–A26 · B1–B12, B14–B26, every one bookable (A26 and B26 are ordinary seats)
   NO CHAIR IS PREASSIGNED TO ANYONE (Owner decisions, 13 Sep 2026): there is
   no family-seat mechanism and no fixed Bride/Groom position. Every guest —
   the couple, hosts and family included — holds a chair through this same
   ledger, in order of booking; the couple book two of the fifty dinner
   chairs themselves, first, before the codes go out; a chair once held is
   unavailable to the next guest. The `family` flag below remains a
   validation option the uploaded geometry may carry, unused until a future
   explicit Owner decision; it is never assumed and never inferred from who a
   guest is. Until Guest Relations configures and opens, both inventories are
   unconfigured and the guest sees SEATING NOT OPEN YET.

   Global state: SEATING_OPEN (guests may choose) and SEATING_FROZEN (guests
   see their authoritative allocation and cannot self-change; Guest Relations
   keeps the operational path). No freeze date is invented: frozen is a flag.
   ========================================================================== */

export const RULES = {
  /* C-L-[ROW]-[SEAT] · C-R-[ROW]-[SEAT] · rows 01–10 · left seats 01–02 · right seats 01–03 */
  ceremony: { rows: 10, perRow: { L: 2, R: 3 }, guestSeats: 50, fixed: ['BRIDE', 'GROOM'], id: /^C-([LR])-(0[1-9]|10)-(0[1-3])$/ },
  /* D-T-01 … D-T-26 · D-B-01 … D-B-26 minus the two 13s · fifty chairs, no fixed position for anyone (Owner, 25 Sep 2026).
     The id pattern still RECOGNISES a 13 so a stored geometry or hold that names one can be read and reported. */
  dinner:   { perSide: 25, guestSeats: 50, totalPeople: 50, lastNumber: 26, retired: { T: [13], B: [13] }, id: /^D-([TB])-(0[1-9]|1[0-9]|2[0-6])$/ },
};
export const CAPACITY = {
  ceremony: { guestSeats: 50, left: 20, right: 30, fixed: 2 },
  dinner: { guestSeats: 50, top: 25, bottom: 25, totalPeople: 50 },
};
/* THE DINNER PLAN IS THE CODE'S (Owner, 25 Sep 2026): the fifty chairs of the long table, in the order of their numbers —
   1 … 12, 14 … 26 on each side. 13 can never be produced: the list skips NEVER_SEAT_NUMBER by construction. A geometry Guest
   Relations uploaded earlier (the 48, or the 50 with the 13s) is read through this list, so the two new chairs A26 and B26
   exist on the plan without any write to the stored configuration, and every existing hold keeps its id. */
export function dinnerSeatIds(side) {
  const out = [];
  for (let n = 1; n <= RULES.dinner.lastNumber; n++) if (n !== NEVER_SEAT_NUMBER) out.push('D-' + side + '-' + String(n).padStart(2, '0'));
  return out;
}
/* THE TWO RETIRED DINNER SEATS (Owner, 24 Sep 2026 · OQ-03): the seats numbered 13 on side A and side B are not on the plan.
   A hold that still names one is NEVER deleted or moved by this ledger: it stays readable, is reported (`retired` in the
   read, `events.dinner.retired` in the Guest Relations plan) and is logged, so Guest Relations can resolve it by hand. */
/* THE PERMANENT RULE (Owner, 24 Sep 2026 · D-29 in docs/DECISION-REGISTER.md): 13 is never a guest-facing seat number, for
   any event and any future geometry. No generator, configuration or migration may produce a selectable seat 13; the numbering
   jumps (12 → 14) and is never renumbered or hidden behind a substitute such as 12A. */
export const NEVER_SEAT_NUMBER = 13;
export function isRetiredSeat(seatId) {
  const s = String(seatId || ''), m = RULES.dinner.id.exec(s);
  if (m && ((RULES.dinner.retired[m[1]] || []).indexOf(Number(m[2])) >= 0 || Number(m[2]) === NEVER_SEAT_NUMBER)) return true;
  const c = /^C-[LR]-(\d{2})-\d{2}$/.exec(s);
  return !!(c && Number(c[1]) === NEVER_SEAT_NUMBER);
}
function retiredLabel(seatId) { const m = RULES.dinner.id.exec(String(seatId || '')); return m ? (m[1] === 'T' ? 'A' : 'B') + Number(m[2]) : ''; }
export const EVENTS = ['ceremony', 'dinner'];
const MAX_PER_INVITATION = 6;   /* a party never holds more chairs than people it could have */
const HOLD = 'hold:';
const FN = 'fn:';   /* fn:<guestId> → the holder's first name, as the Worker last verified it (PRQ-GAP-02) */
/* the register's first name the Worker put on the verified identity: one word, letters only, never a surname */
function firstNameOf(identity) {
  const s = String(identity && identity.firstName || '').replace(/[^\p{L}\p{M}' \-.]/gu, '').trim().split(/\s+/)[0] || '';
  return s.slice(0, 24);
}
/* the name shown for a hold: the learned first name, else the first word of what the hold stored — never more */
function nameOf(h, names) {
  const learned = h && h.guestId && names[h.guestId];
  if (learned) return learned;
  return (String(h && h.name || '').trim().split(/\s+/)[0] || '').slice(0, 24);
}

/* ---- the geometry contract ---------------------------------------------
 * ceremony: { rows: [ { side: 'L'|'R', row: n, seats: [ { seatId, family } ] } ] }
 * dinner:   { sides: { T: [ { seatId, family } ], B: [ ... ] } }   25 + 25, nothing fixed
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
      out.ceremony = { rows: norm.sort((a, b) => a.row - b.row || (a.side < b.side ? -1 : 1)), fixed: RULES.ceremony.fixed.slice() };
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
        if (!m) { errors.push('dinner seat id ' + seatId + ' does not follow D-T-[01–26] / D-B-[01–26]'); continue; }
        if (m[1] !== side) errors.push('dinner seat ' + seatId + ' is not on its own side');
        if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
        ids.add(seatId);
        /* an upload of the earlier 25-seat geometry still names the 13s: they are simply not part of the plan */
        if (isRetiredSeat(seatId)) continue;
        norm[side].push({ seatId, family: !!s.family });
      }
      /* the plan is the code's fifty (dinnerSeatIds): an upload may name fewer (the earlier 48) — the chairs it does not name
         are added in their places; a family flag it carries is kept */
      const fam = new Set(norm[side].filter((s) => s.family).map((s) => s.seatId));
      norm[side] = dinnerSeatIds(side).map((id) => ({ seatId: id, family: fam.has(id) }));
      if (norm[side].length !== RULES.dinner.perSide) errors.push('dinner ' + (side === 'T' ? 'top' : 'bottom') + ' must hold ' + RULES.dinner.perSide + ' guest seats, has ' + norm[side].length);
    }
    if (sides.L || sides.R) errors.push('dinner sides are T (top) and B (bottom); the retired L/R model is not accepted');
    /* the swimming pool as a landmark: the run it lies along. SOURCE OF TRUTH
     * (Owner, 15 Sep 2026, from the venue plan): RUN A — the top run, 'T' —
     * is the poolside run. Guest Relations may still record 'B' if the venue
     * ever changes the layout; null means the default, never "unknown". */
    const ps = cfg.dinner.poolSide;
    if (ps != null && ps !== 'T' && ps !== 'B') errors.push('dinner.poolSide must be T, B or null');
    /* the couple hold two of these fifty like everyone else — nothing is fixed */
    out.dinner = { sides: norm, totalPeople: RULES.dinner.totalPeople, poolSide: ps === 'B' ? 'B' : 'T' };
  }
  return { ok: errors.length === 0, errors, config: out };
}

/* every seat of an event as a flat list */
export function seatsOf(config, event) {
  if (event === 'ceremony') {
    const c = config && config.ceremony;
    if (!c) return [];
    return c.rows.filter((r) => Number(r.row) !== NEVER_SEAT_NUMBER).flatMap((r) => r.seats.filter((s) => !isRetiredSeat(s.seatId)).map((s, i) => ({ seatId: s.seatId, family: s.family, side: r.side, row: r.row, position: i + 1 })));
  }
  const d = config && config.dinner;
  if (!d) return [];
  /* the stored geometry (the 48 of 24 Sep, or an older one still listing the 13s) is read through the code's fifty: every
     chair in the order of its number, A26 and B26 included, never a 13; a family flag the stored geometry carries is kept */
  return ['T', 'B'].flatMap((side) => {
    const fam = new Set(((d.sides && d.sides[side]) || []).filter((s) => s && s.family).map((s) => s.seatId));
    return dinnerSeatIds(side).map((id, i) => ({ seatId: id, family: fam.has(id), side, position: i + 1 }));
  });
}
/* the holds that sit on a retired seat — kept, reported, never dropped */
function retiredHolds(event, holds) {
  if (event !== 'dinner') return [];
  return Object.keys(holds).filter(isRetiredSeat).map((seatId) => ({ seatId, hold: holds[seatId] }));
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
      if (h.guestId === guestId && (!invitationId || h.invitationId === invitationId)) return { seatId, ...h };
    }
    return null;
  }

  /* what a guest may see: every seat's state; their own chair by name; the
   * first name on every held chair for an authenticated guest (Owner, 14 Sep
   * 2026 — a guest may see where the people they know sit); nothing else.
   * `who` is the verified identity, or an invitation id for a plain read. */
  async view(who) {
    const identity = who && typeof who === 'object' ? who : null;
    const invitationId = identity ? identity.invitationId : (who || '');
    const cfg = await this.config();
    const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null,
                  configured: { ceremony: !!cfg.ceremony, dinner: !!cfg.dinner }, capacity: CAPACITY, mine: { ceremony: {}, dinner: {} },
                  named: !!identity };
    const names = identity ? await this.firstNames() : {};
    const retired = [];
    for (const event of EVENTS) {
      const holds = await this.holds(event);
      for (const r of retiredHolds(event, holds)) {
        const yours = !!(invitationId && r.hold.invitationId === invitationId);
        retired.push({ event, seatId: r.seatId, label: retiredLabel(r.seatId), yours });
        console.warn('[seating] a hold sits on a retired seat and is kept for Guest Relations', event, r.seatId);
      }
      const seats = seatsOf(cfg, event).map((s) => {
        const h = holds[s.seatId];
        let state = 'available';
        if (s.family) state = 'family';
        else if (h) state = (invitationId && h.invitationId === invitationId) ? 'yours' : (identity && identity.partyId && h.partyId === identity.partyId ? 'party' : 'taken');
        const row = { ...s, state };
        if (state === 'yours') { row.guestId = h.guestId; row.allocated = h.state === 'allocated'; out.mine[event][h.guestId] = s.seatId; }
        /* FIRST NAMES ONLY (PRQ-GAP-02): the register's first name the Worker verified — never the text a browser sent */
        if (h && identity) { const nm = nameOf(h, names); if (nm) row.name = nm; }
        /* WHO SITS WHERE (Owner, 20 Sep 2026): an authenticated guest also learns the holder's opaque guest id — the key of their
           profile portrait (/api/profile/photo?of=) — never an invitation id, never a code */
        if (h && identity && h.guestId) row.holder = h.guestId;
        return row;
      });
      out[event] = event === 'ceremony'
        ? (cfg.ceremony ? { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => seats.find((x) => x.seatId === s.seatId)) })), fixed: RULES.ceremony.fixed.slice() } : null)
        : (cfg.dinner ? { sides: { T: seats.filter((s) => s.side === 'T'), B: seats.filter((s) => s.side === 'B') }, totalPeople: RULES.dinner.totalPeople, poolSide: cfg.dinner.poolSide === 'B' ? 'B' : 'T' } : null);
    }
    if (retired.length) out.retired = retired;
    return out;
  }
  /* THE FIRST NAME OF EVERY HOLDER (PRQ-GAP-02): refreshed from the verified identity each time a guest reads or writes,
     so a hold made before the rule is re-labelled on read — no stored hold is rewritten */
  async firstNames() {
    const map = await this.storage.list({ prefix: FN });
    const out = {};
    for (const [k, v] of map) out[k.slice(FN.length)] = v;
    return out;
  }
  async learnName(identity) {
    const nm = firstNameOf(identity);
    if (!nm || !identity.guestId) return;
    if ((await this.storage.get(FN + identity.guestId)) !== nm) await this.storage.put(FN + identity.guestId, nm);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/seating\/?/, '') || 'read';
    const gr = request.headers.get('x-gr-verified') === 'yes';   /* set only by the Worker after the token check */
    let identity = null;                                          /* set only by the Worker after the bearer check */
    try { identity = JSON.parse(request.headers.get('x-siyl-identity') || 'null'); } catch (e) { identity = null; }

    if (identity) await this.learnName(identity);
    if (op === 'read') return json(await this.view(identity || url.searchParams.get('invitation') || ''));

    if (op === 'mine') {
      const v = await this.view(identity || url.searchParams.get('invitation') || '');
      return json({ ok: true, open: v.open, frozen: v.frozen, configured: v.configured, mine: v.mine });
    }

    if (op === 'select') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      const event = String(body && body.event || '');
      const seatId = String(body && body.seatId || '');
      /* the name a browser sends is not trusted (PRQ-GAP-02): the hold carries the register's first name the Worker verified */
      const name = firstNameOf(identity);
      if (!invitationId || !guestId || !EVENTS.includes(event) || !seatId) return json({ ok: false, error: 'invalid selection' }, 400);
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (!cfg.open) return json({ ok: false, error: 'seating is not open' }, 423);
        if (cfg.frozen) return json({ ok: false, error: 'seating is frozen' }, 423);
        const seat = seatsOf(cfg, event).find((s) => s.seatId === seatId);
        if (!seat) return json({ ok: false, error: 'unknown seat' }, 404);
        if (seat.family) return json({ ok: false, error: 'reserved for family' }, 409);
        const holds = await this.holds(event);
        const current = holds[seatId];
        if (current && !(current.guestId === guestId)) {
          return json({ ok: false, error: 'taken', ...(await this.view(identity)) }, 409);
        }
        const previous = await this.holdOf(event, null, guestId);
        if (previous && previous.state === 'allocated') return json({ ok: false, error: 'allocated by Guest Relations' }, 423);
        const held = Object.values(holds).filter((h) => h.invitationId === invitationId && !(previous && h.guestId === guestId)).length;
        if (held >= MAX_PER_INVITATION) return json({ ok: false, error: 'too many seats for one invitation' }, 409);
        /* HOLD THE NEW CHAIR FIRST … */
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, partyId: identity.partyId || null, name, at: new Date().toISOString(), state: 'held' });
        /* … AND ONLY THEN LET THE OLD ONE GO */
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, guestId, ...(await this.view(identity)) });
      });
    }

    if (op === 'release') {
      if (!identity) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      const invitationId = String(body && body.invitationId || '').trim();
      const guestId = String(body && body.guestId || '').trim();
      const event = String(body && body.event || '');
      if (!invitationId || !guestId || !EVENTS.includes(event)) return json({ ok: false, error: 'invalid release' }, 400);
      if (invitationId !== identity.invitationId || guestId !== identity.guestId) return json({ ok: false, error: 'not your guest' }, 403);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (cfg.frozen) return json({ ok: false, error: 'seating is frozen' }, 423);
        const previous = await this.holdOf(event, null, guestId);
        if (previous && previous.state === 'allocated') return json({ ok: false, error: 'allocated by Guest Relations' }, 423);
        if (previous) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, released: previous ? previous.seatId : null, ...(await this.view(identity)) });
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
        /* a chair that no longer exists cannot stay held — EXCEPT a retired 13: that hold is kept and reported, never dropped */
        const kept = [];
        for (const event of EVENTS) {
          const ids = new Set(seatsOf(next, event).map((s) => s.seatId));
          for (const seatId of Object.keys(await this.holds(event))) {
            if (ids.has(seatId)) continue;
            if (event === 'dinner' && isRetiredSeat(seatId)) { kept.push({ event, seatId, label: retiredLabel(seatId) }); console.warn('[seating] a hold on a retired seat is kept', event, seatId); continue; }
            await this.storage.delete(HOLD + event + ':' + seatId);
          }
        }
        return json({ ok: true, configured: { ceremony: !!next.ceremony, dinner: !!next.dinner }, updatedAt: next.updatedAt, ...(kept.length ? { retiredHolds: kept } : {}) });
      });
    }

    if (op === 'state') {
      const body = await safeJson(request);
      return await this.state.blockConcurrencyWhile(async () => {
        const cfg = await this.config();
        if (typeof body.open === 'boolean') cfg.open = body.open;
        if (typeof body.frozen === 'boolean') cfg.frozen = body.frozen;
        /* the pool side: run A ('T') is the source of truth (Owner, 15 Sep 2026); null returns to it */
        if ('poolSide' in body && cfg.dinner) { const ps = body.poolSide; if (ps === 'T' || ps === 'B' || ps === null) cfg.dinner.poolSide = ps === 'B' ? 'B' : 'T'; }
        cfg.updatedAt = new Date().toISOString();
        await this.storage.put('config', cfg);
        return json({ ok: true, open: cfg.open, frozen: cfg.frozen, poolSide: cfg.dinner ? (cfg.dinner.poolSide === 'B' ? 'B' : 'T') : null, updatedAt: cfg.updatedAt });
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
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, partyId: body.partyId || (current && current.partyId) || null, name: String(body.name || (current && current.name) || '').slice(0, 24), at: new Date().toISOString(), state: 'allocated', by: String(body.actor || 'guest-relations') });
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, invitationId, guestId, state: 'allocated' });
      });
    }

    /* REKEY (migration, 14 Sep 2026): a hold made under the retired party
     * invitation is re-labelled with the guest's own invitation, party and
     * first name. The chair, the guest and the state do not change. */
    if (op === 'rekey') {
      const body = await safeJson(request);
      const list = Array.isArray(body && body.holds) ? body.holds : [];
      return await this.state.blockConcurrencyWhile(async () => {
        const done = [], refused = [];
        for (const r of list) {
          const event = String(r.event || ''), seatId = String(r.seatId || '');
          const cur = EVENTS.includes(event) ? (await this.holds(event))[seatId] : null;
          if (!cur) { refused.push({ event, seatId, error: 'no hold' }); continue; }
          if (r.fromInvitationId && cur.invitationId !== r.fromInvitationId) { refused.push({ event, seatId, error: 'held by another invitation' }); continue; }
          if (r.guestId && cur.guestId !== r.guestId) { refused.push({ event, seatId, error: 'held by another guest' }); continue; }
          await this.storage.put(HOLD + event + ':' + seatId, { ...cur, invitationId: String(r.invitationId || cur.invitationId), partyId: r.partyId || cur.partyId || null, name: String(r.name || cur.name || '').slice(0, 24), rekeyedAt: new Date().toISOString() });
          done.push({ event, seatId, invitationId: String(r.invitationId || cur.invitationId), guestId: cur.guestId });
        }
        return json({ ok: refused.length === 0, done, refused });
      });
    }

    /* the operations output: every seat, its state, who holds it */
    /* THE CLEAN RESET (Owner, 19 Sep 2026): every seat hold of every event goes — a guest's own choice and a Guest Relations
       assignment alike (the plan starts again from nobody); the geometry, the open / frozen state and the pool are
       configuration and stay. `dryRun` names what would go without writing. */
    if (op === 'reset') {
      if (!gr) return json({ ok: false, error: 'unauthorised' }, 401);
      const body = await safeJson(request);
      return await this.state.blockConcurrencyWhile(async () => {
        const rows = [];
        for (const event of EVENTS) for (const [seatId, h] of Object.entries(await this.holds(event))) rows.push({ event, seatId, guestId: h.guestId, invitationId: h.invitationId, ...(body && body.snapshot ? { storageKey: HOLD + event + ':' + seatId, value: h } : {}) });
        if (!(body && body.dryRun === false)) return json({ ok: true, dryRun: true, holds: rows.length, rows });
        for (const r of rows) await this.storage.delete(HOLD + r.event + ':' + r.seatId);
        let remaining = 0; for (const event of EVENTS) remaining += Object.keys(await this.holds(event)).length;
        return json({ ok: true, dryRun: false, cleared: rows.length, rows, remaining, at: new Date().toISOString() });
      });
    }

    if (op === 'plan') {
      const cfg = await this.config();
      const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null, capacity: CAPACITY, events: {} };
      for (const event of EVENTS) {
        const holds = await this.holds(event);
        const seats = seatsOf(cfg, event).map((s) => {
          const h = holds[s.seatId];
          return { ...s, state: s.family ? 'family' : h ? h.state : 'available', invitationId: h ? h.invitationId : null, guestId: h ? h.guestId : null, partyId: h ? h.partyId || null : null, name: h ? h.name || '' : '', at: h ? h.at : null };
        });
        out.events[event] = {
          configured: seats.length > 0,
          seats,
          guestSeats: seats.length,
          capacity: event === 'ceremony' ? { guestSeats: CAPACITY.ceremony.guestSeats, left: CAPACITY.ceremony.left, right: CAPACITY.ceremony.right, fixed: RULES.ceremony.fixed.slice() }
                                        : { guestSeats: CAPACITY.dinner.guestSeats, top: CAPACITY.dinner.top, bottom: CAPACITY.dinner.bottom, totalPeople: CAPACITY.dinner.totalPeople },
          family: seats.filter((s) => s.family).length,
          held: seats.filter((s) => s.state === 'held').length,
          allocated: seats.filter((s) => s.state === 'allocated').length,
          available: seats.filter((s) => s.state === 'available').length,
        };
        const rh = retiredHolds(event, holds).map((r) => ({ seatId: r.seatId, label: retiredLabel(r.seatId), state: r.hold.state, invitationId: r.hold.invitationId, guestId: r.hold.guestId, name: r.hold.name || '', at: r.hold.at }));
        if (rh.length) out.events[event].retired = rh;
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
