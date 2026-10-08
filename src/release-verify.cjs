'use strict';
/* ============================================================================
   THE PRE-DEPLOYMENT CHECK (Owner, 8 Oct 2026 · production safety)

   Workers Builds deploys whatever reaches main. The release check, gate F1 included, needs the Google key and runs only on the
   release machine. This file connects the two. The release machine signs what passed (src/release-attest.mjs), and the build
   refuses anything else:

     · infra/release-attestation.json names a git TREE: everything in the commit except the attestation itself. It also names the
       pricing baseline reference and the results of `npm test` and `node src/release-check.cjs` (34 gates incl. F1 and I1).
     · it is signed with an Ed25519 key that exists only on the release machine; the public keys are pinned in
       infra/PRODUCTION.json (releaseVerification.keys)
     · here, in the build: the signature must verify with a pinned key; the commit's tree (without the attestation) must be exactly
       the signed tree; the working tree must hold no change to a tracked file (package-lock.json aside: the Worker bundles no npm
       package); in Workers Builds, HEAD must be WORKERS_CI_COMMIT_SHA; the signed pricing reference must be the committed
       baseline's; every check must have passed. Anything else → exit 1 → wrangler aborts → nothing is deployed.

     node src/release-verify.cjs          the check (wrangler.jsonc build.command, once the Owner has authorised it)

   It needs no secret, no network and no npm package: node and git only. Local `wrangler dev` may skip it with
   SIYL_RELEASE_VERIFY=off, but only where no CI or WORKERS_CI* variable exists; a build never skips. A break-glass rollback
   to an earlier version from the Cloudflare dashboard does not run a build and is unaffected.
   ========================================================================== */
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ATTESTATION = 'infra/release-attestation.json';
const LOCKFILE = 'package-lock.json';
/* build output a dry run rewrites (`npm run build` → dist/): never deployed (the Worker's main is src/worker.js; .assetsignore) */
const BUILD_OUTPUT = /^dist\//;

function git(args, opts, cwd) {
  return execFileSync('git', args, { cwd: cwd || ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...(opts || {}) }).trim();
}

/** The git tree of HEAD — or of the index — without the attestation: the exact content a release ships. */
function treeWithout(source, cwd) {
  const tmp = path.join(os.tmpdir(), 'siyl-release-' + process.pid + '-' + crypto.randomBytes(4).toString('hex'));
  const env = { ...process.env, GIT_INDEX_FILE: tmp };
  try {
    if (source === 'INDEX') fs.copyFileSync(path.join(git(['rev-parse', '--absolute-git-dir'], null, cwd), 'index'), tmp);
    else git(['read-tree', 'HEAD'], { env }, cwd);
    git(['rm', '--cached', '-q', '--ignore-unmatch', '--', ATTESTATION], { env }, cwd);
    return git(['write-tree'], { env }, cwd);
  } finally { try { fs.unlinkSync(tmp); } catch (e) { /* nothing to remove */ } }
}

/* one canonical form for signing and verifying: keys sorted at every level */
function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v);
}
function keyIdOf(publicKeyDerB64) { return crypto.createHash('sha256').update(Buffer.from(publicKeyDerB64, 'base64')).digest('hex').slice(0, 16); }
function sign(payload, privateKeyPem) { return crypto.sign(null, Buffer.from(canonical(payload)), crypto.createPrivateKey(privateKeyPem)).toString('base64'); }
function signatureValid(payload, signature, publicKeyDerB64) {
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(publicKeyDerB64, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify(null, Buffer.from(canonical(payload)), key, Buffer.from(String(signature || ''), 'base64'));
  } catch (e) { return false; }
}

/**
 * The verdict, from facts gathered by the caller (pure, so every refusal is testable):
 *   { attestation, keys: { keyId: spkiDerB64 }, tree, pricingRef, dirty: [paths], head, ciCommit }
 */
function verdict({ attestation, keys, tree, pricingRef, dirty, head, ciCommit, inBuild }) {
  const problems = [];
  if (!keys || !Object.keys(keys).length) problems.push('no release key is pinned in infra/PRODUCTION.json (releaseVerification.keys)');
  if (!attestation || !attestation.payload) return problems.concat(['no attestation (' + ATTESTATION + '): this tree was never signed by the release machine']);
  const p = attestation.payload, key = keys && Object.prototype.hasOwnProperty.call(keys, p.keyId) ? keys[p.keyId] : null;
  if (!key || keyIdOf(key) !== p.keyId) problems.push('the attestation names key ' + p.keyId + ', which is not a pinned release key');
  else if (!signatureValid(p, attestation.signature, key)) problems.push('the attestation signature does not verify');
  if (p.tree !== tree) problems.push('this commit is not the tree that passed (signed ' + String(p.tree).slice(0, 12) + ', building ' + String(tree).slice(0, 12) + ')');
  if (p.pricingRef !== pricingRef) problems.push('the signed pricing baseline ' + p.pricingRef + ' is not the committed one (' + pricingRef + ')');
  const c = p.checks || {};
  if (!(c.npmTest && c.npmTest.fail === 0 && c.npmTest.pass > 0)) problems.push('npm test did not pass in the signed run');
  if (!(c.releaseCheck && c.releaseCheck.passed === c.releaseCheck.total && c.releaseCheck.total > 0)) problems.push('the release check did not pass every gate in the signed run');
  for (const g of ['F1', 'I1']) if (!(c.gates && c.gates[g] === 'PASS')) problems.push('gate ' + g + ' did not pass in the signed run');
  if (dirty && dirty.length) problems.push('the working tree holds changes the attestation does not cover: ' + dirty.slice(0, 5).join(', '));
  if (ciCommit && head !== ciCommit) problems.push('HEAD ' + String(head).slice(0, 12) + ' is not the commit Workers Builds is building (' + String(ciCommit).slice(0, 12) + ')');
  if (inBuild && !ciCommit) problems.push('a Workers Build without WORKERS_CI_COMMIT_SHA: the commit being built cannot be confirmed');
  return problems;
}

/* the trusted keys: SIYL_RELEASE_KEYS (a Workers Builds variable the Owner sets — outside the repository, so a commit cannot swap
   it) wins over the keys pinned in infra/PRODUCTION.json; once set, nothing in the tree can add a key */
function pinnedKeys(env) {
  const fromEnv = env && env.SIYL_RELEASE_KEYS;
  if (fromEnv) { try { const k = JSON.parse(fromEnv); return k && typeof k === 'object' && !Array.isArray(k) ? k : {}; } catch (e) { return {}; } }
  try { const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/PRODUCTION.json'), 'utf8')); return (m.releaseVerification && m.releaseVerification.keys) || {}; }
  catch (e) { return {}; }
}
function committedPricingRef() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/pricing-baseline.json'), 'utf8')).ref || null; } catch (e) { return null; }
}
const inCI = (env) => Object.keys(env).some((k) => k === 'CI' || k.startsWith('WORKERS_CI'));

function main() {
  if (process.env.SIYL_RELEASE_VERIFY === 'off' && !inCI(process.env)) {
    console.log('RELEASE VERIFY: skipped for local development (SIYL_RELEASE_VERIFY=off, no CI) — never a release');
    return 0;
  }
  let facts;
  try {
    if (!fs.existsSync(path.join(ROOT, '.git'))) throw new Error('no git checkout');
    /* every change the attestation does not cover — tracked or untracked-and-unignored — except the lockfile and build output */
    const dirty = git(['status', '--porcelain', '--untracked-files=all']).split('\n').map((l) => l.slice(3).trim()).filter((f) => f && f !== LOCKFILE && !BUILD_OUTPUT.test(f));
    let attestation = null; try { attestation = JSON.parse(fs.readFileSync(path.join(ROOT, ATTESTATION), 'utf8')); } catch (e) { attestation = null; }
    facts = { attestation, keys: pinnedKeys(process.env), tree: treeWithout('HEAD'), pricingRef: committedPricingRef(), dirty, head: git(['rev-parse', 'HEAD']),
      ciCommit: process.env.WORKERS_CI_COMMIT_SHA || null, inBuild: Object.keys(process.env).some((k) => k.startsWith('WORKERS_CI')) };
  } catch (e) {
    console.log('RELEASE VERIFY: BLOCKED — the checkout cannot be verified (' + String(e && e.message || e).split('\n')[0].slice(0, 160) + ')');
    return 1;
  }
  const problems = verdict(facts);
  for (const p of problems) console.log('RELEASE VERIFY: FAIL ' + p);
  console.log(problems.length ? 'RELEASE VERIFY: BLOCKED — nothing is deployed (' + problems.length + ' problem(s))'
    : 'RELEASE VERIFY: OK — tree ' + facts.tree.slice(0, 12) + ' passed npm test, the release check (F1, I1) at ' + facts.attestation.payload.at + ', pricing ref ' + facts.pricingRef);
  return problems.length ? 1 : 0;
}

module.exports = { treeWithout, canonical, keyIdOf, sign, signatureValid, verdict, pinnedKeys, ATTESTATION, inCI };
if (require.main === module) process.exit(main());
