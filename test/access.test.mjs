/* 003 · Edit 3 (Owner, 16 Sep 2026) — ACCESS. Nobody sees the journey, the bag, the tickets or a
   private step without being signed in: every such link on a public page leads to the invitation page
   (and comes back with ?next=); every page says whether a guest is signed in; the public close CTA reads
   "Open your invitation" and links to the invitation page; fares, rooms and adds are never selectable
   signed out (the journeys catalogue itself hands over to the invitation page); Harudot is a café; the
   dress references share one 3:4 size. */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { src, PEGGY } from './sandbox.mjs';

const hasSTM = typeof vm.SourceTextModule === 'function';
/* the invitation module with a small fake DOM: a header, a few links, a location */
async function harness({ auth = null, page = '/destination.html' } = {}) {
  const store = new Map(); if (auth) store.set('siyl.auth', JSON.stringify(auth));
  const listeners = {}, links = [], inserted = [];
  const mkLink = (href) => { const attrs = { href }; return { tagName: 'A', getAttribute: (k) => (k in attrs ? attrs[k] : null), setAttribute: (k, v) => { attrs[k] = v; }, hasAttribute: (k) => k in attrs, attrs, addEventListener() {} }; };
  ['your-journey.html', 'cart.html', 'tickets.html', 'journeys.html#j-wedstay', 'wedding.html', 'invitation.html', 'experiences.html', 'https://example.org/x', 'mailto:x@y.z', '#top', 'room.html?id=wedstay/heritage', 'review.html'].forEach((h) => links.push(mkLink(h)));
  const header = { insertAdjacentElement: (where, el) => inserted.push(el) };
  const mkEl = () => { const el = { attrs: {}, children: [], className: '', innerHTML: '', value: '', disabled: false, textContent: '', setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k]; }, querySelector: () => mkEl(), addEventListener() {}, appendChild() {}, focus() {} }; return el; };
  const sb = {
    console, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    location: { pathname: page, search: '', hash: '', replaced: null, replace(u) { this.replaced = u; } },
    document: { readyState: 'complete', documentElement: {}, head: { appendChild() {} }, body: { classList: { add() {}, remove() {}, contains() { return false; } }, append() {} },
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }, dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
      createElement: () => mkEl(), querySelector: (sel) => (sel === 'header.hd' ? header : sel === '[data-access]' ? (inserted[0] || null) : null), querySelectorAll: (sel) => (sel === 'a[href]' ? links : []) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(), fetch: () => Promise.reject(new Error('no network')), TextEncoder, TextDecoder, crypto: globalThis.crypto,
    MutationObserver: class { observe() {} },
  };
  sb.window = sb; sb.globalThis = sb; sb.window.addEventListener = (t, fn) => { (listeners['window:' + t] = listeners['window:' + t] || []).push(fn); };
  vm.createContext(sb);
  const code = src('assets/invite.mjs').replace("import { lookupByToken, bearerOf } from '../register/crypto.mjs';", '');
  const crypto = await import('../register/crypto.mjs'); sb.lookupByToken = crypto.lookupByToken; sb.bearerOf = crypto.bearerOf;
  const mod = new vm.SourceTextModule(code, { context: sb }); await mod.link(() => { throw new Error('no imports'); }); await mod.evaluate();
  return { sb, links, inserted, listeners };
}

test('ACCESS · which surfaces are private, and the way to the invitation page with a way back', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const { sb } = await harness();
  const I = sb.SIYL_INVITE;
  for (const h of ['your-journey.html', 'cart.html', 'tickets.html', 'journeys.html', 'journeys.html#j-wedstay', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', '/cart.html', './tickets.html', 'your-journey', 'cart?x=1']) assert.equal(I.private(h), true, h + ' is private');
  for (const h of ['index.html', 'destination.html', 'experiences.html', 'experience.html?id=bkk-suhring', 'accommodation.html', 'voyage.html', 'room.html?id=wedstay/heritage', 'transport.html?id=c86', 'marsilea.html', '1872.html', 'tea.html', 'dress.html', 'invitation.html', 'invitation.html?open=1', 'https://example.org/journeys.html', 'mailto:x@y', '#top', '']) assert.equal(I.private(h), false, h + ' is public');
  assert.equal(I.gateUrl('cart.html'), 'invitation.html?open=1&next=cart.html');
  assert.equal(I.gateUrl('journeys.html#j-wedstay'), 'invitation.html?open=1&next=journeys.html%23j-wedstay');
  assert.equal(I.gateUrl('https://evil.example/x'), 'invitation.html?open=1', 'only a page of this site comes back');
  assert.equal(I.gateUrl(''), 'invitation.html?open=1');
});

test('ACCESS · signed out: require() on any page but the invitation page hands over to the invitation page with ?next=; private links are rewritten; the header says NOT SIGNED IN · OPEN YOUR INVITATION', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const { sb, links, inserted } = await harness({ page: '/experiences.html' });
  let ran = false; sb.SIYL_INVITE.require(() => { ran = true; });
  assert.equal(ran, false); assert.equal(sb.location.replaced, 'invitation.html?open=1&next=experiences.html', 'the interrupted page comes back after the code');
  assert.equal(sb.SIYL_INVITE.authed(), false);
  const status = inserted[0]; assert.ok(status, 'the status line is inserted after the header');
  assert.equal(status.attrs['data-state'], 'out'); assert.match(status.innerHTML, /Not signed in/); assert.match(status.innerHTML, /href="invitation\.html\?open=1">Open your invitation</);
  const by = (h) => links.find((l) => l.attrs['data-private-href'] === h || l.attrs.href === h);
  assert.equal(by('your-journey.html').attrs.href, 'invitation.html?open=1&next=your-journey.html');
  assert.equal(by('journeys.html#j-wedstay').attrs.href, 'invitation.html?open=1&next=journeys.html%23j-wedstay');
  assert.equal(by('review.html').attrs.href, 'invitation.html?open=1&next=review.html');
  for (const h of ['invitation.html', 'experiences.html', 'https://example.org/x', 'mailto:x@y.z', '#top', 'room.html?id=wedstay/heritage']) assert.equal(by(h).attrs.href, h, h + ' untouched');
});

test('ACCESS · signed in: require() runs at once, private links keep their targets, the header names the guest with Your Journey and Sign out; on the invitation page a signed-out require() opens the prompt in place', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const { sb, links, inserted } = await harness({ auth: PEGGY, page: '/experiences.html' });
  let ran = null; sb.SIYL_INVITE.require((a) => { ran = a; });
  assert.equal(ran && ran.guestId, 'g-peggy'); assert.equal(sb.location.replaced, null);
  assert.equal(inserted[0].attrs['data-state'], 'in'); assert.match(inserted[0].innerHTML, /Signed in · Peggy/); assert.match(inserted[0].innerHTML, /href="your-journey\.html">Your Journey</); assert.match(inserted[0].innerHTML, /data-access-out>Sign out</);
  assert.equal(links.find((l) => l.attrs.href === 'your-journey.html').attrs.href, 'your-journey.html');
  const inv = await harness({ page: '/invitation.html' });
  let opened = false; inv.sb.document.body.classList.add = (c) => { if (c === 'siyl-inv-open') opened = true; };
  inv.sb.SIYL_INVITE.require(() => {});
  assert.equal(inv.sb.location.replaced, null, 'no redirect from the invitation page'); assert.equal(opened, true, 'the prompt opens in place');
});

test('ACCESS · the pages: the bag, the tickets, the journeys catalogue and every private step hand over when nobody is signed in; the public close CTA is "Open your invitation" → the invitation page; every public page loads the gate', () => {
  for (const f of ['cart.html', 'tickets.html', 'journeys.html']) assert.match(src(f), /gated\(function\(\)\{\}\);/, f + ' hands over at load');
  assert.match(src('assets/prep-shell.js'), /if \(!\/\^invitation\(\\\.html\)\?\$\/\.test\(location\.pathname\.split\('\/'\)\.pop\(\)\)\) \{\s*var toGate = function \(\) \{ if \(window\.SIYL_INVITE && SIYL_INVITE\.require\) SIYL_INVITE\.require\(function \(\) \{\}\); \};/, 'the private shell hands over');
  for (const f of ['accommodation.html', 'destination.html', 'experiences.html', 'index.html', 'voyage.html']) {
    assert.match(src(f), /<a class="a-cta" href="invitation\.html">Open your invitation<\/a>/, f + ' close CTA');
    assert.doesNotMatch(src(f), /<a class="a-cta" href="journeys\.html">Plan your journey<\/a>/, f);
  }
  for (const f of ['index.html', 'destination.html', 'journeys.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html', 'marsilea.html', '1872.html', 'tea.html', 'transport.html', 'room.html', 'dress.html', 'invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html']) assert.match(src(f), /assets\/invite\.mjs/, f + ' loads the gate');
  /* the journeys catalogue is the planner: no fare, room or add is reachable signed out because the page itself hands over first */
  const j = src('journeys.html'); assert.ok(j.indexOf('gated(function(){});') < j.indexOf("document.querySelectorAll('[data-add]').forEach(function(b){b.addEventListener('click'"), 'the hand-over precedes every selector');
});

test('EDIT 3 · Harudot is a café; the dress references share one 3:4 card, covered from the top, never stretched', () => {
  assert.match(src('assets/experiences.js'), /\{ id: 'bkk-harudot', roles: \['cafe'\]/);
  assert.match(src('src/experience-inventory.json'), /"id": "bkk-harudot",\n  "name": "Harudot",\n  "city": "Bangkok",\n  "roles": \[\n   "cafe"\n  \]/);
  const css = src('assets/prep.css');
  assert.match(css, /\.p-rail > img \{ display: block; flex: 0 0 72%; width: 72%; max-width: 300px; height: auto; aspect-ratio: 3 \/ 4; object-fit: cover; object-position: 50% 12%;/);
  assert.doesNotMatch(css, /\.p-rail > img \{[^}]*object-fit: contain/);
});
