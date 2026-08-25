/**
 * See You In Laos — Guest Registration · content & operational data layer.
 *
 * Single source for everything the registration UI renders. Presentation
 * components read from here; nothing here is derived from internal
 * procurement rates. All monetary values are the APPROVED PUBLIC per-Guest
 * contributions from the implementation brief (§20) — never buy-out rates.
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

/* ---------------- accommodation resources (§19, §20, §25) ----------------
 * price unit: GUEST · inventory unit: ROOM (or Party allocation) ·
 * selection scope: PARTY. contributionPerGuest is the approved public value
 * for the complete hosted wedding stay — never a nightly room rate.
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
 * (docs/RELEASE-GATES.md Gate 1) and travels with the Guest Relations record
 * so a booking can always be traced back to the approved rate. Ordering,
 * size and rate are monotonic and were used to reconcile the two namings. */
export const ACCOMMODATIONS = [
  {
    id: 'villa', name: 'Vientiane Urban Cozy Villa 2 (4BR)',
    kind: 'villa', property: 'Vientiane Urban Cozy Villa 2 (4BR)',
    stay: '25 February – 1 March 2027', nights: 4,
    contributionPerGuest: 0, selectable: true,
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
    contributionPerGuest: 140.00, selectable: true,
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
    contributionPerGuest: 150.00, selectable: true,
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
    contributionPerGuest: 162.50, selectable: true,
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
    contributionPerGuest: 225.00, selectable: true,
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    size: '63 sq.m.', bed: '1 King bed', occupancy: '2 adults · 1 child',
    location: 'Courtyard garden · one suite only',
    blurb: 'A suite made for two: a separate living area, two bathrooms, and the garden all around.',
    amenities: ['Separate living area', 'Private balcony', 'Garden surroundings', 'Two bathrooms', 'King bed', 'Smart TV', 'Sofa', 'Afternoon tea area', 'Mini bar'],
    images: [RM + 'noble-courtyard-1.jpg', RM + 'noble-courtyard-2.jpg', RM + 'noble-courtyard-3.jpg'],
  },
  {
    id: 'grand-majestic-suite', name: 'Grand Majestic Suite',
    kind: 'suite', property: 'Souphattra Heritage Vientiane',
    stay: STAY_WINDOW, nights: 2,
    contributionPerGuest: 235.00, selectable: true,
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
    contributionPerGuest: 275.00, selectable: true,
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
    contributionPerGuest: null, selectable: false,
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
  /* Approved public per-guest contribution. null = not yet approved for
   * publication; the UI shows "to be confirmed" and excludes it from totals.
   * Never derive this from internal procurement rates. */
  contributionPerGuest: null,
};

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
  priceLabel: 'Your total contribution per guest for the complete hosted wedding stay',
  priceNote: 'The amount shown is the complete contribution for each registered Guest, not a nightly room rate.',
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
