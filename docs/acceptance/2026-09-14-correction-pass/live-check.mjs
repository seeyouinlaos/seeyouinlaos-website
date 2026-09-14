/* 002 — FINAL TARGETED CORRECTION PASS · the LIVE check after deployment (production Worker).
   1 · INV-001, a fresh login: every Bride & Groom room selectable on the real room pages, the real
       ledger read as INV-001 says so; the real ledger accepts a reservation of the couple's own
       categories by INV-001 and refuses the same to INV-002 — INV-001's existing allocation is put
       back exactly (lines and quantities; the ledger stamps its own time).
   2 · INV-002, a real Review & Send against the real register endpoint: the success state, the
       reload, the server's stamp — then the test record and the test allocation are removed again.
   3 · Special Express No. 25 = USD 100 on the live pages.
   Codes from the private register, never printed.
     node docs/acceptance/2026-09-14-correction-pass/live-check.mjs [outdir] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev', API = ORIGIN + '/api';
const OUT = process.argv[2] || null; if (OUT) fs.mkdirSync(OUT, { recursive: true });
const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const j = async (u, init) => { const r = await fetch(u, init); return { status: r.status, ...(await r.json()) }; };
const post = (op, body) => j(API + '/inventory/' + op, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/* ---- 0 · the state as the Owner left it */
const st1 = await j(API + '/status?invitation=INV-001'), st2 = await j(API + '/status?invitation=INV-002');
const mine1 = await j(API + '/inventory/mine?invitationId=INV-001'), mine2 = await j(API + '/inventory/mine?invitationId=INV-002');
note('0 production read', st1.ok && st2.ok, 'INV-001 received ' + st1.received + ' (' + st1.receivedAt + ') · alloc ' + JSON.stringify(mine1.allocation && mine1.allocation.lines) + ' · INV-002 received ' + st2.received + ' · alloc ' + JSON.stringify(mine2.allocation));
const keep1 = mine1.allocation ? mine1.allocation.lines.map((l) => ({ win: l.key.split('/')[0], slug: l.key.split('/')[1], qty: l.qty || 1 })) : null;

/* ---- 1 · the ledger as each party sees it, on production */
const asHosts = await j(API + '/inventory?invitation=INV-001'), asGuest = await j(API + '/inventory?invitation=INV-002');
const HELD = ['prewed/souphattra-presidential', 'wedstay/souphattra-presidential', 'kmg/solarium', 'ljg/view-suite-270'];
note('1 live ledger · read as INV-001: every Bride & Groom category open to the couple; read as INV-002: reserved', HELD.every((k) => asHosts.items[k].heldForYou === true && asHosts.items[k].remaining >= 1) && HELD.every((k) => asGuest.items[k].heldForYou === false && asGuest.items[k].remaining === 0) && asHosts.items['wedstay/grand-majestic'].remaining === 0, HELD.map((k) => k + ' hosts:' + asHosts.items[k].remaining + ' guest:' + asGuest.items[k].remaining).join(' · '));
const refuse = await post('reserve', { invitationId: 'INV-002', lines: [{ win: 'wedstay', slug: 'souphattra-presidential', qty: 2 }] });
note('1 live ledger · INV-002 asking for the Presidential is refused, the reason named, nothing written', refuse.status === 409 && refuse.ok === false && refuse.conflicts && refuse.conflicts[0].heldFor === 'Bride & Groom' && !(await j(API + '/inventory/mine?invitationId=INV-002')).allocation, JSON.stringify(refuse.conflicts));
const accept = await post('reserve', { invitationId: 'INV-001', lines: [...(keep1 || []), { win: 'wedstay', slug: 'souphattra-presidential', qty: 2 }, { win: 'kmg', slug: 'solarium', qty: 2 }, { win: 'ljg', slug: 'view-suite-270', qty: 2 }] });
note('1 live ledger · INV-001 reserving its own categories is accepted', accept.status === 200 && accept.ok === true && accept.reserved.some((w) => w.key === 'wedstay/souphattra-presidential') && accept.items['wedstay/souphattra-presidential'].remaining === 0, JSON.stringify(accept.reserved));
/* put the Owner's allocation back exactly (lines and quantities) */
const restore = keep1 ? await post('reserve', { invitationId: 'INV-001', lines: keep1 }) : await post('release', { invitationId: 'INV-001' });
const mine1b = await j(API + '/inventory/mine?invitationId=INV-001');
note('1 live ledger · INV-001 allocation restored exactly', restore.ok === true && JSON.stringify(mine1b.allocation && mine1b.allocation.lines) === JSON.stringify(mine1.allocation && mine1.allocation.lines), JSON.stringify(mine1b.allocation && mine1b.allocation.lines));

/* ---- 2 · the browser, INV-001 fresh login: the room pages */
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
const errs = []; p.on('pageerror', (e) => errs.push(e.message));
const go = async (f) => { await p.goto('about:blank'); await p.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(700); };
const txt = async (sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const signIn = async (token, who) => { await go('invitation.html'); await p.evaluate(() => localStorage.clear()); await go('invitation.html'); await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 15000 }); await p.waitForTimeout(300); const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth'))); const me = g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(400); return g; };
const g1 = await signIn(tok('INV-001'), /haruthai/i);
note('2 live INV-001 · signed out, session cleared, code entered again: hosts flag explicit', g1.invitationId === 'INV-001' && g1.hosts === true, 'party of ' + g1.guests.length);
for (const [stay, slug, name, n] of [['souphattra', 'souphattra-presidential', 'Souphattra Presidential', 2], ['kunming', 'solarium', 'Solarium Bath Suite', 1], ['lijiang', 'view-suite-270', '270° Snow Mountain View Suite', 1]]) {
  await go('room.html?stay=' + stay + '&room=' + slug);
  const w = await p.evaluate(() => [...document.querySelectorAll('.buy .win')].map((x) => ({ rsv: (x.querySelector('.rsvline') || {}).textContent || '', cta: (x.querySelector('.cta') || {}).textContent || '', disabled: !!(x.querySelector('.cta') || {}).disabled, av: (x.querySelector('.av') || {}).textContent || '' })));
  note('2 live INV-001 · ' + name + ': the label, the choice, the live count', w.length === n && w.every((x) => /Reserved for bride & groom · held for your party — yours to choose/i.test(x.rsv) && /Add to Your Journey/.test(x.cta) && !x.disabled && /room(s)? remaining/.test(x.av)), JSON.stringify(w));
  if (OUT) await p.screenshot({ path: path.join(OUT, 'live-' + slug + '.png') });
  await p.locator('.buy .win .cta').first().click(); await p.waitForTimeout(400);
  const after = await p.evaluate((slug) => ({ btn: (document.querySelector('.buy .win .cta') || {}).textContent, inBag: JSON.parse(localStorage.getItem('siyl.bag') || '[]').some((x) => x.room === slug) }), slug);
  note('2 live INV-001 · ' + name + ' selected (this device’s journey)', /Remove from Your Journey/.test(after.btn || '') && after.inBag, after.btn);
}
await go('journeys.html');
const rows = await p.evaluate(() => [...document.querySelectorAll('.var')].filter((a) => a.querySelector('.vr')).map((a) => ({ name: a.dataset.name, rsvd: a.classList.contains('rsvd'), gone: a.classList.contains('gone'), on: a.classList.contains('on'), vr: a.querySelector('.vr').textContent.trim() })));
note('2 live INV-001 · journeys: every Bride & Groom row open (the three chosen ones selected), family rows reserved', rows.filter((r) => /bride/i.test(r.vr)).every((r) => !r.rsvd && !r.gone) && rows.filter((r) => /bride/i.test(r.vr) && r.on).length === 3 && rows.filter((r) => /family/i.test(r.vr)).every((r) => r.rsvd && r.gone), JSON.stringify(rows).slice(0, 300));
if (OUT) await p.screenshot({ path: path.join(OUT, 'live-journeys-hosts.png') });
await p.evaluate(() => localStorage.clear());

/* ---- 3 · INV-002: a real Review & Send on production, then the record and the allocation removed */
const g2 = await signIn(tok('INV-002'), /peggy/i);
await go('room.html?stay=souphattra&room=souphattra-presidential');
const normal = await p.evaluate(() => [...document.querySelectorAll('.buy .win')].map((x) => ({ rsv: (x.querySelector('.rsvline') || {}).textContent || '', cta: !!x.querySelector('.cta') })));
note('3 live INV-002 · the Presidential stays reserved, no button', normal.length === 2 && normal.every((x) => /Reserved for bride & groom/i.test(x.rsv) && !/yours/.test(x.rsv) && !x.cta), JSON.stringify(normal));
await go('you.html'); await p.fill('#p-email', 'peggy.steffie@example.test'); await p.locator('#p-email').dispatchEvent('change'); await p.waitForTimeout(200);
await go('your-journey.html'); await p.click('#fxb'); await p.waitForTimeout(500); await p.click('#fxg'); await p.waitForTimeout(800);
const trainCard = await txt('#s-train');
note('3 live · Special Express No. 25 says USD 100 per person · package', /USD 100/.test(trainCard) && /per person · package/i.test(trainCard) && !/USD 75\b/.test(trainCard), (trainCard.match(/USD [0-9]+[^·]*/) || [''])[0]);
await go('wedding.html'); const keys = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-e]')].map((x) => x.getAttribute('data-e')))]);
for (const g of g2.guests) for (const e of keys) { await p.locator('[data-g="' + g.guestId + '"][data-e="' + e + '"] [data-ev="yes"]').first().click().catch(() => {}); await p.waitForTimeout(80); }
await p.click('#sangkhathan [data-off="no"]').catch(() => {}); await p.waitForTimeout(300);
await go('wedding-preparation.html'); for (const g of g2.guests) { await p.locator('#ack [data-ack="' + g.guestId + '"]').check().catch(() => {}); await p.click('.prep-bar [data-switch]').catch(() => {}); await p.waitForSelector('.p-drawer:not([hidden])').catch(() => {}); await p.click('.p-drawer [data-who="' + g2.guests.find((x) => x.guestId !== g.guestId).guestId + '"]').catch(() => {}); await p.waitForTimeout(300); }
for (const g of g2.guests) { await go('about-you.html?for=' + g.guestId); await p.fill('textarea[data-q="access"]', 'None'); await p.locator('textarea[data-q="access"]').blur(); await p.locator('input[data-none="dietary"]').check().catch(() => {}); await p.waitForTimeout(200); }
await go('review.html'); const ready = await p.evaluate(() => window.SIYL_GUEST.readiness().ok);
await p.click('#send'); await p.waitForSelector('#sent:not([hidden])', { timeout: 20000 }).catch(() => {}); await p.waitForTimeout(800);
const sent = await p.evaluate(() => ({ h: document.getElementById('sent-h').textContent, at: document.getElementById('sent-at').innerText, btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, hidden: document.getElementById('sent').hidden, done: document.getElementById('donebox').hidden, card: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
const stAfter = await j(API + '/status?invitation=INV-002');
note('3 live REVIEW & SEND · the real register endpoint stored it: RECEIVED with the server’s stamp, the button SENT TO GUEST RELATIONS', ready && sent.hidden === false && /received by Guest Relations/.test(sent.h) && /Received · \d\d [A-Z][a-z]{2,4} 2026 · \d\d:\d\d · your time/.test(sent.at) && sent.btn === 'Sent to Guest Relations' && sent.state === 'sent' && sent.done === false && stAfter.received === true, JSON.stringify(sent).slice(0, 260) + ' · server receivedAt ' + stAfter.receivedAt);
if (OUT) { await p.evaluate(() => document.getElementById('sent').scrollIntoView({ block: 'start' })); await p.waitForTimeout(300); await p.screenshot({ path: path.join(OUT, 'live-review-sent.png') }); }
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
const re = await p.evaluate(() => ({ btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, hidden: document.getElementById('sent').hidden }));
note('3 live REVIEW & SEND · a reload keeps the server-backed SENT state', re.btn === 'Sent to Guest Relations' && re.state === 'sent' && re.hidden === false, JSON.stringify(re));
const alloc2 = await j(API + '/inventory/mine?invitationId=INV-002');
note('3 live · the ledger holds INV-002’s test rooms (to be released)', !!alloc2.allocation && alloc2.allocation.lines.length > 0, JSON.stringify(alloc2.allocation && alloc2.allocation.lines.map((l) => l.key)));
await b.close();

/* ---- 4 · restore: release the test allocation, delete the test registration record */
const rel = await post('release', { invitationId: 'INV-002' });
let kvDeleted = [];
try {
  const list = JSON.parse(execFileSync(path.join(ROOT, 'node_modules/.bin/wrangler'), ['kv', 'key', 'list', '--namespace-id', '090270d0da434a8b8f49933cb604beb3'], { cwd: ROOT }).toString());
  for (const k of list.map((x) => x.name).filter((n) => n === 'reg:INV-002' || n.startsWith('reg:INV-002:prev:'))) { execFileSync(path.join(ROOT, 'node_modules/.bin/wrangler'), ['kv', 'key', 'delete', '--namespace-id', '090270d0da434a8b8f49933cb604beb3', k], { cwd: ROOT, stdio: 'ignore' }); kvDeleted.push(k); }
} catch (e) { console.log('   wrangler kv: ' + String(e.message).slice(0, 120)); }
const stEnd2 = await j(API + '/status?invitation=INV-002'), mineEnd2 = await j(API + '/inventory/mine?invitationId=INV-002'), stEnd1 = await j(API + '/status?invitation=INV-001'), mineEnd1 = await j(API + '/inventory/mine?invitationId=INV-001');
note('4 restored · INV-002 back to no record and no allocation; INV-001 record and allocation lines as before', rel.ok === true && stEnd2.received === false && !mineEnd2.allocation && stEnd1.receivedAt === st1.receivedAt && JSON.stringify(mineEnd1.allocation && mineEnd1.allocation.lines) === JSON.stringify(mine1.allocation && mine1.allocation.lines), 'deleted ' + kvDeleted.join(', ') + ' · INV-001 receivedAt ' + stEnd1.receivedAt);
note('5 live errors', errs.length === 0, errs.slice(0, 3).join(' | ') || 'none');
const pass = R.filter((r) => r.ok).length; console.log(pass + '/' + R.length + ' live checks pass on ' + ORIGIN);
if (OUT) fs.writeFileSync(path.join(OUT, 'live-check-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
process.exit(pass === R.length ? 0 : 1);
