/* A NOTE FROM YOUR GUEST RELATIONS MANAGER (Owner, 26 Sep 2026): the one acknowledgement every guest gives once, after the
   invitation code and before the journey. The text is the Owner's, in full, in English and Thai — Khun Paddy speaks, Haruthai &
   Suthep in the third person; the checkbox is never pre-ticked and the button
   waits for it; it is kept in the guest's own draft record (siyl.guest → note), read by Guest Relations, and never part of the
   trip's content — acknowledging never marks a sent trip as changed. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import vm from 'node:vm';
import { src } from './sandbox.mjs';

function load(store) {
  const listeners = {};
  const doc = { readyState: 'complete', addEventListener: (e, f) => { (listeners[e] = listeners[e] || []).push(f); }, dispatchEvent() {}, getElementById: () => null, body: null, head: null, createElement: () => ({}) };
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const win = { document: doc, localStorage: ls, CustomEvent: function () {} };
  win.window = win; vm.createContext(win); vm.runInContext(src('assets/guest-note.js'), win);
  return win;
}
const N = load({}).SIYL_NOTE;
const TH = JSON.parse(src('src/i18n-th.json')).exact;
const all = (T) => [T.title, T.salute, ...T.intro, T.couple, T.culture, T.stayH, T.stay, ...T.fair, T.fairEnd, T.stayAsk, T.helpH, ...T.help, T.all, T.thanks, T.grName, T.grRole, T.ack, T.go];

test('THE TEXT · the Owner-approved note: the Guest Relations Manager speaks, the Wedding Stay once, the fairness passage, one channel', () => {
  const T = N.TEXT, body = all(T).join('\n');
  assert.equal(T.title, 'A Note from Your Guest Relations Manager'); assert.equal(T.salute, 'Dear family and friends,');
  assert.match(T.intro[0], /^Before you continue, I would like to share something with you on behalf of Haruthai & Suthep\.$/);
  assert.match(T.intro[1], /Some of you are travelling a very long way, others are rearranging work, family commitments or personal plans to be there\./);
  assert.match(T.couple, /I kindly ask everyone to remember that they are also the bride and groom/);
  assert.match(T.culture, /There is no intention to judge one tradition against another\./);
  assert.equal(T.stayH, 'About the Wedding Stay'); assert.equal(T.helpH, 'I’m Here to Help');
  assert.match(T.stay, /reserved the entire hotel exclusively for their wedding guests as a full hotel buyout\. The Wedding Stay is therefore organised as one two-night arrangement: guests contribute towards the first night, while the second night is complimentary and hosted by Haruthai & Suthep\./);
  assert.match(T.fair[0], /planned as one coordinated system/); assert.match(T.fair[1], /rooms cannot reasonably be reassigned between different guests from one night to the next/);
  assert.equal(T.fairEnd, 'For these reasons, choosing another hotel or reducing the stay does not automatically make the arrangement easier or fairer. It can, in fact, have the opposite effect.');
  assert.match(T.help[1], /please contact me directly rather than discussing or negotiating individual arrangements with the bride and groom\./);
  assert.match(T.all, /^All we ask is that you respect this arrangement and allow Haruthai & Suthep the space to focus on their wedding/);
  assert.match(T.thanks, /for making the journey to celebrate with them\. ❤️$/);
  assert.equal(T.grName, 'Khun Paddy · Maninthorn Kongkeow'); assert.equal(T.grRole, 'Guest Relations Manager'); assert.equal(T.grMail, 'guest.relation.seeyouinlaos@gmail.com');
  assert.match(T.ack, /^I understand the Wedding Stay arrangement and that choosing another hotel or shortening my stay does not automatically make the overall arrangement easier or fairer\. I respect the cultural considerations explained above and will contact Guest Relations/);
  assert.equal(T.go, 'I understand · Continue');
  assert.doesNotMatch(body, /\bour guests\b|\bour wedding\b|German/, 'nobody speaks as the couple; no culture is named against another');
});

test('THAI · every sentence of the note has its Thai, in the same voice: Khun Paddy speaks, Haruthai & Suthep in the third person', () => {
  const T = N.TEXT;
  for (const s of all(T)) assert.ok(TH[s], 'Thai for: ' + s.slice(0, 60));
  assert.match(TH[T.title], /ผู้จัดการฝ่าย Guest Relations/); assert.match(TH[T.stayH], /ที่พักช่วงงานแต่ง/);
  assert.match(TH[T.stay], /คืนที่สองไม่มีค่าใช้จ่าย โดย Haruthai & Suthep เป็นเจ้าภาพ/);
  assert.match(TH[T.fairEnd], /ไม่ได้ทำให้การจัดการง่ายขึ้นหรือเป็นธรรมมากขึ้นโดยอัตโนมัติ/); assert.match(TH[T.fairEnd], /ตรงกันข้าม/);
  assert.match(TH[T.help[1]], /โปรดติดต่อฉันโดยตรง แทนการพูดคุยหรือต่อรอง/); assert.match(TH[T.help[2]], /ฉันจะพูดคุยกับทั้งสองแทนคุณ/);
  assert.match(TH[T.ack], /จะติดต่อ Guest Relations/); assert.match(TH[T.ack], /แทนการพูดคุยหรือต่อรองโดยตรงกับเจ้าบ่าวและเจ้าสาว/);
  const th = all(T).map((s) => TH[s]).join('\n');
  assert.doesNotMatch(th, /ครับ|ค่ะ|ผม(?!่)|ดิฉัน/, 'the speaker is never given a gender by a particle or a pronoun');
  assert.doesNotMatch(th, /ฮารุทัย|สุเทพ/, 'the couple keep their Latin names');
});

test('THE STEP · a signed-in guest (never the hosts), once the server draft is read, until this text version is acknowledged', () => {
  const guest = { guestId: 'T001' }, ready = { ready: true };
  assert.equal(N.needs(guest, {}, ready), true, 'first sign-in, and an existing guest who never saw it');
  assert.equal(N.needs(guest, {}, { ready: false }), false, 'not before the server draft is read (another device may have acknowledged)');
  assert.equal(N.needs(null, {}, ready), false, 'nobody signed in');
  assert.equal(N.needs({ guestId: 'H1', hosts: true }, {}, ready), false, 'never the hosts');
  assert.equal(N.needs(guest, { note: { acknowledged: true, textVersion: N.VERSION } }, ready), false, 'acknowledged: never again');
  assert.equal(N.needs(guest, { note: { acknowledged: true, textVersion: '2020-01-01' } }, ready), true, 'a new text version asks again');
  const h = N.html();
  assert.match(h, /<input type="checkbox" data-note-ack>/, 'the checkbox, never pre-ticked'); assert.doesNotMatch(h, /checked/);
  assert.match(h, /<button type="button" class="sn-go" data-note-go disabled aria-disabled="true">/, 'the button waits for the checkbox');
  assert.match(h, /data-note-fair/); assert.match(h, /data-note-ask/);
  assert.match(h, /<h3 class="sn-h">About the Wedding Stay<\/h3>[\s\S]*<h3 class="sn-h">I’m Here to Help<\/h3>/, 'the two sections, in order, in the one sheet');
  assert.match(h, /data-note-fair><p class="sn-lead">For these reasons/, 'the Cherry rule marks the fairness message');
  assert.match(h, /data-note-ask><p class="sn-lead">All we ask is that you respect this arrangement/, 'and the request to respect the bride and groom');
  const js = src('assets/guest-note.js');
  assert.match(js, /st\.note = \{ acknowledged: true, at: new Date\(\)\.toISOString\(\), textVersion: VERSION, guestId: a\.guestId \}/, 'kept in the guest\'s own record');
  assert.match(js, /D\.touch\(\); if \(D && D\.flush\) D\.flush\('note'\)/, 'saved to the Worker at once');
  assert.doesNotMatch(js, /Escape/, 'it cannot be dismissed without the acknowledgement');
  for (const f of readdirSync('.').filter((x) => x.endsWith('.html'))) { const s = src(f); if (/assets\/draft\.js/.test(s)) assert.match(s, /assets\/guest-note\.js/, f + ' — every journey page carries the step'); }
});

test('THE WORKER · the acknowledgement is read by Guest Relations and is never part of the trip\'s content', () => {
  const w = src('src/worker.js');
  assert.match(w, /if \(k === 'siyl\.guest'\) \{ delete v\.note; delete v\.rules; \}/, 'acknowledging (the note, and the Unwritten Rules after it) never marks a sent trip as changed');
  assert.match(w, /noteAck: noteAckOf\(d\)/); assert.match(w, /function noteAckOf\(d\)/);
  assert.match(src('src/layout-qa/states.mjs'), /\[data-guest-note\] \[data-note-ack\]/, 'the layout audit acknowledges as a guest does');
});
