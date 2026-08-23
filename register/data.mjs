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
    venue: 'Souphattra Heritage Vientiane', blurb: 'A quiet Buddhist ritual to open the wedding day.' },
  { id: 'ceremony', label: 'Wedding Ceremony', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Heritage Vientiane', blurb: 'The vows, in front of everyone who matters.' },
  { id: 'dinner', label: 'Wedding Dinner & Reception', when: 'Sunday, 28 February 2027',
    venue: 'Souphattra Vientiane Hotel', blurb: 'The evening of food, music and celebration.' },
];

/* ---------------- accommodation resources (§19, §20, §25) ----------------
 * price unit: GUEST · inventory unit: ROOM (or Party allocation) ·
 * selection scope: PARTY. contributionPerGuest is the approved public value
 * for the complete hosted wedding stay — never a nightly room rate.
 */

export const ACCOMMODATIONS = [
  {
    id: 'villa', name: 'Vientiane Urban Cozy Villa 2 (4BR)',
    kind: 'villa', property: 'Vientiane Urban Cozy Villa 2 (4BR)',
    stay: '25 February – 1 March 2027', nights: 4,
    contributionPerGuest: 0,
    capacityTotal: 4, capacityUnit: 'Party allocation', selectionScope: 'PARTY',
    badge: 'COMPLIMENTARY — HOSTED BY HARUTHAI & SUTHEP',
    blurb: 'A fully hosted stay offered to four invited Parties. Allocation is based on completed registration order and remains subject to confirmation by Guest Relations.',
    image: null,
  },
  {
    id: 'heritage', name: 'Heritage', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 140.00,
    capacityTotal: 4, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'A classic room at Souphattra Vientiane Hotel.',
    image: null,
  },
  {
    id: 'the-heritage', name: 'The Heritage', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 150.00,
    capacityTotal: 13, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'The signature room of the house.',
    image: null,
  },
  {
    id: 'heritage-grand-premier', name: 'Heritage Grand Premier', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 162.50,
    capacityTotal: 3, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'A larger heritage room with a generous corner of calm.',
    image: null,
  },
  {
    id: 'noble-courtyard', name: 'Noble Courtyard', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 225.00,
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'One room, facing the quiet courtyard.',
    image: null,
  },
  {
    id: 'grand-majestic-suite', name: 'Grand Majestic Suite', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 235.00,
    capacityTotal: 2, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'A suite for a slower kind of morning.',
    image: null,
  },
  {
    id: 'souphattra-majestic-suite', name: 'Souphattra Majestic Suite', kind: 'room', property: 'Souphattra Vientiane Hotel',
    stay: '27 February – 1 March 2027', nights: 2,
    contributionPerGuest: 275.00,
    capacityTotal: 1, capacityUnit: 'Room', selectionScope: 'PARTY',
    blurb: 'The house suite — one only.',
    image: null,
  },
];

/** Informational reference only — guests register participation here; Guest
 *  Relations arranges the travel manually. No booking engine. */
export const TRAIN_REFERENCE = 'https://dticket.railway.co.th/DTicketPublicWeb/home/Home';

export const BERTH_PREFS = ['No preference', 'Sleeper berth · lower', 'Sleeper berth · upper'];

export const TRAIN = {
  id: 'train', name: 'Overnight train · Bangkok → Nong Khai',
  capacityTotal: 8, capacityUnit: 'Guest seat', selectionScope: 'GUEST',
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
