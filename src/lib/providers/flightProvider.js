'use strict';
/**
 * Provider abstraction for the See You In Laos Flight Tracker.
 *
 * The rest of the application NEVER talks to an airline/GDS API directly.
 * It talks to the Travel Service, which talks to ONE FlightProvider adapter.
 * Swapping the provider (or adding a second one) means writing a new adapter that
 * implements this interface — nothing else in the app changes.
 *
 * All shapes below are provider-neutral. Adapters must map their raw responses
 * onto these types so the UI/business logic never sees provider-specific fields.
 *
 * @typedef {{ amount:number, currency:string }} Money
 * @typedef {{ iataCode:string, at:string }} Endpoint   // at = ISO datetime
 * @typedef {{ from:Endpoint, to:Endpoint, carrier:string, carrierName?:string,
 *             flightNumber:string, stops:number, durationMinutes:number }} Leg
 * @typedef {{ id:string, provider:string, price:Money, cabin:string,
 *             bagsIncluded:(number|null), outbound:Leg, inbound:(Leg|null) }} FlightOffer
 * @typedef {{ departureDate:string, returnDate:(string|null), price:Money }} CheapestDate
 * @typedef {{ currency:string, min:number, q1:number, median:number, q3:number, max:number }} PriceMetrics
 * @typedef {{ origin:string, destination:string, departureDate:string,
 *             returnDate:(string|null), adults:number, cabin:string,
 *             maxStops:(number|null), nonStop:boolean, currency:string,
 *             departureRange?:string, durationDays?:string }} SearchQuery
 */

/**
 * Abstract base. Adapters extend this. The Travel Service only ever calls
 * these four members — it knows nothing about the concrete provider, tokens, etc.
 */
class FlightProvider {
  /** @returns {string} stable provider id, e.g. "duffel" */
  get name() { throw new Error('provider.name not implemented'); }

  /** @returns {boolean} true only when credentials are present and usable */
  get isConfigured() { return false; }

  /**
   * OPTIONAL native flexible-date landscape (cheapest round-trip per date pair).
   * Return null when the provider has no cheapest-date endpoint (e.g. Duffel);
   * the Travel Service then builds the landscape itself by enumerating date pairs
   * and calling searchOffers — so flexible-date search is provider-independent.
   * @param {SearchQuery} _q
   * @returns {Promise<CheapestDate[]|null>}
   */
  async cheapestDates(_q) { return null; }

  /**
   * Full priced offers for one specific date pair (fares, carriers, bags, cabin, stops).
   * @param {SearchQuery} _q
   * @returns {Promise<FlightOffer[]>}
   */
  async searchOffers(_q) { throw new Error('searchOffers not implemented'); }

  /**
   * Historical price benchmark for a route/date (min..max quartiles), or null if unsupported.
   * @param {SearchQuery} _q
   * @returns {Promise<PriceMetrics|null>}
   */
  async priceAnalysis(_q) { return null; }

  /**
   * OPTIONAL airport/city autocomplete. Returns [] when unsupported.
   * @param {string} _query
   * @returns {Promise<{iata:string, name:string, city:(string|null), country:(string|null), type:string}[]>}
   */
  async suggestPlaces(_query) { return []; }

  /**
   * OPTIONAL: does this provider price NATIVELY in `cur`? When true, the Travel
   * Service passes the currency through and uses the returned prices verbatim (no
   * conversion). Default false → the app converts once, in the money seam, and
   * marks the result as converted. A future provider that can price in USD/THB/…
   * returns true here and the UI never changes.
   * @param {string} _cur
   */
  supportsCurrency(_cur) { return false; }
}

/* ---- helpers shared by adapters ---- */

/** ISO-8601 duration ("PT14H30M") -> minutes. */
function isoDurationToMinutes(s) {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(s || '');
  return m ? ((+m[1] || 0) * 60 + (+m[2] || 0)) : 0;
}

/**
 * Registry: pick the configured provider from environment.
 * PROVIDER selects the adapter (default "duffel"). Adding another provider is one
 * new case here plus its adapter file — the Travel Service and UI are untouched.
 * @param {Record<string,string|undefined>} env
 * @returns {FlightProvider}
 */
function getProvider(env) {
  const which = (env.PROVIDER || 'duffel').toLowerCase();
  switch (which) {
    case 'duffel': {
      const { DuffelAdapter } = require('./duffelAdapter');
      return new DuffelAdapter(env);
    }
    default:
      throw new Error(`Unknown PROVIDER "${which}"`);
  }
}

/**
 * All configured providers, in priority order. Today this is a single-element
 * list (Duffel is Provider #1), but the market overview and future aggregated
 * search iterate this so adding Amadeus/Sabre/Travelport/an airline API is one
 * new adapter + one entry here — the Travel Service and UI never change.
 * `PROVIDERS` (comma-separated) overrides; otherwise it falls back to PROVIDER.
 * @param {Record<string,string|undefined>} env
 * @returns {FlightProvider[]}
 */
function getProviders(env) {
  const list = String(env.PROVIDERS || env.PROVIDER || 'duffel')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const seen = new Set();
  const out = [];
  for (const which of list) {
    if (seen.has(which)) continue;
    seen.add(which);
    out.push(getProvider({ ...env, PROVIDER: which }));
  }
  return out;
}

module.exports = { FlightProvider, getProvider, getProviders, isoDurationToMinutes };
