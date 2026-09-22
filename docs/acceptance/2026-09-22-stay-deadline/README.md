# THE ACCOMMODATION DEADLINE · THE LIMITED COMPLIMENTARY STAY · THE PAID EXTENSION (Owner, 22 Sep 2026)

One consolidated change. Everything previously approved stands: the stage model and the booking logic, the guests and their
parties, the questionnaire, the countdown and community, the documents and their retention, the accommodation media, the
infrastructure freeze and every production record. **The unresolved 13A/13B seat correction was not touched.**

## The one rule — `src/stay-plan.js` (gate S1)

Everything below reads the same file; the browser copy `assets/stay-plan.js` is generated from it and the release refuses a
stale one. It is pure: no DOM, no clock of its own, no capacity of its own.

| | |
|---|---|
| Complimentary stay | the Guest House complimentary of the wedding window · **six guest places** (the inventory seed's number) · USD 0 · the included nights, nothing more |
| Deadline | **30 November 2026**, the end of that day, or until the six places are gone — whichever comes first |
| Extension | **Riverside Hotel Vientiane** · **1 – 4 nights** · **USD 30 a night, breakfast included** · from **01 March 2027**, the day the included stay ends |

## 1 · The front page

A quiet horizontal bar between the hero and the lede — the site's own hairlines and label type, never a booking banner:

> ACCOMMODATION PLANNING · Closes 30 November 2026 · *n of 6 places remaining* · **N DAYS REMAINING** · **PLAN YOUR STAY**

The count is computed from today (`deadlineState(new Date())`), recomputed when the day turns, **never negative**: on the day
itself it reads **Last day**, and after it the whole line becomes **Accommodation planning closed**. The places left come from
the room engine, so the bar can never contradict the booking. The call follows the guest: a confirmed stay → *Your stay*
(My Profile); nothing yet → the invitation / My Trip; closed or fully allocated → the rooms, never a dead end.

## 2 · The complimentary allocation is the engine's

`max` is the seed's capacity and `remaining` the real free places; the sixth guest takes the last one and the seventh is
refused (`409 full`) — decided inside the one Durable Object, so two guests asking together are answered one after the other.
The words are the Owner's, factual only: *n of 6 places remaining* · *1 of 6 places remaining* · *Complimentary stay fully
allocated* · *Complimentary accommodation planning closed*. No "hurry", no "almost gone", no "book now".

**After the deadline** the engine refuses a **new** claim (`409 complimentary closed`) even with places free; a guest who
already holds a place keeps it and may confirm it again; a place released afterwards does **not** reopen the public option.
Every paid arrangement — the Riverside of the wedding window and the extension — stays open.

## 3 · The extension is a separate booking component

Its own stock (`stayext/riverside-superior`, six rooms) and its own stage, so changing or dropping paid nights can never touch
the complimentary stay underneath. The guest chooses **only the number of nights**; the server decides the hotel, the dates,
the price, the availability and the final amount:

- `POST /api/rooms/extend` `{ nights, expect }` — 1–4 only (`400 invalid nights`), holds or **updates** the guest's own room
  atomically (never a second booking), returns the authoritative quote;
- `expect` is the amount the guest reviewed: a different authoritative total is refused (`409 price changed`) **with nothing
  held** and the new quote to review;
- no room left → `409 extension unavailable`, the base accommodation untouched;
- `POST /api/rooms/unextend` — removes the extension and **only** the extension.

1 night = USD 30 · 2 = 60 · 3 = 90 · 4 = 120, breakfast included, 01 March 2027 → 02 / 03 / 04 / 05 March.

## 4 · My Profile — YOUR STAY

The confirmed stay first (*Complimentary stay · Guest House complimentary · 27 February – 01 March 2027 · Confirmed · USD 0*),
then one horizontal bar with **one dropdown** — *Select additional nights* · 1 night · 2 nights · 3 nights · 4 nights (an
existing extension shows its own duration). Choosing a value shows a review — *2 additional nights · 01 March – 03 March 2027 ·
Riverside Hotel Vientiane · USD 60 total · Breakfast included* — and **Confirm extension**; a preview never reserves anything.
Once confirmed the extension stands as its own card beside the base stay, the dropdown keeps working for a change, and
**Remove extension** asks once before releasing the room. The complimentary stay is never touched by either.

## 5 · Everywhere else

The confirmed extension is one cost of the journey, counted once: the Bag's one total adds the engine's figure (a preview
never), and both emails carry an *Extended stay* line beside the complimentary one, with the amount recomputed from the
journey's lines plus the engine's own number. The stored record carries `rooms.stayext` (hotel, nights, dates, rate, total,
breakfast), so Guest Relations and every confirmation read one truth.

## Checks

Unit **476 / 476** — `test/stay-plan.test.mjs` (9): the deadline's three states and its never-negative count, the Owner's
wording, the six places and the refused seventh, **the last place under real concurrency** (the test harness now serialises
`blockConcurrencyWhile` exactly as the platform does), the release before the deadline, the closed claim after it with the paid
extension still open, every amount, the change that updates one booking, the failure that keeps the base stay, the partner's
untouched extension, and the one total.
Gates **28 / 28** (new **S1** — one stay plan, the generated copy current, the engine reading it, every page carrying it).
Stage E2E `docs/acceptance/2026-09-22-stay-deadline/e2e.mjs` **17 / 17** at 390 · 834 × 1194 · 1194 × 834 · 1440.
