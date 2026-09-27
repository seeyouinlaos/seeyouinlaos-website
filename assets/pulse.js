/* ============================================================================
   THE WEDDING PULSE · YOUR WEDDING CIRCLE (Owner, 27 Sep 2026).

   The reason to come back is curiosity: who is joining, how full the wedding
   is, what everyone dances to, where the night ends, who sits around you.

     HOMEPAGE   = what is happening right now  (the concise pulse)
     MY PROFILE = who am I experiencing this wedding with  (your circle)
     MY TRIP    = what have I planned  (untouched — the booking stays there)

   EVERYTHING HERE IS READ, NOTHING IS WRITTEN. The people and the two approved
   answers come from GET /api/pulse (an authenticated read in the narrowest form:
   first name, portrait flag, nationality, the day they joined, Q06 genres and
   the after-dinner choice — nothing else); the seats from the seating ledger's
   own read the pages already load (assets/seating.js); the rooms from the room
   engine (assets/rooms.js · assets/availability.js). A number the source cannot
   give is not shown — unknown is never 0.
   ========================================================================== */
(function () {
  'use strict';
  var API = '/api/pulse';
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function initials(name) { var w = String(name || '').trim().split(/\s+/); return ((w[0] || '')[0] || '') + ((w[1] || '')[0] || ''); }
  /* the questionnaire's display form of a stored genre (PRQ-06-07): the value stays '90s', the words read ’90s */
  var DISPLAY = { '90s': '’90s' };
  function genreWords(g) { var Q = window.SIYL_QUESTIONNAIRE; return Q && Q.display ? Q.display(g) : (DISPLAY[g] || g); }
  var AFTER = { pool: 'Jump to the pool', party: 'Go to the party' };
  var AFTER_WHO = { pool: 'Who’s jumping in?', party: 'Who’s going to the party?' };

  /* ---------------------------------------------------------------- the data */
  var data = null, loading = null, failed = false;
  function load(force) {
    var a = auth(); if (!a || !a.bearer) { data = null; return Promise.resolve(null); }
    if (data && !force) return Promise.resolve(data);
    if (loading && !force) return loading;
    loading = fetch(API, { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { loading = null; data = d && d.ok ? d : null; failed = !data; try { document.dispatchEvent(new CustomEvent('siyl:pulse')); } catch (e) {} return data; },
        function () { loading = null; failed = true; try { document.dispatchEvent(new CustomEvent('siyl:pulse')); } catch (e) {} return null; });
    return loading;
  }
  function byId(d) { var m = {}; ((d && d.people) || []).forEach(function (p) { m[p.id] = p; }); return m; }
  function chose(d, genre) { return ((d && d.people) || []).filter(function (p) { return (p.music || []).indexOf(genre) >= 0; }); }
  function after(d, key) { return ((d && d.people) || []).filter(function (p) { return p.after === key; }); }

  /* ---------------------------------------------------------------- people */
  function person(p, extra) {
    var nat = p && p.nationality ? '<span class="pl-pc">' + esc(p.nationality) + '</span>' : '';
    return '<li class="pl-p"' + (p.role ? ' data-role="' + esc(p.role) + '"' : '') + '>' +
      '<span class="pl-ava" data-pl-ava="' + esc(p.id) + '"' + (p.photo ? ' data-photo="1"' : '') + ' aria-hidden="true">' + esc(initials(p.name)) + '</span>' +
      '<span class="pl-pt"><span class="pl-pn" data-i18n-skip>' + esc(p.name) + '</span>' + nat + (extra || '') + '</span></li>';
  }
  function peopleHtml(list, cls) {
    if (!list.length) return '<p class="pl-none">Nobody yet.</p>';
    return '<ul class="pl-people' + (cls ? ' ' + cls : '') + '">' + list.map(function (p) { return person(p); }).join('') + '</ul>';
  }
  function paint(root) {
    var AV = window.SIYL_AVATAR; if (!AV || !AV.of || !root) return;
    root.querySelectorAll('[data-pl-ava][data-photo="1"]:not([data-done])').forEach(function (el) {
      el.setAttribute('data-done', '1');
      AV.of(el.getAttribute('data-pl-ava')).then(function (url) { if (!url || !el.isConnected) return; var im = document.createElement('img'); im.alt = ''; im.src = url; el.appendChild(im); el.classList.add('has-photo'); });
    });
  }

  /* ---------------------------------------------------------------- the three pieces */
  function joiningHtml(d, full) {
    var n = d.joining, cap = d.capacity;
    var recent = (d.people || []).filter(function (p) { return p.joinedAt; }).sort(function (x, y) { return y.joinedAt > x.joinedAt ? 1 : y.joinedAt < x.joinedAt ? -1 : 0; });
    var faces = full ? '' : '<ul class="pl-faces" aria-hidden="true">' + recent.slice(0, 7).map(function (p) {
      return '<li><span class="pl-ava" data-pl-ava="' + esc(p.id) + '"' + (p.photo ? ' data-photo="1"' : '') + '>' + esc(initials(p.name)) + '</span></li>'; }).join('') + '</ul>';
    return '<div class="pl-join" data-pl-joining="' + n + '">' +
      '<p class="pl-label">Who’s joining us</p>' +
      '<p class="pl-big" role="img" aria-label="' + n + ' / ' + cap + '"><b>' + n + '</b><span class="pl-of">/ ' + cap + '</span></p>' +
      '<p class="pl-cap">Joining so far</p>' + faces +
      (recent.length ? '<p class="pl-recent"><span class="pl-rl">Recently joined</span> <span data-i18n-skip>' + recent.slice(0, full ? 8 : 4).map(function (p) { return esc(p.name); }).join(' · ') + '</span></p>' : '') +
      (full ? peopleHtml(d.people || [], 'pl-grid-people') : '<a class="pl-go" href="profile.html#circle">See everyone <span aria-hidden="true">&rarr;</span></a>') +
      '</div>';
  }
  function row(r, i, open) {
    return '<li><button type="button" class="pl-row" data-pl-genre="' + esc(r.genre) + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<span class="pl-no">' + pad(i + 1) + '</span><span class="pl-g">' + esc(genreWords(r.genre)) + '</span>' +
      '<span class="pl-n"><b>' + r.count + '</b> <span>' + (r.count === 1 ? 'guest' : 'guests') + '</span></span></button></li>';
  }
  function musicHtml(d, full, state) {
    var m = d.music || {}, rank = m.ranking || [], shown = full || state.all ? rank : rank.slice(0, 3);
    if (!m.responses) return '<div class="pl-music"><p class="pl-label">What makes us dance?</p><p class="pl-none">No answers yet — the ranking begins with the first guest who tells us.</p></div>';
    var lead = (m.leaders || []).map(genreWords);
    return '<div class="pl-music"><p class="pl-label">What makes us dance?</p>' +
      '<ol class="pl-rank">' + shown.map(function (r, i) { return row(r, i, state.genre === r.genre); }).join('') + '</ol>' +
      (state.genre ? whoHtml('genre', d, state.genre) : '') +
      (lead.length ? '<p class="pl-fav"><span>Current favourite</span> · <b>' + lead.map(esc).join(' &amp; ') + '</b></p>' : '') +
      '<p class="pl-note"><b>' + m.responses + '</b> <span>' + (m.responses === 1 ? 'response so far' : 'responses so far') + '</span></p>' +
      (full ? '' : '<button type="button" class="pl-more" data-pl-all aria-expanded="' + (state.all ? 'true' : 'false') + '">' + (state.all ? 'Show the top three' : 'View all 13') + '</button>') +
      '</div>';
  }
  function moodHtml(d, state) {
    var a = d.after || {}, n = a.responses || 0, pool = a.pool || 0, party = a.party || 0;
    if (!n) return '<div class="pl-mood"><p class="pl-label">After dinner, what’s the mood?</p><p class="pl-none">No answers yet.</p></div>';
    var share = Math.round((pool / n) * 1000) / 10;
    var side = function (k, c) { return '<button type="button" class="pl-side" data-pl-after="' + k + '" aria-expanded="' + (state.after === k ? 'true' : 'false') + '"><span class="pl-sl">' + esc(AFTER[k]) + '</span><b class="pl-sn">' + c + '</b></button>'; };
    return '<div class="pl-mood"><p class="pl-label">After dinner, what’s the mood?</p>' +
      '<div class="pl-split">' + side('pool', pool) + side('party', party) + '</div>' +
      '<p class="pl-line" role="img" aria-label="' + pool + ' / ' + party + '"><i style="--pl-share:' + share + '%"></i></p>' +
      '<p class="pl-note"><b>' + n + '</b> <span>' + (n === 1 ? 'response so far' : 'responses so far') + '</span></p>' +
      (state.after ? whoHtml('after', d, state.after) : '') + '</div>';
  }
  function whoHtml(kind, d, key) {
    var list = kind === 'genre' ? chose(d, key) : after(d, key);
    var head = kind === 'genre' ? '<span>Who chose</span> <b>' + esc(genreWords(key)) + '</b><span>?</span>' : esc(AFTER_WHO[key]);
    return '<div class="pl-who" data-pl-who="' + esc(kind + ':' + key) + '" aria-live="polite"><p class="pl-who-h">' + head + '</p>' + peopleHtml(list) + '</div>';
  }

  /* ---------------------------------------------------------------- the homepage */
  var homeState = { all: false, genre: null, after: null };
  function homeHtml(d) {
    return '<div class="pl-in">' +
      '<div class="a-head"><p class="a-eyebrow">The Wedding Pulse</p><h2>What is happening right now.</h2></div>' +
      '<div class="pl-grid">' +
        joiningHtml(d, false) +
        '<div class="pl-stay a-avail" data-availability data-av-in-pulse></div>' +
        musicHtml(d, false, homeState) +
        moodHtml(d, homeState) +
      '</div></div>';
  }
  function renderHome() {
    var host = document.querySelector('[data-pulse]'); if (!host) return;
    var a = auth(); if (!a || !a.bearer) { host.innerHTML = ''; host.setAttribute('data-pulse', 'out'); return; }
    if (!data) { host.setAttribute('data-pulse', failed ? 'unavailable' : 'loading'); if (!failed) load(); host.innerHTML = ''; return; }
    host.setAttribute('data-pulse', 'ready');
    host.innerHTML = homeHtml(data);
    /* inside the pulse the object is simply there — no entrance of its own */
    var AV = window.SIYL_AVAILABILITY, av = host.querySelector('[data-availability]'); if (AV && AV.render && av) { av.setAttribute('data-av-played', '1'); AV.render(av); }
    paint(host);
  }

  /* ---------------------------------------------------------------- the seats (read-only, the ledger's own view) */
  var CER_X = { L: [0, 1], R: [3, 4, 5] };   /* the ceremony floor: A B · aisle · D E F — the aisle is a real gap (column C does not exist) */
  function label(id) { var L = window.SIYL_SEATLABELS; return L && L.label ? L.label(id) : id; }
  function held(s) { return !!(s && s.holder && (s.state === 'taken' || s.state === 'party' || s.state === 'yours')); }
  function ceremonyGrid(v) {
    var out = []; ((v && v.ceremony && v.ceremony.rows) || []).forEach(function (r) { (r.seats || []).forEach(function (s, i) { if (s) out.push({ s: s, x: CER_X[r.side][i], y: r.row, side: r.side }); }); });
    return out;
  }
  /* the guests around a ceremony seat: the chairs that touch it on the floor — beside it in its block, in front, behind, diagonal —
     never across the aisle; nearest first (the same row, then in front, then behind) */
  function aroundCeremony(v, seatId) {
    var g = ceremonyGrid(v), me = g.filter(function (c) { return c.s.seatId === seatId; })[0]; if (!me) return [];
    return g.filter(function (c) { return c !== me && Math.abs(c.x - me.x) <= 1 && Math.abs(c.y - me.y) <= 1 && held(c.s); })
      .sort(function (a, b) { return (Math.abs(a.y - me.y) - Math.abs(b.y - me.y)) || (a.y - b.y) || (Math.abs(a.x - me.x) - Math.abs(b.x - me.x)) || (a.x - b.x); })
      .map(function (c) { return { seat: c.s, where: c.y === me.y ? (c.x < me.x ? 'left' : 'right') : (c.y < me.y ? 'front' : 'behind') }; });
  }
  /* the dinner table as drawn by the plan: each side in the order of its numbers, left to right (1 … 12, 14 … 26 — the 13 never
     existed, so 12 and 14 sit side by side); across from a chair is the chair of the same rank on the other side */
  function dinnerSides(v) { var d = v && v.dinner && v.dinner.sides; return d ? { T: d.T || [], B: d.B || [] } : null; }
  function aroundDinner(v, seatId) {
    var S = dinnerSides(v); if (!S) return null;
    var side = /^D-T-/.test(seatId) ? 'T' : /^D-B-/.test(seatId) ? 'B' : null; if (!side) return null;
    var list = S[side], i = list.map(function (s) { return s.seatId; }).indexOf(seatId); if (i < 0) return null;
    var other = S[side === 'T' ? 'B' : 'T'];
    return { left: list[i - 1] || null, right: list[i + 1] || null, across: other[i] || null, side: side, index: i };
  }
  function seatPerson(s, byPeople) {
    if (!s) return null;
    if (!held(s)) return { empty: true, seat: s };
    var p = byPeople[s.holder] || { id: s.holder, name: s.name || 'A guest', photo: false, nationality: null };
    /* one name everywhere: the circle's own first name, the ledger's only for a guest the circle does not know */
    return { seat: s, p: { id: p.id || s.holder, name: (byPeople[s.holder] && byPeople[s.holder].name) || s.name || 'A guest', photo: !!p.photo, nationality: p.nationality || null, role: p.role } };
  }
  function seatLine(x, arrow) {
    if (!x) return '<li class="pl-seatp is-none">—</li>';
    var tag = '<span class="pl-seatno">' + esc(label(x.seat.seatId)) + '</span>';
    if (x.empty) return '<li class="pl-seatp is-empty">' + (arrow === 'l' ? '<span aria-hidden="true">&larr;</span> ' : '') + tag + ' <span class="pl-free">Not taken yet</span>' + (arrow === 'r' ? ' <span aria-hidden="true">&rarr;</span>' : '') + '</li>';
    return person(x.p, ' <span class="pl-seatno">' + esc(label(x.seat.seatId)) + '</span>').replace('<li class="pl-p"', '<li class="pl-p pl-seatp"' + (arrow ? ' data-dir="' + arrow + '"' : ''));
  }
  function ceremonyMap(v, mine, hosts) {
    var rows = (v && v.ceremony && v.ceremony.rows) || [], byRow = {};
    rows.forEach(function (r) { (byRow[r.row] = byRow[r.row] || {})[r.side] = r.seats || []; });
    var cell = function (s) { var cls = 'pl-c' + (s && s.seatId === mine ? ' is-me' : held(s) ? ' is-held' : ''); return '<i class="' + cls + '"' + (s && s.seatId === mine ? ' aria-label="' + esc(label(mine)) + '"' : '') + '></i>'; };
    var h = '<div class="pl-cmap" role="img" aria-label="Vow Ceremony seating plan">' +
      '<p class="pl-front"><span class="pl-couple' + (hosts ? ' is-me' : '') + '">Bride · Groom</span></p>';
    Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      h += '<div class="pl-crow"><span class="pl-rn">' + n + '</span><span class="pl-blk">' + (byRow[n].L || []).map(cell).join('') + '</span><span class="pl-aisle"></span><span class="pl-blk">' + (byRow[n].R || []).map(cell).join('') + '</span></div>';
    });
    return h + '</div>';
  }
  function dinnerMap(v, mine) {
    var S = dinnerSides(v); if (!S) return '';
    var cell = function (s) { return '<i class="pl-c' + (s.seatId === mine ? ' is-me' : held(s) ? ' is-held' : '') + '"></i>'; };
    return '<div class="pl-dmap" role="img" aria-label="Wedding Dinner · one long table · ' + (S.T.length + S.B.length) + ' seats">' +
      '<p class="pl-dside">A</p><div class="pl-drow">' + S.T.map(cell).join('') + '</div>' +
      '<div class="pl-table"></div>' +
      '<div class="pl-drow">' + S.B.map(cell).join('') + '</div><p class="pl-dside">B</p></div>';
  }
  function ceremonyHtml(v, me, hosts, byPeople) {
    var S = window.SIYL_SEATS, mine = hosts ? null : (S && S.seatOf ? S.seatOf('ceremony', me.guestId) : null);
    var head = '<div class="pl-seat" data-pl-seat="ceremony"><p class="pl-label">Vow Ceremony</p>';
    if (!v || !v.ceremony) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p><p class="pl-none">The ceremony plan opens later.</p></div>';
    if (hosts) return head + '<p class="pl-yours"><span>Your place</span> <b>Front centre</b></p>' + ceremonyMap(v, null, true) + '</div>';
    if (!mine) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p>' + ceremonyMap(v, null, false) + '</div>';
    var around = aroundCeremony(v, mine).map(function (x) { return seatPerson(x.seat, byPeople); });
    return head + '<p class="pl-yours"><span>Your seat</span> <b>' + esc(label(mine)) + '</b></p>' + ceremonyMap(v, mine, false) +
      '<p class="pl-sub">Around you</p>' + (around.length ? '<ul class="pl-people pl-around">' + around.map(function (x) { return seatLine(x); }).join('') + '</ul>' : '<p class="pl-none">Nobody around you yet.</p>') + '</div>';
  }
  function dinnerHtml(v, me, byPeople) {
    var S = window.SIYL_SEATS, mine = S && S.seatOf ? S.seatOf('dinner', me.guestId) : null;
    var sides = dinnerSides(v), total = sides ? sides.T.length + sides.B.length : 0;
    var head = '<div class="pl-seat" data-pl-seat="dinner"><p class="pl-label">Wedding Dinner</p>' + (total ? '<p class="pl-cap">One long table · <b>' + total + '</b> <span>seats</span></p>' : '');
    if (!sides) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p><p class="pl-none">The dinner plan opens later.</p></div>';
    if (!mine) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p>' + dinnerMap(v, null) + '</div>';
    var a = aroundDinner(v, mine) || {};
    return head + '<p class="pl-yours"><span>Your seat</span> <b>' + esc(label(mine)) + '</b></p>' + dinnerMap(v, mine) +
      '<p class="pl-sub">Next to you</p><ul class="pl-people pl-around pl-next">' + seatLine(seatPerson(a.left, byPeople), 'l') + seatLine(seatPerson(a.right, byPeople), 'r') + '</ul>' +
      '<p class="pl-sub">Across from you</p><ul class="pl-people pl-around">' + seatLine(seatPerson(a.across, byPeople)) + '</ul></div>';
  }
  /* THE HOSTS SEE EVERYTHING, CHANGE NOTHING (Owner, 27 Sep 2026): the whole plan of both events, read-only */
  function fullSeatingHtml(v, byPeople) {
    if (!v || (!v.ceremony && !v.dinner)) return '';
    var who = function (s) { var x = seatPerson(s, byPeople); return x && !x.empty ? '<span class="pl-fn" data-i18n-skip>' + esc(x.p.name) + '</span>' : '<span class="pl-free">Not taken yet</span>'; };
    var cer = v.ceremony ? v.ceremony.rows.map(function (r) { return (r.seats || []).map(function (s) { return '<li><span class="pl-seatno">' + esc(label(s.seatId)) + '</span> ' + who(s) + '</li>'; }).join(''); }).join('') : '';
    var S = dinnerSides(v), din = S ? ['T', 'B'].map(function (k) { return S[k].map(function (s) { return '<li><span class="pl-seatno">' + esc(label(s.seatId)) + '</span> ' + who(s) + '</li>'; }).join(''); }).join('') : '';
    return '<details class="pl-full" data-pl-full><summary>View full seating</summary>' +
      (cer ? '<p class="pl-sub">Vow Ceremony</p><ul class="pl-plan">' + cer + '</ul>' : '') +
      (din ? '<p class="pl-sub">Wedding Dinner</p><ul class="pl-plan">' + din + '</ul>' : '') + '</details>';
  }

  /* ---------------------------------------------------------------- My Profile · Your Wedding Circle */
  var circleState = { all: true, genre: null, after: null };
  function circleHtml(me, hosts) {
    var d = data, S = window.SIYL_SEATS, v = S && S.view ? S.view() : null;
    var h = '<section class="prep-sec pl-circle" id="circle" data-pl-circle><p class="t-l1">Your wedding circle</p><h2 class="t-h2">Who you share this wedding with.</h2>';
    if (!d) return h + '<p class="t-b2 measure" data-pl-circle-state="' + (failed ? 'unavailable' : 'loading') + '">' + (failed ? 'The circle could not be read just now. Please try again in a moment.' : 'Looking up who is joining us…') + '</p></section>';
    var byPeople = byId(d);
    return h + '<div class="pl-circle-grid">' + joiningHtml(d, true) +
      '<div class="pl-seats">' + ceremonyHtml(v, me, hosts, byPeople) + dinnerHtml(v, me, byPeople) + (hosts ? fullSeatingHtml(v, byPeople) : '') + '</div>' +
      '<div class="pl-pulse-full"><p class="pl-label">The Wedding Pulse</p><p class="pl-big small" role="img" aria-label="' + d.joining + ' / ' + d.capacity + '"><b>' + d.joining + '</b><span class="pl-of">/ ' + d.capacity + '</span></p><p class="pl-cap">Joining</p>' +
        musicHtml(d, true, circleState) + moodHtml(d, circleState) + '</div></div></section>';
  }

  /* ---------------------------------------------------------------- the one interaction: a result opens its people */
  function wire(root, state, again, scope) {
    if (!root || root.getAttribute('data-pl-wired')) return; root.setAttribute('data-pl-wired', '1');
    root.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('[data-pl-genre],[data-pl-after],[data-pl-all]') : null; if (!t) return;
      if (t.hasAttribute('data-pl-all')) { state.all = !state.all; }
      else if (t.hasAttribute('data-pl-genre')) { var g = t.getAttribute('data-pl-genre'); state.genre = state.genre === g ? null : g; }
      else { var k = t.getAttribute('data-pl-after'); state.after = state.after === k ? null : k; }
      var sel = t.hasAttribute('data-pl-all') ? '[data-pl-all]' : t.hasAttribute('data-pl-genre') ? '[data-pl-genre="' + t.getAttribute('data-pl-genre') + '"]' : '[data-pl-after="' + t.getAttribute('data-pl-after') + '"]';
      again();
      /* the section may have been redrawn: a keyboard's focus returns to the same control in the section as it now stands */
      var back = document.querySelector(scope + ' ' + sel); if (back && e.detail === 0) try { back.focus({ preventScroll: true }); } catch (x) { back.focus(); }
    });
  }
  function wireHome() {
    var host = document.querySelector('[data-pulse]'); if (!host) return;
    renderHome(); wire(host, homeState, renderHome, '[data-pulse]');
    document.addEventListener('siyl:pulse', renderHome);
    document.addEventListener('siyl:auth', function () { load(true).then(renderHome); });
    document.addEventListener('siyl:signout', function () { data = null; renderHome(); });
    document.addEventListener('siyl:units', function () { var h = document.querySelector('[data-pulse] [data-availability]'), AV = window.SIYL_AVAILABILITY; if (h && AV && AV.render) { h.setAttribute('data-av-played', '1'); AV.render(h); } });
  }

  window.SIYL_PULSE = {
    API: API, load: load, data: function () { return data; }, failed: function () { return failed; },
    homeHtml: homeHtml, circleHtml: circleHtml, paint: paint, render: renderHome,
    wireCircle: function (root, again) { wire(root, circleState, again, '[data-pl-circle]'); paint(root); },
    aroundCeremony: aroundCeremony, aroundDinner: aroundDinner, genreWords: genreWords
  };
  if (document.querySelector) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireHome); else wireHome(); }
})();
