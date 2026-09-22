/* ============================================================================
   THE AVAILABILITY OBJECT (Owner approved, 23 Sep 2026 · the first page).

   ONE object that turns two live facts into something the eye reads in a second:
   how many complimentary places of the Private Residence are still free, and
   how far along the way to the planning date we already are.

     WEDDING STAY · LIMITED AVAILABILITY
              ◜ 5 / 6 ◝            the ring: what remains, drawn once
                REMAINING
              One place
              has gone.
     Complimentary Wedding Stay
     Private Residence · Vientiane
        NOW ──●────── 30 NOV       the line: where the allocation stands
     Your invitation shows what is still available for you.
              OPEN YOUR INVITATION →
              Explore the Private Residence →
     69 days remaining · availability may close earlier

   NOTHING HERE IS TYPED TWICE. The count, the ring, the dot's position, the
   words and the days all derive from the room engine (assets/rooms.js) and the
   one stay plan (assets/stay-plan.js). If a place is taken while the page is
   open, the object follows.

   THE ONE ACCENT is Cherry #74070E — the wordmark's own full stop: the ring's
   arc, the line it draws, the dot, its single ripple. Nothing else is coloured.

   MOTION: one entrance on the first viewport entry — the ring draws, the count
   resolves, the line draws, the dot arrives, one ripple, the actions last;
   about 1.5 s in all. Then the object is calm: an extremely quiet breath on the
   dot, never a blink, never an alert, and nothing at all under reduced motion.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function plan() { return window.SIYL_STAY_PLAN || null; }
  function calm() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  function signedIn() { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId); } catch (e) { return false; } }

  var R = 54, C = 2 * Math.PI * R;   /* the ring's radius and circumference, in its own viewBox units */

  /* ---- the facts ---------------------------------------------------------
     `remaining` / `max` are the engine's (never a number written into a page);
     the days and the date are the one stay plan's. */
  function facts() {
    var P = plan(), U = window.SIYL_UNITS;
    if (!P) return null;
    var c = U && U.complimentary ? U.complimentary() : null;
    if (!c || !c.max) return null;
    var d = P.deadlineState(new Date());
    var taken = Math.max(0, c.max - c.remaining);
    return {
      max: c.max, remaining: c.remaining, taken: taken,
      /* the line: how far the allocation has run along the way to the date — kept off both ends so the dot is always on the line */
      position: Math.min(0.92, Math.max(0.08, c.max ? taken / c.max : 0)),
      phase: d.phase, days: d.days, deadlineWords: P.COMPLIMENTARY.deadlineWords,
      closed: !d.open, full: c.remaining <= 0, mine: !!c.mine
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

  function html(f) {
    var a = action(), arc = f.max ? f.remaining / f.max : 0;
    return '' +
      '<div class="av-in">' +
        '<p class="t-l1 av-eyebrow">Wedding Stay · Limited availability</p>' +
        '<div class="av-ring" role="img" aria-label="' + esc(f.remaining + ' of ' + f.max + ' complimentary places remaining') + '">' +
          '<svg viewBox="0 0 128 128" aria-hidden="true" focusable="false">' +
            '<circle class="av-track" cx="64" cy="64" r="' + R + '"></circle>' +
            '<circle class="av-arc" cx="64" cy="64" r="' + R + '" stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + (C * (1 - arc)).toFixed(2) + '" style="--av-c:' + C.toFixed(2) + ';--av-o:' + (C * (1 - arc)).toFixed(2) + '"></circle>' +
          '</svg>' +
          '<span class="av-count"><b>' + f.remaining + '</b> / ' + f.max + '<i>Remaining</i></span>' +
        '</div>' +
        '<p class="av-head">' + esc(headline(f)) + '</p>' +
        '<p class="t-b2 av-sub">Complimentary Wedding Stay<br>Private Residence · Vientiane</p>' +
        '<div class="av-line" aria-hidden="true">' +
          '<span class="t-l1 av-end">Now</span>' +
          '<span class="av-rail"><i class="av-run" style="--av-p:' + f.position.toFixed(3) + '"></i>' +
            '<i class="av-dot" style="--av-p:' + f.position.toFixed(3) + '"><b></b></i></span>' +
          '<span class="t-l1 av-end">30 Nov</span>' +
        '</div>' +
        '<p class="t-b1 av-say">Your invitation shows what is still available for you.</p>' +
        '<p class="av-act"><a class="av-cta" href="' + esc(a.href) + '" data-av-cta>' + esc(a.words) + ' <span aria-hidden="true">&rarr;</span></a></p>' +
        '<p class="av-act av-second"><a class="av-explore" href="accommodation.html#residence" data-av-explore>Explore the Private Residence <span aria-hidden="true">&rarr;</span></a></p>' +
        '<p class="t-b2 av-foot">' + esc(footnote(f)) + '</p>' +
      '</div>';
  }

  /* ---- the entrance: once, on the first time the object is seen ---------- */
  function play(host) {
    if (host.getAttribute('data-av-played') === '1') return;
    host.setAttribute('data-av-played', '1');
    if (calm()) { host.setAttribute('data-av-state', 'settled'); return; }
    host.setAttribute('data-av-state', 'in');
    /* the ring draws, the count resolves, the line draws, the dot arrives, one ripple, the actions last */
    setTimeout(function () { host.setAttribute('data-av-state', 'settled'); }, 1700);
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
