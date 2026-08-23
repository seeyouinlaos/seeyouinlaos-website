'use strict';
/**
 * Image-slot metadata for the local "Edit Images" dev tool.
 *
 * Slots are identified by their existing asset PATH (relative to the repo
 * root), so a replacement overwrites the same filename and every reference in
 * index.html / CSS / the standalone build stays valid automatically. Metadata
 * is resolved per folder, matching docs/ASSETS.md.
 *
 * This file lives under src/ and is therefore excluded from the deployed
 * assets (see .assetsignore). It is used only by src/dev-editor-server.cjs.
 */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

// Approved write directories + their slot conventions.
// ratio/dims are advisory (shown in the editor); the CSS container controls the
// real crop via object-fit/aspect-ratio, so replacements never change layout.
const FOLDER_DEFAULTS = {
  'assets/images/hero':       { kind: 'bg',  ratio: '16 / 9', dims: [2560, 1440], webp: true,  retain: true },
  'assets/images/story':      { kind: 'img', ratio: '3 / 4',  dims: [1200, 1600], webp: false, retain: true },
  'assets/images/timeline':   { kind: 'img', ratio: '4 / 5',  dims: [1200, 1500], webp: false, retain: true },
  'assets/images/dining':     { kind: 'img', ratio: '4 / 5',  dims: [1200, 1500], webp: false, retain: true },
  'assets/images/cards':      { kind: 'img', ratio: '4 / 5',  dims: [1200, 1500], webp: false, retain: true },
  'assets/images/preview':    { kind: 'img', ratio: '4 / 5',  dims: [1000, 1250], webp: false, retain: true },
  'assets/images/dressguide': { kind: 'img', ratio: '3 / 4',  dims: [1200, 1600], webp: false, retain: true },
};

const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
// Long-edge cap: shrink-only, aspect-preserving. Never crops (CSS object-fit
// does the framing). Keeps a dropped 6000px original from bloating the repo.
const MAX_EDGE = 2560;

/**
 * Validate a slot path and resolve its metadata + absolute destination.
 * Returns null if the path is not an approved, existing-convention image slot.
 */
function describe(slotPath) {
  if (typeof slotPath !== 'string') return null;
  // Reject traversal / absolute / query / anything not a plain relative asset path.
  if (slotPath.includes('..') || slotPath.startsWith('/') || slotPath.includes('\0')) return null;
  if (!/^assets\/images\/[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp)$/.test(slotPath)) return null;

  const dir = path.posix.dirname(slotPath);
  const meta = FOLDER_DEFAULTS[dir];
  if (!meta) return null; // folder not on the approved list

  const abs = path.join(ROOT, slotPath);
  const rel = path.relative(ROOT, abs);
  // Containment: resolved path must stay inside <root>/assets/images/.
  if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
  if (!abs.startsWith(path.join(ROOT, 'assets', 'images') + path.sep)) return null;

  const ext = path.extname(abs).slice(1).toLowerCase();
  return {
    slotPath,
    dir,
    abs,
    ext,
    meta,
    webpSibling: abs.replace(/\.(jpg|jpeg|png)$/i, '.webp'),
  };
}

module.exports = { ROOT, FOLDER_DEFAULTS, ALLOWED_EXT, MAX_EDGE, describe };
