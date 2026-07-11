'use strict';
/**
 * Duffel adapter — the ONLY place that knows about Duffel.
 * Implements FlightProvider using Duffel's official Flight Offers search:
 *   POST /air/offer_requests?return_offers=true   (create request + get offers inline)
 *
 * Duffel has no "cheapest date" endpoint, so cheapestDates() returns null and the
 * Travel Service builds the flexible-date landscape itself by enumerating date
 * pairs and calling searchOffers — keeping flexible search provider-independent.
 *
 * Credentials come from env only (never the client, never logged):
 *   DUFFEL_ACCESS_TOKEN   (test token starts "duffel_test_", live "duffel_live_")
 *   DUFFEL_VERSION        (optional, defaults to the pinned version below)
 *
 * Uses global fetch (native in Cloudflare Workers). No npm deps.
 */
const { FlightProvider, isoDurationToMinutes } = require('./flightProvider');

const DEFAULT_VERSION = 'v2';
const BASE = 'https://api.duffel.com';

class DuffelAdapter extends FlightProvider {
  constructor(env = {}) {
    super();
    this._token = env.DUFFEL_ACCESS_TOKEN || '';
    this._version = env.DUFFEL_VERSION || DEFAULT_VERSION;
  }

  get name() { return 'duffel'; }
  get isConfigured() { return Boolean(this._token); }

  _headers(extra) {
    return {
      Authorization: `Bearer ${this._token}`,
      'Duffel-Version': this._version,
      Accept: 'application/json',
      ...(extra || {}),
    };
  }

  _throwForStatus(res, text) {
    let json; try { json = text ? JSON.parse(text) : {}; } catch { json = {}; }
    if (res.status === 429) {
      const retry = res.headers && res.headers.get ? res.headers.get('retry-after') : null;
      throw new DuffelError(`rate limit reached${retry ? `, retry after ${retry}s` : ''}`, 429, text);
    }
    const err = json.errors && json.errors[0];
    throw new DuffelError((err && (err.message || err.title)) || `HTTP ${res.status}`, res.status, text);
  }

  async _post(path, body) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: this._headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) this._throwForStatus(res, text);
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
  }

  async _get(path, params) {
    const url = new URL(`${BASE}${path}`);
    Object.entries(params || {}).forEach(([k, v]) => { if (v != null && v !== '') url.searchParams.set(k, String(v)); });
    const res = await fetch(url, { headers: this._headers() });
    const text = await res.text();
    if (!res.ok) this._throwForStatus(res, text);
    try { return text ? JSON.parse(text) : {}; } catch { return {}; }
  }

  /**
   * Airport/city search for autocomplete (Duffel Places suggestions).
   * @param {string} query
   * @returns {Promise<{iata:string, name:string, city:(string|null), country:(string|null), type:string}[]>}
   */
  async suggestPlaces(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];
    const json = await this._get('/places/suggestions', { query: q });
    return (json.data || []).map((p) => ({
      iata: p.iata_code || null,
      name: p.name,
      city: (p.city && p.city.name) || p.city_name || null,
      country: p.iata_country_code || null,
      type: p.type,
    })).filter((p) => p.iata);
  }

  /** Native cheapest-date landscape is unsupported by Duffel → Travel Service enumerates. */
  async cheapestDates(_q) { return null; }

  /** Historical price benchmark is not a Duffel product. */
  async priceAnalysis(_q) { return null; }

  /**
   * Real priced offers for one specific date pair (round-trip if returnDate given).
   * @param {import('./flightProvider').SearchQuery} q
   * @returns {Promise<import('./flightProvider').FlightOffer[]>}
   */
  async searchOffers(q) {
    const slices = [{ origin: q.origin, destination: q.destination, departure_date: q.departureDate }];
    if (q.returnDate) slices.push({ origin: q.destination, destination: q.origin, departure_date: q.returnDate });

    const passengers = Array.from({ length: q.adults || 1 }, () => ({ type: 'adult' }));
    const body = { data: {
      slices,
      passengers,
      cabin_class: cabinToDuffel(q.cabin),
      ...(q.maxStops != null ? { max_connections: q.maxStops } : {}),
    } };

    const json = await this._post('/air/offer_requests?return_offers=true', body);
    const offers = (json.data && json.data.offers) || [];
    // Duffel prices in the account's billing currency; we surface it as-is.
    return offers
      .map((o) => mapOffer(o, this.name))
      .filter((o) => o && Number.isFinite(o.price.amount))
      .sort((a, b) => a.price.amount - b.price.amount);
  }
}

/* ---------- mapping helpers (Duffel raw -> normalized) ---------- */
function cabinToDuffel(cabin) {
  switch ((cabin || '').toLowerCase()) {
    case 'premium': return 'premium_economy';
    case 'business': return 'business';
    case 'first': return 'first';
    default: return 'economy';
  }
}
function mapLeg(slice) {
  if (!slice || !slice.segments || !slice.segments.length) return null;
  const segs = slice.segments;
  const first = segs[0], last = segs[segs.length - 1];
  const mc = first.marketing_carrier || {};
  return {
    from: { iataCode: first.origin && first.origin.iata_code, at: first.departing_at },
    to: { iataCode: last.destination && last.destination.iata_code, at: last.arriving_at },
    carrier: mc.iata_code || '',
    carrierName: mc.name || mc.iata_code || '',
    flightNumber: `${mc.iata_code || ''}${first.marketing_carrier_flight_number || ''}`,
    stops: segs.length - 1,
    durationMinutes: isoDurationToMinutes(slice.duration || first.duration),
    aircraft: (first.aircraft && first.aircraft.name) || null,
  };
}
function _firstPax(slice) {
  const seg = slice && slice.segments && slice.segments[0];
  return seg && seg.passengers && seg.passengers[0];
}
function _bagQty(slice, type) {
  const pax = _firstPax(slice);
  if (!pax || !Array.isArray(pax.baggages)) return null;
  const b = pax.baggages.filter((x) => x.type === type);
  return b.length ? b.reduce((n, x) => n + (Number(x.quantity) || 0), 0) : 0;
}
function checkedBags(slice) { return _bagQty(slice, 'checked'); }
function carryOnBags(slice) { return _bagQty(slice, 'carry_on'); }
function cabinOf(slice) {
  const pax = _firstPax(slice);
  return (pax && (pax.cabin_class_marketing_name || pax.cabin_class)) || 'economy';
}
function fareClassOf(slice) {
  const pax = _firstPax(slice);
  return (pax && pax.fare_basis_code) || null;
}
function conditionsOf(o) {
  const c = o.conditions || {};
  const r = c.refund_before_departure || {}, ch = c.change_before_departure || {};
  const pen = (x) => (x.penalty_amount != null ? { amount: Number(x.penalty_amount), currency: x.penalty_currency } : null);
  return {
    refundable: r.allowed === true,
    changeable: ch.allowed === true,
    refundPenalty: pen(r),
    changePenalty: pen(ch),
  };
}
function mapOffer(o, providerName) {
  const sl = o.slices || [];
  const outbound = mapLeg(sl[0]);
  if (!outbound) return null;
  const inbound = sl[1] ? mapLeg(sl[1]) : null;
  return {
    id: o.id,
    provider: providerName,
    price: { amount: Number(o.total_amount), currency: o.total_currency },
    owner: (o.owner && o.owner.name) || outbound.carrierName,
    logoUrl: (o.owner && o.owner.logo_symbol_url) || null,
    cabin: cabinOf(sl[0]),
    fareClass: fareClassOf(sl[0]),
    bagsIncluded: checkedBags(sl[0]),
    carryOn: carryOnBags(sl[0]),
    conditions: conditionsOf(o),
    emissionsKg: o.total_emissions_kg != null ? Number(o.total_emissions_kg) : null,
    outbound,
    inbound,
  };
}

class DuffelError extends Error {
  constructor(message, status, body) { super(message); this.name = 'DuffelError'; this.status = status; this.body = body; }
}

module.exports = { DuffelAdapter, mapOffer, mapLeg, cabinToDuffel, checkedBags, DuffelError };
