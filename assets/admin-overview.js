/* ============================================================================
   THE OVERVIEW · the admin console's start view (HS-034 + HS-035 · Owners HS-PROMPT-052, 21 Nov 2026)
   A pure renderer: strings only, no request, no storage, no dialog. It draws what the console already holds —
     · the guest list and the guest checks (admin/overview, admin/status, admin/readiness)
     · revenue.quick (src/billing/quick-overview.js · the statements, the hotels, the Souphattra per night, the legs)
     · participation (admin/assignments?overview=1 · who joins what as sent, seats, persons per night, documents, allergy flag)
   in the accepted V2 design (HS-034.20). Every figure opens a list of exactly its guests (#list=<key>), every guest their
   profile (HS-035 P1). What no source holds is said as such — never estimated: "not recorded", "not documented",
   "not computable", "decision pending", "provisional". Open Owner decisions stay open.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ helpers */
  var E = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var C = { s1: '#2a78d6', s2: '#eb6834', s3: '#1baf7a', s4: '#eda100', s5: '#e87ba4', s6: '#6250d6', good: '#0ca30c', warn: '#fab219', serious: '#ec835a', crit: '#d03b3b', neutral: '#A0A7B5', pend: '#C9D0F5', track: '#EDEFF4' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function num(n) { return n == null || isNaN(n) ? '—' : String(n); }
  function money(cents, cur) {
    if (cents == null || isNaN(cents)) return '—';
    var v = Math.abs(cents) / 100, s = v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (cents < 0 ? '−' : '') + (cur || 'USD') + ' ' + s;
  }
  function moneyBare(cents) { if (cents == null || isNaN(cents)) return '—'; return (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function pctOf(sh) { return sh && sh.status === 'OK' && sh.pct != null ? sh.pct.toFixed(1) + ' %' : '—'; }
  function pctNum(n, d) { return d > 0 && n != null ? Math.round((n / d) * 1000) / 10 : null; }
  function dateParts(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); if (!m) return null; var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return { d: d, day: +m[3], mon: MONTHS[+m[2] - 1], dow: DAYS[d.getUTCDay()], year: +m[1] }; }
  function dayWords(iso) { var p = dateParts(iso); return p ? p.dow + ' ' + p.day + ' ' + p.mon : '—'; }
  function dayLong(iso) { var p = dateParts(iso); return p ? p.dow + ' ' + p.day + ' ' + p.mon + ' ' + p.year : '—'; }
  function daysBetween(a, b) { var x = dateParts(a), y = dateParts(b); return x && y ? Math.round((y.d - x.d) / 86400000) : null; }
  function addDays(iso, n) { var p = dateParts(iso); if (!p) return null; var d = new Date(p.d.getTime() + n * 86400000); return d.toISOString().slice(0, 10); }
  function clock(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d.getTime())) return ''; var h = d.getHours(), m = d.getMinutes(); return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m; }
  function own(o, k) { return o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined; }
  function safeKey(v) { return String(v == null ? '' : v).replace(/[^A-Za-z0-9_-]/g, '_'); }
  function uniq(a) { var o = {}, out = []; for (var i = 0; i < a.length; i++) if (a[i] && !o[a[i]]) { o[a[i]] = 1; out.push(a[i]); } return out.sort(); }

  /* the status words — never colour alone */
  function chip(text, kind, title) { return '<span class="ov-chip ' + (kind || '') + '"' + (title ? ' title="' + E(title) + '"' : '') + '>' + E(text) + '</span>'; }
  var STATE = {
    NOT_AVAILABLE: ['not available just now', 'unk'], KPI_INCOMPLETE: ['incomplete just now', 'unk'], PARTIAL: ['partial', 'warn'], PROVISIONAL: ['provisional', 'pend'],
    UNKNOWN: ['unknown', 'unk'], NOT_DOCUMENTED: ['not documented', 'unk'], NOT_RECORDED: ['not recorded', 'unk'], NOT_COMPUTABLE: ['not computable', 'unk'], PENDING: ['decision pending', 'pend'],
  };
  function stateChip(status, decision) { var s = STATE[status] || [String(status || '').toLowerCase(), 'unk']; return chip(s[0] + (decision ? ' · ' + decision : ''), s[1]); }
  function go(hash, label, cls) { return '<a href="/admin/billing' + E(hash) + '" data-ab-tab="' + E(hash) + '" class="ov-link' + (cls ? ' ' + cls : '') + '">' + label + '</a>'; }
  function listLink(key, n, label) { return n > 0 ? go('#list=' + key, (label || num(n)) + ' →') : '<span class="ov-mute">' + E(label || num(n)) + '</span>'; }
  function details(open, key, summary, body) { return '<details class="ov-det" data-ov-det="' + key + '"' + (open[key] ? ' open' : '') + '><summary>' + summary + '</summary>' + body + '</details>'; }
  function table(head, rows) {
    return '<div class="ov-tw"><table class="ov-tbl"><thead><tr>' + head.map(function (h) { return '<th scope="col">' + E(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return (i ? '<td>' : '<th scope="row">') + c + (i ? '</td>' : '</th>'); }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
  }

  /* outline icons, 20 px, currentColor */
  var IP = {
    ring: '<circle cx="8" cy="13" r="5"/><circle cx="16" cy="13" r="5"/><path d="M10 5l2-2 2 2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c1.9.7 3.1 2.4 3.5 5.2"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16 15h2"/><path d="M6 6l9-3 1 3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10.5" r="1.5"/>',
    fork: '<path d="M7 3v8a2 2 0 0 0 4 0V3M9 3v18M17 3c-2 2-2 6 0 8v10"/>',
    temple: '<path d="M3 21h18M5 21v-8M19 21v-8M9 21v-6h6v6M4 13h16L12 4z"/>',
    plane: '<path d="M10 14l-6 2v-2l6-4V5a2 2 0 0 1 4 0v5l6 4v2l-6-2v4l2 2v1l-4-1-4 1v-1l2-2z"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    train: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4"/><circle cx="9" cy="14" r=".8"/><circle cx="15" cy="14" r=".8"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    bank: '<path d="M3 10h18L12 4zM5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    pin: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.5 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    flag: '<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
  };
  function icon(k, tint) { return '<span class="ov-ic ' + (tint || '') + '" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">' + (IP[k] || '') + '</svg></span>'; }

  /* ------------------------------------------------------------ charts (inline SVG, hand-written) */
  function arcPath(cx, cy, r, a0, a1) {
    var x0 = cx + r * Math.sin(a0), y0 = cy - r * Math.cos(a0), x1 = cx + r * Math.sin(a1), y1 = cy - r * Math.cos(a1);
    return 'M' + x0.toFixed(2) + ' ' + y0.toFixed(2) + 'A' + r + ' ' + r + ' 0 ' + (a1 - a0 > Math.PI ? 1 : 0) + ' 1 ' + x1.toFixed(2) + ' ' + y1.toFixed(2);
  }
  /* a ring: one share against its base; null → a hatched ring "unknown" */
  function ring(p, size, color, center, sub, label) {
    var r = size / 2 - 7, cx = size / 2, c = 2 * Math.PI * r, v = p == null ? null : Math.max(0, Math.min(100, p));
    return '<svg class="ov-ring" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + E(label || (v == null ? 'unknown' : v + ' %')) + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + (v == null ? 'url(#ov-hatch)' : C.track) + '" stroke-width="10"/>' +
      (v ? '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + (c * v / 100).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' : '') +
      (center != null ? '<text x="50%" y="' + (sub ? '47%' : '53%') + '" text-anchor="middle" class="ov-rc">' + E(center) + '</text>' : '') +
      (sub ? '<text x="50%" y="63%" text-anchor="middle" class="ov-rs">' + E(sub) + '</text>' : '') + '</svg>';
  }
  /* a donut: mutually exclusive parts; each part opens its list */
  function donut(parts, size, center, sub, label) {
    var total = 0; parts.forEach(function (p) { total += p.n || 0; });
    var cx = size / 2, r = size / 2 - 12, a = 0, gap = total > 0 && parts.filter(function (p) { return p.n > 0; }).length > 1 ? 0.035 : 0, out = '';
    if (!total) out = '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + C.track + '" stroke-width="18"/>';
    parts.forEach(function (p) {
      if (!(p.n > 0)) return;
      var span = 2 * Math.PI * p.n / total, a0 = a + gap / 2, a1 = a + span - gap / 2; a += span;
      if (span >= 2 * Math.PI - 0.0001) { out += '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + (p.hatched ? 'url(#ov-hatch)' : p.color) + '" stroke-width="18"' + attrGo(p) + '><title>' + E(p.tip || (p.label + ': ' + p.n)) + '</title></circle>'; return; }
      out += '<path d="' + arcPath(cx, cx, r, a0, Math.max(a0 + 0.01, a1)) + '" fill="none" stroke="' + (p.hatched ? 'url(#ov-hatch)' : p.color) + '" stroke-width="18"' + attrGo(p) + '><title>' + E(p.tip || (p.label + ': ' + p.n + (total ? ' · ' + pctNum(p.n, total).toFixed(1) + ' %' : ''))) + '</title></path>';
    });
    return '<svg class="ov-donut" viewBox="0 0 ' + size + ' ' + size + '" width="' + size + '" height="' + size + '" role="img" aria-label="' + E(label || '') + '">' + out +
      '<text x="50%" y="48%" text-anchor="middle" class="ov-rc">' + E(center) + '</text><text x="50%" y="61%" text-anchor="middle" class="ov-rs">' + E(sub || '') + '</text></svg>';
  }
  function attrGo(p) { return p.key ? ' class="ov-mark" tabindex="0" role="link" data-ov-go="#list=' + E(p.key) + '"' : ''; }
  /* the legend beside a part-to-whole chart: count, share, the list */
  function legend(parts, total, unit, inline) {
    return '<ul class="ov-legend' + (inline ? ' inline' : '') + '">' + parts.map(function (p) {
      var sh = total > 0 ? pctNum(p.n, total) : null;
      return '<li><span class="ov-sw' + (p.hatched ? ' hatch' : '') + '" style="background:' + (p.hatched ? '' : p.color) + '"></span><span class="ov-lg-l">' + E(p.label) + (p.note ? '<small>' + E(p.note) + '</small>' : '') + '</span>' +
        '<span class="ov-lg-v">' + (p.key && p.n > 0 ? go('#list=' + p.key, num(p.n) + (unit ? ' ' + E(unit) : '')) : num(p.n) + (unit ? ' ' + E(unit) : '')) + '<small>' + (sh == null ? '' : sh.toFixed(1) + ' %') + '</small></span></li>';
    }).join('') + '</ul>';
  }
  /* a 100 % stacked bar with its legend underneath */
  function stack(parts, label) {
    var total = 0; parts.forEach(function (p) { total += p.n || 0; });
    var segs = parts.filter(function (p) { return p.n > 0; }).map(function (p) {
      var w = pctNum(p.n, total);
      return '<span class="ov-seg' + (p.hatched ? ' hatch' : '') + (p.key ? ' ov-mark' : '') + '" style="width:' + w + '%;' + (p.hatched ? '' : 'background:' + p.color) + '"' + (p.key ? ' tabindex="0" role="link" data-ov-go="#list=' + E(p.key) + '"' : '') + ' title="' + E(p.label + ': ' + p.n + ' · ' + w.toFixed(1) + ' %') + '"></span>';
    }).join('');
    return '<div class="ov-stack" role="img" aria-label="' + E(label + ': ' + parts.map(function (p) { return p.label + ' ' + p.n; }).join(', ')) + '">' + (segs || '<span class="ov-seg empty"></span>') + '</div>' + legend(parts, total, '', true);
  }
  /* a meter: value against a base, text always beside it */
  function meter(n, d, color, left, right, hatched) {
    var w = d > 0 && n != null ? Math.max(0, Math.min(100, n / d * 100)) : 0;
    return '<div class="ov-meter"><div class="ov-meter-t"><span>' + left + '</span><span>' + right + '</span></div><div class="ov-bar' + (hatched ? ' hatch' : '') + '" role="img" aria-label="' + E(String(left).replace(/<[^>]+>/g, '') + ' ' + String(right).replace(/<[^>]+>/g, '')) + '"><span style="width:' + w.toFixed(1) + '%;background:' + color + '"></span></div></div>';
  }
  /* columns per date: stacked parts as HTML (the text keeps its size on a phone), an optional capacity line */
  function columns(cols, opts) {
    var o = opts || {}, max = o.max || 0;
    cols.forEach(function (c) { var t = 0; c.parts.forEach(function (p) { t += p.n || 0; }); if (t > max) max = t; });
    if (!max) max = 1;
    var capLine = o.cap ? '<span class="ov-capl" style="bottom:' + (o.cap / max * 100).toFixed(2) + '%"><i>' + E(o.capLabel || '') + '</i></span>' : '';
    return '<div class="ov-cols" role="img" aria-label="' + E(o.label || '') + '"><div class="ov-colsp">' + capLine + cols.map(function (c) {
      var t = 0; c.parts.forEach(function (p) { t += p.n || 0; });
      return '<div class="ov-col" title="' + E(c.label + ' · ' + c.parts.map(function (p) { return p.label + ' ' + (p.n || 0); }).join(' · ')) + '"><div class="ov-colb">' + c.parts.map(function (p) {
        if (!(p.n > 0)) return '';
        return '<span class="ov-cseg' + (p.hatched ? ' hatch' : '') + (p.key ? ' ov-mark' : '') + '" style="height:' + (p.n / max * 100).toFixed(2) + '%;' + (p.hatched ? '' : 'background:' + p.color) + '"' + (p.key ? ' tabindex="0" role="link" data-ov-go="#list=' + E(p.key) + '"' : '') + '></span>';
      }).join('') + '</div><span class="ov-colv">' + (o.noTotals ? '' : t) + '</span><span class="ov-colx">' + E(c.tick) + '</span></div>';
    }).join('') + '</div></div>';
  }
  var DEFS = '<svg width="0" height="0" class="ov-defs" aria-hidden="true" focusable="false"><defs><pattern id="ov-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F1F3F7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C9CED8" stroke-width="2.5"/></pattern></defs></svg>';

  /* ------------------------------------------------------------ the model the console hands over */
  function parts(M) {
    var rev = M.revenue || null, Q = rev && rev.quick && !rev.quick.status ? rev.quick : null, P = M.ov && M.ov.data && M.ov.data.participation && !M.ov.data.participation.status ? M.ov.data.participation : null;
    return { Q: Q, P: P, F: Q ? Q.finance : null, ev: M.ov && M.ov.data ? M.ov.data.events || null : null };
  }
  function weddingDate(X) { var e = X.ev && X.ev.ceremony; return e && e.date ? e.date : null; }
  /* why a part is not drawn yet: still loading, a failure, or the guest checks first */
  function waiting(M, which) {
    if (which === 'rev') {
      if (M.revenuePhase === 'error') return '<p class="ov-wait unk">' + E(M.revenueError || 'The figures could not be calculated just now.') + ' ' + go('#revenue', 'Revenue →') + '</p>';
      if (M.revenue && M.revenue.quick && M.revenue.quick.status) return '<p class="ov-wait unk">' + E(M.revenue.quick.why || 'not available just now') + '</p>';
      return '<p class="ov-wait">Figures after the guest checks · ' + num(M.checked) + ' / ' + num(M.total) + '</p>';
    }
    var o = M.ov || {};
    if (o.phase === 'error') return '<p class="ov-wait unk">' + E(o.error || 'The programme figures could not be read just now.') + ' <button type="button" class="ov-btn" data-ov-retry>Try again</button></p>';
    if (o.data && o.data.participation && o.data.participation.status) return '<p class="ov-wait unk">' + E(o.data.participation.why || 'not available just now') + ' <button type="button" class="ov-btn" data-ov-retry>Try again</button></p>';
    if (o.phase === 'loading') return '<p class="ov-wait">Reading seats, rooms and answers…</p>';
    if (!M.autoload) return '<p class="ov-wait"><button type="button" class="ov-btn" data-ov-retry>Load the programme figures</button></p>';
    return '<p class="ov-wait">Programme figures after the guest checks and the figures · ' + num(M.checked) + ' / ' + num(M.total) + '</p>';
  }

  /* the Action Center: one source and one definition per item, no priority, no write button */
  /* the guest checks fill in the background: until they are complete their counts are "…", never 0 */
  function statusDone(M) { return !M.checking && M.checked >= M.total; }
  function acPending(M, k) { var sd = statusDone(M); return k === 'ready' || k === 'blocked' ? !(sd && M.readyDone) : !sd; }
  function actions(M, X) {
    var F = X.F, P = X.P, out = [];
    out.push({ key: 'ac.toConfirm', ic: 'check', label: 'Bookings waiting for your confirmation', ids: M.ac.toConfirm, src: 'guest checks', pending: acPending(M, 'toConfirm') });
    out.push({ key: 'ac.ready', ic: 'doc', label: 'Ready to issue', ids: M.ac.ready, src: 'guest checks', pending: acPending(M, 'ready') });
    out.push({ key: 'ac.blocked', ic: 'alert', label: 'Statement blocked', ids: M.ac.blocked, src: 'guest checks', pending: acPending(M, 'blocked') });
    out.push({ key: 'ac.notSent', ic: 'clock', label: 'Selection not sent yet', ids: M.ac.notSent, src: 'guest checks', pending: acPending(M, 'notSent') });
    if (F) {
      out.push({ key: 'fin.reported', ic: 'bank', label: 'Payments reported · to verify', ids: F.reported.ids, src: 'statements' });
      out.push({ key: 'fin.bucket.OVERDUE', ic: 'alert', label: 'Statements overdue', ids: F.overdueIds, src: 'statements' });
    }
    if (P) {
      out.push({ key: 'ac.noSeat', ic: 'fork', label: 'Joining without a seat (vow or dinner)', ids: uniq(P.events.ceremony.joiningNoSeat.concat(P.events.dinner.joiningNoSeat)), src: 'seating plan' });
      out.push({ key: 'flag.check', ic: 'flag', label: 'To check · E27', ids: checkIds(X), src: trainNoRoom(X) === null ? 'answers as sent · the train check is not computable just now' : 'answers as sent · room plan' });
    }
    return out;
  }
  /* the night-train passengers (stage B of the budget map) without a room on their night of arrival — null when it cannot be
     computed (no leg, no date, room dates partly unknown): then it is "not computable", never 0 */
  function legRows(X) { return X.Q && X.Q.legs && X.Q.legs.status === 'OK' ? X.Q.legs.rows : []; }
  function trainNoRoom(X) {
    if (!X.Q || !X.P || X.P.movements.status !== 'OK') return null;
    var leg = legRows(X).filter(function (l) { return l.id === 'B'; })[0];
    if (!leg || !leg.to || leg.kind !== 'HS_BUYS') return null;
    var night = (X.P.presence || []).filter(function (n) { return n.night === leg.to; })[0];
    var there = night ? night.VIENTIANE : [];
    return leg.ids.filter(function (g) { return there.indexOf(g) < 0; }).sort();
  }
  /* the room plan partly without dates (002 not readable just now) or other read gaps of the route: said, never hidden */
  function presenceNote(P) {
    if (!P) return '';
    var n = (P.movements.undatedIds || []).length, g = P.gaps || [];
    if (!n && !g.length) return '';
    return '<p class="ov-note ov-gap">' + chip('partial', 'warn') + ' ' + (n ? 'the room dates of ' + listLink('flag.undated', n, n + ' guests') + ' are not readable just now — their nights are not counted. ' : '') + E(g.join(' · ')) + '</p>';
  }
  function checkIds(X) { return uniq((X.P ? X.P.flags.confirmedBothEventsDeclined : []).concat(trainNoRoom(X) || [])); }

  /* ------------------------------------------------------------ the overview */
  function render(M, h) {
    var X = parts(M), open = (M.ov && M.ov.open) || {}, today = M.today;
    var s = DEFS + '<div class="ov" id="ov-top">';
    s += head(M, X, today);
    s += areaBar();
    s += heroes(M, X, today);
    s += kpis(M, X, today);
    s += '<div class="ov-grid ov-g-cockpit"><section class="ov-card ov-cockpit" aria-labelledby="ov-ck-h">' + cockpit(M, X, today) + '</section>' +
      '<section class="ov-card ov-ac" id="ov-gr" aria-labelledby="ov-ac-h">' + actionCenter(M, X) + '</section></div>';
    s += calendar(M, X, today);
    s += areaA(M, X, open) + areaB(M, X, open) + areaC(M, X, open) + areaD(M, X, open) + areaE(M, X, open) + areaF(M, X, open, today);
    s += decisions();
    s += '<p class="ov-foot">Every figure is read from the console\'s own sources when it opens — nothing here is estimated or stored. Open Owner decisions stay open until you decide.</p>';
    return s + '</div>';
  }
  function head(M, X, today) {
    var wd = weddingDate(X), P = X.P, first = P && P.presence.length ? P.presence[0].night : null, last = P && P.movements.departures.length ? P.movements.departures[P.movements.departures.length - 1].date : null;
    var st = [];
    st.push(M.checking || M.checked < M.total ? chip('guest checks ' + num(M.checked) + ' / ' + num(M.total), 'pend') : chip('guest checks ' + num(M.total) + ' / ' + num(M.total), 'ok'));
    if (M.revenue && M.revenue.calculatedAt) st.push(chip('figures ' + clock(M.revenue.calculatedAt), ''));
    if (M.ov && M.ov.data && M.ov.data.at) st.push(chip('programme ' + clock(M.ov.data.at), ''));
    if (M.stale) st.push(chip('figures from ' + (M.revenue && M.revenue.calculatedAt ? clock(M.revenue.calculatedAt) : 'before your change') + ' — may be outdated after your change', 'warn') + ' ' + go('#revenue', 'Recalculate in Revenue →'));
    return '<header class="ov-head"><div><h2 class="ov-h1">Overview</h2><p class="ov-sub">' + (wd ? 'Wedding ' + E(dayLong(wd)) + ' · Vientiane' : 'Wedding · Vientiane') +
      (first && last ? ' · programme ' + E(dayWords(first)) + ' – ' + E(dayWords(last)) + ' (room plan)' : '') + '</p></div><p class="ov-stamps">' + st.join('') + '</p></header>';
  }
  function areaBar() {
    var a = [['ov-top', '↑', 'Top'], ['ov-gr', 'GR', 'Guest Relations'], ['ov-a', 'A', 'Finance'], ['ov-b', 'B', 'Hotels'], ['ov-c', 'C', 'Events'], ['ov-d', 'D', 'RSVP'], ['ov-e', 'E', 'Activities'], ['ov-f', 'F', 'Arrivals']];
    return '<nav class="ov-areas" aria-label="Overview areas">' + a.map(function (x) { return '<button type="button" data-ov-jump="' + x[0] + '" title="' + E(x[2]) + '"><b>' + E(x[1]) + '</b><span>' + E(x[2]) + '</span></button>'; }).join('') + '</nav>';
  }
  function heroes(M, X, today) {
    var wd = weddingDate(X), P = X.P, F = X.F, dd = wd ? daysBetween(today, wd) : null;
    var a = '<section class="ov-hero indigo">' + icon('ring', 'w') + '<div><h3>Wedding day</h3><p class="ov-hs">' + (wd ? E(dayLong(wd)) : 'date after the guest checks') + '</p></div>' +
      '<p class="ov-hv">' + (dd == null ? '—' : dd > 0 ? dd + '<small>' + (dd === 1 ? 'day to go' : 'days to go') + '</small>' : dd === 0 ? 'Today' : Math.abs(dd) + '<small>days ago</small>') + '</p>' +
      '<p class="ov-hf">Temple · Coffee &amp; Cake · Vow · Dinner · counted from today · ' + go('#seating', 'Seating →') + '</p></section>';
    var b = '<section class="ov-hero teal">' + icon('users', 'w') + '<h3>Guests</h3>' + (P ? '<div class="ov-split"><div><p class="ov-hl">Invited persons</p><p class="ov-hv">' + num(P.people.invited) + '</p><p class="ov-hs">' + num(P.people.households) + ' households</p></div>' +
      '<div><p class="ov-hl">Trip confirmed</p><p class="ov-hv">' + go('#list=rsvp.CONFIRMED', num(P.people.booking.CONFIRMED.length)) + '</p><p class="ov-hs">persons · couple ' + num(P.people.coupleIds.filter(function (g) { return P.people.booking.CONFIRMED.indexOf(g) >= 0; }).length) + ' of ' + num(P.people.couple) + ' included</p></div></div>' +
      '<p class="ov-hf">trip sent ' + num(P.people.tripSent) + ' of ' + num(P.people.invited) + ' · ' + listLink('rsvp.NOT_SENT', P.people.booking.NOT_SENT.length, P.people.booking.NOT_SENT.length + ' not sent') + ' · ' + listLink('rsvp.DECLINED', P.people.booking.DECLINED.length, P.people.booking.DECLINED.length + ' declined') + '</p>' : waiting(M, 'ov')) + '</section>';
    var c = '<section class="ov-hero lilac">' + icon('wallet', 'w') + '<h3>Payments · paying guests</h3>' + (F ? '<div class="ov-split"><div><p class="ov-hl">Invoiced · USD</p><p class="ov-hv">' + moneyBare(F.amounts.invoiced.cents) + '</p><p class="ov-hs">' + num(F.statements.issued) + ' statements · couple apart</p></div>' +
      '<div><p class="ov-hl">Received · USD</p><p class="ov-hv">' + moneyBare(F.amounts.received.cents) + '</p><p class="ov-hs">verified only</p></div></div>' +
      '<div class="ov-hbar"><span style="width:' + (F.ratios.received.status === 'OK' ? Math.min(100, F.ratios.received.pct) : 0) + '%"></span></div>' +
      '<p class="ov-hf">collection ' + pctOf(F.ratios.received) + ' = received ÷ invoiced · reported payments are not counted: ' + num(F.reported.rows) + ' reports from ' + listLink('fin.reported', F.reported.ids.length, F.reported.ids.length + ' guests') + '</p>' : waiting(M, 'rev')) + '</section>';
    return '<div class="ov-heroes">' + a + b + c + '</div>';
  }
  function kpi(ic, tint, title, value, sub, foot, href) {
    return '<div class="ov-kpi">' + icon(ic, tint) + '<p class="ov-kt">' + title + '</p><p class="ov-kv">' + value + '</p><p class="ov-ks">' + sub + '</p>' + (foot ? '<p class="ov-kf">' + foot + '</p>' : '') + (href ? '<p class="ov-kl">' + href + '</p>' : '') + '</div>';
  }
  function kpis(M, X, today) {
    var F = X.F, Q = X.Q, P = X.P, k = [];
    var rr = F ? F.ratios.received : null;
    k.push(kpi('chart', 'blue', 'Collection rate', F ? '<span class="ov-kring">' + ring(rr.status === 'OK' ? rr.pct : null, 44, C.good, null) + '</span>' + pctOf(rr) : '—', 'received ÷ invoiced', chip('basis · E18', ''), go('#finance', 'Finance →')));
    k.push(kpi('clock', 'red', 'Outstanding · USD', F ? moneyBare(F.amounts.outstanding.cents) : '—', F ? num(F.buckets.filter(function (b) { return /OVERDUE|UNPAID|PARTIAL/.test(b.key); }).reduce(function (n, b) { return n + b.n; }, 0)) + ' statements · ' + pctOf(F.ratios.open) + ' of invoiced' : 'after the guest checks',
      F && F.overdueIds.length ? go('#list=fin.bucket.OVERDUE', '! ' + F.overdueIds.length + ' overdue', 'crit') : '', go('#revenue', 'Revenue →')));
    var S = Q ? Q.souphattra : null;
    k.push(kpi('bed', 'teal', 'Room nights bought', S && S.status === 'OK' ? pctOf({ status: 'OK', pct: pctNum(S.total.boughtRoomNights, S.total.capacityRoomNights) }) : '—',
      S && S.status === 'OK' ? num(S.total.boughtRoomNights) + ' of ' + num(S.total.capacityRoomNights) + ' · Souphattra' : 'Souphattra', chip('provisional · E15a', 'pend'), go('#assign', 'Room assignments →')));
    var D = P ? P.events.dinner : null;
    k.push(kpi('fork', 'violet', 'Dinner seated', D ? go('#list=ev.dinner.seated', num(D.seated)) : '—', D ? 'of ' + num(D.capacity) + ' system | ' + num(D.capacityDecision.alternative) + ' Owner' : 'after the guest checks', chip('decision pending · E16', 'pend'), go('#seating', 'Seating →')));
    var T = P ? P.events.temple : null;
    k.push(kpi('temple', 'yellow', 'Temple joining', T ? go('#list=ev.temple.yes', num(T.yes.length)) : '—', 'as sent · capacity not documented', chip('not documented · E20', 'unk')));
    var nextA = P ? P.movements.arrivals.filter(function (a) { return a.date >= today; })[0] : null;
    k.push(kpi('plane', 'indigo', 'First nights with us', nextA ? go('#list=arr.' + nextA.date, num(nextA.n)) : '—', nextA ? 'next: ' + E(dayWords(nextA.date)) + ' · room plan' : P ? 'no first night ahead in the room plan' : 'after the guest checks',
      (P && P.movements.status !== 'OK' ? chip('partial · room dates', 'warn') + ' ' : '') + chip('flights not recorded · E22', 'unk')));
    var A = actions(M, X), open = 0, pend = false; A.forEach(function (a) { open += a.ids.length; if (a.pending) pend = true; });
    k.push(kpi('alert', 'red', 'Open items', '<button type="button" class="ov-linkbtn" data-ov-jump="ov-gr">' + (pend ? '…' : num(open)) + '</button>', pend ? 'after the guest checks' : 'a guest can be in more than one item', chip('requests · tasks · gifts not recorded · P3', 'unk')));
    var pp = P ? P.care.documents.passport : null, nSent = pp ? pp.received.length + pp.notReceived.length : 0;
    k.push(kpi('doc', 'blue', 'Passport received', pp ? go('#list=doc.passport.received', num(pp.received.length)) + '<small> of ' + nSent + '</small>' : '—', 'as sent · optional for the guest', pp ? go('#list=doc.passport.notReceived', pp.notReceived.length + ' not received (optional)') : ''));
    return '<div class="ov-kpis">' + k.join('') + '</div>';
  }
  function cockpit(M, X, today) {
    var P = X.P, Q = X.Q;
    var s = '<h3 class="ov-ct" id="ov-ck-h">Today &amp; next 72 hours</h3>';
    if (!P) return s + waiting(M, 'ov');
    var days = [];
    function dayOf(d) {
      var rows = [];
      P.movements.arrivals.filter(function (a) { return a.date === d; }).forEach(function (a) { rows.push(['plane', 'Arrivals · first night with us', 'room plan, not flights · E22', a.n, 'arr.' + d]); });
      P.movements.departures.filter(function (a) { return a.date === d; }).forEach(function (a) { rows.push(['plane', 'Departures · after the last night', 'room plan', a.n, 'dep.' + d]); });
      legRows(X).filter(function (l) { return l.from === d; }).forEach(function (l) { rows.push(['train', l.place, l.kind === 'HS_BUYS' ? 'H&S buys' : 'guests book · not in our figures', l.persons, l.persons ? 'leg.' + safeKey(l.id) : null]); });
      var wd = weddingDate(X); if (wd === d) rows.push(['ring', 'Wedding day · 4 moments', 'Temple · Coffee & Cake · Vow · Dinner · dinner seats held', P.events.dinner.seated, 'ev.dinner.seated']);
      var night = P.presence.filter(function (n) { return n.night === d; })[0]; if (night) rows.push(['bed', 'With us tonight', 'room plan', night.total, 'night.' + d + '.ALL']);
      return rows;
    }
    for (var i = 0; i < 4; i++) { var d = addDays(today, i), r = dayOf(d); if (r.length) days.push([d, r, i]); }
    if (!days.length) {
      var dates = uniq(P.presence.map(function (n) { return n.night; }).concat(P.movements.arrivals.map(function (a) { return a.date; }))).filter(function (d) { return d >= today; });
      var first = dates[0];
      s += '<p class="ov-empty">Nothing in the next 72 hours.' + (first ? ' The programme begins ' + E(dayLong(first)) + ' (in ' + daysBetween(today, first) + ' days).' : '') + '</p>';
      if (first) { s += '<p class="ov-ct2">Next on the programme</p>'; dates.slice(0, 3).forEach(function (dd) { days.push([dd, dayOf(dd), null]); }); }
    }
    days.forEach(function (x) {
      s += '<p class="ov-dayh">' + E(dayWords(x[0])) + (x[2] === 0 ? ' · today' : x[2] === 1 ? ' · tomorrow' : '') + '</p>';
      s += x[1].map(function (r) {
        return '<div class="ov-row">' + icon(r[0], 'soft') + '<div class="ov-row-t"><b>' + E(r[1]) + '</b><small>' + E(r[2]) + '</small></div><span class="ov-row-v">' + (r[4] && r[3] > 0 ? go('#list=' + r[4], num(r[3])) : r[3] == null ? '<small>not recorded</small>' : num(r[3])) + '</span></div>';
      }).join('');
    });
    return s;
  }
  function actionCenter(M, X) {
    var A = actions(M, X), total = 0, pend = false; A.forEach(function (a) { total += a.ids.length; if (a.pending) pend = true; });
    var s = '<h3 class="ov-ct" id="ov-ac-h">Guest Relations · Action Center</h3><p class="ov-cs">' + (pend ? 'the open items appear as the guest checks finish' : num(total) + ' open items') + ' · from the records the console reads · one source each · a guest can be in more than one · nothing here writes</p><div class="ov-actiles">';
    s += A.map(function (a) {
      return '<div class="ov-actile' + (a.ids.length && !a.pending ? '' : ' zero') + '">' + icon(a.ic, 'soft') + '<p class="ov-an">' + (a.pending ? '…' : a.ids.length ? go('#list=' + a.key, num(a.ids.length)) : '0') + '</p><p class="ov-al">' + E(a.label) + '</p><p class="ov-as">' + E(a.pending ? a.src + ' · still reading' : a.src) + '</p></div>';
    }).join('');
    if (!X.P) s += '<div class="ov-actile zero">' + icon('clock', 'soft') + '<p class="ov-al">Seats and checks</p>' + waiting(M, 'ov') + '</div>';
    s += '<div class="ov-actile hatch">' + icon('star', 'soft') + '<p class="ov-an">—</p><p class="ov-al">Guest requests · tasks · notes · gifts</p><p class="ov-as">not recorded · HS-035 P3 (E28, E36)</p></div>';
    return s + '</div>';
  }
  function calendar(M, X, today) {
    var P = X.P, Q = X.Q;
    var s = '<section class="ov-card ov-cal" aria-labelledby="ov-cal-h"><h3 class="ov-ct" id="ov-cal-h">Programme calendar</h3><p class="ov-cs">persons with a room in our plan per night · ↑ first nights · ↓ departures · the wedding and the legs</p>';
    if (!P) return s + waiting(M, 'ov') + '</section>';
    s += presenceNote(P);
    var dates = uniq(P.presence.map(function (n) { return n.night; }).concat(P.movements.departures.map(function (d) { return d.date; })));
    if (!dates.length) return s + '<p class="ov-empty">No room in the plan yet.</p></section>';
    var all = [], d0 = dates[0], d1 = dates[dates.length - 1];
    for (var d = d0; d && d <= d1 && all.length < 40; d = addDays(d, 1)) all.push(d);
    var wd = weddingDate(X);
    s += '<div class="ov-days">' + all.map(function (d) {
      var night = P.presence.filter(function (n) { return n.night === d; })[0], a = P.movements.arrivals.filter(function (x) { return x.date === d; })[0], dp = P.movements.departures.filter(function (x) { return x.date === d; })[0];
      var legs = legRows(X).filter(function (l) { return l.from === d; });
      var p = dateParts(d);
      return '<div class="ov-day' + (d === today ? ' today' : '') + (d === wd ? ' wed' : '') + '"' + (night && night.total ? ' role="link" tabindex="0" data-ov-go="#list=night.' + E(d) + '.ALL"' : '') + '><p class="ov-dw">' + E(p.dow) + '</p><p class="ov-dn">' + p.day + ' ' + E(p.mon) + '</p>' +
        '<p class="ov-dp">' + (night ? night.total : 0) + '<small>with us</small></p><p class="ov-dm">' + (a ? '↑ ' + a.n : '') + (dp ? ' ↓ ' + dp.n : '') + '</p>' +
        (d === wd ? '<p class="ov-dc">' + chip('Wedding · 4 moments', 'ev') + '</p>' : '') + legs.map(function (l) { return '<p class="ov-dc">' + chip(l.place.split(',')[0], 'leg') + '</p>'; }).join('') + '</div>';
    }).join('') + '</div>';
    return s + '</section>';
  }
  function sectionHead(id, letter, title, src, links) {
    return '<header class="ov-sh" id="' + id + '"><span class="ov-badge">' + letter + '</span><div><h3>' + title + '</h3><p>' + src + '</p></div><p class="ov-shl">' + links + ' <button type="button" class="ov-up" data-ov-jump="ov-top">↑ Overview</button></p></header>';
  }

  /* ------------------------------------------------------------ A · finance */
  var BUCKET = { OVERDUE: ['Overdue (open, past due)', C.crit], UNPAID: ['Unpaid · not overdue', C.serious], PARTIAL: ['Partly paid · not overdue', C.warn], PAID: ['Paid in full', C.good], OVERPAID: ['Overpaid', C.pend], NOTHING_DUE: ['Nothing due', C.neutral], UNKNOWN: ['Payment state not readable', C.track] };
  function areaA(M, X, open) {
    var F = X.F, Q = X.Q, s = '<section class="ov-area" aria-labelledby="ov-a">' + sectionHead('ov-a', 'A', 'Finance &amp; Payments', 'statements of the paying guests · the couple apart · figures ' + (M.revenue && M.revenue.calculatedAt ? clock(M.revenue.calculatedAt) : '—'), go('#finance', 'Finance →') + ' ' + go('#revenue', 'Revenue →'));
    if (!F) return s + '<div class="ov-card">' + waiting(M, 'rev') + '</div></section>';
    var amt = F.amounts;
    function stat(title, f, sub, extra) { return '<div class="ov-stat"><p class="ov-kt">' + title + '</p><p class="ov-kv">' + (f.cents == null ? '—' : moneyBare(f.cents)) + '</p><p class="ov-ks">' + sub + (f.status !== 'OK' ? ' ' + stateChip(f.status) + (f.partialCents != null ? ' <small>known part USD ' + moneyBare(f.partialCents) + '</small>' : '') : '') + '</p>' + (extra || '') + '</div>'; }
    s += '<div class="ov-stats">' + stat('Total invoiced · USD', amt.invoiced, num(F.statements.issued) + ' statements') + stat('Total received · USD', amt.received, 'verified only') +
      stat('Outstanding · USD', amt.outstanding, 'of which overdue USD ' + moneyBare(amt.overdue.cents), F.overdueIds.length ? '<p class="ov-kf">' + go('#list=fin.bucket.OVERDUE', '! ' + F.overdueIds.length + ' overdue', 'crit') + '</p>' : '') +
      '<div class="ov-stat"><p class="ov-kt">Collection rate</p><div class="ov-statring">' + ring(F.ratios.received.status === 'OK' ? F.ratios.received.pct : null, 84, C.good, pctOf(F.ratios.received), null) + '<p class="ov-ks">received ÷ invoiced · paying statements · couple apart ' + chip('basis · E18', '') + '</p></div></div></div>';
    /* payment status — mutually exclusive, counts (amounts stay the route's KPIs above) */
    var bp = F.buckets.filter(function (b) { return b.n > 0 || b.key !== 'UNKNOWN'; }).map(function (b) { return { key: 'fin.bucket.' + b.key, label: BUCKET[b.key][0], n: b.n, color: BUCKET[b.key][1], note: b.key === 'NOTHING_DUE' ? 'not counted as paid' : '' }; });
    var sumLine = F.buckets.filter(function (b) { return b.n > 0; }).map(function (b) { return b.n; }).join(' + ') + ' = ' + F.statements.issued + ' statements';
    s += '<div class="ov-grid ov-g-2"><div class="ov-card"><h4 class="ov-ct">Payment status of statements</h4><div class="ov-pie">' + donut(bp, 176, num(F.statements.issued), 'issued statements', 'Payment status of the issued statements') + legend(bp, F.statements.issued, 'statements') + '</div>' +
      '<p class="ov-note">' + E(sumLine) + ' · couple apart: ' + num(F.statements.couple) + ' · not issued yet: ' + listLink('fin.notIssued', F.statements.notIssued, F.statements.notIssued + ' guests') + '</p>' +
      details(open, 'a-status', 'Show as table', table(['State', 'Statements', 'Share'], bp.map(function (b) { return [E(b.label), String(b.n), F.statements.issued ? pctNum(b.n, F.statements.issued).toFixed(1) + ' %' : '—']; }))) + '</div>';
    /* open and to verify */
    s += '<div class="ov-card"><h4 class="ov-ct">Open &amp; to verify</h4><ul class="ov-list">' +
      '<li><span>' + icon('bank', 'soft') + 'Reported by guests, to verify <small>never counted as received</small></span><span>' + (F.reported.cents == null ? '—' : money(F.reported.cents)) + '<small>' + num(F.reported.rows) + ' reports · ' + listLink('fin.reported', F.reported.ids.length, F.reported.ids.length + ' guests') + '</small></span></li>' +
      '<li><span>' + icon('alert', 'soft') + 'Overdue</span><span>' + money(amt.overdue.cents) + '<small>' + listLink('fin.bucket.OVERDUE', F.overdueIds.length, F.overdueIds.length + ' statements') + '</small></span></li>' +
      '<li><span>' + icon('doc', 'soft') + 'Booked, not yet invoiced</span><span>' + money(amt.notYetInvoiced.cents) + '<small>' + listLink('fin.notYetInvoiced', F.notYetInvoicedIds.length, F.notYetInvoicedIds.length + ' guests') + '</small></span></li>' +
      '<li><span>' + icon('wallet', 'soft') + 'Refund due</span><span>' + money(amt.refundDue.cents) + '</span></li>' +
      '<li><span>' + icon('chart', 'soft') + 'Booked value (confirmed bookings)</span><span>' + money(amt.booked.cents) + (amt.booked.status !== 'OK' ? ' ' + stateChip(amt.booked.status) : '') + '</span></li></ul>' +
      '<p class="ov-note">Every amount here is the revenue overview\'s own figure, shown as it is. ' + go('#revenue', 'Each statement → Revenue') + '</p></div></div>';
    /* revenue by hotel · by class · purchase and supplier payments */
    var H = Q.hotels;
    function hotelBars(rows, colorOf, den) {
      return rows.map(function (r, i) {
        var b = r.revenue ? r.revenue.booked : null, w = r.revenueShare.status === 'OK' ? r.revenueShare.pct : 0;
        return '<div class="ov-hb"><p class="ov-hbn">' + E(r.name) + (r.location ? '<small>' + E(r.location) + '</small>' : '') + '</p><div><div class="ov-bar slim"><span style="width:' + w + '%;background:' + colorOf(i) + '"></span></div><p class="ov-hbv"><b>' + money(b) + '</b> · ' + pctOf(r.revenueShare) +
          (r.revenue && r.revenue.notSplit ? ' · ' + r.revenue.notSplit + ' statements partly paid, not split' : '') + '</p></div></div>';
      }).join('') || '<p class="ov-empty">no hotel</p>';
    }
    var HC = [C.s1, C.s2, C.s3, C.s4, C.s5];
    s += '<div class="ov-grid ov-g-3"><div class="ov-card"><h4 class="ov-ct">Revenue by hotel · booked value</h4>' + (H.status === 'NOT_AVAILABLE' ? '<p class="ov-wait unk">' + E(H.why) + '</p>' :
      '<p class="ov-chips">' + chip('share basis · decision pending · E14', 'pend') + '</p><p class="ov-cap">Wedding hotels · 100 % = their guest billing</p>' + hotelBars(H.wedding, function (i) { return HC[i % HC.length]; }) +
      '<p class="ov-cap">China trip · outside the wedding budget · own 100 %</p>' + hotelBars(H.china, function () { return C.s6; }) +
      details(open, 'a-hotels', 'Show as table', table(['Hotel', 'Booked', 'Invoiced', 'Received', 'Open', 'Share'], H.wedding.concat(H.china).map(function (r) { var v = r.revenue || {}; return [E(r.name), money(v.booked), money(v.invoiced), money(v.received), money(v.outstanding), pctOf(r.revenueShare)]; })))) + '</div>';
    var K = Q.classes, KC = { SOUPHATTRA_ACCOMMODATION: C.s1, OTHER_ACCOMMODATION: C.s2, PASS_THROUGH: C.s4, NOT_CLASSIFIED: C.neutral, CHINA: C.s6 };
    if (K.status === 'NOT_AVAILABLE') s += '<div class="ov-card"><h4 class="ov-ct">Revenue by category</h4><p class="ov-wait unk">not available just now</p></div>';
    else {
      var kp = K.rows.map(function (r) { return { label: r.label + (r.outsideWeddingBudget ? ' · outside the wedding budget' : ''), n: r.booked == null ? 0 : r.booked, color: KC[r.key] || C.neutral, money: r.booked }; });
      var tot = K.total.booked;
      s += '<div class="ov-card"><h4 class="ov-ct">Revenue by category · booked</h4>' + (K.complete ? '' : '<p class="ov-chips">' + stateChip('PARTIAL') + '</p>') + '<div class="ov-pie small">' + donut(kp.map(function (p) { return { label: p.label, n: p.n, color: p.color, tip: p.label + ': ' + money(p.money) }; }), 150, moneyBare(tot), 'USD booked', 'Revenue by category') +
        '<ul class="ov-legend">' + kp.map(function (p) { return '<li><span class="ov-sw" style="background:' + p.color + '"></span><span class="ov-lg-l">' + E(p.label) + '</span><span class="ov-lg-v">' + money(p.money) + '<small>' + (tot > 0 && p.money != null ? pctNum(p.money, tot).toFixed(1) + ' %' : '') + '</small></span></li>'; }).join('') + '</ul></div>' +
        '<p class="ov-note">The parts are the revenue overview\'s classes; together they are its total guest billing.</p></div>';
    }
    /* 004 forecast vs 007 committed / paid — each currency on its own */
    s += '<div class="ov-card"><h4 class="ov-ct">Hotels · 004 forecast vs 007 committed / paid</h4><p class="ov-chips">' + chip('basis pending · E29', 'pend') + '</p>' + (H.status === 'NOT_AVAILABLE' ? '<p class="ov-wait unk">' + E(H.why) + '</p>' :
      H.wedding.concat(H.china).map(function (r) {
        var lines = r.committed.map(function (c) { var p = r.paid.filter(function (x) { return x.currency === c.currency; })[0], ps = r.paidShare.filter(function (x) { return x.currency === c.currency; })[0];
          return meter(p ? p.cents : 0, c.cents, r.china ? C.s6 : C.s1, 'paid ' + money(p ? p.cents : 0, c.currency), 'of ' + money(c.cents, c.currency) + ' committed · ' + (ps && ps.pct != null ? ps.pct.toFixed(1) + ' %' : '—')); }).join('');
        return '<div class="ov-sup"><p class="ov-hbn">' + E(r.name) + (r.china ? '<small>China · outside the wedding budget</small>' : '<small>004 forecast ' + money(r.forecast) + (r.forecastShare && r.forecastShare.status === 'OK' ? ' · ' + pctOf(r.forecastShare) + ' of the forecasts' : '') + '</small>') + '</p>' + (lines || '<p class="ov-mute">no 007 contract recorded</p>') + '</div>';
      }).join('') + (H.suppliers.length ? details(open, 'a-sup', 'Open to suppliers (007)', table(['Supplier', 'Contract', 'Open'], H.suppliers.map(function (x) { return [E(x.vendor), x.contract ? money(x.contract.cents, x.contract.currency) : '—', x.outstanding ? money(x.outstanding.cents, x.outstanding.currency) : '<small>' + E(x.outstandingWhy || 'not stated') + '</small>']; }))) : '')) +
      '<p class="ov-note">Guest revenue, hotel purchase and payments to hotels are never added together.</p></div></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ B · hotels and occupancy */
  function areaB(M, X, open) {
    var Q = X.Q, s = '<section class="ov-area" aria-labelledby="ov-b">' + sectionHead('ov-b', 'B', 'Hotels &amp; Occupancy', 'the room plan per night · Souphattra Heritage against its rooms on the official list', go('#assign', 'Room assignments →') + ' ' + go('#rooms', 'Rooms &amp; rates →'));
    if (!Q) return s + '<div class="ov-card">' + waiting(M, 'rev') + '</div></section>';
    var S = Q.souphattra;
    if (S.status !== 'OK') return s + '<div class="ov-card"><p class="ov-wait unk">' + E(S.why || 'not available just now') + '</p></div></section>';
    var cap = S.capacity.rooms, sel = (M.ov && M.ov.night) || 'all';
    var cols = S.nights.map(function (n) {
      var notBought = n.allocation != null && n.bought != null ? Math.max(0, Math.min(n.allocation, cap) - n.bought) : 0;
      var rest = Math.max(0, cap - (n.bought || 0) - notBought);
      return { label: dayWords(n.night), tick: dateParts(n.night).day + ' ' + dateParts(n.night).mon, parts: [{ label: 'occupied', n: n.occupied, color: C.s1 }, { label: 'bought, empty', n: n.boughtEmpty, color: C.pend },
        { label: 'our allocation, not bought', n: notBought, color: '#D9E6F8' }, { label: 'outside our rooms · unknown', n: rest, hatched: true }] };
    });
    var leg = [{ label: 'occupied', n: null, color: C.s1 }, { label: 'bought, empty', color: C.pend }, { label: 'our allocation, not bought', color: '#D9E6F8' }, { label: 'other guests of the hotel · unknown (E15b)', hatched: true }];
    s += '<div class="ov-grid ov-g-2"><div class="ov-card"><h4 class="ov-ct">Souphattra Heritage · per night</h4><p class="ov-chips">' + chip('capacity ' + cap + ' rooms · provisional · E15a', 'pend') + chip('allocation · decision pending · E19a', 'pend') + '</p>' +
      columns(cols, { cap: cap, capLabel: cap + ' rooms', max: cap, label: 'Souphattra rooms per night', noTotals: true }) +
      '<ul class="ov-keys">' + leg.map(function (l) { return '<li><span class="ov-sw' + (l.hatched ? ' hatch' : '') + '" style="background:' + (l.hatched ? '' : l.color) + '"></span>' + E(l.label) + '</li>'; }).join('') + '</ul>' +
      details(open, 'b-nights', 'Show as table', table(['Night', 'Allocation', 'Bought', 'Occupied', 'Bought, empty', 'Guests', 'Bought of ' + cap, 'Third party'], S.nights.map(function (n) { return [E(dayWords(n.night)), num(n.allocation), num(n.bought), num(n.occupied), num(n.boughtEmpty), num(n.guests), pctOf(n.shareBought), 'unknown']; }))) + '</div>';
    var pick = sel === 'all' ? null : S.nights.filter(function (n) { return n.night === sel; })[0];
    var tabs = '<div class="ov-seg-tabs" role="group" aria-label="Night">' + ['all'].concat(S.nights.map(function (n) { return n.night; })).map(function (k) { return '<button type="button" data-ov-night="' + k + '" aria-pressed="' + (k === sel) + '"' + (k === sel ? ' class="on"' : '') + '>' + (k === 'all' ? 'All nights' : dateParts(k).day + ' ' + dateParts(k).mon) + '</button>'; }).join('') + '</div>';
    var body;
    if (pick) body = '<div class="ov-ringrow">' + ring(pick.shareBought.pct, 120, C.s1, pctOf(pick.shareBought), 'bought of ' + cap) + '<ul class="ov-list"><li><span>Bought</span><span>' + num(pick.bought) + '</span></li><li><span>Occupied</span><span>' + num(pick.occupied) + ' · ' + pctOf(pick.shareOccupied) + '</span></li>' +
      '<li><span>Bought, still empty</span><span>' + num(pick.boughtEmpty) + '</span></li><li><span>Our allocation (002)</span><span>' + num(pick.allocation) + '</span></li><li><span>Guests</span><span>' + num(pick.guests) + '</span></li><li><span>Other guests of the hotel</span><span>' + stateChip('UNKNOWN', 'E15b') + '</span></li></ul></div>';
    else body = '<div class="ov-ringrow">' + ring(pctNum(S.total.boughtRoomNights, S.total.capacityRoomNights), 120, C.s1, num(S.total.boughtRoomNights), 'of ' + S.total.capacityRoomNights + ' room nights') +
      '<ul class="ov-list"><li><span>Room nights bought</span><span>' + num(S.total.boughtRoomNights) + ' of ' + num(S.total.capacityRoomNights) + '</span></li><li><span>Room nights occupied</span><span>' + num(S.total.occupiedRoomNights) + ' of ' + num(S.total.capacityRoomNights) + '</span></li><li><span>Rooms still available (bought, empty)</span><span>' + num(S.nights.reduce(function (t, n) { return t + (n.boughtEmpty || 0); }, 0)) + ' room nights</span></li></ul></div>';
    s += '<div class="ov-card"><h4 class="ov-ct">Night by night</h4>' + tabs + body + '<p class="ov-note">Room nights are rooms × nights — never rooms added across nights.</p></div></div>';
    s += '<div class="ov-card"><h4 class="ov-ct">Other hotels · our rooms</h4><ul class="ov-list">' + S.otherHotels.map(function (h) {
      return '<li><span>' + icon('bed', 'soft') + E(h.place || h.stay) + '<small>' + E(dayWords(h.from)) + ' – ' + E(dayWords(h.to)) + '</small>' + (h.blockDecision ? ' ' + chip('rooms bought as a block? · decision pending · ' + h.blockDecision, 'pend') : '') + '</span><span>' + num(h.occupied) + ' rooms occupied · ' + num(h.guests) + ' guests<small>house capacity not documented</small></span></li>';
    }).join('') + '</ul></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ C · events and seating */
  function answerParts(ev, key) {
    var A = [['yes', 'Joining', C.good], ['no', 'Not joining', C.serious], ['away', 'Not at the wedding', C.neutral], ['undecided', 'Open', C.warn], ['notSent', 'Trip not sent', null]];
    return A.filter(function (a) { return ev[a[0]]; }).map(function (a) { return { key: 'ev.' + key + '.' + a[0], label: a[1], n: ev[a[0]].length, color: a[2], hatched: !a[2] }; });
  }
  function areaC(M, X, open) {
    var P = X.P, s = '<section class="ov-area" aria-labelledby="ov-c">' + sectionHead('ov-c', 'C', 'Wedding Events &amp; Seating', 'Sunday 28 February 2027 · answers as sent · seats as the seating plan holds them', go('#seating', 'Seating →'));
    if (!P) return s + '<div class="ov-card">' + waiting(M, 'ov') + '</div></section>';
    var V = P.events.ceremony, D = P.events.dinner, alt = D.capacityDecision;
    function seatCard(title, x, extra) {
      var sides = Object.keys(x.sides).map(function (k) { var v = x.sides[k]; return meter(v.seated, v.cap, C.s1, (title === 'Vow Ceremony' ? (k === 'L' ? 'Left block' : 'Right block') : 'Side ' + k) + ' · ' + num(v.seated), 'of ' + num(v.cap)); }).join('');
      return '<div class="ov-card"><h4 class="ov-ct">' + title + '</h4><div class="ov-ringrow">' + ring(x.share.pct, 120, C.s6, num(x.seated), 'of ' + num(x.capacity)) + '<ul class="ov-list"><li><span>Seated</span><span>' + go('#list=ev.' + (title === 'Vow Ceremony' ? 'ceremony' : 'dinner') + '.seated', num(x.seatedIds.length)) + (x.couplePlaces ? '<small>+ the couple\'s ' + x.couplePlaces + ' places</small>' : '') + '</span></li>' +
        '<li><span>Free</span><span>' + num(x.free) + '</span></li><li><span>Joining · no seat</span><span>' + listLink('ev.' + (title === 'Vow Ceremony' ? 'ceremony' : 'dinner') + '.joiningNoSeat', x.joiningNoSeat.length) + '</span></li>' +
        '<li><span>Seat held · not joining</span><span>' + listLink('ev.' + (title === 'Vow Ceremony' ? 'ceremony' : 'dinner') + '.seatNotJoining', x.seatNotJoining.length) + '</span></li><li><span>Placed by you</span><span>' + num(x.placedByOwners) + '</span></li>' +
        '<li><span>Plan</span><span>' + (x.final ? chip('released', 'ok') : chip('not released', '')) + ' ' + (x.open ? chip('self-service open', '') : chip('self-service closed', '')) + '</span></li></ul></div>' + sides + (extra || '') + '</div>';
    }
    var e16 = '<div class="ov-e16">' + chip('decision pending · E16', 'pend') + '<p>Dinner capacity: the system holds <b>' + num(D.capacity) + '</b> (free ' + num(D.free) + '). Your HS-PROMPT-047 names <b>' + num(alt.alternative) + '</b> including the couple: ' +
      (alt.overAlternative > 0 ? '<b>over by ' + alt.overAlternative + '</b>' : 'free ' + num(alt.freeAtAlternative)) + '. Neither figure is changed until you decide.</p></div>';
    s += '<div class="ov-grid ov-g-2">' + seatCard('Vow Ceremony', V) + seatCard('Wedding Dinner', D, e16) + '</div>';
    var rows = [['Temple Ceremony · Wat Ong Teu', P.events.temple, 'temple'], ['Coffee &amp; Cake', P.events.coffee, 'coffee']];
    s += '<div class="ov-card"><h4 class="ov-ct">Answers per moment · as sent</h4><p class="ov-cs">every invited person once · the couple counted and shown ' + chip('basis · E18', '') + '</p>' +
      rows.map(function (r) { return '<div class="ov-ans"><p class="ov-hbn">' + r[0] + ' <small>capacity not documented · E20</small></p>' + stack(answerParts(r[1], r[2]), r[0].replace(/&amp;/g, '&')) + '</div>'; }).join('') +
      [['Vow Ceremony', V, 'ceremony'], ['Wedding Dinner', D, 'dinner']].map(function (r) { return '<div class="ov-ans"><p class="ov-hbn">' + r[0] + ' <small>the seating plan\'s reading of the answers</small></p>' + stack(answerParts(r[1].answer, r[2] + '.answer'), r[0]) + '</div>'; }).join('') +
      '<div class="ov-ans"><p class="ov-hbn">After the dinner <small>a wish from Haruthai &amp; Suthep · capacity not documented</small></p>' + stack([{ key: 'finale.pool', label: 'Pool', n: P.finale.pool.length, color: C.s1 }, { key: 'finale.baron', label: 'BARON', n: P.finale.baron.length, color: C.s6 }], 'After the dinner') + '</div></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ D · guests and RSVP */
  function areaD(M, X, open) {
    var P = X.P, F = X.F, s = '<section class="ov-area" aria-labelledby="ov-d">' + sectionHead('ov-d', 'D', 'Guests &amp; RSVP', 'every invited person once · the booking system\'s states · the couple shown', go('#guests', 'Guests →'));
    if (!P) return s + '<div class="ov-card">' + waiting(M, 'ov') + '</div></section>';
    var B = P.people.booking, rp = [{ key: 'rsvp.CONFIRMED', label: 'Trip confirmed', n: B.CONFIRMED.length, color: C.good }, { key: 'rsvp.SENT', label: 'Sent · awaiting confirmation', n: B.SENT.length, color: C.pend },
      { key: 'rsvp.DECLINED', label: 'Not joining this trip', n: B.DECLINED.length, color: C.serious }, { key: 'rsvp.NOT_SENT', label: 'Not sent yet', n: B.NOT_SENT.length, hatched: true }];
    var sizes = Object.keys(P.people.householdsBySize).sort().map(function (k, i) { return { label: k === '1' ? 'one person' : k + ' persons', n: P.people.householdsBySize[k], color: [C.s1, C.s3, C.s6, C.s4, C.s5][i % 5] }; });
    s += '<div class="ov-grid ov-g-3"><div class="ov-card"><h4 class="ov-ct">Persons</h4><div class="ov-pie">' + donut(rp, 150, num(P.people.invited), 'invited', 'Persons by booking state') + legend(rp, P.people.invited, '') + '</div><p class="ov-note">the couple: ' + listLink('rsvp.couple', P.people.couple, P.people.couple + ' persons') + ', counted in these states and shown here</p></div>' +
      '<div class="ov-card"><h4 class="ov-ct">Households</h4><div class="ov-pie">' + donut(sizes, 150, num(P.people.households), 'households', 'Households by size') + legend(sizes, P.people.households, 'households') + '</div></div>' +
      '<div class="ov-card"><h4 class="ov-ct">From invitation to statement</h4>' +
      meter(P.people.invited, P.people.invited, C.s1, 'Invited', num(P.people.invited)) + meter(P.people.tripSent, P.people.invited, C.s1, 'Trip sent', num(P.people.tripSent) + ' · ' + pctOf({ status: 'OK', pct: pctNum(P.people.tripSent, P.people.invited) })) +
      meter(B.CONFIRMED.length, P.people.invited, C.good, 'Trip confirmed', num(B.CONFIRMED.length) + ' · ' + pctOf({ status: 'OK', pct: pctNum(B.CONFIRMED.length, P.people.invited) })) +
      (F ? meter(F.statements.issued, F.statements.paying, C.s6, 'Statement issued <small>paying guests · statements</small>', num(F.statements.issued) + ' of ' + num(F.statements.paying)) : '') +
      '<p class="ov-note">Persons from the room and seating sources (' + clock(M.ov.data.at) + '); statements from the figures (' + (M.revenue ? clock(M.revenue.calculatedAt) : '—') + ') · invitations delivered: not recorded</p>' +
      (P.flags.confirmedBothEventsDeclined.length ? '<p class="ov-note">' + chip('check · E27', 'warn') + ' trip confirmed, vow and dinner declined: ' + listLink('flag.declinedBoth', P.flags.confirmedBothEventsDeclined.length) + '</p>' : '') +
      (P.unreadable ? '<p class="ov-note">' + stateChip('PARTIAL') + ' ' + P.unreadable + ' sent trips could not be read just now — counted as open</p>' : '') + '</div></div>';
    var AL = P.care.allergy, DC = P.care.documents;
    s += '<div class="ov-card"><h4 class="ov-ct">Care &amp; documents · as sent</h4><p class="ov-cs">which allergies, and the current documents: in each guest\'s profile · documents are optional for the guest</p><ul class="ov-list">' +
      '<li><span>' + icon('fork', 'soft') + 'Food allergy<small>the guest\'s answer as sent</small></span><span>yes ' + listLink('allergy.yes', AL.yes.length) + ' · no ' + listLink('allergy.no', AL.no.length) + ' · not answered ' + listLink('allergy.notAnswered', AL.notAnswered.length) + '<small>trip not sent ' + num(AL.notSent.length) + '</small></span></li>' +
      ['passport', 'flight'].map(function (k) { var d = DC[k]; return '<li><span>' + icon('doc', 'soft') + (k === 'passport' ? 'Passport' : 'Flight information') + '<small>status and date only (E34)</small></span><span>received ' + listLink('doc.' + k + '.received', d.received.length) + ' · not received ' + listLink('doc.' + k + '.notReceived', d.notReceived.length) + '<small>trip not sent ' + num(d.notSent.length) + '</small></span></li>'; }).join('') + '</ul></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ E · activities */
  function areaE(M, X, open) {
    var P = X.P, Q = X.Q, s = '<section class="ov-area" aria-labelledby="ov-e">' + sectionHead('ov-e', 'E', 'Activities &amp; Participation', 'answers as sent · bookings from the figures · requests are not reservations', go('#finance', 'Finance →'));
    if (!P && !Q) return s + '<div class="ov-card">' + waiting(M, 'ov') + '</div></section>';
    var LG = Q ? Q.legs : null;
    s += '<div class="ov-grid ov-g-2"><div class="ov-card"><h4 class="ov-ct">Legs against the quota (002)</h4>' + (!Q ? waiting(M, 'rev') : LG.status !== 'OK' ? '<p class="ov-wait unk">' + E(LG.why || 'not available just now') + '</p>' : LG.rows.map(function (l) {
      var head = '<p class="ov-hbn">' + E(l.place) + '<small>' + E(dayWords(l.from)) + (l.to && l.to !== l.from ? ' – ' + E(dayWords(l.to)) : '') + ' · ' + (l.kind === 'HS_BUYS' ? 'H&amp;S buys' : 'guests book') + '</small></p>';
      if (l.kind !== 'HS_BUYS') return '<div class="ov-sup">' + head + '<p>' + stateChip('NOT_RECORDED') + ' <small>the guests book it themselves — not in our figures</small></p></div>';
      /* one meter per item (train, van …) against its own quota — quotas are never added up */
      return '<div class="ov-sup">' + head + (l.items.length ? l.items.map(function (it) {
        var key = 'leg.' + safeKey(l.id) + '.' + safeKey(it.itemId);
        return it.quota ? meter(it.persons, it.quota, it.overQuota ? C.crit : C.s3, E(it.name) + ' · ' + listLink(key, it.persons, it.persons + ' persons'), 'of ' + it.quota + ' · ' + pctOf(it.share)) : '<p class="ov-mute">' + E(it.name) + ' · ' + listLink(key, it.persons, it.persons + ' persons') + ' · quota not stated</p>';
      }).join('') : '<p class="ov-mute">no booking yet</p>') + '</div>';
    }).join('') + '<p class="ov-note">Hosts\' and Guest Relations\' tickets are not in these counts.</p>') + '</div>';
    s += '<div class="ov-card"><h4 class="ov-ct">Temple, offering and after the dinner</h4>' + (P ? '<ul class="ov-list"><li><span>' + icon('temple', 'soft') + 'Temple Ceremony · joining<small>as sent · capacity not documented · E20</small></span><span>' + listLink('ev.temple.yes', P.events.temple.yes.length) + '</span></li>' +
      '<li><span>' + icon('users', 'soft') + 'Coffee &amp; Cake · joining<small>as sent</small></span><span>' + listLink('ev.coffee.yes', P.events.coffee.yes.length) + '</span></li>' +
      '<li><span>' + icon('star', 'soft') + 'Sangkhathan offering<small>persons with the offering booked · not the attendance count</small></span><span>' + (Q && Q.offering.status === 'OK' ? num(Q.offering.persons) : '—') + '</span></li>' +
      Object.keys(P.sangkhathan).sort().map(function (k) { return '<li><span class="ov-sub2">Sangkhathan as sent · ' + E(k) + '</span><span>' + listLink('sang.' + safeKey(k), P.sangkhathan[k].length) + '</span></li>'; }).join('') +
      '<li><span>' + icon('ring', 'soft') + 'After the dinner<small>Pool · BARON</small></span><span>' + listLink('finale.pool', P.finale.pool.length) + ' · ' + listLink('finale.baron', P.finale.baron.length) + '</span></li></ul>' : waiting(M, 'ov')) + '</div></div>';
    if (P) s += '<div class="ov-card"><h4 class="ov-ct">Requests as sent</h4><p class="ov-cs">a request, not a reservation · Guest Relations confirms · capacity not documented</p><ul class="ov-list">' +
      (P.requests.length ? P.requests.map(function (r) { return '<li><span>' + icon('pin', 'soft') + E(r.name) + '<small>' + (r.kind === 'INTEREST' ? 'interest' : 'request') + '</small></span><span>' + (r.tables != null ? r.tables + ' tables · ' + listLink('req.' + safeKey(r.id), r.ids.length, r.ids.length + ' guests') : listLink('req.' + safeKey(r.id), r.persons, r.persons + ' persons')) + '</span></li>'; }).join('') : '<li><span class="ov-mute">no request sent</span></li>') +
      '</ul><p class="ov-note">Not recorded: Tak Bat, dress rental, informational places.</p></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ F · arrivals and transport */
  function areaF(M, X, open, today) {
    var P = X.P, Q = X.Q, s = '<section class="ov-area" aria-labelledby="ov-f">' + sectionHead('ov-f', 'F', 'Guest Arrivals &amp; Transportation', 'from the room plan — not flights · legs from the figures', go('#assign', 'Room assignments →'));
    if (!P) return s + '<div class="ov-card">' + waiting(M, 'ov') + '</div></section>';
    s += presenceNote(P);
    var cols = P.presence.map(function (n) { var p = dateParts(n.night); return { label: dayWords(n.night), tick: p.day + '', parts: [{ label: 'Bangkok', n: n.BANGKOK.length, color: C.s2, key: 'night.' + n.night + '.BANGKOK' }, { label: 'Vientiane', n: n.VIENTIANE.length, color: C.s1, key: 'night.' + n.night + '.VIENTIANE' }, { label: 'China', n: n.CHINA.length, color: C.s6, key: 'night.' + n.night + '.CHINA' }] }; });
    s += '<div class="ov-grid ov-g-2"><div class="ov-card"><h4 class="ov-ct">Persons with us per night</h4>' + (cols.length ? columns(cols, { label: 'Persons per night by city' }) : '<p class="ov-empty">No room in the plan yet.</p>') +
      '<ul class="ov-keys"><li><span class="ov-sw" style="background:' + C.s2 + '"></span>Bangkok</li><li><span class="ov-sw" style="background:' + C.s1 + '"></span>Vientiane</li><li><span class="ov-sw" style="background:' + C.s6 + '"></span>China</li></ul>' +
      details(open, 'f-nights', 'Show as table', table(['Night', 'Bangkok', 'Vientiane', 'China', 'Total'], P.presence.map(function (n) { return [E(dayWords(n.night)), String(n.BANGKOK.length), String(n.VIENTIANE.length), String(n.CHINA.length), go('#list=night.' + n.night + '.ALL', String(n.total))]; }))) + '</div>';
    var ad = uniq(P.movements.arrivals.map(function (a) { return a.date; }).concat(P.movements.departures.map(function (d) { return d.date; })));
    var cols2 = ad.map(function (d) { var a = P.movements.arrivals.filter(function (x) { return x.date === d; })[0], dp = P.movements.departures.filter(function (x) { return x.date === d; })[0]; var p = dateParts(d);
      return { label: dayWords(d), tick: p.day + ' ' + p.mon, parts: [{ label: 'first nights', n: a ? a.n : 0, color: C.s3, key: 'arr.' + d }, { label: 'departures', n: dp ? dp.n : 0, color: C.s5, key: 'dep.' + d }] }; });
    s += '<div class="ov-card"><h4 class="ov-ct">First nights and departures per day</h4>' + (cols2.length ? columns(cols2, { label: 'First nights and departures' }) : '<p class="ov-empty">none yet</p>') +
      '<ul class="ov-keys"><li><span class="ov-sw" style="background:' + C.s3 + '"></span>first night with us</li><li><span class="ov-sw" style="background:' + C.s5 + '"></span>departure after the last night</li></ul>' +
      details(open, 'f-moves', 'Show as table', table(['Date', 'First nights', 'Departures'], cols2.map(function (c) { return [E(c.label), listLink(c.parts[0].key, c.parts[0].n), listLink(c.parts[1].key, c.parts[1].n)]; }))) + '</div></div>';
    var tr = trainNoRoom(X);
    s += '<div class="ov-grid ov-g-3"><div class="ov-card hatch-card"><h4 class="ov-ct">' + icon('plane', 'soft') + ' Arrival airport · flight · time</h4><p>' + stateChip('NOT_RECORDED', 'E22 · E35') + '</p><p class="ov-note">No airport, flight number or time is captured yet. Flight documents are files Guest Relations sees in the profile (status and date only).</p></div>' +
      '<div class="ov-card hatch-card"><h4 class="ov-ct">' + icon('train', 'soft') + ' Vehicles needed</h4><p>' + stateChip('NOT_COMPUTABLE', 'E21') + '</p><p class="ov-note">Missing: ' + E(P.transport.vehicles.missing.join(', ')) + '. Vehicles confirmed: no record.</p></div>' +
      '<div class="ov-card"><h4 class="ov-ct">' + icon('flag', 'soft') + ' Checks</h4><ul class="ov-list"><li><span>Night-train passengers without a room on their night of arrival<small>check · E27</small></span><span>' + (tr === null ? stateChip('NOT_COMPUTABLE') : listLink('flag.trainNoRoom', tr.length)) + '</span></li>' +
      '<li><span>Trip sent, no room in the plan<small>self-booked stays are not in the plan</small></span><span>' + listLink('flag.noRoom', P.movements.withoutRoom.length) + '</span></li></ul></div></div>';
    return s + '</section>';
  }

  /* ------------------------------------------------------------ the Owners' decisions (topics only — the register stays private) */
  var DECISIONS = [['E14', 'Hotel share basis', 'open'], ['E15', 'Souphattra rooms and other guests of the hotel', 'open'], ['E16', 'Dinner capacity', 'open'], ['E17', 'When the programme figures load', 'decided'],
    ['E18', 'Percentage bases', 'decided'], ['E19', 'Hotel allocation questions', 'open'], ['E20', 'Capacities without a source', 'open'], ['E21', 'Transport details', 'open'], ['E22', 'Flight and arrival data', 'open · document status decided with E34'],
    ['E23', 'Answers as sent', 'open'], ['E24', 'Labels in the existing views', 'open'], ['E25', 'Thai in the console', 'open'], ['E27', 'Data questions', 'open'], ['E28', 'Guest Relations records', 'open · HS-035 P3'], ['E29', 'Budget basis', 'open'],
    ['E30', 'The new look for the whole console', 'open'], ['E31–E37', 'Admin guest profile', 'decided'], ['E38', 'Kitchen list with allergy texts', 'proposed']];
  function decisions() {
    return '<section class="ov-card ov-dec" aria-labelledby="ov-dec-h"><h3 class="ov-ct" id="ov-dec-h">Owner decisions</h3><p class="ov-cs">as of the release of 21 November 2026 · the details stay in your register</p><ul class="ov-declist">' +
      DECISIONS.map(function (d) { return '<li><b>' + d[0] + '</b><span>' + E(d[1]) + '</span>' + chip(d[2], d[2] === 'decided' ? 'ok' : /provisional/.test(d[2]) ? 'pend' : '') + '</li>'; }).join('') + '</ul></section>';
  }

  /* ------------------------------------------------------------ the lists a figure opens */
  var LIST_RE = /^(fin|ac|ev|rsvp|leg|req|finale|sang|night|arr|dep|doc|allergy|flag)(\.[A-Za-z0-9_-]+){1,3}$/;
  function listOf(key, M) {
    /* every lookup is an own property — a key like "constructor" is no list, never a function */
    var X = parts(M), F = X.F, P = X.P, Q = X.Q, k = key.split('.'), t = null;
    var T = function (title, ids, kind, basis, back) { return Array.isArray(ids) ? { title: title, ids: ids, kind: kind, basis: basis, back: back } : null; };
    var AC = { toConfirm: 'Bookings waiting for your confirmation', ready: 'Ready to issue', blocked: 'Statement blocked', notSent: 'Selection not sent yet' };
    if (k[0] === 'fin' && F) {
      if (k[1] === 'bucket' && own(BUCKET, k[2])) { var b = F.buckets.filter(function (x) { return x.key === k[2]; })[0]; t = T('Statements · ' + BUCKET[k[2]][0], b ? b.ids : [], 'holder', 'issued statements of the paying guests', 'ov-a'); }
      if (k[1] === 'notIssued') t = T('Paying guests without an issued statement', F.statements.notIssuedIds, 'holder', 'the figures', 'ov-a');
      if (k[1] === 'reported') t = T('Payments reported · to verify', F.reported.ids, 'holder', 'never counted as received — verify them in Revenue', 'ov-a');
      if (k[1] === 'notYetInvoiced') t = T('Booked, not yet invoiced', F.notYetInvoicedIds, 'holder', 'the figures', 'ov-a');
    }
    /* the guest checks still running: "loading", never an empty list */
    if (k[0] === 'ac' && own(AC, k[1])) t = acPending(M, k[1]) ? null : T(AC[k[1]], own(M.ac, k[1]), 'holder', 'the guest checks', 'ov-gr');
    if (k[0] === 'ac' && k[1] === 'noSeat' && P) t = T('Joining without a seat', uniq(P.events.ceremony.joiningNoSeat.concat(P.events.dinner.joiningNoSeat)), 'guest', 'the seating plan', 'ov-gr');
    if (k[0] === 'flag' && P) {
      if (k[1] === 'check') t = T('To check · E27', checkIds(X), 'guest', 'answers as sent · room plan · nothing is changed', 'ov-gr');
      if (k[1] === 'declinedBoth') t = T('Trip confirmed, vow and dinner declined', P.flags.confirmedBothEventsDeclined, 'guest', 'check · E27', 'ov-d');
      if (k[1] === 'trainNoRoom') t = T('Night-train passengers without a room on their night of arrival', trainNoRoom(X), 'guest', 'check · E27', 'ov-f');
      if (k[1] === 'noRoom') t = T('Trip sent, no room in the plan', P.movements.withoutRoom, 'guest', 'the room plan', 'ov-f');
      if (k[1] === 'undated') t = T('A room in the plan, its dates not readable just now', P.movements.undatedIds || [], 'guest', 'the room plan · 002 dates', 'ov-f');
    }
    var EVN = { temple: 'Temple Ceremony', coffee: 'Coffee & Cake', ceremony: 'Vow Ceremony', dinner: 'Wedding Dinner' };
    var W = { yes: 'joining', no: 'not joining', away: 'not at the wedding', undecided: 'open', notSent: 'trip not sent' };
    if (k[0] === 'ev' && P && own(EVN, k[1]) && own(P.events, k[1])) {
      var ev = P.events[k[1]], name = EVN[k[1]];
      if (k[2] === 'seated') t = T(name + ' · seated', ev.seatedIds, 'guest', 'the seating plan', 'ov-c');
      else if (k[2] === 'joiningNoSeat' || k[2] === 'seatNotJoining') t = T(name + ' · ' + (k[2] === 'joiningNoSeat' ? 'joining, no seat' : 'seat held, not joining'), own(ev, k[2]), 'guest', 'the seating plan', 'ov-c');
      else if (k[2] === 'answer' && own(W, k[3])) t = T(name + ' · ' + W[k[3]], own(ev.answer, k[3]), 'guest', 'the seating plan\'s reading of the answers', 'ov-c');
      else if (own(W, k[2])) t = T(name + ' · ' + W[k[2]], own(ev, k[2]), 'guest', 'answers as sent', 'ov-c');
    }
    var RS = { CONFIRMED: 'Trip confirmed', SENT: 'Sent · awaiting confirmation', DECLINED: 'Not joining this trip', NOT_SENT: 'Not sent yet' };
    if (k[0] === 'rsvp' && P) {
      if (k[1] === 'couple') t = T('The couple', P.people.coupleIds, 'guest', 'counted in the booking states', 'ov-d');
      else if (own(RS, k[1])) t = T(RS[k[1]], own(P.people.booking, k[1]), 'guest', 'the booking system\'s states', 'ov-d');
    }
    if (k[0] === 'leg' && Q) {
      var l = legRows(X).filter(function (x) { return safeKey(x.id) === k[1]; })[0];
      if (l && !k[2]) t = T(l.place + ' · persons', l.ids, 'guest', 'confirmed bookings in the figures', 'ov-e');
      if (l && k[2]) { var it = l.items.filter(function (x) { return safeKey(x.itemId) === k[2]; })[0]; if (it) t = T(it.name + ' · persons', it.ids, 'guest', 'confirmed bookings in the figures · quota ' + (it.quota == null ? 'not stated' : it.quota), 'ov-e'); }
    }
    if (k[0] === 'req' && P) { var r = P.requests.filter(function (x) { return safeKey(x.id) === k[1]; })[0]; if (r) t = T(r.name + ' · requested', r.ids, 'guest', 'as sent · a request, not a reservation', 'ov-e'); }
    if (k[0] === 'finale' && P && (k[1] === 'pool' || k[1] === 'baron')) t = T('After the dinner · ' + (k[1] === 'pool' ? 'Pool' : 'BARON'), P.finale[k[1]], 'guest', 'as sent', 'ov-e');
    if (k[0] === 'sang' && P) { var sk = Object.keys(P.sangkhathan).filter(function (x) { return safeKey(x) === k[1]; })[0]; if (sk) t = T('Sangkhathan as sent · ' + sk, own(P.sangkhathan, sk), 'guest', 'as sent', 'ov-e'); }
    var CITY = { ALL: 1, BANGKOK: 1, VIENTIANE: 1, CHINA: 1 };
    if (k[0] === 'night' && P && own(CITY, k[2])) { var n = P.presence.filter(function (x) { return x.night === k[1]; })[0]; if (n) t = T('With us · night of ' + dayLong(k[1]) + (k[2] === 'ALL' ? '' : ' · ' + k[2].charAt(0) + k[2].slice(1).toLowerCase()), k[2] === 'ALL' ? n.BANGKOK.concat(n.VIENTIANE, n.CHINA, n.OTHER) : n[k[2]], 'guest', 'the room plan', 'ov-f'); }
    if ((k[0] === 'arr' || k[0] === 'dep') && P) { var mv = P.movements[k[0] === 'arr' ? 'arrivals' : 'departures'].filter(function (x) { return x.date === k[1]; })[0]; if (mv) t = T((k[0] === 'arr' ? 'First night with us · ' : 'Departure after the last night · ') + dayLong(k[1]), mv.ids, 'guest', 'the room plan, not flights', 'ov-f'); }
    var DK = { passport: 'Passport', flight: 'Flight information' }, DS = { received: 'received', notReceived: 'not received (optional)', notSent: 'trip not sent' };
    if (k[0] === 'doc' && P && own(DK, k[1]) && own(DS, k[2])) t = T(DK[k[1]] + ' · ' + DS[k[2]], own(own(P.care.documents, k[1]), k[2]), 'guest', 'as sent · the profile shows the current state', 'ov-d');
    var AS = { yes: 'yes', no: 'no', notAnswered: 'not answered', notSent: 'trip not sent' };
    if (k[0] === 'allergy' && P && own(AS, k[1])) t = T('Food allergy · ' + AS[k[1]], own(P.care.allergy, k[1]), 'guest', 'as sent · which allergies: in the profile', 'ov-d');
    return t;
  }
  function renderList(key, M, h) {
    var back = '<p class="t-l1 ov-back"><a href="/admin/billing#overview" data-ab-tab="#overview">← Overview</a></p>';
    if (!LIST_RE.test(key || '')) return '<div class="ov ov-ls">' + back + '<div class="ov-card"><p class="t-b1">This list does not exist.</p></div></div>';
    var L = listOf(key, M), X = parts(M);
    if (!L) {
      var loading = !X.P || !X.Q || !statusDone(M) || !M.readyDone;
      return '<div class="ov ov-ls">' + back + '<div class="ov-card">' + (loading ? '<p class="ov-wait">Loading — the list fills when its figures have arrived (guest checks ' + num(M.checked) + ' / ' + num(M.total) + ').</p>' : '<p class="t-b1">This list does not exist.</p>') + '</div></div>';
    }
    var byInv = {}, byG = {};
    (M.holders || []).forEach(function (x) { byInv[x.Holder_ID] = x; if (x.guestId) byG[x.guestId] = x; });
    var rows = L.ids.map(function (id) {
      var x = L.kind === 'holder' ? byInv[id] : byG[id], inv = x ? x.Holder_ID : (/^INV-/.test(id) ? id : null), g = x ? x.guestId : (L.kind === 'guest' ? id : '');
      var name = x && x.name ? x.name.full : '(name not in the guest list)';
      return '<li class="ov-lsr"><div><p class="ov-lsn">' + E(name) + '</p><p class="ov-lsi">' + E([g, inv].filter(Boolean).join(' · ')) + '</p></div>' +
        (inv ? '<button type="button" class="p-link ab-pf-open" data-ab-profile="' + E(inv) + '">Profile</button>' : '') + '</li>';
    });
    return '<div class="ov ov-ls">' + back + '<section class="ov-card"><h2 class="ov-h1 small">' + E(L.title) + '</h2><p class="ov-cs">' + L.ids.length + ' ' + (L.ids.length === 1 ? 'guest' : 'guests') + ' · ' + E(L.basis) + '</p>' +
      (rows.length ? '<ul class="ov-lsl">' + rows.join('') + '</ul>' : '<p class="ov-empty">Nobody.</p>') + '<p class="ov-note">' + '<button type="button" class="ov-up" data-ov-back="' + E(L.back) + '">↑ Back to the figure</button></p></section></div>';
  }

  window.SIYL_ADMIN_OVERVIEW = { render: render, renderList: renderList, LIST_RE: LIST_RE, actions: function (M) { return actions(M, parts(M)); } };
})();
