# The Highlights · the Sathorn card inset (Owner instruction, 20 Sep 2026)

An additive change: the premium tables get the Aman Afternoon Tea's prominence and one shared booking grammar; nothing
leaves its existing place. Plus the long-standing Bangkok stay-card inset defect, fixed at the component level.

## 1 · What changed
- **The menu** (`assets/aman.js` — the one full-screen menu): a **Highlights** row between Experiences and Wellness with
  1872 · Champagne Afternoon Tea · Aman (first) · Sühring · Three MICHELIN Stars · Baan Phraya · Thai heritage · Cannubi by
  Umberto Bombana · One MICHELIN Star. Aman stays in the Experiences submenu as well; the hierarchy Destinations · The Journey ·
  Stays · Experiences · Highlights · Wellness · The Wedding · My Trip. Both footers (`shop-menu.js`, `recon.js`) list the four.
- **The Experiences page** (`experiences.html#highlights`): a Highlights rail of the four cards at the top; every place also
  stays in its own day and rail (Sühring 21.02 dinner, Baan Phraya 23.02 dinner, Cannubi 07.03 dinner, the 1872 and Sühring
  editorial blocks).
- **One Highlight page grammar** (`experience.html` + `assets/highlight.js`): the distinction above the name (Three MICHELIN
  Stars · Timeless Thai heritage · One MICHELIN Star · The MICHELIN Guide Thailand 2026), the editorial line, the house, the
  gallery, the clip where one exists, the menu (the uploaded menu cards, dish by dish), the practical information (when ·
  hours · dress code · the house's address / phone / email), and the table section: **select** the menu where a house has
  two → **preview** (a sheet that says exactly what will be added; nothing in the Bag yet) → **confirm** (one Bag line per
  house, `put` replaces on a menu change — never two lines) → the confirmed state (Change the menu · Open My Bag · Remove) →
  My Trip · My Bag · Review & Send. Signed out: no price, no add, the way in. The draft module now runs on the experience and
  tea pages, so a table added there reaches every device of the guest.
- **The products** (`assets/pricing.js`, the one calculation source): Sühring `menus` — Erlebnis · the complete menu THB 9,800
  = **USD 294**, Erlebnis · the shorter sequence THB 7,800 = **USD 234** (beverages not included; the house's 10% service
  charge and 7% VAT are the house's); Baan Phraya the eight-course Thai set menu THB 3,800 = **USD 114** (the house adds 10%
  service charge and government tax); Cannubi the set menu THB 5,500 = **USD 165** (the house adds 7% VAT and 10% service
  charge; one menu for the table; allergies to Guest Relations). Pairings, supplements, the caviar classics and the Wagyu are
  named as the house's own and are **not** products. The 1872 tea stays USD 180 for two. The earlier Sühring USD 180 per
  person (13 Sep) is superseded. The Bag's re-pricing on load is menu-aware; Review's text export carries the line's own amount.
- **The Sathorn inset** (`journeys.html`): the Bangkok stay cards' text is one column (`.pcbody`) behind one token
  (`--pc-inset: 20px`); the shared carousel's `.aslide h3` rule (aman.css) — the actual cause: it out-ranked `.pcname` and put
  the heading 1 px from the border while the rest sat at 19 px — is out-ranked by the card's own selectors, no child carries a
  side margin, the CTA fills the column. Measured on the stage before → after: heading 1 → 21 px; eyebrow · room · facts ·
  price · rate · CTA · link all 21 px at 320 · 390 · 834 · 1440; image edge-to-edge; no overflow. Regression:
  `test/highlights.test.mjs` (the CSS contract) and the E2E measurement at four widths.

## 2 · Assets actually used
| Highlight | Assets |
|---|---|
| 1872 | the existing `assets/images/1872/*` (unchanged) |
| Sühring | the existing gallery `assets/images/experiences/bkk-suhring-01/03/04/09.jpg` (Drive 090) |
| Baan Phraya | the existing gallery `bkk-baanphraya-01…04.jpg` (Drive 094 · `1m1mvGNZW4gsMPbSGJy-mgFbKiN5Wdxjd`); the 5.97 MB clip filed in BOTH 094 and 095 is ambiguous and was not used |
| Cannubi | the existing gallery `bkk-cannubi-01…05.jpg` (Drive 095 · `1Byl3QKNULwmK7FTAvxFvIbythEBR1INE`) + the Cannubi-only 2.08 MB clip (fresh pasta) → `assets/video/cannubi-card.mp4` (720×1280, H.264 yuv420p, silent, faststart, 1.7 MB; gate V1 verifies it from the data record) |
| Menus | the Owner's uploads: the Sühring menu card, the Cannubi Autumn Menu 2026, the Baan Phraya menu (Mandarin Oriental) — dish by dish, nothing invented |

**Beef Experience — not implemented, reported:** no "Beef Experience" exists in the approved project data (`assets/*`, `src/*`,
the Operations Master read of 20 Sep, the Drive website folders); the phrase occurs only in the superseded "Back Up_H_S –
Main Wedding Sheet Dec_2026" (the earlier Capella concept). The Owner's own rule — "Do not invent pricing or content that is
not already present in the approved project data" — applies; the moment the Owner names the place, its content, price and
Drive folder, it joins the Highlight rail through the same grammar (a data record with `highlight` + `select`, a FLAT product).

## 3 · Proofs
| Proof | Result |
|---|---|
| Unit (`npm test`) | **405 / 405** — `test/highlights.test.mjs` (data · booking grammar · navigation · the inset contract) + the re-pinned `experiences`, `flow`, `access`, `release-014` |
| Release gates | RELEASE CHECK PASSED — V1 verifies both clips (ffprobe), I1 infra freeze intact |
| Stage E2E `e2e.mjs` → `stage/` | the menu row · the rail (images and pages served) · Sühring (page · preview holds nothing · confirm 294 · change to 234 replaces · fresh device 234 · remove) · Baan Phraya 114 · Cannubi 165 with the clip mounted · 1872 180 · My Bag four lines USD 753 · Review & Send sendable with the four · signed-out · the inset at 320/390/834/1440 · overflow · console — **20 / 20** (`stage/e2e-highlights.json`, screenshots) |
| Regression suites 014 · 013 · 012 · 011 · P0 · IA | **79/79 · 35/35 · 25/25 · 52/52 · 52/52 · 35/35** |
| Deploy · parity · live-ro (`highlights-live` added) · zero state | see the final report |
| Codex | **PENDING — EXTERNAL QUOTA LIMIT** (probed 20 Sep: "try again at Sep 24th, 2026 10:18 PM"); not represented as passed |
