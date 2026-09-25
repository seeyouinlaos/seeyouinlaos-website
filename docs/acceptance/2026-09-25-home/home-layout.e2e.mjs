/* THE FIRST PAGE AS ONE SYSTEM — rendered acceptance (Owner, 25 Sep 2026). EN and TH, Chromium at every supported width and
   ±1 around each breakpoint touched, WebKit at the representative ones: no horizontal overflow; from 768 px the hero's frame
   closes exactly on the header's inner edges (the content wall, symmetric); the headline and every visible line of the page
   inside the wall; the hero's dots on the picture.
     node docs/acceptance/2026-09-25-home/home-layout.e2e.mjs [base URL]      (default: the local stage) */
import { chromium, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = process.argv[2] || 'http://127.0.0.1:8788';
const WIDTHS = [320, 360, 375, 390, 430, 599, 600, 601, 744, 767, 768, 769, 820, 834, 899, 900, 901, 1024, 1133, 1180, 1194, 1199, 1200, 1201, 1280, 1366, 1440, 1680, 1920, 2560];
const hOf = (w) => ({ 1024: 1366, 1133: 744, 1180: 820, 1194: 834, 820: 1180, 834: 1194, 744: 1133, 768: 1024 })[w] || (w < 700 ? 844 : w < 1100 ? 1180 : w < 1500 ? 900 : w < 2000 ? 1050 : 1440);
let fails = 0, checks = 0;
for (const [en, eng, widths] of [['chromium', chromium, WIDTHS], ['webkit', webkit, [320, 375, 390, 768, 834, 1024, 1180, 1194, 1366, 1440, 1920]]]) {
  const b = await eng.launch();
  for (const w of widths) for (const lang of ['en', 'th']) {
    const ctx = await b.newContext({ viewport: { width: w, height: hOf(w) } }); await ctx.addInitScript((l) => localStorage.setItem('siyl.lang', l), lang);
    const p = await ctx.newPage(); await p.goto(O + '/index.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 300)); });
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s); const R = (el) => el.getBoundingClientRect();
      const hero = q('.a-hero-frame .am'), bag = q('header.hd .bag, header.hd a[href*="cart"]'), lede = q('.a-lede h2'), h1 = q('.a-hero h1'), dots = q('.a-hero-dots');
      const hr = R(hero), wallR = Math.round(R(q('header.hd .bag')).right), wallL = innerWidth - wallR;   /* the header's inner edges, symmetric */
      /* every visible text line inside the content wall (scrollers and fixed layers excepted) */
      const outs = []; const tw = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT); let n;
      const inScroller = (el) => { for (let x = el; x && x.tagName !== 'MAIN'; x = x.parentElement) { const cs = getComputedStyle(x); if (/(auto|scroll)/.test(cs.overflowX) || cs.position === 'fixed' || (cs.overflowX === 'hidden' && x.getBoundingClientRect().width <= 2)) return true; } return false; };
      while ((n = tw.nextNode())) { if (!/\S/.test(n.data)) continue; const el = n.parentElement; if (!el || el.offsetParent === null || el.closest('[aria-hidden="true"]')) continue; const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (!b.width) continue; if ((b.left < wallL - 2 || (wallR && b.right > wallR + 2)) && !inScroller(el)) outs.push(n.data.trim().slice(0, 30) + '@' + Math.round(b.left) + '-' + Math.round(b.right)); }
      const dr = dots ? R(dots) : null;
      return { vw: innerWidth, over: document.documentElement.scrollWidth > innerWidth, hero: [Math.round(hr.left), Math.round(hr.right), Math.round(hr.width), Math.round(hr.height)], wallL, wallR, h1: [Math.round(R(h1).left), Math.round(R(h1).right)], dotsIn: dr ? (dr.left >= hr.left && dr.right <= hr.right && dr.bottom <= hr.bottom + 1 && dr.top >= hr.top) : null, outs: outs.slice(0, 3), aspect: +(hr.width / hr.height).toFixed(3) };
    });
    checks++;
    const narrow = w < 768;
    const bad = [r.over && 'overflow', (!narrow && Math.abs(r.hero[0] - r.wallL) > 1) && 'hero left ' + r.hero[0] + ' vs wall ' + r.wallL, (!narrow && r.wallR && Math.abs(r.hero[1] - r.wallR) > 1) && 'hero right ' + r.hero[1] + ' vs wall ' + r.wallR, (r.h1[0] < r.wallL - 1 || (r.wallR && r.h1[1] > r.wallR + 1)) && 'headline outside', r.dotsIn === false && 'dots outside the picture', r.outs.length && 'text outside ' + r.outs.join(' | '), r.hero[0] <= 0 && 'full bleed'].filter(Boolean);
    if (bad.length) { fails++; console.log('FAIL', en, w, lang, bad.join('; ')); }
    else if (lang === 'en' && [390, 768, 1024, 1366, 1440, 1920].includes(w)) console.log('ok', en, w, JSON.stringify({ hero: r.hero, aspect: r.aspect, wall: [r.wallL, r.wallR] }));
    await ctx.close();
  }
  await b.close();
}
console.log('checks', checks, 'fails', fails); process.exit(fails ? 1 : 0);
