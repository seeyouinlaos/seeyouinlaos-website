'use strict';
/**
 * Scheduled price check (the real "checks every day" loop).
 * Runs server-side on a schedule (see netlify.toml). For each monitored trip:
 *   1. ask the Travel Service for the cheapest-date landscape,
 *   2. reduce to the best valid combination (business rule),
 *   3. append a real snapshot to history,
 *   4. if best <= notifyBelow, fire an alert through the notifier seam.
 *
 * No fares are fabricated: if the provider is not configured, the run records
 * nothing and exits cleanly.
 */
const { handleAction } = require('./lib/travelService');
const store = require('./lib/store');
const { getNotifier } = require('./lib/notifier');

exports.handler = async () => {
  const trips = await store.listTrips();
  const notifier = getNotifier(process.env);
  const today = new Date().toISOString().slice(0, 10);
  const summary = [];

  for (const trip of trips) {
    try {
      const res = await handleAction('cheapestDates', tripToQuery(trip), process.env);
      if (res.status !== 'ok') { summary.push({ trip: trip.id, skipped: res.status }); continue; }

      // The Travel Service already returned valid combos, cheapest first.
      const best = (res.data || [])[0];
      if (!best) { summary.push({ trip: trip.id, skipped: 'no-combo' }); continue; }

      await store.appendSnapshot(trip.id, {
        date: today,
        price: best.price.amount,
        currency: best.price.currency,
        departureDate: best.departureDate,
        returnDate: best.returnDate,
      });

      let alerted = false;
      if (trip.notifyBelow && best.price.amount <= trip.notifyBelow) {
        await notifier.notify({
          tripId: trip.id, tripName: trip.name,
          price: best.price.amount, currency: best.price.currency,
          threshold: trip.notifyBelow,
          combo: { departureDate: best.departureDate, returnDate: best.returnDate },
          to: trip.notifyEmail,
        });
        alerted = true;
      }
      summary.push({ trip: trip.id, best: best.price.amount, alerted });
    } catch (e) {
      summary.push({ trip: trip.id, error: e.message });
    }
  }

  console.log('[flight-cron]', JSON.stringify({ at: new Date().toISOString(), checked: summary.length, summary }));
  return { statusCode: 200, body: JSON.stringify({ status: 'ok', checked: summary.length }) };
};

function tripToQuery(trip) {
  const flex = Number(trip.flexDays) || 0;
  return {
    origin: trip.origin, destination: trip.destination,
    departureDate: trip.departure, returnDate: trip.return,
    departureRange: dateRange(trip.departure, flex),
    durationDays: `${trip.lenMin || 1},${trip.lenMax || 30}`,
    lenMin: trip.lenMin || 1, lenMax: trip.lenMax || 30,
    adults: 1, cabin: trip.cabin, maxStops: trip.maxStops,
    nonStop: trip.maxStops === 0, currency: trip.currency || 'EUR',
  };
}
function dateRange(center, flex) {
  if (!center || !flex) return center;
  const DAY = 86400000;
  const c = Date.parse(center);
  const a = new Date(c - flex * DAY).toISOString().slice(0, 10);
  const b = new Date(c + flex * DAY).toISOString().slice(0, 10);
  return `${a},${b}`;
}
