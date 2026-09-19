# 013 · Codex adversarial review of Release 012 (19 Sep 2026)

Run from the working checkout on branch `release-012` against `main` with the complete diff
(`codex-companion.mjs adversarial-review --wait --base main …`), the focus being The Journey gallery grammar, the two media
builders and gate M1, the Riverside Hotel wiring on every surface, the café role change and the removed image files.

## Pass 1 — `pass-1.md`

One finding, **[high]**, classified **VALID P1** and fixed before any deploy.

**012-1 · Switching wedding hotels left the previous priced selection behind** (`assets/stay.js` `write` / `remove`,
`assets/journey.js` `SEGMENTS[wedstay].ids`). Reproduced by Codex with the shipped modules and the in-memory engine: choose
Souphattra `wedstay/heritage` A, then Riverside `riverside/superior-window` A. The engine correctly held one place per stage
(Riverside only), but `ST.write()` cleared only `P.ids(win)` — the ids of the window being written, never those of the other
hotels that answer the same stage — so the Bag kept Souphattra USD 145 *and* Riverside USD 60 (USD 205). Readiness then named
`room:wedstay` for the stale Souphattra line, and removing that stale line called `leave('wedstay')`, which released the valid
Riverside hold and left its Bag line unheld. Before 012 the only alternative in the stage was the private residence, which is
chosen through the Cost Saving plan (it removes the other line explicitly) — the Riverside is the first second *hotel* chosen
through the room page and The Journey, which is why the seam opened now.

Fix (presentation untouched, one selection per stage):
- `assets/stay.js`: `stageIds(win)` — every Bag id of every window that answers the same stage as `win`, derived from the stay
  data (`SIYL_ROOMS` windows), the engine's stage map (`U.stageOf`) and the journey segments; `write()` clears `stageIds(win)`
  before it puts the new line; `remove(win)` drops a line the engine does not hold while it holds ANOTHER hotel of the stage
  without calling `leave` (the current hold stays); `sync()` drops such a leftover line on any page load (an older draft,
  another device — the engine is the truth); `sibling(win)` and `houseOf(line)` for the surfaces.
- `assets/journey.js` `decline(seg)`: every room line of the stage goes through `ST.remove` one after the other (a leftover
  simply leaves, the held one releases its place), then the stage is declined.
- `room.html` and `journeys.html`: when the trip holds the other hotel of the stage the note names it with its house —
  "Your trip currently holds Superior Room With Window at Riverside Hotel Vientiane for this stay — adding this room replaces it."

Coverage added:
- `test/release-012.test.mjs` "ONE WEDDING STAY": all six switch directions among Souphattra, the residence and the Riverside
  against the real in-memory engine — one Bag line, the chosen hotel's total alone, one engine hold, the previous place
  released (occupancy 0/1), `staleFor()` empty, no `room:` readiness item; the exact state Codex reproduced (two lines,
  USD 205) is built by hand and then: `remove` of the leftover keeps the Riverside hold, `sync` drops the leftover, `decline`
  with a leftover present releases the held place and declines the stage.
- `docs/acceptance/2026-09-19-release-012/e2e.mjs` checks `switch-journey-card-names-the-riverside`,
  `switch-room-page-names-the-riverside`, `switch-one-line-one-hold`, `switch-back-names-souphattra`, `switch-back-one-line`
  — the switch through the real pages in Chromium on a fresh stage (25/25).
- `test/recompose.test.mjs` pins the stage-wide replace.

## Pass 2 — `pass-2.md`

The confirming pass on the complete diff after the fix (see the file for the verdict).
