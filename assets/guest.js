/* ============================================================================
   SEE YOU IN LAOS — THE GUEST RECORD.

   One authenticated state for the whole website. Three layers, never merged,
   so a guest's correction can never destroy the record the invitation came from:

     source{}     what the invitation resolved — read-only, always shown as
                  "from your invitation"
     submitted{}  what the guest has entered or corrected
     history[]    { field, from, to, at } — every change, kept

   Per NAMED guest it also carries the decisions Wave 1 introduces: the temple,
   the Sangkhathan, the hospitality profile. Seats have their slot here and are
   filled by Wave 2; nothing invents them now.

   Storage is the same localStorage draft the Journey Bag uses. Documents are
   NOT here: no document byte ever touches this file (Wave 3).
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.guest';

  function auth() {
    try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; }
  }
  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; } catch (e) { return {}; }
  }
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
      if (!a) return null;
      return { invitationId: a.invitationId, partyName: a.partyName || '',
               partyLead: a.partyLead || '', guests: a.guests || [] };
    },
    guests: function () { var p = this.party(); return p ? p.guests : []; },
    isParty: function () { return this.guests().length > 1; },
    named: function (id) {
      var g = this.guests().filter(function (x) { return x.guestId === id; })[0];
      return g ? (g.preferredName || g.fullName) : id;
    },

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
      r.history.push({ field: field, from: from, to: v, at: new Date().toISOString() });
      write(st);
    },

    /* ---- hospitality profile — every answer optional -------------------- */
    profile: function (id, key) { var r = this.rec(id); return (r.profile || {})[key] || ''; },
    setProfile: function (id, key, v) {
      var st = read();
      st.guests = st.guests || {};
      st.guests[id] = st.guests[id] || { submitted: {}, profile: {}, history: [] };
      st.guests[id].profile[key] = v;
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
      st.history.push({ field: 'party.' + f, from: from, to: v, at: new Date().toISOString() });
      write(st);
    },

    /* ---- the dress-code acknowledgement --------------------------------- */
    DRESS_TEXT: "I've reviewed the dress code and know what to prepare for the wedding journey.",
    DRESS_VERSION: '2026-09-09',
    dressAck: function () { var st = read(); return st.dress || null; },
    setDressAck: function (on) {
      var st = read();
      st.dress = on ? { acknowledged: true, at: new Date().toISOString(), textVersion: G.DRESS_VERSION } : null;
      write(st);
    },

    /* ---- what Guest Relations receives ---------------------------------- */
    operational: function () {
      var self = this, p = this.party();
      if (!p) return null;
      var T = window.SIYL_TEMPLE;
      return {
        invitationId: p.invitationId,
        partyName: p.partyName,
        contact: { email: this.partyField('email'), phone: this.partyField('phone') },
        dress: this.dressAck(),
        guests: p.guests.map(function (g) {
          var r = self.rec(g.guestId);
          return {
            guestId: g.guestId,
            source: { fullName: g.fullName, preferredName: g.preferredName },
            submitted: r.submitted || {},
            profile: r.profile || {},
            temple: T ? T.attendanceOf(g.guestId) : null,
            sangkhathan: T ? T.offeringOf(g.guestId) : false,
            /* Wave 2 fills these; the shape exists so operations can plan */
            ceremonySeat: r.ceremonySeat || null,
            dinnerSeat: r.dinnerSeat || null,
            history: r.history || []
          };
        })
      };
    }
  };
})();
