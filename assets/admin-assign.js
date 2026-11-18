/* ============================================================================
   SEE YOU IN LAOS — THE OWNERS' SEATING MANAGEMENT & ROOM ASSIGNMENTS (Owners, 18 Nov 2026 · EMERGENCY P1).

   Two areas of the H&S admin console (/admin/billing · assets/admin-billing.js): "Seating" — the Vow Ceremony and the Wedding
   Dinner, 54 people each, the couple included — and "Room assignments" — every stay's rooms and who sleeps in them. For Haruthai
   and Suthep only (the server answers BILLING_ADMINs, nobody else); no guest's code, no guest's sign-in.

   NOTHING HAPPENS BY ITSELF. A change is first a DRAFT kept in this page only — never sent, never on the guests' website — listed
   change by change, each undoable. "Review" asks the server what the change would do (a dry run: nothing written); "Confirm"
   writes it once, as one change, to the seating ledger or the room engine — the one source the guests' profiles, the booking
   engine, the plans and the exports read. A seat or room that changed meanwhile (a guest, the other Owner) is never overwritten:
   the server refuses, the page reads again and names it.

   NEVER A PRICE: a room assignment re-arranges guests inside ONE category of ONE stay; another category or stay is a booking
   change (rate, nights) and is refused as such; an extra bed is never moved here. Nothing here stores anything in the browser.
   ========================================================================== */
(function () {
  'use strict';
  var C = null;   /* the console's core (assets/admin-billing.js · init) */
  var X = {
    phase: 'idle', error: '', data: null, event: 'ceremony', sel: null, draft: { ceremony: {}, dinner: {} }, msg: '', err: '', busy: false,
    /* what the Owner SAW on each seat / room when it first entered the draft — the expectation of the confirmation, never rebuilt from a
       later read (review, 18 Nov 2026); a seat that changed meanwhile is a conflict, named, until the Owner decides */
    seen: { ceremony: {}, dinner: {} }, conflict: { ceremony: [], dinner: [] }, rseen: {}, rconflict: [], focus: null,
    review: null, q: '', group: '', status: 'all', room: '', finalOpen: false, finalTick: false, stateOpen: null, logOpen: false,
    rsel: null, rdraft: {}, rreview: null, rapprove: false, rmsg: '', rerr: '', rfinalOpen: false, rfinalTick: false, rlogOpen: false
  };
  var EV = { ceremony: 'Vow Ceremony', dinner: 'Wedding Dinner' };
  var BOOK = { CONFIRMED: ['Confirmed', 'on'], SENT: ['Sent · to confirm', 'open'], NOT_SENT: ['Not sent', ''], DECLINED: ['Not joining us', 'open'] };
  var ANS = { yes: 'Joining', no: 'Not joining', undecided: 'Not decided', 'not-sent': 'Not sent yet' };
  var WHO = { BRIDE: 'Haruthai', GROOM: 'Suthep' };
  function esc(t) { return C.esc(t); }

  /* ---- the seat labels the guests know (assets/seatlabels.js — the same pure mapping, here without the page module) ---- */
  function label(id) {
    var c = /^C-([LR])-(\d\d)-(\d\d)$/.exec(id || ''), d = /^D-([TB])-(\d\d)$/.exec(id || '');
    if (c) return ({ L: ['A', 'B'], R: ['D', 'E', 'F'] })[c[1]][Number(c[3]) - 1] + Number(c[2]);
    if (d) return (d[1] === 'T' ? 'A' : 'B') + Number(d[2]);
    if (id === 'BRIDE') return 'Bride'; if (id === 'GROOM') return 'Groom';
    return id || '';
  }
  function where(id) {
    var c = /^C-([LR])-(\d\d)-(\d\d)$/.exec(id || ''), d = /^D-([TB])-(\d\d)$/.exec(id || '');
    if (c) return [c[1] === 'L' ? 'Left block' : 'Right block', Number(c[2]), Number(c[3])];
    if (d) return [d[1] === 'T' ? 'Side A' : 'Side B', null, Number(d[2])];
    return ['Front centre', null, null];
  }

  /* ---------------------------------------------------------------- the data */
  function load() {
    X.phase = 'loading'; X.error = ''; C.draw();
    return C.api('admin/assignments').then(function (x) {
      if (!x.ok) { X.phase = 'error'; X.error = x.j.error || 'The seating plans and the rooms could not be read just now.'; C.draw(); return; }
      /* a review describes the plan it was made on: after any read it is over — the Owner reviews again */
      X.data = x.j; X.phase = 'ready'; X.review = null; X.rreview = null; X.rapprove = false; cleanDrafts(); C.draw();
    });
  }
  function roster() { return (X.data && X.data.roster) || []; }
  function guest(id) { return roster().filter(function (g) { return g.guestId === id; })[0] || null; }
  function nameOf(g) { if (!g) return ''; return [g.nick || g.first, g.last].filter(Boolean).join(' ') || g.guestId; }
  function firstOf(id) { var g = guest(id); return g ? (g.nick || g.first || g.guestId) : id; }
  function evData(ev) { return X.data && X.data.seating && X.data.seating.events && X.data.seating.events[ev]; }
  function isCouple(id) { var g = guest(id); return !!(g && g.couple); }

  /* the confirmed plan of one event: seat → guest; the draft over it; the effective plan */
  function base(ev) { var m = {}; ((evData(ev) || {}).seats || []).forEach(function (s) { m[s.seatId] = s.guestId || null; }); return m; }
  function eff(ev) { var m = base(ev), d = X.draft[ev]; for (var k in d) if (Object.prototype.hasOwnProperty.call(d, k)) m[k] = d[k]; return m; }
  function seatOf(ev, gid, m) { m = m || eff(ev); for (var k in m) if (m[k] === gid) return k; return null; }
  function setSeat(ev, seatId, gid) {
    var b = base(ev);
    if (!Object.prototype.hasOwnProperty.call(X.seen[ev], seatId)) X.seen[ev][seatId] = b[seatId] || null;
    if (X.seen[ev][seatId] === (gid || null)) { delete X.draft[ev][seatId]; delete X.seen[ev][seatId]; } else X.draft[ev][seatId] = gid || null;
    X.conflict[ev] = X.conflict[ev].filter(function (k) { return Object.prototype.hasOwnProperty.call(X.draft[ev], k); });
  }
  /* after a read: a drafted seat whose holder is no longer what the Owner saw is a CONFLICT — kept, named, never sent as it was */
  function cleanDrafts() {
    ['ceremony', 'dinner'].forEach(function (ev) {
      var b = base(ev), d = X.draft[ev], sn = X.seen[ev];
      for (var k in d) if (!(k in b)) { delete d[k]; delete sn[k]; }
      X.conflict[ev] = Object.keys(d).filter(function (k) { return (b[k] || null) !== (sn[k] || null); });
      /* a guest the draft seats who meanwhile holds a seat OUTSIDE the draft (they chose one themselves): that seat is a conflict too */
      Object.keys(d).forEach(function (k) { var g = d[k]; if (!g) return; var at = seatOf(ev, g, b); if (at && !Object.prototype.hasOwnProperty.call(d, at) && X.conflict[ev].indexOf(at) < 0) X.conflict[ev].push(at); });
    });
    X.rconflict = Object.keys(X.rdraft).filter(function (k) { return rbase(k).slice().sort().join(',') !== (X.rseen[k] || []).slice().sort().join(','); });
  }
  /* the Owner keeps the draft on the plan as it is now: what is seen there now becomes the expectation — and the review shows
     every consequence (a guest the draft would now displace appears as a release) */
  function rebase(ev) {
    var b = base(ev);
    X.conflict[ev].forEach(function (k) {
      /* a seat outside the draft held by a guest the draft seats elsewhere: released in the draft (the review shows it) */
      if (!Object.prototype.hasOwnProperty.call(X.draft[ev], k)) { X.seen[ev][k] = b[k] || null; X.draft[ev][k] = null; return; }
      X.seen[ev][k] = b[k] || null; if (X.draft[ev][k] === (b[k] || null)) { delete X.draft[ev][k]; delete X.seen[ev][k]; }
    });
    X.conflict[ev] = []; X.review = null;
  }
  function pendingSeats(ev) {
    var b = base(ev), m = eff(ev), seen = {}, out = [];
    for (var k in X.draft[ev]) { if (b[k]) seen[b[k]] = 1; if (X.draft[ev][k]) seen[X.draft[ev][k]] = 1; }
    for (var g in seen) { var f = seatOf(ev, g, b), t = seatOf(ev, g, m); if (f !== t) out.push({ guestId: g, from: f, to: t }); }
    out.forEach(function (c) { c.type = !c.from ? 'Assign' : !c.to ? 'Release' : out.some(function (d) { return d !== c && d.from === c.to && d.to === c.from; }) ? 'Swap' : 'Move'; });
    return out;
  }
  function draftCount() { return Object.keys(X.draft.ceremony).length + Object.keys(X.draft.dinner).length + Object.keys(X.rdraft).length; }

  /* ---------------------------------------------------------------- seating: actions */
  function pickGuest(gid) {
    if (X.event === 'ceremony' && isCouple(gid)) { X.msg = 'The Bride\'s and the Groom\'s places are fixed at the front centre.'; return; }
    X.sel = X.sel === gid ? null : gid; X.msg = ''; X.err = '';
  }
  function clickSeat(seatId) {
    if (X.busy) return;   /* never a draft edit while a review or a confirmation is on its way */
    var ev = X.event, m = eff(ev), h = m[seatId] || null;
    X.err = ''; X.msg = '';
    if (!X.sel) { if (h) pickGuest(h); return; }
    var g = X.sel, from = seatOf(ev, g, m);
    if (h === g) { X.sel = null; return; }
    if (!h) { if (from) setSeat(ev, from, null); setSeat(ev, seatId, g); X.sel = null; X.review = null; return; }
    if (ev === 'ceremony' && isCouple(h)) return;
    if (!from) { X.err = label(seatId) + ' is taken by ' + firstOf(h) + '. Choose a free seat, or release ' + label(seatId) + ' first.'; return; }
    setSeat(ev, from, h); setSeat(ev, seatId, g); X.sel = null; X.review = null;
  }
  function release(gid) { if (X.busy) return; var ev = X.event, s = seatOf(ev, gid); if (s) setSeat(ev, s, null); X.sel = null; X.review = null; }
  /* undo ONE guest's change: the draft is rebuilt from every other pending change — never a partial deletion that could leave a guest
     on two seats; a seat another change of the draft now uses keeps that change (said, nothing undone) */
  function undo(gid) {
    if (X.busy) return;
    var ev = X.event, all = pendingSeats(ev), b = base(ev), out = {}, next, grew = true;
    out[gid] = 1;
    /* a guest drafted onto the seat of a guest being undone is undone with them (a swap, a chain of moves undo as one) */
    while (grew) {
      grew = false; next = {};
      var others = all.filter(function (c) { return !out[c.guestId]; });
      others.forEach(function (c) { if (c.to) next[c.to] = c.guestId; });
      others.forEach(function (c) { if (c.from && !Object.prototype.hasOwnProperty.call(next, c.from)) next[c.from] = null; });
      Object.keys(out).forEach(function (g) { var m0 = seatOf(ev, g, b); if (m0 && Object.prototype.hasOwnProperty.call(next, m0) && next[m0] !== g && !out[next[m0]]) { out[next[m0]] = 1; grew = true; } });
    }
    var undone = Object.keys(out).filter(function (g) { return g !== gid && all.some(function (c) { return c.guestId === g; }); });
    if (undone.length) X.msg = 'Undone together with ' + firstOf(gid) + ': ' + undone.map(firstOf).join(', ') + ' (their changes used each other\'s seats).';
    var seenWas = X.seen[ev]; X.draft[ev] = {}; X.seen[ev] = {};
    for (var k in next) { X.seen[ev][k] = Object.prototype.hasOwnProperty.call(seenWas, k) ? seenWas[k] : (b[k] || null); if (X.seen[ev][k] !== next[k]) X.draft[ev][k] = next[k]; else delete X.seen[ev][k]; }
    X.conflict[ev] = X.conflict[ev].filter(function (k) { return Object.prototype.hasOwnProperty.call(X.draft[ev], k); });
    X.review = null;
  }
  /* the group together: the selected guest's group members without a seat, on the next free seats after the selected guest's */
  function seatGroup(gid) {
    if (X.busy) return;
    var ev = X.event, g = guest(gid); if (!g || !g.group || !g.group.id) return;
    var m = eff(ev), order = ((evData(ev) || {}).seats || []).map(function (s) { return s.seatId; });
    var at = seatOf(ev, gid, m), start = at ? order.indexOf(at) + 1 : 0;
    /* only members who come to this event (or have not answered yet) — never one who answered "not joining" */
    var members = roster().filter(function (x) { return x.group && x.group.id === g.group.id && x.guestId !== gid && !seatOf(ev, x.guestId, m) && !(ev === 'ceremony' && x.couple) && x.attendance[ev] !== 'no'; });
    var placed = 0;
    for (var i = start; i < order.length && placed < members.length; i++) if (!m[order[i]]) { setSeat(ev, order[i], members[placed].guestId); m[order[i]] = members[placed].guestId; placed++; }
    X.msg = placed ? placed + ' of ' + firstOf(gid) + '\'s group placed on the next free seats — in the draft, not saved yet.' : 'Nobody of ' + firstOf(gid) + '\'s group is without a seat.';
    X.review = null;
  }
  function changeBody(ev, dry) {
    var target = {}, expect = {}, b = base(ev), d = X.draft[ev], sn = X.seen[ev];
    for (var k in d) { target[k] = d[k]; expect[k] = Object.prototype.hasOwnProperty.call(sn, k) ? sn[k] : (b[k] || null); }
    return { event: ev, target: target, expect: expect, dryRun: !!dry };
  }
  function reviewSeats() {
    var ev = X.event; if (!Object.keys(X.draft[ev]).length || X.conflict[ev].length) return;
    X.busy = true; X.err = ''; C.draw();
    var body = changeBody(ev, true);
    C.api('admin/seating/apply', { method: 'POST', body: body }).then(function (x) {
      X.busy = false;
      if (!x.ok) { X.err = problemWords(x.j); if (x.j.reason === 'CONFLICT') return load(); C.draw(); return; }
      /* the confirmation sends EXACTLY what was reviewed — the same seats, the same expectations */
      X.review = { event: ev, changes: x.j.changes || [], warnings: x.j.warnings || [], body: { event: body.event, target: body.target, expect: body.expect, dryRun: false } }; C.draw();
    });
  }
  function confirmSeats() {
    var ev = X.event; if (X.busy || !X.review || X.review.event !== ev || !X.review.body || X.conflict[ev].length) return;
    X.busy = true; X.err = ''; C.draw();
    C.api('admin/seating/apply', { method: 'POST', body: X.review.body }).then(function (x) {
      X.busy = false;
      if (x.status === 0 || x.status >= 500) { X.err = 'The answer did not arrive — the plan is read again; nothing is sent twice.'; X.review = null; return load(); }
      if (!x.ok) { X.err = problemWords(x.j); X.review = null; return x.j.reason === 'CONFLICT' ? load() : C.draw(); }
      X.draft[ev] = {}; X.seen[ev] = {}; X.conflict[ev] = []; X.review = null; X.sel = null;
      X.msg = 'Saved: ' + (x.j.changes || []).length + ' change' + ((x.j.changes || []).length === 1 ? '' : 's') + ' to the ' + EV[ev] + ' plan — the guests see them in their profiles now.';
      load();
    });
  }
  function problemWords(j) {
    var R = { CHANGED: 'changed since it was read', TWO_SEATS: 'a guest would hold two seats', COUPLE_FIXED: 'the couple\'s places are fixed', UNKNOWN_GUEST: 'not a guest of the register',
      NOT_ON_PLAN: 'not a seat of the plan', FAMILY: 'reserved', EXTRA_BED: 'a room with an extra bed — set by the extra-bed attribution, never re-arranged here', KEPT_PLACES: 'a place kept for a party',
      DEDICATED: 'a guest\'s own room', BEYOND_PLACES: 'more guests than the room\'s own places', BOOKING_CHANGE: 'a booking change, not an assignment', NO_BILLED_ROOM: 'the booking names no room',
      OWNER_RECORDED: 'fixed by a booking you recorded', UNREADABLE: 'could not be read' };
    var list = (j.problems || []).map(function (p) { return (p.seatId ? label(p.seatId) + ': ' : p.unit ? 'Room ' + String(p.unit).split('|').pop() + ': ' : p.guestId ? firstOf(p.guestId) + ': ' : '') + (p.text || R[p.reason] || p.reason || ''); });
    return (j.error || 'The change was not made.') + (list.length ? ' — ' + list.join(' · ') : '') + (j.reason === 'CONFLICT' ? ' The plan was read again; your draft is kept — review it once more.' : '');
  }
  function finalSeats(action) {
    if (X.busy) return;
    var ev = X.event, e = evData(ev);
    X.busy = true; X.err = ''; C.draw();
    C.api('admin/seating/final', { method: 'POST', body: { event: ev, action: action, expectDigest: e && e.digest } }).then(function (x) {
      X.busy = false; X.finalOpen = false; X.finalTick = false;
      if (!x.ok) { X.err = x.j.error || 'The release was not recorded.'; return x.j.reason === 'CONFLICT' ? load() : C.draw(); }
      X.msg = action === 'release' ? 'The final ' + EV[ev] + ' plan is released as version ' + x.j.final.version + '.' : 'The final ' + EV[ev] + ' plan is withdrawn — the plan is a working version again.';
      load();
    });
  }
  function selfService(body) {
    X.busy = true; X.err = ''; C.draw();
    C.api('admin/seating/state', { method: 'POST', body: body }).then(function (x) {
      X.busy = false; X.stateOpen = null;
      if (!x.ok) { X.err = x.j.error || 'Not changed.'; C.draw(); return; }
      X.msg = 'Guests\' own seat choice: ' + (x.j.frozen ? 'closed — guests see their seat and cannot change it.' : x.j.open ? 'open.' : 'not open.'); load();
    });
  }

  /* ---------------------------------------------------------------- seating: the words */
  function finalWords(f) {
    if (!f) return ['Not released — working version', ''];
    if (!f.active) return ['Final version ' + f.version + ' withdrawn', 'open'];
    return f.current ? ['FINAL · version ' + f.version + ' · released ' + C.when(f.at) + ' by ' + (WHO[f.by] || f.by), 'on'] : ['Changed since FINAL version ' + f.version + ' (' + C.when(f.at) + ')', 'open'];
  }
  function chip(t, cls) { return '<span class="ab-chip ' + (cls || '') + '">' + esc(t) + '</span>'; }
  function rowsOf(ev) {
    var e = evData(ev) || {}, out = {};
    (e.seats || []).forEach(function (s) { var k = s.side + (ev === 'ceremony' ? s.row : ''); (out[k] = out[k] || []).push(s); });
    return out;
  }
  function seatBtn(ev, s, m) {
    var g = m[s.seatId] || null, b = base(ev)[s.seatId] || null, changed = (g || null) !== (b || null);
    var placed = !changed && g && s.by && /^owners:/.test(s.by), sel = X.sel && g === X.sel;
    var st = !g ? 'free' : placed ? 'placed' : 'held';
    var cls = 'as-seat as-st-' + st + (sel ? ' as-sel' : '') + (changed ? ' as-chg' : '');
    var words = label(s.seatId) + ', ' + (g ? firstOf(g) + (placed ? ', placed by you' : ', chosen by the guest') : 'free') + (changed ? ', changed in your draft' : '');
    return '<button type="button" class="' + cls + '" data-as-seat="' + esc(s.seatId) + '" aria-label="' + esc(words) + '" aria-pressed="' + (sel ? 'true' : 'false') + '"><b>' + esc(label(s.seatId)) + '</b><small>' + esc(g ? firstOf(g) : 'free') + '</small></button>';
  }
  function ceremonyPlan() {
    var e = evData('ceremony') || {}, m = eff('ceremony'), rows = rowsOf('ceremony'), h = '';
    var front = (e.couple || []).map(function (c) { return '<span class="as-seat as-couple" aria-label="' + esc((c.position === 'BRIDE' ? 'The Bride' : 'The Groom') + ', ' + (c.name || '')) + ', fixed at the front centre"><b>' + (c.position === 'BRIDE' ? 'Bride' : 'Groom') + '</b><small>' + esc(c.name || '—') + '</small></span>'; });
    /* the couple's two places at the front centre, at the aisle — exactly where the ceremony has them (never moved by this page) */
    h += '<div class="as-front"><span class="as-rn"></span><span class="as-blk as-l as-fl">' + (front[0] || '') + '</span><span class="as-aisle" aria-hidden="true"></span><span class="as-blk as-r">' + (front[1] || '') + '</span></div>';
    for (var r = 1; r <= 11; r++) {
      var L = rows['L' + r] || [], R = rows['R' + r] || [];
      if (!L.length && !R.length) continue;
      h += '<div class="as-row"><span class="as-rn">' + r + '</span><span class="as-blk as-l">' + L.map(function (s) { return seatBtn('ceremony', s, m); }).join('') + '</span><span class="as-aisle" aria-hidden="true"></span><span class="as-blk as-r">' + R.map(function (s) { return seatBtn('ceremony', s, m); }).join('') + '</span></div>';
    }
    return '<div class="as-plan as-cer" role="group" aria-label="Vow Ceremony seating plan: the Bride and the Groom at the front centre, a left block of two seats (rows 1–11) and a right block of three seats (rows 1–10)">' + h + '</div>';
  }
  function dinnerPlan() {
    var m = eff('dinner'), rows = rowsOf('dinner'), pool = (evData('dinner') || {}).poolSide === 'B' ? 'B' : 'T';
    var side = function (k) { return '<div class="as-side"><span class="as-sl">Side ' + (k === 'T' ? 'A' : 'B') + (pool === k ? ' · poolside' : '') + '</span><div class="as-drow">' + (rows[k] || []).map(function (s) { return seatBtn('dinner', s, m); }).join('') + '</div></div>'; };
    return '<div class="as-plan as-din" role="group" aria-label="Wedding Dinner seating plan: one long table, side A and side B">' + side('T') + '<div class="as-table" aria-hidden="true">One long table</div>' + side('B') + '</div>';
  }
  function filtered(ev) {
    var q = X.q.toLowerCase(), m = eff(ev);
    return roster().filter(function (g) {
      if (q && (nameOf(g) + ' ' + g.guestId + ' ' + (g.group.with || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      if (X.group && g.group.id !== X.group) return false;
      if (X.room) { var rm = (g.rooms || []).filter(function (x) { return x.window === 'wedstay' || x.window === 'guesthouse'; })[0]; if (!rm || rm.key + '|' + rm.label !== X.room) return false; }
      var seat = ev === 'ceremony' && g.couple ? g.couple : seatOf(ev, g.guestId, m), a = g.attendance[ev];
      if (X.status === 'unassigned') return !seat && (a === 'yes' || a === 'undecided');
      if (X.status === 'assigned') return !!seat;
      if (X.status === 'placed') return !!g.placed[ev];
      if (X.status === 'notjoining') return a === 'no';
      if (X.status === 'conflict') return !!seat && a === 'no';
      if (X.status === 'unconfirmed') return g.booking !== 'CONFIRMED';
      return true;
    });
  }
  function counts(ev) {
    var e = evData(ev) || {}, m = eff(ev), seats = e.seats || [], held = seats.filter(function (s) { return m[s.seatId]; }).length;
    var couple = ev === 'ceremony' ? (e.couple || []).length : 0, cap = (X.data.capacity || {})[ev] || {};
    var unassigned = roster().filter(function (g) { var a = g.attendance[ev]; return !(ev === 'ceremony' && g.couple) && !seatOf(ev, g.guestId, m) && a === 'yes'; }).length;
    return { chairs: seats.length, held: held, free: seats.length - held, couple: couple, people: X.data.people, cap: cap, unassigned: unassigned };
  }
  function seatingView() {
    if (X.phase !== 'ready') return gate();
    var ev = X.event, e = evData(ev);
    if (!e || !e.configured) return '<div class="p-card"><p class="t-b1">The ' + EV[ev] + ' plan is not configured yet.</p></div>';
    var k = counts(ev), fw = finalWords(e.final), pend = pendingSeats(ev), S = X.data.seating, ev2 = X.data.events && X.data.events[ev];
    var h = '<section class="ab-seating" data-as-area="seating"><p class="t-l1">Seating Management — Ceremony &amp; Dinner</p>';
    h += '<nav class="as-sw" aria-label="Event"><button type="button" class="ab-filter' + (ev === 'ceremony' ? ' on' : '') + '" data-as-event="ceremony">Vow Ceremony</button><button type="button" class="ab-filter' + (ev === 'dinner' ? ' on' : '') + '" data-as-event="dinner">Wedding Dinner</button></nav>';
    h += '<div class="as-kpi" data-as-kpi>' +
      '<div><span class="t-l1">Capacity</span><b>' + k.people + '</b><small>' + (ev === 'ceremony' ? k.chairs + ' chairs + the couple\'s ' + k.couple + ' places' : k.chairs + ' chairs · the couple hold two of them') + '</small></div>' +
      '<div><span class="t-l1">Occupied</span><b>' + (k.held + k.couple) + '</b><small>' + k.held + ' chairs' + (k.couple ? ' + the couple' : '') + '</small></div>' +
      '<div><span class="t-l1">Free</span><b>' + k.free + '</b><small>chairs</small></div>' +
      '<div><span class="t-l1">Joining · no seat</span><b>' + k.unassigned + '</b><small>answered "joining"</small></div>' +
      '<div><span class="t-l1">Release</span>' + chip(fw[0], fw[1]) + '</div></div>';
    h += '<p class="t-b2 ab-mute">' + esc(ev2 ? ev2.dateWords + ' · ' + ev2.venue : '') + ' · Guests\' own seat choice: ' + (S.frozen ? '<b>closed (frozen)</b> — guests see their seat and cannot change it' : S.open ? '<b>open</b> — guests may still choose and change their own seats' : '<b>not open</b>') + '. ' +
      '<button type="button" class="p-link" data-as-state="' + (S.frozen ? 'unfreeze' : 'freeze') + '">' + (S.frozen ? 'Reopen guests\' own choice…' : 'Close guests\' own choice (freeze)…') + '</button></p>';
    if (X.stateOpen) h += '<div class="ab-note" data-as-state-panel><p class="t-b2">' + (X.stateOpen === 'freeze' ? 'Freeze the seating: every guest keeps their seat and sees it in their profile; nobody can change their own seat any more. You can still change every seat here.' : 'Reopen: guests may choose and change their own seats again (a seat you placed stays locked for the guest).') + '</p><div class="ab-actions"><button type="button" class="p-act" data-as-state-go="' + X.stateOpen + '"' + (X.busy ? ' disabled' : '') + '>' + (X.stateOpen === 'freeze' ? 'Freeze guests\' own choice' : 'Reopen guests\' own choice') + '</button><button type="button" class="p-link" data-as-state-cancel>Cancel</button></div></div>';
    if (X.msg) h += '<p class="ab-msg" role="status">' + esc(X.msg) + '</p>';
    if (X.err) h += '<p class="ab-err" role="alert">' + esc(X.err) + '</p>';
    var sg = X.sel ? guest(X.sel) : null;
    h += '<div class="as-hint" role="status">' + (sg ? '<b>' + esc(nameOf(sg)) + '</b> (' + esc(sg.guestId) + ') selected · now ' + (seatOf(ev, sg.guestId) ? 'at ' + esc(label(seatOf(ev, sg.guestId))) : 'without a seat') + ' — choose a free seat to move them there, or a taken seat to swap. ' +
      (seatOf(ev, sg.guestId) ? '<button type="button" class="p-link" data-as-release="' + esc(sg.guestId) + '">Release the seat</button> · ' : '') + (sg.group && sg.group.size > 1 ? '<button type="button" class="p-link" data-as-group="' + esc(sg.guestId) + '">Seat the group together</button> · ' : '') + '<button type="button" class="p-link" data-as-unsel>Cancel</button>'
      : 'Choose a guest — in the plan or in the list — then the seat for them.') + '</div>';
    /* the ceremony plan and the list side by side on a wide screen; the long table (27 a side) always above the list, scrolling in its own box */
    h += '<div class="as-layout' + (ev === 'ceremony' ? ' as-two' : '') + '"><div class="as-planbox">' + (ev === 'ceremony' ? ceremonyPlan() : dinnerPlan()) +
      '<p class="as-legend"><span class="as-seat as-st-free"><b>A1</b></span> free <span class="as-seat as-st-held"><b>A1</b></span> chosen by the guest <span class="as-seat as-st-placed"><b>A1</b></span> placed by you <span class="as-seat as-chg"><b>A1</b></span> changed in your draft' + (ev === 'ceremony' ? ' <span class="as-seat as-couple"><b>Bride</b></span> fixed' : '') + '</p></div>';
    h += '<div class="as-listbox">' + pendingPanel(ev, pend) + guestTable(ev) + '</div></div>';
    h += finalPanel(ev, e) + exportsBar('seating') + logPanel(S.log, 'seating');
    return h + '</section>';
  }
  function pendingPanel(ev, pend) {
    var drafted = Object.keys(X.draft[ev]).length, cf = X.conflict[ev];
    if (!pend.length && !drafted) return '<div class="as-pend ab-mute t-b2">No unsaved changes. Everything you see is the confirmed plan the guests see.</div>';
    var h = '<div class="as-pend p-card" data-as-pending><p class="t-l1">Your draft · ' + pend.length + ' change' + (pend.length === 1 ? '' : 's') + ' · not saved, not visible to guests</p>';
    if (cf.length) h += '<div class="ab-warn" data-as-conflict><p class="t-l1">Changed since you drafted it</p><p class="t-b2">' + cf.map(function (k) { var now = base(ev)[k]; return esc(label(k)) + ' — now ' + esc(now ? firstOf(now) : 'free'); }).join(' · ') + '. Someone (a guest or the other of you) changed these seats meanwhile.</p><div class="ab-actions"><button type="button" class="p-act ab-ghost" data-as-rebase>Keep my draft on the plan as it is now</button><button type="button" class="p-link" data-as-discard>Discard the draft</button></div></div>';
    h += '<ul class="as-chg">';
    pend.forEach(function (c) { h += '<li>' + esc(c.type) + ' · <b>' + esc(firstOf(c.guestId)) + '</b> ' + esc((c.from ? label(c.from) : 'no seat') + ' → ' + (c.to ? label(c.to) : 'no seat')) + ' <button type="button" class="p-link" data-as-undo="' + esc(c.guestId) + '">Undo</button></li>'; });
    h += '</ul>';
    if (X.review && X.review.event === ev) {
      h += '<div class="ab-note" data-as-review><p class="t-l1">Review — what the confirmation will do</p><ul class="as-chg">' + X.review.changes.map(function (c) { return '<li>' + esc(c.type.charAt(0) + c.type.slice(1).toLowerCase()) + ' · ' + esc(firstOf(c.guestId)) + ': ' + esc((c.from ? label(c.from) : 'no seat') + ' → ' + (c.to ? label(c.to) : 'no seat')) + '</li>'; }).join('') + '</ul>' +
        (X.review.warnings.length ? '<div class="ab-warn"><p class="t-l1">Please check</p><ul class="as-chg">' + X.review.warnings.map(function (w) { return '<li>' + esc(firstOf(w.guestId)) + ' (' + esc(label(w.seatId)) + ') ' + esc(w.text) + '</li>'; }).join('') + '</ul></div>' : '') +
        '<p class="t-b2">Confirming writes these changes to the seating plan at once: each guest sees the new seat in their profile, the plan and the exports show it. Nothing about bookings, prices or invoices changes.</p>' +
        '<div class="ab-actions"><button type="button" class="p-act" data-as-confirm' + (X.busy ? ' disabled' : '') + '>Confirm &amp; publish to the guests</button><button type="button" class="p-link" data-as-discard>Discard the draft</button></div></div>';
    } else if (!cf.length) h += '<div class="ab-actions"><button type="button" class="p-act ab-ghost" data-as-review' + (X.busy || !pend.length ? ' disabled' : '') + '>Review the changes</button><button type="button" class="p-link" data-as-discard>Discard the draft</button></div>';
    return h + '</div>';
  }
  function guestTable(ev) {
    var list = filtered(ev), m = eff(ev), groups = {};
    roster().forEach(function (g) { if (g.group && g.group.id && g.group.size > 1) groups[g.group.id] = groups[g.group.id] || [nameOf(g)].concat(g.group.with || []).join(', '); });
    var rooms = {}; roster().forEach(function (g) { (g.rooms || []).forEach(function (r) { if (r.window === 'wedstay' || r.window === 'guesthouse') rooms[r.key + '|' + r.label] = (r.window === 'guesthouse' ? 'Guest House' : r.key.split('/')[1]) + ' · Room ' + r.label; }); });
    var opt = function (v, t, cur) { return '<option value="' + esc(v) + '"' + (cur === v ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var h = '<div class="ab-tools"><label class="ab-search"><span class="t-l1">Search</span><input type="search" data-as-q value="' + esc(X.q) + '" placeholder="Name, guest ID or group" aria-label="Search guests"></label>' +
      '<label class="ab-search"><span class="t-l1">Group</span><select data-as-group-f>' + opt('', 'All groups', X.group) + Object.keys(groups).sort(function (a, b) { return groups[a].localeCompare(groups[b]); }).map(function (k) { return opt(k, groups[k], X.group); }).join('') + '</select></label>' +
      '<label class="ab-search"><span class="t-l1">Room (wedding stay)</span><select data-as-room-f>' + opt('', 'All rooms', X.room) + Object.keys(rooms).sort().map(function (k) { return opt(k, rooms[k], X.room); }).join('') + '</select></label>' +
      '<label class="ab-search"><span class="t-l1">Status</span><select data-as-status-f>' + [['all', 'Everyone'], ['unassigned', 'Joining · no seat'], ['assigned', 'With a seat'], ['placed', 'Placed by you'], ['notjoining', 'Not joining'], ['conflict', 'Seat held · not joining'], ['unconfirmed', 'Booking not confirmed']].map(function (x) { return opt(x[0], x[1], X.status); }).join('') + '</select></label></div>';
    h += '<div class="ab-table-wrap"><table class="ab-table as-guests" data-as-guests><thead><tr><th>Guest</th><th>Guest ID</th><th>Group</th><th>Booking</th><th>' + esc(EV[ev]) + '</th><th>Seat</th><th>Room</th><th></th></tr></thead><tbody>';
    list.forEach(function (g) {
      var seat = ev === 'ceremony' && g.couple ? g.couple : seatOf(ev, g.guestId, m), was = ev === 'ceremony' && g.couple ? g.couple : seatOf(ev, g.guestId, base(ev)), b = BOOK[g.booking] || [g.booking, ''], a = g.attendance[ev];
      var rm = (g.rooms || []).filter(function (x) { return x.window === 'wedstay' || x.window === 'guesthouse'; })[0];
      h += '<tr class="' + (X.sel === g.guestId ? 'as-on' : '') + '"><td data-l="Guest"><span class="ab-name">' + esc(nameOf(g)) + '</span></td><td data-l="Guest ID">' + esc(g.guestId) + '</td><td data-l="Group">' + esc((g.group.with || []).join(', ') || '—') + '</td>' +
        '<td data-l="Booking">' + chip(b[0], b[1]) + '</td><td data-l="' + esc(EV[ev]) + '">' + chip(ANS[a] || a, a === 'yes' ? 'on' : a === 'no' ? 'open' : '') + '</td>' +
        '<td data-l="Seat">' + (seat ? '<b>' + esc(label(seat)) + '</b>' : '<span class="ab-mute">no seat</span>') + (seat !== was ? ' <span class="ab-chip open">draft</span>' : g.placed[ev] ? ' <span class="ab-mute">· placed by you</span>' : '') + '</td>' +
        '<td data-l="Room">' + (rm ? esc((rm.window === 'guesthouse' ? 'Guest House' : 'Room ' + rm.label)) : '<span class="ab-mute">—</span>') + '</td>' +
        '<td>' + (ev === 'ceremony' && g.couple ? '<span class="ab-mute">fixed</span>' : '<button type="button" class="p-link" data-as-pick="' + esc(g.guestId) + '">' + (X.sel === g.guestId ? 'Selected' : 'Select') + '</button>' + (seat ? ' · <button type="button" class="p-link" data-as-release="' + esc(g.guestId) + '">Release</button>' : '')) + '</td></tr>';
    });
    return h + '</tbody></table></div><p class="ab-foot">' + list.length + ' of ' + roster().length + ' guests shown.</p>';
  }
  function finalPanel(ev, e) {
    var f = e.final, pend = Object.keys(X.draft[ev]).length;
    var h = '<div class="p-card ab-panel" data-as-final><p class="t-l1">Final ' + esc(EV[ev]) + ' plan for the hand-over</p>';
    if (pend) return h + '<p class="t-b2">Confirm or discard your draft first — a release fixes the confirmed plan only.</p></div>';
    if (!X.finalOpen) return h + '<p class="t-b2">' + esc(finalWords(f)[0]) + '.</p><div class="ab-actions"><button type="button" class="p-act ab-ghost" data-as-final-open>Release this plan as final…</button>' + (f && f.active ? '<button type="button" class="p-link" data-as-final-withdraw>Withdraw the final version ' + f.version + '</button>' : '') + '</div></div>';
    return h + '<p class="t-b2">Releasing records this exact plan — every seat and who sits there — as version ' + ((f ? f.version : 0) + 1) + ', with your name and the time. The exports then say FINAL; any later change shows as "changed since". ' + (X.data.seating.frozen ? '' : 'Guests can still choose their own seats while seating is open — consider freezing it first.') + '</p>' +
      '<label class="ab-tick"><input type="checkbox" data-as-final-tick' + (X.finalTick ? ' checked' : '') + '> This is the final ' + esc(EV[ev]) + ' seating plan for the hand-over.</label>' +
      '<div class="ab-actions"><button type="button" class="p-act" data-as-final-go' + (X.finalTick && !X.busy ? '' : ' disabled') + '>Release as final</button><button type="button" class="p-link" data-as-final-cancel>Cancel</button></div></div>';
  }
  function logPanel(list, area) {
    list = list || [];
    var open = area === 'seating' ? X.logOpen : X.rlogOpen, shown = open ? list : list.slice(0, 8);
    var T = { ASSIGN: 'Assigned', MOVE: 'Moved', SWAP: 'Swapped', RELEASE: 'Released', FINAL_RELEASED: 'Final released', FINAL_WITHDRAWN: 'Final withdrawn', SELF_SERVICE: 'Guests\' own choice' };
    var h = '<div class="p-card ab-panel" data-as-log="' + area + '"><p class="t-l1">Change log · ' + list.length + '</p>';
    if (!list.length) return h + '<p class="t-b2 ab-mute">No change has been made here yet.</p></div>';
    h += '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>When</th><th>Who</th><th>Change</th><th>Guest</th><th>Before</th><th>After</th><th>Status</th></tr></thead><tbody>';
    shown.forEach(function (e) {
      var what = (T[e.type] || e.type) + (e.event ? ' · ' + EV[e.event] : '') + (e.key ? ' · ' + e.key.split('/')[1] : '') + (e.version ? ' · version ' + e.version : '');
      var f = e.key ? (e.from ? 'Room ' + e.from : '') : e.from && /^[CD]-/.test(e.from) ? label(e.from) : (e.from || '');
      var t = e.key ? (e.to ? 'Room ' + e.to : '') : e.to && /^[CD]-/.test(e.to) ? label(e.to) : (e.to || '');
      h += '<tr><td>' + esc(C.when(e.at)) + '</td><td>' + esc(WHO[e.by] || e.by || '') + '</td><td>' + esc(what) + '</td><td>' + esc(e.guestId ? firstOf(e.guestId) + ' · ' + e.guestId : '') + '</td><td>' + esc(f || '—') + '</td><td>' + esc(t || '—') + '</td><td>' + esc((e.status || '').toLowerCase()) + (e.roomCountApproved ? ' · room count approved' : '') + '</td></tr>';
    });
    h += '</tbody></table></div>';
    if (list.length > 8) h += '<button type="button" class="p-link" data-as-log-more="' + area + '">' + (open ? 'Show the latest 8' : 'Show all ' + list.length) + '</button>';
    return h + '</div>';
  }
  function exportsBar(area) {
    var sep = C.csvSep(), items = area === 'seating'
      ? [['ceremony', 'CSV · Final Ceremony Seating Plan'], ['dinner', 'CSV · Final Dinner Seating Plan'], ['rooming', 'CSV · Final Hotel Rooming List'], ['outstanding', 'CSV · Unassigned guests / outstanding']]
      : [['rooming', 'CSV · Final Hotel Rooming List'], ['outstanding', 'CSV · Unassigned guests / outstanding'], ['ceremony', 'CSV · Ceremony plan'], ['dinner', 'CSV · Dinner plan']];
    return '<div class="ab-export" data-as-export>' + items.map(function (x) { return '<button type="button" class="ab-filter" data-as-csv="' + x[0] + '">' + esc(x[1]) + '</button>'; }).join('') +
      '<label class="ab-sep"><span class="ab-mute">CSV for</span> <select data-ab-csvsep aria-label="CSV format"><option value=","' + (sep === ',' ? ' selected' : '') + '>Excel · comma</option><option value=";"' + (sep === ';' ? ' selected' : '') + '>Excel Europe · semicolon</option></select></label>' +
      (draftCount() ? '<p class="ab-why">Exports show the confirmed plans only — your unsaved draft is not in them.</p>' : '') + '</div>';
  }
  function gate() {
    if (X.phase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(X.error) + '</p><div class="p-actions"><button type="button" class="p-link" data-as-reload>Try again</button></div></div>';
    return '<p class="t-b2 ab-progress" role="status">Reading the seating plans, the rooms and every guest…</p>';
  }

  /* ---------------------------------------------------------------- rooms */
  function stays() { return (X.data && X.data.rooms && X.data.rooms.stays) || []; }
  function unitOf(key, labelId) { var out = null; stays().forEach(function (s) { s.categories.forEach(function (c) { if (c.key === key) c.units.forEach(function (u) { if (u.label === labelId) out = u; }); }); }); return out; }
  function rbase(k) { var p = k.split('|'), u = unitOf(p[0], p[1]); return u ? u.occupants.map(function (o) { return o.guestId; }) : []; }
  function reff(k) { return X.rdraft[k] ? X.rdraft[k].slice() : rbase(k); }
  function rset(k, list) {
    if (!Object.prototype.hasOwnProperty.call(X.rseen, k)) X.rseen[k] = rbase(k).slice();
    if (list.slice().sort().join(',') === X.rseen[k].slice().sort().join(',')) { delete X.rdraft[k]; delete X.rseen[k]; } else X.rdraft[k] = list;
  }
  function rlocked(u) { return u.extraBeds ? 'extra bed — set by the extra-bed attribution' : u.dedicated ? 'a guest\'s own room' : u.kept ? 'a place kept for a party' : u.occupants.length > u.places ? 'more guests than places' : ''; }
  function rpick(gid, key, lab) { X.rerr = ''; X.rmsg = ''; if (X.rsel && X.rsel.guestId === gid) { X.rsel = null; return; } X.rsel = { guestId: gid, key: key, label: lab }; }
  function rclickUnit(key, lab, onGuest) {
    if (X.busy) return;
    X.rerr = ''; X.rmsg = '';
    var s = X.rsel; if (!s) return;
    if (s.key !== key) { X.rerr = 'Another room category is a booking change (its rate, its nights) — not a room assignment. It is made in the booking itself.'; return; }
    if (s.label === lab) { X.rsel = null; return; }
    var to = key + '|' + lab, from = key + '|' + s.label, u = unitOf(key, lab), lock = rlocked(u);
    if (lock) { X.rerr = 'Room ' + lab + ' is not re-arranged here: ' + lock + '.'; return; }
    var tl = reff(to), fl = reff(from).filter(function (g) { return g !== s.guestId; });
    if (onGuest) { tl = tl.filter(function (g) { return g !== onGuest; }); tl.push(s.guestId); fl.push(onGuest); }
    else { if (tl.length >= u.places) { X.rerr = 'Room ' + lab + ' is full (' + u.places + ' places). Choose a guest in it to swap, or another room.'; return; } tl.push(s.guestId); }
    rset(to, tl); rset(from, fl); X.rsel = null; X.rreview = null; X.rapprove = false;
  }
  function rpending() {
    var from = {}, to = {}, out = [];
    Object.keys(X.rdraft).forEach(function (k) { rbase(k).forEach(function (g) { from[g] = k; }); X.rdraft[k].forEach(function (g) { to[g] = k; }); });
    Object.keys(to).forEach(function (g) { if (from[g] !== to[g]) out.push({ guestId: g, from: from[g] || null, to: to[g] }); });
    out.forEach(function (c) { c.type = out.some(function (d) { return d !== c && d.from === c.to && d.to === c.from; }) ? 'Swap' : 'Move'; });
    return out;
  }
  function rchangeBody(dry) {
    var target = {}, expect = {};
    /* a change names every room it touches — the guests' rooms of departure included */
    var keys = {}; rpending().forEach(function (c) { if (c.from) keys[c.from] = 1; keys[c.to] = 1; });
    Object.keys(X.rdraft).forEach(function (k) { keys[k] = 1; });
    Object.keys(keys).forEach(function (k) { target[k] = reff(k); expect[k] = Object.prototype.hasOwnProperty.call(X.rseen, k) ? X.rseen[k].slice() : rbase(k); });
    return { target: target, expect: expect, dryRun: !!dry, approveRoomCount: !!X.rapprove };
  }
  function rgroups() {
    /* the draft may touch several categories (each its own change) — one confirmation per category */
    var by = {}; Object.keys(X.rdraft).forEach(function (k) { var key = k.split('|')[0]; (by[key] = by[key] || []).push(k); });
    return Object.keys(by);
  }
  function rbodyOf(key, dry) {
    var b = rchangeBody(dry), t = {}, e = {};
    Object.keys(b.target).forEach(function (k) { if (k.split('|')[0] === key) { t[k] = b.target[k]; e[k] = b.expect[k]; } });
    return { target: t, expect: e, dryRun: !!dry, approveRoomCount: !!X.rapprove };
  }
  function reviewRooms() {
    var keys = rgroups(); if (!keys.length || X.rconflict.length) return;
    X.busy = true; X.rerr = ''; C.draw();
    var res = [], i = 0;
    var next = function () {
      if (i >= keys.length) { X.busy = false; X.rreview = { results: res }; C.draw(); return; }
      var key = keys[i++], body = rbodyOf(key, true);
      C.api('admin/rooms/apply', { method: 'POST', body: body }).then(function (x) {
        if (!x.ok) { X.busy = false; X.rerr = problemWords(x.j); X.rreview = null; return x.j.reason === 'CONFLICT' ? load() : C.draw(); }
        /* the confirmation sends exactly what was reviewed (the approval tick aside) */
        res.push({ key: key, changes: x.j.changes || [], impacts: x.j.impacts || [], body: { target: body.target, expect: body.expect, dryRun: false } }); next();
      });
    };
    next();
  }
  function confirmRooms() {
    if (X.busy || !X.rreview || X.rconflict.length) return;
    var results = X.rreview.results, needs = results.some(function (r) { return r.impacts.length; });
    if (needs && !X.rapprove) { X.rerr = 'Tick the approval of the changed room count first.'; C.draw(); return; }
    X.busy = true; X.rerr = ''; C.draw();
    var done = 0, i = 0;
    var next = function () {
      if (i >= results.length) { X.busy = false; X.rdraft = {}; X.rseen = {}; X.rconflict = []; X.rreview = null; X.rapprove = false; X.rmsg = 'Saved: ' + done + ' room change' + (done === 1 ? '' : 's') + ' — the guests see their rooms in their profiles now; bookings, rates and invoices are unchanged.'; load(); return; }
      var r = results[i++], key = r.key, body = { target: r.body.target, expect: r.body.expect, dryRun: false, approveRoomCount: !!X.rapprove };
      var saved = function () { return done ? ' ' + done + ' room change' + (done === 1 ? ' was' : 's were') + ' saved before this.' : ''; };
      C.api('admin/rooms/apply', { method: 'POST', body: body }).then(function (x) {
        if (x.status === 0 || x.status >= 500) { X.busy = false; X.rerr = 'The answer did not arrive — the rooms are read again; nothing is sent twice.' + saved(); X.rreview = null; return load(); }
        if (!x.ok) { X.busy = false; X.rerr = problemWords(x.j) + saved(); X.rreview = null; return load(); }
        done += (x.j.changes || []).length;
        Object.keys(X.rdraft).forEach(function (k) { if (k.split('|')[0] === key) { delete X.rdraft[k]; delete X.rseen[k]; } });
        next();
      });
    };
    next();
  }
  function finalRooms(action) {
    if (X.busy) return;
    X.busy = true; X.rerr = ''; C.draw();
    C.api('admin/rooms/final', { method: 'POST', body: { action: action, expectDigest: X.data.rooms.digest } }).then(function (x) {
      X.busy = false; X.rfinalOpen = false; X.rfinalTick = false;
      if (!x.ok) { X.rerr = x.j.error || 'The release was not recorded.'; return x.j.reason === 'CONFLICT' ? load() : C.draw(); }
      X.rmsg = action === 'release' ? 'The final rooming list is released as version ' + x.j.final.version + '.' : 'The final rooming list is withdrawn.'; load();
    });
  }
  function bookingIds() {
    /* the booking IDs the Revenue overview already read (Finance / Rooms tabs) — never a read of their own */
    var out = {}, R = C.revenue(), BG = R && R.budget;
    ((BG && BG.centres) || []).forEach(function (c) { (c.rooms || []).forEach(function (r) { (r.lines || []).forEach(function (l) { if (l.person && l.bookingId) out[c.id + '|' + l.person] = out[c.id + '|' + l.person] || l.bookingId; }); }); });
    return out;
  }
  var STAY_CENTRE = { 'bkk-stay': 'A2', prewed: 'C', wedstay: 'D1', guesthouse: 'D2', kmg: 'F', ljg: 'H', kempinski: 'J' };
  function dates(s) { return s.checkIn ? C.day(s.checkIn) + ' – ' + C.day(s.checkOut) : 'dates from 002 not read'; }
  function roomsView() {
    if (X.phase !== 'ready') return gate();
    var R = X.data.rooms, fw = finalWords(R.final), pend = rpending();
    var h = '<section class="ab-assign" data-as-area="rooms"><p class="t-l1">Room Assignments</p><h2 class="t-h1">Who sleeps where — every stay</h2>' +
      '<p class="t-b2 ab-mute">Choose a guest, then a room of the same category: a free place moves them, a guest swaps with them. Another category or stay is a booking change and is never made here. Rooms with an extra bed, a guest\'s own room and a place kept for a party stay as they are. Room labels are allocation labels, not the hotel\'s room numbers.</p>' +
      '<div class="as-kpi"><div><span class="t-l1">Guests in rooms</span><b>' + stays().reduce(function (n, s) { return n + s.guests; }, 0) + '</b><small>places held, all stays</small></div><div><span class="t-l1">Waiting list</span><b>' + (R.waitlist || []).length + '</b><small>no room yet</small></div><div><span class="t-l1">Release</span>' + chip(fw[0], fw[1]) + '</div></div>';
    if (X.rmsg) h += '<p class="ab-msg" role="status">' + esc(X.rmsg) + '</p>';
    if (X.rerr) h += '<p class="ab-err" role="alert">' + esc(X.rerr) + '</p>';
    var s0 = X.rsel ? guest(X.rsel.guestId) : null;
    h += '<div class="as-hint" role="status">' + (s0 ? '<b>' + esc(nameOf(s0)) + '</b> (' + esc(s0.guestId) + ') selected in Room ' + esc(X.rsel.label) + ' — choose another room of the same category, or a guest there to swap. <button type="button" class="p-link" data-as-runsel>Cancel</button>' : 'Choose a guest in a room.') + '</div>';
    if (pend.length) {
      h += '<div class="as-pend p-card" data-as-rpending><p class="t-l1">Your draft · ' + pend.length + ' change' + (pend.length === 1 ? '' : 's') + ' · not saved, not visible to guests</p><ul class="as-chg">' +
        pend.map(function (c) { return '<li>' + c.type + ' · <b>' + esc(firstOf(c.guestId)) + '</b> ' + esc(c.to.split('|')[0].split('/')[1] + ': Room ' + (c.from ? c.from.split('|')[1] : '—') + ' → Room ' + c.to.split('|')[1]) + '</li>'; }).join('') + '</ul>';
      if (X.rconflict.length) h += '<div class="ab-warn" data-as-rconflict><p class="t-l1">Changed since you drafted it</p><p class="t-b2">' + X.rconflict.map(function (k) { return 'Room ' + esc(k.split('|')[1]) + ' (' + esc(k.split('|')[0].split('/')[1]) + ') — now ' + esc(rbase(k).map(firstOf).join(', ') || 'empty'); }).join(' · ') + '. Discard the draft and arrange these rooms again on the current list.</p><div class="ab-actions"><button type="button" class="p-link" data-as-rdiscard>Discard the draft</button></div></div>';
      else if (X.rreview) {
        var imp = []; X.rreview.results.forEach(function (r) { imp = imp.concat(r.impacts); });
        h += '<div class="ab-note" data-as-rreview><p class="t-l1">Review — what the confirmation will do</p><p class="t-b2">Each guest keeps their booking — the same category, the same nights, the same rate and invoice; only the room they share changes, and they see it in their profile.</p>' +
          (imp.length ? '<div class="ab-warn"><p class="t-l1">Financial impact — your approval is needed</p><ul class="as-chg">' + imp.map(function (m) { return '<li>' + esc(m.words) + '</li>'; }).join('') + '</ul><label class="ab-tick"><input type="checkbox" data-as-rapprove' + (X.rapprove ? ' checked' : '') + '> We approve the changed number of occupied rooms; Google 004 is updated separately, only on our order.</label></div>' : '') +
          '<div class="ab-actions"><button type="button" class="p-act" data-as-rconfirm' + (X.busy || (imp.length && !X.rapprove) ? ' disabled' : '') + '>Confirm &amp; publish to the guests</button><button type="button" class="p-link" data-as-rdiscard>Discard the draft</button></div></div>';
      } else h += '<div class="ab-actions"><button type="button" class="p-act ab-ghost" data-as-rreview' + (X.busy ? ' disabled' : '') + '>Review the changes</button><button type="button" class="p-link" data-as-rdiscard>Discard the draft</button></div>';
      h += '</div>';
    } else h += '<div class="as-pend ab-mute t-b2">No unsaved changes. Everything you see is the confirmed rooming the guests see.</div>';
    stays().forEach(function (s) {
      h += '<div class="p-card ab-panel as-stay" data-as-stay="' + esc(s.window) + '"><p class="t-l1">' + esc(s.label) + '</p><h3 class="t-h1">' + esc(s.hotel) + '</h3><p class="t-b2 ab-mute">' + esc(dates(s)) + ' · ' + s.guests + ' guest' + (s.guests === 1 ? '' : 's') + '</p>';
      s.categories.forEach(function (c) {
        h += '<div class="as-cat"><p class="as-catn">' + esc(c.name) + ' <span class="ab-mute">· ' + c.units.length + ' room' + (c.units.length === 1 ? '' : 's') + (c.nights != null ? ' · ' + c.nights + ' night' + (c.nights === 1 ? '' : 's') : '') + '</span></p><div class="as-units">';
        c.units.forEach(function (u) {
          var k = c.key + '|' + u.label, list = reff(k), lock = rlocked(u), changed = !!X.rdraft[k], same = X.rsel && X.rsel.key === c.key, other = X.rsel && X.rsel.key !== c.key;
          h += '<div class="as-unit' + (lock ? ' as-lock' : '') + (changed ? ' as-chg' : '') + (other ? ' as-dim' : '') + '" data-as-unit="' + esc(k) + '"><p class="as-un">Room ' + esc(u.label) + ' <small>' + u.places + ' place' + (u.places === 1 ? '' : 's') + (u.extraBeds ? ' + extra bed' : '') + '</small></p>';
          list.forEach(function (gid) {
            var o = u.occupants.filter(function (x) { return x.guestId === gid; })[0] || {}, sel = X.rsel && X.rsel.guestId === gid;
            h += '<button type="button" class="as-occ' + (sel ? ' as-sel' : '') + (o.by && !changed ? ' as-placed' : '') + '" data-as-occ="' + esc(gid) + '" data-as-k="' + esc(k) + '"' + (lock ? ' disabled' : '') + '>' + esc(firstOf(gid)) + ' <small>' + esc(gid) + (o.bed ? ' · extra bed' : '') + '</small></button>';
          });
          for (var f = list.length; f < u.places; f++) h += '<button type="button" class="as-free" data-as-to="' + esc(k) + '"' + (lock || !same ? ' disabled' : '') + '>free place</button>';
          if (lock) h += '<p class="ab-why">' + esc(lock) + '</p>';
          h += '</div>';
        });
        h += '</div></div>';
      });
      h += '</div>';
    });
    if ((R.waitlist || []).length) h += '<div class="p-card ab-panel"><p class="t-l1">Waiting list — no room held</p><ul class="as-chg">' + R.waitlist.map(function (w) { return '<li>' + esc(firstOf(w.guestId)) + ' · ' + esc(w.guestId) + ' · ' + esc(w.stage) + ' · position ' + esc(w.position) + '</li>'; }).join('') + '</ul><p class="ab-why">A room for a guest on the waiting list is a booking — it is made through the booking, never here.</p></div>';
    var f = R.final;
    h += '<div class="p-card ab-panel" data-as-rfinal><p class="t-l1">Final hotel rooming list for the hand-over</p>';
    if (pend.length) h += '<p class="t-b2">Confirm or discard your draft first.</p>';
    else if (!X.rfinalOpen) h += '<p class="t-b2">' + esc(fw[0]) + '.</p><div class="ab-actions"><button type="button" class="p-act ab-ghost" data-as-rfinal-open>Release the rooming list as final…</button>' + (f && f.active ? '<button type="button" class="p-link" data-as-rfinal-withdraw>Withdraw the final version ' + f.version + '</button>' : '') + '</div>';
    else h += '<p class="t-b2">Releasing records this exact rooming — every room and who sleeps there — as version ' + ((f ? f.version : 0) + 1) + '. Guests can still change their own room through their booking; a change afterwards shows as "changed since".</p><label class="ab-tick"><input type="checkbox" data-as-rfinal-tick' + (X.rfinalTick ? ' checked' : '') + '> This is the final rooming list for the hotel.</label><div class="ab-actions"><button type="button" class="p-act" data-as-rfinal-go' + (X.rfinalTick && !X.busy ? '' : ' disabled') + '>Release as final</button><button type="button" class="p-link" data-as-rfinal-cancel>Cancel</button></div>';
    h += '</div>' + exportsBar('rooms') + logPanel(R.log, 'rooms');
    return h + '</section>';
  }

  /* ---------------------------------------------------------------- the exports (the confirmed state only — never a draft) */
  function metaOf(title, ev, fin, extra) {
    var fw = fin ? finalWords(fin)[0] : 'Not released — working version';
    var e = ev && X.data.events && X.data.events[ev];
    return [['Export date', C.nowStamp()]].concat(e ? [['Event', e.name], ['Event date', e.dateWords], ['Venue', e.venue]] : [['Event', 'H&S Wedding 001 · 21 February – 8 March 2027']])
      .concat([['Status', fw], ['Source', 'the booking system — the confirmed state only; a draft in the console is never exported'], ['Contains', 'names, guest IDs, seats / rooms and booking states — no invitation code, no contact data, no price']], extra || []);
  }
  function seatCsv(ev) {
    var e = evData(ev) || {}, b = base(ev), rows = [], cap = counts(ev);
    if (ev === 'ceremony') (e.couple || []).forEach(function (c) { var g = guest(c.guestId); rows.push([label(c.position), 'Front centre', '', '', g ? g.first || '' : c.name || '', g ? g.last || '' : '', c.guestId || '', '', g ? (BOOK[g.booking] || [g.booking])[0] : '', 'Joining', c.position === 'BRIDE' ? 'The Bride — fixed' : 'The Groom — fixed']); });
    (e.seats || []).forEach(function (s) {
      var gid = b[s.seatId], g = gid ? guest(gid) : null, w = where(s.seatId);
      rows.push(ev === 'ceremony' ? [label(s.seatId), w[0], w[1], w[2], g ? g.first || '' : '', g ? g.last || '' : '', gid || '', g ? (g.group.with || []).join(' · ') : '', g ? (BOOK[g.booking] || [g.booking])[0] : '', g ? ANS[g.attendance.ceremony] || '' : '', gid ? (s.by && /^owners:/.test(s.by) ? 'placed by ' + (WHO[s.by.split(':')[1]] || 'the Owners') : 'chosen by the guest') : 'free']
        : [label(s.seatId), w[0], w[2], g ? g.first || '' : '', g ? g.last || '' : '', gid || '', g ? (g.group.with || []).join(' · ') : '', g ? (BOOK[g.booking] || [g.booking])[0] : '', g ? ANS[g.attendance.dinner] || '' : '', gid ? (s.by && /^owners:/.test(s.by) ? 'placed by ' + (WHO[s.by.split(':')[1]] || 'the Owners') : 'chosen by the guest') : 'free']);
    });
    var head = ev === 'ceremony' ? ['Seat', 'Block', 'Row', 'Position', 'First name', 'Last name', 'Guest ID', 'Travelling with', 'Booking status', 'Answer (Vow Ceremony)', 'Placed']
      : ['Seat', 'Side', 'Number', 'First name', 'Last name', 'Guest ID', 'Travelling with', 'Booking status', 'Answer (Wedding Dinner)', 'Placed'];
    return C.csvDoc(ev === 'ceremony' ? 'Final Ceremony Seating Plan — H&S Wedding 001' : 'Final Dinner Seating Plan — H&S Wedding 001',
      metaOf('', ev, e.final, [['Capacity', cap.people + ' people · ' + (ev === 'ceremony' ? cap.chairs + ' chairs + the couple\'s 2 places' : cap.chairs + ' chairs, the couple\'s two among them')], ['Occupied', String(cap.held + cap.couple)], ['Free chairs', String(cap.free)]]), head, rows);
  }
  function roomingCsv() {
    var ids = bookingIds(), rows = [], R = X.data.rooms;
    stays().forEach(function (s) { s.categories.forEach(function (c) { c.units.forEach(function (u) { u.occupants.forEach(function (o) {
      var g = guest(o.guestId);
      rows.push([s.label, s.hotel, s.checkIn || '', s.checkOut || '', c.nights == null ? '' : c.nights, c.name, 'Room ' + u.label, g ? g.first || '' : '', g ? g.last || '' : '', o.guestId, ids[STAY_CENTRE[s.window] + '|' + o.guestId] || '', g ? (BOOK[g.booking] || [g.booking])[0] : '', o.bed ? 'yes' : '', u.occupants.length]);
    }); }); }); });
    return C.csvDoc('Final Hotel Rooming List — H&S Wedding 001', metaOf('', null, R.final, [['Booking IDs', C.revenue() ? 'from the booking system' : 'not read yet — open Finance once, then export again'], ['Room', 'the allocation label of the booking system, not a hotel room number']]),
      ['Stay', 'Hotel', 'Check-in', 'Check-out', 'Nights', 'Room category', 'Room', 'First name', 'Last name', 'Guest ID', 'Booking ID', 'Booking status', 'Extra bed', 'Persons in room'], rows);
  }
  function outstandingCsv() {
    var rows = [];
    ['ceremony', 'dinner'].forEach(function (ev) {
      var b = base(ev);
      roster().forEach(function (g) {
        if (ev === 'ceremony' && g.couple) return;
        var seat = seatOf(ev, g.guestId, b), a = g.attendance[ev], issue = null;
        if (!seat && a === 'yes') issue = 'Joining — no seat yet';
        else if (!seat && a === 'undecided') issue = 'Not decided — no seat';
        else if (seat && a === 'no') issue = 'Seat ' + label(seat) + ' held — answered "not joining"';
        else if (!seat && a === 'not-sent') issue = 'Trip not sent — no seat';
        if (issue) rows.push([EV[ev], issue, g.first || '', g.last || '', g.guestId, (g.group.with || []).join(' · '), (BOOK[g.booking] || [g.booking])[0], ANS[a] || a]);
      });
    });
    ((X.data.rooms && X.data.rooms.waitlist) || []).forEach(function (w) { var g = guest(w.guestId); rows.push(['Stay · ' + w.stage, 'Waiting list — no room held (position ' + w.position + ')', g ? g.first || '' : '', g ? g.last || '' : '', w.guestId, g ? (g.group.with || []).join(' · ') : '', g ? (BOOK[g.booking] || [g.booking])[0] : '', '']); });
    return C.csvDoc('Unassigned Guests / Outstanding Assignments — H&S Wedding 001', metaOf('', null, null, [['Status', 'working list — always the current confirmed state']]),
      ['Event / stay', 'Outstanding', 'First name', 'Last name', 'Guest ID', 'Travelling with', 'Booking status', 'Answer'], rows);
  }
  function csvOf(kind) { return kind === 'ceremony' || kind === 'dinner' ? seatCsv(kind) : kind === 'rooming' ? roomingCsv() : kind === 'outstanding' ? outstandingCsv() : null; }
  var FILES = { ceremony: 'final-ceremony-seating-plan', dinner: 'final-dinner-seating-plan', rooming: 'final-hotel-rooming-list', outstanding: 'unassigned-guests-outstanding-assignments' };

  /* ---------------------------------------------------------------- the wiring */
  function wire(root, on) {
    on('[data-as-reload]', 'click', function () { load(); });
    on('[data-as-event]', 'click', function (el) { X.event = el.getAttribute('data-as-event'); X.sel = null; X.review = null; X.msg = ''; X.err = ''; X.finalOpen = false; C.draw(); });
    on('[data-as-seat]', 'click', function (el) { X.focus = ['data-as-seat', el.getAttribute('data-as-seat')]; clickSeat(el.getAttribute('data-as-seat')); C.draw(); });
    on('[data-as-pick]', 'click', function (el) { X.focus = ['data-as-pick', el.getAttribute('data-as-pick')]; pickGuest(el.getAttribute('data-as-pick')); C.draw(); });
    on('[data-as-release]', 'click', function (el) { release(el.getAttribute('data-as-release')); C.draw(); });
    on('[data-as-group]', 'click', function (el) { seatGroup(el.getAttribute('data-as-group')); C.draw(); });
    on('[data-as-unsel]', 'click', function () { X.sel = null; C.draw(); });
    on('[data-as-undo]', 'click', function (el) { undo(el.getAttribute('data-as-undo')); C.draw(); });
    on('[data-as-discard]', 'click', function () { X.draft[X.event] = {}; X.seen[X.event] = {}; X.conflict[X.event] = []; X.review = null; X.sel = null; C.draw(); });
    on('[data-as-rebase]', 'click', function () { rebase(X.event); C.draw(); });
    on('[data-as-review]', 'click', function () { reviewSeats(); });
    on('[data-as-confirm]', 'click', function () { confirmSeats(); });
    on('[data-as-final-open]', 'click', function () { X.finalOpen = true; X.finalTick = false; C.draw(); });
    on('[data-as-final-cancel]', 'click', function () { X.finalOpen = false; C.draw(); });
    on('[data-as-final-tick]', 'change', function (el) { X.finalTick = !!el.checked; C.draw(); });
    on('[data-as-final-go]', 'click', function () { if (X.finalTick) finalSeats('release'); });
    on('[data-as-final-withdraw]', 'click', function () { finalSeats('withdraw'); });
    on('[data-as-state]', 'click', function (el) { X.stateOpen = el.getAttribute('data-as-state'); C.draw(); });
    on('[data-as-state-cancel]', 'click', function () { X.stateOpen = null; C.draw(); });
    on('[data-as-state-go]', 'click', function (el) { selfService(el.getAttribute('data-as-state-go') === 'freeze' ? { frozen: true } : { frozen: false, open: true }); });
    on('[data-as-log-more]', 'click', function (el) { if (el.getAttribute('data-as-log-more') === 'seating') X.logOpen = !X.logOpen; else X.rlogOpen = !X.rlogOpen; C.draw(); });
    var keep = function (sel, set) { var q = root.querySelector(sel); if (q) q.onchange = q.oninput = function () { set(q.value); var pos = q.selectionStart; C.draw(); var n = root.querySelector(sel); if (n && n.focus) { n.focus(); try { if (n.setSelectionRange && pos != null) n.setSelectionRange(pos, pos); } catch (e) {} } }; };
    keep('[data-as-q]', function (v) { X.q = v; });
    keep('[data-as-group-f]', function (v) { X.group = v; });
    keep('[data-as-room-f]', function (v) { X.room = v; });
    keep('[data-as-status-f]', function (v) { X.status = v; });
    on('[data-as-occ]', 'click', function (el) { X.focus = ['data-as-occ', el.getAttribute('data-as-occ')]; var k = el.getAttribute('data-as-k'), p = k.split('|'), gid = el.getAttribute('data-as-occ'); if (X.rsel && X.rsel.guestId !== gid && (X.rsel.key !== p[0] || X.rsel.label !== p[1])) rclickUnit(p[0], p[1], gid); else rpick(gid, p[0], p[1]); C.draw(); });
    on('[data-as-to]', 'click', function (el) { X.focus = ['data-as-unit', el.getAttribute('data-as-to')]; var p = el.getAttribute('data-as-to').split('|'); rclickUnit(p[0], p[1], null); C.draw(); });
    on('[data-as-runsel]', 'click', function () { X.rsel = null; C.draw(); });
    on('[data-as-rdiscard]', 'click', function () { X.rdraft = {}; X.rseen = {}; X.rconflict = []; X.rreview = null; X.rsel = null; X.rapprove = false; C.draw(); });
    on('[data-as-rreview]', 'click', function () { reviewRooms(); });
    on('[data-as-rapprove]', 'change', function (el) { X.rapprove = !!el.checked; C.draw(); });
    on('[data-as-rconfirm]', 'click', function () { confirmRooms(); });
    on('[data-as-rfinal-open]', 'click', function () { X.rfinalOpen = true; X.rfinalTick = false; C.draw(); });
    on('[data-as-rfinal-cancel]', 'click', function () { X.rfinalOpen = false; C.draw(); });
    on('[data-as-rfinal-tick]', 'change', function (el) { X.rfinalTick = !!el.checked; C.draw(); });
    on('[data-as-rfinal-go]', 'click', function () { if (X.rfinalTick) finalRooms('release'); });
    on('[data-as-rfinal-withdraw]', 'click', function () { finalRooms('withdraw'); });
    /* the page is drawn anew after each click: the keyboard focus returns to the element that was used (or its room) */
    if (X.focus) { var f = X.focus; X.focus = null; var t = Array.prototype.filter.call(root.querySelectorAll('[' + f[0] + ']'), function (e) { return e.getAttribute(f[0]) === f[1]; })[0];
      if (t && f[0] === 'data-as-unit' && t.querySelector) t = t.querySelector('button') || t; if (t && t.focus) { try { t.focus(); } catch (e) {} } }
    on('[data-as-csv]', 'click', function (el) { var k = el.getAttribute('data-as-csv'), doc = X.data ? csvOf(k) : null; if (doc) C.saveText(FILES[k] + '-' + new Date().toISOString().slice(0, 10) + '.csv', doc); });
  }

  window.SIYL_ADMIN_EXT = {
    views: { seating: seatingView, assign: roomsView },
    tabs: [['seating', 'Seating'], ['assign', 'Room assignments']],
    init: function (core) { C = core; },
    enter: function (view) {
      if (X.phase === 'idle' || X.phase === 'error') load();
      /* the booking IDs of the rooming list come from the Revenue overview the console reads anyway — started here, never waited for */
      if (view === 'assign' && C.revenuePhase() === 'idle') C.loadRevenue();
    },
    wire: wire,
    /* a draft is never lost silently: the console asks before leaving the page with unsaved changes */
    unsaved: function () { return draftCount() > 0; },
    /* for the tests: the state and the exports as text (nothing is downloaded by these) */
    state: function () { return X; }, csv: csvOf, label: label
  };
})();
