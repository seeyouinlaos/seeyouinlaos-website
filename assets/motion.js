/* ============================================================================
   THE MOTION SYSTEM (003, 15 Sep 2026). One small, reusable layer — not a
   library, not a set of one-off tricks. Calm, architectural, physical.

   TOKENS (assets/motion.css): --m-fast 220 ms (micro-state) · --m-reveal 480 ms
   (content) · --m-photo 800 ms (a photographic transition) · --m-ease.
   PRIMITIVES: [data-motion="reveal"] fades and lifts once it enters the
   viewport (IntersectionObserver — never a scroll listener); stagger() spaces
   a group; the venue stage, the photo reveal and the story sections all use
   the same three timings.
   REDUCED MOTION: `prefers-reduced-motion: reduce` puts .m-reduced on <html>;
   every transition collapses to none, every state still applies, nothing is
   hidden or lost — the information hierarchy is identical.
   ========================================================================== */
(function (root) {
  'use strict';
  if (!root || !root.document) return;
  var doc = root.document, html = doc.documentElement;
  var mq = root.matchMedia ? root.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false, addEventListener: function () {} };
  function reduced() { return !!mq.matches; }
  function apply() { html.classList.toggle('m-reduced', reduced()); }
  apply(); if (mq.addEventListener) mq.addEventListener('change', apply);

  var io = ('IntersectionObserver' in root) ? new root.IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { enter(e.target); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }) : null;

  function enter(el) {
    el.classList.add('is-in');
    try { el.dispatchEvent(new root.CustomEvent('siyl:motion-in', { bubbles: false })); } catch (e) {}
  }
  /* reveal once, when the element comes into view (at once without an observer or with reduced motion) */
  function reveal(el) { if (!el || el.classList.contains('is-in')) return; if (!io || reduced()) { enter(el); return; } io.observe(el); }
  /* space a group: each child gets its index for a CSS delay */
  function stagger(els) { Array.prototype.forEach.call(els || [], function (el, i) { el.style.setProperty('--m-i', String(i)); }); }
  function scan(scope) { Array.prototype.forEach.call((scope || doc).querySelectorAll('[data-motion]'), reveal); }
  /* the duration a script should wait for a transition, honouring reduced motion */
  function after(kind, fn) { var ms = reduced() ? 0 : ({ fast: 220, reveal: 480, photo: 800 })[kind] || 480; if (!ms) { fn(); return; } root.setTimeout(fn, ms); }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { scan(); }); else scan();
  root.SIYL_MOTION = { reveal: reveal, scan: scan, stagger: stagger, after: after, reduced: reduced, T: { fast: 220, reveal: 480, photo: 800 } };
})(typeof window !== 'undefined' ? window : null);
