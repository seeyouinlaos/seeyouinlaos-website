/* LIJIANG · ONE FILM (Owner, 29 Sep 2026 · Drive folder 015, which holds "000 - Lijiang_Main_Video 01" alone): the Lijiang chapter
   of the Destinations page shows exactly one film — Main 01, the Owner's bytes, muted first, Play / Pause and Sound on — and
   nothing of the four further films (Main 02 – 05) is served, drawn or left as an empty frame. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { src, ROOT } from './sandbox.mjs';

const section = () => { const d = src('destination.html'); const i = d.indexOf('<section class="a-sec a-dest" id="lijiang">'); return d.slice(i, d.indexOf('</section>', i)); };

test('THE CHAPTER · exactly one film, Main 01, in the site\'s one clip component (muted first, Play / Pause, Sound on)', () => {
  const s = section().replace(/<!--[\s\S]*?-->/g, '');
  assert.equal((s.match(/<video/g) || []).length, 1, 'one film');
  assert.equal((s.match(/class="am a-clip"/g) || []).length, 1, 'one clip frame');
  assert.doesNotMatch(s, /class="a-clips"|lijiang-main-0[2-5]/, 'no rail, no further film, no poster left behind');
  assert.match(s, /data-clip="lijiang-main-01" data-clip-state="paused" data-clip-audio="off"/);
  assert.match(s, /<video class="a-clip-video" playsinline loop preload="metadata" poster="assets\/images\/city\/004-lijiang-main-01-poster\.jpg" data-src="assets\/video\/lijiang-main-01\.mp4"/);
  assert.doesNotMatch(s, /<video[^>]*\s(autoplay|muted="false")/, 'never an audible autoplay');
  assert.equal((s.match(/data-clip-play/g) || []).length, 1); assert.equal((s.match(/data-clip-sound/g) || []).length, 1);
});

test('THE FILES AND THE RECORD · Main 02 – 05 and their posters are gone from the site; the manifest says why; Main 01 is the folder\'s one film', () => {
  for (const n of [2, 3, 4, 5]) {
    assert.equal(existsSync(join(ROOT, `assets/video/lijiang-main-0${n}.mp4`)), false);
    assert.equal(existsSync(join(ROOT, `assets/images/city/004-lijiang-main-0${n}-poster.jpg`)), false);
  }
  assert.ok(existsSync(join(ROOT, 'assets/video/lijiang-main-01.mp4')));
  assert.doesNotMatch(src('src/media-sizes.js'), /lijiang-main-0[2-5]/);
  const M = JSON.parse(src('src/media/manifest.json'));
  const all = ['015', '105'].flatMap((k) => M.collections[k].items);
  const films = all.filter((it) => /lijiang-main-0[2-5]/.test((it.asset || '') + (it.formerAsset || '')));
  assert.equal(films.length, 8, 'the folder\'s four and the Experiences library\'s four copies');
  for (const it of films) { assert.equal(it.status, 'excluded'); assert.equal(it.asset, undefined); assert.match(it.note, /ONE film, Main 01/); }
  const main = M.collections['015'].items.find((it) => it.asset === 'assets/video/lijiang-main-01.mp4');
  assert.equal(main.driveId, '1RM13DkQ3hNoefJnl35S5THw_gefrXhze'); assert.equal(main.status, 'synced');
  assert.equal(M.collections['015'].items.filter((it) => it.status === 'synced' && it.kind === 'video').length, 1, 'one film is synced from 015');
});
