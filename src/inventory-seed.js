/* ============================================================================
   SEE YOU IN LAOS — THE INVENTORY SEED.

   The physical stock of the journey, per PRODUCT WINDOW and ROOM CATEGORY,
   taken from the current H&S_Wedding_Operations_Master:
     · Accommodation_Details, row "Rooms avaible"  → how many of the category exist
     · Accommodation_Details, row "Pax"            → how many adults one unit sleeps
     · Accommodation_Details, row "Status"         → the categories already allocated
     · Budget_Room - Rate, column C "Amount"       → corroborates the Souphattra counts
       (5 + 13 + 3 + 1 + 2 + 1 + 1 = 26, and the tab header says "26 rooms")
     · Overview_Hotel_Restaurant, Day 05-02 / Day 07 → the complimentary residence
       is "limited to 6 persons"

   `unit` is what a guest consumes:
     'room'  — a category of physical rooms. A party of n guests consumes
               ceil(n / occupancy) rooms.
     'guest' — a whole-property or per-person product (the hosted residence,
               priced and held per person).

   NO RESERVATIONS, NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): `held` is 0
   everywhere and nothing is kept for anyone in advance — not for the Bride &
   Groom, not for the family. Every room of every category is bookable through
   the room engine by whoever chooses it first; the hosts start at zero like
   every guest.

   ROOM ALLOCATION (Owner, 15 Sep 2026): the physical room count IS the
   inventory. One physical room = one persistent allocation unit = two
   individual guest places (every room in the source sleeps two adults —
   Accommodation_Details "Pax"; the Light French Suite and the Snow Mountain
   Viewing Room included, final release 15 Sep 2026). Capacity is never a
   separate counter: it is units × places, and only real guest bookings
   consume it.

   The two Vientiane windows are SEPARATE stock: the same 26 physical rooms are
   sold twice, once for 25 – 27 February and once for 27 February – 1 March.

   This file is the ONLY place a number changes. Both the Durable Object and
   the test suite import it — there is no second copy anywhere.
   ========================================================================== */

/* NO FIXED ALLOCATION (Owner, 19 Sep 2026): the Room A preselection for the hosts came from planning data,
   never from a booking; it is deleted. Every guest — the hosts included — starts from zero and books like everyone else.
   `held` / `heldFor` on a seed entry are retired notes of the old category ledger; the room engine ignores them. */
export const FIXED = [];
export const SEED = {
  /* ---------------------------------------------------------- Bangkok, before */
  /* ONE approved Bangkok address holds the window (SHAMA YEN-AKAT BANGKOK IS DELETED — Owner, 24 Sep 2026: no stock, no card,
   * no price, no line; nothing replaces it); a guest holds a place in one of
   * them. The Master (Owner, 16 Sep 2026, 17:17 UTC): U Sathorn 6 rooms
   * — the earlier 38 / 27 are retired; six physical rooms, twelve places each.
   * SATHORN PENTHOUSE BANGKOK IS DELETED (Owner, 24 Sep 2026 · Edit 6): 'bkk-stay/penthouse' is not a website
   * product any more — no stock, no card, no gallery, no Bag line; nothing replaces it. */
  'bkk-stay/u-sathorn-superior-garden':
    { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Superior Room With Garden View', stay: 'U Sathorn Bangkok' },

  /* ------------------------------------------ Vientiane · Pre-Wedding Stay */
  'prewed/heritage':                 { unit: 'room', capacity: 5,  occupancy: 2, held: 0, name: 'The Heritage' },
  'prewed/heritage-executive':       { unit: 'room', capacity: 13, occupancy: 2, held: 0, name: 'Heritage Executive' },
  /* NOT BEFORE THE WEDDING (002 · G21 / H21 / I21, 28 Sep 2026): the Noble Courtyard, the Grand Majestic and the Souphattra
     Majestic suites are offered for the Wedding Stay only — no pre-wedding stock (no guest held one) */
  'prewed/heritage-grand-premier':   { unit: 'room', capacity: 3,  occupancy: 2, held: 0, name: 'Heritage Grand Premier' },
  'prewed/souphattra-presidential':  { unit: 'room', capacity: 1,  occupancy: 4, held: 0, name: 'Souphattra Presidential' },

  /* ---------------------------------------------- Vientiane · Wedding Stay */
  'wedstay/heritage':                { unit: 'room', capacity: 5,  occupancy: 2, held: 0, name: 'The Heritage' },
  'wedstay/heritage-executive':      { unit: 'room', capacity: 13, occupancy: 2, held: 0, name: 'Heritage Executive' },
  'wedstay/heritage-grand-premier':  { unit: 'room', capacity: 3,  occupancy: 2, held: 0, name: 'Heritage Grand Premier' },
  'wedstay/noble-courtyard':         { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Noble Courtyard Suite' },
  'wedstay/grand-majestic':          { unit: 'room', capacity: 2,  occupancy: 2, held: 0, name: 'Grand Majestic Suite' },   /* opened to everyone (Owner, Edit 5 · 18 Sep 2026) */
  'wedstay/souphattra-majestic':     { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Souphattra Majestic Suite' },
  'wedstay/souphattra-presidential': { unit: 'room', capacity: 1,  occupancy: 4, held: 0, name: 'Souphattra Presidential' },

  /* D2 · GUEST HOUSE COMPLIMENTARY (Operations Master 003_Accommodation_Details; Owner, 19 Sep 2026): the complimentary
     alternative for the same wedding window — ONE shared unit of SIX bookable guest places (a queen bed and the sofas; who
     sleeps where is the friends' own arrangement, never the website's). Held in GUESTS, visible by first name to every
     authenticated guest. Never "Private Residence" — that label was invented. */
  'guesthouse/guest-house':
    /* ONE BEDROOM, FOUR GUESTS (Owner, 24 Sep 2026 · Edit 7): four shared places — the one number every count derives from */
    { unit: 'guest', capacity: 4, held: 0, name: 'Guest House complimentary', stay: 'Guest House complimentary · Vientiane' },

  /* RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026). Both its products are gone: the paid extension
     ('stayext/riverside-superior', withdrawn earlier the same day) and the wedding-stay alternative
     ('riverside/superior-window', six rooms, no holder at the time). The house is not a website product any more — no stock,
     no page, no card, no gallery, no price — and is not replaced. The wedding window is the Souphattra and the Guest House. */

  /* ------------------------------------------------------------ Kunming
     THE KUNMING HOUSE IS REPLACED (Owner, 27 Sep 2026 · Package F, 1 – 4 March): the former hotel is no longer bookable and its
     twelve categories are gone — a place held in one of them belongs to a retired key and is nobody's (occupancies() skips it),
     the guest chooses again and nothing is moved for them. The Yifangju Designer Courtyard, Jinma Biji Archway, Kunming Old
     Street: the three rooms of the current Accommodation_Details, one room each, sleeping what the sheet says. */
  'kmg/elegant-residence':    { unit: 'room', capacity: 1, occupancy: 1, held: 0, name: '001 · Elegant Residence Double Bed Room' },
  'kmg/jinri-terrace-double': { unit: 'room', capacity: 2, occupancy: 2,   /* 002 · O24: two rooms (28 Sep 2026) */ held: 0, name: '002 · Jinri Building Scenic Terrace Tub Double' },
  'kmg/jinri-family-suite':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: '003 · Jinri Terrace Tub Family Suite' },

  /* ------------------------------------------------------------ Lijiang */
  /* THE SHEET'S THREE ROOMS (002 · R / S / T, 28 Sep 2026): rooms available 1 · 1 · 2, pax 1 · 2 · 2 — every current hold stands
     (Private Soup View in rooms A and B, the 270° suite in A, the Viewing Room in A for one guest) */
  'ljg/private-soup-view':     { unit: 'room', capacity: 2, occupancy: 2, held: 0, name: 'Snow Mountain Private Soup Viewing Suite' },
  'ljg/view-suite-270':        { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: '270° Snow Mountain View Suite' },   /* opened to everyone (Owner, Edit 5 · 18 Sep 2026) */
  'ljg/snow-mountain-viewing': { unit: 'room', capacity: 1, occupancy: 1, held: 0, name: 'Snow Mountain Viewing Room' },

  /* ------------------------------------------------------ Bangkok, closing */
  /* HOTEL MUSE BANGKOK, AUTOGRAPH COLLECTION (002 · V24: three rooms, V14: two adults — 28 Sep 2026). The Siam Kempinski's
     'kempinski/deluxe-balcony-king' is gone: its holds are nobody's any more (Rooms.occupancies skips a key the seed no longer
     has) and stay in storage as history; nothing is moved to this room. The stage keeps its id. */
  'kempinski/jatu-room':
    { unit: 'room', capacity: 3, occupancy: 2, held: 0, name: 'Jatu Room', stay: 'Hotel Muse Bangkok, Autograph Collection' }
};

/* how many units a party of `guests` consumes in this category */
export function unitsFor(key, guests) {
  const s = SEED[key];
  if (!s) return 0;
  const n = Math.max(1, Math.floor(guests) || 1);
  return s.unit === 'guest' ? n : Math.ceil(n / (s.occupancy || 1));
}

/* THE RETIRED CATEGORY LEDGER'S helpers (14 Sep 2026), kept only so the old
 * records can still be read. The room engine (src/rooms.js) ignores `held`
 * entirely since the Owner override of 15 Sep 2026: no room is reserved for
 * anyone in advance. */
export const HOSTS_INVITATION = 'INV-001';
export const HELD_FOR_HOSTS = 'Bride & Groom';

/* is this held stock the asking party's own */
export function heldForParty(key, invitationId) {
  const s = SEED[key];
  return !!(s && s.held > 0 && s.heldFor === HELD_FOR_HOSTS && invitationId === HOSTS_INVITATION);
}

/* what may ever be sold: capacity minus the allocations that already exist —
 * unless the asking party is the one the allocation was made for */
export function sellable(key, invitationId) {
  const s = SEED[key];
  if (!s) return 0;
  return Math.max(0, s.capacity - (heldForParty(key, invitationId) ? 0 : (s.held || 0)));
}
