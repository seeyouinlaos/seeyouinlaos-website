# Release 009 — one live site (Owner direction, 18 Sep 2026)

The one coherent release (P0 Empty Bag + Drafts actor + Arranged for you · copy audit 008 · sticky account shell + the measured Aman geometry) shipped to the ONE canonical runtime, the Cloudflare Worker. GitHub Pages is no longer a guest-facing runtime (deleted via the API; the repository, branches, PRs and evidence stay).

| Item | Where |
|---|---|
| Measurement pass (AMAN vs BEFORE vs AFTER) | `MEASUREMENTS.md`, `measure-aman.json`, `measure-siyl.mjs`, `compare/compare-*-390.jpg` (with 24 px gutter guides, image bounds, text column, CTA bounds), `compare/measurement-table.md` |
| Visual QA | `shots/sheet-{before,after}-{320,390,834,1440}.jpg`, `shots/*-390.png`, `shots/shots-*.json` (overflow 0, SHELL measurements) |
| Sticky shell regression | `shell-scroll.mjs` — 252 checks · 0 failures at 320/390/834/1440 (signed out and in, deep scroll on every long page); rerun on the final code 126 · 0 |
| P0 flows on the final code | `e2e-p0-rerun.json` — 49/49 |
| Live verification | `live-verify.mjs` · `live/live-verify-A-synthetic.json` (deployment A, three temporary synthetic guests: 57 checks, the one failure was the check itself matching a script comment — refined) · `live/live-verify-B-final.json` (the final deployment, read-only: 47/47) · live screenshots |

## Deployments
- A `1c1b7916-2eab-490e-b247-1128242c537d` — the release with three temporary synthetic invitations for the controlled live flow (signed-in shell · room hold · My Bag USD 192 → remove → USD 0 · Save · reload · second-device stale copy refused 409 · Review USD 0 · room released).
- B `c41cd3d7-00c1-435c-bb67-e1e014c912b0` — the final release, the real register only (47 entries). The synthetic code opens nothing; its two KV entries (`contact:INV-T001`, `draft:INV-T001`) were deleted; no seat was held; the room was released. Its Drafts actor object (`INV-T001`) is inert — no invitation resolves to it.
- Rollback: `dbf8bc5` (the previous live build) — `git checkout dbf8bc5 && npx wrangler deploy`; drafts stay readable through the KV mirror.

## Codex
- Release review (main vs release-009): 2 × P1 on the draft store (delayed seed read; upgraded browser without a merge base) — VALID, fixed, pinned (RELEASE-1/2). Re-review: 1 × P1 (dirty upgraded browser without a base) — VALID, fixed, pinned (RELEASE-3). Confirming pass on the final fix: `CODEX REVIEW: DEFERRED — TEMPORARILY UNAVAILABLE` (usage window reopens 13:41; scheduled 13:47).
