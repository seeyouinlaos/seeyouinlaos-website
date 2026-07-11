# Flight Tracker — Travel Service (production architecture)

A real flight-price tracker for the See You In Laos wedding website. Guests save a
**search strategy** (route, flexible dates, trip length, budget, alert threshold);
the app tracks the **best real fare** over time, shows a dashboard/history/portfolio,
and can alert when a fare drops below a threshold.

**No prices are simulated.** Fares, airlines, flight numbers, times, connections,
baggage and cabin classes come from a real provider (**Duffel**) through a
replaceable adapter.

## Architecture

```
Browser UI (flight-tracker.html)         ← never holds an API token
        │  POST /.netlify/functions/travel
        ▼
Travel Service (netlify/functions/travel.js + lib/travelService.js)
        │  validates, normalizes, owns the "best combination" rule,
        │  and builds the flexible-date landscape from searchOffers
        ▼
Provider Adapter (lib/providers/duffelAdapter.js  implements  flightProvider.js)
        │  the ONLY provider-specific code — swappable behind the interface
        ▼
Duffel Flight Offers API
```

- **Business logic stays in the app / Travel Service.** The adapter only supplies flight data.
- **Provider is swappable** via `PROVIDER` env + one new adapter file; the Travel
  Service and UI are untouched.
- **Flexible-date search is provider-independent.** Duffel has no "cheapest date"
  endpoint, so the Travel Service enumerates candidate date pairs (bounded, rate-limit
  friendly) and asks the adapter for the cheapest offer per pair. A provider that *does*
  have a native cheapest-date endpoint can implement `cheapestDates()` and skip that.
- **Daily checks + alerts:** `netlify/functions/travel-cron.js` runs on a schedule
  (see `netlify.toml`), persists real snapshots (Netlify Blobs), and fires alerts
  through the notifier seam.

## Files

| File | Role |
|---|---|
| `flight-tracker.html` | UI. Calls the Travel Service only. Honest states when not configured. |
| `netlify/functions/travel.js` | HTTP endpoint (status, cheapestDates, search, priceAnalysis, saveTrip, listTrips, history). |
| `netlify/functions/travel-cron.js` | Scheduled price check + alert loop. |
| `netlify/functions/lib/travelService.js` | Validation, normalization, best-combination rule, flexible-date enumeration. |
| `netlify/functions/lib/providers/flightProvider.js` | Provider interface + normalized types + registry. |
| `netlify/functions/lib/providers/duffelAdapter.js` | Duffel implementation (offer_requests + mapping). |
| `netlify/functions/lib/store.js` | Persistence (Netlify Blobs, memory fallback). |
| `netlify/functions/lib/notifier.js` | Alert delivery seam (log default; email seam). |
| `netlify.toml`, `package.json`, `.env.example` | Config. |

## Go live (what's required)

1. **Create a Duffel account** at <https://app.duffel.com>, then **Developer →
   Access tokens** → create a token. Test tokens start `duffel_test_`, live tokens
   `duffel_live_`. (Test mode is free; production is pay-as-you-go on bookings.)
2. **Set environment variables** on the Netlify site (Site settings → Environment
   variables) — see `.env.example`:
   - `DUFFEL_ACCESS_TOKEN` — your token
   - `DUFFEL_VERSION` — optional (defaults to `v2`)
   - `PROVIDER=duffel`
   The browser never sees these; only the Travel Service reads them.
3. **Deploy to Netlify.** Netlify installs `@netlify/blobs`, serves the static site,
   and runs the functions. The scheduled check runs per `netlify.toml`.
4. Open `flight-tracker.html`, pick a strategy, **Check live fares** → real Duffel data.

### Local development
- `netlify dev` runs the functions locally (needs Netlify CLI + `npm install`).
- Plain `python3 -m http.server` serves the static UI but **not** the functions;
  the UI then correctly shows "Travel Service not reachable" and no prices — by design.

## Switching provider
Add `lib/providers/<name>Adapter.js` implementing `FlightProvider`, register it in
`getProvider()`, set `PROVIDER=<name>`. The UI and Travel Service are untouched.
The normalized `FlightOffer` model is what the app consumes, regardless of provider.

## Future: hotels & transfers
Same pattern — add a `HotelProvider` interface + adapter behind the Travel Service.

## Notes on data ownership
- **Historical price tracking is ours:** every check writes a real snapshot; the
  chart/lowest/average/trend are computed from those.
- **Alerts** are computed from real fares; delivery is a pluggable channel
  (`log` by default; wire an email provider to enable email).
- **Rate limits:** the flexible-date search is capped and concurrency-limited; a
  provider 429 is surfaced to the UI as a friendly "try again shortly" message.
