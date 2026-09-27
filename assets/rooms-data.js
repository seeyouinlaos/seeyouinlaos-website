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
  var YFJ = 'assets/images/yifangju/';   /* the Yifangju Designer Courtyard, Kunming (Owner Drive 800) */
  var LJG = 'assets/images/lijiang/', JNY = 'assets/images/journey/';
  /* ONE SOURCE MAP for the Bangkok accommodation imagery (Owner, 16 Sep 2026 · image quality quickfix): the hero of the
   * detail page, the card of every rail and overview (Your Journey, the journeys page, "Other rooms at …", THE HOUSES),
   * the gallery — one assignment per property, read everywhere. U Sathorn: the Owner's Drive folder of 16 Sep 2026
   * (14 images, all U Sathorn Bangkok: the pool pavilion at dusk and by day, the driveway, the U garden, the lobby, the
   * aerial, the garden-view room). The Sathorn Penthouse (Edit 6) and Shama Yen-Akat Bangkok were deleted (24 Sep 2026). */
  var USA = 'assets/images/usathorn/';
  var STAY_IMAGES = window.SIYL_STAY_IMAGES = {
    uSathorn: { hero: USA + 'pool-pavilion-dusk.jpg', card: USA + 'pool-pavilion-day.jpg', houses: USA + 'pool-pavilion-day.jpg',
      gallery: [[USA + 'pool-pavilion-dusk.jpg', 'The pool pavilion at dusk'], [USA + 'pool-pavilion-day.jpg', 'The courtyard pool by day'], [USA + 'driveway-sunset.jpg', 'The driveway at sunset'],
        [USA + 'entrance-u-garden.jpg', 'The entrance and the U garden'], [USA + 'lobby.jpg', 'The lobby'],
        [USA + 'superior-garden-bed-terrace.jpg', 'The room and its garden terrace'], [USA + 'superior-garden-bed-mirror.jpg', 'Towards the terrace doors'], [USA + 'superior-garden-desk-lawn.jpg', 'The desk and the lawn beyond'],
        [USA + 'terrace-frangipani.jpg', 'The terrace, under the frangipani'], [USA + 'superior-garden-depth.jpg', 'The desk and the terrace doors'], [USA + 'superior-garden-entry.jpg', 'The entry and the television wall']] },
  };
  var KEM = 'assets/images/kempinski/';

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
     THE OWNER'S PREFERRED ROOMS (reviewed 09 September 2026; once the defaults of a package that no longer exists — the packages left on 21 Sep 2026).

     Not "the most expensive room in every house": the configuration the Owner
     selected and reviewed on 09 September 2026, one named room per accommodation
     stage. Read by SIYL_PRICE.premium only.

       21 – 24 FEB  (the Sathorn Penthouse — deleted, Edit 6, 24 Sep 2026: the stage falls to SIYL_PRICE.premium)
       24 – 25 FEB  Special Express No. 25                      100
       25 – 27 FEB  Heritage Grand Premier              170 × 2 = 340
       27 FEB – 01 MAR  Heritage Grand Premier          170 × 1 = 170
       01 MAR       MU9646 Business                             275
       01 – 04 MAR  Jinri Building Scenic Terrace Tub Double  36.33 × 3 = 109   (the Kunming house replaced, 27 Sep 2026)
       04 MAR       C86 Business                                105
       04 – 06 MAR  270° Snow Mountain Viewing Room     100 × 2 = 200
       06 MAR       MU5922 + MU741 Economy flexible             200
       06 – 08 MAR  Deluxe Balcony King                 190 × 2 = 380
                                                       = USD 2,134   (the current Operations Master, 27 Sep 2026)

     The total is NEVER written down. It is the sum of whatever the engine
     actually selects, so that when the shared ledger says a preferred room is
     gone the substitute — and the new total — are both real.
     ======================================================================== */
  window.SIYL_FULL_EXPERIENCE = {
    prewed:      'heritage-grand-premier',
    wedstay:     'heritage-grand-premier',
    kmg:         'jinri-terrace-double',
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
       *   former Bangkok penthouse, 340 per room / night ÷ 4 = 85 per person / night).
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
         * the guest's cost, the second night is complimentary, hosted by
         * Haruthai & Suthep. The note is ONE sentence (Window 007 · TO-00820), printed only where no amount line says it
         * (My Bag, Review) — never a second line item and never a USD 0 row. */
        { id: 'wedstay', label: 'Wedding Stay', dates: '27 February – 1 March 2027', nights: '2 nights', n: 2, pay: 1,
          window: 'fixed', nightsList: ['27 → 28 February', '28 February → 1 March'],
          note: 'Second night complimentary, hosted by Haruthai & Suthep',
          bagName: 'Wedding Stay · Souphattra Heritage', bagImg: 'assets/images/souphattra/heritage-arches-dusk.jpg' }
      ],
      includes: [
        'Pre-Wedding Stay (25 – 27 February): two nights, 25 → 26 and 26 → 27 February, both at your cost.',
        'Wedding Stay (27 February – 1 March): two nights, 27 → 28 February and 28 February → 1 March. The first night is your cost; the second night is complimentary, hosted by Haruthai & Suthep.',
        'The two stays run back to back: if you take both, every night from 25 February to 1 March is covered.',
        'Each stay is a fixed two nights: arriving late or leaving early does not change the amount.',
        'Breakfast is included every morning.',
        'For the two wedding nights you can also take one of the four places in the Guest House complimentary instead.'
      ],
      rooms: [
        /* the categories in ascending order — the default room is the first: The Heritage (Owner, 21 Sep 2026) */
        { slug: 'heritage', name: 'The Heritage', cat: 'Heritage Room',
          desc: 'French colonial elegance in 31 square metres, with a private balcony over the garden.',
          gallery: [[RM + 'the-heritage-1.jpg', 'Dressing corridor and wardrobe'], [RM + 'the-heritage-2.jpg', 'The bedroom'], [RM + 'the-heritage-3.jpg', 'The bathroom']],
          facts: [['Size', '31 sq.m.'], ['Bed', '1 king bed (2.1 m)'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Floors 1 – 3'], ['View', 'Courtyard, garden and pool']],
          story: 'Thirty-one square metres of French colonial elegance, with a private balcony over the garden. The minibar is replenished at no charge throughout your stay.',
          groups: soupGroups(['31 sq.m.', 'Private balcony', 'Courtyard, garden and pool views', 'Sofa, wardrobe, desk and coffee table', 'Cribs can be provided; extra beds cannot be added'], null, null),
          rate: 145 },
        { slug: 'heritage-executive', name: 'Heritage Executive', cat: 'Heritage Room',
          desc: 'A French colonial room with a balcony over the garden — the one category that takes both a crib and an extra bed.',
          gallery: [[RM + 'heritage-executive-1.jpg', 'The bedroom'], [RM + 'heritage-executive-2.jpg', 'Bedroom and balcony'], [RM + 'heritage-executive-3.jpg', 'The bathroom'], [RM + 'heritage-executive-4.jpg', 'Bedroom towards the balcony']],
          facts: [['Size', '37 – 44 sq.m.'], ['Bed', '1 king bed (1.9 m) or 3 twin beds'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Floors 1 – 3'], ['Family', 'Cribs and extra beds can be added · connecting door']],
          story: 'Thirty-seven to forty-four square metres in the French colonial style, with a balcony over the garden. It is the one category in the house that takes both a crib and an extra bed, and it has a connecting door.',
          groups: soupGroups(['37 – 44 sq.m.', 'Balcony over the garden', 'Connecting door', 'Cribs and extra beds can be added', 'Sofa, wardrobe, desk and coffee table'], null, null),
          rate: 155 },
        { slug: 'heritage-grand-premier', name: 'Heritage Grand Premier', cat: 'Heritage Room',
          desc: 'The largest of the heritage rooms, with a private balcony over the garden and the pool.',
          gallery: [[RM + 'heritage-grand-premier-1.jpg', 'The bedroom'], [RM + 'heritage-grand-premier-2.jpg', 'The bedroom and the sofa'], [RM + 'heritage-grand-premier-3.jpg', 'Bedroom towards the balcony'], [RM + 'heritage-grand-premier-4.jpg', 'The sitting corner'], [RM + 'heritage-grand-premier-5.jpg', 'The sofa'], [RM + 'heritage-grand-premier-6.jpg', 'The balcony daybed'], [RM + 'heritage-grand-premier-7.jpg', 'The balcony']],
          facts: [['Size', '49 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child sharing bedding'], ['Location', 'Floors 1 – 3'], ['View', 'Garden, pool and courtyard']],
          story: 'The largest of the heritage rooms at forty-nine square metres, with a private balcony and chairs set out on it, facing the garden and the pool. The minibar is replenished for you throughout the stay, and afternoon tea comes with the room.',
          groups: soupGroups(['49 sq.m.', 'Private balcony with chairs', 'Garden, pool and courtyard views', 'Sofa, wardrobe, desk and coffee table'], null, ['Minibar — complimentary, replenished throughout your stay', 'Afternoon tea', 'Bottled water and soft drinks — complimentary', 'Nespresso machine, coffee and tea', 'Electric kettle', 'Fresh fruit']),
          rate: 170 },
        { slug: 'noble-courtyard', name: 'Noble Courtyard Suite', cat: 'Suite',
          desc: 'Sixty-three square metres with a king bed, a separate living area, two bathrooms and a private balcony over the garden and the pool.',
          gallery: [[RM + 'noble-courtyard-1.jpg', 'The bedroom'], [RM + 'noble-courtyard-2.jpg', 'Bedroom and desk'], [RM + 'noble-courtyard-3.jpg', 'Bedroom towards the balcony']],
          facts: [['Size', '63 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child'], ['Location', 'Ground floor, in the central garden'], ['Bathrooms', 'Two bathrooms and two shower rooms']],
          story: 'Sixty-three square metres arranged for two people who like their own space: a king bed, a separate living area with a sofa and a Smart TV, and — unusually — two bathrooms and two shower rooms, one each. It sits on the ground floor in the middle of the garden, with the balcony opening onto the greenery and the pool.',
          groups: soupGroups(['63 sq.m. on the ground floor', 'Separate living area with sofa and Smart TV', 'Two bathrooms and two shower rooms', 'Private balcony over the garden and pool', 'Set in the central garden'], null, null),
          rate: 240 },
        { slug: 'grand-majestic', name: 'Grand Majestic Suite', cat: 'Suite',
          desc: 'French colonial and Laotian design, with a living room under a high ceiling and a private balcony.',
          gallery: [[RM + 'grand-majestic-suite-1.jpg', 'The bedroom'], [RM + 'grand-majestic-suite-2.jpg', 'The bathroom'], [RM + 'grand-majestic-suite-3.jpg', 'Living and dining']],
          facts: [['Size', '66 – 75 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 1 child'], ['Location', '2nd floor'], ['Outside', 'Private balcony']],
          story: 'French colonial and Laotian design in sixty-six to seventy-five square metres: a living room under a high ceiling, a pantry of its own, and a private balcony to take the first coffee of the day on.',
          groups: soupGroups(['66 – 75 sq.m.', 'Separate living room', 'High ceiling', 'Pantry', 'Private balcony', 'Sofa, wardrobe, desk and coffee table'], null, null),
          rate: 250 }   /* no reservation (Owner, 15 Sep 2026): available until booked */,
        { slug: 'souphattra-majestic', name: 'Souphattra Majestic Suite', cat: 'Suite',
          desc: 'The house suite: a separate living area, pantry and bar, and a long balcony over the pool.',
          gallery: [[RM + 'souphattra-majestic-suite-1.jpg', 'Bedroom towards the balcony'], [RM + 'souphattra-majestic-suite-2.jpg', 'The living area'], [RM + 'souphattra-majestic-suite-4.jpg', 'The bedroom'], [RM + 'souphattra-majestic-suite-3.jpg', 'The bathroom'], [RM + 'souphattra-majestic-suite-5.jpg', 'The bed']],
          facts: [['Size', '84 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 adults · 2 children'], ['Location', '3rd floor'], ['View', 'Pool and garden panorama']],
          story: 'Eighty-four square metres on the top floor. A separate living area with its own pantry and bar sits beside the bedroom, and the balcony runs the length of the suite with the pool and the garden below it. Lao contemporary lines under French colonial ceilings.',
          groups: soupGroups(['84 sq.m. on the top floor', 'Separate living area', 'Pantry and bar', 'Spacious balcony over the pool and garden', 'High ceilings · Lao contemporary and French colonial design'], null, null),
          rate: 290 },
        { slug: 'souphattra-presidential', name: 'Souphattra Presidential', cat: 'Suite',
          desc: 'The largest suite of the house: two bedrooms, private bathrooms and a shared living space under a high ceiling.',
          gallery: [[RM + 'souphattra-presidential-1.jpg', 'The main bedroom'], [RM + 'souphattra-presidential-2.jpg', 'The second bedroom'], [RM + 'souphattra-presidential-3.jpg', 'The living space'], [RM + 'souphattra-presidential-4.jpg', 'The sitting corner'], [RM + 'souphattra-presidential-5.jpg', 'The bathroom'], [RM + 'souphattra-presidential-6.jpg', 'The sofa at the foot of the bed'], [RM + 'souphattra-presidential-7.jpg', 'The bathtub']],
          facts: [['Size', '118 sq.m.'], ['Bed', 'Two bedrooms · 1 king bed and twin beds'], ['Occupancy', '2 guests on this website (the suite sleeps up to 6 adults and 2 children)'], ['Location', '2nd floor'], ['Bathrooms', 'Two private bathrooms']],
          story: 'The only Presidential in the house. Two bedrooms, each with its own bathroom — a king in one, twins in the other — open onto a living area under a high ceiling, with a pantry and a dining table.',
          groups: soupGroups(['118 sq.m., the only one in the house', 'Two bedrooms, each with its own private bathroom', 'King bed and twin beds', 'Separate living area and a shared living space', 'High ceiling', 'Pantry and dining table'], null, null),
          rate: 750 }   /* no reservation (Owner, 15 Sep 2026): available until booked */
      ]
    },

    /* GUEST HOUSE COMPLIMENTARY (Owner, 19 Sep 2026 · package D2 of the Operations Master: "Guest House complimenatry",
     * Complimentary · 0 USD, 27.02 – 01.03.2027). ONE shared house of SIX bookable places: every place is taken
     * individually through the room engine (unit 'A' of 'guesthouse/guest-house'), a party takes as many places as it
     * has members, and signed-in guests see who already shares the house by first name. No bed algorithm, no
     * "Private Residence" (that label was invented), no price. */
    guesthouse: {
      name: 'Guest House complimentary',
      place: 'Vientiane, Laos',
      breakfast: 'Breakfast not included · your own cost',
      windows: [{ id: 'guesthouse', label: 'Wedding Stay', dates: '27 February – 1 March 2027', nights: '2 nights', n: 2,
        bagName: 'Guest House complimentary · Vientiane', bagImg: 'assets/images/guesthouse/guesthouse-01.jpg' }],
      includes: [
        'Two nights, 27 → 28 February and 28 February → 1 March — the two wedding nights.',
        'Complimentary — nothing to pay. The house is shared by four guests; your place is held for you as soon as you take it.',
        'Guest Relations looks after the keys, your arrival and everything around it.',
        /* EDIT 8 (Aui, 25 Sep 2026): a guest of the Guest House complimentary has no breakfast in the stay — it is the guest's own cost */
        'Breakfast is not included and is at your own cost.'
      ],
      rooms: [
        { slug: 'guest-house', name: 'Guest House complimentary', cat: 'Shared guest house',
          desc: 'A one-bedroom guest house in downtown Vientiane, shared by four guests for the two wedding nights.',
          gallery: [['assets/images/guesthouse/guesthouse-01.jpg', 'Living and dining'], ['assets/images/guesthouse/guesthouse-02.jpg', 'The entry'], ['assets/images/guesthouse/guesthouse-03.jpg', 'The balcony'], ['assets/images/guesthouse/guesthouse-04.jpg', 'Towards the temple roofs'], ['assets/images/guesthouse/guesthouse-05.jpg', 'By the window'], ['assets/images/guesthouse/guesthouse-06.jpg', 'A corner of the living room']],
          facts: [['Type', 'Shared guest house'], ['Bedrooms', 'One bedroom'], ['Places', 'Four sleeping places'], ['Location', 'Downtown Vientiane · 300 m to the Mekong Night Market · 800 m to Wat Sisaket']],
          story: 'A one-bedroom guest house in downtown Vientiane, three hundred metres from the Mekong night market and eight hundred from Wat Sisaket. It is offered complimentary for the two wedding nights and shared by four guests — you see who is already staying when you take your place — and Guest Relations looks after the keys, your arrival and everything around it.',
          amenities: ['Wi-Fi', 'Air conditioning', 'Hot water', 'Washer & laundry area', 'Refrigerator', 'Kettle & kitchenette', 'Hair dryer', 'Free parking'],
          price: null, status: 'One of four places in a shared house', interest: true, complimentary: true }
      ]
    },

    /* RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026): the property record, its windows, its price,
       its card, its gallery and its story are gone. The house is not a website product any more and is not replaced; the
       wedding window is the Souphattra Heritage and the Guest House complimentary. */

    sathorn: {
      name: 'Bangkok · Before the Wedding',
      place: 'Bangkok',
      breakfast: 'Breakfast included',
      windows: [{ id: 'bkk-stay', label: 'Before the Wedding', dates: '21 – 24 February 2027', nights: '3 nights', n: 3,
        bagName: 'Bangkok · Before the Wedding', bagImg: USA + 'pool-pavilion-day.jpg' }],
      /* the Bangkok address says what IT includes (room.includes);
       * the group carries only what is true for every one of them */
      includes: [
        'Three nights, 21 → 22, 22 → 23 and 23 → 24 February.',
        'Arrival on 21 February 2027: Haruthai picks you up herself — nothing to pay.'
      ],
      rooms: [
        /* SATHORN PENTHOUSE BANGKOK IS DELETED (Owner, 24 Sep 2026 · Edit 6): the room record, its gallery, its price and
           its story are gone; nothing replaces it. */

        /* 026 — U Sathorn Bangkok. Five photographs from the owner's folder,
         * inspected before assignment: the hero is the one frame that carries
         * the room AND the garden it is named for. IMG_3861 is left out — the
         * television's screensaver dominates it. Source mapping is in
         * docs/SOURCE-MAP-BANGKOK.md. */
        { slug: 'u-sathorn-superior-garden', name: 'Superior Room With Garden View',
          cat: 'Hotel room',
          property: 'U Sathorn Bangkok', place: 'Sathorn, Bangkok',
          breakfast: 'Breakfast included',
          desc: 'A garden-view room for two in a colonial-style hotel around a courtyard pool, with a spa and restaurants.',
          cardImg: STAY_IMAGES.uSathorn.card,
          gallery: STAY_IMAGES.uSathorn.gallery,
          facts: [['Size', '32 sq.m.'], ['Occupancy', '2 adults'], ['View', 'Garden view'],
            ['Stay', '21 – 24 February 2027 · 3 nights'], ['Breakfast', 'Included']],
          story: 'A room of thirty-two square metres looking onto the garden, in a hotel built around a courtyard and a pool. Breakfast is included; the spa, the gym, the restaurants and the bar are all in the hotel.',
          groups: [['The room', ['32 sq.m. · 2 adults', 'Garden view', 'Non-smoking', 'Private bathroom', 'Air conditioning', 'Free Wi-Fi']],
            ['The hotel', ['Outdoor swimming pool', 'Spa', 'Gym', 'Restaurants', 'Bar', 'Garden', 'Concierge', 'Room service']]],
          amenities: null, rate: 64, roomRate: 128,
          includes: [
            'Three nights, 21 → 22, 22 → 23 and 23 → 24 February.',
            'Arrival on 21 February 2027: Haruthai picks you up herself — nothing to pay.',
            'Breakfast included.'
          ] }
        /* SHAMA YEN-AKAT BANGKOK IS DELETED (Owner, 24 Sep 2026): the room record, its gallery, its price and its story are
           gone; nothing replaces it. U Sathorn is the one Bangkok address. */
      ]
    },

    /* THE KUNMING HOUSE IS REPLACED (Owner, 27 Sep 2026 · Package F, Days 09 – 11): the former hotel is no longer bookable. The
       Yifangju Designer Courtyard in Kunming's Old Street is the stay of 1 – 4 March — exactly the three rooms of the current
       Accommodation_Details, each one room, each with its own photographs (Owner Drive 800, one folder per room). The rate is
       the sheet's "Price per Person" per night; the per-person amount for the three nights is rate × 3, rounded to the cent in
       assets/pricing.js alone (002: USD 36.33333333 × 3 = USD 109 per person · USD 218 the room). The rooms keep the Owner's
       numbered order. */
    kunming: {
      name: 'Yifangju Designer Courtyard · Kunming',
      place: 'Jinma Biji Archway · Kunming Old Street',
      breakfast: 'Breakfast included',
      windows: [{ id: 'kmg', label: 'After the Wedding', dates: '1 – 4 March 2027', nights: '3 nights', n: 3,
        bagName: 'Yifangju Designer Courtyard · Kunming', bagImg: YFJ + 'jinri-terrace-double-1.webp' }],
      includes: [
        'Three nights, 1 → 2, 2 → 3 and 3 → 4 March.',
        'Free Wi-Fi, air conditioning, a smart toilet and daily housekeeping in every room.',
        'Breakfast is included every morning.',
        'City transport, other meals and anything bought in Kunming are your own.'
      ],
      numbered: true,
      rooms: [
        { slug: 'elegant-residence', name: '001 · Elegant Residence Double Bed Room', cat: 'Double room · 20 – 22 sq.m.',
          desc: '20 – 22 sq.m. · 1 queen bed (1.65 m) · for one guest · floors 1 – 3',
          gallery: [
          [YFJ + 'elegant-residence-1.webp', 'The bedroom, with the landscape painting above the bed'],
          [YFJ + 'elegant-residence-2.webp', 'The room from the door, with the vanity'],
          [YFJ + 'elegant-residence-3.webp', 'The bed and the vanity mirror'],
          [YFJ + 'elegant-residence-4.webp', 'The table by the window'],
          [YFJ + 'elegant-residence-5.webp', 'The vanity, the wardrobe and the refrigerator'],
          [YFJ + 'elegant-residence-6.webp', 'The washbasin beside the bed'],
          [YFJ + 'elegant-residence-7.webp', 'The smart toilet']],
          facts: [['Size', '20 – 22 sq.m.'], ['Bed', '1 queen bed (1.65 m)'], ['Occupancy', '1 adult'], ['Location', 'Floors 1 – 3'], ['In the room', 'A smart-home system for the whole room · wet and dry areas apart · vanity mirror'], ['Family', 'Extra beds and cribs are not available']],
          story: 'A double room for one guest in the courtyard house: a queen bed, a smart-home system for the whole room, the wet and dry areas kept apart, and a lit vanity mirror.',
          amenities: ['Air conditioning', 'Audio equipment', 'Daily housekeeping', 'Free Wi-Fi', 'Hair dryer', 'LCD TV', 'Non-smoking rooms', 'Private bathroom', 'Refrigerator', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Vanity mirror', 'Window'],
          rate: 42, roomRate: 42 },
        { slug: 'jinri-terrace-double', name: '002 · Jinri Building Scenic Terrace Tub Double', cat: 'Double suite · 60 – 62 sq.m.',
          desc: '60 – 62 sq.m. · 1 king bed (1.81 m) · a private terrace and a bathtub · 3rd floor',
          gallery: [
          [YFJ + 'jinri-terrace-double-1.webp', 'The private terrace at dusk, above the lit old street'],
          [YFJ + 'jinri-terrace-double-2.webp', 'The bedroom, with the terrace beyond the glass'],
          [YFJ + 'jinri-terrace-double-3.webp', 'The table by the terrace door'],
          [YFJ + 'jinri-terrace-double-4.webp', 'The bed and the terrace window'],
          [YFJ + 'jinri-terrace-double-5.webp', 'The king bed'],
          [YFJ + 'jinri-terrace-double-6.webp', 'The bedroom and the glass-walled bathroom with the tub'],
          [YFJ + 'jinri-terrace-double-7.webp', 'The bathtub and the bathroom']],
          facts: [['Size', '60 – 62 sq.m.'], ['Bed', '1 king bed (1.81 m)'], ['Occupancy', '2 adults'], ['Location', '3rd floor'], ['In the room', 'A private terrace · views over the Jinri Building courtyard · a bathtub'], ['Family', 'Extra beds and cribs are not available']],
          story: 'The Jinri Building Scenic Terrace Tub Double Bed Suite: a private terrace above the old street, views over the Jinri Building courtyard, and a bathtub to end the day in.',
          amenities: ['Air conditioning', 'Audio equipment', 'Bathtub', 'Coffee table', 'Daily housekeeping', 'Desk', 'Free Wi-Fi', 'Garden and courtyard view', 'Hair dryer', 'Landmark view', 'LCD TV', 'Non-smoking rooms', 'Private bathroom', 'Refrigerator', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace', 'Wardrobe'],
          rate: 36.33333333, roomRate: 72.66666667 },
        { slug: 'jinri-family-suite', name: '003 · Jinri Terrace Tub Family Suite', cat: 'Family suite · 71 – 74 sq.m.',
          desc: '71 – 74 sq.m. · 1 king bed and 1 double bed · a terrace and a bathtub · 3rd floor',
          gallery: [
          [YFJ + 'jinri-family-suite-1.webp', 'The bedroom, opening onto the terrace'],
          [YFJ + 'jinri-family-suite-2.webp', 'The terrace, towards the Jinri Building'],
          [YFJ + 'jinri-family-suite-3.webp', 'The terrace outside the suite'],
          [YFJ + 'jinri-family-suite-4.webp', 'The bed and the window to the garden'],
          [YFJ + 'jinri-family-suite-5.webp', 'The bedroom and the bathroom beyond'],
          [YFJ + 'jinri-family-suite-6.webp', 'The bathroom with the freestanding tub'],
          [YFJ + 'jinri-family-suite-7.webp', 'The double washbasin']],
          facts: [['Size', '71 – 74 sq.m.'], ['Bed', '1 king bed (1.81 m) and 1 double bed (1.35 m)'], ['Occupancy', '2 adults'], ['Location', '3rd floor'], ['In the room', 'Courtyard views on two sides · a premium bath'], ['Family', 'Extra beds and cribs are not available']],
          story: 'The Jinri Terrace Tub Family Suite: a king bed and a double bed, a terrace with the courtyard on two sides, and a bathroom with a freestanding tub and two basins.',
          amenities: ['Air conditioning', 'Audio equipment', 'Coffee table', 'Daily housekeeping', 'Desk', 'Free Wi-Fi', 'Garden and courtyard view', 'Hair dryer', 'Landmark view', 'LCD TV', 'Non-smoking', 'Private bathroom', 'Refrigerator', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace', 'Wardrobe'],
          rate: 43, roomRate: 86 }
      ]
    },

    lijiang: {
      name: 'Luye Baisha · Lijiang',
      place: 'Baisha, Lijiang · Rizhao Jinshan',
      breakfast: 'Breakfast included',
      windows: [{ id: 'ljg', label: 'After the Wedding', dates: '4 – 6 March 2027', nights: '2 nights', n: 2,
        bagName: 'Luye Baisha · Lijiang', bagImg: 'assets/images/lijiang/view270-1.jpg' }],
      includes: [
        'Two nights, 4 → 5 and 5 → 6 March, below Jade Dragon Snow Mountain.',
        'Breakfast included on both mornings.',
        'Free Wi-Fi, and a private hot-spring pool in the rooms that have one.',
        'Transfers to and from Lijiang station, meals other than breakfast and excursions are your own.'
      ],
      /* All nine operational categories with the Owner-approved per-person /
       * per-night rate from Accommodation_Details. */
      rooms: [
        { slug: 'manor-suite', name: 'Snow Mountain Manor Suite', cat: 'Snow mountain suite',
          desc: '70 sq.m. · 1 king bed · ground floor',
          gallery: [
          [LJG + 'starry-8.jpg', 'The private pool and the garden'],
          [LJG + 'starry-9.jpg', 'The garden towards the mountain'],
          [LJG + 'starry-3.jpg', 'The bedroom towards the mountain']],
          facts: [['Size', '70 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', 'Ground floor (1st floor locally)']],
          story: 'The Manor Suite opens onto its own snow-view garden on the ground floor, with a private hot-spring pool and a fireplace to sit at afterwards.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Garden', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Refrigerator', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 120 },
        { slug: 'soup-pool-270', name: '270° Snow Mountain View Room Private Soup Pool', cat: 'Snow mountain room',
          desc: '55 sq.m. · 1 king bed · 2nd floor',
          gallery: [
          [LJG + 'souppool-1.jpg', 'The room and private pool'],
          [LJG + 'souppool-2.jpg', 'The room towards the mountain'],
          [LJG + 'souppool-3.jpg', 'The fireplace and the peak'],
          [LJG + 'souppool-4.jpg', 'The room at dusk'],
          [LJG + 'souppool-5.jpg', 'The bathroom'],
          [LJG + 'souppool-6.jpg', 'The room in the evening']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', '2nd floor']],
          story: 'Fifty-five square metres wrapped in 270 degrees of valley, with a private hot-spring pool beside the window and a fireplace behind it.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Refrigerator', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 105 },
        { slug: 'private-courtyard-270', name: '270° Private Courtyard Snow Mountain View', cat: 'Snow mountain room',
          desc: '55 sq.m. · 1 king bed · ground floor',
          gallery: [
          [LJG + 'courtyard-1.jpg', 'The room towards the courtyard'],
          [LJG + 'courtyard-2.jpg', 'The bed and the mountain view'],
          [LJG + 'courtyard-3.jpg', 'The soaking tub and the fireplace'],
          [LJG + 'courtyard-4.jpg', 'The room at dawn'],
          [LJG + 'courtyard-5.jpg', 'The bathroom']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', 'Ground floor (1st floor locally)']],
          story: 'A ground-floor room with its own courtyard: 270 degrees of snow mountain, a private hot-spring pool and a snow-view fireplace.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private courtyard', 'Private hot-spring pool', 'Projector', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 105 },
        { slug: 'snow-mountain-viewing', name: 'Snow Mountain Viewing Room', cat: 'Snow mountain room',
          desc: '50 sq.m. · 1 king bed · 2nd floor',
          /* the Owner's ruling of 21 Sep 2026: the three room photographs that stood for the house on The Journey (the bedroom
             towards the valley, the private soup pool, the sitting room and its fireplace towards the mountain) ARE this room —
             they are its gallery; the peak over the Baisha rooftops is the house's own frame (assets/stay-media.js). */
          gallery: [
          [JNY + 'lijiang-01.jpg', 'The room towards the valley'],
          [JNY + 'lijiang-02.jpg', 'The private soaking pool below Jade Dragon Snow Mountain'],
          [JNY + 'lijiang-03.jpg', 'The sitting room and the fireplace towards the mountain']],
          facts: [['Size', '50 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', '2nd floor']],
          story: 'Fifty square metres facing the peak: a starry-sky terrace, a private hot-spring pool and a fireplace for the cold end of the day.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 75 },
        { slug: 'viewing-270', name: '270° Snow Mountain Viewing', cat: 'Snow mountain room',
          desc: '55 sq.m. · 1 king bed · 2nd – 3rd floor',
          gallery: [
          [LJG + 'view270-1.jpg', 'The room at dusk'],
          [LJG + 'view270-2.jpg', 'The wraparound windows'],
          [LJG + 'view270-3.jpg', 'The room at night'],
          [LJG + 'view270-4.jpg', 'Towards the mountain'],
          [LJG + 'view270-5.jpg', 'The bed and the soaking tub'],
          [LJG + 'view270-6.jpg', 'The bathroom']],
          facts: [['Size', '55 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', '2nd – 3rd floor']],
          story: 'The 270-degree viewing room — a snow-view fireplace, a private hot-spring pool, and the moon over the mountain from the second and third floors.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Refrigerator', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 100 },
        { slug: 'starry-sky', name: 'Luye Starry Sky Suite · Immersive View', cat: 'Snow mountain suite',
          desc: '88 sq.m. · 1 king bed · 3rd floor',
          gallery: [
          [LJG + 'starry-1.jpg', 'The round bed and the peak'],
          [LJG + 'starry-2.jpg', 'The suite at dusk'],
          [LJG + 'starry-5.jpg', 'The bed by candlelight'],
          [LJG + 'starry-7.jpg', 'The suite in the evening'],
          [LJG + 'starry-6.jpg', 'The sitting area towards the mountain'],
          [LJG + 'starry-4.jpg', 'The bathroom']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 king bed (3.1 m)'], ['Occupancy', '2 Adults'], ['Location', '3rd floor']],
          story: 'Eighty-eight square metres behind a ten-metre curtain of floor-to-ceiling glass, with a round bed set to face it. The mountain is the whole third wall; at night the sky replaces it.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Projector', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 210 },
        { slug: 'boundless', name: 'Boundless Floor-to-Ceiling Glass Sunlit Suite', cat: 'Snow mountain suite',
          desc: '88 sq.m. · 1 king bed · 3rd floor',
          gallery: [
          [LJG + 'boundless-1.jpg', 'The suite and the pool'],
          [LJG + 'boundless-2.jpg', 'The bathroom'],
          [LJG + 'boundless-3.jpg', 'The shower and the toilet'],
          [LJG + 'boundless-4.jpg', 'The fireplace and the mountain'],
          [LJG + 'boundless-5.jpg', 'The bed and the mountain'],
          [LJG + 'boundless-6.jpg', 'The round bed and the fireplace'],
          [LJG + 'boundless-7.jpg', 'The terrace']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 king bed (3.1 m)'], ['Occupancy', '2 Adults'], ['Location', '3rd floor']],
          story: 'The Boundless suite: a ten-metre screen of glass, a five-metre private hot-spring pool and a round bed under the sunlit Jinshan face of the mountain.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 170 },
        { slug: 'private-soup-view', name: 'Snow Mountain Private Soup Viewing Suite', cat: 'Snow mountain suite',
          desc: '88 sq.m. · 1 king bed · 2nd floor',
          gallery: [
          [LJG + 'soupview-1.jpg', 'The suite towards the mountain'],
          [LJG + 'soupview-2.jpg', 'The lounge and the pool'],
          [LJG + 'soupview-3.jpg', 'The bathroom'],
          [LJG + 'soupview-4.jpg', 'The washbasin'],
          [LJG + 'soupview-5.jpg', 'The suite at dawn'],
          [LJG + 'soupview-6.jpg', 'The soaking pool'],
          [LJG + 'soupview-7.jpg', 'The living space'],
          [LJG + 'soupview-8.jpg', 'The terrace']],
          facts: [['Size', '88 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', '2nd floor']],
          story: 'A nine-metre ultra-wide window, a five-metre private hot-spring pool and a snow-viewing fireplace — 88 sq.m. on the second floor.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa'],
          rate: 125 },
        { slug: 'view-suite-270', name: '270° Snow Mountain View Suite', cat: 'Snow mountain suite',
          desc: '70 sq.m. · 1 king bed · 3rd floor',
          gallery: [
          [LJG + 'suite270-1.jpg', 'The suite and the tub'],
          [LJG + 'suite270-2.jpg', 'The bathroom'],
          [LJG + 'suite270-3.jpg', 'The bed towards the mountain'],
          [LJG + 'suite270-4.jpg', 'The tub and the peak'],
          [LJG + 'suite270-5.jpg', 'The suite at dusk'],
          [LJG + 'suite270-6.jpg', 'The bed and the wardrobe'],
          [LJG + 'suite270-7.jpg', 'The bed and the tub'],
          [LJG + 'suite270-8.jpg', 'The fireplace and the peak']],
          facts: [['Size', '70 sq.m.'], ['Bed', '1 king bed (2 m)'], ['Occupancy', '2 Adults'], ['Location', '3rd floor']],
          story: 'Two hundred and seventy degrees of mountain from the third floor, with a snow-view terrace, a private hot-spring pool and a fireplace.',
          amenities: ['Air conditioning', 'Air purifier', 'Audio equipment', 'Balcony', 'Bathrobe', 'Bathtub or shower', 'Butler service', 'Coffee maker and teapot', 'Electric kettle', 'Fireplace', 'Free Wi-Fi', 'Hair dryer', 'Heating', 'Iron and ironing board', 'Minibar', 'Private hot-spring pool', 'Projector', 'Refrigerator', 'Safe in the room', 'Slippers', 'Smart door lock', 'Smart room controls', 'Smart toilet', 'Sofa', 'Terrace'],
          rate: 120 }   /* no reservation (Owner, 15 Sep 2026): available until booked */,
      ]
    },

    kempinski: {
      name: 'Siam Kempinski Bangkok',
      place: 'Bangkok, Thailand',
      breakfast: 'Breakfast included',
      windows: [{ id: 'kempinski', label: 'The Return', dates: '6 – 8 March 2027', nights: '2 nights', n: 2,
        bagName: 'Siam Kempinski Bangkok', bagImg: 'assets/images/journey/kempinski-01.jpg' }],
      includes: [
        'Two nights, 6 → 7 and 7 → 8 March, to close the journey.',
        'Breakfast included on both mornings, for two guests.',
        'Complimentary minibar, bottled water, soft drinks and snacks.',
        'Daily housekeeping and turndown service.',
        'Airport transfers, meals other than breakfast and anything charged to the room are your own.'
      ],
      rooms: [
        { slug: 'deluxe-balcony-king', name: 'Deluxe Balcony King', cat: 'Deluxe room · non-smoking',
          desc: 'A balcony room in the Royal Wing, for the two closing nights in Bangkok.',
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
          facts: [['Size', '45 sq.m.'], ['Bed', '1 king bed'], ['Occupancy', '2 guests on this website (the room sleeps up to 3 adults and 1 child, or 2 adults and 2 children under 12)'], ['Location', 'Royal Wing · 8th floor'], ['Outside', 'Private balcony with seating'], ['Breakfast', 'Included for two']],
          story: 'The Royal Wing, eighth floor. The balcony looks over the hotel’s lawns and water features with seating set out on it; inside there is a generous living area, a working desk and a marble bathroom with a walk-in rain shower. Two breakfasts are included, and the minibar is complimentary.',
          groups: [['The room', ['45 sq.m. in the Royal Wing, 8th floor', 'Private balcony with outdoor seating', 'Garden and water-feature outlook', 'Generous living area with sofa and chairs', 'Working desk', 'Non-smoking · blackout curtains and down duvet']],
            ['Bathroom', ['Marble bathroom', 'Spacious walk-in shower', 'Rainfall shower head', 'Bathrobes, slippers and towels', 'Hair dryer and full toiletries', 'Bidet sprayer']],
            ['Food & drink', ['Breakfast included for two guests', 'Minibar — complimentary', 'Bottled water, soft drinks and snacks — complimentary', 'Coffee machine, tea and electric kettle', 'Fresh fruit', 'Refrigerator']],
            ['Technology', ['Free Wi-Fi and wired internet', 'Television and audio equipment', 'Smart room controls and smart door lock', 'Multi-standard power outlets', 'Telephone']],
            ['Service', ['Daily housekeeping', 'Turndown service', 'Safe in the room', 'Iron and ironing board', 'Welcome gift', 'Baby bath, children’s slippers and bathrobes on request']]],
          rate: 190 }
      ]
    }
  };

  /* ==========================================================================
     THE ACCOMMODATION MEDIA RULE (Owner, 21 Sep 2026 · the close-out pass) — code level, deterministic.
     A hotel is a hotel: a recommendation, a card, a Bag line or THE HOUSES may show ONLY media explicitly approved for
     that exact property — the property's own folder(s) as recorded here and in src/stay-media.json. Nothing is ever
     inferred from a name ("Lijiang", "Baisha", "Snow Mountain", "Bangkok" …), from a filename, from a city, from the
     destination or Highlights photography, from the nearest available frame, or from another hotel. A path outside the
     property's approved set resolves to '' — the intentional no-photo state — never to a second source.
     ========================================================================== */
  var STAY_FOLDERS = {
    sathorn:    ['assets/images/usathorn/'],
    souphattra: ['assets/images/souphattra/', 'assets/images/rooms/'],   /* assets/images/rooms/ = the Souphattra's own room categories (its Drive folder) */
    guesthouse: ['assets/images/guesthouse/'],
    kunming:    ['assets/images/yifangju/'],   /* the Yifangju Designer Courtyard alone (Owner, 27 Sep 2026) */
    lijiang:    ['assets/images/lijiang/', 'assets/images/journey/lijiang-'],
    kempinski:  ['assets/images/kempinski/', 'assets/images/journey/kempinski-']
  };
  /* the stay-media records (assets/stay-media.js) that belong to each property */
  var STAY_MEDIA_KEYS = { sathorn: ['uSathorn'], souphattra: ['souphattra'], guesthouse: ['guestHouse'], kunming: ['yifangju'], lijiang: ['luyeBaisha'], kempinski: ['kempinski'] };
  /* a frame the property may never show, whatever folder it sits in: destination photography by kind (the peak, the village, the city) */
  var NEVER = /snow-mountain-viewing-1\.jpg$|\/city\/|\/experiences\/|\/1872\/|\/marsilea\/|\/hero\/|\/event\/|\/venue\/|\/temple\/|\/dress|\/train\/|\/transport\/|\/timeline\/|\/alms\//;
  function inFolder(stayKey, src) {
    var list = STAY_FOLDERS[stayKey]; if (!list || !src || NEVER.test(src)) return false;
    for (var i = 0; i < list.length; i++) if (String(src).indexOf(list[i]) === 0) return true;
    return false;
  }
  var ART = window.SIYL_STAY_ART = {
    FOLDERS: STAY_FOLDERS, MEDIA_KEYS: STAY_MEDIA_KEYS, NEVER: NEVER,
    /* the explicit approved set of one property: its media record's frames, its rooms' galleries and cards, its windows' Bag frames — each inside its own folders */
    approved: function (stayKey) {
      var st = window.SIYL_ROOMS[stayKey]; if (!st) return [];
      var out = [], seen = {}, add = function (src) { if (src && inFolder(stayKey, src) && !seen[src]) { seen[src] = true; out.push(src); } };
      var M = window.SIYL_STAY_MEDIA || {};
      (STAY_MEDIA_KEYS[stayKey] || []).forEach(function (k) { ((M[k] && M[k].images) || []).forEach(function (im) { add(im.src); }); });
      (st.rooms || []).forEach(function (r) { add(r.cardImg); (r.gallery || []).forEach(function (g) { add(g[0]); }); });
      (st.windows || []).forEach(function (w) { add(w.bagImg); });
      return out;
    },
    ok: function (stayKey, src) { return !!src && inFolder(stayKey, src) && this.approved(stayKey).indexOf(src) >= 0; },
    /* the card of one room: its own card frame, else the first frame of its own gallery — never anything else */
    card: function (stayKey, slug) {
      var st = window.SIYL_ROOMS[stayKey]; if (!st) return '';
      var r = (st.rooms || []).filter(function (x) { return x.slug === slug; })[0]; if (!r) return '';
      var c = r.cardImg || (r.gallery && r.gallery.length ? r.gallery[0][0] : '');
      return this.ok(stayKey, c) ? c : '';
    },
    /* the house's frame: the window's Bag frame, else the media record's first frame — of this property alone */
    house: function (stayKey, windowId) {
      var st = window.SIYL_ROOMS[stayKey]; if (!st) return '';
      var w = (st.windows || []).filter(function (x) { return !windowId || x.id === windowId; })[0];
      if (w && this.ok(stayKey, w.bagImg)) return w.bagImg;
      var M = window.SIYL_STAY_MEDIA || {}, keys = STAY_MEDIA_KEYS[stayKey] || [];
      for (var i = 0; i < keys.length; i++) { var im = M[keys[i]] && M[keys[i]].images && M[keys[i]].images[0]; if (im && this.ok(stayKey, im.src)) return im.src; }
      return '';
    },
    /* the Bag line's frame: the room's card, else the house's */
    bag: function (stayKey, slug, windowId) { return this.card(stayKey, slug) || this.house(stayKey, windowId); }
  };

  /* Merchandising (Owner rule, 07 Sep 2026): comparable paid options are
   * presented HIGHEST FIRST. Sorted here so the order can never drift out of
   * step with the rates. Rooms without a rate follow, reserved rooms keep
   * their place in the list but are never selectable. */
  Object.keys(window.SIYL_ROOMS).forEach(function (k) {
    /* THE SOUPHATTRA (Owner, 21 Sep 2026 · the global My Trip rebuild): every category shown from The Heritage upward —
     * Heritage 145 · Heritage Executive 155 · Heritage Grand Premier 170 · Noble Courtyard 240 · Grand Majestic Suite 250 ·
     * Souphattra Majestic Suite 290 · Souphattra Presidential 750 — the default room, The Heritage, first */
    /* a house whose rooms carry the Owner's own numbers (the Yifangju: 001 · 002 · 003) keeps that order */
    if (window.SIYL_ROOMS[k].numbered) return;
    if (k === 'souphattra') { window.SIYL_ROOMS[k].rooms.sort(function (a, b) { return (a.rate == null ? 1e9 : a.rate) - (b.rate == null ? 1e9 : b.rate); }); return; }
    window.SIYL_ROOMS[k].rooms.sort(function (a, b) {
      return (b.rate == null ? -1 : b.rate) - (a.rate == null ? -1 : a.rate);
    });
  });
})();
