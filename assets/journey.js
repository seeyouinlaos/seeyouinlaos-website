/* See You In Laos — the journey decision model.
 *
 * Display + decision only. It never calculates a price: every amount on every
 * surface still comes from SIYL_BAG (one calculation truth). What this file adds:
 *   · the chronological arc of the guest's own journey (Bangkok → … → Bangkok)
 *   · the category and the price basis for each product, so a guest never has to
 *     ask "per person? per night? for two?"
 *   · explicit decisions: a stage is answered when it is selected OR when the
 *     guest says they are not joining that stage. Unanswered is never declined.
 */
(function () {
  'use strict';
  var SKIP = 'siyl.skip';

  /* Chronological stages of the shared journey. `ids` are the bag ids that
   * answer the stage (a stage can be answered by an alternative product). */
  var SEG = [
    { key: 'bkk-stay', when: '21 – 24 FEB', cat: 'Accommodation', place: 'Bangkok',
      label: 'Bangkok · Before the Wedding', ids: ['bkk-stay'], anchor: 'j-bkk-stay', bookend: 'open' },
    { key: 'train', when: '24 – 25 FEB', cat: 'Transportation', place: 'Bangkok → Vientiane',
      label: 'Special Express No. 25', ids: ['train'], anchor: 'j-train' },
    { key: 'prewed', when: '25 – 27 FEB', cat: 'Accommodation', place: 'Vientiane',
      label: 'Pre-Wedding Vientiane', ids: ['prewed'], anchor: 'j-prewed' },
    /* ONE wedding stay selection: the Souphattra or the Guest House complimentary (the Riverside was retired 23 Sep 2026) */
    { key: 'wedstay', when: '27 FEB – 01 MAR', cat: 'Accommodation', place: 'Vientiane',
      label: 'Wedding Stay', ids: ['wedstay', 'guesthouse'], anchor: 'j-wedstay' },
    { key: 'mu9646', when: '01 MAR', cat: 'Transportation', place: 'Vientiane → Kunming',
      label: 'MU9646', ids: ['mu9646'], anchor: 'j-mu9646' },
    { key: 'kmg', when: '01 – 04 MAR', cat: 'Accommodation', place: 'Kunming',
      label: 'Wanxiang Yueju', ids: ['kmg'], anchor: 'j-kmg' },
    { key: 'c86', when: '04 MAR', cat: 'Transportation', place: 'Kunming → Lijiang',
      label: 'C86', ids: ['c86'], anchor: 'j-c86' },
    { key: 'ljg', when: '04 – 06 MAR', cat: 'Accommodation', place: 'Lijiang',
      label: 'Luye Baisha', ids: ['ljg'], anchor: 'j-ljg' },
    { key: 'return', when: '06 MAR', cat: 'Transportation', place: 'Lijiang → Bangkok',
      label: 'MU5922 + MU741', ids: ['return'], anchor: 'j-return' },
    { key: 'kempinski', when: '06 – 08 MAR', cat: 'Accommodation', place: 'Bangkok',
      label: 'Siam Kempinski Bangkok', ids: ['kempinski'], anchor: 'j-kempinski', bookend: 'close' }
  ];

  /* Chronological position of a line that is not itself a stage.
   * THE WEDDING happens on Sunday, 28 February 2027 — inside the Wedding Stay
   * (27 FEB – 01 MAR) and before the flight to Kunming. A wedding line
   * therefore sorts between wedstay (3) and mu9646 (4); it is never appended
   * to the end of the journey because it happens to have been added last. */
  /* the Highlights (20 Sep 2026): Sühring on the first evening (before the Bangkok stay, 0.1), Baan Phraya in the Bangkok days
     (0.3), the Aman tea on the last afternoon (0.5), Cannubi on the return, after the flight home (8.5) */
  var AT = { suhring: 0.1, baanphraya: 0.3, '1872': 0.5, tea1872: 0.5, 'sangkhathan': 3.5, cannubi: 8.5 };
  /* the dated extras (the current Operations Master, 19 Sep 2026): the Aman tea on the afternoon of 24 February, the
     Sühring dinner on the first evening, 21 February */
  var AT_WHEN = { '1872': '24 FEB', tea1872: '24 FEB', 'sangkhathan': '28 FEB', 'suhring': '21 FEB', baanphraya: '23 FEB', cannubi: '07 MAR' };

  /* the wedding programme, in the order the day itself runs. Only items that
   * exist as products carry an id; the day is described, not invented. */
  var WEDDING = [
    { key: 'temple', title: 'Temple Ceremony', when: '09:00 – approximately 12:00',
      place: 'Wat Ong Teu, Vientiane',
      note: 'Guests attending are welcome to take part in Tak Bat, the morning alms-giving — a personal offering, arranged individually on the morning.',
      anchor: 'voyage.html#temple' },
    { key: 'sangkhathan', title: 'Sangkhathan Temple Offering', when: 'Within the Temple Ceremony',
      place: 'Wat Ong Teu, Vientiane', id: 'sangkhathan',
      note: 'Optional · USD 15 per guest · a personal offering.',
      anchor: 'voyage.html#sangkhathan' },
    { key: 'coffee', title: 'Coffee & Cake', when: 'From 12:00',
      place: 'Souphattra Heritage Vientiane',
      note: 'Complimentary — hosted by Haruthai & Suthep.', anchor: 'voyage.html#coffee' },
    { key: 'vows', title: 'Vow Ceremony', when: '15:30',
      place: 'Souphattra Heritage Vientiane',
      note: 'Complimentary — hosted by Haruthai & Suthep.', anchor: 'voyage.html#vows' },
    { key: 'dinner', title: 'Wedding Dinner', when: '19:30',
      place: 'Souphattra Heritage Vientiane · poolside',
      note: 'Complimentary — hosted by Haruthai & Suthep.', anchor: 'voyage.html#dinner' }
  ];

  /* WHERE WILL YOU JOIN US (Owner, 21 Sep 2026 · the global My Trip rebuild): the ONE stage graph (assets/stage-graph.js)
   * says which stage belongs to which scope and when a connector is required. A stage whose scope the guest does not join
   * is not part of their trip: never asked, never counted, never held. */
  var EXTRA_SCOPE = { '1872': ['bangkok'], tea1872: ['bangkok'], suhring: ['bangkok'], baanphraya: ['bangkok'], cannubi: ['bangkok'], sangkhathan: ['vientianeWedding'] };
  function scope() { var G = window.SIYL_GUEST; return G && G.scope ? G.scope() : null; }
  function joinsAll(dests) { var s = scope(); if (!s) return true; if (s.none) return false; return dests.every(function (d) { return s[d]; }); }
  function relevantKey(key) { var GR = window.SIYL_GRAPH; if (GR && GR.isRelevant) return GR.isRelevant(key, scope()); return joinsAll([]); }

  function skipped() {
    try { return JSON.parse(localStorage.getItem(SKIP) || '[]'); } catch (e) { return []; }
  }
  function setSkipped(a) {
    localStorage.setItem(SKIP, JSON.stringify(a));
    try { document.dispatchEvent(new CustomEvent('siyl:bag')); } catch (e) {}
  }

  window.SIYL_JOURNEY = {
    SEGMENTS: SEG,
    /* the sheet a stage sits under on My Trip (the graph's) */
    sheetOf: function (seg) { var GR = window.SIYL_GRAPH, st = GR && GR.stageOf ? GR.stageOf(seg.key) : null; return st ? st.sheet : ''; },
    /* is this stage part of the guest's trip (an unanswered scope keeps every stage, so nothing disappears before the guest has spoken) */
    relevant: function (seg) { return relevantKey(seg.key); },
    /* the state of every stage, as the graph reads it */
    states: function () { var self = this, out = {}; SEG.forEach(function (s) { out[s.key] = self.state(s); }); return out; },
    relevantSegments: function () { var self = this; return SEG.filter(function (s) { return self.relevant(s); }); },
    excludedSegments: function () { var self = this; return SEG.filter(function (s) { return !self.relevant(s); }); },
    /* is a Bag line part of the guest's trip: by its stage, else by what it is */
    lineRelevant: function (x) {
      var seg = SEG.filter(function (s) { return s.ids.indexOf(x.id) >= 0; })[0];
      if (seg) return this.relevant(seg);
      if (EXTRA_SCOPE[x.id]) return joinsAll(EXTRA_SCOPE[x.id]);
      if (x.interest) return joinsAll(['vientianeWedding']) || joinsAll(['vientianePreWedding']);
      return true;
    },
    /* NOT JOINING THIS STAGE, in one action (Owner, 18 Sep 2026): whatever the guest holds or chose in the stage is released
     * first — a room through the engine, a line through the Bag — and the stage is then declined. From an untouched stage
     * it is the same one action. Resolves once the stage reads as declined. */
    decline: function (seg) {
      var self = this, B = window.SIYL_BAG, ST = window.SIYL_STAY, P = window.SIYL_PRICE, U = window.SIYL_UNITS;
      var finish = function () { self.skip(seg.key, true, 'manual'); return { ok: true }; };
      if (!B) return Promise.resolve(finish());
      /* a stage the guest waits for: the waiting-list place is given back first (the engine's), then the stage is declined */
      if (U && U.unwait && U.waitlisted && (!U.ready || !U.ready() || U.waitlisted(seg.key)) && seg.cat === 'Accommodation' && !self._unwaited) {
        /* the engine decides (an unread engine is asked too — the line must never linger behind a decline) */
        self._unwaited = true;
        var clear = function (x) { self._unwaited = false; return x; };
        return U.unwait(seg.key).then(function (r) {
          if (r && r.ok === false && r.error !== 'invalid stage') return clear(r);
          return Promise.resolve(self.decline(seg)).then(clear, function (e) { clear(); throw e; });
        }, function () { return clear({ ok: false, error: 'unreachable' }); });
      }
      var lines = B.get().filter(function (x) { return seg.ids.indexOf(x.id) >= 0; });
      /* a party member who holds nothing here but whose party keeps a place for them gives it back through the engine */
      if (!lines.length && seg.cat === 'Accommodation' && U && U.ready && U.ready() && U.partyPlaceIn && U.partyPlaceIn(seg.key) && U.leave) {
        return U.leave(seg.key).then(function () { return finish(); }, function () { return finish(); });
      }
      if (!lines.length) return Promise.resolve(finish());
      var stays = lines.filter(function (x) { return x.room && !x.interest; });
      if (seg.cat === 'Accommodation' && stays.length && ST) {
        /* every room line of the stage goes through the engine, one after the other: a leftover line simply leaves, the
           held one releases its place (Codex, release 012) */
        var i = 0;
        var next = function () {
          if (i >= stays.length) { lines.forEach(function (x) { B.remove(x.id); }); return finish(); }
          var stay = stays[i++];
          return ST.remove(P ? P.windowOf(stay.id) : stay.id).then(function (r) {
            if (r && r.ok === false) return r;     /* the engine could not release: nothing changes, the guest is told */
            return next();
          });
        };
        return next();
      }
      lines.forEach(function (x) { B.remove(x.id); });
      return Promise.resolve(finish());
    },

    /* display metadata for a bag line — category eyebrow + price basis.
     * The wording comes from SIYL_PRICE: one calculation, one vocabulary. */
    meta: function (x) {
      var P = window.SIYL_PRICE;
      if (x.interest && x.id !== 'guesthouse') return { cat: 'Wellness', basis: 'Interest · Marsilea Spa confirms the time · payable at the spa', unit: 'treatment' };
      if (!P) return { cat: '', basis: '', unit: 'guest' };
      var f = P.FLAT[x.id];
      if (f) {
        /* a product with approved classes states the basis of the class the
         * guest actually chose — never the preferred class's */
        var c = x.cls && P.classOf ? P.classOf(x.id, x.cls) : null;
        /* a house with several menus (the Highlights, 20 Sep 2026): the basis of the menu the guest chose */
        var mn = x.menu && P.menuOf ? P.menuOf(x.id, x.menu) : null;
        return { cat: f.cat, basis: (c && c.basis) || (mn && mn.basis) || f.basis, unit: f.unit || 'guest' };
      }
      var at = P.locate(x.id);
      if (at) return { cat: 'Accommodation', basis: P.lineBasis(x), unit: 'guest' };
      return { cat: '', basis: '', unit: 'guest' };
    },

    /* "USD 100 per person" / "1 experience · for two guests" — one guest, one line */
    quantityLine: function (x) {
      var m = this.meta(x), q = x.qty || 1;
      if (x.interest) return '';
      if (x.price == null) return '';
      if (x.complimentary) return 'Complimentary';
      if (m.unit === 'experience') {
        return q + (q === 1 ? ' experience · for two guests' : ' experiences · for ' + (q * 2) + ' guests');
      }
      return 'USD ' + x.price + ' per person · your cost';
    },

    /* the bag reads like an itinerary: chronological position of a line */
    when: function (x) {
      var seg = SEG.filter(function (s) { return s.ids.indexOf(x.id) >= 0; })[0];
      if (seg) return seg.when;
      return AT_WHEN[x.id] || '';
    },

    /* THE WEDDING is one programme, not a scatter of lines */
    WEDDING: WEDDING,
    isWedding: function (x) {
      var m = this.meta(x);
      return m.cat === 'Wedding programme';
    },
    order: function (x) {
      if (AT[x.id] != null) return AT[x.id];
      for (var i = 0; i < SEG.length; i++) if (SEG[i].ids.indexOf(x.id) >= 0) return i;
      return 99;
    },
    sorted: function (list) {
      var self = this;
      return list.slice().sort(function (a, b) { return self.order(a) - self.order(b); });
    },

    isSkipped: function (key) { return skipped().indexOf(key) >= 0; },
    /* who said "not joining": the guest (manual) or a preset (cost). A preset
     * may be revised by another preset; a guest's own word is never touched. */
    skippedBy: function (key) { try { return (JSON.parse(localStorage.getItem(SKIP + '.by') || '{}'))[key] || 'manual'; } catch (e) { return 'manual'; } },
    skip: function (key, on, by) {
      var a = skipped(), i = a.indexOf(key);
      if (on && i < 0) a.push(key);
      if (!on && i >= 0) a.splice(i, 1);
      var m = {}; try { m = JSON.parse(localStorage.getItem(SKIP + '.by') || '{}'); } catch (e) { m = {}; }
      if (on) m[key] = by || 'manual'; else delete m[key];
      try { localStorage.setItem(SKIP + '.by', JSON.stringify(m)); } catch (e) {}
      setSkipped(a);
    },
    /* was this stage answered by the guest's own hand — a choice or a "not
     * joining" — rather than filled by a preset? */
    manual: function (seg) {
      var B = window.SIYL_BAG, items = B ? B.get().filter(function (x) { return seg.ids.indexOf(x.id) >= 0; }) : [];
      if (items.length) return items.every(function (x) { return !x.by; });
      return this.isSkipped(seg.key) && this.skippedBy(seg.key) === 'manual';
    },

    /* answered = selected, or the guest said they are not joining this stage, or the guest waits for it (the waiting list) */
    state: function (seg) {
      var has = window.SIYL_BAG && SIYL_BAG.get().some(function (x) { return seg.ids.indexOf(x.id) >= 0; });
      if (has) return 'selected';
      if (this.isSkipped(seg.key)) return 'declined';
      if (this.waitlisted(seg)) return 'waitlisted';
      return 'open';
    },
    /* the stages still to answer — of the guest's own trip only */
    open: function () {
      var self = this;
      return SEG.filter(function (s) { return self.relevant(s) && self.state(s) === 'open'; });
    },
    /* THE PACKAGES ARE GONE (Owner, 21 Sep 2026): one booking model for every guest — the scopes, the stage graph, each
       required component chosen. The party's need for one unit stays the engine's fact. */
    /* the places the guest's party needs in one unit */
    partySize: function () {
      var G = window.SIYL_GUEST, p = G && G.party ? G.party() : null, n = p && Array.isArray(p.members) ? p.members.length : 0;
      /* a page without the guest module (the room page, The Journey) reads the party from the session itself */
      if (!n) { try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); n = a && Array.isArray(a.members) ? a.members.length : 1; } catch (e) { n = 1; } }
      return Math.max(1, Math.min(6, n || 1));
    },
    /* ======================================================================
       THE CANONICAL COUNTS (Owner, 19 Sep 2026): one derived state, tested by its invariants —
         relevant = confirmed + waitlisted + declined + open;  excluded is outside relevant;
         bagItems = the Bag's actual lines;  bagTotal = their chargeable sum (a waitlisted stage contributes nothing)
       ====================================================================== */
    counts: function () {
      var self = this, B = window.SIYL_BAG, c = { relevant: 0, confirmed: 0, waitlisted: 0, declined: 0, open: 0, excluded: 0, resolved: 0, bagItems: 0, bagTotal: 0 };
      SEG.forEach(function (seg) {
        if (!self.relevant(seg)) { c.excluded++; return; }
        c.relevant++;
        var st = self.state(seg);
        if (st === 'selected') c.confirmed++; else if (st === 'waitlisted') c.waitlisted++; else if (st === 'declined') c.declined++; else c.open++;
      });
      c.resolved = c.confirmed + c.waitlisted + c.declined;
      /* bagTotal = the chargeable lines of the guest's own trip (a line outside the scope is named by readiness and released; it is not a cost) */
      if (B) { var lines = B.get(); c.bagItems = lines.length; c.bagTotal = lines.filter(function (x) { return self.lineRelevant(x); }).reduce(function (t, x) { return t + (x.price || 0) * (x.qty || 1); }, 0); }
      return c;
    },
    /* the stage the guest waits for, as the engine knows it */
    /* the engine's word; before it has answered, the device's memory of the line (assets/rooms.js) — a waitlisted stage is answered, never "still to choose" */
    waitlisted: function (seg) { var U = window.SIYL_UNITS; return !!(U && U.waitlisted && U.waitlisted(seg.key)); },
    waitPosition: function (seg) { var U = window.SIYL_UNITS, w = U && U.waitlisted ? U.waitlisted(seg.key) : null; return w ? w.position : null; },

    /* quiet editorial status line — never a progress meter */
    statusLine: function () {
      var c = this.counts();
      if (!c.open) return c.waitlisted ? (c.waitlisted === 1 ? 'One stage on the waiting list.' : c.waitlisted + ' stages on the waiting list.') : 'Your trip is ready.';
      return c.open === 1 ? 'One detail left to choose.' : c.open + ' details to choose.';
    },
    /* the words of the trip's composition, derived — never a count invented to fill a sentence */
    countsWords: function () {
      var c = this.counts(), w = [];
      if (c.confirmed) w.push(c.confirmed + (c.confirmed === 1 ? ' stage chosen' : ' stages chosen'));
      if (c.waitlisted) w.push(c.waitlisted + ' on the waiting list');
      if (c.declined) w.push(c.declined + ' not joining');
      if (c.open) w.push(c.open + ' still open');
      return w.join(' · ') + (c.relevant ? ' — of the ' + c.relevant + (c.relevant === 1 ? ' stage' : ' stages') + ' of your trip' : '');
    }
  };
})();
