/* THE BRIDE & GROOM'S HOSPITALITY (Owner, 28 Sep 2026 · src/gifts.js): one guest's charge for one room of one stay. The mechanism is
   proven on a seeded entitlement (The Heritage in D1, "Complimentary · from the Bride & Groom"); the list itself is the live
   002_Accommodation_Details (28 Sep 2026) — see test/accommodation-muse.test.mjs for its special and employee rates.
   The hotel's rate stays the rate, the room is held and counted like any other, another room is priced as usual, the party mate
   and every other guest pay as before, and who pays is never a change of the guest's trip. Synthetic guests only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, doState, page, PEGGY } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';
import { GIFTS, giftsFor, isGift, verifiedLines } from '../src/gifts.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const plain = (x) => JSON.parse(JSON.stringify(x));
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
const GUEST = (gid, answers) => JSON.stringify({ contact: { email: 'gift.example@example.org', phone: '+66 81 000 0000' }, guests: { [gid]: { submitted: {}, profile: answers, history: [{ at: 'x' }] } }, history: [{ at: 'y' }] });
const TEXT = (inv) => 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: ' + inv;
const REG = (gid, party, sel) => ({ channel: 'journey-shop', guestId: gid, partyId: party, selections: sel, totalUsd: sel.reduce((t, x) => t + (x.price || 0), 0), contact: { email: 'gift.example@example.org', phone: '+66 81 000 0000' },
  guestRecord: { guests: [{ guestId: gid, name: 'Guest', source: { fullName: 'Guest Example', preferredName: 'Guest' } }], contact: { email: 'gift.example@example.org', phone: '+66 81 000 0000' } }, seats: null, rooms: null, registration_submitted_at: '2026-09-28T10:00:00.000Z' });
const heritage = (price, extra) => ({ id: 'wedstay', name: 'Souphattra Heritage', meta: '27 February – 1 March 2027 · The Heritage', price, stay: 'souphattra', room: 'heritage', rate: 145, nights: 2, pay: 1, qty: 1, ...(extra || {}) });

/* the entitled person and their party mate, synthetic invitations carrying the register's person ids */
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const giftee = await bearerOf('demo-giftee'), mate = await bearerOf('demo-mate'), other = await bearerOf('demo-other');
  const entries = {};
  entries[await authIdOf(giftee)] = { i: 'INV-G901', g: 'G901', p: 'INV-901', c: 'CON005', k: 'COUPL901' };
  entries[await authIdOf(mate)] = { i: 'INV-G902', g: 'G902', p: 'INV-901', c: 'CON006', k: 'COUPL901' };
  entries[await authIdOf(other)] = { i: 'INV-G903', g: 'G903', p: 'INV-903', c: 'CON903', k: 'SIGL' };
  const store = kv(); const calls = [];
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const u = String(url); if (/api\.brevo\.com/.test(u)) { calls.push(JSON.parse(init.body)); return new Response(JSON.stringify({ messageId: '<m@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  return { w, env, store, calls, giftee, mate, other, done: () => { globalThis.fetch = realFetch; } };
}
async function putDraft(h, bearer, inv, keys) {
  const cur = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': bearer }), h.env)).json();
  await h.w.fetch(req('/api/draft', { 'x-siyl-auth': bearer }, { invitationId: inv, keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'), h.env);
}
const stateOf = async (h, bearer) => (await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': bearer }), h.env)).json()).submission;

test('THE LIST · one person (the register id, never a name), one window, one room — the live 002 (28 Sep 2026); the party mate holds nothing', () => {
  assert.deepEqual(plain(GIFTS), [
    { contactId: 'CON005', window: 'prewed', room: 'heritage-executive', kind: 'special', charge: 225 },
    { contactId: 'CON010', window: 'prewed', room: 'heritage-executive', kind: 'special', charge: 225 },
    { contactId: 'CON005', window: 'wedstay', room: 'heritage-executive', kind: 'gift', charge: 0, by: 'bride-groom' },
    { contactId: 'CON010', window: 'wedstay', room: 'heritage-executive', kind: 'gift', charge: 0, by: 'bride-groom' },
    { contactId: 'CON005', window: 'kempinski', room: 'jatu-room', kind: 'employee', charge: 232, per: 'room' },
    { contactId: 'CON001', window: 'prewed', room: 'souphattra-presidential', kind: 'special', charge: 150 },
    { contactId: 'CON002', window: 'prewed', room: 'souphattra-presidential', kind: 'special', charge: 150 },
    { contactId: 'CON001', window: 'wedstay', room: 'souphattra-presidential', kind: 'special', charge: 150, nights: 'both' },
    { contactId: 'CON002', window: 'wedstay', room: 'souphattra-presidential', kind: 'special', charge: 150, nights: 'both' }]);
  assert.deepEqual(giftsFor('CON005'), [
    { window: 'prewed', room: 'heritage-executive', kind: 'special', charge: 225 },
    { window: 'wedstay', room: 'heritage-executive', kind: 'gift', charge: 0, by: 'bride-groom' },
    { window: 'kempinski', room: 'jatu-room', kind: 'employee', charge: 232, per: 'room' }]);
  assert.deepEqual(giftsFor('CON010'), [
    { window: 'prewed', room: 'heritage-executive', kind: 'special', charge: 225 },
    { window: 'wedstay', room: 'heritage-executive', kind: 'gift', charge: 0, by: 'bride-groom' }], 'the employee rate is one person\'s alone');
  assert.deepEqual(giftsFor('CON006'), [], 'the party mate'); assert.deepEqual(giftsFor(''), []); assert.deepEqual(giftsFor(null), []);
  const g = giftsFor('CON005'), he = (id) => ({ ...heritage(0), id, room: 'heritage-executive' });
  assert.equal(isGift(g, he('wedstay')), true); assert.equal(isGift(g, heritage(0)), false, 'The Heritage is not the entitled room'); assert.equal(isGift(g, he('prewed')), false, 'a special rate is not a gift');
  /* the public source names nobody: an entry is the register's opaque person id, a window, a room, its kind and charge — nothing else */
  for (const g of GIFTS) {
    for (const k of Object.keys(g)) assert.ok(['contactId', 'window', 'room', 'kind', 'charge', 'by', 'per', 'nights'].includes(k), k);
    assert.match(g.contactId, /^CON\d{3}$/); assert.ok(['gift', 'special', 'employee'].includes(g.kind)); assert.equal(typeof g.charge, 'number');
  }
});

test('THE HOTEL RATE STAYS · The Heritage in D1 is USD 145 per person · USD 290 per room; the second night stays the couple\'s; the room engine never reads a gift', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, r = w.SIYL_ROOMS.souphattra.rooms.find((x) => x.slug === 'heritage');
  assert.equal(r.rates.wedstay, 145); assert.equal(r.roomRates.wedstay, 290);
  const q = P.quote('wedstay', 'heritage'); assert.equal(q.total, 145); assert.equal(q.gift, undefined); assert.match(q.contribution, /second night complimentary, hosted by Haruthai & Suthep$/);
  for (const f of ['src/rooms.js', 'src/inventory.js', 'src/seating.js', 'src/stage-graph.js']) assert.doesNotMatch(src(f), /gifts|\bgift\b/, f + ' knows nothing of who pays');
});

test('A · THE GUEST WITH THE GIFT · The Heritage in D1: USD 0, "Complimentary · from the Bride & Groom", the hotel rate beneath as a fact; the Bag line and the Bag total carry nothing for it', () => {
  const me = { ...PEGGY, guestId: 'G901' };
  const w = page({ auth: me, seed: { 'siyl.gifts': { guestId: 'G901', gifts: [{ window: 'wedstay', room: 'heritage', by: 'bride-groom' }], at: Date.now() }, 'siyl.bag': [{ id: 'train', price: 100, qty: 1 }, heritage(145)] } });
  const P = w.SIYL_PRICE, q = P.quote('wedstay', 'heritage');
  assert.equal(q.total, 0); assert.equal(q.gift, 'bride-groom'); assert.equal(q.hotelTotal, 145); assert.equal(q.rate, 145); assert.equal(q.roomRate, 290);
  assert.equal(q.amount, 'Complimentary'); assert.equal(q.giftBy, 'from the Bride & Groom');
  assert.equal(q.contribution, 'USD 145 per person per night · the hotel rate, not charged to you');
  const line = P.items('wedstay', 'heritage')[0]; assert.equal(line.price, 0); assert.equal(line.gift, 'bride-groom'); assert.equal(line.rate, 145); assert.equal(line.room, 'heritage');
  /* the saved line (USD 145) is re-derived on load: the same room, nothing to pay */
  const bag = plain(w.SIYL_BAG.get()); const st = bag.find((x) => x.id === 'wedstay');
  assert.equal(st.price, 0); assert.equal(st.gift, 'bride-groom'); assert.equal(st.room, 'heritage'); assert.equal(st.stay, 'souphattra');
  assert.equal(w.SIYL_BAG.total(), 100, 'the Bag total: the train alone — not a cent for the stay');
  assert.equal(w.SIYL_JOURNEY ? w.SIYL_JOURNEY.quantityLine(st) : 'Complimentary · from the Bride & Groom', 'Complimentary · from the Bride & Groom');
});

test('B · THE GIFT DOES NOT FOLLOW A ROOM CHANGE · Heritage Executive in D1, and The Heritage before the wedding (C), are priced as usual for the same guest', () => {
  const me = { ...PEGGY, guestId: 'G901' };
  const w = page({ auth: me, seed: { 'siyl.gifts': { guestId: 'G901', gifts: [{ window: 'wedstay', room: 'heritage', by: 'bride-groom' }], at: Date.now() }, 'siyl.bag': [heritage(0, { gift: 'bride-groom', room: 'heritage-executive', meta: '27 February – 1 March 2027 · Heritage Executive' })] } });
  const P = w.SIYL_PRICE;
  const q = P.quote('wedstay', 'heritage-executive'); assert.equal(q.total, 155); assert.equal(q.gift, undefined);
  assert.equal(P.quote('prewed', 'heritage').total, 225); assert.equal(P.quote('prewed', 'heritage').gift, undefined);
  const st = plain(w.SIYL_BAG.get()).find((x) => x.id === 'wedstay');
  assert.equal(st.price, 155, 'a line that carried the gift into another room is priced again'); assert.equal(st.gift, undefined);
  assert.equal(w.SIYL_BAG.total(), 155);
});

test('C · D · ANY OTHER GUEST — the party mate included — pays the D1 rate for The Heritage, even on a browser that once held another guest\'s gift', () => {
  for (const gid of ['G902', 'g-peggy']) {
    const w = page({ auth: { ...PEGGY, guestId: gid }, seed: { 'siyl.gifts': { guestId: 'G901', gifts: [{ window: 'wedstay', room: 'heritage', by: 'bride-groom' }], at: Date.now() }, 'siyl.bag': [heritage(0, { gift: 'bride-groom' })] } });
    const q = w.SIYL_PRICE.quote('wedstay', 'heritage'); assert.equal(q.total, 145, gid); assert.equal(q.gift, undefined, gid);
    const st = plain(w.SIYL_BAG.get()).find((x) => x.id === 'wedstay'); assert.equal(st.price, 145, gid); assert.equal(st.gift, undefined, gid);
  }
  const out = page({ auth: null }); assert.equal(out.SIYL_PRICE.quote('wedstay', 'heritage').total, 145, 'signed out');
});

test('THE WORKER · GET /api/gifts answers the signed-in guest with their own gift only — the party mate and every other guest with none; signed out 401; nothing is written', async () => {
  const h = await harness();
  try {
    const read = async (b) => (await h.w.fetch(req('/api/gifts', b ? { 'x-siyl-auth': b } : {}), h.env));
    let r = await read(h.giftee); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await r.json(), { ok: true, guestId: 'G901', gifts: giftsFor('CON005') });
    assert.equal(giftsFor('CON005').length, 3);
    assert.deepEqual(await (await read(h.mate)).json(), { ok: true, guestId: 'G902', gifts: [] });
    assert.deepEqual(await (await read(h.other)).json(), { ok: true, guestId: 'G903', gifts: [] });
    assert.equal((await read(null)).status, 401);
    assert.equal((await h.w.fetch(req('/api/gifts', { 'x-siyl-auth': h.giftee }, {}, 'POST'), h.env)).status, 405);
    assert.equal(h.store.m.size, 0, 'nothing written');
  } finally { h.done(); }
});

test('E · F · THE SENT TRIP · the gift is kept only for the guest who holds it (another guest\'s claim is the hotel rate again); a trip sent before the gift still reads SENT when only who pays changed; another room still reads CHANGES NOT SENT', async () => {
  const h = await harness();
  /* the entitled room since the live 002 (28 Sep 2026): Heritage Executive in the Wedding Stay, USD 155 per person at the hotel's rate */
  const hx = (price, extra) => heritage(price, { room: 'heritage-executive', meta: '27 February – 1 March 2027 · Heritage Executive', rate: 155, ...(extra || {}) });
  try {
    for (const [b, inv, gid] of [[h.giftee, 'INV-G901', 'G901'], [h.other, 'INV-G903', 'G903']]) await h.store.put('contact:' + inv, JSON.stringify({ invitationId: inv, guestId: gid, email: 'gift.example@example.org', phone: '+66 81 000 0000', ...STEP01, at: '2026-09-28T09:00:00.000Z' }));
    /* another guest claims a gift they do not hold: the record carries the hotel's rate */
    await putDraft(h, h.other, 'INV-G903', { 'siyl.guest': GUEST('G903', { coffeetea: 'Oolong' }), 'siyl.bag': JSON.stringify([hx(0, { gift: 'bride-groom' })]) });
    let r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.other }, { invitationId: 'INV-G903', registration: complete(REG('G903', 'INV-903', [hx(0, { gift: 'bride-groom' })])), text: TEXT('INV-G903') }), h.env);
    assert.equal(r.status, 202);
    const sel3 = JSON.parse(h.store.m.get('reg:INV-G903').v).registration.selections.find((x) => x.id === 'wedstay');
    assert.equal(sel3.gift, undefined); assert.equal(sel3.price, 155);
    /* the guest who holds it: sent BEFORE the gift, at the hotel's rate */
    const guest = GUEST('G901', { coffeetea: 'Oolong' });
    await putDraft(h, h.giftee, 'INV-G901', { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, hx(155)]) });
    r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.giftee }, { invitationId: 'INV-G901', registration: complete(REG('G901', 'INV-901', [{ id: 'train', price: 100, qty: 1 }, hx(155)])), text: TEXT('INV-G901') }), h.env);
    assert.equal(r.status, 202); assert.equal((await stateOf(h, h.giftee)).submissionStatus, 'sent');
    /* the page re-prices the line as the couple's gift: who pays, not what was chosen */
    await putDraft(h, h.giftee, 'INV-G901', { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, hx(0, { gift: 'bride-groom' })]) });
    assert.equal((await stateOf(h, h.giftee)).submissionStatus, 'sent', 'selection fingerprint: no false change');
    /* the same for a record sent before the selection fingerprint existed */
    const rec = JSON.parse(h.store.m.get('reg:INV-G901').v); delete rec.selectionFingerprint; rec.fingerprintVersion = 2; h.store.m.set('reg:INV-G901', { v: JSON.stringify(rec) });
    assert.equal((await stateOf(h, h.giftee)).submissionStatus, 'sent', 'content fingerprint: no false change either');
    /* a real change still counts */
    await putDraft(h, h.giftee, 'INV-G901', { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, heritage(145)]) });
    assert.equal((await stateOf(h, h.giftee)).submissionStatus, 'changes-not-sent', 'another room is a change');
    /* sent with the gift: the record keeps it, and the email names it */
    await putDraft(h, h.giftee, 'INV-G901', { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, hx(0, { gift: 'bride-groom' })]) });
    r = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.giftee }, { invitationId: 'INV-G901', registration: complete(REG('G901', 'INV-901', [{ id: 'train', price: 100, qty: 1 }, hx(0, { gift: 'bride-groom' })])), text: TEXT('INV-G901') }), h.env);
    assert.equal(r.status, 202);
    const rec2 = JSON.parse(h.store.m.get('reg:INV-G901').v); const sel = rec2.registration.selections.find((x) => x.id === 'wedstay');
    assert.equal(sel.gift, 'bride-groom'); assert.equal(sel.price, 0); assert.equal(rec2.registration.totalUsd, 100);
    const mail = JSON.stringify(h.calls[h.calls.length - 2] || {}) + JSON.stringify(h.calls[h.calls.length - 1] || {});
    assert.match(mail, /Complimentary · from the Bride &(amp;)? Groom/);
  } finally { h.done(); }
});

test('THE PAGES · every place a line or a room shows its amount says the gift instead — the room row, the room page, My Trip, My Bag, Review, My Profile; Thai authored', () => {
  assert.match(src('journeys.html'), /if\(q&&r\.rate!=null&&q\.gift\)\{/);
  assert.match(src('room.html'), /\(q\.gift \? esc\(q\.giftBy\) : q\.personal \? esc\(q\.per\) : 'per person'\)/);
  assert.match(src('your-journey.html'), /x\.complimentary\|\|x\.gift\?'Complimentary'/);
  assert.match(src('cart.html'), /if\(x\.gift\)return '<p class="p-line-amt"><span class="t-l1">Complimentary<\/span><span class="t-l1">from the Bride &amp; Groom<\/span><\/p>'/);
  assert.match(src('review.html'), /if\(x\.gift\)return '<p class="p-line-amt">/);
  assert.match(src('profile.html'), /if\(x\.gift\)return 'Complimentary · from the Bride & Groom'/);
  const th = JSON.parse(src('src/i18n-th.json'));
  assert.equal(th.exact['from the Bride & Groom'], 'บ่าวสาวมอบให้เป็นของขวัญ');
  assert.equal(th.exact['Complimentary · from the Bride & Groom'], 'ไม่มีค่าใช้จ่าย · บ่าวสาวมอบให้เป็นของขวัญ');
  assert.ok(th.templates.some((t) => t.en === '{x} per person per night · the hotel rate, not charged to you'));
});

test('THE FIRST VISIT · a gift that arrives after the page is drawn redraws the rows (The Journey) and rebuilds the room page once', () => {
  assert.match(src('assets/pricing.js'), /document\.dispatchEvent\(new CustomEvent\('siyl:gifts'\)\)/);
  assert.match(src('journeys.html'), /document\.addEventListener\('siyl:gifts',function\(\)\{document\.querySelectorAll\('\[data-rooms\]'\)\.forEach\(function\(box\)\{renderRows\(box,/);
  assert.match(src('room.html'), /document\.addEventListener\('siyl:gifts', function \(\) \{ try \{ if \(sessionStorage\.getItem\('siyl\.gifts\.rebuilt'\)\) return;/);
});
