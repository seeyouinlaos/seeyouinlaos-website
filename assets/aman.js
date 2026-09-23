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
      ['Kunming', 'destination.html#kunming'],
      ['Lijiang', 'destination.html#lijiang']
    ]],
    ['The Journey', 'journeys.html', [
      ['Before the Wedding', 'journeys.html#j-bkk-stay'],
      ['The Wedding', 'journeys.html#j-wedstay'],
      ['After the Wedding', 'journeys.html#j-mu9646']
    ]],
    ['Stays', 'accommodation.html', [
      ['Sathorn Penthouse Bangkok', 'room.html?stay=sathorn&room=penthouse'],
      ['Souphattra Heritage Vientiane', 'journeys.html#j-prewed'],
      ['Guest House complimentary', 'room.html?stay=guesthouse&room=guest-house'],
      ['Wanxiang Yueju Kunming', 'journeys.html#j-kmg'],
      ['Luye Baisha Lijiang', 'journeys.html#j-ljg'],
      ['Siam Kempinski Bangkok', 'journeys.html#j-kempinski']
    ]],
    ['Experiences', 'experiences.html', [
      ['Bangkok', 'experiences.html#bkk'],
      ['Vientiane', 'experiences.html#laos'],
      ['Kunming &amp; Lijiang', 'experiences.html#china'],
      ['1872 · Champagne Afternoon Tea', '1872.html'],
      ['Sühring · Dinner in Bangkok', 'experience.html?id=bkk-suhring']
    ]],
    /* THE HIGHLIGHTS (Owner, 20 Sep 2026): the premium tables and the afternoon tea, one row of their own — Aman never
       hidden in a submenu again; each stays in Experiences as well */
    ['Highlights', 'experiences.html#highlights', [
      ['1872 · Champagne Afternoon Tea · Aman', '1872.html'],
      ['Sühring · Three MICHELIN Stars', 'experience.html?id=bkk-suhring'],
      ['Baan Phraya · Thai heritage', 'experience.html?id=bkk-baanphraya'],
      ['Cannubi by Umberto Bombana · One MICHELIN Star', 'experience.html?id=bkk-cannubi']
    ]],
    ['Wellness', 'marsilea.html', null],
    ['The Wedding', 'voyage.html', [
      ['Temple Ceremony', 'voyage.html#temple'],
      ['Coffee &amp; Cake', 'voyage.html#coffee'],
      ['Vow Ceremony', 'voyage.html#vows'],
      ['Wedding Dinner', 'voyage.html#dinner']
    ]],
    ['My Trip', 'your-journey.html', null]
  ];

  /* clean paths on one deployment, file names on the other — same page */
  var here = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') + '.html';

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
      /* THE ACCOUNT (Owner, 18 Sep 2026 · Aman): signed in · name, My Trip · My Profile · Sign out — in the drawer, never a second row under the wordmark; filled by assets/invite.mjs */
      '<div class="a-macct" data-account data-state="out"><span class="a-macct-who">Not signed in</span><nav class="a-macct-nav" aria-label="Your account"><a href="invitation.html?open=1" data-access-nav="in">Open your invitation</a></nav></div>' +
      '<nav class="a-mnav" aria-label="Primary">' + rows + '</nav>' +
      '<div class="a-mfoot">' +
        '<p>Guest Relations</p>' +
        '<a href="mailto:guest.relation.seeyouinlaos@gmail.com">guest.relation.seeyouinlaos@gmail.com</a>' +
        '<a href="invitation.html">Your invitation</a>' +
        '<a href="you.html">You &amp; your party</a>' +
        '<a href="about-you.html">About You</a>' +
        '<a href="wedding-preparation.html#dress-code">Dress code</a>' +
        '<a href="review.html">Review &amp; Send</a>' +
      '</div>';
    document.body.append(scrim, menu);
    /* the account block is the invitation module's to fill (assets/invite.mjs) — tell it the drawer exists */
    try { document.dispatchEvent(new CustomEvent('siyl:menu')); } catch (e) { /* an old browser: the module fills it on load */ }

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
    var rail = car.querySelector('.arail');
    var prev = car.querySelector('[data-a="prev"]');
    var next = car.querySelector('[data-a="next"]');
    var i = -1, tick = 0;
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (bar) bar.style.width = (100 / slides.length) + '%';
    trk.setAttribute('tabindex', '0');
    trk.setAttribute('role', 'group');
    trk.setAttribute('aria-label', 'Use the arrow keys to move between slides');
    if (rail) { rail.setAttribute('role', 'button'); rail.setAttribute('tabindex', '0'); rail.setAttribute('aria-label', 'Carousel position'); }

    /* the scrollLeft at which slide k rests on its snap point — start-aligned on
     * the phone, centred on wide screens; the ends are clamped by the browser
     * exactly as they are here */
    function pos(k) {
      var s = slides[k], cs = getComputedStyle(s), left = s.offsetLeft - trk.offsetLeft, x;
      if (cs.scrollSnapAlign === 'center') x = left - (trk.clientWidth - s.offsetWidth) / 2;
      else x = left - (parseFloat(getComputedStyle(trk).scrollPaddingLeft) || 0);
      return Math.max(0, Math.min(trk.scrollWidth - trk.clientWidth, Math.round(x)));
    }
    function index() {
      var best = 0, d = Infinity, x = trk.scrollLeft;
      for (var k = 0; k < slides.length; k++) { var dd = Math.abs(pos(k) - x); if (dd < d) { d = dd; best = k; } }
      return best;
    }
    function paint() {
      var n = index();
      if (n === i) return;
      i = n;
      slides.forEach(function (s, k) { s.classList.toggle('on', k === n); });
      if (bar) bar.style.transform = 'translateX(' + (n * 100) + '%)';
      if (prev) prev.disabled = n === 0;
      if (next) next.disabled = n === slides.length - 1;
      /* a rail that IS a decision tells its page which card is active */
      car.dataset.active = String(n);
      try { car.dispatchEvent(new CustomEvent('a:active', { detail: { index: n }, bubbles: true })); } catch (e) {}
    }
    function go(k) {
      k = Math.max(0, Math.min(slides.length - 1, k));
      trk.scrollTo({ left: pos(k), behavior: calm ? 'auto' : 'smooth' });
    }
    trk.addEventListener('scroll', function () {
      if (tick) return;
      tick = requestAnimationFrame(function () { tick = 0; paint(); });
    }, { passive: true });
    if (prev) prev.addEventListener('click', function () { go(index() - 1); });
    if (next) next.addEventListener('click', function () { go(index() + 1); });
    trk.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
    });
    /* a neighbour brings itself into the active position; the active
     * photograph is a real link and opens its page */
    slides.forEach(function (s, k) {
      s.addEventListener('click', function (e) {
        if (k === index()) return;
        e.preventDefault();
        go(k);
      });
    });
    /* the track is a control, not a decoration: click or key to jump */
    if (rail) {
      rail.addEventListener('click', function (e) {
        var r = rail.getBoundingClientRect();
        go(Math.floor(((e.clientX - r.left) / r.width) * slides.length));
      });
      rail.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); go(index() + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index() - 1); }
      });
    }
    window.addEventListener('resize', function () { i = -1; paint(); });
    paint();
  }

  /* ------------------------------------------------------------ card video
     A destination card may carry a short, silent, local clip (data-video =
     a same-origin H.264 MP4 under assets/, never a hotlink). The photograph
     the card already frames is the poster: it is on screen first and stays
     underneath, the clip fades in only once it is actually playing, at the
     card's own geometry (the 5:4 frame, cover-cropped like the photograph).
     The photograph is the answer whenever motion is not wanted or not
     possible — reduced motion, Save-Data, a source that fails to load, an
     autoplay the browser refuses (Low Power Mode) — and the clip pauses while
     the card is off screen. Presentation only: no state, no persistence. */
  function calmMotion() {
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    return !!(mq && mq.matches) || !!(navigator.connection && navigator.connection.saveData);
  }
  function unmountVideo(frame) {
    var v = frame.querySelector('video.am-clip');
    if (v) { try { v.pause(); } catch (e) { /* nothing to pause */ } v.remove(); }
    frame.classList.remove('am-playing');
    frame.removeAttribute('data-video-state');
  }
  function mountVideo(frame) {
    var src = frame.getAttribute('data-video');
    if (!src || frame.querySelector('video.am-clip')) return null;
    if (calmMotion()) { frame.setAttribute('data-video-state', 'still'); return null; }
    var v = document.createElement('video');
    v.className = 'am-clip';
    v.muted = true; v.defaultMuted = true; v.loop = true; v.autoplay = true;
    v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    v.setAttribute('loop', ''); v.setAttribute('autoplay', ''); v.setAttribute('preload', 'metadata');
    v.setAttribute('aria-hidden', 'true'); v.setAttribute('tabindex', '-1'); v.disablePictureInPicture = true;
    var poster = (frame.style.backgroundImage || '').replace(/^url\(["']?|["']?\)$/g, '');
    if (poster) v.setAttribute('poster', poster);
    var s = document.createElement('source'); s.src = src; s.type = 'video/mp4';
    v.appendChild(s);
    var fail = function () { unmountVideo(frame); frame.setAttribute('data-video-state', 'still'); };
    s.addEventListener('error', fail);
    v.addEventListener('error', fail);
    v.addEventListener('playing', function () { frame.classList.add('am-playing'); frame.setAttribute('data-video-state', 'playing'); });
    frame.setAttribute('data-video-state', 'loading');
    frame.insertBefore(v, frame.firstChild);
    var attempt = function () {
      var p; try { p = v.play(); } catch (e) { fail(); return; }
      if (p && p.then) p.then(null, function () { if (v.isConnected) fail(); });
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!v.isConnected) { io.disconnect(); return; }
          if (en.isIntersecting) attempt(); else { try { v.pause(); } catch (e) { /* nothing to pause */ } }
        });
      }, { threshold: 0.15 });
      io.observe(frame);
    } else attempt();
    return v;
  }
  function wireVideos(root) {
    var frames = Array.prototype.slice.call((root || document).querySelectorAll('.am[data-video]'));
    frames.forEach(mountVideo);
    var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq && mq.addEventListener) mq.addEventListener('change', function () {
      frames.forEach(function (f) { if (calmMotion()) { unmountVideo(f); f.setAttribute('data-video-state', 'still'); } else mountVideo(f); });
    });
    return frames;
  }

  /* the same carousel behaviour is available to a rail built after load —
     the Cost Saving selector is created when the guest opens it, and gets the
     accepted swipe, snap, keyboard and position rail from this one function. */
  window.SIYL_AMAN = { wire: wire, video: { mount: mountVideo, unmount: unmountVideo, wire: wireVideos, calm: calmMotion } };

  function init() {
    buildMenu();
    document.querySelectorAll('.acar').forEach(wire);
    wireVideos(document);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
