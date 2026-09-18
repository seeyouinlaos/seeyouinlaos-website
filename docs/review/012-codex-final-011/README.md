# 012 — Codex final adversarial pass on release 011 (18 Sep 2026)

Run after the complete diff of `release-011` against `main` (commit ba240ad), as the Owner's brief requires; the
companion command was `/codex:adversarial-review --base main` with the release's focus list. `CODEX-REVIEW-1.md` is
the verbatim first result (verdict: needs-attention, five findings). Classification and action:

| # | Finding | Class | Action |
|---|---|---|---|
| 1 | [high] A failed room release still let the guest send: the scope was declined, readiness ignored the excluded stage, the priced line and the hold stayed | **VALID · P1** | `SIYL_GUEST.staleFor()` — every Bag line, engine room and wedding seat outside the guest's destinations is a missing item of step 02 (`release:…`, a way back to the question) until it has left; Review & Send waits. `your-journey.html`: a failed release is named on the scope card ("Not released yet … Release again") and the page retries once per answer on load. Regression `CODEX 011-1`; E2E `failed-release-named-then-released` (the release aborted on purpose, then released) |
| 2 | [high] Declining Vientiane still sent the earlier wedding attendance (dinner "Joining") in the payload and both emails | **VALID · P1** | `SIYL_TEMPLE.operational()` is scope-aware (`participation: Not joining this trip / Not joining Vientiane`; every moment "Not joining", no offering, nothing open); `src/mail-templates.js` prints Not joining, no seat and no offering for such a record even in an older shape. The answers stay on the device for a reconsideration. Regression `CODEX 011-2`; E2E `decline-path-no-wedding-attendance-sent` |
| 3 | [medium] The Essential trip preset added the Vientiane wedding stay for a guest who excluded Vientiane | **VALID · P2** (fixed) | `costSavingPlan` adds nothing outside Vientiane and marks only relevant stages self-arranged; the control is offered only to a guest joining Vientiane. Regression `CODEX 011-3` |
| 4 | [medium] The first draft read could still overwrite a decision made while it was in flight (the pre-read snapshot is not a common ancestor) | **VALID · P2** (fixed) | `assets/draft.js` pull: a key changed on this device during the read is the guest's live action and wins; the server's older value for it was what was being fetched. Regression `CODEX 011-4` |
| 5 | [medium] Both emails still mapped the retired snack answer; the required flavour never reached Guest Relations | **VALID · P2** (fixed) | `src/mail-templates.js`: My Favorite Flavor with the client's migration rule (one of the six, or the snack answer only when it is one of the six). Regression `CODEX 011-5` |

After the fixes: `npm test` 348 / 348 · release-check 24 gates · stage E2E release-011 51 / 51, P0 Empty Bag 49 / 49,
account IA 33 / 33, sticky shell 320 checks · 0 failures.

## Confirming pass (`CODEX-REVIEW-2.md`, verdict: needs-attention, four findings)

| # | Finding | Class | Action |
|---|---|---|---|
| 6 | [high] The reconciliation re-entered itself: a synchronous Bag removal re-rendered before the guard was set, and the earlier offering answer removed an absent line again and again — a release storm | **VALID · P1** | `reconcileScope` sets its guard and tag before any mutation, runs one at a time (an answer changed meanwhile is reconciled once afterwards), removes the offering line only when it exists; `render()` never starts one while one runs. The offering itself now follows the scope in `assets/temple.js` (`offeringGuests()` is empty for a guest not joining Vientiane, so its own sync never brings the line back on a later page). Regression `CODEX 011-6`; E2E `reentrancy-one-release-each` (one `leave`, two seat releases, nothing more) |
| 7 | [medium] An engine hold without a Bag line of its own (a stale draft) was named but never released — stranded | **VALID · P2** (fixed) | the planner walks `SIYL_UNITS.view().mine` and releases every hold outside the trip through the engine (`U.leave`), the fixed arrangement excluded by construction (never in `mine`). Regression `CODEX 011-7` |
| 8 | [medium] A frozen seating ledger made a truthful decline impossible to send | **VALID · P2** (fixed) | a seat counts as a blocker only while the ledger is open to the guest (`open && !frozen`); a frozen ledger's seat is Guest Relations' to release — the decline is sent and says Not joining. Regression `CODEX 011-8` |
| 9 | [medium] The whole-key pull override could resurrect a line removed on another device (the device's older cache around the live edit) | **VALID · P2** (fixed) | `assets/draft.js` replays only the live edit onto the fetched copy: the Bag line by line (a line added or changed here is added, a line removed here is removed, a line the server no longer holds stays gone), the stage decisions as a set, every other record field by field. Regression `CODEX 011-9` (the reviewer's two-device case included) |

No XSS, cross-guest or fixed-room finding in either pass. After the fixes: `npm test` 352 / 352 · release-check 24 gates ·
stage E2E release-011 52 / 52, P0 Empty Bag 49 / 49, account IA 33 / 33, sticky shell 320 checks · 0 failures.

## Third pass (`CODEX-REVIEW-3.md`, verdict: needs-attention — "No defensible P0/P1 [high] remains"; two P2 on the replay)

| # | Finding | Class | Action |
|---|---|---|---|
| 10 | [medium] A fresh device answering the question during the first read replaced the server's whole guest record with the one it had just created around the answer — saved answers lost, the emptied record sent | **VALID · P2** (fixed) | `replayObject` recurses with an empty base when the device's record did not exist before, so every server field the device did not name survives; lists are replayed as sets (the server's history plus the device's new entries). Regression `CODEX 011-10` through the real pull, including the outgoing PUT |
| 11 | [medium] Field-by-field replay could combine a destination chosen here with a decline made elsewhere ("not joining" with a destination) | **VALID · P2** (fixed) | the participation answer is replayed whole (`ATOMIC.scope`): the live decision on this device stands, in both directions. Regression `CODEX 011-11` (both directions, the outgoing PUT checked) |

After the fixes: `npm test` 354 / 354 · release-check 24 gates · stage E2E release-011 52 / 52. Codex's own line: "Fixes 6–8
address the reported paths"; no [high] remained at the third pass, and the two remaining [medium] are fixed and pinned above.
The pass sequence therefore ends with every finding VALID and closed: 5 + 4 + 2 = 11 findings, 3 × P1, 8 × P2, 0 open.
