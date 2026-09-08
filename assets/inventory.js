/* ============================================================================
   SEE YOU IN LAOS — SHARED AVAILABILITY, on the guest side.

   There is ONE stock ledger and it lives on the server (a single Durable
   Object). This file is only its window: it reads remaining counts, shows them
   honestly, refuses to let a guest choose a category that is gone, and asks
   the server — never itself — to make the reservation when the journey is sent.

   Two rules govern every failure:
     · DISPLAY fails open. If the ledger cannot be read the site simply shows no
       counts; it never invents availability and never blocks browsing.
     · RESERVATION fails closed on a real answer. A 409 from the ledger stops
       the send, names the category and shows what is actually left. Only an
       unreachable ledger lets a send through, and then the submission is
       marked so Guest Relations knows to confirm the rooms by hand.

   The bag, the pricing engine and the invitation gate are untouched.
   ========================================================================== */
(function () {
  'use strict';

  /* the GitHub Pages mirror has no backend: both deployments call the Worker,
     so both read and write the same ledger */
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  var API = (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev')
    ? '/api/inventory' : ORIGIN + '/api/inventory';

  var items = null;          /* null until the first successful read */
  var loading = null;
  var lastError = null;

  function invitationId() {
    try {
      var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null');
      return (a && a.invitationId) || '';
    } catch (e) { return ''; }
  }
  function keyOf(win, slug) { return String(win) + '/' + String(slug); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:stock')); } catch (e) {} }

  var S = window.SIYL_STOCK = {
    API: API,

    /* ---- read ---------------------------------------------------------- */
    ready: function () { return items !== null; },
    error: function () { return lastError; },
    all: function () { return items; },

    load: function (force) {
      if (loading && !force) return loading;
      loading = fetch(API, { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d || !d.ok) throw new Error('inventory unavailable');
          items = d.items; lastError = null; announce(); return items;
        })
        .catch(function (e) { lastError = String(e && e.message || e); announce(); return null; })
        .then(function (v) { loading = null; return v; });
      return loading;
    },

    /* a category the ledger does not carry is simply not stock-controlled */
    tracked: function (win, slug) { return !!(items && items[keyOf(win, slug)]); },
    at: function (win, slug) { return items ? items[keyOf(win, slug)] || null : null; },
    remaining: function (win, slug) { var i = this.at(win, slug); return i ? i.remaining : null; },
    soldOut: function (win, slug) { var i = this.at(win, slug); return i ? i.soldOut : false; },

    /* how many units a party of `qty` guests takes out of this category */
    unitsFor: function (win, slug, qty) {
      var i = this.at(win, slug); if (!i) return 0;
      var n = Math.max(1, parseInt(qty, 10) || 1);
      return i.unit === 'guest' ? n : Math.ceil(n / (i.occupancy || 1));
    },
    /* can this party still take this category? */
    fits: function (win, slug, qty) {
      var i = this.at(win, slug);
      if (!i) return true;                       /* not stock-controlled */
      return this.unitsFor(win, slug, qty) <= i.remaining;
    },

    /* ---- the words the guest reads ------------------------------------- */
    label: function (win, slug, qty) {
      var i = this.at(win, slug);
      if (!i) return '';
      if (i.held && i.remaining === 0 && i.allocated === 0) {
        return i.heldFor ? 'Reserved for ' + i.heldFor : 'Reserved';
      }
      if (i.remaining <= 0) return 'Sold out';
      if (!this.fits(win, slug, qty || 1)) {
        var need = this.unitsFor(win, slug, qty || 1);
        return i.unit === 'guest'
          ? 'Only ' + i.remaining + ' of ' + need + ' places left'
          : 'Only ' + i.remaining + ' of ' + need + ' rooms left';
      }
      if (i.unit === 'guest') {
        return i.remaining === 1 ? '1 place remaining' : i.remaining + ' places remaining';
      }
      return i.remaining === 1 ? '1 room remaining' : i.remaining + ' rooms remaining';
    },
    /* the quiet ones stay quiet: a number is only worth saying when it is low */
    scarce: function (win, slug) {
      var i = this.at(win, slug);
      return !!i && i.remaining > 0 && i.remaining <= 3;
    },

    /* ---- write: the server decides, never this file -------------------- */
    linesFromBag: function () {
      var B = window.SIYL_BAG, P = window.SIYL_PRICE;
      if (!B || !P) return [];
      return B.get().map(function (x) {
        var win = P.windowOf(x.id);
        return { win: win, slug: x.room || '', qty: x.qty || 1 };
      }).filter(function (l) { return l.slug; });
    },

    reserve: function () {
      var inv = invitationId();
      if (!inv) return Promise.resolve({ ok: false, unreachable: true, reason: 'no invitation' });
      return fetch(API + '/reserve', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invitationId: inv, lines: this.linesFromBag() })
      }).then(function (r) {
        return r.json().then(function (d) { return { status: r.status, d: d }; });
      }).then(function (res) {
        if (res.d && res.d.items) { items = res.d.items; announce(); }
        if (res.d && res.d.ok) return { ok: true, reserved: res.d.reserved };
        return { ok: false, conflicts: (res.d && res.d.conflicts) || [] };
      }).catch(function (e) {
        /* the ledger is unreachable — do not strand the guest, flag it instead */
        return { ok: false, unreachable: true, reason: String(e && e.message || e) };
      });
    },

    release: function () {
      var inv = invitationId();
      if (!inv) return Promise.resolve({ ok: false });
      return fetch(API + '/release', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invitationId: inv })
      }).then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.items) { items = d.items; announce(); } return d; })
        .catch(function () { return { ok: false }; });
    },

    mine: function () {
      var inv = invitationId();
      if (!inv) return Promise.resolve(null);
      return fetch(API + '/mine?invitationId=' + encodeURIComponent(inv), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { return (d && d.allocation) || null; })
        .catch(function () { return null; });
    }
  };

  S.load();
})();
