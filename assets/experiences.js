/* Canonical H&S Experience dataset — informational discovery content for the
 * public site and the Guest Area. Every entry is one place from the Owner's
 * Operations Master (sheet Overview_Hotel_Restaurant, column = `roles`, row =
 * `row`) or from the Vientiane city portrait (`row: 'city'`). Photographs come
 * from the numbered Drive folders: the lead in `img`, the curated set in
 * assets/experience-galleries.js (generated, source-traced). Nothing here is
 * charged and nothing is booked — the ONE exception is a place that carries a
 * `select` block: it is offered through the Journey selection, as a request.
 * Paths are site-root-relative; the register page prefixes '../'. */
/* THE TAXONOMY (Owner, 22 Sep 2026): a place's CATEGORY says what the place IS — restaurant · cafe · bar · club · experience ·
 * place — never what happens there (lunch at a café does not make it a restaurant; drinks at a café do not make a second bar).
 * One canonical identity per venue, one Discover appearance. `roles` holds the one category role (a restaurant's the meal the
 * itinerary uses it for). `visits` is the chronology: every itinerary day the place is visited (the approved overview of the
 * Operations Master), with the day's sequence (`seq`, the schedule's clock, never shown) — a place visited twice keeps one card. */
window.SIYL_EXP = [
  /* THAILAND · BANGKOK · 22 – 24 February 2027 */
  { id: 'bkk-curvy', category: 'restaurant', roles: ['lunch'], visits: [{ day: 2, date: '2027-02-22', seq: 1000, what: 'Lunch' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 February 2027', name: 'Curvy.Dining', where: 'Bangkok', cats: 'Dining · Design', img: 'assets/images/experiences/bkk-curvy-01.jpg', teaser: 'Thai flavours with a modern European hand, in a design-led Bangkok dining room.' },
  /* SÜHRING — the one place with a full record in the Owner's sheet
   * "Experience, Restaurant, Cafe_Details" (Suhring): every text below is that
   * record, structured, nothing added. THE PRICE (Owner, 20 Sep 2026 — the Highlight): the house's own menu card, the
   * Erlebnis at THB 9,800 (USD 294) or the shorter sequence at THB 7,800 (USD 234), per person, from the one calculation
   * source (assets/pricing.js FLAT.suhring.menus); the earlier source cell "$180.00" is superseded. Optional, selectable
   * through the Journey like the Afternoon Tea — a restaurant request arranged through the Journey workflow, never a
   * confirmed reservation. */
  /* DATED (the current Operations Master, 19 Sep 2026): Day 01 · 21.02.2027 · DINNER — the first evening in Bangkok
   * (the Overview's Dinner cell; the sheet record's opening hours are the restaurant's own and are kept below) */
  { id: 'bkk-suhring', category: 'restaurant', roles: ['dinner'], visits: [{ day: 1, date: '2027-02-21', seq: 1900, what: 'Dinner' }], row: 'Day 01 · 21.02.2027', sheet: 'FULL', chapter: 'bkk', featured: true, day: '21 February 2027', name: 'Sühring', where: 'Bangkok', cats: 'German fine dining · Dinner',
    maps: 'https://maps.app.goo.gl/2b4whggW3YCnxN6u5?g_st=ic', link: 'https://www.restaurantsuhring.com/menu.html',
    img: 'assets/images/experiences/bkk-suhring-01.jpg',
    teaser: 'German cooking from two brothers’ family recipes, in a restored 1970s villa.',
    intro: 'The brothers cook the German food they grew up with — family recipes and their grandmother’s kitchen, reinterpreted with a modern hand.',
    sections: [
      /* ABOUT SÜHRING (Window 007, 24 Sep 2026): the brothers’ own words only — three first-person sections, each with one plain label and
         their attribution; the marketing sections (“The philosophy”, “The founders”) are retired */
      { k: 'Their family', t: 'Where it began', p: ['Our family is undeniably the foundation of who we have become today. It has given us examples of love, behaviour and values that continue to shape our identity. The kitchen was always the heart of our home, and we are especially grateful to our grandmother, who showed us through her devotion to cooking how magical food can be.'], by: 'Mathias and Thomas Sühring' },
      { k: 'Their grandmother', t: 'The first mentor', p: ['Our grandmother Christa, herself a trained chef, was our first mentor. She showed us that food could be both humble and refined. On her farm just outside Berlin, she taught us the beauty of the seasons and of the ingredients she grew.', 'Driven by her passion for cooking, she created a warm, welcoming environment where everyday family meals became cherished, lasting memories. That philosophy has stayed with us ever since, and it shapes every menu we write.'], by: 'Mathias and Thomas Sühring' },
      { k: 'Their kitchen today', t: 'Family recipes, reinterpreted', p: ['Today, we draw inspiration from cherished family recipes, childhood memories and years of travel. Our cooking reinterprets the rich traditions of German cuisine with a contemporary twist, emphasising technique, refinement and a deep respect for the ingredients we work with.'], by: 'Mathias and Thomas Sühring' }
    ],
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the premium table of the first evening — Three MICHELIN Stars, the house's own menu
       card (the Owner's upload) as the source of the menu and its two prices; supplements, pairings and caviar are the house's
       own and never products here */
    highlight: {
      distinction: 'Three MICHELIN Stars',
      line: 'Modern German cuisine by Thomas and Mathias Sühring',
      house: 'A restored 1970s villa that still feels like a family home.',
      menuTitle: 'The Erlebnis menu',
      menuNote: 'The house’s current menu card. The complete Erlebnis is THB 9,800 and the shorter sequence THB 7,800 per person, plus 10% service charge and 7% VAT; beverages are not included. Wine and non-alcoholic pairings, the caviar classics and the Wagyu supplement are not included here — Guest Relations can note a wish.',
      menu: ['Leek & truffle', 'Brathering & chervil', 'Striped jack & horseradish', '“Himmel und Erde”', 'Enleta & Doktorenhof “Aprikose”', 'Sweet shrimp · tomato · tarragon', 'Scallop & king crab · turnip · almond', 'Golden eye snapper · mussel · verbena', 'Lobster · summer squash · dill', 'Duck · persimmon · cru de cacao — or Kagoshima Wagyu A5 · carrot · oxtail (supplement)', 'Sorrel · apple · buttermilk', 'Schwarzwälder Kirschtorte', 'Oma Christa’s Eierlikör & feines Gebäck'],
      contact: { address: ['No. 10, Yen Akat Soi 3', 'Chongnonsi, Yannawa', '10120 Bangkok, Thailand'], phone: '+66 2 107 2777', email: 'reservation@restaurantsuhring.com' }
    },
    practical: {
      price: 'USD 294 or USD 234 per person · plus 10% service charge and government tax',
      priceNote: 'The complete Erlebnis (THB 9,800) or the shorter sequence (THB 7,800). Beverages are not included.',
      when: 'Sunday, 21 February 2027 · the first evening in Bangkok',
      /* the sheet record's opening-hour lines (a lunch service) are kept as the source but NOT shown beside the dated dinner
         (Owner, 19 Sep 2026: the dated assignment wins; no invented hours, no misleading meal-hours copy on the card) */
      sourceHours: ['Lunch', 'Thursday to Sunday', '12:30 – 13:00 (last seating)', 'Closed on Monday and Tuesday']
    },
    select: { id: 'suhring', unit: 'per person' } },
  /* TWO HOUSES, TWO LOCATIONS (Owner, 22 Sep 2026): the combined "Dior · Café LV" card is retired — Café Dior at Dior Bangkok and
     Le Café Louis Vuitton are their own places, each with its own record, its own photographs and the same visit of Day 02 */
  { id: 'bkk-dior', category: 'cafe', roles: ['cafe'], visits: [{ day: 2, date: '2027-02-22', seq: 1245, what: 'Coffee' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 February 2027', name: 'Dior Café', where: 'Bangkok', cats: 'Couture · Design · Café', img: 'assets/images/experiences/bkk-dior-02.jpg', teaser: 'The café at the Dior house on Sukhumvit — a gold cannage salon, a garden table, French pastry in the quiet of the afternoon.' },
  { id: 'bkk-lvcafe', category: 'cafe', roles: ['cafe'], visits: [{ day: 2, date: '2027-02-22', seq: 1245, what: 'Coffee' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 February 2027', name: 'LV Café', where: 'Bangkok', cats: 'Maison · Design · Café', img: 'assets/images/experiences/bkk-lvcafe-02.jpg', teaser: 'Le Café Louis Vuitton at Gaysorn Amarin — a round dining room behind the sculpted façade, the library wall, coffee among the trunks.' },
  { id: 'bkk-lvvisionary', category: 'experience', roles: ['experience'], visits: [{ day: 2, date: '2027-02-22', seq: 1400, what: 'Exhibition' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 February 2027', name: 'Louis Vuitton Visionary Journeys', where: 'Bangkok', cats: 'Exhibition · Design · Fashion', img: 'assets/images/experiences/bkk-lvvisionary-01.jpg', teaser: 'Louis Vuitton’s exhibition of travel and craft — historic trunks, the archive room and a Kusama pumpkin among the vitrines.' },
  { id: 'bkk-iconsiam', category: 'place', roles: ['place'], visits: [{ day: 2, date: '2027-02-22', seq: 1415, what: 'Afternoon' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 February 2027', name: 'ICONSIAM', where: 'Bangkok', cats: 'Riverfront · City · Design · Shopping', img: 'assets/images/experiences/bkk-iconsiam-01.jpg', teaser: 'The great mall on the Chao Phraya — the SookSiam floating-market floor, the design floors and the river in the late afternoon.' },
  { id: 'bkk-phranakorn', category: 'restaurant', roles: ['dinner'], visits: [{ day: 2, date: '2027-02-22', seq: 1900, what: 'Dinner' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 February 2027', name: 'Phra Nakhon', where: 'Bangkok', cats: 'Thai dining · Riverside', img: 'assets/images/experiences/bkk-phranakorn-01.jpg', teaser: 'Contemporary Thai cooking beside the Chao Phraya.' },
  { id: 'bkk-socialclub', category: 'bar', roles: ['bar'], visits: [{ day: 2, date: '2027-02-22', seq: 2110, what: 'Drinks' }], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 February 2027', name: 'BKK Social Club', where: 'Bangkok', cats: 'Bar · Design · Evening', img: 'assets/images/experiences/bkk-social-01.jpg', teaser: 'One of the city’s great bars — Buenos Aires glamour and carefully made drinks.' },
  { id: 'bkk-timespace', category: 'cafe', roles: ['cafe'], visits: [{ day: 3, date: '2027-02-23', seq: 1315, what: 'Coffee' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 February 2027', name: 'Time Space Cafe', where: 'Bangkok', cats: 'Café · Design', img: 'assets/images/experiences/bkk-timespace-03.jpg', teaser: 'Coffee and baking in a bright white room under an open oculus.' },
  { id: 'bkk-mooyoo', category: 'cafe', roles: ['cafe'], visits: [{ day: 3, date: '2027-02-23', seq: 1145, what: 'Brunch' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 February 2027', name: 'Moo Yoo Rose House', where: 'Bangkok', cats: 'House · Garden · Café', img: 'assets/images/experiences/bkk-mooyoo-01.jpg', teaser: 'A café in a house of roses above a lake garden — Italian fusion and Thai sweets.' },
  { id: 'bkk-whispering', category: 'cafe', roles: ['cafe'], visits: [{ day: 3, date: '2027-02-23', seq: 1515, what: 'Coffee' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 February 2027', name: 'Whispering Cafe', where: 'Sam Phran · Nakhon Pathom', cats: 'Architecture · Garden · Landscape · Day escape',
    img: 'assets/images/experiences/whispering-03.jpg',
    teaser: 'Whispering Land, outside the city: a Provence-style house with French doors, a planted garden and vintage furniture.' },
  { id: 'bkk-dib', category: 'experience', roles: ['experience'], visits: [{ day: 3, date: '2027-02-23', seq: 1715, what: 'Art museum' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 February 2027', name: 'Dib Bangkok', where: 'Bangkok', cats: 'Art · Architecture · Design', img: 'assets/images/experiences/bkk-dib-01.jpg', teaser: 'Bangkok’s museum of contemporary art — bold architecture and public space by the expressway.' },
  { id: 'bkk-emquartier', category: 'place', roles: ['place'], visits: [{ day: 3, date: '2027-02-23', seq: 1800, what: 'Shopping' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 February 2027', name: 'EmQuartier', where: 'Bangkok', cats: 'City · Design · Shopping', img: 'assets/images/experiences/bkk-emquartier-01.jpg', teaser: 'A Sukhumvit mall built around its spiral gardens.' },
  { id: 'bkk-commons', category: 'place', roles: ['place'], visits: [{ day: 3, date: '2027-02-23', seq: 2045, what: 'Evening' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 February 2027', name: 'The Commons Thonglor', where: 'Bangkok', cats: 'Food · Design · Social', img: 'assets/images/experiences/bkk-commons-01.jpg', teaser: 'Thonglor’s vertical village — many kitchens, easy drinks in between.' },
  /* BAAN PHRAYA — Day 03 · 23.02.2027 · DINNER (the current Operations Master, 19 Sep 2026: replaces The Commons in the
   * Dinner cell). Every word below is the Owner's "Experience, Restaurant, Cafe_Details" record for Baan Phraya. */
  { id: 'bkk-baanphraya', category: 'restaurant', roles: ['dinner'], visits: [{ day: 3, date: '2027-02-23', seq: 1845, what: 'Dinner' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 February 2027', name: 'Baan Phraya', where: 'Bangkok · the River of Kings', cats: 'Thai fine dining · Heritage house',
    img: 'assets/images/experiences/bkk-baanphraya-01.jpg',
    /* the card teaser serves the rails only; the page's lede is its own `intro` (Window 007: the chef and the house said once each) */
    teaser: 'A century-old riverside house, once home to Thai nobility, where Chef Pom revives regional and royal Thai recipes.',
    intro: 'A century-old riverside house, restored with care.',
    detail: [
      'Set along the River of Kings, the house was long a gathering place for Thai nobility and distinguished guests.',
      'Chef Pom brings back forgotten Thai dishes, cooked with traditional techniques, careful sourcing and an eye on sustainability.',
      'Baan Phraya is easily reached from Charoen Nakorn Road, with its own parking — or by the Mandarin Oriental shuttle boat across the river.'
    ],
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the house's own menu (the Mandarin Oriental upload) — every dish below is the card's */
    highlight: {
      distinction: 'Thai heritage · the River of Kings',
      line: 'Chef Phatchara “Pom” Pirapak revives regional and royal Thai recipes with a contemporary touch',
      house: 'Once home to Phraya Mahai Savan and Khunying Luean Mahai Savan.',
      menuTitle: 'The eight-course Thai set menu',
      menuNote: 'THB 3,800 per person, plus 10% service charge and government tax. The wine pairing (THB 2,800) and the non-alcoholic pairing (THB 1,400) are not included here. Signature drinks rooted in Thai botanicals open the evening on the outdoor terrace.',
      dressTitle: 'Elegant attire',
      menu: ['Crispy pineapple wafer with peanut and tamarind', 'Thai honeycomb biscuit, Thai herbs and eggplant custard infused with Thai rice liqueur', 'Savory Icevine leaves with roasted rice and coriander', 'Gulf of Siam banana prawn tartare with Isan herbs and roasted rice', 'Prachuap Khiri Khan squid in galangal-infused coconut broth with aromatic herbs and pink peppercorns', 'Marinated bamboo fish with herbs grilled in a coconut shell, house-made pickled papaya', 'Pressed watermelon, Nakornprathom bitter orange', 'Grilled Surat Thani River prawn with its tomalley, young tamarind and chilli paste', 'Charred free-range Kao Yai duck green curry with sour grape and heart of palm', 'Mulberry honey granita from Chainat, jasmine flower, bitter orange and talipot palm', 'Roasted silver banana with pandanus ice cream, crispy baby rice and coconut emulsion'],
      contact: { phone: '+66 2 659 9000', email: 'mobkk-baanphraya@mohg.com' }
    },
    practical: {
      price: 'USD 114 per person · plus 10% service charge and government tax',
      priceNote: 'The eight-course Thai set menu, THB 3,800.',
      hours: ['Pre-dinner drink 17:00 – 18:00 · the outdoor terrace', 'Dinner 18:00 – 23:00 · Friday to Tuesday'],
      dress: 'Women in elegant attire and proper footwear; men in long trousers and closed shoes — sleeveless shirts are not permitted for men.'
    },
    select: { id: 'baanphraya', unit: 'per person' } },
  { id: 'bkk-barus', category: 'bar', roles: ['bar'], visits: [{ day: 3, date: '2027-02-23', seq: 2130, what: 'Drinks' }], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 February 2027', name: 'Bar Us', where: 'Bangkok', cats: 'Bar · Evening · Design', maps: 'https://maps.app.goo.gl/2KLduE51ybg4qAqd9?g_st=ic', img: 'assets/images/experiences/bkk-barus-06.jpg', teaser: 'A small, intimate bar for a carefully made drink after dinner.' },
  { id: 'bkk-ledukaan', category: 'restaurant', roles: ['dinner'], visits: [], row: 'city', chapter: 'bkk', day: 'Bangkok days', name: 'Le Du Kaan', where: 'Bangkok', cats: 'Thai fine dining · Rooftop · Bar',
    img: 'assets/images/experiences/bkk-ledukaan-01.jpg',
    teaser: 'The more casual Thai kitchen of MICHELIN-starred Chef Thitid “Ton” Tassanakajohn, on the 56th floor of The Empire.',
    detail: [
      'Dishes from every region of Thailand, cooked with traditional flavours and a modern hand from fresh, local ingredients.',
      'Chef Ton, whose Le Du won Asia’s 50 Best Restaurants 2023, runs the kitchen with Head Chef Chatchawan “Bank” Varahajeerakul.',
      'Indoor tables or the large outdoor terrace, 56 floors up at EA Rooftop, The Empire — with a rooftop bar over the Bangkok skyline and cocktails and mocktails from Thailand’s four regions.'
    ],
    practical: { hours: ['Lunch 11:30 – 14:30 (last order 14:00)', 'Dinner 17:00 – 22:30 (last order 22:00)', 'Bar 17:00 – 01:00 (last order 23:45)'] } },
  /* THONG SMITH: the 24.02 lunch cell now reads the Aman afternoon tea (the current Operations Master, 19 Sep 2026) — the
   * place stays a Bangkok-days address of the hosts' notes, no longer dated */
  { id: 'bkk-thongsmith', category: 'restaurant', roles: ['lunch'], visits: [{ day: 4, date: '2027-02-24', seq: 1300, what: 'Lunch' }], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 February 2027', name: 'Thong Smith', where: 'Bangkok', cats: 'Thai · Boat Noodles', img: 'assets/images/experiences/bkk-thongsmith-03.jpg', teaser: 'Siamese boat noodles — a Bangkok classic, done beautifully.' },
  { id: 'bkk-letsrelax', category: 'experience', roles: ['experience'], visits: [{ day: 4, date: '2027-02-24', seq: 1500, what: 'Spa' }], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 February 2027', name: 'Let’s Relax', where: 'Bangkok', cats: 'Wellness · Spa', img: 'assets/images/experiences/bkk-letsrelax-01.jpg', teaser: 'An hour of Thai massage before the night train.' },
  { id: 'bkk-dusit', category: 'place', roles: ['place'], visits: [{ day: 4, date: '2027-02-24', seq: 1400, what: 'Afternoon' }], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 February 2027', name: 'Dusit Central Park', where: 'Bangkok', cats: 'City · Park · Design · Lifestyle', img: 'assets/images/experiences/bkk-dusit-01.jpg', teaser: 'A new park raised above Silom — treetop walkways and views across the city.' },
  { id: 'bkk-madeleine', category: 'cafe', roles: ['cafe'], visits: [{ day: 4, date: '2027-02-24', seq: 1630, what: 'Coffee' }], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 February 2027', name: 'Cafe Madeleine', where: 'Four Seasons Hotel Bangkok', cats: 'Pâtisserie · Hotel · Café', img: 'assets/images/experiences/bkk-madeleine-01.jpg', teaser: 'French pastry in the calm of the Four Seasons.' },
  { id: 'bkk-tangjaiyang', category: 'restaurant', roles: ['dinner'], visits: [{ day: 4, date: '2027-02-24', seq: 1730, what: 'Dinner' }], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 February 2027', name: 'Tang Jai Yang', where: 'Bangkok', cats: 'Cantonese · Charcoal · Dining', maps: 'https://maps.app.goo.gl/6otfQcm4bqsTuWZ16?g_st=ic', img: 'assets/images/experiences/bkk-tjy-02.jpg', teaser: 'Cantonese barbecue over charcoal — dinner before the night train.' },
  /* THAILAND · BANGKOK · THE RETURN · 6 – 8 March 2027 (Overview Day 14 – 16) */
  /* HARUDOT (the current Operations Master, 19 Sep 2026): the café of Day 03 · 23.02.2027 and the EXPERIENCE of Day 15 ·
   * 07.03.2027 (it replaces Siam Paragon in the Experience cell of the return); the Owner's approved photographs stand */
  { id: 'bkk-harudot', category: 'cafe', roles: ['cafe'], visits: [{ day: 3, date: '2027-02-23', seq: 1600, what: 'Coffee' }, { day: 15, date: '2027-03-07', seq: 1600, what: 'Coffee' }], row: 'Day 03 · 23.02.2027 · Day 15 · 07.03.2027', chapter: 'bkk', day: '23 February · 7 March 2027', name: 'Harudot', where: 'Bangkok', cats: 'Café · Architecture · Design', img: 'assets/images/experiences/bkk-harudot-03.jpg', teaser: 'A café of rose plaster and spiral stairs — architecture first, coffee close behind.' },
  { id: 'bkk-alati', category: 'restaurant', roles: ['lunch'], visits: [{ day: 15, date: '2027-03-07', seq: 1300, what: 'Sunday brunch' }], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '7 March 2027', name: 'ALATi', where: 'Siam Kempinski Bangkok', cats: 'Lunch · Brunch · Hotel', img: 'assets/images/experiences/bkk-alati-01.jpg', teaser: 'Sunday brunch at the Siam Kempinski — the long lunch of the last Bangkok days.' },
  /* CANNUBI BY UMBERTO BOMBANA — Day 15 · 07.03.2027 · DINNER (the current Operations Master, 19 Sep 2026: replaces Petits
   * Plats in the Dinner cell). Every word below is the Owner's "Experience, Restaurant, Cafe_Details" record. */
  { id: 'bkk-cannubi', category: 'restaurant', roles: ['dinner'], visits: [{ day: 15, date: '2027-03-07', seq: 1900, what: 'Dinner' }], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', featured: true, day: '7 March 2027', name: 'Cannubi by Umberto Bombana', where: 'Dusit Thani Bangkok', cats: 'Italian fine dining · One MICHELIN Star',
    img: 'assets/images/experiences/bkk-cannubi-01.jpg',
    /* the About section is retired (Window 007): the name and the star are the lede, the chef the line, the room and the cellar the house */
    teaser: 'Named after the Cannubi hill of Barolo — the only Italian restaurant in Thailand with a MICHELIN Star.',
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the house's Autumn menu (the Owner's upload from the Cannubi Drive folder) */
    highlight: {
      distinction: 'One MICHELIN Star · The MICHELIN Guide Thailand 2026',
      line: 'Executive Italian Chef Andrea Susto, cooking in the spirit of Chef Umberto Bombana, the King of White Truffle',
      house: 'An intimate dining room on the L Floor of Dusit Thani Bangkok, with a cellar of more than 350 wine labels.',
      menuTitle: 'The set menu',
      menuNote: 'This is the house’s autumn card; the menu in March may differ. The same set menu is served to everyone at the table. Wine and non-alcoholic pairings are not included here. Please tell Guest Relations early about any allergies or dietary preferences.',
      dressTitle: 'Smart casual',
      menu: ['Pumpkin variations', 'Red sea bream carpaccio · Oscietra caviar · olive oil & ponzu dressing', 'Spaghettino “Felicetti” · marinated tuna tartare · tuna heart bottarga', 'Wagyu oxtail ravioli · mushroom sauce · chestnut & parsley emulsion — or homemade chitarra pasta · “Carabineros” prawn · crustacean sauce (supplement)', 'Roasted beef tenderloin & braised cheeks · morel mushroom & beef jus — or charcoaled Brittany blue lobster · pickled cherry tomatoes · lobster jus (supplement)', 'Homemade grape sorbet · sea berry & crispy pastry', '“Cioccolato” · 55% chocolate fondant · raspberry sorbet · “Pistocchi” ganache cake', 'Piccola pasticceria'],
      clip: 'assets/video/cannubi-card.mp4',
      contact: { phone: '+66 2 200 9000', where: 'L Floor · Dusit Thani Bangkok' }
    },
    practical: {
      price: 'USD 165 per person · plus 10% service charge and government tax',
      priceNote: 'The set menu, THB 5,500.',
      hours: ['Wednesday to Sunday', 'Lunch 12:00 – 14:30 (last order 14:00)', 'Dinner 18:00 – 22:00 (last order 21:30)'],
      dress: 'Smart casual — please no T-shirts, shorts or sandals.'
    },
    select: { id: 'cannubi', unit: 'per person' } },
  /* PETITS PLATS BANGKOK — Day 16 · 08.03.2027 · DINNER (the current Operations Master, 19 Sep 2026: the last evening, before
   * the flight home; it replaces the in-flight dinner). The Owner's records carry no photograph and no description of the
   * place: the card stands without an image, nothing is invented. */
  { id: 'bkk-petitsplats', category: 'restaurant', roles: ['dinner'], visits: [{ day: 16, date: '2027-03-08', seq: 1900, what: 'Dinner' }], row: 'Day 16 · 08.03.2027', chapter: 'bkk', leg: 'return', day: '8 March 2027', name: 'Petits Plats Bangkok', where: 'Bangkok', cats: 'French bistro · Dinner · The last evening', img: 'assets/images/experiences/bkk-petitsplats-01.jpg',
    teaser: 'The last dinner of the journey — a Bangkok table before the flight home.' },
  /* THE RETURN, DAY 15 · 07.03.2027 (the Operations Master overview, approved 05.09.2026): the café, the mall and the bar of the
     last Sunday — no photographs in the Owner's records; the cards stand without an image */
  { id: 'bkk-cafecraft', category: 'cafe', roles: ['cafe'], visits: [{ day: 15, date: '2027-03-07', seq: 1500, what: 'Coffee' }], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '7 March 2027', name: 'Café Craft by CHANINTR', where: 'Bangkok', cats: 'Café · Design', img: 'assets/images/experiences/bkk-cafecraft-01.jpg', teaser: 'The afternoon coffee of the last Sunday — a design house’s café in the heart of the city.' },
  { id: 'bkk-siamparagon', category: 'place', roles: ['place'], visits: [{ day: 15, date: '2027-03-07', seq: 1700, what: 'Shopping' }], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '7 March 2027', name: 'Siam Paragon', where: 'Bangkok', cats: 'Shopping · Siam', img: 'assets/images/experiences/bkk-siamparagon-01.jpg', teaser: 'The great mall at Siam, next door to the Kempinski — for the last Sunday afternoon.' },
  { id: 'bkk-firefly', category: 'bar', roles: ['bar'], visits: [{ day: 15, date: '2027-03-07', seq: 2100, what: 'Drinks' }], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '7 March 2027', name: 'Firefly Bar, Siam Kempinski', where: 'Bangkok', cats: 'Bar · The last night', img: 'assets/images/experiences/bkk-firefly-01.jpg', teaser: 'The last night at the Siam Kempinski — a bar after the dinner at Cannubi.' },
  /* LAOS · VIENTIANE — the city portrait (owner Vientiane folder, Sep 2026):
   * GOLD & SACRED → CITY & ARCHITECTURE → MEKONG & EVENING → BEYOND THE CENTRE */
  { id: 'vte-thatluang', category: 'experience', roles: ['experience'], visits: [{ day: 5, date: '2027-02-25', seq: 945, what: 'Morning' }], row: 'Day 05 · 25.02.2027', chapter: 'laos', featured: true, day: 'Gold & sacred', name: 'Pha That Luang', where: 'Vientiane', cats: 'Stupa · Heritage · Culture', maps: 'https://maps.app.goo.gl/hehafVRBrdPt7L9Y6?g_st=ic',
    img: 'assets/images/experiences/vte-thatluang-01.jpg',
    teaser: 'The golden stupa — Laos’ national symbol, radiant in the morning.',
    detail: [
      'The great golden stupa is the national symbol of Laos — about 3.5 kilometres from the centre, its gilded spire visible long before you arrive.',
      'Give it an unhurried hour: the cloistered courtyard, the reclining Buddha beside the stupa, and gold that shifts with every change of light.',
    ] },
  { id: 'vte-patuxai', category: 'experience', roles: ['experience'], visits: [], row: 'city', chapter: 'laos', featured: true, day: 'City & architecture', name: 'Patuxai', where: 'Vientiane', cats: 'Monument · Architecture · City',
    img: 'assets/images/experiences/vte-patuxai-01.jpg',
    teaser: 'Vientiane’s triumphal arch — worth the climb for the view down the palm-lined avenue.',
    detail: [
      'Raised in the late 1950s and 1960s, the arch answers Paris with Lao form — naga finials, lotus mouldings and a crown of five towers above the city’s grandest avenue.',
      'Climb it: the upper terraces look straight over the fountain park and down Lane Xang Avenue — our second photograph is that view. Morning and late afternoon bring the kindest light.',
    ] },
  { id: 'vte-nightmarket', category: 'place', roles: ['place'], visits: [{ day: 6, date: '2027-02-26', seq: 1810, what: 'Evening' }], row: 'Day 06 · 26.02.2027', chapter: 'laos', featured: true, day: 'Mekong & evening', name: 'Vientiane Night Market', where: 'Vientiane', cats: 'Night market · Riverfront · Local life', maps: 'https://maps.app.goo.gl/X2jTe6DyVCc7qd21A?g_st=ic',
    img: 'assets/images/experiences/vte-nightmarket-01.jpg',
    teaser: 'Red roofs along the Mekong at dusk — lanterns, stalls and the city out for the evening.',
    detail: [
      'Every evening the red-roofed stalls open along Chao Anouvong Park — clothes, crafts and small food, with the Mekong turning to colour behind them.',
      'Come for the promenade as much as the market: at sunset the riverfront fills with families, runners and food carts, and the far bank is already Thailand.',
    ] },
  /* EDIT 9 (Owner, 26 Sep 2026): Haw Phra Kaew Museum, the Presidential Palace, Buddha Park and the Lao National Museum are deleted. */
  { id: 'vte-silkresidence', category: 'experience', roles: ['experience'], visits: [{ day: 5, date: '2027-02-25', seq: 1400, what: 'Afternoon' }], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: 'Museums', name: 'Traditional Lao Silk Residence', where: 'Vientiane', cats: 'Museum · Textiles · Craft',
    img: 'assets/images/experiences/vte-silkresidence-01.jpg',
    teaser: 'Textile Treasures of Laos — heirloom silks and living weaving traditions, shown in the Hor Kham Residence next to the Presidential Office.',
    detail: [
      'The exhibition is organised by the Lao Handicrafts Association, with heirloom pieces lent by families across the country.',
      'It has two parts. The Heritage Hall shows more than 100 traditional textiles by Lao weavers — from ceremonial sinh to household fabrics, with motifs drawn from old beliefs and folklore; some pieces are more than a century old. The gallery next door shows where Lao weaving is going: contemporary artisans using traditional motifs, such as naga patterns, in wall hangings and fashion.',
      'The residence mixes French Indochinese architecture with quiet gardens, and daylight falls through tall windows onto the silks. There is a Naked Espresso on site, and photography without flash is allowed.'
    ],
    practical: { price: 'LAK 50,000 per person (about USD 2)', hours: ['Open daily 09:00 – 17:00'] } },
  { id: 'vte-laoartmuseum', category: 'experience', roles: ['experience'], visits: [], row: 'city', chapter: 'laos', day: 'Museums', name: 'Lao Art Museum', where: 'Vientiane', cats: 'Museum · Art · Craft',
    img: 'assets/images/experiences/vte-laoartmuseum-01.jpg',
    teaser: 'Lao wood carving, traditional painting and handicraft, in a new museum.',
    detail: [
      'A new museum for the art and craft of Laos: carved wood, traditional paintings and Lao handicrafts, for anyone curious about the country’s art and history.'
    ],
    practical: { price: 'LAK 220,000 for foreign visitors (about USD 10 – 15) · electric cart or shuttle LAK 50,000 – 120,000 extra', hours: ['Open 08:30 – 16:00'] } },
  /* LAOS · VIENTIANE — tables & days · 25 February – 1 March 2027 */
  { id: 'vte-rivermoon', category: 'restaurant', roles: ['lunch'], visits: [{ day: 5, date: '2027-02-25', seq: 1200, what: 'Lunch' }], row: 'Day 05 · 25.02.2027', chapter: 'laos', featured: true, day: '25 February 2027', name: 'River Moon', where: 'Vientiane', cats: 'Riverside · Landscape · Dining', maps: 'https://maps.app.goo.gl/NMbPP5kvLKurozJJ8?g_st=ic', img: 'assets/images/experiences/vte-rivermoon-01.jpg', teaser: 'Lao and Thai barbecue at the water’s edge — lunch under thatched pavilions.' },
  { id: 'vte-3merchants', category: 'restaurant', roles: ['dinner'], visits: [{ day: 5, date: '2027-02-25', seq: 1810, what: 'Dinner' }], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 February 2027', name: '3 Merchants Restaurant', where: 'Vientiane', cats: 'Indochinese · Dining', maps: 'https://maps.app.goo.gl/q3nJqc74P1hn6mkf6?g_st=ic',
    img: 'assets/images/experiences/vte-3merchants-01.jpg', teaser: 'A calm, contemporary Vientiane dining room we love.' },
  { id: 'vte-sona', category: 'bar', roles: ['bar'], visits: [{ day: 5, date: '2027-02-25', seq: 2030, what: 'Drinks' }], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 February 2027', name: 'Sona Cafe and Bar', where: 'Vientiane', cats: 'Bar · Evening · Vientiane', maps: 'https://maps.app.goo.gl/hDGyqmbPwYTEmvr89?g_st=ic',
    img: 'assets/images/experiences/vte-sona-01.jpg', teaser: 'A café by day and a bar by night — for an easy drink after dinner.' },
  { id: 'vte-kaogee', category: 'cafe', roles: ['cafe'], visits: [{ day: 6, date: '2027-02-26', seq: 1240, what: 'Lunch' }], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 February 2027', name: 'Kaogee Le Triomphe', where: 'Vientiane', cats: 'Local · Bakery · Café',
    img: 'assets/images/experiences/vte-kaogee-01.jpg', teaser: 'Kaogee baguettes and good coffee near Patuxai — a Vientiane classic.' },
  { id: 'vte-lacuna', category: 'cafe', roles: ['cafe'], visits: [{ day: 6, date: '2027-02-26', seq: 1500, what: 'Coffee' }, { day: 6, date: '2027-02-26', seq: 2100, what: 'Evening drinks' }], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 February 2027', name: 'Lacuna VTE', where: 'Vientiane', cats: 'Café · Design', maps: 'https://maps.app.goo.gl/tzMFhWFGAWjE2ALs8?g_st=ic', img: 'assets/images/experiences/vte-lacuna-03.jpg', teaser: 'A quiet design café in a white villa — coffee in the afternoon, drinks in the evening.' },
  { id: 'vte-kokkok', category: 'place', roles: ['place'], visits: [{ day: 6, date: '2027-02-26', seq: 1350, what: 'Afternoon' }], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 February 2027', name: 'KokKok Mega Mall Patuxay', where: 'Vientiane', cats: 'City · Shopping', maps: 'https://maps.app.goo.gl/TKSjr5kc2P6vWvWSA?g_st=ic', img: 'assets/images/experiences/vte-kokkok-01.jpg', teaser: 'A modern mall beside Patuxai.' },
  { id: 'vte-laoderm', category: 'restaurant', roles: ['dinner'], visits: [{ day: 6, date: '2027-02-26', seq: 1900, what: 'Dinner' }, { day: 7, date: '2027-02-27', seq: 1900, what: 'Welcome Dinner' }], row: 'Day 06 · 26.02.2027 · Day 07 Welcome Dinner', chapter: 'laos', day: '26 February 2027', name: 'Lao Derm', where: 'Vientiane', cats: 'Lao · Dining', maps: 'https://maps.app.goo.gl/cSn9mzR38QdKGsk49?g_st=ic', img: 'assets/images/experiences/vte-laoderm-02.jpg', teaser: 'Classic Lao cooking, warm and unhurried — and the table of our Welcome Dinner.' },
  /* THE VIENTIANE TABLES THE OVERVIEW NAMES (the Operations Master overview, approved 05.09.2026): the dinner of 26 February
     and the lunch of the arrival day, the hotel's café and the sky bar of the welcome evening — no photographs in the Owner's
     records; the cards stand without an image */
  { id: 'vte-camon', category: 'restaurant', roles: ['dinner'], visits: [{ day: 6, date: '2027-02-26', seq: 1915, what: 'Dinner' }, { day: 7, date: '2027-02-27', seq: 1230, what: 'Lunch' }], row: 'Day 06 · 26.02.2027 · Day 07 · 27.02.2027', chapter: 'laos', day: '26 · 27 February 2027', name: 'Cam On Restaurant', where: 'Vientiane', cats: 'Vietnamese · Dinner · Lunch', img: 'assets/images/experiences/vte-camon-01.jpg', teaser: 'A Vientiane table we come back to — dinner after the night market, and lunch on 27 February, the day the wedding guests arrive.' },
  { id: 'vte-lecafe', category: 'cafe', roles: ['cafe'], visits: [{ day: 7, date: '2027-02-27', seq: 1500, what: 'Coffee' }], row: 'Day 07 · 27.02.2027', chapter: 'laos', day: '27 February 2027', name: 'Le Café at Souphattra Heritage', where: 'Vientiane', cats: 'Café · The house', img: 'assets/images/experiences/vte-lecafe-01.jpg', teaser: 'The Souphattra Heritage’s own café — coffee in the courtyard on 27 February, as the wedding guests arrive.' },
  { id: 'vte-selene', category: 'bar', roles: ['bar'], visits: [{ day: 7, date: '2027-02-27', seq: 2100, what: 'Drinks' }], row: 'Day 07 · 27.02.2027', chapter: 'laos', day: '27 February 2027', name: 'Selene Sky Bar', where: 'Vientiane', cats: 'Sky bar · Evening', img: 'assets/images/experiences/vte-selene-01.jpg', teaser: 'A drink above the city after the Welcome Dinner at Lao Derm.' },
  /* THE WEDDING MORNING (Owner, 22 Sep 2026): Wat Ong Teu, where the day begins — the Temple Ceremony of Sunday, 28 February 2027;
     the photographs are the Owner's replacement set of Edit 6 (24 Sep 2026 · Drive folder 195 · the gilded façade first) */
  { id: 'vte-ongteu', category: 'experience', roles: ['experience'], visits: [{ day: 8, date: '2027-02-28', seq: 900, what: 'Temple Ceremony' }], row: 'Day 08 · 28.02.2027', chapter: 'laos', featured: true, day: '28 February 2027', name: 'Wat Ong Teu', where: 'Vientiane', cats: 'Temple · The wedding morning · Sacred', img: 'assets/images/experiences/vte-ongteu-01.jpg', teaser: 'The temple where the wedding day begins — the morning alms-giving, novices with their bowls, the city still quiet.', detail: ['The wedding day begins here at 09:00 with the Temple Ceremony: an unhurried Buddhist morning, with time to take part in the alms-giving. Afterwards we return together to the Souphattra Heritage for Coffee & Cake.', 'One of the oldest temples in Vientiane, a few minutes on foot from the riverside.'] },
  /* LAO TRADITIONAL DRESS RENTAL (Owner, 24 Sep 2026 · Edit 6): the attire of the wedding morning — Day 08 is Lao Traditional
     Dress from breakfast to the cake. Every word, the price and the hours are the Operations Master's own (Experience column
     "Lao Traditional Dress Rental"); the photographs are Drive folder 196. THE SHOP AND THE BOOKING (Owner, 25 Sep 2026): the
     rental is the guest's own cost, paid at the shop — never hosted, never complimentary; Guest Relations can book the fitting
     appointment with the shop; the shop's own page is linked. No terms beyond these are stated. */
  { id: 'vte-laodress', category: 'experience', roles: ['experience'], visits: [], row: 'city', chapter: 'laos', day: 'Traditional attire', name: 'Lao Traditional Dress Rental', where: 'Vientiane', cats: 'Traditional attire · Lao silk',
    img: 'assets/images/experiences/vte-laodress-01.jpg',
    teaser: 'For the wedding morning we all wear classic Lao attire in fine Lao silk — timeless and elegant, yet relaxed and easy.',
    detail: [
      'Women wear beautifully patterned sinh (the traditional Lao wrap-around skirt), paired with elegant silk blouses and gracefully draped sashes. Simple flat or low-heeled leather sandals in neutral tones such as tan, brown, black, nude or cream are encouraged.',
      'Men wear traditional Lao silk shirts, paired with sinh or traditional trousers, complemented by coordinating silk sashes where appropriate. Simple leather sandals or relaxed leather loafers in brown, tan or black are recommended.',
      'The overall styling should feel natural, refined and understated, with coordinated yet individual variations in traditional patterns, textures and colours. Footwear should remain simple and comfortable, complementing the traditional silk attire without making the look overly formal or theatrical.',
      'Please bring your own footwear: the rental provides the traditional shirt, the sinh or trousers, and the accessories only.',
      'The rental is your own cost, paid directly at the shop. If you would like, Guest Relations will book your fitting appointment with the shop for you.'
    ],
    link: 'https://www.facebook.com/profile.php?id=61573790998776', linkLabel: 'The rental shop on Facebook',
    practical: { price: 'USD 15', priceNote: 'Your own cost, paid at the shop', hours: ['Every day 09:00 – 18:00'] } },
  /* BARON VIENTIANE (Owner, 22 Sep 2026): the club of the wedding night — the VIP after party, the release after the formal day.
     Approved media: the Owner's BARON folder (seven photographs, three films with sound). A club, never a bar card. */
  { id: 'vte-baron', category: 'club', roles: ['club'], visits: [{ day: 8, date: '2027-02-28', seq: 2230, what: 'VIP After Party' }], row: 'Day 08 · 28.02.2027', sheet: 'OWNER', chapter: 'laos', featured: true, day: '28 February 2027', name: 'BARON Vientiane', where: 'Vientiane', cats: 'Club · The wedding night · After party', maps: 'https://maps.google.com/?q=BARON+Vientiane', img: 'assets/images/experiences/vte-baron-01.jpg',
    teaser: 'When the speeches are over and the last course is cleared: the wedding night carries on at BARON — our VIP after party, music until late.',
    detail: ['After the dinner by the pool, the night is not over. BARON, in the centre of Vientiane, is where the wedding turns into a party — the DJ, the floor and the friends who travelled so far to be with us, one last dance before the journey moves on.', 'Our VIP after party — no ticket, no list, just come as you are from the dinner. The music plays until the last guests leave.'],
    practical: { when: 'Sunday, 28 February 2027 · after the Wedding Dinner', dress: 'As you come from the dinner — Black Tie, loosened', address: ['BARON Vientiane', 'Second floor, above Starbucks', 'Vientiane, Laos'] },
    highlight: { distinction: 'The wedding night · VIP after party' },   /* the location is the Address row, the friends the About (Window 007: said once) */
    clips: [
      { src: 'assets/video/baron-01.mp4', poster: 'assets/video/baron-01-poster.jpg', w: 720, h: 1280, alt: 'On the floor at BARON — the crowd under the lights' },
      { src: 'assets/video/baron-02.mp4', poster: 'assets/video/baron-02-poster.jpg', w: 720, h: 1280, alt: 'The DJ set at BARON' },
      { src: 'assets/video/baron-03.mp4', poster: 'assets/video/baron-03-poster.jpg', w: 720, h: 720, alt: 'The night at BARON, in one take' }
    ] },
  /* CHINA · KUNMING · LIJIANG */
  { id: 'cn-blossom', category: 'experience', roles: ['experience'], visits: [{ day: 9, date: '2027-03-01', seq: 1000, what: 'Cherry blossoms' }, { day: 10, date: '2027-03-02', seq: 1000, what: 'Cherry blossoms' }], row: 'Day 09 – 10 · 01.–02.03.2027', chapter: 'china', featured: true, day: 'Seasonal', name: 'Kunming Cherry Blossoms', where: 'Kunming · Yunnan', cats: 'Nature · Garden · Seasonal · Photography',
    img: 'assets/images/experiences/kmg-blossom-01.jpg',
    teaser: 'In spring, Kunming’s gardens turn to layers of pink blossom over water, stone paths and old tiled roofs.',
    detail: [
      'The loveliest spots bring together Yunnan cherry blossom and flowering begonia with streams, small cascades, white walls, dark tiled roofs and planted walkways — a landscape that changes with the light, the weather and the bloom.',
      'A note on the season — Kunming’s cherry blossom usually peaks from mid-March into April. Our visit in early March may come before the peak, so how much is in flower depends on the year.',
      'Yuantongshan (Wuhua District) — the classic Kunming blossom garden: Yunnan cherry, weeping begonia and a dense pink canopy in an established city park.',
      'A park on the edge of Kunming (Xishan District) — wider and quieter, with room to wander among the blossom.',
      'Best light — mornings 09:00 – 11:00 and late afternoons 16:00 – 18:00; at midday the light is harsh for photographs. Look for hanging branches, blossom over water, white walls and petals against the light.',
      'Good to know — spring days can change quickly and the Yunnan sun is strong. Allow two to three unhurried hours, and please leave the branches and plants untouched.',
    ] },
];
