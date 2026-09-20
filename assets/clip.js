/* ============================================================================
   THE EDITORIAL CLIP WITH SOUND (Owner, 21 Sep 2026 · the Lijiang chapter).
   A `[data-clip]` frame holds one <video> (playsinline · loop · a poster · the
   source declared once) and two controls: Play / Pause and Sound on / Mute.
   · Autoplay when a meaningful part of the frame is in view: with sound where the
     browser permits it, muted where it does not (the SOUND ON control then says
     so) — never a frozen frame because audible autoplay was refused.
   · Leaving the viewport pauses, returning resumes where it was — never from 0.
   · A manual PAUSE wins for the page session: the viewport never restarts it;
     only PLAY does. After PLAY the viewport logic runs as before.
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
    var manual = remembered(id), inView = false, attached = false, wantSound = true;
    v.setAttribute('playsinline', ''); v.playsInline = true; v.loop = true; v.preload = 'metadata';

    function attach() {
      if (attached) return; attached = true;
      var src = v.getAttribute('data-src'); if (src && !v.querySelector('source') && !v.src) v.src = src;
      v.preload = 'auto'; try { v.load(); } catch (e) {}
    }
    function paint() {
      var playing = !v.paused && !v.ended;
      frame.setAttribute('data-clip-state', playing ? 'playing' : 'paused');
      frame.setAttribute('data-clip-audio', v.muted ? 'off' : 'on');
      if (play) { play.setAttribute('aria-label', playing ? 'Pause the film' : 'Play the film'); play.setAttribute('aria-pressed', playing ? 'true' : 'false'); play.querySelector('.t').textContent = playing ? 'Pause' : 'Play'; }
      if (sound) { sound.setAttribute('aria-label', v.muted ? 'Sound on' : 'Mute'); sound.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); sound.querySelector('.t').textContent = v.muted ? 'Sound on' : 'Mute'; }
    }
    /* start: with sound where the browser allows it, muted where it does not */
    function start(userGesture) {
      attach();
      v.muted = !wantSound;
      var p = v.play();
      if (p && p.catch) p.catch(function () {
        if (!v.muted) { v.muted = true; var q = v.play(); if (q && q.catch) q.catch(function () { paint(); }); }
      });
      if (userGesture) frame.setAttribute('data-clip-touched', '1');
      paint();
    }
    function stop() { try { v.pause(); } catch (e) {} paint(); }

    if (play) play.addEventListener('click', function () {
      if (!v.paused && !v.ended) { manual = true; remember(id, true); stop(); }
      else { manual = false; remember(id, false); start(true); }
    });
    if (sound) sound.addEventListener('click', function () {
      wantSound = v.muted; v.muted = !v.muted;
      if (v.paused && !manual) start(true);
      paint();
    });
    ['play', 'pause', 'playing', 'volumechange', 'ended'].forEach(function (ev) { v.addEventListener(ev, paint); });

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
