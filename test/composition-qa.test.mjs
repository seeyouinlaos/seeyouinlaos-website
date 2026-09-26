/* GROUPED MEDIA · COMPOSITION QA (Owner, 26 Sep 2026): two individually valid photographs can still form an invalid
   composition. A tablet held upright stacked the duo (the map of Laos above the reclining Buddha; the alms-giving pair) into
   two full-wall blocks while every audit passed — the layout contract had no rule for a GROUP. The root cause (a 768–1199 px
   portrait rule that turned the duo into one column) is gone; the contract now declares grouped media, the rules measure
   them in every fast and full audit, and src/layout-qa/composition.mjs renders them densely in both orientations. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { src } from './sandbox.mjs';
import { samples, continuity } from '../src/layout-qa/composition.mjs';

const require = createRequire(import.meta.url);
const C = require('../src/layout-contract.cjs');
const core = require('../src/layout-qa/core.cjs');

test('THE ROOT CAUSE · the duo is one composition at every width: no rule stacks it into one column (portrait or not)', () => {
  const css = src('assets/aman.css');
  assert.doesNotMatch(css, /\.a-duo\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*;/, 'no single-column duo');
  assert.doesNotMatch(css, /orientation: portrait\)\s*\{\s*\.a-duo/, 'no orientation rule restructures the duo');
  assert.match(css, /\.a-duo \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); column-gap: var\(--a-col\); \}/);
  /* the alms pair keeps every head at the phone's 4 : 5 and the tablet's 4 : 3 (the existing focal mechanism) */
  assert.match(src('voyage.html'), /takbat-novices-with-bowls\.jpg\);background-position:50% 30%"/);
  assert.match(src('voyage.html'), /takbat-couple-offering-bowl\.jpg\);background-position:40% 50%"/);
});

test('THE CONTRACT · grouped media are declared with their rules, and every page carrying a grouped primitive is audited', () => {
  const duo = C.groups.find((g) => g.sel === '.a-duo');
  assert.ok(duo && duo.count === 2 && duo.weight <= 1.25 && duo.memberShare <= 0.62 && duo.heightRatio <= 0.9 && duo.continuity <= 1.8);
  assert.deepEqual(duo.routes.slice().sort(), ['/index.html', '/voyage.html']);
  assert.deepEqual(core.contractProblems(), []);
  const M = JSON.parse(src('src/media/manifest.json'));
  assert.equal(M.roles['editorial-duo'].group, '.a-duo', 'Media QA knows the pair is one composition');
});

test('THE RULES · every audit measures a group (row, weight, member share, height) and proves it on seeded faults', () => {
  const rules = src('src/layout-qa/rules.js');
  for (const t of ['GROUP_STACKED', 'GROUP_WEIGHT', 'GROUP_MEMBER_OVERSIZED', 'GROUP_TOO_TALL', 'GROUP_MEMBERS']) assert.match(rules, new RegExp("'" + t + "'"));
  const self = src('src/layout-qa/selftest.html');
  assert.match(self, /data-expect="GROUP_STACKED"/); assert.match(self, /data-expect="GROUP_WEIGHT"/);
  assert.match(self, /class="a-duo"[^>]*><div class="am good"/, 'and a correct pair that must not be flagged');
});

test('BREAKPOINT CONTINUITY · the samples cannot leave a gap: both orientations across the tablet range, every flip ±1, ≤ 32 px apart', () => {
  const s = samples();
  for (const w of [599, 600, 767, 768, 834, 1024, 1199, 1200]) for (const o of ['portrait', 'landscape']) if (w >= 600 && w <= 1366) assert.ok(s.some((x) => x.w === w && x.o === o), w + ' ' + o);
  const port = s.filter((x) => x.o === 'portrait' && x.w >= 560 && x.w <= 1366).map((x) => x.w);
  for (let i = 1; i < port.length; i++) assert.ok(port[i] - port[i - 1] <= 32, port[i - 1] + ' → ' + port[i]);
  for (const x of s.filter((y) => y.w >= 600 && y.w <= 1366)) assert.equal(x.o === 'portrait' ? x.h > x.w : x.h < x.w, true, x.w + ' ' + x.o);
  /* the broken tablet (measured on production before the fix) fails; the art-directed 4:5 → 4:3 switch at 600 px passes */
  assert.equal(continuity([{ w: 767, o: 'portrait', ratio: 0.568 }, { w: 768, o: 'portrait', ratio: 1.624 }], 1.8).length, 1);
  assert.equal(continuity([{ w: 599, o: 'portrait', ratio: 0.612 }, { w: 600, o: 'portrait', ratio: 0.361 }], 1.8).length, 0);
});

test('THE GATE · L2 requires the composition audit on this layout, both engines and languages, zero violations; Media QA renders it', () => {
  const rc = src('src/release-check.cjs');
  assert.match(rc, /LAST-COMPOSITION-AUDIT\.json/); assert.match(rc, /the composition audit has ' \+ rec\.violations/);
  assert.match(src('src/media/media-qa.mjs'), /layout-qa\/composition\.mjs'\)\)\.audit\(\{ origin \}\)/);
});
