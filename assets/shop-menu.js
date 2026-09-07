/* Shared menu for the shop pages — wires the header hamburger to the public
 * navigation. The internal engine (register/) is deliberately absent: it is
 * not part of any customer navigation. */
(function () {
  'use strict';
  var CSS =
    '.siyl-nav-scrim{position:fixed;inset:0;background:rgba(30,30,30,.45);display:none;z-index:70}' +
    '.siyl-nav{position:fixed;top:0;left:0;bottom:0;width:min(320px,86vw);background:#FCFAF6;padding:30px 28px calc(30px + env(safe-area-inset-bottom));display:none;z-index:71;overflow-y:auto}' +
    'body.siyl-nav-open .siyl-nav-scrim,body.siyl-nav-open .siyl-nav{display:block}' +
    '.siyl-nav .ne{font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:#7C7A75;margin:0 0 18px}' +
    '.siyl-nav a{display:flex;align-items:center;min-height:44px;color:#313131;text-decoration:none;font-family:"PP Editorial Old",serif;font-weight:200;font-size:20px;border-bottom:1px solid #EAE7E0}' +
    '.siyl-nav .nx{background:none;border:0;font:inherit;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#7C7A75;cursor:pointer;padding:12px 0;min-height:44px;margin-top:14px}';
  var LINKS = [
    ['index.html', 'Home'],
    ['journeys.html', 'Journeys'],
    ['marsilea.html', 'Marsilea Spa'],
    ['1872.html', '1872 · Afternoon Tea'],
    ['your-journey.html', 'Your Journey'],
    ['review.html', 'Review & Send'],
  ];

  /* Shared editorial footer — same navigation truth as the drawer, one system
   * with the recon shell footer. No invented channels, no LINE ID. */
  function foot() {
    if (document.querySelector('.sfoot')) return;
    var f = document.createElement('footer');
    f.className = 'sfoot';
    f.innerHTML =
      '<div class="sfoot-in">' +
        '<div><p class="sf-brand">see you in laos<span class="dot">.</span></p></div>' +
        '<div><h4>Explore</h4>' +
          '<a href="index.html">Home</a><a href="journeys.html">Journeys</a>' +
          '<a href="marsilea.html">Marsilea Spa</a><a href="1872.html">1872 · Afternoon Tea</a></div>' +
        '<div><h4>Plan</h4>' +
          '<a href="your-journey.html">Your Journey</a><a href="review.html">Review &amp; Send</a></div>' +
        '<div><h4>Guest Relations</h4>' +
          '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a></div>' +
      '</div>' +
      '<p class="sf-legal">Sunday, 28 February 2027 · Vientiane, Laos</p>';
    document.body.appendChild(f);
  }

  function init() {
    foot();
    var btn = document.querySelector('.hb');
    if (!btn) return;
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);
    var scrim = document.createElement('div');
    scrim.className = 'siyl-nav-scrim';
    var nav = document.createElement('nav');
    nav.className = 'siyl-nav';
    nav.setAttribute('aria-label', 'Menu');
    nav.innerHTML = '<p class="ne">see you in laos<span style="color:#8A5A55">.</span></p>' +
      LINKS.map(function (l) { return '<a href="' + l[0] + '">' + l[1] + '</a>'; }).join('') +
      '<button type="button" class="nx">Close</button>';
    document.body.append(scrim, nav);
    function set(open) { document.body.classList.toggle('siyl-nav-open', open); }
    btn.addEventListener('click', function () { set(true); });
    scrim.addEventListener('click', function () { set(false); });
    nav.querySelector('.nx').addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') set(false);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
