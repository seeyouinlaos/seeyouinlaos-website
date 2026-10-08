/* ============================================================================
   THE RELEASE ATTESTATION (Owner, 8 Oct 2026 · production safety) — run on the release machine (the one with the Google key and
   the release signing key), after `git add`, before the commit that is to be deployed:

     node src/release-attest.mjs                 test, check and sign the staged tree → infra/release-attestation.json (staged)
     node src/release-attest.mjs --new-key primary|backup
                                                 a new Ed25519 key pair: the private half stays local (git-ignored), the public half
                                                 is printed to be pinned in infra/PRODUCTION.json — an infrastructure change

   It refuses unless:
     · nothing tracked is changed outside the index (what is tested is what is signed) and nothing untracked is unignored;
     · origin/main is an ancestor of HEAD (a merge to main then ships exactly this tree);
     · `npm test` passes, and `node src/release-check.cjs` passes every gate, F1 and I1 included;
     · the staged tree is still the same tree afterwards.
   The build verifies the result (src/release-verify.cjs). A signature proves "these checks passed on the release machine for this
   exact tree". It is not the Owner's consent: that comes from the Owner's orders.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { treeWithout, sign, keyIdOf, ATTESTATION } = require('./release-verify.cjs');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_FILES = { primary: 'src/release-signing.private.json', backup: 'src/release-signing-backup.private.json' };
const git = (args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const refuse = (why) => { console.log('ATTEST: REFUSED — ' + why); process.exit(1); };

const argv = process.argv.slice(2);
if (argv[0] === '--new-key') {
  const name = argv[1];
  if (!KEY_FILES[name]) refuse('--new-key primary|backup');
  const file = path.join(ROOT, KEY_FILES[name]);
  if (fs.existsSync(file)) refuse(KEY_FILES[name] + ' already exists — a key is never overwritten');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  fs.writeFileSync(file, JSON.stringify({ keyId: keyIdOf(pub), publicKey: pub, privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }) }, null, 1) + '\n', { mode: 0o600 });
  console.log('ATTEST: new ' + name + ' key ' + keyIdOf(pub) + ' → ' + KEY_FILES[name] + ' (private, git-ignored)');
  console.log('PIN IN infra/PRODUCTION.json releaseVerification.keys (infrastructure change): "' + keyIdOf(pub) + '": "' + pub + '"');
  process.exit(0);
}

const keyFile = path.join(ROOT, KEY_FILES.primary);
if (!fs.existsSync(keyFile)) refuse('no release signing key (' + KEY_FILES.primary + ') on this machine');
const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));

/* what is tested is what is signed */
const clean = () => {
  if (spawnSync('git', ['diff', '--quiet'], { cwd: ROOT }).status !== 0) refuse('tracked files are changed but not staged — `git add` everything that is to be released');
  const stray = git(['ls-files', '--others', '--exclude-standard']);
  if (stray) refuse('untracked files that are not ignored: ' + stray.split('\n').slice(0, 5).join(', '));
};
clean();
try { git(['fetch', '-q', 'origin', 'main']); } catch (e) { refuse('origin/main cannot be read: ' + String(e.message).split('\n')[0]); }
if (spawnSync('git', ['merge-base', '--is-ancestor', 'origin/main', 'HEAD'], { cwd: ROOT }).status !== 0) refuse('origin/main is not an ancestor of HEAD — bring the branch up to date with main first');
const tree = treeWithout('INDEX');

console.log('ATTEST: tree ' + tree.slice(0, 12) + ' — running npm test …');
const t = spawnSync('npm', ['test'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const out = (t.stdout || '') + (t.stderr || '');
const pass = Number((/ℹ pass (\d+)/.exec(out) || [])[1]), fail = Number((/ℹ fail (\d+)/.exec(out) || [])[1]);
if (t.status !== 0 || !(pass > 0) || fail !== 0) refuse('npm test did not pass (pass ' + pass + ', fail ' + fail + ')');

console.log('ATTEST: npm test ' + pass + '/' + (pass + fail) + ' — running the release check …');
const r = spawnSync('node', [path.join(ROOT, 'src/release-check.cjs')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
const lines = (r.stdout || '').split('\n');
const passed = lines.filter((l) => /^PASS \[Gate /.test(l)).length, total = lines.filter((l) => /^(PASS|FAIL) \[Gate /.test(l)).length;
const gate = (id) => (lines.some((l) => l.startsWith('PASS [Gate ' + id + ']')) ? 'PASS' : 'FAIL');
if (r.status !== 0 || passed !== total || gate('F1') !== 'PASS' || gate('I1') !== 'PASS') {
  lines.filter((l) => /^FAIL/.test(l)).slice(0, 6).forEach((l) => console.log('  ' + l.slice(0, 200)));
  refuse('the release check did not pass every gate (' + passed + '/' + total + ', F1 ' + gate('F1') + ', I1 ' + gate('I1') + ')');
}

clean();
if (treeWithout('INDEX') !== tree) refuse('the staged tree changed while the checks ran');
const pricingRef = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/pricing-baseline.json'), 'utf8')).ref;
const payload = { v: 1, tree, pricingRef, keyId: key.keyId, at: new Date().toISOString(), base: git(['rev-parse', 'HEAD']),
  checks: { npmTest: { pass, fail }, releaseCheck: { passed, total }, gates: { F1: gate('F1'), I1: gate('I1') } } };
fs.writeFileSync(path.join(ROOT, ATTESTATION), JSON.stringify({ about: 'Signed by src/release-attest.mjs on the release machine; verified by src/release-verify.cjs in the build. Not the Owner\'s consent — a record that these checks passed for exactly this tree.', payload, signature: sign(payload, key.privateKeyPem) }, null, 1) + '\n');
git(['add', ATTESTATION]);
console.log('ATTEST: SIGNED tree ' + tree.slice(0, 12) + ' · npm test ' + pass + '/' + pass + ' · release check ' + passed + '/' + total + ' (F1, I1) · pricing ref ' + pricingRef + ' · key ' + key.keyId + ' → ' + ATTESTATION + ' (staged; commit it with the release)');
