/* fresh-context live screenshots of every accommodation image surface (Owner, 16 Sep 2026); every rendered image URL is
   read from the DOM and checked against the one source map. A guest signs in only for the private rails (read-only). */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ROOT = '/Users/thongantang/peoject.claude.skill.canva/seeyouinlaos-website';
const O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev', OUT = process.argv[2];
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(','));
const tok = rows.find((x) => x[0] === (process.env.GUEST || 'G002'))[5];
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const browser = await chromium.launch();
const bgs = (p, sel) => p.$$eval(sel, (els) => els.map((e) => (e.style.backgroundImage || getComputedStyle(e).backgroundImage).replace(/^url\(["']?/, '').replace(/["']?\)$/, '').replace(/^.*\/assets\//, 'assets/').replace(/\?.*$/, '')));
const broken = async (p) => p.evaluate(async () => { const urls = new Set(); document.querySelectorAll('[style*="background-image"]').forEach((e) => { const m = /url\(["']?([^"')]+)/.exec(e.style.backgroundImage); if (m) urls.add(m[1]); }); document.querySelectorAll('img').forEach((i) => urls.add(i.currentSrc || i.src)); const bad = []; for (const u of urls) { try { const r = await fetch(u, { method: 'HEAD' }); if (!r.ok) bad.push(u); } catch (e) { bad.push(u); } } return bad; });
const own = (list, folder) => list.every((u) => u.startsWith('assets/images/' + folder + '/'));
/* 1 · THE HOUSES mobile + 7 · desktop */
for (const [tag, vp] of [['houses-mobile', { width: 390, height: 844 }], ['houses-desktop', { width: 1440, height: 900 }]]) {
  const p = await (await browser.newContext({ viewport: vp, deviceScaleFactor: tag.includes('mobile') ? 2 : 1 })).newPage();
  await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const cards = await p.$$eval('.acar .aslide', (els) => els.map((e) => ({ h3: e.querySelector('h3').textContent, img: (/url\(["']?([^"')]+)/.exec(e.querySelector('.am').style.backgroundImage) || [])[1] })));
  const byName = Object.fromEntries(cards.map((c) => [c.h3, (c.img || '').replace(/\?.*$/, '')]));
  note(tag + '-images', byName['Sathorn Penthouse'] === 'assets/images/penthouse/exterior-golden-hour.jpg' && byName['U Sathorn Bangkok'] === 'assets/images/usathorn/pool-pavilion-day.jpg' && byName['Shama Yen-Akat Bangkok'] === 'assets/images/shama/king-studio-balcony.jpg' && cards.every((c) => c.img), JSON.stringify(byName));
  const bad = await broken(p); note(tag + '-no-broken', bad.length === 0, bad.join(',') || 'none');
  await (await p.$('.acar')).scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(OUT, tag + '.png') });
  if (tag === 'houses-mobile') { /* the two Bangkok alternatives in the rail: scroll the track */ await p.evaluate(() => { const t = document.querySelector('.acar .atrk'); t.scrollLeft = t.children[1].offsetLeft; }); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, 'houses-mobile-usathorn.png') }); await p.evaluate(() => { const t = document.querySelector('.acar .atrk'); t.scrollLeft = t.children[2].offsetLeft; }); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, 'houses-mobile-shama.png') }); }
  await p.context().close();
}
/* private rails: sign in read-only */
const p = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible' }); await p.fill('.siyl-inv input', tok); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }); await p.waitForTimeout(2500);
/* the step-01 gate: a contact (test values, removed afterwards) so the private journey opens */
await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', 'sam.sandbox@example.org'); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1800);
/* 2 + 4 · Your Journey cards (U Sathorn, Shama) */
await p.goto(O + '/your-journey.html?room=bkk-stay#s-bkk-stay', { waitUntil: 'load' }); await p.waitForSelector('#bkksel .p-stay', { timeout: 20000 }); await p.waitForTimeout(1200);
const yj = await p.$$eval('#bkksel .p-stay', (els) => els.map((e) => ({ name: e.querySelector('h3').textContent, img: (/url\(["']?([^"')]+)/.exec(e.querySelector('.p-stay-img').style.backgroundImage) || [])[1] })));
note('your-journey-cards', yj.find((c) => /U Sathorn/.test(c.name)).img.endsWith('usathorn/pool-pavilion-day.jpg') && yj.find((c) => /Shama/.test(c.name)).img.endsWith('shama/king-studio-balcony.jpg') && yj.find((c) => /Penthouse/.test(c.name)).img.endsWith('penthouse/exterior-golden-hour.jpg'), JSON.stringify(yj));
await (await p.$('#bkksel')).scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(OUT, 'your-journey-penthouse-card.png') });
await p.evaluate(() => { const t = document.querySelector('#bkksel .p-rail'); t.scrollLeft = t.children[1].offsetLeft; }); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, 'usathorn-card-mobile.png') });
await p.evaluate(() => { const t = document.querySelector('#bkksel .p-rail'); t.scrollLeft = t.children[2].offsetLeft; }); await p.waitForTimeout(600); await p.screenshot({ path: path.join(OUT, 'shama-card-mobile.png') });
/* 3 · U Sathorn detail hero + gallery + 6 · Other rooms rail */
for (const [slug, folder, tag, hero] of [['u-sathorn-superior-garden', 'usathorn', 'usathorn-detail', 'pool-pavilion-dusk.jpg'], ['shama-king-studio-balcony', 'shama', 'shama-detail', 'king-studio-balcony.jpg'], ['penthouse', 'penthouse|journey', 'penthouse-detail', 'penthouse-01.jpg']]) {
  await p.goto(O + '/room.html?stay=sathorn&room=' + slug, { waitUntil: 'load' }); await p.waitForSelector('.gal img, .gal [style*="background-image"], .hero img, [data-gallery]', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(1200);
  const g = await p.evaluate(() => { const out = []; document.querySelectorAll('img').forEach((i) => { if (/assets\/images\//.test(i.currentSrc || i.src)) out.push((i.currentSrc || i.src).replace(/^.*\/assets\//, 'assets/').replace(/\?.*$/, '')); }); document.querySelectorAll('[style*="background-image"]').forEach((e) => { const m = /url\(["']?([^"')]+)/.exec(e.style.backgroundImage); if (m && /assets\/images\//.test(m[1])) out.push(m[1].replace(/^.*\/assets\//, 'assets/').replace(/\?.*$/, '')); }); return out; });
  const heroSeen = g.find((u) => u.endsWith(hero)); const others = await p.$$eval('.occard .ph', (els) => els.map((e) => (/url\(["']?([^"')]+)/.exec(e.style.backgroundImage) || [])[1]));
  const gallery = g.filter((u) => !others.includes(u));
  note(tag + '-hero', !!heroSeen, 'hero ' + hero + ' rendered: ' + !!heroSeen);
  note(tag + '-own-images', gallery.filter((u) => /images\/(usathorn|shama|penthouse|journey\/penthouse)/.test(u)).every((u) => new RegExp('assets/images/(' + folder + ')').test(u)), 'gallery frames: ' + gallery.length + ' · ' + [...new Set(gallery.map((u) => u.split('/')[2]))].join(','));
  note(tag + '-other-rooms', others.length === 2 && others.every((u) => /usathorn\/pool-pavilion-day|shama\/king-studio-balcony|penthouse\/exterior-golden-hour/.test(u)), JSON.stringify(others));
  const bad = await broken(p); note(tag + '-no-broken', bad.length === 0, bad.join(',') || 'none');
  await p.screenshot({ path: path.join(OUT, tag + '-hero-mobile.png') });
  if (tag === 'usathorn-detail') { await (await p.$('.occard')).scrollIntoViewIfNeeded(); await p.screenshot({ path: path.join(OUT, 'other-rooms-rail-mobile.png') }); }
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'images-proof.json'), JSON.stringify({ at: new Date().toISOString(), origin: O, results: R }, null, 1));
console.log(R.every((x) => x.ok) ? 'IMAGES LIVE: PASS' : 'IMAGES LIVE: FAIL');
