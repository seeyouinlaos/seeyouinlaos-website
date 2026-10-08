#!/usr/bin/env node
/* ============================================================================
   GUEST RELATIONS OPERATIONS — the protected path (F + G).

   The guest website cannot confirm a journey, cannot open seating, cannot
   upload a floor plan and cannot allocate a chair. Guest Relations does those
   things here, against the Worker, with the GR token that never enters the
   client, the repository or the deployed assets.

     GR_TOKEN=… node src/gr.cjs status INV-002
     GR_TOKEN=… node src/gr.cjs confirm INV-002 --actor "Name" [--note "…"] [--acknowledge-prices <digest prefix> | --unverified]
                                                                  # shows the amounts the guest was sent beside today's Billing
                                                                  # Engine first; a difference is confirmed only with the digest
                                                                  # prefix it printed; --unverified only while it cannot be compared
     GR_TOKEN=… node src/gr.cjs unconfirm INV-002 --actor "Name"
     GR_TOKEN=… node src/gr.cjs seating-plan
     GR_TOKEN=… node src/gr.cjs seating-config geometry.json --actor "Name"
     GR_TOKEN=… node src/gr.cjs seating-state --open true|false --frozen true|false [--pool T|B|none]
     GR_TOKEN=… node src/gr.cjs seating-assign ceremony C-L-1-1 INV-002 G001 [--force]
     GR_TOKEN=… node src/gr.cjs seating-unassign ceremony INV-002 G001
     GR_TOKEN=… node src/gr.cjs seating-rekey holds.json          # migration: relabel holds by guest
     GR_TOKEN=… node src/gr.cjs rooms-plan                        # every allocation unit, who is where
     GR_TOKEN=… node src/gr.cjs documents [--json]                # every registered guest: Passport · Flight — Received (date) · Missing
     GR_TOKEN=… node src/gr.cjs documents-open INV-G001 G001 passport|flight
                                                                  # opens that guest's CURRENT copy from a private temporary file
     node src/gr.cjs documents-clean                              # removes every temporary copy this tool made
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
/* ---- THE DOCUMENTS (Owner, 3 Oct 2026): read only, through the existing Guest Relations routes; never a document's content in the
   overview. A copy opened for viewing is written to a private temporary folder (0700 · 0600 · a generated name, never the
   uploader's) and removed by the next run after an hour, or at once by documents-clean — so no copy outlives the bucket's purge. */
const os = require('os');
const DOC_TMP = 'siyl-doc-', DOC_TMP_TTL = 60 * 60 * 1000;
async function grGet(route) { const r = await fetch(ORIGIN + route, { headers: { 'x-gr-token': token() }, cache: 'no-store' }); return r; }
async function grJson(route) { const r = await grGet(route); let j = null; try { j = await r.json(); } catch (e) { j = null; } return { ok: r.ok && !!(j && j.ok), status: r.status, j }; }
function sweepDocCopies(all) {
  for (const d of fs.readdirSync(os.tmpdir())) {
    if (!d.startsWith(DOC_TMP)) continue;
    const p = path.join(os.tmpdir(), d);
    try { if (all || Date.now() - fs.statSync(p).mtimeMs > DOC_TMP_TTL) fs.rmSync(p, { recursive: true, force: true }); } catch (e) { /* the next run */ }
  }
}
const day = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toISOString().slice(0, 10); };
async function documentsOverview(asJson) {
  sweepDocCopies(false);
  const ret = await grJson('/api/gr/documents/retention');
  if (!ret.ok) { console.error('the document store could not be read (' + ret.status + ')'); process.exit(1); }
  /* the roster: every guest of the register (the auth index — invitation and guest ids only), named from the journeys where known */
  const roster = new Map();
  try { for (const e of Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'register', 'auth-index.json'), 'utf8')).entries || {})) if (e && e.g && e.i) roster.set(e.g, { guestId: e.g, invitationId: e.i, name: '' }); } catch (e) { console.error('the register index could not be read'); process.exit(1); }
  const jr = await grJson('/api/gr/journeys');
  if (jr.ok) for (const x of jr.j.journeys || []) { const r = roster.get(x.guestId); if (r && x.name) r.name = String(x.name).split(/\s+/)[0]; }
  const docs = {}, unknown = new Set();
  for (const inv of Object.keys(ret.j.byInvitation || {})) {
    const d = await grJson('/api/gr/documents?invitation=' + encodeURIComponent(inv));
    if (!d.ok) { unknown.add(inv); continue; }
    for (const x of d.j.documents || []) {
      (docs[x.guestId] = docs[x.guestId] || {})[x.kind] = x.receivedAt;
      if (!roster.has(x.guestId)) roster.set(x.guestId, { guestId: x.guestId, invitationId: inv, name: '(not in the register)' });
    }
  }
  const state = (g, kind) => unknown.has(g.invitationId) ? 'Unknown — could not be read' : docs[g.guestId] && docs[g.guestId][kind] ? 'Received ' + day(docs[g.guestId][kind]) : 'Missing';
  const rows = [...roster.values()].sort((a, b) => a.guestId.localeCompare(b.guestId, undefined, { numeric: true })).map((g) => ({ guestId: g.guestId, invitationId: g.invitationId, name: g.name, passport: state(g, 'passport'), flight: state(g, 'flight') }));
  if (asJson) { console.log(JSON.stringify({ at: new Date().toISOString(), guests: rows.length, rows }, null, 2)); return; }
  const n = (k) => rows.filter((r) => r[k].startsWith('Received')).length;
  console.log('DOCUMENTS · ' + rows.length + ' registered guests · Passport received ' + n('passport') + ' · Flight information received ' + n('flight') + (unknown.size ? ' · ' + unknown.size + ' invitation(s) could not be read' : ''));
  console.log('Guest   Name                Passport              Flight information');
  for (const r of rows) console.log(r.guestId.padEnd(8) + (r.name || '').slice(0, 18).padEnd(20) + r.passport.padEnd(22) + r.flight + (r.passport.startsWith('Received') || r.flight.startsWith('Received') ? '   → documents-open ' + r.invitationId + ' ' + r.guestId + ' <passport|flight>' : ''));
}
async function documentsOpen(inv, gid, kind) {
  if (!/^INV-[A-Za-z0-9_-]{1,32}$/.test(inv || '') || !/^[A-Za-z0-9_-]{1,32}$/.test(gid || '') || (kind !== 'passport' && kind !== 'flight')) { console.error('usage: documents-open INV-G001 G001 passport|flight'); process.exit(2); }
  sweepDocCopies(false);
  const list = await grJson('/api/gr/documents?invitation=' + encodeURIComponent(inv));
  if (!list.ok) { console.error('the documents could not be read (' + list.status + ')'); process.exit(1); }
  const cur = (list.j.documents || []).find((d) => d.guestId === gid && d.kind === kind);
  if (!cur) { console.log('Missing — no ' + kind + ' document for ' + gid); process.exit(0); }
  const r = await grGet('/api/gr/document?key=' + encodeURIComponent(cur.key));
  if (!r.ok) { console.error('the document could not be opened (' + r.status + ')'); process.exit(1); }
  const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/heic': '.heic', 'image/heif': '.heif', 'image/webp': '.webp', 'application/pdf': '.pdf' };
  const ext = EXT[(r.headers.get('content-type') || '').split(';')[0].trim()] || '.bin';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), DOC_TMP)); fs.chmodSync(dir, 0o700);
  const file = path.join(dir, gid + '-' + kind + ext);
  fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()), { mode: 0o600, flag: 'wx' });
  console.log(gid + ' · ' + kind + ' · received ' + day(cur.receivedAt) + ' — opened from a private temporary copy (removed after an hour, or now: documents-clean)');
  if (process.platform === 'darwin') require('child_process').spawn('open', [file], { stdio: 'ignore', detached: true }).unref();
  else console.log(file);
  /* the copy is deleted after an hour by a detached timer of its own — whether or not this tool runs again */
  require('child_process').spawn(process.execPath, ['-e', 'setTimeout(() => require("fs").rmSync(process.argv[1], { recursive: true, force: true }), ' + DOC_TMP_TTL + ')', dir], { stdio: 'ignore', detached: true }).unref();
}

(async () => {
  const actor = flag('actor') || process.env.USER || 'guest-relations';
  switch (cmd) {
    case 'status': return call('/api/status?invitation=' + encodeURIComponent(args[0] || ''), 'GET');
    case 'confirm': {
      /* AS SENT, AND TODAY (Owner, 8 Oct 2026): what the guest was sent beside today's Billing Engine, before anything is confirmed */
      const usd = (c) => (c == null ? '—' : 'USD ' + (c / 100).toFixed(2));
      let ack;
      const pc = await grJson('/api/gr/price-check?invitation=' + encodeURIComponent(args[0] || ''));
      if (!pc.ok) {
        if (!args.includes('--unverified')) { console.error('The amounts cannot be compared just now (' + pc.status + '): ' + ((pc.j && pc.j.error) || '') + '\nNothing was confirmed. Retry, or confirm with --unverified.'); process.exit(2); }
        ack = 'UNVERIFIED'; console.log('Confirming WITHOUT the price comparison (it cannot be made now; recorded as UNVERIFIED).');
      } else {
        const lines = pc.j.lines || [];
        if (lines.length) console.log('AS SENT TO THE GUEST            TODAY (BILLING ENGINE)   ' + lines.map((l) => '\n  ' + String(l.key || '?').padEnd(30) + usd(l.stated).padEnd(14) + usd(l.engine).padEnd(14) + l.outcome).join(''));
        if (pc.j.material) {
          const seen = flag('acknowledge-prices') || '';
          console.log('\nDIGEST ' + pc.j.digest.slice(0, 12));
          if (seen.length < 8 || !pc.j.digest.startsWith(seen)) {
            console.error('The amounts this guest was sent differ from today\'s Billing Engine. Nothing was confirmed.\nThe statement will use today\'s amounts; tell the guest if needed. Confirm with --acknowledge-prices ' + pc.j.digest.slice(0, 12) + ' once seen.');
            process.exit(2);
          }
          ack = pc.j.digest;
        }
      }
      return call('/api/confirm', 'POST', { invitationId: args[0], action: 'confirm', actor, note: flag('note') || '', ...(ack ? { acknowledgePriceDifference: ack } : {}) });
    }
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
    case 'documents': return documentsOverview(args.includes('--json'));
    case 'documents-open': return documentsOpen(args[0], args[1], args[2]);
    case 'documents-clean': sweepDocCopies(true); console.log('every temporary document copy removed'); return;
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
