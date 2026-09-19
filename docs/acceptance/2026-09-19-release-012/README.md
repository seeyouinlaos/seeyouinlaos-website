# Release 012 — The Journey media model · the media taxonomy · the Riverside Hotel (Owner, 19 Sep 2026)

The Owner's visual review of the live public The Journey pages found a systematic media-selection problem. This release
corrects the media model rather than individual screenshots, reconciles the current workbook (`H&S_Wedding_Operations_Master`,
modified 18 Sep 2026 22:00 UTC) and adds the Riverside Hotel throughout. The Bangkok destination clip remains outstanding
(see below). Evidence: `stage/` (the isolated Miniflare worker, synthetic guests only) and `live/` (read-only, written after
the deploy).

## 1 · The Journey — one gallery grammar for every card

`src/stay-media.json` is the new stay media record: one entry per hotel, every frame with its **kind** from the hotel
taxonomy (exterior · architecture · lobby · room · suite · pool · grounds · facilities), its caption and the Owner's Drive
folder it came from. `src/build-stay-media.cjs` writes `assets/stay-media.js` and refuses a record whose frame is of another
kind, missing, uncaptioned, unsourced, duplicated, or whose lead does not show the house (a residence may declare its lead).
`journeys.html` composes every accommodation card from it (`data-stay-gal` = the hotels of the window, in order): Bangkok ·
Before the Wedding shows its three addresses (Sathorn Penthouse · U Sathorn · Shama Yen-Akat, 17 frames, every caption
prefixed with the hotel's name), the Pre-Wedding and Wedding Stays the Souphattra Heritage (8), the Private Residence (4),
the Riverside Hotel (its frame, "Photography to follow"), Wanxiang Yueju (4), Luye Baisha (3), the Siam Kempinski (7). The
transport galleries (the train, MU9646, C86, the return) stay as they were. One grammar for all: previous / next arrows,
swipe (scroll-snap), keyboard (← → Home End on the focused track, `role="group"`, `aria-roledescription="carousel"`), 1 / N,
the first two frames load at once and the rest when the guest moves, the card keeps its geometry (5:4 on the phone, 3:2 in
the desktop media column, as the photograph did), and a second press during the glide lands one frame further — never two.

## 2 · The media taxonomy — See You In Laos is not a food blog

`src/experience-galleries.json` carries `_taxonomy` and a **kind on every frame** (restaurant: interior · architecture ·
exterior · dining-room · design · atmosphere; café and bar: interior · architecture · exterior · counter · atmosphere;
experience: venue; never: food, drink). The category of a place follows its roles. `src/build-experience-galleries.cjs`
refuses a dish, a glass, a kind outside the category or a lead that is not the place; release gate **M1** runs both builders.
The audit viewed every one of the 203 photographs (contact sheets) and removed **46** food and drink close-ups from the served
set — nothing was deleted from the Owner's Drive. What changed, place by place:

| Place | Before | After | Note |
|---|---|---|---|
| Thong Smith | bowl of boat noodles (lead) + 3 dishes | the terrace · the dining room · the facade · the entrance | 4 frames, lead the terrace interior |
| Tang Jai Yang | plated pork (lead) + 2 dishes | the dining room | the Owner's folder (`091`) holds five photographs, four of them dishes — one room frame remains |
| Le Du Kaan | + 2 dish sets, 2 chef collages | the rooftop lounge · the rooftop architecture · the dining room · the skyline at dusk | 4 frames |
| Bar Us | the tray martini (lead) + 4 cocktails | the bar room · the counter | the rejected set is absent from the record, from disk and from the served site |
| Sühring · Dior & LV Café · Phra Nakhon · BKK Social Club · Time Space · Moo Yoo · Whispering · Madeleine · Harudot · ALATi · 3 Merchants · Sona · Lacuna · Lao Derm | dishes and glasses among the frames | interiors, counters, architecture, exteriors only | BKK Social Club gains its bar-room frame (`IMG_3564`, unused before) |

The lead of every restaurant, café and bar is now the place; galleries keep their curated frame ratio (Bar Us, Le Du Kaan
and Thong Smith moved to 3:2 with their landscape leads; Tang Jai Yang to 1:1).

## 3 · Cafés — the source classification

`Restaurant_Experience,Cafe,Bar_Details` lists eight entries under Cafe: Dior and LV Cafe, Time Space Cafe, Moo Yoo Rose
House, Whispering Cafe, Cafe Madeleine, Harudot, Sona Cafe and Bar, Lacuna VTE. The website carried seven — **Moo Yoo Rose
House** was a lunch place only; it now carries the cafe role as well (it stays in Lunch, as the Overview's Day 03 says).
Kaogee Le Triomphe keeps its cafe role beside its restaurant listing: the Overview's Cafe column (Day 06) and the Owner's
folder `128 - Cafe - Kaogee Le Triomphe` carry it as a café. The Cafés rail is exactly that set.

## 4 · The Riverside Hotel (package D3)

From the current workbook: Superior Room With Window, 22 sq.m., floors 2 – 7, six rooms, 27.02 → 01.03.2027 (two nights),
**USD 30 per person per night** (Accommodation_Details "Price per Person" 30 · Budget "30.00 · Approve by Suthep,
20.08.2026"), breakfast included (Overview: Breakfast Yes; description: daily buffet breakfast), both nights the guest's own
(Overview Day 07 and Day 08: Self-Pay). **Source conflict reported:** the Overview's price column says 25 USD; the room sheet
and the budget say 30 — the room sheet is the rate source, as for every other stay. **Imagery:** the Owner's Drive holds no
Riverside Hotel folder or photograph (19 Sep 2026) — the frame reads "Photography to follow" everywhere; nothing was invented
or substituted. Wired: `src/inventory-seed.js` (`riverside/superior-window`, 6 rooms · 2 places, the wedstay stage),
`assets/rooms-data.js` (the stay, its facts, story, groups and amenities from Accommodation_Details), the pricing (USD 60 per
person for the window), `assets/journey.js` (the wedding-window stage carries three ids), the stage maps in the engine, the
client and the emails, the menu, THE HOUSES ("Seven places"), The Journey card with "View the hotel", the room page, My Trip,
My Bag, Review & Send; one stay per window (a Riverside hold and a Souphattra hold replace each other).

## 5 · Tests and E2E

- `test/release-012.test.mjs` (8): the stay media record, The Journey galleries, the media taxonomy (the builder refuses a dish),
  the restaurant audit (Thong Smith · Tang Jai Yang · Le Du Kaan · Bar Us · the retired frames unreferenced and off disk · the
  inventory in step), the café audit, the Riverside Hotel end to end, and — after the Codex passes (`docs/review/013-codex-release-012/`)
  — ONE WEDDING STAY: every switch direction among Souphattra, the private residence and the Riverside against the in-memory
  engine (one Bag line, one total, one hold, readiness clean), the leftover-line paths (remove · sync · decline), a stale
  device's Remove releasing only its own window, a replayed draft copy settled against the engine. `npm test` **362 / 362**;
  release-check with gate M1.
- `docs/acceptance/2026-09-19-release-012/e2e.mjs` (25, `stage/`): the galleries at 320 / 390 / 834 / 1440 (every accommodation card,
  the transport galleries, the ratios, no overflow), the grammar on the Bangkok card at 390 and 1440 (arrows, previous on the
  first frame → the last, Home, →, End, the counter, the three hotel names, lazy frames, no layout shift), swipe on Chromium
  touch and iPhone Safari (WebKit), every frame of both records answering 200, the eight audited restaurant pages carrying no
  dish, the rejected Bar Us frames answering 404, the Cafés rail, the Riverside Hotel from The Journey to the room page to My
  Trip, My Bag and the engine, the hotel switch through the real pages (the Souphattra card and room page name the Riverside
  they replace, one line USD 145, one hold, and back), THE HOUSES at 320 and 834, no console error.
- The release 011, P0 Empty Bag and account-IA suites re-run on fresh stages of the same build: `stage/SUMMARY.txt`
  (52 / 52 · 49 / 49 · 33 / 33).

## 6 · The Bangkok destination clip

Not live. `bangkok-destination.mp4` (H.264 · yuv420p · 720 × 1280 · 15.07 s · 2,637,348 bytes · no audio, converted in the
Owner's ChatGPT workspace at `/mnt/data/bangkok-destination.mp4`) is not reachable from this session: it is not on this
machine and not on the Owner's Drive (searched by name and by type on 19 Sep 2026). The mechanism, the gate V1 and the card
are in place since release 011; the file is the one missing piece. As the Owner offered: once the converted MP4 is placed
where this session can read it — the Drive folder `001 - City - Bangkok` (a 2.6 MB file downloads through the connector) or
any folder on this Mac — it goes live in one commit (`assets/video/bangkok-card.mp4`, `data-video` on the card, gate V1).
