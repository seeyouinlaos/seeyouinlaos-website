# See You In Laos — Wedding Website

The guest website for the wedding of Haruthai & Suthep, **Sunday 28 February 2027,
Luang Prabang, Laos**.

Deployed as a **Cloudflare Worker with static assets** (Workers + Assets): the
Worker serves the static site; there is no backend API.

## Structure

```
index.html                 The guest website (editorial, single page)
robots.txt                 Search-engine crawl policy

assets/
  fonts/                   PP Editorial Old (.otf)
  vendor/                  Third-party JS (GSAP, ScrollTrigger, SplitText)
  images/
    hero/                  Hero background + aerial shot
    story/                 "Our Story" section images
    timeline/              Weekend timeline thumbnails
    cards/                 Place-detail preview cards
    preview/               Place-detail panel images
    dressguide/            Dress-guide gallery (alms / ceremony / cruise)
    dining/                Dining section image

build/
  standalone.html          Generated: single-file inlined build of index.html
                            (portable for offline sharing — never edit by hand,
                            regenerate with `npm run build:standalone`)

docs/
  PRODUCT.md               Product/brand register
  DEPLOYMENT.md            Deployment notes

src/
  worker.js                Cloudflare Worker: serves static assets only
  build-standalone.cjs     Generates build/standalone.html from index.html

wrangler.jsonc              Worker config (assets binding)
.assetsignore                What is excluded from public static assets
```

## Develop

```
npm install               # installs wrangler (dev/build/deploy tooling)
npm run build             # wrangler dry-run bundle (verifies the Worker builds)
npm run build:standalone  # regenerate build/standalone.html after editing index.html
npm run dev                # wrangler dev — serves the site locally
```

## Deploy

```
npm run deploy     # wrangler deploy
```

Host target: Cloudflare only. No other hosting-platform configuration is present.
