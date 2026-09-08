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

   The Wedding Stay (27 February – 1 March) is HOSTED: the guest keeps the room
   category and sees its normal value, and pays nothing for either night.
   ========================================================================== */
(function () {
  'use strict';

  /* per-person amounts for the legs that are not priced by night */
  var FLAT = {
    'train':  { price: 75,  cat: 'Transportation',
                basis: 'USD 75 per person · package · First Class Sleeper, van and border logistics' },
    'mu9632': { price: 275, cat: 'Transportation', basis: 'USD 275 per person · 1 seat · Business Class' },
    'c642':   { price: 85,  cat: 'Transportation', basis: 'USD 85 per person · 1 seat · Business Class · 1+1 seating' },
    'return': { price: 200, cat: 'Transportation', basis: 'USD 200 per person · 1 seat · Economy flexible · via Kunming' },
    '1872':   { price: 180, cat: 'Experience', unit: 'experience',
                basis: 'USD 180 per experience · for two guests' }
  };

  function money(n) { return 'USD ' + Number(n).toLocaleString('en-US'); }

  /* which stay and which window an id belongs to (hosted night ids included) */
  function locate(windowId) {
    var R = window.SIYL_ROOMS || {};
    for (var k in R) {
      var s = R[k];
      for (var i = 0; i < s.windows.length; i++) {
        var w = s.windows[i];
        if (w.id === windowId) return { key: k, stay: s, win: w, night: null };
        if (w.hosted) {
          for (var j = 0; j < w.hosted.length; j++) {
            if (w.hosted[j].id === windowId) return { key: k, stay: s, win: w, night: w.hosted[j] };
          }
        }
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
      var hosted = !!at.night;
      var nights = hosted ? 1 : (at.win.n || 1);
      var rate = room && room.rate != null ? room.rate : null;
      var q = {
        cat: 'Accommodation',
        unit: 'guest',
        stayKey: at.key,
        stayName: at.stay.name,
        roomName: room ? room.name : '',
        roomSlug: room ? room.slug : '',
        dates: at.night ? at.night.dates : at.win.dates,
        when: at.night ? at.night.when : null,
        nights: nights,
        rate: rate,
        breakfast: at.stay.breakfast || '',
        hosted: hosted,
        hostedNote: at.night ? at.night.note : '',
        total: hosted ? 0 : (rate == null ? null : rate * nights)
      };
      q.nightly = rate == null ? '' : money(rate) + ' per person / night';
      q.nightsLine = nights + (nights === 1 ? ' night' : ' nights');
      if (rate == null) {
        q.basis = 'Amount on request · Guest Relations';
      } else if (hosted) {
        /* the value is shown so the hospitality is understood — never charged */
        q.basis = 'Room value ' + q.nightly + ' · your cost complimentary';
      } else {
        q.basis = q.nightly + ' · ' + q.nightsLine + ' · ' + money(q.total) + ' per person';
      }
      return q;
    },

    /* the bag line(s) a selection produces — one for a paid window, two for the
     * hosted wedding stay. `put` replaces in place, so a change never duplicates. */
    items: function (windowId, slug) {
      var at = locate(windowId);
      if (!at) return [];
      var room = roomOf(at.stay, slug) || at.stay.rooms[0];
      var img = room && room.gallery && room.gallery.length ? room.gallery[0][0] : at.win.bagImg;
      if (at.win.hosted) {
        return at.win.hosted.map(function (n) {
          var q = this.quote(n.id, room.slug);
          return {
            id: n.id, name: n.bagName, meta: n.dates + ' · ' + room.name,
            price: 0, hosted: true, hostedNote: n.note,
            stay: at.key, room: room.slug, rate: q.rate, nights: 1,
            breakfast: at.stay.breakfast || '', img: img
          };
        }, this);
      }
      var q = this.quote(at.win.id, room.slug);
      if (room.interest || q.total == null) {
        return [{ id: at.win.id, name: at.win.bagName, meta: at.win.dates + ' · ' + (room.status || room.name),
                  interest: true, stay: at.key, room: room.slug, img: img }];
      }
      return [{
        id: at.win.id, name: at.win.bagName, meta: at.win.dates + ' · ' + room.name,
        price: q.total, stay: at.key, room: room.slug,
        rate: q.rate, nights: q.nights, breakfast: q.breakfast, img: img
      }];
    },

    /* every id a selection of this window writes (used by add / remove / state).
     * The window id itself is always included so a line saved before the hosted
     * split is cleared by the same Remove. */
    ids: function (windowId) {
      var at = locate(windowId);
      if (!at) return [windowId];
      if (!at.win.hosted) return [at.win.id];
      return at.win.hosted.map(function (n) { return n.id; }).concat([at.win.id]);
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
      if (x.hosted) {
        return (x.rate != null ? 'Room value ' + money(x.rate) + ' per person / night · ' : '') + 'your cost complimentary';
      }
      if (x.rate != null && x.nights) {
        return money(x.rate) + ' per person / night · ' + x.nights + (x.nights === 1 ? ' night' : ' nights') +
               ' · ' + money(x.price) + ' per person';
      }
      return x.price != null ? money(x.price) + ' per person' : '';
    }
  };
})();
