/* ============================================================================
   THE ACCOMMODATION BAR (Owner, 22 Sep 2026 · the first page).

   One quiet line of journey information: the complimentary accommodation is
   planned by a date, and the guest should learn that at a glance — never from
   a countdown that shouts. The bar reads the ONE rule (assets/stay-plan.js) for
   the deadline. Nothing here is typed twice: no number, no date, no state.

     ACCOMMODATION PLANNING
     Closes 30 November 2026
     · 182 days remaining ·            → the last day: "Last day"
                                       → afterwards: "Accommodation planning closed"

   The count is computed from today, recomputed when the day turns, and never
   negative. This bar carries the DATE alone (Owner, 23 Sep 2026): the places
   remaining, the invitation and the property live in the availability object
   below it, so the guest reads two distinct signals and meets one action.
   Presentation only: no storage, no booking, no timer of its own beyond the
   turn of the day.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function plan() { return window.SIYL_STAY_PLAN || null; }

  /* THE FIRST SIGNAL ONLY (Owner approved, 23 Sep 2026): this bar states how long the whole accommodation planning window
     lasts — the date and the days, nothing else. The live scarcity of the complimentary places and the actions belong to the
     availability object beneath it (assets/availability.js); the two signals are never merged and never compete for the tap. */
  function render(host) {
    var P = plan(); if (!P || !host) return;
    var d = P.deadlineState(new Date());
    var closed = !d.open;
    var count = closed ? 'Accommodation planning closed' : (d.phase === 'last-day' ? 'Last day' : d.words);
    host.setAttribute('data-stay-phase', closed ? 'closed' : d.phase);
    host.setAttribute('data-stay-days', String(d.days));
    host.innerHTML =
      '<div class="sbar-in">' +
        '<div class="sbar-words">' +
          '<p class="t-l1 sbar-eyebrow">Accommodation planning</p>' +
          '<p class="sbar-line">' + (closed ? esc(count) : 'Closes ' + esc(P.COMPLIMENTARY.deadlineWords)) + '</p>' +
        '</div>' +
        (closed ? '' : '<p class="sbar-count" data-stay-count aria-live="polite">' + esc(count) + '</p>') +
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
