# Lijiang · the Snow Mountain Viewing Room's photographs (Owner instruction, 21 Sep 2026)

The Owner's markup on the live Journey page: the three frames that stood for the house on The Journey (the bedroom towards
the valley, the private soup pool below the peak, the sitting room and its fireplace towards the mountain — `assets/images/
journey/lijiang-01/02/03.jpg`, Drive 024) **are the Snow Mountain Viewing Room**; the peak over the Baisha rooftops
(`assets/images/lijiang/snow-mountain-viewing-1.jpg`, the Owner's designated frame of 08 Sep) is the house's own picture.
The two were switched — data only, no photograph added or invented:

- `assets/rooms-data.js` · `snow-mountain-viewing`: gallery = the three room frames (the earlier "view only" treatment retired);
  the Bag line for the room carries the bedroom; the stay window's `bagImg` = the peak.
- `src/stay-media.json` → `assets/stay-media.js` (`luyeBaisha`): one frame, the peak over the rooftops (kind `grounds`).
- `accommodation.html` (THE HOUSES): the Lijiang card = the peak.

Proofs: unit 411 / 411 (`pricing` and `final-pass` re-pinned) · RELEASE CHECK PASSED (M1 stay media current) · stage:
`stage/ljg-journeys.png` (the house = the peak, the room row = the bedroom), `stage/ljg-room.png` (the room page = the
room), `stage/ljg-houses.png`; the 012 · 014 · final-pass suites in `stage/regression.txt`; deploy in the commit that follows.
