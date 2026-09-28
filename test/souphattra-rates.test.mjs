/* THE SOUPHATTRA RATE CORRECTION — see below */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, doState, page, PEGGY } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const TEXT = 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G777 · Sam';
const REG = (email, extra) => ({ channel: 'journey-shop', guestId: 'G777', partyId: 'INV-777', selections: [{ id: 'train', name: 'Special Express No. 25', price: 100 }], totalUsd: 100, contact: { email, phone: '+66 81 000 0000' },
  guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }], contact: { email, phone: '+66 81 000 0000' } }, seats: null, rooms: null, registration_submitted_at: '2026-09-16T10:00:00.000Z', ...(extra || {}) });
/* step 01's required personal details (Owner, 24 Sep 2026) — obviously synthetic */
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
const GUEST = (answers) => JSON.stringify({ contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, guests: { G777: { submitted: {}, profile: answers, history: [{ at: 'x' }] } }, history: [{ at: 'y' }] });

async function harness() {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-sam'), other = await bearerOf('demo-other');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' }; entries[await authIdOf(other)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' };
  const store = kv(); const calls = [];
  const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const u = String(url); if (/api\.brevo\.com/.test(u)) { const body = JSON.parse(init.body); calls.push({ body }); return new Response(JSON.stringify({ messageId: '<msg-' + calls.length + '@brevo>' }), { status: 201, headers: { 'content-type': 'application/json' } }); } return realFetch(url, init); };
  return { w, env, store, calls, sam, other, rooms, done: () => { globalThis.fetch = realFetch; } };
}


/* THE SOUPHATTRA RATE CORRECTION (Owner, 27 Sep 2026): the pre-wedding stay (Package C, 25 → 27 February) had shown the Wedding
   Stay's rates. The live Operations Master's two periods — every category, per person and per room, per night — are the site's
   now; a trip sent before the correction still reads as sent when only the corrected rate differs, and a real change still counts. */
const PAIRS = {
  prewed:  { heritage: [112.5, 225], 'heritage-executive': [130, 260], 'heritage-grand-premier': [162.5, 325], 'noble-courtyard': [247.5, 495], 'grand-majestic': [345, 690], 'souphattra-majestic': [385, 770], 'souphattra-presidential': [1095, 2190] },
  wedstay: { heritage: [145, 290], 'heritage-executive': [155, 310], 'heritage-grand-premier': [170, 340], 'noble-courtyard': [195, 390], 'grand-majestic': [250, 500], 'souphattra-majestic': [200, 400], 'souphattra-presidential': [750, 1500] }
};

test('THE FOURTEEN PAIRS · the data, the quote and the Details words of every category in both periods; dates 25 – 27 February (C) and 27 February – 1 March (D1); the second wedding night stays complimentary', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, S = w.SIYL_ROOMS.souphattra;
  assert.deepEqual(JSON.parse(JSON.stringify(S.windows.map((x) => [x.id, x.dates, x.n, x.pay]))), [['prewed', '25 – 27 February 2027', 2, 2], ['wedstay', '27 February – 1 March 2027', 2, 1]]);
  for (const [win, map] of Object.entries(PAIRS)) for (const [slug, [pp, room]] of Object.entries(map)) {
    const r = S.rooms.find((x) => x.slug === slug);
    assert.equal(r.rates[win], pp, win + '/' + slug); assert.equal(r.roomRates[win], room, win + '/' + slug + ' room');
    /* the live 002 (28 Sep 2026 · G21 / H21 / I21 "pre wedding, not available"): three suites are offered for the Wedding Stay only —
       their pre-wedding figure is never quoted, never a Bag line */
    if (r.notIn && r.notIn.includes(win)) { assert.equal(P.offeredIn(win, r), false, win + '/' + slug + ' not offered'); assert.equal(P.items(win, slug).length, 0, 'never a Bag line'); assert.equal(P.known({ id: win, room: slug }), false); continue; }
    const q = P.quote(win, slug);
    assert.equal(q.rate, pp); assert.equal(q.roomRate, room); assert.equal(q.total, win === 'prewed' ? pp * 2 : pp);
    assert.equal(q.roomNightly, P.money(room) + ' per room per night');
    const line = P.items(win, slug)[0]; assert.equal(line.rate, pp); assert.equal(line.price, q.total, 'the Bag line carries the period\'s amount');
    if (win === 'wedstay') assert.match(q.contribution, /second night complimentary, hosted by Haruthai & Suthep$/);
  }
  assert.equal(P.money(112.5), 'USD 112.50'); assert.equal(P.money(162.5), 'USD 162.50'); assert.equal(P.money(247.5), 'USD 247.50');
});

test('THE NOTICE · once per browser (a versioned key), never a server write, no checkbox, the one button to the Souphattra pre-wedding rates; Thai authored', () => {
  const js = readFileSync(new URL('../assets/rate-notice.js', import.meta.url), 'utf8');
  assert.match(js, /var VERSION = 'souphattra-rate-correction-2026-09-27';/); assert.match(js, /var KEY = 'siyl\.notice\.' \+ VERSION;/);
  assert.doesNotMatch(js.replace(/\/\*[\s\S]*?\*\//g, ''), /fetch\(|XMLHttpRequest|sendBeacon|SIYL_DRAFT\.(touch|flush|push)|type="checkbox"/, 'no request, no draft write, no checkbox');
  assert.match(js, /var TARGET = 'journeys\.html#j-prewed';/);
  for (const t of ['An important update about Souphattra Heritage', 'We recently identified incorrect rates in our system for Souphattra Heritage stays from 25–27 February 2027.', 'The rates have now been corrected, and the prices currently shown on the website are the correct rates.', 'If you reviewed or planned your stay earlier, please take a moment to check the updated prices before continuing.', 'Your existing room selection has not been changed.', 'We apologise for the confusion and thank you for your understanding.', 'View corrected rates', 'Rate correction']) {
    assert.ok(js.includes(t), t); assert.ok(JSON.parse(readFileSync(new URL('../src/i18n-th.json', import.meta.url), 'utf8')).exact[t], 'Thai: ' + t);
  }
  const th = JSON.parse(readFileSync(new URL('../src/i18n-th.json', import.meta.url), 'utf8')).exact;
  assert.doesNotMatch(Object.entries(th).filter(([k]) => /Souphattra Heritage stays from 25–27/.test(k)).map(([, v]) => v).join(''), /โรงแรม.*ผิดพลาด/, 'the error is ours, never the hotel\'s');
  for (const f of ['journeys.html', 'your-journey.html', 'room.html', 'cart.html', 'review.html', 'profile.html']) assert.match(readFileSync(new URL('../' + f, import.meta.url), 'utf8'), /<script src="assets\/rate-notice\.js\?v=[0-9a-f]+"><\/script>/, f);
});

test('THE NOTICE (the shipped page) · shown to a signed-in guest once the draft is read; the button remembers it in this browser and opens the pre-wedding rates; a second visit shows nothing', async () => {
  const w = page({ auth: PEGGY, modules: ['assets/rate-notice.js'] });
  const N = w.SIYL_RATE_NOTICE; assert.ok(N);
  assert.equal(N.concerned({ scope: { none: true } }), false); assert.equal(N.concerned({ scope: { vientiane: false, bangkok: true } }), false); assert.equal(N.concerned({}), true); assert.equal(N.concerned({ scope: { vientiane: true } }), true);
  assert.match(N.html(), /data-rate-go/); assert.doesNotMatch(N.html(), /checkbox/);
});

async function send(h, keys) {
  const cur = await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }), h.env)).json();
  await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'), h.env);
}
const state = async (h) => (await (await h.w.fetch(req('/api/draft', { 'x-siyl-auth': h.sam }), h.env)).json()).submission;
const line = (slug, rate, extra) => ({ id: 'prewed', name: 'Pre-Wedding Stay · Souphattra Heritage', meta: '25 – 27 February 2027 · The Heritage', price: rate * 2, stay: 'souphattra', room: slug, rate, nights: 2, pay: 2, qty: 1, ...(extra || {}) });

test('NO FALSE CHANGE · a trip sent before the correction (its Bag at the former rate) reads SENT once the website corrects the amount; a new room, or a new quantity, still reads CHANGES NOT SENT; a trip sent after it compares selections', async () => {
  const h = await harness();
  try {
    await h.store.put('contact:INV-G777', JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', email: 'sam.example@example.org', phone: '+66 81 000 0000', ...STEP01, at: '2026-09-16T09:00:00.000Z' }));
    const guest = GUEST({ coffeetea: 'Oolong' });
    await send(h, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, line('heritage', 145)]) });
    const r1 = await h.w.fetch(req('/api/register', { 'x-siyl-auth': h.sam }, { invitationId: 'INV-G777', registration: complete(REG('sam.example@example.org')), text: TEXT }), h.env);
    assert.equal(r1.status, 202);
    /* the record as a trip sent BEFORE this release kept it: the content fingerprint alone */
    const rec = JSON.parse(h.store.m.get('reg:INV-G777').v); delete rec.selectionFingerprint; rec.fingerprintVersion = 2; h.store.m.set('reg:INV-G777', { v: JSON.stringify(rec) });
    assert.equal((await state(h)).submissionStatus, 'sent');
    /* the page re-prices the line at Package C: the website's correction, not the guest's */
    await send(h, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, line('heritage', 112.5)]) });
    let s = await state(h); assert.equal(s.submissionStatus, 'sent', 'a corrected rate is not a change'); assert.equal(s.hasUnsentChanges, false);
    assert.ok(JSON.parse(h.store.m.get('reg:INV-G777').v).selectionFingerprint, 'from now on the trip compares selections');
    /* a real change still counts */
    await send(h, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, line('heritage-executive', 130)]) });
    s = await state(h); assert.equal(s.submissionStatus, 'changes-not-sent', 'another room is a change'); assert.equal(s.hasUnsentChanges, true);
    await send(h, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 1 }, line('heritage', 112.5)]) });
    assert.equal((await state(h)).submissionStatus, 'sent', 'undone: sent again');
    await send(h, { 'siyl.guest': guest, 'siyl.bag': JSON.stringify([{ id: 'train', price: 100, qty: 2 }, line('heritage', 112.5)]) });
    assert.equal((await state(h)).submissionStatus, 'changes-not-sent', 'a quantity is a change');
  } finally { h.done(); }
});

test('NO FALSE CHANGE ON THE PAGE · a sent line and its corrected twin are the same selection (the room, not its amount)', () => {
  const js = readFileSync(new URL('../assets/draft.js', import.meta.url), 'utf8');
  const m = js.match(/var LINE_FIELDS = (\[[^\]]+\]);/); assert.ok(m);
  const fields = JSON.parse(m[1].replace(/'/g, '"'));
  assert.ok(!fields.includes('price') && !fields.includes('rate'), 'an amount is not a selection'); for (const k of ['id', 'room', 'qty', 'cls', 'menu', 'nights']) assert.ok(fields.includes(k), k);
});
