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

   ONE TRIP STATE (Window 007 · OQ-40 · CP-01/02/03): words() is the one source
   of the trip-state line on every surface — nothing before the first own answer ·
   “My Trip · not sent yet” · “Sent to us · {date}” · “Changes not sent yet” +
   “Send the update” (only after a real CONTENT change) · “Confirmed by Guest
   Relations · {date}” (only while Guest Relations' confirmation names the latest
   sent version — it lapses after a change, OQ-27). Lines read their own state
   from the last sent snapshot (lineState). A trip and a “not joining” reply are
   sent through ONE path (send / sendReply).
   ========================================================================== */
(function () {
  'use strict';
  var KEYS = ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by'];
  var LOCAL_ONLY = ['siyl.wait', 'siyl.party'];   /* the device's memory of the waiting list (assets/rooms.js) and of who of the party travels — dropped with the journey, never synced */
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/draft';
  var META = 'siyl.draft.meta';   /* { invitationId, serverUpdatedAt, dirty, lastSavedAt, lastError } */
  var BASE = 'siyl.draft.base';   /* the keys as last read from / written to the server — the base of the three-way merge */
  var RESET = 'siyl.draft.reset'; /* the server's reset epoch this device has honoured (THE CLEAN RESET, Owner, 19 Sep 2026) */
  var NOTICE = 'siyl.draft.notice';   /* a two-device merge that dropped this device's edits — kept until the guest taps OK (PRQ-04-17) */
  var DEVICE_SENT = 'siyl.sent.device';   /* THIS device's own last send { invitationId, version, at } — never synced (PRQ-04-06) */
  var state = { phase: 'idle', at: null, error: null, offline: false, submission: null, applying: false, ready: false, notice: null, lost: null };
  try { var kept = JSON.parse(sessionStorage.getItem(NOTICE) || 'null'); if (kept && kept.kind) { state.notice = 'stale'; state.lost = kept.lost || []; } } catch (e) {}   /* ready: the server copy has been read once for this sign-in; notice: a conflict the guest should see until their next own change */
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
      try { localStorage.removeItem(BASE); localStorage.removeItem(META); LOCAL_ONLY.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
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

  /* WHO OF THE PARTY TRAVELS (Owner, 25 Sep 2026 · mixed attendance): the server's answer, per stay stage, of the places a
     booking takes — the guest and the members whose own answer keeps that stage. Remembered on this device for the pages
     that book before the copy is read; never synced. */
  function keepTravel(g) {
    var a = auth(); if (!a || !g) return;
    state.travel = g.travel || null;
    try { if (g.travel) localStorage.setItem('siyl.party', JSON.stringify({ guestId: a.guestId, travel: g.travel })); else localStorage.removeItem('siyl.party'); } catch (e) {}
  }
  function travelNow() {
    if (state.travel) return state.travel;
    try { var a = auth(), s = JSON.parse(localStorage.getItem('siyl.party') || 'null'); return s && a && s.guestId === a.guestId ? s.travel : null; } catch (e) { return null; }
  }
  var D = window.SIYL_DRAFT = {
    /* the places a booking of this stay stage takes (null: not known yet — the invitation's party is used) */
    partyNeed: function (stage) { var tr = travelNow(); var n = tr && tr.need ? Number(tr.need[stage]) : NaN; return n >= 1 ? n : null; },
    /* a member of the party by their current answer: 'joining' | 'not-joining' | 'unanswered' (null: not known) */
    partyMember: function (guestId) { var tr = travelNow(); return tr && tr.members ? tr.members[guestId] || null : null; },
    KEYS: KEYS,
    state: function () { return state; },
    _merge: merge, _replay: replayKey,
    /* the reset rule, for every other channel that learns the epoch (the contact) */
    honourReset: honourReset, seenReset: seenReset,
    submission: function () { return state.submission; },
    /* PRQ-07a-06: the first name of a party member whose trip already holds this table product, or null */
    partyTable: function (id) {
      var v = state.party && state.party[id]; if (!v) return null;
      if (typeof v === 'string') return v;
      var G = window.SIYL_GUEST, n = v.name || (G && G.nameOf ? G.nameOf(v.guestId) : '');
      /* a page without the guest module (tea, experiences): the party as the invitation itself carries it */
      if (!n) { try { var au = JSON.parse(localStorage.getItem('siyl.auth') || 'null'), mm = (au && au.members) || []; for (var i = 0; i < mm.length; i++) if (mm[i].guestId === v.guestId) n = mm[i].preferredName || ''; } catch (e) { /* no name */ } }
      return String(n || '').split(/\s+/)[0] || 'the other guest';
    },
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
            var before409 = snapshot();
            var m3 = merge(before409, base(), d.draft.keys, localStorage.getItem(BASE) !== null);
            apply(m3.keys); setBase(d.draft.keys); state.submission = d.submission || state.submission;
            setMeta({ invitationId: a.invitationId, serverUpdatedAt: d.draft.updatedAt, dirty: m3.keep.length > 0, lastSavedAt: d.draft.savedAt, lastError: null });
            state.at = d.draft.savedAt; state.error = null;
            if (m3.lost.length) { keepNotice(lostNames(m3.lost, before409, d.draft.keys)); state.phase = 'stale'; }
            else { state.phase = m3.keep.length ? 'saving' : 'saved'; }
            announce();
            inflight = null;
            if (m3.keep.length) return D.push(reason).then(function (r2) { return { ok: !!(r2 && r2.ok), error: r2 && r2.ok ? null : 'stale', merged: true, kept: m3.keep, lost: m3.lost }; });
            return { ok: false, error: 'stale', applied: true, lost: m3.lost };
          }
          if (!d || !d.ok) { state.phase = 'failed'; state.offline = false; state.error = (d && d.error) || 'save failed'; announce(); setMeta({ lastError: state.error }); return d || { ok: false }; }
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
        .catch(function () { if (!same(s)) return { ok: false, error: 'session changed' }; state.phase = 'failed'; state.error = 'unreachable'; state.offline = true; announce(); setMeta({ lastError: 'unreachable' }); return { ok: false, error: 'unreachable' }; })
        .then(function (d) { inflight = null; return d; });
      inflight = req;
      return req;
      /* dirty stays true when something was typed while this request was in flight — that edit is not on the server yet */
      function done(d, submission) { state.phase = state.notice === 'stale' ? 'stale' : 'saved'; state.offline = false; state.error = null; state.at = d.savedAt; state.submission = submission || state.submission; setBase(keys); setMeta({ serverUpdatedAt: d.updatedAt, dirty: !unchangedSince(keys), lastSavedAt: d.savedAt, lastError: null }); announce(); return d; }
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
        state.offline = false;
        if (!same(s)) return null;
        if (!g || !g.ok) return g;
        if (g.resetAt && honourReset(g.resetAt)) { before = snapshot(); m = meta(); pending = false; }
        state.submission = g.submission || null; state.party = g.party || null; keepTravel(g);
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
            if (m3.lost.length) keepNotice(lostNames(m3.lost, local, g.draft.keys));   /* the same key changed elsewhere meanwhile: the server's stands, the guest is told what */
          }
          /* a device that already holds this revision but has no merge base yet (a browser upgraded from an older release):
             the server copy of this very revision IS the base (Codex release review) — otherwise a later conflict would
             mistake the unchanged server answer for a competing edit */
          else if (!localStorage.getItem(BASE)) setBase(g.draft.keys);
          /* A CHANGE MADE ON A PAGE WITHOUT THE DRAFT MODULE (a Marsilea interest, PRQ-07a-07): this device's keys differ from the
             revision it last read and nothing newer is on the server — the change is this guest's own and is sent now */
          else { var bk = base(), here = snapshot(); if (KEYS.some(function (k) { return here[k] !== bk[k] && !(here[k] === undefined && bk[k] === undefined); })) pending = true; }
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
      }).catch(function () { if (same(s) && m.dirty) { state.offline = true; state.phase = 'failed'; state.error = 'unreachable'; announce(); } return null; });
    },
    /* the submission state alone (after a send) */
    refresh: function () {
      if (!signedIn()) return Promise.resolve(null);
      var s = session();
      return fetch(API, { headers: headers() }).then(function (r) { return r.json(); }).then(function (g) { if (!same(s)) return null; if (g && g.ok) { state.submission = g.submission || null; state.party = g.party || null; keepTravel(g); announce(); } return g; }).catch(function () { return null; });
    },
    /* autosave: any change on this device, debounced */
    touch: function () {
      if (state.applying || !signedIn()) return;
      /* the merge notice stays until the guest taps OK (PRQ-04-17) — a later edit does not hide what was not kept */
      setMeta({ invitationId: auth().invitationId, dirty: true });
      if (timer) clearTimeout(timer);
      /* never before the server copy has been read for this sign-in: a fresh device must not overwrite the journey with its empty cache */
      timer = setTimeout(function () { timer = null; if (state.ready) D.push('auto'); else pending = true; }, 900);
    },
    /* flush now (Continue, Review & Send): the pending autosave first */
    flush: function (reason) { if (timer) { clearTimeout(timer); timer = null; } pending = false; var go = function () { return D.push(reason || 'continue'); }; if (!state.ready && signedIn()) return D.pull().then(go); return inflight ? inflight.then(go) : go(); },
    /* ---- THE ONE TRIP STATE (OQ-40 · PRQ-04-01) ---------------------------------------------------------------------- */
    /* the words of the state, for any surface: { key, label, line, cta, at, date, declined } — see API-A1.md */
    words: function () {
      var s = state.submission, C = window.SIYL_CONFIRM;
      var sent = !!(s && s.submissionId && s.submissionStatus !== 'draft') || !!(!s && C && C.state && C.state() !== 'none');
      if (!sent) {
        /* nothing is said before the guest's own first answer (W7-074) — a prefilled invitation is not a trip yet */
        if (!hasOwnContent()) return { key: 'none', label: '', line: '', cta: null, at: null, date: '', declined: false };
        return { key: 'draft', label: 'Not sent yet', line: 'My Trip · not sent yet', cta: null, at: null, date: '', declined: false };
      }
      var declined = !!(s && s.declined);
      if (D.hasUnsentChanges()) return { key: 'changed', label: 'Changes not sent yet', line: 'Changes not sent yet', cta: 'Send the update', at: D.sentAt(), date: dateWords(D.sentAt()), declined: declined };
      if (D.confirmed()) { var ca = D.confirmedAt(); return { key: 'confirmed', label: 'Confirmed by Guest Relations', line: 'Confirmed by Guest Relations' + (ca ? ' · ' + dateWords(ca) : ''), cta: null, at: ca, date: dateWords(ca), declined: declined }; }
      var at = D.sentAt();
      return { key: 'sent', label: 'Sent to us', line: 'Sent to us' + (at ? ' · ' + dateWords(at) : ''), cta: null, at: at, date: dateWords(at), declined: declined };
    },
    tripState: function () { return D.words().key; },
    /* a real CONTENT difference between the saved trip and the last send (the server's content fingerprint) */
    hasUnsentChanges: function () { var s = state.submission; return !!(s && s.submissionId && s.hasUnsentChanges); },
    sent: function () { var s = state.submission, C = window.SIYL_CONFIRM; return !!(s && s.submissionId) || !!(!s && C && C.state && C.state() !== 'none'); },
    sentAt: function () { var s = state.submission, C = window.SIYL_CONFIRM; return (s && s.submissionId && (s.lastSentAt || s.submittedAt)) || (C && C.sentAt ? C.sentAt() : null) || null; },
    firstSentAt: function () { var s = state.submission, C = window.SIYL_CONFIRM; return (s && s.submissionId && s.submittedAt) || (C && C.receivedAt ? C.receivedAt() : null) || null; },
    /* the confirmation stands: Guest Relations confirmed exactly the latest sent version and nothing changed since (OQ-27) */
    confirmed: function () {
      if (D.hasUnsentChanges()) return false;
      var s = state.submission, C = window.SIYL_CONFIRM;
      if (s && s.confirmed === true) return true;
      return !!(C && C.state && C.state() === 'confirmed');
    },
    confirmedAt: function () {
      if (!D.confirmed()) return null;
      var s = state.submission, C = window.SIYL_CONFIRM;
      return (s && s.confirmed && s.confirmedAt) || (C && C.lastConfirmedAt ? C.lastConfirmedAt() : null) || null;
    },
    dateWords: function (iso) { return dateWords(iso); },
    /* THE DECLINE CARD (OQ-42 · PRQ-02-02): 'none' (D1) · 'sent' — the last send was this decline, nothing changed since (D2) ·
       'changed' — a sent trip or reply was changed and not sent (D3) */
    reply: function () {
      var s = state.submission;
      if (!s || !s.submissionId) return { state: 'none', at: null, date: '' };
      if (s.hasUnsentChanges) return { state: 'changed', at: s.lastSentAt || null, date: dateWords(s.lastSentAt) };
      if (s.declined) return { state: 'sent', at: s.lastSentAt || null, date: dateWords(s.lastSentAt) };
      return { state: 'none', at: null, date: '' };
    },
    /* “another device” only when another device really sent the latest version (PRQ-04-06) */
    sentElsewhere: function () {
      var s = state.submission, a = auth(); if (!s || !s.submissionId || !a) return false;
      var mine = deviceSent(); if (!mine || mine.invitationId !== a.invitationId) return true;
      return Number(mine.version || 0) !== Number(s.version || 0);
    },
    /* ---- PER LINE, FROM THE LAST SENT SNAPSHOT (PRQ-01-07 · PRQ-04-05) ---- */
    sentLines: function () { var s = state.submission; return s && s.submissionId && Array.isArray(s.sentSelections) ? s.sentSelections : (s && s.submissionId ? null : []); },
    lineState: function (line) {
      var s = state.submission, id = typeof line === 'string' ? line : (line && line.id), cur = typeof line === 'string' ? null : line;
      if (!cur && id && window.SIYL_BAG) cur = SIYL_BAG.get().filter(function (x) { return x.id === id; })[0] || null;
      if (!D.sent()) return { key: 'selected', label: 'Selected' };
      var list = D.sentLines(), was = null;
      if (list === null) { if (D.hasUnsentChanges()) return { key: 'unsent', label: 'Selected · not sent yet' }; }
      else { was = list.filter(function (x) { return x && x.id === id; })[0] || null; if (!was || (cur && !sameLine(was, cur))) return { key: 'unsent', label: 'Selected · not sent yet' }; }
      return D.confirmed() ? { key: 'confirmed', label: 'Confirmed by Guest Relations' } : { key: 'sent', label: 'Sent to us' };
    },
    /* ---- SENDING — ONE PATH FOR A TRIP AND A REPLY (CP-01 · PRQ-02-01) ---- */
    registration: function () { return registrationNow(); },
    sending: function () { return !!sendingNow; },
    send: function (opts) {
      if (sendingNow) return sendingNow;
      opts = opts || {};
      var a = auth(); if (!signedIn()) return Promise.resolve({ ok: false, error: 'unauthorised' });
      var s = session();
      announce();
      sendingNow = D.flush('send').then(function (fl) {
        if (!fl || !fl.ok) return { ok: false, error: 'not saved' };
        if (!same(s)) return { ok: false, error: 'session changed' };
        var reg = opts.registration || registrationNow(), text = opts.text || textOf(reg);
        if (!reg) return { ok: false, error: 'unauthorised' };
        return fetch(SUBMIT, { method: 'POST', headers: headers(), body: JSON.stringify({ registration: reg, invitationId: a.invitationId, text: text }) })
          .then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { r: r, d: d }; }); })
          .then(function (x) {
            var r = x.r, d = x.d || {};
            if (!same(s)) return { ok: false, error: 'session changed' };
            if (r.ok) {
              try { localStorage.setItem(DEVICE_SENT, JSON.stringify({ invitationId: a.invitationId, version: d.version || null, at: d.lastSentAt || d.submittedAt || null })); } catch (e) {}
              if (d.submission) state.submission = d.submission;
              if (window.SIYL_CONFIRM && SIYL_CONFIRM.noteReceived) SIYL_CONFIRM.noteReceived(d.lastSentAt || d.submittedAt, d);
              announce();
              D.flush('auto').then(function () { return D.refresh(); });
              return { ok: true, status: r.status, answer: d };
            }
            if (r.status === 422 && d.error === 'email required') return { ok: false, status: 422, error: 'email required', message: d.message || '', answer: d };
            if (r.status === 422) return { ok: false, status: 422, error: 'incomplete', message: d.message || '', missing: d.missing || [], answer: d };
            if (r.status === 401) return { ok: false, status: 401, error: 'unauthorised', answer: d };
            return { ok: false, status: r.status, error: 'failed', message: d.error || '', answer: d };
          }, function () { return { ok: false, error: 'unreachable' }; });
      }).then(function (res) { sendingNow = null; announce(); return res; }, function () { sendingNow = null; announce(); return { ok: false, error: 'unreachable' }; });
      return sendingNow;
    },
    /* the decline, sent in place through the same path — only for a guest whose answer is “I won’t be joining this trip” */
    sendReply: function () {
      var G = window.SIYL_GUEST;
      if (!G || !G.notJoining || !G.notJoining()) return Promise.resolve({ ok: false, error: 'not a decline' });
      return D.send({});
    },
    /* ---- SAVING (PRQ-04-16 · PRQ-04-17) ---- */
    /* the quiet save stamp — never a trip word */
    saveWords: function () {
      var ph = state.phase, t = state.at ? new Date(state.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';
      if (ph === 'saving') return 'Saving…';
      if (ph === 'failed') return offline() ? 'Not saved yet — we will try again as soon as you are back online.' : 'Not saved yet — please try again in a moment.';
      if ((ph === 'saved' || ph === 'stale') && t) return 'Saved · ' + t;
      return '';
    },
    notice: function () {
      if (state.notice !== 'stale') return null;
      var lost = state.lost || [];
      return { kind: 'merged', lost: lost.slice(), words: noticeWords(lost) };
    },
    dismissNotice: function () { state.notice = null; state.lost = null; if (state.phase === 'stale') state.phase = 'saved'; try { sessionStorage.removeItem(NOTICE); } catch (e) {} announce(); },
    /* the header's trip state and SAVE MY PROGRESS: paint them into a host element (one listener per host) */
    mount: function (host) {
      if (!host) return;
      function paint() {
        var w = D.words(), n = D.notice(), stamp = D.saveWords();
        host.innerHTML = (w.line ? '<p class="prep-state is-' + w.key + '" role="status"><b>' + esc(w.line) + '</b></p>' : '') +
          (w.cta ? '<a class="prep-send-upd" href="' + (window.SIYL_PREP && SIYL_PREP.hrefOf ? SIYL_PREP.hrefOf('review.html') : 'review.html') + '#send">' + esc(w.cta) + '</a>' : '') +
          '<button type="button" class="prep-save-btn" data-save-progress' + (state.phase === 'saving' ? ' disabled' : '') + '>Save my progress</button>' +
          '<p class="prep-save-state' + (state.phase === 'failed' ? ' is-failed' : '') + '" aria-live="polite">' + esc(stamp) + '</p>' +
          (n ? '<p class="prep-save-state prep-merge" role="status">' + esc(n.words) + ' <button type="button" class="p-link" data-notice-ok>OK</button></p>' : '');
        var b = host.querySelector('[data-save-progress]');
        if (b) b.addEventListener('click', function () { flushForms(); D.flush('save'); });
        var ok = host.querySelector('[data-notice-ok]');
        if (ok) ok.addEventListener('click', function () { D.dismissNotice(); });
      }
      /* one listener for every mounted host; a host that left the page (the shell repaints its bar) is dropped */
      mounts = mounts.filter(function (x) { return x.host !== host && (x.host.isConnected !== false); });
      mounts.push({ host: host, paint: paint });
      paint();
    },
  };
  var mounts = [];
  document.addEventListener('siyl:draft', function () { mounts = mounts.filter(function (x) { return x.host.isConnected !== false; }); mounts.forEach(function (x) { try { x.paint(); } catch (e) {} }); });
  var SUBMIT = '/api/register';
  var sendingNow = null;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  /* “24 September 2026” — British, no leading zero, no time (the time was Berlin time without saying so) */
  function dateWords(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return ''; return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function offline() { try { if (typeof navigator !== 'undefined' && navigator.onLine === false) return true; } catch (e) {} return !!state.offline; }
  function deviceSent() { try { return JSON.parse(localStorage.getItem(DEVICE_SENT) || 'null'); } catch (e) { return null; } }
  /* a line as sent vs as it stands: what the guest chose, not how it is displayed */
  var LINE_FIELDS = ['id', 'price', 'qty', 'unit', 'room', 'nights', 'rate', 'variant', 'interest', 'request', 'date', 'party'];
  function sameLine(a, b) { return LINE_FIELDS.every(function (k) { var x = a ? a[k] : undefined, y = b ? b[k] : undefined; if (k === 'qty') { x = x || 1; y = y || 1; } return JSON.stringify(x === undefined ? null : x) === JSON.stringify(y === undefined ? null : y); }); }
  /* the guest's own answers — anything beyond what the invitation prefilled (W7-074: no trip line before the first own answer) */
  function hasOwnContent() {
    var keys = snapshot(), j = function (k) { return parseJson(keys[k]); };
    var bag = j('siyl.bag'); if (Array.isArray(bag) && bag.length) return true;
    var skip = j('siyl.skip'); if (Array.isArray(skip) && skip.length) return true;
    var t = j('siyl.temple'); if (t && typeof t === 'object' && t.by && Object.keys(t.by).length) return true;
    var dk = j('siyl.docs'); if (dk && typeof dk === 'object' && Object.keys(dk).some(function (k) { var v = dk[k]; return v && typeof v === 'object' && Object.keys(v).length; })) return true;
    var g = j('siyl.guest'); if (!g || typeof g !== 'object') return false;
    if (g.scope) return true;
    if ((g.history || []).some(function (h) { return h && h.by !== 'guest-list'; })) return true;
    return Object.keys(g.guests || {}).some(function (id) { var r = g.guests[id] || {}; return !!(r.allergy || r.photo || r.dress || Object.keys(r.profile || {}).length || Object.keys(r.submitted || {}).length); });
  }
  /* WHAT A TWO-DEVICE MERGE DID NOT KEEP (PRQ-04-17): the answers of this device that differ from the server's in the keys the
     server's copy won — named the way the guest knows them; nothing named → the general sentence */
  function lostNames(keysLost, local, server) {
    var out = [], add = function (n) { if (n && out.indexOf(n) < 0) out.push(n); };
    var Q = window.SIYL_QUESTIONNAIRE, G = window.SIYL_GUEST, me = G && G.me ? G.me() : null;
    (keysLost || []).forEach(function (k) {
      var L = parseJson(local && local[k]), S = parseJson(server && server[k]);
      if (k === 'siyl.bag' && Array.isArray(L)) {
        var Sa = Array.isArray(S) ? S : [];
        L.forEach(function (x) { var y = Sa.filter(function (z) { return z && x && z.id === x.id; })[0]; if (!y || !sameLine(x, y)) add(x && x.name); });
        return;
      }
      if (k === 'siyl.guest' && isObj(L)) {
        var Sg = isObj(S) ? S : {}, id = me ? me.guestId : Object.keys(L.guests || {})[0];
        var lr = (L.guests || {})[id] || {}, sr = (Sg.guests || {})[id] || {};
        Object.keys(lr.profile || {}).forEach(function (q) { if (!sameJson((lr.profile || {})[q], (sr.profile || {})[q])) add(Q && Q.labelOf ? Q.labelOf(q) : q); });
        if (!sameJson(stripAt(lr.allergy), stripAt(sr.allergy))) add(Q && Q.ALLERGY ? Q.ALLERGY.label : 'Food allergies');
        if (!sameJson(!!(lr.photo && lr.photo.acknowledged), !!(sr.photo && sr.photo.acknowledged))) add(Q && Q.PHOTO_LABEL ? Q.PHOTO_LABEL : 'Photography & film');
        if (!sameJson(!!(lr.dress && lr.dress.acknowledged), !!(sr.dress && sr.dress.acknowledged))) add('Dress code');
        if (!sameJson(stripAt(L.scope), stripAt(Sg.scope))) add('Which parts of the journey you are joining');
        var lc = L.contact || {}, sc = Sg.contact || {};
        ((G && G.PERSONAL) || []).forEach(function (f) { if (lc[f.key] !== undefined && lc[f.key] !== sc[f.key]) add(f.label); });
        return;
      }
      if (k === 'siyl.temple') add('your answers for The Wedding');
      if (k === 'siyl.skip') add('the parts of your trip you said you won’t need');
    });
    return out;
  }
  function stripAt(o) { if (!isObj(o)) return o || null; var c = {}; Object.keys(o).forEach(function (k) { if (k !== 'at' && k !== 'by') c[k] = o[k]; }); return c; }
  function andList(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
  function noticeWords(lost) {
    if (!lost || !lost.length) return 'Updated from your other device — please check your latest changes before you send.';
    return lost.length === 1
      ? 'Updated from your other device. Your change to ' + lost[0] + ' could not be kept — you changed it there first. Please check it before you send.'
      : 'Updated from your other device. Your changes to ' + andList(lost) + ' could not be kept — you changed them there first. Please check them before you send.';
  }
  function keepNotice(lost) {
    state.notice = 'stale'; state.lost = lost || [];
    try { sessionStorage.setItem(NOTICE, JSON.stringify({ kind: 'merged', lost: state.lost })); } catch (e) {}
  }
  /* the registration Review & Send posts — the same fields, built from the same modules */
  function registrationNow() {
    var a = auth(), G = window.SIYL_GUEST, B = window.SIYL_BAG, U = window.SIYL_UNITS;
    if (!a || !G || !G.party || !G.party()) return null;
    var rooms = U && U.view && U.view() ? U.view().mine : null;
    return { channel: 'journey-shop', lang: window.SIYL_I18N ? window.SIYL_I18N.lang : 'en', guestId: a.guestId, partyId: a.partyId || null, selections: B ? B.get() : [], totalUsd: B ? B.total() : 0,
      contact: { email: G.contact('email'), phone: G.contact('phone') },
      templeCeremony: window.SIYL_TEMPLE ? SIYL_TEMPLE.operational() : null,
      guestRecord: G.operational(),
      stages: window.SIYL_JOURNEY && SIYL_JOURNEY.states ? SIYL_JOURNEY.states() : null,
      waitlist: U && U.view && U.view() ? (U.view().waitlist || null) : null,
      documents: window.SIYL_DOCS ? SIYL_DOCS.operational() : null,
      seats: window.SIYL_SEATS && SIYL_SEATS.ready() ? SIYL_SEATS.mine() : null,
      rooms: rooms,
      inventory: rooms ? 'HELD — places held in your name, not yet confirmed' : 'UNKNOWN — rooms not read on this device',
      registration_submitted_at: new Date().toISOString() };
  }
  /* the plain-text copy that travels with a send made outside Review & Send (a reply from My Trip) */
  function textOf(reg) {
    var a = auth() || {}, G = window.SIYL_GUEST, name = G && G.nameOf ? G.nameOf() : '';
    var L = ['SEE YOU IN LAOS — MY TRIP', 'Invitation: ' + (a.invitationId || '') + ' · ' + name, 'Guest: ' + name + ' (' + (a.guestId || '') + ')', ''];
    if (G && G.scopeAnswered && G.scopeAnswered()) L.push('WHERE THEY JOIN US: ' + (G.notJoining() ? 'NOT JOINING THIS TRIP' : String(G.scopeWords()).toUpperCase()), '');
    var gr = reg && reg.guestRecord;
    if (gr) L.push('GUEST:', '- Contact: ' + ((gr.contact && gr.contact.email) || 'no email given') + ' · ' + ((gr.contact && gr.contact.phone) || 'no telephone given'));
    if (!(G && G.notJoining && G.notJoining())) L.push('', 'YOUR COST: USD ' + (reg && reg.totalUsd || 0).toLocaleString('en-US'));
    L.push('Sent via My Trip · ' + dateWords(new Date().toISOString()));
    return L.join('\n');
  }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* every form value on this page is committed before a save (a field still focused has not fired its change yet) */
  function flushForms() { try { var el = document.activeElement; if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) { el.dispatchEvent(new Event('change', { bubbles: true })); el.blur(); } } catch (e) {} }

  /* wiring */
  ['siyl:guest', 'siyl:bag', 'siyl:temple', 'siyl:docs'].forEach(function (ev) { document.addEventListener(ev, function () { D.touch(); }); });
  function pullOnce() { var a = auth(); if (!signedIn()) return; if (pulled === a.invitationId) return; pulled = a.invitationId; D.pull(); }
  document.addEventListener('siyl:auth', pullOnce); document.addEventListener('siyl:invite-ready', pullOnce);
  document.addEventListener('siyl:signout', function () { sessionChanged(); pulled = ''; state.notice = null; state.lost = null; state.submission = null; state.phase = 'idle'; state.offline = false; try { localStorage.removeItem(META); localStorage.removeItem(BASE); localStorage.removeItem(DEVICE_SENT); sessionStorage.removeItem(NOTICE); } catch (e) {} });
  /* SAVE RETRIES ON RECONNECT (PRQ-04-16): a save that failed while offline is tried again as soon as the connection returns (and on
     the next page, where the pull pushes a dirty draft first) — so “we will try again as soon as you are back online” is true */
  if (typeof window.addEventListener === 'function') window.addEventListener('online', function () {
    if (!signedIn()) return; var m = meta();
    state.offline = false;
    if (!state.ready) { pulled = ''; pullOnce(); return; }
    if (m.dirty || state.phase === 'failed') D.push('auto');
  });
  /* another tab of this browser signed out or signed in as someone else: whatever this tab still had in flight belongs to the guest before */
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') { sessionChanged(); pulled = ''; } });
  /* Continue buttons flush the draft on their way */
  document.addEventListener('click', function (e) { var b = e.target && e.target.closest ? e.target.closest('[data-continue]') : null; if (b) D.flush('continue'); }, true);
  /* the page-hide beacon: only from a device that has read the server copy (a never-synced cache must not overwrite the journey) */
  if (typeof window.addEventListener === 'function') window.addEventListener('pagehide', function () { var m = meta(); if (m.dirty && m.serverUpdatedAt && state.ready && signedIn() && navigator.sendBeacon) { try { var a = auth(); navigator.sendBeacon(API + '?beacon=1', new Blob([JSON.stringify({ invitationId: a.invitationId, keys: snapshot(), clientUpdatedAt: new Date().toISOString(), reason: 'auto', baseUpdatedAt: m.serverUpdatedAt || null, seenReset: seenReset(), bearer: a.bearer })], { type: 'application/json' })); } catch (e) {} } });
  try { pullOnce(); } catch (e) {}
})();
