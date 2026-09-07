/* Shared shell (header · drawer · footer) + interaction grammar.
   Original implementation — neutral placeholder content only. */
(function () {
  'use strict';

  var PAGES = [
    ['index.html', 'Home'],
    ['journeys.html', 'Journeys'],
    ['destination.html', 'Destinations'],
    ['marsilea.html', 'Marsilea Spa'],
    ['1872.html', '1872 · Afternoon Tea'],
    ['your-journey.html', 'Your Journey'],
    ['review.html', 'Review & Send']
  ];
  var here = location.pathname.split('/').pop() || 'index.html';

  /* ---------- header (fixed · ivory · 3 zones · secondary band) ---------- */
  var header = document.createElement('header');
  header.className = 'hd';
  header.innerHTML =
    '<div class="hd-row">' +
      '<div class="hd-left"><button class="hd-cta" id="menu-open" aria-haspopup="dialog" aria-expanded="false"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button></div>' +
      '<a class="brand" href="index.html">see you in laos<span class="dot">.</span></a>' +
      '<div class="hd-right"><a class="hd-cta bag" href="your-journey.html" aria-label="Your Journey"><svg class="bgi" viewBox="0 0 26 26" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4.7 10h16.6l-1.05 11.8a1.1 1.1 0 0 1-1.1 1H6.85a1.1 1.1 0 0 1-1.1-1z"/><path d="M7.6 10V7.9a2.4 2.4 0 0 1 4.8 0V10"/><path d="M13.6 10V7.9a2.4 2.4 0 0 1 4.8 0V10"/><path d="M5.3 14.4h15.4"/><rect x="11.7" y="13.1" width="2.6" height="2.6" rx=".3"/></svg><span class="bb" data-bag-badge></span></a></div>' +
    '</div>' +
    '';
  document.body.prepend(header);

  /* sync content offset with the real header height (target ≈117px desktop) */
  function syncHeader() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  window.addEventListener('resize', syncHeader);
  syncHeader();

  /* ---------- drawer (full-screen scrim · sliding panel · nav + contextual preview) ---------- */
  var scrim = document.createElement('div');
  scrim.className = 'drawer-scrim';
  var drawer = document.createElement('div');
  drawer.className = 'drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', 'Menu');
  drawer.innerHTML =
    '<div class="drawer-head">' +
      '<span class="eyebrow">see you in laos<span class="dot">.</span></span>' +
      '<button class="hd-cta" id="menu-close">Close</button>' +
    '</div>' +
    '<div class="drawer-grid">' +
      '<nav class="drawer-nav" aria-label="Primary">' +
        PAGES.map(function (p) {
          return '<a href="' + p[0] + '"' + (here === p[0] ? ' aria-current="page"' : '') + '>' + p[1] + '</a>';
        }).join('') +
      '</nav>' +
      '<aside class="drawer-preview">' +
        '<div class="ph r-32" style="background:url(assets/images/city/002-vientiane-patuxai-twilight.jpg) center/cover no-repeat"></div>' +
        '<p class="eyebrow">Sunday, 28 February 2027</p>' +
        '<h3>Vientiane, Laos</h3>' +
      '</aside>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a>' +
    '</div>';
  document.body.append(scrim, drawer);

  var openBtn = header.querySelector('#menu-open');
  function setDrawer(open) {
    document.body.classList.toggle('drawer-open', open);
    openBtn.setAttribute('aria-expanded', String(open));
    if (open) drawer.querySelector('#menu-close').focus();
    else openBtn.focus();
  }
  openBtn.addEventListener('click', function () { setDrawer(true); });
  drawer.querySelector('#menu-close').addEventListener('click', function () { setDrawer(false); });
  scrim.addEventListener('click', function () { setDrawer(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('drawer-open')) setDrawer(false);
  });

  /* ---------- footer (brand · columns · newsletter · legal) ---------- */
  var footer = document.createElement('footer');
  footer.id = 'contact';
  footer.innerHTML =
    '<div class="ft">' +
      '<p class="ft-brand">see you in laos<span class="dot">.</span></p>' +
      '<div class="ft-grid">' +
        '<div><h3>Explore</h3><a href="journeys.html">Journeys</a><a href="destination.html">Destinations</a><a href="marsilea.html">Marsilea Spa</a><a href="1872.html">1872 · Afternoon Tea</a></div>' +
        '<div><h3>Plan</h3><a href="your-journey.html">Your Journey</a><a href="review.html">Review & Send</a></div>' +
        '<div><h3>Guest Relations</h3><a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a></div>' +
      '</div>' +
      '<div class="ft-legal"><span>Sunday, 28 February 2027 · Vientiane, Laos</span></div>' +
    '</div>';
  document.body.append(footer);
  var badgeScript = document.createElement('script');
  badgeScript.src = 'assets/bag.js';
  document.body.appendChild(badgeScript);

  /* ---------- rails: prev/next controls scroll by one slide ---------- */
  document.querySelectorAll('[data-rail]').forEach(function (wrap) {
    var rail = wrap.querySelector('.rail');
    wrap.querySelectorAll('[data-rail-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var step = rail.firstElementChild ? rail.firstElementChild.getBoundingClientRect().width + 40 : 400;
        rail.scrollBy({ left: btn.dataset.railBtn === 'next' ? step : -step, behavior: 'smooth' });
      });
    });
  });

  /* ---------- anchor rail: highlight section in view ---------- */
  var railLinks = document.querySelectorAll('.anchor-rail a');
  if (railLinks.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          railLinks.forEach(function (a) {
            a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id);
          });
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    railLinks.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) io.observe(t);
    });
  }

  /* ---------- planning pattern: multi-select options + running summary ---------- */
  var wiz = document.querySelector('.wizard');
  if (wiz) {
    var sum = wiz.querySelector('.w-summary');
    function refresh() {
      var picked = Array.prototype.map.call(
        wiz.querySelectorAll('.w-opt[aria-pressed="true"]'),
        function (b) { return b.textContent.trim(); });
      sum.textContent = picked.length
        ? 'Your selection — ' + picked.join(' · ')
        : 'Your selection — nothing chosen yet';
    }
    wiz.querySelectorAll('.w-opt').forEach(function (b) {
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        refresh();
      });
    });
    refresh();
  }
})();
