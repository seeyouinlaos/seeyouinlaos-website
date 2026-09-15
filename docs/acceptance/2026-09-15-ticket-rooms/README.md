# Owner corrections, 15 Sep 2026 — ticket redesign · room inventory · Step 05

Two Owner packs applied together. No access code appears here or in any file of this folder.

## TICKET = TICKET · CART = CART · REVIEW = REVIEW
- **The seat ticket** (`assets/seatpass.js`): a genuine ticket — a framed body with a header (wordmark ·
  SEAT TICKET), the event with date, time and venue, the guest / seat / status / held-for row, a foot, and a
  stub torn off along a perforation that carries the ticket reference (`SYL-TC-E4-XXXX` / `SYL-WD-B16-XXXX`,
  the ledger's own digest; a fixed front-centre position gets `SYL-TC-FC-XXXX`), a QR code (reference, first
  name, event, date · time, seat words, state — never a code, id or bearer), the state and "Scan at the door".
  On paper the same composition (PDF 1.4, base-14 fonts, no images): one ticket per event on an A4 page, the
  page title well inside the safe area, the download stamp on every ticket and on the page. On screen the same
  grammar as a card (`SIYL_SEATPASS.card`), on Step 04 ("Your wedding seats") and on the tickets page.
- **The travel pass** (`assets/travelpass.js`): redrawn on the shared ticket frame — header, operator and leg,
  the two ends with codes and times, the line with the duration, the guest / class / date / your-cost facts, a
  foot with the state, and the stub with the QR, the reference, the state and the leg.
- **The writer** (`SIYL_SEATPASS.writer`): rounded frames, perforations, notches, QR modules, `fit` and `wrap`,
  and `within()` — every drawn thing is recorded and a test proves nothing leaves the page's safe area (40 pt).
- **tickets.html** (new, "Your tickets"): every seat ticket and travel pass of the guest together, each with its
  reference and code, each downloadable; linked from Review & Send, Step 04, The Wedding and the footer menu.
- **The cart** carries no code, no reference, no QR, no pass strip — lines, CHANGE / REMOVE / VIEW DETAILS,
  the total, REVIEW YOUR JOURNEY. **Review & Send** carries none either and links to the tickets. The sent
  text still names the travel-pass reference per leg for Guest Relations' record.

## ROOMS — no pre-reserved rooms, the physical count is the inventory
- `src/rooms.js`: `mayJoin` opens every unit to every authenticated guest; no unit carries `reservedFor`; the
  seed's historical `held` / `heldFor` notes stay for the record and shape nothing; the category summary is
  derived from its units (`free` = unused places, `rooms` = units with a place left).
- `src/inventory-seed.js`: the Sathorn Penthouse is six bedrooms — `unit:'room', capacity: 6` → Room A – F,
  twelve places, never more. The private residence stays one property that sleeps six (the source says so).
- The browser: `assets/pricing.js` no longer holds any room back (`eligible` is true, presets choose from the
  whole inventory), `assets/rooms-data.js` keeps the Master's notes as `legacyNote` only, `assets/rooms.js`
  words are derived from the rooms ("2 rooms · 3 places available", "Fully booked", "Your place is held ·
  Room A" only for a real allocation), the room page lists every physical room with its two places, the
  journeys rows and Your Journey carry no reservation state.
- **The audit** (`src/rooms-audit.mjs`): 40 categories · 176 units · 351 places; units = source room count
  for every category; places = rooms × 2 (singles × 1; a property what it sleeps); the Penthouse exactly
  A – F / 12. The private run (names) stays out of the repository; the invariant held before release.

## STEP 05 — every visible question is required
- `assets/guest.js`: the six favourites carry `required: true`; `profileMissing()` names each unanswered one
  (`02 · Coffee or tea` → `about-you.html#q-coffeetea`); a blank never counts; `aboutMissing()` = allergy +
  questions + photography. `about-you.html`: "Required" / "✓ Complete" per question, `aria-required`,
  `aria-invalid`, the section state, immediate readiness on each answer. Review & Send names an unanswered
  question with "Complete this". Documents (and the separate publication choice) stay optional.

## Evidence
- `npm test` 251/251 (rooms, eligibility→inventory, flow, seating-labels, travelpass rewritten for the new
  rules; PDF geometry tests) · `node src/release-check.cjs` 21/21 (gate 2b now pins the no-reservation rule
  and the six-bedroom Penthouse).
- `walk.mjs` (this folder): 35/35 locally (`local/`) — rooms (Room A: host → guest joins the same room →
  FULL → a third guest refused, no Room B; the Penthouse A – F / 12 on the room page; category words from the
  rooms), Step 05 (Required, readiness naming the question, Continue blocked and focusing it, View All Steps,
  a blank never counts, answers complete at once), tickets (seat tickets matching the ledger's references, the
  PDFs framed with the codes, the tickets page, nothing clipped at 320 / 390 / 1280 px, the cart and Review
  without codes). **Live: 34/34 on production** (`live/`) — the Owner's own live place in Room A of the
  Presidential (Haruthai) was left exactly as it is; Suthep, on his own code, saw "Haruthai · 1 place
  available", joined the same room → FULL; a third guest was refused with "full" and Room B does not exist;
  the Penthouse reads Room A – F · 12 places on the live engine. Suthep's test place was released at the end;
  rooms, seats and registrations were proven identical before and after (no registration was sent).
- `rooms-audit.txt`: the audit against the live engine after the deploy — 40 categories, 176 units, 351
  places, the invariant holding for every category, the Penthouse A – F / 12, no reservation anywhere.
- The 14 Sep walk 63/63 locally and the cart/ticket walk 41/41 locally, both updated to the new rules.

## Addendum — cart price source of truth · Sühring featured navigation (same release)
- The Owner's screenshot showed a C86 line at USD 85 above "USD 105 per person": the bag line had been saved
  before the price changed and the cart printed the saved amount. Root cause fixed in `assets/pricing.js`
  (`repriceFlat`): every flat product line — the train, the flights (chosen class kept), C86, the Sangkhathan,
  the Sühring table — is re-derived from the one pricing source on every load (amount, name, words, picture;
  the guest's flags kept), so the line, its words, the badge, the sticky bar, Your Journey, the bag, Review &
  Send and the sent journey read one amount: `SIYL_BAG.total()` over authoritative lines. `assets/bag.js`
  no longer claims a retired product keeps its amount. Regression: `test/travelpass.test.mjs` "ONE PRICE
  SOURCE" (85 → 105 on load, descriptive line, total, −105 / +105, every surface reads the same line and
  total, no C86 amount of its own on any surface); the walk's T6 seeds a stale 85 and reads USD 105 and a
  total equal to the engine's.
- Sühring featured: a featured section on Experiences beside 1872 and "Sühring · Lunch" in the footer menu.
