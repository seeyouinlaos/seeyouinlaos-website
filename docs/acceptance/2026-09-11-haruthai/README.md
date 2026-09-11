# Haruthai content / image correction pass — 11 September 2026

A–G are accepted and frozen. This pass corrects content and imagery only; no stage is reopened, seating stays NOT OPEN, no final release run was started.

## What changed
1. **Souphattra Heritage Vientiane** — the dim-sum band on the public wedding page is replaced by `assets/images/souphattra/heritage-room.jpg` (a room, owner library). The "See the table" link is gone.
2. **Wedding Dinner** — the lounge-chair photograph is retired. No long-table or courtyard-dinner photograph exists in the owner library, so the dinner carries a clean placeholder ("Wedding Dinner · the long table — Photograph to follow"). Never lounge chairs, fountain or pool.
3. **Tak Bat** — "no charge" / "nothing to pay" / "no separate charge" retired on every active surface (voyage, wedding, review, your-journey, journey.js, temple.js). Status: **self-pay**, no amount invented, part of the Temple Ceremony, never a fifth event, never a cart product, never the Sangkhathan (USD 15 per participating named person). The Sangkhathan eyebrow now carries its own name so the amount can never read as Tak Bat's.
4. **Resort Wear rails** — `.p-rail > img` keeps a 3:4 aspect ratio with `object-fit: cover` / `object-position: center top`; read back at 390/834/1440/1920: 17 images, ratio 0.750, fit cover.
5. **resort-01.jpg** (the owner-crossed-out male beach photograph) deleted from disk, from the preparation rail and from dress.html. No authoritative replacement exists → resort group is five images, library 23. Release gate P7 now expects 23.
6. **C86** — arrival 13:44 everywhere (transport-data.js, the internal register engine). 21:06 / C642 not restored.
7. **Special Express No. 25** — route "Bangkok (Krung Thep Aphiwat) → Nong Khai, then onward to Vientiane by road"; "In-suite washbasin in every cabin"; "Blankets" (Towels gone); "Shared washbasin facilities nearby" removed.
8. **U Sathorn** — its own `includes`: one room per couple · pickup by Haruthai · Check-in at the lobby · Breakfast included. The room page and the Guest Area amount block now read the room's own breakfast line (previously the group's "Breakfast not included · self-pay" leaked into U Sathorn and Shama).
9. **Shama** — likewise (one studio per couple · lobby · breakfast included).
10. **Contamination search** — keybox / private entrance / private elevator / whole party / breakfast not included / groceries / meals cooked remain only on the Sathorn Penthouse.
11. **Image semantics** — Penthouse, U Sathorn, Shama, Souphattra, Private Residence, Kunming, Lijiang, Kempinski, Temple Ceremony, Tak Bat, Sangkhathan reviewed; only the dinner (lounge chairs) and the Souphattra band (dim sum) were wrong and are corrected above.

## Proof
`walk.mjs` — 24/24 checks, 0 page errors, frames at 390 · 834 · 1440 · 1920 (H1 voyage, H3 wedding/review/your-journey, H4 rails, H5 dress, H6 C86, H7 train, H8 the three Bangkok rooms). Regression: C walk 39/39, D walk 39/39, E/F/G walk 34/34; `npm test` 203/203; release gates P1–P11 all PASS.
