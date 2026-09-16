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
  var ALLERGY = { key: 'allergy', n: '01', q: 'Do you have any food allergies?', required: true,
    details: 'Please tell us which — the kitchens read this.' };
  var PROFILE = [
    { key: 'coffeetea', n: '02', q: 'Coffee or tea', hint: 'And how you like it.', required: true },
    { key: 'treat', n: '03', q: 'My favourite', hint: 'A snack, sweet or little treat you never say no to.', required: true },
    { key: 'drink', n: '04', q: 'Favourite drink', hint: 'The one you would choose without looking at the menu.', required: true },
    { key: 'avoid', n: '05', q: 'Anything you would rather avoid?', hint: 'A taste, a scent, a habit — anything at all. "Nothing" is an answer.', required: true },
    { key: 'film', n: '06', q: 'Favourite film', hint: 'The one you could happily watch again.', required: true },
    { key: 'music', n: '07', q: 'Favourite music', hint: 'A song, an album, an artist you never skip.', required: true }
  ];
  /* REQUIRED: the guest knows that photography and filming take place. It is
   * an acknowledgement — never a consent to publication, which stays a
   * separate, optional, withdrawable choice (assets/docs.js). */
  var PHOTO_TEXT = 'I understand and acknowledge this.';
  var PHOTO_VERSION = '2026-09-14';

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
    PHOTO_TEXT: PHOTO_TEXT,
    PHOTO_VERSION: PHOTO_VERSION,
    validEmail: validEmail,
    validPhone: validPhone,

    /* ---- the guest, from the invitation and nowhere else ---------------- */
    me: function () {
      var a = auth();
      if (!a || !a.guestId || !a.bearer || a.invitationId !== 'INV-' + a.guestId) return null;
      return { guestId: a.guestId, fullName: a.fullName || '', preferredName: a.preferredName || a.fullName || '',
               hostRole: a.hostRole === 'BRIDE' || a.hostRole === 'GROOM' ? a.hostRole : null };
    },
    /* the invitation as the surfaces read it: one guest, their party as context */
    party: function () {
      var a = auth(), me = this.me();
      if (!me) return null;
      return { invitationId: a.invitationId, guestId: me.guestId, partyId: a.partyId || '', partyName: a.partyName || '',
               guests: [me], members: Array.isArray(a.members) ? a.members : [me],
               /* the hosts (explicit flag, never inferred): ceremony place is the fixed front centre */
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
      var r = this.rec(id);
      if (r.submitted && r.submitted[field] != null) return r.submitted[field];
      return this.source(id, field);
    },
    edited: function (id, field) {
      var r = this.rec(id);
      return !!(r.submitted && r.submitted[field] != null && String(r.submitted[field]) !== String(this.source(id, field)));
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
    contact: function (f) { var st = read(); return (st.contact || {})[f] || ''; },
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
    },
    pushContact: function () {
      var a = auth(), st = read(), c = st.contact || {};
      if (!a || !a.bearer || typeof fetch !== 'function') return Promise.resolve(null);
      var body = { invitationId: a.invitationId, email: c.email || '', phone: c.phone || '' };
      return fetch(CONTACT_API, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-siyl-auth': a.bearer }, body: JSON.stringify(body) })
        .then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) { var s2 = read(); s2.contactSyncedAt = d.contact && d.contact.at || stamp(); localStorage.setItem(KEY, JSON.stringify(s2)); } return d; }).catch(function () { return null; });
    },
    /* the server copy: fills an empty draft on this device (a signed-in guest on a new phone sees their own email);
       a draft this device already holds that the server lacks is pushed */
    pullContact: function () {
      var self = this, a = auth();
      if (!a || !a.bearer || typeof fetch !== 'function') return Promise.resolve(null);
      return fetch(CONTACT_API, { headers: { 'x-siyl-auth': a.bearer } }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) return d;
        var st = read(), c = st.contact || {}, srv = d.contact || null, changed = false;
        if (srv) { ['email', 'phone'].forEach(function (f) { if (!c[f] && srv[f]) { c[f] = srv[f]; changed = true; } }); }
        if (changed) { st.contact = c; write(st); }
        if ((c.email && !(srv && srv.email)) || (c.phone && !(srv && srv.phone))) self.pushContact();
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
    profile: function (id, key) { var r = this.rec(id); return (r.profile || {})[key] || ''; },
    setProfile: function (id, key, v) {
      var me = this.me(); if (!me) return;
      id = id || me.guestId; if (id !== me.guestId) return;
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[id], from = r.profile[key] || '';
      if (from === (v || '')) return;
      r.profile[key] = v;
      r.history = r.history || [];
      r.history.push({ field: 'profile.' + key, from: from, to: v, at: stamp(), by: me.guestId });
      write(st);
    },
    profileAnswered: function (id) {
      var r = this.rec(id), n = 0;
      PROFILE.forEach(function (q) { if ((r.profile || {})[q.key]) n++; });
      return n;
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
      return PROFILE.filter(function (q) { return q.required && !String(self.profile(me.guestId, q.key) || '').trim(); })
        .map(function (q) { return { key: 'profile:' + q.key, label: q.n + ' · ' + q.q, href: 'about-you.html#q-' + q.key }; });
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
      { key: 'journey', n: '02', label: 'Your Journey', href: 'your-journey.html', required: true },
      { key: 'wedding', n: '03', label: 'The Wedding', href: 'wedding.html', required: true },
      { key: 'preparation', n: '04', label: 'Wedding Preparation', href: 'wedding-preparation.html', required: true },
      { key: 'about', n: '05', label: 'About You', href: 'about-you.html', required: true },
      { key: 'review', n: '06', label: 'Review & Send', href: 'review.html', required: true }
    ],
    STATE_LABEL: { complete: '✓ Complete', current: 'Current', attention: 'Needs attention', locked: 'Locked' },

    /* what each step still needs, in order, with the exact control */
    missingFor: function (key) {
      var self = this, T = window.SIYL_TEMPLE, B = window.SIYL_BAG, J = window.SIYL_JOURNEY, S = window.SIYL_SEATS, U = window.SIYL_UNITS, P = window.SIYL_PRICE;
      var p = this.party(), me = this.me();
      if (!p) return [{ key: 'invitation', label: 'Open your invitation', href: 'invitation.html' }];
      var out = [];
      if (key === 'you') return this.contactMissing();
      if (key === 'journey') {
        if (!J || !B) return [];
        J.SEGMENTS.forEach(function (seg) {
          var st = J.state(seg);
          if (st === 'open') { out.push({ key: 'stage:' + seg.key, label: seg.when + ' · ' + seg.place + ' — choose or say you are not joining', href: 'your-journey.html#s-' + seg.key }); return; }
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
        T.EVENTS.forEach(function (e) { if (T.eventOf(me.guestId, e.key) === null) out.push({ key: 'event:' + e.key, label: e.label + ' — attending or not', href: 'wedding.html#ev-' + e.key }); });
        if (T.attendingOf(me.guestId) && T.canOffer(me.guestId) && T.offeringOf_(me.guestId) === null) out.push({ key: 'sangkhathan', label: 'Sangkhathan — yes or no', href: 'wedding.html#sangkhathan' });
        return out;
      }
      if (key === 'preparation') {
        if (!this.dressAck()) out.push({ key: 'dress', label: 'Dress code acknowledgement', href: 'wedding-preparation.html#ack' });
        /* seats: required for the events the guest attends, while seating is open to choose */
        if (T && S && S.ready() && S.open() && !S.frozen()) {
          if (T.joining(me.guestId, 'vows') && !p.hosts && S.configured('ceremony') && !S.seatOf('ceremony', me.guestId)) out.push({ key: 'seat:ceremony', label: 'Ceremony seat', href: 'wedding-preparation.html#seats' });
          if (T.joining(me.guestId, 'dinner') && S.configured('dinner') && !S.seatOf('dinner', me.guestId)) out.push({ key: 'seat:dinner', label: 'Dinner seat', href: 'wedding-preparation.html#seats' });
        }
        return out;
      }
      if (key === 'about') return this.aboutMissing();
      if (key === 'review') {
        var C = window.SIYL_CONFIRM;
        /* a sent journey is complete only while steps 01–05 still are: what came undone comes first */
        if (!this.mayEnter('review')) { var fm = this.firstMissing(); out.push({ key: 'steps', label: 'Complete ' + (fm ? fm.step.n + ' · ' + fm.step.label : 'the earlier steps'), href: fm ? fm.href : 'invitation.html' }); }
        else if (!(C && C.state() !== 'none')) out.push({ key: 'send', label: 'Send your journey to Guest Relations', href: 'review.html#send' });
        return out;
      }
      return out;
    },
    done: function (key) { return this.missingFor(key).length === 0; },
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
        var missing = p ? self.missingFor(d.key) : [], done = !!p && missing.length === 0, may = !!p && self.mayEnter(d.key);
        var state = done ? 'complete' : (d.key === currentKey ? 'current' : (may ? 'attention' : 'locked'));
        if (d.key === currentKey && !done) state = 'current';
        var note = '';
        if (!p) note = 'Open your invitation';
        else if (d.key === 'review') note = done ? (C && C.state() === 'confirmed' ? 'Confirmed by Guest Relations' : 'Received by Guest Relations') : (may ? 'Ready to send' : 'Available once steps 01–05 are complete');
        else if (done) note = ({ you: 'Name, email and mobile number', journey: 'Every stage answered', wedding: 'Every part of the day answered', preparation: 'Dress code and seats', about: 'Allergies and photography answered' })[d.key] || '';
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
        contact: { email: this.contact('email'), phone: this.contact('phone') },
        dress: { all: !!this.dressAck(), acknowledged: this.dressAck() ? [me.guestId] : [], missing: this.dressAck() ? [] : [me.guestId] },
        allergy: { answer: this.allergy(), details: this.allergyDetails() },
        photo: this.photoAck(),
        guests: [{
          guestId: me.guestId,
          name: this.nameOf(me.guestId),
          source: { fullName: me.fullName, preferredName: me.preferredName },
          submitted: r.submitted || {},
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
