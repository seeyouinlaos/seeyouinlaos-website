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
function r2() { const m = new Map(); return { m, put: async (k, bytes, o) => { m.set(k, { bytes: new Uint8Array(bytes), ...o }); }, get: async (k) => (m.has(k) ? m.get(k) : null) }; }
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

test('NO READ ROUTE · GET / HEAD on /api/document 405; the stored key is no URL of the Worker (404/redirect, never bytes); no Guest Relations read route exists yet', async () => {
  const h = await harness(true);
  try {
    const r = await send(h, h.peggy, {}); assert.equal(r.status, 201);
    for (const m of ['GET', 'HEAD', 'PUT', 'DELETE']) { const x = await h.w.fetch(new Request(ORIGIN + '/api/document', { method: m, headers: { 'x-siyl-auth': h.peggy } }), h.env); assert.equal(x.status, 405, m); }
    for (const p of ['/' + r.d.key, '/api/document/' + encodeURIComponent(r.d.key), '/api/documents', '/doc/INV-G001/G001/passport/']) { const x = await h.w.fetch(new Request(ORIGIN + p, { headers: { 'x-siyl-auth': h.peggy } }), h.env); assert.ok(x.status !== 200 || !/image|pdf/.test(x.headers.get('content-type') || ''), p + ' never serves the bytes'); }
    const gr = await h.w.fetch(new Request(ORIGIN + '/api/gr/document?key=' + encodeURIComponent(r.d.key), { headers: { 'x-gr-token': 'gr-secret' } }), h.env); assert.notEqual(gr.status, 200, 'no Guest Relations read route is defined (an Owner decision)');
    assert.doesNotMatch(src('src/worker.js').replace(/\/\*[\s\S]*?\*\//g, ''), /DOCS\.(get|list|head)\(/, 'the Worker never reads the store');
  } finally { h.done(); }
});

test('WITHOUT THE STORE (the live configuration today): 503 · enabled:false, nothing stored, and the guest surface says so — never a false receipt; the client picker accepts the same types; nothing passport-like is in the repository', async () => {
  const h = await harness(false);
  try {
    const r = await send(h, h.peggy, {}); assert.equal(r.status, 503); assert.equal(r.d.enabled, false); assert.equal(r.d.error, 'document storage is not enabled yet');
    assert.doesNotMatch(readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8'), /"DOCS"|r2_buckets/, 'the DOCS binding is not configured on the one Worker');
    assert.match(src('about-you.html'), /We cannot accept documents on the website yet\. Nothing was sent and nothing was stored\. Your trip can still be sent — Guest Relations will ask you for this directly\./);
    assert.match(src('assets/docs.js'), /var ACCEPT = 'image\/jpeg,image\/png,image\/heic,image\/heif,image\/webp,application\/pdf';/); assert.match(src('assets/docs.js'), /MAX: 12 \* 1024 \* 1024/);
    assert.match(src('about-you.html'), /<input type="file" accept="'\+D\.ACCEPT\+'" hidden>/, 'the iPhone picker: the file input with the accepted types');
    assert.doesNotMatch(src('assets/docs.js'), /localStorage\.setItem\([^)]*base64|readAsDataURL/, 'the file itself never enters the browser\'s storage');
    for (const d of ['docs', 'documents', 'passports']) assert.equal(existsSync(join(ROOT, d)) && readFileSync(join(ROOT, '.gitignore'), 'utf8').includes(d) === false, false);
  } finally { h.done(); }
});
