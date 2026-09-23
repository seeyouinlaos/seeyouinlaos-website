/* ============================================================================
   ACCOUNT IA (Owner correction, 18 Sep 2026) — MY PROFILE is an account
   dashboard outside the gated flow; ABOUT YOU is step 05; the sticky account
   row reads MY TRIP · MY PROFILE · SIGN OUT and the bag icon is My Bag.
   The nine regression checks the Owner named, plus the profile photo route.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, plain, doState, roomsFetch, PEGGY, STEFFIE, HARUTHAI } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';

const profile = src('profile.html'), shell = src('assets/prep-shell.js'), guest = src('assets/guest.js'), inv = src('assets/invite.mjs'), bag = src('assets/bag.js'), worker = src('src/worker.js'), avatar = src('assets/avatar.js');
const PRIVATE_PAGES = ['profile.html', 'your-journey.html', 'cart.html', 'tickets.html', 'about-you.html', 'review.html', 'wedding.html', 'wedding-preparation.html', 'invitation.html', 'room.html', 'transport.html'];

test('1 · MY PROFILE is exempt from step gating: profile.html never mounts the step shell, is no step, and cannot redirect to a missing item', () => {
  assert.doesNotMatch(profile, /assets\/prep-shell\.js/, 'the step shell (and its gate) is not on the page');
  assert.doesNotMatch(profile, /data-step=/, 'the page claims no step');
  assert.match(profile, /<main class="prep-page" id="profile">/); assert.match(profile, /<h1 class="t-d1">My Profile<\/h1>/);
  assert.doesNotMatch(profile, /location\.replace\([^)]*(about-you|your-journey|invitation\.html\?open=1&next)/, 'no redirect of its own into the flow');
  const steps = [...shell.matchAll(/\{ n: '(\d\d)', key: '([a-z]+)',\s*label: '([^']+)',\s*file: '([^']+)' \}/g)].map((m) => m.slice(1));
  assert.equal(steps.length, 6); assert.ok(!steps.some((s) => s[3] === 'profile.html' || s[1] === 'profile'), 'profile.html is not a step');
  assert.doesNotMatch(guest, /profile\.html/, 'the readiness engine never names the profile');
  /* the shell resolves its step by file and leaves any other page alone — a page that is no step gets no gate */
  assert.match(shell, /var idx = STEPS\.map\(function \(s\) \{ return s\.file\.replace\(\/\\\.html\$\/, ''\); \}\)\.indexOf\(here\);\s*if \(idx < 0\) return;/);
});

test('2 · the profile is reachable at every readiness state: the engine lists no profile requirement whether nothing, some or everything is complete', () => {
  const states = [];
  for (const fill of [0, 1, 2]) {
    const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
    if (fill >= 1) { G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes')); T.setFinale(id, 'pool'); }
    if (fill >= 2) { G.setDressAck(true); G.setAllergy('no'); G.setPhotoAck(true); G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered')); }
    const r = G.readiness();
    assert.ok(!r.need.some((n) => /profile/.test(n.href) || /My Profile/.test(n.stepLabel)), 'no requirement points at the profile');
    assert.ok(!G.steps().some((s) => s.key === 'profile'), 'the profile is not in the step list');
    states.push(r.need.length);
  }
  assert.ok(states[0] > states[1] && states[1] > states[2], 'the states differ (' + states.join(' > ') + '); the profile is outside all of them');
});

test('3 · the bag icon IS My Bag: on every private page the header icon opens cart.html and carries the badge', () => {
  for (const f of PRIVATE_PAGES) { const s = src(f); assert.match(s, /<a class="bag" href="cart\.html" aria-label="My Bag"/, f); assert.match(s, /data-bag-badge/, f + ' badge'); }
  assert.match(bag, /badge:function\(\)\{var n=authed\(\)\?this\.get\(\)\.length:0,el=document\.querySelector\('\[data-bag-badge\]'\);/);
});

test('4 · the account navigation reads MY TRIP · MY PROFILE · SIGN OUT, inside the menu drawer (Owner, 18 Sep 2026 · Aman header: nothing beneath the logo)', () => {
  assert.match(inv, /data-access-nav="trip">My Trip<\/a><a href="' \+ hrefOf\('profile\.html'\) \+ '" data-access-nav="profile">My Profile<\/a>' \+ \(window\.SIYL_DRAFT \? '<button type="button" class="a-macct-save" data-access-save>Save my progress<\/button>' : ''\) \+ '<button type="button" class="a-macct-out" data-access-out>Sign out<\/button>/);
  assert.match(inv, /let el = inMenu \|\| document\.querySelector\('\[data-account\]'\);/, 'the block lives in the drawer'); assert.doesNotMatch(inv, /insertAdjacentElement\('afterend'/, 'nothing is inserted under the header');
  assert.match(inv, /\(your-journey\|cart\|tickets\|room\|transport\|wedding\|wedding-preparation\|about-you\|profile\|review\)/, 'profile.html is a private surface: signed out it leads to the invitation');
});

test('5 · no textual MY BAG in the account block or the bottom bar navigation', () => {
  assert.doesNotMatch(inv, /data-access-nav="bag"/);
  assert.doesNotMatch(bag, /data-nav="bag"|data-nav="trip"|data-nav="profile"/, 'the bottom layer is the Bag summary and Top only');
  assert.match(bag, /<span class="jb-l">My Bag<\/span>/, 'the Bag summary keeps its total and Open My Bag');
});

test('6 · ABOUT YOU stays step 05 and still gates Review & Send', () => {
  assert.match(shell, /\{ n: '05', key: 'about',\s+label: 'About You',\s+file: 'about-you\.html' \}/);
  assert.match(guest, /\{ key: 'about', n: '05', label: 'About You', href: 'about-you\.html', required: true \}/);
  assert.match(src('about-you.html'), /<title>About You · See You In Laos<\/title>/); assert.match(src('about-you.html'), /<h1 class="t-d1">About You<\/h1>/); assert.match(src('about-you.html'), /05 \/ 06 · About You/);
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes')); T.setFinale(id, 'pool'); G.setDressAck(true);
  assert.equal(G.mayEnter('review'), false, 'About You incomplete: Review & Send is locked');
  assert.ok(G.readiness().need.some((n) => n.stepLabel === 'About You' && n.n === '05'), 'the missing items name step 05 · About You');
  assert.ok(G.missingFor('about').length > 0);
  G.setAllergy('no'); G.setPhotoAck(true); G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered'));
  assert.equal(G.missingFor('about').length, 0); assert.ok(!G.readiness().need.some((n) => n.stepLabel === 'About You'));
  for (const f of ['assets/prep-shell.js', 'assets/guest.js', 'about-you.html', 'assets/aman.js', 'register/logic.mjs']) assert.doesNotMatch(src(f).replace(/profile\.html">My Profile/g, ''), /(label|h1[^>]*>|under) ?'?My Profile/, f + ' no longer calls the step My Profile');
});

test('7 · MY PROFILE never affects readiness: it writes nothing the engine reads and lists nothing as required', () => {
  assert.doesNotMatch(profile, /G\.set(Allergy|PhotoAck|DressAck|Profile)\(|T\.set(Attendance|Event|Offering)\(|B\.(add|put|remove|set|qty)\(|D\.send\(|localStorage\.setItem/, 'the dashboard reads; it changes nothing the steps own');
  /* THE GUEST'S OWN NAME (Owner, 21 Sep 2026): the one thing the profile writes — First Name · Last Name through the contact record, never a readiness input */
  assert.deepEqual([...profile.matchAll(/data-c="([a-zA-Z]+)"/g)].map((m) => m[1]), ['firstName', 'lastName'], 'the profile edits the name and nothing else');
  assert.match(profile, /G\.readiness\(\)/, 'it reads the one engine for the trip status');
  assert.match(profile, /href="about-you\.html">Edit About You<\/a>/, 'About You is edited on its own step');
  assert.match(avatar, /localStorage\.getItem\('siyl\.auth'\)/); assert.doesNotMatch(avatar, /localStorage\.setItem/, 'the photo is never written to the browser store');
});

/* ---- the dashboard, rendered: profile.html's own script run in the sandbox against a #page element the test reads. The
 * rooms engine (src/rooms.js) answers as the server would for this guest; every other network read fails open ---- */
const ID = (g) => ({ invitationId: g.invitationId, guestId: g.guestId, partyId: g.partyId, hosts: !!g.hosts });
async function dashboard(rooms, who, setup) {
  const rf = await roomsFetch(rooms, ID(who));
  const w = page({ auth: who, path: 'profile.html', fetch: (url, init) => (/\/api\/rooms/.test(String(url)) ? rf(url, init) : Promise.reject(new Error('no network in tests'))) });
  const el = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] }, own = { textContent: '' };
  w.document.getElementById = (id) => (id === 'page' ? el : id === 'pf-own' ? own : null);
  w.SIYL_BAG.bar = null;                                                                            /* the sticky Bag summary wants a real DOM; it is not the overview */
  await w.SIYL_UNITS.load(true);
  if (setup) await setup(w);
  const vm = await import('node:vm');
  vm.runInContext(profile.slice(profile.lastIndexOf('<script>') + 8, profile.lastIndexOf('</script>')), w, { filename: 'profile.html' });
  await w.SIYL_UNITS.load(true);                                                                     /* the engine read the page waits for: siyl:units renders again */
  return { w, el, own };
}

test('8 · the overview reflects selections, holds and the waiting list — nothing is arranged for anyone, the Bag is read and never totalled here (Owner, 19 Sep 2026)', async () => {
  /* the source: no arranged renderer, no fixed-arrangement card; the waiting list and the held place are the engine's answer for this guest */
  const code = profile.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(code, /SIYL_ARRANGED|arranged\.js|A&&A\.ready\(\)|Arranged for you|Fixed arrangement|not part of your bag/, 'the deleted concept is gone from the dashboard');
  assert.match(profile, /lines=J\.sorted\(B\.get\(\)\)/, 'the selections are the bag lines, read only');
  assert.match(profile, /if\(!J\.relevant\(seg\)\|\|J\.state\(seg\)!=='waitlisted'\)return;var w=U\.waitlisted\(seg\.key\)/, 'a waiting-list card per waitlisted stage of the guest\'s own trip, from the engine');
  assert.match(profile, /data:'waitlist:'\+seg\.key/); assert.match(profile, /'Waiting list · number '\+\(w&&w\.position\|\|'\?'\)/); assert.match(profile, /state:'On the waiting list'/);
  assert.match(profile, /ST\.held\(x\)/); assert.match(profile, /'Your place is held'\+\(w\?' · '\+w:''\)/, 'a held room says so in the contract words');
  assert.match(profile, /S\.seatOf\(ev,id\)/); assert.match(profile, /'Seat '\+S\.label\(sid\)\+' · Held in your name'/);
  assert.match(profile, /'Selected · in My Bag'/); assert.match(profile, /'Sent to Guest Relations'/); assert.match(profile, /'Confirmed by Guest Relations'/);
  assert.match(profile, /data-profile-ticket="seat:'\+ev\+'"/); assert.match(profile, /data-profile-ticket="pass:'\+esc\(l\)\+'"/);
  assert.doesNotMatch(profile, /B\.total\(\)/, 'no total of its own — My Bag is the one cart');
  const words = profile.slice(profile.indexOf('<script>'));
  for (const bad of ['engine', 'ledger', 'payload', 'registration', 'fingerprint', 'invitationId', 'ISO', 'KV']) assert.ok(!new RegExp("'[^']*\\b" + bad + "\\b[^']*'").test(words.replace(/\/\*[\s\S]*?\*\//g, '')), 'no system word in a guest string: ' + bad);

  /* the page, rendered: Peggy (a party of two) holds a Heritage room for the wedding stay and waits for Kunming */
  const rooms = new Rooms(doState()); let held = null;
  const p = await dashboard(rooms, PEGGY, async (w) => {
    held = await w.SIYL_STAY.select('wedstay', 'heritage', null, 2); assert.equal(held.ok, true); assert.ok(held.unit, 'a unit that takes the party of two');
    assert.equal((await w.SIYL_UNITS.wait('kmg', 2, ['kmg/italian'])).ok, true);
  });
  const J = p.w.SIYL_JOURNEY, B = p.w.SIYL_BAG, seg = (k) => J.SEGMENTS.find((s) => s.key === k), html = p.el.innerHTML;
  assert.equal(J.state(seg('wedstay')), 'selected'); assert.equal(J.state(seg('kmg')), 'waitlisted'); assert.equal(J.waitPosition(seg('kmg')), 1);
  const cards = html.match(/<article class="pf-card[^"]*" data-profile-item="[^"]+">[\s\S]*?<\/article>/g) || [];
  const item = (d) => cards.find((c) => c.includes('data-profile-item="' + d + '"'));
  const wl = item('waitlist:kmg'); assert.ok(wl, 'the waiting-list card of the one waitlisted stage');
  assert.match(wl, /Wanxiang Yueju/); assert.match(wl, /Waiting list · number 1 for 2 places/); assert.match(wl, /On the waiting list/); assert.match(wl, /href="your-journey\.html#s-kmg"/);
  assert.doesNotMatch(wl, /USD|pf-cost/, 'a waiting-list stage carries no amount');
  const st = item('line:wedstay'); assert.ok(st, 'the held stay is a card of the Stays rail');
  assert.match(st, new RegExp('Your place is held · Room ' + held.unit + ' · You'), 'the held place in the contract words, the unit the engine gave');
  assert.match(st, /USD [\d,]+ · your cost/);
  assert.equal(cards.filter((c) => /data-profile-item="waitlist:/.test(c)).length, 1, 'one waiting-list card — the one stage');
  assert.equal(cards.filter((c) => /data-profile-item="line:/.test(c)).length, B.get().length, 'a card per Bag line and no other arrangement');
  assert.doesNotMatch(html, /Arranged for you|Fixed arrangement|not part of your bag/);
  assert.equal(B.get().length, 1, 'the Bag carries the one actual selection: a waiting-list stage adds no line');
  const c = J.counts(); assert.equal(c.confirmed, 1); assert.equal(c.waitlisted, 1); assert.equal(c.bagItems, 1); assert.equal(c.bagTotal, B.total()); assert.ok(B.total() > 0);
  assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open);
  /* the hosts start at zero like every guest: no room, no arrangement, nothing in the Bag */
  const h = await dashboard(rooms, HARUTHAI);
  assert.deepEqual(plain(h.w.SIYL_UNITS.view().mine), {}); assert.deepEqual(plain(h.w.SIYL_UNITS.view().waitlist), {});
  assert.match(h.el.innerHTML, /No stay is chosen yet\. Rooms are chosen in My Trip\./);
  assert.doesNotMatch(h.el.innerHTML, /data-profile-item="(line|waitlist):/);
  assert.equal(h.w.SIYL_BAG.get().length, 0); assert.equal(h.w.SIYL_BAG.total(), 0);
  /* the Sathorn Penthouse is deleted (Owner, 24 Sep 2026 · Edit 6): Bangkok is U Sathorn and Shama */
  const HU = h.w.SIYL_UNITS.view().units; assert.equal(HU['bkk-stay/penthouse'], undefined, 'no Penthouse units');
  for (const k of ['bkk-stay/u-sathorn-superior-garden', 'bkk-stay/shama-king-studio-balcony']) assert.ok(HU[k].length > 0 && HU[k].every((u) => u.reservedFor === null && u.taken === 0), k + ': no room is anyone\'s before a booking');
});

test('9 · Sign out is visible and functional: the header control leaves the session and returns to the invitation; the dashboard offers it too', () => {
  assert.match(inv, /const out = el\.querySelector\('\[data-access-out\]'\); if \(out\) out\.addEventListener\('click', \(\) => \{ GUEST\.leave\(\); LOC\.replace\(hrefOf\('invitation\.html'\)\); \}\);/);
  assert.match(profile, /data-signout>Sign out<\/button>/); assert.match(profile, /var I=window\.SIYL_INVITE;if\(I&&I\.leave\)I\.leave\(\);/);
});

/* ---- the profile photo: the guest's own bearer, a small image, no public URL ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function kv() { const m = new Map(); return { m, get: async (k, o) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async () => ({ keys: [...m.keys()].map((name) => ({ name })) }) }; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-sam-photo'), other = await bearerOf('demo-other-photo');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' }; entries[await authIdOf(other)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' };
  const index = JSON.stringify({ v: 2, entries });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }, REG_KV: kv() };
  const photo = (bearer, method, bytes, type) => new Request(ORIGIN + '/api/profile/photo', { method, headers: Object.assign({}, bearer ? { 'x-siyl-auth': bearer } : {}, type ? { 'content-type': type } : {}), body: bytes });
  return { w, env, sam, other, photo };
}
test('PHOTO · stored and read only with the guest\'s own bearer; JPEG · PNG · WebP up to 1 MB; removed on request; never listed or public', async () => {
  const h = await harness(); const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4]);
  assert.equal((await h.w.fetch(h.photo(null, 'GET'), h.env)).status, 401, 'no bearer, no photo');
  assert.equal((await h.w.fetch(h.photo(h.sam, 'GET'), h.env)).status, 404, 'nothing stored yet');
  assert.equal((await h.w.fetch(h.photo(h.sam, 'PUT', bytes, 'image/gif'), h.env)).status, 415);
  assert.equal((await h.w.fetch(h.photo(h.sam, 'PUT', new Uint8Array(1024 * 1024 + 1), 'image/jpeg'), h.env)).status, 413);
  const put = await h.w.fetch(h.photo(h.sam, 'PUT', bytes, 'image/jpeg'), h.env); const pj = await put.json();
  assert.equal(put.status, 200); assert.equal(pj.ok, true); assert.equal(pj.bytes, 8);
  assert.ok(h.env.REG_KV.m.has('avatar:INV-G777'), 'kept under the invitation'); assert.equal(h.env.REG_KV.m.get('avatar:INV-G777').meta.guestId, 'G777');
  const got = await h.w.fetch(h.photo(h.sam, 'GET'), h.env);
  assert.equal(got.status, 200); assert.equal(got.headers.get('content-type'), 'image/jpeg'); assert.equal(got.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual([...new Uint8Array(await got.arrayBuffer())], [...bytes]);
  assert.equal((await h.w.fetch(h.photo(h.other, 'GET'), h.env)).status, 404, 'another guest never sees it');
  assert.equal((await h.w.fetch(h.photo(h.sam, 'DELETE'), h.env)).status, 200);
  assert.equal((await h.w.fetch(h.photo(h.sam, 'GET'), h.env)).status, 404, 'removed');
  assert.doesNotMatch(worker, /avatar:.*list\(|prefix: 'avatar/, 'no listing of photos');
  assert.match(worker, /const MAX_PHOTO = 1024 \* 1024;/); assert.match(worker, /const PHOTO_TYPES = \['image\/jpeg', 'image\/png', 'image\/webp'\];/);
  assert.match(avatar, /c\.toBlob\(function \(blob\) \{[\s\S]*?\}, 'image\/jpeg', 0\.86\)/, 'the browser reduces the picture before it is sent');
  assert.match(avatar, /var SIDE = 512, MAX_IN = 12 \* 1024 \* 1024, MAX_OUT = 1024 \* 1024;/);
});

test('CODEX CONFIRM-2 · a delayed photo read after an account switch never populates the second guest\'s cache; an upload chosen by the first guest is not sent once the session moved; sign-out forgets the picture', async () => {
  const opened = []; const w = page({ auth: PEGGY, fetch: null, modules: [] });
  w.URL = { createObjectURL: (b) => { const u = 'blob:' + (b.tag || 'x'); opened.push(u); return u; }, revokeObjectURL: () => {} };
  let resolveA; const gets = [];
  w.fetch = (url, init) => { gets.push({ bearer: init && init.headers && init.headers['x-siyl-auth'], method: (init && init.method) || 'GET' }); if (gets.length === 1) return new Promise((res) => { resolveA = res; }); return Promise.resolve({ status: 404, ok: false }); };
  const vm = await import('node:vm'); vm.runInContext(src('assets/avatar.js'), w, { filename: 'assets/avatar.js' });
  const AV = w.SIYL_AVATAR;
  const pA = AV.load();                                                                            /* Peggy's read leaves, delayed */
  w.document.dispatchEvent(new w.CustomEvent('siyl:signout')); w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE)); w.document.dispatchEvent(new w.CustomEvent('siyl:auth'));
  const uB = await AV.load();                                                                       /* Steffie's read: no photo */
  assert.equal(uB, null); assert.equal(gets[1].bearer, STEFFIE.bearer);
  resolveA({ status: 200, ok: true, blob: async () => ({ tag: 'peggy' }) });                        /* Peggy's picture arrives late */
  assert.equal(await pA, null, 'the late picture is not returned to the session that is here now');
  assert.equal(await AV.load(), null, 'Steffie\'s cache holds no photo'); assert.equal(AV.current(), null); assert.equal(opened.length, 0, 'the late bytes were never turned into a picture');
  /* an upload chosen as Peggy, reduced while the session moves to Steffie: nothing is sent */
  const w3 = page({ auth: PEGGY, fetch: () => { throw new Error('must not upload'); }, modules: [] }); w3.URL = w.URL;
  w3.Image = class { set src(v) { const self = this; w3.setTimeout(() => { self.naturalWidth = 8; self.naturalHeight = 8; w3.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE)); self.onload(); }); } };
  w3.document.createElement = () => ({ getContext: () => ({ drawImage() {} }), toBlob: (cb) => cb({ size: 10, tag: 'p' }) });
  vm.runInContext(src('assets/avatar.js'), w3, { filename: 'assets/avatar.js' });
  const up = await w3.SIYL_AVATAR.upload({ size: 100, type: 'image/png' });
  assert.equal(up.ok, false); assert.equal(up.error, 'session changed', 'the picture chosen as Peggy is not sent as Steffie');
  assert.match(src('assets/avatar.js'), /if \(!same\(s\)\) return null;\s*\/\* the session moved on/); assert.match(src('assets/avatar.js'), /document\.addEventListener\('siyl:signout', moved\); document\.addEventListener\('siyl:auth', moved\);/);
});
