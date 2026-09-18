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
  /* the Worker's own origin and a local `wrangler dev` answer at the same path; the Pages mirror asks the Worker */
  var API = (location.hostname === 'seeyouinlaos-website.suthep-hrg.workers.dev' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) ? '/api/rooms' : ORIGIN + '/api/rooms';

  var view = null, loading = null, lastError = null;
  var STAGE_OF = { 'bkk-stay': 'bkk-stay', prewed: 'prewed', wedstay: 'wedstay', 'airbnb-2br': 'wedstay', kmg: 'kmg', ljg: 'ljg', kempinski: 'kempinski' };

  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function headers(json) {
    var a = auth(), h = {};
    if (json) h['content-type'] = 'application/json';
    if (a && a.bearer) h['x-siyl-auth'] = a.bearer;
    return h;
  }
  function keyOf(win, slug) { return String(win) + '/' + String(slug); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:units')); } catch (e) {} }
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
      var a = auth();
      loading = fetch(API + (a && a.invitationId ? '?invitation=' + encodeURIComponent(a.invitationId) : ''), { cache: 'no-store', headers: headers(false) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (!d || !d.ok) throw new Error('rooms unavailable'); view = d; lastError = null; announce(); return d; })
        .catch(function (e) { lastError = String(e && e.message || e); announce(); return null; })
        .then(function (v) { loading = null; return v; });
      return loading;
    },

    /* the units of one category, as the engine sees them for this guest */
    tracked: function (win, slug) { return !!(view && view.units && view.units[keyOf(win, slug)]); },
    units: function (win, slug) { return view && view.units ? (view.units[keyOf(win, slug)] || []) : []; },
    summary: function (win, slug) { return view && view.summary ? (view.summary[keyOf(win, slug)] || null) : null; },
    /* the place this guest holds for a stage: { key, label } | null */
    mine: function (stage) { return view && view.mine ? (view.mine[stage] || null) : null; },
    /* the Owner's FIXED arrangement for this guest in a stage (never a Bag product, never released here) */
    fixed: function (stage) { var m = this.mine(stage); return !!(m && m.fixed); },
    fixedStages: function () { var m = (view && view.mine) || {}; return Object.keys(m).filter(function (st) { return m[st] && m[st].fixed; }); },
    mineFor: function (win, slug) { var m = this.mine(this.stageOf(keyOf(win, slug))); return m && m.key === keyOf(win, slug) ? m : null; },
    /* free places a guest may take in this category */
    free: function (win, slug) { var s = this.summary(win, slug); return s ? s.free : null; },
    /* every room is open to every guest (Owner, 15 Sep 2026); kept for readers of the old rule */
    eligible: function (win, slug) { return this.units(win, slug).length > 0; },
    fits: function (win, slug) {
      if (!this.tracked(win, slug)) return true;
      if (this.mineFor(win, slug)) return true;
      return this.units(win, slug).some(function (u) { return !u.full && u.eligible; });
    },
    /* SOLD OUT is the engine's word alone: remainingPlaces === 0 — never "this guest may not choose here" */
    soldOut: function (win, slug) { var s = this.summary(win, slug); return this.tracked(win, slug) && !!s && s.soldOut === true; },
    /* the whole category is the Master's reservation (no room this guest may take) */
    reserved: function (win, slug) { var list = this.units(win, slug); return list.length > 0 && list.every(function (u) { return u.reservedFor; }) && !this.mineFor(win, slug); },
    /* the unit to suggest: a unit a party member already holds with a place
     * free, else the first unit with a place free */
    suggest: function (win, slug) {
      var list = this.units(win, slug).filter(function (u) { return !u.full && u.eligible; });
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
      if (this.reserved(win, slug)) return 'Reserved · ' + s.reservedFor;
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
      if (!this.tracked(win, slug) || this.fits(win, slug)) return '';
      if (this.reserved(win, slug)) return 'Reserved';
      if (this.soldOut(win, slug)) return 'Sold out';
      return 'Your room is fixed';
    },
    scarce: function (win, slug) { var s = this.summary(win, slug); return !!s && s.free > 0 && s.free <= 2; },
    unitName: function (u) { return u ? (u.kind === 'property' ? u.name : 'Room ' + u.label) : ''; },
    unitWords: function (u) {
      if (!u) return '';
      var names = u.occupants.map(function (o) { return o.mine ? 'You' : (o.name || 'A guest'); });
      if (u.reservedFor && !u.eligible) return (names.length ? names.join(' · ') + ' · ' : '') + 'Reserved · ' + u.reservedFor;
      if (u.full) return names.join(' · ') + ' · Full';
      if (!names.length) return u.places + (u.places === 1 ? ' place' : ' places') + ' · Available';
      return names.join(' · ') + ' · ' + u.free + (u.free === 1 ? ' place available' : ' places available');
    },

    /* ---- write: the engine decides, never this file -------------------- */
    join: function (win, slug, label) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/join', { method: 'POST', headers: headers(true),
        body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, key: keyOf(win, slug), label: label, name: firstName() }) })
        .then(function (r) { return r.json().then(function (d) { d.status = r.status; return d; }); })
        .then(function (d) { if (d && d.units) { view = d; announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    },
    leave: function (stage) {
      var a = auth();
      if (!a || !a.guestId) return Promise.resolve({ ok: false, error: 'not signed in' });
      return fetch(API + '/leave', { method: 'POST', headers: headers(true),
        body: JSON.stringify({ invitationId: a.invitationId, guestId: a.guestId, stage: stage }) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.units) { view = d; announce(); } else U.load(true); return d; })
        .catch(function () { return { ok: false, error: 'unreachable' }; });
    }
  };

  U.load();
  document.addEventListener('siyl:auth', function () { U.load(true); });
  document.addEventListener('siyl:signout', function () { view = null; });
})();
