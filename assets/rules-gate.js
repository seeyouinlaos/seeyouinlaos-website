/* ============================================================================
   THE UNWRITTEN RULES · the read-and-acknowledge step (Owner, 27 Sep 2026) —
   the second acknowledgement every guest gives once, after the note from the
   Guest Relations Manager (assets/guest-note.js) and before the journey.

   WHEN: on every page of the private journey (the pages that keep the guest's
   server draft, assets/draft.js), for a signed-in guest (never the hosts), once
   the server draft has been read — so a guest who acknowledged on another device
   is never sent again — once the note is acknowledged, and only while this
   guest's draft carries no acknowledgement of this text version. The guest is
   taken to the guide itself (unwritten-rules.html): the confirmation stands at
   its end, never in a popup. Guests who registered earlier are taken there once,
   on their next visit.

   WHERE IT IS KEPT: beside the note, in the guest's own draft record
   (siyl.guest → rules: { acknowledged, at, textVersion, guestId }), written to
   the Worker (/api/draft) at once. The Worker reads it for Guest Relations
   (/api/gr/journeys · rulesAck) and leaves it out of the trip's content, so
   acknowledging never marks a sent trip as changed. Downloading the PDF is not an
   acknowledgement. Nothing else of the guest's journey is read, changed or reset.
   ========================================================================== */
(function () {
  'use strict';
  var VERSION = '2026-09-27';
  var KEY = 'siyl.guest';
  var PAGE = 'unwritten-rules';

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; } }
  function acknowledged(st) { var r = st && st.rules; return !!(r && r.acknowledged === true && r.textVersion === VERSION); }
  /* the note comes first: until it is acknowledged, the note's own sheet is the page */
  function noteDone(st) { var N = window.SIYL_NOTE; return !N || !N.acknowledged || N.acknowledged(st); }
  function session() { var A = window.SIYL_AUTH; try { return A && A.get ? A.get() : null; } catch (e) { return null; } }
  /* the one decision: a signed-in guest (not the hosts), the server draft read, the note acknowledged, these rules not yet */
  function needs(auth, st, draft) { return !!(auth && auth.guestId && !auth.hosts && draft && draft.ready && noteDone(st) && !acknowledged(st)); }

  /* clean paths on one deployment, file names on the other — the same page (as assets/invite.mjs) */
  var file = location.pathname.split('/').pop() || 'index.html';
  var clean = !/\.html$/i.test(location.pathname) && file !== '';
  function hrefOf(f) { return clean ? f.replace(/\.html(?=[?#]|$)/, '') : f; }
  var onPage = file.replace(/\.html$/i, '') === PAGE;
  /* a page of this site only, never the guide itself */
  function safeNext(v) { return /^[a-z0-9-]+(?:\.html)?(?:\?[\w=&%.-]*)?(?:#[\w-]*)?$/i.test(v || '') && v.replace(/[?#].*$/, '').replace(/\.html$/i, '') !== PAGE ? v : ''; }
  function nextOf() { try { return safeNext(decodeURIComponent((location.search.match(/[?&]next=([^&]+)/) || [, ''])[1])); } catch (e) { return ''; } }

  /* the saves this device still owes the Worker, then the way on — never longer than a few seconds */
  function settle(reason) {
    var D = window.SIYL_DRAFT;
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, 5000);
      var end = function () { clearTimeout(t); resolve(); };
      try { Promise.resolve(D && D.flush ? D.flush(reason) : null).then(end, end); } catch (e) { end(); }
    });
  }

  /* ---- on every journey page: the way to the guide, once the note is behind the guest ---- */
  var leaving = false;
  function gate() {
    var D = window.SIYL_DRAFT;
    if (leaving || !needs(session(), read(), D && D.state ? D.state() : null)) return;
    leaving = true;
    var here = file + location.search + location.hash;
    settle('rules-gate').then(function () { location.replace(hrefOf(PAGE + '.html') + (safeNext(here) ? '?next=' + encodeURIComponent(here) : '')); });
  }

  /* ---- on the guide itself: the confirmation at its end ---- */
  var wired = false;
  function paint() {
    var ack = document.querySelector('[data-ur-ack]'); if (!ack) return;
    var a = session(), st = read();
    var form = ack.querySelector('[data-ur-form]'), done = ack.querySelector('[data-ur-done]'), lead = document.querySelector('[data-ur-gate]');
    var hosts = !!(a && a.hosts), yes = acknowledged(st);
    /* the hosts read the guide; they do not confirm it */
    ack.hidden = !a || hosts;
    if (form) form.hidden = yes;
    if (done) done.hidden = !yes;
    if (lead) lead.hidden = !a || hosts || yes;
    if (wired || !form) return;
    wired = true;
    var box = form.querySelector('[data-ur-check]'), go = form.querySelector('[data-ur-go]');
    box.checked = false;
    var sync = function () { go.disabled = !box.checked; go.setAttribute('aria-disabled', box.checked ? 'false' : 'true'); };
    box.addEventListener('change', sync); sync();
    go.addEventListener('click', function () {
      if (!box.checked || go.getAttribute('aria-busy') === 'true') return;
      if (!acknowledge()) return;
      go.setAttribute('aria-busy', 'true'); go.disabled = true;
      settle('rules').then(function () { location.replace(hrefOf(nextOf() || 'your-journey.html')); });
    });
  }
  /* written into the guest's own draft record and saved to the Worker at once */
  function acknowledge() {
    var a = session(); if (!a || !a.guestId || a.hosts) return false;
    var st = read(); if (!noteDone(st)) return false;
    st.rules = { acknowledged: true, at: new Date().toISOString(), textVersion: VERSION, guestId: a.guestId };
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { return false; }
    try { document.dispatchEvent(new CustomEvent('siyl:guest')); } catch (e) { /* nothing listens yet */ }
    var D = window.SIYL_DRAFT; try { if (D && D.touch) D.touch(); } catch (e) { /* the autosave keeps trying */ }
    return true;
  }
  function check() { if (onPage) paint(); else gate(); }

  window.SIYL_RULES = { VERSION: VERSION, needs: needs, acknowledged: acknowledged, safeNext: safeNext, check: check };
  ['siyl:draft', 'siyl:auth', 'siyl:guest', 'siyl:signout'].forEach(function (ev) { document.addEventListener(ev, check); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check();
})();
