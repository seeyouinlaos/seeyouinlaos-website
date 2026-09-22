/* ============================================================================
   THE HERO SLIDESHOW (Owner, 21 Sep 2026 · the first page; the controls 22 Sep 2026).
   The existing hero frame stays exactly as it is — the courtyard (the .am
   background) is slide 1 and is on screen at once, with no script. The four
   frames declared as [data-src] layers follow it in order, one calm 1000 ms
   crossfade every 3 s, then the courtyard again, for ever. Exactly five
   slides. No captions, no zoom.
   · THE DOTS (Owner, 22 Sep 2026): one small dot per slide, centred near the
     foot of the photograph, the active one filled. A dot jumps straight to its
     photograph and the clock starts again from that moment — the show never
     advances the instant a guest has chosen. The dots are built by this module,
     so their number can never disagree with the number of slides; they are
     real buttons, reachable by Tab, moved by the arrow keys, named for a
     screen reader. A horizontal swipe over the photograph does the same.
   · The next photograph is fetched only shortly before its turn (never every
     frame at once).
   · prefers-reduced-motion: nothing auto-transitions — the courtyard stays,
     and the dots remain available for a guest who wants to look.
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
    var i = 0, timer = null, loaded = {}, pending = null;   /* i = 0 the courtyard, 1..n the layers */
    function src(n) { return layers[n - 1].getAttribute('data-src'); }
    function ready(n, cb) {
      if (!n || loaded[n]) { cb(); return; }
      var im = new Image();
      im.onload = im.onerror = function () { loaded[n] = true; var l = layers[n - 1]; l.style.backgroundImage = 'url(' + src(n) + ')'; /* the focal point is the stylesheet's, per viewport class (--fp-*) */ cb(); };
      im.src = src(n);
    }
    /* ---- the dots: one per slide, built here so the count is always the truth ---- */
    var dots = [];
    function buildDots() {
      var host = frame.parentNode && frame.parentNode.classList && frame.parentNode.classList.contains('a-hero-frame') ? frame.parentNode : null;
      if (!host || count < 2 || host.querySelector('.a-hero-dots')) return;
      var box = document.createElement('div');
      box.className = 'a-hero-dots'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'The photographs of this page');
      for (var k = 0; k < count; k++) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'a-hero-dot';
        b.setAttribute('data-hero-dot', String(k));
        b.setAttribute('aria-label', 'Photograph ' + (k + 1) + ' of ' + count);
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
      var prev = i; i = n;
      if (n > 0) { layers[n - 1].classList.add('is-on'); setTimeout(function () { if (prev > 0 && prev !== i) layers[prev - 1].classList.remove('is-on'); }, FADE + 50); }
      else if (prev > 0) layers[prev - 1].classList.remove('is-on');   /* back to the courtyard: the last layer simply fades away */
      frame.setAttribute('data-hero-index', String(n));
      if (!calm) frame.setAttribute('data-hero-state', 'playing');
      paintDots();
    }
    /* a chosen photograph: shown at once, and the clock starts again from now */
    function go(n) {
      if (n === i || n < 0 || n >= count) return;
      if (timer) { clearTimeout(timer); timer = null; }
      pending = null;
      ready(n, function () { show(n); if (!calm && !document.hidden) schedule(); });
    }
    function step() {
      timer = null;
      var next = (i + 1) % count;
      if (next === 0) { show(0); schedule(); return; }
      ready(next, function () { if (document.hidden) { pending = next; return; } show(next); schedule(); });
    }
    function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(step, HOLD); }
    /* a horizontal swipe over the photograph turns the page; a vertical one is the page's own scroll */
    var t0 = null;
    frame.addEventListener('touchstart', function (e) { var t = e.changedTouches && e.changedTouches[0]; t0 = t ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
    frame.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t0 || !t) return;
      var dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      go((i + (dx < 0 ? 1 : count - 1)) % count);
    }, { passive: true });
    buildDots();
    if (!layers.length || calm) { frame.setAttribute('data-hero-state', calm ? 'still' : 'single'); return; }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (timer) { clearTimeout(timer); timer = null; } frame.setAttribute('data-hero-state', 'paused'); }
      else { if (pending !== null) { var n = pending; pending = null; show(n); } frame.setAttribute('data-hero-state', 'playing'); schedule(); }
    });
    /* the second photograph is fetched a moment after the page has settled, so the first fade is never a blank */
    setTimeout(function () { ready(1, function () {}); }, 1500);
    frame.setAttribute('data-hero-state', 'playing');
    schedule();
  }
  function init() { document.querySelectorAll('[data-hero-show]').forEach(wire); }
  window.SIYL_HERO = { wire: wire, init: init, HOLD: HOLD, FADE: FADE };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
