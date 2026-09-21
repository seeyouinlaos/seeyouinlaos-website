# THE FOUR-POINT CLOSE-OUT (Owner, 21 Sep 2026)

One consolidated pass: the couple in WHO'S JOINING US · permanent uploads · the hero frame per viewport class · the
passport store. One Worker, one deploy. No production reset, no synthetic production data, no migration, no identity
or code change, no force push, no Pages, no new site.

## 1 · BRIDE + GROOM in WHO'S JOINING US

- **Canonical role, never a name.** `src/build-invitations.cjs` writes `r: 'B' | 'G'` on the two host entries of
  `register/auth-index.json` (from the register's `hostRole`); the index still carries no name and no code (its leak guard
  proves it). The rebuild changed only those two entries — every auth id, invitation id, guest id, party, CON and COUPL
  identical; the codes unchanged.
- **The Worker** (`handleCommunity`) puts the couple first from the index (`h === 1 && r`), Groom then Bride, named as
  they spell themselves (their own contact record → their own submission → the two first names every page prints,
  keyed by role), a portrait flag through the existing `avatar:` read, a `joinedAt` only when the host has genuinely
  sent a trip (`firstSentAt`). No registration, no submission, no `firstSentAt`, no booking is written for either.
- **The page** (`assets/community.js`): SUTHEP / GROOM · HARUTHAI / BRIDE first; one inclusive wording when the couple
  stands in the count — "N of us are joining so far" (the count = the visible population); RECENTLY JOINED from
  genuine days only, newest first (the couple without a day is not in it); "You are among them" unchanged.
- Normal guest eligibility untouched: a guest joins by sending a trip, a decline is not a joining guest, a host's own
  record is never counted as a guest, an earlier version (`:prev:`) never a second guest.

## 2 · UPLOAD DURABILITY (the profile photo, the documents)

Audit of every write path in `src/worker.js` (contact, draft, register, register history, rooms, seating, photo,
document, the Guest Relations reset):

- The photo lives under `avatar:<invitationId>` — the immutable invitation, never a name, a booking, a version or a
  session. No other handler reads, writes or deletes it. A contact write merges (a field omitted = unchanged); the
  draft, the registration and its `:prev:` history are separate keys and never carry the photo. A KV put is atomic:
  a refused replacement (415 · 400 · 413 · 401) or a store failure (503) leaves the earlier bytes; the successful
  replacement is the only change; the guest's explicit DELETE the only removal. A document is a new object per upload
  (`doc/<inv>/<guest>/<kind>/<iso>-<sha12>`), never overwritten; the Worker has no delete for documents; the only
  expiry in the Worker is the 90-day `:prev:` history mirror — never an upload; no scheduled cleanup exists and none
  was added.
- The one administrative path that removes photos is the existing explicit Guest Relations CLEAN RESET (confirmation
  words + snapshot digest; dry-run by default). It was not run and is unchanged.
- **The Owner's stored portrait**: before and after the deploy `avatar:INV-G049` is present with the same size and
  stamp (the read-only aggregates below); it is read by the account card and by the Groom's tile.
- Tests: `test/durability.test.mjs` (3) — the photo through a name edit, a partial contact write, a body naming a
  photo field as empty, Save my progress, a room hold and release, a seat and a seat change, the trip sent, sent again
  (version 2, history kept), a reset dry-run, the partner's writes; every failed replacement; the document's own
  object; the static audit of deletes and expiries. E2E section 2 (13 checks) through the real flows, sign-out and
  sign-in, a second device, the account card, the partner's DELETE (her own key), Remove.

## 3 · THE HERO FRAME PER VIEWPORT CLASS

- Phone (< 768): the square, unchanged (320 · 375 · 390 · 430 verified).
- Tablet portrait (768–1199, portrait): **4:5**, max 720 px, centred — 768×1024 · 810×1080 · 820×1180 · 834×1194.
- Tablet landscape (768–1199, landscape): **3:2**, max 880 px, centred — 1024×768 · 1080×810 · 1180×820 · 1194×834.
- Desktop (≥ 1200): **3:2**, max 1000 px, centred — 1440×900. The 16:9 banner that cut the couple out of every
  portrait frame is overridden by the cascade (the new rules stand after every earlier hero rule).
- Each slide carries its own focal point per class on the layer (`--fp-p · --fp-tp · --fp-tl · --fp-d`); the script
  no longer sets a position, the stylesheet does. The picture is only positioned — `cover`, no transform, no filter,
  no extension, no blur-fill. The words begin at the frame's own left edge.
- Preserved: five slides in order (courtyard · 02 · 03 · 04 · 05), HOLD 5000 · FADE 1000, loop, no controls, reduced
  motion still, hidden tab pause without catch-up. The frame is the same box before and after every slide (no layout
  shift) — measured in WebKit at the iPad sizes and in Chromium at the desktop.
- Evidence: `stage/hero-<view>-slide-<n>.jpg` for 390×844 · 834×1194 · 1194×834 · 1440×900 (all five slides), the
  geometry table `stage/hero-geometry.json` (thirteen viewports, both engines).

## 4 · PASSPORT / DOCUMENTS — production storage

- **The one infrastructure change**: ONE private R2 bucket `siyl-docs` bound to the existing Worker as `DOCS`
  (`wrangler.jsonc` · `infra/PRODUCTION.json` · `src/infra-guard.cjs` pins it; the commit carries
  `OWNER-INFRA-CHANGE: R2 bucket siyl-docs bound as DOCS`). Public access off (no r2.dev URL, no custom domain — checked
  with wrangler). No other binding touched.
- **The flow** (iPhone Safari): ADD PASSPORT → the picker (JPEG · PNG · HEIC · HEIF · WebP · PDF, 12 MB) → the
  authenticated upload → RECEIVED only after the object is stored (201). Ownership by the bearer's identity (`owns()`):
  the partner of the same party, an unrelated guest and a mismatched pair are refused (401). A replacement is a new
  object beside the earlier one; a refused type or size changes nothing.
- **Guest Relations retrieval**, the GR token only (the same boundary as `/api/gr/record`):
  `GET /api/gr/documents?invitation=INV-…` — the metadata of ONE invitation (key · kind · guest · filename · type ·
  bytes · received · sha256), never a listing of everyone; `GET /api/gr/document?key=…` — one object streamed through
  the Worker by its exact key (the key's shape is pinned; no prefix, no wildcard), `private, no-store`, a download
  name. A guest's bearer is refused on both; no token is refused; there is no guest read route and no public URL.
  Nothing of the body or the token is logged.
- The receipt (name · bytes · type · digest · key · time — never a byte) travels with the server-side draft, so it
  stands after reload, sign-out and sign-in, a name edit, a trip update, a second device.
- **RETENTION POLICY REQUIRES OWNER CONFIRMATION.** No deletion date is approved; nothing is deleted automatically;
  the Worker has no delete for documents. Documented in `infra/PRODUCTION.json` (`r2[].retention`).
- Tests: `test/document.test.mjs` (5, rewritten for the bound store and the GR routes); E2E section 4 (12 checks).

## Tests

- Unit: `npm test` — 446 / 446 (durability 3 · document 5 · community 5 · hero-show 3, plus the two index-shape pins
  updated for `r`). Gates: `node src/release-check.cjs` — 26 / 26 (the infra guard with the OWNER-INFRA-CHANGE marker).
- Stage E2E (fresh Miniflare per suite, R2 bound as DOCS), all green: four-point 48 / 48 · wedding-dinner 13 / 13 ·
  profile-return 18 / 18 (the couple now expected) · close-out 26 / 26 (the passport check now expects RECEIVED with
  the store) · stage-graph 40 / 40 · final-pass 36 / 36 · guest-name 9 / 9 · highlights 20 / 20 · 014 35 / 35 ·
  013 36 / 36 · 012 25 / 25 · 011 52 / 52 · P0 52 / 52 · account IA 35 / 35 (`stage/e2e.json` = the four-point run).
- The stage register carries the couple's roles as production does (the two host entries).

## Data safety

Read-only aggregates before and after (the GR dry-run and the KV key census): no reset, no synthetic production
registration, booking, photo or document; every avatar key present after the deploy with the same size and stamp.
