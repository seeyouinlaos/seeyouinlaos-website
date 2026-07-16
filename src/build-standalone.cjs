'use strict';
/**
 * Build build/standalone.html: a single self-contained file with every local
 * asset referenced by index.html (fonts, vendor JS, images, CSS backgrounds)
 * inlined as base64/text. Portable for offline sharing (email, WhatsApp, etc.).
 *
 * Usage: node src/build-standalone.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'build', 'standalone.html');

let html = fs.readFileSync(SRC, 'utf8');
const read = (f) => fs.readFileSync(path.join(ROOT, f));
const b64 = (f) => read(f).toString('base64');
const mimeImg = (f) => {
  const e = f.toLowerCase().split('.').pop();
  return e === 'png' ? 'image/png' : e === 'webp' ? 'image/webp' : e === 'svg' ? 'image/svg+xml' : 'image/jpeg';
};
const exists = (f) => { try { fs.accessSync(path.join(ROOT, f)); return true; } catch { return false; } };

let counts = { js: 0, font: 0, img: 0, css: 0, miss: [] };

// <script src="assets/vendor/x.js"> -> inline <script>
html = html.replace(/<script([^>]*)\ssrc="([^"]+\.js)"([^>]*)><\/script>/g, (m, a, src, b) => {
  if (/^https?:\/\//.test(src) || !exists(src)) { if (!/^https?:/.test(src)) counts.miss.push(src); return m; }
  counts.js++;
  return `<script${a}${b}>\n${read(src).toString('utf8')}\n</script>`;
});

// @font-face url('assets/fonts/x.otf') -> data:font/otf
html = html.replace(/url\((['"]?)([^)'"]+\.(otf|ttf|woff2?))\1\)/g, (m, q, file, ext) => {
  if (/^data:/.test(file) || !exists(file)) { if (!/^data:/.test(file)) counts.miss.push(file); return m; }
  counts.font++;
  const mime = ext === 'ttf' ? 'font/ttf' : ext === 'woff' ? 'font/woff' : ext === 'woff2' ? 'font/woff2' : 'font/otf';
  return `url(${q}data:${mime};base64,${b64(file)}${q})`;
});

// CSS background url('assets/images/.../x.jpg') -> data:image
html = html.replace(/url\((['"]?)([^)'"]+\.(jpg|jpeg|png|webp))\1\)/g, (m, q, file) => {
  if (/^data:/.test(file) || !exists(file)) { if (!/^data:/.test(file)) counts.miss.push(file); return m; }
  counts.css++;
  return `url(${q}data:${mimeImg(file)};base64,${b64(file)}${q})`;
});

// <img src="assets/images/.../x.jpg">
html = html.replace(/src="([^"]+\.(jpg|jpeg|png|webp|svg))"/g, (m, file) => {
  if (/^data:|^https?:/.test(file) || !exists(file)) { if (!/^data:|^https?:/.test(file)) counts.miss.push(file); return m; }
  counts.img++;
  return `src="data:${mimeImg(file)};base64,${b64(file)}"`;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
const size = (fs.statSync(OUT).size / 1024 / 1024).toFixed(2);
console.log(`build/standalone.html written: ${size} MB`);
console.log(`inlined -> js:${counts.js} fonts:${counts.font} css-bg:${counts.css} images:${counts.img}`);
const miss = [...new Set(counts.miss)];
console.log(miss.length ? `MISSING (left as-is): ${miss.join(', ')}` : 'no missing local assets');
