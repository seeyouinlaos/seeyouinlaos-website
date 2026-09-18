# Codex Adversarial Review

Target: branch diff against dbf8bc5
Verdict: needs-attention

Do not approve yet: reproduced cross-account draft contamination and avatar cache leakage. All 27 focused regression tests pass but miss these races.

Findings:
- [high] Late conflict responses merge one guest’s draft into another account (assets/draft.js:88-99)
  If A’s save is pending while another tab switches the shared session to B, A’s eventual 409 merges against B’s current localStorage without checking identity. It applies A’s private data, then retries using B’s current bearer. The reproduction produced a PUT for B containing A’s contact and bag. If B has no existing server draft, the server accepts this contaminated draft.
  Recommendation: Bind requests and queued retries to the initiating invitation, bearer, and session generation. Discard responses after identity changes before applying keys or metadata; invalidate pending work on sign-out and cross-tab auth changes. Add a delayed-409 account-switch regression.
- [medium] Delayed avatar reads can populate another guest’s cache (assets/avatar.js:53-58)
  load() writes into the mutable global cache after awaiting the response without verifying its owner. Start A’s read, switch the shared session to B, complete B’s read, then complete A’s: subsequent load() calls for B return A’s photo. Reproduced against the shipped module. Sign-out clearing alone cannot invalidate pending callbacks; upload completion also labels its result using the current account.
  Recommendation: Capture identity and a request generation for every operation; verify both before updating cache or returning an image. Invalidate outstanding reads on account changes, upload, and delete. Capture upload credentials before image reduction and abort if the session changes.

Next steps:
- Fix session ownership checks and add delayed-response regressions before repeating the confirming pass.
