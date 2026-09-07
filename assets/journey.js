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

  /* Price basis per product — the approved commercial model in words, never a
   * second calculation. `unit` names what one line covers. */
  var BASIS = {
    'bkk-stay': { cat: 'Accommodation', basis: 'USD 90 per person / night · 3 nights', unit: 'guest' },
    'train': { cat: 'Transportation', basis: 'Per person · package · private single cabin USD 130', unit: 'guest' },
    'prewed': { cat: 'Accommodation', basis: 'Per person · fixed 2-night window', unit: 'guest' },
    'wedstay': { cat: 'Accommodation', basis: 'Per person · fixed 2-night window · first night your contribution, second night hosted', unit: 'guest' },
    'airbnb-2br': { cat: 'Accommodation', basis: 'Complimentary · limited availability', unit: 'guest' },
    'mu9632': { cat: 'Transportation', basis: 'Per person · 1 seat · Business Class', unit: 'guest' },
    'kmg': { cat: 'Accommodation', basis: 'Per person · fixed 3-night stay', unit: 'guest' },
    'c642': { cat: 'Transportation', basis: 'Per person · 1 seat · Business Class · 1+1 seating', unit: 'guest' },
    'ljg': { cat: 'Accommodation', basis: 'Per person · fixed 2-night window', unit: 'guest' },
    'return': { cat: 'Transportation', basis: 'Per person · 1 seat · Economy flexible · via Kunming', unit: 'guest' },
    'kempinski': { cat: 'Accommodation', basis: 'USD 190 per person / night · 2 nights · breakfast included', unit: 'guest' },
    '1872': { cat: 'Experience', basis: 'Per experience · for two guests', unit: 'experience', when: '21 – 24 FEB', at: 0.5 }
  };

  function skipped() {
    try { return JSON.parse(localStorage.getItem(SKIP) || '[]'); } catch (e) { return []; }
  }
  function setSkipped(a) {
    localStorage.setItem(SKIP, JSON.stringify(a));
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  window.SIYL_JOURNEY = {
    SEGMENTS: SEG,
    BASIS: BASIS,

    /* display metadata for a bag line — category eyebrow + price basis */
    meta: function (x) {
      var b = BASIS[x.id];
      if (b) return b;
      if (x.interest) return { cat: 'Wellness', basis: 'Interest · confirmed and payable at the spa', unit: 'treatment' };
      return { cat: '', basis: '', unit: 'guest' };
    },

    /* "USD 275 per person × 2 guests" / "1 experience · for two guests" */
    quantityLine: function (x) {
      var m = this.meta(x), q = x.qty || 1;
      if (x.interest || x.price == null) return '';
      if (m.unit === 'experience') {
        return q + (q === 1 ? ' experience · for two guests' : ' experiences · for ' + (q * 2) + ' guests');
      }
      return 'USD ' + x.price + ' per person × ' + q + (q === 1 ? ' guest' : ' guests');
    },

    /* the bag reads like an itinerary: chronological position of a line */
    when: function (x) {
      var seg = SEG.filter(function (s) { return s.ids.indexOf(x.id) >= 0; })[0];
      if (seg) return seg.when;
      var b = BASIS[x.id];
      return (b && b.when) || '';
    },
    order: function (x) {
      for (var i = 0; i < SEG.length; i++) if (SEG[i].ids.indexOf(x.id) >= 0) return i;
      var b = BASIS[x.id];
      if (b && typeof b.at === 'number') return b.at;
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
