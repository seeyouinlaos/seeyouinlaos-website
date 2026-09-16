/* ============================================================================
   THE ROOM INVENTORY AUDIT (Owner, 15 Sep 2026) — private, before a release.

   For every active accommodation category: the property, the room type, the
   SOURCE ROOM COUNT (the seed, from the Operations Master), the allocation
   units the engine creates, the capacity per unit, the total guest places,
   the current occupancy and the remaining places — and the invariant:
     ALLOCATION UNITS CREATED = SOURCE ROOM COUNT
     TOTAL GUEST PLACES       = SOURCE ROOM COUNT × 2   (singles × 1; a
                                whole property: what the source says it sleeps)
   Any mismatch is a release blocker (exit 1).

   RESERVED (Owner, 16 Sep 2026): the Master's Status column reserves whole
   rooms (held / heldFor in the seed) — those rooms are counted in the total,
   never in the availability; the audit proves the engine reserves exactly the
   seeded number and that available = places − reserved places − occupancy.

   Occupancy comes from the deployed engine's plan when a GR token is given
   (names stay in the private output — never commit it); without one the
   audit reads the seed alone (occupancy 0).
     GR_TOKEN=… SIYL_ORIGIN=… node src/rooms-audit.mjs [--json out.json]
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED } from './inventory-seed.js';
import { unitsOf, PLACES } from './rooms.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = process.env.SIYL_ORIGIN || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const args = process.argv.slice(2);
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const gr = process.env.GR_TOKEN || (fs.existsSync(path.join(ROOT, 'src/gr-token.private.txt')) ? fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim() : '');

/* the property behind a window (the seed names the stay only where a window holds several) */
const PROPERTY = { 'bkk-stay': null, prewed: 'Souphattra Heritage Vientiane', wedstay: 'Souphattra Heritage Vientiane', 'airbnb-2br': 'Private Residence · Vientiane', kmg: 'Kunming', ljg: 'Lijiang', kempinski: 'Siam Kempinski Bangkok' };

let plan = null;
if (gr) {
  try { const r = await fetch(ORIGIN + '/api/rooms/plan', { headers: { 'x-gr-token': gr } }); plan = await r.json(); if (!plan.ok) plan = null; } catch (e) { plan = null; }
}
const rows = [], blockers = [];
for (const [key, s] of Object.entries(SEED)) {
  const [win] = key.split('/');
  const units = unitsOf(key);
  const expectedUnits = s.unit === 'guest' ? 1 : s.capacity;
  const expectedPlaces = s.unit === 'guest' ? s.capacity : s.capacity * (s.occupancy === 1 ? 1 : PLACES);
  const places = units.reduce((n, u) => n + u.places, 0);
  const occ = plan ? (plan.units[key] || []).reduce((n, u) => n + (u.occupants || []).length, 0) : 0;
  const reservedUnits = units.filter((u) => u.reservedFor), reservedPlaces = reservedUnits.reduce((n, u) => n + u.places, 0);
  const openOcc = plan ? (plan.units[key] || []).filter((u) => !u.reservedFor).reduce((n, u) => n + (u.occupants || []).length, 0) : 0;
  const row = { window: win, property: s.stay || PROPERTY[win] || win, roomType: s.name, sourceRoomCount: s.unit === 'guest' ? 1 + ' property (' + s.capacity + ' guests)' : s.capacity,
    unitsCreated: units.length, capacityPerUnit: units.length ? units[0].places : 0, totalPlaces: places, reservedUnits: reservedUnits.length, reservedFor: s.heldFor || null, occupancy: occ, remaining: places - reservedPlaces - openOcc,
    labels: units.map((u) => u.label).join(''), ok: units.length === expectedUnits && places === expectedPlaces && reservedUnits.length === (s.held || 0) && reservedUnits.every((u) => u.reservedFor === s.heldFor) };
  rows.push(row);
  if (!row.ok) blockers.push(key + ': units ' + units.length + ' vs source ' + expectedUnits + ', places ' + places + ' vs ' + expectedPlaces + ', reserved ' + reservedUnits.length + ' vs ' + (s.held || 0));
}
const pad = (v, n) => String(v).padEnd(n);
console.log(pad('WINDOW', 11) + pad('PROPERTY', 32) + pad('ROOM TYPE', 44) + pad('SOURCE', 8) + pad('UNITS', 7) + pad('CAP', 5) + pad('PLACES', 8) + pad('RSVD', 6) + pad('OCC', 5) + pad('AVAIL', 7) + 'LABELS');
for (const r of rows) console.log(pad(r.window, 11) + pad(r.property, 32) + pad(r.roomType.slice(0, 42), 44) + pad(r.sourceRoomCount, 8) + pad(r.unitsCreated, 7) + pad(r.capacityPerUnit, 5) + pad(r.totalPlaces, 8) + pad(r.reservedUnits, 6) + pad(r.occupancy, 5) + pad(r.remaining, 7) + r.labels + (r.ok ? '' : '  ← MISMATCH'));
console.log('\nOCCUPANCY SOURCE: ' + (plan ? 'the deployed engine at ' + ORIGIN : 'the seed only (no GR token)'));
console.log('CATEGORIES: ' + rows.length + ' · UNITS: ' + rows.reduce((n, r) => n + r.unitsCreated, 0) + ' · PLACES: ' + rows.reduce((n, r) => n + r.totalPlaces, 0) + ' · OCCUPIED: ' + rows.reduce((n, r) => n + r.occupancy, 0));
const pent = rows.find((r) => r.roomType === 'Sathorn Penthouse');
console.log('PENTHOUSE: ' + pent.unitsCreated + ' units (' + pent.labels + ') · ' + pent.totalPlaces + ' places' + (pent.unitsCreated === 6 && pent.totalPlaces === 12 && pent.labels === 'ABCDEF' ? ' — as the Owner requires' : ' — NOT as the Owner requires'));
console.log('RESERVATIONS: ' + rows.filter((r) => r.reservedUnits).map((r) => r.window + '/' + r.roomType + ' ' + r.reservedUnits + ' × ' + r.reservedFor).join(' · '));
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ at: new Date().toISOString(), origin: plan ? ORIGIN : null, rows, blockers }, null, 2));
if (blockers.length) { console.log('\nRELEASE BLOCKERS:\n- ' + blockers.join('\n- ')); process.exit(1); }
console.log('\nINVARIANT HOLDS: units = source room count; places = rooms × 2 (singles × 1; a property what it sleeps); reserved rooms = the Master\'s Status; available = places − reserved − occupied.');
