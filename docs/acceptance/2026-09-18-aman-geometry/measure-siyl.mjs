/* AMAN GEOMETRY · measure the CURRENT See You In Laos surfaces at a given CSS width (DOM rects + computed styles), on
   the isolated stage worker with a synthetic guest. Writes <out>/measure-siyl-<w>.json.
     node docs/acceptance/2026-09-18-aman-geometry/measure-siyl.mjs <scratchpad> <outDir> [390] */
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const O = (process.argv[5] || 'http://127.0.0.1:8788').replace(/\/$/, ''), N = process.argv[2], OUT = process.argv[3], W = parseInt(process.argv[4] || '390', 10); fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 1000 }, deviceScaleFactor: W <= 390 ? 2 : 1, isMobile: W <= 390, hasTouch: W <= 390 }); const p = await ctx.newPage();
const signInIfLocal = async () => { if (/127\.0\.0\.1|localhost/.test(O)) await signIn('T001'); };
const signIn = async (id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2000); };
const M = `(function (spec) {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { x: +b.left.toFixed(1), y: +(b.top + scrollY).toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), fs: cs.fontSize, lh: cs.lineHeight, ls: cs.letterSpacing, ff: cs.fontFamily.split(',')[0], fw: cs.fontWeight, pad: cs.padding, ml: cs.marginLeft, mr: cs.marginRight, mt: cs.marginTop, mb: cs.marginBottom, pos: cs.position, top: cs.top, text: (el.textContent || '').trim().slice(0, 40) }; };
  const out = { url: location.pathname + location.search, vw: innerWidth };
  for (const [k, sel] of Object.entries(spec)) { const el = document.querySelector(sel); out[k] = r(el); if (el && /IMG|PICTURE|VIDEO/.test(el.tagName)) { out[k].ratio = +(el.getBoundingClientRect().width / el.getBoundingClientRect().height).toFixed(2); } }
  return out;
})`;
const results = [];
const measure = async (label, url, spec, prep) => { await p.goto(O + '/' + url, { waitUntil: 'load' }); await p.waitForTimeout(1800); if (prep) await prep(); const m = await p.evaluate(M + '(' + JSON.stringify(spec) + ')'); m.label = label; results.push(m); };
/* public */
await measure('home', 'index.html', { header: 'header.hd', access: '.hd-access', main: 'main', firstImg: 'main img', firstEyebrow: 'main .a-eyebrow, main .eyebrow, main .kicker', firstTitle: 'main h1', firstBody: 'main p', destCard: '[class*="dest"] article, .a-rail .aslide, .acar .aslide, [data-carousel] > *', destCardImg: '.aslide img, [data-carousel] img', cta: 'main .a-cta, main .cta' });
await measure('the-journey', 'journeys.html', { header: 'header.hd', access: '.hd-access', h1: 'main h1', firstImg: 'main img', firstTitle: 'main h2', firstBody: 'main p', cta: 'main .cta, main .add, main .vw' });
await measure('stays', 'accommodation.html', { header: 'header.hd', access: '.hd-access', h1: 'main h1', firstImg: 'main img', card: '.aslide, .house, article', cardImg: '.aslide img, .house img, article img', cardTitle: '.aslide h3, .house h3, article h3', cardBody: '.aslide p, .house p, article p' });
await signInIfLocal();
await measure('room-detail', 'room.html?stay=souphattra&room=heritage', { header: 'header.hd', access: '.hd-access', hero: '.hero img, .gal img, main img', title: 'main h1', body: 'main p', price: '.price', cta: '.cta', otherCard: '.other .card, .rail .card, .orail .card, [class*="other"] article', otherImg: '.other img, .rail img, [class*="other"] img', otherTitle: '.other h3, .rail h3, [class*="other"] h3' });
/* private (the stage only — the live Worker holds the real register) */
if (!/127\.0\.0\.1|localhost/.test(O)) { fs.writeFileSync(path.join(OUT, 'measure-siyl-' + W + '.json'), JSON.stringify(results, null, 1)); for (const m of results) { console.log('## ' + m.label + ' ' + m.url); for (const [k, v] of Object.entries(m)) if (v && typeof v === 'object') console.log('  ' + k.padEnd(12), JSON.stringify(v).slice(0, 220)); } await b.close(); process.exit(0); }
await signIn('T001');
await measure('my-trip', 'your-journey.html', { header: 'header.hd', access: '.hd-access', bar: '.prep-bar', h1: 'main h1', stageCard: '.p-stay', stageImg: '.p-stay img', stageTitle: '.p-stay h3, .p-stay .t-h1', stageBody: '.p-stay .t-b2, .p-stay p', price: '.p-price', cta: '.p-stay .p-act, .p-act', label: '.t-l1', body1: '.t-b1', body2: '.t-b2' });
await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }; await fetch('/api/rooms/join', { method: 'POST', headers: h, body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', key: 'bkk-stay/u-sathorn-superior-garden', label: 'B', name: 'Ada' }) }); });
await measure('my-bag', 'cart.html', { header: 'header.hd', access: '.hd-access', h1: 'main h1', line: '.cart-line, .p-line', lineImg: '.cart-line img, .p-line img', lineTitle: '.cart-line h3, .p-line h3, .p-line .t-h1', lineBody: '.cart-line .t-b2, .p-line .t-b2', total: '.cart-total, .p-total, [data-total]', cta: '.p-act', jbar: '.jbar' });
await measure('review', 'review.html', { header: 'header.hd', access: '.hd-access', bar: '.prep-bar', h1: 'main h1', block: '.p-block', blockTitle: '.p-block-h h2', kv: '.p-kv', body: '.p-kv .t-b1', cta: '#send' });
await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const h = { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' }; await fetch('/api/rooms/leave', { method: 'POST', headers: h, body: JSON.stringify({ invitationId: 'INV-T001', guestId: 'T001', stage: 'bkk-stay' }) }); });
fs.writeFileSync(path.join(OUT, 'measure-siyl-' + W + '.json'), JSON.stringify(results, null, 1));
for (const m of results) { console.log('## ' + m.label + ' ' + m.url); for (const [k, v] of Object.entries(m)) if (v && typeof v === 'object') console.log('  ' + k.padEnd(12), JSON.stringify(v).slice(0, 220)); }
await b.close();
