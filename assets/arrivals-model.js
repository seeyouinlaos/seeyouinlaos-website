/* ============================================================================
   H&S WEDDING 2027 — GUEST ARRIVALS & TRANSPORTATION · the console's half (HS-059 · Owners, 24 Nov 2026)

   Puts together what GET admin/arrivals read (src/billing/arrivals.js): the base (guests, room plan, 002 dates, 012, the Owners'
   records) and the facts of every invitation's own sent trip. PURE: no request, no storage, no clock — strings and lists only.
   Every count it gives is the length of a list of guest ids; the console shows those lists by name.

   NOTHING IS INVENTED. A night is counted only where a source places the guest:
     ROOM   a dated room of the room plan (002 check-in → check-out)
     TRAIN  the night of the night train (its 002 check-in) when the guest's own sent trip or the Owners' record holds it
     GAP    a night between two dated facts at the SAME place with nothing recorded — a leg's arrival day included, the next room
            night excluded (a train arriving 25 Feb and a room from 27 Feb: the nights of 25 and 26 Feb, "accommodation not
            recorded"); never before the first or after the last fact
   What a guest only SAID (the parts of the trip they join) is shown per part, "as sent", never as a night. 012 is compared with the
   room plan by HOTEL ROOM NUMBER and night — never by a name. Nothing changes a booking, a room, a price or a state.
   ========================================================================== */
(function () {
  'use strict';
  var PLACES = ['BANGKOK', 'VIENTIANE', 'CHINA'];
  var PLACE_OF = { 'bkk-stay': 'BANGKOK', kempinski: 'BANGKOK', prewed: 'VIENTIANE', wedstay: 'VIENTIANE', guesthouse: 'VIENTIANE', kmg: 'CHINA', ljg: 'CHINA' };
  var LEGS = [
    { key: 'train', letter: 'B', name: 'Night train Bangkok → Nong Khai · van to Vientiane', from: 'BANGKOK', to: 'VIENTIANE', overnight: true },
    { key: 'mu9646', letter: 'E', name: 'Flight MU9646 Vientiane → Kunming', from: 'VIENTIANE', to: 'CHINA' },
    { key: 'c86', letter: 'G', name: 'Train Kunming → Lijiang', from: 'CHINA', to: 'CHINA' },
    { key: 'return', letter: 'I', name: 'Flight Lijiang → Bangkok', from: 'CHINA', to: 'BANGKOK' }
  ];
  var LEG = {}; LEGS.forEach(function (l) { LEG[l.key] = l; });
  var PARTS = [
    { key: 'bangkok', label: 'Bangkok', place: 'BANGKOK', windows: ['bkk-stay', 'kempinski'], legs: ['train', 'return'] },
    { key: 'vientianePreWedding', label: 'Vientiane · before the wedding', place: 'VIENTIANE', windows: ['prewed'], legs: ['train'] },
    { key: 'vientianeWedding', label: 'Vientiane · the wedding', place: 'VIENTIANE', windows: ['wedstay', 'guesthouse'], legs: [] },
    { key: 'china', label: 'China', place: 'CHINA', windows: ['kmg', 'ljg'], legs: ['mu9646', 'c86', 'return'] }
  ];
  var ORDER = ['bkk-stay', 'prewed', 'wedstay', 'guesthouse', 'kmg', 'ljg', 'kempinski'];
  var NIGHT_CATS = ['COUPLE', 'ROOM_CONFIRMED', 'ROOM_AWAITING', 'ROOM_NOT_SENT', 'ROOM_NOT_READ', 'TRAIN', 'NOT_RECORDED'];
  var TRACKS = ['COUPLE', 'IN_ROOM_PLAN', 'TRAVEL_ONLY', 'STAY_WITHOUT_ROOM', 'JOINING_NO_ARRANGEMENT', 'DECLINED', 'NOT_SENT', 'NOT_READ'];
  var ISO = /^\d{4}-\d{2}-\d{2}$/;

  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }
  function byId(a, b) { a = String(a == null ? '' : a); b = String(b == null ? '' : b); return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0); }
  function ids(list) { var o = {}, out = []; (list || []).forEach(function (x) { if (x && !o[x]) { o[x] = 1; out.push(x); } }); return out.sort(byId); }
  function windowOf(key) { return String(key || '').split('/')[0]; }
  /* calendar arithmetic on whole days */
  var DAY = 86400000;
  function dayNo(iso) { return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY; }
  function isoOf(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  function addDay(iso, n) { return isoOf(dayNo(iso) + n); }
  function nightsBetween(from, to) { var out = []; if (!ISO.test(from || '') || !ISO.test(to || '')) return out; for (var d = dayNo(from), e = dayNo(to); d < e && out.length < 60; d++) out.push(isoOf(d)); return out; }

  /**
   * base   the answer of GET admin/arrivals · facts  { invitationId: the answer of ?facts= } (a missing one = not read)
   */
  function assemble(base, facts) {
    var B = base || {}, FX = facts || {}, plan = B.plan || null, dates = B.dates || null, owner = B.owner || {};
    var gaps = (B.gaps || []).slice();
    var guests = (B.guests || []).slice().sort(function (a, b) { return byId(a.guestId, b.guestId); });
    var known = {}; guests.forEach(function (g) { known[g.guestId] = g; });
    function dateOf(key) { var d = dates && own(dates, key); return d && ISO.test(d.checkIn || '') ? d : null; }
    var unread = guests.filter(function (g) { return !own(FX, g.invitationId); }).map(function (g) { return g.guestId; });
    if (unread.length) gaps.push('the trips of ' + unread.length + ' guest' + (unread.length === 1 ? '' : 's') + ' could not be read just now — they are listed as "not read"');

    /* the room plan by guest */
    var roomsOf = {}, units = plan ? plan.units : [], strangers = [];
    units.forEach(function (u) {
      var occ = u.occupants.map(function (o) { return o.guestId; });
      u.occupants.forEach(function (o) {
        if (!known[o.guestId]) { strangers.push(o.guestId); return; }
        (roomsOf[o.guestId] = roomsOf[o.guestId] || []).push({ key: u.key, window: u.window, place: PLACE_OF[u.window], label: u.label, kind: u.kind, bed: !!o.bed, hotelRoom: u.hotelRoom,
          sharedWith: occ.filter(function (x) { return x !== o.guestId; }), dates: dateOf(u.key) });
      });
    });
    var waitOf = {}; (plan ? plan.waitlist : []).forEach(function (w) { (waitOf[w.guestId] = waitOf[w.guestId] || []).push(w); });

    var G = {}, checks = {}, nightOf = {}, daysOf = {};
    function flag(k, g, why, day) { (checks[k] = checks[k] || []).push({ guestId: g, why: why, day: day || null }); }
    guests.forEach(function (gg) {
      var g = gg.guestId, f = own(FX, gg.invitationId) || null, booking = f ? f.booking : null;
      var ownE = (own(owner, g) || []).filter(function (x) { return x && x.key; });
      var rooms = (roomsOf[g] || []).sort(function (a, b) { return ORDER.indexOf(a.window) - ORDER.indexOf(b.window); });
      function status(w) {
        var ob = ownE.filter(function (x) { return windowOf(x.key) === w; })[0];
        if (booking === 'CONFIRMED' || (ob && ob.state === 'CONFIRMED')) return 'CONFIRMED';
        if (gg.couple && booking !== 'SENT') return 'HOSTS';   /* the couple's own rooms: theirs, never a booking to confirm */
        if (booking === 'SENT' || ob) return 'AWAITING';
        return booking == null ? 'NOT_READ' : 'NOT_SENT';
      }
      rooms.forEach(function (r) { r.status = status(r.window); r.source = ownE.some(function (x) { return windowOf(x.key) === r.window; }) ? 'OWNER_RECORDED' : 'ROOM_PLAN'; });
      var legs = [];
      (f ? f.legs : []).forEach(function (k) { if (LEG[k]) legs.push({ key: k, source: 'SENT_TRIP', status: booking === 'CONFIRMED' ? 'CONFIRMED' : booking === 'SENT' ? 'AWAITING' : 'NOT_SENT' }); });
      ownE.forEach(function (x) { if (LEG[x.key] && !legs.some(function (l) { return l.key === x.key; })) legs.push({ key: x.key, source: 'OWNER_RECORDED', status: x.state === 'CONFIRMED' ? 'CONFIRMED' : 'AWAITING' }); });
      legs.forEach(function (l) { var d = dateOf(l.key); l.date = d ? d.checkIn : null; l.arrives = d ? (LEG[l.key].overnight ? d.checkOut : d.checkIn) : null; });
      legs.sort(function (a, b) { var x = a.date || '9', y = b.date || '9'; return x < y ? -1 : x > y ? 1 : byId(a.key, b.key); });

      /* the nights: ROOM, then the train night, then GAP between two dated facts at the same place */
      var night = {};
      rooms.forEach(function (r) {
        if (!r.dates || !r.dates.checkOut) { flag('UNDATED', g, 'room ' + r.label + ' of ' + r.key + ': 002 gives no dates just now'); return; }
        nightsBetween(r.dates.checkIn, r.dates.checkOut).forEach(function (n) {
          if (night[n]) { if (night[n].key !== r.key) flag('CONFLICT', g, 'two rooms on the night of ' + n + ' (' + night[n].key + ' · ' + r.key + ')', n); return; }
          night[n] = { place: r.place, basis: 'ROOM', status: r.status, key: r.key, label: r.label };
        });
      });
      var train = legs.filter(function (l) { return l.key === 'train'; })[0];
      if (train && train.date) {
        if (night[train.date]) flag('CONFLICT', g, 'the night train on ' + train.date + ' and a room the same night (' + night[train.date].key + ')', train.date);
        else night[train.date] = { place: 'TRAIN', basis: 'LEG', status: train.status, key: 'train' };
      }
      var roomNights = Object.keys(night).filter(function (n) { return night[n].basis === 'ROOM'; }).sort();
      function fill(from, to, place, why) { nightsBetween(from, to).forEach(function (n) { if (!night[n]) { night[n] = { place: place, basis: 'GAP', status: 'NOT_RECORDED' }; flag('GAP', g, why + ' — accommodation not recorded for the night of ' + n, n); } }); }
      legs.forEach(function (l) {
        if (!l.arrives) return;
        var next = roomNights.filter(function (n) { return n >= l.arrives; })[0];
        if (next && next > l.arrives && night[next].place === LEG[l.key].to) fill(l.arrives, next, LEG[l.key].to, 'arrives ' + l.arrives + ' (' + LEG[l.key].name + '), first room night ' + next);
      });
      legs.forEach(function (l) {
        if (!l.date) return;
        var before = roomNights.filter(function (n) { return n < l.date; }).pop();
        if (before && night[before].place === LEG[l.key].from && addDay(before, 1) < l.date) fill(addDay(before, 1), l.date, LEG[l.key].from, 'last room night ' + before + ', leaves ' + l.date);
      });
      for (var i = 1; i < roomNights.length; i++) {
        var a = roomNights[i - 1], b = roomNights[i];
        if (addDay(a, 1) < b && night[a].place === night[b].place) fill(addDay(a, 1), b, night[a].place, 'between two rooms in ' + night[a].place.toLowerCase());
      }
      /* a night between two places with nothing recorded — named for Guest Relations, never filled */
      var seq = Object.keys(night).sort();
      for (var j = 1; j < seq.length; j++) {
        var p = seq[j - 1], q = seq[j];
        if (addDay(p, 1) < q && night[p].place !== night[q].place) nightsBetween(addDay(p, 1), q).forEach(function (n) { flag('UNACCOUNTED', g, 'night of ' + n + ': between ' + night[p].place.toLowerCase() + ' and ' + night[q].place.toLowerCase() + ', nothing recorded', n); });
      }
      seq = Object.keys(night).sort();
      /* the day facts: arrive at / leave a place (the train is a leg, never a place one arrives at) */
      var days = [];
      function placeOn(n) { return night[n] && night[n].place !== 'TRAIN' ? night[n].place : null; }
      seq.forEach(function (n) { var pl = placeOn(n); if (pl && placeOn(addDay(n, -1)) !== pl) days.push({ day: n, place: pl, what: 'ARRIVE', basis: night[n].basis }); });
      seq.forEach(function (n) { var pl = placeOn(n); if (pl && placeOn(addDay(n, 1)) !== pl) days.push({ day: addDay(n, 1), place: pl, what: 'DEPART', basis: night[n].basis }); });
      legs.forEach(function (l) {
        var L = LEG[l.key];
        if (l.date && !days.some(function (d) { return d.what === 'DEPART' && d.place === L.from && d.day === l.date; })) days.push({ day: l.date, place: L.from, what: 'DEPART', basis: 'LEG' });
        if (l.arrives && L.to !== L.from && !days.some(function (d) { return d.what === 'ARRIVE' && d.place === L.to && d.day === l.arrives; })) days.push({ day: l.arrives, place: L.to, what: 'ARRIVE', basis: 'LEG' });
      });
      days.sort(function (x, y) { return x.day < y.day ? -1 : x.day > y.day ? 1 : x.what === y.what ? 0 : x.what === 'DEPART' ? -1 : 1; });

      /* the parts as sent — outside every nightly total */
      var parts = {}, sc = f && f.sent && f.sent.scope;
      if (sc && !sc.none) PARTS.forEach(function (P) {
        if (!sc[P.key]) return;
        var inPlan = rooms.some(function (r) { return P.windows.indexOf(r.window) >= 0; });
        var leg = legs.some(function (l) { return P.legs.indexOf(l.key) >= 0; });
        parts[P.key] = inPlan ? 'ROOM_IN_PLAN' : leg ? 'TRAVEL_NO_ROOM' : 'NO_ROOM_IN_PLAN';
      });
      var ownStay = ownE.some(function (x) { return PLACE_OF[windowOf(x.key)]; });
      var track = !f && !gg.couple ? 'NOT_READ' : gg.couple ? 'COUPLE' : rooms.length ? 'IN_ROOM_PLAN' : legs.length ? 'TRAVEL_ONLY'
        : ownStay || (waitOf[g] || []).length || (f.stays.length && booking !== 'DECLINED') ? 'STAY_WITHOUT_ROOM'
          : booking === 'DECLINED' ? 'DECLINED' : booking === 'NOT_SENT' ? 'NOT_SENT' : 'JOINING_NO_ARRANGEMENT';

      G[g] = { guestId: g, invitationId: gg.invitationId, partyId: gg.partyId, couple: gg.couple, booking: booking, confirmedAt: f ? f.confirmedAt : null, sent: f ? f.sent : null, track: track,
        rooms: rooms.map(function (r) { return { key: r.key, window: r.window, place: r.place, label: r.label, kind: r.kind, bed: r.bed, hotelRoom: r.hotelRoom, sharedWith: r.sharedWith,
          checkIn: r.dates ? r.dates.checkIn : null, checkOut: r.dates ? r.dates.checkOut : null, status: r.status, source: r.source }; }),
        legs: legs, owner: ownE, waitlist: waitOf[g] || [], parts: parts, flightDoc: f ? f.flightDoc : null,
        bangkokArrival: train && !rooms.some(function (r) { return r.window === 'bkk-stay'; }) ? 'NOT_RECORDED' : null,
        notRecorded: seq.filter(function (n) { return night[n].basis === 'GAP'; }).map(function (n) { return { night: n, place: night[n].place }; }),
        arrivals: days.filter(function (d) { return d.what === 'ARRIVE'; }), departures: days.filter(function (d) { return d.what === 'DEPART'; }),
        first: seq[0] || null, last: seq.length ? seq[seq.length - 1] : null };
      nightOf[g] = night; daysOf[g] = days;

      if (rooms.some(function (r) { return r.status === 'NOT_SENT'; })) flag('ROOM_NOT_SENT', g, 'a room in the room plan while the trip is ' + (booking === 'DECLINED' ? 'declined' : 'not sent') + ' and the Owners recorded nothing');
      if (train && !rooms.some(function (r) { return r.window === 'bkk-stay'; })) flag('BANGKOK_NOT_RECORDED', g, 'on the night train from Bangkok (' + (train.date || 'date not readable') + ') — Bangkok arrival and accommodation not recorded', train.date);
      else if (parts.bangkok === 'NO_ROOM_IN_PLAN') flag('BANGKOK_NOT_RECORDED', g, 'joins Bangkok as sent — no room in the room plan, arrival not recorded');
      Object.keys(parts).forEach(function (k) { if (parts[k] === 'NO_ROOM_IN_PLAN' && k !== 'bangkok') flag('PART_NO_ROOM', g, 'joins ' + PARTS.filter(function (P) { return P.key === k; })[0].label + ' as sent — no room in the room plan, accommodation not recorded'); });
      if (track === 'JOINING_NO_ARRANGEMENT') flag('NOTHING_DATED', g, 'trip sent and joining — nothing booked or placed');
      if ((waitOf[g] || []).length) flag('WAITLIST', g, 'on the waiting list: ' + waitOf[g].map(function (w) { return w.stage + (w.position ? ' #' + w.position : ''); }).join(', '));
      if (ownStay && !rooms.length) flag('OWNER_NO_ROOM', g, 'a stay recorded by the Owners, no room in the room plan');
      if (track === 'NOT_READ') flag('NOT_READ', g, 'the sent trip could not be read just now');
    });
    ids(strangers).forEach(function (g) { flag('NOT_IN_INDEX', g, 'in the room plan, not a guest of the register'); });
    (B.ambiguous || []).forEach(function (g) { flag('AMBIGUOUS', g, 'one guest id on two invitations — never resolved'); });
    /* the same room, different states */
    units.forEach(function (u) {
      var here = u.occupants.map(function (o) { return o.guestId; }).filter(function (g) { return G[g]; });
      var st = {}; here.forEach(function (g) { var r = G[g].rooms.filter(function (x) { return x.key === u.key && x.label === u.label; })[0]; if (r) st[g] = r.status; });
      var kinds = ids(Object.keys(st).map(function (g) { return st[g]; }));
      if (kinds.length > 1) here.forEach(function (g) { flag('MIXED_STATES', g, 'room ' + u.label + ' of ' + u.key + (u.hotelRoom ? ' (room ' + u.hotelRoom.display + ')' : '') + ': ' + here.map(function (x) { return x + ' ' + (st[x] || ''); }).join(' · ')); });
    });
    /* 002: the stated nights against its own dates */
    if (dates) Object.keys(dates).forEach(function (key) {
      var d = dates[key];
      if (d && d.nights != null && PLACE_OF[windowOf(key)] && ISO.test(d.checkIn || '') && ISO.test(d.checkOut || '') && nightsBetween(d.checkIn, d.checkOut).length !== Number(d.nights)) flag('DATES_002', null, '002 ' + (d.item || key) + ': ' + d.nights + ' nights stated, ' + nightsBetween(d.checkIn, d.checkOut).length + ' between ' + d.checkIn + ' and ' + d.checkOut);
    });

    /* the window: from 002's own dates and the guests' nights */
    var all = [];
    if (dates) Object.keys(dates).forEach(function (k) { var d = dates[k]; if (d && ISO.test(d.checkIn || '')) { all.push(d.checkIn); if (ISO.test(d.checkOut || '')) all.push(d.checkOut); } });
    guests.forEach(function (gg) { var ks = Object.keys(nightOf[gg.guestId]).sort(); if (ks.length) all.push(ks[0], addDay(ks[ks.length - 1], 1)); });
    all.sort();
    var firstDay = all[0] || null, lastDay = all.length ? all[all.length - 1] : null;
    var nightList = firstDay && lastDay ? nightsBetween(firstDay, lastDay) : [];
    var dayList = firstDay && lastDay ? nightsBetween(firstDay, addDay(lastDay, 1)) : [];

    function catOf(g, x) { return G[g].couple ? 'COUPLE' : x.place === 'TRAIN' ? 'TRAIN' : x.basis === 'GAP' ? 'NOT_RECORDED' : x.status === 'CONFIRMED' ? 'ROOM_CONFIRMED' : x.status === 'AWAITING' ? 'ROOM_AWAITING' : x.status === 'NOT_READ' ? 'ROOM_NOT_READ' : 'ROOM_NOT_SENT'; }
    var nights = nightList.map(function (n) {
      var places = {}, total = 0;
      guests.forEach(function (gg) { var g = gg.guestId, x = nightOf[g][n]; if (!x) return; var c = catOf(g, x); places[x.place] = places[x.place] || {}; (places[x.place][c] = places[x.place][c] || []).push(g); total += 1; });
      return { night: n, places: places, total: total };
    });
    var facts = {};
    guests.forEach(function (gg) { daysOf[gg.guestId].forEach(function (f) { var F = facts[f.day] = facts[f.day] || { ARRIVE: {}, DEPART: {} }; (F[f.what][f.place] = F[f.what][f.place] || []).push(gg.guestId); }); });
    var follow = {};
    Object.keys(checks).forEach(function (k) { checks[k].forEach(function (c) { if (c.guestId && c.day) (follow[c.day] = follow[c.day] || []).push(c.guestId); }); });
    var days = dayList.map(function (d) {
      var F = facts[d] || { ARRIVE: {}, DEPART: {} }, arrive = {}, depart = {};
      PLACES.forEach(function (p) { if (F.ARRIVE[p]) arrive[p] = ids(F.ARRIVE[p]); if (F.DEPART[p]) depart[p] = ids(F.DEPART[p]); });
      return { day: d, arrive: arrive, depart: depart, legs: LEGS.filter(function (L) { var dd = dateOf(L.key); return dd && dd.checkIn === d; }).map(function (L) { return L.key; }), followUp: ids(follow[d] || []) };
    });

    /* the stays of the room plan: rooms against persons (rooms are never people) */
    var stays = (B.stays || []).map(function (s) {
      var us = units.filter(function (u) { return u.window === s.window; }); if (!us.length) return null;
      var ds = ids(us.map(function (u) { return u.key; })).map(dateOf).filter(Boolean);
      return { window: s.window, place: s.place, label: s.label, hotel: s.hotel,
        checkIn: ds.map(function (x) { return x.checkIn; }).sort()[0] || null, checkOut: ds.map(function (x) { return x.checkOut; }).filter(Boolean).sort().slice(-1)[0] || null,
        units: us.length, occupied: us.filter(function (u) { return u.occupants.length; }).length, kept: us.reduce(function (n, u) { return n + u.kept; }, 0),
        persons: ids([].concat.apply([], us.map(function (u) { return u.occupants.map(function (o) { return o.guestId; }); }))),
        rooms: us.map(function (u) { return { key: u.key, label: u.label, hotelRoom: u.hotelRoom ? u.hotelRoom.display : null, building: u.hotelRoom ? u.hotelRoom.building : null, places: u.places, occupants: u.occupants.map(function (o) { return o.guestId; }) }; }) };
    }).filter(Boolean);

    var list012 = compare012(B.list012, units, dateOf);
    list012.rows.forEach(function (r) { if (r.status === 'DIFFERENT') r.guests.forEach(function (g) { flag('LIST_012', g, '012 row ' + r.row + ' · room ' + r.roomNo + ': ' + r.differences.join(' · '), r.firstDay); }); });

    var tracks = {}; TRACKS.forEach(function (t) { tracks[t] = guests.filter(function (gg) { return G[gg.guestId].track === t; }).map(function (gg) { return gg.guestId; }); });
    var legsAll = LEGS.map(function (L) {
      var d = dateOf(L.key), on = guests.map(function (gg) { return gg.guestId; }).filter(function (g) { return G[g].legs.some(function (l) { return l.key === L.key; }); });
      function st(g) { return G[g].legs.filter(function (l) { return l.key === L.key; })[0]; }
      return { key: L.key, letter: L.letter, name: L.name, from: L.from, to: L.to, date: d ? d.checkIn : null, arrives: d ? (L.overnight ? d.checkOut : d.checkIn) : null,
        confirmed: on.filter(function (g) { return st(g).status === 'CONFIRMED'; }), awaiting: on.filter(function (g) { return st(g).status === 'AWAITING'; }),
        notSent: on.filter(function (g) { return st(g).status === 'NOT_SENT'; }), ownerRecorded: on.filter(function (g) { return st(g).source === 'OWNER_RECORDED'; }) };
    });
    var all3 = guests.map(function (gg) { return gg.guestId; });
    var out = {};
    Object.keys(checks).forEach(function (k) {
      var items = checks[k].slice().sort(function (a, b) { return byId(a.guestId || '', b.guestId || '') || (a.why < b.why ? -1 : a.why > b.why ? 1 : 0); });
      out[k] = { ids: ids(items.map(function (x) { return x.guestId; })), items: items };
    });
    return {
      gaps: gaps, window: { firstNight: nightList[0] || null, lastNight: nightList.length ? nightList[nightList.length - 1] : null, firstDay: dayList[0] || null, lastDay: dayList.length ? dayList[dayList.length - 1] : null },
      people: { total: guests.length, ambiguous: (B.ambiguous || []).slice(), tracks: tracks },
      guests: G, nights: nights, days: days, stays: stays, legs: legsAll, checks: out, list012: list012,
      arrival: { status: 'NOT_RECORDED', decision: 'E22', flightDocument: { received: all3.filter(function (g) { return G[g].flightDoc === 'RECEIVED'; }), notAdded: all3.filter(function (g) { return G[g].flightDoc === 'NOT_ADDED'; }), notSent: all3.filter(function (g) { return G[g].flightDoc == null; }) } }
    };
  }

  /* 012 against the room plan: a row's hotel room numbers (a suite as a set) and nights against the nights the plan holds a guest
     in a unit with exactly those numbers. A row 012 dates cannot be read for, or a number no unit carries, is "not comparable". */
  function compare012(list, units, dateOf) {
    if (!Array.isArray(list)) return { status: 'NOT_AVAILABLE', rows: [], planOnly: [] };
    function same(a, b) { return a.length === b.length && a.every(function (x, i) { return x === b[i]; }); }
    function held(nums) {
      var out = {}, keys = [];
      units.forEach(function (u) {
        if (!u.hotelRoom || !same(u.hotelRoom.numbers.slice().sort(), nums)) return;
        keys.push(u.key + '|' + u.label);
        var d = dateOf(u.key); if (!d || !d.checkOut) return;
        nightsBetween(d.checkIn, d.checkOut).forEach(function (n) { u.occupants.forEach(function (o) { (out[n] = out[n] || {})[o.guestId] = 1; }); });
      });
      return { nights: out, keys: keys };
    }
    var rows = [], seen = {};
    list.forEach(function (r) {
      var nums = r.numbers || [], h = held(nums); if (nums.length) seen[nums.join('+')] = 1;
      var base = { row: r.row, building: r.building, roomType: r.roomType, roomNo: r.roomNo, checkIn: r.checkIn, checkOut: r.checkOut, typed: r.typed || [], count: (r.typed || []).length, firstDay: ISO.test(r.checkIn || '') ? r.checkIn : null };
      var holders = function (n) { return Object.keys(h.nights[n] || {}); };
      var everyone = ids([].concat.apply([], Object.keys(h.nights).map(holders)));
      if (!nums.length) { rows.push(Object.assign(base, { status: 'NOT_COMPARABLE', why: 'no room number in 012', guests: [], differences: [] })); return; }
      if (!h.keys.length) { rows.push(Object.assign(base, { status: 'NOT_COMPARABLE', why: 'no unit of the room plan carries room ' + nums.join(' + '), guests: [], differences: [] })); return; }
      if (!ISO.test(r.checkIn || '') || !ISO.test(r.checkOut || '')) { rows.push(Object.assign(base, { status: 'NOT_COMPARABLE', why: '012 ' + (!ISO.test(r.checkIn || '') ? 'check-in' : 'check-out') + ' date ' + (r.checkIn === 'BAD' || r.checkOut === 'BAD' ? 'not readable' : 'missing'), guests: everyone, differences: [] })); return; }
      var n012 = nightsBetween(r.checkIn, r.checkOut), planN = Object.keys(h.nights).sort(), diff = [], who = {};
      var only012 = n012.filter(function (n) { return !holders(n).length; }), onlyPlan = planN.filter(function (n) { return n012.indexOf(n) < 0; });
      if (only012.length) { diff.push('012 lists the room on ' + only012.join(', ') + '; the room plan holds nobody there'); everyone.forEach(function (g) { who[g] = 1; }); }
      if (onlyPlan.length) { diff.push('the room plan holds ' + ids([].concat.apply([], onlyPlan.map(holders))).join(', ') + ' there on ' + onlyPlan.join(', ') + '; 012 does not list those nights'); onlyPlan.forEach(function (n) { holders(n).forEach(function (g) { who[g] = 1; }); }); }
      n012.forEach(function (n) { var k = holders(n).length; if (k && k !== base.count) { diff.push('on ' + n + ' 012 names ' + base.count + ', the room plan holds ' + k); holders(n).forEach(function (g) { who[g] = 1; }); } });
      rows.push(Object.assign(base, { status: diff.length ? 'DIFFERENT' : 'SAME', guests: diff.length ? ids(Object.keys(who)) : everyone, planNights: planN, differences: diff }));
    });
    var planOnly = [];
    units.forEach(function (u) { if (u.hotelRoom && u.occupants.length && !seen[u.hotelRoom.numbers.slice().sort().join('+')]) planOnly.push({ key: u.key, label: u.label, roomNo: u.hotelRoom.display, guests: u.occupants.map(function (o) { return o.guestId; }) }); });
    return { status: 'OK', rows: rows, planOnly: planOnly };
  }

  var api = { assemble: assemble, PLACES: PLACES, LEGS: LEGS, PARTS: PARTS, NIGHT_CATS: NIGHT_CATS, TRACKS: TRACKS, nightsBetween: nightsBetween, addDay: addDay, byId: byId };
  if (typeof window !== 'undefined') window.SIYL_ARRIVALS = api;
})();
