# 002 FINAL AUTOMATED PRE-RELEASE TEST RUN — HANDOFF (session transition, 13 Sep 2026)

This file, `README.md` beside it, and the project memory
`~/.claude/projects/-Users-thongantang/memory/siyl-002-stage-sequence.md` are the
authoritative state. A fresh session continues from these three files and the repository HEAD —
never from an earlier conversation.

> **13 Sep 2026 · continuation complete.** The two open items are closed; the gate is BLOCKED on
> deployment alone. Read `FINAL-REPORT.md` first — it supersedes the "Remaining work" list below,
> which is now the Owner-machine sequence.

## Secured state
- Repository HEAD: **2218221** (main, pushed). Working tree clean.
- Production: Cloudflare Worker version **07d8374c-6033-4b7d-bcdb-34d288000a5e** · GitHub Pages
  built from **2218221** · 50/50 guest-facing files byte-identical (local = Worker = Pages).
- Verification at 2218221: `npm test` 206/206 · `npm run release-check` all gates PASS ·
  `a11y.mjs` 18/18 · `release-walk.mjs` 77/77 (0 page errors, 0 console errors) ·
  regression walks C 39/39 · D 39/39 · E/F/G 37/37 · Haruthai 24/24 · `smoke.mjs` 8/8 on both
  origins · `crawl.mjs` 0 HTTP failures on both origins.
- Production ledger: REG_KV contains no acceptance records; INV-002 reads
  `received:false, confirmed:false`. Seating unconfigured, NOT OPEN. Inventory holds are only
  the intended Family / Bride & Groom reservations.

## Frozen (never reopen or alter)
A design system · B shell · C party/person separation · D six surfaces · E Sangkhathan eligibility
(PAIR/NONE/unresolved, never inferred) · F protected confirmation · G seating geometry
(ceremony 50 = L 10×2 + R 10×3; dinner 48 = T 24 + B 24 + BRIDE + GROOM = 50; FAMILY ids
unresolved; production NOT OPEN) · Haruthai correction pass · every accepted carryover listed in
the memory file. No payment, no QR, no LINE id, no new event/transport/stay/step, no invented
owner data.

## Reviewer state (round 2 at d4a4518, all fixes now at 2218221)
| Reviewer | Verdict at d4a4518 | Remaining |
|---|---|---|
| 001 technical/product | PASS | none (LOW items recorded as baseline) |
| 002 rendered UX | PASS | 4 LOW → fixed at 2218221 (drawer aria-label, review/you column, ≥10px labels on dress/transport, neutral draft sections once confirmed) — not yet re-checked by 002 |
| 004 first-time guest | PASS | 4 LOW → fixed at 2218221 (journey.js on every step, snapshot covers profile/consent/documents, hold wording, contact gate proven) — not yet re-checked by 004 |
| 007 confirmation/identity | FAIL (1 MEDIUM) at d4a4518 | fixed at 2218221; **re-checked 13 Sep 2026 · PASS** (5 checks, `FINAL-REPORT.md` §7) |
| Adversarial review | **delivered 13 Sep 2026** | 2 findings, both fixed on this branch (§10–§12) |

## State after the continuation session (13 Sep 2026)
Branch `claude/002-final-run-continuation-5ellm7` carries one commit on top of 7796f7c:
`review.html` (the fix), `test/efg.test.mjs` (the guarantee pinned), `supersession-state-table.mjs`
+ its results JSON, and this directory's docs. `main` is untouched.

The adversarial review found two genuine defects in the confirmation surface the round-2 fix had
just touched, both of the 007 family — the page stating what the record does not say:
1. a second device was named where `/api/status` carries no submission stamp at all (the email
   backup channel reaches Guest Relations without a `reg:` record, and Guest Relations then
   confirms on `conf:` alone);
2. supersession was decided by difference between the two stamps rather than by order, so an
   eventually consistent KV read or a clock behind this one could announce an earlier send as
   the replacement of a later one.
Both are fixed in one edit to `paintState`. The confirmed-cards path is unchanged: cards still
require an exact stamp match. Only the wording on the paths that previously guessed differs.

Verified here: `supersession-state-table.mjs` 8/8 · `npm test` 205/206 (the one failure is the
gitignored `src/guestlist.private.json`, absent in a fresh clone; 206/206 where it exists) ·
`npm run release-check` all gates PASS · inline script parses clean · the three release-walk
regexes that assert this wording remain satisfied.

Not executable in that session, and deferred to the Owner machine: `release-walk.mjs`,
`a11y.mjs`, `crawl.mjs`, `smoke.mjs` and any deploy — the private token register and guest list
are (correctly) gitignored and absent, Playwright is not installed, and there are no Cloudflare
credentials.

## Remaining work — Owner machine, in this order
1. Merge the branch into `main`.
2. `npm test` (206/206) · `npm run release-check` (all PASS) ·
   `node docs/acceptance/2026-09-11-final-run/supersession-state-table.mjs` (8/8).
3. `release-walk.mjs` (77/77) · `a11y.mjs` (18/18) — watch the three wording assertions in
   `FINAL-REPORT.md` §14.
4. Deploy the Worker, let Pages build, then `crawl.mjs` + `smoke.mjs` on both origins and the
   50/50 byte-identical parity check.
5. `FINAL PRE-RELEASE GATE · BLOCKED` stands until step 4 is proven. Final Owner release stays
   ON HOLD either way.

## Usage controls in force (Owner authorisation 13 Sep 2026)
A one reviewer at a time, targeted re-checks (≤5 checks, ≤8 frame opens), never relaunch after a
429 · B changed states only, widths 320/375/430/900 unless a finding needs more; never open images
for the record · C claude-mem disabled for this run (historical data untouched) · D unused
connectors/MCP removed from the session · E fresh session from this handoff · F reviewers consume
`*-results.json`, not full walks.

## Owner decisions pending (not release blockers)
- Rotate the INV-002 guest code (in public git history 91afeb7…91c52ad; removed at 01a9671).
- Sangkhathan `givingEligibility` per invitation · FAMILY seat ids · seating opening authority ·
  DOCS store binding · Wedding Dinner photograph.

## How to run the evidence scripts (local server `python3 -m http.server 8787` in the repo root)
```
node docs/acceptance/2026-09-11-final-run/release-walk.mjs http://127.0.0.1:8787 <outdir>
node docs/acceptance/2026-09-11-final-run/a11y.mjs        http://127.0.0.1:8787 <outdir>
node docs/acceptance/2026-09-11-final-run/crawl.mjs       <origin> <out.json>
node docs/acceptance/2026-09-11-final-run/smoke.mjs       <origin>
```
The guest code is read from the gitignored `src/invitation-tokens.private.csv` (or `SIYL_TOKEN`);
Guest Relations operations use `src/gr.cjs` with the gitignored token — never in a reviewer.
