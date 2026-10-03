/* THE GUEST OPENS THEIR OWN DOCUMENT · GUEST RELATIONS SEES WHO HAS SENT WHAT (Owner, 3 Oct 2026).
   GET /api/document/mine?kind=passport|flight: the signed-in guest's own CURRENT copy — who they are from their bearer against the
   register read fresh, the prefix built from that identity alone; never a key, an invitation or a guest id from the request; a party
   mate is another guest; private, never cached, never sniffed, the stored type kept. The pages offer View only on the guest's own
   row with a receipt. Guest Relations reads as before; the retention clock is unchanged; nothing here writes. Synthetic guests only. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, page, PEGGY } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
/* an R2 stand-in that pages its listings (two objects a page) and counts every write */
function r2() {
  const m = new Map(); let writes = 0;
  return { m, writes: () => writes,
    put: async (k, bytes, o) => { writes++; m.set(k, { key: k, bytes: new Uint8Array(bytes), size: bytes.byteLength, ...o }); },
    delete: async (k) => { writes++; m.delete(k); },
    get: async (k) => (m.has(k) ? { ...m.get(k), body: new Blob([m.get(k).bytes]).stream() } : null),
    list: async ({ prefix, cursor }) => { const all = [...m.values()].filter((o) => o.key.startsWith(prefix || '')).sort((a, b) => (a.key < b.key ? -1 : 1)); const i = Number(cursor || 0), page = all.slice(i, i + 2);
      return { objects: page.map((o) => ({ key: o.key, size: o.size, uploaded: new Date('2026-09-21T00:00:00Z'), httpMetadata: o.httpMetadata, customMetadata: o.customMetadata })), truncated: i + 2 < all.length, cursor: String(i + 2) }; } };
}
async function harness(opts = {}) {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-view-peggy'), steffie = await bearerOf('demo-view-steffie'), lin = await bearerOf('demo-view-lin');
  const entries = { [await authIdOf(peggy)]: { i: 'INV-G001', g: 'G001', p: 'INV-002' }, [await authIdOf(steffie)]: { i: 'INV-G002', g: 'G002', p: 'INV-002' }, [await authIdOf(lin)]: { i: 'INV-G009', g: 'G009', p: 'INV-009' } };
  let indexOk = true;
  const env = { GR_TOKEN: 'gr-secret', DOCS: r2(), ASSETS: { fetch: async (r) => (new URL(r.url).pathname === '/register/auth-index.json' ? (indexOk ? new Response(JSON.stringify({ v: 2, entries })) : new Response('down', { status: 503 })) : new Response('no', { status: 404 })) } };
  const put = (inv, g, kind, at, type, bytes, filename) => env.DOCS.m.set('doc/' + inv + '/' + g + '/' + kind + '/' + at + '-' + 'a'.repeat(12), { key: 'doc/' + inv + '/' + g + '/' + kind + '/' + at + '-' + 'a'.repeat(12), bytes, size: bytes.length, httpMetadata: { contentType: type }, customMetadata: { invitationId: inv, guestId: g, kind, filename, receivedAt: at, sha256: 'x' } });
  const get = (path, bearer, init) => w.fetch(new Request(ORIGIN + path, { ...(init || {}), headers: { ...(bearer ? { 'x-siyl-auth': bearer } : {}), ...((init && init.headers) || {}) } }), env);
  return { w, env, peggy, steffie, lin, put, get, indexDown: () => { indexOk = false; } };
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
const PDF = new TextEncoder().encode('%PDF-1.4 synthetic');

test('OWN PASSPORT · OWN FLIGHT · the signed-in guest receives exactly their own current copy — the stored type, inline, private, no-store, nosniff', async () => {
  const h = await harness();
  h.put('INV-G001', 'G001', 'passport', '2026-10-01T10:00:00.000Z', 'image/jpeg', JPEG, 'my passport.jpg');
  h.put('INV-G001', 'G001', 'flight', '2026-10-01T11:00:00.000Z', 'application/pdf', PDF, 'ticket.pdf');
  for (const [kind, type, bytes] of [['passport', 'image/jpeg', JPEG], ['flight', 'application/pdf', PDF]]) {
    const r = await h.get('/api/document/mine?kind=' + kind, h.peggy);
    assert.equal(r.status, 200, kind); assert.equal(r.headers.get('content-type'), type, kind + ': the stored type');
    assert.deepEqual(new Uint8Array(await r.arrayBuffer()), bytes, kind + ': the bytes the guest sent');
    assert.equal(r.headers.get('cache-control'), 'private, no-store'); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.match(r.headers.get('content-disposition'), /^inline; filename="[\w.-]+"$/);
    for (const hdr of ['x-document-sha256', 'x-document-received', 'x-r2-key']) assert.equal(r.headers.get(hdr), null, 'no storage detail: ' + hdr);
  }
});

test('ONLY THE GUEST · another guest, a party mate, no bearer, an unknown bearer: never someone else\'s document; request parameters cannot choose whose', async () => {
  const h = await harness();
  h.put('INV-G001', 'G001', 'passport', '2026-10-01T10:00:00.000Z', 'image/jpeg', JPEG, 'p.jpg');
  assert.equal((await h.get('/api/document/mine?kind=passport', h.steffie)).status, 404, 'the party mate has none of her own — and never Peggy\'s');
  assert.equal((await h.get('/api/document/mine?kind=passport', h.lin)).status, 404, 'another guest');
  assert.equal((await h.get('/api/document/mine?kind=passport')).status, 401, 'signed out');
  assert.equal((await h.get('/api/document/mine?kind=passport', 'f'.repeat(64))).status, 401, 'a bearer the register does not know');
  /* whatever the request names, the prefix is the bearer's own: an R2 key, another invitation or guest is ignored */
  for (const q of ['&key=' + encodeURIComponent('doc/INV-G001/G001/passport/2026-10-01T10:00:00.000Z-aaaaaaaaaaaa'), '&invitation=INV-G001&guest=G001', '&kind=passport&x=../G001']) {
    assert.equal((await h.get('/api/document/mine?kind=passport' + q, h.steffie)).status, 404, q);
  }
  assert.equal((await h.get('/api/document/mine?kind=passport', h.steffie, { headers: { 'x-invitation': 'INV-G001', 'x-guest': 'G001' } })).status, 404, 'headers cannot choose either');
  assert.equal((await h.get('/api/document/mine?kind=../passport', h.peggy)).status, 400, 'only passport or flight');
  assert.equal((await h.get('/api/document/mine', h.peggy)).status, 400);
  for (const m of ['POST', 'PUT', 'DELETE']) assert.equal((await h.get('/api/document/mine?kind=passport', h.peggy, { method: m })).status, 405, m);
});

test('THE CURRENT COPY · after a replacement only the newest is the guest\'s — across listing pages; missing is a 404; every answer is no-store; a register that cannot be read fails closed', async () => {
  const h = await harness();
  for (const [at, b] of [['2026-10-01T09:00:00.000Z', [1]], ['2026-10-01T10:00:00.000Z', [2]], ['2026-10-02T08:00:00.000Z', [3]], ['2026-10-01T12:00:00.000Z', [4]], ['2026-09-30T23:00:00.000Z', [5]]]) h.put('INV-G009', 'G009', 'passport', at, 'image/png', new Uint8Array(b), 'p.png');
  const r = await h.get('/api/document/mine?kind=passport', h.lin);
  assert.equal(r.status, 200); assert.deepEqual([...new Uint8Array(await r.arrayBuffer())], [3], 'the newest of five, listed two a page');
  const miss = await h.get('/api/document/mine?kind=flight', h.lin);
  assert.equal(miss.status, 404); assert.equal(miss.headers.get('cache-control'), 'private, no-store'); assert.equal((await miss.json()).error, 'no document');
  assert.equal((await h.get('/api/document/mine?kind=flight')).headers.get('cache-control'), 'private, no-store', 'a 401 is never cached either');
  h.indexDown();
  const down = await h.get('/api/document/mine?kind=passport', h.lin);
  assert.equal(down.status, 503, 'no fresh register, no document'); assert.equal(down.headers.get('cache-control'), 'private, no-store');
});

test('READS WRITE NOTHING · the store is byte-for-byte the same after every guest and Guest Relations read; Guest Relations reads as before and refuses a superseded copy', async () => {
  const h = await harness();
  h.put('INV-G001', 'G001', 'passport', '2026-10-01T09:00:00.000Z', 'image/jpeg', JPEG, 'old.jpg');
  h.put('INV-G001', 'G001', 'passport', '2026-10-01T10:00:00.000Z', 'image/jpeg', new Uint8Array([9]), 'new.jpg');
  const before = JSON.stringify([...h.env.DOCS.m.keys()]);
  await h.get('/api/document/mine?kind=passport', h.peggy); await h.get('/api/document/mine?kind=flight', h.peggy);
  const gr = { 'x-gr-token': 'gr-secret' };
  const list = await (await h.get('/api/gr/documents?invitation=INV-G001', null, { headers: gr })).json();
  assert.equal(list.count, 1); assert.equal(list.documents[0].filename, 'new.jpg', 'Guest Relations sees the current copy');
  const cur = await h.get('/api/gr/document?key=' + encodeURIComponent(list.documents[0].key), null, { headers: gr });
  assert.equal(cur.status, 200); assert.equal(cur.headers.get('cache-control'), 'private, no-store');
  const old = [...h.env.DOCS.m.keys()].find((k) => k.includes('T09:'));
  assert.equal((await h.get('/api/gr/document?key=' + encodeURIComponent(old), null, { headers: gr })).status, 404, 'the superseded copy is not the guest\'s document');
  assert.equal(h.env.DOCS.writes(), 0, 'no write, no delete'); assert.equal(JSON.stringify([...h.env.DOCS.m.keys()]), before);
});

test('RETENTION UNCHANGED · kept until 7 April 2027, the one daily trigger, the doc/ prefix only', () => {
  const w = src('src/worker.js');
  assert.match(w, /const DOC_RETENTION = Object\.freeze\(\{ journeyEnd: '2027-03-08', days: 30, purgeFrom: '2027-04-07', prefix: 'doc\/' \}\);/);
  assert.match(src('wrangler.jsonc'), /"triggers": \{ "crons": \["0 3 \* \* \*"\] \}/);
  assert.doesNotMatch(w.slice(w.indexOf('async function handleOwnDocument'), w.indexOf('/* the metadata of one invitation')), /DOCS\.(put|delete)\(/, 'the guest read never writes');
});

test('THE PAGES · View only on the guest\'s own row with a receipt — passport and flight alike; the stored note; one control for About You, My Profile and Review; Thai', () => {
  const seed = (gid) => ({ 'siyl.docs': { guests: { [gid]: { passport: { filename: 'p.jpg', bytes: 10, type: 'image/jpeg', receivedAt: '2026-10-01T10:00:00.000Z' } } } } });
  const w = page({ auth: PEGGY, seed: seed(PEGGY.guestId) }), D = w.SIYL_DOCS;
  assert.equal(D.canView(PEGGY.guestId, 'passport'), true); assert.equal(D.canView(PEGGY.guestId, 'flight'), false, 'no flight receipt: no View');
  assert.match(D.viewHtml(PEGGY.guestId, 'passport'), /data-doc-view="passport"[^>]*>View document<\/button>/); assert.equal(D.viewHtml(PEGGY.guestId, 'flight'), '');
  const f = page({ auth: PEGGY, seed: { 'siyl.docs': { guests: { [PEGGY.guestId]: { flight: { filename: 't.pdf', receivedAt: '2026-10-01T10:00:00.000Z' } } } } } }).SIYL_DOCS;
  assert.match(f.viewHtml(PEGGY.guestId, 'flight'), /data-doc-view="flight"/); assert.equal(f.viewHtml(PEGGY.guestId, 'passport'), '');
  /* someone else's receipt on this device, or signed out: never a View */
  assert.equal(page({ auth: PEGGY, seed: seed('g-steffie') }).SIYL_DOCS.canView('g-steffie', 'passport'), false);
  assert.equal(page({ auth: null, seed: seed(PEGGY.guestId) }).SIYL_DOCS.canView(PEGGY.guestId, 'passport'), false);
  assert.equal(D.STORED_NOTE, 'Stored privately with Guest Relations · kept until 7 April 2027');
  for (const f2 of ['about-you.html', 'profile.html', 'review.html']) { const s = src(f2); assert.match(s, /D\.viewHtml\(/, f2); assert.match(s, /D\.wireView\(/, f2); assert.match(s, /D\.STORED_NOTE/, f2); assert.match(s, /data-i18n-skip>'\+esc\((r|d)\.filename\)/, f2 + ': the file name is never translated'); }
  assert.match(src('assets/docs.js'), /fetch\(API \+ '\/mine\?kind=' \+ encodeURIComponent\(kind\), \{ headers: \{ 'x-siyl-auth': bearer \}, cache: 'no-store', signal: ctl \? ctl\.signal : undefined \}\)/);
  assert.match(src('assets/docs.js'), /the earlier copy stays in the private store,\s+hidden from the guest and from Guest Relations, until the\s+retention purge of 7 April 2027/, 'the corrected comment');
  const TH = JSON.parse(src('src/i18n-th.json')).exact;
  for (const k of ['View document', 'Stored privately with Guest Relations · kept until 7 April 2027', 'received', 'Opening your document…', 'Open your document', 'We could not find this document. Please add it again.', 'Please sign in again to open your document.', 'Your document could not be opened just now. Please try again.']) assert.ok(TH[k], 'Thai for ' + k);
});

test('A SWITCHED SESSION · a document fetched for one guest is never shown after another guest signs in on this device', async () => {
  const w = page({ auth: PEGGY, seed: { 'siyl.docs': { guests: { [PEGGY.guestId]: { passport: { filename: 'p.jpg', receivedAt: '2026-10-01T10:00:00.000Z' } } } } } });
  w.window = w; w.open = () => null;
  let release; w.fetch = () => new Promise((ok) => { release = ok; });
  const p = w.SIYL_DOCS.open(PEGGY.guestId, 'passport');
  w.localStorage.setItem('siyl.auth', JSON.stringify({ ...PEGGY, guestId: 'g-other', bearer: 'b'.repeat(64) }));
  release({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([JPEG])) });
  const r = await p;
  assert.deepEqual([r.ok, r.reason], [false, 'session']);
});

test('GUEST RELATIONS · the overview and the viewer are read-only commands on the existing routes; temporary copies are private and swept', () => {
  const g = src('src/gr.cjs');
  assert.match(g, /case 'documents': return documentsOverview/); assert.match(g, /case 'documents-open': return documentsOpen/); assert.match(g, /case 'documents-clean'/);
  assert.match(g, /grJson\('\/api\/gr\/documents\/retention'\)/); assert.match(g, /'\/api\/gr\/documents\?invitation='/); assert.match(g, /'\/api\/gr\/document\?key='/);
  assert.match(g, /fs\.chmodSync\(dir, 0o700\)/); assert.match(g, /mode: 0o600, flag: 'wx'/); assert.match(g, /spawn\('open', \[file\]/);
  assert.doesNotMatch(g.slice(g.indexOf('/* ---- THE DOCUMENTS'), g.indexOf('(async () => {')), /method: '(POST|PUT|DELETE)'/, 'nothing writes');
});

test('THE SECOND REVIEW · an open viewer closes on sign-out; a broken download closes its tab and returns the button; equal timestamps list and open the same copy; the GR copy deletes itself', async () => {
  /* 1 · rendered, then signed out: the viewer tab closes, its URL is released */
  const seed = { 'siyl.docs': { guests: { [PEGGY.guestId]: { passport: { filename: 'p.jpg', receivedAt: '2026-10-01T10:00:00.000Z' } } } } };
  const w = page({ auth: PEGGY, seed }); w.window = w;
  const tab = { closed: false, document: { body: {} }, location: {}, close() { this.closed = true; } };
  w.open = () => tab; w.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  w.fetch = () => Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(new Blob([JPEG])) });
  const r = await w.SIYL_DOCS.open(PEGGY.guestId, 'passport');
  assert.equal(r.ok, true); assert.equal(tab.location.href, 'blob:x'); assert.equal(tab.closed, false);
  assert.match(src('assets/docs.js'), /o\.url = null; o\.timer = null; \}, VIEW_TTL\)/, 'the expiry keeps the tab tracked');
  w.document.dispatchEvent(new w.CustomEvent('siyl:signout'));
  assert.equal(tab.closed, true, 'signed out: the viewer is closed');
  /* 2 · the body fails: the waiting tab closes, the answer is a failure (the button is given back) */
  const w2 = page({ auth: PEGGY, seed }); w2.window = w2; const t2 = { closed: false, document: { body: {} }, close() { this.closed = true; } };
  w2.open = () => t2; w2.fetch = () => Promise.resolve({ ok: true, status: 200, blob: () => Promise.reject(new Error('cut')) });
  const r2 = await w2.SIYL_DOCS.open(PEGGY.guestId, 'passport');
  assert.deepEqual([r2.ok, r2.reason, t2.closed], [false, 'unreachable', true]);
  /* 3 · two copies with the same timestamp: the one Guest Relations lists as current is the one it can open */
  const h = await harness();
  const at = '2026-10-01T10:00:00.000Z', mk = (d, b) => h.env.DOCS.m.set('doc/INV-G001/G001/passport/' + at + '-' + d, { key: 'doc/INV-G001/G001/passport/' + at + '-' + d, bytes: new Uint8Array([b]), size: 1, httpMetadata: { contentType: 'image/jpeg' }, customMetadata: { guestId: 'G001', kind: 'passport', filename: d + '.jpg', receivedAt: at } });
  mk('b'.repeat(12), 2); mk('a'.repeat(12), 1);
  const gr = { 'x-gr-token': 'gr-secret' };
  const list = await (await h.get('/api/gr/documents?invitation=INV-G001', null, { headers: gr })).json();
  assert.equal((await h.get('/api/gr/document?key=' + encodeURIComponent(list.documents[0].key), null, { headers: gr })).status, 200, 'listed current = openable');
  const own = await h.get('/api/document/mine?kind=passport', h.peggy); assert.deepEqual([...new Uint8Array(await own.arrayBuffer())], [2], 'the guest sees the same copy');
  /* 4 · the GR viewer's temporary copy deletes itself after an hour */
  assert.match(src('src/gr.cjs'), /spawn\(process\.execPath, \['-e', 'setTimeout\(\(\) => require\("fs"\)\.rmSync\(process\.argv\[1\]/);
});
