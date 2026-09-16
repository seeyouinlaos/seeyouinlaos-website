/* ============================================================================
   ACCOMMODATION INVENTORY RECONCILIATION (Owner, 16 Sep 2026) — machine-readable.

   For EVERY accommodation category: the Operations Master (rooms / status),
   the canonical server model (src/inventory-seed.js → src/rooms.js unitsOf),
   the deployed engine (Guest Relations plan: every physical room with its
   occupants), the guest view (what /api/rooms/read answers one guest) and the
   words the client renders from that view (assets/rooms.js — the same code the
   browser runs). Assertions per category:
     canonical rooms   = the Master's physical rooms (Penthouse: A – F, A the hosts')
     reserved rooms    = the Master's Status (Reserved for …)
     live engine rooms = canonical rooms (no Room G, nothing invented)
     rendered rooms    ≤ canonical rooms   (the guest view never shows more)
     available         = open rooms with a place left · unused places (reserved never counted)
     UI state          = API state (the words are derived from the same units)
   Prints no code, no bearer, no token. Names stay in the private plan only.

     node docs/acceptance/2026-09-16-inventory/reconcile.mjs <origin> <outDir>
   (needs src/gr-token.private.txt and src/invitation-tokens.private.csv; GUEST=G001)
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED } from '../../../src/inventory-seed.js';
import { unitsOf } from '../../../src/rooms.js';
import { bearerOf } from '../../../register/crypto.mjs';
import { page } from '../../../test/sandbox.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const O = (process.argv[2] || 'https://seeyouinlaos-website.suthep-hrg.workers.dev').replace(/\/$/, ''), OUT = process.argv[3] || HERE;
const GUEST = process.env.GUEST || 'G001';   /* a guest, not a host: the guest-facing states */
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code for ' + id); return r[5]; };
const GR = process.env.GR_TOKEN || fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim();
const master = JSON.parse(fs.readFileSync(path.join(HERE, 'master-accommodation.json'), 'utf8')).rows;
const M = (col) => master.find((r) => r.col === col);

/* the Master column behind each canonical category (both Souphattra windows read the same rows) */
const SOURCE = {
  'bkk-stay/penthouse': { col: 1, physical: 6, note: 'the Owner: six physical rooms A – F, Room A the hosts\' (reserved), the Master\'s 5 = bookable rooms' },
  'bkk-stay/u-sathorn-superior-garden': { col: 2 }, 'bkk-stay/shama-king-studio-balcony': { col: 3 },
  'prewed/heritage': { col: 5 }, 'prewed/heritage-executive': { col: 6 }, 'prewed/heritage-grand-premier': { col: 7 }, 'prewed/noble-courtyard': { col: 8 }, 'prewed/grand-majestic': { col: 9 }, 'prewed/souphattra-majestic': { col: 10 }, 'prewed/souphattra-presidential': { col: 11 },
  'wedstay/heritage': { col: 5 }, 'wedstay/heritage-executive': { col: 6 }, 'wedstay/heritage-grand-premier': { col: 7 }, 'wedstay/noble-courtyard': { col: 8 }, 'wedstay/grand-majestic': { col: 9 }, 'wedstay/souphattra-majestic': { col: 10 }, 'wedstay/souphattra-presidential': { col: 11 },
  'airbnb-2br/private-residence': { col: null, physical: 1, places: 6, note: 'not an Accommodation_Details column — the Owner (16 Sep 2026): one property, capacity 6 guests, no invented rooms' },
  'kmg/light-french': { col: 14 }, 'kmg/milano': { col: 15 }, 'kmg/italian': { col: 16 }, 'kmg/junting': { col: 17 }, 'kmg/mid-century': { col: 18 }, 'kmg/standard-single': { col: 19 }, 'kmg/solarium': { col: 20 }, 'kmg/smart-family': { col: 21 }, 'kmg/family-suite': { col: 22 }, 'kmg/seine': { col: 23 }, 'kmg/penang': { col: 24 }, 'kmg/left-bank': { col: 25 },
  'ljg/snow-mountain-viewing': { col: 27 }, 'ljg/viewing-270': { col: 28 }, 'ljg/private-courtyard-270': { col: 29 }, 'ljg/soup-pool-270': { col: 30 }, 'ljg/manor-suite': { col: 31 }, 'ljg/view-suite-270': { col: 32 }, 'ljg/private-soup-view': { col: 33 }, 'ljg/boundless': { col: 34 }, 'ljg/starry-sky': { col: 35 },
  'kempinski/deluxe-balcony-king': { col: 37 },
};
const STAY = { 'bkk-stay': 'BANGKOK (Sathorn Penthouse · U Sathorn · Shama)', prewed: 'SOUPHATTRA · pre-wedding window', wedstay: 'SOUPHATTRA · wedding window', 'airbnb-2br': 'PRIVATE RESIDENCE', kmg: 'KUNMING', ljg: 'LIJIANG', kempinski: 'SIAM KEMPINSKI' };
const reservedFor = (status) => /Bride/i.test(status) ? 'Bride & Groom' : /Famil/i.test(status) ? 'Family' : null;

const plan = await (await fetch(O + '/api/rooms/plan', { headers: { 'x-gr-token': GR } })).json();
if (!plan.ok) throw new Error('plan unreadable');
const bearer = await bearerOf(tok(GUEST));
const view = await (await fetch(O + '/api/rooms/read', { headers: { 'x-siyl-auth': bearer } })).json();
if (!view.ok) throw new Error('view unreadable');
const anon = await (await fetch(O + '/api/rooms/read')).json();
/* the client model, exactly as the browser runs it, over the live guest view */
const sb = page({ auth: { invitationId: 'INV-' + GUEST, guestId: GUEST, partyId: 'INV-' + GUEST, bearer: 'x', hosts: false } });
const U = sb.window.SIYL_UNITS; U._set(view);

const out = [], failures = [];
for (const key of Object.keys(SEED)) {
  const s = SEED[key], src = SOURCE[key]; if (!src) { failures.push(key + ': no Master source mapped'); continue; }
  const m = src.col ? M(src.col) : null;
  const physical = src.physical != null ? src.physical : m.roomsAvailable;
  const rFor = m ? reservedFor(m.status) : null;
  const sourceReserved = rFor ? (key === 'bkk-stay/penthouse' ? 1 : m.roomsAvailable) : (key === 'bkk-stay/penthouse' ? physical - m.roomsAvailable : 0);
  const sourceReservedFor = key === 'bkk-stay/penthouse' ? 'Bride & Groom' : rFor;
  const canonical = unitsOf(key), live = plan.units[key] || [], seen = view.units[key] || [], anonSeen = (anon.units || {})[key] || [];
  const [win, slug] = key.split('/');
  const canonicalPlaces = canonical.reduce((n, u) => n + u.places, 0);
  const reservedUnits = live.filter((u) => u.reservedFor), reservedPlaces = reservedUnits.reduce((n, u) => n + u.places, 0);
  const occupied = live.reduce((n, u) => n + (u.occupants || []).length, 0);
  const ownerOcc = reservedUnits.reduce((n, u) => n + (u.occupants || []).length, 0);
  const guestOcc = live.filter((u) => !u.reservedFor).reduce((n, u) => n + (u.occupants || []).length, 0);
  const open = live.filter((u) => !u.reservedFor);
  const remainingPlaces = open.reduce((n, u) => n + Math.max(0, u.places - (u.occupants || []).length), 0);
  const remainingRooms = open.filter((u) => u.places - (u.occupants || []).length > 0).length;
  const ui = U.label(win, slug), fits = U.fits(win, slug), cnt = U.count(win, slug);
  const api = view.summary[key];
  const uiUnits = seen.map((u) => u.reservedFor && !u.eligible ? u.label + ':RESERVED' : (u.full ? u.label + ':FULL' : u.label + ':' + u.free));
  const row = {
    stay: STAY[win], window: win, category: s.name, key,
    source: { column: src.col, masterRooms: m ? m.roomsAvailable : null, masterStatus: m ? m.status : null, physicalRooms: physical, places: src.places || (physical * (s.occupancy === 1 ? 1 : 2)), reservedRooms: sourceReserved, reservedFor: sourceReservedFor, note: src.note || null },
    canonical: { rooms: canonical.length, places: canonicalPlaces, reserved: canonical.filter((u) => u.reservedFor).length, reservedFor: s.heldFor || null, labels: canonical.map((u) => u.label).join('') },
    live: { rooms: live.length, places: live.reduce((n, u) => n + u.places, 0), reservedRooms: reservedUnits.length, reservedPlaces, ownerOccupied: ownerOcc, guestOccupied: guestOcc, occupied, remainingRooms, remainingPlaces, perRoom: live.map((u) => u.label + ':' + (u.reservedFor ? 'RESERVED(' + u.reservedFor + ')' : '') + (u.occupants || []).length + '/' + u.places) },
    guestView: { rooms: seen.length, roomsAnonymous: anonSeen.length, rooms: uiUnits, api: { units: api.units, places: api.places, reserved: api.reserved, rooms: api.rooms, free: api.free }, uiWords: ui, chooseButton: fits, count: cnt },
    asserts: {},
  };
  const A = row.asserts;
  A.canonicalRoomsMatchMaster = canonical.length === physical;
  A.canonicalPlacesMatchMaster = canonicalPlaces === row.source.places;
  A.reservedMatchesMaster = row.canonical.reserved === sourceReserved && (sourceReserved === 0 || s.heldFor === sourceReservedFor);
  A.liveRoomsEqualCanonical = live.length === canonical.length && live.map((u) => u.label).join('') === row.canonical.labels;
  A.liveReservedEqualCanonical = reservedUnits.length === row.canonical.reserved;
  A.renderedRoomsLteCanonical = seen.length <= canonical.length && anonSeen.length <= canonical.length;
  /* no invented room: every live / rendered label is one of the canonical labels (the Penthouse: exactly A – F, no Room G) */
  const canonLabels = new Set(canonical.map((u) => u.label));
  A.noInventedRoom = live.every((u) => canonLabels.has(u.label)) && seen.every((u) => canonLabels.has(u.label)) && (key !== 'bkk-stay/penthouse' || (live.map((u) => u.label).join('') === 'ABCDEF' && !seen.some((u) => u.label === 'G')));
  A.apiAvailabilityFromOpenUnits = api.units === live.length && api.reserved === reservedUnits.length && api.free === remainingPlaces && api.rooms === remainingRooms;
  /* YOUR ROOM: when this guest holds a place here the words name exactly the room the plan shows them in */
  const mineHere = view.mine && view.mine[win] && view.mine[win].key === key ? view.mine[win].label : null;
  const planMine = live.filter((u) => (u.occupants || []).some((o) => o.guestId === GUEST)).map((u) => u.label);
  row.guestView.yourRoom = mineHere ? U.unitName(seen.find((u) => u.label === mineHere)) : null;
  A.yourRoomIsThePersistedRoom = (mineHere || null) === (planMine[0] || null);
  A.uiWordsMatchApi = mineHere ? ui === 'Your place is held · ' + U.unitName(seen.find((u) => u.label === mineHere)) : (remainingPlaces === 0 ? (reservedUnits.length === live.length ? ui === 'Reserved · ' + sourceReservedFor : ui === 'Fully booked') : ui.endsWith(remainingPlaces === 1 ? '1 place available' : remainingPlaces + ' places available') && (s.unit === 'guest' || ui.startsWith(remainingRooms === 1 ? '1 room' : remainingRooms + ' rooms')));
  A.chooseOnlyWhenAvailable = fits === (remainingPlaces > 0);
  row.ok = Object.values(A).every(Boolean);
  if (!row.ok) failures.push(key + ': ' + Object.entries(A).filter(([, v]) => !v).map(([k]) => k).join(', '));
  out.push(row);
}
/* the reserved rooms hold nobody but the hosts (a Family room: nobody) — proven by the guest ids on the plan against the register's hosts flag */
const index = JSON.parse(fs.readFileSync(path.join(ROOT, 'register/auth-index.json'), 'utf8'));
const hostIds = new Set(Object.values(index.entries).filter((e) => e.h === 1).map((e) => e.g));
for (const row of out) {
  const live = plan.units[row.key] || [];
  const bad = live.filter((u) => u.reservedFor).flatMap((u) => (u.occupants || []).filter((o) => u.reservedFor !== 'Bride & Groom' || !hostIds.has(o.guestId)).map((o) => u.label));
  row.asserts.noGuestInReservedRoom = bad.length === 0; if (bad.length) { row.ok = false; failures.push(row.key + ': a non-host occupies reserved room ' + bad.join(',')); }
}
const totals = { categories: out.length, canonicalRooms: out.reduce((n, r) => n + r.canonical.rooms, 0), canonicalPlaces: out.reduce((n, r) => n + r.canonical.places, 0), reservedRooms: out.reduce((n, r) => n + r.canonical.reserved, 0), occupied: out.reduce((n, r) => n + r.live.occupied, 0), remainingPlaces: out.reduce((n, r) => n + r.live.remainingPlaces, 0) };
const result = { at: new Date().toISOString(), origin: O, guestView: GUEST, totals, ok: failures.length === 0, failures, categories: out };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'reconciliation.json'), JSON.stringify(result, null, 1));
const pad = (v, n) => String(v).padEnd(n);
const lines = [pad('KEY', 34) + pad('MASTER', 8) + pad('STATUS', 26) + pad('CANON', 7) + pad('PLACES', 8) + pad('RSVD', 6) + pad('LIVE', 6) + pad('OCC', 5) + pad('AVAIL R/P', 11) + pad('UI', 34) + pad('CHOOSE', 8) + 'OK'];
for (const r of out) lines.push(pad(r.key, 34) + pad(r.source.masterRooms ?? '—', 8) + pad((r.source.masterStatus || 'Owner').slice(0, 24), 26) + pad(r.canonical.rooms, 7) + pad(r.canonical.places, 8) + pad(r.canonical.reserved, 6) + pad(r.live.rooms, 6) + pad(r.live.occupied, 5) + pad(r.live.remainingRooms + '/' + r.live.remainingPlaces, 11) + pad(r.guestView.uiWords.slice(0, 32), 34) + pad(r.guestView.chooseButton ? 'yes' : 'no', 8) + (r.ok ? 'PASS' : 'FAIL'));
lines.push('', 'TOTALS ' + JSON.stringify(totals), failures.length ? 'FAILURES:\n- ' + failures.join('\n- ') : 'ALL ASSERTIONS HOLD (' + out.length + ' categories)');
fs.writeFileSync(path.join(OUT, 'reconciliation.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));
process.exit(failures.length ? 1 : 0);
