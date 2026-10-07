/* ============================================================================
   THE SERVER'S AMOUNTS IN THE BROWSER (Owner, 4 Oct 2026 · Codex final review,
   5 Oct 2026).

   The server Billing Engine is the only source of a payable amount; the
   browser formats it. What must hold whatever the server is doing:

   · a selection whose amount has not arrived is still the SAME selection —
     never an interest line — and giving it back releases the place it holds;
   · the amount arrives later: every Bag line it prices is re-priced, and the
     surfaces are told to redraw;
   · an amount nobody has given is never "USD 0": "Price pending", "Price
     unavailable" when the server could not answer;
   · nothing is sent while a selected line has no amount (no partial total);
   · the server's amount wins over the catalogue's own number for a product it
     prices; the catalogue's number stands only where the server states none;
   · the quotes belong to the guest they were fetched for: a sign-out clears
     them, another guest never sees them, a late answer for a guest who left
     is dropped.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, plain, src, roomsFetch, doState, CORE, PEGGY, STEFFIE } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';

const identity = (s) => ({ invitationId: s.invitationId, guestId: s.guestId, partyId: s.partyId, hosts: !!s.hosts, firstName: s.preferredName });
const seg = (J, key) => J.SEGMENTS.find((s) => s.key === key);
async function livePage(auth, rooms, opts = {}) {
  const w = page({ auth, fetch: await roomsFetch(rooms, identity(auth)), ...opts });
  await w.SIYL_UNITS.load(true);
  return w;
}

test('PENDING IS NOT INTEREST · a room chosen before the server answered is a selection with no amount yet; Remove gives the place back', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms, { billing: 'pending' });
  const P = w.SIYL_PRICE, B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS;
  const q = P.quote('wedstay', 'heritage');
  assert.equal(q.total, null); assert.equal(q.pending, true); assert.equal(q.amount, ''); assert.match(q.basis, /^Price pending · 2 nights/);
  const line = P.items('wedstay', 'heritage')[0];
  assert.equal(line.price, null); assert.equal(line.pricePending, true); assert.equal(line.interest, undefined, 'never an interest line'); assert.equal(line.complimentary, undefined);
  const sel = await ST.select('wedstay', 'heritage'); assert.equal(sel.ok, true);
  const held = B.get().find((x) => x.id === 'wedstay');
  assert.equal(held.pricePending, true); assert.equal(held.interest, undefined); assert.ok(U.mine('wedstay'), 'the place is held');
  assert.equal(ST.held(held), true, 'held like any priced line');
  assert.equal(B.pricePending(), true); assert.equal(B.pending(), true); assert.equal(B.total(), 0);
  /* Remove gives the place back in the engine first, then the line goes */
  const r = await ST.remove('wedstay'); assert.equal(r.ok, true);
  assert.equal(U.mine('wedstay'), null, 'the place is released'); assert.equal(B.has('wedstay'), false);
  /* another guest finds the place free again */
  const other = await livePage(STEFFIE, rooms);
  assert.equal(other.SIYL_UNITS.units('wedstay', 'heritage').some((u) => (u.occupants || []).some((o) => o.name === 'Peggy')), false, 'nobody holds it in her name');
});

test('PENDING IS NOT INTEREST · declining the stage releases a held room whose amount had not arrived', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms, { billing: 'pending' });
  const J = w.SIYL_JOURNEY, ST = w.SIYL_STAY, U = w.SIYL_UNITS, B = w.SIYL_BAG, G = w.SIYL_GUEST;
  G.setScope({ all: true });
  assert.equal((await ST.select('prewed', 'heritage')).ok, true); assert.ok(U.mine('prewed'));
  assert.equal(J.state(seg(J, 'prewed')), 'selected');
  const d = await J.decline(seg(J, 'prewed')); assert.equal(d.ok, true);
  assert.equal(J.state(seg(J, 'prewed')), 'declined'); assert.equal(U.mine('prewed'), null, 'the place is released'); assert.equal(B.has('prewed'), false);
});

test('THE AMOUNT ARRIVES · every Bag line the server prices is re-priced through the Bag; the surfaces are told to redraw; nothing is saved for a redraw alone', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms, { billing: 'pending' });
  const P = w.SIYL_PRICE, B = w.SIYL_BAG, ST = w.SIYL_STAY;
  await ST.select('wedstay', 'heritage');
  P.items('train').forEach((it) => B.put(it));
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, !!x.pricePending])), [['wedstay', null, true], ['train', null, true]]);
  const seen = [];
  w.document.addEventListener('siyl:prices', () => seen.push('prices'));
  w.document.addEventListener('siyl:bag', (e) => seen.push(e && e.detail && e.detail.repaintOnly ? 'redraw' : 'bag'));
  w.__billingAnswer('ready');
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, !!x.pricePending])), [['wedstay', 145, false], ['train', 100, false]]);
  assert.equal(B.total(), 245); assert.equal(B.pricePending(), false); assert.equal(B.pending(), false);
  assert.ok(seen.includes('bag'), 'the changed lines are written like any change'); assert.ok(seen.includes('prices') && seen.includes('redraw'), 'every surface redraws');
  assert.equal(B.get().find((x) => x.id === 'wedstay').unit, ST.line('wedstay').unit, 'the held unit is kept');
  assert.match(src('assets/draft.js'), /if \(e && e\.detail && e\.detail\.repaintOnly\) return; D\.touch\(\);/, 'a redraw is not an edit');
});

test('NEVER "USD 0" · a pending amount says "Price pending", an unanswered one "Price unavailable"; money(null) prints nothing', () => {
  const w = page({ auth: PEGGY, billing: 'pending' }); const P = w.SIYL_PRICE;
  assert.equal(P.money(null), ''); assert.equal(P.money(undefined), ''); assert.equal(P.money(''), ''); assert.equal(P.money(0), 'USD 0');
  const t = P.items('train')[0];
  assert.equal(P.lineAmount(t), 'Price pending'); assert.equal(P.amountWords(t), 'Price pending'); assert.match(P.lineBasis(t), /^Price pending · /);
  assert.equal(P.flatMoney('train'), 'Price pending'); assert.equal(P.fromLine('prewed'), 'Price pending');
  assert.doesNotMatch(P.lineBasis(t) + P.lineAmount(t) + P.quote('prewed', 'heritage').basis, /USD 0\b/);
  w.__billingAnswer('failed');
  assert.equal(P.lineAmount(t), 'Price unavailable'); assert.equal(P.flatMoney('train'), 'Price unavailable'); assert.match(P.quote('prewed', 'heritage').basis, /^Price unavailable/);
  /* every surface prints the line's words instead of a zero */
  for (const f of ['cart.html', 'review.html', 'your-journey.html']) assert.match(src(f), /x\.price==null/, f);
  assert.match(src('journeys.html'), /function vp\(q,per\)\{return q&&q\.total!=null\?/);
  /* every total is printed through one function: pending words, or the known total with any line on request named beside it */
  assert.match(src('assets/bag.js'), /v=B\.totalWords\(\);/, 'the sticky bar');
  for (const f of ['cart.html', 'review.html', 'your-journey.html']) assert.match(src(f), /totalWords\(\)/, f + ' total');
  assert.equal(w.SIYL_BAG.totalWords(), 'USD 0');
  assert.match(src('assets/highlight.js'), /function money\(n\) \{ if \(n == null/);
});

test('NO PARTIAL TOTAL IS SENT · Review & Send is refused while a selected line has no amount, and while this page has not had the server\'s answer', async () => {
  const w = page({ auth: PEGGY, billing: 'pending', modules: CORE.concat(['assets/draft.js']) });
  const B = w.SIYL_BAG, P = w.SIYL_PRICE, D = w.SIYL_DRAFT;
  P.items('train').forEach((it) => B.put(it));
  let r = await D.send({});
  assert.equal(r.ok, false); assert.equal(r.error, 'prices pending'); assert.equal(r.message, 'Prices are still being confirmed — please try again in a moment.');
  /* a stored line with an amount from an earlier visit still waits for THIS page's answer */
  const w2 = page({ auth: PEGGY, billing: 'pending', modules: CORE.concat(['assets/draft.js']), seed: { 'siyl.bag': [{ id: 'train', name: 'Special Express No. 25', price: 100, qty: 1 }] } });
  assert.equal(w2.SIYL_BAG.pricePending(), false); assert.equal(w2.SIYL_BAG.pending(), true);
  assert.equal((await w2.SIYL_DRAFT.send({})).error, 'prices pending');
  /* the answer arrives: nothing is pending any more */
  w.__billingAnswer('ready'); assert.equal(B.pending(), false);
  assert.match(src('review.html'), /if\(e==='prices pending'\)\{err\.textContent=r\.message\|\|'Prices are still being confirmed — please try again in a moment\.';return\}/);
});

test('THE SERVER\'S AMOUNT WINS · a product it prices takes its amount on the line, the basis and every surface; the catalogue\'s number stands only where it states none', () => {
  const w = page({ auth: PEGGY, quotes: { train: { total: 123, block: 'A', rateSource: 'STANDARD_RATE', hosted: false }, 'wedstay/heritage': { total: 999, block: 'A', rateSource: 'STANDARD_RATE', hosted: false } },
    seed: { 'siyl.gifts': { guestId: PEGGY.guestId, gifts: [{ window: 'wedstay', room: 'heritage', by: 'bride-groom' }], at: Date.now() } } });
  const P = w.SIYL_PRICE;
  assert.equal(P.FLAT.train.price, 100, 'the catalogue still says 100');
  assert.equal(P.items('train')[0].price, 123); assert.equal(P.quote('train').total, 123); assert.equal(P.flatPrice('train'), 123);
  assert.match(P.lineBasis(P.items('train')[0]), /^USD 123 per person · /); assert.doesNotMatch(P.lineBasis(P.items('train')[0]), /USD 100/);
  const q = P.quote('wedstay', 'heritage');
  assert.equal(q.total, 999, 'the server\'s standard amount'); assert.equal(q.gift, undefined, 'a gift this browser once held never changes a server amount');
  assert.equal(P.items('wedstay', 'heritage')[0].price, 999);
  /* block B — the guest books / pays it themselves: the server states no figure, the catalogue's is the informational amount */
  assert.equal(P.quote('kmg', 'jinri-terrace-double').total, 54.5); assert.equal(P.items('mu9646')[0].price, 167.5);
  /* a product outside the server's catalogue keeps the catalogue's own price */
  assert.equal(P.items('suhring')[0].price, 294);
});

test('A NAMED SPECIAL RATE · the server\'s SPECIAL_RATE of USD 0 is the Bride & Groom\'s gift; any other is the guest\'s own rate — the amount always the server\'s', () => {
  const gift = page({ auth: PEGGY, quotes: { 'wedstay/heritage': { total: 0, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false } } });
  const g = gift.SIYL_PRICE.quote('wedstay', 'heritage');
  assert.equal(g.total, 0); assert.equal(g.gift, 'bride-groom'); assert.equal(g.amount, 'Complimentary'); assert.equal(g.hotelTotal, 145);
  const own = page({ auth: PEGGY, quotes: { 'prewed/heritage-executive': { total: 130, block: 'A', rateSource: 'SPECIAL_RATE', hosted: false } } });
  const o = own.SIYL_PRICE.quote('prewed', 'heritage-executive');
  assert.equal(o.total, 130); assert.equal(o.personal, 'special'); assert.equal(o.hotelTotal, 260);
});

test('THE QUOTES FOLLOW THE SESSION · the real client: a late answer for a guest who left is dropped; a sign-out clears; another guest is asked for anew', async () => {
  const calls = [];
  const fetch = (url, init) => new Promise((resolve) => { calls.push({ url: String(url), bearer: init && init.headers && init.headers['x-siyl-auth'], resolve }); });
  const answer = (c, quotes) => c.resolve({ ok: true, json: async () => ({ ok: true, quotes }) });
  const w = page({ auth: PEGGY, fetch, modules: ['assets/billing-client.js'] });
  const BL = w.SIYL_BILLING, events = [];
  ['siyl:billing-ready', 'siyl:billing-failed', 'siyl:billing-cleared'].forEach((t) => w.document.addEventListener(t, () => events.push(t)));
  assert.equal(calls.length, 1); assert.equal(calls[0].url, '/api/billing/catalogue'); assert.equal(calls[0].bearer, PEGGY.bearer);
  assert.equal(BL.ready(), false); assert.equal(BL.failed(), false, 'pending, not failed');
  /* Peggy leaves and Steffie signs in before Peggy's answer arrives */
  w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE));
  w.document.dispatchEvent(new w.CustomEvent('siyl:auth'));
  assert.equal(calls.length, 2); assert.equal(calls[1].bearer, STEFFIE.bearer, 'asked for the guest signed in now');
  answer(calls[0], { train: { total: 1, block: 'A' } }); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  assert.equal(BL.ready(), false, 'Peggy\'s late answer is dropped'); assert.equal(BL.quoteFor('train'), null);
  answer(calls[1], { train: { total: 2, block: 'A' } }); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  assert.equal(BL.ready(), true); assert.equal(BL.quoteFor('train').total, 2, 'Steffie\'s own'); assert.deepEqual(events, ['siyl:billing-ready']);
  /* the same guest is not asked twice */
  w.document.dispatchEvent(new w.CustomEvent('siyl:auth')); assert.equal(calls.length, 2);
  /* sign-out: nothing of hers stays */
  w.localStorage.removeItem('siyl.auth'); w.document.dispatchEvent(new w.CustomEvent('siyl:signout'));
  assert.equal(BL.ready(), false); assert.equal(BL.quoteFor('train'), null); assert.equal(BL.failed(), true, 'nobody signed in: unavailable'); assert.equal(events[events.length - 1], 'siyl:billing-cleared');
  /* even without the event, a quote never answers for a guest who is not the one signed in */
  w.localStorage.setItem('siyl.auth', JSON.stringify(PEGGY)); w.document.dispatchEvent(new w.CustomEvent('siyl:auth'));
  answer(calls[2], { train: { total: 3, block: 'A' } }); await new Promise((r) => setImmediate(r)); await new Promise((r) => setImmediate(r));
  assert.equal(BL.quoteFor('train').total, 3);
  w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE));
  assert.equal(BL.quoteFor('train'), null, 'Peggy\'s quotes are not Steffie\'s'); assert.equal(BL.ready(), false);
  /* a refused answer is asked again a bounded number of times (Owner, 6 Oct 2026 · quota): "pending" meanwhile, never an
     amount; only after the retries it is "unavailable" */
  w.document.dispatchEvent(new w.CustomEvent('siyl:auth'));
  const refuse = async (c) => { c.resolve({ ok: false, status: 503, json: async () => ({ ok: false }) }); for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
  await refuse(calls[3]);
  assert.equal(calls.length, 5, 'asked again'); assert.equal(BL.failed(), false, 'still pending'); assert.equal(BL.ready(), false);
  await refuse(calls[4]); await refuse(calls[5]);
  assert.equal(calls.length, 7); assert.equal(BL.failed(), false);
  await refuse(calls[6]);
  assert.equal(calls.length, 7, 'the retries are bounded');
  assert.equal(BL.ready(), false); assert.equal(BL.failed(), true); assert.equal(events[events.length - 1], 'siyl:billing-failed');
  assert.doesNotMatch(src('assets/billing-client.js'), /localStorage\.setItem/, 'the quotes are never stored on the device');
});

test('NO AMOUNT IS NO AMOUNT (Codex round 2) · a server answer without an amount replaces an earlier price, and a line without one is named beside the total — never a silent USD 0', async () => {
  const rooms = new Rooms(doState());
  const w = await livePage(PEGGY, rooms, { billing: 'pending' });
  const P = w.SIYL_PRICE, B = w.SIYL_BAG, ST = w.SIYL_STAY;
  await ST.select('wedstay', 'heritage');
  P.items('train').forEach((it) => B.put(it));
  /* an amount the guest saw earlier, still on the lines */
  B.set(B.get().map((x) => ({ ...x, price: x.id === 'train' ? 100 : 145, pricePending: undefined })));
  w.__billing.quotes['wedstay/heritage'] = { total: null, block: 'A', rateSource: null, hosted: false, manualReview: 'review' };
  w.__billing.quotes.train = { total: null, block: 'A', rateSource: null, hosted: false, manualReview: 'review' };
  w.__billingAnswer('ready');
  assert.deepEqual(plain(B.get().map((x) => [x.id, x.price, !!x.priceOnRequest, !!x.pricePending])), [['wedstay', null, true, false], ['train', null, true, false]]);
  assert.equal(B.total(), 0);
  assert.equal(B.onRequest(), true);
  assert.match(B.totalWords(), /\+ amount on request$/);
  assert.equal(ST.line('wedstay').interest, undefined, 'still a selection, never an interest');
  /* a line added after the answer: the same words */
  B.remove('train'); P.items('train').forEach((it) => B.put(it));
  assert.equal(B.get().find((x) => x.id === 'train').priceOnRequest, true);
  assert.match(B.totalWords(), /amount on request/);
});

/* ======================================================= the browser's held copy (Owner, 6 Oct 2026) */

const ticks = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

test('HELD COPY · a few minutes, this guest only: shown at once on the next page, never read by another guest, gone on sign-out, expiry or guest change', async () => {
  const session = new Map();
  const calls = [];
  const fetch = (url, init) => new Promise((resolve) => { calls.push({ url: String(url), bearer: init && init.headers && init.headers['x-siyl-auth'], resolve }); });
  const answer = (c, quotes) => c.resolve({ ok: true, json: async () => ({ ok: true, quotes }) });
  const mods = ['assets/billing-client.js'];
  const w1 = page({ auth: PEGGY, fetch, session, modules: mods });
  answer(calls[0], { train: { total: 100, block: 'A' } }); await ticks();
  assert.equal(w1.SIYL_BILLING.live(), true);
  const held = session.get('siyl.billing.quotes');
  assert.ok(held, 'held for the next page of this tab');
  assert.ok(!held.includes(PEGGY.bearer), 'the bearer itself is never copied');
  assert.deepEqual(JSON.parse(held).quotes, { train: { total: 100, block: 'A' } });
  /* the next page of the same guest: the amounts at once, while the server is asked again — held, not live */
  const w2 = page({ auth: PEGGY, fetch, session, modules: mods });
  assert.equal(calls.length, 2, 'the server is still asked');
  assert.equal(w2.SIYL_BILLING.ready(), true); assert.equal(w2.SIYL_BILLING.quoteFor('train').total, 100); assert.equal(w2.SIYL_BILLING.live(), false);
  /* another guest on this tab: Peggy's copy is never read — and it is removed */
  const w3 = page({ auth: STEFFIE, fetch, session, modules: mods });
  assert.equal(w3.SIYL_BILLING.ready(), false); assert.equal(w3.SIYL_BILLING.quoteFor('train'), null);
  assert.equal(session.has('siyl.billing.quotes'), false);
  /* a guest change inside one page drops everything of the previous guest */
  answer(calls[2], { train: { total: 2, block: 'A' } }); await ticks();
  assert.ok(session.has('siyl.billing.quotes'));
  w3.localStorage.setItem('siyl.auth', JSON.stringify(PEGGY)); w3.document.dispatchEvent(new w3.CustomEvent('siyl:auth'));
  assert.equal(w3.SIYL_BILLING.quoteFor('train'), null, 'Steffie\'s amounts are not Peggy\'s'); assert.equal(session.has('siyl.billing.quotes'), false);
  /* sign-out: nothing stays — not on the page, not in the held copy */
  answer(calls[calls.length - 1], { train: { total: 3, block: 'A' } }); await ticks();
  assert.ok(session.has('siyl.billing.quotes'));
  w3.localStorage.removeItem('siyl.auth'); w3.document.dispatchEvent(new w3.CustomEvent('siyl:signout'));
  assert.equal(session.has('siyl.billing.quotes'), false); assert.equal(w3.SIYL_BILLING.ready(), false);
  /* an expired copy is never shown */
  answer((page({ auth: PEGGY, fetch, session, modules: mods }), calls[calls.length - 1]), { train: { total: 4, block: 'A' } }); await ticks();
  const e = JSON.parse(session.get('siyl.billing.quotes')); e.at = Date.now() - 6 * 60 * 1000; session.set('siyl.billing.quotes', JSON.stringify(e));
  const w5 = page({ auth: PEGGY, fetch, session, modules: mods });
  assert.equal(w5.SIYL_BILLING.ready(), false, 'expired: asked, not shown'); assert.equal(session.has('siyl.billing.quotes'), false);
});

test('REVIEW & SEND NEVER SENDS ON THE HELD COPY · the server checks the lines against its fresh source first: no answer → refused, a difference → refused and re-priced, agreement → the send goes on', async () => {
  const session = new Map();
  const seen = [];
  let mode = 'down';
  const fetch = (url, init) => {
    const u = String(url); seen.push({ u, method: (init && init.method) || 'GET', body: init && init.body });
    if (u === '/api/billing/catalogue') return new Promise(() => {});   /* the server's live answer never comes on this page */
    if (u === '/api/billing/validate') {
      if (mode === 'down') return Promise.resolve({ ok: false, status: 503, json: async () => ({ ok: false, error: 'the financial source is unavailable' }) });
      if (mode === 'changed') return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, valid: false, mismatches: [{ key: 'train', sent: 100, server: 120 }], quotes: { train: { total: 120, block: 'A', rateSource: 'STANDARD_RATE', hosted: false } } }) });
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true, valid: true, mismatches: [], quotes: {} }) });
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => ({ ok: true }) });
  };
  /* this guest's copy held from an earlier page of the tab */
  session.set('siyl.billing.quotes', JSON.stringify({ owner: null, at: Date.now(), quotes: {} }));
  const seed = page({ auth: PEGGY, session, modules: ['assets/billing-client.js'], fetch: (u) => (String(u) === '/api/billing/catalogue'
    ? Promise.resolve({ ok: true, json: async () => ({ ok: true, quotes: { train: { total: 100, block: 'A', rateSource: 'STANDARD_RATE', hosted: false } } }) })
    : Promise.resolve({ ok: true, json: async () => ({ ok: true }) })) });
  await ticks(); assert.equal(seed.SIYL_BILLING.live(), true);
  const w = page({ auth: PEGGY, session, fetch, modules: ['assets/billing-client.js'].concat(CORE, ['assets/draft.js']) });
  const B = w.SIYL_BAG, P = w.SIYL_PRICE, D = w.SIYL_DRAFT;
  assert.equal(w.SIYL_BILLING.ready(), true, 'amounts on show from the held copy'); assert.equal(w.SIYL_BILLING.live(), false);
  P.items('train').forEach((it) => B.put(it));
  assert.equal(B.get()[0].price, 100); assert.equal(B.pending(), false, 'nothing looks pending on the page');
  const sent = () => seen.filter((x) => x.u === '/api/register').length;
  /* the send's own save (reason 'send') — autosaves of the Bag change do not count */
  const flushed = () => seen.filter((x) => x.u === '/api/draft' && x.method === 'PUT' && /"reason":"send"/.test(x.body || '')).length;
  /* the server cannot answer: not sent */
  let r = await D.send({});
  assert.equal(r.ok, false); assert.equal(r.error, 'prices pending'); assert.equal(sent(), 0); assert.equal(flushed(), 0);
  const v = seen.filter((x) => x.u === '/api/billing/validate');
  assert.equal(v.length, 1); assert.deepEqual(JSON.parse(v[0].body).selections.map((x) => [x.id, x.price]), [['train', 100]], 'the lines about to be sent are checked');
  /* the fresh source prices it differently: not sent, and the Bag takes the server's amount */
  mode = 'changed';
  r = await D.send({});
  assert.equal(r.error, 'prices changed'); assert.equal(r.message, 'Some prices have been updated — please review your trip before sending.');
  assert.equal(sent(), 0); assert.equal(B.get()[0].price, 120, 're-priced at once');
  /* agreement: the send goes on to saving and sending */
  mode = 'ok';
  r = await D.send({});
  assert.notEqual(r.error, 'prices pending'); assert.notEqual(r.error, 'prices changed');
  assert.equal(flushed(), 1, 'the send went on');
  assert.match(src('review.html'), /if\(e==='prices changed'\)/);
});
