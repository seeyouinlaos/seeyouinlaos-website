# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

Do not ship yet: [high] remains in re-entrant release cleanup. Four material findings remain despite 25 targeted tests passing. Participation, Essential eligibility, and flavour fixes appear sound; no additional defensible XSS, cross-guest, or fixed-host-room finding emerged.

Findings:
- [high] [high] Release cleanup re-enters before its guard is set (your-journey.html:379-382)
  Reproduce with a selected Sangkhathan offering and a held wedding seat, then decline Vientiane. The seat release remains asynchronous; removing Sangkhathan synchronously emits siyl:bag and calls render(). The seat is still stale and RECON has not yet been assigned, so render() calls reconcileScope() again. offeringOf() retains the earlier answer, so each nested call removes even the already-absent Sangkhathan line, emits another event, and starts another seat release. This causes recursive rendering and a release-request storm. Executing the extracted cleanup with the real Bag events and render guard exceeded a 40-call recursion cutoff.
  Recommendation: Set an in-progress guard before any event-emitting mutation or request, serialize reconciliation, and clear the guard in finally. Remove Sangkhathan only when its Bag line exists. Test with retained offering answers and a delayed seat-release response.
- [medium] [medium] Engine holds can block submission without a release path (your-journey.html:376-377)
  Reproduce by holding prewed/heritage while the cached prewed Bag line lacks room, then decline the trip. Cleanup deletes the line without releasing the engine hold. The executed reproduction ended with an empty Bag, mine.prewed still held, release:room:prewed blocking readiness, and RECON_FAILED empty. Cleanup never iterates engine holds, so there is no Release again control and further reconciliation cannot release this state. A stale draft or migration can produce this mismatch.
  Recommendation: Reconcile excluded holds directly from SIYL_UNITS.view().mine using the engine stage release API, independently of Bag metadata. Include unresolved engine holds in retry feedback and preserve fixed allocations.
- [medium] [medium] Frozen seats permanently block a truthful decline (assets/guest.js:461-462)
  Reproduce by selecting a wedding seat, freezing the seating ledger, then declining Vientiane. staleFor() makes the seat an unconditional journey blocker, but src/seating.js:262 rejects every guest release while frozen. Release again repeats the same refusal indefinitely; the guest cannot send the cancellation without operator intervention or falsely rejoining Vientiane.
  Recommendation: Provide an explicit frozen-ledger cancellation path: either permit authenticated release of the guest's own seat or durably queue an operator cancellation and allow the truthful decline to be submitted.
- [medium] [medium] Pull override resurrects unrelated selections removed elsewhere (assets/draft.js:170-177)
  Reproduce with device A caching a train line and device B having removed it. While A's draft GET is pending, add 1872 on A. The override treats the entire changed siyl.bag string as the live action, replacing the server's empty Bag with both train and 1872. The executed reproduction confirmed the pending PUT contained both lines. Recording the fetched revision as the new base lets this stale train selection overwrite the server without a conflict or notice. The same whole-key behavior can discard unrelated guest-record edits.
  Recommendation: Replay only item/field changes made between before and local onto the fetched server state, preserving server removals of untouched items. Add a two-device regression covering remote removal plus an unrelated local edit during GET.

Next steps:
- Fix reconciliation re-entrancy and ensure every readiness release blocker has a working recovery path.
- Replace whole-key pull overrides with granular edit replay and add the missing concurrency regressions.
