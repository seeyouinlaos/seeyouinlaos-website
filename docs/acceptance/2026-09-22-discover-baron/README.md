# DISCOVER · BARON · QUESTIONNAIRE · PROFILE — the reconciliation (Owner, 22 Sep 2026)

## 1 · The taxonomy
A place's CATEGORY says what the place IS — `restaurant · cafe · bar · club · experience · place` — never what happens there.
`assets/experiences.js` carries `category` (one) and one `role`; `visits` is the chronology. `assets/discover.js` is the one
reading for the Discover rails, the place page and the journey in numbers. The gallery builder and the inventory follow it.

| Place | before | now |
|---|---|---|
| Harudot | cafe + experience (Cafés · 6 and Experiences · 1, "CAFÉ · EXPERIENCE") | **CAFÉ**, once — one card, its two days (23 Feb · 7 Mar) |
| Time Space Cafe · Moo Yoo Rose House | lunch + cafe (Restaurants and Cafés) | **CAFÉ**, once |
| Kaogee Le Triomphe | lunch + cafe | **CAFÉ**, once |
| Sona Cafe and Bar | cafe + bar | **BAR**, once (Bars & nightlife) |
| Vientiane Night Market | experience + place | **PLACE**, once (Shopping & places) |
| That Dam · Wat Si Saket · Wat Si Muang | Experiences | **removed** (records, inventory, photographs) |
| Wat Ong Teu | absent | **EXPERIENCE**, once — the temple of the Alms Giving Ceremony, Sunday 28 Feb 2027 09:00 (Ops Master Day 08); its photograph DSC07779 from the Owner's folder "050 - Event - Temple Ceremony - Wat Ong Teu Vientiane" (the frame the Temple Ceremony already shows) |
| BARON Vientiane | absent | **CLUB**, once (Bars & nightlife) + the Highlights rail's closing card + its own page |
| Petits Plats Bangkok | dinner, no photograph | **RESTAURANT**, once, 8 Mar 2027 (Ops Master Day 16 Dinner), the five photographs of its own folder |
| Lacuna VTE | cafe (the overview's bar cell unrepresented) | CAFÉ, once — its evening noted as a second visit on the one card |
| Café Craft by CHANINTR · Siam Paragon · Firefly Bar (7 Mar) · Cam On (26/27 Feb) · Le Café at Souphattra Heritage · Selene Sky Bar (27 Feb) | absent | added from the approved overview, **without a photograph** (none approved) |
| Exclusive Afternoon Tea by Aman | the 1872 Highlight | unchanged — represented once, as the Highlight (1872.html); not duplicated into Cafés |
| Kunming Cherry Blossoms | in data, unrendered | the China rail now renders it |

Final rails (chapter · category · count): Bangkok — Restaurants 10 · Cafés 7 · Bars & nightlife 3 · Experiences 3 · Shopping & places 5;
Vientiane — Restaurants 4 · Cafés 3 · Bars & nightlife 3 · Experiences 9 · Shopping & places 2; China — Experiences 1. Every place
renders exactly once (`test/discover.test.mjs` checks it for all 50). The separate "Bangkok, 6 – 8 March" section is gone: the
return venues sit at the end of each Bangkok rail, in date order.

## 2 · BARON Vientiane
Club · 2nd floor above Starbucks · Sunday 28 Feb 2027 · the couple's VIP after party (the last row of the wedding night). Media
from the Owner's folder only: seven photographs (`vte-baron-01..07`, kinds atmosphere · stage) and three films with sound
(`assets/video/baron-01..03.mp4`, metadata stripped, posters from the films themselves). The page: eyebrow VIENTIANE · CLUB, the
date, the distinction "The wedding night · VIP after party", the gallery, "The night, on film" — three frames through the shared
clip module (Play / Pause · Sound on / Mute; autoplay with sound where the browser allows it, muted where it insists; the tap on
SOUND ON brings the music; **one film at a time** — a frame that starts, or turns its sound on, silences the others). Verified in
WebKit at 320 · 390 · 834×1194 · 1194×834 and Chromium 1440: the sound toggle reaches `muted:false` with the film playing, the
others paused, PLAY pauses, controls inside the frame, no other record's media on the page. No BARON frame in any other gallery.

## 3 · Dates and chronology
Every itinerary-linked card shows its date as words (`Monday, 22 February 2027`; a second day: `Tuesday, 23 February · Sunday,
7 March 2027`), never a time. Each rail is sorted by date, then by the day's sequence from the Operations Master detail schedule
(`seq`, the clock — stored, never shown; nominal column order where the detail page carries no time). Undated places (the
Vientiane portrait: Patuxai, Ha Phrakeo, the Palace, Buddha Park, the two museums; Le Du Kaan) close their rail without a date.

## 4 · The questionnaire
`src/questionnaire.js` is the one schema (generated copy `assets/questionnaire.js`, gate Q1; every guest page loads it before
guest.js; the Worker imports it). REQUIRED before SEND: the allergy answer, coffee/tea, the flavour, the drink, the film, **the music
genres** (multi-select, at least one, stored as an array — never prose), the photography acknowledgement; the four wedding events,
the Sangkhathan where it applies, the dress-code acknowledgement, the seats where seating is open — and **A WISH FROM THE BRIDE &
GROOM** (`wedding.html#finale`): the pool jump or BARON, never preselected, never defaulted, the guest's own (a partner cannot
answer for the other). OPTIONAL: the song/artist line, the passport, the flight, the publication consent. The server re-derives
the same rule (`completionOf` → the graph's completion + `profileMissing`): an unanswered required question is a 422 that names
the item and its way, stores nothing and leaves the draft untouched. The answers travel in the record (`templeCeremony.guests[].
finale / finaleKey`, `guestRecord.guests[].profile.genres`) and in both emails ("After the dinner: …", "Your music (genres): …").

## 5 · The journey in numbers
Counted from unique places by category (`SIYL_DISCOVER.counts()`): **Restaurants 14 · Cafés 10 · Bars & nightlife 6 · Museums 4 ·
Temples & stupas 2** (Wat Ong Teu, Pha That Luang — its cats now say Stupa). Countries 3 · cities 4 · houses 9 · nights 15 · days
16 · trains 2 · flights 3 unchanged. Before: 16 · 9 · 3 · 5 · 3 (Time Space, Moo Yoo, Kaogee counted twice; Sona twice; Wat Si
Saket twice).

## Tests
Unit `npm test` 460 / 460 (discover 5 · questionnaire 4 new; 20 pins re-pinned to the new model) · gates 27 / 27 (Q1 new) ·
stage E2E: see the batch in the report (this suite 19 / 19: `stage/e2e.json`).
