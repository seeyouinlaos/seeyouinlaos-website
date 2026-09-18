/* P0 — EMPTY BAG IS REAL · FIXED ARRANGEMENTS ARE NOT BAG PRODUCTS (Owner, 17 Sep 2026 · PROJECT_MASTER_BRIEF §10, §20).
   The state contract (docs/plans/2026-09-17-p0-empty-bag/PLAN.md) proven against the engine and the client modules the
   browser runs: a fixed hold is marked by the engine and never written into the Bag; a stale Bag line of a fixed stage
   leaves; Remove is refused for a fixed stage and idempotent for a normal one; zero selections is a canonical state
   (USD 0) on every surface; Full Experience never touches a fixed stage; the draft revision precondition keeps a stale
   device from resurrecting a removed item; the emails carry the fixed room under "Arranged for you" without an amount. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, doState, HARUTHAI, SUTHEP, PEGGY } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { composeGuestMail, composeOwnerMail } from '../src/mail-templates.js';

const HOST = { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', hosts: true, preferredName: 'Suthep', fullName: 'Suthep Test', bearer: 'x' };
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };

test('ENGINE · the guest\'s own map marks the FIXED room; a normal hold carries no marker', async () => {
  const rooms = new Rooms(doState());
  const h = await call(rooms, 'read', null, HOST);
  assert.deepEqual(h.d.mine['bkk-stay'], { key: 'bkk-stay/penthouse', label: 'A', fixed: true });
  const j = await call(rooms, 'join', { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'bkk-stay/u-sathorn-superior-garden', label: 'B', name: 'Peggy' }, { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false });
  assert.equal(j.status, 200); assert.deepEqual(j.d.mine['bkk-stay'], { key: 'bkk-stay/u-sathorn-superior-garden', label: 'B' });
});

test('CLIENT · a fixed hold is never written into the Bag; a stale Bag line of the fixed stage leaves; the total is USD 0; the words say Arranged for you; no Remove control', () => {
  const w = page({ auth: HOST });
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG, A = w.SIYL_ARRANGED;
  /* the older model left the fixed room in the Bag as a product */
  B.set([{ id: 'bkk-stay', name: 'Sathorn Penthouse Bangkok', meta: '21 – 24 February 2027 · Sathorn Penthouse', price: 255, stay: 'sathorn', room: 'penthouse', rate: 85, nights: 3, qty: 1, unit: 'A', unitName: 'Room A' }]);
  assert.equal(B.total(), 255);
  U._set({ ok: true, places: 2, mine: { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A', fixed: true } },
    units: { 'bkk-stay/penthouse': [{ label: 'A', name: 'Room A', kind: 'room', places: 2, reservedFor: 'Bride & Groom', eligible: true, occupants: [{ name: 'Haruthai' }, { name: 'Suthep', mine: true }], taken: 2, free: 0, full: true }] },
    summary: { 'bkk-stay/penthouse': { units: 6, places: 12, sourceRooms: 6, sourcePlaces: 12, ownerReservedRooms: 1, ownerReservedPlaces: 2, guestOccupiedRooms: 0, guestOccupiedPlaces: 0, remainingRooms: 5, remainingPlaces: 10, soldOut: false, free: 10, rooms: 5, reserved: 1, reservedFor: 'Bride & Groom', kind: 'room' } } });
  assert.equal(U.fixed('bkk-stay'), true); assert.equal(JSON.stringify(U.fixedStages()), '["bkk-stay"]');
  ST.sync();
  assert.equal(JSON.stringify(B.get()), '[]', 'the fixed stage is not a Bag line'); assert.equal(B.total(), 0);
  ST.sync(); assert.equal(JSON.stringify(B.get()), '[]', 'and it does not come back');
  assert.equal(ST.fixed('bkk-stay'), true);
  const items = A.items(); assert.equal(items.length, 1); assert.equal(items[0].property, 'Sathorn Penthouse Bangkok'); assert.equal(items[0].name, 'Room A'); assert.equal(items[0].who, 'Haruthai · You');
  const html = A.html(); assert.match(html, /Arranged for you/); assert.match(html, /Fixed arrangement · not part of your bag/); assert.doesNotMatch(html, /data-remove|Remove|Change room|USD/);
});

test('CLIENT · Remove is refused for a fixed stage without touching the Bag; select in a fixed stage is refused; a normal remove is idempotent and leaves USD 0', async () => {
  const w = page({ auth: HOST }); const U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG;
  U._set({ ok: true, places: 2, mine: { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A', fixed: true } }, units: {}, summary: {} });
  B.set([]);
  const r = await ST.remove('bkk-stay'); assert.equal(JSON.stringify(r), JSON.stringify({ ok: false, error: 'fixed' })); assert.equal(JSON.stringify(B.get()), '[]');
  const s = await ST.select('bkk-stay', 'u-sathorn-superior-garden'); assert.equal(JSON.stringify(s), JSON.stringify({ ok: false, error: 'fixed' }));
  assert.equal(ST.refusal({ ok: false, error: 'fixed' }), 'This room is arranged for you and stays as it is.');
  assert.equal(ST.refusal({ ok: false, error: 'unreachable' }), 'Nothing was changed — we could not reach Guest Relations just now. Please try again.');
  /* a normal guest: two removes of the same line */
  const g = page({ auth: PEGGY }); const B2 = g.SIYL_BAG, ST2 = g.SIYL_STAY, U2 = g.SIYL_UNITS;
  U2._set({ ok: true, places: 2, mine: {}, units: {}, summary: {} });
  B2.set([{ id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 }]);
  const r1 = await ST2.remove('train'); const r2 = await ST2.remove('train');
  assert.equal(r1.ok, true); assert.equal(r2.ok, true); assert.equal(JSON.stringify(B2.get()), '[]'); assert.equal(B2.total(), 0);
});

test('CLIENT · Full Experience keeps a fixed stage out of both its remove and its add lists', () => {
  const w = page({ auth: HOST }); const U = w.SIYL_UNITS, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  B.set([]);
  U._set({ ok: true, places: 2, mine: { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A', fixed: true } }, units: {}, summary: {} });
  const plan = J.fullExperience();
  assert.ok(plan.kept.includes('bkk-stay'), 'the fixed stage is kept as it is');
  assert.ok(!plan.remove.some((id) => id === 'bkk-stay'), 'never removed');
  assert.ok(!plan.add.some((it) => it.id === 'bkk-stay'), 'never added');
});

test('SURFACES · the sticky bar says My Bag and stands at USD 0 for a signed-in guest; the account links are on it; the cart, My Trip and Review read the arranged renderer; the header names My Trip · My Bag · My Profile', () => {
  const b = src('assets/bag.js'), c = src('cart.html'), yj = src('your-journey.html'), rv = src('review.html'), inv = src('assets/invite.mjs');
  assert.match(b, /<span class="jb-l">My Bag<\/span>/); assert.match(b, /data-bag-view>Open My Bag</); assert.match(b, /var on=B\.authed\(\);/, 'the bar stands whenever a guest is signed in — an empty bag is a real state');
  assert.match(b, /data-nav="top"/); assert.doesNotMatch(b, /data-nav="trip"/, 'the account surfaces moved into the sticky header shell (Owner, 18 Sep 2026)');
  assert.match(c, /arranged=window\.SIYL_ARRANGED\?SIYL_ARRANGED\.html\(\):''/); assert.match(c, /No selections yet · USD 0/); assert.match(c, /if\(bt\.disabled\)return;/, 'double remove is idempotent'); assert.match(c, /never an endless "Removing…"/);
  assert.match(yj, /if\(window\.SIYL_ARRANGED&&U&&U\.ready\(\)&&U\.fixed\(win\)\)return SIYL_ARRANGED\.html\(\{heading:true\}\);/); assert.match(yj, /<h1 class="t-d1">My Trip<\/h1>/);
  assert.match(rv, /function paintArranged\(\)/); assert.match(rv, /<div id="arranged"><\/div>/);
  assert.match(inv, /data-access-nav="trip">My Trip<\/a>/); assert.match(inv, /data-access-nav="bag">My Bag<\/a>/); assert.match(inv, /data-access-nav="profile">My Profile<\/a><button type="button" class="hd-access-out" data-access-out>Sign out<\/button>/); assert.match(inv, /if \(el\.parentElement !== header\)/, 'the access row lives inside the sticky header');
  for (const f of ['your-journey.html', 'cart.html', 'review.html']) assert.match(src(f), /assets\/arranged\.js/, f + ' loads the arranged renderer');
});

/* ---- the Worker: the revision precondition and the fixed-line strip ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const host = await bearerOf('demo-host-g049'), guest = await bearerOf('demo-sam');
  const entries = {}; entries[await authIdOf(host)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1 }; entries[await authIdOf(guest)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  return { w, env, host, guest };
}

test('WORKER · a stale device cannot resurrect a removed item: a PUT that names an older revision is refused with the current draft (409 stale); the matching revision writes; the beacon path obeys the same rule', async () => {
  const h = await harness();
  const put = async (b, body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': b }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  /* device A saves a bag with the train; device B reads it */
  const a1 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) } });
  assert.equal(a1.status, 200); const revA = a1.d.updatedAt;
  /* device A removes the train and saves (base = revA) */
  const a2 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: revA });
  assert.equal(a2.status, 200); assert.notEqual(a2.d.updatedAt, revA);
  /* device B, still on revA, pushes its old bag → refused, given the current draft */
  const b1 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, baseUpdatedAt: revA });
  assert.equal(b1.status, 409); assert.equal(b1.d.error, 'stale'); assert.equal(b1.d.draft.keys['siyl.bag'], '[]'); assert.equal(b1.d.draft.updatedAt, a2.d.updatedAt);
  const cur = JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v); assert.equal(cur.keys['siyl.bag'], '[]', 'the removed item did not come back');
  /* no base at all against a stored draft → refused too (a never-synced cache must read first) */
  const b2 = await put(h.guest, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train' }]) } }); assert.equal(b2.status, 409);
  /* the beacon path */
  const bc = await h.w.fetch(req('/api/draft?beacon=1', { 'content-type': 'application/json' }, { invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train' }]) }, baseUpdatedAt: revA, bearer: h.guest }), h.env);
  assert.equal(bc.status, 409);
  const bc2 = await h.w.fetch(req('/api/draft?beacon=1', { 'content-type': 'application/json' }, { invitationId: 'INV-G777', keys: { 'siyl.skip': '[]' }, baseUpdatedAt: a2.d.updatedAt, bearer: h.guest }), h.env);
  assert.equal(bc2.status, 200); assert.equal(JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v).keys['siyl.bag'], '[]', 'a matching beacon merges its key and keeps the empty bag');
});

test('WORKER · a host\'s Bag line of the fixed stage is stripped on save (defence in depth); the guest\'s email lists the fixed room under Arranged for you without an amount; the Bag total excludes it', async () => {
  const h = await harness();
  const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.host }, { invitationId: 'INV-G049', keys: { 'siyl.bag': JSON.stringify([{ id: 'bkk-stay', price: 255, qty: 1, room: 'penthouse', unit: 'A' }, { id: 'train', price: 100, qty: 1 }]) } }, 'PUT'), h.env);
  assert.equal(r.status, 200);
  assert.deepEqual(JSON.parse(JSON.parse(h.env.REG_KV.m.get('draft:INV-G049').v).keys['siyl.bag']).map((x) => x.id), ['train']);
  /* the email model */
  const rec = { invitationId: 'INV-G049', guestId: 'G049', submissionId: 'SYL-G049-TEST0001', kind: 'initial', version: 1, submittedAt: '2026-09-17T10:00:00.000Z', lastSentAt: '2026-09-17T10:00:00.000Z',
    registration: { channel: 'journey-shop', guestId: 'G049', totalUsd: 100, contact: { email: 'groom.test@example.org', phone: '+66' }, selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }], guestRecord: { guests: [{ guestId: 'G049', name: 'Suthep', source: { fullName: 'Suthep Test', preferredName: 'Suthep' } }] } },
    rooms: { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A', name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok', room: 'Room A', fixed: true } }, recipient: { email: 'groom.test@example.org', phone: '+66' } };
  const g = composeGuestMail(rec), o = composeOwnerMail(rec, 'https://x/s');
  for (const t of [g.text, g.html, o.text, o.html]) { assert.match(t, /Arranged for you|ARRANGED FOR YOU/i); assert.match(t, /Sathorn Penthouse Bangkok/); assert.match(t, /Room A/); assert.match(t, /USD 100/); assert.doesNotMatch(t, /USD 255/); }
  assert.match(g.text, /ARRANGED FOR YOU\n· Sathorn Penthouse Bangkok — Room A — Sathorn Penthouse — fixed arrangement, not part of your bag/);
});

test('SIGNED OUT · the private surfaces render no private state and hand over to the invitation', () => {
  for (const f of ['cart.html', 'your-journey.html', 'review.html', 'about-you.html']) {
    const w = page({ auth: null, file: f }).window || page({ auth: null });
    assert.equal(w.SIYL_BAG.authed(), false); assert.equal(w.SIYL_BAG.get().length ? w.SIYL_BAG.total() : 0, 0);
    assert.ok(w.SIYL_GUEST.me() === null || w.SIYL_GUEST.me() === undefined, f + ': no guest without a session');
  }
  assert.match(src('assets/invite-early.js'), /data-session/);
});

/* ---- the Codex findings of 18 Sep 2026 (deferred plan + implementation review), each pinned ---- */
test('CODEX P1-1 · the draft write is serialised per invitation: two devices naming the same base revision cannot both write — one 200, one 409 with the current draft; a removal cannot be undone by the loser', async () => {
  const h = await harness();
  const put = async (body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  const a1 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) } }); const rev = a1.d.updatedAt;
  /* the two writes leave at the same moment: device A removes, device B re-sends its old bag — both on `rev` */
  const [ra, rb] = await Promise.all([put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: rev }), put({ invitationId: 'INV-G777', keys: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }]) }, baseUpdatedAt: rev })]);
  const codes = [ra.status, rb.status].sort(); assert.deepEqual(codes, [200, 409], 'exactly one of the two writes lands');
  const cur = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env)).json();
  const winner = ra.status === 200 ? ra : rb; assert.equal(cur.draft.updatedAt, winner.d.updatedAt); assert.equal(cur.draft.keys['siyl.bag'], winner === ra ? '[]' : JSON.stringify([{ id: 'train', price: 100, qty: 1 }]));
  const loser = ra.status === 409 ? ra : rb; assert.equal(loser.d.draft.updatedAt, cur.draft.updatedAt, 'the loser is handed the draft that won');
  assert.notEqual(cur.draft.updatedAt, rev);
});

test('CODEX P1-2 · the three-way merge on the device: a removal elsewhere stands, an independent answer typed here is kept, a double-sided change takes the server\'s and is named', () => {
  const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'] }); const merge = w.SIYL_DRAFT._merge;
  const base = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{}}', 'siyl.temple': '{}' };
  /* the server removed the train; this device answered a profile question meanwhile */
  const local = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"Lime"}}}}', 'siyl.temple': '{}' };
  const server = { 'siyl.bag': '[]', 'siyl.guest': base['siyl.guest'], 'siyl.temple': '{}' };
  const m = merge(local, base, server);
  assert.equal(m.keys['siyl.bag'], '[]', 'the removal stands'); assert.equal(m.keys['siyl.guest'], local['siyl.guest'], 'the independent answer is kept'); assert.deepEqual(JSON.parse(JSON.stringify(m.keep)), ['siyl.guest']); assert.deepEqual(JSON.parse(JSON.stringify(m.lost)), []);
  /* both changed the bag: the server's wins and the guest is told */
  const m2 = merge({ 'siyl.bag': '[{"id":"c86"}]' }, base, { 'siyl.bag': '[]' });
  assert.equal(m2.keys['siyl.bag'], '[]'); assert.deepEqual(JSON.parse(JSON.stringify(m2.lost)), ['siyl.bag']);
  /* a key this device never held follows the server */
  const m3 = merge({}, {}, { 'siyl.skip': '["kmg"]' }); assert.equal(m3.keys['siyl.skip'], '["kmg"]');
  const d = src('assets/draft.js');
  assert.match(d, /if \(inflight\) \{ if \(!queued\) queued = inflight\.then/, 'pushes are serialised'); assert.match(d, /\} finally \{ state\.applying = false; \}/, 'no autosave while a server copy is applied'); assert.match(d, /state\.notice = 'stale'; state\.phase = 'stale';/, 'a lost edit is named until the guest\'s next own change');
});

test('CODEX P1-3 · a legacy Bag line of the fixed stage never reaches a submission as a product: the registration boundary strips it and recomputes the total; the email model never classifies it (no stay, no experience, no amount)', async () => {
  const h = await harness();
  const legacy = { channel: 'journey-shop', guestId: 'G049', totalUsd: 355, contact: { email: 'groom.test@example.org', phone: '+66' },
    selections: [{ id: 'bkk-stay', name: 'Sathorn Penthouse Bangkok', meta: '21 – 24 February 2027 · Sathorn Penthouse', price: 255, qty: 1, stay: 'sathorn', room: 'penthouse', unit: 'A' }, { id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 }],
    guestRecord: { guests: [{ guestId: 'G049', name: 'Suthep', source: { fullName: 'Suthep Test', preferredName: 'Suthep' } }] } };
  const calls = []; const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { if (/api\.brevo\.com/.test(String(url))) { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  try {
    h.env.BREVO_API_KEY = 'x';
    const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.host }, { invitationId: 'INV-G049', registration: legacy, text: 'SEE YOU IN LAOS — JOURNEY SELECTION\n- Sathorn Penthouse · Room A · USD 255' }), h.env);
    assert.equal(r.status, 202);
    const rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G049').v);
    assert.deepEqual(rec.registration.selections.map((x) => x.id), ['train']); assert.equal(rec.registration.totalUsd, 100); assert.ok(rec.registration.normalised.includes('totalUsd recomputed'));
    assert.equal(rec.rooms['bkk-stay'].fixed, true);
    for (const c of calls) { assert.doesNotMatch(c.textContent, /USD 255|USD 355/); assert.match(c.textContent, /USD 100/); assert.match(c.textContent, /ARRANGED FOR YOU|Arranged for you/); }
    /* the email model with a legacy line and a delayed room read (rooms present but the line still in selections) */
    const rec2 = { ...rec, registration: legacy };
    const g = composeGuestMail(rec2); assert.doesNotMatch(g.text + g.html, /USD 255|USD 355/); assert.match(g.text, /Sathorn Penthouse Bangkok — Room A/); assert.doesNotMatch(g.text, /EXPERIENCES/);
  } finally { globalThis.fetch = realFetch; }
});

/* ---- the Codex FINAL review of 18 Sep 2026 (branch p0-empty-bag vs main), each pinned ---- */
test('CODEX FINAL-1 · an answer typed while a save is in flight survives that save\'s 409: the merge reads the keys of this moment, the answer is kept and sent again on the new revision, nothing is named as lost', async () => {
  const baseKeys = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{}}' };
  const bodies = []; let resolveFirst; const first = new Promise((res) => { resolveFirst = res; });
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });   /* the guest module's own contact sync */
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); if (bodies.length === 1) return first; return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R3', savedAt: 'R3', submission: null }) }); }
    return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
  };
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await Promise.resolve();
  const p1 = D.push('auto');                                                                   /* leaves on R1, its answer delayed */
  const typed = '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"Oolong"}}}}';
  w.localStorage.setItem('siyl.guest', typed);                                                /* typed while the save is in flight */
  const p2 = D.push('auto');                                                                   /* queued behind it */
  resolveFirst({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: { keys: { 'siyl.bag': '[]', 'siyl.guest': baseKeys['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' }, submission: null }) });   /* the train was removed elsewhere */
  await p1; await p2;
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };   /* the guest module stamps contactSyncedAt on the event; the answer is what counts */
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'Oolong', 'the answer typed during the save is kept');
  assert.equal(w.localStorage.getItem('siyl.bag'), '[]', 'the removal elsewhere stands');
  const sent = bodies.slice(1); assert.ok(sent.length >= 1, 'the kept answer is sent again');
  assert.equal(sent[0].baseUpdatedAt, 'R2'); sent.forEach((b) => { assert.equal(drink(b.keys['siyl.guest']), 'Oolong'); assert.equal(b.keys['siyl.bag'], '[]'); });
  assert.equal(D.state().notice, null, 'nothing was lost, so nothing is named'); assert.equal(D.state().phase, 'saved');
});

test('CODEX FINAL-2 · a draft actor whose KV seed read fails refuses reads and writes (503 · retry) instead of treating a legacy draft as absent; once the mirror answers, the legacy draft seeds the actor and the precondition holds', async () => {
  const h = await harness();
  const legacy = { invitationId: 'INV-G777', guestId: 'G777', keys: { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"sam@example.org"}}' }, updatedAt: '2026-09-10T10:00:00.000Z', savedAt: '2026-09-10T10:00:00.000Z' };
  await h.env.REG_KV.put('draft:INV-G777', JSON.stringify(legacy));
  const realGet = h.env.REG_KV.get; let down = true;
  h.env.REG_KV.get = async (k) => { if (down && String(k).startsWith('draft:')) throw new Error('kv unavailable'); return realGet(k); };
  const put = async (body) => { const r = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }, body, 'PUT'), h.env); return { status: r.status, d: await r.json() }; };
  const g1 = await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env); assert.equal(g1.status, 503, 'a read is not answered with an empty draft');
  const w1 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' } }); assert.equal(w1.status, 503); assert.equal(w1.d.retry, true);
  const w1b = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt }); assert.equal(w1b.status, 503, 'even a correct base cannot write before the seed is known');
  assert.equal(JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v).keys['siyl.guest'], legacy.keys['siyl.guest'], 'the mirror is untouched');
  down = false;
  const g2 = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.guest }), h.env)).json(); assert.equal(g2.draft.updatedAt, legacy.updatedAt, 'the legacy draft seeds the actor');
  const w2 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' } }); assert.equal(w2.status, 409, 'no base against the legacy draft is stale');
  const w3 = await put({ invitationId: 'INV-G777', keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt }); assert.equal(w3.status, 200);
  const cur = JSON.parse(h.env.REG_KV.m.get('draft:INV-G777').v); assert.equal(cur.keys['siyl.bag'], '[]'); assert.equal(cur.keys['siyl.guest'], legacy.keys['siyl.guest'], 'the profile survives the write');
});

test('CODEX FINAL-3 · an acknowledged Save whose read-back fails still records its revision and base: an answer typed meanwhile is pushed against the acknowledged revision (no 409, no self-conflict), and dirty stays true until it lands', async () => {
  const baseKeys = { 'siyl.bag': '[]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"A"}}}}' };
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };
  const bodies = []; let gets = 0, rejectReadback, readbackAsked; const readback = new Promise((_, rej) => { rejectReadback = rej; }); const asked = new Promise((res) => { readbackAsked = res; });
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R' + (bodies.length + 1), savedAt: 'R' + (bodies.length + 1), submission: null }) }); }
    gets += 1; if (gets === 1) return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
    readbackAsked(); return readback;                                                           /* the Save's verification never answers */
  };
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await Promise.resolve();
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"B"'));       /* answer B, then SAVE MY PROGRESS */
  const p1 = D.push('save');
  await asked;                                                                                 /* the PUT stored R2; the read-back is in flight */
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.meta')).serverUpdatedAt, 'R2', 'the acknowledged revision is recorded before the read-back');
  assert.equal(drink(JSON.parse(w.localStorage.getItem('siyl.draft.base'))['siyl.guest']), 'B', 'and the stored keys are the base');
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"C"'));       /* answer C typed meanwhile */
  const p2 = D.push('auto');
  rejectReadback(new Error('offline'));
  const r1 = await p1; assert.equal(r1.ok, false, 'the Save reports its failed verification'); await p2;
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'C', 'the newest answer stays on the device');
  assert.equal(bodies.length, 2); assert.equal(bodies[1].baseUpdatedAt, 'R2', 'the queued push names the acknowledged revision'); assert.equal(drink(bodies[1].keys['siyl.guest']), 'C');
  assert.equal(D.state().notice, null); assert.equal(D.state().phase, 'saved'); assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.meta')).dirty, false);
  /* dirty survives a request that a later edit outran */
  let hold; const held = new Promise((res) => { hold = res; }); const w2fetch = (url, init) => { if (init && init.method === 'PUT') return held; return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) }); };
  const w2 = page({ auth: PEGGY, fetch: w2fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.base': JSON.stringify(baseKeys), 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  await Promise.resolve(); const q = w2.SIYL_DRAFT.push('auto'); w2.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"D"')); w2.SIYL_DRAFT.touch();
  hold({ status: 200, json: async () => ({ ok: true, updatedAt: 'R2', savedAt: 'R2', submission: null }) }); await q;
  assert.equal(JSON.parse(w2.localStorage.getItem('siyl.draft.meta')).dirty, true, 'the edit typed during the request is still unsaved');
});

test('CODEX RELEASE-1 · a delayed seed read never overwrites a save that landed meanwhile: GET starts on an unseeded actor, its KV read is held, a PUT seeds and saves an empty bag, the held read resolves — the saved revision stands', async () => {
  const { doState } = await import('./sandbox.mjs');
  const legacy = { invitationId: 'INV-G777', guestId: 'G777', keys: { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"sam@example.org"}}' }, updatedAt: '2026-09-10T10:00:00.000Z', savedAt: '2026-09-10T10:00:00.000Z' };
  const m = new Map([['draft:INV-G777', JSON.stringify(legacy)]]);
  let holdFirst = null; let reads = 0;
  const kv = { get: (k) => { reads += 1; if (reads === 1) return new Promise((res) => { holdFirst = () => res(m.get(k) || null); }); return Promise.resolve(m.get(k) || null); }, put: async (k, v) => { m.set(k, v); } };
  const state = doState();
  /* a real actor serialises: a get in flight blocks the put. The stub state below runs blockConcurrencyWhile as a plain call, so this test proves the storage recheck on its own */
  const a = new Drafts(state, { REG_KV: kv });
  const call = (op, body) => a.fetch(new Request('https://drafts/' + op, { method: 'POST', body: JSON.stringify({ invitationId: 'INV-G777', ...body }) })).then(async (r) => ({ status: r.status, d: await r.json() }));
  const g = call('get', {});                                                                   /* the seed read is held */
  await new Promise((r) => setTimeout(r, 5));
  const w = await call('put', { keys: { 'siyl.bag': '[]' }, baseUpdatedAt: legacy.updatedAt });   /* seeds (a second, fresh KV read) and saves the empty bag */
  assert.equal(w.status, 200); const saved = w.d.draft.updatedAt;
  holdFirst(); const got = await g;
  assert.equal(got.status, 200);
  const cur = await call('get', {});
  assert.equal(cur.d.draft.updatedAt, saved, 'the held seed read did not roll the revision back'); assert.equal(cur.d.draft.keys['siyl.bag'], '[]', 'the removed train did not come back');
});

test('CODEX RELEASE-2 · a browser upgraded from an older release (a revision, no merge base) takes the server copy of that revision as its base on the first read, so a later 409 keeps its independent edit', async () => {
  const baseKeys = { 'siyl.bag': '[{"id":"train"}]', 'siyl.guest': '{"contact":{"email":"a@b.c"},"guests":{"g":{"profile":{"drink":"A"}}}}' };
  const drink = (v) => { try { return JSON.parse(v).guests.g.profile.drink; } catch (e) { return null; } };
  const bodies = [];
  const fetch = (url, init) => {
    if (!/\/api\/draft/.test(String(url))) return Promise.resolve({ status: 200, json: async () => ({ ok: true }) });
    if (init && init.method === 'PUT') { bodies.push(JSON.parse(init.body)); const b = bodies[bodies.length - 1]; if (b.baseUpdatedAt === 'R1') return Promise.resolve({ status: 409, json: async () => ({ ok: false, error: 'stale', draft: { keys: { 'siyl.bag': '[]', 'siyl.guest': baseKeys['siyl.guest'] }, updatedAt: 'R2', savedAt: 'R2' }, submission: null }) }); return Promise.resolve({ status: 200, json: async () => ({ ok: true, updatedAt: 'R3', savedAt: 'R3', submission: null }) }); }
    return Promise.resolve({ status: 200, json: async () => ({ ok: true, draft: { keys: baseKeys, updatedAt: 'R1', savedAt: 'R1' }, submission: null }) });
  };
  /* the legacy meta: the revision is known, no siyl.draft.base exists */
  const w = page({ auth: PEGGY, fetch, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'], seed: { ...baseKeys, 'siyl.draft.meta': JSON.stringify({ invitationId: PEGGY.invitationId, serverUpdatedAt: 'R1', dirty: false }) } });
  const D = w.SIYL_DRAFT; await new Promise((r) => setTimeout(r, 30));   /* the first read settles */
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.draft.base') || 'null') && drink(JSON.parse(w.localStorage.getItem('siyl.draft.base'))['siyl.guest']), 'A', 'the first read installed the base');
  w.localStorage.setItem('siyl.guest', baseKeys['siyl.guest'].replace('"A"', '"B"'));        /* an independent profile edit here */
  const r = await D.push('auto');                                                            /* another device removed the train meanwhile (409 on R1) */
  assert.equal(drink(w.localStorage.getItem('siyl.guest')), 'B', 'the independent edit is kept'); assert.equal(w.localStorage.getItem('siyl.bag'), '[]', 'the removal elsewhere stands');
  assert.equal(D.state().notice, null, 'nothing was lost'); assert.ok(bodies.length >= 2 && drink(bodies[bodies.length - 1].keys['siyl.guest']) === 'B', 'the kept edit was sent again');
});
