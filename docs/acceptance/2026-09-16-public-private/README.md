# 004 — Public / private access · the final information architecture (Owner, 16 Sep 2026) · evidence

No access code, bearer or hash appears in this folder. The private register is gitignored. Production walks ran as
Suthep (G049), Peggy (G001) or Steffie (G002) — never as the invitation the Owner uses live.

## The model
| surface | state | what a visitor sees |
|---|---|---|
| DESTINATIONS (`destination.html`) | public editorial | discovery — no amount, no action |
| THE JOURNEY (`journeys.html`) | public editorial | the trip chapter by chapter: places, dates, photographs; every amount, room row, fare and add is a private fragment (`data-private`) that never enters a signed-out page; the way in — **Open your invitation**, with the way back — stands where the planning would be; signed in, the same address is the planner |
| YOUR JOURNEY (`your-journey.html`) and its steps, the bag, the tickets, the room and transport planning pages | private | hand over to the invitation page and come back after the code (`?next=`); every link to them on a public page leads there; a public call to action into private planning reads **Open your invitation** signed out (`data-cta-swap`) and is the relevant private action again signed in; the close CTA reads **Continue Your Journey** → the planner for a guest (`data-cta-in`) |

The document says its state before the first paint (`assets/invite-early.js` → `<html data-session="in|out">`);
`assets/aman.css` keeps every `[data-private]` fragment out of a signed-out first paint and every `[data-private-cta]`
out of a guest's page; `assets/invite.mjs` removes the private fragments from a signed-out document and keeps the
attribute, the links and the labels current. Tests: `test/access.test.mjs` (5). Suite 272 / 272.

## The audit (`leak-audit.mjs`, 93 routes of the release crawl)
Signed out, then signed in as a read-only fixture (G001): amounts of the journey (USD …), private actions (add · remove ·
cancel · change · choose · a fare class), live inventory (places available · Room A … · fully booked), the direct
address of every private route, the header status line, the way in.

| origin | signed out: price leak · private-action leak · inventory leak · direct-URL bypass | private routes handed over | signed in: private routes reached · public pages still showing the way in |
|---|---|---|---|
| local Worker (621be9c) | 0 · 0 · 0 · 0 | 44 / 44 | 44 / 44 · 0 |
| Worker origin (`audit-worker.json`) | 0 · 0 · 0 · 0 | 44 / 44 | 44 / 44 · 0 |
| GitHub Pages mirror (`audit-pages.json`) | 0 · 0 · 0 · 0 | 44 / 44 | 44 / 44 · 0 |

Every one of the 93 routes carries the status line in both states (NOT SIGNED IN · OPEN YOUR INVITATION / SIGNED IN ·
name · YOUR JOURNEY · SIGN OUT). 0 writes were made; a bad bearer is refused (auth coverage).

## The rendered walks at 621be9c
- `../2026-09-16-access/walk.mjs` (44 checks, G001 read-only): local 44 / 44 · Worker 44 / 44 · Pages 44 / 44 — The
  Journey signed out (no amount, no room row, no fare, no add, the way in in every stay card, the view links swapped),
  the hand-overs, the header status, the close CTA in both states, the wedding page's actions in both states, a room
  page for a guest, Sign out.
- The booking regression on production (Suthep · Peggy · Steffie): `../2026-09-16-access/live-ticket-rooms/` 35 / 35,
  `../2026-09-16-access/live-cart-ticket/` 41 / 41 — production snapshotted before (rooms plan, seating plan, KV keys +
  metadata), Suthep's dinner seat and the walk's `reg:INV-G049` restored, the three snapshots compared again: every
  diff empty (Haruthai's live registration and six room places untouched).
- Local Worker, four identities: `2026-09-14-rebuild` 64 / 64 · `2026-09-15-cart-ticket` 41 / 41 · `2026-09-15-ticket-rooms`
  36 / 36 · `2026-09-15-venue` 68 / 68 (the Owner's seven labels).
- The venue walk live: `../2026-09-16-access/live-venue-worker/` 68 / 68 · `live-venue-pages/` 68 / 68.
- The public crawl of both origins (`../2026-09-16-access/crawl-*.json`): 97 pages each (public 49 · guest area 48),
  0 HTTP failures, 0 broken images, 0 console errors, 0 missing anchors, 0 retired strings, 0 stale / private routes
  served, 0 secret exposure over every response body, rendered text of 93 pages identical between the origins.
- Read-only guest coverage on production (`../2026-09-16-access/auth-coverage-production.json`): 47 / 47 with the
  rotated credential in place; 0 writes; a bad bearer refused.
- Parity: 719 served files identical locally, Worker, Pages (717 / 717 + the two new files).
