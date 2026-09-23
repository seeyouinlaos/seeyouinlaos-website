/* ============================================================================
   THE CARD GALLERY (Owner, 22 Sep 2026 · "After the Wedding" on the first page).
   A card of the Your Journey rail may carry more than one photograph. The
   frame keeps the card's own geometry and the editorial proportions; the
   photographs change inside it — one at a time, always at the guest's hand:

     · fine-line chevrons on the left and right edge of the photograph, with a
       generous invisible touch area around them, quiet until the card is
       touched, hovered or focused;
     · a swipe left or right on a touch screen (a vertical drag stays the
       page's own scroll);
     · the arrow keys when the frame has focus;
     · a restrained "1 / 9" at the foot of the frame;
     · the last photograph wraps to the first, and the first back to the last.

   Nothing moves on its own — there is no autoplay and no timer here. The frame
   is a link like every other card of the rail: a tap on the photograph opens
   the journey, a tap on a chevron only turns the page, and a swipe never
   follows the link. Only the first photograph is fetched eagerly; the others
   arrive as they are asked for. Presentation only: no state, no persistence.
   ========================================================================== */
(function () {
  'use strict';
  function wire(box) {
    if (!box || box.getAttribute('data-cardgal-wired')) return;
    var slides = [].slice.call(box.querySelectorAll('.cg-frame'));
    if (slides.length < 2) return;
    box.setAttribute('data-cardgal-wired', '1');
    var n = slides.length, i = 0, moved = false, t0 = null;
    box.setAttribute('data-cardgal-count', String(n));
    if (!box.hasAttribute('tabindex')) box.setAttribute('tabindex', '0');   /* the arrow keys, as every carousel of this site */

    var prev = document.createElement('button'), next = document.createElement('button');
    prev.type = next.type = 'button';
    prev.className = 'cg-nav cg-prev'; next.className = 'cg-nav cg-next';
    prev.setAttribute('aria-label', 'The previous photograph'); next.setAttribute('aria-label', 'The next photograph');
    prev.innerHTML = '<i aria-hidden="true"></i>'; next.innerHTML = '<i aria-hidden="true"></i>';
    var count = document.createElement('p');
    count.className = 'cg-count'; count.setAttribute('aria-live', 'polite');
    /* A · CURRENT (Owner, 23 Sep 2026): the same Cherry full stop the hero uses — which photograph the guest is on,
       read at a glance without counting. The count stays for the screen reader and for the exact position. */
    var dots = document.createElement('span');
    dots.className = 'cg-dots'; dots.setAttribute('aria-hidden', 'true');
    for (var d = 0; d < n; d++) dots.appendChild(document.createElement('i'));
    box.appendChild(prev); box.appendChild(next); box.appendChild(count); box.appendChild(dots);

    function paint() {
      for (var k = 0; k < n; k++) {
        var on = k === i;
        slides[k].classList.toggle('is-on', on);
        slides[k].setAttribute('aria-hidden', on ? 'false' : 'true');
        var a = slides[k].querySelector('a'); if (a) a.setAttribute('tabindex', on ? '0' : '-1');
        var im = slides[k].querySelector('img');
        if (on && im && im.getAttribute('data-src')) { im.src = im.getAttribute('data-src'); im.removeAttribute('data-src'); }
      }
      count.textContent = (i + 1) + ' / ' + n;
      for (var q = 0; q < dots.children.length; q++) dots.children[q].classList.toggle('on', q === i);
      box.setAttribute('data-cardgal-index', String(i));
      /* the neighbour is fetched quietly, so the next turn is instant */
      var nx = slides[(i + 1) % n].querySelector('img');
      if (nx && nx.getAttribute('data-src')) { nx.src = nx.getAttribute('data-src'); nx.removeAttribute('data-src'); }
    }
    function go(k) { i = (k + n) % n; paint(); }

    prev.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(i - 1); });
    next.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(i + 1); });
    box.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault(); e.stopPropagation(); go(i + (e.key === 'ArrowRight' ? 1 : -1));
    });
    box.addEventListener('touchstart', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; t0 = t ? { x: t.clientX, y: t.clientY } : null; moved = false;
    }, { passive: true });
    box.addEventListener('touchmove', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t0 || !t) return;
      if (Math.abs(t.clientX - t0.x) > 12 && Math.abs(t.clientX - t0.x) > Math.abs(t.clientY - t0.y)) moved = true;
    }, { passive: true });
    box.addEventListener('touchend', function (e) {
      var t = e.changedTouches && e.changedTouches[0]; if (!t0 || !t) { t0 = null; return; }
      var dx = t.clientX - t0.x, dy = t.clientY - t0.y; t0 = null;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      moved = true; go(i + (dx < 0 ? 1 : -1));
    }, { passive: true });
    /* a swipe is never a tap on the link */
    box.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

    paint();
    return box;
  }
  function init(root) { (root || document).querySelectorAll('[data-cardgal]').forEach(wire); }
  window.SIYL_CARDGAL = { wire: wire, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
})();
