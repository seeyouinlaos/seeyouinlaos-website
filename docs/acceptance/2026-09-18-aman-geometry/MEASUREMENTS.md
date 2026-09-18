# Aman geometry — measurement pass (18 Sep 2026)

Method. AMAN: the Owner's supplied iPhone captures of aman.com / amanatsea.com (1170 px wide = 3 × 390 CSS px; status bar and Safari chrome cropped), measured pixel-by-pixel (`measure-aman.json`: photo bands, gutters, ink lines). SIYL: Playwright at 390 CSS px on the isolated stage (DOM rects + computed styles, `measure-siyl.mjs`) and the live Worker for BEFORE. Values in CSS px at a 390 px viewport; % of viewport in brackets where it matters.

## The shell

| | AMAN | SIYL BEFORE | SIYL AFTER |
|---|---|---|---|
| header height | ~56 (menu · logo row) | 92 header + 55 access line, the line not sticky | **79** = 48 row + 31 access row, one sticky shell (80 at ≥768, 84 at ≥1024) |
| header controls | menu · wordmark · search | menu · wordmark · bag | menu · wordmark · bag + access row |
| access row | — (Aman has no guest session) | scrolls away | signed out: Open your invitation · signed in: My Trip · My Bag · My Profile · Sign out — visible at every scroll position (252 checks · 0 failures, `shell-scroll.mjs`) |
| left / right page gutter | 24.7 / 24.3 (6.3 %) | 22 / 22 | **24 / 24** (6.2 %) |

## Photographs

| Component | AMAN | SIYL BEFORE | SIYL AFTER |
|---|---|---|---|
| editorial hero | framed 341 wide, square (341 × 341), text below the photograph | full-bleed 390 × ~620 (76 vh) with a text overlay | **framed 342 × 342 (1:1)**, eyebrow · title · lede below; 16:9 in the desktop frame |
| destination card (Amanpuri) | framed 341 × 341 (1:1) | framed 4:5 (346 × 432) | **1:1 (342 × 342)** |
| room detail photograph | framed 341 × 211 (1.62 ≈ 16:10), caption + counter below, name above | full-bleed 390 × 292 (4:3), caption and counter overlaid, name below | **framed 342 × 214 (16:10)**, caption + "n / N" below, name above |
| rail card image ("Other suites") | 318 × 251 (1.27 ≈ 5:4), the next card peeks ~36 | 273 × 364 (3:4, 79 % card) | **318 × 254 (5:4)**, 12 px gap, next card peeks 36 |
| accommodation / stays rail card | as above | 273 wide, 3:4 | 318 wide, 5:4 |
| My Trip stage card | (rail geometry) | 84 % card, 4:3 image | 318 card, 5:4 image |
| My Bag line thumbnail | ~50 × 50 square | 72 × 90 (4:5) | 72 × 72 (1:1) |

## Type (rendered size · line pitch)

| Role | AMAN | SIYL BEFORE | SIYL AFTER |
|---|---|---|---|
| eyebrow / tracked label | 10–11 · 2 px tracking | 10 · 2.2 | **10.5 · 2** |
| page / section title | 26 (cap height 18) | 27–29 editorial · 22 sections | **26** (room name, rails, ledes, section titles); page heroes keep 30 |
| card title | 20 (cap height 14) | 24 (public) · 23 (private) · 19–21 (room rails) | **20** |
| body | 14 on a 20–21 px pitch | 12.5 / 13 / 13.5 · 1.8–1.9 | **14 · 1.5–1.6** (no guest body below 13.5) |
| muted body (.t-b2) | 14 | 12.5 | **14** |
| facts / key-values | 13–14 | 13 | 14 |
| primary CTA | 49 px bar, 11 px tracked | 56 (public) · 52 (private) | **50** (public) · 52 (private, a 44 px touch rule kept) |

## Rhythm

| | AMAN | SIYL BEFORE | SIYL AFTER |
|---|---|---|---|
| photograph → eyebrow | 18 | 18–22 | 18 |
| eyebrow → title | 8 | 9–16 | 8 |
| title → body | 12 | 14–18 | 10–12 |
| body → CTA | 30–37 | 14–22 | 16–22 (card) · 30 (lede) |
| section rhythm | ~64 | 76 | **64** |
| rail gap | ~12 | 16 | 12 |

## Not matched, on purpose
- Aman centres its mobile section titles; See You In Laos keeps its left-aligned editorial voice (the brief's identity rule) except the room name, which was already centred.
- Aman's bottom "Reserve" bar is the product CTA; ours is the My Bag summary bar (a different function), kept at 44 px controls.
- The private step bar (01 / 06 · Save My Progress) has no Aman counterpart; it now sticks below the shell.

Evidence: `compare/compare-*-390.jpg` (AMAN REFERENCE | CURRENT BEFORE | SIYL AFTER with 24 px gutter guides, image bounds, text column and CTA bounds), `shots/sheet-{before,after}-{320,390,834,1440}.jpg`, `shots/shots-*.json` (overflow = 0 everywhere, SHELL measurements), `shell-scroll.mjs` (the sticky-shell regression runner).
