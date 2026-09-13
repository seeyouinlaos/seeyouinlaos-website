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
   * record, structured, nothing added. The price is the source cell "$180.00":
   * the sheet does not say per guest, per menu or per table, so the website
   * shows USD 180 and never multiplies it. Selectable by Owner decision
   * (13 Sep 2026) through the Journey selection — a request to Guest
   * Relations, never a confirmed reservation. */
  { id: 'bkk-suhring', roles: ['lunch'], row: 'Experience, Restaurant, Cafe_Details · Suhring', sheet: 'FULL', chapter: 'bkk', featured: true, day: 'Bangkok days', name: 'Sühring', where: 'Bangkok', cats: 'German fine dining · Lunch',
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
    practical: {
      price: 'USD 180',
      priceNote: 'The amount recorded by the hosts. The source does not state whether it is per guest or per menu, so it is shown as recorded and never multiplied here.',
      hours: ['Lunch', 'Thursday to Sunday', '12:30 pm to 13:00 pm (last seating)', 'Closed on Monday and Tuesday']
    },
    select: { id: 'suhring', name: 'Sühring', meta: 'Lunch · German fine dining · Bangkok', price: 'USD 180' } },
  { id: 'bkk-diorlv', roles: ['cafe'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'Dior · Café LV', where: 'Bangkok', cats: 'Fashion · Design · Café', img: 'assets/images/experiences/bkk-dior-01.jpg', gallery: ['assets/images/experiences/bkk-dior-01.jpg', 'assets/images/experiences/bkk-lv-cafe-01.jpg'], teaser: 'A luxury design café stop — couture interiors, French pastry and contemporary calm.' },
  { id: 'bkk-lvvisionary', roles: ['experience'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 FEB 2027', name: 'Louis Vuitton Visionary Journeys', where: 'Bangkok', cats: 'Exhibition · Design · Fashion', img: 'assets/images/experiences/bkk-lvvisionary-01.jpg', teaser: 'The house opens its world: an exhibition of craft, travel and imagination staged as architecture.' },
  { id: 'bkk-iconsiam', roles: ['place'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', featured: true, day: '22 FEB 2027', name: 'ICONSIAM', where: 'Bangkok', cats: 'Riverfront · City · Design · Shopping', img: 'assets/images/experiences/bkk-iconsiam-01.jpg', teaser: 'The riverfront landmark — architecture, design floors and the Chao Phraya at golden hour.' },
  { id: 'bkk-phranakorn', roles: ['dinner'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'Phra Nakhon', where: 'Bangkok', cats: 'Thai dining · Riverside', img: 'assets/images/experiences/bkk-phranakorn-01.jpg', teaser: 'A Bangkok dining destination for contemporary Thai cooking.' },
  { id: 'bkk-socialclub', roles: ['bar'], row: 'Day 02 · 22.02.2027', chapter: 'bkk', day: '22 FEB 2027', name: 'BKK Social Club', where: 'Bangkok', cats: 'Bar · Design · Evening', img: 'assets/images/experiences/bkk-social-01.jpg', teaser: "One of the city's great bars — Buenos Aires glamour, considered drinks, late light." },
  { id: 'bkk-timespace', roles: ['lunch','cafe'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Time Space Cafe', where: 'Bangkok', cats: 'Café · Design', img: 'assets/images/experiences/bkk-timespace-01.jpg', teaser: 'Coffee and bakery in a room built around light and pause.' },
  { id: 'bkk-mooyoo', roles: ['lunch'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Moo Yoo Rose House', where: 'Bangkok', cats: 'House · Garden · Café', img: 'assets/images/experiences/bkk-mooyoo-01.jpg', teaser: 'A house of roses — a visual café where Italian fusion meets Thai sweetness.' },
  { id: 'bkk-whispering', roles: ['cafe'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 FEB 2027', name: 'Whispering Cafe', where: 'Sam Phran · Nakhon Pathom', cats: 'Architecture · Garden · Landscape · Day escape',
    img: 'assets/images/experiences/whispering-01.jpg',
    teaser: 'Whispering Land: Provence-inspired architecture with Scandinavian restraint — French-style doors, natural light, garden and mature planting, vintage furniture and calm, adaptable spaces.' },
  { id: 'bkk-dib', roles: ['experience'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', featured: true, day: '23 FEB 2027', name: 'Dib Bangkok', where: 'Bangkok', cats: 'Art · Architecture · Design', img: 'assets/images/experiences/bkk-dib-01.jpg', teaser: "Bangkok's museum of contemporary art — bold architecture and public space by the expressway." },
  { id: 'bkk-emquartier', roles: ['place'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'EmQuartier', where: 'Bangkok', cats: 'City · Design · Shopping', img: 'assets/images/experiences/bkk-emquartier-01.jpg', teaser: 'Sukhumvit’s design quarter — cascading gardens, galleries of shops and city energy.' },
  { id: 'bkk-commons', roles: ['place','dinner'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'The Commons Thonglor', where: 'Bangkok', cats: 'Food · Design · Social', img: 'assets/images/experiences/bkk-commons-01.jpg', teaser: "Thonglor's vertical village — one evening, many kitchens, easy drinks in between." },
  { id: 'bkk-barus', roles: ['bar'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'Bar Us', where: 'Bangkok', cats: 'Bar · Evening · Design', maps: 'https://maps.app.goo.gl/2KLduE51ybg4qAqd9?g_st=ic', img: 'assets/images/experiences/bkk-barus-01.jpg', teaser: 'An intimate evening alternative — a small bar of precision and warmth.' },
  { id: 'bkk-igniv', roles: ['dinner','bar'], row: 'Day 03 · 23.02.2027', chapter: 'bkk', day: '23 FEB 2027', name: 'IGNIV', where: 'Bangkok', cats: 'Dining · Evening', maps: 'https://maps.app.goo.gl/vkS23W4viFPRWkf78?g_st=ic', img: 'assets/images/experiences/bkk-igniv-01.jpg', teaser: 'A sharing-menu evening alternative — fine dining made convivial.' },
  { id: 'bkk-thongsmith', roles: ['lunch'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Thong Smith', where: 'Bangkok', cats: 'Thai · Boat Noodles', img: 'assets/images/experiences/bkk-thongsmith-01.jpg', teaser: 'Siamese boat noodles, elevated — a Bangkok classic done beautifully.' },
  { id: 'bkk-letsrelax', roles: ['experience'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: "Let's Relax", where: 'Bangkok', cats: 'Wellness · Spa', img: 'assets/images/experiences/bkk-letsrelax-01.jpg', teaser: 'A quiet hour of Thai wellness before the journey continues.' },
  { id: 'bkk-dusit', roles: ['place'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Dusit Central Park', where: 'Bangkok', cats: 'City · Park · Design · Lifestyle', img: 'assets/images/experiences/bkk-dusit-01.jpg', teaser: 'The new green heart above Silom — architecture, park levels and city views.' },
  { id: 'bkk-madeleine', roles: ['cafe'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Cafe Madeleine', where: 'Four Seasons Hotel Bangkok', cats: 'Pâtisserie · Hotel · Café', img: 'assets/images/experiences/bkk-madeleine-01.jpg', teaser: "Refined hotel pâtisserie — French pastry in the Four Seasons' calm." },
  { id: 'bkk-tangjaiyang', roles: ['dinner'], row: 'Day 04 · 24.02.2027', chapter: 'bkk', day: '24 FEB 2027', name: 'Tang Jai Yang', where: 'Bangkok', cats: 'Cantonese · Charcoal · Dining', maps: 'https://maps.app.goo.gl/6otfQcm4bqsTuWZ16?g_st=ic', img: 'assets/images/experiences/bkk-tjy-01.jpg', teaser: 'Cantonese charcoal barbecue — smoke, lacquer and generations of craft.' },
  /* THAILAND · BANGKOK · THE RETURN · 06 – 08 MAR 2027 (Overview Day 14 – 15) */
  { id: 'bkk-harudot', roles: ['place'], row: 'Day 14 · 06.03.2027', chapter: 'bkk', leg: 'return', day: '06 MAR 2027', name: 'Harudot', where: 'Bangkok', cats: 'Café · Architecture · Design', img: 'assets/images/experiences/bkk-harudot-01.jpg', teaser: 'A café of rose plaster and spiral stairs — architecture first, coffee close behind.' },
  { id: 'bkk-alati', roles: ['lunch'], row: 'Day 15 · 07.03.2027', chapter: 'bkk', leg: 'return', day: '07 MAR 2027', name: 'ALATi', where: 'Siam Kempinski Hotel Bangkok', cats: 'Lunch · Brunch · Hotel', img: 'assets/images/experiences/bkk-alati-01.jpg', teaser: 'Brunch at the Siam Kempinski — the last Bangkok table of the journey, the day before the flight home.' },
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
  /* LAOS · VIENTIANE — tables & days · 25 FEB – 01 MAR 2027 */
  { id: 'vte-pvo', roles: ['breakfast'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: 'PVO Vietnamese Food', where: 'Vientiane', cats: 'Breakfast · Local · Vietnamese · Lao', maps: 'https://maps.app.goo.gl/EgPxLNAcBzgbDnsh9?g_st=ic', teaser: 'The Vientiane breakfast institution — baguettes, broth and morning light.' },
  { id: 'vte-rivermoon', roles: ['lunch'], row: 'Day 05 · 25.02.2027', chapter: 'laos', featured: true, day: '25 FEB 2027', name: 'River Moon', where: 'Vientiane', cats: 'Riverside · Landscape · Dining', maps: 'https://maps.app.goo.gl/NMbPP5kvLKurozJJ8?g_st=ic', img: 'assets/images/experiences/vte-rivermoon-01.jpg', teaser: "Lao and Thai barbecue at the water's edge — riverside landscape and slow midday." },
  { id: 'vte-parkson', roles: ['place'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: 'Parkson Supermarket Laos', where: 'Vientiane', cats: 'Local life · City', maps: 'https://maps.app.goo.gl/FoLWdYEkYXoxET3d7?g_st=ic', teaser: 'Everyday Vientiane — a local stop between the moments.' },
  { id: 'vte-3merchants', roles: ['dinner'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: '3 Merchants Restaurant', where: 'Vientiane', cats: 'Indochinese · Dining', maps: 'https://maps.app.goo.gl/q3nJqc74P1hn6mkf6?g_st=ic',
    img: 'assets/images/experiences/vte-3merchants-01.jpg', teaser: 'A refined Vientiane dining room we love — calm, contemporary and generous.' },
  { id: 'vte-sona', roles: ['cafe','bar'], row: 'Day 05 · 25.02.2027', chapter: 'laos', day: '25 FEB 2027', name: 'Sona Cafe and Bar', where: 'Vientiane', cats: 'Bar · Evening', maps: 'https://maps.app.goo.gl/hDGyqmbPwYTEmvr89?g_st=ic',
    img: 'assets/images/experiences/vte-sona-01.jpg', teaser: 'An easy Vientiane evening — coffee turned to drinks as the city softens.' },
  { id: 'vte-khopchaideu', roles: ['lunch'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Khop Chai Deu', where: 'Vientiane', cats: 'Lao · Dining · City', maps: 'https://maps.app.goo.gl/kZtH2y38zMQHH8vc8?g_st=ic', teaser: 'A Vientiane classic — Lao cooking in a colonial house at the heart of the city.' },
  { id: 'vte-kaogee', roles: ['lunch','cafe'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Kaogee Le Triomphe', where: 'Vientiane', cats: 'Local · Bakery · Café',
    img: 'assets/images/experiences/vte-kaogee-01.jpg', teaser: 'The classic Vientiane café moment — kaogee baguettes and good coffee near the Patuxay.' },
  { id: 'vte-lacuna', roles: ['cafe','bar'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Lacuna VTE', where: 'Vientiane', cats: 'Café · Design', maps: 'https://maps.app.goo.gl/tzMFhWFGAWjE2ALs8?g_st=ic', img: 'assets/images/experiences/vte-lacuna-01.jpg', teaser: 'A quiet design café — considered coffee in a considered room.' },
  { id: 'vte-kokkok', roles: ['place'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'KokKok Mega Mall Patuxay', where: 'Vientiane', cats: 'City · Shopping', maps: 'https://maps.app.goo.gl/TKSjr5kc2P6vWvWSA?g_st=ic', img: 'assets/images/experiences/vte-kokkok-01.jpg', teaser: 'A modern city stop by the Patuxay.' },
  { id: 'vte-lepadaek', roles: ['dinner'], row: 'Day 06 · 26.02.2027', chapter: 'laos', day: '26 FEB 2027', name: 'Le Padaek', where: 'Vientiane', cats: 'Lao · Dining', maps: 'https://maps.app.goo.gl/WD3gNtNm5AVaDrFU6?g_st=ic', teaser: 'An evening alternative — modern Lao cooking with deep roots.' },
  { id: 'vte-laoderm', roles: ['dinner'], row: 'Day 06 · 26.02.2027 · Day 07 Welcome Dinner', chapter: 'laos', day: '26 FEB 2027', name: 'Lao Derm', where: 'Vientiane', cats: 'Lao · Dining', maps: 'https://maps.app.goo.gl/cSn9mzR38QdKGsk49?g_st=ic', img: 'assets/images/experiences/vte-laoderm-01.jpg', teaser: 'An evening alternative — classic Lao dining, warm and unhurried.' },
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
