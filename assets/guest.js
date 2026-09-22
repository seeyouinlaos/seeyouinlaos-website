/* ============================================================================
   SEE YOU IN LAOS — THE GUEST RECORD.

   ONE GUEST = ONE INVITATION = ONE CODE = ONE JOURNEY = ONE TOTAL = ONE SET
   OF ANSWERS (Owner decision, 14 Sep 2026). The session IS the guest: there
   is no party to switch inside, nobody to answer for, and nothing on this
   website is written in another person's name. The party — who belongs
   together — is context: first names for room sharing and the seat plan.

   Three layers, never merged, so a guest's correction can never destroy the
   record the invitation came from:

     source{}     what the invitation resolved — read-only, always shown as
                  "from your invitation"
     submitted{}  what the guest has entered or corrected
     history[]    { field, from, to, at, by } — every change, kept, and signed

   And ONE readiness engine. Every surface — the shell, View All Steps, the
   sticky bar, Review & Send, the send guard, every Continue button — asks
   steps() and readiness() below and nothing else. A step is COMPLETE, the
   CURRENT one, NEEDS ATTENTION, or LOCKED behind an earlier required step;
   what is missing is named, with the exact control it is answered on.

   Storage is the same localStorage draft the Journey Bag uses. Documents are
   NOT here: no document byte ever touches this file.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.guest';
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  var CONTACT_API = (typeof location !== 'undefined' && (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))) ? '/api/contact' : ORIGIN + '/api/contact';

  function auth() {
    try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; }
  }
  function read() {
    var st;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { st = {}; }
    return st;
  }
  function stamp() { return new Date().toISOString(); }
  function write(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
    try { document.dispatchEvent(new CustomEvent('siyl:guest')); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  /* ---- ABOUT YOU (Owner, 14 Sep 2026 · 15 Sep 2026) ---------------------
   * One question first — food allergies, answered YES or NO, with the
   * details only when the answer is YES — then the favourites. EVERY visible
   * question is required (Owner override, 15 Sep 2026): a question shown in
   * the profile flow must be answered, an empty box never counts as done,
   * and the readiness engine names the exact unanswered question. Only the
   * travel documents stay optional. The three retired questions of the party
   * model are gone. Sequential numbering after the removals. */
  /* THE QUESTIONNAIRE (Owner, 22 Sep 2026): one canonical schema — src/questionnaire.js, the generated copy assets/questionnaire.js
   * (window.SIYL_QUESTIONNAIRE) loaded before this file on every guest page; the Worker validates SEND against the same file */
  var Q = window.SIYL_QUESTIONNAIRE;
  if (!Q) throw new Error('assets/questionnaire.js must load before guest.js');
  var ALLERGY = Q.ALLERGY, PROFILE = Q.PROFILE, FINALE = Q.FINALE;
  /* REQUIRED: the guest knows that photography and filming take place. It is
   * an acknowledgement — never a consent to publication, which stays a
   * separate, optional, withdrawable choice (assets/docs.js). */
  var PHOTO_TEXT = 'I understand and acknowledge this.';
  var PHOTO_VERSION = '2026-09-20';   /* the acknowledgement's words: 20 Sep 2026 — filming and the possible publication named together */

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validEmail(v) { return EMAIL_RE.test(String(v || '').trim()); }
  /* a telephone number of the world: digits, with the usual separators, at
   * least seven digits, at most twenty — never one country's format */
  function validPhone(v) {
    var s = String(v || '').trim();
    if (!/^\+?[\d\s().\-\/]+$/.test(s)) return false;
    var d = s.replace(/\D/g, '');
    return d.length >= 7 && d.length <= 20;
  }

  var G = window.SIYL_GUEST = {
    ALLERGY: ALLERGY,
    PROFILE: PROFILE,
    FINALE: FINALE,
    GENRES: Q.GENRES,
    PHOTO_TEXT: PHOTO_TEXT,
    PHOTO_VERSION: PHOTO_VERSION,
    validEmail: validEmail,
    validPhone: validPhone,

    /* ---- the guest, from the invitation and nowhere else ---------------- */
    me: function () {
      var a = auth();
      if (!a || !a.guestId || !a.bearer || a.invitationId !== 'INV-' + a.guestId) return null;
      return { guestId: a.guestId, fullName: a.fullName || '', preferredName: a.preferredName || a.fullName || '',
               hostRole: a.hostRole === 'BRIDE' || a.hostRole === 'GROOM' ? a.hostRole : null,
               contactId: typeof a.contactId === 'string' ? a.contactId : '', couple: typeof a.couple === 'string' ? a.couple : '' };
    },
    /* the invitation as the surfaces read it: one guest, their party as context */
    party: function () {
      var a = auth(), me = this.me();
      if (!me) return null;
      return { invitationId: a.invitationId, guestId: me.guestId, partyId: a.partyId || '', partyName: a.partyName || '',
               guests: [me], members: Array.isArray(a.members) ? a.members : [me],
               /* the hosts (explicit flag, never inferred): their ceremony place is the front centre */
               hosts: a.hosts === true,
               /* the Sangkhathan: 'ELIGIBLE' | 'NONE' | 'UNRESOLVED' — never inferred */
               sangkhathan: a.sangkhathan === 'ELIGIBLE' || a.sangkhathan === 'NONE' ? a.sangkhathan : 'UNRESOLVED' };
    },
    /* a session from before the guest-scoped invitations: the code is asked again */
    stale: function () { var a = auth(); return !!(a && a.invitationId) && !this.me(); },
    guests: function () { var p = this.party(); return p ? p.guests : []; },
    isParty: function () { return false; },
    active: function () { return this.me(); },
    subject: function () { return this.me(); },
    answeringFor: function () { return false; },
    who: function () { var m = this.me(); return m ? { guestId: m.guestId, activeGuestId: m.guestId, subjectGuestId: m.guestId } : null; },
    mayAcknowledge: function (id) { var m = this.me(); return !!(m && (!id || id === m.guestId)); },
    named: function (id) { return this.nameOf(id) || id; },
    /* the name the guest goes by — their correction first; a party member by first name */
    nameOf: function (id) {
      var m = this.me(); if (!m) return '';
      if (!id || id === m.guestId) return this.value(m.guestId, 'preferredName') || m.preferredName || m.fullName;
      var p = this.party(), x = (p.members || []).filter(function (y) { return y.guestId === id; })[0];
      return x ? (x.preferredName || '') : '';
    },
    /* the party, by first names — context, never authority */
    partyNames: function () {
      var self = this, p = this.party(); if (!p) return '';
      var n = (p.members || []).map(function (g) { return self.nameOf(g.guestId); }).filter(Boolean);
      return n.length > 1 ? n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1] : (n[0] || p.partyName);
    },
    partyLabel: function () { var p = this.party(); return p ? 'Your party · ' + this.partyNames() : ''; },
    labelFor: function (id) { return 'For ' + this.nameOf(id); },
    others: function () { var p = this.party(), me = this.me(); return p ? (p.members || []).filter(function (g) { return g.guestId !== me.guestId; }) : []; },

    /* ---- the record ---------------------------------------------------- */
    rec: function (id) {
      var st = read(), me = this.me();
      id = id || (me && me.guestId);
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      return st.guests[id];
    },
    /* SOURCE is never written to — it is the invitation's own value */
    source: function (id, field) {
      var m = this.me(); if (!m || (id && id !== m.guestId)) return '';
      if (field === 'fullName') return m.fullName || '';
      if (field === 'preferredName') return m.preferredName || m.fullName || '';
      return '';
    },
    value: function (id, field) {
      var me = this.me();
      /* the guest's own correction of their name (First Name · Last Name in the personal details) reads everywhere */
      if (me && (!id || id === me.guestId) && (field === 'fullName' || field === 'preferredName')) {
        if (this.contact('firstName') || this.contact('lastName')) { var fn = this.nameField('firstName'), ln = this.nameField('lastName'); return field === 'preferredName' ? (fn || ln) : [fn, ln].filter(Boolean).join(' '); }
      }
      var r = this.rec(id);
      if (r.submitted && r.submitted[field] != null) return r.submitted[field];
      return this.source(id, field);
    },
    edited: function (id, field) {
      var v = this.value(id, field);
      return v != null && String(v) !== '' && String(v) !== String(this.source(id, field));
    },
    set: function (id, field, v) {
      var me = this.me(); if (!me) return;
      id = id || me.guestId; if (id !== me.guestId) return;
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[id];
      var from = r.submitted[field] != null ? r.submitted[field] : this.source(id, field);
      if (String(from) === String(v)) return;
      r.submitted[field] = v;
      r.history.push({ field: field, from: from, to: v, at: stamp(), by: me.guestId });
      write(st);
    },

    /* ---- contact — REQUIRED, the guest's own, both valid ----------------
     * SERVER-SIDE (Owner, 16 Sep 2026 · EMAIL FIRST): the email and mobile number are persisted on the Worker under the
     * guest's invitation (/api/contact) — the recipient of the confirmation email and the same on every device. This
     * browser's draft is written first; the server copy follows; a device with an empty draft loads the server copy. */
    /* ---- WHERE WILL YOU JOIN US (Owner, 21 Sep 2026 · the global My Trip rebuild) ----------------------
     * FOUR participation scopes — BANGKOK · VIENTIANE BEFORE THE WEDDING · VIENTIANE THE WEDDING · CHINA — any combination;
     * "I'll join all"; "I won't be joining this trip" (exclusive). The scope is the first decision and the source of truth for
     * everything after it, through the ONE stage graph (assets/stage-graph.js): which stages exist, what readiness asks, what
     * Review & Send expects. A legacy answer (bangkok · vientiane · china) is read through the graph's normalisation: the
     * wedding scope from "vientiane", the pre-wedding scope from the guest's REAL Pre-Wedding Stay (declined → not joined) —
     * deterministic, idempotent, never a rebooking. The hosts join everything by definition. */
    DESTINATIONS: (window.SIYL_GRAPH ? window.SIYL_GRAPH.SCOPES : [
      { key: 'bangkok', label: 'Bangkok', when: '21 – 24 February + 6 – 8 March' },
      { key: 'vientianePreWedding', label: 'Vientiane · Before the Wedding', when: '25 – 27 February' },
      { key: 'vientianeWedding', label: 'Vientiane · The Wedding', when: '27 February – 1 March' },
      { key: 'china', label: 'China', when: '1 – 6 March' }
    ]).map(function (d) { return { key: d.key, label: d.label, when: d.when }; }),
    SCOPE_KEYS: ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china'],
    /* the state of the Pre-Wedding Stage as this device knows it — the one fact a legacy answer is read with */
    prewedFact: function () {
      var B = window.SIYL_BAG, U = window.SIYL_UNITS;
      try { if (B && B.get().some(function (x) { return x.id === 'prewed'; })) return 'selected'; } catch (e) {}
      try { if (U && U.waitlisted && U.waitlisted('prewed')) return 'waitlisted'; } catch (e) {}
      try { if ((JSON.parse(localStorage.getItem('siyl.skip') || '[]')).indexOf('prewed') >= 0) return 'declined'; } catch (e) {}
      return 'open';
    },
    scope: function () {
      var st = read(), s = st.scope, p = this.party(), G = window.SIYL_GRAPH, self = this;
      var norm = function (raw) {
        if (G && G.normalizeScope) return G.normalizeScope(raw, { prewed: self.prewedFact() });
        if (!raw) return null; var o = { bangkok: !!raw.bangkok, vientianePreWedding: !!(raw.vientianePreWedding != null ? raw.vientianePreWedding : raw.vientiane), vientianeWedding: !!(raw.vientianeWedding != null ? raw.vientianeWedding : raw.vientiane), china: !!raw.china, none: !!raw.none };
        if (o.none) { o.bangkok = o.vientianePreWedding = o.vientianeWedding = o.china = false; return o; } return (o.bangkok || o.vientianePreWedding || o.vientianeWedding || o.china) ? o : null;
      };
      if (s && s.at) { var o = norm(s); if (o) { o.at = s.at; o.by = s.by || 'guest'; return o; } }
      if (p && p.hosts) return { bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true, none: false, at: null, by: 'hosts' };
      return null;
    },
    scopeAnswered: function () { return !!this.scope(); },
    /* joins(scope) — `vientiane` is the legacy name for "any Vientiane part" (readers that only need to know the guest comes to Vientiane) */
    joins: function (dest) { var s = this.scope(); if (!s || s.none) return false; if (dest === 'vientiane') return !!(s.vientianeWedding || s.vientianePreWedding); return !!s[dest]; },
    joiningAny: function () { var s = this.scope(), self = this; return !!(s && !s.none && self.SCOPE_KEYS.some(function (k) { return s[k]; })); },
    notJoining: function () { var s = this.scope(); return !!(s && s.none); },
    joinsAll: function () { var s = this.scope(), self = this; return !!(s && !s.none && self.SCOPE_KEYS.every(function (k) { return s[k]; })); },
    scopeWords: function () {
      var s = this.scope(); if (!s) return '';
      if (s.none) return 'Not joining this trip';
      if (this.joinsAll()) return 'Bangkok · Vientiane · China';
      /* both Vientiane sheets read as one word: Vientiane */
      var both = s.vientianePreWedding && s.vientianeWedding;
      var names = this.DESTINATIONS.filter(function (d) { return s[d.key] && !(both && d.key === 'vientianeWedding'); }).map(function (d) { return both && d.key === 'vientianePreWedding' ? 'Vientiane' : d.label; });
      return names.join(' · ');
    },
    /* clearScope() — "I'd like to reconsider": the answer is withdrawn and the question asked again; nothing else changes */
    clearScope: function () {
      var me = this.me(); if (!me) return; var st = read(); if (!st.scope) return;
      st.guests = st.guests || {}; st.guests[me.guestId] = st.guests[me.guestId] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[me.guestId]; r.history = r.history || []; r.history.push({ field: 'scope', from: st.scope.none ? 'none' : 'answered', to: null, at: stamp(), by: me.guestId });
      delete st.scope; write(st);
    },
    /* setScope({ china: true }) toggles one scope (clearing "not joining"); setScope({ none: true }) declines the whole
     * trip (clearing the scopes); setScope({ all: true }) joins every scope */
    setScope: function (patch) {
      var me = this.me(); if (!me || !patch) return;
      var st = read(), keys = this.SCOPE_KEYS, base = this.scope() || {}, cur = { bangkok: !!base.bangkok, vientianePreWedding: !!base.vientianePreWedding, vientianeWedding: !!base.vientianeWedding, china: !!base.china, none: !!base.none };
      if (patch.all === true) cur = { bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true, none: false };
      else if (patch.none === true) cur = { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: false, none: true };
      else { if (typeof patch.vientiane === 'boolean') { cur.vientianePreWedding = patch.vientiane; cur.vientianeWedding = patch.vientiane; }   /* the legacy word: both Vientiane sheets */
        keys.forEach(function (k) { if (typeof patch[k] === 'boolean') cur[k] = patch[k]; }); if (keys.some(function (k) { return cur[k]; })) cur.none = false; }
      cur.at = stamp(); cur.by = me.guestId;
      st.scope = cur;
      st.guests = st.guests || {}; st.guests[me.guestId] = st.guests[me.guestId] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[me.guestId]; r.history = r.history || []; r.history.push({ field: 'scope', from: null, to: cur.none ? 'none' : keys.filter(function (k) { return cur[k]; }).join('+'), at: cur.at, by: me.guestId });
      write(st);
    },
    contact: function (f) { var st = read(); return (st.contact || {})[f] || ''; },
    /* THE PERSONAL DETAILS (Owner, 20 Sep 2026): the guest's own — Date of Birth · Nationality (one or several, as written) ·
       Phone Number · Email Address · Private Mailing Address (structured). Each field belongs to the signed-in person alone
       (one code = one person = one record); the couple partner has their own. CONxxx and COUPLxxx are never fields here. */
    PERSONAL: [
      /* THE GUEST'S OWN NAME (Owner, 21 Sep 2026): editable, prefilled from the invitation; a correction changes the words,
         never the identity (guestId · CONxxx · COUPLxxx · the code) */
      { key: 'firstName', label: 'First Name', name: true }, { key: 'lastName', label: 'Last Name', name: true },
      { key: 'birthdate', label: 'Date of Birth' }, { key: 'nationality', label: 'Nationality' }, { key: 'phone', label: 'Phone Number' }, { key: 'email', label: 'Email Address' },
      { key: 'address1', label: 'Street and house number', group: 'address' }, { key: 'address2', label: 'Address line 2', group: 'address', optional: true }, { key: 'postal', label: 'Postal / ZIP code', group: 'address' },
      { key: 'city', label: 'City', group: 'address' }, { key: 'region', label: 'State / Province / Region', group: 'address', optional: true }, { key: 'country', label: 'Country', group: 'address' }
    ],
    ADDRESS_WORDS: 'Please share the address where you can reliably receive personal mail. We may use it for wedding correspondence, invitations and occasional post related to your trip with us, including after the trip.',
    /* the address as one line, for the record and the profile */
    addressWords: function () { var c = this; var parts = [c.contact('address1'), c.contact('address2'), [c.contact('postal'), c.contact('city')].filter(Boolean).join(' '), c.contact('region'), c.contact('country')].filter(Boolean); return parts.join(', '); },
    addressComplete: function () { return !!(this.contact('address1') && this.contact('postal') && this.contact('city') && this.contact('country')); },
    birthdateWords: function () { var v = this.contact('birthdate'); var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); if (!m) return v || ''; var M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']; return String(parseInt(m[3], 10)) + ' ' + M[parseInt(m[2], 10) - 1] + ' ' + m[1]; },
    validBirthdate: function (v) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '').trim()); if (!m) return false; var y = +m[1]; var d = new Date(Date.UTC(y, +m[2] - 1, +m[3])); return y >= 1900 && y <= new Date().getUTCFullYear() && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] && d.getTime() < Date.now(); },
    /* the fields still empty — asked for, never blocking the journey */
    personalMissing: function () { var self = this; return this.PERSONAL.filter(function (f) { return !f.optional && !f.name && !self.contact(f.key); }).map(function (f) { return { key: f.key, label: f.label, href: 'invitation.html#p-' + f.key }; }); },
    /* the guest list's own data, taken once into empty fields of this guest's record — prefilled to review, never overwriting
       what the guest or the server already holds; recorded in the history as the list's */
    /* the invitation's name as First Name · Last Name: the preferred name first (the register's), the rest of the full name last */
    nameParts: function () {
      var me = this.me(); if (!me) return { first: '', last: '' };
      var full = String(me.fullName || '').trim(), pref = String(me.preferredName || '').trim();
      var first = pref || full.split(/\s+/)[0] || '', last = full;
      if (first && full.indexOf(first) === 0) last = full.slice(first.length).trim(); else if (first && full.indexOf(' ' + first + ' ') >= 0) last = full.replace(' ' + first + ' ', ' ').trim();
      if (last === full && first && full === first) last = '';
      return { first: first, last: last };
    },
    /* the two name fields as the guest sees them: their own correction, else the invitation's words — nothing is written until the guest edits */
    nameField: function (key) { var v = this.contact(key); if (v) return v; var np = this.nameParts(); return key === 'firstName' ? np.first : key === 'lastName' ? np.last : ''; },
    prefillFromInvitation: function () {
      var me = this.me(), a = auth(); if (!me || !a || !a.profile || typeof a.profile !== 'object') return false;
      var st = read(), c = st.contact || {}, pr = a.profile, changed = false, me2 = me.guestId;
      var take = function (k, v) { v = String(v == null ? '' : v).trim(); if (!v || c[k]) return; c[k] = v; st.history = st.history || []; st.history.push({ field: 'contact.' + k, from: '', to: v, at: stamp(), by: 'guest-list' }); changed = true; };
      if (a.guestId === me2) {
        if (validEmail(pr.email)) take('email', pr.email); if (pr.phone) take('phone', pr.phone);
        if (this.validBirthdate(pr.birthdate)) take('birthdate', pr.birthdate); if (pr.nationality) take('nationality', pr.nationality);
        if (pr.address && typeof pr.address === 'object') ['line1', 'line2', 'postal', 'city', 'region', 'country'].forEach(function (k) { if (pr.address[k]) take(k === 'line1' ? 'address1' : k === 'line2' ? 'address2' : k, pr.address[k]); });
      }
      if (changed) { st.contact = c; write(st); this.pushContact(); }
      return changed;
    },
    setContact: function (f, v) {
      var me = this.me(); if (!me) return;
      var st = read();
      st.contact = st.contact || {};
      var from = st.contact[f] || '';
      if (from === v) return;
      st.contact[f] = v;
      st.history = st.history || [];
      st.history.push({ field: 'contact.' + f, from: from, to: v, at: stamp(), by: me.guestId });
      write(st);
      this.pushContact();
      if (f === 'firstName' || f === 'lastName') this.renameHolds();
    },
    /* a corrected name reaches the chairs the guest already holds (the roll call reads the ledger's name): each held seat is
       re-selected under the same identity with the new first name — the seat, the party and the identity unchanged */
    renameHolds: function () {
      var a = auth(), self = this; if (!a || !a.bearer || typeof fetch !== 'function') return Promise.resolve(null);
      var base = CONTACT_API.replace(/\/api\/contact$/, '/api/seating'), name = String(this.nameOf() || '').slice(0, 24);
      var H = { 'content-type': 'application/json', 'x-siyl-auth': a.bearer };
      return fetch(base + '/mine', { method: 'POST', headers: H, body: '{}' }).then(function (r) { return r.json(); }).then(function (d) {
        var mine = (d && d.mine) || {}, jobs = [];
        Object.keys(mine).forEach(function (ev) { var seatId = mine[ev] && mine[ev][a.guestId]; if (seatId) jobs.push(fetch(base + '/select', { method: 'POST', headers: H, body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, event: ev, seatId: seatId, name: name }) }).catch(function () { return null; })); });
        return Promise.all(jobs).then(function () { try { document.dispatchEvent(new CustomEvent('siyl:seats')); } catch (e) {} return jobs.length; });
      }).catch(function () { return null; });
    },
    /* THE CLEAN RESET (Owner, 19 Sep 2026): the contact travels with the epoch this device honoured; a refused write (the
       server was reset since) clears the cached journey through the draft module's rule and pushes nothing back */
    pushContact: function () {
      var a = auth(), st = read(), c = st.contact || {};
      if (!a || !a.bearer || typeof fetch !== 'function') return Promise.resolve(null);
      var D = window.SIYL_DRAFT, seen = null; try { seen = localStorage.getItem('siyl.draft.reset') || null; } catch (e) { seen = null; }
      var body = { invitationId: a.invitationId, email: c.email || '', phone: c.phone || '', seenReset: seen };
      this.PERSONAL.forEach(function (f) { if (f.key !== 'email' && f.key !== 'phone') body[f.key] = c[f.key] || ''; });
      return fetch(CONTACT_API, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-siyl-auth': a.bearer }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (d) { if (d && d.error === 'reset' && d.resetAt && D && D.honourReset) { D.honourReset(d.resetAt); return d; } if (d && d.ok) { var s2 = read(); s2.contactSyncedAt = d.contact && d.contact.at || stamp(); localStorage.setItem(KEY, JSON.stringify(s2)); } return d; }).catch(function () { return null; });
    },
    /* the server copy: fills an empty draft on this device (a signed-in guest on a new phone sees their own email);
       a draft this device already holds that the server lacks is pushed */
    pullContact: function () {
      var self = this, a = auth();
      if (!a || !a.bearer || typeof fetch !== 'function') return Promise.resolve(null);
      return fetch(CONTACT_API, { headers: { 'x-siyl-auth': a.bearer } }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) return d;
        /* the epoch first: a device that synchronised before the reset drops its cached journey (the contact with it) before
           anything of it could be pushed back */
        var D = window.SIYL_DRAFT; if (d.resetAt && D && D.honourReset) D.honourReset(d.resetAt);
        var st = read(), c = st.contact || {}, srv = d.contact || null, changed = false;
        var keys = self.PERSONAL.map(function (f) { return f.key; });
        if (srv) { keys.forEach(function (f) { if (!c[f] && srv[f]) { c[f] = srv[f]; changed = true; } }); }
        if (changed) { st.contact = c; write(st); }
        if (keys.some(function (f) { return c[f] && !(srv && srv[f]); })) self.pushContact();
        /* the guest list's data fills what is still empty — once, for review */
        self.prefillFromInvitation();
        return d;
      }).catch(function () { return null; });
    },
    contactMissing: function () {
      var out = [];
      if (!validEmail(this.contact('email'))) out.push({ key: 'email', label: 'Email address', href: 'invitation.html#p-email' });
      if (!validPhone(this.contact('phone'))) out.push({ key: 'phone', label: 'Mobile number', href: 'invitation.html#p-phone' });
      return out;
    },
    contactComplete: function () { return this.contactMissing().length === 0; },
    /* the retired party-level fields, kept as names for the record's history */
    partyField: function (f) { return this.contact(f); },
    setPartyField: function (f, v) { return this.setContact(f, v); },

    /* ---- about you --------------------------------------------------- */
    profile: function (id, key) {
      var r = this.rec(id), q = PROFILE.filter(function (x) { return x.key === key; })[0], v = (r.profile || {})[key] || '';
      if (q && q.type === 'multi') return Q.profileValue(r.profile, q);   /* the genres: an array of the Owner's choices, never a string */
      if (q && q.choices) { if (q.choices.indexOf(v) >= 0) return v; var old = (r.profile || {}).treat; return q.choices.indexOf(old) >= 0 ? old : ''; }   /* a choice is one of the six or nothing */
      return v;
    },
    setProfile: function (id, key, v) {
      var me = this.me(); if (!me) return;
      id = id || me.guestId; if (id !== me.guestId) return;
      var q = PROFILE.filter(function (x) { return x.key === key; })[0];
      if (q && q.type === 'multi') { v = (Array.isArray(v) ? v : (typeof v === 'string' && v ? [v] : [])).filter(function (c) { return q.choices.indexOf(c) >= 0; }); }   /* the genres: only the Owner's choices, in their order; one word is a set of one */
      else if (q && q.choices && v && q.choices.indexOf(v) < 0) return;   /* a choice question takes one of its choices, or nothing */
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[id], from = r.profile[key] || '';
      var same = q && q.type === 'multi' ? JSON.stringify(Array.isArray(from) ? from : []) === JSON.stringify(v) : from === (v || '');
      if (same) return;
      r.profile[key] = v;
      r.history = r.history || [];
      r.history.push({ field: 'profile.' + key, from: Array.isArray(from) ? from.join(', ') : from, to: Array.isArray(v) ? v.join(', ') : v, at: stamp(), by: me.guestId });
      write(st);
    },
    profileAnswered: function (id) {
      var r = this.rec(id), n = 0;
      PROFILE.forEach(function (q) { if (Q.profileAnswered(r.profile, q)) n++; });
      return n;
    },
    /* one genre in or out of the guest's own set (the multi question) */
    toggleGenre: function (id, genre) {
      var cur = this.profile(id, 'genres') || [], q = PROFILE.filter(function (x) { return x.key === 'genres'; })[0];
      var next = cur.indexOf(genre) >= 0 ? cur.filter(function (g) { return g !== genre; }) : q.choices.filter(function (g) { return cur.indexOf(g) >= 0 || g === genre; });
      this.setProfile(id, 'genres', next);
      return next;
    },
    /* the allergy: 'yes' | 'no' | null; the details only matter for 'yes' */
    allergy: function () { var r = this.rec(); return r.allergy && (r.allergy.answer === 'yes' || r.allergy.answer === 'no') ? r.allergy.answer : null; },
    allergyDetails: function () { var r = this.rec(); return (r.allergy && r.allergy.details) || ''; },
    setAllergy: function (answer, details) {
      var me = this.me(); if (!me) return;
      var st = read();
      st.guests = st.guests || {};
      st.guests[me.guestId] = st.guests[me.guestId] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[me.guestId], prev = r.allergy || {};
      var next = { answer: answer === 'yes' || answer === 'no' ? answer : null, details: answer === 'yes' ? String(details == null ? prev.details || '' : details).trim() : '', at: stamp(), by: me.guestId };
      if (prev.answer === next.answer && (prev.details || '') === next.details) return;
      r.allergy = next;
      r.history = r.history || [];
      r.history.push({ field: 'allergy', from: (prev.answer || '') + (prev.details ? ': ' + prev.details : ''), to: (next.answer || '') + (next.details ? ': ' + next.details : ''), at: next.at, by: me.guestId });
      write(st);
    },
    allergyMissing: function () {
      var a = this.allergy();
      if (a === null) return [{ key: 'allergy', label: 'Food allergy answer', href: 'about-you.html#allergy' }];
      if (a === 'yes' && !this.allergyDetails()) return [{ key: 'allergy-details', label: 'Food allergy details', href: 'about-you.html#allergy-details' }];
      return [];
    },
    allergyComplete: function () { return this.allergyMissing().length === 0; },
    /* the photography acknowledgement — required, first person, never pre-ticked */
    photoAck: function () { var r = this.rec(); return r.photo && r.photo.acknowledged ? r.photo : null; },
    setPhotoAck: function (on) {
      var me = this.me(); if (!me) return false;
      var st = read();
      st.guests = st.guests || {};
      st.guests[me.guestId] = st.guests[me.guestId] || { submitted: {}, profile: {}, history: [] };
      st.guests[me.guestId].photo = on ? { acknowledged: true, at: stamp(), textVersion: PHOTO_VERSION, by: me.guestId } : null;
      write(st);
      return true;
    },
    /* every visible question, unanswered → named, with the way to its box */
    profileMissing: function () {
      var me = this.me(), self = this; if (!me) return [];
      return Q.profileMissing(this.rec(me.guestId).profile);   /* the one schema decides what is required (src/questionnaire.js) */
    },
    aboutMissing: function () {
      var out = this.allergyMissing().concat(this.profileMissing());
      if (!this.photoAck()) out.push({ key: 'photo', label: 'Photography acknowledgement', href: 'about-you.html#photo' });
      return out;
    },
    aboutComplete: function () { return this.aboutMissing().length === 0; },
    /* the retired names, kept for the record's readers */
    REQUIRED: [ALLERGY],
    requiredMissingFor: function () { return this.aboutMissing(); },
    accessAnswered: function () { return this.aboutComplete(); },
    accessMissing: function () { return this.aboutComplete() ? [] : this.guests(); },
    accessAll: function () { return this.aboutComplete(); },

    /* ---- the dress-code acknowledgement — first person only ------------- */
    DRESS_TEXT: "I've reviewed the dress code and know what to prepare for the wedding journey.",
    DRESS_VERSION: '2026-09-09',
    dressAck: function (id) {
      var me = this.me(); if (!me || (id && id !== me.guestId)) return null;
      return this.rec(me.guestId).dress || null;
    },
    setDressAck: function (id, on) {
      var me = this.me(); if (!me) return false;
      if (typeof id === 'boolean') { on = id; id = me.guestId; }
      if (id && id !== me.guestId) return false;
      var st = read();
      st.guests = st.guests || {};
      st.guests[me.guestId] = st.guests[me.guestId] || { submitted: {}, profile: {}, history: [] };
      st.guests[me.guestId].dress = on ? { acknowledged: true, at: stamp(), textVersion: G.DRESS_VERSION, by: me.guestId } : null;
      write(st);
      return true;
    },
    dressAckAll: function () { return !!this.dressAck(); },
    dressMissing: function () { return this.dressAck() ? [] : this.guests(); },

    /* ---- THE SIX STEPS — ONE READINESS ENGINE ----------------------------
     * Every step is a list of named requirements with the control each one
     * is answered on. A step is done when its list is empty. The order is
     * hard: a step is LOCKED while an earlier required step is not done. */
    STEP_DEFS: [
      { key: 'you', n: '01', label: 'Your Invitation', href: 'invitation.html', required: true },
      { key: 'journey', n: '02', label: 'My Trip', href: 'your-journey.html', required: true },
      { key: 'wedding', n: '03', label: 'The Wedding', href: 'wedding.html', required: true },
      { key: 'preparation', n: '04', label: 'Wedding Preparation', href: 'wedding-preparation.html', required: true },
      { key: 'about', n: '05', label: 'About You', href: 'about-you.html', required: true },
      { key: 'review', n: '06', label: 'Review & Send', href: 'review.html', required: true }
    ],
    STATE_LABEL: { complete: '✓ Complete', current: 'Current', attention: 'Needs attention', locked: 'Locked', na: 'Not joining' },

    /* what each step still needs, in order, with the exact control */
    missingFor: function (key) {
      var self = this, T = window.SIYL_TEMPLE, B = window.SIYL_BAG, J = window.SIYL_JOURNEY, S = window.SIYL_SEATS, U = window.SIYL_UNITS, P = window.SIYL_PRICE;
      var p = this.party(), me = this.me();
      if (!p) return [{ key: 'invitation', label: 'Open your invitation', href: 'invitation.html' }];
      var out = [];
      if (key === 'you') return this.contactMissing();
      if (key === 'journey') {
        if (!J || !B) return [];
        /* the scope first: nothing else is asked until the guest has said where they join us; a guest who is not joining is asked nothing more here */
        if (!this.scopeAnswered()) return [{ key: 'scope', label: 'Where will you join us?', href: 'your-journey.html#scope' }];
        /* WHAT IS OUTSIDE THE TRIP MUST HAVE LEFT (Codex final pass, 18 Sep 2026): a room, a seat or a line still held for a
           destination the guest is not joining blocks Review & Send until it is released — a failed release is never sent */
        out = out.concat(this.staleFor());
        if (this.notJoining()) return out;
        var GR = window.SIYL_GRAPH;
        J.SEGMENTS.forEach(function (seg) {
          if (J.relevant && !J.relevant(seg)) return;   /* a stage of a scope the guest is not joining asks nothing */
          var st = J.state(seg);
          if (st === 'waitlisted') return;                /* a stage on the waiting list is answered — visibly unresolved, never a missing item (Owner, 19 Sep 2026) */
          /* the ONE graph decides what counts as an answer: a declined mandatory stage (Kunming → Lijiang inside China) is not one */
          if (st === 'open' || (GR && GR.resolved && !GR.resolved(seg.key, st))) { out.push({ key: 'stage:' + seg.key, label: seg.when + ' · ' + seg.place + (st === 'declined' ? ' — this train is part of China: choose it' : (GR && GR.MANDATORY && GR.MANDATORY.indexOf(seg.key) >= 0 ? ' — choose your travel, it is part of China' : ' — choose or say you are not joining')), href: 'your-journey.html#s-' + seg.key }); return; }
          /* a chosen stay is complete only once the guest holds a place in a room of it */
          if (st === 'selected' && seg.cat === 'Accommodation' && U && U.ready()) {
            var line = B.get().filter(function (x) { return seg.ids.indexOf(x.id) >= 0; })[0];
            var win = line ? (P ? P.windowOf(line.id) : line.id) : null;
            var held = win && line && line.room ? U.mine(U.stageOf(win + '/' + line.room)) : null;
            if (line && line.room && !line.interest && !(held && held.key === win + '/' + line.room)) out.push({ key: 'room:' + seg.key, label: (line.name || seg.label) + ' — choose your room', href: 'your-journey.html?room=' + seg.key + '#s-' + seg.key });
          }
        });
        return out;
      }
      if (key === 'wedding') {
        if (!T) return [];
        if (!this.applicable('wedding')) return [];
        T.EVENTS.forEach(function (e) { if (T.eventOf(me.guestId, e.key) === null) out.push({ key: 'event:' + e.key, label: e.label + ' — attending or not', href: 'wedding.html#ev-' + e.key }); });
        if (T.attendingOf(me.guestId) && T.canOffer(me.guestId) && T.offeringOf_(me.guestId) === null) out.push({ key: 'sangkhathan', label: 'Sangkhathan — yes or no', href: 'wedding.html#sangkhathan' });
        /* A WISH FROM THE BRIDE & GROOM (Owner, 22 Sep 2026): the final act of the wedding night — required, never preselected */
        if (T.finaleOf && T.finaleOf(me.guestId) === null) out.push({ key: 'finale', label: FINALE.eyebrow + ' — the pool jump or BARON', href: 'wedding.html#finale' });
        return out;
      }
      if (key === 'preparation') {
        if (!this.applicable('preparation')) return [];
        if (!this.dressAck()) out.push({ key: 'dress', label: 'Dress code acknowledgement', href: 'wedding-preparation.html#ack' });
        /* seats: required for the events the guest attends, while seating is open to choose */
        if (T && S && S.ready() && S.open() && !S.frozen()) {
          if (T.joining(me.guestId, 'vows') && !p.hosts && S.configured('ceremony') && !S.seatOf('ceremony', me.guestId)) out.push({ key: 'seat:ceremony', label: 'Ceremony seat', href: 'wedding-preparation.html#seats' });
          if (T.joining(me.guestId, 'dinner') && S.configured('dinner') && !S.seatOf('dinner', me.guestId)) out.push({ key: 'seat:dinner', label: 'Dinner seat', href: 'wedding-preparation.html#seats' });
        }
        return out;
      }
      if (key === 'about') return this.applicable('about') ? this.aboutMissing() : [];   /* a guest not joining the trip owes no hospitality answer */
      if (key === 'review') {
        var C = window.SIYL_CONFIRM;
        /* a sent journey is complete only while steps 01–05 still are: what came undone comes first */
        if (!this.mayEnter('review')) { var fm = this.firstMissing(); out.push({ key: 'steps', label: 'Complete ' + (fm ? fm.step.n + ' · ' + fm.step.label : 'the earlier steps'), href: fm ? fm.href : 'invitation.html' }); }
        else if (!(C && C.state() !== 'none')) out.push({ key: 'send', label: 'Send your trip to Guest Relations', href: 'review.html#send' });
        return out;
      }
      return out;
    },
    done: function (key) { return this.missingFor(key).length === 0; },
    /* what this guest still holds outside their destinations: Bag lines, engine rooms, wedding seats — each a way back to the question */
    staleFor: function () {
      var J = window.SIYL_JOURNEY, B = window.SIYL_BAG, U = window.SIYL_UNITS, S = window.SIYL_SEATS, me = this.me(), out = [];
      if (!J || !J.lineRelevant || !this.scopeAnswered()) return out;
      var seen = {};
      if (B) B.get().forEach(function (x) {
        if (J.lineRelevant(x)) return;
        seen[x.id] = true;
        out.push({ key: 'release:' + x.id, label: (x.name || x.id) + ' — outside your trip now, still to be released', href: 'your-journey.html#scope' });
      });
      if (U && U.ready && U.ready() && U.view()) {
        var mine = U.view().mine || {};
        Object.keys(mine).forEach(function (stage) {
          var seg = J.SEGMENTS.filter(function (s) { return s.key === stage || s.ids.indexOf(stage) >= 0; })[0];
          var relevant = seg ? J.relevant(seg) : J.lineRelevant({ id: stage });
          if (relevant) return;
          if (seg && seg.ids.some(function (id) { return seen[id]; })) return;   /* already named through its Bag line */
          out.push({ key: 'release:room:' + stage, label: (seg ? seg.when + ' · ' + seg.place : stage) + ' — a room is still held for a stage outside your trip', href: 'your-journey.html#scope' });
        });
        /* a waiting-list place for a stage outside the trip is given back as well (release 014) */
        var waits = U.view().waitlist || {};
        Object.keys(waits).forEach(function (stage) {
          var seg = J.SEGMENTS.filter(function (s) { return s.key === stage; })[0];
          if (!seg || J.relevant(seg)) return;
          out.push({ key: 'release:wait:' + stage, label: seg.when + ' · ' + seg.place + ' — still on the waiting list for a stage outside your trip', href: 'your-journey.html#scope' });
        });
      }
      /* a seat while the ledger is open to the guest; a frozen ledger is Guest Relations' to change — the decline is sent, the seat is theirs to release */
      if (S && S.ready && S.ready() && S.open() && !S.frozen() && me && !this.joins('vientianeWedding')) ['ceremony', 'dinner'].forEach(function (ev) {
        if (S.seatOf(ev, me.guestId)) out.push({ key: 'release:seat:' + ev, label: (ev === 'ceremony' ? 'Ceremony' : 'Dinner') + ' seat — still held although you are not joining the wedding', href: 'your-journey.html#scope' });
      });
      return out;
    },
    /* does a step apply to this guest at all — the scope decides: the wedding steps need Vientiane, About You needs a guest who joins something */
    applicable: function (key) {
      if (!this.scopeAnswered()) return true;
      if (key === 'wedding' || key === 'preparation') return this.joins('vientianeWedding');
      if (key === 'about') return !this.notJoining();
      return true;
    },
    /* may the guest enter this step: every earlier required step is done */
    mayEnter: function (key) {
      var self = this, defs = this.STEP_DEFS, i = defs.map(function (d) { return d.key; }).indexOf(key);
      if (i < 0) return false;
      for (var j = 0; j < i; j++) if (defs[j].required && !self.done(defs[j].key)) return false;
      return true;
    },
    /* the first thing still needed across steps 01–05, with its step */
    firstMissing: function () {
      var self = this, defs = this.STEP_DEFS;
      for (var i = 0; i < defs.length - 1; i++) {
        var m = self.missingFor(defs[i].key);
        if (m.length) return { step: defs[i], item: m[0], href: m[0].href };
      }
      return null;
    },
    /* where VIEW / CONTINUE / REVIEW should go: Review & Send when it may be entered, else the first missing item */
    nextHref: function () { var fm = this.firstMissing(); return fm ? fm.href : 'review.html'; },

    steps: function (currentKey) {
      var self = this, C = window.SIYL_CONFIRM;
      var p = this.party();
      return this.STEP_DEFS.map(function (d) {
        var missing = p ? self.missingFor(d.key) : [], done = !!p && missing.length === 0, may = !!p && self.mayEnter(d.key), applies = !p || self.applicable(d.key);
        var state = done ? 'complete' : (d.key === currentKey ? 'current' : (may ? 'attention' : 'locked'));
        if (d.key === currentKey && !done) state = 'current';
        if (p && !applies && d.key !== currentKey) state = 'na';
        var note = '';
        if (!p) note = 'Open your invitation';
        else if (!applies) note = self.notJoining() ? 'Not joining this trip' : 'Not joining the wedding';
        else if (d.key === 'review') note = done ? (C && C.state() === 'confirmed' ? 'Confirmed by Guest Relations' : 'Received by Guest Relations') : (may ? 'Ready to send' : 'Available once steps 01–05 are complete');
        else if (done) note = ({ you: 'Name, email and mobile number', journey: self.notJoining() ? 'Not joining this trip' : 'Every stage answered', wedding: 'Every part of the day answered', preparation: 'Dress code and seats', about: 'Allergies and photography answered' })[d.key] || '';
        else if (!may) note = 'Complete the earlier steps first';
        else note = missing.length === 1 ? '1 item to complete' : missing.length + ' items to complete';
        return { key: d.key, n: d.n, label: d.label, href: d.href, required: d.required, done: done, state: state, stateLabel: self.STATE_LABEL[state],
                 missing: missing, may: may, note: note, deep: missing.length ? missing[0].href : d.href,
                 /* the retired vocabulary, for readers that still ask for it */
                 action: done ? 'Review' : 'Complete this', legacyState: done ? 'Completed' : 'Action needed' };
      });
    },
    stepState: function (key) { var s = this.steps().filter(function (x) { return x.key === key; })[0]; return s ? s.state : ''; },

    readiness: function () {
      var p = this.party();
      if (!p) return { ok: false, need: [{ key: 'invitation', label: 'Open your invitation', href: 'invitation.html' }], optional: [], steps: [], first: null };
      var steps = this.steps();
      var need = [];
      steps.forEach(function (s) { if (s.key !== 'review') s.missing.forEach(function (m) { need.push({ key: m.key, step: s, label: m.label, href: m.href, n: s.n, stepLabel: s.label }); }); });
      return { ok: need.length === 0, need: need, steps: steps, optional: [], first: need[0] || null };
    },

    /* ---- what Guest Relations receives ---------------------------------- */
    operational: function () {
      var self = this, p = this.party(), me = this.me();
      if (!p) return null;
      var T = window.SIYL_TEMPLE, r = this.rec(me.guestId);
      return {
        invitationId: p.invitationId,
        guestId: me.guestId,
        partyId: p.partyId,
        partyName: p.partyName,
        party: { label: this.partyLabel(), names: this.partyNames(), members: (p.members || []).map(function (m) { return m.guestId; }) },
        contact: { email: this.contact('email'), phone: this.contact('phone'), birthdate: this.contact('birthdate'), nationality: this.contact('nationality'),
          address: { line1: this.contact('address1'), line2: this.contact('address2'), postal: this.contact('postal'), city: this.contact('city'), region: this.contact('region'), country: this.contact('country'), words: this.addressWords() } },
        ...(me.contactId ? { contactId: me.contactId } : {}), ...(me.couple ? { couple: me.couple } : {}),
        scope: this.scope(),
        scopeWords: this.scopeWords(),
        dress: { all: !!this.dressAck(), acknowledged: this.dressAck() ? [me.guestId] : [], missing: this.dressAck() ? [] : [me.guestId] },
        allergy: { answer: this.allergy(), details: this.allergyDetails() },
        photo: this.photoAck(),
        guests: [{
          guestId: me.guestId,
          name: this.nameOf(me.guestId),
          source: { fullName: me.fullName, preferredName: me.preferredName },
          /* the guest's own correction of their name travels as submitted (the invitation's words stay the source) */
          submitted: (function (sub, self) { var out = Object.assign({}, sub || {}); var fv = self.value(me.guestId, 'fullName'), pv = self.value(me.guestId, 'preferredName'); if (fv && fv !== (me.fullName || '')) out.fullName = fv; if (pv && pv !== (me.preferredName || me.fullName || '')) out.preferredName = pv; return out; })(r.submitted, this),
          profile: r.profile || {},
          allergy: r.allergy || null,
          photo: r.photo || null,
          dress: r.dress || null,
          temple: T ? T.attendanceOf(me.guestId) : null,
          sangkhathan: T ? T.offeringOf(me.guestId) : false,
          ceremonySeat: (window.SIYL_SEATS && SIYL_SEATS.ready()) ? SIYL_SEATS.seatOf('ceremony', me.guestId) : null,
          dinnerSeat: (window.SIYL_SEATS && SIYL_SEATS.ready()) ? SIYL_SEATS.seatOf('dinner', me.guestId) : null,
          history: r.history || []
        }]
      };
    }
  };
  /* the pull: once per page when a guest is signed in, and again when a sign-in happens on this page */
  var pulled = '';
  function pullOnce() { var a = auth(); if (!a || !a.bearer || !G.me()) return; if (pulled === a.invitationId) return; pulled = a.invitationId; G.pullContact(); }
  if (typeof document !== 'undefined') { document.addEventListener('siyl:auth', pullOnce); document.addEventListener('siyl:invite-ready', pullOnce); }
  try { pullOnce(); } catch (e) {}
})();
