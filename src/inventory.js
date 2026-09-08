/* ============================================================================
   SEE YOU IN LAOS — THE SHARED INVENTORY LEDGER.

   ONE Durable Object instance holds the whole journey's stock. Every guest,
   in every browser, on either deployment, talks to the SAME object: Cloudflare
   routes every request for the id "ledger" to a single actor, and that actor
   processes requests ONE AT A TIME. That single-threading is what makes the
   reservation atomic — two guests hitting "Send to Guest Relations" in the
   same millisecond are serialised, the first is allocated and the second is
   told, by category, exactly what has just gone.

   The ledger stores allocations, never totals: `alloc:<invitationId>` holds
   the lines that invitation has confirmed. Remaining stock is derived from the
   seed minus the sum of allocations, so the ledger cannot drift, and releasing
   or replacing an allocation cannot leak or double-count a room.

   No payment, no personal data: an allocation is an invitation id, a product
   key and a number of units. Nothing else.
   ========================================================================== */

import { SEED, unitsFor, sellable } from './inventory-seed.js';

const ALLOC = 'alloc:';

export class Inventory {
  constructor(state) {
    this.state = state;
    this.sql = state.storage;
  }

  /* --- every allocation currently held, keyed by invitation ------------- */
  async allocations() {
    const map = await this.sql.list({ prefix: ALLOC });
    const out = {};
    for (const [k, v] of map) out[k.slice(ALLOC.length)] = v;
    return out;
  }

  /* --- derived remaining stock, the only place a total is computed ------ */
  async snapshot(exceptInvitation) {
    const allocs = await this.allocations();
    const used = {};
    for (const [inv, rec] of Object.entries(allocs)) {
      if (exceptInvitation && inv === exceptInvitation) continue;
      for (const line of rec.lines || []) {
        used[line.key] = (used[line.key] || 0) + line.units;
      }
    }
    const items = {};
    for (const key of Object.keys(SEED)) {
      const s = SEED[key];
      const cap = sellable(key);
      const taken = used[key] || 0;
      items[key] = {
        unit: s.unit,
        occupancy: s.occupancy || null,
        capacity: s.capacity,
        held: s.held || 0,
        heldFor: s.heldFor || null,
        allocated: taken,
        remaining: Math.max(0, cap - taken),
        soldOut: cap - taken <= 0,
        name: s.name
      };
    }
    return { items, allocations: Object.keys(allocs).length };
  }

  async fetch(request) {
    const url = new URL(request.url);
    const op = url.pathname.replace(/^.*\/api\/inventory\/?/, '') || 'read';

    if (op === 'read') {
      const snap = await this.snapshot(null);
      return json({ ok: true, ...snap });
    }

    if (op === 'reserve') {
      const body = await safeJson(request);
      const invitationId = String((body && body.invitationId) || '').trim();
      const lines = Array.isArray(body && body.lines) ? body.lines : null;
      if (!invitationId || !lines) return json({ ok: false, error: 'invalid reservation' }, 400);

      /* the whole decision happens inside one turn of this object: nothing
       * else can read or write the ledger between the check and the write. */
      return await this.state.blockConcurrencyWhile(async () => {
        /* an invitation re-submitting replaces its OWN allocation, so its
         * existing rooms are not counted against it a second time */
        const snap = await this.snapshot(invitationId);

        const want = [];
        for (const l of lines) {
          const key = String(l.win || '') + '/' + String(l.slug || '');
          if (!SEED[key]) continue;                    /* not stock-controlled */
          const units = unitsFor(key, l.qty || 1);
          const at = want.find((w) => w.key === key);
          if (at) at.units += units; else want.push({ key: key, units: units, qty: l.qty || 1 });
        }

        const conflicts = want
          .filter((w) => w.units > snap.items[w.key].remaining)
          .map((w) => ({
            key: w.key,
            name: SEED[w.key].name,
            unit: SEED[w.key].unit,
            wanted: w.units,
            remaining: snap.items[w.key].remaining,
            heldFor: SEED[w.key].heldFor || null
          }));

        if (conflicts.length) {
          const after = await this.snapshot(null);
          return json({ ok: false, error: 'sold out', conflicts, ...after }, 409);
        }

        const record = { invitationId, lines: want, at: new Date().toISOString() };
        await this.sql.put(ALLOC + invitationId, record);
        const after = await this.snapshot(null);
        return json({ ok: true, reserved: want, ...after });
      });
    }

    if (op === 'release') {
      const body = await safeJson(request);
      const invitationId = String((body && body.invitationId) || '').trim();
      if (!invitationId) return json({ ok: false, error: 'invalid release' }, 400);
      return await this.state.blockConcurrencyWhile(async () => {
        await this.sql.delete(ALLOC + invitationId);
        const after = await this.snapshot(null);
        return json({ ok: true, released: invitationId, ...after });
      });
    }

    if (op === 'mine') {
      const invitationId = url.searchParams.get('invitationId') || '';
      const rec = invitationId ? await this.sql.get(ALLOC + invitationId) : null;
      return json({ ok: true, allocation: rec || null });
    }

    return json({ ok: false, error: 'unknown inventory operation' }, 404);
  }
}

async function safeJson(request) {
  try { return await request.json(); } catch (e) { return null; }
}
function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
