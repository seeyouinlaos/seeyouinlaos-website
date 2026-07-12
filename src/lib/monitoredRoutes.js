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
  { id: 'DXB-BKK', origin: 'DXB', destination: 'BKK', originCity: 'Dubai',         country: 'AE', flag: '🇦🇪', kind: 'longhaul' },
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
  AE: ['DXB'],
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
 * The sample date a monitored route is priced on. A rolling near-future one-way
 * (relative to the real clock, not any wedding date) so the provider's live
 * inventory always has offers. Snapshots are comparable because the offset is
 * constant; the dashboard is a market quote, not a booking.
 * @param {Date} [now]
 */
function sampleDate(now = new Date()) {
  const LEAD_DAYS = 45;
  const d = new Date(now.getTime() + LEAD_DAYS * 86400000);
  return d.toISOString().slice(0, 10);
}

/** A provider-neutral search query that prices one monitored route (one-way). */
function routeQuery(route, now = new Date()) {
  return {
    origin: route.origin,
    destination: route.destination,
    departureDate: sampleDate(now),
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
  sampleDate,
  routeQuery,
};
