# Release attestation — nothing reaches production unless it passed (Owner, 8 Oct 2026)

**Why.**
- Workers Builds deploys whatever reaches `main`.
- The release check (`node src/release-check.cjs`: 34 gates, including F1 pricing source of truth and I1 infrastructure) needs the
  Google key, so it runs only on the release machine.
- The attestation connects the two. The release machine signs exactly the tree that passed, and the build refuses every other tree.

## The release, step by step (release machine)
1. `git add` everything that is to be released. Nothing tracked may stay unstaged, and nothing untracked may stay unignored.
2. `node src/release-attest.mjs`
   - Refuses unless origin/main is an ancestor of HEAD.
   - Runs `npm test` and the release check, and checks that the staged tree did not change meanwhile.
   - Signs `{ tree, pricing baseline ref, results }` with the release key and stages `infra/release-attestation.json`.
3. Commit, with the trailers the change needs. Then the task branch, the PR and the merge to main, per CLAUDE.md.
4. Workers Builds builds `main`. Once the build step is active (see "Activation"), `node src/release-verify.cjs` runs first and checks:
   - the signature against a pinned key;
   - the commit's tree (without the attestation) against the signed tree;
   - the signed pricing reference against the committed baseline;
   - that every check passed;
   - that the working tree holds nothing the attestation does not cover (the lockfile and `dist/` build output aside);
   - in a Workers Build, HEAD = `WORKERS_CI_COMMIT_SHA`, which must be present.
   Any failure stops wrangler, so nothing is deployed and the live version stays as it was.
5. After the deploy:
   - the live version must be the merged commit;
   - `node src/infra-guard.cjs --live`;
   - `SIYL_ADMIN_INVITATION=<admin invitation> node src/pricing-guard.mjs --live`. This also catches a Google change made after the
     release.

## What it blocks (each one demonstrated on 8 Oct 2026)
- A commit nobody attested, including a change to a single file after the checks.
- A forged or edited attestation, and a key that is not pinned.
- A release whose checks failed. `release-attest` refuses to sign, so the build has no valid attestation. That covers:
  - an invalid financial baseline;
  - a Google rate change nobody acknowledged (F1 reports CHANGED);
  - a pricing defect in code (F1 and the tests);
  - any failing gate.

## Keys
- **Primary key:** `src/release-signing.private.json`, on the release Mac. Git-ignored, mode 600.
- **Backup key:** created next to it as `src/release-signing-backup.private.json`. Move it OFFLINE (e.g. an encrypted USB stick or a
  password manager) and delete the local copy.
- Both public keys are pinned in `infra/PRODUCTION.json` → `releaseVerification.keys`.
- **Rotation, or loss of the primary:**
  1. `node src/release-attest.mjs --new-key primary`, after moving the old file away.
  2. Pin the new public key and remove the old one (infrastructure change, `OWNER-INFRA-CHANGE` trailer).
  3. Until then, the backup key signs: put it in place of the primary file for that release.
- A signature means "these checks passed for this exact tree on the release machine". It is not the Owner's consent; that comes from
  the Owner's orders.

## Limits (stated plainly)
- The verifier, its pinned keys and the `build` setting all live in the repository they protect. That stops ACCIDENTAL unverified
  deploys. Gate I1 additionally pins the step, the verifier's sha256 and both keys, so changing any of them is an infrastructure
  change. It does not stop someone who deliberately removes the build step or swaps the key in a commit.
- Tamper resistance outside the repository (the Owner, in the Cloudflare dashboard → Workers Builds settings):
  1. Set the build variable `SIYL_RELEASE_KEYS` = the two pinned keys as JSON. The verifier then trusts only those, whatever a commit
     says.
  2. Set the deploy command to
     `echo "<pinned sha256>  src/release-verify.cjs" | shasum -a 256 -c && node src/release-verify.cjs && npx wrangler deploy`.
- An older attested tree stays valid. Reverting to a former release redeploys it without a fresh F1 against today's Google. The
  post-deploy `pricing-guard --live` is the check there.
- Once active, every branch push without an attestation fails its Workers Builds preview check. That is intended: nothing unverified
  is uploaded.
- Optionally, a GitHub ruleset on `main`: require a PR, an up-to-date branch and a status check.
- **Break-glass:** a rollback to an earlier version in the Cloudflare dashboard (Workers → Deployments) needs no build and is
  unaffected. Removing the build step is an infrastructure change.

## Local development
- `wrangler dev` runs the build step too. `SIYL_RELEASE_VERIFY=off` skips it locally, but only where no `CI` or `WORKERS_CI*` variable
  exists, so a build never skips.
- `npm run build` (a dry run) verifies like a deploy would.

## Activation (an infrastructure change: needs the Owner's specific authorisation)
0. Before anything else, the Owner reads the Workers Builds build and deploy commands in the dashboard. Neither can be read with the
   API token. The verifier blocks a build that rewrites tracked files other than `dist/`.
1. `wrangler.jsonc`: `"build": { "command": "node src/release-verify.cjs" }`.
2. `infra/PRODUCTION.json`: `"releaseVerification": { "command": …, "verifierSha256": …, "keys": { "<primary id>": "<spki b64>", "<backup id>": "<spki b64>" } }`.
3. `src/infra-guard.cjs` (gate I1): the step, the verifier's sha256, two keys whose ids match their public keys; the verifier is a
   pinned file.
4. One commit with `OWNER-INFRA-CHANGE: release verification build step + pinned release keys (Owner authorisation <date>)`, attested.
5. Proof, preview branch first:
   - an unattested commit on a branch must fail its Workers Build with the verifier's own `RELEASE VERIFY: BLOCKED` line;
   - an attested branch commit must pass;
   - then the attested commit on main deploys, and the live version equals it.
   - Afterwards, move the backup private key offline. The activation script reads it once to pin its public half.
6. Rollback: revert that commit (with `OWNER-INFRA-CHANGE`). Until it builds, the dashboard rollback stands.
