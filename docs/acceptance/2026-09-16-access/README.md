# 003 — Edit 3 (Owner, 16 Sep 2026) · access, CTA, Harudot, dress references · evidence

> 004 (later on 16 Sep 2026): the Owner's final information architecture supersedes the hand-over of `journeys.html` —
> The Journey is public editorial, the room and transport pages are private; see `../2026-09-16-public-private/README.md`.
> The result folders here were refreshed at the final code 621be9c (access walk 44 / 44, venue walk 68 / 68, production walks 35 / 35 · 41 / 41, crawl, coverage).

No access code, bearer or hash appears in this folder. The private register is gitignored. Every
production walk ran as Suthep (G049), Peggy (G001) or Steffie (G002) — never as the invitation the
Owner uses live.

## The Owner's annotations (`Edit_3.zip` · eight review images, every red note applied)
| image | annotation | applied as |
|---|---|---|
| IMG_4019 · IMG_4020 (close of the public pages) | "Plan your journey" → "Open your invitation", linking to the invitation page | `<a class="a-cta" href="invitation.html">Open your invitation</a>` on index, destination, accommodation, experiences, voyage |
| IMG_4022 (menu · Your journey) | "Guests have to log in before they plan the journey. Guests have to see exactly everywhere if they're log in or not. If guests aren't log in, they can't see the journey. This rule is for all links. Guests can't jump to journey, to shopping cart or any other confidential details before they log in" | the global gate in `assets/invite.mjs` (loaded on every page): the private surfaces (`your-journey`, `cart`, `tickets`, `journeys`, `wedding`, `wedding-preparation`, `about-you`, `review`) hand over to `invitation?open=1&next=<page>` without a session and return after the code; every link to them on a public page leads there (menu, footer, bag icon, CTAs, cards, late-rendered links); a header status line on every page: NOT SIGNED IN · OPEN YOUR INVITATION, or SIGNED IN · <name> · YOUR JOURNEY · SIGN OUT |
| IMG_4023 (journeys catalogue · flight card) | "I shouldn't be able to select flight if i'm not log in and switch animation." | the catalogue hands over signed out — no ADD, fare or room selection is reachable (`journeys.html`, `cart.html`, `tickets.html` gate at load; `assets/prep-shell.js` hands over instead of painting a private step) |
| IMG_4024 (Harudot) | "Change to Cafe" | Harudot `roles: ['cafe']` (`assets/experiences.js`, `src/experience-inventory.json`) |
| IMG_4026 (menu · Journeys) | "Journeys — Update by owner" | read as the access rule: the entry stays; signed out it leads to the invitation page |
| IMG_4027 · IMG_4028 (dress reference rails) | "Picture size is wrong" | every reference photograph is one 3:4 card, covered from the top, max 300 px (`assets/prep.css .p-rail > img`) |

The status line's space is reserved before any script runs (`6170755`): the placeholder sits in the markup
of the fifteen pages with a static header, `assets/recon.js` places it with the header it builds (a
`.hd-space` stand-in of the same height holds the first paint on the six script-built pages), the rules
live in `assets/aman.css`; on a phone both states are two rows of one height — the line no longer shifts
the page (venue walk CLS at 1280 px: voyage 0.091 → 0.031, accommodation 0.093 → 0.034; the load itself
0.001 by a buffered layout-shift observer; the residue is the shared header's web-font swap, unchanged
since before Edit 3).

Tests: `test/access.test.mjs` (5) — the private list, the gate URL, the hand-overs, the status texts,
the page hand-overs, the CTAs, `invite.mjs` on 21 pages, the reserved placeholder on every page, Harudot,
the dress CSS. Suite 272 / 272.

## The rendered access walk (`walk.mjs`, 37 checks · G001, read-only)
Signed out: every private page hands over with the way back; every private link on the public pages
leads to the invitation page (menu, footer, bag icon, the close CTA, the catalogue); the header reads
NOT SIGNED IN · OPEN YOUR INVITATION; no ADD / fare / room control is reachable. After the code: the
walk returns to the page it left (`?next=`), the header names the guest on every page, the bag icon
opens the private journey, Sign out from the header returns to the invitation page and clears the
session, the private pages hand over again.
- Local Worker at the final code: 37 / 37.
- `live-worker/` (Worker origin, 6170755): 37 / 37 · `live-pages/` (GitHub Pages mirror): 37 / 37
  (screenshots: `out-destination.png`, `out-experiences.png`, `in-journeys.png`; `walk-results.json`).

## Booking-system regression at the final code (the gate must not break a signed-in guest)
- Local Worker, four identities: `2026-09-14-rebuild/walk.mjs` 64 / 64, `2026-09-15-cart-ticket`
  41 / 41, `2026-09-15-ticket-rooms` 36 / 36, `2026-09-15-venue` 66 / 66.
- Production, designated identities only: `live-ticket-rooms/` (Suthep · Peggy · Steffie) 35 / 35;
  `live-cart-ticket/` (Suthep · Peggy) 41 / 41 — seat ticket, QR, PDF, travel pass USD 85 on the live
  Worker (`seat-tickets-sample.pdf`, `travel-pass-sample.pdf`, `travel-pass-c86-sample.pdf`).
  Production was snapshotted before (rooms plan, seating plan, KV keys + metadata); the walks moved
  Suthep's dinner seat D-B-15 → D-T-01 and wrote `reg:INV-G049`; both were restored and the three
  snapshots compared again: `ROOMS {"removed":[],"added":[]}` · `SEATS {…}` empty · `KV {…}` empty —
  Haruthai's live registration (`reg:INV-G048` + its `:prev:` record) and six room places untouched.
- `live-venue-worker/` · `live-venue-pages/`: the venue walk on both origins at 6170755 (the header
  status line now sits on the venue pages too): 66 / 66 · 66 / 66 — CLS 0.001 / 0.031 (voyage 390 / 1280),
  0.002 / 0.034 (accommodation), long tasks 0, no video, the real aerial at every width, WebKit at 375 · 390 · 430.

## Read-only guest coverage on production (final code)
`2026-09-15-final-release/auth-coverage.mjs` → `auth-coverage-production.json`: 47 / 47 guests —
bearer accepted by rooms and seating (own places / own seat only), status route, browser sign-in with
own name (party label for the 42 with a party), empty own cart, sign-out; 0 write requests; a bad
bearer refused. Register audit: 47 active · 47 invitations · 47 unique codes · 2 cancelled · 0 missing ·
0 duplicate · 0 auth errors · deployed register identical.

## Public release crawl (final code · signed out)
`2026-09-15-final-release/crawl.mjs` on both origins → `crawl-worker.json`, `crawl-pages.json`:
97 pages each, 0 HTTP failures, 0 broken images, 0 console errors, 0 missing anchors, 0 retired
strings, 0 stale / private routes served, 0 secret exposure over every response body, 0 writes,
rendered text of the two origins identical. The private pages (`journeys`, `cart`, `tickets`) are no
longer public surfaces: signed out they hand over to the invitation page.

## Parity
717 served files hashed locally and on both origins: 717 / 717 identical at 40adcf4 and again at 6170755
(`docs/` is not served by either origin — `.assetsignore` —, `register-landing.html` is not served by the Worker).
