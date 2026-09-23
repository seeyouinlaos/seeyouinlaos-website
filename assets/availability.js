/* ============================================================================
   THE AVAILABILITY OBJECT (Owner approved 23 Sep 2026 · compact composition
   restored the same day, by the Owner's correction).

   ONE COMPACT EDITORIAL INSTRUMENT embedded in the first page — never a section
   of its own, never a landing page, never a booking portal. It says two
   different things, and neither is said twice:

     THE RING says HOW MANY PLACES ARE LEFT — the engine's count, drawn as an
     arc and read as "5 / 6" on ONE line, with REMAINING small beneath it.
     THE LINE says HOW MUCH OF THE PLANNING WINDOW HAS RUN — real calendar time
     from 23 September 2026 to the end of 30 November 2026, never the allocation.

     WEDDING STAY · LIMITED AVAILABILITY
     ╭─────╮   One place
     │ 5/6 │   has gone.
     ╰─────╯   Complimentary Wedding Stay
       REM     while places remain.
     Now ●──────────────────── 30 Nov
     Your invitation shows what is still available for you.
     OPEN YOUR INVITATION →      See the Guest House →
     68 days remaining · availability may close earlier

   THE NAMES ARE THE PROJECT'S OWN (Owner, 23 Sep 2026): the house is the
   "Guest House complimentary" the booking engine knows. "Private Residence" was
   never approved terminology and appears nowhere in this component.

   NOTHING IS TYPED TWICE. The count is the room engine's; the days, both ends
   of the window and the share of it already run are the one stay plan's.

   THE ONE ACCENT is Cherry #74070E — the wordmark's own full stop: the ring's
   arc, the calendar line, the dot, its single ripple. Used with restraint.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function plan() { return window.SIYL_STAY_PLAN || null; }
  function calm() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function signedIn() { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId); } catch (e) { return false; } }

  var R = 26, C = 2 * Math.PI * R;   /* the small ring's radius and circumference, in its own 60-unit viewBox */

  /* ---- the facts ---------------------------------------------------------
     the count is the engine's (never a number written into a page); the days,
     both ends of the window and the share already run are the one plan's. */
  function facts() {
    var P = plan(), U = window.SIYL_UNITS;
    if (!P) return null;
    var c = U && U.complimentary ? U.complimentary() : null;
    if (!c || !c.max) return null;
    var w = P.planningWindow(new Date());
    return {
      max: c.max, remaining: c.remaining, taken: Math.max(0, c.max - c.remaining),
      /* THE LINE IS CALENDAR TIME, never the allocation — the ring already says what is left */
      elapsed: w.progress,
      startWords: w.startWords, endWords: w.endWords,
      phase: w.phase, days: w.days, deadlineWords: P.COMPLIMENTARY.deadlineWords,
      closed: !w.open, full: c.remaining <= 0, mine: !!c.mine
    };
  }
  /* the one line that changes with the count — the Owner's sentence, spoken by the data.
     The break is a real line break kept by the stylesheet (white-space: pre-line), never a <br>: the sentence stays
     ONE text node, so the site's dictionary can translate it whole instead of in fragments that no grammar survives. */
  function headline(f) {
    if (f.full) return 'Every place\nhas gone.';
    if (f.taken === 0) return 'All ' + (f.max === 6 ? 'six' : f.max) + ' places\nare open.';
    if (f.taken === 1) return 'One place\nhas gone.';
    return f.taken + ' places\nhave gone.';
  }
  /* the foot: the time signal, never merged with the count */
  function footnote(f) {
    if (f.closed) return 'Accommodation planning closed';
    var days = f.phase === 'last-day' ? 'Last day' : (f.days === 1 ? '1 day remaining' : f.days + ' days remaining');
    return days + ' · availability may close earlier';
  }
  /* the action follows the guest: a guest already inside their journey is never sent back through the invitation */
  function action() {
    var U = window.SIYL_UNITS, mine = U && U.mine ? U.mine('wedstay') : null;
    if (mine) return { href: 'profile.html#your-stay', words: 'Your stay' };
    if (signedIn()) return { href: 'your-journey.html#stays', words: 'Continue your trip' };
    return { href: 'invitation.html', words: 'Open your invitation' };
  }
  /* the far end of the calendar line, short enough to sit beside it: "30 November 2026" → "30 Nov" */
  function endLabel(words) { var m = /^(\d{1,2})\s+([A-Za-z]{3})/.exec(String(words || '')); return m ? m[1] + ' ' + m[2] : String(words || ''); }

  function html(f) {
    var a = action(), arc = f.max ? f.remaining / f.max : 0, p = Math.min(1, Math.max(0, f.elapsed));
    return '' +
      '<div class="av-in">' +
        '<p class="t-l1 av-eyebrow">Wedding Stay · Limited availability</p>' +
        '<div class="av-row">' +
          '<div class="av-ring" role="img" aria-label="' + esc(f.remaining + ' of ' + f.max + ' complimentary places remaining') + '">' +
            '<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">' +
              '<circle class="av-track" cx="30" cy="30" r="' + R + '"></circle>' +
              '<circle class="av-arc" cx="30" cy="30" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - arc)).toFixed(2) + '" style="--av-c:' + C.toFixed(2) + ';--av-o:' + (C * (1 - arc)).toFixed(2) + '"></circle>' +
            '</svg>' +
            /* 5 / 6 on ONE line, the slash given room; REMAINING small beneath it */
            '<span class="av-count"><span class="av-num"><b>' + f.remaining + '</b><s>/</s><b>' + f.max + '</b></span><i>Remaining</i></span>' +
          '</div>' +
          '<div class="av-words">' +
            '<p class="av-head">' + esc(headline(f)) + '</p>' +
            '<p class="t-b2 av-sub">Complimentary Wedding Stay<br>while places remain.</p>' +
          '</div>' +
        '</div>' +
        '<div class="av-line">' +
          '<span class="t-l1 av-end">Now</span>' +
          '<span class="av-rail" role="img" aria-label="' + esc(f.startWords + ' to ' + f.endWords + ' · ' + Math.round(p * 100) + ' per cent of the planning window has passed') + '">' +
            '<i class="av-run" style="--av-p:' + p.toFixed(4) + '"></i>' +
            '<i class="av-dot" style="--av-p:' + p.toFixed(4) + '"><b></b></i></span>' +
          '<span class="t-l1 av-end">' + esc(endLabel(f.endWords)) + '</span>' +
        '</div>' +
        '<p class="t-b2 av-say">Your invitation shows what is still available for you.</p>' +
        '<p class="av-act">' +
          '<a class="av-cta" href="' + esc(a.href) + '" data-av-cta>' + esc(a.words) + ' <span aria-hidden="true">&rarr;</span></a>' +
          '<a class="av-explore" href="accommodation.html#residence" data-av-explore>See the Guest House <span aria-hidden="true">&rarr;</span></a>' +
        '</p>' +
        '<p class="t-b2 av-foot">' + esc(footnote(f)) + '</p>' +
      '</div>';
  }

  /* ---- the entrance: once, on the first time the object is seen ---------- */
  function play(host) {
    if (host.getAttribute('data-av-played') === '1') return;
    host.setAttribute('data-av-played', '1');
    if (calm()) { host.setAttribute('data-av-state', 'settled'); return; }
    host.setAttribute('data-av-state', 'in');
    setTimeout(function () { host.setAttribute('data-av-state', 'settled'); }, 1500);
  }
  function watch(host) {
    if (calm() || !('IntersectionObserver' in window)) { play(host); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) { play(host); io.disconnect(); } });
    }, { threshold: 0.35 });
    io.observe(host);
  }

  function render(host) {
    if (!host) return;
    var f = facts();
    /* until the engine has answered, the object shows nothing rather than a number it has invented */
    if (!f) { host.innerHTML = ''; host.setAttribute('data-av-state', 'waiting'); return; }
    var played = host.getAttribute('data-av-played') === '1';
    host.setAttribute('data-av-remaining', String(f.remaining));
    host.setAttribute('data-av-max', String(f.max));
    host.setAttribute('data-av-phase', f.phase);
    host.setAttribute('data-av-elapsed', f.elapsed.toFixed(4));
    host.innerHTML = html(f);
    if (played || calm()) host.setAttribute('data-av-state', 'settled');
    else { host.setAttribute('data-av-state', 'ready'); watch(host); }
  }

  function wire() {
    var host = document.querySelector('[data-availability]');
    if (!host) return;
    render(host);
    /* the engine's answer, a sign-in, a place taken elsewhere: the object follows, and never replays its entrance */
    document.addEventListener('siyl:units', function () { render(host); });
    document.addEventListener('siyl:auth', function () { render(host); });
    var today = new Date().getDate();
    setInterval(function () { var d = new Date().getDate(); if (d !== today) { today = d; render(host); } }, 60000);
  }
  window.SIYL_AVAILABILITY = { render: render, wire: wire, facts: facts, headline: headline, footnote: footnote, action: action };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
