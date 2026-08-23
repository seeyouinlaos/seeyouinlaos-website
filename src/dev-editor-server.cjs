'use strict';
/**
 * Local-development "Edit Images" bridge.
 *
 * Serves the static site from the repo root (like Cloudflare's ASSETS binding)
 * AND, for local development only, injects a drag-and-drop image editor and
 * exposes a tiny write endpoint that overwrites approved image slots in place.
 *
 * SAFETY
 *  - Binds to 127.0.0.1 only (never a public interface).
 *  - Write endpoints reject any non-loopback client.
 *  - Writes are restricted to approved assets/images/* folders (see slots.cjs),
 *    validated for traversal, extension and real image content.
 *  - The editor client and this server live under src/ and are excluded from
 *    the deployed assets (.assetsignore). Production (the Cloudflare Worker)
 *    serves index.html verbatim with NO injection and NO write endpoint.
 *
 * Usage: npm run edit    (then open http://127.0.0.1:8899/)
 */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { ROOT, FOLDER_DEFAULTS, ALLOWED_EXT, MAX_EDGE, describe } = require('./editor/slots.cjs');

const PORT = process.env.EDIT_PORT ? Number(process.env.EDIT_PORT) : 8899;
const HOST = '127.0.0.1';
const EDITOR_DIR = path.join(__dirname, 'editor');
const ORIGINALS_DIR = path.join(ROOT, '_asset_originals');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml',
  '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

const isLoopback = (req) => {
  const a = req.socket.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
};
const json = (res, code, obj) => {
  res.writeHead(code, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
};
const run = (cmd, args) => new Promise((resolve, reject) => {
  execFile(cmd, args, { timeout: 60000 }, (err, stdout, stderr) =>
    err ? reject(new Error((stderr || err.message || '').toString().trim())) : resolve((stdout || '').toString().trim()));
});
const have = (cmd) => new Promise((r) => execFile(cmd, ['-version'], (e) => r(!e)));

function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limitBytes) { reject(new Error('file too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ---- POST /__edit/replace?path=<slot> : overwrite one approved image slot ----
async function handleReplace(req, res, url) {
  if (!isLoopback(req)) return json(res, 403, { ok: false, error: 'local development only' });
  const info = describe(url.searchParams.get('path') || '');
  if (!info) return json(res, 400, { ok: false, error: 'unknown or disallowed image slot' });

  let body;
  try { body = await readBody(req, 25 * 1024 * 1024); }
  catch (e) { return json(res, 413, { ok: false, error: e.message }); }
  if (!body.length) return json(res, 400, { ok: false, error: 'empty upload' });

  const tmp = path.join(os.tmpdir(), `siyl-edit-${process.pid}-${Date.now()}`);
  fs.writeFileSync(tmp, body);
  try {
    const magick = await have('magick');
    if (!magick) throw new Error('ImageMagick (magick) not found on PATH');

    // Validate: real image of an accepted type.
    const ident = await run('magick', ['identify', '-format', '%m %w %h', tmp + '[0]']);
    const fmt = (ident.split(/\s+/)[0] || '').toLowerCase();
    const okFmt = { jpeg: 1, png: 1, webp: 1, avif: 1, heic: 0 };
    if (!okFmt[fmt]) throw new Error(`unsupported image format: ${fmt || 'unknown'}`);

    // Retain the untouched original (local only; gitignored + assetsignored).
    if (info.meta.retain) {
      const keepDir = path.join(ORIGINALS_DIR, info.dir);
      fs.mkdirSync(keepDir, { recursive: true });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.copyFileSync(tmp, path.join(keepDir, `${path.basename(info.slotPath, path.extname(info.slotPath))}__${stamp}.${fmt === 'jpeg' ? 'jpg' : fmt}`));
    }

    // Write into the slot in its EXISTING format/extension (references unchanged),
    // shrink-only cap on the long edge, no crop (CSS object-fit frames it).
    fs.mkdirSync(path.dirname(info.abs), { recursive: true });
    const q = info.ext === 'png' ? [] : ['-quality', '82'];
    await run('magick', [tmp + '[0]', '-auto-orient', '-resize', `${MAX_EDGE}x${MAX_EDGE}>`, ...q, info.abs]);

    // Regenerate the WebP sibling where the slot uses one (hero + aerial).
    let webpDone = false;
    if (info.meta.webp || fs.existsSync(info.webpSibling)) {
      if (await have('cwebp')) {
        await run('cwebp', ['-quiet', '-q', '82', '-metadata', 'none', info.abs, '-o', info.webpSibling]);
        webpDone = true;
      }
    }
    const outDims = (await run('magick', ['identify', '-format', '%w %h', info.abs])).split(/\s+/);
    return json(res, 200, {
      ok: true, path: info.slotPath, bytes: fs.statSync(info.abs).size,
      width: +outDims[0], height: +outDims[1], webp: webpDone,
      cacheBust: `${info.slotPath}?t=${Date.now()}`,
    });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  } finally {
    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
  }
}

// ---- POST /__edit/rebuild : regenerate build/standalone.html ----
async function handleRebuild(req, res) {
  if (!isLoopback(req)) return json(res, 403, { ok: false, error: 'local development only' });
  try {
    const out = await run(process.execPath, [path.join(__dirname, 'build-standalone.cjs')]);
    return json(res, 200, { ok: true, output: out });
  } catch (e) {
    return json(res, 500, { ok: false, error: e.message });
  }
}

// ---- static file serving (repo root), with dev-only editor injection ----
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/' ) rel = '/index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  const abs = path.join(ROOT, rel);
  if (!abs.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }
  fs.readFile(abs, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    const ext = path.extname(abs).toLowerCase();
    if (ext === '.html') {
      // Inject the editor ONLY here, in local dev. index.html on disk (what
      // Cloudflare deploys) is never modified.
      const injected = buf.toString('utf8').replace(
        '</body>',
        '<link rel="stylesheet" href="/__editor/edit-images.css"/>\n<script src="/__editor/edit-images.js"></script>\n</body>'
      );
      res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
      return res.end(injected);
    }
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  // Editor client assets (dev only).
  if (url.pathname.startsWith('/__editor/')) {
    const f = path.join(EDITOR_DIR, path.basename(url.pathname));
    return fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(f).toLowerCase()] || 'text/plain', 'cache-control': 'no-store' });
      res.end(buf);
    });
  }
  if (url.pathname === '/__edit/slots' && req.method === 'GET') return json(res, 200, { folders: FOLDER_DEFAULTS, allowedExt: ALLOWED_EXT });
  if (url.pathname === '/__edit/replace' && req.method === 'POST') return handleReplace(req, res, url);
  if (url.pathname === '/__edit/rebuild' && req.method === 'POST') return handleRebuild(req, res);
  if (req.method !== 'GET') { res.writeHead(405); return res.end('method not allowed'); }
  return serveStatic(req, res, url);
});

server.listen(PORT, HOST, () => {
  console.log(`Edit Images dev server: http://${HOST}:${PORT}/  (localhost only)`);
  console.log('Open the site, click "Edit Images", then drag a file from Finder onto any photo.');
});
