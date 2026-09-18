# Release 011 — FINAL INTEGRATED GUEST RELEASE (Owner, 18 Sep 2026)

One combined pass, deployed as one release to the one runtime (the Cloudflare Worker `seeyouinlaos-website`). This
folder is the evidence: the stage run (`stage/`, the isolated Miniflare worker with synthetic guests only) and the
live run (`live/`, read-only and controlled, written after the deploy). Nothing here names a real guest, a code or a
private record.

## What the release contains

| Section | What changed | Where |
|---|---|---|
| A · Edit 5 | Watermarked photographs replaced from the Owner's Drive originals at the same crops (Moo Yoo, LV Visionary, Let's Relax, River Moon, Lao Derm); Dusit, Kaogee and Bar Us recomposed; IGNIV removed everywhere; Le Du Kaan, Lao National Museum, Traditional Lao Silk Residence and Lao Art Museum added with the Operations Master's text; Private Residence up to four guests; the Grand Majestic, Solarium and the Lijiang View Suite open again | `assets/experiences.js`, `src/experience-galleries.json` → `assets/experience-galleries.js`, `src/experience-inventory.json`, `assets/images/experiences/`, `assets/images/ASSET-MAP.md`, `src/inventory-seed.js`, `assets/rooms-data.js` |
| A · Haruthai / Suthep | The Sathorn Penthouse Room A is a fixed arrangement (`fixed`, never a hold in `mine`): shown under Arranged for you, never in the Bag, never removable, never charged, never required, never blocking; the other Bangkok addresses stay open to the hosts beside it | `src/rooms.js`, `src/worker.js`, `src/drafts.js`, `src/mail-templates.js`, `assets/rooms.js`, `assets/stay.js`, `assets/arranged.js`, `assets/journey.js`, `your-journey.html` |
| B · About You | My Favorite Flavor — one of exactly Coffee · Milk · Butter · Pandan · Matcha Green Tea · Strawberry Milk (a radiogroup); an older snack answer migrates only when it is one of the six | `assets/guest.js`, `about-you.html`, `assets/invite.mjs` |
| C · View all steps | A fixed panel below the shell that scrolls on its own; the page is locked behind it and comes back exactly; the step bar stays above its scrim (Save and View all steps remain tappable — found on iPhone Safari during this pass) | `assets/prep.css`, `assets/prep-shell.js` |
| D–J · Participation | "Where will you join us?" at the start of step 02 (Bangkok · Vientiane · China, I'll join all, I won't be joining this trip); the relevant stages only; excluded steps read Not joining; readiness follows; Not joining this stage is one direct action from any state (release first, then decline; Reconsider returns); tickets, seats, passes and the Sangkhathan follow attendance through the guest's own engine calls; the payload and both emails carry the answer | `assets/guest.js`, `assets/journey.js`, `assets/draft.js` (the pull no longer overwrites a local decision), `your-journey.html`, `wedding.html`, `wedding-preparation.html`, `tickets.html`, `profile.html`, `review.html`, `src/mail-templates.js` |
| K · Aman header | One band: menu · wordmark · bag; the account navigation (Signed in · name · My Trip · My Profile · Sign out) lives in the menu drawer; breathing room below | every page, `assets/aman.js`, `assets/aman.css`, `assets/recon.js`, `assets/recon.css`, `assets/invite.mjs` |
| L · Bangkok card clip | The poster-first, silent, local, motion-safe clip mechanism (`SIYL_AMAN.video`) and the release gate V1; **the Owner's clip could not be retrieved** — see below | `assets/aman.js`, `assets/aman.css`, `src/release-check.cjs` |
| M · Retired GitHub Pages | `_config.yml` and `register-landing.html` deleted; every mirror comment rewritten; gate R1 keeps `_config.yml`, `register-landing.html`, `CNAME`, `.nojekyll` and a Pages workflow out | `src/release-check.cjs`, `src/worker.js`, `assets/confirm.js`, `assets/rooms.js`, `assets/seating.js`, `assets/prep-shell.js`, `register/data.mjs`, `journey/README.md` |

Standing constraints kept: one runtime, no infrastructure change (`infra/PRODUCTION.json` untouched, gate I1 green), no
binding, secret, DNS or domain change, guest data untouched, synthetic guests only in every test.

## The Bangkok card clip — status

The Owner's file (`copy_247B8DD5-3003-4095-8108-FE35E850AF5D.mov`, Drive id `1IcZINAoYyc5iG6vpTkf0JhmcTaLbBRXr`,
10,339,106 bytes, HEVC 720 × 1280, 15 s, private to the Owner's account) could not be retrieved through the Drive
connector available to this session: every download above about 7 MB ends in "MCP server session expired" (three
attempts for this file today, one for an 8.6 MB photograph; all fourteen files of 6 MB or less downloaded). No local
copy exists on this machine, no other reachable copy was found, nothing was hotlinked and nothing was invented. The
mechanism is complete and proven with a synthetic one-second clip on the stage (`stage/clip-plays.jpg`,
`stage/clip-reduced.jpg`, `stage/clip-broken.jpg`) and in unit tests; the destination card ships as its photograph
until the clip can be encoded (H.264 yuv420p, faststart, no audio, ≤ 4.5 MB, `assets/video/bangkok-card.mp4`,
`data-video` on the card — gate V1 verifies the file facts).

## Stage run (synthetic guests, fresh Miniflare state)

- `npm test` — 343 / 343 (`stage/npm-test.log`); `npm run release-check` — 24 / 24 gates (V1 new, R1 rewritten, I1 intact).
- `node docs/acceptance/2026-09-18-release-011/e2e.mjs` — 49 / 49 (`stage/e2e.json`): the header at 320 / 390 / 834 / 1440;
  the participation question first; Bangkok + Vientiane; persistence through the server draft; Not joining from an
  untouched stage, a selected train and a held U Sathorn room (the engine released first); Reconsider; tickets follow
  attendance (Cleo's Heritage room and both seats released, Ben's room untouched; the tickets and wedding pages say so);
  the full decline path to a sent trip; partial attendance (Bangkok + Vientiane, then China only) on Review & Send;
  Haruthai's arrangement (not required, another address chosen and removed, USD 0); My Favorite Flavor on About You and
  Review & Send; View all steps on iPhone Safari (WebKit, 390 × 600) and Chromium at 320 / 390 / 834, three times each;
  the four Edit 5 pages, IGNIV gone; the card clip (plays, reduced motion, a broken source); ten pages at four widths
  without horizontal overflow; no script or console error.
- `node docs/acceptance/2026-09-17-p0-empty-bag/e2e.mjs` — 49 / 49 (`stage/p0-empty-bag.log`; the two host checks now
  read the Edit 5 contract).
- `node docs/acceptance/2026-09-18-account-ia/e2e.mjs` — 33 / 33 (`stage/account-ia.log`; My Profile is opened from the drawer).
- `node docs/acceptance/2026-09-18-aman-geometry/shell-scroll.mjs` — 320 checks · 0 failures (`stage/shell-scroll.log`).

Found and fixed during the stage run (each is a regression now): the drawer's account block was filled before the drawer
existed (`siyl:menu` hand-off); the seats were not released on My Trip when the seating ledger had not been read there;
a chosen Bangkok stay offered no "Not joining this stage"; the steps scrim covered the step bar's own controls.

## Codex final pass (docs/review/012-codex-final-011)

Three passes on the complete diff: 5 + 4 + 2 = 11 findings, every one VALID (3 × P1, 8 × P2), every one fixed and pinned
before the deploy; the third pass states "No defensible P0/P1 [high] remains". Notable: a failed release never sends
(readiness names what is still held outside the trip; "Release again"); a guest not joining Vientiane sends no wedding
attendance and no offering; one reconciliation at a time; the first draft read replays only the live edit onto the
fetched copy (the Bag line by line, the participation answer whole). After the passes: `npm test` **354 / 354**,
release-check **24 gates**, stage E2E release-011 **52 / 52**, P0 Empty Bag **49 / 49**, account IA **33 / 33**, sticky
shell **320 · 0**.

## Live (18 Sep 2026, the ONE runtime — the Cloudflare Worker `seeyouinlaos-website`)

- main `826afaf` (fast-forward of `release-011`, PR #6 as the review surface). Rollback: deployment version
  `15c2d877-9c61-4787-9b01-b3e3b0a84414` (main `f54f4bf`, release 010 + the Codex confirming fixes) — `npx wrangler
  rollback` to it, or a push of `f54f4bf` through the Owner's release path.
- **The Owner's release path acted first:** the push of main triggered the Cloudflare **Workers Build** (docs/DEPLOYMENT.md:
  "GitHub → Cloudflare Workers Build, builds on push to main"), which deployed main as version `3b5f8626-cfec-47ca-9b92-f76015b90e4c`
  at 20:13:00 UTC — 58 seconds after the controlled version A of this session (`8af852aa`, with the temporary synthetic
  register) and therefore superseding it before the edge had served it. The controlled flow was then run on a second A
  without any push.
- **A** `5dfc7c21-c8a3-428f-aeb3-463707d19710` — main plus three temporary synthetic invitations (T001 Ada · T002 Ben ·
  T003 Cleo; codes in the scratchpad only, never printed, never committed; no seat held on the live ledger, no host pair,
  nothing sent to Guest Relations): `LIVE=1 e2e.mjs` **48 / 48** (`live/live-e2e-A-synthetic.json`) — the header at four
  widths, the question first, Bangkok + Vientiane persisted through the live Drafts DO, Not joining from an untouched
  stage, a selected train and a room held in the live Rooms engine (released first), Reconsider, tickets follow attendance
  (Cleo's Heritage room released, Ben's untouched), one reconciliation at a time (one `leave`), a release aborted on purpose
  then "Release again", the full decline path to an enabled send, partial attendance on Review & Send, My Favorite Flavor,
  View all steps on iPhone Safari (WebKit) and Chromium at 320 / 390 / 834, the four Edit 5 pages, the card clip
  mechanism with a synthetic clip, ten pages at four widths, no console error; `LIVE=1` account IA **32 / 32**
  (`live/live-account-ia-A.json`); sticky shell at 390 / 1440 **160 · 0** (`live/shell-scroll-A.log`).
- **B** `279be030-e9a4-40ad-8aab-f235654dcc94` — the final release: the real register only (47 entries; a made-up bearer
  answers 401). Proven equal to main `826afaf` **file by file** (every page, every module, the register, the Edit 5
  photographs: 101 / 101 byte-identical). Read-only: release-009 `live-verify.mjs` **54 / 54** (`live/live-verify-B-final.json`,
  the header and drawer checks rewritten for the Aman header) and `live-ro.mjs` **14 / 14** (`live/live-ro-B-final.json`:
  the retired Pages artifacts 404, github.io 404, IGNIV 404 and the four venues 200, private pages gated, eight public pages at
  four widths, iPhone Safari, the Bangkok card as its photograph, no console error). `node src/infra-guard.cjs --live`: intact.
- KV cleanup after B: `draft:` and `contact:` of `INV-T001 / T002 / T003` deleted; no `avatar:` or `reg:` key of a synthetic
  guest exists. The Rooms engine holds of the synthetic guests were released by the run itself.
- Found during the live run and fixed in the E2E only: the live Drafts store refuses a reset made of nulls ("nothing to
  save") — the cleanup now writes empty values.
