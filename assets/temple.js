/* ============================================================================
   SEE YOU IN LAOS — THE BUDDHIST MORNING.

   The Temple Ceremony is OPTIONAL, and the hosts need a reliable list: who is
   coming to the temple, who is not, and for whom a Sangkhathan offering has to
   be prepared. Two decisions, kept deliberately apart:

     ATTENDANCE   attend / not attending. Stored per invitation. It buys
                  nothing and it consumes no inventory.
     SANGKHATHAN  an optional personal offering, USD 15 per participating
                  named guest. E · ELIGIBILITY IS PAIR-BASED and EXPLICIT:
                  the invitation carries givingEligibility "PAIR" or "NONE";
                  anything else is unresolved and nothing is offered. It is
                  never derived from party size, names or wording. For an
                  eligible pair there is ONE couple decision — both named
                  guests take part, or neither — available only while every
                  named guest is attending the Temple Ceremony. It is a normal
                  journey line, priced by assets/pricing.js like everything
                  else, and deliberately absent from the room ledger.

   Tak Bat — the morning alms-giving, in which food is respectfully offered to
   Buddhist monks — is part of the Temple Ceremony. Guests attending are INVITED
   to take part. It is SELF-PAY (arranged by each guest on the morning; no
   amount is set here), never a cart product, never a fifth event, and never
   the same thing as the Sangkhathan: nobody may leave this website believing
   they paid USD 15 for the alms-giving.

   Three states per person, never two: NOT DECIDED is not NOT ATTENDING, and a
   guest who has not answered the Sangkhathan has not declined it.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.temple';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; }
    catch (e) { return {}; }
  }
  /* the active person — who is actually answering, for themselves or for
   * another named guest (C · ANSWERING FOR). Never the subject. */
  function by() {
    var G = window.SIYL_GUEST, w = G && G.who ? G.who() : null;
    return w ? w.activeGuestId : null;
  }
  function write(v) {
    localStorage.setItem(KEY, JSON.stringify(v));
    try { document.dispatchEvent(new CustomEvent('siyl:temple')); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  /* the named party, or a single anonymous stand-in before authentication */
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
    { key: 'temple', label: 'Temple Ceremony', when: '08:00 – 12:00',
      place: 'Wat Ong Teu, Vientiane' },
    { key: 'coffee', label: 'Coffee & Cake', when: 'From 12:00',
      place: 'Souphattra Heritage Vientiane' },
    { key: 'vows', label: 'Vow Ceremony', when: '16:30',
      place: 'Souphattra Heritage Vientiane' },
    { key: 'dinner', label: 'Wedding Dinner', when: '19:30',
      place: 'Souphattra Vientiane Hotel' }
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

    /* ---- E · SANGKHATHAN — one couple decision, explicit eligibility ---- */
    eligibility: function () {
      var G = window.SIYL_GUEST, p = G && G.party ? G.party() : null;
      return p && (p.givingEligibility === 'PAIR' || p.givingEligibility === 'NONE') ? p.givingEligibility : null;
    },
    /* the pair may take part only while EVERY named guest is attending */
    pairCan: function () {
      var self = this, list = people();
      return this.eligibility() === 'PAIR' && list.length > 0 &&
        list.every(function (g) { return self.attendingOf(g.guestId); });
    },
    pairDecision: function () {
      var st = read();
      return this.pairCan() && st.pair && (st.pair.off === 'yes' || st.pair.off === 'no') ? st.pair.off : null;
    },
    offeringOf: function (id) { return this.offeringOf_(id) === 'yes'; },
    /* 'yes' selected · 'no' continued without one · null not decided or not offered */
    offeringOf_: function (id) {
      if (!this.attendingOf(id)) return null;
      return this.pairDecision();
    },
    /* nothing to decide unless the pair is eligible and able */
    offeringDecidedOf: function (id) {
      if (!this.pairCan()) return true;
      return this.pairDecision() !== null;
    },

    setAttendance: function (id, v) {
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
      /* E · the couple decision depends on every named guest attending: when
       * one of them is not, the pair decision is removed — and it is never
       * restored silently when they return; the pair is asked again. */
      if (st.by[id].attend !== 'yes') delete st.pair;
      write(st);
      sync();
    },
    /* v: 'yes' | 'no' | null — the couple's ONE decision, recorded once for
     * both. Refused when the invitation is not an eligible pair or the pair
     * cannot take part yet. `id` is the named guest asking; it must belong to
     * the party. */
    setOffering: function (id, v) {
      if (!people().some(function (g) { return g.guestId === id; })) return false;
      if (!this.pairCan()) return false;
      var st = read();
      if (v === 'yes' || v === 'no') st.pair = { off: v, at: new Date().toISOString(), by: by() };
      else delete st.pair;
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
    /* every named guest of an eligible pair that chose to take part */
    offeringGuests: function () {
      var self = this;
      if (this.pairDecision() !== 'yes') return [];
      return people().filter(function (g) { return self.attendingOf(g.guestId); });
    },
    offerings: function () { return this.offeringGuests().length; },

    /* the bag carries ONE line whose quantity is derived from the named
     * decisions — never a counter the guest nudges on its own */
    sync: function () { sync(); },

    /* what Guest Relations needs to prepare */
    operational: function () {
      var self = this;
      var elig = this.eligibility(), can = this.pairCan(), pair = this.pairDecision();
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
            : elig !== 'PAIR' ? 'Not available yet'
            : !can ? 'Not applicable'
            : o === 'yes' ? 'Selected' : o === 'no' ? 'Not selected' : 'Decision required'
        };
      });
      var n = this.offerings();
      return {
        guests: rows,
        /* E · the couple decision, as source truth and as a state */
        sangkhathanEligibility: elig || 'UNRESOLVED',
        sangkhathanPair: elig === 'PAIR' ? (can ? (pair || 'Decision required') : 'Not applicable') : (elig === 'NONE' ? 'Not eligible' : 'Not available yet'),
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

  /* the ONE bag line, quantity = the number of named guests who chose it */
  function sync() {
    if (!window.SIYL_BAG || !window.SIYL_PRICE) return;
    /* When the party is not resolved — no invitation open, or a session that
     * predates the names — we do not know who chose anything. Silence is not a
     * cancellation: leave the journey exactly as the guest left it and wait
     * for the names to come back. */
    var G = window.SIYL_GUEST;
    if (G && !G.party()) return;
    var n = T.offerings();
    if (!n) { if (SIYL_BAG.has('sangkhathan')) SIYL_BAG.remove('sangkhathan'); return; }
    var line = SIYL_PRICE.items('sangkhathan')[0];
    line.qty = n;
    line.guests = T.offeringGuests().map(function (g) { return g.guestId; });
    var cur = SIYL_BAG.get().filter(function (x) { return x.id === 'sangkhathan'; })[0];
    if (!cur || cur.qty !== n) SIYL_BAG.put(line);
  }

  /* an offering can never outlive the decision that allowed it */
  document.addEventListener('siyl:guest', sync);
  sync();
})();
