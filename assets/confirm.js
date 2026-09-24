/* ============================================================================
   SEE YOU IN LAOS — THE JOURNEY'S STATUS, on the guest side (F).

   Three states, and the guest never produces the third one:
     NONE       nothing has been sent
     RECEIVED   Guest Relations has the submitted journey (SEND succeeded)
     CONFIRMED  Guest Relations confirmed it — an authoritative act on the
                server, never a consequence of sending, never self-service

   The status is read from the Worker for the open invitation — the one
   runtime, so every page tells one truth.
   ========================================================================== */
(function () {
  'use strict';
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  /* the Worker's own origin and a local `wrangler dev` answer at the same path; any other host (a stage) asks the Worker */
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/status';
  var status = null, loading = null;
  function invitationId() {
    try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return (a && a.invitationId) || ''; } catch (e) { return ''; }
  }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:confirm')); } catch (e) {} }
  /* the draft module's one unsent flag (a content difference from the last send), when it is on the page */
  function unsent() { try { var D = window.SIYL_DRAFT; return !!(D && D.hasUnsentChanges && D.hasUnsentChanges()); } catch (e) { return false; } }
  /* the trip state changes with the draft: a change after the confirmation lapses it at once */
  var lastUnsent = null;
  try { document.addEventListener('siyl:draft', function () { var u = unsent(); if (u === lastUnsent) return; lastUnsent = u; if (status && status.confirmed) announce(); }); } catch (e) {}

  window.SIYL_CONFIRM = {
    ready: function () { return status !== null; },
    raw: function () { return status; },
    /* 'none' | 'received' | 'confirmed'. A CONFIRMATION LAPSES (OQ-27 · PRQ-01-05 / 04-04): 'confirmed' only while Guest Relations'
     * confirmation names the latest sent version AND — where the draft module is on the page — nothing is unsent; a lapsed
     * confirmation reads 'received' until Guest Relations confirms again */
    state: function () {
      if (!status) return 'none';
      if (status.confirmed && !unsent()) return 'confirmed';
      if (status.received) return 'received';
      return 'none';
    },
    /* Guest Relations confirmed an earlier version, or the trip changed since */
    lapsed: function () { return !!(status && ((status.confirmed && unsent()) || status.lapsed)); },
    receivedAt: function () { return status && status.receivedAt || null; },
    /* the last send (the first one is receivedAt) */
    sentAt: function () { return status && (status.lastSentAt || status.receivedAt) || null; },
    /* the confirmation time — only while the confirmation stands; lastConfirmedAt() is the stored time, lapsed or not */
    confirmedAt: function () { return this.state() === 'confirmed' ? (status.confirmedAt || null) : null; },
    lastConfirmedAt: function () { return status && status.confirmedAt || null; },
    /* the client may note a send it just made, until the server is read again */
    noteReceived: function (at, answer) {
      var now = at || new Date().toISOString(), was = status || {};
      /* a new send is a new version: a confirmation of the earlier one no longer stands (the server says the same on the next read) */
      status = Object.assign({}, was, { received: true, receivedAt: was.receivedAt || now, lastSentAt: (answer && answer.lastSentAt) || now,
        version: (answer && answer.version) || ((was.version || 0) + 1), confirmed: false, lapsed: !!was.confirmedAt });
      announce();
    },
    load: function (force) {
      if (loading && !force) return loading;
      var inv = invitationId();
      if (!inv) { status = { received: false, confirmed: false }; announce(); return Promise.resolve(status); }
      loading = fetch(API + '?invitation=' + encodeURIComponent(inv), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok) throw new Error('status unavailable'); status = d; announce(); return d; })
        .catch(function () { if (!status) { status = { received: false, confirmed: false, unreachable: true }; announce(); } return status; })
        .then(function (v) { loading = null; return v; });
      return loading;
    }
  };
})();
