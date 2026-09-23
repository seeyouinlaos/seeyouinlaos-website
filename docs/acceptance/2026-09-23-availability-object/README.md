# THE AVAILABILITY OBJECT — Owner approved, 23 September 2026

> **CORRECTION PASS, same day.** The first build grew into a full-page section that dominated the
> phone. The visual composition has been reverted to the compact instrument, and two semantic
> errors were corrected with it: the timeline now represents **calendar time**, not consumed
> capacity, and the invented label **"Private Residence" is gone** — the house is the project's own
> **Guest House complimentary**. The live logic and the real engine data are untouched.

**Status: IMPLEMENTED, NOT REDESIGNED.** The Owner's instruction was to build the approved
component exactly, with one correction: every blue element becomes the House Cherry
**#74070E** — the wordmark's own full stop.

---

## 1 · What the front page now says, in order

Two decision signals, **never merged**, in the Owner's sequence — and both compact:

```
   Accommodation planning                          ← the first signal: the DATE alone
   Closes 30 November 2026        68 DAYS REMAINING
   ●─────────────────────────────────────────────  ← one hairline of calendar time

   Wedding Stay · Limited availability             ← the second signal: the live COUNT
   ╭─────╮  One place
   │ 5/6 │  has gone.
   ╰─────╯  Complimentary Wedding Stay
    REM.    while places remain.
   Now ●────────────────────────────── 30 Nov      ← the SAME calendar window
   Your invitation shows what is still available for you.
   OPEN YOUR INVITATION →   See the Guest House →  ← one call, one quiet link
   68 days remaining · availability may close earlier
```

The object is **one editorial instrument embedded in the page** — never a section of its own. It
has no viewport-height treatment, no oversized padding, no centred stack, no large gaps; the ring
sits beside its status, the calendar hairline directly under them, and both signals share the
page's frame so the object starts exactly where the date above it starts.

## 2 · The ring says the count — "5 / 6" on ONE line

The three parts of the count (`5`, `/`, `6`) are one baseline row with 3.5 px of air on each side
of the slash, so it can never be read as "56". `REMAINING` sits small beneath it, inside the ring.
The ring is **74 px on a phone, 82 px from 768 px up, 64 px below 360 px** — a fraction of the
previous build, and it never grows because the screen did.

| what the guest sees | where it comes from |
|---|---|
| `5 / 6` and the arc | the room engine: `complimentary.remaining` / `complimentary.max` |
| "One place has gone." | derived from `max − remaining` |
| the dot on the Now → 30 Nov line | **calendar time** (below) |
| "68 days remaining" · "Last day" · "Accommodation planning closed" | `deadlineState(new Date())` |
| the action | the guest's own state (§4) |

## 3 · The line says the calendar — not the capacity

Corrected. `src/stay-plan.js` now carries the window beside the deadline it ends on:

```js
export const PLANNING = { start: '2026-09-23', end: COMPLIMENTARY.deadline /* 2026-11-30 */ };
export function planningProgress(now) { … }   // 0 before it opens, 1 at the END of 30 November
```

- **start** 23 September 2026 · **end** the end of 30 November 2026 (the deadline day is *inside*
  the window, so 30 November reads 98.6 %, and 1 December reads 100 %).
- The dot is the elapsed share of **real days**, computed from today — never hard-coded, never
  clamped to a made-up range, never `taken / max`. On 12 October it is 19/69 = 27.5 %.
- **The same calculation drives the planning bar's hairline**, so the two elements can never
  disagree. Capacity is said once, by the ring; time is said once, by the line.

## 4 · The action follows the guest

| the guest | the call | where it goes |
|---|---|---|
| a visitor, not signed in | OPEN YOUR INVITATION → | `invitation.html` |
| signed in, no complimentary place | CONTINUE YOUR TRIP → | `your-journey.html#stays` |
| signed in, holding a place | YOUR STAY → | `profile.html#your-stay` |

An authenticated guest is **never** forced back through the invitation login. Beside the call, one
quiet subordinate link — *See the Guest House →* — opens the existing public editorial card
(`accommodation.html#residence`), which still shows no price, no remaining inventory, no allocation
and no booking control (**PUBLIC STATE RULE**).

## 5 · The house is the project's own

**"Private Residence" is removed.** It was never approved terminology. The object says:

> Complimentary Wedding Stay
> while places remain.

— and no second property or location label. The property link names the canonical house, and the
booking engine's own naming (`Guest House complimentary`, `guesthouse/guest-house`) is untouched.
Removed from: the component, the DE/TH/JA dictionary, and the page comment. The historical string
in `assets/i18n/catalog-public.json` predates this work (commit `6405a73`) and was **not** touched,
per the instruction not to rename unrelated historical text.

## 5b · The one accent, and the motion

Cherry **#74070E** draws the ring's arc, the calendar line, the dot, its single ripple — and the
planning bar's hairline. Nothing else is coloured; the object's stylesheet block contains exactly
two hexadecimal colours, `#74070E` and `#211F1C`, and the unit suite pins that. The amount of
Cherry did not grow with the correction.

The entrance still plays **once**, on the first sight of the object, now shortened to fit the
compact composition: the ring draws (760 ms), the count at 220 ms, the sentence 300, the property
line 380, the hairline 480, the dot 840, one ripple 1000, the sentence, actions and foot 960 /
1060 / 1160 ms — finished inside ~1.4 s, then calm, with one very quiet breath on the dot every
9 s. Under `prefers-reduced-motion: reduce` the object simply *is*, already finished. No looping
ring, no added animation.

### What is still **not** there

No card, no badge, no warning banner or icon, no countdown clock, no ticking second, no pop-up, no
red ground, no gradient, no hotel-booking chrome, no second progress-bar concept, no competing call
to action — and none of "Hurry", "Book now", "Almost gone", "Last chance", "Only n left".

## 6 · The proof of the correction

**Unit — `test/availability.test.mjs`, 11 tests** (whole suite **487/487**): the count is the
engine's; the ring reads `5 / 6` as three boxes in one baseline row with the slash given room and
never exceeds 82 px; the compact composition (row, column, page frame, narrow-phone shrink, no
`min-height`/`vh`, no centred stack); **the calendar line** — the window's two ends, 0 before it
opens, 1 after the deadline, 19/69 on 12 October, and the same value whatever the count is; the
planning bar's hairline drawn from the same rule; the canonical house and the absence of the
invented label; the words per state; the one call and where it goes; Cherry as the only added
colour; the entrance, its length and reduced motion; the two signals in order.

**Served — `docs/acceptance/2026-09-22-stay-deadline/e2e.mjs` §1 + §1b, 33/33**, on the stage at
390 · 834×1194 · 1194×834 · 1440. Per viewport:

| check | 390 | 834×1194 | 1194×834 | 1440 |
|---|---|---|---|---|
| the object's share of the screen | **37.6 %** | 23.2 % | 33.2 % | 30.8 % |
| ring | **74 px** | 82 px | 82 px | 82 px |
| `5 / 6` on one line | ✓ | ✓ | ✓ | ✓ |
| ring and status side by side | ✓ | ✓ | ✓ | ✓ |
| aligned with the date above it | ✓ | ✓ | ✓ | ✓ |
| object's line = bar's hairline = today's calendar share | ✓ | ✓ | ✓ | ✓ |
| "Private Residence" anywhere | **absent** | absent | absent | absent |

and, decisively, **`timeline-follows-the-clock-not-the-count`**: the same page opened with the
browser's clock set to **12 October 2026** draws the dot at `116.031 px` of a `421.328 px` rail —
**0.2754**, exactly 19/69 — while the engine's count is 6 / 6 and the bar reads 49 days. Capacity
0 %, calendar 27.54 %: the two can no longer be confused.

**Regression, each suite on a freshly wiped stage — 265/265:** stay-deadline 33 · release-014 35 ·
release-013 36 · four-point 48 · account-IA 35 · profile-return 18 · stage-graph 40 ·
hero-map-media 20.

**Gates:** 28/28 (`RELEASE CHECK PASSED`), including L1 with the dictionary following the new
wording — "while places remain." and "See the Guest House" in DE/TH/JA, the invented label removed.

Screenshots: `stage/*-two-signals.jpg` (as a visitor sees it) and `stage/*-compact-5of6.jpg` (with
one place taken by a synthetic guest, released again immediately).

