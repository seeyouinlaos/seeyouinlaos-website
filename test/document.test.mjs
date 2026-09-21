/* PASSPORT / TRAVEL DOCUMENTS (the close-out pass, 21 Sep 2026) — the real feature traced end to end.
   The Worker's POST /api/document: authenticated by the invitation's bearer and owned by the guest named (a partner of the
   same COUPL is refused); a passport or a flight; JPEG · PNG · HEIC · HEIF · WebP · PDF; 12 MB at most; bytes go to the
   private object store bound as DOCS under doc/<invitation>/<guest>/<kind>/…, with the guest's own metadata; RECEIVED is
   the only word. There is deliberately NO read route, public or otherwise; nothing is written to KV, the repository or a
   log. Without the DOCS binding the endpoint answers 503 · enabled:false and the guest is told so — never a false receipt. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { ROOT, src } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix)).map((name) => ({ name })) }), delete: async (k) => { m.delete(k); } }; }
function r2() { const m = new Map(); return { m, put: async (k, bytes, o) => { m.set(k, { key: k, bytes: new Uint8Array(bytes), size: bytes.byteLength, ...o }); }, get: async (k) => (m.has(k) ? { ...m.get(k), body: new Blob([m.get(k).bytes]).stream() } : null), list: async ({ prefix }) => ({ objects: [...m.values()].filter((o) => o.key.startsWith(prefix || '')).map((o) => ({ key: o.key, size: o.size, uploaded: new Date('2026-09-21T00:00:00Z'), httpMetadata: o.httpMetadata, customMetadata: o.customMetadata })), truncated: false }) }; }
async function harness(withDocs) {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-peggy-doc'), steffie = await bearerOf('demo-steffie-doc');
  const entries = {}; entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' }; entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  const env = { ASSETS: await assetsFor(entries), REG_KV: kv(), GR_TOKEN: 'gr-secret' }; if (withDocs) env.DOCS = r2();
  const logs = []; const realLog = console.log, realErr = console.error; console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' '));
  return { w, env, peggy, steffie, logs, done: () => { console.log = realLog; console.error = realErr; } };
}
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, ...Array(500).fill(7), 0xff, 0xd9]);
const send = (h, bearer, headers, body) => h.w.fetch(new Request(ORIGIN + '/api/document', { method: 'POST', headers: { 'content-type': 'image/jpeg', 'x-invitation': 'INV-G001', 'x-guest': 'G001', 'x-kind': 'passport', 'x-filename': 'passport.jpg', ...(bearer ? { 'x-siyl-auth': bearer } : {}), ...headers }, body: body === undefined ? JPEG : body }), h.env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));

test('AUTH · no bearer 401; the partner of the same COUPL cannot upload for the guest (401); a wrong kind 400; an unsupported type 415; an empty file 400; over 12 MB 413', async () => {
  const h = await harness(true);
  try {
    assert.equal((await send(h, null, {})).status, 401);
    assert.equal((await send(h, h.steffie, {})).status, 401, 'Steffie is not Peggy — couple isolation');
    assert.equal((await send(h, h.peggy, { 'x-guest': 'G002', 'x-invitation': 'INV-G002' })).status, 401, 'Peggy cannot upload as Steffie');
    assert.equal((await send(h, h.peggy, { 'x-kind': 'visa' })).status, 400);
    assert.equal((await send(h, h.peggy, { 'content-type': 'text/plain' })).status, 415);
    assert.equal((await send(h, h.peggy, { 'content-type': 'application/x-msdownload' })).status, 415);
    assert.equal((await send(h, h.peggy, {}, new Uint8Array(0))).status, 400);
    assert.equal((await send(h, h.peggy, {}, new Uint8Array(12 * 1024 * 1024 + 1))).status, 413);
    assert.equal(h.env.DOCS.m.size, 0, 'nothing stored by a refused request');
  } finally { h.done(); }
});

test('STORE · with the private object store bound: 201 RECEIVED, the key under the guest\'s own invitation and id, the metadata the guest\'s own, a PDF too, a replacement is a new object (never overwritten in place); nothing in KV; no file content in any log', async () => {
  const h = await harness(true);
  try {
    const r = await send(h, h.peggy, {}); assert.equal(r.status, 201); assert.equal(r.d.status, 'RECEIVED'); assert.match(r.d.key, /^doc\/INV-G001\/G001\/passport\/\d{4}-\d{2}-\d{2}T[^/]+-[0-9a-f]{12}$/); assert.equal(r.d.bytes, JPEG.length); assert.match(r.d.sha256, /^[0-9a-f]{64}$/);
    const stored = h.env.DOCS.m.get(r.d.key); assert.ok(stored); assert.equal(stored.httpMetadata.contentType, 'image/jpeg'); assert.deepEqual([stored.customMetadata.invitationId, stored.customMetadata.guestId, stored.customMetadata.kind, stored.customMetadata.filename], ['INV-G001', 'G001', 'passport', 'passport.jpg']);
    const pdf = await send(h, h.peggy, { 'content-type': 'application/pdf', 'x-filename': 'passport.pdf' }, new TextEncoder().encode('%PDF-1.4 ' + 'x'.repeat(300)));
    assert.equal(pdf.status, 201); assert.notEqual(pdf.d.key, r.d.key, 'a replacement is its own object — the earlier one is not overwritten by the client');
    const flight = await send(h, h.peggy, { 'x-kind': 'flight', 'content-type': 'image/heic' }); assert.equal(flight.status, 201); assert.match(flight.d.key, /\/flight\//);
    assert.equal(h.env.REG_KV.m.size, 0, 'no document byte or key reaches KV');
    assert.ok(!h.logs.some((l) => /JFIF|%PDF|base64/.test(l)), 'no file content in a log');
  } finally { h.done(); }
});

test('NO GUEST READ ROUTE · GET / HEAD on /api/document 405; the stored key is no URL of the Worker (never bytes); the Guest Relations routes answer the GR token only — a guest\'s bearer is refused, no token is refused', async () => {
  const h = await harness(true);
  try {
    const r = await send(h, h.peggy, {}); assert.equal(r.status, 201);
    for (const m of ['GET', 'HEAD', 'PUT', 'DELETE']) { const x = await h.w.fetch(new Request(ORIGIN + '/api/document', { method: m, headers: { 'x-siyl-auth': h.peggy } }), h.env); assert.equal(x.status, 405, m); }
    for (const p of ['/' + r.d.key, '/api/document/' + encodeURIComponent(r.d.key), '/api/documents', '/doc/INV-G001/G001/passport/']) { const x = await h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-siyl-auth': h.peggy } }), h.env); assert.ok(x.status !== 200 || !/image|pdf/.test(x.headers.get('content-type') || ''), p + ' never serves the bytes'); }
    for (const p of ['/api/gr/document?key=' + encodeURIComponent(r.d.key), '/api/gr/documents?invitation=INV-G001']) {
      assert.equal((await h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-siyl-auth': h.peggy } }), h.env)).status, 401, p + ': a guest cannot use the Guest Relations route');
      assert.equal((await h.w.fetch(new Request(ORIGIN + p), h.env)).status, 401, p + ': no token');
      assert.equal((await h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-gr-token': 'wrong' } }), h.env)).status, 401, p + ': a wrong token');
      assert.equal((await h.w.fetch(new Request(ORIGIN + p, { method: 'POST', headers: { 'x-gr-token': 'gr-secret' } }), h.env)).status, 405, p + ': read only');
    }
    const worker = src('src/worker.js').replace(/\/\*[\s\S]*?\*\//g, '');
    const guestFacing = worker.slice(0, worker.indexOf('async function handleGrDocuments')).replace(/const DOC_RETENTION[\s\S]*?async function handleGrRetention[\s\S]*?\n\}\n/, '');   /* the retention purge and its Guest Relations report are not guest-facing */
    assert.doesNotMatch(guestFacing, /DOCS\.(get|list|head)\(/, 'no guest-facing code reads the store');
    assert.doesNotMatch(guestFacing, /DOCS\.delete\(/, 'no request of a guest, and no Guest Relations request, deletes a document — only the retention clock (test/retention.test.mjs)');
  } finally { h.done(); }
});

test('GUEST RELATIONS RETRIEVAL (Owner, 21 Sep 2026): the metadata of ONE invitation (never everyone), newest first; one object streamed through the Worker by its exact key — the bytes, the type, a download name, private no-store; a prefix or a wildcard is refused; a missing key is 404; no body and no token in any log', async () => {
  const h = await harness(true);
  try {
    const a = await send(h, h.peggy, {}); const b = await send(h, h.peggy, { 'content-type': 'application/pdf', 'x-filename': 'passport.pdf' }, new TextEncoder().encode('%PDF-1.4 ' + 'x'.repeat(300)));
    const f = await send(h, h.peggy, { 'x-kind': 'flight', 'x-filename': 'ticket.png', 'content-type': 'image/png' }, new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
    const gr = (p) => h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-gr-token': 'gr-secret' } }), h.env);
    let r = await gr('/api/gr/documents?invitation=INV-G001'); assert.equal(r.status, 200); assert.equal(r.headers.get('cache-control'), 'private, no-store'); const d = await r.json();
    assert.equal(d.count, 3); assert.deepEqual(d.documents.map((x) => x.key).sort(), [a.d.key, b.d.key, f.d.key].sort());
    const pdf = d.documents.find((x) => x.key === b.d.key); assert.deepEqual({ ...pdf, receivedAt: '' }, { key: b.d.key, guestId: 'G001', kind: 'passport', filename: 'passport.pdf', type: 'application/pdf', bytes: 309, receivedAt: '', sha256: b.d.sha256 });
    assert.ok(!JSON.stringify(d).includes('%PDF') && !JSON.stringify(d).includes('JFIF'), 'metadata only — never a byte');
    assert.equal((await gr('/api/gr/documents?invitation=INV-G002').then((x) => x.json())).count, 0, 'the partner\'s invitation has nothing — documents belong to the guest');
    assert.equal((await gr('/api/gr/documents')).status, 400, 'no invitation, no listing of everyone'); assert.equal((await gr('/api/gr/documents?invitation=INV-')).status, 400);
    r = await gr('/api/gr/document?key=' + encodeURIComponent(a.d.key)); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/jpeg'); assert.equal(r.headers.get('cache-control'), 'private, no-store'); assert.match(r.headers.get('content-disposition'), /^attachment; filename="passport\.jpg"$/); assert.equal(r.headers.get('x-document-sha256'), a.d.sha256);
    const bytes = new Uint8Array(await r.arrayBuffer()); assert.equal(bytes.length, JPEG.length); assert.equal(Buffer.compare(Buffer.from(bytes), Buffer.from(JPEG)), 0, 'the exact bytes, streamed');
    r = await gr('/api/gr/document?key=' + encodeURIComponent(b.d.key)); assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'application/pdf');
    for (const bad of ['doc/INV-G001/', 'doc/INV-G001/G001/passport/', 'doc/INV-G001/G001/passport/*', a.d.key + '/../x', '', 'reg:INV-G001']) assert.equal((await gr('/api/gr/document?key=' + encodeURIComponent(bad))).status, 400, 'refused: ' + JSON.stringify(bad));
    assert.equal((await gr('/api/gr/document?key=' + encodeURIComponent(a.d.key.replace(/[0-9a-f]{12}$/, '000000000000')))).status, 404);
    assert.ok(!h.logs.some((l) => /JFIF|%PDF|base64|gr-secret/.test(l)), 'no body, no token in a log');
    assert.equal(h.env.DOCS.m.size, 3, 'a read changes nothing');
  } finally { h.done(); }
});

test('WITHOUT THE STORE (a Worker without the binding): 503 · enabled:false, nothing stored, and the guest surface says so — never a false receipt; WITH IT (the live configuration, 21 Sep 2026): ONE private bucket bound as DOCS, documented in the frozen manifest with no public access and no deletion; the client picker accepts the same types; nothing passport-like is in the repository', async () => {
  const h = await harness(false);
  try {
    const r = await send(h, h.peggy, {}); assert.equal(r.status, 503); assert.equal(r.d.enabled, false); assert.equal(r.d.error, 'document storage is not enabled yet');
    const wj = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(wj, /"r2_buckets": \[\s*\{ "binding": "DOCS", "bucket_name": "siyl-docs" \}\s*\]/, 'ONE private bucket, bound as DOCS, on the one Worker'); assert.equal((wj.match(/"binding": "DOCS"/g) || []).length, 1);
    const M = JSON.parse(readFileSync(join(ROOT, 'infra/PRODUCTION.json'), 'utf8')); assert.deepEqual({ ...M.r2[0], retention: undefined }, { binding: 'DOCS', bucket: 'siyl-docs', public: false, retention: undefined }, 'the frozen manifest documents it: private'); assert.deepEqual([M.r2[0].retention.journeyEnd, M.r2[0].retention.days, M.r2[0].retention.purgeFrom], ['2027-03-08', 30, '2027-04-07'], 'the Owner\'s retention decision (21 Sep 2026): thirty days after the journey ends — 7 April 2027');
    assert.match(src('src/infra-guard.cjs'), /R2 bindings changed/, 'the guard pins the binding');
    assert.match(src('about-you.html'), /We cannot accept documents on the website yet\. Nothing was sent and nothing was stored\. Your trip can still be sent — Guest Relations will ask you for this directly\./);
    assert.match(src('assets/docs.js'), /var ACCEPT = 'image\/jpeg,image\/png,image\/heic,image\/heif,image\/webp,application\/pdf';/); assert.match(src('assets/docs.js'), /MAX: 12 \* 1024 \* 1024/);
    assert.match(src('about-you.html'), /<input type="file" accept="'\+D\.ACCEPT\+'" hidden>/, 'the iPhone picker: the file input with the accepted types');
    assert.doesNotMatch(src('assets/docs.js'), /localStorage\.setItem\([^)]*base64|readAsDataURL/, 'the file itself never enters the browser\'s storage');
    for (const d of ['docs', 'documents', 'passports']) assert.equal(existsSync(join(ROOT, d)) && readFileSync(join(ROOT, '.gitignore'), 'utf8').includes(d) === false, false);
  } finally { h.done(); }
});
