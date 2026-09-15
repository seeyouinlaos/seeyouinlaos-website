/* ============================================================================
   SEE YOU IN LAOS — THE TRAVEL PASS (Owner decision, 15 Sep 2026).

   Every transport leg the guest selects is shown as a TICKET: the route, the
   date, departure and arrival, the class, the guest, the guest's own price,
   a travel-pass reference and a code to scan. The same card stands on Your
   Journey, in the bag, on Review & Send and on the transport page, and it
   comes as a downloadable PDF — one grammar for every leg, train or flight.

   WHAT THE CODE IS. The QR code carries the travel-pass reference and the
   facts of the leg (guest first name, leg, date, class, state), so Guest
   Relations can read a pass at a glance. It is NOT an airline or railway
   ticket: the reference is a deterministic, non-secret digest of the guest,
   the leg and the class; the state says exactly what the pass is — SELECTED
   (in the journey), SENT (received by Guest Relations) or CONFIRMED (by Guest
   Relations). No access code, no invitation id, no price in the code.

   LEGS come from assets/transport-data.js and assets/pricing.js; this file
   never prices and never invents a service.
   ========================================================================== */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SIYL_TRAVELPASS = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  /* the four legs, in the guest's own terms; codes are the real station / airport codes only where they exist */
  var LEGS = {
    train: { id: 'train', code: 'TN25', kind: 'train', title: 'Special Express No. 25', operator: 'State Railway of Thailand',
      from: { code: 'BKK', name: 'Bangkok', place: 'Krung Thep Aphiwat Central Terminal', time: '20:25', date: '24 Feb 2027' },
      to: { code: 'NKI', name: 'Nong Khai', place: 'then by road to Vientiane', time: '06:25', date: '25 Feb 2027' },
      duration: 'About 10 hours on board', dates: '24 – 25 February 2027', route: 'Bangkok → Nong Khai → Vientiane',
      cls: 'First Class Sleeper · private cabin', note: 'Van and border logistics to Souphattra Heritage included' },
    mu9646: { id: 'mu9646', code: 'MU9646', kind: 'flight', title: 'MU9646 · Vientiane → Kunming', operator: 'China Eastern Airlines',
      from: { code: 'VTE', name: 'Vientiane', place: 'Terminal 1', time: '15:50', date: '01 Mar 2027' },
      to: { code: 'KMG', name: 'Kunming', place: 'Non-stop', time: '18:25', date: '01 Mar 2027' },
      duration: '1h 35m · non-stop', dates: '01 March 2027', route: 'Vientiane → Kunming',
      cls: 'Business Class', classes: { business: 'Business Class', 'economy-flexible': 'Economy Flexible' } },
    c86: { id: 'c86', code: 'C86', kind: 'train', title: 'C86 · Kunming → Lijiang', operator: 'High-speed train',
      from: { code: 'KMG', name: 'Kunming', place: 'Kunming Railway Station', time: '10:15', date: '04 Mar 2027' },
      to: { code: 'LJG', name: 'Lijiang', place: 'Lijiang Railway Station', time: '13:44', date: '04 Mar 2027' },
      duration: '3h 29m · direct', dates: '04 March 2027', route: 'Kunming → Lijiang', cls: 'Business Class' },
    'return': { id: 'return', code: 'MU5924', kind: 'flight', title: 'MU5924 + MU741 · Lijiang → Bangkok', operator: 'China Eastern Airlines',
      from: { code: 'LJG', name: 'Lijiang', place: 'MU5924 · then MU741', time: '10:35', date: '06 Mar 2027' },
      to: { code: 'BKK', name: 'Bangkok', place: 'via Kunming · 1 h 30 m', time: '14:55', date: '06 Mar 2027' },
      duration: '5h 20m door to door · 1h 30m in Kunming', dates: '06 March 2027', route: 'Lijiang → Kunming → Bangkok', cls: 'Economy flexible' }
  };
  var ORDER = ['train', 'mu9646', 'c86', 'return'];
  var STATE_WORDS = { selected: 'Selected · in your journey', sent: 'Sent to Guest Relations', confirmed: 'Confirmed by Guest Relations' };
  var ALPHA = '23456789BCDFGHJKMNPQRSTVWXZ';

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function sha(s) { var L = root && root.SIYL_SEATLABELS; if (L && L.sha256) return L.sha256(s); if (typeof require === 'function') return require('./seatlabels.js').sha256(s); throw new Error('no sha256'); }
  function isLeg(id) { return !!LEGS[id]; }
  function classOf(id, cls) { var l = LEGS[id]; if (!l) return ''; return (l.classes && cls && l.classes[cls]) || l.cls; }
  /* the reference: a harmless digest of guest · leg · class — it changes when the class changes, as a pass should */
  function ref(guestId, legId, cls) {
    var l = LEGS[legId]; if (!guestId || !l) return null;
    var hex = sha('travelpass|' + guestId + '|' + legId + '|' + (cls || '')), tail = '';
    for (var i = 0; i < 4; i++) tail += ALPHA[parseInt(hex.substr(i * 4, 4), 16) % ALPHA.length];
    return 'SYL-' + l.code + '-' + tail;
  }
  /* the words inside the code: readable by any scanner, secret to nobody */
  function payload(doc) {
    return ['SEE YOU IN LAOS', 'TRAVEL PASS ' + doc.ref, doc.guest.preferredName, doc.leg.code + ' ' + doc.leg.route, doc.leg.dates, doc.cls, doc.state.toUpperCase()].join('\n');
  }
  /* ---- the QR code as modules, via the vendored encoder (MIT, Kazuhiko Arase) ---- */
  function modules(text) {
    var q = (root && root.qrcode) || (typeof require === 'function' ? require('./vendor/qrcode.js') : null);
    if (!q) return null;
    if (q.stringToBytesFuncs && q.stringToBytesFuncs['UTF-8']) q.stringToBytes = q.stringToBytesFuncs['UTF-8'];   /* names and arrows survive the scan */
    var c = q(0, 'M'); c.addData(text, 'Byte'); c.make();
    var n = c.getModuleCount(), out = [];
    for (var r = 0; r < n; r++) { var row = []; for (var col = 0; col < n; col++) row.push(c.isDark(r, col)); out.push(row); }
    return out;
  }
  function qrSvg(text, size, label) {
    var m = modules(text); if (!m) return '';
    var n = m.length, quiet = 2, N = n + quiet * 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) d += 'M' + (c + quiet) + ' ' + (r + quiet) + 'h1v1h-1z';
    return '<svg class="p-qr" viewBox="0 0 ' + N + ' ' + N + '" width="' + size + '" height="' + size + '" shape-rendering="crispEdges" role="img" aria-label="' + esc(label || 'Travel pass code') + '"><rect width="' + N + '" height="' + N + '" fill="#FCFAF6"/><path d="' + d + '" fill="#313131"/></svg>';
  }

  /* ---- the document: the guest, the leg, the class, the state ---- */
  function stateOf(C) {
    var st = C && C.state ? C.state() : 'none';
    return st === 'confirmed' ? 'confirmed' : st === 'received' ? 'sent' : 'selected';
  }
  function docFor(legId, ctx) {
    var l = LEGS[legId]; if (!l) return null;
    ctx = ctx || {};
    var guest = ctx.guest || null; if (!guest || !guest.guestId) return null;
    var cls = classOf(legId, ctx.cls);
    var state = ctx.state || 'selected';
    var r = ref(guest.guestId, legId, ctx.cls || '');
    return { leg: l, guest: { guestId: guest.guestId, fullName: guest.fullName || guest.preferredName || '', preferredName: guest.preferredName || guest.fullName || '' },
             cls: cls, price: ctx.price != null ? ctx.price : null, state: state, stateWords: STATE_WORDS[state], ref: r, sentAt: ctx.sentAt || null, downloadedAt: ctx.at || new Date().toISOString() };
  }
  /* the guest's own document, from the page: the session, the bag line, the journey status */
  function docFromPage(legId) {
    var G = root && root.SIYL_GUEST, B = root && root.SIYL_BAG, C = root && root.SIYL_CONFIRM;
    var me = G && G.me ? G.me() : null; if (!me) return null;
    var line = B ? B.get().filter(function (x) { return x.id === legId; })[0] : null;
    if (!line) return null;
    var cls = line.cls || '';
    return docFor(legId, { guest: { guestId: me.guestId, fullName: G.value(me.guestId, 'fullName') || me.fullName, preferredName: G.nameOf() }, cls: cls, price: line.price, state: stateOf(C), sentAt: C && C.receivedAt ? C.receivedAt() : null });
  }

  /* ---- the ticket card, one grammar on every surface ----
   * opts: { selected, compact, actions: html, price: html, state }            */
  function card(legId, opts) {
    opts = opts || {};
    var l = LEGS[legId]; if (!l) return '';
    var G = root && root.SIYL_GUEST, me = G && G.me ? G.me() : null;
    var doc = opts.doc || (opts.selected ? docFromPage(legId) : null);
    var cls = doc ? doc.cls : classOf(legId, opts.cls);
    var state = doc ? doc.state : null;
    var head = '<div class="p-ticket-head"><p class="t-l1">' + esc(l.kind === 'train' ? 'Train' : 'Flight') + ' · ' + esc(l.operator) + '</p>' +
      '<p class="t-l1 ' + (opts.selected ? 'on' : '') + '" data-ticket-state>' + (opts.selected ? '<i class="prep-tick" aria-hidden="true"></i>' + esc(state === 'confirmed' ? 'Confirmed' : state === 'sent' ? 'Sent' : 'Current selection') : 'Not selected') + '</p></div>';
    /* the vehicle on the line: a plain glyph in ink, drawn inline so it needs no mask and no image */
    var glyph = l.kind === 'train'
      ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2c-4 0-8 .5-8 4v9.5A3.5 3.5 0 0 0 7.5 19L6 20.5V21h12v-.5L16.5 19a3.5 3.5 0 0 0 3.5-3.5V6c0-3.5-4-4-8-4zm-3.5 15a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2.5-6H6V7h5v4zm4.5 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2.5-6h-5V7h5v4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="transform:rotate(90deg)"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>';
    var route = '<div class="p-ticket-route">' +
      '<div class="p-ticket-end"><b class="p-ticket-code">' + esc(l.from.code) + '</b><span class="p-ticket-time">' + esc(l.from.time) + '</span><span class="t-b2">' + esc(l.from.name) + '<br>' + esc(l.from.place) + '</span><span class="t-l1">' + esc(l.from.date) + '</span></div>' +
      '<div class="p-ticket-mid" aria-hidden="true"><span class="p-ticket-line"><i class="p-ticket-glyph p-ticket-' + l.kind + '">' + glyph + '</i></span><span class="t-l1">' + esc(l.duration) + '</span></div>' +
      '<div class="p-ticket-end to"><b class="p-ticket-code">' + esc(l.to.code) + '</b><span class="p-ticket-time">' + esc(l.to.time) + '</span><span class="t-b2">' + esc(l.to.name) + '<br>' + esc(l.to.place) + '</span><span class="t-l1">' + esc(l.to.date) + '</span></div></div>';
    var facts = '<div class="p-ticket-facts">' +
      '<div><p class="t-l1">Class</p><p class="t-b1">' + esc(cls) + '</p></div>' +
      '<div><p class="t-l1">Guest</p><p class="t-b1">' + esc(me ? (G.nameOf() || me.preferredName) : '—') + '</p></div>' +
      (doc ? '<div><p class="t-l1">Travel pass</p><p class="t-b1"><span class="ref">' + esc(doc.ref) + '</span></p></div>' : '<div><p class="t-l1">Travel pass</p><p class="t-b2">Issued with your selection</p></div>') +
      (opts.price ? '<div><p class="t-l1">Your cost</p><p class="t-b1">' + opts.price + '</p></div>' : '') + '</div>';
    var code = doc ? '<div class="p-ticket-code-box">' + qrSvg(payload(doc), 96, 'Travel pass code ' + doc.ref) + '<p class="t-l1">' + esc(doc.stateWords) + '</p></div>' : '';
    return '<div class="p-ticket' + (opts.selected ? ' on' : '') + (opts.compact ? ' compact' : '') + '" data-ticket="' + esc(legId) + '">' + head +
      '<h3 class="t-h1">' + esc(l.title) + '</h3>' + route + '<div class="p-ticket-tear" aria-hidden="true"></div>' +
      '<div class="p-ticket-body">' + facts + code + '</div>' +
      (l.note && !opts.compact ? '<p class="t-b2">' + esc(l.note) + '</p>' : '') +
      (opts.actions ? '<div class="p-actions">' + opts.actions + '</div>' : '') + '</div>';
  }
  /* the strip: the same pass in one row — for the bag and for Review & Send */
  function strip(legId, opts) {
    opts = opts || {};
    var l = LEGS[legId]; if (!l) return '';
    var doc = opts.doc || docFromPage(legId); if (!doc) return '';
    return '<div class="p-pass" data-pass="' + esc(legId) + '">' +
      qrSvg(payload(doc), 64, 'Travel pass code ' + doc.ref) +
      '<div class="p-pass-body">' +
        '<p class="p-pass-route"><b>' + esc(l.from.code) + '</b> ' + esc(l.from.time) + ' <span class="p-pass-arrow" aria-hidden="true">→</span> <b>' + esc(l.to.code) + '</b> ' + esc(l.to.time) + '</p>' +
        '<p class="t-b2">' + esc(l.dates) + ' · ' + esc(doc.cls) + '</p>' +
        '<p class="t-l1">Travel pass <span class="ref">' + esc(doc.ref) + '</span> · ' + esc(doc.stateWords) + '</p>' +
        (opts.download === false ? '' : '<p class="p-pass-act">' + button(legId, true) + '</p>') +
      '</div></div>';
  }
  /* the download button, wired by wire() */
  function button(legId, quiet) { return '<button type="button" class="' + (quiet ? 'p-link' : 'p-act quiet') + '" data-travel-pass="' + esc(legId) + '">Download travel pass</button>'; }
  function wire(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('[data-travel-pass]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (b.getAttribute('aria-disabled') === 'true') return;
        var was = b.textContent; b.setAttribute('aria-disabled', 'true'); b.textContent = 'Preparing…';
        var r = deliver(b.getAttribute('data-travel-pass'));
        b.removeAttribute('aria-disabled'); b.textContent = r && r.ok ? 'Downloaded · again?' : (r && r.error === 'not selected' ? 'Not in your journey' : was);
      });
    });
  }

  /* ---- the PDF ---- */
  /* WinAnsi has no arrow: the route reads with an en dash on paper */
  function paper(t) { return String(t == null ? '' : t).replace(/\s*→\s*/g, ' \u2013 '); }
  function compose(doc) {
    var W0 = root && root.SIYL_SEATPASS && root.SIYL_SEATPASS.writer;
    if (!W0 && typeof require === 'function') W0 = require('./seatpass.js').writer;
    if (!W0) throw new Error('no pdf writer');
    var p = new W0.Page(), PAGE = W0.PAGE, M = 56, W = PAGE.w - M * 2, y = PAGE.h - 64, INK = W0.INK, MUTE = W0.MUTE, LINE = W0.LINE;
    p.rect(0, 0, PAGE.w, PAGE.h, W0.GROUND);
    p.rect(M - 16, 48, W + 32, PAGE.h - 96, W0.PAPER, LINE, 0.6);
    p.text(M, y, 'see you in laos.', 'F1', 21, INK, 0.2); y -= 20;
    p.label(M, y, 'Travel pass'); p.label(M + W, y, doc.stateWords, 'right'); y -= 30;
    p.line(M, y, M + W, y, INK, 0.7); y -= 34;
    p.label(M, y, doc.leg.kind === 'train' ? 'Train' : 'Flight'); p.text(M, y - 24, paper(doc.leg.title), 'F1', 19); p.text(M, y - 42, doc.leg.operator, 'F2', 9.5, MUTE); y -= 70;
    /* the route: two ends, the codes large */
    p.text(M, y, doc.leg.from.code, 'F1', 30); p.text(M + W, y, doc.leg.to.code, 'F1', 30, INK, 0, 'right');
    p.line(M + 110, y + 8, M + W - 110, y + 8, LINE, 0.8);
    p.text(M + W / 2, y + 14, doc.leg.duration, 'F2', 8, MUTE, 0.8, 'center');
    y -= 18;
    p.text(M, y, doc.leg.from.time + ' · ' + doc.leg.from.date, 'F2', 10); p.text(M + W, y, doc.leg.to.time + ' · ' + doc.leg.to.date, 'F2', 10, INK, 0, 'right'); y -= 14;
    p.text(M, y, doc.leg.from.name + ' · ' + doc.leg.from.place, 'F2', 8.5, MUTE); p.text(M + W, y, doc.leg.to.name + ' · ' + doc.leg.to.place, 'F2', 8.5, MUTE, 0, 'right'); y -= 30;
    p.line(M, y, M + W, y); y -= 30;
    /* the facts */
    p.label(M, y, 'Guest'); p.text(M, y - 20, doc.guest.fullName, 'F1', 15);
    p.label(M + W / 2, y, 'Class'); p.text(M + W / 2, y - 20, doc.cls, 'F1', 15); y -= 48;
    p.label(M, y, 'Date'); p.text(M, y - 18, doc.leg.dates, 'F1', 12.5);
    p.label(M + W / 2, y, 'Route'); p.text(M + W / 2, y - 18, paper(doc.leg.route), 'F1', 12.5); y -= 46;
    p.label(M, y, 'Travel pass'); p.text(M, y - 20, doc.ref, 'F2', 12, INK, 1.6);
    p.label(M + W / 2, y, 'Your cost'); p.text(M + W / 2, y - 20, doc.price != null ? 'USD ' + Number(doc.price).toLocaleString('en-US') + ' · per person' : 'Guest Relations confirms', 'F2', 11);
    y -= 40;
    if (doc.leg.note) { p.text(M, y, doc.leg.note, 'F3', 9.5, MUTE); y -= 18; }
    y -= 8; p.line(M, y, M + W, y); y -= 24;
    /* the code: modules as rectangles, quiet zone kept */
    var m = modules(payload(doc));
    if (m) {
      var size = 120, n = m.length, cell = size / n, x0 = M, y0 = y - size;
      p.rect(x0 - 8, y0 - 8, size + 16, size + 16, '1 1 1');
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (m[r][c]) p.rect(x0 + c * cell, y0 + (n - 1 - r) * cell, cell + 0.15, cell + 0.15, INK);
      p.label(M + size + 24, y - 10, 'Scan');
      p.text(M + size + 24, y - 28, 'The code carries this pass: the reference, your first name, the leg, the date and the class.', 'F3', 9.5, MUTE);
      p.text(M + size + 24, y - 42, 'Guest Relations reads it at a glance. It is not the carrier’s ticket.', 'F3', 9.5, MUTE);
      y = y0 - 24;
    }
    p.line(M, y, M + W, y); y -= 22;
    p.text(M, y, 'This travel pass records your selection for the wedding journey of Haruthai & Suthep as it stands at the time of download.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, doc.state === 'confirmed' ? 'Guest Relations has confirmed this arrangement. The carrier’s ticket follows from Guest Relations.' : doc.state === 'sent' ? 'Guest Relations has received your journey. The arrangement is confirmed with you personally; the carrier’s ticket follows from Guest Relations.' : 'Nothing is paid on this website. Guest Relations confirms the arrangement with you personally; the carrier’s ticket follows from Guest Relations.', 'F3', 9.5, MUTE); y -= 14;
    p.text(M, y, 'If you change your journey, download this pass again; the newer one is the one that counts.', 'F3', 9.5, MUTE);
    p.label(M, 64, 'Downloaded ' + doc.downloadedAt.replace('T', ' ').slice(0, 16) + ' UTC');
    p.label(M + W, 64, 'Thailand · Laos · China · 21 February – 8 March 2027', 'right');
    return W0.build([p], { title: 'Travel pass · ' + paper(doc.leg.title) + ' · ' + doc.guest.preferredName, subject: 'Travel pass ' + doc.ref });
  }
  function filename(doc) {
    var who = String(doc.guest.preferredName || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'guest';
    return 'see-you-in-laos-travel-pass-' + doc.leg.code.toLowerCase() + '-' + who + '.pdf';
  }
  function download(doc) {
    var W0 = root.SIYL_SEATPASS.writer, bytes = W0.toBytes(compose(doc)), blob = new Blob([bytes], { type: 'application/pdf' }), url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = filename(doc); a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 90000);
    return a.download;
  }
  function deliver(legId) {
    var doc = docFromPage(legId);
    if (!doc) return { ok: false, error: 'not selected' };
    try { return { ok: true, file: download(doc), doc: doc }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
  }

  return { LEGS: LEGS, ORDER: ORDER, STATE_WORDS: STATE_WORDS, isLeg: isLeg, classOf: classOf, ref: ref, payload: payload, modules: modules, qrSvg: qrSvg,
           docFor: docFor, docFromPage: docFromPage, card: card, strip: strip, button: button, wire: wire, compose: compose, filename: filename, download: download, deliver: deliver };
});
