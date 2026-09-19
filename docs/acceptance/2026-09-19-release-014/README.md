# Release 014 · FINAL DATA RECONCILIATION · PACKAGE MODEL · GUEST REGISTER · CLEAN RESET · QA · GO-LIVE (Owner instruction, 19 Sep 2026)

Branch `release-014` from main `f88b9f6` (release 013 live). This folder is the acceptance record: the stage E2E, the read-only
live acceptance, the reset execution record and the parity proof. The Codex record is `docs/review/015-codex-release-014/`.

## 1 · What changed (the Owner's model, implemented)
- **The fixed-arrangement concept is deleted.** `FIXED = []`, every seed entry `held: 0`, no `reservedFor`, `mayJoin` needs only an identity, `assets/arranged.js` removed, no "Arranged for you" on any page or email, the Worker and the Drafts actor strip nothing, host-ness is the record's authenticated flag alone (`record.hosts`). The hosts start at zero and choose like every guest.
- **Packages are configuration** (`assets/packages-data.js`): Complete trip (all ten stages A–J, an ordered fallback chain per room stage: the default → the same house's neighbours → the alternative houses) and Essential trip (the wedding stay only: The Heritage → Heritage Executive → Heritage Grand Premier → Riverside → Guest House), both on the same card presentation. `SIYL_JOURNEY.packagePlan(kind)` is pure; the preview shows every row (default · named replacement · waiting list · unchanged); the confirm is bound to the previewed plan by its signature (a changed engine redraws, nothing is applied); a package REPLACES a conflicting manual selection and reverses a decline; a held room is never released before its replacement is held. Capacity decides, never price.
- **Party capacity**: a unit takes the whole party or none of it (`need`; the party members already in the unit count). The room page and The Journey offer only units that fit; the engine refuses `full for your party` (409).
- **The waiting list (last)**: the engine's own line per stage (`wl:<stage>|<guestId>`), deterministic positions by time (renumbered as the line moves), cleared by a hold, by leaving the line, by a Guest Relations assignment and by the clean reset; USD 0 until resolved; an answered stage for readiness; on My Trip (the card with "Choose a stay" / "Leave the waiting list"), Profile (the position), Review and both emails ("Waiting list"). A package with a waitlisted stage is never called fully confirmed.
- **Canonical counts**: relevant = confirmed + waitlisted + declined + open; excluded = the stages outside the scope; bagItems = the actual lines; bagTotal = the chargeable confirmed lines only.
- **D2 = Guest House complimentary**: `guesthouse/guest-house`, ONE shared house of SIX places, complimentary, occupants' first names to signed-in guests (never to the public), never "Private Residence", never "up to 4"; the room page shows the live places; Journey card `#j-guesthouse`; THE HOUSES card.
- **The current Operations Master wins**: C86 USD 105 (was the Edit 2 override of 85); Lijiang and Kempinski six rooms per category (were 4); the dated venues — 21.02 dinner Sühring, the Aman tea moved to 24.02 (Thong Smith undated), 23.02 dinner Baan Phraya (The Commons stays the mall), 07.03 dinner Cannubi by Umberto Bombana and the experience Harudot (also the café of 23.02), 08.03 dinner Petits Plats Bangkok (no photograph by record); new places with the Owner's Drive media and provenance (no dish close-ups); the Riverside Hotel photographed (7 frames) — "Photography to follow" gone.
- **The register**: the current 007 rows (the two changed cells of 19 Sep applied), a placeholder rule ("Aob's girlfriend", a "." surname) — 85 active guests · 63 parties · 9 retired · 0 new codes.

## 2 · Proofs
| Proof | Where | Result |
|---|---|---|
| Unit suite (`npm test`) | `test/release-014.test.mjs` (15) + every earlier suite rewritten to the model | __UNIT__ |
| Release gates (`npm run release-check`) | gates 2b and P9 rewritten (no reservation, party capacity, waiting list) | __GATES__ |
| Stage E2E 014 | `e2e.mjs` → `stage/` | __E2E014__ |
| Stage E2E 013 / 012 / 011 / P0 / IA (regression, obsolete sections ported) | `../2026-09-19-release-013/e2e.mjs` … | __E2EREG__ |
| Adversarial verification (substitute for the refused Codex review) | `../../review/015-codex-release-014/adversarial-verification.md` | __ADV__ |
| Deploy (push to `main` → Workers Build) + parity | `live/parity-<version>.json` | __DEPLOY__ |
| THE FINAL CLEAN RESET (dry run → snapshot → execute → zero) | `live/reset-*.json` | __RESET__ |
| Read-only live acceptance | `live-ro.mjs` → `live/live-ro.json` | __LIVE__ |

## 3 · Codex
__CODEX__

## 4 · Owner decisions taken (documented assumptions)
1. Essential trip = the wedding stay alone (27 Feb – 01 Mar), the entry category first — the instruction named it "the wedding-focused package" without a stage list.
2. Every room unit keeps the Owner's rule of two guest places (15 Sep 2026); the Presidential is one room of two places; a family of more than two takes two units of the same category through the party rule.
3. Sühring is dated as the Owner's Overview says (21.02 · Dinner) although the restaurant's own record lists lunch hours — the hours stay on the page as the house's, the request reads Dinner · Sunday, 21 February 2027.
4. Petits Plats Bangkok has no Drive folder and no sheet record: the card stands without a photograph rather than an invented one.
5. Lijiang and Kempinski capacities follow the master's "Available 6" per category (the workbook's rooming rows); the 8 Sep seed's 4 is superseded.
6. The Riverside rate is USD 30 pp/night — the current Overview, the Accommodation_Details and the Budget agree (the release-012 conflict of 25 is gone from the current master).

## 5 · Master-internal inconsistencies reported to the Owner (not decided here)
The Aman tea 24.02 (Overview) vs 21.02 (Event Programme); Petits Plats 08.03 (Overview) vs 06.03 (Event Programme); Sühring dinner vs its lunch-only hours; the Event Programme's Days 14–16 still at the Sathorn Penthouse; the night train 100 vs the Budget's 80 + 30; the D2 "Available" 2 → 3 in the sheets vs the Owner's six places; MU5924 + MU741 vs the Budget's MU5920.
