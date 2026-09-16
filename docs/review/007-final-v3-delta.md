# 007 — FINAL V3 DELTA (final V2 → final V3)

Generated 2026-09-16 08:34 UTC by docs/review/007-final-v3-delta.py.

FINAL V2:  docs/review/007-final-v2-text.txt (MAIN SHA 6170755) · docs/review/007-final-v2-source-truth-audit.txt
FINAL:     docs/review/007-final-v3-text.txt (MAIN SHA 621be9c) · docs/review/007-final-v3-source-truth-audit.txt

| metric | pre-patch | final |
|---|---|---|
| DISTINCT ACTIVE ROUTES | 26 | 26 |
| DISTINCT SURFACES | 295 | 303 |
| DYNAMIC / CONDITIONAL STATES | 191 | 236 |
| EXPERIENCE ENTITIES | 39 | 39 |
| STAY / ROOM ROUTES | 33 | 33 |
| TRANSPORT ROUTES | 5 | 5 |
| TICKET / PDF TEMPLATES | 14 | 14 |
| LINES | 19873 | 20207 |
| WORDS | 101094 | 104323 |
| SOURCE-TRUTH CLAIMS CHECKED | 123 | 123 |
| SOURCE-TRUTH MATCH | 98 | 99 |
| SOURCE-TRUTH CONFLICT | 0 | 0 |
| SOURCE MISSING | 6 | 6 |
| OWNER DECISION OVERRIDES | 17 | 16 |
| STALE / RETIRED SOURCE | 1 | 1 |
| SECRET SCAN | PASS | PASS |
| COMPLETENESS CHECK | PASS · 1868 guest-facing source literals represented · 153 folded in from states not rendered · 0 leftover · 0 failed steps | PASS · 1877 guest-facing source literals represented · 159 folded in from states not rendered · 0 leftover · 0 failed steps |

Unique text lines (surfaces, states, templates; references and stamps normalised): 4397 → 4414 · appeared 41 · disappeared 24

## Text that APPEARED in the final

### C86 price (USD 105 → USD 85) (1)

- ROUTE: /transport?id=c86 · signed out

### Wedding (Vow) Ceremony 15:30 · seat model (temple → Souphattra Heritage) (2)

- On the photograph: Lobby, Rooms, Coffee & Cake · Breakfast, Wedding Ceremony, Wedding Dinner · Poolside. Every place of the venue is listed below.
- [aria-describedby → spoken] On the photograph: Lobby, Rooms, Coffee & Cake · Breakfast, Wedding Ceremony, Wedding Dinner · Poolside. Every place of the venue is listed below.

### Accessibility text (aria / alt / live regions) (3)

- (hidden) [state] current The Journey
- [aria-label] Show The Journey sections
- [aria-label] Two books about Laos on a bed: The Lao Sangha and Modernity, and a photograph of a Lao temple

### other (35)

- (hidden) Open your invitation
- (hidden) The Journey
- (hidden) [aria-label] Show The Journey sections
- - Dress code: acknowledged 2026-09-16T07:36:31.722Z (text version 2026-09-09)
- - Photography & film: acknowledged 2026-09-16T07:36:59.572Z (text version 2026-09-14)
- - Publication of photographs: GIVEN (2026-09-16T07:36:58.872Z, wording 2026-09-09-draft)
- Back to The Journey
- Continue Your Journey
- German fine dining in a Bangkok villa — lunch, Thursday to Sunday. The other experience you can add to your Journey Bag: a table asked for through Guest Relations, never a confirmed reservation until they say so.
- ROUTE: /room?stay=souphattra&room=heritage · signed out
- ROUTE: /transport · signed out
- ROUTE: source strings · accommodation.html
- ROUTE: source strings · destination.html
- ROUTE: source strings · experiences.html
- ROUTE: source strings · index.html
- ROUTE: source strings · voyage.html
- SURFACE 296
- SURFACE 297
- SURFACE 298
- SURFACE 299
- SURFACE 300
- SURFACE 301
- SURFACE 302
- SURFACE 303
- Sangkhathan · Optional
- Sent · 16 Sept 2026 · 09:37 · your time
- Steffie · 1 place available
- The Journey
- The complete guest-facing text of the current release (main 621be9c), extracted 2026-09-16T07:39:55.130Z from a local Worker running the deployed source with the real engines.
- The trip, chapter by chapter. Rooms, fares, seats and tickets are chosen inside your invitation — Open your invitation
- [page title] The Journey · See You In Laos
- invitation?open=1&next=room%3Fstay%3Dsouphattra%26room%3Dheritage
- invitation?open=1&next=transport
- invitation?open=1&next=transport%3Fid%3Dc86
- vw jcta

## Text that DISAPPEARED from the final (removed active text — each line checked: retired by the Owner patch, moved into the venue stage, or a stamp)

### Wedding (Vow) Ceremony 15:30 · seat model (temple → Souphattra Heritage) (2)

- On the photograph: Wedding Dinner · Poolside, Swimming pool, Courtyard garden. Every place of the venue is listed below.
- [aria-describedby → spoken] On the photograph: Wedding Dinner · Poolside, Swimming pool, Courtyard garden. Every place of the venue is listed below.

### The venue stage (new guest-facing text) (1)

- Choose your room

### Accessibility text (aria / alt / live regions) (3)

- (hidden) [state] current Journeys
- [aria-label] Show Journeys sections
- [aria-label] The Mekong promenade in Vientiane at sunset

### Totals and amounts that follow C86 (2)

- German fine dining in a Bangkok villa — lunch, Thursday to Sunday. The other experience you can add to your Journey Bag: a table asked for through Guest Relations, USD 180 per person, never a confirmed reservation until 
- Sangkhathan · Optional · USD 15 per guest

### other (16)

- (hidden) Journeys
- (hidden) [aria-label] Show Journeys sections
- - Dress code: acknowledged 2026-09-16T04:36:34.063Z (text version 2026-09-09)
- - Photography & film: acknowledged 2026-09-16T04:37:01.880Z (text version 2026-09-14)
- - Publication of photographs: GIVEN (2026-09-16T04:37:01.180Z, wording 2026-09-09-draft)
- A guest · 1 place available
- A guest · A guest · Full
- Back to Journeys
- Choose your wedding stay
- Journeys
- ROUTE: /journeys · signed out
- Sent · 16 Sept 2026 · 06:37 · your time
- The complete guest-facing text of the current release (main 6170755), extracted 2026-09-16T04:39:57.404Z from a local Worker running the deployed source with the real engines.
- [page title] Journeys · See You In Laos
- invitation?open=1&next=journeys
- —

## Source-truth classifications that changed

| surface | pre-patch | final |
|---|---|---|
| The venue stage · labels ON the photograph | OWNER DECISION OVERRIDE — Three labels sit on real areas: 05 Wedding Dinner · Poolside (the pool terrace), | MATCH · NEEDS OWNER DECISION — Seven labels sit on the real houses and areas of the aerial: Lobby (top left bui |
| Invitation register · active guests | new claim | SOURCE MISSING — 47 individual invitations, 47 unique credentials, 2 cancelled (no code, no index |
| The venue stage · labels WITHOUT a position | SOURCE MISSING · NEEDS OWNER DECISION — Lobby · Rooms (×3 in the Owner's concept) · Coffee & Cake / Breakfast · Wedding  | claim retired |

## Newly introduced source-truth conflicts

- none

## Still needing an Owner decision

- The venue stage · labels ON the photograph — MATCH · NEEDS OWNER DECISION
