/* ============================================================================
   SEE YOU IN LAOS — THE BUDDHIST MORNING.

   The Temple Ceremony is OPTIONAL, and the hosts need a reliable list: who is
   coming to the temple, who is not, and for whom a Sangkhathan offering has to
   be prepared. Two decisions, kept deliberately apart:

     ATTENDANCE   attend / not attending. Stored per guest, in the guest's
                  own name. It buys nothing and it consumes no inventory.
     SANGKHATHAN  an optional personal offering, USD 15 for THIS guest
                  (Owner decision, 14 Sep 2026: an individual YES / NO, never
                  a couple decision, never another guest's amount in this
                  guest's journey). ELIGIBILITY IS EXPLICIT: the invitation
                  carries sangkhathan "ELIGIBLE" or "NONE"; anything else is
                  unresolved and nothing is offered. It is never derived from
                  party size, names or wording. The choice is available only
                  while the guest is attending the Temple Ceremony. It is a
                  normal journey line, priced by assets/pricing.js like
                  everything else, and deliberately absent from the room
                  engine.

   Tak Bat — the morning alms-giving, in which food is respectfully offered to
   Buddhist monks — is part of the Temple Ceremony. Guests attending are INVITED
   to take part. It is SELF-PAY (arranged by each guest on the morning; no
   amount is set here), never a cart product, never a fifth event, and never
   the same thing as the Sangkhathan: nobody may leave this website believing
   they paid USD 15 for the alms-giving.

   Three states per person, never two: NOT DECIDED is not NOT ATTENDING, and a
   guest who has not answered the Sangkhathan has not declined it. Every
   record here is keyed by the guest's own id and written only by that guest.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.temple';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; }
    catch (e) { return {}; }
  }
  /* the guest — the only person who ever writes here */
  function by() {
    var G = window.SIYL_GUEST, m = G && G.me ? G.me() : null;
    return m ? m.guestId : null;
  }
  function mine(id) { var m = by(); return !!(m && id === m); }
  function write(v) {
    localStorage.setItem(KEY, JSON.stringify(v));
    try { document.dispatchEvent(new CustomEvent('siyl:temple')); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  /* the guest, or a single anonymous stand-in before authentication */
  function people() {
    var G = window.SIYL_GUEST, list = G ? G.guests() : [];
    if (!list.length) return [{ guestId: 'self', fullName: '', preferredName: 'You' }];
    /* one name for one person across the whole website: if the guest has
     * corrected what we call them, the temple list says the corrected name */
    return list.map(function (g) {
      return { guestId: g.guestId, fullName: G.value(g.guestId, 'fullName') || g.fullName,
               preferredName: G.value(g.guestId, 'preferredName') || g.preferredName || g.fullName };
    });
  }
  function nameOf(id) {
    var p = people().filter(function (g) { return g.guestId === id; })[0];
    return p ? (p.preferredName || p.fullName || 'You') : 'You';
  }

  /* THE ACTIVE WEDDING PROGRAMME — 28 February 2027, and nothing else.
   * Four events, all complimentary, hosted by Haruthai & Suthep. Each named
   * guest answers each one: joining, not joining, or not yet decided. */
  var EVENTS = [
    { key: 'temple', label: 'Temple Ceremony', when: '09:00 – approximately 12:00',
      place: 'Wat Ong Teu, Vientiane' },
    { key: 'coffee', label: 'Coffee & Cake', when: 'From 12:00',
      place: 'Souphattra Heritage Vientiane' },
    { key: 'vows', label: 'Vow Ceremony', when: '15:30',
      place: 'Souphattra Heritage Vientiane' },
    { key: 'dinner', label: 'Wedding Dinner', when: '19:30',
      place: 'Souphattra Heritage Vientiane · poolside' }
  ];

  var T = window.SIYL_TEMPLE = {
    ID: 'sangkhathan',
    EVENTS: EVENTS,
    people: people,
    nameOf: nameOf,

    /* ---- participation, per named guest, per active event --------------- */
    eventOf: function (id, key) {
      if (key === 'temple') return this.attendanceOf(id);
      var v = ((read().by || {})[id] || {}).events || {};
      return v[key] === 'yes' || v[key] === 'no' ? v[key] : null;
    },
    joining: function (id, key) { return this.eventOf(id, key) === 'yes'; },
    setEvent: function (id, key, v) {
      if (!mine(id)) return false;
      if (key === 'temple') return this.setAttendance(id, v);
      var st = read();
      st.by = st.by || {};
      st.by[id] = st.by[id] || {};
      st.by[id].events = st.by[id].events || {};
      if (v === 'yes' || v === 'no') st.by[id].events[key] = v;
      else delete st.by[id].events[key];
      st.by[id].at = new Date().toISOString();
      st.by[id].by = by();
      write(st);
    },

    /* ---- PER NAMED GUEST. The party-wide reading is derived, never stored. */
    attendanceOf: function (id) {
      var v = (read().by || {})[id];
      return v && (v.attend === 'yes' || v.attend === 'no') ? v.attend : null;
    },
    attendingOf: function (id) { return this.attendanceOf(id) === 'yes'; },

    /* ---- SANGKHATHAN — the guest's own YES / NO, explicit eligibility ---- */
    eligibility: function () {
      var G = window.SIYL_GUEST, p = G && G.party ? G.party() : null;
      return p && (p.sangkhathan === 'ELIGIBLE' || p.sangkhathan === 'NONE') ? p.sangkhathan : null;
    },
    /* the guest may choose only while they attend the Temple Ceremony */
    canOffer: function (id) { return this.eligibility() === 'ELIGIBLE' && this.attendingOf(id); },
    offeringOf: function (id) { return this.offeringOf_(id) === 'yes'; },
    /* 'yes' selected · 'no' continued without one · null not decided or not offered */
    offeringOf_: function (id) {
      if (!this.canOffer(id)) return null;
      var v = (read().by || {})[id];
      return v && (v.off === 'yes' || v.off === 'no') ? v.off : null;
    },
    /* nothing to decide unless the guest is eligible and attending */
    offeringDecidedOf: function (id) {
      if (!this.canOffer(id)) return true;
      return this.offeringOf_(id) !== null;
    },

    setAttendance: function (id, v) {
      if (!mine(id)) return false;
      var st = read();
      st.by = st.by || {};
      st.by[id] = st.by[id] || {};
      st.by[id].attend = (v === 'yes' || v === 'no') ? v : null;
      st.by[id].at = new Date().toISOString();
      st.by[id].by = by();
      /* Not attending: this person's offering decision goes with it, and
       * returning to attending never silently restores it — they are asked
       * again, from NOT DECIDED. */
      if (st.by[id].attend !== 'yes') { delete st.by[id].off; delete st.by[id].offering; }
      delete st.pair;   /* the retired couple decision never counts for anyone */
      write(st);
      sync();
    },
    /* v: 'yes' | 'no' | null — this guest's own decision, in their own name.
     * Refused unless the guest is eligible and attending. */
    setOffering: function (id, v) {
      if (!mine(id)) return false;
      if (!this.canOffer(id)) return false;
      var st = read();
      st.by = st.by || {};
      st.by[id] = st.by[id] || {};
      if (v === 'yes' || v === 'no') st.by[id].off = v; else delete st.by[id].off;
      st.by[id].offAt = new Date().toISOString();
      st.by[id].by = by();
      delete st.pair;
      write(st);
      sync();
      return true;
    },

    /* ---- derived party view --------------------------------------------- */
    attendees: function () {
      var self = this;
      return people().filter(function (g) { return self.attendingOf(g.guestId); });
    },
    /* every named guest has answered attendance, and every attending guest has
     * answered the Sangkhathan. Silence is never read as an answer. */
    /* every named guest has answered every active event, and every guest
     * coming to the temple has answered the Sangkhathan. Silence is never
     * read as an answer. */
    openFor: function (id) {
      var self = this;
      var missing = EVENTS.filter(function (e) { return self.eventOf(id, e.key) === null; })
        .map(function (e) { return e.label; });
      if (self.attendingOf(id) && !self.offeringDecidedOf(id)) missing.push('Sangkhathan');
      return missing;
    },
    decidedAll: function () {
      var self = this;
      return people().every(function (g) { return self.openFor(g.guestId).length === 0; });
    },
    undecided: function () {
      var self = this;
      return people().filter(function (g) { return self.openFor(g.guestId).length > 0; });
    },
    anyAttending: function () { return this.attendees().length > 0; },
    /* the guest, when they chose to take part */
    offeringGuests: function () {
      var self = this;
      return people().filter(function (g) { return self.offeringOf(g.guestId); });
    },
    offerings: function () { return this.offeringGuests().length; },

    /* the bag carries ONE line whose quantity is derived from the named
     * decisions — never a counter the guest nudges on its own */
    sync: function () { sync(); },

    /* what Guest Relations needs to prepare */
    operational: function () {
      var self = this;
      var elig = this.eligibility();
      var rows = people().map(function (g) {
        var a = self.attendanceOf(g.guestId), o = self.offeringOf_(g.guestId);
        var events = {};
        EVENTS.forEach(function (e) {
          var v = self.eventOf(g.guestId, e.key);
          events[e.key] = v === 'yes' ? 'Joining' : v === 'no' ? 'Not joining' : 'Not decided';
        });
        return {
          guestId: g.guestId,
          name: g.preferredName || g.fullName || 'You',
          answeredBy: ((read().by || {})[g.guestId] || {}).by || null,
          events: events,
          open: self.openFor(g.guestId),
          temple: a === 'yes' ? 'Attending' : a === 'no' ? 'Not attending' : 'Not decided',
          attending: a === 'yes',
          sangkhathan: o === 'yes',
          sangkhathanState: a !== 'yes' ? 'Not applicable'
            : elig === 'NONE' ? 'Not eligible'
            : elig !== 'ELIGIBLE' ? 'Not available yet'
            : o === 'yes' ? 'Selected' : o === 'no' ? 'Not selected' : 'Decision required'
        };
      });
      var n = this.offerings();
      return {
        guests: rows,
        /* eligibility as source truth */
        sangkhathanEligibility: elig || 'UNRESOLVED',
        attending: rows.filter(function (r) { return r.attending; }).length,
        notAttending: rows.filter(function (r) { return r.temple === 'Not attending'; }).length,
        undecided: rows.filter(function (r) { return r.temple === 'Not decided'; }).length,
        sangkhathanUndecided: rows.filter(function (r) { return r.sangkhathanState === 'Decision required'; }).length,
        offerings: n,
        offeringsUsd: n * 15,
        offeringNames: this.offeringGuests().map(function (g) { return g.preferredName || g.fullName; })
      };
    }
  };

  /* the ONE bag line — this guest's own offering, USD 15, quantity one */
  function sync() {
    if (!window.SIYL_BAG || !window.SIYL_PRICE) return;
    /* When the guest is not resolved — no invitation open, or a session that
     * predates the guest-scoped invitations — nothing is known. Silence is not
     * a cancellation: leave the journey exactly as the guest left it. */
    var G = window.SIYL_GUEST;
    if (G && !G.party()) return;
    var n = T.offerings() ? 1 : 0;
    if (!n) { if (SIYL_BAG.has('sangkhathan')) SIYL_BAG.remove('sangkhathan'); return; }
    var line = SIYL_PRICE.items('sangkhathan')[0];
    line.qty = 1;
    line.guests = T.offeringGuests().map(function (g) { return g.guestId; });
    var cur = SIYL_BAG.get().filter(function (x) { return x.id === 'sangkhathan'; })[0];
    if (!cur || cur.qty !== 1) SIYL_BAG.put(line);
  }

  /* an offering can never outlive the decision that allowed it */
  document.addEventListener('siyl:guest', sync);
  sync();
})();
