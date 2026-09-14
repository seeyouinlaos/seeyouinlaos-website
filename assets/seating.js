/* ============================================================================
   SEE YOU IN LAOS — YOUR SEATS, on the guest side (G).

   The seating ledger lives on the server (one Durable Object with two
   inventories, CEREMONY and DINNER). This file is its window and its
   drawing hand: it reads the floor plan and every chair's state, draws the
   ceremony rows and the long table from that configuration — never from a
   plan of its own — and asks the server, never itself, to hold a chair.

   States, in words and never by colour alone:
     AVAILABLE · SELECTED BY YOU · YOUR PARTY · TAKEN · (RESERVED — FAMILY only
     where the floor plan actually marks such a chair; the Owner's decision of
     13 Sep 2026 configures none — every guest, the couple included, holds a
     chair through the same ledger, and the legend never lists a state that
     no chair on the plan can have)
   The ceremony has two fixed positions at the FRONT CENTRE — BRIDE and
   GROOM — that are not chairs, carry no seat id and are never selectable
   (Owner, 13 Sep 2026). The dinner is fifty bookable chairs at one long
   table, and the couple hold two of them like every other guest.

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
     * rows and positions come from the configuration exactly as given. The
     * guest sees airline-style labels (A1 … F10 · A1 … B25, assets/seatlabels.js);
     * the ledger id stays inside data-seat and never reaches the words. */
    STATES: { available: 'Available', selected: 'Selected by you', yours: 'Your seat', party: 'Your party', family: 'Reserved · family', taken: 'Unavailable' },
    LABELS: window.SIYL_SEATLABELS || null,
    /* the guest-facing label of a ledger id (E4, A17) */
    label: function (seatId) { var L = S.LABELS; return L ? (L.label(seatId) || '') : ''; },
    /* a chair, in words: label first, then where it stands */
    describe: function (seatId) {
      var L = S.LABELS, lab = S.label(seatId), where = L ? L.describe(seatId) : '';
      return lab ? lab + (where ? ' · ' + where : '') : where;   /* never the ledger id */
    },
    /* the words for the personal states, for the person being chosen for */
    words: function (opts) {
      opts = opts || {};
      var w = Object.assign({}, S.STATES);
      if (opts.subjectName) { w.yours = opts.subjectName + '’s seat'; w.selected = 'Selected for ' + opts.subjectName; }
      if (opts.partyName) { w.party = opts.partyName + '’s seat'; }
      if (opts.frozen) { delete w.available; delete w.selected; }
      return w;
    },
    svg: function (event, v, opts) {
      opts = opts || {};
      var forGuest = opts.guestId || null, pending = opts.pending || null, choosing = !!opts.selectable && opts.choosing !== false;
      var U = 36, seat = 30, WORDS = S.words(opts), EV = event === 'ceremony' ? 'Ceremony' : 'Dinner';
      var FONT = 'Hanken Grotesk, Helvetica, Arial, sans-serif';
      /* one chair: backrest bar + seat pan, its label inside, its state in words */
      function chair(s, x, y) {
        var st = s.state === 'yours' ? (forGuest && s.guestId !== forGuest ? 'party' : 'yours') : s.state;
        if (pending && s.seatId === pending) st = 'selected';
        var lab = S.label(s.seatId);
        var selectable = choosing && (st === 'available' || st === 'selected');
        /* the spoken state names the guest being chosen for when that is not the person continuing */
        var words = st === 'available' ? 'available' : st === 'selected' ? (opts.subjectName ? 'selected for ' + opts.subjectName : 'selected') : st === 'yours' ? (opts.subjectName ? opts.subjectName + '’s seat' : 'your seat') : st === 'party' ? WORDS.party : st === 'family' ? 'reserved for family' : 'unavailable';
        var aria = EV + ' seat ' + lab + ', ' + words;
        /* available = an outlined chair (rim 3.3:1 on the card) · unavailable = a filled chair, struck through, its label 4.3:1 on the fill */
        var pan = st === 'selected' ? '#313131' : st === 'yours' ? '#F3EEE7' : st === 'taken' ? '#E7E3DB' : st === 'family' ? '#EDEBE7' : '#FCFAF6';
        var stroke = st === 'selected' || st === 'yours' || st === 'party' ? '#313131' : st === 'taken' ? '#D5D0C7' : st === 'family' ? '#6B6964' : '#8F8A82';
        var back = st === 'selected' || st === 'yours' ? '#313131' : st === 'taken' ? '#D5D0C7' : '#DAD5CC';
        var ink = st === 'selected' ? '#F3EEE7' : st === 'taken' ? '#6B6964' : '#313131';
        var sw = st === 'yours' ? 1.8 : st === 'party' ? 1.4 : 1;
        var dash = st === 'party' || st === 'family' ? ' stroke-dasharray="3 2"' : '';
        var extra = st === 'taken' ? '<line x1="' + (x + 6) + '" y1="' + (y + seat - 5) + '" x2="' + (x + seat - 6) + '" y2="' + (y + 12) + '" stroke="#8F8A82" stroke-width="1"/>'
                  : st === 'selected' ? '<rect x="' + (x - 3) + '" y="' + (y - 3) + '" width="' + (seat + 6) + '" height="' + (seat + 6) + '" rx="8" fill="none" stroke="#313131" stroke-width="1"/>'
                  : st === 'yours' ? '<circle cx="' + (x + seat - 4) + '" cy="' + (y + 4) + '" r="3" fill="#313131"/>' : '';
        return '<g class="seat seat-' + st + '"' + (selectable ? ' role="button" tabindex="0" data-seat="' + esc(s.seatId) + '" data-label="' + esc(lab) + '"' : ' aria-disabled="true" data-label="' + esc(lab) + '"') +
          ' aria-label="' + esc(aria) + '">' +
          '<rect class="back" x="' + (x + 3) + '" y="' + y + '" width="' + (seat - 6) + '" height="6" rx="2" fill="' + back + '"/>' +
          '<rect class="pan" x="' + x + '" y="' + (y + 8) + '" width="' + seat + '" height="' + (seat - 8) + '" rx="5" fill="' + pan + '" stroke="' + stroke + '" stroke-width="' + sw + '"' + dash + '/>' +
          '<text x="' + (x + seat / 2) + '" y="' + (y + 8 + (seat - 8) / 2 + 3.4) + '" text-anchor="middle" font-family="' + FONT + '" font-size="9.5" letter-spacing=".4" fill="' + ink + '">' + esc(lab) + '</text>' + extra + '</g>';
      }
      var T = 'font-family="' + FONT + '" font-size="8.5" letter-spacing="2" fill="#6B6964"';
      var TH = 'font-family="' + FONT + '" font-size="8.5" letter-spacing="1.2" fill="#6B6964"';

      if (event === 'ceremony') {
        var rows = (v && v.ceremony && v.ceremony.rows) || [];
        var byRow = {};
        rows.forEach(function (r) { byRow[r.row] = byRow[r.row] || { L: [], R: [] }; byRow[r.row][r.side] = r.seats; });
        var nums = Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; });
        var maxL = Math.max.apply(null, nums.map(function (n) { return byRow[n].L.length; }).concat([1]));
        var maxR = Math.max.apply(null, nums.map(function (n) { return byRow[n].R.length; }).concat([1]));
        var aisle = 52, pad = 20, frontH = 30, fixedC = (v && v.ceremony && v.ceremony.fixed) || [];
        var headY = frontH + (fixedC.length ? 44 : 10), top = headY + 18;
        var W = pad * 2 + maxL * U + aisle + maxR * U, H = top + nums.length * U + 26;
        var cxC = pad + maxL * U + aisle / 2;
        /* the chairs keep a real size on a narrow screen: the plan scrolls sideways rather than shrinking its labels */
        var h = '<svg class="p-seatmap p-seatmap-ceremony" viewBox="0 0 ' + W + ' ' + H + '" style="min-width:' + Math.round(W * 1.1) + 'px" role="group" aria-label="Ceremony seating plan: the front with the Bride and Groom, a left block of two seats and a right block of three seats per row, ten rows, a centre aisle">';
        /* the front: a fine rule the whole width, named */
        h += '<line x1="' + pad + '" y1="14" x2="' + (W - pad) + '" y2="14" stroke="#313131" stroke-width="1"/>' +
             '<text x="' + cxC + '" y="27" text-anchor="middle" ' + T + '>CEREMONY · FRONT</text>';
        /* the couple's place: front centre, between the two blocks, in front of
         * row 1 — marked, named, never a chair, no seat label */
        if (fixedC.length) {
          var yC = frontH + 6, TF = 'font-family="' + FONT + '" font-size="7.5" letter-spacing="1.4" fill="#313131"';
          h += '<g class="fixed" aria-label="' + esc(fixedC.join(' and ')) + ', fixed positions at the front centre">' +
               '<rect x="' + (cxC - 60) + '" y="' + yC + '" width="56" height="22" rx="11" fill="#F3EEE7" stroke="#313131" stroke-width="1"/>' +
               '<text x="' + (cxC - 32) + '" y="' + (yC + 14.5) + '" text-anchor="middle" ' + TF + '>' + esc(fixedC[0] || '') + '</text>' +
               '<rect x="' + (cxC + 4) + '" y="' + yC + '" width="56" height="22" rx="11" fill="#F3EEE7" stroke="#313131" stroke-width="1"/>' +
               '<text x="' + (cxC + 32) + '" y="' + (yC + 14.5) + '" text-anchor="middle" ' + TF + '>' + esc(fixedC[1] || '') + '</text></g>';
        }
        /* column letters over the blocks; the aisle between them is column C, unnamed */
        var LC = (S.LABELS && S.LABELS.COLS) || { L: ['A', 'B'], R: ['D', 'E', 'F'] };
        for (var jl = 0; jl < maxL; jl++) h += '<text x="' + (pad + jl * U + seat / 2) + '" y="' + headY + '" text-anchor="middle" ' + TH + '>' + (LC.L[jl] || '') + '</text>';
        for (var jr = 0; jr < maxR; jr++) h += '<text x="' + (pad + maxL * U + aisle + jr * U + seat / 2) + '" y="' + headY + '" text-anchor="middle" ' + TH + '>' + (LC.R[jr] || '') + '</text>';
        h += '<text x="' + cxC + '" y="' + headY + '" text-anchor="middle" ' + TH + '>AISLE</text>';
        nums.forEach(function (n, i) {
          var y = top + i * U;
          var L = byRow[n].L, R = byRow[n].R;
          /* each chair stands in the column its own id names (…-01, -02, -03), whatever order the configuration lists it in */
          L.forEach(function (s, j) { var m = /-(\d\d)$/.exec(s.seatId || ''), col = m ? Number(m[1]) - 1 : j; h += chair(s, pad + (maxL - L.length + col) * U, y); });
          R.forEach(function (s, j) { var m = /-(\d\d)$/.exec(s.seatId || ''), col = m ? Number(m[1]) - 1 : j; h += chair(s, pad + maxL * U + aisle + col * U, y); });
          h += '<text class="rownum" x="' + cxC + '" y="' + (y + 8 + (seat - 8) / 2 + 3) + '" text-anchor="middle" ' + T + '>' + n + '</text>';
        });
        var nL = rows.filter(function (r) { return r.side === 'L'; }).reduce(function (n, r) { return n + r.seats.length; }, 0);
        var nR = rows.filter(function (r) { return r.side === 'R'; }).reduce(function (n, r) { return n + r.seats.length; }, 0);
        h += '<text x="' + (pad + (maxL * U) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" ' + T + '>LEFT BLOCK · ' + nL + '</text>' +
             '<text x="' + (pad + maxL * U + aisle + (maxR * U) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" ' + T + '>RIGHT BLOCK · ' + nR + '</text>';
        return h + '</svg>';
      }

      /* the long table, seen from above: run A along the top, run B along the
       * bottom — fifty places, no fixed position for anyone, poolside */
      var sides = (v && v.dinner && v.dinner.sides) || { T: [], B: [] };
      var top2s = sides.T || [], bottom = sides.B || [];
      var n = Math.max(top2s.length, bottom.length, 1), pad2 = 20, headY2 = 30, y0 = 44;
      var W2 = pad2 * 2 + n * U, tableH = 40, H2 = y0 + seat + 8 + tableH + 8 + seat + 40;
      var total = top2s.length + bottom.length;
      var RN = (S.LABELS && S.LABELS.RUNS) || { T: 'A', B: 'B' };
      var h2 = '<svg class="p-seatmap p-seatmap-table" viewBox="0 0 ' + W2 + ' ' + H2 + '" style="min-width:' + Math.round(W2 * 1.15) + 'px" role="group" aria-label="Wedding dinner seating plan, poolside: one long table with run A of ' + top2s.length + ' places along one side and run B of ' + bottom.length + ' along the other">';
      h2 += '<line x1="' + pad2 + '" y1="14" x2="' + (W2 - pad2) + '" y2="14" stroke="#313131" stroke-width="1"/>' +
            '<text x="' + pad2 + '" y="' + headY2 + '" ' + T + '>WEDDING DINNER · POOLSIDE</text>' +
            '<text x="' + (W2 - pad2) + '" y="' + headY2 + '" text-anchor="end" ' + T + '>RUN ' + RN.T + ' · ' + top2s.length + ' PLACES</text>';
      var placeOf = function (s, j) { var m = /-(\d\d)$/.exec(s.seatId || ''); return m ? Number(m[1]) - 1 : j; };
      top2s.forEach(function (s, j) { h2 += chair(s, pad2 + placeOf(s, j) * U + (U - seat) / 2, y0); });
      var ty = y0 + seat + 8;
      h2 += '<rect x="' + pad2 + '" y="' + ty + '" width="' + (n * U) + '" height="' + tableH + '" rx="6" fill="#F3EEE7" stroke="#313131" stroke-width="1"/>';
      h2 += '<text x="' + (pad2 + (n * U) / 2) + '" y="' + (ty + tableH / 2 + 3) + '" text-anchor="middle" ' + T + '>ONE LONG TABLE · ' + total + ' PLACES</text>';
      bottom.forEach(function (s, j) { h2 += chair(s, pad2 + placeOf(s, j) * U + (U - seat) / 2, ty + tableH + 8); });
      h2 += '<text x="' + (W2 - pad2) + '" y="' + (H2 - 10) + '" text-anchor="end" ' + T + '>RUN ' + RN.B + ' · ' + bottom.length + ' PLACES</text>' +
            '<text x="' + pad2 + '" y="' + (H2 - 10) + '" ' + T + '>' + total + ' GUEST SEATS · NO FIXED PLACES</text>';
      return h2 + '</svg>';
    },

    /* does the plan as configured carry any RESERVED · FAMILY chair at all */
    hasFamily: function (v) {
      v = v || view; if (!v) return false;
      var c = !!(v.ceremony && v.ceremony.rows) && v.ceremony.rows.some(function (r) { return (r.seats || []).some(function (s) { return s && s.state === 'family'; }); });
      var d = !!(v.dinner && v.dinner.sides) && ['T', 'B'].some(function (side) { return (v.dinner.sides[side] || []).some(function (s) { return s && s.state === 'family'; }); });
      return c || d;
    },
    legend: function (opts) {
      opts = opts || {};
      var w = S.words(opts), family = S.hasFamily(opts.view || view);
      return '<ul class="p-seatlegend" aria-label="Seat states">' + ['available', 'selected', 'yours', 'party', 'family', 'taken'].filter(function (k) { return w[k] && (k !== 'family' || family) && (k !== 'party' || opts.partyName); }).map(function (k) {
        return '<li class="t-l1"><span class="seat-' + k + '" aria-hidden="true"></span>' + esc(w[k]) + '</li>'; }).join('') + '</ul>';
    },

    /* draw one event into a container and wire the choice */
    render: function (container, event, opts) {
      opts = opts || {};
      if (!container || !view || !view[event]) { if (container) container.innerHTML = ''; return; }
      var wide = event === 'dinner';
      container.innerHTML = '<div class="p-seatwrap' + (wide ? ' wide' : '') + '">' + S.svg(event, view, opts) + '</div>' +
        '<p class="t-l1 p-seathint" hidden>Swipe or scroll sideways to see the whole plan</p>' + S.legend(opts);
      container.classList.toggle('is-choosing', !!opts.selectable && opts.choosing !== false);
      /* on a narrow screen the plan keeps its chairs at a real size and
       * scrolls sideways — the guest is told so, in words */
      var wrap = container.querySelector('.p-seatwrap'), hint = container.querySelector('.p-seathint');
      if (wrap && hint) hint.hidden = !(wrap.scrollWidth > wrap.clientWidth + 2);
      /* and it opens on the guest's own chair when there is one */
      var own = container.querySelector('.seat-selected rect, .seat-yours rect');
      if (wrap && own && wrap.scrollWidth > wrap.clientWidth + 2) {
        try { var bx = own.getBoundingClientRect(), wx = wrap.getBoundingClientRect(); wrap.scrollLeft = Math.max(0, bx.left - wx.left - wrap.clientWidth / 2); } catch (e) {}
      }
      container.querySelectorAll('[data-seat]').forEach(function (g) {
        function pick() { if (opts.onSelect) opts.onSelect(g.getAttribute('data-seat'), g.getAttribute('data-label')); }
        g.addEventListener('click', pick);
        g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
    }
  };
})();
