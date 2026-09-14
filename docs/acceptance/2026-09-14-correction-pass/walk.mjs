/* 002 — FINAL TARGETED CORRECTION PASS (Owner screenshots, 14 Sep 2026) · the browser walk.
   Real encrypted bundle (codes from the private register, never printed); the Worker's
   register / status / seating routes mocked; the INVENTORY route mocked with the SAME
   rules as the ledger (held stock sellable to INV-001 only) so the four items are proven
   end to end without a production write.
     node docs/acceptance/2026-09-14-correction-pass/walk.mjs <origin> [out.json] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { SEED, unitsFor, sellable } from '../../../src/inventory-seed.js';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null;
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const T1 = tok('INV-001'), T2 = tok('INV-002');
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await chromium.launch();

/* the mocked ledger, the seed's rules */
const allocs = {}; let registerMode = 'ok'; const registered = []; let status = null;
function snapshot(except, forInv) {
  const used = {}; for (const [inv, rec] of Object.entries(allocs)) { if (except && inv === except) continue; for (const l of rec.lines) used[l.key] = (used[l.key] || 0) + l.units; }
  const items = {}; for (const key of Object.keys(SEED)) { const s = SEED[key]; const own = s.held > 0 && s.heldFor === 'Bride & Groom' && forInv === 'INV-001'; const cap = sellable(key, forInv); const taken = used[key] || 0;
    items[key] = { unit: s.unit, occupancy: s.occupancy || null, capacity: s.capacity, held: own ? 0 : (s.held || 0), heldFor: s.heldFor || null, heldForYou: own, allocated: taken, remaining: Math.max(0, cap - taken), soldOut: cap - taken <= 0, name: s.name }; }
  return { items };
}
async function wire(page) {
  page.on('pageerror', (e) => console.log('   PAGE ERROR', e.message.slice(0, 140)));
  await page.route(WORKER + '/api/**', async (route) => {
    const url = new URL(route.request().url()), json = (st, body) => route.fulfill({ status: st, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/api/status') return json(200, status || { ok: true, received: false, receivedAt: null, confirmed: false, confirmedAt: null });
    if (url.pathname === '/api/register') { if (registerMode === 'fail') return json(503, { ok: false, error: 'registration could not be stored' }); const bd = JSON.parse(route.request().postData() || '{}'); registered.push(bd); const at = bd.registration.registration_submitted_at; status = { ok: true, received: true, receivedAt: at, confirmed: false, confirmedAt: null }; return json(202, { ok: true, status: 'UNDER_REVIEW', stored: true, mailed: false, submittedAt: at }); }
    if (url.pathname.startsWith('/api/inventory')) {
      const op = url.pathname.replace(/^.*\/api\/inventory\/?/, '') || 'read';
      if (op === 'read') return json(200, { ok: true, ...snapshot(null, url.searchParams.get('invitation')) });
      if (op === 'reserve') { const bd = JSON.parse(route.request().postData() || '{}'); const snap = snapshot(bd.invitationId, bd.invitationId); const want = []; for (const l of bd.lines || []) { const key = l.win + '/' + l.slug; if (!SEED[key]) continue; want.push({ key, units: unitsFor(key, l.qty || 1), qty: l.qty || 1 }); }
        const conflicts = want.filter((w) => w.units > snap.items[w.key].remaining).map((w) => ({ key: w.key, name: SEED[w.key].name, unit: SEED[w.key].unit, wanted: w.units, remaining: snap.items[w.key].remaining, heldFor: SEED[w.key].heldFor || null }));
        if (conflicts.length) return json(409, { ok: false, error: 'sold out', conflicts, ...snapshot(null, bd.invitationId) });
        allocs[bd.invitationId] = { lines: want }; return json(200, { ok: true, reserved: want, ...snapshot(null, bd.invitationId) }); }
      if (op === 'release') { const bd = JSON.parse(route.request().postData() || '{}'); delete allocs[bd.invitationId]; return json(200, { ok: true, ...snapshot(null, bd.invitationId) }); }
      return json(200, { ok: true, allocation: null });
    }
    if (url.pathname.startsWith('/api/seating')) { if (route.request().method() === 'POST') return json(423, { ok: false, error: 'seating is not open' }); return json(200, { ok: true, open: false, frozen: false, configured: { ceremony: false, dinner: false }, ceremony: null, dinner: null, mine: { ceremony: {}, dinner: {} } }); }
    return json(404, { ok: false });
  });
}
const ctx = await b.newContext({ viewport: { width: 834, height: 1112 } }); const p = await ctx.newPage(); await wire(p);
const go = async (f) => { await p.goto('about:blank'); await p.goto(ORIGIN + '/' + f, { waitUntil: 'networkidle' }); await p.waitForTimeout(500); };
const txt = async (sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
const signIn = async (token, who) => { await go('invitation.html'); await p.evaluate(() => localStorage.clear()); await go('invitation.html'); await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300); const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth'))); const me = g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(400); return g; };
const bag = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.bag') || '[]'));

/* ================================================================ 1 · a FRESH INV-001 login — sign out first, session cleared, the code entered again */
const g1 = await signIn(T1, /haruthai/i);
note('1 fresh INV-001 login', g1.invitationId === 'INV-001' && g1.hosts === true && g1.guests.length === 2, 'hosts flag explicit in the bundle · party of two');
const HOST_ROOMS = [['souphattra', 'souphattra-presidential', 'Souphattra Presidential', ['prewed', 'wedstay']], ['kunming', 'solarium', 'Solarium Bath Suite', ['kmg']], ['lijiang', 'view-suite-270', '270° Snow Mountain View Suite', ['ljg']]];
for (const [stay, slug, name, wins] of HOST_ROOMS) {
  await go('room.html?stay=' + stay + '&room=' + slug);
  const before = await p.evaluate(() => [...document.querySelectorAll('.buy .win')].map((w) => ({ label: w.querySelector('.wl').textContent.trim(), rsv: (w.querySelector('.rsvline') || {}).textContent || '', cta: (w.querySelector('.cta') || {}).textContent || '', disabled: !!(w.querySelector('.cta') || {}).disabled, av: (w.querySelector('.av') || {}).textContent || '' })));
  note('2 INV-001 · ' + name + ' offers the choice', before.length === wins.length && before.every((w) => /Add to Your Journey/.test(w.cta) && !w.disabled && /Reserved for bride & groom · held for your party — yours to choose/i.test(w.rsv)), JSON.stringify(before));
  for (let i = 0; i < wins.length; i++) { await p.locator('.buy .win .cta[data-win="' + i + '"]').click(); await p.waitForTimeout(500); }
  const after = await p.evaluate(() => [...document.querySelectorAll('.buy .win .cta')].map((c) => c.textContent.trim()));
  const inBag = (await bag()).filter((x) => x.room === slug).map((x) => x.id);
  note('2 INV-001 · ' + name + ' selected', after.every((t) => /Remove from Your Journey/.test(t)) && wins.every((w) => inBag.some((id) => id.startsWith(w))) , 'bag: ' + inBag.join(' ') + ' · buttons: ' + after.join(' | '));
}
await go('journeys.html');
const rowsHost = await p.evaluate(() => [...document.querySelectorAll('.var')].filter((a) => a.querySelector('.vr')).map((a) => ({ name: a.dataset.name, rsvd: a.classList.contains('rsvd'), gone: a.classList.contains('gone'), on: a.classList.contains('on'), vr: a.querySelector('.vr').textContent.trim(), sel: (a.querySelector('.vsel') || {}).textContent || '' })));
note('3 INV-001 · journeys rows: every Bride & Groom row open and marked selected, family rows reserved', rowsHost.filter((r) => /bride/i.test(r.vr)).every((r) => !r.rsvd && !r.gone && r.on && /yours to choose/.test(r.vr) && /Selected/.test(r.sel)) && rowsHost.filter((r) => /family/i.test(r.vr)).every((r) => r.rsvd && r.gone && !r.on), JSON.stringify(rowsHost).slice(0, 400));
const acts = await p.evaluate(() => [...document.querySelectorAll('[data-stayact]')].map((a) => a.dataset.stayact + ':' + a.innerText.replace(/\s+/g, ' ').trim().slice(0, 80)));
note('3 INV-001 · stay actions say Selected · Change room / Remove for the chosen stays, Add for the open ones', acts.filter((a) => /Selected · in your journey/i.test(a)).length === 4 && acts.filter((a) => /Add to Your Journey/i.test(a)).length >= 1 && !acts.some((a) => /Selected[^]*Add to Your Journey/i.test(a)), acts.join(' | '));
/* the totals follow the selection; a reload keeps it */
const total1 = await p.evaluate(() => document.querySelector('.jbar .jb-t')?.textContent);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(500);
const total2 = await p.evaluate(() => document.querySelector('.jbar .jb-t')?.textContent);
note('3 INV-001 · totals and the selection persist across a reload', total1 === total2 && (await bag()).filter((x) => /presidential|solarium|view-suite-270/.test(x.room)).length === 4, total1 + ' = ' + total2);
/* Review & Send: the ledger accepts the hosts' rooms */
await go('you.html'); await p.fill('#p-email', 'hosts@example.test'); await p.locator('#p-email').dispatchEvent('change'); await p.waitForTimeout(200);
await go('your-journey.html'); await p.click('#fxb').catch(() => {}); await p.waitForTimeout(400); await p.click('#fxg').catch(() => {}); await p.waitForTimeout(600);
const bagFx = await bag();
note('3b INV-001 · Full Experience fills the open stages and keeps the couple’s reserved rooms', bagFx.filter((x) => /presidential|solarium|view-suite-270/.test(x.room)).length === 4 && bagFx.length >= 10, bagFx.map((x) => x.id + (x.room ? ':' + x.room : '')).join(' '));

/* ================================================================ 4 · a NORMAL party cannot */
await signIn(T2, /peggy/i);
await go('room.html?stay=souphattra&room=souphattra-presidential');
const normal = await p.evaluate(() => [...document.querySelectorAll('.buy .win')].map((w) => ({ rsv: (w.querySelector('.rsvline') || {}).textContent || '', cta: !!w.querySelector('.cta') })));
note('4 INV-002 · the Presidential stays reserved: the label, no button', normal.length === 2 && normal.every((w) => /Reserved for bride & groom/i.test(w.rsv) && !/yours to choose/.test(w.rsv) && !w.cta), JSON.stringify(normal));
await go('journeys.html');
const rowsNormal = await p.evaluate(() => [...document.querySelectorAll('.var')].filter((a) => a.querySelector('.vr')).map((a) => ({ name: a.dataset.name, rsvd: a.classList.contains('rsvd'), gone: a.classList.contains('gone'), vr: a.querySelector('.vr').textContent.trim() })));
note('4 INV-002 · every reserved row (Bride & Groom and family) unavailable, label intact', rowsNormal.length === 6 && rowsNormal.every((r) => r.rsvd && r.gone && !/yours to choose/.test(r.vr)), JSON.stringify(rowsNormal).slice(0, 300));
/* forcing a reserved room into the bag by hand: the ledger refuses it at SEND */
await p.evaluate(() => { const b = JSON.parse(localStorage.getItem('siyl.bag') || '[]'); b.push({ id: 'wedstay', name: 'Wedding Stay', meta: 'Souphattra Presidential', room: 'souphattra-presidential', price: 750, qty: 2, stay: 'souphattra' }); localStorage.setItem('siyl.bag', JSON.stringify(b)); });
await go('you.html'); await p.fill('#p-email', 'x@example.test'); await p.locator('#p-email').dispatchEvent('change'); await p.waitForTimeout(200);
await go('your-journey.html'); await p.click('#fxb').catch(() => {}); await p.waitForTimeout(400); await p.click('#fxg').catch(() => {}); await p.waitForTimeout(600);
await p.evaluate(() => { const b = JSON.parse(localStorage.getItem('siyl.bag') || '[]').filter((x) => x.id !== 'wedstay'); b.push({ id: 'wedstay', name: 'Wedding Stay', meta: 'Souphattra Presidential', room: 'souphattra-presidential', price: 750, qty: 2, stay: 'souphattra' }); localStorage.setItem('siyl.bag', JSON.stringify(b)); });
await go('wedding.html'); const keys = await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-e]')].map((x) => x.getAttribute('data-e')))]); const G2 = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
for (const g of G2.guests) for (const e of keys) { await p.locator('[data-g="' + g.guestId + '"][data-e="' + e + '"] [data-ev="yes"]').first().click().catch(() => {}); await p.waitForTimeout(80); }
await p.click('#sangkhathan [data-off="no"]').catch(() => {}); await p.waitForTimeout(200);
await go('wedding-preparation.html'); for (const g of G2.guests) { await p.locator('#ack [data-ack="' + g.guestId + '"]').check().catch(() => {}); await p.click('.prep-bar [data-switch]').catch(() => {}); await p.waitForSelector('.p-drawer:not([hidden])').catch(() => {}); await p.click('.p-drawer [data-who="' + (G2.guests.find((x) => x.guestId !== g.guestId)).guestId + '"]').catch(() => {}); await p.waitForTimeout(300); }
for (const g of G2.guests) { await go('about-you.html?for=' + g.guestId); await p.fill('textarea[data-q="access"]', 'None'); await p.locator('textarea[data-q="access"]').blur(); await p.locator('input[data-none="dietary"]').check().catch(() => {}); await p.waitForTimeout(200); }
await go('review.html'); await p.click('#send'); await p.waitForTimeout(1000);
const refused = await txt('#soldout');
note('4 INV-002 · the ledger refuses a Bride & Groom room smuggled into the bag: not sent, the reason named', /Not sent/i.test(refused) && /Souphattra Presidential/.test(refused) && /reserved for Bride & Groom/i.test(refused) && registered.length === 0, refused.slice(0, 160));
await p.evaluate(() => { const b = JSON.parse(localStorage.getItem('siyl.bag') || '[]').filter((x) => x.id !== 'wedstay'); localStorage.setItem('siyl.bag', JSON.stringify(b)); });
await go('your-journey.html'); await p.click('#fxb').catch(() => {}); await p.waitForTimeout(400); await p.click('#fxg').catch(() => {}); await p.waitForTimeout(600);

/* ================================================================ 5 · SIAM KEMPINSKI · the stay state model */
await go('journeys.html');
const kemp = await p.evaluate(() => { const a = document.querySelector('[data-stayact="kempinski"]'); return { text: a.innerText.replace(/\s+/g, ' ').trim(), add: a.querySelectorAll('[data-stay-add]').length, change: a.querySelectorAll('[data-stay-change]').length, remove: a.querySelectorAll('[data-stay-remove]').length, row: document.querySelector('[data-rooms="kempinski"] .var.on .vsel')?.textContent }; });
note('5 Kempinski selected: Selected · Deluxe Balcony King · REMOVE, no Add, no Change (one room only)', /Selected · in your journey/i.test(kemp.text) && /Deluxe Balcony King/i.test(kemp.text) && kemp.add === 0 && kemp.change === 0 && kemp.remove === 1 && /Selected · in your journey/.test(kemp.row || ''), JSON.stringify(kemp));
await p.locator('[data-stayact="kempinski"] [data-stay-remove]').click(); await p.waitForTimeout(400);
const kemp2 = await p.evaluate(() => { const a = document.querySelector('[data-stayact="kempinski"]'); return { text: a.innerText.replace(/\s+/g, ' ').trim(), add: a.querySelectorAll('[data-stay-add]').length, row: !!document.querySelector('[data-rooms="kempinski"] .var.on') }; });
note('5 Kempinski removed: Add to Your Journey offered, no row selected', kemp2.add === 1 && /Add to Your Journey/i.test(kemp2.text) && !kemp2.row && !(await bag()).some((x) => x.id === 'kempinski'), JSON.stringify(kemp2));
await p.locator('[data-stayact="kempinski"] [data-stay-add]').click(); await p.waitForTimeout(500);
const kemp3 = await p.evaluate(() => ({ text: document.querySelector('[data-stayact="kempinski"]').innerText.replace(/\s+/g, ' ').trim(), row: !!document.querySelector('[data-rooms="kempinski"] .var.on') }));
note('5 Kempinski added again (one room: added at once), the row and the state agree, one line in the journey', /Selected · in your journey/i.test(kemp3.text) && kemp3.row && (await bag()).filter((x) => x.id === 'kempinski').length === 1, JSON.stringify(kemp3));
/* a multi-room stay: CHANGE ROOM makes the rows the choice, in place */
const lj = await p.evaluate(() => document.querySelector('[data-stayact="ljg"]').innerText.replace(/\s+/g, ' ').trim());
await p.locator('[data-stayact="ljg"] [data-stay-change]').click(); await p.waitForTimeout(400);
const picking = await p.evaluate(() => ({ picking: document.querySelector('[data-rooms="lijiang"]').dataset.picking, picks: document.querySelectorAll('[data-rooms="lijiang"] .var[data-pick]:not(.rsvd):not(.gone)').length, note: document.querySelector('[data-stayact="ljg"] .chgnote')?.textContent || '', keep: document.querySelector('[data-stayact="ljg"] [data-stay-change]')?.textContent }));
const target = await p.evaluate(() => { const a = [...document.querySelectorAll('[data-rooms="lijiang"] .var[data-pick]:not(.rsvd):not(.gone):not(.on)')][0]; return a && a.dataset.room; });
await p.locator('[data-rooms="lijiang"] .var[data-room="' + target + '"]').click(); await p.waitForTimeout(500);
const lj2 = await p.evaluate(() => ({ text: document.querySelector('[data-stayact="ljg"]').innerText.replace(/\s+/g, ' ').trim(), picking: document.querySelector('[data-rooms="lijiang"]').dataset.picking, on: document.querySelector('[data-rooms="lijiang"] .var.on')?.dataset.room, url: location.pathname }));
note('5 Lijiang CHANGE ROOM → rows become the choice in place → a tap replaces the room, one line, still on the page', /Selected/i.test(lj) && picking.picking === '1' && picking.picks >= 5 && /Tap another room/i.test(picking.note) && /Keep this room/i.test(picking.keep || '') && lj2.on === target && lj2.picking === '' && (await bag()).filter((x) => x.id === 'ljg').length === 1 && /journeys/.test(lj2.url), target + ' → ' + lj2.text.slice(0, 60));

/* ================================================================ 6 · SPECIAL EXPRESS No. 25 · USD 100 */
await go('your-journey.html');
const trainCard = await txt('#s-train');
const tLine = (await bag()).find((x) => x.id === 'train');
note('6 Special Express No. 25 · Your Journey card says USD 100 per person · package; the line is 100', /USD 100/.test(trainCard) && /per person · package/i.test(trainCard) && !/USD 75\b/.test(trainCard) && tLine && tLine.price === 100, trainCard.match(/USD [0-9,]+[^·]*/g)?.slice(0, 3).join(' · '));
await go('journeys.html'); const jTrain = await txt('#j-train');
await go('transport.html?id=train'); const dTrain = await txt('main');
note('6 Special Express No. 25 · journeys card and the detail page say USD 100, never 75', /USD 100 per person/.test(jTrain) && !/USD 75\b/.test(jTrain) && !/USD 75\b/.test(dTrain), jTrain.match(/USD [0-9]+[^·]*/)?.[0] + ' · detail: ' + (dTrain.match(/USD [0-9]+/g) || []).join(','));
await go('review.html'); const rv1 = await txt('#items');
note('6 Special Express No. 25 · Review & Send line: USD 100 per person × 1 guest = USD 100', /Special Express No\. 25/.test(rv1) && /USD 100 per person × 1 guest/.test(rv1) && !/USD 75\b/.test(rv1), (rv1.match(/Special Express[^]{0,90}/) || [''])[0]);
/* the same line for two participating guests: the one calculation source multiplies */
await p.evaluate(() => { SIYL_BAG.qty('train', 1); }); await p.waitForTimeout(300);
const rv2 = await txt('#items'); const trainTotal = (await bag()).filter((x) => x.id === 'train').reduce((t, x) => t + x.price * (x.qty || 1), 0);
note('6 Special Express No. 25 · two participating guests → USD 100 per person × 2 guests = USD 200', /USD 100 per person × 2 guests/.test(rv2) && trainTotal === 200, (rv2.match(/Special Express[^]{0,90}/) || [''])[0]);
await p.evaluate(() => { SIYL_BAG.qty('train', -1); });

/* ================================================================ 7 · REVIEW & SEND · the success state, the failure, the reload, the change, the newer version */
registerMode = 'fail'; await go('review.html'); await p.click('#send'); await p.waitForTimeout(900);
const failed = await p.evaluate(() => ({ err: document.getElementById('err').innerText, sent: document.getElementById('sent').hidden, btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, done: document.getElementById('donebox').hidden }));
note('7 server failure paints NO success: the backup channel, the button still SEND', /could not be stored/.test(failed.err) && failed.sent === true && /^Send to Guest Relations$/.test(failed.btn) && failed.done === true && registered.length === 0, JSON.stringify(failed).slice(0, 200));
registerMode = 'ok'; await go('review.html'); await p.click('#send'); await p.waitForTimeout(1200);
const okState = await p.evaluate(() => ({ sentHidden: document.getElementById('sent').hidden, h: document.getElementById('sent-h').textContent, at: document.getElementById('sent-at').innerText, btn: document.getElementById('send').textContent.trim(), aria: document.getElementById('send').getAttribute('aria-disabled'), state: document.getElementById('send').dataset.state, done: document.getElementById('donebox').hidden, card: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ').slice(0, 120), focused: document.activeElement && document.activeElement.id }));
const sentAt = registered[0] && registered[0].registration.registration_submitted_at;
note('7 first send → RECEIVED: the success card with the server’s stamp, the button reads SENT TO GUEST RELATIONS, focus on it, the What-happens-now box under it', okState.sentHidden === false && /received by Guest Relations/.test(okState.h) && /Received · \d\d [A-Z][a-z]{2,4} 2026 · \d\d:\d\d · your time/.test(okState.at) && okState.btn === 'Sent to Guest Relations' && okState.aria === 'true' && okState.state === 'sent' && okState.done === false && /Journey received/i.test(okState.card) && okState.focused === 'sent' && registered.length === 1 && !!sentAt, JSON.stringify(okState).slice(0, 300));
await p.locator('#send').dispatchEvent('click'); await p.waitForTimeout(600);
note('7 a second tap on SENT sends nothing again (no duplicate)', registered.length === 1, 'registered ' + registered.length);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
const re = await p.evaluate(() => ({ sentHidden: document.getElementById('sent').hidden, btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, card: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ').slice(0, 60) }));
note('7 reload keeps the server-backed SENT state (button + card)', re.sentHidden === false && re.btn === 'Sent to Guest Relations' && re.state === 'sent' && /Journey received/i.test(re.card), JSON.stringify(re));
await p.click('#again'); await p.waitForTimeout(300);
const again = await p.evaluate(() => ({ btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, sentHidden: document.getElementById('sent').hidden }));
note('7 CHANGE MY JOURNEY AND SEND AGAIN reopens the send (button "Send to Guest Relations again")', again.state === 'again' && /again$/.test(again.btn) && again.sentHidden === true, JSON.stringify(again));
await go('wedding.html'); await p.locator('[data-g="' + G2.guests[0].guestId + '"][data-e="coffee"] [data-ev="no"]').first().click(); await p.waitForTimeout(250);
await go('review.html');
const chg = await p.evaluate(() => ({ btn: document.getElementById('send').textContent.trim(), state: document.getElementById('send').dataset.state, notice: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ') }));
note('7 a change after sending: "Changed since you sent it", the button offers the send again, no SENT claim', /Changed since you sent it/i.test(chg.notice) && chg.state === 'again' && chg.btn !== 'Sent to Guest Relations', chg.btn);
await p.click('#send'); await p.waitForTimeout(1200);
const second = await p.evaluate(() => ({ btn: document.getElementById('send').textContent.trim(), at: document.getElementById('sent-at').innerText, notice: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ') }));
note('7 the newer send supersedes: SENT again with the newer stamp, no "changed" notice, two records (newest wins), never counted twice', second.btn === 'Sent to Guest Relations' && registered.length === 2 && registered[1].registration.registration_submitted_at > sentAt && !/Changed since you sent it/i.test(second.notice), second.at);
/* newer version from another device: this device's draft is older → the send is offered, SENT is not claimed */
status = { ok: true, received: true, receivedAt: new Date(Date.now() + 3600000).toISOString(), confirmed: false, confirmedAt: null };
await go('review.html');
const newer = await p.evaluate(() => ({ btn: document.getElementById('send').textContent.trim(), sentHidden: document.getElementById('sent').hidden, notice: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ') }));
note('7 a newer version from another device: named, and this device does not claim SENT', /newer version was sent from another device/i.test(newer.notice) && newer.sentHidden === true && newer.btn !== 'Sent to Guest Relations', newer.btn);
status = { ok: true, received: true, receivedAt: registered[1].registration.registration_submitted_at, confirmed: true, confirmedAt: new Date().toISOString() };
await go('review.html');
const conf = await p.evaluate(() => ({ send: document.getElementById('sendbox').hidden, card: document.getElementById('journeystate').innerText.replace(/\s+/g, ' ').slice(0, 80) }));
note('7 CONFIRMED stays distinct: the confirmation card, the send area withdrawn', conf.send === true && /Journey confirmed/i.test(conf.card), conf.card);
status = null;
await b.close();
const pass = R.filter((r) => r.ok).length; console.log(pass + '/' + R.length + ' correction-pass checks pass on ' + ORIGIN);
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), pass, total: R.length, results: R }, null, 1));
process.exit(pass === R.length ? 0 : 1);
