# THE SELF-SERVICE EXTENSION IS WITHDRAWN — Owner, 23 September 2026

An explicit Owner decision: a guest must not be shown a cheap alternative beside the stay that was
chosen for them. The paid extra nights that could be self-booked after the complimentary stay are
therefore gone from the guest booking engine entirely. Extra nights are arranged by Guest Relations
outside the website, and the website names no hotel for them.

---

## 1 · The pre-change audit (read-only, before anything was touched)

```
stage keys carrying a Riverside name
  riverside/superior-window     units 6 · occupants 0     ← the WEDDING-STAY alternative
  stayext/riverside-superior    units 6 · occupants 1     ← the extension product

the extension product
  holders: 1
   · G064 · stayext/riverside-superior · label A

G064's stored record
  storedTotalUsd = 335
  selections     = [sangkhathan:15, guesthouse:0, prewed:290]   → 305
  engine stages  = [wedstay, prewed, stayext]
  extension      = 1 night / USD 30 / Riverside Hotel Vientiane
  version        = 9
```

**Exactly one holder, and it is the guest the Owner authorised.** No other guest was affected, so
nothing was reported back and nothing was paused.

## 2 · Two canonical products, one removed

| key | what it is | action |
|---|---|---|
| `stayext/riverside-superior` | the **paid extension** — nights after the included stay | **removed** |
| `riverside/superior-window` | the Riverside as a **wedding-stay alternative**, 27 Feb – 01 Mar | **preserved** |

Both carry the words "Riverside Hotel Vientiane". Nothing was deleted by name: the removal was made
by canonical key, and the gate now fails if the wedding-stay alternative ever disappears.

> **For the Owner's decision, not acted on here.** The stated reason for this pass — three
> accommodation options competing with the Heritage stay — also describes
> `riverside/superior-window`, which is still offered as a wedding-stay alternative (6 rooms,
> currently 0 occupants). Instruction §10 said explicitly to preserve any other Riverside-named
> canonical product, so it was preserved. If it should go too, that is a separate authorisation.

## 3 · What was removed

| layer | what went |
|---|---|
| `src/inventory-seed.js` | the `stayext/riverside-superior` stock |
| `src/stay-plan.js` | `EXTENSION`, `NIGHT_OPTIONS`, `extensionDates`, `extensionQuote`, `validNights`, `clampNights` (and the generated browser copy) |
| `src/rooms.js` | the `extend` / `unextend` operations, the `stayext` stage, `extension` and `extensionAvailable` in the view |
| `src/worker.js` | `extend` / `unextend` from `GUEST_ROOMS_WRITES`; the `out.stayext` record component |
| `src/mail-templates.js` | the "Extended stay" component and the amount recomputation — the total is the guest's own lines |
| `assets/rooms.js` | `extension()`, `extensionAvailable()`, `extend()`, `unextend()` |
| `assets/bag.js` | `extension()`, `extensionLine()`, `lines()`, `extensionCost()` — the bag is `get()` again |
| `assets/journey.js` | `stayext` in the chronology and the line-carries-own-metadata hooks that existed for it |
| `profile.html` | the extension card, its three actions, the **Extend your stay** bar, the review card, the removal confirmation and all its state |
| `cart.html` · `review.html` | the extension line, its actions and its removal route |
| `assets/prep.css` | the bar, the dropdown, the review card and the status line |

**No empty control, no disabled dropdown, no placeholder card is left.** What survives on My Profile
is the approved record: every confirmed stay, in the order they happen, in one image-free card
system.

## 4 · What was deliberately not touched

The complimentary Guest House (six places, the 30 November 2026 deadline, the real count, the
concurrency guard, the compact availability object, the planning progress, the guest-aware call),
the Souphattra Heritage and its price, the stage-based booking model, inventory rules, guest
identity, party relationships, unrelated costs, and the visual system of the same day.

## 5 · The contract that holds it

`test/no-self-service-extension.test.mjs` (6 tests) and **gate S1**, which now fails if any of these
return: extension stock, an `extend` operation, an extension in the engine's view, an extension
write in the Worker, an "Extended stay" in the emails, or a control on any guest surface — and
equally if `riverside/superior-window` is ever removed by mistake. Both read **code**, not comments,
so the record of why the feature went may keep naming it.
