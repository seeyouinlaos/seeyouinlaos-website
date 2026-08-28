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
  submitUrl: '/api/register',
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
  { id: 'alms', label: 'Alms Giving', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane',
    blurb: 'A quiet Buddhist ritual to open the wedding day at first light. Monks walk in procession; rice is offered; nothing is hurried.',
    templeNote: 'The participating temple will be announced with your itinerary.' },
  { id: 'ceremony', label: 'Wedding Ceremony', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane', blurb: 'The vows, in front of everyone who matters.' },
  { id: 'dinner', label: 'Wedding Dinner & Reception', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane', blurb: 'Sunset cocktails beside the pool, then dinner in the courtyard garden. Food, music and celebration.' },
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
  'Wardrobe', 'Wi-Fi',
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
    amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'Wi-Fi', 'Bathroom amenities'],
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
    blurb: 'A 63 square metre retreat made for two: a King bed, two bathrooms and shower rooms for Her and His comfort, a separate living area with Smart TV and sofa for afternoon tea, and a private balcony over the garden and the pool.',
    amenities: ['Bathrobe', 'Bathtub', 'Coffee & tea making facilities', 'Hair dryer', 'Mini bar', 'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'Wi-Fi access'],
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
    amenities: ['Living room', 'High ceiling', 'Pantry', 'Private balcony', 'Smart TV', 'Mini bar', 'Wi-Fi'],
    images: [RM + 'grand-majestic-suite-1.jpg', RM + 'grand-majestic-suite-2.jpg', RM + 'grand-majestic-suite-3.jpg'],
  },
  {
    id: 'souphattra-majestic-suite', name: 'Souphattra Majestic Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 290, selectable: false,
    reservedNote: 'Reserved',
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '84 sq.m.', bed: '1 King bed', occupancy: '2 adults · 2 children',
    location: 'Pool and garden views · one suite only',
    blurb: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
    amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Wi-Fi'],
    images: [RM + 'souphattra-majestic-suite-1.jpg', RM + 'souphattra-majestic-suite-2.jpg', RM + 'souphattra-majestic-suite-3.jpg'],
  },
  {
    /* Controlled category per the current Owner room matrix: priced and part
     * of the 26-room inventory. */
    id: 'souphattra-presidential', name: 'Souphattra Presidential',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 750, selectable: false,
    reservedNote: 'Reserved',
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '118 sq.m.', bed: 'Two bedrooms · king and twin', occupancy: '4 adults · 2 children',
    location: 'One unit only',
    blurb: 'The largest suite of the house: two bedrooms, private bathrooms and a co-living space under a high ceiling.',
    amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Co-living space', 'Pantry', 'Dining table', 'High ceiling'],
    images: [RM + 'souphattra-presidential-1.jpg', RM + 'souphattra-presidential-2.jpg', RM + 'souphattra-presidential-3.jpg'],
  },
  {
    /* SEPARATE from the Souphattra matrix (Owner decision 2026-08-26): an
     * ACTIVE two-bedroom Airbnb residence, 27.02.–01.03.2027, up to four
     * adults. The previous four-bedroom listing was cancelled by the
     * landlord and stays retired (governance: D-20). NO commercial terms
     * are approved for guests — no price, no hosted/complimentary status,
     * no inclusions: everything is ARRANGED SEPARATELY by Guest Relations.
     * contributionPerGuest: null = no guest-facing amount exists.
     * The internal booking value stays internal. NOT part of the 26 rooms. */
    id: 'airbnb-2br', name: 'Airbnb Residence',
    kind: 'airbnb', property: 'Airbnb · Vientiane',
    referenceUrl: 'https://www.airbnb.com/rooms/23930245?adults=4&check_in=2027-02-27&check_out=2027-03-01',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: null, selectable: true,
    capacityTotal: 1, capacityUnit: 'Party allocation', selectionScope: 'PARTY',
    size: 'Private residence', bed: 'Sleeps up to 4', occupancy: 'Up to 4 adults',
    location: 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket',
    blurb: 'A warm, private residence in downtown Vientiane, decorated with natural materials, wood furniture and Lao bamboo handicraft. Secured for the wedding nights for up to four adults; this stay is arranged separately, and Guest Relations coordinates every detail with you personally.',
    amenities: ['Wi-Fi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
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
  alms: { label: 'Alms Giving', dress: 'Lao Traditional Dress' },
  ceremony: { label: 'Vow Ceremony', dress: 'Black Tie' },
  dinner: { label: 'Wedding Dinner', dress: 'Black Tie' },
};

export const TRAIN_REFERENCE = 'https://dticket.railway.co.th/DTicketPublicWeb/home/Home';

export const BERTH_PREFS = ['No preference', 'Sleeper berth · lower', 'Sleeper berth · upper'];

export const TRAIN = {
  id: 'train', name: 'Overnight train · Bangkok → Nong Khai',
  capacityTotal: 8, capacityUnit: 'Guest seat', selectionScope: 'GUEST',
  /* CONFIRMED guest price (Owner, 2026-08-25): USD 88 per participating
   * guest. Charged only for guests who join the train. */
  contributionPerGuest: 88,
};

/* ---------------- transfer products (Owner price master, 2026-08-25) -------
 * Chargeable per UNIT (one vehicle journey), never multiplied by guest
 * count. Guests request them; Guest Relations confirms the operation.
 * `fields`: airport products collect flight data, LCR products collect
 * train data — never both. */
export const TRANSFERS = [
  { id: 'apt-pickup-jaguar', group: 'Airport', name: 'Airport Pick-up by Jaguar',
    pricePerUnit: 25, direction: 'arrival', fieldsFor: 'flight',
    blurb: 'From Wattay International Airport to Souphattra Heritage, met in the arrivals hall.' },
  { id: 'apt-dropoff-jaguar', group: 'Airport', name: 'Airport Drop-off by Jaguar',
    pricePerUnit: 25, direction: 'departure', fieldsFor: 'flight',
    blurb: 'From Souphattra Heritage to Wattay International Airport, timed to your flight.' },
  { id: 'apt-pickup-merc', group: 'Airport', name: 'Airport Pick-up by Mercedes-Benz',
    pricePerUnit: 40, direction: 'arrival', fieldsFor: 'flight',
    blurb: 'From Wattay International Airport to Souphattra Heritage, met in the arrivals hall.' },
  { id: 'apt-dropoff-merc', group: 'Airport', name: 'Airport Drop-off by Mercedes-Benz',
    pricePerUnit: 40, direction: 'departure', fieldsFor: 'flight',
    blurb: 'From Souphattra Heritage to Wattay International Airport, timed to your flight.' },
  { id: 'lcr-pickup-jaguar', group: 'LCR Railway Station', name: 'LCR Station to Hotel by Jaguar',
    pricePerUnit: 40, direction: 'arrival', fieldsFor: 'train',
    blurb: 'From Vientiane railway station to Souphattra Heritage, met at your carriage exit.' },
  { id: 'lcr-dropoff-jaguar', group: 'LCR Railway Station', name: 'Hotel to LCR Station by Jaguar',
    pricePerUnit: 40, direction: 'departure', fieldsFor: 'train',
    blurb: 'From Souphattra Heritage to Vientiane railway station, timed to your train.' },
  { id: 'lcr-pickup-merc', group: 'LCR Railway Station', name: 'LCR Station to Hotel by Mercedes-Benz',
    pricePerUnit: 60, direction: 'arrival', fieldsFor: 'train',
    blurb: 'From Vientiane railway station to Souphattra Heritage, met at your carriage exit.' },
  { id: 'lcr-dropoff-merc', group: 'LCR Railway Station', name: 'Hotel to LCR Station by Mercedes-Benz',
    pricePerUnit: 60, direction: 'departure', fieldsFor: 'train',
    blurb: 'From Souphattra Heritage to Vientiane railway station, timed to your train.' },
];

/* ---------------- package (§23) ---------------- */

export const PACKAGE_INCLUSIONS = [
  { id: 'stay', label: 'Accommodation according to your confirmed option' },
  { id: 'breakfast', label: 'Daily hosted breakfast during your registered stay' },
  { id: 'welcome', label: 'Personal airport welcome' },
  { id: 'luggage', label: 'Luggage and arrival coordination' },
  { id: 'transfers', label: 'Confirmed transfers within the wedding programme' },
  { id: 'welcome-drink', label: 'Welcome drink' },
  { id: 'alms', label: 'Alms Giving Ceremony', event: 'alms' },
  { id: 'ceremony', label: 'Wedding Ceremony', event: 'ceremony' },
  { id: 'cake', label: 'Cake Reception and Social Hour', event: 'dinner' },
  { id: 'dinner', label: 'Wedding Dinner', event: 'dinner' },
  { id: 'beverage', label: 'Two-hour beverage package — water, soft drinks, fruit juice, red or white wine', event: 'dinner' },
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
  priceLabel: 'Your contribution per guest for the complete wedding stay',
  priceNote: 'The amount shown is per guest for the complete two-night wedding stay — never a nightly room rate.',
  /*   keeps "Haruthai & Suthep" unbreakable on every viewport (owner hard rule) */
  hostedNight: 'Your second hotel night is hosted by Haruthai & Suthep.',
  payment: 'No deposit is required. After Guest Relations confirms your arrangements, you will receive an invoice with bank transfer or PayPal instructions. Payment is due within seven days.',
  requestNote: 'This is a registration request. Guest Relations will confirm your arrangements separately.',
  sharedHome: 'Souphattra Heritage Vientiane is held for the people we love. Everyone we invite stays under one roof: shared mornings, shared arrivals, the whole rhythm of the weekend in one quiet place. You simply choose the room where you wake up; the second night is hosted by Haruthai & Suthep.',
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
