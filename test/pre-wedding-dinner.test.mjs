/* ============================================================================
   THE PRE-WEDDING DINNER (Owners, 22 Nov 2026 · HS-058) — Cảm Ơn, Saturday 27 February 2027, 18:30.
   The menu is the restaurant's own (codes, names, LAK prices); each joining guest picks exactly 2 dishes + 1 drink + 1 dessert and
   confirms; a confirmed order is never overwritten silently; the Owners' release locks the orders and sends nothing; the guest
   pays LAK 0 and nothing reaches a Bag, a trip or a statement. Synthetic guests only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { doState } from './sandbox.mjs';
import { Seating } from '../src/seating.js';
import * as PWD from '../src/pre-wedding-dinner.js';

const src = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const who = (gid) => ({ invitationId: 'INV-' + gid, guestId: gid, partyId: 'INV-P' + gid, hosts: false });
const A = who('G901'), B = who('G902');
const op = async (s, path, { as, admin, gr, body, method, bare } = {}) => {
  const h = { 'content-type': 'application/json' };
  if (gr) h['x-gr-verified'] = 'yes';
  if (/^pwd-/.test(path) && !bare) h['x-siyl-pwd'] = '1';   /* the marker only /api/pre-wedding-dinner sets */
  if (as) h['x-siyl-identity'] = JSON.stringify(as);
  if (admin) { h['x-siyl-admin'] = admin; h['x-gr-verified'] = 'yes'; }
  const r = await s.fetch(new Request('https://seating/api/seating/' + path, { method: method || (body ? 'POST' : 'GET'), headers: h, body: body ? JSON.stringify(body) : undefined }));
  return { status: r.status, j: await r.json() };
};
const FULL = [{ id: 'A9', qty: 1 }, { id: 'B4', qty: 1 }, { id: 'E4', qty: 1 }, { id: 'G1', qty: 1 }];

test('THE MENU · the restaurant\'s own: 37 coded items (A1–A10, B1–B5, C1–C8, D1–D5, E1–E7, G1–G2) + 22 uncoded drinks of page 19; no paid extra F1–F12', () => {
  const coded = PWD.MENU.flatMap((c) => c.items).filter((x) => x.code).map((x) => x.code);
  const want = [...Array(10)].map((_, i) => 'A' + (i + 1)).concat([1, 2, 3, 4, 5].map((n) => 'B' + n), [1, 2, 3, 4, 5, 6, 7, 8].map((n) => 'C' + n), [1, 2, 3, 4, 5].map((n) => 'D' + n), [1, 2, 3, 4, 5, 6, 7].map((n) => 'E' + n), ['G1', 'G2']);
  assert.deepEqual(coded, want);
  assert.equal(PWD.ITEM_COUNT, 59);
  assert.ok(!PWD.MENU.flatMap((c) => c.items).some((x) => /^F\d/.test(x.code || '')), 'extras are not dishes');
  assert.ok(PWD.MENU.find((c) => c.id === 'drinks').items.every((x) => x.code === null && /^p19-/.test(x.ref)), 'an uncoded item carries no invented code');
  /* spot checks against the PDF */
  assert.deepEqual(['A1', 'A2', 'A9', 'B5', 'C2', 'D3', 'E7', 'G2'].map((c) => PWD.itemOf(c).price), [240000, 385000, 99000, 35000, 89000, 75000, 85000, 55000]);
  assert.equal(PWD.itemOf('C2').name, 'Bánh Bột Lọc Nhân Tôm');
  assert.deepEqual(PWD.MENU.map((c) => c.pick), ['dish', 'dish', 'dish', 'drink', 'drink', 'drink', 'dessert']);
  assert.match(PWD.SERVICE_NOTE, /10% service charge/);
});

test('THE RULE · exactly 2 dishes + 1 drink + 1 dessert; the same dish twice counts two; unknown ids and too many are refused; prices are the table\'s', () => {
  assert.equal(PWD.NEEDED, 4);
  const ok = PWD.normalise([{ id: 'A9', qty: 2 }, { id: 'E4' }, { id: 'G1', price: 1 }]);
  assert.ok(ok.ok); assert.ok(PWD.complete(ok.counts)); assert.equal(ok.items.find((x) => x.id === 'G1').price, 70000, 'a client price is never read');
  assert.equal(PWD.normalise([{ id: 'Z9' }]).errors[0], 'UNKNOWN_ITEM: Z9');
  assert.equal(PWD.normalise([{ id: 'E4' }, { id: 'D1' }]).errors[0], 'TOO_MANY: drink');
  assert.equal(PWD.normalise([{ id: 'A1' }, { id: 'A2' }, { id: 'A3' }]).errors[0], 'TOO_MANY: dish');
  assert.ok(!PWD.complete(PWD.normalise([{ id: 'A9' }, { id: 'E4' }, { id: 'G1' }]).counts));
  const m = PWD.money(ok.items);
  assert.deepEqual(m, { currency: 'LAK', value: 198000 + 60000 + 70000, service: 32800, total: 360800, covered: 360800, payable: 0 });
});

test('THE ORDER · save → confirm (only at 4/4) → a confirmed order refuses a silent change → reopen (logged) → stale revisions refused', () => {
  let r = PWD.apply(null, { action: 'confirm', expectRev: 0, rsvp: 'yes', items: FULL.slice(0, 3) }, 'guest', 't0');
  assert.equal(r.reason, 'INCOMPLETE');
  r = PWD.apply(null, { action: 'save', expectRev: 0, rsvp: 'yes', items: FULL.slice(0, 3) }, 'guest', 't1'); assert.ok(r.ok);
  assert.equal(PWD.view(r.rec).chosen, 3, '3 of 4 selections');
  assert.equal(PWD.apply(r.rec, { action: 'save', expectRev: 0, items: FULL }, 'guest', 't2').reason, 'STALE');
  r = PWD.apply(r.rec, { action: 'confirm', expectRev: 1, rsvp: 'yes', items: FULL }, 'guest', 't2'); assert.ok(r.ok);
  assert.ok(PWD.view(r.rec).complete);
  assert.equal(PWD.apply(r.rec, { action: 'save', expectRev: 2, items: [] }, 'guest', 't3').reason, 'CONFIRMED');
  r = PWD.apply(r.rec, { action: 'reopen', expectRev: 2 }, 'guest', 't3'); assert.ok(r.ok);
  assert.equal(r.rec.status, 'draft');
  assert.deepEqual(r.rec.history.map((h) => h.what), ['saved', 'submitted', 'reopened']);
  assert.equal(PWD.apply(r.rec, { action: 'save', expectRev: 3, items: FULL }, 'guest', 't4', true).reason, 'LOCKED');
  assert.equal(PWD.apply(null, { action: 'confirm', expectRev: 0, items: FULL }, 'guest', 't').reason, 'NO_ANSWER');
  /* LOCKED is said before STALE; a re-submit of the same order is idempotent; a reopened order keeps counting until resubmitted */
  const sub = PWD.apply(null, { action: 'confirm', expectRev: 0, rsvp: 'yes', items: FULL }, 'guest', 'a').rec;
  assert.equal(PWD.apply(sub, { action: 'save', expectRev: 99, items: FULL }, 'guest', 'b', true).reason, 'LOCKED');
  const again = PWD.apply(sub, { action: 'confirm', expectRev: 1, rsvp: 'yes', items: FULL }, 'guest', 'b'); assert.ok(again.ok && again.unchanged); assert.equal(again.rec.rev, 1);
  const open = PWD.apply(sub, { action: 'reopen', expectRev: 1 }, 'guest', 'c').rec;
  const v = PWD.view({ ...open, items: [{ id: 'C3', qty: 1 }] });
  assert.ok(v.complete && v.changing, 'still on the restaurant sheet while being changed');
  assert.deepEqual(v.effective.map((x) => x.id), ['A9', 'B4', 'E4', 'G1']);
  assert.equal(PWD.aggregate([{ guestId: 'G1', ...v }]).guests, 1);
  const gone = PWD.apply(open, { action: 'save', expectRev: 2, rsvp: 'no' }, 'guest', 'd').rec;
  assert.ok(!PWD.view(gone).complete, '"not joining" withdraws it — said by the guest');
  /* review 22 Nov: a retry of the same submission with an old revision is still idempotent; a blank answer keeps the answer;
     plain saves collapse in the history; a list is bounded */
  assert.ok(PWD.apply(sub, { action: 'confirm', expectRev: 0, rsvp: 'yes', items: FULL }, 'guest', 'r').unchanged);
  const kept = PWD.apply(open, { action: 'save', expectRev: 2, rsvp: null, items: [{ id: 'C3' }] }, 'guest', 'e').rec;
  assert.equal(kept.rsvp, 'yes'); assert.ok(PWD.view(kept).complete);
  let h = sub; for (let i = 0; i < 40; i++) h = PWD.apply(h.status === 'confirmed' ? PWD.apply(h, { action: 'reopen', expectRev: h.rev }, 'guest', 'x').rec : h, { action: 'save', expectRev: (h.status === 'confirmed' ? h.rev + 1 : h.rev), items: [{ id: i % 2 ? 'A8' : 'A9' }] }, 'guest', 't' + i).rec;
  assert.ok(h.history.length < 10 && h.history.some((e) => e.what === 'submitted') && h.history.some((e) => e.what === 'reopened'), 'taps never push out the events that matter');
  assert.equal(PWD.normalise(Array.from({ length: 21 }, () => ({ id: 'A9' }))).errors[0], 'TOO_MANY_ITEMS');
  assert.deepEqual(PWD.view(sub).effectiveMoney, PWD.money(PWD.view(sub).effective));
  /* not joining: no items kept */
  r = PWD.apply(null, { action: 'save', expectRev: 0, rsvp: 'no', items: FULL }, 'guest', 't'); assert.deepEqual(r.rec.items, []);
});

test('THE LEDGER · one code = one guest: each reads and writes only their own order; no identity → 401; admin ops need the Owners', async () => {
  const s = new Seating(doState());
  assert.equal((await op(s, 'pwd-mine', { as: A, bare: true })).status, 404, 'without the dinner route\'s marker the ledger knows no dinner op (no second way in)');
  assert.equal((await op(s, 'pwd-mine')).status, 401);
  assert.equal((await op(s, 'pwd-save', { body: { action: 'save', expectRev: 0, rsvp: 'yes' } })).status, 401);
  const a1 = await op(s, 'pwd-save', { as: A, body: { action: 'save', expectRev: 0, rsvp: 'yes', items: FULL } });
  assert.equal(a1.status, 200); assert.equal(a1.j.order.chosen, 4);
  const b0 = await op(s, 'pwd-mine', { as: B });
  assert.equal(b0.j.order.rsvp, null, 'B never sees A'); assert.equal(b0.j.menu.length, 7); assert.deepEqual(b0.j.rule, { dish: 2, drink: 1, dessert: 1 });
  /* a body naming someone else changes nothing: the identity decides */
  await op(s, 'pwd-save', { as: B, body: { action: 'save', expectRev: 0, rsvp: 'no', guestId: 'G901' } });
  assert.equal((await op(s, 'pwd-mine', { as: A })).j.order.rsvp, 'yes');
  assert.equal((await op(s, 'admin-pwd-read')).status, 404, 'no admin header → no admin op');
  assert.equal((await op(s, 'pwd-save', { as: A, body: { action: 'save', expectRev: 0, items: FULL } })).j.reason, 'STALE');
});

test('THE OWNERS · dashboard figures, restaurant totals, release (recorded, digest-checked) locks the guests, withdraw unlocks; the seating stays untouched', async () => {
  const st = doState(), s = new Seating(st);
  await op(s, 'pwd-save', { as: A, body: { action: 'confirm', expectRev: 0, rsvp: 'yes', items: [{ id: 'A9', qty: 2 }, { id: 'E4' }, { id: 'G1' }] } });
  await op(s, 'pwd-save', { as: B, body: { action: 'save', expectRev: 0, rsvp: 'yes', items: [{ id: 'C3' }] } });
  const C = who('G903'); await op(s, 'pwd-save', { as: C, body: { action: 'confirm', expectRev: 0, rsvp: 'yes', items: FULL } });
  const read = await op(s, 'admin-pwd-read', { admin: 'BRIDE', body: { active: ['G901', 'G902'] } });
  assert.equal(read.status, 200);
  assert.deepEqual(read.j.orders.map((o) => o.guestId).sort(), ['G901', 'G902'], 'an order of a guest no longer active never counts');
  assert.equal(read.j.restaurant.guests, 1);
  assert.deepEqual(read.j.restaurant.lines.map((l) => [l.code, l.qty]), [['A9', 2], ['E4', 1], ['G1', 1]]);
  assert.equal(read.j.restaurant.payable, 0); assert.equal(read.j.restaurant.covered, read.j.restaurant.total);
  /* release: wrong digest refused, right digest recorded */
  assert.equal((await op(s, 'admin-pwd-release', { admin: 'BRIDE', body: { action: 'release', expectDigest: 'x', active: ['G901', 'G902'] } })).j.reason, 'CHANGED');
  const rel = await op(s, 'admin-pwd-release', { admin: 'BRIDE', body: { action: 'release', expectDigest: read.j.digest, active: ['G901', 'G902'] } });
  assert.equal(rel.status, 200); assert.equal(rel.j.release.version, 1); assert.equal(rel.j.release.by, 'owners:BRIDE');
  const locked = await op(s, 'pwd-save', { as: B, body: { action: 'save', expectRev: 1, rsvp: 'yes', items: [{ id: 'C3' }, { id: 'C4' }] } });
  assert.equal(locked.status, 423); assert.equal(locked.j.reason, 'LOCKED');
  assert.equal((await op(s, 'pwd-mine', { as: B })).j.locked, true);
  assert.equal((await op(s, 'admin-pwd-release', { admin: 'GROOM', body: { action: 'withdraw' } })).status, 200);
  assert.equal((await op(s, 'pwd-save', { as: B, body: { action: 'save', expectRev: 1, rsvp: 'yes', items: [{ id: 'C3' }, { id: 'C4' }] } })).status, 200);
  /* the seating ledger's own reads know nothing of these keys */
  const plan = await op(s, 'plan', { gr: true }); assert.equal(plan.status, 200);
  const seats = await op(s, 'admin-read', { admin: 'BRIDE' }); assert.equal(seats.status, 200);
  assert.doesNotMatch(JSON.stringify(seats.j.log || []), /pwd|A9|Lemonade/, 'the seating log never carries a dinner order');
});

test('NEVER A BOOKING · the order lives apart from the Bag, the draft, the trip, statements and mail', () => {
  const code = (f) => src(f).replace(/\/\*[\s\S]*?\*\//g, '');
  const js = code('assets/pre-wedding-dinner.js');
  assert.doesNotMatch(js, /siyl\.bag|SIYL_BAG|SIYL_DRAFT|\/api\/draft|\/api\/register|settlement|localStorage\.setItem/i);
  assert.doesNotMatch(js.replace(/data-pwd-confirm|pwd-confirm|action: 'confirm'|'CONFIRMED'|=== 'confirmed'/g, ''), />[^<]*\b[Cc]onfirm(ed)?\b[^<]*</, 'the guest reads "submitted", never "confirmed" (brief §10/§15)');
  assert.match(js, /'\/api\/pre-wedding-dinner'/);
  const mod = src('src/pre-wedding-dinner.js');
  assert.doesNotMatch(mod.replace(/\/\*[\s\S]*?\*\//g, ''), /bookings|statement|sendMail|fetch\(/);
  const w = src('src/worker.js');
  assert.match(w, /url\.pathname === '\/api\/pre-wedding-dinner'[\s\S]{0,900}identify\(request, env\)/);
  assert.match(w, /if \(\/\(\^\|\\\/\)\(admin-\)\?pwd-\/\.test\(op\)\) return json\(\{ ok: false, error: 'unknown seating operation' \}, 404/, 'no second way in through /api/seating');
  assert.match(w, /headers\.delete\('x-siyl-admin'\); headers\.delete\('x-siyl-pwd'\);/, '/api/seating strips the dinner marker');
  assert.match(w, /if \(text\.length > 8192\) return json\(\{ ok: false, error: 'request too large' \}, 413/);
  const page = src('pre-wedding-dinner.html').replace(/<script[\s\S]*?<\/script>/g, '');
  assert.doesNotMatch(page, /\bconfirm(ed)?\b/i, 'the page says submitted, never confirmed');
  const br = code('src/billing-routes.js'), fn = br.slice(br.indexOf('async function adminPwd('), br.indexOf('async function adminPwdRelease('));
  assert.doesNotMatch(fn, /loadGuestRegister|prefetchTabs|recordsOf|adminAssignments/, 'the dashboard read stays light (HS-032)');
});

test('THE PAGES · the event page, My Profile\'s section, the Wedding Dinner set menu, the menu and the footers', () => {
  const p = src('pre-wedding-dinner.html');
  assert.match(p, /Saturday, 27 February 2027 · 18:30/);
  assert.match(p, /https:\/\/maps\.app\.goo\.gl\/J68UAQcHqq396g749/);
  assert.match(p, /href="assets\/pdf\/cam-on-menu\.pdf"/);
  assert.match(p, /href="profile\.html#pre-wedding-dinner"/);
  assert.equal((p.match(/assets\/images\/pre-wedding-dinner\/cam-on-0\d-[a-z-]+\.jpg/g) || []).length, 4, 'four new photographs (hero + three)');
  assert.equal((p.match(/assets\/images\/experiences\/vte-camon-0[12]\.jpg/g) || []).length, 2, 'two Drive originals already on the site, reused');
  assert.match(p, /white-space:nowrap">Haruthai&nbsp;&amp;&nbsp;Suthep/);
  assert.match(p, /<script src="assets\/guest-note\.js[^"]*"><\/script>\n<script src="assets\/rules-gate\.js/);
  const pr = src('profile.html');
  assert.match(pr, /\+wedding\(me,p\)\+\(PWD\?PWD\.html\(\):''\)\+tickets\(me,p\)/);
  const v = src('voyage.html'), dinner = v.slice(v.indexOf('id="dinner"'), v.indexOf('<!-- THE VENUE'));
  assert.match(dinner, /<div class="wd-menu" data-wedding-dinner-menu><\/div>/, 'the menu is drawn from the record — written once');
  const WD = (() => { const g = {}; new Function('globalThis', 'window', src('assets/wedding-dinner.js'))(g, undefined); return g.SIYL_WEDDING_DINNER; })();
  const menu = WD.menuHtml();
  for (const c of ['Dim Sum Selection', 'Har Gow (Steamed Shrimp Dumpling)', 'Abalone Siu Mai', 'Scallop Money Bag', 'Three-Treasure Dumpling', 'Crab Xiao Long Bao', 'Peking Duck', 'Fish Maw Soup', 'Steamed Sea Bass with Soy Sauce', 'Stir-Fried Sea Prawns in XO Sauce', 'Yangzhou Fried Rice with Angus Beef', 'Black Sesame Glutinous Rice Balls in Young Coconut Milk'])
    assert.ok(menu.includes(c.replace(/&/g, '&amp;')), c);
  assert.match(menu, /^<p class="a-eyebrow"[^>]*>The Wedding Dinner set menu<\/p><ol/); assert.doesNotMatch(menu, /<img /);
  assert.match(src('assets/aman.js'), /\['Pre-Wedding Dinner · 27 February', 'pre-wedding-dinner\.html'\][\s\S]*\['Dress code', 'dress\.html'\]/);
  for (const f of ['assets/shop-menu.js', 'assets/recon.js']) { assert.match(src(f), /href="pre-wedding-dinner\.html"/); assert.match(src(f), /href="dress\.html">Dress code/); }
});
