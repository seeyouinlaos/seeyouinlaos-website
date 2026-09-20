/* ============================================================================
   SEE YOU IN LAOS — THE BOOKING CONTEXT (Owner, 20 Sep 2026 · the final booking-UX pass).

   Two navigations, kept apart: the GLOBAL one (Destinations · The Journey · Stays ·
   Experiences · Highlights · Wellness · The Wedding · My Trip) and the BOOKING one
   (01 / 06 … 06 / 06). A detail page — a stay, a room, a train, a flight, a table —
   belongs to The Journey, but when the guest opens it from 02 / 06 · My Trip it is a
   SUB-VIEW of that step: it wears the step shell, its way back reads RETURN TO MY TRIP,
   and a selection made there returns the guest to My Trip by itself — to the stage
   they came from, with the next open stage right below it.

   The context travels explicitly in the URL (?ctx=trip&stage=<key>) — never guessed
   from a referrer, never kept in a store: opened from the global menu, the same page
   is the ordinary Journey page. Nothing here decides a product, a price, a hold or a
   line: the one engine (assets/stay.js · rooms.js · bag.js · pricing.js · journey.js)
   does, exactly as before.
   ========================================================================== */
(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase().replace(/\.html$/, '');
  var active = q.get('ctx') === 'trip';
  var stage = (q.get('stage') || '').replace(/[^a-z0-9-]/g, '');
  var origin = here === 'your-journey';
  var SUBVIEWS = /^(room|journeys|transport|experience|1872|tea|marsilea)(\.html)?(?=[?#]|$)/;

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  /* the stage a Journey window belongs to (guesthouse and riverside are the wedding stay; a transport id is its own stage) */
  function stageOfWindow(win) {
    var J = window.SIYL_JOURNEY; if (!J || !win) return win || '';
    var seg = J.SEGMENTS.filter(function (s) { return s.key === win || (s.ids || []).indexOf(win) >= 0; })[0];
    return seg ? seg.key : win;
  }
  function withCtx(url, st) {
    var m = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(url) || []; var base = m[1] || url, qs = m[2] ? m[2].slice(1) : '', hash = m[3] || '';
    var p = new URLSearchParams(qs); p.set('ctx', 'trip'); if (st) p.set('stage', st); else p.delete('stage');
    return base + '?' + p.toString() + hash;
  }
  var W = window.SIYL_WIZARD = {
    active: active, stage: stage, origin: origin,
    stageOfWindow: stageOfWindow,
    /* a link that keeps the context (used by pages that navigate in code) */
    href: function (url, st) { return active ? withCtx(url, st || stage) : url; },
    /* the way back: the stage the guest came from */
    returnHref: function (st) { return 'your-journey.html#s-' + (st || stage || ''); },
    /* after a successful selection: back to My Trip, the stage named, the next open stage right below */
    done: function (st, words) {
      var key = st || stage || '';
      if (!active) return false;
      try { sessionStorage.setItem('siyl.wizard.done', JSON.stringify({ stage: key, words: words || '', at: Date.now() })); } catch (e) {}
      var go = function () { location.href = 'your-journey.html?done=' + encodeURIComponent(key) + (key === 'extras' ? '#extras' : '#s-' + key); };
      /* a breath, so the confirmation is seen before the page changes (none with reduced motion) */
      var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setTimeout(go, calm ? 0 : 700);
      return true;
    },
    /* the back link of a sub-view: RETURN TO MY TRIP, never "Back to The Journey" */
    decorate: function (root) {
      if (!active) return;
      (root || document).querySelectorAll('.backrow a, .x-back a, .tlink[href^="1872"], a[data-back]').forEach(function (a) {
        if (a.getAttribute('data-wizard-back')) return;
        a.setAttribute('data-wizard-back', '1'); a.setAttribute('href', W.returnHref()); a.textContent = 'Return to My Trip';
      });
    }
  };

  /* ---- the sub-view: the step shell of 02 / 06 on a Journey page ---- */
  if (active) {
    document.documentElement.setAttribute('data-wizard', 'trip');
    var main = document.querySelector('main'); if (main) main.setAttribute('data-step', 'journey');
    var v = (document.currentScript && (document.currentScript.getAttribute('src').split('?v=')[1] || '')) || '';
    var need = [];
    if (!document.querySelector('link[href^="assets/prep.css"]')) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/prep.css'; document.head.appendChild(l); }
    if (!window.SIYL_GUEST) need.push('assets/guest.js');
    need.push('assets/prep-shell.js');
    var load = function (i) {
      if (i >= need.length) { W.decorate(document); return; }
      var s = document.createElement('script'); s.src = need[i]; s.onload = function () { load(i + 1); }; s.onerror = function () { load(i + 1); };
      document.body.appendChild(s);
    };
    var start = function () { setTimeout(function () { load(0); }, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
    /* links between the Journey's own pages keep the context; the global menu, the footer and the shell never carry it */
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
      if (a.closest('.a-menu, .sfoot, .prep-bar, .prep-steps, .p-drawer, header.hd, .a-macct')) return;
      var h = a.getAttribute('href') || ''; if (!SUBVIEWS.test(h) || /[?&]ctx=/.test(h)) return;
      a.setAttribute('href', withCtx(h, stage));
    }, true);
    /* the page's own words change under it: keep the back link decorated */
    var mo = new MutationObserver(function () { W.decorate(document); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { W.decorate(document); mo.observe(document.body, { childList: true, subtree: true }); });
    else { W.decorate(document); mo.observe(document.body, { childList: true, subtree: true }); }
  }

  /* ---- the origin: My Trip hands the context to every Journey link it opens, with the stage of the card it sits in ---- */
  if (origin) {
    document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
      if (a.closest('.a-menu, .sfoot, .prep-bar, .prep-steps, .a-macct')) return;
      var h = a.getAttribute('href') || ''; if (!SUBVIEWS.test(h) || /[?&]ctx=/.test(h)) return;
      var card = a.closest('.p-stage[id^="s-"]'); var st = card ? card.id.slice(2) : '';
      if (!st) { var m = /#(?:j-|s-)([a-z0-9-]+)/.exec(h); st = m ? stageOfWindow(m[1]) : ''; }
      a.setAttribute('href', withCtx(h, st));
    }, true);
    /* arriving back with a selection made: the stage is named, the next open stage sits right below it */
    var done = q.get('done');
    if (done) {
      var land = function () {
        var J = window.SIYL_JOURNEY, card = document.getElementById(done === 'extras' ? 'extras' : 's-' + done); if (!card || card.hidden) return false;
        if (done === 'extras') { if (!card.querySelector('.p-wizard-note')) { var ne = document.createElement('p'); ne.className = 't-l1 on p-wizard-note'; ne.setAttribute('role', 'status'); ne.innerHTML = '<i class="prep-tick" aria-hidden="true"></i> Added to your trip'; card.insertBefore(ne, card.firstChild); } card.classList.add('p-wizard-landed'); return true; }
        var seg = J && J.SEGMENTS.filter(function (s) { return s.key === done; })[0];
        var st = seg && J.state(seg), words = st === 'selected' ? 'Selected · in your trip' : st === 'waitlisted' ? 'On the waiting list' : st === 'declined' ? 'Not joining' : '';
        if (!card.querySelector('.p-wizard-note')) {
          var n = document.createElement('p'); n.className = 't-l1 on p-wizard-note'; n.setAttribute('role', 'status'); n.setAttribute('aria-live', 'polite');
          var next = null; if (J) { var after = false; J.SEGMENTS.forEach(function (s) { if (s.key === done) { after = true; return; } if (after && !next && J.relevant(s) && J.state(s) === 'open') next = s; }); }
          n.innerHTML = '<span><i class="prep-tick" aria-hidden="true"></i> ' + esc(words || 'Back in My Trip') + '</span>' + (next ? '<a href="#s-' + esc(next.key) + '">Next: ' + esc(next.label) + '</a>' : '<span>Every stage of your trip is answered</span>');
          var head = card.querySelector('.p-stage-h'); if (head) head.appendChild(n); else card.insertBefore(n, card.firstChild);
        }
        card.classList.add('p-wizard-landed');
        return true;
      };
      var tries = 0; var t = setInterval(function () { if (land() || ++tries > 40) clearInterval(t); }, 150);
      document.addEventListener('siyl:bag', function () { land(); });
    }
  }
})();
