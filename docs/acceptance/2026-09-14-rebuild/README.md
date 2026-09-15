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
- `local/walk-results.json`, `local/walk-local.log` — the four-identity walk (`walk.mjs`) against a local
  Worker with the real engines (Miniflare): **63/63**, no page errors, no horizontal overflow at 320 / 375 / 430.
- `live/walk-results.json`, `live/walk-live.log`, `live/*.png` — the same walk against the **production
  Worker** at `c8dacb6` after the automatic Workers Build and the migration: **63/63** — Haruthai, then
  Suthep, then Peggy, then Steffie, each with their own code, each alone (no SWITCH; Haruthai's suite Room A
  1/2 → Suthep joins → 2/2 with both first names; Peggy refused the Presidential with the reason and refused
  a room for Steffie; Peggy Room A of The Heritage 1/2 → Steffie joins → Full → changes to Room B → Room A
  keeps Peggy alone → back; individual Sangkhathan 15 / 0; first names on the dinner plan; the one
  YOUR WEDDING SEATS card; allergy NO / YES+details; four separate sends with four separate stamps; the gate
  into Review lands on the missing control; cart REMOVE releases the place and the step needs attention).
  Test state removed again by `restore.mjs`: the four test registrations deleted, the four guests' room
  places released, the six migrated seat holds put back exactly (verified: RESTORED, room places 0, KV empty).
- Pages mirror: sign-in, the engine read with the bearer (CORS), the named seat view, the cart — 0 errors.
- Parity local = Worker = Pages by SHA-256: **262/262** (the accepted 259 − `assets/inventory.js`
  + `assets/rooms.js`, `assets/stay.js`, `cart.html`, `register/auth-index.json`).
- Unit / system tests: `npm test` 240/240 · `npm run release-check` 21/21 gates PASS.

## Migration on production (applied 14 Sep 2026, after the Worker build at c8dacb6)
`RESET=1 node src/migrate-individual.cjs --apply <private backup>` — 6 seat holds rekeyed (ok, 0 refused),
0 room places, the 3 `reg:INV-001*` keys of the Owner's 14 Sep test sends deleted (backed up privately; the
retired category ledger is no longer written by the site). Production afterwards: seats INV-G001 C-R-02-03 /
D-B-13, INV-G002 C-R-02-02 / D-B-14, INV-G049 D-B-15, INV-G048 D-B-16 with first names; REG_KV empty; room
engine empty; seating OPEN.

## Known limits / Owner decisions
- ~~The pool side of the long table is not in any project or venue record~~ — **resolved 15 Sep 2026**: the
  Owner uploaded the venue plan and confirmed RUN A = POOLSIDE; the server default is run A and the plan
  draws the water there (see `docs/acceptance/2026-09-15-cart-ticket/`).
- Single rooms (one bed, occupancy 1 in the seed) are one place, not two; every other room is two places.
- 007's About You proposal (eleven favourites + a CARE section) conflicts with the Owner's spec and was not
  applied; source-truth items (Sathorn rates, dinner venue name) untouched — C86 = USD 105 since 15 Sep 2026.
