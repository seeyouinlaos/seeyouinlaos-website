# See You In Laos — Wedding Website

The guest website for the wedding of Haruthai & Suthep, **Sunday 28 February 2027,
Luang Prabang, Laos**, plus a production **Flight Tracker** with real fares.

Deployed as a **Cloudflare Worker with static assets** (Workers + Assets): one Worker
serves the static site and runs the Flight Tracker backend + daily cron.

## Structure

```
index.html              The guest website (editorial, single page)
standalone.html         Single-file inlined build of the guest site
flight-tracker.html     The Flight Tracker UI (calls /api/travel only)
src/worker.js           Cloudflare Worker: fetch (API + assets) + scheduled (cron)
src/lib/                Platform-neutral core (Travel Service, providers, store, notifier)
wrangler.jsonc          Worker config (assets binding, KV, cron trigger, vars)
.assetsignore           What is excluded from public static assets
test/                   Test suite (node --test, no external deps)
FLIGHT-TRACKER.md       Flight Tracker architecture + deployment guide
```

## Flight Tracker (summary)

Guests save a **search strategy** (route, flexible dates, trip length, budget,
alert threshold); the app tracks the **best real fare** over time (dashboard,
history, portfolio) and can alert when a fare drops below a threshold.

- Provider: **Duffel** (real airlines, flight numbers, cabins, baggage, stops,
  durations, currency, live prices), behind a replaceable `FlightProvider` adapter.
- **No simulated prices anywhere.** Until the Worker is deployed and a token is set,
  the UI shows an honest "not reachable / not configured" state and no numbers.
- Full architecture + deployment steps: see [FLIGHT-TRACKER.md](./FLIGHT-TRACKER.md).

## Develop

```
npm install        # installs wrangler (dev/build/deploy tooling)
npm test           # run the test suite
npm run build      # wrangler dry-run bundle (verifies the Worker builds)
npm run dev        # wrangler dev — serves the site + /api/travel locally
```

## Deploy (separate phase)

See [FLIGHT-TRACKER.md § Go live](./FLIGHT-TRACKER.md#go-live-whats-required):
create a Duffel token + KV namespace, `wrangler secret put DUFFEL_ACCESS_TOKEN`,
then `wrangler deploy`. Nothing is deployed automatically.

Host target: Cloudflare only. No other hosting-platform configuration is present.
