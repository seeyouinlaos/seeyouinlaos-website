/* THE SITE-WIDE LAYOUT QA AGENT (Owner, 25 Sep 2026): the static half of the permanent layout gates. The rendered half is
   src/layout-qa/audit.mjs (--fast every release, --full for release acceptance; docs/LAYOUT-QA.md). These tests keep the
   contract, the route manifest, the breakpoint discovery, the root-cause grouping and the normalised shared primitives
   honest without a browser. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'module';
import { src } from './sandbox.mjs';

const require = createRequire(import.meta.url);
const C = require('../src/layout-contract.cjs');
const R = require('../src/layout-routes.cjs');
const core = require('../src/layout-qa/core.cjs');

test('NEW-ROUTE GUARD · every page the Worker serves is in the layout manifest or excluded with a reason; nothing stale', () => {
  const cov = R.coverage();
  assert.deepEqual(cov.problems, []);
  assert.ok(cov.served.length >= 25);
  for (const f of ['landing', 'editorial', 'registration', 'journey-overview', 'product-detail', 'accommodation', 'experience', 'wedding', 'about-you', 'my-bag', 'review-send', 'confirmation', 'profile']) assert.ok(R.ROUTES.some((r) => r.family === f), 'the family ' + f + ' is audited');
  /* parameterised pages are discovered from the data they render, never listed by hand */
  for (const p of ['/room.html', '/transport.html', '/experience.html']) assert.ok(R.ROUTES.find((r) => r.path === p).variants, p);
  /* the materially different states */
  for (const s of ['signed-out', 'fresh', 'planning', 'declined', 'mixed', 'sent', 'menu-open', 'steps-open']) assert.ok(R.STATES.some((x) => x.id === s), s);
});

test('CONTRACT · one wall from the tokens, every exception a named primitive with its reason, the Owner\'s twenty widths', () => {
  assert.deepEqual(core.contractProblems(), []);
  assert.equal(C.wall.gutToken, '--a-gut'); assert.equal(C.wall.frameToken, '--a-frame');
  assert.ok(C.tolerance <= 1.5);
  for (const k of ['fullBleed', 'narrowMedia', 'axisFree', 'centered']) for (const e of C[k]) assert.ok(e.why.length > 20, k + ' ' + e.sel);
  /* the approved iPhone composition holds only below the tablet: no phone exception leaks to a wide screen */
  for (const e of C.fullBleed.filter((x) => /iPhone|phone/.test(x.why))) assert.ok(e.maxWidth && e.maxWidth < 768, e.sel);
});

test('BREAKPOINTS · read from real @media preludes and matchMedia only (never a min-width property); ±1 around every flip', () => {
  const w = core.mediaWidths('.a { min-width: 14px } @media (min-width: 768px) and (max-width: 1023px) { .b { max-width: 900px } } x.matchMedia("(min-width: 900px)")');
  assert.deepEqual(w, [{ kind: 'min', px: 768 }, { kind: 'max', px: 1023 }, { kind: 'min', px: 900 }]);
  const bps = core.breakpoints();
  for (const b of [600, 768, 900, 1200, 1600]) assert.ok(bps.includes(b), 'breakpoint ' + b);
  const full = core.fullWidths();
  for (const n of C.widths.named) assert.ok(full.includes(n), 'named ' + n);
  for (const b of bps) for (const x of [b - 1, b, b + 1]) if (x >= 320) assert.ok(full.includes(x), 'around ' + b + ': ' + x);
  assert.match(core.fingerprint(), /^[0-9a-f]{16}$/);
});

test('ROOT CAUSES · one faulty primitive is one cause, however many pages, widths, languages and engines show it', () => {
  const v = (o) => ({ route: '/a.html', state: 's', lang: 'en', engine: 'chromium', width: 390, component: 'main > section.buy > p.eyebrow', primitive: '.eyebrow', expected: 'x', actual: 'y', ...o });
  const g = core.group([v({ type: 'AXIS_WALL', cause: 'main > section.buy' }), v({ type: 'AXIS_WALL', cause: 'main > section.buy', component: 'main > section.buy > div.win', route: '/b.html', lang: 'th' }), v({ type: 'MEDIA_WALL', cause: 'section.a-hero > div.am', component: 'section.a-hero > div.am' })]);
  assert.equal(g.length, 2);
  assert.equal(g[0].count, 2); assert.deepEqual(g[0].routes.sort(), ['/a.html', '/b.html']); assert.deepEqual(g[0].langs.sort(), ['en', 'th']);
  assert.ok(core.whereDefined('main > section.buy').some((x) => /room\.html|aman\.css|desktop\.css/.test(x)));
});

test('THE AUDITOR · proves itself before every run, stays read-only off the stage, and never ships its artifacts', () => {
  const a = src('src/layout-qa/audit.mjs'), st = src('src/layout-qa/states.mjs'), rules = src('src/layout-qa/rules.js'), fx = src('src/layout-qa/selftest.html');
  assert.match(a, /THE AUDITOR FAILED ITS SELF-TEST/);
  for (const t of ['AXIS_WALL', 'MEDIA_WALL', 'AXIS_CENTERED', 'TEXT_CLIPPED', 'MEDIA_DISTORTED', 'MEDIA_BROKEN', 'OUTSIDE_WALL', 'SECTION_OVERLAP']) { assert.match(fx, new RegExp('data-expect="' + t + '"'), 'the self-test seeds ' + t); assert.match(rules, new RegExp("'" + t + "'"), 'the rules know ' + t); }
  assert.match(fx, /class="good/, 'and correct blocks it must not flag');
  assert.match(st, /local-stage only — refusing/); assert.match(st, /export const isLocal = \(origin\) => \/\^http:\\\/\\\/\(127\\\.0\\\.0\\\.1\|localhost\)/);
  assert.doesNotMatch(st + a, /staget0|stageg0|local-dev-gr-token|bearer\s*[:=]\s*['"]\w/i, 'no code, token or bearer in the source');
  /* git-ignored, so the Workers Build (which deploys from git) can never serve them; .assetsignore stays frozen (gate I1) */
  assert.match(src('.gitignore'), /^qa-artifacts\/$/m);
  assert.doesNotMatch(rules, /pixelmatch|toMatchSnapshot|screenshot\(/, 'geometry, never pixel diffs');
});

test('NORMALISED PRIMITIVES · the shared rules the audit traced every violation to — no per-route patch, no negative margin', () => {
  const aman = src('assets/aman.css'), desk = src('assets/desktop.css'), prep = src('assets/prep.css'), xp = src('experience.html');
  /* the hero and the destination chapter close on the wall */
  assert.doesNotMatch(aman, /\.a-hero \.a[mh] \{[^}]*max-width: (720|880|1000)px/);
  assert.match(aman, /--a-dest-w: calc\(min\(100%, var\(--a-frame\)\) - 2 \* var\(--a-gut\)\);/);
  assert.match(aman, /\.a-dest > \.am \{ max-width: var\(--a-dest-w\); margin: 0 auto; aspect-ratio: 16 \/ 9; \}/, 'the chapter frame never leaks into its gallery slides');
  assert.match(aman, /\.a-sec > \.refgal, \.a-galcap \{ max-width: var\(--a-dest-w\);/);
  /* the shop shell carries ONE gutter */
  assert.match(desk, /main > section:not\(\[class\]\), \.contact, \.detail-h \{ margin-left: 0; margin-right: 0; padding-left: 0; padding-right: 0; \}/);
  assert.match(desk, /@media \(min-width: 600px\) \{\s*main \.acar \.atrk, main \.acar \.arow, main \.acar \.a-head \{ width: auto; max-width: none;/);
  assert.match(desk, /\.ed \.ph \{ width: 100%;/); assert.match(desk, /\.frow \{ padding: 15px 0; \}/); assert.match(desk, /\.inc p \{ padding: 15px 0; \}/);
  assert.match(desk, /main > h2, main > p\[style\*="text-align:center"\] \{ text-align: left !important; \}/); assert.match(desk, /\.ed \.cap, \.ed \.body, \.plane h2,/);
  /* the steps: one column, the bar's axis, a carousel on the page's width */
  assert.match(prep, /\.prep-head, \.prep-sec, \.prep-foot, \.prep-gate, \.prep-gate-note,/);
  assert.match(prep, /\.prep-bar-foot \{ column-gap: 0; \}/);
  assert.match(prep, /\.prep-page \.acar \.atrk, \.prep-page \.acar \.arow, \.prep-page \.acar \.a-head \{ width: auto;/);
  /* the experience reads on the wall's left axis */
  assert.match(xp, /\.x-wrap \{ max-width: var\(--a-frame, 1180px\); margin: 0 auto; \}/);
  assert.match(xp, /\.x-head, \.x-sec, \.x-back \{ max-width: 760px; margin-left: var\(--a-gut\); margin-right: auto; padding: 0; \}/);
  assert.match(xp, /\.x-clip \{ margin: 0 0 44px var\(--a-gut\); \}/);
  /* the phone booking panel and plan band use the gutter, never 26 / 32 px */
  for (const f of ['room.html', 'transport.html']) { const h = src(f); assert.match(h, /\.plane\{background:#FFFFFF;margin-top:48px;padding:44px var\(--a-gut,24px\) 40px\}/, f); assert.match(h, /\.buy\{background:#FCFAF6;margin-top:\d+px;padding:\d+px var\(--a-gut,24px\) \d+px\}/, f); assert.doesNotMatch(h, /padding:13px 2px/, f); }
  /* no negative margin in any rule this pass wrote */
  for (const block of [desk.slice(desk.indexOf('ONE GUTTER')), prep.slice(prep.indexOf("THE BAR'S LEFT AXIS"), prep.indexOf("THE BAR'S LEFT AXIS") + 800), prep.slice(prep.indexOf('ONE GUTTER FOR A CAROUSEL'))]) assert.doesNotMatch(block.slice(0, 900), /margin[^;]*:\s*-\d|calc\(-/);
});
