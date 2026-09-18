# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

Do not ship yet: two P2 [medium] replay defects remain. No defensible P0/P1 [high] remains from this pass. Fixes 6–8 address the reported paths; fix 9 still loses data. All 27 targeted tests passed; full-suite validation encountered read-only sandbox EPERM failures.

Findings:
- [medium] P2: Fresh-device replay overwrites saved guest answers (assets/draft.js:63-64)
  Reproduce with no local siyl.guest, existing server profile answers, and a delayed draft GET. Choose Bangkok before GET completes. setScope creates guests[id] with empty profile/submitted objects. Because replayObject requires B to be an object before recursing, it replaces the entire server guests subtree with this newly initialized subtree. Executing the real pull confirmed saved drink, flavor, film and submitted values disappeared and the subsequent PUT contained the emptied record, without a conflict notice. setBase(server keys) makes this destructive replacement an ordinary local edit.
  Recommendation: For mergeable records, recurse into local/server objects with an empty base when the baseline object is absent. Preserve server fields omitted by locally initialized records. Add a delayed fresh-device pull regression using setScope and assert both preserved answers and outgoing PUT contents.
- [medium] P2: Field replay turns a destination selection into a trip decline (assets/draft.js:60-64)
  Reproduce with cached Bangkok-only scope and a server copy changed to none=true on another device. During the delayed GET, select China locally. Local none remains false, equal to its baseline, so replay retains server none=true while adding china=true. Executing pull produced and PUT this contradictory scope without notice. guest.js:194 gives none precedence, so the guest's live selection becomes 'Not joining this trip'; the planner can consequently release holdings outside that interpreted scope.
  Recommendation: Replay scope as a domain operation or atomic decision, preserving the exclusivity of none and destination selections. Add a delayed two-device pull regression asserting the interpreted scope and outgoing PUT reflect the live destination choice.

Next steps:
- Fix both replay cases and add end-to-end pull/PUT regressions.
- Rerun the full suite in a writable test environment.
