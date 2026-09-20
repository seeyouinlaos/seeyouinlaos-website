# The Lijiang film, uncut and with sound · the Destination galleries' left edge (Owner, 21 Sep 2026)

## Video
- **Replaced:** the Lijiang chapter's frame on `destination.html` — the silent card clip `assets/video/china-card.mp4`
  (the earlier upload of the stage show; it remains on the home page's China card, untouched, and passes gate V1 there).
- **New asset:** the Owner's supplied film → `assets/video/lijiang-impression.mp4` — uncut (48 s), H.264 High yuv420p 1024 × 436
  (the source's baked-in letterbox bars cropped: 1280 × 544 of 1280 × 720, the phone's rotation tag honoured), AAC stereo 112 kb/s,
  faststart, 5.6 MB; poster `assets/images/city/004-lijiang-impression-poster.jpg`. Original in `_asset_originals/004-lijiang-clip/`.
- **Component:** `assets/clip.js` (new) on the chapter's own frame (same place, same 4:5 / 16:10 / 16:9 treatment, the film covers
  it, the poster beneath — never a black plane; the source is attached only as the frame approaches). `playsinline` · `loop`.
  Autoplay when ≥ 40 % of the frame is in view — **with sound where the browser permits, muted where it refuses** (the SOUND ON
  pill then says so; after the guest's Play or Sound on, sound follows). Leaving the viewport pauses, returning resumes at the
  same second. **A manual PAUSE wins** for the page session (sessionStorage): the viewport never restarts it; only PLAY does.
  Reduced motion: no autoplay, the poster and PLAY. Controls: PLAY / PAUSE and SOUND ON / MUTE, the website's pills, touch-sized,
  `aria-label` + `aria-pressed`.
- Verified on the stage (`clip-e2e.mjs`): Chromium (default policy and audible-allowed), WebKit iPhone emulation, a simulated
  refusal of audible autoplay (→ muted autoplay, sound after Play), reduced motion — resume without reset, manual pause across
  scroll, Play resumes, Sound toggles, loop and playsinline set, poster present, no console error.

## Destination galleries
- **Root cause:** the shared carousel's track rule (`.acar .atrk` / `.atrk`) carries the editorial gutter (`padding: 0
  var(--a-gut)` · `scroll-padding-left`); inside the chapter the earlier override only cleared the long-hand properties and could
  be out-ranked by the shorthand — the first photograph then rested one gutter right of the words' edge.
- **Fix at the component:** `.a-dest .refgal .atrk, .a-dest .acar .atrk { width: 100%; max-width: none; margin: 0; padding: 0;
  scroll-padding: 0 }` stated last, as shorthand; the first slide with no margin; slides snap to the start edge. Nothing else of
  the carousel changed (72 % primary card with the next peeking, arrows, counter, progress rail, swipe, 3:4 crops).
- **Audited:** all four chapters (Bangkok · Vientiane · Kunming · Lijiang) at 320 · 390 · 834 · 1440 in Chromium and WebKit —
  the words' edge, the track and the active photograph on one x (24 · 24 · 44 · 220), the next photograph peeking, no overflow;
  swipe / scroll moves the counter and keeps the active card on the edge.

Proofs: unit 414 / 414 · RELEASE CHECK PASSED (V1: the four silent card clips) · `stage/` screenshots · the deploy that follows.
