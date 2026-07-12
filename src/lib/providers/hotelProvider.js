'use strict';
/**
 * HotelProvider — the same shape as FlightProvider, so hotels ride the exact same
 * Travel Service + currency architecture as flights. A hotel offer carries a
 * normalized price in its OWN native currency; the Travel Service converts it for
 * display through the one CurrencyService, and the UI formats it through the one
 * Money library. Adding Expedia Rapid / Booking.com / an Avani API is a new
 * adapter here — no currency logic and no UI changes.
 *
 * @typedef {{ amount:number, currency:string }} Money
 * @typedef {{ id:string, provider:string, name:string, city:string, area?:string,
 *   stars:number, nightlyFrom:Money, nights:number, total:Money, image?:string,
 *   tags?:string[], booking:{provider:string,bookingUrl:string,branding:{name:string,logoUrl:(string|null)},checkoutType:string,label:string} }} HotelOffer
 */

class HotelProvider {
  get name() { throw new Error('HotelProvider.name not implemented'); }
  get isConfigured() { return true; }
  /** @param {{city?:string, nights?:number, currency?:string}} _q @returns {Promise<HotelOffer[]>} */
  async searchHotels(_q) { throw new Error('searchHotels not implemented'); }
}

function booking(name, url) {
  return { provider: 'curated', bookingUrl: url, branding: { name: name, logoUrl: null }, checkoutType: 'redirect', label: 'View rooms' };
}
const gmaps = (q) => `https://www.google.com/travel/search?q=${encodeURIComponent(q)}`;

/**
 * Curated collection provider — the wedding stay plus a Bangkok stop-over set the
 * couple actually points guests to. Rates are indicative "from" nightly prices in
 * each hotel's native billing currency (Luang Prabang/USD, Bangkok/THB), for
 * planning; booking opens the hotel. A live provider (Expedia Rapid, Booking.com)
 * replaces this class and returns the same HotelOffer shape.
 */
class CuratedHotelProvider extends HotelProvider {
  get name() { return 'curated'; }
  get isConfigured() { return true; }

  async searchHotels(q = {}) {
    const nights = Math.max(1, Number(q.nights) || 2);
    const city = q.city ? String(q.city).toUpperCase() : null;
    const rows = CURATED.filter((h) => !city || h.cityCode === city);
    return rows.map((h) => ({
      id: h.id, provider: this.name, name: h.name, city: h.city, cityCode: h.cityCode,
      area: h.area, stars: h.stars,
      nightlyFrom: { amount: h.nightly, currency: h.currency },
      nights,
      total: { amount: Math.round(h.nightly * nights * 100) / 100, currency: h.currency },
      tags: h.tags,
      booking: booking(h.name, h.url || gmaps(h.name + ' ' + h.city)),
    }));
  }
}

/* Indicative from-rates in each hotel's native currency. Luang Prabang = the
   wedding; Bangkok = the recommended stop-over on the way in/out. */
const CURATED = [
  { id: 'avaniplus-lpq', name: 'AVANI+ Luang Prabang', city: 'Luang Prabang', cityCode: 'LPQ', area: 'Old Town', stars: 5, nightly: 190, currency: 'USD', tags: ['The wedding hotel', 'Mekong views'], url: 'https://www.avanihotels.com/en/luang-prabang' },
  { id: 'sofitel-lpq', name: 'Sofitel Luang Prabang', city: 'Luang Prabang', cityCode: 'LPQ', area: 'Old Town', stars: 5, nightly: 240, currency: 'USD', tags: ['Heritage', 'Garden pool'] },
  { id: 'avaniplus-bkk', name: 'AVANI+ Riverside Bangkok', city: 'Bangkok', cityCode: 'BKK', area: 'Riverside', stars: 5, nightly: 4200, currency: 'THB', tags: ['Rooftop pool', 'River'], url: 'https://www.avanihotels.com/en/riverside-bangkok' },
  { id: 'mo-bkk', name: 'Mandarin Oriental Bangkok', city: 'Bangkok', cityCode: 'BKK', area: 'Riverside', stars: 5, nightly: 15500, currency: 'THB', tags: ['Grande dame', 'River'] },
  { id: 'thesiam-bkk', name: 'The Siam', city: 'Bangkok', cityCode: 'BKK', area: 'Dusit', stars: 5, nightly: 19000, currency: 'THB', tags: ['Art-deco', 'Private'] },
  { id: '137pillars-bkk', name: '137 Pillars Suites', city: 'Bangkok', cityCode: 'BKK', area: 'Sukhumvit', stars: 5, nightly: 8800, currency: 'THB', tags: ['All-suite', 'Rooftop'] },
];

/** Registry — HOTEL_PROVIDER selects (default "curated"). */
function getHotelProvider(env = {}) {
  switch (String(env.HOTEL_PROVIDER || 'curated').toLowerCase()) {
    case 'curated': default: return new CuratedHotelProvider();
  }
}

module.exports = { HotelProvider, CuratedHotelProvider, getHotelProvider };
