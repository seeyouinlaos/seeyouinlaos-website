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
  stays), then reads again. `node src/gr.cjs reset` / `reset --confirm "RESET ALL GUEST STATE"`.

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
