/* ============================================================================
   TEST ONLY — A STAND-IN FOR THE SERVER CATALOGUE (GET /api/billing/catalogue).

   In production the amounts come from the server Billing Engine through
   assets/billing-client.js (window.SIYL_BILLING). The page sandbox has no
   server, so this module answers in its place with the SAME API and the same
   answer shape — per website product key, for the signed-in guest:

     · the keys of 002 · Site_Product_Key, with their Billing_Category
       (the Operations Master of 5 Oct 2026);
     · block A standard amounts = the former formula (rate × the nights the
       guest pays) — the numbers the server produces from the same 002 rates;
     · block B (the guest books / pays it themselves): total 0, no figure;
     · the Guest House: hosted, 0;
     · the two DRAFT Presidential keys: no amount (manual review) unless a
       Named Special Rate names the guest — the couple (a hosts session) have
       theirs, USD 75 per person per night (the gate's reference case);
     · a Named Special Rate: the arrangement the test seeds for the signed-in
       guest (siyl.gifts, the shape of src/gifts.js) stands for its 009 row.

   The test controls it through window.__billing ({ state, quotes }) — state
   'ready' | 'pending' | 'failed'; quotes overrides per key (null = the key is
   not in the catalogue); anyone — answer without a session (a catalogue test
   that loads no invitation) — and window.__billingAnswer(state) delivers the
   answer later, exactly as the client's siyl:billing-ready / -failed does.
   ========================================================================== */
(function () {
  'use strict';
  var CATALOGUE = {
    'bkk-stay/u-sathorn-superior-garden': 'S', train: 'S',
    'prewed/heritage': 'S', 'prewed/heritage-executive': 'S', 'prewed/heritage-grand-premier': 'S', 'prewed/souphattra-presidential': 'D',
    'wedstay/heritage': 'S', 'wedstay/heritage-executive': 'S', 'wedstay/heritage-grand-premier': 'S', 'wedstay/noble-courtyard': 'S',
    'wedstay/grand-majestic': 'S', 'wedstay/souphattra-majestic': 'S', 'wedstay/souphattra-presidential': 'D',
    sangkhathan: 'S', 'guesthouse/guest-house': 'H', mu9646: 'B:GUEST_SELF_BOOKING',
    'kmg/elegant-residence': 'B:GUEST_SELF_PAYMENT', 'kmg/jinri-terrace-double': 'B:GUEST_SELF_PAYMENT', 'kmg/jinri-family-suite': 'B:GUEST_SELF_PAYMENT',
    c86: 'S', 'ljg/snow-mountain-viewing': 'B:GUEST_SELF_PAYMENT', 'ljg/view-suite-270': 'B:GUEST_SELF_PAYMENT', 'ljg/private-soup-view': 'B:GUEST_SELF_PAYMENT',
    'return': 'B:GUEST_SELF_BOOKING', 'kempinski/jatu-room': 'B:GUEST_SELF_PAYMENT'
  };
  var ctl = window.__billing || (window.__billing = { state: 'ready', quotes: {} });
  if (!ctl.quotes) ctl.quotes = {};
  function auth() { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return a && a.bearer ? a : null; } catch (e) { return null; } }
  function arrangements() {
    var a = auth(); if (!a) return [];
    try { var c = JSON.parse(localStorage.getItem('siyl.gifts') || 'null'); return c && c.guestId === a.guestId && Array.isArray(c.gifts) ? c.gifts : []; } catch (e) { return []; }
  }
  function cents(n) { return Math.round(Number(n) * 100 + 1e-7) / 100; }
  function answer(key) {
    if (Object.prototype.hasOwnProperty.call(ctl.quotes, key)) return ctl.quotes[key];
    var kind = CATALOGUE[key], P = window.SIYL_PRICE;
    if (!kind || !P) return null;
    if (kind.indexOf('B:') === 0) return { total: 0, block: 'B', rateSource: kind.slice(2), hosted: false, ratePerNight: null };
    if (kind === 'H') return { total: 0, block: 'A', rateSource: 'HOSTED', hosted: true, ratePerNight: null };
    var parts = key.split('/'), id = parts[0], slug = parts[1];
    if (slug) {
      var g = arrangements().filter(function (x) { return x && x.window === id && x.room === slug; })[0];
      if (g && (g.kind || 'gift') === 'gift') return { total: 0, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 0 };
      if (g && typeof g.charge === 'number') return { total: cents(g.charge), block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: null };
      /* the couple's own Named Special Rate for the Presidential (009 · the gate's reference case: USD 75 per person per night —
         USD 150 for the two Package C nights; the one payable Wedding Stay night at the same rate) */
      var a = auth(), at0 = kind === 'D' && a && a.hosts === true ? P.locate(id) : null;
      if (at0) return { total: cents(75 * (at0.win.pay || at0.win.n || 1)), block: 'A', rateSource: 'SPECIAL_RATE', hosted: false, ratePerNight: 75 };
      if (kind === 'D') return { total: null, block: null, rateSource: null, hosted: false, ratePerNight: null, manualReview: 'item is not ACTIVE and no approved special rate names this person' };
      var at = P.locate(id), room = at ? at.stay.rooms.filter(function (r) { return r.slug === slug; })[0] : null;
      if (!at || !room) return null;
      var rate = P.rateOf(at.win.id, room), pay = at.win.pay || at.win.n || 1;
      return { total: rate == null ? null : cents(rate * pay), block: 'A', rateSource: 'STANDARD_RATE', hosted: false, ratePerNight: rate };
    }
    var list = P.classesOf ? P.classesOf(id) : [], f = P.FLAT[id];
    var price = list.length ? list[0].price : f ? f.price : null;
    return { total: price, block: 'A', rateSource: 'STANDARD_RATE', hosted: false, ratePerNight: null };
  }
  window.SIYL_BILLING = {
    quoteFor: function (key) { return this.ready() ? (answer(String(key || '')) || null) : null; },
    quoteOf: function (windowId, slug) { return this.quoteFor(String(windowId || '') + '/' + String(slug || '')); },
    /* the real client answers only a signed-in guest; a catalogue test with no session at all sets `anyone` */
    ready: function () { return ctl.state === 'ready' && (!!ctl.anyone || !!auth()); },
    failed: function () { return !this.ready() && (ctl.state === 'failed' || (!ctl.anyone && !auth())); },
    load: function () { return Promise.resolve(null); },
    reload: function () { return Promise.resolve(null); },
    live: function () { return this.ready() && ctl.live !== false; },
    /* the server's fresh check before a send (the real route: /api/billing/validate): each line the catalogue prices is
       compared with its amount; ctl.validate = 'unavailable' answers as a server that cannot be reached */
    validate: function (lines) {
      ctl.validated = (ctl.validated || 0) + 1;
      if (ctl.validate === 'unavailable' || ctl.state !== 'ready' || !auth()) return Promise.resolve({ ok: false, error: 'unavailable' });
      var mism = [];
      (Array.isArray(lines) ? lines : []).forEach(function (l) {
        if (!l || l.interest) return;
        var key = l.room ? l.id + '/' + l.room : l.id, q = answer(key);
        if (!q || q.block === 'B') return;
        var sent = l.price == null || !isFinite(Number(l.price)) ? null : Math.round(Number(l.price) * 100);
        var srv = q.total == null ? null : Math.round(Number(q.total) * 100);
        if (sent !== srv) mism.push({ key: key, sent: l.price == null ? null : l.price, server: q.total });
      });
      return Promise.resolve({ ok: true, valid: !mism.length, mismatches: mism, checked: 0 });
    },
    STUB: true
  };
  /* the server's answer arrives (or cannot), later — as the real client announces it */
  window.__billingAnswer = function (state) {
    ctl.state = state || 'ready';
    try { document.dispatchEvent(new CustomEvent(ctl.state === 'ready' ? 'siyl:billing-ready' : 'siyl:billing-failed')); } catch (e) {}
  };
})();
