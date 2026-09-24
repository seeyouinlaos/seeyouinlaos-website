/* ============================================================================
   THE REFERENCE GALLERY (Owner, 20 Sep 2026 · the dress-code galleries).
   A rail of photographs (the dress references on dress.html and in Wedding
   Preparation) becomes the website's one carousel: every photograph the same 3:4
   card, covered from the top, one at a time with the next one peeking on a phone,
   two on a tablet, three on a desktop — with the position rail, previous / next,
   swipe, snap and the keyboard, exactly as the editorial carousels (assets/aman.js
   SIYL_AMAN.wire). Every reference is reachable; none is left half-hidden at the
   end; the page never scrolls sideways. Presentation only.
   ========================================================================== */
(function () {
  'use strict';
  function upgrade(rail) {
    if (!rail || rail.getAttribute('data-refgal') === '1') return;
    var imgs = Array.prototype.slice.call(rail.querySelectorAll('img'));
    if (imgs.length < 2) return;
    rail.setAttribute('data-refgal', '1');
    var car = document.createElement('section'); car.className = 'acar refgal';
    if (rail.getAttribute('aria-label')) car.setAttribute('aria-label', rail.getAttribute('aria-label'));
    var trk = document.createElement('div'); trk.className = 'atrk'; trk.setAttribute('tabindex', '0');
    imgs.forEach(function (img, i) {
      var s = document.createElement('figure'); s.className = 'aslide';
      s.setAttribute('aria-label', (img.getAttribute('alt') || 'Reference') + ' · ' + (i + 1) + ' of ' + imgs.length);
      var frame = document.createElement('div'); frame.className = 'am';
      img.removeAttribute('width'); img.removeAttribute('height'); img.removeAttribute('style');
      frame.appendChild(img); s.appendChild(frame); trk.appendChild(s);
    });
    var row = document.createElement('div'); row.className = 'arow';
    row.innerHTML = '<div class="arail" aria-hidden="true"><i></i></div><span class="refgal-count" aria-live="polite"></span>' +
      '<div class="anav"><button type="button" data-a="prev" aria-label="Previous photograph"></button><button type="button" data-a="next" aria-label="Next photograph"></button></div>';
    car.appendChild(trk); car.appendChild(row);
    rail.parentNode.insertBefore(car, rail);
    rail.remove();
    /* the count follows the active slide */
    var count = row.querySelector('.refgal-count');
    var paintCount = function () { var on = trk.querySelector('.aslide.on'); var i = on ? Array.prototype.indexOf.call(trk.children, on) : 0; count.textContent = (i + 1) + ' / ' + imgs.length; };
    /* THE DESTINATION CHAPTER (Owner, 21 Sep 2026): the first photograph rests on the words' edge — the track carries no gutter
       of its own on any engine; stated inline so no shared carousel rule can inset it */
    if (rail.closest && car.closest('.a-dest')) { ['paddingLeft', 'paddingRight', 'marginLeft', 'marginRight'].forEach(function (k) { trk.style[k] = '0px'; }); trk.style.width = '100%'; trk.style.maxWidth = 'none'; trk.style.scrollPaddingLeft = '0px'; trk.style.scrollPadding = '0px'; row.style.paddingLeft = '0px'; row.style.paddingRight = '0px'; row.style.maxWidth = 'none'; row.style.marginLeft = '0px'; row.style.marginRight = '0px'; }
    if (window.SIYL_AMAN && SIYL_AMAN.wire) SIYL_AMAN.wire(car);
    if (car.closest('.a-dest')) {
      try { trk.scrollLeft = 0; } catch (e) {}
      /* measured, not assumed: the first photograph must rest on the chapter's words' edge — if an engine still insets it, the difference is taken out */
      var settle = function () { var txt = car.closest('.a-dest').querySelector('.a-dest-text'); var s0 = trk.querySelector('.aslide'); if (!txt || !s0 || trk.scrollLeft > 0) return; var d = Math.round(txt.getBoundingClientRect().left - s0.getBoundingClientRect().left); if (d !== 0 && Math.abs(d) <= 64) { trk.style.marginLeft = (parseFloat(trk.style.marginLeft) || 0) + d + 'px'; } };
      if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(settle); }); else setTimeout(settle, 50);
      window.addEventListener('load', settle);
    }
    var mo = new MutationObserver(paintCount); mo.observe(trk, { attributes: true, subtree: true, attributeFilter: ['class'] });
    paintCount();
  }
  function init() { document.querySelectorAll('.dgal, .p-rail').forEach(function (r) { if (r.querySelectorAll('img').length >= 2 && !r.querySelector('.p-card, .aslide')) upgrade(r); }); }
  window.SIYL_REFGAL = { upgrade: upgrade, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
