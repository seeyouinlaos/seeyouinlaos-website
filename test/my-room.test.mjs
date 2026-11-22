/* ============================================================================
   MY ROOM ON THE SITE PLAN (Owners, 22 Nov 2026 · HS-058.7) — the guest's own building and hotel room number in My Profile,
   on the same site plan as the public venue; nothing personal in any public file. Synthetic guests and synthetic unit → number
   pairs only (none is a real assignment).
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doState } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';

const src = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '');
const ask = async (rooms, body, headers) => { const r = await rooms.fetch(new Request('https://rooms/api/rooms/gr-own-room', { method: 'POST', headers: { 'content-type': 'application/json', ...(headers || {}) }, body: JSON.stringify(body) })); return { status: r.status, j: await r.json() }; };
const hold = (rooms, key, label, gid, extra) => rooms.storage.put('occ:' + key + '|' + label + '|' + gid, { invitationId: 'INV-' + gid, partyId: 'INV-P' + gid, name: 'N' + gid.slice(-3), at: '2026-11-22T00:00:00Z', ...(extra || {}) });

test('THE ENGINE · gr-own-room answers one verified guest id: only that guest\'s Souphattra places, each with the number assigned to its unit (or none) — never anyone else\'s', async () => {
  const rooms = new Rooms(doState());
  await hold(rooms, 'wedstay/heritage-executive', 'M', 'G901');
  await hold(rooms, 'prewed/heritage-grand-premier', 'A', 'G901');
  await hold(rooms, 'wedstay/heritage-executive', 'M', 'G902');          /* a room-mate: never in G901's answer */
  await hold(rooms, 'bkk-stay/u-sathorn', 'A', 'G901');                 /* another hotel: not on this plan */
  /* a pairing the official list refuses (101 is the Noble Courtyard Suite, never a Heritage Executive): it cannot be a real assignment */
  await rooms.storage.put('hotelrooms', { version: 1, rooms: { 'wedstay/heritage-executive|M': ['101'] } });
  assert.equal((await ask(rooms, { guestId: 'G901' })).status, 401, 'without the Worker\'s verification nothing is answered');
  const r = await ask(rooms, { guestId: 'G901' }, { 'x-gr-verified': 'yes' });
  assert.equal(r.status, 200);
  const by = Object.fromEntries(r.j.stays.map((s) => [s.stage, s]));
  assert.deepEqual(Object.keys(by).sort(), ['prewed', 'wedstay'], 'only the two Souphattra stages');
  assert.deepEqual([by.wedstay.hotelRoom.building, by.wedstay.hotelRoom.display], ['B', '101'], 'an assigned unit: its building and number');
  assert.equal(by.prewed.hotelRoom, null, 'a unit without a number: nothing is guessed');
  assert.doesNotMatch(JSON.stringify(r.j), /G902|NG902/, 'no other guest appears');
  assert.equal((await ask(rooms, { guestId: 'x' }, { 'x-gr-verified': 'yes' })).status, 400);
  /* the public room routes never carry it: not a Guest Relations op the Worker forwards with the token */
  assert.doesNotMatch(src('src/worker.js').match(/const GR_ROOMS_OPS = \[[^\]]*\]/)[0], /gr-own-room/);
});

test('THE ROUTE · /api/my-room: GET only, the bearer\'s own guest, no id or query read from the request, never cached in a shared cache, an allowlist of fields', () => {
  const w = code('src/worker.js'), i = w.indexOf("url.pathname === '/api/my-room'"), r = w.slice(i, w.indexOf("url.pathname === '/api/pre-wedding-dinner'", i));
  assert.ok(i > 0, 'the route exists');
  assert.match(r, /if \(request\.method !== 'GET'\) return json/);
  assert.match(r, /const who = await identify\(request, env\);\s*if \(!who\) return json\(\{ ok: false, error: 'unauthorised' \}, 401, priv\);/);
  assert.match(r, /body: JSON\.stringify\(\{ guestId: who\.guestId \}\)/, 'the guest id is the bearer\'s');
  assert.doesNotMatch(r, /url\.searchParams|request\.json\(|request\.text\(/, 'nothing the client sends chooses the guest');
  assert.match(r, /'cache-control': 'private, no-store'/);
  assert.match(r, /const ok = !!x\.hotelRoom && isConfirmed\(x\);\s*return \{ stage: x\.stage, name: x\.name, bed: !!x\.bed, souphattra: [^,]+, confirmed: isConfirmed\(x\),\s*building: ok \? x\.hotelRoom\.building : null, room: ok \? x\.hotelRoom\.display : null, suite: ok && !!x\.hotelRoom\.suite \};/, 'only the card\'s fields — building and number only for a CONFIRMED booking (Owners, 22 Nov 2026)');
  assert.match(r, /if \(reg && conf && confirmationStands\(conf, reg\)\) for \(const k of sentStays\(reg\)\) confirmedRooms\.add\(k\);/, 'a confirmation that stands, for the rooms its trip carried');
  assert.match(r, /if \(ownerBookingState\(rec\) !== OWNER_BOOKING_STATE\.CONFIRMED\) continue;/, 'an Owners\' booking counts only when CONFIRMED');
  assert.doesNotMatch(r, /writeConfirmation|applyAction|REG_KV\.put|\.put\(/, 'nothing is written or confirmed here');
});

test('THE PROFILE · the same plan, the guest\'s building marked "Your Building", the number in the guest\'s own card, a neutral note without a number; nothing personal in any public file', () => {
  const js = code('assets/my-room.js');
  assert.match(js, /var API = '\/api\/my-room';/); assert.match(js, /'x-siyl-auth': a\.bearer/);
  assert.match(js, /V\.wirePlan\(fig, plan, decorateFor\(current\(st\.data\)\)\)/, 'the public plan primitive, reused — no second drawing');
  assert.match(js, /r\.classList\.add\('sp-mine'\);/); assert.match(js, /\['YOUR', 'BUILDING'\]/);
  assert.match(js, /cur\.building && cur\.room/, 'building and number only for an assigned unit');
  assert.match(src('assets/my-room.js'), /Your building and room number appear here as soon as/);
  assert.match(js, /data-mr-stay/, 'two stays: a switch');
  assert.match(js, /b\.bearer !== bearer\) return null;/, 'an answer for another session is dropped'); assert.match(js, /window\.addEventListener\('storage', function \(e\) \{ if \(e\.key === 'siyl\.auth'\) reset\(\); \}\);/);
  assert.doesNotMatch(js, /cur\.label/, 'never a bare unit letter next to a plan lettered A–F');
  /* every official hotel number, as a word: none may stand in a public file outside a geometry attribute */
  const NOS = [...src('src/hotel-rooms.js').matchAll(/\['(\d{3})', '[A-F]'/g)].map((m) => m[1]);
  assert.ok(NOS.length >= 27);
  const scrub = (t) => t.replace(/<style>[\s\S]*?<\/style>/, '').replace(/\?v=[0-9a-f]{8}/g, '').replace(/\s(?:x|y|width|height|d|viewBox)="[^"]*"/g, '');
  for (const f of ['assets/my-room.js', 'assets/venue.js', 'assets/venue-data.js', 'assets/venue.css', 'assets/images/venue/souphattra-site-plan.svg', 'profile.html']) {
    const t = scrub(src(f));
    for (const n of NOS) assert.doesNotMatch(t, new RegExp('(?<![\\w.#-])' + n + '(?![\\w.%-])'), f + ': no hotel number ' + n);
    assert.doesNotMatch(t, /\bG\d{3}\b/, f + ': no guest id');
  }
  for (const f of ['assets/admin-assign.js', 'assets/admin-billing.js']) assert.doesNotMatch(src(f), /hotel room \d{3}|suite \d{3} \+ \d{3}/, f + ': the served admin scripts name no real number');
  const svg = src('assets/images/venue/souphattra-site-plan.svg');
  assert.deepEqual([...svg.matchAll(/data-building="([A-F])"/g)].map((m) => m[1]).sort(), ['A', 'B', 'C', 'D', 'E', 'F'], 'each building identifiable on the one drawing');
  const pr = src('profile.html');
  assert.match(pr, /\+yourStay\(me\)\+\(MR\?MR\.html\(\):''\)\+arrangements\(me\)\+/);
  assert.match(pr, /<script src="assets\/venue-data\.js[^"]*"><\/script>\n<script src="assets\/venue\.js[^"]*"><\/script>\n<script src="assets\/my-room\.js/);
  assert.match(src('assets/venue.css'), /\.sp \.sp-bldg\.sp-mine \{ fill: #EAD9CC; stroke: #8A5A55; stroke-width: 3; \}/);
});
