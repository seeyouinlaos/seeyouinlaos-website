/* ============================================================================
   EDIT 10 · THE PROFILE PHOTO ON A SECOND HOSTNAME (24 Sep 2026) — the stage proof.

     node photo-custom-host-e2e.mjs <scratchpad-with-synth-codes.json> <out-dir> [port]

   seeyouinlaos.com serves the one Worker beside workers.dev. The page used to send its
   API calls to the absolute workers.dev address from any other hostname — a
   cross-origin request the Worker's CORS list refuses, so the photo died with
   "The photo could not be saved". Here the stage is opened under a different
   hostname (siyl.localhost → 127.0.0.1): the upload must stay on the
   page's own origin, save, show, survive a reload, a new sign-in and a second
   device — and not one request may leave for workers.dev.
   Synthetic guest T003 on the stage only; the test photo is removed at the end.
   ========================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], PORT = process.argv[4] || '8788', HOST = 'siyl.localhost', O = 'http://' + HOST + ':' + PORT;
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 600) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 300)); };
/* a 64×64 synthetic PNG (a flat Ivory square) */
function png(w, h) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (ty, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(ty), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * (w * 3 + 1) + 1 + x * 3; raw[i] = 242; raw[i + 1] = 236; raw[i + 2] = 225; }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const PHOTO = path.join(OUT, 'synthetic-photo.png'); fs.writeFileSync(PHOTO, png(64, 64));
/* a *.localhost name is a secure context (as production's https second hostname is — the invitation's WebCrypto needs one) and
   resolves to the stage, yet it is NOT one of the names the old code treated as the Worker's own (workers.dev · localhost · 127.0.0.1) */
const b = await chromium.launch({ args: ['--host-resolver-rules=MAP ' + HOST + ' 127.0.0.1'] });
let crossOrigin = 0;
const ctxFor = async () => { const c = await b.newContext({ viewport: { width: 390, height: 844 } }); await c.route(/workers\.dev/, (r) => { crossOrigin++; r.abort(); }); return c; };
const signIn = async (p, id) => {
  await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1200);
};
const photoState = (p) => p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch('/api/profile/photo', { headers: { 'x-siyl-auth': a.bearer }, cache: 'no-store' }); return { status: r.status, type: r.headers.get('content-type') }; });
const shown = (p) => p.evaluate(() => { const a = document.querySelector('[data-avatar]'); const i = a && a.querySelector('img'); const bg = a && getComputedStyle(a).backgroundImage; return !!((i && i.src) || (bg && bg !== 'none')); });

const c1 = await ctxFor(), p = await c1.newPage();
await signIn(p, 'T003');
await p.goto(O + '/profile.html', { waitUntil: 'load' }); await p.waitForSelector('[data-photo-input]', { state: 'attached' }); await p.waitForTimeout(800);
await p.setInputFiles('[data-photo-input]', PHOTO); await p.waitForTimeout(2500);
const note1 = await p.evaluate(() => (document.querySelector('[data-photo-note]') || {}).textContent || '');
const s1 = await photoState(p);
note('10.1 on a second hostname the photo uploads to the page\'s own origin and is stored', s1.status === 200 && !/could not be saved/.test(note1), JSON.stringify({ s1, note: note1.slice(0, 120) }));
note('10.2 it is shown on My Profile at once', await shown(p), 'shown');
await p.screenshot({ path: path.join(OUT, '10-profile-photo-390.png') });
await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1800);
note('10.3 it survives a reload', await shown(p), 'shown after reload');
const c2 = await ctxFor(), p2 = await c2.newPage(); await signIn(p2, 'T003'); await p2.goto(O + '/profile.html', { waitUntil: 'load' }); await p2.waitForTimeout(2000);
note('10.4 a new sign-in on a second device shows the same photo', await shown(p2), 'shown on the second device');
note('10.5 not one request left for workers.dev (every call on the page\'s own origin)', crossOrigin === 0, 'cross-origin requests: ' + crossOrigin);
/* leave nothing behind */
const del = await p2.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); return (await fetch('/api/profile/photo', { method: 'DELETE', headers: { 'x-siyl-auth': a.bearer } })).status; });
note('10.6 the synthetic photo is removed again', del === 200, 'delete ' + del);
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fl = R.filter((r) => !r.ok).length; console.log('\n' + (R.length - fl) + '/' + R.length + ' pass'); process.exit(fl ? 1 : 0);
