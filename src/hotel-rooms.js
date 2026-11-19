/* ============================================================================
   SEE YOU IN LAOS — THE SOUPHATTRA HERITAGE'S OWN ROOM NUMBERS (Owners, 18 / 19 Nov 2026).

   The hotel's official room list as the Owners supplied it (18 Nov 2026): building, room type, room number — 26 rooms under 27
   numbers, because the Souphattra Presidential Suite is ONE suite of the two rooms 210 and 211 (Owners, 19 Nov 2026). These are
   facts of the house, the same for everyone; they are NOT the room engine's labels. The engine's units (src/rooms.js) stay the
   allocation labels Room A, B, C … of each category; which unit is which hotel room is the Owners' ASSIGNMENT, kept in the room
   engine's own store (never in this public file — it says who sleeps where) and checked against this list by checkHotelRooms().

   ONE ROOM, ONE UNIT: a suite of two numbers is one booking unit, one room of the house, one room night of the hotel's purchase —
   never two rooms. Every count of rooms, places or cost is per unit; the numbers are only what the hotel calls it.

   PURE: no I/O, no names, no prices.
   ========================================================================== */

export const HOTEL_ROOMS_VERSION = 'hotel-rooms/1.0.0';
export const SOUPHATTRA = 'Souphattra Heritage Vientiane';

/* the official list (Souphattra_Heritage_Room_No., the Owners, 18 Nov 2026), in its own order; `suite` joins the numbers of one suite */
export const SOUPHATTRA_ROOMS = Object.freeze([
  ['101', 'B', 'Noble Courtyard Suite'],
  ['102', 'C', 'The Heritage'],
  ['103', 'C', 'Heritage Executive'],
  ['104', 'C', 'Heritage Executive'],
  ['105', 'C', 'The Heritage'],
  ['106', 'D', 'Heritage Executive (Twin)'],
  ['107', 'D', 'Heritage Executive'],
  ['108', 'D', 'Heritage Grand Premier'],
  ['109', 'E', 'Heritage Executive (No Bath tub)'],
  ['110', 'E', 'Heritage Executive (No Bath tub)'],
  ['201', 'B', 'Grand Majestic Suite'],
  ['202', 'C', 'The Heritage'],
  ['203', 'C', 'Heritage Executive'],
  ['204', 'C', 'Heritage Executive'],
  ['205', 'C', 'The Heritage'],
  ['206', 'D', 'Heritage Executive (Twin)'],
  ['207', 'D', 'Heritage Executive'],
  ['208', 'D', 'Heritage Grand Premier'],
  ['209', 'E', 'Grand Majestic Suite'],
  ['210', 'F', 'Souphattra Presidential', 'PRESIDENTIAL'],
  ['211', 'F', 'Souphattra Presidential', 'PRESIDENTIAL'],
  ['301', 'C', 'The Heritage'],
  ['302', 'C', 'Heritage Executive'],
  ['303', 'C', 'Souphattra Majestic Suite'],
  ['304', 'D', 'Heritage Executive (Twin)'],
  ['305', 'D', 'Heritage Executive'],
  ['306', 'D', 'Heritage Grand Premier'],
].map(([no, building, type, suite]) => Object.freeze({ no, building, type, ...(suite ? { suite } : {}) })));
const BY_NO = new Map(SOUPHATTRA_ROOMS.map((r) => [r.no, r]));

/* the engine's categories (the seed key without its window) → the official room types they are made of */
export const CATEGORY_TYPES = Object.freeze({
  'heritage': Object.freeze(['The Heritage']),
  'heritage-executive': Object.freeze(['Heritage Executive', 'Heritage Executive (Twin)', 'Heritage Executive (No Bath tub)']),
  'heritage-grand-premier': Object.freeze(['Heritage Grand Premier']),
  'noble-courtyard': Object.freeze(['Noble Courtyard Suite']),
  'grand-majestic': Object.freeze(['Grand Majestic Suite']),
  'souphattra-majestic': Object.freeze(['Souphattra Majestic Suite']),
  'souphattra-presidential': Object.freeze(['Souphattra Presidential']),
});
/* the windows the Souphattra is sold in — the same 26 rooms, twice (src/inventory-seed.js) */
export const SOUPHATTRA_WINDOWS = Object.freeze(['prewed', 'wedstay']);

const clean = (v) => (v == null ? '' : String(v)).trim();
export const categoryOf = (key) => clean(key).split('/')[1] || '';
export const windowOf = (key) => clean(key).split('/')[0] || '';
/** Is this seed key a Souphattra category the official list covers? */
export function isSouphattraKey(key) {
  return SOUPHATTRA_WINDOWS.includes(windowOf(key)) && Object.prototype.hasOwnProperty.call(CATEGORY_TYPES, categoryOf(key));
}
/** The rooms of one suite (['210', '211']) — or null for a number that is not part of a suite. */
export function suiteOf(no) {
  const r = BY_NO.get(clean(no));
  return r && r.suite ? SOUPHATTRA_ROOMS.filter((x) => x.suite === r.suite).map((x) => x.no) : null;
}
/** How many rooms (never numbers) a category holds in the official list: a suite counts once. */
export function roomsInCategory(category) {
  const types = CATEGORY_TYPES[category] || [];
  const list = SOUPHATTRA_ROOMS.filter((r) => types.includes(r.type));
  return new Set(list.map((r) => r.suite || r.no)).size;
}

/**
 * What a unit is in the house, from the Owners' stored assignment: { hotel, numbers, display, building, type, suite } — or null
 * where nothing is assigned (or the key is not the Souphattra's). `numbers` are the official ones, sorted; a suite reads
 * "210 + 211" and is still ONE room.
 */
export function hotelRoomOf(key, label, assigned) {
  if (!isSouphattraKey(key)) return null;
  const nos = assigned && assigned[clean(key) + '|' + clean(label).toUpperCase()];
  if (!Array.isArray(nos) || !nos.length) return null;
  const rows = nos.map((n) => BY_NO.get(clean(n))).filter(Boolean).sort((a, b) => a.no.localeCompare(b.no));
  if (rows.length !== nos.length) return null;
  const buildings = [...new Set(rows.map((r) => r.building))];
  return { hotel: SOUPHATTRA, numbers: rows.map((r) => r.no), display: rows.map((r) => r.no).join(' + '), building: buildings.join(' / '),
    type: rows[0].type, suite: !!rows[0].suite };
}

/**
 * The check every stored assignment passes before it is written — and the tests' check of this list against the seed:
 *   · a key is a Souphattra unit the engine has (unitsOf), the numbers official, of a type the category is made of;
 *   · a room of one number is ONE number; a suite is exactly ALL of its numbers, together (never 210 alone, never 211 alone);
 *   · within one window no number belongs to two units.
 * Returns { ok, problems: [{ unit, reason, text }] }.
 */
export function checkHotelRooms(assigned, unitsOf) {
  const problems = [];
  const used = {};
  for (const [unit, nos] of Object.entries(assigned || {})) {
    const i = unit.lastIndexOf('|'), key = unit.slice(0, i), label = unit.slice(i + 1);
    if (i < 1 || !isSouphattraKey(key)) { problems.push({ unit, reason: 'NOT_SOUPHATTRA', text: 'not a Souphattra room category' }); continue; }
    if (typeof unitsOf === 'function' && !unitsOf(key).some((u) => u.label === label)) { problems.push({ unit, reason: 'UNKNOWN_UNIT', text: 'the engine has no Room ' + label + ' here' }); continue; }
    if (!Array.isArray(nos) || !nos.length || nos.some((n) => typeof n !== 'string')) { problems.push({ unit, reason: 'INVALID', text: 'numbers must be a list of room numbers' }); continue; }
    const rows = nos.map((n) => BY_NO.get(clean(n)));
    if (rows.some((r) => !r)) { problems.push({ unit, reason: 'UNKNOWN_NUMBER', text: nos.filter((n, j) => !rows[j]).join(', ') + ' is not on the official list' }); continue; }
    if (new Set(nos).size !== nos.length) { problems.push({ unit, reason: 'INVALID', text: 'a number twice' }); continue; }
    const types = CATEGORY_TYPES[categoryOf(key)];
    if (rows.some((r) => !types.includes(r.type))) { problems.push({ unit, reason: 'WRONG_TYPE', text: rows.filter((r) => !types.includes(r.type)).map((r) => r.no + ' is ' + r.type).join(', ') }); continue; }
    const suite = rows[0].suite ? suiteOf(rows[0].no) : null;
    if (suite ? (nos.length !== suite.length || !suite.every((n) => nos.includes(n))) : (nos.length !== 1 || rows.some((r) => r.suite))) {
      problems.push({ unit, reason: 'SUITE', text: suite ? 'the suite is ' + suite.join(' + ') + ' together — one unit' : 'one room is one number' }); continue;
    }
    const w = windowOf(key);
    for (const n of nos) {
      const at = (used[w] = used[w] || {})[n];
      if (at && at !== unit) problems.push({ unit, reason: 'TWICE', text: n + ' is already ' + at.split('|')[1] + ' of ' + categoryOf(at.split('|')[0]) + ' in the same window' });
      else used[w][n] = unit;
    }
  }
  return { ok: problems.length === 0, problems };
}
