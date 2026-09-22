/* TWO HOUSES · SEVEN PHOTOGRAPHS (Owner, 22 Sep 2026) — the served proof: the two café cards of 22 February, each venue's own
   page with its own frames, every frame 200, no frame of one venue on another's page. Read-only, stage or live. */
import fs from 'node:fs';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = process.argv[2], O = (process.argv[3] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 900) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 200 : 900)); };
const b = await chromium.launch(), wk = await webkit.launch();
const page = async (w) => { const ctx = await (w <= 430 ? wk : b).newContext(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: 844 } }) : { viewport: { width: w, height: 1000 } }); return ctx.newPage(); };
const VEN = ['bkk-dior', 'bkk-lvcafe', 'bkk-cafecraft', 'bkk-firefly', 'bkk-siamparagon', 'vte-camon', 'vte-lecafe', 'vte-selene', 'vte-ongteu'];

{ const p = await page(1440); await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const G = window.SIYL_EXP_GALLERY, X = window.SIYL_EXP;
    const cards = [...document.querySelectorAll('[data-rails] .aslide, .aslide')].map((c) => (c.getAttribute('data-id') || '') + '|' + ((c.querySelector('img') || {}).getAttribute ? c.querySelector('img').getAttribute('src') : ''));
    return { n: X.length, ids: X.map((x) => x.id), cards: cards.filter((c) => /dior|lvcafe|cafecraft|siamparagon|firefly|camon|lecafe|selene|ongteu/.test(c)), frames: Object.keys(G).length };
  });
  note('two-cafe-cards', !r.ids.includes('bkk-diorlv') && r.ids.includes('bkk-dior') && r.ids.includes('bkk-lvcafe') && r.n === 51, JSON.stringify({ n: r.n, cards: r.cards }));
  await p.screenshot({ path: OUT + '/1440-experiences.png', fullPage: false }); await p.context().close(); }

for (const w of [390, 1440]) for (const id of VEN) {
  const p = await page(w); await p.goto(O + '/experience.html?id=' + id, { waitUntil: 'load' }); await p.waitForTimeout(1000);
  const r = await p.evaluate(async (id) => { const srcs = [...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src).filter((s) => /\/experiences\//.test(s));
    const bad = []; for (const s of [...new Set(srcs)]) { const res = await fetch(s, { method: 'HEAD' }); if (res.status !== 200) bad.push(s + ':' + res.status); }
    const own = [...new Set(srcs)].filter((s) => !s.includes('/' + id + '-'));
    return { n: [...new Set(srcs)].length, bad, foreign: own, title: (document.querySelector('h1') || {}).innerText || '' }; }, id);
  note('venue-media-' + id + '-' + w, r.n >= 2 && r.bad.length === 0 && r.foreign.length === 0, JSON.stringify(r));
  await p.screenshot({ path: OUT + '/' + w + '-' + id + '.png', fullPage: false }); await p.context().close();
}
await b.close(); await wk.close();
fs.writeFileSync(OUT + '/media-proof.json', JSON.stringify(R, null, 2));
const bad = R.filter((r) => !r.ok); console.log(bad.length ? 'FAILED: ' + bad.map((r) => r.id).join(', ') : 'ALL ' + R.length + ' checks passed');
process.exit(bad.length ? 1 : 0);
