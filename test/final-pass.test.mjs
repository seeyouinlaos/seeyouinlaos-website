/* THE FINAL BOOKING-UX PASS (Owner, 20 Sep 2026):
   · THE BOOKING CONTEXT (assets/wizard.js): a Journey page opened from 02 / 06 · My Trip is a sub-view of that step — the
     context travels in the URL (?ctx=trip&stage=<key>), never in a store; the way back reads RETURN TO MY TRIP; a selection
     returns the guest to My Trip by itself, to the stage they came from; the global Journey page is untouched.
   · WHO SITS WHERE: the engine names the holder of a chair for an authenticated guest only; a guest may read another guest's
     portrait by its opaque id with their own bearer (401 without one); the rail beside the plan (initials where no photo).
   · CONFIRM SEAT is the primary action while a chair is chosen but unconfirmed; Continue steps back until it is confirmed.
   · The photography words, the acknowledgement; Coffee & Cake as its own complimentary wedding item on My Profile; the
     profile photo made obvious; Save my progress inside the account block; the dress-code reference galleries as the one
     carousel; the Highlight dress codes; the train ticket's breathing room at the shared component; the Snow Mountain frame
     labelled as the view. Nothing here decides a product, a price, a hold or a line. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, doState, PEGGY } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';

/* ---- a tiny DOM for assets/wizard.js: enough of document, location and storage to run the module as a page does ---- */
function wizardPage(path, search) {
  const listeners = {}; const nav = { href: null }; const sess = new Map(); const links = [];
  const el = (attrs) => { const a = { attrs: { ...attrs }, textContent: '', getAttribute: (k) => (a.attrs[k] === undefined ? null : a.attrs[k]), setAttribute: (k, v) => { a.attrs[k] = String(v); }, closest: (sel) => (a.attrs._in && sel.split(',').some((s) => a.attrs._in.includes(s.trim())) ? a : null), querySelectorAll: () => [] }; return a; };
  const sb = {
    console, URLSearchParams, encodeURIComponent,
    location: { pathname: '/' + path, search: search || '', hash: '', set href(v) { nav.href = v; }, get href() { return nav.href; } },
    sessionStorage: { setItem: (k, v) => sess.set(k, v), getItem: (k) => sess.get(k) || null },
    document: { readyState: 'complete', documentElement: el({}), currentScript: null, body: { appendChild() {} }, head: { appendChild() {} },
      addEventListener: (t, fn) => { (listeners[t] = listeners[t] || []).push(fn); },
      querySelector: (s) => (s === 'main' ? sb.main : null), querySelectorAll: () => links, createElement: () => ({ setAttribute() {}, onload: null }) },
    MutationObserver: class { observe() {} }, matchMedia: () => ({ matches: true }), setTimeout: (fn) => fn(), CustomEvent: class {},
    nav, links, el, main: el({}),
  };
  sb.window = sb; vm.createContext(sb); vm.runInContext(src('assets/wizard.js'), sb, { filename: 'assets/wizard.js' });
  sb.listeners = listeners; return sb;
}
const click = (sb, a) => { const e = { target: { closest: (sel) => (sel === 'a[href]' ? a : null) } }; (sb.listeners.click || []).forEach((fn) => fn(e)); return a.getAttribute('href'); };

test('THE BOOKING CONTEXT · explicit in the URL, never guessed: a sub-view wears the step shell, keeps the context on its own links, returns to the stage it came from; the plain Journey page is untouched', () => {
  const w = wizardPage('room.html', '?stay=sathorn&room=u-sathorn-superior-garden&ctx=trip&stage=bkk-stay');
  assert.equal(w.SIYL_WIZARD.active, true); assert.equal(w.SIYL_WIZARD.stage, 'bkk-stay'); assert.equal(w.SIYL_WIZARD.origin, false);
  assert.equal(w.document.documentElement.getAttribute('data-wizard'), 'trip', 'the page is marked');
  assert.equal(w.main.getAttribute('data-step'), 'journey', 'the step shell of 02 / 06 mounts on the sub-view');
  assert.equal(w.SIYL_WIZARD.href('room.html?stay=sathorn&room=penthouse'), 'room.html?stay=sathorn&room=penthouse&ctx=trip&stage=bkk-stay');
  assert.equal(w.SIYL_WIZARD.returnHref(), 'your-journey.html#s-bkk-stay'); assert.equal(w.SIYL_WIZARD.returnHref('wedstay'), 'your-journey.html#s-wedstay');
  /* a link between the Journey's own pages keeps the context; the menu, the footer and the shell never carry it */
  const a = w.el({ href: 'journeys.html#j-bkk-stay' }); assert.equal(click(w, a), 'journeys.html?ctx=trip&stage=bkk-stay#j-bkk-stay');
  const m = w.el({ href: 'journeys.html', _in: '.a-menu' }); assert.equal(click(w, m), 'journeys.html', 'the global menu leaves the context');
  const x = w.el({ href: 'experiences.html' }); assert.equal(click(w, x), 'experiences.html', 'a page that is no sub-view is left alone');
  /* the way back is decorated */
  w.links.push(w.el({ href: 'journeys.html#j-bkk-stay' })); w.SIYL_WIZARD.decorate();
  assert.equal(w.links[0].getAttribute('href'), 'your-journey.html#s-bkk-stay'); assert.equal(w.links[0].textContent, 'Return to My Trip'); assert.equal(w.links[0].getAttribute('data-wizard-back'), '1');
  /* done: back to My Trip, the stage named */
  assert.equal(w.SIYL_WIZARD.done(), true); assert.equal(w.nav.href, 'your-journey.html?done=bkk-stay#s-bkk-stay');
  assert.match(w.sessionStorage.getItem('siyl.wizard.done'), /"stage":"bkk-stay"/);
  w.SIYL_WIZARD.done('extras'); assert.equal(w.nav.href, 'your-journey.html?done=extras#extras');
  /* the same page from the global menu: the ordinary Journey page */
  const g = wizardPage('room.html', '?stay=sathorn&room=u-sathorn-superior-garden');
  assert.equal(g.SIYL_WIZARD.active, false); assert.equal(g.main.getAttribute('data-step'), null); assert.equal(g.document.documentElement.getAttribute('data-wizard'), null);
  assert.equal(g.SIYL_WIZARD.href('journeys.html'), 'journeys.html'); assert.equal(g.SIYL_WIZARD.done('bkk-stay'), false); assert.equal(g.nav.href, null, 'never navigates outside the context');
  const ga = g.el({ href: 'journeys.html' }); assert.equal(click(g, ga), 'journeys.html');
  /* a stage key is sanitised */
  assert.equal(wizardPage('room.html', '?ctx=trip&stage=<b>x').SIYL_WIZARD.stage, 'bx');
  /* the origin hands the context to the links it opens, with the stage of the card */
  const o = wizardPage('your-journey.html', ''); assert.equal(o.SIYL_WIZARD.origin, true); assert.equal(o.SIYL_WIZARD.active, false);
  const card = o.el({ id: 'x' }); card.id = 's-wedstay'; card.closest = () => card;
  const oa = o.el({ href: 'room.html?stay=souphattra&room=heritage' }); oa.closest = (sel) => (sel === '.p-stage[id^="s-"]' ? card : null);
  assert.equal(click(o, oa), 'room.html?stay=souphattra&room=heritage&ctx=trip&stage=wedstay');
  const ob = o.el({ href: 'journeys.html#j-guesthouse' }); ob.closest = () => null;
  assert.equal(click(o, ob), 'journeys.html?ctx=trip&stage=guesthouse#j-guesthouse', 'no card: the window of the anchor (the journey model, when loaded, maps it to its stage)');
});

test('THE SUB-VIEWS · room, journeys, transport, the Highlight and tea pages load the context and return through it after a selection; My Trip loads it after the journey model; the extras filter keeps the Highlight tables', () => {
  for (const f of ['room.html', 'journeys.html', 'transport.html', 'experience.html', 'tea.html', '1872.html', 'marsilea.html', 'your-journey.html']) assert.match(src(f), /<script src="assets\/wizard\.js/, f);
  const yj = src('your-journey.html'); assert.ok(yj.indexOf('assets/wizard.js') > yj.indexOf('assets/journey.js'), 'after the journey model');
  assert.match(src('room.html'), /function wizardDone\(w\)/); assert.match(src('room.html'), /SIYL_WIZARD\.href/);
  assert.match(src('journeys.html'), /if\(Wz&&Wz\.active\)\{Wz\.done\(Wz\.stageOfWindow\(win\)\);return\}/);
  assert.match(src('transport.html'), /Wz\.done\(Wz\.stageOfWindow\(id\)\)/);
  assert.match(src('assets/highlight.js'), /Continue My Trip/); assert.match(src('assets/highlight.js'), /Wz\.done\('extras'\)/); assert.match(src('tea.html'), /Wz\.done\('extras'\)/);
  assert.match(yj, /J\.order\(x\)===99\|\|x\.id==='1872'\|\|x\.request\|\|x\.exp/);
  const css = src('assets/prep.css'); assert.match(css, /\.p-wizard-note \{/); assert.match(css, /\.p-stage\.p-wizard-landed \{ animation: p-wizard-land/);
  /* the stage of a window: guesthouse and riverside belong to the wedding stay */
  const w = page({ auth: PEGGY }); const J = w.SIYL_JOURNEY;
  const seg = (k) => J.SEGMENTS.filter((s) => s.key === k || (s.ids || []).includes(k))[0];
  assert.equal(seg('guesthouse') && seg('guesthouse').key, 'wedstay'); assert.equal(seg('riverside') && seg('riverside').key, 'wedstay');
});

/* ---- the Worker with the seating ledger and the photo store in memory ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); const enc = (v) => (v instanceof ArrayBuffer ? v : new TextEncoder().encode(String(v)).buffer); return { m,
  get: async (k, o) => (m.has(k) ? (o && o.type === 'arrayBuffer' ? enc(m.get(k).v) : m.get(k).v) : null),
  getWithMetadata: async (k, o) => (m.has(k) ? { value: o && o.type === 'arrayBuffer' ? enc(m.get(k).v) : m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }),
  put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('final-peggy-g001'), steffie = await bearerOf('final-steffie-g002'), sam = await bearerOf('final-sam-g777');
  const entries = {};
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002' };
  entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002' };
  entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }, REG_KV: kv(), GR_TOKEN: 'gr-secret',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) } };
  const call = (path, bearer, body, method) => w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null), r }));
  const gr = (path, body) => w.fetch(req(path, { 'x-gr-token': 'gr-secret' }, body || {}, 'POST'), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  const photo = (bearer, method, bytes, type, q) => w.fetch(new Request(ORIGIN + '/api/profile/photo' + (q || ''), { method, headers: Object.assign({}, bearer ? { 'x-siyl-auth': bearer } : {}, type ? { 'content-type': type } : {}), body: bytes }), env);
  return { w, env, peggy, steffie, sam, call, gr, photo };
}

test('WHO SITS WHERE · the ledger names the holder of a chair for an authenticated guest only; the public read carries no name and no holder; a portrait is read by guest id with a bearer — never without one, never another shape, never a write', async () => {
  const h = await harness();
  assert.equal((await h.gr('/api/seating/config', { ...SEAT_FIXTURE, actor: 'test' })).d.ok, true);
  assert.equal((await h.gr('/api/seating/state', { open: true, actor: 'test' })).d.ok, true);
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'dinner').filter((s) => !s.family).map((s) => s.seatId);
  assert.equal((await h.call('/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: free[0], name: 'Peggy' })).d.ok, true);
  const flat = (v) => (v.dinner && v.dinner.sides ? v.dinner.sides.T.concat(v.dinner.sides.B) : []);
  /* Sam, another party, signed in: the chair is taken, by Peggy, holder G001 */
  const sam = (await h.call('/api/seating', h.sam)).d; assert.equal(sam.named, true);
  const row = flat(sam).find((s) => s.seatId === free[0]); assert.equal(row.state, 'taken'); assert.equal(row.name, 'Peggy'); assert.equal(row.holder, 'G001');
  /* Steffie, the same party: party, named, holder */
  const st = (await h.call('/api/seating', h.steffie)).d; const rs = flat(st).find((s) => s.seatId === free[0]); assert.equal(rs.state, 'party'); assert.equal(rs.holder, 'G001');
  /* signed out: nobody is named */
  const pub = (await h.call('/api/seating')).d; assert.equal(pub.named, false);
  const text = JSON.stringify(pub); assert.doesNotMatch(text, /"holder"|"name"|Peggy|G001/, 'the public plan carries no identity');
  assert.match(src('src/seating.js'), /if \(h && identity && h\.guestId\) row\.holder = h\.guestId;/);
  /* the portrait by id */
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  assert.equal((await h.photo(h.peggy, 'PUT', bytes, 'image/png')).status, 200, 'Peggy stores her photo');
  assert.equal((await h.photo(null, 'GET', null, null, '?of=G001')).status, 401, 'no bearer, no portrait');
  const of = await h.photo(h.sam, 'GET', null, null, '?of=G001'); assert.equal(of.status, 200); assert.equal(of.headers.get('content-type'), 'image/png'); assert.equal(of.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual([...new Uint8Array(await of.arrayBuffer())], [...bytes]);
  assert.equal((await h.photo(h.sam, 'GET', null, null, '?of=G002')).status, 404, 'a guest without a photo');
  assert.equal((await h.photo(h.sam, 'GET', null, null, '?of=INV-G001')).status, 404, 'only the guest-id shape');
  assert.equal((await h.photo(h.sam, 'GET', null, null, '?of=g001')).status, 404);
  assert.equal((await h.photo(h.sam, 'GET', null, null, '?of=T001')).status, 404, 'a synthetic id resolves to its own key — nothing there');
  assert.equal((await h.photo(h.sam, 'DELETE', null, null, '?of=G001')).status, 200, 'a delete never reads of');
  assert.equal((await h.photo(h.sam, 'GET', null, null, '?of=G001')).status, 200, 'Peggy\'s photo is still there — Sam removed only his own (none)');
  assert.equal((await h.photo(h.sam, 'PUT', bytes, 'image/png', '?of=G001')).status, 200);
  assert.ok(h.env.REG_KV.m.has('avatar:INV-G777'), 'a put with of writes the writer\'s own key'); assert.equal(h.env.REG_KV.m.get('avatar:INV-G777').meta.guestId, 'G777');
  assert.match(src('src/worker.js'), /const of = request\.method === 'GET' \? String\(new URL\(request\.url\)\.searchParams\.get\('of'\) \|\| ''\)\.trim\(\) : '';/);
  assert.match(src('src/worker.js'), /if \(of && !\/\^\[A-Z\]\\d\{3\}\$\/\.test\(of\)\) return json/);
});

test('THE RAIL · the client reads the portraits with the session (own photo via load, others by id, cached, null without a session); the roll call beside the plan: initials, the first name, the seat, "You" for the guest\'s own chair', async () => {
  const calls = [];
  const w = page({ auth: PEGGY, modules: ['assets/avatar.js', 'assets/seatlabels.js', 'assets/seating.js'], fetch: async (url, init) => { calls.push({ url: String(url), h: init && init.headers }); return { ok: /G002/.test(String(url)), status: /G002/.test(String(url)) ? 200 : 404, blob: async () => ({ size: 3 }) }; } });
  w.URL = { createObjectURL: (b) => 'blob:' + b.size };
  const AV = w.SIYL_AVATAR; assert.equal(typeof AV.of, 'function');
  assert.equal(await AV.of('nobody'), null, 'only the guest-id shape'); assert.equal(calls.length, 0);
  const u = await AV.of('G002'); assert.equal(u, 'blob:3'); assert.equal(calls.length, 1); assert.match(calls[0].url, /\/api\/profile\/photo\?of=G002$/); assert.equal(calls[0].h['x-siyl-auth'], PEGGY.bearer);
  assert.equal(await AV.of('G002'), 'blob:3'); assert.equal(calls.length, 1, 'cached for the page');
  assert.equal(await AV.of('G003'), null); assert.equal(calls.length, 2);
  const w0 = page({ auth: null, modules: ['assets/avatar.js'] }); assert.equal(await w0.SIYL_AVATAR.of('G002'), null, 'no session, no read');
  /* the rail from a view */
  const S = w.SIYL_SEATS;
  const view = { named: true, dinner: { sides: { T: [{ seatId: 'D-T-01', state: 'yours', guestId: 'g-peggy', name: 'Peggy', holder: 'g-peggy' }, { seatId: 'D-T-02', state: 'party', guestId: 'g-steffie', name: 'Steffie', holder: 'g-steffie' }, { seatId: 'D-T-03', state: 'free' }], B: [{ seatId: 'D-B-01', state: 'taken', name: 'Sam', holder: 'G777' }] } } };
  const html = S.railHtml('dinner', view, { guestId: 'g-peggy' });
  assert.match(html, /<div class="p-seatrail" data-seatrail="dinner"><p class="t-l1">Who sits where · 3 seats held<\/p>/);
  assert.match(html, /<li class="me" data-seat-of="g-peggy"><span class="p-seatava" data-ava="g-peggy" role="img" aria-label="Peggy"><i aria-hidden="true">P<\/i><\/span><span class="n">You<\/span>/);
  assert.match(html, /data-seat-of="g-steffie"[\s\S]*?<span class="n">Steffie<\/span>/); assert.match(html, /data-ava="G777"[\s\S]*?<i aria-hidden="true">S<\/i>[\s\S]*?<span class="n">Sam<\/span>/, 'the initial, the first name the engine holds');
  assert.doesNotMatch(html, /D-T-01|D-B-01/, 'labels, never ledger ids'); assert.match(html, /<span class="s">/);
  assert.equal(S.railHtml('dinner', { named: false, dinner: view.dinner }, {}), '', 'never for a signed-out view');
  assert.equal(S.railHtml('dinner', { named: true, dinner: { sides: { T: [{ seatId: 'D-T-03', state: 'free' }], B: [] } } }, {}), '', 'nothing held, no rail');
  assert.match(src('assets/seating.js'), /S\.railHtml\(event, view, opts\);\s*S\.wireRail\(container\);/, 'render appends the rail and wires it');
  for (const f of ['wedding-preparation.html', 'profile.html']) assert.match(src(f), /<script src="assets\/avatar\.js/, f + ' loads the portrait module');
  assert.match(src('profile.html'), /S\.railHtml\('dinner',S\.view\?S\.view\(\):null,\{guestId:id\}\)/); assert.match(src('profile.html'), /if\(S&&S\.wireRail\)S\.wireRail\(page\);/);
  const css = src('assets/prep.css'); assert.match(css, /\.p-seatrail/); assert.match(css, /\.p-seatava/);
});

test('CONFIRM SEAT FIRST · while a chair is chosen but unconfirmed the Continue action steps back; the photography words and the acknowledgement; Coffee & Cake on My Profile; the photo made obvious; Save my progress in the account block', () => {
  assert.match(src('assets/prep.css'), /body\.seatbar-on \.prep-foot \[data-continue\]\s*\{\s*opacity:\s*\.35;\s*pointer-events:\s*none/);
  assert.match(src('wedding-preparation.html'), /seatbar-on/);
  /* the photography words */
  const ay = src('about-you.html');
  assert.match(ay, /Photography and filming take place during the wedding day, and selected photographs and films may be published on our wedding website and social media\./);
  const g = page({ auth: PEGGY }).SIYL_GUEST; assert.equal(g.PHOTO_TEXT, 'I understand and acknowledge this.'); assert.equal(g.PHOTO_VERSION, '2026-09-20');
  assert.match(ay, /data-photo-ack/);
  /* Coffee & Cake: its own complimentary card, the approved time (venue data: from 12:00 on the wedding day) */
  const pf = src('profile.html');
  assert.match(pf, /data:'wedding:coffee'[^\n]*when:'Sunday, 28 February 2027 · from 12:00',name:'Coffee & Cake'[^\n]*cost:'Complimentary'/);
  assert.match(src('assets/venue-data.js'), /id: 'coffee'[^\n]*when: 'From 12:00 on the wedding day/);
  /* the photo: a button, a dashed ring, the CTA, the note */
  assert.match(pf, /<button type="button" class="pf-avatar" data-avatar data-photo-add aria-label="Add your profile photo">/);
  assert.match(pf, /<button type="button" class="pf-photo-cta" data-photo-add>Add profile photo<\/button>/);
  assert.match(pf, /\.pf-photo-cta\{display:inline-flex/);
  /* Save my progress: the existing draft mechanism, surfaced in the account block */
  const inv = src('assets/invite.mjs');
  assert.match(inv, /<button type="button" class="a-macct-save" data-access-save>Save my progress<\/button>/); assert.match(inv, /data-access-saved/);
  assert.match(inv, /SIYL_DRAFT\.flush\('menu'\)/);
  assert.match(src('assets/aman.css'), /\.a-macct-save/);
});

test('THE REFERENCE GALLERIES · one carousel for the dress references (3:4 cards, previous / next, the count), every reference reachable; the Highlight dress codes in the same language, none invented; the train ticket\'s breathing room; the Snow Mountain frame labelled as the view', () => {
  const rg = src('assets/refgal.js');
  assert.match(rg, /car\.className = 'acar refgal'/); assert.match(rg, /s\.className = 'aslide'/); assert.match(rg, /frame\.className = 'am'/);
  assert.match(rg, /data-a="prev" aria-label="Previous reference"/); assert.match(rg, /data-a="next" aria-label="Next reference"/); assert.match(rg, /refgal-count/);
  assert.match(rg, /if \(window\.SIYL_AMAN && SIYL_AMAN\.wire\) SIYL_AMAN\.wire\(car\);/, 'wired by the one carousel');
  assert.match(rg, /if \(imgs\.length < 2\) return;/, 'a single photograph stays as it is');
  for (const f of ['dress.html', 'wedding-preparation.html']) { assert.match(src(f), /<script src="assets\/refgal\.js/, f); assert.match(src(f), /<script src="assets\/aman\.js/, f + ' has the carousel'); }
  const css = src('assets/aman.css'); assert.match(css, /\.refgal/); assert.match(css, /\.refgal \.aslide \.am[^}]*aspect-ratio:\s*3 \/ 4/);
  /* the Highlight dress codes: from the houses' own practical information, titled — nothing invented */
  const exp = {}; new Function('window', src('assets/experiences.js'))(exp); const byId = Object.fromEntries(exp.SIYL_EXP.map((x) => [x.id, x]));
  assert.equal(byId['bkk-baanphraya'].highlight.dressTitle, 'Elegant attire'); assert.equal(byId['bkk-cannubi'].highlight.dressTitle, 'Smart casual');
  assert.match(byId['bkk-baanphraya'].practical.dress, /sleeveless shirts for gentlemen are not permitted/i); assert.match(byId['bkk-cannubi'].practical.dress, /Smart casual/);
  assert.equal(byId['bkk-suhring'].highlight.dressTitle, undefined, 'no dress code invented for a house that names none');
  const ex = src('experience.html'); assert.match(ex, /<section class="x-sec x-dress" data-dress>/); assert.match(ex, /Dress code · /); assert.match(ex, /hl\.dressTitle/); assert.match(ex, /dress\.html/);
  /* the ticket panel: padding at the shared component, at the phone and the desktop */
  const prep = src('assets/prep.css');
  assert.match(prep, /\.p-sum-ticket \{ padding: var\(--s4\) var\(--s5\) var\(--s5\)/); assert.match(prep, /\.p-sum-ticket \{ grid-column: 1 \/ -1; padding: var\(--s5\) var\(--s6\) var\(--s6\); \}/);
  /* Lijiang: the one approved frame is the view; it is said so */
  const rd = src('assets/rooms-data.js'); assert.match(rd, /The view from the room · Jade Dragon Snow Mountain over the Baisha rooftops \(the room itself is not yet photographed\)/); assert.match(rd, /viewOnly: true/);
});
