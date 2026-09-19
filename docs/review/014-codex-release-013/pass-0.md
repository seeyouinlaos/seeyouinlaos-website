# Codex pre-deploy review (pass 0) — raw

# Codex Adversarial Review

Target: branch diff against main
Verdict: needs-attention

Do not ship or execute the live reset. [high] findings remain: concurrent writes can survive reset, epoch failures bypass protection, old client data can return, and deletion precedes a durable backup. Eight release/auth tests passed; controlled reproductions exposed additional failures.

Findings:
- [high] [high] Reset does not fence concurrent writes (src/worker.js:519-536)
  Reproduction: submit an old draft immediately after its actor is reset, before reset:epoch is written. In the in-memory Worker reproduction, both the PUT and reset returned 200, and a subsequent GET still contained the old Bag. The actor has no epoch precondition, and the Worker publishes the epoch only after clearing everything. Room, seating, contact and submission writes also remain possible during the sweep. A GET can likewise read an old draft and then attach the new epoch.
  Recommendation: Introduce a coordinated reset barrier covering all guest mutations. Validate generations inside each serialized actor operation, drain in-flight writes, and return drafts with their own generation. Resume writes only after verified completion.
- [high] [high] An epoch read failure disables reset protection (src/worker.js:491)
  Reproduction: after reset, make REG_KV.get('reset:epoch') throw while the Drafts actor remains available; submit a cached draft without seenReset. resetEpoch returns null, so handleDraft skips the refusal and can store the old journey. Dependency failure is treated as proof that no reset occurred.
  Recommendation: Fail closed with a retryable 503 when the generation cannot be read. Keep the authoritative generation in the serialized write path rather than relying solely on a separate KV lookup.
- [high] [high] Destructive execution happens before the backup exists (src/gr.cjs:80-85)
  The CLI sends the destructive request before writing the backup, contrary to PLAN.md. Reproduction: interrupt the response after the Worker deletes records, fail a later reset operation, or make the local backup directory unwritable. Previously deleted values then have no durable recovery copy. Retrying cannot recover them.
  Recommendation: Separate snapshot and execution. Persist and verify a complete backup before deletion, bind execution to that snapshot and generation, and retain a durable operation journal for partial failures.
- [high] [high] Editing one field preserves the entire pre-reset record (assets/draft.js:118-121)
  Reproduction confirmed with the shipped client: cache siyl.guest containing an old email and scope; change only the phone while the first reset-bearing GET is pending. honourReset keeps the entire changed key, then the empty-server branch uploads the old email and scope alongside the new phone. Adding one Bag line similarly preserves old lines. Canonical Bag comparison only handles unchanged contents.
  Recommendation: Compute field-, line- and decision-level edits against the pre-request snapshot, clear the old baseline, then replay only those edits onto the post-reset server state.
- [medium] [medium] The returned backup is not lossless (src/worker.js:529-533)
  Reproduction: upload a PNG avatar, then reset. Avatar bytes are stored as an ArrayBuffer, but this loop reads them as text and omits metadata, preventing byte-exact restoration. A get failure is also swallowed before deleting the unread value. Room and seating reset responses retain selected identifiers rather than complete stored records, losing names, timestamps and assignment metadata.
  Recommendation: Snapshot binary values as base64 with their metadata and preserve complete DO key/value records. Abort before deletion if any snapshot read fails; verify restoration of avatars and GR-assigned seats.
- [medium] [medium] Reset handling silently discards fresh edits (assets/draft.js:240-244)
  Two controlled reproductions lose input. First, on a brand-new device after reset, fail the initial GET, type an answer, then Save: the retry treats that fresh answer as old cache, deletes it and returns 'nothing to save'. Second, with a post-reset server draft, edit a guest field during GET while an unchanged cached Bag is cleared: replacing before with snapshot() erases the edit baseline, so the server value overwrites the live edit.
  Recommendation: Track initialization and edits independently of individual GET attempts. Preserve the original edit baseline across reset handling and failed pulls; replay fresh edits onto the fetched draft before saving.
- [medium] [medium] Confirmation can apply a different trip from the preview (your-journey.html:506-510)
  fxPreview discards its plan, and confirmation computes another. Reproduction: open Complete trip while the room engine's initial read is pending; let that read reveal the suggested room is full, then confirm. The new plan can hold a differently priced fallback that the displayed preview never named. The drawer is neither refreshed nor compared with the applied plan.
  Recommendation: Retain the previewed plan and availability revision. Revalidate on confirmation and require an updated preview before applying changed products or prices; leave unavailable selections open instead of silently substituting.
- [medium] [medium] Private guest identities are committed in alias comments (src/guestlist-from-contacts.cjs:37-48)
  The new tracked source includes full guest names, nicknames and relationship information beside contact and guest IDs. Reading the branch diff exposes these identities despite the plan's private-data requirement. Ignoring the input sheet and report does not protect comments committed in this file.
  Recommendation: Keep only opaque ID mappings in tracked source. Move identity explanations into the ignored private reconciliation report and remove the exposed names from the release history before distribution.

Next steps:
- Block deployment and live reset until the high findings are fixed.
- Add regression coverage for concurrent reset writes, failed epoch reads, interrupted backup delivery, binary restoration and first-pull edit recovery.
- Bind Complete trip confirmation to its preview and remove private identities from tracked source.
