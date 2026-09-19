#!/usr/bin/env node
/* ============================================================================
   GUEST RELATIONS OPERATIONS — the protected path (F + G).

   The guest website cannot confirm a journey, cannot open seating, cannot
   upload a floor plan and cannot allocate a chair. Guest Relations does those
   things here, against the Worker, with the GR token that never enters the
   client, the repository or the deployed assets.

     GR_TOKEN=… node src/gr.cjs status INV-002
     GR_TOKEN=… node src/gr.cjs confirm INV-002 --actor "Name" [--note "…"]
     GR_TOKEN=… node src/gr.cjs unconfirm INV-002 --actor "Name"
     GR_TOKEN=… node src/gr.cjs seating-plan
     GR_TOKEN=… node src/gr.cjs seating-config geometry.json --actor "Name"
     GR_TOKEN=… node src/gr.cjs seating-state --open true|false --frozen true|false [--pool T|B|none]
     GR_TOKEN=… node src/gr.cjs seating-assign ceremony C-L-1-1 INV-002 G001 [--force]
     GR_TOKEN=… node src/gr.cjs seating-unassign ceremony INV-002 G001
     GR_TOKEN=… node src/gr.cjs seating-rekey holds.json          # migration: relabel holds by guest
     GR_TOKEN=… node src/gr.cjs rooms-plan                        # every allocation unit, who is where
     GR_TOKEN=… node src/gr.cjs rooms-migrate occupants.json      # migration: place guests in units
     GR_TOKEN=… node src/gr.cjs rooms-unassign G001 [--stage wedstay]
     GR_TOKEN=… node src/gr.cjs reset                             # THE CLEAN RESET · 1 the dry run: what would go, nothing written
     GR_TOKEN=… node src/gr.cjs reset --snapshot                  # 2 every value that would go → src/reset-backup-<stamp>.private.json (verified)
     GR_TOKEN=… node src/gr.cjs reset --confirm "RESET ALL GUEST STATE" --backup src/reset-backup-<stamp>.private.json --actor "Name"
                                                                  # 3 executes, bound to that backup's digest

   The token is read from GR_TOKEN, or from src/gr-token.private.txt (never
   committed). ORIGIN defaults to the production Worker.
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ORIGIN = process.env.SIYL_ORIGIN || 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const args = process.argv.slice(2);
const cmd = args.shift();
function flag(name) { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : undefined; }
function token() {
  if (process.env.GR_TOKEN) return process.env.GR_TOKEN.trim();
  const f = path.join(__dirname, 'gr-token.private.txt');
  if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  console.error('no GR token: set GR_TOKEN or create src/gr-token.private.txt'); process.exit(2);
}
async function call(route, method, body) {
  const r = await fetch(ORIGIN + route, { method, headers: { 'content-type': 'application/json', 'x-gr-token': token() }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch (e) { j = { raw: text }; }
  console.log(r.status, JSON.stringify(j, null, 2));
  process.exit(r.ok ? 0 : 1);
}
(async () => {
  const actor = flag('actor') || process.env.USER || 'guest-relations';
  switch (cmd) {
    case 'status': return call('/api/status?invitation=' + encodeURIComponent(args[0] || ''), 'GET');
    case 'confirm': return call('/api/confirm', 'POST', { invitationId: args[0], action: 'confirm', actor, note: flag('note') || '' });
    case 'unconfirm': return call('/api/confirm', 'POST', { invitationId: args[0], action: 'unconfirm', actor, note: flag('note') || '' });
    case 'seating-plan': return call('/api/seating/plan', 'GET');
    case 'seating-config': {
      const geometry = JSON.parse(fs.readFileSync(args[0], 'utf8'));
      return call('/api/seating/config', 'POST', { ...geometry, actor });
    }
    case 'seating-state': {
      const body = { actor };
      if (flag('open') !== undefined) body.open = flag('open') === 'true';
      if (flag('frozen') !== undefined) body.frozen = flag('frozen') === 'true';
      if (flag('pool') !== undefined) body.poolSide = flag('pool') === 'none' ? null : flag('pool');
      return call('/api/seating/state', 'POST', body);
    }
    case 'seating-assign': return call('/api/seating/assign', 'POST', { event: args[0], seatId: args[1], invitationId: args[2], guestId: args[3], actor, force: args.includes('--force') });
    case 'seating-unassign': return call('/api/seating/unassign', 'POST', { event: args[0], invitationId: args[1], guestId: args[2], actor });
    case 'seating-rekey': return call('/api/seating/rekey', 'POST', { holds: JSON.parse(fs.readFileSync(args[0], 'utf8')), actor });
    case 'rooms-plan': return call('/api/rooms/plan', 'GET');
    case 'rooms-migrate': return call('/api/rooms/migrate', 'POST', { occupants: JSON.parse(fs.readFileSync(args[0], 'utf8')), actor, force: args.includes('--force') });
    case 'rooms-unassign': return call('/api/rooms/unassign', 'POST', { guestId: args[0], stage: flag('stage') || '', actor });
    /* THE CLEAN RESET (Owner, 19 Sep 2026): three steps, in this order —
         reset                      the dry run: what would go, nothing written
         reset --snapshot           every value that would go, written to src/reset-backup-<stamp>.private.json and read back; prints the digest
         reset --confirm "RESET ALL GUEST STATE" --backup <that file>
                                    executes, bound to the backup's digest (refused when the state changed since the snapshot) */
    case 'reset': {
      const confirm = flag('confirm'), snapshot = args.includes('--snapshot'), backupFile = flag('backup');
      const post = async (body) => { const r = await fetch(ORIGIN + '/api/gr/reset', { method: 'POST', headers: { 'content-type': 'application/json', 'x-gr-token': token() }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) }; };
      if (confirm) {
        if (confirm !== 'RESET ALL GUEST STATE') { console.error('the confirmation words are exactly: RESET ALL GUEST STATE'); process.exit(2); }
        if (!backupFile || !fs.existsSync(backupFile)) { console.error('a verified backup is required: run `reset --snapshot` first and pass --backup <file>'); process.exit(2); }
        const b = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        if (!b.digest || !b.backup) { console.error('the backup file carries no digest / no values'); process.exit(2); }
        const r = await post({ dryRun: false, confirm, digest: b.digest, actor });
        console.log(r.status, JSON.stringify(r.j, null, 2)); process.exit(r.ok ? 0 : 1);
      }
      if (snapshot) {
        const r = await post({ dryRun: true, snapshot: true, actor });
        if (!r.ok || !r.j.backup) { console.log(r.status, JSON.stringify(r.j, null, 2)); process.exit(1); }
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const file = path.join(__dirname, 'reset-backup-' + stamp + '.private.json');
        fs.writeFileSync(file, JSON.stringify(r.j, null, 1));
        const back = JSON.parse(fs.readFileSync(file, 'utf8'));   /* read back: the file is complete before anything may be deleted */
        const ok = back.digest === r.j.digest && Object.keys(back.backup).length === Object.keys(r.j.backup).length;
        const { backup, ...rest } = r.j;
        console.log('backup written and verified: ' + path.basename(file) + ' · ' + Object.keys(backup).length + ' values · digest ' + r.j.digest + (ok ? '' : ' · VERIFICATION FAILED') + ' (KEEP PRIVATE)');
        console.log(r.status, JSON.stringify(rest, null, 2)); process.exit(ok ? 0 : 1);
      }
      const r = await post({ dryRun: true, actor });
      console.log(r.status, JSON.stringify(r.j, null, 2)); process.exit(r.ok ? 0 : 1);
    }
    default:
      console.error('usage: see the header of src/gr.cjs'); process.exit(2);
  }
})();
