/* ============================================================================
   THE RENDERED WORDS ON BOTH LIVE ORIGINS (Owner, 16 Sep 2026) — a guest signs in
   with their own code (never printed) and the page words are read from the DOM:
   the Sathorn Penthouse (5 rooms · 10 places available, Room A "Reserved ·
   Bride & Groom", no Room G, the Choose button live), the Souphattra
   Presidential and the Kunming Solarium (RESERVED, the button disabled and
   reading "Reserved"), the Grand Majestic row on the journeys page (Reserved ·
   Family, no link). Read-only: nothing is booked.
     node docs/acceptance/2026-09-16-inventory/walk.mjs <origin> <outDir> <tag>
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = process.argv[2].replace(/\/$/, ''), OUT = process.argv[3], TAG = process.argv[4] || 'origin'; fs.mkdirSync(OUT, { recursive: true });
const GUEST = process.env.GUEST || 'G001';
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = (id) => { const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code for ' + id); return r[5]; };
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
await page.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 15000 }); await page.fill('.siyl-inv input', tok(GUEST)); await page.click('.siyl-inv .igo');
await page.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 20000 });
const room = async (stay, slug, win) => {
  await page.goto(O + '/room.html?stay=' + stay + '&room=' + slug, { waitUntil: 'load' });
  await page.waitForFunction((w) => { const av = document.querySelector('[data-av="' + w + '"]'); return !!(av && !av.hidden && av.textContent.trim()); }, win, { timeout: 20000 });
  return page.evaluate((w) => {
    const av = document.querySelector('[data-av="' + w + '"]'), box = document.querySelector('[data-rooms-box="' + w + '"]'), btn = document.querySelector('[data-win]');
    const units = box ? [...box.querySelectorAll('[data-unit]')].map((u) => ({ label: u.getAttribute('data-unit'), state: (u.querySelector('.p-unit-who') || u).textContent.replace(/\s+/g, ' ').trim().slice(0, 80), reserved: u.hasAttribute('data-reserved'), free: u.getAttribute('data-free'), choose: !!u.querySelector('button:not([disabled])') })) : null;
    return { av: av.textContent.trim(), btn: btn ? btn.textContent.trim() : null, disabled: btn ? btn.disabled : null, units, html: box ? box.innerHTML.length : 0 };
  }, win);
};
const p = await room('sathorn', 'penthouse', 'bkk-stay');
await page.screenshot({ path: path.join(OUT, TAG + '-penthouse.png'), fullPage: false });
note('penthouse-words', p.av === '5 rooms · 10 places available', p.av);
note('penthouse-rooms', p.units && p.units.length === 6 && p.units.map((u) => u.label).join('') === 'ABCDEF', JSON.stringify(p.units && p.units.map((u) => u.label)));
note('penthouse-A-reserved', p.units && p.units[0].reserved && /Reserved · Bride & Groom/.test(p.units[0].state) && !p.units[0].choose, JSON.stringify(p.units && p.units[0]));
note('penthouse-B-open', p.units && !p.units[1].reserved && p.units[1].choose && p.units[1].free === '2', JSON.stringify(p.units && p.units[1]));
note('penthouse-cta', p.disabled === false && !/Fully|Reserved/.test(p.btn), p.btn);
const pr = await room('souphattra', 'souphattra-presidential', 'wedstay');
await page.screenshot({ path: path.join(OUT, TAG + '-presidential.png'), fullPage: false });
note('presidential-words', pr.av === 'Reserved · Bride & Groom' && pr.disabled === true && pr.btn === 'Reserved', JSON.stringify({ av: pr.av, btn: pr.btn, disabled: pr.disabled }));
note('presidential-room', pr.units && pr.units.length === 1 && pr.units[0].reserved && !pr.units[0].choose, JSON.stringify(pr.units));
const so = await room('kunming', 'solarium', 'kmg');
note('solarium-words', so.av === 'Reserved · Bride & Groom' && so.disabled === true && so.btn === 'Reserved', JSON.stringify({ av: so.av, btn: so.btn }));
const gm = await room('souphattra', 'grand-majestic', 'prewed');
note('grand-majestic-words', gm.av === 'Reserved · Family' && gm.disabled === true && gm.btn === 'Reserved' && gm.units && gm.units.length === 2 && gm.units.every((u) => u.reserved && !u.choose), JSON.stringify({ av: gm.av, btn: gm.btn, units: gm.units }));
/* the journeys page rows */
await page.goto(O + '/journeys.html', { waitUntil: 'load' });
await page.waitForFunction(() => document.querySelectorAll('.vav').length > 5, null, { timeout: 20000 });
const j = await page.evaluate(() => [...document.querySelectorAll('a[href*="room="]')].filter((a) => a.querySelector('.vav')).map((a) => ({ href: a.getAttribute('href').replace(/.*room=/, ''), av: a.querySelector('.vav').textContent.trim(), gone: a.classList.contains('gone'), aria: a.getAttribute('aria-disabled') })));
const jp = j.find((x) => x.href === 'penthouse'), jpr = j.filter((x) => x.href === 'souphattra-presidential'), jgm = j.filter((x) => x.href === 'grand-majestic');
note('journeys-penthouse', jp && jp.av === '5 rooms · 10 places available' && !jp.gone, JSON.stringify(jp));
note('journeys-presidential', jpr.length > 0 && jpr.every((x) => x.av === 'Reserved · Bride & Groom' && x.gone && x.aria === 'true'), JSON.stringify(jpr));
note('journeys-grand-majestic', jgm.length > 0 && jgm.every((x) => x.av === 'Reserved · Family' && x.gone), JSON.stringify(jgm));
await page.screenshot({ path: path.join(OUT, TAG + '-journeys.png'), fullPage: false });
await browser.close();
fs.writeFileSync(path.join(OUT, TAG + '-walk.json'), JSON.stringify({ at: new Date().toISOString(), origin: O, guest: GUEST, results: R }, null, 1));
console.log(R.every((x) => x.ok) ? 'WALK ' + TAG + ': PASS' : 'WALK ' + TAG + ': FAIL');
process.exit(R.every((x) => x.ok) ? 0 : 1);
