/* ============================================================================
   THE ACCOMMODATION BAR (Owner, 22 Sep 2026 · the first page).

   One quiet line of journey information: the complimentary accommodation is
   planned by a date, and the guest should learn that at a glance — never from
   a countdown that shouts. The bar reads the ONE rule (assets/stay-plan.js) for
   the deadline and, for a signed-in guest, the engine (assets/rooms.js) for how
   many of the six places are actually left and whether that guest already has a
   stay. Nothing here is typed twice: no number, no date, no state.

     ACCOMMODATION PLANNING
     Closes 30 November 2026
     · 182 days remaining ·            → the last day: "Last day"
     [ Plan your stay ]                → afterwards: "Accommodation planning closed"

   The count is computed from today, recomputed when the day turns, and never
   negative. The call to action follows the guest: a stay already confirmed opens
   My Profile, everyone else the planning flow — and when the complimentary
   allocation is closed or full the paid rooms are still one tap away, never a
   dead end. Presentation only: no storage, no booking, no timer of its own
   beyond the turn of the day.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function plan() { return window.SIYL_STAY_PLAN || null; }
  function signedIn() { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId); } catch (e) { return false; } }

  /* the guest's own state, as far as this device can honestly tell */
  function stayState() {
    var U = window.SIYL_UNITS;
    var c = U && U.complimentary ? U.complimentary() : null;
    var mine = U && U.mine ? U.mine('wedstay') : null;
    return { comp: c, hasStay: !!mine, ext: U && U.extension ? U.extension() : null };
  }

  function render(host) {
    var P = plan(); if (!P || !host) return;
    var d = P.deadlineState(new Date()), s = stayState();
    var closed = !d.open, full = !!(s.comp && s.comp.full);
    var count = closed ? 'Accommodation planning closed' : (d.phase === 'last-day' ? 'Last day' : d.words);
    /* the places left, when the engine has answered and the allocation is still open */
    var places = '';
    if (s.comp && s.comp.max) {
      var w = P.complimentaryWords(s.comp.remaining, s.comp.max, new Date());
      places = w.headline;
    }
    var cta = s.hasStay ? { href: 'profile.html#your-stay', words: 'Your stay' }
      : (closed || full) ? { href: 'accommodation.html', words: 'See the rooms' }
      : { href: signedIn() ? 'your-journey.html#stays' : 'invitation.html', words: 'Plan your stay' };
    host.setAttribute('data-stay-phase', closed ? 'closed' : d.phase);
    host.setAttribute('data-stay-days', String(d.days));
    host.innerHTML =
      '<div class="sbar-in">' +
        '<div class="sbar-words">' +
          '<p class="t-l1 sbar-eyebrow">Accommodation planning</p>' +
          '<p class="sbar-line">' + (closed ? esc(count) : 'Closes ' + esc(P.COMPLIMENTARY.deadlineWords)) + '</p>' +
          (places ? '<p class="t-b2 sbar-places">' + esc(places) + '</p>' : '') +
        '</div>' +
        (closed ? '' : '<p class="sbar-count" data-stay-count aria-live="polite">' + esc(count) + '</p>') +
        '<a class="sbar-cta" href="' + esc(cta.href) + '" data-stay-cta>' + esc(cta.words) + '</a>' +
      '</div>';
  }

  function wire() {
    var host = document.querySelector('[data-stay-bar]');
    if (!host) return;
    render(host);
    /* the engine's answer (and a sign-in) rewrites the line; nothing polls */
    document.addEventListener('siyl:units', function () { render(host); });
    document.addEventListener('siyl:auth', function () { render(host); });
    /* the day turns: the count is recomputed once, never every second */
    var today = new Date().getDate();
    setInterval(function () { var d = new Date().getDate(); if (d !== today) { today = d; render(host); } }, 60000);
  }
  window.SIYL_STAY_BAR = { render: render, wire: wire };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
