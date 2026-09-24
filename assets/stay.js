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
  var settling = null;   /* the one engine read a settle() has in flight */

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
    /* `need` (optional, the packages): the places the guest's party needs in the unit — the unit chosen must take them all */
    select: function (win, slug, label, need) {
      var self = this;
      return new Promise(function (resolve) {
        gated(function () {
          var u = U(), p = P(), b = B();
          if (!u || !p || !b) { resolve({ ok: false, error: 'unavailable' }); return; }
          /* a room the website no longer offers is refused before anything changes: no hold, no line, the stage as it was */
          if (!p.items(win, slug).length) { resolve({ ok: false, error: 'not offered' }); return; }
          var go = function () {
            if (!u.tracked(win, slug)) { self.write(win, slug, null); resolve({ ok: true, unit: null }); return; }
            var unit = label ? u.units(win, slug).filter(function (x) { return x.label === label; })[0]
                     : (u.mineFor(win, slug) ? u.units(win, slug).filter(function (x) { return x.label === u.mineFor(win, slug).label; })[0]
                     : (need && need > 1 && u.unitForParty ? u.unitForParty(win, slug, need) : u.suggest(win, slug)));
            if (!unit) { resolve({ ok: false, error: need && need > 1 ? 'full for your party' : 'full' }); return; }
            u.join(win, slug, unit.label, need || 1).then(function (d) {
              if (d && d.ok) { self.write(win, slug, unit.label); resolve({ ok: true, unit: unit.label }); return; }
              resolve(Object.assign({ ok: false, error: d && d.error === 'full' ? 'full' : (d && d.error) || 'unreachable' }, unit.kind === 'property' ? { property: true } : {}));
            });
          };
          if (u.ready()) go(); else u.load().then(go);
        });
      });
    },
    /* ONE SELECTION PER STAGE (Codex, release 012): the Wedding Stay is answered by Souphattra, the private residence OR the
     * Riverside Hotel — the engine holds one place per stage, so the Bag carries one line per stage. Every Bag id of every
     * window that answers the same stage as `win`, read from the stay data and the engine's stage map (never a list kept here). */
    stageIds: function (win) {
      var p = P(), st = stageOf(win), wins = [win], out = [];
      var R = window.SIYL_ROOMS || {};
      Object.keys(R).forEach(function (k) { (R[k].windows || []).forEach(function (w) { if (wins.indexOf(w.id) < 0) wins.push(w.id); }); });
      var J = window.SIYL_JOURNEY;
      if (J && J.SEGMENTS) J.SEGMENTS.forEach(function (seg) { if (seg.ids.indexOf(win) >= 0) seg.ids.forEach(function (id) { if (wins.indexOf(id) < 0) wins.push(id); }); });
      wins.forEach(function (w) { if (stageOf(w) !== st) return; (p ? p.ids(w) : [w]).forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); }); });
      return out;
    },
    /* the house a line belongs to, by its name (a window's bag name may carry the window's own words) */
    houseOf: function (line) { var R = window.SIYL_ROOMS || {}; return (line && line.stay && R[line.stay] && R[line.stay].name) || (line && line.name) || ''; },
    /* the other hotel's line in this window's stage, if the Bag carries one (the room page and the Journey say it is replaced) */
    sibling: function (win) {
      var p = P(), b = B(); if (!p || !b) return null;
      var own = p.ids(win), ids = this.stageIds(win);
      return b.get().filter(function (x) { return ids.indexOf(x.id) >= 0 && own.indexOf(x.id) < 0; })[0] || null;
    },
    /* the line, from the one pricing source, with the place it holds — it replaces whatever answered the stage before */
    write: function (win, slug, label) {
      var p = P(), b = B();
      this.stageIds(win).forEach(function (id) { b.remove(id); });
      p.items(win, slug).forEach(function (it) { it.qty = 1; if (label) { it.unit = label; it.unitName = ST.nameFor(win, slug, label); } b.put(it); });
    },
    nameFor: function (win, slug, label) {
      var u = U(); if (!u) return 'Room ' + label;
      var x = u.units(win, slug).filter(function (y) { return y.label === label; })[0];
      return u.unitName(x) || ('Room ' + label);
    },
    /* REMOVE: the place is given back first, then the line goes */
    /* NO FIXED ARRANGEMENT (Owner, 19 Sep 2026): kept as names for older readers, always false / empty */
    fixed: function () { return false; },
    fixedSlug: function () { return ''; },
    remove: function (win) {
      var self = this, u = U(), p = P(), b = B();
      var line = this.line(win);
      var done = function () { p.ids(win).forEach(function (id) { b.remove(id); }); };
      if (!u || !line || !line.room || line.interest) { done(); return Promise.resolve({ ok: true }); }
      var release = function () {
        /* the release is the engine's, and it names THIS window: only a released place leaves the bag; an idempotent second
           remove finds nothing to release; a stale view never releases another hotel the guest holds meanwhile */
        return u.leave(stageOf(win), win).then(function (d) {
          if (d && d.ok === false) return d;   /* unreachable / refused: nothing changed, the line stays, the guest is told */
          done(); return { ok: true };
        });
      };
      var decide = function () {
        if (!u.tracked(win, line.room)) { done(); return Promise.resolve({ ok: true }); }   /* a window the engine does not know */
        /* a leftover line: the engine holds ANOTHER hotel of this stage for the guest — the line goes, the current hold stays (Codex, release 012) */
        var m = u.mine(stageOf(win));
        if (m && String(m.key).split('/')[0] !== win) { done(); return Promise.resolve({ ok: true }); }
        return release();
      };
      /* a device that has not read the engine yet reads it first — a held room is never dropped on this device's word alone;
         when the engine cannot be read, the release is still asked of it (and refused as unreachable: the line stays) */
      if (u.ready()) return decide();
      return u.load().then(function (v) { return v ? decide() : release(); });
    },
    /* a Bag line of a hotel the engine does not hold while it holds ANOTHER hotel of the same stage for the guest */
    leftover: function (x) {
      var u = U(), p = P(); if (!x || !x.room || x.interest || !u || !u.ready() || !p) return false;
      var win = p.windowOf(x.id), m = u.mine(stageOf(win));
      return !!(m && String(m.key).split('/')[0] !== win);
    },
    /* a Bag change made without the engine (a draft copy replayed, another tab) that LOOKS like two hotels in one stage: the
       engine is read again and the sync decides on the fresh view — never on this device's copy, which may be older than
       the guest's switch elsewhere. Nothing is dropped or brought back here; one read at a time. */
    settle: function () {
      var u = U(), b = B(); if (!u || !u.ready() || !b || !b.authed()) return false;
      if (!b.get().some(function (x) { return ST.leftover(x); })) return false;
      if (!settling) settling = u.load(true).then(function () { settling = null; }, function () { settling = null; });
      return true;
    },
    /* the engine and the bag agree: a place the engine holds is in the bag;
     * a line the engine does not hold is marked so the guest chooses a room */
    sync: function () {
      var u = U(), p = P(), b = B(); if (!u || !u.ready() || !p || !b || !b.authed()) return;
      var bag = b.get(), changed = false;
      /* a line of a hotel the engine does not hold while it holds ANOTHER hotel of the same stage is a leftover (an older
         draft, another device): the stage is answered by the held one, the leftover leaves the Bag and the total */
      /* a line of a room the website no longer offers (the Sathorn Penthouse, deleted — Owner, 24 Sep 2026 · Edit 6) is not
         a stay and not a cost: it leaves the Bag and the total, and the stage asks for a choice again */
      var gone = function (x) {
        if (!x || !x.room || x.interest) return false;
        var at = p.locate(p.windowOf(x.id));
        return !!(at && at.stay && Array.isArray(at.stay.rooms)) && !at.stay.rooms.some(function (r) { return r.slug === x.room; });
      };
      var kept = bag.filter(function (x) { return !ST.leftover(x) && !gone(x); });
      if (kept.length !== bag.length) { bag = kept; changed = true; }
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
        /* a hold on a room the website no longer offers is never turned into another room's line */
        if (!at.stay.rooms.some(function (r) { return r.slug === slug; })) return;
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
      /* PARTY CAPACITY (Owner, 19 Sep 2026): a unit is offered only where the whole party fits — the places the guest's own
         party already holds in it count for them; a unit too small for the party says so and carries no button */
      var need = opts.need || this.need();
      var list = u.units(win, slug), mine = u.mineFor(win, slug), any = list.some(function (x) { return !x.full && x.eligible && (!u.fitsParty || u.fitsParty(win, slug, x, need)); });
      var h = '<div class="p-units" data-units="' + esc(win) + '|' + esc(slug) + '" data-need="' + need + '">';
      list.forEach(function (x) {
        var isMine = !!(mine && mine.label === x.label);
        var fits = isMine || !u.fitsParty || u.fitsParty(win, slug, x, need);
        var property = x.kind === 'property';
        /* a unit full only by the places kept for this guest's party is theirs to join */
        var keptForMe = x.occupants.filter(function (o) { return o.placeholder && o.party; }).length;
        var fullForMe = x.full && !keptForMe;
        /* the names of who is there; a place kept for a party is not a person and is said in the state words */
        var names = x.occupants.filter(function (o) { return !o.placeholder; }).map(function (o) { return o.mine ? 'You' : (o.name || 'A guest'); });
        var dots = '';
        for (var i = 0; i < x.places; i++) { var o = x.occupants[i]; dots += '<i class="' + (o ? (o.mine ? 'on me' : 'on') : '') + '" aria-hidden="true"></i>'; }
        var who = names.length ? names.map(function (n) { return '<b>' + esc(n) + '</b>'; }).join(' · ') : '';
        /* factual states only (Owner, 15 Sep 2026): available · 1 place available · Full · Your room */
        var reserved = !!(x.reservedFor && !x.eligible && !isMine);
        var state = reserved ? 'Reserved · ' + esc(x.reservedFor) : fullForMe ? 'Full' : keptForMe && !x.free ? (keptForMe === 1 ? '1 place kept for you' : keptForMe + ' places kept for your party') : (x.free === 1 ? '1 place available' : x.free + ' places available') + (keptForMe ? ' · ' + keptForMe + ' kept for your party' : '');
        if (!fullForMe && !fits && !isMine) state += ' · not enough for your party of ' + need;
        var act = isMine ? '<span class="t-l1 on">' + (property ? 'Your place' : 'Your room') + '</span>'
                : (reserved ? '<span class="t-l1">Reserved</span>'
                : fullForMe ? '<span class="t-l1">Full</span>'
                : !x.eligible || !fits ? ''
                : '<button type="button" class="p-act quiet" data-join="' + esc(win) + '|' + esc(slug) + '|' + esc(x.label) + '">' + (property ? (names.length ? 'Join the house' : 'Take a place') : (names.length ? 'Join this room' : 'Choose this room')) + '</button>');
        h += '<div class="p-unit' + (isMine ? ' mine' : '') + (fullForMe ? ' full' : '') + (reserved ? ' reserved' : '') + '" data-unit="' + esc(x.label) + '" data-free="' + (reserved ? 0 : x.free) + '"' + (reserved ? ' data-reserved="' + esc(x.reservedFor) + '"' : '') + '>' +
             '<div><p class="p-unit-name">' + esc(u.unitName(x)) + '</p><p class="p-unit-who"><span class="p-places">' + dots + '</span>' + (who ? who + ' · ' : '') + state + '</p></div>' + act + '</div>';
      });
      h += '</div>';
      if (!any && !mine) {
        var allFull = list.length && list.every(function (x) { return x.full; });
        h += '<p class="t-b2 measure-w" style="margin-top:var(--s3)">' + (allFull ? (list[0].kind === 'property' ? 'Every place of the house is taken.' : 'Every room of this category is full.') : 'No ' + (list[0] && list[0].kind === 'property' ? 'place' : 'room') + ' here can take your party of ' + need + ' together.') + '</p>';
      }
      return h;
    },
    /* the party's size — how many places one selection must take (SIYL_JOURNEY.partySize: the members of the party, 1–6) */
    need: function () { var J = window.SIYL_JOURNEY; return J && J.partySize ? J.partySize() : 1; },
    wire: function (root, onDone) {
      var self = this;
      root.querySelectorAll('[data-join]').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = b.getAttribute('data-join').split('|');
          b.setAttribute('aria-disabled', 'true'); b.textContent = 'Holding your place…';
          self.select(v[0], v[1], v[2], self.need()).then(function (r) {
            if (onDone) onDone(r, v[0], v[1], v[2]);
          });
        });
      });
    },
    /* the words for a refusal */
    refusal: function (r) {
      if (!r || r.ok) return '';
      if (r.error === 'full') return r.property ? 'The last place in the house was just taken.' : 'This room was just filled. Please choose another room.';
      if (r.error === 'full for your party') return r.property ? 'The house cannot take your whole party together.' : 'This room cannot take your whole party. Please choose another room.';
      if (r.error === 'unreachable') return 'Nothing was changed — we could not reach Guest Relations just now. Please try again.';
      if (r.error === 'not signed in') return 'Open your invitation to choose a room.';
      return 'Your place could not be held right now — please try again in a moment.';
    }
  };

  document.addEventListener('siyl:units', function () { ST.sync(); });
  /* the Bag changed without the engine (a draft copy replayed, another tab): the engine remains the truth — a leftover of
     another hotel in a held stage leaves at once (Codex confirming pass, release 012); a second pass finds nothing to change */
  document.addEventListener('siyl:bag', function () { ST.settle(); });
  if (U() && U().ready()) ST.sync();
})();
