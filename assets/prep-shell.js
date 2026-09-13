/* ============================================================================
   SEE YOU IN LAOS — THE PREPARATION SHELL.

   One shell for the whole private journey. Every authenticated Preparation
   surface is a page inside it, and the guest never has to reconstruct where
   they are:

       YOUR PRIVATE JOURNEY
       02 / 06 · Your Journey
       Peggy & Steffie · Continuing as Peggy · SWITCH      VIEW ALL STEPS

   THE BOUNDARY IS HARD. Before an invitation is open there is no 01–06 and no
   Preparation navigation at all — there is the editorial website and a way in.
   The code opens the INVITATION; the person then says who they are. Those are
   two different things and the shell keeps them apart:

       SWITCH IDENTITY   I continue as another member of this invitation
       ANSWERING FOR     I stay myself and deliberately complete for another

   The shell also owns the one disclosure contract: a detail layer opens INSIDE
   the private journey and closing it returns the guest exactly where they were.
   Nothing here decides anything about a product, a price or an allocation.
   ========================================================================== */
(function () {
  'use strict';

  /* The six steps. There is no seventh. */
  var STEPS = [
    { n: '01', key: 'invitation', label: 'Your Invitation',       file: 'invitation.html' },
    { n: '02', key: 'journey',    label: 'Your Journey',          file: 'your-journey.html' },
    { n: '03', key: 'wedding',    label: 'The Wedding',           file: 'wedding.html' },
    { n: '04', key: 'preparation',label: 'Wedding Preparation',   file: 'wedding-preparation.html' },
    { n: '05', key: 'about',      label: 'About You',             file: 'about-you.html' },
    { n: '06', key: 'review',     label: 'Review & Send',         file: 'review.html' }
  ];
  var WHO = 'siyl.who';

  /* Cloudflare serves /review, the mirror serves /review.html — same page. */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase().replace(/\.html$/, '');
  /* a page inside a step (you.html belongs to 01) says so on its <main data-step> */
  var sub = document.querySelector('main[data-step]');
  if (sub && sub.getAttribute('data-step')) here = STEPS.filter(function (s) { return s.key === sub.getAttribute('data-step'); }).map(function (s) { return s.file.replace(/\.html$/, ''); })[0] || here;
  var idx = STEPS.map(function (s) { return s.file.replace(/\.html$/, ''); }).indexOf(here);
  if (idx < 0) return;
  var STEP = STEPS[idx];

  /* ------------------------------------------------------------- identity
   * C · the model lives in the guest record (assets/guest.js). The shell only
   * asks it: who is the party, who is continuing, who is being answered for. */
  function G() { return window.SIYL_GUEST || null; }
  function party() { var g = G(); return g ? g.party() : null; }
  function active() { var g = G(); return g ? g.active() : null; }
  function subject() { var g = G(); return g ? g.subject() : null; }
  function answeringFor() { var g = G(); return !!(g && g.answeringFor()); }
  function setActive(guestId) {
    var g = G(); if (!g) return;
    if (g.setActive(guestId)) paint();
  }
  function nameOf(g) { var m = G(); return (g && m) ? m.nameOf(g.guestId) : ''; }
  function partyNames() { var g = G(); return g ? g.partyNames() : ''; }

  /* --------------------------------------------------------------- status
   * Semantic only — Complete · Current · Open · Optional · Not open yet.
   * No percentage, no score, no progress bar. */
  function status(key) {
    var G = window.SIYL_GUEST, T = window.SIYL_TEMPLE, B = window.SIYL_BAG, D = window.SIYL_DOCS;
    var p = party();
    if (key === STEP.key) return 'Current';
    switch (key) {
      case 'invitation':  return (G && G.identityReviewed()) ? 'Complete' : 'Open';
      case 'journey':     return (B && B.get().length && window.SIYL_JOURNEY && !SIYL_JOURNEY.open().length) ? 'Complete' : 'Open';
      case 'wedding':     return (T && T.decidedAll()) ? 'Complete' : 'Open';
      case 'preparation': return (G && G.dressAckAll()) ? 'Complete' : 'Open';
      case 'about':
        if (!G || !p) return 'Optional';
        return p.guests.some(function (g) { return G.profileAnswered(g.guestId) > 0; }) ? 'Complete' : 'Optional';
      case 'review': {
        var C = window.SIYL_CONFIRM;
        return C && C.state() === 'confirmed' ? 'Confirmed' : C && C.state() === 'received' ? 'Received' : 'Open';
      }
    }
    return '';
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
  function hrefOf(file) { return cleanUrls ? file.replace(/\.html$/, '') : file; }

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

  /* -------------------------------------------------------- the step index */
  function openIndex() {
    if (indexOpen) return;
    indexOpen = true; indexFocus = document.activeElement;
    layer.classList.add('on');
    document.body.classList.add('prep-steps-open');
    var all = bar.querySelector('.prep-all'); if (all) all.setAttribute('aria-expanded', 'true');
    /* focus stays on the button (aria-expanded says what happened); the rows
     * are next in the tab order, and a finger never sees a keyboard ring */
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
  /* one tap, one destination: the chosen step, from its top. The index and
   * the page take their leave first; with reduced motion the page simply
   * changes. */
  var leaving = false;
  function goTo(file) {
    if (leaving) return; leaving = true;
    var url = hrefOf(file);
    layer.classList.remove('on');
    document.body.classList.remove('prep-steps-open');
    document.body.classList.add('p-leave');
    var go = function () { location.href = url; };
    if (calm) go(); else setTimeout(go, 200);
  }

  function paint() {
    if (!bar) return;
    var p = party(), me = active();

    /* Before the invitation is open there is no Preparation navigation. */
    if (!p) {
      bar.innerHTML = '<div class="prep-bar-in"><div class="prep-bar-l">' +
        '<p class="prep-eyebrow">Your private journey</p>' +
        '<p class="prep-step">Open your invitation to begin</p>' +
        '</div></div>';
      layer.classList.remove('on');
      return;
    }

    var sub = subject(), forOther = answeringFor();
    bar.innerHTML = '<div class="prep-bar-in">' +
      '<div class="prep-bar-l">' +
        '<p class="prep-eyebrow">Your private journey</p>' +
        '<p class="prep-step"><b>' + STEP.n + ' / 06</b>' + STEP.label + '</p>' +
        '<p class="prep-who">' + esc(partyNames()) +
          (me ? ' · Continuing as <b>' + esc(nameOf(me)) + '</b><button type="button" data-switch>Switch</button>' : '') +
        '</p>' +
        /* C · when the subject is not the active person the shell says so, in
         * words, on every repaint — a tab never silently changes the owner */
        (forOther ? '<p class="prep-for" role="status"><span class="prep-for-l">Answering for</span>' +
          '<b>' + esc(nameOf(sub)) + '</b>' +
          '<button type="button" data-self>Back to yourself</button></p>' : '') +
        /* F · once Guest Relations has confirmed, a change made here is not a
         * change of the confirmed journey — said on every step, in words */
        ((window.SIYL_CONFIRM && SIYL_CONFIRM.state() === 'confirmed' && STEP.key !== 'review')
          ? '<p class="prep-for" role="status"><span class="prep-for-l">Journey confirmed</span>' +
            '<b>Changes here are not sent</b>' +
            '<a href="mailto:guest.relation.seeyouinlaos@gmail.com?subject=Journey%20' + encodeURIComponent(p.invitationId) + '">Write to Guest Relations to change anything</a></p>' : '') +
      '</div>' +
      '<div class="prep-bar-r"><button type="button" class="prep-all" aria-expanded="' + (indexOpen ? 'true' : 'false') + '" aria-controls="prep-steps">View all steps</button></div>' +
      '</div>';
    bar.appendChild(layer);

    layer.innerHTML = '<div class="prep-steps-in">' + STEPS.map(function (s) {
      var st = status(s.key), cur = s.key === STEP.key;
      return '<a class="prep-srow"' + (cur ? ' aria-current="step"' : '') + ' href="' + hrefOf(s.file) + '" data-step="' + s.key + '">' +
        '<span class="n">' + s.n + '</span><span class="l">' + s.label + '</span>' +
        '<span class="s' + (st === 'Open' ? ' open' : '') + '">' + (cur ? 'Current' : st) + '</span></a>';
    }).join('') + '</div>';
    layer.classList.toggle('on', indexOpen);
    layer.querySelectorAll('.prep-srow').forEach(function (row) {
      row.addEventListener('click', function (e) {
        e.preventDefault();
        var key = row.getAttribute('data-step');
        /* the current step is where the guest already is: the index simply closes */
        if (key === STEP.key) { closeIndex(true); return; }
        var dest = STEPS.filter(function (s) { return s.key === key; })[0];
        if (!dest) return;
        row.classList.add('pressed');
        goTo(dest.file);
      });
    });

    var all = bar.querySelector('.prep-all');
    all.addEventListener('click', function () { if (indexOpen) closeIndex(false); else openIndex(); });
    measureBar();
    var sw = bar.querySelector('[data-switch]');
    if (sw) sw.addEventListener('click', function () { chooseIdentity(true); });
    var self = bar.querySelector('[data-self]');
    if (self) self.addEventListener('click', function () { var g = G(); if (g) g.setSubject(null); });
  }

  /* ---------------------------------------------------- who are you?  */
  function chooseIdentity(switching) {
    var p = party(); if (!p) return;
    var me = active();
    var h = '<p class="t-l1">' + (switching ? 'Switch identity' : 'Your invitation · ' + esc(p.invitationId)) + '</p>' +
      '<h2 class="t-h1" style="margin-top:8px">' + (switching ? 'Who are you continuing as?' : 'Who are you?') + '</h2>' +
      '<p class="t-b1 measure" style="margin-top:12px">This invitation belongs to ' + esc(partyNames()) +
      '. Choose your name so we can show your personal details and decisions correctly.</p>' +
      '<p class="t-b2 measure" style="margin-top:8px">This is not another password — your travel choices belong to the whole party either way.' +
        (switching ? ' Switching changes who is continuing; it changes nobody&rsquo;s answers.' : '') + '</p>' +
      '<div class="p-selrow" style="margin-top:24px">' + p.guests.map(function (g) {
        var on = me && me.guestId === g.guestId;
        return '<button type="button" class="p-sel" aria-pressed="' + (on ? 'true' : 'false') +
          '" data-who="' + esc(g.guestId) + '">' + esc(nameOf(g)) + '</button>';
      }).join('') + '</div>';
    openDrawer(h, function (el) {
      el.querySelectorAll('[data-who]').forEach(function (b) {
        b.addEventListener('click', function () { setActive(b.getAttribute('data-who')); closeDrawer(); });
      });
    });
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

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------------------------------------------------------- foot
   * One primary continuation at the natural completion point, and one quiet
   * way back. Never a pair of tiny arrows. */
  function foot(el) {
    if (!el) return;
    var prev = STEPS[idx - 1], next = STEPS[idx + 1];
    el.className = 'prep-foot';
    el.innerHTML =
      (prev ? '<a class="p-link mute" href="' + hrefOf(prev.file) + '">Back to ' + prev.label + '</a>' : '<span></span>') +
      (next ? '<a class="p-act" href="' + hrefOf(next.file) + '">Continue to ' + next.label + '</a>' : '');
  }

  window.SIYL_PREP = {
    STEPS: STEPS,
    step: STEP,
    party: party,
    active: active,
    activeName: function () { return nameOf(active()); },
    subject: subject,
    subjectName: function () { return nameOf(subject()); },
    answeringFor: answeringFor,
    setSubject: function (id) { var g = G(); return !!(g && g.setSubject(id)); },
    partyNames: partyNames,
    partyLabel: function () { var g = G(); return g ? g.partyLabel() : ''; },
    labelFor: function (id) { var g = G(); return g ? g.labelFor(id) : ''; },
    setActive: setActive,
    chooseIdentity: chooseIdentity,
    drawer: openDrawer,
    closeDrawer: closeDrawer,
    openIndex: openIndex,
    closeIndex: closeIndex,
    indexOpen: function () { return indexOpen; },
    foot: foot,
    status: status,
    /* a page asks the shell whether it may show its content at all */
    ready: function () { return !!(party() && active()); }
  };

  function init() {
    document.body.classList.add('prep');
    if (calm) document.body.classList.add('p-calm');
    build();
    paint();
    /* the step arrives: one quiet entrance, from where the guest expects it —
     * the top of the step; a hash deep link keeps its own target */
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { document.body.classList.add('p-in'); settleFragment(); }); });
    /* pages that render their sections after the party is known settle once more */
    var settled = 0; var late = function () { if (settled++ < 2) window.requestAnimationFrame(settleFragment); };
    document.addEventListener('siyl:invite-ready', late);
    window.addEventListener('load', late);
    /* coming back (bfcache, history) the page is whole again and the index closed */
    window.addEventListener('pageshow', function (e) {
      document.body.classList.remove('p-leave'); leaving = false;
      document.body.classList.add('p-in');
      if (e.persisted) { closeIndex(false); unlockScroll(); }
    });
    /* the identity question is asked once, immediately after the code */
    if (party() && !active()) setTimeout(function () { chooseIdentity(false); }, 260);
    /* an exact-task deep link may say whom the guest is answering for — it
     * is explicit, validated, and gone again on the next page */
    document.addEventListener('siyl:who', paint);
    document.addEventListener('siyl:subject', paint);
    var m = /[?&]for=([A-Za-z0-9_-]+)/.exec(location.search);
    if (m && G() && active()) G().setSubject(m[1]);
    document.addEventListener('siyl:guest', paint);
    document.addEventListener('siyl:temple', paint);
    document.addEventListener('siyl:bag', paint);
    document.addEventListener('siyl:docs', paint);
    document.addEventListener('siyl:confirm', paint);
    /* the journey's status (none / received / confirmed) is one truth on every
     * step, not only on Review & Send: read it once the party is known */
    if (window.SIYL_CONFIRM && party()) SIYL_CONFIRM.load();
    document.addEventListener('siyl:auth', function () { if (window.SIYL_CONFIRM) SIYL_CONFIRM.load(true); });
    document.addEventListener('siyl:invite-ready', function () { paint(); if (party() && !active()) chooseIdentity(false); });
    /* the code has just opened the party on this very page: no reload, the
     * identity question follows the code immediately */
    document.addEventListener('siyl:auth', function () { paint(); if (party() && !active()) setTimeout(function () { chooseIdentity(false); }, 260); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
