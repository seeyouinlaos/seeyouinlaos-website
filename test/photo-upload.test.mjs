/* ============================================================================
   THE PROFILE PHOTO UPLOAD (Owner report, 24 Sep 2026): "The photo could not be
   saved. Nothing was stored — please try again." The Worker never refused these
   uploads (no exception, no failed store, no refusal wording — a refusal names
   itself: 401 "open your invitation once more", 503 "cannot keep a photo"). The
   generic words come from the one branch where the page received NO answer:
   the request was lost on the way (a mobile connection dropped while the guest
   was in the photo picker, an edge error page instead of the Worker's answer).
   The upload is idempotent (one key per guest, the same bytes), so a lost
   request is sent once more for the same session; a refusal is never repeated,
   a session that moved on is never written for, and there is never a loop.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { page, src, PEGGY, STEFFIE } from './sandbox.mjs';

/* a browser with avatar.js loaded: the picture decodes, the canvas gives a small JPEG */
function browser(fetch, auth) {
  const w = page({ auth: auth || PEGGY, fetch, modules: [] });
  w.URL = { createObjectURL: () => 'blob:x', revokeObjectURL: () => {} };
  w.Image = class { set src(v) { const self = this; w.setTimeout(() => { self.naturalWidth = 1200; self.naturalHeight = 900; self.onload(); }); } };
  w.document.createElement = () => ({ getContext: () => ({ drawImage() {} }), toBlob: (cb) => cb({ size: 48000, tag: 'jpeg' }) });
  vm.runInContext(src('assets/avatar.js'), w, { filename: 'assets/avatar.js' });
  return w;
}
const stored = (at) => Promise.resolve({ status: 200, ok: true, json: async () => ({ ok: true, at, bytes: 48000, type: 'image/jpeg' }) });
const lost = () => Promise.reject(new TypeError('Load failed'));
const PHOTO = { size: 3 * 1024 * 1024, type: 'image/jpeg' };

test('PHOTO UPLOAD · a request lost on the way is sent once more for the same guest and the photo is saved', async () => {
  const puts = [];
  const w = browser((url, init) => { puts.push({ url, method: init && init.method, bearer: init && init.headers && init.headers['x-siyl-auth'], type: init && init.headers && init.headers['content-type'] }); return puts.length === 1 ? lost() : stored('2026-09-24T01:00:00.000Z'); });
  const r = await w.SIYL_AVATAR.upload(PHOTO);
  assert.equal(r.ok, true, 'the second sending stored the photo: ' + JSON.stringify(r));
  assert.equal(r.at, '2026-09-24T01:00:00.000Z');
  assert.equal(puts.length, 2, 'exactly one more sending');
  assert.ok(puts.every((p) => p.method === 'PUT' && p.bearer === PEGGY.bearer && p.type === 'image/jpeg'), 'both sendings are the same guest\'s photo');
  assert.equal(w.SIYL_AVATAR.current(), 'blob:x', 'the saved photo is shown at once');
});

test('PHOTO UPLOAD · an edge error page (no answer from the Worker) is treated as a lost request, sent once more', async () => {
  let n = 0;
  const w = browser(() => (++n === 1 ? Promise.resolve({ status: 502, ok: false, json: async () => { throw new SyntaxError('Unexpected token <'); } }) : stored('2026-09-24T01:01:00.000Z')));
  const r = await w.SIYL_AVATAR.upload(PHOTO);
  assert.equal(r.ok, true); assert.equal(n, 2);
});

test('PHOTO UPLOAD · never a loop: two lost requests end in the refusal words, after exactly two sendings', async () => {
  let n = 0;
  const w = browser(() => { n++; return lost(); });
  const r = await w.SIYL_AVATAR.upload(PHOTO);
  assert.equal(r.ok, false); assert.equal(n, 2);
  assert.equal(w.SIYL_AVATAR.refusal(r), 'We could not save your photo. Please try again in a moment.'); /* TO-00063 */
  assert.equal(w.SIYL_AVATAR.current(), null, 'nothing is shown as saved');
});

test('PHOTO UPLOAD · a refusal of the Worker is its answer — never repeated, still named in its own words', async () => {
  for (const [status, body, words] of [[401, { ok: false, error: 'unauthorised' }, /^You are no longer signed in, so the photo was not saved\. Please open your invitation again and choose the photo once more\.$/], [503, { ok: false, error: 'photo could not be stored' }, /^We cannot save photos just now, so nothing was saved\. Please try again a little later\.$/], [415, { ok: false, error: 'unsupported file type' }, /^That file is not a photo we can use, so it was not saved\. Please choose a JPEG, PNG or WebP image\.$/], [413, { ok: false, error: 'file too large' }, /^That photo is larger than 12 MB, so it was not saved\. Please choose a smaller one\.$/] /* the Worker's own 413 word names the size too (TO-00059) */, [413, { ok: false, error: 'too large' }, /^That photo is larger than 12 MB, so it was not saved\. Please choose a smaller one\.$/]] /* TO-00060…00063 */) {
    let n = 0;
    const w = browser(() => { n++; return Promise.resolve({ status, ok: false, json: async () => body }); });
    const r = await w.SIYL_AVATAR.upload(PHOTO);
    assert.equal(r.ok, false); assert.equal(n, 1, status + ' is not sent again'); assert.equal(r.status, status);
    assert.match(w.SIYL_AVATAR.refusal(r), words);
  }
});

test('PHOTO UPLOAD · the second sending belongs to the guest who chose the photo: a session that moved on is not written for', async () => {
  let n = 0, w;
  w = browser(() => { n++; w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE)); return lost(); });
  const r = await w.SIYL_AVATAR.upload(PHOTO);
  assert.equal(r.ok, false); assert.equal(r.error, 'session changed'); assert.equal(n, 1, 'Steffie\'s session never carries Peggy\'s photo');
});

/* THE ROOT CAUSE (24 Sep 2026): seeyouinlaos.com was connected to the one Worker; the client sent every API call to the absolute
   workers.dev address whenever the page was not served from workers.dev — a cross-origin request the Worker's CORS list does not
   allow, so the photo (and every save) died without an answer. Every call now stays on the page's own origin. */
test('SAME ORIGIN · no client module or page sends an API call to an absolute Worker address', async () => {
  const fs = await import('node:fs');
  const files = ['assets/avatar.js', 'assets/docs.js', 'assets/draft.js', 'assets/guest.js', 'assets/confirm.js', 'assets/rooms.js', 'assets/seating.js', 'review.html'];
  for (const f of files) {
    const t = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(t, /https:\/\/[^'"\s]*workers\.dev\/api|ORIGIN \+ '\/api/, f + ' still calls the API cross-origin');
  }
  assert.match(fs.readFileSync(new URL('../assets/avatar.js', import.meta.url), 'utf8'), /var API = '\/api\/profile\/photo';/);
});
