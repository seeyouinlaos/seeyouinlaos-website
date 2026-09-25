#!/usr/bin/env node
/* THE SITE-WIDE LAYOUT QA AGENT (Owner, 25 Sep 2026). Renders every guest-facing route × state × language × engine ×
 * viewport and measures it against the canonical layout contract — DOM geometry and semantic classification, never
 * pixel diffs. docs/LAYOUT-QA.md is the manual.
 *
 *   node src/layout-qa/audit.mjs --fast            the structural gate of every release (local stage)
 *   node src/layout-qa/audit.mjs --full            the full site-wide audit for release acceptance (local stage)
 *   node src/layout-qa/audit.mjs --fast --origin https://seeyouinlaos-website.suthep-hrg.workers.dev
 *                                                  production, READ-ONLY: signed-out states only, nothing is written
 * Options: --origin URL · --engines chromium,webkit · --langs en,th · --routes /a.html,/b.html · --states a,b ·
 *          --widths 390,1440 · --workers N · --out DIR · --record (writes docs/acceptance/layout/LAST-<MODE>-AUDIT.json)
 * Guest states need the local stage and LAYOUT_QA_CODES / LAYOUT_QA_GR_TOKEN (src/layout-qa/states.mjs); without them
 * only the signed-out states run, and the report says so. Exit 1 on any unexplained violation. */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { RECIPES, isLocal, stageSecrets } from './states.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require('../layout-contract.cjs');
const { ROUTES, STATES, coverage } = require('../layout-routes.cjs');
const core = require('./core.cjs');
const RULES = fs.readFileSync(path.join(ROOT, 'src/layout-qa/rules.js'), 'utf8');

/* ---------------------------------------------------------------- options */
const argv = process.argv.slice(2);
const flag = (k) => argv.includes('--' + k);
const opt = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
const MODE = flag('full') ? 'full' : 'fast';
const ORIGIN = (opt('origin', 'http://127.0.0.1:8788')).replace(/\/$/, '');
const LOCAL = isLocal(ORIGIN);
const ENGINES = opt('engines', MODE === 'full' ? 'chromium,webkit' : 'chromium,webkit').split(',');
const LANGS = opt('langs', 'en,th').split(',');
const WORKERS = Number(opt('workers', MODE === 'full' ? 4 : 6));   /* the local stage is one wrangler process: a long run stays gentle */
const STAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(opt('out', path.join(ROOT, 'qa-artifacts', 'layout', STAMP + '-' + MODE)));
const onlyRoutes = opt('routes') ? opt('routes').split(',') : null;
const onlyStates = opt('states') ? opt('states').split(',') : null;

async function playwright() {
  for (const m of [process.env.PLAYWRIGHT_MODULE, 'playwright']) { if (!m) continue; try { return await import(m); } catch (e) { /* next */ } }
  const g = execSync('npm root -g', { encoding: 'utf8' }).trim();
  return import(path.join(g, 'playwright', 'index.mjs'));
}

/* ---------------------------------------------------------------- the plan */
const FULL_WIDTHS = core.fullWidths();
const NAMED = new Set(C.widths.named);
/* FAST: every route and state in Chromium at the fast widths in English; Thai and WebKit at a phone and a desktop */
function widthsFor(lang, engine) {
  if (opt('widths')) return opt('widths').split(',').map(Number);
  if (MODE === 'full') return FULL_WIDTHS;
  return lang === 'en' && engine === 'chromium' ? C.widths.fast : [390, 1440];
}
const secrets = LOCAL ? stageSecrets() : null;
const states = STATES.filter((s) => (!onlyStates || onlyStates.includes(s.id)) && (s.auth === null || (LOCAL && secrets)));
const skippedStates = STATES.filter((s) => !states.includes(s)).map((s) => s.id + (s.auth && !(LOCAL && secrets) ? (LOCAL ? ' (no stage secrets)' : ' (read-only origin)') : ''));
/* FAST keeps to the states every release changes: signed out, a fresh guest, a sent trip, the menu */
const FAST_STATES = ['signed-out', 'fresh', 'sent', 'menu-open', 'steps-open'];

/* ---------------------------------------------------------------- run */
const pw = await playwright();
fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
const report = { mode: MODE, origin: ORIGIN, readOnly: !LOCAL, started: new Date().toISOString(), fingerprint: core.fingerprint(), widths: { full: FULL_WIDTHS, fast: C.widths.fast, breakpoints: core.breakpoints() },
  engines: ENGINES, langs: LANGS, states: [], skippedStates, measurements: 0, loads: 0, violations: [], exceptions: {}, discovered: [], pageErrors: [] };
const browsers = {};
for (const e of ENGINES) browsers[e] = await pw[e].launch();
const shotSeen = new Set();
const linkSeen = new Set();

async function variantsOf(route, storage) {
  if (!route.variants) return [{ q: '', label: '' }];
  const b = browsers[ENGINES[0]];
  const ctx = await b.newContext({ storageState: storage || undefined });
  const p = await ctx.newPage();
  await p.goto(ORIGIN + (route.variants.from || route.path));
  await p.waitForFunction((g) => !!window[g], route.variants.global, { timeout: 20000 }).catch(() => {});
  const list = await p.evaluate((e) => { try { return eval(e); } catch (x) { return []; } }, route.variants.expr);
  await ctx.close();
  return list.length ? list : [{ q: '', label: '' }];
}
/* the representative data: the first record and the one with the longest name (the likeliest to wrap or overflow) */
function representative(list) {
  if (list.length <= 2) return list;
  const longest = list.slice().sort((a, b) => String(b.label).length - String(a.label).length)[0];
  return longest === list[0] ? [list[0]] : [list[0], longest];
}

async function openPanel(p, st) {
  if (st.action === 'menu') { await p.evaluate(() => { const t = document.querySelector('.hb, #menu-open'); t && t.click(); }); await p.waitForTimeout(650); }
  if (st.action === 'steps') { await p.evaluate(() => { const t = document.querySelector('.prep-all'); t && t.click(); }); await p.waitForTimeout(500); }
}
async function settle(p) {
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += Math.max(400, innerHeight * 0.8)) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); }
    scrollTo(0, 0);
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
  });
  await p.waitForTimeout(350);
}

async function job(j) {
  const b = browsers[j.engine];
  const ctx = await b.newContext({ storageState: j.storage || undefined, reducedMotion: 'reduce', viewport: { width: j.widths[0], height: core.heightFor(j.widths[0]) } });
  await ctx.addInitScript((l) => { try { localStorage.setItem('siyl.lang', l); } catch (e) { /* storage blocked */ } }, j.lang);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => report.pageErrors.push({ route: j.route.path + j.q, state: j.state.id, lang: j.lang, engine: j.engine, message: String(e.message).slice(0, 200) }));
  let loaded = false;
  for (const w of j.widths) {
    const h = core.heightFor(w);
    await p.setViewportSize({ width: w, height: h });
    if (!loaded || NAMED.has(w) || j.reloadAll) {
      /* one retry: a busy local stage may drop a connection; a second failure is reported as AUDIT_ERROR */
      const go = () => p.goto(ORIGIN + j.route.path + j.q, { waitUntil: 'load', timeout: 45000 });
      try { await go(); } catch (e) { await p.waitForTimeout(3000); await go(); }
      await p.waitForTimeout(900); await settle(p); loaded = true; report.loads++;
      if (j.state.panel) await openPanel(p, j.state);
      for (const href of await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')))) linkSeen.add(href);
    } else { await p.waitForTimeout(260); }
    const has = await p.evaluate(() => !!window.__LQA);
    if (!has) await p.addScriptTag({ content: RULES });
    const res = await p.evaluate(([c, o]) => window.__LQA.run(c, o), [C, { panel: j.state.panel || null }]);
    report.measurements++;
    for (const [k, n] of Object.entries(res.exceptions || {})) report.exceptions[k] = (report.exceptions[k] || 0) + n;
    if (!res.violations.length) continue;
    const vs = res.violations.map((v) => ({ route: j.route.path, query: j.q, family: j.route.family, state: j.state.id, lang: j.lang, engine: j.engine, width: w, height: h, ...v }));
    report.violations.push(...vs);
    /* ONE annotated screenshot per root cause per route, state, language and engine — the first width it appears at */
    const fresh = vs.filter((v) => { const k = core.rootKey(v) + '|' + j.route.path + j.q + '|' + j.state.id + '|' + j.lang + '|' + j.engine; if (shotSeen.has(k)) return false; shotSeen.add(k); return true; });
    if (fresh.length) {
      await p.evaluate(([g, l]) => window.__LQA.annotate(g, l), [res.geometry, res.violations]);
      const v0 = fresh[0];
      const name = [j.route.path.replace(/\W+/g, '') + (j.q ? '-' + j.q.replace(/\W+/g, '_') : ''), j.state.id, j.lang, j.engine, w, v0.type].join('-').slice(0, 150) + '.png';
      const file = path.join(OUT, 'shots', name);
      try {
        if (j.state.panel) await p.screenshot({ path: file });
        else { const y = Math.max(0, v0.box.y - 240), H = Math.min(1600, Math.max(v0.box.h + 480, 600)); await p.screenshot({ path: file, fullPage: true, clip: { x: 0, y, width: w, height: H } }); }
        for (const v of fresh) v.screenshot = path.relative(OUT, file);
      } catch (e) { /* a page that navigated away mid-shot */ }
      await p.evaluate(() => { const o = document.getElementById('lqa-overlay'); o && o.remove(); });
    }
  }
  await ctx.close();
}
async function pool(jobs) {
  let i = 0; const n = Math.max(1, WORKERS);
  await Promise.all(Array.from({ length: n }, async () => { while (i < jobs.length) { const j = jobs[i++]; try { await job(j); } catch (e) { report.violations.push({ route: j.route.path, query: j.q, state: j.state.id, lang: j.lang, engine: j.engine, width: 0, type: 'AUDIT_ERROR', component: 'the audit itself', primitive: '-', expected: 'the page renders', actual: String(e.message).slice(0, 200), box: { x: 0, y: 0, w: 0, h: 0 } }); } } }));
}

/* ---------------------------------------------------------------- THE SELF-TEST: the auditor proves it still sees */
async function selfTest() {
  const html = fs.readFileSync(path.join(ROOT, 'src/layout-qa/selftest.html'), 'utf8');
  const misses = [];
  for (const engine of ENGINES) for (const w of [390, 1440]) {
    const ctx = await browsers[engine].newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    await p.setContent(html, { waitUntil: 'load' }); await p.addScriptTag({ content: RULES });
    const out = await p.evaluate((c) => { const res = window.__LQA.run(c, {}); const types = (el) => (el.getAttribute('data-lqa-v') || '').split(' ').filter(Boolean).map((i) => res.violations[i - 1].type);
      return { bad: [...document.querySelectorAll('.bad')].map((el) => ({ want: el.dataset.expect, got: types(el) })), good: [...document.querySelectorAll('.good')].map((el) => types(el)).filter((t) => t.length) }; }, C);
    for (const b of out.bad) if (!b.got.includes(b.want)) misses.push(engine + ' ' + w + ': missed ' + b.want + ' (saw ' + (b.got.join(', ') || 'nothing') + ')');
    for (const g of out.good) misses.push(engine + ' ' + w + ': flagged a correct block as ' + g.join(', '));
    await ctx.close();
  }
  return misses;
}
const selftest = await selfTest();
report.selfTest = selftest.length ? selftest : 'passed';
if (selftest.length) { console.log('THE AUDITOR FAILED ITS SELF-TEST — its result could not be trusted:\n  ' + selftest.join('\n  ')); for (const b of Object.values(browsers)) await b.close(); process.exit(2); }
console.log('· self-test: every seeded fault found, no correct block flagged (' + ENGINES.join(', ') + ' · 390 · 1440)');

const storageOf = {};
const phaseOrder = ['signed-out', 'menu-open', 'fresh', 'planning', 'declined', 'mixed', 'sent', 'menu-open-guest', 'steps-open'];
const RECIPE_OF = { fresh: 'reset', planning: 'plan', declined: 'decline', sent: 'send' };
for (const id of phaseOrder) {
  const st = states.find((s) => s.id === id); if (!st) continue;
  if (MODE === 'fast' && !FAST_STATES.includes(id)) continue;
  /* bring the stage into the state (local only), then keep the guest's signed-in storage for the pages */
  if (st.setup) storageOf[id] = await RECIPES[st.setup](browsers[ENGINES[0]], ORIGIN, secrets);
  else if (id === 'mixed') storageOf[id] = storageOf.planning || (secrets && await RECIPES.reset(browsers[ENGINES[0]], ORIGIN, secrets));
  else if (st.auth && st.after) { if (!storageOf[st.after]) storageOf[st.after] = await RECIPES[RECIPE_OF[st.after]](browsers[ENGINES[0]], ORIGIN, secrets); storageOf[id] = storageOf[st.after]; }
  const storage = storageOf[id] || null;
  const routes = ROUTES.filter((r) => (st.routes === '*' || st.routes.includes(r.path)) && (!onlyRoutes || onlyRoutes.includes(r.path)));
  const jobs = [];
  for (const r of routes) {
    const all = await variantsOf(r, storage);
    const rep = representative(all);
    for (const engine of ENGINES) for (const lang of LANGS) for (const v of rep) jobs.push({ route: r, q: v.q, state: st, lang, engine, storage, widths: widthsFor(lang, engine) });
    /* every other record of a parameterised page: Chromium, English, the named widths (full) or the fast widths */
    if (MODE === 'full' && all.length > rep.length && (id === 'signed-out' || id === 'planning')) for (const v of all.filter((x) => !rep.includes(x))) jobs.push({ route: r, q: v.q, state: st, lang: 'en', engine: ENGINES[0], storage, widths: MODE === 'full' ? C.widths.named : C.widths.fast, reloadAll: true });
  }
  report.states.push({ id, routes: routes.length, jobs: jobs.length });
  process.stdout.write('· ' + id + ': ' + jobs.length + ' route renders … ');
  const t0 = Date.now(); await pool(jobs); console.log(Math.round((Date.now() - t0) / 1000) + ' s');
}
for (const b of Object.values(browsers)) await b.close();

/* ---------------------------------------------------------------- the new-route guard, rendered */
const cov = coverage();
for (const pr of cov.problems) report.violations.push({ route: '-', state: '-', lang: '-', engine: '-', width: 0, type: 'ROUTE_UNMANIFESTED', component: pr, primitive: 'src/layout-routes.cjs', expected: 'every served page audited', actual: pr, box: { x: 0, y: 0, w: 0, h: 0 } });
const known = new Set(ROUTES.map((r) => r.path.replace(/^\//, '')));
for (const href of linkSeen) {
  const m = /^(?:\.?\/)?([\w-]+(?:\/[\w-]+)?\.html)(?:[?#].*)?$/.exec(href || ''); if (!m) continue;
  const f = m[1]; if (known.has(f) || /^(you|documents)\.html$/.test(f)) continue;
  if (!report.discovered.includes(f)) { report.discovered.push(f); report.violations.push({ route: '-', state: '-', lang: '-', engine: '-', width: 0, type: 'ROUTE_UNMANIFESTED', component: 'a link to ' + f, primitive: 'src/layout-routes.cjs', expected: 'every linked page in the manifest', actual: f + ' is linked but not audited', box: { x: 0, y: 0, w: 0, h: 0 } }); }
}

/* ---------------------------------------------------------------- the report */
report.finished = new Date().toISOString();
report.groups = core.group(report.violations);
report.unexplained = report.violations.length;
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
const md = ['# Layout audit — ' + MODE + ' — ' + report.started, '', 'Origin: ' + ORIGIN + (report.readOnly ? ' (read-only)' : ' (local stage)') + ' · fingerprint ' + report.fingerprint,
  'Engines ' + ENGINES.join(', ') + ' · languages ' + LANGS.join(', ') + ' · ' + report.measurements + ' measurements over ' + report.loads + ' page loads',
  'States: ' + report.states.map((s) => s.id + ' (' + s.routes + ' routes)').join(', ') + (skippedStates.length ? ' · not run: ' + skippedStates.join(', ') : ''),
  'Widths: ' + (MODE === 'full' ? FULL_WIDTHS.length + ' (named + ±1 around ' + report.widths.breakpoints.length + ' breakpoints)' : C.widths.fast.join(', ')), '',
  '## ' + report.unexplained + ' unexplained violation(s) · ' + report.groups.length + ' root cause(s)', ''];
for (const g of report.groups) {
  const s = g.sample;
  md.push('### ' + g.root + ' — ' + g.count + '×', '', '- types: ' + g.types.join(', '), '- likely root primitive: `' + g.cause + '`' + (g.definedIn.length ? ' — written at ' + g.definedIn.join(', ') : ''), '- first seen on: `' + s.component + '`', '- expected: ' + s.expected + ' · actual: ' + s.actual,
    '- routes: ' + g.routes.join(', ') + ' · states: ' + g.states.join(', ') + ' · ' + g.langs.join('/') + ' · ' + g.engines.join('/'), '- widths: ' + g.widths.join(', '), s.screenshot ? '- screenshot: ' + s.screenshot : '', '');
}
md.push('## Declared exceptions exercised', '', ...Object.entries(report.exceptions).map(([k, n]) => '- `' + k + '` — ' + n + '×'), '');
if (report.pageErrors.length) md.push('## Page errors (' + report.pageErrors.length + ')', '', ...[...new Set(report.pageErrors.map((e) => e.route + ' · ' + e.message))].slice(0, 30).map((x) => '- ' + x), '');
fs.writeFileSync(path.join(OUT, 'report.md'), md.join('\n'));

if (flag('record')) {
  const rec = { mode: MODE, fingerprint: report.fingerprint, origin: LOCAL ? 'local stage' : ORIGIN, finished: report.finished, engines: ENGINES, langs: LANGS,
    states: report.states.map((s) => s.id), skippedStates, routes: ROUTES.length, measurements: report.measurements, loads: report.loads, widths: MODE === 'full' ? FULL_WIDTHS.length : C.widths.fast.length,
    unexplained: report.unexplained, rootCauses: report.groups.map((g) => ({ root: g.root, count: g.count })), exceptions: report.exceptions };
  const dir = path.join(ROOT, 'docs', 'acceptance', 'layout'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'LAST-' + MODE.toUpperCase() + '-AUDIT.json'), JSON.stringify(rec, null, 1) + '\n');
}
console.log((report.unexplained ? 'LAYOUT AUDIT FAILED: ' + report.unexplained + ' unexplained violation(s) in ' + report.groups.length + ' root cause(s)' : 'LAYOUT AUDIT PASSED: 0 unexplained violations') +
  ' · ' + report.measurements + ' measurements · ' + path.relative(ROOT, OUT) + '/report.md');
process.exit(report.unexplained ? 1 : 0);
