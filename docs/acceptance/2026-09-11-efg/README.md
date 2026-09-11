# E · F · G — rendered acceptance (2026-09-11)

Walk: `node docs/acceptance/2026-09-11-efg/walk.mjs [origin] [outdir]` — 36 checks, PASS locally,
on Cloudflare and on GitHub Pages. Frames at 390 · 834 · 1440 · 1920.

## Frame kinds
- `production-*` what the live surfaces show today: INV-002 eligibility UNRESOLVED (no offering,
  no price, no action), seating NOT OPEN YET per named guest.
- `injected-*` E for an eligible pair and for NONE — the eligibility is written into the walk's
  session only; the production bundle is untouched.
- `mock-*` F and G against a mocked Worker: RECEIVED then CONFIRMED; the TEST/FIXTURE geometry,
  open then frozen. Nothing is written to production, no email is sent.
- Element crops hold the sticky bars still; full pages are scrolled first so lazy images load.

## Adversarial pass (independent reviewer opening the PNGs) — outcome
Fixed: the plan scrolling sideways at 390 without a cue (now a "Swipe to see the whole plan" line and
the plan opens on the guest's own chair); the legend not following the person chosen for (now
"Steffie's chair" / "Peggy's chair"); hover indistinguishable from the party chair (hover is a tint,
the party swatch carries its ring); seat codes as the only description (now "Right side · row 3 ·
chair 2" with the id beside it, on the status line, on Review and on the card); the USD 30 couple
total missing on Review (one "Sangkhathan · one decision for your party" row); "Not available yet"
reading as sold out with a "View & choose" link (silent row, no link); the confirmed block outside
the 860 column and with the selected border; "Choosing a seat for" while frozen (now "Seats for",
legend without "Available"); the confirmed card's accent on open items (muted); copy nits.
Not changed: the header badge (site chrome, accepted carryover); A/B labels for the confirmation
(002 §S); the ceremony map left-anchored on the reading axis.

## Live origins (after e04bf4a)
- Cloudflare Worker version 37692738-92a0-4176-bcd3-c25df2962a3c · seating object migrated (v2) ·
  GR_TOKEN set as a Worker secret · walk 36/36 · `results-live-cloudflare.json` · `90-cf-*`
- GitHub Pages built from e04bf4a · walk 36/36 · `results-live-github-pages.json` · `91-gh-*`
- Byte parity on both origins: prep.css, prep-shell.js, guest.js, temple.js, seating.js, confirm.js,
  invite.mjs, the six step pages, invitations.enc.json.
- Live smoke (reads only, no confirmation performed): status 200 · bad id 400 · confirm without
  token 401 · wrong token 401 · GET 405 · seating select while not open 423 · state without token
  401 · forged x-gr-verified 401 · seating read: unconfigured, not open.
- Note: /api/status for INV-002 reports RECEIVED (a registration stored on 2026-09-09 during an
  earlier live acceptance); step 06 therefore shows JOURNEY RECEIVED on the live site. Not confirmed.

## Owner source truth still outstanding (externalised, never invented)
- E · givingEligibility (PAIR / NONE) unresolved for every active invitation:
  INV-002 · INV-003 · INV-004 · INV-005 · INV-006 · INV-007 · INV-008 · INV-009 · INV-010 · INV-011 · INV-012 · INV-013 · INV-014 · INV-016 · INV-017 · INV-018 · INV-019 · INV-020 · INV-021 · INV-022 · INV-023 · INV-024 · INV-025 · INV-026 · INV-027
  Set `"givingEligibility": "PAIR"|"NONE"` in src/guestlist.private.json and run
  `node src/build-invitations.cjs` (tokens are stable).
- G · ceremony row geometry and family chair ids; dinner family positions; the opening decision.
  Upload with `node src/gr.cjs seating-config geometry.json`, open with `seating-state --open true`.
- F · nothing outstanding: Guest Relations confirms with `node src/gr.cjs confirm INV-xxx --actor "…"`.
