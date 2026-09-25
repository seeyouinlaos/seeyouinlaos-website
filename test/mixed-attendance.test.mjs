/* MIXED ATTENDANCE (Owner, 25 Sep 2026 · a real guest report): a guest of a couple whose partner is NOT coming was counted
   twice — every stay she chose took two places, one kept for the partner who is not travelling. The invitation's party (the
   couple) stays exactly as it is; only the count of those TRAVELLING follows each member's own current answer:
     joining + joining          → 2 where the party books together
     joining + not joining      → 1
     not joining + joining      → 1 (from either side)
     not joining + not joining  → nothing is offered through the joining flow
     not answered yet           → counted, as before (a place is kept for them)
   The Worker computes it (src/stage-graph.js · partyNeed / travelsIn) and hands it to the room engine, which never books more
   places than travel and gives back a place kept for a member who no longer travels in that stage. Special Express No. 25 is
   one berth per guest whatever the party — pinned here as the reported product. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, doState, plain, session, src, CORE } from './sandbox.mjs';
import { Rooms, capNeed } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { partyNeed, travelsIn, participationOf } from '../src/stage-graph.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const ALL = { bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true, none: false };
const NONE = { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: false, none: true };
const BKK = { bangkok: true, vientianePreWedding: false, vientianeWedding: false, china: false, none: false };
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); return { m,
  get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }),
  put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); },
  list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }

/* a couple (A = the guest who reported, B = the partner) and a stranger, the Worker with every store in memory */
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const A = await bearerOf('mix-a-g501'), B = await bearerOf('mix-b-g502'), X = await bearerOf('mix-x-g777');
  const entries = {};
  entries[await authIdOf(A)] = { i: 'INV-G501', g: 'G501', p: 'INV-501' };
  entries[await authIdOf(B)] = { i: 'INV-G502', g: 'G502', p: 'INV-501' };
  entries[await authIdOf(X)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const index = JSON.stringify({ v: 2, entries });
  const rooms = new Rooms(doState());
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) },
    REG_KV: kv(), ROOMS: { idFromName: () => 'rooms', get: () => ({ fetch: (r) => rooms.fetch(r) }) } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const h = { w, env, rooms, A: { b: A, inv: 'INV-G501', g: 'G501' }, B: { b: B, inv: 'INV-G502', g: 'G502' }, X: { b: X, inv: 'INV-G777', g: 'G777' } };
  h.call = (who, path, body, method) => w.fetch(req(path, { 'x-siyl-auth': who.b }, body, method), env).then(async (r) => ({ status: r.status, d: await r.json() }));
  h.answer = async (who, scope) => { const cur = (await h.call(who, '/api/draft')).d; return h.call(who, '/api/draft', { invitationId: who.inv, baseUpdatedAt: cur && cur.draft ? cur.draft.updatedAt : undefined, keys: { 'siyl.guest': JSON.stringify({ scope }), 'siyl.bag': '[]' } }, 'PUT'); };
  h.join = (who, key, label, need) => h.call(who, '/api/rooms/join', { invitationId: who.inv, guestId: who.g, key, label, need });
  h.read = (who) => h.call(who, '/api/rooms');
  h.draft = (who) => h.call(who, '/api/draft');
  h.occ = async () => (await rooms.occupancies()).map((o) => (o.placeholder ? 'kept:' + o.partyId : o.guestId) + '@' + o.key + '|' + o.label).sort();
  return h;
}

test('THE RULE · one definition in the stage graph: a member counts for a stage only while their own answer keeps it; not answered is counted; not joining never is', () => {
  assert.equal(partyNeed('prewed', [ALL]), 2, 'joining + joining');
  assert.equal(partyNeed('prewed', [NONE]), 1, 'joining + not joining');
  assert.equal(partyNeed('prewed', [null]), 2, 'joining + not answered: the place is kept, as before');
  assert.equal(partyNeed('prewed', [{ none: false }]), 2, 'an empty answer is no answer');
  assert.equal(partyNeed('prewed', [BKK]), 1, 'a partner who joins Bangkok only is not counted in Vientiane');
  assert.equal(partyNeed('bkk-stay', [BKK]), 2, '… and is counted in Bangkok');
  assert.equal(travelsIn('prewed', NONE), false); assert.equal(travelsIn('prewed', null), true);
  assert.deepEqual([participationOf(ALL), participationOf(NONE), participationOf(null)], ['joining', 'not-joining', 'unanswered']);
  assert.equal(capNeed({ partyNeed: { prewed: 1 } }, 'prewed', 2), 1, 'the engine books no more than travel');
  assert.equal(capNeed({ partyNeed: { prewed: 2 } }, 'prewed', 1), 1, '… and never more than asked');
  assert.equal(capNeed({}, 'prewed', 2), 2, 'unknown: the engine keeps its own rule');
});

test('THE REPORTED CASE · A joining, B NOT joining, still one couple: the Worker says 1 for every stay, names B "not-joining", and a booking takes ONE place even when a stale page asks for two', async () => {
  const h = await harness();
  assert.equal((await h.answer(h.A, ALL)).status, 200); assert.equal((await h.answer(h.B, NONE)).status, 200);
  const d = (await h.draft(h.A)).d;
  assert.deepEqual(plain(d.travel.members), { G502: 'not-joining' }, 'the partner by their own answer — the couple is untouched');
  for (const k of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) assert.equal(d.travel.need[k], 1, k + ': 1 traveller');
  const r = await h.join(h.A, 'prewed/heritage', 'A', 2);   /* a page that still believed in two */
  assert.equal(r.status, 200, 'held');
  assert.deepEqual(await h.occ(), ['G501@prewed/heritage|A'], 'one place — nothing kept for a partner who is not coming');
});

test('BOTH JOINING · 2 where the party books together: one place held, one kept for the partner, who then takes it', async () => {
  const h = await harness();
  await h.answer(h.A, ALL); await h.answer(h.B, ALL);
  assert.equal((await h.draft(h.A)).d.travel.need.prewed, 2);
  await h.join(h.A, 'prewed/heritage', 'A', 2);
  assert.deepEqual(await h.occ(), ['G501@prewed/heritage|A', 'kept:INV-501@prewed/heritage|A']);
  await h.read(h.A); await h.read(h.B);
  assert.deepEqual(await h.occ(), ['G501@prewed/heritage|A', 'kept:INV-501@prewed/heritage|A'], 'a place kept for a travelling partner stays kept');
  await h.join(h.B, 'prewed/heritage', 'A', 2);
  assert.deepEqual(await h.occ(), ['G501@prewed/heritage|A', 'G502@prewed/heritage|A'], 'the partner takes the kept place');
});

test('A NOT JOINING / B JOINING · from the other side it is 1 as well; BOTH NOT JOINING · no stay is part of the trip', async () => {
  const h = await harness();
  await h.answer(h.A, NONE); await h.answer(h.B, ALL);
  assert.equal((await h.draft(h.B)).d.travel.need.prewed, 1, 'B books for B alone');
  assert.deepEqual(plain((await h.draft(h.B)).d.travel.members), { G501: 'not-joining' });
  await h.join(h.B, 'kmg/smart-family', 'A', 2);
  assert.deepEqual(await h.occ(), ['G502@kmg/smart-family|A']);
  /* both not joining: the joining flow offers nothing — no stage is part of the trip */
  const w = page({ auth: session({ guestId: 'G501', partyId: 'INV-501', partyName: 'A & B', fullName: 'A Test', preferredName: 'A', members: [{ guestId: 'G501', preferredName: 'A' }, { guestId: 'G502', preferredName: 'B' }] }) });
  w.SIYL_GUEST.setScope({ none: true });
  assert.deepEqual(plain(w.SIYL_JOURNEY.relevantSegments().map((s) => s.key)), [], 'nothing to book');
});

test('PARTICIPATION CHANGED AFTER A SAVED SELECTION · both joined, A held a room for two; B then says not joining → the place kept for B is given back (on either member\'s next read); A\'s own hold is never touched', async () => {
  const h = await harness();
  await h.answer(h.A, ALL); await h.answer(h.B, ALL);
  await h.join(h.A, 'prewed/heritage', 'A', 2); await h.join(h.A, 'bkk-stay/u-sathorn-superior-garden', 'A', 2);
  assert.equal((await h.occ()).filter((x) => x.startsWith('kept:')).length, 2, 'two kept places, one per stay');
  await h.answer(h.B, NONE);
  await h.read(h.B);   /* the partner's own page */
  assert.deepEqual(await h.occ(), ['G501@bkk-stay/u-sathorn-superior-garden|A', 'G501@prewed/heritage|A'], 'no phantom traveller left; A keeps both her rooms');
  /* the same from A's side, for a record saved before this release */
  const h2 = await harness();
  await h2.answer(h2.A, ALL); await h2.answer(h2.B, ALL); await h2.join(h2.A, 'prewed/heritage', 'A', 2);
  await h2.answer(h2.B, NONE); await h2.read(h2.A);
  assert.deepEqual(await h2.occ(), ['G501@prewed/heritage|A']);
  /* a partner who joins Bangkok only: the Vientiane place goes, the Bangkok one stays */
  const h3 = await harness();
  await h3.answer(h3.A, ALL); await h3.answer(h3.B, ALL);
  await h3.join(h3.A, 'prewed/heritage', 'A', 2); await h3.join(h3.A, 'bkk-stay/u-sathorn-superior-garden', 'A', 2);
  await h3.answer(h3.B, BKK); await h3.read(h3.A);
  assert.deepEqual(await h3.occ(), ['G501@bkk-stay/u-sathorn-superior-garden|A', 'G501@prewed/heritage|A', 'kept:INV-501@bkk-stay/u-sathorn-superior-garden|A']);
});

test('NOT ANSWERED YET · the partner who has said nothing keeps their place (the behaviour before this release, unchanged); a stranger\'s party is never touched', async () => {
  const h = await harness();
  await h.answer(h.A, ALL);
  await h.join(h.A, 'prewed/heritage', 'A', 2);
  await h.read(h.A); await h.read(h.X);
  assert.deepEqual(await h.occ(), ['G501@prewed/heritage|A', 'kept:INV-501@prewed/heritage|A'], 'the unanswered partner is still expected');
  assert.equal((await h.draft(h.A)).d.travel.members.G502, 'unanswered');
});

test('THE WAITING LIST · an entry asks for no more places than travel', async () => {
  const h = await harness();
  await h.answer(h.A, ALL); await h.answer(h.B, NONE);
  const r = await h.call(h.A, '/api/rooms/wait', { invitationId: h.A.inv, guestId: h.A.g, stage: 'prewed', size: 2, wanted: [] });
  assert.equal(r.status, 200);
  assert.equal((await h.rooms.waitlist()).find((x) => x.guestId === 'G501').size, 1);
});

test('SPECIAL EXPRESS No. 25 · one berth per guest, whatever the party: the line is quantity 1 at USD 100 and the page never multiplies it; every stay booking asks the one rule for its stage', () => {
  const A = session({ guestId: 'G501', partyId: 'INV-501', partyName: 'A & B', fullName: 'A Test', preferredName: 'A', members: [{ guestId: 'G501', preferredName: 'A' }, { guestId: 'G502', preferredName: 'B' }] });
  const w = page({ auth: A, modules: CORE.concat('assets/draft.js') });
  const items = w.SIYL_PRICE.items('train');
  assert.equal(items.length, 1); assert.equal(items[0].price, 100); assert.equal(items[0].qty || 1, 1);
  for (const f of ['your-journey.html', 'journeys.html', 'transport.html']) assert.doesNotMatch(src(f), /P\.items\((?:id|'train')\)[^;]*qty\s*=\s*(?!1\b)/, f + ': never another quantity');
  /* the page's count: the server's answer per stage once read — before that, the invitation's party */
  assert.equal(w.SIYL_JOURNEY.partySize('prewed'), 2, 'unknown yet: the invitation');
  w.localStorage.setItem('siyl.party', JSON.stringify({ guestId: 'G501', travel: { members: { G502: 'not-joining' }, need: { 'bkk-stay': 1, prewed: 1, wedstay: 1, kmg: 1, ljg: 1, kempinski: 1 } } }));
  assert.equal(w.SIYL_JOURNEY.partySize('prewed'), 1, 'known: 1');
  assert.equal(w.SIYL_JOURNEY.partySize('prewed/heritage'), 1, 'a unit key reads its stage');
  assert.equal(w.SIYL_STAY.need('prewed'), 1); assert.equal(w.SIYL_UNITS.need('prewed'), 1);
  assert.equal(w.SIYL_DRAFT.partyMember('G502'), 'not-joining');
  /* another guest's memory on this device is never used */
  w.localStorage.setItem('siyl.party', JSON.stringify({ guestId: 'G999', travel: { need: { prewed: 1 } } }));
  assert.equal(w.SIYL_JOURNEY.partySize('prewed'), 2);
  /* a page without the draft module reads the same remembered answer */
  const w2 = page({ auth: A }); w2.localStorage.setItem('siyl.party', JSON.stringify({ guestId: 'G501', travel: { need: { prewed: 1 } } }));
  assert.equal(w2.SIYL_JOURNEY.partySize('prewed'), 1);
  /* every booking call names its stage */
  for (const [f, re] of [['room.html', /ST\.need\(w\.id\)/], ['room.html', /function need\(w\) \{ return ST && ST\.need \? ST\.need\(w && w\.id\) : 1; \}/], ['journeys.html', /ST\.need\(win\)/], ['journeys.html', /U\.need\(stage\)/], ['your-journey.html', /ST\.need\('bkk-stay'\)/], ['your-journey.html', /U\.need\(k\)/]]) assert.match(src(f), re, f);
  for (const f of ['assets/rooms.js', 'assets/stay.js', 'room.html', 'journeys.html', 'your-journey.html']) assert.doesNotMatch(src(f), /\b(?:ST|U|this|self)\.need\(\)/, f + ': no booking without its stage');
});
