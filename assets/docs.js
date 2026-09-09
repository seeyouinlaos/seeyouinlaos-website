/* ============================================================================
   SEE YOU IN LAOS — GUEST DOCUMENTS.

   Two documents per named guest, both optional for submission:
     PASSPORT            a photograph or a PDF
     FLIGHT INFORMATION  the ticket or confirmation

   FOUR STATES, and they mean exactly what they say:
     NOT PROVIDED  nothing has arrived
     RECEIVED      the file reached our store — receipt only, nothing more
     REPLACED      a newer file arrived and superseded the earlier one
     REVIEWED      a person has actually looked at it. NEVER set by this file:
                   the guest surface can only ever report a receipt.

   Bytes go straight to the Worker over HTTPS and into a private store. This
   file keeps only the receipt — file name, size, type, digest, timestamp. No
   document byte is ever written to localStorage, to the repository, or to any
   public URL, and there is no public read route for a stored document.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.docs';
  var API = (location.hostname.indexOf('github.io') >= 0)
    ? 'https://seeyouinlaos-website.suthep-hrg.workers.dev/api/document'
    : '/api/document';

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
    /* NOT PROVIDED · RECEIVED · REPLACED · (REVIEWED is never claimed here) */
    state: function (guestId, kind) {
      var r = this.get(guestId, kind);
      if (!r) return 'Not provided';
      return r.replaced ? 'Replaced' : 'Received';
    },
    has: function (guestId, kind) { return !!this.get(guestId, kind); },

    /* what Guest Relations sees, per named guest */
    forGuest: function (guestId) {
      var self = this;
      return KINDS.map(function (k) {
        var r = self.get(guestId, k.key);
        return { kind: k.key, label: k.label, state: self.state(guestId, k.key),
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
    setConsent: function (guestId, given) {
      var st = read();
      st.consent = st.consent || {};
      st.consent[guestId] = { given: !!given, at: new Date().toISOString(),
                              textVersion: this.CONSENT_VERSION, text: this.CONSENT_TEXT };
      st.consentHistory = (st.consentHistory || []).concat([
        { guestId: guestId, given: !!given, at: new Date().toISOString(), textVersion: this.CONSENT_VERSION }
      ]).slice(-50);
      write(st);
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
