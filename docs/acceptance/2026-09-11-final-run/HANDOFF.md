# 002 FINAL AUTOMATED PRE-RELEASE TEST RUN — HANDOFF (session transition, 13 Sep 2026)

This file, `README.md` beside it, and the project memory
`~/.claude/projects/-Users-thongantang/memory/siyl-002-stage-sequence.md` are the
authoritative state. A fresh session continues from these three files and the repository HEAD —
never from an earlier conversation.

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
| 007 confirmation/identity | FAIL (1 MEDIUM) | fixed at 2218221: the SENT snapshot counts only when `snap.at === receivedAt`; superseded device shows "sent again from another device after this one" with no cards; received state names a newer send. Walk checks "11b …" cover it (77/77). **Targeted 007 re-check pending.** |
| Adversarial review | not delivered (rate-limited twice) | **pending** |

## Remaining work (in this order, one model stream at a time)
1. Targeted 007 re-check of the supersession fix (3–5 checks: two-sender scenario on the local
   server with the mock, received-superseded notice, normal send→confirmed cards, hygiene grep).
   Reviewer reads `release-walk-results.json` first; direct reproduction only for the two-sender case.
2. Adversarial review (single agent, reads the JSON results, opens ≤8 frames, reproduces only what a
   credible finding needs).
3. Fix only genuine findings; targeted regression (affected script only); commit; deploy both
   origins; parity; docs.
4. Final consolidated report in the 29-section format ending in
   `FINAL PRE-RELEASE GATE · PASS` or `· BLOCKED`. Then STOP — final Owner release stays ON HOLD.

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
