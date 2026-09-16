# 003 — Owner patch (Edit 2) + the venue experience · evidence (15 Sep 2026)

No access code, bearer or hash appears in this folder. The private register is gitignored.

## Owner patch (`Edit 2(1).zip` · six review screenshots, every red annotation applied)
| image | annotation | applied as |
|---|---|---|
| IMG_4012 (The Wedding · Where you will sit) | "Change to Souphattra Heritage" on the ceremony-seat line (Wat Ong Teu crossed out) · "Make space between download seat tickets and your tickets" | Ceremony seat · Souphattra Heritage · 28 February · 15:30; `.p-actions` global gap |
| IMG_4013 (Your Journey · C86 card + travel pass) | "Change price to USD 85" (card USD 105, pass YOUR COST USD 105) | C86 = USD 85 at the one price source; every surface follows; a persisted 105 reprices |
| IMG_4014 (Wedding Preparation · seat ticket) | "WEDDING · TEMPLE" → Souphattra Heritage · "Temple Ceremony" → Vow Ceremony · 08:00 → 15:30 · Wat Ong Teu → Souphattra Heritage | ticket head WEDDING CEREMONY · SOUPHATTRA HERITAGE · title Vow Ceremony · 15:30 · Souphattra Heritage, Vientiane · reference SYL-WC-… · same in the QR payload and the PDF |
| IMG_4015 (Wedding Preparation · Your ceremony place) | "Wat Ong Teu · 28 February · 08:00" → "Souphattra Heritage 28 February 15:30" | the hosts' front-centre card reads the seat vocabulary: Souphattra Heritage · 28 February · 15:30 |
| IMG_4016 (Review & Send · lines) | C86 USD 105 → USD 85 | Review & Send reads the bag; the bag reprices from the source |
| IMG_4017 (Review & Send · The Wedding) | "Vow Ceremony always start at 15:30" (16:30 crossed out) | the programme (`assets/journey.js`, `assets/temple.js`) says 15:30 everywhere |

Also from the final Owner decisions: Temple Ceremony 09:00 – approximately 12:00 (08:00 retired); Sathorn
Penthouse USD 85 / night confirmed (Overview 90 = stale source); Wedding Dinner poolside, run A poolside,
preserved. Tests: `test/owner-patch-003.test.mjs` (4) + updated pins across the suite (267 / 267).

## The venue experience
`docs/acceptance/2026-09-15-venue/` — `walk.mjs` rendered at 320 · 375 · 390 · 393 · 430 · 768 · 834 ·
1024 · 1280 · 1440 in Chromium and at 375 · 390 · 430 in WebKit (mobile Safari's engine): `live-worker/`
66 / 66, `live-pages/` 66 / 66 (screenshots at 390 and 1280 of both pages). Local at the final code: 66 / 66.
Asset provenance: `docs/venue/asset-manifest.json` (58 entries · 17 selected · 27 inspected); build:
`docs/venue/build-images.py`; tests: `test/venue.test.mjs` (6).

## Booking-system regression at the final code
- Local Worker, four identities: `2026-09-14-rebuild/walk.mjs` 64 / 64 (Haruthai · Suthep · Peggy ·
  Steffie; the ceremony seat now follows the Vow Ceremony answer, T5 split in two), `2026-09-15-cart-ticket`
  41 / 41 (Haruthai · Peggy), `2026-09-15-ticket-rooms` 36 / 36 (Haruthai · Peggy · Steffie).
- Production, designated identities only: `live-ticket-rooms/` (Suthep · Peggy · Steffie) 35 / 35;
  `live-cart-ticket/` (Suthep · Peggy) 41 / 41 — the seat ticket on the live Worker reads WEDDING
  CEREMONY · SOUPHATTRA HERITAGE · Vow Ceremony · 15:30 · SYL-WC-…, the C86 pass USD 85
  (`live-ticket-rooms/T-tickets-1280.png`, `seat-tickets-sample.pdf`). Production was snapshotted before
  (rooms plan, seating plan, KV keys + metadata) and proven byte-equivalent after the restore (Suthep's
  seat back to D-B-15, the walk's `reg:INV-G049` removed; Haruthai's live registration and six room places
  untouched — the Owner uses that invitation, so nothing ran as Haruthai on production).
- `live-owner-patch/`: the public C86 surfaces on the live Worker at 1024 px (journeys card, transport
  detail) — USD 85.

## Read-only guest coverage on production (final code)
`2026-09-15-final-release/auth-coverage.mjs`: 47 / 47 guests — bearer accepted by rooms and seating (own
places / own seat only), status route, browser sign-in with own name (party label for the 42 with a party),
empty own cart, sign-out; 0 write requests; a bad bearer refused. Register audit: 47 active · 47
invitations · 47 unique codes · 2 cancelled · 0 missing · 0 duplicate · 0 auth errors · deployed register
identical.

## Public release crawl (final code)
`2026-09-15-final-release/crawl.mjs` on both origins: 77 pages each, 0 HTTP failures, 0 broken images,
0 console errors, 0 missing anchors, 0 retired strings (now including 08:00 · 16:30 · SYL-TC- ·
"Wat Ong Teu · 28 February" · WEDDING · TEMPLE · C86 at 105), 0 stale / private routes served, 0 secret
exposure over every response body, rendered text of the two origins identical (65 pages compared).

## Edit 3 (16 Sep 2026)
The Owner's third review (`Edit_3.zip`) — the access rule for every link, the close CTA, Harudot as a
café, the dress reference cards — is applied and proven in `docs/acceptance/2026-09-16-access/`
(annotation table, the rendered access walk 37 / 37 on both origins, the booking regression on
production with production restored, the venue walk 66 / 66 on both origins, 47 / 47 read-only
coverage, the public crawl of both origins CLEAN, parity 717 / 717; the status line's space reserved so
nothing shifts, `6170755`).
