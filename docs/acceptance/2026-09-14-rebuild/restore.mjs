/* After the live four-identity walk: put production back exactly.
   · the four test registrations (reg:INV-G048/G049/G001/G002) are removed from KV
   · the four guests' room places are released (Guest Relations op)
   · the four guests' seats are put back to the migrated holds (each guest's own select, with their bearer —
     the same act the guest would perform), read from the private seating backup
   Codes from the private register, never printed.
     GR_TOKEN=… node docs/acceptance/2026-09-14-rebuild/restore.mjs <private-backup-dir> */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { bearerOf } from '../../../register/crypto.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev', API = ORIGIN + '/api';
const KV = '090270d0da434a8b8f49933cb604beb3';
const dir = process.argv[2]; if (!dir) { console.error('backup dir required'); process.exit(2); }
const gr = process.env.GR_TOKEN || fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim();
const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8');
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], partyId: c[2], token: c[5], status: c[7] }; });
const GUESTS = ['G048', 'G049', 'G001', 'G002'];
const j = async (u, init) => { const r = await fetch(u, init); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };

/* 1 · registrations */
for (const g of GUESTS) {
  const key = 'reg:INV-' + g;
  const keys = JSON.parse(execFileSync('npx', ['wrangler', 'kv', 'key', 'list', '--namespace-id', KV, '--prefix', key], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  for (const k of keys) { execFileSync('npx', ['wrangler', 'kv', 'key', 'delete', '--namespace-id', KV, k.name], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] }); console.log('removed ' + k.name); }
}
/* 2 · room places */
for (const g of GUESTS) {
  const r = await j(API + '/rooms/unassign', { method: 'POST', headers: { 'content-type': 'application/json', 'x-gr-token': gr }, body: JSON.stringify({ guestId: g, actor: 'restore-2026-09-14' }) });
  console.log('rooms ' + g + ' released ' + JSON.stringify(r.released || r.error));
}
/* 3 · seats back to the migrated holds */
const plan = JSON.parse(fs.readFileSync(path.join(dir, 'seating-plan.json'), 'utf8'));
for (const ev of ['ceremony', 'dinner']) {
  for (const s of plan.events[ev].seats) {
    if (!s.guestId || !GUESTS.includes(s.guestId)) continue;
    const row = rows.find((r) => r.guestId === s.guestId);
    const bearer = await bearerOf(row.token);
    const r = await j(API + '/seating/select', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': bearer }, body: JSON.stringify({ invitationId: row.invitationId, guestId: s.guestId, event: ev, seatId: s.seatId, name: '' }) });
    console.log('seat ' + ev + ' ' + s.guestId + ' → ' + s.seatId + ' ' + (r.ok ? 'ok' : r.error));
  }
}
/* a guest who held no seat before must hold none now */
const now = await j(API + '/seating/plan', { headers: { 'x-gr-token': gr } });
for (const ev of ['ceremony', 'dinner']) {
  const before = new Set(plan.events[ev].seats.filter((s) => s.guestId).map((s) => s.guestId + ':' + s.seatId));
  for (const s of now.events[ev].seats) {
    if (!s.guestId || !GUESTS.includes(s.guestId) || before.has(s.guestId + ':' + s.seatId)) continue;
    const row = rows.find((r) => r.guestId === s.guestId);
    const r = await j(API + '/seating/release', { method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': await bearerOf(row.token) }, body: JSON.stringify({ invitationId: row.invitationId, guestId: s.guestId, event: ev }) });
    console.log('seat ' + ev + ' ' + s.guestId + ' released ' + s.seatId + ' ' + (r.ok ? 'ok' : r.error));
  }
}
const after = await j(API + '/seating/plan', { headers: { 'x-gr-token': gr } });
for (const ev of ['ceremony', 'dinner']) {
  const a = after.events[ev].seats.filter((s) => s.guestId).map((s) => s.seatId + ':' + s.guestId).sort().join(' ');
  const b = plan.events[ev].seats.filter((s) => s.guestId).map((s) => s.seatId + ':' + s.guestId).sort().join(' ');
  console.log(ev + ' ' + (a === b ? 'RESTORED' : 'DIFFERS') + ' · ' + a);
}
const rooms = await j(API + '/rooms/plan', { headers: { 'x-gr-token': gr } });
console.log('room places held: ' + Object.values(rooms.units).flat().reduce((n, u) => n + u.occupants.length, 0));
