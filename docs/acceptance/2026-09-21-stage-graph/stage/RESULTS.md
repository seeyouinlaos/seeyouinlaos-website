# Stage E2E · the global My Trip rebuild (21 Sep 2026)

Isolated stage worker, synthetic guests only, every suite on a fresh worker state.

| suite | checks |
|---|---|
| stage-graph (new) | 40/40 |
| final-pass | 36/36 |
| guest-name | 9/9 |
| highlights | 20/20 |
| release-014 | 35/35 |
| release-013 | 36/36 |
| release-012 | 25/25 |
| release-011 | 52/52 |
| P0 empty bag | 52/52 |
| account IA | 35/35 |
| **total** | **340/340** |

Unit: `npm test` 423/423 (36 files incl. test/stage-graph.test.mjs) · gates: `node src/release-check.cjs` 26/26 (incl. the new G1).
