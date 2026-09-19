# Release 013 · FINAL CONSOLIDATED REPAIR + CLEAN-STATE TEST RUN — the repair plan (19 Sep 2026)

Base: `main` `c516674` (release 012 live, Worker `9043319e`). Branch `release-013`. One Worker, one origin, the freeze intact.

## What the inspection found (read-only, 09:50–10:10 CEST)

- **Codex**: plugin `codex@openai-codex` 1.0.6, `codex-cli 0.154.0`, logged in (ChatGPT); the quota is exhausted until
  10:56 CEST (probe at 09:53: "You've hit your usage limit … try again at 10:56 AM"). The pre-implementation review runs
  the moment it returns; every finding is classified and every valid P0/P1 fixed before deploy.
- **Guest List 007**: no Drive file of that name exists; the Owner's supplied PDF `HS_Wedding_Operations_Master.pdf` and the
  workbook (modified 19 Sep 07:36 UTC) carry the CONTACTS sheet — 106 rows CON001–CON106 (100 named, 6 empty), columns
  ID · Firstname · Surname · Nickname · Couple · Letter · Birthdate · Nationality · RSVP (empty) · Role · Sending Invitation ·
  contact fields. Against the register (27 parties · 49 guests · 47 active codes): 44 direct matches, spelling/nickname
  variants known from the 16 Sep reconciliation, ~50 new named people, several register guests absent from the sheet, ten
  rows noted "Not Attend", three placeholder rows ("No", "her daughter", a blank partner). This sheet is treated as the
  Guest List 007 the Owner named.
- **Live stores** (GR read only): rooms engine 129 units, 8 guest holds (all by the hosts' own accounts G048/G049 while
  testing 16–19 Sep) + the FIXED penthouse A; seating 1 hold (G048, dinner D-B-13); KV 13 keys — `draft:` ×3 and `contact:`
  ×3 (INV-G001, INV-G048, INV-G049), `reg:` ×7 (the hosts' test submissions with their `:prev:` history); no avatar.
- **Operations Master PDF vs site**: every headline product fact matches (Sathorn 85 · U Sathorn 64 · Shama 40 · train ·
  Souphattra 145–375 · Riverside 30 (the earlier 25 is corrected in the workbook) · MU9646 · C86 105 · Luye 75 · return 200 ·
  Kempinski 380 per room).
- **Already live and valid (011/012)**: participation scope model, full decline path, Not-joining state machine, Favorite
  Flavor, View-all-steps overlay, Aman header, Edit 5, Haruthai fixed arrangement, Riverside, hotel switching (012-1/012-2),
  GitHub Pages residue (none in the tree; gate I1). These are regression-tested, not re-implemented.

## The repairs (code)

1. **Bangkok video** — the Owner's MOV (HEVC 720×1280, 15.07 s, 10.3 MB, uploaded to this session) → `assets/video/bangkok-card.mp4`
   (H.264 main, yuv420p, no audio, faststart, CRF 24, 2.53 MB); `data-video` on the index destination card; the existing
   module (poster-first, muted autoplay loop playsinline, fail/autoplay-rejection/reduced-motion → poster, off-screen pause)
   and gate V1 unchanged. Provenance in docs/SOURCE-MAP-BANGKOK.md.
2. **Question 5** — the About You question numbered 05, "Anything you would rather avoid?", is removed from
   `SIYL_GUEST.PROFILE`, the email PROFILE list and the legacy migration keep-list; an old `avoid` answer in a draft is
   tolerated (ignored, never rendered, never required). Flavor stays as shipped (six choices, one selection).
3. **Complete trip** — `SIYL_JOURNEY.fullExperience()` becomes pure (no skip mutation while previewing) and returns, per
   stage, what it would select and why: the suggested product, a FALLBACK when the suggested room is full (the nearest rate
   is named as such), SOLD OUT when nothing has a place, KEPT for a stage the guest chose or the hosts' fixed arrangement.
   The preview drawer lists exactly that before "Add the complete trip"; after it, the panel says what was filled.
4. **Confirmation / email parity** — one test derives Review & Send, the guest email and the Guest Relations email from the
   same record for a full trip (all ten stages incl. MU9646 and the Kempinski nights), a host (the fixed Sathorn arrangement
   as "Arranged for you", never a priced line) and a decline; any surface that names a stage the others do not is a defect
   to fix in this release.
5. **The register from the Contacts sheet** — `src/guestlist-from-contacts.cjs` (data never committed): the sheet rows →
   parties by Couple code (COUPLnnn / SIGL), preferred name = Nickname or first name, full name = first + surname; existing
   guests keep their guestId and code (matched by name/nickname/surname; the known variants pinned by hand), new guests get
   G050+ and new codes, guests absent from the sheet or noted "Not Attend" become CANCELLED (code retired, row kept);
   placeholder rows ("No", a blank name, "her daughter") are reported, not invited. The hosts stay G048/G049 · INV-001
   (the FIXED allocation names them). `node src/build-invitations.cjs` rebuilds `register/*.json`; the report carries counts only.
6. **The clean reset** — a Guest-Relations-protected `POST /api/gr/reset` in the Worker (`x-gr-token`), two modes:
   `{ dryRun: true }` returns exactly what would be cleared (counts and ids of rooms holds, seat holds, draft actors, KV keys)
   without writing; `{ confirm: "RESET ALL GUEST STATE" }` clears, in this order: every non-fixed room occupancy (the FIXED
   list is configuration and is never stored), every seat hold (the seating geometry, open/frozen state stay), every draft
   actor (`draft` deleted, `seeded` kept true so the KV mirror never re-seeds) for every invitation the register knows plus
   every `draft:` mirror key, then KV `draft:` / `contact:` / `avatar:` / `reg:` (and `:prev:`) keys — after writing a full
   JSON backup of every value it deletes to a private file on the Owner's machine. It writes `reset:epoch` (ISO time).
   **Client**: `/api/draft` GET returns `resetAt`; `assets/draft.js` clears this device's journey keys once when the server's
   reset epoch is newer than the copy the device last saw (a device that never pulled but carries cached keys counts as
   older) — so no phone or laptop of the hosts can push its old trip back after the reset. Invitations, codes, the register,
   the seating configuration, the inventory definitions and the FIXED arrangement are never touched.
7. **Tests** — unit: Question 5 gone, flavor intact, `fullExperience` pure + fallback words, parity, the reset op in the DOs
   (Miniflare-free: the classes run in-memory as today), the client epoch rule; E2E on fresh stages: the four existing suites,
   plus `2026-09-19-release-013/e2e.mjs`: participation matrix (eight scopes) in the browser, the whole-trip decline, the
   state machine per stage type (untouched→decline, selected→decline, decline→reconsider, A→B, stale line, delayed draft,
   sync), Complete trip (deterministic, a full suggested room → the named fallback, a sold-out stage said), flavour, header,
   Haruthai, the overlay scroll at 320/390/834 + iPhone Safari, the video (poster before ready, playing, reduced motion →
   poster, a missing source → poster, no layout shift, iPhone Safari), the reset (dry run → execute → zero) — all on
   synthetic guests of the stage, never on live.

## Order of operations

implement → unit + gates → E2E on fresh stages → Codex final review of the complete diff → fix → confirming pass →
merge to `main` (the Owner's Workers Build deploys the Worker with the new register) → parity proof → **the live reset**
(dry run recorded, then execute, then the independent zero-count verification through the GR read APIs and `kv key list`) →
read-only live acceptance → the final report. Nothing is written on live with a synthetic guest; the reset itself is the
one Owner-authorised write.
