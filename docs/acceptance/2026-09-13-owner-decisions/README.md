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
