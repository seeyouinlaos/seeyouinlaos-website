'use strict';
/**
 * Asset fingerprints (Owner, Edit 4 · 16 Sep 2026 — cache correctness).
 *
 * A browser that kept an old stylesheet or script could pair it with a fresh page after a
 * deploy (the Worker's static assets are cacheable and edge caches lag a release by minutes).
 * So every stylesheet and script a page references carries the content hash of the file it
 * names: `assets/venue.css?v=3f2a9c1d`. A changed file changes its URL; an unchanged file keeps
 * its cached copy. Idempotent — run before every commit that touches assets or pages:
 *
 *   node src/asset-versions.cjs          # rewrite the references in every page
 *   node src/asset-versions.cjs --check  # exit 1 if any reference is stale (the release check)
 *
 * Only `href="assets/…css"` and `src="assets/…js|mjs"` on the pages of the site are stamped;
 * images, module imports and data files are untouched.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const CHECK = process.argv.includes('--check');
const PAGES = fs.readdirSync(ROOT).filter((f) => /\.html$/.test(f));
const RE = /((?:href|src)=")(assets\/[A-Za-z0-9_./-]+\.(?:css|js|mjs))(?:\?v=[0-9a-f]{8})?(")/g;
const hashes = {};
const hashOf = (rel) => { if (!hashes[rel]) { const f = path.join(ROOT, rel); if (!fs.existsSync(f)) return null; hashes[rel] = crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex').slice(0, 8); } return hashes[rel]; };
let stale = 0, stamped = 0, files = 0;
for (const page of PAGES) {
  const p = path.join(ROOT, page); const before = fs.readFileSync(p, 'utf8');
  const after = before.replace(RE, (m, a, rel, z) => { const h = hashOf(rel); if (!h) return m; stamped++; return a + rel + '?v=' + h + z; });
  if (after !== before) { stale++; if (!CHECK) { fs.writeFileSync(p, after); files++; } }
}
if (CHECK) { console.log(stale ? 'ASSET VERSIONS: ' + stale + ' page(s) reference a stale asset — run node src/asset-versions.cjs' : 'ASSET VERSIONS: every reference carries the current hash (' + stamped + ' references, ' + PAGES.length + ' pages)'); process.exit(stale ? 1 : 0); }
console.log('asset versions: ' + stamped + ' references on ' + PAGES.length + ' pages · ' + files + ' page(s) rewritten');
