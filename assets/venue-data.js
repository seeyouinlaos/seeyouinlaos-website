/* ============================================================================
   THE VENUE — Souphattra Heritage Vientiane, as the real photographs show it.
   Content and data only; assets/venue.js draws it. Every image is a real Owner
   photograph from the Drive venue library: `drive` is its Drive file id and
   docs/venue/asset-manifest.json carries folder, filename, subject and reason
   (provenance stays out of the guest-loaded file). Nothing here is generated,
   redrawn or reconstructed.

   POSITIONS ON THE AERIAL (Owner rule, 003): a marker sits on the real area it
   names, or it does not exist. `marks` are the Owner-marked places of a zone on
   the top-down aerial (Heritage_0631), each a box in percent of the full frame
   with the label's `anchor`; `tall` is the label's anchor on the phone crop
   (26–71 % of the frame), `align` how the label hangs from it there. A zone
   may be marked more than once (the rooms sit in three houses). Zones without
   an Owner-marked position carry `marks: null` — they are in the legend, with
   their photography and their story, but nothing is drawn on the photograph.

   THE OWNER'S FINAL MAPPING (16 Sep 2026, on the same aerial):
     top left building → Lobby · top right building → Rooms · left centre event
     area → Wedding Ceremony · centre pool / poolside → Wedding Dinner · lower
     left building → Coffee & Cake · Breakfast · lower right building → Rooms ·
     lower centre building → Rooms. The swimming pool and the courtyard garden
     stay legend places (photography and story), unmarked.
   ========================================================================== */
(function (root) {
  'use strict';
  var V = 'assets/images/venue/', E = 'assets/images/event/', H = 'assets/images/souphattra/';
  /* a responsive picture: name → the built widths; `single` files carry no widths */
  function pic(name, widths, w, h, alt) { return { name: name, widths: widths, w: w, h: h, alt: alt }; }
  function one(src, w, h, alt) { return { src: src, w: w, h: h, alt: alt }; }

  root.SIYL_VENUE_DATA = {
    id: 'souphattra',
    name: 'Souphattra Heritage Vientiane',
    first: 'dinner',
    kicker: 'The venue',
    lede: 'Coffee & Cake, the vows, the dinner and the Wedding Stay are all here: the heritage houses around the courtyard, the garden and the pool.',
    /* the base photograph: the real aerial, two art directions of the same file */
    base: {
      alt: 'Souphattra Heritage Vientiane from above: the heritage houses with their tiled roofs around the courtyard garden and the swimming pool',
      full: pic('souphattra-aerial', [1000, 1600, 2560], 2560, 1440),
      tall: pic('souphattra-aerial-tall', [600, 800, 1152], 1152, 1440),
      /* the tall crop begins at 26 % of the full frame and is 45 % of it wide (the same height) */
      tallCrop: { x: 26, w: 45 },
      drive: '1VIz9oIZDOUlktJD7pase7e4UilhvsO9j'   /* Copy of Heritage_0631.jpg · 003 - Hotel - Pool & Garden — see docs/venue/asset-manifest.json */
    },
    zones: [
      { id: 'lobby', n: '01', label: 'Lobby', title: 'The lobby', when: 'Arrival · 25 or 27 February',
        marks: [{ x: 12.5, y: 0, w: 21, h: 31, anchor: { x: 23, y: 15 }, tall: { x: 28.5, y: 15, align: 'left' } }],   /* the top left building */
        story: 'The heritage salon with its chandelier and its clock, and the lounge with its lamps and its books — where you check in.',
        photos: [
          { pic: pic('lobby-lounge', [1000, 1600], 1600, 1067, 'The heritage lounge: sofas, lamps and books under tall windows'), drive: '1XVYr1DrvJ4CAafFrL1B-9BvPfsUYTltz' },
          { pic: pic('lobby-clock', [800, 1200], 1200, 1200, 'The chandelier and the clock above the lobby bar'), drive: '1CMdx_ytO_Uy6oDJkYNdf-iMv0kQv00Ha' },
          { pic: pic('lobby-gallery-wall', [1000, 1600], 1600, 1066, 'A wall of framed botanical prints under the chandelier'), drive: '1pTzQswtYwQv_nL6NTXtNRQyHlkKvmr-6' }
        ] },
      { id: 'rooms', n: '02', label: 'Rooms', title: 'The rooms', when: 'Up to four nights · 25 February – 1 March',
        marks: [   /* three houses: top right, lower right, lower centre */
          { x: 62, y: 0, w: 18, h: 40, anchor: { x: 71, y: 20 }, tall: { x: 68.5, y: 20, align: 'right' } },
          { x: 62, y: 50, w: 19, h: 40, anchor: { x: 71.5, y: 70 }, tall: { x: 68.5, y: 86, align: 'right' } },
          { x: 37.5, y: 71, w: 21, h: 29, anchor: { x: 52, y: 85 }, tall: { x: 44, y: 93 } }
        ],
        story: 'Twenty-six rooms in the heritage houses, from The Heritage to the Presidential. On the Wedding Stay, the first night is your cost and the second night is complimentary, hosted by Haruthai & Suthep.',
        href: 'journeys.html#j-wedstay', cta: 'Choose your room', swap: true,   /* private planning: signed out the link reads Open your invitation */
        photos: [
          { single: one(H + 'heritage-balconies.jpg', 2000, 1334, 'The balconies of the heritage houses over the courtyard'), drive: '1TCozr65dNM7EIdesnPLMpJ4lPwevmzpf' },
          { single: one(H + 'heritage-room.jpg', 2000, 1334, 'A room at Souphattra Heritage Vientiane') },
          { single: one(H + 'heritage-lao-reading.jpg', 2000, 1334, 'A book and a folded throw on the bed') }
        ] },
      { id: 'coffee', n: '03', label: 'Coffee & Cake · Breakfast', title: 'Coffee & Cake · Breakfast', when: 'From 12:00 until the ceremony · breakfast every morning',
        marks: [{ x: 12.5, y: 60, w: 21, h: 40, anchor: { x: 23, y: 80 }, tall: { x: 28.5, y: 72, align: 'left' } }],   /* the lower left building */
        story: 'Back from the temple, coffee and cake from 12:00 until the ceremony, hosted by Haruthai & Suthep — time to breathe before the vows. Breakfast is served here every morning of the stay.',
        photos: [
          { single: one(E + '051-coffee-and-cake-patisserie.jpg', 1334, 2000, 'Cakes and pastries on a tiered stand') },
          { single: one(E + '051-coffee-and-cake-salon.jpg', 2000, 1334, 'The salon where coffee and cake are served') },
          { pic: pic('breakfast-01', [700, 1100], 1100, 1466, 'Breakfast at Souphattra Heritage: eggs, fruit and tea from above'), drive: '1Eaxqak_sWkVphdVeqGD7daO9Jzxzn2zb' },
          { pic: pic('breakfast-02', [700, 1100], 1100, 1466, 'Eggs Benedict and a breakfast setting'), drive: '1Zrjx_EeCDOtdXRpb8AG46h1cgmKR8s7i' }
        ] },
      { id: 'ceremony', n: '04', label: 'Vow Ceremony', title: 'Vow Ceremony', when: 'Sunday, 28 February 2027 · 15:30',
        marks: [{ x: 12.5, y: 33, w: 21, h: 26, anchor: { x: 22, y: 56 }, tall: { x: 28.5, y: 40, align: 'left' } }],   /* the left centre event area */
        story: 'The vows, at the green door, in front of everyone who matters — the Bride and the Groom at the front centre, and every guest in the seat they chose.',
        href: 'voyage.html#vows', cta: 'The Vow Ceremony',
        photos: [
          { single: one(E + '052-vow-ceremony-green-door-entrance.jpg', 480, 960, 'The green door of Souphattra Heritage, open, with its steps and lanterns'), drive: '1LHfLS0Ys4QV7Jds4PVmoMsvkCSlaAXXG' },
          { single: one(E + '052-ceremony-green-gateway.jpg', 1334, 2000, 'The arched gateway to the green door'), drive: '19ViN_ey9MDoGI9tiDUG4bL3nUgqZjGbc' },
          { single: one(E + '052-vow-ceremony-green-door.jpg', 1334, 2000, 'The carved medallion on the green door'), drive: '17a4zLdwEnyLa8MEbItyB_l1-9rptNyiK' }
        ] },
      /* THE WEDDING DINNER on the map is an INDEX ENTRY (Owner, 21 Sep 2026 · the consolidation): the place, the time, the seating
         of the one long table, and the way to the one detail (#dinner) — no photographs here; the dinner's photographs live in the
         one record, assets/wedding-dinner.js, and are shown once, in the detail's gallery */
      { id: 'dinner', n: '05', label: 'Wedding Dinner · poolside', title: 'Wedding Dinner · poolside', when: 'Sunday, 28 February 2027 · 19:30',
        marks: [{ x: 39.5, y: 37, w: 20.5, h: 32, anchor: { x: 49.7, y: 43.5 }, tall: { x: 48.5, y: 57 } }],   /* the centre pool / poolside area */
        story: 'The long table beside the water — side A along the pool, side B facing it.',
        href: '#dinner', cta: 'The Wedding Dinner', index: true,
        photos: [] },
      { id: 'pool', n: '06', label: 'Swimming pool', title: 'The swimming pool', when: 'Every day of the stay', marks: null,
        story: 'The pool at the centre of the courtyard, hedged on every side, loungers along the deck — and the dinner beside it on the wedding night.',
        photos: [
          { single: one(H + 'heritage-courtyard-pool.jpg', 2000, 1334, 'The pool seen from the upper gallery, through the trees'), drive: '1S3-vJ5ZJPSITqsBfcduIDTEnbVvmP-02' },
          { single: one(E + '053-wedding-dinner-courtyard-villa.jpg', 2000, 1334, 'The heritage villa across the pool'), drive: '15A7PQWvP29IVDzGT1eqOntbOOXZQV7Wn' },
          { single: one(E + '053-wedding-dinner-courtyard-loungers.jpg', 2000, 1334, 'Loungers under the trees beside the pool'), drive: '17HNEtxDb9bs7z-iJOpUU7t7i8_Wds-SU' }
        ] },
      { id: 'garden', n: '07', label: 'Courtyard garden', title: 'The courtyard garden', when: 'Between the houses', marks: null,
        story: 'A lawn, old trees and a small fountain between the heritage houses.',
        photos: [
          { single: one(E + '053-wedding-dinner-garden-terrace.jpg', 1024, 683, 'Garden terrace seating among the greenery'), drive: '1I-08jxAU657329pqJcUpAalRY-UgiEbz' },
          { single: one(E + '053-wedding-dinner-courtyard-gallery-view.jpg', 2000, 1334, 'The courtyard from the upper gallery, through the trees'), drive: '1S3-vJ5ZJPSITqsBfcduIDTEnbVvmP-02' }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
