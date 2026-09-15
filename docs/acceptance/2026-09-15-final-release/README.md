# Final release preparation — no new features (Owner, 15 Sep 2026)

Evidence of the final release run. No access code, bearer or hash appears in this folder; the private
register (`src/*.private.*`) is gitignored and was read only by the scripts named below.

## A · 007 final review
- `docs/review/007-final-full-website-text.txt` and `docs/review/007-final-source-truth-audit.txt` regenerated
  from the final guest-facing code (their metadata blocks carry the SHA and the counts). The baseline
  `docs/review/007-full-website-text.txt` is byte-unchanged.
- Applied from the audit: **ST-015 / ST-016** — the Light French Suite (Kunming) and the Snow Mountain Viewing
  Room (Lijiang) were seeded as singles from an older sheet state; Accommodation_Details "Pax" says **2 Adults**
  for both and the Owner's 15 Sep rule is one room = two places. Seed occupancy 2, the room page says
  "2 adults", the engine offers two places (commit `d299355`). Nothing else guest-facing was changed.
- Left as they are (Owner decision required — see the audit and the final report): the Temple Ceremony start
  (08:00 on the site, corrected 9 Sep · 09:00 in the locked programme of 3 Sep) and the Sathorn Penthouse
  per-person rate (USD 85 in Accommodation_Details · USD 90 in the Overview).

## B – D · individual invitations, the Owner register, the authentication proof
- `src/register-audit.mjs` (private, counts only): ACTIVE GUESTS 47 · INDIVIDUAL INVITATIONS 47 · UNIQUE
  ACCESS CODES 47 · CANCELLED / INACTIVE 2 · MISSING 0 · DUPLICATE 0 · AUTH ERRORS 0 · the deployed register
  identical to the repository. `--export` writes the gitignored Owner distribution file
  (`src/invitation-distribution.private.csv` + `.txt`, one block per guest with code and personal link).
- `test/release-auth.test.mjs` (in `npm test`): the shipped index / bundle shape; every active code opens
  exactly its guest and its bearer maps to that guest; one guest cannot edit another (403), no bearer no write
  (401), the party gives no permission; the session is one guest; Sign Out clears it; Open Another Invitation
  returns to the code entry; the retired SWITCH / Continuing as / Answering for paths are absent; a stale
  party-era session opens nothing.

## E · guest-list coverage on production (read-only)
`auth-coverage.mjs` → `auth-coverage-production.json`. For each of the 47 active guests, on the Worker
origin: the bearer derived from the code is accepted by the rooms engine and the seating ledger (own places
and own seat marked as the guest's, nobody else's), the status route answers, a browser sign-in shows the
guest's own name (and the party label where a party exists), the own cart is empty in a fresh browser, and
Sign Out returns to the code entry. A request listener proved **no write request** during any sign-in; a bad
bearer is refused (401 on a write, no names on a read). 47 / 47 · failures 0.

## F · full end-to-end journeys on the designated test identities
Production state was backed up before (rooms plan, seating plan, the KV registration keys with metadata) and
proven identical afterwards (`walk-results.json` in each folder; the comparison is in the final report).
- `live-ticket-rooms/` — `2026-09-15-ticket-rooms/walk.mjs` on production as **Suthep (host) · Peggy · Steffie**:
  35 / 35.
- `live-cart-ticket/` — `2026-09-15-cart-ticket/walk.mjs` on production as **Suthep · Peggy**: 41 / 41 (the QR
  codes decoded by an independent decoder).
- `local-rebuild/` — `2026-09-14-rebuild/walk.mjs` on the local Worker (same code) as **Haruthai · Suthep ·
  Peggy · Steffie**: 63 / 63. `local-cart-ticket/` (Haruthai · Peggy) 41 / 41 · `local-ticket-rooms/`
  (Haruthai · Peggy · Steffie) 36 / 36.
- Haruthai's journey was **not** walked on production: the Owner was live in that invitation during the run
  (registration re-sent 14:20Z, six room places rebuilt 15:33 – 15:37Z). The rebuild walk overwrites the
  registration and moves the rooms of the identity it runs as; the Owner's rule ("do not disturb existing
  Owner live bookings") wins. Haruthai's full journey is proven on the local Worker at the same code.
- Restored after the production walks: Suthep's dinner seat back to D-B-15 (the walk had moved it to D-T-01),
  the walk's registration `reg:INV-G049` removed (it did not exist before). Rooms, seats and KV keys then
  identical to the backup; Haruthai's registration and six places untouched throughout.

## H · public release check on both origins
`crawl.mjs <origin> <out.json>` → `crawl-worker.json`, `crawl-pages.json`: every public route from index.html
(room / experience / transport routes with their ids), then the guest area signed in as Suthep (GET only,
signed out afterwards). Checks: HTTP failures, broken images (an undecoded lazy image is verified by fetch),
missing anchors, console and page errors, retired strings on rendered text, retired / private routes
(`src/`, `test/`, `docs/`, private files, `wrangler.jsonc`, the superseded register engine → not served;
`register/` → forwarder; `/api/inventory` → 410), and secret exposure over every same-origin response body
(the 47 codes, their bearers, the GR token, any 64-hex outside the auth index, any non-host guest's full
name on a public page). Both origins: **CLEAN**; the rendered pages of the two origins carry identical text.

## I · final security check
Tracked tree at HEAD and the full git history (every branch, every blob): 0 occurrences of any access code,
any bearer or the GR token. The five private files are gitignored and untracked. The only 64-hex strings in
the tree outside the auth index are file digests in earlier parity evidence, image digests in the release
gate and the SHA-256 test vector. The shipped bundle carries salts and ivs, never a bearer.

## J · freeze
Full tests (`npm test`, 16 files) and the release gate (`node src/release-check.cjs`) at the final SHA;
production smoke and parity after the Workers Build and the Pages build; both working trees clean.
