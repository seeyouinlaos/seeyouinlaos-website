/* PARTICIPATION MODEL (Owner, 18 Sep 2026 · release 011) — WHERE WILL YOU JOIN US.
   One question at the start of step 02 decides everything after it: which stages exist for this guest, what the
   readiness engine asks, which steps read Not joining, what the tickets carry, what Review & Send and the emails
   say. Proven here against the client modules the browser runs and the in-memory room engine:
   · the matrix — none, Bangkok, Vientiane, China, Bangkok + Vientiane, Vientiane + China, all
   · the full decline path — INVITATION → NOT JOINING → REVIEW → SEND with nothing else asked
   · NOT JOINING THIS STAGE as one direct action from an untouched, a selected and a held stage; Reconsider returns
   · tickets and passes follow attendance — a line outside the guest's destinations is not theirs
   · Haruthai / Suthep — the hosts start at zero (Owner, 19 Sep 2026 · release 014): no stage is arranged, nothing is
     held for anyone in advance, a host chooses a room like every guest and the Bag carries only actual selections
   · My Favorite Flavor — one of six, migrated safely from the retired snack answer
   · the payload and both emails carry the answer. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { page, json, plain, src, roomsFetch, doState, session, PEGGY, STEFFIE, LIN, ROOT } from './sandbox.mjs';
import { Rooms, unitsOf, unitOf, mayJoin } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { composeGuestMail, composeOwnerMail, journeyModel } from '../src/mail-templates.js';

const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
const stepOf = (G, key) => G.steps().find((s) => s.key === key);
const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });
const seg = (J, key) => J.SEGMENTS.find((s) => s.key === key);
/* the hosts' sessions: synthetic ids in the register's shape — the seed names nobody (src/inventory-seed.js FIXED is []) */
const HS = [{ guestId: 'G048', preferredName: 'Haruthai' }, { guestId: 'G049', preferredName: 'Suthep' }];
const HARUTHAI = session({ guestId: 'G048', partyId: 'INV-001', partyName: 'Haruthai & Suthep', fullName: 'Haruthai Test', preferredName: 'Haruthai', members: HS, hosts: true, hostRole: 'BRIDE' });
const SUTHEP = session({ guestId: 'G049', partyId: 'INV-001', partyName: 'Haruthai & Suthep', fullName: 'Suthep Test', preferredName: 'Suthep', members: HS, hosts: true, hostRole: 'GROOM' });
async function livePage(auth, rooms, seed) {
  const w = page({ auth, seed, fetch: await roomsFetch(rooms, identity(auth)) });
  await w.SIYL_UNITS.load(true);
  return w;
}
/* steps 01, 03, 04 and 05 answered — the journey and the scope are the test's */
function answerTheRest(w) {
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678');
  T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes'));
  G.setDressAck(true); G.setAllergy('no'); G.setPhotoAck(true);
  G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered'));
}

const ALL = ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski'];
const MATRIX = [
  { name: 'none', patch: { none: true }, stages: [], words: 'Not joining this trip', wedding: false, about: false },
  { name: 'Bangkok', patch: { bangkok: true }, stages: ['bkk-stay'], words: 'Bangkok', wedding: false, about: true },
  { name: 'Vientiane', patch: { vientiane: true }, stages: ['prewed', 'wedstay'], words: 'Vientiane', wedding: true, about: true },
  { name: 'China', patch: { china: true }, stages: ['kmg', 'c86', 'ljg', 'return'], words: 'China', wedding: false, about: true },
  { name: 'Bangkok + Vientiane', patch: { bangkok: true, vientiane: true }, stages: ['bkk-stay', 'train', 'prewed', 'wedstay'], words: 'Bangkok · Vientiane', wedding: true, about: true },
  { name: 'Vientiane + China', patch: { vientiane: true, china: true }, stages: ['prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return'], words: 'Vientiane · China', wedding: true, about: true },
  { name: 'all', patch: { all: true }, stages: ALL, words: 'Bangkok · Vientiane · China', wedding: true, about: true },
];

test('SCOPE · a guest has no scope until they answer; the question comes before every stage; any combination is valid and "I won\'t be joining" is exclusive', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
  assert.equal(G.scope(), null); assert.equal(G.scopeAnswered(), false); assert.equal(G.scopeWords(), '');
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678');
  deq(G.missingFor('journey'), [{ key: 'scope', label: 'Where will you join us?', href: 'your-journey.html#scope' }], 'the scope is the first and only question until answered');
  assert.equal(J.relevantSegments().length, 10, 'before the answer no stage disappears — the planner shows the question instead of the stages'); assert.equal(J.excludedSegments().length, 0);
  assert.match(src('your-journey.html'), /Your stages appear here once you have said where you will join us\./, 'the planner asks first');
  G.setScope({ bangkok: true }); assert.equal(G.joins('bangkok'), true); assert.equal(G.joins('china'), false); assert.equal(G.notJoining(), false);
  G.setScope({ china: true }); deq(G.scope(), { ...G.scope(), bangkok: true, vientiane: false, china: true, none: false });
  G.setScope({ none: true }); assert.equal(G.notJoining(), true); assert.equal(G.joiningAny(), false); assert.equal(G.joins('bangkok'), false, 'not joining clears every destination');
  G.setScope({ vientiane: true }); assert.equal(G.notJoining(), false, 'a destination clears "not joining"'); assert.equal(G.joins('vientiane'), true); assert.equal(G.joins('bangkok'), false);
  G.setScope({ all: true }); assert.equal(G.joinsAll(), true);
  const st = json(w, 'siyl.guest'), id = G.me().guestId; assert.ok(st.scope && st.scope.at && st.scope.by === id, 'the answer is in the guest record — the draft carries it'); assert.ok(st.guests[id].history.some((h) => h.field === 'scope' && h.to === 'bangkok+vientiane+china'), 'and its history');
});

test('MATRIX · relevant stages, readiness, step states and words for every combination', () => {
  for (const c of MATRIX) {
    const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
    answerTheRest(w); G.setScope(c.patch);
    deq(J.relevantSegments().map((s) => s.key), c.stages, c.name + ' · relevant stages');
    deq(J.excludedSegments().map((s) => s.key), ALL.filter((k) => !c.stages.includes(k)), c.name + ' · excluded stages');
    assert.equal(G.scopeWords(), c.words, c.name + ' · words');
    const missing = G.missingFor('journey');
    deq(missing.map((m) => m.key), c.stages.map((k) => 'stage:' + k), c.name + ' · only the relevant stages are asked');
    for (const m of missing) assert.match(m.label, /choose or say you are not joining/);
    /* answer them all by declining: step 02 is complete with nothing in the Bag */
    for (const k of c.stages) J.skip(k, true, 'manual');
    assert.equal(G.done('journey'), true, c.name + ' · every relevant stage answered');
    assert.equal(w.SIYL_BAG.total(), 0);
    assert.equal(G.applicable('wedding'), c.wedding, c.name + ' · the wedding applies only in Vientiane'); assert.equal(G.applicable('preparation'), c.wedding);
    assert.equal(G.applicable('about'), c.about, c.name + ' · About You applies to anyone joining');
    const states = G.steps().map((s) => s.state);
    deq(states, ['complete', 'complete', c.wedding ? 'complete' : 'na', c.wedding ? 'complete' : 'na', c.about ? 'complete' : 'na', 'attention'], c.name + ' · step states');
    if (!c.wedding) assert.equal(stepOf(G, 'wedding').note, c.name === 'none' ? 'Not joining this trip' : 'Not joining Vientiane', c.name + ' · the excluded step says why');
    if (!c.wedding) assert.equal(stepOf(G, 'wedding').stateLabel, 'Not joining');
    assert.equal(G.mayEnter('review'), true, c.name + ' · Review & Send opens'); assert.equal(G.readiness().ok, true, c.name + ' · ready');
    const op = G.operational(); assert.equal(op.scopeWords, c.words); assert.equal(!!(op.scope && op.scope.none), c.name === 'none');
  }
});

test('FULL DECLINE PATH · INVITATION → NOT JOINING → REVIEW → SEND: after the code and the contact details nothing else is required', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678');
  assert.equal(G.mayEnter('review'), false);
  G.setScope({ none: true });
  deq(G.missingFor('journey'), []); deq(G.missingFor('wedding'), []); deq(G.missingFor('preparation'), []); deq(G.missingFor('about'), []);
  deq(G.steps().map((s) => [s.key, s.state]), [['you', 'complete'], ['journey', 'complete'], ['wedding', 'na'], ['preparation', 'na'], ['about', 'na'], ['review', 'attention']]);
  assert.equal(stepOf(G, 'journey').note, 'Not joining this trip'); assert.equal(stepOf(G, 'about').note, 'Not joining this trip');
  assert.equal(G.mayEnter('review'), true); assert.equal(G.readiness().ok, true);
  deq(G.missingFor('review').map((m) => m.key), ['send'], 'the only thing left is to send');
  assert.equal(w.SIYL_BAG.total(), 0); assert.equal(G.operational().scopeWords, 'Not joining this trip');
  /* the send payload says so, in the words the emails print */
  const rec = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-00000001', kind: 'initial', version: 1, submittedAt: '2026-09-18T10:00:00.000Z', firstSentAt: '2026-09-18T10:00:00.000Z', lastSentAt: '2026-09-18T10:00:00.000Z',
    recipient: { email: 'guest@example.com', phone: '+66 81 234 5678' }, rooms: null,
    registration: { channel: 'journey-shop', guestId: 'G777', totalUsd: 0, contact: { email: 'guest@example.com', phone: '+66 81 234 5678' }, selections: [], guestRecord: { ...G.operational(), guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } };
  const g = composeGuestMail(rec), o = composeOwnerMail(rec, 'https://x/api/status');
  assert.ok(g.text.includes('Where you join us: Not joining this trip'), 'the guest email'); assert.ok(g.html.includes('Where you join us') && g.html.includes('Not joining this trip'));
  assert.ok(o.text.includes('Where they join us: Not joining this trip'), 'the Guest Relations email');
});

test('PARTIAL ATTENDANCE · Bangkok only: the wedding steps read Not joining and never block; a Vientiane line is not the guest\'s; the tickets follow', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  answerTheRest(w); G.setScope({ bangkok: true });
  assert.equal(J.lineRelevant({ id: 'train' }), false, 'the night train needs Bangkok and Vientiane'); assert.equal(J.lineRelevant({ id: 'bkk-stay', room: 'u-sathorn-superior-garden' }), true);
  assert.equal(J.lineRelevant({ id: '1872' }), true); assert.equal(J.lineRelevant({ id: 'sangkhathan' }), false); assert.equal(J.lineRelevant({ id: 'mu9646' }), false); assert.equal(J.lineRelevant({ id: 'airbnb-2br', interest: true }), false, 'a Vientiane interest is not theirs');
  J.skip('bkk-stay', true, 'manual');
  assert.equal(G.readiness().ok, true); deq(G.steps().map((s) => s.state), ['complete', 'complete', 'na', 'na', 'complete', 'attention']);
  /* widening the scope re-opens what now applies — nothing is lost, nothing is invented */
  G.setScope({ vientiane: true });
  deq(G.missingFor('journey').map((m) => m.key), ['stage:train', 'stage:prewed', 'stage:wedstay'], 'the new stages are asked; the declined Bangkok stay stays declined');
  assert.equal(G.applicable('wedding'), true); assert.equal(G.done('wedding'), true, 'the wedding answers given earlier still stand');
  assert.equal(B.total(), 0);
});

test('NOT JOINING THIS STAGE · one direct action: from an untouched stage, from a selected flight, from a held room; Reconsider returns the stage to undecided', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  answerTheRest(w); G.setScope({ all: true });
  /* untouched */
  assert.equal(J.state(seg(J, 'train')), 'open');
  const r1 = await J.decline(seg(J, 'train')); assert.equal(r1.ok, true); assert.equal(J.state(seg(J, 'train')), 'declined'); assert.equal(J.manual(seg(J, 'train')), true, 'by the guest\'s own hand');
  assert.ok(!G.missingFor('journey').some((m) => m.key === 'stage:train'), 'no longer asked');
  J.skip('train', false); assert.equal(J.state(seg(J, 'train')), 'open', 'Reconsider: undecided again'); assert.ok(G.missingFor('journey').some((m) => m.key === 'stage:train'));
  /* a selected flight */
  B.put({ id: 'mu9646', name: 'MU9646', price: 155, qty: 1, cls: 'economy' }); assert.equal(J.state(seg(J, 'mu9646')), 'selected');
  const r2 = await J.decline(seg(J, 'mu9646')); assert.equal(r2.ok, true); assert.equal(J.state(seg(J, 'mu9646')), 'declined'); assert.equal(B.get().some((x) => x.id === 'mu9646'), false, 'the line is gone'); assert.equal(B.total(), 0);
  /* a held room: the place is released in the engine first, then the line goes, then the stage is declined */
  const sel = await ST.select('prewed', 'heritage'); assert.equal(sel.ok, true);
  assert.equal(J.state(seg(J, 'prewed')), 'selected'); assert.ok(U.mine('prewed'), 'a place is held');
  const r3 = await J.decline(seg(J, 'prewed')); assert.equal(r3.ok, true);
  assert.equal(J.state(seg(J, 'prewed')), 'declined'); assert.equal(U.mine('prewed'), null, 'the place is released'); assert.equal(B.get().some((x) => x.id === 'prewed'), false);
  const v = await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(PEGGY)) }, body: '{}' }));
  deq((await v.json()).mine, {}, 'the engine holds nothing for the guest');
  /* nobody else's resource moved */
  const other = await rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(STEFFIE)) }, body: JSON.stringify({ invitationId: STEFFIE.invitationId, guestId: STEFFIE.guestId, key: 'prewed/heritage', label: 'A', name: 'Steffie' }) }));
  assert.equal(other.status, 200);
  const r4 = await J.decline(seg(J, 'prewed')); assert.equal(r4.ok, true, 'declining an already declined stage is idempotent');
  const v2 = await (await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(STEFFIE)) }, body: '{}' }))).json();
  deq(v2.mine, { prewed: { key: 'prewed/heritage', label: 'A' } }, 'Steffie\'s hold is untouched');
});

test('TICKETS FOLLOW ATTENDANCE · a guest who leaves Vientiane releases only their own room and lines; the wedding pages ask nothing; the other guest keeps everything', async () => {
  const rooms = new Rooms(doState());
  const peggy = await livePage(PEGGY, rooms), steffie = await livePage(STEFFIE, rooms);
  answerTheRest(peggy); peggy.SIYL_GUEST.setScope({ all: true });
  assert.equal((await peggy.SIYL_STAY.select('prewed', 'heritage')).ok, true); assert.equal((await steffie.SIYL_STAY.select('prewed', 'heritage')).ok, true);
  peggy.SIYL_BAG.put({ id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 });
  /* Peggy will join Bangkok and China only: the model says which lines are no longer hers */
  peggy.SIYL_GUEST.setScope({ vientiane: false });
  const J = peggy.SIYL_JOURNEY, B = peggy.SIYL_BAG;
  deq(B.get().filter((x) => !J.lineRelevant(x)).map((x) => x.id).sort(), ['prewed', 'train'], 'the train and the Vientiane room are outside her trip now');
  /* the release goes through the same engine calls the guest would make herself */
  for (const x of B.get().filter((y) => !J.lineRelevant(y))) { const s = J.SEGMENTS.find((z) => z.ids.indexOf(x.id) >= 0); if (s && s.cat === 'Accommodation') await peggy.SIYL_STAY.remove(x.id); else B.remove(x.id); }
  assert.equal(peggy.SIYL_UNITS.mine('prewed'), null); deq(B.get(), []);
  const v = await (await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(STEFFIE)) }, body: '{}' }))).json();
  deq(v.mine, { prewed: { key: 'prewed/heritage', label: 'A' } }, 'Steffie keeps her place'); assert.equal(v.units['prewed/heritage'][0].taken, 1);
  assert.equal(peggy.SIYL_GUEST.applicable('wedding'), false); deq(peggy.SIYL_GUEST.missingFor('preparation'), []);
  /* the pages: the wedding, the preparation and the tickets say Not joining and offer no seat, no pass, no offering outside the scope */
  for (const f of ['wedding.html', 'wedding-preparation.html']) assert.match(src(f), /scopeAnswered\(\)&&!G0?\.joins\('vientiane'\)/, f + ' reads the scope');
  assert.match(src('tickets.html'), /J\.lineRelevant/, 'passes are the relevant lines'); assert.match(src('tickets.html'), /joins\('vientiane'\)/, 'seats only in Vientiane');
  assert.match(src('your-journey.html'), /function reconcileScope\(/, 'the planner releases what is outside the scope through the existing APIs');
  assert.match(src('your-journey.html'), /ST\.remove\(/); assert.doesNotMatch(src('your-journey.html'), /\/api\/rooms\/(assign|unassign|plan)/, 'never Guest Relations operations');
});

test('HARUTHAI · the hosts start at zero (Owner, 19 Sep 2026): no stage is arranged, nothing is held for anyone in advance, the Bangkok stay is asked of a host like every stage, a host chooses a room like every guest — and Room A is whoever chose it first\'s', async () => {
  const rooms = new Rooms(doState());
  /* the seed: no fixed allocation, no held stock, nobody named, no unit reserved; any authenticated guest may take any unit */
  deq(FIXED, [], 'FIXED is an empty export');
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.equal('heldFor' in s, false, key + ' names nobody'); }
  for (const u of unitsOf('bkk-stay/penthouse')) assert.equal(u.reservedFor, null, 'Room ' + u.label + ' is nobody\'s');
  deq(mayJoin(unitOf('bkk-stay/penthouse', 'A'), null), { ok: false, error: 'unauthorised' });
  deq(mayJoin(unitOf('bkk-stay/penthouse', 'A'), identity(HARUTHAI)), { ok: true }); deq(mayJoin(unitOf('bkk-stay/penthouse', 'A'), identity(PEGGY)), { ok: true }, 'any authenticated guest, any unit');
  /* the concept is gone from the code: no arrangement module, no page loads one, no Worker strip, no mail section */
  assert.equal(fs.existsSync(path.join(ROOT, 'assets/arranged.js')), false, 'assets/arranged.js is deleted');
  for (const f of ['your-journey.html', 'cart.html', 'review.html', 'profile.html', 'assets/journey.js', 'assets/rooms.js', 'assets/stay.js', 'assets/guest.js', 'src/worker.js', 'src/drafts.js', 'src/mail-templates.js']) {
    assert.doesNotMatch(src(f), /arranged\.js|SIYL_ARRANGED|Arranged for you|Fixed arrangement|fixedStagesOf|withoutFixed/, f + ' knows no arrangement');
  }
  const w = await livePage(HARUTHAI, rooms); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  assert.equal(w.SIYL_ARRANGED, undefined, 'window.SIYL_ARRANGED does not exist');
  assert.equal(G.scopeAnswered(), true, 'the hosts join everywhere by definition'); assert.equal(G.scopeWords(), 'Bangkok · Vientiane · China');
  assert.equal(U.fixed('bkk-stay'), false); assert.equal(U.fixedUnit('bkk-stay'), null); deq(U.fixedStages(), []); assert.equal(ST.fixed('bkk-stay'), false); assert.equal(ST.fixedSlug('bkk-stay'), ''); assert.equal(U.reserved('bkk-stay', 'penthouse'), false);
  assert.equal(U.mine('bkk-stay'), null); assert.equal(J.state(seg(J, 'bkk-stay')), 'open', 'never arranged'); assert.equal('fixed' in U.view(), false, 'the engine\'s view carries no fixed');
  /* the penthouse before anyone books: six rooms, twelve places, nothing taken, every unit as open to the hosts as to anyone */
  const s0 = U.summary('bkk-stay', 'penthouse'); assert.equal(s0.ownerReservedRooms, 0); assert.equal(s0.ownerReservedPlaces, 0); assert.equal(s0.remainingRooms, 6); assert.equal(s0.remainingPlaces, 12); assert.equal(s0.soldOut, false);
  for (const u of U.units('bkk-stay', 'penthouse')) { assert.equal(u.taken, 0); assert.equal(u.free, 2); assert.equal(u.eligible, true); assert.equal(u.reservedFor, null); }
  /* the Bag carries only actual selections: USD 0 with nothing chosen — and the Bangkok stay is a question for a host like every other stage */
  answerTheRest(w); assert.equal(B.total(), 0); deq(B.get(), []);
  assert.ok(G.missingFor('journey').some((m) => m.key === 'stage:bkk-stay'), 'the Bangkok stay is asked of the hosts too');
  for (const k of ALL.filter((x) => x !== 'bkk-stay')) J.skip(k, true, 'manual');
  deq(G.missingFor('journey').map((m) => m.key), ['stage:bkk-stay'], 'nothing answers the stage by itself');
  assert.equal(G.done('journey'), false); assert.equal(G.mayEnter('review'), false); assert.equal(G.readiness().ok, false, 'Review & Send waits for the host\'s own answer');
  /* Room A is whoever chose it first's — two guests, not the hosts by right */
  for (const g of [PEGGY, STEFFIE]) {
    const first = await rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(g)) }, body: JSON.stringify({ invitationId: g.invitationId, guestId: g.guestId, key: 'bkk-stay/penthouse', label: 'A', name: g.preferredName }) }));
    assert.equal(first.status, 200);
  }
  await U.load(true); assert.equal(U.units('bkk-stay', 'penthouse')[0].full, true, 'Room A is Peggy and Steffie\'s');
  /* a host chooses like every guest: the first room with a place, a real hold in her own name, a real Bag line, a real price */
  deq(await ST.select('bkk-stay', 'penthouse'), { ok: true, unit: 'B' }, 'the first room with a place — Room A is full');
  deq(U.mine('bkk-stay'), { key: 'bkk-stay/penthouse', label: 'B' }); assert.equal(J.state(seg(J, 'bkk-stay')), 'selected');
  assert.equal(B.get().length, 1); assert.equal(B.get()[0].id, 'bkk-stay'); assert.equal(B.get()[0].room, 'penthouse'); assert.equal(B.get()[0].unit, 'B'); assert.equal(B.get()[0].unitName, 'Room B');
  assert.ok(B.get()[0].price > 0, 'charged like every guest'); assert.equal(B.total(), B.get()[0].price);
  assert.equal(G.done('journey'), true); assert.equal(G.mayEnter('review'), true); assert.equal(G.readiness().ok, true, 'complete because the place is held — not because of who she is');
  ST.sync(); assert.equal(B.get().length, 1, 'the sync keeps the chosen room');
  /* Suthep, of the same party, starts at zero too: he is offered the room Haruthai is in and holds a place of his own in it */
  const s = await livePage(SUTHEP, rooms); const SU = s.SIYL_UNITS, SJ = s.SIYL_JOURNEY;
  assert.equal(SU.fixed('bkk-stay'), false); assert.equal(SU.mine('bkk-stay'), null); assert.equal(SJ.state(seg(SJ, 'bkk-stay')), 'open'); deq(s.SIYL_BAG.get(), []);
  assert.equal(SU.suggest('bkk-stay', 'penthouse').label, 'B'); deq(SU.units('bkk-stay', 'penthouse')[1].occupants.map((o) => [o.name, o.party, o.mine]), [['Haruthai', true, false]], 'his party\'s first name, visible');
  deq(await s.SIYL_STAY.select('bkk-stay', 'penthouse'), { ok: true, unit: 'B' });
  const roomB = SU.units('bkk-stay', 'penthouse')[1]; assert.equal(roomB.taken, 2); assert.equal(roomB.full, true); assert.equal(SU.unitWords(roomB), 'Haruthai · You · Full');
  assert.equal(SJ.state(seg(SJ, 'bkk-stay')), 'selected'); assert.equal(s.SIYL_BAG.get()[0].unit, 'B'); assert.ok(s.SIYL_BAG.total() > 0);
  /* and it may go again — nothing is left behind, the stage is a question once more */
  const rm = await ST.remove('bkk-stay'); assert.equal(rm.ok, true); deq(B.get(), []); assert.equal(B.total(), 0); assert.equal(U.mine('bkk-stay'), null); assert.equal(U.fixed('bkk-stay'), false); assert.equal(J.state(seg(J, 'bkk-stay')), 'open');
  assert.equal(G.done('journey'), false); assert.equal(G.readiness().ok, false); deq(G.missingFor('journey').map((m) => m.key), ['stage:bkk-stay']);
  const v = await (await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(SUTHEP)) }, body: '{}' }))).json();
  deq(v.mine, { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'B' } }, 'Suthep keeps his own place'); assert.equal(v.units['bkk-stay/penthouse'][1].taken, 1); assert.equal(v.units['bkk-stay/penthouse'][0].taken, 2, 'Peggy and Steffie keep Room A'); assert.equal('fixed' in v, false);
  /* the emails: host-ness is the record's flag (never a room) — "Front centre" for a host without a ceremony seat; no arranged section for anyone */
  const rec = (hosts) => ({ invitationId: 'INV-G048', guestId: 'G048', hosts, submissionId: 'SYL-G048-00000001', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', firstSentAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z',
    recipient: { email: 'host@example.com', phone: '+66 81 234 5678' }, rooms: null,
    registration: { channel: 'journey-shop', guestId: 'G048', totalUsd: 0, contact: { email: 'host@example.com', phone: '+66 81 234 5678' }, selections: [],
      templeCeremony: { guests: [{ guestId: 'G048', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' } }] },
      guestRecord: { scope: { bangkok: true, vientiane: true, china: true, none: false, at: '2026-09-19T09:00:00.000Z' }, scopeWords: 'Bangkok · Vientiane · China', guests: [{ guestId: 'G048', name: 'Haruthai', source: { fullName: 'Haruthai Test', preferredName: 'Haruthai' }, profile: {} }] } } });
  const M = journeyModel(rec(true)); assert.equal(M.hosts, true); deq(M.arranged, []); assert.equal(M.seats.ceremony.label, 'Front centre'); deq(M.stays, [], 'no stay the host did not choose');
  assert.equal(journeyModel(rec(false)).hosts, false); assert.equal(journeyModel(rec(false)).seats.ceremony.label, '', 'no flag, no front-centre place');
  for (const m of [composeGuestMail(rec(true)), composeOwnerMail(rec(true), 'https://x/api/status')]) { assert.ok(m.text.includes('Front centre')); assert.doesNotMatch(m.text + m.html, /Arranged for you|Fixed arrangement|Room A/); }
});

test('MY FAVORITE FLAVOR · one choice of six; nothing else is accepted; the retired snack answer migrates only when it is one of the six; the answer reaches the payload', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, id = PEGGY.guestId;
  const q = G.PROFILE.find((x) => x.key === 'flavor');
  deq(q, { key: 'flavor', n: '03', q: 'My Favorite Flavor', hint: 'Choose one.', required: true, type: 'choice', choices: ['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk'] });
  assert.ok(!G.PROFILE.some((x) => x.key === 'treat' || /snack/i.test(x.q)));
  assert.equal(G.profile(id, 'flavor'), ''); assert.ok(G.aboutMissing().some((m) => m.key === 'profile:flavor'), 'required');
  G.setProfile(id, 'flavor', 'Pizza'); assert.equal(G.profile(id, 'flavor'), '', 'not one of the six');
  G.setProfile(id, 'flavor', 'Pandan'); assert.equal(G.profile(id, 'flavor'), 'Pandan'); assert.ok(!G.aboutMissing().some((m) => m.key === 'profile:flavor'));
  G.setProfile(id, 'flavor', 'Matcha Green Tea'); assert.equal(G.profile(id, 'flavor'), 'Matcha Green Tea', 'single select: the new choice replaces the old');
  assert.equal(G.operational().guests[0].profile.flavor, 'Matcha Green Tea');
  /* older drafts: a snack answer that happens to be one of the six is kept; anything else asks again */
  const w2 = page({ auth: PEGGY, seed: { 'siyl.guest': { guests: { [id]: { submitted: {}, profile: { treat: 'Coffee' }, history: [] } } } } });
  assert.equal(w2.SIYL_GUEST.profile(id, 'flavor'), 'Coffee');
  const w3 = page({ auth: PEGGY, seed: { 'siyl.guest': { guests: { [id]: { submitted: {}, profile: { treat: 'Mango sticky rice' }, history: [] } } } } });
  assert.equal(w3.SIYL_GUEST.profile(id, 'flavor'), ''); assert.ok(w3.SIYL_GUEST.aboutMissing().some((m) => m.key === 'profile:flavor'));
  /* the page renders the six as one radiogroup; the draft keeps the key */
  assert.match(src('about-you.html'), /role="radiogroup" aria-label="'\+esc\(q\.q\)\+'" data-choice="'\+q\.key\+'"/); assert.match(src('about-you.html'), /role="radio" aria-checke/); assert.match(src('assets/invite.mjs'), /\['coffeetea', 'flavor', 'drink'\]/);
  for (const f of ['about-you.html', 'review.html', 'profile.html', 'assets/i18n/siyl-i18n.js', 'src/mail-templates.js']) assert.doesNotMatch(src(f), /Favorite Snack|favourite snack/i, f + ' has no snack');
});

test('EMAILS · both emails carry where the guest joins us, in the guest\'s words', () => {
  const base = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', kind: 'initial', version: 1, submittedAt: '2026-09-18T10:00:00.000Z', firstSentAt: '2026-09-18T10:00:00.000Z', lastSentAt: '2026-09-18T10:00:00.000Z', recipient: { email: 'sam@example.org', phone: '+66 81 000 0000' }, rooms: null };
  const reg = (gr) => ({ channel: 'journey-shop', guestId: 'G777', totalUsd: 0, contact: { email: 'sam@example.org', phone: '+66 81 000 0000' }, selections: [], guestRecord: { ...gr, guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: { flavor: 'Butter' } }] } });
  const a = composeGuestMail({ ...base, registration: reg({ scope: { bangkok: true, vientiane: true, china: false, none: false }, scopeWords: 'Bangkok · Vientiane' }) });
  assert.ok(a.text.includes('Where you join us: Bangkok · Vientiane')); assert.ok(a.html.includes('Bangkok · Vientiane'));
  const b = composeOwnerMail({ ...base, registration: reg({ scope: { bangkok: false, vientiane: false, china: false, none: true }, scopeWords: 'Not joining this trip' }) }, 'https://x/api/status');
  assert.ok(b.text.includes('Where they join us: Not joining this trip'));
  const c = composeGuestMail({ ...base, registration: reg({}) }); assert.ok(!c.text.includes('Where you join us'), 'an older record without the answer prints no row');
});

/* ---- CODEX FINAL PASS (18 Sep 2026) — five findings, each a regression ---- */

test('CODEX 011-1 · a release that fails keeps the stage held AND named: readiness refuses to send until it is released', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  answerTheRest(w); G.setScope({ all: true });
  assert.equal((await ST.select('prewed', 'heritage')).ok, true); for (const k of ALL.filter((x) => x !== 'prewed')) J.skip(k, true, 'manual');
  assert.equal(G.readiness().ok, true);
  /* the guest leaves Vientiane; the engine cannot be reached for the release */
  G.setScope({ vientiane: false });
  const realFetch = w.fetch; w.fetch = () => Promise.reject(new Error('offline'));
  const r = await ST.remove('prewed'); assert.equal(r.ok, false, 'the release failed');
  assert.ok(U.mine('prewed'), 'the place is still held'); assert.equal(B.get().some((x) => x.id === 'prewed'), true, 'the line is still there');
  const stale = G.staleFor(); assert.ok(stale.some((m) => m.key === 'release:prewed'), 'what is outside the trip is named'); assert.equal(stale[0].href, 'your-journey.html#scope');
  assert.equal(G.readiness().ok, false, 'Review & Send waits'); assert.ok(G.missingFor('journey').some((m) => /^release:/.test(m.key)));
  /* and the same for "I won't be joining this trip" */
  G.setScope({ none: true }); assert.equal(G.readiness().ok, false); assert.ok(G.missingFor('journey').some((m) => m.key === 'release:prewed'));
  /* the engine comes back: released, and the trip is ready */
  w.fetch = realFetch; assert.equal((await ST.remove('prewed')).ok, true); assert.equal(G.staleFor().length, 0); assert.equal(G.readiness().ok, true);
  /* the seats too: a held seat outside Vientiane is named while it lasts */
  const seats = { mine: { ceremony: { [PEGGY.guestId]: 'C-R-05-02' }, dinner: {} }, open: true, frozen: false, configured: { ceremony: true, dinner: true } };
  w.SIYL_SEATS = { ready: () => true, seatOf: (ev, id) => (seats.mine[ev] || {})[id] || null, open: () => true, frozen: () => false, configured: () => true, view: () => seats, mine: () => seats.mine };
  assert.ok(G.staleFor().some((m) => m.key === 'release:seat:ceremony')); assert.equal(G.readiness().ok, false);
  seats.mine.ceremony = {}; assert.equal(G.readiness().ok, true);
  /* the planner: a failed release is named on the scope card with a way to release again; the page retries once per answer */
  const yj = src('your-journey.html');
  assert.match(yj, /data-scope-failed/); assert.match(yj, /data-scope-retry>Release again</); assert.match(yj, /G\.staleFor&&G\.staleFor\(\)\.length&&RECON!==scopeTag\(\)\)reconcileScope\(\)/);
});

test('CODEX 011-2 · a guest not joining Vientiane sends no wedding attendance: every moment reads Not joining, no offering, no seat — in the payload and both emails', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = PEGGY.guestId;
  answerTheRest(w); T.setAttendance(id, 'yes'); T.setOffering(id, 'yes'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes'));
  G.setScope({ all: true });
  let op = T.operational(); assert.equal(op.guests[0].events.dinner, 'Joining'); assert.equal(op.participation, 'Joining Vientiane');
  G.setScope({ none: true });
  op = T.operational();
  assert.equal(op.participation, 'Not joining this trip'); deq(op.guests[0].events, { temple: 'Not joining', coffee: 'Not joining', vows: 'Not joining', dinner: 'Not joining' });
  assert.equal(op.guests[0].temple, 'Not attending'); assert.equal(op.guests[0].sangkhathan, false); assert.equal(op.guests[0].sangkhathanState, 'Not applicable'); assert.equal(op.offerings, 0); deq(op.guests[0].open, []);
  G.setScope({ bangkok: true }); assert.equal(T.operational().participation, 'Not joining Vientiane'); assert.equal(T.operational().guests[0].events.vows, 'Not joining');
  /* the offering line follows: the temple module's own sync never brings it back on a later page load (Codex confirming pass) */
  deq(T.offeringGuests(), []); w.SIYL_BAG.put({ id: 'sangkhathan', name: 'Sangkhathan', price: 15, qty: 1 }); T.sync(); assert.equal(w.SIYL_BAG.has('sangkhathan'), false, 'the line leaves with the scope');
  /* the answers themselves stay on the device for a reconsideration */
  G.setScope({ vientiane: true }); assert.equal(T.operational().guests[0].events.dinner, 'Joining');
  /* the emails: an older record shape that still carries "Joining" answers with a scope outside Vientiane prints Not joining, no seat */
  const base = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', kind: 'initial', version: 1, submittedAt: '2026-09-18T10:00:00.000Z', firstSentAt: '2026-09-18T10:00:00.000Z', lastSentAt: '2026-09-18T10:00:00.000Z', recipient: { email: 'sam@example.org', phone: '+66 81 000 0000' }, rooms: null,
    seats: { ceremony: { G777: 'C-R-05-02' }, dinner: { G777: 'D-T-05' } },
    registration: { channel: 'journey-shop', guestId: 'G777', totalUsd: 15, contact: { email: 'sam@example.org', phone: '+66 81 000 0000' }, selections: [{ id: 'sangkhathan', name: 'Sangkhathan', price: 15 }],
      templeCeremony: { guests: [{ guestId: 'G777', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' }, sangkhathan: true, sangkhathanState: 'Selected' }] },
      guestRecord: { scope: { bangkok: true, vientiane: false, china: false, none: false, at: '2026-09-18T09:00:00.000Z' }, scopeWords: 'Bangkok', guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } };
  for (const mail of [composeGuestMail(base), composeOwnerMail(base, 'https://x/api/status')]) {
    assert.ok(!/Joining\b(?! Vientiane)/.test(mail.text.replace(/Not joining/g, '')), 'no Joining answer survives'); assert.ok((mail.text.match(/Not joining/g) || []).length >= 4, 'every moment reads Not joining');
    assert.ok(!/Seat [A-Z]?\d/.test(mail.text), 'no seat'); assert.ok(!/Sangkhathan: Yes|Sangkhathan · Yes/.test(mail.text), 'no offering');
  }
});

test('CODEX 011-3 · the Essential trip is Vientiane\'s: for a guest not joining Vientiane packagePlan("essential") covers no stage and adds nothing, and no card is offered; a plan never touches a stage outside the trip or one the package does not cover — and moves on capacity, never price', async () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  answerTheRest(w); G.setScope({ bangkok: true });
  deq(Object.keys(J.packages().essential.stages), ['wedstay'], 'the Essential trip is the wedding stay alone');
  deq(J.packages().essential.stages.wedstay, ['wedstay/heritage', 'wedstay/heritage-executive', 'wedstay/heritage-grand-premier', 'riverside/superior-window', 'guesthouse/guest-house'], 'its defined chain: the wedding house, then the Riverside, then the Guest House');
  deq(J.packageOrder(), ['complete', 'essential']);
  deq(J.packageStages('essential'), [], 'no stage of it is part of a Bangkok-only trip');
  const plan = J.packagePlan('essential');
  deq(plan.rows, []); deq(plan.add, [], 'nothing of Vientiane is added'); deq(plan.remove, []); deq(plan.unskip, []); deq(plan.waitlist, []); assert.equal(plan.total, 0); assert.equal(plan.need, 2, 'Peggy and Steffie');
  deq(plan.counts, { stages: 0, defaults: 0, fallbacks: 0, waitlisted: 0, replaced: 0, same: 0 }); assert.equal(J.planSignature(plan), '#' + plan.need, 'nothing but the party size');
  /* a plan is pure: nothing moved, nothing marked */
  deq(B.get(), []); assert.equal(J.isSkipped('bkk-stay'), false); assert.equal(J.state(seg(J, 'bkk-stay')), 'open'); deq(J.counts(), { relevant: 1, confirmed: 0, waitlisted: 0, declined: 0, open: 1, excluded: 9, resolved: 0, bagItems: 0, bagTotal: 0 });
  /* the page offers no card for a package that covers no stage of the trip; the old planner is gone */
  assert.match(src('your-journey.html'), /function packageCard\(kind\)\{\n\s*var pk=J\.packages\(\)\[kind\];if\(!pk\)return '';\n\s*var stages=J\.packageStages\(kind\);if\(!stages\.length\)return '';/, 'no card without a stage of the trip');
  assert.match(src('your-journey.html'), /data-package="'\+kind\+'"/); assert.match(src('your-journey.html'), /data-package-preview="'\+kind\+'"/);
  for (const f of ['your-journey.html', 'assets/journey.js', 'assets/packages-data.js', 'cart.html', 'review.html']) assert.doesNotMatch(src(f), /id="csb"|id="fxb"|Cost Saving|self-arranged|selfArranged|costSavingPlan|costSavingOptions|fullExperience|soldOutStages|Every stage you have already chosen stays exactly as you chose it/, f + ' has no old planner');
  /* joining Vientiane: the plan is the wedding stay and only the wedding stay — the other stages of the trip, chosen or declined, are never touched */
  G.setScope({ vientiane: true }); J.skip('bkk-stay', true, 'manual'); J.skip('train', true, 'manual'); B.put({ id: 'prewed', name: 'Pre-Wedding Vientiane', price: 290, qty: 1, stay: 'souphattra', room: 'heritage' });
  deq(J.packageStages('essential').map((s) => s.key), ['wedstay']);
  const plan2 = J.packagePlan('essential');
  assert.equal(plan2.ready, false, 'no engine on this page: the default is planned, decided again on confirm');
  deq(plan2.rows.map((r) => [r.seg.key, r.why, r.key, r.unit, r.wasDeclined, r.replaces, r.wanted, r.tried]), [['wedstay', 'default', 'wedstay/heritage', null, false, null, 'wedstay/heritage', ['wedstay/heritage']]]);
  assert.equal(plan2.add.length, 1); assert.equal(plan2.add[0].id, 'wedstay'); assert.equal(plan2.add[0].room, 'heritage'); assert.equal(plan2.add[0].by, 'essential'); assert.equal(plan2.add[0].qty, 1);
  deq(plan2.remove, [], 'the pre-wedding line stays'); deq(plan2.unskip, [], 'the declined Bangkok stay and train stay declined'); deq(plan2.waitlist, []);
  assert.ok(plan2.total > 0); assert.equal(plan2.total, plan2.add[0].price); assert.match(J.planSignature(plan2), new RegExp('^wedstay:default:wedstay/heritage::' + plan2.total + ':'));
  deq(plan2.counts, { stages: 1, defaults: 1, fallbacks: 0, waitlisted: 0, replaced: 0, same: 0 });
  assert.equal(J.isSkipped('bkk-stay'), true); assert.equal(J.isSkipped('train'), true); deq(B.get().map((x) => x.id), ['prewed'], 'pure again');
  /* the one stage it covers: a "not joining" there is reversed, a current wedding-stay line is what it replaces */
  J.skip('wedstay', true, 'manual'); const plan3 = J.packagePlan('essential'); deq(plan3.unskip, ['wedstay']); assert.equal(plan3.rows[0].wasDeclined, true); deq(plan3.remove, []);
  J.skip('wedstay', false); B.put({ id: 'riverside', name: 'Riverside Hotel Vientiane', price: 100, qty: 1, stay: 'riverside', room: 'superior-window' });
  const plan4 = J.packagePlan('essential'); assert.equal(plan4.rows[0].replaces.id, 'riverside'); deq(plan4.remove, ['riverside']); assert.equal(plan4.counts.replaced, 1); deq(plan4.unskip, []);
  /* with the engine: the unit is named; when no room of the default can take the WHOLE party the chain moves to the next defined option — a dearer one — because capacity decides, never price */
  const rooms = new Rooms(doState());
  const live = await livePage(PEGGY, rooms); answerTheRest(live); live.SIYL_GUEST.setScope({ vientiane: true });
  const p5 = live.SIYL_JOURNEY.packagePlan('essential'); assert.equal(p5.ready, true); deq([p5.rows[0].why, p5.rows[0].key, p5.rows[0].unit], ['default', 'wedstay/heritage', 'A']);
  for (const [i, label] of ['A', 'B', 'C', 'D', 'E'].entries()) {
    const g = session({ guestId: 'g-fill-' + i, partyId: 'INV-FILL-' + i, partyName: 'Guest ' + i, fullName: 'Guest ' + i, preferredName: 'Guest ' + i, members: [{ guestId: 'g-fill-' + i, preferredName: 'Guest ' + i }] });
    const j = await rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(g)) }, body: JSON.stringify({ invitationId: g.invitationId, guestId: g.guestId, key: 'wedstay/heritage', label, name: g.preferredName }) }));
    assert.equal(j.status, 200);
  }
  await live.SIYL_UNITS.load(true);
  assert.equal(live.SIYL_UNITS.summary('wedstay', 'heritage').remainingPlaces, 5, 'five single places remain — none of them room for two');
  const p6 = live.SIYL_JOURNEY.packagePlan('essential');
  deq([p6.rows[0].why, p6.rows[0].key, p6.rows[0].unit, p6.rows[0].wanted, p6.rows[0].tried], ['fallback', 'wedstay/heritage-executive', 'A', 'wedstay/heritage', ['wedstay/heritage', 'wedstay/heritage-executive']]);
  assert.ok(p6.rows[0].amount > p5.rows[0].amount, 'the replacement costs more: price never decided'); deq(p6.counts, { stages: 1, defaults: 0, fallbacks: 1, waitlisted: 0, replaced: 0, same: 0 }); deq(p6.waitlist, []);
  const lin = await livePage(LIN, rooms); answerTheRest(lin); lin.SIYL_GUEST.setScope({ vientiane: true });
  const p7 = lin.SIYL_JOURNEY.packagePlan('essential'); assert.equal(p7.need, 1); deq([p7.rows[0].why, p7.rows[0].key, p7.rows[0].unit], ['default', 'wedstay/heritage', 'A'], 'a party of one still fits the default');
});

test('CODEX 011-4 · a decision made while the first copy is being read wins: the server\'s older value for that key is what was being fetched, never a competing edit', async () => {
  let resolveGet; const gets = [];
  const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/guest.js', 'assets/temple.js', 'assets/docs.js', 'assets/confirm.js', 'assets/transport-data.js', 'assets/journey.js', 'assets/draft.js'],
    fetch: (url, init) => { if (!init || !init.method || init.method === 'GET') { gets.push(url); return new Promise((r) => { resolveGet = r; }); } return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: {}, updatedAt: '2026-09-18T10:00:01.000Z', savedAt: '2026-09-18T10:00:01.000Z' } }) }); } });
  const D = w.SIYL_DRAFT, J = w.SIYL_JOURNEY; assert.ok(D && D.pull, 'the draft module is loaded');
  const before = gets.length;   /* the module's own read on load stays in flight; the read under test is the one that leaves now */
  const pulling = D.pull(); await Promise.resolve(); assert.equal(gets.length, before + 1, 'the read left');
  /* the guest declines the train while the read is in flight — on a fresh device nothing was stored before */
  J.skip('train', true, 'manual'); assert.equal(J.isSkipped('train'), true);
  resolveGet({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: { 'siyl.skip': '[]', 'siyl.skip.by': '{}', 'siyl.guest': '{}' }, updatedAt: '2026-09-18T10:00:00.000Z', savedAt: '2026-09-18T10:00:00.000Z' } }) });
  await pulling; await new Promise((r) => setTimeout(r, 0));
  assert.equal(J.isSkipped('train'), true, 'the stage stays declined'); assert.equal(J.skippedBy('train'), 'manual');
  assert.equal(w.localStorage.getItem('siyl.guest'), '{}', 'a key the guest did not touch follows the server');
});

test('CODEX 011-5 · both emails carry My Favorite Flavor — and a migrated record\'s snack answer only when it is one of the six', () => {
  const base = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', kind: 'initial', version: 1, submittedAt: '2026-09-18T10:00:00.000Z', firstSentAt: '2026-09-18T10:00:00.000Z', lastSentAt: '2026-09-18T10:00:00.000Z', recipient: { email: 'sam@example.org', phone: '+66 81 000 0000' }, rooms: null };
  const rec = (profile) => ({ ...base, registration: { channel: 'journey-shop', guestId: 'G777', totalUsd: 0, contact: { email: 'sam@example.org', phone: '+66 81 000 0000' }, selections: [], guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile }] } } });
  const compose = (r) => [composeGuestMail(r), composeOwnerMail(r, 'https://x/api/status')];
  for (const [profile, want, not] of [[{ flavor: 'Pandan' }, 'My Favorite Flavor: Pandan', null], [{ treat: 'Coffee' }, 'My Favorite Flavor: Coffee', null], [{ treat: 'Mango sticky rice' }, null, 'Mango sticky rice'], [{ flavor: 'Pizza', treat: 'Milk' }, 'My Favorite Flavor: Milk', 'Pizza']]) {
    for (const m of compose(rec(profile))) { if (want) assert.ok(m.text.includes(want), want); if (not) assert.ok(!m.text.includes(not), 'never ' + not); assert.ok(!/Favourite:/.test(m.text), 'the retired label is gone'); }
  }
});

/* ---- CODEX CONFIRMING PASS (18 Sep 2026) — four findings, each a regression ---- */

test('CODEX 011-6 · one reconciliation at a time: the guard is set before any mutation, a Bag removal re-rendering synchronously never re-enters, an answer changed meanwhile is reconciled afterwards; the offering line leaves only when it is in the Bag', () => {
  const yj = src('your-journey.html');
  const fn = yj.slice(yj.indexOf('function reconcileScope(){'), yj.indexOf('/* ---- COMPLETE / ESSENTIAL JOURNEY'));
  assert.match(fn, /if\(RECONCILING\)\{RECON_AGAIN=true;return\}\n\s*RECONCILING=true;RECON=tag;RECON_AGAIN=false;\n\s*var jobs=\[\],failed=\[\];/, 'the guard and the tag are set before the first mutation');
  assert.ok(fn.indexOf('RECONCILING=true') < fn.indexOf('SIYL_BAG.remove('), 'no Bag removal before the guard');
  assert.match(fn, /var finish=function\(\)\{RECON_FAILED=failed;RECONCILING=false;render\(\);if\(RECON_AGAIN\)\{RECON_AGAIN=false;RECON='';reconcileScope\(\)\}\};\n\s*Promise\.all\(jobs\)\.then\(finish,finish\);/, 'the guard clears when every release has answered, then a queued answer runs once');
  assert.match(fn, /if\(!G\.joins\('vientiane'\)&&SIYL_BAG\.has&&SIYL_BAG\.has\('sangkhathan'\)\)\{SIYL_BAG\.remove\('sangkhathan'\)\}/, 'the offering line is removed only when it exists — never on the earlier answer alone');
  assert.match(yj, /&&!RECONCILING&&G\.staleFor&&G\.staleFor\(\)\.length&&RECON!==scopeTag\(\)\)reconcileScope\(\)/, 'render() never starts a reconciliation while one runs');
});

test('CODEX 011-7 · an engine hold outside the trip with no Bag line of its own is named and released through the engine — never stranded', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms); const G = w.SIYL_GUEST, U = w.SIYL_UNITS, B = w.SIYL_BAG;
  answerTheRest(w); G.setScope({ all: true });
  /* the hold exists in the engine only (a stale draft, a migration): no Bag line */
  const j = await rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(PEGGY)) }, body: JSON.stringify({ invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, key: 'prewed/heritage', label: 'A', name: 'Peggy' }) }));
  assert.equal(j.status, 200); await U.load(true); assert.ok(U.mine('prewed'));
  /* the sync brings the line back from the hold; a stale draft leaves it without its room — the reconciliation removes such a line
     and the hold would be stranded were the engine's own holds not walked */
  B.set(B.get().map((x) => { const c = Object.assign({}, x); delete c.room; return c; })); assert.equal(B.get()[0].room, undefined);
  G.setScope({ vientiane: false });
  assert.ok(G.staleFor().some((m) => m.key === 'release:prewed'), 'the line is named'); assert.equal(G.readiness().ok, false);
  B.remove('prewed'); deq(B.get(), []); assert.ok(U.mine('prewed'), 'the hold is still the engine\'s');
  assert.ok(G.staleFor().some((m) => m.key === 'release:room:prewed'), 'the hold is named on its own'); assert.equal(G.readiness().ok, false);
  const r = await U.leave('prewed'); assert.equal(r.ok, true); assert.ok(!U.mine('prewed')); assert.equal(G.staleFor().length, 0); assert.ok(!G.missingFor('journey').some((m) => /^release:/.test(m.key)), 'nothing left to release');
  const yj = src('your-journey.html');
  assert.match(yj, /var mine=U\.view\(\)\.mine\|\|\{\};Object\.keys\(mine\)\.forEach\(function\(stage\)\{if\(done\[stage\]\)return;/, 'the planner walks the engine\'s own holds'); assert.match(yj, /jobs\.push\(track\(seg\?seg\.place:stage,U\.leave\(stage\)\)\)/, 'and releases each through the engine');
  /* a host's hold is an ordinary hold (Owner, 19 Sep 2026): nothing is arranged, so a host holds nothing until he chooses — and what he
     holds outside his trip is named and released through the engine like anyone's */
  const h = await livePage(SUTHEP, rooms); const HG = h.SIYL_GUEST, HU = h.SIYL_UNITS, HB = h.SIYL_BAG;
  assert.equal(HU.fixed('bkk-stay'), false); assert.equal(HU.mine('bkk-stay'), null); deq(HG.staleFor(), [], 'nothing held, nothing named');
  HG.setScope({ bangkok: false }); deq(HG.staleFor(), [], 'still nothing: no arrangement exists to be outside the trip');
  HG.setScope({ bangkok: true }); deq(await h.SIYL_STAY.select('bkk-stay', 'penthouse'), { ok: true, unit: 'A' }, 'a host books like every guest'); HB.remove('bkk-stay'); assert.ok(HU.mine('bkk-stay'), 'the hold stands on its own');
  HG.setScope({ bangkok: false });
  assert.ok(HG.staleFor().some((m) => m.key === 'release:room:bkk-stay'), 'the host\'s hold is named like anyone\'s'); assert.ok(HG.missingFor('journey').some((m) => m.key === 'release:room:bkk-stay'));
  const hr = await HU.leave('bkk-stay'); assert.equal(hr.ok, true); assert.equal(HU.mine('bkk-stay'), null); deq(HG.staleFor(), []); assert.ok(!HG.missingFor('journey').some((m) => /^release:/.test(m.key)));
  const hv = await (await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(SUTHEP)) }, body: '{}' }))).json();
  deq(hv.mine, {}, 'the engine holds nothing for the host'); assert.equal(hv.units['bkk-stay/penthouse'][0].taken, 0);
});

test('CODEX 011-8 · a frozen seating ledger never blocks a truthful decline: the seat is Guest Relations\' to release, the decline is sent', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, id = PEGGY.guestId;
  answerTheRest(w); G.setScope({ bangkok: true });
  const seats = { mine: { ceremony: { [id]: 'C-R-05-02' }, dinner: { [id]: 'D-T-05' } }, open: true, frozen: true };
  w.SIYL_SEATS = { ready: () => true, seatOf: (ev, g) => (seats.mine[ev] || {})[g] || null, open: () => seats.open, frozen: () => seats.frozen, configured: () => true, view: () => seats, mine: () => seats.mine };
  for (const k of ['bkk-stay']) w.SIYL_JOURNEY.skip(k, true, 'manual');
  assert.equal(G.staleFor().length, 0, 'frozen: no blocker'); assert.equal(G.readiness().ok, true);
  seats.frozen = false; assert.equal(G.staleFor().length, 2, 'open: both seats are named until released'); assert.equal(G.readiness().ok, false);
  seats.open = false; assert.equal(G.staleFor().length, 0, 'closed: no blocker');
  assert.match(src('your-journey.html'), /if\(!S\.open\(\)\|\|S\.frozen\(\)\)return Promise\.resolve\(\[\]\);/, 'the planner does not even try while the ledger is not the guest\'s to change');
  assert.equal(w.SIYL_TEMPLE.operational().participation, 'Not joining Vientiane', 'what is sent says so');
});

test('CODEX 011-9 · the live edit is replayed onto the fetched copy — a removal made elsewhere never comes back, a line added here is added, a field changed here is changed, the rest is the server\'s', async () => {
  const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/guest.js', 'assets/draft.js'] }); const R = w.SIYL_DRAFT._replay;
  const j = JSON.stringify;
  /* device A cached the train; device B removed it; during A's read the guest added 1872 here */
  assert.equal(R('siyl.bag', j([{ id: 'train', price: 100 }]), j([{ id: 'train', price: 100 }, { id: '1872', price: 180 }]), j([])), j([{ id: '1872', price: 180 }]));
  /* a line changed here replaces the server's copy of that line; the server's other lines stay */
  assert.equal(R('siyl.bag', j([{ id: 'bkk-stay', room: null }]), j([{ id: 'bkk-stay', room: 'u-sathorn', unit: 'B' }]), j([{ id: 'bkk-stay', room: null }, { id: 'train' }])), j([{ id: 'bkk-stay', room: 'u-sathorn', unit: 'B' }, { id: 'train' }]));
  /* a line removed here is removed from the server's copy too */
  assert.equal(R('siyl.bag', j([{ id: 'train' }, { id: 'kmg' }]), j([{ id: 'kmg' }]), j([{ id: 'train' }, { id: 'kmg' }, { id: 'ljg' }])), j([{ id: 'kmg' }, { id: 'ljg' }]));
  /* the decisions as a set */
  assert.equal(R('siyl.skip', '["prewed"]', '["train"]', '["prewed","kmg"]'), '["kmg","train"]');
  /* the record field by field: the scope set here, the contact from the server kept, a nested profile merged */
  assert.equal(R('siyl.guest', '{}', j({ scope: { bangkok: true, at: 'x' } }), j({ contact: { email: 'a@b' } })), j({ contact: { email: 'a@b' }, scope: { bangkok: true, at: 'x' } }));
  assert.equal(R('siyl.guest', j({ guests: { g: { profile: { drink: 'tea' } } } }), j({ guests: { g: { profile: { drink: 'tea', flavor: 'Milk' } } } }), j({ guests: { g: { profile: { drink: 'coffee', film: 'x' } } } })), j({ guests: { g: { profile: { drink: 'coffee', film: 'x', flavor: 'Milk' } } } }));
  /* through the pull itself: the cached train is not resurrected, the 1872 added during the read is kept and pushed */
  let resolveGet; const gets = [], puts = [];
  const w2 = page({ auth: PEGGY, seed: { 'siyl.bag': j([{ id: 'train', price: 100 }]) }, modules: ['assets/bag.js', 'assets/guest.js', 'assets/journey.js', 'assets/draft.js'],
    fetch: (url, init) => { if (!init || !init.method || init.method === 'GET') { gets.push(url); return new Promise((r) => { resolveGet = r; }); } puts.push(JSON.parse(init.body)); return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: JSON.parse(init.body).keys, updatedAt: '2026-09-18T10:00:01.000Z', savedAt: '2026-09-18T10:00:01.000Z' } }) }); } });
  const before = gets.length; const pulling = w2.SIYL_DRAFT.pull(); await Promise.resolve(); assert.equal(gets.length, before + 1);
  w2.SIYL_BAG.put({ id: '1872', name: '1872', price: 180, qty: 1 });
  resolveGet({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: { 'siyl.bag': '[]' }, updatedAt: '2026-09-18T10:00:00.000Z', savedAt: '2026-09-18T10:00:00.000Z' } }) });
  await pulling; await new Promise((r) => setTimeout(r, 0));
  deq(JSON.parse(w2.localStorage.getItem('siyl.bag')).map((x) => x.id), ['1872'], 'the removal made elsewhere stands; the line added here is here');
});

/* ---- CODEX THIRD PASS (18 Sep 2026) — two replay findings, each a regression through the real pull ---- */

test('CODEX 011-10 · a fresh device that answers the question while the first copy is being read keeps every saved answer of the server\'s record — and sends the merged record, not an emptied one', async () => {
  let resolveGet; const gets = [], puts = [];
  const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/guest.js', 'assets/journey.js', 'assets/draft.js'],
    fetch: (url, init) => { if (!init || !init.method || init.method === 'GET') { gets.push(url); return new Promise((r) => { resolveGet = r; }); } puts.push(JSON.parse(init.body)); return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: JSON.parse(init.body).keys, updatedAt: '2026-09-18T10:00:01.000Z', savedAt: '2026-09-18T10:00:01.000Z' } }) }); } });
  const G = w.SIYL_GUEST, id = PEGGY.guestId; assert.equal(w.localStorage.getItem('siyl.guest'), null, 'nothing on the device yet');
  const before = gets.length; const pulling = w.SIYL_DRAFT.pull(); await Promise.resolve(); assert.equal(gets.length, before + 1);
  G.setScope({ bangkok: true });   /* creates the record around the answer: guests[id] with empty profile and submitted */
  const server = { contact: { email: 'peggy@example.org', phone: '+66 81 234 5678' }, guests: { [id]: { submitted: { x: 1 }, profile: { drink: 'Lime', flavor: 'Milk', film: 'A film' }, history: [{ field: 'profile.drink', to: 'Lime', at: '2026-09-18T09:00:00.000Z', by: id }], photo: { acknowledged: true, at: '2026-09-18T09:00:00.000Z' } } } };
  resolveGet({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: { 'siyl.guest': JSON.stringify(server) }, updatedAt: '2026-09-18T10:00:00.000Z', savedAt: '2026-09-18T10:00:00.000Z' } }) });
  await pulling; await new Promise((r) => setTimeout(r, 0));
  const rec = JSON.parse(w.localStorage.getItem('siyl.guest'));
  assert.equal(G.joins('bangkok'), true, 'the live answer stands'); assert.equal(G.profile(id, 'drink'), 'Lime'); assert.equal(G.profile(id, 'flavor'), 'Milk'); assert.equal(G.contact('email'), 'peggy@example.org'); assert.ok(G.photoAck(), 'the acknowledgement survives');
  deq(rec.guests[id].submitted, { x: 1 }); assert.equal(rec.guests[id].history.length, 2, 'the server\'s history and the scope entry');
  assert.ok(puts.length >= 1, 'the merged record is sent'); const sent = JSON.parse(puts[puts.length - 1].keys['siyl.guest']); assert.equal(sent.guests[id].profile.drink, 'Lime'); assert.equal(sent.scope.bangkok, true);
});

test('CODEX 011-11 · the participation answer is one decision: a destination chosen here while another device declined the trip is replayed whole — never "not joining" with a destination', async () => {
  let resolveGet; const gets = [], puts = [];
  const w = page({ auth: PEGGY, seed: { 'siyl.guest': { scope: { bangkok: true, vientiane: false, china: false, none: false, at: '2026-09-18T08:00:00.000Z', by: PEGGY.guestId } } }, modules: ['assets/bag.js', 'assets/guest.js', 'assets/journey.js', 'assets/draft.js'],
    fetch: (url, init) => { if (!init || !init.method || init.method === 'GET') { gets.push(url); return new Promise((r) => { resolveGet = r; }); } puts.push(JSON.parse(init.body)); return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: JSON.parse(init.body).keys, updatedAt: '2026-09-18T10:00:01.000Z', savedAt: '2026-09-18T10:00:01.000Z' } }) }); } });
  const G = w.SIYL_GUEST;
  const before = gets.length; const pulling = w.SIYL_DRAFT.pull(); await Promise.resolve(); assert.equal(gets.length, before + 1);
  G.setScope({ china: true });   /* the live choice here */
  resolveGet({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: { 'siyl.guest': JSON.stringify({ scope: { bangkok: false, vientiane: false, china: false, none: true, at: '2026-09-18T09:00:00.000Z', by: PEGGY.guestId } }) }, updatedAt: '2026-09-18T10:00:00.000Z', savedAt: '2026-09-18T10:00:00.000Z' } }) });
  await pulling; await new Promise((r) => setTimeout(r, 0));
  assert.equal(G.notJoining(), false, 'never "not joining" with a destination'); assert.equal(G.joins('china'), true); assert.equal(G.joins('bangkok'), true); assert.equal(G.scopeWords(), 'Bangkok · China');
  const sent = JSON.parse(puts[puts.length - 1].keys['siyl.guest']); assert.equal(sent.scope.none, false); assert.equal(sent.scope.china, true);
  /* and the reverse: "not joining" chosen here while another device chose a destination — the decline here stands whole */
  const w2 = page({ auth: PEGGY, seed: { 'siyl.guest': { scope: { bangkok: true, vientiane: false, china: false, none: false, at: '2026-09-18T08:00:00.000Z', by: PEGGY.guestId } } }, modules: ['assets/bag.js', 'assets/guest.js', 'assets/journey.js', 'assets/draft.js'],
    fetch: (url, init) => { if (!init || !init.method || init.method === 'GET') { gets.push(url); return new Promise((r) => { resolveGet = r; }); } return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: JSON.parse(init.body).keys, updatedAt: '2026-09-18T10:00:02.000Z', savedAt: '2026-09-18T10:00:02.000Z' } }) }); } });
  const p2 = w2.SIYL_DRAFT.pull(); await Promise.resolve(); w2.SIYL_GUEST.setScope({ none: true });
  resolveGet({ ok: true, status: 200, json: async () => ({ ok: true, draft: { keys: { 'siyl.guest': JSON.stringify({ scope: { bangkok: true, vientiane: true, china: false, none: false, at: '2026-09-18T09:00:00.000Z', by: PEGGY.guestId } }) }, updatedAt: '2026-09-18T10:00:00.000Z', savedAt: '2026-09-18T10:00:00.000Z' } }) });
  await p2; await new Promise((r) => setTimeout(r, 0));
  assert.equal(w2.SIYL_GUEST.notJoining(), true); assert.equal(w2.SIYL_GUEST.joins('vientiane'), false, 'no destination survives beside the decline');
});
