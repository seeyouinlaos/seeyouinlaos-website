# SITE REPORT — One Open Travel Shop (Auth · Variants · Marsilea · Review & Send)

```text
FINAL COMMIT
  (this commit — SITE-REPORT.md + acceptance screenshots)
  b785dee  GH Pages mirror fix: Jekyll 3 exclude start_with? swallowed journeys.html
  6639b9d  One open travel shop: real invitation auth (engine crypto), variant
           selectors, Marsilea Spa, Review & Send

DEPLOYED REVISION
  Cloudflare Worker : https://seeyouinlaos-website.suthep-hrg.workers.dev
                      Version 0c64451a-5902-490c-bdb4-03eb207107b8
  GitHub Pages      : https://seeyouinlaos.github.io/seeyouinlaos-website/
  Parity            : 14/14 files verified curl+shasum — Worker == GH Pages == git
                      (journeys, marsilea, review, tea, your-journey, index,
                      destination, voyage, 1872, invite.mjs, shop-menu.js,
                      bag.js, recon.js, siyl-i18n.js) · legacy /journey/ = 404
  Tests / Gates     : 73/73 registration tests PASS · 17/17 release gates PASS

STATUS
  DEPLOYED AND VERIFIED ON PRODUCTION PIXELS (390 px acceptance width)

PER-ITEM
  1 REAL AUTH ......................... DONE  assets/invite.mjs validates codes
        through register/crypto.mjs (AES-256-GCM lookup, invitations.enc.json).
        Valid code closes the overlay, stays on page, completes the interrupted
        Add, persists the auth flag (siyl.auth). Invalid code: quiet inline
        Guest Relations error. No code is ever rendered.
  2 register/ OUT OF CUSTOMER NAV ..... DONE  recon.js shell nav rebuilt (7 public
        items), shop pages share assets/shop-menu.js — zero register/ links;
        engine files untouched and still deployed for the auth lookup.
  3 VARIANT SELECTORS ................. DONE  Souphattra C (25–27 Feb) and D
        (27 Feb–01 Mar) independent, 7-row matrix 145/155/170/240/250/290/750;
        Grand Majestic = RESERVED FOR FAMILY, Presidential = RESERVED FOR
        BRIDE & GROOM (non-selectable). Kunming 4 × USD 150 (68 sqm names from
        data.mjs). Lijiang 5 variants 75/70/100/105/120, exact data.mjs names.
        Fixed-window per-person amounts, never ×nights. Selected variant flows
        into the bag line; the bag item price is the one calculation source
        (variant switch live-updates an existing line and the total).
  4 MARSILEA SPA PAGE ................. DONE  marsilea.html — 5th floor Souphattra
        Hotel Vientiane, 10:00–20:00, six categories / 17 treatments, texts,
        prices, durations and 9 etiquette entries copied EXACTLY from the
        MARSILEA object; owner spa photography; interest-only selection adds a
        price-less interest/request line — never a confirmed appointment.
  5 REVIEW & SEND ..................... DONE  review.html — hosted programme
        (Temple Ceremony · Coffee & Cake · Vow Ceremony · Wedding Dinner,
        HOSTED, never USD 0), bag lines with variants/quantities, Your Costs,
        auth-required Send through the existing POST /api/register Worker
        mechanism (verified live: 202, "Received and stored" quiet state;
        labelled email backup on failure).
  6 IMAGE-LED SURFACES ................ DONE  every placed image read and
        verified against its subject (city/event/souphattra/journey/marsilea).
        Vow Ceremony = green door only; Temple Ceremony image-light; Special
        Express keeps the deliberate "Photography to follow" standard (no
        verified train photo exists); 1872 flow preserved, integrated via the
        shared menu only.
  7 HARD RULES ........................ DONE  no date pickers · no "Enter the
        Journey" · no USD 0 for hosted · no package letters in UI · no Alms /
        Sacred Morning Ritual · C642 16:39→21:06 direct 4h27 Business USD 85
        priority ticketing · 1872 USD 180 for two, quantity-based · no Drive/
        Sheets touched · all values from data.mjs / app.mjs / the order.
  8 MOBILE 390 ........................ DONE  scripted overflow check on every
        capture: zero horizontal overflow; 44×44 targets on all controls.
  9 SCREENSHOTS ....................... DONE  15 production captures at 390 CSS px
        from the Worker URL, all reviewed (defect found and fixed: reserved
        room rows now stack their label; GH mirror 404 found and fixed).
 10 REPORT ............................ DONE  this file.

SCREENSHOTS  (docs/acceptance/2026-09-07-shop/ — excluded from deploy)
  01-home                       real hero + city imagery, real footer nav
  02-journeys-variants          full shop with all variant groups
  03-invitation-overlay         interrupted Add → real overlay
  04-authenticated-resume-add   valid code → Add completed on page, badge 1
  05-souphattra-variant-selected  Heritage Grand Premier USD 170 selected
  06-bag-total-lijiang-default  bag: 170 + Lijiang 75 (Snow Mountain Viewing)
  07-lijiang-variant-switched   Starry Sky USD 120 selected on Journeys
  08-bag-total-lijiang-switched live total moved 245 → 290 from the variant
  09-tea-added                  1872 tea, quantity 2, USD 360, real auth path
  10-marsilea                   full spa page (17 treatments, etiquette, contact)
  11-marsilea-interest-marked   90-minute Signature interest marked
  12-bag-multiple-categories    stay + Lijiang + tea + spa interest, USD 650
  13-bag-after-remove           tea removed, USD 290
  14-review-and-send            hosted programme + selections + Your Costs
  15-review-sent                real POST /api/register → "Received and stored"

BLOCKER
  NONE. Note only: a scripted acceptance submission (journey-shop selection,
  INV-002) now exists in REG_KV from the live Send verification; the previous
  record, if any, is preserved in the bounded :prev history. SendUserFile is
  not available in this session — screenshots are delivered in-repo under
  docs/acceptance/2026-09-07-shop/ instead.
```
