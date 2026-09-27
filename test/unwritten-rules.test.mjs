/* THE UNWRITTEN RULES (Owner, 27 Sep 2026): the complete Owner-approved guide — Multicultural Wedding Etiquette — in its own page, in
   English and Thai, read and acknowledged once by every guest after the note from the Guest Relations Manager; kept in the guest's own
   draft record, read by Guest Relations, never part of the trip; and a mini-magazine PDF whose every source URL is printed and a real
   link. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { src, doState } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { Rooms } from '../src/rooms.js';
import { Drafts } from '../src/drafts.js';

const require = createRequire(import.meta.url);
const U = require('../src/unwritten-rules.js');
const B = require('../src/build-unwritten-rules.cjs');
const TH = JSON.parse(src('src/i18n-th.json')).exact;
const text = (t) => t.replace(/<\/?em>/g, '');
const all = () => [U.title, U.subtitle, U.kicker, ...U.intro.blocks.map((b) => b[1]), ...U.rules.flatMap((r) => [r.title, ...r.blocks.flatMap((b) => (b[0] === 'l' ? b[1] : [b[1]]))]),
  U.closing.title, ...U.closing.blocks.flatMap((b) => (b[0] === 'l' ? b[1] : [b[1]]))].map(text);
const prose = () => all().join('\n');

test('THE GUIDE · the complete Owner-approved text: the three opening lines, the twenty rules in order, the closing, nothing shortened', () => {
  assert.equal(U.title, 'Multicultural Wedding Etiquette');
  assert.equal(U.subtitle, 'Understanding the Courtesy Behind an International Celebration');
  assert.equal(U.kicker, 'The Unwritten Rules Every Wedding Guest Should Know');
  assert.deepEqual(U.rules.map((r) => r.n + ' · ' + r.title), [
    '01 · Remember Whose Celebration It Is', '02 · Sometimes Friendship Means Making Space', '03 · Freedom of Choice Is Not Freedom From Consideration',
    '04 · Respect Arrangements That Have Already Been Made', '05 · Reserved Means Reserved — Even When It Is Empty', '06 · An Invitation Is Personal',
    '07 · RSVP Is a Commitment, Not an Expression of Interest', '08 · Changing Your Plans Does Not Necessarily Remove the Arrangements Made for You',
    '09 · A Personal Solution Is Not Always a Simpler Solution', '10 · Follow the Dress Code', '11 · Dress Etiquette Is Cultural',
    '12 · A Multicultural Wedding Requires Cultural Awareness', '13 · Be Present During the Ceremony', '14 · Don’t Turn Personal Preferences Into Additional Work',
    '15 · Use the Information and People Provided to Help You', '16 · Respect Practical Limits', '17 · Don’t Compete for Attention or Position',
    '18 · Give the Bride and Groom Room to Experience Their Own Wedding', '19 · Hospitality Is Something to Appreciate, Not Something to Maximise',
    '20 · Never Put the Bride and Groom in a Position Where They Have to Defend Their Hospitality']);
  const t = prose();
  for (const must of ['even when it is empty', 'Etiquette often begins where the written rules end.', 'Sometimes the clearest sign of closeness is feeling secure enough not to demand proof of it.',
    'They are secure enough to make space.', 'Complimentary means that somebody else has chosen to pay for it. It does not mean that it costs nothing.',
    'The traditional role of a wedding guest is not simply to receive hospitality. It also involves supporting the people getting married.',
    'Cheaper for the guest does not automatically mean easier or cheaper for the bride and groom.', 'kreng jai — เกรงใจ',
    'Before asking “Can I get a different arrangement?”, ask “What position will this question put the other person in?”',
    'A considerate guest does not decide what is easiest for the bride and groom.', 'A considerate guest does not make the bride and groom personally justify their finances or hospitality.',
    'A considerate guest does not assume that paying less personally means creating less cost for the wedding.',
    'Good hospitality protects the dignity of the guest. Good guest etiquette protects the dignity of the hosts.',
    'Your culture does not have to become somebody else’s culture for both to deserve respect.', 'to celebrate and support the bride and groom.']) assert.ok(t.toLowerCase().includes(must.toLowerCase()), 'kept: ' + must);
  assert.equal(U.closing.title, 'The Simplest Unwritten Rule'); assert.equal(U.closing.blocks[0][1], 'Be considerate.');
  assert.equal(t.split(/\s+/).length, 3333, 'the whole guide, word for word the approved PDF (3 731 words with its 32 source lines)');
  /* rules 19 and 20 in full: their inner sections */
  assert.deepEqual(U.rules[18].blocks.filter((b) => b[0] === 'h').map((b) => b[1]), ['A Thai Perspective']);
  assert.deepEqual(U.rules[19].blocks.filter((b) => b[0] === 'h').map((b) => b[1]), ['Why This Matters Particularly in Thai Culture', 'Protecting Face and Dignity',
    'Thai Wedding Culture Adds Another Important Perspective', 'Genuine Difficulty Is Different From Negotiating for the Cheapest Option', 'Ask for Help — Do Not Make the Couple Defend Their Wedding', 'The Principle']);
});

test('THE SOURCES · the approved families only, clean URLs, 32 in all; a rule without a source block gets none', () => {
  const s = B.sources(U);
  assert.equal(s.length, 32);
  for (const [label, url] of s) {
    assert.match(url, /^https:\/\/(emilypost\.com|www\.tatlerasia\.com|thailandfoundation\.or\.th|www\.nationthailand\.com|murex\.mahidol\.ac\.th|repository\.li\.mahidol\.ac\.th)\//, url);
    assert.doesNotMatch(url, /utm_|[?&]source=|chatgpt/i, 'no tracking parameters: ' + url);
    assert.match(label, /^(Emily Post|Tatler Asia|Thailand Foundation|The Nation Thailand|Mahidol University) · /, label);
  }
  assert.deepEqual(U.rules.filter((r) => !r.sources.length).map((r) => r.n), ['09', '14', '16'], 'the rules the approved guide gives no sources');
  assert.equal(U.rules[19].sources.length, 5);
});

test('THE PAGE · the generated block is the source\'s; every source URL written out and itself the link; the confirmation at the very end — unticked, the button waiting', () => {
  const h = src('unwritten-rules.html');
  assert.ok(h.includes(B.pageBlock(U)), 'the page carries exactly the block the source builds');
  const links = [...h.matchAll(/<a href="(https:[^"]+)" target="_blank" rel="noopener noreferrer"><span class="ur-src-t">([^<]+)<\/span><span class="ur-src-u">([^<]+)<\/span><\/a>/g)];
  assert.equal(links.length, 32); for (const m of links) assert.equal(m[1], m[3], 'the visible URL is the link itself');
  assert.match(h, /<ul class="ur-src-l" lang="en" data-i18n-skip>/, 'sources keep their own language');
  for (let i = 1; i <= 20; i++) assert.match(h, new RegExp('<article class="ur-rule" id="rule-' + String(i).padStart(2, '0') + '"'));
  const ack = h.indexOf('data-ur-ack'), close = h.indexOf('class="ur-close"');
  assert.ok(ack > close, 'the confirmation follows the whole guide');
  assert.match(h, /<label class="ur-check"><input type="checkbox" data-ur-check><span>I confirm that I have read and understood the Unwritten Rules and the multicultural wedding etiquette explained above\.<\/span><\/label>/);
  assert.doesNotMatch(h.slice(ack), /checked/, 'never pre-ticked');
  assert.match(h, /<button type="button" class="p-act ur-go" data-ur-go disabled aria-disabled="true">I have read &amp; understood · Continue<\/button>/);
  assert.doesNotMatch(h, /I accept|Terms (&amp;|&|and) Conditions|\bAGB\b/i, 'an acknowledgement of etiquette, never legal acceptance');
  assert.match(h, /<a class="p-act quiet ur-dl" href="assets\/pdf\/see-you-in-laos-unwritten-rules\.pdf\?v=[0-9a-f]{8}" download="see-you-in-laos-unwritten-rules\.pdf" type="application\/pdf" data-ur-download>Download · Unwritten Rules<\/a>/);
  assert.match(h, /<h1 class="ur-title">Multicultural Wedding Etiquette<\/h1>/, 'the page begins with the guide');
  /* private: hidden before the first paint for a signed-out visitor, and the way in */
  assert.match(h, /<script src="assets\/invite-early\.js/); assert.match(h, /<div class="ur-guide" data-private>/); assert.match(h, /SIYL_INVITE\.require\(fn\)/);
  assert.match(src('assets/invite.mjs'), /\|profile\|review\|unwritten-rules\)/, 'links to the guide lead through the invitation while signed out');
  assert.match(h, /assets\/guest-note\.js[^"]*"><\/script>\n<script src="assets\/rules-gate\.js/, 'the note first, then the rules');
});

function loadGate(store, path) {
  const doc = { readyState: 'loading', addEventListener() {}, querySelector: () => null, dispatchEvent() {} };
  const win = { document: doc, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, location: { pathname: path || '/your-journey.html', search: '', hash: '', replace() {} }, CustomEvent: function () {}, Promise };
  win.window = win; vm.createContext(win); vm.runInContext(src('assets/rules-gate.js'), win); return win;
}
test('THE STEP · a signed-in guest (never the hosts), the server draft read, the note first, until this text version is acknowledged — on every journey page', () => {
  const win = loadGate({}); const R = win.SIYL_RULES;
  const guest = { guestId: 'T001' }, ready = { ready: true };
  win.SIYL_NOTE = { acknowledged: (st) => !!(st && st.note && st.note.acknowledged) };
  const noted = { note: { acknowledged: true } };
  assert.equal(R.needs(guest, noted, ready), true, 'note acknowledged, rules not: the guide');
  assert.equal(R.needs(guest, {}, ready), false, 'the note comes first');
  assert.equal(R.needs(guest, noted, { ready: false }), false, 'not before the server draft is read (another device may have acknowledged)');
  assert.equal(R.needs(null, noted, ready), false, 'nobody signed in');
  assert.equal(R.needs({ guestId: 'G048', hosts: true }, noted, ready), false, 'never the hosts');
  assert.equal(R.needs(guest, { ...noted, rules: { acknowledged: true, textVersion: R.VERSION } }, ready), false, 'acknowledged: never again');
  assert.equal(R.needs(guest, { ...noted, rules: { acknowledged: true, textVersion: '2020-01-01' } }, ready), true, 'a new text version asks again');
  assert.equal(R.safeNext('your-journey.html'), 'your-journey.html'); assert.equal(R.safeNext('cart.html?x=1#y'), 'cart.html?x=1#y');
  for (const bad of ['https://example.com/', '//evil', 'javascript:alert(1)', 'unwritten-rules.html', 'unwritten-rules']) assert.equal(R.safeNext(bad), '', 'never away from this site, never back into the guide: ' + bad);
  const js = src('assets/rules-gate.js');
  assert.match(js, /st\.rules = \{ acknowledged: true, at: new Date\(\)\.toISOString\(\), textVersion: VERSION, guestId: a\.guestId \}/, 'kept in the guest\'s own record');
  assert.match(js, /if \(!box\.checked \|\| go\.getAttribute\('aria-busy'\) === 'true'\) return;/, 'the button waits for the checkbox');
  assert.doesNotMatch(js, /data-ur-download[^\n]*acknowledge/, 'a download is not an acknowledgement');
  for (const f of readdirSync('.').filter((x) => x.endsWith('.html'))) { const s = src(f); if (/assets\/draft\.js/.test(s)) assert.match(s, /assets\/rules-gate\.js/, f + ' — every journey page carries the step'); }
  assert.match(src('src/layout-qa/states.mjs'), /\[data-ur-check\]/, 'the layout audit acknowledges as a guest does');
});

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('nope', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
const STEP01 = { birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland' };
const REG = (email) => ({ channel: 'journey-shop', guestId: 'G777', partyId: 'INV-777', selections: [{ id: 'train', name: 'Special Express No. 25', price: 100 }], totalUsd: 100, contact: { email, phone: '+66 81 000 0000' },
  guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' } }], contact: { email, phone: '+66 81 000 0000' } }, seats: null, rooms: null, registration_submitted_at: '2026-09-16T10:00:00.000Z' });
const GUEST = (extra) => JSON.stringify({ contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, guests: { G777: { submitted: {}, profile: { coffeetea: 'Oolong' } } }, ...extra });

test('THE WORKER · the acknowledgement never marks a sent trip as changed; Guest Relations reads both acknowledgements on their own, and who has not yet given each', async () => {
  const w = (await import('../src/worker.js')).default;
  const sam = await bearerOf('demo-ur-sam'), kim = await bearerOf('demo-ur-kim'), host = await bearerOf('demo-ur-host');
  const entries = {}; entries[await authIdOf(sam)] = { i: 'INV-G777', g: 'G777', p: 'INV-777' }; entries[await authIdOf(kim)] = { i: 'INV-G778', g: 'G778', p: 'INV-778' }; entries[await authIdOf(host)] = { i: 'INV-H001', g: 'H001', p: 'INV-H00', h: 1, r: 'B' };
  const store = kv(); const rooms = new Rooms(doState()); const stub = { fetch: (r) => rooms.fetch(r) };
  const env = { ASSETS: await assetsFor(entries), REG_KV: store, MAIL_FROM: 'guest.relation.seeyouinlaos@gmail.com', BREVO_API_KEY: 'x', GR_TOKEN: 'gr-secret', ROOMS: { idFromName: () => 'rooms', get: () => stub } };
  const actors = {}; env.DRAFTS = { idFromName: (n) => n, get: (n) => { if (!actors[n]) { const a = new Drafts(doState(), env); actors[n] = { fetch: (r) => a.fetch(r) }; } return actors[n]; } };
  const realFetch = globalThis.fetch; let n = 0;
  globalThis.fetch = async (url, init) => (/api\.brevo\.com/.test(String(url)) ? new Response(JSON.stringify({ messageId: '<msg-' + (++n) + '@brevo>' }), { status: 201 }) : realFetch(url, init));
  try {
    const put = async (keys) => { const cur = await (await w.fetch(req('/api/draft', { 'x-siyl-auth': sam }), env)).json(); return (await w.fetch(req('/api/draft', { 'x-siyl-auth': sam }, { invitationId: 'INV-G777', keys, baseUpdatedAt: cur.draft ? cur.draft.updatedAt : null }, 'PUT'), env)).json(); };
    await store.put('contact:INV-G777', JSON.stringify({ invitationId: 'INV-G777', guestId: 'G777', email: 'sam.example@example.org', phone: '+66 81 000 0000', ...STEP01, at: '2026-09-16T09:00:00.000Z' }));
    const note = { acknowledged: true, at: '2026-09-27T08:00:00.000Z', textVersion: '2026-09-26', guestId: 'G777' };
    await put({ 'siyl.guest': GUEST({ note }), 'siyl.bag': JSON.stringify([{ id: 'train' }]) });
    const r1 = await w.fetch(req('/api/register', { 'x-siyl-auth': sam }, { invitationId: 'INV-G777', registration: complete(REG('sam.example@example.org')), text: 'SEE YOU IN LAOS — JOURNEY SELECTION\nInvitation: INV-G777 · Sam' }), env);
    assert.equal(r1.status, 202); const d1 = await r1.json(); assert.equal(d1.submission.submissionStatus, 'sent');
    const rules = { acknowledged: true, at: '2026-09-27T08:05:00.000Z', textVersion: '2026-09-27', guestId: 'G777' };
    const p = await put({ 'siyl.guest': GUEST({ note, rules }), 'siyl.bag': JSON.stringify([{ id: 'train' }]) });
    assert.equal(p.submission.hasUnsentChanges, false, 'acknowledging the rules is not a change to the sent trip');
    assert.equal(p.submission.submissionStatus, 'sent');
    const gr = await (await w.fetch(req('/api/gr/journeys', { 'x-gr-token': 'gr-secret' }), env)).json();
    const j = gr.journeys.find((x) => x.invitationId === 'INV-G777');
    assert.deepEqual(j.noteAck, { acknowledged: true, at: note.at, textVersion: '2026-09-26' });
    assert.deepEqual(j.rulesAck, { acknowledged: true, at: rules.at, textVersion: '2026-09-27' }, 'the two acknowledgements, each on its own');
    assert.equal(j.hasUnsentChanges, false); assert.equal(j.version, 1);
    const a = gr.acknowledgements;
    assert.equal(a.unwrittenRules.guests, 2, 'every invited guest of the register, never the hosts');
    assert.equal(a.unwrittenRules.acknowledged, 1); assert.equal(a.unwrittenRules.pending, 1);
    assert.deepEqual(a.unwrittenRules.pendingGuests.map((x) => [x.guestId, x.signedIn]), [['G778', false]], 'a guest who never signed in is pending too');
    assert.ok(!a.unwrittenRules.pendingGuests.some((x) => x.guestId === 'H001') && !a.guestRelationsNote.pendingGuests.some((x) => x.guestId === 'H001'), 'the hosts are never pending');
    assert.equal(a.guestRelationsNote.acknowledged, 1);
    assert.equal((await w.fetch(req('/api/gr/journeys', { 'x-siyl-auth': sam }), env)).status, 401, 'a guest bearer is not Guest Relations');
  } finally { globalThis.fetch = realFetch; }
});

test('THE MINI-MAGAZINE · the PDF is current, every source URL a real URI annotation with a generous tap area, nothing else linked', () => {
  const buf = readFileSync('assets/pdf/see-you-in-laos-unwritten-rules.pdf');
  assert.equal(buf.slice(0, 5).toString(), '%PDF-');
  assert.deepEqual(B.check(), [], 'page block, PDF and lock current');
  const { links, problems } = B.linkProblems(U, buf);
  assert.deepEqual(problems, []);
  assert.equal(links.length, 32);
  for (const l of links) { assert.ok(l.h >= B.TAP_MIN, l.uri + ' tap height ' + l.h); assert.ok(l.w >= 200, l.uri + ' tap width ' + l.w); }
  const m = B.magazine(U);
  assert.match(m, /Multicultural<br>Wedding Etiquette/, 'the cover');
  for (const [, u] of B.sources(U)) assert.ok(m.includes('<span class="src-u">' + u + '</span>'), 'printed in full: ' + u);
  assert.doesNotMatch(m.replace(/url\('data:[^']*'\)/g, ''), /<img|<svg|qr[-_ ]?code/i, 'no imagery, no QR code');
  assert.match(m, /--ivory:#F2ECE1/); assert.match(m, /--cherry:#74070E/);
});

test('THAI · every sentence of the guide has its Thai, in the same voice and strength; kreng jai — เกรงใจ kept; the names and the sources as written', () => {
  const missing = all().filter((s) => !TH[s]); assert.deepEqual(missing, [], 'Thai for every sentence');
  const th = all().map((s) => TH[s]).join('\n');
  assert.match(TH['This is where the Thai concept of kreng jai — เกรงใจ — becomes especially relevant.'], /kreng jai — เกรงใจ/);
  assert.match(TH['Your culture does not have to become somebody else’s culture for both to deserve respect.'], /วัฒนธรรมของคุณไม่จำเป็นต้องกลายเป็นวัฒนธรรมของผู้อื่น/);
  assert.match(TH['to celebrate and support the bride and groom.'], /เฉลิมฉลองและสนับสนุนเจ้าบ่าวเจ้าสาว/);
  assert.match(TH['Complimentary means that somebody else has chosen to pay for it. It does not mean that it costs nothing.'], /ไม่ได้หมายความว่าสิ่งนั้นไม่มีต้นทุน/);
  assert.match(TH['Genuine Difficulty Is Different From Negotiating for the Cheapest Option'], /ความลำบากที่แท้จริง/);
  assert.doesNotMatch(th, /ครับ|ค่ะ|ดิฉัน/, 'no gendered particle');
  assert.doesNotMatch(th, /ข้อกำหนดและเงื่อนไข|ยอมรับข้อตกลง/, 'never legal terms');
  for (const k of ['Unwritten Rules', 'Download · Unwritten Rules', 'Sources & Further Reading', 'The Twenty Rules',
    'I confirm that I have read and understood the Unwritten Rules and the multicultural wedding etiquette explained above.', 'I have read & understood · Continue',
    'You have confirmed that you have read and understood the Unwritten Rules. Thank you.', 'Before you continue, please read the Unwritten Rules. Your confirmation is at the end of the guide.'])
    assert.ok(TH[k], 'Thai for ' + k);
  assert.equal(TH['Unwritten Rules'], 'กฎที่ไม่ได้เขียนไว้');
  assert.equal(TH['I have read & understood · Continue'], 'อ่านและเข้าใจแล้ว · ดำเนินการต่อ');
});

test('THE MENU · Unwritten Rules is a first-class row of its own for a signed-in guest, the one Cherry word of the menu', () => {
  const js = src('assets/aman.js');
  assert.match(js, /var NAV = \[\n\s*\/\*[^]*?\*\/\n\s*\['Unwritten Rules', 'unwritten-rules\.html', null, 'in'\],\n\s*\['Destinations'/, 'the first row, before the discovery rows');
  assert.match(js, /' a-mrow-rules" data-signed-in hidden'/, 'hidden until a guest is signed in');
  assert.match(js, /document\.addEventListener\('siyl:auth', repaintRows\); document\.addEventListener\('siyl:signout', repaintRows\);/);
  assert.match(src('assets/aman.css'), /\.a-mrow-rules > a \{ color: var\(--cherry\); \}/);
  assert.match(src('docs/DESIGN.md'), /The one named exception — THE UNWRITTEN RULES/);
});
