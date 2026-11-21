/* ============================================================================
   THE OVERVIEW · the console's start view as the page loads it (HS-034 + HS-035, Owners HS-PROMPT-052, 21 Nov 2026)
   assets/admin-overview.js + assets/admin-billing.js against a fake server, with figures formed by the real
   src/billing/quick-overview.js over FICTIONAL guests. Nothing reaches a network.
     · the Overview is the start view; #guests and every other tab are what they were
     · the requests: today's chain unchanged, then exactly ONE admin/assignments?overview=1 — after the guest checks and the
       figures, only for the Overview, never retried by itself
     · a figure opens the list of exactly its guests, a guest their profile, and the profile leads back to the list
     · the guest search finds names, G-numbers and invitation ids — never anything else — and opens the profile
     · a fault in a source or in the renderer never blanks the console
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, SUTHEP } from './sandbox.mjs';
import { quickFinanceOf, participationOf } from '../src/billing/quick-overview.js';

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
async function click(root, attr, value) { const e = el(root, attr, value); assert.ok(e, 'no [' + attr + '=' + value + ']'); e.onclick && e.onclick({ preventDefault() {}, stopPropagation() {} }); await tick(); }

/* ------------------------------------------------------------ fictional data */
const N = 14, pad = (n) => String(n).padStart(2, '0');
const G = Array.from({ length: N }, (_, i) => ({ i, g: 'GT' + pad(i + 1), inv: 'INV-T' + pad(i + 1), name: 'Guest ' + pad(i + 1) }));
G[0].name = 'Bride Demo'; G[1].name = 'Groom Demo'; G[0].hosts = G[1].hosts = true;
G[5].name = '<img src=x onerror="alert(1)">';
const HOLDERS = G.map((x) => ({ Holder_ID: x.inv, guestId: x.g, name: { full: x.name }, code: 'SECRETCODE' + x.i, settlement: null, payment: null, method: { determined: true } }));
const OVERVIEW = { ok: true, asOf: '2026-11-21', audience: 'GROOM', chunk: 6, gate: { approved: true }, holders: HOLDERS };
const statusAnswer = (url) => { const ids = decodeURIComponent(url.split('ids=')[1]).split(',');
  return res(200, { ok: true, rows: ids.map((id) => ({ Holder_ID: id, confirmation: { state: id === 'INV-T04' ? 'UNCONFIRMED' : 'CONFIRMED' }, booked: { selected: 2 }, elsewhere: [] })) }); };
const readyAnswer = (url) => { const ids = decodeURIComponent(url.split('ids=')[1]).split(',');
  return res(200, { ok: true, rows: ids.map((id) => ({ Holder_ID: id, allowed: id === 'INV-T07', reasons: id === 'INV-T07' ? [] : ['NO_CHANGE: the issued statement holds exactly this booking'] })) }); };
const pay = G.filter((x) => !x.hosts);
const REV = { ok: true, calculatedAt: '2026-11-21T08:00:00.000Z', asOf: '2026-11-21',
  issuedRevenue: { cents: 300000, complete: true }, cashCollected: { cents: 120000, complete: true }, outstanding: { cents: 180000, complete: true }, overdue: { cents: 40000, complete: true },
  refundDue: { cents: 0, complete: true }, bookedRevenue: { cents: 330000, complete: true }, notYetInvoiced: { cents: 30000, complete: true, contributors: ['INV-T14'] },
  paymentsReported: { cents: 9000, rows: 1, duplicateSuspects: 0, unreadable: 0 }, couple: [{ Holder_ID: 'INV-T01' }, { Holder_ID: 'INV-T02' }],
  holders: pay.map((x) => ({ Holder_ID: x.inv, revision: x.i === 13 ? null : 1, paymentStatus: x.i === 13 ? null : x.i % 3 === 0 ? 'PAID' : 'UNPAID', paymentFlags: x.i === 4 || x.i === 8 ? ['OVERDUE'] : [], pendingVerification: x.i === 6 ? 1 : 0 })),
  quotaUtilisation: [{ Item_ID: 'B-TRAIN', Quota: 12, used: 2 }], breakdown: { extras: [] },
  budget: { available: true, inventory: [], centres: [{ id: 'B', kind: 'ROUTE', place: 'Night train Bangkok → Nong Khai, van to Vientiane', from: '2027-02-24', to: '2027-02-25', items: ['B-TRAIN'], status: 'COMPLETE', guest: [{ person: 'GT03' }, { person: 'GT09' }] }],
    suppliers: [], report: { byHotel: { reconciliation: { revenueHotelsCents: 100000 }, wedding: [{ id: 's', name: 'Hotel Alpha', revenue: { booked: { cents: 100000 } }, forecast: { cents: 50000 }, committed: [], paid: [] }], china: [] },
      hotel: [{ stay: 'C', place: 'Hotel Alpha', from: '2027-02-25', to: '2027-02-27', roomsBought: 1, roomsAdditional: 2, roomsOccupied: 3, guests: 5, emptyBought: 0 }] } } };
REV.quick = quickFinanceOf(REV);
const roster = G.map((x) => ({ guestId: x.g, invitationId: x.inv, partyId: 'P' + Math.floor(x.i / 2), hosts: !!x.hosts, couple: x.i === 0 ? 'BRIDE' : x.i === 1 ? 'GROOM' : null,
  booking: x.hosts ? 'CONFIRMED' : x.i === 12 ? 'NOT_SENT' : 'CONFIRMED', attendance: x.i === 12 ? { ceremony: 'not-sent', dinner: 'not-sent' } : { ceremony: 'yes', dinner: x.i === 10 ? 'no' : 'yes' }, group: { size: 2 } }));
const records = {};
for (const x of G.filter((y) => !y.hosts && y.i !== 12)) records[x.inv] = { submissionId: 'S' + x.i, version: 1, guestId: x.g, registration: { guestId: x.g, guestRecord: { scope: { vientianeWedding: true }, guests: [{ allergy: { answer: x.i === 3 ? 'Yes' : 'No', details: 'SECRET-ALLERGY-TEXT' } }] },
  templeCeremony: { guests: [{ guestId: x.g, events: { temple: x.i % 2 ? 'Joining' : 'Not joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' } }] }, documents: { guests: [{ documents: [{ kind: 'passport', state: x.i % 2 ? 'received' : 'none', filename: 'SECRET-FILE.pdf' }] }] } } };
const seating = { open: true, capacity: { ceremony: { totalPeople: 54, couple: 2, left: 22, right: 30 }, dinner: { totalPeople: 54, top: 27, bottom: 27 } },
  events: { ceremony: { seats: [{ seatId: 'C-L-01-01', guestId: 'GT03', state: 'held' }] }, dinner: { seats: [{ seatId: 'D-T-01', guestId: 'GT03', state: 'held' }, { seatId: 'D-T-02', guestId: 'GT11', state: 'held' }] } } };
const stays = [{ window: 'prewed', categories: [{ checkIn: '2027-02-25', checkOut: '2027-02-27', units: [{ occupants: [{ guestId: 'GT03' }, { guestId: 'GT05' }] }] }] }];
const ASSIGN = { ok: true, at: '2026-11-21T08:01:00.000Z', events: { ceremony: { date: '2027-02-28' }, dinner: { date: '2027-02-28' } }, participation: participationOf({ roster, records, seating, stays }) };
const BASE = { 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/readiness': readyAnswer, revenue: REV, 'admin/assignments': ASSIGN,
  'admin/profile': { ok: true, profile: { identity: { invitationId: 'INV-T05', guestId: 'GT05' }, status: {}, confirmation: {}, readable: {} } } };

function load(answers, opts = {}) {
  const calls = [];
  const w = page({ path: 'admin/billing', modules: opts.modules || ['assets/admin-profile.js', 'assets/admin-overview.js', 'assets/admin-billing.js'], auth: SUTHEP,
    fetch: (url, init = {}) => { calls.push({ url, method: init.method || 'GET' }); const key = url.replace(/^\/api\/billing\//, '').split('?')[0];
      const a = Object.assign({}, BASE, answers)[key]; if (a === 'PENDING') return new Promise(() => {});
      const out = typeof a === 'function' ? a(url, init) : a; return Promise.resolve(out && out.status ? out : res(200, out || { ok: true })); } });
  w.location.hash = opts.hash || '';
  if (opts.before) opts.before(w);
  const root = fakeRoot();
  w.SIYL_ADMIN_BILLING.boot(root);
  return { w, root, calls, S: () => w.SIYL_ADMIN_BILLING.state() };
}

test('START VIEW · the Overview opens first, its tab before Guests; #guests and the other tabs are what they were', async () => {
  const { root, S } = load({});
  await tick(30);
  assert.equal(S().route.view, 'overview');
  const h = root.innerHTML;
  assert.match(h, /data-ab-tab="#overview" class="on">Overview<\/a><a href="\/admin\/billing#guests"/, 'Overview first, then Guests');
  assert.match(h, /class="ov" id="ov-top"/); assert.equal((h.match(/class="ov-area"/g) || []).length, 6, 'all six areas');
  assert.equal((h.match(/class="ov-kpi"/g) || []).length, 8, 'eight figures at a glance');
  const g = load({}, { hash: '#guests' }); await tick(30);
  assert.equal(g.S().route.view, 'guests'); assert.match(g.root.innerHTML, /data-ab-filter="all"/); assert.doesNotMatch(g.root.innerHTML, /class="ov"/);
  /* without the Overview's renderer the console opens on the guest list, exactly as before */
  const old = load({}, { modules: ['assets/admin-billing.js'] }); await tick(30);
  assert.equal(old.S().route.view, 'guests'); assert.doesNotMatch(old.root.innerHTML, /#overview/);
});

test('REQUESTS · today\'s chain unchanged, then exactly ONE admin/assignments?overview=1 — after the guest checks and the figures; only GETs', async () => {
  const { calls } = load({});
  await tick(40);
  const u = calls.map((c) => c.url.replace(/^\/api\/billing\//, ''));
  assert.equal(u[0], 'admin/overview');
  const lastStatus = u.map((x, i) => (/^admin\/status/.test(x) ? i : -1)).filter((i) => i >= 0).pop();
  const rev = u.indexOf('revenue'), lastReady = u.map((x, i) => (/^admin\/readiness/.test(x) ? i : -1)).filter((i) => i >= 0).pop();
  const ov = u.filter((x) => /^admin\/assignments/.test(x));
  assert.ok(rev > lastStatus, 'the figures after the guest checks, as before');
  assert.deepEqual(ov, ['admin/assignments?overview=1'], 'one programme read');
  assert.ok(u.indexOf(ov[0]) > rev && u.indexOf(ov[0]) > lastReady, 'only after readiness and the figures');
  assert.ok(calls.every((c) => c.method === 'GET'), 'the Overview only reads');
  assert.ok(!u.some((x) => /^admin\/holder|^admin\/profile|^reconcile|^holders/.test(x)), 'no heavy read, no profile, no finance view');
});

test('REQUESTS · the guest list, Seating and the other tabs never read the programme figures; opening the Overview later reads them once', async () => {
  const { root, calls } = load({}, { hash: '#guests' });
  await tick(40);
  assert.equal(calls.filter((c) => /overview=1/.test(c.url)).length, 0);
  await click(root, 'data-ab-tab', '#overview'); await tick(20);
  assert.equal(calls.filter((c) => /overview=1/.test(c.url)).length, 1);
  await click(root, 'data-ab-tab', '#guests'); await click(root, 'data-ab-tab', '#overview'); await tick(20);
  assert.equal(calls.filter((c) => /overview=1/.test(c.url)).length, 1, 'once per visit');
});

test('NO RETRY · a refused programme read is said with the platform\'s words and a Try again the Owners click — never repeated by itself', async () => {
  let n = 0;
  const { root, calls } = load({ 'admin/assignments': () => { n++; return res(503, { ok: false }); } });
  await tick(40);
  assert.equal(n, 1); assert.match(root.innerHTML, /limiting heavy requests just now/); assert.ok(el(root, 'data-ov-retry'));
  await tick(40); assert.equal(n, 1, 'still one');
  await click(root, 'data-ov-retry'); await tick(10);
  assert.equal(n, 2, 'one more, on the click');
  assert.ok(calls.every((c) => c.method === 'GET'));
});

test('ISOLATION · the figures refused: Finance and Hotels say so, the programme areas still draw; a renderer fault leaves every tab one click away', async () => {
  const { root } = load({ revenue: res(503, { ok: false, error: 'the revenue overview could not be calculated just now' }) });
  await tick(40);
  const h = root.innerHTML;
  assert.match(h, /the revenue overview could not be calculated just now/); assert.match(h, /Wedding Events &amp; Seating/); assert.match(h, /data-ab-tab="#seating"/);
  assert.match(h, /data-ab-tab="#list=ev\.temple\.yes"/, 'the programme figures are there');
  const broken = load({}, { before: (w) => { w.SIYL_ADMIN_OVERVIEW.render = () => { throw new Error('boom'); }; } });
  await tick(40);
  assert.match(broken.root.innerHTML, /data-ov-fallback/); assert.match(broken.root.innerHTML, /data-ab-tab="#guests"/); assert.match(broken.root.innerHTML, /data-ab-tab="#finance"/);
});

test('LISTS · a figure opens exactly its guests (escaped), each with Profile; an unknown key is no list; never an allergy text or a file name', async () => {
  const { root, S } = load({}, { hash: '#list=fin.bucket.OVERDUE' });
  await tick(40);
  assert.equal(S().route.view, 'list');
  const rows = root.querySelectorAll('[data-ab-profile]');
  assert.deepEqual(rows.map((r) => r.getAttribute('data-ab-profile')), ['INV-T05', 'INV-T09']);
  assert.equal(rows.length, REV.quick.finance.buckets.find((b) => b.key === 'OVERDUE').n, 'the list is the figure');
  assert.match(root.innerHTML, /2 guests · issued statements of the paying guests/);
  const x = load({}, { hash: '#list=ev.temple.yes' }); await tick(40);
  assert.match(x.root.innerHTML, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/); assert.doesNotMatch(x.root.innerHTML, /<img src=x/);
  const t = load({}, { hash: '#list=evil<script>' }); await tick(30);
  assert.equal(t.S().route.view, 'overview', 'only the keys the Overview knows'); assert.doesNotMatch(t.root.innerHTML, /<script>/);
  const all = load({}, { hash: '#list=allergy.yes' }); await tick(40);
  assert.deepEqual(all.root.querySelectorAll('[data-ab-profile]').map((r) => r.getAttribute('data-ab-profile')), ['INV-T04']);
  assert.doesNotMatch(all.root.innerHTML, /SECRET-ALLERGY-TEXT|SECRET-FILE/, 'never the allergy text or a file name');
  /* every list the Overview links to exists and has exactly the figure's count */
  const o = load({}); await tick(40);
  const keys = [...new Set([...o.root.innerHTML.matchAll(/(?:data-ab-tab|data-ov-go)="#list=([^"]+)"/g)].map((m) => m[1]))];
  assert.ok(keys.length > 20, keys.length + ' lists');
  for (const k of keys) { const L = load({}, { hash: '#list=' + k }); await tick(30);
    assert.doesNotMatch(L.root.innerHTML, /does not exist|Loading/, k); const said = Number((/(\d+) guests? ·/.exec(L.root.innerHTML) || [])[1]);
    assert.equal(L.root.querySelectorAll('[data-ab-profile]').length, said, k + ': rows = the count it says'); }
});

test('PROFILE · opened from a list, it offers "Back to the list" and returns there; opened from the guest list, it does not', async () => {
  const { root, S } = load({}, { hash: '#list=fin.bucket.OVERDUE' });
  await tick(40);
  await click(root, 'data-ab-profile', 'INV-T05'); await tick(20);
  assert.equal(S().route.view, 'profile'); assert.equal(S().backTo, '#list=fin.bucket.OVERDUE');
  assert.match(root.innerHTML, /data-ab-backlist="#list=fin\.bucket\.OVERDUE"/);
  await click(root, 'data-ab-backlist'); await tick(20);
  assert.equal(S().route.view, 'list'); assert.equal(S().route.id, 'fin.bucket.OVERDUE');
  const g = load({}, { hash: '#guests' }); await tick(40);
  await click(g.root, 'data-ab-profile', 'INV-T05'); await tick(20);
  assert.equal(g.S().backTo, null); assert.doesNotMatch(g.root.innerHTML, /data-ab-backlist/);
});

test('SEARCH · names, G-numbers and invitation ids from the guest list already held — never a code or another field; Enter opens the profile; no request', async () => {
  const q = { value: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  const list = { innerHTML: '', hidden: true }, box = { hidden: true };
  const { w, calls } = load({}, { before: (w) => { w.document.getElementById = (id) => ({ 'ab-gs': box, 'ab-gs-q': q, 'ab-gs-list': list, admin: null })[id] || null; } });
  await tick(40);
  assert.equal(box.hidden, false, 'shown once the guest list is read');
  const n0 = calls.length;
  const type = (v) => { q.value = v; q.oninput(); };
  type('guest 1'); assert.equal((list.innerHTML.match(/data-gs=/g) || []).length, 5, 'Guest 10 … Guest 14');
  type('gt07'); assert.match(list.innerHTML, /data-gs="INV-T07"/); assert.equal((list.innerHTML.match(/data-gs=/g) || []).length, 1);
  type('inv-t09'); assert.match(list.innerHTML, /data-gs="INV-T09"/);
  type('SECRETCODE3'); assert.equal((list.innerHTML.match(/data-gs=/g) || []).length, 0, 'a code is never searched'); assert.match(list.innerHTML, /No guest found/);
  type('img'); assert.match(list.innerHTML, /&lt;img src=x/); assert.doesNotMatch(list.innerHTML, /<img src=x/);
  type('gt07'); q.onkeydown({ key: 'Enter', preventDefault() {} }); await tick(10);
  assert.equal(w.location.hash, '#profile=INV-T07'); assert.equal(q.value, '', 'the field is cleared');
  assert.equal(calls.slice(n0).filter((c) => !/admin\/profile/.test(c.url)).length, 0, 'searching sends nothing');
});

test('STATIC · the renderer is ES5, draws only, stores nothing, holds no capacity of its own; the page loads it between the profile and the console', () => {
  const js = src('assets/admin-overview.js');
  assert.doesNotMatch(js, /=>|`|\bconst\b|\blet\b/, 'ES5, like the console');
  assert.doesNotMatch(js, /window\.(confirm|alert|prompt)\(|localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|matchMedia/);
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<path[^']*'|d="[^"]*"|viewBox="[^"]*"|M[0-9][^']*'/g, '');
  assert.ok(!/['"\s(](54|50|26|104)['"\s)]/.test(code.replace(/IP = \{[\s\S]*?\};/, '')), 'no fixed capacity: every one comes from the server');
  const html = src('src/admin/billing.html'), at = (f) => html.indexOf('assets/' + f + '?v=');
  assert.ok(at('admin-profile.js') > 0 && at('admin-profile.js') < at('admin-overview.js') && at('admin-overview.js') < at('admin-billing.js'));
  assert.match(html, /id="ab-gs-q"[^>]*role="combobox"/); assert.ok(html.indexOf('id="ab-gs"') < html.indexOf('id="admin"'), 'the search lives outside the redrawn area');
  assert.match(src('assets/admin-billing.js'), /var OVERVIEW_AUTOLOAD = true;/, 'E17: one switch');
});

test('FIGURE = LIST (review F9) · every number the Overview links shows exactly the rows of the list it opens', async () => {
  const o = load({}); await tick(40);
  const links = [...o.root.innerHTML.matchAll(/<a href="\/admin\/billing#list=([^"]+)" data-ab-tab="#list=[^"]+" class="ov-link[^"]*">([\s\S]*?)<\/a>/g)].map((m) => [m[1], m[2].replace(/<[^>]+>/g, '')]);
  assert.ok(links.length > 20, links.length + ' linked figures');
  const seen = {};
  for (const [key, label] of links) {
    const n = Number((/(\d+)/.exec(label) || [])[1]);
    if (!Number.isFinite(n)) continue;
    if (!(key in seen)) { const L = load({}, { hash: '#list=' + key }); await tick(30); seen[key] = L.root.querySelectorAll('[data-ab-profile]').length; }
    assert.equal(seen[key], n, key + ': the link says ' + JSON.stringify(label) + ', the list has ' + seen[key]);
  }
});

test('STILL CHECKING (review F6) · while the guest checks run, their counts are "…" and their lists say Loading — never 0 or Nobody', async () => {
  const { root } = load({ 'admin/readiness': 'PENDING' });
  await tick(40);
  assert.match(root.innerHTML, /<p class="ov-an">…<\/p><p class="ov-al">Ready to issue/); assert.match(root.innerHTML, /Statement blocked<\/p><p class="ov-as">guest checks · still reading/);
  assert.match(root.innerHTML, /data-ov-jump="ov-gr">…<\/button>/, 'the open items wait too');
  const L = load({ 'admin/readiness': 'PENDING' }, { hash: '#list=ac.ready' }); await tick(40);
  assert.match(L.root.innerHTML, /Loading — the list fills/); assert.doesNotMatch(L.root.innerHTML, /Nobody|0 guests/);
});

test('UNKNOWN KEYS (review F10) · a key that names an object property is no list: "This list does not exist", never the fallback', async () => {
  for (const k of ['ac.constructor', 'ev.temple.toString', 'rsvp.__proto__', 'doc.passport.constructor', 'night.2027-02-25.constructor']) {
    const L = load({}, { hash: '#list=' + k }); await tick(40);
    assert.doesNotMatch(L.root.innerHTML, /data-ov-fallback/, k); assert.match(L.root.innerHTML, /This list does not exist|Loading/, k);
  }
});

test('STALE (review F8, F13) · after a write the figures stay marked until revenue is calculated again; a late programme answer never lands; sign-out clears the search', async () => {
  const { root, S } = load({}); await tick(40);
  S().revenueStale = true; await click(root, 'data-ov-night', 'all');
  assert.match(root.innerHTML, /may be outdated after your change/); assert.match(root.innerHTML, /Recalculate in Revenue/);
  const js = src('assets/admin-billing.js');
  assert.match(js, /S\.overviewStale = true;\s*\/\*[^*]*\*\/\s*S\.revenueStale = true;/, 'every write marks the figures');
  assert.match(js, /S\.revenue = x\.j; S\.revenuePhase = 'ready'; S\.revenueStale = false;/, 'only a new calculation clears it');
  assert.match(js, /if \(mine !== ovGen\) return;/, 'a late programme answer is dropped');
  assert.match(js, /addEventListener\('storage'[\s\S]{0,400}ov: \{ phase: 'idle'[\s\S]{0,120}searchHide\(\)/, 'sign-out elsewhere: the Overview and the search are cleared');
});
