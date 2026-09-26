/* ============================================================================
   THE EDITORIAL CLIP WITH SOUND (Owner, 21 Sep 2026 · the Lijiang chapter).
   A `[data-clip]` frame holds one <video> (playsinline · loop · a poster · the
   source declared once) and two controls: Play / Pause and Sound on / Mute.
   · Autoplay when a meaningful part of the frame is in view — ALWAYS MUTED (Owner, 26 Sep 2026 · the media rules: an
     audible film never starts by itself); SOUND ON is the guest's own tap. A film is fetched through the Worker's
     byte-range route (/media/<name>.mp4, the same file) so Safari can play it.
   · Leaving the viewport pauses, returning resumes where it was — never from 0.
   · A manual PAUSE wins for the page session: the viewport never restarts it;
     only PLAY does. After PLAY the viewport logic runs as before.
   · One film at a time: a frame that starts pauses every other frame on the page.
   · Reduced motion: no autoplay — the poster and PLAY.
   · The source is attached only as the frame approaches (no preload far away).
   ========================================================================== */
(function () {
  'use strict';
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var KEY = 'siyl.clip.paused';
  function remembered(id) { try { return (sessionStorage.getItem(KEY) || '').split(',').indexOf(id) >= 0; } catch (e) { return false; } }
  function remember(id, on) { try { var l = (sessionStorage.getItem(KEY) || '').split(',').filter(Boolean); var i = l.indexOf(id); if (on && i < 0) l.push(id); if (!on && i >= 0) l.splice(i, 1); sessionStorage.setItem(KEY, l.join(',')); } catch (e) {} }

  function wire(frame) {
    if (frame.getAttribute('data-clip-wired')) return; frame.setAttribute('data-clip-wired', '1');
    var v = frame.querySelector('video'); if (!v) return;
    var id = frame.getAttribute('data-clip') || (v.getAttribute('data-src') || '').split('/').pop() || 'clip';
    var play = frame.querySelector('button[data-clip-play]'), sound = frame.querySelector('button[data-clip-sound]');
    var manual = remembered(id), inView = false, attached = false, wantSound = false;   /* sound only by the guest's tap */
    v.setAttribute('playsinline', ''); v.playsInline = true; v.loop = true; v.preload = 'metadata';

    function attach() {
      if (attached) return; attached = true;
      var src = (v.getAttribute('data-src') || '').replace(/^(?:\.\/)?assets\/video\/([a-z0-9-]+\.mp4)$/, 'media/$1'); if (src && !v.querySelector('source') && !v.src) v.src = src;
      v.preload = 'auto'; try { v.load(); } catch (e) {}
    }
    var lastT = -1, lastTick = 0;
    function paint() {
      /* PLAYING only when the element is genuinely playing (not paused, not ended, past the first frame or advancing) */
      var playing = !v.paused && !v.ended && v.readyState >= 2;
      frame.classList.toggle('is-playing', playing);
      frame.setAttribute('data-clip-state', playing ? 'playing' : 'paused');
      frame.setAttribute('data-clip-audio', v.muted ? 'off' : 'on');
      if (play) { play.removeAttribute('aria-pressed'); play.setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film'); play.querySelector('.t').textContent = playing ? 'Pause' : 'Play'; }
      if (sound) { sound.removeAttribute('aria-pressed'); sound.setAttribute('aria-label', v.muted ? 'Sound on' : 'Mute'); sound.querySelector('.t').textContent = v.muted ? 'Sound on' : 'Mute'; }
    }
    /* start: with sound where the browser allows it, muted where it does not.
       ONE FILM AT A TIME (22 Sep 2026 · the BARON films): a frame that starts silences the others — never two sound tracks over
       each other; a frame paused this way starts again by its own PLAY or by coming back into view */
    function start(userGesture) {
      attach();
      try { document.dispatchEvent(new CustomEvent('siyl:clip-start', { detail: { frame: frame } })); } catch (e) {}
      v.muted = userGesture ? !wantSound : true;   /* by itself: muted, always */
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        if (!v.muted) { v.muted = true; var q = v.play(); if (q && q.catch) q.catch(function () { paint(); }); }
      });
      if (userGesture) frame.setAttribute('data-clip-touched', '1');
      paint();
    }
    function stop() { try { v.pause(); } catch (e) {} paint(); }

    document.addEventListener('siyl:clip-start', function (e) { if (e.detail && e.detail.frame !== frame && !v.paused) stop(); });
    if (play) play.addEventListener('click', function () {
      if (!v.paused && !v.ended) { manual = true; remember(id, true); stop(); }
      else { manual = false; remember(id, false); start(true); }
    });
    if (sound) sound.addEventListener('click', function () {
      wantSound = v.muted; v.muted = !v.muted;
      if (v.paused && !manual) start(true);
      else if (!v.muted) { try { document.dispatchEvent(new CustomEvent('siyl:clip-start', { detail: { frame: frame } })); } catch (e) {} }   /* sound on: the other films fall silent */
      paint();
    });
    ['play', 'pause', 'playing', 'waiting', 'stalled', 'volumechange', 'ended', 'loadeddata', 'canplay'].forEach(function (ev) { v.addEventListener(ev, paint); });
    /* the picture must move: the time advances while playing; if it does not for 3 s the controls say PLAY and a tap restarts the decoder */
    v.addEventListener('timeupdate', function () { lastT = v.currentTime; lastTick = Date.now(); paint(); });
    setInterval(function () { if (!v.paused && !v.ended && lastTick && Date.now() - lastTick > 3000 && v.currentTime === lastT) { frame.setAttribute('data-clip-state', 'stalled'); frame.classList.remove('is-playing'); if (play) { play.setAttribute('aria-label', 'Play the film'); play.querySelector('.t').textContent = 'Play'; } } }, 1500);

    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { attach(); near.disconnect(); } }); }, { rootMargin: '400px 0px' });
      near.observe(frame);
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          inView = e.isIntersecting && e.intersectionRatio >= 0.4;
          if (inView) { if (!manual && !calm && v.paused) start(false); }
          else if (!v.paused) stop();
        });
      }, { threshold: [0, 0.4, 0.6] });
      io.observe(frame);
    } else if (!manual && !calm) { start(false); }
    paint();
  }
  function init() { document.querySelectorAll('[data-clip]').forEach(wire); }
  window.SIYL_CLIP = { wire: wire, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
