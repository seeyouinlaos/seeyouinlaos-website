/* THE WEDDING PULSE · YOUR WEDDING CIRCLE (Owner, 27 Sep 2026): the homepage says what is happening right now, My Profile who the guest
   shares the wedding with. Everything is READ: the joining cohort (the same reading as "Who's joining us"), the two answers approved for
   social display (Q06 genres · the after-dinner choice) from the sent records, the seats from the ledger, the rooms from the engine.
   A signed-out visitor gains nothing; a guest receives the narrowest form; Guest Relations the aggregates beside the journeys. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, plain, src, PEGGY, HARUTHAI } from './sandbox.mjs';
import { GENRES } from '../src/questionnaire.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const req = (path, headers = {}) => new Request(ORIGIN + path, { headers: { 'content-type': 'application/json', ...headers } });
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
/* a sent record: the guest's genres (Q06) in the guest record, the final act in the wedding answers, the scope */
function rec(inv, g, o = {}) {
  return JSON.stringify({ invitationId: inv, guestId: g, hosts: !!o.hosts, firstSentAt: o.at || '2026-09-20T10:00:00.000Z', registration: {
    guestRecord: { scope: o.scope || { vientianeWedding: true }, guests: [{ guestId: g, name: o.name || g, profile: { genres: o.genres || [], coffeetea: 'Tea', film: 'SECRET FILM ANSWER' } }], contact: { email: 'x@example.org' } },
    templeCeremony: o.finale ? { guests: [{ guestId: g, finaleKey: o.finale, finale: o.finale === 'pool' ? 'The pool jump' : 'BARON Vientiane · VIP after-party' }] } : null } });
}
async function harness(setup) {
  const w = (await import('../src/worker.js')).default;
  const ada = await bearerOf('demo-pulse-ada');
  const entries = {}; entries[await authIdOf(ada)] = { i: 'INV-G101', g: 'G101', p: 'INV-101' };
  ['G102', 'G103', 'G104', 'G105', 'G106'].forEach((g, i) => { entries[String(i + 1).repeat(64)] = { i: 'INV-' + g, g, p: 'INV-1' + (g.slice(2)) }; });
  entries['a'.repeat(64)] = { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B' }; entries['b'.repeat(64)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G' };
  const store = kv(); const env = { ASSETS: await assetsFor(entries), REG_KV: store, GR_TOKEN: 'gr-secret' };
  const m = store.m, put = (k, v) => m.set(k, { v });
  setup(put);
  return { w, env, ada, get: async (path, h) => { const r = await w.fetch(req(path, h), env); return { status: r.status, d: await r.json().catch(() => null) }; } };
}

test('THE PULSE (Worker) · an authenticated read of the joining cohort in the narrowest form; ranked music (multi-select, ties in the questionnaire order), the after-dinner split; declined, cancelled and unanswered never count', async () => {
  const h = await harness((put) => {
    put('reg:INV-G101', rec('INV-G101', 'G101', { name: 'Ada', genres: ['Pop', 'Latin'], finale: 'pool', at: '2026-09-18T10:00:00.000Z' }));
    put('reg:INV-G102', rec('INV-G102', 'G102', { name: 'Ben', genres: ['R&B', 'Pop'], finale: 'baron', at: '2026-09-19T10:00:00.000Z' }));
    put('reg:INV-G103', rec('INV-G103', 'G103', { name: 'Cleo', genres: [], at: '2026-09-20T10:00:00.000Z' }));                                        /* joined, not answered */
    put('reg:INV-G104', rec('INV-G104', 'G104', { name: 'Dora', genres: ['Rock'], finale: 'pool', scope: { none: true } }));                          /* declined */
    put('reg:INV-G105', rec('INV-G105', 'G105', { name: 'Emil', genres: ['Jazz'], finale: 'pool', scope: { bangkok: true, vientianeWedding: false } })); /* joining, not the wedding */
    put('reg:INV-G999', rec('INV-G999', 'G999', { name: 'Zed', genres: ['Latin', 'Latin'], finale: 'pool' }));                                        /* cancelled: not in the register */
    put('reg:INV-G048', rec('INV-G048', 'G048', { name: 'Haruthai', hosts: true, genres: ['Thai & Lao favourites'], finale: 'pool' }));               /* the Bride's answers count */
    put('contact:INV-G101', JSON.stringify({ email: 'ada@example.org', phone: '+66 1', firstName: 'Ada', nationality: 'Thai', birthdate: '1990-01-01', address1: 'Secret Street 1' }));
    put('contact:INV-G102', JSON.stringify({ email: 'ben@example.org', firstName: 'Ben', nationality: 'German' }));
    put('avatar:INV-G102', new Uint8Array([1]).buffer);
  });
  assert.equal((await h.get('/api/pulse')).status, 401, 'signed out: nothing');
  const { status, d } = await h.get('/api/pulse', { 'x-siyl-auth': h.ada });
  assert.equal(status, 200); assert.equal(d.capacity, 52, 'the whole wedding group, the couple included — never the dinner\'s 50');
  assert.equal(d.joining, 6, 'the couple + Ada, Ben, Cleo, Emil — never Dora (declined) or Zed (cancelled)');
  assert.deepEqual(d.people.slice(0, 2).map((p) => p.id), ['G048', 'G049'], 'the Bride, then the Groom, first');
  assert.deepEqual(d.people.slice(2).map((p) => p.id).sort(), ['G101', 'G102', 'G103', 'G105'], 'then every joining guest');
  assert.ok(!d.people.some((p) => p.id === 'G104' || p.id === 'G999'));
  const ada = d.people.find((p) => p.id === 'G101');
  assert.deepEqual(Object.keys(ada).sort(), ['after', 'id', 'joinedAt', 'music', 'name', 'nationality', 'photo'], 'the narrow form');
  assert.deepEqual([ada.name, ada.nationality, ada.music, ada.after], ['Ada', 'Thai', ['Pop', 'Latin'], 'pool']);
  assert.equal(d.people.find((p) => p.id === 'G102').photo, true);
  assert.equal(d.people.find((p) => p.id === 'G103').nationality, null, 'a missing nationality is null, never invented');
  assert.deepEqual(d.people.find((p) => p.id === 'G105').music, [], 'not joining the wedding: the wedding question is not counted');
  assert.equal(d.people.find((p) => p.id === 'G048').role, 'Bride');
  const raw = JSON.stringify(d);
  assert.doesNotMatch(raw, /example\.org|\+66|1990-01-01|Secret Street|SECRET FILM|coffeetea|INV-|Tea/, 'no email, phone, birthdate, address, code, invitation or other answer');
  /* the ranking: every genre, by guests who chose it; a tie keeps the questionnaire's order */
  assert.equal(d.music.ranking.length, 13); assert.deepEqual(d.music.ranking.map((r) => r.genre).slice().sort(), GENRES.slice().sort());
  assert.deepEqual(d.music.ranking.slice(0, 4).map((r) => [r.genre, r.count]), [['Pop', 2], ['R&B', 1], ['Latin', 1], ['Thai & Lao favourites', 1]]);
  assert.deepEqual(d.music.leaders, ['Pop']); assert.equal(d.music.responses, 3, 'three guests answered (Ada, Ben, the Bride)');
  assert.deepEqual([d.after.pool, d.after.party, d.after.responses], [2, 1, 3], 'Ada + the Bride · Ben');
  /* a tie at the top is shown as a tie, in the questionnaire order */
  const t = await harness((put) => { put('reg:INV-G101', rec('INV-G101', 'G101', { genres: ['Rock'] })); put('reg:INV-G102', rec('INV-G102', 'G102', { genres: ['Blues'] })); });
  assert.deepEqual((await t.get('/api/pulse', { 'x-siyl-auth': t.ada })).d.music.leaders, ['Blues', 'Rock']);
  /* nobody has answered: no leader, no votes — unknown is never a winner */
  const e = await harness(() => {}); const ed = (await e.get('/api/pulse', { 'x-siyl-auth': e.ada })).d;
  assert.equal(ed.joining, 2); assert.deepEqual(ed.music.leaders, []); assert.equal(ed.music.responses, 0); assert.equal(ed.after.responses, 0);
});

test('GUEST RELATIONS · the aggregates of the two answers beside the journeys — counts, respondents, who chose each — and the journeys and acknowledgements as before', async () => {
  const h = await harness((put) => {
    put('reg:INV-G101', rec('INV-G101', 'G101', { name: 'Ada', genres: ['Pop', 'Latin'], finale: 'pool' }));
    put('reg:INV-G102', rec('INV-G102', 'G102', { name: 'Ben', genres: ['Latin'], finale: 'baron' }));
  });
  assert.equal((await h.get('/api/gr/journeys', { 'x-siyl-auth': h.ada })).status, 401, 'a guest is not Guest Relations');
  const { d } = await h.get('/api/gr/journeys', { 'x-gr-token': 'gr-secret' });
  assert.ok(Array.isArray(d.journeys) && d.acknowledgements && d.acknowledgements.unwrittenRules, 'the journeys and the acknowledgement summary stand');
  const a = d.answers; assert.equal(a.joining, 4); assert.equal(a.capacity, 52);
  assert.deepEqual(a.music.leaders, ['Latin']);
  assert.deepEqual(a.music.ranking.find((r) => r.genre === 'Latin').guests.map((g) => g.guestId).sort(), ['G101', 'G102'], 'who chose Latin, by guest');
  assert.equal(a.music.ranking.find((r) => r.genre === 'Latin').count, 2); assert.equal(a.music.responses, 2);
  assert.deepEqual([a.afterDinner.pool.count, a.afterDinner.party.count], [1, 1]);
  assert.deepEqual(a.afterDinner.party.guests.map((g) => [g.guestId, g.invitationId, g.name]), [['G102', 'INV-G102', 'Ben']], 'Guest Relations sees who, by invitation');
});

/* the seats as the ledger reads them to a signed-in guest */
function seatsView() {
  const C = [];
  for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) C.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + String(r).padStart(2, '0') + '-0' + (i + 1), state: 'available' })) });
  const nums = [...Array(26).keys()].map((i) => i + 1).filter((n) => n !== 13);
  const side = (k) => nums.map((n) => ({ seatId: 'D-' + k + '-' + String(n).padStart(2, '0'), state: 'available', side: k }));
  return { ceremony: { rows: C }, dinner: { sides: { T: side('T'), B: side('B') } } };
}
function hold(v, seatId, holder, name, state) {
  const all = v.ceremony.rows.flatMap((r) => r.seats).concat(v.dinner.sides.T, v.dinner.sides.B);
  Object.assign(all.find((s) => s.seatId === seatId), { holder, name, state: state || 'taken' });
}
/* the circle's read races a real timeout: the sandbox runs every timer at once, so these pages get the platform's own timers */
const timers = (w) => { w.setTimeout = (fn, ms) => setTimeout(fn, ms); w.clearTimeout = (t) => clearTimeout(t); return w; };
const PULSE = ['assets/seatlabels.js', 'assets/pulse.js'];

test('THE SEATS (read-only) · around a ceremony seat: the chairs that touch it in its block — never across the aisle; at the dinner: the neighbours in the plan\'s own order (12 beside 14), across = the same rank on the other side', () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE, v = seatsView();
  hold(v, 'C-L-03-01', 'G2', 'Ben'); hold(v, 'C-L-04-02', 'G3', 'Cleo'); hold(v, 'C-R-03-01', 'G4', 'Dora'); hold(v, 'C-L-02-02', 'G5', 'Emil'); hold(v, 'C-L-06-02', 'G6', 'Far');
  const around = plain(P.aroundCeremony(v, 'C-L-03-02')).map((x) => [x.seat.holder, x.where]);
  assert.deepEqual(around, [['G2', 'left'], ['G5', 'front'], ['G3', 'behind']], 'B3: A3 beside, B2 in front, B4 behind — D3 across the aisle is not beside it, B6 is not near');
  hold(v, 'D-T-06', 'G2', 'Ben'); hold(v, 'D-B-07', 'G3', 'Cleo');
  const a7 = plain(P.aroundDinner(v, 'D-T-07'));
  assert.deepEqual([a7.left.seatId, a7.left.holder, a7.right.seatId, a7.right.holder || null, a7.across.seatId, a7.across.holder], ['D-T-06', 'G2', 'D-T-08', null, 'D-B-07', 'G3']);
  const a12 = plain(P.aroundDinner(v, 'D-B-12'));
  assert.deepEqual([a12.left.seatId, a12.right.seatId, a12.across.seatId], ['D-B-11', 'D-B-14', 'D-T-12'], 'B12: B11 and B14 beside it (13 never existed), A12 across');
  assert.equal(plain(P.aroundDinner(v, 'D-T-01')).left, null, 'the end of the table has no left neighbour');
  assert.equal(v.dinner.sides.T.length + v.dinner.sides.B.length, 50); assert.ok(!v.dinner.sides.T.concat(v.dinner.sides.B).some((s) => /-13$/.test(s.seatId)));
});

test('YOUR WEDDING CIRCLE · the guest\'s seat, the people around, the pulse — read-only: no booking control, no seat can be chosen here; unassigned and unopened states are said as they are; the hosts see the whole plan', () => {
  const w = timers(page({ auth: PEGGY, modules: PULSE })), P = w.SIYL_PULSE, v = seatsView();
  hold(v, 'C-L-03-02', PEGGY.guestId, 'Peggy', 'yours'); hold(v, 'C-L-03-01', 'G2', 'Ben'); hold(v, 'D-T-07', PEGGY.guestId, 'Peggy', 'yours'); hold(v, 'D-T-06', 'G2', 'Ben');
  w.SIYL_SEATS = { view: () => v, seatOf: (ev) => (ev === 'ceremony' ? 'C-L-03-02' : 'D-T-07') };
  const data = { ok: true, capacity: 52, joining: 3, people: [{ id: 'G2', name: 'Ben', photo: false, nationality: 'German', joinedAt: '2026-09-19', music: ['Pop'], after: 'party' }, { id: PEGGY.guestId, name: 'Peggy', photo: true, nationality: 'Swiss', joinedAt: '2026-09-18', music: ['Latin'], after: 'pool' }],
    music: { responses: 2, leaders: ['Latin', 'Pop'], ranking: GENRES.map((g) => ({ genre: g, count: g === 'Pop' || g === 'Latin' ? 1 : 0 })) }, after: { responses: 2, pool: 1, party: 1 } };
  w.fetch = () => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
  return P.load(true).then(() => {
    const h = P.circleHtml({ guestId: PEGGY.guestId }, false);
    assert.match(h, /id="circle" data-pl-circle/); assert.match(h, /<b>3<\/b><span class="pl-of">\/ 52<\/span>/);
    assert.match(h, /<span>Your seat<\/span> <b>B3<\/b>/); assert.match(h, /<span>Your seat<\/span> <b>A7<\/b>/);
    assert.match(h, /Around you[\s\S]*Ben[\s\S]*German/); assert.match(h, /Next to you[\s\S]*data-dir="l"[\s\S]*Ben/); assert.match(h, /Across from you[\s\S]*B7[\s\S]*Not taken yet/);
    assert.match(h, /pl-c is-me/, 'the guest\'s own chair is marked');
    assert.doesNotMatch(h, /data-seat|data-select|data-book|data-hold|<form|<select|type="checkbox"/, 'no booking control is introduced');
    assert.doesNotMatch(h, /View full seating/, 'a guest does not get the hosts\' plan');
    assert.match(h, /<span>Current favourite<\/span> · <b>Latin &amp; Pop<\/b>/, 'a tie at the top is a tie');
    /* the hosts: their fixed ceremony place and their own dinner seat are visible — and the whole plan, read-only */
    w.SIYL_SEATS = { view: () => v, seatOf: (ev) => (ev === 'dinner' ? 'D-B-12' : null) };
    const hh = P.circleHtml({ guestId: HARUTHAI.guestId }, true);
    assert.match(hh, /<span>Your place<\/span> <b>Front centre<\/b>/); assert.match(hh, /pl-couple is-me/); assert.match(hh, /<span>Your seat<\/span> <b>B12<\/b>/);
    assert.match(hh, /<details class="pl-full" data-pl-full><summary>View full seating<\/summary>/); assert.doesNotMatch(hh, /<form|<select|data-select|data-hold/);
    /* nothing assigned, nothing open */
    w.SIYL_SEATS = { view: () => ({ ceremony: null, dinner: null }), seatOf: () => null };
    const none = P.circleHtml({ guestId: PEGGY.guestId }, false);
    assert.match(none, /<span>Your seat<\/span> <b>Not assigned yet<\/b>/); assert.match(none, /The ceremony plan opens later\./); assert.match(none, /The dinner plan opens later\./);
  });
});

test('THE PAGES · the homepage pulse is private (hidden before the first paint for a visitor, drawn only for a signed-in guest) and holds the Wedding Stay first; My Profile carries the circle; nothing here writes', () => {
  const idx = src('index.html'), prof = src('profile.html'), js = src('assets/pulse.js');
  assert.match(idx, /<section class="a-sec a-pulse" aria-label="The Wedding Pulse" data-pulse data-private><\/section>/);
  assert.match(idx, /<script src="assets\/invite-early\.js/); assert.ok(idx.indexOf('assets/availability.js') < idx.indexOf('assets/pulse.js'));
  assert.match(prof, /<script src="assets\/pulse\.js/); assert.match(prof, /document\.addEventListener\('siyl:pulse',redrawCircle\)/);
  assert.match(js, /var API = '\/api\/pulse';/); assert.doesNotMatch(js, /method:\s*'(POST|PUT|DELETE)'/, 'the pulse only reads');
  assert.match(js, /'<div class="pl-stay a-avail" data-availability data-av-in-pulse><\/div>'/, 'the Wedding Stay object inside the pulse');
  assert.match(js, /'View all 13'/, 'the full ranking behind one tap on the homepage');
  assert.match(src('assets/aman.css'), /html\[data-session="in"\] \.a-sec\.a-avail \{ display: none; \}/, 'a guest reads the object once, inside the pulse');
  assert.match(src('src/layout-routes.cjs'), /'\/unwritten-rules\.html', '\/index\.html'\];/, 'the signed-in homepage is audited in the guest states');
});

test('THAI · every new line of the pulse, the circle and the stay has its authored Thai', () => {
  const TH = JSON.parse(src('src/i18n-th.json')).exact;
  for (const k of ['The Wedding Pulse', 'What is happening right now.', 'Joining so far', 'See everyone', 'What makes us dance?', 'Current favourite', 'responses so far', 'View all 13', 'After dinner, what’s the mood?',
    'Jump to the pool', 'Go to the party', 'Who’s jumping in?', 'Who’s going to the party?', 'Who chose', 'Your wedding circle', 'Who you share this wedding with.', 'Around you', 'Next to you', 'Across from you',
    'Not taken yet', 'Not assigned yet', 'View full seating', 'Rooms available', 'Your invitation shows the rooms currently open to you.', 'places left', 'Complimentary alternative', 'Fully allocated', 'Wedding Stay · Vientiane', 'guests'])
    assert.ok(TH[k], 'Thai for ' + k);
  for (const g of GENRES.filter((x) => !['90s', 'R&B'].includes(x))) assert.ok(TH[g], 'Thai for the genre ' + g);
});

test('THE KV BUDGET (27 Sep 2026) · the cohort is read from the store once per two minutes in an isolate, and at once again after this isolate stores something it shows (a portrait here)', async () => {
  const h = await harness((put) => { put('reg:INV-G101', rec('INV-G101', 'G101', { name: 'Ada', genres: ['Pop'], finale: 'pool' })); });
  const m = h.env.REG_KV.m;
  const a = await h.get('/api/pulse', { 'x-siyl-auth': h.ada }); assert.equal(a.d.joining, 3, 'the couple and Ada');
  m.set('reg:INV-G102', { v: rec('INV-G102', 'G102', { name: 'Ben', genres: ['Latin'], finale: 'baron' }) });
  assert.equal((await h.get('/api/pulse', { 'x-siyl-auth': h.ada })).d.joining, 3, 'within the window: the cohort already read — no list, no reads');
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);
  const up = await h.w.fetch(new Request(ORIGIN + '/api/profile/photo', { method: 'PUT', headers: { 'content-type': 'image/jpeg', 'x-siyl-auth': h.ada }, body: jpeg }), h.env);
  assert.equal(up.status, 200);
  const b = await h.get('/api/pulse', { 'x-siyl-auth': h.ada });
  assert.equal(b.d.joining, 4, 'a write through this isolate: read again at once'); assert.equal(b.d.people.find((p) => p.id === 'G101').photo, true, 'her portrait shows at once');
  assert.match(src('src/worker.js'), /const COHORT_TTL = 2 \* 60 \* 1000;/);
});
