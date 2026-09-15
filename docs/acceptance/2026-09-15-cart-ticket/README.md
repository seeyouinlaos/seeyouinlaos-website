# 002 — Follow-up correction pack · cart + ticket system + source-truth update (Owner, 15 Sep 2026)

The record of the pack: what changed, how it was verified, what production holds afterwards.
No access code appears here or in any file of this folder.

## What changed

**The cart** (`cart.html`, `assets/bag.js`) — one guest = one bag = one total. The bag icon opens the cart;
Step 02 remains the planner, Step 06 the final review. Lines are grouped (Accommodation · Transport · Wedding ·
Experiences & additions) and say DATE · ITEM NAME · CURRENT SELECTION · the guest's own price, with CHANGE
(the exact selector of that item) · REMOVE (the authoritative state: the bag, the badge, the sticky total, Review
& Send, the readiness engine; a stay releases its place on the rooms engine) · VIEW DETAILS. Words: YOUR BAG ·
YOUR TOTAL · REVIEW YOUR JOURNEY (to Review & Send when 01–05 are complete, otherwise COMPLETE THIS FIRST →
the first missing item). No quantity controls, no checkout / delivery / payment language.

**The travel pass** (`assets/travelpass.js`, `assets/vendor/qrcode.js` — MIT, Kazuhiko Arase — `assets/prep.css`)
— every transport leg is a ticket: both ends with the real codes and times, the date, the class, the guest, a
travel-pass reference `SYL-<leg>-XXXX` (a deterministic digest of guest · leg · class; never the access code,
never the invitation id) and a QR code that scans. The same ticket stands on Your Journey (transport stages, the
flight with its fares beneath), on the transport page beside the one decision, in the bag and on Review & Send
(the strip), and downloads as a PDF drawn by the shared writer (`assets/seatpass.js` → `writer`). The code
carries the reference, the guest's first name, the leg, the date, the class and the state — SELECTED / SENT /
CONFIRMED — and nothing secret. The pass is the guest's selection; the words say Guest Relations issues the
carrier's ticket. Seats keep no code.

**Source truth** — C86 · Kunming → Lijiang = USD 105 per person in `assets/pricing.js`, `journeys.html`,
`register/data.mjs`, every surface reading them, the sent text and the tests (canonical Full Experience
2,175; no mixed amount remains). RUN A = POOLSIDE: `src/seating.js` defaults `dinner.poolSide` to `'T'` (run
A) — null returns to the default, Guest Relations may still record `B` — and `assets/seating.js` draws the
water as a calm band along run A with "SWIMMING POOL", "RUN A · 25 PLACES · POOLSIDE", "RUN B · 25 PLACES ·
OPPOSITE THE POOL"; `describe()` says "Long table · run A · Poolside · place N"; the note reads "Run A sits
beside the swimming pool; run B faces it across the table." The "to be confirmed" wording is gone.

## Evidence
- `npm test` 251/251 (13 files + `test/travelpass.test.mjs`) · `node src/release-check.cjs` 21/21.
- `walk.mjs` — the browser walk of the Owner's list J (a host, then a guest who is not a host): 40/40
  locally against the Miniflare Worker as Haruthai + Peggy (`local/`) and 40/40 on production as Suthep +
  Peggy (`live/`); the C86 code on the page is rasterised and read back by an independent decoder (jsQR) —
  see the H3 line; the downloaded PDF is kept as `live/travel-pass-c86-sample.pdf`; screenshots at 390 px and
  1280 px.
- The 14 Sep four-identity walk re-run locally on this build: 63/63 (no regression).
- Parity Worker ↔ Pages on the full public file list, 264/264 (`parity-files.txt`; the two new files included).

## Production afterwards
Haruthai's invitation was in live use when the pack went live: a journey sent from it at 02:33:12 UTC on
15 Sep (six room places on the engine, the migrated seat B16) — not test data of this pack. A first live run
of the walk as Haruthai replaced that record and moved her seat; both were put back exactly (the Worker keeps
the superseded version under `:prev:`, restored as current with its own stamp; the seat re-selected with her
own bearer) before the walk was re-run as Suthep. Suthep's walk registration was removed and his seat put back
to B15. The 14 Sep walk was therefore not re-run on production this time (its restore would remove that live
record). Final ledgers: registrations INV-G048 only (02:33:12 UTC); seats C-R-02-02 G002 · C-R-02-03 G001 ·
D-B-13 G001 · D-B-14 G002 · D-B-15 G049 · D-B-16 G048; six room places for G048; seating OPEN, run A poolside
recorded explicitly (`seating-state --pool T`).
