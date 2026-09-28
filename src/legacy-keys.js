/* ============================================================================
   LEGACY → CANONICAL (Owner, 28 Sep 2026 · the Hotel Muse replacement): a product the website replaced is read as its
   successor, never dropped. The closing Bangkok stay was the Siam Kempinski's Deluxe Balcony King; it is now Hotel Muse
   Bangkok, Autograph Collection · the Jatu Room. A place, a Bag line, a sent record or a fingerprint that still names the
   former room is the SAME selection of the same stage (the stage id `kempinski` is internal and never shown):

     · the room engine reads a stored legacy hold as a hold of the canonical room — same guest, same unit, same time — and
       counts it once; the row is re-keyed only inside that guest's own write, never released and taken again
     · a Bag line of the former room loads as the Jatu Room line, priced by today's rules (a personal rate included)
     · a trip sent with the former room is not "changed" because the website renamed it (the fingerprint compares both forms)
     · every new write names the canonical key only; the legacy key is accepted as read / migration input and nothing else

   The client carries the same map (assets/pricing.js · LEGACY_ROOMS); test/legacy-muse.test.mjs keeps the two identical.
   ========================================================================== */
export const LEGACY_ROOM_KEYS = Object.freeze({ 'kempinski/deluxe-balcony-king': 'kempinski/jatu-room' });

/* the seed entry the former key had (for reading a record written under it — never for booking) */
export const LEGACY_SEED = Object.freeze({ 'kempinski/deluxe-balcony-king': Object.freeze({ unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Deluxe Balcony King' }) });

/* a Bag line's window + room: the former stay key and room slug, and what they are now */
const LINES = Object.freeze({ kempinski: Object.freeze({ room: 'deluxe-balcony-king', stay: 'kempinski', toRoom: 'jatu-room', toStay: 'muse',
  name: 'Hotel Muse Bangkok, Autograph Collection', meta: '6 – 8 March 2027 · Jatu Room', rate: 92.1, pay: 2, breakfast: 'Breakfast not included' }) });

export const canonicalKey = (key) => LEGACY_ROOM_KEYS[key] || key;
export const isLegacyKey = (key) => Object.prototype.hasOwnProperty.call(LEGACY_ROOM_KEYS, key);

/* one Bag / record line in its canonical form (the same object when nothing is legacy). The key order is kept, so a line that
   was canonical already reads byte for byte as before. */
export function canonicalLine(l) {
  const m = l && typeof l === 'object' && LINES[l.id];
  if (!m || l.room !== m.room) return l;
  const out = {};
  for (const [k, v] of Object.entries(l)) out[k] = v;
  out.room = m.toRoom; out.stay = m.toStay;
  if ('name' in l) out.name = m.name;
  if ('meta' in l) out.meta = m.meta;
  if ('breakfast' in l) out.breakfast = m.breakfast;
  if ('img' in l) delete out.img;   /* the former hotel's frame is never shown; the page re-derives the line's own */
  if (!l.gift && !l.personal) { out.rate = m.rate; out.pay = m.pay; out.price = Math.round(m.rate * m.pay * 100) / 100; }
  return out;
}
export function canonicalLines(lines) { return Array.isArray(lines) ? lines.map(canonicalLine) : lines; }

/* ONLY to compare with a fingerprint taken before or after the replacement: the line / engine view in the other form. `dir`
   'legacy' writes the former room, 'canonical' the current one; nothing but the room, the stay and the view's naming changes. */
export function lineAs(l, dir) {
  const m = l && typeof l === 'object' && LINES[l.id];
  if (!m) return l;
  const from = dir === 'legacy' ? m.toRoom : m.room, to = dir === 'legacy' ? m.room : m.toRoom;
  if (l.room !== from) return l;
  const out = {};
  for (const [k, v] of Object.entries(l)) out[k] = k === 'room' ? to : k === 'stay' ? (dir === 'legacy' ? m.stay : m.toStay) : v;
  return out;
}
export function viewAs(v, dir, seed) {
  if (!v || typeof v !== 'object' || !v.key) return v;
  const to = dir === 'legacy' ? Object.keys(LEGACY_ROOM_KEYS).find((k) => LEGACY_ROOM_KEYS[k] === v.key) : LEGACY_ROOM_KEYS[v.key];
  if (!to) return v;
  const s = (seed && seed[to]) || LEGACY_SEED[to] || null;
  const out = {};
  for (const [k, x] of Object.entries(v)) out[k] = k === 'key' ? to : k === 'name' ? (s ? s.name : to) : k === 'stay' ? (s && s.stay ? s.stay : null) : x;
  return out;
}

/* ============================================================================
   THE CLOSING HOTEL — SOURCE NORMALISATION (Owner decision, 28 Sep 2026 · ABSOLUTE)
   The guests' hotel for 6 – 8 March 2027 is Hotel Muse Bangkok, Autograph Collection · the Jatu Room. 002_Accommodation_Details
   says so; other tabs of the Operations Master (001_Overview_Hotel_Restaurant Day 14 – 16, 000_Master_Timeline, 003 contextual
   copy) may still name the Siam Kempinski as the hotel. Those are stale remnants: whatever a secondary source says, a hotel,
   check-in, check-out, hotel breakfast, overnight stay or transfer endpoint of these nights is Hotel Muse Bangkok.

   The Siam Kempinski survives ONLY as the physical location of two real venues the guests visit — ALATi (Sunday brunch) and
   Firefly Bar (drinks) — never as where they stay. Gate K1 (src/release-check.cjs) enforces this on every served source.
   ========================================================================== */
export const CLOSING_HOTEL = Object.freeze({ name: 'Hotel Muse Bangkok, Autograph Collection', room: 'Jatu Room', dates: '6 – 8 March 2027', stage: 'kempinski', key: 'kempinski/jatu-room' });
/* the only guest-facing Kempinski words: a venue's own location, on that venue's own record */
export const KEMPINSKI_VENUES = Object.freeze({ 'bkk-alati': 'Siam Kempinski Hotel Bangkok', 'bkk-firefly': 'Siam Kempinski Hotel Bangkok' });
/* a HOTEL value read from any source for the closing nights: a stale Kempinski value is Hotel Muse Bangkok; anything else as is */
export function closingHotel(value) {
  const v = String(value == null ? '' : value).trim();
  return !v || /kempinski/i.test(v) ? CLOSING_HOTEL.name : v;
}
/* a TRANSFER / itinerary line read from a secondary source (000_Master_Timeline): every Siam Kempinski HOTEL endpoint is Hotel
   Muse Bangkok — "Siam Kempinski - Bangkok-Suvarnabhumi (BKK)" is the checkout transfer from Hotel Muse. A line that names one of
   the two venues (ALATi, Firefly Bar) keeps its real location: going there is a trip to a venue, not to the hotel. */
export function closingTransfer(text) {
  const t = String(text == null ? '' : text);
  if (/\bALATi\b|\bFirefly\b/i.test(t)) return t;
  return t.replace(/(?:Hotel\s+)?Siam\s+Kempinski(?:\s+Hotel)?(?:\s+Bangkok)?|\bKempinski\b/gi, CLOSING_HOTEL.name);
}
