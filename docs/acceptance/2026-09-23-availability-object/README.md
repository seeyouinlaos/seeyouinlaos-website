# THE AVAILABILITY OBJECT — Owner approved, 23 September 2026

**Status: IMPLEMENTED, NOT REDESIGNED.** The Owner's instruction was to build the approved
component exactly, with one correction: every blue element becomes the House Cherry
**#74070E** — the wordmark's own full stop.

---

## 1 · What the front page now says, in order

Two decision signals, **never merged**, in the Owner's sequence:

```
   ACCOMMODATION PLANNING                        ← the first signal: the DATE alone
   Closes 30 November 2026            68 DAYS REMAINING

              WEDDING STAY · LIMITED AVAILABILITY  ← the second signal: the live COUNT
                        ◜ 5 / 6 ◝
                         REMAINING
                        One place
                        has gone.
              Complimentary Wedding Stay
              Private Residence · Vientiane
                  Now ━━●━━━━━━━━ 30 Nov
        Your invitation shows what is still available for you.
                   OPEN YOUR INVITATION →           ← the one call to action
                 Explore the Private Residence →    ← quiet, subordinate, never a button
          68 days remaining · availability may close earlier
```

The accommodation bar (`assets/stay-bar.js`) was **reduced to the date alone**: its places
line and its link moved into the object, so the two signals never compete for the same tap.
`accommodation.html` gained one attribute — `id="residence"` on the Guest House card — so the
property link opens the existing public editorial page. Nothing else on that page changed, and
it still shows no price, no remaining inventory, no allocation and no booking control
(**PUBLIC STATE RULE**).

## 2 · Every number is the engine's

`assets/availability.js` writes nothing of its own. The count and the ring come from the room
engine (`SIYL_UNITS.complimentary()` → the Durable Object's `complimentary` view); the days and
the date come from the one stay plan (`assets/stay-plan.js`, generated from `src/stay-plan.js`).
Until the engine has answered, the object renders **nothing at all** rather than a number it
invented. If a place is taken while the page is open, the object follows (`siyl:units`).

| what the guest sees | where it comes from |
|---|---|
| `5 / 6` and the ring's arc | `complimentary.remaining` / `complimentary.max` |
| "One place has gone." | derived from `max - remaining` |
| the dot on the NOW → 30 NOV line | the share of the allocation already taken, clamped to 8–92 % so the dot is always on the line |
| "68 days remaining" · "Last day" · "Accommodation planning closed" | `deadlineState(new Date())` |
| the action | the guest's own state (see below) |

**One open assumption, for the Owner to confirm.** The timeline dot maps *allocation consumed*
onto the NOW → 30 NOV axis. There is no start date for the planning window anywhere in the
approved data, so a time-based position could not be derived; the dot therefore answers "how
far has the allocation run", not "how far has the calendar run". Say the word and it becomes a
calendar position the moment a window-opening date exists.

## 3 · The action follows the guest

| the guest | the call | where it goes |
|---|---|---|
| a visitor, not signed in | OPEN YOUR INVITATION → | `invitation.html` |
| signed in, no complimentary place | CONTINUE YOUR TRIP → | `your-journey.html#stays` |
| signed in, holding a place | YOUR STAY → | `profile.html#your-stay` |

An authenticated guest is **never** forced back through the invitation login.

## 4 · The one accent, and the motion

Cherry **#74070E** draws the ring's arc, the line it runs along, the dot and the dot's single
ripple. Nothing else in the object is coloured: the numerals and the sentence are the page's own
Ink, the ground is the page's own Ivory. The object's stylesheet block contains exactly two
hexadecimal colours — `#74070E` and `#211F1C` — and the unit suite pins that.

The entrance plays **once**, on the first time the object enters the viewport (threshold .35):

| step | begins |
|---|---|
| the ring draws | 0 ms (900 ms `stroke-dashoffset`) |
| the count resolves | 250 ms |
| the sentence | 360 ms |
| the property line | 440 ms |
| the line draws | 560 ms |
| the dot arrives | 980 ms |
| one ripple | 1180 ms |
| the sentence, the actions, the foot | 1120 / 1240 / 1340 ms |

— finished inside ~1.6 s, then calm: one extremely quiet breath on the dot every 9 s, never a
blink and never an alert. Under `prefers-reduced-motion: reduce` the object simply *is*, already
finished, with `animation: none !important` throughout. It never replays, and re-rendering after
a live change does not replay it.

## 5 · What is **not** there

No card, no badge, no warning banner, no warning icon, no countdown clock, no ticking second,
no pop-up, no red background, no gradient, no commercial hotel-booking chrome, no second
progress-bar concept, no competing call to action — and none of "Hurry", "Book now", "Almost
gone", "Last chance", "Only n left". The unit suite asserts each of these by name.

## 6 · The proof

**Unit — `test/availability.test.mjs`, 8 tests** (registered in `npm test`; whole suite green):
the count is the engine's; the words per state; the date and the three phases; the dot never
leaves the line; the one call and where it goes; Cherry as the only added colour; the entrance,
its length and reduced motion; the two signals in the Owner's order with one action between them.

**Served — `docs/acceptance/2026-09-22-stay-deadline/e2e.mjs`, section 1 + 1b**, on the stage
(port 8788) at 390 · 834×1194 · 1194×834 · 1440: the bar carries the date alone and no link; the
object stands below it; the engine's count, the Cherry ring, the Cherry line, the Cherry dot;
one CTA to `invitation.html`; the property link to `accommodation.html#residence`, smaller than
the CTA, with no border and no background; exactly two links in the object; no horizontal
overflow; the entrance plays once and settles; reduced motion arrives settled with no animation;
a signed-in guest's call never points at the invitation.

**The approved state, photographed.** One synthetic guest on the stage took one complimentary
place; the object was photographed as the visitor sees it — **5 / 6 REMAINING · "One place has
gone."** — and the place was given straight back (engine: `remaining 5 → 6`, `taken 1 → 0`).
Screenshots in `stage/`.

**Gates:** all 28 pass, including L1 (the object's sentences are in the DE/TH/JA dictionary —
the headline is one text node with a real line break kept by `white-space: pre-line`, so each
sentence is translated whole instead of in fragments) and C1 (fingerprints current).

**Live:** `docs/acceptance/2026-09-22-stay-deadline/live-ro.mjs` reads production read-only —
no code entered, no guest signed in, nothing written — and asserts both signals at four widths.

---

## 7 · Live — the proof at `6756fc0`

Deployed by the Owner's release path (push to `main` → Cloudflare Workers Build), serving
`assets/availability.js?v=de498f15` 100 s after the push.

- **`live-ro.mjs` 11/11** at 390 · 834×1194 · 1194×834 · 1440, read-only: no code entered, no
  guest signed in, nothing written. Both signals present and in order; the bar carries the date
  and no link; the object's ring, line and dot are `rgb(116, 7, 14)`; one CTA to `invitation.html`;
  the property link to `accommodation.html#residence`; exactly two links; no overflow; no console error.
- Production reads **5 / 6 REMAINING · "One place has gone."** — a real guest already holds one of
  the six places, so the live object arrived in the approved state by itself. Screenshots in `live/`.
- **Parity 294/294** · **release-014 live-ro 25/25** · **infrastructure freeze intact**
  (one Worker · workers.dev · GitHub Pages disabled).
- **Production data untouched** — the read-only aggregate is identical before and after the deploy:
  37 occupancies · 0 waitlisted · 12 seat holds · 104 draft actors (15 with drafts).

### The whole run

| | |
|---|---|
| unit | **484/484** (`test/availability.test.mjs` 8, new) |
| gates | **28/28** (`RELEASE CHECK PASSED`) |
| stage E2E | **256/256** — stay-deadline 24 · release-014 35 · release-013 36 · four-point 48 · account-IA 35 · profile-return 18 · stage-graph 40 · hero-map-media 20 |
| live | 11 + 25 + parity 294 |
