/* ============================================================================
   FINAL AUTOMATED PRE-RELEASE RUN · one fresh end-to-end release walk.

   Public discovery → invitation entry → party auth → WHO ARE YOU → steps
   01–06 → SEND → JOURNEY RECEIVED → (Guest Relations) JOURNEY CONFIRMED,
   as Peggy and as Steffie, with reload, stale session, a second browser
   context, proxy answers and deep links. Every check is read back from the
   page or from the stored record. The Worker's write routes are mocked so no
   production record is touched; the real protected path is proven separately
   with src/gr.cjs against production.

     node docs/acceptance/2026-09-11-final-run/release-walk.mjs [origin] [outdir]
   ========================================================================== */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || path.dirname(fileURLToPath(import.meta.url));
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const TOKEN = process.env.SIYL_TOKEN || (() => { try { const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8'); const row = csv.split(/\r?\n/).find((l) => /INV-002/.test(l)); const m = row && row.match(/[a-z0-9]{16}/); return m ? m[0] : ''; } catch (e) { return ''; } })();
if (!TOKEN) { console.error('no guest code: set SIYL_TOKEN or provide src/invitation-tokens.private.csv'); process.exit(2); }
const MATRIX = [320, 375, 390, 430, 834, 900, 1440, 1920];
const PRIMARY = [390, 834, 1440, 1920];
const results = [], errors = [], consoleErrors = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };

const browser = await chromium.launch();
/* ---- the mocked Worker: register + status; seating stays real-shaped "not open" */
const mock = { status: null, registered: [] };
async function wire(page) {
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error' && !/CORS|net::ERR_FAILED|Failed to load resource/.test(m.text())) consoleErrors.push(m.text().slice(0, 160)); });
  await page.route(WORKER + '/api/**', async (route) => {
    const url = new URL(route.request().url());
    const json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (url.pathname === '/api/status') return json(200, mock.status || { ok: true, received: false, receivedAt: null, confirmed: false, confirmedAt: null });
    if (url.pathname === '/api/register') { if (route.request().method() !== 'POST') return json(405, { ok: false }); const b = JSON.parse(route.request().postData() || '{}'); mock.registered.push(b); mock.status = { ok: true, received: true, receivedAt: new Date().toISOString(), confirmed: false, confirmedAt: null }; return json(200, { ok: true, received: true, receivedAt: mock.status.receivedAt }); }
    if (url.pathname.startsWith('/api/seating')) { if (route.request().method() === 'POST') return json(423, { ok: false, error: 'seating is not open' }); return json(200, { ok: true, open: false, frozen: false, configured: { ceremony: false, dinner: false }, ceremony: null, dinner: null, mine: { ceremony: {}, dinner: {} } }); }
    if (url.pathname.startsWith('/api/inventory')) return json(200, { ok: true, items: {} });
    return json(404, { ok: false });
  });
}
function helpers(page) {
  const H = {};
  H.go = async (file, width = 390) => { await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 }); await page.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' }); await page.waitForTimeout(350); };
  H.scrollAll = async () => { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); }); await page.waitForTimeout(250); };
  H.shot = async (name, width) => { await H.scrollAll(); await page.screenshot({ path: path.join(OUT, name + '-' + width + '.png'), fullPage: true }); };
  H.crop = async (sel, name, width) => { const el = page.locator(sel).first(); if (await el.count()) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(200); await el.screenshot({ path: path.join(OUT, name + '-' + width + '.png') }); } };
  H.text = async (sel) => ((await page.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  H.overflow = async () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  H.ls = async (k) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k);
  H.frames = async (file, name, widths = PRIMARY, crops = []) => { for (const w of widths) { await H.go(file, w); await H.shot(name, w); if (crops.length) await page.addStyleTag({ content: '.prep-bar,header.hd,.jbar{position:static!important}' }); for (const [sel, cn] of crops) await H.crop(sel, cn, w); if (await H.overflow()) note('overflow ' + name + '@' + w, false, 'horizontal page overflow'); } };
  H.tiny = async () => page.evaluate(() => { const bad = []; document.querySelectorAll('main *').forEach((el) => { if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 10 && el.offsetParent) bad.push(el.tagName + ' ' + fs + 'px: ' + el.textContent.trim().slice(0, 30)); }); return bad; });
  H.signIn = async (whoRe) => {
    await H.go('invitation.html', 390);
    await page.click('#open'); await page.waitForSelector('.siyl-inv input', { state: 'visible' });
    await page.fill('.siyl-inv input', TOKEN); await page.click('.siyl-inv .igo');
    /* a device that already knows who is continuing is not asked WHO ARE YOU again */
    const asked = await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 4000 }).then(() => true).catch(() => false); await page.waitForTimeout(300);
    const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
    const me = G.find((g) => whoRe.test(g.preferredName));
    if (asked) { await page.click('.p-drawer [data-who="' + me.guestId + '"]'); await page.waitForTimeout(400); }
    return G;
  };
  return H;
}

/* ================================================================ 1 · public discovery, fresh state */
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage(); await wire(page); const H = helpers(page);
await H.go('index.html', 390);
await page.evaluate(() => localStorage.clear());
await H.go('index.html', 390);
const home = await H.text('body');
note('01 home fresh', /See You In Laos|Haruthai/i.test(home) && !/Continuing as/.test(home), 'home renders with no session');
/* the menu — every destination and public surface */
const menuOpen = page.locator('#menu-open').first();
if (await menuOpen.count()) { await menuOpen.click(); await page.waitForTimeout(400); }
await page.waitForTimeout(500); const menu = await page.evaluate(() => document.body.innerText);
const menuLinks = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
note('01 menu surfaces', ['destination.html', 'journeys.html', 'accommodation.html', 'experiences.html', 'marsilea.html', 'voyage.html', '1872.html', 'your-journey.html'].every((h) => menuLinks.some((l) => l.startsWith(h))) && /Destinations[\s\S]*Bangkok[\s\S]*Vientiane[\s\S]*Kunming/i.test(menu) && /Stays/i.test(menu), 'menu reaches destinations, journeys, stays, experiences, dining, wellness, the wedding, the private journey · missing: ' + ['destination.html', 'journeys.html', 'accommodation.html', 'experiences.html', 'marsilea.html', 'voyage.html', '1872.html', 'your-journey.html'].filter((h) => !menuLinks.some((l) => l.startsWith(h))).join(',') + ' · text ok: ' + (/Destinations[\s\S]*Bangkok[\s\S]*Vientiane[\s\S]*Kunming/i.test(menu) && /Stays/i.test(menu)));
for (const w of PRIMARY) { await H.go('index.html', w); if (await menuOpen.count()) { await menuOpen.click(); await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, 'P1-menu-' + w + '.png') }); } }
for (const [file, name, need] of [['index.html', 'P1-home', /invitation/i], ['destination.html', 'P2-destination', /Bangkok[\s\S]*Vientiane[\s\S]*(Kunming|Lijiang)/], ['accommodation.html', 'P3-stays', /Souphattra/], ['experiences.html', 'P4-experiences', /./], ['marsilea.html', 'P5-dining', /Marsilea/], ['1872.html', 'P6-wellness', /./], ['voyage.html', 'P7-wedding', /Temple Ceremony[\s\S]*Coffee[\s\S]*Vow[\s\S]*Wedding Dinner/], ['journeys.html', 'P8-journeys', /MU9646[\s\S]*C86|C86/], ['invitation.html', 'P9-invitation', /Your Invitation|invited/i]]) {
  await H.frames(file, name, PRIMARY);
  const t = await H.text('body');
  note('01 public ' + file, need.test(t) && !/MU9632|C642|21:0[68]|Welcome Dinner|Sacred Morning/.test(t), file + ' renders the current truth');
  const tiny = await H.tiny(); if (tiny.length) note('01 tiny text ' + file, false, tiny.slice(0, 3).join(' | '));
}
/* the extremes of the matrix on the public pages */
for (const file of ['index.html', 'voyage.html', 'journeys.html']) for (const w of [320, 375, 430, 900]) { await H.go(file, w); await H.shot('M-' + file.replace('.html', ''), w); if (await H.overflow()) note('overflow ' + file + '@' + w, false, 'horizontal page overflow'); }

/* ================================================================ 2 · invitation entry → party auth → WHO ARE YOU */
await H.go('invitation.html', 390);
await page.click('#open'); await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await page.fill('.siyl-inv input', 'wrongcode0000000'); await page.click('.siyl-inv .igo'); await page.waitForTimeout(900);
const wrong = await H.text('body');
note('02 wrong code fails safely', !(await H.ls('siyl.auth')) && !/Peggy/.test(wrong), 'no session, no names');
await page.fill('.siyl-inv input', TOKEN); await page.click('.siyl-inv .igo');
await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 8000 }); await page.waitForTimeout(300);
const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
const P = G.find((g) => /peggy/i.test(g.preferredName)), S = G.find((g) => /steffie/i.test(g.preferredName));
const who = await H.text('.p-drawer');
note('02 who are you', /Peggy/.test(who) && /Steffie/.test(who) && /not another password/i.test(who) && !(await H.ls('siyl.who')), 'the party opened; nobody chosen yet');
await page.screenshot({ path: path.join(OUT, 'S0-who-are-you-390.png') });
const authNow = await H.ls('siyl.auth');
note('02 code not retained in the clear', !JSON.stringify(authNow).includes(TOKEN) && !page.url().includes(TOKEN), 'siyl.auth holds names, not the code; URL clean');
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(400);
note('02 active is Peggy', (await H.ls('siyl.who') || {}).guestId === P.guestId && /Continuing as Peggy/i.test(await H.text('.prep-bar')), 'activeGuestId = Peggy, said in words');
await H.frames('invitation.html', 'S1-invitation', PRIMARY);

/* ================================================================ 2b · step 01 · You (party contact, identity reviewed) */
await H.go('you.html', 390);
const y1 = await H.text('main');
note('02b you page', /Peggy/.test(y1) && /Steffie/.test(y1) && (await page.locator('#p-email').count()) === 1, 'both names, one party contact');
await page.fill('#p-email', 'peggy.steffie@example.test'); await page.locator('#p-email').dispatchEvent('change'); await page.waitForTimeout(250);
note('02b party contact shared', (await H.ls('siyl.guest') || {}).party && (await H.ls('siyl.guest')).party.email === 'peggy.steffie@example.test', 'email stored once for the party');
await H.frames('you.html', 'S1b-you', PRIMARY);

/* ================================================================ 3 · step 02 · journey (shared) */
await H.go('your-journey.html', 390);
const order = await page.evaluate(() => [...document.querySelectorAll('#chrono .p-stage .p-stage-h .t-l1')].map((e) => e.textContent.trim()));
note('03 chronology', order.length === 11 && /21 – 24 FEB/.test(order[0]) && /24 – 25 FEB|24 FEB/.test(order[1]) && /25 – 27 FEB/.test(order[2]) && /27 FEB/.test(order[3]) && /28 FEB/.test(order[4]) && /01 MAR/.test(order[5]) && /04 MAR/.test(order[7]) && /06 – 08 MAR/.test(order[10]), order.join(' | '));
await page.locator('#bkksel [data-choose="u-sathorn-superior-garden"]').click(); await page.waitForTimeout(300);
await page.locator('#bkksel [data-choose="shama-king-studio-balcony"]').click(); await page.waitForTimeout(300);
let bag = await H.ls('siyl.bag');
note('03 bangkok replaced not duplicated', bag.filter((x) => x.id === 'bkk-stay').length === 1 && bag.find((x) => x.id === 'bkk-stay').room === 'shama-king-studio-balcony', 'one Bangkok line after two choices');
await page.locator('#flysel [data-cls="business"]').click(); await page.waitForTimeout(250);
await page.locator('#flysel [data-cls="economy-flexible"]').click(); await page.waitForTimeout(250);
await page.locator('#flysel [data-cls="business"]').click(); await page.waitForTimeout(250);
bag = await H.ls('siyl.bag');
const mu = bag.filter((x) => x.id === 'mu9646');
note('03 mu9646 one fare', mu.length === 1 && mu[0].cls === 'business' && mu[0].price === 275, 'business after economy → one line USD 275');
const flyTxt = await H.text('#s-mu9646');
note('03 mu9646 truth', /01 MAR/.test(flyTxt) && /15:50/.test(flyTxt) && /18:25/.test(flyTxt) && /1h 35m/i.test(flyTxt) && /Business Class USD 275/i.test(flyTxt) && /Economy Flexible USD 155/i.test(flyTxt) && /2 pieces of checked baggage/i.test(flyTxt) && /Meal service/i.test(flyTxt) && /1 piece of free checked baggage/i.test(flyTxt) && /No meals/i.test(flyTxt) && /Conditional ticket refund/i.test(flyTxt) && /Free rescheduling/i.test(flyTxt) && !/MU9632/.test(flyTxt), flyTxt.slice(0, 200));
await page.locator('#s-c86 [data-choose-flat="c86"]').click(); await page.waitForTimeout(250);
const c86Txt = await H.text('#s-c86');
note('03 c86 truth', /04 MAR/.test(c86Txt) && /10:15/.test(c86Txt) && /13:44/.test(c86Txt) && /3h 29m/i.test(c86Txt) && /direct/i.test(c86Txt) && /Business/.test(c86Txt) && /85/.test(c86Txt) && !/C642|21:0/.test(c86Txt), c86Txt.slice(0, 200));
const trainTxt = await H.text('#s-train');
note('03 train stage', /Nong Khai/.test(trainTxt) && /25/.test(trainTxt), trainTxt.slice(0, 160));
await H.frames('your-journey.html', 'S2-journey', PRIMARY, [['#s-bkk-stay', 'S2-bangkok'], ['#s-mu9646', 'S2-mu9646'], ['#s-c86', 'S2-c86']]);
for (const w of [320, 375, 430, 900]) { await H.go('your-journey.html', w); await H.shot('M-journey', w); if (await H.overflow()) note('overflow journey@' + w, false, 'horizontal page overflow'); }

/* ================================================================ 4 · step 03 · the wedding (personal, with proxy) */
await H.go('wedding.html', 390);
const w3 = await H.text('main');
note('04 four events', (await page.locator('main section.prep-sec').count()) === 4 && /Temple Ceremony/.test(w3) && /Coffee & Cake/.test(w3) && /Vow Ceremony/.test(w3) && /Wedding Dinner/.test(w3) && !/Welcome Dinner|Sacred Morning|Alms Giving Ceremony/.test(w3), 'exactly four');
note('04 temple truth', /08:00 – 12:00/.test(w3) && /Wat Ong Teu/.test(w3) && /28 February 2027|28 FEB/.test(w3), 'date · time · place');
note('04 tak bat self-pay', /self-pay/i.test(w3) && !/no charge|nothing to pay/i.test(w3) && !/Tak Bat[^.]{0,60}USD/.test(w3), 'inside the ceremony, self-pay, unpriced');
for (const e of ['temple', 'coffee', 'vows', 'dinner']) { const b = page.locator('[data-g="' + P.guestId + '"][data-e="' + e + '"] [data-ev="yes"]'); if (await b.count()) { await b.click(); await page.waitForTimeout(200); } }
const evKeys = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-e]')].map((x) => x.getAttribute('data-e')))]);
for (const e of evKeys) { await page.locator('[data-g="' + P.guestId + '"][data-e="' + e + '"] [data-ev="yes"]').first().click().catch(() => {}); await page.waitForTimeout(150); }
let T = await H.ls('siyl.temple');
note('04 peggy answers hers', T.by[P.guestId].attend === 'yes' && evKeys.filter((e) => e !== 'temple').every((e) => (T.by[P.guestId].events || {})[e] === 'yes') && T.by[P.guestId].by === P.guestId, 'temple attend + ' + evKeys.filter((e) => e !== 'temple').join(',') + ' · signed by Peggy');
/* proxy: Peggy answers every event for Steffie — permitted, and signed */
for (const e of evKeys) { await page.locator('[data-g="' + S.guestId + '"][data-e="' + e + '"] [data-ev="yes"]').first().click().catch(() => {}); await page.waitForTimeout(150); }
T = await H.ls('siyl.temple');
note('04 proxy signed', T.by[S.guestId].events[evKeys[1]] === 'yes' && T.by[S.guestId].by === P.guestId && /For Steffie · answering for Steffie/i.test(w3.replace(/\s+/g, ' ')) || /answering for Steffie/i.test(await H.text('main')), 'Steffie\'s answer written by Peggy and said so');
const sang = await H.text('#sangkhathan');
note('04 sangkhathan unresolved', !/data-off/.test(await page.locator('#sangkhathan').innerHTML().catch(() => '')) && !/USD 30/.test(sang) && (await page.locator('#sangkhathan [data-off]').count()) === 0, 'no decision offered, no amount, no purchase-like state: ' + sang.slice(0, 120));
note('04 no sangkhathan in bag', !((await H.ls('siyl.bag')) || []).some((x) => x.id === 'sangkhathan'), 'nothing inferred into the journey');
await H.frames('wedding.html', 'S3-wedding', PRIMARY, [['#sangkhathan', 'S3-sangkhathan']]);

/* ================================================================ 5 · step 04 · dress + seats (personal) */
await H.go('wedding-preparation.html', 390);
const w4 = await H.text('main');
note('05 dress mapping', /Blue Lao Traditional Dress[\s\S]{0,120}Temple Ceremony/i.test(w4) && /Black Tie[\s\S]{0,200}(Coffee|Vow|Dinner)/i.test(w4) && /Resort Wear/i.test(w4), 'blue Lao traditional → temple · black tie → afternoon and evening · resort wear → travelling days');
note('05 rails', (await page.locator('.p-rail img').count()) === 17 && !(await page.content()).includes('resort-01'), '17 references, resort-01 gone');
note('05 one acknowledgement per guest', (await page.locator('#ack .p-card').count()) === 2 && (await page.locator('#ack [data-ack]').count()) === 1 && (await page.locator('#ack [data-ack="' + P.guestId + '"]').count()) === 1, 'Peggy sees her own checkbox only');
await page.locator('#ack [data-ack="' + P.guestId + '"]').check(); await page.waitForTimeout(250);
let rec = await H.ls('siyl.guest');
note('05 dress personal', rec.guests[P.guestId].dress && rec.guests[P.guestId].dress.by === P.guestId && !(rec.guests[S.guestId] || {}).dress, 'Peggy acknowledged; Steffie untouched');
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
await page.click('.p-drawer [data-who="' + S.guestId + '"]'); await page.waitForTimeout(400);
note('05 switch shows her checkbox', (await page.locator('#ack [data-ack="' + S.guestId + '"]').count()) === 1 && (await page.locator('#ack [data-ack="' + P.guestId + '"]').count()) === 0, 'after SWITCH only Steffie\'s acknowledgement is answerable');
await page.locator('#ack [data-ack="' + S.guestId + '"]').check(); await page.waitForTimeout(250);
rec = await H.ls('siyl.guest');
note('05 steffie dress own name', rec.guests[S.guestId].dress && rec.guests[S.guestId].dress.by === S.guestId && rec.guests[P.guestId].dress.by === P.guestId, 'each acknowledgement signed by its own guest');
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(400);
note('05 seating not open', /Not open yet/i.test(await H.text('#seats')) && (await page.locator('#seats svg, #seats [data-seat]').count()) === 0 && /For Peggy/i.test(await H.text('#seats')) && /For Steffie/i.test(await H.text('#seats')) && !/C-[LR]-|D-[TB]-/.test(await H.text('#seats')), 'closed, per guest, no chairs, no seat ids');
await H.frames('wedding-preparation.html', 'S4-preparation', PRIMARY, [['#ack', 'S4-ack'], ['#seats', 'S4-seats']]);
for (const w of [320, 375, 430, 900]) { await H.go('wedding-preparation.html', w); await H.shot('M-preparation', w); if (await H.overflow()) note('overflow preparation@' + w, false, 'horizontal page overflow'); }

/* ================================================================ 6 · step 05 · about you (personal, consent first person) */
await H.go('about-you.html', 390);
const a5 = await H.text('main');
note('06 four areas', /Hospitality profile/.test(a5) && /Accessibility & comfort/.test(a5) && /Travel documents/.test(a5) && /Photographs and film/.test(a5), 'four editorial areas');
note('06 consent personal', (await page.locator('[data-consent]').count()) === 1 && !(await page.locator('[data-consent]').first().isChecked()), 'one unchecked affirmative consent for Peggy only');
await page.fill('textarea[data-q="drink"]', 'Riesling'); await page.locator('textarea[data-q="drink"]').blur(); await page.waitForTimeout(200);
await page.locator('[data-consent]').first().check(); await page.waitForTimeout(200);
rec = await H.ls('siyl.guest');
const docs = await H.ls('siyl.docs');
note('06 peggy record', rec.guests[P.guestId].profile.drink === 'Riesling' && !!docs && JSON.stringify(docs).includes(P.guestId) && !JSON.stringify(docs).includes('"' + S.guestId + '"'), 'profile in Peggy\'s record; consent stored for Peggy only');
/* deep link: answering for Steffie */
await H.go('about-you.html?for=' + S.guestId, 390);
note('06 deep link answering for', /Answering for\s*Steffie/i.test(await H.text('.prep-bar')) && (await page.locator('[data-consent]').count()) === 0, 'subject = Steffie, her consent not answerable by Peggy');
await page.fill('textarea[data-q="dietary"]', 'No shellfish'); await page.locator('textarea[data-q="dietary"]').blur(); await page.waitForTimeout(200);
rec = await H.ls('siyl.guest');
note('06 proxy ownership', rec.guests[S.guestId].profile.dietary === 'No shellfish' && rec.guests[S.guestId].history.at(-1).by === P.guestId && rec.guests[P.guestId].profile.drink === 'Riesling' && !rec.guests[P.guestId].profile.dietary, 'Steffie\'s dietary signed by Peggy; Peggy\'s drink untouched');
note('06 switch ≠ answering for', (await H.ls('siyl.who')).guestId === P.guestId, 'activeGuestId still Peggy after the deep link');
await H.frames('about-you.html', 'S5-about-you', PRIMARY);
await H.frames('about-you.html?for=' + S.guestId, 'S5-about-you-for-steffie', [390, 1440], [['.prep-bar', 'S5-bar-for-steffie']]);

/* ================================================================ 7 · step 06 · review → send → received */
await H.go('review.html', 390);
const r6 = await H.text('main');
note('07 review hierarchy', ['You', 'Your journey', 'The Wedding', 'Documents & privacy', 'Your costs'].every((h) => r6.replace(/\s/g, '').includes(h.replace(/\s/g, ''))), 'five blocks');
note('07 status only', !/assets\/images\/dress/.test(await page.content()) && (await page.locator('main [data-ev], main [data-off], main [data-choose], main textarea, main [data-consent], main [data-ack]').count()) === 0, 'no controls, no gallery');
note('07 costs once, no checkout', (await page.locator('#tt').count()) === 1 && !/checkout|\bcart\b|pay now|proceed to pay/i.test(r6) && /nothing is paid|never charged|no payment/i.test(r6), await H.text('#tt') + ' · says nothing is paid here');
const linesBefore = await page.locator('#items .p-line').count();
note('07 shared once', linesBefore === ((await H.ls('siyl.bag')) || []).length, linesBefore + ' lines = bag');
note('07 not sent', (await H.text('#journeystate')) === '' && !(await page.locator('#sendbox').isHidden()), 'send available, no state card');
await H.frames('review.html', 'S6-review', PRIMARY);
for (const w of [320, 375, 430, 900]) { await H.go('review.html', w); await H.shot('M-review', w); if (await H.overflow()) note('overflow review@' + w, false, 'horizontal page overflow'); }
await H.go('review.html', 390);
await page.click('#send'); await page.waitForTimeout(1200);
const sent = mock.registered[0];
note('07 send payload', !!sent && sent.invitationId === 'INV-002' && JSON.stringify(sent).includes('Riesling') && JSON.stringify(sent).includes('No shellfish') && !JSON.stringify(sent).includes(TOKEN), 'one party record with both guests, no code inside');
const recTxt = await H.text('#journeystate');
note('07 received', /Journey received/i.test(recTxt) && /Received is not confirmed/i.test(recTxt) && !/confirmed your journey/i.test(recTxt) && !(await page.locator('#sendbox').isHidden()), 'received ≠ confirmed; a correction can still be sent (send stays available until Guest Relations confirms)');
await H.frames('review.html', 'S7-received', PRIMARY, [['#journeystate', 'S7-received-card']]);
await H.go('your-journey.html', 390); await page.click('.prep-all').catch(() => {}); await page.waitForTimeout(300);
const stepsTxt = await H.text('.prep-steps');
note('07 shell received', /Review & Send\s*Received/i.test(stepsTxt), 'step 06 reads Received from another step · ' + stepsTxt.slice(0, 200));
await H.go('review.html', 390);

/* a change after sending is said, and send stays available */
await H.go('wedding.html', 390); await page.locator('[data-g="' + P.guestId + '"][data-e="coffee"] [data-ev="no"]').first().click(); await page.waitForTimeout(250);
await H.go('review.html', 390);
note('07b changed since sending', /Changed since you sent it/i.test(await H.text('#journeystate')) && !(await page.locator('#sendbox').isHidden()), 'the guest is told to send again');
await H.crop('#journeystate', 'S7b-received-changed', 390);
await H.go('wedding.html', 390); await page.locator('[data-g="' + P.guestId + '"][data-e="coffee"] [data-ev="yes"]').first().click(); await page.waitForTimeout(250);
await H.go('review.html', 390);
note('07b back in step, no notice', !/Changed since you sent it/i.test(await H.text('#journeystate')), 'restoring the sent answer clears the notice');

/* reload / re-entry keeps state and ownership */
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(400);
rec = await H.ls('siyl.guest');
note('08 reload', /Continuing as Peggy/i.test(await H.text('.prep-bar')) && rec.guests[P.guestId].profile.drink === 'Riesling' && /Journey received/i.test(await H.text('#journeystate')), 'identity, record and status survive reload');

/* ================================================================ 8 · Steffie · second browser context (her own device) */
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page2 = await ctx2.newPage(); await wire(page2); const H2 = helpers(page2);
await H2.signIn(/steffie/i);
note('09 steffie own device', (await H2.ls('siyl.who')).guestId === S.guestId && /Continuing as Steffie/i.test(await H2.text('.prep-bar')), 'active = Steffie');
await H2.go('wedding-preparation.html', 390);
note('09 steffie sees her checkbox', (await page2.locator('#ack [data-ack="' + S.guestId + '"]').count()) === 1 && (await page2.locator('#ack [data-ack="' + P.guestId + '"]').count()) === 0, 'only her own acknowledgement');
await page2.locator('#ack [data-ack="' + S.guestId + '"]').check(); await page2.waitForTimeout(250);
const rec2 = await H2.ls('siyl.guest');
note('09 steffie dress personal', rec2.guests[S.guestId].dress.by === S.guestId, 'signed by Steffie');
await H2.go('about-you.html', 390);
note('09 steffie consent hers', (await page2.locator('[data-consent]').count()) === 1, 'her own consent, first person');
await H2.frames('wedding-preparation.html', 'S8-steffie-preparation', [390, 1440], [['#ack', 'S8-steffie-ack']]);

/* SWITCH on Peggy's device: switching changes who is continuing, nobody's answers */
await H.go('about-you.html', 390);
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
await page.click('.p-drawer [data-who="' + S.guestId + '"]'); await page.waitForTimeout(400);
rec = await H.ls('siyl.guest');
note('10 switch', /Continuing as Steffie/i.test(await H.text('.prep-bar')) && rec.guests[P.guestId].profile.drink === 'Riesling' && rec.guests[S.guestId].profile.dietary === 'No shellfish', 'identity changed, answers unchanged, ownership intact');
note('10 costs not duplicated after switch', (await H.ls('siyl.bag')).filter((x) => x.id === 'bkk-stay').length === 1 && (await H.ls('siyl.bag')).filter((x) => x.id === 'mu9646').length === 1, 'one Bangkok line, one fare line');
await H.go('review.html', 390);
note('10 review after switch', (await page.locator('#items .p-line').count()) === linesBefore && /For your party · Peggy & Steffie/i.test(await H.text('main')), 'same shared lines, same party');
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(300);

/* ================================================================ 9 · Guest Relations confirms (protected path, mocked status) */
mock.status = { ok: true, received: true, receivedAt: mock.status.receivedAt, confirmed: true, confirmedAt: new Date().toISOString() };
await H.go('review.html', 390);
const conf = await H.text('#journeystate');
note('11 confirmed', /Journey confirmed/i.test(conf) && /A · Party journey confirmation/i.test(conf) && /B · Personal wedding card/i.test(conf) && (await page.locator('#sendbox').isHidden()), 'party confirmation once + personal cards');
const cards = await page.locator('#journeystate .p-wcard').allInnerTexts();
note('11 one card per guest', cards.length === 2 && /Peggy/.test(cards[0]) && /Steffie/.test(cards[1]), 'two cards, named');
note('11 cards personal state', /Temple Ceremony\s*Attending/i.test(cards[0]) && /Coffee & Cake\s*Joining/i.test(cards[0]) && /Dress code\s*Reviewed/i.test(cards[0]) && /Temple Ceremony\s*Attending/i.test(cards[1]) && /Dress code\s*Reviewed/i.test(cards[1]) && !/Not decided|Not yet reviewed/i.test(cards[0] + cards[1]), 'each card carries that guest\'s own sent state');
const confA = await H.text('#journeystate');
note('11 party block from the sent journey', /Shama Yen-Akat/i.test(confA) && /MU9646/.test(confA) && /C86/.test(confA) && !/No shared stay/i.test(confA) && !/Changed since confirmation/i.test(confA), 'block A lists the sent shared lines, nothing changed');
/* a change made after confirmation is never shown as confirmed */
await H.go('wedding.html', 390);
note('11 shell says confirmed on a step', /Journey confirmed/i.test(await H.text('.prep-bar')) && /Changes here are not sent/i.test(await H.text('.prep-bar')), 'the bar on step 03 says the confirmed journey is not changed here');
await page.locator('[data-g="' + P.guestId + '"][data-e="temple"] [data-ev="no"]').first().click(); await page.waitForTimeout(250);
await H.go('review.html', 390);
const confB = await H.text('#journeystate');
const cardsB = await page.locator('#journeystate .p-wcard').allInnerTexts();
note('11 change after confirmation not shown as confirmed', /Changed since confirmation · not sent/i.test(confB) && /Temple Ceremony\s*Attending/i.test(cardsB[0]) && !/Not attending/i.test(cardsB[0]), 'the notice appears; the card still shows what was confirmed');
await H.frames('review.html', 'S9b-confirmed-changed', [390, 1440], [['#journeystate', 'S9b-confirmed-changed-block']]);
await H.go('wedding.html', 390); await page.locator('[data-g="' + P.guestId + '"][data-e="temple"] [data-ev="yes"]').first().click(); await page.waitForTimeout(250);
note('11 no ticket imitation', !/barcode|QR|scan|boarding|gate|seat \d|row \d/i.test(conf) && (await page.locator('#journeystate img, #journeystate svg, #journeystate canvas').count()) === 0 && !/C-[LR]-\d|D-[TB]-\d/.test(conf), 'no QR, no barcode, no seat shown while seating is closed');
await H.frames('review.html', 'S9-confirmed', PRIMARY, [['#journeystate', 'S9-confirmed-block'], ['#journeystate .p-wcard', 'S9-card-peggy']]);
/* Steffie's device sees the same party state */
await H2.go('review.html', 390);
const conf2 = await H2.text('#journeystate');
note('11 steffie sees confirmed honestly', /Journey confirmed/i.test(conf2) && /sent from another device/i.test(conf2) && (await page2.locator('#journeystate .p-wcard').count()) === 0 && !/No shared stay|Not decided/i.test(conf2), 'a device that never sent shows no invented cards');
await H2.frames('review.html', 'S9c-confirmed-other-device', [390, 1440], [['#journeystate', 'S9c-confirmed-other-device-block']]);
mock.status = null;

/* ================================================================ 10 · stale session */
await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); delete a.guests; localStorage.setItem('siyl.auth', JSON.stringify(a)); });
await H.go('your-journey.html', 390);
const staleTxt = await H.text('body');
note('12 stale session', !/Continuing as/.test(staleTxt) && (/code|invitation/i.test(staleTxt)) && !errors.length, 'a session without names is not trusted; the guest is asked for the code again');
await page.screenshot({ path: path.join(OUT, 'S10-stale-390.png') });
/* re-entry after stale: names return, the record is still there */
await H.signIn(/peggy/i);
rec = await H.ls('siyl.guest');
note('12 re-entry keeps record', rec && rec.guests[P.guestId].profile.drink === 'Riesling', 'answers survive re-entry');

/* ================================================================ 11 · deep links + correction flows */
await H.go('review.html', 390);
const editLinks = await page.evaluate(() => [...document.querySelectorAll('main a[href]')].map((a) => a.getAttribute('href')).filter((h) => /\.html/.test(h)));
let deadDeep = [];
for (const h of [...new Set(editLinks)]) { const [f, id] = h.split('#'); await H.go(f, 390); if (id && !(await page.evaluate((id) => !!document.getElementById(id), id))) deadDeep.push(h); }
note('13 review deep links', deadDeep.length === 0, deadDeep.length ? 'missing: ' + deadDeep.join(', ') : editLinks.length + ' edit links resolve while signed in');
await H.go('wedding.html?for=' + S.guestId, 390);
note('13 wedding deep link for', /Answering for\s*Steffie/i.test(await H.text('.prep-bar')), 'subject via ?for=');

fs.writeFileSync(path.join(OUT, 'release-walk-results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results, errors, consoleErrors }, null, 2));
console.log('\n' + results.filter((r) => r.ok).length + '/' + results.length + ' checks pass · page errors: ' + errors.length + ' · console errors: ' + consoleErrors.length);
await browser.close();
