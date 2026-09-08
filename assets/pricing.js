/* ============================================================================
   SEE YOU IN LAOS — THE SINGLE CALCULATION SOURCE.

   Every amount on every surface is produced here and nowhere else:
   the product page, Add to Your Journey, the Journey Bag, Your Journey,
   Your Costs, the sticky total and Review & Send all read these functions.
   Nothing downstream multiplies, rounds or re-derives an amount.

   Accommodation is priced from the Owner's approved Accommodation_Details:
   a per-person / per-night RATE and the number of NIGHTS in the window.
       total per person = rate × nights
   Transport is priced per person for the leg (a package, not a nightly rate).

   The Wedding Stay (27 February – 1 March) is ONE selection for the fixed
   two-night window: the guest contributes the first night, the second night is
   complimentary and hosted by the Bride & Groom. That is a note inside the one
   item — never a second line and never a USD 0 row.
   ========================================================================== */
(function () {
  'use strict';

  /* per-person amounts for the legs that are not priced by night */
  var FLAT = {
    'train':  { price: 75,  cat: 'Transportation', name: 'Special Express No. 25',
                meta: '24 – 25 February 2027 · First Class Sleeper', img: 'assets/images/transport/train-no25-srt-train.jpg',
                basis: 'USD 75 per person · package · First Class Sleeper, van and border logistics' },
    'mu9632': { price: 275, cat: 'Transportation', name: 'MU9632 · Vientiane → Kunming',
                meta: '01 March 2027 · Business Class', img: 'assets/images/transport/mu9632-business-1.jpg',
                basis: 'USD 275 per person · 1 seat · Business Class' },
    'c642':   { price: 85,  cat: 'Transportation', name: 'C642 · Kunming → Lijiang',
                meta: '04 March 2027 · Business Class', img: 'assets/images/transport/c642-train-snow-mountain.jpg',
                basis: 'USD 85 per person · 1 seat · Business Class · 1+1 seating' },
    'return': { price: 200, cat: 'Transportation', name: 'MU5924 + MU741 · Lijiang → Bangkok',
                meta: '06 March 2027 · Economy flexible', img: 'assets/images/transport/mu5924-economy-cabin-1.jpg',
                basis: 'USD 200 per person · 1 seat · Economy flexible · via Kunming' },
    '1872':   { price: 180, cat: 'Experience', unit: 'experience',
                basis: 'USD 180 per experience · for two guests' }
  };

  function money(n) { return 'USD ' + Number(n).toLocaleString('en-US'); }

  /* which stay and which window an id belongs to. LEGACY holds the two ids the
   * retired two-row wedding model wrote, so an old bag can still be migrated. */
  var LEGACY = { 'wedstay-n1': 'wedstay', 'wedstay-n2': 'wedstay' };
  function locate(windowId) {
    var id = LEGACY[windowId] || windowId;
    var R = window.SIYL_ROOMS || {};
    for (var k in R) {
      var s = R[k];
      for (var i = 0; i < s.windows.length; i++) {
        if (s.windows[i].id === id) return { key: k, stay: s, win: s.windows[i] };
      }
    }
    return null;
  }

  function roomOf(stay, slug) {
    var found = null;
    stay.rooms.forEach(function (r) { if (r.slug === slug) found = r; });
    return found;
  }

  window.SIYL_PRICE = {
    FLAT: FLAT,
    money: money,
    locate: locate,

    /* THE quote for one selectable line — the only place rate × nights happens */
    quote: function (windowId, slug) {
      var f = FLAT[windowId];
      if (f) return { flat: true, cat: f.cat, unit: f.unit || 'guest', total: f.price, basis: f.basis };
      var at = locate(windowId);
      if (!at) return null;
      var room = roomOf(at.stay, slug) || at.stay.rooms[0];
      var nights = at.win.n || 1;
      /* a FIXED window: the room amount already covers the whole window and is
       * never multiplied. Otherwise the guest contributes `pay` of the nights. */
      var fixed = !!at.win.fixed;
      var pay = fixed ? 1 : (at.win.pay || nights);
      var rate = room && room.rate != null ? room.rate : null;
      var q = {
        cat: 'Accommodation',
        unit: 'guest',
        stayKey: at.key,
        stayName: at.stay.name,
        roomName: room ? room.name : '',
        roomSlug: room ? room.slug : '',
        dates: at.win.dates,
        nights: nights,
        pay: pay,
        rate: rate,
        fixed: fixed,
        breakfast: at.stay.breakfast || '',
        note: at.win.note || '',
        noteBy: at.win.noteBy || '',
        total: rate == null ? null : rate * pay
      };
      q.nightly = rate == null || fixed ? '' : money(rate) + ' per person / night';
      q.nightsLine = nights + (nights === 1 ? ' night' : ' nights');
      if (rate == null) {
        q.basis = 'Amount on request · Guest Relations';
      } else if (fixed && q.note) {
        q.basis = money(q.total) + ' per person · fixed two-night window · ' +
                  'first night your contribution, second night complimentary';
      } else if (fixed) {
        q.basis = money(q.total) + ' per person · fixed two-night stay';
      } else {
        q.basis = q.nightly + ' · ' + q.nightsLine + ' · ' + money(q.total) + ' per person';
      }
      return q;
    },

    /* the ONE bag line a selection produces. `put` replaces in place, so a
     * change never duplicates and a stay is never split across two rows. */
    items: function (windowId, slug) {
      var f = FLAT[windowId];
      if (f && f.name) return [{ id: windowId, name: f.name, meta: f.meta, price: f.price, img: f.img }];
      var at = locate(windowId);
      if (!at) return [];
      var room = roomOf(at.stay, slug) || at.stay.rooms[0];
      var img = room && room.gallery && room.gallery.length ? room.gallery[0][0] : at.win.bagImg;
      var q = this.quote(at.win.id, room.slug);
      if (room.interest || q.total == null) {
        var complimentary = at.key === 'airbnb';
        return [{ id: at.win.id, name: at.win.bagName, meta: at.win.dates + ' · ' + (room.status || room.name),
                  interest: !complimentary, complimentary: complimentary,
                  price: complimentary ? 0 : undefined,
                  stay: at.key, room: room.slug, img: img }];
      }
      return [{
        id: at.win.id, name: at.win.bagName, meta: at.win.dates + ' · ' + room.name,
        price: q.total, stay: at.key, room: room.slug,
        rate: q.rate, nights: q.nights, pay: q.pay, fixed: q.fixed,
        note: q.note, noteBy: q.noteBy,
        breakfast: q.breakfast, img: img
      }];
    },

    /* every id a selection of this window writes (used by add / remove / state).
     * The window id itself is always included so a line saved before the hosted
     * split is cleared by the same Remove. */
    ids: function (windowId) {
      var at = locate(windowId);
      if (!at) return [windowId];
      if (at.win.id !== 'wedstay') return [at.win.id];
      return ['wedstay', 'wedstay-n1', 'wedstay-n2'];   /* legacy rows go too */
    },

    /* the most expensive room a guest may actually select — reserved
     * inventory (Bride & Groom, family) is never eligible */
    premium: function (windowId) {
      var at = locate(windowId);
      if (!at) return null;
      var open = at.stay.rooms.filter(function (r) { return !r.reserved && r.rate != null && !r.interest; });
      if (!open.length) return null;
      return open.reduce(function (m, r) { return r.rate > m.rate ? r : m; }, open[0]);
    },

    /* does this product have a genuine alternative to change to? */
    hasVariants: function (windowId) {
      var at = locate(windowId);
      if (!at) return false;
      var sel = at.stay.rooms.filter(function (r) { return !r.reserved; });
      return sel.length > 1;
    },

    /* the window a bag line belongs to (a hosted night points at its window) */
    windowOf: function (id) {
      var at = locate(id);
      return at ? at.win.id : id;
    },

    /* display for one bag line — reads the line, never recalculates it */
    lineBasis: function (x) {
      var f = FLAT[x.id];
      if (f) return f.basis;
      if (x.interest) return 'Interest · confirmed and payable at the spa';
      if (x.fixed && x.note) {
        return money(x.price) + ' per person · fixed two-night window · ' +
               'first night your contribution, second night complimentary';
      }
      if (x.fixed) return money(x.price) + ' per person · fixed two-night stay';
      if (x.rate != null && x.nights) {
        return money(x.rate) + ' per person / night · ' + x.nights + (x.nights === 1 ? ' night' : ' nights') +
               ' · ' + money(x.price) + ' per person';
      }
      return x.price != null ? money(x.price) + ' per person' : '';
    }
  };

  /* ---- migration -------------------------------------------------------
   * A bag saved while the retired two-row wedding model was live holds
   * wedstay-n1 / wedstay-n2. Collapse it to the ONE Wedding Stay line for the
   * same room, so nobody is left with two complimentary rows. */
  (function collapseLegacyWeddingStay() {
    var B = window.SIYL_BAG;
    if (!B || !window.SIYL_ROOMS) return;
    var bag = B.get();
    var legacy = bag.filter(function (x) { return x.id === 'wedstay-n1' || x.id === 'wedstay-n2'; });
    if (!legacy.length) return;
    var slug = legacy[0].room, qty = legacy[0].qty || 1;
    var kept = bag.filter(function (x) { return x.id !== 'wedstay-n1' && x.id !== 'wedstay-n2' && x.id !== 'wedstay'; });
    window.SIYL_PRICE.items('wedstay', slug).forEach(function (it) { it.qty = qty; kept.push(it); });
    B.set(kept);
  })();
})();
