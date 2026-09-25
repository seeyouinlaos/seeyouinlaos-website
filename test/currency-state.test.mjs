/* ONE CURRENCY ON THE PAGE (Owner, 25 Sep 2026 · a guest's Safari showed THB chosen in the menu and amounts in USD).
   The choice lives in ONE place (localStorage siyl.cur, read by assets/i18n/siyl-i18n.js at load); the menu's and the footer's
   buttons are painted from that same state, and the amounts are converted from the rendered "USD n" by the same runtime. The
   two could disagree whenever the conversion pass stopped part-way (one failing node aborted the whole pass and the queue
   behind it) or when a page was shown again from Safari's back/forward cache after the choice had changed elsewhere. These
   tests drive the GENERATED runtime in a small DOM: every amount follows the choice, one bad node never stops the pass, the
   controls are painted whatever happens, a restored page follows the stored choice, and a switch always goes through the
   one stored preference. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { src } from './sandbox.mjs';

/* ---- a minimal DOM: text nodes, elements, a tree walker, a manual MutationObserver ---- */
class N { constructor() { this.parentNode = null; this.childNodes = []; } get firstChild() { return this.childNodes[0] || null; }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n.nodeType === 9; }
  appendChild(c) { c.parentNode = this; this.childNodes.push(c); return c; } }
class T extends N { constructor(d) { super(); this.nodeType = 3; this._d = d; this.nodeName = '#text'; } get data() { return this._d; } set data(v) { if (this.poison) throw new Error('poisoned node'); this._d = v; } }
class E extends N {
  constructor(name, attrs) { super(); this.nodeType = 1; this.nodeName = name.toUpperCase(); this.a = Object.assign({}, attrs || {}); this.style = {}; }
  getAttribute(k) { return k in this.a ? this.a[k] : null; } setAttribute(k, v) { this.a[k] = String(v); } hasAttribute(k) { return k in this.a; }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); } get firstElementChild() { return this.children[0] || null; }
  get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.data : c.textContent)).join(''); }
  set textContent(v) { this.childNodes = []; if (v) this.appendChild(new T(v)); }
  set innerHTML(v) { this._html = v; this.childNodes = []; } get innerHTML() { return this._html || ''; }
  matches(sel) { return sel.split(',').some((s) => { const m = /^\[([\w-]+)(?:="([^"]*)")?\]$/.exec(s.trim()); return !!m && (m[1] in this.a) && (m[2] == null || this.a[m[1]] === m[2]); }); }
  closest(sel) { let n = this; while (n && n.nodeType === 1) { if (n.matches(sel)) return n; n = n.parentNode; } return null; }
  querySelectorAll(sel) { const out = []; const rec = (n) => n.childNodes.forEach((c) => { if (c.nodeType === 1) { if (c.matches(sel)) out.push(c); rec(c); } }); rec(this); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}
function world({ cur, lang, persisted }) {
  const store = new Map([['siyl.cur', cur || 'USD'], ['siyl.lang', lang || 'en']]);
  const doc = new N(); doc.nodeType = 9; doc.readyState = 'complete'; doc.title = 'Test';
  const html = doc.appendChild(new E('html')); const body = html.appendChild(new E('body'));
  doc.documentElement = html; doc.body = body; doc.hidden = false; const listeners = {}; const winL = {};
  doc.addEventListener = (t, f) => { (listeners[t] = listeners[t] || []).push(f); };
  doc.createTreeWalker = (root) => { const list = []; const rec = (n) => n.childNodes.forEach((c) => { list.push(c); if (c.nodeType === 1) rec(c); }); rec(root); let i = -1; return { nextNode: () => list[++i] || null }; };
  doc.write = () => {};
  doc.querySelectorAll = (sel) => (/script|link/.test(sel) ? [] : html.querySelectorAll(sel)); doc.querySelector = (sel) => doc.querySelectorAll(sel)[0] || null;
  let observer = null; let reloads = 0;
  const sb = { document: doc, NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4 }, WeakMap, URLSearchParams, setTimeout: (f) => f(), requestAnimationFrame: (f) => f(),
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    sessionStorage: { getItem: () => null, setItem() {} },
    location: { search: '', pathname: '/cart.html', reload: () => { reloads++; } },
    MutationObserver: class { constructor(cb) { this.cb = cb; observer = this; } observe() {} },
    addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f); } };
  sb.window = sb; sb.self = sb;
  return { sb, doc, body, store, listeners, winL, fire: (records) => observer && observer.cb(records), reloads: () => reloads };
}
const RUNTIME = src('assets/i18n/siyl-i18n.js');
const load = (w) => { vm.createContext(w.sb); vm.runInContext(RUNTIME, w.sb, { filename: 'siyl-i18n.js' }); return w.sb.SIYL_I18N; };
const text = (el) => el.textContent;
function page(w, amounts) {
  const els = amounts.map((a) => { const p = w.body.appendChild(new E('p')); p.appendChild(new T(a)); return p; });
  const prefs = w.body.appendChild(new E('div', { 'data-prefs': '' }));
  return { els, prefs };
}

test('USD → THB · USD → EUR · THB → USD: every rendered amount follows the ONE stored choice, and the controls say the same', () => {
  for (const [cur, re] of [['THB', /^≈ THB [\d,]+$/], ['EUR', /^≈ EUR [\d,]+$/], ['USD', /^USD [\d,]+$/]]) {
    const w = world({ cur }); const { els, prefs } = page(w, ['USD 100', 'USD 1,500', 'USD 192']);
    const I = load(w);
    assert.equal(I.currency, cur);
    for (const el of els) assert.match(text(el), re, cur + ': ' + text(el));
    assert.match(prefs.innerHTML, new RegExp('data-cur-btn="' + cur + '" aria-pressed="true"'), 'the pressed button is the applied currency');
    assert.equal((prefs.innerHTML.match(/aria-pressed="true"/g) || []).length, 2, 'one language, one currency pressed');
  }
  /* USD 0 stays as it is (an empty Bag), in every currency */
  const w = world({ cur: 'THB' }); const { els } = page(w, ['USD 0']); load(w); assert.equal(text(els[0]), 'USD 0');
});

test('ONE NODE NEVER STOPS THE PASS: a node that cannot be written is skipped — every other amount is still converted and the controls are still painted', () => {
  const w = world({ cur: 'THB' }); const { els, prefs } = page(w, ['USD 100', 'USD 200', 'USD 300']);
  els[1].firstChild.poison = true;
  load(w);
  assert.match(text(els[0]), /≈ THB/); assert.match(text(els[2]), /≈ THB/, 'the amount after the failing node follows the choice');
  assert.match(prefs.innerHTML, /data-cur-btn="THB" aria-pressed="true"/);
  assert.equal(w.doc.documentElement.style.visibility, '', 'the page is revealed');
});

test('AMOUNTS ADDED LATER: a Bag total re-rendered by the page, and an amount the observer never reported, are converted by the check after each pass', () => {
  const w = world({ cur: 'THB' }); const { els } = page(w, ['USD 100']); load(w);
  const late = w.body.appendChild(new E('b')); late.appendChild(new T('USD 962'));          /* reported */
  const silent = w.body.appendChild(new E('span')); silent.appendChild(new T('USD 290'));   /* never reported */
  w.fire([{ type: 'childList', addedNodes: [late], target: w.body }]);
  assert.match(text(late), /^≈ THB [\d,]+$/); assert.match(text(silent), /^≈ THB [\d,]+$/, 'no visible "USD n" survives while THB is chosen');
  /* the page writes a new amount into a node it already rendered */
  els[0].firstChild.data = 'USD 480'; w.fire([{ type: 'characterData', target: els[0].firstChild }]);
  assert.match(text(els[0]), /^≈ THB [\d,]+$/);
});

test('A RESTORED PAGE FOLLOWS THE CHOICE: shown again from the back/forward cache or brought back to the front after the choice changed elsewhere, the page reloads once; unchanged, it stays', () => {
  const w = world({ cur: 'THB' }); page(w, ['USD 100']); load(w);
  const show = (persisted) => (w.winL.pageshow || []).forEach((f) => f({ persisted }));
  const visible = () => (w.listeners.visibilitychange || []).forEach((f) => f());
  show(true); visible(); assert.equal(w.reloads(), 0, 'the same choice: nothing to do');
  w.store.set('siyl.cur', 'USD');   /* switched on another page or tab */
  show(true); assert.equal(w.reloads(), 1, 'restored from the cache: reloaded to USD');
  const w2 = world({ cur: 'USD' }); page(w2, ['USD 100']); load(w2); w2.store.set('siyl.cur', 'EUR');
  (w2.listeners.visibilitychange || []).forEach((f) => f()); assert.equal(w2.reloads(), 1, 'a tab brought back: reloaded to EUR');
  const w3 = world({ cur: 'THB', lang: 'en' }); page(w3, ['USD 100']); load(w3); w3.store.set('siyl.lang', 'th');
  (w3.winL.pageshow || []).forEach((f) => f({ persisted: true })); assert.equal(w3.reloads(), 1, 'the language follows the same rule');
});

test('THE SWITCH · the menu and the footer write the one stored preference and reload — navigation and a returning session read it again; a change of language keeps the currency and back', () => {
  const w = world({ cur: 'USD' }); page(w, ['USD 100']); const I = load(w);
  I.setCurrency('THB'); assert.equal(w.store.get('siyl.cur'), 'THB'); assert.equal(w.reloads(), 1);
  I.setLang('th'); assert.equal(w.store.get('siyl.lang'), 'th'); assert.equal(w.store.get('siyl.cur'), 'THB', 'the currency is kept');
  /* the next page (navigation, reload or a returning session) is a fresh load of the same stored state */
  const next = world({ cur: w.store.get('siyl.cur'), lang: 'en' }); const { els, prefs } = page(next, ['USD 192']); load(next);
  assert.match(text(els[0]), /≈ THB/); assert.match(prefs.innerHTML, /data-cur-btn="THB" aria-pressed="true"/);
  /* one source: no page keeps a currency of its own */
  for (const f of ['assets/bag.js', 'assets/pricing.js', 'assets/journey.js', 'assets/aman.js', 'assets/shop-menu.js', 'assets/recon.js', 'cart.html', 'your-journey.html']) assert.doesNotMatch(src(f), /['"]siyl\.cur['"]/, f + ' reads no currency of its own');
});
