/* ============================================================================
   SEE YOU IN LAOS — THE PACKAGES (Owner instruction, 19 Sep 2026).

   Three ways to plan: COMPLETE TRIP (the full hosted journey, all ten stages A–J), ESSENTIAL TRIP (the wedding-focused
   package — its COMPOSITION IS NOT YET DEFINED by the Owner: the Operations Master of 19 Sep 2026 carries no Essential
   package and the earlier website composition was the website's own invention; the slot below is structurally ready and
   is NOT offered as a card until the Owner names its stages) and INDIVIDUAL SELECTION. There is no fourth mode: nothing
   is arranged for anyone in advance.

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
      short: 'The wedding-focused package',
      /* NOT OFFERED (Owner rule: never invent a package's contents). The Owner defines the stages and the chains here — the
         same shape as `complete` — and adds 'essential' to SIYL_PACKAGE_ORDER; nothing else in the product changes. */
      approved: false,
      stages: {}
    }
  };
  /* the order the packages are OFFERED in — only a package whose composition the Owner has defined */
  window.SIYL_PACKAGE_ORDER = ['complete'];
})();
