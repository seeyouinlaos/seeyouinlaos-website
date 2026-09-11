# C · Party / person state separation — rendered acceptance (2026-09-11)

Walk: `node docs/acceptance/2026-09-11-party-person/walk.mjs [origin] [outdir]`
Invitation: INV-002 · Peggy & Steffie (real code, real bundle). Widths 390 · 834 · 1440 · 1920.
Result: `results.json` — 39 checks, all PASS, no page errors, no horizontal overflow.

## Frames (state → file prefix)
- 00 boundary (no 01–06 before the code) · 01 auth entry · 02 WHO ARE YOU
- 03 invitation as Peggy (YOU ARE CONTINUING AS · SWITCH · what belongs to whom)
- 04 your journey · FOR YOUR PARTY · PEGGY & STEFFIE · Peggy chooses Shama
- 05 about you as Peggy for herself · 06 ANSWERING FOR Steffie (shell band + page band), `?for=` deep link
- 07 the wedding as Peggy: FOR PEGGY · YOU / FOR STEFFIE + answering-for band + Switch to Steffie
- 08 wedding preparation as Peggy: two acknowledgements, Peggy's checkbox, Steffie's card without one (`-ack-` = element crop)
- 09 review as Peggy: block 01 by name (Edit / Answer for Steffie), block 03 dress code per named guest (`-you-`, `-wedding-` crops)
- 10 SWITCH IDENTITY → Steffie: drawer, her checkbox, both acknowledged each by themselves
- 11 as Steffie: same party journey, her own record, wedding ownership flipped, review both reviewed
- 12 VIEW ALL STEPS (semantic states only) · 13 stale-session recovery (foreign identity dropped, no-names gate, code restores everything)

## Visual inspection notes
- Full-page captures paint the sticky shell bar and the fixed journey bar at the scroll offset (a screenshot artefact of `position: sticky/fixed`, present in every earlier acceptance set); the element crops (`-ack-`, `-you-`, `-wedding-`) show the same states unobstructed.
- At 390 the bar wraps "Continuing as / Peggy SWITCH" onto two lines, as accepted in A+B.
