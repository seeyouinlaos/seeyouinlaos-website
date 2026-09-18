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
account IA 33 / 33, sticky shell 320 checks · 0 failures. The confirming pass follows in `CODEX-REVIEW-2.md`.
