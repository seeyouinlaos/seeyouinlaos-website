'use strict';
/**
 * Persistence for server-side price tracking (the scheduled cron writes here).
 *
 * Uses Netlify Blobs when available (zero-config on Netlify, no external DB).
 * Falls back to an in-memory map when Blobs isn't present (e.g. local `node`
 * without the Netlify runtime) so the code never hard-crashes during dev/tests.
 * @netlify/blobs is ESM-only, so it is loaded via dynamic import from CommonJS.
 */

let _blobs = null;       // cached store instances by name
const _memory = new Map(); // fallback: key -> value

async function _store(name) {
  if (_blobs && _blobs[name]) return _blobs[name];
  try {
    const mod = await import('@netlify/blobs');
    const store = mod.getStore(name);
    _blobs = _blobs || {};
    _blobs[name] = store;
    return store;
  } catch (_e) {
    return null; // fall back to memory
  }
}

async function _getJSON(name, key) {
  const s = await _store(name);
  if (s) { const v = await s.get(key, { type: 'json' }); return v ?? null; }
  const v = _memory.get(`${name}:${key}`);
  return v === undefined ? null : v;
}
async function _setJSON(name, key, value) {
  const s = await _store(name);
  if (s) { await s.setJSON(key, value); return; }
  _memory.set(`${name}:${key}`, value);
}
async function _list(name) {
  const s = await _store(name);
  if (s) { const { blobs } = await s.list(); return blobs.map((b) => b.key); }
  return [...Array.from(_memory.keys())]
    .filter((k) => k.startsWith(`${name}:`))
    .map((k) => k.slice(name.length + 1));
}

/* ---- trips (strategies the guest asked us to monitor) ---- */
async function saveTrip(trip) {
  if (!trip || !trip.id) throw new Error('trip.id required');
  await _setJSON('trips', trip.id, { ...trip, updatedAt: new Date().toISOString() });
  return trip.id;
}
async function getTrip(id) { return _getJSON('trips', id); }
async function listTrips() {
  const ids = await _list('trips');
  const out = [];
  for (const id of ids) { const t = await _getJSON('trips', id); if (t) out.push(t); }
  return out;
}
async function deleteTrip(id) {
  const s = await _store('trips');
  if (s) { await s.delete(id); return; }
  _memory.delete(`trips:${id}`);
}

/* ---- price history (append-only snapshots per trip) ---- */
async function appendSnapshot(tripId, snapshot) {
  const key = tripId;
  const hist = (await _getJSON('history', key)) || [];
  // one snapshot per calendar day: replace same-day, else append
  const day = snapshot.date;
  const next = hist.filter((h) => h.date !== day).concat([snapshot]);
  next.sort((a, b) => a.date.localeCompare(b.date));
  await _setJSON('history', key, next);
  return next.length;
}
async function getHistory(tripId) { return (await _getJSON('history', tripId)) || []; }

module.exports = { saveTrip, getTrip, listTrips, deleteTrip, appendSnapshot, getHistory };
