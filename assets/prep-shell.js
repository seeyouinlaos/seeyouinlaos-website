/* ============================================================================
   SEE YOU IN LAOS — THE PREPARATION SHELL.

   One shell for the whole private journey. Every authenticated Preparation
   surface is a page inside it, and the guest never has to reconstruct where
   they are:

       YOUR PRIVATE JOURNEY
       02 / 06 · Your Journey
       Peggy · Your party · Peggy & Steffie          VIEW ALL STEPS

   THE BOUNDARY IS HARD. Before an invitation is open there is no 01–06 and no
   Preparation navigation at all — there is the editorial website and a way in.
   ONE CODE = ONE GUEST (Owner, 14 Sep 2026): the code opens the guest's own
   invitation, and the guest IS the session. There is no switch, nobody to
   answer for. OPEN ANOTHER INVITATION and SIGN OUT are always in reach.

   THE FLOW IS SEQUENTIAL. The six steps are read from ONE readiness engine
   (assets/guest.js): ✓ COMPLETE · CURRENT · NEEDS ATTENTION · LOCKED. A step
   that needs attention says exactly what is missing, with a link to the very
   control; a locked step cannot be entered until the earlier ones are done;
   a deep link into a locked step lands on the first missing item instead.
   Every CONTINUE checks the engine before it moves.

   The shell also owns the one disclosure contract: a detail layer opens INSIDE
   the private journey and closing it returns the guest exactly where they were.
   Nothing here decides anything about a product, a price or an allocation.
   ========================================================================== */
(function () {
  'use strict';

  /* The six steps. There is no seventh. */
  var STEPS = [
    { n: '01', key: 'you',        label: 'Your Invitation',       file: 'invitation.html' },
    { n: '02', key: 'journey',    label: 'My Trip',               file: 'your-journey.html' },
    { n: '03', key: 'wedding',    label: 'The Wedding',           file: 'wedding.html' },
    { n: '04', key: 'preparation',label: 'Wedding Preparation',   file: 'wedding-preparation.html' },
    { n: '05', key: 'about',      label: 'My Profile',             file: 'about-you.html' },
    { n: '06', key: 'review',     label: 'Review & Send',         file: 'review.html' }
  ];

  /* Cloudflare serves /review, the mirror serves /review.html — same page. */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase().replace(/\.html$/, '');
  /* a page inside a step (you.html belongs to 01) says so on its <main data-step> */
  var sub = document.querySelector('main[data-step]');
  var subKey = sub && sub.getAttribute('data-step');
  if (subKey === 'invitation') subKey = 'you';
  if (subKey) here = STEPS.filter(function (s) { return s.key === subKey; }).map(function (s) { return s.file.replace(/\.html$/, ''); })[0] || here;
  var idx = STEPS.map(function (s) { return s.file.replace(/\.html$/, ''); }).indexOf(here);
  if (idx < 0) return;
  var STEP = STEPS[idx];

  /* ------------------------------------------------------------- identity
   * The model lives in the guest record (assets/guest.js). The shell only
   * asks it: who is the guest, who belongs to their party. */
  function G() { return window.SIYL_GUEST || null; }
  function party() { var g = G(); return g ? g.party() : null; }
  function me() { var g = G(); return g ? g.me() : null; }
  function nameOf(g) { var m = G(); return (g && m) ? m.nameOf(g.guestId) : ''; }
  function partyNames() { var g = G(); return g ? g.partyNames() : ''; }
  function steps() { var g = G(); return g && party() ? g.steps(STEP.key) : []; }

  /* the retired vocabulary, for any reader that still asks */
  function status(key) {
    var s = steps().filter(function (x) { return x.key === key; })[0];
    if (!s) return '';
    return s.state === 'complete' ? 'Complete' : s.state === 'current' ? 'Current' : s.state === 'locked' ? 'Locked' : 'Needs attention';
  }

  /* ----------------------------------------------------------------- shell */
  var bar, layer, stepsScrim, drawer, scrim, lastFocus, indexOpen = false, indexFocus = null;
  /* motion is a courtesy, never a requirement: with reduced motion every
   * change is immediate and nothing moves */
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  /* Cloudflare serves /wedding, the mirror serves /wedding.html: the shell
   * links the way this origin already addresses the page, so a tap is one
   * navigation and never a redirect first */
  var cleanUrls = !/\.html$/i.test(location.pathname) && location.pathname.split('/').pop() !== '';
  function hrefOf(file) { return cleanUrls ? file.replace(/\.html(?=[?#]|$)/, '') : file; }

  function build() {
    bar = document.createElement('div');
    bar.className = 'prep-bar';
    /* the step index is part of the sticky bar itself, so it opens exactly
     * where the guest is looking — under the bar — wherever the page is
     * scrolled, and never pushes the page around */
    layer = document.createElement('div');
    layer.className = 'prep-steps';
    layer.id = 'prep-steps';
    layer.setAttribute('role', 'region'); layer.setAttribute('aria-label', 'All steps');
    var host = document.querySelector('header.hd, header');
    if (host && host.parentNode) host.parentNode.insertBefore(bar, host.nextSibling);
    else document.body.insertBefore(bar, document.body.firstChild);
    stepsScrim = document.createElement('div'); stepsScrim.className = 'prep-steps-scrim';
    document.body.appendChild(stepsScrim);
    stepsScrim.addEventListener('click', function () { closeIndex(true); });
    /* the page underneath keeps its position while the index is open */
    stepsScrim.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
    stepsScrim.addEventListener('wheel', function (e) { e.preventDefault(); }, { passive: false });

    scrim = document.createElement('div'); scrim.className = 'p-drawer-scrim';
    drawer = document.createElement('aside'); drawer.className = 'p-drawer';
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.hidden = true;
    document.body.append(scrim, drawer);
    scrim.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('p-drawer-open')) { closeDrawer(); return; }
      if (e.key === 'Escape' && indexOpen) closeIndex(true);
      /* the drawer keeps the keyboard inside itself while it is open */
      if (e.key === 'Tab' && document.body.classList.contains('p-drawer-open') && drawer && !drawer.hidden) {
        var f = drawer.querySelectorAll('button, a[href], input, textarea, select, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    /* anchors and deep links land below the sticky bar, never under it */
    measureBar = function () { document.documentElement.style.setProperty('--prep-bar-h', bar.offsetHeight + 'px'); };
    if (window.ResizeObserver) new ResizeObserver(measureBar).observe(bar); else window.addEventListener('resize', measureBar);
    measureBar();
  }
  var measureBar = function () {};
  /* a deep link (#documents, #ack, #seats …) lands below the bar, not under
   * it: once the shell has its height the fragment is settled again — once,
   * right after arrival, never later and never against the guest's own scroll */
  function settleFragment() {
    var id = (location.hash || '').slice(1); if (!id) return;
    var t = document.getElementById(id); if (!t) return;
    measureBar();
    t.scrollIntoView({ block: 'start' });
  }

  /* ------------------------------------------------------ leaving a guest */
  function leave(how) {
    if (!window.SIYL_INVITE || !SIYL_INVITE.leave) return;
    layer.classList.remove('on'); document.body.classList.remove('prep-steps-open');
    document.body.classList.add('p-leave');
    var go = function () {
      SIYL_INVITE.leave();
      location.replace(hrefOf('invitation.html') + (how === 'another' ? '?open=1' : ''));
    };
    if (calm) go(); else setTimeout(go, 200);
  }
  window.addEventListener('pageshow', function (e) {
    /* a page restored from the cache after the guest left it is not shown again */
    if (e.persisted && window.SIYL_AUTH && !SIYL_AUTH.get()) location.reload();
  });

  /* -------------------------------------------------------- the step index */
  function openIndex() {
    if (indexOpen) return;
    indexOpen = true; indexFocus = document.activeElement;
    layer.classList.add('on');
    document.body.classList.add('prep-steps-open');
    var all = bar.querySelector('.prep-all'); if (all) all.setAttribute('aria-expanded', 'true');
  }
  function closeIndex(restoreFocus) {
    if (!indexOpen) return;
    indexOpen = false;
    layer.classList.remove('on');
    document.body.classList.remove('prep-steps-open');
    var all = bar.querySelector('.prep-all'); if (all) all.setAttribute('aria-expanded', 'false');
    if (restoreFocus && indexFocus && indexFocus.focus) indexFocus.focus({ preventScroll: true });
    indexFocus = null;
  }
  /* one tap, one destination. The index and the page take their leave first;
   * with reduced motion the page simply changes. */
  var leaving = false;
  function goTo(url) {
    if (leaving) return; leaving = true;
    layer.classList.remove('on');
    document.body.classList.remove('prep-steps-open');
    document.body.classList.add('p-leave');
    var go = function () { location.href = url; };
    if (calm) go(); else setTimeout(go, 200);
  }
  /* a link to a control on this very page: close the index and go there */
  function samePage(href) {
    var file = href.split('#')[0].split('?')[0];
    return file === '' || file.replace(/\.html$/, '') === STEP.file.replace(/\.html$/, '') || file.replace(/\.html$/, '') === here;
  }
  function focusControl(hash) {
    var id = (hash || '').replace(/^#/, ''); if (!id) return;
    var t = document.getElementById(id); if (!t) return;
    measureBar();
    t.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'center' });
    var f = t.matches('input, textarea, select, button, a[href]') ? t : t.querySelector('input:not([type=hidden]), textarea, select, button, a[href]');
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) {} }, calm ? 0 : 320);
    t.classList.remove('p-attend'); void t.offsetWidth; t.classList.add('p-attend');
  }

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function paint() {
    if (!bar) return;
    var p = party(), m = me();

    /* Before the invitation is open there is no Preparation navigation — and no
     * private page either (Owner, Edit 3 · 16 Sep 2026): the guest goes to the
     * invitation page and comes back here once signed in. */
    if (!p || !m) {
      if (!/^invitation(\.html)?$/.test(location.pathname.split('/').pop())) {
        var toGate = function () { if (window.SIYL_INVITE && SIYL_INVITE.require) SIYL_INVITE.require(function () {}); };
        if (window.SIYL_INVITE) toGate(); else document.addEventListener('siyl:invite-ready', toGate, { once: true });
      }
      bar.innerHTML = '<div class="prep-bar-in"><div class="prep-bar-l">' +
        '<p class="prep-eyebrow">Your private journey</p>' +
        '<p class="prep-step">Open your invitation to begin</p>' +
        '</div></div>';
      layer.classList.remove('on');
      return;
    }

    var list = steps(), cur = list.filter(function (s) { return s.key === STEP.key; })[0];
    var others = G().others ? G().others() : [];
    bar.innerHTML = '<div class="prep-bar-in">' +
      '<div class="prep-bar-l">' +
        '<p class="prep-eyebrow">Your private journey</p>' +
        '<p class="prep-step"><b>' + STEP.n + ' / 06</b>' + STEP.label + '</p>' +
        '<p class="prep-who"><b>' + esc(nameOf(m)) + '</b>' + (others.length ? ' · Your party · ' + esc(partyNames()) : '') + '</p>' +
        /* once Guest Relations has confirmed, a change made here is not a
         * change of the confirmed journey — said on every step, in words */
        ((window.SIYL_CONFIRM && SIYL_CONFIRM.state() === 'confirmed' && STEP.key !== 'review')
          ? '<p class="prep-for" role="status"><span class="prep-for-l">Journey confirmed</span>' +
            '<b>Changes here are not sent</b>' +
            '<a href="mailto:guest.relation.seeyouinlaos@gmail.com?subject=Journey%20' + encodeURIComponent(p.invitationId) + '">Write to Guest Relations to change anything</a></p>' : '') +
      '</div>' +
      '<div class="prep-bar-r"><button type="button" class="prep-all" aria-expanded="' + (indexOpen ? 'true' : 'false') + '" aria-controls="prep-steps">View all steps</button></div>' +
      '</div>' +
      /* DRAFT · SENT · CHANGES NOT YET SENT and SAVE MY PROGRESS on every step (Owner, 16 Sep 2026) — painted by the draft module */
      '<div class="prep-save" data-prep-save></div>';
    bar.appendChild(layer);
    if (window.SIYL_DRAFT) SIYL_DRAFT.mount(bar.querySelector('[data-prep-save]'));

    layer.innerHTML = '<div class="prep-steps-in">' + list.map(function (s) {
      var curRow = s.key === STEP.key, locked = s.state === 'locked';
      var tag = locked ? 'div' : 'a';
      var h = '<' + tag + ' class="prep-srow is-' + s.state + '"' + (curRow ? ' aria-current="step"' : '') + (locked ? ' aria-disabled="true"' : ' href="' + hrefOf(s.href) + '"') + ' data-step="' + s.key + '" data-state="' + s.state + '">' +
        '<span class="n">' + s.n + '</span><span class="l">' + s.label + (s.note ? '<span class="prep-note">' + esc(s.note) + '</span>' : '') + '</span>' +
        '<span class="s" data-state-label>' + (s.state === 'complete' ? '<i class="prep-tick" aria-hidden="true"></i>' : '') + esc(s.stateLabel.replace(/^✓\s*/, '')) + '</span></' + tag + '>';
      /* what is missing, each item a way to the exact control */
      if (s.state === 'attention' || (curRow && s.missing.length)) {
        h += '<ul class="prep-missing" aria-label="' + esc(s.label) + ' — still needed">' + s.missing.map(function (x) {
          return '<li><a href="' + hrefOf(x.href) + '" data-missing="' + esc(x.key) + '"><span class="prep-dot" aria-hidden="true"></span>' + esc(x.label) + '</a></li>';
        }).join('') + '</ul>';
      }
      return h;
    }).join('') +
      /* leaving: two plain actions, on every step — the only way to another invitation */
      '<div class="prep-leave"><span class="t-l1">' + esc(nameOf(m)) + (others.length ? ' · ' + esc(partyNames()) : '') + '</span>' +
      '<button type="button" class="p-link" data-leave="another">Open another invitation</button>' +
      '<button type="button" class="p-link mute" data-leave="out">Sign out</button></div></div>';
    layer.querySelectorAll('[data-leave]').forEach(function (b) { b.addEventListener('click', function () { leave(b.getAttribute('data-leave')); }); });
    layer.classList.toggle('on', indexOpen);
    layer.querySelectorAll('a.prep-srow').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var key = row.getAttribute('data-step');
        /* the current step is where the guest already is: the index simply closes */
        if (key === STEP.key) { closeIndex(true); return; }
        row.classList.add('pressed');
        goTo(row.getAttribute('href'));
      });
    });
    layer.querySelectorAll('[data-missing]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (samePage(href)) { e.preventDefault(); closeIndex(false); focusControl(href.split('#')[1] ? '#' + href.split('#')[1] : ''); return; }
        e.preventDefault(); goTo(href);
      });
    });

    var all = bar.querySelector('.prep-all');
    all.addEventListener('click', function () { if (indexOpen) closeIndex(false); else openIndex(); });
    measureBar();
  }

  /* -------------------------------------------------------- detail layer */
  var lockedY = 0;
  function lockScroll() {
    if (document.body.classList.contains('p-scroll-lock')) return;
    lockedY = window.scrollY || window.pageYOffset || 0;
    document.body.style.top = (-lockedY) + 'px';
    document.body.classList.add('p-scroll-lock');
  }
  function unlockScroll() {
    if (!document.body.classList.contains('p-scroll-lock')) return;
    document.body.classList.remove('p-scroll-lock');
    document.body.style.top = '';
    window.scrollTo(0, lockedY);
  }
  function openDrawer(html, wire) {
    lastFocus = document.activeElement;
    if (indexOpen) closeIndex(false);
    lockScroll();
    drawer.hidden = false;
    drawer.innerHTML = '<div class="p-drawer-in"><div class="p-drawer-x">' +
      '<button type="button" class="p-link mute" data-close>Close</button></div>' + html + '</div>';
    document.body.classList.add('p-drawer-open');
    drawer.querySelector('[data-close]').addEventListener('click', closeDrawer);
    var hd = drawer.querySelector('h1, h2, h3, .t-h1, .t-h2');
    drawer.setAttribute('aria-label', hd ? hd.textContent.trim() : 'Details');
    if (wire) wire(drawer);
    var f = drawer.querySelector('button, a[href], input, textarea');
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeDrawer() {
    if (!document.body.classList.contains('p-drawer-open')) return;
    document.body.classList.remove('p-drawer-open');
    unlockScroll();
    setTimeout(function () { if (drawer) { drawer.hidden = true; drawer.innerHTML = ''; } }, calm ? 0 : 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- foot
   * One primary continuation at the natural completion point, and one quiet
   * way back. THE CONTINUE IS STRICT: it asks the engine first. Incomplete →
   * the first missing control is brought into view with the reason, and the
   * page does not move on. Complete → the step is marked, the check draws,
   * the next step opens. */
  function foot(el) {
    if (!el) return;
    var prev = STEPS[idx - 1], next = STEPS[idx + 1];
    el.className = 'prep-foot';
    el.innerHTML =
      (prev ? '<a class="p-link mute" href="' + hrefOf(prev.file) + '">Back to ' + prev.label + '</a>' : '<span></span>') +
      (next ? '<button type="button" class="p-act" data-continue="' + next.key + '">Continue to ' + next.label + '</button>' : '') +
      '<p class="t-b2 prep-foot-note" role="status" aria-live="polite" hidden></p>';
    var b = el.querySelector('[data-continue]'), note = el.querySelector('.prep-foot-note');
    if (!b) return;
    b.addEventListener('click', function () { continueTo(next, b, note); });
  }
  function continueTo(next, b, note) {
    var g = G(); if (!g || !party()) { location.href = hrefOf('invitation.html'); return; }
    var missing = g.missingFor(STEP.key);
    if (missing.length) {
      var first = missing[0];
      if (note) { note.hidden = false; note.textContent = 'Before you continue: ' + first.label.replace(/ — .*$/, '') + '.'; }
      b.classList.remove('p-shake'); void b.offsetWidth; b.classList.add('p-shake');
      if (samePage(first.href)) focusControl('#' + (first.href.split('#')[1] || ''));
      else goTo(hrefOf(first.href));
      return;
    }
    /* complete: the check draws on the button, then the next step */
    b.classList.add('is-done'); b.setAttribute('aria-disabled', 'true');
    b.innerHTML = '<i class="prep-tick big" aria-hidden="true"></i>Complete';
    if (note) { note.hidden = false; note.textContent = STEP.label + ' complete.'; }
    setTimeout(function () { goTo(hrefOf(next.file)); }, calm ? 0 : 520);
  }

  window.SIYL_PREP = {
    STEPS: STEPS,
    step: STEP,
    party: party,
    me: me,
    active: me,
    activeName: function () { return nameOf(me()); },
    subject: me,
    subjectName: function () { return nameOf(me()); },
    answeringFor: function () { return false; },
    partyNames: partyNames,
    partyLabel: function () { var g = G(); return g ? g.partyLabel() : ''; },
    labelFor: function (id) { var g = G(); return g ? g.labelFor(id) : ''; },
    drawer: openDrawer,
    closeDrawer: closeDrawer,
    openIndex: openIndex,
    closeIndex: closeIndex,
    leave: leave,
    indexOpen: function () { return indexOpen; },
    foot: foot,
    status: status,
    focusControl: focusControl,
    hrefOf: hrefOf,
    /* a page asks the shell whether it may show its content at all */
    ready: function () { return !!(party() && me()); }
  };

  /* THE GATE: a step behind an incomplete required step is not entered —
   * the guest lands on the first missing item instead, and is told why */
  function gate() {
    var g = G(); if (!g || !party()) return false;
    if (STEP.key === 'you') return false;
    if (g.mayEnter(STEP.key)) return false;
    var fm = g.firstMissing(); if (!fm) return false;
    /* the destination is a control on this same page: no navigation, just the control */
    if (samePage(fm.href)) { focusControl('#' + (fm.href.split('#')[1] || '')); return false; }
    var parts = /^([^?#]*)(\?[^#]*)?(#.*)?$/.exec(fm.href) || [];
    var to = (parts[1] || fm.href) + (parts[2] ? parts[2] + '&' : '?') + 'from=' + STEP.key + (parts[3] || '');
    location.replace(hrefOf(to));
    return true;
  }
  /* arriving from a gate: say, once, why this page and not the one asked for */
  function arrivedFrom() {
    var m = /[?&]from=([a-z]+)/.exec(location.search); if (!m) return;
    var from = STEPS.filter(function (s) { return s.key === m[1]; })[0]; if (!from) return;
    var n = document.createElement('p'); n.className = 'prep-gate-note t-b2'; n.setAttribute('role', 'status');
    n.textContent = from.n + ' · ' + from.label + ' opens once this is complete.';
    var main = document.querySelector('main'); if (main) main.insertBefore(n, main.firstChild);
  }

  function init() {
    document.body.classList.add('prep');
    if (calm) document.body.classList.add('p-calm');
    build();
    if (gate()) return;
    paint();
    arrivedFrom();
    /* the step arrives: one quiet entrance, from where the guest expects it —
     * the top of the step; a hash deep link keeps its own target */
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { document.body.classList.add('p-in'); settleFragment(); }); });
    var settled = 0; var late = function () { if (settled++ < 2) window.requestAnimationFrame(settleFragment); };
    document.addEventListener('siyl:invite-ready', late);
    window.addEventListener('load', late);
    if (location.hash && window.ResizeObserver) {
      var until = Date.now() + 3000, moved = false, mark = function () { moved = true; };
      ['wheel', 'touchmove', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, mark, { passive: true, once: true }); });
      var ro = new ResizeObserver(function () { if (moved || Date.now() > until) { ro.disconnect(); return; } settleFragment(); });
      ro.observe(document.body);
    }
    /* coming back (bfcache, history) the page is whole again and the index closed */
    window.addEventListener('pageshow', function (e) {
      document.body.classList.remove('p-leave'); leaving = false;
      document.body.classList.add('p-in');
      if (e.persisted) { closeIndex(false); unlockScroll(); }
    });
    ['siyl:guest', 'siyl:temple', 'siyl:bag', 'siyl:docs', 'siyl:confirm', 'siyl:seats', 'siyl:units'].forEach(function (ev) { document.addEventListener(ev, paint); });
    /* the journey's status (none / received / confirmed) is one truth on every
     * step, not only on Review & Send: read it once the guest is known */
    if (window.SIYL_CONFIRM && party()) SIYL_CONFIRM.load();
    document.addEventListener('siyl:auth', function () { if (window.SIYL_CONFIRM) SIYL_CONFIRM.load(true); if (!gate()) paint(); });
    document.addEventListener('siyl:invite-ready', paint);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
