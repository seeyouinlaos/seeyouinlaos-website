# FINAL MOBILE VENUE FIX (Owner, 16 Sep 2026) · evidence

**Failing before (the Owner's screenshot):** on the homepage, between "The Wedding" and "One invitation · one
journey", the aerial was a wordless 300 px transition band (`.a-band`, `background-size: cover`) — a desktop crop
on a phone, no labels, 76 px of margin above and 96 px below.

**Root cause:** the homepage never mounted the venue stage; the band was a separate composition (`index.html`,
`.a-sec.tight > .a-band`). The seven Owner labels live in the stage component (`assets/venue.js` +
`assets/venue-data.js`), which was mounted on the wedding and stays pages only.

**Fix (code only):** the band gave way to the venue stage on `index.html` (the same component: the clean real
aerial, the seven labels, the seven-item legend, the detail); `assets/venue.css` gained the phone rhythm —
heading → aerial 32 px, aerial → legend 24 px, section ↔ neighbours 56 px; no spacer, no sticky reservoir, no
viewport height. Desktop: the stage/motion system untouched; the homepage shows the stage in the full frame.

**Walk (`walk.mjs`, 104 checks):** 320 · 375 · 390 · 393 · 430 (Chromium), 375 · 390 · 430 (WebKit), 1280 —
the real aerial full width, the seven labels (Rooms ×3) none colliding, none outside, all visible; the spacing
above; the seven-item legend directly below; a Rooms marker tap presses all three markers and the legend item
and opens the Rooms detail without a page jump; a legend tap opens the same detail as its marker; a place without
a marker opens from the legend; no horizontal overflow; reduced motion complete; no page errors.
Local 104 / 104 · Worker 104 / 104 (`walk-results.json`, `320.png` · `375.png` · `390.png` · `430.png` ·
`webkit-390.png` · `desktop-1280.png`) · Pages 104 / 104 (`live-pages/`). The wedding page's venue walk still
68 / 68 live. Parity 719 / 719 at ee27625.

Note: the 007 FINAL V3 corpus (621be9c) predates this patch; the homepage now carries the venue texts already
in the corpus from the wedding page, and the band's former aria-label is gone. No other text changed.
