/* ============================================================================
   THE PRE-WEDDING DINNER IN THE OWNERS' CONSOLE (Owners, 22 Nov 2026 · HS-058) — one more area beside Seating and Room
   assignments: who answered, who is complete (exactly 2 dishes + 1 drink + 1 dessert, confirmed), every guest's order with the
   item codes, the restaurant's totals per item, the real value in LAK, the 10% service charge the menu states, the amount the
   couple covers and the guest's LAK 0. "Release to the restaurant" only RECORDS the Owners' release (and locks the guests'
   orders); nothing is ever sent from here — the order sheet is downloaded and sent by the Owners themselves.
   Merged into window.SIYL_ADMIN_EXT (assets/admin-assign.js), never replacing it. BILLING_ADMIN only (the route's gate).
   ========================================================================== */
(function () {
  'use strict';
  var prev = window.SIYL_ADMIN_EXT || { views: {}, tabs: [] };
  var C = null, P = { phase: 'idle', data: null, error: '', note: '', tick: false, busy: false };
  function esc(t) { return C ? C.esc(t) : String(t == null ? '' : t); }
  function lak(n) { return 'LAK ' + Number(n || 0).toLocaleString('en-US'); }

  function load() {
    P.phase = 'loading'; P.error = ''; C.draw();
    return C.api('admin/pwd').then(function (x) {
      if (!x.ok) { P.phase = 'error'; P.error = x.j.error || 'The dinner orders could not be read just now.'; C.draw(); return; }
      P.data = x.j; P.phase = 'ready'; P.tick = false; C.draw();
    });
  }
  function release(action) {
    if (P.busy || !P.data) return; P.busy = true; P.note = ''; C.draw();
    C.api('admin/pwd/release', { method: 'POST', body: { action: action, expectDigest: P.data.digest } }).then(function (x) {
      P.busy = false;
      if (!x.ok) { P.note = x.j.reason === 'CHANGED' ? 'An order changed since this page was read. Read again, check, then release.' : x.j.reason === 'NOTHING_CONFIRMED' ? 'No submitted order yet.' : (x.j.error || x.j.reason || 'Not done.'); C.draw(); return; }
      P.note = action === 'release' ? 'Released. The guests’ orders are locked. Download the order sheet and send it to the restaurant yourselves.' : 'Release withdrawn. Guests can change their orders again.';
      load();
    });
  }

  function guests() { return (P.data && P.data.guests) || []; }
  function orderOf(id) { return ((P.data && P.data.orders) || []).filter(function (o) { return o.guestId === id; })[0] || null; }
  function statusOf(o) {
    if (!o || !o.rsvp) return ['Not answered', 'mute'];
    if (o.rsvp === 'no') return ['Not joining', 'mute'];
    if (o.changing) return ['Submitted · being changed (last version counts)', 'open'];
    if (o.complete) return ['Complete · submitted', 'ok'];
    return ['Open · ' + o.chosen + ' of ' + o.needed, 'open'];
  }
  function itemsText(o) { return (o && (o.complete ? o.effective : o.items) || []).map(function (x) { return (x.code || '—') + ' ' + x.name + (x.qty > 1 ? ' ×' + x.qty : ''); }).join(' · '); }
  function figures() {
    var all = guests(), joining = 0, complete = 0, no = 0, none = 0;
    all.forEach(function (g) { var o = orderOf(g.guestId); if (!o || !o.rsvp) none++; else if (o.rsvp === 'no') no++; else { joining++; if (o.complete) complete++; } });
    return { joining: joining, complete: complete, open: joining - complete, pct: joining ? Math.round(100 * complete / joining) : 0, no: no, none: none, all: all.length };
  }

  function view() {
    if (P.phase === 'loading' || P.phase === 'idle') return '<section class="as-sec"><p class="t-b2">Reading the dinner orders…</p></section>';
    if (P.phase === 'error') return '<section class="as-sec"><p class="t-b2">' + esc(P.error) + '</p><p><button type="button" class="p-link" data-pwd-reload>Read again</button></p></section>';
    var d = P.data, f = figures(), r = d.restaurant, rel = d.release && d.release.active ? d.release : null;
    var h = '<section class="as-sec pwd-admin"><p class="t-l1">' + esc(d.event.when) + ' · ' + esc(d.event.venue) + '</p><h2 class="t-h2">Pre-Wedding Dinner</h2>';
    h += '<div class="pwd-kpis">' + [['Joining', f.joining], ['Complete', f.complete], ['Open', f.open], ['Completion', f.pct + '%'], ['Not joining', f.no], ['Not answered', f.none]]
      .map(function (k) { return '<div class="pwd-kpi"><span class="pwd-kv">' + esc(String(k[1])) + '</span><span class="pwd-kl">' + esc(k[0]) + '</span></div>'; }).join('') + '</div>';
    h += '<p class="t-b2 mute">An order is complete only when the guest has chosen exactly 2 dishes, 1 drink and 1 dessert and submitted it. This list is separate from the Wedding Dinner\u2019s. Guests\u2019 first names come from their own sessions.</p>';
    /* the money: the real value, the menu's service charge, the couple's cover, the guests' 0 */
    h += '<div class="p-card pwd-money-card"><p class="t-l1">Submitted orders · ' + r.guests + ' guest' + (r.guests === 1 ? '' : 's') + '</p>' +
      '<p class="pwd-mrow"><span>Order value (menu prices)</span><span>' + lak(r.value) + '</span></p>' +
      '<p class="pwd-mrow"><span>Service charge 10% (as the menu states)</span><span>' + lak(r.service) + '</span></p>' +
      '<p class="pwd-mrow"><strong>Covered by <span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span></strong><strong>' + lak(r.covered) + '</strong></p>' +
      '<p class="pwd-mrow"><span>Guests pay</span><span>LAK 0</span></p></div>';
    /* the restaurant's totals */
    h += '<h3 class="t-h3">For the restaurant · totals per item</h3>' + (r.lines.length ? '<div class="ab-table-wrap"><table class="ab-table pwd-table"><thead><tr><th>Code</th><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr></thead><tbody>' +
      r.lines.map(function (x) { return '<tr><td>' + esc(x.code || '—') + '</td><td>' + esc(x.name) + '</td><td>' + x.qty + '</td><td>' + lak(x.price) + '</td><td>' + lak(x.amount) + '</td></tr>'; }).join('') +
      '</tbody></table></div>' : '<p class="t-b2">No submitted order yet.</p>');
    /* every guest */
    h += '<h3 class="t-h3">Every guest</h3><div class="ab-table-wrap"><table class="ab-table pwd-table"><thead><tr><th>Guest</th><th>Status</th><th>Order</th><th>Value</th></tr></thead><tbody>' +
      guests().map(function (g) { var o = orderOf(g.guestId), s = statusOf(o);
        return '<tr><td>' + esc(g.first || '\u2014') + ' <span class="mute">' + esc(g.guestId) + '</span></td><td class="pwd-' + s[1] + '">' + esc(s[0]) + '</td><td>' + esc(itemsText(o)) + '</td><td>' + (o && o.rsvp === 'yes' ? lak(o.complete ? o.effectiveTotal : o.total) : '') + '</td></tr>'; }).join('') +
      '</tbody></table></div>';
    /* the release: recorded, never sent */
    h += '<div class="p-card pwd-release"><p class="t-l1">Release to the restaurant</p>';
    if (rel) h += '<p class="t-b2">Released (version ' + rel.version + ', ' + esc(C.when ? C.when(rel.at) : rel.at) + ', ' + rel.guests + ' guests, ' + lak(rel.total) + '). Guests’ orders are locked.' +
      (rel.digest !== d.digest ? ' <strong>The orders differ from the released version.</strong>' : '') + '</p><p><button type="button" class="p-link" data-pwd-withdraw' + (P.busy ? ' disabled' : '') + '>Withdraw the release</button></p>';
    else h += '<p class="t-b2">Releasing records the submitted orders as final and locks every guest\u2019s order, including guests who have not answered yet (withdraw the release to reopen). Nothing is sent: download the sheet and send it to the restaurant yourselves.</p>' +
      '<label class="pwd-tick"><input type="checkbox" data-pwd-tick' + (P.tick ? ' checked' : '') + '> I have checked the orders above.</label>' +
      '<p><button type="button" class="p-act" data-pwd-release' + (P.tick && !P.busy && r.guests ? '' : ' disabled') + '>Release to the restaurant</button></p>';
    h += '</div><p class="as-actions"><button type="button" class="p-link" data-pwd-csv>Download the restaurant order sheet (CSV)</button> · <button type="button" class="p-link" data-pwd-reload>Read again</button></p>';
    if (P.note) h += '<p class="t-b2 pwd-note" role="status">' + esc(P.note) + '</p>';
    return h + '</section>';
  }

  /* the restaurant's sheet: the totals per item first, then every confirmed order — codes, names, quantities, prices in LAK */
  function csv() {
    var d = P.data; if (!d) return '';
    /* once released, the sheet is the release's own snapshot: exactly what was recorded as given to the restaurant */
    var rel = d.release && d.release.active && d.release.lines ? d.release : null;
    if (rel) {
      var byId = {}; (d.menu || []).forEach(function (c) { c.items.forEach(function (x) { byId[x.id] = x; }); });
      var rr = rel.lines.map(function (x) { return ['TOTAL', '', x.code || '', x.name, x.qty, x.price, x.amount]; });
      (rel.orders || []).forEach(function (o, i) { o.items.forEach(function (x) { var it = byId[x.id] || {}; rr.push(['GUEST ' + (i + 1), o.firstName || '', x.code || '', it.name || x.id, x.qty, it.price || '', it.price ? it.price * x.qty : '']); }); });
      return C.csvDoc('Pre-Wedding Dinner · ' + d.event.when + ' · ' + d.event.venue + ' · as released',
        [['Released', 'version ' + rel.version + ' · ' + rel.at], ['Guests', rel.guests], ['Order value LAK', rel.value], ['Service charge 10% LAK', rel.service], ['Total LAK (covered by Haruthai & Suthep)', rel.total]],
        ['Section', 'Guest', 'Code', 'Item', 'Qty', 'Price LAK', 'Amount LAK'], rr);
    }
    var rows = d.restaurant.lines.map(function (x) { return ['TOTAL', '', x.code || '', x.name, x.qty, x.price, x.amount]; });
    /* first names and item codes only — no guest id, no invitation, no contact (review, 22 Nov 2026) */
    var n = 0;
    guests().forEach(function (g) { var o = orderOf(g.guestId); if (!o || !o.complete) return; n++;
      o.effective.forEach(function (x) { rows.push(['GUEST ' + n, g.first || '', x.code || '', x.name, x.qty, x.price, x.amount]); }); });
    var r = d.restaurant;
    return C.csvDoc('Pre-Wedding Dinner · ' + d.event.when + ' · ' + d.event.venue,
      [['Confirmed guests', r.guests], ['Order value LAK', r.value], ['Service charge 10% LAK', r.service], ['Total LAK (covered by Haruthai & Suthep)', r.total], ['Release', d.release && d.release.active ? 'version ' + d.release.version + ' · ' + d.release.at : 'not released']],
      ['Section', 'Guest', 'Code', 'Item', 'Qty', 'Price LAK', 'Amount LAK'], rows);
  }

  function wire(root, on) {
    if (prev.wire) prev.wire(root, on);
    if (!root.querySelector('.pwd-admin') && !root.querySelector('[data-pwd-reload]')) return;
    on('[data-pwd-reload]', 'click', function () { load(); });
    on('[data-pwd-tick]', 'change', function (el) { P.tick = !!el.checked; C.draw(); });
    on('[data-pwd-release]', 'click', function () { if (P.tick) release('release'); });
    on('[data-pwd-withdraw]', 'click', function () { release('withdraw'); });
    on('[data-pwd-csv]', 'click', function () { var t = csv(); if (t) C.saveText('pre-wedding-dinner-restaurant-order-' + new Date().toISOString().slice(0, 10) + '.csv', t); });
  }

  var views = {}; Object.keys(prev.views || {}).forEach(function (k) { views[k] = prev.views[k]; }); views.pwd = view;
  window.SIYL_ADMIN_EXT = {
    views: views,
    tabs: (prev.tabs || []).concat([['pwd', 'Pre-Wedding Dinner']]),
    init: function (core) { C = core; if (prev.init) prev.init(core); },
    enter: function (v) { if (v === 'pwd') { if (P.phase === 'idle' || P.phase === 'error') load(); return; } if (prev.enter) prev.enter(v); },
    wire: wire,
    unsaved: function () { return prev.unsaved ? prev.unsaved() : false; },
    state: prev.state, csv: prev.csv, label: prev.label,
    pwd: { state: function () { return P; }, csv: csv, figures: figures }
  };
})();
