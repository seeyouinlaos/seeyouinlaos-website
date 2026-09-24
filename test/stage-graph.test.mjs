/* THE STAGE GRAPH (Owner, 21 Sep 2026 · THE GLOBAL MY TRIP REBUILD) — one model for every guest, no package.
   WHERE WILL YOU JOIN US? → four participation sheets (Bangkok · Vientiane before the wedding · Vientiane the wedding · China) →
   the graph names the stages → every required component answered → the wedding (only with the wedding sheet) → Review & Send.
   ONE validator, src/stage-graph.js (the Worker) = assets/stage-graph.js (the pages, generated), decides what "complete" means;
   the Worker refuses an incomplete trip. The Owner's test matrix A – T, and the graph's own facts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { completion, normalizeScope, isRelevant, relevantLetters, scopeFromStates, resolved, STAGES, SCOPES, SCOPE_KEYS, MANDATORY, SHEETS, STAGE_IDS } from '../src/stage-graph.js';
import { page, roomsFetch, doState, plain, src, ROOT, PEGGY, STEFFIE, LIN, SUTHEP } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { complete } from './complete.mjs';

const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, name: s.preferredName || '' });
const seg = (J, key) => J.SEGMENTS.find((s) => s.key === key);
const SC = (o) => Object.assign({ bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: false, none: false }, o);
const allDone = (keys, except) => { const st = {}; keys.forEach((k) => { st[k] = 'selected'; }); Object.assign(st, except || {}); return st; };
async function livePage(auth, rooms) { const w = page({ auth, fetch: await roomsFetch(rooms, identity(auth)) }); await w.SIYL_UNITS.load(true); return w; }
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
function answerTheRest(w) {
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678');
  /* step 01's required personal details (Owner, 24 Sep 2026) — synthetic; the name is the invitation's */
  Object.entries(STEP01).forEach(([k, v]) => G.setContact(k, v));
  T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes')); T.setFinale(id, 'pool');
  G.setDressAck(true); G.setAllergy('no'); G.setPhotoAck(true);
  G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered'));
}
/* every relevant stage answered on a page: declined where the stage allows it, the mandatory train chosen */
const answerAll = (w) => { const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, B = w.SIYL_BAG; J.relevantSegments().forEach((s) => { if (s.key === 'c86') P.items('c86').forEach((it) => B.put(it)); else J.skip(s.key, true, 'manual'); }); };

/* ───────────────────────────── THE GRAPH ───────────────────────────── */
test('THE ONE GRAPH · four scopes with stable ids; ten stages A – J with their scope or connector; G mandatory; the sheets; the generated client copy is byte-current', () => {
  deq(SCOPE_KEYS, ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china']);
  deq(SCOPES.map((s) => s.when), ['21 – 24 February and 6 – 8 March', '25 – 27 February', '27 February – 1 March', '1 – 6 March']);
  deq(STAGES.map((s) => s.letter).join(''), 'ABCDEFGHIJ'); deq(STAGES.map((s) => s.key), ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']);
  deq(STAGES.filter((s) => s.scope).map((s) => [s.letter, s.scope]), [['A', 'bangkok'], ['C', 'vientianePreWedding'], ['D', 'vientianeWedding'], ['F', 'china'], ['G', 'china'], ['H', 'china'], ['J', 'bangkok']]);
  deq(STAGES.filter((s) => s.connector).map((s) => [s.letter, s.connector]), [['B', ['bangkok', 'vientianePreWedding']], ['E', ['vientianeWedding', 'china']], ['I', ['china', 'bangkok']]]);
  deq(MANDATORY, ['c86']); deq(STAGE_IDS.wedstay, ['wedstay', 'guesthouse']);
  deq(SHEETS.map((s) => s.key), ['bangkok', 'vientianePreWedding', 'vientianeWedding', 'china', 'bangkokReturn']);
  /* the client copy is generated from the one source and checked by the release gate */
  assert.ok(existsSync(join(ROOT, 'assets/stage-graph.js')));
  execFileSync('node', [join(ROOT, 'src/build-stage-graph.cjs'), '--check'], { stdio: 'pipe' });
  assert.match(readFileSync(join(ROOT, 'src/release-check.cjs'), 'utf8'), /build-stage-graph\.cjs'\), '--check'/, 'the release gate');
  const w = page({ auth: PEGGY }); assert.ok(w.SIYL_GRAPH); deq(w.SIYL_GRAPH.STAGES, STAGES); assert.equal(w.SIYL_GRAPH.relevantLetters(SC({ china: true, bangkok: true })), 'AFGHIJ');
});

test('RELEVANCE · the Owner\'s examples, letter for letter', () => {
  const L = (o) => relevantLetters(SC(o));
  assert.equal(L({ vientianeWedding: true }), 'D', 'Wedding only');
  assert.equal(L({ vientianePreWedding: true }), 'C', 'Pre-Wedding only');
  assert.equal(L({ vientianePreWedding: true, vientianeWedding: true }), 'CD', 'both Vientiane — no transport between C and D');
  assert.equal(L({ china: true }), 'FGH', 'China only');
  assert.equal(L({ bangkok: true }), 'AJ', 'Bangkok only');
  assert.equal(L({ bangkok: true, vientianePreWedding: true }), 'ABCJ', 'Bangkok + Pre-Wedding');
  assert.equal(L({ bangkok: true, vientianeWedding: true }), 'ADJ', 'Bangkok + Wedding');
  assert.equal(L({ vientianeWedding: true, china: true }), 'DEFGH', 'Wedding + China');
  assert.equal(L({ china: true, bangkok: true }), 'AFGHIJ', 'China + Bangkok');
  assert.equal(L({ bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true }), 'ABCDEFGHIJ', 'Join all');
  assert.equal(L({ none: true }), '', 'not joining');
  assert.equal(isRelevant('train', null), true, 'before the answer nothing disappears');
  assert.equal(resolved('c86', 'declined'), false, 'G cannot be declined'); assert.equal(resolved('train', 'declined'), true); assert.equal(resolved('kmg', 'waitlisted'), true); assert.equal(resolved('kmg', 'open'), false);
});

test('MIGRATION · a legacy answer (bangkok · vientiane · china · none) reads as the four sheets without a write: a former Essential guest (D1 held, C declined) is the wedding alone; a former Complete guest keeps everything; idempotent', () => {
  deq(normalizeScope({ bangkok: false, vientiane: true, china: false, none: false, at: 'x' }, { prewed: 'declined' }), { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false, at: 'x', migrated: true }, 'Essential → the wedding sheet, D1 preserved by the engine, nothing rebooked');
  deq(normalizeScope({ bangkok: true, vientiane: true, china: true, none: false }, { prewed: 'selected' }), { bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true, none: false, migrated: true }, 'Complete → all four');
  deq(normalizeScope({ bangkok: true, vientiane: true, china: false, none: false }, { prewed: 'open' }), { bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: false, none: false, migrated: true }, 'a Vientiane answer with the Pre-Wedding Stay still open keeps both sheets — nothing is taken away');
  deq(normalizeScope({ none: true, at: 'x' }), { bangkok: false, vientianePreWedding: false, vientianeWedding: false, china: false, none: true, at: 'x', migrated: false }, 'not joining stays not joining');
  const n = normalizeScope(SC({ bangkok: true, vientianeWedding: true, at: 'x' })); deq(normalizeScope(n), n, 'idempotent'); assert.equal(n.migrated, false);
  assert.equal(normalizeScope(null), null); assert.equal(normalizeScope({ bangkok: false, vientiane: false, china: false, none: false }), null, 'nothing joined and not declined is no answer');
  deq(scopeFromStates({ wedstay: 'selected' }), SC({ vientianeWedding: true }), 'the scope a real hold implies');
  deq(scopeFromStates({ 'bkk-stay': 'selected', kmg: 'waitlisted' }), SC({ bangkok: true, china: true }));
});

/* ───────────────────────────── THE MATRIX A – T (the validator) ───────────────────────────── */
const WED = { events: { temple: 'no', coffee: 'yes', vows: 'yes', dinner: 'yes' }, sangkhathan: null, finale: 'pool', dress: true, hosts: false, seating: { open: false } };   /* the final act answered (22 Sep 2026) */
const OK = { contact: { missing: [] }, about: { missing: [] } };
test('A · Wedding + Guest House: D alone, USD 0, complete', () => { const c = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: WED }); deq(c.relevant, ['wedstay']); assert.equal(c.canSend, true); });
test('B · Wedding + Souphattra Heritage: total USD 145 for two nights, not 290', () => { const w = page({ auth: PEGGY }); const q = w.SIYL_PRICE.quote('wedstay', 'heritage'); assert.equal(q.total, 145); assert.equal(q.nights, 2); assert.notEqual(q.total, 290); });
/* RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026): it has no price because it is no longer a product */
test('C · the retired Riverside Hotel has no quote at all', () => { const w = page({ auth: PEGGY }); assert.equal(w.SIYL_PRICE.quote('riverside', 'superior-window'), null); });
test('D · Pre-Wedding only: C alone', () => { const c = completion({ ...OK, scope: SC({ vientianePreWedding: true }), stages: { prewed: 'selected' } }); deq(c.relevant, ['prewed']); assert.equal(c.wedding.required, false); assert.equal(c.canSend, true); });
test('E · both Vientiane: C + D, no transport between', () => { const c = completion({ ...OK, scope: SC({ vientianePreWedding: true, vientianeWedding: true }), stages: { prewed: 'declined', wedstay: 'waitlisted' }, wedding: WED }); deq(c.relevant, ['prewed', 'wedstay']); assert.equal(c.canSend, true); });
test('F · China only: F G H — G cannot be skipped', () => {
  const skipped = completion({ ...OK, scope: SC({ china: true }), stages: { kmg: 'selected', c86: 'declined', ljg: 'selected' } });
  deq(skipped.relevant, ['kmg', 'c86', 'ljg']); assert.equal(skipped.canSend, false); deq(skipped.unresolved, [{ key: 'c86', letter: 'G', state: 'declined', why: 'mandatory' }]); assert.match(skipped.missing[0].label, /Kunming → Lijiang/);
  const done = completion({ ...OK, scope: SC({ china: true }), stages: { kmg: 'selected', c86: 'selected', ljg: 'declined' } }); assert.equal(done.canSend, true);
});
test('G · Bangkok only: A J', () => { const c = completion({ ...OK, scope: SC({ bangkok: true }), stages: { 'bkk-stay': 'selected', kempinski: 'declined' } }); deq(c.relevant, ['bkk-stay', 'kempinski']); assert.equal(c.canSend, true); });
test('H · Bangkok + Pre-Wedding: A B C J', () => { const c = completion({ ...OK, scope: SC({ bangkok: true, vientianePreWedding: true }), stages: allDone(['bkk-stay', 'train', 'prewed', 'kempinski']) }); deq(c.relevant, ['bkk-stay', 'train', 'prewed', 'kempinski']); assert.equal(c.canSend, true); });
test('I · Bangkok + Wedding: A D J', () => { const c = completion({ ...OK, scope: SC({ bangkok: true, vientianeWedding: true }), stages: allDone(['bkk-stay', 'wedstay', 'kempinski']), wedding: WED }); deq(c.relevant, ['bkk-stay', 'wedstay', 'kempinski']); assert.equal(c.canSend, true); });
test('J · Wedding + China: D E F G H', () => { const c = completion({ ...OK, scope: SC({ vientianeWedding: true, china: true }), stages: allDone(['wedstay', 'mu9646', 'kmg', 'c86', 'ljg']), wedding: WED }); deq(c.relevant, ['wedstay', 'mu9646', 'kmg', 'c86', 'ljg']); assert.equal(c.canSend, true); });
test('K · China + Bangkok: F G H I A J', () => { const c = completion({ ...OK, scope: SC({ china: true, bangkok: true }), stages: allDone(['bkk-stay', 'kmg', 'c86', 'ljg', 'return', 'kempinski']) }); deq(c.relevant, ['bkk-stay', 'kmg', 'c86', 'ljg', 'return', 'kempinski']); assert.equal(c.canSend, true); });
test('L · Join all: A – J', () => { const c = completion({ ...OK, scope: SC({ bangkok: true, vientianePreWedding: true, vientianeWedding: true, china: true }), stages: allDone(STAGES.map((s) => s.key)), wedding: WED }); assert.equal(c.relevant.length, 10); assert.equal(c.canSend, true); });
test('M · an unresolved stage blocks Send', () => { const c = completion({ ...OK, scope: SC({ bangkok: true }), stages: { 'bkk-stay': 'selected' } }); assert.equal(c.canSend, false); deq(c.unresolved.map((u) => u.key), ['kempinski']); assert.equal(c.next.href, 'your-journey.html#s-kempinski'); });
test('N · a waitlisted stage counts as answered at USD 0', () => {
  const c = completion({ ...OK, scope: SC({ china: true }), stages: { kmg: 'waitlisted', c86: 'selected', ljg: 'waitlisted' } }); assert.equal(c.canSend, true); deq(c.resolved, ['kmg', 'c86', 'ljg']);
  const w = page({ auth: PEGGY }); w.SIYL_GUEST.setScope({ china: true }); assert.equal(w.SIYL_BAG.total(), 0);
});
test('O · wedding attending + seat missing blocks Send while seating is open', () => {
  const seating = { open: true, frozen: false, configured: { ceremony: true, dinner: true }, seats: {} };
  const c = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, seating } });
  assert.equal(c.canSend, false); deq(c.wedding.missing, ['seat:ceremony', 'seat:dinner']); assert.equal(c.missing[0].href, 'wedding-preparation.html#seats');
  const host = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, hosts: true, seating } }); deq(host.wedding.missing, ['seat:dinner'], 'the hosts sit front centre at the ceremony — the dinner seat is theirs to choose');
  const frozen = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, seating: { ...seating, frozen: true } } }); assert.equal(frozen.canSend, true, 'a frozen ledger is Guest Relations\' to seat');
  const away = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, events: { temple: 'no', coffee: 'no', vows: 'no', dinner: 'no' }, seating } }); assert.equal(away.canSend, true, 'a declined event needs no seat');
});
test('P · seat confirmed enables Send', () => {
  const seating = { open: true, frozen: false, configured: { ceremony: true, dinner: true }, seats: { ceremony: 'C-R-05-02', dinner: 'D-T-05' } };
  const c = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, seating } }); assert.equal(c.canSend, true); deq(c.wedding.missing, []);
  const undecided = completion({ ...OK, scope: SC({ vientianeWedding: true }), stages: { wedstay: 'selected' }, wedding: { ...WED, events: { ...WED.events, dinner: null }, seating } }); assert.equal(undecided.canSend, false); deq(undecided.wedding.missing, ['event:dinner']);
});
test('Q · not joining skips every stage, USD 0, complete; a leftover resource blocks until released', () => {
  const c = completion({ ...OK, scope: SC({ none: true }) }); assert.equal(c.notJoining, true); deq(c.relevant, []); assert.equal(c.wedding.required, false); assert.equal(c.canSend, true);
  const held = completion({ ...OK, scope: SC({ none: true }), stale: [{ key: 'release:prewed', label: 'x' }] }); assert.equal(held.canSend, false); assert.equal(held.next.key, 'release:prewed');
  const w = page({ auth: PEGGY }); answerTheRest(w); w.SIYL_GUEST.setScope({ none: true }); assert.equal(w.SIYL_BAG.total(), 0); assert.equal(w.SIYL_GUEST.readiness().ok, true);
  deq(w.SIYL_GUEST.steps().map((s) => s.state), ['complete', 'complete', 'na', 'na', 'na', 'ready'], 'PRQ-01-18: a step 06 that may be sent is ready, not an alarm');
  /* STEP 01 REQUIRED (Owner, 24 Sep 2026): a declined trip still needs step 01 — a required personal field missing blocks it, the optional address line 2 · region never do */
  const G = w.SIYL_GUEST; assert.equal(G.contact('address2') || '', ''); assert.equal(G.contact('region') || '', '');
  G.setContact('city', ''); deq(G.missingFor('you').map((m) => m.key), ['city']); assert.equal(G.done('you'), false); assert.equal(G.readiness().ok, false);
  G.setContact('city', STEP01.city); assert.equal(G.done('you'), true); assert.equal(G.readiness().ok, true);
});
test('R · a couple: one partner declining does not decline the other (the answer is the guest\'s own record; ids untouched)', async () => {
  const rooms = new Rooms(doState());
  const peggy = await livePage(PEGGY, rooms), steffie = await livePage(STEFFIE, rooms);
  for (const w of [peggy, steffie]) { answerTheRest(w); w.SIYL_GUEST.setScope({ vientianeWedding: true }); }
  assert.equal((await peggy.SIYL_STAY.select('wedstay', 'heritage')).ok, true); assert.equal((await steffie.SIYL_STAY.select('wedstay', 'heritage')).ok, true);
  peggy.SIYL_GUEST.setScope({ none: true }); await peggy.SIYL_STAY.remove('wedstay');
  assert.equal(peggy.SIYL_GUEST.notJoining(), true); assert.equal(steffie.SIYL_GUEST.notJoining(), false, 'Steffie still joins the wedding');
  const v = await (await rooms.fetch(new Request('https://x/api/rooms/read', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(identity(STEFFIE)) }, body: '{}' }))).json();
  deq(v.mine, { wedstay: { key: 'wedstay/heritage', label: 'A' } }, 'Steffie keeps her place'); assert.equal(steffie.SIYL_GUEST.me().guestId, STEFFIE.guestId); assert.equal(peggy.SIYL_GUEST.party().partyId, STEFFIE.partyId, 'the party stays one');
});
test('S · former Essential: D1 preserved, the scope is the wedding', () => {
  const w = page({ auth: PEGGY, seed: { 'siyl.guest': JSON.stringify({ scope: { bangkok: false, vientiane: true, china: false, none: false, at: '2026-09-19T10:00:00.000Z', by: 'g-peggy' }, guests: {} }), 'siyl.skip': JSON.stringify(['prewed']), 'siyl.bag': JSON.stringify([{ id: 'wedstay', name: 'Wedding Stay · Souphattra Heritage', price: 155, qty: 1, stay: 'souphattra', room: 'heritage-executive', unit: 'A', unitName: 'Room A' }]) } });
  const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
  deq(G.scope(), { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false, migrated: true, at: '2026-09-19T10:00:00.000Z', by: 'g-peggy' });
  deq(J.relevantSegments().map((s) => s.key), ['wedstay']); assert.equal(J.state(seg(J, 'wedstay')), 'selected'); deq(w.SIYL_BAG.get().map((x) => [x.id, x.room, x.price]), [['wedstay', 'heritage-executive', 155]], 'D1 as booked — not repriced, not rebooked');
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.guest')).scope.vientiane, true, 'read-time normalization: nothing was written'); assert.equal(G.applicable('wedding'), true);
});
test('T · former Complete: every real selection preserved; no package metadata drives the UI', () => {
  const bag = [{ id: 'bkk-stay', price: 192, qty: 1, stay: 'sathorn', room: 'u-sathorn-superior-garden', unit: 'A' }, { id: 'train', price: 100, qty: 1 }, { id: 'prewed', price: 340, qty: 1, stay: 'souphattra', room: 'heritage-grand-premier', unit: 'B' }, { id: 'wedstay', price: 170, qty: 1, stay: 'souphattra', room: 'heritage-grand-premier', unit: 'B' }, { id: 'mu9646', price: 275, qty: 1 }, { id: 'kmg', price: 150, qty: 1, stay: 'wanxiang', room: 'italian', unit: 'A' }, { id: 'c86', price: 105, qty: 1 }, { id: 'ljg', price: 200, qty: 1, stay: 'luyeBaisha', room: 'viewing-270', unit: 'A' }, { id: 'return', price: 200, qty: 1 }, { id: 'kempinski', price: 380, qty: 1, stay: 'kempinski', room: 'deluxe-balcony-king', unit: 'A' }];
  const w = page({ auth: PEGGY, seed: { 'siyl.guest': JSON.stringify({ scope: { bangkok: true, vientiane: true, china: true, none: false, at: '2026-09-19T10:00:00.000Z', by: 'g-peggy' }, guests: {} }), 'siyl.bag': JSON.stringify(bag), 'siyl.package': JSON.stringify({ kind: 'complete', sig: 'x' }) } });
  const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
  assert.equal(G.joinsAll(), true); assert.equal(J.relevantSegments().length, 10); deq(J.SEGMENTS.map((s) => J.state(s)), Array(10).fill('selected'));
  deq(w.SIYL_BAG.get().map((x) => x.id), bag.map((x) => x.id), 'all ten lines as they were'); assert.equal(w.SIYL_BAG.total(), 2112);
  for (const k of ['packages', 'packagePlan', 'planSignature']) assert.equal(J[k], undefined); assert.doesNotMatch(src('your-journey.html'), /siyl\.package|data-package/, 'no package metadata is read by the page');
});

/* ───────────────────────────── THE PAGE ───────────────────────────── */
test('MY TRIP · four independent checkbox parts and one exclusive decline (no "join all"); each selected scope its own sheet of stages; unselected scopes\' stages hidden; the mandatory train offers no decline; YOUR CURRENT TRIP without a package', () => {
  const yj = src('your-journey.html');
  /* WHICH PARTS OF THE JOURNEY ARE YOU JOINING (Owner, 24 Sep 2026): four checkbox rows from the graph, a divider, the decline row of the same component */
  assert.match(yj, /<h2 class="t-h1">Which parts of the journey are you joining\?<\/h2>/);
  assert.match(yj, /G\.DESTINATIONS\.map\(function\(d\)\{return optHtml\('data-scope="'\+d\.key\+'"',!!\(s&&!s\.none&&s\[d\.key\]\),d\.label,d\.when,false\)\}\)/, 'the four rows from the graph');
  assert.match(yj, /'<button type="button" class="p-opt'\+\(exclusive\?' p-opt-x':''\)\+\(on\?' is-on':''\)\+'" '\+attr\+' role="checkbox" aria-checked="'\+\(on\?'true':'false'\)\+'">'/, 'a real checkbox, its state in aria-checked');
  assert.match(yj, /<span class="p-opt-box" aria-hidden="true"><\/span>/, 'a visible box'); assert.match(yj, /'<span class="p-opt-state">'\+\(on\?'Selected':'Not selected'\)\+'<\/span>/, 'the state in words');
  assert.match(yj, /'<p class="p-opt-or" aria-hidden="true"><span>or<\/span><\/p>'\+\s*optHtml\('data-scope-none',none,'I won’t be joining this trip','',true\)/, 'the decline beneath a divider, the same component');
  assert.doesNotMatch(yj, /data-scope-all|I’ll join all|I'll join all|p-sel p-sheet|aria-pressed="'\+\(on/, '"I\'ll join all" and the old pressed sheets are gone');
  assert.match(yj, /var status=none\?'Not joining this trip':\(n\?n\+' of 4 parts selected':'Nothing selected yet'\);/, 'the status line (TO-00628)');
  assert.match(yj, /data-scope-status>'\+status\+'/);
  assert.match(yj, /p\[k\]=b\.getAttribute\('aria-checked'\)!=='true';applyScope\(p\)/, 'each part toggles on its own');
  assert.match(yj, /applyScope\(none\.getAttribute\('aria-checked'\)==='true'\?\{none:false\}:\{none:true\}\)/, 'the decline ticks and unticks');
  assert.match(yj, /<h2 class="t-h1">Your trip so far<\/h2>/, 'TO-00665'); assert.doesNotMatch(yj, /Complete trip|Essential trip|packageCard|p-pack|fxConfirm|FXMODE/);
  assert.match(yj, /var sh=J\.sheetOf\(seg\);if\(sh&&sh!==sheet\)/, 'a heading whenever the sheet changes'); assert.match(yj, /'<div class="p-sheet-h" data-sheet="'/);
  assert.match(yj, /if\(seg\.key==='wedstay'&&G\.joins\('vientianeWedding'\)\)h\+=weddingHtml\(\)/, 'the wedding under the wedding sheet only');
  assert.match(yj, /function mandatory\(seg\)/); assert.match(yj, /\.concat\(mandatory\(seg\)\?\[\]:\['<button type="button" class="p-link mute" data-skip="'\+seg\.key\+'">'\+declineWords\(seg\)\+'<\/button>'\]\)/, 'the mandatory train has no decline');
  assert.match(yj, /function declineWords\(seg\)\{if\(seg\.cat==='Accommodation'\)return 'I won’t need this stay';if\(seg\.key==='train'\|\|seg\.key==='c86'\)return 'I won’t take this train';if\(seg\.key==='return'\)return 'I won’t take these flights';return 'I won’t take this flight'\}/, 'TO-00587: the decline says what is declined');
  assert.match(yj, /<p class="t-l1 open">Needed for China<\/p>/, 'a declined mandatory stage asks to be chosen (TO-00597)');
  const css = src('assets/prep.css'); assert.match(css, /\.p-sheets \{ gap: var\(--s4\); margin-top: var\(--s5\); \}/); assert.match(css, /#scope:not\(:empty\) \+ #dec:not\(:empty\) \{ margin-top: var\(--s7\); \}/, 'breathing room from the shared tokens'); assert.match(css, /\.p-sheet-h \{ margin-top: var\(--s8\)/);
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
  deq(G.DESTINATIONS.map((d) => d.key), SCOPE_KEYS);
  G.setScope({ bangkok: true }); G.setScope({ china: true }); deq(J.relevantSegments().map((s) => J.sheetOf(s)), ['bangkok', 'china', 'china', 'china', 'bangkokReturn', 'bangkokReturn'], 'the stages under their sheets');
  /* all four ticked one by one — there is no "select all" */
  G.setScope({ vientianePreWedding: true }); G.setScope({ vientianeWedding: true }); assert.equal(G.joinsAll(), true);
  /* the decline clears the four; any part clears the decline */
  G.setScope({ none: true }); deq(J.relevantSegments(), []); assert.equal(G.scopeWords(), 'Not joining this trip'); assert.equal(G.notJoining(), true);
  G.setScope({ china: true }); assert.equal(G.notJoining(), false); deq(SCOPE_KEYS.filter((k) => G.scope()[k]), ['china'], 'a part replaces the decline');
  /* unticking the decline leaves the question unanswered — stored with a timestamp, all four false */
  G.setScope({ none: true }); G.setScope({ none: false }); assert.equal(G.scope(), null, 'the question again');
  const stored = JSON.parse(w.localStorage.getItem('siyl.guest')).scope; assert.ok(stored.at, 'stored with a timestamp'); deq(SCOPE_KEYS.map((k) => !!stored[k]).concat(!!stored.none), [false, false, false, false, false]);
  /* THE HOSTS' BUG FIX (Owner, 24 Sep 2026): the first-view default (all four) applies only when nothing was ever stored — deselecting the last part leaves a host's question unanswered */
  const hw = page({ auth: SUTHEP }); const HG = hw.SIYL_GUEST;
  assert.equal(HG.joinsAll(), true, 'a host\'s first view: all four'); assert.equal(HG.scope().by, 'hosts');
  SCOPE_KEYS.forEach((k) => HG.setScope({ [k]: false })); assert.equal(HG.scope(), null, 'the last part deselected: nothing re-appears selected');
});

test('DECLINE · the short path: the decline row stays visible, beneath it We will miss you and Send my reply, Reply sent after the send, re-selecting a part is the way back; only the guest\'s own optional resources are previewed for release', () => {
  const yj = src('your-journey.html'), rv = src('review.html');
  assert.match(yj, /var after=none\?'<div class="p-opt-after" data-not-joining>'\+\(rp\.state==='changed'\?'<p class="t-l1 open">Changes not sent yet<\/p>':''\)\+'<h3 class="t-h2">We will miss you\.<\/h3>'/, 'beneath the component, which stays visible (TO-00632)');
  assert.match(yj, /Thank you for letting us know\. Haruthai &amp; Suthep would be so happy to celebrate with you, so if your plans change, simply tick the parts you can join\./, 'TO-00630 / TO-00633');
  assert.doesNotMatch(yj, /We’re sorry you won’t be able to join us|If anything changes after you have sent your response/, 'TO-00633 rewritten · TO-00631 removed');
  assert.match(yj, /sendBtn\('Send my reply'\)/, 'TO-01695'); assert.doesNotMatch(yj, /sendBtn\('Send the update'\)/, 'a decline is always a reply: “Send my reply”, the same words as Review (glossary)'); assert.match(yj, /data-reply-state>Reply sent'\+\(rp\.date\?' · '\+esc\(rp\.date\):''\)\+'<\/p>'/, 'TO-00635');
  assert.doesNotMatch(yj, /data-scope-reconsider|I’d like to reconsider/, 'the reconsider button is gone — re-selecting a part is the way back');
  assert.match(yj, /function releasesFor\(next\)/); assert.match(yj, /Anything given back is open to other guests again, so it may no longer be free if you change your mind\./, 'TO-00650'); assert.match(yj, /data-release-confirm/); assert.match(yj, /data-release-cancel>Keep everything as it is</);
  assert.match(yj, /if\(rel\.length\)\{[^\n]*PENDING=\{scope:next,patch:patch,releases:rel,gone:gone\};render\(\)/, 'a change that releases something is previewed, never applied at once');
  /* PRQ-04-02: "Send my trip" / "Send my reply" before the first send, "Send the update" after a real change */
  assert.match(rv, /if\(w\.key==='changed'\)return nj&&!w\.declined\?'Send my reply':'Send the update';\n\s*return nj\?'Send my reply':'Send my trip'\}/);
  assert.match(rv, /if\(w\.declined\)h='<div class="p-card"><h2 class="t-h1">Reply sent · '\+esc\(w\.date\)\+'<\/h2>/, 'a sent decline reads Reply sent');
  assert.match(src('assets/draft.js'), /stages: window\.SIYL_JOURNEY && SIYL_JOURNEY\.states \? SIYL_JOURNEY\.states\(\) : null/, 'the stage states travel with the send (the one send path, SIYL_DRAFT)');
  assert.match(src('assets/draft.js'), /if \(r\.status === 422\) return \{ ok: false, status: 422, error: 'incomplete', message: d\.message \|\| '', missing: d\.missing \|\| \[\], answer: d \};/);
  assert.match(rv, /if\(e==='incomplete'\)\{var m0=r\.missing&&r\.missing\[0\];err\.innerHTML=m0\?'Still needed before you send: '\+esc\(m0\.label\)/, 'the server\'s refusal is shown with the first missing item');
});

/* ───────────────────────────── THE WORKER ───────────────────────────── */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body) { return new Request(ORIGIN + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix)).map((name) => ({ name })) }), delete: async (k) => { m.delete(k); } }; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-sam-graph');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' };
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  return { w, env, sam, rooms };
}
const BASE = (extra) => ({ channel: 'journey-shop', guestId: 'G777', partyId: 'INV-777', selections: [], totalUsd: 0, contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }], contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' } }, registration_submitted_at: '2026-09-21T10:00:00.000Z', ...extra });
/* the About You answers the questionnaire requires (22 Sep 2026), beside the allergy and the photo acknowledgement */
const ABOUT = { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: ['Jazz'] } }], allergy: { answer: 'no' }, photo: { at: 'x' } };
const TEXT = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G777 · Sam';
test('WORKER · the same validator on the server: an incomplete trip is refused (422 · incomplete, the missing items named), nothing stored; a stay is answered by the engine\'s own hold, never the client\'s word; a declined mandatory train is refused; a complete trip and a decline are accepted', async () => {
  const h = await harness();
  const send = async (registration) => { const r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration, text: TEXT }), h.env); return { status: r.status, d: await r.json() }; };
  /* the stored server contact: a valid email and phone — the personal details of step 01 are not there yet (Owner, 24 Sep 2026) */
  const contact = (extra) => h.env.REG_KV.put('contact:INV-G777', JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', email: 'sam.example@example.org', phone: '+66 81 000 0000', ...extra, at: '2026-09-24T00:00:00.000Z' }));
  await contact({});
  /* no scope */
  let r = await send(BASE()); assert.equal(r.status, 422); assert.equal(r.d.error, 'incomplete'); assert.equal(r.d.missing[0].key, 'scope'); assert.equal(h.env.REG_KV.m.has('reg:INV-G777'), false, 'nothing stored');
  /* Bangkok, nothing answered */
  r = await send(BASE({ guestRecord: { ...ABOUT, scope: SC({ bangkok: true, at: 'x' }) } })); assert.equal(r.status, 422); deq(r.d.unresolved.map((u) => u.key), ['bkk-stay', 'kempinski']);
  /* the client claims a stay it does not hold */
  r = await send(BASE({ stages: { 'bkk-stay': 'selected', kempinski: 'declined' }, guestRecord: { ...ABOUT, scope: SC({ bangkok: true, at: 'x' }) } })); assert.equal(r.status, 422); deq(r.d.unresolved.map((u) => u.key), ['bkk-stay'], 'the engine holds nothing: the claim does not count');
  /* China with the train declined */
  r = await send(BASE({ stages: { kmg: 'declined', c86: 'declined', ljg: 'declined' }, guestRecord: { ...ABOUT, scope: SC({ china: true, at: 'x' }) } })); assert.equal(r.status, 422); deq(r.d.unresolved, [{ key: 'c86', letter: 'G', state: 'declined', why: 'mandatory' }]);
  /* the wedding without its answers */
  r = await send(BASE({ stages: { wedstay: 'declined' }, guestRecord: { ...ABOUT, scope: SC({ vientianeWedding: true, at: 'x' }) } })); assert.equal(r.status, 422); assert.ok(r.d.missing.some((m) => m.key === 'event:dinner')); assert.ok(r.d.missing.some((m) => m.key === 'dress'));
  /* a real hold answers the stay */
  const me = { invitationId: 'INV-G777', guestId: 'G777', partyId: 'INV-777', hosts: false };
  const j = await h.rooms.fetch(new Request('https://x/api/rooms/join', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', key: 'bkk-stay/u-sathorn-superior-garden', label: 'A', name: 'Sam' }) })); assert.equal(j.status, 200);
  const held = () => send(BASE({ stages: { kempinski: 'declined' }, selections: [{ id: 'bkk-stay', price: 192, qty: 1, stay: 'sathorn', room: 'u-sathorn-superior-garden', unit: 'A' }], totalUsd: 192, guestRecord: { ...ABOUT, scope: SC({ bangkok: true, at: 'x' }) } }));
  /* STEP 01 IS REQUIRED ON THE SERVER: the trip is answered, the email and phone are valid — the missing personal details refuse it, each named under step 01 */
  r = await held(); assert.equal(r.status, 422); assert.equal(r.d.error, 'incomplete'); deq(r.d.unresolved, []);
  deq(r.d.missing.map((m) => [m.key, m.step]), [['birthdate', 'you'], ['nationality', 'you'], ['address1', 'you'], ['postal', 'you'], ['city', 'you'], ['country', 'you']]); assert.equal(h.env.REG_KV.m.has('reg:INV-G777'), false, 'nothing stored');
  await contact({ birthdate: '1990-02-31', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' });
  r = await held(); assert.equal(r.status, 422); deq(r.d.missing.map((m) => m.key), ['birthdate'], 'an invalid date of birth is not a date of birth');
  await contact(STEP01);   /* address2 · region stay empty: optional */
  r = await held();
  assert.equal(r.status, 202, JSON.stringify(r.d).slice(0, 200)); assert.ok(r.d.submissionId); assert.equal(JSON.parse(h.env.REG_KV.m.get('reg:INV-G777').v).rooms['bkk-stay'].label, 'A');
  /* a hold outside the trip blocks: the guest now says China only while the U Sathorn room is still held */
  r = await send(BASE({ stages: { kmg: 'declined', ljg: 'declined' }, selections: [{ id: 'c86', price: 105, qty: 1 }], guestRecord: { ...ABOUT, scope: SC({ china: true, at: 'x' }) } })); assert.equal(r.status, 422); assert.equal(r.d.missing[0].key, 'release:bkk-stay');
  /* the decline: complete on its own once the hold is gone */
  const l = await h.rooms.fetch(new Request('https://x/api/rooms/leave', { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', key: 'bkk-stay/u-sathorn-superior-garden' }) })); assert.equal(l.status, 200);
  r = await send(BASE({ guestRecord: { scope: SC({ none: true, at: 'x' }) } })); assert.equal(r.status, 202, JSON.stringify(r.d).slice(0, 200)); assert.equal(r.d.kind, 'update', 'the earlier submission is kept — version 2, never deleted');
  /* the helper every other worker test sends through is itself complete */
  r = await send(complete(BASE())); assert.equal(r.status, 202);
});
