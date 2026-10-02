/* THE WHOLE WEDDING IS FIFTY PEOPLE, THE COUPLE INCLUDED · THE WEDDING CIRCLE IS THE SHARED VIEW (Owner, 2 Oct 2026).
   Haruthai and Suthep are two of the fifty: the ceremony is their two fixed places at the front centre + 48 guest chairs, the dinner
   fifty chairs, two of them theirs. Every signed-in participant sees who is joining, who sits where at both events and who stays
   where — never a code, an email, a phone number, an invitation id, a rate or a unit label. Seeing a seat never means changing it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { Seating, validateGeometry, seatsOf, retiredCeremony, CAPACITY, RULES, WEDDING_PEOPLE } from '../src/seating.js';
import { Rooms } from '../src/rooms.js';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, src, doState, PEGGY, HARUTHAI, SUTHEP } from './sandbox.mjs';

const two = (n) => String(n).padStart(2, '0');
/* the production grid as Guest Relations uploaded it: 10 × 2 + 10 × 3 positions, fifty dinner chairs */
const GRID = { ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) GRID.ceremony.rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1) })) });
for (const k of ['T', 'B']) for (let n = 1; n <= 26; n++) if (n !== 13) GRID.dinner.sides[k].push({ seatId: 'D-' + k + '-' + two(n) });
/* the 29 ceremony chairs held in production on 2 Oct 2026 (rows 1 – 7), by fictional guests */
const LIVE = ['C-L-01-01', 'C-L-01-02', 'C-R-01-03', 'C-L-02-01', 'C-L-02-02', 'C-R-02-01', 'C-R-02-02', 'C-L-03-01', 'C-L-03-02', 'C-R-03-01', 'C-R-03-02', 'C-R-03-03', 'C-L-04-01', 'C-L-04-02',
  'C-R-04-01', 'C-R-04-02', 'C-L-05-01', 'C-L-05-02', 'C-R-05-01', 'C-R-05-02', 'C-R-05-03', 'C-L-06-01', 'C-L-06-02', 'C-R-06-01', 'C-R-06-02', 'C-L-07-01', 'C-L-07-02', 'C-R-07-01', 'C-R-07-02'];
const COUPLE = { BRIDE: { g: 'G048', p: 'INV-001', n: 'Haruthai' }, GROOM: { g: 'G049', p: 'INV-001', n: 'Suthep' } };
const ID = (g, p, firstName) => ({ invitationId: 'INV-' + g, guestId: g, partyId: p, firstName });
const BRIDE_ID = ID('G048', 'INV-001', 'Haruthai'), GROOM_ID = ID('G049', 'INV-001', 'Suthep'), ADA = ID('G101', 'INV-101', 'Ada'), BEN = ID('G102', 'INV-102', 'Ben');
function storage() { const m = new Map(); return { m, async get(k) { return m.get(k); }, async put(k, v) { m.set(k, v); }, async delete(k) { m.delete(k); }, async list({ prefix }) { const o = new Map(); for (const [k, v] of m) if (k.startsWith(prefix)) o.set(k, v); return o; } }; }
function ledger() { const st = storage(); const l = new Seating({ storage: st, blockConcurrencyWhile: (fn) => fn() }); l.st = st; return l; }
const call = (l, op, body, o = {}) => l.fetch(new Request('https://x/api/seating/' + op + (o.q || ''), { method: body ? 'POST' : 'GET',
  headers: { ...(o.gr ? { 'x-gr-verified': 'yes' } : {}), ...(o.as ? { 'x-siyl-identity': JSON.stringify(o.as) } : {}), ...(o.couple === false ? {} : { 'x-siyl-couple': JSON.stringify(COUPLE) }) }, body: body ? JSON.stringify(body) : undefined }))
  .then(async (r) => ({ status: r.status, ...(await r.json()) }));
async function live() {
  const l = ledger();
  assert.equal((await call(l, 'config', GRID, { gr: true })).ok, true);
  await call(l, 'state', { open: true }, { gr: true });
  LIVE.forEach((id, i) => l.st.m.set('hold:ceremony:' + id, { invitationId: 'INV-G' + (200 + i), guestId: 'G' + (200 + i), partyId: 'INV-G' + (200 + i), name: 'Guest' + i, at: '2026-09-20T10:00:00.000Z', state: 'held' }));
  l.st.m.set('hold:dinner:D-B-11', { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', name: 'Suthep', state: 'held' });
  l.st.m.set('hold:dinner:D-B-12', { invitationId: 'INV-G048', guestId: 'G048', partyId: 'INV-001', name: 'Haruthai', state: 'held' });
  return l;
}
const flat = (v) => v.ceremony.rows.flatMap((r) => r.seats);

test('FIFTY · one definition everywhere: the wedding, the ceremony (48 guest chairs + the Bride + the Groom) and the dinner (50, the couple among them) — never 51, never 52', () => {
  assert.equal(WEDDING_PEOPLE, 50);
  assert.equal(CAPACITY.ceremony.guestSeats + CAPACITY.ceremony.couple, 50); assert.equal(CAPACITY.ceremony.totalPeople, 50); assert.equal(CAPACITY.ceremony.couple, RULES.ceremony.fixed.length);
  assert.equal(CAPACITY.ceremony.left + CAPACITY.ceremony.right, CAPACITY.ceremony.guestSeats);
  assert.equal(CAPACITY.dinner.guestSeats, 50); assert.equal(CAPACITY.dinner.totalPeople, 50);
  const w = src('src/worker.js');
  assert.match(w, /const WEDDING_CAPACITY = WEDDING_PEOPLE;/); assert.doesNotMatch(w, /WEDDING_CAPACITY = 5[12]/);
  const c = seatsOf(validateGeometry(GRID).config, 'ceremony', {});
  assert.equal(c.length + RULES.ceremony.fixed.length, 50, 'no hidden 51st or 52nd ceremony place');
});

test('THE LIVE PLAN · every one of the 29 held ceremony chairs keeps its id, its holder and its place; the two retired positions are unheld (A10, B10); the plan is 48 + the couple = 50', async () => {
  const l = await live();
  const v = await call(l, 'read', null, { as: ADA }), seats = flat(v);
  assert.equal(seats.length, 48); assert.equal(v.ceremony.couple.length, 2); assert.equal(v.ceremony.totalPeople, 50);
  for (const id of LIVE) { const s = seats.find((x) => x.seatId === id); assert.ok(s, id + ' is on the plan'); assert.equal(s.state, 'taken'); assert.ok(s.holder && s.name, id + ' is named'); }
  assert.deepEqual([...retiredCeremony(await l.config(), Object.fromEntries(LIVE.map((id) => [id, {}])))].sort(), ['C-L-10-01', 'C-L-10-02']);
  assert.ok(!seats.some((s) => s.seatId === 'C-L-10-01' || s.seatId === 'C-L-10-02'));
  assert.equal(seats.filter((s) => s.state === 'taken').length, 29, 'nothing moved, nothing lost');
  /* a retired position cannot be held, by a guest or by Guest Relations */
  assert.equal((await call(l, 'select', { invitationId: ADA.invitationId, guestId: ADA.guestId, event: 'ceremony', seatId: 'C-L-10-01' }, { as: ADA })).status, 404);
  assert.equal((await call(l, 'assign', { invitationId: ADA.invitationId, guestId: ADA.guestId, event: 'ceremony', seatId: 'C-L-10-02' }, { gr: true })).status, 404);
  const plan = await call(l, 'plan', null, { gr: true });
  assert.equal(plan.events.ceremony.guestSeats, 48); assert.equal(plan.events.ceremony.capacity.totalPeople, 50);
  assert.deepEqual(plan.events.ceremony.couple.map((c) => [c.position, c.guestId]), [['BRIDE', 'G048'], ['GROOM', 'G049']]);
  assert.equal(plan.events.dinner.seats.length, 50); assert.equal(plan.events.dinner.held, 2, 'the couple\'s two dinner chairs, inside the fifty');
});

test('NEVER AN OCCUPIED CHAIR · a hold that sits on a retirement candidate keeps it: the next unheld position is retired instead, the guest keeps chair, name and `mine`; re-uploading the grid keeps every hold', async () => {
  const l = await live();
  l.st.m.set('hold:ceremony:C-L-10-01', { invitationId: 'INV-G300', guestId: 'G300', partyId: 'INV-G300', name: 'Late', state: 'held' });
  const me = ID('G300', 'INV-G300', 'Late');
  const v = await call(l, 'read', null, { as: me }), seats = flat(v);
  assert.equal(seats.length, 48, 'still 48 guest chairs'); assert.equal(seats.find((s) => s.seatId === 'C-L-10-01').state, 'yours');
  assert.equal(v.mine.ceremony.G300, 'C-L-10-01', 'the fingerprint source keeps the chair');
  assert.ok(!seats.some((s) => s.seatId === 'C-L-10-02' || s.seatId === 'C-R-10-03'), 'B10 and F10 retired instead');
  assert.equal((await call(l, 'config', GRID, { gr: true })).ok, true);
  assert.equal(l.st.m.get('hold:ceremony:C-L-10-01').guestId, 'G300', 're-uploading the grid deletes no hold');
  for (const id of LIVE) assert.ok(l.st.m.has('hold:ceremony:' + id), id);
});

test('THE COUPLE\'S PLACES · fixed, theirs, never anyone else\'s: nobody selects BRIDE / GROOM; the couple cannot take an ordinary ceremony chair (by themselves or by Guest Relations); their dinner chair is chosen like everyone\'s', async () => {
  const l = await live();
  for (const id of ['BRIDE', 'GROOM']) assert.equal((await call(l, 'select', { invitationId: ADA.invitationId, guestId: ADA.guestId, event: 'ceremony', seatId: id }, { as: ADA })).status, 404, id);
  const r = await call(l, 'select', { invitationId: GROOM_ID.invitationId, guestId: 'G049', event: 'ceremony', seatId: 'C-R-08-01' }, { as: GROOM_ID });
  assert.equal(r.status, 409); assert.match(r.error, /fixed/);
  assert.equal((await call(l, 'assign', { invitationId: 'INV-G048', guestId: 'G048', event: 'ceremony', seatId: 'C-R-08-02' }, { gr: true })).status, 409);
  assert.equal((await call(l, 'select', { invitationId: GROOM_ID.invitationId, guestId: 'G049', event: 'dinner', seatId: 'D-T-01' }, { as: GROOM_ID })).ok, true, 'the dinner is an ordinary chair');
  /* a forged couple header is the Worker's to strip — the ledger trusts only what it is given; without it nobody is the couple */
  const v = await call(l, 'read', null, { as: ADA, couple: false });
  assert.deepEqual(v.ceremony.couple.map((c) => [c.position, c.holder]), [['BRIDE', undefined], ['GROOM', undefined]]);
});

test('SUTHEP AND HARUTHAI SEE THE WHOLE CEREMONY · their own place marked as theirs, the partner\'s as their party\'s, every held chair named — the same plan every guest reads', async () => {
  const l = await live();
  for (const [me, own, other] of [[GROOM_ID, 'GROOM', 'BRIDE'], [BRIDE_ID, 'BRIDE', 'GROOM']]) {
    const v = await call(l, 'read', null, { as: me });
    const c = Object.fromEntries(v.ceremony.couple.map((x) => [x.position, x]));
    assert.equal(c[own].state, 'yours'); assert.equal(c[own].holder, me.guestId); assert.equal(c[other].state, 'party');
    assert.equal(flat(v).length, 48); assert.equal(flat(v).filter((s) => s.name && s.holder).length, 29, me.firstName + ' sees who sits where');
  }
  /* `mine` (the source of every journey fingerprint and seat ticket) is untouched: the couple's places are not ledger holds */
  assert.deepEqual(JSON.parse(JSON.stringify((await call(l, 'read', null, { as: GROOM_ID })).mine)), { ceremony: {}, dinner: { G049: 'D-B-11' } });
  const g = await call(l, 'read', null, { as: ADA });
  assert.deepEqual(g.ceremony.couple.map((x) => [x.position, x.state, x.name]), [['BRIDE', 'couple', 'Haruthai'], ['GROOM', 'couple', 'Suthep']]);
  const anon = await call(l, 'read', null, { q: '?invitation=INV-G101' });
  assert.ok(anon.ceremony.couple.every((x) => !x.name && !x.holder), 'a plain read names nobody');
  assert.ok(flat(anon).every((s) => !s.name && !s.holder));
});

test('THE WORKER · the couple are named for the ledger from the register\'s roles on every seating request; a header a browser sends is never forwarded', async () => {
  const w = (await import('../src/worker.js')).default;
  const ada = await bearerOf('demo-fifty-ada');
  const entries = { [await authIdOf(ada)]: { i: 'INV-G101', g: 'G101', p: 'INV-101' }, ['a'.repeat(64)]: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B' }, ['b'.repeat(64)]: { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' } };
  const seen = [];
  const env = { ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(JSON.stringify({ v: 2, entries })) : new Response('no', { status: 404 })) },
    SEATING: { idFromName: () => 'x', get: () => ({ fetch: async (req) => { seen.push(req.headers.get('x-siyl-couple')); return new Response('{"ok":true}'); } }) } };
  await w.fetch(new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev/api/seating', { headers: { 'x-siyl-auth': ada, 'x-siyl-couple': JSON.stringify({ BRIDE: { g: 'G101' } }) } }), env);
  const c = JSON.parse(seen[0]);
  assert.deepEqual([c.BRIDE.g, c.GROOM.g, c.BRIDE.n, c.GROOM.n], ['G048', 'G049', 'Haruthai', 'Suthep'], 'by role, never the forged header');
});

/* ------------------------------------------------------------------------------------------------ WHO STAYS WHERE (the Worker) */
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const rec = (inv, g, o = {}) => JSON.stringify({ invitationId: inv, guestId: g, submissionId: o.sent === false ? undefined : 'SYL-' + g, firstSentAt: '2026-09-20T10:00:00.000Z', registration: {
  guestRecord: { scope: o.scope || { vientianeWedding: true }, guests: [{ guestId: g, name: o.name || g }] }, selections: o.lines || [] } });
async function stayHarness(occupants, setup) {
  const w = (await import('../src/worker.js')).default;
  const ada = await bearerOf('demo-fifty-stays');
  const entries = { [await authIdOf(ada)]: { i: 'INV-G101', g: 'G101', p: 'INV-101' } };
  for (const g of ['G102', 'G103', 'G106', 'G107']) entries[g.repeat(16)] = { i: 'INV-' + g, g, p: 'INV-' + g };
  entries['a'.repeat(64)] = { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B' }; entries['b'.repeat(64)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' };
  const store = kv(), asked = [];
  const env = { REG_KV: store, GR_TOKEN: 'gr', ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(JSON.stringify({ v: 2, entries })) : new Response('no', { status: 404 })) },
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: async (req) => { asked.push([new URL(req.url).pathname, req.headers.get('x-gr-verified')]); return new Response(JSON.stringify({ ok: true, occupants })); } }) } };
  setup((k, v) => store.m.set(k, { v }));
  const r = await w.fetch(new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev/api/pulse', { headers: { 'x-siyl-auth': ada } }), env);
  return { d: await r.json(), asked };
}

test('WHO STAYS WHERE (Worker) · by guest id — two guests who share a first name stay two people; roommates by the shared unit; "sent" only for exactly what the last sent trip carries; nobody without a stay is given one; no code, contact, rate or unit label leaves the server', async () => {
  const occupants = [
    { guestId: 'G101', key: 'ljg/snow-mountain-viewing', label: 'A', name: 'Ada' }, { guestId: 'G102', key: 'ljg/snow-mountain-viewing', label: 'A', name: 'Ben' },
    { guestId: 'G106', key: 'ljg/snow-mountain-viewing', label: 'B', name: 'Ben' },
    { guestId: 'G048', key: 'wedstay/heritage-executive', label: 'M', name: 'Haruthai' }, { guestId: 'G049', key: 'wedstay/heritage-executive', label: 'M', name: 'Suthep' },
    { guestId: 'G107', key: 'kmg/elegant-residence', label: 'A', name: 'Cleo' },
    { guestId: 'G101', key: 'kempinski/deluxe-balcony-king', label: 'C', name: 'Ada' }, /* a legacy key, read as Hotel Muse's Jatu Room */
  ];
  const { d, asked } = await stayHarness(occupants, (put) => {
    put('reg:INV-G101', rec('INV-G101', 'G101', { name: 'Ada', lines: [{ id: 'ljg', room: 'snow-mountain-viewing', unit: 'A', rate: 75, price: 150 }, { id: 'kempinski', room: 'jatu-room', unit: 'B' }] }));
    put('reg:INV-G102', rec('INV-G102', 'G102', { name: 'Ben', lines: [{ id: 'ljg', room: 'snow-mountain-viewing', unit: 'B' }] }));   /* sent another unit */
    put('reg:INV-G106', rec('INV-G106', 'G106', { name: 'Ben' }));
    put('reg:INV-G103', rec('INV-G103', 'G103', { name: 'Dora' }));
    put('contact:INV-G101', JSON.stringify({ email: 'ada@example.org', phone: '+66 1', firstName: 'Ada' }));
  });
  assert.deepEqual(asked, [['/api/rooms/gr-occupants', 'yes']], 'one internal, verified read of the engine');
  assert.equal(d.capacity, 50); assert.equal(d.staysKnown, true);
  const P = Object.fromEntries(d.people.map((p) => [p.id, p]));
  assert.deepEqual(P.G101.stays.map((s) => [s.stage, s.key, s.with, s.state]), [['ljg', 'ljg/snow-mountain-viewing', ['G102'], 'sent'], ['kempinski', 'kempinski/jatu-room', [], 'held']], 'a different unit than the one sent is not "sent"');
  assert.deepEqual(P.G102.stays.map((s) => [s.with, s.state]), [[['G101'], 'held']], 'Ben (G102) sent unit B, holds unit A — held, sharing with Ada');
  assert.deepEqual(P.G106.stays.map((s) => [s.with, s.state]), [[[], 'held']], 'the other Ben is another person, alone in unit B');
  assert.equal(P.G102.name, P.G106.name, 'the same first name'); assert.notDeepEqual(P.G102.stays, P.G106.stays);
  assert.deepEqual(P.G103.stays, [], 'no stay: an empty list, never a guess');
  assert.deepEqual(P.G048.stays.map((s) => s.with), [['G049']]); assert.deepEqual(P.G049.stays.map((s) => s.with), [['G048']]);
  assert.deepEqual(d.others.map((o) => [o.id, o.name, o.stays.length]), [['G107', 'Cleo', 1]], 'a holder whose trip is not sent yet is still on the map');
  const raw = JSON.stringify(d);
  assert.doesNotMatch(raw, /INV-|@|\+66|"label"|"unit"|"rate"|"price"|SYL-|"contact/, 'no invitation, code, contact, rate or unit label');
});

test('WHO STAYS WHERE (Worker) · an unreadable engine is said as unknown — never as "nobody stays anywhere"', async () => {
  const w = (await import('../src/worker.js')).default;
  const ada = await bearerOf('demo-fifty-down');
  const entries = { [await authIdOf(ada)]: { i: 'INV-G101', g: 'G101', p: 'INV-101' } };
  const env = { REG_KV: kv(), ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? new Response(JSON.stringify({ v: 2, entries })) : new Response('no', { status: 404 })) },
    ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: async () => new Response('boom', { status: 500 }) }) } };
  const d = await (await w.fetch(new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev/api/pulse', { headers: { 'x-siyl-auth': ada } }), env)).json();
  assert.equal(d.staysKnown, false); assert.ok(d.people.every((p) => !('stays' in p)));
});

test('THE ROOM ENGINE · the occupants read is Guest Relations-verified only (a guest\'s request through the Worker never carries the flag), lists people only — no kept party place — and writes nothing', async () => {
  const r = new Rooms(doState());
  await r.storage.put('occ:ljg/snow-mountain-viewing|A|G101', { invitationId: 'INV-G101', partyId: 'INV-101', name: 'Ada', at: 'x' });
  await r.storage.put('occ:ljg/snow-mountain-viewing|A|~INV-101~0', { invitationId: null, partyId: 'INV-101', name: '', at: 'x' });
  const ask = (gr) => r.fetch(new Request('https://rooms/api/rooms/gr-occupants', { headers: gr ? { 'x-gr-verified': 'yes' } : {} })).then(async (x) => ({ status: x.status, ...(await x.json()) }));
  assert.equal((await ask(false)).status, 401);
  const v = await ask(true);
  assert.deepEqual(v.occupants, [{ guestId: 'G101', key: 'ljg/snow-mountain-viewing', label: 'A', name: 'Ada' }]);
  assert.match(src('src/worker.js'), /headers\.delete\('x-gr-verified'\); headers\.delete\('x-siyl-identity'\);   \/\* a client can never claim either \*\//);
});

/* ------------------------------------------------------------------------------------------------ THE CIRCLE (the page) */
const PULSE = ['assets/rooms-data.js', 'assets/seatlabels.js', 'assets/pulse.js'];
function view(couple) {
  const rows = [];
  for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? (r === 10 ? 0 : 2) : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1), state: 'available' })) });
  const side = (k) => GRID.dinner.sides[k].map((s) => ({ ...s, state: 'available', side: k }));
  return { named: true, ceremony: { rows, couple }, dinner: { sides: { T: side('T'), B: side('B') } } };
}
function seat(v, id, holder, name, state) { const s = v.ceremony.rows.flatMap((r) => r.seats).concat(v.dinner.sides.T, v.dinner.sides.B).find((x) => x.seatId === id); Object.assign(s, { holder, name, state: state || 'taken' }); }
const DATA = { ok: true, capacity: 50, joining: 5, couple: 2, staysKnown: true, music: { responses: 0, leaders: [], ranking: [] }, after: { responses: 0 },
  people: [{ id: 'g-haruthai', name: 'Haruthai', role: 'Bride', photo: false, stays: [{ stage: 'wedstay', key: 'wedstay/heritage-executive', with: ['g-suthep'], state: 'sent' }] },
    { id: 'g-suthep', name: 'Suthep', role: 'Groom', photo: false, stays: [{ stage: 'wedstay', key: 'wedstay/heritage-executive', with: ['g-haruthai'], state: 'sent' }] },
    { id: 'g-peggy', name: 'Peggy', photo: false, nationality: 'Swiss', joinedAt: '2026-09-20', stays: [{ stage: 'ljg', key: 'ljg/snow-mountain-viewing', with: ['G2'], state: 'held' }, { stage: 'prewed', key: 'prewed/heritage', with: [], state: 'sent' }] },
    { id: 'G2', name: 'Ben', photo: false, joinedAt: '2026-09-19', stays: [{ stage: 'ljg', key: 'ljg/snow-mountain-viewing', with: ['g-peggy'], state: 'held' }] },
    { id: 'G3', name: 'Ben', photo: false, joinedAt: '2026-09-18', stays: [] }],
  others: [] };
async function circle(auth, me, seatOfMine) {
  const w = page({ auth, modules: PULSE }); w.setTimeout = (f, ms) => setTimeout(f, ms); w.clearTimeout = (t) => clearTimeout(t);
  const couple = [{ position: 'BRIDE', role: 'Bride', fixed: true, holder: 'g-haruthai', name: 'Haruthai', state: me === 'g-haruthai' ? 'yours' : me === 'g-suthep' ? 'party' : 'couple' },
    { position: 'GROOM', role: 'Groom', fixed: true, holder: 'g-suthep', name: 'Suthep', state: me === 'g-suthep' ? 'yours' : me === 'g-haruthai' ? 'party' : 'couple' }];
  const v = view(couple);
  seat(v, 'C-L-03-02', 'g-peggy', 'Peggy', me === 'g-peggy' ? 'yours' : 'taken'); seat(v, 'C-L-03-01', 'G2', 'Ben'); seat(v, 'C-R-05-01', 'G3', 'Ben');
  seat(v, 'D-B-11', 'g-suthep', 'Suthep'); seat(v, 'D-B-12', 'g-haruthai', 'Haruthai'); seat(v, 'D-T-12', 'g-peggy', 'Peggy'); seat(v, 'D-T-14', 'G2', 'Ben');
  w.SIYL_SEATS = { ready: () => true, error: () => null, view: () => v, seatOf: (ev, g) => (seatOfMine[ev] && g === me ? seatOfMine[ev] : null) };
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) });
  await w.SIYL_PULSE.load(true);
  return w.SIYL_PULSE.circleHtml({ guestId: me }, !!auth.hosts);
}

test('THE CIRCLE · X / 50 with the couple inside; the couple are two seats of the ceremony plan (never a separate pill); Suthep and Haruthai each see their own place and the whole plan, a guest sees everyone too', async () => {
  for (const [auth, me, role] of [[SUTHEP, 'g-suthep', 'Groom'], [HARUTHAI, 'g-haruthai', 'Bride']]) {
    const h = await circle(auth, me, { dinner: me === 'g-suthep' ? 'D-B-11' : 'D-B-12' });
    assert.match(h, /<b>5<\/b><span class="pl-of">\/ 50<\/span>/); assert.doesNotMatch(h, /\/ 52|pl-couple|Bride · Groom/);
    assert.match(h, new RegExp('<span>Your seat</span> <b>' + role + '</b><span>Front centre</span>'));
    assert.match(h, new RegExp('data-pl-place="' + role.toUpperCase() + '"><i class="pl-c is-me"></i><small>' + role + '</small>'));
    assert.match(h, /data-pl-roster/); assert.match(h, /<span class="pl-rk">Front centre<\/span><ul class="pl-rs"><li[^>]*><span class="pl-seatno">Bride<\/span> <span class="pl-fn" data-i18n-skip>Haruthai<\/span><\/li><li[^>]*><span class="pl-seatno">Groom<\/span> <span class="pl-fn" data-i18n-skip>Suthep<\/span>/);
    assert.match(h, /<span class="pl-seatno">B3<\/span> <span class="pl-fn" data-i18n-skip>Peggy<\/span>/, me + ' sees who sits where');
    assert.match(h, /aria-label="Vow Ceremony seating plan · 50 places/);
  }
  const g = await circle(PEGGY, 'g-peggy', { ceremony: 'C-L-03-02', dinner: 'D-T-12' });
  assert.match(g, /data-pl-place="BRIDE"><i class="pl-c is-held"><\/i>/); assert.match(g, /<span>Your seat<\/span> <b>B3<\/b>/);
  assert.match(g, /<span class="pl-seatno">D5<\/span> <span class="pl-fn" data-i18n-skip>Ben<\/span>/, 'the other Ben, in his own seat');
  /* the dinner: fifty, the couple's chairs among them, no 13 anywhere */
  assert.match(g, /One long table · <b>50<\/b> <span>seats<\/span>/); assert.match(g, /<span class="pl-seatno">B11<\/span> <span class="pl-fn" data-i18n-skip>Suthep<\/span>/);
  assert.doesNotMatch(g, /pl-seatno">[A-F]13</, 'no seat 13 is ever guest-facing');
  assert.doesNotMatch(g, /data-seat=|<form|<select|data-hold|data-select/, 'seeing is not changing');
});

test('THE CIRCLE · every person opens on the four answers; WHO STAYS WHERE by stay → property → room → who shares it; the same first name twice is two people; no stay is "Not selected yet"', async () => {
  const h = await circle(PEGGY, 'g-peggy', { ceremony: 'C-L-03-02', dinner: 'D-T-12' });
  const card = (id) => { const i = h.indexOf('data-pl-person="' + id + '"'); return h.slice(i, h.indexOf('</li>', h.indexOf('</dl>', i)) + 5); };
  assert.match(card('g-haruthai'), /<dt>Vow Ceremony<\/dt><dd><span>Bride<\/span> · <span>Front centre<\/span><\/dd>[\s\S]*<dt>Wedding Dinner<\/dt><dd>B12<\/dd>/);
  assert.match(card('g-peggy'), /<dd>B3<\/dd>[\s\S]*<dd>A12<\/dd>[\s\S]*Pre-Wedding Stay[\s\S]*Souphattra Heritage Vientiane[\s\S]*The Heritage[\s\S]*Sent to us[\s\S]*Luye Baisha · Lijiang[\s\S]*Snow Mountain Viewing Room[\s\S]*Sharing with<\/span> <span data-i18n-skip>Ben<\/span>[\s\S]*Selected/, 'the stays in journey order, the room category, the roommate, the state');
  assert.match(card('G3'), /<dd>D5<\/dd>[\s\S]*<dd>No seat yet<\/dd>[\s\S]*data-pl-nostay>Not selected yet</, 'the second Ben: his own seat, no dinner seat, no stay');
  assert.match(card('G2'), /<dd>A3<\/dd>[\s\S]*<dd>A14<\/dd>[\s\S]*Luye Baisha/, 'the first Ben keeps his own');
  assert.doesNotMatch(card('g-peggy'), /Room [A-Z]\b|Room \d|#\d/, 'no invented room number or allocation label');
  const s = h.slice(h.indexOf('data-pl-stays'));
  assert.match(s, /data-pl-stage="prewed"[\s\S]*data-pl-stage="wedstay"[\s\S]*data-pl-stage="ljg"/, 'the journey\'s order');
  assert.match(s, /<p class="pl-propn">Souphattra Heritage Vientiane<\/p><div class="pl-room"><p class="pl-roomn">Heritage Executive<\/p><ul class="pl-units"><li class="pl-unit">[\s\S]*?Haruthai[\s\S]*?Suthep[\s\S]*?data-state="sent">Sent to us/, 'the couple share one room');
  assert.match(s, /Snow Mountain Viewing Room[\s\S]*?<li class="pl-unit">[\s\S]*?Peggy[\s\S]*?Ben[\s\S]*?data-state="held">Selected/, 'Peggy and Ben share one unit, selected, not sent');
  assert.doesNotMatch(h, /USD|\$\d|rate|INV-|@/, 'no price, rate, invitation or contact');
});

test('THAI · every line the Wedding Circle and the plan add has its authored Thai', async () => {
  const core = (await import('../src/i18n-core.js')).default, dict = JSON.parse(src('src/i18n-th.json')), T = core.translator(dict);
  for (const en of ['Who sits where', 'Who stays where', 'Sharing with', 'Not selected yet', 'No seat yet', 'Free', 'Side A', 'Side B', 'Selected', 'Sent to us', 'Front centre', 'Bride', 'Groom', 'places', 'taken', 'Stays',
    'Row 1', 'Row 10', 'Where everyone stays could not be read just now.', 'Nobody has chosen a stay yet.', 'Could not be read just now.', 'Vow Ceremony seating plan · 50 places · the Bride and the Groom at the front',
    'Ceremony seating plan: 50 places — the Bride and the Groom at the front centre, then a left block of two seats and a right block of three seats per row, a centre aisle', 'Ceremony, the Groom’s place at the front centre, Suthep',
    'Your place is fixed at the front centre of the plan. Below is the whole ceremony — who sits where. Your dinner seat is chosen below, like everyone else’s.']) {
    const th = T.tr(en); assert.ok(th && th !== en && /[฀-๿]/.test(th), 'Thai for ' + en);
  }
});

/* ------------------------------------------------------------------------------------------------ the second review (Codex, 2 Oct 2026) */
test('RETIREMENT NEVER LEAVES 52 · were every preferred candidate held, two other free grid positions leave the plan; with fewer than two free, nothing held is ever retired', async () => {
  const cfg = validateGeometry(GRID).config;
  const holds = {}; for (const id of ['C-L-10-01', 'C-L-10-02', 'C-R-10-03', 'C-R-09-03', 'C-R-10-02', 'C-R-09-02', 'C-L-09-01', 'C-L-09-02']) holds[id] = { guestId: id };
  const gone = retiredCeremony(cfg, holds);
  assert.equal(gone.size, 2); for (const id of gone) assert.ok(!holds[id], id + ' is free');
  assert.equal(seatsOf(cfg, 'ceremony', holds).length + 2, 50, 'still 48 + the couple');
  const all = {}; for (const s of cfg.ceremony.rows.flatMap((r) => r.seats)) all[s.seatId] = { guestId: s.seatId };
  delete all['C-R-01-01'];
  const one = retiredCeremony(cfg, all);
  assert.deepEqual([...one], ['C-R-01-01'], 'one free position: only it retires; every held chair stays');
  assert.equal(seatsOf(cfg, 'ceremony', all).length, 49);
});

test('A CHAIR KEEPS ITS COLUMN · beside a retired position the plan leaves a gap (the SVG and the circle map), it never slides a chair into another column', () => {
  const w = page({ modules: ['assets/seatlabels.js', 'assets/seating.js'] }), S = w.SIYL_SEATS;
  const rows = [{ side: 'L', row: 10, seats: [{ seatId: 'C-L-10-01', state: 'available' }] }, { side: 'R', row: 10, seats: [{ seatId: 'C-R-10-01', state: 'available' }, { seatId: 'C-R-10-02', state: 'available' }] }];
  const svg = S.svg('ceremony', { ceremony: { rows, couple: [] } }, { selectable: false });
  const x = (lab) => Number((svg.match(new RegExp('data-label="' + lab + '"[^>]*>\\s*<rect class="back" x="([\\d.]+)"')) || [])[1]);
  assert.equal(x('A10'), 23, 'A10 stays in column A (pad + 3)');
  const p = page({ auth: PEGGY, modules: PULSE }); p.setTimeout = (f, ms) => setTimeout(f, ms); p.clearTimeout = (t) => clearTimeout(t); p.SIYL_SEATS = { ready: () => true, error: () => null, view: () => ({ ceremony: { rows, couple: [] }, dinner: null }), seatOf: () => null };
  p.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(DATA) });
  return p.SIYL_PULSE.load(true).then(() => {
    const h = p.SIYL_PULSE.circleHtml({ guestId: 'g-peggy' }, false);
    assert.match(h, /<span class="pl-rn">10<\/span><span class="pl-blk"><i class="pl-c"><\/i><i class="pl-c is-gap" aria-hidden="true"><\/i><\/span>/, 'A10 then the retired B10 as a gap');
    assert.match(h, /<span class="pl-aisle"><\/span><span class="pl-blk"><i class="pl-c"><\/i><i class="pl-c"><\/i><i class="pl-c is-gap" aria-hidden="true"><\/i><\/span>/, 'D10 E10, then F10 as a gap');
  });
});

test('THE NEWEST READ WINS · an older answer arriving last never replaces a newer one; missing stay names are "could not be read", never "nobody"', async () => {
  const w = page({ auth: PEGGY, modules: ['assets/seatlabels.js', 'assets/pulse.js'] });   /* no rooms-data: the stay names are missing */
  w.setTimeout = (f, ms) => setTimeout(f, ms); w.clearTimeout = (t) => clearTimeout(t);
  w.SIYL_SEATS = { ready: () => true, error: () => null, view: () => null, seatOf: () => null };
  let release; const slow = new Promise((r) => { release = r; });
  const old = { ...DATA, joining: 1 }, fresh = { ...DATA, joining: 5 };
  let n = 0; w.fetch = () => (++n === 1 ? slow.then(() => ({ ok: true, json: () => Promise.resolve(old) })) : Promise.resolve({ ok: true, json: () => Promise.resolve(fresh) }));
  const first = w.SIYL_PULSE.load(true), second = w.SIYL_PULSE.load(true);
  await second; release(); await first;
  assert.equal(w.SIYL_PULSE.data().joining, 5, 'the older answer was discarded');
  const h = w.SIYL_PULSE.circleHtml({ guestId: 'g-peggy' }, false);
  assert.match(h, /data-pl-stays-state="unavailable"/); assert.doesNotMatch(h, /Nobody has chosen a stay yet/);
});

test('SENT MEANS EXACTLY WHAT WAS SENT · the record\'s room snapshot decides; a line without its unit proves nothing', async () => {
  const occupants = [{ guestId: 'G101', key: 'ljg/snow-mountain-viewing', label: 'B', name: 'Ada' }, { guestId: 'G102', key: 'prewed/heritage', label: 'A', name: 'Ben' }];
  const { d } = await stayHarness(occupants, (put) => {
    const r1 = JSON.parse(rec('INV-G101', 'G101', { lines: [{ id: 'ljg', room: 'snow-mountain-viewing' }] })); r1.rooms = { ljg: { stage: 'ljg', key: 'ljg/snow-mountain-viewing', label: 'A' } };
    put('reg:INV-G101', JSON.stringify(r1));   /* sent unit A, now holds unit B */
    put('reg:INV-G102', rec('INV-G102', 'G102', { lines: [{ id: 'prewed', room: 'heritage' }] }));   /* an old line without its unit, no snapshot */
  });
  const P = Object.fromEntries(d.people.map((p) => [p.id, p]));
  assert.equal(P.G101.stays[0].state, 'held', 'moved after the send: not "sent"');
  assert.equal(P.G102.stays[0].state, 'held', 'unverifiable: not "sent"');
});

test('FORTY-EIGHT GUEST CHAIRS, NEVER MORE · the 48th chair is the last a guest can take; after it the ceremony is full and no retired position opens', async () => {
  const l = await live();
  const free = flat(await call(l, 'read', null, { as: ADA })).filter((s) => s.state === 'available').map((s) => s.seatId);
  assert.equal(free.length, 19, '48 − 29');
  free.slice(0, 18).forEach((id, i) => l.st.m.set('hold:ceremony:' + id, { invitationId: 'INV-G4' + two(i), guestId: 'G4' + two(i), name: 'X', state: 'held' }));
  assert.equal((await call(l, 'select', { invitationId: ADA.invitationId, guestId: ADA.guestId, event: 'ceremony', seatId: free[18] }, { as: ADA })).ok, true, 'the 48th chair');
  const v = await call(l, 'read', null, { as: BEN });
  assert.equal(flat(v).length, 48); assert.equal(flat(v).filter((s) => s.state === 'available').length, 0);
  for (const id of ['C-L-10-01', 'C-L-10-02']) assert.equal((await call(l, 'select', { invitationId: BEN.invitationId, guestId: BEN.guestId, event: 'ceremony', seatId: id }, { as: BEN })).status, 404, id + ' never opens');
  assert.match(src('src/seating.js'), /the ceremony is full/, 'and a defensive cap refuses a 49th new hold whatever the grid');
});
