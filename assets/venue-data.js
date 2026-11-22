/* ============================================================================
   THE VENUE — Souphattra Heritage Vientiane: its site plan and its real photographs.
   Content and data only; assets/venue.js draws it. Every photograph is a real
   Owner photograph from the Drive venue library; its provenance (Drive file id,
   folder, filename, subject, reason) lives in docs/venue/asset-manifest.json
   and src/media/manifest.json — never in this guest-loaded file (Media QA
   fails a served page that carries a Drive id).

   THE SITE PLAN (Owners, 22 Nov 2026 · HS-058): the aerial photograph and its
   position markers gave way to an architectural site plan
   (assets/images/venue/souphattra-site-plan.svg), drawn from the hotel's
   official plan — building and area names only, never a room number or an
   allocation. A place of the wedding is drawn on the plan only once its
   position is confirmed; until then every zone below is a legend place, with
   its photography and its story, and nothing is placed on the drawing.
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
    /* the site plan: the drawing (vector), its words — no room number, no allocation, no event position */
    plan: {
      src: V + 'souphattra-site-plan.svg?v=f6bfd246', w: 900, h: 884,   /* ?v= the first 8 hex of the file's sha256 (test/venue.test.mjs keeps it current) */
      alt: 'Site plan of Souphattra Heritage Vientiane: Buildings A to F, the Lobby, the Peacock Bistro, Peacock Court, the pool and the walkways',
      desc: 'A schematic plan, not to scale: Building A with the Lobby, Buildings B to E, Building F with the Peacock Bistro, Peacock Court, the pool and the walkways. Every place of the venue is listed below.',
      caption: 'Site plan · schematic, not to scale', swipe: 'Swipe across the plan',
      enlarge: 'Enlarge the plan', zoomLabel: 'The site plan, enlarged', larger: 'Larger', smaller: 'Smaller', close: 'Close'
    },
    zones: [
      { id: 'lobby', n: '01', label: 'Lobby', title: 'The lobby', when: 'Arrival · 25 or 27 February',
        story: 'The heritage salon with its chandelier and its clock, and the lounge with its lamps and its books — where you check in.',
        photos: [
          { pic: pic('lobby-lounge', [1000, 1600], 1600, 1067, 'The heritage lounge: sofas, lamps and books under tall windows') },
          { pic: pic('lobby-clock', [800, 1200], 1200, 1200, 'The chandelier and the clock above the lobby bar') },
          { pic: pic('lobby-gallery-wall', [1000, 1600], 1600, 1066, 'A wall of framed botanical prints under the chandelier') }
        ] },
      { id: 'rooms', n: '02', label: 'Rooms', title: 'The rooms', when: 'Up to four nights · 25 February – 1 March',
        story: 'Twenty-six rooms in the heritage houses, from The Heritage to the Presidential. On the Wedding Stay, the first night is your cost and the second night is complimentary, hosted by Haruthai & Suthep.',
        href: 'journeys.html#j-wedstay', cta: 'Choose your room', swap: true,   /* private planning: signed out the link reads Open your invitation */
        photos: [
          { single: one(H + 'heritage-balconies.jpg', 2000, 1334, 'The balconies of the heritage houses over the courtyard') },
          { single: one(H + 'heritage-room.jpg', 2000, 1334, 'A room at Souphattra Heritage Vientiane') },
          { single: one(H + 'heritage-lao-reading.jpg', 2000, 1334, 'A book and a folded throw on the bed') }
        ] },
      { id: 'coffee', n: '03', label: 'Coffee & Cake · Breakfast', title: 'Coffee & Cake · Breakfast', when: 'From 12:00 until the ceremony · breakfast every morning',
        story: 'Back from the temple, coffee and cake from 12:00 until the ceremony, hosted by Haruthai & Suthep — time to breathe before the vows. Breakfast is served here every morning of the stay.',
        photos: [
          { single: one(E + '051-coffee-and-cake-patisserie.jpg', 1334, 2000, 'Cakes and pastries on a tiered stand') },
          { single: one(E + '051-coffee-and-cake-salon.jpg', 2000, 1334, 'The salon where coffee and cake are served') },
          { pic: pic('breakfast-01', [700, 1100], 1100, 1466, 'Breakfast at Souphattra Heritage: eggs, fruit and tea from above') },
          { pic: pic('breakfast-02', [700, 1100], 1100, 1466, 'Eggs Benedict and a breakfast setting') }
        ] },
      { id: 'ceremony', n: '04', label: 'Vow Ceremony', title: 'Vow Ceremony', when: 'Sunday, 28 February 2027 · 15:30',
        story: 'The vows, at the green door, in front of everyone who matters — the Bride and the Groom at the front centre, and every guest in the seat they chose.',
        href: 'voyage.html#vows', cta: 'The Vow Ceremony',
        photos: [
          { single: one(E + '052-vow-ceremony-green-door-entrance.jpg', 480, 960, 'The green door of Souphattra Heritage, open, with its steps and lanterns') },
          { single: one(E + '052-ceremony-green-gateway.jpg', 1334, 2000, 'The arched gateway to the green door') },
          { single: one(E + '052-vow-ceremony-green-door.jpg', 1334, 2000, 'The carved medallion on the green door') }
        ] },
      /* THE WEDDING DINNER on the map is an INDEX ENTRY (Owner, 21 Sep 2026 · the consolidation): the place, the time, the seating
         of the one long table, and the way to the one detail (#dinner) — no photographs here; the dinner's photographs live in the
         one record, assets/wedding-dinner.js, and are shown once, in the detail's gallery */
      { id: 'dinner', n: '05', label: 'Wedding Dinner · poolside', title: 'Wedding Dinner · poolside', when: 'Sunday, 28 February 2027 · 19:30',
        story: 'The long table beside the water — side A along the pool, side B facing it.',
        href: '#dinner', cta: 'The Wedding Dinner', index: true,
        photos: [] },
      { id: 'pool', n: '06', label: 'Swimming pool', title: 'The swimming pool', when: 'Every day of the stay',
        story: 'The pool at the centre of the courtyard, hedged on every side, loungers along the deck — and the dinner beside it on the wedding night.',
        photos: [
          { single: one(H + 'heritage-courtyard-pool.jpg', 2000, 1334, 'The pool seen from the upper gallery, through the trees') },
          { single: one(E + '053-wedding-dinner-courtyard-villa.jpg', 2000, 1334, 'The heritage villa across the pool') },
          { single: one(E + '053-wedding-dinner-courtyard-loungers.jpg', 2000, 1334, 'Loungers under the trees beside the pool') }
        ] },
      { id: 'garden', n: '07', label: 'Courtyard garden', title: 'The courtyard garden', when: 'Between the houses',
        story: 'A lawn, old trees and a small fountain between the heritage houses.',
        photos: [
          { single: one(E + '053-wedding-dinner-garden-terrace.jpg', 1024, 683, 'Garden terrace seating among the greenery') },
          { single: one(E + '053-wedding-dinner-courtyard-gallery-view.jpg', 2000, 1334, 'The courtyard from the upper gallery, through the trees') }
        ] }
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
