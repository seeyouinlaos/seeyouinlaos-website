#!/usr/bin/env node
/* MEDIA QA (Owner, 26 Sep 2026 · the Media Asset Agent). Media correctness of every collection in src/media/manifest.json;
 * the Layout QA (src/layout-qa/) stays the authority on page geometry and is not duplicated here.
 *
 *   node src/media/media-qa.mjs                      the static gate (release gate M2): exit 1 on any failure
 *   node src/media/media-qa.mjs --rendered [--origin URL]   + every film played in WebKit and Google Chrome (read-only)
 *
 * FAILS on: an archive path in the contract · a repeated source id · a mapped asset missing on disk or unused by the site ·
 * a video worse than its recorded source (duration, frame rate, resolution, audio, bitrate) · a sound control on a film
 * without audio or none on a film with it · a film not delivered through the byte-range route · a head or the subject cut
 * by a slot's crop at any viewport class · a Drive id on a served page · a retired asset still referenced.
 * REPORTS: insufficient source resolution (flagged, never silently upscaled) · orphaned local media. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as core from './core.mjs';
import { probeVideo } from './agent.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const M = JSON.parse(read('src/media/manifest.json'));
const fails = [], reports = [];
const fail = (no, what, why) => fails.push((no ? no + ' · ' : '') + what + ' — ' + why);

/* the served text: every page, script, stylesheet and data file the Worker hands out */
const served = [];
const walk = (d) => { for (const n of fs.readdirSync(path.join(ROOT, d))) { const p = path.join(d, n); const st = fs.statSync(path.join(ROOT, p)); if (st.isDirectory()) { if (!/^(i18n)$/.test(n)) walk(p); } else if (/\.(js|css|json|html)$/.test(n)) served.push(p); } };
for (const f of fs.readdirSync(ROOT)) if (/\.html$/.test(f)) served.push(f);
walk('assets');
const text = Object.fromEntries(served.map((f) => [f, read(f)]));
const usedBy = (asset) => {
  const b = path.basename(asset), stem = b.replace(/\.[a-z0-9]+$/i, ''), base = stem.replace(/-\d{3,4}$/, '');   /* a responsive width (pic('name', [1000, 1600])) */
  return served.filter((f) => text[f].includes(b) || text[f].includes('/' + stem + '.') || text[f].includes("'" + stem + "'") || (base !== stem && text[f].includes("pic('" + base + "'")));
};

/* 1 · THE ARCHIVE */
if (!(M.library && (M.library.excluded || []).some((t) => core.isArchive(t)))) fail('', 'library', 'the archive exclusion is not recorded');
for (const [no, c] of Object.entries(M.collections)) {
  if (core.isArchive(c.title)) fail(no, c.title, 'an archive folder in the contract');
  for (const it of c.items || []) if (core.isArchive(it.path)) fail(no, it.title, 'a source inside an archive path');
}

/* 2 · SOURCES, ASSETS, USE */
const seen = new Map();
const films = [];
for (const [no, c] of Object.entries(M.collections)) {
  for (const it of c.items || []) {
    const where = (it.title || it.driveId);
    if (!it.driveId) fail(no, where, 'no stable Drive id');
    else if (seen.has(it.driveId) && !it.sharedWith) fail(no, where, 'the same source already stands in ' + seen.get(it.driveId) + ' (declare sharedWith if intended)');
    seen.set(it.driveId, no);
    if (!/^(image|video)$/.test(it.kind || '')) fail(no, where, 'kind must be image or video');
    const mapped = c.status === 'synced' || it.status === 'mapped' || it.status === 'synced';
    if (!mapped) continue;
    const assets = [it.asset, ...(it.assets || [])].filter(Boolean);
    for (const a of assets) {
      if (!fs.existsSync(path.join(ROOT, a))) { fail(no, where, a + ' is missing on disk'); continue; }
      if (!usedBy(a).length) fail(no, where, a + ' is mapped but no page uses it');
    }
    if (it.kind === 'video') {
      if (it.poster && !fs.existsSync(path.join(ROOT, it.poster))) fail(no, where, 'the poster ' + it.poster + ' is missing');
      const a = assets[0];
      if (a && fs.existsSync(path.join(ROOT, a))) {
        const out = probeVideo(path.join(ROOT, a));
        const src = { duration: it.duration, width: it.width, height: it.height, audio: it.audio, fps: it.fps, codec: it.codec, bitrate: it.bitrate, audioBitrate: it.audioBitrate };
        for (const v of core.videoRegression(src, out)) fail(no, where, 'VIDEO QUALITY: ' + v);
        if (!!it.audio !== !!out.audio) fail(no, where, 'the audio track is ' + (out.audio ? 'present' : 'absent') + ' but recorded as ' + (it.audio ? 'present' : 'absent'));
        films.push({ no, it, asset: a, role: it.role || c.role });
      }
    }
  }
}

/* 3 · FILM DELIVERY AND CONTROLS */
const heroHtml = text['index.html'] || '';
for (const f of films) {
  const name = path.basename(f.asset);
  if ((f.role || '') === 'hero-slide') {
    const m = new RegExp('data-hero-video="media/' + name.replace('.', '\\.') + '" data-audio="([01])"').exec(heroHtml);
    if (!m) fail(f.no, f.it.title, 'the Hero film is not delivered through the byte-range route (media/' + name + ')');
    else if ((m[1] === '1') !== !!f.it.audio) fail(f.no, f.it.title, 'the sound control would ' + (f.it.audio ? 'be missing on a film with audio' : 'appear on a silent film'));
  }
  /* every other place a film stands, by its role's playback (manifest.playback): ambient = a data-video card or chapter loop
     (always muted, no controls); clip = a [data-clip] frame whose sound button exists only with a meaningful audio track */
  for (const s of f.it.slots || []) {
    const pb = (M.roles[s.role] || {}).playback, page = text[s.route.replace(/^\//, '')] || '';
    if (pb === 'ambient' && !page.includes('data-video="assets/video/' + name + '"')) fail(f.no, f.it.title + ' @ ' + s.route, 'the ambient film is not declared there (data-video)');
    if (pb === 'clip') {
      const at = page.indexOf('data-src="assets/video/' + name + '"'); if (at < 0) { fail(f.no, f.it.title + ' @ ' + s.route, 'the clip is not declared there'); continue; }
      const frame = page.slice(page.lastIndexOf('data-clip', at), page.indexOf('</figure>', at) > 0 ? page.indexOf('</figure>', at) : at + 2000);
      if (!/data-clip-play/.test(frame)) fail(f.no, f.it.title + ' @ ' + s.route, 'a film without Play / Pause');
      if (/data-clip-sound/.test(frame) !== !!f.it.audio) fail(f.no, f.it.title + ' @ ' + s.route, f.it.audio ? 'a film with sound and no Sound on / Mute' : 'a Sound control on a silent film');
    }
  }
}
if (!/replace\(\/\^\(\?:\\\.\\\/\)\?assets\\\/video\\\/\(\[a-z0-9-\]\+\\\.mp4\)\$\/, 'media\/\$1'\)/.test(text['assets/clip.js'] || '')) fail('', 'assets/clip.js', 'the editorial clip does not fetch through the byte-range route');
if (!/v\.muted = userGesture \? !wantSound : true;/.test(text['assets/clip.js'] || '')) fail('', 'assets/clip.js', 'an editorial clip could start audibly by itself');
if (!/s\.src = src\.replace\(/.test(text['assets/aman.js'] || '')) fail('', 'assets/aman.js', 'the ambient card films do not fetch through the byte-range route');
if (!/v\.muted = true; v\.defaultMuted = true;/.test(text['assets/aman.js'] || '')) fail('', 'assets/aman.js', 'an ambient film could speak (it keeps its source sound in the file)');
if (!/if \(!byGuest\) v\.muted = true;/.test(text['assets/hero-show.js'] || '')) fail('', 'assets/hero-show.js', 'a Hero film could start audibly by itself');

/* 4 · COMPOSITION: every head and the subject inside the slot's frame at every class
   each place a synced asset stands (item.slots: route · role · the object-position guests see there) is judged on the
   DISPLAYED asset (its own size, its detected heads and subject). A finding is resolved in one of two ways only: a new
   focal point (decided by looking, with its focalWhy) or a recorded visual review (item.review['route role'] = { verdict:
   'kept', why }) — the agent never silently accepts a heuristic, and never lets one move a picture unseen. */
const focalDefault = (role) => (M.roles[role] && M.roles[role].focalDefault) || '50% 50%';
const css = Object.entries(text).filter(([f]) => /\.css$/.test(f)).map(([, t]) => t).join('\n');
let reviewed = 0, refocused = 0;
for (const [no, c] of Object.entries(M.collections)) {
  for (const it of c.items || []) {
    if (!(c.status === 'synced' || it.status === 'mapped' || it.status === 'synced') || it.kind !== 'image') continue;
    for (const s of it.slots || []) {
      const role = M.roles[s.role]; if (!role) { fail(no, it.title, 'slot role ' + s.role + ' is not in the contract'); continue; }
      const key = s.route + ' ' + s.role, focal = s.focal || focalDefault(s.role);
      /* the Hero's focal points are per viewport class (item.focal), written by src/build-hero.cjs and held by its --check */
      const perClass = s.role === 'hero-slide' && it.focal && typeof it.focal === 'object' ? it.focal : null;
      /* the site must actually show the recorded focal point */
      if (!perClass && focal !== focalDefault(s.role)) {
        refocused++;
        const b = path.basename(it.asset || '');
        const inCss = css.includes('[src$="' + b + '"] { object-position: ' + focal + ';');
        const inPage = Object.entries(text).some(([f, t]) => /\.html$/.test(f) && (t.includes(b + '" data-focal="' + focal + '"') || t.includes(b + ');background-position:' + focal + '"')));
        const inStay = new RegExp(b.replace(/[.]/g, '\\.') + '"[^}]*"focal":"' + focal + '"').test(text['assets/stay-media.js'] || '');
        if (!inCss && !inPage && !inStay) fail(no, it.title + ' @ ' + key, 'the recorded focal point ' + focal + ' is not what the site shows');
        if (!s.focalWhy && !inCss) fail(no, it.title + ' @ ' + key, 'a focal point without its reason (focalWhy)');
      }
      if (role.crop === 'none' || !it.vision) continue;
      const shown = Object.assign({}, it, it.display || {}, { focal: perClass || { p: focal, tp: focal, tl: focal, d: focal } });
      if (!shown.w) continue;
      const found = core.cropSafety(shown, role.geometry);
      const rv = it.review && it.review[key];
      /* a review holds for the focal point it was judged at: moving the picture needs a new look */
      if (found.length && !(rv && rv.verdict === 'kept' && rv.why && JSON.stringify(rv.focal) === JSON.stringify(perClass || focal))) for (const x of found) fail(no, it.title + ' @ ' + key, x.type + ' · ' + x.detail + (rv && rv.focal !== focal ? ' — reviewed at ' + rv.focal + ', shown at ' + focal : '') + ' — refocus or record the visual review');
      if (found.length && rv) reviewed++;
      const r = core.resolutionNeed(shown, role);
      if (!r.ok) reports.push(no + ' · ' + it.title + ' @ ' + s.role + ' — shown ' + shown.w + '×' + shown.h + (it.w && it.w > shown.w ? ' (the Drive source has ' + it.w + '×' + it.h + ': a sync can deliver more)' : '') + ' below ' + r.need.join('×') + ' at density 2: flagged, never upscaled');
    }
  }
}

/* 5 · NOTHING PRIVATE ON A PAGE, NOTHING RETIRED IN USE */
/* the folder ids live only in the local, git-ignored src/media-library.private.json — checked too when it is present */
const priv = (() => { try { return JSON.parse(read('src/media-library.private.json')); } catch (e) { return { collections: {} }; } })();
const ids = [...seen.keys(), priv.library, ...Object.values(priv.collections || {})].filter(Boolean);
if (M.library.folderId || Object.values(M.collections).some((c) => c.folderId)) fail('', 'src/media/manifest.json', 'a folder id in the committed contract (it belongs in src/media-library.private.json)');
for (const f of served) for (const id of ids) if (text[f].includes(id)) { fail('', f, 'carries a Drive id'); break; }
for (const r of M.retired || []) { const u = usedBy(r.asset).filter((f) => !/^assets\/(experience-galleries|stay-media)\.js$/.test(f) || true); if (u.length) fail('', r.asset, 'retired (' + r.why + ') but still referenced by ' + u.join(', ')); }

/* 5b · GROUPED MEDIA: a role that is one half of a composition names its group, and the layout contract audits that group
   (src/layout-contract.cjs · groups — row, weight, member share, height, continuity); two valid photographs can still be an
   invalid composition */
{
  const { createRequire } = await import('module');
  const LC = createRequire(import.meta.url)('../layout-contract.cjs');
  const groups = new Set((LC.groups || []).map((g) => g.sel));
  for (const [k, r] of Object.entries(M.roles)) if (r.group && !groups.has(r.group)) fail('', 'role ' + k, 'grouped media (' + r.group + ') that the layout contract does not audit as a group');
  if (!Object.values(M.roles).some((r) => r.group)) fail('', 'roles', 'no grouped-media role in the contract');
}

/* 6 · ORPHANS (reported) */
for (const d of M.ownedDirs || []) {
  const dir = path.join(ROOT, d); if (!fs.existsSync(dir)) continue;
  const orphan = fs.readdirSync(dir).filter((n) => /\.(jpe?g|png|webp|avif|mp4)$/i.test(n)).filter((n) => !usedBy(d + '/' + n).length);
  if (orphan.length) reports.push(d + ' · ' + orphan.length + ' local file(s) no page uses: ' + orphan.slice(0, 6).join(', ') + (orphan.length > 6 ? ' …' : ''));
}

/* 7 · RENDERED: every film played, read-only */
async function rendered(origin) {
  const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const out = [];
  for (const [engine, opts] of [['webkit', {}], ['chrome', { channel: 'chrome' }]]) {
    const b = await (engine === 'webkit' ? pw.webkit : pw.chromium).launch(opts);
    for (const vp of [[390, 844], [1440, 900]]) {
      const p = await b.newPage({ viewport: { width: vp[0], height: vp[1] } }); await p.goto(origin + '/'); await p.waitForTimeout(3000);
      const s = await p.evaluate(() => { const f = document.querySelector('[data-hero-show]'); if (!f) return null; const v = f.querySelector(':scope > video.a-hero-video'); const c = document.querySelector('[data-hero-ctl]');
        return { playing: !!v && !v.paused, muted: !!v && v.muted, audio: f.getAttribute('data-audio') === '1', ctl: !!c && !c.hidden, sound: !!c && !c.querySelector('[data-hero-sound]').hidden }; });
      if (s) { if (s.playing && !s.muted) out.push(engine + ' ' + vp[0] + ': the first Hero film plays audibly by itself'); if (!s.ctl) out.push(engine + ' ' + vp[0] + ': no Play / Pause on the Hero film'); if (s.sound !== s.audio) out.push(engine + ' ' + vp[0] + ': sound control does not follow the audio track'); }
      await p.close();
    }
    await b.close();
  }
  /* the grouped media, rendered densely (both orientations, both engines, both languages): src/layout-qa/composition.mjs */
  const comp = await (await import('../layout-qa/composition.mjs')).audit({ origin });
  for (const v of comp.violations.slice(0, 20)) out.push('composition ' + v.type + ' · ' + v.route + ' ' + v.width + ' ' + v.orientation + ' ' + v.engine + '/' + v.lang + ': ' + v.actual);
  for (const f of films) {
    const r = await fetch(origin + '/media/' + path.basename(f.asset), { headers: { Range: 'bytes=0-99' } });
    if (r.status !== 206) out.push('media/' + path.basename(f.asset) + ' answers ' + r.status + ' to a byte range (Safari needs 206)');
    await r.arrayBuffer();
  }
  return out;
}

const argv = process.argv.slice(2);
if (argv.includes('--rendered')) { const o = (argv[argv.indexOf('--origin') + 1] || 'http://127.0.0.1:8788'); for (const x of await rendered(o)) fail('', 'rendered', x); }
const total = Object.values(M.collections).reduce((n, c) => n + (c.items || []).length, 0);
const mapped = Object.values(M.collections).reduce((n, c) => n + (c.items || []).filter((it) => c.status === 'synced' || it.status === 'mapped' || it.status === 'synced').length, 0);
for (const r of reports) console.log('REPORT ' + r);
for (const f of fails) console.log('FAIL ' + f);
console.log((fails.length ? 'MEDIA QA FAILED: ' + fails.length + ' problem(s)' : 'MEDIA QA PASSED') + ' · ' + Object.keys(M.collections).length + ' collections · ' + total + ' sources · ' + mapped + ' mapped · ' + films.length + ' films checked · ' + reports.length + ' report(s)');
process.exit(fails.length ? 1 : 0);
