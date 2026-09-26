/* ============================================================================
   THE HERO SLIDESHOW (Owner, 21 Sep 2026 · the first page; the controls 22 Sep 2026; films 26 Sep 2026).
   The existing hero frame stays exactly as it is. Its slides come from the Drive
   collection "000 - Hero Image" (src/hero-media.json → src/build-hero.cjs): the
   first item is the frame itself (its photograph or its film's poster is the .am
   background, on screen at once, with no script); the others are [data-src]
   layers, in order, one calm 1000 ms crossfade between them, for ever. No
   captions, no zoom.
   · A PHOTOGRAPH holds for 3 s.
   · A FILM (data-hero-video) plays over its poster, cover-cropped at the same
     focal point as a photograph, and the show moves on when it ends. It ALWAYS
     starts muted — an audible film never plays by itself. The controls are the
     site's clip controls: PLAY / PAUSE on every film, SOUND ON / MUTE only when
     the film has an audio track (data-audio="1"). A guest's PAUSE holds the
     show; PLAY continues it. A film pauses when the hero leaves the screen or the
     tab is hidden, and resumes on return only while it is muted (sound is never
     switched on again without the guest). If the browser refuses to play
     (Low Power Mode), the poster stands and the show moves on as for a photograph.
   · THE DOTS (Owner, 22 Sep 2026): one small dot per slide, centred near the
     foot of the picture, the active one filled. A dot jumps straight to its
     slide and the clock starts again from that moment. The dots are built by this
     module, so their number can never disagree with the number of slides; they
     are real buttons, reachable by Tab, moved by the arrow keys, named for a
     screen reader. A horizontal swipe over the picture does the same.
   · The next photograph (or poster) is fetched only shortly before its turn; a
     film's file is attached only when its slide is shown.
   · prefers-reduced-motion: nothing auto-transitions and no film starts by itself
     — the first picture stays, the dots and PLAY remain for a guest who wants them.
   · A hidden tab pauses the clock; on return the show resumes from where it
     was — it never jumps through several slides to catch up.
   ========================================================================== */
(function () {
  'use strict';
  var HOLD = 3000, FADE = 1000;
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function wire(frame) {
    if (frame.getAttribute('data-hero-wired')) return; frame.setAttribute('data-hero-wired', '1');
    var layers = [].slice.call(frame.querySelectorAll('.a-hero-slide'));
    var count = layers.length + 1;
    frame.setAttribute('data-hero-slides', String(count));
    frame.setAttribute('data-hero-index', '0');
    var host = frame.parentNode && frame.parentNode.classList && frame.parentNode.classList.contains('a-hero-frame') ? frame.parentNode : null;
    var i = 0, timer = null, loaded = {}, pending = null;   /* i = 0 the frame itself, 1..n the layers */
    var held = false, inView = true, films = {};            /* held: the guest paused the film — the show waits */
    function el(n) { return n === 0 ? frame : layers[n - 1]; }
    function src(n) { return layers[n - 1].getAttribute('data-src'); }
    function isFilm(n) { return !!el(n).getAttribute('data-hero-video'); }
    function hasSound(n) { return el(n).getAttribute('data-audio') === '1'; }
    function ready(n, cb) {
      if (!n || loaded[n]) { cb(); return; }
      var im = new Image();
      im.onload = im.onerror = function () { loaded[n] = true; var l = layers[n - 1]; l.style.backgroundImage = 'url(' + src(n) + ')'; /* the focal point is the stylesheet's, per viewport class (--fp-*) */ cb(); };
      im.src = src(n);
    }

    /* ---- the films: one <video> per film slide, made when the slide is first shown ---- */
    var ctl = host ? host.querySelector('[data-hero-ctl]') : null;
    var playBtn = ctl ? ctl.querySelector('[data-hero-play]') : null, soundBtn = ctl ? ctl.querySelector('[data-hero-sound]') : null;
    function film(n) {
      if (films[n]) return films[n];
      var e = el(n), v = document.createElement('video');
      v.className = 'a-hero-video';
      v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
      v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      v.preload = 'metadata'; v.setAttribute('aria-hidden', 'true'); v.setAttribute('tabindex', '-1'); v.disablePictureInPicture = true;
      var poster = n === 0 ? (frame.style.backgroundImage || '').replace(/^url\(["']?|["']?\)$/g, '') : src(n);
      if (poster) v.poster = poster;
      v.src = e.getAttribute('data-hero-video');
      e.insertBefore(v, e.firstChild);
      v.addEventListener('ended', function () { if (i === n && !held && !calm) step(); paint(); });
      v.addEventListener('error', function () { if (i === n) { v.remove(); delete films[n]; paint(); if (!held && !calm) schedule(); } });
      ['play', 'pause', 'playing', 'volumechange', 'waiting'].forEach(function (ev) { v.addEventListener(ev, paint); });
      films[n] = v; return v;
    }
    /* by the show: always muted. By the guest (PLAY): the sound stays as the guest left it. */
    function run(byGuest) {
      if (!isFilm(i)) return;
      var v = film(i), n = i;
      if (!byGuest) v.muted = true;
      var p; try { p = v.play(); } catch (e) { p = null; }
      if (p && p.catch) p.catch(function () { paint(); if (!byGuest && i === n && !held && !calm) schedule(); });   /* refused: the poster stands, the show goes on */
      paint();
    }
    function rest(n) { var v = films[n]; if (!v) return; try { v.pause(); } catch (e) { /* nothing to pause */ } setTimeout(function () { if (i !== n) { try { v.currentTime = 0; } catch (e) { /* not seekable yet */ } } }, FADE + 50); }
    function paint() {
      if (!ctl) return;
      var on = isFilm(i); ctl.hidden = !on;
      frame.setAttribute('data-hero-kind', on ? 'film' : 'photograph');
      if (!on) return;
      var v = films[i], playing = !!v && !v.paused && !v.ended;
      ctl.setAttribute('data-state', playing ? 'playing' : 'paused');
      if (playBtn) { playBtn.setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film'); playBtn.querySelector('.t').textContent = playing ? 'Pause' : 'Play'; }
      var muted = !v || v.muted;
      ctl.setAttribute('data-audio', muted ? 'off' : 'on');
      if (soundBtn) { soundBtn.hidden = !hasSound(i); soundBtn.setAttribute('aria-label', muted ? 'Sound on' : 'Mute'); soundBtn.querySelector('.t').textContent = muted ? 'Sound on' : 'Mute'; }
    }
    if (playBtn) playBtn.addEventListener('click', function () {
      var v = films[i];
      if (v && !v.paused && !v.ended) { held = true; if (timer) { clearTimeout(timer); timer = null; } try { v.pause(); } catch (e) { /* already paused */ } }
      else { held = false; if (timer) { clearTimeout(timer); timer = null; } run(true); }
      paint();
    });
    if (soundBtn) soundBtn.addEventListener('click', function () {
      if (!hasSound(i)) return;
      var v = film(i); v.muted = !v.muted;
      if (v.paused && !held) run(true);
      paint();
    });

    /* ---- the dots: one per slide, built here so the count is always the truth ---- */
    var dots = [];
    function buildDots() {
      if (!host || count < 2 || host.querySelector('.a-hero-dots')) return;
      var box = document.createElement('div');
      box.className = 'a-hero-dots'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Slideshow');
      for (var k = 0; k < count; k++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'a-hero-dot';
        b.setAttribute('data-hero-dot', String(k));
        b.setAttribute('aria-label', (isFilm(k) ? 'Film ' : 'Photograph ') + (k + 1) + ' of ' + count);
        b.appendChild(document.createElement('i'));
        box.appendChild(b); dots.push(b);
      }
      box.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-hero-dot]') : null;
        if (!b) return;
        go(Number(b.getAttribute('data-hero-dot')));
      });
      box.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var n = (i + (e.key === 'ArrowRight' ? 1 : count - 1)) % count;
        go(n); if (dots[n]) dots[n].focus();
      });
      host.appendChild(box);
      paintDots();
    }
    function paintDots() {
      for (var k = 0; k < dots.length; k++) {
        var on = k === i;
        dots[k].classList.toggle('is-on', on);
        if (on) dots[k].setAttribute('aria-current', 'true'); else dots[k].removeAttribute('aria-current');
      }
    }
    function show(n) {
      /* the new layer fades in over what is there; the previous layer lets go once the fade is over */
      var prev = i; i = n; held = false;
      if (prev !== n) rest(prev);
      if (n > 0) { layers[n - 1].classList.add('is-on'); setTimeout(function () { if (prev > 0 && prev !== i) layers[prev - 1].classList.remove('is-on'); }, FADE + 50); }
      else if (prev > 0) layers[prev - 1].classList.remove('is-on');   /* back to the first picture: the last layer simply fades away */
      frame.setAttribute('data-hero-index', String(n));
      if (!calm) frame.setAttribute('data-hero-state', 'playing');
      paintDots(); paint();
    }
    /* the slide's own clock: a photograph holds, a film runs to its end */
    function begin() {
      if (calm || document.hidden) return;
      if (isFilm(i) && inView) run(false); else schedule();
    }
    /* a chosen slide: shown at once, and the clock starts again from now */
    function go(n) {
      if (n === i || n < 0 || n >= count) return;
      if (timer) { clearTimeout(timer); timer = null; }
      pending = null;
      ready(n, function () { show(n); begin(); });
    }
    function step() {
      timer = null;
      var next = (i + 1) % count;
      if (next === 0) { show(0); begin(); return; }
      ready(next, function () { if (document.hidden) { pending = next; return; } show(next); begin(); });
    }
    function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(step, HOLD); }
    /* a horizontal swipe over the picture turns the page; a vertical one is the page's own scroll */
    var t0 = null;
    frame.addEventListener('touchstart', function (e) { var t = e.changedTouches && e.changedTouches[0]; t0 = t ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t0 || !t) return;
      var dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      go((i + (dx < 0 ? 1 : count - 1)) % count);
    }, { passive: true });
    buildDots();
    paint();
    /* off screen, a film rests; back on screen it continues — only while it is muted */
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          inView = e.isIntersecting && e.intersectionRatio >= 0.25;
          var v = films[i]; if (!v || !isFilm(i)) return;
          if (!inView) { if (!v.paused) { try { v.pause(); } catch (x) { /* nothing */ } } }
          else if (v.paused && !v.ended && !held && !calm && v.muted && !document.hidden) run(false);
        });
      }, { threshold: [0, 0.25, 0.5] }).observe(frame);
    }
    if (calm) { frame.setAttribute('data-hero-state', 'still'); return; }
    if (!layers.length && !isFilm(0)) { frame.setAttribute('data-hero-state', 'single'); return; }
    document.addEventListener('visibilitychange', function () {
      var v = films[i];
      if (document.hidden) { if (timer) { clearTimeout(timer); timer = null; } if (v && !v.paused) { try { v.pause(); } catch (x) { /* nothing */ } } frame.setAttribute('data-hero-state', 'paused'); }
      else {
        frame.setAttribute('data-hero-state', 'playing');
        if (pending !== null) { var n = pending; pending = null; show(n); begin(); return; }
        if (held) return;
        if (isFilm(i)) { if (v && v.muted && !v.ended) run(false); else if (!v) begin(); } else schedule();
      }
    });
    /* the second picture is fetched a moment after the page has settled, so the first fade is never a blank */
    if (layers.length) setTimeout(function () { ready(1, function () {}); }, 1500);
    frame.setAttribute('data-hero-state', 'playing');
    begin();
  }
  function init() { document.querySelectorAll('[data-hero-show]').forEach(wire); }
  window.SIYL_HERO = { wire: wire, init: init, HOLD: HOLD, FADE: FADE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
