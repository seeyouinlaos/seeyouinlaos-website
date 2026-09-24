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
  function firstName() { var G = window.SIYL_GUEST, a = auth(); return (G && G.nameOf && G.nameOf()) || (a && a.preferredName) || ''; }

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
      return this.units(win, slug).some(function (u) { return !u.full && u.eligible; });
    },
    /* the party's size (SIYL_JOURNEY.partySize — the members of the party, 1–6) */
    need: function () { var J = window.SIYL_JOURNEY; if (J && J.partySize) return J.partySize(); var a = auth(); var n = a && Array.isArray(a.members) ? a.members.length : 1; return Math.max(1, Math.min(6, n || 1)); },
    /* can this category take the guest's WHOLE party (Owner, 19 Sep 2026)? — the one question every Choose button asks */
    canTake: function (win, slug, need) {
      need = need || this.need();
      if (!this.tracked(win, slug)) return true;
      if (this.mineFor(win, slug)) return true;
      return need > 1 ? !!this.unitForParty(win, slug, need) : this.fits(win, slug);
    },
    /* SOLD OUT is the engine's word alone: remainingPlaces === 0 — never "this guest may not choose here" */
    soldOut: function (win, slug) { var s = this.summary(win, slug); return this.tracked(win, slug) && !!s && s.soldOut === true; },
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
    /* the words the guest reads about a category — rendered DIRECTLY from the engine's one canonical availability
     * object (Owner, 16 Sep 2026): source inventory minus the Owner's reservations minus the real guest bookings.
     * No second calculation here. soldOut = remainingPlaces === 0 and nothing else. "Your place is held" only when
     * this guest holds one here; a category the Master reserves in full says RESERVED, never "booked". */
    label: function (win, slug) {
      var s = this.summary(win, slug);
      if (!s) return '';
      var list = this.units(win, slug), mine = this.mineFor(win, slug);
      if (mine) return 'Your place is held · ' + this.unitName(list.filter(function (u) { return u.label === mine.label; })[0] || { kind: 'room', label: mine.label });
      /* THE COMPLIMENTARY ALLOCATION (Owner, 22 Sep 2026): the four places (Edit 7, 24 Sep 2026) are counted in the Owner's own words — how many are
         left of how many, "fully allocated" when they are gone, "closed" once the planning date has passed. Factual only. */
      var P = window.SIYL_STAY_PLAN;
      if (P && keyOf(win, slug) === P.COMPLIMENTARY.key) return P.complimentaryWords(s.remainingPlaces, s.sourcePlaces, new Date()).headline;
      var free = s.remainingPlaces, rooms = s.remainingRooms;
      if (s.soldOut || free <= 0) return 'Sold out';
      if (s.kind === 'property') return free === 1 ? '1 place available' : free + ' places available';
      return (rooms === 1 ? '1 room' : rooms + ' rooms') + ' · ' + (free === 1 ? '1 place available' : free + ' places available');
    },
    /* the category's exact numbers — the engine's object */
    count: function (win, slug) {
      var s = this.summary(win, slug);
      if (!s) return { rooms: 0, places: 0, reserved: 0, free: 0, open: 0 };
      return { rooms: s.sourceRooms, places: s.sourcePlaces, reserved: s.ownerReservedRooms, free: s.remainingPlaces, open: s.remainingRooms };
    },
    /* why this guest cannot choose here, in one word for a CTA — '' when they can */
    ctaWords: function (win, slug) {
      if (!this.tracked(win, slug) || this.canTake(win, slug)) return '';
      if (this.soldOut(win, slug)) return 'Sold out';
      if (this.fits(win, slug)) return 'Not enough places for your party of ' + this.need();
      return 'Not available for you';
    },
    scarce: function (win, slug) { var s = this.summary(win, slug); return !!s && s.free > 0 && s.free <= 2; },
    unitName: function (u) { return u ? (u.kind === 'property' ? u.name : 'Room ' + u.label) : ''; },
    unitWords: function (u) {
      if (!u) return '';
      var names = u.occupants.map(function (o) { return o.mine ? 'You' : (o.name || 'A guest'); });
      if (u.full) return names.join(' · ') + ' · Full';
      if (!names.length) return u.places + (u.places === 1 ? ' place' : ' places') + ' · Available';
      return names.join(' · ') + ' · ' + u.free + (u.free === 1 ? ' place available' : ' places available');
    },

    /* ---- write: the engine decides, never this file -------------------- */
    /* `need` (optional): the places the guest's party needs in the unit — the engine refuses a unit that cannot take them all */
    join: function (win, slug, label, need) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/join', { method: 'POST', headers: headers(true),
        body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, key: keyOf(win, slug), label: label, name: firstName(), need: need || 1 }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.units) { seq++; view = d; rememberWaits(d); announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    /* THE WAITING LIST (Owner, 19 Sep 2026): a place in the line for a stage no defined option could take — once per guest
       and stage, positioned by time; `wanted` names the options tried; a place held later resolves it */
    wait: function (stage, size, wanted) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/wait', { method: 'POST', headers: headers(true), body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, stage: stage, size: size || 1, wanted: wanted || [], name: firstName() }) })
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
