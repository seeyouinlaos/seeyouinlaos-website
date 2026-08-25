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
  couple: 'Haruthai & Suthep',
  city: 'Vientiane, Laos',
  weddingDate: 'Sunday, 28 February 2027',
  stayWindow: '27 February – 1 March 2027',
  airport: 'Wattay International Airport (VTE), Vientiane',
};

export const CONTACTS = {
  email: 'guest.relation.seeyouinlaos@gmail.com',
  line: 'seeyouinlaos',
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
    venue: 'In Vientiane · away from the hotel · place to be confirmed',
    blurb: 'A quiet Buddhist ritual to open the wedding day, out in the city at first light. Transfers are arranged for you.' },
  { id: 'ceremony', label: 'Wedding Ceremony', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane', blurb: 'The vows, in front of everyone who matters.' },
  { id: 'dinner', label: 'Wedding Dinner & Reception', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane', blurb: 'Sunset cocktails beside the pool, then dinner in the courtyard garden. Food, music and celebration.' },
];

/* ---------------- accommodation resources ----------------
 * price unit: ROOM · inventory unit: ROOM (or Party allocation) ·
 * selection scope: PARTY. ratePerNight/roomTotal are the approved guest
 * rates from the Owner master — never internal buy-out rates.
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
 * PRICING MODEL (Owner master, 2026-08-25): rates are PER ROOM PER NIGHT with
 * a fixed 2-night stay — `ratePerNight` × `nights` = `roomTotal`. The earlier
 * per-guest contribution model is superseded. Prices are PRIVATE: they render
 * only inside the authenticated Guest Area, never on the public website.
 * Active guest inventory: 23 rooms (4+13+3+2+1). Noble Courtyard is
 * CANCELLED (removed from the active model; governance record in
 * docs/DECISION-REGISTER.md D-18). */
export const ACCOMMODATIONS = [
  {
    id: 'villa', name: 'Vientiane Urban Cozy Villa 2 (4BR)',
    kind: 'villa', property: 'Vientiane Urban Cozy Villa 2 (4BR)',
    stay: '25 February – 1 March 2027', nights: 4,
    ratePerNight: 0, roomTotal: 0, selectable: true,
    capacityTotal: 4, capacityUnit: 'Party allocation', selectionScope: 'PARTY',
    badge: 'COMPLIMENTARY — HOSTED BY HARUTHAI & SUTHEP',
    size: 'Four-bedroom villa', bed: 'Four bedrooms', occupancy: 'One Party per allocation',
    location: 'Vientiane · a short drive from Souphattra Heritage',
    blurb: 'A fully hosted stay offered to four invited Parties. Allocation is based on completed registration order and remains subject to confirmation by Guest Relations.',
    amenities: ['Four bedrooms', 'Living area', 'Kitchen', 'Wi-Fi', 'Air conditioning', 'Private parking'],
    images: [RM + 'villa-1.jpg', RM + 'villa-2.jpg', RM + 'villa-3.jpg'],
  },
  {
    id: 'heritage', name: 'The Heritage', contractRow: 'Heritage',
    kind: 'room', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    ratePerNight: 155, roomTotal: 310, selectable: true,
    capacityTotal: 4, capacityUnit: 'Room', selectionScope: 'PARTY',
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
    ratePerNight: 180, roomTotal: 360, selectable: true,
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
    ratePerNight: 255, roomTotal: 510, selectable: true,
    capacityTotal: 3, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '49 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child sharing bedding',
    location: 'Garden and pool views',
    blurb: 'A larger heritage room, with a private balcony over the garden and the pool.',
    amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'Wi-Fi', 'Bathroom amenities'],
    images: [RM + 'heritage-grand-premier-1.jpg', RM + 'heritage-grand-premier-2.jpg', RM + 'heritage-grand-premier-3.jpg'],
  },
  {
    id: 'grand-majestic-suite', name: 'Grand Majestic Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    ratePerNight: 275, roomTotal: 550, selectable: true,
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
    ratePerNight: 310, roomTotal: 620, selectable: true,
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '84 sq.m.', bed: '1 King bed', occupancy: '2 adults · 2 children',
    location: 'Pool and garden views · one suite only',
    blurb: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
    amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Wi-Fi'],
    images: [RM + 'souphattra-majestic-suite-1.jpg', RM + 'souphattra-majestic-suite-2.jpg', RM + 'souphattra-majestic-suite-3.jpg'],
  },
  {
    /* Visible for the house's completeness — never requestable, never priced. */
    id: 'souphattra-presidential', name: 'Souphattra Presidential',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    ratePerNight: null, roomTotal: null, selectable: false,
    reservedNote: 'Reserved for the Bride & Groom · not available for guest requests',
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '118 sq.m.', bed: 'Two bedrooms · king and twin', occupancy: '4 adults · 2 children',
    location: 'One unit only',
    blurb: 'The largest suite of the house: two bedrooms, private bathrooms and a co-living space under a high ceiling.',
    amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Co-living space', 'Pantry', 'Dining table', 'High ceiling'],
    images: [RM + 'souphattra-presidential-1.jpg', RM + 'souphattra-presidential-2.jpg', RM + 'souphattra-presidential-3.jpg'],
  },
];

/** The categories a Party may actually request (inventory + selection). */
export const SELECTABLE_ACCOMMODATIONS = ACCOMMODATIONS.filter((a) => a.selectable !== false);

/** Informational reference only — guests register participation here; Guest
 *  Relations arranges the travel manually. No booking engine. */
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
  priceLabel: 'Your room for the wedding stay',
  priceNote: 'Rooms are priced per room and night for the fixed two-night wedding stay; the total covers the whole room, whatever your Party size.',
  hostedNight: 'Your second hotel night is hosted by Haruthai & Suthep.',
  payment: 'No deposit is required. After Guest Relations confirms your arrangements, you will receive an invoice with bank transfer or PayPal instructions. Payment is due within seven days.',
  requestNote: 'This is a registration request. Guest Relations will confirm your arrangements separately.',
  sharedHome: 'To make this journey feel truly together, we have created a shared stay at Souphattra Heritage Vientiane: our closest family and friends gather in one place throughout the celebration.',
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
