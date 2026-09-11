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
      case 'journey':     return (B && B.get().length) ? 'Complete' : 'Open';
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
  var bar, layer, drawer, scrim, lastFocus;

  function build() {
    bar = document.createElement('div');
    bar.className = 'prep-bar';
    layer = document.createElement('div');
    layer.className = 'prep-steps';
    layer.id = 'prep-steps';
    var host = document.querySelector('header.hd, header');
    if (host && host.parentNode) { host.parentNode.insertBefore(layer, host.nextSibling); host.parentNode.insertBefore(bar, layer); }
    else { document.body.insertBefore(layer, document.body.firstChild); document.body.insertBefore(bar, layer); }

    scrim = document.createElement('div'); scrim.className = 'p-drawer-scrim';
    drawer = document.createElement('aside'); drawer.className = 'p-drawer';
    drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.hidden = true;
    document.body.append(scrim, drawer);
    scrim.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('p-drawer-open')) closeDrawer();
    });
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
      '</div>' +
      '<div class="prep-bar-r"><button type="button" class="prep-all" aria-expanded="false" aria-controls="prep-steps">View all steps</button></div>' +
      '</div>';

    layer.innerHTML = '<div class="prep-steps-in">' + STEPS.map(function (s) {
      var st = status(s.key), cur = s.key === STEP.key;
      return '<a class="prep-srow"' + (cur ? ' aria-current="step"' : '') + ' href="' + s.file + '">' +
        '<span class="n">' + s.n + '</span><span class="l">' + s.label + '</span>' +
        '<span class="s' + (st === 'Open' ? ' open' : '') + '">' + (cur ? 'Current' : st) + '</span></a>';
    }).join('') + '</div>';

    var all = bar.querySelector('.prep-all');
    all.addEventListener('click', function () {
      var on = layer.classList.toggle('on');
      all.setAttribute('aria-expanded', String(on));
    });
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
  function openDrawer(html, wire) {
    lastFocus = document.activeElement;
    drawer.hidden = false;
    drawer.innerHTML = '<div class="p-drawer-in"><div class="p-drawer-x">' +
      '<button type="button" class="p-link mute" data-close>Close</button></div>' + html + '</div>';
    document.body.classList.add('p-drawer-open');
    drawer.querySelector('[data-close]').addEventListener('click', closeDrawer);
    if (wire) wire(drawer);
    var f = drawer.querySelector('button, a[href], input, textarea');
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closeDrawer() {
    document.body.classList.remove('p-drawer-open');
    setTimeout(function () { if (drawer) { drawer.hidden = true; drawer.innerHTML = ''; } }, 320);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
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
      (prev ? '<a class="p-link mute" href="' + prev.file + '">Back to ' + prev.label + '</a>' : '<span></span>') +
      (next ? '<a class="p-act" href="' + next.file + '">Continue to ' + next.label + '</a>' : '');
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
    foot: foot,
    status: status,
    /* a page asks the shell whether it may show its content at all */
    ready: function () { return !!(party() && active()); }
  };

  function init() {
    document.body.classList.add('prep');
    build();
    paint();
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
    document.addEventListener('siyl:invite-ready', function () { paint(); if (party() && !active()) chooseIdentity(false); });
    /* the code has just opened the party on this very page: no reload, the
     * identity question follows the code immediately */
    document.addEventListener('siyl:auth', function () { paint(); if (party() && !active()) setTimeout(function () { chooseIdentity(false); }, 260); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
