# HERO CONTROLS · THE IPAD MAP · VIENTIANE FROM DRIVE · AFTER THE WEDDING (Owner, 22 Sep 2026)

One consolidated pass on the first page and the Vientiane chapter. Drive is the source of truth for every photograph and film
here; nothing in Drive was renamed, moved or deleted. Everything else of the journey stands: the booking and stage model, the
questionnaire, the countdown, the Discover taxonomy, the Dior / LV split, the venue media of the previous pass, BARON, Wat Ong
Teu, the Wedding Dinner, the documents and their retention, the infrastructure freeze, and every guest record.
**The unresolved 13A/13B seat correction was not touched: seating is exactly as it was.**

## 1 · The hero — three seconds

`assets/hero-show.js`: `HOLD` is **3000 ms** (was 5000), the crossfade stays 1000 ms. The five canonical photographs, the frame
per viewport class, the focal points, the lazy fetch of the next frame, the paused hidden tab and the reduced-motion stillness
are unchanged.

## 2 · The hero — pagination dots

The module builds one dot per slide (so their number can never disagree with the photographs) and lays them over the foot of
the picture, centred, in a wrapper of the photograph's own width — never over the words, never taking layout space, so nothing
shifts. Each dot is a real `<button>` inside a named group, labelled *Photograph 3 of 5*, the active one filled and carrying
`aria-current`. A dot jumps straight to its photograph **and starts the clock again from that moment**, so a chosen photograph
is never swept away a beat later. Tab reaches them, ← and → move through them, and a horizontal swipe over the photograph does
the same (a vertical drag stays the page's own scroll). Under `prefers-reduced-motion` nothing advances by itself and the dots
still answer. No arrows over the hero, no captions, no second control.

## 3 · The map of Laos on iPad

The map is 838 × 980. Its frame now carries **that** ratio (`aspect-ratio: 838 / 980`, `background-size: contain`), so the
drawing meets both edges of the space it is given instead of floating in an empty 4:3 block; the photograph beside it takes the
map's height. On a tablet held upright the duo stacks to one column and the map has the whole content column, capped by the
screen's own height (`min(100%, 62vh × 838/980)`) — pure responsive logic, no device name anywhere. Measured, served:

| viewport | map | share of the content column | ratio | overflow |
|---|---|---|---|---|
| 390 × 844 | 165 × 193 | 0.42 | 0.855 | 0 |
| **834 × 1194 (iPad portrait)** | **633 × 740** (was ~237 wide) | **0.83** | 0.855 | 0 |
| **1194 × 834 (iPad landscape)** | **494 × 578** | 0.42 | 0.855 | 0 |
| 1440 × 900 | 494 × 578 | 0.42 | 0.855 | 0 |

Nothing is cropped, stretched or distorted at any width, and no width scrolls sideways.

## 4 · The Vientiane film

The Buddha-statue clip is gone. The card on the first page and on Destinations now plays the Owner's
**`1UQn3L-tj4zpwB5n-MOZyxfRUfQ6LWAYI`** — *SnapInsta.to_AQO5Dx_-2Sck5ToCpv00hl7fUy_wv8uLT7yDyzVuORxlHK2PJ5GJCgUtGRGBdNTzcb6sedzcTLxfimJ7MjEF2nzN0PlWQU9-vS9osok.mp4* — "night of Vientiane": the train at the platform, the street
musician, the neon of the evening. Ingested through the existing pipeline: 720 × 1280 (the source geometry, untouched), H.264
yuv420p, `+faststart`, **audio removed** (a card clip is silent — gate V1), 2.6 MB of the 4.5 MB budget. Its poster is a frame
of the film itself, and the card's label reads *A night of Vientiane — the train at the platform, the neon streets of the
evening* (DE · TH · JA in the dictionary). No reference to the old clip or the Wat Si Saket cloister remains.

## 5 · Vientiane, resynced from Drive

Folder **002 - City - Vientiane** (`17Yvh83Qs-SVs5JiCE9nDsgH0toFcBncr`) was read fresh: 11 items — 8 JPEG, 1 PNG, the MP4
above and one Google Doc. Reconciled by inspecting the assets themselves, not by counting:

- the **two black-and-white Sacred Heart cathedral frames are gone from Drive and are now deleted from the website** —
  `002-vientiane-01-cathedral-nave.jpg` and `002-vientiane-02-sacred-heart.jpg` are removed from the repository (they answer
  404), and no page, array, poster or thumbnail names them;
- seven of the folder's photographs are, frame for frame, the ones the site already carried (verified by image comparison, not
  by file name) and keep their files;
- **IMG_2778.JPG** → `002-vientiane-10-aerial-dusk.jpg` (Vientiane from the air at dusk) — new, and the chapter's opening frame;
- **80f5047d-9acf-4f65-958f-070ec849495c.png** → `002-vientiane-11-patuxai-from-above.jpg` — **this file is a photograph taken
  from directly above Patuxai, not a map**; it is placed beside the Patuxai frame as the photograph it is. The Google Doc *"Die
  Sehenswürdigkeiten in Vientiane auf einer Karte"* was not turned into media, and the map of Laos on the first page is
  unchanged (it is a different asset — see §3).

The Vientiane gallery is therefore **nine photographs**, in the chapter's reading order, in the one carousel the destination
chapters already use (`assets/refgal.js`: arrows, swipe, keyboard, a quiet count — now "1 / 9"). No duplicate rendering
anywhere, no destination fallback, no substituted temple or church.

## 6 · After the Wedding — the whole folder, as a gallery

Folder **004 - City - Lijiang 02** (`1k9cliGiXWyHIp8tHsppcCb-bFw523LD6`): nine photographs, all nine placed, in the Owner's own
order, as `004-lijiang-aw-01 … -09.jpg`. The card on the first page keeps its title, its dates, its words and *Discover more*;
the single static image is replaced by one card gallery (`assets/cardgal.js`):

- fine-line chevrons at the left and right edge, quiet at rest, present on hover, touch or focus, with a 46 × 64 px target;
- swipe left / right on a touch screen — and a swipe never follows the card's link;
- ← and → on a keyboard, the chevrons reachable by Tab, each named;
- a restrained **1 / 9** at the foot of the frame;
- the last frame wraps to the first and back;
- **no autoplay and no timer** — the guest turns the page;
- every frame is still the same link to the journey; only the first photograph is fetched at once, the next one quietly ahead.

## 7 · Media integrity

Every file comes from the current Drive original, mapped to exactly one slot, with its Drive id recorded in
`assets/images/ASSET-MAP.md`. JPEG, long edge ≤ 1600 (the card gallery ≤ 1280 — the frame is never wider than 652 px), source
ratios preserved, EXIF stripped (verified in the unit suite), no screenshot published as an asset, no stale or rejected asset
left behind. The card gallery lazy-loads eight of its nine frames; the hero still fetches its next photograph only just before
its turn.

## Checks

Unit **467 / 467** (new `test/hero-map-media.test.mjs`: the map's rules and the map's own file, the Vientiane reconciliation and
the deleted church frames, the film's streams and budget, the card gallery's contract) · gates **27 / 27** (including L1
localization — the new labels carry DE · TH · JA — V1 card clips, C1 fingerprints, I1 infrastructure).
Stage E2E `docs/acceptance/2026-09-22-hero-map-media/e2e.mjs`: **20 / 20** at 390 · 834 × 1194 · 1194 × 834 · 1440, with the
screenshots in `stage/` (and `live/` for production).

## The proof (live)

Implementation commit `baa75e2` · Worker version **39c53510-4e19-4fe0-bc5f-faadd9a3325b** (Workers Build on push to `main`,
live 105 s after the push).

- **The suite on production: 20 / 20** — the hero (`SIYL_HERO.HOLD === 3000`, 3.0–3.3 s measured between two turns it makes by
  itself, five dots named *Photograph n of 5*, each selecting its own photograph, the clock restarting on a choice, the arrow
  keys, the dots over the picture and clear of the words, the frame still 1000 × 667 with no sideways scroll, reduced motion
  still and answerable); the map at all four viewports (the table in §3, `contain`, ratio 0.855, inside the viewport, no
  overflow); Vientiane (nine frames, the two church files answering **404**, the new film playing muted, the label changed);
  After the Wedding (nine frames, chevrons, wrap 1 → 2 … 9 → 1, "1 / 9", the keyboard, the swipe that turns without following
  the link, all nine files 200, and nothing turning by itself over 5 s). Screenshots at 390 · 834 × 1194 · 1194 × 834 · 1440 in
  `live/`, the stage's in `stage/`.
- **Parity** 294 / 294 · **release-014 live read-only walk** 25 / 25 · **infrastructure guard (live)** intact.
- **Production data untouched**: the read-only aggregate before and after the deploy is identical — rooms 36 → 36, seating
  12 → 12, drafts 15 → 15, KV registration keys 56 → 56, digest `9d6851af9fbe…` → `9d6851af9fbe…`, profile photos 8 → 8. The
  13A/13B seat question is still open and untouched.
- **Codex review**: PENDING — EXTERNAL QUOTA LIMIT.
