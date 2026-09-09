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

  window.SIYL_TEMPLE = {
    ID: 'sangkhathan',

    /* 'yes' - 'no' - null (not yet decided) */
    attendance: function () { var v = read().attend; return v === 'yes' || v === 'no' ? v : null; },
    decided: function () { return this.attendance() !== null; },
    attending: function () { return this.attendance() === 'yes'; },

    setAttendance: function (v) {
      var st = read();
      st.attend = (v === 'yes' || v === 'no') ? v : null;
      st.at = new Date().toISOString();
      /* A guest who is not attending must never have an offering prepared for
       * them. The line is removed rather than parked, and coming back to
       * ATTEND does NOT quietly restore it - the guest chooses again. */
      if (st.attend !== 'yes' && window.SIYL_BAG) SIYL_BAG.remove('sangkhathan');
      write(st);
    },

    /* the offering: a normal bag line, never an admission */
    offerings: function () {
      if (!window.SIYL_BAG) return 0;
      var l = SIYL_BAG.get().filter(function (x) { return x.id === 'sangkhathan'; })[0];
      return l ? (l.qty || 1) : 0;
    },
    hasOffering: function () { return this.offerings() > 0; },
    addOffering: function (qty) {
      if (!this.attending() || !window.SIYL_PRICE || !window.SIYL_BAG) return false;
      SIYL_PRICE.items('sangkhathan').forEach(function (it) {
        it.qty = Math.max(1, parseInt(qty, 10) || 1);
        SIYL_BAG.put(it);
      });
      return true;
    },
    removeOffering: function () { if (window.SIYL_BAG) SIYL_BAG.remove('sangkhathan'); },

    /* what Guest Relations needs to prepare, in one line */
    operational: function () {
      var a = this.attendance(), n = this.offerings();
      return {
        temple: a === 'yes' ? 'Attending' : a === 'no' ? 'Not attending' : 'No decision yet',
        attending: a === 'yes',
        offerings: n,
        offeringsUsd: n * 15
      };
    }
  };

  /* an offering can never outlive the decision that allowed it */
  document.addEventListener('siyl:bag', function () {
    var T = window.SIYL_TEMPLE;
    if (T && !T.attending() && window.SIYL_BAG && SIYL_BAG.has('sangkhathan')) SIYL_BAG.remove('sangkhathan');
  });
})();
