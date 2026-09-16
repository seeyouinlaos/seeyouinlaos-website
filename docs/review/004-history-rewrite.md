# 004 — Public history rewrite (Owner authorisation, 16 Sep 2026)

**Why.** One guest's access credential (G001) had entered the public repository on 11 Sep 2026 inside an acceptance
walk (`docs/acceptance/2026-09-11-efg/walk.mjs`) and was removed from the tree the same day, but stayed readable in
the history. On 16 Sep 2026 the Owner authorised (1) the rotation of that one credential and (2) a rewrite of the
public history solely to remove it.

**What was done.**
1. The credential was rotated first (`src/rotate-credential.cjs G001`): one shipped record re-encrypted under the new
   credential with the identical payload, one auth-index entry replaced, the other 46 records and entries
   byte-identical; the guest keeps the guest id, the invitation, the party and every engine record. The old credential
   is rejected by the deployed register and the engines; the new one opens G001 only.
2. The history was rewritten with `git filter-repo --replace-text` on a fresh mirror, scoped to the two refs that
   reached the exposing commit (`main`, `claude/002-final-run-continuation-5ellm7`): the credential's bytes were replaced
   by a marker in every blob that carried them (five commits); nothing else was touched. Commit ids from the 11 Sep
   E/F/G commit onward changed (74 of 358 on `main`); the tree of `main` is byte-identical before and after. The
   sanitized refs were force-pushed; both local checkouts were reset and garbage-collected; a stale worktree that kept
   the old objects alive was removed.
3. Verified after the rewrite: 0 occurrences of the old credential in `git log --all -p` (every ref, tags included),
   in the tracked files, the untracked working tree, the generated 007 files, the acceptance evidence, and in every
   deployed response body of both origins (719 served files × 2). The other 46 credentials are unchanged and valid.

**What remains on GitHub's side.** The pre-rewrite commits are no longer reachable from any ref, but GitHub keeps
unreferenced objects until its garbage collection runs; the old commit ids still resolve by direct address until
then. The credential they carry is invalid. Only GitHub Support can purge dangling objects early — the Owner may ask
for that.

**Commit id map (the release commits of 15–16 Sep 2026, old → new).**

| old | new | commit |
|---|---|---|
| c0497cd | 8df635c | FINAL RELEASE PREPARATION |
| cbe5277 | cc2e73a | 003 · Owner patch (Edit 2) |
| ad75a0c | 283602a | 003 · The venue experience |
| 1d772ab | 3ff1315 | 003 · venue data carries Drive ids only |
| cb5b228 | bdfcda2 | 003 · 007 FINAL V2 |
| 40adcf4 | 81bf675 | 003 · Edit 3 (access) |
| 3ab0b31 | a308c7f | 003 · Edit 3 release evidence |
| 6170755 | e520bd1 | 003 · Edit 3: the access line's space is reserved |
| e599230 | 54a9e3b | 003 · release evidence at the final code |
| c425eaa | 90f5d2b | SECURITY · one credential rotated |

The 007 files and the evidence READMEs written before the rewrite name the old ids; they are historical documents
and were not edited.
