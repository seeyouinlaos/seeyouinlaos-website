/* See You In Laos — the journey decision model.
 *
 * Display + decision only. It never calculates a price: every amount on every
 * surface still comes from SIYL_BAG (one calculation truth). What this file adds:
 *   · the chronological arc of the shared journey (Bangkok → … → Bangkok)
 *   · the category and the price basis for each product, so a guest never has to
 *     ask "per person? per night? for two?"
 *   · explicit decisions: a stage is answered when it is selected OR when the
 *     guest says they are not joining that stage. Unanswered is never declined.
 */
(function () {
  'use strict';
  var SKIP = 'siyl.skip';

  /* Chronological stages of the shared journey. `ids` are the bag ids that
   * answer the stage (a stage can be answered by an alternative product). */
  var SEG = [
    { key: 'bkk-stay', when: '21 – 24 FEB', cat: 'Accommodation', place: 'Bangkok',
      label: 'Sathorn Penthouse Bangkok', ids: ['bkk-stay'], anchor: 'j-bkk-stay', bookend: 'open' },
    { key: 'train', when: '24 – 25 FEB', cat: 'Transportation', place: 'Bangkok → Vientiane',
      label: 'Special Express No. 25', ids: ['train'], anchor: 'j-train' },
    { key: 'prewed', when: '25 – 27 FEB', cat: 'Accommodation', place: 'Vientiane',
      label: 'Pre-Wedding Vientiane', ids: ['prewed'], anchor: 'j-prewed' },
    /* ONE wedding stay selection, or the alternative private residence */
    { key: 'wedstay', when: '27 FEB – 01 MAR', cat: 'Accommodation', place: 'Vientiane',
      label: 'Wedding Stay', ids: ['wedstay', 'airbnb-2br'], anchor: 'j-wedstay' },
    { key: 'mu9632', when: '01 MAR', cat: 'Transportation', place: 'Vientiane → Kunming',
      label: 'MU9632', ids: ['mu9632'], anchor: 'j-mu9632' },
    { key: 'kmg', when: '01 – 04 MAR', cat: 'Accommodation', place: 'Kunming',
      label: 'Wanxiang Yueju', ids: ['kmg'], anchor: 'j-kmg' },
    { key: 'c642', when: '04 MAR', cat: 'Transportation', place: 'Kunming → Lijiang',
      label: 'C642', ids: ['c642'], anchor: 'j-c642' },
    { key: 'ljg', when: '04 – 06 MAR', cat: 'Accommodation', place: 'Lijiang',
      label: 'Luye Baisha', ids: ['ljg'], anchor: 'j-ljg' },
    { key: 'return', when: '06 MAR', cat: 'Transportation', place: 'Lijiang → Bangkok',
      label: 'MU5924 + MU741', ids: ['return'], anchor: 'j-return' },
    { key: 'kempinski', when: '06 – 08 MAR', cat: 'Accommodation', place: 'Bangkok',
      label: 'Siam Kempinski Bangkok', ids: ['kempinski'], anchor: 'j-kempinski', bookend: 'close' }
  ];

  /* Chronological position of a line that is not itself a stage. */
  var AT = { '1872': 0.5 };

  function skipped() {
    try { return JSON.parse(localStorage.getItem(SKIP) || '[]'); } catch (e) { return []; }
  }
  function setSkipped(a) {
    localStorage.setItem(SKIP, JSON.stringify(a));
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  window.SIYL_JOURNEY = {
    SEGMENTS: SEG,

    /* display metadata for a bag line — category eyebrow + price basis.
     * The wording comes from SIYL_PRICE: one calculation, one vocabulary. */
    meta: function (x) {
      var P = window.SIYL_PRICE;
      if (x.interest && x.id !== 'airbnb-2br') return { cat: 'Wellness', basis: 'Interest · confirmed and payable at the spa', unit: 'treatment' };
      if (!P) return { cat: '', basis: '', unit: 'guest' };
      var f = P.FLAT[x.id];
      if (f) return { cat: f.cat, basis: f.basis, unit: f.unit || 'guest' };
      var at = P.locate(x.id);
      if (at) return { cat: 'Accommodation', basis: P.lineBasis(x), unit: 'guest' };
      return { cat: '', basis: '', unit: 'guest' };
    },

    /* "USD 85 per person × 2 guests" / "1 experience · for two guests" */
    quantityLine: function (x) {
      var m = this.meta(x), q = x.qty || 1;
      if (x.interest) return '';
      if (x.price == null) return '';
      if (m.unit === 'experience') {
        return q + (q === 1 ? ' experience · for two guests' : ' experiences · for ' + (q * 2) + ' guests');
      }
      return 'USD ' + x.price + ' per person × ' + q + (q === 1 ? ' guest' : ' guests');
    },

    /* the bag reads like an itinerary: chronological position of a line */
    when: function (x) {
      var seg = SEG.filter(function (s) { return s.ids.indexOf(x.id) >= 0; })[0];
      if (seg) return seg.when;
      return x.id === '1872' ? '21 – 24 FEB' : '';
    },
    order: function (x) {
      if (AT[x.id] != null) return AT[x.id];
      for (var i = 0; i < SEG.length; i++) if (SEG[i].ids.indexOf(x.id) >= 0) return i;
      return 99;
    },
    sorted: function (list) {
      var self = this;
      return list.slice().sort(function (a, b) { return self.order(a) - self.order(b); });
    },

    isSkipped: function (key) { return skipped().indexOf(key) >= 0; },
    skip: function (key, on) {
      var a = skipped(), i = a.indexOf(key);
      if (on && i < 0) a.push(key);
      if (!on && i >= 0) a.splice(i, 1);
      setSkipped(a);
    },

    /* answered = selected, or the guest said they are not joining this stage */
    state: function (seg) {
      var has = window.SIYL_BAG && SIYL_BAG.get().some(function (x) { return seg.ids.indexOf(x.id) >= 0; });
      if (has) return 'selected';
      if (this.isSkipped(seg.key)) return 'declined';
      return 'open';
    },
    open: function () {
      var self = this;
      return SEG.filter(function (s) { return self.state(s) === 'open'; });
    },
    /* FULL EXPERIENCE — a MODE, not a gap-filler.
     * Confirming it produces THE canonical premium configuration of all ten
     * stages, whatever the guest arrived from: empty, Cost Saving, a partly
     * decided journey or an all-self-arranged one. There is exactly one Full
     * Experience total. Every stage id the mode controls is cleared first — the
     * complimentary private residence that answers the wedding stage under Cost
     * Saving included — and every "not joining" decision is lifted.
     * Lines that are not stages (1872, a spa interest) are never touched. */
    fullExperience: function () {
      var P = window.SIYL_PRICE, out = [], self = this;
      if (!P) return { remove: [], add: [] };
      SEG.forEach(function (seg) { if (self.isSkipped(seg.key)) self.skip(seg.key, false); });
      /* how many guests this journey is for — the same number the bag carries */
      var qty = 1;
      if (window.SIYL_BAG) {
        SIYL_BAG.get().forEach(function (x) { if (x.qty > qty) qty = x.qty; });
      }
      /* the approved choice, and only if it is still THERE: the shared ledger
       * decides, so Full Experience can never select a sold-out room */
      var free = function (win) {
        return function (slug) {
          var St = window.SIYL_STOCK;
          if (!St || !St.ready()) return true;      /* ledger unread — do not block */
          return St.fits(win, slug, qty);
        };
      };
      this.soldOutStages = [];
      SEG.forEach(function (seg) {
        var id = seg.ids[0];
        if (P.FLAT[id]) { P.items(id).forEach(function (it) { out.push(it); }); return; }
        var room = P.approved(id, free(id));
        if (room) { P.items(id, room.slug).forEach(function (it) { out.push(it); }); return; }
        /* nothing left in this stage at all — say so rather than pretend */
        self.soldOutStages.push(seg);
      });
      return {
        /* every id any stage can be answered by, alternatives included */
        remove: SEG.reduce(function (a, seg) {
          seg.ids.forEach(function (id) { P.ids(id).forEach(function (x) { if (a.indexOf(x) < 0) a.push(x); }); });
          return a;
        }, []),
        add: out
      };
    },

    /* ======================================================================
       COST SAVING EXPERIENCE — the reduced journey, with TWO ways to spend
       the wedding window in Vientiane and nothing else changed between them:

         A · HOTEL          the lowest-priced eligible and AVAILABLE Souphattra
                            category for 27 FEB – 01 MAR. A normal hotel stay
                            inside the wedding programme, with Guest Relations
                            support during the Vientiane wedding stay.
         B · RESIDENCE      the complimentary private residence, USD 0, up to
                            six guests. An independent stay: the wedding
                            programme is included, everything around it is not.

       Both mean the same reduced journey — every other stage is self-arranged.
       Neither is a second Full Experience. The ledger decides availability;
       nothing here invents capacity, and swiping between the two commits
       nothing.
       ====================================================================== */
    costSavingOptions: function (qty) {
      var P = window.SIYL_PRICE, St = window.SIYL_STOCK;
      var guests = Math.max(1, parseInt(qty, 10) || 1);
      var ready = !!(St && St.ready());
      var free = function (win) {
        return function (slug) { return ready ? St.fits(win, slug, guests) : true; };
      };
      var out = [];

      /* A · the cheapest hotel room that is genuinely there */
      var room = P ? P.cheapest('wedstay', free('wedstay')) : null;
      var hotel = {
        key: 'hotel',
        eyebrow: 'Cost Saving · Hotel',
        available: !!room,
        room: room,
        stayName: 'Souphattra Heritage Vientiane',
        dates: '27 February – 01 March 2027',
        note: 'A hotel stay inside the wedding programme, with Guest Relations support during the Vientiane Wedding Stay.',
        service: [
          'Two nights: 27 → 28 February and 28 February → 01 March',
          'First night your contribution · second night complimentary, hosted by the Bride & Groom',
          'Breakfast included',
          'Guest Relations support during the Vientiane Wedding Stay'
        ]
      };
      if (room) {
        var q = P.quote('wedstay', room.slug);
        hotel.name = room.name;
        hotel.amount = P.money(q.total);
        hotel.amountNote = 'per person · 2 nights';
        hotel.items = P.items('wedstay', room.slug);
        hotel.stock = ready ? { win: 'wedstay', slug: room.slug } : null;
      } else {
        hotel.name = 'No room available';
        hotel.amount = 'Sold out';
        hotel.amountNote = 'every eligible category is taken';
        hotel.items = [];
      }
      out.push(hotel);

      /* B · the complimentary residence, if the party still fits */
      var fits = ready ? St.fits('airbnb-2br', 'private-residence', guests) : true;
      out.push({
        key: 'residence',
        eyebrow: 'Cost Saving · Complimentary',
        available: fits,
        name: 'Private Residence',
        stayName: 'Downtown Vientiane',
        dates: '27 February – 01 March 2027',
        amount: 'Complimentary',
        amountNote: fits ? 'USD 0 payable · up to 6 guests' : 'not enough places for your party',
        items: P ? P.items('airbnb-2br', 'private-residence') : [],
        stock: ready ? { win: 'airbnb-2br', slug: 'private-residence' } : null,
        note: 'An independent stay. The wedding programme is yours as it stands; everything around it you arrange yourself.',
        service: [
          'Two nights: 27 → 28 February and 28 February → 01 March',
          'Wedding programme participation included as it stands',
          'Arrival, departure and transfers arranged by you',
          'No individual Guest Relations travel or accommodation support'
        ]
      });
      return out;
    },

    /* the journey Cost Saving produces once an option is chosen */
    costSavingPlan: function (option) {
      return {
        add: (option && option.items) || [],
        remove: SEG.reduce(function (a, s) {
          s.ids.forEach(function (id) {
            (window.SIYL_PRICE ? window.SIYL_PRICE.ids(id) : [id]).forEach(function (x) {
              if (a.indexOf(x) < 0) a.push(x);
            });
          });
          return a;
        }, []),
        selfArranged: SEG.filter(function (s) { return s.key !== 'wedstay'; }).map(function (s) { return s.key; })
      };
    },

    /* stages the guest has said they are arranging themselves */
    selfArranged: function () {
      var self = this;
      return SEG.filter(function (s) { return self.state(s) === 'declined'; });
    },

    /* quiet editorial status line — never a progress meter */
    statusLine: function () {
      var n = this.open().length;
      if (!n) return 'Your journey is complete — every stage has an answer.';
      return n === 1
        ? 'Your journey still needs one decision.'
        : 'Your journey still needs ' + n + ' decisions.';
    }
  };
})();
