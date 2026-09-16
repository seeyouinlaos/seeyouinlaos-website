# EDIT 4 + MOBILE LIVE FIX (Owner, 16 Sep 2026) · evidence

No access code, bearer or hash appears in this folder.

| IMAGE | OWNER CORRECTION | FILES CHANGED | LIVE VERIFICATION |
|---|---|---|---|
| IMG_4029 (the stays overview, Worker origin) | "Add text: self-pay" on the Luye Baisha and Siam Kempinski summaries → `Lijiang · 2 nights · breakfast included · self-pay` / `Bangkok · 2 nights · breakfast included · self-pay` | `accommodation.html` (the stays table), `journeys.html` (The Journey's two stay cards — the same summary copy); the authenticated journey summary, Review & Send and the sent text build their lines from the priced stay data (no "breakfast included" summary there); `test/owner-patch-003.test.mjs` | `live-worker/stays-self-pay.png`, `live-pages/stays-self-pay.png`; the served bytes of both pages byte-identical to the tree on both origins |
| IMG_4030 (Experiences, the Bangkok return section) | "Cafés section is already exist. Add Harudot into that section" — no rail of its own, not under Shopping & Places | `experiences.html` (the rails: a café of the return days joins the existing Bangkok Cafés rail; the return section keeps its other places) — the inventory already says `roles: ['cafe']` (`assets/experiences.js`, `src/experience-inventory.json`) | `Cafés · 5` (Dior · Café LV, Time Space Cafe, Whispering Cafe, Cafe Madeleine, Harudot), Harudot once, card "Bangkok · Café": `live-worker/experiences-cafes-harudot.png`, `live-pages/experiences-cafes-harudot.png` |
| the Owner's mobile screenshot (the homepage: "The wedding days" → aerial → "One invitation · one journey") | labels not visible, giant space above and below the aerial, the block detached | the homepage now mounts the venue stage (`index.html`, ee27625) with the phone rhythm (`assets/venue.css`); the stage enters by itself three seconds after mount at the latest (`assets/venue.js`); every stylesheet and script reference carries its content hash (`src/asset-versions.cjs`, release gate C1) | fresh 390 px captures from the heading through the next section: `live-worker/mobile-390-venue.png`, `live-pages/mobile-390-venue.png` (+ `webkit-390-venue.png`, `mobile-390-aerial-viewport.png`, `desktop-1280-venue.png`); measured on both origins: previous section → heading 56 px, heading → aerial 32 px, aerial 346 × 433, seven labels visible, none colliding, venue end → "One invitation · one journey" 56 px, horizontal overflow 0 |

**Cache / deploy audit.** Worker: `cache-control: public, max-age=0, must-revalidate` + ETag — a browser revalidates
every file. GitHub Pages: `cache-control: max-age=600` on every file — a browser may keep a stylesheet or script for
ten minutes after a deploy and pair it with a fresh page. That is the stale-asset risk; it is closed by the
fingerprints: every `href="assets/….css"` / `src="assets/….js|mjs"` on the 23 pages now reads `?v=<8-hex content
hash>` (279 references), so a changed file changes its URL. The page itself (an unversioned URL) can still be the
ten-minute-old copy on Pages — it then references the old assets it was built with, consistently; within ten minutes
the fresh page arrives with the fresh URLs. No service worker exists. No manual cache clearing is required.

**Proof tooling.** `proof.mjs <origin> <outdir>` fetches the served bytes of the eight changed files (compares with the
tree), checks the fingerprinted references in the live HTML, renders and measures the phone venue section (Chromium 390
and WebKit 390), the desktop stage, the Cafés rail and the stays overview — `proof.json` in each folder.
Worker: LIVE PROOF PASS (11 / 11) · Pages: LIVE PROOF PASS (11 / 11).

**Smoke.** Access audit live on the Worker: 0 price · 0 private-action · 0 inventory leaks signed out, 0 direct-URL
bypass, 44 / 44 private routes handed over, 44 / 44 reached signed in — PASS. Register audit: 47 · 47 · 47 · 0 missing ·
0 duplicate · 0 auth errors · deployed register identical. Tests 273 / 273 · release check passed (incl. gate C1).
The mobile venue walk (`../mobile-venue-fix/walk.mjs`) 104 / 104 on the local Worker at the final code.

**007.** The corpus was re-extracted at 57de900 with the existing tooling (`007-final-v3-*`): self-pay ×6 surfaces,
`Cafés · 5`, no `Cafés · 1`; audit 123 claims · 99 MATCH · 16 OWNER DECISION OVERRIDE · 6 SOURCE MISSING · 1 STALE ·
0 CONFLICT · COMPLETENESS PASS · SECRET SCAN PASS; delta v2 → v3: 46 appeared · 31 disappeared · 0 new conflicts.
