# Aman at Sea — Master Reference (PRIMARY)

Rendered-page research, 05 Sep 2026, desktop 1366px + mobile 390px, live at amanatsea.com.
Pages inspected rendered: Home · Voyages index · Voyage detail (Palma de Mallorca to Nice, AG270507) · Destinations region (Mediterranean) · Destinations index · Experiences (Overview / On Shore) · Plan Your Voyage · Amangati Accommodation. Amangati sub-nav (Overview / Accommodation / Dining / Wellness / Marina / Boutique / Deck Plans) observed through the global navigation.

## 1. Global architecture

One product (Amangati, sailing 2027) presented as a five-part world:

- **AMANGATI** (the vessel: Overview · Accommodation · Dining · Wellness · Marina · Boutique · Deck Plans)
- **DESTINATIONS** (regions: Caribbean · Mediterranean · Atlantic Passage → sub-regions like "The French Riviera")
- **VOYAGES** (the bookable itinerary products)
- **EXPERIENCES** (At Sea / On Shore)
- **PLAN YOUR VOYAGE** (the configurator) + **REQUEST A CALL** (the human channel)

Two persistent CTAs everywhere: `Plan your voyage` (self-serve) and `Request a call` (human). Never more.

## 2. Home page rhythm

Kicker in caps → editorial headline → sections in this order:
1. "A PHILOSOPHY IN MOTION / Inaugural Sailings for the 2027 Season" — season framing first.
2. Amangati intro ("Amangati, Sanskrit for 'peaceful motion', presents a matchless experience on the water").
3. DESTINATIONS — one region at a time (Caribbean, Mediterranean) with a single evocative paragraph each + "Discover all destinations".
4. A named signature journey: "Atlantic Passage: A Voyage of Renewal" — a voyage given a narrative title.
5. Shore Experiences teaser.
6. **Featured Voyages** — cards named as ROUTES ("Palma de Mallorca to Nice", "Nice to Marseille"), with `View details` + `Request a quote` per card.
7. Charter section, e-brochure. Sections spaced ~65px rhythm (`my-[65px]`), never crowded.

## 3. Voyage product model (the core lesson)

Voyage detail page anatomy, top to bottom:
- **Route map first** (geographic orientation before anything else).
- Title = route ("Palma de Mallorca to Nice"), then the FACT LINE in one breath:
  `7 May 2027 – 13 May 2027 · 6 nights, 7 ports` — dates, duration, scope in a single metadata line under a small caps voyage name ("BALEARIC ADVENTURE").
- One editorial sentence as an H2 ("Bold brushstrokes of Mediterranean blue extend…").
- Sticky left rail with in-page anchors (Overview/Itinerary) while the content scrolls.
- **Itinerary = Day 1…Day 7**, each day = PORT (H2, "Ibiza, Spain") + one editorial paragraph + **Shore Experience Preview** (one curated tease per day, tagged by category: CULTURAL INSIGHTS / CULINARY JOURNEYS / WELLNESS RITUALS / SCENIC DISCOVERIES) + the quiet upsell line: "Enhance your voyage with optional Shore Experiences. Enquire to learn about additional experiences offered."
- CTAs on the page: `Enquire now`, `Plan your voyage`, `Request E-Brochure` — status/price is NOT on the page; price lives behind Request a quote.

Key structural rule: **DESTINATION → DAY → MOMENT → EXPERIENCE PREVIEW → DETAIL ON REQUEST.** The day is the unit of storytelling; the experience is attached to the day, not to a global catalogue.

## 4. Destination system

Region page = one H1 (Mediterranean) + intro paragraph + sub-region blocks (Mediterranean Spain / The Adriatic, the Greek Islands & Turkey / The French Riviera / The Italian Riviera & Sicily), each a poetic paragraph — **no operational data at this level**. Destination pages sell atmosphere; voyages sell dates. Clean separation of desire (destination) from decision (voyage).

## 5. Experience system

Experiences split ON BOARD vs ON SHORE (context split, not city split). Shore Experiences page: one legendary intro paragraph ("A private audience with a Tuscan count at his family estate…") then SIX CATEGORY blocks, each: small caps category eyebrow (CULINARY / CULTURE / NATURE) → H2 (Culinary Journeys, Cultural Insights, Coastal Interludes, Scenic Discoveries, Wellness Rituals, Active Adventures) → one paragraph. No catalogue of individual experiences at all — individual experiences only appear as previews inside voyage days. Discovery is category-led, delivery is day-led.

## 6. Accommodation system

- Category intro: one paragraph carrying the design story ("draw on the quiet harmony of a Japanese ryokan home… ceilings reach 2.5 metres… private terraces open to the horizon").
- Signature suite first (Aman Suite) with its own hero treatment.
- Then category cards, identical grammar: `SUITE` eyebrow → name → ONE paragraph = size (metric + imperial) + one differentiator + combinability + "Located on Deck(s) N".
- **"All Suites Include"** — one shared inclusion grid in three columns (Suite Features / In-Room Technology / Personalised Services) instead of repeating amenities per card. Per-card copy stays 2–3 lines because the shared layer absorbs the list.

## 7. Plan Your Voyage (the configurator)

A guided wizard, not a dashboard: H1 "Plan Your Voyage" → "**Your voyage, designed around you.**" → one sentence of intent ("Share how long you wish to sail, along with your areas of interest, and we will curate a personalised voyage.") → step controls → `Next >`. One decision per screen; the human fallback (`Request a call`) is always adjacent. Configuration is framed as CURATION, not booking.

## 8. Typography & tone (measured)

- Headings: Lyon serif (lyonRegular), ~31px at desktop for H2, **sentence case** (not uppercase) — softer than Ritz.
- Body: lyonDisplayLight ~14px/20px — small, wide-measure, unhurried.
- Eyebrows: tiny caps (A PHILOSOPHY IN MOTION, FEATURED DESTINATION, CHARTER & EVENTS, SUITE).
- Language: place-forward, sensory, never transactional. Prices absent from narrative surfaces. "Enquire", "Discover", "Curated", "Unhurried" recur.

## 9. Mobile behaviour (390px)

- Hamburger `Menu` opens a full navigation drawer (accordion groups per world: Amangati / Destinations / Experiences).
- A fixed `Request a call` CTA persists.
- Voyage page becomes one column; the day-by-day remains a vertical read (~13k px page height — Aman accepts a LONG page when it is ONE coherent story, days sequential).
- Measured 15px horizontal overflow on the voyage page at 390 — even Aman ships imperfect mobile; our bar is 0.

## 10. What See You In Laos takes from Aman (candidate rules, finalized in the synthesis doc)

1. Journey products carry a **fact line**: dates · nights · stops in one breath under the title.
2. **Day is the storytelling unit**; experiences attach to days/destinations as previews, full detail on request.
3. Category-led experience discovery; no global catalogue page.
4. Accommodation: restrained category cards + ONE shared "All rooms include" layer.
5. Configurator = guided steps framed as personal curation, human contact always adjacent.
6. Exactly two persistent CTAs (self-serve + human).
7. Destination romance separated from operational decision surfaces.
8. Route map opens every journey product.
