/* ============================================================================
   SEE YOU IN LAOS — THE SINGLE CALCULATION SOURCE.

   Every amount on every surface is produced here and nowhere else:
   the product page, Add to Your Journey, the Journey Bag, Your Journey,
   Your Costs, the sticky total and Review & Send all read these functions.
   Nothing downstream multiplies, rounds or re-derives an amount.

   Accommodation is priced from the Owner's approved Accommodation_Details:
   a per-person / per-night RATE and the number of PAYABLE nights in the window.
       total per person = rate × payable nights
   `n` is how many nights the window covers; `pay` is how many of them the guest
   contributes. They differ in exactly one place — the Wedding Stay.
   Transport is priced per person for the leg (a package, not a nightly rate).

   VIENTIANE, verified against the source on 08 September 2026:
     PRE-WEDDING STAY  25 – 27 FEB      n 2 · pay 2 → rate × 2   (both nights)
     WEDDING STAY      27 FEB – 01 MAR  n 2 · pay 1 → rate × 1   (second night
                                        complimentary, hosted by Bride & Groom)
   The two windows run back to back: 27 February is the transition day and no
   night is uncovered. The Wedding Stay stays ONE selection — the complimentary
   night is a note inside that item, never a second line and never a USD 0 row.
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

  /* "Includes both nights: 25 → 26 February + 26 → 27 February" — the exact
   * nights an amount buys, so "two-night stay" can never be read as one night. */
  function nightsCovered(q) {
    if (!q.nightsList || !q.nightsList.length) return '';
    var all = q.nightsList.join(' + ');
    if (q.hosted > 0) return 'Both nights: ' + all;
    return (q.nightsList.length === 2 ? 'Includes both nights: ' : 'Includes: ') + all;
  }

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
      /* `pay` is how many of the window's nights the guest contributes. It is
       * only ever smaller than `nights` where a night is hosted. */
      var pay = at.win.pay || nights;
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
        hosted: nights - pay,
        rate: rate,
        windowFixed: at.win.window === 'fixed',
        nightsList: at.win.nightsList || null,
        breakfast: at.stay.breakfast || '',
        note: at.win.note || '',
        noteBy: at.win.noteBy || '',
        total: rate == null ? null : rate * pay
      };
      q.nightly = rate == null ? '' : money(rate) + ' per person / night';
      q.nightsLine = nights + (nights === 1 ? ' night' : ' nights');
      /* the unmistakable presentation: the amount, what it covers, and the
       * exact nights it covers — never the bare words "two-night stay" */
      q.amount = q.total == null ? '' : money(q.total);
      q.totalLine = 'Total per person · ' + q.nightsLine;
      q.nightsCovered = nightsCovered(q);
      q.contribution = q.hosted > 0
        ? 'First night your contribution at ' + q.nightly + ' · second night complimentary'
        : (rate == null ? '' : q.nightly + ' × ' + q.nightsLine);
      if (rate == null) {
        q.basis = 'Amount on request · Guest Relations';
      } else {
        q.basis = q.amount + ' total per person · ' + q.nightsLine +
                  (q.nightsCovered ? ' · ' + q.nightsCovered : '') +
                  (q.contribution ? ' · ' + q.contribution : '');
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
        rate: q.rate, nights: q.nights, pay: q.pay,
        nightsList: q.nightsList, windowFixed: q.windowFixed,
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
     * inventory (Bride & Groom, family) is never eligible.
     * `available` is an optional predicate (slug) → boolean: when the shared
     * ledger says a category is gone, the choice falls to the next best one
     * that is still there rather than to a room nobody can have. */
    premium: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var open = at.stay.rooms.filter(function (r) { return !r.reserved && r.rate != null && !r.interest; });
      if (!open.length) return null;
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;      /* the whole stage is sold out */
      return free.reduce(function (m, r) { return r.rate > m.rate ? r : m; }, free[0]);
    },

    /* THE FULL EXPERIENCE CHOICE for one accommodation stage.
     * The Owner's approved room comes first. If the shared ledger says it is
     * gone, the choice falls to the nearest ELIGIBLE and AVAILABLE category by
     * rate — the closest to what was approved, and the gentler of two equals —
     * never to whatever happens to be most expensive, and never to reserved
     * inventory. `available` is the ledger's predicate; without it every
     * eligible room counts as available and the approved room always wins. */
    approved: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var wish = (window.SIYL_FULL_EXPERIENCE || {})[windowId];
      var open = at.stay.rooms.filter(function (r) { return !r.reserved && r.rate != null && !r.interest; });
      if (!open.length) return null;
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;                 /* the stage is sold out */
      var first = null;
      open.forEach(function (r) { if (r.slug === wish) first = r; });
      if (!first) return this.premium(windowId, available);   /* no approved room here */
      for (var i = 0; i < free.length; i++) if (free[i].slug === wish) return free[i];
      /* the approved room is gone — the nearest rate, cheaper side first */
      return free.reduce(function (best, r) {
        var db = Math.abs(best.rate - first.rate), dr = Math.abs(r.rate - first.rate);
        if (dr < db) return r;
        if (dr === db) return r.rate < best.rate ? r : best;
        return best;
      }, free[0]);
    },

    /* THE LOWEST-COST ELIGIBLE ROOM a guest may actually take — the mirror of
     * approved(): same eligibility rules, same ledger predicate, opposite end
     * of the price list. Reserved inventory is never eligible, and a sold-out
     * category is simply skipped. */
    cheapest: function (windowId, available) {
      var at = locate(windowId);
      if (!at) return null;
      var open = at.stay.rooms.filter(function (r) { return !r.reserved && r.rate != null && !r.interest; });
      var free = typeof available === 'function'
        ? open.filter(function (r) { return available(r.slug); })
        : open;
      if (!free.length) return null;
      return free.reduce(function (m, r) { return r.rate < m.rate ? r : m; }, free[0]);
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
      /* a hosted line carries its own COMPLIMENTARY note — it must never also
       * read "Amount on request", which would suggest the price is unknown */
      if (x.complimentary) return '';
      var at = locate(x.id);
      if (at && x.room) {
        var q = this.quote(at.win.id, x.room);
        if (q && q.basis) return q.basis;
      }
      if (x.rate != null && x.nights) {
        return money(x.rate) + ' per person / night · ' + x.nights + (x.nights === 1 ? ' night' : ' nights') +
               ' · ' + money(x.price) + ' per person';
      }
      return x.price != null ? money(x.price) + ' per person' : '';
    }
  };

  /* ---- repricing -------------------------------------------------------
   * A bag saved before the Vientiane price basis was verified against the
   * source holds the pre-wedding window at one night instead of two. Every
   * accommodation line is re-quoted from the data above, so a returning guest
   * never carries a stale amount into Review & Send. */
  (function repriceAccommodation() {
    var B = window.SIYL_BAG;
    if (!B || !window.SIYL_ROOMS) return;
    var bag = B.get(), changed = false;
    var next = bag.map(function (x) {
      if (!x.stay || !x.room || x.interest || x.complimentary) return x;
      var fresh = window.SIYL_PRICE.items(x.id, x.room)[0];
      if (!fresh || fresh.price == null) return x;
      if (x.price === fresh.price && x.pay === fresh.pay && x.name === fresh.name && !('fixed' in x)) return x;
      changed = true;
      fresh.qty = x.qty || 1;           /* the guest's own choice is preserved */
      return fresh;                     /* name, meta, amount and basis are re-derived */
    });
    if (changed) B.set(next);
  })();

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
