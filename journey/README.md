# /journey/ — the scroll-world experience

Self-contained scroll-scrubbed six-scene journey. Source of truth for production
planning lives in the local workspace (`~/Desktop/scroll.website`); this folder is the
deployable build. Served at `/journey/` on both GitHub Pages and the Worker — all
asset URLs are relative, so the repository subpath needs no configuration.

## Media replacement contract (no source edits, ever)

Every media file below currently contains a neutral placeholder. To ship the real
Higgsfield assets, overwrite the file with the SAME NAME (produced by the pipeline in
`scroll.website/scripts/`, encoded to the same specs) and push:

```
journey/assets/images/optimized/scene-01-bangkok-still.webp    (3:2 still, q84)
journey/assets/images/optimized/scene-02-arrival-still.webp
journey/assets/images/optimized/scene-03-mekong-still.webp
journey/assets/images/optimized/scene-04-alms-still.webp
journey/assets/images/optimized/scene-05-ceremony-still.webp
journey/assets/images/optimized/scene-06-manda-still.webp

journey/assets/video/optimized/scene-0N-<slug>-leg.mp4         (1080p, crf 20, -g 8, faststart, no audio)
journey/assets/video/mobile/scene-0N-<slug>-leg-m.mp4          (720p,  crf 23, -g 4, faststart)
journey/assets/video/posters/scene-0N-<slug>-poster.webp       (first frame OF the optimized encode)
journey/assets/video/posters/scene-0N-<slug>-poster-m.webp     (first frame OF the mobile encode)
```

Slugs, in order: `scene-01-bangkok`, `scene-02-arrival`, `scene-03-mekong`,
`scene-04-alms`, `scene-05-ceremony`, `scene-06-manda`.

Posters MUST be extracted from the corresponding encodes (never from the stills) and
each replacement must pass the 5-seam SSIM gate
(`scroll.website/scripts/validation/ssim-seam-check.sh`) before pushing.

## Files

- `index.html` — shell (typography, SEO copy block, quiet closing, meta/favicons)
- `scrub-engine.js` — scroll-world scrub engine (verbatim from the skill; don't fork)
- `scroll-world.config.js` — six-scene config; media paths are FINAL filenames
- `site.webmanifest`, `assets/icons/`, `assets/og/` — identity and sharing meta
