/**
 * Cloudflare Worker — See You In Laos wedding website + Flight Tracker backend.
 *
 * This is the real Worker (module format) that lets Cloudflare recognise a
 * backend and accept Secrets like DUFFEL_ACCESS_TOKEN. It:
 *   - serves the static site via the ASSETS binding, and
 *   - handles the Travel Service API at /api/travel (fetch handler), and
 *   - runs the daily price check + alerts (scheduled handler / Cron Trigger).
 *
 * The Flight Tracker architecture is unchanged: the same provider abstraction,
 * Travel Service, normalized FlightOffer model and business rules run here — only
 * the platform adapter (entrypoint + KV store) is Cloudflare-specific now.
 *
 * Secrets/vars come from `env` (never the browser). KV is bound as `env.KV`.
 */
import { handleAction } from './lib/travelService.js';
import { createStore } from './lib/store.js';
import { getNotifier } from './lib/notifier.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/travel') return handleTravel(request, env);
    // Everything else is a static asset (index.html, flight-tracker.html, images…).
    return env.ASSETS.fetch(request);
  },

  // Cron Trigger (see wrangler.jsonc [triggers].crons) — the real daily check.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runCron(env));
  },
};

/* ============================================================================
   Travel Service HTTP endpoint  →  /api/travel
   Actions: status | cheapestDates | search | priceAnalysis | saveTrip | listTrips | history
   ============================================================================ */
async function handleTravel(request, env) {
  const cors = {
    'Access-Control-Allow-Origin': env.SITE_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response('', { status: 204, headers: cors });

  const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: cors });

  try {
    const url = new URL(request.url);
    const isPost = request.method === 'POST';
    const body = isPost ? await request.json().catch(() => ({})) : {};
    const params = Object.fromEntries(url.searchParams.entries());
    const action = (isPost ? body.action : params.action) || 'status';
    const query = isPost ? (body.query || {}) : params;
    const store = createStore(env.KV);

    if (action === 'saveTrip') {
      if (!isPost) return json(405, { status: 'error', message: 'POST required' });
      const id = await store.saveTrip(body.trip || {});
      return json(200, { status: 'ok', id });
    }
    if (action === 'listTrips') {
      return json(200, { status: 'ok', data: await store.listTrips() });
    }
    if (action === 'history') {
      const id = (isPost ? body.tripId : params.tripId) || '';
      return json(200, { status: 'ok', data: await store.getHistory(id) });
    }

    const result = await handleAction(action, query, env);
    const code = result.status === 'ok' ? 200
      : result.status === 'not_configured' ? 200
      : result.status === 'invalid' ? 400
      : result.status === 'error' ? 502 : 200;
    return json(code, result);
  } catch (e) {
    return json(500, { status: 'error', message: (e && e.message) || 'unexpected error' });
  }
}

/* ============================================================================
   Scheduled price check + alerts (Cron Trigger)
   ============================================================================ */
async function runCron(env) {
  const store = createStore(env.KV);
  const notifier = getNotifier(env);
  const today = new Date().toISOString().slice(0, 10);
  const trips = await store.listTrips();
  const summary = [];

  for (const trip of trips) {
    try {
      const res = await handleAction('cheapestDates', tripToQuery(trip), env);
      if (res.status !== 'ok') { summary.push({ trip: trip.id, skipped: res.status }); continue; }

      const best = (res.data || [])[0]; // Travel Service already returned valid combos, cheapest first
      if (!best) { summary.push({ trip: trip.id, skipped: 'no-combo' }); continue; }

      await store.appendSnapshot(trip.id, {
        date: today, price: best.price.amount, currency: best.price.currency,
        departureDate: best.departureDate, returnDate: best.returnDate,
      });

      let alerted = false;
      if (trip.notifyBelow && best.price.amount <= trip.notifyBelow) {
        await notifier.notify({
          tripId: trip.id, tripName: trip.name,
          price: best.price.amount, currency: best.price.currency, threshold: trip.notifyBelow,
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
  return { checked: summary.length };
}

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
  const DAY = 86400000, c = Date.parse(center);
  return `${new Date(c - flex * DAY).toISOString().slice(0, 10)},${new Date(c + flex * DAY).toISOString().slice(0, 10)}`;
}
