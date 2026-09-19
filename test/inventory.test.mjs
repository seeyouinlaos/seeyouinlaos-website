/* See You In Laos — the shared inventory ledger.
 * The stock numbers, the unit arithmetic and the overbooking guard are tested
 * here against the same seed the Durable Object imports. The genuine
 * cross-session race is proved separately against the DEPLOYED ledger and
 * recorded in docs/acceptance — a unit test cannot prove atomicity.
 * Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Rooms, unitsOf, unitOf, mayJoin, stageOf, STAGES } from '../src/rooms.js';
import { SEED, FIXED, unitsFor, sellable } from '../src/inventory-seed.js';
import { page, roomsFetch, doState, plain, PEGGY, LIN, HARUTHAI, SUTHEP } from './sandbox.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* the engine as one guest calls it, and a fictional other guest — never production data */
const identity = (s, hosts) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!hosts });
const other = (n) => ({ invitationId: 'INV-X' + n, guestId: 'g-x' + n, partyId: 'INV-X' + n, hosts: false });
const caller = (rooms) => async (who, op, body) => {
  const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(who) }, body: JSON.stringify(body || {}) }));
  return { status: r.status, d: await r.json() };
};
const holdAs = (call) => (who, key, label, need) => call(who, 'join', { invitationId: who.invitationId, guestId: who.guestId, key, label, name: who.guestId.replace(/^g-/, '').replace(/^\w/, (c) => c.toUpperCase()), need: need || 1 });

test('the Souphattra stock is the Sheet stock: 26 rooms, per window', () => {
  const cats = ['heritage', 'heritage-executive', 'heritage-grand-premier', 'noble-courtyard',
                'grand-majestic', 'souphattra-majestic', 'souphattra-presidential'];
  for (const win of ['prewed', 'wedstay']) {
    const total = cats.reduce((t, c) => t + SEED[`${win}/${c}`].capacity, 0);
    assert.equal(total, 26, win + ' must hold the whole house');
  }
  /* the individual counts, from Budget_Room - Rate column C */
  assert.equal(SEED['prewed/heritage'].capacity, 5);
  assert.equal(SEED['prewed/heritage-executive'].capacity, 13);
  assert.equal(SEED['prewed/heritage-grand-premier'].capacity, 3);
  assert.equal(SEED['prewed/noble-courtyard'].capacity, 1);
  assert.equal(SEED['prewed/grand-majestic'].capacity, 2);
  assert.equal(SEED['prewed/souphattra-majestic'].capacity, 1);
  assert.equal(SEED['prewed/souphattra-presidential'].capacity, 1);
  /* and the two windows are SEPARATE stock — the same rooms, sold twice */
  assert.notEqual('prewed/heritage', 'wedstay/heritage');
});

test('nothing is reserved for anyone in the seed (Owner, 19 Sep 2026 · no fixed arrangement): `FIXED` is empty, every entry holds nothing for nobody, every unit is open, who may join asks for an identity and nothing else — the hosts start at zero like every guest', () => {
  assert.deepEqual(FIXED, [], 'the fixed arrangement is an empty export');
  for (const [key, s] of Object.entries(SEED)) {
    assert.equal(s.held, 0, key + ' holds nothing in advance');
    assert.equal(s.heldFor, undefined, key + ' is held for nobody');
    assert.equal(sellable(key), s.capacity, key + ': the whole category is sellable');
    assert.equal(unitsOf(key).every((u) => u.reservedFor === null), true, key + ' has no reserved unit');
  }
  /* the rooms the old ledger kept back — the Presidential, the Penthouse's Room A, the Grand Majestic, the Solarium, the 270° suite — are open to everyone */
  for (const k of ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'bkk-stay/penthouse', 'prewed/grand-majestic', 'wedstay/grand-majestic', 'kmg/solarium', 'ljg/view-suite-270']) assert.equal(sellable(k), SEED[k].capacity, k + ' is open to everyone');
  /* who may join: any authenticated guest, any unit — a host like a guest */
  const guest = identity(PEGGY), host = identity(HARUTHAI, true);
  assert.deepEqual(mayJoin(unitOf('bkk-stay/penthouse', 'A'), null), { ok: false, error: 'unauthorised' });
  assert.deepEqual(mayJoin(unitOf('bkk-stay/penthouse', 'A'), guest), { ok: true }, 'the Penthouse\'s Room A is open to a guest');
  assert.deepEqual(mayJoin(unitOf('wedstay/souphattra-presidential', 'A'), guest), { ok: true }, 'the Presidential is open to a guest');
  assert.deepEqual(mayJoin(unitOf('bkk-stay/penthouse', 'A'), host), { ok: true }, 'a host books like every guest');
  assert.deepEqual(mayJoin(null, host), { ok: false, error: 'unknown room' });
  /* the seed is the only place a number lives; nothing there names anyone as a reservation; the arranged script is gone */
  const seedSrc = readFileSync(join(ROOT, 'src/inventory-seed.js'), 'utf8');
  assert.match(seedSrc, /export const FIXED = \[\];/);
  assert.ok(!/heldFor:/.test(seedSrc), 'no seed entry carries heldFor');
  assert.ok(!existsSync(join(ROOT, 'assets/arranged.js')), 'assets/arranged.js is deleted');
  assert.match(readFileSync(join(ROOT, 'src/rooms.js'), 'utf8'), /export function mayJoin\(unit, identity\) \{\s*if \(!unit\) return \{ ok: false, error: 'unknown room' \};\s*if \(!identity\) return \{ ok: false, error: 'unauthorised' \};\s*return \{ ok: true \};/, 'mayJoin asks for an identity and nothing else');
});

test('a party consumes rooms, not seats — ceil(guests ÷ occupancy)', () => {
  assert.equal(unitsFor('prewed/heritage', 1), 1);
  assert.equal(unitsFor('prewed/heritage', 2), 1);
  assert.equal(unitsFor('prewed/heritage', 3), 2);
  assert.equal(unitsFor('prewed/heritage', 4), 2);
  assert.equal(unitsFor('prewed/heritage', 5), 3);
  /* a four-adult suite takes one room for four guests */
  assert.equal(unitsFor('kmg/left-bank', 4), 1);
  assert.equal(unitsFor('kmg/left-bank', 5), 2);
});

test('the six-bedroom Penthouse is six rooms of two places; the Guest House complimentary (D2) is ONE unit of SIX places held in GUESTS; the wedding window is ONE stage (Owner, 19 Sep 2026)', () => {
  assert.equal(SEED['bkk-stay/penthouse'].unit, 'room');
  assert.equal(SEED['bkk-stay/penthouse'].capacity, 6);
  assert.equal(SEED['bkk-stay/penthouse'].occupancy, 2);
  assert.equal(unitsFor('bkk-stay/penthouse', 4), 2);
  assert.deepEqual(unitsOf('bkk-stay/penthouse').map((u) => [u.label, u.kind, u.places]), [['A', 'room', 2], ['B', 'room', 2], ['C', 'room', 2], ['D', 'room', 2], ['E', 'room', 2], ['F', 'room', 2]], 'Room A – F, twelve places, never a Room G');
  /* the Presidential is ONE room of TWO places, like every room */
  assert.deepEqual(unitsOf('wedstay/souphattra-presidential').map((u) => [u.label, u.places]), [['A', 2]]);
  /* D2 · the guest house: one shared unit of six bookable places, held in GUESTS */
  const gh = SEED['guesthouse/guest-house'];
  assert.equal(gh.unit, 'guest'); assert.equal(gh.capacity, 6); assert.equal(gh.name, 'Guest House complimentary');
  assert.deepEqual(unitsOf('guesthouse/guest-house'), [{ key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null }]);
  assert.equal(unitsFor('guesthouse/guest-house', 6), 6);
  assert.equal(unitsFor('guesthouse/guest-house', 7), 7, 'a seventh guest does not fit in six places');
  assert.ok(unitsFor('guesthouse/guest-house', 7) > sellable('guesthouse/guest-house'));
  /* the invented label is gone from the ledger */
  assert.equal(SEED['airbnb-2br/private-residence'], undefined, 'the retired key is gone');
  assert.ok(!Object.keys(SEED).some((k) => /airbnb|private-residence/.test(k)));
  /* the wedding window is ONE stage whether spent in the hotel, the Riverside or the Guest House */
  assert.equal(stageOf('guesthouse/guest-house'), 'wedstay'); assert.equal(stageOf('riverside/superior-window'), 'wedstay'); assert.equal(stageOf('wedstay/heritage'), 'wedstay');
  assert.deepEqual(STAGES, ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']);
  /* Lijiang every category six rooms, the Kempinski six — the current Operations Master */
  for (const k of Object.keys(SEED).filter((k) => k.startsWith('ljg/'))) assert.equal(SEED[k].capacity, 6, k);
  assert.equal(SEED['kempinski/deluxe-balcony-king'].capacity, 6);
});

test('every selectable room in the shop is stock-controlled', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const R = sandbox.window.SIYL_ROOMS;
  const missing = [];
  for (const key of Object.keys(R)) {
    for (const w of R[key].windows) {
      for (const room of R[key].rooms) {
        if (!SEED[`${w.id}/${room.slug}`]) missing.push(`${w.id}/${room.slug}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'a room a guest can pick has no stock behind it');
});

test('the engine is the only place a place is decided; the retired category ledger is no longer written', () => {
  const client = readFileSync(join(ROOT, 'assets/rooms.js'), 'utf8');
  assert.ok(!/capacity\s*[:=]\s*\d/.test(client), 'the client carries a capacity number');
  assert.ok(!/SEED/.test(client), 'the client carries the seed');
  assert.match(client, /\/api\/rooms/, 'the client talks to the engine route');
  assert.match(client, /API \+ '\/join'/, 'the client asks the server for a place');
  assert.match(client, /API \+ '\/leave'/, 'the client can hand a place back');
  const engine = readFileSync(join(ROOT, 'src/rooms.js'), 'utf8');
  assert.match(engine, /blockConcurrencyWhile/, 'a join is not serialised');
  assert.match(engine, /409/, 'full must answer 409');
  assert.match(engine, /HOLD THE NEW PLACE FIRST/);
  const worker = readFileSync(join(ROOT, 'src/worker.js'), 'utf8');
  assert.match(worker, /idFromName\('rooms'\)/, 'every request must reach ONE object');
  assert.match(worker, /retired — use \/api\/rooms/, 'the category ledger answers 410');
  assert.ok(!existsSync(join(ROOT, 'assets/inventory.js')), 'the retired client is gone');
});
test('the guest-facing Guest House matches the ledger: SIX shared places, complimentary, on every surface — never "Private Residence", never "up to 4" (Owner, 19 Sep 2026)', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const R = sandbox.window.SIYL_ROOMS;
  assert.equal(R.airbnb, undefined, 'the retired stay key is gone');
  const gh = R.guesthouse;
  assert.ok(gh, 'SIYL_ROOMS.guesthouse');
  assert.equal(gh.name, 'Guest House complimentary');
  assert.deepEqual(gh.windows.map((w) => w.id), ['guesthouse']);
  const res = gh.rooms.find((r) => r.slug === 'guest-house');
  assert.ok(res, 'the room slug is guest-house');
  assert.equal(res.name, 'Guest House complimentary');
  assert.equal(res.status, 'Complimentary · six shared places');
  assert.equal(res.price, null); assert.equal(res.interest, true); assert.equal(res.complimentary, true);
  assert.equal(SEED['guesthouse/guest-house'].capacity, 6, 'the ledger holds six');
  assert.match(JSON.stringify(res.facts), /Six shared places/, 'the room page must say six');
  assert.match(res.story, /six shared places/);
  assert.ok(!/Private Residence|[Uu]p to 4|four guests|up to four/.test(JSON.stringify(gh)), 'the invented label and the retired capacity are gone');
  /* the photographs, in one folder */
  for (let i = 1; i <= 6; i++) assert.ok(existsSync(join(ROOT, `assets/images/guesthouse/guesthouse-0${i}.jpg`)), `guesthouse-0${i}.jpg`);
  assert.ok(res.gallery.length && res.gallery.every(([src]) => /^assets\/images\/guesthouse\/guesthouse-0[1-6]\.jpg$/.test(src)));
  assert.ok(!existsSync(join(ROOT, 'assets/images/airbnb')), 'the retired folder is gone');
  /* the stay media key */
  assert.ok(JSON.parse(readFileSync(join(ROOT, 'src/stay-media.json'), 'utf8')).guestHouse, 'src/stay-media.json carries guestHouse');
  assert.match(readFileSync(join(ROOT, 'assets/stay-media.js'), 'utf8'), /"guestHouse":\{"name":"Guest House complimentary/);
  /* the pages */
  const shown = (f) => readFileSync(join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const jr = shown('journeys.html');
  assert.match(jr, /id="j-guesthouse"/); assert.match(jr, /data-stay-gal="guestHouse"/); assert.match(jr, /room\.html\?stay=guesthouse&amp;room=guest-house/);
  assert.match(shown('accommodation.html'), /Guest House complimentary/);
  for (const f of ['journeys.html', 'accommodation.html', 'your-journey.html', 'room.html', 'cart.html', 'review.html', 'profile.html', 'src/worker.js', 'src/mail-templates.js', 'assets/journey.js', 'assets/stay.js', 'assets/rooms.js', 'assets/packages-data.js', 'assets/pricing.js']) {
    const s = shown(f);
    assert.ok(!/Private Residence|private-residence|airbnb-2br/.test(s), f + ' still names the invented residence');
    assert.ok(!/up to (4|four) (guests|adults)/i.test(s), f + ' still advertises four');
  }
});

test('the Owner-approved Full Experience rooms all have stock behind them', () => {
  const sandbox = { window: {}, document: { addEventListener() {} } };
  sandbox.window.document = sandbox.document;
  new Function('window', 'document', readFileSync(join(ROOT, 'assets/rooms-data.js'), 'utf8'))(sandbox.window, sandbox.document);
  const FE = sandbox.window.SIYL_FULL_EXPERIENCE;
  assert.deepEqual(FE, { 'bkk-stay': 'penthouse', prewed: 'heritage-grand-premier',
    wedstay: 'heritage-grand-premier', kmg: 'italian', ljg: 'viewing-270',
    kempinski: 'deluxe-balcony-king' });
  for (const [win, slug] of Object.entries(FE)) {
    const key = `${win}/${slug}`;
    assert.ok(SEED[key], key + ' is not stock-controlled');
    assert.ok(sellable(key) > 0, key + ' has no sellable stock');
    assert.ok((SEED[key].held || 0) < SEED[key].capacity, key + ' is wholly reserved inventory and cannot be a Full Experience default');
  }
});

test('transport stays UNCAPPED in this pass — no guessed seat counts', () => {
  for (const key of ['train', 'mu9632', 'c642', 'return']) {
    assert.ok(!SEED[key], key + ' must not be stock-controlled yet');
    assert.ok(!Object.keys(SEED).some((k) => k.startsWith(key + '/')), key + ' has a seeded seat count');
  }
  const seedSrc = readFileSync(join(ROOT, 'src/inventory-seed.js'), 'utf8');
  for (const t of ['MU9632', 'MU5924', 'C642', 'Special Express']) {
    assert.ok(!seedSrc.includes(t), 'the seed carries a transport capacity for ' + t);
  }
});

test('the two packages are peer cards with ONE primary action each — a preview, never a hold; the confirmation lives in the shell drawer and applies only the plan that was shown; nothing of the old modes survives (Owner, 19 Sep 2026)', () => {
  const yj = readFileSync(join(ROOT, 'your-journey.html'), 'utf8');
  const sys = readFileSync(join(ROOT, 'assets/prep.css'), 'utf8');
  /* the package card: the same card, the same hierarchy, the same interaction for both packages */
  assert.match(yj, /function packageCard\(kind\)/);
  assert.match(yj, /<article class="p-card p-pack" data-package="'\+kind\+'">/, 'a package is a card');
  assert.match(yj, /class="p-act" data-package-preview="'\+kind\+'"/, 'the one action of a package card is the primary block: a PREVIEW');
  assert.match(yj, /J\.packageOrder\(\)\.map\(packageCard\)/, 'the packages are offered in the order the data says');
  assert.match(yj, /data-counts>'\+esc\(J\.countsWords\(\)\)/, 'the trip\'s composition is the derived counts, never a number typed in');
  /* the weights: the solid primary, the bordered quiet block, the underlined link — all real targets; nothing bright, nothing rounded */
  const act = sys.slice(sys.indexOf('.p-act {'), sys.indexOf('.p-act:hover'));
  assert.match(act, /background: var\(--p-ink\)/, 'the primary action stays the solid dark block');
  assert.match(sys, /--p-act-h: 52px/, 'every primary action is a real block target');
  const quiet = sys.slice(sys.indexOf('.p-act.quiet {'), sys.indexOf('}', sys.indexOf('.p-act.quiet {')));
  assert.match(quiet, /background: none; color: var\(--p-ink\)/, 'the quiet block is bordered');
  const link = sys.slice(sys.indexOf('.p-link {'), sys.indexOf('.p-link:hover'));
  assert.match(link, /min-height: var\(--p-tap\)/, 'the link is still a 44 px target');
  assert.match(sys, /--p-tap:\s+44px/);
  assert.ok(!/border: 1px solid/.test(link.replace(/border-bottom: 1px solid[^;]*;/, '')), 'the link must not compete with the primary');
  assert.ok(!/border-radius/.test(act) && !/gradient\(/.test(act));
  assert.match(sys, /\.p-packs \{ display: grid;/, 'the two cards share one grid'); assert.match(sys, /\.p-pack \{/);
  /* the confirmation: the shell's one detail layer; the engine is read again and the plan compared before anything is held */
  assert.match(yj, /SH\.drawer\(h,/, 'the package confirmation must use the shell drawer');
  assert.ok(!/class="fxo"/.test(yj) && !/class="fxs"/.test(yj), 'no page-local overlay survives');
  assert.match(yj, /J\.planSignature\(plan\)!==FX_PLAN\.sig/, 'a plan that changed while the guest looked is shown again, never applied');
  assert.match(yj, /ST\.select\(win,it\.room,r\.unit\|\|undefined,need\)/, 'the party\'s stays are held in the units the plan named');
  assert.match(yj, /U\.wait\(wk,plan\.need/, 'a stage no option can take goes to the waiting list');
  assert.match(yj, /plan\.unskip\.forEach\(function\(k\)\{J\.skip\(k,false\)\}\)/, 'a "not joining" of a covered stage is lifted');
  /* the waiting-list card and the declined card */
  assert.match(yj, /data-waitlisted="'\+seg\.key\+'"/); assert.match(yj, /data-unwait="'\+seg\.key\+'"/); assert.match(yj, />Choose a stay</); assert.match(yj, />Not joining this stage</);
  /* the old modes are gone: no buttons, no words, no script */
  const shown = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const re of [/id="fxb"/, /id="csb"/, /Cost Saving/, /Full Experience/, /self-arranged/i, /Every stage you have already chosen stays exactly as you chose it/, /Arranged for you/, /Fixed arrangement/i, /arranged\.js/, /SIYL_ARRANGED/, /fullExperience\(|costSavingOptions|costSavingPlan|selfArranged|soldOutStages/]) assert.ok(!re.test(shown(yj)), 'your-journey.html still carries ' + re);
  for (const f of ['cart.html', 'profile.html', 'review.html', 'journeys.html', 'room.html']) {
    const s = shown(readFileSync(join(ROOT, f), 'utf8'));
    for (const re of [/Arranged for you/, /arranged\.js/, /SIYL_ARRANGED/, /Cost Saving/, /self-arranged/i, /Fixed arrangement/i]) assert.ok(!re.test(s), f + ' still carries ' + re);
  }
  /* the waiting list on the other surfaces */
  assert.match(readFileSync(join(ROOT, 'profile.html'), 'utf8'), /data:'waitlist:'\+seg\.key,[^\n]*meta:'Waiting list · number '\+\(w&&w\.position/, 'My Profile shows the waiting-list stages with their position');
  const rv = readFileSync(join(ROOT, 'review.html'), 'utf8');
  assert.match(rv, /function paintArranged\(\)\{var el=document\.getElementById\('arranged'\)[\s\S]{0,400}J\.state\(s\)==='waitlisted'/, 'Review & Send paints the WAITING LIST into the kept block, no fixed arrangement');
  assert.match(rv, /number '\+\(w&&w\.position\|\|'\?'\)\+' on the waiting list/);
});

test('a photograph and the words after it are separated by a real token', () => {
  const css = readFileSync(join(ROOT, 'assets/aman.css'), 'utf8');
  assert.match(css, /--a-gap-media:\s*96px/, 'the media gap token must exist');
  assert.match(css, /\.a-hero \+ \.a-sec[\s\S]{0,140}margin-top: var\(--a-gap-media\)/,
    'the section after the hero must open on the media gap');
  /* and the shorthand that silently deleted the desktop rhythm is gone */
  assert.ok(!/\.a-lede \{ max-width: 1180px; margin: 0 auto;/.test(css),
    'the margin shorthand still wipes the vertical rhythm at 900 px');
  for (const sel of ['.a-lede', '.a-pair', '.a-duo', '.a-close']) {
    const re = new RegExp('\\' + sel + ' \\{[^}]*margin: 0 auto');
    assert.ok(!re.test(css), sel + ' still resets its vertical rhythm with a shorthand');
  }
});

test('a package falls back along its DEFINED chain by capacity, never by price; when no option can take the whole party the stage is WAITLISTED — answered, positioned, USD 0 — and a place held resolves it (Owner, 19 Sep 2026)', async () => {
  const rooms = new Rooms(doState()), call = caller(rooms), hold = holdAs(call);
  const me = identity(PEGGY), lin = identity(LIN);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG;
  w.SIYL_GUEST.setScope({ vientiane: true });
  const wed = J.SEGMENTS.find((s) => s.key === 'wedstay');
  const row = (plan) => plan.rows.find((r) => r.seg.key === 'wedstay');
  /* the old planner is gone */
  for (const k of ['fullExperience', 'costSavingOptions', 'costSavingPlan', 'selfArranged', 'soldOutStages']) assert.equal(J[k], undefined, 'SIYL_JOURNEY.' + k + ' must not exist');
  assert.ok(!/soldOutStages|fullExperience|costSaving|selfArranged|'arranged'/.test(readFileSync(join(ROOT, 'assets/journey.js'), 'utf8')), 'assets/journey.js still carries the old planner');
  /* everything free: the essential trip's default, Room A of The Heritage, for a party of two */
  assert.equal(J.partySize(), 2);
  let plan = J.packagePlan('essential');
  assert.deepEqual(plain([row(plan).why, row(plan).key, row(plan).unit, row(plan).amount, plan.total, plan.waitlist]), ['default', 'wedstay/heritage', 'A', 145, 145, []]);
  /* one place taken in EVERY unit of the chain (The Heritage 5, Executive 13, Grand Premier 3, Riverside 6, the Guest House 5 of 6): a party of two fits nowhere — a party of one everywhere */
  const chain = plain(w.SIYL_PACKAGES.essential.stages.wedstay);
  assert.deepEqual(chain, ['wedstay/heritage', 'wedstay/heritage-executive', 'wedstay/heritage-grand-premier', 'riverside/superior-window', 'guesthouse/guest-house']);
  let n = 0;
  for (const key of chain) for (const u of unitsOf(key)) for (let i = 0; i < u.places - 1; i++) { const r = await hold(other(++n), key, u.label, 1); assert.equal(r.status, 200, key + ' ' + u.label); }
  assert.equal(n, 32);
  await U.load(true);
  plan = J.packagePlan('essential');
  assert.equal(row(plan).why, 'waitlist', 'no option of the chain takes two places together');
  assert.deepEqual(plain(row(plan).tried), chain, 'every option was tried, in the defined order');
  assert.equal(row(plan).wanted, 'wedstay/heritage'); assert.equal(row(plan).key, null); assert.equal(row(plan).unit, null);
  assert.deepEqual(plain(plan.waitlist), ['wedstay']); assert.equal(plan.total, 0, 'a waitlisted stage costs nothing');
  assert.deepEqual(plain(plan.counts), { stages: 1, defaults: 0, fallbacks: 0, waitlisted: 1, replaced: 0, same: 0 });
  assert.equal(U.unitForParty('wedstay', 'heritage', 2), null); assert.equal(U.unitForParty('wedstay', 'heritage', 1).label, 'A');
  assert.equal(U.soldOut('wedstay', 'heritage'), false, 'places remain — for one; sold out is the engine\'s word for none');
  const w2 = page({ auth: LIN, fetch: await roomsFetch(rooms, lin) }); await w2.SIYL_UNITS.load(true); w2.SIYL_GUEST.setScope({ vientiane: true });
  const solo = w2.SIYL_JOURNEY.packagePlan('essential');
  assert.deepEqual(plain([solo.need, row(solo).why, row(solo).key, row(solo).unit, solo.total]), [1, 'default', 'wedstay/heritage', 'A', 145], 'a party of one takes the default');
  /* Peggy takes her place in the line — number 1; the stage is ANSWERED, at USD 0; Lin behind her — number 2 */
  const rw = await U.wait('wedstay', plan.need, row(plan).tried);
  assert.equal(rw.ok, true);
  assert.deepEqual(plain([U.waitlisted('wedstay').position, U.waitlisted('wedstay').size, U.waitlisted('wedstay').wanted]), [1, 2, chain]);
  assert.deepEqual(plain(U.waitlistedStages()), ['wedstay']);
  assert.equal(J.state(wed), 'waitlisted'); assert.equal(J.waitPosition(wed), 1);
  let c = plain(J.counts());
  assert.deepEqual(c, { relevant: 2, confirmed: 0, waitlisted: 1, declined: 0, open: 1, excluded: 8, resolved: 1, bagItems: 0, bagTotal: 0 });
  assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open, 'the invariant');
  assert.equal(J.countsWords(), '1 on the waiting list · 1 still open — of the 2 stages of your trip');
  assert.equal(w.SIYL_GUEST.missingFor('journey').some((m) => /^room:|wedstay/.test(m.key)), false, 'a waitlisted stage is answered — never a missing item');
  const lw = await call(lin, 'wait', { invitationId: lin.invitationId, guestId: lin.guestId, stage: 'wedstay', size: 1, wanted: [], name: 'Lin' });
  assert.equal(lw.status, 200); assert.equal(lw.d.waitlist.wedstay.position, 2); assert.deepEqual(lw.d.waiting, { wedstay: 2 });
  assert.equal(U.waiting('wedstay'), 1, 'this device has not read since'); await U.load(true); assert.equal(U.waiting('wedstay'), 2);
  /* a guest already holding a place cannot also wait; a second wait is still one entry */
  const dup = await call(other(1), 'wait', { invitationId: 'INV-X1', guestId: 'g-x1', stage: 'wedstay', size: 1, wanted: [], name: 'X1' });
  assert.equal(dup.status, 409); assert.equal(dup.d.error, 'a place is held in this stage');
  const again = await call(me, 'wait', { invitationId: me.invitationId, guestId: me.guestId, stage: 'wedstay', size: 2, wanted: [], name: 'Peggy' });
  assert.equal(again.status, 200); assert.equal(again.d.waiting.wedstay, 2, 'one entry per guest and stage'); assert.equal(again.d.waitlist.wedstay.position, 1);
  /* Room A of The Heritage empties: the plan is the default again, the hold resolves the line, Lin moves up to number 1 */
  assert.equal((await call(other(1), 'leave', { invitationId: 'INV-X1', guestId: 'g-x1', key: 'wedstay/heritage' })).status, 200);
  await U.load(true);
  plan = J.packagePlan('essential');
  assert.deepEqual(plain([row(plan).why, row(plan).key, row(plan).unit]), ['default', 'wedstay/heritage', 'A']);
  assert.deepEqual(plain(await ST.select('wedstay', 'heritage', row(plan).unit, plan.need)), { ok: true, unit: 'A' });
  assert.equal(U.waitlisted('wedstay'), null, 'a place held resolves the waiting-list entry'); assert.equal(U.waiting('wedstay'), 1);
  assert.equal((await call(lin, 'mine', {})).d.waitlist.wedstay.position, 1, 'the line renumbers behind her');
  assert.equal(J.state(wed), 'selected');
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, x.unit])), [['wedstay', 145, 'A']]); assert.equal(B.total(), 145);
  c = plain(J.counts()); assert.deepEqual([c.confirmed, c.waitlisted, c.open, c.bagItems, c.bagTotal], [1, 0, 1, 1, 145]);
  /* leaving the line: "not joining" a waitlisted stage unwaits first, then declines */
  const w3 = page({ auth: LIN, fetch: await roomsFetch(rooms, lin) }); await w3.SIYL_UNITS.load(true); w3.SIYL_GUEST.setScope({ vientiane: true });
  assert.equal(w3.SIYL_JOURNEY.state(wed), 'waitlisted'); assert.equal(w3.SIYL_JOURNEY.waitPosition(wed), 1);
  assert.deepEqual(plain(await w3.SIYL_JOURNEY.decline(wed)), { ok: true });
  assert.equal(w3.SIYL_JOURNEY.state(wed), 'declined'); assert.equal(w3.SIYL_UNITS.waitlisted('wedstay'), null); assert.equal(w3.SIYL_UNITS.waiting('wedstay'), 0);
  assert.deepEqual(plain(w3.SIYL_JOURNEY.counts()), { relevant: 2, confirmed: 0, waitlisted: 0, declined: 1, open: 1, excluded: 8, resolved: 1, bagItems: 0, bagTotal: 0 });
});


/* ==========================================================================
   THE PACKAGES — configuration with a DEFINED chain, previewed as a PURE plan:
   two peer packages and individual selection; no mode, no arrangement.
   ========================================================================== */
test('A · the package mechanics (with the fixture Essential package of test/sandbox.mjs — the shipped Essential trip has no composition and is not offered): two packages in this order, the complete trip (all ten stages) and the fixture (the wedding stay); every option is a real product; individual selection is the third way and not a package (Owner, 19 Sep 2026)', () => {
  const w = page({ auth: PEGGY });
  const J = w.SIYL_JOURNEY, PK = w.SIYL_PACKAGES, P = w.SIYL_PRICE;
  assert.deepEqual(plain(J.packageOrder()), ['complete', 'essential']);
  assert.deepEqual(Object.keys(PK).sort(), ['complete', 'essential']);
  for (const k of ['complete', 'essential']) { assert.equal(PK[k].key, k); assert.ok(PK[k].name && PK[k].short, k + ' is incomplete'); }
  assert.equal(PK.complete.name, 'Complete trip'); assert.equal(PK.essential.name, 'Essential trip');
  /* the complete trip covers all ten stages A–J, in the journey's own keys */
  const keys = plain(J.SEGMENTS.map((s) => s.key));
  assert.deepEqual(keys, ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']);
  assert.deepEqual(Object.keys(PK.complete.stages), keys);
  /* the essential trip covers ONLY the wedding stay: the entry category, its neighbours, the Riverside, the Guest House */
  assert.deepEqual(Object.keys(PK.essential.stages), ['wedstay']);
  assert.deepEqual(plain(PK.essential.stages.wedstay), ['wedstay/heritage', 'wedstay/heritage-executive', 'wedstay/heritage-grand-premier', 'riverside/superior-window', 'guesthouse/guest-house']);
  /* every room option is stock-controlled and answers its own stage; every transport option is a priced flat product; no option twice */
  for (const pk of Object.values(PK)) for (const [stage, def] of Object.entries(pk.stages)) {
    if (typeof def === 'string') { assert.equal(def, stage); assert.ok(P.FLAT[def] && P.FLAT[def].price > 0, def + ' is not a priced product'); continue; }
    assert.ok(Array.isArray(def) && def.length, pk.key + '/' + stage);
    for (const key of def) { assert.ok(SEED[key], key + ' is not stock-controlled'); assert.equal(stageOf(key), stage, key + ' answers another stage'); }
    assert.equal(new Set(def).size, def.length, pk.key + '/' + stage + ': no option twice');
  }
  /* the defaults of the complete trip are the Owner's rooms; the wedding chain runs the house outwards and ends with the two alternative houses */
  assert.deepEqual(Object.fromEntries(Object.entries(PK.complete.stages).filter(([, d]) => Array.isArray(d)).map(([k, d]) => [k, d[0]])),
    { 'bkk-stay': 'bkk-stay/penthouse', prewed: 'prewed/heritage-grand-premier', wedstay: 'wedstay/heritage-grand-premier', kmg: 'kmg/italian', ljg: 'ljg/viewing-270', kempinski: 'kempinski/deluxe-balcony-king' });
  assert.deepEqual(plain(PK.complete.stages.wedstay.slice(0, 3)), ['wedstay/heritage-grand-premier', 'wedstay/heritage-executive', 'wedstay/heritage'], 'the default, then the more affordable neighbour outwards — a rule of the file, not of price');
  assert.deepEqual(plain(PK.complete.stages.wedstay.slice(-2)), ['riverside/superior-window', 'guesthouse/guest-house']);
  assert.equal(PK.complete.stages.wedstay.length, 9, 'every wedding-window option of the house and the two alternatives');
  /* the page hooks */
  assert.deepEqual(plain(J.packageStages('essential').map((s) => s.key)), ['wedstay']);
  assert.equal(J.packageStages('complete').length, 10);
  assert.deepEqual(plain(J.packagePlan('nothing').rows), [], 'an unknown package plans nothing');
  for (const k of ['fullExperience', 'costSavingOptions', 'costSavingPlan', 'selfArranged']) assert.equal(J[k], undefined, 'SIYL_JOURNEY.' + k + ' is gone');
});

test('B/C · the essential trip\'s default is The Heritage, USD 145 — the WEDDING STAY window: one payable night, the second hosted by Haruthai & Suthep; a plan is pure', () => {
  const w = page({ auth: PEGGY });   /* no engine: the default, decided again on confirm */
  w.SIYL_GUEST.setScope({ vientiane: true });
  const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, B = w.SIYL_BAG;
  const plan = J.packagePlan('essential');
  assert.equal(plan.ready, false, 'the engine is unread');
  assert.equal(plan.need, 2);
  assert.equal(plan.rows.length, 1);
  const [row] = plan.rows;
  assert.deepEqual(plain([row.seg.key, row.why, row.key, row.unit, row.amount, row.replaces, row.wasDeclined]), ['wedstay', 'default', 'wedstay/heritage', null, 145, null, false]);
  assert.equal(row.items.length, 1);
  const it = row.items[0];
  assert.equal(it.id, 'wedstay'); assert.equal(it.room, 'heritage'); assert.equal(it.price, 145); assert.equal(it.by, 'essential'); assert.equal(it.qty, 1);
  /* it is the WEDDING STAY window: one payable night, the second hosted */
  assert.equal(it.pay, 1); assert.equal(it.nights, 2);
  assert.equal(plan.total, 145); assert.deepEqual(plain(plan.add.map((x) => x.id)), ['wedstay']); assert.deepEqual(plain(plan.remove), []); assert.deepEqual(plain(plan.waitlist), []);
  const q = P.quote('wedstay', 'heritage');
  assert.equal(q.hosted, 1); assert.match(q.contribution, /second night hosted by Haruthai & Suthep/);
  assert.equal(P.cheapest('wedstay').slug, 'heritage', 'the entry category of the house is also its most affordable — by configuration, never because price decided');
  /* computing a plan changes nothing */
  assert.deepEqual(plain(B.get()), []); assert.equal(B.total(), 0); assert.equal(J.state(J.SEGMENTS.find((s) => s.key === 'wedstay')), 'open');
  assert.match(J.planSignature(plan), /^wedstay:default:wedstay\/heritage::145:/); assert.equal(J.planSignature(plan), J.planSignature(J.packagePlan('essential')), 'a pure plan has one signature');
});

/* the pricing modules alone, outside the page sandbox — for the price helpers a package never consults */
const shop = () => {
  const sandbox = { window: {}, document: { addEventListener() {}, dispatchEvent() {} },
                    localStorage: { getItem: () => null, setItem() {} } };
  sandbox.window.document = sandbox.document;
  sandbox.window.localStorage = sandbox.localStorage;
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', readFileSync(join(ROOT, f), 'utf8'))
      (sandbox.window, sandbox.document, sandbox.localStorage);
  }
  return sandbox.window;
};

test('D · when The Heritage is sold out the next-cheapest available room is used', () => {
  const w = shop();
  const P = w.SIYL_PRICE;
  assert.equal(P.cheapest('wedstay').slug, 'heritage');
  assert.equal(P.cheapest('wedstay', (s) => s !== 'heritage').slug, 'heritage-executive');
  assert.equal(P.quote('wedstay', 'heritage-executive').total, 155);
  assert.equal(P.cheapest('wedstay', (s) => !['heritage', 'heritage-executive'].includes(s)).slug, 'heritage-grand-premier');
});

test('E · no room is held back from the Cost Saving hotel (Owner, 15 Sep 2026): the cheapest available room is the room', () => {
  const w = shop();
  const P = w.SIYL_PRICE;
  assert.equal(P.cheapest('wedstay', (s) => ['grand-majestic', 'souphattra-presidential'].includes(s)).slug, 'grand-majestic');
  assert.equal(P.cheapest('wedstay', () => false), null);
});

test('F · the Guest House complimentary: Complimentary is the value, six shared places seen by first name, USD 0 in the Bag as a real selection — never "Private Residence" (Owner, 19 Sep 2026)', async () => {
  const rooms = new Rooms(doState());
  const me = identity(PEGGY), lin = identity(LIN);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, P = w.SIYL_PRICE, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  w.SIYL_GUEST.setScope({ vientiane: true });
  const wed = J.SEGMENTS.find((s) => s.key === 'wedstay');
  const [line] = P.items('guesthouse', 'guest-house');
  assert.deepEqual(plain(line), { id: 'guesthouse', name: 'Guest House complimentary · Vientiane', meta: '27 February – 01 March 2027 · Complimentary · six shared places', interest: false, complimentary: true, price: 0, stay: 'guesthouse', room: 'guest-house', img: 'assets/images/guesthouse/guesthouse-01.jpg' });
  assert.equal(P.lineBasis(line), '', 'a complimentary line never reads "Amount on request"');
  assert.equal(J.meta(line).cat, 'Accommodation');
  assert.equal(U.label('guesthouse', 'guest-house'), '6 places available');
  assert.equal(U.unitWords(U.units('guesthouse', 'guest-house')[0]), '6 places · Available');
  assert.equal(U.unitName(U.units('guesthouse', 'guest-house')[0]), 'Guest House complimentary', 'a property is named, never "Room A"');
  /* the wedding stay is ONE stage: the hotel, the Guest House or the Riverside */
  assert.deepEqual(plain(wed.ids), ['wedstay', 'guesthouse', 'riverside']);
  assert.deepEqual(plain(ST.stageIds('guesthouse')).sort(), ['guesthouse', 'riverside', 'wedstay', 'wedstay-n1', 'wedstay-n2']);
  /* chosen: a place in the house, in the guest's own name, USD 0 — a Bag line that is a real selection */
  assert.deepEqual(plain(await ST.select('guesthouse', 'guest-house', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, x.complimentary, x.unit, x.unitName])), [['guesthouse', 0, true, 'A', 'Guest House complimentary']]);
  assert.equal(B.total(), 0);
  assert.equal(U.label('guesthouse', 'guest-house'), 'Your place is held · Guest House complimentary');
  assert.equal(U.unitWords(U.units('guesthouse', 'guest-house')[0]), 'You · Your party · 4 places available', 'her place, the place kept for Steffie, four left');
  assert.deepEqual(plain(U.mine('wedstay')), { key: 'guesthouse/guest-house', label: 'A' });
  const c = plain(J.counts());
  assert.deepEqual([c.confirmed, c.open, c.bagItems, c.bagTotal], [1, 1, 1, 0], 'a complimentary line is a confirmed stage at USD 0');
  assert.equal(J.state(wed), 'selected');
  assert.equal(w.SIYL_GUEST.missingFor('journey').some((m) => /^room:/.test(m.key)), false, 'the held place is complete');
  /* who already shares the house, by first name — to any other authenticated guest */
  const w2 = page({ auth: LIN, fetch: await roomsFetch(rooms, lin) }); await w2.SIYL_UNITS.load(true);
  assert.equal(w2.SIYL_UNITS.unitWords(w2.SIYL_UNITS.units('guesthouse', 'guest-house')[0]), 'Peggy · Reserved · 4 places available', 'her first name, the place kept for her party as reserved');
  assert.deepEqual(plain(w2.SIYL_UNITS.units('guesthouse', 'guest-house')[0].occupants), [{ name: 'Peggy', mine: false, party: false }, { name: 'Reserved', mine: false, party: false, placeholder: true }], 'a first name, never an email, a phone number, a code');
  /* the Souphattra replaces it: one line, one hold, the house's place given back */
  assert.equal((await ST.select('wedstay', 'heritage', undefined, 2)).ok, true);
  assert.deepEqual(plain(B.get().map((x) => x.id)), ['wedstay']); assert.equal(B.total(), 145);
  assert.equal(U.units('guesthouse', 'guest-house')[0].taken, 0); assert.deepEqual(plain(U.mine('wedstay')), { key: 'wedstay/heritage', label: 'A' });
  /* the retired, misleading sentence is gone from every surface; the retired capacity too */
  for (const f of ['your-journey.html', 'review.html', 'cart.html', 'room.html', 'journeys.html', 'accommodation.html']) {
    const s = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(!/Guest Relations support applies during the Vientiane wedding stay only/.test(s), f + ' still implies hotel-style service for the house');
    assert.ok(!/up to 4 guests|Private Residence/.test(s), f + ' still says four, or names the invented residence');
  }
  assert.equal(SEED['guesthouse/guest-house'].capacity, 6);
});

test('G · the Guest House takes SIX places: a party of seven cannot take it; the engine refuses a party that does not fit together ("full for your party" — nobody is partially booked), a single guest takes the last place, the seventh is refused "full"; a party counts for its own (Owner, 19 Sep 2026)', async () => {
  const KEY = 'guesthouse/guest-house';
  assert.equal(unitsFor(KEY, 7), 7);
  assert.ok(unitsFor(KEY, 7) > sellable(KEY));
  assert.ok(unitsFor(KEY, 6) <= sellable(KEY));
  const rooms = new Rooms(doState()), call = caller(rooms), hold = holdAs(call);
  const me = identity(PEGGY), steffie = identity({ invitationId: PEGGY.invitationId, guestId: 'g-steffie', partyId: PEGGY.partyId }), lin = identity(LIN);
  for (let n = 1; n <= 5; n++) assert.equal((await hold(other(n), KEY, 'A', 1)).status, 200, 'guest ' + n);
  /* one place left: a party of two is refused as a whole */
  let r = await call(me, 'join', { invitationId: me.invitationId, guestId: me.guestId, key: KEY, label: 'A', name: 'Peggy', need: 2 });
  assert.equal(r.status, 409); assert.equal(r.d.ok, false); assert.equal(r.d.error, 'full for your party'); assert.equal(r.d.need, 2); assert.equal(r.d.free, 1);
  assert.deepEqual(r.d.mine, {}, 'nobody is partially booked');
  assert.equal(r.d.units[KEY][0].taken, 5);
  /* a single guest takes the last place; the house is then sold out; the seventh is refused */
  r = await call(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 200); assert.deepEqual(r.d.joined, { key: KEY, label: 'A' });
  assert.deepEqual(r.d.units[KEY][0].occupants.map((o) => o.name), ['X', 'X', 'X', 'X', 'X', 'Lin'], 'a name is letters: the engine keeps only letters, marks, spaces and \' - . of what a client sends (release 014)');
  assert.equal(r.d.units[KEY][0].full, true); assert.equal(r.d.summary[KEY].soldOut, true); assert.equal(r.d.summary[KEY].remainingPlaces, 0);
  r = await hold(other(7), KEY, 'A', 1);
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
  /* the same guest again is not a second place */
  r = await call(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 200); assert.equal(r.d.units[KEY][0].taken, 6);
  /* a party counts for its own: with two places left Peggy (need 2) holds hers, Steffie (need 2) finds her party already there and holds the last */
  const rooms2 = new Rooms(doState()), call2 = caller(rooms2), hold2 = holdAs(call2);
  for (let n = 1; n <= 4; n++) assert.equal((await hold2(other(n), KEY, 'A', 1)).status, 200);
  r = await call2(me, 'join', { invitationId: me.invitationId, guestId: me.guestId, key: KEY, label: 'A', name: 'Peggy', need: 2 });
  assert.equal(r.status, 200); assert.equal(r.d.units[KEY][0].free, 0, 'the last place is kept for Steffie');
  r = await call2(steffie, 'join', { invitationId: steffie.invitationId, guestId: steffie.guestId, key: KEY, label: 'A', name: 'Steffie', need: 2 });
  assert.equal(r.status, 200, 'the party member already in the house counts for her'); assert.equal(r.d.units[KEY][0].full, true);
  assert.deepEqual(r.d.units[KEY][0].occupants.filter((o) => o.party).map((o) => o.name), ['Peggy', 'Steffie']);
  r = await call2(lin, 'join', { invitationId: lin.invitationId, guestId: lin.guestId, key: KEY, label: 'A', name: 'Lin', need: 1 });
  assert.equal(r.status, 409); assert.equal(r.d.error, 'full');
});

test('M/N · the complete trip REPLACES whichever wedding stay was taken — the Guest House, the Riverside or a Souphattra room — keeps a matching selection, reverses a "not joining", falls to the DEFINED next option by capacity, and USD 2,175 per person stands for the ten defaults (C86 at USD 105 — the current master)', async () => {
  const rooms = new Rooms(doState()), call = caller(rooms), hold = holdAs(call);
  const me = identity(PEGGY);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, ST = w.SIYL_STAY, B = w.SIYL_BAG, U = w.SIYL_UNITS;
  w.SIYL_GUEST.setScope({ all: true });
  const wed = J.SEGMENTS.find((s) => s.key === 'wedstay');
  const row = (plan) => plan.rows.find((r) => r.seg.key === 'wedstay');
  const DEFAULTS = [['bkk-stay', 'bkk-stay/penthouse', 255], ['train', 'train', 100], ['prewed', 'prewed/heritage-grand-premier', 340], ['wedstay', 'wedstay/heritage-grand-premier', 170], ['mu9646', 'mu9646', 275],
                    ['kmg', 'kmg/italian', 150], ['c86', 'c86', 105], ['ljg', 'ljg/viewing-270', 200], ['return', 'return', 200], ['kempinski', 'kempinski/deluxe-balcony-king', 380]];
  assert.equal(DEFAULTS.reduce((t, [, , a]) => t + a, 0), 2175);
  let plan = J.packagePlan('complete');
  assert.equal(plan.ready, true); assert.equal(plan.need, 2); assert.equal(plan.name, 'Complete trip');
  assert.deepEqual(plain(plan.rows.map((r) => [r.seg.key, r.why, r.key, r.unit, r.amount])), DEFAULTS.map(([k, key, amt]) => [k, 'default', key, SEED[key] ? 'A' : null, amt]));
  assert.equal(plan.total, 2175);
  assert.equal(plan.add.reduce((t, x) => t + (x.price || 0) * (x.qty || 1), 0), 2175, 'the Bag lines the plan adds carry the same amounts');
  assert.deepEqual(plain([plan.remove, plan.unskip, plan.waitlist]), [[], [], []]);
  assert.deepEqual(plain(plan.counts), { stages: 10, defaults: 10, fallbacks: 0, waitlisted: 0, replaced: 0, same: 0 });
  assert.equal(plan.rows.find((r) => r.seg.key === 'mu9646').items[0].cls, 'business', 'the flight in the Business fare');
  assert.ok(plan.add.every((x) => x.by === 'complete' && x.qty === 1), 'every line says which package wrote it');
  /* each wedding-stay choice is replaced by the default: the current line is named; a line of another window is removed */
  for (const [win, slug, id, total] of [['guesthouse', 'guest-house', 'guesthouse', 0], ['riverside', 'superior-window', 'riverside', 60], ['wedstay', 'heritage', 'wedstay', 145]]) {
    assert.equal((await ST.select(win, slug, undefined, 2)).ok, true, win);
    assert.equal(B.total(), total, win);
    plan = J.packagePlan('complete');
    assert.deepEqual(plain([row(plan).why, row(plan).key, row(plan).unit, row(plan).replaces.id, plan.counts.replaced, plan.total]), ['default', 'wedstay/heritage-grand-premier', 'A', id, 1, 2175], win);
    if (id !== 'wedstay') assert.deepEqual(plain(plan.remove), [id], win + ': the line of the other house goes');
    assert.equal(B.total(), total, 'a plan is pure: the Bag is untouched'); assert.deepEqual(plain(U.mine('wedstay')), { key: win + '/' + slug, label: 'A' }, 'a plan is pure: the hold is untouched');
  }
  /* the guest already holds exactly what the package selects: same, nothing replaced, nothing added */
  assert.equal((await ST.select('wedstay', 'heritage-grand-premier', undefined, 2)).ok, true);
  plan = J.packagePlan('complete');
  assert.deepEqual(plain([row(plan).why, row(plan).replaces, plan.counts.same, plan.counts.replaced, plan.total]), ['same', null, 1, 0, 2175]);
  assert.ok(!plan.add.some((x) => x.id === 'wedstay'), 'nothing to add for a stage already yours');
  /* not joining: the package includes the stage again */
  assert.deepEqual(plain(await J.decline(wed)), { ok: true });
  assert.equal(J.state(wed), 'declined'); assert.equal(U.mine('wedstay'), null); assert.equal(B.total(), 0);
  plan = J.packagePlan('complete');
  assert.deepEqual(plain([row(plan).why, row(plan).wasDeclined, plan.unskip, plan.total]), ['default', true, ['wedstay'], 2175]);
  /* the default cannot take the party: the DEFINED next option — Heritage Executive, USD 155, the more affordable neighbour — capacity decides, never price */
  let n = 0;
  for (const u of unitsOf('wedstay/heritage-grand-premier')) for (let i = 0; i < u.places; i++) assert.equal((await hold(other(++n), 'wedstay/heritage-grand-premier', u.label, 1)).status, 200);
  await U.load(true);
  assert.equal(U.soldOut('wedstay', 'heritage-grand-premier'), true);
  plan = J.packagePlan('complete');
  assert.deepEqual(plain([row(plan).why, row(plan).key, row(plan).unit, row(plan).amount, row(plan).wanted, row(plan).tried, plan.counts.fallbacks, plan.total]),
    ['fallback', 'wedstay/heritage-executive', 'A', 155, 'wedstay/heritage-grand-premier', ['wedstay/heritage-grand-premier', 'wedstay/heritage-executive'], 1, 2160]);
  /* the signature: what was previewed is what is applied — the same plan again reads the same, another package does not */
  assert.equal(J.planSignature(plan), J.planSignature(J.packagePlan('complete')));
  assert.notEqual(J.planSignature(plan), J.planSignature(J.packagePlan('essential')));
  /* the essential trip never touches the other nine stages */
  assert.deepEqual(plain(J.packagePlan('essential').rows.map((r) => r.seg.key)), ['wedstay']);
});

test('the hosts have no special room and the Bag carries only actual selections (Owner, 19 Sep 2026): Haruthai starts at zero like every guest, sees every unit open, books through the engine, holds ONE place per stage; the trip stands at USD 0 with nothing chosen', async () => {
  const rooms = new Rooms(doState());
  const w = page({ auth: HARUTHAI, fetch: await roomsFetch(rooms, identity(HARUTHAI, true)) }); await w.SIYL_UNITS.load(true);
  const U = w.SIYL_UNITS, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, ST = w.SIYL_STAY, G = w.SIYL_GUEST;
  assert.equal(G.party().hosts, true, 'the host flag is explicit');
  const v = U.view();
  assert.deepEqual(plain(v.mine), {}, 'nothing is held before booking'); assert.equal(v.fixed, undefined, 'the view knows no fixed arrangement');
  assert.ok(Object.values(v.units).every((list) => list.every((u) => u.eligible === true && u.reservedFor === null && u.taken === 0)), 'every unit of every category is open to the hosts, none is theirs in advance');
  assert.deepEqual(plain(v.units['bkk-stay/penthouse'].map((u) => [u.label, u.free])), [['A', 2], ['B', 2], ['C', 2], ['D', 2], ['E', 2], ['F', 2]]);
  assert.equal(v.summary['bkk-stay/penthouse'].ownerReservedRooms, 0); assert.equal(v.summary['wedstay/souphattra-presidential'].reservedFor, null); assert.equal(v.summary['wedstay/souphattra-presidential'].free, 2);
  /* the inert names of the old rule */
  assert.equal(U.fixed(), false); assert.equal(U.fixedUnit(), null); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.reserved(), false);
  assert.equal(ST.fixed(), false); assert.equal(ST.fixedSlug(), ''); assert.equal(w.SIYL_ARRANGED, undefined); assert.equal(w.SIYL_PRICE.reservedFor(), null);
  /* the Bag: nothing chosen, nothing counted, every stage open */
  assert.deepEqual(plain(B.get()), []); assert.equal(B.total(), 0);
  let c = plain(J.counts());
  assert.deepEqual(c, { relevant: 10, confirmed: 0, waitlisted: 0, declined: 0, open: 10, excluded: 0, resolved: 0, bagItems: 0, bagTotal: 0 });
  for (const seg of J.SEGMENTS) assert.equal(J.state(seg), 'open', seg.key + ' is open — never "arranged"');
  assert.equal(J.statusLine(), '10 details to choose.');
  assert.equal(J.countsWords(), '10 still open — of the 10 stages of your trip');
  /* the couple book their own places like everyone else: Room A of the Penthouse, then a change of room — ONE hold per stage */
  assert.deepEqual(plain(await ST.select('bkk-stay', 'penthouse', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(U.mine('bkk-stay')), { key: 'bkk-stay/penthouse', label: 'A' });
  assert.equal(B.total(), 255); assert.deepEqual(plain(B.get().map((x) => [x.id, x.unit, x.unitName])), [['bkk-stay', 'A', 'Room A']]);
  assert.deepEqual(plain(await ST.select('bkk-stay', 'penthouse', 'C', 2)), { ok: true, unit: 'C' });
  assert.deepEqual(plain(U.mine('bkk-stay')), { key: 'bkk-stay/penthouse', label: 'C' });
  assert.deepEqual(plain(U.units('bkk-stay', 'penthouse').map((u) => u.taken)), [0, 0, 2, 0, 0, 0], 'the old place — and the place kept for her party there — was released once the new one was held; the new room keeps a place for her party');
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.unit])), [['bkk-stay', 'C']]);
  c = plain(J.counts()); assert.deepEqual([c.confirmed, c.open, c.bagItems, c.bagTotal], [1, 9, 1, 255]);
  /* Suthep sees Haruthai by first name, and the unit she holds is the one suggested to him */
  const w2 = page({ auth: SUTHEP, fetch: await roomsFetch(rooms, identity(SUTHEP, true)) }); await w2.SIYL_UNITS.load(true);
  assert.deepEqual(plain(w2.SIYL_UNITS.units('bkk-stay', 'penthouse')[2].occupants), [{ name: 'Haruthai', mine: false, party: true }, { name: 'Your party', mine: false, party: true, placeholder: true }], 'Haruthai, and the place she keeps for him');
  assert.equal(w2.SIYL_UNITS.suggest('bkk-stay', 'penthouse').label, 'C', 'the unit a party member already holds is suggested');
  assert.equal(w2.SIYL_UNITS.unitForParty('bkk-stay', 'penthouse', 2).label, 'C', 'and it takes the party: the member already there counts');
  /* without an identity the engine says counts only — no name, no id, nothing fixed */
  const anon = await (await rooms.fetch(new Request('https://x/api/rooms/'))).json();
  assert.equal(anon.fixed, undefined); assert.deepEqual(anon.mine, {}); assert.deepEqual(anon.units['bkk-stay/penthouse'][2].occupants, [{}, {}], 'two places taken (hers, and the one kept for her party) — nothing about whom'); assert.equal(anon.units['bkk-stay/penthouse'][2].eligible, false);
  /* the record carries the host flag; the mail takes host-ness from it, never from a room */
  assert.match(readFileSync(join(ROOT, 'src/worker.js'), 'utf8'), /hosts: !!who\.hosts/, 'the Worker stores hosts on every record');
  const mail = readFileSync(join(ROOT, 'src/mail-templates.js'), 'utf8');
  assert.match(mail, /record\.hosts/); assert.ok(!/Arranged for you/.test(mail), 'the mail has no "Arranged for you" section');
});
