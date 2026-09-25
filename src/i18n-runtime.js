/* SEE YOU IN LAOS — THE LOCALE RUNTIME (EN / TH · USD / EUR / THB). Generated into assets/i18n/siyl-i18n.js together with the
 * locale core by src/build-i18n.cjs — edit src/, then `node src/build-i18n.cjs`.
 *
 * Loaded synchronously first in every page's head, so the language and the currency are known before anything is painted:
 * - English is the page as written. Thai loads its authored dictionary (assets/i18n/th.js) only when Thai is chosen.
 * - The page stays hidden until the first pass has run (no English flash), with a safety reveal.
 * - Everything the pages build later (drawers, choosers, states, errors, live regions) is translated as it appears:
 *   text, aria-label, alt, title, placeholder, the document title.
 * - Text changes, logic does not: nothing stored, sent or compared is ever translated or converted.
 * - A choice of language or currency is remembered on this device and the page is drawn again in it. */
(function () {
  'use strict';
  var CORE = window.SIYL_I18N_CORE;
  var LANGS = ['en', 'th'], KEY = 'siyl.lang', CKEY = 'siyl.cur';
  var lang = 'en', cur = 'USD';
  try { var q = new URLSearchParams(location.search).get('lang'); if (LANGS.indexOf(q) > -1) localStorage.setItem(KEY, q); } catch (e) {}
  try { var st = localStorage.getItem(KEY); if (LANGS.indexOf(st) > -1) lang = st; } catch (e) {}
  try { var sc = localStorage.getItem(CKEY); if (CORE.CURRENCIES.indexOf(sc) > -1) cur = sc; } catch (e) {}
  var active = lang !== 'en' || cur !== 'USD';
  var de = document.documentElement;
  de.setAttribute('lang', lang === 'th' ? 'th' : 'en');
  de.setAttribute('data-lang', lang);
  de.setAttribute('data-cur', cur);
  if (lang === 'th' && document.readyState === 'loading') {
    document.write('<link rel="stylesheet" href="assets/i18n/th.css?v=__TH_CSS__"><script src="assets/i18n/th.js?v=__TH_JS__"><\/script>');
  }
  var revealed = false;
  function reveal() { if (revealed) return; revealed = true; de.style.visibility = ''; }
  if (active) { de.style.visibility = 'hidden'; setTimeout(reveal, 2500); }

  var T = null;
  function dict() { if (!T) T = CORE.translator(lang === 'th' ? (window.SIYL_TH || {}) : {}); return T; }
  var MISSES = {};
  var LATIN = /[A-Za-z]{2,}/;
  /* one rendered string → the chosen language and currency */
  function conv(s) {
    var out = s;
    if (lang === 'th') {
      var t = dict().lookup(s);
      if (t != null) { var lead = s.match(/^\s*/)[0], tail = s.match(/\s*$/)[0]; out = lead + t + tail; }
      else if (LATIN.test(s)) MISSES[CORE.norm(s)] = true;
    }
    return CORE.moneyText(out, cur);
  }
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1 };
  var done = new WeakMap();
  function skipEl(el) { return !el || SKIP[el.nodeName] || (el.closest && el.closest('[data-i18n-skip],[contenteditable="true"]')); }
  function textNode(n) {
    var d = n.data; if (!/\S/.test(d)) return;
    if (done.get(n) === d) return;                     /* our own output */
    if (skipEl(n.parentNode)) return;
    var o = conv(d);
    done.set(n, o);
    if (o !== d) n.data = o;
  }
  var ATTRS = ['aria-label', 'alt', 'title', 'placeholder', 'aria-description', 'aria-valuetext'];
  var attrDone = new WeakMap();
  function attrs(el) {
    if (!el.getAttribute || skipEl(el)) return;
    var seen = attrDone.get(el) || {};
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (v == null || !/\S/.test(v) || seen[a] === v) continue;
      var o = conv(v); seen[a] = o;
      if (o !== v) el.setAttribute(a, o);
    }
    attrDone.set(el, seen);
  }
  /* a sentence split only by emphasis ("It is <b>not</b> …"): the whole sentence is one semantic unit — its authored Thai
     replaces the words (the emphasis goes with it; links and controls are never touched) */
  var BLOCK = /^(P|LI|DD|DT|FIGCAPTION|H1|H2|H3|H4|H5|H6|LABEL|SMALL|BLOCKQUOTE|TD|TH|CAPTION|LEGEND|SUMMARY)$/;
  var INLINE = /^(B|STRONG|EM|I|SPAN|BR|U|SMALL|MARK|SUP|SUB|NOBR)$/;
  function whole(el) {
    if (lang !== 'th' || !BLOCK.test(el.nodeName) || !el.firstChild || !el.firstElementChild) return false;
    if (el.querySelector('a,button,input,select,textarea,img,svg,[data-i18n-skip]')) return false;
    var kids = el.querySelectorAll('*'); for (var i = 0; i < kids.length; i++) if (!INLINE.test(kids[i].nodeName) || kids[i].children.length) return false;
    var full = CORE.norm(el.textContent); if (!full || !LATIN.test(full)) return false;
    var th = dict().lookup(full); if (th == null) return false;
    el.textContent = CORE.moneyText(th, cur); done.set(el.firstChild, el.firstChild.data);
    return true;
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { textNode(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (skipEl(root)) return; attrs(root); }
    if (root.nodeType === 1 && whole(root)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    if (lang === 'th') { var wholeDone = []; for (var k = 0; k < list.length; k++) if (list[k].nodeType === 1 && whole(list[k])) wholeDone.push(list[k]);
      if (wholeDone.length) list = list.filter(function (x) { return x.isConnected && !wholeDone.some(function (e) { return e !== x && e.contains(x); }); }); }
    for (var i = 0; i < list.length; i++) { if (list[i].nodeType === 3) textNode(list[i]); else attrs(list[i]); }
  }
  var titleDone = null;
  function title() { if (document.title && document.title !== titleDone) { var o = conv(document.title); titleDone = o; if (o !== document.title) document.title = o; } }

  var queue = [], scheduled = false;
  function flush() { scheduled = false; var q = queue; queue = []; for (var i = 0; i < q.length; i++) walk(q[i]); title(); }
  function schedule(n) { queue.push(n); if (!scheduled) { scheduled = true; (window.requestAnimationFrame || setTimeout)(flush); } }
  var mo = active ? new MutationObserver(function (records) {
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      if (r.type === 'characterData') schedule(r.target);
      else if (r.type === 'attributes') schedule(r.target.nodeType === 1 ? { nodeType: 0, el: r.target } : r.target);
      else for (var j = 0; j < r.addedNodes.length; j++) schedule(r.addedNodes[j]);
    }
  }) : null;
  /* attribute records carry the element only: re-read its attributes, not its whole subtree */
  var walk0 = walk; walk = function (x) { if (x && x.nodeType === 0 && x.el) { attrs(x.el); return; } walk0(x); };

  function start() {
    if (active) {
      walk(document.body); title();
      mo.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
    paintPrefs();
    reveal();
  }

  /* ---- the choice: EN · TH and USD · EUR · THB, in the menu (assets/aman.js) and wherever [data-prefs] stands ---- */
  function t(s) { return lang === 'th' ? dict().tr(s) : s; }
  function prefsHtml() {
    var b = function (attr, v, words, on) { return '<button type="button" ' + attr + '="' + v + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (on ? ' class="on"' : '') + '>' + words + '</button>'; };
    return '<div class="a-prefs" data-i18n-skip>' +
      '<div class="a-pref" role="group" aria-label="' + t('Language') + '"><span class="a-pref-l">' + t('Language') + '</span>' +
        b('data-lang-btn', 'en', 'English', lang === 'en') + b('data-lang-btn', 'th', 'ภาษาไทย', lang === 'th') + '</div>' +
      '<div class="a-pref" role="group" aria-label="' + t('Currency') + '"><span class="a-pref-l">' + t('Currency') + '</span>' +
        CORE.CURRENCIES.map(function (c) { return b('data-cur-btn', c, c, cur === c); }).join('') + '</div>' +
      (cur !== 'USD' ? '<p class="a-pref-n">' + (lang === 'th' ? dict().tr('Prices in ' + cur + ' are approximate; the amount in USD is the one that counts.') : 'Prices in ' + cur + ' are approximate; the amount in USD is the one that counts.') + '</p>' : '') +
      '</div>';
  }
  function paintPrefs() { var els = document.querySelectorAll('[data-prefs]'); for (var i = 0; i < els.length; i++) if (els[i].innerHTML !== prefsHtml()) els[i].innerHTML = prefsHtml(); }
  function setLang(l) { if (LANGS.indexOf(l) < 0 || l === lang) return; try { localStorage.setItem(KEY, l); } catch (e) {} location.reload(); }
  function setCurrency(c) { if (CORE.CURRENCIES.indexOf(c) < 0 || c === cur) return; try { localStorage.setItem(CKEY, c); } catch (e) {} location.reload(); }
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-lang-btn],[data-cur-btn]') : null; if (!el) return;
    e.preventDefault();
    if (el.hasAttribute('data-lang-btn')) setLang(el.getAttribute('data-lang-btn')); else setCurrency(el.getAttribute('data-cur-btn'));
  });

  window.SIYL_I18N = {
    get lang() { return lang; },
    get currency() { return cur; },
    RATES: CORE.RATES, CURRENCIES: CORE.CURRENCIES,
    /* a whole English string → the chosen language (unchanged when there is no authored Thai) */
    tr: t,
    has: function (s) { return lang !== 'th' || dict().has(s); },
    /* one canonical USD amount in the chosen currency ("USD 1,500" · "≈ EUR 1,320") — the one formatter */
    money: function (usd) { return CORE.money(usd, cur); },
    moneyText: function (s) { return CORE.moneyText(s, cur); },
    prefsHtml: prefsHtml, paintPrefs: paintPrefs, setLang: setLang, setCurrency: setCurrency,
    misses: function () { return Object.keys(MISSES); }
  };
  /* A PAGE NEVER STAYS ON AN OLD RELEASE (Owner, 25 Sep 2026): a tab restored from the back/forward cache, or brought back after
     a while, may still show an earlier release (the iPhone at 01:58 showed the page of the day before). The versions of the
     page's own assets are its signature: when the page the server serves now carries another signature, it is reloaded —
     once per release, never in a loop, and only for the page's own address. */
  function sigOf(list) { var out = []; for (var i = 0; i < list.length; i++) { var m = /[?&]v=([0-9a-f]{8})/.exec(list[i] || ''); if (m) out.push(m[1]); } return out.sort().join('.'); }
  function sigHere() { var l = []; var els = document.querySelectorAll('script[src],link[href]'); for (var i = 0; i < els.length; i++) l.push(els[i].getAttribute('src') || els[i].getAttribute('href')); return sigOf(l); }
  var SIG = null;
  function fresh() {
    if (!window.fetch || !SIG) return;
    fetch(location.pathname + location.search, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) {
      if (!t) return;
      var now = sigOf(t.match(/(?:src|href)="[^"]*\?v=[0-9a-f]{8}"/g) || []);
      if (!now || now === SIG) return;
      try { if (sessionStorage.getItem('siyl.reloaded') === now) return; sessionStorage.setItem('siyl.reloaded', now); } catch (e) { /* no storage: reload once anyway */ }
      location.reload();
    }).catch(function () { /* offline: the page stays as it is */ });
  }
  var hiddenAt = 0;
  document.addEventListener('visibilitychange', function () { if (document.hidden) hiddenAt = Date.now(); else if (hiddenAt && Date.now() - hiddenAt > 5 * 60 * 1000) fresh(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) fresh(); });
  function start0() { SIG = sigHere(); start(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start0); else start0();
})();
