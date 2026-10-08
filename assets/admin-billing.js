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
  var FILTERS = [['all', 'All'], ['booked', 'Booked'], ['toConfirm', 'To confirm'], ['notIssued', 'Not issued'], ['issued', 'Issued'], ['outstanding', 'Outstanding'], ['paid', 'Paid'], ['overdue', 'Overdue'], ['review', 'Manual review']];

  /* ------------------------------------------------------------- the state */
  var S = {
    phase: 'idle', error: '', overview: null, status: {}, checked: 0, checking: false, statusError: '',
    filter: 'all', q: '', route: { view: 'guests', id: null },
    holder: null, holderPhase: 'idle', holderError: '', panel: null,
    issue: null, send: null, pay: null, confirm: null, msg: '', download: '',
    revenue: null, revenuePhase: 'idle', revenueError: '',
  };
  var root = null;

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
    if (h === 'revenue') return { view: 'revenue', id: null };
    return { view: 'guests', id: null };
  }
  var hashEvents = true;
  function go(hash) { if (location.hash === hash || !hashEvents) { location.hash = hash; onRoute(); } else location.hash = hash; }
  function onRoute() {
    S.route = readRoute();
    S.panel = null; S.issue = null; S.send = null; S.pay = null; S.confirm = null; S.msg = ''; S.download = '';
    if (S.route.view === 'holder') loadHolder(S.route.id);
    else if (S.route.view === 'revenue' && S.revenuePhase === 'idle') loadRevenue();
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
      S.phase = 'ready'; S.overview = x.j; S.status = {}; S.checked = 0;
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
      if (i >= ids.length) { S.checking = false; draw(); return; }
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
  function loadHolder(id) {
    S.holder = null; S.holderPhase = 'loading'; S.holderError = '';
    return api('admin/holder?holder=' + encodeURIComponent(id)).then(function (x) {
      if (S.route.id !== id) return;
      if (x.status === 403) { S.phase = 'denied'; draw(); return; }
      if (!x.ok) { S.holderPhase = 'error'; S.holderError = x.j.error || 'This guest could not be read.'; draw(); return; }
      S.holder = x.j; S.holderPhase = 'ready'; draw();
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
  function matches(h, f) {
    var s = h.settlement, p = h.payment, st = S.status[h.Holder_ID];
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
    var head = '<tr><th>Guest</th><th>Guest Relations</th><th class="num">Booked value</th><th>Statement</th><th>Issued · due</th><th class="num">Statement total</th><th class="num">Paid</th><th class="num">Outstanding</th><th>Method</th><th>Review</th></tr>';
    var body = shown.map(function (h) {
      var s = h.settlement || {}, p = h.payment, rv = review(h);
      var out = p ? (p.overdue ? '<span class="ab-chip open">Overdue</span> ' : '') + '<span data-i18n-skip>' + esc(usd(Math.max(0, Number(p.balance) || 0))) + '</span>' : '<span class="ab-mute">—</span>';
      return '<tr data-ab-open="' + esc(h.Holder_ID) + '" tabindex="0">' +
        '<td data-l="Guest"><span class="ab-name">' + esc(h.name ? h.name.full : '(no 006 name)') + '</span><span class="ab-id">' + esc(h.Holder_ID) + (h.billingAdmin ? ' · admin' : '') + '</span></td>' +
        '<td data-l="Guest Relations">' + confChip(S.status[h.Holder_ID]) + '</td>' +
        '<td data-l="Booked value" class="num">' + bookedCell(h) + '</td>' +
        '<td data-l="Statement">' + esc(stmtWords(h)) + (p ? '<br><span class="ab-mute">' + esc(PAY[p.status] || p.status || '') + (p.pendingCount ? ' · ' + p.pendingCount + ' reported' : '') + '</span>' : '') + '</td>' +
        '<td data-l="Issued · due">' + (s.issueDate ? esc(day(s.issueDate)) + '<br><span class="ab-mute">due ' + esc(day(s.dueDate)) + '</span>' : '<span class="ab-mute">—</span>') + '</td>' +
        '<td data-l="Statement total" class="num">' + totalCell(h) + '</td>' +
        '<td data-l="Paid" class="num">' + (p ? '<span data-i18n-skip>' + esc(usd(p.ist)) + '</span>' : '<span class="ab-mute">—</span>') + '</td>' +
        '<td data-l="Outstanding" class="num">' + out + '</td>' +
        '<td data-l="Method">' + methodWords(h) + '</td>' +
        '<td data-l="Review">' + (rv.length ? '<span class="ab-chip open">' + esc(rv.join(' · ')) + '</span>' : '<span class="ab-mute">—</span>') + '</td></tr>';
    }).join('');
    return '<section class="ab-sec" aria-label="Guests">' +
      '<div class="ab-tools"><label class="ab-search"><span class="t-l1">Search</span><input type="search" placeholder="Name or INV-…" value="' + esc(S.q) + '" data-ab-q autocomplete="off"></label>' +
      '<div class="ab-filters" role="group" aria-label="Filter">' + chips + '</div></div>' + progress +
      (shown.length ? '<div class="ab-table-wrap"><table class="ab-table"><thead>' + head + '</thead><tbody>' + body + '</tbody></table></div>'
        : '<p class="t-b1 ab-empty">No guest matches this filter.</p>') +
      '<p class="t-b2 ab-foot">' + rows.length + ' invitations of the register · as of ' + esc(day(o.asOf)) + '<br>' +
      '<b>Booked value</b> — what the guest has selected now, priced by the Billing Engine now; it is not a statement and does not make anyone issuable. ' +
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
      act('download', 'Download PDF', !!iss, iss ? '' : 'Not issued yet.') +
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
    return head + panelView() + bookedView() + paymentsView() + mailView();
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
      (revs.length ? '<p class="t-l1">Revisions</p><ul class="t-b2 ab-revs">' + revs.map(function (r) {
        return '<li>V' + esc(r.Revision) + ' · ' + esc(r.Revision_State) + (r.total != null ? ' · ' + esc(usd(r.total)) : '') + (r.issuedAt ? ' · issued ' + esc(when(r.issuedAt)) + (r.issuedBy ? ' by ' + esc(r.issuedBy) : '') : '') + '</li>';
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
  var KPIS = [['confirmedRevenue', 'Confirmed revenue'], ['issuedRevenue', 'Issued revenue'], ['cashCollected', 'Cash collected'], ['outstanding', 'Outstanding'],
    ['overdue', 'Overdue'], ['refundDue', 'Refund due'], ['hostedValue', 'Hosted value'], ['driftExposure', 'Drift exposure']];
  function kpiAmount(k) {
    if (!k) return '—';
    if (k.complete && k.amount != null) return usd(k.amount);
    if (k.partial && k.partial.amount != null) return usd(k.partial.amount) + ' · partial';
    return '—';
  }
  function revenueView() {
    if (S.revenuePhase === 'loading' || S.revenuePhase === 'idle') return '<p class="t-b2 ab-progress" role="status">Calculating the revenue overview with the Billing Engine…</p>';
    if (S.revenuePhase === 'error') return '<div class="p-card"><p class="t-b1">' + esc(S.revenueError) + '</p><div class="p-actions"><button type="button" class="p-link" data-ab-rev-reload>Try again</button></div></div>';
    var R = S.revenue;
    var cards = KPIS.map(function (k) {
      var x = R[k[0]];
      return '<div class="p-card ab-kpi"><p class="t-l1">' + esc(k[1]) + '</p><p class="t-h1" data-i18n-skip>' + esc(kpiAmount(x)) + '</p>' +
        (x && !x.complete ? '<p class="t-b2 ab-why">Manual review: ' + esc((x.gaps || []).length) + ' gap' + ((x.gaps || []).length === 1 ? '' : 's') + '</p>' : '') +
        '<p class="t-b2 ab-mute">' + esc(x && x.definition || '') + '</p></div>';
    }).join('');
    var q = (R.quotaUtilisation || []).map(function (u) {
      return '<tr><td data-l="Item"><span data-i18n-skip>' + esc(u.Item_ID) + '</span></td><td data-l="Unit">' + esc(u.Quota_Unit || '—') + '</td><td data-l="Quota" class="num">' + esc(u.Quota != null ? u.Quota : '—') + '</td>' +
        '<td data-l="Used" class="num">' + esc(u.used) + '</td><td data-l="Remaining" class="num">' + esc(u.remaining != null ? u.remaining : '—') + '</td>' +
        '<td data-l="Utilisation" class="num">' + esc(u.utilisation != null ? u.utilisation + ' %' : '—') + (u.overQuota ? ' <span class="ab-chip open">over</span>' : '') + '</td></tr>';
    }).join('');
    var counts = R.counts || {};
    return '<section class="ab-sec" aria-label="Revenue"><div class="ab-kpis">' + cards + '</div>' +
      '<p class="t-b2 ab-foot">' + (R.population ? esc(R.population.holders) + ' holders with a statement, a confirmation or a drift record · ' : '') + esc(counts.settlements || 0) + ' settlements · ' + esc(counts.issuedRevisions || 0) + ' issued revisions · ' + esc(counts.holdersUnderReview || 0) + ' under review · as of ' + esc(day(R.asOf)) + ' · engine ' + esc(R.engineVersion || '') + '</p>' +
      '<div class="p-card ab-panel"><p class="t-l1">Quota utilisation</p>' + (q ? '<div class="ab-table-wrap"><table class="ab-table"><thead><tr><th>Item</th><th>Unit</th><th class="num">Quota</th><th class="num">Used</th><th class="num">Remaining</th><th class="num">Utilisation</th></tr></thead><tbody>' + q + '</tbody></table></div>' : '<p class="t-b2">No quota is in use yet.</p>') + '</div></section>';
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
    var tabs = '<nav class="ab-tabs" aria-label="Sections"><a href="/admin/billing#guests" data-ab-tab="#guests" class="' + (v !== 'revenue' ? 'on' : '') + '">Guests</a><a href="/admin/billing#revenue" data-ab-tab="#revenue" class="' + (v === 'revenue' ? 'on' : '') + '">Revenue</a>' +
      '<span class="ab-gate ' + (o.gate && o.gate.approved ? 'on' : 'open') + '">' + (o.gate && o.gate.approved ? 'Issue &amp; Publish enabled' : 'Activation Gate not approved') + '</span>' +
      '<span class="ab-who">Signed in · ' + esc(o.audience === 'BRIDE' ? 'Haruthai' : o.audience === 'GROOM' ? 'Suthep' : '') + '</span></nav>';
    return tabs + (v === 'holder' ? holderView() : v === 'revenue' ? revenueView() : listView());
  }

  /* --------------------------------------------------------------- actions */
  function download() {
    var x = S.holder && S.holder.issued; if (!x) return;
    var id = S.holder.Holder_ID;
    S.download = 'Preparing the PDF…'; draw();
    var a = auth();
    fetch('/api/billing/pdf?holder=' + encodeURIComponent(id) + '&rev=' + encodeURIComponent(x.revision), { headers: { 'x-siyl-auth': a ? a.bearer : '' }, cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('pdf ' + r.status); return r.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob), el = document.createElement('a');
        el.href = url; el.download = 'Statement-' + x.Settlement_ID + '-V' + x.revision + '.pdf';
        document.body.appendChild(el); el.click(); el.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
        S.download = ''; draw();
      }, function () { S.download = 'The PDF could not be downloaded just now. Please try again.'; draw(); });
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
  function on(sel, ev, fn) { Array.prototype.forEach.call(root.querySelectorAll(sel), function (el) { el['on' + ev] = function (e) { fn(el, e); }; }); }
  function wire() {
    on('[data-ab-retry]', 'click', function () { start(); });
    on('[data-ab-filter]', 'click', function (el) { S.filter = el.getAttribute('data-ab-filter'); draw(); });
    var q = root.querySelector('[data-ab-q]');
    if (q) q.oninput = function () { S.q = q.value; var pos = q.selectionStart; draw(); var n = root.querySelector('[data-ab-q]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
    on('[data-ab-open]', 'click', function (el) { go('#holder=' + el.getAttribute('data-ab-open')); });
    on('[data-ab-open]', 'keydown', function (el, e) { if (e && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); go('#holder=' + el.getAttribute('data-ab-open')); } });
    on('[data-ab-back]', 'click', function (el, e) { if (e) e.preventDefault(); if (S.overviewStale) { S.overviewStale = false; go('#guests'); start(); } else go('#guests'); });
    on('[data-ab-tab]', 'click', function (el, e) { if (e) e.preventDefault(); go(el.getAttribute('data-ab-tab')); });
    on('[data-ab-reload]', 'click', function () { if (S.route.id) loadHolder(S.route.id); draw(); });
    on('[data-ab-rev-reload]', 'click', function () { loadRevenue(); draw(); });
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
    on('[data-ab-pay-cancel]', 'click', function () { S.pay = null; draw(); });
  }

  /* ----------------------------------------------------------------- boot */
  function boot(el) {
    root = el || document.getElementById('admin');
    if (!root) return;
    if (typeof window.addEventListener !== 'function') { hashEvents = false; start(); return; }
    window.addEventListener('hashchange', function () { if (S.phase === 'ready') onRoute(); });
    /* signed out, or in as someone else, in another tab: everything held is dropped at once */
    window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') { S = Object.assign(S, { overview: null, status: {}, holder: null, revenue: null, revenuePhase: 'idle' }); start(); } });
    start();
  }
  window.SIYL_ADMIN_BILLING = { boot: boot, state: function () { return S; }, page: page, matches: matches, review: review };
  var hasPage = function () { return typeof document.getElementById === 'function' && !!document.getElementById('admin'); };
  if (document.readyState !== 'loading') { if (hasPage()) boot(); }
  else if (document.addEventListener) document.addEventListener('DOMContentLoaded', function () { if (hasPage()) boot(); });
})();
