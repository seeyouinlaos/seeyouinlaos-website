'use strict';
/**
 * Persistence for server-side price tracking (the scheduled cron writes here).
 *
 * Backed by a Cloudflare KV namespace (bound as `env.KV`). Zero external DB.
 * `createStore(kv)` returns the store bound to that namespace; when no KV binding
 * is present (local `wrangler dev` without KV, or unit tests) it falls back to an
 * in-memory map so nothing hard-crashes.
 *
 * Key scheme:  trip:<id>    → the monitored strategy
 *              hist:<id>    → append-only array of daily price snapshots
 *              route:<key>  → append-only market snapshots for a monitored route
 */

function createStore(kv) {
  const mem = createStore._mem || (createStore._mem = new Map());

  async function getJSON(key) {
    if (kv) return (await kv.get(key, { type: 'json' })) ?? null;
    return mem.has(key) ? mem.get(key) : null;
  }
  async function setJSON(key, value) {
    if (kv) { await kv.put(key, JSON.stringify(value)); return; }
    mem.set(key, value);
  }
  async function del(key) {
    if (kv) { await kv.delete(key); return; }
    mem.delete(key);
  }
  async function listKeys(prefix) {
    if (kv) {
      const out = [];
      let cursor;
      do {
        const res = await kv.list({ prefix, cursor });
        res.keys.forEach((k) => out.push(k.name));
        cursor = res.list_complete ? undefined : res.cursor;
      } while (cursor);
      return out;
    }
    return [...mem.keys()].filter((k) => k.startsWith(prefix));
  }

  return {
    /* ---- trips ---- */
    async saveTrip(trip) {
      if (!trip || !trip.id) throw new Error('trip.id required');
      await setJSON(`trip:${trip.id}`, { ...trip, updatedAt: new Date().toISOString() });
      return trip.id;
    },
    getTrip(id) { return getJSON(`trip:${id}`); },
    async listTrips() {
      const keys = await listKeys('trip:');
      const out = [];
      for (const k of keys) { const t = await getJSON(k); if (t) out.push(t); }
      return out;
    },
    deleteTrip(id) { return del(`trip:${id}`); },

    /* ---- price history (append-only, one snapshot per calendar day) ---- */
    async appendSnapshot(tripId, snapshot) {
      const key = `hist:${tripId}`;
      const hist = (await getJSON(key)) || [];
      const next = hist.filter((h) => h.date !== snapshot.date).concat([snapshot]);
      next.sort((a, b) => a.date.localeCompare(b.date));
      await setJSON(key, next);
      return next.length;
    },
    async getHistory(tripId) { return (await getJSON(`hist:${tripId}`)) || []; },

    /* ---- monitored-route market history (one snapshot per calendar day) ----
       A snapshot is { date, ts, price, currency, offers, provider }. Kept to the
       last MAX_ROUTE_SNAPSHOTS days so a route's series stays bounded in KV. */
    async appendRouteSnapshot(key, snapshot) {
      const k = `route:${key}`;
      const hist = (await getJSON(k)) || [];
      const next = hist.filter((h) => h.date !== snapshot.date).concat([snapshot]);
      next.sort((a, b) => a.date.localeCompare(b.date));
      const trimmed = next.slice(-MAX_ROUTE_SNAPSHOTS);
      await setJSON(k, trimmed);
      return trimmed.length;
    },
    async getRouteSnapshots(key) { return (await getJSON(`route:${key}`)) || []; },

    /* ---- generic cache (used by the FX rate cache; honours KV TTL) ---- */
    async getKV(key) { return getJSON(key); },
    async setKV(key, value, ttlSeconds) {
      if (kv) { await kv.put(key, JSON.stringify(value), ttlSeconds ? { expirationTtl: Math.max(60, ttlSeconds) } : undefined); return; }
      mem.set(key, value);
    },
  };
}

const MAX_ROUTE_SNAPSHOTS = 40;

module.exports = { createStore };
