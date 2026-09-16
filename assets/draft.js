/* ============================================================================
   THE JOURNEY DRAFT — one server-side draft per guest (Owner, 16 Sep 2026 · FINAL QUICKFIX).

   The browser is a cache. Everything the private journey keeps on this device
   (siyl.guest · siyl.bag · siyl.temple · siyl.docs (states only) · siyl.sent ·
   siyl.skip · siyl.skip.by) is written to the Worker under the guest's own
   invitation (/api/draft) — on every change (autosave, debounced), on
   Continue, and on SAVE MY PROGRESS (explicit: flush → store → read back →
   only then SAVED). On sign-in and on every private page the server draft is
   read: a newer server copy replaces this device's cache and the pages
   re-render, so the same code on another device shows the same journey. The
   rooms and the seats live in their engines already.

   The answer carries the submission state — DRAFT · SENT · CHANGES NOT YET
   SENT — computed on the server by comparing what was sent with what is saved;
   the words on every step come from it, never from a guess.
   ========================================================================== */
(function () {
  'use strict';
  var KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  var API = (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? '/api/draft' : ORIGIN + '/api/draft';
  var META = 'siyl.draft.meta';   /* { invitationId, serverUpdatedAt, dirty, lastSavedAt, lastError } */
  var state = { phase: 'idle', at: null, error: null, submission: null, applying: false, ready: false };   /* ready: the server copy has been read once for this sign-in */
  var timer = null, inflight = null, pulled = '', pending = false;

  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function meta() { try { return JSON.parse(localStorage.getItem(META) || 'null') || {}; } catch (e) { return {}; } }
  function setMeta(patch) { var m = Object.assign(meta(), patch); try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {} return m; }
  function snapshot() { var out = {}; KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) out[k] = v; }); return out; }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:draft', { detail: state })); } catch (e) {} }
  function signedIn() { var a = auth(); return !!(a && a.bearer && a.guestId && a.invitationId === 'INV-' + a.guestId); }
  function headers() { var a = auth(); return { 'content-type': 'application/json', 'x-siyl-auth': a ? a.bearer : '' }; }

  /* apply a server copy to this device: only the keys the server holds; the pages re-render on the events */
  function apply(keys) {
    state.applying = true;
    var changed = false;
    KEYS.forEach(function (k) { if (typeof keys[k] === 'string' && localStorage.getItem(k) !== keys[k]) { localStorage.setItem(k, keys[k]); changed = true; } });
    state.applying = false;
    if (changed) ['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'].forEach(function (ev) { try { document.dispatchEvent(new CustomEvent(ev)); } catch (e) {} });
    return changed;
  }

  var D = window.SIYL_DRAFT = {
    KEYS: KEYS,
    state: function () { return state; },
    submission: function () { return state.submission; },
    /* PUSH: this device's complete draft to the server. reason: 'auto' | 'save' | 'continue' | 'send' */
    push: function (reason) {
      var a = auth(); if (!signedIn()) return Promise.resolve({ ok: false, error: 'not signed in' });
      var keys = snapshot(); if (!Object.keys(keys).length) return Promise.resolve({ ok: false, error: 'nothing to save' });
      state.phase = 'saving'; state.error = null; announce();
      var m = setMeta({ invitationId: a.invitationId, dirty: true });
      var body = { invitationId: a.invitationId, keys: keys, clientUpdatedAt: new Date().toISOString(), reason: reason || 'auto' };
      var req = fetch(API, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) {
          if (!d || !d.ok) { state.phase = 'failed'; state.error = (d && d.error) || 'save failed'; announce(); setMeta({ lastError: state.error }); return d || { ok: false }; }
          /* read back: SAVED only when the server's copy is the one sent */
          if (reason === 'save') {
            return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) {
              var same = !!(g && g.ok && g.draft && g.draft.updatedAt === d.updatedAt && KEYS.every(function (k) { return keys[k] === undefined || g.draft.keys[k] === keys[k]; }));
              if (!same) { state.phase = 'failed'; state.error = 'the saved copy differs'; announce(); return { ok: false, error: state.error }; }
              return done(d, g.submission);
            });
          }
          return done(d, d.submission);
        })
        .catch(function () { state.phase = 'failed'; state.error = 'unreachable'; announce(); setMeta({ lastError: 'unreachable' }); return { ok: false, error: 'unreachable' }; })
        .then(function (d) { inflight = null; return d; });
      inflight = req;
      return req;
      function done(d, submission) { state.phase = 'saved'; state.at = d.savedAt; state.submission = submission || state.submission; setMeta({ serverUpdatedAt: d.updatedAt, dirty: false, lastSavedAt: d.savedAt, lastError: null }); announce(); return d; }
    },
    /* PULL: the server copy. A device with unsent local changes pushes them first; otherwise a newer server copy wins. */
    pull: function () {
      var a = auth(); if (!signedIn()) return Promise.resolve(null);
      var m = meta();
      /* a device that has synced before and holds unsent changes pushes them first (merged on the server); a device that
         has never read the server copy for this guest reads it first — its cache never overwrites the journey */
      if (m.invitationId === a.invitationId && m.dirty && m.serverUpdatedAt) { state.ready = true; return D.push('auto').then(function () { return D.refresh(); }); }
      if (m.invitationId === a.invitationId && m.dirty) pending = true;
      return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) {
        if (!g || !g.ok) return g;
        state.submission = g.submission || null;
        if (g.draft && g.draft.keys) {
          var local = snapshot(), localEmpty = !Object.keys(local).length;
          var newer = (m.invitationId !== a.invitationId) || localEmpty || !m.serverUpdatedAt || g.draft.updatedAt > m.serverUpdatedAt;
          if (newer) apply(g.draft.keys);
          setMeta({ invitationId: a.invitationId, serverUpdatedAt: g.draft.updatedAt, dirty: false });
          state.phase = 'saved'; state.at = g.draft.savedAt;
          state.ready = true;
          /* a change made on this device while the copy was being read follows now, merged over it */
          if (pending) { pending = false; announce(); return D.push('auto'); }
        } else if (Object.keys(snapshot()).length) {
          /* nothing on the server yet — this device's draft becomes it */
          state.ready = true; pending = false;
          setMeta({ invitationId: a.invitationId, dirty: true });
          announce();
          return D.push('auto');
        } else { state.ready = true; }
        announce();
        return g;
      }).catch(function () { return null; });
    },
    /* the submission state alone (after a send) */
    refresh: function () {
      if (!signedIn()) return Promise.resolve(null);
      return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) { if (g && g.ok) { state.submission = g.submission || null; announce(); } return g; }).catch(function () { return null; });
    },
    /* autosave: any change on this device, debounced */
    touch: function () {
      if (state.applying || !signedIn()) return;
      setMeta({ invitationId: auth().invitationId, dirty: true });
      if (timer) clearTimeout(timer);
      /* never before the server copy has been read for this sign-in: a fresh device must not overwrite the journey with its empty cache */
      timer = setTimeout(function () { timer = null; if (state.ready) D.push('auto'); else pending = true; }, 900);
    },
    /* flush now (Continue, Review & Send): the pending autosave first */
    flush: function (reason) { if (timer) { clearTimeout(timer); timer = null; } pending = false; var go = function () { return D.push(reason || 'continue'); }; if (!state.ready && signedIn()) return D.pull().then(go); return inflight ? inflight.then(go) : go(); },
    /* the words of the state, for any surface */
    words: function () {
      var s = state.submission;
      if (!s || s.submissionStatus === 'draft') return { key: 'draft', label: 'Saved as draft', line: 'Your journey · saved as draft', cta: null };
      if (s.hasUnsentChanges) return { key: 'changed', label: 'Changes saved · not yet sent to Guest Relations', line: 'CHANGES SAVED · NOT YET SENT TO GUEST RELATIONS', cta: 'Send updated journey' };
      return { key: 'sent', label: 'Sent to Guest Relations', line: 'Sent to Guest Relations · Reference ' + s.submissionId, cta: null };
    },
    /* the SAVE MY PROGRESS control: paint it into a host element */
    mount: function (host) {
      if (!host) return;
      function paint() {
        var w = D.words(), ph = state.phase, t = state.at ? new Date(state.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
        var status = ph === 'saving' ? 'Saving…' : ph === 'failed' ? 'Save failed · try again' : ph === 'saved' && t ? 'Saved · ' + t : '';
        host.innerHTML = '<p class="prep-state is-' + w.key + '" role="status"><b>' + esc(w.line) + '</b></p>' +
          (w.cta ? '<a class="prep-send-upd" href="' + (window.SIYL_PREP && SIYL_PREP.hrefOf ? SIYL_PREP.hrefOf('review.html') : 'review.html') + '">' + esc(w.cta) + '</a>' : '') +
          '<button type="button" class="prep-save-btn" data-save-progress' + (ph === 'saving' ? ' disabled' : '') + '>Save my progress</button>' +
          '<p class="prep-save-state' + (ph === 'failed' ? ' is-failed' : '') + '" aria-live="polite">' + esc(status) + '</p>';
        var b = host.querySelector('[data-save-progress]');
        if (b) b.addEventListener('click', function () { flushForms(); D.flush('save'); });
      }
      document.addEventListener('siyl:draft', paint);
      paint();
    },
  };
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* every form value on this page is committed before a save (a field still focused has not fired its change yet) */
  function flushForms() { try { var el = document.activeElement; if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); } } catch (e) {} }

  /* wiring */
  ['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'].forEach(function (ev) { document.addEventListener(ev, function () { D.touch(); }); });
  function pullOnce() { var a = auth(); if (!signedIn()) return; if (pulled === a.invitationId) return; pulled = a.invitationId; D.pull(); }
  document.addEventListener('siyl:auth', pullOnce); document.addEventListener('siyl:invite-ready', pullOnce);
  document.addEventListener('siyl:signout', function () { pulled = ''; pending = false; state.ready = false; state.submission = null; state.phase = 'idle'; try { localStorage.removeItem(META); } catch (e) {} });
  /* Continue buttons flush the draft on their way */
  document.addEventListener('click', function (e) { var b = e.target && e.target.closest ? e.target.closest('[data-continue]') : null; if (b) D.flush('continue'); }, true);
  /* the page-hide beacon: only from a device that has read the server copy (a never-synced cache must not overwrite the journey) */
  window.addEventListener('pagehide', function () { var m = meta(); if (m.dirty && m.serverUpdatedAt && state.ready && signedIn() && navigator.sendBeacon) { try { var a = auth(); navigator.sendBeacon(API + '?beacon=1', new Blob([JSON.stringify({ invitationId: a.invitationId, keys: snapshot(), clientUpdatedAt: new Date().toISOString(), reason: 'auto', bearer: a.bearer })], { type: 'application/json' })); } catch (e) {} } });
  try { pullOnce(); } catch (e) {}
})();
