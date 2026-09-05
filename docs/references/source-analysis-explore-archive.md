# Source Analysis — explore.zip

Analyzed: 2026-09-05 · Extracted at `scratchpad/refzips/explore/explore/` · 130 files (excl. `__MACOSX`)

## 1. Site identity

The capture is **Explora Journeys** (`explorajourneys.com`) — the luxury ocean-cruise brand of the MSC Group.

Evidence (all from inside the JS bundles and folder names):

| Evidence | Where |
|---|---|
| `https://dm.explorajourneys.com` (5×), `https://booking.explorajourneys.com` (3×) | clientlib JS bundles |
| String "Explora Journeys Brochure" (2×), `ExploraPrice`, `ExploraCartPopup`, 51× "explora" | `clientlib-site.min.*.js`, `loader.js` |
| `partnership.msccruises.com` (2×) | clientlib JS |
| Folder `Explora Journeys - Uploads from Explora Journeys/` — official YouTube channel export | archive root |
| Tech stack: Adobe Experience Manager (`clientlib-*` bundles, `assets.adobedtm.com` Launch tag), New Relic (`nr.js`), Cloudflare (`email-decode.min.js`), Coveo search (`clientlib-coveo`) | file names + contents |

**Important scope limitation:** the archive contains **no HTML pages and no CSS files**. It is an *asset* capture: 16 JS bundles, 16 images (14 PNG + 2 JPG), and a YouTube channel export (49 `.srt` subtitle files + 47 video-description `.txt` files). Every CSS-flavored fact below is mined from JS-injected `<picture>` templates, inline styles, and layout constants inside the minified bundles — not from stylesheets. There are therefore no @media stylesheet rules, no font files, and no full type scale to extract.

## 2. Inventory

| Type | Count | Notes |
|---|---|---|
| `.srt` | 49 | YouTube subtitles (English, Dutch, Korean, Italian, French, Hebrew ASR variants) |
| `.txt` | 47 | YouTube video descriptions — brand-voice corpus ("Ocean State of Mind", #luxurycruiseship) |
| `.js` | 16 | AEM clientlibs: site 190 KB, components 153 KB, base 73 KB, b2c 895 KB, coveo 1,079 KB, dependencies 165 KB, utils 14 KB, web-checkin 7 KB; plus `app.js` 870 KB, Launch 170 KB, `nr.js` 70 KB, loader/enterprise/csrf/container/email-decode |
| `.png` | 14 | 12 favicon/apple-touch icons + `An-Ocean-of-New.png` (campaign card) |
| `.jpg` | 2 | `EXVI-Hero.jpg` (master hero), `KV-hero-landscape-opt.jpg` (optimized key visual) |
| HTML / CSS | **0** | none captured |

Pages: none. Videos referenced: ~40 distinct titles (destinations, ship interiors by Patricia Urquiola, naming ceremonies, F1 Monaco, America's Cup, Jannik Sinner & Mike Horn ambassador films).

## 3. Images — SOURCE PIXELS (measured with `sips`)

| File | Pixels | Aspect ratio | Bytes | Role cluster |
|---|---|---|---|---|
| `EXVI-Hero.jpg` | 9000 × 6000 | **1.50 (3:2)** | 28,026,933 (28.0 MB) | Master hero photograph (pre-optimization original) |
| `KV-hero-landscape-opt.jpg` | 1800 × 943 | **1.909 (≈1.91:1)** | 380,356 (380 KB) | Optimized landscape hero / key visual (matches the 1.91:1 og-image ratio) |
| `An-Ocean-of-New.png` | 1266 × 910 | **1.391 (≈25:18)** | 832,157 (832 KB) | Campaign card / promo tile |
| `favicon-*.png` | 16, 32, 96, 128, 196 sq | 1:1 | 632 B – 45.5 KB | Favicon set (5 sizes) |
| `apple-touch-icon-*.png` | 57, 60, 72, 76, 114, 120, 144, 152 sq | 1:1 | 5.8 – 29.6 KB | iOS touch icons (8 sizes) |

Optimization signal: the shipped hero is 1800 px wide at 380 KB (≈0.22 bytes/px), while the 9000 px master is 28 MB — a 74× weight reduction between master and delivered asset.

## 4. Renditions — RENDERED/DELIVERED SIZES (from JS `<picture>` templates)

The AEM components request named renditions via JS-built `<picture>` markup (verbatim breakpoints from `clientlib-site` / `clientlib-components`):

```
<source media="(max-width:480px)" srcset="${e["900x600"]} 1x, ${e["900x600"]} 2x">
<source media="(max-width:767px)" srcset="${e["900x600"]} 1x, ...">
<source media="(min-width:768px)" srcset="${e["900x600"]} 1x, ${e["900x600"]} 2x">
```

| Rendition | Pixels | Ratio | Used for |
|---|---|---|---|
| `900x600` | 900 × 600 | **3:2 (1.50)** | Experience/journey cards & swiper slides, all breakpoints, 1x and 2x |
| `195x195` | 195 × 195 | 1:1 | Thumbnails @1x |
| `390x390` | 390 × 390 | 1:1 | Same thumbnails @2x (exact 2× pair) |

Picture-source media switch points: **480 px, 767 px, 768 px**.

## 5. Layout constants (measured numbers inside JS)

### Header heights (verbatim from `app.js` header controller)

```js
desktopStandardHeight = 95   // px, header at top of page
desktopStickyHeight   = 62   // px, condensed sticky header
mobileStandardHeight  = 80   // px
mobileStickyHeight    = 56   // px
mobileBreakpoint      = 1280 // px — nav switches desktop↔mobile here
```

The mega-menu logic checks `window.innerWidth < 1280` for mobile-drawer behavior and `>= 1280` for hover mega-menu.

### Breakpoints observed anywhere in the bundles

| px | Source / role |
|---|---|
| 320 | Swiper responsive config base |
| 480 | `<picture>` smallest source |
| 550 | inline skeleton CSS `max-width:550px` |
| 601 | Swiper `noSwiping` switch |
| 700 | injected widget CSS `@media screen and (max-width:700px)` (booking-widget skeleton) |
| 767 / 768 / 769 | `<picture>` tablet split + Swiper configs (`768:{spaceBetween:10}`, `769:{spaceBetween:40}`) |
| 980 | injected widget CSS `@media (max-width:980px)` |
| 1024 | one `min-width: 1024px` check |
| **1280** | **primary desktop/mobile navigation breakpoint** |

### Gaps / gutters (Swiper `spaceBetween`, px)

`0, 5, 10, 15, 24, 32, 40` — 10 px at ≥768, 40 px at ≥769 in the largest carousel; `slidesPerView` values: `1`, `"auto"`, `2.2` (featured journeys, ≥768 — deliberate peek of the next card).

### Radii (inline styles in bundles, px)

`4, 8, 10, 16, 20, 50` + `50%` (circular buttons/avatars).

## 6. Color palette (all hex values found, frequency-ordered)

| Hex | Count | Reading |
|---|---|---|
| `#222222` | 16 | primary near-black text |
| `#262626` | 7 | secondary near-black |
| `#866D4B` | 3 | **brand bronze/gold** (also used in AEM edit-mode labels, i.e. the brand accent) |
| `#9A8358` | 1 | lighter gold (icon fills) |
| `#0C2340` | 1 | deep navy (icon fill) |
| `#EDE9E4` | 1 | **warm ivory — `defaultBgColor` in the search/results UI** |
| `#6D6D6D`, `#999999`, `#B2B2B2`, `#CECECE` | 2/1/1/1 | gray ramp |
| `#F2F3F8`, `#EBECF2`, `#CBD2E1` | 2/2/1 | cool light grays (form/widget chrome) |
| `#D0241B` | 1 | error red |
| `#146FF8`, `#639AF9`, `#0A2540` | 4/2/4 | blues from third-party booking-widget skeleton, **not** brand |
| `#FFFFFF`, `#000000` | 2/1 | poles |

Brand palette signature: **warm ivory ground (#EDE9E4) + near-black ink (#222) + bronze-gold accent (#866D4B/#9A8358) + deep navy (#0C2340)**. No saturated brights in brand-owned UI.

## 7. Typography evidence (limited — no CSS/font files in capture)

- No `font-family` brand declarations and no `.woff/.woff2` files present; the site's display faces are not recoverable from this archive.
- Inline widget font sizes found: `10, 12, 14, 15, 16 px` (14 px twice — utility/widget body size).
- `text-transform: uppercase` appears in JS-emitted markup (AEM edit-mode label styled `color:#866D4B` + uppercase span) — uppercase micro-labels paired with the gold accent.
- `letterSpacing:"0"` (one occurrence). No tracking scale derivable.
- `@media (prefers-reduced-motion)` respected (1 occurrence); `matchMedia` checks for `prefers-color-scheme`, `orientation`, `any-pointer: coarse`.

## 8. Design tokens / custom properties (verbatim)

Only two true CSS custom properties, both set from JS on `document.documentElement`:

```js
document.documentElement.style.setProperty("--menu-height-desktop", "0px")
document.documentElement.style.setProperty("--menu-height-mobile",  ...)
```

(The many other `--foo` strings in the bundles are BEM modifiers like `.datepicker--active`, not tokens.) `100vh` appears once; no `object-fit` rules recoverable.

## 9. Logo / icon evidence

- 13 square icon files: favicons at 16/32/96/128/196 px, apple-touch icons at 57/60/72/76/114/120/144/152 px — a complete legacy-inclusive icon matrix.
- No SVG logo, no header-logo sizing CSS in the capture. Header total heights (95 px desktop → 62 px sticky) cap the rendered logo at roughly ≤ 60 px tall desktop, ≤ 40 px sticky, by simple arithmetic on the measured bars.

## Key takeaways for See You In Laos

- **One dominant photographic ratio:** Explora standardizes cards on 3:2 (900×600 rendition and the 9000×6000 hero master). Pick 3:2 for all card/gallery crops and stop mixing ratios.
- **Exact-2× rendition pairs** (195→390, 900 served 1x/2x): export each image role at exactly 1× and 2×, nothing in between.
- **Ship small heroes:** their delivered hero is 1800 px / 380 KB from a 28 MB master. A 1800-wide, ~300–400 KB JPEG is the luxury-site delivery norm.
- **High mobile breakpoint:** the nav goes mobile below **1280 px** — luxury mega-menus need room; don't force a cramped desktop nav at 1024.
- **Two-state header:** 95 px standard → 62 px sticky (80 → 56 mobile), exposed as `--menu-height-*` custom properties for layout math.
- **Palette discipline:** warm ivory `#EDE9E4` ground, ink `#222222`, single bronze-gold accent `#866D4B`, deep navy `#0C2340` — four brand colors plus a gray ramp, no more.
- **Gold + uppercase micro-labels** is their recurring accent pattern; gold is never a background, only ink for small elements.
- **Carousel rhythm:** `slidesPerView: 2.2` with 40 px gaps on desktop, 10 px on tablet — the fractional slide (visible peek) invites swiping without arrows.
- **Motion respect:** `prefers-reduced-motion` and pointer-coarseness checks are in the bundle; mirror both.
- **Brand-voice corpus:** the 47 YouTube descriptions ("Ocean State of Mind") show a repeatable formula — sensory verb + place-name specificity + one proof number (e.g. "126 ports in 44 countries") — usable for Laos copy.
