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

     BOTH WEDDING NIGHTS · 27 FEBRUARY – 1 MARCH
     ╭─────╮   One place
     │ 3/4 │   has gone.            (a guest holding a place: "One of the four / is yours.")
     ╰─────╯   Hosted by Haruthai & Suthep,
       LEFT    while places remain.
     Now ●──────────────────── 30 Nov
     Your invitation shows what is still open to you.
     OPEN YOUR INVITATION →      See the Guest House →
     Until 30 November, or until the four places are taken.   (closed: "Every other stay can still be chosen.")

   THE NAMES ARE THE PROJECT'S OWN (Owner, 23 Sep 2026): the house is the
   "Guest House complimentary" the booking engine knows. "Private Residence" was
   never approved terminology and appears nowhere in this component.

   NOTHING IS TYPED TWICE. The count is the room engine's; the days, both ends
   of the window and the share of it already run are the one stay plan's.

   THE COMPLIMENTARY STAY FIRST (Owner, 4 Oct 2026 — supersedes "the Wedding
   Stay first" of 27 Sep): guests overlooked the free house as a small ring
   beneath the hotel. It is now its own card, BEFORE the Wedding Stay: the
   house's own photograph (its assigned main image), COMPLIMENTARY STAY, the
   free places left (the engine's live count), the dates and nights (the one
   stay plan), "Hosted by Haruthai & Suthep · USD 0", and one call — CLAIM YOUR
   COMPLIMENTARY PLACE — into the existing flow, offered only where the existing
   rules let this guest take a place. Then the Wedding Stay, as before.

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
  /* THE WEDDING STAY FIRST (Owner, 27 Sep 2026): the rooms of the Wedding Stay at the Souphattra Heritage still free — a ROOM count
     (a room nobody holds a place in, the engine's own emptyRooms), never guest places, never the participants; of the physical rooms
     the engine knows (its source inventory, sourceRooms). The engine's view is the booking system's own: nothing is typed here. */
  function stayRooms() {
    var U = window.SIYL_UNITS, v = U && U.view ? U.view() : null;
    if (!v || !v.summary) return null;
    var keys = Object.keys(v.summary).filter(function (k) { return /^wedstay\//.test(k); });
    if (!keys.length) return null;
    var free = 0, total = 0;
    for (var i = 0; i < keys.length; i++) {
      var s = v.summary[keys[i]];
      if (!s || typeof s.sourceRooms !== 'number') return null;          /* a category the engine did not describe: unknown, never 0 */
      total += s.sourceRooms; free += typeof s.emptyRooms === 'number' ? s.emptyRooms : (s.remainingRooms || 0);
    }
    return { available: free, total: total };
  }
  function facts() {
    var P = plan(), U = window.SIYL_UNITS;
    if (!P) return null;
    var c = U && U.complimentary ? U.complimentary() : null, stay = stayRooms();
    if ((!c || !c.max) && !stay) return null;
    if (!c || !c.max) c = null;
    var w = P.planningWindow(new Date());
    if (!c) return { stay: stay, gh: false, elapsed: w.progress, startWords: w.startWords, endWords: w.endWords, phase: w.phase, days: w.days, deadlineWords: P.COMPLIMENTARY.deadlineWords, railWords: P.railWords ? P.railWords(new Date()) : w.words, closed: !w.open, full: false, mine: false, max: 0, remaining: 0, taken: 0 };
    var g = U && U.guestHouse ? U.guestHouse() : null;
    return { stay: stay, gh: true,
      /* may THIS guest take a place, by the existing rules (the engine's own canTake: open, not theirs already, fits the party) */
      canTake: !!(g && g.canTake),
      max: c.max, remaining: c.remaining, taken: Math.max(0, c.max - c.remaining),
      /* THE LINE IS CALENDAR TIME, never the allocation — the ring already says what is left */
      elapsed: w.progress,
      startWords: w.startWords, endWords: w.endWords,
      phase: w.phase, days: w.days, deadlineWords: P.COMPLIMENTARY.deadlineWords,
      railWords: P.railWords ? P.railWords(new Date()) : w.words,
      closed: !w.open, full: c.remaining <= 0, mine: !!c.mine
    };
  }
  /* the one line that changes with the count — the Owner's sentence, spoken by the data.
     The break is a real line break kept by the stylesheet (white-space: pre-line), never a <br>: the sentence stays
     ONE text node, so the site's dictionary can translate it whole instead of in fragments that no grammar survives. */
  var WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  function num(n) { return WORDS[n] || String(n); }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
  function headline(f) {
    /* THE GUEST'S OWN PLACE IS NEVER COUNTED AS GONE (PRQ-03-06 · W7-113): a guest who holds one of the places reads it */
    if (f.mine) return 'One of the ' + num(f.max) + '\nis yours.';
    if (f.full) return 'Every place\nhas gone.';
    if (f.taken === 0) return 'All ' + num(f.max) + ' places\nare open.';
    if (f.taken === 1) return 'One place\nhas gone.';
    return cap(num(f.taken)) + ' places\nhave gone.';
  }
  /* the foot: the time signal, never merged with the count — the closing itself is said once, in the stay bar (L-01) */
  function footnote(f) {
    if (f.closed) return 'Every other stay can still be chosen.';
    return 'Available until ' + String(f.deadlineWords || '') + ' or until all ' + num(f.max) + ' places are taken.';
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

  /* ---- THE COMPLIMENTARY STAY (Owner, 4 Oct 2026) ----------------------------------------------------------------------------- */
  /* the house's assigned main image — the accommodation card's, the Bag's, the first photograph of its gallery (rooms-data) */
  var GH_IMG = 'assets/images/guesthouse/guesthouse-01.jpg';
  /* the count, in one sentence the dictionary can translate whole: "2 free places left" · "1 free place left" (the engine's number) */
  function freeWords(n) { return n === 1 ? '1 free place left' : n + ' free places left'; }
  /* the state when no place can be claimed: said plainly, from the engine's own numbers — never a typed capacity */
  function ghState(f) {
    if (f.mine) return 'One of the places is yours';
    if (f.full || f.remaining <= 0) return 'All ' + num(f.max) + ' places are taken.';
    if (f.closed) return 'Closed on ' + f.deadlineWords + ' — new places can no longer be taken.';
    return '';
  }
  /* the one call of the card: CLAIM only where the existing rules let this guest take a place (signed out: the invitation first —
     the claim itself always needs it); a guest who holds one sees it; otherwise the house, never a claim */
  function ghAction(f) {
    if (f.mine) return { href: 'journeys.html#j-guesthouse', words: 'See your place', claim: false };
    if (f.closed || f.full || f.remaining <= 0) return { href: 'accommodation.html#residence', words: 'See the Guest House', claim: false };
    /* the existing flows only: signed in, the Guest House's own "Take a place" (journeys.html#j-guesthouse — the engine decides),
       offered only where the existing canTake allows it; signed out, the existing sign-in first (on journeys.html the house's claim
       controls are private, so a signed-out visitor would find no way on there) */
    if (!signedIn()) return { href: 'invitation.html?open=1', words: 'Claim your complimentary place', claim: true };
    if (f.canTake) return { href: 'journeys.html#j-guesthouse', words: 'Claim your complimentary place', claim: true };
    return { href: 'accommodation.html#residence', words: 'See the Guest House', claim: false };
  }
  function ghCard(f) {
    var P = plan(), C = (P && P.COMPLIMENTARY) || {}, a = ghAction(f), state = ghState(f), p = Math.min(1, Math.max(0, f.elapsed));
    var nights = C.nights ? C.nights + (C.nights === 1 ? ' night' : ' nights') : '';
    return '<article class="av-gh" data-av-gh="' + f.remaining + '/' + f.max + '" data-av-claim="' + (a.claim ? '1' : '0') + '">' +
      '<img class="av-gh-img" src="' + GH_IMG + '" width="1600" height="1200" alt="The living and dining room of the Guest House in downtown Vientiane" loading="lazy" decoding="async">' +
      '<div class="av-gh-body">' +
        '<p class="t-l1 av-gh-eyebrow">Complimentary stay</p>' +
        (state ? '<p class="av-gh-free is-state">' + esc(state) + '</p>' : '<p class="av-gh-free" data-av-free="' + f.remaining + '">' + esc(freeWords(f.remaining)) + '</p>') +
        '<p class="t-b2 av-gh-where" data-i18n-parts><span>Guest House</span> · <span>' + esc(C.dates || '') + '</span></p>' +
        (nights ? '<p class="t-b2 av-gh-nights">' + esc(nights) + '</p>' : '') +
        '<p class="t-b2 av-gh-host" data-i18n-parts><span>Hosted by Haruthai &amp; Suthep</span> · <strong class="av-gh-price">USD 0</strong></p>' +
        '<p class="av-act"><a class="av-cta' + (a.claim ? ' av-claim' : '') + '" href="' + esc(a.href) + '" data-av-gh-cta>' + esc(a.words) + ' <span aria-hidden="true">&rarr;</span></a></p>' +
        '<div class="av-line">' +
          '<span class="t-l1 av-end">Now</span>' +
          '<span class="av-rail" role="img" aria-label="' + esc(f.railWords) + '">' +
            '<i class="av-run" style="--av-p:' + p.toFixed(4) + '"></i>' +
            '<i class="av-dot" style="--av-p:' + p.toFixed(4) + '"><b></b></i></span>' +
          '<span class="t-l1 av-end">' + esc(endLabel(f.endWords)) + '</span>' +
        '</div>' +
        '<p class="t-b2 av-foot">' + esc(footnote(f)) + '</p>' +
      '</div></article>';
  }
  function html(f) {
    var a = action(), st = f.stay;
    var rooms = st ? '<div class="av-stay" data-av-rooms="' + st.available + '" data-av-rooms-total="' + st.total + '">' +
        '<p class="av-rooms" role="img" aria-label="' + esc(st.available + ' / ' + st.total) + '"><b>' + st.available + '</b>' + (st.total ? '<span class="av-of">/ ' + st.total + '</span>' : '') + '</p>' +
        '<p class="av-cap">' + (st.available > 0 ? 'Rooms available' : 'Sold out') + '</p>' +
      '</div><p class="t-b2 av-where">Souphattra Heritage · 27 February – 1 March</p>' : '';
    /* the free stay first, then the Wedding Stay — each with its own call */
    return '' +
      '<div class="av-in">' +
        (f.gh ? ghCard(f) : '') +
        (st ? '<div class="av-ws">' +
          '<p class="t-l1 av-eyebrow">Wedding Stay · Vientiane</p>' +
          rooms +
          '<p class="t-b2 av-say">Your invitation shows the rooms currently open to you.</p>' +
          '<p class="av-act"><a class="av-cta" href="' + esc(a.href) + '" data-av-cta>' + esc(a.words) + ' <span aria-hidden="true">&rarr;</span></a></p>' +
        '</div>' : '') +
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
    host.setAttribute('data-av-remaining', f.gh ? String(f.remaining) : '');
    host.setAttribute('data-av-max', f.gh ? String(f.max) : '');
    host.setAttribute('data-av-rooms', f.stay ? String(f.stay.available) : '');
    host.setAttribute('data-av-phase', f.phase);
    host.setAttribute('data-av-elapsed', f.elapsed.toFixed(4));
    host.innerHTML = html(f);
    if (played || calm()) host.setAttribute('data-av-state', 'settled');
    else { host.setAttribute('data-av-state', 'ready'); watch(host); }
  }

  /* every host of the object on the page: the section of the first page, and the Wedding Pulse's own place for a guest */
  function all() { [].slice.call(document.querySelectorAll('[data-availability]')).forEach(function (h) { render(h); }); }
  function wire() {
    if (!document.querySelector('[data-availability]')) return;
    all();
    /* the engine's answer, a sign-in, a place taken elsewhere: the object follows, and never replays its entrance */
    document.addEventListener('siyl:units', all);
    document.addEventListener('siyl:auth', all);
    var today = new Date().getDate();
    setInterval(function () { var d = new Date().getDate(); if (d !== today) { today = d; all(); } }, 60000);
  }
  window.SIYL_AVAILABILITY = { render: render, wire: wire, facts: facts, stayRooms: stayRooms, ghState: ghState, ghAction: ghAction, freeWords: freeWords, headline: headline, footnote: footnote, action: action };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
