# See You In Laos — Wedding Website

The guest website for the wedding of Haruthai & Suthep, **Sunday 28 February 2027,
Luang Prabang, Laos**.

Deployed as a **Cloudflare Worker with static assets** (Workers + Assets): the
Worker serves the static site; there is no backend API.

## Structure

```
index.html              The guest website (editorial, single page)
standalone.html         Single-file inlined build of the guest site
src/worker.js           Cloudflare Worker: serves static assets only
wrangler.jsonc          Worker config (assets binding)
.assetsignore           What is excluded from public static assets
```

## Develop

```
npm install        # installs wrangler (dev/build/deploy tooling)
npm run build      # wrangler dry-run bundle (verifies the Worker builds)
npm run dev        # wrangler dev — serves the site locally
```

## Deploy

```
npm run deploy     # wrangler deploy
```

Host target: Cloudflare only. No other hosting-platform configuration is present.
