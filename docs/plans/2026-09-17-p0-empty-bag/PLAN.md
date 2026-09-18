# P0 — simplify the guest journey and make Empty Bag real
Implementation plan + state contract · 17 Sep 2026 · for Codex adversarial review before implementation
Brief: PROJECT_MASTER_BRIEF.md §9–§15, §17–§20. Baseline: `dbf8bc5` (live Worker serves the same assets, verified read-only).

## 1. Reproduced baseline (isolated stage worker, synthetic guests, ids G048/G049 for the fixed pair)
- Host (G049): `siyl.bag` = `bkk-stay:penthouse:A:USD 255`, sticky total USD 255, Review total USD 255, cart shows **Remove** on the line. Click → engine `POST /api/rooms/leave` → `403 fixed host allocation` → the line stays, the total stays; on slow networks the button sits in "Removing…" until the next render. Clearing the bag by hand and reloading brings the line **back**.
- Normal guest (T001): select U Sathorn Room B → remove → bag `[]`, USD 0, survives reload. Works.

## 2. Root cause (code, not screenshots)
1. `assets/stay.js sync()` writes a Bag line for **every** engine hold in `view.mine` that the Bag does not carry ("a place the engine holds … comes back from the one pricing source"). The hosts' FIXED Sathorn Room A is always in `mine['bkk-stay']`, so the fixed arrangement is materialised as a payable Bag product (pricing `items('bkk-stay','penthouse')` = USD 85 × 3 = 255).
2. `assets/stay.js remove()` is the only Remove path; for a fixed stage the engine refuses (403) and the client keeps the line — a Remove control is shown for something the guest is not authorised to remove.
3. There is no canonical "fixed arrangement" concept anywhere in the client: My Trip, My Bag, the sticky bar, Review and the email all derive from the Bag array, so the fixed room can never leave and the total can never reach USD 0.
4. Terminology: The Journey (public) / Your Journey (private page, step label, sticky bar label, menu) / Journey bag (cart) / Review & Send all say "Journey".
5. Stale device: `/api/draft` PUT merges incoming keys over stored keys with no revision precondition; a device that last synced before a removal, holding `dirty` + old `serverUpdatedAt`, pushes its old `siyl.bag` on the next sign-in and resurrects the removed item (`assets/draft.js pull()` line "dirty && serverUpdatedAt → push first").

## 3. State contract (canonical)
| # | State | Owner of truth | In MY BAG | In ARRANGED FOR YOU | In MY BAG total | Removable by guest | At zero selections | Survives reload / 2nd device | Review & Send shows |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Guest-selected Bag item (travel, stay line, experience, offering) | server draft key `siyl.bag` (browser = cache) + the room engine for a stay's place | yes | no | yes (price × qty) | yes | absent | yes, via draft revision | under "My Bag" with the same total |
| 2 | Fixed arrangement (Sathorn Room A for G048/G049) | room engine `FIXED` seed → `view.mine[stage].fixed === true` | **never** | yes | **no** | no — no Remove/Change control rendered | unchanged | yes (engine) | under "Arranged for you", no amount in the Bag total |
| 3 | Hosted arrangement (wedding-window second night hosted) | pricing rule inside the stay line (`pay < nights`) | as part of its stay line | explanation inside the line | payable night only | with its stay line | absent | yes | inside the stay line, hosted night explained |
| 4 | Payable arrangement cost of a fixed item | not established (SOURCE GAP: payer wording for the hosts' own room) | no | shown as "arranged separately" — never as USD 0 and never as a Bag line | no | n/a | n/a | n/a | "Arranged for you" without a Bag amount |
| 5 | Room hold (place in a unit) | room engine (Durable Object, atomic) | represented by the stay line's `unit` | fixed hold only | via the line | release only on Remove of that stay; change = hold new then release old | released (except fixed) | yes | room label from the engine (server reads `engineRooms`) |
| 6 | Wedding attendance / Sangkhathan | guest draft `siyl.temple` | Sangkhathan offering line only when chosen | no | offering only | offering yes; attendance is not a Bag item | unchanged | yes | its own section |
| 7 | Seat hold | seating engine | never | no | no | never through the Bag | unchanged | yes | its own section |
| 8 | Draft state | server `draft:<inv>` with `updatedAt` = revision | — | — | — | — | `siyl.bag: "[]"` is a real stored value | read-before-write; a stale revision cannot overwrite | "Saved as draft" |
| 9 | Sent state | server `reg:<inv>` submissionId/version + fingerprint | — | — | — | — | valid with required non-Bag answers complete | server-derived | "Sent" / "Changes not yet sent" |
| 10 | Stale device | client meta `serverUpdatedAt` vs server `updatedAt` | — | — | — | — | — | server wins; device shows a recovery note; its unsynced edits are not merged silently | the server state |

Rules: zero selections is a canonical state (count 0, USD 0); the sticky bar, cart, My Trip, Review and the server draft agree; suggested/Full Experience never repopulates without an explicit guest action and never touches a fixed stage; a fixed arrangement never trapped in the Bag; Remove never renders where the guest cannot remove; a refused/failed remove leaves the previous state and says so.

## 4. Changes (smallest coherent set)
**Server**
- `src/rooms.js view()`: `mine[stage] = { key, label, fixed: true|absent }` (from `fixedFor`). `plan` unchanged. No inventory/seed change.
- `src/worker.js handleDraft` PUT: accept `baseUpdatedAt`; if a draft exists and `baseUpdatedAt !== stored.updatedAt` → `409 { error: 'stale', draft }` (server wins, no merge). Beacon path carries the same field. Normalise incoming `siyl.bag` for a guest with a fixed stage: strip lines whose stage is fixed (defence in depth).
- `src/mail-templates.js`: "Arranged for you" lines from `record.rooms[stage].fixed` (guest + Guest Relations emails); the Bag total unchanged.
**Client**
- `assets/rooms.js`: `fixed(stage)`; `fits/label` unchanged.
- `assets/stay.js`: `sync()` never writes a line for a fixed hold and strips any Bag line of a fixed stage (migrates stale local/draft state); `remove()` refuses fixed with `{ ok:false, error:'fixed' }`; `select()` for a fixed stage refused client-side (engine already refuses).
- `assets/journey.js fullExperience()`: skip fixed stages (they are neither removable nor addable).
- New `assets/arranged.js` (`SIYL_ARRANGED`): derives the fixed items from the engine view for the signed-in guest; one renderer used by My Trip, My Bag, Review. Wording: "Arranged for you · Sathorn Penthouse · Room A · 21 – 24 February · fixed by Haruthai & Suthep · not part of your bag". No amount, no USD 0, no Remove/Change.
- `your-journey.html` (MY TRIP): fixed stage renders the arranged card instead of the selection rail; h1 "My Trip"; hosts' bkk-stay alternatives hidden.
- `cart.html` (MY BAG): lines exclude fixed; "Arranged for you" section (read-only) above the empty/filled Bag; empty state = "Your bag is empty · USD 0" + Review link when readiness allows; Remove failure → button restored + "Nothing was removed — please try again."; double click idempotent (disabled while pending).
- `review.html`: "Arranged for you" section; Bag total from removable lines only.
- `assets/bag.js` sticky bar: label "My Bag", total of removable lines, and the account links (My Trip · My Bag · My Profile · Sign out) on the signed-in bar + a "Top" control after one viewport of scroll — one persistent layer.
- `assets/draft.js`: send `baseUpdatedAt`; on 409 apply the server draft, clear dirty, set `state.phase='stale'` and show "This device was out of date — showing your latest saved journey" in the save control; never push a never-synced cache (already).
- Labels (routes unchanged): menu "The Journey" (public) / "My Trip" (your-journey.html) / "My Bag" (cart.html) / "My Profile" (about-you.html) / "Review & Send"; step 02 "My Trip"; step 05 "My Profile"; `about-you.html` gets a contact summary (email/phone with Edit → invitation.html#contact).
- `.hd-access` account line stays; the sticky bar carries the persistent access.
**Not changed**: seating, inventory seed, pricing amounts, auth, register, Brevo, deployment.

## 5. Tests
- `test/empty-bag.test.mjs` (sandbox + Rooms DO): sync never writes a fixed line and strips one; remove idempotent, total 0, bar "My Bag · USD 0"; arranged renderer for host vs guest; fullExperience skips fixed; view.mine.fixed flag; draft PUT 409 on stale base, 200 on matching base, fixed-stage lines stripped; Review total = Bag total; signed-out page renders no private state.
- Existing suite (291) must stay green; adjust only pins that encode the old wording.
- Stage E2E (`docs/acceptance/2026-09-17-p0-empty-bag/e2e.mjs`, synthetic guests): 3× select→change→remove→empty→USD 0→save→hard reload→sign out→sign in→verify→Review; second clean session; stale device; fixed host; sold-out + last-place race (two sessions); failed change keeps old room; timeout/offline; Send → edit → Send updated (same reference, version 2). Cleanup: stage store is disposable; the live Worker gets read-only verification only until release is authorised.
- Screenshots at 320/390/834/1440 for the required screens.

## 6. Risks / open items
- SOURCE GAP: payer wording for the hosts' own fixed room (fixed is a change authority, not a payer statement; no invented USD 0). Plan uses "arranged separately / not part of your bag".
- Existing host drafts (G049) hold the penthouse Bag line; the client strips it on next load and pushes; the server strips it on PUT. Sent records keep their history (no rewrite).
- The stale-device rule discards the stale device's unsynced Bag edits (server wins). Deterministic and surfaced; field-level merge is not possible without per-item revisions.

## 7. Codex adversarial review record (18 Sep 2026)
**Plan review** — deferred at first (Codex usage window closed; marked `CODEX REVIEW: DEFERRED — TEMPORARILY UNAVAILABLE`, work continued per the Owner's rule), then run against the plan + the first implementation (scope: working tree, thread 01a0b21e). Verdict: needs-attention, three findings, all classified **VALID** and fixed before the E2E and visual passes:

| # | Codex finding | Class | Fix | Pin |
|---|---|---|---|---|
| P1-1 | The draft revision check in `handleDraft` was read-then-write over KV: two requests naming the same base both passed and the loser resurrected a removed item (probe: `[200, 200]`). | VALID | New `src/drafts.js` — a Drafts Durable Object per invitation; compare-and-write inside `blockConcurrencyWhile`, strictly increasing revisions, KV kept as a mirror/seed only. `wrangler.jsonc` binding `DRAFTS` + migration v4. | `test/empty-bag.test.mjs` "CODEX P1-1": same base twice → one 200, one 409 carrying the current draft |
| P1-2 | The client's 409 handler replaced every local key and cleared dirty: an independent answer typed on the stale device was discarded, and overlapping autosaves could send an old base. | VALID | `assets/draft.js`: pushes serialised (`queued`), a saved base snapshot (`siyl.draft.base`), a three-way merge per key (unchanged → server; independent local → kept and re-pushed; both changed → server wins and the loss is named), the notice kept until the guest touches the form; `apply()` keeps `applying` during change events. | "CODEX P1-2" (merge table) + stage E2E `B-independent-edit-kept` |
| P1-3 | The email model excluded fixed lines from stays only, so a legacy fixed line became a priced *experience* (probe: Penthouse as experience, total 255); `/api/register` accepted browser selections and total unchanged. | VALID | `src/worker.js handleRegister`: fixed-stage lines stripped from `selections`/`shared` and the total recomputed at the registration boundary (`registration.normalised`); `src/mail-templates.js` classifies from the normalised list and never prices a fixed stage. | "CODEX P1-3": legacy host draft with the penthouse line → submission without it, total recomputed, email without a priced line |

After the fixes: suite 302/302, release check PASSED, stage E2E 49/49, screenshots 48 at 320/390/834/1440 with 0 horizontal overflow.

**Final review** — see `docs/acceptance/2026-09-17-p0-empty-bag/README.md` (recorded after this commit).
