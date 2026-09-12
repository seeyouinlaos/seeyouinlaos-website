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
      cat: 'Transportation',
      operator: 'State Railway of Thailand',
      name: 'Special Express No. 25',
      place: 'Bangkok → Nong Khai → Vientiane',
      dates: '24 – 25 February 2027',
      anchor: 'j-train',
      story: 'The whole party leaves Bangkok together at dusk and wakes on the ' +
        'Mekong. First Class on the State Railway of Thailand means a private ' +
        'lockable cabin rather than a seat: two berths, a door you close behind ' +
        'you, and a lower bed that folds back into two facing seats for the ' +
        'evening. It is the one night of the journey that is also the journey.',
      facts: [
        ['Service', 'Special Express No. 25 · State Railway of Thailand'],
        ['Route', 'Bangkok (Krung Thep Aphiwat) → Nong Khai, then onward to Vientiane by road'],
        ['Departure', '24 February 2027 · 20:25 · Krung Thep Aphiwat Central Terminal'],
        ['Arrival', '25 February 2027 · 06:25 · Nong Khai'],
        ['On board', 'Approximately 10 hours'],
        ['Class', 'First Class Sleeper · private cabin'],
        ['Cabin', '2 berths · upper and lower']
      ],
      groups: [
        ['Your cabin', [
          'A private cabin with a lockable door',
          'Two berths — one upper, one lower',
          'The lower berth converts into two facing seats by day',
          'Single occupancy where the carriage allows it',
          'Compartments for bags and personal items']],
        ['Comfort', [
          'Air conditioning with individual control',
          'Reading lights',
          'Foldable table and mirror',
          'In-suite washbasin in every cabin',
          'Power and USB outlets']],
        ['Sleep', [
          'Bedding and pillows',
          'Clean linen',
          'Blankets',
          'The berth is made up for you by the attendant']],
        ['Bathrooms', [
          'Shared western-style toilets, just outside the cabins',
          'A shared hot-water shower in the CNR First Class carriage']],
        ['Dining', [
          'Meals ordered from the cabin and brought to you by the train staff',
          'A dining car on board',
          'Thai and international selections',
          'Vegetarian options']],
        ['Service & support', [
          'Attendant service throughout the night',
          'Bedding set up and cleared for you',
          'Staff on hand for assistance for the length of the journey',
          'Guest Relations travels with the party']]
      ],
      included: [
        'One berth in a First Class Sleeper cabin, Bangkok to Nong Khai.',
        'Dinner on board and breakfast the next morning.',
        'The border-crossing documentation prepared for you.',
        'The coordinated onward transfer from Nong Khai across the border to Souphattra Heritage in Vientiane.'
      ],
      excluded: [
        'Anything ordered on board beyond the included dinner and breakfast.',
        'Personal expenses at the terminal or at the border.'
      ],
      transfer: [
        'Nong Khai, early morning: the party is met and travels on together by road.',
        'The border formalities at the Thai–Lao Friendship Bridge are prepared in advance; each guest still presents themselves in person.',
        'The road continues to Souphattra Heritage Vientiane, where the Pre-Wedding Stay begins.'
      ],
      good: [
        'The train carries a single First Class carriage of twelve lockable cabins — twenty-four berths in total. Cabins are held for the party.',
        'This is an overnight service: the evening is spent on board and the arrival is at daybreak.',
        'Guests travelling as a pair share one cabin; the arrangement is made with Guest Relations.'
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
      cat: 'Transportation',
      operator: 'China Eastern Airlines',
      name: 'MU9646 · Vientiane → Kunming',
      place: 'Vientiane → Kunming',
      dates: '01 March 2027',
      anchor: 'j-mu9646',
      story: 'The wedding days end and the journey turns north. One non-stop ' +
        'flight out of Vientiane at ten to four, an hour and thirty-five ' +
        'minutes in the air, and the party is in Kunming before dinner — the ' +
        'city that calls itself eternal spring, and means it. Business Class ' +
        'is the arrangement we hold; an Economy Flexible fare is offered ' +
        'beside it for anyone who would rather spend the difference elsewhere.',
      facts: [
        ['Flight', 'MU9646 · China Eastern Airlines'],
        ['Route', 'Vientiane (VTE) → Kunming (KMG)'],
        ['Date', '01 March 2027'],
        ['Departure', '15:50 · Vientiane (VTE) Terminal 1'],
        ['Arrival', '18:25 · Kunming (KMG)'],
        ['Routing', 'Non-stop · 1 hour 35 minutes'],
        ['Aircraft', 'Boeing 738 narrowbody'],
        ['Class', 'Business Class, or Economy Flexible']
      ],
      groups: [
        ['Your seat', [
          'One Business Class seat per guest',
          'Business Class check-in and boarding',
          'Times shown are local at each airport']],
        ['On board', [
          'A meal is served in Business Class on this service',
          'Cabin service throughout the flight']],
        ['Baggage', [
          'Two pieces of checked baggage, included',
          'Cabin baggage to the operator’s Business Class allowance']],
        ['Fare conditions', [
          'Free rescheduling before departure',
          'Conditional ticket refund before departure',
          'Changes are made through Guest Relations, never on this website']]
      ],
      included: [
        'One Business Class seat, Vientiane to Kunming, non-stop.',
        'Two pieces of checked baggage.',
        'The meal service carried in Business Class on this flight.'
      ],
      excluded: [
        'Airport transfers at either end.',
        'Anything purchased at the airport.'
      ],
      transfer: [
        'Departure from Vientiane is at 15:50 on 1 March, after the Wedding Stay ends.',
        'Arrival in Kunming is the same afternoon, in time for the first night at Wanxiang Yueju.',
        'Transfers between the airports and the hotels are arranged by each guest.'
      ],
      good: [
        'The flight number, times and fare shown here are the Owner’s confirmed production arrangement for the party.',
        'Seats are held as a block; Guest Relations confirms each name.'
      ],
      gallery: [
        [T + 'mu9632-business-1.jpg', 'Business Class · China Eastern'],
        [T + 'mu9632-business-2.jpg', 'Business Class · lie-flat'],
        [T + 'mu9632-business-3.jpg', 'Business Class seat']
      ]
    },

    /* ---------------------------------------------------------------- 07 */
    c86: {
      id: 'c86',
      cat: 'Transportation',
      operator: 'China Railway',
      name: 'C86 · Kunming → Lijiang',
      place: 'Kunming → Lijiang',
      dates: '04 March 2027',
      anchor: 'j-c86',
      story: 'Five hundred and twenty-seven kilometres of Yunnan in one ' +
        'morning: out of Kunming at a quarter past ten, across the gorges, and ' +
        'into Lijiang in the early afternoon. Business Class here is a 1 + 1 ' +
        'carriage — a single seat on each side of the aisle, so nobody sits ' +
        'beside anyone.',
      facts: [
        ['Service', 'C86 · high-speed train'],
        ['Route', 'Kunming Railway Station → Lijiang Railway Station'],
        ['Date', '04 March 2027'],
        ['Departure', '10:15 · Kunming'],
        ['Arrival', '13:44 · Lijiang'],
        ['Routing', 'Direct · 3 hours 29 minutes'],
        ['Distance', 'About 527 kilometres'],
        ['Class', 'Business Class · 1 + 1 seating']
      ],
      groups: [
        ['Your seat', [
          '1 + 1 seating layout — one seat each side of the aisle',
          'Spacious seat pitch',
          'Adjustable backrest',
          'Tray table',
          'Luggage rack']],
        ['Comfort', [
          'Wireless charging',
          'Power outlet at the seat',
          'Air conditioning',
          'Bathroom and hot-water supply on board',
          'Slippers, blanket and eye mask, subject to availability']],
        ['Dining', [
          'Complimentary snacks and drinks served at the seat',
          'Availability follows the service on the day']],
        ['Priority Ticketing', [
          'Expedited ticketing and shorter wait times.']]
      ],
      included: [
        'One Business Class seat, Kunming to Lijiang, direct.',
        'Complimentary drinks and snacks at the seat.',
        'Priority Ticketing: expedited ticketing and shorter wait times.'
      ],
      excluded: [
        'Transfers to Kunming Railway Station and from Lijiang Railway Station.',
        'Anything purchased on board beyond the included service.'
      ],
      transfer: [
        'Kunming Railway Station is in Guandu District; guests make their own way there from the hotel.',
        'The train arrives at Lijiang Railway Station at 13:44; the road on to Baisha is arranged by each guest.',
        'Seating arrangements can vary by train set.'
      ],
      good: [
        'The line cut the Kunming–Lijiang journey from about seven hours to about three and a half; this service runs at up to 200 km/h.',
        'The train number, times and fare shown here are the Owner’s confirmed production arrangement for the party.'
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
      cat: 'Transportation',
      operator: 'China Eastern Airlines',
      name: 'MU5924 + MU741 · Lijiang → Bangkok',
      place: 'Lijiang → Kunming → Bangkok',
      dates: '06 March 2027',
      anchor: 'j-return',
      story: 'The way home, in two hops and one morning. Out of Lijiang just ' +
        'after ten, ninety minutes on the ground in Kunming, and into Bangkok ' +
        'early in the afternoon — with two closing nights still to come.',
      facts: [
        ['Flights', 'MU5924, then MU741 · China Eastern Airlines'],
        ['Route', 'Lijiang (LJG) → Kunming (KMG) → Bangkok (BKK)'],
        ['Date', '06 March 2027'],
        ['First leg', 'MU5924 · Boeing 737 · 10:35 → 11:45 · 1 h 10 m'],
        ['Transfer', 'Kunming · 1 h 30 m'],
        ['Second leg', 'MU741 · Boeing 738 · 13:15 → 14:55 · 2 h 40 m'],
        ['Door to door', '10:35 → 14:55 · 5 h 20 m'],
        ['Class', 'Economy flexible · 1 seat per guest']
      ],
      groups: [
        ['Your seat', [
          'One Economy flexible seat per guest, on both legs',
          'Times shown are local at each airport']],
        ['Baggage', [
          'Two pieces of checked baggage, included',
          'Baggage is checked through to Bangkok']],
        ['Fare conditions', [
          'Free rescheduling before departure',
          'Conditional ticket refund before departure',
          'Changes are made through Guest Relations, never on this website']],
        ['The transfer', [
          'One hour thirty minutes in Kunming between the two flights',
          'Both flights are operated by China Eastern Airlines']]
      ],
      included: [
        'One Economy flexible seat on MU5924, Lijiang to Kunming.',
        'One Economy flexible seat on MU741, Kunming to Bangkok.',
        'Two pieces of checked baggage.'
      ],
      excluded: [
        'Airport transfers at either end.',
        'Meals and anything purchased on board or at the airport.'
      ],
      transfer: [
        'Departure from Lijiang is mid-morning on 6 March; the road to the airport is arranged by each guest.',
        'The connection in Kunming is one hour thirty minutes, within the same airline.',
        'Arrival in Bangkok is 14:55, in time to check in at the Siam Kempinski the same afternoon.'
      ],
      good: [
        'The flight numbers, times and fare shown here are the Owner’s confirmed production arrangement for the party.',
        'This is the flexible Economy fare: it can be rescheduled before departure.'
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
