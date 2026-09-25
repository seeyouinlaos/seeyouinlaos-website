/* THE LAYOUT RULES (Owner, 25 Sep 2026 · the site-wide layout QA agent): the one in-page measurement of the canonical
 * layout contract (src/layout-contract.cjs). Injected into a rendered page by src/layout-qa/audit.mjs; defines
 * window.__LQA.run(contract) → { geometry, violations }. Pure DOM geometry and semantic classification — never pixels.
 *
 * THE CONTRACT IN ONE PARAGRAPH: the page has ONE content wall, computed from the tokens that build it — left =
 * max(--a-gut, (viewport − --a-frame) / 2 + --a-gut), right symmetric. The header closes on it. Every visible content
 * box sits inside it, or is a declared full-bleed band whose own content returns to it. Every block of text or media
 * starts on an AXIS: the wall, or the content edge of the component that holds it (a card, a column of a multi-column
 * grid or row, a positioned overlay, a scroll rail). A page-level photograph spans the wall exactly. Nothing scrolls
 * sideways, no text is cut, no photograph is distorted, no section overlaps the next, no blank void opens between them. */
(function () {
  'use strict';
  var R = Math.round;
  function px(v) { var n = parseFloat(v); return isNaN(n) ? 0 : n; }
  function cs(el) { return getComputedStyle(el); }
  function path(el) {
    var out = [], n = el;
    for (var i = 0; n && n.nodeType === 1 && n !== document.body && i < 5; i++, n = n.parentElement) {
      var c = n.classList && n.classList.length ? '.' + [].slice.call(n.classList, 0, 3).join('.') : '';
      out.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + c);
    }
    return out.join(' > ');
  }
  /* the nearest class of the element or an ancestor that the stylesheets name: the primitive to look at first */
  function primitiveOf(el) {
    for (var n = el; n && n !== document.body; n = n.parentElement) {
      if (n.classList && n.classList.length) return '.' + n.classList[0];
      if (n.id) return '#' + n.id;
    }
    return el.tagName.toLowerCase();
  }

  /* opts.panel: audit an open panel (the menu, the step index) on its own wall — the panel's box inset by its own --a-gut */
  function run(C, opts) {
    opts = opts || {};
    var tol = C.tolerance;
    var doc = document.documentElement, vw = doc.clientWidth, vh = window.innerHeight;
    var root = cs(doc);
    var scope = opts.panel ? document.querySelector(opts.panel) : null;
    if (opts.panel && !scope) return { geometry: { vw: vw, vh: vh, missing: opts.panel }, violations: [{ type: 'STATE_MISSING', component: opts.panel, primitive: opts.panel, expected: 'the panel is open', actual: 'not found', box: { x: 0, y: 0, w: 1, h: 1 } }] };
    var top = scope || document.body;
    var gut = px(root.getPropertyValue(C.wall.gutToken)), frame = px(root.getPropertyValue(C.wall.frameToken));
    var wl = Math.max(gut, (vw - frame) / 2 + gut), wr = vw - wl;
    var sy = scope ? 0 : scrollY;
    if (scope) {
      /* a side panel (the menu) has its own gutter; a panel across the screen (the step index) keeps the page's wall */
      var pr = scope.getBoundingClientRect(), pg = px(cs(scope).getPropertyValue(C.wall.gutToken));
      if (pr.left > tol || pr.right < vw - tol) { vw = pr.right; wl = pr.left + pg; wr = pr.right - pg; }
    }
    var ground = cs(document.body).backgroundColor;
    var V = [];
    function add(type, el, expected, actual, extra) {
      var r = el.getBoundingClientRect();
      V.push(Object.assign({ type: type, component: path(el), primitive: primitiveOf(el), expected: expected, actual: actual,
        box: { x: R(r.left), y: R(r.top + sy), w: R(r.width), h: R(r.height) } }, extra || {}));
      el.setAttribute('data-lqa-v', ((el.getAttribute('data-lqa-v') || '') + ' ' + V.length).trim());
    }
    function matches(el, list) { for (var i = 0; i < list.length; i++) { if (el.matches(list[i].sel)) return list[i]; } return null; }
    /* a primitive may hold only in a range of widths (e.g. the approved phone composition, below 768 px) */
    var used = {};   /* the declared exceptions this page actually relied on (reported, so an unused one can be retired) */
    function withinAt(el, list) { var m = within(el, list); var ok = m && (!m.maxWidth || vw <= m.maxWidth) && (!m.minWidth || vw >= m.minWidth) ? m : null; if (ok) used[ok.sel] = (used[ok.sel] || 0) + 1; return ok; }
    function within(el, list) { for (var n = el; n && n !== top; n = n.parentElement) { var m = matches(n, list); if (m) return m; } return null; }

    /* layers that are not the page: the header (checked on its own), off-canvas panels, visually hidden text, closed dialogs */
    var layerSel = C.layers.join(',');
    function state(el) {
      for (var n = el; n && n !== top; n = n.parentElement) {
        var s = cs(n);
        if (s.display === 'none' || s.visibility === 'hidden' || px(s.opacity) === 0 && n !== el) return 'hidden';
        if (s.position === 'fixed' && !n.matches(C.fixedAudited)) return 'fixed';   /* a fixed bar the guest reads is audited like a band */
        if (n.matches(layerSel)) return 'layer';
      }
      return null;
    }
    /* the visible part of a box: its rect cut by every clipping ancestor (overflow, clip-path) */
    function visible(el, r) {
      var l = r.left, rt = r.right, t = r.top, b = r.bottom, rail = null;
      for (var n = el.parentElement; n && n !== doc; n = n.parentElement) {
        var s = cs(n);
        if (s.overflowX !== 'visible' || s.overflowY !== 'visible' || s.clipPath !== 'none') {
          var q = n.getBoundingClientRect(); l = Math.max(l, q.left); rt = Math.min(rt, q.right); t = Math.max(t, q.top); b = Math.min(b, q.bottom);
          if (!rail && scrolls(n, s)) rail = n;
        }
      }
      return { l: l, r: rt, t: t, b: b, rail: rail };
    }
    /* a rail is a box that really scrolls sideways (overflow-y alone computes overflow-x to auto too) */
    function scrolls(n, s) { return /^(auto|scroll)$/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1; }
    function isBox(el, s) {
      s = s || cs(el);
      var bg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== ground;
      /* a transparent control (an arrow, a text link) is its ink, not its 44 px target: only a drawn box is a box */
      return bg || s.backgroundImage !== 'none' || px(s.borderLeftWidth) > 0 || px(s.borderRightWidth) > 0 || /^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName);
    }
    /* a column: an item of a row flex container or of a grid with more than one column */
    function isColumn(el) {
      var p = el.parentElement; while (p && cs(p).display === 'contents') p = p.parentElement;
      if (!p) return false;
      var s = cs(p);
      if (/flex/.test(s.display)) return !/column/.test(s.flexDirection);
      if (/grid/.test(s.display)) return s.gridTemplateColumns.trim().split(/\s+(?![^(]*\))/).length > 1;
      if (/table-row/.test(s.display)) return true;
      return false;
    }
    function centredByLayout(el, s) {
      var p = el.parentElement; while (p && cs(p).display === 'contents') p = p.parentElement;
      if (!p) return false;
      var ps = cs(p);
      if (/flex/.test(ps.display) && /column/.test(ps.flexDirection) && /center/.test(s.alignSelf === 'auto' ? ps.alignItems : s.alignSelf)) return true;
      if (/flex/.test(ps.display) && !/column/.test(ps.flexDirection) && /center|space-(around|evenly)/.test(ps.justifyContent)) return true;
      if (/grid/.test(ps.display) && /center/.test(s.justifySelf === 'auto' ? ps.justifyItems : s.justifySelf)) return true;
      if (s.marginLeft === s.marginRight && px(s.marginLeft) > 0 && /block/.test(s.display)) return true;
      return false;
    }
    /* THE ROOT CAUSE of an off-axis block: the outermost box between it and its axis whose edge is the block's start —
       the element whose padding, margin, cap or centring put the whole group there */
    function causeOf(el, start, ax, byRight) {
      var cause = el;
      /* a full-bleed band's own padding can be the cause: the walk may reach the band itself */
      for (var n = el; n && n !== top && (n !== ax.a || ax.band); n = n.parentElement) {
        var ns = cs(n); if (ns.display === 'contents') continue;
        var nr = n.getBoundingClientRect();
        var hit = byRight ? (Math.abs(contentRight(n, ns) - start) <= tol || Math.abs(nr.right - start) <= tol)
          : (Math.abs(contentLeft(n, ns) - start) <= tol || Math.abs(nr.left - start) <= tol);
        if (hit) cause = n; else if (n !== el) break;
        if (n === ax.a) break;
      }
      return path(cause);
    }
    function isFull(r) { return r.left <= tol && r.right >= vw - tol; }
    function contentLeft(el, s) { var r = el.getBoundingClientRect(); return r.left + px(s.borderLeftWidth) + px(s.paddingLeft); }
    function contentRight(el, s) { var r = el.getBoundingClientRect(); return r.right - px(s.borderRightWidth) - px(s.paddingRight); }
    /* the axis a block must start on: the content edge of the nearest component that holds it, else the wall */
    function axisOf(el) {
      for (var a = el.parentElement; a && a !== top; a = a.parentElement) {
        var s = cs(a);
        if (s.display === 'contents') continue;   /* no box of its own: its children are laid out by its parent */
        if (s.position === 'absolute' || s.position === 'sticky' && a.matches(layerSel)) return { kind: 'overlay', a: a };
        if (scrolls(a, s)) return { kind: 'rail', a: a };
        var r = a.getBoundingClientRect();
        if (isBox(a, s)) { if (isFull(r)) return { kind: 'wall', l: wl, r: wr, a: a, band: true }; return { kind: 'box', l: contentLeft(a, s), r: contentRight(a, s), a: a }; }
        if (isColumn(a)) return { kind: 'column', l: contentLeft(a, s), r: contentRight(a, s), a: a };
        if (/^(TD|TH|LI)$/.test(a.tagName) && a.parentElement && /^(OL|UL)$/.test(a.parentElement.tagName) && cs(a.parentElement).listStyleType !== 'none') return { kind: 'list', a: a };
      }
      return { kind: 'wall', l: wl, r: wr };
    }

    /* 1 · OVERFLOW — nothing scrolls sideways (a panel: nothing inside it) */
    if (scope && scope.scrollWidth > scope.clientWidth + 1) V.push({ type: 'OVERFLOW', component: opts.panel, primitive: opts.panel, expected: 'scrollWidth ≤ ' + scope.clientWidth, actual: 'scrollWidth ' + scope.scrollWidth, box: { x: R(wl), y: 0, w: R(wr - wl), h: 1 } });
    if (!scope && doc.scrollWidth > vw + 0.5) V.push({ type: 'OVERFLOW', component: 'document', primitive: 'html', expected: 'scrollWidth ≤ ' + vw, actual: 'scrollWidth ' + doc.scrollWidth, box: { x: 0, y: 0, w: doc.scrollWidth, h: 1 } });

    /* 2 · HEADER — the header's inner edges are the wall */
    var hd = scope ? null : document.querySelector(C.header.sel), bag = document.querySelector(C.header.right);
    if (hd && cs(hd).display !== 'none') {
      var hs = cs(hd), hl = contentLeft(hd, hs), hr = contentRight(hd, hs);
      if (Math.abs(hl - wl) > tol || Math.abs(hr - wr) > tol) add('HEADER_WALL', hd, 'content ' + R(wl) + '–' + R(wr), 'content ' + R(hl) + '–' + R(hr));
      if (bag) { var br = bag.getBoundingClientRect(); if (Math.abs(br.right - wr) > tol) add('HEADER_WALL', bag, 'right edge ' + R(wr), 'right edge ' + R(br.right)); }
    }

    var all = top.querySelectorAll('*'), blocks = [];
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|BR|SOURCE|TRACK|META|LINK|OPTION|WBR)$/.test(el.tagName)) continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      var s = cs(el);
      /* a rail that really scrolls sideways is a page-level block like a photograph: its scrollport sits on the wall */
      var media = /^(IMG|VIDEO|CANVAS|IFRAME|svg)$/.test(el.tagName) || el.matches(C.mediaFrames) || scrolls(el, s);
      var hasText = false;
      for (var k = 0; k < el.childNodes.length; k++) { var c = el.childNodes[k]; if (c.nodeType === 3 && c.data.trim()) { hasText = true; break; } }
      var box = isBox(el, s);
      if (!media && !hasText && !box) continue;
      var st = state(el); if (st) continue;
      var rr = r;
      if (hasText && !media && !box) { var rg = document.createRange(); rg.selectNodeContents(el); rr = rg.getBoundingClientRect(); if (rr.width < 1) continue; }
      var v = visible(el, rr);
      if (v.r - v.l < 1 || v.b - v.t < 1) continue;

      /* 3 · CONTAINMENT — inside the wall, or a declared full-bleed band */
      var ctol = (hasText && !media && !box) ? C.textTolerance : tol;   /* text ink: WebKit rounds a line's last glyph advance */
      if (!v.rail && (v.l < wl - ctol || v.r > wr + ctol)) {
        var fb = withinAt(el, C.fullBleed);
        if (!fb) add('OUTSIDE_WALL', el, 'within ' + R(wl) + '–' + R(wr), R(v.l) + '–' + R(v.r));
        else if (!isFull(r) && el.matches(fb.sel)) add('BLEED_PARTIAL', el, 'a full-bleed band spans 0–' + vw, R(r.left) + '–' + R(r.right));
      }

      /* 4 · TEXT — never cut: a clipping block whose text runs past its box, unless it declares an ellipsis */
      if (hasText && /hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && el.scrollWidth > el.clientWidth + 1 && !el.matches(C.clipOk)) add('TEXT_CLIPPED', el, 'scrollWidth ≤ ' + el.clientWidth, 'scrollWidth ' + el.scrollWidth);

      /* 5 · MEDIA GEOMETRY — a photograph loads (never a blank frame) and keeps its proportions */
      if (el.tagName === 'IMG' && el.complete && el.naturalWidth === 0 && el.getAttribute('src')) add('MEDIA_BROKEN', el, 'the photograph loads', 'naturalWidth 0 (' + el.getAttribute('src').split('?')[0].slice(-60) + ')');
      if (el.tagName === 'IMG' && el.naturalWidth && s.objectFit === 'fill') {
        var nat = el.naturalWidth / el.naturalHeight, ren = r.width / r.height;
        if (Math.abs(nat / ren - 1) > C.media.distortion) add('MEDIA_DISTORTED', el, 'aspect ' + nat.toFixed(3), 'aspect ' + ren.toFixed(3));
      }

      /* 6 · AXIS — a block of text, a component or a photograph starts on its axis */
      var display = s.display;
      if (/^inline(?!-(block|flex|grid))/.test(display) && !media) continue;
      if (/^inline/.test(display) && !media && !box) continue;
      if (s.position === 'absolute' || s.position === 'fixed') continue;
      if (v.rail) continue;
      var ax = axisOf(el);
      if (ax.kind === 'overlay' || ax.kind === 'rail' || ax.kind === 'list') continue;
      var free = within(el, C.axisFree); if (free) continue;
      /* a list item that draws its own marker (a bullet, a dash) is indented by the marker, by design */
      if (el.tagName === 'LI') { var mk = getComputedStyle(el, '::before').content; if (mk && mk !== 'none' && mk !== 'normal') continue; }
      /* a photograph deliberately narrower than the wall is a declared primitive, with its own alignment */
      var nm = media && withinAt(el, C.narrowMedia);
      if (nm && nm.align === 'center') continue;
      /* inside a component, a block the component centres by its layout (a centred flex column, centred grid items, auto
         margins) is the component's composition; on the page itself centring is never an axis */
      if (ax.kind !== 'wall' && centredByLayout(el, s)) continue;
      var align = s.textAlign;
      /* a block's start is its box (a photograph, a component) or its content edge (text: a leading ornament drawn by the
         block itself, e.g. a rule before a label, is part of the block) */
      var start = (media || box) ? r.left : contentLeft(el, s);
      var centered = !media && !box && (align === 'center' || align === '-webkit-center');
      var right = !media && !box && (align === 'right' || align === 'end');
      if (right) continue;
      if (centered) {
        /* centred text is a primitive's choice, never a page's: only declared centred components may centre a line of text */
        if (!withinAt(el, C.centered) && (rr.width < (ax.r - ax.l) - 2 * tol)) add('AXIS_CENTERED', el, 'text starts on ' + ax.kind + ' ' + R(ax.l), 'centred, starts ' + R(rr.left), { axis: ax.kind });
        continue;
      }
      /* inside a component, its own inner wrappers are the component's business: any content edge between the block and
         the component is an axis; on the page, only the wall is */
      var onAxis = Math.abs(start - ax.l) <= tol;
      if (!onAxis && ax.kind !== 'wall') {
        /* … and inside a component a block may close on its END edge instead (a code, a price, a mark set to the right) */
        if (Math.abs(r.right - ax.r) <= tol) onAxis = true;
        for (var w = el.parentElement; !onAxis && w && w !== ax.a; w = w.parentElement) { var ws = cs(w); if (Math.abs(start - contentLeft(w, ws)) <= tol || Math.abs(r.right - contentRight(w, ws)) <= tol) onAxis = true; }
      }
      if (!onAxis && start > ax.l) {
        /* a block may sit to the right of its axis only as the second item of a row (it is then its own column) */
        if (!isColumn(el)) add(ax.kind === 'wall' ? 'AXIS_WALL' : 'AXIS_INNER', el, (ax.kind === 'wall' ? 'wall ' : ax.kind + ' edge ') + R(ax.l), 'starts ' + R(start), { axis: ax.kind, offset: R(start - ax.l), cause: causeOf(el, start, ax) });
      }
      /* 7 · MEDIA WALL — a page-level photograph spans the wall exactly (a narrower one is a declared primitive) */
      if (media && ax.kind === 'wall' && !ax.band && !isColumn(el) && !withinAt(el, C.narrowMedia)) {
        if (Math.abs(r.left - wl) > tol || Math.abs(r.right - wr) > tol) {
          var fbm = withinAt(el, C.fullBleed);
          if (!(fbm && isFull(r))) add('MEDIA_WALL', el, R(wl) + '–' + R(wr), R(r.left) + '–' + R(r.right), { cause: Math.abs(r.left - wl) > tol ? causeOf(el, r.left, ax) : causeOf(el, r.right, ax, true) });
        }
      }
      if (el.parentElement && el.parentElement.closest(C.flowRoot)) blocks.push(el);
    }

    /* 8 · SECTION RHYTHM — consecutive sections never overlap and never open a void */
    var roots = scope ? [] : document.querySelectorAll(C.flowRoot);
    var gm = px(root.getPropertyValue('--a-gap-media')), rh = px(root.getPropertyValue('--a-rhythm'));
    var voidMax = C.rhythm.voidFactor * Math.max(gm, rh, 64);
    for (var q = 0; q < roots.length; q++) {
      if (state(roots[q])) continue;
      var kids = [].filter.call(roots[q].children, function (x) { var z = cs(x); return z.display !== 'none' && z.position !== 'absolute' && z.position !== 'fixed' && x.getBoundingClientRect().height > 0 && !/^(SCRIPT|STYLE|TEMPLATE)$/.test(x.tagName); });
      for (var j = 1; j < kids.length; j++) {
        var a = kids[j - 1].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
        var gap = b.top - a.bottom;
        if (gap < -tol && b.left < a.right && b.right > a.left) add('SECTION_OVERLAP', kids[j], 'starts at or below ' + R(a.bottom + sy), 'starts ' + R(b.top + sy) + ' (' + R(gap) + ')');
        else if (gap > voidMax) add('SECTION_VOID', kids[j], 'gap ≤ ' + R(voidMax), 'gap ' + R(gap));
      }
    }
    return { geometry: { vw: vw, vh: vh, wl: wl, wr: wr, gut: gut, frame: frame, scrollWidth: doc.scrollWidth, height: doc.scrollHeight, panel: !!scope }, violations: V, exceptions: used };
  }

  /* the diagnostic overlay: the wall, and every offending box outlined and numbered — QA artifacts only, never shipped */
  function annotate(geo, list) {
    var old = document.getElementById('lqa-overlay'); if (old) old.remove();
    var o = document.createElement('div'); o.id = 'lqa-overlay';
    o.style.cssText = (geo.panel ? 'position:fixed;' : 'position:absolute;') + 'left:0;top:0;width:' + document.documentElement.clientWidth + 'px;height:' + (geo.panel ? window.innerHeight : document.documentElement.scrollHeight) + 'px;pointer-events:none;z-index:2147483647';
    function line(x, color) { var d = document.createElement('div'); d.style.cssText = 'position:absolute;top:0;bottom:0;left:' + x + 'px;width:0;border-left:1px dashed ' + color; o.appendChild(d); }
    line(geo.wl, '#0a7cff'); line(geo.wr, '#0a7cff');
    list.forEach(function (v, i) {
      var d = document.createElement('div');
      d.style.cssText = 'position:absolute;left:' + v.box.x + 'px;top:' + v.box.y + 'px;width:' + Math.max(v.box.w, 2) + 'px;height:' + Math.max(v.box.h, 2) + 'px;outline:2px solid #ff1f1f;background:rgba(255,31,31,.08)';
      var t = document.createElement('span'); t.textContent = (i + 1) + ' ' + v.type;
      t.style.cssText = 'position:absolute;left:0;top:-18px;font:600 11px/16px monospace;background:#ff1f1f;color:#fff;padding:0 4px;white-space:nowrap';
      d.appendChild(t); o.appendChild(d);
    });
    document.body.appendChild(o);
  }
  window.__LQA = { run: run, annotate: annotate };
})();
