# THE WEDDING DINNER LINK · THE DOCUMENT RETENTION (Owner, 21 Sep 2026 · the real iPad)

## The Wedding Dinner link

**Root cause.** The venue's index entry already rendered a real `<a class="a-link" href="#dinner">` (assets/venue.js) to the
one canonical `#dinner` section; nothing swallowed the tap (no overlay, no `pointer-events`, no delegated handler, no
`preventDefault`, one `#dinner` id). What was wrong was where the navigation *landed*: the aman shell's `header.hd` is
`position: sticky` (~56 px) and the page had no `scroll-padding-top` for it (only the step pages set one, in prep.css);
on top of that, `#dinner` is a `data-motion="reveal"` section that still sits 14 px lower (its reveal transform) at the
moment of the jump. Measured on the live page in WebKit at 834 × 1194, 390 and the iPad device profiles, and in Chromium
at 1440: after the tap the section's top was at **−14 px** — its eyebrow and title beneath the header band, and the first
thing on screen the poolside photograph, which reads like the venue's own pool. On the Owner's iPad that is "nothing
happened". The direct load `voyage.html#dinner` landed the same way (−11 px).

**Fix.**
- `assets/aman.css`: `html { scroll-padding-top: calc(92px + env(safe-area-inset-top, 0px)); }` — the header band, the
  14 px reveal travel and a quiet gap; the browser's own anchor navigation, no script scroll. The step pages keep their
  own rule (prep.css loads after aman.css).
- `assets/venue.js`: beside the native link (untouched — no preventDefault, no other route, no reload), the tap reveals
  the target at once (`is-in`, so it is never a blank frame) and, 120 ms later, if the page did not move at all or the
  target sits under the header, the same target is brought into view by hand. Back and forward stay native.
- Nothing of the consolidation was reopened: one record (assets/wedding-dinner.js, 13 frames), one `#dinner` detail, one
  gallery (manual, swipe, previous / next, counter, progress, no autoplay, no play / pause), the venue entry photo-less
  and concise, event media isolated from accommodation media.

**Result after the fix** (stage, the real user action: load → scroll to the venue entry → tap THE WEDDING DINNER):
WebKit 390 · WebKit 834 × 1194 · WebKit 1194 × 834 · Chromium 1440 — the URL carries `#dinner`, the page moves, the
section's top lands at **78 px** (header bottom 56 / 52), the title visible, opacity 1, one `#dinner`, one full detail,
one gallery of 13; Back returns to the venue without the fragment; the direct load `voyage.html#dinner` lands at 92 px
with the title visible. `docs/acceptance/2026-09-21-wedding-dinner/e2e.mjs` carries the flow (tap-* · back-* · direct-*),
and its venue check now demands "below the header", not "within 160 px". Unit: test/wedding-dinner.test.mjs (the link
semantics, the offset, one id, the living detail never `pointer-events: none`).

## The document retention policy — FINAL

- Journey end **8 March 2027** · retention **30 days** · deletion from **7 April 2027**. One frozen constant in the Worker
  (`DOC_RETENTION`), documented in `infra/PRODUCTION.json` (`r2[0].retention`, `crons`), pinned by `src/infra-guard.cjs`
  (the trigger list and the constant must match the manifest), told to the guest on About You.
- **Mechanism.** The one Worker's one scheduled trigger (`"triggers": { "crons": ["0 3 * * *"] }` — daily 03:00 UTC,
  attached to `seeyouinlaos-website` only; the second OWNER-INFRA-CHANGE of the day) runs `purgeDocuments`: before the
  date it lists and does nothing (no delete attempted, no record written); from the date it deletes the `doc/` objects of
  DOCS — and nothing else — and writes one audit record `docpurge:<iso>` in REG_KV (counts, the date, the actor; no key,
  no name, no byte). Idempotent: a second run finds nothing and writes nothing. A late upload goes on the next run — never
  at upload time, never on a guest's visit. `GET /api/gr/documents/retention` (GR token, read only, never a deletion)
  reports the policy, what stands under it and the audit records.
- **Excluded by construction and by test**: profile photos (`avatar:`), contacts, drafts, registration records and their
  history, rooms, seats, identities, the community, any object outside `doc/`. test/retention.test.mjs (4): the policy
  pins; nothing deleted on 22 Sep 2026, 8 Mar 2027, 6 Apr 2027 03:00 and 23:59:59 UTC; the purge on 7 Apr 2027 removes
  only `doc/` objects while two portraits, a contact, a draft, a registration and its history and an object outside the
  prefix stand byte for byte; idempotent; the late upload; no store / a failing store.
- **Nothing was deleted now**: the live bucket holds 0 objects (wrangler `r2 bucket info`), the purge date is 198 days
  away, and the Worker's retention report reads `due: false`.
- The approved architecture is untouched: private bucket `siyl-docs`, the one Worker, binding `DOCS`, no r2.dev URL, no
  custom domain, GR-only retrieval, ownership by immutable identity, no body / token logging, a failed replacement keeps
  the earlier document.
