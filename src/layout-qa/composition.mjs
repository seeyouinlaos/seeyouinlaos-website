#!/usr/bin/env node
/* THE COMPOSITION AUDIT (Owner, 26 Sep 2026 · the grouped-media gap). Two individually valid photographs can still form an
 * invalid composition: a tablet held upright once stacked the duo (the map of Laos above the reclining Buddha) into two
 * full-wall blocks while every named width the layout audit sampled in that orientation passed — the audit had no rule for
 * a GROUP. The rule now lives in src/layout-qa/rules.js (section 9, run by every fast and full audit); this runner renders
 * the grouped media densely enough that a breakpoint gap cannot hide between samples:
 *   · every real breakpoint ±1, the named widths, and every 32 px from 560 to 1400
 *   · both orientations from 600 px to 1366 px (the stylesheets also branch on orientation), portrait below
 *   · Chromium + WebKit, English + Thai, only the routes that carry a group (src/layout-contract.cjs · groups)
 * and adds BREAKPOINT CONTINUITY: between two adjacent samples of one orientation, a group's height ÷ width may change by
 * at most its `continuity` factor. DOM geometry only — never pixels.
 *
 *   node src/layout-qa/composition.mjs [--origin URL] [--engines chromium,webkit] [--langs en,th] [--record]
 * Read-only against any origin (signed-out pages, nothing is written). --record writes
 * docs/acceptance/layout/LAST-COMPOSITION-AUDIT.json (gate L2 requires it on the current layout fingerprint). */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require('../layout-contract.cjs');
const core = require('./core.cjs');
const RULES = fs.readFileSync(path.join(ROOT, 'src/layout-qa/rules.js'), 'utf8');

/* the sample plan: pure, so the tests hold it */
export function samples() {
  const w = new Set(C.widths.named);
  for (const b of core.breakpoints()) for (const x of [b - 1, b]) if (x >= 320) w.add(x);
  for (let x = 560; x <= 1400; x += 32) w.add(x);
  const out = [];
  for (const x of [...w].sort((a, b) => a - b)) {
    if (x > 2560) continue;
    const portrait = x < 1024 ? Math.round(x * 1.33) : Math.round(x * 1.34);
    if (x < 600) out.push({ w: x, h: core.heightFor(x), o: 'portrait' });
    else if (x <= 1366) { out.push({ w: x, h: portrait, o: 'portrait' }); out.push({ w: x, h: Math.max(560, Math.round(x * 0.7)), o: 'landscape' }); }
    else out.push({ w: x, h: C.widths.defaultHeight, o: 'landscape' });
  }
  /* orientation-major, widths ascending: one load per orientation, continuity read along each series */
  return out.sort((a, b) => (a.o === b.o ? a.w - b.w : a.o === 'portrait' ? -1 : 1));
}
/* continuity between adjacent samples of one orientation (pure) */
export function continuity(series, factor) {
  const bad = [];
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i];
    if (!a.ratio || !b.ratio) continue;
    const f = Math.max(a.ratio, b.ratio) / Math.min(a.ratio, b.ratio);
    if (f > factor) bad.push({ from: a.w, to: b.w, o: b.o, factor: +f.toFixed(2), ratios: [a.ratio, b.ratio] });
  }
  return bad;
}

async function playwright() {
  for (const m of [process.env.PLAYWRIGHT_MODULE, 'playwright']) { if (!m) continue; try { return await import(m); } catch (e) { /* next */ } }
  return import(path.join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright', 'index.mjs'));
}

export async function audit({ origin = 'http://127.0.0.1:8788', engines = ['chromium', 'webkit'], langs = ['en', 'th'] } = {}) {
  const pw = await playwright();
  const plan = samples();
  const routes = [...new Set((C.groups || []).flatMap((g) => g.routes))];
  const violations = [], series = {}, out = { origin, engines, langs, routes, samples: plan.length, measurements: 0 };
  for (const engine of engines) {
    const b = await pw[engine].launch();
    for (const lang of langs) {
      const ctx = await b.newContext({ reducedMotion: 'reduce' });
      await ctx.addInitScript((l) => { try { localStorage.setItem('siyl.lang', l); } catch (e) { /* storage blocked */ } }, lang);
      const p = await ctx.newPage();
      for (const route of routes) {
        let loadedAt = null;
        for (const s of plan) {
          await p.setViewportSize({ width: s.w, height: s.h });
          /* orientation media queries and vh caps are decided at layout: a fresh load whenever the orientation flips */
          if (loadedAt !== s.o) { await p.goto(origin + route, { waitUntil: 'load', timeout: 45000 }); await p.waitForTimeout(500); loadedAt = s.o; }
          else await p.waitForTimeout(80);
          if (!(await p.evaluate(() => !!window.__LQA))) await p.addScriptTag({ content: RULES });
          const res = await p.evaluate((c) => window.__LQA.run(c, {}), C);
          out.measurements++;
          for (const v of res.violations.filter((x) => /^GROUP_/.test(x.type))) violations.push({ ...v, route, engine, lang, width: s.w, height: s.h, orientation: s.o });
          (res.geometry.groups || []).forEach((g, i) => {
            const k = [engine, lang, route, g.sel, i, s.o].join('|');
            (series[k] = series[k] || []).push({ w: s.w, o: s.o, ratio: g.w ? +(g.h / g.w).toFixed(3) : 0, h: g.h, gw: g.w });
          });
        }
      }
      await ctx.close();
    }
    await b.close();
  }
  for (const [k, list] of Object.entries(series)) {
    const [engine, lang, route, sel] = k.split('|');
    const g = C.groups.find((x) => x.sel === sel);
    for (const c of continuity(list, g.continuity)) violations.push({ type: 'GROUP_DISCONTINUITY', route, engine, lang, component: sel, width: c.to, orientation: c.o, expected: 'height ÷ width changes ≤ ×' + g.continuity + ' between adjacent samples', actual: c.from + ' → ' + c.to + ' px: ' + c.ratios.join(' → ') + ' (×' + c.factor + ')' });
  }
  out.violations = violations;
  out.fingerprint = core.fingerprint();
  return out;
}

if (import.meta.url === 'file://' + process.argv[1]) {
  const argv = process.argv.slice(2);
  const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
  const res = await audit({ origin: opt('origin', 'http://127.0.0.1:8788').replace(/\/$/, ''), engines: opt('engines', 'chromium,webkit').split(','), langs: opt('langs', 'en,th').split(',') });
  const byRoot = {};
  for (const v of res.violations) { const k = v.type + ' · ' + v.route + ' · ' + (v.cause || v.component).split(' > ').slice(-2).join(' > '); (byRoot[k] = byRoot[k] || { n: 0, widths: new Set(), orient: new Set(), engines: new Set(), langs: new Set(), ex: v }); const e = byRoot[k]; e.n++; e.widths.add(v.width); e.orient.add(v.orientation); e.engines.add(v.engine); e.langs.add(v.lang); }
  for (const [k, e] of Object.entries(byRoot)) {
    const ws = [...e.widths].sort((a, b) => a - b);
    console.log('FAIL ' + k + ' — ' + e.n + '× · ' + ws[0] + '–' + ws[ws.length - 1] + ' px (' + ws.length + ' widths) · ' + [...e.orient].join('/') + ' · ' + [...e.engines].join('+') + ' · ' + [...e.langs].join('+') + ' · e.g. ' + e.ex.width + ' ' + e.ex.orientation + ': expected ' + e.ex.expected + ', actual ' + e.ex.actual);
  }
  console.log((res.violations.length ? 'COMPOSITION AUDIT FAILED: ' + res.violations.length + ' violation(s) in ' + Object.keys(byRoot).length + ' root cause(s)' : 'COMPOSITION AUDIT PASSED') + ' · ' + res.routes.length + ' routes · ' + res.samples + ' samples · ' + res.measurements + ' measurements · ' + res.engines.join('+') + ' · ' + res.langs.join('+') + ' · fingerprint ' + res.fingerprint);
  if (argv.includes('--record')) {
    const f = path.join(ROOT, 'docs', 'acceptance', 'layout', 'LAST-COMPOSITION-AUDIT.json');
    fs.writeFileSync(f, JSON.stringify({ fingerprint: res.fingerprint, origin: /127\.0\.0\.1|localhost/.test(res.origin) ? 'local stage' : res.origin, finished: new Date().toISOString(), engines: res.engines, langs: res.langs, routes: res.routes, samples: res.samples, measurements: res.measurements, violations: res.violations.length }, null, 1) + '\n');
    console.log('recorded ' + path.relative(ROOT, f));
  }
  process.exit(res.violations.length ? 1 : 0);
}
