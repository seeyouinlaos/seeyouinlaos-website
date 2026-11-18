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
     CEREMONY  FIFTY-FOUR PEOPLE IN ALL, THE COUPLE INCLUDED (Owners, 18 Nov 2026 — supersedes the fifty of 2 Oct 2026): BRIDE
               and GROOM, two fixed places at the FRONT CENTRE, held by the couple (resolved by the Worker from the register's
               roles, never from a name) and never selectable by anyone, + 52 guest chairs: LEFT 11 rows × 2 (row 11 at the back,
               the Owners' extension) · RIGHT 10 rows × 3 · centre aisle — the plan is the code's (ceremonyRows), the uploaded
               50-position grid is read through it; an occupied chair is never retired, never moved, never deleted
     DINNER    one long table · 54 guest seats (Owners, 18 Nov 2026 — supersedes the 50 of 25 Sep 2026): TOP 27 · BOTTOM 27 —
               the seats numbered 13 are never on the plan and NOTHING is renumbered: A1–A12, A14–A28 · B1–B12, B14–B28, every
               one bookable (A27, A28, B27, B28 are the Owners' extension at the end of the table)
   NO GUEST CHAIR IS PREASSIGNED TO ANYONE (Owner decisions, 13 Sep 2026): there is
   no family-seat mechanism; the couple's two ceremony places (above) are theirs
   and nobody else's, and they hold no ordinary ceremony chair. Every guest —
   hosts and family included — holds a chair through this same
   ledger, in order of booking; the couple book two of the fifty-four dinner
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

/* THE WHOLE WEDDING (Owners, 18 Nov 2026 — supersedes the fifty of 2 Oct 2026): FIFTY-FOUR PEOPLE IN ALL, the Bride and the Groom
   included. The ceremony is the couple's two places + 52 guest chairs; the dinner is fifty-four chairs, two of them held by the
   couple like every other guest's. Nobody is counted twice: the couple's ceremony places are not guest chairs. */
export const WEDDING_PEOPLE = 54;
export const RULES = {
  /* C-L-[ROW]-[SEAT] · C-R-[ROW]-[SEAT] · left rows 01–11 × seats 01–02 · right rows 01–10 × seats 01–03 — THE CODE'S PLAN (Owners,
     18 Nov 2026: "nur nach hinten erweitern" — the two chairs retired for the fifty return, and the left block gains ONE ROW AT THE
     BACK, row 11, two chairs; no row is widened) = 52 guest chairs, and BRIDE + GROOM, the couple's fixed places */
  ceremony: { rows: 11, rowsOf: { L: 11, R: 10 }, perRow: { L: 2, R: 3 }, gridSeats: 52, guestSeats: 52, retire: 0, fixed: ['BRIDE', 'GROOM'], id: /^C-([LR])-(0[1-9]|1[01])-(0[1-3])$/ },
  /* D-T-01 … D-T-28 · D-B-01 … D-B-28 minus the two 13s · fifty-four chairs, no fixed position for anyone (Owners, 18 Nov 2026: the
     long table gains two places at its end on each side — A27, A28, B27, B28). The id pattern still RECOGNISES a 13 so a stored
     geometry or hold that names one can be read and reported. */
  dinner:   { perSide: 27, guestSeats: 54, totalPeople: 54, lastNumber: 28, retired: { T: [13], B: [13] }, id: /^D-([TB])-(0[1-9]|1[0-9]|2[0-8])$/ },
};
export const CAPACITY = {
  ceremony: { guestSeats: 52, left: 22, right: 30, fixed: 2, couple: 2, totalPeople: 54 },
  dinner: { guestSeats: 54, top: 27, bottom: 27, totalPeople: 54 },
};
/* THE DINNER PLAN IS THE CODE'S (Owner, 25 Sep 2026 · Owners, 18 Nov 2026): the fifty-four chairs of the long table, in the order
   of their numbers — 1 … 12, 14 … 28 on each side. 13 can never be produced: the list skips NEVER_SEAT_NUMBER by construction. A
   geometry Guest Relations uploaded earlier (the 48, or the 50 with the 13s) is read through this list, so the new chairs exist on
   the plan without any write to the stored configuration, and every existing hold keeps its id. */
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
/* THE CEREMONY PLAN IS THE CODE'S (Owners, 18 Nov 2026 — the dinner's rule of 25 Sep 2026, now for the ceremony too): left rows
   1–11 of two chairs, right rows 1–10 of three, in the stored order (row, then side). The geometry Guest Relations uploaded (the
   50-position grid of 13 Sep 2026) is READ THROUGH this list: nothing is re-uploaded, every hold keeps its id, a family flag the
   stored geometry carries is kept. Row 13 can never exist (D-29). */
export function ceremonyRows(config) {
  const c = config && config.ceremony; if (!c) return null;
  const fam = new Set((Array.isArray(c.rows) ? c.rows : []).flatMap((r) => (Array.isArray(r && r.seats) ? r.seats : []).filter((s) => s && s.family).map((s) => s.seatId)));
  const rows = [];
  for (let row = 1; row <= RULES.ceremony.rows; row++) for (const side of ['L', 'R']) {
    if (row > RULES.ceremony.rowsOf[side] || row === NEVER_SEAT_NUMBER) continue;
    const seats = [];
    for (let seat = 1; seat <= RULES.ceremony.perRow[side]; seat++) { const seatId = ceremonyIdOf({ side, row, seat }); seats.push({ seatId, family: fam.has(seatId) }); }
    rows.push({ side, row, seats });
  }
  return rows;
}
/* THE RETIRED CEREMONY POSITIONS (Owner, 2 Oct 2026 · 48 guest chairs + the couple = 50): RETIRED NO MORE (Owners, 18 Nov 2026 —
   54 people, 52 guest chairs): RULES.ceremony.retire is 0, so nothing leaves the plan. The order is kept as the record of the rule;
   were a retirement ever ordered again, only a position NOBODY HOLDS could leave the plan — an occupied chair is never retired. */
export const RETIRE_ORDER = [{ side: 'L', row: 10, seat: 1 }, { side: 'L', row: 10, seat: 2 }, { side: 'R', row: 10, seat: 3 }, { side: 'R', row: 9, seat: 3 },
  { side: 'R', row: 10, seat: 2 }, { side: 'R', row: 9, seat: 2 }, { side: 'L', row: 9, seat: 1 }, { side: 'L', row: 9, seat: 2 }];
const two = (n) => String(n).padStart(2, '0');
export function ceremonyIdOf(p) { return 'C-' + p.side + '-' + two(p.row) + '-' + two(p.seat); }
/* the grid ids of the plan that leave it, given the ceremony's holds — none while RULES.ceremony.retire is 0 */
export function retiredCeremony(config, holds) {
  const rows = ceremonyRows(config); if (!rows || !RULES.ceremony.retire) return new Set();
  const grid = new Set(rows.flatMap((r) => r.seats.map((s) => s.seatId)));
  const rest = rows.slice().sort((x, y) => (y.row - x.row) || (x.side < y.side ? 1 : -1)).flatMap((r) => r.seats.map((s) => s.seatId).reverse());
  const order = RETIRE_ORDER.map(ceremonyIdOf).concat(rest);
  const out = new Set();
  for (const id of order) {
    if (out.size >= RULES.ceremony.retire) break;
    if (grid.has(id) && !(holds && holds[id])) out.add(id);
  }
  return out;
}
/* THE COUPLE'S PLACES (Owner, 2 Oct 2026): the Worker names the two from the register's roles (h = 1 · r = B / G) on every request
   it forwards — never a name, never anything a browser sent. { BRIDE: { g, p, n }, GROOM: { g, p, n } } or null. */
function coupleOf(raw) {
  let c = null; try { c = JSON.parse(raw || 'null'); } catch (e) { c = null; }
  if (!c || typeof c !== 'object') return null;
  const out = {};
  for (const k of RULES.ceremony.fixed) { const x = c[k]; if (x && typeof x.g === 'string' && x.g) out[k] = { g: x.g, p: typeof x.p === 'string' ? x.p : null, n: String(x.n || '').slice(0, 24) }; }
  return Object.keys(out).length ? out : null;
}
function isCouple(couple, guestId) { return !!(couple && guestId && RULES.ceremony.fixed.some((k) => couple[k] && couple[k].g === guestId)); }
function retiredLabel(seatId) { const m = RULES.dinner.id.exec(String(seatId || '')); return m ? (m[1] === 'T' ? 'A' : 'B') + Number(m[2]) : ''; }
export const EVENTS = ['ceremony', 'dinner'];
const MAX_PER_INVITATION = 6;   /* a party never holds more chairs than people it could have */
const HOLD = 'hold:';
const FN = 'fn:';   /* fn:<guestId> → the holder's first name, as the Worker last verified it (PRQ-GAP-02) */
/* THE OWNERS' SEATING MANAGEMENT (Owners, 18 Nov 2026) — the admin console's writes, kept in THIS ledger (no second store):
   placed:<event>:<guestId>  the seats a guest held before the Owners released their seat (their earlier seats, ids only)
   log:<at>:<n>              the change log — guest, from, to, type, when, which Owner, status
   final:<event>             the released final plan of one event — version, when, who, its digest and its seat → guest map */
const PLACED = 'placed:';
const LOG = 'log:';
const FINAL = 'final:';
const LOG_KEEP = 1000;
const HISTORY_KEEP = 6;
const ADMIN_ROLES = ['BRIDE', 'GROOM'];
const SEAT_ID_RE = /^C-[LR]-\d{2}-\d{2}$|^D-[TB]-\d{2}$/;
const GUEST_ID_RE = /^G\d{3,}$/;
/* a guest's seat history, newest last: the seat (or null — no seat) they held before each change the Owners made */
function historyOf(prev, prevSeat) {
  const h = (Array.isArray(prev) ? prev : []).filter((x) => x === null || typeof x === 'string').slice();
  if (!h.length || h[h.length - 1] !== (prevSeat || null)) h.push(prevSeat || null);
  return h.slice(-HISTORY_KEEP);
}
async function sha256Hex(text) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
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
      const seen = { L: new Set(), R: new Set() }, ids = new Set();
      const norm = [];
      for (const r of rows) {
        const side = r.side === 'L' || r.side === 'R' ? r.side : null;
        const row = side && Number.isInteger(r.row) && r.row >= 1 && r.row <= RULES.ceremony.rowsOf[side] && r.row !== NEVER_SEAT_NUMBER ? r.row : null;
        if (!side || !row || !Array.isArray(r.seats)) { errors.push('ceremony row malformed (side L|R, row 1–' + RULES.ceremony.rowsOf.L + ' left · 1–' + RULES.ceremony.rowsOf.R + ' right, seats)'); continue; }
        if (seen[side].has(row)) errors.push('ceremony ' + side + ' row ' + row + ' appears twice');
        seen[side].add(row);
        const want = RULES.ceremony.perRow[side];
        if (r.seats.length !== want) errors.push('ceremony ' + (side === 'L' ? 'left' : 'right') + ' row ' + row + ' must hold ' + want + ' chairs, has ' + r.seats.length);
        const seats = [];
        for (const s of r.seats) {
          const seatId = String(s && s.seatId || '');
          const m = RULES.ceremony.id.exec(seatId);
          if (!m) { errors.push('ceremony seat id ' + seatId + ' does not follow C-L-[ROW]-[SEAT] (left rows 01–11, right rows 01–10, left seats 01–02, right 01–03)'); continue; }
          if (m[1] !== side || Number(m[2]) !== row) errors.push('ceremony seat ' + seatId + ' is not in its own side/row');
          if (Number(m[3]) > want) errors.push('ceremony seat ' + seatId + ' exceeds the chairs of its row');
          if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
          ids.add(seatId);
          seats.push({ seatId, family: !!s.family });
        }
        norm.push({ side, row, seats });
      }
      /* the upload is the grid of 13 Sep 2026 (left 10 rows) or the Owners' plan of 18 Nov 2026 (left 11 rows); the right block has
         ten rows; every row from the first, none missing — the plan itself is always the code's 52 (ceremonyRows) */
      const contiguous = (set, n) => set.size === n && [...set].every((x) => x >= 1 && x <= n);
      if (!(contiguous(seen.L, RULES.ceremony.rowsOf.L) || contiguous(seen.L, RULES.ceremony.rowsOf.L - 1))) errors.push('ceremony left must have rows 1–' + (RULES.ceremony.rowsOf.L - 1) + ' or 1–' + RULES.ceremony.rowsOf.L + ', has ' + seen.L.size);
      if (!contiguous(seen.R, RULES.ceremony.rowsOf.R)) errors.push('ceremony right must have rows 1–' + RULES.ceremony.rowsOf.R + ', has ' + seen.R.size);
      /* FAMILY chairs: optional until the Owner supplies their ids — never required, never assumed */
      out.ceremony = { rows: ceremonyRows({ ceremony: { rows: norm } }), fixed: RULES.ceremony.fixed.slice() };
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
        if (!m) { errors.push('dinner seat id ' + seatId + ' does not follow D-T-[01–28] / D-B-[01–28]'); continue; }
        if (m[1] !== side) errors.push('dinner seat ' + seatId + ' is not on its own side');
        if (ids.has(seatId)) errors.push('duplicate seat ' + seatId);
        ids.add(seatId);
        /* an upload of the earlier 25-seat geometry still names the 13s: they are simply not part of the plan */
        if (isRetiredSeat(seatId)) continue;
        norm[side].push({ seatId, family: !!s.family });
      }
      /* the plan is the code's fifty-four (dinnerSeatIds): an upload may name fewer (the earlier 48 or 50) — the chairs it does
         not name are added in their places; a family flag it carries is kept */
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
    /* the couple hold two of these fifty-four like everyone else — nothing is fixed */
    out.dinner = { sides: norm, totalPeople: RULES.dinner.totalPeople, poolSide: ps === 'B' ? 'B' : 'T' };
  }
  return { ok: errors.length === 0, errors, config: out };
}

/* every seat of an event as a flat list — the ceremony's read with its holds (the two retired positions are the first unheld
   ones of RETIRE_ORDER, so a held chair is always on the plan) */
export function seatsOf(config, event, holds) {
  if (event === 'ceremony') {
    const rows = ceremonyRows(config);
    if (!rows) return [];
    const gone = retiredCeremony(config, holds || {});
    return rows.flatMap((r) => r.seats.filter((s) => !isRetiredSeat(s.seatId) && !gone.has(s.seatId)).map((s, i) => ({ seatId: s.seatId, family: s.family, side: r.side, row: r.row, position: i + 1 })));
  }
  const d = config && config.dinner;
  if (!d) return [];
  /* the stored geometry (the 48 of 24 Sep, or an older one still listing the 13s) is read through the code's fifty-four: every
     chair in the order of its number, A26 … A28 and B26 … B28 included, never a 13; a family flag the stored geometry carries is kept */
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
  async view(who, couple) {
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
      const seats = seatsOf(cfg, event, holds).map((s) => {
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
      /* THE COUPLE'S TWO PLACES ARE PART OF THE ONE PLAN (Owner, 2 Oct 2026): each with its holder — the viewer's own, their
         party's, or the couple's — and, for an authenticated reader, the first name and the opaque guest id (the portrait key),
         exactly as every held chair carries them; never selectable, never a seat id */
      const couplePlaces = RULES.ceremony.fixed.map((position) => {
        const c = couple && couple[position];
        const place = { position, role: position === 'BRIDE' ? 'Bride' : 'Groom', fixed: true };
        if (!c) return place;
        place.state = identity && identity.guestId === c.g ? 'yours' : (identity && identity.partyId && c.p && identity.partyId === c.p ? 'party' : 'couple');
        if (identity) { place.holder = c.g; place.name = names[c.g] || c.n || place.role; }
        return place;
      });
      out[event] = event === 'ceremony'
        ? (cfg.ceremony ? { rows: ceremonyRows(cfg).map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => seats.find((x) => x.seatId === s.seatId)).filter(Boolean) })), fixed: RULES.ceremony.fixed.slice(), couple: couplePlaces, totalPeople: WEDDING_PEOPLE } : null)
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
  /* THE OWNERS' PLACEMENT (Owners, 18 Nov 2026): for one guest (or the guests of a `mine`), per event, the seats held before each
     placement by the Owners — from the hold (placedFrom) or, after a release, from what the release left (placed:) */
  async placedOf(mine, guestId) {
    const out = {};
    for (const event of EVENTS) {
      const ids = new Set(Object.keys((mine && mine[event]) || {})); if (guestId) ids.add(guestId);
      if (!ids.size) continue;
      const holds = await this.holds(event);
      for (const g of ids) {
        const h = Object.values(holds).find((x) => x && x.guestId === g);
        const hist = h ? h.placedFrom : ((await this.storage.get(PLACED + event + ':' + g)) || {}).placedFrom;
        if (Array.isArray(hist) && hist.length) (out[event] = out[event] || {})[g] = hist;
      }
    }
    return out;
  }
  async tombstones() {
    const map = await this.storage.list({ prefix: PLACED }), out = {};
    for (const [k, v] of map) { const [event, g] = k.slice(PLACED.length).split(':'); if (v && Array.isArray(v.placedFrom)) (out[event] = out[event] || {})[g] = v.placedFrom; }
    return out;
  }
  /* the plan of one event as a seat → guest map (the couple's places by position) and its SHA-256 — what a final release fixes */
  async mapOf(cfg, event, couple) {
    const holds = await this.holds(event), map = {};
    for (const st of seatsOf(cfg, event, holds)) { const h = holds[st.seatId]; map[st.seatId] = h && h.guestId ? h.guestId : null; }
    if (event === 'ceremony') for (const k of RULES.ceremony.fixed) map[k] = couple && couple[k] ? couple[k].g : null;
    const keys = Object.keys(map).sort();
    return { map, digest: await sha256Hex(JSON.stringify(keys.map((k) => [k, map[k]]))) };
  }
  async logOf(limit) {
    const map = await this.storage.list({ prefix: LOG });
    return [...map.values()].sort((a, b) => String(b.at).localeCompare(String(a.at)) || (b.n || 0) - (a.n || 0)).slice(0, limit || 300);
  }
  /* the entries of one confirmed write, and the oldest beyond the kept 1,000 — written together with the write itself */
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

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/seating\/?/, '') || 'read';
    const gr = request.headers.get('x-gr-verified') === 'yes';   /* set only by the Worker after the token check */
    let identity = null;                                          /* set only by the Worker after the bearer check */
    try { identity = JSON.parse(request.headers.get('x-siyl-identity') || 'null'); } catch (e) { identity = null; }
    const couple = coupleOf(request.headers.get('x-siyl-couple'));   /* set only by the Worker, from the register's roles */

    if (identity) await this.learnName(identity);
    if (op === 'read') return json(await this.view(identity || url.searchParams.get('invitation') || '', couple));

    if (op === 'mine') {
      const v = await this.view(identity || url.searchParams.get('invitation') || '', couple);
      /* THE OWNERS' PLACEMENT IS THEIRS, NOT THE GUEST'S (Owners, 18 Nov 2026): beside `mine` — never inside it, `mine` is part of the
         trip's fingerprint — the seats this guest held before each placement by the Owners, so the Worker can still recognise the
         trip as the guest sent it */
      /* to a verified identity only — a plain read by invitation never carries anyone's history */
      const placed = identity ? await this.placedOf(v.mine, identity.guestId) : {};
      return json({ ok: true, open: v.open, frozen: v.frozen, configured: v.configured, mine: v.mine, ...(Object.keys(placed).length ? { placed } : {}) });
    }
    /* GUEST RELATIONS' OVERVIEW (28 Sep 2026): every invitation's own seats in ONE read — exactly the `mine` of the per-guest read
       (a family seat is never a guest's; a hold on a seat of the plan, by its invitation); the Guest Relations token only; nothing is written */
    if (op === 'gr-mine') {
      if (!gr) return json({ ok: false, error: 'unauthorised' }, 401);
      const cfg = await this.config(), byInvitation = {};
      for (const event of EVENTS) {
        const holds = await this.holds(event);
        for (const s of seatsOf(cfg, event, holds)) {
          const h = holds[s.seatId]; if (!h || s.family || !h.invitationId) continue;
          const m = byInvitation[h.invitationId] || (byInvitation[h.invitationId] = { ceremony: {}, dinner: {} });
          (m[event] || (m[event] = {}))[h.guestId] = s.seatId;
        }
      }
      return json({ ok: true, byInvitation });
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
        /* THE COUPLE'S PLACES ARE FIXED (Owner, 2 Oct 2026): the Bride and the Groom hold the two front-centre places and never an
           ordinary ceremony chair besides — refused here, whatever the page sends; their dinner chair is chosen like everyone's */
        if (event === 'ceremony' && isCouple(couple, guestId)) return json({ ok: false, error: 'the couple\'s ceremony places are fixed' }, 409);
        const holds = await this.holds(event);
        const seat = seatsOf(cfg, event, holds).find((s) => s.seatId === seatId);
        if (!seat) return json({ ok: false, error: 'unknown seat' }, 404);
        if (seat.family) return json({ ok: false, error: 'reserved for family' }, 409);
        const current = holds[seatId];
        if (current && !(current.guestId === guestId)) {
          return json({ ok: false, error: 'taken', ...(await this.view(identity, couple)) }, 409);
        }
        const previous = await this.holdOf(event, null, guestId);
        if (previous && previous.state === 'allocated') return json({ ok: false, error: 'allocated by Guest Relations' }, 423);
        /* NEVER MORE THAN THE PLAN (Owners, 18 Nov 2026 — 54 people): a NEW ceremony hold is refused once the 52 guest chairs are held */
        if (event === 'ceremony' && !previous && seatsOf(cfg, event, holds).filter((x) => holds[x.seatId]).length >= CAPACITY.ceremony.guestSeats) return json({ ok: false, error: 'the ceremony is full' }, 409);
        const held = Object.values(holds).filter((h) => h.invitationId === invitationId && !(previous && h.guestId === guestId)).length;
        if (held >= MAX_PER_INVITATION) return json({ ok: false, error: 'too many seats for one invitation' }, 409);
        /* HOLD THE NEW CHAIR FIRST … */
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, partyId: identity.partyId || null, name, at: new Date().toISOString(), state: 'held' });
        /* the guest's own choice ends what an Owners' release left behind: from now on the seat is theirs */
        await this.storage.delete(PLACED + event + ':' + guestId);
        /* … AND ONLY THEN LET THE OLD ONE GO */
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, guestId, ...(await this.view(identity, couple)) });
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
        return json({ ok: true, released: previous ? previous.seatId : null, ...(await this.view(identity, couple)) });
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
        /* an event the upload does not name keeps its stored geometry — an upload never clears the other event's plan (and its holds) */
        const next = { ...cfg, ceremony: body && body.ceremony ? v.config.ceremony : cfg.ceremony, dinner: body && body.dinner ? v.config.dinner : cfg.dinner, updatedAt: new Date().toISOString(),
                       actor: String(body && body.actor || 'guest-relations') };
        await this.storage.put('config', next);
        /* a chair that no longer exists cannot stay held — EXCEPT a retired 13: that hold is kept and reported, never dropped */
        const kept = [];
        for (const event of EVENTS) {
          const held = await this.holds(event);
          const ids = new Set(seatsOf(next, event, held).map((s) => s.seatId));
          for (const seatId of Object.keys(held)) {
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
        if (event === 'ceremony' && isCouple(couple, guestId)) return json({ ok: false, error: 'the couple\'s ceremony places are fixed' }, 409);
        const holds = await this.holds(event);
        const seat = seatsOf(cfg, event, holds).find((s) => s.seatId === seatId);
        if (!seat) return json({ ok: false, error: 'unknown seat' }, 404);
        if (seat.family) return json({ ok: false, error: 'reserved for family' }, 409);
        const current = holds[seatId];
        if (current && !(current.invitationId === invitationId && current.guestId === guestId) && !body.force) {
          return json({ ok: false, error: 'taken', by: current }, 409);
        }
        await this.storage.put(HOLD + event + ':' + seatId, { invitationId, guestId, partyId: body.partyId || (current && current.partyId) || null, name: String(body.name || (current && current.name) || '').slice(0, 24), at: new Date().toISOString(), state: 'allocated', by: String(body.actor || 'guest-relations') });
        await this.storage.delete(PLACED + event + ':' + guestId);   /* a new allocation by Guest Relations: an earlier release by the Owners is over */
        if (previous && previous.seatId !== seatId) await this.storage.delete(HOLD + event + ':' + previous.seatId);
        return json({ ok: true, event, seatId, invitationId, guestId, state: 'allocated' });
      });
    }

    /* ---- THE OWNERS' SEATING MANAGEMENT (Owners, 18 Nov 2026) ------------------------------------------------------------
       Only through the admin console's routes (src/billing-routes.js · BILLING_ADMIN): the Worker sets x-gr-verified AND names the
       Owner (x-siyl-admin: BRIDE | GROOM); the public /api/seating route never forwards either. */
    if (op.startsWith('admin-')) {
      const admin = ADMIN_ROLES.includes(request.headers.get('x-siyl-admin') || '') ? request.headers.get('x-siyl-admin') : null;
      if (!admin) return json({ ok: false, error: 'unknown seating operation' }, 404);
      const by = 'owners:' + admin;

      if (op === 'admin-read') {
        const cfg = await this.config(), names = await this.firstNames();
        const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, capacity: CAPACITY, people: WEDDING_PEOPLE, events: {}, placed: await this.tombstones(), log: await this.logOf(300) };
        for (const event of EVENTS) {
          const holds = await this.holds(event);
          const seats = seatsOf(cfg, event, holds).map((st) => {
            const h = holds[st.seatId];
            return { ...st, state: st.family ? 'family' : h ? h.state : 'available', guestId: h ? h.guestId : null, invitationId: h ? h.invitationId : null,
              name: h ? nameOf(h, names) : '', at: h ? h.at || null : null, by: h ? h.by || null : null, placedAt: h ? h.placedAt || null : null };
          });
          const m = await this.mapOf(cfg, event, couple);
          const fin = (await this.storage.get(FINAL + event)) || null;
          out.events[event] = { configured: seats.length > 0, seats, digest: m.digest,
            final: fin ? { version: fin.version, at: fin.at, by: fin.by, digest: fin.digest, map: fin.map, active: fin.active !== false, withdrawnAt: fin.withdrawnAt || null, current: fin.active !== false && fin.digest === m.digest } : null,
            ...(event === 'ceremony' ? { rows: (ceremonyRows(cfg) || []).map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((x) => x.seatId) })),
              couple: RULES.ceremony.fixed.map((position) => ({ position, guestId: couple && couple[position] ? couple[position].g : null, name: couple && couple[position] ? (names[couple[position].g] || couple[position].n) : '' })) } : {}),
            ...(event === 'dinner' && cfg.dinner ? { poolSide: cfg.dinner.poolSide === 'B' ? 'B' : 'T' } : {}),
            retired: retiredHolds(event, holds).map((r) => ({ seatId: r.seatId, label: retiredLabel(r.seatId), guestId: r.hold.guestId })) };
        }
        return json(out);
      }

      /* ONE CONFIRMED CHANGE OF THE PLAN — DECLARATIVE: `target` names the wanted holder of every touched seat (null = free),
         `expect` the holder the console saw there. Everything is checked first, inside the ledger's one turn; nothing is written
         unless all of it holds; then every write of the change, its log and nothing else, at once. */
      if (op === 'admin-apply') {
        const body = await safeJson(request);
        const event = String(body && body.event || '');
        const target = body && body.target && typeof body.target === 'object' ? body.target : null;
        const expect = body && body.expect && typeof body.expect === 'object' ? body.expect : null;
        const guests = body && body.guests && typeof body.guests === 'object' ? body.guests : {};
        if (!EVENTS.includes(event) || !target || !expect) return json({ ok: false, error: 'invalid change', reason: 'INVALID' }, 400);
        const tk = Object.keys(target).sort(), ek = Object.keys(expect).sort();
        if (!tk.length || tk.length > 60) return json({ ok: false, error: 'a change names 1 to 60 seats', reason: 'INVALID' }, 400);
        /* nothing is written blind: every seat the change writes names what the console saw there */
        if (JSON.stringify(tk) !== JSON.stringify(ek)) return json({ ok: false, error: 'every seat of the change must name what was seen there', reason: 'INVALID' }, 400);
        for (const k of tk) {
          if (!SEAT_ID_RE.test(k)) return json({ ok: false, error: 'unknown seat ' + k, reason: 'INVALID' }, 400);
          for (const v of [target[k], expect[k]]) if (v !== null && !(typeof v === 'string' && GUEST_ID_RE.test(v))) return json({ ok: false, error: 'invalid guest for ' + k, reason: 'INVALID' }, 400);
        }
        if (event === 'ceremony' && !couple) return json({ ok: false, error: 'the couple\'s places cannot be named just now — nothing was changed', reason: 'COUPLE_UNKNOWN', retry: true }, 503);
        return await this.state.blockConcurrencyWhile(async () => {
          const cfg = await this.config();
          if (!cfg[event]) return json({ ok: false, error: 'the ' + event + ' plan is not configured', reason: 'NOT_CONFIGURED' }, 409);
          const holds = await this.holds(event);
          const plan = new Map(seatsOf(cfg, event, holds).map((x) => [x.seatId, x]));
          const problems = [];
          for (const k of tk) {
            const st = plan.get(k);
            if (!st) problems.push({ seatId: k, reason: 'NOT_ON_PLAN' });
            else if (st.family) problems.push({ seatId: k, reason: 'FAMILY' });
            const cur = holds[k] && holds[k].guestId ? holds[k].guestId : null;
            if (cur !== expect[k]) problems.push({ seatId: k, reason: 'CHANGED', now: cur, seen: expect[k] });
            const g = target[k];
            if (g && event === 'ceremony' && isCouple(couple, g)) problems.push({ seatId: k, guestId: g, reason: 'COUPLE_FIXED' });
            if (g && !(guests[g] && typeof guests[g].invitationId === 'string' && guests[g].invitationId)) problems.push({ seatId: k, guestId: g, reason: 'UNKNOWN_GUEST' });
          }
          const conflict = problems.some((p) => p.reason === 'CHANGED');
          if (problems.length) return json({ ok: false, error: conflict ? 'the plan changed since it was read — nothing was changed' : 'the change cannot be made — nothing was changed', reason: conflict ? 'CONFLICT' : 'REFUSED', problems }, 409);
          /* the plan after the change: every hold of the event (a kept 13 included), the touched seats as wanted */
          const after = {};
          for (const [k, h] of Object.entries(holds)) after[k] = h && h.guestId ? h.guestId : null;
          for (const k of tk) after[k] = target[k];
          const seatsOfGuest = {};
          for (const [k, g] of Object.entries(after)) if (g) (seatsOfGuest[g] = seatsOfGuest[g] || []).push(k);
          const twice = Object.entries(seatsOfGuest).filter(([, list]) => list.length > 1);
          if (twice.length) return json({ ok: false, error: 'a guest would hold two seats — nothing was changed', reason: 'TWO_SEATS', problems: twice.map(([g, list]) => ({ guestId: g, reason: 'TWO_SEATS', seats: list.sort() })) }, 409);
          const heldAfter = [...plan.keys()].filter((k) => after[k]).length;
          if (heldAfter > CAPACITY[event].guestSeats) return json({ ok: false, error: 'beyond the plan\'s capacity — nothing was changed', reason: 'CAPACITY' }, 409);
          /* the change per guest: where they sat, where they will sit */
          const before = {};
          for (const [k, h] of Object.entries(holds)) if (h && h.guestId) before[h.guestId] = k;
          const touched = new Set(); for (const k of tk) { if (expect[k]) touched.add(expect[k]); if (target[k]) touched.add(target[k]); }
          const changes = [];
          for (const g of touched) {
            const from = before[g] || null, to = (seatsOfGuest[g] || [])[0] || null;
            if (from === to) continue;
            changes.push({ guestId: g, from, to, type: !from ? 'ASSIGN' : !to ? 'RELEASE' : 'MOVE' });
          }
          for (const c of changes) if (c.type === 'MOVE' && changes.some((d) => d !== c && d.from && d.to && d.from === c.to && d.to === c.from)) c.type = 'SWAP';
          if (body.dryRun) return json({ ok: true, dryRun: true, event, changes, heldAfter, capacity: CAPACITY[event].guestSeats });
          if (!changes.length) return json({ ok: true, event, changes: [], unchanged: true });
          /* the writes, all prepared before any is made */
          const now = new Date().toISOString(), puts = {}, dels = new Set();
          const byGuestHold = {}; for (const h of Object.values(holds)) if (h && h.guestId) byGuestHold[h.guestId] = h;
          for (const c of changes) {
            const prev = byGuestHold[c.guestId] || null;
            const tomb = prev ? null : await this.storage.get(PLACED + event + ':' + c.guestId);
            const hist = historyOf(prev ? prev.placedFrom : tomb && tomb.placedFrom, c.from);
            if (c.from && !(c.to && puts[HOLD + event + ':' + c.from])) dels.add(HOLD + event + ':' + c.from);
            if (c.to) {
              const g = guests[c.guestId] || {};
              puts[HOLD + event + ':' + c.to] = { invitationId: String(g.invitationId), guestId: c.guestId, partyId: g.partyId || (prev && prev.partyId) || null,
                name: String((prev && prev.name) || g.name || '').slice(0, 24),
                /* the guest's own time of joining (the Wedding Circle's date) stays theirs — a placement is not a new booking */
                at: prev && prev.at ? prev.at : now, state: 'allocated', by, placedAt: now, placedFrom: hist };
              dels.delete(HOLD + event + ':' + c.to);
              dels.add(PLACED + event + ':' + c.guestId);
            } else {
              puts[PLACED + event + ':' + c.guestId] = { placedFrom: hist, at: now, by };
            }
          }
          /* a seat released by one guest and taken by another in the same change is written once, by its new holder */
          for (const k of Object.keys(puts)) dels.delete(k);
          const batch = now + '·' + admin;
          const lw = await this.logWrites(changes.map((c) => ({ type: c.type, event, guestId: c.guestId, from: c.from, to: c.to, by: admin, status: 'CONFIRMED', batch })));
          const writes = [];
          for (const [k, v] of Object.entries({ ...puts, ...lw.puts })) writes.push(this.storage.put(k, v));
          for (const k of [...dels, ...lw.dels]) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          console.log('[seating] the Owners changed the ' + event + ' plan', admin, changes.length);
          return json({ ok: true, event, changes, by: admin, at: now });
        });
      }

      /* THE FINAL PLAN (Owners, 18 Nov 2026): released per event — the version, who, when and the very seat → guest map, so an export
         and the console can always name what changed since; withdrawn by the Owners only. Guests' self-service is the separate
         open / frozen state (admin-state). */
      if (op === 'admin-final') {
        const body = await safeJson(request);
        const event = String(body && body.event || ''), action = String(body && body.action || '');
        if (!EVENTS.includes(event) || !['release', 'withdraw'].includes(action)) return json({ ok: false, error: 'invalid release', reason: 'INVALID' }, 400);
        return await this.state.blockConcurrencyWhile(async () => {
          const cfg = await this.config();
          if (!cfg[event]) return json({ ok: false, error: 'the ' + event + ' plan is not configured', reason: 'NOT_CONFIGURED' }, 409);
          const m = await this.mapOf(cfg, event, couple), prev = (await this.storage.get(FINAL + event)) || null, now = new Date().toISOString();
          if (action === 'release' && String(body.expectDigest || '') !== m.digest) return json({ ok: false, error: 'the plan changed since it was read — read it again before releasing', reason: 'CONFLICT' }, 409);
          if (action === 'withdraw' && !(prev && prev.active !== false)) return json({ ok: false, error: 'no final plan is released', reason: 'NONE' }, 409);
          const rec = action === 'release' ? { version: ((prev && prev.version) || 0) + 1, at: now, by: admin, digest: m.digest, map: m.map, active: true }
            : { ...prev, active: false, withdrawnAt: now, withdrawnBy: admin };
          const lw = await this.logWrites([{ type: action === 'release' ? 'FINAL_RELEASED' : 'FINAL_WITHDRAWN', event, version: rec.version, by: admin, status: action === 'release' ? 'RELEASED' : 'WITHDRAWN' }]);
          const writes = [this.storage.put(FINAL + event, rec)];
          for (const [k, v] of Object.entries(lw.puts)) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          return json({ ok: true, event, final: { version: rec.version, at: rec.at, by: rec.by, digest: rec.digest, active: rec.active !== false, withdrawnAt: rec.withdrawnAt || null } });
        });
      }

      /* guests' self-service, by the Owners: open (guests may choose) and frozen (guests see their seat and cannot change it) */
      if (op === 'admin-state') {
        const body = await safeJson(request);
        return await this.state.blockConcurrencyWhile(async () => {
          const cfg = await this.config(), was = { open: !!cfg.open, frozen: !!cfg.frozen };
          if (typeof body.open === 'boolean') cfg.open = body.open;
          if (typeof body.frozen === 'boolean') cfg.frozen = body.frozen;
          cfg.updatedAt = new Date().toISOString();
          const lw = await this.logWrites([{ type: 'SELF_SERVICE', event: null, from: (was.open ? 'open' : 'closed') + (was.frozen ? ' · frozen' : ''), to: (cfg.open ? 'open' : 'closed') + (cfg.frozen ? ' · frozen' : ''), by: admin, status: 'CONFIRMED' }]);
          const writes = [this.storage.put('config', cfg)];
          for (const [k, v] of Object.entries(lw.puts)) writes.push(this.storage.put(k, v));
          for (const k of lw.dels) writes.push(this.storage.delete(k));
          await Promise.all(writes);
          return json({ ok: true, open: cfg.open, frozen: cfg.frozen, updatedAt: cfg.updatedAt });
        });
      }
      return json({ ok: false, error: 'unknown seating operation' }, 404);
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
        /* what an Owners' release left behind belongs to the holds that are gone (the log and the released final plans stay — records) */
        for (const k of (await this.storage.list({ prefix: PLACED })).keys()) await this.storage.delete(k);
        let remaining = 0; for (const event of EVENTS) remaining += Object.keys(await this.holds(event)).length;
        return json({ ok: true, dryRun: false, cleared: rows.length, rows, remaining, at: new Date().toISOString() });
      });
    }

    if (op === 'plan') {
      const cfg = await this.config();
      const out = { ok: true, open: !!cfg.open, frozen: !!cfg.frozen, updatedAt: cfg.updatedAt || null, capacity: CAPACITY, events: {} };
      for (const event of EVENTS) {
        const holds = await this.holds(event);
        const seats = seatsOf(cfg, event, holds).map((s) => {
          const h = holds[s.seatId];
          return { ...s, state: s.family ? 'family' : h ? h.state : 'available', invitationId: h ? h.invitationId : null, guestId: h ? h.guestId : null, partyId: h ? h.partyId || null : null, name: h ? h.name || '' : '', at: h ? h.at : null,
            ...(h && Array.isArray(h.placedFrom) ? { placedFrom: h.placedFrom } : {}) };
        });
        out.events[event] = {
          configured: seats.length > 0,
          seats,
          guestSeats: seats.length,
          capacity: event === 'ceremony' ? { guestSeats: CAPACITY.ceremony.guestSeats, left: CAPACITY.ceremony.left, right: CAPACITY.ceremony.right, fixed: RULES.ceremony.fixed.slice(), couple: CAPACITY.ceremony.couple, totalPeople: CAPACITY.ceremony.totalPeople }
                                        : { guestSeats: CAPACITY.dinner.guestSeats, top: CAPACITY.dinner.top, bottom: CAPACITY.dinner.bottom, totalPeople: CAPACITY.dinner.totalPeople },
          family: seats.filter((s) => s.family).length,
          held: seats.filter((s) => s.state === 'held').length,
          allocated: seats.filter((s) => s.state === 'allocated').length,
          available: seats.filter((s) => s.state === 'available').length,
        };
        /* the couple's two places, by the register's roles (the Worker's header) — part of the fifty-four */
        if (event === 'ceremony') out.events[event].couple = RULES.ceremony.fixed.map((position) => ({ position, guestId: couple && couple[position] ? couple[position].g : null, name: couple && couple[position] ? couple[position].n : '' }));
        const rh = retiredHolds(event, holds).map((r) => ({ seatId: r.seatId, label: retiredLabel(r.seatId), state: r.hold.state, invitationId: r.hold.invitationId, guestId: r.hold.guestId, name: r.hold.name || '', at: r.hold.at }));
        if (rh.length) out.events[event].retired = rh;
      }
      /* what an Owners' release left: the guest's earlier seats (the Worker's "the trip as the guest sent it") — ids only */
      const tomb = await this.tombstones();
      if (Object.keys(tomb).length) out.placed = tomb;
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
