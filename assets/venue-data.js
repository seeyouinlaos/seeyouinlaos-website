/* ============================================================================
   THE VENUE — Souphattra Heritage Vientiane, as the real photographs show it.
   Content and data only; assets/venue.js draws it. Every image is a real Owner
   photograph from the Drive venue library: `drive` is its Drive file id and
   docs/venue/asset-manifest.json carries folder, filename, subject and reason
   (provenance stays out of the guest-loaded file). Nothing here is generated,
   redrawn or reconstructed.

   POSITIONS ON THE AERIAL (Owner rule, 003): a marker sits on the real area it
   names, or it does not exist. `area` is a box in percent of the top-down
   aerial (Heritage_0631); `anchor` is where the label sits. Zones without an
   Owner-marked position carry `area: null` — they are in the legend, with their
   photography and their story, but nothing is drawn on the photograph for them
   until the Owner marks the layout (a data change here, no code).
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
    kicker: 'The venue',
    lede: 'One address for the wedding day and the wedding stay: the heritage houses around the courtyard, the garden, the pool. Seen from above, then close.',
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
      { id: 'lobby', n: '01', label: 'Lobby', title: 'The lobby', when: 'Arrival · 27 February', area: null,
        story: 'Where the weekend begins: the heritage salon with its chandelier and its clock, the lounge with its lamps and its books. Check-in, a first drink, the first faces.',
        photos: [
          { pic: pic('lobby-lounge', [1000, 1600], 1600, 1067, 'The heritage lounge: sofas, lamps and books under tall windows'), drive: '1XVYr1DrvJ4CAafFrL1B-9BvPfsUYTltz' },
          { pic: pic('lobby-clock', [800, 1200], 1200, 1200, 'The chandelier and the clock above the lobby bar'), drive: '1CMdx_ytO_Uy6oDJkYNdf-iMv0kQv00Ha' },
          { pic: pic('lobby-gallery-wall', [1000, 1600], 1600, 1066, 'A wall of framed botanical prints under the chandelier'), drive: '1pTzQswtYwQv_nL6NTXtNRQyHlkKvmr-6' }
        ] },
      { id: 'rooms', n: '02', label: 'Rooms', title: 'The rooms', when: 'Two nights · 27 February – 1 March', area: null,
        story: 'Twenty-six rooms in the heritage houses, from The Heritage to the Presidential. The first night is your contribution, the second is hosted by Haruthai & Suthep.',
        href: 'journeys.html#j-wedstay', cta: 'Choose your room',
        photos: [
          { single: one(H + 'heritage-balconies.jpg', 2000, 1334, 'The balconies of the heritage houses over the courtyard'), drive: '1TCozr65dNM7EIdesnPLMpJ4lPwevmzpf' },
          { single: one(H + 'heritage-room.jpg', 2000, 1334, 'A room at Souphattra Heritage Vientiane') },
          { single: one(H + 'heritage-lao-reading.jpg', 2000, 1334, 'A book and a folded throw on the bed') }
        ] },
      { id: 'coffee', n: '03', label: 'Coffee & Cake · Breakfast', title: 'Coffee & Cake · Breakfast', when: 'From 12:00 on the wedding day · breakfast every morning', area: null,
        story: 'Back from the temple, coffee and cake in the salon — hosted, unhurried, time to breathe before the vows. Breakfast, on every morning of the stay.',
        photos: [
          { single: one(E + '051-coffee-and-cake-patisserie.jpg', 1334, 2000, 'Cakes and pastries on a tiered stand') },
          { single: one(E + '051-coffee-and-cake-salon.jpg', 2000, 1334, 'The salon where coffee and cake are served') },
          { pic: pic('breakfast-01', [700, 1100], 1100, 1466, 'Breakfast at Souphattra Heritage: eggs, fruit and tea from above'), drive: '1Eaxqak_sWkVphdVeqGD7daO9Jzxzn2zb' },
          { pic: pic('breakfast-02', [700, 1100], 1100, 1466, 'Eggs Benedict and a breakfast setting'), drive: '1Zrjx_EeCDOtdXRpb8AG46h1cgmKR8s7i' }
        ] },
      { id: 'ceremony', n: '04', label: 'Wedding Ceremony', title: 'Wedding Ceremony', when: 'Sunday, 28 February 2027 · 15:30', area: null,
        story: 'The vows, at the green door, in front of everyone who matters. The Bride and the Groom at the front centre; every guest on the chair they chose.',
        href: 'voyage.html#vows', cta: 'The Vow Ceremony',
        photos: [
          { single: one(E + '052-vow-ceremony-green-door-entrance.jpg', 480, 960, 'The green door of Souphattra Heritage, open, with its steps and lanterns'), drive: '1LHfLS0Ys4QV7Jds4PVmoMsvkCSlaAXXG' },
          { single: one(E + '052-ceremony-green-gateway.jpg', 1334, 2000, 'The arched gateway to the green door'), drive: '19ViN_ey9MDoGI9tiDUG4bL3nUgqZjGbc' },
          { single: one(E + '052-vow-ceremony-green-door.jpg', 1334, 2000, 'The carved medallion on the green door'), drive: '17a4zLdwEnyLa8MEbItyB_l1-9rptNyiK' }
        ] },
      { id: 'dinner', n: '05', label: 'Wedding Dinner · Poolside', title: 'Wedding Dinner · Poolside', when: 'Sunday, 28 February 2027 · 19:30',
        area: { x: 39.5, y: 37, w: 20.5, h: 32 }, anchor: { x: 49.7, y: 43.5 },
        story: 'The long table beside the water: run A poolside, run B opposite the pool. A Chinese sharing menu, and the night to follow.',
        href: 'voyage.html#dinner', cta: 'The Wedding Dinner',
        photos: [
          { single: one(E + '053-wedding-dinner-courtyard-from-above.jpg', 1100, 1467, 'The pool terrace from above: the water, the loungers, the hedges'), drive: '13-Z8XT1YrDeUpTTsERIOcpSTSVtzpoKg' },
          { pic: pic('pool-terrace-oblique', [1000, 1600], 1600, 900, 'The pool terrace from the upper floor: umbrellas, loungers, the fountain and the balconies'), drive: '13o95npqGfPMooOpwRqd2kcpB_l83nYJO' },
          { single: one(E + '053-wedding-dinner-courtyard-wide.jpg', 2000, 1334, 'The pool with the heritage houses on every side'), drive: '18OlWqYGHQoaC4LDhcYvVg15WfMW7f9W0' },
          { single: one(E + '053-wedding-dinner-sharing-menu.jpg', 1920, 1920, 'Bamboo steamers of dim sum — the Chinese sharing menu'), drive: '1fkK2P-Hi4Lhw5CygcQS6rlxA3XkF2K5n' }
        ] },
      { id: 'pool', n: '06', label: 'Swimming pool', title: 'The swimming pool', when: 'Every day of the stay',
        area: { x: 41, y: 50, w: 15, h: 17.5 }, anchor: { x: 48.5, y: 59 },
        story: 'The pool at the centre of the courtyard, hedged on every side, loungers along the deck — and the dinner beside it on the wedding night.',
        photos: [
          { single: one(H + 'heritage-courtyard-pool.jpg', 2000, 1334, 'The pool seen from the upper gallery, through the trees'), drive: '1S3-vJ5ZJPSITqsBfcduIDTEnbVvmP-02' },
          { single: one(E + '053-wedding-dinner-courtyard-villa.jpg', 2000, 1334, 'The heritage villa across the pool'), drive: '15A7PQWvP29IVDzGT1eqOntbOOXZQV7Wn' },
          { single: one(E + '053-wedding-dinner-courtyard-loungers.jpg', 2000, 1334, 'Loungers under the trees beside the pool'), drive: '17HNEtxDb9bs7z-iJOpUU7t7i8_Wds-SU' }
        ] },
      { id: 'garden', n: '07', label: 'Courtyard garden', title: 'The courtyard garden', when: 'Between the houses',
        area: { x: 35, y: 8.5, w: 28, h: 33 }, anchor: { x: 49, y: 22 },
        story: 'A lawn, old trees and a small fountain between the heritage houses.',
        photos: [
          { single: one(E + '053-wedding-dinner-garden-terrace.jpg', 1024, 683, 'Garden terrace seating among the greenery'), drive: '1I-08jxAU657329pqJcUpAalRY-UgiEbz' },
          { single: one(E + '053-wedding-dinner-courtyard-gallery-view.jpg', 2000, 1334, 'The courtyard from the upper gallery, through the trees'), drive: '1S3-vJ5ZJPSITqsBfcduIDTEnbVvmP-02' }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
