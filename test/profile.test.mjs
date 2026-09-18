/* ============================================================================
   ACCOUNT IA (Owner correction, 18 Sep 2026) — MY PROFILE is an account
   dashboard outside the gated flow; ABOUT YOU is step 05; the sticky account
   row reads MY TRIP · MY PROFILE · SIGN OUT and the bag icon is My Bag.
   The nine regression checks the Owner named, plus the profile photo route.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, PEGGY, HARUTHAI } from './sandbox.mjs';

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
    if (fill >= 1) { G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes')); }
    if (fill >= 2) { G.setDressAck(true); G.setAllergy('no'); G.setPhotoAck(true); G.PROFILE.forEach((q) => G.setProfile(id, q.key, 'Answered')); }
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

test('4 · the sticky account row reads MY TRIP · MY PROFILE · SIGN OUT, inside the sticky header', () => {
  assert.match(inv, /data-access-nav="trip">My Trip<\/a><a href="' \+ hrefOf\('profile\.html'\) \+ '" data-access-nav="profile">My Profile<\/a><button type="button" class="hd-access-out" data-access-out>Sign out<\/button>/);
  assert.match(inv, /if \(el\.parentElement !== header\)/, 'the row lives inside header.hd');
  assert.match(inv, /\(your-journey\|cart\|tickets\|room\|transport\|wedding\|wedding-preparation\|about-you\|profile\|review\)/, 'profile.html is a private surface: signed out it leads to the invitation');
});

test('5 · no textual MY BAG on the account row or the bottom bar navigation', () => {
  assert.doesNotMatch(inv, /data-access-nav="bag"/);
  assert.doesNotMatch(bag, /data-nav="bag"|data-nav="trip"|data-nav="profile"/, 'the bottom layer is the Bag summary and Top only');
  assert.match(bag, /<span class="jb-l">My Bag<\/span>/, 'the Bag summary keeps its total and Open My Bag');
});

test('6 · ABOUT YOU stays step 05 and still gates Review & Send', () => {
  assert.match(shell, /\{ n: '05', key: 'about',\s+label: 'About You',\s+file: 'about-you\.html' \}/);
  assert.match(guest, /\{ key: 'about', n: '05', label: 'About You', href: 'about-you\.html', required: true \}/);
  assert.match(src('about-you.html'), /<title>About You · See You In Laos<\/title>/); assert.match(src('about-you.html'), /<h1 class="t-d1">About You<\/h1>/); assert.match(src('about-you.html'), /05 \/ 06 · About You/);
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes')); G.setDressAck(true);
  assert.equal(G.mayEnter('review'), false, 'About You incomplete: Review & Send is locked');
  assert.ok(G.readiness().need.some((n) => n.stepLabel === 'About You' && n.n === '05'), 'the missing items name step 05 · About You');
  assert.ok(G.missingFor('about').length > 0);
  G.setAllergy('no'); G.setPhotoAck(true); G.PROFILE.forEach((q) => G.setProfile(id, q.key, 'Answered'));
  assert.equal(G.missingFor('about').length, 0); assert.ok(!G.readiness().need.some((n) => n.stepLabel === 'About You'));
  for (const f of ['assets/prep-shell.js', 'assets/guest.js', 'about-you.html', 'assets/aman.js', 'register/logic.mjs']) assert.doesNotMatch(src(f).replace(/profile\.html">My Profile/g, ''), /(label|h1[^>]*>|under) ?'?My Profile/, f + ' no longer calls the step My Profile');
});

test('7 · MY PROFILE never affects readiness: it writes nothing the engine reads and lists nothing as required', () => {
  assert.doesNotMatch(profile, /G\.set(Contact|Allergy|PhotoAck|DressAck|Profile)\(|T\.set(Attendance|Event|Offering)\(|B\.(add|put|remove|set|qty)\(|D\.send\(|localStorage\.setItem/, 'the dashboard reads; it changes nothing the steps own');
  assert.match(profile, /G\.readiness\(\)/, 'it reads the one engine for the trip status');
  assert.match(profile, /href="about-you\.html">Edit About You<\/a>/, 'About You is edited on its own step');
  assert.match(avatar, /localStorage\.getItem\('siyl\.auth'\)/); assert.doesNotMatch(avatar, /localStorage\.setItem/, 'the photo is never written to the browser store');
});

test('8 · the overview reflects selections and holds without duplicating a fixed arrangement into the Bag', () => {
  assert.match(profile, /\(A&&A\.ready\(\)\?A\.items\(\):\[\]\)\.forEach/, 'fixed arrangements come from the one arranged renderer');
  assert.match(profile, /note:'Fixed arrangement · not part of your bag'/); assert.match(profile, /state:'Arranged for you'/);
  assert.match(profile, /lines=J\.sorted\(B\.get\(\)\)/, 'the selections are the bag lines, read only');
  assert.match(profile, /ST\.held\(x\)/); assert.match(profile, /'Your place is held'\+\(w\?' · '\+w:''\)/, 'a held room says so in the contract words');
  assert.match(profile, /S\.seatOf\(ev,id\)/); assert.match(profile, /'Seat '\+S\.label\(sid\)\+' · Held in your name'/);
  assert.match(profile, /'Selected · in My Bag'/); assert.match(profile, /'Sent to Guest Relations'/); assert.match(profile, /'Confirmed by Guest Relations'/);
  assert.match(profile, /data-profile-ticket="seat:'\+ev\+'"/); assert.match(profile, /data-profile-ticket="pass:'\+esc\(l\)\+'"/);
  assert.doesNotMatch(profile, /B\.total\(\)/, 'no total of its own — My Bag is the one cart');
  const words = profile.slice(profile.indexOf('<script>'));
  for (const bad of ['engine', 'ledger', 'payload', 'registration', 'fingerprint', 'invitationId', 'ISO', 'KV']) assert.ok(!new RegExp("'[^']*\\b" + bad + "\\b[^']*'").test(words.replace(/\/\*[\s\S]*?\*\//g, '')), 'no system word in a guest string: ' + bad);
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
