/* ============================================================================
   SEE YOU IN LAOS — GUEST SETTLEMENT · THE H&S ADMIN CONSOLE (Owner, 7 Oct 2026).

   /admin/billing — the operating screen of the two BILLING_ADMINs, Haruthai and
   Suthep. It reads and acts ONLY through /api/billing/… with the bearer of the
   invitation signed in on this device; the server decides who is an admin (a
   guest gets 403 and this page shows nothing but that). Nothing is computed here:
   every amount, total, due date and status is the server's (the Billing Engine,
   the ledger, Google 002/008) — this page arranges and asks.

   NOTHING HAPPENS BY ITSELF. Opening the page or a guest only reads. Confirming
   a booking, issuing a statement, sending it, verifying or rejecting a payment
   each need their own explicit confirmation on this page; none is ever
   triggered by a load.
     · PREVIEW — the canonical engine's lines and total, before anything is issued
     · CONFIRM BOOKING — the version the guest SUBMITTED (never the saved trip),
                 as Guest Relations would confirm it: name, sent time, value and
                 lines shown first; a selection changed since must be acknowledged
     · ISSUE   — only when the server says it may, confirming the very statement
                 previewed (its proposal hash); immutable once issued
     · VIEW    — the exact issued revision
     · DOWNLOAD— the private PDF, fetched with the bearer (never a link)
     · SEND    — the issued statement by e-mail, after showing name, e-mail,
                 Statement ID, total and due date; once per confirmation
   ========================================================================== */
(function () {
  'use strict';

  function auth() {
    try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return a && a.bearer ? a : null; } catch (e) { return null; }
  }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function money(cur, n) {
    if (n == null || n === '' || !isFinite(Number(n))) return '—';
    return cur + ' ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function usd(n) { return money('USD', n); }
  /* a signed amount: "−USD 2,920.00" / "+USD 3,600.00" (a variance or a surplus says its direction) */
  function signed(m) { if (!m || m.amount == null) return '—'; var n = Number(m.amount); return (n < 0 ? '−' : n > 0 ? '+' : '') + money(m.currency || 'USD', Math.abs(n)); }

  /* ------------------------------------------------- exports (Owners' review, 18 Nov 2026)
     CSV for Excel: UTF-8 with a BOM, CRLF, ISO dates, plain numbers without thousands separators; the delimiter is chosen on the
     page ("," — Excel international · ";" with a decimal comma — Excel in Europe; first guessed from this device's number
     format, kept for this visit only — the console stores nothing); a text cell never starts a formula. Every report names what
     it is, when it was made, the data it shows, its currency and its basis. No invitation code, bearer or token is ever exported. */
  function csvSep() {
    if (S.csvSep === ';' || S.csvSep === ',') return S.csvSep;
    try { return (1.5).toLocaleString().indexOf(',') >= 0 ? ';' : ','; } catch (e) { return ','; }
  }
  function csvCell(v, sep) {
    if (v == null) return '';
    if (typeof v === 'number') { if (!isFinite(v)) return ''; var t = String(Math.round(v * 100) / 100); return sep === ';' ? t.replace('.', ',') : t; }
    var s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s;
    return s.indexOf(sep) >= 0 || /["\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csvDoc(title, meta, head, rows) {
    var sep = csvSep(), line = function (r) { return r.map(function (v) { return csvCell(v, sep); }).join(sep); };
    return '﻿' + [line([title])].concat(meta.map(line), [''], [line(head)], rows.map(line)).join('\r\n') + '\r\n';
  }
  function saveText(name, text) {
    if (typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false;
    var url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
    return true;
  }
  function nowStamp() { return new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; }
  function num(m) { return m && m.cents != null ? m.cents / 100 : (m && m.amount != null && isFinite(Number(m.amount)) ? Number(m.amount) : null); }
  function curOf(list, cur) { var m = (list || []).filter(function (x) { return x && x.currency === cur; })[0]; return m ? num(m) : null; }
  function exportBar(items, extra) {
    var sep = csvSep();
    return '<div class="ab-export" data-ab-export>' + (extra || '') + items.map(function (x) { return '<button type="button" class="ab-filter" data-ab-csv="' + esc(x[0]) + '">' + esc(x[1]) + '</button>'; }).join('') +
      '<label class="ab-sep"><span class="ab-mute">CSV for</span> <select data-ab-csvsep aria-label="CSV format"><option value=","' + (sep === ',' ? ' selected' : '') + '>Excel · comma</option>' +
      '<option value=";"' + (sep === ';' ? ' selected' : '') + '>Excel Europe · semicolon</option></select></label></div>';
  }
  function day(iso) {
    if (!iso) return '—';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  }
  function when(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return isNaN(d) ? esc(iso) : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
  }
  function key() {
    var b = new Uint8Array(16);
    try { crypto.getRandomValues(b); } catch (e) { for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256); }
    return Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  var METHOD = { PAYPAL_EUR: 'PayPal (EUR)', SEPA_EUR: 'Bank transfer — SEPA (EUR)', PROMPTPAY_THB: 'PromptPay (THB)' };
  var CONF = { CONFIRMED: ['Confirmed', 'on'], UNCONFIRMED: ['Waiting for confirmation', 'open'], LAPSED: ['Sent again · waiting for confirmation', 'open'],
    NONE: ['Not sent', ''], UNREADABLE: ['Not readable', 'open'] };
  /* who confirmed: the audit label of a BILLING_ADMIN, else Guest Relations */
  var WHO = { BRIDE: 'Haruthai', GROOM: 'Suthep' };
  function confirmedBy(c) { return c && c.role === 'BILLING_ADMIN' && WHO[c.confirmedBy] ? WHO[c.confirmedBy] : 'Guest Relations'; }
  var WAITING = 'Waiting for confirmation — Haruthai or Suthep can confirm this submitted booking.';
  var NOT_SUBMITTED = 'The guest has not submitted this trip yet.';
  /* the server's reason, in the console's words where it is about the booking */
  function reasonWords(r) {
    if (/^BOOKING_NOT_CONFIRMED: (UNCONFIRMED|LAPSED)/.test(r || '')) return WAITING;
    if (/^BOOKING_NOT_CONFIRMED: NONE/.test(r || '')) return NOT_SUBMITTED;
    return r;
  }
  var PAY = { UNPAID: 'Not paid', PARTIAL: 'Partly paid', PAID: 'Paid', OVERPAID: 'Overpaid', NOTHING_DUE: 'Nothing due' };
  var FILTERS = [['all', 'All'], ['booked', 'Booked'], ['toConfirm', 'To confirm'], ['notSent', 'Not sent'], ['noBooking', 'No booking'], ['elsewhere', 'Booked by another payer'],
    ['ready', 'Ready to issue'], ['blocked', 'Blocked'], ['notIssued', 'Not issued'], ['issued', 'Issued'], ['outstanding', 'Outstanding'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['review', 'Manual review']];

  /* ------------------------------------------------------------- the state */
  var S = {
    phase: 'idle', error: '', overview: null, status: {}, checked: 0, checking: false, statusError: '',
    filter: 'all', q: '', route: { view: 'guests', id: null },
    holder: null, holderPhase: 'idle', holderError: '', panel: null,
    issue: null, send: null, pay: null, confirm: null, msg: '', download: '',
    revenue: null, revenuePhase: 'idle', revenueError: '',
    budgetOpen: {},   /* which stays / routes of the budget comparison are open — kept across a redraw */
  };
  var root = null;
  /* THE OWNERS' SEATING MANAGEMENT & ROOM ASSIGNMENTS (Owners, 18 Nov 2026): two more areas from assets/admin-assign.js — loaded
     before this file, given this console's own helpers, drawn and wired by it; absent, the console is what it was */
  var EXT = window.SIYL_ADMIN_EXT || null;
  function extView(v) { return !!(EXT && EXT.views && EXT.views[v]); }

  function api(path, opts) {
    var a = auth();
    var o = opts || {};
    var h = { 'x-siyl-auth': a ? a.bearer : '' };
    if (o.body) h['content-type'] = 'application/json';
    return fetch('/api/billing/' + path, { method: o.method || 'GET', headers: h, cache: 'no-store', body: o.body ? JSON.stringify(o.body) : undefined })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, ok: r.ok && !!j && j.ok !== false, j: j || {} }; }); },
        function () { return { status: 0, ok: false, j: { error: 'the server could not be reached' } }; });
  }
  function draw() { if (root) { root.innerHTML = page(); wire(); } }

  /* -------------------------------------------------------------- routing */
  function readRoute() {
    var h = String(location.hash || '').replace(/^#/, '');
    var m = /^holder=(INV-[A-Z0-9-]+)$/.exec(h);
    if (m) return { view: 'holder', id: m[1] };
    if (h === 'revenue' || h === 'rooms' || h === 'finance') return { view: h, id: null };
    if (extView(h)) return { view: h, id: null };
    return { view: 'guests', id: null };
  }
  var hashEvents = true;
  function go(hash) { if (location.hash === hash || !hashEvents) { location.hash = hash; onRoute(); } else location.hash = hash; }
  function onRoute() {
    S.route = readRoute();
    S.panel = null; S.issue = null; S.send = null; S.pay = null; S.confirm = null; S.msg = ''; S.download = ''; S.owner = null; S.ownerMsg = ''; S.obForm = null;
    if (S.route.view === 'holder') loadHolder(S.route.id);
    else if (/^(revenue|rooms|finance)$/.test(S.route.view) && S.revenuePhase === 'idle') loadRevenue();
    else if (extView(S.route.view) && EXT.enter) EXT.enter(S.route.view);
    draw();
    try { window.scrollTo(0, 0); } catch (e) {}
  }

  /* --------------------------------------------------------------- loading */
  function start() {
    if (!auth()) { S.phase = 'signedout'; draw(); return; }
    S.phase = 'loading'; draw();
    api('admin/overview').then(function (x) {
      if (x.status === 403) { S.phase = 'denied'; draw(); return; }
      if (x.status === 401) { S.phase = 'signedout'; draw(); return; }
      if (!x.ok) { S.phase = 'error'; S.error = x.j.error || 'The guest list could not be read.'; draw(); return; }
      S.phase = 'ready'; S.overview = x.j; S.status = {}; S.ready = {}; S.checked = 0;
      onRoute();
      checkAll();
    });
  }
  /* Guest Relations' confirmation and the draft, ten guests per request, one request after another */
  var generation = 0;
  function checkAll() {
    if (!S.overview) return;
    var ids = S.overview.holders.map(function (h) { return h.Holder_ID; });
    var size = Number(S.overview.chunk) || 10, i = 0, tries = 0, mine = ++generation;
    S.checking = true; S.statusError = '';
    function next() {
      if (mine !== generation) return;                 /* a newer read of the list took over */
      if (i >= ids.length) { S.checking = false; draw(); checkReady(mine); if (S.revenuePhase === 'idle') loadRevenue(); return; }
      var part = ids.slice(i, i + size);
      api('admin/status?ids=' + encodeURIComponent(part.join(','))).then(function (x) {
        if (mine !== generation) return;
        if (!x.ok && x.status === 503 && tries < 3) { tries++; setTimeout(next, 4000 * tries); return; }
        tries = 0;
        if (x.ok) (x.j.rows || []).forEach(function (r) { S.status[r.Holder_ID] = r; });
        else part.forEach(function (id) { S.status[id] = { Holder_ID: id, error: x.j.error || 'not readable' }; });
        i += size; S.checked = Math.min(i, ids.length);
        if (S.route.view === 'guests') draw();
        next();
      });
    }
    next();
  }
  /* INVOICE READINESS (Owners, 17 Nov 2026): for every confirmed booking, what Issue would say now — the server's own assessment
     (admin/readiness), a few invitations per request after the status of every guest is known; nothing is issued here */
  function checkReady(mine) {
    if (!S.overview) return;
    var ids = S.overview.holders.map(function (h) { return h.Holder_ID; }).filter(function (id) {
      var st = S.status[id]; return !!(st && st.confirmation && st.confirmation.state === 'CONFIRMED');
    });
    var size = Number(S.overview.chunk) || 6, i = 0;
    function next() {
      if (mine !== generation || i >= ids.length) { if (mine === generation) draw(); return; }
      var part = ids.slice(i, i + size);
      api('admin/readiness?ids=' + encodeURIComponent(part.join(','))).then(function (x) {
        if (mine !== generation) return;
        if (x.ok) (x.j.rows || []).forEach(function (r) { S.ready[r.Holder_ID] = r; });
        else part.forEach(function (id) { S.ready[id] = { Holder_ID: id, error: x.j.error || 'not readable' }; });
        i += size; if (S.route.view === 'guests') draw();
        next();
      });
    }
    next();
  }
  function loadHolder(id) {
    S.holder = null; S.holderPhase = 'loading'; S.holderError = '';
    return api('admin/holder?holder=' + encodeURIComponent(id)).then(function (x) {
      if (S.route.id !== id) return;
      if (x.status === 403) { S.phase = 'denied'; draw(); return; }
      if (!x.ok) { S.holderPhase = 'error'; S.holderError = x.j.error || 'This guest could not be read.'; draw(); return; }
      S.holder = x.j; S.holderPhase = 'ready'; draw();
    }).then(function () { if (S.route.id === id) return loadOwner(id); });
  }
  /* THE OWNERS' OWN BOOKINGS (15 Nov 2026): what Haruthai & Suthep recorded for this paying invitation */
  function loadOwner(id) {
    S.ownerError = '';
    return api('admin/owner-bookings?holder=' + encodeURIComponent(id)).then(function (x) {
      if (S.route.id !== id) return;
      if (!x.ok) { S.ownerError = x.j.error || 'The recorded bookings could not be read.'; draw(); return; }
      S.owner = x.j; draw();
    });
  }
  function ownerWrite(body) {
    var id = S.route.id;
    if (!S.owner || S.ownerBusy) return;
    S.ownerBusy = true; S.ownerMsg = ''; draw();
    api('admin/owner-bookings', { method: 'POST', body: Object.assign({ holderId: id, expectedRev: S.owner.rev }, body) }).then(function (x) {
      S.ownerMsg = x.ok ? (body.action === 'confirm' ? 'Confirmed. These bookings are now part of the statement draft — nothing is issued or sent.' : 'Saved.')
        : (x.j.reasons && x.j.reasons.length ? x.j.reasons.join(' · ') : (x.j.error || 'Not saved.'));
      if (x.ok && body.action === 'add') S.obForm = { personId: '', itemId: S.obForm && S.obForm.itemId || '', room: S.obForm && S.obForm.room || '', extraBed: false, note: '' };
      /* the panel stays busy until the stored revision has been read again — the next write names that revision */
      var msg = S.ownerMsg;
      return loadHolder(id).then(function () { S.ownerBusy = false; S.ownerMsg = msg; draw(); });
    });
  }
  function loadRevenue() {
    S.revenuePhase = 'loading'; S.revenueError = '';
    api('revenue').then(function (x) {
      if (!x.ok) { S.revenuePhase = 'error'; S.revenueError = x.j.error || 'The revenue overview could not be calculated.'; draw(); return; }
      S.revenue = x.j; S.revenuePhase = 'ready'; draw();
    });
  }

  /* ------------------------------------------------------------- the list */
  function review(h) {
    var st = S.status[h.Holder_ID], out = [];
    if (st && st.error) out.push('not readable');
    if (st && st.draft && st.draft.manualReview) out.push(st.draft.manualReview + ' line' + (st.draft.manualReview > 1 ? 's' : '') + ' to review');
    if (st && st.draft && st.draft.unmapped && st.draft.unmapped.length) out.push('unmapped product');
    if (h.drift && h.drift.blocking) out.push(h.drift.blocking + ' blocking drift');
    else if (h.drift && h.drift.count) out.push(h.drift.count + ' drift');
    if (h.settlement && h.settlement.draftReview) out.push('draft under review');
    if (h.method && !h.method.determined) out.push('method to state');
    if (!h.name) out.push('no 006 name');
    return out;
  }
  /* THE BOOKING STAGE (Owners, 17 Nov 2026 — completeness): from Guest Relations' status of this invitation and the Owners'
     records that name the guest under another paying invitation; words only, never an amount */
  function stage(h) {
    var st = S.status[h.Holder_ID];
    if (!st) return null;
    if (st.error) return { key: 'unreadable', words: 'not readable' };
    var c = st.confirmation && st.confirmation.state, el = st.elsewhere || [];
    var by = function (state) { return el.filter(function (r) { return r.state === state; }).map(function (r) { return r.Holder_ID; }); };
    if (c === 'CONFIRMED') return { key: 'confirmed', words: 'booking confirmed' };
    if (by('CONFIRMED').length) return { key: 'elsewhere', words: 'booked by ' + by('CONFIRMED').join(', ') + ' · confirmed' };
    if (st.elsewhere === null || by('UNREADABLE').length) return { key: 'unreadable', words: 'the Owners\' records are not readable' };
    var own = st.confirmation && st.confirmation.ownerRecorded;
    if (c === 'UNCONFIRMED' || c === 'LAPSED' || (own && own.state === 'RECORDED')) return { key: 'waiting', words: 'waiting for confirmation' };
    if (by('RECORDED').length) return { key: 'waiting', words: 'recorded by ' + by('RECORDED').join(', ') + ' · not confirmed yet' };
    if (st.booked && st.booked.error) return { key: 'unreadable', words: 'selection not readable' };
    if (st.booked && st.booked.selected > 0) return { key: 'notSent', words: 'selection not sent' };
    return { key: 'none', words: 'no booking yet' };
  }
  /* an issued statement that already holds exactly this booking is up to date, not blocked */
  function upToDate(r) { return !!(r && r.reasons && r.reasons.length && r.reasons.every(function (x) { return /^NO_CHANGE:/.test(x); })); }
  function readyWords(h) {
    var r = S.ready[h.Holder_ID]; if (!r) return '';
    if (r.error) return '<br><span class="ab-chip open">readiness not readable</span>';
    if (r.allowed) return '<br><span class="ab-chip on" data-ab-ready>Ready to issue</span>';
    if (upToDate(r)) return '<br><span class="ab-mute">issued · up to date</span>';
    var first = String(r.reasons[0] || '').split(':')[0];
    return '<br><span class="ab-chip open" data-ab-blocked title="' + esc(r.reasons.join(' · ')) + '">Blocked · ' + esc(first) + (r.reasons.length > 1 ? ' (+' + (r.reasons.length - 1) + ')' : '') + '</span>';
  }
  function matches(h, f) {
    var s = h.settlement, p = h.payment, st = S.status[h.Holder_ID], g = stage(h), rd = S.ready[h.Holder_ID];
    if (f === 'notSent') return !!(g && g.key === 'notSent');
    if (f === 'noBooking') return !!(g && g.key === 'none');
    if (f === 'elsewhere') return !!(g && g.key === 'elsewhere');
    if (f === 'ready') return !!(rd && rd.allowed);
    if (f === 'blocked') return !!(rd && !rd.error && !rd.allowed && !upToDate(rd));
    if (f === 'booked') return !!(st && st.booked && !st.booked.error && st.booked.selected > 0);
    if (f === 'toConfirm') return !!(st && st.confirmation && (st.confirmation.state === 'UNCONFIRMED' || st.confirmation.state === 'LAPSED'));
    if (f === 'notIssued') return !(s && s.issuedRevision);
    if (f === 'issued') return !!(s && s.issuedRevision);
    if (f === 'outstanding') return !!(p && (p.status === 'UNPAID' || p.status === 'PARTIAL'));
    if (f === 'paid') return !!(p && (p.status === 'PAID' || p.status === 'OVERPAID' || p.status === 'NOTHING_DUE'));
    if (f === 'overdue') return !!(p && p.overdue);
    if (f === 'review') return review(h).length > 0;
    return true;
  }
  function searchHit(h, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return [h.name && h.name.full, h.name && h.name.nick, h.Holder_ID, h.guestId].some(function (v) { return v && String(v).toLowerCase().indexOf(q) >= 0; });
  }
  function confChip(st) {
    if (!st) return '<span class="ab-chip">…</span>';
    if (st.error) return '<span class="ab-chip open">Not readable</span>';
    var c = CONF[st.confirmation && st.confirmation.state] || [st.confirmation && st.confirmation.state || '—', ''];
    return '<span class="ab-chip ' + c[1] + '">' + esc(c[0]) + '</span>';
  }
  function stmtWords(h) {
    var s = h.settlement;
    if (s && s.issuedRevision) return 'Issued · V' + s.issuedRevision;
    if (s && s.latestRevision) return 'Draft V' + s.latestRevision;
    return 'Not issued';
  }
  /* STATEMENT TOTAL — the issued, immutable statement only; nothing else is ever shown here */
  function totalCell(h) {
    var s = h.settlement;
    if (s && s.issuedRevision) return '<span data-i18n-skip>' + esc(usd(s.issuedTotal)) + '</span>';
    return '<span class="ab-mute">—</span>';
  }
  /* BOOKED VALUE — what the guest has selected now, priced by the engine now; never a statement */
  var BOOKED_FROM = { CURRENT_SELECTION: 'current selection', SENT_VERSION: 'as sent' };
  function bookedCell(h) {
    var st = S.status[h.Holder_ID], b = st && st.booked;
    if (!b) return st && st.error ? '<span class="ab-chip open">not readable</span>' : '<span class="ab-mute">…</span>';
    if (b.error) return '<span class="ab-chip open">not readable</span>';
    if (b.source === 'NONE' || !b.selected) return '<span class="ab-mute">Nothing selected</span>';
    return '<span data-i18n-skip><b>' + esc(usd(b.total)) + '</b></span><br><span class="ab-mute">' + esc(BOOKED_FROM[b.source] || '') + '</span>' +
      (b.onRequest ? '<br><span class="ab-mute">+ ' + b.onRequest + ' on request</span>' : '');
  }
  function methodWords(h) {
    var m = h.method || {};
    if (!m.channel) return '<span class="ab-chip open">To state</span>';
    return esc(METHOD[m.channel] || m.channel);
  }
  /* WHERE EACH GUEST SLEEPS (Owners' review, 18 Nov 2026): the Rooms engine's room plan (held, sent or confirmed alike) with
     the room's hotel room number (the official list, as the Owners assigned it) and the guest's own booked line for it — from the revenue calculation, read once, never recomputed */
  function nightsBetweenDays(from, to) { var a = Date.parse(from), b = Date.parse(to); return a && b && b > a ? Math.round((b - a) / 86400000) : null; }
  function guestRooms() {
    var R = S.revenue, BG = R && R.budget;
    if (!BG || BG.available === false || !BG.roomPlan) return null;
    if (S.roomsOf && S.roomsOf.src === R) return S.roomsOf.map;
    var lines = {}, map = {};
    (BG.centres || []).forEach(function (c) { (c.rooms || []).forEach(function (r) { (r.lines || []).forEach(function (l) { lines[c.id + '|' + (r.item || l.item) + '|' + r.label + '|' + l.person] = l; }); }); });
    (BG.roomPlan || []).forEach(function (p) {
      var n = nightsBetweenDays(p.from, p.to);
      (p.rooms || []).forEach(function (u) {
        (u.occupants || []).forEach(function (o) {
          if (!o.guestId) return;
          (map[o.guestId] = map[o.guestId] || []).push({ stay: p.stay, place: p.place, from: p.from, to: p.to, nights: n, label: u.label, type: u.type, hotelRoom: u.hotelRoom || null,
            bed: !!o.bed, line: lines[p.stay + '|' + u.item + '|' + u.label + '|' + o.guestId] || null });
        });
      });
    });
    S.roomsOf = { src: R, map: map };
    return map;
  }
  /* complimentary, in words: the couple's own rooms, a named rate of USD 0, hosted nights */
  function compWords(h, x) {
    if (h && h.billingAdmin) return 'complimentary · the couple';
    var l = x && x.line; if (!l) return '';
    var n = (Number(l.complimentaryNights) || 0) + (Number(l.hostedNights) || 0);
    if (n) return n + ' night' + (n === 1 ? '' : 's') + ' complimentary';
    return l.amount && l.amount.cents === 0 ? 'complimentary' : '';
  }
  function roomStatus(x, h) { return h && h.billingAdmin ? 'the couple\'s own room' : x.line ? (x.line.statement ? 'invoiced' : 'confirmed') : 'held, not confirmed'; }
  function stayCell(h) {
    var idx = guestRooms();
    if (!idx) return S.revenuePhase === 'error' ? '<span class="ab-mute">rooms not readable just now</span>' : S.revenuePhase === 'ready' ? '<span class="ab-mute">rooms not available: ' + esc((S.revenue && S.revenue.budget && S.revenue.budget.gap) || 'the room plan could not be read') + '</span>' : '<span class="ab-mute">…</span>';
    var list = idx[h.guestId] || [];
    if (!list.length) return '<span class="ab-mute">no room</span>';
    return list.map(function (x) {
      /* the room of the house (Owners, 18 / 19 Nov 2026): the official number beside the allocation label, never in its place */
      var no = hotelWords(x.hotelRoom);
      var cw = compWords(h, x);
      return '<span class="ab-stay"><span class="ab-stay-h" data-i18n-skip>' + esc(x.place) + ' · ' + esc(dmy(x.from)) + ' – ' + esc(dmy(x.to)) + (x.nights ? ' · ' + x.nights + ' night' + (x.nights === 1 ? '' : 's') : '') + '</span>' +
        '<span data-i18n-skip>' + esc(x.type) + ' · Room ' + esc(x.label) + '</span>' + no + ' <span class="ab-mute">· ' + esc(roomStatus(x, h)) + '</span>' +
        (x.bed ? ' <span class="ab-chip">extra bed</span>' : '') + (cw ? ' <span class="ab-chip on">' + esc(cw) + '</span>' : '') + '</span>';
    }).join('');
  }
  /* THE HOTEL ROOM NUMBER of a unit, in words: " · hotel room 105 · building C" — a suite "suite 210 + 211"; nothing where none is assigned */
  function hotelWords(hr) {
    if (!hr) return '';
    return ' · ' + (hr.suite ? 'suite' : 'hotel room') + ' <b data-i18n-skip>' + esc(hr.display) + '</b> <span class="ab-mute" data-i18n-skip>· building ' + esc(hr.building) + '</span>';
  }
  /* THE COMPLETE GUEST LIST as CSV: one row per guest and stay (a guest without a room: one row); every figure the server's */
  var GL_HEAD = ['Guest ID', 'Guest', 'Invitation', 'Stay', 'Arrival', 'Departure', 'Nights', 'Room', 'Hotel room no.', 'Building', 'Room category',
    'Extra bed', 'Complimentary', 'Room amount USD', 'Room status', 'Booking stage', 'Confirmation', 'Statement', 'Statement no.', 'Issued', 'Due',
    'Statement total USD', 'Booked value USD', 'Paid USD', 'Outstanding USD', 'Payment status', 'Overdue', 'Review'];
  function guestCsvRows(list) {
    var idx = guestRooms() || {};
    var out = [];
    list.forEach(function (h) {
      var st = S.status[h.Holder_ID] || {}, s = h.settlement || {}, p = h.payment, g = stage(h), b = st.booked;
      var conf = CONF[st.confirmation && st.confirmation.state];
      var tail = [g ? g.words : '', conf ? conf[0] : (st.error ? 'not readable' : ''), stmtWords(h), s.Settlement_ID || '', s.issueDate || '', s.dueDate || '',
        s.issuedRevision ? Number(s.issuedTotal) : null, b && !b.error && b.selected ? Number(b.total) : null,
        p ? Number(p.ist) : null, p ? Math.max(0, Number(p.balance) || 0) : null, p ? (PAY[p.status] || p.status || '') : '', p && p.overdue ? 'yes' : '', review(h).join(' · ')];
      var head = [h.guestId || '', h.name ? h.name.full : '', h.Holder_ID];
      var rooms = idx[h.guestId] || [];
      /* the invitation's own figures stand on its first row only — a sum in Excel never counts them twice */
      var blank = tail.map(function (v) { return typeof v === 'number' ? null : v; });
      if (!rooms.length) out.push(head.concat(['', '', '', '', '', '', '', '', '', '', null, ''], tail));
      rooms.forEach(function (x, i) {
        out.push(head.concat([x.place, x.from || '', x.to || '', x.nights, x.label, x.hotelRoom ? x.hotelRoom.display : '', x.hotelRoom ? x.hotelRoom.building : '',
          x.type, x.bed ? 'yes' : '', compWords(h, x), x.line && x.line.amount ? num(x.line.amount) : null, roomStatus(x, h)], i === 0 ? tail : blank));
      });
    });
    return out;
  }
  function guestCsv(kind) {
    var o = S.overview, rows = o.holders.filter(function (h) { return kind === 'all' || (matches(h, S.filter) && searchHit(h, S.q)); });
    var label = kind === 'all' ? 'all guests' : 'filter "' + ((FILTERS.filter(function (f) { return f[0] === S.filter; })[0] || [])[1] || S.filter) + '"' + (S.q ? ', search "' + S.q + '"' : '');
    var R = S.revenue || {};
    return csvDoc('See You In Laos — Complete Guest List', [['Generated', nowStamp()], ['Guests', rows.length + ' of ' + o.holders.length + ' invitations in the register (' + label + ')'],
      ['Data as of', 'register ' + (o.asOf || '') + ' · rooms ' + (R.calculatedAt ? R.calculatedAt.slice(0, 16).replace('T', ' ') + ' UTC' : 'not loaded')], ['Currency', 'USD'],
      ['Rooms', guestRooms() ? 'read' : 'not available — ' + ((R.budget && R.budget.gap) || (S.revenuePhase === 'error' ? S.revenueError : 'not loaded yet'))],
      ['Basis', 'one row per guest and stay — the invitation\'s amounts (statement total, booked value, paid, outstanding) on its first row only; rooms: the Rooms engine (held, sent or confirmed); hotel room numbers: the Souphattra Heritage\'s official room list, assigned to its rooms by the Owners (a suite of two numbers is one room; other hotels have supplied no numbers); amounts: the Billing Engine and the issued statements']],
      GL_HEAD, guestCsvRows(rows));
  }
  function listView() {
    var o = S.overview, rows = o.holders;
    var counts = {}; FILTERS.forEach(function (f) { counts[f[0]] = rows.filter(function (h) { return matches(h, f[0]); }).length; });
    var shown = rows.filter(function (h) { return matches(h, S.filter) && searchHit(h, S.q); });
    var done = S.checked >= rows.length;
    var chips = FILTERS.map(function (f) {
      var partial = ((f[0] === 'review' || f[0] === 'booked' || f[0] === 'toConfirm') && !done);
      return '<button type="button" class="ab-filter' + (S.filter === f[0] ? ' on' : '') + '" data-ab-filter="' + f[0] + '" aria-pressed="' + (S.filter === f[0]) + '">' +
        esc(f[1]) + ' <span class="ab-n">' + counts[f[0]] + (partial ? '+' : '') + '</span></button>';
    }).join('');
    var progress = done ? '' : '<p class="t-b2 ab-progress" role="status">Checking confirmations and booked values · ' + S.checked + ' / ' + rows.length + '</p>';
    var idx = guestRooms(), withRoom = idx ? rows.filter(function (h) { return (idx[h.guestId] || []).length; }).length : null;
    var head = '<tr><th>Guest</th><th>Stays &amp; rooms</th><th>Guest Relations</th><th class="num">Booked value</th><th>Statement</th><th>Issued · due</th><th class="num">Statement total</th><th class="num">Paid</th><th class="num">Outstanding</th><th>Method</th><th>Review</th></tr>';
    var body = shown.map(function (h) {
      var s = h.settlement || {}, p = h.payment, rv = review(h);
      var out = p ? (p.overdue ? '<span class="ab-chip open">Overdue</span> ' : '') + '<span data-i18n-skip>' + esc(usd(Math.max(0, Number(p.balance) || 0))) + '</span>' : '<span class="ab-mute">—</span>';
      return '<tr data-ab-open="' + esc(h.Holder_ID) + '" tabindex="0">' +
        '<td data-l="Guest"><span class="ab-name">' + esc(h.name ? h.name.full : '(no 006 name)') + '</span><span class="ab-id">' + esc((h.guestId ? h.guestId + ' · ' : '') + h.Holder_ID) + (h.billingAdmin ? ' · admin' : '') + '</span></td>' +
        '<td data-l="Stays &amp; rooms">' + stayCell(h) + '</td>' +
        '<td data-l="Guest Relations">' + confChip(S.status[h.Holder_ID]) + (stage(h) ? '<br><span class="ab-mute" data-ab-stage="' + stage(h).key + '">' + esc(stage(h).words) + '</span>' : '') + readyWords(h) + '</td>' +
        '<td data-l="Booked value" class="num">' + bookedCell(h) + '</td>' +
        '<td data-l="Statement">' + esc(stmtWords(h)) + (s.Settlement_ID ? '<span class="ab-id" data-i18n-skip>' + esc(s.Settlement_ID) + '</span>' : '') + (p ? (s.Settlement_ID ? '' : '<br>') + '<span class="ab-mute">' + esc(PAY[p.status] || p.status || '') + (p.pendingCount ? ' · ' + p.pendingCount + ' reported' : '') + '</span>' : '') + '</td>' +
        '<td data-l="Issued · due">' + (s.issueDate ? esc(day(s.issueDate)) + '<br><span class="ab-mute">due ' + esc(day(s.dueDate)) + '</span>' : '<span class="ab-mute">—</span>') +
          (s.Settlement_ID && s.issuedRevision ? '<br><button type="button" class="p-link" data-ab-row-pdf="' + esc(h.Holder_ID) + '" data-ab-pdf-sid="' + esc(s.Settlement_ID) + '" data-ab-pdf-rev="' + esc(s.issuedRevision) + '">Download Original PDF · V' + esc(s.issuedRevision) + '</button>' : '') + '</td>' +
        '<td data-l="Statement total" class="num">' + totalCell(h) + '</td>' +
        '<td data-l="Paid" class="num">' + (p ? '<span data-i18n-skip>' + esc(usd(p.ist)) + '</span>' : '<span class="ab-mute">—</span>') + '</td>' +
        '<td data-l="Outstanding" class="num">' + out + '</td>' +
        '<td data-l="Method">' + methodWords(h) + '</td>' +
        '<td data-l="Review">' + (rv.length ? '<span class="ab-chip open">' + esc(rv.join(' · ')) + '</span>' : '<span class="ab-mute">—</span>') + '</td></tr>';
    }).join('');
    return '<section class="ab-sec" aria-label="Guests">' +
      '<div class="ab-tools"><label class="ab-search"><span class="t-l1">Search</span><input type="search" placeholder="Name, G… or INV-…" value="' + esc(S.q) + '" data-ab-q autocomplete="off"></label>' +
      '<div class="ab-filters" role="group" aria-label="Filter">' + chips + '</div></div>' + progress +
      exportBar([['guests-all', 'CSV · complete guest list (' + rows.length + ')'], ['guests-shown', 'CSV · this filter (' + shown.length + ')']]) +
      (S.download ? '<p class="t-b2 ab-msg" role="status">' + esc(S.download) + '</p>' : '') +
      (shown.length ? '<div class="ab-table-wrap"><table class="ab-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
        : '<p class="t-b1 ab-empty">No guest matches this filter.</p>') +
      '<p class="t-b2 ab-foot">' + shown.length + ' shown · ' + rows.length + ' invitations of the register (the couple included)' +
      (withRoom != null ? ' · ' + withRoom + ' with a room' : S.revenuePhase === 'loading' ? ' · reading the rooms…' : '') + ' · as of ' + esc(day(o.asOf)) + '<br>' +
      '<b>Stays &amp; rooms</b> — the room each guest holds (held, sent or confirmed), its hotel room number and building (the Souphattra Heritage\'s official room list, as you assigned it — a suite of two numbers is one room), extra bed and complimentary nights. ' +
      '<b>Booked value</b> — what the guest has selected now, priced by the Billing Engine now; it is not a statement and does not make anyone issuable. ' +
      '<b>Ready to issue</b> / <b>Blocked</b> — what Issue would say now for a confirmed booking (the same checks as Preview), never an issue. ' +
      '<b>Statement total</b>, <b>Paid</b> and <b>Outstanding</b> — the issued, immutable statement only. All in USD.</p></section>';
  }

  /* -------------------------------------------------------- the guest view */
  function linesTable(lines, withReview) {
    if (!lines || !lines.length) return '<p class="t-b2">No billable lines.</p>';
    return '<div class="ab-table-wrap"><table class="ab-table ab-lines"><thead><tr><th>Person</th><th>Item</th><th>Category</th><th class="num">Nights</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th><th>Block</th>' + (withReview ? '<th>Review</th>' : '') + '</tr></thead><tbody>' +
      lines.map(function (l) {
        return '<tr><td data-l="Person">' + esc(l.person || l.Person_ID || '—') + '</td><td data-l="Item"><span data-i18n-skip>' + esc(l.Item_ID || '—') + '</span>' + (l.Room_Unit_ID ? '<br><span class="ab-mute">' + esc(l.Room_Unit_ID) + '</span>' : '') + '</td>' +
          '<td data-l="Category">' + esc(l.Billing_Category || '—') + (l.hosted ? ' · hosted' : '') +
            (l.paidByHS ? '<br><span class="ab-mute" data-ab-paid>' + esc(l.paidNote || 'Haruthai has already paid this booking for the guest. It is repaid to Haruthai & Suthep through the settlement.') +
              ' · payable to H&amp;S</span>' : '') + '</td>' +
          '<td data-l="Nights" class="num">' + esc(l.payableNights != null ? l.payableNights : (l.nights != null ? l.nights : '—')) + '</td>' +
          '<td data-l="Qty" class="num">' + esc(l.quantity != null ? l.quantity : '—') + '</td>' +
          '<td data-l="Rate" class="num"><span data-i18n-skip>' + esc(l.rate != null ? usd(l.rate) : '—') + '</span></td>' +
          '<td data-l="Amount" class="num"><span data-i18n-skip>' + esc(l.amount != null ? usd(l.amount) : '—') + '</span></td>' +
          '<td data-l="Block">' + esc(l.block || '—') + '</td>' +
          (withReview ? '<td data-l="Review">' + (l.review ? '<span class="ab-chip open">' + esc(l.review) + '</span>' : '—') + '</td>' : '') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function pdOf(H) { return H && H.submission ? H.submission.priceDifference || null : null; }
  function kv(k, v) { return '<p class="t-b2 ab-kv"><span class="t-l1">' + esc(k) + '</span> <span>' + v + '</span></p>'; }
  function act(name, label, enabled, why, primary) {
    return '<div class="ab-act"><button type="button" class="' + (primary ? 'p-act' : 'p-act ab-ghost') + '" data-ab-act="' + name + '"' + (enabled ? '' : ' disabled') + '>' + esc(label) + '</button>' +
      (why ? '<p class="t-b2 ab-why">' + esc(why) + '</p>' : '') + '</div>';
  }
  /* WHO SLEEPS ON THE EXTRA BED (Owners, 17 Nov 2026): a room of this statement holding more persons than its places names the
     occupant the extra bed is recorded for; the Owners correct it here — nobody moves, only the attribution and so whose own
     009 rate prices the bed */
  function extraBedView() {
    var rooms = (S.holder && S.holder.extraBedRooms) || [];
    if (!rooms.length) return '';
    return '<div class="p-card ab-panel" data-ab-beds><p class="t-l1">Extra bed</p>' + rooms.map(function (r) {
      if (r.error) return '<p class="t-b2">The room list could not be read: ' + esc(r.error) + '</p>';
      var who = function (o) { return (o.name || o.guestId) + ' (' + o.guestId + ')'; };
      var cur = r.occupants.filter(function (o) { return o.bed; })[0];
      return '<p class="t-b2">Room ' + esc(r.label) + ' · <span data-i18n-skip>' + esc(r.itemId) + '</span> holds ' + esc(r.inRoom) + ' for its ' + esc(r.places) + ' places. ' +
        'The extra bed is recorded for <b>' + esc(cur ? who(cur) : 'nobody yet') + '</b> — the person priced by their own 009 row for it.</p>' +
        '<div class="ab-actions"><label class="t-b2">Extra bed for<br><select data-ab-bed-who="' + esc(r.key + '|' + r.label) + '">' + r.occupants.map(function (o) {
          return '<option value="' + esc(o.guestId) + '"' + (o.bed ? ' selected' : '') + '>' + esc(who(o)) + '</option>'; }).join('') + '</select></label>' +
        '<div class="ab-act"><button type="button" class="p-act ab-ghost" data-ab-bed-set="' + esc(r.key + '|' + r.label) + '"' + (S.bedBusy ? ' disabled' : '') + '>Record</button></div></div>';
    }).join('') + (S.bedMsg ? '<p class="t-b2" role="status">' + esc(S.bedMsg) + '</p>' : '') + '</div>';
  }
  function holderView() {
    if (S.holderPhase === 'loading' || S.holderPhase === 'idle') return '<p class="t-b2 ab-progress" role="status">Reading this guest: the submitted booking and its confirmation, the engine\'s preview, the statement and the payments…</p>';
    if (S.holderPhase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(S.holderError) + '</p><div class="p-actions"><button type="button" class="p-link" data-ab-reload>Try again</button></div></div>';
    var H = S.holder, g = H.guest || {}, pv = H.preview || {}, iss = H.issued, conf = H.confirmation || {};
    /* the submitted booking and its confirmation, as the server read them for Confirm booking */
    var sub = H.submission || { state: conf.state, confirmedAt: conf.confirmedAt, confirmedVersion: conf.version };
    var c = CONF[sub.state] || [sub.state || '—', ''];
    var canConfirm = !!H.submission && (sub.state === 'UNCONFIRMED' || sub.state === 'LAPSED');
    var name = g.name ? g.name.full : (g.contactName || '(no 006 name)');
    var emailLine = g.email ? '<span data-i18n-skip>' + esc(g.email) + '</span> <span class="ab-mute">· ' + esc(g.emailSource === 'CONTACT' ? 'contact on file' : 'from the trip they sent') + '</span>' : '<span class="ab-chip open">Email unavailable</span>';
    var sendWhy = !iss ? 'Only an issued statement can be sent.' : !g.email ? 'Email unavailable — the guest has no reliable e-mail on file.' : '';
    var issueWhy = pv.issuable ? (S.panel === 'preview' ? '' : 'Open the preview first.') : (pv.reasons && pv.reasons.length ? reasonWords(pv.reasons[0]) : 'Not issuable.');
    var actions = '<div class="ab-actions">' +
      act('preview', 'Preview', true, '', S.panel !== 'preview') +
      act('confirm', 'Confirm booking', canConfirm && S.panel !== 'confirm', confirmWhy(sub), canConfirm && S.panel !== 'confirm') +
      act('issue', iss ? 'Issue new revision' : 'Issue statement', !!pv.issuable && S.panel === 'preview', issueWhy, S.panel === 'preview') +
      act('view', 'View statement', !!iss, iss ? '' : 'Not issued yet.') +
      act('download', 'Download Original PDF', !!iss, iss ? 'the issued version, exactly as the guest receives it' : 'Not issued yet.') +
      act('send', 'Send statement', !!(iss && g.email), sendWhy) + '</div>' +
      (S.download ? '<p class="t-b2" role="status">' + esc(S.download) + '</p>' : '');
    var head = '<div class="p-card ab-guest"><p class="t-l1"><a href="/admin/billing#guests" class="ab-back" data-ab-back>← All guests</a></p>' +
      '<h2 class="t-d1 ab-h">' + esc(name) + '</h2>' +
      '<div class="ab-grid2">' +
      kv('Holder', '<span data-i18n-skip>' + esc(H.Holder_ID) + '</span> · ' + esc(g.guestId || '') + (g.hosts ? ' · host' : '')) +
      kv('Guest Relations', '<span class="ab-chip ' + c[1] + '">' + esc(c[0]) + '</span>' +
        (sub.state === 'CONFIRMED' && sub.confirmedAt ? ' <span class="ab-mute">' + (sub.confirmedVersion ? 'version ' + esc(sub.confirmedVersion) + ' · ' : '') + esc(day(sub.confirmedAt)) + (H.submission ? ' · by ' + esc(confirmedBy(sub)) : '') + '</span>'
          : sub.submitted && sub.sentAt ? ' <span class="ab-mute">version ' + esc(sub.version) + ' sent ' + esc(when(sub.sentAt)) + '</span>' : '')) +
      kv('E-mail', emailLine) +
      kv('Payment method', H.method && H.method.channel ? esc(METHOD[H.method.channel] || H.method.channel) + (H.method.locked ? ' · fixed' : '') : '<span class="ab-chip open">To state: ' + esc(H.method && H.method.reason || 'undetermined') + '</span>') +
      kv('Booked value', !H.booked ? '—' : H.booked.error ? '<span class="ab-chip open">not readable</span>'
        : (H.booked.source === 'NONE' || !H.booked.selected) ? 'Nothing selected'
        : '<b data-i18n-skip>' + esc(usd(H.booked.total)) + '</b>' + (H.booked.onRequest ? ' <span class="ab-mute">+ ' + esc(H.booked.onRequest) + ' on request</span>' : '') +
          ' <span class="ab-mute">· ' + esc(BOOKED_FROM[H.booked.source] || '') + ', not a statement</span>') +
      kv('Statement', iss ? esc(iss.Settlement_ID + ' · version ' + iss.revision + ' · issued ' + day(iss.issueDate) + ' · due ' + day(iss.dueDate)) : 'Not issued') +
      kv('Statement total', iss ? '<b data-i18n-skip>' + esc(usd(iss.total)) + '</b>' : '—') +
      '</div>' + actions + (S.msg ? '<p class="t-b1 ab-msg" role="status">' + S.msg + '</p>' : '') + '</div>';
    /* an open panel (preview, confirm, issue, view, send) sits right under the actions that opened it */
    return head + panelView() + extraBedView() + ownerView() + bookedView() + paymentsView() + mailView();
  }
  /* THE REAL UNITS (Owner, 15 Nov 2026): the units of the chosen room product with their free places now — a unit another guest
     holds a place in is shown as such and cannot be reserved; a product without units takes no room */
  function unitPicker(O, f) {
    var item = (O.choices && O.choices.items || []).filter(function (i) { return i.itemId === f.itemId; })[0];
    var units = item && item.key && O.units && O.units[item.key];
    if (!item) return '<label class="t-b2">Room<br><span class="ab-mute">Choose a product first.</span></label>';
    if (!units || !units.length) return '<label class="t-b2">Room<br><span class="ab-mute">This product takes no room unit.</span></label>';
    /* "our" persons: the paying guest, the persons already recorded and the one being added — a place one of them holds is not
       another guest's (the confirmation checks the same and holds the rest) */
    var mine = {}; (O.entries || []).forEach(function (e) { mine[e.personId] = true; });
    if (O.payerGuestId) mine[O.payerGuestId] = true;
    if (f.personId) mine[f.personId] = true;
    return '<label class="t-b2">Room unit (the website\'s own, with its free places now)<br><select data-ob-f="room"><option value="">No room</option>' +
      units.map(function (u) {
        var others = u.holders.filter(function (g) { return !mine[g]; }).length + u.kept;
        var ours = u.holders.filter(function (g) { return mine[g]; }).length;
        var words = 'Room ' + u.label + ' · ' + (others ? 'held by another guest' : u.free === u.places ? 'free' : u.free + ' of ' + u.places + ' places free' + (ours ? ' · ' + ours + ' held by this booking\'s guests' : ''));
        /* a room with an extra bed (Owner, 17 Nov 2026) says whether the bed is still free: in use once the room holds more than its places */
        if (u.extraBeds && !others) words += ' · extra bed ' + (u.holders.length + u.kept > u.places ? 'taken' : 'free');
        return '<option value="' + esc(u.label) + '"' + (f.room === u.label ? ' selected' : '') + (others ? ' disabled' : '') + '>' + esc(words) + '</option>';
      }).join('') + '</select></label>';
  }
  function ownerView() {
    if (S.ownerError) return '<div class="p-card ab-panel"><p class="t-l1">Recorded by Haruthai &amp; Suthep</p><p class="t-b2">' + esc(S.ownerError) + '</p></div>';
    var O = S.owner;
    if (!O) return '';
    var f = S.obForm || (S.obForm = { personId: '', itemId: '', room: '', extraBed: false, note: '' });
    var chip = O.state === 'CONFIRMED' ? '<span class="ab-chip ok">Confirmed</span>' + (O.confirmed ? ' <span class="ab-mute">by ' + esc(WHO[O.confirmed.by] || O.confirmed.by) + ' · ' + esc(when(O.confirmed.at)) + '</span>' : '')
      : O.state === 'RECORDED' ? '<span class="ab-chip open">Recorded — not confirmed</span>' : '<span class="ab-mute">Nothing recorded</span>';
    var rows = (O.entries || []).map(function (e) {
      var l = e.line || {};
      return '<tr><td data-l="Person">' + esc(e.person) + '<br><span class="ab-mute" data-i18n-skip>' + esc(e.personId) + '</span>' + (e.note ? '<br><span class="ab-mute">' + esc(e.note) + '</span>' : '') + '</td>' +
        '<td data-l="Item"><span data-i18n-skip>' + esc(e.itemId) + '</span></td>' +
        '<td data-l="Room">' + esc(e.room || '—') + (e.extraBed ? ' · extra bed' : '') + (e.held ? '<br><span class="ab-mute">reserved in the website\'s rooms</span>' : (e.room ? '<br><span class="ab-mute">reserved when confirmed</span>' : '')) + '</td>' +
        '<td data-l="Rate" class="num"><span data-i18n-skip>' + esc(l.rate != null ? usd(l.rate) : '—') + '</span><br><span class="ab-mute">' + esc(l.rateSource === 'SPECIAL_RATE' ? 'named rate (009)' : l.rateSource === 'STANDARD_RATE' ? 'standard rate (002)' : (l.rateSource || l.review || '—')) + '</span></td>' +
        '<td data-l="Nights" class="num">' + esc(l.payableNights != null ? l.payableNights + (l.nights != null ? ' of ' + l.nights : '') : (l.nights != null ? l.nights : '—')) + '</td>' +
        '<td data-l="Amount" class="num"><span data-i18n-skip>' + esc(l.amount != null ? usd(l.amount) : '—') + '</span>' + (l.review ? '<br><span class="ab-chip open">' + esc(l.review) + '</span>' : '') + '</td>' +
        '<td data-l=""><button type="button" class="p-link" data-ob-remove="' + esc(e.id) + '"' + (S.ownerBusy ? ' disabled' : '') + '>Remove</button></td></tr>';
    }).join('');
    /* each room's own subtotal: the engine's amounts of the persons recorded in it */
    var roomSum = {};
    (O.entries || []).forEach(function (e) { if (e.room && e.line && e.line.amount != null) { var k = e.itemId + '|' + e.room; roomSum[k] = (roomSum[k] || 0) + Math.round(e.line.amount * 100); } });
    var rooms = (O.rooms || []).map(function (r) {
      return '<li data-ob-room>' + esc(r.itemId) + ' · room ' + esc(r.room) + ': ' + esc(r.names.join(', ')) + ' — ' + esc(r.occupants) + ' ' + (r.occupants === 1 ? 'person' : 'persons') + (r.maxPax ? ' · ' + esc(r.maxPax) + ' places' : '') + (r.extraBeds ? ' + ' + esc(r.extraBeds) + ' extra bed' : '') +
        (roomSum[r.itemId + '|' + r.room] != null ? ' · <b data-i18n-skip>' + esc(usd(roomSum[r.itemId + '|' + r.room] / 100)) + '</b>' : '') +
        (r.overCapacity ? ' <span class="ab-chip open">over capacity</span>' : '') + '</li>';
    }).join('');
    var persons = (O.choices && O.choices.persons || []).map(function (p) { return '<option value="' + esc(p.guestId) + '"' + (f.personId === p.guestId ? ' selected' : '') + '>' + esc(p.name + ' · ' + p.guestId) + '</option>'; }).join('');
    var items = (O.choices && O.choices.items || []).map(function (i) { return '<option value="' + esc(i.itemId) + '"' + (f.itemId === i.itemId ? ' selected' : '') + '>' + esc(i.itemId + (i.rate != null ? ' · ' + usd(i.rate) + ' standard' : '')) + '</option>'; }).join('');
    var canConfirm = O.state === 'RECORDED' && !(O.problems || []).length && !S.ownerBusy;
    return '<section class="p-card ab-panel" aria-label="Recorded by Haruthai and Suthep" data-ob>' +
      '<p class="t-l1">Recorded by Haruthai &amp; Suthep</p>' +
      '<p class="t-b2">Bookings the Owners make for this paying invitation — a family\'s rooms, a guest who did not book on the site. Priced by the engine from Google (the standard rate, or the person\'s named rate for this payer). They join the statement only once confirmed here; nothing is issued or sent from this panel.</p>' +
      '<p class="t-b2">' + chip + '</p>' +
      ((O.problems || []).length ? '<ul class="t-b2 ab-why">' + O.problems.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') +
      (rows ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Person</th><th>Product</th><th>Room</th><th class="num">Rate</th><th class="num">Nights charged</th><th class="num">Amount</th><th></th></tr></thead><tbody>' + rows +
        '<tr><td colspan="5"><b>Total of these bookings</b></td><td class="num"><b data-i18n-skip>' + esc(O.total != null ? usd(O.total) : '—') + '</b></td><td></td></tr></tbody></table></div>' : '') +
      (rooms ? '<p class="t-l1">Rooms</p><ul class="t-b2">' + rooms + '</ul>' +
        (Object.keys(roomSum).length > 1 ? '<p class="t-b2" data-ob-rooms-total>Rooms together: <b data-i18n-skip>' + esc(usd(Object.keys(roomSum).reduce(function (t, k) { return t + roomSum[k]; }, 0) / 100)) + '</b></p>' : '') : '') +
      '<div class="ab-grid2 ab-ob-form">' +
      '<label class="t-b2">Person<br><select data-ob-f="personId"><option value="">Choose a guest…</option>' + persons + '</select></label>' +
      '<label class="t-b2">Product (002)<br><select data-ob-f="itemId"><option value="">Choose a product…</option>' + items + '</select></label>' +
      unitPicker(O, f) +
      '<label class="t-b2"><input type="checkbox" data-ob-f="extraBed"' + (f.extraBed ? ' checked' : '') + '> Extra bed (priced only by this person\'s own 009 row)</label>' +
      '<label class="t-b2">Note (for you only)<br><input type="text" maxlength="200" data-ob-f="note" value="' + esc(f.note) + '"></label>' +
      '</div>' +
      '<div class="ab-actions"><div class="ab-act"><button type="button" class="p-act ab-ghost" data-ob-add' + (f.personId && f.itemId && !S.ownerBusy ? '' : ' disabled') + '>Add booking</button></div>' +
      '<div class="ab-act"><button type="button" class="p-act" data-ob-confirm' + (canConfirm ? '' : ' disabled') + '>Confirm these bookings</button>' +
      (O.state === 'RECORDED' && (O.problems || []).length ? '<p class="t-b2 ab-why">Resolve the points above first.</p>' : '') + '</div></div>' +
      (S.ownerMsg ? '<p class="t-b1 ab-msg" role="status">' + esc(S.ownerMsg) + '</p>' : '') + '</section>';
  }
  /* why Confirm booking is (not) offered — said to the BILLING_ADMINs, who confirm themselves */
  function confirmWhy(sub) {
    if (sub.state === 'UNCONFIRMED') return WAITING;
    if (sub.state === 'LAPSED') return 'The guest sent version ' + (sub.version || '?') + ' after the confirmation. ' + WAITING;
    if (sub.state === 'CONFIRMED') return 'Confirmed' + (sub.confirmedVersion ? ' · version ' + sub.confirmedVersion : '') + (sub.confirmedAt ? ' · ' + day(sub.confirmedAt) : '') + (S.holder && S.holder.submission ? ' · by ' + confirmedBy(sub) : '') + '.';
    if (sub.state === 'NONE') return NOT_SUBMITTED;
    if (sub.state === 'UNREADABLE') return 'The submitted booking cannot be read — nothing can be confirmed' + (sub.error ? ': ' + sub.error : '.');
    return '';
  }
  /* BOOKED VALUE in full — the lines behind the amount; separate from the statement and from whether it may be issued */
  function bookedView() {
    var b = S.holder.booked;
    if (!b) return '';
    if (b.error) return '<section class="p-card ab-panel" aria-label="Booked value"><p class="t-l1">Booked value</p><p class="t-b1 ab-err">The current selection cannot be read just now: ' + esc(b.error) + '</p></section>';
    var src = b.source === 'CURRENT_SELECTION' ? 'The guest\'s current selection' + (b.updatedAt ? ', saved ' + when(b.updatedAt) : '')
      : b.source === 'SENT_VERSION' ? 'The version the guest sent' + (b.updatedAt ? ' on ' + when(b.updatedAt) : '') : 'Nothing selected';
    var sent = b.sent ? '<p class="t-b2">' + (b.sent.differs
      ? 'The submitted version (V' + esc(b.sent.version) + ', ' + esc(when(b.sent.lastSentAt)) + ') is worth <b data-i18n-skip>' + esc(usd(b.sent.total)) + '</b> — the guest has changed the selection since.'
      : 'Submitted as it stands (V' + esc(b.sent.version) + ', ' + esc(when(b.sent.lastSentAt)) + ').') + '</p>' : '';
    return '<section class="p-card ab-panel" aria-label="Booked value"><p class="t-l1">Booked value · ' + esc(b.source === 'SENT_VERSION' ? 'the version sent' : 'the current selection') + ', not a statement</p>' +
      '<h3 class="t-h1" data-i18n-skip>' + esc(b.source === 'NONE' || !b.selected ? 'Nothing selected' : usd(b.total)) + '</h3>' +
      (b.onRequest ? '<p class="t-b2 ab-why">+ ' + esc(b.onRequest) + ' selected line' + (b.onRequest > 1 ? 's' : '') + ' without an amount yet (on request / to review): ' + esc((b.reviewReasons || []).join(', ')) + '</p>' : '') +
      '<p class="t-b2">' + esc(src) + ' — priced by the Billing Engine on today\'s source. It is not a statement, nothing is stored or issued from it, and it does not make the guest issuable: a statement is built only from the submitted booking, once it is confirmed.</p>' + sent +
      (b.items && b.items.length ? linesTable(b.items, true) : '') +
      (b.blockB && b.blockB.length ? '<p class="t-l1">Block B · settled with the provider, never in the booked value</p>' + linesTable(b.blockB, false) : '') +
      (b.unmapped && b.unmapped.length ? '<p class="t-b2 ab-why">Selected products without an 002 item: ' + esc(b.unmapped.join(', ')) + '</p>' : '') + '</section>';
  }
  function previewView() {
    var H = S.holder, pv = H.preview || {};
    var reasons = (pv.reasons || []).map(function (r) { var w = reasonWords(r); return '<li>' + esc(w) + (w !== r ? ' <span class="ab-mute" data-i18n-skip>' + esc(String(r).split(' — ')[0]) + '</span>' : '') + '</li>'; }).join('');
    return '<section class="p-card ab-panel" aria-label="Statement preview"><p class="t-l1">Statement preview · what Issue would freeze now: the confirmed submitted booking · nothing is issued</p>' +
      '<h3 class="t-h1">' + esc(usd(pv.total)) + '</h3>' +
      '<div class="ab-grid2">' + kv('Issue date if issued now', esc(day(pv.issueDate))) + kv('Due date', esc(day(pv.dueDate))) +
      kv('In the payment currency', pv.inCurrency ? '<span data-i18n-skip>' + esc(money(pv.inCurrency.currency, pv.inCurrency.amount)) + '</span> <span class="ab-mute">at ' + esc(pv.inCurrency.rate) + '</span>' : '—') +
      kv('Hosted value', '<span data-i18n-skip>' + esc(usd(pv.hostedValue)) + '</span> <span class="ab-mute">· informational</span>') + '</div>' +
      linesTable(pv.lines, true) +
      (pv.blockB && pv.blockB.length ? '<p class="t-l1">Block B · informational, never in the total</p>' + linesTable(pv.blockB, false) : '') +
      (pv.manualReview && pv.manualReview.length ? '<p class="t-b2 ab-why">Manual review: ' + esc(pv.manualReview.join(', ')) + '</p>' : '') +
      (pv.unmapped && pv.unmapped.length ? '<p class="t-b2 ab-why">Products without an 002 item: ' + esc(pv.unmapped.join(', ')) + '</p>' : '') +
      (pv.issuable ? '<p class="t-b2 ab-ok">The server would issue exactly this statement now.</p>' : '<p class="t-l1 open">Not issuable now</p><ul class="t-b2 ab-reasons">' + reasons + '</ul>') +
      '</section>';
  }
  /* AS SENT, AND TODAY (Owner, 8 Oct 2026): what the guest was sent beside the Billing Engine today — shown before Confirm and
     Issue; a material difference needs its own tick, and the server needs its digest. Nothing the guest received is changed. */
  var OUTCOME_WORDS = { MATCH: 'same', DIFFERENT: 'different', PAYER_CHANGED: 'payer changed', NOT_COMPARABLE: 'not comparable' };
  function cents(c) { return c == null ? '—' : usd(c / 100); }
  function priceBlock(pd) {
    if (!pd || !pd.lines || !pd.lines.length) return '';
    var rows = pd.lines.map(function (l) {
      /* data-l: the column's name on each cell, so the stacked phone layout still says which amount is which */
      return '<tr' + (l.outcome === 'DIFFERENT' || l.outcome === 'PAYER_CHANGED' ? ' class="ab-diff"' : '') + '><td data-l="Item">' + esc(l.key || l.Item_ID || '—') + '</td><td data-l="As sent to the guest" data-i18n-skip>' + esc(cents(l.stated)) +
        (l.sentPaidByHS ? ' <span class="ab-mute">paid by H&amp;S</span>' : '') + '</td><td data-l="Billing Engine today" data-i18n-skip>' + esc(cents(l.engine)) + (l.enginePaidByHS ? ' <span class="ab-mute">paid by H&amp;S</span>' : '') +
        '</td><td data-l="Compared">' + esc(OUTCOME_WORDS[l.outcome] || l.outcome) + '</td></tr>';
    }).join('');
    return '<div class="' + (pd.material ? 'ab-warn' : 'ab-note') + '" role="note" data-ab-price-difference="' + (pd.material ? 'material' : 'none') + '"><p class="t-l1">' +
      (pd.material ? 'The amounts this guest was sent differ from today\'s Billing Engine' : 'The amounts this guest was sent match today\'s Billing Engine') + '</p>' +
      '<table class="ab-table t-b2"><thead><tr><th>Item</th><th>As sent to the guest</th><th>Billing Engine today</th><th>Compared</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      (pd.material ? '<p class="t-b2">The statement uses today\'s amounts. The trip e-mail the guest received is not changed — tell the guest if needed.</p>' : '') + '</div>';
  }
  function pricesTick(on, busy, attr) {
    return '<label class="p-check t-b2"><input type="checkbox" ' + attr + (on ? ' checked' : '') + (busy ? ' disabled' : '') + '><span>I have seen that the amounts sent to the guest differ from today\'s.</span></label>';
  }
  function issuePanel() {
    var H = S.holder, pv = H.preview || {}, I = S.issue || {};
    if (I.done) return '<section class="p-card ab-panel ab-confirm" aria-label="Issued"><p class="t-l1 on">Issued</p><p class="t-b1">' + esc(I.done) + '</p></section>';
    var g = H.guest || {};
    return '<section class="p-card ab-panel ab-confirm" aria-label="Issue statement"><p class="t-l1 open">Issue statement · final</p>' +
      '<p class="t-b1">You are issuing the statement for <b>' + esc(g.name ? g.name.full : H.Holder_ID) + '</b>: <b data-i18n-skip>' + esc(usd(pv.total)) + '</b>, due <b>' + esc(day(pv.dueDate)) + '</b>, payable by ' + esc(METHOD[H.method && H.method.channel] || '—') + '.</p>' +
      '<p class="t-b2">An issued revision is immutable. The guest sees it in My Profile at once; nothing is e-mailed until you send it.</p>' +
      priceBlock(pdOf(H)) + (pdOf(H) && pdOf(H).material ? pricesTick(I.prices, I.busy, 'data-ab-issue-prices') : '') +
      '<label class="p-check t-b2"><input type="checkbox" data-ab-issue-check' + (I.checked ? ' checked' : '') + (I.busy ? ' disabled' : '') + '><span>I have checked the preview above and want to issue it.</span></label>' +
      '<div class="p-actions"><button type="button" class="p-act" data-ab-issue-go' + (I.checked && (!(pdOf(H) && pdOf(H).material) || I.prices) && !I.busy ? '' : ' disabled') + '>' + (I.busy ? 'Issuing…' : 'Issue statement now') + '</button>' +
      '<button type="button" class="p-link mute" data-ab-close' + (I.busy ? ' disabled' : '') + '>Cancel</button></div>' +
      (I.error ? '<p class="t-b1 ab-err" role="alert">' + esc(I.error) + '</p>' : '') + '</section>';
  }
  function viewPanel() {
    var x = S.holder.issued;
    if (!x) return '';
    var revs = (S.holder.settlement && S.holder.settlement.revisions) || [];
    return '<section class="p-card ab-panel" aria-label="Issued statement"><p class="t-l1 on">The issued statement · immutable</p>' +
      '<h3 class="t-h1"><span data-i18n-skip>' + esc(x.Settlement_ID) + '</span> · version ' + esc(x.revision) + '</h3>' +
      '<div class="ab-grid2">' + kv('Issued', esc(day(x.issueDate))) + kv('Due', esc(day(x.dueDate))) + kv('Total', '<b data-i18n-skip>' + esc(usd(x.total)) + '</b>') +
      kv('In ' + (x.currency || '—'), x.inCurrency ? '<span data-i18n-skip>' + esc(money(x.inCurrency.currency, x.inCurrency.amount)) + '</span>' : '—') +
      kv('Method', esc(METHOD[x.method] || x.method || '—') + (x.recipient ? ' → ' + esc(x.recipient) : '')) +
      kv('Frozen FX', '<span data-i18n-skip>1 USD = ' + esc(x.fx.FX_USD_EUR) + ' EUR · ' + esc(x.fx.FX_USD_THB) + ' THB</span>') +
      kv('Hosted value', '<span data-i18n-skip>' + esc(usd(x.hostedValue)) + '</span>') + kv('Engine', esc(x.engineVersion || '—')) + '</div>' +
      linesTable(x.lines, false) +
      (revs.length ? '<p class="t-l1">Statement versions · each the original PDF the guest received</p><ul class="t-b2 ab-revs" data-ab-versions>' + revs.map(function (r) {
        var issued = r.Revision_State === 'ISSUED' || r.Revision_State === 'SUPERSEDED';
        var made = r.pdf ? (r.pdf.produced ? ' · original produced (' + esc(String(r.pdf.writer || '').replace('guest-settlement-pdf/', 'layout ')) + ')' : ' · not produced yet (produced on first download, layout 1.2)') : '';
        return '<li>V' + esc(r.Revision) + ' · ' + esc(r.Revision_State === 'ISSUED' ? 'current' : r.Revision_State === 'SUPERSEDED' ? 'superseded (historical original)' : r.Revision_State) + (r.total != null ? ' · ' + esc(usd(r.total)) : '') +
          (r.Issue_Date ? ' · issued ' + esc(day(r.Issue_Date)) : r.issuedAt ? ' · issued ' + esc(when(r.issuedAt)) : '') + (r.Due_Date ? ' · due ' + esc(day(r.Due_Date)) : '') + (r.issuedBy ? ' · by ' + esc(r.issuedBy) : '') + made +
          (issued ? ' · <button type="button" class="p-link" data-ab-pdf="' + esc(r.Revision) + '" data-ab-pdf-sid="' + esc(x.Settlement_ID) + '">Download Original PDF · V' + esc(r.Revision) + '</button>' : '') + '</li>';
      }).join('') + '</ul>' : '') + '</section>';
  }
  /* CONFIRM BOOKING — the submitted version, shown in full before anything is confirmed */
  function confirmPanel() {
    var C = S.confirm || {}, H = S.holder, g = H.guest || {};
    if (C.phase === 'loading') return '<section class="p-card ab-panel"><p class="t-b2" role="status">Reading the submitted booking…</p></section>';
    if (C.phase === 'error') return '<section class="p-card ab-panel ab-confirm" aria-label="Confirm booking"><p class="t-l1 open">Confirm booking</p><p class="t-b1 ab-err">' + esc(C.error) + '</p>' +
      '<div class="p-actions"><button type="button" class="p-link mute" data-ab-close>Close</button></div></section>';
    if (C.done) return '<section class="p-card ab-panel ab-confirm" aria-label="Booking confirmed"><p class="t-l1 on">Booking confirmed</p><p class="t-b1">' + esc(C.done) + '</p></section>';
    var x = C.ctx || {};
    var name = (x.name && x.name.full) || (g.name && g.name.full) || H.Holder_ID;
    if (!x.submitted) return '<section class="p-card ab-panel ab-confirm" aria-label="Confirm booking"><p class="t-l1">Confirm booking</p><p class="t-b1">' + esc(NOT_SUBMITTED) + '</p><p class="t-b2">Nothing can be confirmed until they send it. The Booked value above is their current selection.</p></section>';
    if (!x.canConfirm) return '<section class="p-card ab-panel ab-confirm" aria-label="Confirm booking"><p class="t-l1 on">Confirmed</p><p class="t-b1">' + esc(confirmWhy(Object.assign({ state: x.state }, x.confirmation || {}))) + '</p></section>';
    var snap = x.snapshot || {}, sent = x.sent || {}, cur = x.current || {}, after = x.afterConfirm;
    var v = 'version ' + snap.version;
    var needAck = cur.changed !== false;
    var changed = cur.changed
      ? '<div class="ab-warn" role="note"><p class="t-l1">Current selection has changed since submission</p><div class="ab-grid2">' +
        kv('Submitted · ' + v, '<b data-i18n-skip>' + esc(usd(sent.total)) + '</b>' + (sent.onRequest ? ' <span class="ab-mute">+ ' + esc(sent.onRequest) + ' on request</span>' : '')) +
        kv('Current selection · Booked value', '<b data-i18n-skip>' + esc(usd(cur.total)) + '</b>' + (cur.onRequest ? ' <span class="ab-mute">+ ' + esc(cur.onRequest) + ' on request</span>' : '') + (cur.updatedAt ? ' <span class="ab-mute">· saved ' + esc(when(cur.updatedAt)) + '</span>' : '')) + '</div>' +
        '<p class="t-b2">You confirm the submitted ' + esc(v) + ' only. The newer selection is not confirmed and is never billed until the guest sends it and it is confirmed.</p></div>'
      : cur.changed === null ? '<div class="ab-warn" role="note"><p class="t-l1">The current selection cannot be read just now</p><p class="t-b2">It may differ from the submitted version. You confirm the submitted ' + esc(v) + ' only.</p></div>' : '';
    var next = !after ? '' : after.error ? '<p class="t-b2 ab-why">After confirmation: the statement cannot be calculated just now — ' + esc(after.error) + '</p>'
      : after.issuable ? '<p class="t-b2 ab-ok">After confirmation, Issue statement becomes available: the statement preview would be <b data-i18n-skip>' + esc(usd(after.total)) + '</b>' + (after.dueDate ? ', due ' + esc(day(after.dueDate)) : '') + '. Nothing is issued until you issue it.</p>'
      : '<p class="t-b2">After confirmation, Issue statement still waits for:</p><ul class="t-b2 ab-reasons">' + (after.reasons || []).map(function (r) { return '<li>' + esc(reasonWords(r)) + '</li>'; }).join('') + '</ul>';
    var pd = x.priceDifference, needPrices = !!(pd && pd.material);
    var ok = C.checked && (!needAck || C.ack) && (!needPrices || C.prices) && !C.busy;
    return '<section class="p-card ab-panel ab-confirm" aria-label="Confirm booking"><p class="t-l1 open">Confirm booking · the submitted version</p>' +
      '<div class="ab-grid2">' + kv('Guest', '<b>' + esc(name) + '</b>') + kv('Submitted', esc(v) + ' · sent ' + esc(when(snap.sentAt))) +
      kv('Submitted booking value', '<b data-i18n-skip>' + esc(usd(sent.total)) + '</b>' + (sent.onRequest ? ' <span class="ab-mute">+ ' + esc(sent.onRequest) + ' on request</span>' : '')) +
      kv('Payable lines', esc(sent.payableLines != null ? sent.payableLines : '—') + (sent.providerSettled ? ' <span class="ab-mute">· ' + esc(sent.providerSettled) + ' settled with the provider</span>' : '')) + '</div>' +
      '<p class="t-b1">This confirms exactly the version the guest submitted — ' + esc(v) + ', sent ' + esc(when(snap.sentAt)) + ' — and nothing else. It counts as Guest Relations\' confirmation for billing. Nothing is issued and nothing is e-mailed.</p>' +
      changed + priceBlock(pd) + next +
      (needPrices ? pricesTick(C.prices, C.busy, 'data-ab-confirm-prices') : '') +
      (needAck ? '<label class="p-check t-b2"><input type="checkbox" data-ab-confirm-ack' + (C.ack ? ' checked' : '') + (C.busy ? ' disabled' : '') + '><span>I confirm the submitted ' + esc(v) + ', not the current selection.</span></label>' : '') +
      '<label class="p-check t-b2"><input type="checkbox" data-ab-confirm-check' + (C.checked ? ' checked' : '') + (C.busy ? ' disabled' : '') + '><span>I have checked the submitted booking and confirm it.</span></label>' +
      '<div class="p-actions"><button type="button" class="p-act" data-ab-confirm-go' + (ok ? '' : ' disabled') + '>' + (C.busy ? 'Confirming…' : 'Confirm booking now') + '</button>' +
      '<button type="button" class="p-link mute" data-ab-close' + (C.busy ? ' disabled' : '') + '>Cancel</button></div>' +
      (C.error ? '<p class="t-b1 ab-err" role="alert">' + esc(C.error) + '</p>' : '') + '</section>';
  }
  function sendPanel() {
    var D = S.send || {};
    if (D.phase === 'loading') return '<section class="p-card ab-panel"><p class="t-b2" role="status">Reading the recipient and the statement…</p></section>';
    if (D.phase === 'error') return '<section class="p-card ab-panel"><p class="t-b1 ab-err">' + esc(D.error) + '</p></section>';
    var c = D.ctx || {};
    if (!c.issued) return '<section class="p-card ab-panel"><p class="t-b1">Only an issued statement can be sent.</p></section>';
    var reached = (c.attempts || []).filter(function (a) { return a.outcome === 'SENT' || a.outcome === 'UNCERTAIN'; });
    var log = (c.attempts || []).map(function (a) {
      return '<li>' + esc(when(a.recordedAt || a.claimedAt)) + ' · ' + esc(a.outcome) + ' · ' + esc(a.to || '') + (a.by ? ' · ' + esc(a.by) : '') + (a.error ? ' · ' + esc(a.error) : '') + '</li>';
    }).join('');
    if (D.result) {
      return '<section class="p-card ab-panel ab-confirm" aria-label="Send statement"><p class="t-l1 ' + (D.result.outcome === 'SENT' ? 'on' : 'open') + '">' + esc(D.result.outcome === 'SENT' ? 'Sent' : 'Not confirmed as sent') + '</p>' +
        '<p class="t-b1">' + esc(D.result.words) + '</p>' + (log ? '<ul class="t-b2 ab-revs">' + log + '</ul>' : '') + '</section>';
    }
    var okToGo = D.checked && (!reached.length || D.again) && !D.busy && !!c.email && !c.open;
    return '<section class="p-card ab-panel ab-confirm" aria-label="Send statement"><p class="t-l1 open">Send statement by e-mail</p>' +
      '<div class="ab-grid2">' + kv('Recipient', esc(c.recipientName || '—')) + kv('E-mail', c.email ? '<b data-i18n-skip>' + esc(c.email) + '</b>' : '<span class="ab-chip open">Email unavailable</span>') +
      kv('Statement', '<span data-i18n-skip>' + esc(c.Settlement_ID) + '</span> · version ' + esc(c.revision)) + kv('Total', '<b data-i18n-skip>' + esc(usd(c.totalPayable)) + '</b>' + (c.inCurrency ? ' <span class="ab-mute">· ' + esc(money(c.inCurrency.currency, c.inCurrency.amount)) + '</span>' : '')) +
      kv('Due date', '<b>' + esc(day(c.dueDate)) + '</b>') + '</div>' +
      '<p class="t-b2">The e-mail carries the statement as a PDF attachment and points the guest to My Profile → Your statement. No link to the PDF is created.</p>' +
      (c.open ? '<p class="t-b1 ab-err">A send of this statement is in progress (' + esc(when(c.open.at)) + '). Wait a few minutes and open this again.</p>' : '') +
      (log ? '<p class="t-l1">Sent before</p><ul class="t-b2 ab-revs">' + log + '</ul>' : '') +
      (c.email ? '<label class="p-check t-b2"><input type="checkbox" data-ab-send-check' + (D.checked ? ' checked' : '') + (D.busy ? ' disabled' : '') + '><span>Send this statement to <b data-i18n-skip>' + esc(c.email) + '</b> now.</span></label>' : '') +
      (reached.length ? '<label class="p-check t-b2"><input type="checkbox" data-ab-send-again' + (D.again ? ' checked' : '') + (D.busy ? ' disabled' : '') + '><span>It may already have reached the guest — send it again anyway.</span></label>' : '') +
      '<div class="p-actions"><button type="button" class="p-act" data-ab-send-go' + (okToGo ? '' : ' disabled') + '>' + (D.busy ? 'Sending…' : 'Send statement') + '</button>' +
      '<button type="button" class="p-link mute" data-ab-close' + (D.busy ? ' disabled' : '') + '>Cancel</button></div>' +
      (D.error ? '<p class="t-b1 ab-err" role="alert">' + esc(D.error) + '</p>' : '') + '</section>';
  }
  function panelView() {
    if (S.panel === 'confirm') return confirmPanel();
    if (S.panel === 'preview') return previewView() + (S.issue ? issuePanel() : '');
    if (S.panel === 'view') return viewPanel();
    if (S.panel === 'send') return sendPanel();
    return '';
  }
  function paymentsView() {
    var H = S.holder, pays = H.payments || [], p = H.payment;
    /* the payment administration is always there: before a statement exists it says what will appear */
    if (!H.issued && !pays.length) {
      return '<section class="p-card ab-panel" aria-label="Payments"><p class="t-l1">Payments · 008, append-only</p>' +
        '<p class="t-b2">No statement is issued for this guest yet. Once it is, the payments the guest reports appear here to verify or reject; a correction is always a new REFUND or ADJUSTMENT row in 008, never an edit.</p></section>';
    }
    var P = S.pay || {};
    var rows = pays.map(function (r) {
      var reported = r.Record_Status === 'REPORTED', d = r.decision || null;
      var acts = '';
      if (reported) {
        if (d && d.state === 'PENDING') {
          acts = !d.resumable ? '<span class="ab-mute">' + esc((d.decision || 'decision') + ' in progress') + '</span>'
            : P.id === r.Payment_ID && P.kind === 'resume'
              ? '<span class="ab-confirm-inline">Send the claimed ' + esc((d.decision || '').toLowerCase()) + ' to 008 again? <button type="button" class="p-link" data-ab-pay-go' + (P.busy ? ' disabled' : '') + '>Yes, resume</button> <button type="button" class="p-link mute" data-ab-pay-cancel>Cancel</button></span>'
              : '<button type="button" class="p-link" data-ab-pay="resume" data-id="' + esc(r.Payment_ID) + '">Resume ' + esc((d.decision || '').toLowerCase()) + '</button>';
        } else if (P.id === r.Payment_ID) {
          acts = P.kind === 'verify'
            ? '<span class="ab-confirm-inline">Count this payment towards Paid? <button type="button" class="p-link" data-ab-pay-go' + (P.busy ? ' disabled' : '') + '>Yes, verify</button> <button type="button" class="p-link mute" data-ab-pay-cancel>Cancel</button></span>'
            : '<span class="ab-confirm-inline"><input type="text" maxlength="300" placeholder="Reason (required)" value="' + esc(P.reason || '') + '" data-ab-pay-reason aria-label="Reject reason"> <button type="button" class="p-link" data-ab-pay-go' + (P.busy || !String(P.reason || '').trim() ? ' disabled' : '') + '>Yes, reject</button> <button type="button" class="p-link mute" data-ab-pay-cancel>Cancel</button></span>';
        } else {
          acts = '<button type="button" class="p-link" data-ab-pay="verify" data-id="' + esc(r.Payment_ID) + '">Verify</button> <button type="button" class="p-link mute" data-ab-pay="reject" data-id="' + esc(r.Payment_ID) + '">Reject</button>';
        }
      }
      return '<tr><td data-l="Payment"><span data-i18n-skip>' + esc(r.Payment_ID) + '</span>' + (r.Duplicate_Suspect ? '<br><span class="ab-chip open">duplicate?</span>' : '') + '</td>' +
        '<td data-l="Type">' + esc(r.Entry_Type) + '</td><td data-l="Method">' + esc(METHOD[r.Method] || r.Method || '—') + '</td>' +
        '<td data-l="Amount" class="num"><span data-i18n-skip>' + esc(money(r.Currency_Paid || '', r.Amount_Paid)) + '</span><br><span class="ab-mute" data-i18n-skip>' + esc(usd(r.Amount_USD)) + '</span></td>' +
        '<td data-l="Reported">' + esc(when(r.Reported_At)) + (r.Provider_Reference ? '<br><span class="ab-mute">ref ' + esc(r.Provider_Reference) + '</span>' : '') + '</td>' +
        '<td data-l="Status"><span class="ab-chip ' + (r.Record_Status === 'VERIFIED' ? 'on' : r.Record_Status === 'REPORTED' ? 'open' : '') + '">' + esc(r.Record_Status) + '</span>' +
        (r.Verified_By ? '<br><span class="ab-mute">' + esc(r.Verified_By) + ' · ' + esc(when(r.Verified_At)) + '</span>' : '') + (r.Reject_Reason ? '<br><span class="ab-mute">' + esc(r.Reject_Reason) + '</span>' : '') + '</td>' +
        '<td data-l="Action">' + (acts || '<span class="ab-mute">—</span>') + '</td></tr>';
    }).join('');
    return '<section class="p-card ab-panel" aria-label="Payments"><p class="t-l1">Payments · 008, append-only</p>' +
      (p ? '<div class="ab-grid2">' + kv('Status', esc(PAY[p.status] || p.status || '—') + (p.overdue ? ' <span class="ab-chip open">Overdue</span>' : '')) +
        kv('Total', '<span data-i18n-skip>' + esc(usd(p.soll)) + '</span>') + kv('Verified paid', '<span data-i18n-skip>' + esc(usd(p.ist)) + '</span>') +
        kv('Outstanding', '<b data-i18n-skip>' + esc(usd(Math.max(0, Number(p.balance) || 0))) + '</b>') + kv('Waiting for verification', esc(p.pendingCount || 0)) + '</div>' : '') +
      (pays.length ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Payment</th><th>Type</th><th>Method</th><th class="num">Amount</th><th>Reported</th><th>Status</th><th>Action</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<p class="t-b2">No payment reported yet.</p>') +
      '<p class="t-b2 ab-mute">A verified or rejected entry is never edited; a correction is a new REFUND or ADJUSTMENT row in 008.</p>' +
      (P.msg ? '<p class="t-b1 ab-msg" role="status">' + esc(P.msg) + '</p>' : '') + '</section>';
  }
  function mailView() {
    var m = S.holder.mail;
    if (!m || !m.attempts || !m.attempts.length) return '';
    return '<section class="p-card ab-panel" aria-label="E-mail log"><p class="t-l1">Statement e-mails</p><ul class="t-b2 ab-revs">' + m.attempts.map(function (a) {
      return '<li>' + esc(when(a.recordedAt || a.claimedAt)) + ' · ' + esc(a.outcome) + ' · ' + esc(a.to || '') + (a.by ? ' · ' + esc(a.by) : '') + '</li>';
    }).join('') + '</ul></section>';
  }

  /* ------------------------------------------------------------- revenue */
  /* THE REVENUE OVERVIEW (billing-revenue/2.3.0 · Owner, 15 Nov 2026): what is booked, what is invoiced, what is open and what
     came in — calculated live from the confirmed bookings whenever the overview is loaded or recalculated (nothing stored), so
     every booking the Owners or a guest confirm appears on the next calculation */
  var KPIS = [['bookedRevenue', 'Booked revenue (confirmed)'], ['issuedRevenue', 'Invoiced'], ['notYetInvoiced', 'Booked, not yet invoiced'],
    ['outstanding', 'Open receivables'], ['overdue', 'Of which overdue'], ['cashCollected', 'Payments received (verified)']];
  var KPIS_MORE = [['changedSinceIssue', 'Changed since invoiced'], ['invoicedNotBooked', 'Invoiced, no longer booked'], ['refundDue', 'Refund due'],
    ['hostedValue', 'Hosted value'], ['driftExposure', 'Drift exposure'], ['confirmedRevenue', 'Engine: confirmed bookings']];
  var METHOD_WORDS = { PROMPTPAY_THB: 'PromptPay (THB)', PAYPAL_EUR: 'PayPal (EUR)', SEPA_EUR: 'SEPA (EUR)' };
  function kpiAmount(k) {
    if (!k) return '—';
    if (k.complete && k.amount != null) return usd(k.amount);
    if (k.partial && k.partial.amount != null) return usd(k.partial.amount) + ' · partial';
    return '—';
  }
  function kpiCard(x, label) {
    return '<div class="p-card ab-kpi"><p class="t-l1">' + esc(label) + '</p><p class="t-h1" data-i18n-skip>' + esc(kpiAmount(x)) + '</p>' +
      (x && !x.complete ? '<p class="t-b2 ab-why">Manual review: ' + esc((x.gaps || []).length) + ' gap' + ((x.gaps || []).length === 1 ? '' : 's') + '</p>' : '') +
      '<p class="t-b2 ab-mute">' + esc(x && x.definition || '') + '</p></div>';
  }
  function money2(m) { return m && m.amount != null ? usd(m.amount) : '—'; }
  function tbl(head, rows, empty) {
    if (!rows.length) return '<p class="t-b2">' + esc(empty) + '</p>';
    return '<div class="ab-table-wrap"><table class="ab-table"><thead><tr>' + head.map(function (h) { return '<th' + (h[1] ? ' class="num"' : '') + '>' + esc(h[0]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  }
  function td(label, v, num) { return '<td data-l="' + esc(label) + '"' + (num ? ' class="num"' : '') + '>' + v + '</td>'; }

  /* ---------------------------------- REVENUE AND BUDGET (billing-budget/1.1.0 · Owners, 15 + 17 Nov 2026)
     The server's comparison (src/billing/budget.js), arranged — nothing is computed here: every figure, label, coverage
     and reason is the server's. Amounts in different currencies stand side by side, never added. Read only. */
  var BUD_STATUS = { COMPLETE: ['Complete', 'on'], NOT_COMPLETE: ['Not complete', 'open'], OUTSIDE: ['Outside the comparison', ''] };
  var BUD_ROLE = { PLANNED_CONTRIBUTION: 'Planned guest contribution — comparison only, never revenue', SUPPLIER_COST: 'Supplier cost', NEUTRALISING: '004\'s neutralising entry — never a cost of this stay, never revenue' };
  var BUD_WHOSE = { GUEST_SERVICE: 'the guests\' rooms or seats', PERSON_NAMED: 'a named person\'s own place or ticket', UNSTATED: 'whose place — not stated' };
  var BUD_MODEL = { ROOM_BLOCK: 'room block, its Budget USD as stated', FLAT: 'whole vehicle or booking, its Budget USD once', PER_UNIT: 'Rate USD per ticket or place' };
  var BUD_BASIS = { PER_PERSON_PER_NIGHT: 'per person-night', PER_PERSON: 'per person', PER_ROOM_PER_NIGHT: 'per room-night', PER_ROOM: 'per room' };
  var BUD_SEVERITY = [['blocking', 'Missing before a difference can be shown'], ['data', 'Data to check'], ['info', 'For information']];
  function cash(m) { return m && m.amount != null ? money(m.currency || 'USD', m.amount) : '—'; }
  function cashS(m) { return '<span data-i18n-skip>' + esc(cash(m)) + '</span>'; }
  function cashList(list) { return list && list.length ? list.map(cashS).join(' · ') : '—'; }
  function dmy(iso) { return iso ? String(iso).slice(8, 10) + '.' + String(iso).slice(5, 7) + '.' + String(iso).slice(0, 4) : ''; }
  function period(from, to) { return from ? dmy(from) + (to && to !== from ? ' – ' + dmy(to) : '') : '—'; }
  function li(t) { return '<li>' + esc(t) + '</li>'; }
  function aChips(ids, BG) {
    return (ids || []).map(function (id) {
      var a = (BG.assumptions || []).filter(function (x) { return x.id === id; })[0];
      return ' <span class="ab-chip" title="' + esc(a ? a.text : '') + '">assumption ' + esc(id) + '</span>';
    }).join('');
  }
  /* the server's label, then the amount it labels: "Cost still to be covered by the hosts USD 123.80" — the sign is in the words */
  function labelled(text, m) { return m && m.amount != null ? text + ' ' + money(m.currency || 'USD', Math.abs(m.amount)) : text; }
  function stChip(s) { var w = BUD_STATUS[s] || [s, '']; return '<span class="ab-chip ' + w[1] + '">' + esc(w[0]) + '</span>'; }
  /* 1.1.0: the 004 lines possibly counted twice (A-5) — named beside a sum, never taken out of it */
  function dupWords(d) {
    if (!d) return '';
    return ' <span class="ab-why" data-i18n-skip>possibly counted twice in 004 (assumption A-5): ' +
      (d.rows.length ? 'row' + (d.rows.length === 1 ? ' ' : 's ') + esc(d.rows.join(', ')) + ' · ' + esc(cash(d.amount)) : '') +
      (d.rows.length && d.partlyRows.length ? ' · ' : '') +
      (d.partlyRows.length ? 'row' + (d.partlyRows.length === 1 ? ' ' : 's ') + esc(d.partlyRows.join(', ')) + ' partly or unclear, no amount' : '') + ' — still in the sum as 004 states it</span>';
  }
  /* 1.1.0: the nights of a supplier's stays no approved 004 line covers, with the lines that do cover them and why they do not count */
  function uncoveredWords(stays) {
    return (stays || []).filter(function (s) { return s.uncovered.length; }).map(function (s) {
      return s.stage + ': ' + s.uncovered.map(function (u) {
        return dmy(u.night) + (u.others.length ? ' (' + u.others.map(function (o) { return 'row ' + o.row + ' — ' + o.why; }).join('; ') + ')' : '');
      }).join(', ');
    });
  }
  function budgetCard(c, BG) {
    var inCmp = c.complete.centres.length + c.notComplete.centres.length;
    var top = c.differenceAvailable
      ? '<p class="t-h1" data-i18n-skip>' + esc(money(c.difference.currency || 'USD', Math.abs(c.difference.amount))) + '</p><p class="t-b2">' +
        (c.labelText ? '<b>' + esc(c.labelText) + '</b>' : 'No difference in total — but not each of its stays and routes is at cost (see each below)') + aChips(c.complete.assumptions, BG) + '</p>'
      : '<p class="t-h1">No difference yet</p><p class="t-b2 ab-why">' + esc(!c.billable ? 'Nothing of it is billed to the guests.'
        : c.notComplete.centres.length + ' of ' + inCmp + (inCmp === 1 ? ' stay or route is' : ' stays and routes are') + ' not complete — the difference is shown once every one of them is.') + '</p>';
    return '<div class="p-card ab-bcat" data-ab-bcat="' + esc(c.category) + '"><p class="t-l1">' + esc(c.category) + '</p>' + top +
      kv('Guest contributions (booked)', cashS(c.contribution)) +
      (c.complete.centres.length ? kv('Complete · ' + c.complete.centres.join(', '), cashS(c.complete.contribution) + ' contributions · ' + cashS(c.complete.cost) +
        ' supplier cost <span class="ab-mute">— the difference of each stands on its own row below</span>' + aChips(c.complete.assumptions, BG)) : '') +
      (c.notComplete.centres.length ? kv('Not complete · ' + c.notComplete.centres.join(', '), cashS(c.notComplete.contribution) + ' contributions · ' + cashS(c.notComplete.known) +
        ' supplier cost known so far <span class="ab-mute">— side by side, not subtracted</span>') : '') +
      (c.outside.length ? kv('Outside the comparison', esc(c.outside.join(', ')) + ' <span class="ab-mute">— the guests book or pay it themselves</span>') : '') +
      kv('Planned supplier cost (004)', cashS(c.planned) + ' <span class="ab-mute" data-i18n-skip>· guests\' services ' + esc(cash(c.plannedGuestServices)) +
        ' · named persons\' own ' + esc(cash(c.plannedPersons)) + ' · whose not stated ' + esc(cash(c.plannedUnstated)) + '</span>' + dupWords(c.possibleDuplicates)) +
      (c.plannedContributions && c.plannedContributions.cents ? kv('Planned guest contributions (004 — never revenue)', cashS(c.plannedContributions)) : '') +
      kv('Committed (007 totals, as typed)', cashList(c.verified)) +
      kv('Paid to suppliers (007, counted)', cashList(c.paid) + (c.paidNotCounted.length ? ' <span class="ab-mute">· recorded but not counted (the reasons in the supplier table): ' +
        c.paidNotCounted.map(cashS).join(' · ') + '</span>' : '')) +
      kv('Outstanding to suppliers (007 total less counted payments)', cashList(c.outstanding) +
        ((c.paidAbove || []).length ? ' <span class="ab-mute">· paid above the 007 total: ' + c.paidAbove.map(cashS).join(' · ') + '</span>' : '') +
        ((c.outstandingNotStated || []).length ? ' <span class="ab-mute">· not stated for ' + esc(c.outstandingNotStated.join(', ')) + ' (see the supplier table)</span>' : '')) +
      (c.paid004 && c.paid004.cents ? kv('004 "Amount paid USD" (listed apart)', cashS(c.paid004)) : '') + '</div>';
  }
  function rateWords(g) {
    var r = g.rate ? cash(g.rate) + ' ' + (BUD_BASIS[g.rateBasis] || String(g.rateBasis || '').toLowerCase()) + ' · ' : '';
    return r + (g.rateSource || '—') + (g.rate009 ? (g.rate009.row ? ' row ' + g.rate009.row : ' (' + g.rate009.why + ')') : '');
  }
  function payerWords(g) {
    return 'Payer ' + (g.payerName ? g.payerName + ' · ' : '') + (g.payer || '—') + (g.statement ? ' · statement ' + g.statement : ' · no statement yet') +
      ' · ' + g.source + (g.asInvoiced ? ' (as invoiced)' : '');
  }
  function guestLi(g) {
    return '<li><b>' + esc(g.personName || g.person || '—') + '</b>' + (g.personName && g.person ? ' <span class="ab-mute" data-i18n-skip>' + esc(g.person) + '</span>' : '') +
      ' <span class="ab-mute" data-i18n-skip>· ' + esc(g.nightsWords) + ' · ' + esc(rateWords(g)) + '</span>' +
      (g.extraBed ? ' <span class="ab-chip">extra bed</span>' : '') + (g.paidByHSWords ? ' <span class="ab-chip open">' + esc(g.paidByHSWords) + '</span>' : '') +
      ' → <b>' + cashS(g.amount) + '</b><span class="ab-id" data-i18n-skip>' + esc(payerWords(g)) + '</span></li>';
  }
  function nightWords(n) {
    return dmy(n.night) + ': ' + (n.row ? 'budget row ' + n.row + (n.perRoomNight ? ' · ' + cash(n.perRoomNight) + ' per room-night (block rate)' : n.model === 'FLAT' ? ' · the whole booking' : '')
      : n.overlap ? 'rows ' + n.overlap.join(' and ') + ' overlap' : 'no supplier cost in 004');
  }
  function lines004Table(c, BG) {
    return tbl([['Row'], ['Item · details'], ['Reading'], ['Date or period'], ['Approved'], ['Budget USD', 1], ['In the comparison']], (c.lines004 || []).map(function (x) {
      var used = (c.usedRows || []).indexOf(x.row) >= 0;
      var why = [x.why].concat(x.conflicts || [], x.notes || []).filter(Boolean);
      return '<tr>' + td('Row', '<span data-i18n-skip>' + esc(x.row) + '</span>') +
        td('Item · details', esc(x.item) + (x.details ? '<span class="ab-id">' + esc(x.details) + '</span>' : '')) +
        td('Reading', esc(BUD_ROLE[x.role] || x.role) + (x.whose ? ' · ' + esc(BUD_WHOSE[x.whose] || x.whose) : '') + ' · ' + esc(BUD_MODEL[x.model] || x.model) + (x.service ? ' · ' + esc(x.service) : '') + aChips(x.assumption ? [x.assumption] : [], BG)) +
        td('Date or period', esc(x.periodText || '—')) + td('Approved', x.approved ? esc(x.approval) : x.approval ? '<span class="ab-chip open">not recognised</span> ' + esc(x.approval) : '<span class="ab-chip open">not approved</span>') +
        td('Budget USD', cashS(x.budget) + '<span class="ab-id" data-i18n-skip>' + esc((x.rate != null ? 'Rate ' + x.rate : '') + (x.qty != null ? ' × Qty ' + x.qty : '') + (x.mult != null ? ' × ' + x.mult : '')) + '</span>', 1) +
        td('In the comparison', (used ? '<span class="ab-chip on">used</span> ' : '') + (why.length ? '<span class="ab-why">' + esc(why.join(' · ')) + '</span>' : '')) + '</tr>';
    }), 'No budget line of 004 belongs to it.');
  }
  function budgetCentre(c, BG) {
    var open = S.budgetOpen && S.budgetOpen[c.id];
    var head = '<summary><b>' + esc(c.place) + '</b> <span class="ab-mute">· ' + esc(c.category) + ' · ' + esc(period(c.from, c.to)) + '</span> ' + stChip(c.status) +
      ' <span class="ab-mute" data-i18n-skip>· contributions ' + esc(cash(c.contribution)) +
      (c.status === 'COMPLETE' ? ' · supplier cost ' + esc(cash(c.cost)) : c.status === 'NOT_COMPLETE' ? ' · supplier cost known so far ' + esc(cash(c.known)) : '') + '</span>' +
      (c.labelText ? ' → <b>' + esc(labelled(c.labelText, c.difference)) + '</b>' + aChips(c.assumptions, BG) : c.difference ? ' → difference ' + cashS(c.difference) : '') + '</summary>';
    var b = '';
    if (c.status === 'OUTSIDE') b += '<p class="t-b2">' + esc(c.why) + '</p>';
    if ((c.missing || []).length) b += '<div class="ab-warn" role="note"><p class="t-l1">Not complete because</p><ul class="t-b2">' + c.missing.map(li).join('') + '</ul></div>';
    if (c.coverage) b += '<p class="t-b2 ab-mute">Covered: ' + esc(c.coverage.covered + ' of ' + c.coverage.total + ' ' + c.coverage.unit + (c.coverage.total === 1 ? '' : 's')) +
      ((c.usedRows || []).length ? ' · budget rows used: ' + esc(c.usedRows.join(', ')) : '') + '</p>';
    if (c.rooms) {
      b += '<p class="t-l1">Rooms</p>' + tbl([['Room'], ['Guests — nights · rate · amount · payer'], ['Contribution', 1], ['Supplier cost per night (004)']], c.rooms.map(function (r) {
        return '<tr>' + td('Room', '<span data-i18n-skip>' + esc((r.label ? 'Room ' + r.label + ' · ' : '') + r.itemName) + '</span>') +
          td('Guests', '<ul>' + r.lines.map(guestLi).join('') + '</ul>') + td('Contribution', cashS(r.contribution), 1) +
          td('Supplier cost', '<span data-i18n-skip>' + r.nights.map(function (n) { return esc(nightWords(n)); }).join('<br>') + '</span>' +
            (r.notes.length ? '<span class="ab-why">' + esc(r.notes.join(' · ')) + '</span>' : '')) + '</tr>';
      }), 'No room of it is booked.');
      if ((c.notBooked || []).length) b += '<ul class="t-b2 ab-mute">' + c.notBooked.map(function (n) {
        return li('Budget row ' + n.row + ' · ' + dmy(n.night) + ': ' + n.rooms + ' of ' + n.inBlock + ' rooms not booked' + (n.perRoomNight ? ' (' + cash(n.perRoomNight) + ' per room-night)' : '') + ' — part of the block\'s cost as stated');
      }).join('') + '</ul>';
    }
    if (c.services) {
      b += '<p class="t-l1">Services</p>' + tbl([['Service'], ['Budget rows'], ['Basis'], ['Unit cost', 1], ['Booked', 1], ['Supplier cost', 1]], c.services.map(function (s) {
        return '<tr>' + td('Service', esc(s.service)) + td('Budget rows', esc(s.rows.join(', ') || '—')) + td('Basis', esc(s.basis || 'no approved line')) +
          td('Unit cost', cashS(s.unit), 1) + td('Booked', esc(s.tickets), 1) + td('Supplier cost', cashS(s.cost), 1) + '</tr>';
      }), '—');
      b += '<p class="t-l1">Guests</p>' + tbl([['Guest'], ['Rate · source'], ['Places', 1], ['Contribution', 1], ['Payer · statement']], (c.guest || []).map(function (g) {
        return '<tr>' + td('Guest', esc(g.personName || g.person || '—') + (g.personName && g.person ? '<span class="ab-id" data-i18n-skip>' + esc(g.person) + '</span>' : '')) +
          td('Rate · source', '<span data-i18n-skip>' + esc(rateWords(g)) + '</span>' + (g.paidByHSWords ? ' <span class="ab-chip open">' + esc(g.paidByHSWords) + '</span>' : '')) +
          td('Places', esc(g.quantity), 1) + td('Contribution', cashS(g.amount), 1) + td('Payer · statement', '<span data-i18n-skip>' + esc(payerWords(g)) + '</span>') + '</tr>';
      }), 'Nobody is booked on it.');
    }
    b += '<p class="t-l1">Budget lines (004)</p>' + lines004Table(c, BG);
    if ((c.checks || []).length) b += '<p class="t-l1">Checks</p><ul class="t-b2">' + c.checks.map(function (x) { return li(x.text); }).join('') + '</ul>';
    return '<details class="ab-bd" data-ab-bd="' + esc(c.id) + '"' + (open ? ' open' : '') + '>' + head + '<div class="ab-bd-body">' + b + '</div></details>';
  }
  /* STATEMENTS TO REVISE (Owners, 17 Nov 2026): issued statements whose amounts no longer match the bookings, and the couple's own
     statements (complimentary now) — the issued amounts stand until the Owners issue a revision; nothing is changed here */
  function revisionsView(R) {
    var names = {}; ((S.overview && S.overview.holders) || []).forEach(function (h) { if (h.name && h.name.full) names[h.Holder_ID] = h.name.full; });
    var who = function (id) { return names[id] ? names[id] + ' (' + id + ')' : id; };
    var due = (R.holders || []).filter(function (h) { return (h.changedSinceIssue && h.changedSinceIssue.cents) || (h.invoicedNotBooked && h.invoicedNotBooked.cents); });
    var couple = (R.couple || []).filter(function (c) { return c.issued != null; });
    if (!due.length && !couple.length) return '';
    var rows = due.map(function (h) {
      var d = (h.changedSinceIssue ? h.changedSinceIssue.cents : 0) - (h.invoicedNotBooked ? h.invoicedNotBooked.cents : 0);
      return '<tr><td data-l="Guest">' + esc(who(h.Holder_ID)) + '</td><td data-l="Issued" class="num"><span data-i18n-skip>' + esc(h.issued && h.issued.display || '—') + '</span></td><td data-l="Difference" class="num"><span data-i18n-skip>' + esc(usd(d / 100)) + '</span></td><td data-l="">a revision is due</td></tr>';
    }).concat(couple.map(function (c) {
      return '<tr><td data-l="Guest">' + esc(who(c.Holder_ID)) + '</td><td data-l="Issued" class="num"><span data-i18n-skip>' + esc(usd(c.issued)) + '</span></td><td data-l="Difference" class="num"><span data-i18n-skip>' + esc(usd(c.payableNow - c.issued)) + '</span></td>' +
        '<td data-l="">the couple\'s own bookings — complimentary; not revenue' + (c.revisionDue ? '; a revision withdraws the issued amount' : '') +
        ((c.journal || []).length ? '; ' + c.journal.length + ' payment report' + (c.journal.length === 1 ? '' : 's') + ' on it (' + c.journal.map(function (x) { return x.status || x.type; }).join(', ') + ') — kept with it, not guest receipts' : '') + '</td></tr>';
    })).join('');
    return '<div class="p-card ab-panel" data-ab-rev-revisions><p class="t-l1">Statements to revise · ' + (due.length + couple.length) + '</p>' +
      '<p class="t-b2">Issued statements stay as issued until you issue a revision in the guest\'s view; nothing here issues, sends or changes one.</p>' +
      '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Guest</th><th class="num">Issued</th><th class="num">Change</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  }
  /* THE HOTEL ROOM RATE LIST (Owners, 17 Nov 2026): per stay, one row per guest and room — generated from the server's own per-room
     lines (bookings · 002 · 009 · the Rooms engine), never typed; the hotel room number is the official list's as the Owners assigned
     it; Google 012 is matched for reconciliation only. The Owners approve
     a version (admin/rate-list freezes it with who, when and its SHA-256) and download it as CSV for the hotel. */
  var RL_HEAD = ['Guest', 'Room', 'Hotel room no.', 'Room type', 'Arrival', 'Departure', 'Rate per night USD', 'Rate source', 'Nights', 'Charged nights', 'Complimentary nights', 'Extra bed', 'Amount USD', 'Statement', 'Reconciliation (012)'];
  function rateRows(c, list012) {
    var first = function (n) { return String(n || '').trim().split(/\s+/)[0].toLowerCase(); };
    var out = [];
    (c.rooms || []).forEach(function (r) {
      (r.lines || []).forEach(function (l) {
        var f = first(l.personName), type = String(l.itemName || '').toLowerCase();
        var hit = (list012 || []).filter(function (x) { return x.guests.some(function (g) { return first(g) === f; }); });
        var same = hit.filter(function (x) { return x.roomType.toLowerCase() === type; });
        var rec = !f ? 'no name' : same.length === 1 ? 'in 012, room ' + same[0].roomNo : same.length > 1 ? 'in 012 more than once (' + same.map(function (x) { return x.roomNo; }).join(', ') + ')'
          : hit.length ? '012 lists ' + hit.map(function (x) { return x.roomType + ' ' + x.roomNo; }).join(', ') + ' — room type differs' : 'not in 012';
        var comp = (Number(l.hostedNights) || 0) + (Number(l.complimentaryNights) || 0);
        out.push([l.personName || l.person, r.label, r.hotelRoom ? r.hotelRoom.display : '', l.itemName || l.item, c.from || '', c.to || '',
          l.rate ? (l.rate.cents / 100).toFixed(2) : '', l.rateSource || '', l.nights != null ? l.nights : '', l.chargedNights != null ? l.chargedNights : (l.payableNights != null ? l.payableNights : ''),
          comp, l.extraBed ? 'yes' : '', l.amount ? (l.amount.cents / 100).toFixed(2) : '', l.statement || '', rec]);
      });
    });
    return out;
  }
  /* PURCHASE AND SALE PER ROOM (Owners, 17 Nov 2026): the hotel's cost of a room — only where a hotel contract buys that room
     (roomContracts: its rate per room night × the stay's nights) — beside what its guests pay (sale) and the surplus; a room no
     contract covers has no cost here, never an estimate. Amounts are the engine's; the couple's own room sells at USD 0. */
  function nightsOfStay(c) { var a = Date.parse(c.from), b = Date.parse(c.to); return a && b && b > a ? Math.round((b - a) / 86400000) : null; }
  /* each room's hotel cost as the server sets it on the room plan (the agreement, or additional nights at the Owners' confirmed rate,
     plus the additional-person charge) — the same figure the Rooms tab shows, never recomputed here */
  function roomSummary(c, BG) {
    var n = nightsOfStay(c), plan = (BG.roomPlan || []).filter(function (p) { return p.stay === c.id; })[0] || { rooms: [] };
    return (c.rooms || []).filter(function (r) { return (r.lines || []).length; }).map(function (r) {
      var item = r.item || ((r.lines[0] || {}).item);
      var u = plan.rooms.filter(function (x) { return x.item === item && x.label === r.label; })[0] || {};
      var cost = u.hotelCost ? u.hotelCost.cents + (u.hotelSupplement ? u.hotelSupplement.cents : 0) : null;
      var sale = r.lines.reduce(function (t, l) { return t + (l.amount ? l.amount.cents : 0); }, 0);
      return { label: r.label, item: (r.lines[0] || {}).itemName || item, guests: r.lines.length, nights: n, rate: u.hotelCost && n ? u.hotelCost.cents / 100 / n : null, cost: cost, sale: sale, surplus: cost == null ? null : sale - cost };
    });
  }
  function csvOf(rows) { return [RL_HEAD].concat(rows).map(function (r) { return r.map(function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','); }).join('\r\n'); }
  function rateListView(BG) {
    var stays = (BG.centres || []).filter(function (c) { return c.kind === 'STAY' && (c.rooms || []).some(function (r) { return (r.lines || []).length; }); });
    if (!stays.length) return '';
    if (!S.rl) { S.rl = {}; stays.forEach(function (c) { api('admin/rate-list?stay=' + encodeURIComponent(c.id)).then(function (x) { S.rl[c.id] = x.ok ? x.j : { error: x.j.error || 'not readable' }; if (S.route.view === 'rooms') draw(); }); }); }
    return '<div class="p-card ab-panel" data-ab-ratelist><p class="t-l1">Hotel room rate list — from the bookings, 002 and 009</p>' +
      '<p class="t-b2 ab-mute">Generated, never typed. Google 012 is compared, never used as a source. Contractual inclusions (e.g. breakfast) are not held by 002 and are not listed.</p>' +
      stays.map(function (c) {
        var rows = rateRows(c, BG.roomList012), v = S.rl[c.id], last = v && v.versions && v.versions[v.versions.length - 1];
        var body = rows.map(function (r) { return '<tr>' + r.map(function (x, i) { return '<td data-l="' + esc(RL_HEAD[i]) + '"' + (i === 6 || i === 12 ? ' class="num"' : '') + '><span data-i18n-skip>' + esc(x) + '</span></td>'; }).join('') + '</tr>'; }).join('');
        return '<details data-ab-rl="' + esc(c.id) + '"><summary class="t-b1">' + esc(c.place || c.id) + ' · ' + rows.length + ' guests · ' + (last ? 'approved version ' + last.n + ' (' + esc(day(last.at)) + ', ' + esc(last.by) + ')' : 'no approved version yet') + '</summary>' +
          '<div class="ab-table-wrap"><table class="ab-table"><thead><tr>' + RL_HEAD.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
          '<div class="ab-actions"><div class="ab-act"><button type="button" class="p-act ab-ghost" data-ab-rl-csv="' + esc(c.id) + '">Download CSV</button></div>' +
          '<div class="ab-act"><button type="button" class="p-act" data-ab-rl-approve="' + esc(c.id) + '"' + (S.rlBusy ? ' disabled' : '') + '>Approve this version</button></div></div>' +
          (function () {
            var rs = roomSummary(c, BG); if (!rs.length) return '';
            var tc = 0, ts = 0, known = true; rs.forEach(function (x) { ts += x.sale; if (x.cost == null) known = false; else tc += x.cost; });
            return '<p class="t-l1">Per room · hotel cost (purchase) · guest revenue (sale) · ' + esc(DIFF_LABEL) + '</p><div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Room</th><th>Room type</th><th class="num">Guests</th><th class="num">Nights</th><th class="num">Hotel rate / room night</th><th class="num">Hotel cost</th><th class="num">Guest revenue</th><th class="num">Revenue − hotel cost</th></tr></thead><tbody>' +
              rs.map(function (x) { return '<tr><td data-l="Room">' + esc(x.label) + '</td><td data-l="Room type">' + esc(x.item) + '</td><td data-l="Guests" class="num">' + x.guests + '</td><td data-l="Nights" class="num">' + esc(x.nights == null ? '—' : x.nights) + '</td>' +
                '<td data-l="Hotel rate" class="num"><span data-i18n-skip>' + (x.rate == null ? '—' : esc(usd(x.rate))) + '</span></td><td data-l="Hotel cost" class="num"><span data-i18n-skip>' + (x.cost == null ? '<span class="ab-mute">no purchase rate</span>' : esc(usd(x.cost / 100))) + '</span></td>' +
                '<td data-l="Guest revenue" class="num"><span data-i18n-skip>' + esc(usd(x.sale / 100)) + '</span></td><td data-l="Revenue − hotel cost" class="num"><span data-i18n-skip>' + (x.surplus == null ? '—' : esc(usd(x.surplus / 100))) + '</span></td></tr>'; }).join('') +
              '<tr><td colspan="5"><b>Rooms with guests</b>' + (known ? '' : ' <span class="ab-mute">(a room without a purchase rate has no cost here)</span>') + '</td><td class="num"><b data-i18n-skip>' + esc(usd(tc / 100)) + '</b></td><td class="num"><b data-i18n-skip>' + esc(usd(ts / 100)) + '</b></td><td class="num"><b data-i18n-skip>' + (known ? esc(usd((ts - tc) / 100)) : '—') + '</b></td></tr></tbody></table></div>' +
              '<p class="t-b2 ab-mute">The hotel cost counts only the rooms with guests (the agreement\'s rate, or additional nights at the confirmed purchase rate, with the additional-person charge); every room the agreement buys is in Finance · D.</p>';
          })() +
          (v && v.versions && v.versions.length ? '<p class="t-b2 ab-mute">Approved versions: ' + v.versions.map(function (x) { return 'v' + x.n + ' · ' + day(x.at) + ' · ' + x.by + ' · ' + x.count + ' rows · ' + String(x.hash).slice(0, 12); }).join(' · ') + '</p>' : '') +
          (S.rlMsg && S.rlMsg.stay === c.id ? '<p class="t-b2" role="status">' + esc(S.rlMsg.text) + '</p>' : '') + '</details>';
      }).join('') + '</div>';
  }
  function budgetView(BG) {
    if (!BG) return '';
    if (BG.available === false) return '<div class="p-card ab-panel" data-ab-budget><p class="t-l1">Revenue and budget (004)</p><p class="t-b2">' + esc(BG.gap || 'Not available just now.') + '</p></div>';
    var cats = BG.categories || [];
    var main = cats.filter(function (c) { return /^(accommodation|transportation)$/i.test(c.category); });
    var other = cats.filter(function (c) { return main.indexOf(c) < 0; });
    var checks = BUD_SEVERITY.map(function (s) {
      var list = (BG.checks || []).filter(function (x) { return x.severity === s[0]; });
      return list.length ? '<p class="t-l1">' + esc(s[1]) + ' (' + list.length + ')</p><ul class="t-b2">' + list.map(function (x) { return li((x.centre ? x.centre + ' · ' : '') + x.text); }).join('') + '</ul>' : '';
    }).join('');
    var sup = tbl([['Supplier (007)'], ['Stays'], ['Contract, as typed', 1], ['Deposit', 1], ['Paid by today', 1], ['Payments not counted'], ['Outstanding', 1], ['004 lines', 1], ['Contract vs 004', 1]], (BG.suppliers || []).map(function (s) {
      var off = s.payments.filter(function (p) { return !p.counted; });
      var why = [];
      if (s.contractVsPlan && s.contractVsPlan.cents) why.push('007 does not say what its total covers');
      return '<tr>' + td('Supplier', esc(s.vendor) + '<span class="ab-id">' + esc(s.category || '') + ' · column ' + esc(s.column) + '</span>') + td('Stays', esc(s.stages.join(', ') || '—')) +
        td('Contract', cashS(s.contract) + (s.contractNote ? '<span class="ab-why">' + esc(s.contractNote) + '</span>' : '') +
          (s.converted.length ? '<span class="ab-why">' + esc(s.converted.map(function (x) { return x.currency; }).join(', ') + ' converted inside 007 — not an approved reporting conversion, never used') + '</span>' : ''), 1) +
        td('Deposit', cashS(s.deposit) + (s.depositPct != null ? '<span class="ab-id">' + esc(s.depositPct) + ' %</span>' : ''), 1) + td('Paid by today', cashList(s.paidCounted), 1) +
        td('Payments not counted', off.length ? '<span class="ab-why">' + esc(off.map(function (p) { return p.cell + ' ' + cash(p.amount) + ' — ' + p.why; }).join(' · ')) + '</span>' : '—') +
        td('Outstanding', s.outstanding ? cashS(s.outstanding) : s.paidAbove ? '<span class="ab-why">paid above the 007 total by ' + esc(cash(s.paidAbove)) + '</span>'
          : '— <span class="ab-why">not stated: ' + esc(s.outstandingWhy || '') + '</span>', 1) +
        td('004 lines', s.planned004 ? cashS(s.planned004) + '<span class="ab-id" data-i18n-skip>rows ' + esc(s.planned004Rows.join(', ')) + '</span>' : '—', 1) +
        td('Contract vs 004', cashS(s.contractVsPlan) + (why.length ? '<span class="ab-why" data-i18n-skip>' + esc(why.join(' · ')) + '</span>' : ''), 1) + '</tr>';
    }), 'No supplier is recorded in 007.');
    /* 1.1.0: beside the 007 totals, LISTED APART — never a breakdown of the difference in the table (review, 17 Nov 2026) */
    var plural = function (rows) { return (rows.length === 1 ? 'row ' : 'rows ') + rows.join(', '); };
    var apart = (BG.suppliers || []).map(function (s) {
      var parts = [], d = s.possibleDuplicates, gaps = uncoveredWords(s.stays);
      if (d) parts.push('possibly counted twice in 004 (assumption A-5): ' + (d.rows.length ? plural(d.rows) + ' · ' + cash(d.amount) : '') +
        (d.rows.length && d.partlyRows.length ? ' · ' : '') + (d.partlyRows.length ? plural(d.partlyRows) + ' partly or unclear, no amount' : ''));
      if (gaps.length) parts.push('nights of its stays with no approved 004 line for the guests\' rooms — ' + gaps.join(' · '));
      if ((s.notPlaced || []).length) parts.push('its stays\' 004 ' + plural(s.notPlaced.map(function (x) { return x.row; })) + ' fit no single stay');
      return parts.length ? li(s.vendor + ': ' + parts.join(' · ')) : '';
    }).join('');
    if (apart) sup += '<p class="t-l1">Beside the 007 totals — listed apart, not a breakdown of any difference</p><ul class="t-b2" data-ab-sup-apart>' + apart + '</ul>';
    var none = tbl([['004 category'], ['Budget lines'], ['Planned supplier cost', 1]], (BG.noGuestService || []).map(function (g) {
      return '<tr>' + td('004 category', esc(g.category)) + td('Budget lines', '<span class="ab-why">' + esc(g.lines.map(function (l) { return 'row ' + l.row + ' ' + l.item + ' ' + cash(l.budget); }).join(' · ')) + '</span>') + td('Planned', cashS(g.total), 1) + '</tr>';
    }), 'Every budget line meets a guest service.');
    var rc = BG.reconciliation || {}, bd = rc.budget004 || {};
    var src = [
      'Guest contributions in this comparison ' + cash(rc.contributions) + (rc.bookedRevenue ? (rc.contributionsEqualBooked ? ' = the booked revenue above.' : ' ≠ the booked revenue above (' + cash(rc.bookedRevenue) + ').') : ' — the booked revenue is not complete just now.'),
    ].concat((bd.checks || []).map(function (x) {
      return '004 ' + x.cell + ' states ' + cash(x.sheet) + '; ' + x.what + ' add up to ' + cash(x.lines) + (x.equal ? ' — equal.' : ' — differs' +
        (x.range ? ': its formula sums rows ' + x.range.from + '–' + x.range.to + '; ' + (x.outside || []).map(function (o) { return 'row ' + o.row + ' (' + cash(o.amount) + ')'; }).join(', ') + ' outside it.' : '') +
        (x.carries ? ': ' + x.cell + ' is ' + x.formula + ' and carries ' + x.carries.join(' and ') + '\'s difference.' : '') + (x.range || x.carries ? '' : '.'));
    }),
      bd.actualIsBudget ? ['"Actual USD" repeats the Budget USD by formula on ' + bd.actualIsBudget + ' rows — never read as an actual cost.'] : [],
      [BG.currencies, 'Receipts from guests stay those of the overview above (008: verified, net of refunds).'],
      (BG.assumptions || []).map(function (a) { return 'Assumption ' + a.id + ': ' + a.text; }),
      ['004 ' + (bd.readable != null ? bd.readable + ' of ' + bd.lines + ' lines read' : '') + ' · ' + (BG.version || '') + ' · ' + (BG.mapVersion || '') + ' · as of ' + day(BG.asOf)]);
    return '<div class="p-card ab-panel" data-ab-budget><p class="t-l1">Revenue and budget — 004_Budget_Finance</p>' +
      '<p class="t-b2 ab-mute">What the guests contribute (the booked lines of the Billing Engine) beside what 004 and 007 say the suppliers cost, per category, stay and route. ' +
      'A difference is shown only where the supplier cost is stated for every booked room-night or ticket. Read only — nothing here books, invoices or writes.</p>' +
      '<div class="ab-grid2 ab-bcats" data-ab-budget-main>' + main.map(function (c) { return budgetCard(c, BG); }).join('') + '</div>' +
      (other.length ? '<div class="ab-grid2 ab-bcats">' + other.map(function (c) { return budgetCard(c, BG); }).join('') + '</div>' : '') +
      '<p class="t-l1 ab-bd-h">Stays, routes and services — open one to trace it to the rooms, the guests and the budget lines</p>' +
      (BG.centres || []).map(function (c) { return budgetCentre(c, BG); }).join('') +
      ((BG.questions || []).length ? '<div class="ab-note" data-ab-budget-questions><p class="t-l1">Questions for you — what would complete the comparison</p><ul class="t-b2">' +
        BG.questions.map(function (q) { return li((q.centre ? q.centre + ' · ' : '') + q.text); }).join('') + '</ul></div>' : '') +
      (checks ? '<details class="ab-bd" data-ab-bd="checks"' + (S.budgetOpen && S.budgetOpen.checks ? ' open' : '') + '><summary><b>Checks of the comparison</b> <span class="ab-mute">· ' +
        esc((BG.checks || []).length) + '</span></summary><div class="ab-bd-body">' + checks + '</div></details>' : '') +
      '<p class="t-l1 ab-bd-h">Suppliers (007_Deposit/Payment_Details)</p>' + sup +
      '<p class="t-l1 ab-bd-h">Budget lines without a guest service</p>' + none +
      '<p class="t-l1 ab-bd-h">Sources</p><ul class="t-b2 ab-mute" data-ab-budget-sources>' + src.map(li).join('') + '</ul></div>';
  }
  function inventoryView(R) {
    var BG = R.budget;
    if (!BG || BG.available === false || !BG.inventory) return null;
    return tbl([['Item'], ['Stay or route'], ['Unit'], ['Quota (002)', 1], ['Booked (counted)', 1], ['Quota − booked', 1], ['Confirmed (engine)', 1], ['Planned in 004 (Qty)', 1], ['Rooms available (002)', 1]], BG.inventory.map(function (i) {
      return '<tr>' + td('Item', '<span data-i18n-skip>' + esc(i.name) + '</span><span class="ab-id" data-i18n-skip>' + esc(i.Item_ID) + '</span>') + td('Stay or route', esc(i.centre)) +
        td('Unit', esc(i.unit || 'not stated')) + td('Quota', esc(i.quota != null ? i.quota : 'not stated'), 1) +
        td('Booked (counted)', esc(i.booked) + (i.unit === 'ROOM' && i.persons ? '<span class="ab-id">' + esc(i.persons) + ' guest' + (i.persons === 1 ? '' : 's') + '</span>' : ''), 1) +
        td('Quota − booked', esc(i.remaining != null ? i.remaining : '—'), 1) + td('Confirmed (engine)', esc(i.engineUsed != null ? i.engineUsed : '—'), 1) +
        td('Planned in 004', esc(i.planned004 != null ? i.planned004 : '—') + ((i.plannedRows || []).length ? '<span class="ab-id" data-i18n-skip>row ' + esc(i.plannedRows.join(', ')) + '</span>' : ''), 1) +
        td('Rooms available', esc(i.roomsAvailable != null ? i.roomsAvailable : '—'), 1) + '</tr>';
    }), 'No item is booked or holds a quota.');
  }
  /* BOOKING PROGRESS (Owners, 17 Nov 2026): where the active guests stand while the bookings come in — counts and invitations,
     never money; the revenue above is confirmed bookings only and is not final while any guest is open */
  function progressView(P) {
    if (!P) return '';
    if (P.error) return '<div class="p-card ab-panel" data-ab-rev-progress><p class="t-l1">Booking progress</p><p class="t-b2">Not readable just now: ' + esc(P.error) + '</p></div>';
    var names = {}; ((S.overview && S.overview.holders) || []).forEach(function (h) { if (h.name && h.name.full) names[h.Holder_ID] = h.name.full; });
    var who = function (id) { return names[id] ? names[id] + ' (' + id + ')' : id; };
    var ROWS = [['confirmed', 'Booking confirmed — counted above'], ['awaitingConfirmation', 'Sent or recorded, waiting for your confirmation — not counted'],
      ['notSent', 'Started, not sent — not counted'], ['noBooking', 'No booking yet'], ['unreadable', 'Not readable just now']];
    var open = P.guests - (P.confirmed || []).length;
    return '<div class="p-card ab-panel" data-ab-rev-progress><p class="t-l1">Booking progress · ' + esc((P.confirmed || []).length) + ' of ' + esc(P.guests) + ' guests confirmed</p>' +
      '<p class="t-b2">' + (P.complete ? 'Every active guest has a confirmed booking.' : 'The revenue above counts confirmed bookings only. It is not final while ' + open + ' guest' + (open === 1 ? ' is' : 's are') + ' open; it grows as bookings are confirmed (Recalculate now).') +
      (P.roomsReadable === false ? ' The room list could not be read: a room held without a saved Bag shows as "No booking yet".' : '') + '</p>' +
      '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Stage</th><th class="num">Guests</th><th>Who</th></tr></thead><tbody>' +
      ROWS.filter(function (r) { return r[0] !== 'unreadable' || (P.unreadable || []).length; }).map(function (r) {
        var l = P[r[0]] || [];
        return '<tr><td data-l="Stage">' + esc(r[1]) + '</td><td data-l="Guests" class="num">' + l.length + '</td><td data-l="Who"><span data-i18n-skip>' + esc(l.map(who).join(', ') || '—') + '</span></td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
  /* THE TWO NEW SECTIONS (Owners, 17 Nov 2026) read the same revenue calculation as "Revenue" — one request, one source */
  function revenueGate() {
    if (S.revenuePhase === 'loading' || S.revenuePhase === 'idle') return '<p class="t-b2 ab-progress" role="status">Calculating with the Billing Engine…</p>';
    if (S.revenuePhase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(S.revenueError) + '</p><div class="p-actions"><button type="button" class="p-link" data-ab-rev-reload>Try again</button></div></div>';
    return null;
  }
  /* ===================================================== FINANCE (Owners' review, 18 Nov 2026)
     One report in the order the Owners read it: A the executive summary, B budget against forecast, commitments and payments,
     C guest billing by class, revenue and receivables, D the Souphattra's financial performance (revenue, purchase, their difference), E what needs a decision or a correction — the
     line-by-line detail below, closed. Every figure is the server's (src/billing/finance-report.js · budget.js · revenue.js);
     budget, cash, revenue and the revenue − purchase difference are never mixed, and another currency is never added to USD. */
  function kpiBox(label, valueHtml, def, flag, cls) {
    return '<div class="p-card ab-kpi' + (cls ? ' ' + cls : '') + '"><p class="t-l1">' + esc(label) + '</p><p class="t-h1" data-i18n-skip>' + valueHtml + '</p>' +
      (flag ? '<p class="ab-flag">' + esc(flag) + '</p>' : '') + '<p class="ab-def">' + esc(def) + '</p></div>';
  }
  function kd(x) { return x && x.cents != null ? money(x.currency || 'USD', x.cents / 100) : (x && x.display ? x.display : '—'); }
  function curList(list) { return (list || []).length ? list.map(cash).join(' · ') : '—'; }
  function secH(letter, title, note) { return '<h2 class="ab-sec-h"><span class="ab-sec-n">' + letter + '</span> ' + esc(title) + (note ? ' <span class="ab-mute">' + esc(note) + '</span>' : '') + '</h2>'; }
  /* the USD equivalent of amounts kept in their own currency, at the Owners' reporting reference rates — always labelled */
  function eqWords(e) { return e && e.total && e.converted ? '≈ ' + kd(e.total) + ' (USD equivalent at the reference rates)' : ''; }
  /* THE EXECUTIVE SUMMARY (Owners' consolidated order, 19 Nov 2026): the wedding budget on 004 with its signs (the China trip apart),
     the Souphattra's accommodation revenue on its own, the other collections apart, the position on the guests' booked billing */
  var DIFF_LABEL = 'Accommodation Revenue – Hotel Purchase Cost Difference';
  function gb(rep) { return rep.guestBilling || null; }
  function finSummary(R, rep, D) {
    var cashv = rep.cash || {}, hp = rep.purchase || {}, pos = rep.position || {}, s4 = rep.budget004 || null, G = gb(rep), CH = rep.china || {};
    var incomplete = rep.forecastComplete === false ? (rep.forecastGaps || []).length + ' cost' + ((rep.forecastGaps || []).length === 1 ? '' : 's') + ' not yet known — see E' : '';
    var addl = hp.available && hp.confirmed ? { cents: hp.confirmed.additional.cents + hp.confirmed.supplement.cents } : null;
    var inSheet = hp.available && hp.recorded ? hp.recorded.additional.cents + hp.recorded.supplement.cents : null;
    var j2 = s4 && (s4.checks || []).filter(function (c) { return c.cell === 'J2'; })[0];
    var part = function (x, f) { return x && x[f] ? x[f] : null; };
    var gpart = G ? G.souphattra : null, notAll = G && G.complete === false ? 'not complete — see E' : '';
    var china004 = CH.costs004 ? 'in 004: ' + kd(CH.costs004.gross) + ' recorded, ' + kd(CH.costs004.neutralising) + ' neutralised, net ' + kd(CH.costs004.net) : '';
    return [
      ['approved', 'Approved wedding budget', rep.approved ? esc(usd(rep.approved.amount)) : '—', '004 · TOTAL BUDGET (' + ((rep.approved && rep.approved.cell) || 'A2') + '), the approved frame incl. its reserve', rep.approved ? '' : (rep.approvedWhy || '')],
      ['planned', 'Planned wedding project costs', esc(kd(rep.planned)), '004 net: every line with its sign — gross ' + kd(rep.plannedGross) + ', neutralising entries ' + kd(rep.plannedNeutralising) + '; the China trip apart' +
        (j2 ? ' · 004 ' + j2.cell + ' (the whole sheet, the China trip included at net ' + kd(s4.china && s4.china.net) + ') states ' + kd(j2.sheet) + (j2.equal ? ', equal to its lines' : '') : ''), s4 && !s4.reconciled ? '004\'s summary cells differ from its lines — see E' : ''],
      ['paid', 'Paid wedding project costs', esc(curList(rep.paid)), '007 · supplier payments counted (dated, typed), each in its own currency; the China trip\'s suppliers apart' + (rep.paidUsd && rep.paidUsd.converted ? ' · ' + eqWords(rep.paidUsd) : ''), ''],
      ['remaining', 'Remaining wedding budget', esc(rep.remainingBudget ? signed(rep.remainingBudget) : '—'), 'approved − forecast' + (rep.budgetLeftSheet ? ' · 004 ' + (rep.budgetLeftSheet.cell || 'F2') + ' "Budget left" states ' + signed(rep.budgetLeftSheet) + ' (approved − 004 net)' : ''), rep.remainingBudget && rep.remainingBudget.cents < 0 ? 'forecast above the approved budget' : ''],
      ['hotel', 'Additional hotel purchase costs', addl ? esc(usd(addl.cents / 100)) : '—', 'Souphattra · booked room nights outside the agreement (USD 150 per room night) and the additional-person charge (USD 60 per room night), confirmed bookings' +
        (inSheet != null ? ' · ' + usd(inSheet / 100) + ' already in 004' : ''), hp.available ? (hp.notIn004Parts && (hp.notIn004Parts.additional.cents + hp.notIn004Parts.supplement.cents) ? usd((hp.notIn004Parts.additional.cents + hp.notIn004Parts.supplement.cents) / 100) + ' not yet in 004 — proposed in E' : '') + (hp.pending && hp.pending.cents ? ' · ' + kd(hp.pending) + ' pending (held, not confirmed)' : '') : (hp.why || 'not available just now')],
      ['forecast', 'Forecast wedding project cost', esc(kd(rep.forecast)), 'planned (004 net) + the hotel costs of the confirmed bookings 004 does not hold yet' + (hp.notIn004 ? ' (' + kd(hp.notIn004) + ')' : '') + ' · gross ' + kd(rep.forecastGross), incomplete],
      ['variance', 'Wedding budget variance', esc(signed(rep.varianceToApproved)), 'forecast − approved budget', rep.varianceToApproved && rep.varianceToApproved.cents > 0 ? 'above the approved budget' : ''],
      ['souphattra', 'Souphattra Heritage – Accommodation Revenue', esc(kd(part(gpart, 'booked'))), 'every confirmed Souphattra room booking at its booked selling price — early arrival, wedding stay and any extended stay, special rates, extra persons and beds; no other hotel, no service', notAll],
      ['souInvoiced', 'Souphattra – invoiced', esc(kd(part(gpart, 'invoiced'))), 'its lines on the issued statements', ''],
      ['souReceived', 'Souphattra – received', esc(kd(part(gpart, 'received'))), 'its lines on statements paid in full (a partly paid statement is not allocated — see E)', ''],
      ['souOutstanding', 'Souphattra – outstanding', esc(kd(part(gpart, 'outstanding'))), 'its lines on unpaid statements', ''],
      ['pass', 'Pass-through collections', esc(kd(part(G && G.passThrough, 'booked'))), 'what the guests pay for services H&S passes on (the Temple Offering, the night train) — no contribution to the wedding budget; the China trip apart', ''],
      ['other', 'Other accommodation collections', esc(kd(part(G && G.other, 'booked'))), 'rooms of the other hotels in Thailand and Laos (U Sathorn, the Guest House) — not Souphattra revenue; the China trip apart', ''],
      ['china', 'China / private travel', esc(kd(G && G.china ? G.china.booked : null)), 'guests\' bookings of the China trip and its return (Kunming, Lijiang, the train, the flights, Hotel Muse) — outside the wedding budget' + (china004 ? ' · ' + china004 : ''), ''],
      ['total', 'Total guest billing', esc(kd(G && G.total ? G.total.booked : R.bookedRevenue)), 'the sum of the parts above (each line once) = booked guest billing ' + kd(R.bookedRevenue), G && G.total && R.bookedRevenue && G.total.booked && G.total.booked.cents !== R.bookedRevenue.cents ? 'differs from the booked figure — see E' : ''],
      ['received', 'Received guest payments', esc(kd(R.cashCollected)), 'all verified receipts (008); reported payments are not counted', ''],
      ['outstanding', 'Outstanding receivables', esc(kd(R.outstanding)), 'all issued, not yet paid', R.overdue && R.overdue.cents ? kd(R.overdue) + ' overdue' : ''],
      ['position', 'Projected wedding financial position', pos.stated ? esc(signed(pos.net)) : '—', 'the wedding\'s guest billing as booked (Souphattra ' + kd(pos.souphattra) + ' + other and pass-through collections ' + kd(pos.otherCollections) + ') − the gross forecast cost ' + kd(pos.forecastGross) + '; the China trip apart; negative = what H&S fund' +
        (pos.stated && pos.net004 ? ' · on 004\'s net view (Souphattra revenue − 004 net forecast): ' + signed(pos.net004) + ', the difference is the collections against 004\'s neutralising entries (E)' : ''), pos.stated ? (pos.complete === false ? 'rests on an incomplete forecast or billing' : '') : (pos.why || '')],
      ['owner', 'Owner cash still to provide', esc(kd(cashv.ownerStillToProvide)), cashv.formula || '', cashv.complete === false ? 'incomplete: ' + (cashv.why || []).join('; ') : ''],
    ];
  }
  function finCsv(kind) {
    var R = S.revenue, BG = R.budget || {}, rep = BG.report || {}, D = BG.dashboard || {}, fx = rep.reportingFx || {};
    var meta = [['Generated', nowStamp()], ['Data as of', (R.calculatedAt || '').slice(0, 16).replace('T', ' ') + ' UTC'],
      ['Currency', 'USD; THB and EUR kept in their own currency, each beside its USD equivalent at the reporting reference rates (1 USD = ' + (fx.USD_THB || 33.68) + ' THB · 1 USD = ' + (fx.USD_EUR || 0.89) + ' EUR) — a reference conversion, not a transaction rate'],
      ['Basis', 'costs: Google 004 with its signs (planned = net: positive lines less 004\'s neutralising entries; the China trip apart; approved budget) and 007 (committed, paid); forecast: 004 net + the hotel costs of the confirmed bookings 004 does not hold yet; revenue: the booking system — the Billing Engine, the issued statements and 008 (paying guests; the couple excluded), split into the Souphattra\'s accommodation revenue, other accommodation, pass-through collections and the China trip']];
    if (kind === 'finance-summary') {
      return csvDoc('See You In Laos — Financial Summary', meta, ['Figure', 'USD', 'THB', 'USD equivalent (reference rate)', 'Definition', 'Note'], finSummary(R, rep, D).map(function (k) {
        var hp = rep.purchase || {};
        var G = gb(rep) || {}, sp = G.souphattra || {};
        var m = { approved: rep.approved, planned: rep.planned, paid: null, remaining: rep.remainingBudget, hotel: hp.confirmed ? { cents: hp.confirmed.additional.cents + hp.confirmed.supplement.cents } : null,
          forecast: rep.forecast, variance: rep.varianceToApproved, souphattra: sp.booked, souInvoiced: sp.invoiced, souReceived: sp.received, souOutstanding: sp.outstanding,
          pass: (G.passThrough || {}).booked, other: (G.other || {}).booked, china: (G.china || {}).booked, total: G.total ? G.total.booked : R.bookedRevenue,
          received: R.cashCollected, outstanding: R.outstanding, position: (rep.position || {}).net, owner: (rep.cash || {}).ownerStillToProvide }[k[0]];
        var usdv = k[0] === 'paid' ? curOf(rep.paid, 'USD') : num(m);
        var thb = k[0] === 'paid' ? curOf(rep.paid, 'THB') : null;
        var eq = k[0] === 'paid' && rep.paidUsd && rep.paidUsd.total ? num(rep.paidUsd.total) : null;
        return [k[1], usdv, thb, eq, k[3], k[4]];
      }));
    }
    if (kind === 'reconciliation-004') return reconCsv(meta);
    var rows = (rep.byCategory || []).map(function (c) { return [c.category, num(c.gross), num(c.neutralising), num(c.planned), num(c.forecast), num(c.variance), curOf(c.committed, 'USD'), curOf(c.committed, 'THB'), c.committedUsd && c.committedUsd.total ? num(c.committedUsd.total) : null,
      curOf(c.paid, 'USD'), curOf(c.paid, 'THB'), c.paidUsd && c.paidUsd.total ? num(c.paidUsd.total) : null, (c.suppliers || []).join(', ')]; });
    rows.push(['The wedding (total)', num(rep.plannedGross), num(rep.plannedNeutralising), num(rep.planned), num(rep.forecast), rep.forecast && rep.planned ? (rep.forecast.cents - rep.planned.cents) / 100 : null, curOf(rep.committed, 'USD'), curOf(rep.committed, 'THB'),
      rep.committedUsd && rep.committedUsd.total ? num(rep.committedUsd.total) : null, curOf(rep.paid, 'USD'), curOf(rep.paid, 'THB'), rep.paidUsd && rep.paidUsd.total ? num(rep.paidUsd.total) : null, '']);
    rows.push(['Approved budget (004 ' + ((rep.approved && rep.approved.cell) || 'A2') + ', total only)', null, null, num(rep.approved), null, rep.varianceToApproved ? num(rep.varianceToApproved) : null, null, null, null, null, null, null, 'variance = forecast − approved']);
    var CH = rep.china || {}, c4 = CH.costs004 || {};
    rows.push(['China / private travel (outside the wedding budget)', num(c4.gross), num(c4.neutralising), num(c4.net), null, null, curOf(CH.committed, 'USD'), curOf(CH.committed, 'THB'), null, curOf(CH.paid, 'USD'), curOf(CH.paid, 'THB'), CH.paidUsd && CH.paidUsd.total ? num(CH.paidUsd.total) : null, (CH.suppliers || []).join(', ')]);
    return csvDoc('See You In Laos — Budget vs Actual / Forecast', meta.concat([['Actual', 'paid to suppliers (007); 004 "Actual USD" repeats the budget by formula and is not used'], ['Signs', 'gross = 004\'s positive lines; neutralised = its negative lines; planned = net, as 004\'s J2 adds them']]),
      ['004 category', 'Gross USD (004)', 'Neutralised USD (004)', 'Planned, net USD (004)', 'Forecast USD', 'Variance USD (forecast − planned)', 'Committed USD (007)', 'Committed THB (007)', 'Committed, USD equivalent (reference rate)', 'Paid USD (007)', 'Paid THB (007)', 'Paid, USD equivalent (reference rate)', '007 suppliers'], rows);
  }
  /* 004 RECONCILIATION & PROPOSED ADDITIONS (Owners' order, 18 Nov 2026): 004's hotel rows beside the booked rooms, then every exact
     entry 004 does not hold yet — for the Owners' approval; nothing is written to 004 from here */
  var RC_HEAD = ['Section', '004 row', 'Kind', 'Status', 'Stay', 'Room', 'Room category', 'Guests', 'Guest IDs', 'Check-in', 'Check-out', 'Nights', 'Rate USD', 'Qty', 'Amount USD', 'In forecast',
    '004 entry — Details', '004 entry — Date or period', 'Note'];
  var RC_KIND = { CONTRACT: 'hotel agreement', ADDITIONAL: 'additional room nights', SUPPLEMENT: 'additional-person charge' };
  function reconCsv(meta) {
    var hp = (S.revenue.budget.report || {}).purchase || {}, rows = [];
    (hp.rows004 || []).forEach(function (r) {
      rows.push(['004 row as written', r.row, RC_KIND[r.role] || r.role.toLowerCase(), r.role === 'CONTRACT' || r.role === 'ADDITIONAL' || r.role === 'SUPPLEMENT' ? (r.rest ? 'set, ' + usd(r.rest.cents / 100) + ' above the bookings' : 'set against the booked rooms') : 'not set — ' + (r.why || ''),
        (r.rooms || []).map(function (x) { return x.stay; }).filter(function (x, i, a) { return a.indexOf(x) === i; }).join(' + '), (r.rooms || []).length === 1 ? r.rooms[0].label : (r.rooms || []).length + ' rooms', (r.rooms || []).length === 1 ? r.rooms[0].type : '',
        '', '', '', '', r.nights, r.rate, r.qty, num(r.amount), 'yes (in 004)', r.details, r.periodText || '', '']);
    });
    (hp.proposals || []).forEach(function (x) {
      rows.push(['Proposed ' + (x.status === 'RAISE' ? 'correction' : 'addition'), (x.existing004 || []).join(', '), RC_KIND[x.kind], x.status === 'RAISE' ? 'raise the existing row' : 'new entry', x.stay, x.label || '', x.type,
        (x.guests || []).map(function (g) { return g.name || g.guestId; }).join(' + '), (x.guests || []).map(function (g) { return g.guestId; }).join(' + '), x.from, x.to, x.nights, x.rate ? x.rate.amount : null,
        x.suggested ? x.suggested.qty : null, num(x.total), x.confirmed ? 'yes (confirmed booking)' : 'no — pending (held, not confirmed)', x.suggested ? x.suggested.details : '', x.suggested ? x.suggested.period : '', 'awaiting the Owners\' approval — not written to 004']);
    });
    (hp.corrections || []).forEach(function (c) { rows.push(['Proposed text correction', c.row, 'Date or period', 'text only — no amount', '', '', '', '', '', c.from, c.to, c.nights, null, null, null, '', '', c.booked, c.text]); });
    return csvDoc('See You In Laos — 004 Reconciliation & Proposed Additions (Souphattra Heritage)', meta.concat([['Totals', hp.available ? 'booked purchase ' + kd(hp.totals.total) + ' (agreement ' + kd(hp.totals.contract) + ' · additional nights ' + kd(hp.totals.additional) + ' · additional-person charge ' + kd(hp.totals.supplement) + '); not yet in 004 ' + kd(hp.notIn004) + '; pending ' + kd(hp.pending) : (hp.why || 'not available')]]), RC_HEAD, rows);
  }
  function budgetTable(rep) {
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var sk = function (v) { return '<span data-i18n-skip>' + esc(kd(v)) + '</span>'; };
    var rows = (rep.byCategory || []).map(function (c) {
      return '<tr>' + cell('Category', esc(c.category) + (c.suppliers && c.suppliers.length ? '<span class="ab-id" data-i18n-skip>' + esc(c.suppliers.join(', ')) + '</span>' : '')) +
        cell('Gross (004)', sk(c.gross), 1) + cell('Neutralised (004)', '<span data-i18n-skip>' + esc(c.neutralising && c.neutralising.cents ? kd(c.neutralising) : '—') + '</span>', 1) +
        cell('Planned, net (004)', sk(c.planned), 1) + cell('Forecast', sk(c.forecast), 1) +
        cell('Variance', '<span data-i18n-skip class="' + (c.variance && c.variance.cents > 0 ? 'ab-neg' : '') + '">' + esc(c.variance && c.variance.cents ? signed(c.variance) : '—') + '</span>', 1) +
        cell('Committed (007)', '<span data-i18n-skip>' + esc(curList(c.committed)) + '</span>' + (c.committedAboveForecast ? ' <span class="ab-chip open">above the gross forecast by ' + esc(kd(c.committedAboveForecast)) + '</span>' : ''), 1) +
        cell('Paid (007)', '<span data-i18n-skip>' + esc(curList(c.paid)) + '</span>', 1) + '</tr>';
    }).join('');
    var tv = rep.forecast && rep.planned ? { currency: 'USD', amount: (rep.forecast.cents - rep.planned.cents) / 100 } : null;
    rows += '<tr class="ab-total">' + cell('Category', '<b>The wedding</b>') + cell('Gross (004)', '<b>' + sk(rep.plannedGross) + '</b>', 1) + cell('Neutralised (004)', '<b>' + sk(rep.plannedNeutralising) + '</b>', 1) +
      cell('Planned, net (004)', '<b>' + sk(rep.planned) + '</b>', 1) + cell('Forecast', '<b>' + sk(rep.forecast) + '</b>', 1) +
      cell('Variance', '<b data-i18n-skip>' + esc(signed(tv)) + '</b>', 1) + cell('Committed (007)', '<b data-i18n-skip>' + esc(curList(rep.committed)) + '</b>', 1) + cell('Paid (007)', '<b data-i18n-skip>' + esc(curList(rep.paid)) + '</b>', 1) + '</tr>';
    rows += '<tr>' + cell('Category', 'Approved budget <span class="ab-id">004 ' + esc((rep.approved && rep.approved.cell) || 'A2') + ' · set as a total only</span>') + cell('Gross (004)', '', 1) + cell('Neutralised (004)', '', 1) + cell('Planned, net (004)', '<span data-i18n-skip>' + esc(rep.approved ? usd(rep.approved.amount) : '—') + '</span>', 1) +
      cell('Forecast', '<span class="ab-mute">planned ' + esc(signed(rep.plannedVsApproved)) + '</span>', 1) + cell('Variance', '<span data-i18n-skip class="ab-neg">' + esc(signed(rep.varianceToApproved)) + '</span>', 1) + cell('Committed (007)', '', 1) + cell('Paid (007)', '', 1) + '</tr>';
    if ((rep.committedUsd && rep.committedUsd.converted) || (rep.paidUsd && rep.paidUsd.converted)) rows += '<tr>' + cell('Category', 'USD equivalent <span class="ab-id">at the reporting reference rates — a reference, not a transaction rate</span>') + cell('Gross (004)', '', 1) + cell('Neutralised (004)', '', 1) + cell('Planned, net (004)', '', 1) + cell('Forecast', '', 1) + cell('Variance', '', 1) +
      cell('Committed (007)', rep.committedUsd && rep.committedUsd.converted ? '<span data-i18n-skip>≈ ' + esc(kd(rep.committedUsd.total)) + '</span>' : '', 1) + cell('Paid (007)', rep.paidUsd && rep.paidUsd.converted ? '<span data-i18n-skip>≈ ' + esc(kd(rep.paidUsd.total)) + '</span>' : '', 1) + '</tr>';
    var CH = rep.china || {}, c4 = CH.costs004 || {};
    rows += '<tr>' + cell('Category', 'China / private travel <span class="ab-id">outside the wedding budget · ' + esc((CH.suppliers || []).join(', ') || 'no 007 supplier') + '</span>') + cell('Gross (004)', sk(c4.gross), 1) + cell('Neutralised (004)', sk(c4.neutralising), 1) +
      cell('Planned, net (004)', sk(c4.net), 1) + cell('Forecast', '<span class="ab-mute">not in the wedding forecast</span>', 1) + cell('Variance', '', 1) +
      cell('Committed (007)', '<span data-i18n-skip>' + esc(curList(CH.committed)) + '</span>', 1) + cell('Paid (007)', '<span data-i18n-skip>' + esc(curList(CH.paid)) + '</span>' + (CH.paidUsd && CH.paidUsd.converted ? '<span class="ab-why" data-i18n-skip>≈ ' + esc(kd(CH.paidUsd.total)) + '</span>' : ''), 1) + '</tr>';
    return '<div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>004 category</th><th class="num">Gross (004)</th><th class="num">Neutralised (004)</th><th class="num">Planned, net (004)</th><th class="num">Forecast</th><th class="num">Variance</th><th class="num">Committed (007)</th><th class="num">Paid (007)</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="t-b2 ab-mute">004 is read with its signs: gross = its positive lines; neutralised = its negative lines (004\'s own entries for a cost the hosts do not carry — a guest\'s own room or ticket, a private trip); planned = net, as 004\'s J2 adds them. Variance per category = forecast − planned; on the approved row, forecast − approved. ' +
      (rep.budgetLeftSheet ? '004 ' + esc(rep.budgetLeftSheet.cell || 'F2') + ' "Budget left" states ' + esc(signed(rep.budgetLeftSheet)) + '. ' : '') +
      'Actual = paid to suppliers (007); 004 "Actual USD" repeats the budget by formula and is not used. Forecast = planned + the hotel costs of the confirmed bookings 004 does not hold yet (E). A 007 commitment is set against the gross forecast. The China trip and its return (Kunming, Lijiang, their flights and Hotel Muse) are outside the wedding budget. ' +
      (rep.reportingFx ? 'THB and EUR stay in their own currency; their USD equivalent uses the reporting reference rates (1 USD = ' + esc(rep.reportingFx.USD_THB) + ' THB · 1 USD = ' + esc(rep.reportingFx.USD_EUR) + ' EUR).' : '') + '</p>';
  }
  function revenueSummary(R) {
    var row = function (label, v, cls, sign) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td data-l="">' + esc(label) + '</td><td data-l="USD" class="num"><span data-i18n-skip>' + esc(sign && v && v.cents ? signed({ currency: 'USD', amount: v.cents / 100 }) : kd(v)) + '</span></td></tr>'; };
    var rep = R.paymentsReported || {};
    var coupleReports = (R.couple || []).reduce(function (t, c) { return t + (c.journal || []).filter(function (x) { return x.status === 'REPORTED'; }).length; }, 0);
    return '<div class="ab-table-wrap"><table class="ab-table ab-fin"><tbody>' +
      row('Confirmed bookings (booked)', R.bookedRevenue, 'ab-total') + row('· invoiced (issued statements)', R.issuedRevenue) + row('· booked, not yet invoiced', R.notYetInvoiced) +
      row('· changed since issue (a revision is due)', R.changedSinceIssue, '', true) + row('· invoiced, no longer booked', R.invoicedNotBooked, '', true) +
      row('Payments reported by guests, not verified', rep) + row('Payments received (verified)', R.cashCollected, 'ab-total') + row('Outstanding receivables', R.outstanding) + row('· of which overdue', R.overdue) +
      '</tbody></table></div><p class="t-b2 ab-mute">Booked = invoiced + not yet invoiced + changes since issue − invoiced, no longer booked; nothing is adjusted to make them meet. Reported payments are never counted as received' +
      (coupleReports ? '; the couple\'s own ' + coupleReports + ' payment report' + (coupleReports === 1 ? '' : 's') + ' stay with their statement (E), apart from the guests' : '') +
      '. ' + (R.fxReference && !R.fxReference.error && R.fxReference.day ? 'Statements are issued at the project\'s exchange-rate reference (011 on ' + dmy(R.fxReference.day) + ': USD/THB ' + R.fxReference.FX_USD_THB + ', USD/EUR ' + R.fxReference.FX_USD_EUR + ') and keep the rates they were issued with. ' : '') +
      '<a href="/admin/billing#revenue" data-ab-tab="#revenue">Each guest\'s statement and payments → Revenue</a></p>';
  }
  /* C · THE GUESTS' BILLING BY CLASS (Owners' consolidated order, 19 Nov 2026) — each part without the China trip, the China trip apart:
     the parts add up to the total guest billing, nothing counted twice */
  function classesTable(G, R) {
    if (!G) return '<p class="t-b2 ab-mute">The split of the guests\' billing by class is not available just now — the totals below stand.</p>';
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var sk = function (v) { return '<span data-i18n-skip>' + esc(kd(v)) + '</span>'; };
    var row = function (label, sub, x, cls) { x = x || {}; return '<tr' + (cls ? ' class="' + cls + '"' : '') + '>' + cell('Part', '<b>' + esc(label) + '</b>' + (sub ? '<span class="ab-id">' + esc(sub) + '</span>' : '')) +
      cell('Booked', sk(x.booked), 1) + cell('Invoiced', sk(x.invoiced), 1) + cell('Received', sk(x.received), 1) + cell('Outstanding', sk(x.outstanding), 1) + '</tr>'; };
    var rows = row('Souphattra Heritage – Accommodation Revenue', 'the wedding\'s accommodation revenue — every Souphattra stay period', G.souphattra) +
      row('Other accommodation collections', 'U Sathorn, the Guest House — not Souphattra revenue', G.other) +
      row('Pass-through collections', 'the Temple Offering, the night train — collected and passed on', G.passThrough) +
      (G.notClassified && G.notClassified.booked && G.notClassified.booked.cents ? row('Guest services not classified yet', 'named in E', G.notClassified) : '') +
      row('China / private travel', 'Kunming, Lijiang, the train, the flights, Hotel Muse — outside the wedding budget', G.china) +
      row('Total guest billing', 'the parts above, each line once', G.total, 'ab-total');
    return '<div class="ab-table-wrap" data-ab-classes><table class="ab-table ab-fin"><thead><tr><th>Part of the guests\' billing</th><th class="num">Booked</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Outstanding</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="t-b2 ab-mute">The booking system\'s own lines, each in one part by its product — the booked selling prices exactly as the Billing Engine priced them, never a purchase rate. Received and outstanding follow each statement: paid in full, unpaid; a partly paid statement is invoiced by its lines, its payment is not allocated (named in E). ' +
      (G.complete === false ? '<b>Not complete just now — see E.</b> ' : '') + 'Gross billing and payments stay complete under Revenue.</p>';
  }
  /* the wedding's collections beside 004's neutralising entries — the difference between the position and 004's own net view */
  function collectionsTable(rep) {
    var list = rep.collectionsBeside004 || [];
    if (!list.length) return '';
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var sk = function (v) { return '<span data-i18n-skip>' + esc(kd(v)) + '</span>'; };
    var tn = 0, tb = 0;
    var rows = list.map(function (g) {
      tn += g.neutralising004 ? g.neutralising004.cents : 0; tb += g.booked ? g.booked.cents : 0;
      return '<tr>' + cell('Stay or service', '<span data-i18n-skip>' + esc(g.label) + '</span>' + (g.rows.length ? '<span class="ab-id" data-i18n-skip>004 row' + (g.rows.length === 1 ? ' ' : 's ') + esc(g.rows.join(', ')) + '</span>' : '<span class="ab-id">no 004 row</span>')) +
        cell('Neutralised in 004', sk(g.neutralising004), 1) + cell('Booked by the guests', sk(g.booked), 1) +
        cell('Difference', '<span data-i18n-skip class="' + (g.difference && g.difference.cents < 0 ? 'ab-neg' : '') + '">' + esc(g.difference && g.difference.cents ? signed(g.difference) : '—') + '</span>', 1) + '</tr>';
    }).join('');
    var pos = rep.position || {}, rnd = pos.differenceTo004 ? pos.differenceTo004.cents - (tb - tn) : 0;
    rows += '<tr class="ab-total">' + cell('Stay or service', '<b>Together</b>') + cell('Neutralised in 004', '<b>' + sk({ cents: tn }) + '</b>', 1) + cell('Booked by the guests', '<b>' + sk({ cents: tb }) + '</b>', 1) +
      cell('Difference', '<b data-i18n-skip>' + esc(signed({ currency: 'USD', amount: (tb - tn) / 100 })) + '</b>' + (rnd ? '<span class="ab-why">+ ' + esc(usd(rnd / 100)) + ' rounding — 004 rounds its own sum once</span>' : ''), 1) + '</tr>';
    return '<p class="t-l1 ab-bd-h">The wedding\'s collections beside 004\'s neutralising entries</p>' +
      '<div class="ab-table-wrap" data-ab-collections><table class="ab-table ab-fin"><thead><tr><th>Stay or service</th><th class="num">Neutralised in 004</th><th class="num">Booked by the guests</th><th class="num">Difference</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="t-b2 ab-mute">004 plans what the guests pay for these as its own negative rows; the booking system holds what they booked. The position counts the bookings (the truth for what guests pay); the difference is shown, never written to 004.</p>';
  }
  /* D · SOUPHATTRA HERITAGE – FINANCIAL PERFORMANCE (Owners' consolidated order, 19 Nov 2026): the accommodation revenue of every stay
     period against the hotel purchase (agreement, additional room nights, additional-person charges) — no other hotel, no service */
  function souphattraPerformance(rep) {
    var G = gb(rep) || {}, sp = G.souphattra || null, hp = rep.purchase || {}, T = hp.available ? hp.totals : null, CF = hp.available ? hp.confirmed : null;
    if (!sp && !T) return '';
    /* the confirmed purchase only — the agreement, and additional nights and charges of confirmed bookings (the forecast's own); a held
       room's cost is named apart, never in the difference */
    var cost = T && CF ? { currency: 'USD', cents: T.contract.cents + CF.additional.cents + CF.supplement.cents } : null;
    var d = sp && sp.booked && cost ? { currency: 'USD', amount: (sp.booked.cents - cost.cents) / 100, cents: sp.booked.cents - cost.cents } : null;
    var row = function (label, v, cls, note) { return '<tr' + (cls ? ' class="' + cls + '"' : '') + '><td data-l="">' + label + (note ? '<span class="ab-id">' + esc(note) + '</span>' : '') + '</td><td data-l="USD" class="num"><span data-i18n-skip>' + v + '</span></td></tr>'; };
    return '<div class="ab-table-wrap" data-ab-souphattra-fp><table class="ab-table ab-fin"><tbody>' +
      row('<b>Souphattra Heritage – Accommodation Revenue</b>', '<b>' + esc(kd(sp && sp.booked)) + '</b>', 'ab-total', 'every stay period, at the booked selling prices') +
      row('Original hotel contract cost', esc(kd(T && T.contract)), '', 'the agreement\'s rooms at its rate per room night, occupied or not') +
      row('Additional room-night cost', esc(kd(CF && CF.additional)), '', 'confirmed bookings outside the agreement, at the confirmed purchase rate per room night') +
      row('Additional-person hotel charges', esc(kd(CF && CF.supplement)), '', 'confirmed, per room per night') +
      row('<b>Total hotel purchase cost</b>', '<b>' + esc(kd(cost)) + '</b>', 'ab-total', 'confirmed bookings') +
      (hp.pending && hp.pending.cents ? row('Held, not confirmed — not counted', esc(kd(hp.pending)), '', 'a held room\'s additional nights or charge, counted once its booking is confirmed') : '') +
      row('<b>' + esc(DIFF_LABEL) + '</b>', '<b class="' + (d && d.cents < 0 ? 'ab-neg' : '') + '">' + esc(d ? signed(d) : '—') + '</b>', 'ab-total', 'revenue − hotel purchase cost; not a profit — the wedding\'s other costs are not in it') +
      row('Invoiced accommodation revenue', esc(kd(sp && sp.invoiced))) + row('Received accommodation payments', esc(kd(sp && sp.received))) + row('Outstanding accommodation receivables', esc(kd(sp && sp.outstanding))) +
      '</tbody></table></div>';
  }
  /* E · 004 WITH ITS SIGNS: the summary cells against the lines, and every neutralising entry with the row it mirrors */
  function signed004View(rep) {
    var s4 = rep.budget004;
    if (!s4) return '<p class="t-b2 ab-flag">004 could not be read with its signs just now.</p>';
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var checks = (s4.checks || []).map(function (c) {
      return '<tr>' + cell('004 cell', '<b data-i18n-skip>' + esc(c.cell) + '</b><span class="ab-id">' + esc(c.what) + '</span>') + cell('As 004 states it', '<span data-i18n-skip>' + esc(kd(c.sheet)) + '</span>', 1) +
        cell('Its lines', '<span data-i18n-skip>' + esc(kd(c.lines)) + '</span>', 1) + cell('', c.equal ? '<span class="ab-chip on">equal</span>' : '<span class="ab-chip open">differs by ' + esc(signed(c.difference)) + '</span>') + '</tr>';
    }).join('');
    var neg = (s4.lines || []).filter(function (l) { return l.sign === 'NEUTRALISING'; }).map(function (l) {
      return '<tr>' + cell('004 row', '<b data-i18n-skip>' + esc(l.row) + '</b>') + cell('Item', '<span data-i18n-skip>' + esc(l.item) + '</span><span class="ab-id" data-i18n-skip>' + esc(l.details || '') + '</span>') +
        cell('Amount', '<span data-i18n-skip>' + esc(kd(l.budget)) + '</span>', 1) + cell('Neutralises', l.mirror ? 'row <span data-i18n-skip>' + esc(l.mirror) + '</span>' : '<span class="ab-chip open">no row it mirrors</span>') +
        cell('Part', l.cls === 'CHINA' ? 'China / private travel' : 'the wedding') + '</tr>';
    }).join('');
    var W = s4.wedding || {}, C = s4.china || {};
    return '<p class="t-l1 ab-bd-h">004 with its signs</p>' +
      '<p class="t-b2">The wedding: gross <b data-i18n-skip>' + esc(kd(W.gross)) + '</b> − neutralised <span data-i18n-skip>' + esc(kd({ cents: -(W.neutralising || {}).cents })) + '</span> = net <b data-i18n-skip>' + esc(kd(W.net)) + '</b> · the China trip: gross <span data-i18n-skip>' + esc(kd(C.gross)) + '</span>, net <span data-i18n-skip>' + esc(kd(C.net)) + '</span> · ' +
        (s4.reconciled ? 'every summary cell meets its lines.' : '<b>a summary cell differs from its lines.</b>') + '</p>' +
      '<div class="ab-table-wrap" data-ab-signed004><table class="ab-table ab-fin"><thead><tr><th>004 cell</th><th class="num">As 004 states it</th><th class="num">Its lines</th><th></th></tr></thead><tbody>' + checks + '</tbody></table></div>' +
      (neg ? '<details class="ab-bd"><summary><b>004\'s neutralising entries</b> <span class="ab-mute">· ' + (s4.lines || []).filter(function (l) { return l.sign === 'NEUTRALISING'; }).length + ' rows</span></summary><div class="ab-bd-body"><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>004 row</th><th>Item</th><th class="num">Amount</th><th>Neutralises</th><th>Part</th></tr></thead><tbody>' + neg + '</tbody></table></div></div></details>' : '') +
      collectionsTable(rep);
  }
  function hotelTable(rep) {
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var tc = 0, tr = 0, ts = 0, allKnown = true;
    var rows = (rep.hotel || []).map(function (h) {
      tr += h.revenue ? h.revenue.cents : 0;
      if (h.cost) tc += h.cost.cents;
      if (h.surplus) ts += h.surplus.cents; else allKnown = false;
      var cp = h.costParts;
      var costWords = h.cost ? esc(kd(h.cost)) + (cp ? '<span class="ab-why">agreement ' + esc(kd(cp.contract)) + (cp.additional.cents ? ' · additional nights ' + esc(kd(cp.additional)) : '') + (cp.supplement.cents ? ' · additional-person ' + esc(kd(cp.supplement)) : '') + '</span>' : '') +
        ((h.held || []).length ? '<span class="ab-why">+ ' + h.held.length + ' held room' + (h.held.length === 1 ? '' : 's') + ' pending, not counted</span>' : '') +
        (h.costComplete || cp ? '' : '<span class="ab-why">+ ' + h.uncontracted.length + ' room' + (h.uncontracted.length === 1 ? '' : 's') + ' with guests not in the agreement — no purchase rate</span>')
        : '<span class="ab-mute">' + (h.costBasis === 'SUPPLIER_TOTAL_UNSTATED' ? '007: ' + esc(h.suppliers.map(function (x) { return cash(x.contract); }).join(' · ')) + ' — what it covers is not stated' : 'no contract') + '</span>';
      return '<tr>' + cell('Hotel', '<span data-i18n-skip>' + esc(h.place) + '</span><span class="ab-id" data-i18n-skip>' + esc(dmy(h.from)) + ' – ' + esc(dmy(h.to)) + (h.nights ? ' · ' + h.nights + ' night' + (h.nights === 1 ? '' : 's') : '') + '</span>') +
        cell('Rooms', esc(h.roomsAdditional != null ? h.roomsOccupied + ' with guests · ' + h.roomsBought + ' in the agreement' + (h.roomsAdditional ? ' + ' + h.roomsAdditional + ' additional' : '') : h.roomsBought != null ? h.roomsOccupied + ' of ' + h.roomsBought + ' bought' : h.roomsOccupied + ' with guests') + (h.rate ? '<span class="ab-id" data-i18n-skip>' + esc(kd(h.rate)) + ' per room night</span>' : ''), 1) +
        cell('Guests', esc(h.guests), 1) + cell('Hotel cost (purchase)', costWords, 1) + cell('Guest revenue (sale)', '<span data-i18n-skip>' + esc(kd(h.revenue)) + '</span>', 1) +
        cell('Revenue − hotel cost', '<span data-i18n-skip class="' + (h.surplus && h.surplus.cents < 0 ? 'ab-neg' : '') + '">' + esc(h.surplus ? signed(h.surplus) : '—') + '</span>', 1) + '</tr>';
    }).join('');
    rows += '<tr class="ab-total">' + cell('Hotel', '<b>All stays</b>') + cell('Rooms', '', 1) + cell('Guests', '', 1) + cell('Hotel cost (purchase)', '<b data-i18n-skip>' + esc(usd(tc / 100)) + '</b><span class="ab-why">stated costs only</span>', 1) +
      cell('Guest revenue (sale)', '<b data-i18n-skip>' + esc(usd(tr / 100)) + '</b>', 1) + cell('Revenue − hotel cost', '<b data-i18n-skip>' + esc(signed({ currency: 'USD', amount: ts / 100 })) + '</b><span class="ab-why">' + (allKnown ? 'every stay' : 'stays with a complete cost only') + '</span>', 1) + '</tr>';
    return '<div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Hotel and period</th><th class="num">Rooms</th><th class="num">Guests</th><th class="num">Hotel cost (purchase)</th><th class="num">Guest revenue (sale)</th><th class="num">' + esc(DIFF_LABEL) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="t-b2 ab-mute">Hotel cost (purchase) = what the hotel charges H&amp;S: the agreement for every room it buys (occupied or not), the confirmed bookings\' additional room nights at the Owners\' confirmed rate and the additional-person charge — never estimated, never a guest\'s price. Guest revenue (sale) = the booked room lines of the stay (the couple\'s own rooms at USD 0). ' + esc(DIFF_LABEL) + ' = guest accommodation revenue − hotel purchase cost of the same rooms, stated only where the cost is complete — not a profit: the wedding\'s other costs are not in it.</p>';
  }
  /* E · 004 RECONCILIATION (Owners' order, 18 Nov 2026): the hotel's 004 rows beside the booked rooms, the exact entries 004 does not hold
     yet (awaiting the Owners' approval — nothing is written to 004 from here) and the text corrections */
  function reconView(rep) {
    var hp = rep.purchase || {};
    if (!hp.available) return '<p class="t-b2 ab-flag">Souphattra Heritage: ' + esc(hp.why || 'the hotel\'s purchase costs could not be set beside 004 just now') + ' — 004 is counted as written.</p>';
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var setWords = function (r) {
      if (r.role === 'CONTRACT' || r.role === 'ADDITIONAL' || r.role === 'SUPPLEMENT') {
        var st = (r.rooms || []).map(function (x) { return x.stay; }).filter(function (x, i, a) { return a.indexOf(x) === i; });
        return esc(RC_KIND[r.role]) + ' · ' + ((r.rooms || []).length === 1 ? 'room ' + esc(r.rooms[0].label) + ' (' + esc(r.rooms[0].type) + ')' : (r.rooms || []).length + ' rooms') + ' · ' + esc(st.join(' + ')) +
          (r.rest ? '<span class="ab-why">' + esc(kd(r.rest)) + ' above the booked rooms — kept as written</span>' : '');
      }
      return '<span class="ab-chip open">not set</span> <span class="ab-why">' + esc(r.why || '') + '</span>';
    };
    var rows = (hp.rows004 || []).map(function (r) {
      return '<tr>' + cell('004 row', '<b data-i18n-skip>' + esc(r.row) + '</b>') + cell('As written in 004', '<span data-i18n-skip>' + esc(r.details || r.item) + '</span><span class="ab-id" data-i18n-skip>' + esc((r.rate != null ? 'USD ' + r.rate : '') + ' × ' + (r.qty != null ? r.qty : '—') + ' × ' + (r.nights != null ? r.nights : '—') + (r.periodText ? ' · ' + r.periodText : '')) + '</span>') +
        cell('Amount', '<span data-i18n-skip>' + esc(kd(r.amount)) + '</span>', 1) + cell('Set against the bookings', setWords(r)) + '</tr>';
    }).join('');
    var props = (hp.proposals || []).map(function (x) {
      var who = (x.guests || []).map(function (g) { return (g.name || g.guestId) + ' (' + g.guestId + ')'; }).join(', ');
      return '<tr>' + cell('Entry', '<b>' + esc(RC_KIND[x.kind]) + '</b><span class="ab-id" data-i18n-skip>' + esc(x.place + (x.label ? ' · room ' + x.label : '') + ' · ' + x.type) + '</span>' + (who ? '<span class="ab-id" data-i18n-skip>' + esc(who) + '</span>' : '')) +
        cell('Dates · nights', '<span data-i18n-skip>' + esc(dmy(x.from)) + ' – ' + esc(dmy(x.to)) + ' · ' + esc(x.nights) + '</span>') +
        cell('Rate', '<span data-i18n-skip>' + esc(kd(x.rate)) + '</span><span class="ab-id">' + (x.kind === 'SUPPLEMENT' ? 'per room night' : 'per room night') + '</span>', 1) +
        cell('Amount', '<b data-i18n-skip>' + esc(kd(x.total)) + '</b>', 1) +
        cell('Suggested 004 entry', '<span data-i18n-skip>' + esc(x.suggested ? x.suggested.details + ' · ' + x.suggested.rate + ' × ' + x.suggested.qty + ' × ' + x.suggested.nights + ' = ' + x.suggested.budget + ' · ' + x.suggested.period : '') + '</span>') +
        cell('Status', (x.status === 'RAISE' ? 'raise 004 row ' + esc((x.existing004 || []).join(', ')) : 'new entry') + (x.confirmed ? '' : ' <span class="ab-chip open">pending — held, not confirmed</span>')) + '</tr>';
    }).join('');
    var tp = (hp.proposals || []).filter(function (x) { return x.confirmed; }).reduce(function (t, x) { return t + x.total.cents; }, 0);
    if (props) props += '<tr class="ab-total">' + cell('Entry', '<b>Not yet in 004 (confirmed bookings)</b>') + cell('Dates · nights', '') + cell('Rate', '', 1) + cell('Amount', '<b data-i18n-skip>' + esc(usd(tp / 100)) + '</b>', 1) + cell('Suggested 004 entry', '') + cell('Status', '') + '</tr>';
    return '<p class="t-l1 ab-bd-h">Souphattra Heritage · the bookings beside 004</p>' +
      '<p class="t-b2">Booked hotel purchase <b data-i18n-skip>' + esc(kd(hp.totals.total)) + '</b> = agreement ' + esc(kd(hp.totals.contract)) + ' + additional room nights ' + esc(kd(hp.totals.additional)) + ' + additional-person charge ' + esc(kd(hp.totals.supplement)) +
        ' · 004 holds ' + esc(usd((hp.rows004 || []).reduce(function (t, r) { return t + r.amount.cents; }, 0) / 100)) + ' (row' + ((hp.rows004 || []).length === 1 ? ' ' : 's ') + esc((hp.rows004 || []).map(function (r) { return r.row; }).join(', ')) + ')' +
        ' · <b>not yet in 004: <span data-i18n-skip>' + esc(kd(hp.notIn004)) + '</span></b>' + (hp.pending && hp.pending.cents ? ' · pending (held): ' + esc(kd(hp.pending)) : '') + '</p>' +
      (rows ? '<div class="ab-table-wrap" data-ab-recon><table class="ab-table ab-fin"><thead><tr><th>004 row</th><th>As written in 004</th><th class="num">Amount</th><th>Set against the bookings</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '') +
      '<p class="t-l1 ab-bd-h">Proposed 004 additions · awaiting your approval</p>' +
      (props ? '<div class="ab-table-wrap" data-ab-proposals><table class="ab-table ab-fin"><thead><tr><th>Entry</th><th>Dates · nights</th><th class="num">Rate</th><th class="num">Amount</th><th>Suggested 004 entry</th><th>Status</th></tr></thead><tbody>' + props + '</tbody></table></div>' +
        '<p class="t-b2 ab-mute">Each entry is a hotel purchase cost of a booked room that 004 does not hold yet — already counted in the forecast (confirmed bookings only). Nothing is written to 004 from here: once you approve, the entries are added through the authorised Google integration and this report refreshes. A 004 entry written as suggested (the guests\' first names in brackets) is recognised and never counted twice.</p>'
        : '<p class="t-b2">None — 004 holds every hotel cost of the booked rooms.</p>') +
      ((hp.corrections || []).length ? '<p class="t-l1 ab-bd-h">Proposed 004 text corrections · no amount changes</p><ul class="t-b2">' + hp.corrections.map(function (c) { return li(c.text); }).join('') + '</ul>' : '');
  }
  var EX_KIND = [['DECISION', 'Your decisions', 'open'], ['DATA', 'Data to complete or correct', ''], ['INFO', 'For information', '']];
  function exceptionsView(R, rep) {
    var list = rep.exceptions || [];
    var groups = EX_KIND.map(function (k) {
      var xs = list.filter(function (e) { return e.kind === k[0]; });
      return xs.length ? '<p class="t-l1 ab-bd-h">' + esc(k[1]) + ' · ' + xs.length + '</p><ul class="ab-ex">' + xs.map(function (e) {
        return '<li><span class="ab-chip ' + k[2] + '">' + esc(e.area) + '</span><span data-i18n-skip>' + esc(e.text) + '</span>' +
          (e.ifAccepted ? ' <span class="ab-mute">Forecast if accepted: ' + esc(kd(e.ifAccepted)) + '.</span>' : '') + '</li>';
      }).join('') + '</ul>' : '';
    }).join('');
    return groups + revisionsView(R);
  }
  /* one detail that cannot be shown says so in its place — the report around it stands */
  function guarded(fn, fallback) { try { return fn(); } catch (e) { return fallback !== undefined ? fallback : '<p class="t-b2 ab-mute">This detail could not be shown just now.</p>'; } }
  function financeTabView() {
    var g = revenueGate(); if (g) return g;
    var R = S.revenue, BG = R.budget || {}, rep = BG.report || {}, D = BG.dashboard || {};
    if (BG.available === false || !rep.version) {
      return '<section class="ab-sec" aria-label="Finance"><div class="p-card ab-panel"><p class="t-b2">' + esc(BG.gap || rep.error || 'The finance report is not available just now.') + '</p></div>' +
        '<p class="t-l1 ab-bd-h">Guest revenue and receivables</p>' + revenueSummary(R) + revisionsView(R) + progressView(R.bookingProgress) + '</section>';
    }
    var asOf = (R.calculatedAt || '').slice(0, 16).replace('T', ' ');
    var kpis = finSummary(R, rep, D).map(function (k) { return kpiBox(k[1], k[2], k[3], k[4], k[0] === 'variance' && rep.varianceToApproved && rep.varianceToApproved.cents > 0 ? 'ab-kpi-warn' : ''); }).join('');
    var fx = R.fxReference || {};
    var sources = [
      'Costs: Google 004_Budget_Finance — ' + (BG.reconciliation && BG.reconciliation.budget004 ? BG.reconciliation.budget004.readable + ' of ' + BG.reconciliation.budget004.lines + ' lines read' : 'read') + '; approved budget = 004 TOTAL BUDGET; planned = every positive 004 line; remaining = 004 BUDGET LEFT as stated.',
      'Forecast: planned (004) + the hotel purchase of the confirmed bookings that 004 does not hold yet — the Souphattra agreement (USD 8,100: 26 rooms, 54 room nights, USD 150), additional room nights at USD 150 and the additional-person charge of USD 60 per room night (the Owners, 18 Nov 2026); 004\'s own rows are never reduced or replaced; nothing else is assumed.',
      'Commitments and supplier payments: Google 007 as typed (a payment counts when dated and typed), each in its own currency.',
      'Categories of 007 suppliers: ' + (rep.byCategory || []).filter(function (c) { return (c.suppliers || []).length; }).map(function (c) { return c.category + ' — ' + c.suppliers.join(', '); }).join('; ') + '.',
      'Guest revenue, receivables and receipts: the booking system — the Billing Engine with the confirmed booked prices exactly as stored, the issued statements and 008; paying guests only; the couple\'s own bookings are complimentary. 009 never overrides a confirmed booking price; no revenue comes from a Google sheet.',
      'Hotel cost per room: the agreement\'s rate, or additional nights at the confirmed purchase rate, × the stay\'s nights; the additional-person charge per room per night; hotel room numbers: the Souphattra Heritage\'s official room list, assigned to its rooms by the Owners (a suite of two numbers is one room; other hotels have supplied no numbers) — never above the bookings.',
      'Currencies: amounts keep their own currency; a USD equivalent at the reporting reference rates (1 USD = ' + ((rep.reportingFx || {}).USD_THB || 33.68) + ' THB · 1 USD = ' + ((rep.reportingFx || {}).USD_EUR || 0.89) + ' EUR) is shown beside them, labelled. Statements keep the exchange rates they were issued with' + (fx.day ? ' (011 on ' + dmy(fx.day) + ': USD/THB ' + fx.FX_USD_THB + ', USD/EUR ' + fx.FX_USD_EUR + ')' : '') + '.',
      (BG.version || '') + ' · ' + (rep.version || '') + ' · engine ' + (R.engineVersion || '') + ' · calculated ' + asOf + ' UTC'];
    var open = function (id) { return S.budgetOpen && S.budgetOpen[id] ? ' open' : ''; };
    var inv = guarded(function () { return inventoryView(R); }, null);
    return '<section class="ab-sec ab-report" aria-label="Finance">' +
      '<div class="ab-print-head"><p class="t-l1">See You In Laos · Financial Summary</p><p class="t-b2">Printed ' + esc(nowStamp()) + ' · data as of ' + esc(asOf) + ' UTC · USD (THB / EUR in their own currency, USD equivalents at the reporting reference rates, labelled) · costs 004/007, revenue: the booking system</p></div>' +
      exportBar([['finance-summary', 'CSV · financial summary'], ['budget-vs-actual', 'CSV · budget vs actual / forecast'], ['reconciliation-004', 'CSV · 004 reconciliation & proposed additions']], '<button type="button" class="ab-filter" data-ab-print>Print / save as PDF</button>') +
      '<p class="t-b2 ab-mute">Calculated live ' + esc(asOf) + ' UTC · all amounts USD unless named · <button type="button" class="p-link" data-ab-rev-reload>Recalculate now</button></p>' +
      secH('A', 'Executive summary') + '<div class="ab-kpis ab-exec" data-ab-exec>' + kpis + '</div>' +
      secH('B', 'Budget vs actual and forecast', 'by 004 category') + '<div data-ab-budget-vs>' + budgetTable(rep) + '</div>' +
      secH('C', 'Guest billing by class, revenue and receivables') + '<div data-ab-fin-classes>' + guarded(function () { return classesTable(gb(rep), R); }) + '</div>' + '<div data-ab-fin-revenue>' + revenueSummary(R) + '</div>' +
      secH('D', 'Souphattra Heritage – Financial Performance', 'accommodation revenue · hotel purchase cost · the difference') + '<div data-ab-hotels>' + guarded(function () { return souphattraPerformance(rep); }) +
        '<p class="t-l1 ab-bd-h">Per hotel and period</p>' + hotelTable(rep) + '</div>' +
      secH('E', 'Reconciliation and exceptions') + '<div data-ab-signed>' + guarded(function () { return signed004View(rep); }) + '</div>' + '<div data-ab-reconciliation>' + guarded(function () { return reconView(rep); }) + '</div>' + '<div data-ab-exceptions>' + exceptionsView(R, rep) + '</div>' +
      '<p class="t-l1 ab-bd-h">Detail</p>' +
      '<details class="ab-bd" data-ab-bd="fin-budget"' + open('fin-budget') + '><summary><b>Budget detail</b> <span class="ab-mute">· 004 and 007 line by line, per stay and route</span></summary><div class="ab-bd-body">' + guarded(function () { return budgetView(BG); }) + '</div></details>' +
      (inv != null ? '<details class="ab-bd" data-ab-bd="fin-inventory"' + open('fin-inventory') + '><summary><b>Inventory beside the budget</b> <span class="ab-mute">· counted bookings and 004\'s planned quantities</span></summary><div class="ab-bd-body"><div data-ab-inventory>' + inv + '</div></div></details>' : '') +
      '<details class="ab-bd" data-ab-bd="fin-progress"' + open('fin-progress') + '><summary><b>Booking progress</b> <span class="ab-mute">· ' + esc(((R.bookingProgress || {}).confirmed || []).length) + ' of ' + esc((R.bookingProgress || {}).guests || '—') + ' guests confirmed</span></summary><div class="ab-bd-body">' + progressView(R.bookingProgress) + '</div></details>' +
      '<details class="ab-bd" data-ab-bd="fin-sources"' + open('fin-sources') + '><summary><b>Sources and definitions</b></summary><div class="ab-bd-body"><ul class="t-b2 ab-mute">' + sources.map(li).join('') + '</ul></div></details>' +
      '</section>';
  }
  /* ===================================================== ROOMS & RATES (Owners' review, 18 Nov 2026)
     Per hotel and period: every room with guests — its hotel room number (the official list), category, guests and their status, check-in,
     check-out, nights, the hotel's cost where an agreement buys it, what its guests pay and the surplus; subtotals; the rooms
     without guests; then the hotel's rate list (unchanged: generated, approved by version, its own CSV). */
  /* THE OPERATIONAL ROOMING LIST (Owners' order, 18 Nov 2026): live from the booking system — one row per guest and stay; the room's
     hotel purchase (agreement or additional nights, the additional-person charge, the 004 row holding it) on the room's first guest
     row only, so a sum in Excel never counts a room twice; the guest's own booked line beside it. No code, no token. */
  var RM_HEAD = ['Stay', 'Hotel', 'Room', 'Room category', 'Hotel room no.', 'Building', 'Guest ID', 'Guest', 'Invitation', 'Booking ID', 'Booking status',
    'Check-in', 'Check-out', 'Nights', 'Extra bed', 'Agreement nights (room)', 'Additional nights (room)', 'Hotel purchase rate USD per room night', 'Hotel purchase cost USD (room)',
    'Additional-person charge USD (room)', 'Hotel cost in 004 (room)', 'Guest rate USD per night', 'Guest booked amount USD', 'Complimentary', 'Statement no.', 'Invoice status', 'Payment status'];
  /* where 004 holds a room's hotel cost, in words: its row, or "not in 004" (a proposed addition — Finance · E) */
  function in004Words(u) {
    var w = u.hotelIn004; if (!w) return '';
    var parts = [], held = u.hotelStatus === 'HELD';
    var say = function (what, rows, has, pending) { if (has) parts.push(what + ': ' + (rows.length ? '004 row ' + rows.join(', ') : pending ? 'pending (held, not confirmed)' : 'not in 004 — proposed')); };
    say('agreement', w.contract || [], u.hotelCostBasis === 'CONTRACT', false);
    say('additional nights', w.additional || [], u.hotelCostBasis === 'ADDITIONAL', held);
    say('additional-person charge', w.supplement || [], !!u.hotelSupplement, u.hotelSupplementStatus === 'HELD');
    return parts.join(' · ');
  }
  function roomingCsv() {
    var R = S.revenue, BG = R.budget || {}, rows = [];
    var hs = {}, byInv = {}; ((S.overview && S.overview.holders) || []).forEach(function (h) { hs[h.guestId] = h; byInv[h.Holder_ID] = h; });
    var idx = guestRooms() || {};
    (BG.roomPlan || []).forEach(function (p) {
      (p.rooms || []).forEach(function (u) {
        var first = true, n = nightsBetweenDays(p.from, p.to), N = u.hotelNights || {};
        (u.occupants || []).forEach(function (o) {
          if (!o.guestId) return;
          var x = (idx[o.guestId] || []).filter(function (y) { return y.stay === p.stay && y.label === u.label && y.type === u.type; })[0] || { line: null };
          var l = x.line, h = hs[o.guestId] || {}, payer = l && byInv[l.payer], pay = payer && payer.payment;
          var room = first ? [N.contract != null ? N.contract : '', N.additional != null ? N.additional : '', u.hotelCost && n ? u.hotelCost.cents / 100 / n : null, u.hotelCost ? num(u.hotelCost) : null,
            u.hotelSupplement ? num(u.hotelSupplement) : null, in004Words(u)] : ['', '', null, null, null, ''];
          rows.push([p.stay, p.place, u.label, u.type, u.hotelRoom ? u.hotelRoom.display : '', u.hotelRoom ? u.hotelRoom.building : '', o.guestId, o.name || '', h.Holder_ID || '', l && l.bookingId ? l.bookingId : '', h.billingAdmin ? 'the couple\'s own room' : l ? 'confirmed' : 'held, not confirmed',
            p.from || '', p.to || '', n, o.bed ? 'yes' : ''].concat(room, [l && l.rate && l.rateBasis === 'PER_PERSON_PER_NIGHT' ? num(l.rate) : null, l && l.amount ? num(l.amount) : null, compWords(h, x),
            l && l.statement ? l.statement : '', l ? (l.statement ? 'invoiced' : 'not yet invoiced') : '', pay ? (PAY[pay.status] || pay.status || '') : '']));
          first = false;
        });
      });
    });
    return csvDoc('See You In Laos — Hotel Rooming List', [['Generated', nowStamp()], ['Data as of', (R.calculatedAt || '').slice(0, 16).replace('T', ' ') + ' UTC'], ['Currency', 'USD'],
      ['Basis', 'the booking system, live: the Rooms engine (held, sent or confirmed alike) and the Billing Engine\'s booked lines; hotel purchase = the hotel agreement (USD 150 per room night) or additional room nights at the Owners\' confirmed purchase rate, and the additional-person charge — on the room\'s first guest row only; the guest columns are the guest\'s own booked line (selling price), never the purchase; Room = the booking system\'s allocation label; hotel room no. and building: the Souphattra Heritage\'s official room list, assigned to its rooms by the Owners (a suite of two numbers is one room; other hotels have supplied no numbers)']], RM_HEAD, rows);
  }
  function roomsTabView() {
    var g = revenueGate(); if (g) return g;
    var BG = S.revenue.budget || {};
    if (BG.available === false) return '<div class="p-card ab-panel"><p class="t-b2">' + esc(BG.gap || 'Not available just now.') + '</p></div>';
    var rep = BG.report || {}, perf = {}; (rep.hotel || []).forEach(function (h) { perf[h.stay] = h; });
    var m012 = rep.rooms012 || {};
    var hs = {}; ((S.overview && S.overview.holders) || []).forEach(function (h) { hs[h.guestId] = h; });
    var html = (BG.roomPlan || []).map(function (p) {
      var c = (BG.centres || []).filter(function (x) { return x.id === p.stay; })[0] || { rooms: [] };
      var lines = {}; (c.rooms || []).forEach(function (r) { (r.lines || []).forEach(function (l) { lines[(r.item || l.item) + '|' + r.label + '|' + l.person] = l; }); });
      var h = perf[p.stay] || {}, n = nightsBetweenDays(p.from, p.to);
      var sumCost = 0, sumSale = 0, costKnown = true, guests = 0;
      var occ = p.rooms.filter(function (r) { return r.occupants.some(function (o) { return o.guestId; }); });
      var rows = occ.map(function (r) {
        var sale = 0, who = r.occupants.map(function (o) {
          if (o.kept) return '<span class="ab-mute">a place kept for a party</span>';
          guests++;
          var l = lines[r.item + '|' + r.label + '|' + o.guestId]; if (l && l.amount) sale += l.amount.cents;
          var x = { line: l || null }, cw = compWords(hs[o.guestId], x);
          return '<span class="ab-stay"><span data-i18n-skip>' + esc(o.name || o.guestId) + '</span> <span class="ab-id" data-i18n-skip>' + esc(o.guestId) + '</span>' +
            '<span class="ab-mute"> ' + esc(roomStatus(x, hs[o.guestId])) + (l && l.statement ? ' · ' + esc(l.statement) : '') + (l && l.amount ? ' · ' + esc(usd(l.amount.cents / 100)) + (l.rateSource ? ' (' + esc(l.rateSource) + ')' : '') : '') + '</span>' +
            (o.bed ? ' <span class="ab-chip">extra bed</span>' : '') + (cw ? ' <span class="ab-chip on">' + esc(cw) + '</span>' : '') + '</span>';
        }).join('');
        /* the room's hotel purchase as the server sets it: the agreement's or the additional nights', plus the additional-person charge;
           a room only held (not confirmed) is shown, its additional cost pending — not in the subtotal */
        var heldRoom = r.hotelStatus === 'HELD' && r.hotelCostBasis !== 'CONTRACT', heldSup = !!r.hotelSupplement && r.hotelSupplementStatus === 'HELD', held = heldRoom || heldSup;
        var cost = r.hotelCost ? r.hotelCost.cents + (r.hotelSupplement ? r.hotelSupplement.cents : 0) : null;
        /* the subtotal counts what Finance · D counts: the agreement, confirmed additional nights, a confirmed extra person's charge */
        if (cost == null) costKnown = false; else sumCost += (heldRoom ? 0 : r.hotelCost.cents) + (r.hotelSupplement && !heldSup ? r.hotelSupplement.cents : 0);
        sumSale += sale;
        var N = r.hotelNights || {}, rate = r.hotelCost && n ? r.hotelCost.cents / 100 / n : null;
        var basis = r.hotelCostBasis === 'CONTRACT' ? 'agreement · ' + (N.contract || n) + ' nights × ' + usd(rate) : r.hotelCostBasis === 'ADDITIONAL' ? 'additional · ' + (N.additional || n) + ' nights × ' + usd(rate) : '';
        var costHtml = cost == null ? '<span class="ab-mute">no purchase rate</span>' : esc(usd(cost / 100)) + '<span class="ab-why">' + esc(basis) + (r.hotelSupplement ? ' · + ' + esc(usd(r.hotelSupplement.cents / 100)) + ' additional-person charge' : '') + '</span>' +
          '<span class="ab-why">' + esc(in004Words(r)) + '</span>' + (held ? ' <span class="ab-chip open">pending</span>' : '');
        var hr = r.hotelRoom, no = hr ? (hr.suite ? 'suite ' : 'hotel room ') + '<b data-i18n-skip>' + esc(hr.display) + '</b> <span class="ab-mute" data-i18n-skip>· building ' + esc(hr.building) + '</span>' : '<span class="ab-mute">—</span>';
        var places = r.occupants.filter(function (o) { return o.guestId; }).length;
        return '<tr><td data-l="Room">Room ' + esc(r.label) + '<span class="ab-id">' + no + '</span></td><td data-l="Category" data-i18n-skip>' + esc(r.type || r.item || '') + '</td>' +
          '<td data-l="Occupancy" class="num">' + esc(places + ' / ' + r.places) + (r.extraBeds ? ' <span class="ab-id">+ ' + esc(r.extraBeds) + ' extra bed</span>' : '') + '</td>' +
          '<td data-l="Guests">' + who + '</td><td data-l="Check-in" data-i18n-skip>' + esc(dmy(p.from)) + '</td><td data-l="Check-out" data-i18n-skip>' + esc(dmy(p.to)) + '</td><td data-l="Nights" class="num">' + esc(n == null ? '—' : n) + '</td>' +
          '<td data-l="Hotel cost (purchase)" class="num"><span data-i18n-skip>' + costHtml + '</span></td>' +
          '<td data-l="Guest revenue (sale)" class="num"><span data-i18n-skip>' + esc(usd(sale / 100)) + '</span></td>' +
          '<td data-l="Revenue − hotel cost" class="num"><span data-i18n-skip class="' + (cost != null && sale < cost ? 'ab-neg' : '') + '">' + (cost == null || held ? '—' : esc(signed({ currency: 'USD', amount: (sale - cost) / 100 }))) + '</span></td></tr>';
        /* (a held cost is shown, marked pending; its surplus is not stated) */
      }).join('');
      var sub = rows ? '<tr class="ab-total"><td data-l="Room"><b>' + occ.length + ' room' + (occ.length === 1 ? '' : 's') + ' with guests</b></td><td data-l="Category"></td><td data-l="Occupancy" class="num"><b>' + guests + '</b></td><td data-l="Guests"></td><td data-l="Check-in"></td><td data-l="Check-out"></td><td data-l="Nights"></td>' +
        '<td data-l="Hotel cost (purchase)" class="num"><b data-i18n-skip>' + esc(usd(sumCost / 100)) + '</b>' + (costKnown ? '' : '<span class="ab-why">rooms with a purchase rate</span>') + '</td><td data-l="Guest revenue (sale)" class="num"><b data-i18n-skip>' + esc(usd(sumSale / 100)) + '</b></td>' +
        '<td data-l="Revenue − hotel cost" class="num"><b data-i18n-skip>' + (costKnown ? esc(signed({ currency: 'USD', amount: (sumSale - sumCost) / 100 })) : '—') + '</b></td></tr>' : '';
      var byType = {}; p.rooms.filter(function (r) { return !r.occupants.some(function (o) { return o.guestId; }); }).forEach(function (r) { (byType[r.type || r.key] = byType[r.type || r.key] || []).push(r.label + (r.occupants.length ? ' (a place kept for a party)' : '')); });
      var empty = Object.keys(byType).map(function (t) { return t + ': ' + byType[t].join(', '); });
      /* the room type as 012 is matched (src/billing/finance-report.js · roomTypeKey): "The", "(…)" and "Suite" aside */
      var typeKey = function (t) { return String(t || '').trim().toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/^the\s+/, '').replace(/\bsuite\b/g, ' ').replace(/\s+/g, ' ').trim(); };
      var free012 = (m012.free || []).filter(function (f) { return Object.keys(byType).some(function (t) { return typeKey(t) === f.roomType; }); });
      var head = esc(p.place || p.stay) + ' · ' + esc(dmy(p.from)) + ' – ' + esc(dmy(p.to)) + (n ? ' · ' + n + ' night' + (n === 1 ? '' : 's') : '') +
        ' <span class="ab-mute">· ' + occ.length + ' room' + (occ.length === 1 ? '' : 's') + ' with guests' + (h.roomsBought != null ? ' · ' + h.roomsBought + ' in the agreement' + (h.roomsAdditional ? ' + ' + h.roomsAdditional + ' additional' : '') : '') + ' · ' + guests + ' guest' + (guests === 1 ? '' : 's') +
        (h.cost ? ' · hotel ' + esc(kd(h.cost)) : '') + ' · guests ' + esc(kd(h.revenue)) + (h.surplus ? ' · revenue − hotel cost ' + esc(signed(h.surplus)) : '') + '</span>';
      return '<details class="ab-bd" data-ab-rooms="' + esc(p.stay) + '"' + (S.budgetOpen && S.budgetOpen['rooms-' + p.stay] != null ? (S.budgetOpen['rooms-' + p.stay] ? ' open' : '') : (/^D1$|^C$/.test(p.stay) ? ' open' : '')) + ' data-ab-bd="rooms-' + esc(p.stay) + '"><summary data-i18n-skip>' + head + '</summary><div class="ab-bd-body">' +
        (rows ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Room · hotel room no.</th><th>Category</th><th class="num">Occupancy</th><th>Guests · status · sale price</th><th>Check-in</th><th>Check-out</th><th class="num">Nights</th><th class="num">Hotel cost (purchase)</th><th class="num">Guest revenue (sale)</th><th class="num">' + esc(DIFF_LABEL) + '</th></tr></thead><tbody>' + rows + sub + '</tbody></table></div>' : '<p class="t-b2">No guests yet.</p>') +
        (h.emptyBought ? '<p class="t-b2">The agreement also buys ' + h.emptyBought + ' room' + (h.emptyBought === 1 ? '' : 's') + ' without guests (' + esc(usd(h.emptyBought * (h.rate ? h.rate.amount : 0) * (n || 0))) + '); the stay\'s hotel cost ' + esc(kd(h.cost)) + ' counts every room it buys.</p>' : '') +
        (h.uncontracted && h.uncontracted.length && h.roomsBought != null ? '<p class="t-b2 ab-flag">' + h.uncontracted.length + ' room' + (h.uncontracted.length === 1 ? '' : 's') + ' with guests the agreement does not buy for these nights (' + esc(h.uncontracted.map(function (u) { return 'room ' + u.label; }).join(', ')) + ') — no purchase rate is set for them.</p>' : '') +
        (h.held && h.held.length ? '<p class="t-b2 ab-flag">Held, not confirmed: ' + esc(h.held.map(function (u) { return 'room ' + u.label + ' (' + usd(u.cost.cents / 100) + ')'; }).join(', ')) + ' — their additional hotel cost is pending, not in the forecast.</p>' : '') +
        (empty.length ? '<p class="t-b2 ab-mute">Rooms without guests — ' + esc(empty.join(' · ')) + (free012.length ? ' · free in 012 (reference): ' + esc(free012.map(function (f) { return f.label + ' ' + f.roomNos.join(', '); }).join(' · ')) : '') + '</p>' : '') + '</div></details>';
    }).join('');
    return '<section class="ab-sec" aria-label="Rooms and rates">' +
      exportBar([['rooming', 'CSV · hotel rooming list (all stays)']]) +
      '<div class="p-card ab-panel" data-ab-rooms-all><p class="t-l1">Rooms by hotel and period · guests · purchase and sale</p>' +
      '<p class="t-b2 ab-mute">Live from the booking system. Hotel cost = what the hotel charges H&amp;S for the room (purchase price): the agreement\'s rooms at its rate, every other booked room night at the Owners\' confirmed purchase rate, and the additional-person charge for a third person — with the 004 row that holds it, or "not in 004 — proposed" (Finance · E). Guest revenue = what its guests booked (selling price, Billing Engine 002 / 009; the couple\'s own room is complimentary); the two are never mixed. Room = the booking system\'s allocation label; hotel room numbers: the Souphattra Heritage\'s official room list, assigned to its rooms by the Owners (a suite of two numbers is one room; other hotels have supplied no numbers).</p>' + html + '</div>' +
      rateListView(BG) + '</section>';
  }
  /* RECEIVABLES BY GUEST (Owners' review, 18 Nov 2026): every issued statement of a paying guest — invoiced, received, open,
     due, overdue and a revision due — as the Revenue Report states it per invitation (the couple's own statements are in Finance) */
  /* THE REVENUE TAB'S FIRST PANEL (Owners' consolidated order, 19 Nov 2026): the Souphattra Heritage's accommodation revenue on its
     own — booked, invoiced, received, outstanding; by stay period, room category and booking — then the other parts of the guests'
     billing, each apart, and the total they make (each line once). Every figure is the server's (src/billing/revenue-classes.js). */
  function personNames(R) {
    var m = {}; (((R.budget || {}).centres) || []).forEach(function (c) { (c.rooms || []).forEach(function (r) { (r.lines || []).forEach(function (l) { if (l.person && l.personName) m[l.person] = l.personName; }); }); });
    return m;
  }
  function classesRevenueView(R) {
    var K = R.classes;
    if (!K || !K.version) return '<div class="p-card ab-panel" data-ab-souphattra><p class="t-l1">Souphattra Heritage – Accommodation Revenue</p><p class="t-b2 ab-mute">' + esc((K && K.error) || 'The split of the guests\' billing by class is not available just now.') + '</p></div>';
    var S0 = K.classes.SOUPHATTRA_ACCOMMODATION || {}, sp = K.souphattra || {};
    var cell = function (label, v, n) { return '<td data-l="' + esc(label) + '"' + (n ? ' class="num"' : '') + '>' + v + '</td>'; };
    var sk = function (v) { return '<span data-i18n-skip>' + esc(kd(v)) + '</span>'; };
    var four = function (x) { return cell('Booked', sk(x.booked), 1) + cell('Invoiced', sk(x.invoiced), 1) + cell('Received', sk(x.received), 1) + cell('Outstanding', sk(x.outstanding), 1); };
    var head4 = '<th class="num">Booked</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Outstanding</th>';
    var plan = {}; (((R.budget || {}).roomPlan) || []).forEach(function (p) { plan[p.stay] = p; });
    var kpi = function (label, v, def) { return kpiBox(label, esc(kd(v)), def, '', ''); };
    var periods = (sp.byPeriod || []).map(function (p) {
      var pl = plan[p.stage] || {};
      return '<tr>' + cell('Stay period', esc(p.label) + '<span class="ab-id" data-i18n-skip>' + esc(pl.from ? dmy(pl.from) + ' – ' + dmy(pl.to) : (p.stage || '')) + ' · ' + esc(p.guests) + ' guests · ' + esc(p.rooms) + ' rooms · ' + esc(p.roomNights) + ' room nights</span>') + four(p) + '</tr>';
    }).join('');
    var cats = (sp.byCategory || []).map(function (c) { return '<tr>' + cell('Room category', '<span data-i18n-skip>' + esc(c.Item_ID) + '</span><span class="ab-id">' + esc(c.guests) + ' guests · ' + esc(c.rooms) + ' rooms</span>') + four(c) + '</tr>'; }).join('');
    var names = personNames(R);
    var books = (sp.byBooking || []).map(function (b) {
      return '<tr>' + cell('Guest', '<span data-i18n-skip>' + esc(names[b.Person_ID] || b.Person_ID || '') + '</span><span class="ab-id" data-i18n-skip>' + esc((b.Person_ID || '') + ' · ' + b.Holder_ID) + '</span>') +
        cell('Booking', '<span data-i18n-skip>' + esc(b.Item_ID) + '</span><span class="ab-id">' + esc(b.period + (b.nights ? ' · ' + b.nights + ' night' + (b.nights === 1 ? '' : 's') : '') + (b.hosted ? ' · hosted' : '')) + '</span>') +
        cell('Booked', sk(b.booked), 1) + cell('Invoiced', sk(b.invoiced), 1) + cell('Payment', esc(PAY[b.status] || b.status || '—')) + '</tr>';
    }).join('');
    var other = (K.otherAccommodation || []).map(function (p) {
      return '<tr>' + cell('Property', '<span data-i18n-skip>' + esc(p.property) + '</span><span class="ab-id">' + (p.china ? 'China trip — outside the wedding budget · ' : '') + esc(p.guests) + ' guests · ' + esc(p.rooms) + ' rooms · ' + esc(p.roomNights) + ' room nights</span>') + four(p) + '</tr>';
    }).join('');
    var pass = (K.passThrough || []).map(function (p) {
      return '<tr>' + cell('Service', '<span data-i18n-skip>' + esc(p.Item_ID) + '</span><span class="ab-id">' + (p.china ? 'China trip · ' : '') + esc(p.basis) + (p.confirmed ? ' · ' + esc(p.confirmed) : ' · <b>to confirm</b>') + '</span>') + four(p) + '</tr>';
    }).join('');
    var none = (K.notClassified || []).map(function (p) { return '<tr>' + cell('Service', '<span data-i18n-skip>' + esc(p.Item_ID) + '</span><span class="ab-id">not classified yet — named for your decision</span>') + four(p) + '</tr>'; }).join('');
    var parts = [['Souphattra Heritage – Accommodation Revenue', S0], ['Other accommodation collections', K.classes.OTHER_ACCOMMODATION || {}], ['Pass-through collections', K.classes.PASS_THROUGH || {}]]
      .concat(K.classes.NOT_CLASSIFIED && K.classes.NOT_CLASSIFIED.booked && K.classes.NOT_CLASSIFIED.booked.cents ? [['Not classified yet', K.classes.NOT_CLASSIFIED]] : [])
      .concat([['China / private travel', K.china || {}]]).map(function (x) { return '<tr>' + cell('Part', esc(x[0])) + four(x[1]) + '</tr>'; }).join('') +
      '<tr class="ab-total">' + cell('Part', '<b>Total guest billing</b>') + four(K.totalGuestBilling || {}) + '</tr>';
    var rec = K.reconciliation || {}, off = Object.keys(rec).filter(function (k) { return rec[k] && rec[k].equal === false; });
    var notes = (K.unallocated && (K.unallocated.statements || []).length ? ['Not allocated to a class: ' + K.unallocated.statements.map(function (x) { return x.Holder_ID + ' (' + (PAY[x.status] || x.status || '') + ': ' + x.why + ')'; }).join(' · ')] : [])
      .concat((K.excluded || []).map(function (x) { return 'Not in "booked": ' + x.Holder_ID + ' — ' + x.reason; }))
      .concat((K.withoutProduct || []).map(function (x) { return 'Booked lines without a product key (' + x.Item_ID + ', ' + kd(x.booked) + '): in the total, in no part.'; }))
      .concat(off.map(function (k) { return 'The parts of "' + k + '" differ from its total by ' + kd(rec[k].residual) + '.'; }));
    return '<div class="p-card ab-panel" data-ab-souphattra><p class="t-l1">Souphattra Heritage – Accommodation Revenue</p>' +
      '<p class="t-b2 ab-mute">The primary accommodation revenue of the wedding: every confirmed Souphattra room booking at its booked selling price — early arrival, the wedding stay and any extended stay, special rates, extra persons and beds, guests paying both nights. No other hotel, no Temple Offering, no other service; never a purchase rate.</p>' +
      '<div class="ab-kpis" data-ab-souphattra-kpis>' + kpi('Booked accommodation revenue', S0.booked, 'confirmed bookings, every stay period') + kpi('Invoiced', S0.invoiced, 'its lines on issued statements') +
        kpi('Received', S0.received, 'its lines on statements paid in full') + kpi('Outstanding', S0.outstanding, 'its lines on unpaid statements') + '</div>' +
      '<p class="t-l1 ab-bd-h">By stay period · ' + esc(sp.guestsAcrossPeriods || 0) + ' guests across the periods (each once)</p><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Stay period</th>' + head4 + '</tr></thead><tbody>' + periods + '</tbody></table></div>' +
      '<p class="t-l1 ab-bd-h">By room category</p><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Room category</th>' + head4 + '</tr></thead><tbody>' + cats + '</tbody></table></div>' +
      '<details class="ab-bd"><summary><b>By booking</b> <span class="ab-mute">· ' + esc((sp.byBooking || []).length) + ' booking lines</span></summary><div class="ab-bd-body"><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Guest</th><th>Booking</th><th class="num">Booked</th><th class="num">Invoiced</th><th>Payment</th></tr></thead><tbody>' + books + '</tbody></table></div></div></details>' +
      '</div>' +
      '<div class="p-card ab-panel" data-ab-rev-classes><p class="t-l1">Guest billing by class · each line once</p><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Part</th>' + head4 + '</tr></thead><tbody>' + parts + '</tbody></table></div>' +
      (other ? '<p class="t-l1 ab-bd-h">Other accommodation — not Souphattra revenue</p><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Property</th>' + head4 + '</tr></thead><tbody>' + other + '</tbody></table></div>' : '') +
      (pass || none ? '<p class="t-l1 ab-bd-h">Pass-through collections — collected and passed on</p><div class="ab-table-wrap"><table class="ab-table ab-fin"><thead><tr><th>Service</th>' + head4 + '</tr></thead><tbody>' + pass + none + '</tbody></table></div>' : '') +
      (notes.length ? '<ul class="t-b2">' + notes.map(li).join('') + '</ul>' : '') +
      '<p class="t-b2 ab-mute">Received and outstanding follow each statement: paid in full, or unpaid. A partly paid statement is invoiced by its lines, its payment is not allocated to a class. The China trip and its return (Kunming, Lijiang, the train, the flights, Hotel Muse) are reported apart and are in no other part.</p></div>';
  }
  function classesCsv(kind) {
    var R = S.revenue, K = R.classes || {}, sp = K.souphattra || {}, names = personNames(R);
    var meta = [['Generated', nowStamp()], ['Data as of', (R.calculatedAt || '').slice(0, 16).replace('T', ' ') + ' UTC'], ['Currency', 'USD'],
      ['Basis', 'the booking system — the Billing Engine\'s booked lines at their booked selling prices, the issued statements and 008; each line in one part by its product (' + (K.version || '') + ')']];
    var m = function (x, f) { return x && x[f] ? num(x[f]) : null; };
    if (kind === 'souphattra-revenue') {
      var rows = [];
      (sp.byPeriod || []).forEach(function (p) { rows.push(['Stay period', p.label, '', '', p.guests, p.rooms, p.roomNights, m(p, 'booked'), m(p, 'invoiced'), m(p, 'received'), m(p, 'outstanding'), '']); });
      (sp.byCategory || []).forEach(function (c) { rows.push(['Room category', c.Item_ID, '', '', c.guests, c.rooms, c.roomNights, m(c, 'booked'), m(c, 'invoiced'), m(c, 'received'), m(c, 'outstanding'), '']); });
      (sp.byBooking || []).forEach(function (b) { rows.push(['Booking', b.Item_ID + ' · ' + b.period, names[b.Person_ID] || '', b.Person_ID || '', '', '', b.nights || '', m(b, 'booked'), m(b, 'invoiced'), null, null, PAY[b.status] || b.status || '']); });
      var t = (K.classes || {}).SOUPHATTRA_ACCOMMODATION || {};
      rows.push(['Total', 'Souphattra Heritage – Accommodation Revenue', '', '', sp.guestsAcrossPeriods || '', t.rooms || '', t.roomNights || '', m(t, 'booked'), m(t, 'invoiced'), m(t, 'received'), m(t, 'outstanding'), '']);
      return csvDoc('See You In Laos — Souphattra Heritage Accommodation Revenue', meta, ['Level', 'Item', 'Guest', 'Guest ID', 'Guests', 'Rooms', 'Room nights / nights', 'Booked USD', 'Invoiced USD', 'Received USD', 'Outstanding USD', 'Payment status'], rows);
    }
    if (kind === 'pass-through') {
      return csvDoc('See You In Laos — Pass-through Collections', meta, ['Service', 'China trip', 'Basis', 'Confirmed by', 'Persons', 'Booked USD', 'Invoiced USD', 'Received USD', 'Outstanding USD'],
        (K.passThrough || []).map(function (p) { return [p.Item_ID, p.china ? 'yes' : 'no', p.basis, p.confirmed || 'to confirm', p.guests, m(p, 'booked'), m(p, 'invoiced'), m(p, 'received'), m(p, 'outstanding')]; })
          .concat((K.notClassified || []).map(function (p) { return [p.Item_ID, p.china ? 'yes' : 'no', 'not classified yet', '', p.guests, m(p, 'booked'), m(p, 'invoiced'), m(p, 'received'), m(p, 'outstanding')]; })));
    }
    var C = K.classes || {};
    var rows2 = [['Souphattra Heritage – Accommodation Revenue', '', C.SOUPHATTRA_ACCOMMODATION], ['Other accommodation collections', '', C.OTHER_ACCOMMODATION], ['Pass-through collections', '', C.PASS_THROUGH], ['Not classified yet', '', C.NOT_CLASSIFIED], ['China / private travel', 'outside the wedding budget', K.china]]
      .concat((K.otherAccommodation || []).map(function (p) { return ['· ' + p.property, p.china ? 'China trip' : 'other accommodation', p]; }))
      .map(function (x) { var v = x[2] || {}; return [x[0], x[1], v.guests != null ? v.guests : '', v.rooms != null ? v.rooms : '', v.roomNights != null ? v.roomNights : '', m(v, 'booked'), m(v, 'invoiced'), m(v, 'received'), m(v, 'outstanding')]; });
    var T = K.totalGuestBilling || {};
    rows2.push(['Total guest billing', 'each line once', '', '', '', m(T, 'booked'), m(T, 'invoiced'), m(T, 'received'), m(T, 'outstanding')]);
    return csvDoc('See You In Laos — Guest Billing by Class', meta, ['Part', 'Note', 'Guests', 'Rooms', 'Room nights', 'Booked USD', 'Invoiced USD', 'Received USD', 'Outstanding USD'], rows2);
  }
  function receivableRows(R) {
    var names = {}; ((S.overview && S.overview.holders) || []).forEach(function (h) { if (h.name && h.name.full) names[h.Holder_ID] = h.name.full; });
    return (R.holders || []).filter(function (h) { return h.issued && h.issued.cents; }).sort(function (a, b) { return String(a.dueDate || '').localeCompare(String(b.dueDate || '')) || String(a.Holder_ID).localeCompare(String(b.Holder_ID)); })
      .map(function (h) {
        var rev = (h.changedSinceIssue ? h.changedSinceIssue.cents : 0) - (h.invoicedNotBooked ? h.invoicedNotBooked.cents : 0);
        return { h: h, name: names[h.Holder_ID] || '', rev: rev };
      });
  }
  function receivablesView(R) {
    var rows = receivableRows(R), ti = 0, tc = 0, to = 0;
    var body = rows.map(function (x) {
      var h = x.h; ti += h.issued.cents; tc += h.cashCollected ? h.cashCollected.cents : 0; to += h.outstanding ? h.outstanding.cents : 0;
      return '<tr>' + td('Guest', '<span class="ab-name" data-i18n-skip>' + esc(x.name || h.Holder_ID) + '</span><span class="ab-id" data-i18n-skip>' + esc(h.Holder_ID) + '</span>') +
        td('Statement', '<span data-i18n-skip>' + esc((h.Settlement_ID || '—') + (h.revision ? ' · V' + h.revision : '')) + '</span>') + td('Issued · due', '<span data-i18n-skip>' + esc(dmy(h.issueDate)) + '<br><span class="ab-mute">due ' + esc(dmy(h.dueDate)) + '</span></span>') +
        td('Invoiced', '<span data-i18n-skip>' + esc(kd(h.issued)) + '</span>', 1) + td('Received', '<span data-i18n-skip>' + esc(kd(h.cashCollected)) + '</span>', 1) +
        td('Outstanding', (h.overdue && h.overdue.cents ? '<span class="ab-chip open">Overdue</span> ' : '') + '<span data-i18n-skip>' + esc(kd(h.outstanding)) + '</span>', 1) +
        td('Status', esc(PAY[h.paymentStatus] || h.paymentStatus || '—') + (h.pendingVerification ? '<span class="ab-id">' + esc(h.pendingVerification) + ' reported, to verify</span>' : '')) +
        td('Revision due', x.rev ? '<span data-i18n-skip>' + esc(signed({ currency: 'USD', amount: x.rev / 100 })) + '</span>' : '<span class="ab-mute">—</span>', 1) + '</tr>';
    }).join('');
    if (rows.length) body += '<tr class="ab-total">' + td('Guest', '<b>' + rows.length + ' statements</b>') + td('Statement', '') + td('Issued · due', '') + td('Invoiced', '<b data-i18n-skip>' + esc(usd(ti / 100)) + '</b>', 1) +
      td('Received', '<b data-i18n-skip>' + esc(usd(tc / 100)) + '</b>', 1) + td('Outstanding', '<b data-i18n-skip>' + esc(usd(to / 100)) + '</b>', 1) + td('Status', '') + td('Revision due', '', 1) + '</tr>';
    return '<div class="p-card ab-panel" data-ab-receivables><p class="t-l1">Receivables by guest · paying guests\' issued statements</p>' +
      (rows.length ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Guest</th><th>Statement</th><th>Issued · due</th><th class="num">Invoiced</th><th class="num">Received</th><th class="num">Outstanding</th><th>Status</th><th class="num">Revision due</th></tr></thead><tbody>' + body + '</tbody></table></div>'
        : '<p class="t-b2">No statement is issued yet.</p>') +
      '<p class="t-b2 ab-mute">Received = verified payments only. A revision due is the change of the bookings since the statement was issued; the statement stays as issued until you issue a revision.</p></div>';
  }
  function receivablesCsv() {
    var R = S.revenue;
    return csvDoc('See You In Laos — Revenue & Outstanding Receivables', [['Generated', nowStamp()], ['Data as of', (R.calculatedAt || '').slice(0, 16).replace('T', ' ') + ' UTC'], ['Currency', 'USD'],
      ['Basis', 'issued statements of paying guests (the couple excluded); received = verified in 008; booked ' + kd(R.bookedRevenue) + ', invoiced ' + kd(R.issuedRevenue) + ', received ' + kd(R.cashCollected) + ', outstanding ' + kd(R.outstanding)]],
      ['Invitation', 'Guest', 'Statement', 'Version', 'Issued', 'Due', 'Invoiced USD', 'Received USD', 'Outstanding USD', 'Overdue USD', 'Payment status', 'Reported, to verify', 'Revision due USD'],
      receivableRows(R).map(function (x) { var h = x.h; return [h.Holder_ID, x.name, h.Settlement_ID || '', h.revision || '', h.issueDate || '', h.dueDate || '', num(h.issued), num(h.cashCollected), num(h.outstanding), num(h.overdue), PAY[h.paymentStatus] || h.paymentStatus || '', h.pendingVerification || 0, x.rev ? x.rev / 100 : 0]; }));
  }
  function revenueView() {
    if (S.revenuePhase === 'loading' || S.revenuePhase === 'idle') return '<p class="t-b2 ab-progress" role="status">Calculating the revenue overview with the Billing Engine…</p>';
    if (S.revenuePhase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(S.revenueError) + '</p><div class="p-actions"><button type="button" class="p-link" data-ab-rev-reload>Try again</button></div></div>';
    var R = S.revenue, B = R.breakdown || {}, P = R.payments || {}, rep = R.paymentsReported || {};
    var part = B.complete === false ? ' · partial' : '';   /* the breakdown stands for the whole booked figure only when that figure is complete */
    var cards = KPIS.map(function (k) { return kpiCard(R[k[0]], k[1]); }).join('') +
      '<div class="p-card ab-kpi" data-ab-reported><p class="t-l1">Payments reported, to verify</p><p class="t-h1" data-i18n-skip>' + esc(money2(rep)) + '</p>' +
      '<p class="t-b2 ab-mute">' + esc((rep.rows || 0) + ' report' + (rep.rows === 1 ? '' : 's') + ' waiting for Verify / Reject — never counted as received' +
        (rep.duplicateSuspects ? ' · ' + rep.duplicateSuspects + ' flagged as a possible duplicate (' + money2(rep.duplicateSuspectAmount) + '), not included' : '')) + '</p></div>';
    var more = KPIS_MORE.map(function (k) { return kpiCard(R[k[0]], k[1]); }).join('');
    var cat = tbl([['Room category'], ['Places', 1], ['Rooms', 1], ['Extra beds', 1], ['Amount', 1]], (B.roomsByCategory || []).map(function (c) {
      return '<tr>' + td('Room category', '<span data-i18n-skip>' + esc(c.Item_ID) + '</span>' + (c.hostedLines ? ' <span class="ab-mute">· ' + esc(c.hostedLines) + ' hosted</span>' : '') + (c.complimentaryLines ? ' <span class="ab-mute">· ' + esc(c.complimentaryLines) + ' at USD 0 (named rate)</span>' : '')) +
        td('Places', esc(c.places), 1) + td('Rooms', esc(c.rooms || '—'), 1) + td('Extra beds', c.extraBeds ? esc(c.extraBeds) + (c.extraBedAmount && c.extraBedAmount.cents ? ' <span class="ab-mute">(' + esc(money2(c.extraBedAmount)) + ')</span>' : '') : '—', 1) +
        td('Amount', '<span data-i18n-skip>' + esc(money2(c)) + '</span>', 1) + '</tr>';
    }).concat(B.roomsTotal && (B.roomsByCategory || []).length ? ['<tr class="ab-total"><td data-l="" colspan="4"><b>Accommodation together</b></td>' + td('Amount', '<b data-i18n-skip>' + esc(money2(B.roomsTotal) + part) + '</b>', 1) + '</tr>'] : []), 'No room is booked yet.');
    var units = tbl([['Room'], ['Places', 1], ['Extra beds', 1], ['Payers', 1], ['Amount', 1]], (B.roomsByUnit || []).map(function (u) {
      var label = u.Room_Unit_ID ? String(u.Room_Unit_ID).replace(/^RU·/, '').replace('·', ' · Room ') : '(no room recorded) ' + u.Item_ID;
      return '<tr>' + td('Room', '<span data-i18n-skip>' + esc(label) + '</span>') + td('Places', esc(u.places), 1) + td('Extra beds', esc(u.extraBeds || '—'), 1) +
        td('Payers', esc(u.payers), 1) + td('Amount', '<span data-i18n-skip>' + esc(money2(u)) + '</span>', 1) + '</tr>';
    }), 'No room is booked yet.');
    var extras = tbl([['Service'], ['Places', 1], ['Amount', 1]], (B.extras || []).map(function (e) {
      return '<tr>' + td('Service', '<span data-i18n-skip>' + esc(e.Item_ID) + '</span>') + td('Places', esc(e.places), 1) + td('Amount', '<span data-i18n-skip>' + esc(money2(e)) + '</span>', 1) + '</tr>';
    }).concat(B.extrasTotal && (B.extras || []).length ? ['<tr class="ab-total"><td data-l="" colspan="2"><b>Extra services together</b></td>' + td('Amount', '<b data-i18n-skip>' + esc(money2(B.extrasTotal) + part) + '</b>', 1) + '</tr>'] : []), 'No extra service is booked yet.');
    var inv = tbl([['Payment method'], ['Statements', 1], ['Invoiced', 1], ['Open', 1]], (P.invoicesByMethod || []).map(function (m) {
      return '<tr>' + td('Payment method', esc(METHOD_WORDS[m.method] || m.method)) + td('Statements', esc(m.statements), 1) + td('Invoiced', '<span data-i18n-skip>' + esc(money2(m.invoiced)) + '</span>', 1) + td('Open', '<span data-i18n-skip>' + esc(money2(m.outstanding)) + '</span>', 1) + '</tr>';
    }), 'No statement is issued yet.');
    var pay = tbl([['Payment method'], ['Received (verified)', 1], ['Reported, to verify', 1]], (P.byMethod || []).map(function (m) {
      return '<tr>' + td('Payment method', esc(METHOD_WORDS[m.method] || m.method)) + td('Received (verified)', '<span data-i18n-skip>' + esc(money2(m.verified)) + '</span>', 1) + td('Reported, to verify', '<span data-i18n-skip>' + esc(money2(m.reported)) + '</span>', 1) + '</tr>';
    }), 'No payment is recorded yet.');
    var notes = [];
    (R.doubleBookings || []).forEach(function (d) { notes.push('Double booking: ' + d.Person_ID + ' · ' + d.stage + ' — ' + d.sides.map(function (x) { return x.Holder_ID + ' (' + x.from + ', ' + money2(x.amount) + ')'; }).join(' and ') + '. Not counted until you decide which booking stands.'); });
    (R.cancelledHolders || []).forEach(function (c) { notes.push('No longer on the guest list: ' + c.Holder_ID + (c.issued ? ' — its statement (' + money2(c.issued) + ') stays issued and open; nothing of it is booked.' : ' — nothing of it is booked.')); });
    if ((R.lapsedConfirmations || []).length) notes.push('Booked as invoiced (a newer version was sent and is not confirmed yet): ' + R.lapsedConfirmations.join(', ') + '.');
    (R.stayReadingDiffers || []).forEach(function (x) { notes.push('Guest House and hotel for the same guest (' + x.Person_ID + ', ' + x.holders.join(' / ') + '): billed as two stays; the room inventory counts them as one.'); });
    if (B.reconciled === false) notes.push('The breakdown does not add up to the booked figure — see the manual review.');
    (R.ownerRecordsWaiting || []).forEach(function (o) { notes.push('Bookings you recorded for ' + o.Holder_ID + ' changed since your confirmation — ' + (o.asIssued ? 'counted as last invoiced' : 'not counted') + ' until you confirm them again.'); });
    if (B.unclassifiedTotal && B.unclassifiedTotal.cents) notes.push('Booked lines without a product key (' + (B.unclassifiedItems || []).join(', ') + '): ' + money2(B.unclassifiedTotal) + ' — part of the booked figure, in neither table.');
    (R.unresolved || []).forEach(function (u) { notes.push('Not readable just now: ' + u.Holder_ID + ' — every figure it could belong to shows "partial".'); });
    if ((R.lapsedNotCounted || []).length) notes.push('Sent a newer version, not confirmed and not invoiced — not counted until you confirm it: ' + R.lapsedNotCounted.join(', ') + '.');
    ((R.bookedRevenue && R.bookedRevenue.gaps) || []).forEach(function (g) { if (g && g.Holder_ID && !/^DOUBLE_BOOKING|^not readable/.test(g.reason || '')) notes.push('Not counted: ' + g.Holder_ID + ' — ' + g.reason + '.'); });
    if (B.complete === false) notes.push('The tables below cover only the counted bookings ("partial") until the points above are resolved.');
    var q = (R.quotaUtilisation || []).map(function (u) {
      return '<tr><td data-l="Item"><span data-i18n-skip>' + esc(u.Item_ID) + '</span></td><td data-l="Unit">' + esc(u.Quota_Unit || '—') + '</td><td data-l="Quota" class="num">' + esc(u.Quota != null ? u.Quota : '—') + '</td>' +
        '<td data-l="Used" class="num">' + esc(u.used) + '</td><td data-l="Remaining" class="num">' + esc(u.remaining != null ? u.remaining : '—') + '</td>' +
        '<td data-l="Utilisation" class="num">' + esc(u.utilisation != null ? u.utilisation + ' %' : '—') + (u.overQuota ? ' <span class="ab-chip open">over</span>' : '') + '</td></tr>';
    }).join('');
    var counts = R.counts || {}, pop = R.population || {};
    return '<section class="ab-sec" aria-label="Revenue">' + guarded(function () { return classesRevenueView(R); }) + '<p class="t-l1 ab-bd-h">All guest billing</p><div class="ab-kpis" data-ab-rev-main>' + cards + '</div>' +
      '<p class="t-b2 ab-foot"><button type="button" class="p-link" data-ab-rev-reload>Recalculate now</button> · Calculated live from the confirmed bookings · ' + esc(when(R.calculatedAt || '')) + ' · ' + esc(pop.holders || 0) + ' paying invitation' + (pop.holders === 1 ? '' : 's') + ' (' + esc(pop.withOwnerBookings || 0) + ' with bookings you recorded' + (pop.cancelled ? ', ' + esc(pop.cancelled) + ' no longer on the list' : '') + ') · ' +
        esc(counts.issuedRevisions || 0) + ' statements · as of ' + esc(day(R.asOf)) + ' · engine ' + esc(R.engineVersion || '') + ' · ' + esc(R.revenueVersion || '') + '</p>' +
      '<p class="t-b2"><a href="/admin/billing#finance" data-ab-tab="#finance">Finance</a> · <a href="/admin/billing#rooms" data-ab-tab="#rooms">Rooms &amp; rates</a></p>' +
      (notes.length ? '<div class="p-card ab-panel" data-ab-rev-notes><p class="t-l1">To look at</p><ul class="t-b2">' + notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></div>' : '') +
      exportBar([['souphattra-revenue', 'CSV · Souphattra accommodation revenue'], ['revenue-by-class', 'CSV · guest billing by class'], ['pass-through', 'CSV · pass-through collections'], ['receivables', 'CSV · revenue & outstanding receivables']]) +
      receivablesView(R) +
      '<div class="p-card ab-panel" data-ab-rev-rooms><p class="t-l1">Accommodation by room category</p>' + cat + '</div>' +
      '<div class="p-card ab-panel" data-ab-rev-units><p class="t-l1">Accommodation by room</p>' + units + '</div>' +
      '<div class="p-card ab-panel" data-ab-rev-extras><p class="t-l1">Extra services</p>' + extras + '</div>' +
      '<div class="p-card ab-panel" data-ab-rev-invoices><p class="t-l1">Invoiced and open, by payment method</p>' + inv + '</div>' +
      '<div class="p-card ab-panel" data-ab-rev-payments><p class="t-l1">Payments, by method</p>' + pay + '</div>' +
      '<div class="ab-kpis ab-kpis-more">' + more + '</div>' +
      '<div class="p-card ab-panel"><p class="t-l1">Quota utilisation</p>' + (q ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Item</th><th>Unit</th><th class="num">Quota</th><th class="num">Used</th><th class="num">Remaining</th><th class="num">Utilisation</th></tr></thead><tbody>' + q + '</tbody></table></div>' : '<p class="t-b2">No quota is in use yet.</p>') + '</div>' +
      '<p class="t-b2 ab-mute">Costs, budget, supplier payments and the financial position are in <a href="/admin/billing#finance" data-ab-tab="#finance">Finance</a>; this tab is guest revenue only.</p></section>';
  }

  /* --------------------------------------------------------------- the page */
  function page() {
    if (S.phase === 'signedout') {
      return '<div class="p-card ab-gatekeep"><p class="t-l1">Guest Settlement</p><h2 class="t-h1">Sign in first</h2><p class="t-b1">Open your invitation on this device with your own code, then come back to this page.</p>' +
        '<div class="p-actions"><a class="p-act" href="/invitation">Open your invitation</a></div></div>';
    }
    if (S.phase === 'denied') {
      return '<div class="p-card ab-gatekeep" data-ab-denied><p class="t-l1">Guest Settlement</p><h2 class="t-h1">This page is for Haruthai and Suthep only.</h2><p class="t-b1">Your invitation does not open the billing administration.</p></div>';
    }
    if (S.phase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(S.error) + '</p><div class="p-actions"><button type="button" class="p-link" data-ab-retry>Try again</button></div></div>';
    if (S.phase !== 'ready') return '<p class="t-b2 ab-progress" role="status">Reading the guest list…</p>';
    var o = S.overview, v = S.route.view;
    /* the page has <base href="/">: an in-page link names the page itself, or "#revenue" would leave for the home page */
    var tab = function (k, label, on) { return '<a href="/admin/billing#' + k + '" data-ab-tab="#' + k + '" class="' + (on ? 'on' : '') + '">' + label + '</a>'; };
    var tabs = '<nav class="ab-tabs" aria-label="Sections">' + tab('guests', 'Guests', !/^(revenue|rooms|finance)$/.test(v) && !extView(v)) +
      (EXT && EXT.tabs ? EXT.tabs.map(function (t) { return tab(t[0], esc(t[1]), v === t[0]); }).join('') : '') + tab('rooms', 'Rooms &amp; rates', v === 'rooms') +
      tab('finance', 'Finance', v === 'finance') + tab('revenue', 'Revenue', v === 'revenue') +
      '<span class="ab-gate ' + (o.gate && o.gate.approved ? 'on' : 'open') + '">' + (o.gate && o.gate.approved ? 'Issue &amp; Publish enabled' : 'Activation Gate not approved') + '</span>' +
      '<span class="ab-who">Signed in · ' + esc(o.audience === 'BRIDE' ? 'Haruthai' : o.audience === 'GROOM' ? 'Suthep' : '') + '</span></nav>';
    return tabs + (extView(v) ? EXT.views[v]() : v === 'holder' ? holderView() : v === 'revenue' ? revenueView() : v === 'rooms' ? roomsTabView() : v === 'finance' ? financeTabView() : listView());
  }

  /* --------------------------------------------------------------- actions */
  /* DOWNLOAD ORIGINAL PDF (Owners, 18 Nov 2026): the very file the guest downloads and the statement e-mail carries — the issued
     revision's write-once PDF from the server (GET /api/billing/pdf, BILLING_ADMIN may name the holder), never a copy made here;
     any version, the current one or a superseded original. Reading it issues, sends or changes nothing. */
  function download(holderId, settlementId, revision) {
    var x = S.holder && S.holder.issued;
    var id = holderId || (S.holder && S.holder.Holder_ID), sid = settlementId || (x && x.Settlement_ID), rev = revision || (x && x.revision);
    if (!id || !sid || !rev || S.downloading) return;   /* one download at a time */
    S.downloading = true;
    S.download = 'Preparing the original PDF of ' + sid + ' V' + rev + '…'; draw();
    var a = auth();
    fetch('/api/billing/pdf?holder=' + encodeURIComponent(id) + '&rev=' + encodeURIComponent(rev), { headers: { 'x-siyl-auth': a ? a.bearer : '' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('pdf ' + r.status); return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob), el = document.createElement('a');
        el.href = url; el.download = 'Statement-' + sid + '-V' + rev + '.pdf';
        document.body.appendChild(el); el.click(); el.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
        S.downloading = false; S.download = ''; draw();
      })['catch'](function () { S.downloading = false; S.download = 'The PDF could not be downloaded just now. Please try again.'; draw(); });
  }
  function issueNow() {
    var H = S.holder, I = S.issue; if (!H || !I || !I.checked || I.busy) return;
    var hash = H.preview && H.preview.proposalHash;
    if (!hash) { I.error = 'The preview is not issuable.'; draw(); return; }
    I.busy = true; I.error = ''; draw();
    var pd = pdOf(H);
    api('issue', { method: 'POST', body: { holderId: H.Holder_ID, expectedProposal: hash, acknowledgePriceDifference: pd && pd.material && I.prices ? pd.digest : undefined } }).then(function (x) {
      I.busy = false;
      if (x.ok) {
        I.done = 'Statement ' + x.j.Settlement_ID + ' · version ' + x.j.revision + ' is issued: ' + usd(x.j.totalPayable) + ', due ' + day(x.j.dueDate) + '. It is in the guest\'s My Profile now. Nothing has been e-mailed.';
        S.msg = esc(I.done);
        refreshAfterWrite(H.Holder_ID, 'view');
        return;
      }
      /* no answer, or a server failure: the issue may have happened — the guest is read again, nothing is offered twice */
      if (x.status === 0 || x.status >= 500) {
        S.issue = null;
        S.msg = esc('The answer to the issue was lost. The guest is read again — check the statement below before doing anything else.');
        refreshAfterWrite(H.Holder_ID, 'view');
        return;
      }
      var reasons = (x.j.reasons || []).join(' · ');
      I.error = (x.j.reasons || []).indexOf('PREVIEW_CHANGED') >= 0
        ? 'The statement changed since this preview (the source or the trip moved). Nothing was issued — the preview is read again.'
        : 'Nothing was issued: ' + (x.j.error || 'refused') + (reasons ? ' — ' + reasons : '');
      draw();
      if ((x.j.reasons || []).indexOf('PREVIEW_CHANGED') >= 0 || (x.j.reasons || []).indexOf('PRICE_DIFFERENCE') >= 0) refreshAfterWrite(H.Holder_ID, 'preview');
    });
  }
  function openConfirm() {
    var H = S.holder; if (!H) return;
    S.panel = 'confirm'; S.issue = null; S.send = null; S.confirm = { phase: 'loading', checked: false, ack: false }; draw();
    api('admin/confirm?holder=' + encodeURIComponent(H.Holder_ID)).then(function (x) {
      if (!S.confirm || S.panel !== 'confirm') return;
      if (!x.ok) { S.confirm.phase = 'error'; S.confirm.error = x.j.error || 'The submitted booking could not be read.'; draw(); return; }
      S.confirm.phase = 'ready'; S.confirm.ctx = x.j; draw();
    });
  }
  function confirmNow() {
    var C = S.confirm, x = C && C.ctx, H = S.holder; if (!C || !x || !x.snapshot || C.busy || !C.checked) return;
    C.busy = true; C.error = ''; draw();
    var snap = x.snapshot;
    var pd = x.priceDifference;
    api('admin/confirm', { method: 'POST', body: { holderId: H.Holder_ID, expected: { submissionId: snap.submissionId, version: snap.version, digest: snap.digest }, acknowledgeChange: !!C.ack,
      acknowledgePriceDifference: pd && pd.material && C.prices ? pd.digest : undefined } }).then(function (r) {
      C.busy = false;
      if (r.ok) {
        var cf = r.j.confirmation || {};
        C.done = (r.j.unchanged ? 'Already confirmed: ' : 'Confirmed: ') + ((x.name && x.name.full) || H.Holder_ID) + '\'s submitted booking, version ' + (cf.confirmedVersion || snap.version) + ', by ' + confirmedBy(cf) + ', ' + when(cf.confirmedAt) +
          '. Issue statement is available from Preview once every other check passes. Nothing was issued or e-mailed.';
        S.msg = esc(C.done);
        refreshAfterWrite(H.Holder_ID, 'preview').then(function () {
          var s2 = S.holder && S.holder.submission;
          if (s2 && s2.state !== 'CONFIRMED') { S.msg = esc(C.done + ' The status can take up to a minute to show here — read the guest again if it does not.'); draw(); }
        });
        return;
      }
      /* no answer, or a server failure: it may have been saved — the guest is read again, nothing is offered blind */
      if (r.status === 0 || r.status >= 500) {
        S.confirm = null; S.panel = null;
        S.msg = esc('The answer to the confirmation was lost. The guest is read again — check the Guest Relations status before confirming again.');
        refreshAfterWrite(H.Holder_ID, null);
        return;
      }
      var why = r.j.reasons || [];
      if (why.indexOf('SENT_CHANGED') >= 0) { S.msg = esc('The guest sent another version meanwhile. Nothing was confirmed — the submitted booking is read again.'); openConfirm(); return; }
      if (why.indexOf('PRICE_DIFFERENCE') >= 0) { S.msg = esc('Today\'s amounts changed while this dialog was open. Nothing was confirmed — the comparison is read again.'); openConfirm(); return; }
      /* the guest changed the saved trip (or it became unreadable) while the dialog was open: read again, so the difference is shown and can be acknowledged */
      if (why.indexOf('ACKNOWLEDGE_CHANGE') >= 0 || why.indexOf('CONFIRMATION_CHANGED') >= 0) {
        S.msg = esc(why.indexOf('ACKNOWLEDGE_CHANGE') >= 0 ? 'The guest\'s current selection changed while this dialog was open. Nothing was confirmed — the submitted booking is read again.'
          : 'The confirmation record changed meanwhile. Nothing was confirmed — the submitted booking is read again.');
        openConfirm(); return;
      }
      C.error = 'Nothing was confirmed: ' + (r.j.error || 'refused');
      draw();
    });
  }
  function openSend() {
    var H = S.holder; if (!H) return;
    S.panel = 'send'; S.send = { phase: 'loading', checked: false, again: false, sendKey: key() }; draw();
    api('admin/send?holder=' + encodeURIComponent(H.Holder_ID)).then(function (x) {
      if (!S.send) return;
      if (!x.ok) { S.send.phase = 'error'; S.send.error = x.j.error || 'The recipient could not be read.'; draw(); return; }
      S.send.phase = 'ready'; S.send.ctx = x.j; draw();
    });
  }
  var OUTCOME = {
    SENT: 'The statement was sent to the guest.',
    REJECTED: 'The mail provider refused the e-mail; nothing was sent. You can try again.',
    NOT_SENT: 'Nothing was sent (the PDF or the mail transport was not available). You can try again.',
    UNCERTAIN: 'The mail provider did not confirm. It may have reached the guest — check before sending again.',
  };
  function sendNow() {
    var D = S.send, c = D && D.ctx; if (!D || !c || D.busy || !D.checked) return;
    D.busy = true; D.error = ''; draw();
    api('admin/send', { method: 'POST', body: { holderId: S.holder.Holder_ID, revision: c.revision, email: c.email, sendKey: D.sendKey, again: !!D.again } }).then(function (x) {
      D.busy = false;
      /* an answer without an outcome — lost, or a server failure — may follow a delivery: it counts as uncertain */
      var outcome = x.j && x.j.outcome ? x.j.outcome : (x.status === 0 || x.status >= 500 ? 'UNCERTAIN' : null);
      if (outcome) {
        D.result = { outcome: outcome, words: OUTCOME[outcome] || outcome };
        S.msg = esc(D.result.words);
        refreshAfterWrite(S.holder.Holder_ID, null);
        return;
      }
      var r = x.j.reasons || [];
      D.error = r.indexOf('EMAIL_CHANGED') >= 0 ? 'The guest\'s e-mail changed meanwhile. Nothing was sent — open Send again to see the new address.'
        : r.indexOf('ALREADY_SENT') >= 0 ? 'It may already have reached the guest. Nothing was sent — tick "send it again anyway" if you are sure.'
        : r.indexOf('IN_PROGRESS') >= 0 ? 'Another send of this statement is in progress. Nothing more was sent.'
        : 'Nothing was sent: ' + (x.j.error || 'refused');
      if (r.indexOf('EMAIL_CHANGED') >= 0) D.sendKey = key();
      draw();
    });
  }
  function payGo() {
    var P = S.pay; if (!P || P.busy) return;
    var body = { Payment_ID: P.id };
    if (P.kind === 'reject') { body.Reject_Reason = String(P.reason || '').trim(); if (!body.Reject_Reason) return; }
    var path = P.kind === 'verify' ? 'payment/verify' : P.kind === 'reject' ? 'payment/reject' : 'payment/decision-resolve';
    P.busy = true; P.msg = ''; draw();
    api(path, { method: 'POST', body: body }).then(function (x) {
      P.busy = false;
      var id = P.id;
      if (x.ok) { S.pay = { msg: (P.kind === 'verify' ? 'Verified: ' : P.kind === 'reject' ? 'Rejected: ' : 'Resumed: ') + id + '.' }; refreshAfterWrite(S.holder.Holder_ID, S.panel); return; }
      S.pay = { msg: x.j.outcomeUncertain ? 'Google did not confirm the decision on ' + id + '. It stays claimed; resume it in about ten minutes.'
        : 'Nothing was changed on ' + id + ': ' + (x.j.error || 'refused') };
      draw();
      if (x.j.outcomeUncertain || x.j.decided) refreshAfterWrite(S.holder.Holder_ID, S.panel);
    });
  }
  /* after a write, the guest is read again from the server — the page never patches figures itself */
  function refreshAfterWrite(id, panel) {
    var keepMsg = S.msg, keepPay = S.pay && S.pay.msg ? { msg: S.pay.msg } : null, keepSend = S.send, keepIssue = S.issue;
    /* the list's figures for this guest are stale too: read again on the way back */
    S.overviewStale = true;
    return loadHolder(id).then(function () {
      S.msg = keepMsg; if (keepPay) S.pay = keepPay;
      if (panel === 'view') { S.panel = 'view'; S.issue = null; }
      else if (panel === 'preview') { S.panel = 'preview'; S.issue = keepIssue && !keepIssue.done ? { checked: false, error: keepIssue.error } : null; }
      else if (panel === 'send') { S.panel = 'send'; S.send = keepSend; }
      draw();
    });
  }

  /* ---------------------------------------------------------------- wiring */
  /* PRINT / PDF: every closed detail opens for the paper and closes again after; the browser's own print saves a PDF */
  function printReport() {
    if (typeof window.print !== 'function') return;
    var closed = Array.prototype.filter.call(root.querySelectorAll('details'), function (d) { return !d.open; });
    closed.forEach(function (d) { d.open = true; });
    var restore = function () { closed.forEach(function (d) { d.open = false; }); window.removeEventListener('afterprint', restore); };
    if (window.addEventListener) window.addEventListener('afterprint', restore);
    window.print();
  }
  function on(sel, ev, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) { el['on' + ev] = function (e) { fn(el, e); }; }); }
  function wire() {
    on('[data-ab-retry]', 'click', function () { start(); });
    on('[data-ab-filter]', 'click', function (el) { S.filter = el.getAttribute('data-ab-filter'); draw(); });
    var q = root.querySelector('[data-ab-q]');
    if (q) q.oninput = function () { S.q = q.value; var pos = q.selectionStart; draw(); var n = root.querySelector('[data-ab-q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
    on('[data-ab-open]', 'click', function (el) { go('#holder=' + el.getAttribute('data-ab-open')); });
    on('[data-ab-open]', 'keydown', function (el, e) { if (e && e.target && e.target !== el && e.target.tagName === 'BUTTON') return; if (e && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go('#holder=' + el.getAttribute('data-ab-open')); } });
    on('[data-ab-back]', 'click', function (el, e) { if (e) e.preventDefault(); if (S.overviewStale) { S.overviewStale = false; go('#guests'); start(); } else go('#guests'); });
    on('[data-ab-tab]', 'click', function (el, e) { if (e) e.preventDefault(); go(el.getAttribute('data-ab-tab')); });
    on('[data-ab-reload]', 'click', function () { if (S.route.id) loadHolder(S.route.id); draw(); });
    on('[data-ab-rev-reload]', 'click', function () { loadRevenue(); draw(); });
    on('[data-ab-bd]', 'toggle', function (el) { S.budgetOpen[el.getAttribute('data-ab-bd')] = !!el.open; });
    on('[data-ab-act]', 'click', function (el) {
      var a = el.getAttribute('data-ab-act');
      S.msg = '';
      if (a === 'preview') { S.panel = 'preview'; S.issue = null; S.send = null; S.confirm = null; }
      else if (a === 'confirm') { openConfirm(); return; }
      else if (a === 'issue') { if (S.panel === 'preview') S.issue = { checked: false }; }
      else if (a === 'view') { S.panel = 'view'; S.issue = null; S.send = null; S.confirm = null; }
      else if (a === 'download') { download(); return; }
      else if (a === 'send') { openSend(); return; }
      draw();
    });
    on('[data-ab-close]', 'click', function () { S.issue = null; if (S.panel === 'send' || S.panel === 'confirm') { S.panel = null; S.send = null; S.confirm = null; } draw(); });
    on('[data-ab-confirm-check]', 'change', function (el) { if (S.confirm) { S.confirm.checked = !!el.checked; draw(); } });
    on('[data-ab-confirm-ack]', 'change', function (el) { if (S.confirm) { S.confirm.ack = !!el.checked; draw(); } });
    on('[data-ab-confirm-prices]', 'change', function (el) { if (S.confirm) { S.confirm.prices = !!el.checked; draw(); } });
    on('[data-ab-issue-prices]', 'change', function (el) { if (S.issue) { S.issue.prices = !!el.checked; draw(); } });
    on('[data-ab-confirm-go]', 'click', function () { confirmNow(); });
    on('[data-ab-issue-check]', 'change', function (el) { if (S.issue) { S.issue.checked = !!el.checked; draw(); } });
    on('[data-ab-issue-go]', 'click', function () { issueNow(); });
    on('[data-ab-send-check]', 'change', function (el) { if (S.send) { S.send.checked = !!el.checked; draw(); } });
    on('[data-ab-send-again]', 'change', function (el) { if (S.send) { S.send.again = !!el.checked; draw(); } });
    on('[data-ab-send-go]', 'click', function () { sendNow(); });
    on('[data-ab-pay]', 'click', function (el) {
      var kind = el.getAttribute('data-ab-pay'), id = el.getAttribute('data-id');
      S.pay = { id: id, kind: kind, reason: '' };
      draw();
    });
    var reason = root.querySelector('[data-ab-pay-reason]');
    if (reason) reason.oninput = function () { if (S.pay) { S.pay.reason = reason.value; var go2 = root.querySelector('[data-ab-pay-go]'); if (go2) go2.disabled = !reason.value.trim() || !!S.pay.busy; } };
    on('[data-ab-pay-go]', 'click', function () { payGo(); });
    /* the Owners' own bookings */
    Array.prototype.forEach.call(root.querySelectorAll('[data-ob-f]'), function (el) {
      var k = el.getAttribute('data-ob-f');
      el[el.type === 'checkbox' || el.tagName === 'SELECT' ? 'onchange' : 'oninput'] = function () {
        S.obForm = S.obForm || {}; S.obForm[k] = el.type === 'checkbox' ? !!el.checked : el.value;
        if (k === 'itemId') { S.obForm.room = ''; draw(); return; }
        if (k === 'personId') { draw(); return; }
        var addBtn = root.querySelector('[data-ob-add]'); if (addBtn) addBtn.disabled = !(S.obForm.personId && S.obForm.itemId) || !!S.ownerBusy;
      };
    });
    on('[data-ob-add]', 'click', function () { var f = S.obForm || {}; ownerWrite({ action: 'add', entry: { personId: f.personId, itemId: f.itemId, room: f.room, extraBed: !!f.extraBed, note: f.note } }); });
    on('[data-ob-remove]', 'click', function (el) { ownerWrite({ action: 'remove', entryId: el.getAttribute('data-ob-remove') }); });
    on('[data-ob-confirm]', 'click', function () { ownerWrite({ action: 'confirm' }); });
    on('[data-ab-csvsep]', 'change', function (el) { S.csvSep = el.value === ';' ? ';' : ','; draw(); });
    on('[data-ab-csv]', 'click', function (el) {
      var k = el.getAttribute('data-ab-csv'), today = new Date().toISOString().slice(0, 10), doc = null, name = '';
      if (k === 'guests-all' || k === 'guests-shown') { doc = guestCsv(k === 'guests-all' ? 'all' : 'shown'); name = 'guest-list-' + (k === 'guests-all' ? 'complete' : 'filtered') + '-' + today + '.csv'; }
      else if (S.revenue && k === 'rooming') { doc = roomingCsv(); name = 'hotel-rooming-list-' + today + '.csv'; }
      else if (S.revenue && (k === 'finance-summary' || k === 'budget-vs-actual' || k === 'reconciliation-004')) { doc = finCsv(k); name = (k === 'reconciliation-004' ? '004-reconciliation-proposed-additions' : k) + '-' + today + '.csv'; }
      else if (S.revenue && k === 'receivables') { doc = receivablesCsv(); name = 'revenue-receivables-' + today + '.csv'; }
      else if (S.revenue && (k === 'souphattra-revenue' || k === 'revenue-by-class' || k === 'pass-through')) { doc = classesCsv(k); name = (k === 'pass-through' ? 'pass-through-collections' : k) + '-' + today + '.csv'; }
      if (doc) saveText(name, doc);
    });
    on('[data-ab-print]', 'click', function () { printReport(); });
    on('[data-ab-rl-csv]', 'click', function (el) {
      var id = el.getAttribute('data-ab-rl-csv'), BG = S.revenue && S.revenue.budget, c = BG && (BG.centres || []).filter(function (x) { return x.id === id; })[0];
      if (!c || typeof Blob === 'undefined') return;
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csvOf(rateRows(c, BG.roomList012))], { type: 'text/csv;charset=utf-8' }));
      a.download = 'room-rate-list-' + id + '-' + (BG.asOf || 'today') + '.csv'; document.body.appendChild(a); a.click(); a.parentNode.removeChild(a);
    });
    on('[data-ab-rl-approve]', 'click', function (el) {
      var id = el.getAttribute('data-ab-rl-approve'), BG = S.revenue && S.revenue.budget, c = BG && (BG.centres || []).filter(function (x) { return x.id === id; })[0];
      if (!c || S.rlBusy) return;
      var rows = rateRows(c, BG.roomList012).map(function (r) { var o = {}; RL_HEAD.forEach(function (h, i) { o[h] = r[i]; }); return o; });
      S.rlBusy = true; draw();
      api('admin/rate-list', { method: 'POST', body: { stay: id, rows: rows } }).then(function (x) {
        S.rlBusy = false;
        S.rlMsg = { stay: id, text: x.ok ? (x.j.unchanged ? 'Unchanged since version ' + x.j.version.n + ' — nothing new to approve.' : 'Approved as version ' + x.j.version.n + '.') : (x.j.error || 'Not approved.') };
        return api('admin/rate-list?stay=' + encodeURIComponent(id)).then(function (y) { if (y.ok) S.rl[id] = y.j; draw(); });
      });
    });
    on('[data-ab-bed-set]', 'click', function (el) {
      var kl = String(el.getAttribute('data-ab-bed-set') || '').split('|'), sel = root.querySelector('[data-ab-bed-who="' + kl.join('|') + '"]');
      var id = S.holder && S.holder.Holder_ID; if (!sel || !id || S.bedBusy) return;
      S.bedBusy = true; S.bedMsg = ''; draw();
      api('admin/extra-bed', { method: 'POST', body: { key: kl[0], label: kl[1], guestId: sel.value } }).then(function (x) {
        S.bedBusy = false; S.bedMsg = x.ok ? 'Recorded. Nobody moved; the extra bed is now priced by this person\'s own 009 row.' : (x.j.error || 'Not recorded.');
        return loadHolder(id).then(function () { S.bedMsg = x.ok ? 'Recorded. Nobody moved; the extra bed is now priced by this person\'s own 009 row.' : (x.j.error || 'Not recorded.'); draw(); });
      });
    });
    on('[data-ab-pay-cancel]', 'click', function () { S.pay = null; draw(); });
    /* the original PDF of a version (holder view) and of the current version (a guest's row — the row itself is not opened) */
    on('[data-ab-pdf]', 'click', function (el) { download(S.holder && S.holder.Holder_ID, el.getAttribute('data-ab-pdf-sid'), el.getAttribute('data-ab-pdf')); });
    on('[data-ab-row-pdf]', 'click', function (el, e) { if (e && e.stopPropagation) e.stopPropagation(); download(el.getAttribute('data-ab-row-pdf'), el.getAttribute('data-ab-pdf-sid'), el.getAttribute('data-ab-pdf-rev')); });
    if (EXT && EXT.wire) EXT.wire(root, on);
  }

  /* ----------------------------------------------------------------- boot */
  function boot(el) {
    root = el || document.getElementById('admin');
    if (!root) return;
    if (EXT && EXT.init) EXT.init({ api: api, esc: esc, draw: draw, go: go, csvDoc: csvDoc, csvSep: csvSep, saveText: saveText, when: when, day: day, nowStamp: nowStamp,
      revenue: function () { return S.revenue; }, revenuePhase: function () { return S.revenuePhase; }, loadRevenue: loadRevenue });
    if (typeof window.addEventListener !== 'function') { hashEvents = false; start(); return; }
    window.addEventListener('hashchange', function () { if (S.phase === 'ready') onRoute(); });
    /* an unsaved seating or room draft is never lost by leaving the page unawares — the browser asks */
    window.addEventListener('beforeunload', function (e) { if (EXT && EXT.unsaved && EXT.unsaved()) { e.preventDefault(); e.returnValue = ''; } });
    /* signed out, or in as someone else, in another tab: everything held is dropped at once */
    window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') { S = Object.assign(S, { overview: null, status: {}, holder: null, revenue: null, revenuePhase: 'idle' }); start(); } });
    start();
  }
  window.SIYL_ADMIN_BILLING = { boot: boot, state: function () { return S; }, page: page, matches: matches, review: review, ext: EXT,
    /* the exports as text, for the tests (nothing is downloaded by these) */
    csv: { cell: csvCell, guests: function (kind) { return guestCsv(kind || 'all'); }, rooming: function () { return roomingCsv(); }, finance: function (k) { return finCsv(k); }, receivables: function () { return receivablesCsv(); }, classes: function (k) { return classesCsv(k); } } };
  var hasPage = function () { return typeof document.getElementById === 'function' && !!document.getElementById('admin'); };
  if (document.readyState !== 'loading') { if (hasPage()) boot(); }
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', function () { if (hasPage()) boot(); });
})();
