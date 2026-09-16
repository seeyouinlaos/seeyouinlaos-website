# Accommodation image quality (Owner, 16 Sep 2026) — live at 030b25d

Drive folder inspected: 14/14, all **U Sathorn Bangkok** (the white colonial pool pavilion, the U-shaped entrance garden, the garden-view room with the picture-frame headboard). No Shama or Penthouse image in the folder.

| Drive | content | placed as |
|---|---|---|
| IMG_4049 (2005×1334) | pool pavilion at dusk | `usathorn/pool-pavilion-dusk.jpg` — **hero**, gallery 1 |
| IMG_4050 (1998×1253) | courtyard pool by day | `usathorn/pool-pavilion-day.jpg` — **card** (every rail), THE HOUSES, gallery 2 |
| IMG_4052 (1200×800) | driveway at sunset | gallery |
| IMG_4053 (678×452) | entrance + U garden | gallery (IMG_2091 is the same frame, smaller) |
| IMG_2087 (1024×651) | lobby | gallery |
| IMG_3861 (1418×817) | the room's entry / television wall | gallery |
| IMG_2088 (700×460) | aerial | imported, not placed (too small for a frame) |
| IMG_2089 · IMG_2090 | smaller duplicates of the dusk / evening pool | not placed |
| IMG_3856 · 3858 · 3859 | identical to the existing bed-terrace / desk-lawn / bed-mirror frames | already in place |
| IMG_4051 | garden pool with a watermark baked in | not placed |

One source map: `assets/rooms-data.js` → `SIYL_STAY_IMAGES` (hero · card · houses · gallery per Bangkok property), read by Your Journey, the journeys page, "Other rooms at …", the bag line and pinned to THE HOUSES (`test/stay-images.test.mjs`). Shama keeps its six frames (hero/card the studio from the entrance); the Penthouse keeps its eleven (hero the living room, card the golden-hour exterior). THE HOUSES now carries the three Bangkok addresses.

Proof (`shots.mjs` → `images-proof.json`, fresh contexts on the Worker, 390 px and 1440 px): `houses-mobile.png`, `houses-mobile-usathorn.png`, `houses-mobile-shama.png`, `houses-desktop.png`, `usathorn-card-mobile.png`, `shama-card-mobile.png`, `your-journey-penthouse-card.png`, `usathorn-detail-hero-mobile.png`, `shama-detail-hero-mobile.png`, `penthouse-detail-hero-mobile.png`, `other-rooms-rail-mobile.png`. Every rendered image URL read from the DOM matches the map; no broken image; no frame from another property.
