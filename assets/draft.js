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
  var BASE = 'siyl.draft.base';   /* the keys as last read from / written to the server — the base of the three-way merge */
  var RESET = 'siyl.draft.reset'; /* the server's reset epoch this device has honoured (THE CLEAN RESET, Owner, 19 Sep 2026) */
  var state = { phase: 'idle', at: null, error: null, submission: null, applying: false, ready: false, notice: null };   /* ready: the server copy has been read once for this sign-in; notice: a conflict the guest should see until their next own change */
  var timer = null, inflight = null, pulled = '', pending = false, queued = null;
  function base() { try { return JSON.parse(localStorage.getItem(BASE) || 'null') || {}; } catch (e) { return {}; } }
  function setBase(keys) { try { localStorage.setItem(BASE, JSON.stringify(keys || {})); } catch (e) {} }
  /* THE THREE-WAY MERGE (Codex P1-2): for each key — unchanged here → the server's; changed here while the server still holds
   * the base → this device's independent edit (kept and pushed again); changed on both sides → the server's, and the guest is
   * told. A removal elsewhere therefore never comes back, and an independent answer typed here is never thrown away. */
  function merge(local, baseKeys, server, baseKnown) {
    var out = {}, keep = [], lost = [];
    KEYS.forEach(function (k) {
      var L = local[k], Bk = baseKeys[k], S = server[k];
      if (L === undefined && S === undefined) return;
      if (L === undefined || L === Bk) { if (S !== undefined) out[k] = S; return; }          /* unchanged here: the server's */
      if (S === undefined || S === Bk) { out[k] = L; keep.push(k); return; }                  /* independent local edit: kept */
      if (S === L) { out[k] = S; return; }                                                    /* both made the same change */
      /* NO BASE (a browser upgraded from an older release with unsent edits — Codex release review): the Bag follows the server
         (a removal elsewhere never comes back and is named), every other key keeps what was typed here and is sent again */
      if (baseKnown === false && Bk === undefined) { if (k === 'siyl.bag') { out[k] = S; lost.push(k); } else { out[k] = L; keep.push(k); } return; }
      out[k] = S; lost.push(k);                                                               /* both changed: the server's */
    });
    return { keys: out, keep: keep, lost: lost };
  }

  /* THE LIVE EDIT, REPLAYED ON THE FETCHED COPY (Codex confirming pass, 18 Sep 2026): a key changed on this device while the
   * first copy was being read carries the guest's live action — but only that action is carried over, never the device's older
   * cache around it. The Bag is replayed line by line (a line added or changed here is added, a line removed here is removed,
   * a line the server no longer holds stays gone), the stage decisions as a set, every other record field by field. */
  function parseJson(v) { if (v === undefined || v === null) return undefined; try { return JSON.parse(v); } catch (e) { return undefined; } }
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function sameJson(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  /* a decision replayed whole: the participation answer is one choice (a destination and "not joining" are exclusive) */
  var ATOMIC = { scope: 1 };
  /* a list replayed as a set: what this device added is appended, what it removed is removed, the rest is the server's */
  function replayArray(B, L, S) {
    var key = function (x) { return JSON.stringify(x); };
    var Bk = B.map(key), Lk = L.map(key);
    var removed = Bk.filter(function (k) { return Lk.indexOf(k) < 0; });
    var out = S.filter(function (x) { return removed.indexOf(key(x)) < 0; }), outK = out.map(key);
    L.forEach(function (x, i) { if (Bk.indexOf(Lk[i]) < 0 && outK.indexOf(Lk[i]) < 0) { out.push(x); outK.push(Lk[i]); } });
    return out;
  }
  function replayObject(base, local, server) {
    var out = {}, k;
    for (k in server) out[k] = server[k];
    var keys = {}; for (k in base || {}) keys[k] = 1; for (k in local || {}) keys[k] = 1;
    Object.keys(keys).forEach(function (key) {
      var B = base ? base[key] : undefined, L = local ? local[key] : undefined;
      if (sameJson(B, L)) return;                                   /* untouched here: the server's */
      if (L === undefined) { delete out[key]; return; }             /* removed here */
      if (ATOMIC[key]) { out[key] = L; return; }                     /* a decision: whole */
      /* a record this device only just created around its edit (a fresh device) carries nothing of the server's answers:
         recurse with an empty base so every server field it does not name survives (Codex third pass, 18 Sep 2026) */
      if (isObj(L) && isObj(out[key])) { out[key] = replayObject(isObj(B) ? B : {}, L, out[key]); return; }
      if (Array.isArray(L) && Array.isArray(out[key])) { out[key] = replayArray(Array.isArray(B) ? B : [], L, out[key]); return; }
      out[key] = L;                                                  /* set or replaced here */
    });
    return out;
  }
  function replayKey(k, before, local, server) {
    if (server === undefined || local === undefined) return local;
    var B = parseJson(before), L = parseJson(local), S = parseJson(server);
    if (L === undefined || S === undefined) return local;
    var idOf = function (x) { return x && x.id; };
    if (k === 'siyl.bag' && Array.isArray(L) && Array.isArray(S)) {
      var Ba = Array.isArray(B) ? B : [], out = [];
      var removed = Ba.filter(function (x) { return !L.some(function (y) { return idOf(y) === idOf(x); }); }).map(idOf);
      S.forEach(function (x) { if (removed.indexOf(idOf(x)) < 0) out.push(x); });
      L.forEach(function (y) {
        var was = Ba.filter(function (x) { return idOf(x) === idOf(y); })[0];
        if (was && sameJson(was, y)) return;                          /* a line the device already had, unchanged */
        var i = -1; out.forEach(function (x, j) { if (idOf(x) === idOf(y)) i = j; });
        if (i >= 0) out[i] = y; else out.push(y);
      });
      return JSON.stringify(out);
    }
    if (Array.isArray(L) && Array.isArray(S)) return JSON.stringify(replayArray(Array.isArray(B) ? B : [], L, S));
    if (isObj(L) && isObj(S)) return JSON.stringify(replayObject(isObj(B) ? B : {}, L, S));
    return local;
  }

  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  /* THE CLEAN RESET (Owner, 19 Sep 2026 · hardened after the Codex pre-deploy review): when the server names a reset epoch
     this device has not honoured yet, a device that had synchronised BEFORE it (a merge base or a server revision from before
     the epoch) drops the whole journey it cached — every key, the merge base and the meta; nothing of the old record is
     carried into the new era, not even a key touched while the copy was being read (a room joined meanwhile comes back from
     the engine, which is the truth). A device that never synchronised (no base, no server revision) is a fresh one: what it
     typed is post-reset and stays. The server refuses any write that does not carry the epoch, so no cache can push an older
     trip back. Returns true when it cleared. */
  function honourReset(epoch) {
    if (!epoch) return false;
    var seen = ''; try { seen = localStorage.getItem(RESET) || ''; } catch (e) { seen = ''; }
    if (seen === epoch) return false;
    var m = meta(), synced = localStorage.getItem(BASE) !== null || !!m.serverUpdatedAt || !!m.lastSavedAt;
    var older = synced && (!m.serverUpdatedAt || m.serverUpdatedAt < epoch);
    var cleared = false;
    if (older) {
      KEYS.forEach(function (k) { if (localStorage.getItem(k) !== null) { localStorage.removeItem(k); cleared = true; } });
      try { localStorage.removeItem(BASE); localStorage.removeItem(META); } catch (e) {}
    }
    try { localStorage.setItem(RESET, epoch); } catch (e) {}
    if (cleared) { state.notice = null; state.applying = true; try { ['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'].forEach(function (ev) { try { document.dispatchEvent(new CustomEvent(ev)); } catch (e) {} }); } finally { state.applying = false; } }
    return cleared;
  }
  function seenReset() { try { return localStorage.getItem(RESET) || null; } catch (e) { return null; } }
  function meta() { try { return JSON.parse(localStorage.getItem(META) || 'null') || {}; } catch (e) { return {}; } }
  function setMeta(patch) { var m = Object.assign(meta(), patch); try { localStorage.setItem(META, JSON.stringify(m)); } catch (e) {} return m; }
  function snapshot() { var out = {}; KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v !== null) out[k] = v; }); return out; }
  function unchangedSince(keys) { var now = snapshot(); return KEYS.every(function (k) { return now[k] === keys[k]; }); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:draft', { detail: state })); } catch (e) {} }
  function signedIn() { var a = auth(); return !!(a && a.bearer && a.guestId && a.invitationId === 'INV-' + a.guestId); }
  function headers() { var a = auth(); return { 'content-type': 'application/json', 'x-siyl-auth': a ? a.bearer : '' }; }
  /* ONE SESSION PER ANSWER (Codex confirming pass, 18 Sep 2026): a request belongs to the guest who started it. When its answer
   * arrives after that guest signed out — or after another guest signed in, here or in another tab of the same browser — the
   * answer is dropped whole: nothing is applied, no base or revision is recorded, nothing is retried under the new bearer. */
  var gen = 0;
  function session() { var a = auth(); return a && a.bearer ? { bearer: a.bearer, invitationId: a.invitationId, gen: gen } : null; }
  function same(s) { var a = auth(); return !!(s && a && a.bearer === s.bearer && a.invitationId === s.invitationId && s.gen === gen); }
  function sessionChanged() { gen++; pending = false; queued = null; state.ready = false; if (timer) { clearTimeout(timer); timer = null; } }

  /* apply a server copy to this device: only the keys the server holds; the pages re-render on the events */
  function apply(keys) {
    state.applying = true;
    var changed = false;
    try {
      KEYS.forEach(function (k) { if (typeof keys[k] === 'string' && localStorage.getItem(k) !== keys[k]) { localStorage.setItem(k, keys[k]); changed = true; } });
      /* the pages re-render on the events — while they do, nothing counts as a new edit of this device (no autosave is scheduled) */
      if (changed) ['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'].forEach(function (ev) { try { document.dispatchEvent(new CustomEvent(ev)); } catch (e) {} });
    } finally { state.applying = false; }
    return changed;
  }

  var D = window.SIYL_DRAFT = {
    KEYS: KEYS,
    state: function () { return state; },
    _merge: merge, _replay: replayKey,
    /* the reset rule, for every other channel that learns the epoch (the contact) */
    honourReset: honourReset, seenReset: seenReset,
    submission: function () { return state.submission; },
    /* PUSH: this device's complete draft to the server. reason: 'auto' | 'save' | 'continue' | 'send' */
    push: function (reason) {
      /* one request at a time (Codex P1-2): a push while another is in flight waits for it and then sends the current snapshot */
      if (inflight) { if (!queued) { var qs = session(); var again = function () { queued = null; return same(qs) ? D.push(reason) : { ok: false, error: 'session changed' }; }; queued = inflight.then(again, again); } return queued; }
      var a = auth(); if (!signedIn()) return Promise.resolve({ ok: false, error: 'not signed in' });
      var s = session();
      var keys = snapshot(); if (!Object.keys(keys).length) return Promise.resolve({ ok: false, error: 'nothing to save' });
      state.phase = 'saving'; state.error = null; announce();
      var m = setMeta({ invitationId: a.invitationId, dirty: true });
      var body = { invitationId: a.invitationId, keys: keys, clientUpdatedAt: new Date().toISOString(), reason: reason || 'auto', baseUpdatedAt: m.serverUpdatedAt || null, seenReset: seenReset() };
      var req = fetch(API, { method: 'PUT', headers: headers(), body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) {
          if (!same(s)) return { ok: false, error: 'session changed' };
          /* THE SERVER WAS RESET after this device last read it: the cached journey goes, the server copy is read again */
          if (d && d.status === 409 && d.error === 'reset' && d.resetAt) {
            honourReset(d.resetAt);
            inflight = null; state.phase = 'idle'; state.ready = false; pending = false; pulled = '';
            return D.pull().then(function () { return { ok: false, error: 'reset', applied: true }; });
          }
          /* STALE DEVICE (Owner, 17 Sep 2026 · Codex P1-2): the server holds a newer revision — merged three ways against the base
             this device last read: a removal elsewhere stands, an independent edit made here is kept and sent again */
          if (d && d.status === 409 && d.error === 'stale' && d.draft && d.draft.keys) {
            /* the merge reads THIS MOMENT's keys, not the request's snapshot (Codex final review): an answer typed while
               the save was in flight is a local edit against the same base and is kept, never rolled back to the old value */
            var m3 = merge(snapshot(), base(), d.draft.keys, localStorage.getItem(BASE) !== null);
            apply(m3.keys); setBase(d.draft.keys); state.submission = d.submission || state.submission;
            setMeta({ invitationId: a.invitationId, serverUpdatedAt: d.draft.updatedAt, dirty: m3.keep.length > 0, lastSavedAt: d.draft.savedAt, lastError: null });
            state.at = d.draft.savedAt; state.error = null;
            if (m3.lost.length) { state.notice = 'stale'; state.phase = 'stale'; }
            else { state.phase = m3.keep.length ? 'saving' : 'saved'; }
            announce();
            inflight = null;
            if (m3.keep.length) return D.push(reason).then(function (r2) { return { ok: !!(r2 && r2.ok), error: r2 && r2.ok ? null : 'stale', merged: true, kept: m3.keep, lost: m3.lost }; });
            return { ok: false, error: 'stale', applied: true, lost: m3.lost };
          }
          if (!d || !d.ok) { state.phase = 'failed'; state.error = (d && d.error) || 'save failed'; announce(); setMeta({ lastError: state.error }); return d || { ok: false }; }
          /* THE PUT IS ACKNOWLEDGED (Codex final review): the revision it returned and the keys it stored are this device's base
             from this moment — before any read-back, whatever the read-back says — so a later push never names an older
             revision and never mistakes this device's own saved answer for another device's change */
          setBase(keys); setMeta({ serverUpdatedAt: d.updatedAt, lastSavedAt: d.savedAt, lastError: null });
          /* read back: SAVED only when the server's copy is the one sent */
          if (reason === 'save') {
            return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) {
              if (!same(s)) return { ok: false, error: 'session changed' };
              var equal = !!(g && g.ok && g.draft && g.draft.updatedAt === d.updatedAt && KEYS.every(function (k) { return keys[k] === undefined || g.draft.keys[k] === keys[k]; }));
              if (!equal) { state.phase = 'failed'; state.error = 'the saved copy differs'; announce(); return { ok: false, error: state.error }; }
              return done(d, g.submission);
            });
          }
          return done(d, d.submission);
        })
        .catch(function () { if (!same(s)) return { ok: false, error: 'session changed' }; state.phase = 'failed'; state.error = 'unreachable'; announce(); setMeta({ lastError: 'unreachable' }); return { ok: false, error: 'unreachable' }; })
        .then(function (d) { inflight = null; return d; });
      inflight = req;
      return req;
      /* dirty stays true when something was typed while this request was in flight — that edit is not on the server yet */
      function done(d, submission) { state.phase = state.notice === 'stale' ? 'stale' : 'saved'; state.at = d.savedAt; state.submission = submission || state.submission; setBase(keys); setMeta({ serverUpdatedAt: d.updatedAt, dirty: !unchangedSince(keys), lastSavedAt: d.savedAt, lastError: null }); announce(); return d; }
    },
    /* PULL: the server copy. A device with unsent local changes pushes them first; otherwise a newer server copy wins. */
    pull: function () {
      var a = auth(); if (!signedIn()) return Promise.resolve(null);
      var s = session(), m = meta();
      /* a device that has synced before and holds unsent changes pushes them first (merged on the server); a device that
         has never read the server copy for this guest reads it first — its cache never overwrites the journey */
      if (m.invitationId === a.invitationId && m.dirty && m.serverUpdatedAt) {
        state.ready = true;
        /* a browser upgraded with unsent edits and no merge base reads the server first: if the server still holds the
           revision this device knows, that copy IS the base — the push that follows then merges three ways as it should */
        if (localStorage.getItem(BASE) === null) {
          return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).catch(function () { return null; }).then(function (g) {
            if (!same(s)) return null;
            if (g && g.ok && g.draft && g.draft.keys && g.draft.updatedAt === m.serverUpdatedAt) setBase(g.draft.keys);
            return D.push('auto').then(function () { return D.refresh(); });
          });
        }
        return D.push('auto').then(function () { return D.refresh(); });
      }
      if (m.invitationId === a.invitationId && m.dirty) pending = true;
      /* AN EDIT MADE WHILE THE COPY IS BEING READ IS KEPT (Owner, 18 Sep 2026 — "Not joining this stage did nothing"): the
         keys as they stood when the read left; a key the guest changed meanwhile is a fresh edit against that moment, kept
         and sent again, never rolled back to the server's older value */
      var before = snapshot();
      return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) {
        if (!same(s)) return null;
        if (!g || !g.ok) return g;
        if (g.resetAt && honourReset(g.resetAt)) { before = snapshot(); m = meta(); pending = false; }
        state.submission = g.submission || null;
        if (g.draft && g.draft.keys) {
          var local = snapshot(), localEmpty = !Object.keys(local).length;
          var newer = (m.invitationId !== a.invitationId) || localEmpty || !m.serverUpdatedAt || g.draft.updatedAt > m.serverUpdatedAt;
          if (newer) {
            var m3 = merge(local, before, g.draft.keys, true);
            /* A DECISION MADE ON THIS DEVICE WHILE THE COPY WAS BEING READ WINS (Codex final pass, 18 Sep 2026): the snapshot
               taken before the read is not a common ancestor — a key the guest changed meanwhile is their live action, and the
               server's older value for it is what was being fetched, never a competing edit. It is kept and sent again. */
            KEYS.forEach(function (k) {
              if (local[k] === before[k]) return;
              var v = replayKey(k, before[k], local[k], g.draft.keys[k]);
              if (v === undefined) delete m3.keys[k]; else m3.keys[k] = v;
              var li = m3.lost.indexOf(k); if (li >= 0) m3.lost.splice(li, 1);
              if (m3.keep.indexOf(k) < 0) m3.keep.push(k);
            });
            apply(m3.keys); setBase(g.draft.keys);
            if (m3.keep.length) pending = true;
            if (m3.lost.length) state.notice = 'stale';   /* the same key changed elsewhere meanwhile: the server's stands, the guest is told */
          }
          /* a device that already holds this revision but has no merge base yet (a browser upgraded from an older release):
             the server copy of this very revision IS the base (Codex release review) — otherwise a later conflict would
             mistake the unchanged server answer for a competing edit */
          else if (!localStorage.getItem(BASE)) setBase(g.draft.keys);
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
      var s = session();
      return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) { if (!same(s)) return null; if (g && g.ok) { state.submission = g.submission || null; announce(); } return g; }).catch(function () { return null; });
    },
    /* autosave: any change on this device, debounced */
    touch: function () {
      if (state.applying || !signedIn()) return;
      state.notice = null;
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
      if (!s || s.submissionStatus === 'draft') return { key: 'draft', label: 'Saved as draft', line: 'My Trip · saved as draft', cta: null };
      if (s.hasUnsentChanges) return { key: 'changed', label: 'Changes saved · not yet sent to Guest Relations', line: 'Changes saved · not yet sent to Guest Relations', cta: 'Send Updated Trip' };
      return { key: 'sent', label: 'Sent to Guest Relations', line: 'Sent to Guest Relations · Reference ' + s.submissionId, cta: null };
    },
    /* the SAVE MY PROGRESS control: paint it into a host element */
    mount: function (host) {
      if (!host) return;
      function paint() {
        var w = D.words(), ph = state.phase, t = state.at ? new Date(state.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
        var status = ph === 'saving' ? 'Saving…' : ph === 'failed' ? 'Not saved · try again' : ph === 'stale' ? 'This device was out of date — showing your latest saved trip' : ph === 'saved' && t ? 'Saved · ' + t : '';
        host.innerHTML = '<p class="prep-state is-' + w.key + '" role="status"><b>' + esc(w.line) + '</b></p>' +
          (w.cta ? '<a class="prep-send-upd" href="' + (window.SIYL_PREP && SIYL_PREP.hrefOf ? SIYL_PREP.hrefOf('review.html') : 'review.html') + '">' + esc(w.cta) + '</a>' : '') +
          '<button type="button" class="prep-save-btn" data-save-progress' + (ph === 'saving' ? ' disabled' : '') + '>Save My Progress</button>' +
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
  document.addEventListener('siyl:signout', function () { sessionChanged(); pulled = ''; state.notice = null; state.submission = null; state.phase = 'idle'; try { localStorage.removeItem(META); localStorage.removeItem(BASE); } catch (e) {} });
  /* another tab of this browser signed out or signed in as someone else: whatever this tab still had in flight belongs to the guest before */
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') { sessionChanged(); pulled = ''; } });
  /* Continue buttons flush the draft on their way */
  document.addEventListener('click', function (e) { var b = e.target && e.target.closest ? e.target.closest('[data-continue]') : null; if (b) D.flush('continue'); }, true);
  /* the page-hide beacon: only from a device that has read the server copy (a never-synced cache must not overwrite the journey) */
  if (typeof window.addEventListener === 'function') window.addEventListener('pagehide', function () { var m = meta(); if (m.dirty && m.serverUpdatedAt && state.ready && signedIn() && navigator.sendBeacon) { try { var a = auth(); navigator.sendBeacon(API + '?beacon=1', new Blob([JSON.stringify({ invitationId: a.invitationId, keys: snapshot(), clientUpdatedAt: new Date().toISOString(), reason: 'auto', baseUpdatedAt: m.serverUpdatedAt || null, seenReset: seenReset(), bearer: a.bearer })], { type: 'application/json' })); } catch (e) {} } });
  try { pullOnce(); } catch (e) {}
})();
