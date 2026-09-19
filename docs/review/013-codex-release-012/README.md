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

The confirming pass on the complete diff after 012-1. Codex's structured envelope failed to parse; its prose verdict named two
orderings, both reproduced, both classified **VALID P1** and fixed (012-2). "Stage lookup without SIYL_JOURNEY and with the engine
still loading worked in the targeted check" — the rest of the diff raised nothing further.

**012-2a · A device whose engine view is older than the guest's switch could release the current hold.** Device 2 read the
engine while Souphattra was held; device 1 switched to the Riverside; device 2 pressed Remove on its Souphattra line: its
(stale) view said the stage's hold was Souphattra, so `ST.remove` called `leave(stage)`, and the Worker released every place
of the stage — the Riverside. Fix at the engine: a release names its window. `src/rooms.js` `leave` takes an optional
`window` and releases only the guest's places in that window (`released: []` and the fresh view when it holds nothing there);
`assets/rooms.js` `U.leave(stage, win)` sends it; `assets/stay.js` `remove(win)` always names its window. The stage-wide release
(no window) stays exactly as it was for the planner's own reconciliation (`your-journey.html` — CODEX 011-7). Device 2 then
reads the truth from the answer (the Riverside is held) and its sync writes the held line: never nothing, never both.

**012-2b · A delayed draft copy replayed onto a fresh choice carried the other hotel's line back.** The copy read before the
choice had no stay line, the server's copy (another device) carried Souphattra, the guest chose the Riverside while the read
was in flight: the Bag replay (`assets/draft.js`, which knows no stages) keeps both. Fix: `ST.settle()` — the leftover rule
alone (a line of a hotel the engine does not hold while it holds another hotel of the same stage leaves) — runs on every
`siyl:bag` change, re-entrancy guarded; nothing else of the sync runs there (no line is brought back, no unit rewritten), so the
planner's reconciliation order (011-7) is unchanged. The full `sync()` still runs on every engine event as before.

Coverage: `test/release-012.test.mjs` "a stale device's Remove releases only its own window; a replayed draft copy never keeps
two hotels" — the engine's windowed release (nothing released for the wrong window, the stage-wide release untouched), two
sandbox devices against one engine (device 2's Remove after device 1's switch: the Riverside hold stays, device 2 ends with the
held line, USD 60), the replay reproduced through `SIYL_DRAFT._replay` (both lines) and settled on the `siyl:bag` event (one
line), and the 011-7 order preserved (a Bag removal alone brings nothing back; the engine sync does).
