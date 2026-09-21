# Stage E2E · the close-out pass (21 Sep 2026)

Isolated stage worker, synthetic guests only, every suite on a fresh worker state; the close-out suite in real WebKit (iPhone 13).

| suite | checks |
|---|---|
| close-out (new · WebKit iPhone 13) | 26/26 |
| stage-graph | 40/40 |
| final-pass | 36/36 |
| guest-name | 9/9 |
| highlights | 20/20 |
| release-014 | 35/35 |
| release-013 | 36/36 |
| release-012 (re-pinned: Luye Baisha = 6 room frames, 53 stay frames) | 25/25 |
| release-011 (third run; two earlier runs saw a timing flake in the request-count check, no state difference) | 52/52 |
| P0 empty bag | 52/52 |
| account IA | 35/35 |
| **total** | **366/366** |

Unit: `npm test` 433/433 (39 files incl. hero-show · stay-art · document) · gates: `node src/release-check.cjs` 26/26.
