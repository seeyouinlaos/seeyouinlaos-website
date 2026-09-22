/* ============================================================================
   MY PROFILE · THE RETURN PAGE (Owner, 21 Sep 2026).
   Three living pieces beside the guest's own account, every one of them read
   from what already is — never invented, never rotated for novelty:
   · WHO'S JOINING US — the wedding community as the server knows it
     (GET /api/community: every guest whose trip has been sent and who is
     joining; the first name as the guest spells it; the portrait through the
     existing authenticated photo read, initials where there is none).
   · THE JOURNEY BEGINS IN — a day countdown to 21 February 2027, Bangkok,
     computed from the clock; the wedding, 28 February, once the journey has
     begun; never a negative number.
   · THE JOURNEY IN NUMBERS — counted from the canonical data on the page
     (the stay records, the journey windows, the transport, the experiences);
     a category that cannot be counted is not shown.
   Movement: one count-up / reveal when a block enters the viewport; none
   under prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';
  var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* what has already been revealed on this page: a re-render (the Bag, a photo) never replays the movement */
  var shown = {};

  /* ---------------------------------------------------------- THE COUNTDOWN */
  var JOURNEY = { start: [2027, 2, 21], wedding: [2027, 2, 28], end: [2027, 3, 8] };
  function local(y, m, d) { return new Date(y, m - 1, d); }
  function daysBetween(a, b) { return Math.round((local(b.getFullYear(), b.getMonth() + 1, b.getDate()) - local(a.getFullYear(), a.getMonth() + 1, a.getDate())) / 86400000); }
  /* the state for one moment: never negative, never a clock — days, and the hours only on the eve */
  function countdown(now) {
    now = now || new Date();
    var start = local.apply(null, JOURNEY.start), wed = local.apply(null, JOURNEY.wedding), end = local.apply(null, JOURNEY.end);
    var toStart = daysBetween(now, start), toWed = daysBetween(now, wed), toEnd = daysBetween(now, end);
    if (toStart > 0) return { phase: 'before', n: toStart, unit: toStart === 1 ? 'day' : 'days', lead: 'The journey begins in', tail: '21 February 2027 · Bangkok' };
    if (toStart === 0) return { phase: 'start', n: 0, unit: 'today', lead: 'The journey begins', tail: 'Today · 21 February 2027 · Bangkok' };
    if (toWed > 0) return { phase: 'journey', n: toWed, unit: toWed === 1 ? 'day' : 'days', lead: 'The wedding is in', tail: '28 February 2027 · Vientiane · day ' + pad2(1 - toStart) + ' of the journey' };
    if (toWed === 0) return { phase: 'wedding', n: 0, unit: 'today', lead: 'The wedding', tail: 'Today · Sunday, 28 February 2027 · Vientiane' };
    if (toEnd >= 0) return { phase: 'after', n: 1 - toStart, unit: 'of 16 days', lead: 'The journey continues · day', tail: 'Until 8 March 2027 · Bangkok' };
    return { phase: 'done', n: 16, unit: 'days', lead: 'The journey', tail: '21 February – 8 March 2027 · Thailand · Laos · China' };
  }
  function countdownHtml(now) {
    var c = countdown(now);
    return '<section class="prep-sec pf-count" id="countdown" data-countdown="' + c.phase + '" aria-label="' + esc(c.lead + ' ' + c.n + ' ' + c.unit) + '">' +
      '<p class="t-l1">' + esc(c.lead) + '</p>' +
      '<p class="pf-num" data-count-to="' + c.n + '" data-key="countdown"' + (shown.countdown ? ' data-counted="1"' : '') + '><span class="pf-num-v">' + (calm || shown.countdown ? c.n : 0) + '</span><span class="pf-num-u">' + esc(c.unit) + '</span></p>' +
      '<p class="t-l1 mute">' + esc(c.tail) + '</p></section>';
  }

  /* ---------------------------------------------------- THE JOURNEY IN NUMBERS */
  var COUNTRY = { Bangkok: 'Thailand', Vientiane: 'Laos', Kunming: 'China', Lijiang: 'China' };
  function parseEnd(dates) { var m = /(\d{1,2}) (\w+) (\d{4})$/.exec(String(dates || '')); if (!m) return null; var mo = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].indexOf(m[2]); return mo < 0 ? null : local(Number(m[3]), mo + 1, Number(m[1])); }
  function numbers() {
    var M = window.SIYL_STAY_MEDIA || null, R = window.SIYL_ROOMS || null, T = window.SIYL_TRANSPORT || null, E = window.SIYL_EXP || null, GR = window.SIYL_GRAPH || null;
    var out = [];
    if (M) {
      var cities = [], countries = [];
      Object.keys(M).forEach(function (k) { var c = M[k].city; if (c && cities.indexOf(c) < 0) cities.push(c); var n = COUNTRY[c]; if (n && countries.indexOf(n) < 0) countries.push(n); });
      if (countries.length) out.push({ key: 'countries', n: countries.length, label: 'Countries', note: countries.join(' · ') });
      if (cities.length) out.push({ key: 'cities', n: cities.length, label: 'Cities', note: cities.join(' · ') });
      var hotels = Object.keys(M).filter(function (k) { return k !== '_taxonomy' && M[k] && M[k].images; }).length;
      if (hotels) out.push({ key: 'stays', n: hotels, label: 'Houses & hotels', note: 'to choose from' });
    }
    if (R && GR && GR.STAGES && GR.STAGE_IDS) {
      var nights = 0, ends = [], starts = [];
      GR.STAGES.filter(function (s) { return s.kind === 'stay'; }).forEach(function (s) {
        var id = (GR.STAGE_IDS[s.key] || [s.key])[0], win = null;
        Object.keys(R).forEach(function (k) { (R[k].windows || []).forEach(function (w) { if (w.id === id) win = w; }); });
        if (win) { nights += Number(win.n || 0); var e = parseEnd(win.dates); if (e) ends.push(e); var st = /^(\d{1,2})/.exec(win.dates); if (st && e) starts.push(local(e.getFullYear(), e.getMonth() + 1, Number(st[1]))); }
      });
      var trainNights = T && T.train && /(\d+) – (\d+) \w+ \d{4}/.test(T.train.dates || '') ? 1 : 0;   /* the night train: one night on board */
      if (nights) out.push({ key: 'nights', n: nights + trainNights, label: 'Nights', note: trainNights ? nights + ' in a house · ' + trainNights + ' on the night train' : '' });
      if (ends.length) { var last = ends.sort(function (a, b) { return b - a; })[0], first = local.apply(null, JOURNEY.start); var days = daysBetween(first, last) + 1; if (days > 0) out.push({ key: 'days', n: days, label: 'Days', note: '21 February – ' + last.getDate() + ' March 2027' }); }
    }
    if (T) {
      var trains = 0, flights = {};
      Object.keys(T).forEach(function (k) { var t = T[k]; if (!t) return; if (/railway/i.test(t.operator || '')) trains++; if (/airlines?/i.test(t.operator || '')) (String(t.name || '').match(/MU\d+/g) || []).forEach(function (f) { flights[f] = 1; }); });
      if (trains) out.push({ key: 'trains', n: trains, label: 'Trains', note: 'a night train · a high-speed train' });
      if (Object.keys(flights).length) out.push({ key: 'flights', n: Object.keys(flights).length, label: 'Flights', note: Object.keys(flights).join(' · ') });
    }
    if (E) {
      /* THE TAXONOMY (Owner, 22 Sep 2026): a place counts once, in the one category it IS — a café at which lunch happens is a
         café, a bar is a bar, the club of the wedding night is nightlife; the temple of the wedding morning and the great stupa
         are the temples; four museums. The counting lives in assets/discover.js (one reading for every page). */
      var D = window.SIYL_DISCOVER, c = D ? D.counts() : null;
      if (c) {
        if (c.restaurants) out.push({ key: 'restaurants', n: c.restaurants, label: 'Restaurants', note: 'lunches and dinners' });
        if (c.cafes) out.push({ key: 'cafes', n: c.cafes, label: 'Cafés', note: '' });
        if (c.nightlife) out.push({ key: 'bars', n: c.nightlife, label: 'Bars & nightlife', note: 'and the club of the wedding night' });
        if (c.museums) out.push({ key: 'museums', n: c.museums, label: 'Museums', note: 'Vientiane' });
        if (c.temples) out.push({ key: 'temples', n: c.temples, label: 'Temples & stupas', note: 'Vientiane' });
      }
    }
    return out;
  }
  function numbersHtml() {
    var list = numbers(); if (!list.length) return '';
    return '<section class="prep-sec pf-numbers" id="numbers" aria-label="The journey in numbers"><p class="t-l1">The journey in numbers</p>' +
      '<div class="pf-grid">' + list.map(function (x) {
        var k = 'stat:' + x.key;
        return '<div class="pf-stat" data-stat="' + x.key + '"><p class="pf-num" data-count-to="' + x.n + '" data-key="' + k + '"' + (shown[k] ? ' data-counted="1"' : '') + '><span class="pf-num-v">' + (calm || shown[k] ? pad2(x.n) : '00') + '</span></p><p class="t-l1">' + esc(x.label) + '</p>' + (x.note ? '<p class="t-b2 mute">' + esc(x.note) + '</p>' : '') + '</div>';
      }).join('') + '</div></section>';
  }

  /* ----------------------------------------------------- WHO'S JOINING US */
  var data = null, loading = null;
  function load(force) {
    var a = auth(); if (!a || !a.bearer) { data = null; return Promise.resolve(null); }
    if (data && !force) return Promise.resolve(data);
    if (loading && !force) return loading;
    loading = fetch('/api/community', { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { loading = null; data = d && d.ok ? d : null; try { document.dispatchEvent(new CustomEvent('siyl:community')); } catch (e) {} return data; }).catch(function () { loading = null; return null; });
    return loading;
  }
  function initials(name) { var w = String(name || '').trim().split(/\s+/); return (w[0] ? w[0][0] : '') + (w[1] ? w[1][0] : ''); }
  function communityHtml(d, me) {
    var a = auth();
    if (!d) return '<section class="prep-sec pf-community" id="community" data-community="loading"><p class="t-l1">Who’s joining us</p><div class="p-card flat"><p class="t-b2 measure">Reading who has joined…</p></div></section>';
    var list = d.guests || [], n = d.count || list.length;
    var couple = list.filter(function (g) { return g.role; }), guests = list.filter(function (g) { return !g.role; });
    if (!n) return '<section class="prep-sec pf-community" id="community" data-community="0"><p class="t-l1">Who’s joining us</p><div class="p-card flat"><p class="t-b1 measure">Nobody has sent their trip yet — yours could be the first.</p></div></section>';
    /* RECENTLY JOINED: only a real day — the day a trip was first sent; the couple stands in the community without one */
    var recent = list.filter(function (g) { return g.joinedAt; }).sort(function (x, y) { return (y.joinedAt > x.joinedAt ? 1 : y.joinedAt < x.joinedAt ? -1 : 0); }).slice(0, 6);
    var meIn = a && list.some(function (g) { return g.guestId === a.guestId; });
    var line = couple.length ? (n === 1 ? '1 of us is joining so far' : n + ' of us are joining so far') : (n === 1 ? '1 guest has joined so far' : n + ' guests have joined so far');
    return '<section class="prep-sec pf-community" id="community" data-community="' + n + '" data-couple="' + couple.length + '"><p class="t-l1">Who’s joining us</p>' +
      '<h2 class="t-h2">' + line + '</h2>' +
      '<p class="t-b2 measure">' + (meIn ? 'You are among them. ' : '') + (couple.length ? 'Haruthai &amp; Suthep, and everyone whose trip has reached Guest Relations — new faces as they arrive.' : 'Everyone whose trip has reached Guest Relations — new faces as they arrive.') + '</p>' +
      '<div class="pf-people' + (shown.people ? ' is-in' : '') + '" data-people>' + list.map(function (g, i) {
        return '<div class="pf-person' + (g.role ? ' is-couple' : '') + '" data-person="' + esc(g.guestId) + '"' + (g.role ? ' data-role="' + esc(g.role) + '"' : '') + ' style="--i:' + i + '"><span class="pf-ava" data-ava="' + esc(g.guestId) + '" role="img" aria-label="' + esc(g.name) + (g.role ? ' · ' + esc(g.role) : '') + '"><i aria-hidden="true">' + esc(initials(g.name)) + '</i></span><span class="pf-person-n">' + esc(g.name) + '</span>' + (g.role ? '<span class="pf-person-r">' + esc(g.role) + '</span>' : '') + '</div>';
      }).join('') + '</div>' +
      (recent.length ? '<p class="t-l1 mute" style="margin-top:var(--s5)">Recently joined</p><p class="t-b1">' + recent.map(function (g) { return esc(g.name); }).join(' · ') + '</p>' : '') +
      '</section>';
  }
  /* the portraits arrive through the existing authenticated read (SIYL_AVATAR.of), a photo replacing the initials */
  function paintPortraits(container) {
    var AV = window.SIYL_AVATAR; if (!AV || !AV.of) return;
    container.querySelectorAll('[data-ava]').forEach(function (el) {
      var gid = el.getAttribute('data-ava'); if (!gid || el.getAttribute('data-ava-done')) return; el.setAttribute('data-ava-done', '1');
      AV.of(gid).then(function (url) { if (!url || !el.isConnected) return; var im = document.createElement('img'); im.alt = ''; im.src = url; el.appendChild(im); el.classList.add('has-photo'); });
    });
  }

  /* --------------------------------------------------------- THE MOVEMENT */
  function countUp(el) {
    var to = Number(el.getAttribute('data-count-to') || 0), v = el.querySelector('.pf-num-v'), padded = el.closest('.pf-stat') !== null;
    if (el.getAttribute('data-key')) shown[el.getAttribute('data-key')] = true;
    if (!v) return; if (calm || to === 0) { v.textContent = padded ? pad2(to) : String(to); return; }
    var t0 = null, dur = 900; function tick(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3), n = Math.round(to * e); v.textContent = padded ? pad2(n) : String(n); if (k < 1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }
  function wire(root) {
    root = root || document;
    var nums = [].slice.call(root.querySelectorAll('[data-count-to]:not([data-counted])'));
    var people = root.querySelector('[data-people]');
    if (!('IntersectionObserver' in window) || calm) { nums.forEach(function (el) { el.setAttribute('data-counted', '1'); countUp(el); }); if (people) { people.classList.add('is-in'); shown.people = true; } return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting) return; var el = e.target; io.unobserve(el); if (el.hasAttribute('data-count-to')) { el.setAttribute('data-counted', '1'); countUp(el); } else { el.classList.add('is-in'); shown.people = true; } }); }, { threshold: 0.25 });
    nums.forEach(function (el) { io.observe(el); }); if (people && !people.classList.contains('is-in')) io.observe(people);
  }
  window.SIYL_COMMUNITY = { load: load, data: function () { return data; }, countdown: countdown, countdownHtml: countdownHtml, numbers: numbers, numbersHtml: numbersHtml, communityHtml: communityHtml, paintPortraits: paintPortraits, wire: wire, JOURNEY: JOURNEY };
  document.addEventListener('siyl:signout', function () { data = null; });
})();
