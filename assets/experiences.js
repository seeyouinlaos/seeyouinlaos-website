/* Canonical H&S Experience dataset — informational discovery content for the
 * public site and the Guest Area. Every entry is one place from the Owner's
 * Operations Master (sheet Overview_Hotel_Restaurant, column = `roles`, row =
 * `row`) or from the Vientiane city portrait (`row: 'city'`). Photographs come
 * from the numbered Drive folders: the lead in `img`, the curated set in
 * assets/experience-galleries.js (generated, source-traced). Nothing here is
 * charged and nothing is booked — the ONE exception is a place that carries a
 * `select` block: it is offered through the Journey selection, as a request.
 * Paths are site-root-relative; the register page prefixes '../'. */
window.SIYL_EXP = [
  /* THAILAND · BANGKOK · 22–24 FEB 2027 */
  { id: 'bkk-curvy', roles: ['lunch'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'Curvy.Dining', where: 'Bangkok', cats: 'Dining · Design', img: 'assets/images/experiences/bkk-curvy-01.jpg', teaser: 'A design-led Bangkok dining room where Thai flavours meet modern European form.' },
  /* SÜHRING — the one place with a full record in the Owner's sheet
   * "Experience, Restaurant, Cafe_Details" (Suhring): every text below is that
   * record, structured, nothing added. THE PRICE (Owner, 20 Sep 2026 — the Highlight): the house's own menu card, the
   * Erlebnis at THB 9,800 (USD 294) or the shorter sequence at THB 7,800 (USD 234), per person, from the one calculation
   * source (assets/pricing.js FLAT.suhring.menus); the earlier source cell "$180.00" is superseded. Optional, selectable
   * through the Journey like the Afternoon Tea — a restaurant request arranged through the Journey workflow, never a
   * confirmed reservation. */
  /* DATED (the current Operations Master, 19 Sep 2026): Day 01 · 21.02.2027 · DINNER — the first evening in Bangkok
   * (the Overview's Dinner cell; the sheet record's opening hours are the restaurant's own and are kept below) */
  { id: 'bkk-suhring', roles: ['dinner'], row: 'Day 01 · 21.02.2027', sheet: 'FULL', chapter: 'bkk', featured: true, day: '21 FEB 2027', name: 'Sühring', where: 'Bangkok', cats: 'German fine dining · Dinner',
    maps: 'https://maps.app.goo.gl/2b4whggW3YCnxN6u5?g_st=ic', link: 'https://www.restaurantsuhring.com/menu.html',
    img: 'assets/images/experiences/bkk-suhring-01.jpg',
    teaser: 'Where German tradition meets modern artistry — a villa, two brothers, and countless memories.',
    intro: 'Welcome to Sühring, a home of stories told through food. A villa, two brothers, and countless memories.',
    sections: [
      { k: 'The philosophy', t: 'Timeless techniques.', p: ['Childhood recipes and modern creativity come together on every plate. It begins with curiosity, continues with surprise, and ends with the warmth of belonging.'] },
      { k: 'The founders', t: 'Tradition & innovation.', p: ['Experience the culinary delights of award-winning chefs Thomas and Mathias Sühring, owners of Sühring, a three-Michelin-starred modern German restaurant in the heart of Bangkok.'] },
      { k: 'The foundation', t: 'Philosophy & approach.', p: ['Our family is undeniably the foundation of who we have become today. It has given us examples of love, behavior, and values that continue to shape our identity. The kitchen was always the heart of our home, and we are especially grateful to our grandmother, who showed us through her devotion to cooking how magical food can be.'], by: 'Mathias and Thomas Sühring' },
      { k: 'The first mentor', t: 'Our inspiration.', p: ['Our grandmother Christa, herself a trained chef, was our first mentor. She showed us that food could be both humble and refined. On her farm just outside Berlin, she taught us the beauty of the seasons and of the ingredients she grew.', 'Driven by her passion for cooking, she created a warm, welcoming environment where everyday family meals became cherished, lasting memories. That philosophy has stayed with us ever since, and it shapes every menu we write.'] },
      { k: 'Contemporary heritage', t: 'The kitchen.', p: ['Today, we draw inspiration from cherished family recipes, childhood memories, and years of travel. Our cooking reinterprets the rich traditions of German cuisine with a contemporary twist, emphasizing technique, refinement, and a deep respect for the ingredients we work with.'] }
    ],
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the premium table of the first evening — Three MICHELIN Stars, the house's own menu
       card (the Owner's upload) as the source of the menu and its two prices; supplements, pairings and caviar are the house's
       own and never products here */
    highlight: {
      distinction: 'Three MICHELIN Stars',
      line: 'Modern German cuisine by Thomas and Mathias Sühring',
      house: 'A restored 1970s villa — refined, yet with the warmth of a home.',
      menuTitle: 'Erlebnis · the menu',
      menuNote: 'The house’s current menu card. The complete Erlebnis is THB 9,800; the shorter sequence THB 7,800. Beverages are not included in the menu price; all prices are in Thai Baht and subject to 10% service charge and 7% VAT. Wine and non-alcoholic pairings, the caviar classics and the Wagyu supplement are the house’s own — Guest Relations can note a wish.',
      menu: ['Leek & truffle', 'Brathering & chervil', 'Striped jack & horseradish', '“Himmel und Erde”', 'Enleta & Doktorenhof “Aprikose”', 'Sweet shrimp · tomato · tarragon', 'Scallop & king crab · turnip · almond', 'Golden eye snapper · mussel · verbena', 'Lobster · summer squash · dill', 'Duck · persimmon · cru de cacao — or Kagoshima Wagyu A5 · carrot · oxtail (supplement)', 'Sorrel · apple · buttermilk', 'Schwarzwälder Kirschtorte', 'Oma Christa’s Eierlikör & feines Gebäck'],
      contact: { address: ['No. 10, Yen Akat Soi 3', 'Chongnonsi, Yannawa', '10120 Bangkok, Thailand'], phone: '+66 (0) 2107 2777', email: 'reservation@restaurantsuhring.com' }
    },
    practical: {
      price: 'USD 294 · USD 234 per person',
      priceNote: 'The Erlebnis menu at THB 9,800 or the shorter sequence at THB 7,800 — the Owner’s rounded website prices. Beverages not included.',
      when: 'Dinner · Sunday, 21 February 2027 · the first evening in Bangkok',
      /* the sheet record's opening-hour lines (a lunch service) are kept as the source but NOT shown beside the dated dinner
         (Owner, 19 Sep 2026: the dated assignment wins; no invented hours, no misleading meal-hours copy on the card) */
      sourceHours: ['Lunch', 'Thursday to Sunday', '12:30 pm to 13:00 pm (last seating)', 'Closed on Monday and Tuesday']
    },
    select: { id: 'suhring', unit: 'per person' } },
  { id: 'bkk-diorlv', roles: ['cafe'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'Dior · Café LV', where: 'Bangkok', cats: 'Fashion · Design · Café', img: 'assets/images/experiences/bkk-dior-02.jpg', gallery: ['assets/images/experiences/bkk-dior-01.jpg', 'assets/images/experiences/bkk-lv-cafe-01.jpg'], teaser: 'A luxury design café stop — couture interiors, French pastry and contemporary calm.' },
  { id: 'bkk-lvvisionary', roles: ['experience'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 FEB 2027', name: 'Louis Vuitton Visionary Journeys', where: 'Bangkok', cats: 'Exhibition · Design · Fashion', img: 'assets/images/experiences/bkk-lvvisionary-01.jpg', teaser: 'The house opens its world: an exhibition of craft, travel and imagination staged as architecture.' },
  { id: 'bkk-iconsiam', roles: ['place'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 FEB 2027', name: 'ICONSIAM', where: 'Bangkok', cats: 'Riverfront · City · Design · Shopping', img: 'assets/images/experiences/bkk-iconsiam-01.jpg', teaser: 'The riverfront landmark — architecture, design floors and the Chao Phraya at golden hour.' },
  { id: 'bkk-phranakorn', roles: ['dinner'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'Phra Nakhon', where: 'Bangkok', cats: 'Thai dining · Riverside', img: 'assets/images/experiences/bkk-phranakorn-01.jpg', teaser: 'A Bangkok dining destination for contemporary Thai cooking.' },
  { id: 'bkk-socialclub', roles: ['bar'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'BKK Social Club', where: 'Bangkok', cats: 'Bar · Design · Evening', img: 'assets/images/experiences/bkk-social-01.jpg', teaser: "One of the city's great bars — Buenos Aires glamour, considered drinks, late light." },
  { id: 'bkk-timespace', roles: ['lunch','cafe'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Time Space Cafe', where: 'Bangkok', cats: 'Café · Design', img: 'assets/images/experiences/bkk-timespace-03.jpg', teaser: 'Coffee and bakery in a room built around light and pause.' },
  { id: 'bkk-mooyoo', roles: ['lunch', 'cafe'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Moo Yoo Rose House', where: 'Bangkok', cats: 'House · Garden · Café', img: 'assets/images/experiences/bkk-mooyoo-01.jpg', teaser: 'A house of roses — a visual café where Italian fusion meets Thai sweetness.' },
  { id: 'bkk-whispering', roles: ['cafe'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 FEB 2027', name: 'Whispering Cafe', where: 'Sam Phran · Nakhon Pathom', cats: 'Architecture · Garden · Landscape · Day escape',
    img: 'assets/images/experiences/whispering-03.jpg',
    teaser: 'Whispering Land: Provence-inspired architecture with Scandinavian restraint — French-style doors, natural light, garden and mature planting, vintage furniture and calm, adaptable spaces.' },
  { id: 'bkk-dib', roles: ['experience'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 FEB 2027', name: 'Dib Bangkok', where: 'Bangkok', cats: 'Art · Architecture · Design', img: 'assets/images/experiences/bkk-dib-01.jpg', teaser: "Bangkok's museum of contemporary art — bold architecture and public space by the expressway." },
  { id: 'bkk-emquartier', roles: ['place'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'EmQuartier', where: 'Bangkok', cats: 'City · Design · Shopping', img: 'assets/images/experiences/bkk-emquartier-01.jpg', teaser: 'Sukhumvit’s design quarter — cascading gardens, galleries of shops and city energy.' },
  { id: 'bkk-commons', roles: ['place'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'The Commons Thonglor', where: 'Bangkok', cats: 'Food · Design · Social', img: 'assets/images/experiences/bkk-commons-01.jpg', teaser: "Thonglor's vertical village — many kitchens, easy drinks in between." },
  /* BAAN PHRAYA — Day 03 · 23.02.2027 · DINNER (the current Operations Master, 19 Sep 2026: replaces The Commons in the
   * Dinner cell). Every word below is the Owner's "Experience, Restaurant, Cafe_Details" record for Baan Phraya. */
  { id: 'bkk-baanphraya', roles: ['dinner'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 FEB 2027', name: 'Baan Phraya', where: 'Bangkok · the River of Kings', cats: 'Thai fine dining · Heritage house',
    img: 'assets/images/experiences/bkk-baanphraya-01.jpg',
    teaser: 'A beautifully restored century-old riverside residence, once home to Thai nobility — the refined Thai cooking of Chef Phatchara “Pom” Pirapak.',
    detail: [
      'Set along the River of Kings, Baan Phraya returns as a beautifully restored century-old residence that honours its history as a gathering place for Thai nobility and distinguished guests. Once home to Phraya Mahai Savan and Khunying Luean Mahai Savan, the house now celebrates its legacy through the refined cooking of Chef Phatchara “Pom” Pirapak, who revives regional and royal recipes with a quiet contemporary touch.',
      'With Baan Phraya’s noble history and heritage as her muse, Chef Pom reimagines and revitalises forgotten Thai delicacies with a contemporary twist, fusing traditional cooking techniques with thoughtful sourcing and a commitment to sustainability.',
      'Baan Phraya is easily accessible from Charoen Nakorn Road with a dedicated parking area — or by the hotel’s shuttle boat across the river.'
    ],
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the house's own menu (the Mandarin Oriental upload) — every dish below is the card's */
    highlight: {
      distinction: 'Timeless Thai heritage · the River of Kings',
      line: 'Chef Phatchara “Pom” Pirapak revives regional and royal Thai recipes with a contemporary touch',
      house: 'A century-old residence, restored with care — once home to Phraya Mahai Savan and Khunying Luean Mahai Savan.',
      menuTitle: 'The eight-course Thai set menu',
      menuNote: 'THB 3,800 per person — the Owner’s rounded website price is USD 114. The house adds 10% service charge and applicable government tax. The wine pairing (THB 2,800) and the non-alcoholic pairing (THB 1,400) are the house’s own and are not booked here. Signature drinks rooted in Thai botanicals open the evening on the outdoor terrace.',
      dressTitle: 'Elegant attire',
      menu: ['Crispy pineapple wafer with peanut and tamarind', 'Thai honeycomb biscuit, Thai herbs and eggplant custard infused with Thai rice liqueur', 'Savory Icevine leaves with roasted rice and coriander', 'Gulf of Siam banana prawn tartare with Isan herbs and roasted rice', 'Prachuap Khiri Khan squid in galangal-infused coconut broth with aromatic herbs and pink peppercorns', 'Marinated bamboo fish with herbs grilled in a coconut shell, house-made pickled papaya', 'Pressed watermelon, Nakornprathom bitter orange', 'Grilled Surat Thani River prawn with its tomalley, young tamarind and chilli paste', 'Charred free-range Kao Yai duck green curry with sour grape and heart of palm', 'Mulberry honey granita from Chainat, jasmine flower, bitter orange and talipot palm', 'Roasted silver banana with pandanus ice cream, crispy baby rice and coconut emulsion'],
      contact: { phone: '+66 (0) 2 659 9000', email: 'mobkk-baanphraya@mohg.com' }
    },
    practical: {
      price: 'USD 114 per person',
      priceNote: 'The eight-course Thai set menu, THB 3,800 — the house adds 10% service charge and applicable government tax.',
      hours: ['Pre-dinner drink 17:00 – 18:00 · the outdoor terrace', 'Dinner 18:00 – 23:00 · Friday to Tuesday'],
      dress: 'Elegant attire and proper footwear; gentlemen in long trousers and closed shoes — sleeveless shirts for gentlemen are not permitted.'
    },
    select: { id: 'baanphraya', unit: 'per person' } },
  { id: 'bkk-barus', roles: ['bar'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Bar Us', where: 'Bangkok', cats: 'Bar · Evening · Design', maps: 'https://maps.app.goo.gl/2KLduE51ybg4qAqd9?g_st=ic', img: 'assets/images/experiences/bkk-barus-06.jpg', teaser: 'An intimate evening alternative — a small bar of precision and warmth.' },
  { id: 'bkk-ledukaan', roles: ['dinner'], row: 'city', chapter: 'bkk', day: 'Bangkok days', name: 'Le Du Kaan', where: 'Bangkok', cats: 'Thai fine dining · Rooftop · Bar',
    img: 'assets/images/experiences/bkk-ledukaan-01.jpg',
    teaser: 'A culinary journey through Thailand — the casual dining concept of Michelin-starred Chef Thitid “Ton” Tassanakajohn, on the 56th floor of The Empire.',
    detail: [
      'Le Du Kaan invites you to embark on a gastronomic adventure through the heart of Thailand. Celebrating the rich diversity of Thai cuisine, the restaurant blends traditional flavours with a contemporary twist — the artistry of Michelin-starred Chef Thitid “Ton” Tassanakajohn, who transforms fresh, locally sourced ingredients into dishes that capture the beauty and complexity of Thai culture.',
      'A casual dining concept crafted by the chef behind Le Du, winner of Asia’s 50 Best Restaurants 2023, in collaboration with Head Chef Chatchawan “Bank” Varahajeerakul. Each dish is designed to reflect Thailand’s cultural heritage and diverse regional flavours, turning traditional Thai cuisine into an artful, modern dining experience.',
      'The outdoor bar serves cocktails and mocktails inspired by Thailand’s four regions, with a sommelier-curated wine selection. Nestled on the 56th floor of EA Rooftop at The Empire, with a choice of indoor dining and an expansive outdoor terrace and rooftop bar over the Bangkok skyline.'
    ],
    practical: { hours: ['Lunch 11:30 – 14:30 (last order 14:00)', 'Dinner 17:00 – 22:30 (last order 22:00)', 'Bar 17:00 – 01:00 (last order 23:45)'] } },
  /* THONG SMITH: the 24.02 lunch cell now reads the Aman afternoon tea (the current Operations Master, 19 Sep 2026) — the
   * place stays a Bangkok-days address of the hosts' notes, no longer dated */
  { id: 'bkk-thongsmith', roles: ['lunch'], row: 'city', chapter: 'bkk', day: 'Bangkok days', name: 'Thong Smith', where: 'Bangkok', cats: 'Thai · Boat Noodles', img: 'assets/images/experiences/bkk-thongsmith-03.jpg', teaser: 'Siamese boat noodles, elevated — a Bangkok classic done beautifully.' },
  { id: 'bkk-letsrelax', roles: ['experience'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: "Let's Relax", where: 'Bangkok', cats: 'Wellness · Spa', img: 'assets/images/experiences/bkk-letsrelax-01.jpg', teaser: 'A quiet hour of Thai wellness before the journey continues.' },
  { id: 'bkk-dusit', roles: ['place'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Dusit Central Park', where: 'Bangkok', cats: 'City · Park · Design · Lifestyle', img: 'assets/images/experiences/bkk-dusit-01.jpg', teaser: 'The new green heart above Silom — architecture, park levels and city views.' },
  { id: 'bkk-madeleine', roles: ['cafe'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Cafe Madeleine', where: 'Four Seasons Hotel Bangkok', cats: 'Pâtisserie · Hotel · Café', img: 'assets/images/experiences/bkk-madeleine-01.jpg', teaser: "Refined hotel pâtisserie — French pastry in the Four Seasons' calm." },
  { id: 'bkk-tangjaiyang', roles: ['dinner'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Tang Jai Yang', where: 'Bangkok', cats: 'Cantonese · Charcoal · Dining', maps: 'https://maps.app.goo.gl/6otfQcm4bqsTuWZ16?g_st=ic', img: 'assets/images/experiences/bkk-tjy-02.jpg', teaser: 'Cantonese charcoal barbecue — smoke, lacquer and generations of craft.' },
  /* THAILAND · BANGKOK · THE RETURN · 06 – 08 MAR 2027 (Overview Day 14 – 16) */
  /* HARUDOT (the current Operations Master, 19 Sep 2026): the café of Day 03 · 23.02.2027 and the EXPERIENCE of Day 15 ·
   * 07.03.2027 (it replaces Siam Paragon in the Experience cell of the return); the Owner's approved photographs stand */
  { id: 'bkk-harudot', roles: ['cafe', 'experience'], row: 'Day 03 · 23.02.2027 · Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '23 FEB · 07 MAR 2027', name: 'Harudot', where: 'Bangkok', cats: 'Café · Architecture · Design', img: 'assets/images/experiences/bkk-harudot-03.jpg', teaser: 'A café of rose plaster and spiral stairs — architecture first, coffee close behind.' },
  { id: 'bkk-alati', roles: ['lunch'], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '07 MAR 2027', name: 'ALATi', where: 'Siam Kempinski Hotel Bangkok', cats: 'Lunch · Brunch · Hotel', img: 'assets/images/experiences/bkk-alati-01.jpg', teaser: 'Brunch at the Siam Kempinski — the last Bangkok lunch of the journey, the day before the flight home.' },
  /* CANNUBI BY UMBERTO BOMBANA — Day 15 · 07.03.2027 · DINNER (the current Operations Master, 19 Sep 2026: replaces Petits
   * Plats in the Dinner cell). Every word below is the Owner's "Experience, Restaurant, Cafe_Details" record. */
  { id: 'bkk-cannubi', roles: ['dinner'], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', featured: true, day: '07 MAR 2027', name: 'Cannubi by Umberto Bombana', where: 'Dusit Thani Bangkok', cats: 'Italian fine dining · One MICHELIN Star',
    img: 'assets/images/experiences/bkk-cannubi-01.jpg',
    teaser: 'Named after the famed Barolo hill in Piemonte — the one Italian restaurant in Thailand with a MICHELIN Star, and a cellar of more than 350 labels.',
    detail: [
      'Named after the famed Barolo hill in Piemonte, Cannubi by Umberto Bombana has been awarded One MICHELIN Star in the MICHELIN Guide Thailand, making it the one and only Italian restaurant in Thailand to receive this distinction.',
      'This intimate and elegant restaurant features a fully curated cellar of more than 350 wine labels, each selected for its character and quality. The set menu is designed for a refined evening of Italian dishes crafted with care by Executive Italian Chef Andrea Susto, who follows the culinary philosophy of the celebrated Chef Umberto Bombana, the King of White Truffle.'
    ],
    /* THE HIGHLIGHT (Owner, 20 Sep 2026): the house's Autumn menu (the Owner's upload from the Cannubi Drive folder) */
    highlight: {
      distinction: 'One MICHELIN Star · The MICHELIN Guide Thailand 2026',
      line: 'Executive Italian Chef Andrea Susto, in the culinary philosophy of Chef Umberto Bombana',
      house: 'Named after the famous Cannubi hill in Barolo, Piemonte — a cellar of more than 350 wine labels.',
      menuTitle: 'The set menu · Autumn',
      menuNote: 'THB 5,500 per person — the Owner’s rounded website price is USD 165. The set menu is designed for one person and is the same for everyone at the table; prices are subject to 7% VAT and 10% service charge. The wine and non-alcoholic pairings are the house’s own and are not booked here. Allergies and dietary preferences: please tell Guest Relations early.',
      dressTitle: 'Smart casual',
      menu: ['Pumpkin variations', 'Red sea bream carpaccio · Oscietra caviar · olive oil & ponzu dressing', 'Spaghettino “Felicetti” · marinated tuna tartare · tuna heart bottarga', 'Wagyu oxtail ravioli · mushroom sauce · chestnut & parsley emulsion — or homemade chitarra pasta · “Carabineros” prawn · crustacean sauce (supplement)', 'Roasted beef tenderloin & braised cheeks · morel mushroom & beef jus — or charcoaled Brittany blue lobster · pickled cherry tomatoes · lobster jus (supplement)', 'Homemade grape sorbet · sea berry & crispy pastry', '“Cioccolato” · 55% chocolate fondant · raspberry sorbet · “Pistocchi” ganache cake', 'Piccola pasticceria'],
      clip: 'assets/video/cannubi-card.mp4',
      contact: { phone: '+66 2200 9000', where: 'L Floor · Dusit Thani Bangkok' }
    },
    practical: {
      price: 'USD 165 per person',
      priceNote: 'The set menu, THB 5,500 — the house adds 7% VAT and 10% service charge.',
      hours: ['Wednesday to Sunday', 'Lunch 12:00 – 14:30 (last order 14:00)', 'Dinner 18:00 – 22:00 (last order 21:30)', 'L Floor'],
      dress: 'Smart casual — diners are respectfully requested not to wear t-shirts, shorts or sandals.'
    },
    select: { id: 'cannubi', unit: 'per person' } },
  /* PETITS PLATS BANGKOK — Day 16 · 08.03.2027 · DINNER (the current Operations Master, 19 Sep 2026: the last evening, before
   * the flight home; it replaces the in-flight dinner). The Owner's records carry no photograph and no description of the
   * place: the card stands without an image, nothing is invented. */
  { id: 'bkk-petitsplats', roles: ['dinner'], row: 'Day 16 · 08.03.2027', chapter: 'bkk', leg: 'return', day: '08 MAR 2027', name: 'Petits Plats Bangkok', where: 'Bangkok', cats: 'Dinner · The last evening',
    teaser: 'The last dinner of the journey — a Bangkok table on the evening before the flight home.' },
  /* LAOS · VIENTIANE — the city portrait (owner Vientiane folder, Sep 2026):
   * GOLD & SACRED → CITY & ARCHITECTURE → MEKONG & EVENING → BEYOND THE CENTRE */
  { id: 'vte-thatluang', roles: ['experience'], row: 'Day 05 · 25.02.2027', chapter: 'laos', featured: true, day: 'Gold & sacred', name: 'Pha That Luang', where: 'Vientiane', cats: 'Heritage · Architecture · Culture', maps: 'https://maps.app.goo.gl/hehafVRBrdPt7L9Y6?g_st=ic',
    img: 'assets/images/experiences/vte-thatluang-01.jpg',
    teaser: "The golden stupa — Laos' national symbol, radiant in the morning.",
    detail: [
      'The great golden stupa is the national symbol of Laos — about 3.5 kilometres from the centre, its gilded spire visible long before you arrive.',
      'Give it an unhurried hour: the cloistered courtyard, the reclining Buddha beside the stupa, and gold that shifts with every change of light.',
    ] },
  { id: 'vte-patuxai', roles: ['experience'], row: 'city', chapter: 'laos', featured: true, day: 'City & architecture', name: 'Patuxai', where: 'Vientiane', cats: 'Monument · Architecture · City',
    img: 'assets/images/experiences/vte-patuxai-01.jpg',
    teaser: "Vientiane's triumphal arch — palm-lined, unhurried, and worth the climb for the view down the avenue.",
    detail: [
      'Raised in the late 1950s and 1960s, the arch answers Paris with Lao form — naga finials, lotus mouldings and a crown of five towers above the city’s grandest avenue.',
      'Climb it: the upper terraces look straight over the fountain park and down Lane Xang Avenue — our second photograph is that view. Morning and late afternoon bring the kindest light.',
    ] },
  { id: 'vte-nightmarket', roles: ['experience','place'], row: 'Day 06 · 26.02.2027', chapter: 'laos', featured: true, day: 'Mekong & evening', name: 'Vientiane Night Market', where: 'Vientiane', cats: 'Night market · Riverfront · Local life', maps: 'https://maps.app.goo.gl/X2jTe6DyVCc7qd21A?g_st=ic',
    img: 'assets/images/experiences/vte-nightmarket-01.jpg',
    teaser: 'Red roofs along the Mekong at dusk — lanterns, stalls and the city out for the evening.',
    detail: [
      'Every evening the red-roofed stalls open along Chao Anouvong Park — clothes, crafts and small food, with the Mekong turning to colour behind them.',
      'Come for the promenade as much as the market: at sunset the riverfront fills with families, runners and food carts, and the far bank is already Thailand.',
    ] },
  { id: 'vte-sisaket', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Gold & sacred', name: 'Wat Si Saket', where: 'Vientiane', cats: 'Temple · Heritage · Museum',
    img: 'assets/images/experiences/vte-sisaket-01.jpg',
    teaser: 'The oldest temple in Vientiane — thousands of Buddhas in a quiet cloister that survived when the city did not.',
    detail: ['The only temple left standing after the siege of 1827, its cloister walls hold niche after niche of Buddha figures — photography stays outside the ordination hall.'] },
  { id: 'vte-simuang', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Gold & sacred', name: 'Wat Si Muang', where: 'Vientiane', cats: 'Temple · Local life · Sacred',
    img: 'assets/images/experiences/vte-simuang-01.jpg',
    teaser: "Vientiane's most beloved working temple — colour, incense and the shrine of the city pillar.",
    detail: ['This is where Vientiane itself comes to pray — marigolds, daily blessings and the city pillar shrine, a short walk from Wat Si Saket.'] },
  { id: 'vte-haphrakeo', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Gold & sacred', name: 'Ha Phrakeo Museum', where: 'Vientiane', cats: 'Museum · Heritage · Garden',
    img: 'assets/images/experiences/vte-haphrakeo-01.jpg',
    teaser: 'The former royal temple built for the Emerald Buddha — now a calm museum of Lao Buddhist art.',
    detail: ['The Emerald Buddha itself left for Bangkok centuries ago; what remains is a garden, a carved terrace and one of the country’s finest collections of Buddha figures.'] },
  { id: 'vte-palace', roles: ['experience'], row: 'city', chapter: 'laos', day: 'City & architecture', name: 'Presidential Palace', where: 'Vientiane', cats: 'Landmark · Architecture',
    img: 'assets/images/experiences/vte-palace-01.jpg',
    teaser: 'French-colonial grandeur behind gilded gates — best admired from the avenue.',
    detail: ['The palace is not open to visitors, and doesn’t need to be — it reads best from outside the fence, palms and flag above the white façade, with Ha Phrakeo directly next door.'] },
  { id: 'vte-thatdam', roles: ['experience'], row: 'city', chapter: 'laos', day: 'City & architecture', name: 'That Dam', where: 'Vientiane', cats: 'Stupa · Legend · City',
    img: 'assets/images/experiences/vte-thatdam-01.jpg',
    teaser: 'The Black Stupa — centuries of quiet legend holding a city roundabout.',
    detail: ['Unrestored and slightly overgrown, it stands mid-roundabout among cafés and embassies — a five-minute pause that feels older than everything around it.'] },
  { id: 'vte-buddhapark', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Beyond the centre', name: 'Buddha Park', where: 'Xieng Khuan · Vientiane', cats: 'Sculpture park · Riverside · Day escape',
    img: 'assets/images/experiences/vte-buddhapark-01.jpg',
    teaser: 'A riverside sculpture garden of giants, about an hour from the city.',
    detail: ['Some twenty kilometres downstream, Hindu and Buddhist figures crowd a green meadow — the great reclining Buddha above all. An easy half-day escape, and a favourite with children.'] },
  { id: 'vte-laonationalmuseum', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Museums', name: 'Lao National Museum', where: 'Vientiane', cats: 'Museum · History · Heritage',
    img: 'assets/images/experiences/vte-laonationalmuseum-01.jpg',
    teaser: 'The national collection of Lao history and culture — first opened in 1980 in the former French Governor’s Residence, since 2017 in a new building six kilometres from the centre.',
    detail: [
      'The Lao National Museum was first established in 1980 as the Lao Revolutionary Exhibition Hall in the former French Governor’s Residence on Samsenthai Road. Built in the French colonial style in 1925, the building has an important place in Lao history: it was here that Laos gained its independence from France on 12 October 1945. Renamed the Revolutionary Museum in 1985, it became the Lao National Museum in 2000.',
      'The museum is one of the main institutes responsible for researching, protecting, conserving, storing and promoting the historical and cultural heritage of Laos. In 2017 it moved to a new building, built between 2013 and 2017, six kilometres from the centre of Vientiane — with room for artefact storage, conservation work, the protection of historical documents and the display of the Lao historical and cultural collections from prehistory to the present.'
    ],
    practical: { price: 'Admission: 30,000 KIP per person (foreign visitors) · 5,000 KIP (Lao nationals)', hours: ['Monday – Friday 8:00 – 16:00', 'Saturday – Sunday 9:00 – 16:00'] } },
  { id: 'vte-silkresidence', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Museums', name: 'Traditional Lao Silk Residence', where: 'Vientiane', cats: 'Museum · Textiles · Craft',
    img: 'assets/images/experiences/vte-silkresidence-01.jpg',
    teaser: 'Textile Treasures of Laos — heirloom silks and living weaving traditions, shown in the Hor Kham Residence next to the Presidential Office.',
    detail: [
      'Textile Treasures of Laos, the Lao Silk House, opened at the Hor Kham Residence next to the Presidential Office. Organised by the Lao Handicrafts Association, the exhibition brings together prized heirloom pieces loaned from families across the country, allowing the public to appreciate the deep cultural heritage and artistry behind Lao textiles.',
      'The exhibition is arranged in two sections. The Heritage Hall features over 100 traditional textiles that showcase the skill of Lao weavers — from ceremonial sinh to household fabrics, with motifs that convey ancient beliefs and folklore; some pieces date back more than a century. The adjacent gallery shows the future of Lao weaving: contemporary artisans reinterpreting traditional motifs, such as naga patterns, on minimalist wall hangings and fashion pieces.',
      'Set within the Hor Kham Residence, a blend of French Indochinese influence and serene gardens, natural light streams through floor-to-ceiling windows onto the silks. A branch of Naked Espresso on site serves locally sourced coffee. Photography is permitted without flash.'
    ],
    practical: { price: '50,000 LAK per person (about USD 2.23)', hours: ['Open daily 9:00 – 17:00'] } },
  { id: 'vte-laoartmuseum', roles: ['experience'], row: 'city', chapter: 'laos', day: 'Museums', name: 'Lao Art Museum', where: 'Vientiane', cats: 'Museum · Art · Craft',
    img: 'assets/images/experiences/vte-laoartmuseum-01.jpg',
    teaser: 'A newly established landmark for the artistic and cultural heritage of Laos — wood carvings, traditional paintings and crafted Lao products.',
    detail: [
      'The Lao Art Museum in Vientiane is a newly established landmark dedicated to celebrating and preserving the rich artistic and cultural heritage of Laos. Designed to be more than a traditional museum, the space offers an immersive experience: exquisite wood carvings, traditional paintings and uniquely crafted Lao products. The museum serves as a hub for both art appreciation and cultural education — a stop for history enthusiasts, artists and travellers alike.'
    ],
    practical: { price: 'Entry 220,000 LAK (about USD 10 – 15) for foreign visitors · electric cart or shuttle an additional 50,000 – 120,000 LAK', hours: ['Open 08:30 – 16:00'] } },
  /* LAOS · VIENTIANE — tables & days · 25 FEB – 01 MAR 2027 */
  { id: 'vte-rivermoon', roles: ['lunch'], row: 'Day 05 · 25.02.2027', chapter: 'laos', featured: true, day: '25 FEB 2027', name: 'River Moon', where: 'Vientiane', cats: 'Riverside · Landscape · Dining', maps: 'https://maps.app.goo.gl/NMbPP5kvLKurozJJ8?g_st=ic', img: 'assets/images/experiences/vte-rivermoon-01.jpg', teaser: "Lao and Thai barbecue at the water's edge — riverside landscape and slow midday." },
  { id: 'vte-3merchants', roles: ['dinner'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: '3 Merchants Restaurant', where: 'Vientiane', cats: 'Indochinese · Dining', maps: 'https://maps.app.goo.gl/q3nJqc74P1hn6mkf6?g_st=ic',
    img: 'assets/images/experiences/vte-3merchants-01.jpg', teaser: 'A refined Vientiane dining room we love — calm, contemporary and generous.' },
  { id: 'vte-sona', roles: ['cafe','bar'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: 'Sona Cafe and Bar', where: 'Vientiane', cats: 'Bar · Evening', maps: 'https://maps.app.goo.gl/hDGyqmbPwYTEmvr89?g_st=ic',
    img: 'assets/images/experiences/vte-sona-01.jpg', teaser: 'An easy Vientiane evening — coffee turned to drinks as the city softens.' },
  { id: 'vte-kaogee', roles: ['lunch','cafe'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Kaogee Le Triomphe', where: 'Vientiane', cats: 'Local · Bakery · Café',
    img: 'assets/images/experiences/vte-kaogee-01.jpg', teaser: 'The classic Vientiane café moment — kaogee baguettes and good coffee near the Patuxay.' },
  { id: 'vte-lacuna', roles: ['cafe'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Lacuna VTE', where: 'Vientiane', cats: 'Café · Design', maps: 'https://maps.app.goo.gl/tzMFhWFGAWjE2ALs8?g_st=ic', img: 'assets/images/experiences/vte-lacuna-03.jpg', teaser: 'A quiet design café — considered coffee in a considered room.' },
  { id: 'vte-kokkok', roles: ['place'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'KokKok Mega Mall Patuxay', where: 'Vientiane', cats: 'City · Shopping', maps: 'https://maps.app.goo.gl/TKSjr5kc2P6vWvWSA?g_st=ic', img: 'assets/images/experiences/vte-kokkok-01.jpg', teaser: 'A modern city stop by the Patuxay.' },
  { id: 'vte-laoderm', roles: ['dinner'], row: 'Day 06 · 26.02.2027 · Day 07 Welcome Dinner', chapter: 'laos', day: '26 FEB 2027', name: 'Lao Derm', where: 'Vientiane', cats: 'Lao · Dining', maps: 'https://maps.app.goo.gl/cSn9mzR38QdKGsk49?g_st=ic', img: 'assets/images/experiences/vte-laoderm-02.jpg', teaser: 'An evening alternative — classic Lao dining, warm and unhurried.' },
  /* CHINA · KUNMING · LIJIANG */
  { id: 'cn-blossom', roles: ['experience'], row: 'Day 09 – 10 · 01.–02.03.2027', chapter: 'china', featured: true, day: 'Seasonal', name: 'Kunming Cherry Blossoms', where: 'Kunming · Yunnan', cats: 'Nature · Garden · Seasonal · Photography',
    img: 'assets/images/experiences/kmg-blossom-01.jpg',
    teaser: "In spring, Kunming's gardens shift into layers of pink blossom, water, stone paths and traditional architecture.",
    detail: [
      'The most atmospheric locations bring together Yunnan cherry blossoms and flowering begonia with streams, small cascades, white walls, dark tiled roofs and planted walkways — less a single attraction than a seasonal landscape that changes with light, weather and the stage of bloom.',
      "Seasonal note — Kunming's main cherry blossom season usually builds from mid-March into April. Our early-March visit may fall before peak bloom, so actual flowering conditions will depend on the season.",
      'Yuantongshan (Wuhua District) — the classic Kunming blossom garden: Yunnan cherry, weeping begonia and a dense pink canopy in an established city park.',
      'Kunming suburban park (Xishan District) — a broader, quieter garden landscape for more spacious, immersive flower viewing.',
      'Best light — mornings 09:00–11:00 and late afternoons 16:00–18:00; midday light is harsh for photography. Perspectives worth seeking: hanging branches, water and blossom layers, stone-path depth, white-wall framing, backlit petals.',
      'Good to know — bloom timing varies by year and weather; spring temperatures shift and Yunnan sun can be strong; allow two to three unhurried hours; please leave branches and planting untouched.',
    ] },
];
