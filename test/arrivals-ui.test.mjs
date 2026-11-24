/* ============================================================================
   HS-059 · SECTION F IN THE CONSOLE (Owners, 24 Nov 2026) — assets/arrivals-model.js + assets/admin-overview.js +
   assets/admin-billing.js against a fake server whose arrivals answers are formed by the real src/billing/arrivals.js over
   FICTIONAL guests. Nothing reaches a network.
     · the read: after the guest checks, the figures and the programme figures — the base, then the trips in parts of at most
       12, one after the other; once per console visit; only GETs; never retried by itself
     · Section F stands on its own: the programme figures refused (HS-032) and Section F still draws
     · every figure of Section F opens the list of exactly its guests (rows = the number on the figure = the list's own count)
     · names come from the console's guest list and are escaped; a day or a guest opens on a click
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, SUTHEP } from './sandbox.mjs';
import { arrivalsBase, factsOf } from '../src/billing/arrivals.js';

const tick = async (n = 12) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function fakeRoot() {
  let html = '', cache = {};
  const parse = (attr) => {
    const out = []; const re = /<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/gi; let m;
    while ((m = re.exec(html))) { const attrs = {}; m[2].replace(/([a-z-]+)(?:="([^"]*)")?/gi, (x, k, v) => { attrs[k] = v === undefined ? '' : v; return x; });
      if (!(attr in attrs)) continue; out.push({ tag: m[1], attrs, getAttribute: (k) => (k in attrs ? attrs[k] : null), open: 'open' in attrs, focus() {}, setSelectionRange() {}, selectionStart: 0 }); }
    return out;
  };
  return { get innerHTML() { return html; }, set innerHTML(v) { html = String(v); cache = {}; },
    querySelectorAll(sel) { const m = /^\[([a-z-]+)\]$/.exec(sel); if (!m) return []; return cache[sel] || (cache[sel] = parse(m[1])); },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; } };
}
const el = (root, attr, value) => root.querySelectorAll('[' + attr + ']').find((e) => value == null || e.getAttribute(attr) === value);

/* ------------------------------------------------------------ fictional data: 16 guests and the couple */
const N = 16, pad = (n) => String(n).padStart(3, '0');
const GS = Array.from({ length: N }, (_, i) => ({ g: 'G9' + pad(i + 1).slice(1), inv: 'INV-G9' + pad(i + 1).slice(1), name: 'Guest ' + pad(i + 1) }));
GS[3].name = '<img src=x onerror="alert(1)">';
const ALL = [{ g: 'G048', inv: 'INV-G048', name: 'Bride Demo', h: 'B' }, { g: 'G049', inv: 'INV-G049', name: 'Groom Demo', h: 'G' }].concat(GS);
const HOLDERS = ALL.map((x) => ({ Holder_ID: x.inv, guestId: x.g, hosts: !!x.h, name: { full: x.name }, code: 'SECRETCODE' + x.g, settlement: null, payment: null, method: { determined: true } }));
const OVERVIEW = { ok: true, asOf: '2026-11-24', audience: 'GROOM', chunk: 6, gate: { approved: true }, holders: HOLDERS };
const okRows = (url) => { const ids = decodeURIComponent(url.split('ids=')[1]).split(','); return res(200, { ok: true, rows: ids.map((id) => ({ Holder_ID: id, confirmation: { state: 'CONFIRMED' }, booked: { selected: 1 }, elsewhere: [], allowed: false, reasons: [] })) }); };
const ENTRIES = Object.fromEntries(ALL.map((x, i) => ['k' + i, { i: x.inv, g: x.g, p: 'INV-P' + Math.floor(i / 2), ...(x.h ? { h: 1, r: x.h } : {}) }]));
const KEY = { bkk: 'bkk-stay/u-sathorn-superior-garden', pre: 'prewed/heritage', wed: 'wedstay/heritage', gh: 'guesthouse/guest-house' };
const DATES = { [KEY.bkk]: { item: 'A2', checkIn: '2027-02-21', checkOut: '2027-02-24', nights: 3 }, train: { item: 'B', checkIn: '2027-02-24', checkOut: '2027-02-25', nights: 1 },
  [KEY.pre]: { item: 'C', checkIn: '2027-02-25', checkOut: '2027-02-27', nights: 2 }, [KEY.wed]: { item: 'D1', checkIn: '2027-02-27', checkOut: '2027-03-01', nights: 2 },
  [KEY.gh]: { item: 'D2', checkIn: '2027-02-27', checkOut: '2027-03-01', nights: 2 }, mu9646: { item: 'E2', checkIn: '2027-03-01', checkOut: '2027-03-01', nights: 0 } };
const unit = (key, label, gs, hotel) => ({ key, label, places: 2, kind: 'room', occupants: gs.map((g) => ({ guestId: g, name: 'n' })) });
const PLAN = { units: {
  [KEY.bkk]: [unit(KEY.bkk, 'A', ['G048', 'G049']), unit(KEY.bkk, 'B', ['G901', 'G902']), unit(KEY.bkk, 'C', [])],
  [KEY.pre]: [unit(KEY.pre, 'A', ['G048', 'G049']), unit(KEY.pre, 'B', ['G901', 'G902']), unit(KEY.pre, 'C', ['G905', 'G906'])],
  [KEY.wed]: [unit(KEY.wed, 'A', ['G048', 'G049']), unit(KEY.wed, 'B', ['G901', 'G902']), unit(KEY.wed, 'C', ['G903', 'G904']), unit(KEY.wed, 'D', ['G905', 'G906']), unit(KEY.wed, 'E', ['G907', '~INV-P9~1'])],
  [KEY.gh]: [unit(KEY.gh, 'A', ['G908'])] },
  waitlist: [{ stage: 'wedstay', guestId: 'G909', position: 1 }], hotelRooms: { rooms: { [KEY.wed + '|C']: ['202'], [KEY.pre + '|C']: ['204'], [KEY.wed + '|D']: ['204'] } } };
const LIST012 = [{ row: 2, building: 'C', roomType: 'The Heritage', roomNo: '202', checkIn: '25.02.2027', checkOut: '01.03.2027', guests: ['Typed <b>Name</b>'] }, { row: 3, building: 'C', roomType: 'The Heritage', roomNo: '204', checkIn: '25.02.2027', checkOut: '01.03.2027', guests: ['A', 'B'] }];
const BASE = { ok: true, at: '2026-11-24T08:00:00.000Z', audience: 'GROOM', factsMax: 12, ...arrivalsBase({ entries: ENTRIES, plan: PLAN, dates: DATES, list012: LIST012, owner: {}, gaps: [] }) };
const trip = (g, legs, scope, extra) => ({ submissionId: 'S-' + g, version: 1, lastSentAt: '2026-11-01T10:00:00Z', registration: { guestRecord: { scope: scope || { bangkok: true, vientianePreWedding: true, vientianeWedding: true } }, selections: legs.map((id) => ({ id })), ...(extra || {}) } });
const TRIPS = { G901: trip('G901', ['train']), G902: trip('G902', ['train']), G903: trip('G903', ['train']), G904: trip('G904', ['train']), G905: trip('G905', ['train']), G906: trip('G906', ['train']),
  G907: trip('G907', [], { vientianeWedding: true }), G908: trip('G908', ['train', 'mu9646']), G909: trip('G909', [], { vientianeWedding: true }), G910: trip('G910', [], { none: true }), G911: trip('G911', [], { vientianeWedding: true }) };
const CONFIRMED = new Set(['G901', 'G902', 'G903', 'G904', 'G906', 'G907', 'G908', 'G910']);
const FACTS = Object.fromEntries(ALL.map((x) => [x.inv, factsOf(TRIPS[x.g] || null, CONFIRMED.has(x.g) ? { confirmedAt: '2026-11-02T10:00:00Z', version: 1 } : null)]));
const arrivals = (calls) => (url) => {
  const q = decodeURIComponent(url.split('?')[1] || '');
  if (!/^facts=/.test(q)) { calls.push('base'); return res(200, BASE); }
  const invs = q.slice(6).split(','); calls.push(invs.length);
  if (invs.length > 12) return res(400, { ok: false });
  return res(200, { ok: true, facts: Object.fromEntries(invs.map((i) => [i, FACTS[i]])) });
};
const BASE_ANSWERS = { 'admin/overview': OVERVIEW, 'admin/status': okRows, 'admin/readiness': okRows, revenue: { ok: true, calculatedAt: '2026-11-24T08:00:00.000Z', holders: [], couple: [] },
  'admin/assignments': { ok: true, at: '2026-11-24T08:01:00.000Z', events: {} } };

function load(answers, opts = {}) {
  const calls = [], arr = [];
  const all = Object.assign({ 'admin/arrivals': arrivals(arr) }, BASE_ANSWERS, answers);
  const w = page({ path: 'admin/billing', modules: ['assets/admin-profile.js', 'assets/arrivals-model.js', 'assets/admin-overview.js', 'assets/admin-billing.js'], auth: SUTHEP,
    fetch: (url, init = {}) => { calls.push({ url, method: init.method || 'GET' }); const key = url.replace(/^\/api\/billing\//, '').split('?')[0];
      const a = all[key]; const out = typeof a === 'function' ? a(url, init) : a; return Promise.resolve(out && out.status ? out : res(200, out || { ok: true })); } });
  w.location.hash = opts.hash || '';
  const root = fakeRoot();
  w.SIYL_ADMIN_BILLING.boot(root);
  return { w, root, calls, arr, S: () => w.SIYL_ADMIN_BILLING.state() };
}

test('HS-059 · THE READ — after the guest checks, the figures and the programme figures: the base, then the trips in parts of ≤ 12, one after the other; once per visit; only GETs', async () => {
  const { calls, arr, root } = load({});
  await tick(60);
  const u = calls.map((c) => c.url.replace(/^\/api\/billing\//, ''));
  const first = u.findIndex((x) => /^admin\/arrivals/.test(x)), prog = u.indexOf('admin/assignments?overview=1'), rev = u.indexOf('revenue');
  assert.ok(first > prog && prog > rev, 'after the figures and the programme figures');
  assert.deepEqual(arr, ['base', 12, 6], 'the base, then 18 invitations in two parts');
  assert.ok(calls.every((c) => c.method === 'GET'));
  assert.match(root.innerHTML, /Every known guest · 18/);
  await (async () => { const g = el(root, 'data-ab-tab', '#guests'); g.onclick({ preventDefault() {} }); await tick(10); const o = el(root, 'data-ab-tab', '#overview'); o.onclick({ preventDefault() {} }); await tick(30); })();
  assert.deepEqual(arr, ['base', 12, 6], 'once per console visit');
});

test('HS-059 · SECTION F STANDS ON ITS OWN — the programme figures refused (503), Section F still draws; its own refusal is said with a Try again, never repeated by itself', async () => {
  const a = load({ 'admin/assignments': () => res(503, { ok: false }) });
  await tick(60);
  assert.match(a.root.innerHTML, /Where guests sleep · per night/); assert.match(a.root.innerHTML, /Each guest&#39;s journey|Each guest's journey/);
  let n = 0;
  const b = load({ 'admin/arrivals': () => { n++; return res(503, { ok: false }); } });
  await tick(60);
  assert.equal(n, 1); assert.match(b.root.innerHTML, /limiting heavy requests just now/); assert.ok(el(b.root, 'data-arr-retry'));
  await tick(30); assert.equal(n, 1, 'never repeated by itself');
  el(b.root, 'data-arr-retry').onclick({}); await tick(30); assert.equal(n, 2, 'one more, on the click');
});

test('HS-059 · THE SECTION — every known guest, the nights, the days, the rooms against persons, the legs, the checks, 012 as typed (escaped); the old "Persons with us" is gone', async () => {
  const { root } = load({});
  await tick(60);
  const h = root.innerHTML;
  for (const t of ['Every known guest · 18', 'Where guests sleep · per night', 'Arrivals and departures per day', 'Rooms in the room plan · against persons', 'Legs between the places', 'Day by day', 'Data checks · for Guest Relations', '012 · the Owners&#39; room list against the room plan']) assert.ok(h.includes(t) || h.includes(t.replace(/&#39;/g, "'")), t);
  assert.doesNotMatch(h, /Persons with us per night/);
  assert.match(h, /Typed &lt;b&gt;Name&lt;\/b&gt;/, '012 typed names escaped');
  assert.doesNotMatch(h, /<img src=x/, 'a guest name is escaped');
  assert.match(h, /1 of 3 rooms in the plan hold someone|2 of 3 rooms in the plan hold someone/);
  assert.doesNotMatch(h, /SECRETCODE/);
});

test('HS-059 · EVERY FIGURE OPENS EXACTLY ITS GUESTS — rows = the number on the figure = the list\'s own count, for every list Section F links to', async () => {
  const o = load({});
  await tick(60);
  const links = [...o.root.innerHTML.matchAll(/data-ab-tab="#list=(arv\.[^"]+)" class="ov-link[^"]*">([^<]*)</g)].map((m) => ({ key: m[1], said: Number((/(\d+)/.exec(m[2].replace(/&[a-z]+;/g, '')) || [])[1]) }));
  const segs = [...o.root.innerHTML.matchAll(/data-ov-go="#list=(arv\.[^"]+)"/g)].map((m) => m[1]);
  assert.ok(links.length > 30, links.length + ' links');
  const keys = [...new Set(links.map((l) => l.key).concat(segs))];
  for (const k of keys) {
    const L = load({}, { hash: '#list=' + k }); await tick(60);
    assert.doesNotMatch(L.root.innerHTML, /does not exist|Loading/, k);
    const count = Number((/(\d+) guests? ·/.exec(L.root.innerHTML) || [])[1]);
    const rows = L.root.querySelectorAll('[data-ab-profile]').length;
    assert.equal(rows, count, k + ': rows = the list\'s count');
    for (const l of links.filter((x) => x.key === k)) assert.equal(l.said, count, k + ': the figure = the list');
  }
});

test('HS-059 · A DAY AND A GUEST OPEN ON A CLICK — the body is drawn only when opened; the guest shows the train, the night not recorded, the check', async () => {
  const { root, S } = load({});
  await tick(60);
  const day = el(root, 'data-ov-det', 'f-day-2027-02-25');
  assert.ok(day && !day.open); assert.doesNotMatch(root.innerHTML, /arrive \(\d+\):/);
  day.open = true; day.ontoggle({}); await tick(10);
  assert.equal(S().ov.open['f-day-2027-02-25'], true);
  assert.match(root.innerHTML, /arrive \(\d+\):/);
  assert.ok(!el(root, 'data-ov-det', 'f-g-G903'), 'the guests of a group are drawn only when it is opened');
  const grp = el(root, 'data-ov-det', 'f-track-IN_ROOM_PLAN'); grp.open = true; grp.ontoggle({}); await tick(10);
  const g = el(root, 'data-ov-det', 'f-g-G903'); g.open = true; g.ontoggle({}); await tick(10);
  const h = root.innerHTML;
  assert.match(h, /Night train Bangkok → Nong Khai · van to Vientiane · Wed 24 Feb · trip confirmed/);
  assert.match(h, /accommodation not recorded for Thu 25 Feb, Fri 26 Feb/);
  assert.match(h, /Bangkok<\/b><small>arrival: not recorded/);
});
