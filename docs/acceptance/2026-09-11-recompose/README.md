# D · Recompose all six Preparation surfaces — rendered acceptance (2026-09-11)

Walk: `node docs/acceptance/2026-09-11-recompose/walk.mjs [origin] [outdir]`
Invitation: INV-002 · Peggy & Steffie (real code, real bundle). Widths 390 · 834 · 1440 · 1920.
Result: `results.json` — 39 checks, all PASS, no page errors, no horizontal overflow, two type
families only, every control ≥44px, tap targets read back from the DOM.

## Frames (state → file prefix), each at the four widths
- 01-invitation-peggy · 02-journey-sathorn / -u-sathorn / -shama (+ `-stage` crops) ·
  02-journey-mu9646-business / -economy (+ `-stage`) · 02-journey-c86 (+ `-stage`) ·
  02-journey-wedding (+ `-block`)
- 03-wedding-peggy (+ `03-wedding-temple`) · 03-wedding-peggy-for-steffie (+ `03-wedding-steffie-row`)
- 04-preparation-peggy (+ `-ack`, `04-preparation-seating`) · 04-switch-person-390 · 04-preparation-steffie (+ `-ack`)
- 05-about-profile (+ `05-about-hospitality`, `-accessibility`, `-documents`, `-privacy`) ·
  05-about-for-steffie (+ `05-about-privacy-for-steffie`)
- 06-review (+ `06-review-journey`, `-wedding`, `-documents`, `-costs`)
- 07-view-all-steps · 08-switch-person-390

## Capture notes
- Full-page frames are taken after scrolling the whole page, so lazily loaded photographs
  (the dress rails) are present. Element crops hold the sticky shell and the fixed journey bar
  still, so the state under inspection is unobstructed.
- The narrower phone widths 320 / 375 / 430 were swept separately on all six surfaces: no
  overflow, no type under 10px.

## Adversarial pass (three independent reviewers opening the PNGs) — outcome
Fixed: stay-card price shrunk by the public carousel's element rule; "Selected for your journey"
repeated up to three times per product; status echo under a pressed control on step 03; the
Bangkok rail and the chronology indented by a desktop label column while Review, costs and the
foot sat in the 860 column (now one 860 column on every step, every block, every band); the
"Complete wedding decisions" navigation wearing the pressed geometry; the "1 of 8" counter in
the name selector; a checkbox stretched by the field rule; the About You operational intro
repeated as the field's why; "Publication ·" label wrapping; Review dash walls (only answers that
exist are listed), the MU9646 basis stated for the wrong class, price stated three times per
line, two task-board cards below the total (now one card, only open items, open stages folded
into their step), engineering vocabulary in guest copy, the eyebrow date on step 04, the
duplicated switch instruction, "Not open yet" three times.
Not changed, by the frozen spec or an earlier acceptance: the display title under the shell on
every step (002 §11 prescribes "THE WEDDING / Sunday, 28 February 2027 / Vientiane");
"Your invitation · INV-002" (002 §B); the one-line dress reminder per event on step 03
(002 §I: "one concise event reminder"); the site header badge and the editorial footer (site
chrome, unchanged since A+B); VIEW ALL STEPS geometry (A+B shell); the rail's focused-but-
unselected card at full strength with a solid action (A+B: visual focus ≠ selected); per-person
amounts and "× 1 guest" (pricing presentation, out of D's scope); Steffie's Sangkhathan
"Not applicable" before her Temple answer (temple.js semantics).

## Live origins (after 72aff66)
- Cloudflare `https://seeyouinlaos-website.suthep-hrg.workers.dev` · Worker version 63b7c647-a08e-454c-b04e-76c3c50fd1b2 · walk 39/39 · `results-live-cloudflare.json` · frames `90-cf-*`
- GitHub Pages `https://seeyouinlaos.github.io/seeyouinlaos-website` · build of 72aff66 · walk 39/39 · `results-live-github-pages.json` · frames `91-gh-*`
- Byte parity: prep.css · prep-shell.js · journey.js · guest.js · the six step pages — identical to HEAD on both origins.
