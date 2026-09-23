# RIVERSIDE HOTEL VIENTIANE DELETED — Owner, 23 September 2026

**Owner decision, final:** Riverside Hotel Vientiane does not exist as a website product any more. Both
canonical products are gone — `stayext/riverside-superior` (withdrawn earlier the same day, see
`../2026-09-23-extension-withdrawn/`) and now `riverside/superior-window`, the Wedding Stay alternative
that the earlier pass had deliberately preserved. That preservation is superseded by this decision.

Nothing replaces it. The Souphattra Heritage (`wedstay/heritage`) and the Guest House complimentary
(`guesthouse/guest-house`) are the two Wedding Stay products and are untouched.

## What was removed — by canonical identity, never by the word

| layer | what went |
|---|---|
| inventory | `riverside/superior-window` from `src/inventory-seed.js` (no stock, no unit, no key) |
| engine | the `riverside` stage from `STAGE_OF` in `src/rooms.js`; no route can join, hold, quote or list it |
| graph | the `riverside` alternative from `src/stage-graph.js` and its generated `assets/stage-graph.js` (gate G1) |
| media | the hotel and its seven frames from `src/stay-media.json` / `assets/stay-media.js` (8 hotels, 46 frames) |
| browser | the house, the room, the window and the price from `assets/rooms-data.js`; the `j-riverside` journey card |
| pages | the card on `accommodation.html` and `journeys.html`; the room page no longer resolves `stay=riverside` |
| guest surfaces | My Trip · My Profile · My Bag · Review & Send never compose it; the mail composes no Riverside line |
| gate | S1 in `src/release-check.cjs` now fails the release if either Riverside key regains stock or any of the twelve surfaces names the product |

Ordinary descriptive prose ("riverfront", the river itself) was left alone — the deletion matched
the product keys and the product's name, not the word.

## Production data

The pre-change audit read the live engine read-only: `riverside/superior-window` had **0 holders**,
`stayext/riverside-superior` had **0 holders** (released in the earlier pass). No guest record had to
be touched; no reset, no migration, no synthetic booking on production.

## The proof

| | |
|---|---|
| unit | **489/489** (`test/no-self-service-extension.test.mjs` asserts both keys undefined) |
| gates | **28/28** — `RELEASE CHECK PASSED` |
| stage E2E | stay-deadline 27/27 · release-012 25/25 · release-014 35/35 · release-013 36/36 · stage-graph 40/40 · profile-return 18/18 · account-IA 35/35 · empty-bag 52/52 · visual-system 14/14 |
| live | __LIVE__ |

The served proofs that used the Riverside as the second Wedding Stay alternative now play the same
scenario on the Guest House (one selection per stage, switching through the pages, the released
place) — the engine behaviour they pin is unchanged.

**Codex:** not run — the Owner's instruction for this pass ("Do NOT run a Codex review").
