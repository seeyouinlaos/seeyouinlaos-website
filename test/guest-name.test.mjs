/* THE GUEST'S OWN NAME (Owner, 21 Sep 2026): First Name · Last Name are the guest's to correct in their own profile — the
   words change, the identity never does (the invitation, the code, the bearer, guestId · CONxxx · COUPLxxx, the party, the
   holds, the Bag, the wedding answers, the seats, the drafts, the photo, the contact). Prefilled from the invitation, nothing
   is written until the guest edits; the correction is read wherever the guest's name is rendered; a couple's two members
   correct their own and never each other's. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, plain, doState, PEGGY, STEFFIE } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { Seating, validateGeometry, seatsOf } from '../src/seating.js';
import { SEAT_FIXTURE } from './fixtures.mjs';

const ids = (s, c, k) => ({ ...s, contactId: c, couple: k });

test('THE MODEL · the two fields read the invitation\'s words until the guest edits; a correction of either field reads everywhere as the full name and the first name; the identity beneath does not move; the partner\'s record is untouched', () => {
  const w = page({ auth: ids({ ...PEGGY, fullName: 'Peggy Berger', preferredName: 'Peggy' }, 'CON003', 'COUPL002') }); const G = w.SIYL_GUEST;
  assert.equal(G.nameField('firstName'), 'Peggy'); assert.equal(G.nameField('lastName'), 'Berger');
  assert.equal(G.contact('firstName'), '', 'nothing written until the guest edits'); assert.equal(G.contact('lastName'), '');
  assert.equal(G.value('g-peggy', 'fullName'), 'Peggy Berger'); assert.equal(G.nameOf(), 'Peggy'); assert.equal(G.edited('g-peggy', 'fullName'), false);
  assert.ok(!G.personalMissing().some((m) => /Name/.test(m.key)), 'the name is never "still needed"');
  /* the surname corrected — the first name stays the invitation's */
  G.setContact('lastName', 'Acker');
  assert.equal(G.contact('lastName'), 'Acker'); assert.equal(G.contact('firstName'), '');
  assert.equal(G.value('g-peggy', 'fullName'), 'Peggy Acker'); assert.equal(G.nameOf(), 'Peggy'); assert.equal(G.nameOf('g-peggy'), 'Peggy');
  assert.equal(G.edited('g-peggy', 'fullName'), true); assert.equal(G.source('g-peggy', 'fullName'), 'Peggy Berger', 'the source stays the invitation\'s');
  /* the identity: untouched */
  const me = G.me(); assert.equal(me.guestId, 'g-peggy'); assert.equal(me.contactId, 'CON003'); assert.equal(me.couple, 'COUPL002'); assert.equal(me.fullName, 'Peggy Berger');
  const a = JSON.parse(w.localStorage.getItem('siyl.auth')); assert.equal(a.bearer, PEGGY.bearer); assert.equal(a.invitationId, 'INV-g-peggy'); assert.equal(a.partyId, 'INV-DEMO-002'); assert.equal(a.fullName, 'Peggy Berger');
  assert.ok(!G.PERSONAL.some((f) => /contact|couple|con|guest/i.test(f.key)), 'no identity field is editable');
  /* the first name corrected too */
  G.setContact('firstName', 'Margaret');
  assert.equal(G.value('g-peggy', 'fullName'), 'Margaret Acker'); assert.equal(G.nameOf(), 'Margaret'); assert.equal(G.value('g-peggy', 'preferredName'), 'Margaret');
  /* the record for Guest Relations carries the correction as submitted, the invitation's words as the source */
  const rec = G.operational(); const g0 = rec.guests[0];
  assert.equal(g0.name, 'Margaret'); assert.equal(g0.submitted.fullName, 'Margaret Acker'); assert.equal(g0.submitted.preferredName, 'Margaret'); assert.equal(g0.source.fullName, 'Peggy Berger');
  /* cleared again: the invitation's words return */
  G.setContact('firstName', ''); G.setContact('lastName', '');
  assert.equal(G.value('g-peggy', 'fullName'), 'Peggy Berger'); assert.equal(G.edited('g-peggy', 'fullName'), false);
  /* Steffie, the same couple, her own device: Peggy's words are not hers, hers are not Peggy's */
  const w2 = page({ auth: ids({ ...STEFFIE, fullName: 'Steffie Berger', preferredName: 'Steffie' }, 'CON004', 'COUPL002') }); const G2 = w2.SIYL_GUEST;
  assert.equal(G2.nameField('lastName'), 'Berger'); G2.setContact('lastName', 'Muller');
  assert.equal(G2.value('g-steffie', 'fullName'), 'Steffie Muller'); assert.equal(G2.nameOf('g-peggy'), 'Peggy', 'the partner by her first name, from the invitation');
  assert.equal(w.SIYL_GUEST.value('g-peggy', 'fullName'), 'Peggy Berger', 'Peggy\'s device unchanged'); assert.equal(G.nameOf('g-steffie'), 'Steffie');
  /* the name splits: a preferred name that is not the first word; a single word */
  const w3 = page({ auth: { ...PEGGY, fullName: 'Anna Peggy Berger', preferredName: 'Peggy' } }); assert.deepEqual(plain(w3.SIYL_GUEST.nameParts()), { first: 'Peggy', last: 'Anna Berger' });
  const w4 = page({ auth: { ...PEGGY, fullName: 'Cher', preferredName: '' } }); assert.deepEqual(plain(w4.SIYL_GUEST.nameParts()), { first: 'Cher', last: '' });
});

test('THE SURFACES · the profile and the invitation page carry the two editable fields, saved through the contact record; every name surface reads the correction through the guest module; the account block too', () => {
  const pf = src('profile.html'), inv = src('invitation.html');
  for (const f of [pf, inv]) { assert.match(f, /type="text" autocomplete="given-name" value="'\+esc\(G\.nameField\('firstName'\)\)\+'" data-c="firstName"/); assert.match(f, /type="text" autocomplete="family-name" value="'\+esc\(G\.nameField\('lastName'\)\)\+'" data-c="lastName"/); assert.match(f, /G\.setContact\(i\.getAttribute\('data-c'\),i\.value\.trim\(\)\)/); }
  assert.match(inv, /correct your name/); assert.match(inv, /Corrected by you/);
  assert.match(pf, /Your invitation, your code and your arrangements stay exactly as they are/);
  for (const [f, rx] of [['review.html', /G\.value\(me\.guestId,'fullName'\)/], ['tickets.html', /G\.value\(id,'fullName'\)/], ['wedding-preparation.html', /function fullName\(id\)\{return G\.value\(id,'fullName'\)\|\|G\.nameOf\(id\)\}/], ['assets/seatpass.js', /G\.value\(guestId, 'fullName'\)/], ['assets/travelpass.js', /G\.value\(me\.guestId, 'fullName'\)/], ['assets/prep-shell.js', /m\.nameOf\(g\.guestId\)/], ['assets/seating.js', /G\.nameOf\(\)/], ['assets/rooms.js', /G\.nameOf\(\)/]]) assert.match(src(f), rx, f);
  assert.match(src('assets/invite.mjs'), /Signed in · ' \+ esc\(\(window\.SIYL_GUEST && window\.SIYL_GUEST\.nameOf && window\.SIYL_GUEST\.nameOf\(\)\) \|\| a\.preferredName/);
  /* the guest module: the seat holds follow a correction under the same identity — the same seats, re-selected with the new first name */
  const g = src('assets/guest.js'); assert.match(g, /if \(f === 'firstName' \|\| f === 'lastName'\) this\.renameHolds\(\);/); assert.match(g, /invitationId: a\.invitationId, guestId: a\.guestId, event: ev, seatId: seatId, name: name/);
});

/* ---- the Worker: the name stored with the contact under the guest's own invitation; identity from the index only ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const storageStub = () => { const m = new Map(); return { async get(k) { return m.has(k) ? m.get(k) : undefined; }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const out = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) out.set(k, v); return out; } }; };
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('name-peggy-g001'), steffie = await bearerOf('name-steffie-g002');
  const entries = {};
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' };
  entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState()); const seating = new Seating({ storage: storageStub(), blockConcurrencyWhile: (fn) => fn() });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }, REG_KV: kv(), GR_TOKEN: 'gr-secret',
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) }, SEATING: { idFromName: () => 'seating', get: () => ({ fetch: (r) => seating.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r), a }; } return actors[n]; } };
  const call = (path, bearer, body, method) => w.fetch(req(path, bearer ? { 'x-siyl-auth': bearer } : {}, body, method), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  const gr = (path, body) => w.fetch(req(path, { 'x-gr-token': 'gr-secret' }, body || {}, 'POST'), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  return { w, env, peggy, steffie, call, gr };
}

test('THE WORKER · the corrected name is stored with the contact under the same invitation and read back by that guest only; the identity comes from the index, never the body; a room hold, a seat, a draft, the photo and the partner\'s record stand exactly as before', async () => {
  const h = await harness();
  const epoch = (await h.call('/api/contact', h.peggy)).d.resetAt || null;
  const put = (bearer, body) => h.call('/api/contact', bearer, { seenReset: epoch, ...body }, 'PUT');
  /* the state before: a room, a seat, a draft, a photo, the contact */
  assert.equal((await h.call('/api/rooms/join', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', key: 'wedstay/heritage-executive', label: 'A', name: 'Peggy' })).status, 200);
  assert.equal((await h.gr('/api/seating/config', { ...SEAT_FIXTURE, actor: 'test' })).d.ok, true); assert.equal((await h.gr('/api/seating/state', { open: true, actor: 'test' })).d.ok, true);
  const free = seatsOf(validateGeometry(SEAT_FIXTURE).config, 'dinner').filter((s) => !s.family).map((s) => s.seatId);
  assert.equal((await h.call('/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: free[0], name: 'Peggy' })).d.ok, true);
  assert.equal((await h.call('/api/seating/select', h.steffie, { invitationId: 'INV-G002', guestId: 'G002', event: 'dinner', seatId: free[1], name: 'Steffie' })).d.ok, true);
  const dr = await h.call('/api/draft', h.peggy, { invitationId: 'INV-G001', keys: { 'siyl.bag': '[{"id":"wedstay","room":"heritage-executive","unit":"A","price":155}]', 'siyl.temple': '{"by":{"G001":{"attend":"yes"}}}' }, seenReset: epoch }, 'PUT'); assert.equal(dr.status, 200, JSON.stringify(dr.d).slice(0, 120));
  const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  assert.equal((await h.w.fetch(new Request(ORIGIN + '/api/profile/photo', { method: 'PUT', headers: { 'x-siyl-auth': h.peggy, 'content-type': 'image/png' }, body: bytes }), h.env)).status, 200);
  assert.equal((await put(h.peggy, { invitationId: 'INV-G001', email: 'peggy@example.org', phone: '+49 170 1', birthdate: '1990-05-17' })).status, 200);
  assert.equal((await put(h.steffie, { invitationId: 'INV-G002', email: 'steffie@example.org', phone: '+49 170 2', lastName: 'Berger' })).status, 200);
  const before = { rooms: (await h.call('/api/rooms/mine', h.peggy, {}, 'POST')).d, seat: (await h.call('/api/seating/mine', h.peggy, {}, 'POST')).d.mine, draft: (await h.call('/api/draft', h.peggy)).d.draft.keys, kv: [...h.env.REG_KV.m.keys()].sort(), photo: h.env.REG_KV.m.get('avatar:INV-G001').v, steffie: JSON.parse(h.env.REG_KV.m.get('contact:INV-G002').v) };
  /* the correction: Peggy Berger → Peggy Acker, the body forging an identity on the way */
  const r = await put(h.peggy, { invitationId: 'INV-G001', firstName: 'Peggy', lastName: 'Acker', contactId: 'CON999', couple: 'COUPL999', guestId: 'G999' });
  assert.equal(r.status, 200); assert.equal(r.d.contact.firstName, 'Peggy'); assert.equal(r.d.contact.lastName, 'Acker'); assert.equal(r.d.invitationId, 'INV-G001');
  assert.equal(r.d.contact.contactId, undefined); assert.equal(r.d.contact.guestId, undefined);
  const stored = JSON.parse(h.env.REG_KV.m.get('contact:INV-G001').v);
  assert.equal(stored.guestId, 'G001'); assert.equal(stored.invitationId, 'INV-G001'); assert.equal(stored.contactId, undefined); assert.equal(stored.couple, undefined); assert.equal(stored.lastName, 'Acker');
  assert.equal(stored.email, 'peggy@example.org'); assert.equal(stored.birthdate, '1990-05-17', 'the rest of the contact stands');
  /* read back by Peggy; Steffie reads her own, untouched */
  const p2 = await h.call('/api/contact', h.peggy); assert.equal(p2.d.contact.lastName, 'Acker'); assert.equal(p2.d.contact.firstName, 'Peggy');
  const s2 = await h.call('/api/contact', h.steffie); assert.equal(s2.d.invitationId, 'INV-G002'); assert.equal(s2.d.contact.lastName, 'Berger'); assert.equal(s2.d.contact.email, 'steffie@example.org');
  assert.deepEqual(JSON.parse(h.env.REG_KV.m.get('contact:INV-G002').v), before.steffie, 'the partner\'s record byte for byte');
  assert.equal((await put(h.steffie, { invitationId: 'INV-G001', lastName: 'X' })).status, 403, 'a write to the partner\'s invitation is refused');
  assert.equal((await put(null, { invitationId: 'INV-G001', lastName: 'X' })).status, 401);
  /* every other state: identical */
  assert.deepEqual((await h.call('/api/rooms/mine', h.peggy, {}, 'POST')).d, before.rooms, 'the room hold');
  assert.deepEqual((await h.call('/api/seating/mine', h.peggy, {}, 'POST')).d.mine, before.seat, 'the seat');
  assert.deepEqual((await h.call('/api/draft', h.peggy)).d.draft.keys, before.draft, 'the draft');
  assert.deepEqual([...h.env.REG_KV.m.keys()].sort(), before.kv, 'no new record, no new key'); assert.equal(h.env.REG_KV.m.get('avatar:INV-G001').v, before.photo, 'the photo');
  const idx = await (await h.env.ASSETS.fetch(new Request(ORIGIN + '/register/auth-index.json'))).text(); assert.equal(idx, JSON.stringify({ v: 2, entries: Object.fromEntries(Object.entries(JSON.parse(idx).entries)) }), 'the register is not a store the Worker writes');
  assert.deepEqual(JSON.parse(idx).entries[await authIdOf(h.peggy)], { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' }, 'CON003 · COUPL002 · INV-G001 unchanged');
  /* the seat's own name follows through the existing select (the same chair, the same identity), never the partner's */
  assert.equal((await h.call('/api/seating/select', h.peggy, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: free[0], name: 'Peggy' })).d.ok, true);
  const v = (await h.call('/api/seating', h.steffie)).d; const rows = v.dinner.sides.T.concat(v.dinner.sides.B);
  assert.equal(rows.find((s) => s.seatId === free[0]).holder, 'G001'); assert.equal(rows.find((s) => s.seatId === free[1]).name, 'Steffie');
  assert.match(src('src/worker.js'), /const PERSONAL_KEYS = \['firstName', 'lastName', 'birthdate'/);
});
