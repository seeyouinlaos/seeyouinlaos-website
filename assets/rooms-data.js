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

  /* ------------------------------------------------------------------ groups
   * Amenities are never a wall of text. Every room carries `groups`: a small
   * number of named groups, each a short list, all taken from the current
   * Accommodation_Details entry for THAT room. Nothing is invented and nothing
   * is copied between properties.
   * `story` is the room's own paragraph — the thing the guest is buying. */

  /* the Souphattra house standard: true of every category in the source */
  var SOUP_BATH = ['Private bathroom · bathtub or shower', 'Hot water, 24 hours', 'Bathrobes, slippers and towels',
    'Hair dryer and vanity mirror', 'Full toiletries', 'Bidet sprayer', 'Accessible shower'];
  var SOUP_FOOD = ['Minibar — complimentary', 'Bottled water and soft drinks — complimentary',
    'Nespresso machine, coffee and tea', 'Electric kettle', 'Fresh fruit', 'Refrigerator'];
  var SOUP_TECH = ['Free Wi-Fi and wired internet in the room', 'LCD television · satellite channels and movies',
    'Smart door lock', 'Telephone', 'Multi-standard and 220 V power outlets'];
  var SOUP_CARE = ['Daily housekeeping', 'Turndown service', 'Safe in the room', 'Blackout curtains and down duvet',
    'Sewing kit and umbrella', 'Air conditioning with individual control'];
  function soupGroups(room, bath, food) {
    return [['The room', room],
            ['Bathroom', bath || SOUP_BATH],
            ['Food & drink', food || SOUP_FOOD],
            ['Technology', SOUP_TECH],
            ['Service', SOUP_CARE]];
  }
  var HS = '<span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span>';

  function seq(prefix, n) {
    var a = [];
    for (var i = 1; i <= n; i++) a.push(prefix + i + '.jpg');
    return a;
  }

  /* ==========================================================================
     THE OWNER-APPROVED FULL EXPERIENCE.

     Full Experience is not "the most expensive room in every house". It is the
     configuration the Owner selected and reviewed on 09 September 2026: one
     named room per accommodation stage, plus the four transport products.

       21 – 24 FEB  Sathorn Penthouse                    85 × 3 = 255
       24 – 25 FEB  Special Express No. 25                       75
       25 – 27 FEB  Heritage Grand Premier              170 × 2 = 340
       27 FEB – 01 MAR  Heritage Grand Premier          170 × 1 = 170
       01 MAR       MU9632 Business                             275
       01 – 04 MAR  Italian Style Suite                  50 × 3 = 150
       04 MAR       C642 Business                                85
       04 – 06 MAR  270° Snow Mountain Viewing Room     100 × 2 = 200
       06 MAR       MU5924 + MU741 Economy flexible             200
       06 – 08 MAR  Deluxe Balcony King                 190 × 2 = 380
                                                       = USD 2,130

     The total is NEVER written down. It is the sum of whatever the engine
     actually selects, so that when the shared ledger says a preferred room is
     gone the substitute — and the new total — are both real.
     ======================================================================== */
  window.SIYL_FULL_EXPERIENCE = {
    'bkk-stay':  'penthouse',
    prewed:      'heritage-grand-premier',
    wedstay:     'heritage-grand-premier',
    kmg:         'italian',
    ljg:         'viewing-270',
    kempinski:   'deluxe-balcony-king'
  };

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
       *   Sathorn Penthouse, 340 per room / night ÷ 4 = 85 per person / night).
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
          facts: [['Size', '118 sq.m.'], ['Bed', 'Two bedrooms · 1 king bed and twin beds'], ['Occupancy', '4 adults · 2 children'], ['Location', '2nd floor · one unit only'], ['Bathrooms', 'Two private bathrooms']],
          story: 'Only one Presidential exists in the house. Two bedrooms, each with its own bathroom — a king in one, twins in the other — open onto a separate living area and a shared co-living space beneath a high ceiling. A pantry and a dining table make it the suite a family gathers in rather than passes through.',
          groups: soupGroups(['118 sq.m., the only one in the house', 'Two bedrooms, each with its own private bathroom', 'King bed and twin beds', 'Separate living area and shared co-living space', 'High ceiling', 'Pantry and dining table'], null, null),
          amenities: ['Two bedrooms', 'Private bathrooms', 'Separate living area', 'Shared living space', 'Pantry', 'Dining table', 'High ceiling'],
          rate: 750, reserved: 'Reserved for bride & groom' },
        { slug: 'souphattra-majestic', name: 'Souphattra Majestic Suite', cat: 'Suite',
          desc: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
          gallery: [[RM + 'souphattra-majestic-suite-1.jpg', 'Bedroom towards the balcony'], [RM + 'souphattra-majestic-suite-2.jpg', 'The living area'], [RM + 'souphattra-majestic-suite-4.jpg', 'The bedroom'], [RM + 'souphattra-majestic-suite-3.jpg', 'The bathroom'], [RM + 'souphattra-majestic-suite-5.jpg', 'The bed']],
          facts: [['Size', '84 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 2 children'], ['Location', '3rd floor · one suite only'], ['View', 'Pool and garden panorama']],
          story: 'Eighty-four square metres at the summit of the resort. A separate living area with its own pantry and bar sits beside the bedroom, and the balcony runs the length of the suite with the pool and the garden below it. Lao contemporary lines under French colonial ceilings — the room the house was built around.',
          groups: soupGroups(['84 sq.m. on the top floor', 'Separate living area', 'Pantry and bar', 'Spacious balcony over the pool and garden', 'High ceilings · Lao contemporary and French colonial design'], null, null),
          amenities: ['Separate living area', 'Pantry', 'Bar', 'Large balcony', 'Pool and garden views', 'High ceilings', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'WiFi'], rate: 290 },
        { slug: 'grand-majestic', name: 'Grand Majestic Suite', cat: 'Suite',
          desc: 'French colonial and Laotian design: a living room under a high ceiling, and a slower kind of morning.',
          gallery: [[RM + 'grand-majestic-suite-1.jpg', 'The bedroom'], [RM + 'grand-majestic-suite-2.jpg', 'The bathroom'], [RM + 'grand-majestic-suite-3.jpg', 'Living and dining']],
          facts: [['Size', '66 – 75 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child'], ['Location', '2nd floor'], ['Outside', 'Private balcony']],
          story: 'French colonial and Laotian design in sixty-seven square metres: a living room under a high ceiling, a pantry of its own, and a private balcony to take the first coffee of the day on.',
          groups: soupGroups(['66 – 75 sq.m.', 'Separate living room', 'High ceiling', 'Pantry', 'Private balcony', 'Sofa, wardrobe, desk and coffee table'], null, null),
          amenities: ['Living room', 'High ceiling', 'Pantry', 'Private balcony', 'Smart TV', 'Mini bar', 'WiFi'],
          rate: 250, reserved: 'Reserved for family' },
        { slug: 'noble-courtyard', name: 'Noble Courtyard Suite', cat: 'Suite',
          desc: 'A 63 square metre retreat with a King bed, two bathrooms, a separate living area and a private balcony overlooking the garden and pool.',
          gallery: [[RM + 'noble-courtyard-1.jpg', 'The bedroom'], [RM + 'noble-courtyard-2.jpg', 'Bedroom and desk'], [RM + 'noble-courtyard-3.jpg', 'The living area']],
          facts: [['Size', '63 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Ground floor · central greenery · one suite only'], ['Bathrooms', 'Two bathrooms and two shower rooms']],
          story: 'Sixty-three square metres arranged for two people who like their own space: a king bed, a separate living area with a sofa and a Smart TV, and — unusually — two bathrooms and two shower rooms, one each. It sits on the ground floor in the middle of the garden, with the balcony opening onto the greenery and the pool.',
          groups: soupGroups(['63 sq.m. on the ground floor', 'Separate living area with sofa and Smart TV', 'Two bathrooms and two shower rooms', 'Private balcony over the garden and pool', 'Set in the central greenery'], null, null),
          amenities: ['Bathrobe', 'Bathtub', 'Coffee & tea making facilities', 'Hair dryer', 'Mini bar', 'Nespresso machine', 'Safe deposit box', 'Shower', 'Slippers', 'Smart TV', 'Wardrobe', 'WiFi access'], rate: 240 },
        { slug: 'heritage-grand-premier', name: 'Heritage Grand Premier', cat: 'Heritage Room',
          desc: 'A larger heritage room, with a private balcony over the garden and the pool.',
          gallery: [[RM + 'heritage-grand-premier-1.jpg', 'The bedroom'], [RM + 'heritage-grand-premier-2.jpg', 'The sitting area'], [RM + 'heritage-grand-premier-3.jpg', 'Bedroom towards the balcony'], [RM + 'heritage-grand-premier-4.jpg', 'The sitting corner'], [RM + 'heritage-grand-premier-5.jpg', 'Sofa detail'], [RM + 'heritage-grand-premier-6.jpg', 'The balcony daybed'], [RM + 'heritage-grand-premier-7.jpg', 'The balcony']],
          facts: [['Size', '49 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child sharing bedding'], ['Location', 'Floors 1 – 3'], ['View', 'Garden, pool and courtyard']],
          story: 'The largest of the heritage rooms at forty-nine square metres, with a private balcony and chairs set out on it, facing the garden and the pool. The minibar is replenished for you throughout the stay, and afternoon tea comes with the room.',
          groups: soupGroups(['49 sq.m.', 'Private balcony with chairs', 'Garden, pool and courtyard views', 'Sofa, wardrobe, desk and coffee table'], null, ['Minibar — complimentary, replenished throughout your stay', 'Afternoon tea', 'Bottled water and soft drinks — complimentary', 'Nespresso machine, coffee and tea', 'Electric kettle', 'Fresh fruit']),
          amenities: ['Private balcony', 'Garden and pool views', 'Nespresso machine', 'Coffee & tea facilities', 'Mini bar', 'Smart TV', 'WiFi', 'Bathroom amenities'], rate: 170 },
        { slug: 'heritage-executive', name: 'Heritage Executive', cat: 'Heritage Room',
          desc: 'French colonial rooms with a balcony over the garden, and the flexibility a family needs.',
          gallery: [[RM + 'heritage-executive-1.jpg', 'The bedroom'], [RM + 'heritage-executive-2.jpg', 'Bedroom and balcony'], [RM + 'heritage-executive-3.jpg', 'The bathroom'], [RM + 'heritage-executive-4.jpg', 'Bedroom towards the balcony']],
          facts: [['Size', '37 – 44 sq.m.'], ['Bed', '1 king bed (1.9 m) or 3 twin beds'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Floors 1 – 3'], ['Family', 'Cribs and extra beds can be added · connecting door']],
          story: 'Thirty-seven to forty-four square metres of colonial French rooms with a balcony over the garden. It is the one category in the house that takes both a crib and an extra bed, and it has a connecting door — the room families ask for.',
          groups: soupGroups(['37 – 44 sq.m.', 'Balcony over the garden', 'Connecting door', 'Cribs and extra beds can be added', 'Sofa, wardrobe, desk and coffee table'], null, null),
          amenities: HERITAGE_AMENITIES, rate: 155 },
        { slug: 'heritage', name: 'The Heritage', cat: 'Heritage Room',
          desc: 'Colonial French elegance in 31 square metres, with a private balcony over the garden.',
          gallery: [[RM + 'the-heritage-1.jpg', 'Dressing corridor and wardrobe'], [RM + 'the-heritage-2.jpg', 'The bedroom'], [RM + 'the-heritage-3.jpg', 'The bathroom']],
          facts: [['Size', '31 sq.m.'], ['Bed', '1 king bed (2.1 m)'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Floors 1 – 3'], ['View', 'Courtyard, garden and pool']],
          story: 'Thirty-one square metres of colonial French elegance with a private balcony over the garden — the room the house is named for. Two guests, top-tier comfort, and a minibar replenished at no charge for the length of the stay.',
          groups: soupGroups(['31 sq.m.', 'Private balcony', 'Courtyard, garden and pool views', 'Sofa, wardrobe, desk and coffee table', 'Cribs can be provided; extra beds cannot be added'], null, null),
          amenities: HERITAGE_AMENITIES, rate: 145 }
      ]
    },

    airbnb: {
      name: 'Alternative Stay · Vientiane',
      place: 'Vientiane, Laos',
      windows: [{ id: 'airbnb-2br', label: 'Wedding Stay', dates: '27 February – 01 March 2027', nights: '2 nights', n: 2,
        bagName: 'Private Residence · Vientiane', bagImg: 'assets/images/airbnb/airbnb-01.jpg' }],
      includes: [
        'Two nights, 27 → 28 February and 28 February → 1 March, for the wedding window.',
        'Complimentary — USD 0 payable by you. Up to six guests in total, and the ledger holds the places live.',
        'Guest Relations coordinates the keys, the arrival and the return personally.',
        'Breakfast, meals and transport in Vientiane are your own.'
      ],
      rooms: [
        { slug: 'private-residence', name: 'Private Residence', cat: 'Alternative stay',
          desc: 'A warm two-bedroom residence in central Vientiane, secured for the wedding stay and hosted for up to six guests. Guest Relations coordinates the arrangements personally.',
          gallery: [['assets/images/airbnb/airbnb-01.jpg', 'Living and dining'], ['assets/images/airbnb/airbnb-02.jpg', 'The entry'], ['assets/images/airbnb/airbnb-03.jpg', 'The balcony'], ['assets/images/airbnb/airbnb-04.jpg', 'Towards the temple roofs'], ['assets/images/airbnb/airbnb-05.jpg', 'By the window'], ['assets/images/airbnb/airbnb-06.jpg', 'A corner of the living room']],
          facts: [['Type', 'Private residence'], ['Bedrooms', 'Two bedrooms'], ['Occupancy', 'Up to 6 guests'], ['Location', 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket']],
          story: 'A two-bedroom residence in downtown Vientiane, three hundred metres from the Mekong night market and eight hundred from Wat Sisaket. It is offered complimentary for the wedding window to up to six guests, and Guest Relations arranges the keys, the arrival and everything around it personally.',
          amenities: ['WiFi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
          price: null, status: 'Complimentary · up to 6 guests', interest: true }
      ]
    },

    /* BANGKOK · BEFORE THE WEDDING — three approved properties in one window.
     * Exactly one can be active at a time, the way a room category is chosen
     * inside any other stay. Each carries its own property name, its own
     * address and its own breakfast truth. */
    sathorn: {
      name: 'Bangkok · Before the Wedding',
      place: 'Bangkok',
      breakfast: 'Breakfast not included · self-pay',
      windows: [{ id: 'bkk-stay', label: 'Before the Wedding', dates: '21 – 24 February 2027', nights: '3 nights', n: 3,
        bagName: 'Sathorn Penthouse Bangkok', bagImg: 'assets/images/journey/penthouse-01.jpg' }],
      /* the three Bangkok addresses each say what THEY include (room.includes);
       * the group carries only what is true for every one of them */
      includes: [
        'Three nights, 21 → 22, 22 → 23 and 23 → 24 February.',
        'Arrival 21 February 2027: personal pickup by Haruthai — hosted.'
      ],
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
          facts: [['Size', '162 sq.m.'], ['Home', 'Six bedrooms · 5 king beds, 1 queen bed'], ['Capacity', '12 adults'], ['Floor', '4th and 5th floor · private elevator'], ['Stay', '21 – 24 February 2027 · 3 nights'], ['Arrival', '21 February · personal pickup by Haruthai']],
          story: 'A whole house rather than a hotel floor: 162 square metres across the fourth and fifth storeys, six bedrooms, a double-height living room and a garden balcony. A private elevator with its own security system opens directly into the living floor. The kitchen is a real one, the Wi-Fi is measured at 710 Mbps, and there is a Casiotone in the corner for whoever gets there first.',
          groups: [['Space', ['162 sq.m. over the 4th and 5th floors', 'Six bedrooms · 5 king beds, 1 queen bed', 'Double-height living room', 'Dining area and dining table', 'Terrace and balcony with garden furniture', 'Air conditioning, heating and portable fans']],
            ['Kitchen', ['Fully equipped kitchen', 'Refrigerator and freezer', 'Oven, stove and microwave', 'Nespresso coffee machine', 'Electric kettle, toaster, blender and rice cooker', 'Pots, pans, dishes, cutlery and wine glasses']],
            ['Entertainment', ['65" Smart TVs', 'Harman Kardon sound system', 'Piano · Casiotone keyboard', 'Books, reading material and board games']],
            ['Work & connectivity', ['Free high-speed Wi-Fi · 710 Mbps, speed-verified', 'Ethernet connection', 'Dedicated workspace']],
            ['Laundry & care', ['Washing machine and drying rack', 'Iron and ironing board', 'Clothes hangers and blackout blinds', 'Hair dryer, shampoo, shower gel and hot water', 'Towels, bed linen and a safe']],
            ['Family', ['Travel crib', 'High chair', 'Corner protectors', 'Children’s books and toys']],
            ['Access & safety', ['Private entrance and private elevator with security system', 'Self check-in by keybox', 'Free parking on the premises', 'Smoke and carbon-monoxide alarms', 'Fire extinguisher and first-aid kit']]],
          amenities: null, rate: 85,
          includes: [
            'Three nights, 21 → 22, 22 → 23 and 23 → 24 February, in one house for the whole party.',
            'Arrival 21 February 2027: personal pickup by Haruthai — hosted.',
            'Self check-in by keybox, private entrance and private elevator.',
            'Free parking on the premises.',
            'Breakfast is NOT included — a breakfast place near the house is suggested and is self-pay.',
            'Meals cooked in the house, groceries and anything bought in Bangkok are your own.'
          ],
          property: 'Sathorn Penthouse Bangkok', place: 'Sathorn, Bangkok',
          card: 'Elegant 6BR Sathon Penthouse',
          breakfast: 'Breakfast not included · self-pay', role: 'Preferred' },

        /* 026 — U Sathorn Bangkok. Five photographs from the owner's folder,
         * inspected before assignment: the hero is the one frame that carries
         * the room AND the garden it is named for. IMG_3861 is left out — the
         * television's screensaver dominates it. Source mapping is in
         * docs/SOURCE-MAP-BANGKOK.md. */
        { slug: 'u-sathorn-superior-garden', name: 'Superior Room With Garden View',
          cat: 'U Sathorn Bangkok · hotel room',
          property: 'U Sathorn Bangkok', place: 'Sathorn, Bangkok',
          breakfast: 'Breakfast included',
          desc: 'A garden-view room for two in a colonial-style hotel with a courtyard pool, a spa and a proper restaurant.',
          gallery: [
            ['assets/images/usathorn/superior-garden-bed-terrace.jpg', 'The room and its garden terrace'],
            ['assets/images/usathorn/superior-garden-bed-mirror.jpg', 'Towards the terrace doors'],
            ['assets/images/usathorn/superior-garden-desk-lawn.jpg', 'The desk and the lawn beyond'],
            ['assets/images/usathorn/terrace-frangipani.jpg', 'The terrace, under the frangipani'],
            ['assets/images/usathorn/superior-garden-depth.jpg', 'The length of the room']],
          facts: [['Size', '32 sq.m.'], ['Occupancy', '2 adults'], ['Outlook', 'Garden view'],
            ['Stay', '21 – 24 February 2027 · 3 nights'], ['Breakfast', 'Included']],
          story: 'A room of thirty-two square metres looking onto the garden, in a hotel built around a courtyard and a pool. Breakfast is included, the spa and the gym are on site, and the restaurants and the bar mean an evening never has to leave the building.',
          groups: [['The room', ['32 sq.m. · 2 adults', 'Garden view', 'Non-smoking', 'Private bathroom', 'Air conditioning', 'Free Wi-Fi']],
            ['The hotel', ['Outdoor swimming pool', 'Spa', 'Gym', 'Restaurants', 'Bar', 'Garden', 'Concierge', 'Room service']]],
          amenities: null, rate: 64, roomRate: 128,
          includes: [
            'Three nights, 21 → 22, 22 → 23 and 23 → 24 February — one room per couple.',
            'Arrival 21 February 2027: personal pickup by Haruthai — hosted.',
            'Check-in at the lobby.',
            'Breakfast included.'
          ] },

        /* 027 — Shama Yen-Akat Bangkok. Six photographs from the owner's
         * folder, inspected before assignment: the hero is the frame that holds
         * the bed, the dining table and the balcony doors together, because
         * that is the studio. Source mapping in docs/SOURCE-MAP-BANGKOK.md. */
        { slug: 'shama-king-studio-balcony', name: 'King Studio With Balcony',
          cat: 'Shama Yen-Akat Bangkok · serviced studio',
          property: 'Shama Yen-Akat Bangkok', place: 'Yen Akat, Bangkok',
          breakfast: 'Breakfast included',
          desc: 'A serviced studio for two with its own balcony, a dining area and a kitchen corner of your own.',
          gallery: [
            ['assets/images/shama/king-studio-balcony.jpg', 'The studio, from the entrance'],
            ['assets/images/shama/king-studio-balcony-doors.jpg', 'The balcony doors'],
            ['assets/images/shama/king-studio-dining.jpg', 'The dining corner'],
            ['assets/images/shama/king-studio-entry-vanity.jpg', 'The entry and the vanity'],
            ['assets/images/shama/king-studio-bathroom.jpg', 'The bathroom'],
            ['assets/images/shama/king-studio-shower-dressing.jpg', 'The shower and the dressing corner']],
          facts: [['Size', '36 sq.m.'], ['Occupancy', '2 adults'], ['Outlook', 'Balcony and terrace'],
            ['Stay', '21 – 24 February 2027 · 3 nights'], ['Breakfast', 'Included']],
          story: 'Thirty-six square metres with a balcony and a dining area — a studio to live in rather than a room to sleep in. Breakfast is included, the pool is indoors, and there is a café, a garden and a laundry room downstairs.',
          groups: [['The studio', ['36 sq.m. · 2 adults', 'Balcony and terrace', 'Window', 'Non-smoking', 'Dining area', 'Private bathroom', 'Air conditioning', 'Free Wi-Fi']],
            ['The building', ['Indoor swimming pool', 'Gym', 'Restaurant', 'Café', 'Garden', 'Laundry room', 'Coworking and business facilities', 'Concierge']]],
          amenities: null, rate: 40, roomRate: 80,
          includes: [
            'Three nights, 21 → 22, 22 → 23 and 23 → 24 February — one studio per couple.',
            'Arrival 21 February 2027: personal pickup by Haruthai — hosted.',
            'Check-in at the lobby.',
            'Breakfast included.'
          ] }
      ]
    },

    kunming: {
      name: 'Wanxiang Yueju · Kunming',
      place: 'Kunming Railway Station MixC Branch',
      breakfast: 'Breakfast not included · self-pay',
      windows: [{ id: 'kmg', label: 'After the Wedding', dates: '01 – 04 March 2027', nights: '3 nights', n: 3,
        bagName: 'Wanxiang Yueju · Kunming', bagImg: 'assets/images/journey/kunming-01.jpg' }],
      includes: [
        'Three nights, 1 → 2, 2 → 3 and 3 → 4 March, in the room category you choose.',
        'Free Wi-Fi, air conditioning and daily housekeeping in every category.',
        'Breakfast is NOT included — self-pay, and there is a great deal of it around the station.',
        'City transport, meals and anything bought in Kunming are your own.'
      ],
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
          story: 'Junting City-View Loft: a double-height loft with a Haier washing machine, a microwave and a refrigerator, fourteen floors above Kunming.',
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
          story: 'Milano Minimalist Loft — a double-bed loft with a washing machine and the sky-city view, kept deliberately spare.',
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
          story: 'Italian Style Suite: a queen bed and a futon bed in 68 sq.m., balcony, city view, on the fourteenth floor.',
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
          story: 'Light French Suite, the entry room of the house: 68 sq.m., a queen bed, a balcony and the same city view as every other floor.',
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
          story: 'Left Bank French-Style, high on the fourteenth floor: a sound-and-vision king room with the city laid out through the window, a washing machine and a refrigerator of its own. The largest occupancy of the house at four adults.',
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
          story: 'One hundred and thirty-six square metres over two bedrooms and two bathrooms, around a shared living room — Nanyang-style, and the most photographed suite in the building.',
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
          story: 'A queen and a double in one 68 sq.m. suite on the upper floors, arranged so a family does not have to divide itself between two rooms.',
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
          story: 'The Seine Evening Glow loft: a two-storey family room with smart guest controls, a washing machine and the sky-city view the building is known for.',
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
          story: 'A smart family room on a high floor, with its own washing machine and clothes-care corner — plain, quiet and practical.',
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
          story: 'The Solarium Bath Suite is the one with the bathtub set into the light: 68 sq.m. on the fourteenth floor, non-smoking, with the city beyond the glass.',
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
          story: 'The simplest room in the house is still 68 sq.m. with a balcony — a queen bed, a futon, and the city view every floor here gets.',
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
          story: 'Mid-century Amber: warm timber, a queen bed and a futon, twelve floors up, with a balcony onto the city.',
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
      includes: [
        'Two nights, 4 → 5 and 5 → 6 March, below Jade Dragon Snow Mountain.',
        'Breakfast included on both mornings.',
        'Free Wi-Fi and the private hot-spring soup pool where the category has one.',
        'Transfers to and from Lijiang station, meals other than breakfast and excursions are your own.'
      ],
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
          story: 'The Manor Suite opens onto its own snow-view garden on the ground floor, with a private hot-spring pool and a fireplace to sit at afterwards.',
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
          story: 'Fifty-five square metres wrapped in 270 degrees of valley, with a private soup pool beside the window and a fireplace behind it.',
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
          story: 'A ground-floor room with its own courtyard: 270 degrees of snow mountain, a private soup pool and a snow-view fireplace.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker / teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private courtyard', 'Private hot springs', 'Projector', 'Safe in room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 105 },
        { slug: 'snow-mountain-viewing', name: 'Snow Mountain Viewing Room', cat: 'Snow mountain room',
          desc: 'Snow Mountain Viewing Room — 50 sq.m., 1 king bed (2m wide), 1 adult. Floor 2nd floor.',
          /* the Owner-designated photograph for this room (08 Sep 2026): Jade
           * Dragon Snow Mountain over the Baisha rooftops. Canonical — used for
           * this room only, everywhere the room appears. */
          gallery: [[LJG + 'snow-mountain-viewing-1.jpg', 'Jade Dragon Snow Mountain over the rooftops']],
          facts: [['Size', '50 sq.m.'], ['Bed', '1 King Bed (2m wide)'], ['Occupancy', '1 Adult'], ['Location', 'Floor 2nd floor']],
          story: 'Fifty square metres facing the peak: a starry-sky terrace, a private hot-spring soup pool and a fireplace for the cold end of the day.',
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
          story: 'The 270-degree viewing room — snow-view fireplace, private hot-spring soup, and the moon over the mountain from the second and third floors.',
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
          story: 'Eighty-eight square metres behind a ten-metre curtain of floor-to-ceiling glass, with a round bed set to face it. The mountain is the whole third wall; at night the sky replaces it.',
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
          story: 'The Boundless suite: a ten-metre screen of glass, a five-metre private soup pool and a round bed under the sunlit Jinshan face of the mountain.',
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
          story: 'A nine-metre ultra-wide window, a five-metre private hot-spring pool and a snow-viewing fireplace — 88 sq.m. on the second floor.',
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
          story: 'Two hundred and seventy degrees of mountain from the third floor, with a snow-view terrace, a private soup pool and a fireplace.',
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
      includes: [
        'Two nights, 6 → 7 and 7 → 8 March, to close the journey.',
        'Breakfast included on both mornings, for two guests.',
        'Complimentary minibar, bottled water, soft drinks and snacks.',
        'Daily housekeeping and turndown service.',
        'Airport transfers, meals other than breakfast and anything charged to the room are your own.'
      ],
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
          facts: [['Size', '45 sq.m.'], ['Bed', '1 king bed (1.81 – 3 m)'], ['Occupancy', '2 adults · up to 3 adults and 1 child, or 2 adults and 2 children under 12'], ['Location', 'Royal Wing · 8th floor'], ['Outside', 'Private balcony with seating'], ['Breakfast', 'Included for two']],
          story: 'The Royal Wing, eighth floor. The balcony looks over the hotel’s lawns and water features with seating set out on it; inside there is a generous living area, a working desk and a marble bathroom with a walk-in rain shower. Two breakfasts are included, and the minibar is complimentary.',
          groups: [['The room', ['45 sq.m. in the Royal Wing, 8th floor', 'Private balcony with outdoor seating', 'Garden and water-feature outlook', 'Generous living area with sofa and chairs', 'Working desk', 'Non-smoking · blackout curtains and down duvet']],
            ['Bathroom', ['Sparkling marble bathroom', 'Spacious walk-in shower', 'Rainfall shower head', 'Bathrobes, slippers and towels', 'Hair dryer and full toiletries', 'Bidet sprayer']],
            ['Food & drink', ['Breakfast included for two guests', 'Minibar — complimentary', 'Bottled water, soft drinks and snacks — complimentary', 'Coffee machine, tea and electric kettle', 'Fresh fruit', 'Refrigerator']],
            ['Technology', ['Free Wi-Fi and wired internet', 'Television and audio equipment', 'Smart room controls and smart door lock', 'Multi-standard power outlets', 'Telephone']],
            ['Service', ['Daily housekeeping', 'Turndown service', 'Safe in the room', 'Iron and ironing board', 'Welcome gift', 'Baby bath, children’s slippers and bathrobes on request']]],
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
