# THE WEDDING DINNER · ONE DETAIL (Owner, 21 Sep 2026)

## Root cause

On The Wedding (`voyage.html`, the one "The Wedding" menu entry) the dinner was presented twice, side by side, and its
photographs lived in two unrelated lists:

1. section 04 — the pair "19:30 · Poolside / Wedding Dinner / copy / Dress · Black Tie / View dress code" — followed by a
   separate gallery block hard-coded with the eleven frames of the Owner's Drive folder 056 (the site's editorial carousel);
2. the venue map (`assets/venue.js` + `assets/venue-data.js`), whose places (01–07) include "05 · Wedding Dinner · Poolside"
   as the FIRST place shown, with its own title, its own four-photograph list (the older 053 files + one venue frame),
   thumbnails, the seating story and a "THE WEDDING DINNER" link — to `voyage.html#dinner`, the same page, a few screens up.

So a guest scrolling the page met the dinner pair, then its gallery, then the map's dinner detail with different pictures:
the same event three times, and the two image lists had drifted (053 vs 056 — mostly the same photographs under two
names, with one unique frame in each set). There was no play/pause control in either treatment; what read as a "paused"
state was the gallery block waiting hidden behind a scroll reveal (`data-motion="reveal"`) until it entered the viewport.

## The one record and the one detail

`assets/wedding-dinner.js` · `SIYL_WEDDING_DINNER` — the facts once (Sunday, 28 February 2027 · 19:30 · Poolside ·
Souphattra Heritage Vientiane · Black Tie · the Chinese sharing menu · the one long table's seating words) and the media:
**13 photographs** — the eleven frames of Drive 056 plus the two frames only the venue map's list had (the pool terrace
from the upper floor; the square dim-sum frame of 053). The other 053 files are the same photographs as 056 frames (checked
pixel for pixel) and are not listed twice. The dark candlelit long table (056-08) is in the set. Event media stays apart
from accommodation media: no frame of the record is a Souphattra accommodation frame and the hotel's resolver
(`SIYL_STAY_ART`) never draws a dinner frame.

- The Wedding: section 04 (`#dinner`) is the ONE detail — eyebrow "Sunday, 28 February 2027 · 19:30 · Poolside", the title,
  the copy, Dress · Black Tie, View dress code — and directly under it the one gallery, filled from the record, upgraded by
  the site's carousel (`assets/refgal.js`): large active frame, next-frame peek, swipe (native snap scroll), previous / next,
  a count, the progress rail; no autoplay, no pause, no second title, no hidden reveal.
- The venue map: "05 · Wedding Dinner · Poolside" stays a place on the aerial photograph and in the legend, as an INDEX ENTRY
  — the time, the seating of the one long table, the way "The Wedding Dinner" → `#dinner` — with no photograph of its own.
- Home: the existing teaser ("The Wedding" pair → "The wedding days") stands; it never carried a dinner detail.
- My Profile's Wedding Dinner card reads the record's lead frame; every other link (`voyage.html#dinner`) resolves to the one
  anchor; one "The Wedding" menu entry.

Tests: `test/wedding-dinner.test.mjs` (3), `test/venue.test.mjs` and `test/pricing.test.mjs` re-pinned; E2E
`docs/acceptance/2026-09-21-wedding-dinner/e2e.mjs` (WebKit iPhone 13 at 320 / 390, Chromium at 834 / 1440).

## Live (21 Sep 2026)

Commit `60ff00c` → Workers Build → version `e455c666-f40c-48ca-9445-64c559621ce4` (17:30:12Z) on the one Worker. Parity 262/262,
live-ro 25/25, infra freeze intact. In real WebKit (iPhone 13) on production: one `#dinner`, one "Wedding Dinner" title,
the eyebrow "Sunday, 28 February 2027 · 19:30 · Poolside", the one carousel with 13 slides ("1 / 13", two arrows, no
play/pause), the candlelit table and the dim sum among them, no overflow; the venue map's dinner is an index entry without a
photograph whose link is `#dinner` (`live/live-iphone-*.jpg`). Production aggregates read-only before (16:33Z) and after
(17:36Z), `live-aggregates.json`: 32 room occupancies (the same by stage) · 0 waitlisted · 12 seat holds unchanged; drafts
14 → 15, contact 14 → 15, avatar 6 → 7, reg 14 → 15 — one real guest sent a trip with a portrait between the two readings
(real activity, not this pass: nothing in this pass authenticates as a guest on the live Worker; no reset, no synthetic
activity).

Codex: PENDING — EXTERNAL QUOTA LIMIT (usage limit until 24 Sep 2026 22:19 CEST; the probe refused).
