/* See You In Laos — STAY / ROOM product data for the open travel shop.
 *
 * One source for journeys.html (discover) and room.html (view → select → add).
 * Facts (size, bed, occupancy, location, amenities, blurbs) come from
 * register/data.mjs — nothing is invented here. Per-person amounts are the
 * approved fixed-window values already live on journeys.html:
 *   Every room carries `rate` — the Owner-approved per-person / per-night
 *   amount from the current Accommodation_Details ("Price per Person"). The
 *   per-person total for a window is rate × nights and is computed in exactly
 *   one place, assets/pricing.js. Hosted is HOSTED, never USD 0.
 *
 * Merchandising order (Owner rule 07 Sep 2026): comparable paid options are
 * presented HIGHEST PRICE FIRST, entry option last; categories without an
 * Owner-approved guest amount follow, ordered by the operational rate. The
 * Journey Bag itself stays chronological.
 *
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
      breakfast: 'Breakfast included',
      /* SOURCE OF THE SOUPHATTRA PRICE BASIS — verified 08 September 2026 against
       * H&S_Wedding_Operations_Master:
       *   Accommodation_Details, row "Price Per Room per NIght" = 290 and row
       *   "Price per Person" = 145 for The Heritage → 145 is the PER PERSON,
       *   PER NIGHT share of the room rate (the same construction as the
       *   Sathorn Penthouse, 180 per room / night ÷ 4 = 45 per person / night).
       *   Accommodation_Details, row "Number of Night" = "2+2
       *   (25.02.–27.02. + 27.02.–01.03.2027)" → two consecutive two-night
       *   windows, no uncovered night on 27 February.
       *   Budget_Room - Rate, column E "Our Selling Rate / Room / Night" = 290,
       *   column H "Guest See this on webpage to book per person" = 145.
       *   Budget_Finance rows 25–30 book the guest revenue for the ONE night
       *   27–28.02 at the per-room rate; row 32 ("All Categories Rooms",
       *   28.02–01.03, 26 rooms × USD 150) is carried by the host — that is
       *   the complimentary second wedding-stay night.
       * Therefore: `n` nights in the window, `pay` of them payable by the guest.
       *   PRE-WEDDING  25 – 27 FEB      2 nights, both payable  → rate × 2
       *   WEDDING STAY 27 FEB – 01 MAR  2 nights, first payable → rate × 1
       * `window: 'fixed'` records the Owner's duration rule (Overview_Hotel_
       * Restaurant, Day 05-02 / Day 07: "2 tage fix" — a shorter stay changes
       * nothing). It is a DURATION rule and never an arithmetic shortcut. */
      windows: [
        { id: 'prewed', label: 'Pre-Wedding Stay', dates: '25 – 27 February 2027', nights: '2 nights', n: 2, pay: 2,
          window: 'fixed', nightsList: ['25 → 26 February', '26 → 27 February'],
          bagName: 'Pre-Wedding Stay · Souphattra Heritage', bagImg: 'assets/images/souphattra/heritage-courtyard-front.jpg' },
        /* ONE Wedding Stay selection for the two-night window: the first night is
         * the guest's contribution, the second night is complimentary and hosted
         * by the Bride & Groom. The note is context, never a second line item
         * and never a USD 0 row. */
        { id: 'wedstay', label: 'Wedding Stay', dates: '27 February – 01 March 2027', nights: '2 nights', n: 2, pay: 1,
          window: 'fixed', nightsList: ['27 → 28 February', '28 February → 01 March'],
          note: 'Second night complimentary', noteBy: 'Hosted by Bride & Groom',
          bagName: 'Wedding Stay · Souphattra Heritage', bagImg: 'assets/images/souphattra/heritage-arches-dusk.jpg' }
      ],
      includes: [
        'Pre-Wedding Stay (25 – 27 February): two nights, 25 → 26 and 26 → 27 February. Both nights are your contribution.',
        'Wedding Stay (27 February – 1 March): two nights, 27 → 28 February and 28 February → 1 March. The first night is your contribution; the second night is complimentary, hosted by the Bride & Groom, ' + HS + '.',
        'The two stays run back to back — 27 February is the transition day, and no night between 25 February and 1 March is left uncovered.',
        'Each window is a fixed two-night window: arriving late or leaving early does not change the amount.',
        'Breakfast is included on every morning.',
        'A limited number of complimentary alternative stays are also available.'
      ],
      rooms: [
        { slug: 'souphattra-presidential', name: 'Souphattra Presidential', cat: 'Suite',
          desc: 'The largest suite of the house: two bedrooms, private bathrooms and a shared living space under a high ceiling.',
          gallery: [[RM + 'souphattra-presidential-1.jpg', 'The main bedroom'], [RM + 'souphattra-presidential-2.jpg', 'The second bedroom'], [RM + 'souphattra-presidential-3.jpg', 'The living space'], [RM + 'souphattra-presidential-4.jpg', 'The sitting corner'], [RM + 'souphattra-presidential-5.jpg', 'The bathroom'], [RM + 'souphattra-presidential-6.jpg', 'Sofa detail'], [RM + 'souphattra-presidential-7.jpg', 'The bathtub']],
          facts: [['Size', '118 sq.m.'], ['Bed', 'Two bedrooms · king and twin'], ['Occupancy', '4 adults · 2 children'], ['Location', 'One unit only']],
          amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Shared living space', 'Pantry', 'Dining table', 'High ceiling'],
          rate: 750, reserved: 'Reserved for bride & groom' },
        { slug: 'souphattra-majestic', name: 'Souphattra Majestic Suite', cat: 'Suite',
          desc: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
          gallery: [[RM + 'souphattra-majestic-suite-1.jpg', 'Bedroom towards the balcony'], [RM + 'souphattra-majestic-suite-2.jpg', 'The living area'], [RM + 'souphattra-majestic-suite-4.jpg', 'The bedroom'], [RM + 'souphattra-majestic-suite-3.jpg', 'The bathroom'], [RM + 'souphattra-majestic-suite-5.jpg', 'The bed']],
          facts: [['Size', '84 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 2 children'], ['Location', 'Pool and garden views · one suite only']],
          amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'WiFi'], rate: 290 },
        { slug: 'grand-majestic', name: 'Grand Majestic Suite', cat: 'Suite',
          desc: 'French colonial and Laotian design: a living room under a high ceiling, and a slower kind of morning.',
          gallery: [[RM + 'grand-majestic-suite-1.jpg', 'The bedroom'], [RM + 'grand-majestic-suite-2.jpg', 'The bathroom'], [RM + 'grand-majestic-suite-3.jpg', 'Living and dining']],
          facts: [['Size', '66–75 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Private balcony']],
          amenities: ['Living room', 'High ceiling', 'Pantry', 'Private balcony', 'Smart TV', 'Mini bar', 'WiFi'],
          rate: 250, reserved: 'Reserved for family' },
        { slug: 'noble-courtyard', name: 'Noble Courtyard Suite', cat: 'Suite',
          desc: 'A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool.',
          gallery: [[RM + 'noble-courtyard-1.jpg', 'The bedroom'], [RM + 'noble-courtyard-2.jpg', 'Bedroom and desk'], [RM + 'noble-courtyard-3.jpg', 'The living area']],
          facts: [['Size', '63 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Ground floor · central greenery · one suite only']],
          amenities: ['Bathrobe', 'Bathtub', 'Coffee & tea making facilities', 'Hair dryer', 'Mini bar', 'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'WiFi access'], rate: 240 },
        { slug: 'heritage-grand-premier', name: 'Heritage Grand Premier', cat: 'Heritage Room',
          desc: 'A larger heritage room, with a private balcony over the garden and the pool.',
          gallery: [[RM + 'heritage-grand-premier-1.jpg', 'The bedroom'], [RM + 'heritage-grand-premier-2.jpg', 'The sitting area'], [RM + 'heritage-grand-premier-3.jpg', 'Bedroom towards the balcony'], [RM + 'heritage-grand-premier-4.jpg', 'The sitting corner'], [RM + 'heritage-grand-premier-5.jpg', 'Sofa detail'], [RM + 'heritage-grand-premier-6.jpg', 'The balcony daybed'], [RM + 'heritage-grand-premier-7.jpg', 'The balcony']],
          facts: [['Size', '49 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child sharing bedding'], ['Location', 'Garden and pool views']],
          amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'WiFi', 'Bathroom amenities'], rate: 170 },
        { slug: 'heritage-executive', name: 'Heritage Executive', cat: 'Heritage Room',
          desc: 'French colonial rooms with a balcony over the garden, and the flexibility a family needs.',
          gallery: [[RM + 'heritage-executive-1.jpg', 'The bedroom'], [RM + 'heritage-executive-2.jpg', 'Bedroom and balcony'], [RM + 'heritage-executive-3.jpg', 'The bathroom'], [RM + 'heritage-executive-4.jpg', 'Bedroom towards the balcony']],
          facts: [['Size', '37–44 sq.m.'], ['Bed', 'King or twin'], ['Occupancy', 'Up to 2 adults · 1 child'], ['Location', 'Garden views · interconnecting rooms where available']],
          amenities: HERITAGE_AMENITIES, rate: 155 },
        { slug: 'heritage', name: 'The Heritage', cat: 'Heritage Room',
          desc: 'Colonial French elegance in 31 square metres, with a private balcony over the garden.',
          gallery: [[RM + 'the-heritage-1.jpg', 'Dressing corridor and wardrobe'], [RM + 'the-heritage-2.jpg', 'The bedroom'], [RM + 'the-heritage-3.jpg', 'The bathroom']],
          facts: [['Size', '31 sq.m.'], ['Bed', '1 King bed'], ['Occupancy', '2 adults · 1 child'], ['Location', '1st–3rd floor']],
          amenities: HERITAGE_AMENITIES, rate: 145 }
      ]
    },

    airbnb: {
      name: 'Alternative Stay · Vientiane',
      place: 'Vientiane, Laos',
      windows: [{ id: 'airbnb-2br', label: 'Wedding Stay', dates: '27 February – 01 March 2027', nights: '2 nights', n: 2,
        bagName: 'Private Residence · Vientiane', bagImg: 'assets/images/airbnb/airbnb-01.jpg' }],
      includes: null,
      rooms: [
        { slug: 'private-residence', name: 'Private Residence', cat: 'Alternative stay',
          desc: 'A warm private residence in central Vientiane, secured for the wedding stay and hosted for a limited number of guests. Guest Relations coordinates the arrangements personally.',
          gallery: [['assets/images/airbnb/airbnb-01.jpg', 'Living and dining'], ['assets/images/airbnb/airbnb-02.jpg', 'The entry'], ['assets/images/airbnb/airbnb-03.jpg', 'The balcony'], ['assets/images/airbnb/airbnb-04.jpg', 'Towards the temple roofs'], ['assets/images/airbnb/airbnb-05.jpg', 'By the window'], ['assets/images/airbnb/airbnb-06.jpg', 'A corner of the living room']],
          facts: [['Type', 'Private residence'], ['Sleeps', 'Up to 4'], ['Occupancy', 'Up to 4 adults'], ['Location', 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket']],
          amenities: ['WiFi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
          price: null, status: 'Complimentary · limited availability', interest: true }
      ]
    },

    sathorn: {
      name: 'Sathorn Penthouse Bangkok',
      place: 'Sathorn, Bangkok',
      breakfast: 'Breakfast not included · self-pay',
      windows: [{ id: 'bkk-stay', label: 'Before the Wedding', dates: '21 – 24 February 2027', nights: '3 nights', n: 3,
        bagName: 'Sathorn Penthouse Bangkok', bagImg: 'assets/images/journey/penthouse-01.jpg' }],
      includes: ['Arrival 21 February 2027: personal pickup by Haruthai — hosted.'],
      rooms: [
        { slug: 'penthouse', name: 'Sathorn Penthouse', cat: 'Whole home · six bedrooms',
          desc: 'The shared days in Bangkok before travelling on to Laos — one penthouse for the whole party, capacity 12 adults.',
          /* eleven UNIQUE photographs from Drive 020 (000–010). The former slide 2
           * was the same living-room frame as slide 1 at a smaller size; it is
           * replaced by the elevated exterior (Drive 001), which was missing. */
          gallery: [
            ['assets/images/journey/penthouse-01.jpg', 'The double-height living room'],
            [PENT + 'living-above.jpg', 'The living room from the mezzanine'],
            [PENT + 'lounge-corner.jpg', 'A lounge corner'],
            [PENT + 'bedroom-corner.jpg', 'Corner bedroom with skyline view'],
            [PENT + 'bedroom-skyline.jpg', 'Bedroom towards the skyline'],
            [PENT + 'bedroom-courtyard.jpg', 'Bedroom towards the courtyard'],
            [PENT + 'study-nook.jpg', 'The study nook'],
            [PENT + 'balcony-garden.jpg', 'The balcony'],
            [PENT + 'exterior-street.jpg', 'The house from the street'],
            [PENT + 'exterior-elevated.jpg', 'The house from above'],
            [PENT + 'exterior-golden-hour.jpg', 'The house at golden hour']],
          facts: [['Home', 'Six-bedroom penthouse'], ['Capacity', '12 adults'], ['Stay', '21 – 24 February 2027 · 3 nights'], ['Arrival', '21 February · personal pickup by Haruthai']],
          amenities: null, rate: 45 }
      ]
    },

    kunming: {
      name: 'Wanxiang Yueju · Kunming',
      place: 'Kunming Railway Station MixC Branch',
      breakfast: 'Breakfast not included · self-pay',
      windows: [{ id: 'kmg', label: 'After the Wedding', dates: '01 – 04 March 2027', nights: '3 nights', n: 3,
        bagName: 'Wanxiang Yueju · Kunming', bagImg: 'assets/images/journey/kunming-01.jpg' }],
      includes: null,
      /* All twelve operational categories from Accommodation_Details, each with
       * the Owner-approved per-person / per-night rate ("Price per Person").
       * The per-person total is rate × nights and is produced only by
       * assets/pricing.js — never stored twice. */
      rooms: [
        { slug: 'junting', name: 'Junting City-View Loft', cat: 'Designer loft · 68 sqm',
          desc: 'Junting City-View Loft — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 14th floor.',
          gallery: [
          [KMG + 'junting-1.jpg', 'The room'],
          [KMG + 'junting-2.jpg', 'The room'],
          [KMG + 'junting-3.jpg', 'The room'],
          [KMG + 'junting-4.jpg', 'The room'],
          [KMG + 'junting-5.jpg', 'The room'],
          [KMG + 'junting-6.jpg', 'The room']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 14th floor']],
          amenities: ['Air conditioning', 'Balcony', 'Butler service', 'Clothes dryer', 'Coffee maker / teapot', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 51 },
        { slug: 'milano', name: 'Milano Minimalist Loft', cat: 'Designer loft · 68 sqm',
          desc: 'Milano Minimalist Loft — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 14th floor.',
          gallery: [
          [KMG + 'milano-1.jpg', 'The room'],
          [KMG + 'milano-2.jpg', 'The room'],
          [KMG + 'milano-3.jpg', 'The room'],
          [KMG + 'milano-4.jpg', 'The room'],
          [KMG + 'milano-5.jpg', 'The room'],
          [KMG + 'milano-6.jpg', 'The room']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 14th floor']],
          amenities: ['Air conditioning', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 50 },
        { slug: 'italian', name: 'Italian Style Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Italian Style Suite — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 14th floor.',
          gallery: [
          [KMG + 'italian-1.jpg', 'The room'],
          [KMG + 'italian-2.jpg', 'The room'],
          [KMG + 'italian-3.jpg', 'The room'],
          [KMG + 'italian-4.jpg', 'The room'],
          [KMG + 'italian-5.jpg', 'The room'],
          [KMG + 'italian-6.jpg', 'The room']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 14th floor']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Butler service', 'Coffee maker / teapot', 'Dining table', 'Electric blanket', 'Electric fan', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 50 },
        { slug: 'light-french', name: 'Light French Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Light French Suite — 68 sq.m., 1 queen bed (1.8m wide), 1 adult. Floor 14th floor.',
          gallery: [
          [KMG + 'light-french-1.jpg', 'The room'],
          [KMG + 'light-french-2.jpg', 'The room'],
          [KMG + 'light-french-3.jpg', 'The room'],
          [KMG + 'light-french-4.jpg', 'The room'],
          [KMG + 'light-french-5.jpg', 'The room'],
          [KMG + 'light-french-6.jpg', 'The room']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '1 Adult'], ['Location', 'Floor 14th floor']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Butler service', 'Clothes dryer', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Range hood', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 49 },
        { slug: 'left-bank', name: 'Left Bank French-Style King Room', cat: 'Designer room · 68 sqm',
          desc: 'Left Bank French-Style King Room — 68 sq.m., 1 queen bed (1.8m wide), 4 adults. Floor 14.',
          gallery: [
          [KMG + 'leftbank-1.jpg', 'The living room'],
          [KMG + 'leftbank-2.jpg', 'The kitchen'],
          [KMG + 'leftbank-3.jpg', 'The bedroom'],
          [KMG + 'leftbank-4.jpg', 'The stair'],
          [KMG + 'leftbank-5.jpg', 'The second bedroom'],
          [KMG + 'leftbank-6.jpg', 'Living and dining']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '4 Adults'], ['Location', 'Floor 14']],
          amenities: ['Air conditioning', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric fan', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Projector', 'Range hood', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 87 },
        { slug: 'penang', name: 'Penang Forest Nanyang-Style Deluxe Suite', cat: 'Designer suite · 136 sqm',
          desc: 'Penang Forest Nanyang-Style Deluxe Suite — 136 sq.m., 1 king bed (2m wide) and 1 queen bed (1.8m wide), 4 adults. Floor 16.',
          gallery: [
          [KMG + 'penang-1.jpg', 'The bedroom'],
          [KMG + 'penang-2.jpg', 'The living room'],
          [KMG + 'penang-3.jpg', 'The kitchen and dining'],
          [KMG + 'penang-4.jpg', 'The reading corner'],
          [KMG + 'penang-5.jpg', 'Living room from above'],
          [KMG + 'penang-6.jpg', 'The entrance hall']],
          facts: [['Size', '136 sq.m.'], ['Bed', '1 king bed (2m wide) and 1 queen bed (1.8m wide)'], ['Occupancy', '4 Adults'], ['Location', 'Floor 16']],
          amenities: ['Air conditioning', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Shower', 'Slippers', 'Smart door lock', 'Sofa', 'Wardrobe', 'Washing machine'],
          rate: 79 },
        { slug: 'family-suite', name: 'Family Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Family Suite — 68 sq.m., 1 queen bed (1.8m wide) and 1 double bed (1.5m wide), 2 adults. Floor 15-22.',
          gallery: [
          [KMG + 'familysuite-1.jpg', 'The window seat'],
          [KMG + 'familysuite-2.jpg', 'The living room'],
          [KMG + 'familysuite-3.jpg', 'The stair'],
          [KMG + 'familysuite-4.jpg', 'From above'],
          [KMG + 'familysuite-5.jpg', 'The second bedroom'],
          [KMG + 'familysuite-6.jpg', 'The bedroom']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 queen bed (1.8m wide) and 1 double bed (1.5m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 15-22']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Wardrobe', 'Washing machine'],
          rate: 66 },
        { slug: 'seine', name: 'Seine Evening Glow Loft Family Room', cat: 'Designer loft · 68–70 sqm',
          desc: 'Seine Evening Glow Loft Family Room — 68–70 sq.m., 1 queen bed (1.8m wide) and 1 double bed (1.5m wide), 4 adults. Floor 12.',
          gallery: [
          [KMG + 'seine-1.jpg', 'The living room and stair'],
          [KMG + 'seine-2.jpg', 'The bedroom'],
          [KMG + 'seine-3.jpg', 'The sitting corner'],
          [KMG + 'seine-4.jpg', 'The bathroom'],
          [KMG + 'seine-5.jpg', 'The kitchen'],
          [KMG + 'seine-6.jpg', 'Living room and bed']],
          facts: [['Size', '68–70 sq.m.'], ['Bed', '1 queen bed (1.8m wide) and 1 double bed (1.5m wide)'], ['Occupancy', '4 Adults'], ['Location', 'Floor 12']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Butler service', 'Clothes dryer', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Projector', 'Range hood', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Wardrobe', 'Washing machine'],
          rate: 66 },
        { slug: 'smart-family', name: 'Smart Family Room', cat: 'Designer room · 68 sqm',
          desc: 'Smart Family Room — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 9-24.',
          gallery: [
          [KMG + 'smartfamily-1.jpg', 'The stair and window'],
          [KMG + 'smartfamily-2.jpg', 'The living room'],
          [KMG + 'smartfamily-3.jpg', 'The bedroom'],
          [KMG + 'smartfamily-4.jpg', 'The bathroom'],
          [KMG + 'smartfamily-5.jpg', 'The desk at dusk'],
          [KMG + 'smartfamily-6.jpg', 'Wardrobe and laundry']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 9-24']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Butler service', 'Clothes dryer', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 55 },
        { slug: 'solarium', name: 'Solarium Bath Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Solarium Bath Suite — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 14.',
          gallery: [
          [KMG + 'solarium-1.jpg', 'The living room'],
          [KMG + 'solarium-2.jpg', 'The bedroom'],
          [KMG + 'solarium-3.jpg', 'The bathtub and the city'],
          [KMG + 'solarium-4.jpg', 'The stair and living room'],
          [KMG + 'solarium-5.jpg', 'Living room from above'],
          [KMG + 'solarium-6.jpg', 'The lounge']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 14']],
          amenities: ['Air conditioning', 'Audio equipment', 'Balcony', 'Bathtub', 'Butler service', 'Clothes dryer', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 54, reserved: 'Reserved for bride & groom' },
        { slug: 'standard-single', name: 'Standard Single Room', cat: 'Designer room · 68 sqm',
          desc: 'Standard Single Room — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 16.',
          gallery: [
          [KMG + 'standardsingle-1.jpg', 'The kitchen'],
          [KMG + 'standardsingle-2.jpg', 'The living room'],
          [KMG + 'standardsingle-3.jpg', 'The bathroom'],
          [KMG + 'standardsingle-4.jpg', 'The bedroom'],
          [KMG + 'standardsingle-5.jpg', 'The living room by day'],
          [KMG + 'standardsingle-6.jpg', 'The window at dusk']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 16']],
          amenities: ['Air conditioning', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart toilet', 'Sofa', 'TV', 'Wardrobe', 'Washing machine'],
          rate: 53 },
        { slug: 'mid-century', name: 'Mid-century Amber Suite', cat: 'Designer suite · 68 sqm',
          desc: 'Mid-century Amber Suite — 68 sq.m., 1 queen bed (1.8m wide), 2 adults. Floor 12.',
          gallery: [
          [KMG + 'midcentury-1.jpg', 'The kitchen and bathroom'],
          [KMG + 'midcentury-2.jpg', 'The living room'],
          [KMG + 'midcentury-3.jpg', 'The sofa and city window'],
          [KMG + 'midcentury-4.jpg', 'The bathroom'],
          [KMG + 'midcentury-5.jpg', 'Living room and stair'],
          [KMG + 'midcentury-6.jpg', 'The bedroom']],
          facts: [['Size', '68 sq.m.'], ['Bed', '1 Queen Bed (1.8m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 12']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Butler service', 'Dining table', 'Electric blanket', 'Electric kettle', 'Free bottled water', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Microwave', 'Minibar', 'Projector', 'Range hood', 'Refrigerator', 'Shower', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Wardrobe', 'Washing machine'],
          rate: 51 },
      ]
    },

    lijiang: {
      name: 'Luye Baisha · Lijiang',
      place: 'Baisha, Lijiang · Rizhao Jinshan',
      breakfast: 'Breakfast included',
      windows: [{ id: 'ljg', label: 'After the Wedding', dates: '04 – 06 March 2027', nights: '2 nights', n: 2,
        bagName: 'Luye Baisha · Lijiang', bagImg: 'assets/images/journey/lijiang-01.jpg' }],
      includes: null,
      /* All nine operational categories with the Owner-approved per-person /
       * per-night rate from Accommodation_Details. */
      rooms: [
        { slug: 'manor-suite', name: 'Snow Mountain Manor Suite', cat: 'Snow mountain suite',
          desc: 'Snow Mountain Manor Suite — 70 sq.m., 1 king bed (2m wide), 2 adults. Floor 1st floor.',
          gallery: [
          [LJG + 'starry-8.jpg', 'The private pool and the garden'],
          [LJG + 'starry-9.jpg', 'The garden towards the mountain'],
          [LJG + 'starry-3.jpg', 'The bedroom towards the terrace']],
          facts: [['Size', '70 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 1st floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Garden / yard', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs / soup pool', 'Projector', 'Refrigerator', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 120 },
        { slug: 'soup-pool-270', name: '270° Snow Mountain View Room Private Soup Pool', cat: 'Snow mountain room',
          desc: '270° Snow Mountain View Room Private Soup Pool — 55 sq.m., 1 king bed (2m wide), 2 adults. Floor 2nd floor.',
          gallery: [
          [LJG + 'souppool-1.jpg', 'The room and private pool'],
          [LJG + 'souppool-2.jpg', 'The bathroom towards the mountain'],
          [LJG + 'souppool-3.jpg', 'The fireplace and the peak'],
          [LJG + 'souppool-4.jpg', 'The room at dusk'],
          [LJG + 'souppool-5.jpg', 'The bathroom'],
          [LJG + 'souppool-6.jpg', 'The room in the evening']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 2nd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs / soup pool', 'Projector', 'Refrigerator', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 105 },
        { slug: 'private-courtyard-270', name: '270° Private Courtyard Snow Mountain View', cat: 'Snow mountain room',
          desc: '270° Private Courtyard Snow Mountain View — 55 sq.m., 1 king bed (2m wide), 2 adults. Floor 1st floor.',
          gallery: [
          [LJG + 'courtyard-1.jpg', 'The room towards the courtyard'],
          [LJG + 'courtyard-2.jpg', 'Soaking tub and mountain view'],
          [LJG + 'courtyard-3.jpg', 'The fireplace'],
          [LJG + 'courtyard-4.jpg', 'The room at dawn'],
          [LJG + 'courtyard-5.jpg', 'The bathroom']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 1st floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private courtyard', 'Private hot springs', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 105 },
        { slug: 'snow-mountain-viewing', name: 'Snow Mountain Viewing Room', cat: 'Snow mountain room',
          desc: 'Snow Mountain Viewing Room — 50 sq.m., 1 king bed (2m wide), 1 adult. Floor 2nd floor.',
          /* the Owner-designated photograph for this room (08 Sep 2026): Jade
           * Dragon Snow Mountain over the Baisha rooftops. Canonical — used for
           * this room only, everywhere the room appears. */
          gallery: [[LJG + 'snow-mountain-viewing-1.jpg', 'Jade Dragon Snow Mountain over the rooftops']],
          facts: [['Size', '50 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '1 Adult'], ['Location', 'Floor 2nd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 75 },
        { slug: 'viewing-270', name: '270° Snow Mountain Viewing', cat: 'Snow mountain room',
          desc: '270° Snow Mountain Viewing — 55 sq.m., 1 king bed (2m wide), 2 adults. Floor 2nd – 3rd floor.',
          gallery: [
          [LJG + 'view270-1.jpg', 'The room at dusk'],
          [LJG + 'view270-2.jpg', 'The wraparound windows'],
          [LJG + 'view270-3.jpg', 'The room at night'],
          [LJG + 'view270-4.jpg', 'Towards the mountain'],
          [LJG + 'view270-5.jpg', 'The room'],
          [LJG + 'view270-6.jpg', 'The bathroom']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 2nd – 3rd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs', 'Projector', 'Refrigerator', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 100 },
        { slug: 'starry-sky', name: 'Luye Starry Sky Suite · Immersive View', cat: 'Snow mountain suite',
          desc: 'Luye Starry Sky Suite · Immersive View — 88 sq.m., 1 king bed (3.1m wide), 2 adults. Floor 3rd floor.',
          gallery: [
          [LJG + 'starry-1.jpg', 'The round bed and the peak'],
          [LJG + 'starry-2.jpg', 'The suite at dusk'],
          [LJG + 'starry-5.jpg', 'The bed by candlelight'],
          [LJG + 'starry-7.jpg', 'The suite in the evening'],
          [LJG + 'starry-6.jpg', 'The terrace at dawn'],
          [LJG + 'starry-4.jpg', 'The bathroom']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 King Bed (3.1m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 3rd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 210 },
        { slug: 'boundless', name: 'Boundless Floor-to-Ceiling Glass Sunlit Suite', cat: 'Snow mountain suite',
          desc: 'Boundless Floor-to-Ceiling Glass Sunlit Suite — 88 sq.m., 1 king bed (3.1m wide), 2 adults. Floor 3rd floor.',
          gallery: [
          [LJG + 'boundless-1.jpg', 'The suite and the pool'],
          [LJG + 'boundless-2.jpg', 'The bathroom'],
          [LJG + 'boundless-3.jpg', 'The round bed'],
          [LJG + 'boundless-4.jpg', 'The suite at dusk'],
          [LJG + 'boundless-5.jpg', 'The bed and the mountain'],
          [LJG + 'boundless-6.jpg', 'The fireplace'],
          [LJG + 'boundless-7.jpg', 'The terrace']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 King Bed (3.1m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 3rd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs / soup pool', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 170 },
        { slug: 'private-soup-view', name: 'Snow Mountain Private Soup Viewing Suite', cat: 'Snow mountain suite',
          desc: 'Snow Mountain Private Soup Viewing Suite — 88 sq.m., 1 king bed (2m wide), 2 adults. Floor 2nd floor.',
          gallery: [
          [LJG + 'soupview-1.jpg', 'The suite towards the mountain'],
          [LJG + 'soupview-2.jpg', 'The lounge and the pool'],
          [LJG + 'soupview-3.jpg', 'The bathroom'],
          [LJG + 'soupview-4.jpg', 'The bed and the fireplace'],
          [LJG + 'soupview-5.jpg', 'The suite at dawn'],
          [LJG + 'soupview-6.jpg', 'The soaking pool'],
          [LJG + 'soupview-7.jpg', 'The living space'],
          [LJG + 'soupview-8.jpg', 'The terrace']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 2nd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs / soup pool', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 125 },
        { slug: 'view-suite-270', name: '270° Snow Mountain View Suite', cat: 'Snow mountain suite',
          desc: '270° Snow Mountain View Suite — 70 sq.m., 1 king bed (2m wide), 2 adults. Floor 3rd floor.',
          gallery: [
          [LJG + 'suite270-1.jpg', 'The suite and the tub'],
          [LJG + 'suite270-2.jpg', 'The bathroom'],
          [LJG + 'suite270-3.jpg', 'The bed towards the mountain'],
          [LJG + 'suite270-4.jpg', 'The tub and the peak'],
          [LJG + 'suite270-5.jpg', 'The suite at dusk'],
          [LJG + 'suite270-6.jpg', 'The bed and wardrobe'],
          [LJG + 'suite270-7.jpg', 'The bed and the tub'],
          [LJG + 'suite270-8.jpg', 'The fireplace and the peak']],
          facts: [['Size', '70 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '2 Adults'], ['Location', 'Floor 3rd floor']],
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot springs / soup pool', 'Projector', 'Refrigerator', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 120, reserved: 'Reserved for bride & groom' },
      ]
    },

    kempinski: {
      name: 'Siam Kempinski Bangkok',
      place: 'Bangkok, Thailand',
      breakfast: 'Breakfast included',
      windows: [{ id: 'kempinski', label: 'The Return', dates: '06 – 08 March 2027', nights: '2 nights', n: 2,
        bagName: 'Siam Kempinski Bangkok', bagImg: 'assets/images/journey/kempinski-01.jpg' }],
      includes: ['Breakfast included on both mornings.'],
      rooms: [
        { slug: 'deluxe-balcony-king', name: 'Deluxe Balcony King', cat: 'Deluxe room · non smoking',
          desc: 'Deluxe Balcony King Room Non Smoking — the coordinated return stay in Bangkok.',
          /* Room photography from the owner's 025 hotel folder (IMG_3453/3455/3456/3457 —
           * bedroom, balcony, sitting corner, bathroom) followed by the property. */
          gallery: [
            [KEM + 'room-bedroom-balcony.jpg', 'The room towards the balcony'],
            [KEM + 'room-balcony-view.jpg', 'The balcony'],
            [KEM + 'room-sitting-corner.jpg', 'The sitting corner'],
            [KEM + 'room-bathroom.jpg', 'The bathroom'],
            ['assets/images/journey/kempinski-01.jpg', 'The lagoon courtyard from above'],
            ['assets/images/journey/kempinski-03.jpg', 'The lobby'],
            [KEM + 'lobby-staircase.jpg', 'The grand staircase'],
            [KEM + 'lounge.jpg', 'The lounge']],
          facts: [['Size', '~37–45 sqm'], ['Bed', 'King'], ['Room', 'Balcony · non smoking']],
          amenities: ['Balcony', 'Non smoking', 'Air conditioning', 'Safe', 'Coffee & tea', 'Wi-Fi', 'Complimentary minibar'],
          rate: 190 }
      ]
    }
  };

  /* Merchandising (Owner rule, 07 Sep 2026): comparable paid options are
   * presented HIGHEST FIRST. Sorted here so the order can never drift out of
   * step with the rates. Rooms without a rate follow, reserved rooms keep
   * their place in the list but are never selectable. */
  Object.keys(window.SIYL_ROOMS).forEach(function (k) {
    window.SIYL_ROOMS[k].rooms.sort(function (a, b) {
      return (b.rate == null ? -1 : b.rate) - (a.rate == null ? -1 : a.rate);
    });
  });
})();
