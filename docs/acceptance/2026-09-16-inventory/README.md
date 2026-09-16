# Accommodation inventory repair — all stays (Owner, 16 Sep 2026)

Live at **3308462** (engine + model), **d340b2f** (reserved wording, live evidence), **675baed** (journeys address cards). Both origins verified: Worker `https://seeyouinlaos-website.suthep-hrg.workers.dev`, Pages `https://seeyouinlaos.github.io/seeyouinlaos-website` (byte-parity of every changed file, the walks below).

## The rule (one canonical server model)
`src/inventory-seed.js` → `src/rooms.js unitsOf()`: every category is a finite list of physical rooms from the Operations Master (`master-accommodation.json`, rows "Rooms avaible" / "Status"). The first `held` rooms of a category are **RESERVED** for `heldFor` (the Master's Status column): a *Bride & Groom* room is the hosts' alone (`403 reserved · bride & groom`), a *Family* room is nobody's through the website (`403 reserved · family`). Every other room is open to any authenticated guest; a full room answers `409 full`; an unknown label `404`. `join`/`leave` run under `blockConcurrencyWhile` — atomic, oversell-proof.

**TOTAL** stays the physical count; **AVAILABLE** (rooms with a place left · unused places) is derived from the open rooms only. Every surface reads the same view (`/api/rooms/read`) through `assets/rooms.js`: room.html, journeys.html (rows and the three Bangkok address cards), your-journey.html, cart, review. No Choose button at 0 (Fully booked / Reserved instead); the refusal reads "This room was just filled. Please choose another room."; a reserved room reads "Reserved · Bride & Groom" / "Reserved · Family"; a category reserved in full reads "Reserved · …" (never "booked"). Both confirmation emails name the room the engine persists, read on the server under the guest's identity (`engineRooms` in `src/worker.js`).

| Stay | Canonical rooms (places) | Reserved (Master Status) | Bookable |
|---|---|---|---|
| Sathorn Penthouse | A–F · 6 (12) | A · Bride & Groom | 5 rooms · 10 places — no Room G |
| U Sathorn | 38 (76) | — | 38 |
| Shama | 27 (54) | — | 27 |
| Souphattra (each window) | 5 / 13 / 3 / 1 / 2 / 1 / 1 | Grand Majestic A, B · Family; Presidential A · Bride & Groom | 5 / 13 / 3 / 1 / 0 / 1 / 0 |
| Private Residence | 1 property (6 guests) | — | 6 places |
| Kunming | 12 categories × 1 | 007 Solarium Bath Suite · Bride & Groom | 11 |
| Lijiang | 9 categories × 4 (72) | 006 270° Snow Mountain View Suite ×4 · Bride & Groom | 8 × 4 |
| Siam Kempinski | 4 (8) | — | 4 |

## Evidence
- `reconcile.mjs` → `reconciliation.json` / `.txt`: all 40 categories — Master rooms/status, canonical rooms/places, reserved, live engine rooms, owner-occupied, guest-occupied, remaining rooms/places, the API summary, the rendered words and Choose state (the client code over the live guest view), YOUR ROOM. Assertions per category: canonical = Master, reserved = Status, live = canonical, rendered ≤ canonical, no invented room (Penthouse exactly A–F), availability from open units, words = API, Choose only when available, no non-host in a reserved room. **ALL ASSERTIONS HOLD (40 categories)**.
- `soldout.mjs` → `soldout.json`: on the live engine, `prewed/noble-courtyard` (one open 2-place room, empty; G001/G002/G003 held nothing in that stage): A holds (1 place available), B holds (Fully booked, API free 0 rooms 0), C refused `409 full` with the Owner's words, the room unchanged, a 3-request burst refused, Room B `404`, YOUR ROOM = the persisted room; A and B released; **the plan after equals the snapshot record for record (12 genuine holds)**. Snapshots (names) stayed in the private scratchpad.
- `walk.mjs` → `worker-walk.json`, `pages-walk.json`, screenshots: a guest signed in on each origin — Penthouse "5 rooms · 10 places available", A–F, Room A "Reserved · Bride & Groom" without a button, Room B choosable, the CTA live; Presidential / Solarium "Reserved · Bride & Groom" with the CTA disabled reading "Reserved"; Grand Majestic "Reserved · Family" (A, B); journeys rows and the three Bangkok cards carry the live words.
- `node src/rooms-audit.mjs` (invariant: units = source, places, reserved = Status, available = places − reserved − occupied), `node src/release-check.cjs` (Gate 2b pins the rule), suite 277/277.

## Noted for the Owner
- Kunming: the Owner's message names *006 Standard Single* as reserved; the Master's Status column reserves **007 Solarium Bath Suite** (and the hosts' live hold is Solarium A). The Master was followed.
- Sathorn: Room A of the Penthouse is now reserved for the hosts as instructed; the hosts' genuine live Bangkok hold is **U Sathorn Room A** (untouched).
- No genuine hold was moved or erased: 12 holds before, 12 identical holds after.
