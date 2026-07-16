# P3a Regression Review — 2026-07-16

Scope: verification of P0 (repository), P1 (performance), P2 (accessibility),
P3 (metadata) against the repository and the live deployment
(https://seeyouinlaos-website.suthep-hrg.workers.dev, commits `744ba48` + `413ddd2`).

## Evidence (commands run against repo / live)

| Claim | Evidence | Result |
|---|---|---|
| All assets referenced, no orphans | ref-scan (src/srcset/href/url) vs. filesystem | 62 referenced / 62 present / 0 missing / 0 orphans |
| No duplicate files | md5 content-hash over assets/ | 0 duplicate contents |
| Wrangler build valid | `wrangler deploy --dry-run` | 21.93 KiB worker, ASSETS binding, no errors |
| Cloudflare Workers Build green | GitHub check-runs for 744ba48 and 413ddd2 | completed / success (4/4 checks) |
| Live site serving | curl / | HTTP 200 |
| WebP served | curl img-hero.webp, dg2-ceremony-2.webp | HTTP 200 |
| Hero loads WebP (not JPG) | browser network log on live page | GET img-hero.webp -> 200 (image-set picked WebP) |
| 47x lazy, 9x picture, 1x main, 3x inert | grep on the delivered live HTML | 47 / 9 / 1 / 3 |
| OG + description + theme-color live | grep on delivered HTML | 4/4 markers present |
| Draft footer line removed | grep "internal preview" on live HTML | 0 matches |
| font-display swap | grep on live HTML | 3x swap, 0x block |
| Panel focus cycle | live browser test | focus->close-btn, inert toggles, focus returns: all true |
| Menu focus cycle | live browser test (after fix `413ddd2`) | first link focused on open, button on close: true |
| Broken images | live browser scan | 0 |

## Finding during review (fixed)

- `menuFocusOnFirstLink` was false: focus fired before GSAP's first tick made the
  overlay visible. Fixed in `413ddd2` (visibility set synchronously on open);
  re-tested green.

## Environment note

The review browser pane reports `document.hidden: true`, which suspends
requestAnimationFrame; GSAP's ticker freezes there (evidence: `gsap.ticker.time`
static across 600ms). This is a property of the headless review pane, not of the
site: entrance animations run when the tab is visible, and the site's own
`?static` fallback (also used for `prefers-reduced-motion`) renders the full
final layout, which is what the visual checks below used.

## Visual checklist (screenshots taken in the review session)

| Check | Viewport | Result |
|---|---|---|
| Hero | 1920x1080 | OK: logo, date badge, 2-line statement, sub, menu |
| Hero | 1440x900 | OK |
| Hero | 1280x800 | OK |
| Hero | 768x1024 (tablet) | OK (sub wraps to 2 lines, acceptable) |
| Hero | 390x844 (mobile) | OK: 3-line statement, no overlap with MENU |
| Dark section (principles) | 1440 | OK: contrast, 3 columns |
| Timeline | 1440 + 390 | OK: serpentine path desktop, single column mobile, images load |
| Gallery (dress guide) | 1440 | OK: 3-up slider, counter, nav arrow, lazy images load |
| Navigation (menu overlay) | 390 | OK: 8 items 01-08, one per line, focus on first link |
| Footer | 1440 | OK: italic descenders not clipped, draft line gone |
| Standalone build | live /build/standalone | OK: renders identically, inlined assets |
| Workers build | check-run | success |
| GitHub build | check-runs (build/deploy/report) | success |

## Status

P0-P3 implemented and technically verified. Open: P4 (typography weights),
P5 (dvh migration + hero positioning with breakpoint screenshots), P6 (UX
polish) - deferred pending owner review and explicit approval.
