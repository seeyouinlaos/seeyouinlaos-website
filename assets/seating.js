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
  /* the Worker's own origin and a local `wrangler dev` answer at the same path; any other host (a stage) asks the Worker */
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/seating';

  var view = null, loading = null, lastError = null;
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function invitationId() { var a = auth(); return (a && a.invitationId) || ''; }
  /* the bearer on every request: a read then carries first names, a write is the guest's own */
  function headers(json) { var a = auth(), h = {}; if (json) h['content-type'] = 'application/json'; if (a && a.bearer) h['x-siyl-auth'] = a.bearer; return h; }
  function firstName() { var G = window.SIYL_GUEST, a = auth(); return (G && G.nameOf && G.nameOf()) || (a && a.preferredName) || ''; }
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
      loading = fetch(API + '?invitation=' + encodeURIComponent(inv), { cache: 'no-store', headers: headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok) throw new Error('seating unavailable'); view = d; lastError = null; announce(); return d; })
        .catch(function (e) { lastError = String(e && e.message || e); announce(); return null; })
        .then(function (v) { loading = null; return v; });
      return loading;
    },
    /* hold a chair for the guest — the server decides, atomically, and only for the guest the bearer names */
    select: function (event, seatId, guestId) {
      var inv = invitationId();
      return fetch(API + '/select', { method: 'POST', headers: headers(true),
        body: JSON.stringify({ invitationId: inv, guestId: guestId, event: event, seatId: seatId, name: firstName() }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.configured) { view = d; announce(); } else S.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    release: function (event, guestId) {
      var inv = invitationId();
      return fetch(API + '/release', { method: 'POST', headers: headers(true),
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
    STATES: { available: 'Available', selected: 'Selected by you', yours: 'Your seat', party: 'Your party', family: 'Reserved · family', taken: 'Taken' },
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
      /* first names under held chairs (Owner, 14 Sep 2026): the plan says who sits where */
      var named = !!(v && v.named), NAME_H = named ? 12 : 0;
      var U = 36, seat = 30, RH = U + NAME_H, WORDS = S.words(opts), EV = event === 'ceremony' ? 'Ceremony' : 'Dinner';
      var FONT = 'Hanken Grotesk, Helvetica, Arial, sans-serif';
      function short(n) { n = String(n || ''); return n.length > 9 ? n.slice(0, 8) + '…' : n; }
      /* one chair: backrest bar + seat pan, its label inside, its state in words */
      function chair(s, x, y) {
        var st = s.state === 'yours' ? (forGuest && s.guestId !== forGuest ? 'party' : 'yours') : s.state;
        if (pending && s.seatId === pending) st = 'selected';
        var lab = S.label(s.seatId);
        var selectable = choosing && (st === 'available' || st === 'selected');
        /* the spoken state names the guest being chosen for when that is not the person continuing */
        var who = s.name && st !== 'yours' && st !== 'selected' ? s.name : '';
        var words = st === 'available' ? 'available' : st === 'selected' ? (opts.subjectName ? 'selected for ' + opts.subjectName : 'selected') : st === 'yours' ? (opts.subjectName ? opts.subjectName + '’s seat' : 'your seat') : st === 'party' ? (who ? who + ', your party' : WORDS.party) : st === 'family' ? 'reserved for family' : (who ? 'taken by ' + who : 'unavailable');
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
          '<text x="' + (x + seat / 2) + '" y="' + (y + 8 + (seat - 8) / 2 + 3.4) + '" text-anchor="middle" font-family="' + FONT + '" font-size="9.5" letter-spacing=".4" fill="' + ink + '">' + esc(lab) + '</text>' + extra +
          (named && (who || st === 'yours') ? '<text class="seat-name" x="' + (x + seat / 2) + '" y="' + (y + seat + 9) + '" text-anchor="middle" font-family="' + FONT + '" font-size="7" letter-spacing=".3" fill="#313131">' + esc(st === 'yours' ? 'You' : short(who)) + '</text>' : '') + '</g>';
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
        var W = pad * 2 + maxL * U + aisle + maxR * U, H = top + nums.length * RH + 26;
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
          var y = top + i * RH;
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
       * bottom — fifty places, no fixed position for anyone, poolside. THE
       * POOL is the landmark: RUN A is the poolside run (Owner, 15 Sep 2026,
       * source of truth from the venue plan; the geometry may record 'B' if
       * the venue ever changes the layout). The water is drawn as water —
       * a calm band with a few ripples — and named; the other run is named
       * as the run opposite the pool. Nothing childish, nothing bright. */
      var sides = (v && v.dinner && v.dinner.sides) || { T: [], B: [] };
      var top2s = sides.T || [], bottom = sides.B || [];
      var poolSide = v && v.dinner && v.dinner.poolSide === 'B' ? 'B' : 'T';
      var n = Math.max(top2s.length, bottom.length, 1), pad2 = 20, headY2 = 30, POOL_H = 62, GAP = 14;
      var y0 = 44 + (poolSide === 'T' ? POOL_H + GAP : 0);
      var W2 = pad2 * 2 + n * U, tableH = 40;
      var yTop = y0, ty = yTop + seat + NAME_H + 8, yBot = ty + tableH + 8, afterBot = yBot + seat + NAME_H + 8;
      var H2 = afterBot + (poolSide === 'B' ? POOL_H + GAP : 0) + 30;
      var total = top2s.length + bottom.length;
      var RN = (S.LABELS && S.LABELS.RUNS) || { T: 'A', B: 'B' };
      var poolWords = 'the swimming pool along run ' + RN[poolSide];
      var h2 = '<svg class="p-seatmap p-seatmap-table" viewBox="0 0 ' + W2 + ' ' + H2 + '" style="min-width:' + Math.round(W2 * 1.15) + 'px" role="group" aria-label="Wedding dinner seating plan, poolside: one long table with run A of ' + top2s.length + ' places along one side and run B of ' + bottom.length + ' along the other, ' + poolWords + '">';
      h2 += '<defs><linearGradient id="siyl-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCE5E2"/><stop offset="1" stop-color="#CCD9D5"/></linearGradient></defs>';
      h2 += '<line x1="' + pad2 + '" y1="14" x2="' + (W2 - pad2) + '" y2="14" stroke="#313131" stroke-width="1"/>' +
            '<text x="' + pad2 + '" y="' + headY2 + '" ' + T + '>WEDDING DINNER · POOLSIDE</text>' +
            '<text x="' + (W2 - pad2) + '" y="' + headY2 + '" text-anchor="end" ' + T + '>RUN ' + RN.T + ' · ' + top2s.length + ' PLACES' + (poolSide === 'T' ? ' · POOLSIDE' : ' · OPPOSITE THE POOL') + '</text>';
      function pool(y) {
        var w = n * U, cx = pad2 + w / 2, ripple = '', k;
        for (k = 0; k < 3; k++) {
          var ry = y + 16 + k * 15, rx = pad2 + 18 + k * 30;
          ripple += '<path d="M' + rx + ' ' + ry + ' q 7 -4 14 0 t 14 0 t 14 0 t 14 0" fill="none" stroke="#FFFFFF" stroke-opacity=".7" stroke-width="1"/>';
          ripple += '<path d="M' + (pad2 + w - 60 - k * 30) + ' ' + (ry + 6) + ' q 7 -4 14 0 t 14 0 t 14 0" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1"/>';
        }
        return '<g class="pool" role="img" aria-label="The swimming pool, along run ' + RN[poolSide] + '">' +
               '<rect x="' + pad2 + '" y="' + y + '" width="' + w + '" height="' + POOL_H + '" rx="12" fill="url(#siyl-water)" stroke="#B9C7C2" stroke-width="1"/>' +
               '<rect x="' + (pad2 + 3) + '" y="' + (y + 3) + '" width="' + (w - 6) + '" height="' + (POOL_H - 6) + '" rx="10" fill="none" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1"/>' +
               ripple +
               '<text x="' + cx + '" y="' + (y + POOL_H / 2 + 3) + '" text-anchor="middle" font-family="' + FONT + '" font-size="9" letter-spacing="3" fill="#3E5A54">SWIMMING POOL</text></g>';
      }
      if (poolSide === 'T') h2 += pool(44);
      var placeOf = function (s, j) { var m = /-(\d\d)$/.exec(s.seatId || ''); return m ? Number(m[1]) - 1 : j; };
      top2s.forEach(function (s, j) { h2 += chair(s, pad2 + placeOf(s, j) * U + (U - seat) / 2, yTop); });
      h2 += '<rect x="' + pad2 + '" y="' + ty + '" width="' + (n * U) + '" height="' + tableH + '" rx="6" fill="#F3EEE7" stroke="#313131" stroke-width="1"/>';
      h2 += '<text x="' + (pad2 + (n * U) / 2) + '" y="' + (ty + tableH / 2 + 3) + '" text-anchor="middle" ' + T + '>ONE LONG TABLE · ' + total + ' PLACES</text>';
      bottom.forEach(function (s, j) { h2 += chair(s, pad2 + placeOf(s, j) * U + (U - seat) / 2, yBot); });
      if (poolSide === 'B') h2 += pool(afterBot);
      h2 += '<text x="' + (W2 - pad2) + '" y="' + (H2 - 10) + '" text-anchor="end" ' + T + '>RUN ' + RN.B + ' · ' + bottom.length + ' PLACES' + (poolSide === 'B' ? ' · POOLSIDE' : ' · OPPOSITE THE POOL') + '</text>' +
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
    hasParty: function (v) {
      v = v || view; if (!v) return false;
      var c = !!(v.ceremony && v.ceremony.rows) && v.ceremony.rows.some(function (r) { return (r.seats || []).some(function (s) { return s && s.state === 'party'; }); });
      var d = !!(v.dinner && v.dinner.sides) && ['T', 'B'].some(function (side) { return (v.dinner.sides[side] || []).some(function (s) { return s && s.state === 'party'; }); });
      return c || d;
    },
    legend: function (opts) {
      opts = opts || {};
      var w = S.words(opts), family = S.hasFamily(opts.view || view), party = S.hasParty(opts.view || view) || !!opts.partyName;
      return '<ul class="p-seatlegend" aria-label="Seat states">' + ['available', 'selected', 'yours', 'party', 'family', 'taken'].filter(function (k) { return w[k] && (k !== 'family' || family) && (k !== 'party' || party); }).map(function (k) {
        return '<li class="t-l1"><span class="seat-' + k + '" aria-hidden="true"></span>' + esc(w[k]) + '</li>'; }).join('') + '</ul>';
    },
    /* the pool, in words, under the dinner plan: run A is poolside (Owner, 15 Sep 2026) */
    poolNote: function () {
      var d = view && view.dinner, RN = (S.LABELS && S.LABELS.RUNS) || { T: 'A', B: 'B' };
      if (!d) return '';
      var ps = d.poolSide === 'B' ? 'B' : 'T', other = ps === 'B' ? 'T' : 'B';
      return 'Run ' + RN[ps] + ' sits beside the swimming pool; run ' + RN[other] + ' faces it across the table.';
    },

    /* draw one event into a container and wire the choice */
    /* WHO SITS WHERE (Owner, 20 Sep 2026): the held chairs of an event as a compact rail — a small portrait (the guest's own
       photo where there is one, initials where not), the first name, the seat — for an authenticated guest only; the plan
       stays the map, this is the roll call beside it. Read from the same view; nothing is stored here. */
    railHtml: function (event, v, opts) {
      opts = opts || {};
      if (!v || !v.named || !v[event]) return '';
      var list = event === 'ceremony' ? [].concat.apply([], ((v.ceremony && v.ceremony.rows) || []).map(function (r) { return r.seats; })) : ((v.dinner && v.dinner.sides) ? v.dinner.sides.T.concat(v.dinner.sides.B) : []);
      var held = list.filter(function (s) { return s && (s.state === 'yours' || s.state === 'party' || s.state === 'taken') && (s.name || s.guestId || s.holder); });
      if (!held.length) return '';
      held.sort(function (a, b) { return S.label(a.seatId).localeCompare(S.label(b.seatId), undefined, { numeric: true }); });
      var me = opts.guestId || null;
      return '<div class="p-seatrail" data-seatrail="' + esc(event) + '"><p class="t-l1">Who sits where · ' + held.length + (held.length === 1 ? ' seat' : ' seats') + ' held</p><ul>' + held.map(function (s) {
        var gid = s.holder || s.guestId || '', name = s.state === 'yours' && (!me || s.guestId === me) ? 'You' : (s.name || 'A guest'), ini = String(s.name || 'G').trim().split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
        return '<li' + (s.state === 'yours' ? ' class="me"' : '') + ' data-seat-of="' + esc(gid) + '"><span class="p-seatava" data-ava="' + esc(gid) + '" role="img" aria-label="' + esc(s.name || 'Guest') + '"><i aria-hidden="true">' + esc(ini) + '</i></span><span class="n">' + esc(name) + '</span><span class="s">' + esc(S.label(s.seatId)) + '</span></li>';
      }).join('') + '</ul></div>';
    },
    /* the portraits of the rail, read with this session — a photo replaces the initials as it arrives */
    wireRail: function (container) {
      var AV = window.SIYL_AVATAR; if (!AV || !AV.of || !container) return;
      container.querySelectorAll('[data-ava]').forEach(function (el) {
        var gid = el.getAttribute('data-ava'); if (!gid) return;
        AV.of(gid).then(function (url) { if (!url || !el.isConnected) return; var img = document.createElement('img'); img.alt = ''; img.src = url; img.addEventListener('error', function () { img.remove(); }); el.classList.add('has-photo'); el.appendChild(img); });
      });
    },
    render: function (container, event, opts) {
      opts = opts || {};
      if (!container || !view || !view[event]) { if (container) container.innerHTML = ''; return; }
      var wide = event === 'dinner';
      container.innerHTML = '<div class="p-seatwrap' + (wide ? ' wide' : '') + '">' + S.svg(event, view, opts) + '</div>' +
        '<p class="t-l1 p-seathint" hidden>Swipe or scroll sideways to see the whole plan</p>' + S.legend(opts) +
        (event === 'dinner' && S.poolNote() ? '<p class="t-b2 p-poolnote">' + esc(S.poolNote()) + '</p>' : '') +
        (view && view.named ? '<p class="t-b2 p-poolnote">First names show who already sits where.</p>' : '') +
        S.railHtml(event, view, opts);
      S.wireRail(container);
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
