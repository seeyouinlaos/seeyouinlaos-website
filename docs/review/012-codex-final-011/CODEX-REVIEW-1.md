# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

Do not ship yet. Five reproducible gaps remain in participation, draft merging, and submitted hospitality data. All 26 targeted tests pass but miss these cases.

Findings:
- [high] Failed scope reconciliation still permits sending (your-journey.html:367-375)
  Hold a Vientiane room, make its release request fail, then choose “I won’t be joining this trip.” Reconciliation ignores the returned {ok:false}; the scope remains declined and readiness returns true while the room and priced Bag line remain. Reproduced with the actual reconciliation function. Reloading does not retry reconciliation: its only callers are scope buttons. Review can therefore submit a decline with retained bookings and charges.
  Recommendation: Track pending and failed reconciliation, block sending until resolved, display release errors, and retry against authoritative room and seat state on load and draft application.
- [high] Declining Vientiane still submits previous wedding attendance (review.html:214)
  Answer “yes” for Wedding Dinner, then decline the whole trip. Review hides the wedding section and claims it is not sent, but submission still calls SIYL_TEMPLE.operational() without scope filtering. Reproduction yields readiness=true, scope='Not joining this trip', and dinner='Joining' in both the payload and mail model. Guest Relations receives contradictory attendance information.
  Recommendation: Apply participation scope when constructing operational submissions and email models, including wedding attendance and offerings. Retain historical answers separately if needed for reconsideration.
- [medium] Essential trip books a destination the guest excluded (your-journey.html:324-328)
  Choose Bangkok only, then select Essential trip. This control remains available, and costSavingPlan unconditionally adds its Vientiane wedding stay. Reproduction returns a wedstay item for which lineRelevant is false. Confirming holds that excluded room; reconciliation does not run after preset selection, and readiness ignores the excluded stage.
  Recommendation: Make Essential options and preset execution scope-aware; reject excluded items before acquiring holds and reconcile the resulting plan before accepting it.
- [medium] Initial draft pull can still overwrite an in-flight decline (assets/draft.js:165-169)
  On a fresh device, delay the draft GET while the guest declines a stage. If siyl.skip was absent when GET started and the server returns '[]', merging local '["train"]' against the captured empty snapshot classifies the new decline as a conflict and restores '[]'. This was reproduced through _merge. The snapshot is not a known server base, so an existing server value is incorrectly treated as a concurrent edit; the guest's stage reopens.
  Recommendation: Queue actions made before initial hydration and replay them against the fetched draft, or disable decisions until hydration completes. Do not treat the pre-fetch cache as a known common ancestor.
- [medium] Required flavor choice is omitted from both confirmation emails (src/mail-templates.js:31)
  Choose a flavor and send the trip. The client now stores profile.flavor, but the mail PROFILE mapping still reads treat. Both guest and owner emails omit the new required answer; migrated guests may instead show their retired snack answer. The owner therefore does not receive the hospitality preference collected by this release in the email summary.
  Recommendation: Replace the treat mapping with flavor and apply the same validated legacy migration used by the client. Test both email outputs with new and migrated profiles.

Next steps:
- Fix scope reconciliation and scope-aware submission before release.
- Add regression tests for failed releases, delayed initial pulls, excluded-destination presets, and flavor email output.
