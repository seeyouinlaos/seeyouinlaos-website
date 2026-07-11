'use strict';
/**
 * Flight Tracker test suite — dependency-free (Node's built-in test runner).
 *   npm test        (→ node --test)
 *
 * Exercises the real code paths with `fetch` stubbed to canned Duffel payloads:
 * provider mapping, the Travel Service (enumeration, validation, honest states,
 * rate-limit), the KV store factory, and the provider registry.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const L = `${__dirname}/../src/lib`;
const { DuffelAdapter } = require(`${L}/providers/duffelAdapter`);
const { getProvider } = require(`${L}/providers/flightProvider`);
const { handleAction } = require(`${L}/travelService`);
const { createStore } = require(`${L}/store`);
const { getNotifier } = require(`${L}/notifier`);

const ENV = { PROVIDER: 'duffel', DUFFEL_ACCESS_TOKEN: 'duffel_test_x', NOTIFY_CHANNEL: 'log' };

function duffelOffer(slices, amount) {
  const leg = (o, d, dep, fn) => ({
    duration: 'PT11H35M',
    segments: [{
      marketing_carrier: { iata_code: 'TG', name: 'Thai Airways' },
      marketing_carrier_flight_number: fn,
      operating_carrier: { iata_code: 'TG', name: 'Thai Airways' },
      origin: { iata_code: o }, destination: { iata_code: d },
      departing_at: `${dep}T10:05:00`, arriving_at: `${dep}T21:40:00`, duration: 'PT11H35M',
      passengers: [{ cabin_class: 'economy', baggages: [{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }] }],
    }],
  });
  const s = [leg(slices[0].origin, slices[0].destination, slices[0].departure_date, '921')];
  if (slices[1]) s.push(leg(slices[1].origin, slices[1].destination, slices[1].departure_date, '920'));
  return { id: 'off', total_amount: String(amount), total_currency: 'EUR', owner: { iata_code: 'TG', name: 'Thai Airways' }, slices: s };
}

/** Install a stubbed global.fetch. mode: 'ok' | 'empty' | '429'. price by departure day. */
function stubFetch(mode = 'ok') {
  global.fetch = async (url, opts) => {
    if (mode === '429') return { ok: false, status: 429, headers: { get: (h) => (h === 'retry-after' ? '9' : null) }, text: async () => JSON.stringify({ errors: [{ message: 'rate' }] }) };
    const body = JSON.parse(opts.body);
    if (mode === 'empty') return { ok: true, text: async () => JSON.stringify({ data: { offers: [] } }) };
    const dep = body.data.slices[0].departure_date;
    const price = 700 - Number(dep.slice(-2));
    const offers = [duffelOffer(body.data.slices, price), duffelOffer(body.data.slices, price + 40)];
    return { ok: true, text: async () => JSON.stringify({ data: { offers } }) };
  };
}

const Q = {
  origin: 'HAM', destination: 'BKK', departureDate: '2027-02-21', returnDate: '2027-03-10',
  departureRange: '2027-02-18,2027-02-24', durationDays: '16,18', lenMin: 16, lenMax: 18,
  adults: 1, cabin: 'Economy', maxStops: 1, currency: 'EUR',
};

test('DuffelAdapter: configuration flag', () => {
  assert.equal(new DuffelAdapter(ENV).isConfigured, true);
  assert.equal(new DuffelAdapter({}).isConfigured, false);
  assert.equal(new DuffelAdapter(ENV).name, 'duffel');
});

test('DuffelAdapter: maps a real offer to the normalized model', async () => {
  stubFetch('ok');
  const a = new DuffelAdapter(ENV);
  const offers = await a.searchOffers({ ...Q, departureDate: '2027-02-23', returnDate: '2027-03-11' });
  assert.equal(offers.length, 2);
  assert.ok(offers[0].price.amount <= offers[1].price.amount, 'cheapest first');
  const o = offers[0];
  assert.equal(o.price.currency, 'EUR');
  assert.equal(o.outbound.carrierName, 'Thai Airways');
  assert.equal(o.outbound.flightNumber, 'TG921');
  assert.equal(o.outbound.stops, 0);
  assert.equal(o.outbound.durationMinutes, 695); // PT11H35M
  assert.equal(o.inbound.flightNumber, 'TG920');
  assert.equal(o.cabin, 'economy');
  assert.equal(o.bagsIncluded, 1);
  assert.equal(o.provider, 'duffel');
});

test('DuffelAdapter: no native cheapest-date / price analysis', async () => {
  const a = new DuffelAdapter(ENV);
  assert.equal(await a.cheapestDates(Q), null);
  assert.equal(await a.priceAnalysis(Q), null);
});

test('Travel Service: flexible-date landscape via enumeration', async () => {
  stubFetch('ok');
  const r = await handleAction('cheapestDates', Q, ENV);
  assert.equal(r.status, 'ok');
  assert.equal(r.data.length, 21); // 7 departure days × 3 nights (16..18)
  assert.ok(r.data.every((c) => c.nights >= 16 && c.nights <= 18));
  assert.equal(r.data[0].price.amount, Math.min(...r.data.map((c) => c.price.amount)));
});

test('Travel Service: empty results handled', async () => {
  stubFetch('empty');
  const r = await handleAction('cheapestDates', Q, ENV);
  assert.equal(r.status, 'ok');
  assert.equal(r.data.length, 0);
});

test('Travel Service: rate-limit surfaced as 429', async () => {
  stubFetch('429');
  const r = await handleAction('cheapestDates', Q, ENV);
  assert.equal(r.status, 'error');
  assert.equal(r.code, 429);
  assert.match(r.message, /rate limit/i);
});

test('Travel Service: honest not_configured + invalid', async () => {
  const nc = await handleAction('cheapestDates', Q, { PROVIDER: 'duffel' });
  assert.equal(nc.status, 'not_configured');
  assert.match(nc.message, /DUFFEL_ACCESS_TOKEN/);
  const inv = await handleAction('cheapestDates', { origin: 'X', destination: 'BKK' }, ENV);
  assert.equal(inv.status, 'invalid');
  assert.ok(inv.errors.length >= 1);
});

test('KV store factory (memory fallback): trips + history', async () => {
  const store = createStore(undefined);
  await store.saveTrip({ id: 'wedding', name: 'Wedding Trip', origin: 'HAM', destination: 'BKK' });
  const trips = await store.listTrips();
  assert.equal(trips.length, 1);
  assert.equal(trips[0].id, 'wedding');
  await store.appendSnapshot('wedding', { date: '2027-01-10', price: 660, currency: 'EUR' });
  await store.appendSnapshot('wedding', { date: '2027-01-10', price: 659, currency: 'EUR' }); // same-day replace
  await store.appendSnapshot('wedding', { date: '2027-01-11', price: 655, currency: 'EUR' });
  const hist = await store.getHistory('wedding');
  assert.equal(hist.length, 2, 'one snapshot per day');
  assert.equal(hist[0].price, 659, 'same-day snapshot replaced');
});

test('Cron orchestration: enumerate → snapshot → alert', async () => {
  stubFetch('ok');
  const store = createStore(undefined);
  const notifier = getNotifier(ENV);
  const trip = { id: 't1', name: 'Trip', origin: 'HAM', destination: 'BKK', departure: '2027-02-21', return: '2027-03-10', flexDays: 1, lenMin: 16, lenMax: 18, cabin: 'Economy', maxStops: 1, currency: 'EUR', notifyBelow: 680 };
  const res = await handleAction('cheapestDates', {
    origin: trip.origin, destination: trip.destination, departureDate: trip.departure, returnDate: trip.return,
    departureRange: '2027-02-20,2027-02-22', durationDays: '16,18', lenMin: 16, lenMax: 18,
    adults: 1, cabin: trip.cabin, maxStops: trip.maxStops, currency: 'EUR',
  }, ENV);
  const best = res.data[0];
  await store.appendSnapshot(trip.id, { date: '2027-01-11', price: best.price.amount, currency: best.price.currency });
  const logs = []; const orig = console.log; console.log = (...a) => logs.push(a.join(' '));
  let alerted = false;
  if (best.price.amount <= trip.notifyBelow) { await notifier.notify({ tripId: trip.id, tripName: trip.name, price: best.price.amount, currency: 'EUR', threshold: trip.notifyBelow, combo: { departureDate: best.departureDate, returnDate: best.returnDate } }); alerted = true; }
  console.log = orig;
  assert.equal(res.status, 'ok');
  assert.ok(best.price.amount <= 680);
  assert.equal(alerted, true);
  assert.ok(logs.some((l) => /\[flight-alert\]/.test(l)));
  assert.equal((await store.getHistory(trip.id)).length, 1);
});

test('Provider registry: default duffel, unknown rejected', () => {
  assert.equal(getProvider(ENV).name, 'duffel');
  assert.throws(() => getProvider({ PROVIDER: 'nope' }), /Unknown PROVIDER/);
});

test('Airport search: DuffelAdapter.suggestPlaces maps Places results', async () => {
  const { DuffelAdapter } = require(`${L}/providers/duffelAdapter`);
  global.fetch = async (url) => {
    assert.match(String(url), /\/places\/suggestions\?query=luang/);
    return { ok: true, text: async () => JSON.stringify({ data: [
      { type: 'airport', iata_code: 'LPQ', name: 'Luang Prabang International Airport', city: { name: 'Luang Prabang' }, iata_country_code: 'LA' },
      { type: 'city', iata_code: 'LPQ', name: 'Luang Prabang', city_name: null },
      { type: 'airport', name: 'No IATA place' }, // filtered out (no iata)
    ] }) };
  };
  const a = new DuffelAdapter(ENV);
  const out = await a.suggestPlaces('luang');
  assert.equal(out.length, 2, 'places without iata are dropped');
  assert.equal(out[0].iata, 'LPQ');
  assert.equal(out[0].name, 'Luang Prabang International Airport');
  assert.equal(out[0].city, 'Luang Prabang');
  assert.equal(out[0].country, 'LA');
  assert.deepEqual(await a.suggestPlaces('x'), [], 'short query returns [] without a call');
});

test('Rich offer mapping: logo, aircraft, cabin, fare, carry-on, conditions', async () => {
  const { DuffelAdapter } = require(`${L}/providers/duffelAdapter`);
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ data: { offers: [{
    id: 'off_1', total_amount: '540.00', total_currency: 'EUR', total_emissions_kg: '512',
    owner: { name: 'Iberia', iata_code: 'IB', logo_symbol_url: 'https://assets.duffel.com/IB.svg' },
    conditions: { refund_before_departure: { allowed: false }, change_before_departure: { allowed: true, penalty_amount: '40.00', penalty_currency: 'EUR' } },
    slices: [{ duration: 'PT11H35M', segments: [{
      marketing_carrier: { iata_code: 'IB', name: 'Iberia' }, marketing_carrier_flight_number: '3179',
      aircraft: { name: 'Airbus A350' }, origin: { iata_code: 'LHR' }, destination: { iata_code: 'JFK' },
      departing_at: '2027-02-21T10:05:00', arriving_at: '2027-02-21T21:40:00', duration: 'PT11H35M',
      passengers: [{ cabin_class: 'economy', cabin_class_marketing_name: 'Economy', fare_basis_code: 'Y20LGTN2',
        baggages: [{ type: 'checked', quantity: 1 }, { type: 'carry_on', quantity: 1 }] }] }] }],
  }] } }) });
  const [o] = await new DuffelAdapter(ENV).searchOffers({ origin: 'LHR', destination: 'JFK', departureDate: '2027-02-21', adults: 1, cabin: 'Economy', currency: 'EUR' });
  assert.equal(o.owner, 'Iberia');
  assert.equal(o.logoUrl, 'https://assets.duffel.com/IB.svg');
  assert.equal(o.cabin, 'Economy');            // marketing name preferred
  assert.equal(o.fareClass, 'Y20LGTN2');
  assert.equal(o.bagsIncluded, 1);
  assert.equal(o.carryOn, 1);
  assert.equal(o.outbound.aircraft, 'Airbus A350');
  assert.equal(o.conditions.refundable, false);
  assert.equal(o.conditions.changeable, true);
  assert.deepEqual(o.conditions.changePenalty, { amount: 40, currency: 'EUR' });
  assert.equal(o.emissionsKg, 512);
});

test('Travel Service: places action routes to the provider', async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ data: [
    { type: 'airport', iata_code: 'BKK', name: 'Suvarnabhumi Airport', city: { name: 'Bangkok' } },
  ] }) });
  const r = await handleAction('places', { q: 'bangkok' }, ENV);
  assert.equal(r.status, 'ok');
  assert.equal(r.data[0].iata, 'BKK');
  const nc = await handleAction('places', { q: 'bangkok' }, { PROVIDER: 'duffel' });
  assert.equal(nc.status, 'not_configured');
});
