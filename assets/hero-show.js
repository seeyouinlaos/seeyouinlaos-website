/* ============================================================================
   THE HERO SLIDESHOW (Owner, 21 Sep 2026 · the first page).
   The existing hero frame stays exactly as it is — the courtyard (the .am
   background) is slide 1 and is on screen at once, with no script. The four
   frames declared as [data-src] layers follow it in order, one calm 1000 ms
   crossfade about every 5 s, then the courtyard again, for ever. Exactly five
   slides. No controls, no dots, no captions, no zoom.
   · The next photograph is fetched only shortly before its turn (never every
     frame at once).
   · prefers-reduced-motion: the courtyard stays; nothing auto-transitions.
   · A hidden tab pauses the clock; on return the show resumes from where it
     was — it never jumps through several slides to catch up.
   ========================================================================== */
(function () {
  'use strict';
  var HOLD = 5000, FADE = 1000;
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function wire(frame) {
    if (frame.getAttribute('data-hero-wired')) return; frame.setAttribute('data-hero-wired', '1');
    var layers = [].slice.call(frame.querySelectorAll('.a-hero-slide'));
    frame.setAttribute('data-hero-slides', String(layers.length + 1));
    frame.setAttribute('data-hero-index', '0');
    if (!layers.length || calm) { frame.setAttribute('data-hero-state', calm ? 'still' : 'single'); return; }
    var i = 0, timer = null, loaded = {};   /* i = 0 the courtyard, 1..n the layers */
    function src(n) { return layers[n - 1].getAttribute('data-src'); }
    function ready(n, cb) {
      if (loaded[n]) { cb(); return; }
      var im = new Image();
      im.onload = im.onerror = function () { loaded[n] = true; var l = layers[n - 1]; l.style.backgroundImage = 'url(' + src(n) + ')'; /* the focal point is the stylesheet's, per viewport class (--fp-*) */ cb(); };
      im.src = src(n);
    }
    function show(n) {
      /* the new layer fades in over what is there; the previous layer lets go once the fade is over */
      var prev = i; i = n;
      if (n > 0) { layers[n - 1].classList.add('is-on'); setTimeout(function () { if (prev > 0 && prev !== i) layers[prev - 1].classList.remove('is-on'); }, FADE + 50); }
      else if (prev > 0) layers[prev - 1].classList.remove('is-on');   /* back to the courtyard: the last layer simply fades away */
      frame.setAttribute('data-hero-index', String(n));
      frame.setAttribute('data-hero-state', 'playing');
    }
    function step() {
      timer = null;
      var next = (i + 1) % (layers.length + 1);
      if (next === 0) { show(0); schedule(); return; }
      ready(next, function () { if (document.hidden) { pending = next; return; } show(next); schedule(); });
    }
    var pending = null;
    function schedule() { if (timer) clearTimeout(timer); timer = setTimeout(step, HOLD); }
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
