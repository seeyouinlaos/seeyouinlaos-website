/* ============================================================================
   THE VENUE (003, 15 Sep 2026 · the site plan: Owners, 22 Nov 2026 · HS-058) — the place explained.

   PRIMITIVES (one component, reusable):
     venue-plan    the architectural site plan of Souphattra Heritage (an SVG drawing, vector, sharp at every size),
                   drawn from the hotel's official plan: Buildings A–F, the Lobby, the Peacock Bistro, Peacock Court,
                   the pool and the walkways — names only, never a room number, never an allocation
     venue-zoom    the plan enlarged, full screen, with − / + and native pan and pinch (a phone reads every label)
     venue-legend  the ordered list of every place — the textual way in
     venue-detail  the editorial content of the selected place
     photo-reveal  a photographic transition (cross-fade, --m-photo)
     media-gallery the supporting photographs of the place, one at a time

   RULES (Owners, 22 Nov 2026): the earlier aerial photograph and its position markers are gone; a place of the wedding
   (Coffee & Cake, the Vow Ceremony, the Wedding Dinner) is drawn on the plan only once its position is confirmed — until
   then it is named in the list, never placed; nothing is hover-only; every control is a button with a name and a state;
   the selection is announced once, in one sentence; reduced motion keeps every state and every piece of information.
   ========================================================================== */
(function (root) {
  'use strict';
  if (!root || !root.document) return;
  var doc = root.document;
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var V = 'assets/images/venue/';
  var narrow = root.matchMedia ? root.matchMedia('(max-width: 767px)') : { matches: false, addEventListener: function () {} };
  var M = function () { return root.SIYL_MOTION; };

  /* ---- pictures: avif → webp → jpg, every width, intrinsic size (no layout shift) ---- */
  function srcset(name, widths, ext) { return widths.map(function (w) { return V + name + '-' + w + '.' + ext + ' ' + w + 'w'; }).join(', '); }
  function pictureHtml(p, sizes, cls, eager) {
    var lazy = eager ? '' : ' loading="lazy" decoding="async"';
    if (p.pic) {
      var q = p.pic;
      return '<picture>' +
        '<source type="image/avif" srcset="' + srcset(q.name, q.widths, 'avif') + '" sizes="' + sizes + '">' +
        '<source type="image/webp" srcset="' + srcset(q.name, q.widths, 'webp') + '" sizes="' + sizes + '">' +
        '<img class="' + cls + '" src="' + V + q.name + '-' + q.widths[q.widths.length - 1] + '.jpg" srcset="' + srcset(q.name, q.widths, 'jpg') + '" sizes="' + sizes + '" width="' + q.w + '" height="' + q.h + '" alt="' + esc(q.alt) + '"' + lazy + '></picture>';
    }
    var s = p.single;
    return '<img class="' + cls + '" src="' + s.src + '" width="' + s.w + '" height="' + s.h + '" alt="' + esc(s.alt) + '"' + lazy + '>';
  }
  /* the 320 px thumbnail of a photograph (built beside the images) */
  function thumbOf(p) { var base = p.pic ? p.pic.name : p.single.src.split('/').pop().replace(/\.[a-z]+$/, ''); return V + 'thumbs/' + base + '-320.jpg'; }

  /* ---- the plan: the drawing itself, inline (the page's own typefaces), with the image as its stand-in until it arrives ---- */
  function planHtml(plan) {
    return '<div class="venue-plan-frame" data-plan-frame data-scrolls role="group" aria-label="' + esc(plan.alt) + '">' +
      '<img class="venue-plan-img" src="' + esc(plan.src) + '" width="' + plan.w + '" height="' + plan.h + '" alt="' + esc(plan.alt) + '" decoding="async">' +
      '</div>';
  }
  /* the frame and its caption line (the caption, the phone's swipe hint, the button that enlarges the plan) */
  function planFigureHtml(plan) {
    return planHtml(plan) +
      '<figcaption class="venue-cap"><span>' + esc(plan.caption) + '</span><span class="venue-swipe">' + esc(plan.swipe) + '</span>' +
        '<button type="button" class="venue-zoom-open" data-zoom-open aria-haspopup="dialog">' + esc(plan.enlarge) + '</button></figcaption>';
  }
  var planSvg = null;
  /* one read of the drawing (the same file the image shows); a drawing that cannot be read keeps the image — never a blank frame */
  function loadPlan(plan) {
    if (planSvg) return Promise.resolve(planSvg);
    if (!root.fetch) return Promise.resolve(null);
    return root.fetch(plan.src).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
      /* a guard on our own static drawing (same origin, attested with the release) — not a general sanitizer: anything active refuses the inline copy */
      if (!t || t.indexOf('<svg') < 0 || /<script|[\s\/"']on[a-z]+\s*=|<foreignObject|<a[\s>]|<animate|<set[\s>]|href\s*=|url\(|@import|javascript:/i.test(t)) return null;
      planSvg = t.slice(t.indexOf('<svg')); return planSvg;
    }, function () { return null; });
  }
  function fillPlan(box, svg) {
    if (!box || !svg) return;
    box.innerHTML = svg;
    var s = box.querySelector('svg'); if (!s) return;
    s.removeAttribute('width'); s.removeAttribute('height'); s.setAttribute('focusable', 'false'); s.classList.add('venue-plan-svg');
    /* the frame carries the plan's name and the figure its description: the drawing itself is not read twice, its ids never
       repeat (the page and the enlarged view hold a copy each), and the hotel's own names stay as printed in every language */
    s.setAttribute('aria-hidden', 'true'); s.removeAttribute('aria-labelledby'); s.setAttribute('data-i18n-skip', '');
    Array.prototype.forEach.call(s.querySelectorAll('[id]'), function (el) { el.removeAttribute('id'); });
    /* a frame that scrolls across (a phone) is a keyboard stop; a frame that shows the whole drawing is not */
    if (box.hasAttribute('data-scrolls')) { if (box.scrollWidth > box.clientWidth + 1) box.setAttribute('tabindex', '0'); else box.removeAttribute('tabindex'); }
  }

  /* A ZONE'S WAY ON (Owner, 26 Sep 2026): the stage stands on the first page and on The Wedding; a zone's '#section' is a
     section of The Wedding page — on a page that does not carry it (the first page has no #dinner), the link goes there */
  function hrefOf(h) { return h.charAt(0) === '#' && doc && doc.getElementById && !doc.getElementById(h.slice(1)) ? 'voyage.html' + h : h; }
  function detailHtml(z, i) {
    var photo = z.photos[i || 0];
    return '<div class="venue-detail-in' + (z.index ? ' venue-index' : '') + '" data-motion="reveal">' +
      '<p class="a-eyebrow venue-when">' + esc(z.when) + '</p>' +
      '<h3 id="venue-detail-h" class="venue-title">' + esc(z.title) + '</h3>' +
      /* an index entry (the wedding dinner) carries no photograph of its own: the place is named and the way to its one detail is given */
      (photo ? '<div class="venue-photo photo-reveal" data-photo="' + (i || 0) + '">' + pictureHtml(photo, '(min-width: 900px) 520px, 100vw', 'venue-photo-img is-in') + '</div>' : '') +
      (z.photos.length > 1 ? '<div class="venue-thumbs media-gallery" role="group" aria-label="Photographs of ' + esc(z.title) + '">' + z.photos.map(function (p, k) {
        var q = { src: thumbOf(p), alt: p.pic ? p.pic.alt : p.single.alt };
        return '<button type="button" class="venue-thumb" data-photo="' + k + '" aria-pressed="' + (k === (i || 0) ? 'true' : 'false') + '" aria-label="' + esc(q.alt) + '"><img src="' + q.src + '" alt="" loading="lazy" decoding="async" width="96" height="72"></button>';
      }).join('') + '</div>' : '') +
      '<p class="venue-story">' + esc(z.story) + '</p>' +
      (z.href ? '<a class="a-link"' + (z.swap ? ' data-cta-swap' : '') + ' href="' + esc(hrefOf(z.href)) + '">' + esc(z.cta) + '</a>' : '') +
      '</div>';
  }

  /* THE PLAN, WIRED (one primitive for the public venue and the guest's own plan in My Profile · HS-058.7): the drawing fetched once
     and inlined into the frame, `decorate` (optional) applied to every copy — the page's and the enlarged one — and the enlarged
     view. `scope` holds one [data-plan-frame] and one [data-zoom-open]. */
  function wirePlan(scope, plan, decorate) {
    var frame = scope.querySelector('[data-plan-frame]');
    loadPlan(plan).then(function (svg) { fillPlan(frame, svg); if (frame && decorate) decorate(frame); });

    /* THE PLAN, ENLARGED (Owners, 22 Nov 2026 · every label readable on a phone): a full-screen view over the page, the drawing
       at a larger width inside a native scroll area — pan with a finger, pinch, or − / + — Escape or Close returns to the page
       and to the button that opened it */
    var zoom = null, zoomFrom = null, zoomStep = 1;
    /* the enlarged view starts larger than the page shows the plan (900 px at least) and grows in three steps */
    var STEPS = [0.75, 1, 1.5, 2.2];
    function zoomWidth() { var vw = root.innerWidth || 1024; return Math.round(Math.max(900, Math.min(vw * 1.4, 1300)) * STEPS[zoomStep]); }
    /* at a limit the button says so (aria-disabled) and keeps its focus — a disabled button would drop it to the page */
    function drawZoom() { var c = zoom && zoom.querySelector('[data-zoom-canvas]'); if (!c) return; c.style.width = zoomWidth() + 'px';
      zoom.querySelector('[data-zoom-out]').setAttribute('aria-disabled', zoomStep === 0 ? 'true' : 'false'); zoom.querySelector('[data-zoom-in]').setAttribute('aria-disabled', zoomStep === STEPS.length - 1 ? 'true' : 'false'); }
    function openZoom() {
      if (zoom) return;
      zoomFrom = doc.activeElement; zoomStep = 1;
      zoom = doc.createElement('div');
      zoom.className = 'venue-zoom'; zoom.setAttribute('role', 'dialog'); zoom.setAttribute('aria-modal', 'true'); zoom.setAttribute('aria-label', plan.zoomLabel);
      zoom.innerHTML = '<div class="venue-zoom-bar"><p class="venue-zoom-t">' + esc(plan.caption) + '</p>' +
        '<button type="button" class="venue-zoom-b" data-zoom-out aria-label="' + esc(plan.smaller) + '">−</button>' +
        '<button type="button" class="venue-zoom-b" data-zoom-in aria-label="' + esc(plan.larger) + '">+</button>' +
        '<button type="button" class="venue-zoom-b venue-zoom-x" data-zoom-close>' + esc(plan.close) + '</button></div>' +
        '<div class="venue-zoom-area" tabindex="0"><div class="venue-zoom-canvas" data-zoom-canvas>' + planHtml(plan) + '</div></div>';
      doc.body.appendChild(zoom); doc.documentElement.classList.add('venue-zoom-on');
      var inner = zoom.querySelector('[data-plan-frame]'); if (inner) { inner.removeAttribute('data-scrolls'); inner.removeAttribute('role'); inner.removeAttribute('aria-label'); }
      loadPlan(plan).then(function (svg) { var box = zoom && zoom.querySelector('[data-plan-frame]'); fillPlan(box, svg); if (box && decorate) decorate(box); });
      zoom.querySelector('[data-zoom-in]').addEventListener('click', function () { if (zoomStep < STEPS.length - 1) { zoomStep++; drawZoom(); } });
      zoom.querySelector('[data-zoom-out]').addEventListener('click', function () { if (zoomStep > 0) { zoomStep--; drawZoom(); } });
      zoom.querySelector('[data-zoom-close]').addEventListener('click', closeZoom);
      doc.addEventListener('keydown', onZoomKey);
      function onZoomKey(e) {
        if (!zoom) { doc.removeEventListener('keydown', onZoomKey); return; }
        if (e.key === 'Escape') { e.preventDefault(); closeZoom(); return; }
        if (e.key !== 'Tab') return;   /* the focus stays inside the dialog */
        var f = zoom.querySelectorAll('button, [tabindex="0"]'), a = f[0], z = f[f.length - 1];
        if (!zoom.contains(doc.activeElement)) { e.preventDefault(); a.focus(); return; }
        if (e.shiftKey && doc.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && doc.activeElement === z) { e.preventDefault(); a.focus(); }
      }
      drawZoom();
      zoom.querySelector('[data-zoom-close]').focus();
    }
    function closeZoom() {
      if (!zoom) return;
      zoom.parentNode.removeChild(zoom); zoom = null; doc.documentElement.classList.remove('venue-zoom-on');
      var back = zoomFrom && zoomFrom !== doc.body && doc.contains(zoomFrom) ? zoomFrom : scope.querySelector('[data-zoom-open]');
      if (back && back.focus) { try { back.focus(); } catch (e) {} }
    }
    scope.querySelector('[data-zoom-open]').addEventListener('click', openZoom);
  }

  function mount(host, data) {
    if (!host || !data) return null;
    var plan = data.plan;
    host.innerHTML =
      '<div class="venue-head" data-motion="reveal">' +
        '<p class="a-eyebrow">' + esc(data.kicker) + '</p>' +
        '<h2 id="venue-h">' + esc(data.name) + '</h2>' +
        '<p class="venue-lede">' + esc(data.lede) + '</p>' +
      '</div>' +
      '<div class="venue-grid">' +
        '<figure class="venue-stage venue-plan" data-motion="stage" aria-describedby="venue-stage-desc">' +
          planFigureHtml(plan) +
          '<p class="vh" id="venue-stage-desc">' + esc(plan.desc) + '</p>' +
        '</figure>' +
        '<div class="venue-side">' +
          '<ol class="venue-legend" aria-label="Venue map">' + data.zones.map(function (z) {
            return '<li><button type="button" class="venue-item" data-zone="' + z.id + '" aria-pressed="false" aria-controls="venue-detail"><span class="venue-n" aria-hidden="true">' + esc(z.n) + '</span><span class="venue-t">' + esc(z.label) + '</span><span class="venue-w">' + esc(z.when) + '</span></button></li>';
          }).join('') + '</ol>' +
          '<div class="venue-detail" id="venue-detail" role="region" aria-labelledby="venue-detail-h"></div>' +
          '<p class="vh venue-live" aria-live="polite"></p>' +
        '</div>' +
      '</div>';
    var stage = host.querySelector('.venue-stage'), detail = host.querySelector('.venue-detail'), live = host.querySelector('.venue-live');
    wirePlan(host, plan, null);
    var active = null, photoIndex = 0;

    function paint() {
      stage.setAttribute('data-active', active || '');
      host.querySelectorAll('[data-zone]').forEach(function (el) {
        var on = el.getAttribute('data-zone') === active;
        if (el.tagName === 'BUTTON') el.setAttribute('aria-pressed', on ? 'true' : 'false');
        el.classList.toggle('is-active', on);
      });
    }
    function zoneOf(id) { return data.zones.filter(function (z) { return z.id === id; })[0]; }
    function select(id, announce) {
      var z = zoneOf(id); if (!z) return;
      var changed = id !== active; active = id; photoIndex = 0; paint();
      var next = doc.createElement('div'); next.innerHTML = detailHtml(z, 0);
      var frag = next.firstChild;
      var old = detail.firstChild;
      if (old) { old.classList.add('is-leaving'); }
      detail.appendChild(frag);
      /* the detail answers a choice: it arrives at once, never waits for the viewport */
      root.requestAnimationFrame(function () { frag.classList.add('is-in'); });
      if (old) (M() ? M().after('fast', function () { if (old.parentNode) old.parentNode.removeChild(old); }) : old.remove());
      frag.querySelectorAll('.venue-thumb').forEach(function (b) { b.addEventListener('click', function () { showPhoto(z, Number(b.getAttribute('data-photo')), frag); }); });
      /* THE WAY TO THE ONE DETAIL (Owner, 21 Sep 2026 · the iPad): the index entry's call is a real same-page link — the browser
         navigates to #dinner itself (the fragment, the history, back and forward stay native). Two things stand beside that:
         the target is revealed at once, so it is never a blank frame the moment the page arrives (its reveal transform is
         what put it 14 px under the header); and if the browser did not move the page at all (a tap the device swallowed),
         the same target is brought into view by hand — never a second route, never a reload. */
      frag.querySelectorAll('a.a-link[href^="#"]').forEach(function (a) { a.addEventListener('click', function () {
        var id = (a.getAttribute('href') || '').slice(1), t = id && doc.getElementById(id); if (!t) return;
        t.classList.add('is-in');
        var y0 = root.pageYOffset, h0 = root.location.hash;
        root.setTimeout(function () {
          var r = t.getBoundingClientRect(), hd = doc.querySelector('header.hd'), top = hd ? hd.getBoundingClientRect().bottom : 0;
          if (root.location.hash !== '#' + id && root.pageYOffset === y0 && h0 !== '#' + id) { try { root.location.hash = '#' + id; } catch (e) {} }
          if (r.top < top - 1 || r.top > root.innerHeight * 0.6) { try { t.scrollIntoView({ block: 'start' }); } catch (e) {} }
        }, 120);
      }); });
      if (announce && changed) live.textContent = z.title + '. ' + z.when + '.';
      try { doc.dispatchEvent(new root.CustomEvent('siyl:venue', { detail: { zone: id } })); } catch (e) {}
    }
    function showPhoto(z, k, scope) {
      if (!z.photos || !z.photos[k]) return;
      if (k === photoIndex) return; photoIndex = k;
      var box = scope.querySelector('.venue-photo'), oldImg = box.querySelector('picture, img');
      var tmp = doc.createElement('div'); tmp.innerHTML = pictureHtml(z.photos[k], '(min-width: 900px) 520px, 100vw', 'venue-photo-img'); var fresh = tmp.firstChild;
      box.appendChild(fresh); box.setAttribute('data-photo', String(k));
      root.requestAnimationFrame(function () { root.requestAnimationFrame(function () { (fresh.querySelector ? fresh.querySelector('img') || fresh : fresh).classList.add('is-in'); if (fresh.classList) fresh.classList.add('is-in'); }); });
      if (oldImg) { oldImg.classList.add('is-leaving'); (M() ? M().after('photo', function () { if (oldImg.parentNode) oldImg.parentNode.removeChild(oldImg); }) : oldImg.remove()); }
      scope.querySelectorAll('.venue-thumb').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-photo') === String(k) ? 'true' : 'false'); });
    }
    host.querySelectorAll('.venue-item').forEach(function (b) { b.addEventListener('click', function () { select(b.getAttribute('data-zone'), true); if (narrow.matches) { var d = detail; try { d.scrollIntoView({ block: 'nearest', behavior: (M() && M().reduced()) ? 'auto' : 'smooth' }); } catch (e) {} } }); });
    /* keyboard: the arrow keys move along the legend, Home / End to its ends */
    host.querySelector('.venue-legend').addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(host.querySelectorAll('.venue-item')), i = items.indexOf(doc.activeElement); if (i < 0) return;
      var j = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : -1;
      if (j < 0 || j >= items.length) return; e.preventDefault(); items[j].focus();
    });
    /* the entrance: the plan, then the first place opens by itself */
    var first = data.first || (data.zones[0] && data.zones[0].id), begun = false;
    function begin() { if (begun) return; begun = true; stage.classList.add('is-in'); (M() ? M().after('photo', function () { select(first, false); }) : select(first, false)); }
    if (M() && !M().reduced()) {
      stage.addEventListener('siyl:motion-in', begin, { once: true }); M().reveal(stage); M().scan(host);
      /* the photograph and its labels are content: should the intersection entrance not have happened three seconds after
         mount (an observer that never fires), the stage enters by itself — nothing of the venue stays invisible */
      root.setTimeout(begin, 3000);
    }
    else { host.querySelectorAll('[data-motion]').forEach(function (el) { el.classList.add('is-in'); }); begin(); }
    return { select: select, active: function () { return active; }, zones: data.zones.map(function (z) { return z.id; }) };
  }

  function boot() {
    var host = doc.querySelector('[data-venue]'); if (!host || !root.SIYL_VENUE_DATA) return;
    root.SIYL_VENUE.instance = mount(host, root.SIYL_VENUE_DATA);
  }
  root.SIYL_VENUE = { mount: mount, boot: boot, instance: null, thumbOf: thumbOf, wirePlan: wirePlan, html: { picture: pictureHtml, plan: planHtml, figure: planFigureHtml, detail: detailHtml } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
