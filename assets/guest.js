/* ============================================================================
   SEE YOU IN LAOS — THE GUEST RECORD.

   One authenticated state for the whole website. Three layers, never merged,
   so a guest's correction can never destroy the record the invitation came from:

     source{}     what the invitation resolved — read-only, always shown as
                  "from your invitation"
     submitted{}  what the guest has entered or corrected
     history[]    { field, from, to, at, by } — every change, kept, and signed

   Per NAMED guest it also carries the decisions Wave 1 introduces: the temple,
   the Sangkhathan, the hospitality profile. Seats have their slot here and are
   filled by Wave 2; nothing invents them now.

   C · PARTY / PERSON. Two kinds of state, never merged, and every key belongs
   to exactly one of them (SCOPE below):

     PARTY STATE     shared by everyone on the invitation — the journey, the
                     costs, one contact, the invitation confirmed once.
                     Guest-facing label:  FOR YOUR PARTY · PEGGY & STEFFIE
     PERSONAL STATE  belongs to one named guest — names, profile, the temple,
                     the dress-code acknowledgement, documents, consent, seats.
                     Guest-facing label:  FOR PEGGY

   And two kinds of person, never confused:

     ACTIVE    activeGuestId — who is continuing. The code opens the PARTY;
               the person then says who they are (WHO ARE YOU). Stored against
               the invitation it was chosen on, so it never survives into
               another party's session. SWITCH IDENTITY changes this and
               touches nobody's data.
     SUBJECT   subjectGuestId — whose personal item is being completed right
               now. It defaults to the active person and is never persisted:
               ANSWERING FOR is a deliberate act on one surface, and a new
               page always starts with the guest answering for themselves.
               Acknowledgements (dress code, consent) are first person only.

   Every write is signed: history[] entries carry `by`, the active person who
   actually wrote them, so a record completed for someone says so.

   Storage is the same localStorage draft the Journey Bag uses. Documents are
   NOT here: no document byte ever touches this file (Wave 3).
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.guest';
  var WHO = 'siyl.who';
  /* the subject lives in memory only — see the header */
  var subjectId = null;

  function auth() {
    try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; }
  }
  function read() {
    var st;
    try { st = JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { st = {}; }
    /* A party-wide dress acknowledgement from before C cannot be attributed
     * to a person, so it counts for nobody — and it is not destroyed either. */
    if (st.dress) { st.dressLegacy = st.dressLegacy || st.dress; delete st.dress; localStorage.setItem(KEY, JSON.stringify(st)); }
    return st;
  }
  function stamp() { return new Date().toISOString(); }
  function write(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
    try { document.dispatchEvent(new CustomEvent('siyl:guest')); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  /* the seven hospitality questions plus the one operational field.
   * Every one is optional; the first has an explicit "nothing to note". */
  var PROFILE = [
    { key: 'dietary', n: '01', q: 'Food allergies or dietary requirements',
      hint: 'Tell us anything our team should know.', none: 'Nothing to note',
      why: 'Kitchens in three countries cook for you; this is the one profile answer the kitchens actually receive.' },
    { key: 'drink', n: '02', q: 'Your favourite drink',
      hint: 'What would make you smile if it appeared unexpectedly?',
      why: 'An unscheduled arrival in the room or at the table. Anything at all — coffee, matcha, a soft drink, a cocktail.' },
    { key: 'coffeetea', n: '03', q: 'Coffee or tea',
      hint: 'How do you usually like it?',
      why: 'Breakfasts, the train, the long afternoons — it is the small thing that is always right or always slightly wrong.' },
    { key: 'treat', n: '04', q: 'A small favourite',
      hint: 'Is there a snack, sweet or little treat you especially enjoy?',
      why: 'Turndown, a long transfer, the night train — a reason to leave something behind for you.' },
    { key: 'comfort', n: '05', q: 'Travel comfort',
      hint: 'Is there anything that makes travelling more comfortable for you?',
      why: 'Twelve days, four flights and a night train. What helps you travel is worth knowing once.' },
    { key: 'avoid', n: '06', q: 'Anything you would rather avoid?',
      hint: 'Anything our team should be mindful of during the journey?',
      why: 'Knowing what not to do is as useful to us as knowing what to do.' },
    { key: 'anything', n: '07', q: 'Anything else we should know?',
      hint: 'Share any request, personal preference or detail that may help us look after you.',
      why: 'The open door — a request, an occasion, a piece of context that belongs to no other question.' }
  ];
  var ACCESS = { key: 'access', q: 'Accessibility or comfort needs',
    hint: 'Is there anything we can arrange to make the journey more comfortable or accessible for you?',
    why: 'Operational, not hospitality: it changes rooms, transfers and the order of a day.' };

  var G = window.SIYL_GUEST = {
    PROFILE: PROFILE,
    ACCESS: ACCESS,

    /* ---- the party, from the invitation and nowhere else ---------------- */
    party: function () {
      var a = auth();
      /* No names, no party. A session stored before the named party travelled
       * with the invitation cannot answer a single per-person question, so it
       * is treated as not open — the surface shows its gate and the guest
       * enters the code once, instead of meeting a blank page. */
      if (!a || !Array.isArray(a.guests) || !a.guests.length) return null;
      return { invitationId: a.invitationId, partyName: a.partyName || '',
               partyLead: a.partyLead || '', guests: a.guests,
               /* E · 'PAIR' | 'NONE' | null (unresolved) — never inferred */
               givingEligibility: a.givingEligibility === 'PAIR' || a.givingEligibility === 'NONE' ? a.givingEligibility : null };
    },
    /* the invitation is open, but from before the names were carried */
    stale: function () {
      var a = auth();
      return !!(a && a.invitationId) && !(Array.isArray(a.guests) && a.guests.length);
    },
    guests: function () { var p = this.party(); return p ? p.guests : []; },
    isParty: function () { return this.guests().length > 1; },
    named: function (id) {
      var g = this.guests().filter(function (x) { return x.guestId === id; })[0];
      return g ? (g.preferredName || g.fullName) : id;
    },
    /* the name the guest actually goes by — their correction first */
    nameOf: function (id) {
      var g = this.guests().filter(function (x) { return x.guestId === id; })[0];
      if (!g) return '';
      return this.value(id, 'preferredName') || g.preferredName || g.fullName;
    },
    partyNames: function () {
      var self = this, p = this.party(); if (!p) return '';
      var n = p.guests.map(function (g) { return self.nameOf(g.guestId); });
      return n.length > 1 ? n.slice(0, -1).join(', ') + ' & ' + n[n.length - 1] : (n[0] || p.partyName);
    },

    /* ---- WHAT BELONGS TO WHOM ------------------------------------------ */
    SCOPE: {
      party:    ['identity', 'contact', 'journey', 'costs'],
      personal: ['names', 'profile', 'access', 'temple', 'events', 'sangkhathan',
                 'dress', 'documents', 'consent', 'ceremonySeat', 'dinnerSeat']
    },
    scopeOf: function (key) {
      if (this.SCOPE.party.indexOf(key) >= 0) return 'party';
      if (this.SCOPE.personal.indexOf(key) >= 0) return 'personal';
      return null;
    },
    /* guest-facing labels — never a data-model word */
    partyLabel: function () { var p = this.party(); return p ? 'For your party · ' + this.partyNames() : ''; },
    labelFor: function (id) { return 'For ' + this.nameOf(id); },

    /* ---- WHO IS CONTINUING, AND WHO IS BEING ANSWERED FOR --------------- */
    whoStored: function () {
      try { return JSON.parse(localStorage.getItem(WHO) || 'null'); } catch (e) { return null; }
    },
    active: function () {
      var p = this.party(); if (!p) return null;
      var w = this.whoStored();
      /* an identity only belongs to the invitation it was chosen on */
      if (!w || w.partyId !== p.invitationId) return null;
      return p.guests.filter(function (g) { return g.guestId === w.guestId; })[0] || null;
    },
    activeName: function () { var a = this.active(); return a ? this.nameOf(a.guestId) : ''; },
    /* SWITCH IDENTITY — I am now continuing as another member of this
     * invitation. Nobody's data moves. The subject resets to the new person. */
    setActive: function (guestId) {
      var p = this.party(); if (!p) return false;
      if (!p.guests.some(function (g) { return g.guestId === guestId; })) return false;
      localStorage.setItem(WHO, JSON.stringify({ partyId: p.invitationId, guestId: guestId, at: stamp() }));
      subjectId = null;
      try { document.dispatchEvent(new CustomEvent('siyl:who')); } catch (e) {}
      return true;
    },
    subject: function () {
      var a = this.active(); if (!a) return null;
      if (!subjectId) return a;
      return this.guests().filter(function (g) { return g.guestId === subjectId; })[0] || a;
    },
    subjectName: function () { var s = this.subject(); return s ? this.nameOf(s.guestId) : ''; },
    /* ANSWERING FOR — I remain who I am and deliberately complete a permitted
     * personal item for another named guest. null: back to myself. */
    setSubject: function (guestId) {
      var a = this.active(); if (!a) return false;
      if (guestId == null || guestId === a.guestId) { subjectId = null; }
      else {
        if (!this.guests().some(function (g) { return g.guestId === guestId; })) return false;
        subjectId = guestId;
      }
      try { document.dispatchEvent(new CustomEvent('siyl:subject')); } catch (e) {}
      return true;
    },
    answeringFor: function () {
      var a = this.active(), s = this.subject();
      return !!(a && s && a.guestId !== s.guestId);
    },
    who: function () {
      var p = this.party(); if (!p) return null;
      var a = this.active(), s = this.subject();
      return { partyId: p.invitationId, activeGuestId: a ? a.guestId : null, subjectGuestId: s ? s.guestId : null };
    },
    /* an acknowledgement is a first-person statement: only the person */
    mayAcknowledge: function (id) { var a = this.active(); return !!(a && a.guestId === id); },

    /* ---- per-guest record ---------------------------------------------- */
    rec: function (id) {
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      return st.guests[id];
    },
    /* SOURCE is never written to — it is the invitation's own value */
    source: function (id, field) {
      var g = this.guests().filter(function (x) { return x.guestId === id; })[0] || {};
      if (field === 'fullName') return g.fullName || '';
      if (field === 'preferredName') return g.preferredName || g.fullName || '';
      return '';
    },
    /* what the guest sees in the field: their value, else the source */
    value: function (id, field) {
      var r = this.rec(id);
      if (r.submitted && r.submitted[field] != null) return r.submitted[field];
      return this.source(id, field);
    },
    edited: function (id, field) {
      var r = this.rec(id);
      return !!(r.submitted && r.submitted[field] != null &&
                String(r.submitted[field]) !== String(this.source(id, field)));
    },
    set: function (id, field, v) {
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[id];
      var from = r.submitted[field] != null ? r.submitted[field] : this.source(id, field);
      if (String(from) === String(v)) return;
      r.submitted[field] = v;
      r.history.push({ field: field, from: from, to: v, at: stamp(), by: this.who() && this.who().activeGuestId });
      write(st);
    },

    /* ---- hospitality profile — every answer optional -------------------- */
    profile: function (id, key) { var r = this.rec(id); return (r.profile || {})[key] || ''; },
    setProfile: function (id, key, v) {
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      var r = st.guests[id], from = r.profile[key] || '';
      if (from === (v || '')) return;
      r.profile[key] = v;
      r.history = r.history || [];
      r.history.push({ field: 'profile.' + key, from: from, to: v, at: stamp(), by: this.who() && this.who().activeGuestId });
      write(st);
    },
    profileAnswered: function (id) {
      var r = this.rec(id), n = 0;
      PROFILE.concat([ACCESS]).forEach(function (q) { if ((r.profile || {})[q.key]) n++; });
      return n;
    },

    /* ---- party-level contact — one reliable pair is enough -------------- */
    partyField: function (f) { var st = read(); return (st.party || {})[f] || ''; },
    setPartyField: function (f, v) {
      var st = read();
      st.party = st.party || {};
      var from = st.party[f] || '';
      if (from === v) return;
      st.party[f] = v;
      st.history = st.history || [];
      st.history.push({ field: 'party.' + f, from: from, to: v, at: stamp(), by: this.who() && this.who().activeGuestId });
      write(st);
    },

    /* ---- the dress-code acknowledgement — PERSONAL, first person only ---
     * One per named guest, never ticked for anyone, never pre-ticked. Without
     * a name it means the person who is continuing. */
    DRESS_TEXT: "I've reviewed the dress code and know what to prepare for the wedding journey.",
    DRESS_VERSION: '2026-09-09',
    dressAck: function (id) {
      if (!id) { var a = this.active(); if (!a) return null; id = a.guestId; }
      var st = read();
      return ((st.guests || {})[id] || {}).dress || null;
    },
    setDressAck: function (id, on) {
      if (!this.mayAcknowledge(id)) return false;
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      st.guests[id].dress = on ? { acknowledged: true, at: stamp(), textVersion: G.DRESS_VERSION, by: id } : null;
      write(st);
      return true;
    },
    dressAckAll: function () {
      var self = this, g = this.guests();
      return g.length > 0 && g.every(function (x) { return !!self.dressAck(x.guestId); });
    },
    dressMissing: function () {
      var self = this;
      return this.guests().filter(function (x) { return !self.dressAck(x.guestId); });
    },

    /* ---- the invitation briefing ---------------------------------------- */
    /* A guest who has never seen who is invited, and for whom they are
     * deciding, has not been briefed — and an unbriefed guest cannot send a
     * journey on behalf of other named people. */
    identityReviewed: function () { var st = read(); return st.identity || null; },
    setIdentityReviewed: function (on) {
      var st = read();
      st.identity = on ? { at: stamp(), by: this.who() && this.who().activeGuestId } : null;
      write(st);
    },

    /* ---- THE SIX STEPS, AND WHAT EACH ONE ACTUALLY HOLDS -----------------
     * Every step has a purpose, a real interaction, a visible state and one
     * next action. Four states, said in words and never by colour alone:
     *   Completed · Action needed · Optional · not completed · In progress
     * REQUIRED means nobody else can answer it for the guest afterwards.
     * OPTIONAL never blocks a submission. */
    STEP_DEFS: [
      { key: 'you', n: '01', label: 'Your Invitation', href: 'invitation.html', required: true },
      { key: 'journey', n: '02', label: 'Your Journey', href: 'your-journey.html', required: true },
      { key: 'wedding', n: '03', label: 'The Wedding', href: 'wedding.html', required: true },
      { key: 'preparation', n: '04', label: 'Wedding Preparation', href: 'wedding-preparation.html', required: true },
      { key: 'about', n: '05', label: 'About You', href: 'about-you.html', required: false },
      { key: 'review', n: '06', label: 'Review & Send', href: 'review.html', required: true }
    ],

    steps: function () {
      var self = this, T = window.SIYL_TEMPLE, B = window.SIYL_BAG, D = window.SIYL_DOCS;
      var p = this.party(), guests = p ? p.guests : [];
      var contact = !!(this.partyField('email') || this.partyField('phone'));
      var chosen = !!(B && B.get().length);
      var weddingDecided = !!(T && T.decidedAll());
      var dress = this.dressAckAll();
      var dressOpen = this.dressMissing().map(function (g) { return self.nameOf(g.guestId); });
      var answered = guests.filter(function (g) { return self.profileAnswered(g.guestId) > 0; }).length;
      var docsIn = 0, docsTotal = guests.length * 2, consentDone = 0;
      if (D) guests.forEach(function (g) {
        D.forGuest(g.guestId).forEach(function (d) { if (d.state !== 'Not provided') docsIn++; });
        if (D.consentDecided(g.guestId)) consentDone++;
      });

      function state(done, started, required) {
        if (done) return 'Completed';
        if (required) return started ? 'In progress' : 'Action needed';
        return started ? 'In progress' : 'Optional · not completed';
      }

      var out = [];
      out.push({ key: 'you', n: '01', label: 'Your Invitation', href: 'invitation.html', required: true,
        state: state(contact, guests.length > 0, true),
        note: contact ? 'Names and one way to reach you' : 'One email address or telephone number is still needed',
        action: contact ? 'Review' : 'Add your contact', deep: 'you.html#contact' });
      out.push({ key: 'journey', n: '02', label: 'Your Journey', href: 'your-journey.html', required: true,
        state: state(chosen, false, true),
        note: chosen ? (B.get().length + ' selections') : 'Choose your travel and your stays',
        action: chosen ? 'Review' : 'Choose your journey', deep: chosen ? 'your-journey.html' : 'journeys.html' });
      var wOpen = (T && T.undecided().length)
        ? T.undecided().map(function (g) { return g.preferredName || g.fullName; }).join(' · ') + ' — still to answer'
        : 'Participation answered for each named guest';
      out.push({ key: 'wedding', n: '03', label: 'The Wedding', href: 'wedding.html', required: true,
        state: state(weddingDecided, !!(T && T.people().some(function (g) { return T.attendanceOf(g.guestId) !== null; })), true),
        note: wOpen,
        action: !weddingDecided ? 'Answer for each guest' : 'Review',
        deep: 'wedding.html' });
      out.push({ key: 'preparation', n: '04', label: 'Wedding Preparation', href: 'wedding-preparation.html', required: true,
        state: state(dress, guests.length > dressOpen.length, true),
        note: dress ? 'Dress code acknowledged by each of you' : 'Dress code still to be acknowledged by ' + dressOpen.join(' · '),
        action: dress ? 'Review' : 'Review dress code',
        deep: 'wedding-preparation.html#dress-code' });
      var aboutStarted = answered > 0 || docsIn > 0 || consentDone > 0;
      var aboutDone = answered === guests.length && docsIn === docsTotal && consentDone === guests.length;
      out.push({ key: 'about', n: '05', label: 'About You', href: 'about-you.html', required: false,
        state: !aboutStarted ? 'Optional · not completed' : (aboutDone ? 'Completed' : 'In progress'),
        note: [answered ? (answered + ' of ' + guests.length + (guests.length === 1 ? ' guest has' : ' guests have') + ' shared something') : 'Optional — and welcome at any time',
               docsIn ? (docsIn + ' of ' + docsTotal + ' documents received · the rest can be added later') : ''].filter(Boolean).join(' · '),
        action: aboutStarted ? 'Review' : 'Answer the questions', deep: 'about-you.html#about-you' });
      var ready = contact && chosen && weddingDecided && dress;
      out.push({ key: 'review', n: '06', label: 'Review & Send', href: 'review.html', required: true,
        state: ready ? 'Completed' : 'Action needed',
        note: ready ? 'Everything required is here' : 'Available after the required information is complete',
        action: 'Open', deep: 'review.html' });
      return out;
    },

    stepState: function (key) {
      var s = this.steps().filter(function (x) { return x.key === key; })[0];
      return s ? s.state : '';
    },

    readiness: function () {
      var p = this.party();
      if (!p) return { ok: false, need: [{ key: 'invitation', label: 'Open your invitation', href: 'invitation.html' }],
                       optional: [], steps: [] };
      var steps = this.steps();
      var need = steps.filter(function (s) { return s.required && s.key !== 'review' && s.state !== 'Completed'; })
        .map(function (s) { return { key: s.key, label: s.label, href: s.deep, note: s.note, action: s.action }; });
      return { ok: need.length === 0, need: need, steps: steps,
               optional: steps.filter(function (s) { return !s.required; }) };
    },

    /* ---- what Guest Relations receives ---------------------------------- */
    operational: function () {
      var self = this, p = this.party();
      if (!p) return null;
      var T = window.SIYL_TEMPLE, w = this.who();
      var acked = p.guests.filter(function (g) { return !!self.dressAck(g.guestId); }).map(function (g) { return g.guestId; });
      return {
        invitationId: p.invitationId,
        partyName: p.partyName,
        /* who pressed SEND — the active person, never the subject */
        submittedBy: w ? w.activeGuestId : null,
        party: { label: this.partyLabel(), names: this.partyNames(), identityReviewed: this.identityReviewed() },
        contact: { email: this.partyField('email'), phone: this.partyField('phone') },
        dress: { all: this.dressAckAll(), acknowledged: acked,
                 missing: this.dressMissing().map(function (g) { return g.guestId; }) },
        guests: p.guests.map(function (g) {
          var r = self.rec(g.guestId);
          return {
            guestId: g.guestId,
            name: self.nameOf(g.guestId),
            source: { fullName: g.fullName, preferredName: g.preferredName },
            submitted: r.submitted || {},
            profile: r.profile || {},
            dress: r.dress || null,
            temple: T ? T.attendanceOf(g.guestId) : null,
            sangkhathan: T ? T.offeringOf(g.guestId) : false,
            /* G · the seats as the server ledger holds them, by name */
            ceremonySeat: (window.SIYL_SEATS && SIYL_SEATS.ready()) ? SIYL_SEATS.seatOf('ceremony', g.guestId) : null,
            dinnerSeat: (window.SIYL_SEATS && SIYL_SEATS.ready()) ? SIYL_SEATS.seatOf('dinner', g.guestId) : null,
            history: r.history || []
          };
        })
      };
    }
  };
})();
