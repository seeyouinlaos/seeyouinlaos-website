# 008 — source-truth audit (delta over 007 FINAL V3, 16 Sep 2026)

Method. The v3 audit (`docs/review/007-final-v3-source-truth-audit.txt`, main 57de900) checked 123 factual claims against the Operations Master export of 13 Sep 2026, the Owner's decisions of 13–16 Sep and the brief. Since then the fact-bearing data modules changed only in image assignment (`assets/rooms-data.js`, `SIYL_STAY_IMAGES`) and in the FIXED-room handling (`assets/journey.js`, `assets/pricing.js` — no value change: verified by `git diff 57de900..HEAD` on pricing, transport, venue, experiences, journey and temple data). The wording audit changes no factual value. This file therefore (a) re-affirms the v3 classifications for the unchanged corpus and (b) classifies every factual string that is new since v3.

## A. Re-verified against the brief (PROJECT_MASTER_BRIEF.md §2, §11, §13) — unchanged code values

| Claim | Website | Brief | Class |
|---|---|---|---|
| Journey dates | 21 February – 8 March 2027 | §2 | MATCH |
| Wedding | Sunday, 28 February 2027 · Vientiane | §2 | MATCH |
| Programme times | Temple 09:00 – approx. 12:00 · Coffee & Cake from 12:00 · Vow Ceremony 15:30 · Wedding Dinner 19:30 | v3 ST-003/005/006 | OWNER DECISION OVERRIDE (unchanged) |
| Special Express No. 25 | USD 100 per guest | §13 | MATCH |
| MU9646 Business / Economy Flexible | USD 275 / USD 155 | §13 | MATCH |
| C86 Business | USD 85 per guest | §3, §13 | MATCH (Owner decision; the 007 manifest's USD 105 is superseded) |
| MU5924 + MU741 | USD 200 | §13 | MATCH |
| Sühring | USD 180 per participating guest · request only | §3, §13 | MATCH |
| 1872 | USD 180 for two guests | §13 | MATCH |
| Sangkhathan | USD 15 per participating guest | §13 | MATCH |
| Bangkok stays | Penthouse USD 85, U Sathorn USD 64, Shama USD 40 per guest/night × 3 | §11 | MATCH (§11: "operational approval must be verified" for the Penthouse — unchanged) |
| Souphattra rates | 145 / 155 / 170 / 240 / 250 / 290 / 750 | §11 | MATCH |
| Kunming and Lijiang rates | as §11 | §11 | MATCH |
| Siam Kempinski | USD 190 × 2 | §11 | MATCH |
| Wedding window | first night the guest's, second night hosted by Haruthai & Suthep | §13 | MATCH |
| Private Residence | complimentary, up to six guests | §11 | MATCH |
| Reserved categories ("Reserved · Bride & Groom", "Reserved · Family") | shown as reserved, never bookable | §11 ROOM RESERVATION CONFLICT | CONFLICT (documented, out of the wording scope — words kept, "not bookable" → "not available") |

## B. Factual strings new since v3

| Where | String | Source | Class |
|---|---|---|---|
| Arranged for you card (My Trip, My Bag, Review, emails) | "Bangkok · 21 – 24 February 2027 · Sathorn Penthouse Bangkok · Room A · Elegant 6BR Sathon Penthouse · 3 nights · Haruthai · You" | §3, §11 (Room A fixed for Haruthai and Suthep), rooms-data card name (v3 section K) | MATCH |
| Arranged for you card | "Fixed arrangement · not part of your bag" — no amount | §9 ("Fixed describes change authority; it does not automatically mean hosted or USD 0") | MATCH · payer wording: SOURCE GAP (kept safest wording: no amount, no payer claim) |
| My Bag empty state | "No selections yet · USD 0" | §10 | MATCH |
| Emails (16 Sep) | programme lines, seats, costs | v3 + §13 | MATCH |
| Stage cards | "2 places available", "Sold out" (was "Fully booked") | §11 (Full = no remaining place in the live store) | MATCH · wording only |

## C. Totals

MATCH 121 · OWNER DECISION OVERRIDE 16 (v3, unchanged) · STALE 1 (v3 ST-017, unchanged) · RETIRED 0 new · SOURCE GAP 7 (v3's six "SOURCE MISSING" + the fixed-room payer wording) · CONFLICT 1 (room reservation markers, pre-existing, documented in the brief §21).

No factual value was changed by the wording audit.
