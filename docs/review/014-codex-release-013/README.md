# 014 · Codex adversarial review of Release 013 (19 Sep 2026)

Codex: plugin `codex@openai-codex` 1.0.6 · `codex-cli 0.154.0` · logged in (ChatGPT) · the quota refused every call from
04:59 UTC ("try again at 10:56 AM") — the pre-deploy review ran at 11:04 CEST, the moment it returned; nothing had been
deployed and nothing written on the live Worker before it. The plan it reviewed: `PLAN.md`.

## Pass 0 — pre-deploy, on the plan and its implementation (`pass-0.md`)

Four [high], four [medium]; every one classified and every valid one fixed before the deploy.

| # | Finding | Class | What changed |
|---|---|---|---|
| 1 | The reset does not fence concurrent writes (a PUT during the sweep could store the old draft; the epoch was published last) | VALID P1 | The order is now: every draft actor takes the epoch first, in its own serialised step, and refuses a write without it (`src/drafts.js` `reset` / `put`); then the epoch is published in KV; then the engine, the ledger and the KV records go. Test: a write racing the sweep is refused, not stored. |
| 2 | An epoch read failure disabled the protection (`resetEpoch` returned null on a KV error → the write was accepted) | VALID P1 | Fail closed: a KV read that throws answers 503 `retry`; and the actor's own epoch check does not depend on KV at all. Test: KV down → 503, never a write; a write reaching the actor without the epoch → 409. |
| 3 | Destructive execution before a durable backup (the CLI wrote the backup from the execution's answer) | VALID P1 | Three modes: dry run · **snapshot** (every value: KV values as base64 with their metadata, the engine's occupancy records, the seat holds, the drafts; a digest of the key set) · **execute** bound to that digest with the exact words — refused when the state changed since the snapshot. The CLI writes and reads back the backup file before the words may be given; the execution returns no values. Test: the lossless photo bytes, the digest, a stale digest refused. |
| 4 | Editing one field preserved the entire pre-reset record (the "live edit" exception kept a whole key) | VALID P1 | A device that synchronised before the epoch drops its whole cached journey — every key, the base, the meta — nothing of the old record is carried over (a room joined meanwhile returns from the engine, the truth). A device that never synchronised keeps what it typed. Test: a key touched during the read goes too; the fresh device keeps its answer. |
| 5 | The backup was not lossless (avatar bytes read as text, DO rows without their records) | VALID P2 | Fixed by #3 — base64 + metadata, full engine and ledger records, the actors' drafts. |
| 6 | Reset handling silently discarded fresh edits (a brand-new device typing before its first read) | VALID P2 | Fixed by #4 — only a device with a merge base or a pre-epoch server revision clears; a fresh device's answers are post-reset and stay. |
| 7 | The confirm could apply a different trip from the preview (a room filling between looking and adding) | VALID P2 | The confirm decides with the drawer open: the engine is read again, the plan compared with the one shown (stage · why · product · amount); a change is said in place ("Availability changed while you were looking") and nothing is applied; the preview also redraws on engine answers while open. E2E: a room freed meanwhile → the preview redrawn, nothing held, the second look applied. |
| 8 | Private guest identities in the alias comments of a tracked file | VALID P2 (privacy) | Opaque ids only in `src/guestlist-from-contacts.cjs`; the explanations live in the ignored private report. The one commit on the unmerged branch that carried the names was amended and the branch force-pushed (`main` untouched, no history rewritten there). |

## Pass 1 — post-implementation, on the complete diff (`pass-1.md`) — INCOMPLETE (quota)

The first call (11:33 CEST) returned no structured verdict — Codex's interim words named two gaps: *"its digest tracks keys
rather than saved values, and only draft writes are fenced during execution"*. Both were treated as VALID P1 and fixed:
- the digest now covers the **values** — every KV value's bytes (hashed), every occupancy and hold record, every draft's
  revision — so a draft saved after the snapshot refuses the execution even with the same keys (test);
- a `reset:lock` (five minutes, ignored when stale) makes the Worker refuse guest `join` / `leave` / `select` / `release`
  with 503 `retry` while the sweep runs (test: a join and a seat select racing the sweep are refused; writes open again
  after it; a stale lock never blocks guests for good).

The second call (11:47 CEST) was refused by the Codex quota: **"try again at Sep 24th, 2026 10:19 PM"**. The final verdict
is therefore NOT delivered by Codex; per the Owner's rule it is not represented as passed, and READY TO SEND stays NO
until Codex has run on the live code (or the Owner waives it). What was reviewed and by whom:
- pass 0 (complete): Codex — eight findings, all fixed, with tests;
- pass 1 (interim): Codex — two gaps, both fixed, with tests;
- the rest of the pass-1 scope (the register, the complete trip binding, the video, Question 5, `/api/gr/record`):
  the release's own review, recorded here, plus 362 unit tests and five E2E suites on fresh stages.

Codex's open question, answered here: *the Cloudflare subrequest budget for 85 invitations*. `handleGrReset` makes, in
execute mode: 1 assets read + 4 KV lists + 2 actor reads + 85 draft-actor snapshot reads + ~13 KV value reads + 1 lock put +
85 draft-actor resets + 1 epoch put + 2 actor resets + ~13 KV deletes + 1 lock delete + 2 actor reads + 4 KV lists ≈ 300
subrequests — within the 1,000 of the Workers Paid plan the Durable Objects already require (the free plan's 50 would not
fit; this account runs DOs). The live run is a single request; its answer carries `remaining` counts read after the sweep.

To run when the quota returns (24 Sep 2026, 22:19 CEST): `codex-companion.mjs adversarial-review "--wait --base <the
release-012 proof commit c516674> …"` on `main` with the scope of the second call; classify, fix, confirming pass.
