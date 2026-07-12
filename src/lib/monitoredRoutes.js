'use strict';
/**
 * Monitored routes — the "market" the Flight Tracker watches.
 *
 * This is the provider-independent monitored-route layer. It defines WHICH
 * routes the market dashboard shows and how a live snapshot is priced. Any
 * provider (Duffel today; Amadeus/Sabre/Travelport/airline APIs later) can
 * contribute a price for these routes without the UI or this file changing —
 * the market overview asks every configured provider and keeps the best.
 *
 * No prices live here. This file only knows routes, geography and sample dates.
 */

/**
 * The ten canonical routes shown on the dashboard. Long-haul feeder routes into
 * Bangkok (the wedding's regional gateway) plus the two Bangkok–Luang Prabang hops.
 * `country` is the ISO-3166 alpha-2 of the origin (used for country-aware defaults).
 */
const MONITORED_ROUTES = [
  { id: 'HAM-BKK', origin: 'HAM', destination: 'BKK', originCity: 'Hamburg',       country: 'DE', flag: '🇩🇪', kind: 'longhaul' },
  { id: 'FRA-BKK', origin: 'FRA', destination: 'BKK', originCity: 'Frankfurt',     country: 'DE', flag: '🇩🇪', kind: 'longhaul' },
  { id: 'MUC-BKK', origin: 'MUC', destination: 'BKK', originCity: 'Munich',        country: 'DE', flag: '🇩🇪', kind: 'longhaul' },
  { id: 'TUN-BKK', origin: 'TUN', destination: 'BKK', originCity: 'Tunis',         country: 'TN', flag: '🇹🇳', kind: 'longhaul' },
  { id: 'ATH-BKK', origin: 'ATH', destination: 'BKK', originCity: 'Athens',        country: 'GR', flag: '🇬🇷', kind: 'longhaul' },
  { id: 'LIS-BKK', origin: 'LIS', destination: 'BKK', originCity: 'Lisbon',        country: 'PT', flag: '🇵🇹', kind: 'longhaul' },
  { id: 'LAS-BKK', origin: 'LAS', destination: 'BKK', originCity: 'Las Vegas',     country: 'US', flag: '🇺🇸', kind: 'longhaul' },
  { id: 'NRT-BKK', origin: 'NRT', destination: 'BKK', originCity: 'Tokyo',         country: 'JP', flag: '🇯🇵', kind: 'longhaul' },
  { id: 'BKK-LPQ', origin: 'BKK', destination: 'LPQ', originCity: 'Bangkok',       country: 'TH', flag: '🇹🇭', kind: 'regional' },
  { id: 'LPQ-BKK', origin: 'LPQ', destination: 'BKK', originCity: 'Luang Prabang', country: 'LA', flag: '🇱🇦', kind: 'regional' },
];

/**
 * Country-aware departure defaults. When guest data later provides a country we
 * preselect the most suitable departure airport (always editable in the UI).
 * Order matters: the first airport is the default pick.
 */
const COUNTRY_AIRPORTS = {
  DE: ['HAM', 'FRA', 'MUC'],
  TN: ['TUN'],
  GR: ['ATH'],
  PT: ['LIS'],
  US: ['LAS'],
  JP: ['NRT'],
  TH: ['BKK'],
  LA: ['LPQ'],
};

/** Preferred departure airport for a country, or null when unknown. */
function defaultAirportForCountry(country) {
  const list = COUNTRY_AIRPORTS[String(country || '').toUpperCase()];
  return (list && list[0]) || null;
}

/** Stable KV key for a route's snapshot history. */
function routeKey(origin, destination) {
  return `${String(origin).toUpperCase()}-${String(destination).toUpperCase()}`;
}

/**
 * The ONE canonical wedding travel timeline (See You In Laos, 28 Feb 2027).
 * Every monitored origin is priced on the SAME real guest journey so fares are
 * directly comparable. No rolling/arbitrary sample dates.
 *
 *   Origin -> Bangkok        21 Feb 2027  (arrival, 6 days before the group flight)
 *   Bangkok -> Luang Prabang 27 Feb 2027  (the fixed group flight)
 *   [ Wedding                28 Feb 2027 ]
 *   Luang Prabang -> Bangkok  1 Mar 2027  (fixed return after the wedding)
 *   Bangkok -> Home          individual   (NOT a monitored market route)
 *
 * Each leg is one-way (the monitored market watches the guest journey's flights,
 * not round trips). These dates are stored on the snapshot, shown on the card,
 * and loaded verbatim by "View live fares" — card, snapshot and search never drift.
 */
const WEDDING_DATES = {
  bangkokArrival: '2027-02-21', // Origin -> Bangkok (5-6 days before the group flight)
  groupToLPQ:     '2027-02-27', // Bangkok -> Luang Prabang (the group flight)
  weddingDay:     '2027-02-28',
  returnToBKK:    '2027-03-01', // Luang Prabang -> Bangkok (after the wedding)
};

/** The canonical departure date for a monitored route's leg of the wedding journey. */
function routeDepartureDate(route) {
  if (route.destination === 'LPQ') return WEDDING_DATES.groupToLPQ;              // Bangkok -> Luang Prabang
  if (route.origin === 'LPQ' && route.destination === 'BKK') return WEDDING_DATES.returnToBKK; // Luang Prabang -> Bangkok
  return WEDDING_DATES.bangkokArrival;                                          // Origin -> Bangkok (arrival leg)
}

/**
 * A provider-neutral search query that prices one monitored route on the canonical
 * wedding journey. All legs are one-way. The date is fixed (not clock-relative),
 * so the market compares the same real itinerary for every origin.
 */
function routeQuery(route) {
  return {
    origin: route.origin,
    destination: route.destination,
    departureDate: routeDepartureDate(route),
    returnDate: null,
    adults: 1,
    cabin: 'Economy',
    maxStops: null,
    currency: 'EUR',
  };
}

module.exports = {
  MONITORED_ROUTES,
  COUNTRY_AIRPORTS,
  defaultAirportForCountry,
  routeKey,
  routeQuery,
  routeDepartureDate,
  WEDDING_DATES,
};
