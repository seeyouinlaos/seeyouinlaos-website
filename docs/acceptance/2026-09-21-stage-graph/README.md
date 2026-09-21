# THE GLOBAL MY TRIP REBUILD — the stage graph (Owner, 21 Sep 2026)

One booking model for every guest. The Complete Trip and the Essential Trip no longer exist as guest-facing modes;
nothing historical was destroyed — every real selection, hold, waiting-list place, Bag line, submission, code and
CON / COUPL id stands exactly as it was.

## The model

WHERE WILL YOU JOIN US? → four independently selectable participation sheets (`bangkok` 21–24 Feb + 6–8 Mar ·
`vientianePreWedding` 25–27 Feb · `vientianeWedding` 27 Feb – 1 Mar · `china` 1–6 Mar; I'LL JOIN ALL; I WON'T BE
JOINING THIS TRIP, exclusive) → the ONE graph names the stages → every required component answered → the wedding
(only with the wedding sheet) → About You → Review & Send.

The graph — `src/stage-graph.js`, generated into `assets/stage-graph.js` by `src/build-stage-graph.cjs` (release gate G1
keeps the copy byte-current):

| stage | letter | when |
|---|---|---|
| Bangkok stay | A | Bangkok |
| Special Express No. 25 | B | Bangkok **and** the Pre-Wedding |
| Pre-Wedding Stay | C | the Pre-Wedding |
| Wedding Stay (Souphattra · Riverside · Guest House) | D | the Wedding |
| MU9646 | E | the Wedding **and** China |
| Kunming | F | China |
| C86 Kunming → Lijiang | G | China — **mandatory**, never declined |
| Lijiang | H | China |
| MU5922 + MU741 | I | China **and** Bangkok |
| Kempinski | J | Bangkok |

Wedding only → D · China only → F G H · Bangkok + Pre-Wedding → A B C J · Bangkok + Wedding → A D J ·
Wedding + China → D E F G H · China + Bangkok → A F G H I J · Join all → A – J.

An answer is a confirmed selection (a hold the engine persists, a transport line), a waiting-list place (USD 0), or an
explicit "not joining this stage" where the stage allows it. "Nothing selected" is never an answer.

## The one validator

`completion(input)` in `src/stage-graph.js` is read by My Trip, View All Steps, the counters, Needs Attention, Continue,
Review & Send **and** `handleRegister` in `src/worker.js` (`completionOf`): the server re-derives every stay from its
own room engine (a hold or a waiting-list place in the guest's name; a client claim without a hold does not count),
every transport from the Bag lines, the wedding from the record, the seats from the seating engine, and refuses an
incomplete trip with `422 · incomplete` (the missing items named). A guest not joining sends a complete response with
nothing else. A hold outside the trip blocks until released.

## Vientiane · The Wedding

Stage D in the Owner's order: 1 SOUPHATTRA HERITAGE (every category from The Heritage USD 145 upward — Heritage 145 ·
Heritage Executive 155 · Heritage Grand Premier 170 · Noble Courtyard 240 · Grand Majestic Suite 250 · Souphattra
Majestic Suite 290 · Souphattra Presidential 750; two nights, the second complimentary: the total is ONE nightly rate,
never twice; the rule is the wedding window's alone) · 2 RIVERSIDE (USD 30 × 2 = USD 60, self-pay) · 3 GUEST HOUSE
(USD 0, complimentary, both nights hosted, six shared places — the D2 capacity semantics unchanged).

## The decline

"I won't be joining this trip" is its own short path: WE'LL MISS YOU (the Owner's words), SEND MY RESPONSE → NOT
JOINING after the send → I'D LIKE TO RECONSIDER (the question again). A decline that would release the guest's own
optional resources is previewed first and released only on confirmation — never another guest's; a partner's answer
is untouched; codes and CON / COUPL ids never change.

## Migration (read-time, no write)

A legacy answer `{ bangkok, vientiane, china, none }` is normalised when read: `vientiane` → the wedding sheet, and the
Pre-Wedding sheet too unless the Pre-Wedding Stay was explicitly declined (the former Essential trip → the wedding alone,
D1 preserved as booked). A former Complete guest keeps every line. Deterministic, idempotent, no reprice, no rebook,
nothing written back until the guest answers again. `siyl.package` metadata is no longer read anywhere.

## Tests

- `test/stage-graph.test.mjs` — the graph, relevance letter for letter, migration, the matrix A – T, the page, the
  Worker's 422 (26 tests). Package tests rewritten or removed across `booking-model`, `participation`, `inventory`,
  `guest-testing`, `release-014`, `flow`, `empty-bag`, `pricing`, `owner-patch-003`, `recompose`, `access`,
  `release-012`, `eligibility`; `test/complete.mjs` completes an unrelated test's registration under the graph.
- `docs/acceptance/2026-09-21-stage-graph/e2e.mjs` — the four sheets on the page (every combination), the mandatory
  train, the release preview, the decline path with a partner, the seat gate, the Worker's refusal, the migration of a
  former Essential / Complete answer, the waiting list in the record and the emails, the Journeys page, 320 / 390 /
  834 / 1440, the console (40 checks).
- The earlier suites (final-pass, guest-name, highlights, 014, 013, 012, 011, P0, account IA) re-pinned to the graph;
  the package sections of 013 / 014 replaced (013: the whole trip chosen by hand — the parity fixture stands).

## Live (21 Sep 2026)

Commit `bad717b` pushed to `main` → Workers Build → version `9e6cbb37-e3d6-49c5-8ca3-302409e90e5a` (06:01:54Z) on the
one Worker `seeyouinlaos-website` (https://seeyouinlaos-website.suthep-hrg.workers.dev). Parity 257/257 (`live/parity.json`),
live-ro 25/25 (`live/`), infra freeze intact (GitHub Pages 404). The graph is served, the sheets are on My Trip, no
package word on any served surface, `assets/packages-data.js` answers 404, the Journeys page carries stage D in the
Owner's order. Production aggregates read-only before and after (`live-aggregates.json`): 32 room occupancies (the
same by stage), 0 waitlisted, 12 seat holds, 13 drafts / 104 actors, 44 KV keys — **unchanged**; no reset, no hold,
seat, draft, submission, profile, photo or code touched; no synthetic activity on the live Worker.

Codex: PENDING — EXTERNAL QUOTA LIMIT (usage limit until 24 Sep 2026 22:19 CEST; the probe refused).
