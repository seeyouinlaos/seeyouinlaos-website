# The site-wide layout QA agent

*Owner, 25 Sep 2026.* A permanent auditor that finds layout faults by itself. Screenshots from the Owner are for changing a design rule, not for pointing out faults.

It renders every guest-facing page in every materially different state. It covers English and Thai, Chromium and WebKit, and every width that matters. It measures each render against one machine-readable contract using DOM geometry and semantic classification, never pixel diffs.

| File | What it is |
|---|---|
| `src/layout-contract.cjs` | **The canonical layout contract**: the wall, the levels, every allowed exception (a named primitive plus its reason), and the viewports |
| `src/layout-routes.cjs` | **The route manifest**: every page, its family, its states, and the new-route guard |
| `src/layout-qa/rules.js` | The in-page measurement: the rules below, the root-cause trace and the diagnostic overlay |
| `src/layout-qa/core.cjs` | Breakpoint discovery, the viewport matrix, the layout fingerprint and root-cause grouping |
| `src/layout-qa/states.mjs` | Brings the **synthetic** stage guests into each state through the site's own client code (local stage only) |
| `src/layout-qa/selftest.html` | One seeded fault per rule plus correct control blocks; the auditor proves itself before every run |
| `src/layout-qa/audit.mjs` | The runner: the fast gate, the full audit, reports and annotated screenshots |
| `test/layout-qa.test.mjs` | The static half, run in `npm test` |
| release gate **L2** | Enforces manifest coverage and contract honesty, and requires recorded fast and full audits on the current layout |

## The contract

**The wall.** Left edge = `max(--a-gut, (viewport − --a-frame) / 2 + --a-gut)`; the right edge is symmetric. It is computed from the tokens that build it, never read from a screenshot.

- The header's content closes on the wall.
- Every visible content box sits inside the wall, or belongs to a declared full-bleed band whose content returns to the wall.

**Levels.** Every block is one of:

- **page**: spans the wall;
- **editorial** or **narrow**: starts on the wall's left axis and stops at its measure;
- **component**: a card, a column of a multi-column grid or row, an overlay, or a rail. Its own content edge (start or end) is the axis for what it holds;
- **full-bleed**: only the named bands.

**Rules** (the violation types):

| Type | Rule |
|---|---|
| `OVERFLOW` | Nothing scrolls sideways (in a panel: nothing inside the panel). |
| `HEADER_WALL` | The header's content edges and the bag close on the wall. |
| `OUTSIDE_WALL` / `BLEED_PARTIAL` | Visible ink stays inside the wall unless it is a declared band, and a declared band spans the screen. |
| `AXIS_WALL` / `AXIS_INNER` | A block of text, a component, a photograph or a rail starts on its axis. |
| `AXIS_CENTERED` | Centred text only inside declared centring primitives (button labels, figures, the approved iPhone composition). |
| `MEDIA_WALL` | A page-level photograph or rail spans the wall exactly, unless it is a declared narrow-media primitive. |
| `MEDIA_DISTORTED` / `MEDIA_BROKEN` | A photograph keeps its proportions and loads (no blank frame). |
| `TEXT_CLIPPED` | Text is never cut, unless an ellipsis is declared. |
| `SECTION_OVERLAP` / `SECTION_VOID` | Consecutive sections never overlap and never open a gap wider than 2.2 × the rhythm tokens. |
| `ROUTE_UNMANIFESTED` | A served or linked page that is not in the manifest. |

**Exceptions** exist only as entries in the contract (`fullBleed`, `narrowMedia`, `axisFree`, `centered`). Each entry has a selector, an optional width range and its reason. The report lists how often each exception was relied on, so an unused one can be retired.

**Viewports.**

- **Named** (the Owner's list): 320 · 360 · 375 · 390 · 430 · 600 · 744 · 768 · 820 · 834 · 1024 · 1133 · 1180 · 1194 · 1280 · 1366 · 1440 · 1680 · 1920 · 2560.
- **Breakpoints**: ±1 around every real breakpoint. These are discovered from the `@media` preludes of every stylesheet, every page's own `<style>`, and every `matchMedia` in `assets/*.js`, so a new breakpoint is covered the day it is written.
- In the full audit, every named width is a fresh page load; the ±1 widths are resize steps from it.

## The states (synthetic guests only)

| State | What it covers |
|---|---|
| `signed-out` | Every page |
| `fresh` | A guest who has just opened the invitation |
| `planning` | A room held and the train chosen |
| `declined` | A party member who said no |
| `mixed` | The attending partner of that party |
| `sent` | Confirmation, tickets, seat plans, My Profile after sending |
| `menu-open` / `menu-open-guest` | The menu panel, audited on its own wall |
| `steps-open` | The step index |

**Data variants.** Parameterised pages (every room, transport leg and experience) are discovered from the page's own data. The first record and the record with the longest name run in the whole matrix. Every other record runs in Chromium/EN at the named widths of the full audit.

**Secrets and safety.** Guest states run only on the local stage and need `LAYOUT_QA_CODES` (a JSON file of synthetic codes) and `LAYOUT_QA_GR_TOKEN`. No code, token or guest data is in the repository. Against any other origin the auditor is **read-only**: signed-out states only, nothing is written.

## Running it

```sh
npm run layout:fast                         # the structural gate — every release (≈ 5 min on the stage)
npm run layout:full                         # the full site-wide audit — release acceptance
node src/layout-qa/audit.mjs --fast --record   # … and record the result for gate L2
node src/layout-qa/audit.mjs --fast --origin https://seeyouinlaos-website.suthep-hrg.workers.dev   # production, read-only
```

Options: `--engines`, `--langs`, `--routes`, `--states`, `--widths`, `--workers`, `--out`.

**Fast.** Every route in the states signed-out, fresh, sent, menu-open and steps-open. Chromium/EN at 320 · 390 · 744 · 768 · 834 · 1024 · 1440 · 1920; Thai and WebKit at 390 and 1440. Representative data only.

**Full.** Every state, EN + TH, Chromium + WebKit, the whole matrix, all data variants.

**Output.** Written to `qa-artifacts/layout/<time>-<mode>/` (git-ignored — the Workers Build deploys from git, so they are never served; `.assetsignore` is pinned by the infrastructure freeze and is not touched):

- `report.json`: every violation with route, state, language, engine, viewport, component, expected vs actual geometry, type, and its likely root primitive with the stylesheet lines that write it;
- `report.md`: the same, grouped by root cause;
- `shots/`: **annotated diagnostic screenshots** (the wall as blue dashed lines, every offending box outlined and numbered). There is one per root cause per route, state, language and engine, at the first width it appears.

**Exit codes.** 0 = zero unexplained violations. 1 = violations. 2 = the auditor failed its self-test and refuses to report.

## Release

1. `npm test` (includes `test/layout-qa.test.mjs`).
2. `node src/layout-qa/audit.mjs --fast --record`: required for every release.
3. `node src/layout-qa/audit.mjs --full --record`: release acceptance. Required whenever the layout fingerprint changes (contract, rules, manifest, a stylesheet, or a page's own `<style>`).
4. `node src/release-check.cjs`: gate **L2** fails unless both records carry the current fingerprint, both engines, both languages, every state (full), the whole matrix (full), and zero unexplained violations.
5. After the push and the Workers Build: `node src/layout-qa/audit.mjs --fast --origin <production>` (read-only).

## Changing a design rule

When the Owner changes a rule:

- change the **primitive** (the token or shared class), never a page's coordinates;
- if the change is a new intentional exception, add it to the contract with its reason;
- run the audits again.

A violation is never fixed by a negative margin, a per-route override, or a coordinate taken from a screenshot.

## Grouped media — the composition rule (26 Sep 2026)

Two individually valid photographs can still form an invalid composition. On a tablet held upright (768–1199 px, portrait), a rule in `assets/aman.css` turned the duo (`.a-duo`: the map of Laos beside the reclining Buddha on the first page, and the alms-giving pair on the Wedding page) into one column. The result was two full-wall blocks stacked on top of each other. Every audit still passed, because the contract had no rule for a **group**.

That rule is gone. The duo now stands side by side on the frame's two columns at every width.

**The contract:** `groups` in `src/layout-contract.cjs` declares grouped media, with their members, routes and reason. `core.contractProblems` fails a page that carries a grouped primitive but is not in that group's routes.

**The rules:** `rules.js`, section 9, runs in every fast and full audit and in the self-test, which seeds a stacked duo and an unequal-weight duo. It checks:
- `GROUP_STACKED`: the members share one row, with a vertical overlap of at least 60 %.
- `GROUP_WEIGHT`: height ratio ≤ `weight` and area ratio ≤ `weight`². The members may differ in aspect, since the map keeps its drawing ratio, but not in weight.
- `GROUP_MEMBER_OVERSIZED`: no member is wider than `memberShare` of the content wall.
- `GROUP_TOO_TALL`: the group's media height ≤ `heightRatio` × its width.
- `GROUP_MEMBERS`: the expected number of members is visible.

**The composition audit:** `node src/layout-qa/composition.mjs [--origin URL] [--record]` renders only the grouped routes, but densely:
- every real breakpoint ±1, the named widths, and every 32 px from 560 to 1400;
- both orientations from 600 to 1366 px;
- Chromium and WebKit, English and Thai.

It adds `GROUP_DISCONTINUITY`: between two adjacent samples of one orientation, a group's height ÷ width may change by at most `continuity` (×1.8). The art-directed switch from the phone's 4:5 pair to the tablet's 4:3 pair at 600 px is ×1.7; a stack is ×2.9 or more. It is read-only against any origin.

**Release gate L2** requires `docs/acceptance/layout/LAST-COMPOSITION-AUDIT.json`, recorded on the current layout fingerprint with zero violations. Media QA `--rendered` runs the same audit.

**The proof:**

| Run | Result |
|---|---|
| Production before the fix | FAIL: 920 violations in 9 root causes, exactly 768–1199 px portrait, both duos, both engines, both languages |
| The corrected stage | PASS |
