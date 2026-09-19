# Release 013 · FINAL CONSOLIDATED REPAIR + CLEAN-STATE TEST RUN (19 Sep 2026)

The Owner's brief of 19 Sep 2026 (sections 0–25), delivered as one release on the one canonical Worker. Base `main`
`c516674` (release 012 live). The plan reviewed by Codex is `docs/review/014-codex-release-013/PLAN.md`; the Codex record
is in that folder.

## 1 · What was already live and valid (regression-tested, not re-implemented)

Participation scope (the question first, eight combinations, excluded stages never asked), the whole-trip decline, the
Not-joining state machine (untouched → declined at once, selected → released and declined, declined → reconsider), tickets
and seats following attendance, Favorite Flavor (six choices, one selection), the View-all-steps overlay scroll, the Aman
header (menu · wordmark · bag, the account row in the drawer), Edit 5, the Haruthai / Sathorn fixed arrangement, the
Riverside Hotel, the wedding-stay switching (012-1 / 012-2), no GitHub Pages residue in the tree (gate I1). The release 011
suite (52), the release 012 suite (25), the P0 Empty Bag suite (49) and the account-IA suite (33) re-ran on fresh stages of
this build — `stage/SUMMARY.txt`.

## 2 · The repairs of this release

- **The Bangkok video** — the Owner's `copy_247B8DD5-3003-4095-8108-FE35E850AF5D.mov` (Drive `1IcZINAoYyc5iG6vpTkf0JhmcTaLbBRXr`,
  HEVC 720×1280, 15.07 s, 10.3 MB, uploaded to this session) → `assets/video/bangkok-card.mp4`: H.264 main, yuv420p,
  720×1280, no audio, `+faststart`, CRF 24, **2,529,071 bytes**. The index destination card declares it (`data-video`); the
  photograph stays the poster and the geometry (5:4, cover-cropped); the module (release 011) plays it muted · inline ·
  looped · without controls only once it is actually playing, pauses it off screen, and keeps the photograph for reduced
  motion, Save-Data, a failing source or a refused autoplay. Gate V1 verifies the file (it now reads ffprobe's streams by
  field name — the earlier positional check could never have passed). Provenance: `docs/SOURCE-MAP-BANGKOK.md`.
- **Question 5** — "Anything you would rather avoid?" (the About You question numbered 05) is gone from the model, About
  You, Review, My Profile and both emails; an older answer under `avoid` in a draft is ignored, never required; the numbering
  closes (02 Coffee or tea · 03 My Favorite Flavor · 04 Favourite drink · 05 Favourite film · 06 Favourite music).
  *Assumption stated in the report: the Owner's identification of "Question 5" reached no session on this machine; the
  About You list numbers its questions, and 05 was this one.*
- **The complete trip** — `SIYL_JOURNEY.fullExperience()` is pure (previewing changes nothing; the lift of a preset decline is
  applied only on confirm) and explains every stage: suggested · fallback (the suggested room is full — the nearest rate with
  a place is named as the replacement) · sold out (said, never invented) · kept (chosen, declined by hand, or arranged for the
  hosts). The drawer lists it before "Add the complete trip"; the panel then says what was filled, what was replaced and what
  stayed open. Deterministic: the same inventory gives the same plan; recomputing after the confirm changes nothing.
- **Confirmation / email parity** — proven in the 013 E2E: a full trip (ten stages, MU9646 and the Kempinski nights among
  them, the Sathorn Penthouse) reads the same on Review & Send, in the stored record (`/api/gr/record`, Guest Relations only)
  and in both emails composed from it; the flavour is in all three; Question 5 in none.
- **The register from the Guest List** — `src/guestlist-from-contacts.cjs` reads the CONTACTS sheet of the Operations Master
  (the sheet the Owner's PDF carries; modified 19 Sep 07:36 UTC): **85 active invitations in 63 parties** (40 existing guests
  keep their ids and codes, 45 new guests with new codes), **9 retired** (absent from the sheet or noted "Not Attend"), 15
  rows not invited by this run and reported privately (the ten "Not Attend" rows, two "No" placeholders, one blank row, one
  "her daughter", one duplicate row). The hosts stay G048 · G049 · INV-001 (the FIXED allocation). The private report names
  every mapping; nothing with a code, an email, a phone number or a birthdate leaves the Owner's machine.
- **THE CLEAN RESET** — `POST /api/gr/reset` (the GR token): a dry run names every room occupancy, seat hold, draft actor and
  guest KV key it would clear and writes nothing; `{ dryRun: false, confirm: "RESET ALL GUEST STATE" }` clears them — every
  `occ:` record of the room engine (the FIXED allocation is configuration, never stored), every seat hold of both events
  (the geometry and the open / frozen state stay), every draft actor (marked seeded, so the deleted KV mirror never re-seeds),
  every `draft:` · `contact:` · `avatar:` · `reg:` (and `:prev:`) key — returns every deleted value (the CLI writes it to a
  private backup file first) and stamps `reset:epoch`. The draft read carries `resetAt`; a write without `seenReset` equal to
  it is refused (409 `reset`); each device clears the journey it cached before the read once (a key still equal to the
  snapshot — the Bag by its lines, since the engine sync rewrites unit labels while reading — goes; an edit typed meanwhile
  stays), then reads again. `node src/gr.cjs reset` / `reset --snapshot` / `reset --confirm "RESET ALL GUEST STATE" --backup <file>`.
  Hardened after the Codex pre-deploy review (docs/review/014-codex-release-013): the epoch lives in every draft actor
  (a write without it is refused there, KV or no KV), the epoch is published before anything else goes, a lock holds guest
  engine and ledger writes during the sweep, the execution is bound to a verified snapshot whose digest covers the values,
  a device that synchronised before the epoch drops its whole cached journey (a fresh device keeps what it typed), and —
  found by the release's own device check on the stage — the contact channel honours the epoch too (the read names it, a
  write without it is refused, the device clears before the old contact could be pushed back).

## 3 · Tests

- `npm test` **362 / 362** · release-check passed (gates incl. V1, M1, I1). New: `test/release-013.test.mjs` (the reset end to
  end in the Worker with every store in memory — dry run, the words, execute → zero, the fixed places stand, the backup, the
  epoch, the refused write, the beacon; the device rule; Question 5 gone; the clip).
- `docs/acceptance/2026-09-19-release-013/e2e.mjs` **31 / 31** on a fresh stage (`stage/`): the shipped clip in Chromium
  (poster first · playing at the card's geometry · reduced motion · a blocked source) and iPhone Safari (WebKit); the eight
  participation scopes (the stages that exist, the excluded ones, readiness, the Bag, the wedding); the complete trip (the
  pure plan, a named fallback when the suggested Kunming room is full, the preview with nothing held, the confirm filling
  ten stages, the summary, idempotence); Review = record = both emails; Haruthai's fixed arrangement (never a Bag line, never
  a readiness item); THE CLEAN RESET on the stage (populated → dry run wrote nothing → the words → execute → zero holds,
  zero seats, zero drafts, zero records, the fixed places and the open seating stand → a device that cached ten lines
  honours the epoch: nothing on the device, the server or the engine; no submission remains); widths and console.

## 4 · Live — the canonical Worker (19 Sep 2026)

- **Release path**: `main` fast-forwarded to `release-013` (`3973d80`) and pushed at 10:27:49 UTC; the Owner's Workers Build
  deployed it as version **`f6222653-c4c1-474e-b779-760960f08ab1`** at 10:29:30 UTC. No manual deploy, no infrastructure change
  (`node src/infra-guard.cjs --live`: FREEZE intact — https 200 cloudflare, `/api/draft` 401, GitHub Pages 404).
  Rollback: version `9043319e` (main `c516674`, release 012) — note that a rollback of the code does not undo the reset. The proof commit `5a3dfa5` (docs only) was built as `51348baa` at 10:46:26 UTC — parity re-proven 243 / 243, the zero state re-read (0 · 2 fixed · 0 · 0 · 0).
- **Parity** (`parity-f6222653.json`): **243 / 243** served files byte-identical to `main`, plus the clip (2,529,071 bytes),
  the register (85 entries, 2 hosts) and both encrypted bundles checked by sha256.
- **THE CLEAN RESET, executed once** (the Owner's command, brief §2), through `node src/gr.cjs`:
  1. `reset-1-dry-run.json` (10:30:51 UTC): 7 guest-generated room occupancies (all by the hosts' own accounts while
     testing: G048 × 6 hotels, G049 × the private residence), the 2 FIXED penthouse places, 1 seat hold (G048, dinner
     D-B-13), 2 draft actors with a draft of 85 (INV-G048, INV-G049), 13 guest KV keys (3 drafts · 3 contacts · 7 submission
     records incl. history for the hosts' test journeys); nothing written.
  2. `reset-2-snapshot.txt` (10:31:41 UTC): every value that would go — 23 values (2 actor drafts, 7 occupancy records, 1 hold,
     13 KV values with their bytes and metadata) — written to `src/reset-backup-2026-09-19T10-31-41-650Z.private.json`
     (169 KB, git-ignored, read back and verified) with the digest of that exact state.
  3. `reset-3-execute.json` (10:31:52 UTC, epoch **2026-09-19T10:31:52.628Z**): bound to the digest and the words — 7
     occupancies cleared (0 remaining, the 2 fixed places stand), 1 seat cleared (0 remaining), 85 actors took the epoch
     and 2 drafts cleared, 13 KV keys deleted (the answer's `remaining.kvKeys: 13` was KV's list lagging the deletes —
     `kv key list` two minutes later: one key, `reset:epoch`; every deleted key answers 404).
  4. `reset-4-dry-run-after.json` (10:34:08 UTC): **0 · 0 · 0 · 0** (occupancies, seats, drafts with state, guest KV keys),
     the fixed places 2, actors 85.
  5. `reset-5-verification.json` — independently through the read APIs: rooms plan 129 units, **guest-generated occupancy 0**,
     fixed host places `bkk-stay/penthouse/A` for G048 and G049, **seat holds 0**, seating open and not frozen with its
     capacity intact, `/api/status` for the hosts `received: false`, Guest Relations' journeys listing empty.
- **Read-only live acceptance**: `live-ro.log` (013) **17 / 17** — the register and the bundle byte-equal to the repository
  (85, 2 hosts), the clip byte-equal and playing on the card in Chromium and on iPhone Safari (muted · inline · looped, the
  photograph as poster and under reduced motion), the API private, `/api/gr/reset` and `/api/gr/record` 401 without the
  token, GitHub Pages 404, the Aman header, the private pages gated, no overflow at 320 / 834 / 1440, no console error,
  and the GR verification of the reset (zero; `reset-verification.json`). Release 012 `live-ro` **20 / 20**, release 011
  `live-ro` **14 / 14** (`012-ro/`, `011-ro/`; their Bangkok-card checks now accept the shipped clip). The 013 E2E's public
  sections in LIVE mode **9 / 9** (`e2e-013-live/`).
- **Nothing was written on live by a test**: no synthetic guest, no hold, no draft, no seat, no email; the reset itself was
  the one Owner-authorised write. The signed-in flows (the eight scopes, the whole-trip decline, the complete trip, parity,
  Haruthai, the reset on a populated state) are proven on fresh stages of the identical bundle (`stage/`).
- **Codex**: the final review is INCOMPLETE — the quota refused the second post-implementation call ("try again at
  Sep 24th, 2026 10:19 PM"); pass 0 (pre-deploy) complete and fixed, pass 1 interim and fixed
  (docs/review/014-codex-release-013). Not represented as passed.
