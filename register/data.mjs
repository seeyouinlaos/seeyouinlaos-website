/**
 * See You In Laos — Guest Registration · content & operational data layer.
 *
 * Single source for everything the registration UI renders. Presentation
 * components read from here; nothing here is derived from internal
 * procurement rates. All monetary values are the APPROVED guest rates from
 * the Owner price master — never buy-out rates. Room prices are PRIVATE
 * (authenticated Guest Area only); the public site shows rooms without
 * prices but with live availability.
 *
 * Content states follow the governance model:
 *   CONFIRMED | PLANNING_BASIS | UNRESOLVED | LEGACY | PRIVATE_INTERNAL
 * Only CONFIRMED / approved-for-publication values appear below.
 */

/* ---------------- publication gates (Pre-Release Governance Pass) ----------
 * Owner-controlled release switches. Defaults are the SAFE state:
 *  - rates: 'HOLD'      → guest UI shows "Details to follow"; amounts render
 *                          only after the owner flips to 'APPROVED' (Gate 1).
 *  - inventoryDisplay: 'REQUEST' → guest UI shows "Request availability"
 *                          instead of exact counts (Gate 2). Exact counts stay
 *                          internal (Guest Relations view). 'EXACT' re-enables
 *                          public counts after final allocation sign-off.
 *  - submit: 'mailto'   → demo submission channel. 'endpoint' switches to the
 *                          secure form endpoint (Gate 4, see docs/RELEASE-GATES.md).
 */
export const PUBLICATION = {
  rates: 'APPROVED',
  inventoryDisplay: 'REQUEST',
  submit: 'endpoint',
  /* Absolute Worker URL: guests on BOTH production surfaces (Worker and
   * GitHub Pages) submit into the same durable store (FER-001 §1.10). */
  submitUrl: 'https://seeyouinlaos-website.suthep-hrg.workers.dev/api/register',
};

export const WEDDING = {
  couple: 'Haruthai & Suthep',
  city: 'Vientiane, Laos',
  weddingDate: 'Sunday, 28 February 2027',
  stayWindow: '27 February – 1 March 2027',
  airport: 'Wattay International Airport (VTE), Vientiane',
};

export const CONTACTS = {
  email: 'guest.relation.seeyouinlaos@gmail.com',
  /* whatsapp: no approved number in the source data yet — the QR slot stays
   * pending until the Owner supplies one. Never invent a number. */
  whatsapp: null,
  team: 'Khun Ket · Khun Paddy',
};

/* ---------------- journey + events ---------------- */

export const JOURNEY_MODULES = [
  { id: 'bangkok', label: 'The Bangkok Journey', when: 'Before the wedding',
    blurb: 'The shared days in Bangkok before travelling on to Laos.' },
  { id: 'train', label: 'The Overnight Train', when: 'Bangkok → Nong Khai',
    blurb: 'The sleeper train north through the night — one of the defining transitions of the Bangkok Journey. Eight seats, kept small on purpose.',
    parent: 'bangkok', resource: 'train' },
];

export const EVENTS = [
  { id: 'temple', label: 'Temple Ceremony', when: 'Sunday, 28 February 2027', time: '09:00 AM – approx. 12:00 PM',
    venue: 'Wat Ong Teu Temple, Vientiane', dress: 'Lao Traditional Dress', dressGroup: 'tradition',
    mapUrl: 'https://maps.app.goo.gl/Leuzp4wNBhb9bR9m9?g_st=ic',
    blurb: 'The wedding day begins at the temple: a Buddhist morning ceremony, unhurried and full of meaning. Afterwards we return together to the hotel.' },
  { id: 'coffee', label: 'Coffee & Cake', when: 'Sunday, 28 February 2027', time: 'After the return from the temple',
    venue: 'Souphattra Heritage Vientiane',
    blurb: 'A relaxed hour together after the temple — coffee, cake and time to breathe before the vows.' },
  { id: 'ceremony', label: 'Vow Ceremony', when: 'Sunday, 28 February 2027', time: '04:30 PM',
    venue: 'Souphattra Heritage Vientiane', dress: 'Black Tie', dressGroup: 'vow', blurb: 'The vows, in front of everyone who matters.' },
  { id: 'dinner', label: 'Wedding Dinner', when: 'Sunday, 28 February 2027', time: '07:30 PM',
    venue: 'Souphattra Vientiane Hotel', dress: 'Black Tie', dressGroup: 'dinner', blurb: 'Sunset drinks beside the pool, then dinner in the courtyard garden.' },
];

/* ---------------- accommodation resources ----------------
 * price unit: GUEST · inventory unit: ROOM · selection scope: PARTY.
 * contributionPerGuest is the approved guest value from the final Owner
 * room matrix — never an internal buy-out or nightly rate.
 */

/** Amenity set shared by the two heritage room categories. */
const HERITAGE_AMENITIES = [
  'Bathrobe', 'Bathtub', 'Coffee & tea facilities', 'Hair dryer', 'Mini bar',
  'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV',
  'Wardrobe', 'WiFi',
];
const STAY_WINDOW = '27 February – 1 March 2027';
const RM = 'assets/images/rooms/';

/* Category naming: `name` is the official Souphattra category as published by
 * the house; `contractRow` is the row name in the approved buy-out master
 * and travels with the Guest Relations record so a booking can always be
 * traced back to the approved rate.
 *
 * PRICING MODEL (Final Owner matrix, 2026-08-26): every category has ONE
 * guest-facing amount — `contributionPerGuest` (USD per guest). All other
 * commercial figures are INTERNAL calculation values
 * and never reach any guest surface. Prices render only in the
 * authenticated Guest Area. Hotel inventory: 26 rooms (5+13+3+1+2+1+1);
 * Souphattra Majestic Suite and Souphattra Presidential are RESERVED and
 * never normally requestable. */
export const ACCOMMODATIONS = [
  {
    id: 'heritage', name: 'The Heritage', contractRow: 'Heritage',
    kind: 'room', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 145, selectable: true,
    capacityTotal: 5, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '31 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child',
    location: '1st–3rd floor',
    blurb: 'Colonial French elegance in 31 square metres, with a private balcony over the garden.',
    amenities: HERITAGE_AMENITIES,
    images: [RM + 'the-heritage-1.jpg', RM + 'the-heritage-2.jpg', RM + 'the-heritage-3.jpg'],
  },
  {
    id: 'the-heritage', name: 'Heritage Executive', contractRow: 'The Heritage',
    kind: 'room', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 155, selectable: true,
    capacityTotal: 13, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '37–44 sq.m.', bed: 'King or twin', occupancy: 'Up to 2 adults · 1 child',
    location: 'Garden views · interconnecting rooms where available',
    blurb: 'French colonial rooms with a balcony over the garden, and the flexibility a family needs.',
    amenities: HERITAGE_AMENITIES,
    images: [RM + 'heritage-executive-1.jpg', RM + 'heritage-executive-2.jpg', RM + 'heritage-executive-3.jpg'],
  },
  {
    id: 'heritage-grand-premier', name: 'Heritage Grand Premier',
    kind: 'room', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 170, selectable: true,
    capacityTotal: 3, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '49 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child sharing bedding',
    location: 'Garden and pool views',
    blurb: 'A larger heritage room, with a private balcony over the garden and the pool.',
    amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'WiFi', 'Bathroom amenities'],
    images: [RM + 'heritage-grand-premier-1.jpg', RM + 'heritage-grand-premier-2.jpg', RM + 'heritage-grand-premier-3.jpg'],
  },
  {
    id: 'noble-courtyard', name: 'Noble Courtyard Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 240, selectable: true,
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '63 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child',
    location: 'Ground floor · central greenery · one suite only',
    blurb: 'A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool.',
    amenities: ['Bathrobe', 'Bathtub', 'Coffee & tea making facilities', 'Hair dryer', 'Mini bar', 'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'WiFi access'],
    images: [RM + 'noble-courtyard-1.jpg', RM + 'noble-courtyard-2.jpg', RM + 'noble-courtyard-3.jpg'],
  },
  {
    id: 'grand-majestic-suite', name: 'Grand Majestic Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 250, selectable: true,
    capacityTotal: 2, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '66–75 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child',
    location: 'Private balcony',
    blurb: 'French colonial and Laotian design: a living room under a high ceiling, and a slower kind of morning.',
    amenities: ['Living room', 'High ceiling', 'Pantry', 'Private balcony', 'Smart TV', 'Mini bar', 'WiFi'],
    images: [RM + 'grand-majestic-suite-1.jpg', RM + 'grand-majestic-suite-2.jpg', RM + 'grand-majestic-suite-3.jpg'],
  },
  {
    id: 'souphattra-majestic-suite', name: 'Souphattra Majestic Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 290, selectable: false,
    reservedNote: 'Reserved',
    reservedFor: 'Reserved for Haruthai\u00A0&\u00A0Suthep',
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '84 sq.m.', bed: '1 King bed', occupancy: '2 adults · 2 children',
    location: 'Pool and garden views · one suite only',
    blurb: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
    amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'WiFi'],
    images: [RM + 'souphattra-majestic-suite-1.jpg', RM + 'souphattra-majestic-suite-2.jpg', RM + 'souphattra-majestic-suite-3.jpg'],
  },
  {
    /* Controlled category per the current Owner room matrix: priced and part
     * of the 26-room inventory. */
    id: 'souphattra-presidential', name: 'Souphattra Presidential',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 750, selectable: false,
    reservedNote: 'Reserved', reservedFor: 'Reserved for the wedding family',
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '118 sq.m.', bed: 'Two bedrooms · king and twin', occupancy: '4 adults · 2 children',
    location: 'One unit only',
    blurb: 'The largest suite of the house: two bedrooms, private bathrooms and a shared living space under a high ceiling.',
    amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Shared living space', 'Pantry', 'Dining table', 'High ceiling'],
    images: [RM + 'souphattra-presidential-1.jpg', RM + 'souphattra-presidential-2.jpg', RM + 'souphattra-presidential-3.jpg'],
  },
  {
    /* SEPARATE from the Souphattra matrix (Owner decision 2026-08-26): an
     * ACTIVE two-bedroom Airbnb residence, 27.02.–01.03.2027, up to four
     * adults. The previous four-bedroom listing was cancelled by the
     * landlord and stays retired (governance: D-20). NO commercial terms
     * are approved for guests — no guest-facing price; the guest-facing
     * status is Complimentary/limited and Guest Relations arranges the rest.
     * contributionPerGuest: null = no guest-facing amount exists.
     * The internal booking value stays internal. NOT part of the 26 rooms. */
    id: 'airbnb-2br', name: 'Private Residence',
    badge: 'Alternative stay',
    kind: 'airbnb', property: 'Alternative Stay · Vientiane',
    referenceUrl: 'https://www.airbnb.com/rooms/23930245?adults=4&check_in=2027-02-27&check_out=2027-03-01',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: null, selectable: true,
    capacityTotal: 1, capacityUnit: 'Party allocation', selectionScope: 'PARTY',
    size: 'Private residence', bed: 'Sleeps up to 4', occupancy: 'Up to 4 adults',
    location: 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket',
    status: 'Complimentary · limited availability',
    blurb: 'A warm private residence in central Vientiane, secured for the wedding stay and hosted for a limited number of guests. Guest Relations coordinates the arrangements personally.',
    amenities: ['WiFi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
    images: ['assets/images/airbnb/airbnb-01.jpg', 'assets/images/airbnb/airbnb-02.jpg', 'assets/images/airbnb/airbnb-03.jpg']
  },
];

/** The categories a Party may actually request (inventory + selection). */
export const SELECTABLE_ACCOMMODATIONS = ACCOMMODATIONS.filter((a) => a.selectable !== false);

/** Informational reference only — guests register participation here; Guest
 *  Relations arranges the travel manually. No booking engine. */
/* ---------------- dress code (Owner, 26.08.2026) ----------------
 * Approved terminology per experience. Alms example imagery pending:
 * six numbered, easily replaceable slots (DRESS_ALMS_01..06). */
export const DRESS_CODE = {
  arrival: { label: 'Arrival & Stay', dress: 'Elegant Resort Wear' },
  alms: { label: 'Temple Ceremony', dress: 'Lao Traditional Dress' },
  ceremony: { label: 'Vow Ceremony', dress: 'Black Tie' },
  dinner: { label: 'Wedding Dinner', dress: 'Black Tie' },
};

export const TRAIN_REFERENCE = 'https://dticket.railway.co.th/DTicketPublicWeb/home/Home';

export const BERTH_PREFS = ['No preference', 'Sleeper berth · lower', 'Sleeper berth · upper'];

export const TRAIN = {
  id: 'train', name: 'Overnight train · Bangkok → Nong Khai',
  date: '26 FEB 2027', times: '20:25 → 06:45 (+1)',
  capacityTotal: 8, capacityUnit: 'Guest seat', selectionScope: 'GUEST',
  /* OWNER FINAL (03 SEP 2026, Booking Engine P0): USD 75 per participating
   * guest as ONE package — USD 55 train (First Class Sleeper) + USD 20 Van
   * Pickup & Luggage Service from Nong Khai to the hotel. Guests on the
   * train never book a separate Nong Khai arrival transfer. */
  contributionPerGuest: 75,
  packageNote: 'Train USD 55 · Van Pickup & Luggage Service after arrival USD 20 — USD 75 per guest, everything to the hotel included.',
};

/* ---------------- transfer products (Owner price master, 2026-08-25) -------
 * Chargeable per UNIT (one vehicle journey), never multiplied by guest
 * count. Guests request them; Guest Relations confirms the operation.
 * `fields`: airport products collect flight data, LCR products collect
 * train data — never both. */
export const TRANSFERS = [
  { id: 'shuttle-shared', group: 'Shared Shuttle', name: 'Complimentary Shared Shuttle',
    pricePerUnit: 0, direction: 'arrival', fieldsFor: 'flight',
    included: 'Shared ride with fellow guests · luggage handled · Guest Relations confirms your slot personally',
    blurb: 'Between Wattay International Airport / Vientiane railway station and Souphattra Heritage on arrival day. Guest Relations confirms your pickup time personally.' },
  { id: 'apt-pickup-jaguar', group: 'Airport', name: 'Airport Pickup by Jaguar',
    pricePerUnit: 25, direction: 'arrival', fieldsFor: 'flight',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Wattay International Airport to Souphattra Heritage, met in the arrivals hall.' },
  { id: 'apt-dropoff-jaguar', group: 'Airport', name: 'Airport Drop Off by Jaguar',
    pricePerUnit: 25, direction: 'departure', fieldsFor: 'flight',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Souphattra Heritage to Wattay International Airport, timed to your flight.' },
  { id: 'apt-pickup-merc', group: 'Airport', name: 'Airport Pickup by Mercedes-Benz',
    pricePerUnit: 40, direction: 'arrival', fieldsFor: 'flight',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Wattay International Airport to Souphattra Heritage, met in the arrivals hall.' },
  { id: 'apt-dropoff-merc', group: 'Airport', name: 'Airport Drop Off by Mercedes-Benz',
    pricePerUnit: 40, direction: 'departure', fieldsFor: 'flight',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Souphattra Heritage to Wattay International Airport, timed to your flight.' },
  { id: 'nongkhai-vte', group: 'Nong Khai Railway Station', name: 'Van Pickup & Luggage Service · Nong Khai to Souphattra Heritage',
    date: '27 FEB 2027',
    /* OWNER FINAL (03 SEP 2026): included in the USD 75 Special Express
     * package — never charged separately, never offered as an extra. */
    pricePerUnit: 0, perGuest: true, direction: 'arrival', fieldsFor: 'train',
    included: 'Included in your Special Express package · met at your carriage exit · luggage handled',
    blurb: 'Your van pickup and luggage service after the train arrival are already part of the USD 75 package — Guest Relations confirms the exact pickup details personally.' },
  { id: 'lcr-pickup-jaguar', group: 'LCR Railway Station', name: 'LCR Station to Hotel by Jaguar',
    pricePerUnit: 40, direction: 'arrival', fieldsFor: 'train',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Vientiane railway station to Souphattra Heritage, met at your carriage exit.' },
  { id: 'lcr-dropoff-jaguar', group: 'LCR Railway Station', name: 'Hotel to LCR Station by Jaguar',
    pricePerUnit: 40, direction: 'departure', fieldsFor: 'train',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Souphattra Heritage to Vientiane railway station, timed to your train.' },
  { id: 'lcr-pickup-merc', group: 'LCR Railway Station', name: 'LCR Station to Hotel by Mercedes-Benz',
    pricePerUnit: 55, direction: 'arrival', fieldsFor: 'train',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Vientiane railway station to Souphattra Heritage, met at your carriage exit.' },
  { id: 'lcr-dropoff-merc', group: 'LCR Railway Station', name: 'Hotel to LCR Station by Mercedes-Benz',
    pricePerUnit: 55, direction: 'departure', fieldsFor: 'train',
    included: 'Private vehicle and driver · met personally · luggage handled',
    blurb: 'From Souphattra Heritage to Vientiane railway station, timed to your train.' },
];

/* ---------------- journey extension architecture (owner instruction) --------
 * One authoritative source for the optional journey stays and the Post Wedding
 * Journey. Contribution values are NULL wherever no authoritative amount
 * exists yet — the UI renders a quiet pending state, never an invented price. */
export const BANGKOK_STAYS = [
  /* Pre-Wedding Bangkok stay (HSW-001 v1.1): the Sathorn Penthouse. The
   * check-in date carries a known Master conflict (21 vs 22 Feb) — dates are
   * confirmed personally by Guest Relations, never fabricated (v1.2 §4). */
  /* OWNER DECISION CLOSED (2026-08-30): 21–24 FEB 2027 · 3 nights.
   * Guests contribute ONLY to the first night (21→22); nights two and three
   * are hosted by Haruthai & Suthep. firstNight = authoritative actual for
   * night one (party total); per-guest = firstNight / attending guests. */
  /* OWNER FINAL (03 SEP 2026, Bangkok Journey Module): the commercial
   * booking object is the provider-independent BANGKOK STAY at USD 150 per
   * person per night (see BANGKOK_STAY below). The penthouse remains the
   * editorial "current accommodation" and may later change to a hotel. */
  { id: 'sathorn-penthouse', name: 'Elegant 6BR Sathorn Penthouse', role: 'Current accommodation · Sathorn, Bangkok',
    dates: '21.02.2027 – 25.02.2027', nights: 4,
    contributionNight: '21–22 FEB', hostedNights: '22–24 FEB',
    arrival: { date: '21 FEB 2027', note: 'Personal pickup by Haruthai', hosted: true },
    /* Authoritative project actual (Airbnb checkout capture, USD only):
     * 3 nights × 406.26 − 112.07 long-stay discount = TOTAL 1,106.71.
     * Owner formula: FIRST NIGHT = actual total ÷ 3 = 368.90 (party total);
     * per-guest = firstNight / attending guests (2 → 184.45 each). */
    firstNight: 368.90,
    images: ['../assets/images/journey/penthouse-01.jpg', '../assets/images/journey/penthouse-02.jpg', '../assets/images/journey/penthouse-03.jpg'] },
];

/* Provider-independent Bangkok Stay booking product (owner final):
 * USD 150 × guests × nights; default window 21.02–25.02.2027 · 4 nights. */
export const BANGKOK_STAY = {
  window: '21.02.2027 – 25.02.2027',
  defaultFrom: '2027-02-21', defaultTo: '2027-02-25', defaultNights: 4,
  /* OWNER FINAL PRICE (03 SEP 2026): USD 60 pp/night (owner, 03 Sep late) — supersedes 90, 150,
   * 184.45/368.90 and all historical Bangkok guest pricing. */
  ratePerGuestNight: 60,
};

/* Final/return Bangkok stay context (v1.1): only where a guest chooses the
 * coordinated return — Guest Relations confirms the arrangement. */
export const RETURN_STAY = {
  id: 'siam-kempinski', name: 'Siam Kempinski Hotel Bangkok',
  room: 'Deluxe Balcony Room with King Bed',
  images: ['../assets/images/journey/kempinski-01.jpg', '../assets/images/journey/kempinski-02.jpg', '../assets/images/journey/kempinski-03.jpg'],
};

export const POST_WEDDING = [
  /* VTE→KMG is a FLIGHT (China Eastern). Project Actual USD 138.40 per
   * applicable traveller is NOT a guest contribution — Guest Relations
   * confirms the arrangement. (HSW-001 v1.2 §8) */
  { id: 'vte-kmg', type: 'Flight', label: 'Vientiane → Kunming', date: '01 MAR 2027', when: '1 March 2027', sub: 'China Eastern Airlines', contribution: null },
  /* Stay project costs are internal Actuals, never guest contributions
   * unless explicitly guest-payable (HSW-001 v1.3 §1/§7). */
  { id: 'kunming-stay', type: 'Stay', label: 'Wanxiang Yueju Designer Homestay', date: '01 – 04 MAR 2027', when: '1 – 4 March 2027',
    sub: 'Kunming Railway Station MixC Branch · Solarium Bath Suite or Smart Family Room',
    /* OWNER FINAL (03 SEP, unified journey order §7): directly bookable —
     * confirmed rate from the H&S Operations Master budget sheet. */
    ratePerGuestNight: 27, nightsCount: 3,
    contribution: null,
    images: ['../assets/images/journey/kunming-01.jpg', '../assets/images/journey/kunming-02.jpg', '../assets/images/journey/kunming-03.jpg'] },
  /* USD 145 per guest · FIRST CLASS ONLY belongs to THIS train
   * (Owner-final override — supersedes older USD 85/84.22 values). */
  { id: 'kmg-ljg', type: 'Train', label: 'Kunming → Lijiang', date: '04 MAR 2027', when: '4 March 2027', sub: 'First Class Train · First Class only', contribution: 145, perGuest: true },
  { id: 'lijiang-stay', type: 'Stay', label: 'Luye Baisha · Rizhao Jinshan', date: '04 – 06 MAR 2027', when: '4 – 6 March 2027',
    sub: 'Lijiang · Snow Mountain Viewing Room',
    ratePerGuestNight: 63, nightsCount: 2, contribution: null,
    images: ['../assets/images/journey/lijiang-01.jpg', '../assets/images/journey/lijiang-02.jpg', '../assets/images/journey/lijiang-03.jpg'] },
    /* Lijiang imagery removed (FER-001 §5A): the available saved photos carry a
     * third-party watermark — text-led card until owner-clean originals exist. */
  /* Final onward journey is a CHOICE, never a mandatory booking (v1.0 §8):
   * coordinated return (China Eastern, 06 Mar · project Actual USD 154, not
   * guest-payable), own arrangement, or Guest Relations support. */
  { id: 'ljg-bkk', type: 'Flight', label: 'Lijiang → Bangkok', date: '06 MAR 2027', when: '6 March 2027', sub: 'China Eastern Airlines · where applicable', contribution: null, onward: true },
];

/* ---------------- package (§23) ---------------- */

export const PACKAGE_INCLUSIONS = [
  { id: 'stay', label: 'Accommodation according to your confirmed option' },
  { id: 'breakfast', label: 'Daily hosted breakfast during your registered stay' },
  { id: 'welcome', label: 'Personal airport welcome' },
  { id: 'luggage', label: 'Luggage and arrival coordination' },
  { id: 'transfers', label: 'Confirmed transfers within the wedding programme' },
  { id: 'welcome-drink', label: 'Welcome drink' },
  { id: 'temple', label: 'Temple Ceremony', event: 'temple' },
  { id: 'coffee', label: 'Coffee & Cake', event: 'coffee' },
  { id: 'ceremony', label: 'Vow Ceremony', event: 'ceremony' },
  { id: 'cake', label: 'Cake Reception and Social Hour', event: 'dinner' },
  { id: 'dinner', label: 'Wedding Dinner', event: 'dinner' },
  { id: 'beverage', label: 'Two hour beverage package — water, soft drinks, fruit juice, red or white wine', event: 'dinner' },
  { id: 'gr', label: 'Guest Relations assistance throughout' },
  { id: 'experiences', label: 'Selected cultural and hospitality experiences from your personal itinerary' },
];

/* ---------------- statuses + copy (§24, §27) ---------------- */

export const STATUS = {
  SELECTED: 'SELECTED', REQUESTED: 'REQUESTED', UNDER_REVIEW: 'UNDER REVIEW',
  CONFIRMED: 'CONFIRMED', INVOICE_SENT: 'INVOICE SENT', PAID: 'PAID',
  WAITLISTED: 'WAITLISTED', RELEASED: 'RELEASED',
};

export const COPY = {
  priceLabel: 'Your stay',
  priceNote: 'For rooms at Souphattra Heritage Vientiane, the amount shown is your total contribution per guest for the two-night wedding stay: the first night is your guest contribution; the second night is hosted by',
  priceNote2: 'Breakfast is included on both mornings. A limited number of complimentary alternative stays are also available.',
  /*   keeps "Haruthai & Suthep" unbreakable on every viewport (owner hard rule) */
  hostedNight: 'Your second hotel night is complimentary — part of the hospitality of your hosts.',
  payment: 'No deposit is required. Once your arrangements are confirmed, you will receive an invoice with bank transfer or PayPal instructions. Payment is due within seven days.',
  requestNote: 'This is a registration request. Guest Relations will confirm your arrangements separately.',
  sharedHome: 'Souphattra Heritage Vientiane sits at the heart of our wedding stay: shared mornings, shared arrivals, and the rhythm of the weekend centred around one quiet place. Choose the stay that feels right for you.',
};

/* ---------------- Guest List — PRODUCTION LOOKUP (token-only) -------------
 * The bundle ships ONLY `invitations.enc.json` (AES-256-GCM ciphertexts).
 * A guest enters the private invitation code from their invitation letter
 * (or arrives via /register/?invite=TOKEN). Without a token, no guest data
 * is readable — no names, no directory, nothing enumerable.
 * Plaintext list + token register: src/*.private.* (never deployed/committed).
 * Lost code → guests contact Guest Relations (manual verification).
 */
import { lookupByToken } from './crypto.mjs';

export const DEMO_MODE = false;

let _records = null;
async function records() {
  if (!_records) {
    const r = await fetch(new URL('./invitations.enc.json', import.meta.url));
    _records = await r.json();
  }
  return _records;
}

/** Async: resolves an invitation token to the party payload, or null. */
export async function lookupInvitation(query) {
  return lookupByToken(String(query || ''), await records());
}
