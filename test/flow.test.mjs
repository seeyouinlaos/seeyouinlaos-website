/* ============================================================================
   FLOW · ABOUT YOU · PRICING · CART — the one readiness engine and what hangs
   on it (Owner decision, 14 Sep 2026).

   Step gating is hard and sequential · required always blocks, optional never
   · View All Steps names the exact missing control · the sticky VIEW and the
   cart's REVIEW YOUR JOURNEY respect the flow · Allergy NO completes, YES
   needs details · the retired questions are gone · the photography
   acknowledgement is required · one guest, one price: Sangkhathan 15, the
   night train 100, never a partner in the total · CART = STICKY = REVIEW.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, json, plain, src, roomsFetch, doState, PEGGY, STEFFIE, HARUTHAI, SUTHEP, LIN } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';

const deq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m);
const stepOf = (G, key) => G.steps().find((s) => s.key === key);
const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts });

/* a page with a live (in-memory) room engine behind fetch */
async function livePage(auth, rooms, seed) {
  const w = page({ auth, seed, fetch: await roomsFetch(rooms, identity(auth)) });
  await w.SIYL_UNITS.load(true);
  return w;
}
/* complete steps 01 and 03–05 for one guest, leave 02 to the test */
function completeExceptJourney(w, opts = {}) {
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = G.me().guestId;
  G.setScope({ all: true });   /* WHERE WILL YOU JOIN US (Owner, 18 Sep 2026): the first decision — every destination here */
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678');
  T.setAttendance(id, opts.temple || 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, opts.dinner === false && k === 'dinner' ? 'no' : 'yes'));
  if (opts.temple === 'yes') T.setOffering(id, opts.offering || 'no');
  G.setDressAck(true);
  G.setAllergy('no'); G.setPhotoAck(true);
  /* every visible question answered (Owner, 15 Sep 2026) */
  G.PROFILE.forEach((q) => G.setProfile(id, q.key, q.choices ? q.choices[0] : 'Answered'));
}

test('FLOW · steps are sequential: 02 is locked until 01 is complete, 06 until 01–05; the first missing item is named with its control', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST;
  deq(G.steps().map((s) => s.state), ['attention', 'locked', 'locked', 'locked', 'locked', 'locked']);
  deq(G.steps('you').map((s) => s.state), ['current', 'locked', 'locked', 'locked', 'locked', 'locked']);
  assert.equal(G.mayEnter('journey'), false); assert.equal(G.mayEnter('review'), false);
  deq(G.missingFor('you').map((m) => [m.key, m.href]), [['email', 'invitation.html#p-email'], ['phone', 'invitation.html#p-phone']]);
  assert.equal(G.firstMissing().href, 'invitation.html#p-email');
  assert.equal(G.nextHref(), 'invitation.html#p-email', 'VIEW goes to the first missing item, never past the gate');
  G.setContact('email', 'not-an-email'); G.setContact('phone', '12');
  assert.equal(G.done('you'), false, 'both must be valid');
  G.setContact('email', 'peggy@example.com'); G.setContact('phone', '+49 (0)170 123 4567');
  assert.equal(G.done('you'), true);
  assert.equal(G.mayEnter('journey'), true); assert.equal(G.mayEnter('wedding'), false);
  assert.equal(stepOf(G, 'you').stateLabel, '✓ Complete');
  assert.equal(stepOf(G, 'journey').stateLabel, 'Needs attention');
  assert.equal(stepOf(G, 'wedding').stateLabel, 'Locked');
  assert.deepEqual(Object.values(G.STATE_LABEL), ['✓ Complete', 'Current', 'Needs attention', 'Locked', 'Not joining'], 'five states, no generic OPEN — Not joining for a step outside the guest\'s scope');
});

test('FLOW · step 02 needs every stage answered AND a place in every chosen room; a declined stage is an answer', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms);
  const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, ST = w.SIYL_STAY;
  completeExceptJourney(w);
  assert.equal(stepOf(G, 'journey').missing.length, J.SEGMENTS.length, 'ten stages to answer (every destination joined)');
  assert.equal(stepOf(G, 'journey').missing[0].href, 'your-journey.html#s-bkk-stay');
  J.SEGMENTS.forEach((s) => J.skip(s.key, true));
  assert.equal(G.done('journey'), false, 'not joining is an answer — except for the mandatory Kunming → Lijiang train inside China (the graph, 21 Sep 2026)');
  deq(stepOf(G, 'journey').missing.map((m) => m.key), ['stage:c86']); w.SIYL_PRICE.items('c86').forEach((it) => w.SIYL_BAG.put(it));
  assert.equal(G.done('journey'), true, 'the train chosen: every stage answered');
  J.skip('wedstay', false);
  const r = await ST.select('wedstay', 'heritage');
  assert.equal(r.ok, true); assert.equal(r.unit, 'A');
  assert.equal(G.done('journey'), true);
  const line = ST.line('wedstay');
  assert.equal(line.unit, 'A'); assert.equal(line.qty, 1);
  /* the engine no longer holds the place (another device gave it back): the stage needs attention with the room chooser as its control */
  await rooms.storage.delete('occ:wedstay/heritage|A|g-peggy');
  await w.SIYL_UNITS.load(true);
  assert.equal(ST.line('wedstay').unit, null);
  deq(stepOf(G, 'journey').missing.map((m) => m.href), ['your-journey.html?room=wedstay#s-wedstay']);
  assert.equal(G.mayEnter('review'), false);
});

test('FLOW · step 03 is every event, and the Sangkhathan while attending the temple; 04 is the dress code and the seats of the events attended', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = 'g-peggy';
  deq(G.missingFor('wedding').map((m) => m.href), ['wedding.html#ev-temple', 'wedding.html#ev-coffee', 'wedding.html#ev-vows', 'wedding.html#ev-dinner']);
  T.setAttendance(id, 'yes'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes'));
  deq(G.missingFor('wedding').map((m) => m.href), ['wedding.html#sangkhathan'], 'attending the temple, the Sangkhathan is a required yes/no');
  T.setOffering(id, 'no');
  assert.equal(G.done('wedding'), true);
  T.setAttendance(id, 'no');
  assert.equal(G.done('wedding'), true, 'not attending: nothing to decide');
  deq(G.missingFor('preparation').map((m) => m.href), ['wedding-preparation.html#ack'], 'seats are asked only while seating is open');
  G.setDressAck(true);
  assert.equal(G.done('preparation'), true);
});

test('FLOW · step 05: allergy NO completes; YES needs details; every visible question must be answered (Owner, 15 Sep 2026); photography must be acknowledged; documents never block', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, D = w.SIYL_DOCS;
  const QS = ['profile:coffeetea', 'profile:flavor', 'profile:drink', 'profile:film', 'profile:music'];
  deq(G.missingFor('about').map((m) => m.key), ['allergy', ...QS, 'photo']);
  G.setAllergy('yes');
  deq(G.missingFor('about').slice(0, 2).map((m) => [m.key, m.href]), [['allergy-details', 'about-you.html#allergy-details'], ['profile:coffeetea', 'about-you.html#q-coffeetea']]);
  G.setAllergy('yes', 'peanuts');
  deq(G.missingFor('about').map((m) => m.key), [...QS, 'photo']);
  /* each unanswered question is named exactly, with the way to its box; an empty or blank answer never counts */
  deq(G.missingFor('about')[0], { key: 'profile:coffeetea', label: '02 · Coffee or tea', href: 'about-you.html#q-coffeetea' });
  G.setProfile('g-peggy', 'coffeetea', '   ');
  assert.equal(G.missingFor('about')[0].key, 'profile:coffeetea', 'blank is not an answer');
  G.setProfile('g-peggy', 'coffeetea', 'Tea, black');
  deq(G.missingFor('about').map((m) => m.key), QS.slice(1).concat(['photo']), 'answering updates the readiness at once');
  G.setPhotoAck(true);
  assert.equal(G.done('about'), false, 'five questions still open hold the step');
  assert.equal(G.mayEnter('review'), false);
  for (const [k, v] of [['flavor', 'Pandan'], ['drink', 'Water'], ['film', 'In the Mood for Love'], ['music', 'Jazz']]) G.setProfile('g-peggy', k, v);
  assert.equal(G.done('about'), true, 'no document, no consent needed');
  G.setAllergy('no');
  assert.equal(G.allergyDetails(), '', 'NO never keeps stale details');
  assert.equal(G.done('about'), true);
  assert.equal(D.consentDecided('g-peggy'), false, 'the publication consent is a separate optional choice');
  assert.equal(G.photoAck().textVersion, G.PHOTO_VERSION);
  /* the retired questions are truly gone */
  deq(G.PROFILE.map((q) => q.key), ['coffeetea', 'flavor', 'drink', 'film', 'music']);
  deq(G.PROFILE.map((q) => q.n), ['02', '03', '04', '05', '06'], 'sequential numbering after the allergy question (Question 5 "rather avoid" retired 19 Sep 2026)');
  assert.equal(G.ALLERGY.n, '01');
  for (const f of ['assets/guest.js', 'about-you.html', 'review.html']) {
    const s = src(f);
    assert.doesNotMatch(s, /Travel comfort|Anything else we should know|Accessibility (&|&amp;|or) comfort|Nothing here needs a tick/, f);
    assert.doesNotMatch(s, /key: 'comfort'|key: 'anything'|key: 'access'/, f);
  }
  assert.match(src('assets/guest.js'), /I understand and acknowledge this\./); assert.match(src('about-you.html'), /G\.PHOTO_TEXT/);
  assert.match(src('about-you.html'), /Optional · not added/, 'documents stay optional');
  /* no contradictory OPTIONAL label on a required question */
  const about = src('about-you.html');
  assert.doesNotMatch(about, /q\.n\+' · Optional'|placeholder="Optional"|<p class="t-l1">Optional<\/p><h2 class="t-h2">A little more/);
  assert.match(about, /aria-required="true" aria-invalid="'\+\(ok\?'false':'true'\)\+'"/);
  assert.match(about, /Complete':'Required'/);
  assert.match(src('assets/guest.js'), /\{ key: 'flavor', n: '03', q: 'My Favorite Flavor', hint: 'Choose one\.', required: true, type: 'choice', choices: \['Coffee', 'Milk', 'Butter', 'Pandan', 'Matcha Green Tea', 'Strawberry Milk'\] \}/);
  /* Review names an unanswered question with the way to it */
  assert.match(src('review.html'), /about-you\.html#q-'\+q\.key/);
});

test('FLOW · 06 opens only when 01–05 are complete; readiness lists every missing item with COMPLETE THIS', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, J = w.SIYL_JOURNEY;
  completeExceptJourney(w);
  J.SEGMENTS.forEach((s) => J.skip(s.key, true)); w.SIYL_PRICE.items('c86').forEach((it) => w.SIYL_BAG.put(it));
  assert.equal(G.mayEnter('review'), true);
  assert.equal(G.readiness().ok, true);
  assert.equal(G.nextHref(), 'review.html');
  /* something comes undone: the exact item, its step, its control */
  G.setPhotoAck(false);
  const r = G.readiness();
  assert.equal(r.ok, false);
  deq(r.need.map((n) => [n.n, n.stepLabel, n.href]), [['05', 'About You', 'about-you.html#photo']]);
  assert.equal(G.nextHref(), 'about-you.html#photo');
  assert.equal(stepOf(G, 'about').state, 'attention');
  assert.equal(stepOf(G, 'review').state, 'locked');
  assert.match(src('review.html'), /A few things still need your answer/);
  assert.match(src('review.html'), />Complete this</);
  assert.doesNotMatch(src('review.html'), /Answer for each guest/);
  assert.match(src('assets/prep-shell.js'), /function gate\(\)/);
  assert.match(src('assets/prep-shell.js'), /location\.replace\(hrefOf\(to\)\)/);
});

test('PRICING · one guest, one price: Sangkhathan USD 15 for this guest only, never USD 30; the night train USD 100; Sühring USD 180 per person', () => {
  const w = page({ auth: PEGGY });
  const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, B = w.SIYL_BAG, P = w.SIYL_PRICE;
  T.setAttendance('g-peggy', 'yes');
  assert.equal(T.canOffer('g-peggy'), true, 'her own choice, whatever Steffie does');
  T.setOffering('g-peggy', 'yes');
  deq(B.get().map((x) => [x.id, x.qty, x.price]), [['sangkhathan', 1, 15]]);
  assert.equal(B.total(), 15);
  /* Steffie, on her own device, chooses too: her total is 15, not 30 — and Peggy's stays 15 */
  const w2 = page({ auth: STEFFIE });
  w2.SIYL_TEMPLE.setAttendance('g-steffie', 'yes'); w2.SIYL_TEMPLE.setOffering('g-steffie', 'yes');
  assert.equal(w2.SIYL_BAG.total(), 15);
  assert.equal(B.total(), 15);
  T.setOffering('g-peggy', 'no');
  assert.equal(B.total(), 0);
  T.setOffering('g-peggy', 'yes'); T.setAttendance('g-peggy', 'no');
  assert.equal(T.offeringOf_('g-peggy'), null, 'not attending: the offering goes, and is asked again on return');
  assert.equal(B.has('sangkhathan'), false);
  assert.equal(P.FLAT.train.price, 100); assert.match(P.FLAT.train.basis, /USD 100 per person/);
  assert.equal(P.FLAT.suhring.price, 294); assert.equal(P.FLAT.baanphraya.price, 114); assert.equal(P.FLAT.cannubi.price, 165); assert.equal(P.FLAT.sangkhathan.price, 15);
  P.items('train').forEach((it) => { it.qty = 1; B.put(it); });
  assert.equal(B.total(), 100);
  assert.doesNotMatch(src('wedding.html'), /Total for your party|USD 30|We would like to take part/);
  assert.doesNotMatch(src('review.html'), /USD 30|one decision for your party/);
  assert.doesNotMatch(src('your-journey.html'), /× '\+q\+' guests|x\.qty>1|guests\(\)/);
  assert.doesNotMatch(src('experience.html'), /partySize|Participating guests/);
});

test('PRICING · the total is one number on every surface: sticky bar, cart, Your Journey, Review & Send, the sent text', () => {
  for (const f of ['cart.html', 'your-journey.html', 'review.html']) assert.match(src(f), /(SIYL_BAG|B)\.total\(\)/, f + ' reads the one total');
  assert.match(src('assets/bag.js'), /B\.money\(B\.total\(\)\)/);
  assert.match(src('review.html'), /'YOUR COST: USD '\+SIYL_BAG\.total\(\)/);
  assert.doesNotMatch(src('cart.html') + src('review.html') + src('assets/bag.js'), /checkout/i, 'never a checkout');
  const w = page({ auth: PEGGY });
  const B = w.SIYL_BAG, P = w.SIYL_PRICE;
  P.items('train').forEach((it) => { it.qty = 1; B.put(it); });
  P.items('suhring').forEach((it) => { it.qty = 1; it.request = true; B.put(it); });
  assert.equal(B.total(), 100 + 294);
  assert.equal(B.get().length, 2, 'one line per product');
  P.items('train').forEach((it) => { it.qty = 1; B.put(it); });
  assert.equal(B.get().length, 2, 'a duplicate is impossible');
});

test('CART · the navigation matrix: bag icon → cart; cart → Your Journey / exact selector / Review when eligible; sticky VIEW → Review when eligible', () => {
  const pages = ['journeys.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'invitation.html', 'room.html', 'transport.html', 'tea.html', '1872.html', 'marsilea.html', 'dress.html'];
  for (const f of pages) {
    assert.match(src(f), /<a class="bag" href="cart\.html"/, f + ': the bag icon opens the cart');
    assert.doesNotMatch(src(f), /<a class="bag" href="your-journey\.html"/, f);
  }
  const c = src('cart.html');
  assert.match(c, /Your bag is empty/); assert.match(c, /No selections yet · USD 0/); assert.match(c, /href="your-journey\.html">Open My Trip</);
  assert.match(c, /Review (&amp;|&) Send/); assert.match(c, /Not ready for Review &amp; Send yet/); assert.match(c, /Complete this/);
  assert.match(c, /ready\.ok\?'review\.html':\(first\?first\.href/);
  assert.match(c, /journeys\.html\?change='\+P\.windowOf\(x\.id\)\+'#j-'/, 'accommodation CHANGE → the exact stay selector');
  assert.match(c, /wedding\.html#sangkhathan/, 'Sangkhathan CHANGE → the exact decision');
  assert.match(c, /'your-journey\.html#s-'\+seg\.key/, 'transport CHANGE → the exact section');
  assert.match(c, /T\.setOffering\(me\.guestId,null\)/, 'REMOVE resets the authoritative decision');
  assert.match(c, /ST\.remove\(P\.windowOf\(id\)\)/, 'REMOVE gives the room place back');
  assert.doesNotMatch(c, /assets\/prep-shell\.js/, 'the cart is not a numbered step');
  const bag = src('assets/bag.js');
  assert.match(bag, /function dest\(\)\{return 'cart\.html'\}/, 'the sticky bar opens My Bag (Owner, 17 Sep 2026); My Bag\'s own Review link follows the readiness engine'); assert.match(c, /ready0\.ok\?'<a class="p-link" href="review\.html">Review &amp; Send<\/a>'/);
  assert.match(bag, /authed\(\)\?this\.get\(\)\.length:0/, 'the badge counts the guest\'s own lines only');
  assert.match(src('assets/prep-shell.js'), /data-leave="another"/); assert.match(src('assets/prep-shell.js'), /data-leave="out"/);
});

test('CART · one guest sees only their own cart; remove updates the authoritative state, the badge and the total; reload keeps it', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(HARUTHAI, rooms);
  const B = w.SIYL_BAG, P = w.SIYL_PRICE, T = w.SIYL_TEMPLE, ST = w.SIYL_STAY, G = w.SIYL_GUEST;
  P.items('train').forEach((it) => { it.qty = 1; B.put(it); });
  T.setAttendance('g-haruthai', 'yes'); T.setOffering('g-haruthai', 'yes');
  const r = await ST.select('wedstay', 'souphattra-presidential');
  assert.equal(r.ok, true, 'the hosts may take the Bride & Groom suite');
  assert.equal(B.get().length, 3); assert.equal(B.total(), 100 + 15 + P.quote('wedstay', 'souphattra-presidential').total);
  /* Suthep, separately, sees Haruthai in Room A and joins the same room */
  const w2 = await livePage(SUTHEP, rooms);
  const u = w2.SIYL_UNITS.units('wedstay', 'souphattra-presidential')[0];
  deq(u.occupants.map((o) => [o.name, o.party]), [['Haruthai', true]]);
  assert.equal(w2.SIYL_UNITS.suggest('wedstay', 'souphattra-presidential').label, 'A', 'the room a party member is in is suggested');
  const r2 = await w2.SIYL_STAY.select('wedstay', 'souphattra-presidential');
  assert.equal(r2.ok, true); assert.equal(r2.unit, 'A');
  assert.equal(w2.SIYL_BAG.get().length, 1, 'his cart is his own');
  assert.equal(w2.SIYL_BAG.total(), P.quote('wedstay', 'souphattra-presidential').total);
  await w.SIYL_UNITS.load(true);
  assert.equal(ST.unitWords(ST.line('wedstay')), 'Room A · You · Suthep · Full');
  /* Haruthai removes her stay: the place is released, the stage needs attention */
  await ST.remove('wedstay');
  assert.equal(B.get().length, 2);
  assert.equal(w.SIYL_UNITS.mine('wedstay'), null);
  assert.equal(w.SIYL_JOURNEY.state(w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'wedstay')), 'open');
  /* a fresh page with the same storage: the cart is still there */
  const w3 = page({ auth: HARUTHAI, seed: { 'siyl.bag': w.localStorage.getItem('siyl.bag'), 'siyl.temple': w.localStorage.getItem('siyl.temple') } });
  assert.equal(w3.SIYL_BAG.total(), 115);
  /* signing out: no authenticated cart */
  const w4 = page({ auth: null, seed: { 'siyl.bag': w.localStorage.getItem('siyl.bag') } });
  assert.equal(w4.SIYL_BAG.authed(), false);
});

