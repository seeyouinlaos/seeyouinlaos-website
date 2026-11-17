/* ============================================================================
   H&S WEDDING 2027 — WHICH BUDGET LINE MEETS WHICH GUEST SERVICE (billing-budget/1.0.0 · Owners, 15 Nov 2026)

   Reviewed integration metadata for the comparison on the Revenue tab — NO amount, NO rate, NO person. The 004 budget
   is free text written by the Owners; these rules say how a line is read, and every reading the comparison makes is
   shown to the Owners next to the figure it produces (src/billing/budget.js). A line no rule reads is listed as a
   budget line without a guest service, under its own 004 category — never dropped, never guessed into a stay.

   STAGES   — the place or route a 002 Package stands for (a label only: the period always comes from 002).
   RULES    — a 004 line (its Category + the words of its Item) → the stage(s) it may belong to; the line's own
              "Date or period" then picks the stage whose 002 window contains it.
                whose:  GUEST_SERVICE — the line buys the guests' rooms or seats;
                        UNSTATED      — the line does not say whose place it is (listed, never compared);
                        BY_SCOPE      — decided by the room-category words of its Details (ROOM_SCOPES): "All
                                        Categories" = every room of the hotel, a named category = that category;
                                        no such words = UNSTATED.
                        A line that NAMES PERSONS (personNamed) is always that person's own place or ticket — the
                        hosts' or their staff's — and never a guest's cost, price or quantity (assumption A-2).
                model:  ROOM_BLOCK — rooms for nights: the cost is the line's Budget USD as stated (all its rooms, booked
                                     or not), never re-priced by the booked rooms, never split per room;
                        FLAT       — one booking (a rented house, a vehicle): its Budget USD as stated, once;
                        PER_UNIT   — Rate USD × the booked tickets or places (one rate per service).
   VENDORS  — a 007 supplier column → the stages it supplies (its contract and payments are shown there, at the level
              of the supplier, never split between stays).
   ========================================================================== */

export const BUDGET_MAP_VERSION = 'budget-map/1.0.0';

export const STAGES = Object.freeze({
  A2: { place: 'U Sathorn Bangkok' },
  B: { place: 'Night train Bangkok → Nong Khai, van to Vientiane', services: ['Train', 'Van'] },
  C: { place: 'Souphattra Heritage Vientiane' },
  D1: { place: 'Souphattra Heritage Vientiane · wedding stay' },
  D2: { place: 'Guest House' },
  E2: { place: 'Flight Vientiane → Kunming' },
  F: { place: 'Yifangju Designer Courtyard, Kunming' },
  G: { place: 'Train Kunming → Lijiang', services: ['Train'] },
  H: { place: 'Luye Baisha, Lijiang' },
  I: { place: 'Flight Lijiang → Bangkok' },
  J: { place: 'Hotel Muse Bangkok' },
});

export const RULES = Object.freeze([
  { id: 'U-SATHORN', category: 'Accommodation', item: /^u\s*sathorn\b/i, stages: ['A2'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'SOUPHATTRA', category: 'Accommodation', item: /^souphattra\s+heritage\b/i, stages: ['C', 'D1'], whose: 'BY_SCOPE', model: 'ROOM_BLOCK' },
  { id: 'GUEST-HOUSE', category: 'Accommodation', item: /^guest\s*house\b/i, stages: ['D2'], whose: 'GUEST_SERVICE', model: 'FLAT' },
  { id: 'YIFANGJU', category: 'Accommodation', item: /^yifangju\b/i, stages: ['F'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'LUYE-BAISHA', category: 'Accommodation', item: /^luye\s+baisha\b/i, stages: ['H'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'MUSE', category: 'Accommodation', item: /^(hotel\s+)?muse\b/i, stages: ['J'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'TRAIN-BKK-NKI', category: 'Transportation', item: /^train\s+bangkok\s*-\s*nong\s*kh?ai\b/i, stages: ['B'], service: 'Train', whose: 'GUEST_SERVICE', model: 'PER_UNIT' },
  { id: 'VAN-NKI-VTE', category: 'Transportation', item: /^nong\s*kh?ai\s*-\s*souphattra\b/i, stages: ['B'], service: 'Van', whose: 'GUEST_SERVICE', model: 'FLAT' },
  /* the hotel's car service on the day of the van (B): whether it is the guests' transfer is the Owners' question */
  { id: 'TRANSPORT-SERVICE', category: 'Transportation', item: /^tran?s?portation\s+service\b/i, stages: ['B'], service: 'Van', whose: 'UNSTATED', model: 'FLAT' },
  { id: 'TRAIN-KMG-LJG', category: 'Transportation', item: /^train\s+kunming\s*-\s*lijiang\b/i, stages: ['G'], service: 'Train', whose: 'GUEST_SERVICE', model: 'PER_UNIT' },
  { id: 'FLIGHT-VTE-KMG', category: 'Transportation', item: /^flight\s+vientian\w*\s*-\s*kunming\b/i, stages: ['E2'], whose: 'UNSTATED', model: 'PER_UNIT' },
  { id: 'FLIGHT-LJG-BKK', category: 'Transportation', item: /^flight\s+lijiang\s*-\s*bangkok\b/i, stages: ['I'], whose: 'UNSTATED', model: 'PER_UNIT' },
]);

/* The room-category words of a 004 Details text; the same words matched against the 002 "Name" of each product of the
   stage give the products the line covers (most specific first; the first match decides). */
export const ROOM_SCOPES = Object.freeze([
  { words: /all\s+categor/i, all: true },
  { words: /heritage\s+grand\s+premier/i },
  { words: /heritage\s+executive/i },
  { words: /noble\s+courtyard/i },
  { words: /grand\s+majestic/i },
  { words: /souphattra\s+majestic/i },
  { words: /souphattra\s+presiden/i },
  { words: /\bthe\s+heritage\b/i },
]);

export const VENDORS = Object.freeze([
  { vendor: /^souphattra\s+heritage\b/i, stages: ['C', 'D1'] },
  { vendor: /^u\s*sathorn\b/i, stages: ['A2'] },
  { vendor: /^yifangju\b/i, stages: ['F'] },
  { vendor: /^luye\s+baisha\b/i, stages: ['H'] },
]);

/* words that end an Item after a comma without naming a person ("…, guests") */
const NOT_A_PERSON = /^(guests?|all|group|everyone|shared|total)$/i;

/** The persons a 004 line names (assumption A-2): "Item, Name" / "Item ,Name", or Details "(A & B…)" / "(A + B)".
    Returns their names as written (to be compared at run time with the billed guests' first names) — or [] . */
export function personNamed(line) {
  const out = [];
  const tail = /,\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*)\s*$/.exec(String(line && line.item || ''));
  if (tail && !NOT_A_PERSON.test(tail[1])) out.push(tail[1]);
  const paren = /\(([^()]*[&+][^()]*)\)/.exec(String(line && line.details || ''));
  if (paren) for (const w of paren[1].split(/[&+,]/)) { const n = w.trim().split(/\s+/)[0]; if (n && /^[A-Za-zÀ-ÿ]/.test(n) && !/^\d/.test(n) && !NOT_A_PERSON.test(n) && !/^nights?$/i.test(n)) out.push(n); }
  return out;
}

/** The scope a 004 Details text names: { all: true } | { words } | null. */
export function roomScopeOf(details) {
  const d = String(details || '');
  return ROOM_SCOPES.find((s) => s.words.test(d)) || null;
}
