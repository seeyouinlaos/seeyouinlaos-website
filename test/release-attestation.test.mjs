/* ============================================================================
   THE PRE-DEPLOYMENT CHECK (Owner, 8 Oct 2026) — src/release-verify.cjs refuses every tree the release machine did not sign:
   no attestation, a key that is not pinned, a forged signature, a different tree, another pricing baseline, a failed check, a
   dirty working tree, a HEAD that is not the commit being built. Synthetic keys and a throw-away git repository only.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const V = require('../src/release-verify.cjs');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function keyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
  return { pub, id: V.keyIdOf(pub), pem: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
}
const k = keyPair(), other = keyPair();
const TREE = 'a'.repeat(40), REF = '8d6b34089506';
const payload = (o) => ({ v: 1, tree: TREE, pricingRef: REF, keyId: k.id, at: '2026-10-08T12:00:00Z', base: 'b'.repeat(40),
  checks: { npmTest: { pass: 880, fail: 0 }, releaseCheck: { passed: 34, total: 34 }, gates: { F1: 'PASS', I1: 'PASS' } }, ...o });
const attested = (p, pem) => ({ payload: p, signature: V.sign(p, pem || k.pem) });
const facts = (o) => ({ attestation: attested(payload()), keys: { [k.id]: k.pub }, tree: TREE, pricingRef: REF, dirty: [], head: 'c'.repeat(40), ciCommit: null, ...o });

test('RELEASE VERIFY · a signed, matching tree passes; every other case is refused with its reason', () => {
  assert.deepEqual(V.verdict(facts()), []);
  const reasons = (o) => V.verdict(facts(o)).join(' | ');
  assert.match(reasons({ attestation: null }), /no attestation/);
  assert.match(reasons({ keys: {} }), /no release key is pinned/);
  assert.match(reasons({ keys: { [other.id]: other.pub } }), /not a pinned release key/);
  assert.match(reasons({ attestation: attested(payload(), other.pem) }), /signature does not verify/, 'signed by a key that is not the one it names');
  const forged = attested(payload()); forged.payload = { ...forged.payload, tree: 'f'.repeat(40) };
  assert.match(reasons({ attestation: forged, tree: 'f'.repeat(40) }), /signature does not verify/, 'a payload edited after signing');
  assert.match(reasons({ tree: 'd'.repeat(40) }), /not the tree that passed/, 'code changed after the checks');
  assert.match(reasons({ pricingRef: '000000000000' }), /signed pricing baseline 8d6b34089506 is not the committed one/);
  assert.match(reasons({ attestation: attested(payload({ checks: { ...payload().checks, gates: { F1: 'FAIL', I1: 'PASS' } } })) }), /gate F1 did not pass/);
  assert.match(reasons({ attestation: attested(payload({ checks: { ...payload().checks, npmTest: { pass: 879, fail: 1 } } })) }), /npm test did not pass/);
  assert.match(reasons({ attestation: attested(payload({ checks: { ...payload().checks, releaseCheck: { passed: 33, total: 34 } } })) }), /release check did not pass every gate/);
  assert.match(reasons({ dirty: ['src/billing/engine.js'] }), /working tree changes tracked files/);
  assert.match(reasons({ ciCommit: 'e'.repeat(40) }), /is not the commit Workers Builds is building/);
  /* the canonical form: key order never changes a signature */
  assert.equal(V.canonical({ b: 1, a: { d: [2, { y: 1, x: 0 }], c: 3 } }), V.canonical({ a: { c: 3, d: [2, { x: 0, y: 1 }] }, b: 1 }));
});

test('RELEASE VERIFY · the tree is computed without the attestation, for nested paths, from HEAD and from the index alike', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siyl-tree-'));
  const git = (args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    git(['init', '-q']); git(['config', 'user.email', 't@example.invalid']); git(['config', 'user.name', 't']);
    fs.mkdirSync(path.join(dir, 'assets/deep'), { recursive: true }); fs.mkdirSync(path.join(dir, 'infra'));
    fs.writeFileSync(path.join(dir, 'assets/deep/a.js'), 'a'); fs.writeFileSync(path.join(dir, 'b.txt'), 'b');
    git(['add', '-A']); git(['commit', '-qm', 'one']);
    const plain = git(['rev-parse', 'HEAD^{tree}']);
    const run = (src) => V.treeWithout(src, dir);
    assert.equal(run('HEAD'), plain, 'no attestation: the commit\'s own tree');
    fs.writeFileSync(path.join(dir, V.ATTESTATION), '{}'); git(['add', '-A']);
    assert.equal(run('INDEX'), plain, 'the index without the attestation = the tree that is tested');
    git(['commit', '-qm', 'two']);
    assert.notEqual(git(['rev-parse', 'HEAD^{tree}']), plain);
    assert.equal(run('HEAD'), plain, 'HEAD without the attestation = the signed tree');
    fs.writeFileSync(path.join(dir, 'assets/deep/a.js'), 'changed'); git(['add', '-A']); git(['commit', '-qm', 'three']);
    assert.notEqual(run('HEAD'), plain, 'any other change is another tree');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('RELEASE VERIFY · the local escape never works in a build: with a CI or WORKERS_CI* variable it checks (and fails here without keys)', () => {
  const run = (env) => spawnSync('node', [path.join(ROOT, 'src/release-verify.cjs')], { cwd: ROOT, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env } });
  const local = run({ SIYL_RELEASE_VERIFY: 'off' });
  assert.equal(local.status, 0); assert.match(local.stdout, /skipped for local development/);
  for (const ci of [{ CI: 'true' }, { WORKERS_CI: '1' }, { WORKERS_CI_BUILD_UUID: 'x' }]) {
    const r = run({ SIYL_RELEASE_VERIFY: 'off', ...ci });
    assert.doesNotMatch(r.stdout, /skipped/, JSON.stringify(ci));
  }
  assert.equal(V.inCI({ WORKERS_CI_COMMIT_SHA: 'x' }), true); assert.equal(V.inCI({ HOME: '/x' }), false);
  /* the verifier needs nothing but node and git: no npm package, no network, no secret */
  const src = fs.readFileSync(path.join(ROOT, 'src/release-verify.cjs'), 'utf8');
  for (const m of src.matchAll(/require\('([^']+)'\)/g)) assert.ok(['fs', 'path', 'os', 'crypto', 'child_process'].includes(m[1]), m[1]);
  assert.doesNotMatch(src, /fetch\(|https?:\/\/|process\.env\.[A-Z_]*(KEY|TOKEN|SECRET)/);
});
