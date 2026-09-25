/* HARUTHAI'S THAI REVIEW (Owner, 25 Sep 2026): the human review of the Window 007 Thai came back with every correction field
   blank and six Thai lines corrected in place — each the spelling of Khun Ket's name, คุณเกต (not คุณเกตุ). Her wording is
   authoritative; these pins keep it from ever reverting, in the dictionary, the template and the rendered guest email. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { src } from './sandbox.mjs';
import { composeGuestMail } from '../src/mail-templates.js';
import core from '../src/i18n-core.js';

const H = {
  'Khun Ket and Khun Paddy of Guest Relations will look through it and confirm each arrangement with you personally; until they do, nothing is booked. If anything changes, change it in My Trip and send us the update.':
    'คุณเกตและคุณแพดดี้จาก Guest Relations จะดูรายละเอียดทั้งหมด แล้วยืนยันแต่ละรายการกับคุณโดยตรง ระหว่างนี้ยังไม่มีการจองใด ๆ หากมีอะไรเปลี่ยน แก้ได้ที่การเดินทางของฉัน แล้วส่งรายการที่แก้ไขมาให้เรา',
  'Your own arrangements are with Khun Ket and Khun Paddy, exactly as you sent them. Below is your copy.': 'รายการของคุณอยู่กับคุณเกตและคุณแพดดี้แล้ว ตรงตามที่ส่งมาทุกอย่าง ด้านล่างคือสำเนาของคุณ',
  'Your trip has reached us, exactly as you sent it — below is your copy. Khun Ket and Khun Paddy of Guest Relations will look through it and confirm each arrangement with you personally; until they do, nothing is booked. If anything changes, simply change it in My Trip and send us the update.':
    'แผนการเดินทางของคุณส่งถึงเราแล้ว ตรงตามที่ส่งมาทุกอย่าง ด้านล่างคือสำเนาของคุณ คุณเกตและคุณแพดดี้จาก Guest Relations จะดูรายละเอียด แล้วยืนยันแต่ละรายการกับคุณโดยตรง ระหว่างนี้ยังไม่มีการจองใด ๆ หากมีอะไรเปลี่ยน เพียงแก้ในการเดินทางของฉัน แล้วส่งรายการที่แก้ไขมาให้เรา',
  'Guest Relations — Khun Ket & Khun Paddy ·': 'Guest Relations · คุณเกตและคุณแพดดี้ ·',
  'Everything you send is a registration request — Khun Ket and Khun Paddy confirm each arrangement with you personally.': 'สิ่งที่ส่งมาเป็นคำขอ คุณเกตและคุณแพดดี้จะยืนยันแต่ละรายการกับคุณด้วยตัวเอง',
};

test('HARUTHAI · the six corrected lines are the dictionary\'s, word for word; the template carries her spelling for every value; คุณเกตุ appears nowhere a guest can read', () => {
  const j = JSON.parse(src('src/i18n-th.json'));
  for (const [en, th] of Object.entries(H)) assert.equal(j.exact[en], th, en.slice(0, 50));
  const t = j.templates.find((x) => x.en === 'Guest Relations — Khun Ket & Khun Paddy · {x}');
  assert.equal(t.th, 'Guest Relations · คุณเกตและคุณแพดดี้ · {1}');
  const T = core.translator(j);
  for (const v of ['guest.relation.seeyouinlaos@gmail.com', '+66 20 000 0000']) assert.equal(T.tr('Guest Relations — Khun Ket & Khun Paddy · ' + v), 'Guest Relations · คุณเกตและคุณแพดดี้ · ' + v, 'any value');
  for (const f of ['src/i18n-th.json', 'assets/i18n/th.js', 'src/i18n-th.dict.js', 'src/mail-templates.js']) assert.doesNotMatch(src(f), /เกตุ/, f);
});

test('HARUTHAI · the rendered Thai guest email reads her spelling (the trip, the hosts\' plan, the signature line)', () => {
  const rec = (extra) => ({ invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-TEST0001', version: 1, kind: 'initial', submittedAt: '2026-09-25T09:00:00.000Z', lastSentAt: '2026-09-25T09:00:00.000Z',
    recipient: { email: 'x@example.org' }, ...extra, registration: { lang: 'th', selections: [], totalUsd: 0, guestRecord: { scope: { bangkok: true }, guests: [{ guestId: 'G777', source: { fullName: 'Sam Example', preferredName: 'Sam' } }] } } });
  for (const m of [composeGuestMail(rec({})), composeGuestMail(rec({ hosts: true }))]) {
    assert.match(m.text + m.html, /คุณเกตและคุณแพดดี้/); assert.doesNotMatch(m.text + m.html, /เกตุ/);
  }
});
