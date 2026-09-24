# Codex final review (pass 2) — attempted 24 Sep 2026 when the quota returned; NOT delivered

Run on `main` at `a6a44ed` (the live code), base `c516674`, scope = the second call of pass 1 (the three-mode reset, the
actor epoch, the lock, the value digest, the register, the complete-trip binding, the video, Question 5, `/api/gr/record`).

## Call 1 — 22:23:47 CEST (20:23:47 UTC): ran, then stopped by OpenAI's content filter

Codex read the scoped diff, `src/worker.js` (the reset, the record route), `test/release-013.test.mjs` and the sandbox,
then its turn was ended by the provider: *"This content was flagged for possible cybersecurity risk"* — the focus text was
worded as an attack ("race", "slip past", "leak"). No structured verdict. Its interim words, verbatim:

> The reset checks the digest before setting the lock, and the lock is checked only at the Worker boundary. I'm testing two
> gaps: a draft saved after that check, and a room request already past the lock check when the sweep starts.

## Call 2 — 22:25:40 CEST (20:25:40 UTC): rephrased as a correctness review; refused by the quota

> You've hit your usage limit … try again at **Sep 25th, 2026 1:34 AM**.

Per the Owner's instruction for this run ("if Codex is still refused, record the time and stop — do not reschedule"),
no further call was made. The release-012 pass 3 (the five questions, base `705da49`) was **not attempted** — the quota
was already gone.

## The two interim gaps, examined by this session (NOT a Codex verdict)

Both concern the same few-hundred-millisecond window in `handleGrReset` (`src/worker.js`): the digest is verified, then
`reset:lock` is written, then each draft actor is reset, then the epoch is published, then the engine and the ledger.

| # | Codex's interim gap | reading of the live code | class |
|---|---|---|---|
| 1 | a draft saved between the digest check and the actor's reset | such a save succeeds (the draft route checks the epoch, which is not yet published, and not the lock) and is then cleared by step 1 — it is **not in the snapshot backup**. Real, tiny window, only during an Owner-run sweep that begins with a snapshot seconds earlier. | VALID **P2** — not fixed: the Owner has ruled the reset is never run again; recorded as a known limit of the reset |
| 2 | a room write that passed `resetLocked()` before the lock was written, landing in the DO after its reset | the DO serialises through `blockConcurrencyWhile`; a join landing after the DO's reset creates one fresh occupancy that the post-sweep `remaining` read reports honestly (never a silent gap). The guest's device then meets the new epoch and resyncs. | VALID **P3** — same window, self-reporting; not fixed for the same reason |

Neither affects ordinary guest traffic: `resetLocked()` is consulted only while a sweep runs, a stale lock (> 5 min) is
ignored, and no reset has been or will be run on production again.

**Verdict for the release:** the Codex final verdict remains **NOT delivered**. READY TO SEND stays as the Owner last set it.
