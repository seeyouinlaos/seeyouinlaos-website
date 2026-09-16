/* ============================================================================
   THE SOLD-OUT TEST ON THE LIVE ENGINE (Owner, 16 Sep 2026) — controlled, restored.

   Fixture: one open room of two places that nobody holds (prewed/noble-courtyard,
   the Master: Noble Courtyard 1 room). Guest A and Guest B hold its two places,
   Guest C is refused (409 full) and the room is unchanged; the availability words
   are read through the client model at every step; then A and B release, the
   room is empty again and the plan is record-equivalent to the snapshot.
   Guests: A = G001, B = G002, C = G003 — none holds a room in that stage (checked
   first: a join would otherwise MOVE a genuine hold). No code, no bearer printed.

     node docs/acceptance/2026-09-16-inventory/soldout.mjs <origin> <outDir> <privateDir>
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bearerOf } from '../../../register/crypto.mjs';
import { page } from '../../../test/sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3], PRIV = process.argv[4]; fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(PRIV, { recursive: true });
const KEY = process.env.KEY || 'prewed/noble-courtyard', [WIN, SLUG] = KEY.split('/'), STAGE = WIN;
const A = 'G001', B = 'G002', C = 'G003';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code for ' + id); return r[5]; };
const GR = process.env.GR_TOKEN || fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim();
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const bearers = {}; for (const g of [A, B, C]) bearers[g] = await bearerOf(tok(g));
const plan = async () => (await fetch(O + '/api/rooms/plan', { headers: { 'x-gr-token': GR } })).json();
const view = async (g) => (await fetch(O + '/api/rooms/read', { headers: { 'x-siyl-auth': bearers[g] } })).json();
const call = async (g, op, body) => { const r = await fetch(O + '/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-auth': bearers[g], 'content-type': 'application/json' }, body: JSON.stringify({ invitationId: 'INV-' + g, guestId: g, ...body }) }); return { status: r.status, ...(await r.json()) }; };
const words = (g, v) => { const sb = page({ auth: { invitationId: 'INV-' + g, guestId: g, partyId: 'INV-' + g, bearer: 'x', hosts: false } }); const U = sb.window.SIYL_UNITS, ST = sb.window.SIYL_STAY; U._set(v); return { label: U.label(WIN, SLUG), fits: U.fits(WIN, SLUG), soldOut: U.soldOut(WIN, SLUG), count: U.count(WIN, SLUG), unit: U.unitWords(v.units[KEY][0]), refusalFull: ST.refusal({ ok: false, error: 'full' }) }; };
const roomOf = (p) => (p.units[KEY] || []).map((u) => ({ label: u.label, reservedFor: u.reservedFor, occupants: (u.occupants || []).map((o) => o.guestId) }));
const stageHolds = (p, g) => Object.entries(p.units).filter(([k]) => k.split('/')[0] === STAGE).flatMap(([k, us]) => us.filter((u) => (u.occupants || []).some((o) => o.guestId === g)).map((u) => k + ':' + u.label));

/* 0 · the snapshot (private: names and ids) */
const before = await plan(); fs.writeFileSync(path.join(PRIV, 'plan-before.json'), JSON.stringify(before, null, 1));
note('fixture', roomOf(before).length === 1 && roomOf(before)[0].occupants.length === 0 && !roomOf(before)[0].reservedFor, KEY + ' is one open room, empty: ' + JSON.stringify(roomOf(before)));
for (const g of [A, B, C]) note('no-hold-' + g, stageHolds(before, g).length === 0, g + ' holds nothing in the ' + STAGE + ' stage (a join would move a genuine hold)');
if (R.some((x) => !x.ok)) { console.log('ABORT — fixture not safe'); process.exit(1); }
const w0 = words(A, await view(A)); note('words-0', w0.label === '1 room · 2 places available' && w0.fits && w0.unit === '2 places · Available', JSON.stringify(w0));

/* 1 · A, then B — the room fills; the words follow at each step */
const ja = await call(A, 'join', { key: KEY, label: 'A', name: 'Guest A' }); note('A-join', ja.status === 200 && ja.ok, 'status ' + ja.status);
const w1 = words(B, await view(B)); note('words-1', w1.label === '1 room · 1 place available' && w1.fits && w1.count.free === 1, JSON.stringify({ label: w1.label, count: w1.count }));
const jb = await call(B, 'join', { key: KEY, label: 'A', name: 'Guest B' }); note('B-join', jb.status === 200 && jb.ok, 'status ' + jb.status);
const vC = await view(C), w2 = words(C, vC); note('words-2', w2.label === 'Fully booked' && !w2.fits && w2.soldOut && w2.count.free === 0 && w2.count.open === 0 && vC.summary[KEY].free === 0 && vC.summary[KEY].rooms === 0, JSON.stringify({ label: w2.label, api: vC.summary[KEY] }));

/* 2 · C is refused, the room unchanged; the words the guest reads */
const jc = await call(C, 'join', { key: KEY, label: 'A', name: 'Guest C' }); note('C-refused', jc.status === 409 && jc.error === 'full', 'status ' + jc.status + ' · ' + jc.error);
note('C-words', w2.refusalFull === 'This room was just filled. Please choose another room.', w2.refusalFull);
const mid = await plan(); note('room-unchanged', JSON.stringify(roomOf(mid)[0].occupants.slice().sort()) === JSON.stringify([A, B]) && roomOf(mid).length === 1, JSON.stringify(roomOf(mid)));
/* the room the engine persists is the room each guest sees as theirs */
const vA = await view(A); note('your-room-A', vA.mine[STAGE] && vA.mine[STAGE].key === KEY && vA.mine[STAGE].label === 'A' && words(A, vA).label === 'Your place is held · Room A', JSON.stringify(vA.mine[STAGE]));
/* a second concurrent burst against the full room: every attempt refused, nothing changes */
const burst = await Promise.all([1, 2, 3].map(() => call(C, 'join', { key: KEY, label: 'A', name: 'Guest C' }))); note('burst-refused', burst.every((r) => r.status === 409), burst.map((r) => r.status).join(','));
/* no Room B exists for a one-room category */
const jg = await call(C, 'join', { key: KEY, label: 'B', name: 'Guest C' }); note('no-invented-room', jg.status === 404, 'status ' + jg.status + ' · ' + jg.error);

/* 3 · release, restore, prove */
const la = await call(A, 'leave', { key: KEY }); const lb = await call(B, 'leave', { key: KEY }); note('released', la.status === 200 && lb.status === 200, la.status + ',' + lb.status);
const after = await plan(); fs.writeFileSync(path.join(PRIV, 'plan-after.json'), JSON.stringify(after, null, 1));
note('room-empty', roomOf(after)[0].occupants.length === 0, JSON.stringify(roomOf(after)));
note('plan-restored', JSON.stringify(before) === JSON.stringify(after), 'the plan after equals the snapshot record for record (' + Object.values(after.units).flat().reduce((n, u) => n + u.occupants.length, 0) + ' holds)');
const w3 = words(A, await view(A)); note('words-3', w3.label === '1 room · 2 places available' && w3.fits, w3.label);

fs.writeFileSync(path.join(OUT, 'soldout.json'), JSON.stringify({ at: new Date().toISOString(), origin: O, fixture: KEY, guests: { A, B, C }, results: R, restored: JSON.stringify(before) === JSON.stringify(after) }, null, 1));
console.log(R.every((x) => x.ok) ? 'SOLD-OUT TEST: PASS · restored' : 'SOLD-OUT TEST: FAIL');
process.exit(R.every((x) => x.ok) ? 0 : 1);
