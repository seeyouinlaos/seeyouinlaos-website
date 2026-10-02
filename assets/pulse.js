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
  /* the first letters of a first name; a person the circle cannot name yet ("A guest") gets no letters, never "Ag" */
  function initials(name) { if (!name || name === 'A guest') return '·'; var w = String(name || '').trim().split(/\s+/); return ((w[0] || '')[0] || '') + ((w[1] || '')[0] || ''); }
  /* the questionnaire's display form of a stored genre (PRQ-06-07): the value stays '90s', the words read ’90s */
  var DISPLAY = { '90s': '’90s' };
  function genreWords(g) { var Q = window.SIYL_QUESTIONNAIRE; return Q && Q.display ? Q.display(g) : (DISPLAY[g] || g); }
  var AFTER = { pool: 'Jump to the pool', party: 'Go to the party' };
  var AFTER_WHO = { pool: 'Who’s jumping in?', party: 'Who’s going to the party?' };

  /* ---------------------------------------------------------------- the data */
  /* ONE FINITE READ (Owner, 28 Sep 2026 · the circle once stayed on "Looking up…" for good): every read ends — in the data, or in a
     calm failure the guest can retry — within LOAD_TIMEOUT; a stalled connection is a failure, never an endless wait */
  var data = null, loading = null, failed = false, LOAD_TIMEOUT = 12000, loadedAt = 0;
  /* WHO STAYS WHERE STAYS CURRENT (2 Oct 2026): a room taken, changed or given back elsewhere on the page reads the circle again —
     at most once every FRESH ms, the newest read always the one kept (a read in flight is reused, never overtaken) */
  var FRESH = 15000;
  var gen = 0, pending = false, later = null;
  function refresh() {
    if (loading) { pending = true; return; }   /* a change during any read, the first one included, is read once it ends */
    if (!data) return;
    var wait = FRESH - (Date.now() - loadedAt);
    if (wait <= 0) { load(true); return; }
    if (!later) later = setTimeout(function () { later = null; load(true); }, wait);   /* a change inside the window is read once it ends */
  }
  function load(force) {
    var a = auth(); if (!a || !a.bearer) { data = null; loading = null; return Promise.resolve(null); }
    if (data && !force) return Promise.resolve(data);
    if (loading && !force) return loading;
    if (force) failed = false;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = null;
    var timeout = new Promise(function (res, rej) { timer = setTimeout(function () { try { if (ctl) ctl.abort(); } catch (e) {} rej(new Error('timeout')); }, window.SIYL_PULSE_TIMEOUT || LOAD_TIMEOUT); });
    var mine = ++gen, who = a.bearer;
    loading = Promise.race([fetch(API, { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store', signal: ctl ? ctl.signal : undefined }), timeout])
      .then(function (r) { clearTimeout(timer); return r.ok ? r.json() : null; }, function (e) { clearTimeout(timer); throw e; })
      .then(function (d) {
        /* only the newest read, for the session that asked, is ever kept — an older answer never replaces a newer one */
        var cur = auth(); if (mine !== gen || !cur || cur.bearer !== who) return data;
        loading = null; data = d && d.ok ? d : null; failed = !data; loadedAt = Date.now();
        if (pending) { pending = false; setTimeout(refresh, 0); } try { document.dispatchEvent(new CustomEvent('siyl:pulse')); } catch (e) {} return data; },
        function () { if (mine !== gen) return data; loading = null; failed = true; try { document.dispatchEvent(new CustomEvent('siyl:pulse')); } catch (e) {} return null; });
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
  function joiningHtml(d, full, v) {
    var n = d.joining, cap = d.capacity;
    var recent = (d.people || []).filter(function (p) { return p.joinedAt; }).sort(function (x, y) { return y.joinedAt > x.joinedAt ? 1 : y.joinedAt < x.joinedAt ? -1 : 0; });
    var faces = full ? '' : '<ul class="pl-faces" aria-hidden="true">' + recent.slice(0, 7).map(function (p) {
      return '<li><span class="pl-ava" data-pl-ava="' + esc(p.id) + '"' + (p.photo ? ' data-photo="1"' : '') + '>' + esc(initials(p.name)) + '</span></li>'; }).join('') + '</ul>';
    return '<div class="pl-join" data-pl-joining="' + n + '">' +
      '<p class="pl-label">Who’s joining us</p>' +
      '<p class="pl-big" role="img" aria-label="' + n + ' / ' + cap + '"><b>' + n + '</b><span class="pl-of">/ ' + cap + '</span></p>' +
      '<p class="pl-cap">Joining so far</p>' + faces +
      (recent.length ? '<p class="pl-recent"><span class="pl-rl">Recently joined</span> <span data-i18n-skip>' + recent.slice(0, full ? 8 : 4).map(function (p) { return esc(p.name); }).join(' · ') + '</span></p>' : '') +
      (full ? peopleCards(d, v) : '<a class="pl-go" href="profile.html#circle">See everyone <span aria-hidden="true">&rarr;</span></a>') +
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
  function seatCol(s, i) { var m = /-(\d\d)$/.exec((s && s.seatId) || ''); return m ? Number(m[1]) - 1 : i; }
  function ceremonyGrid(v) {
    /* each chair at the column its own id names (…-01, -02, -03) — a retired neighbour leaves a gap, it never shifts a chair */
    var out = []; ((v && v.ceremony && v.ceremony.rows) || []).forEach(function (r) { (r.seats || []).forEach(function (s, i) { if (s) out.push({ s: s, x: CER_X[r.side][seatCol(s, i)], y: r.row, side: r.side }); }); });
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
  /* THE COUPLE'S TWO PLACES (Owner, 2 Oct 2026): the Bride and the Groom are two of the fifty — their fixed places at the front
     centre come with the plan itself (the ledger names their holders from the register's roles), drawn with the same seat as every
     guest, held, the viewer's own marked as theirs. Nobody else can take them; nobody is left out of the plan. */
  function couplePlaces(v) { return (v && v.ceremony && v.ceremony.couple) || []; }
  function coupleMine(v, me) { var id = me && me.guestId; return couplePlaces(v).filter(function (c) { return id && c.holder === id; })[0] || null; }
  var ROLE_WORDS = { Bride: 'Bride', Groom: 'Groom' };
  function ceremonyMap(v, mine, myPlace) {
    var rows = (v && v.ceremony && v.ceremony.rows) || [], byRow = {};
    rows.forEach(function (r) { (byRow[r.row] = byRow[r.row] || {})[r.side] = r.seats || []; });
    var cell = function (s) { var cls = 'pl-c' + (s && s.seatId === mine ? ' is-me' : held(s) ? ' is-held' : ''); return '<i class="' + cls + '"' + (s && s.seatId === mine ? ' aria-label="' + esc(label(mine)) + '"' : '') + '></i>'; };
    /* a block row in its fixed columns: a retired position is an empty slot, so every chair stays where it stands */
    var block = function (seats, n) { var at = []; (seats || []).forEach(function (s, i) { at[seatCol(s, i)] = s; }); var h0 = ''; for (var k = 0; k < n; k++) h0 += at[k] ? cell(at[k]) : '<i class="pl-c is-gap" aria-hidden="true"></i>'; return h0; };
    var front = couplePlaces(v).map(function (c) {
      var me = myPlace && myPlace.position === c.position;
      return '<span class="pl-cp" data-pl-place="' + esc(c.position) + '"><i class="pl-c ' + (me ? 'is-me' : 'is-held') + '"></i><small>' + esc(ROLE_WORDS[c.role] || c.role) + '</small></span>';
    }).join('');
    var h = '<div class="pl-cmap" role="img" aria-label="Vow Ceremony seating plan · ' + ceremonyTotal(v) + ' places · the Bride and the Groom at the front">' +
      (front ? '<p class="pl-front">' + front + '</p>' : '');
    Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
      h += '<div class="pl-crow"><span class="pl-rn">' + n + '</span><span class="pl-blk">' + block(byRow[n].L, CER_X.L.length) + '</span><span class="pl-aisle"></span><span class="pl-blk">' + block(byRow[n].R, CER_X.R.length) + '</span></div>';
    });
    return h + '</div>';
  }
  function ceremonySeats(v) { return [].concat.apply([], ((v && v.ceremony && v.ceremony.rows) || []).map(function (r) { return (r.seats || []).filter(Boolean); })); }
  /* the ceremony's places, counted from the plan: the guest chairs and the couple's two — fifty */
  function ceremonyTotal(v) { return ceremonySeats(v).length + couplePlaces(v).length; }
  function dinnerMap(v, mine) {
    var S = dinnerSides(v); if (!S) return '';
    var cell = function (s) { return '<i class="pl-c' + (s.seatId === mine ? ' is-me' : held(s) ? ' is-held' : '') + '"></i>'; };
    return '<div class="pl-dmap" role="img" aria-label="Wedding Dinner · one long table · ' + (S.T.length + S.B.length) + ' seats">' +
      '<p class="pl-dside">A</p><div class="pl-drow">' + S.T.map(cell).join('') + '</div>' +
      '<div class="pl-table"></div>' +
      '<div class="pl-drow">' + S.B.map(cell).join('') + '</div><p class="pl-dside">B</p></div>';
  }
  function heldCount(list) { return list.filter(held).length; }
  function ceremonyHtml(v, me, byPeople) {
    var S = window.SIYL_SEATS, place = coupleMine(v, me), mine = place ? null : (S && S.seatOf ? S.seatOf('ceremony', me.guestId) : null);
    var head = '<div class="pl-seat" data-pl-seat="ceremony"><p class="pl-label">Vow Ceremony</p>' +
      (v && v.ceremony ? '<p class="pl-cap"><b>' + ceremonyTotal(v) + '</b> <span>places</span> · <b>' + (heldCount(ceremonySeats(v)) + couplePlaces(v).filter(function (c) { return c.holder; }).length) + '</b> <span>taken</span></p>' : '');
    /* UNKNOWN IS NOT "NOT ASSIGNED": a seating read still under way, or one that failed, is said as such */
    if (!v && S && S.error && S.error()) return head + '<p class="pl-none" data-pl-seats="unavailable">The seating could not be read just now.</p></div>';
    if (!v && S && S.ready && !S.ready()) return head + '<p class="pl-none" data-pl-seats="loading">Looking up the seating…</p></div>';
    if (!v || !v.ceremony) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p><p class="pl-none">The ceremony plan opens later.</p></div>';
    /* the Bride and the Groom: their own place in the plan, and the whole plan — never a separate card */
    if (place) return head + '<p class="pl-yours" data-pl-yours="' + esc(place.position) + '"><span>Your seat</span> <b>' + esc(ROLE_WORDS[place.role] || place.role) + '</b><span>Front centre</span></p>' + ceremonyMap(v, null, place) + '</div>';
    if (!mine) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p>' + ceremonyMap(v, null, null) + '</div>';
    var around = aroundCeremony(v, mine).map(function (x) { return seatPerson(x.seat, byPeople); });
    return head + '<p class="pl-yours"><span>Your seat</span> <b>' + esc(label(mine)) + '</b></p>' + ceremonyMap(v, mine, null) +
      '<p class="pl-sub">Around you</p>' + (around.length ? '<ul class="pl-people pl-around">' + around.map(function (x) { return seatLine(x); }).join('') + '</ul>' : '<p class="pl-none">Nobody around you yet.</p>') + '</div>';
  }
  function dinnerHtml(v, me, byPeople) {
    var S = window.SIYL_SEATS, mine = S && S.seatOf ? S.seatOf('dinner', me.guestId) : null;
    var sides = dinnerSides(v), total = sides ? sides.T.length + sides.B.length : 0;
    var head = '<div class="pl-seat" data-pl-seat="dinner"><p class="pl-label">Wedding Dinner</p>' + (total ? '<p class="pl-cap">One long table · <b>' + total + '</b> <span>seats</span> · <b>' + heldCount(sides.T.concat(sides.B)) + '</b> <span>taken</span></p>' : '');
    if (!v && S && S.error && S.error()) return head + '<p class="pl-none" data-pl-seats="unavailable">The seating could not be read just now.</p></div>';
    if (!v && S && S.ready && !S.ready()) return head + '<p class="pl-none" data-pl-seats="loading">Looking up the seating…</p></div>';
    if (!sides) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p><p class="pl-none">The dinner plan opens later.</p></div>';
    if (!mine) return head + '<p class="pl-yours"><span>Your seat</span> <b>Not assigned yet</b></p>' + dinnerMap(v, null) + '</div>';
    var a = aroundDinner(v, mine) || {};
    return head + '<p class="pl-yours"><span>Your seat</span> <b>' + esc(label(mine)) + '</b></p>' + dinnerMap(v, mine) +
      '<p class="pl-sub">Next to you</p><ul class="pl-people pl-around pl-next">' + seatLine(seatPerson(a.left, byPeople), 'l') + seatLine(seatPerson(a.right, byPeople), 'r') + '</ul>' +
      '<p class="pl-sub">Across from you</p><ul class="pl-people pl-around">' + seatLine(seatPerson(a.across, byPeople)) + '</ul></div>';
  }
  /* WHO SITS WHERE (Owner, 2 Oct 2026): the whole plan of both events, for EVERY signed-in participant — the couple's places first,
     then the ceremony row by row and the table side by side; first names, the seat labels, a free chair said as free. Seeing a seat
     never means changing it: nothing here holds or releases anything. */
  function whoName(s, byPeople) { var x = seatPerson(s, byPeople); return x && !x.empty ? '<span class="pl-fn" data-i18n-skip>' + esc(x.p.name) + '</span>' : '<span class="pl-free">Free</span>'; }
  function rosterSeat(lab, inner, me) { return '<li' + (me ? ' class="is-me"' : '') + '><span class="pl-seatno">' + esc(lab) + '</span> ' + inner + '</li>'; }
  /* one row of the roster: the people seated in it, then how many chairs are still free — a free chair is a number, not a line */
  function rosterRow(seats, byPeople, id) {
    var taken = seats.filter(held), free = seats.length - taken.length;
    return taken.map(function (s) { return rosterSeat(label(s.seatId), whoName(s, byPeople), s.holder && s.holder === id); }).join('') +
      (free ? '<li class="pl-rfree"><span class="pl-free"><b>' + free + '</b> <span>free</span></span></li>' : '');
  }
  function fullSeatingHtml(v, me, byPeople) {
    if (!v || (!v.ceremony && !v.dinner)) return '';
    var id = me && me.guestId, h = '<div class="pl-roster" data-pl-roster><p class="pl-label">Who sits where</p>';
    if (v.ceremony) {
      var rows = v.ceremony.rows || [], byRow = {};
      rows.forEach(function (r) { (byRow[r.row] = byRow[r.row] || { L: [], R: [] })[r.side] = (r.seats || []).filter(Boolean); });
      h += '<p class="pl-sub">Vow Ceremony</p><ol class="pl-seatrows">';
      var cp = couplePlaces(v);
      if (cp.length) h += '<li class="pl-rrow is-front"><span class="pl-rk">Front centre</span><ul class="pl-rs">' + cp.map(function (c) {
        var p = c.holder && byPeople[c.holder], nm = (p && p.name) || c.name || '';
        return rosterSeat(ROLE_WORDS[c.role] || c.role, nm ? '<span class="pl-fn" data-i18n-skip>' + esc(nm) + '</span>' : '', c.holder && c.holder === id);
      }).join('') + '</ul></li>';
      Object.keys(byRow).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        var seats = byRow[n].L.concat(byRow[n].R);
        h += '<li class="pl-rrow"><span class="pl-rk">Row ' + n + '</span><ul class="pl-rs">' + rosterRow(seats, byPeople, id) + '</ul></li>';
      });
      h += '</ol>';
    }
    var S = dinnerSides(v);
    if (S) {
      h += '<p class="pl-sub">Wedding Dinner</p><ol class="pl-seatrows">' + ['T', 'B'].map(function (k) {
        return '<li class="pl-rrow is-side"><span class="pl-rk">' + (k === 'T' ? 'Side A' : 'Side B') + '</span><ul class="pl-rs">' + rosterRow(S[k], byPeople, id) + '</ul></li>';
      }).join('') + '</ol>';
    }
    return h + '</div>';
  }

  /* ---------------------------------------------------------------- WHO STAYS WHERE (Owner, 2 Oct 2026) */
  /* the stays as the product names them today (window.SIYL_ROOMS — the same data the stay pages read): the stay's own label and dates,
     the property, the room category. A key the product no longer knows is not guessed at. */
  var STAGES = ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski'];
  function stayInfo(key) {
    var R = window.SIYL_ROOMS || {}, parts = String(key || '').split('/'), win = parts[0], slug = parts[1];
    for (var k in R) {
      if (!Object.prototype.hasOwnProperty.call(R, k)) continue;
      var s = R[k], w = (s.windows || []).filter(function (x) { return x.id === win; })[0]; if (!w) continue;
      var r = (s.rooms || []).filter(function (x) { return x.slug === slug; })[0]; if (!r) continue;
      return { label: w.label || '', dates: w.dates || '', property: r.property || s.name || '', room: r.name || '' };
    }
    return null;
  }
  var STATE_WORDS = { sent: 'Sent to us', held: 'Selected' };
  /* everyone the circle knows, by guest id: the joining people, then those who hold a stay but have not sent yet — their first name,
     when the room engine has none, as the seating plan knows it (the same guest id); never matched by a name */
  function everyone(d) {
    var m = byId(d), S = window.SIYL_SEATS, v = S && S.view ? S.view() : null, seatNames = {};
    if (v) { ceremonySeats(v).concat(dinnerSides(v) ? dinnerSides(v).T.concat(dinnerSides(v).B) : []).forEach(function (s) { if (held(s) && s.name && !seatNames[s.holder]) seatNames[s.holder] = s.name; }); }
    ((d && d.others) || []).forEach(function (p) { if (!m[p.id]) m[p.id] = p.name ? p : Object.assign({}, p, { name: seatNames[p.id] || '' }); });
    return m;
  }
  function nameOfId(all, id) { var p = all[id]; return (p && p.name) || 'A guest'; }
  /* one person's stays, in the order of the journey */
  function staysOfPerson(p) { return ((p && p.stays) || []).slice().sort(function (a, b) { return STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage); }); }
  function stayLine(st, all) {
    var info = stayInfo(st.key); if (!info) return '';
    var w = (st.with || []).map(function (g) { return nameOfId(all, g); });
    return '<li class="pl-st" data-pl-stay="' + esc(st.stage) + '"><span class="pl-stl"><span>' + esc(info.label) + '</span> · <span>' + esc(info.dates) + '</span></span>' +
      '<span class="pl-stp">' + esc(info.property) + '</span><span class="pl-str">' + esc(info.room) + '</span>' +
      (w.length ? '<span class="pl-stw"><span>Sharing with</span> <span data-i18n-skip>' + esc(w.join(' · ')) + '</span></span>' : '') +
      '<span class="pl-chip" data-state="' + esc(st.state) + '">' + esc(STATE_WORDS[st.state] || '') + '</span></li>';
  }
  function staysHtml(d) {
    var all = everyone(d), groups = {};
    var h = '<div class="pl-stays" data-pl-stays><p class="pl-label">Who stays where</p>';
    /* unknown is never "nobody": an unreadable engine, or stay names this page could not load, is said as such */
    if (!d.staysKnown || !window.SIYL_ROOMS) return h + '<p class="pl-none" data-pl-stays-state="unavailable">Where everyone stays could not be read just now.</p></div>';
    Object.keys(all).forEach(function (id) {
      staysOfPerson(all[id]).forEach(function (st) {
        var info = stayInfo(st.key); if (!info) return;
        var g = groups[st.stage] = groups[st.stage] || { info: info, props: {} };
        var pr = g.props[info.property] = g.props[info.property] || {};
        var rm = pr[info.room] = pr[info.room] || { units: [] };
        /* the people who share one unit are one group: whoever is already in a group with this person joins it */
        var unit = rm.units.filter(function (u) { return u.ids.indexOf(id) >= 0 || (st.with || []).some(function (x) { return u.ids.indexOf(x) >= 0; }); })[0];
        if (!unit) { unit = { ids: [], states: {} }; rm.units.push(unit); }
        if (unit.ids.indexOf(id) < 0) unit.ids.push(id);
        unit.states[id] = st.state;
      });
    });
    var stages = STAGES.filter(function (s) { return groups[s]; });
    if (!stages.length) return h + '<p class="pl-none" data-pl-stays-state="none">Nobody has chosen a stay yet.</p></div>';
    stages.forEach(function (s) {
      var g = groups[s];
      h += '<div class="pl-stage" data-pl-stage="' + esc(s) + '"><p class="pl-sub"><span>' + esc(g.info.label) + '</span> · <span>' + esc(g.info.dates) + '</span></p>';
      Object.keys(g.props).sort().forEach(function (prop) {
        h += '<div class="pl-prop"><p class="pl-propn">' + esc(prop) + '</p>';
        Object.keys(g.props[prop]).sort().forEach(function (room) {
          var units = g.props[prop][room].units;
          h += '<div class="pl-room"><p class="pl-roomn">' + esc(room) + '</p><ul class="pl-units">' + units.map(function (u) {
            var sent = u.ids.every(function (x) { return u.states[x] === 'sent'; });
            return '<li class="pl-unit">' + u.ids.map(function (x) { var p = all[x] || { id: x, name: 'A guest' };
              return '<span class="pl-up"><span class="pl-ava sm" data-pl-ava="' + esc(x) + '"' + (p.photo ? ' data-photo="1"' : '') + ' aria-hidden="true">' + esc(initials(p.name || 'A guest')) + '</span><span class="pl-pn" data-i18n-skip>' + esc(p.name || 'A guest') + '</span></span>'; }).join('') +
              '<span class="pl-chip" data-state="' + (sent ? 'sent' : 'held') + '">' + esc(sent ? STATE_WORDS.sent : STATE_WORDS.held) + '</span></li>';
          }).join('') + '</ul></div>';
        });
        h += '</div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  /* ---------------------------------------------------------------- ONE PERSON (Owner, 2 Oct 2026) */
  /* every participant's card opens on the four answers: the ceremony place, the dinner seat, every stay — or a calm "not yet" */
  function seatIndex(v) {
    var out = { ceremony: {}, dinner: {} };
    ceremonySeats(v).forEach(function (s) { if (held(s)) out.ceremony[s.holder] = label(s.seatId); });
    couplePlaces(v).forEach(function (c) { if (c.holder) out.ceremony[c.holder] = { role: ROLE_WORDS[c.role] || c.role }; });
    var S = dinnerSides(v); if (S) S.T.concat(S.B).forEach(function (s) { if (held(s)) out.dinner[s.holder] = label(s.seatId); });
    return out;
  }
  function personCard(p, d, seats, open) {
    var all = everyone(d), st = staysOfPerson(p);
    var nat = p && p.nationality ? '<span class="pl-pc">' + esc(p.nationality) + '</span>' : '';
    var cer = seats ? seats.ceremony[p.id] : null, din = seats ? seats.dinner[p.id] : null;
    var stays = !d.staysKnown || !window.SIYL_ROOMS ? '<p class="pl-none">Could not be read just now.</p>' : st.length ? '<ul class="pl-stlist">' + st.map(function (x) { return stayLine(x, all); }).join('') + '</ul>' : '<p class="pl-none" data-pl-nostay>Not selected yet</p>';
    return '<li class="pl-p pl-pp"' + (p.role ? ' data-role="' + esc(p.role) + '"' : '') + ' data-pl-person="' + esc(p.id) + '"><details class="pl-pd"' + (open ? ' open' : '') + '><summary>' +
      '<span class="pl-ava" data-pl-ava="' + esc(p.id) + '"' + (p.photo ? ' data-photo="1"' : '') + ' aria-hidden="true">' + esc(initials(p.name)) + '</span>' +
      '<span class="pl-pt"><span class="pl-pn" data-i18n-skip>' + esc(p.name) + '</span>' + (p.role ? '<span class="pl-pr">' + esc(ROLE_WORDS[p.role] || p.role) + '</span>' : nat) + '</span></summary>' +
      '<dl class="pl-pdl">' +
        '<div><dt>Vow Ceremony</dt><dd>' + (!seats ? '—' : cer && cer.role ? '<span>' + esc(cer.role) + '</span> · <span>Front centre</span>' : esc(cer || 'No seat yet')) + '</dd></div>' +
        '<div><dt>Wedding Dinner</dt><dd>' + (seats ? esc(din || 'No seat yet') : '—') + '</dd></div>' +
        '<div class="pl-pds"><dt>Stays</dt><dd>' + stays + '</dd></div>' +
      '</dl></details></li>';
  }
  function peopleCards(d, v) {
    var list = d.people || []; if (!list.length) return '<p class="pl-none">Nobody yet.</p>';
    var seats = v && (v.ceremony || v.dinner) ? seatIndex(v) : null;
    return '<ul class="pl-people pl-grid-people pl-cards">' + list.map(function (p) { return personCard(p, d, seats, circleState.open[p.id]); }).join('') + '</ul>';
  }

  /* ---------------------------------------------------------------- My Profile · Your Wedding Circle */
  var circleState = { all: true, genre: null, after: null, open: {} };
  function circleHtml(me, hosts) {
    var d = data, S = window.SIYL_SEATS, v = S && S.view ? S.view() : null;
    var h = '<section class="prep-sec pl-circle" id="circle" data-pl-circle><p class="t-l1">Your wedding circle</p><h2 class="t-h2">Who you share this wedding with.</h2>';
    if (!d) return h + (failed
      ? '<div data-pl-circle-state="unavailable"><p class="t-b2 measure">We couldn’t load your Wedding Circle just now.</p><p style="margin-top:12px"><button type="button" class="p-act" data-pl-retry>Try again</button></p></div></section>'
      : '<p class="t-b2 measure" data-pl-circle-state="loading">Looking up who is joining us…</p></section>');
    var byPeople = everyone(d);
    /* the four questions, in order: who is joining · where they sit (ceremony, dinner) · where they stay — then the pulse */
    return h + '<div class="pl-circle-grid">' + joiningHtml(d, true, v) +
      '<div class="pl-seats">' + ceremonyHtml(v, me, byPeople) + dinnerHtml(v, me, byPeople) + fullSeatingHtml(v, me, byPeople) + '</div>' +
      staysHtml(d) +
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
    wireCircle: function (root, again) {
      wire(root, circleState, again, '[data-pl-circle]'); paint(root);
      /* a person's card stays open across a redraw (the circle redraws when the seats or the people change) */
      if (root && root.addEventListener && !root.getAttribute('data-pl-toggles')) {
        root.setAttribute('data-pl-toggles', '1');
        root.addEventListener('toggle', function (e) { var li = e.target && e.target.closest ? e.target.closest('[data-pl-person]') : null; if (li) circleState.open[li.getAttribute('data-pl-person')] = !!e.target.open; }, true);
      }
      /* the one retry: back to "looking up" at once, then the read again */
      var rb = root && root.querySelector('[data-pl-retry]');
      if (rb) rb.addEventListener('click', function () { failed = false; if (typeof again === 'function') again(); load(true); });
    },
    aroundCeremony: aroundCeremony, aroundDinner: aroundDinner, genreWords: genreWords
  };
  /* every page that shows the circle or the pulse: a room change re-reads it (bounded, see refresh) */
  if (document.addEventListener) document.addEventListener('siyl:units', refresh);
  if (document.querySelector) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireHome); else wireHome(); }
})();
