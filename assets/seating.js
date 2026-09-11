/* ============================================================================
   SEE YOU IN LAOS — YOUR SEATS, on the guest side (G).

   The seating ledger lives on the server (one Durable Object with two
   inventories, CEREMONY and DINNER). This file is its window and its
   drawing hand: it reads the floor plan and every chair's state, draws the
   ceremony rows and the long table from that configuration — never from a
   plan of its own — and asks the server, never itself, to hold a chair.

   States, in words and never by colour alone:
     AVAILABLE · SELECTED BY YOU · YOUR PARTY · RESERVED — FAMILY · TAKEN
   Bride & Groom are two fixed central positions at the dinner table — part of
   the 50 people, never guest inventory, never selectable.

   Until Guest Relations has configured the geometry and opened seating, the
   guest sees SEATING NOT OPEN YET, and this file draws nothing.
   ========================================================================== */
(function () {
  'use strict';
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  var API = (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev') ? '/api/seating' : ORIGIN + '/api/seating';

  var view = null, loading = null, lastError = null;
  function invitationId() {
    try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return (a && a.invitationId) || ''; } catch (e) { return ''; }
  }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:seats')); } catch (e) {} }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  var S = window.SIYL_SEATS = {
    API: API,
    ready: function () { return view !== null; },
    error: function () { return lastError; },
    view: function () { return view; },
    open: function () { return !!(view && view.open); },
    frozen: function () { return !!(view && view.frozen); },
    configured: function (event) { return !!(view && view.configured && view.configured[event]); },
    /* { ceremony: { guestId: seatId }, dinner: { … } } */
    mine: function () { return view ? view.mine : { ceremony: {}, dinner: {} }; },
    seatOf: function (event, guestId) { return view && view.mine && view.mine[event] ? (view.mine[event][guestId] || null) : null; },

    load: function (force) {
      if (loading && !force) return loading;
      var inv = invitationId();
      loading = fetch(API + '?invitation=' + encodeURIComponent(inv), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok) throw new Error('seating unavailable'); view = d; lastError = null; announce(); return d; })
        .catch(function (e) { lastError = String(e && e.message || e); announce(); return null; })
        .then(function (v) { loading = null; return v; });
      return loading;
    },
    /* hold a chair for a named guest — the server decides, atomically */
    select: function (event, seatId, guestId) {
      var inv = invitationId();
      return fetch(API + '/select', { method: 'POST', headers: { 'content-type': 'application/json', 'x-invitation': inv },
        body: JSON.stringify({ invitationId: inv, guestId: guestId, event: event, seatId: seatId }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.configured) { view = d; announce(); } else S.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    release: function (event, guestId) {
      var inv = invitationId();
      return fetch(API + '/release', { method: 'POST', headers: { 'content-type': 'application/json', 'x-invitation': inv },
        body: JSON.stringify({ invitationId: inv, guestId: guestId, event: event }) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.configured) { view = d; announce(); } else S.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },

    /* ---------------------------------------------------------- drawing
     * Pure: geometry + states in, SVG out. Nothing here invents a chair:
     * rows and positions come from the configuration exactly as given. */
    STATES: { available: 'Available', yours: 'Selected by you', party: 'Your party', family: 'Reserved · family', taken: 'Taken' },
    /* a chair, in words: the code stays the operational id */
    describe: function (seatId) {
      var m = /^C-([LR])-(\d+)-(\d+)$/.exec(seatId || '');
      if (m) return (m[1] === 'L' ? 'Left' : 'Right') + ' side · row ' + Number(m[2]) + ' · chair ' + Number(m[3]);
      var d = /^D-([TB])-(\d+)$/.exec(seatId || '');
      if (d) return 'Long table · ' + (d[1] === 'T' ? 'top' : 'bottom') + ' side · place ' + Number(d[2]);
      return seatId || '';
    },
    /* the words for the two personal states, for the person being chosen for */
    words: function (opts) {
      opts = opts || {};
      var w = Object.assign({}, S.STATES);
      if (opts.subjectName) { w.yours = opts.subjectName + '\u2019s chair'; }
      if (opts.partyName) { w.party = opts.partyName + '\u2019s chair'; }
      if (opts.frozen) { delete w.available; }
      return w;
    },
    svg: function (event, v, opts) {
      opts = opts || {};
      var forGuest = opts.guestId || null, U = 34, G = 8, seat = 26, WORDS = S.words(opts);
      function chair(s, x, y) {
        var st = s.state === 'yours' ? (forGuest && s.guestId !== forGuest ? 'party' : 'yours') : s.state;
        var selectable = (st === 'available' || st === 'yours') && opts.selectable;
        var label = (WORDS[st] || S.STATES[st]) + ' · ' + S.describe(s.seatId);
        var fill = st === 'yours' ? '#313131' : st === 'taken' ? '#DAD9D7' : st === 'family' ? '#EDEBE7' : '#FCFAF6';
        var stroke = st === 'yours' || st === 'party' ? '#313131' : st === 'family' ? '#6B6964' : '#C9C4BA';
        var dash = st === 'family' ? ' stroke-dasharray="3 2"' : '';
        var mark = st === 'family' ? '<text x="' + (x + seat / 2) + '" y="' + (y + seat / 2 + 3) + '" text-anchor="middle" font-size="9" fill="#6B6964" font-family="Hanken Grotesk, Helvetica, Arial, sans-serif" letter-spacing="1">F</text>'
                 : st === 'taken' ? '<circle cx="' + (x + seat / 2) + '" cy="' + (y + seat / 2) + '" r="2.2" fill="#6B6964"/>'
                 : st === 'yours' ? '<path d="M' + (x + 8) + ' ' + (y + 13.5) + ' l4 4 l7 -8" fill="none" stroke="#F3EEE7" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'
                 : st === 'party' ? '<circle cx="' + (x + seat / 2) + '" cy="' + (y + seat / 2) + '" r="3" fill="none" stroke="#313131" stroke-width="1.2"/>' : '';
        return '<g class="seat seat-' + st + '"' + (selectable ? ' role="button" tabindex="0" data-seat="' + esc(s.seatId) + '"' : ' aria-disabled="true"') +
          ' aria-label="' + esc(label) + '"><title>' + esc(label) + '</title>' +
          '<rect x="' + x + '" y="' + y + '" width="' + seat + '" height="' + seat + '" rx="3" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (st === 'party' ? 1.8 : 1) + '"' + dash + '/>' + mark + '</g>';
      }
      var T = 'font-family="Hanken Grotesk, Helvetica, Arial, sans-serif" font-size="9" letter-spacing="2" fill="#6B6964"';

      if (event === 'ceremony') {
        var rows = (v && v.ceremony && v.ceremony.rows) || [];
        var byRow = {};
        rows.forEach(function (r) { byRow[r.row] = byRow[r.row] || { L: [], R: [] }; byRow[r.row][r.side] = r.seats; });
        var nums = Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; });
        var maxL = Math.max.apply(null, nums.map(function (n) { return byRow[n].L.length; }).concat([1]));
        var maxR = Math.max.apply(null, nums.map(function (n) { return byRow[n].R.length; }).concat([1]));
        var aisle = U * 1.6, pad = 16, top = 46;
        var W = pad * 2 + maxL * U + aisle + maxR * U, H = top + nums.length * U + 28;
        var h = '<svg class="p-seatmap" viewBox="0 0 ' + W + ' ' + H + '" style="min-width:' + Math.round(W * 28 / seat) + 'px" role="group" aria-label="Ceremony seating, rows facing the ceremony">';
        h += '<line x1="' + pad + '" y1="18" x2="' + (W - pad) + '" y2="18" stroke="#313131" stroke-width="1"/>' +
             '<text x="' + (W / 2) + '" y="34" text-anchor="middle" ' + T + '>CEREMONY</text>';
        nums.forEach(function (n, i) {
          var y = top + i * U;
          var L = byRow[n].L, R = byRow[n].R;
          /* left block hugs the aisle; right block starts at the aisle */
          L.forEach(function (s, j) { h += chair(s, pad + (maxL - L.length + j) * U, y); });
          R.forEach(function (s, j) { h += chair(s, pad + maxL * U + aisle + j * U, y); });
          h += '<text x="' + (pad + maxL * U + aisle / 2) + '" y="' + (y + seat / 2 + 3) + '" text-anchor="middle" ' + T + '>' + n + '</text>';
        });
        var nL = rows.filter(function (r) { return r.side === 'L'; }).reduce(function (n, r) { return n + r.seats.length; }, 0);
        var nR = rows.filter(function (r) { return r.side === 'R'; }).reduce(function (n, r) { return n + r.seats.length; }, 0);
        h += '<text x="' + (pad + (maxL * U) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" ' + T + '>LEFT · ' + nL + '</text>' +
             '<text x="' + (pad + maxL * U + aisle + (maxR * U) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" ' + T + '>RIGHT · ' + nR + '</text>';
        return h + '</svg>';
      }

      /* the long table, seen from above: TOP along the top, BOTTOM along the
       * bottom, BRIDE and GROOM two fixed positions at the centre of the table
       * itself — part of the 50 people, never guest inventory */
      var sides = (v && v.dinner && v.dinner.sides) || { T: [], B: [] };
      var top = sides.T || [], bottom = sides.B || [], fixed = (v && v.dinner && v.dinner.fixed) || ['BRIDE', 'GROOM'];
      var n = Math.max(top.length, bottom.length, 1), pad2 = 16, top2 = 40;
      var W2 = pad2 * 2 + n * U, tableH = 48, H2 = top2 + seat + G + tableH + G + seat + 44;
      var total = top.length + bottom.length + fixed.length;
      var h2 = '<svg class="p-seatmap p-seatmap-table" viewBox="0 0 ' + W2 + ' ' + H2 + '" style="min-width:' + Math.round(W2 * 28 / seat) + 'px" role="group" aria-label="Wedding dinner, one long table, ' + total + ' people">';
      h2 += '<text x="' + pad2 + '" y="' + (top2 - 12) + '" ' + T + '>' + top.length + ' GUESTS · TOP</text>';
      top.forEach(function (s, j) { h2 += chair(s, pad2 + j * U + (U - seat) / 2, top2); });
      var ty = top2 + seat + G;
      h2 += '<rect x="' + pad2 + '" y="' + ty + '" width="' + (n * U) + '" height="' + tableH + '" rx="4" fill="#F3EEE7" stroke="#313131" stroke-width="1"/>';
      var cx = pad2 + (n * U) / 2;
      h2 += '<g class="fixed" aria-label="' + fixed.join(' and ') + ', fixed central positions">' +
            '<text x="' + (cx - 30) + '" y="' + (ty + tableH / 2 + 3) + '" text-anchor="middle" ' + T + '>' + esc(fixed[0] || '') + '</text>' +
            '<text x="' + (cx + 30) + '" y="' + (ty + tableH / 2 + 3) + '" text-anchor="middle" ' + T + '>' + esc(fixed[1] || '') + '</text>' +
            '<line x1="' + cx + '" y1="' + (ty + 10) + '" x2="' + cx + '" y2="' + (ty + tableH - 10) + '" stroke="#DAD9D7"/></g>';
      bottom.forEach(function (s, j) { h2 += chair(s, pad2 + j * U + (U - seat) / 2, ty + tableH + G); });
      h2 += '<text x="' + pad2 + '" y="' + (H2 - 24) + '" ' + T + '>' + bottom.length + ' GUESTS · BOTTOM</text>' +
            '<text x="' + pad2 + '" y="' + (H2 - 8) + '" ' + T + '>ONE LONG TABLE · ' + total + ' PEOPLE · ' + (top.length + bottom.length) + ' GUEST SEATS + ' + fixed.join(' + ') + '</text>';
      return h2 + '</svg>';
    },

    legend: function (opts) {
      var w = S.words(opts);
      return '<ul class="p-seatlegend">' + ['available', 'yours', 'party', 'family', 'taken'].filter(function (k) { return w[k]; }).map(function (k) {
        return '<li class="t-l1"><span class="seat-' + k + '"></span>' + w[k] + '</li>'; }).join('') + '</ul>';
    },

    /* draw one event into a container and wire the choice */
    render: function (container, event, opts) {
      opts = opts || {};
      if (!container || !view || !view[event]) { if (container) container.innerHTML = ''; return; }
      var wide = event === 'dinner';
      container.innerHTML = '<div class="p-seatwrap' + (wide ? ' wide' : '') + '">' + S.svg(event, view, opts) + '</div>' +
        '<p class="t-l1 p-seathint" hidden>Swipe to see the whole plan</p>' + S.legend(opts);
      /* on a narrow screen the plan keeps its chairs at a real size and
       * scrolls sideways — the guest is told so, in words */
      var wrap = container.querySelector('.p-seatwrap'), hint = container.querySelector('.p-seathint');
      if (wrap && hint) hint.hidden = !(wrap.scrollWidth > wrap.clientWidth + 2);
      /* and it opens on the guest's own chair when there is one */
      var own = container.querySelector('.seat-yours rect');
      if (wrap && own && wrap.scrollWidth > wrap.clientWidth + 2) {
        try { var bx = own.getBoundingClientRect(), wx = wrap.getBoundingClientRect(); wrap.scrollLeft = Math.max(0, bx.left - wx.left - wrap.clientWidth / 2); } catch (e) {}
      }
      container.querySelectorAll('[data-seat]').forEach(function (g) {
        function pick() { if (opts.onSelect) opts.onSelect(g.getAttribute('data-seat')); }
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
    }
  };
})();
