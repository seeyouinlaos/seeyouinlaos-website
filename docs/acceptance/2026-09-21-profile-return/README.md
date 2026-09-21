# MY PROFILE · THE RETURN PAGE (Owner, 21 Sep 2026)

My Profile stays WHO I AM + MY ACCOUNT (portrait, Change / Remove Photo, First / Last Name, party, contact, documents,
publication choice — all unchanged) and gains three living pieces between the account and the arrangements, every one of
them read from what already is: `assets/community.js`.

## Who's joining us

`GET /api/community` (the Worker, an authenticated guest only, nothing written): every guest whose trip has been SENT
(`reg:` record) and who is joining — a declined response and the hosts are not counted. Per guest: the opaque guest id,
the first name as the guest currently spells it (the contact record's First Name → the name as submitted → the
invitation's), whether a portrait exists, the day the trip was first sent. Nothing else ever leaves the server — no
email, phone, code, booking, document. Newest first (the `firstSentAt` stamp is real, so RECENTLY JOINED is real).
The page: "N guests have joined so far", the portraits (through the existing authenticated read
`GET /api/profile/photo?of=…` via `SIYL_AVATAR.of`, initials where there is none), the recent names, "You are among
them" when the reader has sent; an honest empty state. It re-reads on sign-in and when a portrait changes.

## The journey begins in

A day countdown to 21 February 2027, Bangkok, computed from the clock (days, never hours, never a ticking clock):
before → `THE JOURNEY BEGINS IN · N · DAYS`; the day itself → "today"; during the journey → the wedding, 28 February,
Vientiane, with the day of the journey; the wedding day; after → "day N of 16"; after 8 March → the journey's dates.
Never negative. Under reduced motion the number stands without counting up.

## The journey in numbers

Counted on the page from the canonical data (`SIYL_STAY_MEDIA`, `SIYL_ROOMS` windows, the stage graph, `SIYL_TRANSPORT`,
`SIYL_EXP`); a category that cannot be counted is absent:

| number | derivation |
|---|---|
| 03 Countries | the cities of the stay records mapped to their country (Thailand · Laos · China) |
| 04 Cities | distinct `city` of the stay records (Bangkok · Vientiane · Kunming · Lijiang) |
| 09 Houses & hotels | the stay records |
| 15 Nights | the six stays of the graph (3 + 2 + 2 + 3 + 2 + 2) + the night on the train |
| 16 Days | 21 February → the last window's end, 8 March 2027 |
| 02 Trains | transport records whose operator is a railway |
| 03 Flights | the flight numbers of the airline records (MU9646 · MU5922 · MU741) |
| Restaurants | experiences with a `lunch` or `dinner` role |
| Cafés | experiences with a `cafe` role |
| Bars | experiences with a `bar` role |
| Museums | experiences whose categories name a museum |
| Temples & stupas | experiences whose categories name a temple or stupa |

Deliberately absent: MICHELIN STARS — only one approved record carries a structured star (Cannubi, "One MICHELIN Star");
Sühring's stars exist only as prose in its introduction. Not shown rather than guessed.

Movement: one count-up per number and one portrait reveal when the block enters the viewport; a re-render (the Bag, a
photo) never replays it; none under `prefers-reduced-motion`.

## The strikethrough on Your Invitation (the Owner's iPhone)

Root cause: `.p-link` is the 44 px-tall `inline-flex` action control (`min-height: var(--p-tap)`, padding, `border-bottom`).
Inside the running sentence "From your invitation · CORRECT YOUR NAME · Your party · …" that box sits below the
baseline and its bottom border was drawn through the next wrapped line of prose. Fix (`assets/prep.css`): a link inside
`.t-b1` / `.t-b2` prose is `display: inline; min-height: 0; padding: 0 0 1px; line-height: inherit` — an inline word with
its own underline, one line tall (two where the words wrap at 320). Verified in WebKit at 320 / 390 and at 834 / 1440.
