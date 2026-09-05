# Source Analysis — foouseasons.zip (Four Seasons capture)

Analyzed: 2026-09-05 · Archive root: `scratchpad/refzips/foouseasons` (extracted, 16 MB)

## 1. Inventory

| Fact | Value / Evidence |
|---|---|
| Site | **fourseasonsyachts.com — Four Seasons Yachts** ("Four Seasons Yachts" ×28, "fourseasonsyachts.com" ×19 in JS; logo alt = "Logo of the Four Seasons Yachts") |
| Framework | Next.js App Router client capture (`webpackChunk_N_E`, `main-app-*`, `layout-*`, `page-*` chunks; `polyfills-*`) |
| CMS | Contentful (`ctfassets.net`, `fields.file.url`, image API `?fm=webp&q=75`) |
| UI stack | Ant Design (cssinjs tokens in-bundle) + CSS Modules (`Hero_heroComponent__…`) + styled-jsx + Swiper web components; fonts via next/font + Monotype (`cdn.fonts.net` MTI tracking, project `5002c5a8-…`) |
| Page(s) captured | Region page **/regions/mediterranean/grand-mediterranean** (both `Regional_Maps_*_Grand_Mediterranean` images present); chunks also cover /voyages, /contact-us, /schedule-meeting, /my-profile, /vessels/four-seasons-1/suites, schedule-deposit flow |
| Files (excl. `__MACOSX`) | 43 real files: **26 .js** (largest: 6459 = 993 KB, 2899 = 865 KB, 7971 = 467 KB, 4399 = 439 KB), **9 .webp**, **6 .jpg**, **2 .png** (favicon 16×16, apple-touch-icon 180×180), 1 empty dir `No valid account found!instagram` (failed Instagram-feed API response — site has an IG feed section) |
| HTML / CSS files | **None captured.** All CSS facts below come from JS-embedded styles (inline style objects, styled-jsx strings, antd tokens); CSS Modules stylesheets were not saved |

## 2. Images — SOURCE PIXELS (measured with sips)

| File | Pixels | Ratio (computed) | Format | Size | Role cluster |
|---|---|---|---|---|---|
| Portoferraio-Elba-Italy_shutterstock_ID_2484972053 | 4752×3168 | 1.500 = **3:2** | webp | 5,043 KB | destination hero/feature (uncompressed master) |
| SantaCruzGettyImages-2258667559_ | 4009×3005 | 1.334 = **4:3** | webp | 3,816 KB | destination feature |
| GettyImages-Marrakech_Souk_compressed | 2106×1406 | 1.498 ≈ **3:2** | webp | 486 KB | port/destination card |
| Ischia__Italy | 2106×1406 | 1.498 ≈ **3:2** | webp | 388 KB | port/destination card |
| GettyImages-Lanzarote_Canary_Islands_Spain_compressed | 2106×1406 | 1.498 ≈ **3:2** | webp | 335 KB | port/destination card |
| Cassablanca_Four_Seasons_Hotel.compressed | 2106×1406 | 1.498 ≈ **3:2** | webp | 274 KB | port/destination card |
| Exumas_two_snorklers | 2100×1500 | 1.400 = **7:5** | webp | 323 KB | experience card |
| Regional_Maps_Grid_Desktop_v2_Grand_Mediterranean | 5367×3013 | 1.781 ≈ **16:9** | webp | 235 KB | itinerary map, desktop |
| Regional_Maps_Mobile_v1_Grand_Mediterranean | 3234×2425 | 1.334 = **4:3** | webp | 159 KB | itinerary map, mobile |
| 10242920407007954 | 843×1192 | 0.707 = **1:1.414 portrait** (1/√2) | jpg | 109 KB | suite/editorial portrait card |
| 10242920407567968 | 843×1192 | 0.707 portrait | jpg | 97 KB | portrait card |
| 10242920407927977 | 843×1192 | 0.707 portrait | jpg | 84 KB | portrait card |
| 10242920406647945 | 843×1192 | 0.707 portrait | jpg | 80 KB | portrait card |
| 10242920406047930 | 1274×720 | 1.769 ≈ **16:9** | jpg | 127 KB | wide media block |
| FSY_2024.02.28_marinaopen | 1290×1290 | 1.000 = **1:1** | jpg | 184 KB | Instagram/social square |

Recurring ratio clusters (from real dimensions): **3:2 landscape ×5** · **1:1.414 portrait ×4** (the four DAM `102429204…` ids share one exact template 843×1192) · **4:3 ×2** · **~16:9 ×2** · **1:1 ×1**. The 2106×1406 quartet shows a standardized 2106-px-wide "compressed" delivery size for card imagery.

Naming/variant patterns: explicit **Desktop_v2 / Mobile_v1** art-directed map variants (not one image resized — mobile is a different 4:3 crop); `_compressed` suffix convention; Contentful delivery URLs get `?fm=webp&q=75` appended in code: `e.fields.image.fields.file.url+"?fm=webp&q=75"`.

## 3. HTML / JS image plumbing

| Item | Measured value |
|---|---|
| next/image `deviceSizes` | `[640,750,828,1080,1200,1920,2048,3840]` (verbatim in bundle) |
| next/image `imageSizes` | `[16,32,48,64,96,128,256,384]` |
| Image props in components | `fill:!0` ×6, `priority:!0` ×3, `quality:75` ×2 — hero/cover images use fill + priority at q75 |
| Hero markup | `<swiper-container effect="fade" space-between="0" pagination-type="bullets" autoplay …>` inside `Hero_heroComponent`; optional `tint-overlay` div (`position:absolute; z-index:1; width/height:100%`, background from CMS); full-screen by default with `noFullScreen` / `withAspectRatio` modifier classes; supports Vimeo desktop + `vimeoMobileId` mobile video |
| Art-directed hero fields | Contentful `heroImage` + separate `heroImageMobile` (mobile file wins when present) |
| Captions | Contentful rich-text renders `<figure><img/><figcaption>{description}</figcaption></figure>` — caption text comes from the asset's description field |
| Content pattern | `eyebrow → title → body → cta` prop chain appears in 72 places (`.eyebrow` class in CountdownCard, ContactUsCard, ImageCarouselText, etc.); headings are h2/h3 with module classes `.title`/`.subtitle` |

## 4. CSS metrics (from JS-embedded styles — RENDERED CSS SIZE, not source pixels)

### Breakpoints
| Source | Values (px) |
|---|---|
| Ant Design screen tokens | XS 480 · SM 576 · MD 768 · LG 992 · XL 1200 · XXL 1600 |
| Swiper carousel configs | 320 · 640 · 768 · 1024 · 1208 · 1400 |
| styled-jsx in components | `@media only screen and (max-width: 768px)` ×3; `@media screen and (max-width: $xs)` (=480) |

### Carousels (gapless peek pattern, `spaceBetween:0`)
| Carousel | 320 | 640 | 768 | 1024 | 1208 | 1400 |
|---|---|---|---|---|---|---|
| Cards (large) | 1.15 | 2.15 | 2.15 | 2 | 3 | 3 |
| Thumbnails (small) | 2.5 | 3.5 | 4.5 | 3.5 | 5.5 | — |

Fractional slidesPerView (1.15 / 2.15 / 2.5 / 3.5 / 4.5 / 5.5) = next card always peeks; gap between slides is **0** (image-to-image, hairline-free).

### Widths, spacing, hairlines, radii
| Metric | Measured |
|---|---|
| Form/content max-widths | 385 px, 468 px, **537 px** (main contact form, `margin:0 auto`), 632 px |
| Section padding | `60px 0` ×5, `40px 0` ×2 |
| Stack rhythm (inline styles) | marginTop 4 / 8 / 20 / 24 / 32 / 36 / 40 px; gaps 12 / 16 px |
| Input fields | height **32px**, `border-bottom: 1px solid #515252`, background transparent (hairline-underline inputs, no boxes) |
| Radii | `borderRadius:0` ×19 (dominant — square everything); 50%/99/100px only for circular controls & pagination bullets |

### Typography
| Metric | Measured |
|---|---|
| Display face | **SaolDisplay** (`fontFamily:"'SaolDisplay', 'SaolDisplay Fallback'"`, next/font, exposed as CSS var) |
| Text face | **HelveticaNeue** (`'HelveticaNeue', 'HelveticaNeue Fallback'`, var `--font-helvetica`) |
| Micro-label spec (verbatim) | `fontSize:"10px", textTransform:"uppercase", letterSpacing:"2px", marginBottom:"8px", fontFamily:"var(--font-helvetica)"` → 10px caps at +0.2em tracking |
| Inline px sizes seen | 10, 12 (error/footnote), 14 (body/UI), 20, 24 (icon glyphs) — display sizes live in uncaptured CSS Modules |
| Line-height / weight | `lineHeight:"28px"` (14px body → 2.0); weights 100 (large glyphs) and 400 |
| Uppercase | labels/eyebrows uppercase; body `textTransform:"none"` |

### Palette (hex, brand-attributable occurrences; antd defaults excluded)
| Hex | Role (evidence) |
|---|---|
| **#171715** | ink / near-black — icon fills, chevron SVGs, stepper glyphs (warm black, not #000) |
| **#515252** | hairline gray — 1px input underlines |
| #666666 | secondary text/UI gray |
| #ffffff / #000000 | base + tint-overlay/scrim (`rgba(0,0,0,.5)` scrims ×5) |
| #ff4d4f | form error/required asterisk (antd red kept) |
| #dff3fb | ContactUsCard default background (pale sky) |

## 5. Design tokens / custom properties (verbatim)

- `deviceSizes:[640,750,828,1080,1200,1920,2048,3840]` · `imageSizes:[16,32,48,64,96,128,256,384]`
- `var(--font-helvetica)` (next/font variable; Saol equivalent `__variable_ca72a7`, Helvetica `__variable_ed8cd4`)
- Antd tokens consumed: `screenXS:480, screenSM:576, screenMD:768, screenLG:992, screenXL:1200, screenXXL:1600`
- App-level antd overrides found: `theme:{token:{motion:!1, zIndexPopupBase:0}}` and `components:{InputNumber:{handleVisible:!0}}` — brand styling deliberately lives outside the UI kit, in CSS Modules
- No `:root { --… }` design-token sheet in the capture (CSS files absent)

## 6. Logo evidence

| Fact | Value |
|---|---|
| Assets | `/logo.svg` (light) and `/logo-dark.svg` — swapped by context, not recolored |
| Rendered size | default **88×48 px** (`width:i||88, height:o||48`); styled-jsx forces **88×48 at ≤480px** too — logo never scales down |
| Ratio | 88:48 = 1.83:1 (11:6) |
| Placement | `.headerLogo` in header with page-context modifiers (`isMyProfile`, `isCulinaryPage`) |
| Alt text | "Logo of the Four Seasons Yachts" |

## Key takeaways for See You In Laos

- Separate art-directed mobile images (Desktop_v2 vs Mobile_v1 crops, `heroImageMobile` field) — don't just shrink the desktop hero.
- Standardize card imagery on one delivery size per role: 2106×1406 (3:2) landscape cards, 843×1192 (1:1.414 portrait) editorial cards.
- Full-bleed fade-carousel hero with a CMS-driven scrim overlay (`rgba(0,0,0,.5)` tint div at z-index 1) and bullets — no arrows.
- Gapless peek carousels: fractional slidesPerView (1.15 / 2.15 / 3.5) with 0 gap signals swipeability without buttons.
- Luxury micro-label formula, verbatim: 10px uppercase, +2px (0.2em) letter-spacing, 8px below, sans face — pair with a serif display (Saol ↔ our serif).
- Hairline discipline: 1px #515252 underline inputs on transparent bg, 32px tall; border-radius 0 everywhere except perfect circles.
- Warm near-black ink #171715 instead of pure #000 — matches our existing charcoal direction.
- Narrow, centered forms: 537px max-width column; section rhythm 60px vertical padding.
- Fixed small logo (88×48) at every viewport — restraint beats a giant wordmark.
- Serve webp at q75 (`?fm=webp&q=75` / next/image quality 75) with deviceSizes up to 3840 for retina heroes.
