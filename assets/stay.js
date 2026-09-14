/* ============================================================================
   SEE YOU IN LAOS — CHOOSING A STAY (Owner decision, 14 Sep 2026).

   ONE way to choose a room, on every surface (Your Journey, the Journeys
   catalogue, a room page, the cart): the guest chooses a CATEGORY and a
   PLACE in one of its allocation units — ROOM A, ROOM B … — and the place is
   held on the server, in the guest's own name, before the journey line is
   written. The suggested unit is the one a member of the guest's party is
   already in with a place free; otherwise the first unit with a place free.
   JOIN THIS ROOM lets the guest choose any other unit that has a place.

   The bag line of a stay carries `unit` (the label) so every surface can say
   where the guest is. The engine (assets/rooms.js) stays the only truth: a
   line whose place the engine does not hold reads "choose your room" and the
   step needs attention until it does.
   ========================================================================== */
(function () {
  'use strict';
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function gated(fn) {
    if (window.SIYL_INVITE) SIYL_INVITE.require(fn);
    else document.addEventListener('siyl:invite-ready', function () { SIYL_INVITE.require(fn); }, { once: true });
  }
  function P() { return window.SIYL_PRICE; }
  function U() { return window.SIYL_UNITS; }
  function B() { return window.SIYL_BAG; }
  function stageOf(win) { var u = U(); return u ? u.stageOf(win + '/x') : win; }

  var ST = window.SIYL_STAY = {
    /* the journey line of a window, if any */
    line: function (win) {
      var p = P(), b = B(); if (!p || !b) return null;
      var ids = p.ids(win);
      return b.get().filter(function (x) { return ids.indexOf(x.id) >= 0; })[0] || null;
    },
    /* is the guest's place for this line held by the engine */
    held: function (line) {
      var u = U(), p = P(); if (!line || !line.room || line.interest) return true;
      if (!u || !u.ready()) return true;                 /* engine unread — do not alarm */
      var win = p ? p.windowOf(line.id) : line.id;
      var m = u.mineFor(win, line.room);
      return !!m;
    },
    unitOf: function (line) {
      var u = U(), p = P(); if (!line || !line.room || !u || !u.ready()) return null;
      var win = p ? p.windowOf(line.id) : line.id, m = u.mineFor(win, line.room);
      if (!m) return null;
      return u.units(win, line.room).filter(function (x) { return x.label === m.label; })[0] || null;
    },
    unitWords: function (line) { var u = U(), x = this.unitOf(line); return x && u ? u.unitName(x) + ' · ' + u.unitWords(x) : ''; },

    /* CHOOSE: hold the place first, then write the line. Resolves
     * { ok, unit } or { ok:false, error: 'full' | 'reserved' | 'unreachable' | 'not signed in' } */
    select: function (win, slug, label) {
      var self = this;
      return new Promise(function (resolve) {
        gated(function () {
          var u = U(), p = P(), b = B();
          if (!u || !p || !b) { resolve({ ok: false, error: 'unavailable' }); return; }
          var go = function () {
            if (!u.tracked(win, slug)) { self.write(win, slug, null); resolve({ ok: true, unit: null }); return; }
            var unit = label ? u.units(win, slug).filter(function (x) { return x.label === label; })[0] : (u.mineFor(win, slug) ? u.units(win, slug).filter(function (x) { return x.label === u.mineFor(win, slug).label; })[0] : u.suggest(win, slug));
            if (!unit) { resolve({ ok: false, error: u.eligible(win, slug) ? 'full' : 'reserved' }); return; }
            if (!unit.eligible) { resolve({ ok: false, error: 'reserved' }); return; }
            u.join(win, slug, unit.label).then(function (d) {
              if (d && d.ok) { self.write(win, slug, unit.label); resolve({ ok: true, unit: unit.label }); return; }
              resolve({ ok: false, error: d && d.error === 'full' ? 'full' : (d && /reserved/.test(d.error || '') ? 'reserved' : (d && d.error) || 'unreachable') });
            });
          };
          if (u.ready()) go(); else u.load().then(go);
        });
      });
    },
    /* the line, from the one pricing source, with the place it holds */
    write: function (win, slug, label) {
      var p = P(), b = B();
      p.ids(win).forEach(function (id) { b.remove(id); });
      p.items(win, slug).forEach(function (it) { it.qty = 1; if (label) { it.unit = label; it.unitName = ST.nameFor(win, slug, label); } b.put(it); });
    },
    nameFor: function (win, slug, label) {
      var u = U(); if (!u) return 'Room ' + label;
      var x = u.units(win, slug).filter(function (y) { return y.label === label; })[0];
      return u.unitName(x) || ('Room ' + label);
    },
    /* REMOVE: the place is given back first, then the line goes */
    remove: function (win) {
      var self = this, u = U(), p = P(), b = B();
      var line = this.line(win);
      var done = function () { p.ids(win).forEach(function (id) { b.remove(id); }); };
      if (!u || !line || !line.room || line.interest || !u.tracked(win, line.room)) { done(); return Promise.resolve({ ok: true }); }
      return u.leave(stageOf(win)).then(function () { done(); return { ok: true }; });
    },
    /* the engine and the bag agree: a place the engine holds is in the bag;
     * a line the engine does not hold is marked so the guest chooses a room */
    sync: function () {
      var u = U(), p = P(), b = B(); if (!u || !u.ready() || !p || !b || !b.authed()) return;
      var bag = b.get(), changed = false;
      bag.forEach(function (x) {
        if (!x.room || x.interest) return;
        var win = p.windowOf(x.id), m = u.mineFor(win, x.room);
        var label = m ? m.label : null;
        if ((x.unit || null) !== label) { x.unit = label; x.unitName = label ? ST.nameFor(win, x.room, label) : undefined; changed = true; }
      });
      if (changed) b.set(bag);
      /* a place the engine holds for a stay the bag does not carry (a migration,
       * another device): the line comes back from the one pricing source */
      var mine = (u.view() && u.view().mine) || {};
      Object.keys(mine).forEach(function (stage) {
        var key = mine[stage].key, win = key.split('/')[0], slug = key.split('/').slice(1).join('/');
        var at = p.locate(win); if (!at) return;
        if (ST.line(win)) return;
        var stageIds = [];
        (window.SIYL_JOURNEY ? SIYL_JOURNEY.SEGMENTS : []).forEach(function (seg) { if (seg.ids.indexOf(win) >= 0) seg.ids.forEach(function (id) { stageIds.push(id); }); });
        if (stageIds.some(function (id) { return ST.line(id); })) return;
        ST.write(win, slug, mine[stage].label);
      });
    },

    /* ---- the unit chooser: one row per allocation unit ------------------ */
    unitsHtml: function (win, slug, opts) {
      opts = opts || {};
      var u = U(); if (!u || !u.ready() || !u.tracked(win, slug)) return '';
      var list = u.units(win, slug), mine = u.mineFor(win, slug), any = list.some(function (x) { return x.eligible && !x.full; });
      var h = '<div class="p-units" data-units="' + esc(win) + '|' + esc(slug) + '">';
      list.forEach(function (x) {
        var isMine = !!(mine && mine.label === x.label);
        var names = x.occupants.map(function (o) { return o.mine ? 'You' : (o.name || 'A guest'); });
        var dots = '';
        for (var i = 0; i < x.places; i++) { var o = x.occupants[i]; dots += '<i class="' + (o ? (o.mine ? 'on me' : 'on') : '') + '" aria-hidden="true"></i>'; }
        var who = names.length ? names.map(function (n) { return '<b>' + esc(n) + '</b>'; }).join(' · ') : '';
        var state = !x.eligible ? (x.reservedFor ? 'Reserved for ' + esc(x.reservedFor) : 'Reserved') : x.full ? 'Full' : (x.free === 1 ? '1 place available' : x.free + ' places available');
        var act = isMine ? '<span class="t-l1 on">Your room</span>'
                : (!x.eligible ? '' : x.full ? '<span class="t-l1">Full</span>'
                : '<button type="button" class="p-act quiet" data-join="' + esc(win) + '|' + esc(slug) + '|' + esc(x.label) + '">' + (names.length ? 'Join this room' : 'Choose this room') + '</button>');
        h += '<div class="p-unit' + (isMine ? ' mine' : '') + (x.full ? ' full' : '') + '" data-unit="' + esc(x.label) + '" data-free="' + x.free + '">' +
             '<div><p class="p-unit-name">' + esc(u.unitName(x)) + '</p><p class="p-unit-who"><span class="p-places">' + dots + '</span>' + (who ? who + ' · ' : '') + state + '</p></div>' + act + '</div>';
      });
      h += '</div>';
      if (!any && !mine) h += '<p class="t-b2 measure-w" style="margin-top:var(--s3)">' + (list.some(function (x) { return x.eligible; }) ? 'Every room of this category is full.' : 'This category is reserved.') + '</p>';
      return h;
    },
    wire: function (root, onDone) {
      var self = this;
      root.querySelectorAll('[data-join]').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-join').split('|');
          b.setAttribute('aria-disabled', 'true'); b.textContent = 'Holding your place…';
          self.select(v[0], v[1], v[2]).then(function (r) {
            if (onDone) onDone(r, v[0], v[1], v[2]);
          });
        });
      });
    },
    /* the words for a refusal */
    refusal: function (r) {
      if (!r || r.ok) return '';
      if (r.error === 'full') return 'That room has just filled — choose another room.';
      if (r.error === 'reserved') return 'This room is reserved and cannot be chosen.';
      if (r.error === 'not signed in') return 'Open your invitation to choose a room.';
      return 'Your place could not be held right now — please try again in a moment.';
    }
  };

  document.addEventListener('siyl:units', function () { ST.sync(); });
  if (U() && U().ready()) ST.sync();
})();
