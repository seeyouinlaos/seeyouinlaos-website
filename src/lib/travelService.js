'use strict';
/**
 * Travel Service — the application's own boundary in front of any provider.
 *
 *   UI  ->  Travel Service  ->  Provider Adapter  ->  Provider API
 *
 * The UI calls this (via the travel.js HTTP function). This layer:
 *   - validates + normalizes the request,
 *   - selects the configured provider,
 *   - returns a stable, provider-neutral response envelope,
 *   - owns the "best combination" business rule (not the provider).
 *
 * Provider adapters ONLY supply flight data. Every decision (which combos are
 * valid, which is best, budget/alert logic) lives here or in the app — never in
 * the adapter, and never in the browser's reach of a secret.
 */
const { getProvider } = require('./providers/flightProvider');

const IATA = /^[A-Z]{3}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {any} raw @returns {import('./providers/flightProvider').SearchQuery} */
function normalizeQuery(raw = {}) {
  const q = {
    origin: String(raw.origin || '').toUpperCase().trim(),
    destination: String(raw.destination || '').toUpperCase().trim(),
    departureDate: String(raw.departureDate || '').trim(),
    returnDate: raw.returnDate ? String(raw.returnDate).trim() : null,
    adults: clampInt(raw.adults, 1, 9, 1),
    cabin: String(raw.cabin || 'Economy'),
    maxStops: raw.maxStops == null ? null : clampInt(raw.maxStops, 0, 3, 1),
    nonStop: Boolean(raw.nonStop),
    currency: String(raw.currency || 'EUR').toUpperCase(),
    departureRange: raw.departureRange ? String(raw.departureRange).trim() : undefined,
    durationDays: raw.durationDays ? String(raw.durationDays).trim() : undefined,
    lenMin: raw.lenMin != null ? clampInt(raw.lenMin, 1, 3650, 1) : null,
    lenMax: raw.lenMax != null ? clampInt(raw.lenMax, 1, 3650, 3650) : null,
  };
  const errs = [];
  if (!IATA.test(q.origin)) errs.push('origin must be a 3-letter IATA code');
  if (!IATA.test(q.destination)) errs.push('destination must be a 3-letter IATA code');
  if (!ISO_DATE.test(q.departureDate) && !q.departureRange) errs.push('departureDate (or departureRange) required as YYYY-MM-DD');
  if (q.returnDate && !ISO_DATE.test(q.returnDate)) errs.push('returnDate must be YYYY-MM-DD');
  return { query: q, errors: errs };
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

/**
 * Handle one Travel Service action.
 * @param {'cheapestDates'|'search'|'priceAnalysis'|'status'} action
 * @param {any} rawQuery
 * @param {Record<string,string|undefined>} env
 * @returns {Promise<{status:string, provider?:string, data?:any, message?:string, errors?:string[]}>}
 */
async function handleAction(action, rawQuery, env) {
  let provider;
  try { provider = getProvider(env); }
  catch (e) { return { status: 'error', message: e.message }; }

  if (action === 'status') {
    return { status: 'ok', provider: provider.name, configured: provider.isConfigured };
  }

  // Not configured is a first-class, honest state — NEVER fabricate prices.
  if (!provider.isConfigured) {
    return { status: 'not_configured', provider: provider.name,
      message: `Live fares are not available yet: set ${envKeysFor(provider.name)} to go live.` };
  }

  // Airport/city autocomplete (its own lightweight input, not a flight query).
  if (action === 'places') {
    const q = String((rawQuery && (rawQuery.q || rawQuery.query)) || '').trim();
    try {
      const data = await provider.suggestPlaces(q);
      return { status: 'ok', provider: provider.name, data };
    } catch (e) {
      return { status: 'error', provider: provider.name, message: e.message || 'places request failed', code: e.status };
    }
  }

  const { query, errors } = normalizeQuery(rawQuery);
  if (errors.length) return { status: 'invalid', errors };

  try {
    if (action === 'cheapestDates') {
      // Prefer a native cheapest-date endpoint; otherwise build the landscape
      // ourselves from searchOffers (provider-independent flexible-date search).
      let data = await provider.cheapestDates(query);
      if (!Array.isArray(data)) data = await enumerateCheapest(provider, query);
      // Authoritative business rule lives here (not in the client, not in the cron):
      // keep only valid pairs, cheapest first, annotated with nights.
      if (query.lenMin != null || query.lenMax != null) {
        data = bestCombinations(data, query.lenMin, query.lenMax);
      }
      return { status: 'ok', provider: provider.name, currency: query.currency, data };
    }
    if (action === 'search') {
      const data = await provider.searchOffers(query);
      return { status: 'ok', provider: provider.name, currency: query.currency, data };
    }
    if (action === 'priceAnalysis') {
      const data = await provider.priceAnalysis(query);
      return { status: 'ok', provider: provider.name, data };
    }
    return { status: 'error', message: `Unknown action "${action}"` };
  } catch (e) {
    return { status: 'error', provider: provider.name, message: e.message || 'provider request failed',
      code: e.status || undefined };
  }
}

/* ---- flexible-date landscape via searchOffers (provider-independent) ---- */
const MAX_PAIRS = 24;   // cap provider calls per check (rate-limit friendly)
const CONCURRENCY = 4;

/** Build candidate date pairs from a departure range + nights window. */
function buildPairs(query) {
  const DAY = 86400000;
  const range = query.departureRange || `${query.departureDate},${query.departureDate}`;
  const [a, b] = range.split(',');
  const start = Date.parse(a), end = Date.parse(b || a);
  const lo = query.lenMin || (query.returnDate ? nightsBetween(query.departureDate, query.returnDate) : 1);
  const hi = query.lenMax || lo;
  const pairs = [];
  for (let d = start; d <= end; d += DAY) {
    const dep = new Date(d).toISOString().slice(0, 10);
    for (let n = lo; n <= hi; n++) pairs.push({ dep, ret: new Date(d + n * DAY).toISOString().slice(0, 10) });
  }
  return pairs.slice(0, MAX_PAIRS);
}
function nightsBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

/**
 * Query the cheapest offer for each candidate date pair (bounded concurrency).
 * A 429 propagates (so callers surface a rate-limit); other per-pair failures are
 * treated as "no availability for that pair" rather than failing the whole search.
 * @returns {Promise<import('./providers/flightProvider').CheapestDate[]>}
 */
async function enumerateCheapest(provider, query) {
  const pairs = buildPairs(query);
  const out = [];
  for (let i = 0; i < pairs.length; i += CONCURRENCY) {
    const batch = pairs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((p) =>
      provider.searchOffers({ ...query, departureDate: p.dep, returnDate: p.ret })
        .then((offers) => (offers && offers.length)
          ? { departureDate: p.dep, returnDate: p.ret, price: offers[0].price } : null)
        .catch((err) => { if (err && err.status === 429) throw err; return null; })
    ));
    out.push(...results.filter(Boolean));
  }
  return out;
}

/* ---- business rule: best valid round-trip within the strategy ---- */
/**
 * From a cheapest-date landscape, keep only pairs whose trip length is within
 * [lenMin, lenMax] and return them sorted cheapest-first. This is the app's
 * decision logic, kept out of the provider.
 */
function bestCombinations(cheapestDates, lenMin, lenMax) {
  const DAY = 86400000;
  return cheapestDates
    .filter((c) => c.returnDate)
    .map((c) => ({ ...c, nights: Math.round((Date.parse(c.returnDate) - Date.parse(c.departureDate)) / DAY) }))
    .filter((c) => c.nights >= (lenMin || 1) && c.nights <= (lenMax || 3650))
    .sort((a, b) => a.price.amount - b.price.amount);
}

function envKeysFor(name) {
  if (name === 'duffel') return 'DUFFEL_ACCESS_TOKEN';
  return 'the provider credentials';
}

module.exports = { handleAction, normalizeQuery, bestCombinations };
