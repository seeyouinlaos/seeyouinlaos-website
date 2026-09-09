/* ============================================================================
   SEE YOU IN LAOS — THE BUDDHIST MORNING.

   The Temple Ceremony is OPTIONAL, and the hosts need a reliable list: who is
   coming to the temple, who is not, and for whom a Sangkhathan offering has to
   be prepared. Two decisions, kept deliberately apart:

     ATTENDANCE   attend / not attending. Stored per invitation. It buys
                  nothing and it consumes no inventory.
     SANGKHATHAN  an optional personal offering, USD 15 per guest, only ever
                  offered to a guest who is attending. It is a normal journey
                  line, priced by assets/pricing.js like everything else — and
                  it is deliberately absent from the room ledger: an offering
                  is not a bed and has no capacity.

   Tak Bat — the morning alms-giving of food — is part of the ceremony for
   everyone who attends. It is never a product and never has a price.
   ========================================================================== */
(function () {
  'use strict';
  var KEY = 'siyl.temple';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null') || {}; }
    catch (e) { return {}; }
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

  var T = window.SIYL_TEMPLE = {
    ID: 'sangkhathan',
    people: people,
    nameOf: nameOf,

    /* ---- PER NAMED GUEST. The party-wide reading is derived, never stored. */
    attendanceOf: function (id) {
      var v = (read().by || {})[id];
      return v && (v.attend === 'yes' || v.attend === 'no') ? v.attend : null;
    },
    attendingOf: function (id) { return this.attendanceOf(id) === 'yes'; },
    offeringOf: function (id) { return !!((read().by || {})[id] || {}).offering; },

    setAttendance: function (id, v) {
      var st = read();
      st.by = st.by || {};
      st.by[id] = st.by[id] || {};
      st.by[id].attend = (v === 'yes' || v === 'no') ? v : null;
      st.by[id].at = new Date().toISOString();
      /* Not attending: this person's offering goes, and returning to attending
       * never silently restores it — they are asked again. */
      if (st.by[id].attend !== 'yes') delete st.by[id].offering;
      write(st);
      sync();
    },
    setOffering: function (id, on) {
      var st = read();
      st.by = st.by || {};
      st.by[id] = st.by[id] || {};
      if (!on) delete st.by[id].offering;
      else if (st.by[id].attend === 'yes') st.by[id].offering = { at: new Date().toISOString() };
      write(st);
      sync();
    },

    /* ---- derived party view --------------------------------------------- */
    attendees: function () {
      var self = this;
      return people().filter(function (g) { return self.attendingOf(g.guestId); });
    },
    decidedAll: function () {
      var self = this;
      return people().every(function (g) { return self.attendanceOf(g.guestId) !== null; });
    },
    anyAttending: function () { return this.attendees().length > 0; },
    offeringGuests: function () {
      var self = this;
      return people().filter(function (g) { return self.attendingOf(g.guestId) && self.offeringOf(g.guestId); });
    },
    offerings: function () { return this.offeringGuests().length; },

    /* the bag carries ONE line whose quantity is derived from the named
     * decisions — never a counter the guest nudges on its own */
    sync: function () { sync(); },

    /* what Guest Relations needs to prepare */
    operational: function () {
      var self = this;
      var rows = people().map(function (g) {
        var a = self.attendanceOf(g.guestId);
        return {
          guestId: g.guestId,
          name: g.preferredName || g.fullName || 'You',
          temple: a === 'yes' ? 'Attending' : a === 'no' ? 'Not attending' : 'No decision yet',
          attending: a === 'yes',
          sangkhathan: self.offeringOf(g.guestId)
        };
      });
      var n = this.offerings();
      return {
        guests: rows,
        attending: rows.filter(function (r) { return r.attending; }).length,
        notAttending: rows.filter(function (r) { return r.temple === 'Not attending'; }).length,
        undecided: rows.filter(function (r) { return r.temple === 'No decision yet'; }).length,
        offerings: n,
        offeringsUsd: n * 15,
        offeringNames: this.offeringGuests().map(function (g) { return g.preferredName || g.fullName; })
      };
    }
  };

  /* the ONE bag line, quantity = the number of named guests who chose it */
  function sync() {
    if (!window.SIYL_BAG || !window.SIYL_PRICE) return;
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
