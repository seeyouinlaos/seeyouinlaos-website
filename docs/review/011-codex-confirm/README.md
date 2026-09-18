# 011 — Codex confirming pass on releases 009 + 010 (18 Sep 2026, 13:5x)

`CODEX-REVIEW.md` is the verbatim result (verdict: needs-attention, two findings). Classification:

| # | Finding | Class | Action |
|---|---|---|---|
| 1 | [high] `assets/draft.js` — a late 409 after an account switch on the same browser merges the first guest's server draft into the second guest's device and retries under the second bearer | **VALID · P1** (cross-guest contamination; needs a sign-out + another sign-in on one browser while a save is still in flight — rare, real) | every draft request is bound to the session that started it (bearer + invitation + a generation that moves on sign-out, sign-in and another tab's change of `siyl.auth`); a late answer is dropped whole — nothing applied, no base or revision recorded, no retry, no queued push; regression `CODEX CONFIRM-1` |
| 2 | [medium] `assets/avatar.js` — a delayed photo read completing after an account switch populates the second guest's cache; an upload chosen before a switch is sent with the later bearer | **VALID · P1** (another guest's photo shown on a shared device) | the same session binding for load / upload / remove; the bytes of a late read are never turned into a picture; an upload reduced across a switch is not sent; sign-out and sign-in forget the cache; regression `CODEX CONFIRM-2` |

Release 009's RELEASE-3 draft fix (pull / merge base, seed race) was in scope of the pass and drew no finding.

Verification: `npm test` 328/328 (incl. the two regressions and the infrastructure-freeze guard tests) · release-check PASSED (gate I1 new) · stage E2E account flow 32/32 · P0 Empty Bag E2E 49/49 · live: read-only `live-verify.mjs` after the deploy (see the commit).

Live: main `5b846f1` deployed as Worker version `19d6f0b6-8a35-4e76-9b38-673060b973ff` (16 assets; the Worker script and every binding unchanged; the real register, 47 entries). `live-verify.mjs` read-only 47/47 (`live-verify-19d6f0b6.json`); `node src/infra-guard.cjs --live`: public DNS (Cloudflare and Google DoH) resolves the origin, HTTPS 200 from Cloudflare, `/api/draft` 401, GitHub Pages 404; `/infra/PRODUCTION.json` is not served (404). Rollback: version `6214100b` (main `82a068f`).
