/* ============================================================================
   H&S WEDDING 2027 — WHICH BUDGET LINE MEETS WHICH GUEST SERVICE (billing-budget/1.0.0 · Owners, 15 Nov 2026)

   Reviewed integration metadata for the comparison on the Revenue tab — NO amount, NO rate, NO person. The 004 budget
   is free text written by the Owners; these rules say how a line is read, and every reading the comparison makes is
   shown to the Owners next to the figure it produces (src/billing/budget.js). A line no rule reads is listed as a
   budget line without a guest service, under its own 004 category — never dropped, never guessed into a stay.

   STAGES   — the place or route a 002 Package stands for (a label only: the period always comes from 002).
   RULES    — a 004 line (its Category + the words of its Item) → the stage(s) it may belong to; the line's own
              "Date or period" then picks the stage whose 002 window contains it.
                whose:  GUEST_SERVICE — the line buys the guests' rooms or seats;
                        UNSTATED      — the line does not say whose place it is (listed, never compared);
                        BY_SCOPE      — decided by the room-category words of its Details (ROOM_SCOPES): "All
                                        Categories" = every room of the hotel, a named category = that category;
                                        no such words = UNSTATED.
                        A line that NAMES PERSONS (personNamed) is always that person's own place or ticket — the
                        hosts' or their staff's — and never a guest's cost, price or quantity (assumption A-2).
                model:  ROOM_BLOCK — rooms for nights: the cost is the line's Budget USD as stated (all its rooms, booked
                                     or not), never re-priced by the booked rooms, never split per room;
                        FLAT       — one booking (a rented house, a vehicle): its Budget USD as stated, once;
                        PER_UNIT   — Rate USD × the booked tickets or places (one rate per service).
   VENDORS  — a 007 supplier column → the stages it supplies (its contract and payments are shown there, at the level
              of the supplier, never split between stays).
   ========================================================================== */

export const BUDGET_MAP_VERSION = 'budget-map/1.3.0';

export const STAGES = Object.freeze({
  A2: { place: 'U Sathorn Bangkok' },
  B: { place: 'Night train Bangkok → Nong Khai, van to Vientiane', services: ['Train', 'Van'] },
  C: { place: 'Souphattra Heritage Vientiane' },
  D1: { place: 'Souphattra Heritage Vientiane · wedding stay' },
  D2: { place: 'Guest House' },
  E2: { place: 'Flight Vientiane → Kunming' },
  F: { place: 'Yifangju Designer Courtyard, Kunming' },
  G: { place: 'Train Kunming → Lijiang', services: ['Train'] },
  H: { place: 'Luye Baisha, Lijiang' },
  I: { place: 'Flight Lijiang → Bangkok' },
  J: { place: 'Hotel Muse Bangkok' },
});

/* THE CHINA TRIP AND ITS RETURN (Owners' consolidated order, 19 Nov 2026): Kunming and Lijiang travel is not part of the wedding
   budget — the flight there, Kunming, the train, Lijiang, the flight back and the night at Hotel Muse Bangkok on the way home. Their
   bookings, statements and payments stay tracked; their 004 lines and their guest collections are reported apart, never inside the
   wedding project's costs, its variance or the Souphattra's revenue. */
export const CHINA_STAGES = Object.freeze(['E2', 'F', 'G', 'H', 'I', 'J']);

/* THE GUEST SERVICES H&S COLLECTS FOR AND PASSES ON (Owners' consolidated order, 19 Nov 2026) — named one by one: a guest-billed
   service missing here is "not classified" on the console, never assumed to be a pass-through.
     itemId   — the 002 product;   item004 — the words of the 004 Item whose rows record the purchase and its neutralising entry
     (where 004 records it apart from the RULES below);   basis — why it is a pass-through;   confirmed — who said so (null: the
     Owners have not said it yet — shown as "to confirm"). */
export const PASS_THROUGH = Object.freeze([
  { itemId: 'TEMPLE-OFFERING', item004: /^alms\s+giving\b/i, basis: 'what each guest pays for the offering (002) is what H&S pays for it — no contribution to the wedding budget', confirmed: 'the Owners, 19 Nov 2026' },
  { itemId: 'B-TRAIN-BKK-NKI', stage: 'B', basis: 'the guests\' night-train tickets: H&S buys them and the guests pay for them — 004 neutralises the guests\' tickets with its own negative row', confirmed: null },
  { itemId: 'G-TRAIN-KMG-LJG', stage: 'G', basis: 'the guests\' train Kunming → Lijiang: H&S buys the tickets and the guests pay for them', confirmed: null },
]);

export const RULES = Object.freeze([
  { id: 'U-SATHORN', category: 'Accommodation', item: /^u\s*sathorn\b/i, stages: ['A2'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'SOUPHATTRA', category: 'Accommodation', item: /^souphattra\s+heritage\b/i, stages: ['C', 'D1'], whose: 'BY_SCOPE', model: 'ROOM_BLOCK' },
  { id: 'GUEST-HOUSE', category: 'Accommodation', item: /^guest\s*house\b/i, stages: ['D2'], whose: 'GUEST_SERVICE', model: 'FLAT' },
  { id: 'YIFANGJU', category: 'Accommodation', item: /^yifangju\b/i, stages: ['F'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'LUYE-BAISHA', category: 'Accommodation', item: /^luye\s+baisha\b/i, stages: ['H'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'MUSE', category: 'Accommodation', item: /^(hotel\s+)?muse\b/i, stages: ['J'], whose: 'UNSTATED', model: 'ROOM_BLOCK' },
  { id: 'TRAIN-BKK-NKI', category: 'Transportation', item: /^train\s+bangkok\s*-\s*nong\s*kh?ai\b/i, stages: ['B'], service: 'Train', whose: 'GUEST_SERVICE', model: 'PER_UNIT' },
  { id: 'VAN-NKI-VTE', category: 'Transportation', item: /^nong\s*kh?ai\s*-\s*souphattra\b/i, stages: ['B'], service: 'Van', whose: 'GUEST_SERVICE', model: 'FLAT' },
  /* the hotel's car service on the day of the van (B): whether it is the guests' transfer is the Owners' question */
  { id: 'TRANSPORT-SERVICE', category: 'Transportation', item: /^tran?s?portation\s+service\b/i, stages: ['B'], service: 'Van', whose: 'UNSTATED', model: 'FLAT' },
  { id: 'TRAIN-KMG-LJG', category: 'Transportation', item: /^train\s+kunming\s*-\s*lijiang\b/i, stages: ['G'], service: 'Train', whose: 'GUEST_SERVICE', model: 'PER_UNIT' },
  { id: 'FLIGHT-VTE-KMG', category: 'Transportation', item: /^flight\s+vientian\w*\s*-\s*kunming\b/i, stages: ['E2'], whose: 'UNSTATED', model: 'PER_UNIT' },
  { id: 'FLIGHT-LJG-BKK', category: 'Transportation', item: /^flight\s+lijiang\s*-\s*bangkok\b/i, stages: ['I'], whose: 'UNSTATED', model: 'PER_UNIT' },
]);

/* The room-category words of a 004 Details text; the same words matched against the 002 "Name" of each product of the
   stage give the products the line covers (most specific first; the first match decides). */
export const ROOM_SCOPES = Object.freeze([
  { words: /all\s+categor/i, all: true },
  { words: /heritage\s+grand\s+premier/i },
  { words: /heritage\s+executive/i },
  { words: /noble\s+courtyard/i },
  { words: /grand\s+majestic/i },
  { words: /souphattra\s+majestic/i },
  { words: /souphattra\s+presiden/i },
  { words: /\bthe\s+heritage\b/i },
]);

export const VENDORS = Object.freeze([
  /* coversAll (Owners, 17 Nov 2026): the 007 total is the supplier's whole contract for these stays — "26 rooms, 54 contracted room
     nights, USD 150 per room night, total USD 8,100". Since the Owners' order of 18 Nov 2026 the forecast no longer takes it in place
     of the 004 lines: it adds what the bookings cost at this hotel (the agreement, additional room nights, the additional-person
     charge) and 004 does not hold yet — 004's own rows stay as written (src/billing/finance-report.js · hotelPurchaseOf) */
  { vendor: /^souphattra\s+heritage\b/i, stages: ['C', 'D1'], coversAll: 'the hotel agreement: 26 rooms, 54 room nights, USD 150 per room night, USD 8,100 (Owners, 17 Nov 2026)',
    /* the rooms that agreement buys, at its rate per room night: every room of the wedding stay (D1, 27.02–01.03) and the
       Presidential suite of 25–27.02 — the rate list's hotel cost per room comes from here, nowhere else */
    roomContract: { ratePerRoomNight: 150, rooms: { D1: '*', C: ['C-SOUPHATTRA-PRESIDENTIAL'] },
      /* what the agreement buys, as it states it: the room plan is checked against it (a different count is named, never adjusted) */
      agreement: { rooms: { D1: 26, C: 1 }, roomNights: 54, total: 8100 },
      /* EVERY OTHER ROOM NIGHT AT THIS HOTEL (Owners, 18 Nov 2026): an earlier arrival, an extended stay or a room for a newly confirmed
         guest is charged apart, at the confirmed hotel purchase rate of USD 150 per room per night — a PURCHASE price (what the hotel
         charges H&S), never a guest's selling price */
      additional: { ratePerRoomNight: 150, source: 'the Owners, 18 Nov 2026: additional room nights outside the agreement at USD 150 per room per night (earlier arrivals, extended stays, additional rooms; the additional rooms of 25–27.02 quoted at USD 150)' },
      /* THE HOTEL'S ADDITIONAL-PERSON CHARGE (Owners, 18 Nov 2026, confirming the agreement's room policy of 31 Aug 2026): USD 60 per room
         per night for a third person in the room — a purchase cost, kept apart from the extra occupant's own selling price (009) */
      supplement: { perRoomNight: 60, confirmed: true, when: 'a third person (an extra bed) in the room', source: 'the Owners, 18 Nov 2026, confirming the agreement of 31 Aug 2026: additional-person charge USD 60 per room per night' },
      agreementDates: 'The hotel agreement (31 Aug 2026) writes check-out "29/02/2027", a date 2027 does not have; the bookings say 01.03.2027.' } },
  { vendor: /^u\s*sathorn\b/i, stages: ['A2'] },
  { vendor: /^yifangju\b/i, stages: ['F'] },
  { vendor: /^luye\s+baisha\b/i, stages: ['H'] },
]);

/* words that end an Item after a comma without naming a person ("…, guests") */
const NOT_A_PERSON = /^(guests?|all|group|everyone|shared|total)$/i;

/** The persons a 004 line names (assumption A-2): "Item, Name" / "Item ,Name", or Details "(A & B…)" / "(A + B)".
    Returns their names as written (to be compared at run time with the billed guests' first names) — or [] . */
export function personNamed(line) {
  const out = [];
  const tail = /,\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'-]*)\s*$/.exec(String(line && line.item || ''));
  if (tail && !NOT_A_PERSON.test(tail[1])) out.push(tail[1]);
  const paren = /\(([^()]*[&+][^()]*)\)/.exec(String(line && line.details || ''));
  if (paren) for (const w of paren[1].split(/[&+,]/)) { const n = w.trim().split(/\s+/)[0]; if (n && /^[A-Za-zÀ-ÿ]/.test(n) && !/^\d/.test(n) && !NOT_A_PERSON.test(n) && !/^nights?$/i.test(n)) out.push(n); }
  return out;
}

/** The scope a 004 Details text names: { all: true } | { words } | null. */
export function roomScopeOf(details) {
  const d = String(details || '');
  return ROOM_SCOPES.find((s) => s.words.test(d)) || null;
}

/* WHICH 004 CATEGORY A 007 SUPPLIER SERVES (Owners' review, 18 Nov 2026): 007 names suppliers, 004 plans by category — this table
   only places each 007 column beside the 004 category of the lines it pays (read from 004's own Vendor / Item / Category); a
   supplier no entry names stays "Unassigned" in the report, never dropped and never guessed. */
export const SUPPLIER_CATEGORY = Object.freeze([
  { vendor: /^souphattra\s+heritage\b/i, category: 'Accommodation', lines: '004 Souphattra Heritage room lines' },
  { vendor: /^u\s*sathorn\b/i, category: 'Accommodation', lines: '004 U Sathorn Bangkok' },
  { vendor: /^yifangju\b/i, category: 'Accommodation', lines: '004 Yifangju Designer Courtyard' },
  { vendor: /^luye\s+baisha\b/i, category: 'Accommodation', lines: '004 Luye Baisha' },
  { vendor: /^sky\s+bakery\b/i, category: 'Food & Beverage', lines: '004 Wedding Cake (Sky Bakery)' },
  { vendor: /^prompt\s*interprint\b/i, category: 'Guest Experience', lines: '004 Paper Bag (Promptinterprint)' },
  { vendor: /^tops\s+supermarket\b/i, category: 'Guest Experience', lines: '004 Snack lines' },
  { vendor: /^your\s+smile\b/i, category: 'Photography & Video', lines: '004 Photography B / Videography (Your Smile)' },
  { vendor: /^vinz\b/i, category: 'Photography & Video', lines: '004 Photography A (Vinz BKK)' },
  { vendor: /^sammy\b/i, category: 'Miscellaneous', lines: '004 Hair and Make-up' },
  { vendor: /^bloom\s+and\s+bite\b/i, category: 'Flower & Decoration', lines: '004 Ceremony Decoration and Flowers (Bloom and Bite)' },
  { vendor: /^canva\s+stand\b/i, category: 'Flower & Decoration', lines: '004 Art Display Stand / Canvas (signage)' },
]);

/* THE INTERNAL REPORTING REFERENCE RATES (Owners, 18 Nov 2026): 1 USD = 33.68 THB, 1 USD = 0.89 EUR. Used only to show a USD
   equivalent BESIDE an amount kept in its own currency — labelled as a reference conversion, never the rate a transaction was made
   at, never written back. A statement keeps the rate it was issued with (011). */
export const REPORTING_FX = Object.freeze({ USD_THB: 33.68, USD_EUR: 0.89, source: 'the Owners\' approved internal reporting reference rates (18 Nov 2026): 1 USD = 33.68 THB · 1 USD = 0.89 EUR' });
