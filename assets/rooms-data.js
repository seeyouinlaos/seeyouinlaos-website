/* See You In Laos — STAY / ROOM product data for the open travel shop.
 *
 * One source for journeys.html (discover) and room.html (view → select → add).
 * Facts (size, bed, occupancy, location, amenities, blurbs) come from
 * register/data.mjs — nothing is invented here. Per-person amounts are the
 * approved fixed-window values already live on journeys.html:
 *   Souphattra matrix 145/155/170/240/250/290/750 per window (C 25–27 Feb,
 *   D 27 Feb – 01 Mar, independent) · Kunming 4 × 150 · Lijiang 70/75/100/105/120
 *   · Sathorn 270 · Kempinski 380. Hosted is HOSTED, never USD 0.
 * Every gallery image was visually verified against its room before
 * assignment; a missing slot stays "Photography to follow" — never filled
 * with a wrong-subject image.
 */
(function () {
  'use strict';
  var RM = 'assets/images/rooms/';
  var KMG = 'assets/images/kunming/';
  var LJG = 'assets/images/lijiang/';
  var PENT = 'assets/images/penthouse/';
  var KEM = 'assets/images/kempinski/';
  var HERITAGE_AMENITIES = ['Bathrobe', 'Bathtub', 'Coffee & tea facilities', 'Hair dryer', 'Mini bar',
    'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'WiFi'];
  var HS = '<span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span>';

  function seq(prefix, n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(prefix + i + '.jpg');
    return a;
  }

  window.SIYL_ROOMS = {
    souphattra: {
      name: 'Souphattra Heritage Vientiane',
      place: 'Vientiane, Laos',
      windows: [
        { id: 'prewed', label: 'Pre-Wedding Vientiane', dates: '25 – 27 February 2027', nights: '2 nights fixed',
          bagName: 'Pre-Wedding Vientiane · Souphattra Heritage', bagImg: 'assets/images/souphattra/heritage-courtyard-front.jpg' },
        { id: 'wedstay', label: 'Wedding Stay', dates: '27 February – 01 March 2027', nights: '2 nights fixed',
          bagName: 'Wedding Stay · Souphattra Heritage', bagImg: 'assets/images/souphattra/heritage-arches-dusk.jpg' }
      ],
      includes: [
        'Wedding stay (27 February – 1 March): the amount is your total contribution per guest for the two nights — the first night is your contribution, the second night is hosted by ' + HS + '.',
        'Breakfast is included on both mornings.',
        'A limited number of complimentary alternative stays are also available.'
      ],
      rooms: [
        { slug: 'heritage', name: 'The Heritage', cat: 'Heritage Room',
          desc: 'Colonial French elegance in 31 square metres, with a private balcony over the garden.',
          gallery: [[RM + 'the-heritage-1.jpg', 'Dressing corridor and wardrobe'], [RM + 'the-heritage-2.jpg', 'The bedroom'], [RM + 'the-heritage-3.jpg', 'The bathroom']],
          facts: [['Size', '31 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', '1st–3rd floor']],
          amenities: HERITAGE_AMENITIES, price: 145 },
        { slug: 'heritage-executive', name: 'Heritage Executive', cat: 'Heritage Room',
          desc: 'French colonial rooms with a balcony over the garden, and the flexibility a family needs.',
          gallery: [[RM + 'heritage-executive-1.jpg', 'The bedroom'], [RM + 'heritage-executive-2.jpg', 'Bedroom and balcony'], [RM + 'heritage-executive-3.jpg', 'The bathroom']],
          facts: [['Size', '37–44 sq.m.'], ['Bed', 'King or twin'], ['Occupancy', 'Up to 2 adults · 1 child'], ['Location', 'Garden views · interconnecting rooms where available']],
          amenities: HERITAGE_AMENITIES, price: 155 },
        { slug: 'heritage-grand-premier', name: 'Heritage Grand Premier', cat: 'Heritage Room',
          desc: 'A larger heritage room, with a private balcony over the garden and the pool.',
          gallery: [[RM + 'heritage-grand-premier-1.jpg', 'The bedroom'], [RM + 'heritage-grand-premier-2.jpg', 'The sitting area'], [RM + 'heritage-grand-premier-3.jpg', 'Bedroom towards the balcony']],
          facts: [['Size', '49 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child sharing bedding'], ['Location', 'Garden and pool views']],
          amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'WiFi', 'Bathroom amenities'], price: 170 },
        { slug: 'noble-courtyard', name: 'Noble Courtyard Suite', cat: 'Suite',
          desc: 'A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool.',
          gallery: [[RM + 'noble-courtyard-1.jpg', 'The bedroom'], [RM + 'noble-courtyard-2.jpg', 'Bedroom and desk'], [RM + 'noble-courtyard-3.jpg', 'The living area']],
          facts: [['Size', '63 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Ground floor · central greenery · one suite only']],
          amenities: ['Bathrobe', 'Bathtub', 'Coffee & tea making facilities', 'Hair dryer', 'Mini bar', 'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'WiFi access'], price: 240 },
        { slug: 'grand-majestic', name: 'Grand Majestic Suite', cat: 'Suite',
          desc: 'French colonial and Laotian design: a living room under a high ceiling, and a slower kind of morning.',
          gallery: [[RM + 'grand-majestic-suite-1.jpg', 'The bedroom'], [RM + 'grand-majestic-suite-2.jpg', 'The bathroom'], [RM + 'grand-majestic-suite-3.jpg', 'Living and dining']],
          facts: [['Size', '66–75 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Private balcony']],
          amenities: ['Living room', 'High ceiling', 'Pantry', 'Private balcony', 'Smart TV', 'Mini bar', 'WiFi'],
          price: 250, reserved: 'Reserved for family' },
        { slug: 'souphattra-majestic', name: 'Souphattra Majestic Suite', cat: 'Suite',
          desc: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
          gallery: [[RM + 'souphattra-majestic-suite-2.jpg', 'The living area'], [RM + 'souphattra-majestic-suite-3.jpg', 'The bathroom']],
          facts: [['Size', '84 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 2 children'], ['Location', 'Pool and garden views · one suite only']],
          amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'WiFi'], price: 290 },
        { slug: 'souphattra-presidential', name: 'Souphattra Presidential', cat: 'Suite',
          desc: 'The largest suite of the house: two bedrooms, private bathrooms and a shared living space under a high ceiling.',
          gallery: [[RM + 'souphattra-presidential-1.jpg', 'The main bedroom'], [RM + 'souphattra-presidential-2.jpg', 'The second bedroom'], [RM + 'souphattra-presidential-3.jpg', 'The living space']],
          facts: [['Size', '118 sq.m.'], ['Bed', 'Two bedrooms · king and twin'], ['Occupancy', '4 adults · 2 children'], ['Location', 'One unit only']],
          amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Shared living space', 'Pantry', 'Dining table', 'High ceiling'],
          price: 750, reserved: 'Reserved for bride & groom' }
      ]
    },

    airbnb: {
      name: 'Alternative Stay · Vientiane',
      place: 'Vientiane, Laos',
      windows: [{ id: 'airbnb-2br', label: 'Wedding Stay', dates: '27 February – 01 March 2027', nights: '2 nights',
        bagName: 'Private Residence · Vientiane', bagImg: 'assets/images/airbnb/airbnb-01.jpg' }],
      includes: null,
      rooms: [
        { slug: 'private-residence', name: 'Private Residence', cat: 'Alternative stay',
          desc: 'A warm private residence in central Vientiane, secured for the wedding stay and hosted for a limited number of guests. Guest Relations coordinates the arrangements personally.',
          gallery: [['assets/images/airbnb/airbnb-01.jpg', 'Living and dining'], ['assets/images/airbnb/airbnb-02.jpg', 'The entry'], ['assets/images/airbnb/airbnb-03.jpg', 'The balcony']],
          facts: [['Type', 'Private residence'], ['Sleeps', 'Up to 4'], ['Occupancy', 'Up to 4 adults'], ['Location', 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket']],
          amenities: ['WiFi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
          price: null, status: 'Complimentary · limited availability', interest: true }
      ]
    },

    sathorn: {
      name: 'Sathorn Penthouse Bangkok',
      place: 'Sathorn, Bangkok',
      windows: [{ id: 'bkk-stay', label: 'Before the Wedding', dates: '21 – 24 February 2027', nights: '3 nights',
        bagName: 'Sathorn Penthouse Bangkok', bagImg: 'assets/images/journey/penthouse-01.jpg' }],
      includes: ['Arrival 21 February 2027: personal pickup by Haruthai — hosted.'],
      rooms: [
        { slug: 'penthouse', name: 'Sathorn Penthouse', cat: 'Whole home · six bedrooms',
          desc: 'The shared days in Bangkok before travelling on to Laos — one penthouse for the whole party, capacity 12 adults.',
          gallery: [
            ['assets/images/journey/penthouse-01.jpg', 'The double-height living room at dusk'],
            [PENT + 'living-double-height.jpg', 'The living room by day'],
            [PENT + 'living-above.jpg', 'The living room from the mezzanine'],
            [PENT + 'lounge-corner.jpg', 'A lounge corner'],
            [PENT + 'bedroom-corner.jpg', 'Corner bedroom with skyline view'],
            [PENT + 'bedroom-skyline.jpg', 'Bedroom towards the skyline'],
            [PENT + 'bedroom-courtyard.jpg', 'Bedroom towards the courtyard'],
            [PENT + 'study-nook.jpg', 'The study nook'],
            [PENT + 'balcony-garden.jpg', 'The balcony']],
          facts: [['Home', 'Six-bedroom penthouse'], ['Capacity', '12 adults'], ['Stay', '21 – 24 February 2027 · 3 nights'], ['Arrival', '21 February · personal pickup by Haruthai']],
          amenities: null, price: 270 }
      ]
    },

    kunming: {
      name: 'Wanxiang Yueju · Kunming',
      place: 'Kunming Railway Station MixC Branch',
      windows: [{ id: 'kmg', label: 'After the Wedding', dates: '01 – 04 March 2027', nights: '3 nights',
        bagName: 'Wanxiang Yueju · Kunming', bagImg: 'assets/images/journey/kunming-01.jpg' }],
      includes: null,
      rooms: [
        { slug: 'light-french', name: 'Light French Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Light French Suite · 68 sqm · queen · 2 adults.',
          gallery: [[KMG + 'light-french-1.jpg', 'The suite'], [KMG + 'light-french-2.jpg', 'The living space'], [KMG + 'light-french-3.jpg', 'The suite'], [KMG + 'light-french-4.jpg', 'The suite'], [KMG + 'light-french-5.jpg', 'The suite'], [KMG + 'light-french-6.jpg', 'The suite']],
          facts: [['Size', '68 sqm'], ['Bed', 'Queen'], ['Occupancy', '2 adults']], amenities: null, price: 150 },
        { slug: 'milano', name: 'Milano Minimalist Loft', cat: 'Designer loft · 68 sqm',
          desc: 'Milano Minimalist Loft Double Bed Room · 68 sqm · queen + sofa bed · 2 adults.',
          gallery: [[KMG + 'milano-1.jpg', 'The loft'], [KMG + 'milano-2.jpg', 'The loft'], [KMG + 'milano-3.jpg', 'The loft'], [KMG + 'milano-4.jpg', 'The loft from above'], [KMG + 'milano-5.jpg', 'The sleeping level'], [KMG + 'milano-6.jpg', 'The bathroom']],
          facts: [['Size', '68 sqm'], ['Bed', 'Queen + sofa bed'], ['Occupancy', '2 adults']], amenities: null, price: 150 },
        { slug: 'italian', name: 'Italian Style Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Italian Style Suite · 68 sqm · queen + futon · 2 adults.',
          gallery: [[KMG + 'italian-1.jpg', 'The suite'], [KMG + 'italian-2.jpg', 'From the mezzanine'], [KMG + 'italian-3.jpg', 'The suite'], [KMG + 'italian-4.jpg', 'The bedroom'], [KMG + 'italian-5.jpg', 'The suite'], [KMG + 'italian-6.jpg', 'The kitchenette']],
          facts: [['Size', '68 sqm'], ['Bed', 'Queen + futon'], ['Occupancy', '2 adults']], amenities: null, price: 150 },
        { slug: 'junting', name: 'Junting City-View Loft', cat: 'Designer loft · 68 sqm',
          desc: 'Junting City-View Loft Double Bed Room · 68 sqm · queen · 2 adults.',
          gallery: [[KMG + 'junting-1.jpg', 'The loft'], [KMG + 'junting-2.jpg', 'The loft'], [KMG + 'junting-3.jpg', 'The city view'], [KMG + 'junting-4.jpg', 'The bedroom'], [KMG + 'junting-5.jpg', 'The loft'], [KMG + 'junting-6.jpg', 'The living space']],
          facts: [['Size', '68 sqm'], ['Bed', 'Queen'], ['Occupancy', '2 adults']], amenities: null, price: 150 }
      ]
    },

    lijiang: {
      name: 'Luye Baisha · Lijiang',
      place: 'Baisha, Lijiang · Rizhao Jinshan',
      windows: [{ id: 'ljg', label: 'After the Wedding', dates: '04 – 06 March 2027', nights: '2 nights fixed',
        bagName: 'Luye Baisha · Lijiang', bagImg: 'assets/images/journey/lijiang-01.jpg' }],
      includes: null,
      rooms: [
        { slug: 'snow-mountain-viewing', name: 'Snow Mountain Viewing Room', cat: 'Snow mountain room',
          desc: 'Snow Mountain Viewing Room — per-person amount for the fixed window.',
          gallery: [], facts: [], amenities: null, price: 75 },
        { slug: 'viewing-270', name: '270° Snow Mountain Viewing', cat: 'Snow mountain room',
          desc: '270° Snow Mountain Viewing — per-person amount for the fixed window.',
          gallery: [[LJG + 'view270-1.jpg', 'The room at dusk'], [LJG + 'view270-2.jpg', 'The wraparound windows'], [LJG + 'view270-3.jpg', 'The room at night'], [LJG + 'view270-4.jpg', 'Towards the mountain'], [LJG + 'view270-5.jpg', 'The room'], [LJG + 'view270-6.jpg', 'The bathroom']],
          facts: [], amenities: null, price: 70 },
        { slug: 'private-courtyard-270', name: '270° Private Courtyard Snow Mountain View', cat: 'Snow mountain room',
          desc: '270° Private Courtyard Snow Mountain View — per-person amount for the fixed window.',
          gallery: [[LJG + 'courtyard-1.jpg', 'The room towards the courtyard'], [LJG + 'courtyard-2.jpg', 'Soaking tub and mountain view'], [LJG + 'courtyard-3.jpg', 'The fireplace'], [LJG + 'courtyard-4.jpg', 'The room at dawn'], [LJG + 'courtyard-5.jpg', 'The bathroom']],
          facts: [], amenities: null, price: 100 },
        { slug: 'soup-pool-270', name: '270° Snow Mountain View Room Private Soup Pool', cat: 'Snow mountain room',
          desc: '270° Snow Mountain View Room Private Soup Pool — per-person amount for the fixed window.',
          gallery: [[LJG + 'souppool-1.jpg', 'The room and private pool'], [LJG + 'souppool-2.jpg', 'The bathroom towards the mountain'], [LJG + 'souppool-3.jpg', 'The fireplace and the peak'], [LJG + 'souppool-4.jpg', 'The room at dusk'], [LJG + 'souppool-5.jpg', 'The bathroom'], [LJG + 'souppool-6.jpg', 'The room in the evening']],
          facts: [], amenities: null, price: 105 },
        { slug: 'starry-sky', name: 'Snow Mountain Manor · Starry Sky', cat: 'Snow mountain suite',
          desc: 'Snow Mountain Manor · Starry Sky — per-person amount for the fixed window.',
          gallery: [[LJG + 'starry-1.jpg', 'The suite towards Jade Dragon Snow Mountain'], [LJG + 'starry-2.jpg', 'The round bed and soaking pool'], [LJG + 'starry-3.jpg', 'The suite and the mountain'], [LJG + 'starry-5.jpg', 'The suite at dusk'], [LJG + 'starry-6.jpg', 'The tea corner'], [LJG + 'starry-7.jpg', 'The suite in the evening'], [LJG + 'starry-8.jpg', 'The private plunge pool'], [LJG + 'starry-9.jpg', 'The garden towards the peak'], [LJG + 'starry-4.jpg', 'The bathroom']],
          facts: [], amenities: null, price: 120 }
      ]
    },

    kempinski: {
      name: 'Siam Kempinski Bangkok',
      place: 'Bangkok, Thailand',
      windows: [{ id: 'kempinski', label: 'The Return', dates: '06 – 08 March 2027', nights: '2 nights · breakfast included',
        bagName: 'Siam Kempinski Bangkok', bagImg: 'assets/images/journey/kempinski-01.jpg' }],
      includes: ['Breakfast included on both mornings.'],
      rooms: [
        { slug: 'deluxe-balcony-king', name: 'Deluxe Balcony King', cat: 'Deluxe room · non smoking',
          desc: 'Deluxe Balcony King Room Non Smoking — the coordinated return stay in Bangkok.',
          /* The hotel photography below shows the property — the room category
           * itself has no verified photography yet. */
          gallery: [
            ['assets/images/journey/kempinski-01.jpg', 'The lagoon courtyard from above'],
            ['assets/images/journey/kempinski-03.jpg', 'The lobby'],
            [KEM + 'lobby-staircase.jpg', 'The grand staircase'],
            [KEM + 'lobby-palms.jpg', 'The lobby palms'],
            [KEM + 'facade-garden.jpg', 'The garden facade']],
          galleryNote: 'Hotel photography — room photography to follow.',
          roomPhotoPending: true,
          facts: [['Size', '~37–45 sqm'], ['Bed', 'King'], ['Room', 'Balcony · non smoking']],
          amenities: ['Balcony', 'Non smoking', 'Air conditioning', 'Safe', 'Coffee & tea', 'Wi-Fi', 'Complimentary minibar'],
          price: 380 }
      ]
    }
  };
})();
