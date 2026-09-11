/* FINAL RUN · accessibility audit of the public and private surfaces.
   Keyboard reach, focus visibility and return, ESC on layers, labels,
   aria-expanded, checkbox association, 44px targets, contrast, reduced
   motion, and that ownership is understandable in text. Read from the page. */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const ORIGIN = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || '.';
const TOKEN = process.env.SIYL_TOKEN || (() => { try { const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8'); const row = csv.split(/\r?\n/).find((l) => /INV-002/.test(l)); const m = row && row.match(/[a-z0-9]{16}/); return m ? m[0] : ''; } catch (e) { return ''; } })();
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const results = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
await page.route(WORKER + '/api/**', (route) => { const u = new URL(route.request().url()); const j = (b) => route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(b) }); if (u.pathname === '/api/status') return j({ ok: true, received: false, confirmed: false }); if (u.pathname.startsWith('/api/seating')) return j({ ok: true, open: false, frozen: false, configured: { ceremony: false, dinner: false }, mine: { ceremony: {}, dinner: {} } }); return j({ ok: true, items: {} }); });
const go = async (f, w = 390) => { await page.setViewportSize({ width: w, height: w < 800 ? 844 : 1000 }); await page.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await page.waitForTimeout(300); };
/* helpers evaluated in the page */
const audit = () => page.evaluate(() => {
  const out = { unlabeled: [], small: [], lowContrast: [], noExpanded: [], colourOnly: [], focusStyle: null };
  const lum = (rgb) => { const m = rgb.match(/\d+(\.\d+)?/g); if (!m) return null; const [r, g, b] = m.slice(0, 3).map((v) => { v = v / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = (el) => { const own = getComputedStyle(el).backgroundColor; if (own && !/rgba\(0, 0, 0, 0\)|transparent/.test(own)) return own; let e = el.parentElement; while (e) { if (getComputedStyle(e).backgroundImage !== 'none') return 'rgb(0, 0, 0)'; const bg = getComputedStyle(e).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) return bg; e = e.parentElement; } return 'rgb(243, 238, 231)'; };
  document.querySelectorAll('main button, main a[href], main input, main textarea, main select, .prep-bar button, header button, nav a').forEach((el) => {
    if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
    const r = (el.closest('label') || el).getBoundingClientRect(); if (!r.width || !r.height) return;
    const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || (el.labels && el.labels[0] && el.labels[0].textContent) || (el.id && document.querySelector('label[for="' + el.id + '"]') || {}).textContent || '').trim();
    if (!name) out.unlabeled.push(el.tagName + '.' + el.className);
    if (r.height < 43 && el.type !== 'checkbox' && el.tagName !== 'A') out.small.push(el.tagName + ' ' + Math.round(r.height) + 'px ' + name.slice(0, 24));
    if (el.tagName === 'A' && r.height < 24) out.small.push('A ' + Math.round(r.height) + 'px ' + name.slice(0, 24));
    if (el.hasAttribute('aria-controls') && !el.hasAttribute('aria-expanded')) out.noExpanded.push(name.slice(0, 24));
  });
  document.querySelectorAll('main p, main h1, main h2, main h3, main span, main button, main a, main label, main li').forEach((el) => {
    if (!el.offsetParent || getComputedStyle(el).position === 'absolute' || el.closest('.hero, .a-hero, .am, [style*="background-image"]')) return; const txt = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(''); if (!txt) return;
    const cs = getComputedStyle(el); const fg = lum(cs.color), bg = lum(bgOf(el)); if (fg == null || bg == null) return;
    const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05); const size = parseFloat(cs.fontSize); const bold = parseInt(cs.fontWeight) >= 700;
    const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
    if (ratio < need) out.lowContrast.push(el.tagName + ' ' + size + 'px ' + ratio.toFixed(2) + ' "' + txt.slice(0, 28) + '"');
  });
  const cb = document.querySelectorAll('input[type=checkbox]'); out.checkboxes = cb.length; out.checkboxesAssociated = [...cb].filter((c) => c.closest('label') || (c.labels && c.labels.length) || c.getAttribute('aria-label')).length;
  out.h1 = document.querySelectorAll('h1').length; out.lang = document.documentElement.lang; out.title = document.title;
  out.imgsNoAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).length;
  out.roleImgNoLabel = [...document.querySelectorAll('[role=img]')].filter((e) => !e.getAttribute('aria-label')).length;
  return out;
});
/* focus visibility: tab through the first 12 focusables and see whether the focused element has a visible ring/underline change */
const focusCheck = async () => { const seen = []; for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); const r = await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return null; const cs = getComputedStyle(e); return { tag: e.tagName, ol: (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || ((e.tagName === 'TEXTAREA' || e.tagName === 'INPUT') && cs.borderColor !== 'rgb(218, 217, 215)'), bs: cs.boxShadow !== 'none', name: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 20) }; }); if (r) seen.push(r); } return seen; };

/* ---- public pages */
for (const f of ['index.html', 'voyage.html', 'journeys.html', 'invitation.html']) {
  await go(f, 390); const a = await audit(); const fc = await focusCheck();
  note('a11y ' + f, a.unlabeled.length === 0 && a.lowContrast.length === 0 && a.imgsNoAlt === 0 && a.roleImgNoLabel === 0 && !!a.lang && fc.length > 3 && fc.every((x) => x.ol || x.bs), 'unlabeled ' + a.unlabeled.length + ' · low contrast ' + a.lowContrast.length + (a.lowContrast.length ? ' [' + a.lowContrast.slice(0, 3).join(' ; ') + ']' : '') + ' · imgs without alt ' + a.imgsNoAlt + ' · role=img without label ' + a.roleImgNoLabel + ' · lang ' + a.lang + ' · focus visible ' + fc.filter((x) => x.ol || x.bs).length + '/' + fc.length + ' · small ' + a.small.length + (a.small.length ? ' [' + a.small.slice(0, 3).join(' ; ') + ']' : '') + (a.unlabeled.length ? ' [' + a.unlabeled.slice(0, 3).join(' ; ') + ']' : ''));
}
/* menu layer: open with keyboard, ESC closes, focus returns */
await go('index.html', 390);
const menuBtn = page.locator('header button, .hd button').first();
if (await menuBtn.count()) {
  const label = await menuBtn.getAttribute('aria-label'); const expandedBefore = await menuBtn.getAttribute('aria-expanded');
  await menuBtn.focus(); await page.keyboard.press('Enter'); await page.waitForTimeout(400);
  const expandedAfter = await menuBtn.getAttribute('aria-expanded');
  const openVisible = await page.evaluate(() => document.body.classList.contains('a-open'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  const closed = await page.evaluate(() => !document.body.classList.contains('a-open'));
  const focusBack = await page.evaluate(() => document.activeElement && (document.activeElement.tagName === 'BUTTON'));
  note('a11y menu layer', !!label && (expandedBefore !== null) && expandedAfter === 'true' && openVisible && closed && focusBack, 'label "' + label + '" · aria-expanded ' + expandedBefore + '→' + expandedAfter + ' · ESC closes ' + closed + ' · focus returns ' + focusBack);
}
/* ---- private surfaces */
await go('invitation.html', 390); await page.evaluate(() => localStorage.clear()); await go('invitation.html', 390);
await page.click('#open'); await page.waitForSelector('.siyl-inv input', { state: 'visible' });
const codeLabel = await page.evaluate(() => { const i = document.querySelector('.siyl-inv input'); return i.getAttribute('aria-label') || (i.labels && i.labels[0] && i.labels[0].textContent) || i.placeholder || ''; });
note('a11y code field labelled', !!codeLabel, 'code input: "' + codeLabel + '"');
await page.fill('.siyl-inv input', TOKEN); await page.keyboard.press('Enter'); await page.waitForTimeout(600);
const viaEnter = await page.locator('.p-drawer:not([hidden])').count();
if (!viaEnter) { await page.click('.siyl-inv .igo'); await page.waitForSelector('.p-drawer:not([hidden])'); }
note('a11y code submits on Enter', viaEnter === 1, 'keyboard submission of the code');
const drawerA11y = await page.evaluate(() => { const d = document.querySelector('.p-drawer:not([hidden])'); return { role: d.getAttribute('role'), modal: d.getAttribute('aria-modal'), label: d.getAttribute('aria-label') || d.getAttribute('aria-labelledby'), focusInside: d.contains(document.activeElement) }; });
note('a11y who-are-you layer', drawerA11y.role === 'dialog' && drawerA11y.focusInside, JSON.stringify(drawerA11y));
const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
const P = G.find((g) => /peggy/i.test(g.preferredName)), Sg = G.find((g) => /steffie/i.test(g.preferredName));
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(300);
for (const f of ['your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) {
  await go(f, 390); const a = await audit(); const fc = await focusCheck();
  note('a11y ' + f, a.unlabeled.length === 0 && a.lowContrast.length === 0 && a.small.length === 0 && a.checkboxes === a.checkboxesAssociated && a.roleImgNoLabel === 0 && fc.every((x) => x.ol || x.bs), 'unlabeled ' + a.unlabeled.length + (a.unlabeled.length ? ' [' + a.unlabeled.slice(0, 3).join(' ; ') + ']' : '') + ' · low contrast ' + a.lowContrast.length + (a.lowContrast.length ? ' [' + a.lowContrast.slice(0, 3).join(' ; ') + ']' : '') + ' · small ' + a.small.length + (a.small.length ? ' [' + a.small.slice(0, 3).join(' ; ') + ']' : '') + ' · checkboxes ' + a.checkboxesAssociated + '/' + a.checkboxes + ' · focus visible ' + fc.filter((x) => x.ol || x.bs).length + '/' + fc.length);
}
/* the shell drawer (SWITCH): ESC closes, focus returns to the Switch button */
await go('about-you.html', 390);
await page.locator('.prep-bar [data-switch]').focus(); await page.keyboard.press('Enter'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
const inDrawer = await page.evaluate(() => document.querySelector('.p-drawer:not([hidden])').contains(document.activeElement));
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
const drawerClosed = (await page.locator('.p-drawer:not([hidden])').count()) === 0;
const focusReturn = await page.evaluate(() => !!(document.activeElement && document.activeElement.hasAttribute('data-switch')));
note('a11y switch layer', inDrawer && drawerClosed && focusReturn, 'focus moves in ' + inDrawer + ' · ESC closes ' + drawerClosed + ' · focus returns to Switch ' + focusReturn);
/* ownership in text, not colour */
const bar = await page.locator('.prep-bar').innerText();
await go('about-you.html?for=' + Sg.guestId, 390);
const bar2 = await page.locator('.prep-bar').innerText();
note('a11y ownership in words', /Continuing as Peggy/.test(bar) && /Answering for\s*Steffie/i.test(bar2.replace(/\n/g, ' ')), 'shell says who is continuing and who is answered for');
/* selection semantics: chosen product states are text, not colour alone */
await go('your-journey.html', 390);
const sel = await page.evaluate(() => [...document.querySelectorAll('[data-choose], [data-cls], [data-choose-flat]')].map((b) => ({ pressed: b.getAttribute('aria-pressed'), text: b.textContent.trim().slice(0, 20) })));
note('a11y selection semantics', sel.length > 0 && sel.every((s) => s.pressed !== null) || sel.every((s) => /Select|Selected|Chosen|Add|Remove/i.test(s.text)), sel.length + ' selectors · aria-pressed on ' + sel.filter((s) => s.pressed !== null).length + ' · text states on ' + sel.filter((s) => /Select|Selected|Chosen|Add|Remove/i.test(s.text)).length);
/* text resizing: 200% zoom equivalent (viewport 390 with 2x font) stays readable, no horizontal overflow */
await go('review.html', 390); await page.addStyleTag({ content: 'html{font-size:200%}' }); await page.waitForTimeout(200);
note('a11y text resize', !(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), 'no horizontal overflow at 200% root font size on review');
/* reduced motion */
const motionCss = await page.evaluate(async () => { const sheets = [...document.styleSheets]; let anim = 0, reduced = 0; for (const s of sheets) { try { for (const r of s.cssRules) { if (r.cssText.includes('transition') || r.cssText.includes('animation')) anim++; if (r.media && /prefers-reduced-motion/.test(r.media.mediaText)) reduced++; } } catch (e) {} } return { anim, reduced }; });
note('a11y reduced motion', motionCss.anim === 0 || motionCss.reduced > 0, 'animated rules ' + motionCss.anim + ' · reduced-motion blocks ' + motionCss.reduced);
fs.writeFileSync(path.join(OUT, 'a11y-results.json'), JSON.stringify(results, null, 2));
console.log(results.filter((r) => r.ok).length + '/' + results.length + ' a11y checks pass');
await browser.close();
