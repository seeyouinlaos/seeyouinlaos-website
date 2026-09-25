'use strict';
/* THE LAYOUT AUDITOR'S PURE PARTS (Owner, 25 Sep 2026): the breakpoints the stylesheets really declare, the viewport
 * matrix built from them, the fingerprint of everything that decides layout, and the grouping of violations by their
 * shared root cause. No browser here — the gate L2 and test/layout-qa.test.mjs use the same functions as the auditor. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..', '..');
const C = require('../layout-contract.cjs');
const { ROUTES } = require('../layout-routes.cjs');

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const pages = () => ROUTES.map((r) => r.path.replace(/^\//, ''));
/* every <style> block of a page: its own primitives */
const inlineStyles = (html) => [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

/* the width conditions of every @media prelude (and every matchMedia a script asks), never a min-width property */
function mediaWidths(css) {
  const out = [];
  for (const m of css.matchAll(/@media([^{]*)\{/g)) for (const w of m[1].matchAll(/(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px/g)) out.push({ kind: w[1], px: Number(w[2]) });
  for (const m of css.matchAll(/matchMedia\(\s*['"]([^'"]+)['"]/g)) for (const w of m[1].matchAll(/(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px/g)) out.push({ kind: w[1], px: Number(w[2]) });
  return out;
}
/* the real breakpoints: where a condition flips. min-width N flips between N−1 and N; max-width N between N and N+1 */
function breakpoints() {
  const conds = [];
  for (const f of C.css) conds.push(...mediaWidths(read(f)));
  for (const p of pages()) conds.push(...mediaWidths(inlineStyles(read(p))));
  for (const f of fs.readdirSync(path.join(ROOT, 'assets')).filter((x) => /\.js$/.test(x))) conds.push(...mediaWidths(read('assets/' + f)));
  const flips = new Set();
  for (const c of conds) { if (c.px < 300 || c.px > 3000) continue; flips.add(c.kind === 'min' ? Math.round(c.px) : Math.round(c.px) + 1); }
  return [...flips].sort((a, b) => a - b);   /* each value B: the first width of the new side (B−1 is the last of the old) */
}
/* THE FULL MATRIX: the Owner's named widths and ±1 around every real breakpoint (B−2, B−1, B, B+1 — both sides of the flip
   and one step into each) */
function fullWidths() {
  const s = new Set(C.widths.named);
  for (const b of breakpoints()) for (const w of [b - 1, b, b + 1]) if (w >= 320) s.add(w);
  return [...s].sort((a, b) => a - b);
}
const heightFor = (w) => C.widths.heights[w] || (w < 600 ? Math.round(w * 2.16) : w < 1024 ? Math.round(w * 1.33) : C.widths.defaultHeight);

/* THE LAYOUT FINGERPRINT: the contract, the rules, the manifest, every stylesheet and every page's own <style>. A full
   audit is valid for exactly this fingerprint (gate L2) — change any of them and the site must be audited again. */
function fingerprint() {
  const h = crypto.createHash('sha256');
  for (const f of ['src/layout-contract.cjs', 'src/layout-routes.cjs', 'src/layout-qa/rules.js', 'src/layout-qa/core.cjs', ...C.css]) h.update(f + '\0' + read(f));
  for (const p of pages()) h.update(p + '\0' + inlineStyles(read(p)));
  return h.digest('hex').slice(0, 16);
}

/* ROOT CAUSES: the same type on the same primitive is one cause, however many pages, widths, languages and engines show it */
const clean = (p) => p.split(' > ').slice(-2).join(' > ').replace(/#[\w-]+/g, '').replace(/\.(is-in|on|open|am-playing|is-couple|sel|mine)\b/g, '');
/* the element that put the block there (rules.js · causeOf), else the block itself; wall and media faults of one element
   are one cause */
function rootKey(v) {
  const fam = /^(AXIS_WALL|MEDIA_WALL|AXIS_INNER)$/.test(v.type) ? 'OFF-AXIS' : v.type;
  return fam + ' · ' + clean(v.cause || v.component);
}
/* where a primitive is written: the stylesheet lines (and pages' own <style>) that name its class */
function whereDefined(sel) {
  const segs = sel.split(' > '); let cls = [];
  for (let i = segs.length - 1; i >= 0 && !cls.length; i--) cls = (segs[i].match(/\.[\w-]+/g) || []).filter((c) => !/^\.(is-|on$|open$|sel$|mine$)/.test(c));
  if (!cls.length) return [];
  const out = [];
  const files = [...C.css, ...pages()];
  for (const f of files) {
    const lines = read(f).split('\n');
    lines.forEach((l, i) => { if (cls.some((c) => new RegExp('\\' + c + '(?![\\w-])[^{;]*\\{').test(l)) && !/^\s*(\/\*|\*)/.test(l)) out.push(f + ':' + (i + 1)); });
  }
  return out.slice(0, 6);
}
function group(violations) {
  const g = new Map();
  for (const v of violations) {
    const k = rootKey(v);
    if (!g.has(k)) g.set(k, { root: k, cause: v.cause || v.component, type: v.type, types: new Set(), primitive: v.primitive, count: 0, routes: new Set(), states: new Set(), langs: new Set(), engines: new Set(), widths: new Set(), sample: v });
    const e = g.get(k); e.count++; e.types.add(v.type); e.routes.add(v.route); e.states.add(v.state); e.langs.add(v.lang); e.engines.add(v.engine); e.widths.add(v.width);
  }
  return [...g.values()].sort((a, b) => b.count - a.count).map((e) => ({ ...e, types: [...e.types], definedIn: whereDefined(e.cause), routes: [...e.routes], states: [...e.states], langs: [...e.langs], engines: [...e.engines], widths: [...e.widths].sort((a, b) => a - b) }));
}

/* the contract's own honesty: every exception names its reason */
function contractProblems() {
  const p = [];
  for (const k of ['fullBleed', 'narrowMedia', 'axisFree', 'centered']) for (const e of C[k]) { if (!e.sel) p.push(k + ': an entry without a selector'); if (!e.why) p.push(k + ' ' + e.sel + ': no reason'); }
  for (const w of [320, 360, 375, 390, 430, 600, 744, 768, 820, 834, 1024, 1133, 1180, 1194, 1280, 1366, 1440, 1680, 1920, 2560]) if (!C.widths.named.includes(w)) p.push('the named width ' + w + ' is missing');
  return p;
}

module.exports = { mediaWidths, breakpoints, fullWidths, heightFor, fingerprint, rootKey, group, whereDefined, contractProblems, inlineStyles, ROOT };
