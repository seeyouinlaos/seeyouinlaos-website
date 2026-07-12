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
const { getProvider, getProviders } = require('./providers/flightProvider');
const { MONITORED_ROUTES, routeKey, routeQuery } = require('./monitoredRoutes');
const { DEFAULT_CURRENCY } = require('../../money.js');
const { createCurrencyService } = require('./fx/currencyService');
const { createStore } = require('./store');

/** A CurrencyService bound to the env's FX provider + the KV cache. */
function currencyFor(env, store) { return createCurrencyService(env, store || createStore(env.KV)); }

/**
 * Re-price provider-native offers into the requested currency. PROVIDER-FIRST: if
 * the flight provider already priced natively in `to` (supportsCurrency) offers
 * are returned verbatim — nothing the provider returns natively is ever converted.
 * Otherwise each price is converted once through the CurrencyService (which owns
 * the FX provider + cache) and marked, preserving the provider-native source.
 */
async function priceOffers(offers, to, provider, cur) {
  if (!to || (provider.supportsCurrency && provider.supportsCurrency(to))) return offers;
  const out = [];
  for (const o of offers) {
    const m = await cur.convertMoney(o.price, to);
    out.push(m.converted
      ? { ...o, price: { amount: m.amount, currency: m.currency }, priceConverted: true, priceSource: m.source }
      : o);
  }
  return out;
}
/** Convert a bare {amount,currency} for calendar display (native preserved). */
async function priceMoney(money, to, cur) {
  const m = await cur.convertMoney(money, to);
  return { amount: m.amount, currency: m.currency, converted: !!m.converted, source: m.source || null };
}

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
      if (!(provider.supportsCurrency && provider.supportsCurrency(query.currency))) {
        const cur = currencyFor(env);
        const priced = [];
        for (const c of data) priced.push({ ...c, price: await priceMoney(c.price, query.currency, cur) });
        data = priced;
      }
      return { status: 'ok', provider: provider.name, currency: query.currency, data };
    }
    if (action === 'search') {
      const offers = await provider.searchOffers(query);
      const data = await priceOffers(offers, query.currency, provider, currencyFor(env));
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

/* ============================================================================
   Flight Market — the monitored-route dashboard (provider-independent)
   ============================================================================
   The market asks EVERY configured provider for the cheapest live offer on each
   monitored route, keeps the best, and persists a daily snapshot. Cards are
   computed from that real history; nothing is fabricated. When a route has no
   history yet the card reports status 'collecting' and a snapshot is seeded so
   history begins immediately. The daily cron deepens the series over time. */

const ROUTE_REFRESH_TTL_MS = 6 * 3600 * 1000; // don't re-price a route more than every 6h on read
const MARKET_CONCURRENCY = 5;

/**
 * Price ONE monitored route across all configured providers; return the best
 * offer plus a per-provider breakdown, or null if nobody had inventory.
 */
async function priceRoute(providers, route, now = new Date()) {
  const q = routeQuery(route, now);
  const byProvider = [];
  for (const p of providers) {
    if (!p.isConfigured) continue;
    try {
      const offers = await p.searchOffers(q);
      if (offers && offers.length) {
        const best = offers[0]; // adapters return cheapest-first
        byProvider.push({
          provider: p.name,
          price: best.price.amount,
          currency: best.price.currency,
          offers: offers.length,
          branding: (best.booking && best.booking.branding) || { name: p.name, logoUrl: best.logoUrl || null },
          bookingUrl: (best.booking && best.booking.bookingUrl) || null,
          offerId: best.id,
        });
      }
    } catch (e) {
      if (e && e.status === 429) throw e; // let a rate-limit surface
      // otherwise treat as "no inventory from this provider right now"
    }
  }
  if (!byProvider.length) return null;
  byProvider.sort((a, b) => a.price - b.price);
  const win = byProvider[0];
  return {
    date: now.toISOString().slice(0, 10),
    ts: now.getTime(),
    price: win.price,
    currency: win.currency,
    offers: win.offers,
    provider: win.provider,
    branding: win.branding,
    bookingUrl: win.bookingUrl,
    offerId: win.offerId,
    byProvider,
  };
}

/** Refresh every monitored route now and persist a snapshot (used by the cron). */
async function refreshMarket(env, store, now = new Date()) {
  const providers = getProviders(env).filter((p) => p.isConfigured);
  const summary = [];
  const routes = [...MONITORED_ROUTES];
  for (let i = 0; i < routes.length; i += MARKET_CONCURRENCY) {
    const batch = routes.slice(i, i + MARKET_CONCURRENCY);
    await Promise.all(batch.map(async (route) => {
      try {
        const snap = await priceRoute(providers, route, now);
        if (snap) { await store.appendRouteSnapshot(routeKey(route.origin, route.destination), snap); summary.push({ route: route.id, price: snap.price }); }
        else summary.push({ route: route.id, skipped: 'no-inventory' });
      } catch (e) { summary.push({ route: route.id, error: e.message }); }
    }));
  }
  return { refreshed: summary.length, summary };
}

/** Trend/percent helpers over a snapshot series (real numbers only).
 *  Values are computed in the snapshot's NATIVE currency, then the monetary
 *  fields are converted for display into `to` using a pre-fetched `rateTo` map
 *  (nativeCurrency -> multiplier). History in the store always stays native. */
function computeCard(route, snaps, to, rateTo) {
  if (!snaps.length) {
    return { ...routePublic(route), status: 'collecting', currency: to, converted: false, current: null,
      previous: null, change: null, changePct: null, spark: [], low30: null, trend: null, history: 0 };
  }
  const last = snaps[snaps.length - 1];
  const prev = snaps.length > 1 ? snaps[snaps.length - 2] : null;
  const nativeCur = last.currency || 'EUR';
  const mult = rateTo && rateTo[nativeCur] != null ? rateTo[nativeCur] : (nativeCur === to ? 1 : null);
  const conv = mult != null && nativeCur !== to;
  const dispCur = (mult != null) ? to : nativeCur;
  const cv = (n) => (n == null ? null : (mult != null ? Math.round(n * mult * 100) / 100 : n));
  const change = prev ? +(last.price - prev.price).toFixed(2) : null;
  const changePct = prev && prev.price ? +(((last.price - prev.price) / prev.price) * 100).toFixed(1) : null;
  const cutoff = last.ts - 30 * 86400000;
  const low30 = Math.min(...snaps.filter((s) => (s.ts || 0) >= cutoff).map((s) => s.price));
  const trend = change == null ? null : (changePct >= 0.5 ? 'up' : changePct <= -0.5 ? 'down' : 'flat');
  return {
    ...routePublic(route),
    status: snaps.length < 2 ? 'collecting' : 'ok', // one point = live price shown, sparkline still gathering
    currency: dispCur, converted: conv,
    current: { price: cv(last.price), currency: dispCur, offers: last.offers, provider: last.provider,
      branding: last.branding, bookingUrl: last.bookingUrl, offerId: last.offerId, ts: last.ts, date: last.date,
      nativePrice: last.price, nativeCurrency: nativeCur,
      byProvider: (last.byProvider || []).map((b) => ({ ...b, price: cv(b.price), currency: dispCur })) },
    previous: prev ? cv(prev.price) : null,
    change: cv(change), changePct, spark: snaps.slice(-7).map((s) => cv(s.price)), low30: cv(low30), trend,
    history: snaps.length,
  };
}
function routePublic(r) {
  return { id: r.id, origin: r.origin, destination: r.destination, originCity: r.originCity,
    country: r.country, flag: r.flag, kind: r.kind };
}

/**
 * Build the full market overview for the dashboard. Seeds any route that has no
 * fresh snapshot (older than the TTL) unless refresh is explicitly disabled.
 * @returns {Promise<{status:string, asOf:string, currency:string, routes:any[]}>}
 */
async function marketOverview(env, store, opts = {}) {
  const providers = getProviders(env);
  const configured = providers.filter((p) => p.isConfigured);
  const now = opts.now || new Date();
  const currency = String(opts.currency || DEFAULT_CURRENCY).toUpperCase();
  const refresh = opts.refresh !== false && configured.length > 0;

  // Decide which routes need a live price now (missing or stale), then seed them.
  const routeSnaps = {};
  const stale = [];
  for (const route of MONITORED_ROUTES) {
    const key = routeKey(route.origin, route.destination);
    const snaps = await store.getRouteSnapshots(key);
    routeSnaps[key] = snaps;
    const last = snaps[snaps.length - 1];
    if (refresh && (!last || (now.getTime() - (last.ts || 0)) > ROUTE_REFRESH_TTL_MS)) stale.push(route);
  }
  if (stale.length) {
    for (let i = 0; i < stale.length; i += MARKET_CONCURRENCY) {
      const batch = stale.slice(i, i + MARKET_CONCURRENCY);
      await Promise.all(batch.map(async (route) => {
        try {
          const snap = await priceRoute(configured, route, now);
          if (snap) {
            const key = routeKey(route.origin, route.destination);
            await store.appendRouteSnapshot(key, snap);
            routeSnaps[key] = await store.getRouteSnapshots(key);
          }
        } catch (e) { /* leave the route on its existing history; card shows 'collecting' */ }
      }));
    }
  }

  // Pre-fetch (and cache) one rate per distinct native currency → display currency,
  // so the whole dashboard converts from a single cached FX read, not per card.
  const cur = currencyFor(env, store);
  const natives = new Set();
  MONITORED_ROUTES.forEach((route) => {
    const s = routeSnaps[routeKey(route.origin, route.destination)] || [];
    const last = s[s.length - 1];
    if (last) natives.add((last.currency || 'EUR').toUpperCase());
  });
  const rateTo = {};
  for (const n of natives) rateTo[n] = n === currency ? 1 : await cur.getRate(n, currency);

  const routes = MONITORED_ROUTES.map((route) =>
    computeCard(route, routeSnaps[routeKey(route.origin, route.destination)] || [], currency, rateTo));
  return {
    status: configured.length ? 'ok' : 'not_configured',
    provider: configured[0] ? configured[0].name : (providers[0] && providers[0].name),
    asOf: now.toISOString(),
    currency,
    routes,
  };
}

/* ============================================================================
   Hotels — same currency architecture as flights (provider-independent)
   ============================================================================ */
const { getHotelProvider } = require('./providers/hotelProvider');

/**
 * Curated/live hotels for a city, priced through the SAME CurrencyService as
 * flights. Each hotel's native price is preserved; display currency is applied on
 * read. Adding Expedia/Booking/Rapid is a new HotelProvider — nothing here or in
 * the UI changes.
 */
async function hotelsOverview(env, store, opts = {}) {
  const provider = getHotelProvider(env);
  const currency = String(opts.currency || DEFAULT_CURRENCY).toUpperCase();
  const cur = currencyFor(env, store);
  const list = await provider.searchHotels({ city: opts.city, currency });
  const hotels = [];
  for (const h of list) {
    let planningPrice = null, converted = false;
    if (h.planningPrice) {
      const m = await cur.convertMoney(h.planningPrice, currency);
      planningPrice = { amount: m.amount, currency: m.currency };
      converted = !!m.converted;
    }
    hotels.push({ ...h, planningPrice, nativePlanning: h.planningPrice || null, converted });
  }
  return { status: 'ok', provider: provider.name, currency, hotels };
}

/** Current exchange-rate document (base + rates + provider) for the client to
 *  display locally-held native values with the same rates the server uses. */
async function ratesOverview(env, store) {
  const doc = await currencyFor(env, store).rates();
  return { status: 'ok', base: doc.base, rates: doc.rates, provider: doc.provider, fetchedAt: doc.fetchedAt };
}

module.exports = { handleAction, normalizeQuery, bestCombinations, marketOverview, refreshMarket, hotelsOverview, ratesOverview };
