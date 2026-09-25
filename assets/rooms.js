/* ============================================================================
   SEE YOU IN LAOS — YOUR ROOM, on the guest side (Owner decision, 14 Sep 2026).

   The room engine lives on the server (one Durable Object, "rooms"): every
   category of every stay is a set of persistent allocation units — ROOM A,
   ROOM B, ROOM C … — with two guest places each. This file is its window:
   it reads the units and who is in them (first names, for an authenticated
   guest), shows availability honestly, and asks the server — never itself —
   to hold a place in the guest's own name the moment the guest chooses one.

   Two rules govern every failure:
     · DISPLAY fails open. If the engine cannot be read the site shows no
       occupancy; it never invents a free place and never blocks browsing.
     · A PLACE fails closed on a real answer. A 409 from the engine means the
       room filled first; the guest keeps whatever they had, and chooses again.

   The bag, the pricing engine and the invitation gate are untouched: a stay
   line in the journey carries the unit the guest holds (`unit`), and the
   engine is the only truth about that.
   ========================================================================== */
(function () {
  'use strict';
  var ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  /* the Worker's own origin and a local `wrangler dev` answer at the same path; any other host (a stage) asks the Worker */
/* SAME ORIGIN, WHATEVER THE HOSTNAME (24 Sep 2026): the pages and the API are served by the one Worker on every hostname it answers
     (workers.dev and seeyouinlaos.com), so every call stays on the page's own origin — the absolute workers.dev address belonged to
     a retired second copy of the site, and from seeyouinlaos.com it became a cross-origin request the browser refused (the photo, and every save). */
  var API = '/api/rooms';

  var view = null, loading = null, lastError = null;
  var STAGE_OF = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', guesthouse: 'wedstay', stayext: 'stayext', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };

  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function headers(json) {
    var a = auth(), h = {};
    if (json) h['content-type'] = 'application/json';
    if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
    return h;
  }
  function keyOf(win, slug) { return String(win) + '/' + String(slug); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:units')); } catch (e) {} }
  /* THE LINE THIS DEVICE KNOWS OF (release 014): the stages the guest waits for, as the engine last said — read only while the
     engine has not answered yet, so a waitlisted stage never reads as "still to choose" on a slow network; the engine's
     answer replaces it whole; the clean reset drops it with the rest of the cached journey */
  var WAIT_KEY = 'siyl.wait';
  var seq = 0;   /* the order of reads and writes: only the latest answer becomes the view */
  function waitCache() { try { var v = JSON.parse(localStorage.getItem(WAIT_KEY) || 'null'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } }
  function rememberWaits(v) { try { var out = {}; Object.keys(v && v.waitlist || {}).forEach(function (k) { out[k] = { at: v.waitlist[k].at, size: v.waitlist[k].size }; }); if (Object.keys(out).length) localStorage.setItem(WAIT_KEY, JSON.stringify(out)); else localStorage.removeItem(WAIT_KEY); } catch (e) {} }
  /* FIRST NAMES ONLY (PRQ-GAP-02 · GAP-082): the engine names every occupant by the register's first name the Worker verified;
     no name is sent from here any more. The viewer is "You", an unknown guest "A guest", a place kept for a party no one. */
  var NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];
  function numWord(n) { return NUM[n] || String(n); }
  function cap(t) { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); }
  function firstWord(t) { return String(t || '').trim().split(/\s+/)[0] || ''; }
  /* "you" · "you and Ada" · "you, Ada and Ben" */
  function andJoin(list) { return list.length <= 1 ? (list[0] || '') : list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1]; }
  function whoOf(o) { return !o || o.placeholder ? '' : (o.mine ? 'You' : (firstWord(o.name) || 'A guest')); }
  /* the members of the viewer's party who hold no place in a stage yet — the people a kept place is for (their first names) */
  function absentMembers(stage) {
    var a = auth(), members = a && Array.isArray(a.members) ? a.members : [];
    var here = [];
    Object.keys((view && view.units) || {}).forEach(function (key) {
      if (U.stageOf(key) !== stage) return;
      view.units[key].forEach(function (u) { u.occupants.forEach(function (o) { if (o.party && !o.placeholder && !o.mine) here.push(firstWord(o.name)); }); });
    });
    return members.filter(function (m) { return m && m.guestId !== (a && a.guestId); }).map(function (m) { return firstWord(m.preferredName); })
      .filter(function (n) { if (!n) return false; var i = here.indexOf(n); if (i >= 0) { here.splice(i, 1); return false; } return true; });
  }

  var U = window.SIYL_UNITS = {
    API: API,
    ready: function () { return view !== null; },
    error: function () { return lastError; },
    view: function () { return view; },
    /* a view handed in by a test or a migration script — never by a page */
    _set: function (v) { view = v; lastError = null; },
    stageOf: function (key) { var w = String(key || '').split('/')[0]; return STAGE_OF[w] || w; },

    load: function (force) {
      if (loading && !force) return loading;
      var a = auth(), my = ++seq;
      loading = fetch(API + (a && a.invitationId ? '?invitation=' + encodeURIComponent(a.invitationId) : ''), { cache: 'no-store', headers: headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok) throw new Error('rooms unavailable'); if (my < seq) return view || d;   /* a read superseded by a later one (or by a write's answer) never overwrites it */ view = d; lastError = null; rememberWaits(d); announce(); return d; })
        .catch(function (e) { lastError = String(e && e.message || e); announce(); return null; })
        .then(function (v) { loading = null; return v; });
      return loading;
    },

    /* the units of one category, as the engine sees them for this guest */
    tracked: function (win, slug) { return !!(view && view.units && view.units[keyOf(win, slug)]); },
    units: function (win, slug) { return view && view.units ? (view.units[keyOf(win, slug)] || []) : []; },
    summary: function (win, slug) { return view && view.summary ? (view.summary[keyOf(win, slug)] || null) : null; },
    /* the place this guest holds for a stage: { key, label } | null */
    /* the guest's own hold in a stage — nothing is arranged for anyone in advance (Owner, 19 Sep 2026: no fixed arrangement) */
    mine: function (stage) { return view && view.mine ? (view.mine[stage] || null) : null; },
    /* kept as names for older readers: no stage is ever fixed */
    fixedUnit: function () { return null; },
    fixed: function () { return false; },
    fixedStages: function () { return []; },
    /* THE WAITING LIST: the guest's own entry for a stage ({ at, position, size, wanted }) and every stage's length */
    waitlisted: function (stage) { if (view && view.waitlist) return view.waitlist[stage] || null; var c = waitCache()[stage]; return auth() && c ? { at: c.at, position: null, size: c.size || 1, wanted: [], cached: true } : null; },
    waitlistedStages: function () { return view && view.waitlist ? Object.keys(view.waitlist) : (auth() ? Object.keys(waitCache()) : []); },
    waiting: function (stage) { return view && view.waiting ? (view.waiting[stage] || 0) : 0; },
    mineFor: function (win, slug) { var m = this.mine(this.stageOf(keyOf(win, slug))); return m && m.key === keyOf(win, slug) ? m : null; },
    /* PARTY CAPACITY (Owner, 19 Sep 2026): can this unit still take `need` places for the guest's party — the members already
       in it count; a unit is never partially booked */
    fitsParty: function (win, slug, u, need) {
      if (!u) return false;
      if (this.mineFor(win, slug) && this.mineFor(win, slug).label === u.label) return true;
      need = need || 1;
      /* the party members already here count for the party; a place KEPT for the party (the engine's party place) is the guest's to take */
      var here = u.occupants.filter(function (o) { return o.party && !o.mine && !o.placeholder; }).length;
      var kept = u.occupants.filter(function (o) { return o.party && o.placeholder; }).length;
      if (need <= u.places) return u.free + kept >= Math.max(1, need - here);
      /* a party larger than a unit: a place here for this guest, and enough places across the category for the rest */
      if (u.free + kept < 1) return false;
      var list = this.units(win, slug), catFree = 0, catParty = 0;
      list.forEach(function (x) { catFree += x.free + x.occupants.filter(function (o) { return o.party && o.placeholder; }).length; catParty += x.occupants.filter(function (o) { return o.party && !o.mine && !o.placeholder; }).length; });
      return catFree >= Math.max(1, need - catParty);
    },
    /* does the guest's party keep a place for them in a unit of this stage (a place their party member took for them)? */
    partyPlaceIn: function (stage) {
      var self = this, units = view && view.units ? view.units : {};
      return Object.keys(units).some(function (key) { return self.stageOf(key) === stage && units[key].some(function (u) { return u.occupants.some(function (o) { return o.placeholder && o.party; }); }); });
    },
    /* the first unit of a category that takes the party (a unit a party member already holds first), or null */
    unitForParty: function (win, slug, need) {
      var self = this, list = this.units(win, slug);
      var withParty = list.filter(function (u) { return u.occupants.some(function (o) { return o.party && !o.mine; }) && self.fitsParty(win, slug, u, need); })[0];
      return withParty || list.filter(function (u) { return u.eligible && self.fitsParty(win, slug, u, need); })[0] || null;
    },
    /* free places a guest may take in this category */
    free: function (win, slug) { var s = this.summary(win, slug); return s ? s.free : null; },
    /* every room is open to every guest (Owner, 15 Sep 2026); kept for readers of the old rule */
    eligible: function (win, slug) { return this.units(win, slug).length > 0; },
    fits: function (win, slug) {
      if (!this.tracked(win, slug)) return true;
      if (this.mineFor(win, slug)) return true;
      /* a unit full only by a place kept for this guest's party is theirs to join (PRQ-03-01) */
      return this.units(win, slug).some(function (u) { return u.eligible && (!u.full || u.occupants.some(function (o) { return o.placeholder && o.party; })); });
    },
    /* the places a booking of this stage takes (SIYL_JOURNEY.partySize — the guest and the party members who travel in it, 1–6) */
    need: function (stage) { var J = window.SIYL_JOURNEY; if (J && J.partySize) return J.partySize(stage); var D = window.SIYL_DRAFT, k = stage && D && D.partyNeed ? D.partyNeed(this.stageOf(stage)) : null; if (k) return k; var a = auth(); var n = a && Array.isArray(a.members) ? a.members.length : 1; return Math.max(1, Math.min(6, n || 1)); },
    /* can this category take the guest's WHOLE party (Owner, 19 Sep 2026)? — the one question every Choose button asks */
    canTake: function (win, slug, need) {
      need = need || this.need(win);
      if (!this.tracked(win, slug)) return true;
      if (this.mineFor(win, slug)) return true;
      return need > 1 ? !!this.unitForParty(win, slug, need) : this.fits(win, slug);
    },
    /* SOLD OUT is the engine's word alone: remainingPlaces === 0 — never "this guest may not choose here" */
    /* …and a place kept for the viewer's party is theirs: never "Sold out" for them (PRQ-03-01) */
    soldOut: function (win, slug) { if (this.keptForMe(win, slug)) return false; var s = this.summary(win, slug); return this.tracked(win, slug) && !!s && s.soldOut === true; },
    /* the whole category is the Master's reservation (no room this guest may take) */
    reserved: function () { return false; },   /* nothing is reserved for anyone (Owner, 19 Sep 2026) */
    /* the unit to suggest: a unit a party member already holds with a place
     * free, else the first unit with a place free */
    suggest: function (win, slug) {
      /* a unit that is full only by the place kept for this guest's party is theirs to join */
      var list = this.units(win, slug).filter(function (u) { return u.eligible && (!u.full || u.occupants.some(function (o) { return o.placeholder && o.party; })); });
      var withParty = list.filter(function (u) { return u.occupants.some(function (o) { return o.party && !o.mine; }); })[0];
      return withParty || list[0] || null;
    },
    /* THE ONE COUNTING GRAMMAR (TO-01208 · PRQ-03-09 · PRQ-03-01) — the journeys row, the room page and the Other rooms
     * cards read this one sentence, rendered from the engine's canonical availability object (never a second calculation):
     * "left" counts inventory (EMPTY rooms), "free" describes a room, never "available".
     *   "{E} of {N} rooms left" · "… · 1 free place in a shared room" / "… · {S} free places in shared rooms"
     *   "No empty room left · {S} free places in shared rooms" · "One room only · free" · "One room only · 1 place free"
     *   "Sold out" · "Held for you · Room A" · "A place is kept for you · Room A" · Guest House "{r} of {m} places left" */
    label: function (win, slug) {
      var s = this.summary(win, slug);
      if (!s) return '';
      var list = this.units(win, slug), mine = this.mineFor(win, slug);
      if (mine) return 'Held for you · ' + this.unitName(list.filter(function (u) { return u.label === mine.label; })[0] || { kind: 'room', label: mine.label });
      /* a place a party member kept is the viewer's own: it is never counted as gone */
      var kept = this.keptForMe(win, slug);
      if (kept) return 'A place is kept for you · ' + this.unitName(kept);
      /* THE COMPLIMENTARY ALLOCATION (Owner, 22 Sep 2026 · four places, Edit 7): "{r} of {m} places left", "All four places
         are taken", "Closed on 30 November 2026" — the one stay plan's words */
      var P = window.SIYL_STAY_PLAN;
      if (P && keyOf(win, slug) === P.COMPLIMENTARY.key) return P.complimentaryWords(s.remainingPlaces, s.sourcePlaces, new Date()).headline;
      var free = s.remainingPlaces, rooms = s.remainingRooms;   /* the engine's object, rendered — never recomputed */
      if (s.soldOut || free <= 0) return 'Sold out';
      if (s.kind === 'property') return free + ' of ' + s.sourcePlaces + ' places left';
      var N = s.sourceRooms;
      var E = typeof s.emptyRooms === 'number' ? s.emptyRooms : list.filter(function (u) { return !u.taken; }).length;
      var S = typeof s.sharedFree === 'number' ? s.sharedFree : list.filter(function (u) { return u.taken > 0; }).reduce(function (n, u) { return n + u.free; }, 0);
      if (N === 1) return E === 1 ? 'One room only · free' : 'One room only · ' + free + (free === 1 ? ' place free' : ' places free');
      var shared = S === 1 ? '1 free place in a shared room' : S + ' free places in shared rooms';
      if (E > 0) return E + ' of ' + N + ' rooms left' + (S > 0 ? ' · ' + shared : '');
      return 'No empty room left · ' + shared;
    },
    /* the unit of a category where a place is KEPT for the viewer's party while the viewer holds nothing there — the
       viewer's own place, never "full" (PRQ-03-01) */
    keptForMe: function (win, slug) {
      if (this.mine(this.stageOf(keyOf(win, slug)))) return null;
      return this.units(win, slug).filter(function (u) { return u.occupants.some(function (o) { return o.placeholder && o.party; }); })[0] || null;
    },
    /* the category's exact numbers — the engine's object */
    count: function (win, slug) {
      var s = this.summary(win, slug);
      if (!s) return { rooms: 0, places: 0, reserved: 0, free: 0, open: 0 };
      return { rooms: s.sourceRooms, places: s.sourcePlaces, reserved: s.ownerReservedRooms, free: s.remainingPlaces, open: s.remainingRooms,
               empty: typeof s.emptyRooms === 'number' ? s.emptyRooms : null, shared: typeof s.sharedFree === 'number' ? s.sharedFree : null };
    },
    /* why this guest cannot choose here, in words for a disabled CTA — '' when they can (a place kept for them: they can) */
    ctaWords: function (win, slug) {
      /* canTake already counts a place kept for the viewer's party as theirs (fits / fitsParty) */
      if (!this.tracked(win, slug) || this.canTake(win, slug)) return '';
      if (this.soldOut(win, slug)) return 'Sold out';
      var n = this.need(win);
      return n > 1 ? 'No room here for the ' + n + ' of you together' : 'Sold out';
    },
    scarce: function (win, slug) { var s = this.summary(win, slug); return !!s && s.free > 0 && s.free <= 2; },
    unitName: function (u) { return u ? (u.kind === 'property' ? u.name : 'Room ' + u.label) : ''; },
    /* the category's own name (PRQ-03-03): "Luye Starry Sky Suite · Immersive View", never the last segment of a meta */
    roomName: function (win, slug) {
      var P = window.SIYL_PRICE, at = P && P.locate ? P.locate(win) : null, r = null;
      if (at && at.stay && Array.isArray(at.stay.rooms)) r = at.stay.rooms.filter(function (x) { return x.slug === slug; })[0] || null;
      if (r && r.name) return r.name;
      var s = this.summary(win, slug); return s && s.name ? s.name : '';
    },
    /* the name one occupant is shown by: "You" · a first name · "A guest" · '' for a place kept for a party */
    whoWords: function (o) { return whoOf(o); },
    /* ONE ROOM'S WORDS (TO-01214 … TO-01218 · TO-01256 … TO-01258): who is there (first names, joined with "and") and the
       state in lower case — "you and Ada" + "full" · "you" + "1 place free" · "you" + "1 place kept for Ben" · "Ada" +
       "1 place free · 1 kept for Ben" · "Ada" + "1 place kept for you" · (nobody) + "empty · 2 places" · the Guest House
       "you" + "3 of 4 places free". Returns { names: [...], who: 'you and Ada', state: '…' }. */
    stateOf: function (u) {
      if (!u) return { names: [], who: '', state: '' };
      var real = u.occupants.filter(function (o) { return !o.placeholder; });
      var mineIn = real.some(function (o) { return o.mine; });
      var names = real.slice().sort(function (a, b) { return (b.mine ? 1 : 0) - (a.mine ? 1 : 0); }).map(whoOf);
      var who = andJoin(names.map(function (n, i) { return i === 0 ? n : (n === 'You' ? 'you' : n); }));
      var keptMine = u.occupants.filter(function (o) { return o.placeholder && o.party; }).length;
      var stage = u.key ? U.stageOf(u.key) : null;
      var free = u.free, parts = [];
      var youHoldStage = mineIn || (stage ? !!U.mine(stage) : false);
      if (!real.length && !keptMine) return { names: [], who: '', state: 'empty · ' + u.places + (u.places === 1 ? ' place' : ' places') };
      if (u.kind === 'property') parts.push(free + ' of ' + u.places + ' places free');
      else if (free > 0) parts.push(free + (free === 1 ? ' place free' : ' places free'));
      if (keptMine) {
        var forWhom = youHoldStage ? absentMembers(stage) : ['you'].concat(absentMembers(stage));
        forWhom = forWhom.slice(0, keptMine);
        var whom = forWhom.length ? andJoin(forWhom) : 'your party';
        parts.push(parts.length ? keptMine + ' kept for ' + whom : (keptMine === 1 ? '1 place kept for ' : keptMine + ' places kept for ') + whom);
      }
      if (!parts.length) parts.push('full');
      return { names: names, who: who, state: parts.join(' · ') };
    },
    unitWords: function (u) {
      var st = this.stateOf(u), who = andJoin(st.names.map(function (n) { return n === 'You' ? 'you' : n; }));
      return who ? who + ' · ' + st.state : st.state;
    },
    /* THE OCCUPANCY SENTENCE of a held room (TO-01359 · TO-01360), from the engine's units — no second count:
       "Room A has two sleeping places. You hold one; one is free." · "… You hold one; one is kept for Ben." ·
       "… You and Ada hold them; the room is full." · "The Guest House has four sleeping places. You hold one; three are
       free." · "… All four are taken, one of them by you." */
    occupancySentence: function (u) {
      if (!u) return '';
      var real = u.occupants.filter(function (o) { return !o.placeholder; });
      if (!real.some(function (o) { return o.mine; })) return '';
      var names = real.slice().sort(function (a, b) { return (b.mine ? 1 : 0) - (a.mine ? 1 : 0); }).map(whoOf);
      var H = real.length, K = u.occupants.filter(function (o) { return o.placeholder; }).length, F = u.free;
      var subject = u.kind === 'property' ? 'The Guest House' : this.unitName(u);
      var head = subject + ' has ' + numWord(u.places) + ' sleeping ' + (u.places === 1 ? 'place' : 'places') + '. ';
      if (!F && !K) {
        if (u.kind === 'property') return head + 'All ' + numWord(u.places) + ' are taken, one of them by you.';
        return head + (H === 1 ? 'You hold it.' : andJoin(names) + ' hold them; the room is full.');
      }
      var rest = [];
      if (F) rest.push(numWord(F) + (F === 1 ? ' is free' : ' are free'));
      if (K) {
        var mineParty = u.occupants.filter(function (o) { return o.placeholder && o.party; }).length;
        var whom = mineParty ? andJoin(absentMembers(u.key ? U.stageOf(u.key) : '').slice(0, mineParty)) : '';
        rest.push(numWord(K) + (K === 1 ? ' is kept' : ' are kept') + (whom ? ' for ' + whom : ''));
      }
      return head + andJoin(names) + ' hold' + (H === 1 && names[0] !== 'You' ? 's' : '') + ' ' + numWord(H) + '; ' + rest.join(' and ') + '.';
    },
    /* THE WAITING LIST CONTROL (PRQ-02-07 · PRQ-03-04): can ANY category of a stage still take the guest's party? When it
       cannot (and the guest holds nothing there), the page offers "Join the waiting list" → U.wait(stage, need, wanted) */
    stageKeys: function (stage) { var self = this; return Object.keys((view && view.units) || {}).filter(function (k) { return self.stageOf(k) === stage; }); },
    stageCanTake: function (stage, need) {
      if (!view || !view.units) return true;             /* the engine unread: never offer the line on a guess */
      if (this.mine(stage)) return true;
      var self = this, P = window.SIYL_STAY_PLAN, c = this.complimentary();
      need = need || this.need(stage);
      return this.stageKeys(stage).some(function (k) {
        if (P && k === P.COMPLIMENTARY.key && c && !c.open) return false;   /* the Guest House after 30 November or full */
        var i = k.indexOf('/'); return self.canTake(k.slice(0, i), k.slice(i + 1), need);
      });
    },
    /* THE GUEST HOUSE BLOCK (PRQ-03-05): the live count, open / closed / full, and whether this guest can take a place */
    guestHouse: function () {
      var c = this.complimentary(), P = window.SIYL_STAY_PLAN; if (!c || !c.max) return null;
      var key = c.key || (P && P.COMPLIMENTARY.key) || 'guesthouse/guest-house', i = key.indexOf('/');
      var closed = c.phase === 'closed';
      var words = P ? P.complimentaryWords(c.remaining, c.max, new Date()) : { headline: c.remaining + ' of ' + c.max + ' places left', detail: '' };
      return { key: key, win: key.slice(0, i), slug: key.slice(i + 1), max: c.max, remaining: c.remaining, taken: c.taken,
               mine: !!c.mine, open: !!c.open, closed: closed, full: !!c.full, count: c.remaining + ' of ' + c.max + ' places left',
               headline: words.headline, detail: words.detail,
               canTake: !c.mine && !!c.open && this.canTake(key.slice(0, i), key.slice(i + 1)) };
    },

    /* ---- write: the engine decides, never this file -------------------- */
    /* `need` (optional): the places the guest's party needs in the unit — the engine refuses a unit that cannot take them all */
    join: function (win, slug, label, need) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/join', { method: 'POST', headers: headers(true),
        body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, key: keyOf(win, slug), label: label, need: need || 1 }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.units) { seq++; view = d; rememberWaits(d); announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    /* THE WAITING LIST (Owner, 19 Sep 2026): a place in the line for a stage no defined option could take — once per guest
       and stage, positioned by time; `wanted` names the options tried; a place held later resolves it */
    wait: function (stage, size, wanted) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/wait', { method: 'POST', headers: headers(true), body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, stage: stage, size: size || U.need(stage), wanted: wanted || [] }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.units) { seq++; view = d; rememberWaits(d); announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    unwait: function (stage) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/unwait', { method: 'POST', headers: headers(true), body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, stage: stage }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.units) { seq++; view = d; rememberWaits(d); announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    /* ---- THE COMPLIMENTARY ALLOCATION (Owner, 22 Sep 2026) ----
       The engine's answer, never this file's arithmetic: how many of the four places are left, and whether the date still
       allows a new claim. */
    complimentary: function () { return view && view.complimentary ? view.complimentary : null; },
    /* THE PAID EXTENSION IS WITHDRAWN (Owner, 23 Sep 2026): this service used to answer `extension()` and to call
       `extend` / `unextend`. A guest cannot self-book extra nights any more; Guest Relations arranges them outside
       the engine, and no surface asks this module for them. */

    /* release the guest's place(s) in a stage — or, with `win`, only in that window of the stage (a stale device never
       releases the other hotel the guest holds meanwhile) */
    leave: function (stage, win) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      var body = { invitationId: a.invitationId, guestId: a.guestId, stage: stage }; if (win) body.window = win;
      return fetch(API + '/leave', { method: 'POST', headers: headers(true),
        body: JSON.stringify(body) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.units) { seq++; view = d; rememberWaits(d); announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    }
  };

  U.load();
  document.addEventListener('siyl:auth', function () { U.load(true); });
  document.addEventListener('siyl:signout', function () { view = null; });
})();
