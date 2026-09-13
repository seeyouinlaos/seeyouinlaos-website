# 002 FINAL AUTOMATED PRE-RELEASE TEST RUN — HANDOFF (run complete, 13 Sep 2026)

This file, `README.md` beside it, `FINAL-REPORT.md` and the project memory
`~/.claude/projects/-Users-thongantang/memory/siyl-002-stage-sequence.md` are the authoritative
state. A fresh session continues from these files and the repository HEAD — never from an
earlier conversation.

> **FINAL OWNER RELEASE APPROVAL — 002 · RELEASED · ACCEPTED (13 Sep 2026).** The production
> state at main **`0029e12`** (guest-facing source `72d9e15`) is the authoritative released
> version: one access code per invitation/party · INV-001 = Haruthai + Suthep · INV-002
> unchanged · seating OPEN · ceremony 50 and dinner 50 ordinary bookable chairs, no fixed
> Bride/Groom and no FAMILY-reserved seat · Sangkhathan PAIR for every ACTIVE invitation ·
> Wedding Dinner authorised image set · DOCS upload disabled · the automatic Cloudflare
> Workers Build as the current release path · local = Worker = GitHub Pages parity 61/61
> proven · all final verification results accepted. No further review, audit, regression run,
> redesign, deployment or code change belongs to this approval. **Future follow-ups only:**
> possible INV-002 code rotation · DOCS privacy/storage architecture · Cloudflare
> deployment-path clean-up.

> **13 Sep 2026 · FINAL RUN COMPLETE. FINAL PRE-RELEASE GATE · PASS.** Read `FINAL-REPORT.md`.
> Nothing from this run is outstanding. The Owner's final release approval stays ON HOLD by
> instruction.
>
> **13 Sep 2026, later · OWNER DECISIONS APPLIED — `7431761` then the final correction `0b8ff2d`**
> (record: `docs/acceptance/2026-09-13-owner-decisions/README.md`). One code per party confirmed
> (INV-002 not rotated) · **seating OPEN on production**: ceremony 50 (L 10×2 + R 10×3) and
> **dinner 50 bookable chairs (T 25 + B 25) — nobody has a fixed seat, no Bride/Groom position,
> no family chair**; the couple book first through the same engine as party **INV-001 ·
> Haruthai & Suthep** (one code in the private register, G048 + G049); real booking flow proven
> on production 10/10 and every chair given back (ledger 100 available, held 0) · booking rule
> unchanged (authenticated party, OPEN, not FROZEN; no attendance prerequisite) · the **Wedding
> Dinner carries the Owner's 10-image set** · DOCS upload stays DISABLED by decision ·
> **Sangkhathan offered to every active party (`72d9e15`)**: `givingEligibility = PAIR` on all
> 26 ACTIVE invitations, INV-001 included; one optional party decision, only once every named
> guest attends the temple, USD 15 per person — the accepted E behaviour, now live for everyone.
> Production: guest-facing source **`72d9e15`** (later commits docs-only) · the live Worker is
> the **Cloudflare Workers Builds** version of HEAD (`bf286abb` at 72d9e15; the Owner has made
> that integration the release path for now — no competing manual deploys; wait, verify, prove
> parity after each push) · Pages built from 72d9e15 · **parity 61/61** · smoke 8/8 both origins ·
> release walk 78/78 · REG_KV 0 keys · INV-001 and INV-002 pristine · seating OPEN, 100 chairs
> available, held 0.
> Owner items: INV-002 rotation (Owner decision) · DOCS (separate future privacy decision) ·
> deploy-path clean-up (infrastructure follow-up). Nothing else is open.

## Secured state
- Repository: `main` = **`ce462d7`** (the fix; the guest-facing source state) + one acceptance
  commit on top carrying only `docs/acceptance/2026-09-11-final-run/` evidence and docs.
  `origin/main` = local `main`. Working tree clean. Both local checkouts
  (`~/peoject.claude.skill.canva/seeyouinlaos-website`, the established one holding the
  private files and `node_modules`, and `~/.codex/.chatgpt-projects/…/seeyouinlaos-website`)
  are on the same `main`.
- Production: Cloudflare Worker version **`854eba86-aee0-4b07-8f63-12b36cabd008`** (from
  `ce462d7`) · GitHub Pages built from **`ce462d7`** (then from the acceptance commit, no served
  file changed) · **51/51 guest-facing files byte-identical** (local = Worker = Pages,
  `parity-ce462d7.txt`).
- Verification at `ce462d7`, Owner machine: `npm test` **206/206** · `release-check` all gates
  PASS · state table 8/8 · `release-walk.mjs` **77/77** (0 page errors, 0 console errors;
  **78/78 since 72d9e15**, the party's Sangkhathan decision added) ·
  `a11y.mjs` **18/18** · regression C 39/39 · D 39/39 · E/F/G 37/37 · Haruthai 24/24 ·
  `smoke.mjs` **8/8 on both origins** · `crawl.mjs` 0 HTTP failures / 0 console errors on both
  origins.
- Production ledger at the end of the FINAL RUN: REG_KV **0 keys**; INV-002 `received:false,
  confirmed:false`; seating `open:false`, unconfigured, NOT OPEN. No write was made by that run.
  **Superseded 13 Sep 2026 by the Owner decisions: seating is now OPEN and configured** (see the
  note at the top and `docs/acceptance/2026-09-13-owner-decisions/`).

## Frozen (never reopen or alter)
A design system · B shell · C party/person separation · D six surfaces · E Sangkhathan eligibility
(PAIR/NONE/unresolved, never inferred) · F protected confirmation (now stricter at `ce462d7`:
a second device is named only where the record supports it) · G seating ledger — geometry as
the Owner decided on 13 Sep 2026 at `0b8ff2d`: ceremony 50 = L 10×2 + R 10×3; **dinner 50
bookable chairs = T 25 + B 25, no fixed position for anyone, no family chair**; production OPEN
· Haruthai correction pass (its dinner placeholder superseded 13 Sep by the Owner's image set) · every accepted carryover listed in
the memory file. No payment, no QR, no LINE id, no new event/transport/stay/step, no invented
owner data.

## Reviewer state (final)
| Reviewer | Verdict | Standing |
|---|---|---|
| 001 technical/product | PASS | closed |
| 002 rendered UX | PASS | 4 LOW fixed at 2218221; walk 77/77 at ce462d7 |
| 004 first-time guest | PASS | 4 LOW fixed at 2218221; walk 77/77 at ce462d7 |
| 007 confirmation/identity | PASS | MEDIUM closed; re-checked 5/5 (`FINAL-REPORT.md` §7) |
| Adversarial | delivered | 2 findings, fixed at ce462d7, in production (§10–§12) |

## What the release session did (13 Sep 2026, Owner machine)
Fetched; verified `ce462d7` is one commit on `7796f7c` touching only the intended paths;
fast-forwarded `main` (no recreation, SHA preserved); ran the complete local verification with
the private files present; deployed the Worker from the clean `ce462d7` tree; pushed `main`;
waited for the Pages build; ran smoke and crawl on both origins; proved 51/51 parity by SHA-256;
read the ledger; wrote the evidence and this documentation. Rendered frames were regenerated
into a scratch directory and not re-committed (text-only edit inside one card; no visual check
failed). No subagent, no MCP, no claude-mem, one stream.

## Owner decisions pending (not release blockers)
- **Rotate the INV-002 guest code** (in public git history 91afeb7…91c52ad; removed at 01a9671).
  Not performed — Owner decision.
- DOCS store binding (DISABLED by decision; separate future privacy decision) · deploy-path
  clean-up (Workers Builds is the release path for now). (Sangkhathan PAIR for every active
  party, FAMILY seat ids, fixed Bride/Groom positions, seating opening, the couple's party and
  the Wedding Dinner photograph: all closed 13 Sep.)
- Final release approval (ON HOLD by instruction).

## How to run the evidence scripts (local server `python3 -m http.server 8787` in the repo root)
```
node docs/acceptance/2026-09-11-final-run/release-walk.mjs http://127.0.0.1:8787 <outdir>
node docs/acceptance/2026-09-11-final-run/a11y.mjs        http://127.0.0.1:8787 <outdir>
node docs/acceptance/2026-09-11-final-run/crawl.mjs       <origin> <out.json>
node docs/acceptance/2026-09-11-final-run/smoke.mjs       <origin>
node docs/acceptance/2026-09-11-final-run/supersession-state-table.mjs
```
Parity: hash every tracked `*.html` outside `docs/`, `assets/**/*.{js,mjs,css}`,
`assets/i18n/*.json`, `register/crypto.mjs`, `register/invitations.enc.json` locally and via
`curl -sL` on both origins (the Worker answers `/x.html` with 307 → `/x`); the 51 files and
their hashes are in `parity-ce462d7.txt`. The guest code is read from the gitignored
`src/invitation-tokens.private.csv` (or `SIYL_TOKEN`); Guest Relations operations use
`src/gr.cjs` with the gitignored token — never in a reviewer.
