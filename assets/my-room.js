/* ============================================================================
   MY ROOM ON THE SITE PLAN (Owners, 22 Nov 2026 · HS-058.7) — My Profile only, after sign-in.
   The same site plan as the public venue (assets/images/venue/souphattra-site-plan.svg, through SIYL_VENUE.wirePlan — never a
   second drawing), with the guest's OWN building marked "Your Building" and the guest's own hotel room number beside it.

   PRIVATE BY CONSTRUCTION: nothing personal is in this file, the drawing or the page. The building and the number arrive only from
   GET /api/my-room, for the bearer's own guest, and are drawn into this session's copy of the plan. A unit without a hotel number
   assigned by Haruthai & Suthep shows no building and no number — a neutral note, never a guess. Two Souphattra stays (before
   the wedding, the Wedding Stay) are two views with a switch. The Guest House is not on this plan: said so, plainly.
   ========================================================================== */
(function () {
  'use strict';
  var API = '/api/my-room';
  var HS = '<span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span>';
  var STAYS = { prewed: { name: 'Before the wedding', when: '25 – 27 February' }, wedstay: { name: 'Wedding Stay', when: '27 February – 1 March' } };
  var st = { inv: '', data: null, loading: null, failed: false, which: null };
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:myroom')); } catch (e) {} }

  function load(force) {
    var a = auth(); if (!a || !a.bearer) { st.data = null; return Promise.resolve(null); }
    if (st.inv !== a.invitationId) { st.inv = a.invitationId; st.data = null; st.which = null; }
    if (st.loading && !force) return st.loading;
    var inv = a.invitationId, bearer = a.bearer; st.failed = false;
    st.loading = fetch(API, { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) { st.loading = null; var b = auth(); if (!b || b.invitationId !== inv || b.bearer !== bearer) return null;   /* another session: dropped */
        if (j && j.ok) { st.data = j; st.failed = false; } else st.failed = j && j.error === 'unauthorised' ? 'auth' : true; announce(); return j; },
        function () { st.loading = null; st.failed = true; announce(); return null; });
    return st.loading;
  }

  function staysOf(d) { return ((d && d.stays) || []).filter(function (x) { return x.stage === 'prewed' || x.stage === 'wedstay'; }); }
  function current(d) {
    var on = staysOf(d).filter(function (x) { return x.souphattra; });
    if (!on.length) return null;
    var w = st.which && on.filter(function (x) { return x.stage === st.which; })[0];
    return w || on.filter(function (x) { return x.stage === 'wedstay'; })[0] || on[0];
  }
  function lettersOf(b) { return String(b || '').split('/').map(function (s) { return s.trim(); }).filter(function (s) { return /^[A-F]$/.test(s); }); }

  function html() {
    var a = auth(); if (!a || !a.bearer) return '';
    var V = window.SIYL_VENUE, plan = window.SIYL_VENUE_DATA && window.SIYL_VENUE_DATA.plan;
    var head = '<section class="prep-sec mr" id="my-room" data-my-room><p class="t-l1">Souphattra Heritage Vientiane</p><h2 class="t-h2">Where you stay</h2>';
    if (!st.data) return head + '<div class="p-card"><p class="t-b2">' + (st.failed === 'auth' ? 'Please open your invitation once more to see your room.' : st.failed && !st.loading ? 'We could not load your room just now. <button type="button" class="p-link" data-mr-retry>Try again</button>' : 'Loading your room…') + '</p></div></section>';
    var all = staysOf(st.data), on = all.filter(function (x) { return x.souphattra; }), cur = current(st.data), h = head;
    if (!all.length) return h + '<div class="p-card"><p class="t-b2">Once you have chosen your room for Vientiane, it appears here on the site plan.</p></div></section>';
    /* the Guest House is its own house, not on this plan */
    all.filter(function (x) { return !x.souphattra; }).forEach(function (x) {
      h += '<p class="t-b2 mr-note">' + esc((STAYS[x.stage] || {}).name || 'Your stay') + ': ' + esc(x.name || 'the Guest House') + ' — a house of its own, not part of the Souphattra Heritage site plan.</p>'; });
    if (!cur) return h + '</section>';
    /* two stays, two views */
    if (on.length > 1) h += '<div class="mr-switch" role="group" aria-label="Your stays">' + on.map(function (x) {
      var s = STAYS[x.stage] || { name: x.stage, when: '' }, sel = x.stage === cur.stage;
      return '<button type="button" class="mr-tab' + (sel ? ' on' : '') + '" data-mr-stay="' + esc(x.stage) + '" aria-pressed="' + sel + '">' + esc(s.name) + '<small>' + esc(s.when) + '</small></button>'; }).join('') + '</div>';
    var s = STAYS[cur.stage] || { name: '', when: '' };
    h += '<div class="p-card mr-card"><p class="t-l1">' + esc(s.name) + ' · ' + esc(s.when) + '</p>';
    if (cur.building && cur.room) {
      h += '<p class="mr-where"><span class="mr-b">Building ' + esc(cur.building) + '</span><span class="mr-r">' + (cur.suite ? 'Suite ' : 'Room ') + esc(cur.room) + '</span></p>' +
        '<p class="t-b2">' + esc(cur.name) + (cur.bed ? ' · your place is the extra bed' : '') + '</p>';
    } else {
      h += '<p class="t-b2">' + esc(cur.name) + (cur.bed ? ' · the extra bed' : '') + '</p>' +
        '<p class="t-b2 mr-note">Your building and room number appear here as soon as ' + HS + ' have assigned your room.</p>';
    }
    h += '</div>';
    if (V && V.html && V.html.figure && plan) h += '<figure class="venue-stage venue-plan mr-plan is-in" data-mr-plan>' + V.html.figure(plan) + '</figure>';
    return h + '</section>';
  }

  /* the guest's building, marked on this session's copy of the plan (the page's and the enlarged one) */
  function decorateFor(cur) {
    var letters = cur && cur.building && cur.room ? lettersOf(cur.building) : [];
    return function (frame) {
      var svg = frame && frame.querySelector('svg'); if (!svg || !letters.length) return;
      letters.forEach(function (L) {
        var r = svg.querySelector('[data-building="' + L + '"]'); if (!r) return;
        r.classList.add('sp-mine');
        /* two short lines at the top of the block: they fit the narrowest building and never cover a place's own name */
        var x = Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2, y = Number(r.getAttribute('y'));
        ['YOUR', 'BUILDING'].forEach(function (w, i) {
          var t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          t.setAttribute('class', 'sp-mine-t'); t.setAttribute('x', String(x)); t.setAttribute('y', String(y + 28 + i * 21)); t.setAttribute('text-anchor', 'middle');
          t.textContent = w; svg.appendChild(t);
        });
      });
      /* the guest sees the building at once: the frame (a phone) or the enlarged view scrolls it into the middle */
      var mine = svg.querySelector('.sp-mine'); if (!mine) return;
      var scroller = (frame.closest && frame.closest('.venue-zoom-area')) || frame;
      var centre = function () {
        var r = mine.getBoundingClientRect(), c = scroller.getBoundingClientRect();
        scroller.scrollLeft += (r.left + r.width / 2) - (c.left + c.width / 2);
        if (scroller !== frame) scroller.scrollTop += (r.top + r.height / 2) - (c.top + c.height / 2);
      };
      if (window.requestAnimationFrame) window.requestAnimationFrame(centre); else centre();
    };
  }

  function wire(root) {
    var sec = root && root.querySelector('[data-my-room]'); if (!sec) return;
    sec.querySelectorAll('[data-mr-stay]').forEach(function (b) { b.onclick = function () { st.which = b.getAttribute('data-mr-stay'); st.focusTab = st.which; announce(); }; });
    if (st.focusTab) { var ft = sec.querySelector('[data-mr-stay="' + st.focusTab + '"]'); st.focusTab = null; if (ft && ft.focus) { try { ft.focus({ preventScroll: true }); } catch (e) {} } }
    var t = sec.querySelector('[data-mr-retry]'); if (t) t.onclick = function () { if (st.loading) return; load(true); announce(); };
    var fig = sec.querySelector('[data-mr-plan]'), V = window.SIYL_VENUE, plan = window.SIYL_VENUE_DATA && window.SIYL_VENUE_DATA.plan;
    if (fig && V && V.wirePlan && plan) V.wirePlan(fig, plan, decorateFor(current(st.data)));
  }

  window.SIYL_MY_ROOM = { load: load, html: html, wire: wire, data: function () { return st.data; } };
  function reset() { st.data = null; st.inv = ''; st.which = null; st.failed = false; announce(); load(true); }
  document.addEventListener('siyl:auth', reset);
  window.addEventListener('storage', function (e) { if (e.key === 'siyl.auth') reset(); });
})();
