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
stage E2E release-011 52 / 52, P0 Empty Bag 49 / 49, account IA 33 / 33, sticky shell 320 checks · 0 failures. A third,
confirming pass follows in `CODEX-REVIEW-3.md`.
