/* ============================================================================
   THE HIGHLIGHTS — one booking grammar for the premium tables (Owner, 20 Sep 2026).
   The Aman Afternoon Tea's pattern, made shared: OPEN → SELECT (the menu, where a
   house has more than one — none preselected) → PREVIEW (a sheet that says exactly
   what will go into My Bag, nothing held) → ADD (one Bag line per house, the chosen
   menu's own price) → the status (change · remove) → My Trip / My Bag / Review & Send.
   No reservation on preview, never two lines for one house, the Bag is the one
   truth (assets/bag.js), the invitation gate decides who may add. Presentation
   and the Bag line only — no store of its own.
   THE STATUS FOLLOWS THE TRIP (Window 007, PRQ-07a-01): “In My Bag” before the trip
   is sent · “Sent to us” once the line is in the sent trip, unchanged · “Confirmed by
   Guest Relations” only while their confirmation stands (it lapses after a change,
   OQ-27) — read from the one trip state (SIYL_DRAFT.lineState, SIYL_CONFIRM).
   A record's `select` may carry: `unit` ('table' → “USD 180 for the table”), `legacy`
   (older stored ids of the same product, read as the same line — never rewritten),
   `product` (the line's name/meta/img when the catalogue has none), `previewNote`,
   `addedMeta`, `addedNote`, `cancelWords`, `noAmount`, `noExp` (the 1872 tea page).
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
  /* the amount with its basis: “USD 294 per person” · the tea “USD 180 for the table” (TO-01830) */
  function priceWords(x, n) { return money(n) + (x.select && x.select.unit === 'table' ? ' for the table' : ' per person'); }
  var CSS = '.hl-menus-l{margin:22px 0 0}.hl-menus{display:grid;gap:10px;margin-top:12px}' +
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
    var ov = document.createElement('div'); ov.className = 'hl-ov'; ov.id = 'hl-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Before it goes into My Bag');
    document.body.appendChild(sc); document.body.appendChild(ov);
    sc.addEventListener('click', close);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }
  function close() { document.body.classList.remove('hl-show'); }
  function open(html, label) { ensureCss(); ensureSheet(); var ov = document.getElementById('hl-ov'); ov.setAttribute('aria-label', label || 'Before it goes into My Bag'); ov.innerHTML = html; document.body.classList.add('hl-show'); var f = ov.querySelector('button, a'); if (f) try { f.focus(); } catch (e) {} }

  /* the house's terms after the amount (PRQ-07a-05: the amount is printed once) — the basis without its leading amount and
     without the words the sheet already says (the house's charges, the request): “Erlebnis, the complete menu (THB 9,800);
     beverages are not included.” */
  function terms(basis) {
    var P = window.SIYL_PRICE, t = P && P.terms ? P.terms(basis || '') : String(basis || '').replace(/^USD [\d,]+ (?:per person|for the table|per experience)\s*·\s*/, '');
    var segs = String(t || '').split(' · ').map(function (s) { return s.replace(/;\s*the house adds[^)]*\)/, ')').trim(); })
      .filter(function (s) { return s && !/request|reservation|Guest Relations|service charge|government tax|\bVAT\b/i.test(s); })
      .map(function (s) { return s === 'beverages not included' ? 'beverages are not included' : s; });
    if (!segs.length) return '';
    var out = segs.join('; ');
    return out.charAt(0).toUpperCase() + out.slice(1) + '.';
  }

  /* the status of a line in words, from the one trip state: A1's per-line state where it is on the page, else the sent
     snapshot and the confirmation — never stronger than what the product knows */
  function lineKey(line) {
    var D = window.SIYL_DRAFT, C = window.SIYL_CONFIRM;
    if (D && typeof D.lineState === 'function') { var st = D.lineState(line) || {}; return st.key || 'selected'; }
    var sent = null; try { sent = JSON.parse(localStorage.getItem('siyl.sent') || 'null'); } catch (e) {}
    var inSent = !!(sent && Array.isArray(sent.shared) && sent.shared.some(function (y) { return y && y.id === line.id && y.price === line.price && (y.meta || '') === (line.meta || ''); }));
    if (!inSent) return 'selected';
    var sub = D && D.submission ? D.submission() : null, changed = !!(sub && sub.hasUnsentChanges);
    return C && C.state && C.state() === 'confirmed' && !changed ? 'confirmed' : 'sent';
  }
  var WORDS = { sent: 'Sent to us', confirmed: 'Confirmed by Guest Relations' };
  var confirmAsked = false;

  var H = window.SIYL_HIGHLIGHT = {
    /* the line as it will be added: the house's product from the one pricing source, the chosen menu's price; a request */
    line: function (x, menu) {
      var P = window.SIYL_PRICE, s = x.select, f = P && P.FLAT ? P.FLAT[s.id] : null, pr = s.product || {};
      var it = (P ? P.items(s.id, menu)[0] : null) || { id: s.id, name: pr.name || x.name, meta: pr.meta || '', price: f ? f.price : 0, img: pr.img || x.img };
      it.qty = 1; it.request = true; it.exp = x.id;
      if (s.noExp) delete it.exp;
      return it;
    },
    /* the guest's line of this house — its own id, or an older stored id of the same product (read, never rewritten) */
    current: function (x) {
      if (!window.SIYL_BAG) return null;
      var ids = [x.select.id].concat(x.select.legacy || []);
      return window.SIYL_BAG.get().filter(function (l) { return ids.indexOf(l.id) >= 0; })[0] || null;
    },
    /* 'selected' | 'unsent' | 'sent' | 'confirmed' → the words of the Highlight status */
    stateKey: function (x) { var cur = H.current(x); return cur ? lineKey(cur) : null; },
    stateWords: function (x) { var k = H.stateKey(x); return k ? (WORDS[k] || 'In My Bag') : ''; },
    /* the booking section of a Highlight (inside the page's .x-sel) */
    html: function (x) {
      var P = window.SIYL_PRICE, s = x.select, menus = P && P.menusOf ? P.menusOf(s.id) : [];
      var meal = (x.roles || []).indexOf('dinner') >= 0 ? 'Dinner' : (x.roles || []).indexOf('breakfast') >= 0 ? 'Breakfast' : 'Lunch';
      var from = menus.length ? Math.min.apply(null, menus.map(function (m) { return m.price; })) : (P && P.FLAT[s.id] ? P.FLAT[s.id].price : 0);
      return '<section class="x-sel hl" id="sel" data-highlight="' + esc(x.id) + '"><p class="a-eyebrow">Your table</p>' +
        '<h2>' + meal + ' at ' + esc(x.name) + (x.practical && x.practical.when ? ' <span class="a-eyebrow" style="display:block;margin-top:6px">' + esc(x.practical.when) + '</span>' : '') + '</h2>' +
        '<p class="price" data-private>' + (menus.length > 1 ? 'From ' : '') + money(from) + ' <span class="a-eyebrow" style="display:inline">' + esc(s.unit === 'table' ? 'for the table' : 'per person') + '</span></p>' +
        '<p>Optional — a request, not a reservation: Guest Relations asks the restaurant for your table and confirms it with you.</p>' +
        '<div id="selbox" data-private></div>' +
        '<p class="x-way" data-private-cta><a class="a-link" data-private-cta href="invitation.html?open=1">Open your invitation</a></p></section>';
    },
    /* the state inside #selbox: the menu choice and the preview, or the line's status with change · remove */
    paint: function (x) {
      ensureCss();
      var box = document.getElementById('selbox'); if (!box || !window.SIYL_BAG) return;
      if (!signedIn()) { box.innerHTML = ''; box.removeAttribute('data-sig'); return; }
      var C = window.SIYL_CONFIRM; if (C && C.load && C.ready && !C.ready() && !confirmAsked) { confirmAsked = true; C.load(); }
      var P = window.SIYL_PRICE, s = x.select, menus = P && P.menusOf ? P.menusOf(s.id) : [], cur = H.current(x), multi = menus.length > 1;
      /* no menu is preselected (PRQ-07a-04): the guest's own choice, else the menu of the line already in My Bag */
      var chosen = box.getAttribute('data-menu') || (cur && cur.menu) || (multi ? '' : (menus[0] ? menus[0].slug : ''));
      var line = H.line(x, chosen || undefined);
      var h = '';
      if (cur) {
        var curMenu = multi && cur.menu && P && P.menuOf ? P.menuOf(s.id, cur.menu) : null;
        h += '<div class="hl-cur"><span class="on" data-sel-state="current" data-line-state="' + esc(lineKey(cur)) + '" tabindex="-1">' + esc(WORDS[lineKey(cur)] || 'In My Bag') + (curMenu ? ' · ' + esc(curMenu.name) : '') + ' · ' + priceWords(x, cur.price) + '</span>' +
          '<div class="hl-acts">' + (multi ? '<button type="button" id="hl-change">Change the menu</button>' : '') + '<a class="a-link" href="cart.html" style="margin:0">Open My Bag</a><button type="button" class="mute" id="hl-remove">Remove from My Bag</button></div></div>';
        if (box.getAttribute('data-changing') === '1' && multi) h += H.menuHtml(menus, chosen) + (chosen ? '<button type="button" class="x-cta" id="hl-preview" data-sel-state="open">See the change · ' + priceWords(x, line.price) + '</button>' : '');
      } else if (s.unit === 'table' && window.SIYL_DRAFT && SIYL_DRAFT.partyTable && SIYL_DRAFT.partyTable(s.id)) {
        /* one table for two (PRQ-07a-06): a party member already has it — no second table */
        h += '<p class="t-b2" data-sel-state="party">Already in ' + esc(SIYL_DRAFT.partyTable(s.id)) + '’s trip — one table for the two of you.</p>';
      } else {
        if (multi) h += H.menuHtml(menus, chosen);
        if (!multi || chosen) {
          if (!s.noAmount) h += '<p class="x-amt" id="selamt">' + money(line.price) + ' <span class="a-eyebrow">' + (s.unit === 'table' ? 'for the table' : 'per person') + ' · your cost</span></p>';
          h += '<button type="button" class="x-cta" id="hl-preview" data-sel-state="open">See what will be added</button>';
        }
      }
      /* the same state paints nothing new: a save or a status read never takes the guest's focus away */
      if (box.getAttribute('data-sig') === h) return;
      box.setAttribute('data-sig', h);
      box.innerHTML = h;
      box.querySelectorAll('[data-menu-pick]').forEach(function (b) { b.addEventListener('click', function () { var slug = b.getAttribute('data-menu-pick'); box.setAttribute('data-menu', slug); H.paint(x); var again = box.querySelector('[data-menu-pick="' + slug + '"]'); if (again) try { again.focus(); } catch (e) {} }); });
      var pv = document.getElementById('hl-preview'); if (pv) pv.addEventListener('click', function () { gated(function () { H.preview(x, box.getAttribute('data-menu') || chosen); }); });
      var ch = document.getElementById('hl-change'); if (ch) ch.addEventListener('click', function () { box.setAttribute('data-changing', '1'); H.paint(x); var m = box.querySelector('[data-menu-pick][aria-checked="true"]') || box.querySelector('[data-menu-pick]'); if (m) m.focus(); });
      var rm = document.getElementById('hl-remove'); if (rm) rm.addEventListener('click', function () { var c = H.current(x); window.SIYL_BAG.remove(c ? c.id : s.id); box.removeAttribute('data-changing'); box.removeAttribute('data-menu'); H.paint(x); var a = document.getElementById('hl-preview') || box.querySelector('[data-menu-pick]'); if (a) a.focus(); });
    },
    menuHtml: function (menus, chosen) {
      return '<p class="a-eyebrow hl-menus-l" id="hl-menus-l">Choose a menu</p><div class="hl-menus" role="radiogroup" aria-label="Choose a menu">' + menus.map(function (m) {
        return '<button type="button" class="hl-menu" role="radio" aria-checked="' + (m.slug === chosen ? 'true' : 'false') + '" data-menu-pick="' + esc(m.slug) + '"><span><span class="n">' + esc(m.name) + '</span><span class="t">' + esc(m.thb || '') + '</span></span><span class="p">' + money(m.price) + '</span></button>';
      }).join('') + '</div>';
    },
    /* PREVIEW: what will go into My Bag, in words — nothing is in the Bag yet */
    preview: function (x, menu) {
      var s = x.select, line = H.line(x, menu), cur = H.current(x), P = window.SIYL_PRICE;
      var m = P && P.menuOf && menu ? P.menuOf(s.id, menu) : null;
      var basis = (m && m.basis) || (P && P.FLAT[s.id] && P.FLAT[s.id].basis) || '';
      var curMenu = cur && cur.menu && P && P.menuOf ? P.menuOf(s.id, cur.menu) : null;
      var amount = s.previewNote
        ? '<b>' + priceWords(x, line.price) + ' · your cost.</b> ' + esc(s.previewNote)
        : '<b>' + priceWords(x, line.price) + ' · your cost</b>, plus 10% service charge and government tax. ' + esc(terms(basis));
      open('<p class="a-eyebrow">Before it goes into My Bag</p><h2>' + (cur ? 'Change your menu at ' : 'Your table at ') + esc(x.name) + '</h2>' +
        '<div class="hl-row"><div class="hl-th" style="background-image:url(' + esc(line.img || x.img || '') + ')"></div><div><p class="hl-n">' + esc(line.name) + '</p><p class="hl-m">' + esc(line.meta || '') + '</p></div></div>' +
        '<p class="note">' + amount + '</p>' +
        (cur ? '<p class="note">This replaces the menu you chose before (' + (curMenu ? esc(curMenu.name) + ' · ' : '') + priceWords(x, cur.price) + ').</p>' : '') +
        '<p class="note">It is sent to us with your trip as a request; Guest Relations confirms the table with you. You can remove it from My Bag at any time.</p>' +
        '<button type="button" class="x-cta" id="hl-confirm" data-sel-state="confirm">' + (cur ? 'Confirm the change' : 'Add to My Bag') + '</button>' +
        '<button type="button" class="cancel" id="hl-cancel">Cancel</button>');
      document.getElementById('hl-cancel').addEventListener('click', close);
      document.getElementById('hl-confirm').addEventListener('click', function () { H.confirm(x, menu); });
    },
    /* ADD: one Bag line per house — put replaces the line with the same id (a menu change), never duplicates */
    confirm: function (x, menu) {
      var s = x.select, line = H.line(x, menu);
      if (!window.SIYL_BAG) return;
      window.SIYL_BAG.put(line);
      var box = document.getElementById('selbox'); if (box) { box.removeAttribute('data-changing'); box.removeAttribute('data-menu'); }
      H.paint(x);
      var meta = s.addedMeta != null ? s.addedMeta : priceWords(x, line.price) + (line.meta ? ' · ' + line.meta : '');
      var note = s.addedNote != null ? s.addedNote : 'It goes to Guest Relations with your trip when you send it from Review & Send.';
      open('<p class="a-eyebrow">Added to My Bag</p><div class="hl-row"><div class="hl-th" style="background-image:url(' + esc(line.img || x.img || '') + ')"></div><div><p class="hl-n">' + esc(line.name) + '</p><p class="hl-m">' + esc(meta) + '</p></div></div>' +
        (note ? '<p class="note">' + esc(note) + '</p>' : '') +
        '<a class="x-cta" href="cart.html" data-sel-state="added">Open My Bag</a><button type="button" class="cancel" id="hl-cancel">' + esc(s.cancelWords || 'Continue reading') + '</button>', 'Added to My Bag');
      document.getElementById('hl-cancel').addEventListener('click', close);
      var cur = document.querySelector('[data-sel-state="current"]'); if (cur) try { cur.focus({ preventScroll: true }); } catch (e) {}
      /* THE BOOKING CONTEXT (20 Sep 2026): opened from 02 / 06, the added table returns the guest to My Trip by itself */
      var Wz = window.SIYL_WIZARD; if (Wz && Wz.active) { var ov = document.getElementById('hl-ov'); var a = ov && ov.querySelector('a.x-cta'); if (a) { a.textContent = 'Back to My Trip'; a.setAttribute('href', 'your-journey.html?done=extras#extras'); } Wz.done('extras'); }
    },
    close: close
  };
})();
