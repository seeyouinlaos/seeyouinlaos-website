# Deployment — See You In Laos (production)

Status: **live and verified** (2026-07-12).

## Platform
- **Cloudflare Worker** (Workers + Assets): one Worker serves the static site
  (`ASSETS` binding) and the `/api/travel` backend + the daily market cron.
- **Worker service / name:** `seeyouinlaos-website` (must match `wrangler.jsonc → name`).
- **Live URL:** https://seeyouinlaos-website.suthep-hrg.workers.dev
- **Deploy path:** GitHub → Cloudflare Workers Build (builds on push to `main`).
- **KV namespace:** `seeyouinlaos-kv`, binding **`KV`**, id `4b56c4f479b24e18b134d582cb268f1a`.

## Configuration
- **Vars** (`wrangler.jsonc`): `PROVIDER=duffel`, `DUFFEL_VERSION=v2`,
  `FX_PROVIDER=ecb` (live ECB rates), `NOTIFY_CHANNEL=log`, `SITE_ORIGIN` (see notes).
- **Secret** (Cloudflare, never in repo): **`DUFFEL_ACCESS_TOKEN`** — set on the
  `seeyouinlaos-website` Worker. `status.configured` reflects its presence.
  Set/rotate with `npx wrangler secret put DUFFEL_ACCESS_TOKEN`.
- Provider selection is env-driven and provider-independent: `PROVIDER` /
  `PROVIDERS` (flights), `FX_PROVIDER` (rates), `HOTEL_PROVIDER=curated` (hotels).

## Canonical wedding travel dates (monitored market)
All monitored origins are priced on the same guest journey (one-way legs):
`Origin → Bangkok 2027-02-21` · `Bangkok → Luang Prabang 2027-02-27` ·
`Luang Prabang → Bangkok 2027-03-01`. Wedding: 2027-02-28.

## Production verification (live Worker, direct HTTP)
- `status` → `{ok, provider: duffel, configured: true}`.
- **Flight Market** → live Duffel fares, 10 routes, canonical Feb-2027 dates, real
  airlines/prices (USD/EUR/THB).
- **search** → live offers with currency conversion (native currency preserved).
- **hotels** → 7 real hotels (Avani+ Luang Prabang wedding hotel + fixed Bangkok
  collection) through the same Money/Currency layer.
- **currency** → EUR native / USD·THB converted; live **ECB** rates via KV cache.
- **KV** → read+write verified (`saveTrip`/`listTrips`).
- **runtime** → no 5xx across status/market/search/hotels/rates/places/
  cheapestDates/saveTrip/listTrips; assets `/`, `/flight-tracker`, `/money.js` → 200.
- Test suite: 34/34 (`node --test`). Config validated with `wrangler deploy --dry-run`.

## Notes / owner follow-ups (non-blocking)
- **Custom domain:** attach to the `seeyouinlaos-website` Worker
  (Cloudflare → Workers & Pages → seeyouinlaos-website → Domains & Routes).
- **`SITE_ORIGIN`** currently points to a placeholder (`seeyouinlaos.pages.dev`).
  Harmless (the app runs same-origin), but set it to the custom domain once
  connected, or remove to default to `*`.
- A throwaway KV record `trip:verify-prod-1` was written during verification; it is
  inert (no alert email) and can be deleted from the KV namespace.
- A parallel static mirror also builds to GitHub Pages
  (`seeyouinlaos.github.io/seeyouinlaos-website/`); it is static-only and has no
  `/api/travel`. The Cloudflare Worker is the production target.

## Go-live checklist (done unless noted)
- [x] KV namespace created and bound (`KV` = seeyouinlaos-kv).
- [x] Worker name matches the connected service (`seeyouinlaos-website`).
- [x] `DUFFEL_ACCESS_TOKEN` secret set (rotate if the value was ever shared).
- [x] Cloudflare Workers Build green on `main`.
- [x] Live endpoints + KV + FX + hotels verified.
- [ ] Custom domain connected (owner).
- [ ] `SITE_ORIGIN` updated to the custom domain (owner, optional).
