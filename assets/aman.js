/* ============================================================================
   SEE YOU IN LAOS — shared Aman-grammar behaviour.
   ONE full-screen menu and ONE horizontal carousel for the whole website,
   editorial shell and shop shell alike. Presentation only: no commerce, no
   pricing, no persistence — the Journey engine is untouched.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- menu
     Single column · hairline rows · chevron only where a submenu exists.
     The navigation truth of the public website — the internal engine
     (register/) is deliberately absent from every guest surface. */
  var NAV = [
    ['Destinations', 'destination.html', [
      ['Bangkok', 'destination.html#bangkok'],
      ['Vientiane', 'destination.html#vientiane'],
      ['Kunming &amp; Lijiang', 'destination.html#china']
    ]],
    ['Journeys', 'journeys.html', [
      ['Before the Wedding', 'journeys.html#j-bkk-stay'],
      ['The Wedding', 'journeys.html#j-wedstay'],
      ['After the Wedding', 'journeys.html#j-mu9632']
    ]],
    ['Stays', 'accommodation.html', [
      ['Sathorn Penthouse Bangkok', 'room.html?stay=sathorn&room=penthouse'],
      ['Souphattra Heritage Vientiane', 'journeys.html#j-prewed'],
      ['Private Residence Vientiane', 'room.html?stay=airbnb&room=private-residence'],
      ['Wanxiang Yueju Kunming', 'journeys.html#j-kmg'],
      ['Luye Baisha Lijiang', 'journeys.html#j-ljg'],
      ['Siam Kempinski Bangkok', 'journeys.html#j-kempinski']
    ]],
    ['Experiences', 'experiences.html', [
      ['Bangkok', 'experiences.html#bkk'],
      ['Vientiane', 'experiences.html#laos'],
      ['Kunming &amp; Lijiang', 'experiences.html#china'],
      ['1872 · Champagne Afternoon Tea', '1872.html']
    ]],
    ['Wellness', 'marsilea.html', null],
    ['The Wedding', 'voyage.html', [
      ['Temple Ceremony', 'voyage.html#temple'],
      ['Coffee &amp; Cake', 'voyage.html#coffee'],
      ['Vow Ceremony', 'voyage.html#vows'],
      ['Wedding Dinner', 'voyage.html#dinner']
    ]],
    ['Your Journey', 'your-journey.html', null]
  ];

  var here = location.pathname.split('/').pop() || 'index.html';

  function buildMenu() {
    if (document.querySelector('.a-menu')) return;
    var scrim = document.createElement('div');
    scrim.className = 'a-scrim';
    var menu = document.createElement('div');
    menu.className = 'a-menu';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    menu.setAttribute('aria-label', 'Menu');

    var rows = NAV.map(function (n, i) {
      var cur = (n[1].split('#')[0] === here) ? ' aria-current="page"' : '';
      var row = '<div class="a-mrow"><a href="' + n[1] + '"' + cur + '>' + n[0] + '</a>' +
        (n[2] ? '<button type="button" class="a-ch" aria-expanded="false" aria-controls="a-sub-' + i +
          '" aria-label="Show ' + n[0].replace(/&amp;/g, 'and') + ' sections">&rsaquo;</button>' : '') +
        '</div>';
      if (n[2]) {
        row += '<div class="a-msub" id="a-sub-' + i + '">' +
          n[2].map(function (s) { return '<a href="' + s[1] + '">' + s[0] + '</a>'; }).join('') +
          '</div>';
      }
      return row;
    }).join('');

    menu.innerHTML =
      '<div class="a-mhd">' +
        '<a class="a-brand" href="index.html">see you in laos<span class="dot">.</span></a>' +
        '<button type="button" class="a-mx">Close</button>' +
      '</div>' +
      '<nav class="a-mnav" aria-label="Primary">' + rows + '</nav>' +
      '<div class="a-mfoot">' +
        '<p>Guest Relations</p>' +
        '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a>' +
        '<a href="review.html">Review &amp; Send</a>' +
      '</div>';
    document.body.append(scrim, menu);

    function set(open) {
      document.body.classList.toggle('a-open', open);
      var t = document.querySelector('.hb, #menu-open');
      if (t) t.setAttribute('aria-expanded', String(open));
      if (open) menu.querySelector('.a-mx').focus();
      else if (t) t.focus();
    }
    menu.querySelector('.a-mx').addEventListener('click', function () { set(false); });
    scrim.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('a-open')) set(false);
    });
    menu.querySelectorAll('.a-ch').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var on = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!on));
        document.getElementById(btn.getAttribute('aria-controls')).classList.toggle('on', !on);
      });
    });
    /* keep focus inside the open menu */
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = menu.querySelectorAll('a[href], button:not([disabled])');
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    document.querySelectorAll('.hb, #menu-open').forEach(function (b) {
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function (e) { e.preventDefault(); set(true); });
    });
  }

  /* ------------------------------------------------------------- carousel
     Active slide is full colour and in focus; every neighbour carries the pale
     veil. The state follows the actual scroll position and changes discretely
     at the snap, never as a continuous gradient. */
  function wire(car) {
    var trk = car.querySelector('.atrk');
    var slides = Array.prototype.slice.call(car.querySelectorAll('.aslide'));
    if (!trk || slides.length < 2) { if (slides[0]) slides[0].classList.add('on'); return; }
    var bar = car.querySelector('.arail i');
    var prev = car.querySelector('[data-a="prev"]');
    var next = car.querySelector('[data-a="next"]');
    var i = -1, tick = 0;

    if (bar) bar.style.width = (100 / slides.length) + '%';
    trk.setAttribute('tabindex', '0');
    trk.setAttribute('role', 'group');
    trk.setAttribute('aria-label', 'Use the arrow keys to move between slides');

    function step() {
      var a = slides[0].getBoundingClientRect();
      var b = slides[1] ? slides[1].getBoundingClientRect() : a;
      return Math.round(b.left - a.left) || Math.round(a.width);
    }
    function index() {
      var max = trk.scrollWidth - trk.clientWidth;
      if (max <= 0) return 0;
      if (trk.scrollLeft >= max - 2) return slides.length - 1;   /* the end always lands on the last */
      return Math.max(0, Math.min(slides.length - 1, Math.round(trk.scrollLeft / step())));
    }
    function paint() {
      var n = index();
      if (n === i) return;
      i = n;
      slides.forEach(function (s, k) {
        s.classList.toggle('on', k === n);
        s.setAttribute('aria-hidden', 'false');
      });
      if (bar) bar.style.transform = 'translateX(' + (n * 100) + '%)';
      if (prev) prev.disabled = n === 0;
      if (next) next.disabled = n === slides.length - 1;
    }
    trk.addEventListener('scroll', function () {
      if (tick) return;
      tick = requestAnimationFrame(function () { tick = 0; paint(); });
    }, { passive: true });
    function go(d) { trk.scrollBy({ left: d * step(), behavior: 'smooth' }); }
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
    trk.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    window.addEventListener('resize', function () { i = -1; paint(); });
    paint();
  }

  function init() {
    buildMenu();
    document.querySelectorAll('.acar').forEach(wire);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
