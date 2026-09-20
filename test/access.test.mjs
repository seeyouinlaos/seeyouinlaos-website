/* 003 · Edit 3 (Owner, 16 Sep 2026) — ACCESS, and the final information architecture (Owner, 16 Sep 2026):
   DESTINATIONS = public editorial discovery · THE JOURNEY = public editorial overview of the trip (journeys.html:
   chapters, places, dates, photographs — every price, room, fare and add is a private fragment that never enters
   a signed-out page; the way in stands where the planning would be) · YOUR JOURNEY = the private personal planner.
   Private surfaces (the planner and its steps, the bag, the tickets, the room and transport planning pages) hand
   over to the invitation page and come back with ?next=; every link to them on a public page leads there; a public
   call to action into private planning reads Open your invitation while nobody is signed in; every page says whether
   a guest is signed in; Harudot is a café; the dress references share one 3:4 size. */
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
  ['your-journey.html', 'cart.html', 'tickets.html', 'journeys.html#j-wedstay', 'wedding.html', 'invitation.html', 'experiences.html', 'https://example.org/x', 'mailto:x@y.z', '#top', 'room.html?stay=souphattra&room=heritage', 'transport.html?id=c86', 'review.html'].forEach((h) => links.push(mkLink(h)));
  const swap = mkLink('journeys.html#j-wedstay'); swap.attrs['data-cta-swap'] = ''; swap.textContent = 'Choose your room'; const way = mkLink('invitation.html?open=1'); way.attrs['data-private-cta'] = ''; way.textContent = 'Open your invitation';
  /* the header is menu · wordmark · bag; the account block is the first child of the menu drawer (Owner, 18 Sep 2026) */
  const header = { insertAdjacentElement: (where, el) => inserted.push(el), offsetHeight: 57 };
  const menu = { firstChild: null, insertBefore: (el) => inserted.push(el) };
  const mkEl = () => { const el = { attrs: {}, children: [], className: '', innerHTML: '', value: '', disabled: false, textContent: '', setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k]; }, querySelector: () => mkEl(), addEventListener() {}, appendChild() {}, focus() {} }; return el; };
  const sb = {
    console, localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
    location: { pathname: page, search: '', hash: '', replaced: null, replace(u) { this.replaced = u; } },
    document: { readyState: 'complete', documentElement: { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k] || null; } }, head: { appendChild() {} }, body: { classList: { add() {}, remove() {}, contains() { return false; } }, append() {} },
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); }, dispatchEvent: (e) => { (listeners[e.type] || []).forEach((fn) => fn(e)); return true; },
      createElement: () => mkEl(), querySelector: (sel) => (sel === 'header.hd' ? header : sel === '.a-menu' ? menu : sel === '[data-account]' ? (inserted[0] || null) : null), querySelectorAll: (sel) => (sel === 'a[data-private-cta]' ? [way] : sel === 'a[data-cta-swap]' ? [swap] : sel === 'a[href]' ? links : []) },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setTimeout: (fn) => fn(), fetch: () => Promise.reject(new Error('no network')), TextEncoder, TextDecoder, crypto: globalThis.crypto,
    MutationObserver: class { observe() {} },
  };
  sb.window = sb; sb.globalThis = sb; sb.window.addEventListener = (t, fn) => { (listeners['window:' + t] = listeners['window:' + t] || []).push(fn); };
  vm.createContext(sb);
  const code = src('assets/invite.mjs').replace("import { lookupByToken, bearerOf } from '../register/crypto.mjs';", '');
  const crypto = await import('../register/crypto.mjs'); sb.lookupByToken = crypto.lookupByToken; sb.bearerOf = crypto.bearerOf;
  const mod = new vm.SourceTextModule(code, { context: sb }); await mod.link(() => { throw new Error('no imports'); }); await mod.evaluate();
  return { sb, links, inserted, listeners, swap, way };
}

test('ACCESS · which surfaces are private, and the way to the invitation page with a way back', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const { sb } = await harness();
  const I = sb.SIYL_INVITE;
  for (const h of ['your-journey.html', 'cart.html', 'tickets.html', 'room.html?stay=souphattra&room=heritage', 'transport.html?id=c86', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', '/cart.html', './tickets.html', 'your-journey', 'cart?x=1', 'room?stay=sathorn&room=penthouse', 'transport']) assert.equal(I.private(h), true, h + ' is private');
  for (const h of ['index.html', 'destination.html', 'journeys.html', 'journeys.html#j-wedstay', 'experiences.html', 'experience.html?id=bkk-suhring', 'accommodation.html', 'voyage.html', 'marsilea.html', '1872.html', 'tea.html', 'dress.html', 'invitation.html', 'invitation.html?open=1', 'https://example.org/journeys.html', 'mailto:x@y', '#top', '']) assert.equal(I.private(h), false, h + ' is public (The Journey is public editorial)');
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
  const status = inserted[0]; assert.ok(status, 'the account block is placed in the menu drawer');
  assert.equal(status.attrs['data-state'], 'out'); assert.match(status.innerHTML, /Not signed in/); assert.match(status.innerHTML, /href="invitation\.html\?open=1" data-access-nav="in">Open your invitation</);
  const by = (h) => links.find((l) => l.attrs['data-private-href'] === h || l.attrs.href === h);
  assert.equal(by('your-journey.html').attrs.href, 'invitation.html?open=1&next=your-journey.html');
  assert.equal(by('room.html?stay=souphattra&room=heritage').attrs.href, 'invitation.html?open=1&next=room.html%3Fstay%3Dsouphattra%26room%3Dheritage');
  assert.equal(by('transport.html?id=c86').attrs.href, 'invitation.html?open=1&next=transport.html%3Fid%3Dc86');
  assert.equal(by('review.html').attrs.href, 'invitation.html?open=1&next=review.html');
  for (const h of ['invitation.html', 'experiences.html', 'journeys.html#j-wedstay', 'https://example.org/x', 'mailto:x@y.z', '#top']) assert.equal(by(h).attrs.href, h, h + ' untouched');
  /* the document says the state; a call to action into private planning reads Open your invitation; the way in leads to the invitation page with the way back */
  const { sb: s2, swap, way } = await harness({ page: '/voyage.html' });
  assert.equal(s2.document.documentElement.getAttribute('data-session'), 'out');
  assert.equal(swap.textContent, 'Open your invitation'); assert.equal(swap.attrs.href, 'invitation.html?open=1&next=voyage.html'); assert.equal(swap.attrs['data-cta-text'], 'Choose your room');
  assert.equal(way.attrs.href, 'invitation.html?open=1&next=voyage.html');
  /* the swap assigns only what changes — a text node replaced on every pass would wake the mutation observer without end (the page never reaches load) */
  assert.match(src('assets/invite.mjs'), /if \(l\.textContent !== text\) l\.textContent = text;\s*if \(l\.getAttribute\('href'\) !== href\) l\.setAttribute\('href', href\);/);
  let sets = 0; Object.defineProperty(swap, 'textContent', { get() { return this._t; }, set(v) { sets++; this._t = v; } }); swap._t = 'Open your invitation';
  s2.document.dispatchEvent({ type: 'siyl:signout' }); s2.document.dispatchEvent({ type: 'siyl:signout' });
  assert.equal(sets, 0, 'no assignment when nothing changes');
});

test('ACCESS · signed in: require() runs at once, private links keep their targets, the header names the guest with Your Journey and Sign out; on the invitation page a signed-out require() opens the prompt in place', { skip: !hasSTM && 'run with --experimental-vm-modules' }, async () => {
  const { sb, links, inserted } = await harness({ auth: PEGGY, page: '/experiences.html' });
  let ran = null; sb.SIYL_INVITE.require((a) => { ran = a; });
  assert.equal(ran && ran.guestId, 'g-peggy'); assert.equal(sb.location.replaced, null);
  assert.equal(inserted[0].attrs['data-state'], 'in'); assert.match(inserted[0].innerHTML, /Signed in · Peggy/); assert.match(inserted[0].innerHTML, /href="your-journey\.html" data-access-nav="trip">My Trip</); assert.match(inserted[0].innerHTML, /data-access-nav="profile">My Profile</, 'the account navigation lives in the menu drawer (Owner, 18 Sep 2026 · Aman header)'); assert.match(inserted[0].innerHTML, /data-access-out>Sign out</);
  assert.equal(links.find((l) => l.attrs.href === 'your-journey.html').attrs.href, 'your-journey.html');
  assert.equal(sb.document.documentElement.getAttribute('data-session'), 'in');
  const { swap, way } = await harness({ auth: PEGGY, page: '/voyage.html' });
  assert.equal(swap.textContent, 'Choose your room'); assert.equal(swap.attrs.href, 'journeys.html#j-wedstay'); assert.equal(way.attrs.href, 'your-journey.html');
  const inv = await harness({ page: '/invitation.html' });
  let opened = false; inv.sb.document.body.classList.add = (c) => { if (c === 'siyl-inv-open') opened = true; };
  inv.sb.SIYL_INVITE.require(() => {});
  assert.equal(inv.sb.location.replaced, null, 'no redirect from the invitation page'); assert.equal(opened, true, 'the prompt opens in place');
});

test('ACCESS · the pages: the bag, the tickets, the room and transport planning pages and every private step hand over when nobody is signed in; The Journey is public editorial with its private fragments removed and the way in; the public close CTA is "Open your invitation" → the invitation page; every public page loads the gate', () => {
  for (const f of ['cart.html', 'tickets.html']) assert.match(src(f), /gated\(function\(\)\{\}\);/, f + ' hands over at load');
  for (const f of ['room.html', 'transport.html']) assert.match(src(f), /gated\(function \(\) \{\}\);/, f + ' hands over at load');
  /* THE JOURNEY: public editorial — the planner block runs for a signed-in guest only; signed out every private fragment leaves the page before anything renders */
  const j = src('journeys.html');
  assert.match(j, /<title>The Journey · See You In Laos<\/title><script src="assets\/invite-early\.js(?:\?v=[0-9a-f]{8})?"><\/script>/); assert.match(j, /<main><h1>The Journey<\/h1>/);
  assert.match(j, /var SIGNED_IN = document\.documentElement\.getAttribute\('data-session'\) === 'in';\s*if \(!SIGNED_IN\) \{ document\.querySelectorAll\('\[data-private\]'\)\.forEach\(function \(el\) \{ el\.parentNode\.removeChild\(el\); \}\); \}\s*if \(SIGNED_IN\) \(function \(\) \{/);
  assert.doesNotMatch(j, /gated\(function\(\)\{\}\);/, 'no hand-over: the page is public');
  assert.equal((j.match(/<p class="pp" data-private>/g) || []).length, 5, "release 012: the Riverside Hotel card carries its amount as a private fragment"); assert.equal((j.match(/<p class="pb" data-private/g) || []).length, 9); assert.equal((j.match(/<div class="vars" data-private data-/g) || []).length, 6); assert.equal((j.match(/<div class="psel" data-private data-select/g) || []).length, 1); assert.equal((j.match(/<button class="add" data-private data-add=/g) || []).length, 3); assert.match(j, /<p class="jstat" id="jstat" data-private><\/p>/);
  assert.doesNotMatch(j.replace(/<p class="pp" data-private>[^<]*<\/p>|<p class="pb" data-private[^>]*>[^<]*<\/p>/g, ''), /USD \d/, 'every amount of the page is a private fragment');
  assert.equal((j.match(/<a class="vw jcta" data-private-cta href="invitation\.html\?open=1">Open your invitation<\/a>/g) || []).length, 6, 'the way in, in every stay card');
  assert.equal((j.match(/<a class="vw" data-cta-swap href="(?:transport|room)\.html/g) || []).length, 6, 'the view links into private planning swap their label signed out (release 012: the Riverside Hotel)');
  assert.match(j, /<a class="jgo" data-private-cta href="invitation\.html\?open=1">Open your invitation<\/a>/);
  /* the shared rule and the early attribute */
  assert.match(src('assets/aman.css'), /html:not\(\[data-session="in"\]\) \[data-private\] \{ display: none !important; \}\nhtml\[data-session="in"\] \[data-private-cta\] \{ display: none !important; \}/);
  assert.match(src('assets/invite-early.js'), /document\.documentElement\.setAttribute\('data-session', ok \? 'in' : 'out'\)/);
  assert.match(src('assets/invite.mjs'), /function dropPrivate\(\) \{ const a = AUTH\.get\(\); if \(a && AUTH\.valid\(\)\) return; if \(!document\.querySelectorAll\) return; document\.querySelectorAll\('\[data-private\]'\)\.forEach\(\(el\) => \{ if \(el\.parentNode\) el\.parentNode\.removeChild\(el\); \}\); \}\nfunction accessReady\(\) \{ dropPrivate\(\); renderAccess\(\); gateLinks\(\); \}/, 'signed out, every private fragment leaves the document');
  for (const f of ['journeys.html', 'experience.html', 'tea.html', '1872.html', 'experiences.html', 'voyage.html']) assert.match(src(f), /<script src="assets\/invite-early\.js(?:\?v=[0-9a-f]{8})?"><\/script>/, f + ' decides before the first paint');
  /* the other public pages with a private fragment: the price and the add are private, the way in stands there */
  assert.match(src('experience.html'), /<p class="price" data-private>USD ' \+ x\.select\.price/); assert.match(src('experience.html'), /<div data-private><span class="k">Price<\/span>/); assert.match(src('experience.html'), /<div id="selbox" data-private><\/div>/); assert.match(src('experience.html'), /if \(document\.documentElement\.getAttribute\('data-session'\) !== 'in'\) \{ box\.innerHTML = ''; return; \}/);
  assert.match(src('tea.html'), /<p class="price" data-private>USD 180<\/p>/); assert.match(src('tea.html'), /<button class="cta" id="add" data-private>Add to My Bag<\/button>\n<a class="cta" data-private-cta href="invitation\.html\?open=1">Open your invitation<\/a>/);
  assert.match(src('1872.html'), /<p class="price" data-private>USD 180<\/p><p class="per" data-private>For two guests<\/p>/);
  assert.match(src('experiences.html'), /Guest Relations<span data-private>, the Erlebnis menu from USD 234 per person<\/span>/, 'the Highlight\'s amounts are private (20 Sep 2026)');
  assert.match(src('voyage.html'), /Optional<span data-private> · USD 15 per guest<\/span>/); assert.equal((src('voyage.html').match(/data-cta-swap href="journeys\.html#j-wedstay"/g) || []).length, 2);
  assert.equal((src('accommodation.html').match(/<a class="a-more" data-cta-swap href="room\.html\?stay=/g) || []).length, 5);   /* the Penthouse, U Sathorn, Shama, the residence (16 Sep 2026), the Riverside Hotel (release 012) */
  for (const f of ['index.html', 'destination.html', 'accommodation.html', 'marsilea.html', 'dress.html']) assert.doesNotMatch(src(f), /USD \d/, f + ' carries no amount');
  assert.match(src('assets/aman.js'), /\['The Journey', 'journeys\.html', \[/); assert.match(src('assets/recon.js'), /<a href="journeys\.html">The Journey<\/a>/); assert.match(src('assets/shop-menu.js'), /<a href="journeys\.html">The Journey<\/a>/);
  assert.match(src('assets/prep-shell.js'), /if \(!\/\^invitation\(\\\.html\)\?\$\/\.test\(location\.pathname\.split\('\/'\)\.pop\(\)\)\) \{\s*var toGate = function \(\) \{ if \(window\.SIYL_INVITE && SIYL_INVITE\.require\) SIYL_INVITE\.require\(function \(\) \{\}\); \};/, 'the private shell hands over');
  for (const f of ['accommodation.html', 'destination.html', 'experiences.html', 'index.html', 'voyage.html']) {
    assert.match(src(f), /<a class="a-cta" data-cta-in="Open My Trip" data-href-in="your-journey\.html" href="invitation\.html">Open your invitation<\/a>/, f + ' close CTA: Open your invitation signed out, Open My Trip signed in');
    assert.doesNotMatch(src(f), /<a class="a-cta" href="journeys\.html">Plan your journey<\/a>/, f);
  }
  for (const f of ['index.html', 'destination.html', 'journeys.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html', 'marsilea.html', '1872.html', 'tea.html', 'transport.html', 'room.html', 'dress.html', 'invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html']) assert.match(src(f), /assets\/invite\.mjs/, f + ' loads the gate');
  /* ONE CLEAN HEADER (Owner, 18 Sep 2026 · Aman): menu · wordmark · bag and nothing beneath. No page carries an access
     row; the account block is the first child of the menu drawer (assets/aman.js builds it, assets/invite.mjs fills it);
     recon.js builds the same three-part header; the stand-in has the measured height of the one band */
  for (const f of ['1872.html', 'about-you.html', 'cart.html', 'dress.html', 'invitation.html', 'marsilea.html', 'review.html', 'journeys.html', 'tickets.html', 'tea.html', 'transport.html', 'wedding.html', 'wedding-preparation.html', 'room.html', 'your-journey.html', 'profile.html', 'index.html', 'destination.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html']) {
    const h = src(f); assert.doesNotMatch(h, /hd-access|data-access(?!-nav|-out)/, f + ' carries no access row'); assert.doesNotMatch(h, /MY TRIP · MY PROFILE|My Trip · My Profile/, f + ' has no sticky account row');
  }
  for (const f of ['1872.html', 'about-you.html', 'cart.html', 'dress.html', 'invitation.html', 'marsilea.html', 'review.html', 'journeys.html', 'tickets.html', 'tea.html', 'transport.html', 'wedding.html', 'wedding-preparation.html', 'room.html', 'your-journey.html', 'profile.html']) {
    const h = src(f); const head = h.slice(h.indexOf('<header class="hd">'), h.indexOf('</header>'));
    assert.ok(head.length > 0, f + ' has the static header'); assert.match(head, /^<header class="hd"><button class="hb" aria-label="Menu">/, f + ' menu left'); assert.match(head, /<div class="bd">see you in laos<span class="dot">\.<\/span><\/div>/, f + ' wordmark centre'); assert.match(head, /<a class="bag" href="cart\.html" aria-label="My Bag"(?: aria-current="page")?>[\s\S]*<span class="bb" data-bag-badge><\/span><\/a>$/, f + ' bag right, last');
  }
  assert.match(src('assets/aman.js'), /<div class="a-macct" data-account data-state="out"><span class="a-macct-who">Not signed in<\/span><nav class="a-macct-nav" aria-label="Your account"><a href="invitation\.html\?open=1" data-access-nav="in">Open your invitation<\/a><\/nav><\/div>/, 'the drawer opens with the account block');
  assert.match(src('assets/invite.mjs'), /data-access-nav="trip">My Trip<\/a><a href="' \+ hrefOf\('profile\.html'\) \+ '" data-access-nav="profile">My Profile<\/a><button type="button" class="a-macct-out" data-access-out>Sign out<\/button>/, 'signed in: My Trip · My Profile · Sign out in the drawer');
  assert.match(src('assets/recon.js'), /ONE CLEAN HEADER[^\n]*\n\s*var space = document\.querySelector\('\.hd-space'\);\s*document\.body\.prepend\(header\);\s*if \(space\) space\.remove\(\);/, 'recon.js swaps the stand-in for the header — no access line');
  assert.doesNotMatch(src('assets/recon.js'), /data-access|hd-access/, 'recon.js builds no access row');
  assert.match(src('assets/recon.css'), /\.hd-space \{ height: 57px; \}\n@media \(min-width: 768px\) \{ \.hd-space \{ height: 57px; \} \}\n@media \(min-width: 1024px\) \{ \.hd-space \{ height: 61px; \} \}/, 'the stand-in has the measured height of the one band');
  for (const f of ['index.html', 'destination.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html']) assert.match(src(f), /<body>\n<div class="hd-space" aria-hidden="true"><\/div>/, f + ' opens with the stand-in');
  assert.doesNotMatch(src('assets/aman.css'), /\.hd-access/, 'no access-row rules remain');
  assert.match(src('assets/aman.css'), /\.a-macct-nav \{ display: flex;/, 'the drawer account navigation has its rules in the shared stylesheet');
  assert.doesNotMatch(src('assets/invite.mjs'), /\n\.hd-access \{/, 'the module injects no status rules');
});

test('EDIT 3 · Harudot is a café; the dress references share one 3:4 card, covered from the top, never stretched', () => {
  /* release 014 (the current Operations Master, 19 Sep 2026): Harudot is the café of 23.02 AND the experience of 07.03 */
  assert.match(src('assets/experiences.js'), /\{ id: 'bkk-harudot', roles: \['cafe', 'experience'\]/);
  assert.match(src('src/experience-inventory.json'), /"id": "bkk-harudot",\n  "name": "Harudot",\n  "city": "Bangkok",\n  "roles": \[\n   "cafe",\n   "experience"\n  \]/);
  const css = src('assets/prep.css');
  assert.match(css, /\.p-rail > img \{ display: block; flex: 0 0 72%; width: 72%; max-width: 300px; height: auto; aspect-ratio: 3 \/ 4; object-fit: cover; object-position: 50% 12%;/);
  assert.doesNotMatch(css, /\.p-rail > img \{[^}]*object-fit: contain/);
});
