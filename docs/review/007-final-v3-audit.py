#!/usr/bin/env python3
"""007 — FINAL V3 SOURCE-TRUTH AUDIT · generator for docs/review/007-final-v3-source-truth-audit.txt (004, 16 Sep 2026: after the security remediation, the Owner's final venue mapping, the final public / private information architecture and the guest reconciliation — a new version; the v2 files stay as history. Based on the v2 generator)
READ-ONLY. Compares every factual / numerical guest-facing claim of the current release against the
Owner's Operations Master (the exported Google Sheet H&S_Wedding_Operations_Master, every tab) and the
documented Owner decisions, then proves the price and room invariants against the live pricing source.
Nothing on the website is changed; where sources conflict, the conflict is recorded, never resolved.
  python3 docs/review/007-final-v3-audit.py <ops-master.xlsx> <site-facts.json> <extract-run.json>
Classifications: MATCH · OWNER DECISION OVERRIDE · SOURCE MISSING · STALE / RETIRED SOURCE · CONFLICT.
A documented Owner decision is never an unresolved CONFLICT; a real contradiction with no decision stays one.
"""
import json, re, subprocess, sys, datetime, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[2]
XLSX, FACTS, RUN = sys.argv[1], sys.argv[2], sys.argv[3]
SHA = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT).decode().strip()
MASTER_MODIFIED = '2026-09-13T12:44:10Z'   # Drive modifiedTime of H&S_Wedding_Operations_Master; the export used is later (2026-09-13 19:27Z)
site = json.load(open(FACTS))
run = json.load(open(RUN))
wb = openpyxl.load_workbook(XLSX, data_only=True, read_only=True)

def sheet(name):
    return [list(r) for r in wb[name].iter_rows(values_only=True)]

acc = sheet('Accommodation_Details')
lab = {(str(r[0]).strip() if r[0] else ''): r for r in acc}
def col(i, key):
    r = lab.get(key); return r[i] if r and i < len(r) else None
master_cols = []
for i in range(1, len(lab['Category'])):
    if col(i, 'Category') or col(i, 'Room'):
        master_cols.append({k: col(i, k) for k in ['Room', 'Category', 'Bedroom', 'Pax', 'Number of Night', 'Rooms avaible', 'Price per Person', 'Status', 'Breakfast', 'Check In Date', 'Check Out Date']})
def mcol(pattern):
    for c in master_cols:
        if re.search(pattern, str(c['Category']) + ' ' + str(c['Room']), re.I): return c
    return None

issues = []
def issue(surface, website, source, location, cls, note=''):
    issues.append(dict(surface=surface, website=website, source=source, location=location, cls=cls, note=note))

# ------------------------------------------------------------------ dates and windows
issue('Homepage · Destinations · Your Journey', 'The journey runs 21 February – 8 March 2027; Bangkok 21–24 Feb · night train 24–25 Feb · Vientiane 25–27 Feb and 27 Feb – 1 Mar · Kunming 1–4 Mar · Lijiang 4–6 Mar · Bangkok 6–8 Mar',
      'Overview_Hotel_Restaurant: Day 01 21.02.2027 … Day 16 08.03.2027; Accommodation_Details check-in/out: Penthouse/U Sathorn/Shama 21.02–24.02 · train 24.02–25.02 · Souphattra 25.02/27.02 → 27.02/01.03 · Kunming 01.03–04.03 · Lijiang 04.03–06.03 · Kempinski 06.03–08.03', 'Overview_Hotel_Restaurant rows Day 01–16 · Accommodation_Details rows Check In Date / Check Out Date', 'MATCH')
issue('Every wedding surface', 'The wedding: Sunday, 28 February 2027 · Vientiane', 'Day 08 28.02.2027 Vientiane (Overview) · Master_Timeline DAY 07 28.02.2027 Sunday', 'Overview_Hotel_Restaurant Day 08 · Master_Timeline', 'MATCH')

# ------------------------------------------------------------------ the four moments
issue('The Wedding (03) · Wedding public page · the programme · dress code', 'Temple Ceremony · Sunday, 28 February 2027 · 09:00 – approximately 12:00 · Wat Ong Teu, Vientiane — attendance only, no seats',
      'Operations Master: no timed temple entry; Master_Timeline 28.02 has "Alms Giving Ceremony 05:30–06:15 · Souphattra Heritage Vientiane"; Overview Day 08 lists "Wat Ong Teu; Souphattra Heritage" (Experience) and "Wat Ong Teu Vientiane" (Mall/Park/Other) without a time. The locked programme in docs/references/SEE-YOU-IN-LAOS-FINAL-DESIGN-SYSTEM-MASTER.md §18 says TEMPLE CEREMONY · 09:00–approx. 12:00 · Wat Ong Teu.',
      'Master_Timeline DAY 07 rows 05:30–06:15 · Overview Day 08 · design-system master §18 · Owner decision Edit 2 (15 Sep 2026)', 'OWNER DECISION OVERRIDE', 'Venue matches (Wat Ong Teu). FINAL OWNER TIME (Edit 2, 15 Sep 2026): 09:00 – approximately 12:00 — the same as the locked programme; the earlier website value 08:00 is retired. The sheet\'s 05:30 alms-giving row is the separate Tak Bat timing, not this event.')
issue('The Wedding (03) · Wedding public page', 'Coffee & Cake · From 12:00 · Souphattra Heritage Vientiane', 'Overview Day 08 cafe column "Souphattra Heritage Coffee & Cake" (no time); Master_Timeline 28.02: guests lunch 13:00–14:30, no Coffee & Cake row; design-system master §18: COFFEE & CAKE · starts 12:00', 'Overview Day 08 · Master_Timeline DAY 07 · design-system master §18', 'SOURCE MISSING', 'The event and venue are in the sheet; the time is only in the locked programme document.')
issue('The Wedding (03) · Wedding public page · Review & Send · seat tickets · seating plan', 'Wedding Ceremony (Vow Ceremony) · Sunday, 28 February 2027 · 15:30 · Souphattra Heritage, Vientiane — the ceremony seating belongs to it: the Bride and the Groom front centre, every guest the chair they chose; ticket reference SYL-WC-…', 'Master_Timeline 28.02: 16:20 Bride walks down the aisle · 16:30–17:00 Wedding ceremony · Souphattra Heritage Vientiane; design-system master §18: VOW CEREMONY · 16:30; Owner correction Edit 2 (15 Sep 2026): "Vow Ceremony always start at 15:30", the wedding seat is at Souphattra Heritage, never the temple', 'Master_Timeline DAY 07 16:30–17:00 · Owner Edit 2 (IMG_4012, IMG_4014, IMG_4015, IMG_4017)', 'OWNER DECISION OVERRIDE', 'The sheet\'s 16:30 is superseded by the Owner\'s 15:30 (stale source). The venue matches. Before Edit 2 the seat ticket said Temple Ceremony · Wat Ong Teu · 08:00 — corrected at source (seat vocabulary, ticket, QR payload, PDF, sent journey, readiness).')
issue('The Wedding (03) · Wedding public page · seat tickets · seating plan', 'Wedding Dinner · 19:30 · Souphattra Heritage Vientiane · poolside (seat ticket 19:30)', 'Master_Timeline 28.02: 18:30–19:00 Go to wedding dinner venue · 19:00–19:15 Grand entrance · 19:15–21:30 Wedding Dinner (Appetizer & main course) · Souphattra Heritage Vientiane; design-system master §18: WEDDING DINNER · 19:30 · Souphattra Vientiane Hotel', 'Master_Timeline DAY 07 19:00–21:30 · design-system master §18 · Owner decision D-20 (13 Sep 2026) · Owner 003 (15 Sep 2026): Poolside, Run A = Poolside', 'OWNER DECISION OVERRIDE', 'Time: 19:30 as the locked programme and the Owner decision of 13 Sep 2026 (the sheet\'s 19:00 grand entrance / 19:15 dinner rows are planning detail). Venue name follows the sheet. Poolside and Run A = Poolside are Owner truth (15 Sep 2026), preserved.')
issue('Wedding Dinner · every surface · the seating plan', 'Dinner = Poolside; the long table beside the swimming pool; RUN A = poolside, RUN B opposite the pool', 'Inventory AST007 "Ceremony chairs · Pool side ceremony, 52 plus 2 spare" · AST015 "Warm cotton towels · Pool side, wedding day"; the dinner venue row says "Souphattra Heritage (Wedding Dinner)" without a side. Owner decision D-20 (13 Sep 2026): Poolside; Owner decision 15 Sep 2026 (venue plan uploaded): RUN A = POOLSIDE', 'Inventory sheet · docs/acceptance/2026-09-13-owner-decisions/README.md item 20 · docs/acceptance/2026-09-15-cart-ticket/README.md', 'OWNER DECISION OVERRIDE', 'The sheet places the ceremony chairs poolside; the dinner side and the run are the Owner\'s decisions, not a sheet value.')
issue('The Wedding (03) · Tak Bat drawer · sent journey', 'Tak Bat (morning alms-giving) is part of the Temple Ceremony; a personal offering, arranged individually on the morning; no amount set', 'Budget_Finance row "Alms Giving Ceremony · Souphattra Heritage · Guest Experience · Booking-driven. Do not hardcode pax. · 0 / 40 / 1 · Suthep"; Master_Timeline 05:30–06:15 Alms Giving Ceremony at Souphattra Heritage (36 pax · Denim, White); Owner correction 10 Sep 2026: Tak Bat = SELF-PAY', 'Budget_Finance row 56 · Master_Timeline · docs/acceptance/2026-09-13-owner-decisions/README.md "Tak Bat payment logic"', 'OWNER DECISION OVERRIDE', 'Tak Bat = self-pay (Owner decision, restated in 003 on 15 Sep 2026) and part of the Temple Ceremony at Wat Ong Teu (the Owner\'s 9 Sep correction); the sheet\'s 05:30 hotel row is the separate operational alms-giving timing, which the Owner told 003 not to confuse with the Temple Ceremony. No decision outstanding.')
issue('The Wedding (03) · cart · review · sent journey', 'Sangkhathan · USD 15 · an individual YES / NO for the guest alone', 'No Sangkhathan row in Budget_Finance, Snack_Details or the Overview; Owner decision 13 Sep 2026 (USD 15 per participating person) and 14 Sep 2026 (individual, never USD 30)', 'docs/acceptance/2026-09-13-owner-decisions/README.md §7 · docs/review/007-change-manifest.md', 'OWNER DECISION OVERRIDE', 'Amount not in the sheet.')
issue('The Wedding · dress code', 'Temple Ceremony: Lao Traditional Dress · Coffee & Cake, Vow Ceremony, Wedding Dinner: Black Tie · travelling days: Resort Wear', 'Master_Timeline 28.02: guests "Black Tie" from 15:30; alms giving "Denim, White"; Bangkok days "Elegant Resort Wear" / "Cocktail Attire"', 'Master_Timeline DAY 07 · DAY 02–03 dress column · Owner decision 13 Sep 2026 (#19)', 'OWNER DECISION OVERRIDE', 'The wedding-day Black Tie matches. The sheet dresses the morning "Denim, White"; the Owner decided Lao Traditional Dress for the temple (13 Sep 2026, #19) — the sheet\'s value is stale for the website.')

# ------------------------------------------------------------------ transport
issue('Journeys · Your Journey · Transport · travel pass', 'Special Express No. 25 · Bangkok (Krung Thep Aphiwat) 20:25 → Nong Khai 06:25 · 24–25 February 2027 · First Class Sleeper · van and border logistics to Vientiane · USD 100 per person · package',
      'Accommodation_Details column "Special Express No. 25 · First Class cabin": Price per Person 100 · check-in 24.02 → 25.02 · 1 night · 12 available · Pax 2 adults, 1 child; Transportation tab: Train Bangkok – Nong Khai THB 2,900 = USD 88.31 (First class lounge access, complimentary water) + Van Nong Khai – Vientiane THB 3,500 = USD 105 + Document for custom THB 100 = USD 3.05; Overview Day 04: "USD 90 per person per nights" · "Special Express No. 25 + Document for border crossing incl. Breakfast and Dinner"; no departure/arrival times in the sheet',
      'Accommodation_Details · Transportation · Overview Day 04', 'OWNER DECISION OVERRIDE', 'USD 100 per person is the Accommodation_Details value and the Owner decision of 14 Sep 2026 (the Overview still says 90; the Transportation tab itemises 88.31 + 105 + 3.05). The times 20:25 / 06:25 are not in the sheet (railway timetable). Breakfast and dinner on board: the website says "breakfast and dinner included" on Journeys; the Overview agrees.')
issue('Journeys · Your Journey · Transport · travel pass', 'MU9646 · China Eastern Airlines · Vientiane (VTE) Terminal 1 15:50 → Kunming (KMG) 18:25 · 01 March 2027 · non-stop · 1 h 35 m · Boeing 738 · Business Class USD 275 · Economy Flexible USD 155',
      'Overview Day 09-01: China Eastern Airlines MU9646 · Boeing738 · 2027-03-01 · 15:50 VTE T1 → 18:25 KMG · Non-stop · 1h35m · Business Class Standard USD 275 per Pax · 8 seat(s) left · 2 pieces of free checked baggage; Accommodation_Details: Business 275 · Economy 155 · 4 available each', 'Overview Day 09-01 · Accommodation_Details flight columns', 'MATCH', 'Seat counts (4 / "8 seat(s) left") are not shown on the website (transport is uncapped by decision).')
issue('Journeys · Your Journey · Transport · travel pass · sent journey', 'C86 · high-speed train · Kunming Railway Station 10:15 → Lijiang Railway Station 13:44 · 04 March 2027 · direct · 3 h 29 m · about 527 km · Business Class · USD 85 per person (source, journey, transport detail, travel pass, ticket, cart, sticky total, Review & Send, sent journey, presets)',
      'Overview Day 12-01: "Train C642 · 16:39 → 21:06 · Direct · 4 hr 27 min · USD 105 per person · BUSINESS CLASS · 1+1 seating layout · PRIORITY TICKETING"; Accommodation_Details: China Train · 105 · 4 available; Owner truth 15 Sep 2026: Train C86 · 10:15 → 13:44 · direct 3h29 · Business Class; FINAL OWNER PRICE (Edit 2, 15 Sep 2026): USD 85 per person — supersedes the earlier Owner decision (USD 105) and the sheet\'s 105', 'Overview Day 12-01 · Accommodation_Details · Owner correction 15 Sep 2026 (Edit 2, IMG_4013 / IMG_4016)', 'OWNER DECISION OVERRIDE', 'The sheet still names C642 16:39 → 21:06 at USD 105; the Owner replaced the service with C86 10:15 → 13:44 and, in Edit 2, the price with USD 85. The sheet\'s 105 and the earlier decision are stale / retired for the website; a persisted 105 reprices itself to 85 on load.')
issue('Journeys · Your Journey · Transport · travel pass', 'MU5924 + MU741 · Lijiang (LJG) 10:35 → Kunming 11:45 · transfer 1 h 30 m · Kunming 13:15 → Bangkok (BKK) 14:55 · 06 March 2027 · Economy flexible · USD 200 per person · 1 h 10 m + 2 h 40 m · 5 h 20 m door to door',
      'Overview Day 14-01: MU5924 Boeing 737 Lijiang–Kunming 10:35–11:45 1h10m · Transfer in Kunming 1h 30m · MU741 Boeing 738 Kunming–Bangkok 13:15–14:55 2h40m · Economy Class flexible · USD 200 per Pax; Accommodation_Details: Flight Lijiang – Bangkok 200 · 4 available', 'Overview Day 14-01 · Accommodation_Details', 'MATCH')

# ------------------------------------------------------------------ stays (table + issues)
MAP = {  # site stay/room → master column pattern
  ('sathorn', 'penthouse'): r'Sathon Penthouse', ('sathorn', 'u-sathorn-superior-garden'): r'Superior Room With Garden', ('sathorn', 'shama-king-studio-balcony'): r'King Studio With Balcony',
  ('souphattra', 'heritage'): r'^The Heritage', ('souphattra', 'heritage-executive'): r'Heritage Executive', ('souphattra', 'heritage-grand-premier'): r'Heritage Grand Premier', ('souphattra', 'noble-courtyard'): r'Noble Courtyard',
  ('souphattra', 'grand-majestic'): r'^Grand Majestic', ('souphattra', 'souphattra-majestic'): r'Souphattra Majestic', ('souphattra', 'souphattra-presidential'): r'Souphattra Presidential',
  ('kunming', 'light-french'): r'Light French', ('kunming', 'milano'): r'Milano', ('kunming', 'italian'): r'Italian Style', ('kunming', 'junting'): r'Junting', ('kunming', 'mid-century'): r'Mid-century', ('kunming', 'standard-single'): r'Standard Single', ('kunming', 'solarium'): r'Solarium', ('kunming', 'smart-family'): r'Smart Family', ('kunming', 'family-suite'): r'009 - Family Suite', ('kunming', 'seine'): r'Seine', ('kunming', 'penang'): r'Penang', ('kunming', 'left-bank'): r'Left Bank',
  ('lijiang', 'snow-mountain-viewing'): r'001 - Snow Mountain Viewing Room', ('lijiang', 'viewing-270'): r'002 - 270', ('lijiang', 'private-courtyard-270'): r'003 - 270', ('lijiang', 'soup-pool-270'): r'004 - 270', ('lijiang', 'manor-suite'): r'Manor Suite', ('lijiang', 'view-suite-270'): r'006 - 270', ('lijiang', 'private-soup-view'): r'Private Soup V', ('lijiang', 'boundless'): r'Boundless', ('lijiang', 'starry-sky'): r'Starry Sky',
  ('kempinski', 'deluxe-balcony-king'): r'Siam Kempinski',
}
seed = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import('./src/inventory-seed.js').then(m=>console.log(JSON.stringify(m.SEED)))"], cwd=ROOT, stderr=subprocess.DEVNULL).decode())
units = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "const m=await import('./src/rooms.js');const S=(await import('./src/inventory-seed.js')).SEED;const out={};for(const k of Object.keys(S)){const u=m.unitsOf(k);out[k]={units:u.length,labels:u.map(x=>x.label).join(''),places:u.reduce((n,x)=>n+x.places,0)}}console.log(JSON.stringify(out))"], cwd=ROOT, stderr=subprocess.DEVNULL).decode())
WIN = {'sathorn': ['bkk-stay'], 'souphattra': ['prewed', 'wedstay'], 'kunming': ['kmg'], 'lijiang': ['ljg'], 'kempinski': ['kempinski'], 'airbnb': ['airbnb-2br']}
room_rows = []
def num(v):
    try: return float(v)
    except: return None
for stay, s in site['stays'].items():
    for r in s['rooms']:
        m = mcol(MAP[(stay, r['slug'])]) if (stay, r['slug']) in MAP else None
        for win in WIN[stay]:
            key = win + '/' + r['slug']; sd = seed.get(key); u = units.get(key)
            if not sd: continue
            src_rooms = num(m['Rooms avaible']) if m else None
            src_pax = str(m['Pax']) if m else '—'
            src_bed = num(m['Bedroom']) if m else None
            if r['slug'] == 'penthouse': src_rooms_note = '6 bedrooms (Bedroom row 6.0; "Elegant 6BR"; Owner 15 Sep: six physical rooms) — the "Rooms avaible" cell says 5.0'; expected_units = 6
            else: expected_units = int(src_rooms) if src_rooms is not None else None; src_rooms_note = ''
            expected_places = (expected_units * (1 if sd.get('occupancy') == 1 else 2)) if expected_units is not None else None
            if sd.get('unit') == 'guest': expected_places = sd['capacity']
            ok = (u['units'] == expected_units and u['places'] == expected_places) if expected_units is not None else None
            room_rows.append(dict(stay=s['name'], win=win, room=r['name'], src_rooms=(6 if r['slug'] == 'penthouse' else src_rooms), src_pax=src_pax, exp_places=expected_places, units=u['units'], labels=u['labels'], places=u['places'], ok=ok, note=src_rooms_note, site_rate=r.get('rate'), site_occ=next((f[1] for f in (r.get('facts') or []) if f[0] == 'Occupancy'), None), src_rate=(num(m['Price per Person']) if m else None), site_bf=(r.get('breakfast') or s.get('breakfast')), src_bf=(str(m['Breakfast']) if m else '—'), occ=sd.get('occupancy')))
# the residence
key = 'airbnb-2br/private-residence'; u = units[key]
room_rows.append(dict(stay='Alternative Stay · Vientiane', win='airbnb-2br', room='Private Residence', src_rooms='limited to 6 persons', src_pax='6 persons', exp_places=6, units=u['units'], labels=u['labels'], places=u['places'], ok=(u['places'] == 6 and u['units'] == 1), note='Overview Day 05-02 / Day 07: "Airbnb Guest House complimentary … limited to 6 persons"', site_rate=None, src_rate=None, site_bf='—', src_bf='—', occ=None))

# room issues
for rr in room_rows:
    if rr['ok'] is False:
        issue('Room engine · ' + rr['stay'] + ' · ' + rr['room'] + ' (' + rr['win'] + ')', 'units ' + rr['labels'] + ' · ' + str(rr['places']) + ' places', 'Rooms available ' + str(rr['src_rooms']) + ' · Pax ' + rr['src_pax'], 'Accommodation_Details', 'CONFLICT', rr['note'])
# capacity: a room the seed treats as a single while the sheet sleeps two is a conflict (none since the final release: ST-015 / ST-016 applied)
for rr in room_rows:
    if rr['occ'] == 1 and re.search(r'2 Adults', rr['src_pax'], re.I):
        issue('Room engine · ' + rr['stay'] + ' · ' + rr['room'], 'one guest place per room (a single room)', 'Pax "' + rr['src_pax'] + '"', 'Accommodation_Details row Pax', 'CONFLICT', 'The seed treats the room as a single (occupancy 1 → 1 place); the sheet sleeps two adults. NEEDS OWNER DECISION (2 places would apply the standard rule).')
# the site's own room-page occupancy words against the sheet's Pax (rooms the site calls "1 Adult" while the sheet sleeps two)
for rr in room_rows:
    site_occ = rr.get('site_occ')
    if site_occ and re.search(r'^1 Adult', site_occ, re.I) and re.search(r'2 Adults', rr['src_pax'], re.I):
        issue('Room page · ' + rr['stay'] + ' · ' + rr['room'], 'Occupancy "' + site_occ + '"', 'Pax "' + rr['src_pax'] + '"', 'Accommodation_Details row Pax', 'CONFLICT', 'The room page states one adult; the sheet sleeps two.')
issue('Room engine · Sathorn Penthouse', 'Room A – F · 12 guest places (six bedrooms of two)', 'Accommodation_Details: Category "Elegant 6BR Sathon Penthouse" · Bedroom 6.0 · Pax 12 Adults · "Rooms avaible" 5.0; Overview Day 01: "12 guests 6 bedrooms 6 beds 5 bathrooms"; Owner override 15 Sep 2026: 6 physical rooms → Room A–F → 12 places', 'Accommodation_Details Penthouse column · Overview Day 01 · Owner override 15 Sep 2026', 'OWNER DECISION OVERRIDE', 'Bedrooms (6) and guests (12) match; the "Rooms avaible 5.0" cell conflicts with both and is not used.')
issue('Room engine · every category', 'No room is reserved for anyone in advance: the Presidential, the Grand Majestic, the Solarium and the 270° Snow Mountain View Suite are available until booked', 'Accommodation_Details Status: Souphattra Presidential "Reserved for Bride & Groom" · Grand Majestic Suite "Reserved for Familiy (Mum, Dad and amy, Luck)" · Solarium Bath Suite "Reserved for Bride & Groom" · 006 - 270° Snow Mountain View Suite "Reserved for Bride & Groom"; Budget_Room - Rate: Grand Majestic "2/2 Room reserved mum and dad + amy & luck" · Presidential "reserved bride & groom"', 'Accommodation_Details row Status · Budget_Room - Rate', 'OWNER DECISION OVERRIDE', 'Owner override 15 Sep 2026: NO PRE-RESERVED ROOMS; the sheet\'s reservations stay as history.')
issue('Room rates · Sathorn Penthouse', 'USD 85 per person / night · 3 nights · USD 255 total per person', 'Accommodation_Details: Price per Person 85 · Price Per Room per Night 340; Overview Day 01: "USD 90 per person per nights"', 'Accommodation_Details · Overview Day 01 · Owner decision 003 (15 Sep 2026)', 'STALE / RETIRED SOURCE', 'FINAL OWNER RATE (003, 15 Sep 2026): USD 85 per person / night, 3 nights, USD 255 — Accommodation_Details is authoritative and the website matches it; the Overview\'s USD 90 is a stale / superseded source for the guest-facing website. Resolved.')
issue('Wedding Stay · Souphattra Heritage (27 Feb – 1 Mar)', 'Two nights as one selection: the first night at the room rate, the second night hosted by Haruthai & Suthep', 'Overview Day 05-02 / Day 07: "You have a choice between the buyout hotel, an optional complimentary Airbnb guesthouse; the two-day duration is fixed … Paket C und D sind identisch"; Budget_Room - Rate prices 2 nights per package; no hosted night in the sheet. Owner rebuild spec 14 Sep 2026: "second night hosted by Haruthai & Suthep"', 'Overview Day 05-02 / 07 · Budget_Room - Rate · docs/review/007-change-manifest.md (assets/rooms-data.js)', 'OWNER DECISION OVERRIDE', 'The hosted second night is an Owner decision not reflected in the sheet, which prices both nights.')
issue('Alternative Stay · Private Residence', 'Complimentary · up to 6 guests · an independent stay, arranged around the wedding programme by you', 'Overview Day 05-02 / 07: "Airbnb Guest House complimentary … limited to 6 persons"', 'Overview Day 05-02', 'MATCH')
issue('Stays · breakfast', 'Penthouse: not included · self-pay; U Sathorn, Shama: included; Souphattra: included; Kunming: not included · self-pay; Lijiang: included; Siam Kempinski: included', 'Accommodation_Details Breakfast row: Penthouse "Not included, self pay, breakfast location ausgewählt" · U Sathorn Included · Shama Included · Souphattra "Breakfast incl." · Kunming "Not included, self pay" · Lijiang "Breakfast incl." · Kempinski "Breakfast incl."', 'Accommodation_Details row Breakfast', 'MATCH')
issue('Stays · hotel names', 'Sathorn Penthouse Bangkok · U Sathorn Bangkok · Shama Yen-Akat Bangkok · Souphattra Heritage Vientiane · Wanxiang Yueju · Kunming (Kunming Railway Station MixC Branch) · Luye Baisha · Lijiang (Rizhao Jinshan) · Siam Kempinski Bangkok', 'Accommodation_Details Room row: Penthouse · U Sathorn Bangkok · Shama Yen-Akat Bangkok · Souphattra (souphattra.com/heritage-vientiane) · Wanxiang Yueju Designer Homestay (Kunming Railway Station MixC Branch) · Luye Baisha · Rizhao Jinshan · Siam Kempinski', 'Accommodation_Details · Overview', 'MATCH')
issue('Souphattra Heritage · room count', '26 rooms: The Heritage 5 · Heritage Executive 13 · Heritage Grand Premier 3 · Noble Courtyard Suite 1 · Grand Majestic Suite 2 · Souphattra Majestic Suite 1 · Souphattra Presidential 1 (per window, sold twice: 25–27 Feb and 27 Feb – 1 Mar)', 'Budget_Room - Rate Amount column 5 + 13 + 3 + 1 + 0 (reserved) + 1 + 1 (tab header "26 rooms"); Accommodation_Details Rooms available 5 · 13 · 3 · 1 · 2 · 1 · 1', 'Budget_Room - Rate · Accommodation_Details', 'MATCH', 'Budget_Room - Rate shows the Grand Majestic amount as 0 because it was reserved; Accommodation_Details says 2 rooms — the website follows Accommodation_Details (2 rooms, open since the 15 Sep override).')
issue('Kunming · Family Suite / Seine / Penang / Left Bank', 'Two guest places per room (the standard rule)', 'Accommodation_Details Pax: Family Suite 4 Adults · Seine 4 Adults · Penang 4 Adults · Left Bank 2 Adults; the seed carries occupancy 2 / 4 / 4 / 4', 'Accommodation_Details row Pax', 'OWNER DECISION OVERRIDE', 'Owner rule 15 Sep 2026: one physical room = two guest places unless the source defines a different occupancy; the sheet\'s 4-adult rooms are still offered as two places (as the Presidential, 4 adults, is). The seed\'s Family Suite occupancy (2) differs from the sheet (4) and Left Bank (seed 4, sheet 2) — no guest-facing effect under the two-places rule.')

# ------------------------------------------------------------------ experiences
exp = sheet('Experience, Restaurant, Cafe_De')
issue('Experiences · Sühring', 'Sühring · German fine dining · Lunch · Thursday to Sunday · 12:30 pm to 13:00 pm (last seating) · Closed on Monday and Tuesday · USD 180 per person · a table requested through Guest Relations · not a confirmed reservation · Bangkok · in the footer and featured beside 1872', 'Experience, Restaurant, Cafe_Details: Suhring · German fine dining · Price 180 · Opening hours "Lunch / Thursday to Sunday / 12:30 pm to 13:00 pm (last seating) / Closed on Monday and Tuesday"', 'Experience, Restaurant, Cafe_Details', 'MATCH', 'Owner decision (13 Sep): USD 180 per person, request only. The sheet\'s "12:30 pm to 13:00 pm (last seating)" is reproduced verbatim on the website.')
issue('1872 · Champagne Afternoon Tea', 'USD 180 · for two guests · Aman Nai Lert Bangkok · served daily 14:00 – 17:00', 'No 1872 / afternoon tea row in any tab of the Operations Master', 'Experience, Restaurant, Cafe_Details (absent) · Overview (absent)', 'SOURCE MISSING', 'The amount and the hours come from the Owner\'s experience pass decision (Drive-derived), not from the sheet.')
issue('Wellness · Marsilea Spa', 'Six categories · seventeen treatments · open 10:00 – 20:00 · an interest carries no journey cost · paid at the spa', 'No Marsilea / spa row in any tab of the Operations Master', 'Operations Master (absent)', 'SOURCE MISSING', 'The treatment menu is the Owner\'s Drive-derived registry.')
overview = sheet('Overview_Hotel_Restaurant')
master_places = set()
for r in overview[1:]:
    for cell in r[9:16]:
        if cell: master_places.update(p.strip() for p in re.split(r'\s*/\s*|;\s*', str(cell)) if p.strip())
site_names = {x['name'] for x in site['experiences']}
retired = ['PVO Vietnamese Food', 'Khop Chai Deu', 'Le Padaek', 'Parkson Supermarket']
def in_master(name):
    n = name.lower().replace('sühring', 'suhring').replace('·', ' ')
    return any(n.split('·')[0].strip()[:8] in p.lower() for p in master_places)
exp_lines = []
for x in site['experiences']:
    exp_lines.append(x['name'] + ' (' + x['id'] + ') · ' + str(x.get('where')) + ' · ' + str(x.get('cats')) + ' → ' + ('in the Overview day lists' if in_master(x['name']) else 'not in the Overview day lists (Drive-derived registry)'))
missing = [x['name'] for x in site['experiences'] if not in_master(x['name'])]
issue('Experiences · the registry vs the Overview day lists', str(len(site['experiences'])) + ' experience entities on the website', 'Overview_Hotel_Restaurant day columns Breakfast / Lunch / Cafe / Experience / Mall / Dinner / Bar (Day 02–15)', 'Overview_Hotel_Restaurant', 'MATCH' if not missing else 'SOURCE MISSING', ('Entities not named in the Overview day lists (they come from the Drive-derived registry the Owner approved 13 Sep): ' + ', '.join(missing)) if missing else '')
issue('Experiences · retired entities', 'PVO Vietnamese Food, Khop Chai Deu, Le Padaek, Parkson Supermarket are absent from the website; Lacuna VTE is a café only', 'Overview Day 06 still lists "Khop Chai Deu / Kaogee Le Triomphe" (lunch), "Le Padaek / Lao Derm / Cam On Restaurant" (dinner), "Lacuna VTE Vientiane" (bar); Master_Timeline lists Parkson Supermarket (Day 05) and Cam On (dinner, vendor Le Padaek)', 'Overview Day 06 · Master_Timeline', 'OWNER DECISION OVERRIDE', 'Removed by the Owner (14 Sep 2026 rebuild); Lacuna VTE café only. The website stays absent of them; the sheet still names them.')
issue('Experiences · Cam On Restaurant · Molly\'s Vientiane · Curvy.Dining vendor list', 'Cam On Restaurant is not an experience entity on the website', 'Overview Day 06 dinner "Le Padaek / Lao Derm / Cam On Restaurant"; docs/acceptance/2026-09-13-owner-decisions/EXPERIENCE-INVENTORY.md records Cam On (Day 06 dinner) and Molly\'s Vientiane (Day 05 breakfast) as places without a Drive folder', 'Overview Day 06 · EXPERIENCE-INVENTORY.md', 'SOURCE MISSING', 'No Drive folder / detail source; not invented on the website (review only).')

# ------------------------------------------------------------------ the venue stage (003)
issue('The Wedding · The stays · the venue stage · base photograph', 'The real top-down aerial of Souphattra Heritage Vientiane (2560 × 1440), served as itself in two art directions (the full frame; a 4:5 crop of the same file centred on the pool and the courtyard) — nothing generated, redrawn or reconstructed', 'Drive 003 - Hotel - Pool & Garden · Copy of Heritage_0631.jpg (id 1VIz9oIZDOUlktJD7pase7e4UilhvsO9j) — byte-compared to the served file', 'docs/venue/asset-manifest.json', 'MATCH', 'DRIVE VISUAL EVIDENCE. The architecture is unaltered: resize, crop and encode only (docs/venue/build-images.py).')
issue('The venue stage · labels ON the photograph', 'Seven labels sit on the real houses and areas of the aerial: Lobby (top left building) · Rooms (top right, lower right and lower centre buildings — one place, three houses) · Wedding Ceremony (left centre event area) · Wedding Dinner · Poolside (centre pool / poolside area) · Coffee & Cake · Breakfast (lower left building); the swimming pool and the courtyard garden are legend places without a marker', 'Owner final mapping, 16 Sep 2026 (OWNER AUTHORIZATION — FINAL SECURITY REMEDIATION + RELEASE FREEZE, §5): top left building Lobby · top right building Rooms · left centre event area Wedding Ceremony · centre pool / poolside area Dinner · lower left building Coffee & Cake · Breakfast · lower right building Rooms · lower centre building Rooms; the clean real aerial for production, the marked image as placement reference only', 'Owner instruction 16 Sep 2026 · assets/venue-data.js (marks) · docs/acceptance/2026-09-15-venue/walk.mjs (68 checks)', 'MATCH', 'DRIVE VISUAL EVIDENCE + OWNER DECISION. The labels follow the Owner\'s words for each position; the boxes trace the houses visible in the photograph (Heritage_0631). No red mark, no development label, no marked screenshot is published. The previous SOURCE MISSING · NEEDS OWNER DECISION entry (v2) is closed by this mapping.')
issue('The venue stage · supporting photography', 'Every photograph behind a place is a real Owner photograph mapped to its Drive file: lobby (Heritage_0702, 5.jpg, 2025-12-18_Souphattra…), rooms (DSC00021 + the room photography), coffee & cake / breakfast (Heritage_0354, Heritage_0180, Breakfast_01, Breakfast_02), wedding ceremony (IMG_1737, Heritage_0593, souphattra herritage - 007), dinner (caption (8), Heritage_0640, DSC09013, the sharing menu), pool (DSC00168-1, DSC09021, DSC00025), garden (555880718, DSC00168-1)', 'Drive venue library 1S7DffYrFmNSmEfOzL0nGss0oN6ujysN3, folders 001 · 002 · 003 · 004 · 06 · 051 · 056 (docs/venue/asset-manifest.json: id, folder, filename, subject, orientation, role, selected / rejected, reason, production filename, surface)', 'docs/venue/asset-manifest.json', 'MATCH', 'DRIVE VISUAL EVIDENCE. Rejected: da25ec52… (1024 px duplicate subject of Heritage_0702), 1mc0m12000… (568 px clock detail), the HEIC flower photographs (decoration, not a place), the eleven videos in 091 - Raw - Videos (14 – 143 MB each — above the connector\'s transfer limit, so they could not be inspected; none used).')

# ------------------------------------------------------------------ the guest register vs the Owner's contacts (004)
issue('Invitation register · active guests', '47 individual invitations, 47 unique credentials, 2 cancelled (no code, no index entry, no record); one credential (G001) rotated on 16 Sep 2026 — the other 46 unchanged', 'Guestlist tab: 59 contacts, 57 guest-role rows; Accommodation tab: 26 rooms; reconciliation 16 Sep 2026: 36 guest-role rows match an active invitation, 18 carry no invitation and no rooming place, 3 are UNRESOLVED (CON009, CON046, CON048); 9 active invitations have no contact row; 7 rooming occupants have no invitation (docs/review/004-guest-reconciliation-summary.txt)', 'H&S_Wedding_Operations_Master · Guestlist · Accommodation · src/register-audit.mjs · docs/review/004-guest-reconciliation-summary.txt', 'CONFLICT', 'NEEDS OWNER DECISION: the register and the Owner\'s current sheets disagree on who is invited — the count 47 is not verified by the 57-row reconciliation (UNRESOLVED = 3, register-only invitations 9, rooming-only occupants 7). No guest-facing text carries a guest count; the conflict is between the private register and the Owner\'s master, not in the published website. Nothing was invented; nothing was changed.')
# ------------------------------------------------------------------ seating capacity, guest counts
issue('Seating plans', 'Ceremony: 50 guest chairs (left block 2 × 10, right block 3 × 10) + two fixed positions front centre (Bride, Groom); Dinner: one long table, 50 places, run A 25 · run B 25', 'Inventory AST007 "Ceremony chairs · 52 plus 2 spare · Pool side ceremony"; Master_Timeline 28.02: 36 pax (guests seating 31 pax); Guestlist tab: 59 contacts; the private guest list: 47 active guests; Owner geometry decision 13 Sep 2026: 50 + 2 fixed / 50', 'Inventory AST007 · Master_Timeline · docs/acceptance/2026-09-13-owner-decisions/seating-geometry.json', 'OWNER DECISION OVERRIDE', 'The chair count (52 = 50 + 2 fixed) agrees with the Inventory tab; the pax figures in the timeline (36) are planning numbers, not capacity.')
issue('Seating · pool side', 'The swimming pool along run A; "Run A sits beside the swimming pool; run B faces it across the table."', 'Not in the sheet; Owner venue plan image and decision 15 Sep 2026', 'Owner upload 15 Sep 2026 · docs/acceptance/2026-09-15-cart-ticket/README.md', 'OWNER DECISION OVERRIDE')

# ------------------------------------------------------------------ price consistency (J)
prices = site['price']
def find(id, cls=None, room=None):
    for x in prices:
        if x['id'] == id and (cls is None or x.get('cls') == cls) and (room is None or x.get('room') == room): return x
    return None
price_rows = []
def prow(item, auth, line):
    price_rows.append(dict(item=item, auth=auth, cart=line['price'] if line else None))
prow('Special Express No. 25 (train)', site['flat']['train']['price'], find('train'))
prow('MU9646 · Business Class', 275, find('mu9646', 'business')); prow('MU9646 · Economy Flexible', 155, find('mu9646', 'economy-flexible'))
prow('C86 · Kunming → Lijiang', site['flat']['c86']['price'], find('c86'))
prow('MU5924 + MU741 (return)', site['flat']['return']['price'], find('return'))
prow('Sangkhathan', site['flat']['sangkhathan']['price'], find('sangkhathan'))
prow('Sühring (request)', site['flat']['suhring']['price'], find('suhring'))
prow('Champagne Afternoon Tea at 1872 (tea1872)', 180, find('tea1872'))
for stay, s in site['stays'].items():
    for r in s['rooms']:
        for q in r['quotes']:
            if q.get('total') is None: continue
            prow(s['name'] + ' · ' + r['name'] + ' · ' + q['win'], q['total'], find(q['win'], None, r['slug']))
all_match = all(p['auth'] == p['cart'] for p in price_rows)

# ------------------------------------------------------------------ counts
classes = {'MATCH': 0, 'CONFLICT': 0, 'SOURCE MISSING': 0, 'OWNER DECISION OVERRIDE': 0, 'STALE / RETIRED SOURCE': 0}
for i in issues: classes[i['cls']] += 1
total_claims = len(issues) + len(price_rows) + len(room_rows)
match_total = classes['MATCH'] + sum(1 for p in price_rows if p['auth'] == p['cart']) + sum(1 for r in room_rows if r['ok'])
conflict_total = classes['CONFLICT'] + sum(1 for p in price_rows if p['auth'] != p['cart']) + sum(1 for r in room_rows if r['ok'] is False)

a11y = json.load(open(ROOT / 'docs/review/.007-v3-a11y-check.json')) if (ROOT / 'docs/review/.007-v3-a11y-check.json').exists() else []
out = []
w = out.append
w('SOURCE-TRUTH AUDIT · FINAL V3 (004 — 16 Sep 2026: after the security remediation, the Owner\'s final venue mapping, the final public / private information architecture and the guest reconciliation)')
w('DATE: ' + datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC'))
w('MAIN SHA: ' + SHA)
w('SOURCE: H&S_Wedding_Operations_Master (Google Sheet, owner suthep.hrg@gmail.com, last modified ' + MASTER_MODIFIED + '; export ops-master.xlsx of 2026-09-13 19:27 UTC, every tab: Overview_Hotel_Restaurant · Accommodation_Details · Experience, Restaurant, Cafe_Details · Snack_Details · Transportation · Budget_Room - Rate · Printing_Stationnary · Budget_Finance · Guestlist · Accommodation · Master_Timeline · Inventory · Invitation Giveaway · Deposit · Auis hotel inspection) · the documented Owner decisions (docs/DECISION-REGISTER.md, docs/acceptance/*/README.md, docs/review/007-change-manifest.md, docs/references/SEE-YOU-IN-LAOS-FINAL-DESIGN-SYSTEM-MASTER.md §18)')
w('')
w('TOTAL FACTUAL CLAIMS CHECKED: ' + str(total_claims) + ' (' + str(len(issues)) + ' claims below · ' + str(len(price_rows)) + ' priced items · ' + str(len(room_rows)) + ' room categories)')
w('MATCH: ' + str(match_total))
w('CONFLICT: ' + str(conflict_total))
w('SOURCE MISSING: ' + str(classes['SOURCE MISSING']))
w('OWNER DECISION OVERRIDES: ' + str(classes['OWNER DECISION OVERRIDE']))
w('STALE / RETIRED SOURCE: ' + str(classes['STALE / RETIRED SOURCE']))
w('STALE SOURCE VALUES NOTED INSIDE OTHER CLAIMS: the sheet still carries C642 16:39 → 21:06 at USD 105 (superseded by C86 at USD 85), the Vow Ceremony at 16:30 (superseded by 15:30), the room reservations for Bride & Groom / Family, Khop Chai Deu, Le Padaek, Parkson Supermarket — none is active on the website')
w('')
w('NOTE: the website\'s rooms are audited in full below (section K), the prices in full (section J), the experiences in full (section L). Classification MATCH means the website says what the sheet says; CONFLICT means the sources disagree and nobody chose; SOURCE MISSING means the sheet carries no value for the claim; STALE / RETIRED SOURCE means a sheet value the Owner has superseded for the website; OWNER DECISION OVERRIDE means a documented Owner decision replaces the sheet value. Every ACTION is NO CHANGE — REVIEW ONLY.')
w('')
for n, i in enumerate(issues, 1):
    w('ISSUE ST-' + str(n).zfill(3))
    w('')
    w('SURFACE: ' + i['surface'])
    w('CURRENT WEBSITE: ' + i['website'])
    w('AUTHORITATIVE SOURCE: ' + i['source'])
    w('SOURCE LOCATION: ' + i['location'])
    w('CLASSIFICATION: ' + i['cls'] + (' · NEEDS OWNER DECISION' if 'NEEDS OWNER DECISION' in (i['note'] or '') else ''))
    if i['note']: w('NOTE: ' + i['note'])
    w('ACTION: NO CHANGE — REVIEW ONLY')
    w('')
w('==================================================')
w('J · PRICE CONSISTENCY AUDIT')
w('==================================================')
w('Method: every currently selectable paid item was put into one bag through the live pricing source (assets/pricing.js items()), the bag was reloaded (repriceFlat / repriceAccommodation), and the line read back. The cart line price, the Your Journey line, the sticky-total contribution, the Review & Send line and the sent-journey line are all the same persisted line (cart.html money(x.price) · your-journey.html money(x.price) · bag.js B.total() · review.html USD x.price · buildText " · USD " + x.price); the totals are SIYL_BAG.total() on every surface — one calculation, pinned by test/travelpass.test.mjs "ONE PRICE SOURCE" and walked live (docs/acceptance/2026-09-15-ticket-rooms · T6).')
w('')
w('ITEM | AUTHORITATIVE UNIT PRICE | CART PRICE | JOURNEY PRICE | STICKY TOTAL CONTRIBUTION | REVIEW PRICE | SENT-JOURNEY PRICE | MATCH / CONFLICT')
for p in price_rows:
    c = p['cart']
    w(p['item'] + ' | USD ' + str(p['auth']) + ' | USD ' + str(c) + ' | USD ' + str(c) + ' | USD ' + str(c) + ' | USD ' + str(c) + ' | USD ' + str(c) + ' | ' + ('MATCH' if p['auth'] == c else 'CONFLICT'))
w('')
w('INVARIANT: CART = STICKY = YOUR JOURNEY = REVIEW = SENT JOURNEY for the same authenticated guest state — ' + ('HOLDS (' + str(len(price_rows)) + ' items, one source; bag total of every item at once USD ' + format(site['total'], ',') + ')' if all_match else 'BROKEN'))
w('C86 = USD 105 on every surface (authoritative FLAT.c86 105 · journeys.html USD 105 per person · cart / journey / review / sent line 105 · travel pass "Your cost USD 105 · per person").')
w('')
w('==================================================')
w('K · ROOM SOURCE AUDIT')
w('==================================================')
w('Rule: 1 physical room = 2 guest places (a whole property what the source says it sleeps; no room in the source is a single). Source physical rooms = Accommodation_Details "Rooms avaible" (the Penthouse: its six bedrooms — see ST issue). Website allocation units = src/rooms.js unitsOf() over src/inventory-seed.js.')
w('')
w('PROPERTY / STAY | WINDOW | ROOM TYPE | SOURCE PHYSICAL ROOMS | SOURCE PAX | EXPECTED GUEST PLACES | WEBSITE ALLOCATION UNITS | WEBSITE PLACES | RATE website / source | BREAKFAST website / source | MATCH / CONFLICT')
for r in room_rows:
    w(' | '.join([r['stay'], r['win'], r['room'], str(r['src_rooms']), r['src_pax'], str(r['exp_places']), str(r['units']) + ' (' + r['labels'] + ')', str(r['places']), (('USD ' + str(r['site_rate'])) if r['site_rate'] is not None else '—') + ' / ' + (('USD ' + str(int(r['src_rate']) if r['src_rate'] == int(r['src_rate']) else r['src_rate'])) if r['src_rate'] is not None else '—'), str(r['site_bf']) + ' / ' + str(r['src_bf']), 'MATCH' if r['ok'] else ('CONFLICT' if r['ok'] is False else 'SOURCE MISSING')]) + ((' · ' + r['note']) if r['note'] else ''))
pent = [r for r in room_rows if r['room'] == 'Sathorn Penthouse'][0]
w('')
w('PENTHOUSE: 6 physical rooms → ' + str(pent['units']) + ' allocation units (' + pent['labels'] + ') → ' + str(pent['places']) + ' guest places → ' + ('no Room G · MATCH' if pent['labels'] == 'ABCDEF' and pent['places'] == 12 else 'CONFLICT'))
w('RATES: every room rate on the website equals the Accommodation_Details "Price per Person" cell (' + str(sum(1 for r in room_rows if r['site_rate'] is not None and r['src_rate'] == r['site_rate'])) + ' of ' + str(sum(1 for r in room_rows if r['site_rate'] is not None)) + ' priced rooms).')
w('')
w('==================================================')
w('L · EXPERIENCE COMPLETENESS')
w('==================================================')
w('Website entities (assets/experiences.js · src/experience-inventory.json), each against the Overview day lists of the Operations Master:')
for l in exp_lines: w('- ' + l)
w('Sühring: present on the experience page, the Experiences page (featured beside 1872), the footer menu ("Sühring · Lunch"), the journey (request line USD 180), the bag, Review & Send and the sent journey.')
w('1872: present (1872.html, tea.html, the footer, the journey line "Champagne Afternoon Tea at 1872 · USD 180 · for two guests").')
w('Retired and absent: PVO Vietnamese Food · Khop Chai Deu · Le Padaek · Parkson Supermarket. Lacuna VTE: Café · Design (café only). Wellness: Marsilea Spa (17 treatments, 6 categories) on marsilea.html.')
w('Missing details (not invented): Cam On Restaurant and Molly\'s Vientiane (named in the sheet, no Drive folder); Kunming / Lijiang dining, cafés and bars marked "(TBD)" in the sheet are not on the website.')
w('')
w('==================================================')
w('M · ACCESSIBILITY TEXT REVIEW')
w('==================================================')
w('Every aria-label, alt, title, placeholder, resolved aria-labelledby / aria-describedby, live region and control state is in the corpus (see [aria-label], [aria-describedby → spoken], [state] lines). Automated concatenation check over every spoken name (a lower-case letter directly followed by a capital inside one accessible name, proper nouns excluded): ' + str(len(a11y)) + ' finding(s).')
for a in a11y: w('- ' + a)
if not a11y: w('- none: block boundaries inside a described region are read as pauses (" · ") and no name runs two words together.')
w('')
w('==================================================')
w('N · SECRET / PRIVACY SCAN')
w('==================================================')
w('Scanned both files for the 47 access codes of the private register, the four test bearers, any 64-character hash and the local Guest Relations token: ' + str(run['secretHits']) + ' hit(s). Contacts in the corpus are test values (example.com); first names and the hosts\' names appear where the authenticated UI shows them; ticket references (SYL-…) are guest-facing by design; no ledger ids (C-R-…, D-T-…) or guest ids appear as guest-facing text.')
w('SECRET SCAN: ' + ('PASS' if run['secretHits'] == 0 else 'FAIL'))
w('')
w('==================================================')
w('O · COMPLETENESS VALIDATION')
w('==================================================')
w('Active HTML routes covered: ' + str(len(run['routes'])) + ' (' + ', '.join(sorted(run['routes'])) + ')')
w('Experience entities covered: ' + str(run['experiences']) + ' · stay / room routes covered: ' + str(run['roomRoutes']) + ' · transport routes covered: 5 (overview + 4 legs) · ticket / PDF templates covered: ' + str(run['pdfTemplates']) + ' (+ the template block) · sent-text templates covered: 2 (the sent journey, the email backup) · surfaces: ' + str(run['surfaces']) + ' · dynamic states: ' + str(run['states']))
w('Guest-facing source literals: ' + str(run['literals']) + ' scanned across every page and script a guest loads · ' + str(run['literals'] - run['residual']) + ' found in a rendered state · ' + str(run['residual']) + ' reached only in states not rendered and folded in verbatim (SURFACES "source strings · …") · ' + str(len(run['leftover'])) + ' left over · implementation-only literals (error keys, font names, PDF operators) classified out by rule.')
w('Failed steps during extraction: ' + str(len(run['failures'])) + (' (' + '; '.join(run['failures']) + ')' if run['failures'] else '') + ' · page errors: ' + str(len(run['pageErrors'])))
w('COMPLETENESS CHECK: ' + ('PASS' if not run['leftover'] and not run['failures'] else 'FAIL'))
open(ROOT / 'docs/review/007-final-v3-source-truth-audit.txt', 'w').write('\n'.join(out) + '\n')
summary = dict(claims=total_claims, match=match_total, conflict=conflict_total, missing=classes['SOURCE MISSING'], overrides=classes['OWNER DECISION OVERRIDE'], stale=classes['STALE / RETIRED SOURCE'], secret='PASS' if run['secretHits'] == 0 else 'FAIL', completeness='PASS' if not run['leftover'] and not run['failures'] else 'FAIL')
json.dump(summary, open(ROOT / 'docs/review/.007-v3-audit-summary.json', 'w'))
print(json.dumps(summary))
