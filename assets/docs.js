/* ============================================================================
   SEE YOU IN LAOS — GUEST DOCUMENTS.

   Two documents per named guest, both optional for submission:
     PASSPORT            a photograph or a PDF
     FLIGHT INFORMATION  the ticket or confirmation

   STATE KEYS, NOT WORDS (Window 007 · PRQ-06-11): state() returns a key —
     'none'      nothing has arrived                  → “Not added yet”
     'received'  the file reached our store — a receipt only, nothing more;
                 a replacement is 'received' too (the server deletes the
                 earlier copy, PRQ-06-12)             → “Received”
   and stateWords(key) gives the guest's words. REVIEWED (a person has looked
   at it) is NEVER set by this file: the guest surface only reports a receipt.

   Bytes go straight to the Worker over HTTPS and into a private store. This
   file keeps only the receipt — file name, size, type, digest, timestamp. No
   document byte is ever written to localStorage, to the repository, or to any
   public URL, and there is no public read route for a stored document.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.docs';
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/document';

  var KINDS = [
    { key: 'passport', label: 'Passport',
      hint: 'A clear photograph of the picture page, or a PDF.',
      add: 'Add passport' },
    { key: 'flight', label: 'Flight information',
      hint: 'Your ticket or booking confirmation, as a photo or a PDF.',
      add: 'Add flight document' }
  ];
  var ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,image/webp,application/pdf';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; }
  }
  function write(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
    try { document.dispatchEvent(new CustomEvent('siyl:docs')); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('siyl:guest')); } catch (e) {}
  }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function dateWords(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return ''; return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear(); }
  function auth() {
    try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; }
  }

  window.SIYL_DOCS = {
    KINDS: KINDS,
    ACCEPT: ACCEPT,
    MAX: 12 * 1024 * 1024,

    /* the receipt for one document, or null */
    get: function (guestId, kind) {
      var g = (read().guests || {})[guestId] || {};
      return g[kind] || null;
    },
    /* 'none' · 'received' — compare on the key; print stateWords(key) (REVIEWED is never claimed here) */
    state: function (guestId, kind) { return this.get(guestId, kind) ? 'received' : 'none'; },
    stateKey: function (guestId, kind) { return this.state(guestId, kind); },
    STATE_WORDS: { none: 'Not added yet', received: 'Received' },
    stateWords: function (key) { return this.STATE_WORDS[key] || ''; },
    /* the receipt in words: “Received · passport.jpg · 24 September 2026” (the date alone — no time, no zone) */
    receiptWords: function (guestId, kind) {
      var r = this.get(guestId, kind); if (!r) return this.STATE_WORDS.none;
      return [this.STATE_WORDS.received, r.filename || '', dateWords(r.receivedAt)].filter(Boolean).join(' · ');
    },
    dateWords: function (iso) { return dateWords(iso); },
    has: function (guestId, kind) { return !!this.get(guestId, kind); },

    /* what Guest Relations sees, per named guest */
    forGuest: function (guestId) {
      var self = this;
      return KINDS.map(function (k) {
        var r = self.get(guestId, k.key);
        var key = self.state(guestId, k.key);
        return { kind: k.key, label: k.label, state: key, stateWords: self.stateWords(key),
                 filename: r ? r.filename : '', receivedAt: r ? r.receivedAt : '',
                 bytes: r ? r.bytes : 0, sha256: r ? r.sha256 : '' };
      });
    },

    /* SEND. Resolves { ok, status } — and on a refusal it says why, so the
     * surface can tell the guest the truth instead of a fake receipt. */
    send: function (guestId, kind, file) {
      var self = this, a = auth();
      if (!a || !a.invitationId) return Promise.resolve({ ok: false, reason: 'no invitation' });
      if (!file) return Promise.resolve({ ok: false, reason: 'no file' });
      if (file.size > this.MAX) return Promise.resolve({ ok: false, reason: 'too large' });
      var had = this.has(guestId, kind);
      return fetch(API, {
        method: 'POST',
        headers: {
          'content-type': file.type || 'application/octet-stream',
          'x-siyl-auth': a.bearer || '',
          'x-invitation': a.invitationId,
          'x-guest': guestId,
          'x-kind': kind,
          'x-filename': file.name ? file.name.replace(/[^\x20-\x7E]/g, '_').slice(0, 120) : 'document'
        },
        body: file
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          if (!r.ok || !j.ok) {
            return { ok: false, reason: j.error || ('http ' + r.status), enabled: j.enabled !== false };
          }
          var st = read();
          st.guests = st.guests || {};
          st.guests[guestId] = st.guests[guestId] || {};
          st.guests[guestId][kind] = {
            filename: file.name || 'document', bytes: j.bytes || file.size,
            type: file.type || '', sha256: j.sha256 || '', key: j.key || '',
            receivedAt: j.receivedAt || new Date().toISOString(), replaced: had
          };
          write(st);
          return { ok: true, status: 'RECEIVED' };
        });
      }).catch(function () { return { ok: false, reason: 'unreachable' }; });
    },

    /* the guest changes their mind before sending anything anywhere */
    forget: function (guestId, kind) {
      var st = read();
      if (st.guests && st.guests[guestId]) { delete st.guests[guestId][kind]; write(st); }
    },

    /* ---- publication consent -------------------------------------------
     * A NOTICE that filming happens is not a consent. Consent is separate,
     * optional, affirmative, unticked, versioned, and withdrawable. */
    CONSENT_TEXT: 'You may use photographs and film of me from the wedding journey in the couple’s own wedding album, website and social accounts.',
    CONSENT_VERSION: '2026-09-09-draft',
    consent: function (guestId) {
      var c = (read().consent || {})[guestId];
      return c && c.given ? c : null;
    },
    consentDecided: function (guestId) {
      var c = (read().consent || {})[guestId];
      return !!c && (c.given === true || c.given === false);
    },
    /* a consent is a first-person statement: only the guest themselves may
     * give or decline their own. Nobody answers it for them. */
    mayConsent: function (guestId) {
      var G = window.SIYL_GUEST, a = G && G.me ? G.me() : null;
      return !!(a && a.guestId === guestId);
    },
    setConsent: function (guestId, given) {
      if (!this.mayConsent(guestId)) return false;
      var st = read();
      st.consent = st.consent || {};
      st.consent[guestId] = { given: !!given, at: new Date().toISOString(),
                              textVersion: this.CONSENT_VERSION, text: this.CONSENT_TEXT, by: guestId };
      st.consentHistory = (st.consentHistory || []).concat([
        { guestId: guestId, given: !!given, at: new Date().toISOString(), textVersion: this.CONSENT_VERSION, by: guestId }
      ]).slice(-50);
      write(st);
      return true;
    },
    consentHistory: function () { return read().consentHistory || []; },

    /* the whole picture, for Review & Send and for the submitted record */
    operational: function () {
      var self = this, G = window.SIYL_GUEST, p = G ? G.party() : null;
      if (!p) return null;
      return {
        guests: p.guests.map(function (g) {
          var c = (read().consent || {})[g.guestId];
          return {
            guestId: g.guestId,
            name: G.value(g.guestId, 'preferredName') || g.fullName,
            documents: self.forGuest(g.guestId),
            publication: c ? (c.given ? 'Given' : 'Declined') : 'Not answered',
            publicationAt: c ? c.at : '',
            publicationVersion: c ? c.textVersion : ''
          };
        })
      };
    }
  };
})();
