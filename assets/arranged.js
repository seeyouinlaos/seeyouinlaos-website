/* ============================================================================
   ARRANGED FOR YOU (Owner, 17 Sep 2026 · P0) — the one renderer of the fixed
   arrangements, read by My Trip, My Bag and Review & Send.

   A fixed arrangement is what the room engine holds for this guest with the
   Owner's FIXED marker (today: Sathorn Penthouse Room A for Haruthai and
   Suthep). It is shown separately from My Bag, carries no amount and no
   Remove / Change control, and never enters the Bag total. "Fixed" is the
   change authority; it says nothing about who pays — the cost wording of a
   fixed arrangement is a source matter (PROJECT_MASTER_BRIEF §10, §11), so
   the words here claim nothing beyond "arranged" and "not part of your bag".
   ========================================================================== */
(function () {
  'use strict';
  var STAGE = { 'bkk-stay': { when: '21 – 24 February 2027', nights: '3 nights', place: 'Bangkok' }, prewed: { when: '25 – 27 February 2027', nights: '2 nights', place: 'Vientiane' },
    wedstay: { when: '27 February – 01 March 2027', nights: '2 nights', place: 'Vientiane' }, kmg: { when: '01 – 04 March 2027', nights: '3 nights', place: 'Kunming' },
    ljg: { when: '04 – 06 March 2027', nights: '2 nights', place: 'Lijiang' }, kempinski: { when: '06 – 08 March 2027', nights: '2 nights', place: 'Bangkok' } };
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function unitOf(U, key, label) { var win = key.split('/')[0], slug = key.split('/').slice(1).join('/'); return (U.units(win, slug) || []).filter(function (u) { return u.label === label; })[0] || null; }
  function roomOf(key) {
    var R = window.SIYL_ROOMS, win = key.split('/')[0], slug = key.split('/').slice(1).join('/');
    if (!R) return null;
    for (var k in R) { var st = R[k]; if (!st.rooms) continue; if (!(st.windows || []).some(function (w) { return w.id === win; })) continue; var r = st.rooms.filter(function (x) { return x.slug === slug; })[0]; if (r) return { stay: st, room: r, key: k }; }
    return null;
  }
  var A = window.SIYL_ARRANGED = {
    ready: function () { var U = window.SIYL_UNITS; return !!(U && U.ready()); },
    /* the fixed arrangements of the signed-in guest: [{ stage, key, label, name, property, category, when, nights, place, who, href }] */
    items: function () {
      var U = window.SIYL_UNITS; if (!U || !U.ready()) return [];
      return U.fixedStages().map(function (stage) {
        var m = U.mine(stage), r = roomOf(m.key), u = unitOf(U, m.key, m.label), s = STAGE[stage] || {};
        var names = u ? u.occupants.map(function (o) { return o.mine ? 'You' : (o.name || 'A guest'); }) : [];
        return { stage: stage, key: m.key, label: m.label, name: U.unitName(u || { kind: 'room', label: m.label }), property: r ? (r.room.property || r.stay.name) : m.key,
          category: r ? (r.room.card || r.room.name) : '', when: s.when || '', nights: s.nights || '', place: s.place || '', who: names.join(' · '),
          href: r ? 'room.html?stay=' + r.key + '&room=' + r.room.slug : '' };
      });
    },
    has: function () { return this.items().length > 0; },
    /* one card per arrangement — no amount, no Remove, no Change */
    html: function (opts) {
      opts = opts || {};
      var items = this.items(); if (!items.length) return '';
      return '<section class="prep-sec" data-arranged>' + (opts.heading === false ? '' : '<p class="t-l1">Arranged for you</p>') + items.map(function (a) {
        return '<div class="p-card arranged" data-arranged-item="' + esc(a.stage) + '">' +
          '<p class="t-l1 on">' + esc(a.place) + ' · ' + esc(a.when) + '</p>' +
          '<h3 class="t-h1">' + esc(a.property) + '</h3>' +
          '<p class="t-b2">' + esc(a.name) + (a.category ? ' · ' + esc(a.category) : '') + (a.nights ? ' · ' + esc(a.nights) : '') + '</p>' +
          (a.who ? '<p class="t-b2">' + esc(a.who) + '</p>' : '') +
          '<p class="t-l1">Fixed arrangement · not part of your bag</p>' +
          (a.href ? '<div class="p-actions"><a class="p-link mute" href="' + esc(a.href) + '">View details</a></div>' : '') +
        '</div>';
      }).join('') + '</section>';
    },
    /* a short line for a summary surface */
    words: function () { return this.items().map(function (a) { return a.property + ' · ' + a.name; }).join(' · '); }
  };
})();
