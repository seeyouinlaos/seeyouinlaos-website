# P0 · Simplify the guest journey and make Empty Bag real — acceptance evidence

Owner task, 17–18 Sep 2026 · branch `p0-empty-bag` · baseline `dbf8bc5` (live Worker untouched) · NOT deployed.
Plan and state contract: `docs/plans/2026-09-17-p0-empty-bag/PLAN.md`. Synthetic guests only (no real invitation, no real guest data).

## What was wrong (reproduced on an isolated stage worker, not from screenshots)
- A host with the Owner's FIXED Sathorn Penthouse Room A saw it as a priced Bag line (USD 255) with a Remove control; the engine refused the release (403 "fixed host allocation"), the line stayed, the total could never reach USD 0, and clearing the bag by hand brought the line back on reload (`assets/stay.js sync()` materialised every engine hold as a Bag line).
- Review & Send refused an empty bag outright.
- The draft merge had no revision precondition: a device that last synced before a removal pushed its old bag and resurrected the removed item.
- Terminology: The Journey / Your Journey / Journey bag / Review & Send all said "Journey".

## What changed
- **Information architecture**: PUBLIC The Journey (`journeys.html`) · PRIVATE My Trip (`your-journey.html`), Arranged for You (inside My Trip / My Bag / Review), My Bag (`cart.html`), Review & Send (`review.html`), My Profile (`about-you.html`, with a contact summary and "Edit contact details"). Routes unchanged.
- **Fixed arrangements** carry the engine's `fixed: true` marker (`src/rooms.js`), are rendered by one renderer (`assets/arranged.js`) with no amount and no Remove / Change, never enter the Bag, the sticky bar, the Review total, the registration (`src/worker.js` normalises and recomputes the total) or the emails (`src/mail-templates.js`).
- **Empty Bag is real**: zero selections = "No selections yet · USD 0" in My Bag, the bar and Review; Review & Send follows readiness, not the bag length; a refused or failed Remove restores the button and says "Nothing was changed — …"; Remove is idempotent.
- **Draft revisions**: a Drafts Durable Object per invitation (`src/drafts.js`, binding `DRAFTS`, migration v4, seeded read-through from the KV mirror `draft:<inv>`); a stale base is refused with 409 and the current draft; the device (`assets/draft.js`) merges three-way — a removal elsewhere stands, an independent answer typed here is kept and re-pushed, a double-sided change takes the server's and names the loss.
- **One persistent layer**: the sticky My Bag bar (`assets/bag.js`) carries the total, "Open My Bag", My Trip · My Bag · My Profile · Sign out, and a Top control after one viewport of scroll.

## Automated tests
`npm test` → 302 pass · 0 fail (new `test/empty-bag.test.mjs`, 11 tests incl. the three Codex pins). `node src/release-check.cjs` → RELEASE CHECK PASSED.

## Dummy E2E (isolated stage worker, Miniflare, synthetic register) — `e2e/e2e.json`, 49/49 PASS
- A1–A3: three times select → change → remove → empty (USD 0 everywhere) → save → hard reload → sign out → sign in → Review total USD 0.
- B: second clean session, cross-device visibility, stale device refused (409) with an independent edit kept, server bag empty, engine hold released.
- C: fixed host — bag USD 0, one Arranged-for-you card, no Remove / Change / Select on the fixed stage, engine still refuses the release, Review total USD 0, other guests' inventory untouched.
- D: last-place race (one winner, one refused), sold-out words, a failed change keeps the old room, an offline Remove settles with the button restored and the note shown.
- E: an empty bag can be sent; edit → "changes not sent" → Send updated journey → same reference, version 2 → survives reload.
- Z: cleanup — stage inventory back to baseline (the fixed Room A stays by design).

## Visual QA — `shots/` (48 PNG + four contact sheets), 0 horizontal overflow at 320 / 390 / 834 / 1440
signed-out My Bag and The Journey · My Trip · My Bag empty · My Bag filled · Arranged for you (My Trip + My Bag) · room selection · Review & Send · My Profile · account navigation while scrolled (Top control) · Remove failure while offline.

## Codex reviews
Plan/implementation review: three P1 findings, all VALID, all fixed and pinned (PLAN.md §7). Final review: see below.

## Deployment
Not deployed. Release requires the Owner's authorisation after the ChatGPT product review. Rollback: the live Worker stays at `dbf8bc5`; if released and reverted, the Drafts DO holds only mirrors of `draft:<inv>` KV values, so `dbf8bc5` reads the same drafts from KV (a draft written after release remains in KV through the mirror).
