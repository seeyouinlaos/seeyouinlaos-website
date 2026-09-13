# 002 FINAL AUTOMATED PRE-RELEASE TEST RUN — FINAL CONSOLIDATED REPORT

Continuation session, 13 September 2026. Entered from `HANDOFF.md` and the repository HEAD
alone; no earlier conversation was reconstructed, no accepted stage was reopened, and every
freeze in §3 was carried forward untouched. Sections follow the 002 house numbering
(`## N · TITLE`, as in `docs/FINAL_PRE_PUBLIC_RELEASE_REVIEW.md`); the run's own section list
lives in the Owner's project memory, which this session could not read, so the headings below
are the programme's territory rendered in that idiom rather than a copy of that list.

---

## 1 · EXECUTIVE SUMMARY

The two items left open at the transition are closed. The 007 supersession fix re-checks
clean. One serial adversarial review found two genuine defects — both in the confirmation
surface the round-2 fix had just touched, both of the same family as the MEDIUM 007 raised:
the page stating as fact something the record does not say. Both are fixed, in one small edit
to `review.html`, with the guarantee pinned in `test/efg.test.mjs` and an eight-state
regression that reads its predicates out of the shipped file.

The gate does not pass. Not because of what was found — the two findings are LOW–MEDIUM and
now fixed — but because a guest-facing change was required and this session cannot deploy it.
Production still serves `2218221`; the fix sits on `claude/002-final-run-continuation-5ellm7`,
unmerged and undeployed, so the run's own criterion of 50/50 byte-identical parity across
local, Worker and Pages is, for the first time in this run, not met. Clearing it is four
commands on a machine that holds the private register (§27).

## 2 · CONTINUATION POINT AND AUTHORITY

- Entered at `7796f7c` (`HANDOFF.md` beside `README.md`), branch
  `claude/002-final-run-continuation-5ellm7`, working tree clean.
- Deployed state at entry: HEAD `2218221` · Cloudflare Worker version
  `07d8374c-6033-4b7d-bcdb-34d288000a5e` · GitHub Pages built from `2218221` · 50/50
  guest-facing files byte-identical.
- Authorised work, in order: targeted 007 re-check (≤5 checks) → one serial adversarial
  review (≤8 frames, JSON first) → fix genuine findings only → targeted regression only →
  commit/deploy/parity only if changed → this report → the gate line.
- Not authorised and not done: rotating the INV-002 guest code (Owner decision), any parallel
  reviewer stream, any re-audit of an accepted stage, any full 8-width rerender.

## 3 · FREEZE COMPLIANCE

A design system · B shell · C party/person separation · D six surfaces · E Sangkhathan
eligibility (PAIR/NONE/unresolved, never inferred) · F protected confirmation · G seating
geometry · the Haruthai correction pass · every accepted carryover: all untouched. No payment,
no QR, no LINE id, no new event, transport, stay or step, no invented owner data. The one edit
in this session lies inside F and makes F stricter, never looser: it removes two claims the
surface was making without a record to support them.

## 4 · EXECUTION ENVIRONMENT, AND WHAT IT COULD NOT DO

This continuation ran in a fresh remote Linux container, not on the Owner's machine. Three
consequences, all recorded here rather than worked around:

| Needed | State | Effect |
|---|---|---|
| `src/invitation-tokens.private.csv` | correctly gitignored, absent | no guest sign-in, so no browser walk |
| `src/guestlist.private.json` | correctly gitignored, absent | `efg.test.mjs` E-bundle test cannot read its input |
| Playwright (harness imports a macOS path) | not installed | no rendered frames, no `release-walk`, `a11y`, `crawl`, `smoke` |
| Cloudflare credentials / `wrangler` | absent | no deploy, no parity proof |

Nothing was fabricated to route around this. A synthetic invitation bundle would have meant
inventing owner data to satisfy assertions written against the real party, which §3 forbids and
which would have produced evidence about a fiction. What was available instead — the
deterministic results committed at the exact HEAD under review, the full source, the node test
suite, the release gates, and a new browser-free regression — was used in full.

## 5 · EVIDENCE CONSUMED BEFORE ANY NEW WORK

Per the usage controls, machine verification first:

- `release-walk-results.json` — origin `http://127.0.0.1:8787`, stamped `2026-09-12T13:31:54Z`,
  **77/77**, 0 page errors, 0 console errors. Committed at `2218221`, i.e. produced against the
  exact code the round-2 fix landed.
- `a11y-results.json` — **18/18**.
- `crawl-local.json`, `release-walk.log` — retained, no failures, no token-shaped string.
- Re-run in this session: `npm test` **205/206** and `npm run release-check` **all gates PASS**
  (the single failure is the §4 missing private guest list, not a code defect; 206/206 on a
  machine that holds it).

## 6 · TARGETED 007 RE-CHECK — METHOD

One stream, five checks, no frames opened, no walk re-run. The reviewer's question is narrow:
does the supersession fix hold, in code and in recorded behaviour, and does it hold for the
right reason.

## 7 · TARGETED 007 RE-CHECK — RESULT

| # | Check | Result |
|---|---|---|
| 007-R1 | Machine evidence at HEAD: the four `11b …` walk checks (second device sends later · earlier device names the newer send · superseded snapshot never shown as confirmed · latest sender sees the confirmed journey) | PASS — all four OK inside 77/77 |
| 007-R2 | The stamp round-trips: the client mints `registration_submitted_at` (`review.html:504`), stores it as the snapshot's `at` (`:509`) and as the local received stamp (`:510`); the Worker persists it as `submittedAt` (`src/worker.js:216,231`) and returns it as `receivedAt` (`:277`); the walk's mock mirrors the Worker exactly | PASS |
| 007-R3 | The confirmed view is gated on identity of that stamp, and the superseded branch returns before any card is built — no `.p-wcard`, no `A · Party journey confirmation` | PASS |
| 007-R4 | The received view names a newer send, and the "changed since you sent it" notice is mutually exclusive with it | PASS |
| 007-R5 | Hygiene: no token-shaped string in any tracked run artefact; `src/*.private.{json,csv,txt}` gitignored and absent from the tree; no private file tracked | PASS |

**007's MEDIUM is closed.** The fix is correct and correctly founded: the surface trusts its
local snapshot only when the server's stamp proves it is the very version Guest Relations holds.

## 8 · ADVERSARIAL REVIEW — METHOD

One serial stream. No fan-out, no second agent, no repeated reads. Existing JSON consumed
first (§5). Zero frames opened: pixels were unavailable in this environment, and no finding
below needed them — both are statements of fact in text, provable from the source and the
state table. Scope: the round-2 change surface and its blast radius — `review.html`'s
`paintState`, `assets/confirm.js`, the Worker's status route, the shell drawer, and the
per-step wiring the round-2 fixes claimed.

## 9 · ADVERSARIAL REVIEW — WHAT WAS PROBED AND HELD

Cross-invitation snapshots · snapshot fingerprinting (seats and the stamp correctly excluded,
so opening seating never fakes a change) · the send box hidden under a confirmed journey ·
`journey-confirmed` neutral draft sections · absence of ticket imitation · escaping and the
`mailto` subject · `documents.html` as a forwarder and `dress.html` as a content page, so
"status on every step" is true of the six step surfaces and vacuous elsewhere · the drawer
carrying `role="dialog"`, `aria-modal` and a heading-derived `aria-label` · the client never
writing a confirmed state. All held.

## 10 · FINDING 1 — A DEVICE NAMED WITHOUT A RECORD TO NAME IT (MEDIUM, fixed)

`/api/status` returns `receivedAt` only from a stored `reg:` record. A journey can reach Guest
Relations with no such record — `review.html` ships an email backup channel used when the
endpoint is unreachable, and it does not (correctly) write a local snapshot. Guest Relations
then confirms on `conf:` alone, so the guest reads `confirmed: true, received: false,
receivedAt: null`.

The confirmed view answered that state with *"The details Guest Relations confirmed were sent
from another device"* — and, if the device happened to hold an older snapshot, *"were sent
again from another device after this one"*. Neither is known. The record says nothing about a
second device; the surface inferred one from the absence of a stamp. That is precisely the
class of claim F exists to prevent, and the same class as the MEDIUM 007 raised.

## 11 · FINDING 2 — SUPERSESSION TESTED FOR DIFFERENCE, NOT FOR ORDER (MEDIUM, fixed)

Both the received and the confirmed view decided supersession by comparing the two stamps for
*inequality*. A stamp that differs is not a stamp that is later. Two reachable ways to differ
downwards: Workers KV metadata is eventually consistent, so a status read taken shortly after a
send can still carry the previous `submittedAt`; and two devices' clocks need not agree. In
either case the device holding the newest send was told *"Guest Relations holds the journey
sent on «earlier date» … which replaced the one sent here on «later date»"* — a replacement
dated before the thing it replaced — or, once confirmed, that its own newest send had been
superseded by another device.

## 12 · THE FIX

One edit, `review.html`, seventeen lines, no new file, no behaviour added:

- RECEIVED: the newer-version notice now requires `C.receivedAt() > sn.at`, not merely
  `!==`. A record that reads older than this device's own send falls through to the existing
  honest "Changed since you sent it" branch.
- CONFIRMED: `current` is unchanged — the cards are still painted only on an exact stamp
  match, so a stale read can never promote an unverified snapshot to confirmed. What changed is
  only what is *said* when it does not match, now derived from what the record supports:
  a later stamp than ours → "sent again from another device after this one"; a stamp with
  nothing sent from here → "sent from another device"; no stamp at all, or one older than our
  own send → *"What Guest Relations confirmed is not shown here: this device cannot tell which
  version it was."* No device is named where none is known.

The guarantee is pinned in `test/efg.test.mjs` (the previous assertion pinned the old string
literally; it now pins the ordering predicate and the no-claim wording).

## 13 · TARGETED REGRESSION — SCOPE

Only what the change touches. No re-audit, no full walk, no rerender.

## 14 · TARGETED REGRESSION — RESULT

| Verification | Result |
|---|---|
| `supersession-state-table.mjs` (new, in this directory) | **8/8** |
| `npm test` | **205/206** — the one failure is §4's absent private guest list, unchanged before and after the edit |
| `npm run release-check` | **all gates PASS**, including P9/P10/P11 and P4 |
| Inline script parse of `review.html` | clean |
| The three release-walk regexes that assert this wording (`11 steffie sees confirmed honestly`, `11b earlier device says a newer version exists`, `11b superseded snapshot never shown as confirmed`) | still satisfied by the new text and by the state table's first three rows |

`supersession-state-table.mjs` extracts its predicates verbatim from the shipped `review.html`
and fails loudly if that file no longer contains them, so it cannot drift into testing a copy.
It needs no browser, no server and no guest code, which is why it is the one piece of new
evidence this environment could honestly produce. It covers the two states a browser walk
reaches only with difficulty — a confirmed journey with no stamp on the record, and a record
read back older than this device's own send.

## 15 · WHAT WAS NOT RE-VERIFIED, AND WHY

`release-walk.mjs`, `a11y.mjs`, `crawl.mjs` and `smoke.mjs` were not re-run: §4. The edit is
text inside one existing card, changes no element, no class, no size and no flow, so the a11y,
contrast, overflow and crawl evidence at `2218221` remains descriptive of it — but that is an
argument, not a walk, and the Owner run in §27 replaces it with one.

## 16 · STATE OF THE FOUR REVIEWERS

| Reviewer | Verdict | Standing |
|---|---|---|
| 001 technical/product | PASS | closed; LOW items recorded as baseline |
| 002 rendered UX | PASS | 4 LOW fixed at `2218221`; not re-rendered here (§15) |
| 004 first-time guest | PASS | 4 LOW fixed at `2218221`; not re-rendered here (§15) |
| 007 confirmation/identity | **PASS** | the MEDIUM is closed, §7 |
| Adversarial | **delivered** | two findings, both fixed, §10–§12 |

## 17 · PRODUCTION LEDGER

Unchanged by this session, which made no production call of any kind: REG_KV holds no
acceptance records, INV-002 reads `received:false, confirmed:false`, seating is unconfigured
and NOT OPEN, and the only inventory holds are the intended Family / Bride & Groom
reservations.

## 18 · SECURITY AND PRIVACY

No secret was read, written, committed or logged. The private register and guest list are
gitignored and were absent; the Guest Relations token was never in reach and `src/gr.cjs` was
not invoked. §7 R5 re-confirms that no tracked artefact of this run carries a token-shaped
string. The `src/` tree and the Guest Relations view stay out of the public asset set (gates
R2, P11).

## 19 · KNOWN AUTHORITATIVE DATA STILL PENDING (not release failures)

Sangkhathan `givingEligibility` per invitation, all unresolved and action withheld · ceremony
and dinner FAMILY seat ids, the seating geometry upload and the SEATING OPEN authority ·
the DOCS store binding for `/api/document`, which answers 503 "not enabled yet" · the Wedding
Dinner photograph, an accepted placeholder.

## 20 · ONE OBSERVATION FOR THE DOCS BINDING (not a finding)

The sent snapshot includes each guest's document *states*. Those states are local-only today,
because `/api/document` is unbound. When it is bound, a state that changes server-side — Guest
Relations receiving a document — will alter the fingerprint and show the guest "Changed since
confirmation · not sent" although they changed nothing. Worth a look at the moment of binding;
nothing to do before it.

## 21 · OWNER DECISIONS OUTSTANDING

- **INV-002 guest code rotation.** Deliberately not performed, as instructed. The code was
  committed in acceptance walk scripts across `91afeb7…91c52ad` in the public repository and
  removed at `01a9671`; git history retains it. Rotate before the letters go out (new token in
  the private register → `node src/build-invitations.cjs` → redeploy → re-issue) or accept the
  exposure explicitly.
- The five authoritative-data items in §19.
- Whether to take §22's deployment now or to release `2218221` as it stands and carry the fix
  in a follow-up. That choice is the gate (§29).

## 22 · REPOSITORY STATE AT THE END OF THIS SESSION

Branch `claude/002-final-run-continuation-5ellm7`, pushed. One commit on top of `7796f7c`
touching four paths: `review.html` (the fix), `test/efg.test.mjs` (the pinned guarantee),
`docs/acceptance/2026-09-11-final-run/supersession-state-table.mjs` and its results JSON (new
evidence), and this directory's `README.md`, `HANDOFF.md` and `FINAL-REPORT.md`. `main` is
untouched.

## 23 · DEPLOYMENT STATE

| Origin | Serves | Matches the branch |
|---|---|---|
| Local working tree | the fix | — |
| Cloudflare Worker `07d8374c-6033-4b7d-bcdb-34d288000a5e` | `2218221` | no |
| GitHub Pages | `2218221` | no |

The 50/50 byte-identical parity proven at `2218221` still holds *between the two origins*; it
no longer holds against the repository. Neither origin can be moved from here (§4).

## 24 · USAGE CONTROL COMPLIANCE

One model stream throughout · no reviewer fan-out and no subagent · existing JSON consumed
before any new check · the 007 re-check took five checks, the ceiling · zero frames opened
against a ceiling of eight · zero images read · no rerender at any width · no re-audit after
the fix, only the regression the change required · no script re-run for the record where a
committed deterministic result at the same HEAD already answered the question · no rate or
session limit was hit, and nothing was relaunched or duplicated.

## 25 · WHAT CHANGED IN THE GUEST'S EXPERIENCE

For almost every guest, nothing: a journey sent and confirmed from one device is painted
exactly as before. The difference appears only where the site previously guessed. A guest who
sent their journey by the email backup channel and was then confirmed is no longer told their
details came from another device. A guest whose device holds the newest send is no longer told
an older version replaced it. In both cases the page now says the one true thing available —
that Guest Relations has confirmed the journey, and that this device cannot show which version
that was — and points to Guest Relations for a copy.

## 26 · REGRESSION SURFACE OF THE FIX

Narrow and bounded. `paintState` only; no state machine, no storage key, no API call, no
selector, no class and no layout changed. The confirmed-cards path (`current === true`) is
byte-for-byte the same decision it was at `2218221`. The only paths whose *output* differs are
the three that previously produced an unfounded claim.

## 27 · WHAT CLEARS THE GATE

On a machine holding `src/invitation-tokens.private.csv` and `src/guestlist.private.json`,
with the local server running in the repository root:

1. Merge `claude/002-final-run-continuation-5ellm7` into `main`.
2. `npm test` (expect 206/206) · `npm run release-check` (all gates PASS) ·
   `node docs/acceptance/2026-09-11-final-run/supersession-state-table.mjs` (8/8).
3. `release-walk.mjs` (expect 77/77) · `a11y.mjs` (18/18) — the three wording assertions in
   §14 are the ones to watch.
4. Deploy the Worker and let Pages build; then `crawl.mjs` and `smoke.mjs` on both origins and
   the 50/50 byte-identical parity check.

Nothing else from this run is outstanding.

## 28 · FINAL ISSUE REGISTER

| # | Item | Severity | State |
|---|---|---|---|
| 1 | Superseded local snapshot shown as confirmed (007) | MEDIUM | fixed at `2218221`, re-checked clean here (§7) |
| 2 | A second device named where the record carries no stamp | MEDIUM | fixed on the branch (§10, §12) |
| 3 | Supersession decided by difference rather than by order | MEDIUM | fixed on the branch (§11, §12) |
| 4 | The fix is neither merged nor deployed; repository ≠ both origins | — | **the blocker** (§23, §27) |
| 5 | Browser-level re-verification not executable in this environment | — | deferred to §27, by design not by omission |
| 6 | INV-002 code rotation | — | Owner decision, deliberately not taken (§21) |
| 7 | The five authoritative-data items | — | pending, not release failures (§19) |

## 29 · GATE

Every reviewer stream is closed, the 007 MEDIUM is resolved, the adversarial review is
delivered, and both of its findings are fixed, pinned by a test and covered by an eight-state
regression. The release-blocking condition is not a defect but a deployment: this run required
a guest-facing change, and a change that production does not serve cannot be gated as
released. The Owner's final release decision remains ON HOLD, as instructed, and §27 is the
short path to a clean PASS.

FINAL PRE-RELEASE GATE · BLOCKED
