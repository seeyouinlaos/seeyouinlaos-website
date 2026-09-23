# THE EXTENDED STAY AS A LINE THE GUEST CAN SEE — Owner, 23 September 2026

The paid nights lived in the room engine and were counted in the total, but no surface ever showed
them. A guest read an amount with nothing behind it — the USD 30 were already inside the USD 335,
only the line was missing. This pass gives the nights their line, in every place the guest looks,
and unifies My Profile with it.

---

## 1 · One record, one wording, four surfaces

`assets/bag.js` derives the line from the engine's own record. Nothing is written by hand:

| what the guest reads | where it comes from |
|---|---|
| **Riverside Hotel Vientiane** | `extension.hotel` |
| **01 March – 02 March 2027** | `extension.dates` |
| **1 additional night** | `extension.nightsWords` |
| **Breakfast included** | `extension.breakfast` |
| **USD 30** · USD 30 a night · your cost | `extension.total` · `extension.rate` |
| **01 – 02 MAR** (its place in the itinerary) | derived from `extension.from` / `extension.to` |

Two, three and four nights follow the engine exactly: **USD 60 · 90 · 120**, with the dates
01 → 03, 01 → 04 and 01 → 05 March and the plural wording.

It appears under **ACCOMMODATION**, **directly after the Guest House complimentary** and before the
flight on — the nights begin the day the wedding stay ends (`assets/journey.js`, `stayext: 3.6`,
between the Wedding Stay at 3 and MU9646 at 4).

It carries the same three actions as every other booking component:

| action | where it goes |
|---|---|
| **CHANGE** | `profile.html#your-stay` — the one dropdown where the nights are chosen |
| **REMOVE** | the room engine's `unextend` — the nights are released, the stay underneath untouched |
| **VIEW DETAILS** | `room.html?stay=riverside&room=superior-window` — the house the site already shows |

## 2 · Never counted twice

This is the part that had to be got right, because the amount was already correct.

```js
get()    // what the device holds — and what Review & Send submits. UNTOUCHED.
lines()  // what the guest is shown: get() + the engine's extension, in its place
total()  // the sum of lines() — so the extension is counted ONCE by construction
```

There is no second place that could add it again: the old `total = lines + extensionCost` became
`total = sum(lines())`, and the extension is one of those lines. The unit suite asserts that the
new arithmetic equals the old one exactly.

**The submission is deliberately not changed.** `registration.selections` is still `SIYL_BAG.get()`,
because the server's email composes the extended stay from `rooms.stayext` — the engine's own record
— and recomputes `total = linesTotal + ext.total`. Had the line been sent as a selection, the email
would have shown the stay twice and charged it twice. The guest sees a line; the server sees the
engine. One truth, two readings.

## 3 · My Profile → Your stay, unified

**Every confirmed stay, in the order they happen.** `Your stay` is no longer the wedding stay alone:
it lists every accommodation the guest has confirmed, sorted by the day the stay begins, in ONE card
system — and **no photography**: this section is a record, not a rail. The extended stay is the last
card because it happens last, and it alone carries the dropdown beneath it.

For a guest with the Souphattra pre-wedding stay, the Guest House and one paid night:

```
YOUR STAY
  Your stay            Pre-Wedding Stay · Souphattra Heritage   25 – 27 February 2027
  Complimentary stay   Guest House complimentary · Vientiane    27 February – 01 March 2027
  Extended stay        Riverside Hotel Vientiane                01 March – 02 March 2027
                       1 additional night · Breakfast included · Your cost USD 30
                       CHANGE · REMOVE · VIEW DETAILS
  EXTEND YOUR STAY     [ 1 night ▾ ]
```

## 3b · One wording everywhere

`Your stay` keeps the extension's single home on that page, and now says exactly what the bag line
says — the dates, the nights and breakfast in one meta, the amount as *Your cost* — and offers the
same **Change · Remove · View details**, in the same words. (The old link read "Remove extension";
there is now one vocabulary across the site.) The arrangements rail deliberately keeps the device's
own lines, so the nights are never announced twice on one page.

## 4 · Everything follows at once

My Bag, Review & Send, My Profile and the sticky total all listen to `siyl:units`, the engine's
answer. Adding, changing or removing the nights — from either surface — updates all of them in the
same tick, and the badge counts the lines the bag shows.

## 5 · The proof

**Unit — `test/bag-extension.test.mjs`, 8 tests** (whole suite green): the line's every field
against the engine's quote; 1 · 2 · 3 · 4 nights → 30 · 60 · 90 · 120; the total as the sum of the
shown lines and identical to the old arithmetic; the submission still the device's own; no
extension → no line and a preview → no cost; the place in the journey; and the source contract of
all four surfaces.

**Served — `docs/acceptance/2026-09-23-extended-stay-line/e2e.mjs`, 12/12** on the stage with one
synthetic guest who chooses a whole trip (Guest House complimentary for the wedding stay), answers
every step so Review & Send opens, then adds one paid night:

| check | result |
|---|---|
| the line's group and position | `ACCOMMODATION` · `bkk-stay · prewed · guesthouse · **stayext** · kmg · ljg · kempinski` |
| the line | `01 – 02 MAR · Riverside Hotel Vientiane · 01 March – 02 March 2027 · 1 additional night · Breakfast included · USD 30` |
| the actions | `Change · Remove · View details` → `profile.html#your-stay` · engine · `room.html?stay=riverside&room=superior-window` |
| counted once | without **USD 2,005** → with **USD 2,035**; bag, sticky bar and engine all 2,035 |
| Review & Send | the same single line, the same **USD 2,035** |
| My Profile | the same words, the same three actions, not repeated in the rail |
| changed to 3 nights | one line, `01 March – 04 March 2027 · 3 additional nights`, **USD 2,095** on all three surfaces at once |
| removed in My Bag | the line is gone, the total is back to **USD 2,005**, the engine has no extension — and the Guest House place underneath is still held |
| Your stay, in order | `bkk-stay → prewed → guesthouse → kmg → ljg → kempinski → **extension**` — every confirmed stay, earliest first, the nights last |
| Your stay, no photography | 0 image elements inside `#your-stay` |

**A real defect the served proof caught:** the first implementation called `ST.unextend()` in My Bag,
but `unextend` lives on `SIYL_UNITS`, not on the stay helper — REMOVE silently did nothing. Fixed,
and now pinned by name in the unit suite.

Screenshots: `stage/` (the bag line at 1194×834 and 390, the review line, the profile card).
