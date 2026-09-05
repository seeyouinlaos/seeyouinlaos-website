# Source Analysis — aman.zip (Aman website capture)

Analyzed: 2026-09-05. Source: browser "save page" capture of **amanatsea.com** (Aman at Sea — the Amangati yacht site), a Next.js App Router build (React 19.2 canary). All measurements below were taken directly from the archive files with `sips`, `du`, and pattern extraction from the compiled JS chunks.

Important capture caveat: **no `.html` and no `.css` files were saved.** The site is Tailwind-based; every utility class lives inside the 31 JS chunks (className strings), so all "rendered CSS" facts below are extracted verbatim from those chunks. Two empty folders named `Plugin Defect!UNSUPPORTED_STREAMING_TYPE_HLS_SPLIT_AUDIO_VIDEO_*` and `No valid account found!amanatsea` prove the live page ran an **HLS video hero** that the saver could not serialize.

---

## 1. Inventory

| Type | Count | Notes |
|---|---|---|
| JS chunks | 31 | Next.js: `webpack`, `main-app`, `polyfills`, 2× `layout`, 1× `page`, 20 shared chunks + `gtm.js`, `otSDKStub.js` (OneTrust), `pd.js` |
| JPG images | 18 | content photography (see §2) |
| PNG | 1 | `dot.png` 1×1 tracking pixel |
| TXT | 1 | YouTube description "Introducing Amangati — Aman at Sea's Inaugural Yacht" (94 guests, 47 suites, 8 dining venues) |
| CSS / HTML | 0 | not captured — CSS is inlined in JS class strings |

Largest chunks: `c36f3faa` 1.6 MB (app framework + Mapbox), `c473e9eb` 568 KB (page components incl. deck plans), `2533` 436 KB.

## 2. Images — SOURCE PIXELS (measured with sips)

| File | Measured px | Ratio | File size | Role (by cluster) |
|---|---|---|---|---|
| Homepage_Hero_3840x2160 | 3840×2160 | 16:9 (1.778) | 1.2 MB | Hero (video poster class) |
| Split-Block-Atlantic-Passage-2880x1780px | 2880×1780 | **1.618 (golden)** | 400 KB | Split-block landscape |
| Amangati_Marina_04 / Spa_04 / Grand_Suite_01 / Amanzoe-Gardens (×4) | 1890×1167 | **1.620 (golden)** | 1.5–3.2 MB | Gallery/carousel landscape |
| AG270527-Saint-Tropez + 2 UUID jpgs (×3) | 1394×1394 | 1:1 | 0.5–0.95 MB | Square card @2x |
| Mediterranean, Caribbean (×2) | 1200×1200 | 1:1 | 0.4–1.7 MB | Square card (destination) |
| Destinations-Dubrovnik (named 1200x1200) | 800×800 actual | 1:1 | 116 KB | Square card @1x |
| 4 numeric-ID jpgs (13204381…) | 960×1200 | 4:5 | 32–188 KB | Portrait social/ad assets |
| briefumschlaege… (stray stock photo) | 1000×1000 | 1:1 | 48 KB | Not Aman — envelope stock image |
| dot.png | 1×1 | — | tracking pixel | — |

Recurring source ratios: **1.618:1 golden-ratio landscape** (1890×1167, 2880×1780), **1:1 square** (1394, 1200, 800), **4:5 portrait** (960×1200), 16:9 only for the hero poster. All JPG (no webp/avif files saved, but the runtime requests `format:"webp"` — see §3). Filenames carry the intended size (`_1890x1167px`), i.e. assets are pre-cut per slot; Dubrovnik shows a 1x fallback (800) of a 1200 slot ⇒ retina variants exist server-side.

## 3. Responsive image pipeline (from JS, verbatim)

next/image config: `deviceSizes:[640,750,828,1080,1200,1920,2048,3840]`, `imageSizes:[16,32,48,64,96,128,256,384]`, default `format:"webp"`, `quality:90` (hero) / `quality:75` (default).

Per-component image contract (verbatim object in chunk `c473e9eb`) — **this is Aman's actual image-role system**:

| Component | Desktop | Tablet | Mobile | Ratio |
|---|---|---|---|---|
| HeroImage | 1440×887 | 1024×633 | 600×370 | 1.623 (golden) |
| SplitBlock | 945×584 | 700×432 | 500×309 | **1.618** |
| CardVoyage | 448×448 | 448×448 | 350×350 | 1:1 |
| CardSquare | 338×338 | 338×338 | 300×300 | 1:1 |
| CardPortrait | 338×445 | 338×445 | 300×395 | 0.76 (3:3.95) |
| Card3Stack | 448×589 | 448×589 | 350×460 | 0.76 |
| Card2Stack | 696×696 | 500×500 | 350×350 | 1:1 |
| CardSuiteDetails | 860×600 | 700×488 | 400×279 | 1.433 |
| MapboxPort | 350×350 | 300×300 | 300×300 | 1:1 |

`sizes` attributes found (verbatim): `"(min-width: 1024px) 1440px, 100vw"` (hero), `"(min-width: 1024px) 945px, (min-width: 768px) 700px, 100vw"` (split block), `"(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"` (3-up card grid), `"(min-width: 768px) 448px, 90vw"`, `"(min-width:1280px) 600px, (min-width:768px) 450px, 100vw"`, `"150px"` (header logo), `"(min-width: 1024px) 200px, 104px"` (menu feature image), `"100vw"`.

Hero markup: `HeroImage` = section > div.hero-image > next/image with `fill`, `sizes:"100vw"`, `priority` when not lazy, `object-fit`. `HeroVideo` = `video-container > hero-video > video-scale-wrapper` with Vimeo iframe or HLS `video`, plus a `desktop-only` class (separate mobile treatment). Section enum: `hero, content, carousel, cards, textBlock, callToAction, textList, tabs, forms`.

## 4. Rendered CSS system (extracted Tailwind classes)

### Root font size = 14px (proven)
`text-[1.3571428571rem]` co-exists with `text-[19px]`; `text-[0.722rem]` with `text-[10.108px]`; `text-[2.22rem]` with `text-[31.08px]`; `tracking-[0.0357142857rem]` = exactly 0.5px — all only true at **html { font-size: 14px }**. Every rem below is converted at 14.

### Breakpoints
Tailwind default prefixes in heavy use: `sm:` 640px (87 uses), `md:` 768px (130), `lg:` 1024px (167), `xl:` 1280px (66), `2xl:` (1). Extra raw queries: `min-width: 701px`, `(min-width:800px) and (max-width:1023px)`, `min-width:820px` (mobile drawer cutoff), `max-width:1100px` / `min-width:1101px` (nav collapse). **Primary desktop switch is 1024px.**

### Containers & gutters
| Element | Value |
|---|---|
| Header/nav shell + mega-menu panel | `max-w-[1600px]` |
| Main content container | `max-w-[1440px]` (13 uses; also 1489, 1360, 1358, 1289 variants) |
| Prose/text block | `max-w-[680px]` (9 uses); also 600, 575 |
| Card | `max-w-[448px]` |
| Page gutter (header) | `px-[1.75rem]` = 24.5px; content gutters `px-[24px]`, `px-[25px]`, `px-[30px]`, footer `mx-[24.5px]` |

### Section spacing
Dominant rhythm: **`my-[65px]`** (11×) + `mt-[65px]`/`mb-[65px]`/`py-[65px]` — one 65px section spacer used everywhere. Secondary: 30px, 20px steps. One section wrapper verbatim: `"my-[65px] mx-auto w-full sm:w-[95%] md:w-full min-h-0 sm:min-h-screen"`.

### Header (verbatim evidence)
`header` = `top-0 left-0 z-30 fixed px-[1.75rem] lg:border-transparent w-full ease-in-out` + `duration-100/200` by scroll direction. Inner bar = `grid grid-cols-3 mx-auto py-[11px] lg:pt-[36px] lg:pb-[28px] w-full max-w-[1600px]` with `transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`, condensing to `lg:!py-[12px]` on scroll. Heights ⇒ ~62px mobile bar, ~128px desktop at top, ~64px condensed.

### Hero height
No `h-[100vh]` hero class captured (hero-section CSS module file missing); evidence: `sm:min-h-screen` section wrapper, `min-h-screen` overlays, `h-[60vh]`, `max-h-[85vh]`/`[90vh]` for modals. Hero image contract is ratio-driven (1440×887 ≈ 61.6vw height at full bleed) with `fill` + `object-fit`, `object-cover` (8×) / `object-contain` (10×, logos).

### Grids & gaps
`grid-cols-1` (15), `grid-cols-2` (11), `grid-cols-3` (6), asymmetric split `grid-cols-[1fr_1.9091fr]` / `[1.9091fr_1fr]` (≈ golden split, 34.4/65.6), `grid-cols-[322px_1fr]` (sidebar). Gaps: `gap-2` 8px, `gap-[24px]`, `gap-4` 16px, `gap-8` 32px, `gap-x-6`/`gap-x-12`, `gap-[25px]`.

### Aspect-ratio utilities
`aspect-square` (7), `aspect-[945/583.5]` (= 1.6195, golden), `aspect-[338/445]`, `aspect-[3/3.95]`, `aspect-[1/2]`.

### Borders / hairlines / radius
Hairlines everywhere at 1px in cool gray: `border-[#DAD9D7]` (9), `border-[#d9d9d7]` (8), `border-aman-cool-gray` (12), `border-b-[1px]`, `h-[1px]` rules (5). Radius: essentially **zero on imagery and cards**; `rounded-full` (9) only for dots/controls, small `rounded` for tooltips/chips.

### Motion
`duration-300` (14) default, `duration-500` (9, header/logo), `duration-200`/`100` (scroll direction), `ease-[cubic-bezier(0.4,0,0.2,1)]`; `@media (prefers-reduced-motion: reduce)` honored.

## 5. Typography system

Fonts (verbatim fontFamily + class names): serif = **Lyon** (`font-lyon-display-web` 34×, `font-lyon-display-light-web` 23×, `font-lyon-text-regular-web` 14×, `font-lyon-regular` 10×, + Arabic variant); sans = **Whitney** (`font-whitney-ssm-a` 47× — ScreenSmart, the workhorse UI face; weights via `font-[325]`, `font-[350]`, `font-[400]`).

Scale at root 14px (desktop / mobile where responsive pair found):

| Role | Class (verbatim) | px | Leading | Tracking | Case |
|---|---|---|---|---|---|
| Display / H1 | `text-[1.722rem] md:text-[2.22rem] leading-[1.45] tracking-[0.0357142857rem]` (Lyon Display) | 24.1 → **31.08** | 1.45 | 0.5px | Sentence |
| H2 (numeric twin) | `text-[31.08px] leading-[45.07px] tracking-[0.5px]` | 31.08 | 45.07px | 0.5px | Sentence |
| H3 / card title | `text-[1.4rem]` (=19.6px, also `text-[19.6px]`), `leading-[28.42px]` | 19.6 | 28.4px | ~0.5–0.8px | Sentence |
| Subhead | `text-[1.3571428571rem] leading-[27.55px]` | 19 | 27.55px | — | Sentence |
| Body | `text-[1rem] leading-[1.45]` (38×) / `leading-[1.429rem]`(20px) `tracking-[0.05rem]`(0.7px) | **14** | 20.3px | 0.7px | Sentence |
| Small body | `text-[0.88rem]` (14×) = 12.32px, `leading-[1.45]` | 12.32 | 17.9px | 0.7–0.8px | Sentence |
| Eyebrow / label | `font-whitney-ssm-a text-[0.722rem] uppercase leading-[1.45] tracking-[0.1428571429rem]` | **10.1** | 14.66px | **2px** | UPPERCASE |
| Ceremony label | `font-whitney-ssm-a text-[0.88rem] leading-[1.45] tracking-[0.7rem]` | 12.32 | — | **9.8px** (letter-spaced wordmark style) | — |

`uppercase` appears only 15× — reserved for eyebrows/labels, never headlines. Most common tracking values: `0.8px` (20×), `0.05rem`=0.7px (18×), `0.0357rem`=0.5px (10×), `2px` (4×, eyebrows), `0.7rem`=9.8px (3×, display label). Most common leading: `1.45` unitless (43×).

## 6. Color palette (hex, by frequency in JS)

Named Tailwind tokens (verbatim classes): `aman-charcoal-black` (113× as text — the default ink), `aman-cool-gray` (hairlines), `aman-background`, `aman-white`, `aman-light-sand`, `aman-warm-sand`, `aman-soft-sand`, `aman-dark-gray`, `aman-dark-gray-hover`, `aman-primary`. Token→hex map lives in the uncaptured compiled CSS; raw hex usage in JS:

| Hex | Count | Inferred role |
|---|---|---|
| `#313131` | 33 | charcoal black (ink) — high confidence, used directly as close-button text color |
| `#ffffff` / `#fff` | 18 | white |
| `#dad9d7` / `#d9d9d7` | 22 | cool gray hairline — high confidence (`border-[#DAD9D7]` beside `border-aman-cool-gray`) |
| `#000000` | 11 | pure black (overlays: `bg-black/50`) |
| `#a3a3a3`, `#aaa6a3`, `#82847f`, `#585858`, `#8c8c8c` | 5–8 | mid grays |
| `#fdf9f5`, `#f8f8f8`, `#f5f5f4` | 1–2 | warm off-white backgrounds (sand family) |
| `#e4e2dd`, `#ebe8e5`, `#d5d1c8`, `#cbc1b0`, `#c9c2ae`, `#bc8e7a` | 1–3 | sand/taupe accent family |
| `#bb1616` | 6 | error red (form validation) |

No saturated brand accent: the system is **ink + sand + hairline gray**, color comes from photography.

## 7. Logo / wordmark

- Asset: `/assets/images/aman_logo_black.svg` (header + footer), rendered via next/image `fill` + `object-contain`, `sizes:"150px"`, `priority`, `fetchPriority:"high"`, alt "Aman at Sea".
- Header wrapper (verbatim): `w-[150px] h-[40px] lg:h-[64px]` — **150×40 mobile, 150×64 desktop**, condensing on scroll to `lg:!w-[120px] lg:!h-[40px]` over `duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]`.
- Placement: middle column of the header's `grid grid-cols-3` (nav-left / logo-center / actions-right), `justify-center content-center`.
- Footer logo: `w-[120px] h-[51px]`, inside a `w-[40%] max-w-[348px]` column, above a `border-[#DAD9D7]` hairline row.

## 8. Design tokens found (verbatim)

Tailwind semantic classes: `bg-aman-background`, `bg-aman-white`, `bg-aman-light-sand`, `bg-aman-warm-sand`, `bg-aman-soft-sand`, `bg-aman-charcoal-black`, `bg-aman-dark-gray`, `text-aman-charcoal-black`, `text-aman-primary`, `text-aman-dark-gray`, `text-aman-cool-gray`, `border-aman-cool-gray`, `border-aman-dark-gray`, `border-aman-dark-gray-hover`, `border-aman-charcoal-black`, `fill-aman-dark-gray`, `fill-aman-cool-gray`. Font vars: `var(--font-whitney-ssm-a)`, families `lyonDisplayWeb`, `lyonDisplayLightWeb`, `lyonTextRegularWeb`, `lyonRegular(Italic)`, `lyonSemibold`, `lyonArabicRegular`, `whitneySsmA/B`, `whitneyLight/Regular/Medium/Semibold/Bold(+Italics)`. Remaining CSS custom properties are third-party (FontAwesome `--fa-*`, Radix `--radix-*`, PhotoSwipe `--pswp-*`).

---

## Key takeaways for See You In Laos

- Set one honest root size and derive everything: Aman runs a 14px root with body 14px/1.45 — small, dense, quiet; headlines only 31px. Luxury is restraint, not size.
- One serif (display) + one sans (labels/UI); eyebrows are the only uppercase text: ~10px with 2px tracking.
- Golden-ratio landscape (1.618:1) is the house image shape for gallery/split imagery; squares for cards, 3:3.95 for portrait cards — a closed set of 4 ratios, pre-cut per slot.
- Ship a per-component image contract (desktop/tablet/mobile px per role) exactly like Aman's `HeroImage/SplitBlock/Card*` table instead of ad-hoc sizes.
- Palette = ink `#313131` + warm sand off-whites + `#DAD9D7` 1px hairlines; zero border-radius on photography; color lives in the photos.
- One section rhythm value (65px) repeated everywhere beats a spacing "scale" used inconsistently.
- Header: fixed, 3-column grid with centered logo (150×64 desktop → 120×40 condensed at 500ms cubic-bezier(0.4,0,0.2,1)); direction-aware show/hide at 100/200ms.
- Content container 1440px, chrome container 1600px, prose 680px — three widths, no more.
- Hero is ratio-driven (`fill` + object-cover + `sizes="100vw"`, webp q90, priority) rather than hard 100vh; video hero gets a separate mobile treatment.
- Desktop switch at 1024px; extra fine-tune queries (820, 1100) only where nav genuinely breaks — not a bigger breakpoint grid.
