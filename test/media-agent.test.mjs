/* THE MEDIA ASSET AGENT (Owner, 26 Sep 2026): the site-wide media workflow — the Owner's numbered Drive folders 001–030 as one
   contract (src/media/manifest.json), the pure rules (src/media/core.mjs), the engine (src/media/agent.mjs) and the Media QA gate
   (src/media/media-qa.mjs, release gate M2). docs/MEDIA-ASSET-AGENT.md is the manual. These tests hold the rules the Owner set:
   "999 - Archive" is never reached, a source's aspect never redefines a layout, a crop is looked at, a film is never downgraded. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, src } from './sandbox.mjs';
import * as core from '../src/media/core.mjs';

const M = JSON.parse(src('src/media/manifest.json'));
const items = () => Object.entries(M.collections).flatMap(([no, c]) => (c.items || []).map((it) => ({ no, c, it })));

test('ARCHIVE · "999 - Archive" is recognised by name, excluded in the contract, and an inventory that reaches it is refused before anything else', () => {
  for (const t of ['999 - Archive', '999', 'Archive', 'old archive 2025', ' 999 - anything']) assert.ok(core.isArchive(t), t);
  for (const t of ['001 - Main -  Hero ', '030 - The Journey - Accommodation · Bangkok', '099 - Other']) assert.ok(!core.isArchive(t), t);
  assert.ok(M.library.excluded.some((t) => core.isArchive(t)), 'the contract records the exclusion');
  assert.throws(() => core.assertNoArchive({ folders: [{ no: '999', title: '999 - Archive', files: [] }] }), /ARCHIVE RULE/);
  assert.throws(() => core.assertNoArchive({ folders: [{ no: '005', title: '005 - Main', files: [{ path: '005/999 - Archive/x.jpg' }] }] }), /ARCHIVE RULE/);
  assert.equal(core.assertNoArchive({ folders: [{ no: '005', title: '005 - Main', files: [{ path: '005/001 - Before Wedding/x.jpg' }] }] }), true);
  for (const { no, c, it } of items()) { assert.ok(!core.isArchive(c.title), no); assert.ok(!core.isArchive(it.path), no + ' ' + it.title); }
});

test('COMMANDS · "Synchronize media." is every collection, "Synchronize 152." one, "Synchronize 001–030." a range, lists work too', () => {
  const nums = ['001', '002', '005', '011', '013', '030', '152'];
  assert.deepEqual(core.scopeOf('Synchronize media.', nums), nums);
  assert.deepEqual(core.scopeOf('Synchronize 152.', nums), ['152']);
  assert.deepEqual(core.scopeOf('Synchronize 001–030.', nums), ['001', '002', '005', '011', '013', '030']);
  assert.deepEqual(core.scopeOf('Synchronize 001-005', nums), ['001', '002', '005']);
  assert.deepEqual(core.scopeOf('Synchronize 011, 013', nums), ['011', '013']);
  assert.deepEqual(core.scopeOf('Synchronize 12', nums), [], 'an unknown number selects nothing, never everything');
});

test('CHANGE DETECTION · by the stable Drive id: changed bytes, a rename, a touch, added, removed, replaced, reordered', () => {
  const rec = { order: 'title-ascending', items: [
    { driveId: 'a', title: '001 - x', size: 10, modifiedTime: 't1' }, { driveId: 'b', title: '002 - x', size: 20, modifiedTime: 't1' }, { driveId: 'c', title: '003 - x', size: 30, modifiedTime: 't1' }] };
  const f = (id, title, size, mt) => ({ id, title, size, modifiedTime: mt || 't1', mimeType: 'image/jpeg' });
  let d = core.diffCollection(rec, { files: [f('a', '001 - x', 10), f('b', '002 - x', 20), f('c', '003 - x', 30), { id: 'n', title: 'notes', mimeType: 'application/pdf' }] });
  assert.equal(d.status, 'unchanged', 'a non-media file is not the collection'); assert.equal(d.unchanged.length, 3);
  d = core.diffCollection(rec, { files: [f('a', '001 - x', 11, 't2'), f('b', '002 - x', 20), f('c', '003 - x', 30)] });
  assert.equal(d.changed.length, 1); assert.equal(d.status, 'changed');
  d = core.diffCollection(rec, { files: [f('a', '001 - Hero', 10, 't2'), f('b', '002 - x', 20), f('c', '003 - x', 30)] });
  assert.equal(d.renamed.length, 1); assert.equal(d.changed.length, 0); assert.equal(d.status, 'renamed', 'same bytes, new title: a rename, not a new picture');
  d = core.diffCollection(rec, { files: [f('a', '001 - x', 10, 't9'), f('b', '002 - x', 20), f('c', '003 - x', 30)] });
  assert.equal(d.touched.length, 1); assert.equal(d.status, 'renamed');
  d = core.diffCollection(rec, { files: [f('a', '001 - x', 10), f('b', '002 - x', 20), f('d', '003 - y', 33)] });
  assert.equal(d.added.length, 1); assert.equal(d.removed.length, 1); assert.equal(d.replaced.length, 1, 'one out, one in: a replacement in the same place');
  d = core.diffCollection(rec, { files: [f('a', '004 - x', 10), f('b', '002 - x', 20), f('c', '003 - x', 30)] });
  assert.equal(d.reordered, true, 'a renumbered title moves a title-ordered collection');
  d = core.diffCollection(Object.assign({}, rec, { order: 'explicit' }), { files: [f('a', '004 - x', 10), f('b', '002 - x', 20), f('c', '003 - x', 30)] });
  assert.equal(d.reordered, false, 'an explicit order (the Hero, 26 Sep 2026) never moves by a rename');
  /* subfolders keep their own order: a title that sorts earlier in another subfolder is not a reorder */
  const sub = { order: 'title-ascending', items: [{ driveId: 'p', title: '002 - B', size: 1 }, { driveId: 'q', title: '001 - W', size: 1 }] };
  d = core.diffCollection(sub, { files: [Object.assign(f('p', '002 - B', 1), { path: '005/001 - Before' }), Object.assign(f('q', '001 - W', 1), { path: '005/002 - Wedding' })] });
  assert.equal(d.reordered, false);
});

test('MIXED ASPECT · the frame is the component\'s, never the source\'s: what cover shows of a landscape in a portrait frame and a portrait in a landscape frame', () => {
  assert.deepEqual(core.visibleRegion(1600, 900, 16 / 9, '50% 50%'), { x: 0, y: 0, w: 1, h: 1 });
  const l = core.visibleRegion(1600, 1200, 0.75, '72% 50%');   /* the Bangkok alley train: 4:3 in the 3:4 card */
  assert.ok(Math.abs(l.w - 0.5625) < 1e-9 && l.h === 1 && Math.abs(l.x - 0.4375 * 0.72) < 1e-9);
  const p = core.visibleRegion(1293, 1600, 1.5, '50% 90%');    /* the Kempinski lobby: a portrait in the 3:2 desktop gallery */
  assert.ok(p.w === 1 && Math.abs(p.h - (1293 / 1600) / 1.5) < 1e-9 && Math.abs(p.y - (1 - p.h) * 0.9) < 1e-9);
  /* every role carries its measured frame at all four classes, and no role takes its aspect from a source */
  for (const [k, r] of Object.entries(M.roles)) {
    if (r.playback) continue;
    for (const c of core.CLASSES) assert.ok(r.geometry && r.geometry[c] > 0, k + ' ' + c);
  }
});

test('FOCAL POINTS · a head the centre would cut is found, the suggested focal point keeps it, and the proof is the same crop rule', () => {
  const geo = { p: 0.75, tp: 0.75, tl: 0.75, d: 0.75 };
  const portraitInCard = { w: 1600, h: 1200, vision: { faces: [{ x: 0.82, y: 0.3, w: 0.08, h: 0.12 }], salient: { x: 0.7, y: 0.2, w: 0.25, h: 0.6 } } };
  const bad = core.cropSafety(Object.assign({}, portraitInCard, { focal: { p: '50% 50%', tp: '50% 50%', tl: '50% 50%', d: '50% 50%' } }), geo);
  assert.equal(bad.length, 4); assert.equal(bad[0].type, 'HEAD_CLIPPED');
  const focal = core.suggestFocal(portraitInCard, geo);
  assert.match(focal.p, /^100% 50%$|^9\d% 50%$/);
  assert.deepEqual(core.cropSafety(Object.assign({}, portraitInCard, { focal }), geo), [], 'the suggestion passes the same rule');
  /* a portrait source in a landscape frame: the vertical focal point */
  const tall = { w: 1000, h: 1500, vision: { faces: [{ x: 0.45, y: 0.05, w: 0.1, h: 0.08 }] } };
  const f2 = core.suggestFocal(tall, { p: 1.5, tp: 1.5, tl: 1.5, d: 1.5 });
  assert.equal(f2.d, '50% 0%'); assert.deepEqual(core.cropSafety(Object.assign({}, tall, { focal: f2 }), { p: 1.5, tp: 1.5, tl: 1.5, d: 1.5 }), []);
});

test('FOCAL POINTS ON THE SITE · the decisions recorded in the contract are the ones the pages show (portrait and landscape cases)', () => {
  const slot = (asset, role) => items().map(({ it }) => it).filter((it) => it.asset === asset).flatMap((it) => it.slots || []).find((s) => s.role === role);
  /* portrait source, portrait card: Patuxai from above keeps the whole oval park and its fountain */
  assert.equal(slot('assets/images/city/002-vientiane-g02-patuxai-from-above.jpg', 'destination-gallery-item').focal, '50% 50%');
  assert.match(src('destination.html'), /002-vientiane-g02-patuxai-from-above\.jpg" data-focal="50% 50%"/);
  assert.match(src('assets/refgal.js'), /img\.style\.objectPosition = img\.getAttribute\('data-focal'\)/);
  /* portrait source, landscape gallery: the Kempinski lobby keeps the walking figure */
  assert.equal(slot('assets/images/kempinski/lobby-palms.jpg', 'product-gallery').focal, '50% 90%');
  assert.match(src('assets/stay-media.js'), /lobby-palms\.jpg","kind":"lobby","caption":"[^"]+","focal":"50% 90%"/);
  assert.match(src('journeys.html'), /background-position:'\+x\[4\]/);
  /* landscape source, the widest band: the arcades keep their arches */
  assert.match(src('voyage.html'), /heritage-arches-dusk\.jpg\);background-position:50% 30%"/);
  /* landscape source, portrait card: the alley train stays aimed (EDIT 7) */
  assert.equal(slot('assets/images/city/001-bangkok-g04-alley-train.jpg', 'destination-gallery-item').focal, '72% 50%');
});

test('VIDEO · never worse than the source: duration, frames, frame rate, resolution, sound and bitrate — a lossless remux is the default', () => {
  const s = { duration: 17.57, videoFrames: 527, audioFrames: 381, fps: 30, width: 720, height: 960, codec: 'h264', bitrate: 2610388, audio: true, audioBitrate: 39197 };
  assert.deepEqual(core.videoRegression(s, Object.assign({}, s)), []);
  const has = (o, re) => core.videoRegression(s, Object.assign({}, s, o)).some((x) => re.test(x));
  assert.ok(has({ duration: 15 }, /DURATION/), 'shortened'); assert.ok(has({ videoFrames: 500 }, /VIDEO FRAMES/), 'frames removed');
  assert.ok(has({ audioFrames: 0, audio: false }, /AUDIO/), 'sound stripped'); assert.ok(has({ fps: 25 }, /FRAME RATE/));
  assert.ok(has({ width: 540, height: 720 }, /RESOLUTION/)); assert.ok(has({ bitrate: 1586358 }, /VIDEO BITRATE/), 'the downgrade Media QA found in kunming-card.mp4');
  assert.ok(has({ codec: 'hevc', bitrate: 1500000 }, /RE-ENCODED BELOW/), 'a smaller re-encode needs a proven perceptual equal');
  assert.deepEqual(core.videoRegression(s, Object.assign({}, s, { codec: 'hevc', bitrate: 1500000, quality: { vmaf: 96.2 } })), []);
  assert.equal(core.videoRegression(s, Object.assign({}, s, { duration: 17.6 })).length, 0, 'an AAC priming offset is not a cut');
  assert.deepEqual(core.filmControls({ audio: true }), { play: true, sound: true });
  assert.deepEqual(core.filmControls({ audio: false }), { play: true, sound: false });
  /* every mapped film keeps its source's sound in the file, and the component decides what plays */
  for (const { it } of items().filter((x) => x.it.kind === 'video' && x.it.status === 'synced')) assert.ok(existsSync(join(ROOT, it.asset)), it.asset);
  assert.ok(M.playback && M.playback.ambient && M.playback.clip && M.playback.show);
  assert.match(src('assets/aman.js'), /v\.muted = true; v\.defaultMuted = true;/, 'an ambient film never speaks');
  assert.match(src('assets/clip.js'), /v\.muted = userGesture \? !wantSound : true;/, 'a clip never starts audibly by itself');
  assert.match(src('assets/hero-show.js'), /if \(!byGuest\) v\.muted = true;/, 'the Hero never starts audibly by itself');
});

test('RESOLUTION · downscaling for delivery is expected, upscaling never: a source below the role\'s largest box at density 2 is flagged', () => {
  const role = { px: { p: [342, 274], tp: [300, 200], tl: [360, 240], d: [420, 280] } };
  assert.equal(core.resolutionNeed({ w: 2000, h: 1334 }, role).ok, true);
  const r = core.resolutionNeed({ w: 700, h: 496 }, role);
  assert.equal(r.ok, false); assert.deepEqual(r.need, [840, 560]); assert.equal(r.scale, 1.2);
});

test('THE CONTRACT · 001–030 mapped from the Drive library, every synced asset on disk with its slots, every question named, no Drive id on a served file', () => {
  const nos = Object.keys(M.collections);
  assert.ok(nos.length >= 22 && nos.every((n) => /^0(0\d|1\d|2\d|30)$/.test(n)), nos.join());
  assert.equal(M.collections['001'].order, 'explicit'); assert.match(M.collections['001'].orderNote, /LAST/);
  let synced = 0;
  for (const { no, c, it } of items()) {
    assert.ok(it.driveId && /^(image|video)$/.test(it.kind), no + ' ' + it.title);
    assert.ok(['synced', 'pending', 'unresolved'].includes(it.status), no + ' ' + it.title + ' ' + it.status);
    if (it.status === 'synced') {
      synced++; assert.ok(existsSync(join(ROOT, it.asset)), it.asset);
      for (const s of it.slots || []) assert.ok(M.roles[s.role] && M.roles[s.role].routes.includes(s.route), no + ' ' + it.asset + ' ' + s.route + ' ' + s.role);
    }
    if (it.status === 'unresolved') assert.ok(c.question, no + ': an unresolved source needs the Owner question');
  }
  assert.ok(synced >= 80, 'synced ' + synced);
  assert.doesNotMatch(src('assets/venue-data.js'), /drive: '/, 'the venue record carries no Drive id (it is a served file)');
  assert.ok(!M.library.folderId && Object.values(M.collections).every((c) => !c.folderId), 'folder ids stay in the local src/media-library.private.json');
  assert.doesNotMatch(src('src/media/manifest.json'), /drive\.google|docs\.google/, 'no Drive URL in the contract');
  assert.match(src('.gitignore'), /^src\/\*\.private\.json$/m);
  for (const f of ['.assetsignore']) { const ig = src(f); assert.match(ig, /^src$/m); assert.match(ig, /^docs$/m); }
});

test('MEDIA QA (gate M2) passes on this tree, and the release check runs it', () => {
  const r = spawnSync(process.execPath, [join(ROOT, 'src/media/media-qa.mjs')], { encoding: 'utf8' });
  assert.equal(r.status, 0, (r.stdout || '').split('\n').filter((l) => /^FAIL/.test(l)).slice(0, 5).join('\n'));
  assert.match(r.stdout, /MEDIA QA PASSED/);
  assert.match(src('src/release-check.cjs'), /gate\('M2', 'Media QA: archive excluded, sources honoured, films never downgraded, crops looked at, no Drive id served'/);
  assert.match(src('src/release-check.cjs'), /gate\('V1', 'Card clips local, H\.264, faststart, always muted, poster-first'/);
  assert.doesNotMatch(src('src/release-check.cjs'), /size > 4\.5 \* 1024 \* 1024/, 'no size cap that would force a downgrade');
});
