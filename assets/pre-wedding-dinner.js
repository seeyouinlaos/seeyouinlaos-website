/* ============================================================================
   THE PRE-WEDDING DINNER IN MY PROFILE (Owners, 22 Nov 2026 · HS-058) — Saturday 27 February 2027, 18:30, Cảm Ơn, Vientiane.
   The guest's own answer (joining / not joining) and, when joining, the binding menu choice: exactly two dishes, one drink and one
   dessert from the restaurant's own menu, then Submit. A submitted order is never changed silently: "Change my order" reopens it, and the
   last submitted version stays the restaurant's until a new one is submitted. ("Submitted", never "confirmed": that word is Guest
   Relations' — brief §10/§15.)
   Once the Owners have released the orders to the restaurant, the order is locked here.

   ONE CODE = ONE GUEST: every read and write carries the guest's own bearer; the Worker answers only that guest's order.
   NEVER THE BAG: nothing here touches siyl.bag, the trip's draft, the fingerprint, a statement or an amount the guest pays — the
   prices are the restaurant's, shown as the value the hosts cover; the guest pays LAK 0.
   The menu, the rule and the prices come from the Worker (src/pre-wedding-dinner.js) — never from this file.
   ========================================================================== */
(function () {
  'use strict';
  var API = '/api/pre-wedding-dinner';
  var st = { inv: '', data: null, loading: null, failed: false, busy: false, note: '', open: {} };
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function headers(json) { var a = auth(), h = {}; if (json) h['content-type'] = 'application/json'; if (a && a.bearer) h['x-siyl-auth'] = a.bearer; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lak(n) { return 'LAK ' + Number(n || 0).toLocaleString('en-US'); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:pwd')); } catch (e) {} }
  function same(inv) { var a = auth(); return !!(a && a.invitationId === inv); }

  function load(force) {
    var a = auth(); if (!a || !a.bearer) { st.data = null; return Promise.resolve(null); }
    if (st.inv !== a.invitationId) { st.inv = a.invitationId; st.data = null; st.note = ''; st.open = {}; }
    if (st.loading && !force) return st.loading;
    var inv = a.invitationId;
    st.loading = fetch(API, { headers: headers(false), cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) { st.loading = null; if (!same(inv)) return null; if (j && j.ok) { st.data = j; st.failed = false; } else st.failed = true; announce(); return j; },
        function () { st.loading = null; st.failed = true; announce(); return null; });
    return st.loading;
  }

  /* one write at a time; the server re-prices and re-checks everything; a stale answer reloads and says so */
  function send(body) {
    var d = st.data; if (!d || st.busy) return;
    var inv = st.inv;
    st.busy = true; st.note = ''; st.armNo = false; announce();
    body.expectRev = d.order.rev;
    fetch(API, { method: 'PUT', headers: headers(true), body: JSON.stringify(body) }).then(function (r) { return r.json().catch(function () { return null; }); })
      .then(function (j) {
        st.busy = false; if (!same(inv)) return;
        if (j && j.ok) { st.data.order = j.order; st.data.locked = !!j.locked; st.note = j.note || ''; announce(); return; }
        st.note = words(j && j.reason); announce();
        if (j && (j.reason === 'STALE' || j.reason === 'LOCKED' || j.reason === 'CONFIRMED')) load(true);
      }, function () { st.busy = false; st.note = 'We could not save just now. Your choice is unchanged — please try again.'; announce(); });
  }
  function words(reason) {
    return reason === 'STALE' ? 'Your order changed on another device. Here is the latest version.'
      : reason === 'LOCKED' ? 'Your order has been passed to the restaurant. For a change, please write to Haruthai\u00a0&\u00a0Suthep.'
      : reason === 'CONFIRMED' ? 'This order is submitted. Choose "Change my order" first.'
      : reason === 'INCOMPLETE' ? 'Please choose two dishes, one drink and one dessert first.'
      : reason === 'NO_ANSWER' ? 'Please tell us first whether you are joining.'
      : 'We could not save just now. Please try again.';
  }

  function itemsOf(order) { var m = {}; ((order && order.items) || []).forEach(function (x) { m[x.id] = x.qty; }); return m; }
  function toList(m) { return Object.keys(m).filter(function (k) { return m[k] > 0; }).map(function (k) { return { id: k, qty: m[k] }; }); }
  function countOf(d, m, pick) { var n = 0; d.menu.forEach(function (c) { if (c.pick !== pick) return; c.items.forEach(function (x) { n += m[x.id] || 0; }); }); return n; }

  /* a tap on a card: add one (a dish up to two in all), or take it away; a single drink / dessert swaps */
  function toggle(id, op) {
    var d = st.data; if (!d || d.locked || d.order.status === 'confirmed') return;
    var m = itemsOf(d.order), it = null, pick = '';
    d.menu.forEach(function (c) { c.items.forEach(function (x) { if (x.id === id) { it = x; pick = c.pick; } }); });
    if (!it) return;
    var max = d.rule[pick], have = countOf(d, m, pick);
    if (op === 'minus') { m[id] = Math.max(0, (m[id] || 0) - 1); }
    else if (have < max) { m[id] = (m[id] || 0) + 1; }
    else if (max === 1) { d.menu.forEach(function (c) { if (c.pick === pick) c.items.forEach(function (x) { delete m[x.id]; }); }); m[id] = 1; }
    else { st.note = 'You have chosen two dishes. Take one away to choose another.'; announce(); return; }
    send({ action: 'save', rsvp: 'yes', items: toList(m) });
  }

  function html() {
    var a = auth(); if (!a || !a.bearer) return '';
    var d = st.data;
    var head = '<section class="prep-sec pwd" id="pre-wedding-dinner" data-pwd><p class="t-l1">Saturday, 27 February 2027 · 18:30</p><h2 class="t-h2">Pre-Wedding Dinner</h2>' +
      '<p class="t-b2 measure">Cảm Ơn – Pho, Banh Mi &amp; Coffee, Vientiane · hosted by <span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span>. <a class="p-link" href="pre-wedding-dinner.html">About the evening</a></p>';
    if (!d) return head + '<div class="p-card"><p class="t-b2">' + (st.failed ? 'We could not load your dinner just now. <button type="button" class="p-link" data-pwd-retry>Try again</button>' : 'Loading your dinner…') + '</p></div></section>';
    var o = d.order, locked = !!d.locked, conf = o.status === 'confirmed';
    var h = head;
    /* 1 · the answer, the guest's own — separate from the Wedding Dinner's list */
    h += '<div class="p-card pwd-rsvp"><p class="t-l1">Are you joining?</p><div class="pwd-choice" role="group" aria-label="Are you joining the Pre-Wedding Dinner?">' +
      '<button type="button" class="pwd-opt' + (o.rsvp === 'yes' ? ' on' : '') + '" data-pwd-rsvp="yes" aria-pressed="' + (o.rsvp === 'yes') + '"' + (conf || locked ? ' disabled' : '') + '>Joining</button>' +
      '<button type="button" class="pwd-opt' + (o.rsvp === 'no' ? ' on' : '') + '" data-pwd-rsvp="no" aria-pressed="' + (o.rsvp === 'no') + '"' + (conf || locked ? ' disabled' : '') + '>Not joining</button></div></div>';
    if (locked && o.rsvp !== 'no' && !o.complete) {
      /* the list went to the restaurant without an order from this guest: said plainly, never "passed" (review, 22 Nov 2026) */
      h += '<p class="t-b2 pwd-state">' + (o.rsvp === 'yes' ? 'Your order was not submitted before the list went to the restaurant.' : 'The list for the restaurant has been made.') +
        ' Please write to <span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span>, they will gladly help.</p>';
    } else if (o.rsvp === 'yes') {
      var m = itemsOf(o), n = o.chosen, need = o.needed;
      /* once released, the order shown is the one the restaurant received */
      var lines = locked ? o.effective : o.items, mo = locked ? o.effectiveMoney : o;
      /* the progress, said once */
      h += '<div class="pwd-progress' + (n === need ? ' full' : '') + '" aria-live="polite"><span class="pwd-bar"><i style="width:' + Math.round(100 * n / need) + '%"></i></span>' +
        '<span>' + (conf ? 'Submitted · ' : '') + n + ' of ' + need + ' selections</span></div>';
      /* the order so far — always visible */
      h += '<div class="p-card pwd-sum"><p class="t-l1">' + (locked ? 'Your order, as passed to the restaurant' : 'Your order') + '</p>' + (lines.length ? '<ul class="pwd-lines">' + lines.map(function (x) {
        return '<li><span>' + (x.qty > 1 ? x.qty + ' × ' : '') + esc(x.name) + (x.code ? ' <em>' + esc(x.code) + '</em>' : '') + '</span><span>' + lak(x.amount) + '</span>' +
          (conf || locked ? '' : '<button type="button" class="pwd-x" data-pwd-minus="' + esc(x.id) + '" aria-label="Remove one ' + esc(x.name) + '">−</button>') + '</li>'; }).join('') + '</ul>' : '<p class="t-b2">Nothing chosen yet.</p>') +
        '<p class="pwd-money"><span>Order value</span><span>' + lak(mo.value) + '</span></p>' +
        '<p class="pwd-money"><span>Service charge 10%</span><span>' + lak(mo.service) + '</span></p>' +
        '<p class="pwd-money"><span>Hosted by <span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span></span><span>− ' + lak(mo.covered) + '</span></p>' +
        '<p class="pwd-money pwd-pay"><span>You pay</span><span>LAK 0</span></p></div>';
      if (locked) h += '<p class="t-b2 pwd-state">Your order has been passed to the restaurant.</p>';
      else if (conf) h += '<p class="t-b2 pwd-state">Your order is submitted. Thank you.</p><p><button type="button" class="p-link" data-pwd-reopen' + (st.busy ? ' disabled' : '') + '>Change my order</button></p>';
      else {
        /* 2 · the cards, by the menu's own categories */
        d.menu.forEach(function (c) {
          var pick = c.pick, have = countOf(d, m, pick), max = d.rule[pick], open = st.open[c.id] || (have < max && !Object.keys(st.open).length && pick === 'dish' && c.id === d.menu[0].id);
          h += '<details class="pwd-cat"' + (open ? ' open' : '') + ' data-pwd-cat="' + esc(c.id) + '"><summary><span>' + esc(c.title) + '</span><span class="pwd-need">' +
            (pick === 'dish' ? 'Dishes ' + countOf(d, m, 'dish') + '/' + d.rule.dish : pick === 'drink' ? 'Drink ' + countOf(d, m, 'drink') + '/1' : 'Dessert ' + countOf(d, m, 'dessert') + '/1') + '</span></summary><div class="pwd-cards">';
          c.items.forEach(function (x) {
            var q = m[x.id] || 0;
            h += '<button type="button" class="pwd-card' + (q ? ' on' : '') + '" data-pwd-item="' + esc(x.id) + '" aria-pressed="' + (q > 0) + '"' + (st.busy ? ' disabled' : '') + '>' +
              '<span class="pwd-code">' + (x.code ? esc(x.code) : esc(x.group || '')) + '</span><span class="pwd-name">' + esc(x.name) + (x.detail ? '<small>' + esc(x.detail) + '</small>' : '') + '</span>' +
              '<span class="pwd-price">' + lak(x.price) + (q ? ' · ' + (q > 1 ? q + ' chosen' : 'chosen') : '') + '</span></button>';
          });
          h += '</div></details>';
        });
        h += '<p class="pwd-pdf"><a class="p-link" href="assets/pdf/cam-on-menu.pdf" target="_blank" rel="noopener">The full menu · PDF</a></p>';
        if (o.changing) h += '<p class="t-b2 pwd-state">Until you submit again, the restaurant keeps your last submitted order.</p>';
        h += '<button type="button" class="p-act pwd-confirm" data-pwd-confirm' + (n === need && !st.busy ? '' : ' disabled') + '>' + (n === need ? 'Submit my order' : 'Choose ' + (need - n) + ' more to submit') + '</button>';
      }
    } else if (o.rsvp === 'no') {
      h += '<p class="t-b2 pwd-state">You are not joining the Pre-Wedding Dinner.' + (locked ? '' : ' You can change this here at any time.') + '</p>';
    }
    if (st.note) h += '<p class="t-b2 pwd-note" role="status">' + esc(st.note) + '</p>';
    return h + '</section>';
  }

  function wire(root) {
    var sec = root && root.querySelector('[data-pwd]'); if (!sec) return;
    sec.querySelectorAll('[data-pwd-rsvp]').forEach(function (b) { b.onclick = function () {
      var d = st.data; if (!d) return; var v = b.getAttribute('data-pwd-rsvp');
      if (d.order.rsvp === v) return;
      /* a submitted order being changed is withdrawn only on a second, deliberate tap (review, 22 Nov 2026) */
      if (v === 'no' && d.order.changing && !st.armNo) { st.armNo = true; st.note = 'Tap \u201cNot joining\u201d once more to withdraw your submitted order.'; st.focus = ['data-pwd-rsvp', 'no']; announce(); return; }
      st.focus = ['data-pwd-rsvp', v]; send({ action: 'save', rsvp: v, items: v === 'no' ? [] : toList(itemsOf(d.order)) }); }; });
    sec.querySelectorAll('[data-pwd-item]').forEach(function (b) { b.onclick = function () { st.focus = ['data-pwd-item', b.getAttribute('data-pwd-item')]; toggle(b.getAttribute('data-pwd-item'), 'plus'); }; });
    sec.querySelectorAll('[data-pwd-minus]').forEach(function (b) { b.onclick = function () { toggle(b.getAttribute('data-pwd-minus'), 'minus'); }; });
    sec.querySelectorAll('[data-pwd-cat]').forEach(function (el) { el.addEventListener('toggle', function () { st.open[el.getAttribute('data-pwd-cat')] = el.open; }); });
    var c = sec.querySelector('[data-pwd-confirm]'); if (c) c.onclick = function () { send({ action: 'confirm', rsvp: 'yes', items: toList(itemsOf(st.data.order)) }); };
    var r = sec.querySelector('[data-pwd-reopen]'); if (r) r.onclick = function () { send({ action: 'reopen' }); };
    var t = sec.querySelector('[data-pwd-retry]'); if (t) t.onclick = function () { load(true); };
    /* each tap redraws the section: the keyboard focus returns to the control that was used, once the answer is in */
    if (st.focus && !st.busy) { var f = st.focus, el = Array.prototype.filter.call(sec.querySelectorAll('[' + f[0] + ']'), function (e) { return e.getAttribute(f[0]) === f[1]; })[0]; st.focus = null; if (el && el.focus && !el.disabled) { try { el.focus({ preventScroll: true }); } catch (e) {} } }
  }

  window.SIYL_PWD = { load: load, html: html, wire: wire, data: function () { return st.data; } };
  document.addEventListener('siyl:auth', function () { st.data = null; st.inv = ''; load(true); });
})();
