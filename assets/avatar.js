/* ============================================================================
   THE PROFILE PHOTO (Owner, 18 Sep 2026 · MY PROFILE) — one small portrait per
   guest, kept on the server under the guest's own invitation and read back only
   with that guest's bearer. The browser reduces the picture to a square of at
   most 512 px before it is sent (JPEG, well under the 1 MB the Worker accepts),
   so an original photograph never leaves the device. No public URL exists: the
   image is fetched with the session and shown from memory, never written to
   localStorage and never placed in the repository.
     SIYL_AVATAR.load()            -> Promise<objectURL | null>   (cached per invitation)
     SIYL_AVATAR.upload(file)      -> Promise<{ ok, error? }>
     SIYL_AVATAR.remove()          -> Promise<{ ok }>
     SIYL_AVATAR.ACCEPT · MAX_IN   the file types offered and the largest original accepted
   Events: siyl:avatar after a change.
   ========================================================================== */
(function () {
  'use strict';
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/profile/photo';
  var SIDE = 512, MAX_IN = 12 * 1024 * 1024, MAX_OUT = 1024 * 1024;
  var ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
  var cache = { inv: '', url: null, none: false };

  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  /* ONE SESSION PER ANSWER (Codex confirming pass, 18 Sep 2026): every read, upload and removal is bound to the guest who
   * started it — the bearer and the invitation captured first, and a generation that moves on sign-out, on sign-in and on
   * another tab's change of session. An answer arriving for a session that is gone is dropped: never cached, never shown. */
  var gen = 0;
  function session() { var a = auth(); return a && a.bearer && a.invitationId ? { bearer: a.bearer, invitationId: a.invitationId, gen: gen } : null; }
  function same(s) { var a = auth(); return !!(s && a && a.bearer === s.bearer && a.invitationId === s.invitationId && s.gen === gen); }
  function headersFor(s, extra) { var h = Object.assign({}, extra || {}); if (s) h['x-siyl-auth'] = s.bearer; return h; }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:avatar')); } catch (e) {} }
  function forget() { if (cache.url) { try { URL.revokeObjectURL(cache.url); } catch (e) {} } cache = { inv: '', url: null, none: false }; }

  /* the picture reduced to a centred square — drawn on a canvas, so the bytes sent are always ours */
  function reduce(file) {
    return new Promise(function (resolve, reject) {
      var src = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(w, h), side = Math.min(SIDE, s);
          var c = document.createElement('canvas'); c.width = side; c.height = side;
          var x = c.getContext('2d'); x.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, side, side);
          URL.revokeObjectURL(src);
          c.toBlob(function (blob) { if (!blob) reject(new Error('decode')); else resolve(blob); }, 'image/jpeg', 0.86);
        } catch (e) { URL.revokeObjectURL(src); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(src); reject(new Error('decode')); };
      img.src = src;
    });
  }

  /* WHO SITS WHERE (Owner, 20 Sep 2026): other guests' portraits by their opaque guest id, read with this session's bearer,
     cached per guest for the page; null when a guest has none (the initials stand) */
  var others = {};
  function ofGuest(guestId) {
    var s = session(); if (!s || !/^[A-Z]\d{3}$/.test(String(guestId || ''))) return Promise.resolve(null);
    var a = auth(); if (a && a.guestId === guestId) return window.SIYL_AVATAR.load();
    if (others[guestId] !== undefined) return Promise.resolve(others[guestId]);
    var p = fetch(API + '?of=' + encodeURIComponent(guestId), { headers: headersFor(s), cache: 'no-store' }).then(function (r) {
      if (!same(s) || r.status === 404 || !r.ok) { others[guestId] = null; return null; }
      return r.blob().then(function (b) { if (!same(s)) return null; others[guestId] = URL.createObjectURL(b); return others[guestId]; });
    }).catch(function () { others[guestId] = null; return null; });
    others[guestId] = p; return p;
  }
  document.addEventListener('siyl:signout', function () { others = {}; });
  window.SIYL_AVATAR = {
    ACCEPT: ACCEPT, MAX_IN: MAX_IN, SIDE: SIDE,
    of: ofGuest,
    /* the stored photo as an object URL for this session, or null when there is none */
    load: function (force) {
      var s = session(); if (!s) { forget(); return Promise.resolve(null); }
      if (!force && cache.inv === s.invitationId && (cache.url || cache.none)) return Promise.resolve(cache.url);
      return fetch(API, { headers: headersFor(s), cache: 'no-store' }).then(function (r) {
        if (!same(s)) return null;
        if (r.status === 404) { forget(); cache.inv = s.invitationId; cache.none = true; return null; }
        if (!r.ok) throw new Error('read');
        return r.blob().then(function (b) {
          if (!same(s)) return null;                                   /* the session moved on while the bytes were read: not this guest's picture */
          forget(); cache.inv = s.invitationId; cache.url = URL.createObjectURL(b); return cache.url;
        });
      }).catch(function () { if (same(s)) { forget(); cache.inv = s.invitationId; cache.none = true; } return null; });
    },
    current: function () { return cache.url; },
    upload: function (file) {
      var s = session(); if (!s) return Promise.resolve({ ok: false, error: 'not signed in', status: 401 });
      if (!file) return Promise.resolve({ ok: false, error: 'no file' });
      if (file.size > MAX_IN) return Promise.resolve({ ok: false, error: 'too large' });
      if (!/^image\//.test(file.type || '')) return Promise.resolve({ ok: false, error: 'not an image' });
      return reduce(file).then(function (blob) {
        if (blob.size > MAX_OUT) return { ok: false, error: 'too large' };
        /* A LOST REQUEST IS SENT ONCE MORE (Owner report, 24 Sep 2026): a phone coming back from its photo picker often finds
           the connection it left behind gone, and the upload then dies on the way without any answer from the Worker. The
           upload is idempotent (one key per guest, the same bytes), so exactly one more sending follows — for the same session
           only; an answer of the Worker (a refusal included) is final and never repeated. */
        function send(again) {
          if (!same(s)) return { ok: false, error: 'session changed' };  /* the guest who chose the picture is gone: nothing is sent */
          return fetch(API, { method: 'PUT', headers: headersFor(s, { 'content-type': 'image/jpeg' }), body: blob }).then(function (r) { return r.json().catch(function () { return null; }).then(function (j) {
            if (!j && r.status >= 500 && again) return retry();          /* an edge error page, not the Worker's answer */
            if (!r.ok || !j || !j.ok) return { ok: false, error: (j && j.error) || 'not stored', status: r.status };
            if (!same(s)) return { ok: false, error: 'session changed' };  /* stored under the guest who sent it; not shown to whoever is here now */
            forget(); cache.inv = s.invitationId; cache.url = URL.createObjectURL(blob); announce(); return { ok: true, at: j.at };
          }); }, function () { return again ? retry() : { ok: false, error: 'failed' }; });
        }
        function retry() { return new Promise(function (res) { setTimeout(res, 700); }).then(function () { return send(false); }); }
        return send(true);
      }).catch(function (e) { return { ok: false, error: e && e.message === 'decode' ? 'not an image' : 'failed' }; });
    },
    remove: function () {
      var s = session(); if (!s) return Promise.resolve({ ok: false });
      return fetch(API, { method: 'DELETE', headers: headersFor(s) }).then(function (r) { return r.ok ? r.json() : { ok: false }; }).then(function (j) {
        if (!j || !j.ok) return { ok: false };
        if (!same(s)) return { ok: true };
        forget(); cache.inv = s.invitationId; cache.none = true; announce(); return { ok: true };
      }).catch(function () { return { ok: false }; });
    },
    /* the words for a refusal, for the guest */
    refusal: function (r) {
      if (!r || r.ok) return '';
      if (r.error === 'too large') return 'That picture is too large. Please choose one under 12 MB.';
      if (r.error === 'not an image' || r.error === 'unsupported file type') return 'Please choose a photograph (JPEG, PNG or WebP).';
      if (r.status === 401) return 'Please open your invitation once more, then try again.';
      if (r.status === 503) return 'We cannot keep a photo on the website just now. Nothing was stored — please try again later.';
      return 'The photo could not be saved. Nothing was stored — please try again.';
    }
  };
  function moved() { gen++; forget(); }
  document.addEventListener('siyl:signout', moved); document.addEventListener('siyl:auth', moved);
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') moved(); });
})();
