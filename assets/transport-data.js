/* ============================================================================
   SEE YOU IN LAOS — TRANSPORT PRODUCTS, in the guest's own terms.

   Four products carry the journey. Each one is described from the CURRENT
   source only:
     · H&S_Wedding_Operations_Master · Accommodation_Details (columns C, K, X, AH)
     · Overview_Hotel_Restaurant (Day 04, Day 12-01, Day 14-01)
     · the Owner's production overrides of 03 / 07 / 08 September 2026
   Where the Sheet and an Owner override disagree, the OVERRIDE is production
   authority and the contradicted secondary facts are simply omitted — never
   quietly re-attached to a different service. Nothing here is invented:
   no Wi-Fi, no lounge, no chauffeur, no immigration guarantee, no capacity
   claim that the source does not make.

   The amounts live in assets/pricing.js (FLAT). This file never prices.
   ========================================================================== */
(function () {
  'use strict';
  var T = 'assets/images/transport/';

  window.SIYL_TRANSPORT = {

    /* ---------------------------------------------------------------- 02 */
    train: {
      id: 'train',
      cat: 'Travel',
      operator: 'State Railway of Thailand',
      name: 'Special Express No. 25',
      place: 'Bangkok → Nong Khai → Vientiane',
      dates: '24 – 25 February 2027',
      anchor: 'j-train',
      story: 'We leave Bangkok together in the evening and wake up on the Mekong. ' +
        'First Class on the State Railway of Thailand is a private cabin rather ' +
        'than a seat: two berths behind a door you can lock.',
      facts: [
        ['Service', 'Special Express No. 25 · State Railway of Thailand'],
        ['Route', 'Bangkok (Krung Thep Aphiwat) → Nong Khai, then onward to Vientiane by road'],
        ['Departure', '24 February 2027 · 20:25 · Krung Thep Aphiwat Central Terminal'],
        ['Arrival', '25 February 2027 · 06:25 · Nong Khai'],
        ['On board', '10 h'],
        ['Class', 'First Class Sleeper · private cabin'],
        ['Cabin', '2 berths · upper and lower']
      ],
      groups: [
        ['Your cabin', [
          'A private cabin with a lockable door',
          'The lower berth folds back into two facing seats',
          'Compartments for bags and personal items']],
        ['Comfort', [
          'Air conditioning with individual control',
          'Reading lights',
          'A foldable table',
          'A washbasin in some cabins, and shared washbasins nearby',
          'Power outlets']],
        ['Sleep', [
          'Bedding and pillows',
          'Fresh linen',
          'Blankets',
          'The attendant makes up your berth']],
        ['Bathrooms', [
          'Shared western-style toilets, just outside the cabins',
          'A shared hot-water shower in the First Class carriage']],
        ['Dining', [
          'Meals ordered from the cabin and brought to you by the train staff',
          'A dining car on board',
          'Thai and international selections',
          'Vegetarian options']],
        ['Service', [
          'Attendant service throughout the night',
          'Guest Relations travels with us']]
      ],
      included: [
        'One berth in a First Class Sleeper cabin, Bangkok to Nong Khai.',
        'The border-crossing documentation prepared for you.',
        'The van from Nong Khai across the border to Souphattra Heritage in Vientiane.'
      ],
      excluded: [
        'Meals on board — ordered from your cabin and paid on the train.',
        'Personal expenses at the terminal or at the border.'
      ],
      transfer: [
        'At Nong Khai, early in the morning, we are met and continue together by road.',
        'The border formalities at the Thai–Lao Friendship Bridge are prepared in advance; everyone still crosses in person.',
        'The road continues to Souphattra Heritage Vientiane, where the Pre-Wedding Stay begins.'
      ],
      good: [
        'The train has one First Class carriage: 12 cabins, 24 berths.',
        'If you are travelling as a pair, you share one cabin; Guest Relations arranges the cabins with you.'
      ],
      gallery: [
        [T + 'train-no25-srt-train.jpg', 'State Railway of Thailand'],
        [T + 'train-no25-first-class-cabin-1.jpg', 'First Class Sleeper cabin'],
        [T + 'train-no25-first-class-cabin-2.jpg', 'First Class Sleeper cabin · by the window'],
        [T + 'train-no25-first-class-passenger-room.jpg', 'First Class Passenger Room · Krung Thep Aphiwat'],
        [T + 'train-no25-krung-thep-aphiwat.jpg', 'Krung Thep Aphiwat Central Terminal'],
        [T + 'train-no25-station-hall.jpg', 'The terminal hall'],
        [T + 'train-no25-terminal-aerial.jpg', 'Krung Thep Aphiwat from above'],
        [T + 'van-transfer-1.jpg', 'The onward transfer · Nong Khai to Souphattra Heritage'],
        [T + 'van-transfer-2.jpg', 'The onward transfer · on board']
      ]
    },

    /* ---------------------------------------------------------------- 05 */
    mu9646: {
      id: 'mu9646',
      cat: 'Travel',
      operator: 'China Eastern Airlines',
      name: 'MU9646 · Vientiane → Kunming',
      place: 'Vientiane → Kunming',
      dates: '1 March 2027',
      anchor: 'j-mu9646',
      story: 'After the wedding days, the journey turns north: one non-stop ' +
        'flight from Vientiane at 15:50, 1 h 35 min in the air, and we are in ' +
        'Kunming at 18:25, in time for dinner. You choose your fare: Business ' +
        'Class or Economy Flexible.',
      facts: [
        ['Flight', 'MU9646 · China Eastern Airlines'],
        ['Route', 'Vientiane (VTE) → Kunming (KMG)'],
        ['Date', '1 March 2027'],
        ['Departure', '15:50 · Vientiane (VTE) Terminal 1'],
        ['Arrival', '18:25 · Kunming (KMG)'],
        ['Duration', 'Non-stop · 1 h 35 min'],
        ['Aircraft', 'Boeing 737-800'],
        ['Class', 'Business Class or Economy Flexible']
      ],
      groups: [
        ['Your seat', [
          'Times shown are local at each airport']],
        ['On board', [
          'A meal in Business Class; no meal in Economy Flexible']],
        ['Baggage', [
          'Two pieces of checked baggage in Business Class, one in Economy Flexible',
          'Cabin baggage as the airline allows for your fare']],
        ['Fare conditions', [
          'Free rescheduling before departure',
          'Refund possible before departure, under conditions',
          'Any change goes through Guest Relations.']]
      ],
      included: [
        'One seat in the fare you choose, Vientiane to Kunming, non-stop.'
      ],
      excluded: [
        'Airport transfers at either end.',
        'Anything purchased at the airport.'
      ],
      transfer: [
        'Departure from Vientiane is at 15:50 on 1 March, after the Wedding Stay ends.',
        'Arrival in Kunming is at 18:25 the same evening, in time for the first night at Wanxiang Yueju.'
      ],
      good: [
        'The flight, the times and both fares are the ones we have planned for everyone.',
        'Guest Relations confirms each seat with you by name.'
      ],
      gallery: [
        [T + 'mu9632-business-1.jpg', 'Business Class · China Eastern'],
        [T + 'mu9632-business-2.jpg', 'Business Class · the cabin'],
        [T + 'mu9632-business-3.jpg', 'Business Class seat']
      ]
    },

    /* ---------------------------------------------------------------- 07 */
    c86: {
      id: 'c86',
      cat: 'Travel',
      operator: 'China Railway',
      name: 'C86 · Kunming → Lijiang',
      place: 'Kunming → Lijiang',
      dates: '4 March 2027',
      anchor: 'j-c86',
      story: 'Across Yunnan and its gorges by high-speed train, from Kunming ' +
        'in the morning to Lijiang by early afternoon, in Business Class.',
      facts: [
        ['Service', 'C86 · high-speed train'],
        ['Route', 'Kunming Railway Station → Lijiang Railway Station'],
        ['Date', '4 March 2027'],
        ['Departure', '10:15 · Kunming'],
        ['Arrival', '13:44 · Lijiang'],
        ['Duration', 'Direct · 3 h 29 min'],
        ['Distance', 'About 527 kilometres'],
        ['Class', 'Business Class']
      ],
      groups: [
        ['Your seat', [
          'Generous legroom',
          'Adjustable backrest',
          'Tray table',
          'Luggage rack']],
        ['Comfort', [
          'Wireless charging',
          'Power outlet at the seat',
          'Air conditioning',
          'A bathroom and hot water on board',
          'Slippers, blanket and eye mask, subject to availability']],
        ['Dining', [
          'Snacks and drinks at your seat, included in Business Class, as available on the day']]
      ],
      included: [
        'One Business Class seat, Kunming to Lijiang, direct.'
      ],
      excluded: [
        'Transfers to Kunming Railway Station and from Lijiang Railway Station.',
        'Anything else you buy on board.'
      ],
      transfer: [
        'Kunming Railway Station is in Guandu District.',
        'From Lijiang Railway Station, the road continues to Baisha and the hotel.',
        'Seating arrangements can vary by train set.'
      ],
      good: [
        'The line cut the Kunming–Lijiang journey from about seven hours to about three and a half; this service runs at up to 200 km/h.',
        'The train, the times and the fare are the ones we have planned for everyone. Guest Relations confirms each seat with you by name.'
      ],
      gallery: [
        [T + 'c642-train-snow-mountain.jpg', 'Below Jade Dragon Snow Mountain'],
        [T + 'c642-business-cabin-1.jpg', 'Business Class cabin'],
        [T + 'c642-business-cabin-2.jpg', 'Business Class cabin'],
        [T + 'c642-business-seat.jpg', 'Business Class seat · reclined'],
        [T + 'c642-train-forest.jpg', 'The Kunming – Lijiang line'],
        [T + 'c642-gorge-bridge.jpg', 'The line across the gorge']
      ]
    },

    /* ---------------------------------------------------------------- 09 */
    'return': {
      id: 'return',
      cat: 'Travel',
      operator: 'China Eastern Airlines',
      /* THE RETURN FLIGHTS (Owner / Haruthai confirmed, 20 Sep 2026, with the airline's own search as evidence): MU5922 + MU741 via
         Kunming on 06.03.2027, 10:00 → 14:55 — every earlier flight number for this leg is superseded; the amount stays the
         approved USD 200 */
      name: 'MU5922 + MU741 · Lijiang → Bangkok',
      place: 'Lijiang → Kunming → Bangkok',
      dates: '6 March 2027',
      anchor: 'j-return',
      story: 'Back to Bangkok in two flights, with a change of plane in ' +
        'Kunming — and two last nights still to come.',
      facts: [
        ['Flights', 'MU5922, then MU741 · China Eastern Airlines'],
        ['Route', 'Lijiang (LJG) → Kunming (KMG) → Bangkok (BKK)'],
        ['Date', '6 March 2027'],
        ['First leg', 'MU5922 · Boeing 737 · 10:00 → 11:00 · 1 h'],
        ['Connection', 'Kunming · 2 h 20 min'],
        ['Second leg', 'MU741 · Boeing 737-800 · 13:20 → 14:55 · 2 h 35 min'],
        ['In total', '10:00 → 14:55 · 5 h 55 min'],
        ['Class', 'Economy Flexible · 1 seat per guest']
      ],
      groups: [
        ['Your seat', [
          'Times shown are local at each airport']],
        ['Baggage', [
          'Two pieces of checked baggage, included',
          'Baggage is checked through to Bangkok']],
        ['Fare conditions', [
          'Free rescheduling before departure',
          'Refund possible before departure, under conditions',
          'Any change goes through Guest Relations.']]
      ],
      included: [
        'One Economy Flexible seat on MU5922, Lijiang to Kunming.',
        'One Economy Flexible seat on MU741, Kunming to Bangkok.'
      ],
      excluded: [
        'Airport transfers at either end.',
        'Anything you buy on board or at the airport.'
      ],
      transfer: [
        'Arrival in Bangkok is at 14:55, in time to check in at the Siam Kempinski the same afternoon.'
      ],
      good: [
        'The flights, the times and the fare are the ones we have planned for everyone. Guest Relations confirms each seat with you by name.'
      ],
      gallery: [
        [T + 'mu5924-economy-cabin-1.jpg', 'Economy Class · China Eastern'],
        [T + 'mu5924-economy-cabin-2.jpg', 'Economy Class seats'],
        [T + 'mu5924-economy-cabin-3.jpg', 'Economy Class cabin'],
        [T + 'mu5924-economy-meal.jpg', 'On board'],
        [T + 'mu5924-economy-ife.jpg', 'Seatback entertainment']
      ]
    }
  };

  window.SIYL_TRANSPORT_ORDER = ['train', 'mu9646', 'c86', 'return'];
})();
