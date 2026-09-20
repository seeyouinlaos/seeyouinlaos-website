/* ============================================================================
   THE HIGHLIGHTS — one booking grammar for the premium tables (Owner, 20 Sep 2026).
   The Aman Afternoon Tea's pattern, made shared: OPEN → SELECT (the menu, where a
   house has more than one) → PREVIEW (a sheet that says exactly what will be added,
   nothing held yet) → CONFIRM (one Bag line per house, the chosen menu's own price)
   → the confirmed state (change · remove) → My Trip / My Bag / Review & Send.
   No reservation on preview, never two lines for one house, the Bag is the one
   truth (assets/bag.js), the invitation gate decides who may add. Presentation
   and the Bag line only — no store of its own.
   ========================================================================== */
(function () {
  'use strict';
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function money(n) { return 'USD ' + Number(n).toLocaleString('en-US'); }
  function signedIn() { return document.documentElement.getAttribute('data-session') === 'in'; }
  function gated(fn) {
    if (window.SIYL_INVITE) { window.SIYL_INVITE.require(fn); }
    else document.addEventListener('siyl:invite-ready', function () { window.SIYL_INVITE.require(fn); }, { once: true });
  }
  var CSS = '.hl-menus{display:grid;gap:10px;margin-top:20px}' +
    '.hl-menu{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 16px;width:100%;text-align:left;background:#fff;border:1px solid var(--a-line,#DAD9D7);padding:16px 18px;font:inherit;cursor:pointer;min-height:56px;color:var(--a-ink,#313131);box-sizing:border-box}.hl-menu>span:first-child{flex:1 1 160px;min-width:0}' +
    '.hl-menu[aria-checked="true"]{border-color:var(--a-ink,#313131);box-shadow:inset 0 0 0 1px var(--a-ink,#313131)}' +
    '.hl-menu .n{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:17px;line-height:1.3}' +
    '.hl-menu .t{display:block;font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--a-mute,#6B6964);margin-top:4px}' +
    '.hl-menu .p{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:19px;white-space:nowrap}' +
    '.hl-cur{margin-top:24px;padding-top:16px;border-top:1px solid var(--a-line,#DAD9D7)}' +
    '.hl-cur .on{font-family:"Hanken Grotesk",Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:2.2px;text-transform:uppercase;color:var(--a-ink,#313131);display:inline-flex;align-items:center;gap:10px;min-height:44px}' +
    '.hl-cur .on::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--a-ink,#313131)}' +
    '.hl-acts{display:flex;flex-wrap:wrap;gap:8px 26px;align-items:center;margin-top:8px}' +
    '.hl-acts button{background:none;border:0;padding:10px 0;font:inherit;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:var(--a-ink,#313131);cursor:pointer;border-bottom:1px solid var(--a-ink,#313131);min-height:44px}' +
    '.hl-acts button.mute,.hl-acts a.mute{color:var(--a-mute,#6B6964);border-bottom-color:#C9C4BA}' +
    '.hl-scrim{position:fixed;inset:0;background:rgba(30,30,30,.45);display:none;z-index:8}' +
    '.hl-ov{position:fixed;left:0;right:0;bottom:0;background:#FCFAF6;padding:30px 24px calc(34px + env(safe-area-inset-bottom));display:none;z-index:9;max-height:88vh;overflow:auto}' +
    '.hl-show .hl-scrim,.hl-show .hl-ov{display:block}' +
    '.hl-ov h2{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:23px;line-height:1.25;margin:8px 0 14px}' +
    '.hl-row{display:flex;gap:16px;align-items:center;margin:14px 0 18px}.hl-th{width:74px;height:92px;background:#E7E3DB center/cover no-repeat;flex:0 0 auto}' +
    '.hl-n{font-family:"PP Editorial Old",Georgia,serif;font-weight:200;font-size:17px;line-height:1.3}.hl-m{font-size:11px;color:var(--a-mute,#6B6964);margin-top:5px;line-height:1.6}' +
    '.hl-ov p.note{font-size:12.5px;line-height:1.75;color:#4A4A4A;margin:0 0 8px}' +
    '.hl-ov .x-cta{margin-top:18px}.hl-ov .cancel{display:block;text-align:center;margin-top:14px;background:none;border:0;font:inherit;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:var(--a-mute,#6B6964);cursor:pointer;min-height:44px;width:100%}' +
    '@media(min-width:900px){.hl-ov{left:50%;right:auto;bottom:auto;top:50%;transform:translate(-50%,-50%);width:520px;max-height:80vh;padding:40px 44px 44px}}';
  function ensureCss() { if (document.getElementById('hl-css')) return; var st = document.createElement('style'); st.id = 'hl-css'; st.textContent = CSS; document.head.appendChild(st); }
  function ensureSheet() {
    if (document.getElementById('hl-ov')) return;
    var sc = document.createElement('div'); sc.className = 'hl-scrim'; sc.id = 'hl-scrim';
    var ov = document.createElement('div'); ov.className = 'hl-ov'; ov.id = 'hl-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Before it is added');
    document.body.appendChild(sc); document.body.appendChild(ov);
    sc.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function close() { document.body.classList.remove('hl-show'); }
  function open(html) { ensureSheet(); var ov = document.getElementById('hl-ov'); ov.innerHTML = html; document.body.classList.add('hl-show'); var f = ov.querySelector('button, a'); if (f) try { f.focus(); } catch (e) {} }

  var H = window.SIYL_HIGHLIGHT = {
    /* the line as it will be added: the house's product from the one pricing source, the chosen menu's price; a request */
    line: function (x, menu) {
      var P = window.SIYL_PRICE, s = x.select;
      var it = (P ? P.items(s.id, menu)[0] : null) || { id: s.id, name: x.name, price: 0, img: x.img };
      it.qty = 1; it.request = true; it.exp = x.id;
      return it;
    },
    current: function (x) { return window.SIYL_BAG ? window.SIYL_BAG.get().filter(function (l) { return l.id === x.select.id; })[0] || null : null; },
    /* the booking section of a Highlight (inside the page's .x-sel) */
    html: function (x) {
      var P = window.SIYL_PRICE, s = x.select, menus = P && P.menusOf ? P.menusOf(s.id) : [];
      var meal = (x.roles || []).indexOf('dinner') >= 0 ? 'Dinner' : (x.roles || []).indexOf('breakfast') >= 0 ? 'Breakfast' : 'Lunch';
      var from = menus.length ? Math.min.apply(null, menus.map(function (m) { return m.price; })) : (P && P.FLAT[s.id] ? P.FLAT[s.id].price : 0);
      return '<section class="x-sel hl" id="sel" data-highlight="' + esc(x.id) + '"><p class="a-eyebrow">Your table · My Bag</p>' +
        '<h2>' + meal + ' at ' + esc(x.name) + (x.practical && x.practical.when ? ' <span class="a-eyebrow" style="display:block;margin-top:6px">' + esc(x.practical.when) + '</span>' : '') + '</h2>' +
        '<p class="price" data-private>' + (menus.length > 1 ? 'From ' : '') + money(from) + ' <span class="a-eyebrow" style="display:inline">' + esc(s.unit || 'per person') + '</span></p>' +
        '<p>Optional. ' + (menus.length > 1 ? 'Choose the menu, look at what will be added, then confirm. ' : 'Look at what will be added, then confirm. ') + 'Adding ' + esc(x.name) + ' places a restaurant request in your bag for you; Guest Relations arrange the table. It is a request, not a reservation — nothing is held until you confirm, and availability is not guaranteed by this page.</p>' +
        '<div id="selbox" data-private></div>' +
        '<p class="x-way" data-private-cta><a class="a-link" data-private-cta href="invitation.html?open=1">Open your invitation</a></p></section>';
    },
    /* the state inside #selbox: the menu choice and the preview, or the confirmed line with change · remove */
    paint: function (x) {
      ensureCss();
      var box = document.getElementById('selbox'); if (!box || !window.SIYL_BAG) return;
      if (!signedIn()) { box.innerHTML = ''; return; }
      var P = window.SIYL_PRICE, s = x.select, menus = P && P.menusOf ? P.menusOf(s.id) : [], cur = H.current(x);
      var chosen = box.getAttribute('data-menu') || (cur && cur.menu) || (menus.length ? (menus.filter(function (m) { return m.preferred; })[0] || menus[0]).slug : '');
      var line = H.line(x, chosen);
      var h = '';
      if (cur) {
        var curMenu = cur.menu && P && P.menuOf ? P.menuOf(s.id, cur.menu) : null;
        h += '<div class="hl-cur"><span class="on" data-sel-state="current" aria-current="true">Current selection · ' + money(cur.price) + (curMenu ? ' · ' + esc(curMenu.name) : '') + '</span>' +
          '<div class="hl-acts">' + (menus.length > 1 ? '<button type="button" id="hl-change">Change the menu</button>' : '') + '<a class="a-link" href="cart.html" style="margin:0">Open My Bag</a><button type="button" class="mute" id="hl-remove">Remove from My Bag</button></div></div>';
        if (box.getAttribute('data-changing') === '1' && menus.length > 1) h += H.menuHtml(menus, chosen) + '<button type="button" class="x-cta" id="hl-preview" data-sel-state="open">Preview the change · ' + money(line.price) + '</button>';
      } else {
        if (menus.length > 1) h += H.menuHtml(menus, chosen);
        h += '<p class="x-amt" id="selamt">' + money(line.price) + ' <span class="a-eyebrow">per person · your cost</span></p>' +
          '<button type="button" class="x-cta" id="hl-preview" data-sel-state="open">Preview · then add to My Bag</button>';
      }
      box.innerHTML = h;
      box.querySelectorAll('[data-menu-pick]').forEach(function (b) { b.addEventListener('click', function () { box.setAttribute('data-menu', b.getAttribute('data-menu-pick')); H.paint(x); }); });
      var pv = document.getElementById('hl-preview'); if (pv) pv.addEventListener('click', function () { gated(function () { H.preview(x, box.getAttribute('data-menu') || chosen); }); });
      var ch = document.getElementById('hl-change'); if (ch) ch.addEventListener('click', function () { box.setAttribute('data-changing', '1'); H.paint(x); var m = box.querySelector('[data-menu-pick]'); if (m) m.focus(); });
      var rm = document.getElementById('hl-remove'); if (rm) rm.addEventListener('click', function () { window.SIYL_BAG.remove(s.id); box.removeAttribute('data-changing'); box.removeAttribute('data-menu'); H.paint(x); var a = document.getElementById('hl-preview'); if (a) a.focus(); });
    },
    menuHtml: function (menus, chosen) {
      return '<div class="hl-menus" role="radiogroup" aria-label="The menu">' + menus.map(function (m) {
        return '<button type="button" class="hl-menu" role="radio" aria-checked="' + (m.slug === chosen ? 'true' : 'false') + '" data-menu-pick="' + esc(m.slug) + '"><span><span class="n">' + esc(m.name) + '</span><span class="t">' + esc(m.thb || '') + '</span></span><span class="p">' + money(m.price) + '</span></button>';
      }).join('') + '</div>';
    },
    /* PREVIEW: what will be added, in words — nothing is in the Bag yet */
    preview: function (x, menu) {
      var s = x.select, line = H.line(x, menu), cur = H.current(x), P = window.SIYL_PRICE;
      var m = P && P.menuOf ? P.menuOf(s.id, menu) : null;
      var basis = (m && m.basis) || (P && P.FLAT[s.id] && P.FLAT[s.id].basis) || '';
      open('<p class="a-eyebrow">Before it is added</p><h2>' + (cur ? 'Change your table at ' : 'Your table at ') + esc(x.name) + '</h2>' +
        '<div class="hl-row"><div class="hl-th" style="background-image:url(' + esc(line.img || x.img || '') + ')"></div><div><p class="hl-n">' + esc(line.name) + '</p><p class="hl-m">' + esc(line.meta || '') + '</p></div></div>' +
        '<p class="note"><b>' + money(line.price) + ' per person · your cost.</b> ' + esc(basis) + '</p>' +
        (cur ? '<p class="note">This replaces your current selection (' + money(cur.price) + ') — one line for ' + esc(x.name) + ', never two.</p>' : '') +
        '<p class="note">A request, not a reservation: Guest Relations arrange the table and confirm it with you. Nothing is held until you confirm here, and you can remove it from My Bag at any time.</p>' +
        '<button type="button" class="x-cta" id="hl-confirm" data-sel-state="confirm">' + (cur ? 'Confirm the change' : 'Confirm · add to My Bag') + '</button>' +
        '<button type="button" class="cancel" id="hl-cancel">Cancel — nothing added</button>');
      document.getElementById('hl-cancel').addEventListener('click', close);
      document.getElementById('hl-confirm').addEventListener('click', function () { H.confirm(x, menu); });
    },
    /* CONFIRM: one Bag line per house — put replaces the line with the same id (a menu change), never duplicates */
    confirm: function (x, menu) {
      var s = x.select, line = H.line(x, menu);
      if (!window.SIYL_BAG) return;
      window.SIYL_BAG.put(line);
      var box = document.getElementById('selbox'); if (box) { box.removeAttribute('data-changing'); box.removeAttribute('data-menu'); }
      H.paint(x);
      open('<p class="a-eyebrow">Added to My Bag</p><div class="hl-row"><div class="hl-th" style="background-image:url(' + esc(line.img || x.img || '') + ')"></div><div><p class="hl-n">' + esc(line.name) + '</p><p class="hl-m">' + money(line.price) + ' per person · ' + esc(line.meta || '') + '</p></div></div>' +
        '<p class="note">It is in your bag as a request for Guest Relations; it travels with your trip to Review &amp; Send.</p>' +
        '<a class="x-cta" href="cart.html" data-sel-state="added">Open My Bag</a><button type="button" class="cancel" id="hl-cancel">Continue reading</button>');
      document.getElementById('hl-cancel').addEventListener('click', close);
      var cur = document.querySelector('[data-sel-state="current"]'); if (cur) try { cur.focus({ preventScroll: true }); } catch (e) {}
    },
    close: close
  };
})();
