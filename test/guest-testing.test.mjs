/* OWNER CORRECTIONS FROM GUEST TESTING · 13 Sep 2026 · rewritten for THE CANONICAL BOOKING MODEL (Owner, 19 Sep 2026)
   Deterministic coverage for the corrected behaviours: a package is a package — for the stages it covers it replaces a
   conflicting choice, keeps a matching one, lifts a "not joining" on confirm and puts a stage on the waiting list when no
   defined option can take the party; the plan is pure; capacity decides, never price; the Bag carries only actual
   selections, one line per stage; the hosts start at zero like every guest; the journey's selected state is the bag's
   truth; the ceremony carries the couple's front-centre positions; the dinner does not; the wording corrections cannot
   silently return. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { page, roomsFetch, doState, session, PEGGY, STEFFIE, HARUTHAI, LIN } from './sandbox.mjs';
import { Rooms, unitsOf, allUnits, mayJoin } from '../src/rooms.js';
import { SEED, FIXED } from '../src/inventory-seed.js';
import { journeyModel, composeGuestMail, seatLabel } from '../src/mail-templates.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (f) => readFileSync(join(ROOT, f), 'utf8');
const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

/* a browser-shaped sandbox with a real, in-memory localStorage and the shop's own modules — no room engine: a plan computed
   here names the package's default and decides again on confirm (assets/journey.js) */
const shop = () => {
  const store = new Map();
  const localStorage = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };
  const document = { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [], getElementById: () => null, body: { classList: { add() {}, remove() {} } } };
  const window = { document, localStorage, addEventListener() {}, CustomEvent: class {} };
  /* the modules address each other as bare globals: bind what exists so far */
  for (const f of ['assets/rooms-data.js', 'assets/pricing.js', 'assets/bag.js', 'assets/packages-data.js', 'assets/journey.js']) {
    new Function('window', 'document', 'localStorage', 'CustomEvent', 'SIYL_BAG', 'SIYL_PRICE', 'SIYL_ROOMS', 'SIYL_STOCK', src(f))(window, document, localStorage, window.CustomEvent, window.SIYL_BAG, window.SIYL_PRICE, window.SIYL_ROOMS, undefined);
  }
  window.SIYL_BAG.badge = () => {};
  /* A PACKAGE UNDER TEST (release 014): the shipped Essential trip has no composition (the Owner has not defined it); the
     mechanics are proven with this one-stage fixture, as in test/sandbox.mjs */
  window.SIYL_PACKAGES.essential = { key: 'essential', name: 'Essential trip', short: 'a package under test', approved: true, fixture: true, stages: { wedstay: ['wedstay/heritage', 'wedstay/heritage-executive', 'wedstay/heritage-grand-premier', 'riverside/superior-window', 'guesthouse/guest-house'] } };
  window.SIYL_PACKAGE_ORDER = ['complete', 'essential'];
  return window;
};
const stageOf = (w, key) => w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === key);
const linesOf = (w, key) => w.SIYL_BAG.get().filter((x) => stageOf(w, key).ids.includes(x.id));
const lineOf = (w, key) => linesOf(w, key)[0];
const rowOf = (plan, key) => plan.rows.find((r) => r.seg.key === key);
/* confirming a package without the engine, in the page's own order (your-journey.html fxConfirm): the "not joining" of a
   covered stage is lifted, the replaced lines go, the package's products are put — a room line is held through the engine
   on the page; here the Bag is written directly */
const confirm = (w, plan) => { const J = w.SIYL_JOURNEY, B = w.SIYL_BAG; plan.unskip.forEach((k) => J.skip(k, false)); plan.remove.forEach((id) => B.remove(id)); plan.add.forEach((it) => B.put(it)); };
/* THE CANONICAL COUNTS hold their invariants in every state */
const invariants = (w) => { const c = w.SIYL_JOURNEY.counts(); assert.equal(c.relevant, c.confirmed + c.waitlisted + c.declined + c.open, 'relevant = confirmed + waitlisted + declined + open'); assert.equal(c.resolved, c.confirmed + c.waitlisted + c.declined); assert.equal(c.excluded + c.relevant, w.SIYL_JOURNEY.SEGMENTS.length, 'excluded is outside relevant'); assert.equal(c.bagItems, w.SIYL_BAG.get().length, 'bagItems = the Bag\'s actual lines'); assert.equal(c.bagTotal, w.SIYL_BAG.total(), 'bagTotal = the Bag\'s one total'); return c; };
/* the engine as one identity calls it, and the identity of a fixture session */
const idOf = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, name: s.preferredName || '' });
const call = async (rooms, id, op, body) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(id) }, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
const hold = (rooms, id, key, label, need) => call(rooms, id, 'join', { invitationId: id.invitationId, guestId: id.guestId, key, label, name: id.name || 'Guest', need: need || 1 });
/* the package's defaults, as assets/packages-data.js defines them (the first of every chain) */
const DEFAULTS = { 'bkk-stay': ['bkk-stay', 'penthouse'], train: ['train'], prewed: ['prewed', 'heritage-grand-premier'], wedstay: ['wedstay', 'heritage-grand-premier'], mu9646: ['mu9646'], kmg: ['kmg', 'italian'], c86: ['c86'], ljg: ['ljg', 'viewing-270'], 'return': ['return'], kempinski: ['kempinski', 'deluxe-balcony-king'] };

test('COMPLETE TRIP · a package is a package: it replaces a conflicting manual choice and names it, keeps a matching one, fills every open stage with the defined default; the plan is pure; the Bag carries the actual selections, one line per stage, one total', () => {
  const w = shop(); const P = w.SIYL_PRICE, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  assert.deepEqual(plain(J.packageOrder()), ['complete', 'essential'], 'two packages, offered in this order — no third mode, nothing arranged for anyone');
  assert.equal(B.total(), 0, 'nothing chosen: the Bag stands at USD 0'); assert.equal(J.open().length, 10, 'every stage open — no stage is answered before the guest speaks');
  /* the guest chooses U Sathorn by hand */
  P.items('bkk-stay', 'u-sathorn-superior-garden').forEach((it) => B.put(it));
  assert.equal(lineOf(w, 'bkk-stay').room, 'u-sathorn-superior-garden'); assert.equal(J.state(stageOf(w, 'bkk-stay')), 'selected');
  const before = w.localStorage.getItem('siyl.bag') + '|' + w.localStorage.getItem('siyl.skip');
  const plan = J.packagePlan('complete');
  assert.equal(w.localStorage.getItem('siyl.bag') + '|' + w.localStorage.getItem('siyl.skip'), before, 'computing the plan changes nothing');
  assert.equal(plan.rows.length, 10, 'the complete trip covers all ten stages'); assert.deepEqual(plain(plan.rows.map((r) => r.seg.key)), J.SEGMENTS.map((s) => s.key), 'in the order of the journey');
  for (const r of plan.rows) { assert.equal(r.why, 'default', r.seg.key + ' takes the defined default'); assert.equal(r.key, DEFAULTS[r.seg.key].join('/'), r.seg.key + ' is the first of its chain'); assert.equal(r.amount, P.quote(DEFAULTS[r.seg.key][0], DEFAULTS[r.seg.key][1]).total, r.seg.key + ' priced by the one pricing source'); }
  /* the conflicting manual choice is REPLACED and the plan says so — never silently */
  const bkk = rowOf(plan, 'bkk-stay');
  assert.equal(bkk.replaces && bkk.replaces.room, 'u-sathorn-superior-garden', 'the plan names the current U Sathorn line it replaces'); assert.equal(bkk.wasDeclined, false);
  assert.deepEqual(plain(plan.counts), { stages: 10, defaults: 10, fallbacks: 0, waitlisted: 0, replaced: 1, same: 0 });
  assert.deepEqual(plain(plan.waitlist), []); assert.deepEqual(plain(plan.unskip), []); assert.equal(plan.need, 1, 'no party known here: one place');
  assert.equal(plan.total, plan.rows.reduce((t, r) => t + r.amount, 0), 'the plan\'s total is the sum of its rows');
  assert.equal(J.planSignature(plan), J.planSignature(J.packagePlan('complete')), 'the same state, the same signature — what the confirm compares');
  /* confirmed: the Penthouse stands where U Sathorn stood; every other stage is filled; one line per stage; one total */
  confirm(w, plan);
  assert.equal(lineOf(w, 'bkk-stay').room, 'penthouse', 'the package replaced the manual Bangkok choice');
  for (const s of J.SEGMENTS) { assert.equal(linesOf(w, s.key).length, 1, s.key + ': exactly one line'); assert.equal(J.state(s), 'selected'); }
  assert.equal(J.open().length, 0); assert.equal(B.total(), plan.total, 'the Bag total is the plan total — the chosen lines and nothing else');
  const c = invariants(w); assert.deepEqual(plain(c), { relevant: 10, confirmed: 10, waitlisted: 0, declined: 0, open: 0, excluded: 0, resolved: 10, bagItems: 10, bagTotal: plan.total });
  /* a MATCHING manual choice is kept (why 'same'): nothing is replaced, nothing is added for it */
  const w2 = shop(); const P2 = w2.SIYL_PRICE, J2 = w2.SIYL_JOURNEY, B2 = w2.SIYL_BAG;
  P2.items('bkk-stay', 'penthouse').forEach((it) => B2.put(it));
  const plan2 = J2.packagePlan('complete'), same = rowOf(plan2, 'bkk-stay');
  assert.equal(same.why, 'same'); assert.equal(same.replaces, null); assert.equal(plan2.add.some((it) => it.id === 'bkk-stay'), false, 'not added again'); assert.equal(plan2.counts.same, 1); assert.equal(plan2.counts.replaced, 0);
  confirm(w2, plan2); assert.equal(linesOf(w2, 'bkk-stay').length, 1); assert.equal(lineOf(w2, 'bkk-stay').room, 'penthouse'); assert.equal(plan2.total, plan.total, 'the package\'s total is the package\'s whole composition — a kept stage counted once, as any other'); assert.equal(B2.total(), plan2.total);
});

test('ESSENTIAL TRIP · covers only the Wedding Stay: a hand-picked U Sathorn and a "not joining" of the train are never touched; ESSENTIAL → COMPLETE: a package is revised by a package, the decline is lifted on confirm and not before, a matching Kunming choice is kept, one line per stage', async () => {
  const w = shop(); const P = w.SIYL_PRICE, J = w.SIYL_JOURNEY, B = w.SIYL_BAG;
  P.items('bkk-stay', 'u-sathorn-superior-garden').forEach((it) => B.put(it));         /* by hand */
  P.items('kmg', 'italian').forEach((it) => B.put(it));                                  /* by hand — and the complete trip's own default */
  assert.deepEqual(plain(await J.decline(stageOf(w, 'train'))), { ok: true }); assert.equal(J.state(stageOf(w, 'train')), 'declined');   /* the guest's own word */
  assert.deepEqual(plain(J.packageStages('essential').map((s) => s.key)), ['wedstay'], 'the essential trip is the wedding stay alone');
  const es = J.packagePlan('essential');
  assert.equal(es.rows.length, 1); assert.equal(es.rows[0].why, 'default'); assert.equal(es.rows[0].key, 'wedstay/heritage', 'the entry category of the wedding house first');
  assert.equal(es.total, P.quote('wedstay', 'heritage').total); assert.deepEqual(plain(es.unskip), [], 'the train is not covered: its decline is not lifted'); assert.deepEqual(plain(es.remove), []);
  confirm(w, es);
  assert.equal(lineOf(w, 'wedstay').room, 'heritage'); assert.equal(lineOf(w, 'bkk-stay').room, 'u-sathorn-superior-garden', 'a stage the package does not cover stays exactly as it was');
  assert.equal(lineOf(w, 'kmg').room, 'italian'); assert.equal(J.isSkipped('train'), true, 'and so does a "not joining"'); assert.equal(lineOf(w, 'train'), undefined);
  assert.equal(B.total(), P.quote('bkk-stay', 'u-sathorn-superior-garden').total + P.quote('kmg', 'italian').total + P.quote('wedstay', 'heritage').total);
  let c = invariants(w); assert.equal(c.confirmed, 3); assert.equal(c.declined, 1); assert.equal(c.open, 6);
  /* the complete trip over it: the wedding stay is revised (heritage → heritage-grand-premier, named), U Sathorn is replaced,
     Kunming is kept, the declined train is included — its decline lifted on confirm, never by looking */
  const cp = J.packagePlan('complete');
  assert.equal(J.isSkipped('train'), true, 'computing the plan lifts nothing');
  const ws = rowOf(cp, 'wedstay'); assert.equal(ws.why, 'default'); assert.equal(ws.key, 'wedstay/heritage-grand-premier'); assert.equal(ws.replaces && ws.replaces.room, 'heritage', 'the package names the wedding stay it replaces');
  assert.equal(rowOf(cp, 'bkk-stay').replaces.room, 'u-sathorn-superior-garden'); assert.equal(rowOf(cp, 'kmg').why, 'same', 'the hand-picked Italian Style Suite is what the package selects — kept');
  const tr = rowOf(cp, 'train'); assert.equal(tr.wasDeclined, true); assert.equal(tr.why, 'default'); assert.deepEqual(plain(cp.unskip), ['train'], 'the plan names the decline it lifts');
  assert.equal(cp.counts.replaced, 2); assert.equal(cp.counts.same, 1);
  confirm(w, cp);
  assert.equal(lineOf(w, 'wedstay').room, 'heritage-grand-premier', 'the essential wedding stay gave way to the complete trip\'s default');
  assert.equal(J.isSkipped('train'), false); assert.ok(lineOf(w, 'train'), 'the train is selected'); assert.equal(J.state(stageOf(w, 'train')), 'selected');
  assert.equal(linesOf(w, 'kmg').length, 1, 'one Kunming line, never two'); assert.equal(lineOf(w, 'kmg').room, 'italian');
  for (const s of J.SEGMENTS) assert.equal(linesOf(w, s.key).length, 1, s.key + ': one line per stage');
  assert.equal(B.total(), cp.total, 'the Bag total is the complete trip\'s — the kept Kunming line counted once'); c = invariants(w); assert.equal(c.confirmed, 10); assert.equal(c.open, 0); assert.equal(c.declined, 0);
});

test('PARTY CAPACITY · capacity decides, never price: when every Heritage room has one place left, Peggy & Steffie\'s essential trip falls to the next defined option and says so; confirming holds the unit for the party; a full room is refused, a half room is refused to a party of two; one hold per stage', async () => {
  const rooms = new Rooms(doState());
  /* five strangers, one in each Heritage room of the wedding window: five single places, none for a party of two */
  for (let i = 0; i < 5; i++) { const g = { invitationId: 'INV-G90' + i, guestId: 'g-G90' + i, partyId: 'INV-G90' + i, hosts: false }; assert.equal((await hold(rooms, g, 'wedstay/heritage', 'ABCDE'[i])).status, 200); }
  const me = idOf(PEGGY);
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, U = w.SIYL_UNITS, ST = w.SIYL_STAY, B = w.SIYL_BAG, G = w.SIYL_GUEST, P = w.SIYL_PRICE;
  G.setScope({ vientiane: true });
  assert.equal(J.partySize(), 2, 'Peggy & Steffie: two places together'); assert.equal(U.summary('wedstay', 'heritage').remainingPlaces, 5, 'five places remain — none of them two together'); assert.equal(U.summary('wedstay', 'heritage').largestFree, 1);
  assert.equal(U.unitForParty('wedstay', 'heritage', 2), null); assert.equal(U.soldOut('wedstay', 'heritage'), false, 'not sold out — full for this party');
  const plan = J.packagePlan('essential'); assert.equal(plan.ready, true); assert.equal(plan.need, 2);
  const r = plan.rows[0];
  assert.equal(r.why, 'fallback'); assert.equal(r.wanted, 'wedstay/heritage'); assert.equal(r.key, 'wedstay/heritage-executive', 'the next DEFINED option — not the cheapest, not the dearest'); assert.equal(r.unit, 'A');
  assert.deepEqual(plain(r.tried), ['wedstay/heritage', 'wedstay/heritage-executive']); assert.equal(r.amount, P.quote('wedstay', 'heritage-executive').total);
  assert.deepEqual(plain(plan.counts), { stages: 1, defaults: 0, fallbacks: 1, waitlisted: 0, replaced: 0, same: 0 }); assert.deepEqual(plain(plan.waitlist), []);
  /* confirmed as the page does it: the unit the preview named, for the whole party */
  assert.deepEqual(plain(await ST.select('wedstay', 'heritage-executive', r.unit, plan.need)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(U.view().mine), { wedstay: { key: 'wedstay/heritage-executive', label: 'A' } }, 'one hold per stage');
  assert.equal(B.get().length, 1); assert.equal(B.get()[0].id, 'wedstay'); assert.equal(B.get()[0].room, 'heritage-executive'); assert.equal(B.get()[0].unit, 'A'); assert.equal(B.total(), r.amount);
  assert.equal(ST.held(B.get()[0]), true); assert.equal(G.missingFor('journey').some((m) => /wedstay/.test(m.key)), false, 'the wedding stay is answered and held');
  invariants(w);
  /* Steffie belongs in the same room: the place her party holds counts for her */
  const w2 = page({ auth: STEFFIE, fetch: await roomsFetch(rooms, idOf(STEFFIE)) }); await w2.SIYL_UNITS.load(true);
  const unitA = w2.SIYL_UNITS.units('wedstay', 'heritage-executive')[0];
  assert.deepEqual(plain(unitA.occupants), [{ name: 'Peggy', mine: false, party: true }, { name: 'Your party', mine: false, party: true, placeholder: true }], 'the first name of who is there, that she is Steffie\'s party, and the place kept for Steffie');
  assert.equal(w2.SIYL_UNITS.fitsParty('wedstay', 'heritage-executive', unitA, 2), true); assert.equal(w2.SIYL_UNITS.unitForParty('wedstay', 'heritage-executive', 2).label, 'A');
  assert.deepEqual(plain(await w2.SIYL_STAY.select('wedstay', 'heritage-executive', undefined, 2)), { ok: true, unit: 'A' });
  /* a full room is refused; a room with one place is refused to a party of two — 409, and the guest keeps what they had */
  const lin = idOf(LIN);
  let x = await hold(rooms, lin, 'wedstay/heritage-executive', 'A'); assert.equal(x.status, 409); assert.equal(x.d.ok, false); assert.equal(x.d.error, 'full');
  x = await hold(rooms, lin, 'wedstay/heritage', 'A', 2); assert.equal(x.status, 409); assert.equal(x.d.error, 'full for your party'); assert.equal(x.d.need, 2); assert.equal(x.d.free, 1);
  assert.deepEqual(plain(x.d.mine), {}, 'nothing was held for the refused guest');
  /* the words the guest reads are the engine's */
  const w3 = page({ auth: LIN, fetch: await roomsFetch(rooms, lin) }); await w3.SIYL_UNITS.load(true);
  assert.equal(w3.SIYL_STAY.refusal({ ok: false, error: 'full for your party' }), 'This room cannot take your whole party. Please choose another room.');
  assert.equal(w3.SIYL_STAY.refusal({ ok: false, error: 'full' }), 'This room was just filled. Please choose another room.');
  assert.equal(w3.SIYL_UNITS.unitWords(w3.SIYL_UNITS.units('wedstay', 'heritage-executive')[0]), 'Peggy · Steffie · Full');
});

test('THE WAITING LIST · no defined option can take a party of six but the Guest House, and one of its six places is taken: the essential trip puts the stage on the waiting list — USD 0, answered for readiness, number 1; a second guest is number 2, leaving the line renumbers, a place held resolves it, a guest holding a place cannot wait, "not joining" leaves the line first', async () => {
  const rooms = new Rooms(doState());
  const lin = idOf(LIN); assert.equal((await hold(rooms, lin, 'guesthouse/guest-house', 'A')).status, 200, 'Lin takes one of the six shared places');
  /* a party larger than a room spreads over the rooms of a category (release 014): so every hotel category of the chain is
     left with fewer than six free places by strangers — no option of the chain can take six together */
  const strangerAt = (k, n) => ({ invitationId: 'INV-Z' + k.replace(/\W/g, '') + n, guestId: 'Z' + k.replace(/\W/g, '') + n, partyId: 'INV-Z' + k.replace(/\W/g, '') + n, hosts: false, name: 'Z' });
  for (const [k, fill] of [['wedstay/heritage', 5], ['wedstay/heritage-executive', 21], ['wedstay/heritage-grand-premier', 1], ['riverside/superior-window', 7]]) {
    let n = 0; for (const u of unitsOf(k)) { if (k === 'wedstay/heritage' && u.label === 'B') continue;   /* Room B stays free for the step below */
      for (let i = 0; i < u.places && n < fill; i++) { n++; assert.equal((await hold(rooms, strangerAt(k, n), k, u.label)).status, 200); } }
  }
  const SIX = session({ guestId: 'g-six', partyId: 'INV-DEMO-006', partyName: 'The Six', fullName: 'Six Demo', preferredName: 'Six', members: [1, 2, 3, 4, 5, 6].map((n) => ({ guestId: 'g-six-' + n, preferredName: 'Guest ' + n })) });
  const w = page({ auth: SIX, fetch: await roomsFetch(rooms, idOf(SIX)) }); await w.SIYL_UNITS.load(true);
  const J = w.SIYL_JOURNEY, U = w.SIYL_UNITS, B = w.SIYL_BAG, G = w.SIYL_GUEST, seg = stageOf(w, 'wedstay');
  G.setScope({ vientiane: true }); assert.equal(J.partySize(), 6);
  /* D2 · the Guest House complimentary: one shared unit of six places, who is there by first name */
  const gh = U.units('guesthouse', 'guest-house'); assert.equal(gh.length, 1);
  assert.deepEqual(plain({ label: gh[0].label, name: gh[0].name, kind: gh[0].kind, places: gh[0].places, reservedFor: gh[0].reservedFor, free: gh[0].free, occupants: gh[0].occupants }), { label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null, free: 5, occupants: [{ name: 'Lin', mine: false, party: false }] });
  assert.equal(U.stageOf('guesthouse/x'), 'wedstay'); assert.equal(U.label('guesthouse', 'guest-house'), '5 places available');
  const it = w.SIYL_PRICE.items('guesthouse', 'guest-house')[0]; assert.equal(it.id, 'guesthouse'); assert.equal(it.price, 0); assert.equal(it.complimentary, true); assert.equal(it.interest, false); assert.match(it.name, /^Guest House complimentary/);
  /* the plan: every option of the chain tried, none takes six together */
  const plan = J.packagePlan('essential'); const r = plan.rows[0];
  assert.equal(r.why, 'waitlist'); assert.equal(r.key, null); assert.equal(r.unit, null); assert.deepEqual(plain(r.items), []);
  assert.deepEqual(plain(r.tried), ['wedstay/heritage', 'wedstay/heritage-executive', 'wedstay/heritage-grand-premier', 'riverside/superior-window', 'guesthouse/guest-house'], 'the whole defined chain, in its order');
  assert.deepEqual(plain(plan.waitlist), ['wedstay']); assert.equal(plan.total, 0, 'a waitlisted stage costs nothing'); assert.equal(plan.counts.waitlisted, 1);
  assert.equal(J.state(seg), 'open', 'nothing changed by looking');
  /* confirmed as the page does it: the waiting list of the stage, with the party's size and what was tried */
  const wr = await U.wait('wedstay', plan.need, r.tried); assert.equal(wr.ok, true); assert.equal(wr.waited, 'wedstay');
  const entry = plain(U.waitlisted('wedstay')); assert.equal(entry.position, 1); assert.equal(entry.size, 6); assert.deepEqual(entry.wanted, plain(r.tried), 'what was tried travels with the entry'); assert.ok(entry.at);
  assert.deepEqual(plain(U.waitlistedStages()), ['wedstay']); assert.equal(U.waiting('wedstay'), 1); assert.deepEqual(plain(U.view().mine), {}, 'no hold — the waiting list is not a room');
  assert.equal(J.state(seg), 'waitlisted'); assert.equal(J.waitlisted(seg), true); assert.equal(J.waitPosition(seg), 1);
  assert.equal(B.get().length, 0, 'the Bag carries only actual selections'); assert.equal(B.total(), 0);
  const c = invariants(w); assert.deepEqual(plain(c), { relevant: 2, confirmed: 0, waitlisted: 1, declined: 0, open: 1, excluded: 8, resolved: 1, bagItems: 0, bagTotal: 0 });
  assert.deepEqual(plain(G.missingFor('journey').map((m) => m.key)), ['stage:prewed'], 'a waitlisted stage is answered — never a missing item');
  assert.equal(J.countsWords(), '1 on the waiting list · 1 still open — of the 2 stages of your trip');
  assert.deepEqual(plain(await J.decline(stageOf(w, 'prewed'))), { ok: true }); assert.equal(J.statusLine(), 'One stage on the waiting list.'); assert.equal(J.open().length, 0);
  /* a second guest in the line: number 2; the first leaving the line renumbers the second to 1 */
  const me = idOf(PEGGY); const wp = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await wp.SIYL_UNITS.load(true);
  const UP = wp.SIYL_UNITS, JP = wp.SIYL_JOURNEY, STP = wp.SIYL_STAY;
  assert.equal((await UP.wait('wedstay', 2, ['wedstay/heritage'])).ok, true); assert.equal(UP.waitlisted('wedstay').position, 2); assert.equal(UP.waiting('wedstay'), 2);
  assert.equal((await U.unwait('wedstay')).ok, true); assert.equal(U.waitlisted('wedstay'), null); assert.equal(J.state(seg), 'open', 'the six are open again — nothing is held, nothing is declined');
  await UP.load(true); assert.equal(UP.waitlisted('wedstay').position, 1, 'renumbered'); assert.equal(UP.waiting('wedstay'), 1);
  /* a place held in the stage resolves the entry */
  assert.deepEqual(plain(await STP.select('wedstay', 'heritage', 'B', 2)), { ok: true, unit: 'B' });
  assert.equal(UP.waitlisted('wedstay'), null); assert.deepEqual(plain(UP.view().mine), { wedstay: { key: 'wedstay/heritage', label: 'B' } }); assert.equal(JP.state(stageOf(wp, 'wedstay')), 'selected'); assert.equal(UP.waiting('wedstay'), 0);
  /* a guest who holds a place in the stage cannot also wait for it */
  const held = await UP.wait('wedstay', 2, []); assert.equal(held.ok, false); assert.equal(held.status, 409); assert.equal(held.error, 'a place is held in this stage');
  /* "not joining" from the waiting list: the line is left first, then the stage is declined */
  assert.deepEqual(plain(await STP.remove('wedstay')), { ok: true }); assert.equal((await UP.wait('wedstay', 2, [])).ok, true); assert.equal(JP.state(stageOf(wp, 'wedstay')), 'waitlisted');
  assert.deepEqual(plain(await JP.decline(stageOf(wp, 'wedstay'))), { ok: true }); assert.equal(UP.waitlisted('wedstay'), null); assert.equal(UP.waiting('wedstay'), 0); assert.equal(JP.state(stageOf(wp, 'wedstay')), 'declined');
  invariants(wp);
  /* the surfaces carry the waiting list, never an arrangement */
  assert.match(src('your-journey.html'), /data-waitlisted="'\+seg\.key\+'"/); assert.match(src('your-journey.html'), /data-unwait="'\+seg\.key\+'">Leave the waiting list<\/button>/);
  assert.match(src('profile.html'), /data:'waitlist:'\+seg\.key/); assert.match(src('review.html'), /J\.state\(s\)==='waitlisted'/);
  assert.match(src('src/mail-templates.js'), /section\('Waiting list'/); assert.match(src('src/mail-templates.js'), /T\.push\('WAITING LIST'\)/);
});

test('THE HOSTS START AT ZERO · no room is anyone\'s before booking: no fixed arrangement anywhere, twelve free Penthouse places to Haruthai, her complete trip is any guest\'s, she books like every guest and is seen by first name; the emails take host-ness from the record, never from a room', async () => {
  /* the seed and the engine */
  assert.deepEqual(FIXED, []);
  for (const [key, s] of Object.entries(SEED)) { assert.equal(s.held, 0, key + ' holds nothing in advance'); assert.equal('heldFor' in s, false, key + ' is held for nobody'); }
  for (const u of allUnits()) assert.equal(u.reservedFor, null, u.key + ' ' + u.label + ' is reserved for nobody');
  assert.deepEqual(plain(unitsOf('guesthouse/guest-house')), [{ key: 'guesthouse/guest-house', label: 'A', name: 'Guest House complimentary', kind: 'property', places: 6, reservedFor: null }]);
  assert.equal(unitsOf('bkk-stay/penthouse').length, 6); assert.equal(unitsOf('wedstay/souphattra-presidential')[0].places, 2, 'the Presidential is one room of two places');
  assert.deepEqual(mayJoin(unitsOf('bkk-stay/penthouse')[0], null), { ok: false, error: 'unauthorised' }); assert.deepEqual(mayJoin(unitsOf('bkk-stay/penthouse')[0], idOf(LIN)), { ok: true }); assert.deepEqual(mayJoin(unitsOf('bkk-stay/penthouse')[0], idOf(HARUTHAI)), { ok: true }, 'the hosts are asked for nothing but an identity');
  assert.equal(existsSync(join(ROOT, 'assets/arranged.js')), false, 'assets/arranged.js is deleted');
  for (const f of ['your-journey.html', 'cart.html', 'profile.html', 'review.html', 'journeys.html', 'accommodation.html', 'room.html', 'assets/journey.js', 'assets/packages-data.js', 'assets/rooms.js', 'assets/stay.js', 'assets/guest.js', 'src/worker.js', 'src/drafts.js', 'src/mail-templates.js', 'src/rooms.js'])
    assert.doesNotMatch(src(f), /arranged\.js|SIYL_ARRANGED|Arranged for you|Fixed arrangement|fixedStagesOf|withoutFixed|Private Residence|private-residence|airbnb-2br|up to 4/, f + ' carries nothing of the deleted concept');
  assert.doesNotMatch(src('src/inventory-seed.js'), /heldFor:|private-residence|airbnb-2br|up to 4/, 'the seed holds nothing for anyone (its comment alone says never "Private Residence")');
  assert.match(src('src/worker.js'), /hosts: !!who\.hosts/, 'the Worker stores host-ness on every record');
  /* the hosts' own view: nothing held, nothing fixed, every place free */
  const rooms = new Rooms(doState()); const hh = idOf(HARUTHAI); assert.equal(hh.hosts, true);
  const w = page({ auth: HARUTHAI, fetch: await roomsFetch(rooms, hh) }); await w.SIYL_UNITS.load(true);
  const U = w.SIYL_UNITS, ST = w.SIYL_STAY, J = w.SIYL_JOURNEY, B = w.SIYL_BAG, G = w.SIYL_GUEST;
  assert.equal(w.SIYL_ARRANGED, undefined); assert.equal(G.party().hosts, true);
  assert.deepEqual(plain(U.view().mine), {}, 'nothing held for the hosts before they book'); assert.deepEqual(plain(U.view().waitlist), {});
  assert.equal(U.fixed(), false); assert.equal(U.fixedUnit(), null); assert.deepEqual(plain(U.fixedStages()), []); assert.equal(U.reserved(), false); assert.equal(ST.fixed(), false); assert.equal(ST.fixedSlug(), '');
  const s = U.summary('bkk-stay', 'penthouse'); assert.deepEqual(plain({ rooms: s.sourceRooms, places: s.sourcePlaces, free: s.remainingPlaces, reserved: s.ownerReservedRooms, soldOut: s.soldOut }), { rooms: 6, places: 12, free: 12, reserved: 0, soldOut: false });
  for (const u of U.units('bkk-stay', 'penthouse')) { assert.equal(u.reservedFor, null); assert.equal(u.eligible, true); assert.equal(u.free, 2); }
  for (const seg of J.SEGMENTS) assert.equal(J.state(seg), 'open', seg.key + ' is open — never arranged');
  assert.equal(B.get().length, 0); assert.equal(B.total(), 0, 'the Bag stands at USD 0 with nothing chosen'); assert.deepEqual(plain(invariants(w)), { relevant: 10, confirmed: 0, waitlisted: 0, declined: 0, open: 10, excluded: 0, resolved: 0, bagItems: 0, bagTotal: 0 });
  /* the hosts' complete trip is any guest's: the same defaults, the same units, the same amounts as Peggy's (a party of two, an empty Bag) */
  const wp = page({ auth: PEGGY, fetch: await roomsFetch(rooms, idOf(PEGGY)) }); await wp.SIYL_UNITS.load(true);
  const ph = J.packagePlan('complete'); assert.equal(ph.ready, true); assert.equal(ph.need, 2);
  assert.equal(J.planSignature(ph), wp.SIYL_JOURNEY.planSignature(wp.SIYL_JOURNEY.packagePlan('complete')), 'no special-casing of the hosts');
  assert.deepEqual(plain({ why: rowOf(ph, 'bkk-stay').why, key: rowOf(ph, 'bkk-stay').key, unit: rowOf(ph, 'bkk-stay').unit }), { why: 'default', key: 'bkk-stay/penthouse', unit: 'A' });
  /* she books like every guest — and is seen by first name by the next guest */
  assert.deepEqual(plain(await ST.select('bkk-stay', 'penthouse', undefined, 2)), { ok: true, unit: 'A' });
  assert.deepEqual(plain(U.view().mine), { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A' } }); assert.equal(B.get().length, 1); assert.equal(B.get()[0].unit, 'A');
  await wp.SIYL_UNITS.load(true); assert.deepEqual(plain(wp.SIYL_UNITS.units('bkk-stay', 'penthouse')[0].occupants), [{ name: 'Haruthai', mine: false, party: false }, { name: 'Reserved', mine: false, party: false, placeholder: true }], 'her place and the place kept for her party member'); assert.equal(wp.SIYL_UNITS.summary('bkk-stay', 'penthouse').remainingPlaces, 10);
  /* the emails: "Front centre" for a host without a seat comes from the record's host flag — a Penthouse room proves nothing */
  const rec = (hosts, extra) => ({ invitationId: 'INV-G001', guestId: 'G001', submissionId: 'SYL-G001-0000AAAA', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', firstSentAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z', hosts,
    recipient: { email: 'guest@example.org', phone: '+66 81 000 0000' }, rooms: { 'bkk-stay': { stage: 'bkk-stay', key: 'bkk-stay/penthouse', label: 'A', name: 'Sathorn Penthouse', stay: 'Sathorn Penthouse Bangkok', room: 'Room A' } },
    registration: { channel: 'journey-shop', guestId: 'G001', totalUsd: 255, contact: { email: 'guest@example.org', phone: '+66 81 000 0000' }, selections: [Object.assign(wp.SIYL_PRICE.items('bkk-stay', 'penthouse')[0], { qty: 1, unit: 'A' })], templeCeremony: { guests: [{ guestId: 'G001', events: { ceremony: 'Attending', dinner: 'Attending' } }] }, guestRecord: { guests: [{ guestId: 'G001', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] }, ...(extra || {}) } });
  const host = journeyModel(rec(true)), guest = journeyModel(rec(false));
  assert.equal(host.hosts, true); assert.equal(host.seats.ceremony.label, 'Front centre'); assert.equal(host.seats.dinner.label, '', 'the dinner fixes nothing');
  assert.equal(guest.hosts, false); assert.equal(guest.seats.ceremony.label, '', 'a guest in Penthouse Room A is not a host'); assert.deepEqual(plain(guest.arranged), []); assert.deepEqual(plain(host.arranged), []);
  const chosen = journeyModel(rec(true, { seats: { ceremony: { G001: 'C-L-01-01' } } })).seats.ceremony; assert.equal(chosen.id, 'C-L-01-01'); assert.equal(chosen.label, seatLabel('C-L-01-01')); assert.ok(chosen.label && chosen.label !== 'Front centre', 'a chosen seat is its own label, host or not');
  for (const m of [composeGuestMail(rec(true)), composeGuestMail(rec(false))]) { assert.doesNotMatch(m.html, /Arranged for you|Fixed arrangement/); assert.doesNotMatch(m.text, /Arranged for you|Fixed arrangement/); assert.match(m.text, /Room A/); }
});

test('the journey page derives SELECTED from the bag and offers no second selection for it; the package drawer says what a package does', () => {
  const yj = src('your-journey.html');
  assert.match(yj, /var line=lineOf\(\{ids:\[win\]\}\),pick=line\?line\.room:null;/, 'the Bangkok rail reads the bag');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:\(U&&U\.ready\(\)&&U\.ctaWords\(win,r\.slug\)\)\?'<span class="p-act quiet is-current" aria-disabled="true">'\+esc\(U\.ctaWords\(win,r\.slug\)\)\+'<\/span>'\s*:'<button type="button" class="p-act" data-choose="'\+r\.slug\+'">Select this stay<\/button>'/, 'chosen card: inert current control · sold out: the engine\'s word · otherwise: the action');
  /* the flat travel is a ticket (Owner, 15 Sep 2026): selected → the pass, View details, Remove · otherwise → Select this travel */
  assert.match(yj, /actions:sel\?\[TP\.button\(seg\.key,true\),'<a class="p-link mute" href="transport\.html\?id='\+seg\.key\+'">View details<\/a>','<button type="button" class="p-link mute" data-rm="'\+seg\.key\+'">Remove<\/button>','<button type="button" class="p-link mute" data-skip="'\+seg\.key\+'">Not joining this stage<\/button>'\]\.join\(''\)\s*:\['<button type="button" class="p-act" data-choose-flat="'\+seg\.key\+'">Select this travel<\/button>'/, 'Special Express and every flat travel: the same rule');
  assert.match(yj, /on\?'<span class="p-act quiet is-current" aria-current="true">Current selection<\/span>'\s*:'<button type="button" class="p-act" data-cls="'\+c\.slug\+'">/, 'fares too — one selection language');
  assert.doesNotMatch(yj, /Change this day|Current fare|Current stay|Selected for your journey/, 'no second vocabulary');
  /* THE PACKAGES (Owner, 19 Sep 2026): two peer cards, a preview before anything is held, the drawer's own words, the confirm
     applies the plan that was shown; the counts derived, never invented */
  assert.match(yj, /<article class="p-card p-pack" data-package="'\+kind\+'">/); assert.match(yj, /data-package-preview="'\+kind\+'">Preview '\+esc\(pk\.name\.toLowerCase\(\)\)\+'<\/button>/);
  assert.match(yj, /A package is a package: for every stage it covers, the room, cabin or seat defined for it — or the next defined option that can take your party — replaces what you had chosen there\. Stages it does not cover stay exactly as they are\. Nothing is held until you add it\./, 'the drawer says what a package does');
  assert.match(yj, /J\.planSignature\(plan\)!==FX_PLAN\.sig\)\{fxPreview\(true,!fresh\)/, 'a plan that changed while the guest looked is drawn again, not applied');
  assert.match(yj, /data-counts>'\+esc\(J\.countsWords\(\)\)/); assert.match(yj, /'Not joining this stage'|Not joining this stage<\/p>/);
  assert.doesNotMatch(yj, /Every stage you have already chosen stays exactly as you chose it|Cost Saving|self-arranged|id="fxb"|id="csb"|fullExperience|costSaving|selfArranged|soldOutStages|Full Experience/, 'the retired planner and its words are gone');
  const css = src('assets/prep.css');
  assert.match(css, /\.p-act\.is-current \{[^}]*pointer-events: none/);
  assert.match(css, /\.p-stay\.p-chosen \{[^}]*box-shadow: inset 0 0 0 1px var\(--p-ink\)/, 'the chosen card is framed');
  assert.match(css, /\.atrk\.p-rail > \.p-card \+ \.p-card, \.p-rail-car \.p-stay \+ \.p-stay \{ margin-top: 0; \}/, 'rail cards share one top line');
  const jn = src('journeys.html');
  assert.match(jn, /on\?'<span class="pcgo on" aria-current="true">/, 'the choosing page too');
});

test('ABOUT YOU: step 05 is required — the allergy answer and the photography acknowledgement; favourites and documents stay optional', () => {
  const g = src('assets/guest.js');
  assert.match(g, /key: 'about', n: '05', label: 'About You', href: 'about-you\.html', required: true/);
  assert.match(g, /var ALLERGY = \{ key: 'allergy', n: '01', q: 'Do you have any food allergies\?', required: true/);
  assert.match(g, /key: 'drink', n: '04', q: 'Favourite drink'/);
  assert.match(g, /key: 'film', n: '05', q: 'Favourite film'/); assert.match(g, /key: 'music', n: '06', q: 'Favourite music'/);   /* Question 5 ("rather avoid") retired 19 Sep 2026 */
  assert.match(g, /aboutMissing: function \(\) \{[\s\S]*?if \(!this\.photoAck\(\)\) out\.push/, 'the acknowledgement holds the step');
  assert.match(g, /if \(key === 'about'\) return this\.applicable\('about'\) \? this\.aboutMissing\(\) : \[\];/, 'documents and consent never hold the step; a guest not joining the trip owes no hospitality answer');
  const inv = src('invitation.html');
  assert.match(inv, /about:'Food allergies, a few favourites, photography\.'/);
  const ab = src('about-you.html');
  assert.match(ab, /Optional · can be added later<\/p><h2 class="t-h2">Travel documents/, 'documents remain optional');
  assert.match(ab, /data-allergy="yes">Yes</); assert.match(ab, /data-allergy="no">No</);
  assert.doesNotMatch(ab, /Required — for example: None|tick &ldquo;/, 'nobody types "None"');
  assert.match(ab, /data-photo-ack/); assert.match(ab, /data-consent=/, 'the publication consent stays a separate choice');
});

test('SEATING: ceremony front-centre positions for the couple; dinner nothing fixed; the route is on The Wedding', async () => {
  const m = await import(join(ROOT, 'src/seating.js'));
  assert.deepEqual(m.RULES.ceremony.fixed, ['BRIDE', 'GROOM']); assert.equal(m.RULES.dinner.fixed, undefined);
  assert.equal(m.CAPACITY.ceremony.fixed, 2); assert.equal(m.CAPACITY.dinner.guestSeats, 50);
  const wd = src('wedding.html');
  assert.match(wd, /id="seats-route"/); assert.match(wd, /Choose your '\+ev\+' seat/); assert.match(wd, /data-state="booked">'\+\(frozen\?'View seat':'Change seat'\)/);
  assert.match(wd, /if\(ev==='ceremony'&&p\.hosts\)/, 'the hosts have no ceremony chair to choose');
  const wp = src('wedding-preparation.html');
  assert.match(wp, /data-hosts="true"/); assert.match(wp, /'Choose your '\+ev\+' seat'/);
  assert.match(wp, /function needs\(ev\)/, 'a seat is required for the events the guest attends');
  assert.match(wp, /Your wedding seats/, 'the one confirmation card');
  assert.match(src('assets/guest.js'), /hosts: a\.hosts === true/); assert.match(src('assets/invite.mjs'), /hosts: inv\.hosts === true/);
  assert.match(src('src/build-invitations.cjs'), /p\.hosts === true \? \{ hosts: true \}/);
});

test('AUTH: leaving keeps the guest\'s draft aside, clears the session, and never hands it to the next guest', () => {
  const inv = src('assets/invite.mjs');
  assert.match(inv, /const GUEST_KEYS = \['siyl\.guest', 'siyl\.bag', 'siyl\.temple', 'siyl\.docs', 'siyl\.sent', 'siyl\.skip', 'siyl\.skip\.by'\];/);
  assert.match(inv, /leave\(\) \{[\s\S]*?localStorage\.setItem\('siyl\.party\.' \+ a\.invitationId[\s\S]*?GUEST_KEYS\.concat\(RETIRED_KEYS\)\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);\s*localStorage\.removeItem\('siyl\.draft\.owner'\);\s*AUTH\.clear\(\);/);
  assert.match(inv, /if \(owner && owner !== invitationId\) GUEST_KEYS\.concat\(RETIRED_KEYS\)\.forEach\(\(k\) => localStorage\.removeItem\(k\)\);/, 'another guest\'s draft is never inherited; the same guest re-entering keeps their own');
  const sh = src('assets/prep-shell.js');
  assert.match(sh, /data-leave="another">Open another invitation<\/button>/); assert.match(sh, /data-leave="out">Sign out<\/button>/);
  assert.match(sh, /if \(e\.persisted && window\.SIYL_AUTH && !SIYL_AUTH\.get\(\)\) location\.reload\(\);/, 'back after leaving shows no guest');
  assert.match(sh, /location\.replace\(hrefOf\('invitation\.html'\) \+ \(how === 'another' \? '\?open=1' : ''\)\)/);
});

test('WORDING: no 1 + 1 seating, no blue dress, dinner poolside, China card is the Lijiang file', () => {
  for (const f of ['assets/transport-data.js', 'your-journey.html', 'journeys.html', 'assets/pricing.js']) assert.doesNotMatch(src(f), /1 \+ 1 seating|1\+1 seating|single seat on each side|nobody sits beside/i, f);
  assert.match(src('assets/transport-data.js'), /\['Class', 'Business Class'\]/);
  for (const f of ['wedding.html', 'review.html', 'voyage.html', 'wedding-preparation.html', 'dress.html']) assert.doesNotMatch(src(f), /Blue Lao Traditional Dress|in blue\b/i, f);
  assert.match(src('wedding.html'), /temple:'Lao Traditional Dress'/);
  for (const f of ['assets/journey.js', 'assets/temple.js', 'voyage.html', 'index.html', 'review.html', 'wedding.html']) assert.doesNotMatch(src(f), /courtyard garden/i, f);
  assert.match(src('assets/journey.js'), /Souphattra Heritage Vientiane · poolside/); assert.match(src('voyage.html'), /19:30 · Poolside/);
  assert.match(src('index.html'), /destination\.html#china" style="background-image:url\(assets\/images\/city\/004-lijiang-black-dragon-pool\.jpg\)/);
  assert.match(src('assets/images/ASSET-MAP.md'), /1XBVp6qIwUSWfHpw4w3S0CH-apvsej154/, 'the Drive source is traceable');
  /* the "After the Wedding" card carries the Owner's Lijiang old-town file (13 Sep 2026) */
  assert.match(src('index.html'), /journeys\.html#j-mu9646" style="background-image:url\(assets\/images\/city\/004-lijiang-old-town-roofs-jade-dragon\.jpg\)/);
  assert.match(src('assets/images/ASSET-MAP.md'), /1lI07I8yTBcCtiEevBdduf1Pf7eGkbRS4/);
  /* the first three tradition references, in the Owner's order */
  for (const f of ['wedding-preparation.html', 'dress.html']) {
    const order = [...src(f).matchAll(/images\/dress\/tradition-0(\d)\.jpg/g)].map((m) => m[1]).join('');
    assert.equal(order, '123456', f + ' tradition order');
  }
});
