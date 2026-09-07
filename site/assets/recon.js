/* Shared shell (header · drawer · footer) + interaction grammar.
   Original implementation — neutral placeholder content only. */
(function () {
  'use strict';

  var PAGES = [
    ['index.html', 'Home'],
    ['voyage.html', 'Journeys'],
    ['destination.html', 'Destinations'],
    ['experiences.html', 'Experiences'],
    ['accommodation.html', 'Accommodation'],
    ['plan.html', 'Plan']
  ];
  var here = location.pathname.split('/').pop() || 'index.html';

  /* ---------- header (fixed · ivory · 3 zones · secondary band) ---------- */
  var header = document.createElement('header');
  header.className = 'hd';
  header.innerHTML =
    '<div class="hd-row">' +
      '<div class="hd-left"><button class="hd-cta" id="menu-open" aria-haspopup="dialog" aria-expanded="false"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span>Menu</button></div>' +
      '<a class="brand" href="index.html">see you in laos.<span class="dot">·</span></a>' +
      '<div class="hd-right">' +
        '<a class="hd-cta boxed ghosted" href="plan.html">Your Journey</a>' +
        '<a class="hd-cta solid" href="#contact">Enter the Journey</a>' +
      '</div>' +
    '</div>' +
    '<nav class="hd-sub" aria-label="Section">' +
      '<div class="hd-sub-row">' +
        '<a class="crumb" href="index.html">see you in laos.</a>' +
        PAGES.map(function (p) {
          return '<a href="' + p[0] + '"' + (p[0] === here ? ' class="on" aria-current="page"' : '') + '>' + p[1] + '</a>';
        }).join('') +
      '</div>' +
    '</nav>';
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
      '<span class="eyebrow">see you in laos.</span>' +
      '<button class="hd-cta" id="menu-close">Close</button>' +
    '</div>' +
    '<div class="drawer-grid">' +
      '<nav class="drawer-nav" aria-label="Primary">' +
        '<a href="index.html">Destinations</a>' +
        '<a href="voyage.html">Journeys</a>' +
        '<div class="drawer-sub">' +
          '<a href="voyage.html">Thailand — Before the Wedding</a>' +
          '<a href="voyage.html">Laos — The Wedding</a>' +
          '<a href="voyage.html">China — After the Wedding</a>' +
          '<a href="voyage.html">All journeys</a>' +
        '</div>' +
        '<a href="destination.html">Destinations</a>' +
        '<a href="experiences.html">Experiences</a>' +
        '<a href="accommodation.html">Accommodation</a>' +
        '<a href="plan.html">Your Journey</a>' +
      '</nav>' +
      '<aside class="drawer-preview">' +
        '<div class="ph r-32" data-ph="Photography to follow · preview 3:2"></div>' +
        '<p class="eyebrow">Featured — placeholder</p>' +
        '<h3>A neutral preview title</h3>' +
      '</aside>' +
    '</div>' +
    '<div class="drawer-foot">' +
      '<a href="#">Parent brand — placeholder</a>' +
      '<a href="#">Contact us — placeholder</a>' +
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
      '<p class="ft-brand">see you in laos.</p>' +
      '<div class="ft-grid">' +
        '<div><h3>Explore</h3><a href="voyage.html">Journeys</a><a href="destination.html">Destinations</a><a href="experiences.html">Experiences</a><a href="accommodation.html">Accommodation</a></div>' +
        '<div><h3>Plan</h3><a href="plan.html">Your Journey</a><a href="#">Enter the Journey — placeholder</a><a href="#">Enquiries — placeholder</a></div>' +
        '<div><h3>Company</h3><a href="#">About — placeholder</a><a href="#">Careers — placeholder</a><a href="#">Press — placeholder</a></div>' +
        '<div><h3>Get inspired</h3><p>Neutral newsletter invitation copy sits here in one short sentence.</p>' +
          '<form class="ft-news" onsubmit="return false"><input type="email" placeholder="Email address" aria-label="Email address"><button class="t-link" type="submit">Subscribe</button></form></div>' +
      '</div>' +
      '<div class="ft-legal"><span>© Placeholder</span><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Cookies</a><a href="#">Accessibility</a></div>' +
    '</div>';
  document.body.append(footer);

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
