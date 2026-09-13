# Owner decisions of 13 September 2026 — implementation record

Applied to the accepted 002 system at `7431761` (on `main`, after the FINAL RUN's `ce462d7` /
`eb1d165`). No accepted A–G stage reopened; one stream, no subagent, no MCP beyond the
Owner's Google Drive folder read.

## 1 · Invitation / guest code model — already the accepted model, unchanged
One access code per invitation (party): the private register carries one token per
`invitationId` (26 parties, INV-002…INV-027); INV-002 is *Peggy & Steffie*, one code, two
guests (G001, G002). After sign-in the party holds its guests; state and actions stay separated
through the existing `invitationId` / party / `activeGuestId` / `subjectGuestId` model
(`assets/guest.js`, gate P9). A single-person invitation has its own code. No per-person code
exists or was added. **INV-002 not rotated.**

## 2 · Seating engine — OPEN on production
`node src/gr.cjs seating-config seating-geometry.json` then `seating-state --open true
--frozen false`, through the GR-token-protected route only (Worker version `21948251`, ledger
unchanged in behaviour). Production plan after: `open:true, frozen:false`, ceremony 50/50
available, dinner 48/48 available, held 0, allocated 0, family 0, BRIDE + GROOM fixed. Guest
access is unchanged: the seating surface sits behind the invitation-code sign-in exactly as
before; nothing about authentication was loosened (the guest routes `select`/`release` carry the
same invitation-id model as `/api/register`, accepted at F/G).

`seating-geometry.json` (this directory) is the uploaded configuration — the binding Owner
geometry: ceremony `C-L-01..10-01..02` (20) + `C-R-01..10-01..03` (30); dinner `D-T-01..24` +
`D-B-01..24` (48) + BRIDE + GROOM fixed = 50 people. It is a record of what Guest Relations
uploaded, not geometry in code.

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

**Step B needs one Owner input.** The couple have no invitation of their own in the private
guest list (26 parties, INV-002…INV-027; there is no INV-001). To book "through the normal
system" they need a party entry — names and guest ids — in `src/guestlist.private.json` and
a token in `src/invitation-tokens.private.csv`, then `node src/build-invitations.cjs` and a
redeploy. That is Owner data and was not invented. The same applies to any host or VIP who is
not already an invited party.

**Interpretation recorded:** at the dinner the couple's two places are the fixed central
BRIDE and GROOM positions of the accepted G geometry (not guest inventory, not a FAMILY
mechanism); the couple book their *ceremony* chairs through the engine like everyone. If the
Owner instead wants the couple to hold two of the 48 dinner chairs, that is a change to the
accepted G geometry (50 bookable dinner chairs, no fixed positions) and needs an explicit
decision.

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

## 6 · DOCS binding — the concrete question (no change made)
See the final report to the Owner. In short: `/api/document` (Worker) accepts a guest's
**passport** and **flight document** from step 03 *Travel documents* (`about-you.html`) and
writes the bytes to an object store bound as `DOCS` (R2 API: `env.DOCS.put(key, bytes,
{httpMetadata, customMetadata})`). No `DOCS` binding exists in `wrangler.jsonc`, so the route
answers 503 "document storage is not enabled yet" and the guest surface says truthfully that
documents cannot be accepted yet. Enabling it is configuration, not code: create an R2 bucket
(name, jurisdiction) and bind it as `DOCS`; decide retention and who may read (there is
deliberately no read route — access is the Cloudflare dashboard / `wrangler r2`). It is a
decision because it means storing guests' passport images.

## Verification at 7431761
`npm test` 206/206 · `release-check` all gates PASS · E/F/G walk 37/37 · release walk 77/77 ·
a11y 18/18 · local crawl 0 HTTP failures / 0 broken images · production smoke 8/8 on both origins
(seating OPEN, 2 plans, 98 chairs, 0 family, BRIDE/GROOM fixed, no write) · crawl on both origins
0 HTTP failures / 0 console errors · **parity 61/61** (the 51 guest-facing text files + the 10
dinner images) local = Worker = Pages · REG_KV 0 keys · INV-002 `received:false, confirmed:false`.

## Deployment note — a second deploy path exists
Every push to `main` also triggers **Cloudflare Workers Builds** (GitHub check "Workers Builds:
seeyouinlaos-website"), which deploys its own version ~60 s later (`8413ce31` for ce462d7,
`8f5c69e9` for eb1d165, `f63ff143` for 7431761). It is not the documented `wrangler deploy`
path and the Owner did not mention it. After 7431761 the edge served the previous asset
manifest for several minutes (new files 404, deleted file 200) until propagation completed; the
wrangler deploy `21948251` from 7431761 was correct on every probe after 08:44 UTC; the
acceptance push (d6d77fd, docs only) then produced the integration's version `88beab8e`, which
was verified at parity 61/61 as well — and every later push to `main` will produce another.
Owner decision: keep the git integration (then it is the release path and wrangler deploys are
redundant) or disable it in the Cloudflare dashboard (then `wrangler deploy` is the only path, as
documented). Until decided, verify parity after every push, as done here.
