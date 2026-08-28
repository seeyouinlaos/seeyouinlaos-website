# UX Fix Pass — Gallery navigation, dead controls, invitation opening

**Date:** 2026-08-28 · **Scope:** two surfaces — public site (`index.html`) and
Guest Area (`register/`). Owner-approved design (two decision rounds).

## Problems (from owner screenshots)

1. **Opened gallery stuck on one image.** The Guest-Area lightbox (`#lightbox`,
   `register/app.mjs`) has keyboard arrows only — **no swipe, no visible
   prev/next** — so on mobile a guest cannot reach photo 2/3 (only by closing and
   tapping another thumbnail). The public lightbox (`#rm-lightbox`, `index.html`)
   has swipe but no discoverable control.
2. **Dead controls.** Elements that suggest interaction but do nothing (e.g. the
   "REQUEST" caption on the Your-Stay summary), across the whole site.
3. **Invitation vanishes hard** on "Open your invitation" — no sense of opening.
4. **Invitation feels like a trap** — from the invitation the way back to the
   public homepage is unclear; not perceived as a dismissible popup.

## Approved decisions

- **Gallery navigation:** invisible left/right **tap-zones** + **dot indicator**
  + **swipe** + existing counter. **No visible arrow buttons; no ↗ expand icon
  on thumbnails** (that ban stays). Keyboard arrows retained. Wrap-around.
- **Invitation opening:** **box-lid lift** — the photo panel (the "lid") lifts
  away (3D `rotateX`/perspective) and the whole overlay settles into the Guest
  Area behind. `prefers-reduced-motion` → instant, no animation.

## Design

### 1 · Lightbox navigation (both surfaces)
- Two full-height, ~42%-wide **transparent buttons** over the image (prev/left,
  next/right), `aria-label` "Previous/Next photo". Center stays free.
- **Dots** row (buttons, `aria-label` "Go to photo N"), current dot filled.
- **Swipe**: add touch handlers to the Guest-Area lightbox (public one already
  has them). Threshold ~40px.
- Keep close button + backdrop-click-close + Esc + ‹/› keys. Single images:
  hide tap-zones/dots (nothing to navigate).

### 2 · Dead-controls audit
- Rendered-DOM + code sweep for: buttons with no listener, `href="#"`/empty
  links, `cursor:pointer` on non-interactive nodes, and status words styled like
  CTAs ("REQUEST"/"OPEN"). For each: **wire it up** or **restyle as an
  unmistakable status label** (no button look, no pointer cursor). Report each
  finding + fix.

### 3 · Invitation box-lid opening
- New transient CSS class `html.inv-anim-open` (independent of the
  `data-inv` state machine — **state machine and its tests are untouched**).
  On `.inv-cta`/close click: set `INV.userOpened` + persist **first**
  (invariant), add the class, play the lid-lift + fade (~700 ms), then call
  `setInvitationState('closed')`. Reduced-motion / re-entrancy guard → close
  immediately. Mobile lid = top photo row lifting up; desktop lid = left panel.

### 4 · Invitation not a trap
- Dezent **✕ / "Schließen"** top-right on `#invitation` → closes into Guest Area
  (same path as open, animated).
- Visible **"Zur Website"** link on the invitation card → `../` (public home),
  giving an unambiguous route home from the invitation itself.

## Untouched (owner rule #08)
Prices, inventory, availability, Reserved, LINE/WhatsApp QR, Airbnb, Alms, Train,
Transfers, Auth, Save & Exit, Profile data model, invitation state-machine logic.

## Verification
Local `wrangler dev` + real browser at 375 px: gallery reaches photo 2/3 by
tap/swipe, dots update, zero visible arrows/↗; invitation opens with lid
animation + reduced-motion fallback; ✕ and "Zur Website" work. `npm test`
(63, incl. state-machine) + `release-check` green. Then commit → push →
Cloudflare + GitHub Pages → live visual verification on both.
