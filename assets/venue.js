/* ============================================================================
   THE VENUE STAGE (003, 15 Sep 2026) — a real photograph explained.

   PRIMITIVES (one component, reusable):
     venue-stage   the real aerial photograph, two art directions of one file
     venue-trace   the fine architectural layer drawn OVER it (SVG): a
                   perimeter trace and corner ticks around each placed area,
                   a soft veil around the active one — never a redrawn plan
     venue-label   a semantic button ON the real area it names
     venue-legend  the ordered list of every place — the textual equivalent,
                   and the way in on a phone
     venue-detail  the editorial content of the selected place
     photo-reveal  a photographic transition (cross-fade, --m-photo)
     media-gallery the supporting photographs of the place, one at a time

   RULES: the photograph is the hero, the interface explains it; a marker
   exists only where the Owner-marked layout puts it (assets/venue-data.js —
   a zone's `marks`, one label per marked house or area, the same place);
   nothing is hover-only; every control is a button with a name and a state;
   the selection is announced once, in one sentence; reduced motion keeps
   every state and every piece of information.
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
  /* the base: the tall crop on a phone, the full frame above 767 px — the same photograph */
  function baseHtml(base) {
    var f = base.full, t = base.tall;
    return '<picture class="venue-picture">' +
      '<source type="image/avif" media="(max-width: 767px)" srcset="' + srcset(t.name, t.widths, 'avif') + '" sizes="100vw">' +
      '<source type="image/webp" media="(max-width: 767px)" srcset="' + srcset(t.name, t.widths, 'webp') + '" sizes="100vw">' +
      '<source media="(max-width: 767px)" srcset="' + srcset(t.name, t.widths, 'jpg') + '" sizes="100vw">' +
      '<source type="image/avif" srcset="' + srcset(f.name, f.widths, 'avif') + '" sizes="(min-width: 1200px) 1180px, 100vw">' +
      '<source type="image/webp" srcset="' + srcset(f.name, f.widths, 'webp') + '" sizes="(min-width: 1200px) 1180px, 100vw">' +
      '<img class="venue-img" src="' + V + f.name + '-1600.jpg" srcset="' + srcset(f.name, f.widths, 'jpg') + '" sizes="(min-width: 1200px) 1180px, 100vw" width="' + f.w + '" height="' + f.h + '" alt="' + esc(base.alt) + '" loading="lazy" decoding="async"></picture>';
  }

  /* ---- geometry: a zone box in percent of the full frame → the frame on screen ---- */
  function frameOf(data) { return narrow.matches ? { x: data.base.tallCrop.x, w: data.base.tallCrop.w, ratio: data.base.tall.w / data.base.tall.h } : { x: 0, w: 100, ratio: data.base.full.w / data.base.full.h }; }
  function map(fr, box) { return { x: (box.x - fr.x) / fr.w * 100, y: box.y, w: box.w / fr.w * 100, h: box.h }; }
  function visible(fr, pt) { var x = (pt.x - fr.x) / fr.w * 100; return x > 3 && x < 97; }
  /* the Owner-marked places of a zone (none for an unmarked zone) and the label anchor for the frame on screen */
  function marksOf(z) { return z.marks || []; }
  function anchorOf(m) { return narrow.matches && m.tall ? m.tall : m.anchor; }

  function traceHtml(data, fr) {
    var W = 100, H = 100 / fr.ratio, out = [];
    out.push('<svg class="venue-trace" viewBox="0 0 ' + W + ' ' + H.toFixed(3) + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">');
    out.push('<defs><mask id="venue-veil-mask"><rect x="0" y="0" width="' + W + '" height="' + H.toFixed(3) + '" fill="#fff"/>');
    data.zones.forEach(function (z) { marksOf(z).forEach(function (m) { var b = map(fr, m); var y = b.y / 100 * H, h = b.h / 100 * H; out.push('<rect class="venue-hole" data-zone="' + z.id + '" x="' + b.x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + b.w.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="0.6" fill="#000"/>'); }); });
    out.push('</mask></defs>');
    out.push('<rect class="venue-veil" x="0" y="0" width="' + W + '" height="' + H.toFixed(3) + '" mask="url(#venue-veil-mask)"/>');
    data.zones.forEach(function (z) { marksOf(z).forEach(function (m) {
      var b = map(fr, m); var y = b.y / 100 * H, h = b.h / 100 * H, t = 1.6;   /* the viewBox keeps the photograph's aspect: one unit is one unit both ways */
      out.push('<g class="venue-zone" data-zone="' + z.id + '">');
      out.push('<rect class="venue-outline" x="' + b.x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + b.w.toFixed(2) + '" height="' + h.toFixed(2) + '" pathLength="100" vector-effect="non-scaling-stroke"/>');
      /* corner ticks: the architectural notation */
      [[b.x, y, 1, 1], [b.x + b.w, y, -1, 1], [b.x, y + h, 1, -1], [b.x + b.w, y + h, -1, -1]].forEach(function (c) {
        out.push('<path class="venue-tick" vector-effect="non-scaling-stroke" d="M' + (c[0] + c[2] * t).toFixed(2) + ' ' + c[1].toFixed(2) + ' L' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ' L' + c[0].toFixed(2) + ' ' + (c[1] + c[3] * t).toFixed(2) + '"/>');
      });
      out.push('</g>');
    }); });
    out.push('</svg>');
    return out.join('');
  }
  function labelsHtml(data, fr) {
    var out = [];
    data.zones.forEach(function (z) { marksOf(z).forEach(function (m) {
      var a = anchorOf(m); if (!visible(fr, a)) return;
      var p = { x: (a.x - fr.x) / fr.w * 100, y: a.y };
      out.push('<button type="button" class="venue-label" data-zone="' + z.id + '"' + (a.align ? ' data-align="' + a.align + '"' : '') + ' aria-pressed="false" aria-controls="venue-detail" style="--x:' + p.x.toFixed(2) + '%;--y:' + p.y.toFixed(2) + '%"><span class="venue-dot" aria-hidden="true"></span><span class="venue-n" aria-hidden="true">' + esc(z.n) + '</span><span class="venue-t">' + esc(z.label) + '</span></button>');
    }); });
    return out.join('');
  }

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
      (z.href ? '<a class="a-link"' + (z.swap ? ' data-cta-swap' : '') + ' href="' + esc(z.href) + '">' + esc(z.cta) + '</a>' : '') +
      '</div>';
  }

  function mount(host, data) {
    if (!host || !data) return null;
    var placed = data.zones.filter(function (z) { return marksOf(z).length; });
    host.innerHTML =
      '<div class="venue-head" data-motion="reveal">' +
        '<p class="a-eyebrow">' + esc(data.kicker) + '</p>' +
        '<h2 id="venue-h">' + esc(data.name) + '</h2>' +
        '<p class="venue-lede">' + esc(data.lede) + '</p>' +
      '</div>' +
      '<div class="venue-grid">' +
        '<figure class="venue-stage" data-motion="stage" data-active="" aria-describedby="venue-stage-desc">' +
          baseHtml(data.base) +
          '<div class="venue-layer" data-layer></div>' +
          '<figcaption class="venue-cap">' + esc(data.name) + ' from above · the real photograph · the labels on the real places</figcaption>' +
          '<p class="vh" id="venue-stage-desc">On the photograph: ' + placed.map(function (z) { return z.label; }).join(', ') + '. Every place of the venue is listed below.</p>' +
        '</figure>' +
        '<div class="venue-side">' +
          '<ol class="venue-legend" aria-label="Venue map">' + data.zones.map(function (z) {
            return '<li><button type="button" class="venue-item" data-zone="' + z.id + '" aria-pressed="false" aria-controls="venue-detail"><span class="venue-n" aria-hidden="true">' + esc(z.n) + '</span><span class="venue-t">' + esc(z.label) + '</span><span class="venue-w">' + esc(z.when) + '</span></button></li>';
          }).join('') + '</ol>' +
          '<div class="venue-detail" id="venue-detail" role="region" aria-labelledby="venue-detail-h"></div>' +
          '<p class="vh venue-live" aria-live="polite"></p>' +
        '</div>' +
      '</div>';
    var stage = host.querySelector('.venue-stage'), layer = host.querySelector('[data-layer]'), detail = host.querySelector('.venue-detail'), live = host.querySelector('.venue-live');
    var active = null, photoIndex = 0;

    function drawLayer() {
      var fr = frameOf(data);
      layer.innerHTML = traceHtml(data, fr) + '<div class="venue-labels">' + labelsHtml(data, fr) + '</div>';
      if (M()) M().stagger(layer.querySelectorAll('.venue-label'));
      layer.querySelectorAll('.venue-label').forEach(function (b) { b.addEventListener('click', function () { select(b.getAttribute('data-zone'), true); }); });
      paint();
    }
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
      /* the plan highlights the real area of the place; a place without a marker keeps the whole photograph */
      if (!marksOf(z).length) stage.setAttribute('data-active', '');
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
    drawLayer();
    if (narrow.addEventListener) narrow.addEventListener('change', drawLayer);
    /* the entrance: the photograph, then the traces, then the labels; the first place opens by itself */
    var first = data.first || (placed[0] && placed[0].id), begun = false;
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
  root.SIYL_VENUE = { mount: mount, boot: boot, instance: null, geometry: { frameOf: frameOf, map: map, visible: visible, marksOf: marksOf, anchorOf: anchorOf }, thumbOf: thumbOf, html: { picture: pictureHtml, base: baseHtml, trace: traceHtml, labels: labelsHtml, detail: detailHtml } };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot); else boot();
})(typeof window !== 'undefined' ? window : null);
