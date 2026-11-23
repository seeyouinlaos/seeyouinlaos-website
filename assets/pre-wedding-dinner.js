/* ============================================================================
   THE PRE-WEDDING DINNER IN MY PROFILE (Owners, 22 Nov 2026 · HS-058) — Saturday 27 February 2027, 18:30, Cảm Ơn, Vientiane.
   The guest's own answer (joining / not joining) and, when joining, the binding menu choice: exactly two dishes, one drink and one
   dessert from the restaurant's own menu, then Submit. A submitted order is never changed silently: "Change my order" reopens it, and the
   last submitted version stays the restaurant's until a new one is submitted. ("Submitted", never "confirmed": that word is Guest
   Relations' — brief §10/§15.)
   Once the Owners have released the orders to the restaurant, the order is locked here.

   THE MENU AS A PHOTO-LED CHOICE (Owners, 23 Nov 2026 · HS-058.15): the guest recognises the dishes by the restaurant's own
   photographs — cut from the original "Menu Cam On.pdf" (provenance: docs/acceptance/pwd-menu-photos.json), one per product code where
   the menu has one, never a generated or stock picture. A product the menu does not picture keeps a text card. The menu's own
   categories are tabs (Phở · Bánh Mì · Nibbles · Drinks · Desserts); ONE order bar inside the order area says "2 Dishes · 1 Drink ·
   1 Dessert" with the progress and carries Next / Submit. Presentation only: the menu, the rule and the prices still come from the
   Worker, and every write is the one it always was.

   ONE CODE = ONE GUEST: every read and write carries the guest's own bearer; the Worker answers only that guest's order.
   NEVER THE BAG: nothing here touches siyl.bag, the trip's draft, the fingerprint, a statement or an amount the guest pays — the
   prices are the restaurant's, shown as the value the hosts cover; the guest pays LAK 0.
   The menu, the rule and the prices come from the Worker (src/pre-wedding-dinner.js) — never from this file.
   ========================================================================== */
(function () {
  'use strict';
  var API = '/api/pre-wedding-dinner';
  var st = { inv: '', data: null, loading: null, failed: false, busy: false, note: '', tab: '', focus: null, anchor: null, toTabs: false, wait: '', imgs: null };
  function auth() { try { return JSON.parse(localStorage.getItem('siyl.auth') || 'null'); } catch (e) { return null; } }
  function headers(json) { var a = auth(), h = {}; if (json) h['content-type'] = 'application/json'; if (a && a.bearer) h['x-siyl-auth'] = a.bearer; return h; }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function lak(n) { return 'LAK ' + Number(n || 0).toLocaleString('en-US'); }
  function announce() { try { document.dispatchEvent(new CustomEvent('siyl:pwd')); } catch (e) {} }
  function same(inv) { var a = auth(); return !!(a && a.invitationId === inv); }

  function load(force) {
    var a = auth(); if (!a || !a.bearer) { st.data = null; return Promise.resolve(null); }
    if (st.inv !== a.invitationId) { st.inv = a.invitationId; st.data = null; st.note = ''; st.tab = ''; st.focus = null; st.anchor = null; st.wait = ''; }
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
        st.busy = false; st.wait = ''; if (!same(inv)) return;
        if (j && j.ok) { st.data.order = j.order; st.data.locked = !!j.locked; st.note = j.note || ''; announce(); return; }
        st.note = words(j && j.reason); announce();
        if (j && (j.reason === 'STALE' || j.reason === 'LOCKED' || j.reason === 'CONFIRMED')) load(true);
      }, function () { st.busy = false; st.wait = ''; st.note = 'We could not save just now. Your choice is unchanged — please try again.'; announce(); });
  }
  function words(reason) {
    return reason === 'STALE' ? 'Your order changed on another device. Here is the latest version.'
      : reason === 'LOCKED' ? 'Your order has been passed to the restaurant. For a change, please write to Haruthai & Suthep.'
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
    var d = st.data; if (!d || d.locked || d.order.status === 'confirmed') { st.wait = ''; return; }
    var m = itemsOf(d.order), it = null, pick = '';
    d.menu.forEach(function (c) { c.items.forEach(function (x) { if (x.id === id) { it = x; pick = c.pick; } }); });
    if (!it) { st.wait = ''; return; }
    var max = d.rule[pick], have = countOf(d, m, pick);
    if (op === 'minus') { m[id] = Math.max(0, (m[id] || 0) - 1); }
    else if (have < max) { m[id] = (m[id] || 0) + 1; }
    else if (max === 1) { d.menu.forEach(function (c) { if (c.pick === pick) c.items.forEach(function (x) { delete m[x.id]; }); }); m[id] = 1; }
    else { st.wait = ''; st.note = 'You have chosen two dishes. Take one away to choose another.'; announce(); return; }
    send({ action: 'save', rsvp: 'yes', items: toList(m) });
  }

  /* ---------------------------------------------------------------------------------------------------------------------------------
     THE LOOK (HS-058.15) — what the guest SEES to recognise a dish; nothing here is a price, a code or a rule.
       photo   the photograph's file stem in assets/images/pre-wedding-dinner/menu/ (<stem>-400.webp, <stem>-800.webp)
       tall    a drink, photographed upright (4:5); every other photograph is 4:3
       shared  the menu shows ONE photograph for two codes: said on the card, never passed off as the dish's own
       about   a short line where the name alone does not explain the dish — each line's source is recorded in
               docs/acceptance/pwd-menu-photos.json (the menu's English, its Lao name, its category text) and checked by a test
     A1 keeps the catalogue's own line (the menu's English description). An id without a photo keeps a text card.
     --------------------------------------------------------------------------------------------------------------------------------- */
  /* LOOK:BEGIN */
  var LOOK = {
    "A1": { "photo": "a1" },
    "A2": { "photo": "a2", "about": "With Wagyu beef." },
    "A3": { "photo": "a3" },
    "A4": { "photo": "a4", "about": "With striped beef shank." },
    "A5": { "photo": "a5", "about": "With tender oxtail." },
    "A6": { "photo": "a6", "about": "With rare beef." },
    "A7": { "photo": "a7", "about": "With well done flank." },
    "A8": { "photo": "a8", "about": "With meatballs." },
    "A9": { "photo": "a9", "about": "In a light, clear chicken broth." },
    "A10": { "photo": "a10" },
    "B1": { "photo": "b1", "about": "With pâté — the classic." },
    "B2": { "photo": "b2", "about": "With beef." },
    "B3": { "photo": "b3", "about": "With chicken." },
    "B4": { "photo": "b4", "about": "With vegetables." },
    "B5": { "about": "The baguette on its own." },
    "C1": { "photo": "c1", "about": "Small steamed rice cakes." },
    "C2": { "photo": "c2", "about": "Clear tapioca dumplings with shrimp." },
    "C3": { "photo": "c3", "about": "Fresh rice paper rolls with shrimp." },
    "C4": { "photo": "c4", "about": "Clear tapioca dumplings." },
    "C5": { "photo": "c5", "shared": "C5 & C6", "about": "Fried spring rolls with pork." },
    "C6": { "photo": "c5", "shared": "C5 & C6", "about": "Fried spring rolls with vegetables." },
    "C7": { "photo": "c7", "shared": "C7 & C8", "about": "Fresh rice paper rolls with pork." },
    "C8": { "photo": "c7", "shared": "C7 & C8", "about": "Fresh rice paper rolls with vegetables." },
    "D1": { "photo": "d1", "tall": true, "about": "Coffee dripped slowly through the phin." },
    "D2": { "photo": "d2", "tall": true, "about": "Iced coffee with milk, Saigon style." },
    "D3": { "photo": "d3", "tall": true, "about": "Coffee crowned with egg cream." },
    "D4": { "photo": "d4", "tall": true, "about": "Matcha and milk with a shot of coffee." },
    "D5": { "photo": "d5", "tall": true, "about": "Coffee blended with coconut." },
    "E1": { "photo": "e1", "tall": true, "about": "Iced tea with peach." },
    "E2": { "photo": "e2", "tall": true, "about": "Iced chrysanthemum tea." },
    "E3": { "photo": "e3", "tall": true, "about": "Longan juice." },
    "E4": { "photo": "e4", "tall": true },
    "E5": { "photo": "e5", "tall": true, "about": "Lotus seeds and longan." },
    "E6": { "photo": "e6", "tall": true, "about": "Iced tea with lychee." },
    "E7": { "photo": "e7", "tall": true, "about": "The Vietnamese sweet soup, served in a glass." },
    "G1": { "photo": "g1" },
    "G2": { "photo": "g2" }
  };
  /* LOOK:END */
  var IMG = 'assets/images/pre-wedding-dinner/menu/';
  /* the tabs: the menu's own categories, the three drink lists under one "Drinks"; a category the menu adds later gets a tab of its own */
  var TABS = [
    { key: 'pho', label: 'Phở', cats: ['pho'], intro: 'Vietnamese rice noodle soup: fresh rice noodles in a beef broth simmered slowly from beef ribs. The chicken phở comes in a light, clear broth.' },
    { key: 'banhmi', label: 'Bánh Mì', cats: ['banhmi'], intro: 'The Vietnamese baguette, baked fresh in-house every morning: a golden, crisp crust and a soft heart.' },
    { key: 'nibbles', label: 'Nibbles', cats: ['nibbles'], intro: 'Small Vietnamese plates.' },
    { key: 'drinks', label: 'Drinks', cats: ['coffee', 'street', 'drinks'] },
    { key: 'desserts', label: 'Desserts', cats: ['desserts'] }];
  var SUB = { coffee: 'Lao beans from Paksong, dripped slowly through the Vietnamese phin.', street: 'Vietnamese iced teas, and chè — the sweet soup.', drinks: 'Not pictured on the menu.' };
  var RULE_LINE = { dish: 'Choose two dishes in all — from Phở, Bánh Mì and Nibbles. The same dish twice is fine.', drink: 'Choose one drink.', dessert: 'Choose one dessert.' };
  var SLOT = { dish: 'Dishes', drink: 'Drink', dessert: 'Dessert' };

  function look(id) { return LOOK[id] || {}; }
  function tabsOf(d) {
    var out = [];
    TABS.forEach(function (t) { var cats = d.menu.filter(function (c) { return t.cats.indexOf(c.id) >= 0; }); if (cats.length) out.push({ key: t.key, label: t.label, intro: t.intro, cats: cats, pick: cats[0].pick }); });
    d.menu.forEach(function (c) { if (!TABS.some(function (t) { return t.cats.indexOf(c.id) >= 0; })) out.push({ key: c.id, label: c.title, cats: [c], pick: c.pick }); });
    return out;
  }
  function inTab(t, m) { var n = 0; t.cats.forEach(function (c) { c.items.forEach(function (x) { n += m[x.id] || 0; }); }); return n; }
  function firstOpen(d, m, tabs) { return tabs.filter(function (t) { return countOf(d, m, t.pick) < d.rule[t.pick]; })[0] || null; }
  /* a photograph: a fixed box (no shift while it loads), lazy, two sizes */
  function img(x, kind) {
    var l = look(x.id); if (!l.photo) return '';
    var f = IMG + l.photo, thumb = kind === 'thumb';
    return '<img data-pwd-img="' + esc(x.id + ':' + kind) + '" src="' + f + '-400.webp" srcset="' + f + '-400.webp 400w, ' + f + '-800.webp 800w" sizes="' +
      (thumb ? '56px' : '(min-width: 1024px) 260px, (min-width: 768px) 30vw, (min-width: 360px) 50vw, 100vw') + '" width="400" height="' + (l.tall ? 500 : 300) + '" alt="' +
      (thumb ? '' : esc(l.shared ? 'The Cảm Ơn menu’s photograph for ' + l.shared.replace('&', 'and') : x.name + ' — photograph from the Cảm Ơn menu')) + '" loading="lazy" decoding="async">';
  }

  /* one product card: photograph (or the text panel), code · price, the original name, a short line, the action */
  function card(d, x, pick, m) {
    var q = m[x.id] || 0, l = look(x.id), max = d.rule[pick], have = countOf(d, m, pick), name = esc(x.name), id = esc(x.id), text = !l.photo && !x.code;
    var tick = q ? '<span class="pwd-tick" aria-hidden="true">' + (q > 1 ? q + '×' : '✓') + '</span>' : '';
    var h = '<div class="pwd-card' + (q ? ' on' : '') + (text ? ' text' : '') + (st.wait === x.id ? ' wait' : '') + '" data-pwd-card="' + id + '">';
    if (l.photo) h += '<div class="pwd-ph' + (l.tall ? ' tall' : '') + '">' + img(x, 'card') + tick + '</div>';
    else if (!text) h += '<div class="pwd-ph none"><span class="pwd-big" aria-hidden="true">' + esc(x.code) + '</span><small>Not pictured on the menu</small>' + tick + '</div>';
    var about = x.detail || l.about || '';
    h += '<div class="pwd-body"><p class="pwd-meta"><span class="pwd-code">' + esc(x.code || x.group || '') + '</span><span class="pwd-price">' + lak(x.price) + '</span></p>' +
      '<p class="pwd-name">' + name + '</p>' + (about ? '<p class="pwd-about">' + esc(about) + '</p>' : '') +
      (l.shared ? '<p class="pwd-shared">Menu photo for ' + esc(l.shared) + '</p>' : '') + (text && q ? '<p class="pwd-shared">✓ Chosen</p>' : '') + '</div><div class="pwd-do">';
    if (max > 1) {
      h += q ? '<div class="pwd-step"><button type="button" data-pwd-minus="' + id + '" aria-label="Remove one ' + name + '">−</button><span>' + q + '</span>' +
        '<button type="button"' + (have >= max ? ' class="off"' : '') + ' data-pwd-item="' + id + '" aria-label="Add another ' + name + '">+</button></div>'
        : '<button type="button" class="pwd-add' + (have >= max ? ' off' : '') + '" data-pwd-item="' + id + '" data-pwd-pick aria-label="Add ' + name + '">Add</button>';
    } else {
      h += q ? '<button type="button" class="pwd-add on" data-pwd-minus="' + id + '" aria-pressed="true" aria-label="' + name + ', chosen. Remove">✓ Chosen</button>'
        : '<button type="button" class="pwd-add" data-pwd-item="' + id + '" data-pwd-pick aria-label="Choose ' + name + '">' + (have ? 'Choose instead' : 'Choose') + '</button>';
    }
    return h + '</div></div>';
  }

  /* the order lines, with the dish's photograph — the guest sees what they chose */
  function lineList(lines, edit) {
    return '<ul class="pwd-lines">' + lines.map(function (x) {
      var p = img(x, 'thumb');
      return '<li><span class="pwd-th">' + (p || '<i aria-hidden="true">' + esc(x.code || '·') + '</i>') + '</span><span class="pwd-ln">' + (x.qty > 1 ? x.qty + ' × ' : '') + esc(x.name) + (x.code ? ' <em>' + esc(x.code) + '</em>' : '') + '</span>' +
        '<span class="pwd-amt">' + lak(x.amount) + '</span>' + (edit ? '<button type="button" class="pwd-x" data-pwd-minus="' + esc(x.id) + '" data-pwd-line="' + esc(x.id) + '" aria-label="Remove one ' + esc(x.name) + '">−</button>' : '') + '</li>'; }).join('') + '</ul>';
  }
  function money(mo) {
    return '<p class="pwd-money"><span>Order value</span><span>' + lak(mo.value) + '</span></p>' +
      '<p class="pwd-money"><span>Service charge 10%</span><span>' + lak(mo.service) + '</span></p>' +
      '<p class="pwd-money"><span>Hosted by <span style="white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep</span></span><span>− ' + lak(mo.covered) + '</span></p>' +
      '<p class="pwd-money pwd-pay"><span>You pay</span><span>LAK 0</span></p>';
  }

  /* the order bar: "2 Dishes · 1 Drink · 1 Dessert" with the progress — each part opens its tab — and the next step */
  function dockOf(d, m, tabs, cur) {
    var h = '<div class="pwd-dock" data-pwd-dock><div class="pwd-slots">', n = 0, need = 0;
    Object.keys(d.rule).forEach(function (k) {
      var max = d.rule[k] || 0, have = Math.min(countOf(d, m, k), max), full = have === max;
      var t = cur.pick === k ? cur : tabs.filter(function (x) { return x.pick === k; })[0];
      n += have; need += max; if (!t || !max) return;
      var marks = ''; for (var i = 0; i < max; i++) marks += '<u' + (i < have ? ' class="on"' : '') + '></u>';
      h += '<button type="button" class="pwd-slot' + (full ? ' full' : '') + '" data-pwd-tab="' + esc(t.key) + '" aria-label="' + (SLOT[k] || k) + ': ' + have + ' of ' + max + ' chosen. Show ' + esc(t.label) + '">' +
        '<b>' + max + ' ' + esc(SLOT[k] || k) + (full ? ' ✓' : '') + '</b><i aria-hidden="true">' + marks + '</i></button>';
    });
    h += '</div>';
    var open = firstOpen(d, m, tabs);
    if (n >= need) h += '<button type="button" class="p-act pwd-confirm" data-pwd-confirm' + (st.busy ? ' disabled' : '') + '>Submit my order</button>';
    else if (open && countOf(d, m, cur.pick) >= d.rule[cur.pick]) h += '<button type="button" class="p-act quiet pwd-go" data-pwd-tab="' + esc(open.key) + '">Next: ' + esc(open.label) + ' →</button>';
    else h += '<button type="button" class="p-act pwd-confirm" data-pwd-confirm disabled>Choose ' + (need - n) + ' more to submit</button>';
    if (st.note) h += '<p class="t-b2 pwd-note" role="status">' + esc(st.note) + '</p>';
    return h + '</div>';
  }

  function html() {
    var a = auth(); if (!a || !a.bearer) return '';
    /* the tapped card's place is measured anew before EVERY redraw: each redraw makes up only for its own shift, never for the
       guest's own scrolling in between (review, 23 Nov 2026) */
    var old = document.querySelector('[data-pwd]');
    if (st.anchor && old) { var oa = find(old, st.anchor.attr, st.anchor.val); if (oa) st.anchor.top = oa.getBoundingClientRect().top; else st.anchor = null; }
    /* the photographs already on screen are kept for the redraw (wire() puts them back): no blank frame on a tap */
    st.imgs = {}; Array.prototype.forEach.call(document.querySelectorAll('[data-pwd] img[data-pwd-img]'), function (n) { if (n.complete && n.naturalWidth) st.imgs[n.getAttribute('data-pwd-img')] = n; });
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
    } else if (o.rsvp === 'yes' && (conf || locked)) {
      /* submitted (or passed to the restaurant): the order with its photographs; once released, the version the restaurant received */
      var lines = locked ? o.effective : o.items, mo = locked ? o.effectiveMoney : o;
      h += '<div class="p-card pwd-sum" data-pwd-sum tabindex="-1"><p class="t-l1">' + (locked ? 'Your order, as passed to the restaurant' : 'Your order · submitted') + '</p>' + lineList(lines, false) + money(mo) + '</div>';
      if (locked) h += '<p class="t-b2 pwd-state">Your order has been passed to the restaurant.</p>';
      else h += '<p class="t-b2 pwd-state">Your order is submitted. Thank you.</p><p><button type="button" class="p-link" data-pwd-reopen' + (st.busy ? ' disabled' : '') + '>Change my order</button></p>';
      if (st.note) h += '<p class="t-b2 pwd-note" role="status">' + esc(st.note) + '</p>';
    } else if (o.rsvp === 'yes') {
      /* 2 · the menu: tabs, the photographs, the order so far, the bar */
      var m = itemsOf(o), tabs = tabsOf(d);
      if (!st.tab || !tabs.some(function (t) { return t.key === st.tab; })) st.tab = (firstOpen(d, m, tabs) || tabs[0]).key;
      var cur = tabs.filter(function (t) { return t.key === st.tab; })[0];
      h += '<div class="pwd-shop" data-pwd-shop><div class="pwd-tabs" role="group" aria-label="The menu’s categories">' + tabs.map(function (t) {
        var c = inTab(t, m);
        return '<button type="button" class="pwd-tab' + (t === cur ? ' on' : '') + '" data-pwd-tab="' + esc(t.key) + '" aria-pressed="' + (t === cur) + '"' + (c ? ' aria-label="' + esc(t.label) + ', ' + c + ' chosen"' : '') + '>' + esc(t.label) + (c ? '<b aria-hidden="true"></b>' : '') + '</button>'; }).join('') + '</div>';
      h += '<p class="t-b2 pwd-rule">' + RULE_LINE[cur.pick] + '</p>' + (cur.intro ? '<p class="t-b2 measure pwd-intro">' + cur.intro + '</p>' : '');
      cur.cats.forEach(function (c) {
        if (cur.cats.length > 1) h += '<p class="t-l1 pwd-sub">' + esc(c.title) + '</p>' + (SUB[c.id] ? '<p class="t-b2 pwd-subline">' + SUB[c.id] + '</p>' : '');
        h += '<div class="pwd-grid">' + c.items.map(function (x) { return card(d, x, c.pick, m); }).join('') + '</div>';
      });
      h += '<p class="pwd-pdf"><a class="p-link" href="assets/pdf/cam-on-menu.pdf" target="_blank" rel="noopener">The full menu · PDF</a></p>';
      h += '<div class="p-card pwd-sum" data-pwd-sum tabindex="-1"><p class="t-l1">Your order</p>' + (o.items.length ? lineList(o.items, true) : '<p class="t-b2">Nothing chosen yet.</p>') + money(o) + '</div>';
      if (o.changing) h += '<p class="t-b2 pwd-state">Until you submit again, the restaurant keeps your last submitted order.</p>';
      h += dockOf(d, m, tabs, cur) + '</div>';
    } else {
      if (o.rsvp === 'no') h += '<p class="t-b2 pwd-state">You are not joining the Pre-Wedding Dinner.' + (locked ? '' : ' You can change this here at any time.') + '</p>';
      if (st.note) h += '<p class="t-b2 pwd-note" role="status">' + esc(st.note) + '</p>';
    }
    return h + '</section>';
  }

  /* ONE live region for the whole page, kept across redraws (a region drawn anew is never read out) */
  var live = null;
  function say(t) {
    if (!live) { live = document.createElement('p'); live.setAttribute('role', 'status'); live.setAttribute('aria-live', 'polite');
      live.style.cssText = 'position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0'; document.body.appendChild(live); }
    if (live.textContent !== t) live.textContent = t;
  }
  /* the order bar rides above My Bag's bar (assets/bag.js) — one bottom layer, never two on top of each other; kept current on resize */
  function below() { var sec = document.querySelector('[data-pwd]'), jb = document.querySelector('.jbar.on'); if (sec) sec.style.setProperty('--pwd-below', (jb ? jb.offsetHeight : 0) + 'px'); }
  window.addEventListener('resize', below, { passive: true });
  function anchorOf(el) { var c = el.closest('[data-pwd-card]'); return c ? { attr: 'data-pwd-card', val: c.getAttribute('data-pwd-card'), top: c.getBoundingClientRect().top } : null; }
  function find(sec, attr, val) { return Array.prototype.filter.call(sec.querySelectorAll('[' + attr + ']'), function (e) { return e.getAttribute(attr) === val; })[0] || null; }

  function wire(root) {
    var sec = root && root.querySelector('[data-pwd]'); if (!sec) return;
    /* the photographs that were already showing take their place again (decoded, no blank frame) */
    if (st.imgs) { Array.prototype.forEach.call(sec.querySelectorAll('img[data-pwd-img]'), function (n) { var o = st.imgs[n.getAttribute('data-pwd-img')]; if (o && o !== n && !document.body.contains(o)) n.replaceWith(o); }); st.imgs = null; }
    sec.querySelectorAll('[data-pwd-rsvp]').forEach(function (b) { b.onclick = function () {
      var d = st.data; if (!d) return; var v = b.getAttribute('data-pwd-rsvp');
      if (d.order.rsvp === v) return;
      /* a submitted order being changed is withdrawn only on a second, deliberate tap (review, 22 Nov 2026) */
      if (v === 'no' && d.order.changing && !st.armNo) { st.armNo = true; st.note = 'Tap “Not joining” once more to withdraw your submitted order.'; st.focus = [['data-pwd-rsvp', 'no']]; announce(); return; }
      st.focus = [['data-pwd-rsvp', v]]; st.acted = true; send({ action: 'save', rsvp: v, items: v === 'no' ? [] : toList(itemsOf(d.order)) }); }; });
    sec.querySelectorAll('[data-pwd-item]').forEach(function (b) { b.onclick = function () {
      var id = b.getAttribute('data-pwd-item'); if (st.busy) return;
      st.anchor = anchorOf(b); st.wait = id; st.acted = true; st.focus = [['data-pwd-item', id], ['data-pwd-minus', id]]; toggle(id, 'plus'); }; });
    sec.querySelectorAll('[data-pwd-minus]').forEach(function (b) { b.onclick = function () {
      var id = b.getAttribute('data-pwd-minus'); if (st.busy) return;
      /* from the order list, the focus stays in the order list (the next line's −, else the list itself) */
      var line = !!b.closest('.pwd-lines'), next = line && b.closest('li').nextElementSibling, nid = next && next.querySelector('[data-pwd-line]');
      st.anchor = anchorOf(b); st.wait = id; st.acted = true;
      st.focus = line ? [['data-pwd-line', id], ['data-pwd-line', nid ? nid.getAttribute('data-pwd-line') : ''], ['data-pwd-sum', '']] : [['data-pwd-minus', id], ['data-pwd-item', id]]; toggle(id, 'minus'); }; });
    /* the whole card is the obvious target: a tap on its photograph or words does what its button does (the button stays the
       one control for the keyboard and the screen reader) */
    sec.querySelectorAll('[data-pwd-card]').forEach(function (c) { c.onclick = function (e) { if (e.target.closest('button, a')) return; var b = c.querySelector('[data-pwd-pick]'); if (b) b.click(); }; });
    sec.querySelectorAll('[data-pwd-tab]').forEach(function (b) { b.onclick = function () {
      var k = b.getAttribute('data-pwd-tab'); st.toTabs = !!b.closest('[data-pwd-dock]'); st.note = '';
      if (st.tab === k && !st.toTabs) return;
      st.tab = k; st.anchor = null; st.focus = [['data-pwd-tab', k]]; announce(); }; });
    var c = sec.querySelector('[data-pwd-confirm]'); if (c) c.onclick = function () { st.acted = true; st.anchor = null; st.focus = [['data-pwd-reopen', ''], ['data-pwd-sum', '']]; send({ action: 'confirm', rsvp: 'yes', items: toList(itemsOf(st.data.order)) }); };
    var r = sec.querySelector('[data-pwd-reopen]'); if (r) r.onclick = function () { st.tab = ''; st.acted = true; st.focus = [['data-pwd-sum', '']]; send({ action: 'reopen' }); };
    var t = sec.querySelector('[data-pwd-retry]'); if (t) t.onclick = function () { load(true); };
    below();
    /* the tapped card keeps its place on the screen through the redraw */
    if (st.anchor) { var an = find(sec, st.anchor.attr, st.anchor.val); if (an) { var dy = an.getBoundingClientRect().top - st.anchor.top; if (Math.abs(dy) > 1) window.scrollBy(0, dy); } if (!st.busy) st.anchor = null; }
    /* a part of the bar opens its tab: the tabs come into view below the header */
    if (st.toTabs) { st.toTabs = false; var tb = sec.querySelector('.pwd-tabs'); if (tb) { var hd = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hd-h')) || 64;
      if (tb.getBoundingClientRect().top < hd || tb.getBoundingClientRect().top > innerHeight * 0.6) { try { tb.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); } catch (e) { tb.scrollIntoView(); } } } }
    /* each tap redraws the section: the keyboard focus returns to the control that was used (or its successor), once the answer is in */
    if (st.focus && !st.busy) { var f = st.focus, el = null; st.focus = null; for (var i = 0; i < f.length && !el; i++) { el = find(sec, f[i][0], f[i][1]); if (el && el.disabled) el = null; } if (el && el.focus) { try { el.focus({ preventScroll: true }); } catch (e) {} } }
    var d = st.data, o = d && d.order, conf = !!o && o.status === 'confirmed';
    if (st.acted && !st.busy && o) { st.acted = false;
      if (d.locked) say('Your order has been passed to the restaurant.');
      else if (o.rsvp === 'no') say('You are not joining the Pre-Wedding Dinner.');
      else if (conf) say('Your order is submitted. Thank you.');
      else if (o.rsvp === 'yes') { var m = itemsOf(o);
        say(Object.keys(d.rule).map(function (k) { return (SLOT[k] || k) + ' ' + Math.min(countOf(d, m, k), d.rule[k]) + ' of ' + d.rule[k]; }).join(', ') + '.' + (st.note ? ' ' + st.note : '')); } }
  }

  window.SIYL_PWD = { load: load, html: html, wire: wire, data: function () { return st.data; } };
  document.addEventListener('siyl:auth', function () { st.data = null; st.inv = ''; load(true); });
})();
