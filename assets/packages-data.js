/* ============================================================================
   SEE YOU IN LAOS — THE PACKAGES (Owner instruction, 19 Sep 2026).

   Three ways to plan: COMPLETE TRIP (the full hosted journey, all ten stages A–J), ESSENTIAL TRIP (the Vientiane wedding
   accommodation — the Owner's definition of 20 Sep 2026: Package C + D1 of the Operations Master, the Souphattra Heritage
   Vientiane for both Vientiane windows, the Heritage Executive first, then the next compatible category of the SAME house
   in the house's order, and the waiting list when no Souphattra category can take the party — never another house) and
   INDIVIDUAL SELECTION. There is no fourth mode: nothing is arranged for anyone in advance.

   A package is CONFIGURATION, never an inference: for every stage it covers, the DEFAULT product and the DEFINED FALLBACK
   CHAIN — the real products of the Operations Master, in the order they are tried when the default cannot take the guest's
   party. The order is a rule of this file, not of price: the default first, then the other categories of the same house
   from the more affordable neighbour of the default outwards, then the alternative houses of the stage. Price never decides
   eligibility; capacity does — a unit must take the whole party. When no option of the chain can, the stage is WAITLISTED.

   Stage keys are the journey's (assets/journey.js SEGMENTS): A bkk-stay · B train · C prewed · D wedstay · E mu9646 ·
   F kmg · G c86 · H ljg · I return · J kempinski. An entry is a FLAT product id (a transport leg, one product) or an
   ordered list of `window/room` keys of the room engine (src/inventory-seed.js).
   ========================================================================== */
(function () {
  'use strict';
  window.SIYL_PACKAGES = {
    complete: {
      key: 'complete',
      name: 'Complete trip',
      short: 'The whole hosted journey — all ten stages, selected for you',
      stages: {
        'bkk-stay': ['bkk-stay/penthouse', 'bkk-stay/u-sathorn-superior-garden', 'bkk-stay/shama-king-studio-balcony'],
        train: 'train',
        prewed: ['prewed/heritage-grand-premier', 'prewed/heritage-executive', 'prewed/heritage', 'prewed/noble-courtyard', 'prewed/grand-majestic', 'prewed/souphattra-majestic', 'prewed/souphattra-presidential'],
        wedstay: ['wedstay/heritage-grand-premier', 'wedstay/heritage-executive', 'wedstay/heritage', 'wedstay/noble-courtyard', 'wedstay/grand-majestic', 'wedstay/souphattra-majestic', 'wedstay/souphattra-presidential', 'riverside/superior-window', 'guesthouse/guest-house'],
        mu9646: 'mu9646',
        kmg: ['kmg/italian', 'kmg/light-french', 'kmg/milano', 'kmg/mid-century', 'kmg/junting', 'kmg/standard-single', 'kmg/solarium', 'kmg/smart-family', 'kmg/seine', 'kmg/family-suite', 'kmg/penang', 'kmg/left-bank'],
        c86: 'c86',
        ljg: ['ljg/viewing-270', 'ljg/snow-mountain-viewing', 'ljg/soup-pool-270', 'ljg/private-courtyard-270', 'ljg/manor-suite', 'ljg/view-suite-270', 'ljg/private-soup-view', 'ljg/boundless', 'ljg/starry-sky'],
        'return': 'return',
        kempinski: ['kempinski/deluxe-balcony-king']
      }
    },
    essential: {
      key: 'essential',
      name: 'Essential trip',
      short: 'For guests joining us for the wedding in Vientiane — 27 February to 1 March',
      /* THE OWNER'S BOOKING MODEL (20 Sep 2026, the correction): the Overview (002) defines the journey — its stages by letter
         (A · B · C · D …) and, where a stage has alternatives, the alternatives by number (A1 · A2 · A3 are three stays for stage
         A; D1 · D2 · D3 are three stays for stage D, the WEDDING EVENT accommodation). The Accommodation Details (003) are the
         product record only — a Souphattra room category labelled "C + D1" there is USABLE in stages C and D1; the label never
         composes a package. The Essential trip answers one need — "I am coming for the wedding: where do I stay?" — so it covers
         stage D alone: the Wedding Stay, 27 February – 01 March 2027. Its preselection is D1, the Souphattra Heritage, the
         HERITAGE EXECUTIVE (King, 37 – 44 sq.m., 2 adults · 1 child); when that category cannot take the party, the next
         Souphattra category in the house's order; when no Souphattra category can, the WAITING LIST — never a silent move to
         D2 or D3. D2 (the Guest House complimentary) and D3 (the Riverside Hotel) are the guest's own alternatives for the
         same stage, chosen on The Journey. Stage C (the Pre-Wedding Stay) is NOT part of the Essential trip. The amount is the
         chosen room's own (pricing.js: the Wedding window's one payable night, the second hosted — the Executive USD 155). */
      approved: true,
      source: 'H&S_Wedding_Operations_Master · 002_Overview (stage D · Wedding Stay 27.02 – 01.03.2027 · alternatives D1 / D2 / D3) · 003_Accommodation_Details (the Heritage Executive as the product) · the Owner\'s instruction of 20 Sep 2026',
      stages: {
        wedstay: ['wedstay/heritage-executive', 'wedstay/heritage', 'wedstay/heritage-grand-premier', 'wedstay/noble-courtyard', 'wedstay/grand-majestic', 'wedstay/souphattra-majestic', 'wedstay/souphattra-presidential']
      },
      /* the guest's own alternatives for the covered stage (the Overview's D2 · D3) — shown, never applied by the package */
      alternatives: { wedstay: { words: 'Prefer another stay? The Wedding Stay can be changed to the Guest House complimentary or the Riverside Hotel on The Journey.', href: 'journeys.html#j-guesthouse' } }
    }
  };
  /* the order the packages are OFFERED in — only a package whose composition the Owner has defined */
  window.SIYL_PACKAGE_ORDER = ['complete', 'essential'];
})();
