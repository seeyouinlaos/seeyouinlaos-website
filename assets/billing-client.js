/* ============================================================================
   SEE YOU IN LAOS — THE AUTHORITATIVE AMOUNTS, AS THE BROWSER RECEIVES THEM.

   The browser does not price anything any more (Owner, 4 Oct 2026). Every
   amount shown in the guest area is produced by the one server-side Billing
   Engine from the approved Google source, and this module is the only way it
   gets here. assets/pricing.js keeps the catalogue, the words and the
   formatting; it no longer multiplies a rate by a number of nights.

   The amounts are personal: a Named Special Rate belongs to one guest, so the
   quotes are fetched with the guest's own bearer and are never cached across
   identities or written to localStorage.

   ONE IDENTITY, ONE ANSWER (Codex final review, 5 Oct 2026). The quotes held
   here belong to the bearer they were fetched with: a sign-out clears them, a
   different guest signing in clears them and asks again, and an answer that
   arrives for a bearer that is no longer the signed-in one is dropped — it is
   never shown to the next guest on this browser. The session events listened
   to are the ones the invitation actually emits (siyl:auth on sign-in,
   siyl:invite-ready when an invitation opens, siyl:signout on leaving).

   WHEN THE SERVER CANNOT ANSWER, NOTHING IS INVENTED. `quoteFor` returns null,
   the surfaces that read it show no amount, and the guest sees the honest
   absence rather than a number the website made up.
   ========================================================================== */
(function () {
  'use strict';

  function auth() {
    try {
      var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null');
      return a && a.bearer ? a : null;
    } catch (e) { return null; }
  }
  function bearerNow() { var a = auth(); return a ? a.bearer : null; }
  function emit(type) { try { document.dispatchEvent(new CustomEvent(type)); } catch (e) { /* the data stands even if the event cannot be dispatched */ } }

  /* A FEW MINUTES OF MEMORY, FOR DISPLAY ONLY (Owner, 6 Oct 2026). The quotes last fetched are kept in this tab's
     sessionStorage for CACHE_TTL_MS, under a fingerprint of the signed-in guest (never the bearer itself): a page
     opened shortly after another shows its amounts at once instead of asking the server again. Sign-out and any change
     of guest remove it; a held entry of another guest is never read. Review & Send never relies on it — the trip is
     checked against the server's fresh source before it is sent (validate). */
  var CACHE_KEY = 'siyl.billing.quotes', CACHE_TTL_MS = 5 * 60 * 1000;
  /* a moment of quota pressure on the server is not "unavailable": the request is asked again a few times */
  var RETRY_MS = [2000, 6000, 15000];
  function owner(a) {
    if (!a || !a.bearer) return null;
    var h = 5381, s = String(a.bearer);
    for (var i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    return String(a.guestId || '') + ':' + String(a.invitationId || '') + ':' + h.toString(36);
  }
  function cacheRead(a) {
    try {
      var c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
      if (!c) return null;
      /* another guest's copy, an expired one or a malformed one is removed, never read */
      if (c.owner !== owner(a) || !c.quotes || typeof c.quotes !== 'object' || !(Date.now() - Number(c.at) < CACHE_TTL_MS)) {
        sessionStorage.removeItem(CACHE_KEY); return null;
      }
      return c.quotes;
    } catch (e) { return null; }
  }
  function cacheWrite(a, quotes) { try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ owner: owner(a), at: Date.now(), quotes: quotes })); } catch (e) {} }
  function cacheDrop() { try { sessionStorage.removeItem(CACHE_KEY); } catch (e) {} }

  /* the quotes and the bearer they belong to; `live` — this page has the server's own answer (not only the held copy) */
  var state = { quotes: null, bearer: null, loaded: false, failed: false, live: false };
  var waiting = null, waitingFor = null, retryTimer = null, tries = 0;

  function clear() {
    state = { quotes: null, bearer: null, loaded: false, failed: false, live: false };
    waiting = null; waitingFor = null; tries = 0;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }

  function load(force) {
    var a = auth();
    if (!a) { clear(); cacheDrop(); state.loaded = true; state.failed = true; return Promise.resolve(null); }
    /* another guest on this browser: nothing of the previous one survives — neither here nor in the held copy */
    if (state.bearer && state.bearer !== a.bearer) { clear(); cacheDrop(); }
    if (waiting && waitingFor === a.bearer && !force) return waiting;
    if (state.live && state.quotes && state.bearer === a.bearer && !force) return Promise.resolve(state.quotes);
    /* the held copy of THIS guest is shown at once, while the server is asked */
    if (!state.quotes) {
      var held = cacheRead(a);
      if (held) { state = { quotes: held, bearer: a.bearer, loaded: true, failed: false, live: false }; emit('siyl:billing-ready'); }
    }

    var bearer = a.bearer, p;
    p = fetch('/api/billing/catalogue', {
      headers: { 'x-siyl-auth': bearer },
      cache: 'no-store',
    }).then(function (r) {
      if (!r.ok) throw new Error('catalogue ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || !j.ok) throw new Error('catalogue refused');
      /* an answer for a guest who is no longer the one signed in is dropped, unseen */
      if (bearerNow() !== bearer) return null;
      tries = 0;
      state = { quotes: j.quotes || {}, bearer: bearer, loaded: true, failed: false, live: true };
      cacheWrite(auth(), state.quotes);
      emit('siyl:billing-ready');
      return state.quotes;
    }).catch(function () {
      if (bearerNow() !== bearer) return null;
      /* asked again a few times before the guest is told the price is unavailable; a held copy stays on show meanwhile */
      if (tries < RETRY_MS.length) {
        var wait = RETRY_MS[tries++];
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(function () { retryTimer = null; if (bearerNow() === bearer) load(true); }, wait);
        if (!state.quotes) state = { quotes: null, bearer: bearer, loaded: false, failed: false, live: false };
        return state.quotes;
      }
      tries = 0;
      if (state.quotes && state.bearer === bearer) return state.quotes;   /* the held copy stays — display only */
      state = { quotes: null, bearer: bearer, loaded: true, failed: true, live: false };
      emit('siyl:billing-failed');
      return null;
    }).then(function (v) {
      if (waiting === p) { waiting = null; waitingFor = null; }
      return v;
    });
    waiting = p; waitingFor = bearer;
    return p;
  }

  /* the quotes, only while they belong to the guest signed in now */
  function current() { return state.quotes && state.bearer && state.bearer === bearerNow() ? state.quotes : null; }

  /* THE CHECK BEFORE SENDING — always the network, never a held copy. The server prices the lines from a fresh read of
     its source for this guest; { ok, valid, mismatches } — ok:false when the server could not answer. Fresh amounts it
     returns replace the shown ones at once (the Bag re-prices on siyl:billing-ready). */
  function validate(lines) {
    var a = auth(); if (!a) return Promise.resolve({ ok: false, error: 'unauthorised' });
    var bearer = a.bearer;
    return fetch('/api/billing/validate', {
      method: 'POST', cache: 'no-store',
      headers: { 'x-siyl-auth': bearer, 'content-type': 'application/json' },
      body: JSON.stringify({ selections: Array.isArray(lines) ? lines : [] }),
    }).then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { r: r, d: d }; }); })
      .then(function (x) {
        if (bearerNow() !== bearer) return { ok: false, error: 'session changed' };
        if (!x.r.ok || !x.d || x.d.ok !== true) return { ok: false, error: 'unavailable' };
        if (x.d.quotes && typeof x.d.quotes === 'object' && Object.keys(x.d.quotes).length) {
          var merged = {}, k; var q = current() || {};
          for (k in q) merged[k] = q[k];
          for (k in x.d.quotes) merged[k] = x.d.quotes[k];
          state = { quotes: merged, bearer: bearer, loaded: true, failed: false, live: state.live };
          cacheWrite(auth(), merged);
          emit('siyl:billing-ready');
        }
        return { ok: true, valid: x.d.valid === true, mismatches: x.d.mismatches || [], checked: x.d.checked || 0 };
      }, function () { return { ok: false, error: 'unreachable' }; });
  }

  window.SIYL_BILLING = {
    /* the authoritative quote for one website product key, or null */
    quoteFor: function (key) {
      var q = current();
      if (!q) return null;
      return q[String(key || '')] || null;
    },
    quoteOf: function (windowId, slug) {
      return this.quoteFor(String(windowId || '') + '/' + String(slug || ''));
    },
    /* are there amounts to show for the guest signed in now (the server's, or this guest's held copy) */
    ready: function () { return state.loaded && !!current(); },
    /* does this page hold the server's own answer (not only the held copy) */
    live: function () { return !!(state.live && current()); },
    /* the server could not answer after its retries (or nobody is signed in): the surfaces say the price is unavailable */
    failed: function () { return !current() && (state.failed || !bearerNow()); },
    validate: validate,
    load: load,
    reload: function () { return load(true); },
  };

  /* one fetch per page load, as soon as there is an identity to fetch it for */
  if (auth()) load(false);
  /* a sign-in (or an invitation opened on this page) asks for THIS guest's quotes; the same guest is not asked twice */
  function signedIn() { var b = bearerNow(); if (!b) return; if (state.bearer === b && state.live && state.quotes) return; if (state.bearer === b && waitingFor === b) return; load(true); }
  document.addEventListener('siyl:auth', signedIn);
  document.addEventListener('siyl:invite-ready', signedIn);
  document.addEventListener('siyl:auth-changed', signedIn);
  /* leaving: nothing of this guest's prices stays — not on the page, not in the held copy */
  document.addEventListener('siyl:signout', function () { clear(); cacheDrop(); emit('siyl:billing-cleared'); });
})();
