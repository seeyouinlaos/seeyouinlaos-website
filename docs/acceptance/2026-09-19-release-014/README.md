# Release 014 · FINAL DATA RECONCILIATION · PACKAGE MODEL · GUEST REGISTER · CLEAN RESET · QA · GO-LIVE (Owner instruction, 19 Sep 2026)

Branch `release-014` from main `f88b9f6` (release 013 live). This folder is the acceptance record: the stage E2E, the read-only
live acceptance, the reset execution record and the parity proof. The Codex record is `docs/review/015-codex-release-014/`.

## 1 · What changed (the Owner's model, implemented)
- **The fixed-arrangement concept is deleted.** `FIXED = []`, every seed entry `held: 0`, no `reservedFor`, `mayJoin` needs only an identity, `assets/arranged.js` removed, no "Arranged for you" on any page or email, the Worker and the Drafts actor strip nothing, host-ness is the record's authenticated flag alone (`record.hosts`). The hosts start at zero and choose like every guest.
- **Packages are configuration** (`assets/packages-data.js`): Complete trip (all ten stages A–J, an ordered fallback chain per room stage: the default → the same house's neighbours → the alternative houses). **The Essential trip is NOT invented**: the Operations Master (19 Sep 2026) defines no Essential package and the earlier website composition (the wedding stay alone, from the 8–9 Sep "Cost Saving" mode) was the website's own — the slot is structurally ready (`approved: false`, no stages) and is not offered as a card until the Owner names its stages; the package mechanics are proven in the tests with a fixture package. `SIYL_JOURNEY.packagePlan(kind)` is pure; the preview shows every row (default · named replacement · waiting list · unchanged); the confirm is bound to the previewed plan by its signature (a changed engine redraws, nothing is applied); a package REPLACES a conflicting manual selection and reverses a decline; a held room is never released before its replacement is held. Capacity decides, never price.
- **Party capacity**: a unit takes the whole party or none of it (`need`; the party members already in the unit count). The room page and The Journey offer only units that fit; the engine refuses `full for your party` (409).
- **The waiting list (last)**: the engine's own line per stage (`wl:<stage>|<guestId>`), deterministic positions by time (renumbered as the line moves), cleared by a hold, by leaving the line, by a Guest Relations assignment and by the clean reset; USD 0 until resolved; an answered stage for readiness; on My Trip (the card with "Choose a stay" / "Leave the waiting list"), Profile (the position), Review and both emails ("Waiting list"). A package with a waitlisted stage is never called fully confirmed.
- **Canonical counts**: relevant = confirmed + waitlisted + declined + open; excluded = the stages outside the scope; bagItems = the actual lines; bagTotal = the chargeable confirmed lines only.
- **D2 = Guest House complimentary**: `guesthouse/guest-house`, ONE shared house of SIX places, complimentary, occupants' first names to signed-in guests (never to the public), never "Private Residence", never "up to 4"; the room page shows the live places; Journey card `#j-guesthouse`; THE HOUSES card.
- **The current Operations Master wins**: C86 USD 105 (was the Edit 2 override of 85); Lijiang and Kempinski six rooms per category (were 4); the dated venues — 21.02 dinner Sühring, the Aman tea moved to 24.02 (Thong Smith undated), 23.02 dinner Baan Phraya (The Commons stays the mall), 07.03 dinner Cannubi by Umberto Bombana and the experience Harudot (also the café of 23.02), 08.03 dinner Petits Plats Bangkok (no photograph by record); new places with the Owner's Drive media and provenance (no dish close-ups); the Riverside Hotel photographed (7 frames) — "Photography to follow" gone.
- **The register**: the current 007 rows (the two changed cells of 19 Sep applied), a placeholder rule ("Aob's girlfriend", a "." surname) — 85 active guests · 63 parties · 9 retired · 0 new codes.

## 2 · Proofs
| Proof | Where | Result |
|---|---|---|
| Unit suite (`npm test`) | `test/release-014.test.mjs` (15) + every earlier suite rewritten to the model | **390 / 390 passed** (release-014: 16; release-013 now in the list) |
| Release gates (`npm run release-check`) | gates 2b and P9 rewritten (no reservation, party capacity, waiting list) | **RELEASE CHECK PASSED** (25 gates incl. I1 infra freeze intact) |
| Stage E2E 014 | `e2e.mjs` → `stage/` | **44 / 44 passed** (`stage/e2e-014.json`, screenshots, the four parity mails) |
| Stage E2E 013 / 012 / 011 / P0 / IA (regression, obsolete sections ported) | `../2026-09-19-release-013/e2e.mjs` … | **013 35/35 · 012 25/25 · 011 52/52 · P0 52/52 · IA 35/35** (`stage/e2e-*-regression.json`) |
| Adversarial verification (substitute for the refused Codex review) | `../../review/015-codex-release-014/adversarial-verification.md` | 6 lenses · 58 findings · every one decided by hand and fixed where real (the refute stage was cut by the subagent session limit); NOT a Codex review |
| Deploy (push to `main` → Workers Build) + parity | `live/parity-<version>.json` | main `1c9e107` (PR #8, merge of `7e6d939`+`…`) → Workers Build version **49ee4e0d** at 2026-09-19T20:15:46Z · parity **259 / 259 files identical** (`live/parity-49ee4e0d.json`) · `infra-guard --live` intact |
| THE FINAL CLEAN RESET (dry run → snapshot → execute → zero) | `live/reset-*.json` | executed ONCE after the deploy, epoch **2026-09-19T20:28:40.485Z** (dry run: 0 holds · 0 waiting · 0 seats · 1 draft · 2 KV keys → snapshot `src/reset-backup-2026-09-19T20-28-31-782Z.private.json`, 3 values → execute → dry run after: 0 · 0 · 0 · 0 · 0 → GR verification: 149 units, 0 occupancy, 0 party places, 0 waitlisted, 0 seats, seating open, 0 journeys with state) — `live/reset-1..5` |
| Read-only live acceptance | `live-ro.mjs` → `live/live-ro.json` | **21 / 21 passed** (`live/live-ro.json`, screenshots) — read-only, no code used |

## 3 · Codex
Refused by quota at 15:15 (pre) and 16:34 (final) — "try again at Sep 24th, 2026 10:19 PM". Not represented as passed. READY TO SEND = **NO** until the Codex final review of the deployed build (`docs/review/015-codex-release-014/PLAN.md` §Final review) succeeds or the Owner waives it.

## 4 · Owner decisions taken (documented assumptions)
1. ~~Essential trip = the wedding stay alone~~ — WITHDRAWN (19 Sep 2026, evening): that composition was the website's own inference, not an Owner definition; the Essential trip ships without a composition and is not offered. **Owner input needed to offer it: its stages and chains** (`assets/packages-data.js`, then `SIYL_PACKAGE_ORDER`).
2. Every room unit keeps the Owner's rule of two guest places (15 Sep 2026); the Presidential is one room of two places; a family of more than two takes two units of the same category through the party rule.
3. Sühring is dated as the Owner says (21.02 · Dinner). The restaurant record's lunch opening-hour lines are kept as the source (`practical.sourceHours`) but no longer shown beside the dated dinner — no invented hours, no misleading meal-hours copy.
4. Petits Plats Bangkok has no Drive folder and no sheet record: the card stands without a photograph rather than an invented one.
5. Lijiang and Kempinski capacities follow the master's "Available 6" per category (the workbook's rooming rows); the 8 Sep seed's 4 is superseded.
6. The Riverside rate is USD 30 pp/night — the current Overview, the Accommodation_Details and the Budget agree (the release-012 conflict of 25 is gone from the current master).

## 5 · Master-internal differences — traced and classified (19 Sep 2026, evening)
| Difference | Classification | Result |
|---|---|---|
| The Aman tea 24.02 (Overview) vs 21.02 (Event Programme) | resolved by the Owner's explicit dated assignment | 24.02 — the site |
| Petits Plats 08.03 (Overview) vs 06.03 (Event Programme) | resolved by the Owner's explicit dated assignment | 08.03 — the site |
| Sühring dinner vs the record's lunch hours | the dated assignment wins; the hours are descriptive record copy | dinner; the hours suppressed on the card, kept as source |
| The Event Programme's Days 14–16 (a Bangkok day at the Sathon Penthouse on 06.03, Kempinski check-in 07.03) | stale Event Programme copy — the structured Overview (APPROVED Suthep, 18.09.2026) has Day 14 = the flight Lijiang → Bangkok and the Kempinski from 06.03 | the site follows the Overview; no change |
| The night train 100 vs the Budget's 80 + 30 | the Budget itemises the same 100 (train 80 + van/border 30) — derived internal copy | 100 — the site |
| D2 "Available" 2 → 3 in the sheets vs six places | the Owner's instruction defines six bookable places | six — the site |
| The return flight: the Budget's "MU5920, Economy Class" vs the website's "MU5924 + MU741 via Kunming" (whose times 10:35 → 14:55 match the Overview's 10:35 – 15:00) | two current Owner sources give different flight identities for the same USD 200 leg; the Overview carries no number | **OWNER DECISION REQUIRED** (the only one) — price, date and times unchanged either way; the site keeps the routing that matches the Overview's times until the Owner names the flight |
