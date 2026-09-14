# 002 — MAJOR BOOKING-SYSTEM REBUILD · individual guest invitations · cart (14 Sep 2026)

Owner decision: **ONE GUEST = ONE INVITATION = ONE ACCESS CODE = ONE JOURNEY = ONE PRICE TOTAL = ONE SET
OF ANSWERS.** The party is metadata. No SWITCH, no ANSWERING FOR, no party pricing. Rooms are real
occupancy (allocation units of two places, held in the guest's own name). The bag icon opens a cart; the
sticky VIEW respects the sequential flow. Codes are never printed here.

## What changed (files)
- Register: `src/build-invitations.cjs` — one encrypted record per ACTIVE guest (`INV-<guestId>`), the
  party's former code kept by the lead guest (or the remaining active guest when the lead is cancelled), a
  new code for every other guest; the private register migrated to
  `guestId,invitationId,partyId,partyName,name,token,link,status` with the old register kept as a dated
  private backup; `register/auth-index.json` (one-way digests → invitation / guest / party / hosts).
- Auth: `register/crypto.mjs` (`bearerOf`, `authIdOf`), `src/auth.js` (Worker identity from the bearer),
  `src/worker.js` (every write verified; a claimed identity header stripped; `/api/inventory` → 410;
  `/api/rooms`), `src/seating.js` (identity-bound select/release, first names, `party` state, `rekey`,
  `poolSide`), `src/rooms.js` (the occupancy engine), `wrangler.jsonc` (Rooms DO, migration v3).
- Client: `assets/invite.mjs` (single-guest session + bearer; leave/restore per guest; legacy draft
  migration), `assets/guest.js` (the guest record + ONE readiness engine), `assets/prep-shell.js` (statuses,
  missing items, gate, strict Continue), `assets/rooms.js` + `assets/stay.js` (units, join/leave/change),
  `assets/temple.js` (individual Sangkhathan), `assets/bag.js` (own badge, VIEW → engine), `assets/seating.js`
  (names, pool), `assets/seatpass.js`, `assets/prep.css` (states, motion), pages 01–06, `cart.html`,
  `journeys.html`, `room.html`, `experience.html`, `tea.html`, `you.html` (hands over to 01).
- Experiences: PVO Vietnamese Food, Khop Chai Deu, Le Padaek, Parkson Supermarket Laos removed; Lacuna
  VTE café only. Copy per the 007 review where it does not conflict (see `docs/review/007-change-manifest.md`).
- Tests: `test/rooms`, `test/auth`, `test/guest-scope`, `test/flow`, `test/sandbox.mjs`; the E/F/G,
  eligibility, experiences, guest-testing, recompose, seating-labels, pricing and inventory suites adapted;
  `test/party-person` retired. Gates: 2b (room engine), P9 (one code = one guest), P11 adapted.

## Migration (dry run, production state backed up privately first)
```
ACTIVE GUESTS                  47
INDIVIDUAL INVITATIONS CREATED 47
PARTIES RETAINED               26  (+ 1 cancelled party, inactive)
CODES RETAINED FOR LEADS       25  (+ 1 retained by the remaining active guest of a party whose lead is cancelled)
NEW CODES GENERATED            21
STATE RECORDS MIGRATED         6   (6 seat holds rekeyed by guestId: G001, G002, G048, G049 · 0 room places)
AMBIGUOUS RECORDS              9 → 0 after the documented reset of the Owner's 14 Sep test data:
                                   reg:INV-001 (+2 history keys) — a party record cannot become one guest's journey;
                                   the INV-001 category allocation of the same test send (6 lines, qty 1 for a
                                   party of two) — occupants cannot be named deterministically.
ERRORS                         0
```
Backups (private, outside the repository): the party register CSV, the KV keys and values, the seating plan,
the category allocations, the statuses. The migration plan and result carry first names and are kept
privately too.

## Evidence
- `local/walk-results.json` — the four-identity walk (`walk.mjs`) against a local Worker with the real
  engines (Miniflare): **63/63**, no page errors, no horizontal overflow at 320 / 375 / 430.
- `live/` — the same walk against production after deployment (see the section below).
- Unit / system tests: `npm test` 240/240 · `npm run release-check` 21/21 gates PASS.

## Known limits / Owner decisions
- The pool side of the long table is not in any project or venue record: the plan draws the pool only once
  Guest Relations records the side (`node src/gr.cjs seating-state --pool T|B`); until then the words say so.
- Single rooms (one bed, occupancy 1 in the seed) are one place, not two; every other room is two places.
- 007's About You proposal (eleven favourites + a CARE section) conflicts with the Owner's spec and was not
  applied; source-truth items (C86 amount, Sathorn rates, dinner venue name) untouched.
