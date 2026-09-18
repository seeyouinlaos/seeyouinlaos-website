#!/usr/bin/env node
/* ============================================================================
   INFRASTRUCTURE FREEZE GUARD (Owner, 18 Sep 2026 · P0 recovery).

   Hosting platform, public origin, GitHub Pages state, Cloudflare runtime,
   auth authority, email transport, KV, Durable Objects and production routing
   may not change as part of design, copy, UX, refactoring or ordinary release
   work. This guard compares the repository against infra/PRODUCTION.json and
   fails the release check (gate I1) and the test suite when ordinary work:
     · enables GitHub Pages (a Pages workflow, CNAME, .nojekyll)
     · introduces github.io / pages.dev / trycloudflare.com as a guest-facing host
     · changes the production public origin
     · changes the Worker service name
     · removes or disables workers.dev, adds routes or custom domains
     · changes the KV / Durable Object bindings or migrations
     · changes the auth authority (src/auth.js, register/crypto.mjs)
     · changes the email provider / configuration
     · edits infra/PRODUCTION.json itself
   unless the commit that makes the change carries an explicit
   `OWNER-INFRA-CHANGE: <what the Owner authorised>` trailer (or, for a local
   run before the commit, OWNER_INFRA_CHANGE=<what> in the environment).

     node src/infra-guard.cjs            static checks (no network)
     node src/infra-guard.cjs --live     + public DNS and HTTPS of the origin
     node src/infra-guard.cjs --json     machine-readable result
   ========================================================================== */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, f))).digest('hex');
const M = JSON.parse(process.env.INFRA_GUARD_MANIFEST ? fs.readFileSync(process.env.INFRA_GUARD_MANIFEST, 'utf8') : read('infra/PRODUCTION.json'));   /* the override exists for the guard's own negative test only */
const problems = [], notes = [];
const bad = (what) => problems.push(what);

/* the exact change authority: the OWNER-INFRA-CHANGE marker on HEAD or in the environment */
function marker() {
  const env = (process.env.OWNER_INFRA_CHANGE || '').trim(); if (env) return 'env: ' + env;
  try { const m = /^OWNER-INFRA-CHANGE:\s*(.+)$/m.exec(execSync('git log -1 --format=%B', { cwd: ROOT, encoding: 'utf8' })); if (m) return 'HEAD: ' + m[1].trim(); } catch (e) {}
  return '';
}
/* which pinned files changed against the previous commit (committed or in the working tree) */
function changedPinned() {
  const files = ['infra/PRODUCTION.json', 'wrangler.jsonc', 'src/auth.js', 'register/crypto.mjs', '.assetsignore'];
  try {
    const out = execSync('git diff --name-only HEAD~1 -- ' + files.map((f) => JSON.stringify(f)).join(' ') + ' ; git diff --name-only HEAD -- ' + files.map((f) => JSON.stringify(f)).join(' ') + ' ; git ls-files --others --exclude-standard -- ' + files.map((f) => JSON.stringify(f)).join(' '), { cwd: ROOT, encoding: 'utf8', shell: '/bin/sh' });
    return [...new Set(out.split('\n').map((s) => s.trim()).filter(Boolean))];
  } catch (e) { return []; }
}

/* 1 · the Worker configuration */
const wj = read('wrangler.jsonc');
const cfg = JSON.parse(wj.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/mg, ''));
if (cfg.name !== M.service) bad('Worker service name changed: ' + cfg.name + ' (frozen: ' + M.service + ')');
if (cfg.workers_dev === false) bad('workers.dev disabled in wrangler.jsonc (frozen: enabled)');
if (Array.isArray(cfg.routes) && cfg.routes.length || cfg.route) bad('routes added to wrangler.jsonc (frozen: none)');
if (!cfg.assets || cfg.assets.binding !== M.assets.binding || cfg.assets.directory !== M.assets.directory) bad('assets binding changed (frozen: ' + M.assets.binding + ' · ' + M.assets.directory + ')');
const kv = (cfg.kv_namespaces || []).map((k) => k.binding + ':' + k.id).sort().join(',');
if (kv !== M.kv.map((k) => k.binding + ':' + k.id).sort().join(',')) bad('KV bindings changed: ' + (kv || 'none') + ' (frozen: ' + M.kv.map((k) => k.binding + ':' + k.id).join(',') + ')');
const dos = ((cfg.durable_objects || {}).bindings || []).map((d) => d.name + ':' + d.class_name).sort().join(',');
if (dos !== M.durableObjects.map((d) => d.name + ':' + d.class).sort().join(',')) bad('Durable Object bindings changed: ' + (dos || 'none'));
const mig = (cfg.migrations || []).map((m) => m.tag + ':' + [].concat(m.new_sqlite_classes || [], m.new_classes || []).join('+')).join(',');
if (mig !== M.migrations.join(',')) bad('Durable Object migrations changed: ' + (mig || 'none') + ' (frozen: ' + M.migrations.join(',') + ')');
if (!cfg.vars || cfg.vars.MAIL_FROM !== M.email.from) bad('MAIL_FROM changed (frozen: ' + M.email.from + ')');
if (/"pages_build_output_dir"|"pages"/.test(wj.replace(/\/\*[\s\S]*?\*\//g, ''))) bad('Cloudflare Pages configuration found in wrangler.jsonc');

/* 2 · the public origin: the canonical host is service.subdomain.workers.dev and the only *.workers.dev host guest-facing code names */
const host = M.publicOrigin.replace(/^https:\/\//, '');
if (host !== M.service + '.' + M.workersDevSubdomain + '.workers.dev') bad('publicOrigin does not match service.subdomain.workers.dev');
function walk(dir, out) { for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) { if (/^(node_modules|\.git|graphify-out|docs|\.wrangler|dist|test)$/.test(e.name)) continue; walk(p, out); } else if (/\.(html|js|mjs|cjs|json|css|txt|xml|webmanifest)$/.test(e.name) && !/\.private\./.test(e.name)) out.push(p); } return out; }
const files = walk('.', []).filter((f) => !/^(node_modules|docs|test|graphify-out)\//.test(f) && f !== 'infra/PRODUCTION.json' && f !== 'src/infra-guard.cjs' && !/^\.wrangler\//.test(f));
for (const f of files) {
  const t = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const m of t.matchAll(/[a-z0-9.-]+\.workers\.dev/gi)) if (m[0].toLowerCase() !== host) bad(f + ' names another workers.dev host: ' + m[0]);
  for (const h of M.forbiddenHosts) if (new RegExp('[a-z0-9.-]*' + h.replace(/\./g, '\\.'), 'i').test(t)) {
    /* a historical note inside a comment is tolerated in src (the retired mirror is documented there); a URL, a link or a host check is not */
    const hit = (t.match(new RegExp('[^\\n]{0,60}[a-z0-9.-]*' + h.replace(/\./g, '\\.') + '[^\\n]{0,40}', 'i')) || [''])[0];
    if (/https?:\/\/|href=|src=|hostname|origin/i.test(hit)) bad(f + ' introduces a forbidden guest-facing host: ' + hit.trim().slice(0, 100));
  }
}

/* 3 · GitHub Pages must stay disabled: no Pages workflow, no CNAME, no .nojekyll */
if (exists('CNAME')) bad('CNAME present at the root (GitHub Pages custom domain)');
if (exists('.nojekyll')) bad('.nojekyll present at the root (GitHub Pages marker)');
if (exists('.github/workflows')) for (const w of fs.readdirSync(path.join(ROOT, '.github/workflows'))) { const t = read('.github/workflows/' + w); if (/deploy-pages|actions-gh-pages|gh-pages|pages-build-deployment|configure-pages|wrangler pages|cloudflare\/pages-action/i.test(t)) bad('.github/workflows/' + w + ' deploys to GitHub Pages or Cloudflare Pages'); }
if (exists('functions') || exists('_routes.json')) bad('Cloudflare Pages Functions layout present (functions/ or _routes.json)');
const pkg = JSON.parse(read('package.json')); for (const [k, v] of Object.entries(pkg.scripts || {})) if (/wrangler pages|gh-pages/.test(v)) bad('package.json script "' + k + '" publishes to Pages');
if (!/^infra$/m.test(read('.assetsignore'))) bad('.assetsignore does not exclude infra/ (the manifest must never be served)');

/* 4 · the auth authority and the email transport */
for (const [f, h] of Object.entries(M.auth.files)) if (sha(f) !== h) bad(f + ' changed (auth authority) — sha256 ' + sha(f).slice(0, 12) + '… (frozen ' + h.slice(0, 12) + '…)');
const worker = read('src/worker.js');
if (!/import \{ identify, owns, loadIndex \} from '\.\/auth\.js';/.test(worker)) bad('src/worker.js no longer takes identity from src/auth.js');
const mailBranch = new RegExp('if \\(env\\.' + M.email.secret + '\\)[\\s\\S]{0,600}?fetch\\(' + JSON.stringify(M.email.endpoint).replace(/"/g, "'").replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'));
if (!mailBranch.test(worker)) bad('email transport changed (frozen: ' + M.email.provider + ' · ' + M.email.endpoint + ' · secret ' + M.email.secret + ')');

/* 5 · the change authority */
const changed = changedPinned(), mk = marker();
if (changed.length && !mk) bad('pinned infrastructure files changed without an OWNER-INFRA-CHANGE marker: ' + changed.join(', '));
if (changed.length && mk) notes.push('infrastructure change authorised — ' + mk + ' (' + changed.join(', ') + ')');
if (problems.length && mk) { notes.push('OWNER-INFRA-CHANGE marker present (' + mk + '): the differences above must be reflected in infra/PRODUCTION.json before they pass'); }

/* 6 · --live: public DNS and HTTPS of the frozen origin (read-only) */
async function live() {
  const out = [];
  for (const [n, u] of [['cloudflare-doh', 'https://cloudflare-dns.com/dns-query?name=' + host + '&type=A'], ['google-doh', 'https://dns.google/resolve?name=' + host + '&type=A']]) {
    try { const j = await (await fetch(u, { headers: { accept: 'application/dns-json' } })).json(); const a = (j.Answer || []).filter((x) => x.type === 1).map((x) => x.data); if (!a.length) bad('public DNS (' + n + ') returns no A record for ' + host); else out.push(n + ' ' + a.join('/')); } catch (e) { bad('public DNS (' + n + ') unreachable: ' + e.message); }
  }
  try { const r = await fetch(M.publicOrigin + '/', { redirect: 'manual' }); if (r.status !== 200 || (r.headers.get('server') || '') !== 'cloudflare') bad('HTTPS ' + M.publicOrigin + '/ → ' + r.status + ' server=' + r.headers.get('server')); else out.push('https / 200 cloudflare'); } catch (e) { bad('HTTPS ' + M.publicOrigin + ' unreachable: ' + e.message); }
  try { const r = await fetch(M.publicOrigin + '/api/draft'); if (r.status !== 401) bad('/api/draft unauthenticated → ' + r.status + ' (expected 401)'); else out.push('/api/draft 401'); } catch (e) { bad('/api/draft unreachable: ' + e.message); }
  try { const r = await fetch('https://api.github.com/repos/seeyouinlaos/seeyouinlaos-website/pages'); if (r.status !== 404) bad('GitHub Pages API → ' + r.status + ' (expected 404 = disabled)'); else out.push('GitHub Pages 404'); } catch (e) { notes.push('GitHub Pages API unreachable: ' + e.message); }
  return out;
}

(async () => {
  const liveOut = process.argv.includes('--live') ? await live() : [];
  const ok = problems.length === 0;
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ ok, problems, notes, live: liveOut })); }
  else {
    for (const p of problems) console.log('FAIL · ' + p);
    for (const n of notes) console.log('NOTE · ' + n);
    for (const l of liveOut) console.log('LIVE · ' + l);
    console.log(ok ? 'INFRASTRUCTURE FREEZE: intact (' + M.publicOrigin + ' · ' + M.service + ' · workers.dev · GitHub Pages disabled)' : 'INFRASTRUCTURE FREEZE: ' + problems.length + ' violation(s) — an infrastructure change needs the Owner\'s OWNER-INFRA-CHANGE marker and an updated infra/PRODUCTION.json');
  }
  process.exit(ok ? 0 : 1);
})();
