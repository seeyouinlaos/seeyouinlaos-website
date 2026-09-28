/* THE SIAM KEMPINSKI → HOTEL MUSE BANGKOK (Owner, 28 Sep 2026 · src/legacy-keys.js): a LOSSLESS legacy → canonical reading.
   Every hold, Bag line, sent record and fingerprint that names the former room (kempinski/deluxe-balcony-king) is the same
   selection of Hotel Muse Bangkok, Autograph Collection · the Jatu Room — same guest, same unit, same time, counted once; only
   the canonical key is ever written; a sent trip is not "changed" by the replacement. Synthetic guests only (T0xx, CONT0x). */
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { src, doState, page, plain, PEGGY, ROOT } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { Rooms } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { LEGACY_ROOM_KEYS, LEGACY_SEED, canonicalKey, canonicalLine, lineAs, viewAs } from '../src/legacy-keys.js';
import { composeGuestMail, composeOwnerMail } from '../src/mail-templates.js';

const LEGACY = 'kempinski/deluxe-balcony-king', MUSE = 'kempinski/jatu-room';
const ident = (gid, party) => ({ invitationId: 'INV-' + gid, guestId: gid, partyId: party || ('INV-P' + gid), hosts: false, firstName: 'Test' });
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const view = async (rooms, as) => (await rooms.fetch(new Request('https://x/api/rooms/', { headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {} }))).json();
const kemLine = (extra) => ({ id: 'kempinski', name: 'Siam Kempinski Bangkok', meta: '6 – 8 March 2027 · Deluxe Balcony King', price: 380, stay: 'kempinski', room: 'deluxe-balcony-king', rate: 190, nights: 2, pay: 2, breakfast: 'Breakfast included', img: 'assets/images/journey/kempinski-01.jpg', qty: 1, ...(extra || {}) });

/* the production shape of 28 Sep 2026: two guests of one party in unit A, one guest in unit C, all under the former key */
async function legacyEngine() {
  const st = doState();
  const at = { T048: '2026-09-20T08:00:00.000Z', T049: '2026-09-20T08:00:01.000Z', T023: '2026-09-21T09:30:00.000Z' };
  await st.storage.put('occ:' + LEGACY + '|A|T048', { invitationId: 'INV-T048', partyId: 'INV-P1', name: 'Test', at: at.T048 });
  await st.storage.put('occ:' + LEGACY + '|A|T049', { invitationId: 'INV-T049', partyId: 'INV-P1', name: 'Test', at: at.T049 });
  await st.storage.put('occ:' + LEGACY + '|C|T023', { invitationId: 'INV-T023', partyId: 'INV-P2', name: 'Test', at: at.T023 });
  return { st, rooms: new Rooms(st), at };
}

test('THE MAP · one legacy key, its canonical successor in the seed, the former key in no seed; server and client carry the same map', () => {
  assert.deepEqual(plain(LEGACY_ROOM_KEYS), { [LEGACY]: MUSE });
  assert.ok(SEED[MUSE], 'the canonical key is bookable'); assert.equal(SEED[LEGACY], undefined, 'the former key is never offered');
  assert.equal(SEED[MUSE].name, 'Jatu Room'); assert.equal(SEED[MUSE].stay, 'Hotel Muse Bangkok, Autograph Collection');
  assert.equal(LEGACY_SEED[LEGACY].name, 'Deluxe Balcony King');
  assert.equal(canonicalKey(LEGACY), MUSE); assert.equal(canonicalKey(MUSE), MUSE); assert.equal(canonicalKey('prewed/heritage'), 'prewed/heritage');
  const w = page({ auth: PEGGY });
  const client = {}; for (const [win, m] of Object.entries(plain(w.SIYL_PRICE.LEGACY_ROOMS))) for (const [a, b] of Object.entries(m)) client[win + '/' + a] = win + '/' + b;
  assert.deepEqual(client, plain(LEGACY_ROOM_KEYS), 'assets/pricing.js and src/legacy-keys.js say the same');
  /* the server's canonical amount is the room data's */
  const jr = w.SIYL_ROOMS.muse.rooms.find((r) => r.slug === 'jatu-room');
  const c = canonicalLine(kemLine()); assert.equal(c.rate, jr.rate); assert.equal(c.price, w.SIYL_PRICE.quote('kempinski', 'jatu-room').total);
});

test('THE ENGINE · the three legacy holds read as Hotel Muse Bangkok\'s Jatu Room — same guests, same units, counted once; nothing is written by reading', async () => {
  const { st, rooms } = await legacyEngine();
  const before = JSON.stringify([...st._map]);
  const v = await view(rooms, ident('T023', 'INV-P2'));
  assert.equal(v.units[LEGACY], undefined, 'no unit of the former key');
  const units = v.units[MUSE];
  assert.deepEqual(units.map((u) => [u.label, u.occupants.length]), [['A', 2], ['B', 0], ['C', 1]]);
  assert.equal(v.summary[MUSE].guestOccupiedPlaces !== undefined ? v.summary[MUSE].guestOccupiedPlaces : 3, 3);
  assert.equal(v.summary[MUSE].remainingPlaces, 3, 'six places, three taken — once');
  assert.deepEqual(v.mine, { kempinski: { key: MUSE, label: 'C' } });
  for (const g of ['T048', 'T049']) assert.deepEqual((await view(rooms, ident(g, 'INV-P1'))).mine, { kempinski: { key: MUSE, label: 'A' } });
  assert.equal(JSON.stringify([...st._map].filter(([k]) => k.startsWith('occ:'))), JSON.stringify(JSON.parse(before).filter(([k]) => k.startsWith('occ:'))), 'reading never re-keys, releases or re-holds');
  /* a full unit is full: A has its two places */
  const r = await call(rooms, 'join', { invitationId: 'INV-T900', guestId: 'T900', key: MUSE, label: 'A' }, ident('T900'));
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  const plan = await call(rooms, 'plan', {}, null);
  if (plan.status === 200 && plan.d.units) assert.equal(plan.d.units[LEGACY], undefined);
});

test('THE ENGINE · a guest\'s own write re-keys their hold to the canonical key with its own time — no second place, no release, idempotent; a legacy key sent by an old page is written as the canonical one', async () => {
  const { st, rooms, at } = await legacyEngine();
  const me = ident('T023', 'INV-P2');
  for (let n = 0; n < 2; n++) {   /* twice: the second changes nothing */
    const r = await call(rooms, 'join', { invitationId: me.invitationId, guestId: me.guestId, key: MUSE, label: 'C' }, me);
    assert.equal(r.status, 200, JSON.stringify(r.d));
    const rows = [...st._map.keys()].filter((k) => k.startsWith('occ:') && k.endsWith('|T023'));
    assert.deepEqual(rows, ['occ:' + MUSE + '|C|T023'], 'one row, the canonical key');
    assert.equal(st._map.get(rows[0]).at, at.T023, 'the hold keeps its own time');
    assert.equal((await view(rooms, me)).summary[MUSE].remainingPlaces, 3, 'still three taken');
  }
  /* an old page asks with the former key: the canonical key is written */
  const nw = ident('T777');
  const r = await call(rooms, 'join', { invitationId: nw.invitationId, guestId: nw.guestId, key: LEGACY, label: 'B' }, nw);
  assert.equal(r.status, 200); assert.deepEqual(r.d.joined, { key: MUSE, label: 'B' });
  assert.ok(st._map.has('occ:' + MUSE + '|B|T777')); assert.ok(![...st._map.keys()].some((k) => k.includes(LEGACY) && k.endsWith('T777')));
  /* a release reaches the row where it really lives */
  const t48 = ident('T048', 'INV-P1');
  const l = await call(rooms, 'leave', { invitationId: t48.invitationId, guestId: t48.guestId, key: MUSE }, t48);
  assert.equal(l.status, 200); assert.deepEqual(l.d.released, [{ key: MUSE, label: 'A' }]);
  assert.equal(st._map.has('occ:' + LEGACY + '|A|T048'), false);
  assert.equal((await view(rooms, t48)).summary[MUSE].remainingPlaces, 3, 'T777 took B, T048 gave A back: T049 · T777 · T023');
});

test('THE BAG · a saved Kempinski line loads as the Jatu Room line — still selected, its unit kept, one line, today\'s ordinary rate; nothing asks to choose again', () => {
  const w = page({ auth: PEGGY, seed: { 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, kemLine({ unit: 'A', unitName: 'Room A' })]) } });
  const bag = plain(w.SIYL_BAG.get()), k = bag.filter((x) => x.id === 'kempinski');
  assert.equal(k.length, 1, 'no duplicate');
  assert.deepEqual([k[0].room, k[0].stay, k[0].name, k[0].meta, k[0].price, k[0].unit], ['jatu-room', 'muse', 'Hotel Muse Bangkok, Autograph Collection', '6 – 8 March 2027 · Jatu Room', 184.2, 'A']);
  assert.doesNotMatch(JSON.stringify(bag), /Kempinski|deluxe-balcony|kempinski-01/);
  assert.equal(w.SIYL_PRICE.known({ id: 'kempinski', room: 'deluxe-balcony-king' }), true, 'the former room is known — never dropped as withdrawn');
  assert.equal(w.SIYL_BAG.total(), 284.2);
  const J = w.SIYL_JOURNEY; const seg = J.SEGMENTS.find((s) => s.key === 'kempinski'); assert.equal(J.state(seg), 'selected');
});

test('A PERSONAL RATE THROUGH THE ALIAS · an entitled guest\'s Kempinski line is the Jatu Room at their employee rate — USD 232, the whole room, paid by them; nobody else sees it', () => {
  const gifts = [{ window: 'kempinski', room: 'jatu-room', kind: 'employee', charge: 232, per: 'room' }];
  const holder = page({ auth: { ...PEGGY, guestId: 'T003' }, seed: { 'siyl.gifts': { guestId: 'T003', gifts, at: Date.now() }, 'siyl.bag': JSON.stringify([kemLine({ unit: 'B' })]) } });
  const l = plain(holder.SIYL_BAG.get())[0];
  assert.deepEqual([l.room, l.price, l.personal, l.unit], ['jatu-room', 232, 'employee', 'B']);
  const q = holder.SIYL_PRICE.quote('kempinski', 'jatu-room'); assert.equal(q.total, 232); assert.equal(q.per, 'for the room'); assert.match(q.personalWords, /employee rate · the whole room, paid by you/);
  /* her partner and every other guest — even on the same browser — the ordinary Hotel Muse rate */
  for (const gid of ['T006', 'g-peggy']) {
    const o = page({ auth: { ...PEGGY, guestId: gid }, seed: { 'siyl.gifts': { guestId: 'T003', gifts, at: Date.now() }, 'siyl.bag': JSON.stringify([kemLine({ personal: 'employee', price: 232 })]) } });
    const x = plain(o.SIYL_BAG.get())[0]; assert.equal(x.price, 184.2, gid); assert.equal(x.personal, undefined, gid);
    assert.equal(o.SIYL_PRICE.quote('kempinski', 'jatu-room').total, 184.2);
  }
});

test('THE EMAILS AND THE SENT TRIP · a record that names the former room reads as Hotel Muse Bangkok · the Jatu Room at today\'s amount; no Kempinski in any email', () => {
  const rec = { invitationId: 'INV-T049', submissionId: 'S-1', submittedAt: '2026-09-27T10:00:00.000Z', version: 1, rooms: { kempinski: { stage: 'kempinski', key: LEGACY, label: 'A', name: 'Deluxe Balcony King', stay: null, room: 'Room A' } },
    registration: complete({ channel: 'journey-shop', guestId: 'T049', partyId: 'INV-P1', selections: [{ id: 'train', price: 100, qty: 1 }, kemLine({ unit: 'A' })], totalUsd: 480, contact: { email: 'x@example.org', phone: '+66 81 000 0000' },
      guestRecord: { guests: [{ guestId: 'T049', name: 'Test', source: { fullName: 'Test Example', preferredName: 'Test' } }] } }) };
  const g = composeGuestMail(rec, { origin: 'https://example.org' }), o = composeOwnerMail(rec, { origin: 'https://example.org' });
  const all = JSON.stringify(g) + JSON.stringify(o);
  assert.doesNotMatch(all, /Kempinski|Deluxe Balcony/);
  assert.match(all, /Hotel Muse Bangkok, Autograph Collection/); assert.match(all, /Jatu Room/);
  assert.match(all, /284\.20|284\.2\b/, 'the total from the lines: USD 100 + USD 184.20');
  assert.doesNotMatch(all, /USD 480\b|USD 380\b/);
  /* the pure mappers: only the room, the stay and the view's naming change, the key order is kept */
  const legacyForm = lineAs(canonicalLine(kemLine()), 'legacy'); assert.equal(legacyForm.room, 'deluxe-balcony-king'); assert.equal(legacyForm.stay, 'kempinski');
  assert.deepEqual(Object.keys(canonicalLine(kemLine())), Object.keys(kemLine()).filter((k) => k !== 'img'));
  const v = { stage: 'kempinski', key: MUSE, label: 'A', name: 'Jatu Room', stay: 'Hotel Muse Bangkok, Autograph Collection', room: 'Room A' };
  assert.deepEqual(viewAs(v, 'legacy', SEED), { stage: 'kempinski', key: LEGACY, label: 'A', name: 'Deluxe Balcony King', stay: null, room: 'Room A' });
  assert.deepEqual(viewAs(viewAs(v, 'legacy', SEED), 'canonical', SEED), v);
});

test('THE PAGES AND THE WORKER CARRY IT · the engine view, the join, the record, the sent lines, the overview and the emails all read the successor', () => {
  const w = src('src/worker.js');
  assert.match(w, /registration\.selections = verifiedLines\(canonicalLines\(registration\.selections\), giftsFor/);
  assert.match(w, /sentSelections: Array\.isArray\(reg\.selections\) \? canonicalLines\(reg\.selections\) : \[\]/);
  assert.match(w, /const entry = \(m, stage\) => \{ m = \{ \.\.\.m, key: canonicalKey\(m\.key\) \};/);
  assert.match(w, /if \(unsent\) for \(const f2 of await otherForms\(\)\) if \(record\.selectionFingerprint === f2\.v3\)/);
  const r = src('src/rooms.js');
  assert.match(r, /const key = canonicalKey\(parts\[0\]\);/); assert.doesNotMatch(r, /storage\.delete\(this\.keyOf\(/, 'every release reaches the row where it lives');
  assert.match(src('assets/stay.js'), /p\.canonicalRoom \? p\.canonicalRoom\(p\.windowOf\(x\.id\), x\.room\) : x\.room/);
});

async function migrationWorld(name) {
  const dir = mkdtempSync(path.join(tmpdir(), 'siyl-pre-'));
  execFileSync('sh', ['-c', `git archive ${PRE} src register | tar -x -C "${dir}"`], { cwd: ROOT });
  const Old = await import(path.join(dir, 'src/worker.js')), New = await import('../src/worker.js');
  const bearer = await bearerOf(name);
  const entries = { [await authIdOf(bearer)]: { i: 'INV-T901', g: 'T901', p: 'INV-P901', c: 'CONT01', k: 'SIGL' } };
  const index = JSON.stringify({ v: 2, entries });
  const m = new Map(); const kv = { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => ({ value: m.has(k) ? m.get(k).v : null, metadata: m.has(k) ? m.get(k).meta || null : null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name, metadata: m.get(name).meta || null })), list_complete: true }) };
  const roomsState = doState(), draftStates = {};
  const envOf = (mod) => { const rooms = new mod.Rooms(roomsState); const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) },
    REG_KV: kv, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) } };
    env.DRAFTS = { idFromName: (n) => n, get: (n) => { draftStates[n] = draftStates[n] || doState(); const a = new mod.Drafts(draftStates[n], env); return { fetch: (r) => a.fetch(r) }; } }; return env; };
  const realFetch = globalThis.fetch; globalThis.fetch = async (u, i) => (/api\.brevo\.com/.test(String(u)) ? new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }) : realFetch(u, i));
  const O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  const go = (mod, env, p, body, method) => mod.default.fetch(new Request(O + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-siyl-auth': bearer }, body: body ? JSON.stringify(body) : undefined }), env);
  const putDraft = async (mod, env, keys) => { const cur = await (await go(mod, env, '/api/draft')).json(); return go(mod, env, '/api/draft', { invitationId: 'INV-T901', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'); };
  const status = async (mod, env) => (await (await go(mod, env, '/api/draft')).json()).submission.submissionStatus;
  return { dir, Old, New, envOf, go, putDraft, status, m, kv, roomsState, done: () => { globalThis.fetch = realFetch; rmSync(dir, { recursive: true, force: true }); } };
}
/* THE REAL MIGRATION: the pre-release Worker (e0ab452, the last production build that knew the Siam Kempinski) takes the hold and
   sends the trip; the release reads the same stores. Skipped only where that commit is not in the local history. */
const PRE = 'e0ab452';
let preTree = null;
try { execFileSync('git', ['cat-file', '-e', PRE + '^{commit}'], { cwd: ROOT, stdio: 'ignore' }); preTree = PRE; } catch (e) { preTree = null; }
test('THE MIGRATION, END TO END · a trip sent with the Kempinski hold before the release is SENT after it, its hold the Jatu Room\'s, counted once; a real change still counts', { skip: !preTree && 'the pre-release commit is not in this history' }, async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'siyl-pre-'));
  try {
    execFileSync('sh', ['-c', `git archive ${PRE} src register | tar -x -C "${dir}"`], { cwd: ROOT });
    const Old = await import(path.join(dir, 'src/worker.js')), New = await import('../src/worker.js');
    const bearer = await bearerOf('legacy-muse-guest');
    const entries = { [await authIdOf(bearer)]: { i: 'INV-T901', g: 'T901', p: 'INV-P901', c: 'CONT01', k: 'SIGL' } };
    const index = JSON.stringify({ v: 2, entries });
    const m = new Map(); const kv = { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => ({ value: m.has(k) ? m.get(k).v : null, metadata: m.has(k) ? m.get(k).meta || null : null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name, metadata: m.get(name).meta || null })), list_complete: true }) };
    const roomsState = doState(), draftStates = {};
    const envOf = (mod) => { const rooms = new mod.Rooms(roomsState); const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) },
      REG_KV: kv, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) } };
      env.DRAFTS = { idFromName: (n) => n, get: (n) => { draftStates[n] = draftStates[n] || doState(); const a = new mod.Drafts(draftStates[n], env); return { fetch: (r) => a.fetch(r) }; } }; return env; };
    const realFetch = globalThis.fetch; globalThis.fetch = async (u, i) => (/api\.brevo\.com/.test(String(u)) ? new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }) : realFetch(u, i));
    const O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
    const go = (mod, env, p, body, method) => mod.default.fetch(new Request(O + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-siyl-auth': bearer }, body: body ? JSON.stringify(body) : undefined }), env);
    const putDraft = async (mod, env, keys) => { const cur = await (await go(mod, env, '/api/draft')).json(); return go(mod, env, '/api/draft', { invitationId: 'INV-T901', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'); };
    const status = async (mod, env) => (await (await go(mod, env, '/api/draft')).json()).submission.submissionStatus;
    try {
      /* BEFORE: the pre-release build takes the Kempinski hold and sends the trip */
      const eo = envOf(Old);
      await kv.put('contact:INV-T901', JSON.stringify({ invitationId: 'INV-T901', guestId: 'T901', email: 'legacy@example.org', phone: '+66 81 000 0000', birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland', at: '2026-09-27T09:00:00.000Z' }));
      const j = await (await go(Old, eo, '/api/rooms/join', { invitationId: 'INV-T901', guestId: 'T901', key: LEGACY, label: 'A' })).json();
      assert.equal(j.ok, true, JSON.stringify(j).slice(0, 200));
      const guest = JSON.stringify({ contact: { email: 'legacy@example.org', phone: '+66 81 000 0000' }, guests: { T901: { submitted: {}, profile: { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Amélie' } } } });
      const oldBag = [{ id: 'train', price: 100, qty: 1 }, kemLine({ unit: 'A', unitName: 'Room A' })];
      await putDraft(Old, eo, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify(oldBag) });
      const reg = complete({ channel: 'journey-shop', guestId: 'T901', partyId: 'INV-P901', selections: oldBag, totalUsd: 480, contact: { email: 'legacy@example.org', phone: '+66 81 000 0000' }, guestRecord: { guests: [{ guestId: 'T901', name: 'Test', source: { fullName: 'Test Example', preferredName: 'Test' } }] } });
      const sent = await go(Old, eo, '/api/register', { invitationId: 'INV-T901', registration: reg, text: 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-T901' });
      assert.equal(sent.status, 202, (await sent.clone().text()).slice(0, 300));
      assert.equal(await status(Old, eo), 'sent');
      const recBefore = m.get('reg:INV-T901').v;
      /* AFTER: the release reads the same stores — nothing written, nothing asked */
      const en = envOf(New);
      assert.equal(await status(New, en), 'sent', 'the replacement alone never reads as a change');
      const mine = (await (await go(New, en, '/api/rooms/mine')).json()).mine;
      assert.deepEqual(mine, { kempinski: { key: MUSE, label: 'A' } });
      /* the device loads the Bag: the line becomes the Jatu Room's (as assets/pricing.js writes it) */
      await putDraft(New, en, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([oldBag[0], { ...canonicalLine(oldBag[1]), img: 'assets/images/muse/hotel-1.jpg' }]) });
      assert.equal(await status(New, en), 'sent', 'the canonical line of the same room is the same selection');
      /* the overview reads it the same way, and shows no Kempinski */
      const gr = await (await New.default.fetch(new Request(O + '/api/gr/journeys', { headers: { 'x-gr-token': 'gr-secret' } }), en)).json();
      const row = gr.journeys.find((x) => x.invitationId === 'INV-T901');
      assert.equal(row.status, 'sent'); assert.equal(row.rooms.kempinski.key, MUSE); assert.doesNotMatch(JSON.stringify(row.bag), /Kempinski|deluxe-balcony/);
      /* the guest re-confirms the same unit: re-keyed once, counted once, still sent */
      await go(New, en, '/api/rooms/join', { invitationId: 'INV-T901', guestId: 'T901', key: MUSE, label: 'A' });
      assert.deepEqual([...roomsState._map.keys()].filter((k) => k.startsWith('occ:')), ['occ:' + MUSE + '|A|T901']);
      assert.equal(await status(New, en), 'sent');
      assert.equal(m.get('reg:INV-T901').v === recBefore || JSON.parse(m.get('reg:INV-T901').v).submissionId === JSON.parse(recBefore).submissionId, true, 'the sent record is never regenerated');
      /* a real change still counts */
      await putDraft(New, en, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([oldBag[0]]) });
      assert.equal(await status(New, en), 'changes-not-sent');
    } finally { globalThis.fetch = realFetch; }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('AN OLDER RECORD (no selection fingerprint) · a trip sent before the live 002 corrected U Sathorn\'s rate is still SENT when only the rate moved; a real change still counts', { skip: !preTree && 'the pre-release commit is not in this history' }, async () => {
  const W = await migrationWorld('legacy-muse-older');
  try {
    const eo = W.envOf(W.Old);
    await W.kv.put('contact:INV-T901', JSON.stringify({ invitationId: 'INV-T901', guestId: 'T901', email: 'older@example.org', phone: '+66 81 000 0000', birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland', at: '2026-09-27T09:00:00.000Z' }));
    assert.equal((await (await W.go(W.Old, eo, '/api/rooms/join', { invitationId: 'INV-T901', guestId: 'T901', key: 'bkk-stay/u-sathorn-superior-garden', label: 'A' })).json()).ok, true);
    const guest = JSON.stringify({ contact: { email: 'older@example.org', phone: '+66 81 000 0000' }, guests: { T901: { submitted: {}, profile: { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Amélie' } } } });
    const line = (rate) => ({ id: 'bkk-stay', name: 'U Sathorn Bangkok', meta: '21 – 24 February 2027 · Superior Garden View', price: Math.round(rate * 3 * 100) / 100, stay: 'sathorn', room: 'u-sathorn-superior-garden', rate, nights: 3, pay: 3, breakfast: 'Breakfast included', qty: 1, unit: 'A' });
    const oldBag = [{ id: 'train', price: 100, qty: 1 }, line(64)];
    await W.putDraft(W.Old, eo, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify(oldBag) });
    const reg = complete({ channel: 'journey-shop', guestId: 'T901', partyId: 'INV-P901', selections: oldBag, totalUsd: 292, contact: { email: 'older@example.org', phone: '+66 81 000 0000' }, guestRecord: { guests: [{ guestId: 'T901', name: 'Test', source: { fullName: 'Test Example', preferredName: 'Test' } }] } });
    assert.equal((await W.go(W.Old, eo, '/api/register', { invitationId: 'INV-T901', registration: reg, text: 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-T901' })).status, 202);
    /* an older record: the selection fingerprint is not there yet */
    const rec = JSON.parse(W.m.get('reg:INV-T901').v); delete rec.selectionFingerprint; rec.fingerprintVersion = 2; W.m.set('reg:INV-T901', { v: JSON.stringify(rec) });
    const en = W.envOf(W.New);
    await W.putDraft(W.New, en, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([oldBag[0], line(67.805)]) });
    assert.equal(await W.status(W.New, en), 'sent', 'the corrected rate alone is not a change of the guest\'s');
    await W.putDraft(W.New, en, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([oldBag[0]]) });
    assert.equal(await W.status(W.New, en), 'changes-not-sent');
  } finally { W.done(); }
});
