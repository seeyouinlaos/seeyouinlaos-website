# THE FINAL CONSOLIDATED CLOSE-OUT PASS (Owner, 21 Sep 2026)

Five items closed together on the one Worker, real guests active, nothing reset.

## 1 · The first-page hero — the same hero, now a slideshow

The existing hero frame, position, words and layout are untouched. The courtyard (`assets/images/hero/home-hero-courtyard.jpg`,
the `.am` background) is slide 1 and is on screen at once, with no script. Four layers of the same frame follow — the Owner's
Drive folder `1s8AhGJ3IMfklMrVA2QLLFxrAhBoN_VQk`, the JPGs only (the MP4 untouched):

| slide | file | source | focal point |
|---|---|---|---|
| 1 | home-hero-courtyard.jpg | the current hero | as before |
| 2 | home-hero-02.jpg | IMG_2584.JPG | 50% 55% |
| 3 | home-hero-03.jpg | IMG_2585.JPG | 50% 30% |
| 4 | home-hero-04.jpg | IMG_2586.JPG | 50% 36% |
| 5 | home-hero-05.jpg | IMG_2587.JPG | 50% 38% |

then the courtyard again, for ever. Five slides. `assets/hero-show.js`: 5000 ms per picture, a 1000 ms opacity crossfade
(`assets/aman.css` · `.a-hero-slide`), cover with a per-image position, no zoom, no slide, no controls, no captions. The
next frame is fetched only shortly before its turn. `prefers-reduced-motion: reduce` keeps the courtyard (state `still`).
A hidden tab stops the clock; on return at most the one frame that was due is shown, then the normal cadence — never a
jump. The four frames were re-encoded without any EXIF (no location, no device). Verified at 320 · 390 · 834 · 1440: the
same frame size and the same word position on slide 1 and slide 2, no overflow.

## 2 · The accommodation media rule — code level

`assets/rooms-data.js` · `SIYL_STAY_ART`: `propertyId → approved(propertyId)` — the property's own record in
`src/stay-media.json`, its rooms' galleries and cards, its windows' Bag frames, each inside the property's own folders
(`STAY_FOLDERS`); a `NEVER` list refuses destination and Highlights folders and the retired mountain frame whatever
folder it sits in. `card(stay, slug)`, `house(stay)`, `bag(stay, slug, window)` return the frame or `''` — the intentional
no-photo state; there is no second path to any other source. Every rail reads it: `journeys.html`, `your-journey.html`,
`room.html`, `profile.html`, `assets/pricing.js` (the Bag line). THE HOUSES' static cards are checked against the same set.

**Luye Baisha · Lijiang**: the record was one frame — Jade Dragon Snow Mountain over the Baisha rooftops. That is
destination photography and stands for no hotel: retired (`assets/images/lijiang/snow-mountain-viewing-1.jpg` deleted).
The hotel's approved assets are its rooms (the Owner's Drive folder 024): the record now leads with the 270° room at dusk
(`lead: room`, with its reason) and carries five more room frames; the Bag frame, THE HOUSES card and the Journey gallery
show the room. The Snow Mountain Viewing Room's own three frames (the Owner's ruling of 21 Sep) are unchanged.

Audited (test/stay-art.test.mjs · the close-out E2E on the rendered pages): Sathorn Penthouse · U Sathorn · Shama ·
Souphattra (Pre-Wedding and Wedding) · Riverside · Guest House · Wanxiang Yueju · Luye Baisha · Siam Kempinski — every
rendered frame its property's own; zero destination, city, mountain, Highlights, other-hotel or keyword fallback; a
missing mapping resolves to nothing.

## 3 · The mobile booking smoke test (WebKit · iPhone 13, the stage)

A Wedding + Guest House → D alone, USD 0 · Complimentary, the trip complete. B Wedding + Souphattra The Heritage → USD 145
per night, 2 nights, the second hosted, USD 145 total (never 290); the category switches (Grand Premier 170, back to 145);
one hold for stage D. C China only → F G H, the train mandatory (no decline; open = incomplete; chosen = complete, USD 455).
D Join all → A – J, View All Steps and Review agree, no package UI. E Not joining → everything cleared, WE'LL MISS YOU,
SEND MY RESPONSE → NOT JOINING, reconsider; the partner's room and answer untouched.

## 4 · The server-side completion gate

The Worker's own answer (no UI): China with F/H answered and G missing → `422 · incomplete` (`unresolved: c86`); with the
train → 202. The wedding attending the dinner with no seat → `422` (`seat:dinner`); with the seats → 202.

## 5 · Passport / travel documents — the real feature, traced

`POST /api/document` is implemented: the invitation's bearer, `owns()` (the partner of the same COUPL is refused), a
passport or a flight, JPEG · PNG · HEIC · HEIF · WebP · PDF, 12 MB, SHA-256, the object under
`doc/<invitation>/<guest>/<kind>/…` with the guest's metadata, RECEIVED and nothing more; there is deliberately no read
route (GET 405), nothing in KV, in the repository or in a log. The iPhone picker exists (`<input type="file" accept=…>`,
ADD PASSPORT), a photograph is chosen and posted.

**Status: implemented but NOT ENABLED in production.** The Worker's private object store binding `DOCS` is not configured
(`wrangler.jsonc` has no R2 bucket), so the live endpoint answers `503 · enabled:false` and the guest is told: "We cannot
accept documents on the website yet. Nothing was sent and nothing was stored. Your trip can still be sent — Guest Relations
will ask you for this directly." — which is what the guest reported. No false receipt is ever shown.

**OWNER DECISION REQUIRED** (each is infrastructure or an authorization architecture, both frozen and undefined):
1. the private object store: an R2 bucket bound as `DOCS` on the one Worker (an infrastructure change under the freeze);
2. Guest Relations retrieval: which credential reads a document and how (today: none — the `x-gr-token` operations CLI
   `src/gr.cjs` could carry a read op, never a browser URL), and the audit of each read;
3. the retention period and the deletion after the wedding.
Until decided, the safe state stands: nothing stored, nothing exposed, the guest told the truth.

## 6 · First / last name editing

Verified (guest-name E2E 9/9 · the close-out E2E): First Name and Last Name are editable profile fields for every
authenticated guest; changing them keeps the guest id, invitation, party, CON and COUPL; the new name reads on My Trip,
Who Sits Where (the seat holder renamed in the engine), Review & Send and the Guest Relations record; the partner's name
and record are untouched.

## 7 · Preserved

The Lijiang film (`[data-clip]`: Play · Pause · Sound, playsinline, loop, the frames visible) and the destination galleries
at 390 (content edge 24 = every gallery 24, arrows, counters) verified unchanged in the close-out E2E.

## Live (21 Sep 2026)

Commit `f2969b9` pushed to `main` → Workers Build → version `64100a96-66b7-426a-b6b3-ea22ca90d08b` (09:38:47Z) on the one Worker
`seeyouinlaos-website` (https://seeyouinlaos-website.suthep-hrg.workers.dev). Parity 262/262 (`live/parity.json`), live-ro
25/25 (`live/live-ro.json`), infra freeze intact (GitHub Pages 404). Live, read-only: the hero markup and module served, the
four frames 200 image/jpeg; in real WebKit (iPhone 13) slide 2 after ~5 s in the same 342 × 342 frame, at 1440 likewise
(`live/live-iphone-hero-*.jpg`, `live/live-1440-hero-2.jpg`); `SIYL_STAY_ART` served, the Luye Baisha record leads with
its room, the mountain frame 404, THE HOUSES and the Journey gallery show the room (`live/live-journeys-ljg.jpg`);
`/api/document` unauthenticated 401, GET 405. Production aggregates read-only before (08:36Z) and after (09:41Z),
`live-aggregates.json`: 32 room occupancies (the same by stage) · 0 waitlisted · 12 seat holds · 13 drafts / 104 actors ·
44 KV keys — **unchanged**; no reset, no synthetic activity on the live Worker.

Codex: PENDING — EXTERNAL QUOTA LIMIT (usage limit until 24 Sep 2026 22:19 CEST; the probe refused twice).
