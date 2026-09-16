/* 004 · PUBLIC / PRIVATE ACCESS AUDIT (Owner, 16 Sep 2026 — the final information architecture).
   Renders every route of the release crawl in a real browser, signed out, and counts what a visitor can see or do:
   amounts of the journey (USD …), private actions (add · remove · cancel · change · choose · a fare class),
   live inventory (places available · Room A … · fully booked), and whether a private route was reached by its
   direct address. Then the same routes signed in as a read-only fixture (GUEST, default G001): the private
   fragments are back, the way in is gone. No write is made; no code is printed.
     node docs/acceptance/2026-09-16-public-private/leak-audit.mjs <origin> [crawl.json] [out.json] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const O = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
const crawl = JSON.parse(fs.readFileSync(process.argv[3] || path.join(ROOT, 'docs/acceptance/2026-09-16-access/crawl-worker.json'), 'utf8'));
const OUT = process.argv[4] || null;
const urls = [...new Set(crawl.pages.map((p) => p.page.replace(/^https?:\/\/[^/]+\//, '')))];
const PRIVATE = /^(your-journey|cart|tickets|room|transport|wedding|wedding-preparation|about-you|review)(\.html)?(\?|#|$)/;
const GUEST = process.env.GUEST || 'G001';
const tok = (id) => { const rows = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map((l) => l.split(',')); const r = rows.find((x) => x[0] === id); if (!r || !r[5]) throw new Error('no code for ' + id); return r[5]; };
const SCAN = () => {
  const vis = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
  const text = document.body.innerText;
  const prices = text.match(/USD\s?[\d,]+/g) || [];
  const ctl = [...document.querySelectorAll('button, a, [role=button], input[type=radio], select')].filter(vis).map((e) => (e.textContent || e.value || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ')).filter(Boolean);
  const actions = ctl.filter((t) => /^(add|add to (your )?journey|remove|cancel|change|book|select|choose|reserve)\b/i.test(t) || /\b(business|economy)\b/i.test(t));
  const avail = text.match(/\b(\d+ (places?|seats?|rooms?) (left|available)|places? available|fully booked|sold out|Room [A-F]\b|held by|no longer available)\b/gi) || [];
  return { landed: location.pathname.split('/').pop() + location.search, prices: prices.length, actions, avail: avail.length, wayIn: ctl.filter((t) => /^open your invitation$/i.test(t)).length, status: (document.querySelector('p[data-access]') || {}).textContent || '' };
};
const b = await chromium.launch();
async function run(ctx, signedIn) {
  const p = await ctx.newPage(); const rows = [];
  for (const u of urls) {
    try { await p.goto(O + '/' + u, { waitUntil: 'load', timeout: 20000 }); await p.waitForTimeout(700); } catch (e) { rows.push({ url: u, error: String(e.message).slice(0, 80) }); continue; }
    const r = await p.evaluate(SCAN);
    const priv = PRIVATE.test(u);
    const reached = !/^invitation/.test(r.landed) || (signedIn && /^invitation(\.html)?\?from=/.test(r.landed));   /* signed in, the readiness engine may ask for the first missing step — that is the private journey, not the gate */
    rows.push({ url: u, private: priv, ...r, bypass: !signedIn && priv && reached, leak: !signedIn && (r.prices > 0 || r.actions.length > 0 || r.avail > 0) });
  }
  await p.close(); return rows;
}
const outCtx = await b.newContext({ viewport: { width: 1280, height: 900 } });
const signedOut = await run(outCtx, false); await outCtx.close();
const inCtx = await b.newContext({ viewport: { width: 1280, height: 900 } }); const ip = await inCtx.newPage();
await ip.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await ip.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 8000 });
await ip.fill('.siyl-inv input', tok(GUEST)); await ip.click('.siyl-inv .igo');
await ip.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 15000 });
await ip.close();
const signedIn = await run(inCtx, true); await inCtx.close(); await b.close();
const leaks = signedOut.filter((r) => r.leak), bypass = signedOut.filter((r) => r.bypass), errs = signedOut.filter((r) => r.error);
for (const r of leaks) console.log('LEAK  ', r.url, '→', r.landed, 'USD×' + r.prices, JSON.stringify(r.actions.slice(0, 5)), 'avail×' + r.avail);
for (const r of bypass) console.log('BYPASS', r.url, '→', r.landed);
for (const r of errs) console.log('ERROR ', r.url, r.error);
const pubOut = signedOut.filter((r) => !r.private && !r.error), privOut = signedOut.filter((r) => r.private && !r.error);
const priceLeak = pubOut.reduce((n, r) => n + r.prices, 0), actionLeak = pubOut.reduce((n, r) => n + r.actions.length, 0), invLeak = pubOut.reduce((n, r) => n + r.avail, 0);
const inPriv = signedIn.filter((r) => r.private && !r.error), inPub = signedIn.filter((r) => !r.private && !r.error);
const summary = {
  origin: O, at: new Date().toISOString(), routes: urls.length, publicRoutes: pubOut.length, privateRoutes: privOut.length,
  signedOut: { priceLeak, privateActionLeak: actionLeak, privateInventoryLeak: invLeak, directUrlBypass: bypass.length, wayInOnPublicPages: pubOut.filter((r) => r.wayIn > 0).length, privateRoutesHandedOver: privOut.filter((r) => /^invitation/.test(r.landed)).length, statusNotSignedIn: signedOut.filter((r) => !r.error && /Not signed in/.test(r.status)).length },
  signedIn: { guest: GUEST, privateRoutesReached: inPriv.filter((r) => !/^invitation/.test(r.landed) || /^invitation(\.html)?\?from=/.test(r.landed)).length, privateRoutesWithAmounts: inPriv.filter((r) => r.prices > 0).length, publicPagesWithWayIn: inPub.filter((r) => r.wayIn > 0).length, statusSignedIn: signedIn.filter((r) => !r.error && /Signed in ·/.test(r.status)).length },
  errors: errs.length,
};
console.log(JSON.stringify(summary, null, 1));
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ summary, signedOut, signedIn }, null, 1));
const ok = priceLeak === 0 && actionLeak === 0 && invLeak === 0 && bypass.length === 0 && summary.signedOut.privateRoutesHandedOver === privOut.length && summary.signedIn.privateRoutesReached === inPriv.length && summary.signedIn.publicPagesWithWayIn === 0 && errs.length === 0;
console.log(ok ? 'PUBLIC / PRIVATE GATE: PASS' : 'PUBLIC / PRIVATE GATE: FAIL');
process.exit(ok ? 0 : 1);
