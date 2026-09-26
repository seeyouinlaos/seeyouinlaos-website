#!/usr/bin/env node
/* THE MEDIA ASSET AGENT · ENGINE (Owner, 26 Sep 2026). The local half of the site-wide media workflow; the Drive half is the
 * agent reading the Owner's numbered folders through the Drive connector (read-only, "999 - Archive" excluded before
 * traversal) into an inventory JSON. docs/MEDIA-ASSET-AGENT.md is the manual; src/media/manifest.json is the contract.
 *
 *   node src/media/agent.mjs plan --inventory inv.json [--scope "Synchronize 001–030."]   the diff, per collection
 *   node src/media/agent.mjs inspect file…                  size · aspect · film streams · meaningful audio · faces/heads/subject
 *   node src/media/agent.mjs match --sources dir… [--local list.txt]   which website asset each Drive source became
 *   node src/media/agent.mjs focal --role <role> file       the suggested object-position per class + its crop-safety proof
 *   node src/media/agent.mjs derive --role <role> src outBase   responsive JPEG derivatives, never upscaled, SSIM ≥ 0.985
 *   node src/media/agent.mjs remux src out.mp4 [poster.jpg]  lossless, index first, refused if anything regresses
 *
 * Nothing here writes to Drive, deploys, or touches production. */
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { execFileSync, spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import * as core from './core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..', '..');
export const MANIFEST = path.join(ROOT, 'src/media/manifest.json');
export const readManifest = () => JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

/* ---------------------------------------------------------------- probes */
export function probeVideo(file) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_packets', '-show_entries', 'format=duration,bit_rate:stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate,pix_fmt,duration,nb_read_packets', '-of', 'json', file], { encoding: 'utf8' }));
  const v = j.streams.find((s) => s.codec_type === 'video') || {}, a = j.streams.find((s) => s.codec_type === 'audio');
  const [n, d] = String(v.r_frame_rate || '0/1').split('/').map(Number);
  /* the CONTENT, not the container's bookkeeping: the picture's own duration and the frame counts of both streams (an AAC
     priming offset can move a container's duration by ~0.1 s without a single frame changing) */
  const out = { codec: v.codec_name, width: v.width, height: v.height, pixFmt: v.pix_fmt, fps: +(n / (d || 1)).toFixed(3), duration: +Number(v.duration || j.format.duration || 0).toFixed(2),
    videoFrames: Number(v.nb_read_packets || 0), audioFrames: a ? Number(a.nb_read_packets || 0) : 0,
    bitrate: Number(v.bit_rate || j.format.bit_rate || 0), audio: !!a, audioCodec: a ? a.codec_name : null, audioBitrate: a ? Number(a.bit_rate || 0) : 0 };
  /* a track of silence is not audio: the sound control appears only for a meaningful one (mean above −60 dB) */
  if (a) {
    const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' });
    const m = /mean_volume:\s*(-?[\d.]+) dB/.exec(r.stderr || ''); out.meanVolume = m ? Number(m[1]) : null;
    out.audio = out.meanVolume === null || out.meanVolume > -60;
  }
  return out;
}
let visionBin = null;
function vision() {
  if (visionBin) return visionBin;
  const srcFile = path.join(HERE, 'vision.swift'), tag = crypto.createHash('sha1').update(fs.readFileSync(srcFile)).digest('hex').slice(0, 10);
  const dir = path.join(os.homedir(), '.cache', 'siyl-media'); fs.mkdirSync(dir, { recursive: true });
  visionBin = path.join(dir, 'vision-' + tag);
  if (!fs.existsSync(visionBin)) execFileSync('swiftc', ['-O', srcFile, '-o', visionBin], { stdio: 'inherit' });
  return visionBin;
}
/* faces (extended to the whole head), people and the attention-saliency region, normalised, top-left origin */
export function see(files) {
  if (!files.length) return [];
  const out = execFileSync(vision(), files, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  return out;
}
export function inspect(file) {
  const ext = file.toLowerCase().split('.').pop();
  if (['mp4', 'mov', 'm4v', 'webm'].includes(ext)) {
    const v = probeVideo(file);
    const frame = path.join(os.tmpdir(), 'siyl-frame-' + crypto.randomBytes(4).toString('hex') + '.jpg');
    spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.min(1, v.duration / 2)), '-i', file, '-frames:v', '1', frame]);
    const s = fs.existsSync(frame) ? see([frame])[0] : {};
    return { file, kind: 'video', w: v.width, h: v.height, aspect: +(v.width / v.height).toFixed(3), video: v, vision: { faces: s.faces || [], salient: s.salient || null } };
  }
  const s = see([file])[0] || {};
  return { file, kind: 'image', w: s.w, h: s.h, aspect: s.w ? +(s.w / s.h).toFixed(3) : null, vision: { faces: s.faces || [], salient: s.salient || null, people: s.people || [] } };
}

/* ---------------------------------------------------------------- matching */
const hamming = (a, b) => { let d = 0; for (let i = 0; i < a.length; i += 8) { let x = parseInt(a.slice(i, i + 8), 16) ^ parseInt(b.slice(i, i + 8), 16); while (x) { d += x & 1; x >>>= 1; } } return d; };
export function fingerprints(files) {
  const out = path.join(os.tmpdir(), 'siyl-fp-' + crypto.randomBytes(4).toString('hex') + '.json');
  execFileSync('python3', [path.join(HERE, 'fingerprint.py'), out, ...files], { stdio: ['ignore', 'ignore', 'inherit'] });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}
/* the closest website asset to each source (256-bit difference hash; a recrop or re-encode stays close, another photograph is 80+ apart) */
export function match(sources, locals, max = 60) {   /* ≤ 40 bits: the same photograph · 41–60: the same photograph recropped — the agent confirms by looking */
  return sources.map((s) => {
    if (!s.hash) return { file: s.file, best: null };
    const ranked = locals.filter((l) => l.hash).map((l) => ({ file: l.file, d: hamming(s.hash, l.hash) })).sort((a, b) => a.d - b.d);
    return { file: s.file, best: ranked[0] && ranked[0].d <= max ? Object.assign({ confirm: ranked[0].d > 40 }, ranked[0]) : null, near: ranked.slice(0, 3) };
  });
}

/* ---------------------------------------------------------------- delivery */
export function remux(src, out, poster) {
  const before = probeVideo(src);
  /* every stream the picture and the sound have: the first video and the first audio track (when the source has one, silent
     or not — its frames are part of the source), copied bit for bit */
  const args = ['-v', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?'];
  args.push('-c', 'copy', '-movflags', '+faststart', '-map_metadata', '-1', out);
  execFileSync('ffmpeg', args);
  const after = probeVideo(out);
  const bad = core.videoRegression(before, after);
  if (bad.length) { fs.unlinkSync(out); throw new Error('VIDEO QUALITY GUARD refused ' + path.basename(src) + ': ' + bad.join(' · ')); }
  if (poster) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0.5', '-i', out, '-frames:v', '1', '-q:v', '2', poster]);
  return { before, after };
}
/* responsive JPEGs for a role: the widths the role really shows (×1 and ×2), never above the source; each derivative must hold
   SSIM ≥ 0.985 against the source scaled to the same size (visually lossless), else it is written at a higher quality */
export function derive(src, role, outBase) {
  const m = readManifest(), r = m.roles[role]; if (!r) throw new Error('unknown role ' + role);
  const [sw] = execFileSync('magick', ['identify', '-format', '%w %h', src], { encoding: 'utf8' }).split(' ').map(Number);
  const widths = [...new Set(core.CLASSES.flatMap((c) => (r.px && r.px[c] ? [r.px[c][0], r.px[c][0] * 2] : [])).map((w) => Math.min(w, sw)))].sort((a, b) => a - b);
  const made = [];
  for (const w of widths) {
    const out = outBase + '-' + w + '.jpg';
    for (const q of [84, 88, 92, 95]) {
      execFileSync('magick', [src, '-auto-orient', '-strip', '-resize', w + 'x>', '-interlace', 'Plane', '-sampling-factor', q >= 92 ? '4:4:4' : '4:2:0', '-quality', String(q), out]);
      const ref = out + '.ref.png'; execFileSync('magick', [src, '-auto-orient', '-resize', w + 'x>', ref]);
      const r2 = spawnSync('ffmpeg', ['-hide_banner', '-i', ref, '-i', out, '-lavfi', 'ssim', '-f', 'null', '-'], { encoding: 'utf8' }); fs.unlinkSync(ref);
      const ssim = Number((/All:([\d.]+)/.exec(r2.stderr || '') || [])[1] || 0);
      if (ssim >= 0.985 || q === 95) { made.push({ file: out, w, q, ssim }); break; }
    }
  }
  return made;
}

/* ---------------------------------------------------------------- the plan */
const curIdsOf = (folder) => new Set(((folder && folder.files) || []).map((f) => f.id));
export function plan(inventory, command) {
  core.assertNoArchive(inventory);
  const m = readManifest();
  const numbers = Object.keys(m.collections);
  const scope = core.scopeOf(command || 'Synchronize media.', [...new Set([...numbers, ...inventory.folders.map((f) => f.no)])]);
  const out = [];
  for (const no of scope) {
    const rec = m.collections[no], cur = inventory.folders.find((f) => f.no === no);
    if (!cur) { out.push({ no, status: 'source folder missing', removed: (rec && rec.items || []).length }); continue; }
    const d = core.diffCollection(rec || { items: [] }, cur);
    /* what the contract already knows is waiting: pending (a slot the site has — the sync publishes it after composition and QA)
       and unresolved (an Owner question — the sync never guesses a placement) */
    const waiting = ((rec && rec.items) || []).filter((x) => curIdsOf(cur).has(x.driveId));
    out.push({ no, title: cur.title, status: rec ? d.status : 'new collection', pending: waiting.filter((x) => x.status === 'pending').length,
      unresolved: waiting.filter((x) => x.status === 'unresolved').length, question: (rec && rec.question) || null, counts: { unchanged: d.unchanged.length, changed: d.changed.length, renamed: d.renamed.length, touched: d.touched.length, added: d.added.length, removed: d.removed.length, replaced: d.replaced.length }, reordered: d.reordered,
      added: d.added.map((f) => f.title), removed: d.removed.map((r) => r.title), changed: d.changed.map((c) => c.current.title), renamed: d.renamed.map((c) => c.recorded.title + ' → ' + c.current.title) });
  }
  return out;
}

/* ---------------------------------------------------------------- the command line */
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : null; };
const rest = () => argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')) && a !== argv[0]);
if (import.meta.url === 'file://' + process.argv[1]) {
  const cmd = argv[0];
  if (cmd === 'plan') {
    const inv = JSON.parse(fs.readFileSync(opt('inventory'), 'utf8'));
    for (const c of plan(inv, opt('scope'))) console.log(c.no + ' · ' + (c.title || '') + ' · ' + c.status + (c.counts ? ' · ' + Object.entries(c.counts).filter(([, n]) => n).map(([k, n]) => k + ' ' + n).join(' · ') : '') + (c.reordered ? ' · reordered' : '') + (c.pending ? ' · pending ' + c.pending : '') + (c.unresolved ? ' · unresolved ' + c.unresolved + ' (Owner question: ' + c.question + ')' : ''));
  } else if (cmd === 'inspect') {
    for (const f of rest()) console.log(JSON.stringify(inspect(f)));
  } else if (cmd === 'match') {
    const srcs = rest(), locals = opt('local') ? fs.readFileSync(opt('local'), 'utf8').split('\n').filter(Boolean) : [];
    const res = match(fingerprints(srcs), fingerprints(locals));
    for (const r of res) console.log(path.basename(r.file) + ' → ' + (r.best ? r.best.file + ' (' + r.best.d + ')' : 'no website asset'));
  } else if (cmd === 'focal') {
    const m = readManifest(), role = m.roles[opt('role')]; if (!role) throw new Error('unknown role');
    for (const f of rest()) { const it = inspect(f); it.focal = core.suggestFocal(it, role.geometry); console.log(JSON.stringify({ file: f, focal: it.focal, safety: core.cropSafety(it, role.geometry) })); }
  } else if (cmd === 'derive') {
    const [src, base] = rest(); console.log(JSON.stringify(derive(src, opt('role'), base), null, 1));
  } else if (cmd === 'remux') {
    const [src, out, poster] = rest(); const r = remux(src, out, poster); console.log('remuxed losslessly · ' + r.after.width + '×' + r.after.height + ' · ' + r.after.fps + ' fps · ' + r.after.duration + ' s · audio ' + (r.after.audio ? 'yes' : 'no'));
  } else {
    console.log('usage: plan | inspect | match | focal | derive | remux — see docs/MEDIA-ASSET-AGENT.md'); process.exit(1);
  }
}
