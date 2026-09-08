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

   `held` is stock that is already spoken for and can never be sold: the
   Bride & Groom's own rooms and the family allocation. It is subtracted from
   capacity before anything is offered, so those categories read SOLD OUT /
   RESERVED to every guest and the server can never allocate them.

   The two Vientiane windows are SEPARATE stock: the same 26 physical rooms are
   sold twice, once for 25 – 27 February and once for 27 February – 1 March.

   This file is the ONLY place a number changes. Both the Durable Object and
   the test suite import it — there is no second copy anywhere.
   ========================================================================== */

export const SEED = {
  /* ---------------------------------------------------------- Bangkok, before */
  'bkk-stay/penthouse':
    { unit: 'guest', capacity: 12, held: 0, name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok' },

  /* ------------------------------------------ Vientiane · Pre-Wedding Stay */
  'prewed/heritage':                 { unit: 'room', capacity: 5,  occupancy: 2, held: 0, name: 'The Heritage' },
  'prewed/heritage-executive':       { unit: 'room', capacity: 13, occupancy: 2, held: 0, name: 'Heritage Executive' },
  'prewed/heritage-grand-premier':   { unit: 'room', capacity: 3,  occupancy: 2, held: 0, name: 'Heritage Grand Premier' },
  'prewed/noble-courtyard':          { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Noble Courtyard Suite' },
  'prewed/grand-majestic':           { unit: 'room', capacity: 2,  occupancy: 2, held: 2, name: 'Grand Majestic Suite', heldFor: 'Family' },
  'prewed/souphattra-majestic':      { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Souphattra Majestic Suite' },
  'prewed/souphattra-presidential':  { unit: 'room', capacity: 1,  occupancy: 4, held: 1, name: 'Souphattra Presidential', heldFor: 'Bride & Groom' },

  /* ---------------------------------------------- Vientiane · Wedding Stay */
  'wedstay/heritage':                { unit: 'room', capacity: 5,  occupancy: 2, held: 0, name: 'The Heritage' },
  'wedstay/heritage-executive':      { unit: 'room', capacity: 13, occupancy: 2, held: 0, name: 'Heritage Executive' },
  'wedstay/heritage-grand-premier':  { unit: 'room', capacity: 3,  occupancy: 2, held: 0, name: 'Heritage Grand Premier' },
  'wedstay/noble-courtyard':         { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Noble Courtyard Suite' },
  'wedstay/grand-majestic':          { unit: 'room', capacity: 2,  occupancy: 2, held: 2, name: 'Grand Majestic Suite', heldFor: 'Family' },
  'wedstay/souphattra-majestic':     { unit: 'room', capacity: 1,  occupancy: 2, held: 0, name: 'Souphattra Majestic Suite' },
  'wedstay/souphattra-presidential': { unit: 'room', capacity: 1,  occupancy: 4, held: 1, name: 'Souphattra Presidential', heldFor: 'Bride & Groom' },

  /* the complimentary alternative for the same wedding window — held in GUESTS,
     because it is one residence shared by whoever is given it */
  'airbnb-2br/private-residence':
    { unit: 'guest', capacity: 6, held: 0, name: 'Private Residence', stay: 'Private Residence · Vientiane' },

  /* ------------------------------------------------------------ Kunming */
  'kmg/left-bank':      { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Left Bank French-Style King Room' },
  'kmg/penang':         { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Penang Forest Nanyang-Style Deluxe Suite' },
  'kmg/family-suite':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Family Suite' },
  'kmg/seine':          { unit: 'room', capacity: 1, occupancy: 4, held: 0, name: 'Seine Evening Glow Loft Family Room' },
  'kmg/smart-family':   { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Smart Family Room' },
  'kmg/solarium':       { unit: 'room', capacity: 1, occupancy: 2, held: 1, name: 'Solarium Bath Suite', heldFor: 'Bride & Groom' },
  'kmg/standard-single':{ unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Standard Single Room' },
  'kmg/junting':        { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Junting City-View Loft' },
  'kmg/mid-century':    { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Mid-century Amber Suite' },
  'kmg/milano':         { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Milano Minimalist Loft' },
  'kmg/italian':        { unit: 'room', capacity: 1, occupancy: 2, held: 0, name: 'Italian Style Suite' },
  'kmg/light-french':   { unit: 'room', capacity: 1, occupancy: 1, held: 0, name: 'Light French Suite' },

  /* ------------------------------------------------------------ Lijiang */
  'ljg/starry-sky':            { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: 'Luye Starry Sky Suite · Immersive View' },
  'ljg/boundless':             { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: 'Boundless Floor-to-Ceiling Glass Sunlit Suite' },
  'ljg/private-soup-view':     { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: 'Snow Mountain Private Soup Viewing Suite' },
  'ljg/manor-suite':           { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: 'Snow Mountain Manor Suite' },
  'ljg/view-suite-270':        { unit: 'room', capacity: 4, occupancy: 2, held: 4, name: '270° Snow Mountain View Suite', heldFor: 'Bride & Groom' },
  'ljg/soup-pool-270':         { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: '270° Snow Mountain View Room Private Soup Pool' },
  'ljg/private-courtyard-270': { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: '270° Private Courtyard Snow Mountain View' },
  'ljg/viewing-270':           { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: '270° Snow Mountain Viewing Room' },
  'ljg/snow-mountain-viewing': { unit: 'room', capacity: 4, occupancy: 1, held: 0, name: 'Snow Mountain Viewing Room' },

  /* ------------------------------------------------------ Bangkok, closing */
  'kempinski/deluxe-balcony-king':
    { unit: 'room', capacity: 4, occupancy: 2, held: 0, name: 'Deluxe Balcony King' }
};

/* how many units a party of `guests` consumes in this category */
export function unitsFor(key, guests) {
  const s = SEED[key];
  if (!s) return 0;
  const n = Math.max(1, Math.floor(guests) || 1);
  return s.unit === 'guest' ? n : Math.ceil(n / (s.occupancy || 1));
}

/* what may ever be sold: capacity minus the allocations that already exist */
export function sellable(key) {
  const s = SEED[key];
  return s ? Math.max(0, s.capacity - (s.held || 0)) : 0;
}
