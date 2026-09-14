#!/usr/bin/env node
/* ============================================================================
   MIGRATION — party invitations → individual guest invitations (Owner, 14 Sep 2026).

   Deterministic, in two phases, never printing a code:

     node src/migrate-individual.cjs --backup <dir>      read production state as it is
     node src/migrate-individual.cjs --dry-run <dir>     the plan and the counts, nothing written
     node src/migrate-individual.cjs --apply <dir>       the plan, against the deployed Worker

   The register itself is migrated by src/build-invitations.cjs (the party's
   code stays with the lead guest; every other guest receives a new code; the
   old register is kept beside it as a dated private backup).

   Production state:
     · SEAT HOLDS are keyed by guestId already — each is re-labelled with the
       guest's own invitation, party and first name (Guest Relations `rekey`).
       Deterministic when the guest is in the private list.
     · ROOM ALLOCATIONS of the retired category ledger become places in the
       new engine only where the mapping is deterministic: a party allocation
       of `units` rooms whose active guests exactly fill units × places. An
       allocation that does not is AMBIGUOUS — recorded, never invented.
     · REGISTRATION RECORDS are party records: a party's answers cannot be
       split into two guests' journeys. Each is AMBIGUOUS and stays untouched
       unless the Owner has documented it as test data to be reset (RESET=1).
   Every result is written privately to <dir>/migration-result.json.
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ORIGIN = process.env.SIYL_ORIGIN || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const KV_ID = '090270d0da434a8b8f49933cb604beb3';
const args = process.argv.slice(2);
const mode = args[0], dir = args[1];
if (!['--backup', '--dry-run', '--apply'].includes(mode) || !dir) { console.error('usage: see the header of src/migrate-individual.cjs'); process.exit(2); }
fs.mkdirSync(dir, { recursive: true });

function token() {
  if (process.env.GR_TOKEN) return process.env.GR_TOKEN.trim();
  const f = path.join(__dirname, 'gr-token.private.txt');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  console.error('no GR token'); process.exit(2);
}
async function gr(route, method, body) {
  const r = await fetch(ORIGIN + route, { method, headers: { 'content-type': 'application/json', 'x-gr-token': token() }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/guestlist.private.json'), 'utf8'));
const activeParty = (p) => (p.status || 'ACTIVE') === 'ACTIVE';
const activeGuest = (p, g) => activeParty(p) && (g.status || 'ACTIVE') === 'ACTIVE';
const guestOf = (id) => { for (const p of list) for (const g of p.guests) if (g.guestId === id) return { p, g }; return null; };
const PLACES = 2;
const wjson = (f, v) => fs.writeFileSync(path.join(dir, f), JSON.stringify(v, null, 2));
const rjson = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));

(async () => {
  if (mode === '--backup') {
    const keys = JSON.parse(execFileSync('npx', ['wrangler', 'kv', 'key', 'list', '--namespace-id', KV_ID], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    wjson('kv-keys.json', keys);
    for (const k of keys) fs.writeFileSync(path.join(dir, 'kv-' + k.name.replace(/[:]/g, '_') + '.json'), execFileSync('npx', ['wrangler', 'kv', 'key', 'get', '--namespace-id', KV_ID, k.name], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
    wjson('seating-plan.json', await gr('/api/seating/plan', 'GET'));
    const alloc = {};
    for (const p of list) { const r = await (await fetch(ORIGIN + '/api/inventory/mine?invitationId=' + p.invitationId)).json().catch(() => ({})); if (r && r.allocation) alloc[p.invitationId] = r.allocation; }
    wjson('inventory-allocations.json', alloc);
    console.log('backup written to ' + dir + ': ' + keys.length + ' KV keys · seating plan · ' + Object.keys(alloc).length + ' allocations');
    return;
  }

  /* ---- the plan, from the backup ---- */
  const plan = rjson('seating-plan.json'), alloc = rjson('inventory-allocations.json'), keys = rjson('kv-keys.json');
  const counts = { activeGuests: 0, invitations: 0, partiesRetained: 0, stateMigrated: 0, ambiguous: 0, errors: 0 };
  for (const p of list) { if (activeParty(p)) counts.partiesRetained++; for (const g of p.guests) if (activeGuest(p, g)) { counts.activeGuests++; counts.invitations++; } }
  const holds = [], ambiguous = [], rooms = [], resets = [];
  for (const ev of ['ceremony', 'dinner']) {
    for (const s of (plan.events && plan.events[ev] && plan.events[ev].seats) || []) {
      if (s.state === 'available' || s.state === 'family' || !s.guestId) continue;
      const hit = guestOf(s.guestId);
      if (!hit || !activeGuest(hit.p, hit.g)) { ambiguous.push({ kind: 'seat', event: ev, seatId: s.seatId, invitationId: s.invitationId, guestId: s.guestId, why: 'guest not active in the private list' }); continue; }
      holds.push({ event: ev, seatId: s.seatId, fromInvitationId: s.invitationId, guestId: s.guestId, invitationId: 'INV-' + s.guestId, partyId: hit.p.invitationId, name: hit.g.preferredName || hit.g.fullName });
    }
  }
  for (const [inv, a] of Object.entries(alloc)) {
    const party = list.find((p) => p.invitationId === inv);
    const guests = party ? party.guests.filter((g) => activeGuest(party, g)) : [];
    for (const line of a.lines || []) {
      const capacity = line.units * PLACES;
      /* deterministic only when the party's active guests exactly fill what was allocated */
      if (party && guests.length > 0 && guests.length === capacity && (line.qty || guests.length) === guests.length) {
        guests.forEach((g, i) => rooms.push({ key: line.key, label: String.fromCharCode(65 + Math.floor(i / PLACES)), invitationId: 'INV-' + g.guestId, guestId: g.guestId, partyId: inv, name: g.preferredName || g.fullName }));
      } else {
        ambiguous.push({ kind: 'room', invitationId: inv, key: line.key, units: line.units, qty: line.qty, guests: guests.length, why: 'occupants cannot be named deterministically' });
      }
    }
  }
  for (const k of keys) {
    if (/^reg:/.test(k.name)) ambiguous.push({ kind: 'registration', key: k.name, why: 'a party record cannot become one guest\'s journey' });
  }
  const reset = process.env.RESET === '1';
  if (reset) for (const a of ambiguous) if (a.kind === 'registration' || a.kind === 'room') resets.push(a);
  counts.stateMigrated = holds.length + rooms.length;
  counts.ambiguous = reset ? ambiguous.filter((a) => a.kind === 'seat').length : ambiguous.length;
  const result = { at: new Date().toISOString(), mode, counts, holds, rooms, ambiguous, resets, reset };
  console.log('ACTIVE GUESTS                  ' + counts.activeGuests);
  console.log('INDIVIDUAL INVITATIONS CREATED ' + counts.invitations);
  console.log('PARTIES RETAINED               ' + counts.partiesRetained);
  console.log('CODES RETAINED FOR LEADS       see src/build-invitations.cjs (register migration)');
  console.log('NEW CODES GENERATED            see src/build-invitations.cjs (register migration)');
  console.log('STATE RECORDS MIGRATED         ' + counts.stateMigrated + ' (' + holds.length + ' seat holds rekeyed · ' + rooms.length + ' room places)');
  console.log('AMBIGUOUS RECORDS              ' + counts.ambiguous + (reset ? ' (after the documented reset of ' + resets.length + ' Owner test records)' : ' (' + ambiguous.map((a) => a.kind + ':' + (a.key || a.seatId || a.invitationId)).join(', ') + ')'));
  console.log('ERRORS                         ' + counts.errors);
  if (mode === '--dry-run') { wjson('migration-plan.json', result); console.log('dry run — nothing written to production'); return; }

  /* ---- apply ---- */
  const done = { rekey: null, rooms: null, resets: [] };
  if (holds.length) { done.rekey = await gr('/api/seating/rekey', 'POST', { holds, actor: 'migration-2026-09-14' }); if (!done.rekey.ok) counts.errors++; }
  if (rooms.length) { done.rooms = await gr('/api/rooms/migrate', 'POST', { occupants: rooms, actor: 'migration-2026-09-14' }); if (!done.rooms.ok) counts.errors++; }
  for (const r of resets) {
    if (r.kind === 'registration') { execFileSync('npx', ['wrangler', 'kv', 'key', 'delete', '--namespace-id', KV_ID, r.key], { cwd: ROOT, stdio: ['ignore', 'ignore', 'ignore'] }); done.resets.push(r.key); }
  }
  /* a room allocation reset: the retired ledger is no longer written by the site; nothing to release in the new engine */
  result.done = done; result.counts = counts;
  wjson('migration-result.json', result);
  console.log('applied · rekeyed ' + ((done.rekey && done.rekey.done) || []).length + ' · room places ' + ((done.rooms && done.rooms.done) || []).length + ' · resets ' + done.resets.length + ' · errors ' + counts.errors);
})().catch((e) => { console.error('MIGRATION FAILED', e.message); process.exit(1); });
