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
     GR_TOKEN=… node src/gr.cjs seating-state --open true|false --frozen true|false
     GR_TOKEN=… node src/gr.cjs seating-assign ceremony C-L-1-1 INV-002 G001 [--force]
     GR_TOKEN=… node src/gr.cjs seating-unassign ceremony INV-002 G001

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
      return call('/api/seating/state', 'POST', body);
    }
    case 'seating-assign': return call('/api/seating/assign', 'POST', { event: args[0], seatId: args[1], invitationId: args[2], guestId: args[3], actor, force: args.includes('--force') });
    case 'seating-unassign': return call('/api/seating/unassign', 'POST', { event: args[0], invitationId: args[1], guestId: args[2], actor });
    default:
      console.error('usage: see the header of src/gr.cjs'); process.exit(2);
  }
})();
