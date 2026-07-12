'use strict';
/**
 * HotelProvider — same shape as FlightProvider, so hotels ride the exact same
 * Travel Service + CurrencyService + Money library as flights. Adding Expedia
 * Rapid / Booking.com / Google Hotels / Amadeus Hotels is a new adapter here; no
 * currency logic and no frontend change.
 *
 * DATA-QUALITY RULE (permanent): never invent hotel data. Every hotel is a REAL
 * official property; only VERIFIED fields (from the hotel's official website) are
 * filled. Anything not verified is left empty rather than invented — no invented
 * descriptions, facilities, room categories, contacts, images, logos or copy.
 * Sources verified 2026-07: official domains below.
 *
 * @typedef {{ id, provider, name, city, cityCode, area, stars, website, bookingUrl,
 *   contact:({email?:string,phone?:string}|null), description:(string|null),
 *   facilities:string[], roomCategories:string[], images:string[], logo:(string|null),
 *   kind:('wedding-hotel'|'editorial-collection'), verified:boolean,
 *   planningPrice:({amount:number,currency:string}|null), planningNote:(string|null),
 *   bookingPaths:{id:string,type:('direct'|'guest-relations'),label:string,url:string,primary:boolean}[] }} HotelOffer
 */

class HotelProvider {
  get name() { throw new Error('HotelProvider.name not implemented'); }
  get isConfigured() { return true; }
  /** @param {{city?:string, currency?:string}} _q @returns {Promise<HotelOffer[]>} */
  async searchHotels(_q) { throw new Error('searchHotels not implemented'); }
}

/* ---- booking paths (two, switchable per hotel) ---- */
const GUEST_RELATIONS_EMAIL = 'suthep.hrg@gmail.com';
function weddingRatePath(hotelName, primary) {
  const subject = `See you in Laos: wedding rate — ${hotelName}`;
  const body = `Hello Haruthai & Suthep,\n\nWe'd like to enquire about the exclusive wedding rate for ${hotelName}.\n\nNames:\nArrival / departure:\n`;
  return { id: 'wedding-rate', type: 'guest-relations', label: 'Request our wedding rate', primary: !!primary,
    url: `mailto:${GUEST_RELATIONS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
}
function directPath(url, primary) {
  return url ? { id: 'direct', type: 'direct', label: 'Book on the official site', primary: !!primary, url } : null;
}

const BKK_NOTE = 'Approximate February planning rates. Exclusive wedding rates may be available through our Guest Relations Team.';

/** Normalize a verified record into a HotelOffer (unknown fields stay empty). */
function hotel(h) {
  return {
    provider: 'curated', verified: true,
    id: h.id, name: h.name, city: h.city, cityCode: h.cityCode, area: h.area || null,
    stars: h.stars != null ? h.stars : null,
    website: h.website || null, bookingUrl: h.website || null,
    contact: h.contact || null,
    description: h.description || null,       // not verified in full → empty (never invented)
    facilities: h.facilities || [],
    roomCategories: h.roomCategories || [],
    images: [], logo: null,                   // only with licensing → none
    kind: h.kind,
    planningPrice: h.planning != null ? { amount: h.planning, currency: 'USD' } : null,
    planningNote: h.planningNote || null,
    bookingPaths: h.bookingPaths,
  };
}

/**
 * Curated collection provider — the FIRST HotelProvider implementation. Fixed
 * editorial recommendations, intentionally NOT live search results: planning
 * prices only, never advertised as live rates. Future live providers replace this
 * class behind the same interface.
 */
class CuratedHotelProvider extends HotelProvider {
  get name() { return 'curated'; }
  get isConfigured() { return true; }

  async searchHotels(q = {}) {
    const city = q.city ? String(q.city).toUpperCase() : null;
    const all = [LUANG_PRABANG].concat(CURATED);
    return all.filter((h) => !city || h.cityCode === city).map(hotel);
  }
}

/* ---- LUANG PRABANG: the exclusive, fixed wedding hotel (no alternatives) ---- */
const LUANG_PRABANG = {
  id: 'avaniplus-luang-prabang',
  name: 'Avani+ Luang Prabang Hotel', city: 'Luang Prabang', cityCode: 'LPQ',
  area: 'Old Town, Luang Prabang', stars: 5,
  website: 'https://www.avanihotels.com/en/luang-prabang',
  kind: 'wedding-hotel',
  planning: null,                              // arranged in the wedding block — no advertised rate
  planningNote: 'The exclusive wedding hotel — your room is arranged in the wedding block.',
  bookingPaths: [
    weddingRatePath('Avani+ Luang Prabang Hotel', true),
    directPath('https://www.avanihotels.com/en/luang-prabang', false),
  ],
};

/* ---- BANGKOK: the fixed curated collection (do not replace / add) ---- */
const CURATED = [
  {
    id: 'capella-bangkok', name: 'Capella Bangkok', city: 'Bangkok', cityCode: 'BKK',
    area: 'Chao Phraya Riverside, Charoenkrung', stars: 5,
    website: 'https://capellahotels.com/en/capella-bangkok',
    contact: { email: 'info.bangkok@capellahotels.com' },
    kind: 'editorial-collection', planning: 800, planningNote: BKK_NOTE,
    bookingPaths: [directPath('https://capellahotels.com/en/capella-bangkok', true), weddingRatePath('Capella Bangkok', false)],
  },
  {
    id: 'four-seasons-bangkok', name: 'Four Seasons Hotel Bangkok at Chao Phraya River', city: 'Bangkok', cityCode: 'BKK',
    area: 'Chao Phraya Riverside, Charoen Krung', stars: 5,
    website: 'https://www.fourseasons.com/bangkok/',
    kind: 'editorial-collection', planning: 500, planningNote: BKK_NOTE,
    bookingPaths: [directPath('https://www.fourseasons.com/bangkok/', true), weddingRatePath('Four Seasons Hotel Bangkok at Chao Phraya River', false)],
  },
  {
    id: 'siam-kempinski-bangkok', name: 'Siam Kempinski Hotel Bangkok', city: 'Bangkok', cityCode: 'BKK',
    area: 'Pathum Wan, next to Siam Paragon', stars: 5,
    website: 'https://www.kempinski.com/en/siam-hotel',
    kind: 'editorial-collection', planning: 300, planningNote: BKK_NOTE,
    bookingPaths: [directPath('https://www.kempinski.com/en/siam-hotel', true), weddingRatePath('Siam Kempinski Hotel Bangkok', false)],
  },
  {
    id: '137-pillars-bangkok', name: '137 Pillars Suites & Residences Bangkok', city: 'Bangkok', cityCode: 'BKK',
    area: 'Sukhumvit 39', stars: 5,
    website: 'https://137pillarshotels.com/en/bangkok/',
    kind: 'editorial-collection', planning: 200, planningNote: BKK_NOTE,
    bookingPaths: [directPath('https://137pillarshotels.com/en/bangkok/', true), weddingRatePath('137 Pillars Suites & Residences Bangkok', false)],
  },
  {
    id: 'oakwood-studios-sukhumvit', name: 'Oakwood Studios Sukhumvit Bangkok', city: 'Bangkok', cityCode: 'BKK',
    area: 'Sukhumvit (serviced apartments)', stars: 4,
    website: 'https://www.discoverasr.com/en/oakwood/thailand/oakwood-studios-sukhumvit-bangkok',
    kind: 'editorial-collection', planning: 75, planningNote: 'From 75 USD including breakfast. ' + BKK_NOTE,
    bookingPaths: [directPath('https://www.discoverasr.com/en/oakwood/thailand/oakwood-studios-sukhumvit-bangkok', true), weddingRatePath('Oakwood Studios Sukhumvit Bangkok', false)],
  },
  {
    id: 'salil-riverside-bangkok', name: 'The Salil Hotel Riverside Bangkok', city: 'Bangkok', cityCode: 'BKK',
    area: 'Chao Phraya Riverside, Bangkholaem', stars: 5,
    website: 'https://thesalilriverside.com/',
    contact: { email: 'reservations@thesalilriverside.com', phone: '+66 2 844 8787' },
    kind: 'editorial-collection', planning: 160, planningNote: BKK_NOTE,
    bookingPaths: [directPath('https://thesalilriverside.com/', true), weddingRatePath('The Salil Hotel Riverside Bangkok', false)],
  },
];

/** Registry — HOTEL_PROVIDER selects (default "curated"). */
function getHotelProvider(env = {}) {
  switch (String(env.HOTEL_PROVIDER || 'curated').toLowerCase()) {
    case 'curated': default: return new CuratedHotelProvider();
  }
}

module.exports = { HotelProvider, CuratedHotelProvider, getHotelProvider, hotel, LUANG_PRABANG, CURATED, BKK_NOTE };
