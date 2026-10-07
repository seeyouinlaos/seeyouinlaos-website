/* ONE PRODUCT, TWO POOLS (Owner, 29 Sep 2026 · 002_Accommodation_Details V / W): Hotel Muse Bangkok · the Jatu Room is ONE
   guest-facing product. Column V is the standard pool — three rooms of two places, for every guest, USD 92.10 per person per
   night. Column W is ONE more Jatu Room, dedicated to one register id (CON005) at an employee rate — USD 116 the room per night,
   USD 232 for the two nights, the whole room hers, never shared, never her party's to split. Synthetic guests only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { page, plain, doState, roomsFetch, PEGGY, src } from './sandbox.mjs';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { Rooms, unitsOf, unitsFor, dedicatedStages } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { GIFTS } from '../src/gifts.js';
import { Drafts } from '../src/drafts.js';

const MUSE = 'kempinski/jatu-room';
const who = (gid, contactId, party, extra) => ({ invitationId: 'INV-' + gid, guestId: gid, partyId: party || ('INV-P' + gid), hosts: false, firstName: 'Test', ...(contactId ? { contactId } : {}), ...(extra || {}) });
const ENTITLED = who('T003', 'CON005', 'INV-P3'), MATE = who('T006', 'CON006', 'INV-P3'), OTHER = who('T020', 'CON020');
const call = async (rooms, op, body, as) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {}, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const view = async (rooms, as) => (await rooms.fetch(new Request('https://x/api/rooms/', { headers: as ? { 'x-siyl-identity': JSON.stringify(as) } : {} }))).json();
const join = (rooms, as, label, extra) => call(rooms, 'join', { invitationId: as.invitationId, guestId: as.guestId, key: MUSE, label, ...(extra || {}) }, as);

test('THE INVENTORY · the Jatu Room is 3 standard rooms of two places + 1 dedicated room of one place (CON005 · employee rate) — one key, one product', () => {
  const s = SEED[MUSE];
  assert.equal(s.capacity, 3); assert.equal(s.occupancy, 2);
  assert.deepEqual(plain(s.dedicated), [{ label: 'D', places: 1, contactId: 'CON005', rate: 'employee' }]);
  assert.deepEqual(unitsOf(MUSE).map((u) => [u.label, u.places, u.dedicatedTo || null]), [['A', 2, null], ['B', 2, null], ['C', 2, null], ['D', 1, 'CON005']]);
  assert.deepEqual(unitsFor(MUSE, OTHER).map((u) => u.label), ['A', 'B', 'C'], 'everyone else: the standard pool alone');
  assert.deepEqual(unitsFor(MUSE, null).map((u) => u.label), ['A', 'B', 'C'], 'signed out: the standard pool alone');
  assert.deepEqual(unitsFor(MUSE, ENTITLED).map((u) => u.label), ['D'], 'the entitled guest: her own room alone');
  assert.deepEqual(dedicatedStages('CON005'), ['kempinski']); assert.deepEqual(dedicatedStages('CON006'), []);
  /* the seed's dedicated room and the employee rate name the same person and the same room */
  const g = GIFTS.find((x) => x.kind === 'employee');
  assert.deepEqual([g.contactId, g.window + '/' + g.room, g.charge, g.per], ['CON005', MUSE, 232, 'room']);
  assert.equal(Object.keys(SEED).filter((k) => k.startsWith('kempinski/')).length, 1, 'no second product');
});

test('THE ENGINE · the standard pool counts 3 rooms for everyone else; the entitled guest sees one room of one place, the whole room; the counts never mix', async () => {
  const rooms = new Rooms(doState());
  const o = await view(rooms, OTHER);
  assert.deepEqual(o.units[MUSE].map((u) => u.label), ['A', 'B', 'C']); assert.equal(o.summary[MUSE].sourceRooms, 3); assert.equal(o.summary[MUSE].remainingPlaces, 6);
  assert.ok(!JSON.stringify(o).includes('CON005'), 'no register id in any view');
  const s = await view(rooms, ENTITLED);
  assert.deepEqual(s.units[MUSE].map((u) => [u.label, u.places, u.dedicated, u.rate]), [['D', 1, true, 'employee']]);
  assert.equal(s.summary[MUSE].sourceRooms, 1); assert.equal(s.summary[MUSE].remainingPlaces, 1);
  const pub = await view(rooms, null); assert.deepEqual(pub.units[MUSE].map((u) => u.label), ['A', 'B', 'C']);
});

test('THE ENGINE · she takes her own room whatever her party size (never a kept place for her party mate); she cannot take A / B / C; nobody else can take hers', async () => {
  const st = doState(), rooms = new Rooms(st);
  /* the standard pool as production holds it (three holds, units A · A · C) */
  await st.storage.put('occ:kempinski/deluxe-balcony-king|A|T048', { invitationId: 'INV-T048', partyId: 'INV-P1', name: 'Test', at: '2026-09-20T08:00:00.000Z' });
  await st.storage.put('occ:kempinski/deluxe-balcony-king|A|T049', { invitationId: 'INV-T049', partyId: 'INV-P1', name: 'Test', at: '2026-09-20T08:00:01.000Z' });
  await st.storage.put('occ:' + MUSE + '|C|T023', { invitationId: 'INV-T023', partyId: 'INV-P2', name: 'Test', at: '2026-09-21T09:30:00.000Z' });
  const before = (await view(rooms, OTHER)).summary[MUSE];
  for (const l of ['A', 'B', 'C']) { const r = await join(rooms, ENTITLED, l, { need: 2 }); assert.equal(r.status, 403, l); assert.equal(r.d.error, 'not your room'); }
  const r = await join(rooms, ENTITLED, 'D', { need: 2 });
  assert.equal(r.status, 200, JSON.stringify(r.d)); assert.deepEqual(r.d.joined, { key: MUSE, label: 'D' });
  const rows = [...st._map.keys()].filter((k) => k.startsWith('occ:' + MUSE + '|D|'));
  assert.deepEqual(rows, ['occ:' + MUSE + '|D|T003'], 'exactly one place, hers — no place kept for her party');
  assert.equal([...st._map.keys()].filter((k) => k.includes('~INV-P3~')).length, 0);
  const mine = await view(rooms, ENTITLED);
  assert.deepEqual(mine.mine, { kempinski: { key: MUSE, label: 'D' } }); assert.equal(mine.units[MUSE][0].full, true);
  /* the standard pool is untouched by her room — same counts, same holds */
  assert.deepEqual((await view(rooms, OTHER)).summary[MUSE], before);
  for (const g of [OTHER, MATE]) { const x = await join(rooms, g, 'D'); assert.equal(x.status, 403, g.guestId); assert.equal(x.d.error, 'not your room'); }
  /* the legacy holds are exactly as they were */
  assert.ok(st._map.has('occ:kempinski/deluxe-balcony-king|A|T048') && st._map.has('occ:kempinski/deluxe-balcony-king|A|T049') && st._map.has('occ:' + MUSE + '|C|T023'));
  /* Guest Relations can assign the dedicated room to its own guest only */
  const bad = await rooms.fetch(new Request('https://x/api/rooms/assign', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify({ occupants: [{ key: MUSE, label: 'D', guestId: 'T020', invitationId: 'INV-T020' }], actor: 'test' }) }));
  assert.deepEqual((await bad.json()).refused.map((x) => x.error), ['dedicated room']);
});

/* THE WORKER: the register id reaches the engine from the bearer alone; the party mate books without her */
async function world() {
  const w = (await import('../src/worker.js')).default;
  const bS = await bearerOf('dedicated-entitled'), bM = await bearerOf('dedicated-mate'), bO = await bearerOf('dedicated-other');
  const entries = {};
  entries[await authIdOf(bS)] = { i: 'INV-T003', g: 'T003', p: 'INV-P3', c: 'CON005', k: 'COUPLT3' };
  entries[await authIdOf(bM)] = { i: 'INV-T006', g: 'T006', p: 'INV-P3', c: 'CON006', k: 'COUPLT3' };
  entries[await authIdOf(bO)] = { i: 'INV-T020', g: 'T020', p: 'INV-P20', c: 'CON020', k: 'SIGL' };
  const index = JSON.stringify({ v: 2, entries });
  const m = new Map(); const kv = { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => ({ value: m.has(k) ? m.get(k).v : null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) };
  const st = doState(), rooms = new Rooms(st), ds = {};
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) },
    REG_KV: kv, GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) } };
  env.DRAFTS = { idFromName: (n) => n, get: (n) => { ds[n] = ds[n] || doState(); const a = new Drafts(ds[n], env); return { fetch: (r) => a.fetch(r) }; } };
  const O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
  const go = (b, p, body, method, extra) => w.fetch(new Request(O + p, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-siyl-auth': b, ...(extra || {}) }, body: body ? JSON.stringify(body) : undefined }), env);
  const scope = JSON.stringify({ scope: { bangkok: true, vientiane: true, china: true, none: false, at: '2026-09-29T00:00:00.000Z', by: 'x' }, guests: {} });
  for (const [b, inv] of [[bS, 'INV-T003'], [bM, 'INV-T006'], [bO, 'INV-T020']]) { const cur = await (await go(b, '/api/draft')).json(); await go(b, '/api/draft', { invitationId: inv, keys: { 'siyl.guest': scope }, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'); }
  return { go, bS, bM, bO, st };
}

test('THE WORKER · the register id comes from the bearer; she sees and takes her own room; her party mate books for himself alone in the stage; another guest never sees her room', async () => {
  const { go, bS, bM, bO, st } = await world();
  const vS = await (await go(bS, '/api/rooms')).json(); assert.deepEqual(vS.units[MUSE].map((u) => u.label), ['D']);
  const vO = await (await go(bO, '/api/rooms')).json(); assert.deepEqual(vO.units[MUSE].map((u) => u.label), ['A', 'B', 'C']);
  const vM = await (await go(bM, '/api/rooms')).json(); assert.deepEqual(vM.units[MUSE].map((u) => u.label), ['A', 'B', 'C']);
  /* a client that claims the register id is not believed */
  const forgedId = { 'x-siyl-identity': JSON.stringify({ invitationId: 'INV-T020', guestId: 'T020', contactId: 'CON005' }) };
  const forged = await (await go(bO, '/api/rooms', null, 'GET', forgedId)).json(); assert.ok(!forged.units[MUSE].some((u) => u.dedicated), 'a claimed identity is dropped');
  assert.equal((await (await go(bO, '/api/rooms/join', { invitationId: 'INV-T020', guestId: 'T020', key: MUSE, label: 'D' }, 'POST', forgedId)).json()).error, 'not your room');
  /* the party's size in the stage: she books alone; he books without her — the rest of the journey still counts them together */
  const tS = (await (await go(bS, '/api/draft')).json()).travel, tM = (await (await go(bM, '/api/draft')).json()).travel;
  assert.equal(tS.need.kempinski, 1); assert.equal(tM.need.kempinski, 1); assert.equal(tM.need.prewed, 2, 'every other stage: the party of two');
  assert.equal(tM.travels.T003.kempinski, false, 'nobody keeps a Hotel Muse place for her'); assert.equal(tM.travels.T003.prewed, true);
  const j = await (await go(bS, '/api/rooms/join', { invitationId: 'INV-T003', guestId: 'T003', key: MUSE, label: 'D' })).json();
  assert.equal(j.ok, true); assert.deepEqual([...st._map.keys()].filter((k) => k.startsWith('occ:')), ['occ:' + MUSE + '|D|T003']);
  const jm = await (await go(bM, '/api/rooms/join', { invitationId: 'INV-T006', guestId: 'T006', key: MUSE, label: 'B', need: 2 })).json();
  assert.equal(jm.ok, true); assert.equal([...st._map.keys()].filter((k) => k.includes('~INV-P3~')).length, 0, 'no place kept for her in his room — no split');
  assert.equal((await (await go(bO, '/api/rooms/join', { invitationId: 'INV-T020', guestId: 'T020', key: MUSE, label: 'D' })).json()).error, 'not your room');
});

test('THE PAGES · her Hotel Muse row: USD 232 for the room, USD 116 per room per night, her own room — no standard rate, no "rooms left", no shared room, no Join; everyone else: the three standard rooms', async () => {
  const rooms = new Rooms(doState());
  const gifts = [{ window: 'kempinski', room: 'jatu-room', kind: 'employee', charge: 232, per: 'room' }];
  const w = page({ auth: { ...PEGGY, guestId: 'T003', invitationId: 'INV-T003', partyId: 'INV-P3' }, fetch: await roomsFetch(rooms, ENTITLED), seed: { 'siyl.gifts': { guestId: 'T003', gifts, at: Date.now() } } });
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, P = w.SIYL_PRICE;
  await U.load(true);
  const q = P.quote('kempinski', 'jatu-room');
  assert.equal(q.total, 232); assert.equal(q.per, 'for the room'); assert.equal(q.nightly, 'USD 116 per room per night'); assert.equal(q.roomNightly, '');
  assert.equal(q.contribution, 'Your employee rate · the whole room, paid by you · 2 nights · USD 116 per room per night');
  const words = [q.amount, q.per, q.nightly, q.contribution, q.basis, q.hostedBasis, U.label('kempinski', 'jatu-room'), ST.unitsHtml('kempinski', 'jatu-room', { need: 2 })].join(' | ');
  assert.doesNotMatch(words, /92\.10|184\.20|listed rate|rooms left|shared room|Join this room|Room A|Room B|Room C/);
  assert.equal(U.label('kempinski', 'jatu-room'), 'Your own room · the whole room, for you alone');
  assert.equal(P.fromLine('kempinski'), 'USD 232 for the room · USD 116 per room per night', 'the stay\'s own line: her room, never the standard rate');
  assert.match(ST.unitsHtml('kempinski', 'jatu-room', { need: 2 }), /Your own room[\s\S]*the whole room · for you alone[\s\S]*Take your room/);
  assert.equal(U.canTake('kempinski', 'jatu-room', 2), true, 'her party size never refuses her own room');
  const r = await ST.select('kempinski', 'jatu-room', null, 2); assert.equal(r.ok, true, JSON.stringify(r));
  await U.load(true);
  assert.equal(U.label('kempinski', 'jatu-room'), 'Held for you · your own room');
  const lines = plain(w.SIYL_BAG.get()).filter((x) => x.id === 'kempinski');
  assert.equal(lines.length, 1, 'one Hotel Muse line'); assert.deepEqual([lines[0].room, lines[0].price, lines[0].personal], ['jatu-room', 232, 'employee']);
  assert.equal(w.SIYL_BAG.total(), 232);
  assert.match(src('journeys.html'), /sub2 = q\.personal==='employee' \? q\.nightly : q\.personal==='prepaid' \? '' : \(q\.nightly \? 'The listed rate: '\+q\.nightly : ''\);/);
  /* an ordinary guest: the standard pool, the standard rate, never her room or her rate */
  const o = page({ auth: { ...PEGGY, guestId: 'T020', invitationId: 'INV-T020', partyId: 'INV-P20' }, fetch: await roomsFetch(rooms, OTHER) });
  await o.SIYL_UNITS.load(true);
  assert.equal(o.SIYL_UNITS.units('kempinski', 'jatu-room').length, 3);
  assert.equal(o.SIYL_UNITS.label('kempinski', 'jatu-room'), '3 of 3 rooms left');
  assert.equal(o.SIYL_PRICE.fromLine('kempinski'), 'USD 184.20 per person · USD 92.10 per person per night');
  const oq = o.SIYL_PRICE.quote('kempinski', 'jatu-room'); assert.equal(oq.total, 184.2); assert.equal(oq.nightly, 'USD 92.10 per person per night');
  assert.doesNotMatch(o.SIYL_STAY.unitsHtml('kempinski', 'jatu-room', { need: 1 }), /Your own room|116|232/);
});
