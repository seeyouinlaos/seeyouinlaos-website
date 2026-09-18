# 008 — Complete website copy / wording audit (Owner task, 18 Sep 2026)

Branch `copy-audit-008` (on top of `p0-empty-bag`) · NOT deployed · synthetic guests only.

| File | What it is |
|---|---|
| `extract.mjs` → `text.txt` | the fresh deterministic extraction of every guest-facing string (306 surfaces, 239 states, 26 routes, 20,423 lines) from a local Worker running the current repository with the real engines; access codes scrubbed (SECRET SCAN: PASS) |
| `emails.mjs` → `emails.txt` | both emails (initial, update; guest and Guest Relations; a host with a fixed arrangement), HTML reduced to text + the plain-text fallback |
| `strings.py` → `strings.tsv`, `unique.txt`, `summary.json` | the string register: route/surface · state · source file · audience (PUBLIC / GUEST / GUEST RELATIONS / ACCESSIBILITY) · factual-claim flag · source-truth dependency |
| `WORDING-CONTRACT.md` | the canonical terminology / wording contract (Phase 6) |
| `FINDINGS.md` | the systemic findings (terminology, duplication, technical language, tone, actions, false confirmation, pricing/payer, recovery, mobile) and their classification |
| `SOURCE-TRUTH.md` | the source-truth delta over the 007 FINAL V3 audit (MATCH / OWNER DECISION OVERRIDE / STALE / RETIRED / SOURCE GAP / CONFLICT) |
| `apply.py`, `CHANGE-MANIFEST.md` | the implementation: one deterministic replacement table (every change listed), re-runnable |
| `pins.py` | the test pins moved from the retired words to the canonical ones (same assertions) |
| `shots-extra.mjs`, `shots/` | visual copy QA at 320 / 390 / 834 / 1440 plus both emails at 390 / 834 |
| `text-after.txt` | the same extraction after the changes (for the Codex final review and the ChatGPT review) |

## Codex reviews
- Pre-implementation review (Phase 5): `CODEX REVIEW: DEFERRED — TEMPORARILY UNAVAILABLE` at 04:20 on 18 Sep 2026 (usage window reopens 08:26). Per the Owner's rule the implementation proceeded; the review runs at the next safe checkpoint (one-shot at 08:41) against the contract, the findings, the corpus and the diff, and its findings are classified VALID / FALSE POSITIVE / OUT OF SCOPE and fixed before release.
- Final review (Phase 10): deferred with it.

## Status
See the Owner report of 18 Sep 2026 (the FINAL REPORT block). Release is blocked until both Codex passes have run and the ChatGPT product review has passed.
