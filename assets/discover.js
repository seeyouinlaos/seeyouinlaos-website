/* ============================================================================
   THE DISCOVER TAXONOMY + CHRONOLOGY (Owner, 22 Sep 2026) — one reading of the
   canonical dataset (assets/experiences.js) for every page that shows a place:
   the Discover rails, the place's own page, the journey in numbers.

   · CATEGORY says what a place IS — restaurant · cafe · bar · club · experience ·
     place — never what happens there. One place, one category, one card.
   · The rails: Restaurants · Cafés · Bars & nightlife (bar + club) · Experiences ·
     Shopping & places — each sorted by the itinerary: the date first, then the
     day's sequence from the Operations Master schedule (never shown as a time).
   · A place visited twice keeps one card that names both days. A place without
     an itinerary day (the Vientiane portrait, a city address) closes its rail.
   ========================================================================== */
(function () {
  'use strict';
  var RAILS = [
    { key: 'restaurant', title: 'Restaurants', cats: ['restaurant'] },
    { key: 'cafe', title: 'Cafés', cats: ['cafe'] },
    { key: 'nightlife', title: 'Bars & nightlife', cats: ['bar', 'club'] },
    { key: 'experience', title: 'Experiences', cats: ['experience'] },
    { key: 'place', title: 'Shopping & places', cats: ['place'] }
  ];
  var LABEL = { restaurant: 'Restaurant', cafe: 'Café', bar: 'Bar', club: 'Club', experience: 'Experience', place: 'Shopping & places' };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function all() { return (window.SIYL_EXP || []).slice(); }
  function categoryOf(x) { return x && x.category ? x.category : 'experience'; }
  function visits(x) { return (x && Array.isArray(x.visits) ? x.visits : []).slice().sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : (a.seq || 0) - (b.seq || 0); }); }
  function parse(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? { y: +m[1], mo: +m[2], d: +m[3], dow: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() } : null; }
  /* the date as the site writes it: "Sunday, 21 February 2027"; a second day on the same card: "Tuesday, 23 February · Sunday, 7 March 2027" */
  function dateWords(x, o) {
    var vs = visits(x), seen = {}, days = [];
    vs.forEach(function (v) { if (!seen[v.date]) { seen[v.date] = 1; days.push(parse(v.date)); } });
    days = days.filter(Boolean); if (!days.length) return '';
    var short = o && o.short;
    return days.map(function (d, i) {
      var last = i === days.length - 1, sameYear = days.every(function (e) { return e.y === d.y; });
      return (short ? '' : DAYS[d.dow] + ', ') + d.d + ' ' + MONTHS[d.mo - 1] + (last || !sameYear ? ' ' + d.y : '');
    }).join(' · ');
  }
  function firstDate(x) { var vs = visits(x); return vs.length ? vs[0] : null; }
  /* the rail order: dated places by date then sequence; undated places after them, in the dataset's order */
  function sortRail(list) {
    return list.map(function (x, i) { return { x: x, i: i, v: firstDate(x) }; }).sort(function (a, b) {
      if (a.v && b.v) { if (a.v.date !== b.v.date) return a.v.date < b.v.date ? -1 : 1; if ((a.v.seq || 0) !== (b.v.seq || 0)) return (a.v.seq || 0) - (b.v.seq || 0); return a.i - b.i; }
      if (a.v) return -1; if (b.v) return 1; return a.i - b.i;
    }).map(function (e) { return e.x; });
  }
  /* the rails of one chapter (bkk · laos · china), each already in itinerary order */
  function rails(chapter) {
    var list = all().filter(function (x) { return x.chapter === chapter; });
    return RAILS.map(function (r) {
      var items = sortRail(list.filter(function (x) { return r.cats.indexOf(categoryOf(x)) >= 0; }));
      return { key: r.key, title: r.title, items: items };
    }).filter(function (r) { return r.items.length; });
  }
  /* the journey in numbers: unique places per category — a place counts once, in its own category */
  function counts() {
    var out = { restaurants: 0, cafes: 0, nightlife: 0, museums: 0, temples: 0 };
    all().forEach(function (x) {
      var c = categoryOf(x);
      if (c === 'restaurant') out.restaurants++;
      else if (c === 'cafe') out.cafes++;
      else if (c === 'bar' || c === 'club') out.nightlife++;
      if (c === 'experience' && /Museum/.test(x.cats || '')) out.museums++;
      if (c === 'experience' && /Temple|Stupa/.test(x.cats || '')) out.temples++;
    });
    return out;
  }
  window.SIYL_DISCOVER = { RAILS: RAILS, LABEL: LABEL, all: all, categoryOf: categoryOf, visits: visits, dateWords: dateWords, firstDate: firstDate, sortRail: sortRail, rails: rails, counts: counts };
})();
