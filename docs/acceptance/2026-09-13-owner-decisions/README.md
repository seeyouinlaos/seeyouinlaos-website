# Owner decisions of 13 September 2026 — implementation record

Applied to the accepted 002 system in three commits on `main` after the FINAL RUN's `ce462d7` /
`eb1d165`: `7431761` (first decision set), `0b8ff2d` (fifty bookable dinner chairs, the couple
as INV-001) and **`72d9e15`** (the Sangkhathan offered to every active party). One stream, no subagent, no MCP beyond the
Owner's Google Drive folder read. The only accepted-stage element altered is the G dinner
geometry, where the Owner's explicit decision supersedes the fixed Bride/Groom positions.

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

> **Final correction (0b8ff2d).** The first pass had kept the accepted G dinner of 24 + 24 guest
> chairs plus BRIDE and GROOM as fixed central positions. The Owner ruled that nobody — the
> couple included — has a technically preassigned seat. The dinner is now **TOP 25 + BOTTOM 25 =
> 50 bookable chairs**, no fixed position, no family chair; the couple book two of the fifty
> themselves, first. The ledger contract (`src/seating.js` RULES/CAPACITY, ids `D-T-01..25` /
> `D-B-01..25`), the renderer, gate P11, the fixture, the tests, the E/F/G walk mock and the
> smoke all carry the new truth; the old 24 + 24 geometry is now *rejected* by
> `validateGeometry`. Production was re-configured through the GR route at 10:12 UTC and stays
> OPEN. The couple exist as party **INV-001 · Haruthai & Suthep** — one shared code (private
> register only), guests G048 (party lead) and G049 — and the real booking flow was proven with
> it on production (`booking-test.mjs`, 10/10) and then every chair given back, so the ledger is
> clean (100 available, held 0) for the couple to book their real chairs.

## 1 · Invitation / guest code model — already the accepted model, unchanged
One access code per invitation (party): the private register carries one token per
`invitationId` (26 parties, INV-002…INV-027); INV-002 is *Peggy & Steffie*, one code, two
guests (G001, G002). After sign-in the party holds its guests; state and actions stay separated
through the existing `invitationId` / party / `activeGuestId` / `subjectGuestId` model
(`assets/guest.js`, gate P9). A single-person invitation has its own code. No per-person code
exists or was added. **INV-002 not rotated.**

## 2 · Seating engine — OPEN on production
`node src/gr.cjs seating-config seating-geometry.json` then `seating-state --open true
--frozen false`, through the GR-token-protected route only. Production plan (after 0b8ff2d and
the 10:12 UTC re-configuration): `open:true, frozen:false`, ceremony 50/50 available, dinner
50/50 available, held 0, allocated 0, family 0, nothing fixed. Guest access is unchanged: the
seating surface sits behind the invitation-code sign-in exactly as before; nothing about
authentication was loosened (the guest routes `select`/`release` carry the same invitation-id
model as `/api/register`, accepted at F/G).

`seating-geometry.json` (this directory) is the uploaded configuration — the Owner geometry:
ceremony `C-L-01..10-01..02` (20) + `C-R-01..10-01..03` (30) = 50; dinner `D-T-01..25` +
`D-B-01..25` = 50 bookable chairs, 50 people. It is a record of what Guest Relations uploaded,
not geometry in code.

## 3 · No preassigned FAMILY seat ids
Zero `family` flags in the uploaded geometry: no chair is RESERVED · FAMILY anywhere. The
ledger's `family` validation option remains in `src/seating.js`, unused, for a future explicit
decision (removing it would reopen G for no behavioural gain). The guest legend now lists the
family state only where the plan actually carries such a chair (`assets/seating.js`
`hasFamily` / `legend`; pinned in `test/efg.test.mjs`). Headers of both files record the
decision. The "FAMILY ids unresolved" Owner dependency is closed.

**Operational sequence, as decided:** A engine OPEN (done) → B the couple sign in and book
first → C hosts/family/VIPs likewise → D a held chair is unavailable to the next guest (the
ledger already does this) → E codes go out to the remaining guests.

**Step B — the couple as a normal party (done at 0b8ff2d).** `INV-001 · Haruthai & Suthep`
was added to `src/guestlist.private.json` under the accepted party-code model: one shared code,
two guests with the next free ids of the existing convention (G048 Haruthai Amphai, party lead;
G049 Suthep Thongantang), `givingEligibility` unset like every other party. The token register
gained one line; every existing token is unchanged; `register/invitations.enc.json` was rebuilt
(26 active invitations). The code lives only in the gitignored register — it appears in no
document, log, commit or artefact. Any host or VIP who is to book before the codes go out needs
the same kind of entry (Owner data).

**The real booking flow, proven with INV-001 on production** (`booking-test.mjs`,
`booking-test-results.json`, 10/10): one code signs in a party of two; seating is open with 100
chairs and nothing fixed; Haruthai holds a ceremony chair and a dinner chair through the UI and
the ledger records them in her name; Suthep cannot take her chair (not selectable in the UI, 409
`taken` from the API); another party (INV-002) is refused the same chair and sees it only as
*taken*, without a name; Suthep holds his own two; a change holds the new chair first and
releases the old; every chair is then given back through the UI. Ledger after: 100 available,
held 0 — ready for Haruthai and Suthep to book their real chairs, first.

## 4 · Who may book — the accepted rule, unchanged
Any guest of an authenticated invitation/party may hold a chair while seating is OPEN and not
FROZEN; a chair already held is refused (`taken`); at most six chairs per invitation; a chair
Guest Relations allocated cannot be self-changed. **No confirmed-attendance prerequisite
exists in the accepted code or the accepted G documentation, so none was added or removed.**
No contradiction found on this point.

## 5 · Wedding Dinner imagery — the Owner's set, all ten mapped, six placed
Source: Google Drive folder `056 - Event - Wedding Dinner`
(`1rLttJkzr3iuQgVBsmGppMmD4my3LfVM3`), 10 files, all downloaded byte-exact through the
Drive connector and converted to the site's convention (JPEG, long edge ≤ 2000). Two were
already in the repository byte-for-byte (`053-wedding-dinner-sharing-menu.jpg`,
`053-wedding-dinner-garden-terrace.jpg`, unreferenced since the Haruthai pass); eight are new.
All ten are recorded in `assets/images/ASSET-MAP.md` under a new "Drive C" source.

Placed on `voyage.html` §04 in the page's existing grammar — the same shape the Temple
Ceremony uses (pair → duo → band → duo), no new layout:
| Slot | File | What it shows |
|---|---|---|
| lead `a-pair` (portrait) | `053-wedding-dinner-courtyard-from-above.jpg` | the courtyard garden from above |
| `a-duo` | `053-wedding-dinner-sharing-menu.jpg` + `-sharing-menu-table.jpg` | the Chinese sharing menu, steamers / at the table |
| `a-band` | `053-wedding-dinner-courtyard-wide.jpg` | the courtyard garden, wide |
| `a-duo` | `053-wedding-dinner-courtyard-gallery-view.jpg` + `-courtyard-villa.jpg` | from the upper gallery / the heritage villa |

Mapped, not placed: `-garden-terrace` (1024 px, below the frame resolution), `-courtyard-
loungers`, `-courtyard-across-the-water` (near-duplicates of the wide view), `-sharing-menu-
portrait` (a screen capture of the same subject as the two originals). The placeholder and its
page-local CSS are gone. The fountain file `053-wedding-dinner-courtyard-garden.jpg` — from the
hotel folder, never referenced, banned from the page by gate P8 — is deleted.

**Supersession recorded:** the Haruthai pass (91c52ad) had retired the terrace and dim-sum
photographs and pinned a clean placeholder "until a long-table photograph exists"
(`test/pricing.test.mjs`). The Owner's 13 Sep decision names folder 056 — which holds those very
photographs and no long-table photograph — as the authoritative set and forbids a single image or
a placeholder; the pin now asserts the new decision (several images from the set, lead = the
courtyard, the menu as a pair, no placeholder, fountain retired). Gate P8 (no fountain, no pool
narrative on the page) still passes; no aria-label or file name uses the word.

Rendered check: all six load (200) on local, Worker and Pages; frames at 1280 and 390 px, no
horizontal overflow; page reviewed once at both widths.

## 6 · DOCS binding — DISABLED by Owner decision (13 Sep 2026)
Kept exactly as it is: no R2 bucket created or bound, no passport or flight-document storage,
the NOT PROVIDED behaviour unchanged. A separate future privacy/security decision covers whether
passport images need collecting at all, storage jurisdiction, retention/deletion, authorised
readers and operational purpose. For the record, what the code does today: `/api/document` (Worker) accepts a guest's
**passport** and **flight document** from step 03 *Travel documents* (`about-you.html`) and
writes the bytes to an object store bound as `DOCS` (R2 API: `env.DOCS.put(key, bytes,
{httpMetadata, customMetadata})`). No `DOCS` binding exists in `wrangler.jsonc`, so the route
answers 503 "document storage is not enabled yet" and the guest surface says truthfully that
documents cannot be accepted yet. Enabling it is configuration, not code: create an R2 bucket
(name, jurisdiction) and bind it as `DOCS`; decide retention and who may read (there is
deliberately no read route — access is the Cloudflare dashboard / `wrangler r2`). It is a
decision because it means storing guests' passport images.

## 7 · Sangkhathan — offered to every active party (Owner decision, 13 Sep 2026, at 72d9e15)
`givingEligibility = PAIR` on all 26 ACTIVE invitations in the private list, INV-001 included —
no whitelist, no NONE, none unset (the single CANCELLED party, excluded from the bundle, stays
unset). Bundle rebuilt, every token unchanged, INV-002 not rotated. The accepted E behaviour is
untouched: the party makes one decision; it is optional; the buttons appear only once every
named guest has chosen to attend the Temple Ceremony (until then the card states the price and
that it "becomes available once … chosen to attend"); USD 15 per participating person, USD 30
for a party of two. Because the decision is an open required item of step 03 for a PAIR party,
a journey is sent only after the party has decided — the accepted rule, now live for everyone;
the release walk therefore decides ("without") on both devices before sending. Guests who do
not attend the temple are never asked.

## Verification
At **72d9e15** (Sangkhathan PAIR): `npm test` 206/206 (pins PAIR on every active party) ·
`release-check` all gates PASS · E/F/G walk 37/37 (E0 asserts production ships PAIR; the
unresolved branch is injected) · release walk **78/78** · smoke 8/8 on both origins (offer
shown, gated on attendance; seating OPEN, 100 chairs; no write) · **parity 61/61** local =
Worker (`bf286abb`) = Pages (built 72d9e15) — `parity-72d9e15.txt`.

At 7431761 (first set): `npm test` 206/206 · gates PASS · E/F/G 37/37 · release walk 77/77 ·
a11y 18/18 · crawl clean on local/Worker/Pages · smoke 8/8 both origins · parity 61/61.

At **0b8ff2d** (final): `npm test` 206/206 · `release-check` all gates PASS (P11 pins the
fifty-chair contract) · E/F/G walk 37/37 · release walk 77/77 · a11y 18/18 · INV-001 local
sign-in (two guests, separate identities, token never stored) · production booking test with
INV-001 10/10 · smoke 8/8 on both origins (seating OPEN, 2 plans, **100 chairs**, 0 family,
nothing fixed, no write) · **parity 61/61** local = Worker (`314928b6`) = Pages (built
0b8ff2d) — `parity-0b8ff2d.txt` · REG_KV 0 keys · INV-001 and INV-002 `received:false,
confirmed:false` · seating plan 50 + 50 all available, held 0.

## Deployment — the release path (Owner decision, 13 Sep 2026)
Every push to `main` triggers **Cloudflare Workers Builds** (GitHub check "Workers Builds:
seeyouinlaos-website"), which deploys a version ~60 s later. **This is the production release
mechanism for now.** No competing manual `wrangler deploy` is made after a push unless the
automatic deployment genuinely fails; after each push the automatic build is awaited, edge
propagation is awaited, the served files are verified by hash, Pages is verified, and parity is
proven. Observed behaviour, recorded as an **infrastructure follow-up, not a blocker**: after
7431761 (eight new binaries, one deletion) the Hamburg edge served the previous asset manifest
for several minutes before propagating; after 0b8ff2d the new files were served on the first
probe. Versions: `f63ff143` (7431761) · `88beab8e` (d6d77fd) · `97f05843` (95bdf7e) ·
`314928b6` (0b8ff2d) · `7cdb5bd5` (84f1de7) · **`bf286abb` (72d9e15)** · one more for each later docs-only push. The technical clean-up
(one deploy path) is deferred to a later, separate decision.

## Post-release factual check — Tak Bat payment logic (13 Sep 2026)

The Owner's 10 Sep correction (**Morning Alms-Giving · Tak Bat = SELF-PAY**; never "no
charge", "nothing to pay", "no separate charge", "complimentary" or "included") was applied on
11 Sep in the Haruthai correction pass (`91c52ad`) and is what the released state serves. The
10 Sep screenshots show the state that pass replaced. Verified again on production (INV-002,
Worker origin) after the release; exact wording per surface:

| Surface | Wording now |
|---|---|
| Your Journey (02) — hosted wedding block | "Hosted by Haruthai & Suthep. The morning alms-giving inside the Temple Ceremony, Tak Bat, is self-pay." |
| The Wedding (03) — Temple Ceremony | "…invited to take part in the traditional morning alms-giving, Tak Bat — food respectfully offered to the monks; self-pay, arranged by each guest on the morning." |
| Tak Bat drawer | "It is part of the Temple Ceremony, and it is self-pay: the small offering of food is arranged and paid for by each guest on the morning itself. No amount is set on this website, and it is not the Sangkhathan." |
| Sangkhathan drawer | "It is not the alms-giving. Tak Bat is the food offered during the ceremony, arranged and paid for by each guest themselves (self-pay); the Sangkhathan is separate, optional, and nobody needs one in order to attend." |
| Review & Send (06) — §03 | "…four events. Hosted by Haruthai & Suthep. The morning alms-giving, Tak Bat, is self-pay. Your optional personal addition, the Sangkhathan, is USD 15 per selected guest — never the alms-giving and never a temple fee." |
| Sent journey text | "Morning alms-giving (Tak Bat): part of the Temple Ceremony for everyone joining it, self-pay (no amount set)" · "Note: Tak Bat (morning alms-giving) is part of the Temple Ceremony and is self-pay. The Sangkhathan is a separate optional personal offering." · programme line "…OPTIONAL PARTICIPATION — SELF-PAY." |
| Public wedding page (voyage.html) | "It is self-pay: each guest arranges their own small offering of food on the morning itself. No amount is set here." · eyebrow "Part of the Temple Ceremony · self-pay" |

No guest-facing text changed. Hardened instead: gate **P8** now fails if any guest-facing file
carries "no charge / nothing to pay / no separate charge / nothing is paid / complimentary /
included at no / free of charge / at no cost" within 140 characters of "Tak Bat" or
"alms-giving" without "self-pay" beside it (negative-tested: re-inserting the old wording fails
the gate). The dictionary entries in `assets/i18n/` about a hosted dawn alms-giving belong to the
retired pages and appear on no active surface. The Haruthai walk's dinner-placeholder pin, which
the Owner's Wedding Dinner decision had superseded, now asserts the image set (24/24).

## Post-release correction pass — 10 Sep markups reconciled · View All Steps (13 Sep 2026)

### A · the 10 Sep Owner markups against the released state

| Item | Previous state (10 Sep) | Final state | Action / superseded |
|---|---|---|---|
| Souphattra stay image | food photograph in "The stay" | hotel photographs only: `heritage-room.jpg` band on voyage.html, `heritage-courtyard-*` / `heritage-arches-dusk` everywhere else | ALREADY CORRECT (Haruthai pass, 91c52ad) |
| Wedding Dinner imagery | screenshot complaint | Owner folder 056, six placed (voyage.html §04) | SUPERSEDED by the 13 Sep decision; verified, untouched |
| "courtyard garden" wording | — | `Souphattra Heritage Vientiane · courtyard garden` in `journey.js` / `temple.js` and on the page | ALREADY CORRECT — the accepted venue data (D-14, d4a4518) |
| Dress Code imagery | one retired image still present; stretched images | `resort-01` retired at 91c52ad (23 images, gate P7); the 3:4 `object-fit: cover` box of that pass still cropped people to make the cards equal — now every reference renders at its own proportion (`.p-rail` on step 04, `.dgal` on dress.html): height/width caps, `object-fit: contain`, no stretching, no cropping; 17 + 17 verified at 320/390/430/1280, rendered ratio = natural ratio | STILL WRONG (cropping) → FIXED; Haruthai H4 pin updated |
| Kunming → Lijiang C86 arrival | 21:08 | 13:44 in `transport-data.js`, your-journey, journeys, sent text, tests; 0 × 21:08 | ALREADY CORRECT (91c52ad) |
| Bangkok → Nong Khai night train | "in some cabins" · "Towels" | "In-suite washbasin in every cabin" · "Blankets" | ALREADY CORRECT (91c52ad) |
| Shama Yen-Akat | house / keybox / elevator / breakfast self-pay / meals wording | "one studio per couple" · "Check-in at the lobby." · "Breakfast included." | ALREADY CORRECT (91c52ad); the house wording exists only on the Sathorn Penthouse, its own true facts |
| U Sathorn | same | "one room per couple" · "Check-in at the lobby." · "Breakfast included." | ALREADY CORRECT (91c52ad) |
| Tak Bat | "no charge" | self-pay everywhere; gate P8 guards it | ALREADY CORRECT (91c52ad, re-verified 636ef74) — not touched |

### B · View All Steps — root cause and correction
**Root cause.** The step index (`.prep-steps`) was a static block in normal flow, inserted at the
top of the document after the site header and toggled `display: none/block`. Wherever the
guest was scrolled, "View all steps" opened it *out of view at the top* while the whole page
shifted down by its height (and snapped back on close); the open state was lost on every shell
repaint (`aria-expanded` reset to false while the block stayed open); every row was a plain
link, on the Worker origin a `.html` → clean-URL 307 first; the destination appeared as a hard
cut; nothing had a pressed state. That is the "jumping around" the Owner saw.

**Now (`assets/prep-shell.js`, `assets/prep.css`).** The index is part of the sticky bar
itself — `position: absolute; top: 100%` — so it opens under the bar wherever the page is
scrolled, over a light scrim, never pushing the page; it fades and settles 8 px over 240 ms,
rows entering 25 ms apart; the scrim, Escape, the button and any choice close it; the open
state survives repaints; the page under it keeps its position (scrim swallows wheel/touch
scroll). Every row is one deterministic navigation to that step's top: the row presses, the
index and the page take their leave (180 ms, 6 px), then the browser loads the step, addressed
the way the origin already addresses it (`/wedding` on the Worker, `wedding.html` on Pages — no
redirect); the step enters (280 ms, 8 px, opacity) and the bar names it (`0N / 06 · Title`).
The current row is inert (closes the index). Browser back returns to a whole page with the
index closed (`pageshow`). Hash deep links land clear of the sticky bar
(`scroll-padding-top: var(--prep-bar-h)`, measured after every paint, fragment settled once
on arrival). Drawers (Tak Bat, Sangkhathan, Switch) lock the page underneath (`position:
fixed` body with the scroll offset kept) and restore it on close, trap Tab, return focus.
Pressed / hover / focus-visible states on the bar button, Switch, rows, `.p-link`, `.p-act`,
`.p-sel`; native tap highlight replaced by the design's own. `prefers-reduced-motion`: nothing
travels, states change at once, navigation is immediate.

**Deterministic coverage.** `steps-nav.mjs` (this directory): at 320 / 375 / 390 / 430 / 1280,
from every step to every other step via the index (30 transitions per width): panel visible
under the bar, `aria-expanded`, one navigation, landed on the expected file, `scrollY 0`, bar
title, page entered, index closed; open/close without navigating keeps `scrollY`; scrim closes;
current row inert; browser back; identity switch; `#documents` below the bar; drawer lock /
label / focus / restore; reduced motion; zero page and console errors — **50/50** locally and on
both live origins (see below).

### Verification (this pass, `afabb17`)
Local: `npm test` 206/206 · `release-check` all gates PASS (P7, P8 guard, P10, P11 included) ·
`steps-nav.mjs` 50/50 · `a11y.mjs` 18/18 · release walk 78/78 · D 39/39 · C 39/39 ·
Haruthai 24/24 (rails at native proportion) · E/F/G 37/37 · 0 page / console errors.
Live, after the automatic builds (Worker `1d567e3c`, Pages workflow for afabb17 success):
`steps-nav.mjs` **50/50 on the Worker** (`steps-nav-worker.json`) and **50/50 on Pages**
(`steps-nav-pages.json`) · smoke 8/8 on both · **parity 61/61** (`parity-afabb17.txt`) ·
iPhone 14 profile in WebKit on Pages: index opens under the bar at scrollY 900, tap "03" →
`wedding.html` at scrollY 0, bar "03 / 06 The Wedding", page entered, index closed, back
returns a whole page, no errors.

## Guest-testing correction pass (Owner, 13 Sep 2026 — sections 1–22)

| Item | Previous state | Final state | Verified |
|---|---|---|---|
| 1/17 About You · Accessibility & comfort | optional; step 05 "Optional · Every answer optional" | REQUIRED of every named guest (blank / whitespace invalid; "None" is an answer); step 05 REQUIRED, completes only when every guest has answered; Review & Send blocks and names who is missing; deep link `#access` lands on the field, focused; Travel documents stay optional | unit (party-person, guest-testing) · release walk 06 |
| 2/3 Journey selection state | chosen card looked like an option ("Selected" button active) | one model from the bag: chosen card framed (ink inset), "Selected for your journey", inert "✓ Current selection"; alternatives keep "Select this stay/travel/fare"; Special Express No. 25 and every flat travel, MU9646 fares, Bangkok rail, journeys.html cards and fares follow it; Vientiane stays keep "Change this stay" | unit · guest-testing walk 1 |
| 4 Bangkok rail alignment | second/third card 16 px lower (`.p-card + .p-card` spacing leaked into the rail); cards un-stretched | one top line for media and text, one card height, `cover` never stretches, no card widened by its label | walk 2 at 320/375/390/430/1280 |
| 5 Seat discoverability | seats only inside step 04 §02 | The Wedding (03) carries **Your seats · where each of you will sit**: per guest "Choose your ceremony seat" / "Choose your dinner seat" → step 04 `?for=<guest>#seats` (person preselected, section below the bar); booked → seat code + "Change seat"; Review & Send links the same; step 04 cards titled "Choose your … seat" / "Your … seat", "tap another chair to change" | walk 3 at 390/1280 |
| 14 Ceremony BRIDE & GROOM | none (50 chairs only) | two fixed positions at the FRONT CENTRE in the ledger contract (`RULES.ceremony.fixed`, `CAPACITY.ceremony.fixed: 2`), drawn as two marks in front of row 1, no seat id, never selectable (404), not inventory (50 chairs unchanged); dinner unchanged — 50 bookable, nothing fixed | unit (efg, guest-testing) · gate P11 · walk 3 · smoke |
| 14 The hosts' party | — | `hosts: true` on INV-001 in the private list → bundle → session; for the hosts the ceremony reads "Bride & Groom · front centre" (no chair to choose, nothing blocks them), the dinner is chosen like everyone | walk 4 |
| 6 Sign out / Open another invitation | none | both actions in the step index on every step and on step 01: leave = the party's local draft set aside under its invitation id, session cleared, `invitation.html` (clean) or `?open=1` (code prompt); Back after leaving shows no party (`pageshow` re-check); another party opens clean; the same party returning gets its draft back; SWITCH stays inside one party | walk 4 · unit |
| 7 China card | Kunming archway | the Owner's Drive file `1XBVp6qIwUSWfHpw4w3S0CH-apvsej154` — already in the set as `city/004-lijiang-black-dragon-pool.jpg` (same source, 1440 × 1795; byte-checked); the card uses it; map row carries the Drive id | walk 5 |
| 15 Wedding Preparation first three | tradition-04/05/06/01/02/03 | tradition-01 (man beside the pool) · 02 (couple seated poolside) · 03 (woman on the balcony) · 04 · 05 · 06 — both rails, native proportions | unit · Haruthai walk |
| 16 Full Experience vs manual choice | replaced every stage | fills only open or preset-filled stages; a hand-picked stage (U Sathorn) and a hand-declined stage stay; Cost Saving lines are marked `by: 'cost'` and give way; total follows the retained choices | unit ×3 · walk 1 |
| 18 C86 | "Business Class · 1 + 1 seating" + prose | "Business Class"; the 1 + 1 prose gone (data, journey, journeys, pricing basis); gate P4 guards | unit · gate |
| 19 Blue dress | "Blue Lao Traditional Dress", "in blue" | "Lao Traditional Dress"; gate P4 guards | unit · gate · release walk 05 |
| 20 Wedding Dinner location | "courtyard garden" | **Poolside** (`journey.js`, `temple.js`, voyage.html eyebrow/copy/labels/captions, index, i18n); gate P8 requires "19:30 · Poolside", forbids "courtyard garden", keeps the vow pool-free | unit · gate |

**Verification (local, before release):** `npm test` **214/214** (new `test/guest-testing.test.mjs`) ·
`release-check` all gates PASS · `guest-testing-walk.mjs` **49/49** · `steps-nav.mjs` 50/50 ·
release walk **84/84** (six new access checks) · a11y 18/18 · D 39/39 · C 39/39 · Haruthai 24/24 ·
E/F/G 37/37 · local crawl 0 HTTP failures / 0 broken images · 0 page errors.

**Release and live verification.** Commits `022f13c` (the corrections), `acf0b98` (rail images
carry their intrinsic size — a `#seats` deep link on the slower Pages origin drifted while the
references loaded) and `4345a59` (a fragment holds its place for three seconds while the layout
above it still grows, unless the guest scrolls). Automatic Workers Build and Pages workflow for
each; live version **`1016863a`** at `4345a59`. Live: `guest-testing-walk.mjs` **49/49 on the
Worker and 49/49 on Pages** (`guest-testing-worker.json`, `guest-testing-pages.json`; the Worker's
API is mocked by the walk, production untouched) · `steps-nav.mjs` 50/50 on Pages · smoke 8/8 on
both (ceremony front-centre positions present, dinner nothing fixed, 100 chairs, no writes) ·
**parity 61/61** (`parity-4345a59.txt`) · iPhone 14 profile in WebKit on Pages with the real
ledger: INV-001 sees "front centre" ×2 and two dinner CTAs, Suthep preselected on step 04 with no
ceremony map and the dinner map open (50 chairs), Sign out → clean code screen, Back shows no
party, `?open=1` presents the prompt, INV-002's Accessibility field required and focused, rail
media on one line, no errors. Production ledger: seating OPEN; four chairs held by INV-002
(the Owner's own production test at 14:02–14:03 UTC; not touched); REG_KV 0 keys.

### Follow-ups the same evening (Owner, 13 Sep 2026)
- **About You:** the dietary answer is REQUIRED as well — text or the explicit "Nothing to note"
  tick; blank stays "Required" (`guest.js` `REQUIRED` = dietary + accessibility; the completion,
  the Review & Send block and the walk name both). The favourite-drink question moves to the middle
  of the seven: 01 dietary · 02 coffee or tea · 03 a small favourite · 04 favourite drink ·
  05 travel comfort · 06 avoid · 07 anything else. Release walk 85/85.
- **Homepage "After the Wedding" card:** the Owner's Drive file `1lI07I8yTBcCtiEevBdduf1Pf7eGkbRS4`
  (`IMG_1291.WEBP`, 726 × 995, kept at native size) → `city/004-lijiang-old-town-roofs-jade-dragon.jpg`,
  replacing the Naxi rooftops on that card only (destination.html keeps them); mapped with the Drive id.
- **Four further "replace, no review" image decisions (Owner, later the same evening):**
  homepage "Before the Wedding" card → the Owner's Bangkok Skytrain / Mahanakhon file
  `1l_gUqljSZyRFOy5wxqEbOg21N-9BPw7P` (`city/001-bangkok-skytrain-king-power-mahanakhon.jpg`, 6f24760);
  homepage Vientiane duo, left frame → the rooftop terrace at dusk `15MwIXZIqdvLfS0_RC8N9CBY0k0QMZ8i9`
  (`city/002-vientiane-rooftop-terrace-dusk.jpg`, 8c193dc); public wedding page, Vow Ceremony → the green
  door entrance `1LHfLS0Ys4QV7Jds4PVmoMsvkCSlaAXXG` (`event/052-vow-ceremony-green-door-entrance.jpg`, 4d03b6f);
  destination.html 03 · China card → the temple roofs with cherry blossom `1USQV7R6sIhlj_fo1JbUaQNn-P8V0h2nc`
  (`city/003-kunming-temple-cherry-blossom.jpg`, now the Owner's bytes) and the Kunming stay
  (journeys card, accommodation tile, bag thumbnail) → the Wanxiang Yueju entrance at night
  `1rdIR-yB8F_ReV0vseUtAJXEG3ji1r9Ia` (`journey/kunming-wanxiang-yueju-entrance.jpg`, 1271 × 853, 3910929).
  Every file mapped with its Drive id; i18n entries for the new labels; gates PASS, `npm test` 214/214;
  each commit released through the automatic Workers Build and verified byte-identical on Worker and Pages.

### Experience content completeness pass (Owner requirements 15–24 + source correction 1–10, 13 Sep 2026, evening)
Record: `EXPERIENCE-INVENTORY.md` (43 entities · sheet status · Drive folder · source count · used · discovery/selectable · price / hours / map source · gaps) · `experience-walk.mjs` (72 checks) · `test/experiences.test.mjs` (11 tests) · `src/experience-inventory.json` + `src/experience-galleries.json` (canonical, source-traced) · `assets/images/ASSET-MAP.md` (174 rows).

- **Sources read at cell level.** The Operations Master was exported as xlsx (hyperlinks intact): `Experience, Restaurant, Cafe_Details` carries ONE record, Sühring — name, menu link, category *German fine dining*, Details, About, Price `$180.00` (no unit), opening hours, Google Maps link. `Overview_Hotel_Restaurant` (Day 01 – 16) supplies every other place: name, day, role column. 31 numbered Drive venue folders listed; 302 files downloaded and opened on this machine (+ 1 inline, 3 not retrievable); every exclusion named in the inventory.
- **Multi-image galleries** — `assets/gallery.js` on the site's one carousel grammar (`assets/aman.js`): one photograph per slide, finger swipe with scroll-snap, arrows where a pointer exists, arrow keys everywhere, the thin position line and a quiet "3 / 8", no autoplay, no dots, `overscroll-behavior-x: contain`, reduced motion honoured. Frame per place (4/5 · 3/2 · 1/1 by the set's orientation), `object-position` per frame where set, a photograph of the other orientation shown whole on the sand ground rather than cropped away; first frame eager with intrinsic `width/height` (no layout shift), the rest `loading="lazy"`; every frame with alt text. 31 galleries · 181 production photographs (174 new, JPEG ≤ 2000 px).
- **Detail surface** — new `experience.html?id=<place>`: gallery · city · role · day · introduction · About (the hosts' paragraphs where they exist) · **for the FULL record** the five source sections as an accordion (The philosophy · The founders · The foundation · The first mentor · Contemporary heritage), practical information (price, hours verbatim, map, website) · for discovery places nothing beyond name, city, role, day, teaser, gallery and the Owner's map link. `experiences.html` rebuilt as category rails per city (Restaurants · Cafés · Experiences · Shopping & places · Bars; Bangkok, Bangkok-the-return, Vientiane) — every card opens its page and says how many photographs it carries.
- **Sühring selectable** — `select` block on the entity; the page's action is gated by the invitation (`SIYL_INVITE.require`), writes ONE party-level bag line `{ id:'suhring', request:true, priceNote:'USD 180', exp:'bkk-suhring' }` through `SIYL_BAG` (has() guards a duplicate), shows *In your journey* (inert, `aria-current`) with Remove, survives reload, is listed in Your Journey and Review & Send as **Request · USD 180** with the sentence that it is a table asked for through Guest Relations, not a confirmed reservation; the send payload carries `TABLE REQUEST (USD 180 as recorded by the hosts, unit not stated in the source; not a confirmed reservation; not in the journey total)`. **Price semantics:** the source cell says `$180.00` and nothing else; no accepted data model establishes a unit for a restaurant price (the 1872 "per experience · for two guests" unit is that product's own), so the website shows *USD 180* and the journey total does not carry it — the one source-data ambiguity, reported, not invented.
- **Other selectable places:** none — the Overview marks no place as chargeable or selectable; every other place stays DISCOVERY. New discovery entities from Overview + Drive: ALATi (Day 15), Harudot (Day 14).
- **Findings for the Owner:** Drive folder number **090** is used twice (Suhring, Tang Jai Yang); **170 Dib Bangkok** holds 10 misfiled frames of the couple's alms-giving (`001–010_Couple_Monk.jpeg`, excluded); Sühring is not in the Overview (no day), and its lunch days (Thu – Sun) touch the Bangkok itinerary only on Sun 21 Feb and Sat 6 / Sun 7 Mar — shown as "Bangkok days", not placed; three Time Space files (7–8 MB) could not be fetched through the connector.
- Verification: `npm test` 225/225 · gates PASS · experience walk 72/72 (local) · release walk 85/85 · guest-testing walk 50/50 · a11y 18/18 · steps-nav 50/50 · crawl 0 failures — then live on both origins after the automatic build, plus the iPhone-class WebKit pass (recorded below once run).
