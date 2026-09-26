/* THE MEDIA ASSET AGENT · CORE (Owner, 26 Sep 2026). The pure rules of the site-wide media workflow — no Drive access, no
 * browser, no file writes — shared by the sync engine (src/media/agent.mjs), the Media QA gate (src/media/media-qa.mjs) and
 * the tests. docs/MEDIA-ASSET-AGENT.md is the manual.
 *
 *   archive      the Owner's private "999 - Archive" is outside the agent's authority: recognised by name, refused everywhere
 *   scope        "Synchronize media." = every mapped collection · "Synchronize 152." = one · "Synchronize 001–030." = a range
 *   diff         by the stable Drive file id: unchanged · changed (same id, other bytes) · renamed (same bytes, new title) ·
 *                touched (same bytes and title, new modified time) · added · removed · replaced (one removed + one added in
 *                the same collection) · reordered (a title-carried order, within each subfolder; an explicit order never moves)
 *   crop         what a frame of a given aspect shows of a source under object-fit: cover and an object-position — and whether
 *                every head and the subject stay inside it, per viewport class
 *   focal        a suggested object-position that keeps the heads (first) and the subject inside each class's frame — a
 *                starting point the agent confirms by looking, never a default
 *   video        the output may never be worse than the source: same duration, frame rate, audio, and at least the source's
 *                resolution and (for a re-encode) bitrate; a lossless remux is the default
 *   resolution   downscaling for delivery is expected; upscaling is never automatic — an insufficient source is flagged */

export const CLASSES = ['p', 'tp', 'tl', 'd'];   /* phone · tablet portrait · tablet landscape · desktop */

/* ---------------------------------------------------------------- the archive */
export const isArchive = (title) => /archive/i.test(String(title || '')) || /^\s*999\b/.test(String(title || ''));
export function assertNoArchive(inventory) {
  const bad = [];
  for (const f of (inventory && inventory.folders) || []) {
    if (isArchive(f.title)) bad.push(f.title);
    for (const s of f.subfolders || []) if (isArchive(s.title) || isArchive(s.path)) bad.push(s.path || s.title);
    for (const x of f.files || []) if (isArchive(x.path)) bad.push(x.path);
  }
  if (bad.length) throw new Error('ARCHIVE RULE: the inventory reaches into "999 - Archive" (' + bad.length + ' path(s)) — it must be excluded before traversal');
  return true;
}

/* ---------------------------------------------------------------- the scope of a command */
/* "Synchronize media." · "Synchronize 152." · "Synchronize 001–030." (en dash, hyphen or "to") · "Synchronize 011, 013" */
export function scopeOf(command, numbers) {
  const s = String(command || '').replace(/[–—]/g, '-');
  const all = numbers.slice().sort();
  const nums = [...s.matchAll(/\b(\d{1,3})\s*(?:-|to)\s*(\d{1,3})\b|\b(\d{1,3})\b/g)];
  if (!nums.length) return all;
  const pick = new Set();
  for (const m of nums) {
    if (m[1]) { const a = Number(m[1]), b = Number(m[2]); for (const n of all) if (Number(n) >= Math.min(a, b) && Number(n) <= Math.max(a, b)) pick.add(n); }
    else { const n = String(Number(m[3])).padStart(3, '0'); if (all.includes(n)) pick.add(n); }
  }
  return all.filter((n) => pick.has(n));
}

/* ---------------------------------------------------------------- the diff */
const MEDIA = /^(image|video)\//;
export function diffCollection(recorded, current) {
  const rec = (recorded && recorded.items) || [];
  const cur = ((current && current.files) || []).filter((f) => MEDIA.test(f.mimeType || ''));
  const byId = new Map(rec.map((x) => [x.driveId, x]));
  const curIds = new Set(cur.map((f) => f.id));
  const out = { unchanged: [], changed: [], renamed: [], touched: [], added: [], removed: [], replaced: [], reordered: false };
  for (const f of cur) {
    const r = byId.get(f.id);
    if (!r) { out.added.push(f); continue; }
    /* the CONTENT changed: another byte count (or another checksum, when Drive gives one) — the file is inspected again */
    const sized = r.size && f.size && Number(r.size) !== Number(f.size);
    const summed = r.md5 && f.md5Checksum && r.md5 !== f.md5Checksum;
    if (sized || summed) out.changed.push({ recorded: r, current: f });
    /* only its NAME changed (same id, same bytes): the record takes the new title; an explicit order keeps its positions */
    else if (r.title && f.title && r.title !== f.title) out.renamed.push({ recorded: r, current: f });
    /* only the modified time moved (same name, same bytes): a metadata touch — the sync confirms the picture by its fingerprint */
    else if (r.modifiedTime && f.modifiedTime && r.modifiedTime !== f.modifiedTime) out.touched.push({ recorded: r, current: f });
    else out.unchanged.push(f.id);
  }
  for (const r of rec) if (!curIds.has(r.driveId)) out.removed.push(r);
  /* one file left and one arrived in the same place: a replacement (the slot is known, the new file takes it) */
  if (out.removed.length === 1 && out.added.length === 1) out.replaced.push({ removed: out.removed[0], added: out.added[0] });
  /* a title-carried order ("001_…", "002_…", within each subfolder) that no longer matches the recorded order */
  if (recorded && recorded.order === 'title-ascending') {
    const keep = rec.filter((r) => curIds.has(r.driveId));
    const keyOf = new Map(cur.map((f) => [f.id, (f.path || '') + '\u0000' + f.title]));
    const want = keep.slice().sort((a, b) => String(keyOf.get(a.driveId)).localeCompare(String(keyOf.get(b.driveId))));
    out.reordered = want.map((x) => x.driveId).join() !== keep.map((x) => x.driveId).join();
  }
  out.status = out.changed.length || out.added.length || out.removed.length || out.reordered ? 'changed'
    : out.renamed.length || out.touched.length ? 'renamed' : 'unchanged';
  return out;
}

/* ---------------------------------------------------------------- the crop */
const pct = (s, i) => { const m = /^(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/.exec(String(s || '50% 50%').trim()); return m ? Number(m[i]) / 100 : 0.5; };
/* the visible part of a w × h source in a frame of `aspect` (width / height) under object-fit: cover + object-position */
export function visibleRegion(w, h, aspect, focal) {
  const s = w / h;
  if (Math.abs(s - aspect) < 1e-6) return { x: 0, y: 0, w: 1, h: 1 };
  if (s > aspect) { const vw = aspect / s; return { x: (1 - vw) * pct(focal, 1), y: 0, w: vw, h: 1 }; }
  const vh = s / aspect; return { x: 0, y: (1 - vh) * pct(focal, 2), w: 1, h: vh };
}
const inside = (b, r, tol) => b.x >= r.x - tol && b.y >= r.y - tol && b.x + b.w <= r.x + r.w + tol && b.y + b.h <= r.y + r.h + tol;
const overlap = (b, r) => { const w = Math.max(0, Math.min(b.x + b.w, r.x + r.w) - Math.max(b.x, r.x)), h = Math.max(0, Math.min(b.y + b.h, r.y + r.h) - Math.max(b.y, r.y)); return b.w * b.h ? (w * h) / (b.w * b.h) : 1; };
/* every head inside the frame at every class; the subject at least `keep` visible */
export function cropSafety(item, geometry, opts) {
  const tol = (opts && opts.tol) || 0.01, keep = (opts && opts.keep) || 0.85;
  const v = item.vision || {}, faces = v.faces || [], salient = v.salient;
  const out = [];
  for (const c of CLASSES) {
    const g = geometry && geometry[c]; if (!g) continue;
    const focal = (item.focal && item.focal[c]) || '50% 50%';
    const r = visibleRegion(item.w, item.h, g, focal);
    const clipped = faces.filter((f) => !inside(f, r, tol)).length;
    const subject = salient ? overlap(salient, r) : 1;
    if (clipped) out.push({ cls: c, type: 'HEAD_CLIPPED', detail: clipped + ' head(s) outside the ' + c + ' frame at ' + focal });
    else if (subject < keep) out.push({ cls: c, type: 'SUBJECT_CLIPPED', detail: Math.round(subject * 100) + ' % of the subject visible in the ' + c + ' frame at ' + focal });
  }
  return out;
}
/* the object-position that keeps the heads (else the subject) centred in the cropped axis, clamped to the image */
export function suggestFocal(item, geometry) {
  const v = item.vision || {};
  const boxes = (v.faces && v.faces.length) ? v.faces : (v.salient ? [v.salient] : []);
  const out = {};
  for (const c of CLASSES) {
    const a = geometry && geometry[c]; if (!a) continue;
    if (!boxes.length) { out[c] = '50% 50%'; continue; }
    const u = boxes.reduce((m, b) => ({ x0: Math.min(m.x0, b.x), y0: Math.min(m.y0, b.y), x1: Math.max(m.x1, b.x + b.w), y1: Math.max(m.y1, b.y + b.h) }), { x0: 1, y0: 1, x1: 0, y1: 0 });
    const s = item.w / item.h;
    let px = 50, py = 50;
    if (s > a) { const vw = a / s; const cx = (u.x0 + u.x1) / 2; px = vw >= 1 ? 50 : Math.max(0, Math.min(100, ((cx - vw / 2) / (1 - vw)) * 100)); }
    else if (s < a) { const vh = s / a; const cy = (u.y0 + u.y1) / 2; py = vh >= 1 ? 50 : Math.max(0, Math.min(100, ((cy - vh / 2) / (1 - vh)) * 100)); }
    out[c] = Math.round(px) + '% ' + Math.round(py) + '%';
  }
  return out;
}

/* ---------------------------------------------------------------- the video: never worse than the source */
export function videoRegression(source, output) {
  const v = [];
  if (!source || !output) return ['no probe'];
  /* the content: the picture's duration and every frame of both streams (a container's duration is bookkeeping, not content) */
  if (Math.abs((output.duration || 0) - (source.duration || 0)) > 0.05) v.push('DURATION ' + source.duration + ' s → ' + output.duration + ' s');
  if (source.videoFrames && output.videoFrames !== source.videoFrames) v.push('VIDEO FRAMES ' + source.videoFrames + ' → ' + output.videoFrames);
  if (source.audioFrames && output.audioFrames !== source.audioFrames) v.push('AUDIO FRAMES ' + source.audioFrames + ' → ' + output.audioFrames);
  if (source.fps && output.fps && Math.abs(output.fps - source.fps) > 0.01) v.push('FRAME RATE ' + source.fps + ' → ' + output.fps);
  if ((output.width || 0) < (source.width || 0) || (output.height || 0) < (source.height || 0)) v.push('RESOLUTION ' + source.width + '×' + source.height + ' → ' + output.width + '×' + output.height);
  if (source.audio && !output.audio) v.push('AUDIO REMOVED');
  if (source.audio && output.audio && output.audioBitrate && source.audioBitrate && output.audioBitrate < source.audioBitrate * 0.97) v.push('AUDIO BITRATE ' + source.audioBitrate + ' → ' + output.audioBitrate);
  const remux = output.codec === source.codec && output.width === source.width && output.height === source.height;
  if (!remux && output.bitrate && source.bitrate && output.bitrate < source.bitrate * 0.97 && !(output.quality && output.quality.vmaf >= 95)) v.push('RE-ENCODED BELOW THE SOURCE BITRATE without a proven perceptual equal (VMAF ≥ 95)');
  if (remux && output.bitrate && source.bitrate && output.bitrate < source.bitrate * 0.97) v.push('VIDEO BITRATE ' + source.bitrate + ' → ' + output.bitrate);
  return v;
}
/* the controls a film earns: Play / Pause always; Sound on / Mute only with a meaningful audio track */
export const filmControls = (item) => ({ play: true, sound: !!item.audio });

/* ---------------------------------------------------------------- resolution */
/* the largest box the role ever shows (CSS px) × device density 2 — the source must reach it or be flagged, never upscaled */
export function resolutionNeed(item, role) {
  const maxW = Math.max(...CLASSES.map((c) => (role && role.px && role.px[c] ? role.px[c][0] : 0)));
  const maxH = Math.max(...CLASSES.map((c) => (role && role.px && role.px[c] ? role.px[c][1] : 0)));
  if (!maxW || !item.w) return { ok: true };
  /* under cover, the source must cover the box in both axes at density 2 */
  const need = Math.max((maxW * 2) / item.w, (maxH * 2) / item.h);
  return { ok: need <= 1.001, scale: +need.toFixed(2), need: [maxW * 2, maxH * 2] };
}
