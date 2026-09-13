/* ============================================================================
   SEE YOU IN LAOS — the photograph gallery of ONE place.
   The site's one carousel grammar (assets/aman.js) applied to the curated
   photograph set of a venue: one photograph per slide, a fixed frame per
   place, finger swipe with scroll-snap, arrows on larger screens, the arrow
   keys on a keyboard, the thin position line and a quiet "3 / 8". No autoplay,
   no dots, nothing moves on its own. Presentation only.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* the curated set of a place, or its lead photograph alone */
  function setOf(x) {
    var G = window.SIYL_EXP_GALLERY || {};
    var g = G[x.id];
    if (g && g.images && g.images.length) return { frame: g.frame || '4/5', images: g.images };
    if (x.img) return { frame: '4/5', images: [{ src: x.img, alt: x.name + ', ' + x.where }] };
    return { frame: '4/5', images: [] };
  }

  function html(x) {
    var s = setOf(x), n = s.images.length;
    if (!n) return '';
    var r = s.frame.split('/'), ratio = (parseFloat(r[0]) / parseFloat(r[1])) || 0.8;
    var frameO = ratio > 1.15 ? 'L' : ratio < 0.87 ? 'P' : 'S';
    var slides = s.images.map(function (im, i) {
      /* a photograph of the OTHER orientation is shown whole on the sand ground;
       * a square photograph, or a square frame, always fills the frame */
      var o = (im.w && im.h) ? (im.w / im.h > 1.15 ? 'L' : im.w / im.h < 0.87 ? 'P' : 'S') : frameO;
      var fit = frameO !== 'S' && o !== 'S' && o !== frameO;
      return '<div class="aslide' + (i === 0 ? ' on' : '') + '" role="group" aria-roledescription="photograph" aria-label="' + (i + 1) + ' of ' + n + '">' +
        '<figure class="am' + (fit ? ' fit' : '') + '"' + (im.pos ? ' style="--xg-pos:' + esc(im.pos) + '"' : '') + '>' +
        '<img src="' + esc(im.src) + '"' + (im.w ? ' width="' + im.w + '" height="' + im.h + '"' : '') +
        ' alt="' + esc(im.alt) + '" decoding="async"' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '></figure></div>';
    }).join('');
    return '<div class="acar xgal" data-xgal style="--xg-ratio:' + esc(s.frame.replace('/', ' / ')) + '">' +
      '<div class="atrk" data-xg-name="' + esc(x.name) + '">' + slides + '</div>' +
      (n > 1
        ? '<div class="arow"><div class="arail" aria-hidden="true"><i></i></div>' +
          '<p class="xg-count" aria-live="polite"><span data-xg-i>1</span>&nbsp;/&nbsp;' + n + '</p>' +
          '<div class="anav"><button type="button" data-a="prev" aria-label="Previous photograph"></button>' +
          '<button type="button" data-a="next" aria-label="Next photograph"></button></div></div>'
        : '') +
      '</div>';
  }

  function wire(el) {
    if (!el || el.dataset.wired) return;
    el.dataset.wired = '1';
    var trk = el.querySelector('.atrk'), count = el.querySelector('[data-xg-i]');
    if (window.SIYL_AMAN) SIYL_AMAN.wire(el);
    function name() {
      if (!trk) return;
      trk.setAttribute('role', 'region');
      trk.setAttribute('aria-roledescription', 'carousel');
      trk.setAttribute('aria-label', 'Photographs of ' + (trk.getAttribute('data-xg-name') || 'this place') + ' — use the arrow keys to move between them');
    }
    name();
    /* the shared carousel names the track generically when it wires later
     * (assets/aman.js loads after this page's script); its first paint fires
     * a:active, and the place's own name is put back */
    el.addEventListener('a:active', function (e) { name(); if (count) count.textContent = String(e.detail.index + 1); });
  }

  window.SIYL_XGAL = { html: html, wire: wire, setOf: setOf };
  function init() { document.querySelectorAll('[data-xgal]').forEach(wire); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
