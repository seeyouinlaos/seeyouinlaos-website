# SEE YOU IN LAOS
## FINAL DESIGN SYSTEM — REVIEW MASTER

DOCUMENT: SEE-YOU-IN-LAOS-FINAL-DESIGN-SYSTEM-REVIEW.md
VERSION: REVIEW-01
DATE: 05 SEP 2026
STATUS: MULTI-DISCIPLINE REVIEW
SOURCE COMMIT: dfd271e (+ this documentation pass)

This document is self-contained for review. Supporting evidence: docs/references/aman-at-sea-master-reference.md · aman-luxury-hospitality-language.md · ritz-carlton-yacht-reference.md · see-you-in-laos-luxury-system.md · source-analysis-aman-archive.md · source-analysis-explore-archive.md · source-analysis-foouseasons-archive.md.

## 1. PROJECT INTENT
One privately commissioned luxury journey — Haruthai & Suthep, Sunday 28 February 2027, Vientiane, Laos — presented as a world-class travel editorial (public) and a guided personal configurator (Guest Area). The wedding is the emotional centre; the journey (Thailand → Laos → China) carries it. This document fixes the design/production rules so implementation can no longer improvise sizes, ratios, spacing, wording or component geometry.

## 2. SOURCE MATERIAL
1. Aman at Sea live site (amanatsea.com) — 17 rendered pages, desktop 1366 + mobile 390: Home, Voyages index, 3 voyages (6n/7p Med · 8n/8p Med islands · 13n/5p transatlantic), Destinations index, 3 regions (Mediterranean, Caribbean, Atlantic Passage), Experiences (overview + On Shore, 8 individual experience units), Plan Your Voyage full 3-step flow (interacted), Accommodation index + 3 suite details, Dining, Wellness.
2. Ritz-Carlton Yacht Collection — "Journey Unlike the Rest" campaign, full-page render + measured typography.
3. aman.zip — amanatsea.com Next.js capture: 31 JS chunks, 18 JPGs; Tailwind classes mined (root 14px proven, containers, ratios, tokens).
4. explore.zip — Explora Journeys (MSC) AEM capture: breakpoints, header tokens, 9000×6000 hero masters → 1800×943 delivery, palette.
5. foouseasons.zip — Four Seasons Yachts Next.js capture: next/image deviceSizes verbatim, hero swiper model, 843×1192 portrait template, 10px caps labels, logo 88×48 fixed.
6. See You In Laos current brand/master sources: PP Editorial Old + Hanken Grotesk, wordmark "see you in laos." with cherry dot, warm-ivory/ink/cherry palette, approved owner photography, frozen booking logic.

## 3. SOURCE HIERARCHY
AMAN = visual/hospitality hub (layout, spacing, rhythm, restraint, journey/destination/accommodation systems, wording).
RITZ-CARLTON = editorial complement (hero composition, in-image captions, numbered pagination, single repeated CTA band, dark transition, quote pause).
explore.zip / foouseasons.zip = comparative engineering evidence (image pipelines, breakpoints, header/logo tokens).
SEE YOU IN LAOS = identity + wedding + Laos + actual journey + booking logic. The result must read only as see you in laos.

## 4. FINAL DESIGN PRINCIPLES
1. One journey, three chapters; the wedding is the only dramatic peak. 2. SUMMARY → SELECT → OPEN → INTERACT → APPLY → CLOSE → RETURN everywhere. 3. Photography leads; words are few and exact. 4. Numbers are precise, sentences are soft. 5. Current state always visible collapsed. 6. Two personas of action: self-serve (Join the Journey) and human (Guest Relations). 7. Same component = same geometry, always. 8. Public = understand; Guest Area = decide; nothing rendered twice.

## 5. BRAND / CI
Identity fixed: editorial serif (PP Editorial Old) + restrained sans (Hanken Grotesk); warm ivory ground; ink; cherry/burgundy accent; owner photography only; Lao warmth; zero nautical vocabulary or iconography. Aman contributes proportion/restraint, never its brand.

## 6. LOGO / WORDMARK
Approved wordmark only ("see you in laos." lowercase serif + cherry dot). FIXED: header usage 26px font-size (current), max rendered width 150px desktop (Aman logo ceiling), min legible width 88px (Four Seasons floor); clear space = height of the "s" on all sides; footer repeat allowed once; hero overlay usage NOT allowed (hero carries names/date as text instead); never redrawn, recolored (ink or ivory only), stretched or letter-spaced. Mobile: same mark, min 88px. FLEXIBLE: scroll condensation 150→120px width (Aman pattern) if implemented globally.

## 7. COLOR SYSTEM
FIXED tokens (existing site variables remain the single source):
- --ivory (warm ground) · --ink (primary text) · --ink-s (dark editorial/panel ground) · --cherry (accent, wedding, selected) · hairline = ink at 14–18% (1px, radius 0) · overlay scrim = ink at 50–55% (Ritz/FS evidence: rgba(0,0,0,.5)).
- States: selected = cherry border/text; inactive = 50% opacity; error = existing #BB1616-family red; confirmed = cherry chip (BOOKED). No new hues. Dark band: exactly one per surface (Wedding transition). Evidence: Aman #313131/#DAD9D7/sand family; Explora #EDE9E4/#222 + bronze; FS #171715 — all confirm 2-neutrals+1-accent discipline.

## 8. TYPOGRAPHY SYSTEM
We keep OUR fonts; we adopt the measured scale roles (Aman root 14px system):
- Display/H1: serif clamp(26px → 42px), sentence case, line-height 1.1–1.14.
- H2 section: serif clamp(21px → 31px) (Aman H1 = 31.08px desktop / 24.1 mobile).
- H3/moment: serif 19–21px.
- Body: sans 14–15px / line-height 1.45–1.6 (Aman 14/20.3), max-measure 560–680px.
- Eyebrow/label: 10–11px caps, letter-spacing .18–.22em (Aman 10.1px/2px; FS 10px/2px — convergent evidence).
- Metadata/fact: 10–11px caps dot-separated. - Caption (in-image): 9–10px caps ivory.
- Micro-status chip: 9.5px caps. UPPERCASE only at ≤12px. Italic serif reserved for the host voice. FIXED scale; FLEXIBLE ±1px per role.

## 9. GRID / CONTENT WIDTH
FIXED: page max content 1220px (current, within Aman 1440/FS evidence); prose/text max 560px (Aman 680 ceiling); Guest Area column 780px; full-bleed = 100vw imagery only; card gap 10px; rail gap 10px; grid gaps 14px; image/text split 3:2 (glance) and 1:1 (editorial splits).

## 10. RESPONSIVE BREAKPOINTS
FIXED: 640 (sm) · 820 (site mobile/desktop switch — existing, sits inside Aman 768–1024 band) · 1024 (lg) · 1220 (content cap). Column counts: rails horizontal at all widths; grids 1col ≤640, 2col ≤1024, 3–4col above. Navigation: public drawer ≤820; Guest Area stepper wraps ≤640.

## 11. SPACING SYSTEM
FIXED tokens: --space-xs 6 · sm 10 · md 14 · lg 22 · xl 40 · --space-section 64px mobile / 96px desktop (Aman 65px rhythm evidence); module padding 14–16px; gutters: 20px mobile (§23 owner rule), 24px tablet (Aman 24.5), 6vw desktop capped by 1220px content.

## 12. HERO STANDARD
DESKTOP (FIXED): full-bleed; height 100vh capped at 887px @1440 (Aman contract 1440×887); object-fit cover; object-position center 40%; scrim ink 50%; text block bottom-left within 560px measure; safe area: nothing within top 96px (header band).
MOBILE (FIXED): height 75vh min 560px; separate mobile crop REQUIRED (FS heroImageMobile pattern); object-position center.
SOURCE PIXELS (FIXED for 008): desktop master 2880×1780 (golden 1.618:1, Aman master evidence), minimum 2400×1480; mobile master 1080×1350 (4:5), minimum 828×1035; delivery WebP q80–90, hero ≤400KB (Explora delivers 380KB), poster 16:9 3840×2160 only for video.
CTA pair sits in-hero (Ritz), kicker caps above the serif line.

## 13. IMAGE PRODUCTION MATRIX (binding for 008)
| ROLE | RATIO | DESKTOP RENDER | MOBILE RENDER | MIN SOURCE | PREFERRED SOURCE | CROP/POSITION | FORMAT/QUALITY | MOBILE VARIANT |
|---|---|---|---|---|---|---|---|---|
| Hero | 1.618:1 | 100vh≤887px | 75vh | 2400×1480 | 2880×1780 | center 40% | WebP q85, ≤400KB | YES 1080×1350 (4:5) |
| Journey chapter hero (Wedding band) | 16:9 | full-bleed ≤560px h | full-bleed 260px | 1920×1080 | 2400×1350 | center | WebP q85 | same asset allowed |
| Destination capture (glance) | 3:2 | 2×2 grid ~320×213 | 2×2 110px h | 1200×800 | 1890×1260 | center | WebP/JPG q80 | no |
| Destination rail image | 4:3 | 176×132 | 172×110 | 900×675 | 1200×900 | center | q80 | no |
| Itinerary/day image | 3:2 | ≤560×373 | 100% ≤300px h | 1200×800 | 1890×1260 | center | q80 | no |
| Experience card | 4:3 | 172×110 fixed | same | 800×600 | 1200×900 | center | q80 | no |
| Experience detail (overlay) | 3:2 | 600px col | 100vw | 1200×800 | 1890×1260 | center | q80 | no |
| Stay/accommodation hero | 3:2 | strip 3-up 120px h | same | 1200×800 | 2000×1334 | verticals straight | q85 | no |
| Room card | 3:2 | 3-up 84–96px h | slider 100% | 1200×800 | 2000×1334 | center | q80 | no |
| Room detail/gallery | 3:2 + 4:5 mix | 2-col grid | 1-col | 1200×800 / 960×1200 | 2000×1334 / 1200×1500 | center | q85 | no |
| Transport | 3:2 | 3-up 84px h | same | 1200×800 | 1440×960 | center | q80 | no |
| Wedding moment hero | 16:9 | full-width band | full-width | 1920×1080 | 2400×1350 | faces upper third | q85 | YES if faces crop |
| Wedding detail image | 3:2 / 4:5 | panel col | 100% | 1066×1600 (4:5 ok) | 2000×1334 | respect ritual rules | q85 | no |
| Editorial full-bleed | 1.618:1 | 100vw | 100vw | 2400×1480 | 2880×1780 | center | q85 ≤450KB | optional |
| Editorial half-width | 4:5 | 50% col | 100% | 960×1200 | 1200×1500 | center | q80 | no |
| Gallery image | 3:2 | grid cell | 1-col | 1200×800 | 1890×1260 | center | q80 | no |
| Mobile feature | 4:5 | — | 100% | 828×1035 | 1080×1350 | center | q80 | IS the variant |
| Thumbnail | 1:1 | 96–128px | 74px | 390×390 (@2x) | 448×448 | center | q75 | no |
CONSISTENCY RULE (FIXED): every component of the same type uses the same ratio and rendered height — content adapts to the component, never the reverse. srcset widths follow the FS/next-image ladder: 640/828/1080/1200/1920/2400.

## 14. PHOTOGRAPHIC CI (for 008)
Real, Laos-specific, travel-editorial, wedding-sensitive; never nautical, never AI-generic, never overprocessed. Exposure natural, warm neutral white balance (Aman sand mood over cool blue); contrast soft with protected highlights (no crushed blacks except the one dark band); saturation restrained (greens desaturated toward olive, skies kept pale, water believable); skin tones warm and true; architectural verticals corrected; shadows open; night photography tungsten-warm; food shot in daylight tones; interiors bright-airy (Aman suite evidence); people candid, respectful of ritual (no flash at alms; monks never touched/posed); editorial crops leave breathing room at caption corner. Every image proves the exact moment being told (standing owner rule).

## 15. NAVIGATION SYSTEM
Public: header (safe-area → 84px band desktop / 64px mobile) with wordmark + 4-lang switch + Menu; drawer with the 6 numbered anchors; two persistent CTAs. Guest Area: numbered stepper 01–05 is the only navigation + utilities (Invitation/Website/Save/Log out). FIXED heights: buttons/CTA 44px (40px sm variant); inputs 48px; lang buttons min 24px; sticky summary 63px.

## 16. JOURNEY ARCHITECTURE
Public top level FIXED (owner): 01 Hero · 02 The Journey at a Glance (map ≥50% + 4 captures + 3 chapter rows) · 03 Before the Wedding · 04 The Wedding · 05 After the Wedding · 06 Good to Know · 07 Your Invitation. One chapter open at a time. Ontology: COUNTRY → CITY → DAY → STAY/TRANSPORT/MOMENT → EXPERIENCE → DETAIL → SELECTION → CONTRIBUTION/STATUS. Nong Khai = transit stop on the map and in the train story only.

## 17. JOURNEY PACKAGE SYSTEM
Three products (Before/Wedding/After), each: fact line + one editorial sentence + day/moment modules + places rail + (Guest Area) decision rows. Template constant; content varies (Aman 3-voyage lesson: layers may be empty — e.g. Lijiang rail — without breaking the template).

## 18. DESTINATION SYSTEM
Public destinations are desire-only (no prices, no booking state); captions in-image; operational data exclusively in Guest Area steps 02/03.

## 19. ITINERARY / DAY SYSTEM
Day module (FIXED): time/date caps cherry → serif title → venue caps → one ≤75-word paragraph → optional single VIEW control. Your Plan = the personal chronological mirror, only selected items, date-grouped.

## 20. EXPERIENCE SYSTEM
Rails per city inside chapters; chips fixed-geometry; categories in caps as the tag layer (our cats field); detail = contained overlay (gallery → story → facts → maps); close returns to position; `01 / N` counters; strictly informational (no price/booking) — frozen rule.

## 21. STAY / ACCOMMODATION SYSTEM
Three layers (Aman): OVERVIEW (public editorial + Explore the Stay panel) → CATEGORY/ROOM (Guest Area cards: image · fact grid · availability · contribution · Book) → DETAIL (More details dossier) + ONE shared "Every room includes" block. Applies identically to Sathorn Penthouse, Souphattra rooms, Kunming and Lijiang stays.

## 22. TRANSPORT SYSTEM
Route-named legs ("Bangkok → Nong Khai → Vientiane"); one fact line per leg; van/luggage "included" stated once; booking = summary row → contained editing → Book/Remove; frozen prices (train USD 75 pp package; KMG→LJG 145 pp).

## 23. WEDDING SYSTEM
The only dramatic peak: cherry-ruled chapter, the site's single dark full-bleed transition, strongest imagery, host quote adjacency. Moments FIXED: 05:00 Alms Giving (Souphattra Heritage · Lao Traditional Dress · Sacred Morning Ritual with USD 15 personal offering logic) · 09:00 Temple Ceremony (Wat Ong Teu) · from 12:00 Coffee & Cake · 16:30 Vow Ceremony (green-gate imagery, NO pool) · 19:30 Wedding Dinner. Aman elevates (hospitality grammar), Ritz dramatizes (the transition), the wedding stays SYL. NO CRUISE — absolute.

## 24. BOOKING / PERSONAL SELECTION SYSTEM
Frozen 13bee61 logic is the baseline. Guided stepper 01 Your Journey → 02 Your Stay → 03 Your Travel → 04 Your Details → 05 Your Plan; AIDA summary rows with current values collapsed; per-guest selection by preferred name; dependencies cascade (Wedding NO removes offerings/room gating — verified live); inline validation Aman-style ("[field] is required."); running context never lost (Aman wizard evidence).

## 25. TOTAL CONTRIBUTION
One calculation layer only; sticky 63px bar + Your Plan total + home total row all read the same function; updates immediately; example state verified: 390 + 150 + 290 + 30 = USD 860.

## 26. LANGUAGE / WORDING SYSTEM
Full system in see-you-in-laos-luxury-system.md §FINAL LANGUAGE SYSTEM + aman-luxury-hospitality-language.md. Core FIXED rules: sentence-case serif headlines; caps only ≤12px; exact numbers/soft words; triads; "hosted by Haruthai & Suthep" factual; contribution as metadata; CTAs Join/View/Explore/Book/Remove; forbidden: buy, ticket, deal, cruise vocabulary, exclamation marks, superlatives; EN/DE/TH/JA fully translated (no runtime MT, no mixed-language paragraphs).

## 27. MOBILE RULES
Safe area → header → content (both surfaces); 20px gutter; map-first glance; swipe rails; drawer public / stepper guest; no floating controls over imagery; separate hero crop; 0px horizontal overflow acceptance (Aman ships 15 — we do not).

## 28. ACCESSIBILITY / TECHNICAL CONSTRAINTS
Focus management in overlays (existing inert/backdrop pattern); ESC closes; aria-expanded on all disclosure rows; reduced-motion honored (Explora evidence + existing); alt text semantic per owner rule; lazy-load below fold; release gates (16) remain the technical constitution; register/** business logic frozen.

## 29. FINAL COMPONENT DECISION MATRIX

Columns: COMPONENT | AMAN OBSERVATION | RITZ OBSERVATION | OUR FUNCTIONAL NEED | FINAL CHOICE | VISUAL RULE | INTERACTION RULE | WORDING RULE

| COMPONENT | AMAN | RITZ | OUR NEED | FINAL CHOICE | VISUAL RULE | INTERACTION RULE | WORDING RULE |
|---|---|---|---|---|---|---|---|
| INVITATION ENTRY | Plan-wizard as curation | Request a quote | private AES-token ritual | SYL box ritual, Aman framing | plaque box unchanged | open once, reopen via utility | "Your journey, prepared around you." |
| GLOBAL HEADER | centered logo grid-3, 150×64→120×40 condense | minimal campaign bar | wordmark + lang + menu | Aman shell, SYL wordmark | header 64px mobile / 84px desktop incl. safe-area; wordmark ≤150px w | sticky, condenses on scroll allowed (FLEXIBLE 64–84px) | wordmark lowercase + cherry dot only |
| MOBILE MENU | hamburger drawer, world-accordions | none | 6 public anchors + guest stepper | Aman drawer public; stepper is guest nav | full-screen drawer, ivory on ink | one level of accordion max | numbered chapter labels 02–07 |
| HERO | ratio-driven fill/cover, sizes 100vw, webp q90 | full-bleed + 1 serif line + CTA pair | who/what/when/where in 5s | Ritz composition, Aman delivery | desktop 100vh max 887px @1440; mobile 75vh min 560px; source 2400×1480 (golden) desktop / 1080×1350 (4:5) mobile | CTA pair in hero: Join the Journey / Discover the Journey | kicker caps 10px; serif line sentence case |
| JOURNEY INTRO | one paragraph, 65px rhythm | headline+2 lines | 3 countries instantly | Aman | max 560px text width | none | "Four chapters carry the journey…" |
| ROUTE MAP | map opens every voyage | none | 3 countries, 5 stops | Aman (owner-fixed) | SVG map ≥50% of glance composition desktop; map first on mobile | static, labels always legible ≥10px | country caps 11px, stops 12px |
| THREE JOURNEY PRODUCTS | voyage cards + fact line | destination slider | 3 chapters, wedding centre | Aman cards as rows | serif 21px title, 10px caps subline; wedding row cherry-ruled | one open at a time; scroll to opened | "Before the Wedding · 21 – 27 FEB · Thailand → Laos" |
| JOURNEY PRODUCT HERO | route H1 + fact line + map | dark full-bleed transitions | wedding = emotional centre | Aman anatomy; Ritz dark full-bleed ONLY for The Wedding | wedding chapter opens with full-bleed image band (16:9, source 2400×1350) | chapter opens/closes; others close | fact line under title always |
| DATES/DURATION/ROUTE META | `13 May 2027 - 21 May 2027 · 8 nights, 8 ports` | minimal | precise trust | Aman grammar | 10–11px caps, dot-separated | — | en-dash ranges; nights counted |
| DAY-BY-DAY ITINERARY | Day N → port → 1 para → preview | none | chronology w/o duplication | Aman | left hairline 2px; 26px block spacing | vertical read; no accordion inside a day | "25 FEB · morning" style |
| DAY MODULE | port H2 + paragraph | — | moment unit | Aman | time cherry caps → serif title → venue caps → 1 para ≤75 words | VIEW opens panel/overlay | one idea per paragraph |
| DESTINATION MODULE | sub-region poetry, no ops | in-image caption | desire only, public | Aman + Ritz caption | image 3:2; caption in-image caps | tap → chapter, not dossier | sensory triads |
| EXPERIENCE CARD | none (day previews) | rail card + VIEW | browseable rails per city | SYL rail (owner-fixed) with Aman category tag | chip 172px w; image 4:3 h108–110px fixed; SAME geometry all chips | rail scroll-snap; `01 / N` counter | name → category caps → View experience |
| EXPERIENCE DETAIL | 1 paragraph, enquire | overlay w/ gallery | read-only depth | Ritz overlay, Aman copy depth | .pv panel 600px max-w | open→gallery→close→same position | teaser + ≤3 notes + maps link |
| STAY OVERVIEW | ryokan story + category cards | image drama | public desire, GA decision | Aman | 3 images strip 3:2; ≤3 lines copy | Explore the Stay → panel | design story first |
| ROOM CARD | SUITE eyebrow + 3-line card | large image cabin card | 8 categories, availability | Aman card + engine facts | image 3:2; fact grid 4 cells; fixed card geometry | More details → dossier; Book CTA | `31 sq.m. · King · 2 adults · Garden` |
| ROOM DETAIL | hero, fact bullets, floor plan link, features, gallery 14–15, cross-links | — | dossier depth | Aman | gallery grid 2-col; facts as bullet chain | in Guest Area behind More details | Total • Interior • Ceiling pattern |
| TRANSPORT MODULE | port-to-port legs in itinerary | — | train/van/flight products | Aman legs + SYL booking row | train imagery 3:2 ×3 strip | summary row → contained editing → Book/Remove | route "X → Y" naming |
| WEDDING MOMENT | day module | dark transitions | strongest hierarchy | Aman module + Ritz weight | cherry accents; the ONLY dark full-bleed band | VIEW panels for morning/vow/evening | `05:00 · Alms Giving · Souphattra Heritage · Lao Traditional Dress` |
| HOST QUOTE | none | press quote pause | hosts are the voice | Ritz mechanic, SYL voice | italic serif, centered, 1 per surface max | static | "Travel first. Wedding second. Memory always." |
| EDITORIAL PAUSE | 65px rhythm | quote + dark bands | breathing room | both, restrained | section rhythm 64px mobile / 96px desktop | — | ≤1 pause element between chapters |
| IMAGE RAIL | — | destination slider | places per city | Ritz | gap 10px; snap; peek next card | swipe; counter | "Swipe · tap a place to open it" (existing) |
| IMAGE CAPTION | below-image small | in-image caps | orientation | Ritz | in-image, 9–10px caps, ivory, bottom-left | — | place-only, no sentences |
| PAGINATION | — | numbered 1–5 | orientation | Ritz | `01 / 04` counters, no arrows | dots/tap-zones stay (owner rule) | zero-padded numbers |
| FACT GRID | bullet chains + 3-col inclusions | fact rows on cabin | rooms/travel | Aman | dl-grid 2-col mobile / 4-col desktop; hairline #rgba ink .14 | — | label caps 10px + value 13px |
| INCLUSIONS | "All Suites Include" 3 columns | — | avoid repetition | Aman | one shared "Every room includes" block per surface | collapsible on mobile | Features / Technology / Services grouping |
| HOSTED ELEMENT | quiet inclusion | — | frozen model | SYL | HOSTED chip | — | "hosted by Haruthai & Suthep" once |
| PERSONAL CONTRIBUTION | price behind quote | — | transparent per-guest | SYL + Aman placement | amount only in decision surfaces + totals | live recalc | "Your contribution · USD 65 per guest / night" |
| BOOKING SELECTION | wizard multi-select w/ validation | quote funnel | per-guest, per-product | SYL frozen CTAs in Aman wizard shell | selected = cherry border (`tj-opt.sel`) | Book → BOOKED + Remove; inline validation "[field] is required." | Book this stay/room/journey |
| SELECTED STATE | running summary always visible | — | current value collapsed | Aman running summary + AIDA rows | status chips caps 9.5px | value visible without reopening | "2 guests · USD 150 · BOOKED" |
| YOUR JOURNEY SUMMARY | wizard footer summary | — | Your Plan chronology | SYL (owner-fixed) | date-grouped rows | expand/collapse dates FLEXIBLE | only selected items |
| TOTAL CONTRIBUTION | Gesamtpreis absent (quote) | persistent total absent | always visible | SYL sticky (owner-fixed) | sticky bar 63px + plan total row | updates immediately; single calc layer | "Total contribution · USD 860" |
| LANGUAGE SWITCH | none | none | EN/DE/TH/JA | SYL | 4 buttons 24px min-height in header band | full dictionary swap, no runtime MT | EN DE TH JA labels |
| CTA | Plan your voyage / Request a call | REQUEST A QUOTE repeated | 2 personas | Aman pair model | primary solid ink, ghost hairline; height 44px (40 sm) | max 1 primary per view | Join the Journey / Contact Guest Relations |
| FOOTER / END STATE | onward cross-links + brand group | deep utility footer | quiet close | Aman minimal | names · date · contact · QR only in contact row | — | "See you in Laos?" as the closing ask |

## 30. DESIGN TOKENS
--page-max-width:1220px · --guest-column:780px · --text-width:560px · --gutter-desktop:6vw(≤1220) · --gutter-tablet:24px · --gutter-mobile:20px · --space-xs:6 --space-sm:10 --space-md:14 --space-lg:22 --space-xl:40 · --space-section:64/96 · --hero-desktop-height:min(100vh,887px) · --hero-mobile-height:max(75vh,560px) · --radius:0 · --hairline:1px ink@14% · --header-height:84px · --header-mobile-height:64px(+safe-area) · --cta-height:44px · --sticky-summary:63px · --chip-rail-gap:10px.

## 31. IMAGE TOKENS / PIXEL RULES
srcset ladder 640/828/1080/1200/1920/2400 · hero master 2880×1780 (min 2400×1480) · mobile hero 1080×1350 (min 828×1035) · landscape unit 1890×1260 (3:2) · portrait unit 1200×1500 (4:5) · rail/card unit 1200×900 (4:3) · thumb 448×448 · WebP q80–85 (hero q85–90) · hero delivery ≤400KB, standard ≤250KB · SOURCE PIXELS ≠ CSS SIZE: always deliver ≥2× the largest rendered CSS size.

## 32. NON-NEGOTIABLE RULES
NO CRUISE · register/** business logic frozen (prices 65/75/145/15, room matrix, status model, CTAs Book/BOOKED/Remove) · owner-original QR assets only, no written LINE IDs · no stock, no AI imagery, 008 owns image production · "Haruthai & Suthep" never line-breaks · semantic image rule (prove the moment or use typography) · one calculation layer · EN/DE/TH/JA complete · wedding programme truth as in §23 · same component = same geometry · this document's FIXED values may not be changed without a version increment.

## 33. OPEN REVIEW QUESTIONS
1. Hero line: "see you in laos." wordmark-as-headline vs "Travel first. Wedding second. Memory always." — which leads? (005/001)
2. Bangkok + Lijiang destination captures: 008 to deliver WEB-READY city photography (currently typography tiles). Confirm shot list. (008)
3. Alms 05:00: confirm the time is final for public print surfaces too. (003)
4. Dress guide behind one control — confirm the four categories remain unchanged for FEB 2027. (003/005)
5. Scroll-condensing header (150→120px) — adopt or keep static? (005/006)
6. TH honorific level in booking CTAs — 007 to confirm current register wording meets the premium bar.
7. Guest Area "Places" step removed from nav (rails live in chapters) — confirm. (001)

## 34. REVIEW ROUTING
ONE master file, ONE version, ALL reviewers: 001 · 003 · 004 · 005 · 006 · 007 · 008 → feedback → 001 resolves → FINAL APPROVAL → only then the FINAL CLAUDE PRODUCTION ORDER. Response format (mandatory, no "looks good"):
FROM / TO: 001 — MASTER EXECUTIVE DIRECTOR / DOCUMENT REVIEWED (exact filename+version) / DECISION: APPROVE · APPROVE WITH CHANGES · DO NOT APPROVE / PROPOSED CHANGE (exact, or NONE) / WHY / AFFECTED SECTION / PRIORITY: CRITICAL·HIGH·MEDIUM·LOW.

### 001 — MASTER EXECUTIVE DIRECTOR — review section
Scope: overall concept, scope, wedding priority, journey logic, brand integrity, conflicts, final approval. Key items: §1 §4 §16 §23 §32 §33(Q1,Q7).

### 003 — WEDDING PLANNER / PRODUCER — review section
Scope: real-world wedding logic, guest journey, timing, arrival/departure, stays, transport, event dependencies, hosted/included/contribution logic. Key items: §17 §19 §22 §23 §24 §25 §33(Q3,Q4). Flag anything beautiful but operationally wrong.

### 004 — review section (current 004 responsibility)
Review within the established 004 responsibility; exact modifications + reasoning. Key items: §15 §24 §28.

### 005 — EDITORIAL DIRECTOR — review section
Scope: art direction, editorial hierarchy, story, photographic rhythm, wedding emotion, luxury positioning, image/text balance, coherence. Key items: §4 §8 §12 §13 §14 §23 §29 §33(Q1,Q5).

### 006 — review section (current 006 responsibility)
Review within the established 006 responsibility; exact modifications + reasoning. Key items: §10 §27 §28 §30.

### 007 — WORDING / TRANSLATION — review section
Scope: complete wording system EN/DE/TH/JA, luxury-hospitality voice, terminology consistency, headlines/eyebrows/CTA/microcopy/status/hosted/included/contribution/wedding/journey terminology, cultural sensitivity. Must flag: literal translations, mixed-language copy, non-premium vocabulary, commercial booking language, cruise terminology, tourism clichés, capitalization inconsistency, TH/JA tone, DE that sounds translated, EN below luxury standard — with exact replacement wording. Key items: §26 + language files + §33(Q6).

### 008 — IMAGE / PHOTOGRAPHY / WEB PRODUCTION — review section
Scope: hero dimensions, all pixel sizes, ratios, desktop/mobile crops, responsive variants, WebP/AVIF/JPEG, quality, compression, consistency, photographic CI, color, skin tones, architecture, destination authenticity, wedding imagery, naming, delivery spec. Must confirm the Image Production Matrix (§13/§31) is producible and sufficiently precise — no vague image instructions may survive this review. Key items: §12 §13 §14 §31 §33(Q2).
