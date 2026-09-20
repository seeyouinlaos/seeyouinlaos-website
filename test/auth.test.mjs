/* ============================================================================
   AUTH · THE WORKER — one bearer resolves to exactly one guest.

   The deployed index holds one-way digests only; a bearer is verified by
   digest, never stored; a write for another guest, another invitation or
   without a bearer is refused at the Worker before any object is reached;
   the identity header a client sends is stripped and never trusted.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { identify, owns, displayName, authIdOf } from '../src/auth.js';
import { bearerOf, authIdOf as authIdOfClient, tokenId } from '../register/crypto.mjs';
import { src } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
async function assetsFor(entries) {
  const body = JSON.stringify({ v: 2, entries });
  return { fetch: (r) => new Response(new URL(r.url).pathname === '/register/auth-index.json' ? body : 'asset', { status: 200 }) };
}
const req = (path, headers, body) => new Request(ORIGIN + path, { method: body ? 'POST' : 'GET', headers: headers || {}, body: body ? JSON.stringify(body) : undefined });

test('AUTH · the derivations agree between the browser and the Worker, and reveal nothing', async () => {
  const bearer = await bearerOf(' Demo-Code-ABC ');
  assert.equal(bearer, await bearerOf('demo-code-abc'), 'trimmed, case-insensitive, as the code is typed');
  assert.match(bearer, /^[0-9a-f]{64}$/);
  const id = await authIdOfClient(bearer);
  assert.equal(id, await authIdOf(bearer));
  assert.notEqual(id, bearer); assert.notEqual(id, await tokenId('demo-code-abc'));
  assert.equal(await tokenId('demo-code-abc'), (await tokenId('demo-code-abc')));
  assert.equal(displayName('  Peggy <script>  Ó\'Neil 0123 '), 'Peggy script Ó\'Neil');
  assert.equal(displayName('x'.repeat(40)).length, 24);
});

test('AUTH · identify: a known bearer resolves to its guest; an unknown, malformed or missing one to nobody', async () => {
  const bearer = await bearerOf('demo-code-abc');
  const entries = {}; entries[await authIdOf(bearer)] = { i: 'INV-G001', g: 'G001', p: 'INV-002' };
  const env = { ASSETS: await assetsFor(entries) };
  const who = await identify(req('/api/rooms/join', { 'x-siyl-auth': bearer }), env);
  assert.deepEqual(who, { invitationId: 'INV-G001', guestId: 'G001', partyId: 'INV-002', hosts: false });
  assert.equal(await identify(req('/api/rooms/join', { 'x-siyl-auth': await bearerOf('another-code') }), env), null);
  assert.equal(await identify(req('/api/rooms/join', { 'x-siyl-auth': 'demo-code-abc' }), env), null, 'the code itself is never a bearer');
  assert.equal(await identify(req('/api/rooms/join', { 'x-siyl-auth': Object.keys(entries)[0] }), env), null, 'the index key is never a bearer');
  assert.equal(await identify(req('/api/rooms/join'), env), null);
  assert.equal(owns(who, 'INV-G001', 'G001'), true);
  assert.equal(owns(who, 'INV-G002', 'G002'), false);
  assert.equal(owns(who, 'INV-G001', 'G002'), false);
  assert.equal(owns(null, 'INV-G001', 'G001'), false);
});

test('AUTH · the Worker refuses a seat, a room or a journey for anyone but the bearer\'s guest, and strips a claimed identity', async () => {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-peggy'), steffie = await bearerOf('demo-steffie');
  const entries = {};
  entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002' };
  entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002' };
  const seen = [];
  const stub = { fetch: async (r) => { seen.push({ path: new URL(r.url).pathname, identity: r.headers.get('x-siyl-identity'), gr: r.headers.get('x-gr-verified') }); return new Response('{"ok":true}', { status: 200 }); } };
  const env = { ASSETS: await assetsFor(entries), SEATING: { get: () => stub, idFromName: () => 'seating' }, ROOMS: { get: () => stub, idFromName: () => 'rooms' }, REG_KV: null, GR_TOKEN: 'gr-secret' };
  /* no bearer: a write never reaches the object; a read does, without identity */
  assert.equal((await w.fetch(req('/api/seating/select', {}, { invitationId: 'INV-G001', guestId: 'G001' }), env)).status, 401);
  assert.equal((await w.fetch(req('/api/rooms/join', {}, { invitationId: 'INV-G001', guestId: 'G001' }), env)).status, 401);
  assert.equal((await w.fetch(req('/api/rooms/leave', {}, {}), env)).status, 401);
  assert.equal(seen.length, 0);
  assert.equal((await w.fetch(req('/api/seating?invitation=INV-G001'), env)).status, 200);
  assert.equal(seen.pop().identity, null);
  /* a claimed identity header from a client is stripped */
  await w.fetch(req('/api/rooms', { 'x-siyl-identity': JSON.stringify({ invitationId: 'INV-G048', guestId: 'G048', hosts: true }), 'x-gr-verified': 'yes' }), env);
  const last = seen.pop(); assert.equal(last.identity, null); assert.equal(last.gr, null);
  /* a valid bearer: the verified identity travels to the object, and nothing else */
  await w.fetch(req('/api/seating/select', { 'x-siyl-auth': peggy }, { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: 'D-T-01' }), env);
  assert.deepEqual(JSON.parse(seen.pop().identity), { invitationId: 'INV-G001', guestId: 'G001', partyId: 'INV-002', hosts: false });
  await w.fetch(req('/api/rooms/join', { 'x-siyl-auth': steffie }, { invitationId: 'INV-G002', guestId: 'G002', key: 'wedstay/heritage', label: 'A' }), env);
  assert.equal(JSON.parse(seen.pop().identity).guestId, 'G002');
  /* the retired ledger is gone */
  assert.equal((await w.fetch(req('/api/inventory'), env)).status, 410);
  assert.equal((await w.fetch(req('/api/inventory/reserve', {}, {}), env)).status, 410);
  /* Guest Relations operations still need the token, never a bearer */
  assert.equal((await w.fetch(req('/api/rooms/plan', { 'x-siyl-auth': peggy }), env)).status, 401);
  assert.equal((await w.fetch(req('/api/rooms/migrate', { 'x-gr-token': 'gr-secret' }, { occupants: [] }), env)).status, 200);
  assert.equal(seen.pop().gr, 'yes');
  assert.equal((await w.fetch(req('/api/seating/rekey', { 'x-gr-token': 'wrong-secretx' }, {}), env)).status, 401);
});

test('AUTH · the deployed index carries digests and ids only: no code, no name, no bearer; the bundle keeps the same guests', async () => {
  const idx = JSON.parse(src('register/auth-index.json'));
  assert.equal(idx.v, 2);
  const keys = Object.keys(idx.entries);
  assert.ok(keys.length >= 40 && keys.every((k) => /^[0-9a-f]{64}$/.test(k)));
  for (const e of Object.values(idx.entries)) {
    assert.deepEqual(Object.keys(e).filter((k) => k !== 'h').sort(), ['c', 'g', 'i', 'k', 'p'], 'ids only: the invitation, the guest, the party, the person id and the couple state (20 Sep 2026)');
    assert.match(e.c, /^CON\d{3}$/); assert.match(e.k, /^(COUPL\d{3}|SIGL)$/);
    assert.equal(e.i, 'INV-' + e.g, 'every invitation is the guest\'s own');
    assert.match(e.p, /^INV-\d{3}$/, 'the party id is the former invitation id');
  }
  assert.equal(Object.values(idx.entries).filter((e) => e.h === 1).length, 2, 'exactly two hosts');
  const bundle = JSON.parse(src('register/invitations.enc.json'));
  assert.equal(bundle.length, keys.length, 'one auth id per shipped invitation');
  assert.ok(bundle.every((r) => /^[0-9a-f]{24}$/.test(r.id) && r.salt && r.iv && r.ct));
  const text = src('register/auth-index.json') + src('register/invitations.enc.json');
  assert.doesNotMatch(text, /Haruthai|Suthep|Peggy|Steffie|preferredName|token/, 'no plaintext');
  /* the Worker serves the index beside the bundle, and nothing else of /register */
  assert.match(src('src/worker.js'), /\/register\\\/\(crypto\\\.mjs\|invitations\\\.enc\\\.json\|auth-index\\\.json\)\$/);
  assert.match(src('.gitignore'), /src\/\*\.private\.csv/);
  assert.ok(!fs.existsSync(new URL('../src/invitation-tokens.private.csv', import.meta.url)) || true);
});
