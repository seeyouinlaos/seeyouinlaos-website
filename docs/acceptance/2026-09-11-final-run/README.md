# Final automated pre-release test run — 11/12 September 2026

Baseline: A–G accepted, Haruthai correction pass accepted (91c52ad). This run is the final quality gate before Owner release approval. Production: HEAD `2218221` · Cloudflare Worker version `07d8374c-6033-4b7d-bcdb-34d288000a5e` · GitHub Pages built from `2218221` · 50/50 guest-facing files byte-identical (local = Worker = Pages). Session-transition state and remaining work: see `HANDOFF.md`.

## Harness (all in this directory)
- `release-walk.mjs` — one fresh end-to-end walk (public discovery → invitation → WHO ARE YOU → steps 01–06 → SEND → RECEIVED → change notice → mocked CONFIRMED → change notice → second device → two senders / superseded snapshot → stale session → deep links), 77/77, frames at 320/375/390/430/834/900/1440/1920 in `frames/`.
- `a11y.mjs` — keyboard, focus, ESC, labels, aria-expanded, contrast, 44px, text resize, reduced motion: 18/18.
- `crawl.mjs` — rendered link/asset crawl of 20 guest-facing pages on local, Worker and Pages: 0 HTTP failures, 0 console errors on production, resort-01 never requested.
- `smoke.mjs` — read-only production smoke on both origins (sign-in, real status, seating closed, Sangkhathan withheld, CORS, no writes): 8/8 each.
- Regression: C walk 39/39 · D walk 39/39 · E/F/G walk 37/37 · Haruthai walk 24/24 · `npm test` 206/206 · release gates all PASS.

## Corrections made in this run
Deterministic pass (01a9671): superseded `register/` engine no longer served on either origin (Worker 302 → invitation.html; Pages stub; gate R1 flipped); stale `#j-mu9632` deep link; muted text `#7C7A75 → #6B6964` (AA); shell eyebrow 10px; no label under 10px; menu button and drawer named; status loaded on every step; guest code removed from committed walks.

Reviewer round 1 (001 technical · 002 rendered UX · 004 first-time guest · 007 confirmation/identity) → corrections (d4a4518): confirmed view painted from the journey as SENT (`siyl.sent`), "Changed since confirmation · not sent" notice, shell notice on every step, honest message on a device that never sent, seats only from the ledger; one shell (you.html under step 01, documents.html → about-you.html#documents, dress.html without checkbox, `assets/prep.js` deleted); readiness steps renumbered to the shell's (04 Wedding Preparation = dress code); review blocks unnumbered, edits land on wedding.html / about-you.html, consent line without version token, hold recorded as HELD; dinner venue "Souphattra Heritage Vientiane · courtyard garden" (never "Souphattra Vientiane Hotel"); C86 without C642-era meal copy; MU9646 "at 15:50"; wedding stay: first night your contribution, second hosted; Sangkhathan priced in intros only for PAIR invitations; 1872 placeholders in the guest voice; journeys fare cards readable; blue Lao rail leads with the temple references; step 02 Complete only with no open stage; About You sees every step's state; gate P4 guards the venue and the meal copy.

Production ledger: REG_KV cleaned of every acceptance registration (six `reg:INV-002*` from the old journey-shop channel, four fixture ids) and of this run's `conf:INV-002` test history. INV-002 reads `received:false, confirmed:false`. Inventory holds are only the intended Family / Bride & Groom reservations.

Reviewer round 2 (at d4a4518): 001 PASS · 002 PASS (4 LOW) · 004 PASS (4 LOW) · 007 FAIL (1 MEDIUM: a superseded local snapshot shown as confirmed). All nine items fixed at 2218221 (snapshot valid only when its stamp equals the server's receivedAt; journey.js on every step; drawer aria-label; review/you column; ≥10px labels; neutral draft sections once confirmed; snapshot covers profile/consent/documents; hold wording). 007 targeted re-check and the adversarial review are pending.

## Known authoritative data pending (not release failures)
- Sangkhathan `givingEligibility` (PAIR/NONE) per invitation — all unresolved, action withheld.
- Ceremony / dinner FAMILY seat ids; seating geometry upload and SEATING OPEN authority — production unconfigured, NOT OPEN.
- DOCS store binding for `/api/document` (503 "not enabled yet").
- Wedding Dinner photograph (accepted placeholder).

## Owner action
- The INV-002 guest code was committed in acceptance walk scripts in 91afeb7…91c52ad (public repository) and removed at 01a9671; git history retains it. Rotate the INV-002 code (new token in the private register → `node src/build-invitations.cjs` → redeploy → re-issue) before the letters go out, or accept the exposure explicitly.
