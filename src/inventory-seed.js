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
     'guest' — a whole-property or per-person product (the Sathorn Penthouse,
               the hosted residence, priced and held per person).

   NO RESERVATIONS, NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): `held` is 0
   everywhere and nothing is kept for anyone in advance — not for the Bride &
   Groom, not for the family. Every room of every category is bookable through
   the room engine by whoever chooses it first; the hosts start at zero like
   every guest. The Penthouse: six bedrooms, twelve places, all bookable.

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

/* NO FIXED ALLOCATION (Owner, 19 Sep 2026): the Sathorn Penthouse Room A preselection for the hosts came from planning data,
   never from a booking; it is deleted. Every guest — the hosts included — starts from zero and books like everyone else.
   `held` / `heldFor` on a seed entry are retired notes of the old category ledger; the room engine ignores them. */
export const FIXED = [];
export const SEED = {
  /* ---------------------------------------------------------- Bangkok, before */
  /* Three approved Bangkok addresses share the window; a guest holds one of
   * them. The penthouse is one home of SIX bedrooms (Owner, 15 Sep 2026):
   * six allocation units, Room A – F, twelve guest places — never more. The
   * two hotels are counted in rooms of two, as every other hotel here is.
   * The Master (Owner, 16 Sep 2026, 17:17 UTC): U Sathorn 6 rooms, Shama 6 rooms
   * — the earlier 38 / 27 are retired; six physical rooms, twelve places each. */
  'bkk-stay/penthouse':
    { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok' },
  'bkk-stay/u-sathorn-superior-garden':
    { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Superior Room With Garden View', stay: 'U Sathorn Bangkok' },
  'bkk-stay/shama-king-studio-balcony':
    { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'King Studio With Balcony', stay: 'Shama Yen-Akat Bangkok' },

  /* ------------------------------------------ Vientiane · Pre-Wedding Stay */
  'prewed/heritage':                 { unit: 'room', capacity: 5,  occupancy: 2, held: 0, name: 'The Heritage' },
  'prewed/heritage-executive':       { unit: 'room', capacity: 13, occupancy: 2, held: 0, name: 'Heritage Executive' },
  'prewed/heritage-grand-premier':   { unit: 'room', capacity: 3,  occupancy: 2, held: 0, name: 'Heritage Grand Premier' },
  'prewed/noble-courtyard':          { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Noble Courtyard Suite' },
  'prewed/grand-majestic':           { unit: 'room', capacity: 2,  occupancy: 2, held: 0, name: 'Grand Majestic Suite' },   /* opened to everyone (Owner, Edit 5 · 18 Sep 2026) */
  'prewed/souphattra-majestic':      { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Souphattra Majestic Suite' },
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
    { unit: 'guest', capacity: 6, held: 0, name: 'Guest House complimentary', stay: 'Guest House complimentary · Vientiane' },

  /* RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026). Both its products are gone: the paid extension
     ('stayext/riverside-superior', withdrawn earlier the same day) and the wedding-stay alternative
     ('riverside/superior-window', six rooms, no holder at the time). The house is not a website product any more — no stock,
     no page, no card, no gallery, no price — and is not replaced. The wedding window is the Souphattra and the Guest House. */

  /* ------------------------------------------------------------ Kunming */
  'kmg/left-bank':      { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Left Bank French-Style King Room' },
  'kmg/penang':         { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Penang Forest Nanyang-Style Deluxe Suite' },
  'kmg/family-suite':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Family Suite' },
  'kmg/seine':          { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Seine Evening Glow Loft Family Room' },
  'kmg/smart-family':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Smart Family Room' },
  'kmg/solarium':       { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Solarium Bath Suite' },   /* opened to everyone (Owner, Edit 5 · 18 Sep 2026) */
  'kmg/standard-single':{ unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Standard Single Room' },
  'kmg/junting':        { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Junting City-View Loft' },
  'kmg/mid-century':    { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Mid-century Amber Suite' },
  'kmg/milano':         { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Milano Minimalist Loft' },
  'kmg/italian':        { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Italian Style Suite' },
  'kmg/light-french':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Light French Suite' },

  /* ------------------------------------------------------------ Lijiang */
  'ljg/starry-sky':            { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Luye Starry Sky Suite · Immersive View' },
  'ljg/boundless':             { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Boundless Floor-to-Ceiling Glass Sunlit Suite' },
  'ljg/private-soup-view':     { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Snow Mountain Private Soup Viewing Suite' },
  'ljg/manor-suite':           { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Snow Mountain Manor Suite' },
  'ljg/view-suite-270':        { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: '270° Snow Mountain View Suite' },   /* opened to everyone (Owner, Edit 5 · 18 Sep 2026) */
  'ljg/soup-pool-270':         { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: '270° Snow Mountain View Room Private Soup Pool' },
  'ljg/private-courtyard-270': { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: '270° Private Courtyard Snow Mountain View' },
  'ljg/viewing-270':           { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: '270° Snow Mountain Viewing Room' },
  'ljg/snow-mountain-viewing': { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Snow Mountain Viewing Room' },

  /* ------------------------------------------------------ Bangkok, closing */
  'kempinski/deluxe-balcony-king':
    { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Deluxe Balcony King' }
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
