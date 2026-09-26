# Asset Inventory

Single source of truth: every static asset in the repo, where it lives, and where
it is used. Rule: **every file under `assets/` must be referenced by `index.html`;
orphans are deleted.** Verified programmatically (52 referenced / 52 present / 0
orphans) on 2026-07-16.

## Conventions

- All references in `index.html` use **relative paths from the repo root**
  (`assets/images/hero/img-hero.jpg`). No bare root-level filenames.
- `build/standalone.html` is a **generated artifact** (never edit by hand);
  regenerate with `npm run build:standalone` after any change to `index.html`
  or the assets.
- New images go into the matching purpose folder below. If a new section is
  added, add a new folder, not root-level files.

## Fonts (`assets/fonts/`, 3 files)

| File | Used by |
|---|---|
| PPEditorialOld-Ultralight.otf | Display headlines (`font-weight: 200`) |
| PPEditorialOld-Regular.otf | Serif emphasis (`font-weight: 400`) |
| PPEditorialOld-Italic.otf | Italic notes / footer ask |

Hanken Grotesk (body sans) is loaded from Google Fonts, not stored locally.

## Vendor JS (`assets/vendor/`, 3 files)

| File | Purpose |
|---|---|
| gsap.min.js | Core animation |
| ScrollTrigger.min.js | Scroll-linked reveals/parallax |
| SplitText.min.js | Headline line-split reveals |

Site degrades gracefully without them (`?static` param / no-GSAP fallback).

## Images (`assets/images/`, 46 files)

| Folder | Files | Used in section |
|---|---|---|
| hero/ | img-hero.jpg, wide-aerial.jpg | Hero background, Aerial interlude (CSS backgrounds) |
| story/ | img-story-1.jpg, img-story-2.jpg | "Our story" collage |
| timeline/ | tl-cruise.jpg, tl-alms.jpg, tl-ceremony.jpg, tl-dinner.jpg | Weekend timeline stops |
| cards/ | card-room.jpg, card-pool.jpg, card-manda.jpg | Places cards |
| preview/ | pv-stay-1/2.jpg, pv-pool-1/2.jpg, pv-manda-1/2.jpg | Place detail panels |
| dressguide/ | dg2-cruise-1..8.jpg, dg2-alms-1..8.jpg, dg2-ceremony-1..12.jpg | Dress-guide galleries |
| dining/ | dn-lunch.jpg | Sunday-lunch dining row |

WebP note: performance-critical images may carry a sibling `.webp` next to the
`.jpg` (same name). The `.jpg` stays the canonical source and fallback.

## Verification (run after changes)

```bash
python3 - <<'EOF'
import re, os
html = open('index.html').read()
refs = set(re.findall(r'(?:src|srcset|href)="(assets/[^"\s]+)', html)) | set(re.findall(r"url\('(assets/[^']+)'\)", html))
files = {os.path.join(r, f) for r, _, fs in os.walk('assets') for f in fs}
print('missing:', sorted(refs - files) or 'none')
print('orphans:', sorted(files - refs) or 'none')
EOF
```

## Hero media sync (Owner, 26 Sep 2026)

The first page's Hero is the Drive folder **`000 - Hero Image`**, and nothing else. The request "Synchronize Hero media." means the following:

1. **List the folder.** Compare it with `src/hero-media.json` by **Drive file id**, using `modifiedTime` and `size` to detect changes.
2. **Download each new or changed file.** The Drive connector fails above ~7 MB, so a larger file comes from the Owner as an upload with the identical byte size.
3. **Place the media.**
   - Kind comes from the actual file: `image/*` is an image, `video/*` is a video.
   - Order is the Drive titles, ascending, unless the record carries an explicit Owner order (`"order": "explicit"` with its `orderNote`; since 26 Sep 2026 the main video plays last, at Haruthai's request). Keep an explicit order when syncing: a new file is added where the Owner says.
   - The local asset is named after its position (`hero-NNN…`).
4. **Prepare the assets.**
   - **Images:** re-encode at their own size with no metadata (`magick -auto-orient -strip -interlace Plane -quality 84`).
   - **Videos:** remux losslessly with the index first (`ffmpeg -c copy -movflags +faststart`). Keep the audio track if the source has one. Take a poster from the film's first frame.
   - **Audio flag:** record `audio` from `ffprobe`.
5. **Update the record.** Record each item's focal points (`p` phone · `tp` tablet portrait · `tl` tablet landscape · `d` desktop) and set `syncedAt`.
6. **Rebuild and retire.**
   - Run `node src/build-hero.cjs` to rewrite the Hero block of `index.html`.
   - Delete the assets of files that left the folder.
   - `test/hero-show.test.mjs` pins the record, the markup, the audio tracks and the retired files.

**Rules:**
- Drive files are never renamed, moved or changed.
- No Drive id or URL ever reaches a page: `src/` is not served.
- The Hero's behaviour lives in `assets/hero-show.js`: a film always starts muted, Play/Pause appears on every film, and Sound on/Mute only on a film with an audio track.
