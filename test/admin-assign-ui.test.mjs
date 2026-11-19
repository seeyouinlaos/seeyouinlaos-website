/* ============================================================================
   THE H&S ADMIN CONSOLE · SEATING MANAGEMENT & ROOM ASSIGNMENTS (Owners, 18 Nov 2026) — assets/admin-assign.js as the page loads
   it (before assets/admin-billing.js), against a fake server whose answer is built by the real engines (src/seating.js,
   src/rooms.js, src/billing/assignments.js). Fictional guests (G9xx) only.
     · the two tabs; the ceremony 52 chairs + the couple's two places, the dinner 54 chairs; capacity 54
     · a change is a draft in this page until confirmed: review = a dry run, confirm = one write with what was seen
     · a conflict reads again and keeps the draft; nothing is ever sent without the Owner's click
     · the exports: the confirmed state only, the event, its date and the release status, no code, no contact, no invitation id
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, SUTHEP, doState } from './sandbox.mjs';
import { Seating } from '../src/seating.js';
import { Rooms } from '../src/rooms.js';
import { rosterOf, staysOf, hotelRoomsMeta, hotelChecksOf, EVENTS } from '../src/billing/assignments.js';

const tick = async (n = 10) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function fakeRoot() {
  let html = '', cache = {};
  const parse = (attr) => {
    const out = []; const re = /<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/gi; let m;
    while ((m = re.exec(html))) {
      const attrs = {}; m[2].replace(/([a-z-]+)(?:="([^"]*)")?/gi, (x, k, v) => { attrs[k] = v === undefined ? '' : v; return x; });
      if (!(attr in attrs)) continue;
      out.push({ tag: m[1], attrs, getAttribute: (k) => (k in attrs ? attrs[k] : null), value: attrs.value || '', checked: 'checked' in attrs, disabled: 'disabled' in attrs, focus() {}, setSelectionRange() {}, selectionStart: 0 });
    }
    return out;
  };
  return { get innerHTML() { return html; }, set innerHTML(v) { html = String(v); cache = {}; },
    querySelectorAll(sel) { const m = /^\[([a-z-]+)\]$/.exec(sel); if (!m) return []; return cache[sel] || (cache[sel] = parse(m[1])); }, querySelector(sel) { return this.querySelectorAll(sel)[0] || null; } };
}
const el = (root, attr, value) => root.querySelectorAll('[' + attr + ']').find((e) => value == null || e.getAttribute(attr) === value);
const click = async (root, attr, value) => { const e = el(root, attr, value); assert.ok(e, attr + '=' + value + ' is on the page'); e.onclick({}); await tick(); };

const two = (n) => String(n).padStart(2, '0');
const GRID = { ceremony: { rows: [] }, dinner: { sides: { T: [], B: [] } } };
for (let r = 1; r <= 10; r++) for (const side of ['L', 'R']) GRID.ceremony.rows.push({ side, row: r, seats: Array.from({ length: side === 'L' ? 2 : 3 }, (_, i) => ({ seatId: 'C-' + side + '-' + two(r) + '-' + two(i + 1) })) });
for (const k of ['T', 'B']) for (let n = 1; n <= 26; n++) if (n !== 13) GRID.dinner.sides[k].push({ seatId: 'D-' + k + '-' + two(n) });
const COUPLE = { BRIDE: { g: 'G048', p: 'INV-001', n: 'Haruthai' }, GROOM: { g: 'G049', p: 'INV-001', n: 'Suthep' } };
const KEY = 'wedstay/heritage-executive';
const ENTRIES = { a: { i: 'INV-G901', g: 'G901', p: 'INV-900', c: 'C901' }, b: { i: 'INV-G902', g: 'G902', p: 'INV-900', c: 'C902' }, c: { i: 'INV-G903', g: 'G903', p: 'INV-903', c: 'C903' },
  d: { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B', c: 'C048' }, e: { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G', c: 'C049' } };
const REGISTER = { C901: { first: 'Ada', last: 'Example' }, C902: { first: 'Ben', last: 'Sample' }, C903: { first: 'Cleo', last: 'Test' }, C048: { first: 'Haruthai', last: 'Demo' }, C049: { first: 'Suthep', last: 'Demo' } };
const joining = (g, v, d) => ({ submissionId: 'S-' + g, version: 1, registration: { guestRecord: { scope: { vientianeWedding: true } }, templeCeremony: { guests: [{ guestId: g, events: { vows: v, dinner: d } }] } } });
async function payload() {
  const s = new Seating(doState()), r = new Rooms(doState());
  const H = { 'x-gr-verified': 'yes', 'x-siyl-admin': 'GROOM', 'x-siyl-couple': JSON.stringify(COUPLE) };
  await s.fetch(new Request('https://seating/api/seating/config', { method: 'POST', headers: { 'x-gr-verified': 'yes' }, body: JSON.stringify(GRID) }));
  await s.storage.put('hold:ceremony:C-L-01-01', { invitationId: 'INV-G901', guestId: 'G901', partyId: 'INV-900', name: 'Ada', at: '2026-10-01T10:00:00Z', state: 'held' });
  await s.storage.put('hold:dinner:D-T-01', { invitationId: 'INV-G901', guestId: 'G901', partyId: 'INV-900', name: 'Ada', at: '2026-10-01T10:00:00Z', state: 'held' });
  await s.storage.put('hold:dinner:D-B-11', { invitationId: 'INV-G049', guestId: 'G049', partyId: 'INV-001', name: 'Suthep', at: '2026-10-01T10:00:00Z', state: 'held' });
  await r.storage.put('occ:' + KEY + '|A|G901', { invitationId: 'INV-G901', partyId: 'INV-900', name: 'Ada', at: 'x' });
  await r.storage.put('occ:' + KEY + '|A|G902', { invitationId: 'INV-G902', partyId: 'INV-900', name: 'Ben', at: 'x' });
  await r.storage.put('occ:' + KEY + '|C|G903', { invitationId: 'INV-G903', partyId: 'INV-903', name: 'Cleo', at: 'x' });
  const seat = await (await s.fetch(new Request('https://seating/api/seating/admin-read', { headers: H }))).json();
  /* the Owners' hotel room numbers (src/hotel-rooms.js · Owners 18 / 19 Nov 2026) — synthetic assignment, checked by the engine */
  const set = await (await r.fetch(new Request('https://rooms/api/rooms/admin-hotel-rooms', { method: 'POST', headers: H, body: JSON.stringify({ expectVersion: 0, note: 'test',
    set: { [KEY + '|A']: ['304'], [KEY + '|C']: ['305'], 'wedstay/souphattra-presidential|A': ['211', '210'] } }) }))).json();
  if (!set.ok) throw new Error('hotel rooms refused: ' + JSON.stringify(set));
  const room = await (await r.fetch(new Request('https://rooms/api/rooms/admin-read', { headers: H }))).json();
  const records = { 'INV-G901': joining('G901', 'Joining', 'Joining'), 'INV-G902': joining('G902', 'Joining', 'Not joining') };
  const confs = { 'INV-G901': { confirmedAt: '2026-11-01T10:00:00Z', version: 1 } };
  const roster = rosterOf({ entries: ENTRIES, register: REGISTER, records, confs, seating: seat, rooms: room, couple: COUPLE });
  return { ok: true, version: 'assignments/1.0.0', at: '2026-11-18T12:00:00Z', audience: 'GROOM', events: EVENTS, people: seat.people, capacity: seat.capacity,
    seating: { open: seat.open, frozen: seat.frozen, events: seat.events, log: seat.log },
    rooms: { stays: staysOf({ rooms: room, seedNames: { [KEY]: 'Heritage Executive' }, datesOf: { [KEY]: { checkIn: '2027-02-27', checkOut: '2027-03-01', nights: 2 } } }), digest: room.digest, final: room.final, waitlist: room.waitlist, log: room.log,
      hotelRooms: hotelRoomsMeta(room.hotelRooms), hotelChecks: hotelChecksOf(roster) },
    roster, gaps: [] };
}
const OVERVIEW = { ok: true, asOf: '2026-11-18', audience: 'GROOM', chunk: 6, gate: { approved: true }, holders: [] };
function load(answers, hash) {
  const calls = [];
  const w = page({ path: 'admin/billing', modules: ['assets/admin-assign.js', 'assets/admin-billing.js'], auth: SUTHEP,
    fetch: (url, init = {}) => {
      calls.push({ url, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : null });
      const k = url.replace(/^\/api\/billing\//, '').split('?')[0], a = answers[k];
      const out = typeof a === 'function' ? a(url, init) : a;
      return Promise.resolve(out && out.status ? out : res(200, out || { ok: true }));
    } });
  w.location.hash = hash || '#seating';
  const root = fakeRoot();
  w.SIYL_ADMIN_BILLING.boot(root);
  return { w, root, calls };
}

test('SEATING · the tab, the plan of fifty-four: the couple\'s two fixed places + 52 chairs (row 11 at the back of the left block), the dinner 54 chairs (A27 A28 B27 B28), the capacity, the guests with their answers', async () => {
  const P = await payload();
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': P });
  await tick();
  const h = root.innerHTML;
  assert.match(h, /data-ab-tab="#seating" class="on">Seating</); assert.match(h, /data-ab-tab="#assign"[^>]*>Room assignments</);
  assert.ok(calls.some((c) => /admin\/assignments/.test(c.url)), 'read once on entering');
  assert.equal((h.match(/data-as-seat="C-/g) || []).length, 52, '52 ceremony chairs');
  assert.match(h, /data-as-seat="C-L-11-01"/); assert.match(h, /data-as-seat="C-L-11-02"/); assert.doesNotMatch(h, /data-as-seat="C-R-11-/);
  assert.match(h, /<b>Bride<\/b><small>Haruthai<\/small>/); assert.match(h, /<b>Groom<\/b><small>Suthep<\/small>/);
  assert.match(h, /<span class="t-l1">Capacity<\/span><b>54<\/b><small>52 chairs \+ the couple's 2 places<\/small>/);
  assert.match(h, /<b>A1<\/b><small>Ada<\/small>/);
  assert.match(h, /Ada Example/); assert.match(h, /G901/); assert.doesNotMatch(h, /INV-G9|@/, 'no invitation id, no contact on the page');
  await click(root, 'data-as-event', 'dinner');
  const d = root.innerHTML;
  assert.equal((d.match(/data-as-seat="D-/g) || []).length, 54, '54 dinner chairs');
  for (const id of ['D-T-27', 'D-T-28', 'D-B-27', 'D-B-28']) assert.match(d, new RegExp('data-as-seat="' + id + '"'));
  assert.doesNotMatch(d, /data-as-seat="D-[TB]-13"/);
  assert.match(d, /<span class="t-l1">Capacity<\/span><b>54<\/b><small>54 chairs · the couple hold two of them<\/small>/);
  assert.match(d, /Not joining/, 'Ben answered "not joining" for the dinner');
});

test('SEATING · a move is a draft until confirmed: review = the dry run, confirm = one write naming what was seen; the plan is read again after', async () => {
  const P = await payload();
  const posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': P,
    'admin/seating/apply': (url, init) => { const b = JSON.parse(init.body); posts.push(b); return b.dryRun ? res(200, { ok: true, dryRun: true, event: b.event, changes: [{ guestId: 'G903', from: null, to: 'C-L-11-02', type: 'ASSIGN' }, { guestId: 'G901', from: 'C-L-01-01', to: 'C-R-05-02', type: 'MOVE' }], warnings: [{ guestId: 'G903', seatId: 'C-L-11-02', text: 'has not sent their trip yet' }] }) : res(200, { ok: true, event: b.event, changes: [{}, {}] }); } });
  await tick();
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-L-11-02');
  await click(root, 'data-as-seat', 'C-L-01-01'); await click(root, 'data-as-seat', 'C-R-05-02');
  let h = root.innerHTML;
  assert.match(h, /Your draft · 2 changes · not saved, not visible to guests/);
  assert.match(h, /Assign · <b>Cleo<\/b> no seat → B11/); assert.match(h, /Move · <b>Ada<\/b> A1 → E5/);
  assert.equal(posts.length, 0, 'nothing is sent while drafting');
  await click(root, 'data-as-review');
  assert.equal(posts.length, 1); assert.equal(posts[0].dryRun, true);
  assert.deepEqual(posts[0].target, { 'C-L-11-02': 'G903', 'C-L-01-01': null, 'C-R-05-02': 'G901' });
  assert.deepEqual(posts[0].expect, { 'C-L-11-02': null, 'C-L-01-01': 'G901', 'C-R-05-02': null }, 'every seat names what the Owner saw there');
  h = root.innerHTML; assert.match(h, /data-as-review/); assert.match(h, /has not sent their trip yet/); assert.match(h, /Confirm &amp; publish to the guests/);
  await click(root, 'data-as-confirm');
  assert.equal(posts.length, 2); assert.deepEqual(posts[1], { ...posts[0], dryRun: false }, 'the confirmation is exactly the reviewed change');
  assert.match(root.innerHTML, /Saved: 2 changes to the Vow Ceremony plan — the guests see them in their profiles now/);
});

test('SEATING · a seat taken by someone else meanwhile: the server refuses, the page names it, reads again and keeps the draft; the couple stay fixed; a swap is a swap', async () => {
  const P = await payload();
  let reads = 0;
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': () => { reads++; return res(200, P); },
    'admin/seating/apply': () => res(409, { ok: false, reason: 'CONFLICT', error: 'the plan changed since it was read — nothing was changed', problems: [{ seatId: 'C-R-01-01', reason: 'CHANGED', now: 'G902', seen: null }] }) });
  await tick();
  assert.equal(el(root, 'data-as-pick', 'G048'), undefined, 'the Bride is never chosen for an ordinary ceremony chair');
  assert.match(root.innerHTML, /Haruthai Demo[\s\S]*?<span class="ab-mute">fixed<\/span>/); assert.doesNotMatch(root.innerHTML, /data-as-seat="(BRIDE|GROOM)"/);
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-R-01-01');
  await click(root, 'data-as-review');
  assert.match(root.innerHTML, /the plan changed since it was read — nothing was changed — D1: changed since it was read/);
  assert.equal(reads, 2, 'read again'); assert.match(root.innerHTML, /Your draft · 1 change/, 'the draft is kept');
  /* a swap between two seated guests */
  await click(root, 'data-as-discard');
  await click(root, 'data-as-event', 'dinner');
  await click(root, 'data-as-seat', 'D-T-01'); await click(root, 'data-as-seat', 'D-B-11');
  assert.match(root.innerHTML, /Swap · <b>Ada<\/b> A1 → B11/); assert.match(root.innerHTML, /Swap · <b>Suthep<\/b> B11 → A1/, 'the couple\'s dinner chairs are ordinary chairs');
});

test('SEATING · review 18 Nov: a review is over after any read — a seat that changed meanwhile is a named conflict, never sent as reviewed; the Owner keeps the draft on the plan as it is now and reviews again; undo rebuilds the draft, never two seats', async () => {
  const P = await payload(), P2 = JSON.parse(JSON.stringify(P));
  P2.seating.events.ceremony.seats.find((x) => x.seatId === 'C-R-01-01').guestId = 'G902';   /* the other Owner seated Ben there meanwhile */
  let n = 0; const posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': () => res(200, n++ === 0 ? P : P2),
    'admin/seating/apply': (u, i) => { const b = JSON.parse(i.body); posts.push(b); return res(200, { ok: true, dryRun: !!b.dryRun, event: b.event, changes: [], warnings: [] }); },
    'admin/seating/state': res(200, { ok: true, open: false, frozen: false }) });
  await tick();
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-R-01-01');
  await click(root, 'data-as-review'); assert.ok(el(root, 'data-as-confirm'));
  /* any read (here: the self-service change reads the plan again) ends the review */
  await click(root, 'data-as-state', 'freeze'); await click(root, 'data-as-state-go', 'freeze');
  assert.equal(el(root, 'data-as-confirm'), undefined, 'no confirmation of a review made on another plan');
  assert.match(root.innerHTML, /Changed since you drafted it[\s\S]*D1 — now Ben/);
  assert.equal(el(root, 'data-as-review'), undefined, 'no review while the conflict stands');
  await click(root, 'data-as-rebase');
  await click(root, 'data-as-review');
  const last = posts[posts.length - 1];
  assert.deepEqual(last.expect, { 'C-R-01-01': 'G902' }, 'the expectation is what is there now — the review shows Ben\'s release');
  /* undo: the draft is rebuilt from the other changes */
  await click(root, 'data-as-discard');
  await click(root, 'data-as-seat', 'C-L-01-01'); await click(root, 'data-as-seat', 'C-R-05-01');   /* Ada A1 → D5 */
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-L-01-01');        /* Cleo onto A1 */
  await click(root, 'data-as-undo', 'G903');
  const h = root.innerHTML;
  assert.match(h, /Your draft · 1 change/); assert.match(h, /Move · <b>Ada<\/b> A1 → D5/); assert.doesNotMatch(h, /Cleo<\/b> no seat/);
  await click(root, 'data-as-review');
  assert.deepEqual(posts[posts.length - 1].target, { 'C-L-01-01': null, 'C-R-05-01': 'G901' }, 'one guest, one seat');
  /* a swap undoes as a pair — never "undo the other first" in a circle */
  await click(root, 'data-as-discard');
  await click(root, 'data-as-event', 'dinner');
  await click(root, 'data-as-seat', 'D-T-01'); await click(root, 'data-as-seat', 'D-B-11');
  assert.match(root.innerHTML, /Your draft · 2 changes/);
  await click(root, 'data-as-undo', 'G901');
  assert.match(root.innerHTML, /No unsaved changes/); assert.match(root.innerHTML, /Undone together with Ada: Suthep/);
  /* a guest the draft seats who meanwhile chose a seat elsewhere is a conflict, released in the draft on rebase */
  await click(root, 'data-as-event', 'ceremony');
});

test('SEATING · review 18 Nov: a guest the draft seats who meanwhile chose a seat elsewhere is a named conflict; kept on the current plan, that seat is released in the draft and the review names it', async () => {
  const P = await payload(), P2 = JSON.parse(JSON.stringify(P));
  P2.seating.events.ceremony.seats.find((x) => x.seatId === 'C-R-02-01').guestId = 'G903';   /* Cleo chose E… herself meanwhile */
  let n = 0; const posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': () => res(200, n++ === 0 ? P : P2),
    'admin/seating/apply': (u, i) => { posts.push(JSON.parse(i.body)); return res(200, { ok: true, dryRun: true, changes: [], warnings: [] }); },
    'admin/seating/state': res(200, { ok: true, open: false, frozen: true }) });
  await tick();
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-L-11-02');
  await click(root, 'data-as-state', 'freeze'); await click(root, 'data-as-state-go', 'freeze');
  assert.match(root.innerHTML, /Changed since you drafted it[\s\S]*D2 — now Cleo/);
  await click(root, 'data-as-rebase'); await click(root, 'data-as-review');
  const b = posts[posts.length - 1];
  assert.deepEqual(b.target, { 'C-L-11-02': 'G903', 'C-R-02-01': null }); assert.deepEqual(b.expect, { 'C-L-11-02': null, 'C-R-02-01': 'G903' });
});

test('SEATING · the final release needs the tick and sends the digest the Owner saw; freezing guests\' own choice is its own confirmed step', async () => {
  const P = await payload();
  const posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': P,
    'admin/seating/final': (u, i) => { posts.push(['final', JSON.parse(i.body)]); return res(200, { ok: true, final: { version: 1 } }); },
    'admin/seating/state': (u, i) => { posts.push(['state', JSON.parse(i.body)]); return res(200, { ok: true, open: true, frozen: true }); } });
  await tick();
  assert.match(root.innerHTML, /Not released — working version/);
  await click(root, 'data-as-final-open');
  assert.equal(el(root, 'data-as-final-go').disabled, true, 'no release without the tick');
  el(root, 'data-as-final-tick').checked = true; el(root, 'data-as-final-tick').onchange({}); await tick();
  await click(root, 'data-as-final-go');
  assert.deepEqual(posts[0], ['final', { event: 'ceremony', action: 'release', expectDigest: P.seating.events.ceremony.digest }]);
  await click(root, 'data-as-state', 'freeze'); assert.equal(posts.length, 1, 'opening the panel sends nothing');
  await click(root, 'data-as-state-go', 'freeze');
  assert.deepEqual(posts[1], ['state', { frozen: true }]);
});

test('EXPORTS · Final Ceremony / Dinner Seating Plan, Final Hotel Rooming List, Unassigned guests: the confirmed state with the event, its date and the release status — never a draft, a code, a contact or an invitation id', async () => {
  const P = await payload();
  const { root, w } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': P });
  await tick();
  await click(root, 'data-as-pick', 'G903'); await click(root, 'data-as-seat', 'C-L-11-02');   /* a draft that must NOT be exported */
  const E = w.SIYL_ADMIN_BILLING.ext;
  const cer = E.csv('ceremony');
  assert.ok(cer.startsWith('﻿Final Ceremony Seating Plan — H&S Wedding 001\r\n'), 'BOM, title');
  assert.match(cer, /Event[,;]Vow Ceremony/); assert.match(cer, /Event date[,;]"?Sunday, 28 February 2027 · 15:30/); assert.match(cer, /Status[,;]Not released — working version/);
  assert.match(cer, /Capacity[,;]54 people · 52 chairs \+ the couple's 2 places/);
  assert.match(cer, /\r\nBride[,;]Front centre[,;][,;][,;]Haruthai[,;]Demo[,;]G048/); assert.match(cer, /\r\nA1[,;]Left block[,;]1[,;]1[,;]Ada[,;]Example[,;]G901/);
  assert.match(cer, /\r\nB11[,;]Left block[,;]11[,;]2[,;][,;][,;][,;][,;][,;][,;]free/, 'B11 is free in the confirmed plan — the draft is not exported');
  assert.equal(cer.split('\r\n').filter((l) => /^(A|B|D|E|F)\d+[,;]/.test(l)).length, 52);
  const din = E.csv('dinner');
  assert.match(din, /Event date[,;]"?Sunday, 28 February 2027 · 19:30/); assert.equal(din.split('\r\n').filter((l) => /^[AB]\d+[,;]Side/.test(l)).length, 54);
  const rl = E.csv('rooming');
  assert.match(rl, /^﻿Final Hotel Rooming List — H&S Wedding 001/); assert.match(rl, /Stay[,;]Hotel[,;]Check-in[,;]Check-out[,;]Nights[,;]Room category[,;]Room[,;]Hotel room no\.[,;]Building[,;]First name/);
  assert.match(rl, /Vientiane · the wedding[,;]Souphattra Heritage Vientiane[,;]2027-02-27[,;]2027-03-01[,;]2[,;]Heritage Executive[,;]Room A[,;]304[,;]D[,;]Ada[,;]Example[,;]G901/, 'the allocation label AND the hotel\'s own room, apart');
  assert.match(rl, /Hotel room no\. · Building[,;]"?the Souphattra Heritage's official room list/);
  assert.doesNotMatch(rl, /USD|\d+\.\d\d/, 'no price in the hotel list');
  const out = E.csv('outstanding');
  assert.match(out, /Wedding Dinner[,;]"?Seat|Wedding Dinner[,;]Joining — no seat yet/);
  assert.match(out, /Vow Ceremony[,;]Joining — no seat yet[,;]Ben/, 'Ben joins the ceremony without a seat');
  for (const doc of [cer, din, rl, out]) { assert.doesNotMatch(doc, /INV-|@|bearer|token|siyl\.auth/i); assert.doesNotMatch(doc, /\r\n[=+\-@]/, 'no formula'); }
});

test('ROOMS · a move inside one category is a draft, reviewed and confirmed with what was seen; another category is a booking change, refused on the page; a changed room count needs the approval tick', async () => {
  const P = await payload();
  const posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/assignments': P, revenue: { ok: false },
    'admin/rooms/apply': (u, i) => { const b = JSON.parse(i.body); posts.push(b); return b.dryRun ? res(200, { ok: true, dryRun: true, key: KEY, changes: [{ guestId: 'G902', from: 'A', to: 'B', type: 'MOVE' }], impacts: [{ kind: 'ROOM_COUNT', before: 1, after: 2, words: 'Occupied rooms of this category in the change: 1 → 2' }] }) : res(200, { ok: true, changes: [{}] }); } }, '#assign');
  await tick();
  let h = root.innerHTML;
  assert.match(h, /Room Assignments/); assert.match(h, /Souphattra Heritage Vientiane/); assert.match(h, /27 Feb 2027 – 1 Mar 2027/);
  assert.match(h, /data-as-unit="wedstay\/heritage-executive\|I"[\s\S]*?extra bed — set by the extra-bed attribution/, 'Room I with its extra bed is fixed');
  /* THE HOTEL'S OWN ROOMS (Owners, 18 / 19 Nov 2026): beside the label, never in its place; the suite of two numbers is one room, the couple's, locked */
  assert.match(h, /data-as-unit="wedstay\/heritage-executive\|A"><p class="as-un">Room A <small>hotel room 304 · building D · Twin · 2 places<\/small>/);
  assert.match(h, /data-as-unit="wedstay\/heritage-executive\|C"><p class="as-un">Room C <small>hotel room 305 · building D · 2 places<\/small>/);
  assert.match(h, /data-as-unit="wedstay\/souphattra-presidential\|A"><p class="as-un">Room A <small>suite 210 \+ 211 · building F · 2 places<\/small>/, 'a suite of two numbers is one unit');
  const pres = h.split('data-as-unit="wedstay/souphattra-presidential|A"')[1].split('data-as-unit=')[0];
  assert.match(pres, /as-lock|<p class="ab-why">the couple's suite/, 'the suite is locked'); assert.match(pres, /<p class="ab-why">the couple's suite — [^<]+<\/p>/);
  assert.match(h, /data-as-hotel[\s\S]*?3 rooms assigned · version 1/); assert.doesNotMatch(h, /Without a hotel room number/, 'every guest here has their room');
  await click(root, 'data-as-occ', 'G902');
  await click(root, 'data-as-to', KEY + '|B');
  h = root.innerHTML; assert.match(h, /Move · <b>Ben<\/b> heritage-executive: Room A → Room B/);
  await click(root, 'data-as-rreview');
  assert.deepEqual(posts[0].target, { [KEY + '|A']: ['G901'], [KEY + '|B']: ['G902'] }); assert.deepEqual(posts[0].expect, { [KEY + '|A']: ['G901', 'G902'], [KEY + '|B']: [] });
  h = root.innerHTML; assert.match(h, /Financial impact — your approval is needed/); assert.equal(el(root, 'data-as-rconfirm').disabled, true);
  el(root, 'data-as-rapprove').checked = true; el(root, 'data-as-rapprove').onchange({}); await tick();
  await click(root, 'data-as-rconfirm');
  assert.equal(posts[1].dryRun, false); assert.equal(posts[1].approveRoomCount, true);
  assert.match(root.innerHTML, /Saved: 1 room change — the guests see their rooms in their profiles now; bookings, rates and invoices are unchanged/);
});

test('STATIC · the page loads the extension before the console; no browser dialog, no browser storage in the extension; the guests\' pages never reach the admin operations', () => {
  const html = src('src/admin/billing.html');
  assert.ok(html.indexOf('assets/admin-assign.js?v=') > 0 && html.indexOf('assets/admin-assign.js?v=') < html.indexOf('assets/admin-billing.js?v='));
  const js = src('assets/admin-assign.js');
  assert.doesNotMatch(js, /window\.(confirm|alert|prompt)\(|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(js, /=>|`|\bconst\b|\blet\b/, 'ES5, like the console');
  for (const f of ['assets/seating.js', 'assets/rooms.js', 'assets/pulse.js', 'wedding-preparation.html']) assert.doesNotMatch(src(f), /admin-apply|admin-read|admin-final|x-siyl-admin/, f);
  const w = src('src/worker.js');
  assert.match(w, /headers\.delete\('x-siyl-admin'\)/); assert.equal((w.match(/headers\.delete\('x-siyl-admin'\)/g) || []).length, 2, 'both public engine routes strip the Owner header');
});
