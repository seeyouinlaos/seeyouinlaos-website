# 002 FINAL AUTOMATED PRE-RELEASE TEST RUN — FINAL CONSOLIDATED REPORT

Two sessions. The continuation session (13 September 2026, remote container) closed the two
open review items and produced the fix on `claude/002-final-run-continuation-5ellm7`. The
release session (13 September 2026, Owner's machine) integrated that commit into `main`,
ran the complete local verification, deployed both origins from it and proved parity in
production. Entered from `HANDOFF.md` and the repository HEAD alone; no accepted stage was
reopened, and every freeze in §3 was carried forward untouched. Sections follow the 002 house
numbering (`## N · TITLE`).

---

## 1 · EXECUTIVE SUMMARY

The gate passes. The 007 supersession fix re-checked clean; one serial adversarial review
found two genuine defects in the confirmation surface — the page stating as fact something the
record does not say — and both were fixed in one small edit to `review.html`, pinned in
`test/efg.test.mjs` and covered by an eight-state browser-free regression. That fix,
commit **`ce462d7`**, is now on `main`, deployed to the Cloudflare Worker as version
**`854eba86-aee0-4b07-8f63-12b36cabd008`**, built by GitHub Pages from **`ce462d7`**, and
**51/51 guest-facing files are byte-identical** across local, Worker and Pages. Every local
release check ran on the Owner's machine with the private register present and passed at the
full expected count. The production ledger is untouched: REG_KV empty, INV-002 pristine,
seating NOT OPEN.

The Owner's final release decision remains ON HOLD, as instructed; nothing technical stands
in its way.

## 2 · CONTINUATION POINT AND AUTHORITY

- Continuation session entered at `7796f7c`; produced `ce462d7` on
  `claude/002-final-run-continuation-5ellm7` (one commit, seven paths).
- Release session entered at `7796f7c` on the Owner's machine (`main`, clean). Local `main`
  in the second checkout was 245 commits behind `origin/main` and a clean ancestor of it;
  both checkouts were fast-forwarded. `ce462d7` verified as a single commit whose parent is
  `origin/main` (`7796f7c`), touching only `review.html`, `test/efg.test.mjs`, the
  state-table script and its JSON, and this directory's three docs. Integrated by
  fast-forward — the commit itself, not a recreation; SHA preserved.
- Authorised and done: full local verification → deploy Worker → push `main` → Pages build →
  smoke + crawl on both origins → parity → ledger checks → this report → the gate line.
- Not authorised and not done: rotating the INV-002 guest code (Owner decision), any parallel
  reviewer stream, any re-audit of an accepted stage, any re-commit of rendered frames.

## 3 · FREEZE COMPLIANCE

A design system · B shell · C party/person separation · D six surfaces · E Sangkhathan
eligibility (PAIR/NONE/unresolved, never inferred) · F protected confirmation · G seating
geometry · the Haruthai correction pass · every accepted carryover: all untouched. No payment,
no QR, no LINE id, no new event, transport, stay or step, no invented owner data. The one
guest-facing edit in this run lies inside F and makes F stricter, never looser: it removes two
claims the surface was making without a record to support them.

## 4 · EXECUTION ENVIRONMENT

The continuation session ran in a remote Linux container without the private register, the
guest list, Playwright or Cloudflare credentials; it recorded that limitation instead of
routing around it. The release session ran on the Owner's macOS machine in the established
project checkout, with `src/invitation-tokens.private.csv`, `src/guestlist.private.json` and
`src/gr-token.private.txt` present (gitignored), Playwright 1.61.1 at the path the harness
imports, `wrangler` 3.114.17 authenticated to the Cloudflare account, and `gh` authenticated
to the repository. Local server: `python3 -m http.server 8787` in the repository root.

## 5 · EVIDENCE CONSUMED BEFORE ANY NEW WORK

- `HANDOFF.md`, `README.md`, the prior `FINAL-REPORT.md` and the project memory file.
- The `ce462d7` diff, read in full against `7796f7c` before integration.
- The committed deterministic results at `2218221` (release walk 77/77, a11y 18/18) as the
  baseline the new run had to match.

## 6 · TARGETED 007 RE-CHECK — METHOD

One stream, five checks, no frames opened, no walk re-run (continuation session). The
question: does the supersession fix hold, in code and in recorded behaviour, for the right
reason.

## 7 · TARGETED 007 RE-CHECK — RESULT

| # | Check | Result |
|---|---|---|
| 007-R1 | The four `11b …` walk checks at HEAD (second device sends later · earlier device names the newer send · superseded snapshot never shown as confirmed · latest sender sees the confirmed journey) | PASS |
| 007-R2 | The stamp round-trips client → Worker (`submittedAt`) → `/api/status` (`receivedAt`); the walk's mock mirrors the Worker | PASS |
| 007-R3 | The confirmed view is gated on identity of that stamp; the superseded branch returns before any card is built | PASS |
| 007-R4 | The received view names a newer send; the "changed since you sent it" notice is mutually exclusive with it | PASS |
| 007-R5 | Hygiene: no token-shaped string in any tracked run artefact; private files gitignored and untracked | PASS |

**007's MEDIUM is closed.** Re-confirmed in the release session: the same four `11b` checks
and `11 steffie sees confirmed honestly` pass inside the 77/77 walk at `ce462d7`.

## 8 · ADVERSARIAL REVIEW — METHOD

One serial stream, no fan-out, no second agent. Scope: the round-2 change surface and its
blast radius — `review.html`'s `paintState`, `assets/confirm.js`, the Worker's status route,
the shell drawer, the per-step wiring. Zero frames opened; both findings are statements of
fact in text, provable from the source and the state table.

## 9 · ADVERSARIAL REVIEW — WHAT WAS PROBED AND HELD

Cross-invitation snapshots · snapshot fingerprinting (seats and the stamp excluded) · the send
box hidden under a confirmed journey · neutral draft sections once confirmed · absence of
ticket imitation · escaping and the `mailto` subject · `documents.html` as a forwarder and
`dress.html` as a content page · the drawer's `role="dialog"`, `aria-modal` and heading-derived
`aria-label` · the client never writing a confirmed state. All held.

## 10 · FINDING 1 — A DEVICE NAMED WITHOUT A RECORD TO NAME IT (MEDIUM, fixed, deployed)

`/api/status` returns `receivedAt` only from a stored `reg:` record. A journey can reach Guest
Relations without one (the email backup channel) and be confirmed on `conf:` alone, so the
guest reads `confirmed: true, received: false, receivedAt: null`. The confirmed view answered
that with "were sent from another device" — or "sent again from another device after this
one" if an older snapshot existed. Neither is known; the surface inferred a device from the
absence of a stamp.

## 11 · FINDING 2 — SUPERSESSION TESTED FOR DIFFERENCE, NOT FOR ORDER (MEDIUM, fixed, deployed)

Both the received and the confirmed view decided supersession by *inequality* of the two
stamps. An eventually consistent KV read, or a clock behind this one, could announce an
earlier send as the replacement of a later one, or tell the device holding the newest send
that another device had superseded it.

## 12 · THE FIX

One edit, `review.html`, seventeen lines, no new file, no behaviour added:

- RECEIVED: the newer-version notice requires `C.receivedAt() > sn.at`, not `!==`.
- CONFIRMED: `current` is unchanged — cards only on an exact stamp match. What is *said* when
  it does not match is now derived from the record: a later stamp than ours → "sent again from
  another device after this one"; a stamp with nothing sent from here → "sent from another
  device"; no stamp, or one older than our own send → "What Guest Relations confirmed is not
  shown here: this device cannot tell which version it was."

Pinned in `test/efg.test.mjs` (ordering predicate and no-claim wording, in place of the old
string literal). Both origins now serve this text (§23).

## 13 · TARGETED REGRESSION — SCOPE

Only what the change touches, plus the complete release gate set the run defines. No re-audit
of an accepted stage. Rendered frames were regenerated by the walks into a scratch directory
and not re-committed: the edit is text inside one existing card and changes no element,
class, size or flow, and no visual check failed.

## 14 · TARGETED REGRESSION — RESULT (release session, `ce462d7`, local origin)

| Verification | Result |
|---|---|
| `npm test` | **206/206** — the private guest-list-dependent test included |
| `npm run release-check` | **all 21 gates PASS** (1, 2, 2b, 3, 4, 5, R1, R2, R3, P1–P11, L1) |
| `supersession-state-table.mjs` | **8/8** |
| `release-walk.mjs` | **77/77** · 0 page errors · 0 console errors · the three wording assertions (`11 steffie sees confirmed honestly`, `11b earlier device says a newer version exists`, `11b superseded snapshot never shown as confirmed`) pass |
| `a11y.mjs` | **18/18** |
| Regression C (`2026-09-11-party-person/walk.mjs`) | **39/39** |
| Regression D (`2026-09-11-recompose/walk.mjs`) | **39/39** |
| Regression E/F/G (`2026-09-11-efg/walk.mjs`) | **37/37** |
| Haruthai (`2026-09-11-haruthai/walk.mjs`) | **24/24** · 0 page errors |
| `crawl.mjs` local | 18 pages · **0 HTTP failures** · 0 broken images · resort-01 never requested |

Committed here: `release-walk-results.json`, `release-walk.log`, `a11y-results.json`
(unchanged content), `crawl-local.json` — all at `ce462d7`.

## 15 · WHAT WAS NOT RE-VERIFIED, AND WHY

Nothing the run defines was skipped. Frames were not re-committed (§13). The crawl's
informational cross-page-anchor list carries three entries (`review.html → you.html#you`,
`wedding.html#ev-temple`, `about-you.html#documents`) against two in the `01a9671` baseline:
`#you` and `#documents` are rendered by script only inside a signed-in session, which an
unauthenticated crawl cannot see (the `#documents` link dates from the accepted d4a4518
correction); `#ev-temple` was already in the baseline. None is an HTTP failure and none is a
criterion of the run. Recorded, not reopened.

## 16 · STATE OF THE FOUR REVIEWERS

| Reviewer | Verdict | Standing |
|---|---|---|
| 001 technical/product | PASS | closed |
| 002 rendered UX | PASS | 4 LOW fixed at `2218221`; walk 77/77 at `ce462d7` |
| 004 first-time guest | PASS | 4 LOW fixed at `2218221`; walk 77/77 at `ce462d7` |
| 007 confirmation/identity | **PASS** | MEDIUM closed (§7); wording assertions pass on both origins' bytes |
| Adversarial | **delivered** | two findings, both fixed and deployed (§10–§12) |

## 17 · PRODUCTION LEDGER (read after deployment, 13 Sep 2026)

- `REG_KV` (`090270d0…`): **0 keys** — no acceptance record, no test history.
- `/api/status?invitation=INV-002`: `received:false, receivedAt:null, confirmed:false,
  confirmedAt:null` — **pristine**.
- `/api/seating`: `open:false, frozen:false, configured:{ceremony:false, dinner:false}`;
  capacity as the binding Owner geometry (ceremony 50 = 20 + 30; dinner 48 + 2 fixed = 50) —
  **NOT OPEN**, unconfigured.
- Inventory: reachable on both origins (smoke); holds unchanged by this run, which made no
  write (smoke `no writes` PASS on both origins).

## 18 · SECURITY AND PRIVACY

No secret was committed or logged. Every artefact added or updated in this directory was
grepped for the INV-002 guest code and the Guest Relations token before staging: 0 hits.
Private files remain gitignored and untracked (`git status` clean of them). `src/` and `docs/`
stay out of the public asset set (`.assetsignore`; gates R2, P11). `src/gr.cjs` was not
invoked; the ledger was read through the public read-only routes and `wrangler kv key list`.

## 19 · KNOWN AUTHORITATIVE DATA STILL PENDING (not release failures)

Sangkhathan `givingEligibility` per invitation · ceremony and dinner FAMILY seat ids, the
seating geometry upload and the SEATING OPEN authority · the DOCS store binding for
`/api/document` (503 "not enabled yet") · the Wedding Dinner photograph (accepted placeholder).

## 20 · ONE OBSERVATION FOR THE DOCS BINDING (not a finding)

The sent snapshot includes each guest's document states, local-only until `/api/document` is
bound. A server-side state change after binding would alter the fingerprint and show "Changed
since confirmation · not sent" although the guest changed nothing. Worth a look at the moment
of binding; nothing to do before it.

## 21 · OWNER DECISIONS OUTSTANDING

- **INV-002 guest code rotation.** Not performed, as instructed. The code was committed in
  acceptance walk scripts across `91afeb7…91c52ad` (public repository) and removed at
  `01a9671`; git history retains it. Rotate before the letters go out (new token in the
  private register → `node src/build-invitations.cjs` → redeploy → re-issue) or accept the
  exposure explicitly.
- The four authoritative-data items in §19.
- **Final release approval** — ON HOLD by instruction; this report is the evidence for it.

## 22 · REPOSITORY STATE AT THE END OF THIS RUN

`main` = `ce462d7` (the fix; guest-facing source state) followed by one acceptance commit
carrying only this directory's evidence and docs (`docs/acceptance/2026-09-11-final-run/`
only — `git diff ce462d7..HEAD --stat` touches no guest-facing file). Working tree clean.
`origin/main` = local `main`. The branch `claude/002-final-run-continuation-5ellm7` is fully
contained in `main`. Both local checkouts of the repository are on the same `main`.

## 23 · DEPLOYMENT STATE

| Origin | Serves | Version / build |
|---|---|---|
| Cloudflare Worker `seeyouinlaos-website.suthep-hrg.workers.dev` | `ce462d7` | version `854eba86-aee0-4b07-8f63-12b36cabd008` (deployed 13 Sep 2026 06:59 UTC from the clean `ce462d7` tree) |
| GitHub Pages `seeyouinlaos.github.io/seeyouinlaos-website` | `ce462d7` | build `built` from `ce462d7a3eb504559e484873069b5e4b1b0f968b` (created 06:59:51 UTC); rebuilt from the acceptance commit, which changes no served file |

**Parity: 51/51 guest-facing files byte-identical, local = Worker = Pages** — every tracked
`*.html` outside `docs/`, every `assets/**/*.{js,mjs,css}` and `assets/i18n/*.json`,
`register/crypto.mjs` and `register/invitations.enc.json`; the superseded `register/` engine
and `register-landing.html` are excluded by design (gate R1). SHA-256 per file in
`parity-ce462d7.txt`. Both origins return the new confirmed-view wording.

Production checks on both origins: `smoke.mjs` **8/8 + 8/8** (auth · status from worker ·
seating closed · sangkhathan withheld · inventory reachable · shell status on another step ·
no page errors · no writes); `crawl.mjs` 18 pages, **0 HTTP failures, 0 console errors**,
0 broken images, resort-01 never requested (`crawl-worker.json`, `crawl-pages.json`).

## 24 · USAGE CONTROL COMPLIANCE

One model stream throughout · no subagent, no reviewer fan-out · existing evidence consumed
before any new check · no re-audit after the fix · each verification run once, with the
single exception that the reviewed diff was read once and the test suite run once · zero
image frames opened or read · frames not regenerated for the record · claude-mem and
Playwright MCP not enabled; the established Node/Playwright harness used · no rate or session
limit hit; nothing relaunched.

## 25 · WHAT CHANGED IN THE GUEST'S EXPERIENCE

For almost every guest, nothing. A guest who sent by the email backup channel and was then
confirmed is no longer told their details came from another device. A guest whose device holds
the newest send is no longer told an older version replaced it. In both cases the page says the
one true thing available — Guest Relations has confirmed the journey, and this device cannot
show which version — and points to Guest Relations for a copy. This is now what production
serves.

## 26 · REGRESSION SURFACE OF THE FIX

`paintState` only; no state machine, storage key, API call, selector, class or layout changed.
The confirmed-cards path (`current === true`) is the same decision it was at `2218221`. Only
the three paths that previously produced an unfounded claim differ in output. The full walk,
a11y and the four regression walks confirm nothing else moved.

## 27 · WHAT CLEARED THE GATE

1. `main` fast-forwarded to `ce462d7` (both checkouts).
2. `npm test` 206/206 · `release-check` all PASS · state table 8/8.
3. Regression C 39/39 · D 39/39 · E/F/G 37/37 · Haruthai 24/24 · release walk 77/77 ·
   a11y 18/18 · local crawl 0 failures.
4. Worker deployed (`854eba86…`) · `main` pushed · Pages built from `ce462d7` ·
   smoke 8/8 both origins · crawl 0 failures both origins · parity 51/51 · REG_KV 0 keys ·
   INV-002 pristine · seating NOT OPEN.

## 28 · FINAL ISSUE REGISTER

| # | Item | Severity | State |
|---|---|---|---|
| 1 | Superseded local snapshot shown as confirmed (007) | MEDIUM | fixed at `2218221`, re-checked clean, in production |
| 2 | A second device named where the record carries no stamp | MEDIUM | fixed at `ce462d7`, **in production** |
| 3 | Supersession decided by difference rather than by order | MEDIUM | fixed at `ce462d7`, **in production** |
| 4 | Repository ≠ origins | — | **closed**: 51/51 parity at `ce462d7` |
| 5 | Browser-level re-verification | — | **done** on the Owner machine, §14 |
| 6 | INV-002 code rotation | — | Owner decision, deliberately not taken (§21) |
| 7 | The four authoritative-data items | — | pending, not release failures (§19) |
| 8 | Crawl informational cross-anchor notes (3, session-rendered ids) | LOW/info | recorded, not a criterion (§15) |

## 29 · GATE

Every reviewer stream is closed, the 007 MEDIUM is resolved, the adversarial review is
delivered and both of its findings are fixed, pinned by a test, covered by an eight-state
regression, and served by both production origins at byte parity with the repository. The
complete local release verification passed at full count on the Owner's machine. The
production ledger is clean and seating is NOT OPEN. The Owner's final release decision remains
ON HOLD by instruction, with the INV-002 code rotation as the one Owner decision outstanding
before the letters go out.

FINAL PRE-RELEASE GATE · PASS
