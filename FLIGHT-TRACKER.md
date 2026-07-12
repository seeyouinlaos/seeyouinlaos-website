# Flight Tracker — Travel Service (production architecture)

A real flight-price tracker for the See You In Laos wedding website. Guests save a
**search strategy** (route, flexible dates, trip length, budget, alert threshold);
the app tracks the **best real fare** over time, shows a dashboard/history/portfolio,
and can alert when a fare drops below a threshold.

**No prices are simulated.** Fares, airlines, flight numbers, times, connections,
baggage and cabin classes come from a real provider (**Duffel**) through a
replaceable adapter.

## Platform

Deployed as a **Cloudflare Worker with static assets** (Workers + Assets). One
Worker both serves the static site (via the `ASSETS` binding) and runs the backend
API + daily cron — which is what lets Cloudflare attach Secrets like
`DUFFEL_ACCESS_TOKEN`. (A static-assets-only deployment cannot hold Secrets.)

## Architecture

```
Browser UI (flight-tracker.html)         ← never holds an API token
        │  POST /api/travel
        ▼
Cloudflare Worker (src/worker.js)
        │  fetch()  → Travel Service (API)      scheduled() → daily cron
        ▼
Travel Service (src/lib/travelService.js)
        │  validates, normalizes, owns the "best combination" rule,
        │  and builds the flexible-date landscape from searchOffers
        ▼
Provider Adapter (src/lib/providers/duffelAdapter.js  implements  flightProvider.js)
        │  the ONLY provider-specific code — swappable behind the interface
        ▼
Duffel Flight Offers API
```

- **Business logic stays in the app / Travel Service.** The adapter only supplies flight data.
- **Provider is swappable** via `PROVIDER` var + one new adapter file; the Worker,
  Travel Service and UI are untouched.
- **Flexible-date search is provider-independent** (Travel Service enumerates date
  pairs, bounded + concurrency-limited, and asks the adapter for the cheapest offer per pair).
- **Daily checks + alerts:** the Worker's `scheduled()` handler runs on a Cron
  Trigger (`wrangler.jsonc → triggers.crons`), persists real snapshots to **KV**,
  and fires alerts through the notifier seam.
- **Persistence:** Cloudflare **KV** (`env.KV`), no external DB.

## Files

| File | Role |
|---|---|
| `flight-tracker.html` | UI. Calls `/api/travel` only. Honest states when not configured. |
| `src/worker.js` | Cloudflare Worker: `fetch` (API + static assets) + `scheduled` (cron). |
| `src/lib/travelService.js` | Validation, normalization, best-combination rule, flexible-date enumeration. |
| `src/lib/providers/flightProvider.js` | Provider interface + normalized types + registry. |
| `src/lib/providers/duffelAdapter.js` | Duffel implementation (offer_requests + mapping). |
| `src/lib/store.js` | Persistence — `createStore(env.KV)` (KV, memory fallback). |
| `src/lib/notifier.js` | Alert delivery seam (log default; email seam). |
| `wrangler.jsonc`, `.assetsignore`, `package.json`, `.env.example` | Config. |

## Go live (what's required)

1. **Create a Duffel account** at <https://app.duffel.com> → **Developer → Access
   tokens** → create a token (test starts `duffel_test_`, live `duffel_live_`).
2. **Create a KV namespace** and paste its id into `wrangler.jsonc` → `kv_namespaces`:
   ```
   npx wrangler kv namespace create KV
   ```
3. **Set the Duffel token as a Worker Secret** (never committed):
   ```
   npx wrangler secret put DUFFEL_ACCESS_TOKEN
   ```
   Non-secret vars (`PROVIDER`, `DUFFEL_VERSION`, `SITE_ORIGIN`, `NOTIFY_CHANNEL`)
   are in `wrangler.jsonc → vars`.
4. **Deploy the Worker:**
   ```
   npx wrangler deploy
   ```
   This uploads the Worker + static assets and registers the Cron Trigger.
5. Open the site, go to the Flight Tracker, pick a strategy, **Check live fares** →
   real Duffel data.

### Local development
- `npx wrangler dev` runs the Worker (API + assets) locally with your vars/secrets.
- A plain static file server serves the UI but **not** `/api/travel`; the UI then
  correctly shows "Travel Service not reachable" and no prices — by design.

## Flight Market (monitored-route dashboard)

Before any search, the Flight Tracker shows a live **market** of ten monitored
routes (long-haul feeders into Bangkok plus the two Bangkok–Luang Prabang hops).
It is provider-independent and real:

- `src/lib/monitoredRoutes.js` — the ten routes, the country→airport map used for
  country-aware journey defaults, and the sample date each route is priced on.
- `marketOverview(env, store, {refresh})` (Travel Service) asks **every configured
  provider** (`getProviders`) for the cheapest live offer per route, keeps the
  best, and persists a daily snapshot (`store.appendRouteSnapshot`). Cards are
  computed from real history: current best, change vs previous, 7-day sparkline,
  30-day low, live-offer count, trend and last-updated. With one snapshot a card
  reads **“Collecting history…”** and keeps the same layout; the daily cron
  (`refreshMarket`) deepens the series so it becomes a true market over time.
- Multi-provider ready: each offer carries a provider-neutral booking descriptor
  `{ provider, offerId, bookingUrl, branding, checkoutType }` plus an
  `itineraryKey`, so identical itineraries from different providers can be grouped
  and the UI attributes offers through `branding` — never a hard-coded provider.
  Adding Amadeus/Sabre/Travelport/an airline API is one adapter + one registry
  entry; the dashboard, comparison and cards do not change.

The UI persists last search, journey, currency, filters, sorting, comparison and
scroll (session + local storage) so the Back button restores the exact previous
state. The **wedding journey** is an editable multi-leg builder (change/search
airports, swap, change dates, delete, duplicate, add legs); it stays visible
after every search and never locks.

## Multi-currency (provider-native first)

The rule: prefer **provider-native** pricing — a flight provider that can price in
the requested currency (`FlightProvider.supportsCurrency`) is used verbatim and
never converted. Only when it cannot does the Travel Service convert, once.

Where rates come from is a **pluggable abstraction**, not a hardcoded table:

- `src/lib/fx/exchangeRateProvider.js` — the `ExchangeRateProvider` interface plus
  implementations: **ECB** and **exchangerate.host** (live, no key), **Open
  Exchange Rates / Fixer / CurrencyLayer** (live, key via secret), and **static**
  (indicative offline fallback). `FX_PROVIDER` (wrangler var, default `ecb`)
  selects one; the app never knows where rates originate.
- `src/lib/fx/currencyService.js` — asks the provider for its base rates,
  **caches** them (in-process memo + KV, honouring the provider TTL), cross-computes
  any pair, converts once, and preserves the provider-native `source`. On a live
  failure it falls back to the indicative static table and marks it. It never
  mutates the caller's money and never fabricates an unknown pair (returns null).
- `src/lib/money.js` now holds only currency facts (supported set + default); no
  rates live in the app.

Converted money is marked `converted:true`; the UI shows a subtle
“≈ Converted from EUR”. When the provider returns the requested currency
natively, nothing is shown. The selector (🇺🇸 USD default, 🇪🇺 EUR, 🇹🇭 THB)
re-prices the market, results, comparison, journey, hotels and tracked routes and
persists across sessions.

**Historical rates.** Market/price history is always stored in the provider-native
currency; the display currency is applied on read at the current rate, so history
stays consistent and traceable and is never mutated.

**One Money library.** `money.js` (repo root, UMD) is the single place for
rounding, currency symbol, locale, formatting, conversion math and the
native/converted marking. It is `require`d by the Worker (CurrencyService, Travel
Service) AND loaded by the browser via `<script src="money.js">`, so Flight
Market, flight cards, comparison, journey, hotel cards and hotel overview all
format through the exact same code. The browser holds no rate table: it reads the
current rates from the `rates` action (same rates the server uses) to display
locally-held native values.

**Hotels on the same layer.** `src/lib/providers/hotelProvider.js` (a `HotelProvider`
mirroring `FlightProvider`) plus the `hotels` action price the collection through
the SAME CurrencyService and Money library (USD-native planning prices → EUR/THB
on display, native preserved). Adding Expedia Rapid / Booking.com / Google Hotels /
Amadeus Hotels is one adapter; no currency logic and no UI change.

**Hotel data quality (permanent rule).** Never invent hotel data. Every hotel is a
real official property; only VERIFIED fields (from the hotel's official website)
are filled — anything unverified is left empty, never fabricated (no invented
descriptions, facilities, room categories, contacts, images, logos or copy). The
`curated` provider is a FIXED editorial set, intentionally not live search
results: **planning prices only**, shown with the note *"Approximate February
planning rates. Exclusive wedding rates may be available through our Guest
Relations Team."*
- Luang Prabang: the exclusive wedding hotel (Avani+ Luang Prabang Hotel), shown
  separately, arranged in the wedding block (no advertised rate, no alternatives).
- Bangkok collection (fixed): Capella · Four Seasons at Chao Phraya River · Siam
  Kempinski · 137 Pillars Suites & Residences · Oakwood Studios Sukhumvit · The
  Salil Riverside, with the owner's planning prices.
Each hotel exposes **two booking paths** (switchable per hotel via a `primary`
flag, no UI change): `direct` (official booking page) and `guest-relations`
(request the exclusive wedding rate by email). A live hotel provider replaces the
curated one behind the same interface.

## Switching provider
Add `src/lib/providers/<name>Adapter.js` implementing `FlightProvider`, register it
in `getProvider()`, set `PROVIDER=<name>`. The Worker, Travel Service and UI are
untouched. The normalized `FlightOffer` model is what the app consumes.

## Future: hotels & transfers
Same pattern — add a `HotelProvider` interface + adapter behind the Travel Service.

## Notes on data ownership
- **Historical price tracking is ours:** every check writes a real snapshot to KV;
  the chart/lowest/average/trend are computed from those.
- **Alerts** are computed from real fares; delivery is a pluggable channel
  (`log` by default; wire an email provider to enable email).
- **Rate limits:** the flexible-date search is capped and concurrency-limited; a
  provider 429 is surfaced to the UI as a friendly "try again shortly" message.
- **Airport search:** the origin/destination fields autocomplete via the `places`
  action (Duffel Places suggestions); the Travel Service action set is
  `status · places · cheapestDates · search · priceAnalysis · saveTrip · listTrips · history`.

## Verified end-to-end (Duffel test API)

Confirmed against the live Duffel test API through the real Travel Service:
airport search (e.g. LPQ Luang Prabang), flight search + offer retrieval
(real carriers, flight numbers, cabins, baggage, durations), price tracking /
timeline updates, error handling and loading states. The token is provided only
as the Worker secret `DUFFEL_ACCESS_TOKEN` (or a git-ignored `.dev.vars` locally);
it is never committed.
