/* ============================================================================
   SEE YOU IN LAOS — THE JOURNEY'S STATUS, on the guest side (F).

   Three states, and the guest never produces the third one:
     NONE       nothing has been sent
     RECEIVED   Guest Relations has the submitted journey (SEND succeeded)
     CONFIRMED  Guest Relations confirmed it — an authoritative act on the
                server, never a consequence of sending, never self-service

   The status is read from the Worker for the open invitation; the GitHub
   Pages mirror reads the same Worker, so both origins tell one truth.
   ========================================================================== */
(function () {
  'use strict';
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  var API = (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev') ? '/api/status' : ORIGIN + '/api/status';
  var status = null, loading = null;
  function invitationId() {
    try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return (a && a.invitationId) || ''; } catch (e) { return ''; }
  }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:confirm')); } catch (e) {} }

  window.SIYL_CONFIRM = {
    ready: function () { return status !== null; },
    raw: function () { return status; },
    /* 'none' | 'received' | 'confirmed' */
    state: function () {
      if (!status) return 'none';
      if (status.confirmed) return 'confirmed';
      if (status.received) return 'received';
      return 'none';
    },
    receivedAt: function () { return status && status.receivedAt || null; },
    confirmedAt: function () { return status && status.confirmedAt || null; },
    /* the client may note a send it just made, until the server is read again */
    noteReceived: function (at) { status = Object.assign({}, status || {}, { received: true, receivedAt: at || new Date().toISOString() }); announce(); },
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
