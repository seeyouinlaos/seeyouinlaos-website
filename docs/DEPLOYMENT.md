# Deployment — See You In Laos (production)

## Platform
- **Cloudflare Worker** (Workers + Assets): the Worker serves the static site only
  (`ASSETS` binding). No backend API, no KV, no cron, no secrets.
- **Worker service / name:** `seeyouinlaos-website` (must match `wrangler.jsonc → name`).
- **Deploy path:** GitHub → Cloudflare Workers Build (builds on push to `main`).

## Configuration
- No vars, no secrets, no KV namespace required.
- `.assetsignore` excludes source/config/docs/dependencies from the public assets.

## Notes
- The Flight Tracker (Duffel integration, currency service, hotel data, market
  dashboard) has been removed from the site — it did not serve its purpose and
  added a maintenance/API-key surface with no corresponding value to guests.
- A custom domain can be attached to the `seeyouinlaos-website` Worker
  (Cloudflare → Workers & Pages → seeyouinlaos-website → Domains & Routes).
