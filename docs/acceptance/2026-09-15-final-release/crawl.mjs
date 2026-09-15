/* FINAL RELEASE · public release check of one origin (Owner, 15 Sep 2026, sections H + I).
     node docs/acceptance/2026-09-15-final-release/crawl.mjs <origin> <out.json> [READER=G049]
   Read-only. Crawls every public route from index.html (room / experience / transport routes with
   their ids), then every guest-area page signed in as the READER identity (a GET-only session — any
   write request fails the run), and checks: HTTP failures, broken images, missing anchors, console /
   page errors, retired strings on rendered text, retired / private routes, and secret exposure over
   every same-origin response body (the 47 access codes, their bearers, the GR token, any 64-hex
   outside the auth index, any non-host guest's full name on a public page). Never prints a code. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const { bearerOf } = await import(path.join(ROOT, 'register/crypto.mjs'));
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const OUT = process.argv[3] || null;
const READER = process.env.READER || 'G049';
const API = ORIGIN.includes('github.io') ? 'https://seeyouinlaos-website.suthep-hrg.workers.dev' : ORIGIN;
const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], token: c[5], status: c[7] }; });
const codes = rows.filter((r) => r.status === 'ACTIVE').map((r) => r.token);
const bearers = await Promise.all(codes.map(bearerOf));
const gr = fs.existsSync(path.join(ROOT, 'src/gr-token.private.txt')) ? fs.readFileSync(path.join(ROOT, 'src/gr-token.private.txt'), 'utf8').trim() : '';
const list = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/guestlist.private.json'), 'utf8'));
const nonHostNames = list.filter((p) => !p.hosts).flatMap((p) => p.guests.map((g) => g.fullName)).filter((n) => n && n.split(' ').length > 1);
const indexKeys = new Set(Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'register/auth-index.json'), 'utf8')).entries));
const RETIRED = /\bSWITCH\b|Continuing as|Answering for|WHO ARE YOU|Reserved for bride|Reserved for the family|yours to choose|held for you|Alms Giving Ceremony|answeringFor|chooseIdentity|\b08:00\b|\b16:30\b|SYL-TC-|Wat Ong Teu · 28 February|WEDDING · TEMPLE|C86 · Kunming → Lijiang[\s\S]{0,160}USD 105/i;

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } });
const p = await ctx.newPage();
const bodies = [];            /* {url, text} of every same-origin text response */
const failures = [], consoleErrors = [], writes = [];
let current = '';
p.on('response', async (r) => {
  const u = r.url(); if (!u.startsWith(ORIGIN) && !u.startsWith(API)) return;
  if (r.status() >= 400 && !/\/api\/(status|rooms|seating)/.test(u)) failures.push({ page: current, url: u.replace(ORIGIN, ''), status: r.status() });
  const ct = r.headers()['content-type'] || '';
  if (/text|json|javascript|svg|xml/.test(ct) && r.status() < 300) { try { bodies.push({ url: u, text: await r.text() }); } catch (e) {} }
});
const aborted = [];   /* a request the page itself abandoned (re-render, navigation) is verified by a plain fetch afterwards */
p.on('requestfailed', (r) => { const u = r.url(); if (!u.startsWith(ORIGIN) || /favicon/.test(u)) return; const why = (r.failure() || {}).errorText || ''; if (/ERR_ABORTED/.test(why)) aborted.push({ page: current, url: u }); else failures.push({ page: current, url: u.replace(ORIGIN, ''), status: 'FAILED ' + why }); });
p.on('request', (q) => { if (/\/api\//.test(q.url()) && !['GET', 'OPTIONS', 'HEAD'].includes(q.method())) writes.push(q.method() + ' ' + new URL(q.url()).pathname + ' on ' + current); });
p.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) consoleErrors.push({ page: current, text: m.text().slice(0, 200) }); });
p.on('pageerror', (e) => consoleErrors.push({ page: current, text: 'PAGEERROR ' + e.message.slice(0, 200) }));

const pages = [], imgOk = new Set();
async function visit(rel, signedIn) {
  current = rel;
  const resp = await p.goto(ORIGIN + '/' + rel, { waitUntil: 'networkidle' }).catch((e) => ({ status: () => 'ERR ' + e.message }));
  await p.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 25)); } window.scrollTo(0, 0); }).catch(() => {});
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'));
    const ids = new Set([...document.querySelectorAll('[id]')].map((e) => e.id));
    const missing = links.filter((h) => h && h.startsWith('#') && h.length > 1 && !ids.has(h.slice(1)));
    const imgs = [...document.images].filter((i) => i.getAttribute('src') && (!i.complete || i.naturalWidth === 0)).map((i) => i.getAttribute('src'));
    return { links, missing, title: document.title, brokenImgs: imgs, text: document.body.innerText.replace(/\s+/g, ' '), html: document.documentElement.outerHTML };
  }).catch(() => ({ links: [], missing: [], title: '', brokenImgs: [], text: '', html: '' }));
  const retired = (info.text.match(RETIRED) || [])[0] || null;
  /* an image not yet decoded (lazy, off-screen, behind a gallery reveal) is broken only if its file is not served */
  const broken = [];
  for (const src of info.brokenImgs) { if (imgOk.has(src)) continue; const u = /^https?:/.test(src) ? src : ORIGIN + '/' + src.replace(/^\.?\//, ''); const r = await fetch(u).catch(() => null); if (r && r.status === 200 && /image/.test(r.headers.get('content-type') || '')) imgOk.add(src); else broken.push(src + ' → ' + (r ? r.status : 'unreachable')); }
  pages.push({ page: rel, signedIn: !!signedIn, status: resp.status(), title: info.title, brokenImgs: broken, undecodedImgs: info.brokenImgs.length, missingAnchors: info.missing, retired, textHash: hash(info.text), textLength: info.text.length });
  bodies.push({ url: ORIGIN + '/' + rel + ' (rendered)', text: info.html });
  return info;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16); }
const KEEP_QUERY = /^(room|experience|transport)\.html$/;
const norm = (h) => { const clean = h.split('#')[0].replace(/^\.\//, '').replace(/^\//, ''); const [file, q] = clean.split('?'); const f = file === '' ? 'index.html' : (/\.html$/.test(file) ? file : (/\/$/.test(file) ? file + 'index.html' : (/\./.test(file) ? null : file + '.html'))); if (!f) return null; return KEEP_QUERY.test(f) && q ? f + '?' + q.split('&').filter((x) => /^id=/.test(x)).join('&') : f; };

/* 1 · the public site, no session */
const seen = new Set(), queue = ['index.html'];
while (queue.length) {
  const rel = queue.shift(); if (seen.has(rel)) continue; seen.add(rel);
  const info = await visit(rel, false);
  for (const h of info.links) { if (!h || h.startsWith('#') || /^(mailto|tel|javascript|https?):/.test(h)) continue; const t = norm(h); if (t && !seen.has(t)) queue.push(t); }
}
const publicPages = pages.length;
/* public pages carry no non-host guest's full name and no retired string */
const nameLeaks = [];
for (const pg of pages) { /* re-read rendered text from bodies */ }
for (const bd of bodies.filter((x) => / \(rendered\)$/.test(x.url))) for (const n of nonHostNames) if (bd.text.includes(n)) nameLeaks.push({ page: bd.url.replace(ORIGIN + '/', '').replace(' (rendered)', ''), name: '<a non-host guest full name>' });

/* 2 · the guest area, signed in as READER (GET only) */
const reader = rows.find((r) => r.guestId === READER && r.status === 'ACTIVE');
current = 'invitation.html?open=1';
await p.goto(ORIGIN + '/invitation.html?open=1', { waitUntil: 'networkidle' });
await p.waitForSelector('.siyl-inv input', { timeout: 10000 });
await p.fill('.siyl-inv input', reader.token); await p.click('.siyl-inv .igo');
await p.waitForFunction((g) => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId === g && a.bearer); } catch (e) { return false; } }, READER, { timeout: 15000 });
await p.waitForTimeout(500);
const AUTH_PAGES = ['invitation.html', 'your-journey.html', 'journeys.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html', 'room.html?id=wedstay/heritage', 'room.html?id=bkk-stay/penthouse', 'room.html?id=kmg/light-french', 'room.html?id=ljg/snow-mountain-viewing', 'transport.html?id=c86', 'experience.html?id=bkk-suhring', 'experiences.html'];
const authSeen = new Set();
const q2 = [...AUTH_PAGES];
while (q2.length) {
  const rel = q2.shift(); if (authSeen.has(rel)) continue; authSeen.add(rel);
  const info = await visit(rel, true);
  for (const h of info.links) { if (!h || h.startsWith('#') || /^(mailto|tel|javascript|https?):/.test(h)) continue; const t = norm(h); if (t && !authSeen.has(t) && !seen.has(t)) q2.push(t); }
}
const bagAfter = await p.evaluate(() => localStorage.getItem('siyl.bag'));
current = 'sign-out';
await p.goto(ORIGIN + '/review.html', { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(400);
await p.evaluate(() => { const b = document.querySelector('[data-leave="out"]'); if (b) b.click(); else window.SIYL_PREP.leave('out'); }).catch(() => {});
await p.waitForLoadState('networkidle').catch(() => {}); await p.waitForTimeout(500);
const signedOut = await p.evaluate(() => !localStorage.getItem('siyl.auth'));

for (const x of aborted) { const r = await fetch(x.url).catch(() => null); if (!r || r.status !== 200) failures.push({ page: x.page, url: x.url.replace(ORIGIN, ''), status: 'ABORTED, then ' + (r ? r.status : 'unreachable') }); }
/* 3 · retired and private routes */
const routes = [];
const probe = async (u, want, label) => { const r = await fetch(ORIGIN + '/' + u, { redirect: 'manual' }); const ok = want(r.status, r.headers.get('location') || ''); routes.push({ route: u, status: r.status, ok, label }); };
const gone = (s) => s === 404 || s === 302 || s === 301 || s === 410;
for (const u of ['src/worker.js', 'src/rooms.js', 'src/guestlist.private.json', 'src/invitation-tokens.private.csv', 'src/gr-token.private.txt', 'src/invitation-distribution.private.csv', 'test/sandbox.mjs', 'docs/review/007-final-source-truth-audit.txt', 'wrangler.jsonc', 'package.json', '.dev.vars', '.git/config', 'journey/index.html', 'assets/inventory.js', 'register/app.mjs', 'register/data.mjs', 'register/logic.mjs', 'README.md']) await probe(u, gone, 'not served');
await probe('register/', (s, l) => s === 302 ? /invitation\.html$/.test(l) : s === 200, 'forwarder to invitation.html');
{ const r = await fetch(API + '/api/inventory'); routes.push({ route: 'api/inventory (' + API.replace(/^https?:\/\//, '') + ')', status: r.status, ok: r.status === 410, label: 'retired ledger answers 410' }); }
for (const u of ['documents.html', 'you.html', 'register-landing.html']) { const r = await fetch(ORIGIN + '/' + u); const t = await r.text(); const fwd = r.status === 200 && /http-equiv="refresh"/.test(t) && /(invitation|your-journey|about-you)\.html/.test(t); routes.push({ route: u, status: r.status, ok: fwd || (u === 'register-landing.html' && r.status === 404), label: u === 'register-landing.html' ? 'forwarder on the mirror, not served on the Worker' : 'forwarder' }); }
for (const u of ['register/crypto.mjs', 'register/auth-index.json', 'register/invitations.enc.json']) await probe(u, (s) => s === 200, 'served (the accepted product needs it)');

/* 4 · secret exposure over every body seen */
const exposure = [];
for (const bd of bodies) {
  const short = bd.url.replace(ORIGIN, '').replace(API, '');
  for (const c of codes) if (bd.text.includes(c)) exposure.push({ where: short, what: 'ACCESS CODE' });
  for (const h of bearers) if (bd.text.includes(h)) exposure.push({ where: short, what: 'BEARER' });
  if (gr && bd.text.includes(gr)) exposure.push({ where: short, what: 'GR TOKEN' });
  if (!/auth-index\.json/.test(short)) for (const m of bd.text.matchAll(/\b[a-f0-9]{64}\b/g)) if (!indexKeys.has(m[0])) exposure.push({ where: short, what: '64-hex' });
  if (/siyl\.auth"\s*:\s*\{|"bearer"\s*:\s*"[a-f0-9]{64}"/.test(bd.text)) exposure.push({ where: short, what: 'session-shaped JSON' });
}
const uniq = (a) => [...new Map(a.map((x) => [JSON.stringify(x), x])).values()];
const result = { origin: ORIGIN, at: new Date().toISOString(), reader: READER, publicPages, authPages: pages.length - publicPages, pages, failures: uniq(failures), consoleErrors: uniq(consoleErrors), writes, nameLeaks: uniq(nameLeaks), routes, exposure: uniq(exposure), bodiesScanned: bodies.length, bagAfter, signedOut,
  totals: { pages: pages.length, httpFailures: uniq(failures).length, brokenImgs: pages.reduce((n, x) => n + x.brokenImgs.length, 0), missingAnchors: pages.reduce((n, x) => n + x.missingAnchors.length, 0), consoleErrors: uniq(consoleErrors).length, retired: pages.filter((x) => x.retired).length, badRoutes: routes.filter((x) => !x.ok).length, exposure: uniq(exposure).length, writes: writes.length, nameLeaks: uniq(nameLeaks).length, non200: pages.filter((x) => x.status !== 200).length } };
if (OUT) fs.writeFileSync(OUT, JSON.stringify(result, null, 2));
console.log('ORIGIN ' + ORIGIN + ' · pages ' + result.totals.pages + ' (public ' + publicPages + ' · guest area ' + result.authPages + ') · bodies scanned ' + bodies.length);
for (const [k, v] of Object.entries(result.totals)) console.log('  ' + k.padEnd(16) + v);
for (const f of result.failures) console.log('  FAIL ' + f.status + ' ' + f.url + ' (on ' + f.page + ')');
for (const c of result.consoleErrors) console.log('  CONSOLE ' + c.page + ': ' + c.text);
for (const x of pages.filter((x) => x.status !== 200 || x.brokenImgs.length || x.missingAnchors.length || x.retired)) console.log('  PAGE ' + x.page + ' → ' + x.status + (x.brokenImgs.length ? ' broken imgs ' + x.brokenImgs.join(',') : '') + (x.missingAnchors.length ? ' anchors ' + x.missingAnchors.join(',') : '') + (x.retired ? ' RETIRED "' + x.retired + '"' : ''));
for (const r of routes.filter((x) => !x.ok)) console.log('  ROUTE ' + r.route + ' → ' + r.status + ' (expected: ' + r.label + ')');
for (const e of result.exposure) console.log('  EXPOSURE ' + e.what + ' in ' + e.where);
for (const w of writes) console.log('  WRITE ' + w);
for (const n of result.nameLeaks) console.log('  NAME on public page ' + n.page);
console.log('  signed out: ' + signedOut + ' · reader bag after: ' + (bagAfter === null ? 'none' : 'present'));
await b.close();
const bad = Object.entries(result.totals).filter(([k, v]) => k !== 'pages' && v > 0);
console.log(bad.length ? 'RESULT: ' + bad.map(([k, v]) => k + '=' + v).join(' ') : 'RESULT: CLEAN');
process.exit(bad.length ? 1 : 0);
