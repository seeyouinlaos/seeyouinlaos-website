# The H&S Media Asset Agent

The Owner installed this workflow on 26 Sep 2026. It is the one site-wide workflow that keeps the website's photographs and films in line with the Owner's Drive media library.

The Hero sync of the same day, formerly `src/hero-media.json`, is now collection `001` of the same contract.

| Part | File |
|---|---|
| The contract | `src/media/manifest.json` |
| The rules | `src/media/core.mjs` |
| The engine | `src/media/agent.mjs` |
| The gate | `src/media/media-qa.mjs` (release gate **M2**) |
| The tests | `test/media-agent.test.mjs` |

## The Owner's commands

| The Owner says | The agent does |
|---|---|
| `Synchronize media.` | Every collection in the library (001–030 and any new numbered folder). |
| `Synchronize 152.` | Collection 152 only. |
| `Synchronize 001–030.` | The range, written with an en dash, a hyphen or "to". |
| `Synchronize 011, 013.` | A list of collections. |

- Nothing happens without one of these commands. There is no watcher, no polling, no webhook and no deployment triggered by Drive: an upload to Drive publishes nothing.
- A synchronisation ends in the normal release: a commit on `main`, then Workers Build, then a read-only check of production.
- The infrastructure freeze (`infra/PRODUCTION.json`) applies unchanged.

## What the agent may never do

### 999 - Archive
The Owner's private working area is permanently outside the agent's authority.
- The agent never opens, lists, searches, inspects, reads metadata from, inventories, compares, downloads from or modifies it.
- It is never used as a fallback, a duplicate source, a missing-asset source or a QA input.
- It is excluded **before traversal**: the root listing query itself excludes it, and every later listing is made from explicit folder ids only.
- `core.assertNoArchive` refuses any inventory that reaches it, and Media QA fails if an archive path appears anywhere in the contract.

### Drive
- Drive is **read-only**. Nothing is ever renamed, moved, modified or deleted.
- A Drive change is a separate Owner task.

### Privacy
- No Drive id or URL ever reaches a served file. Media QA scans every page, script, stylesheet and data file for them.
- Folder ids, including the library root, live only in the local, git-ignored `src/media-library.private.json`.
- The committed contract carries file ids only, because change detection needs them.
- No guest, contact or private asset ever enters public media.

## The pipeline

**Drive source → change detection → role → visual inspection → focal decision → responsive processing → existing CI/UI → Media QA → Layout QA → normal release**

1. **List.**
   - Through the Drive connector, read-only.
   - List the numbered folders of the library, with `999 - Archive` excluded in the query itself, then list each collection in scope by its folder id.
   - Write the result as an inventory JSON (`{ folders: [{ no, title, files: [{ id, title, mimeType, size, modifiedTime, path }] }] }`).
2. **Detect changes.**
   - Run `node src/media/agent.mjs plan --inventory inv.json --scope "<the Owner's command>"`.
   - Items are compared by **Drive file id**:

   | Result | Meaning | What happens |
   |---|---|---|
   | changed | other bytes | Inspected again. |
   | renamed | same bytes, new title | The record takes the title; an explicit order never moves. |
   | touched | same bytes and title, new modified time | Confirmed by fingerprint at the sync. |
   | added | new file | Processed. |
   | removed | file gone | Its asset is retired. |
   | replaced | one removed and one added in the same collection | The new file takes the known slot. |
   | reordered | a title-carried order changed, within each subfolder | Positions follow the titles. |

   - The plan also names what is already **pending** and **unresolved** (see below).
3. **Assign the role.**
   - A collection has a place on the site (`place`, `slot`) and a role.
   - Each synchronised item records every **slot** it stands in (`route · role · focal`), taken from where the site actually uses the asset.
   - **The source's aspect ratio never redefines a layout.** The frame belongs to the component, measured per viewport class in `roles.*.geometry`:

   | Class | Viewport |
   |---|---|
   | `p` | phone 390 |
   | `tp` | tablet portrait 834 |
   | `tl` | tablet landscape 1194 |
   | `d` | desktop 1440 |

4. **Inspect.**
   - Run `node src/media/agent.mjs inspect file…`.
   - It reports size, aspect and film streams, and whether the audio is **meaningful** (louder than −60 dB).
   - For images, it detects heads, people and the salient subject with Apple Vision (`src/media/vision.swift`, compiled once into `~/.cache/siyl-media/`).
   - `match` finds which website asset a Drive source already became, using a 256-bit dHash:
     - up to 40 bits: the same photograph;
     - 41–60 bits: the same photograph recropped, confirmed by eye;
     - 80 bits or more: a different photograph.
5. **Decide the focal point.**
   - Run `node src/media/agent.mjs focal --role <role> file`. It suggests an `object-position` per class that keeps every head, or else the subject, inside the frame, and proves it with the same crop rule.
   - **The suggestion is a starting point; the decision is made by looking.** The agent draws every class's frame over the photograph and looks at it.
   - `object-fit: cover; object-position: center` is never used as a substitute for looking.
   - Each finding is resolved in exactly one of two ways:
     - **Refocus:** set `slots[].focal` with its `focalWhy`, where the component shows it (see below).
     - **Record the look:** `review["<route> <role>"] = { verdict: "kept", why, focal }`. A review holds only for the focal point it was judged at, so moving the picture needs a new look.
6. **Process for delivery.**
   - **Images:** `derive --role <role> src outBase` writes responsive JPEG derivatives at the role's own sizes, ×1 and ×2.
     - Never wider than the source, and never upscaled.
     - The canonical source is never downscaled in place.
     - Quality rises from 84 to 95 until SSIM ≥ 0.985: no visible degradation.
   - **Films:** `remux src out.mp4 [poster.jpg]` is a lossless stream copy with the index first, keeping every stream (see the video rules).
7. **Wire into the existing site.** Update the record the site already reads:
   - `src/stay-media.json` (then `node src/build-stay-media.cjs`);
   - `assets/rooms-data.js`, `assets/transport-data.js`, `assets/venue-data.js`;
   - the page markup;
   - `src/build-hero.cjs` for the Hero.

   Then update the contract (`src/media/manifest.json`: the item's `status`, `asset`, `slots`, `display`, `vision`, `syncedAt`) and run `node src/asset-versions.cjs`.
8. **Media QA.** Run `node src/media/media-qa.mjs` (the static gate M2) and `node src/media/media-qa.mjs --rendered --origin <stage>` (films played in WebKit and Google Chrome, and a 206 from `/media/` for byte ranges).
9. **Layout QA.** Required for any change to CSS or to a page's inline `<style>`: re-record `--fast` and `--full` (docs/LAYOUT-QA.md). Focal points carried as data (below) leave the layout fingerprint untouched.
10. **Release.** Run `npm test` and `node src/release-check.cjs`, then commit on `main`, wait for Workers Build, and check production read-only (including `node src/infra-guard.cjs --live`).

## Where a focal point lives (per component)

| Role | Component | The focal point |
|---|---|---|
| `hero-slide` | `.a-hero` (assets/hero-show.js) | Per class in the record (`focal: { p, tp, tl, d }`), written as `--fp-*` by `src/build-hero.cjs`. |
| `destination-gallery-item` | refgal 3 : 4 (assets/refgal.js) | Default `50% 12%`; an exception is `data-focal="x% y%"` on the `<img>` (e.g. Patuxai from above `50% 50%`). |
| `product-gallery` | `.pgal .ph` on journeys.html | `focal` plus `focalWhy` on the frame in `src/stay-media.json` (e.g. the Kempinski lobby `50% 90%`). |
| `editorial-band` | `.a-band` | `background-position` in the band's own style attribute (e.g. the Souphattra arcades `50% 30%`). |
| everything else | cover, centred | Refocus the same way before adding CSS. A CSS selector (the EDIT 7 alley train `72% 50%`) is the last resort, because it re-records the Layout QA. |

## The video rules (hard Owner rules)

- **Video quality is never downgraded.** Output quality is at least the source's perceptual quality; if that cannot be demonstrated confidently, the source is kept.
- **Never:** reduce the bitrate to save bytes; reduce the resolution or frame rate; recompress aggressively; remove or degrade the audio; shorten, trim or re-time a film; drop frames; crop away meaningful content for convenience.
- **The default is a lossless remux:** the first video stream and the first audio stream copied bit for bit, the index first, and the metadata stripped.
- **A re-encode is allowed only if it is proven equal.** It is refused below the source bitrate unless VMAF ≥ 95 is demonstrated. `core.videoRegression` checks all of the following, and the remux deletes its own output on any regression:
  - duration;
  - every video and audio frame;
  - frame rate;
  - resolution;
  - sound;
  - audio bitrate;
  - bitrate.
- **Playback follows the component, never the file** (`manifest.playback`):

  | Mode | Component | Behaviour |
  |---|---|---|
  | `show` | The Hero (assets/hero-show.js) | Starts muted; Play / Pause on every film; Sound on / Mute only with meaningful audio (`data-audio`). |
  | `clip` | The editorial clip (assets/clip.js, `.a-clip-ctl`) | Muted by itself; Play / Pause; Sound on / Mute only with meaningful audio; only the guest's own tap unmutes. |
  | `ambient` | The card and chapter loops (assets/aman.js) | Always muted, no controls, `aria-hidden`, the photograph underneath. A source with sound **keeps it in the file**; the module never plays it. |

- Nothing ever autoplays with sound.
- Films are served through the Worker's byte-range route `/media/<name>.mp4` (206 answers), so Safari plays them.

## Images: resolution and derivatives

- The need is the role's largest box (`roles.*.px`) at device density 2.
- A source below it is **reported**, never upscaled. The report says when the Drive source has more pixels than the site shows, so a sync can deliver them.

## Media QA (gate M2)

**It fails on:**
- an archive path in the contract;
- a folder id in the committed contract;
- a repeated source (unless declared with `sharedWith`);
- a mapped asset missing on disk or unused by the site;
- a film worse than its recorded source;
- a film whose playback does not match its role;
- a film not delivered through the byte-range route;
- a crop finding with neither a refocus nor a recorded look;
- a recorded focal point that the site does not show;
- a Drive id on a served file;
- a retired asset still referenced.

**It reports:** insufficient source resolution and orphaned local media.

The Layout QA (L2) stays the authority on page geometry; Media QA does not duplicate it.

## The Drive connector in practice

- The connector cannot deliver files above about 6 MB (the session expires). A larger file is delivered by the Owner as an upload with the identical byte size, and the agent verifies the size before using it.
- Search pages are small, so a folder is listed page by page to its end.
- Shell hooks block inline fetches, so a download script is written to a file and run with node.
- Playwright's own Chromium has no H.264, so films are checked in WebKit and in Google Chrome (`channel: 'chrome'`).

## The state at installation (26 Sep 2026)

- The library holds 22 numbered collections within 001–030: 001–005, 010–015 and 020–030. Folders 006–009 and 016–019 do not exist.
- They contain 170 media sources: **80 synchronised**, **65 pending** and **25 unresolved**.
- **Synchronised** means each source's website asset, slots, display size, vision and review are recorded.
- **Pending** means the site already has the slot (galleries of The Journey, the wedding photograph, the Bangkok gallery, the chapter galleries). The next `Synchronize media.` (or `Synchronize <no>.`) publishes it, after inspection, focal decisions and Media QA.
  - Pending items were not published during installation. The Owner's rule for the initial build was to replace nothing merely because it exists in Drive.
- **Unresolved** means the Owner must decide the placement; the agent never guesses one. These questions are recorded in the contract:

| No. | Question |
|---|---|
| 002 | Four city films (Bangkok · Vientiane · Kunming · Lijiang) for a rail of three destination cards: does the rail become four cards, and does China show the Lijiang film? |
| 005 | Each chapter folder carries a film: does the chapter card show its film first (muted), or stay photographs only? |
| 010 | Seven portrait photographs and a film for Destinations' opening, which is one still picture today: one chosen photograph, or a slideshow like the first page's Hero? |
| 012 | Nong Khai has no chapter on Destinations: a new chapter, or a place inside Vientiane / The Journey? |
| 015 | Five films and two photographs for Lijiang, which carries the Impression Lijiang film today: which film leads, and do the others form a film gallery? |
| ambient | A chapter film with meaningful sound plays as a silent ambient loop (its sound kept in the file): should it become a clip with Sound on / Mute? |

**Findings at installation:**
- `kunming-card.mp4` had been re-encoded below its source (2.61 → 1.59 Mb/s).
- The audio had been stripped from both chapter films.
- Both were restored losslessly from the Drive originals.
- Gate V1's 4.5 MB cap, which would have forced that downgrade, was removed.
- `assets/venue-data.js` served 15 Drive ids; they were removed, and the provenance stays in `docs/venue/asset-manifest.json` and the contract.
- 42 crop findings across 27 photographs, including the Hero, were looked at on crop sheets of every class:
  - three photographs were refocused (four slots): Patuxai from above, the Kempinski lobby and the Souphattra arcades band;
  - every finding is recorded as kept at its shown focal point, with its reason;
  - no head is cut anywhere.
