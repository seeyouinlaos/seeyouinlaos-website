/* ============================================================================
   THE ACCOMMODATION BAR (Owner, 22 Sep 2026 · the first page).

   One quiet line of journey information: the complimentary accommodation is
   planned by a date, and the guest should learn that at a glance — never from
   a countdown that shouts. The bar reads the ONE rule (assets/stay-plan.js) for
   the deadline. Nothing here is typed twice: no number, no date, no state.

     ACCOMMODATION PLANNING
     Closes 30 November 2026            182 DAYS REMAINING
     ─────────●──────────────────       → the last day: "Last day"
                                        → afterwards: "Accommodation planning closed"

   The count is computed from today, recomputed when the day turns, and never
   negative. This bar carries the DATE alone (Owner, 23 Sep 2026): the places
   remaining, the invitation and the property live in the availability object
   below it, so the guest reads two distinct signals and meets one action.

   THE PROGRESS RULE (Owner, 23 Sep 2026) is one hairline: the neutral track of
   the page, the part already run in Cherry, one small Cherry point where today
   stands. It is the SAME calendar calculation the availability object's line
   uses (assets/stay-plan.js · planningWindow) — 23 September 2026 to the end of
   30 November 2026 — so the two never disagree. It is a rule, not a widget: no
   chrome, no label of its own, no second countdown.

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
    var w = P.planningWindow(new Date());
    var closed = !w.open;
    var count = closed ? 'Accommodation planning closed' : (w.phase === 'last-day' ? 'Last day' : w.words);
    var p = Math.min(1, Math.max(0, w.progress));
    host.setAttribute('data-stay-phase', closed ? 'closed' : w.phase);
    host.setAttribute('data-stay-days', String(w.days));
    host.setAttribute('data-stay-elapsed', p.toFixed(4));
    host.innerHTML =
      '<div class="sbar-in">' +
        '<div class="sbar-words">' +
          '<p class="t-l1 sbar-eyebrow">Accommodation planning</p>' +
          '<p class="sbar-line">' + (closed ? esc(count) : 'Closes ' + esc(P.COMPLIMENTARY.deadlineWords)) + '</p>' +
        '</div>' +
        (closed ? '' : '<p class="sbar-count" data-stay-count aria-live="polite">' + esc(count) + '</p>') +
        /* the one hairline: the same calendar window the availability object draws, never a second metric */
        '<span class="sbar-rail" data-stay-rail role="img" aria-label="' + esc(w.startWords + ' to ' + w.endWords + ' · ' + Math.round(p * 100) + ' per cent of the planning window has passed') + '">' +
          '<i class="sbar-run" style="--sb-p:' + p.toFixed(4) + '"></i>' +
          '<i class="sbar-dot" style="--sb-p:' + p.toFixed(4) + '"></i>' +
        '</span>' +
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
