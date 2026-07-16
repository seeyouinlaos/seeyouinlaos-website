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
