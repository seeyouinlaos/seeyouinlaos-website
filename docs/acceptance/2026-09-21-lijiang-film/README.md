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

## Second pass (Owner, 21 Sep 2026): the picture did not move · the galleries still inset on the iPhone
- **Root cause of audio-with-frozen-picture:** the film's `<video>` carried the silent card-clip module's class `am-clip`,
  whose shared rule is `opacity: 0` until that module adds `.am-playing` — the film played (currentTime advancing, sound on)
  at opacity 0 behind the frame's poster. Verified on production before the fix (`opacity: "0"`, `t: 2`, `paused: false`).
  Fix: the film uses its own class (`.a-clip video { opacity: 1; z-index: 1 }`, no pseudo-element over it); the controls
  alone sit above. Control state now comes from the element (`playing` / `pause` / `waiting` / `timeupdate`, PLAYING only
  when not paused, not ended and past the first frame), with a 3-second no-advance watchdog that says PLAY.
- **Asset (unchanged, verified deployed):** H.264 High@4.0 (avc1) yuv420p 1024 × 436 30 fps + AAC-LC stereo (mp4a), faststart —
  Safari-safe; served `video/mp4`, byte ranges honoured.
- **Frames advance:** canvas signatures of the rendered video at two timestamps differ in Chromium and WebKit (iPhone
  emulation); a paused film keeps one frame; loop returns from 47.6 s to the start; controls read PAUSE only while playing.
- **Galleries:** the extra inset on the iPhone is the shared carousel track's own gutter (`.atrk { padding: 0 var(--a-gut) }`,
  `.acar .atrk { width: calc(100% − 2·gut); margin: auto }`) that the stylesheet override did not defeat on that engine. Now the
  chapter's track geometry is stated (a) `!important` at the end of the sheet and (b) **inline by `refgal.js`** on the track and
  the controls row (padding · margin 0, width 100 %, scroll-padding 0), and (c) measured after layout: if the first photograph
  still does not rest on the words' edge, the difference is taken out. Rendered at 390: eyebrow · title · body · first
  photograph · controls row all at x = 24 for Bangkok, Vientiane, Kunming, Lijiang (320: 24 · 834: 44 · 1440: 220), Chromium
  and WebKit; next photograph peeking, gap kept, swipe / arrows / counter / rail intact, no overflow.
