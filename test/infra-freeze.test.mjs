/* INFRASTRUCTURE FREEZE (Owner, 18 Sep 2026) — the guard holds every frozen pin, and it detects a change to each of them. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, src } from './sandbox.mjs';

const run = (env = {}) => { const r = spawnSync('node', [path.join(ROOT, 'src/infra-guard.cjs'), '--json'], { encoding: 'utf8', env: { ...process.env, ...env } }); return JSON.parse(r.stdout.trim().split('\n').pop()); };
const manifest = JSON.parse(src('infra/PRODUCTION.json'));
const tampered = (mutate) => { const m = JSON.parse(JSON.stringify(manifest)); mutate(m); const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'siyl-infra-')), 'PRODUCTION.json'); fs.writeFileSync(f, JSON.stringify(m)); return f; };

test('FREEZE · every frozen pin holds on this tree: one Worker service, workers.dev, one public origin, the bindings, the auth authority, the email transport, GitHub Pages disabled', () => {
  const r = run();
  /* the change-authority line is the release gate's concern (it needs the commit's OWNER-INFRA-CHANGE trailer); here every pin itself must hold */
  const pins = r.problems.filter((p) => !/without an OWNER-INFRA-CHANGE marker/.test(p));
  assert.deepEqual(pins, []);
  assert.equal(manifest.publicOrigin, 'https://seeyouinlaos-website.suthep-hrg.workers.dev'); assert.equal(manifest.service, 'seeyouinlaos-website'); assert.equal(manifest.workersDev, true); assert.equal(manifest.githubPages, 'disabled');
});

test('FREEZE · the guard detects a changed service name, origin, KV binding, Durable Object, auth file, email transport', () => {
  const cases = [
    [(m) => { m.service = 'seeyouinlaos-site'; }, /service name changed/],
    [(m) => { m.workersDevSubdomain = 'someone-else'; }, /publicOrigin does not match|another workers\.dev host/],
    [(m) => { m.kv[0].id = '0000000000000000000000000000dead'; }, /KV bindings changed/],
    [(m) => { m.durableObjects.pop(); }, /Durable Object bindings changed/],
    [(m) => { m.migrations.pop(); }, /migrations changed/],
    [(m) => { m.auth.files['src/auth.js'] = 'f'.repeat(64); }, /src\/auth\.js changed \(auth authority\)/],
    [(m) => { m.email.endpoint = 'https://api.resend.com/emails'; }, /email transport changed/],
    [(m) => { m.email.from = 'someone@example.org'; }, /MAIL_FROM changed/],
    [(m) => { m.assets.directory = 'dist'; }, /assets binding changed/],
  ];
  for (const [mutate, expect] of cases) { const r = run({ INFRA_GUARD_MANIFEST: tampered(mutate), OWNER_INFRA_CHANGE: 'test' }); assert.equal(r.ok, false, String(expect)); assert.ok(r.problems.some((p) => expect.test(p)), String(expect) + ' → ' + r.problems.join(' | ')); }
});

test('FREEZE · guest-facing code names no github.io / pages.dev host and no second workers.dev host; the manifest is never served; the release check carries gate I1', () => {
  for (const f of ['assets/invite.mjs', 'assets/guest.js', 'assets/draft.js', 'assets/rooms.js', 'assets/avatar.js', 'src/worker.js', 'journey/index.html', 'build/standalone.html']) { const t = src(f); assert.doesNotMatch(t, /https?:\/\/[a-z0-9.-]*github\.io|href="https?:\/\/[a-z0-9.-]*pages\.dev/i, f); for (const m of t.matchAll(/[a-z0-9.-]+\.workers\.dev/gi)) assert.equal(m[0], 'seeyouinlaos-website.suthep-hrg.workers.dev', f); }
  assert.match(src('.assetsignore'), /^infra$/m);
  assert.match(src('src/release-check.cjs'), /gate\('I1', 'Infrastructure freeze/);
  assert.match(src('CLAUDE.md'), /INFRASTRUCTURE FREEZE \(Owner, 18 Sep 2026\)/);
});
