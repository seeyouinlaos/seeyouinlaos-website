/* Shared editorial shell (header · footer) + interaction grammar.
   The full-screen menu and the horizontal carousel are shared with the shop
   surfaces and live in assets/aman.js — ONE visual website. */
(function () {
  'use strict';

  /* ---------- header (sticky · ivory · hamburger · wordmark · bag) ---------- */
  var header = document.createElement('header');
  header.className = 'hd';
  header.innerHTML =
    '<div class="hd-row">' +
      '<div class="hd-left"><button class="hd-cta" id="menu-open" aria-label="Menu" aria-haspopup="dialog" aria-expanded="false"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></button></div>' +
      '<a class="brand" href="index.html">see you in laos<span class="dot">.</span></a>' +
      '<div class="hd-right"><a class="hd-cta bag" href="your-journey.html" aria-label="Your Journey"><svg class="bgi" viewBox="0 0 26 26" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5.1 10.1h15.8a.9.9 0 0 1 .9 1l-.95 10.6a1.6 1.6 0 0 1-1.6 1.45H6.75a1.6 1.6 0 0 1-1.6-1.45L4.2 11.1a.9.9 0 0 1 .9-1z"/><path d="M8 10.1V8.3a2.5 2.5 0 0 1 5 0v1.8"/><path d="M13.4 10.1V8.3a2.5 2.5 0 0 1 5 0v1.8"/><path d="M5.6 14.2h14.8"/><path d="M12.2 13.2h1.6a.5.5 0 0 1 .5.5v1.6a.5.5 0 0 1-.5.5h-1.6a.5.5 0 0 1-.5-.5v-1.6a.5.5 0 0 1 .5-.5z"/></svg><span class="bb" data-bag-badge></span></a></div>' +
    '</div>' +
    '';
  document.body.prepend(header);

  /* sync content offset with the real header height (target ≈117px desktop) */
  function syncHeader() {
    document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px');
  }
  window.addEventListener('resize', syncHeader);
  syncHeader();

  /* the full-screen menu itself lives in assets/aman.js — ONE menu for the
     whole website. This shell only supplies the hamburger it binds to. */

  /* ---------- footer: the shared editorial footer, one system with the shop --- */
  var footer = document.createElement('footer');
  footer.className = 'sfoot';
  footer.id = 'contact';
  footer.innerHTML =
    '<div class="sfoot-in">' +
      '<div><p class="sf-brand">see you in laos<span class="dot">.</span></p></div>' +
      '<div><h4>Discover</h4>' +
        '<a href="destination.html">Destinations</a><a href="journeys.html">Journeys</a>' +
        '<a href="accommodation.html">Stays</a><a href="experiences.html">Experiences</a></div>' +
      '<div><h4>The Wedding</h4>' +
        '<a href="voyage.html">The wedding days</a><a href="marsilea.html">Wellness</a>' +
        '<a href="1872.html">1872 · Afternoon Tea</a></div>' +
      '<div><h4>Guest Relations</h4>' +
        '<a href="your-journey.html">Your Journey</a>' +
        '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a></div>' +
    '</div>' +
    '<p class="sf-legal">Sunday, 28 February 2027 · Vientiane, Laos</p>';
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
