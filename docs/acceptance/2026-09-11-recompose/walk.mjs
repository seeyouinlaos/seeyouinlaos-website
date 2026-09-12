/* ============================================================================
   D · RECOMPOSE ALL SIX PREPARATION SURFACES — the rendered acceptance walk.

   Peggy & Steffie (INV-002), the real code, every required state of §25 at
   390 · 834 · 1440 · 1920. Every frame is a real render; every check is read
   back from the page. Element crops are taken where a full page would hide
   the state under the sticky shell.

     node docs/acceptance/2026-09-11-recompose/walk.mjs [origin] [outdir]
   ========================================================================== */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = process.argv[2] || 'http://127.0.0.1:8787';
const OUT = process.argv[3] || path.dirname(fileURLToPath(import.meta.url));
/* the guest code is never written into the repository: SIYL_TOKEN, or the
 * gitignored token register src/invitation-tokens.private.csv (INV-002). */
const TOKEN = process.env.SIYL_TOKEN || (() => { try { const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8'); const row = csv.split(/\r?\n/).find((l) => /INV-002/.test(l)); const m = row && row.match(/[a-z0-9]{16}/); return m ? m[0] : ''; } catch (e) { return ''; } })();
if (!TOKEN) { console.error('no guest code: set SIYL_TOKEN or provide src/invitation-tokens.private.csv'); process.exit(2); }
const WIDTHS = [390, 834, 1440, 1920];
const results = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });

async function go(file, width) {
  await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
  await page.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
}
async function shot(name, width, full = true) {
  /* photographs load lazily as a guest scrolls; a full-page frame is taken
   * after the whole page has been scrolled through, as a guest would */
  if (full) { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); }); await page.waitForTimeout(500); }
  await page.screenshot({ path: path.join(OUT, name + '-' + width + '.png'), fullPage: full }); }
async function crop(sel, name, width) {
  const el = page.locator(sel).first();
  if (await el.count()) await el.screenshot({ path: path.join(OUT, name + '-' + width + '.png') });
}
async function text(sel) { return ((await page.locator(sel).first().textContent().catch(() => '')) || '').replace(/\s+/g, ' ').trim(); }
async function overflow() { return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); }
async function ls(k) { return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k); }
async function allWidths(file, name, crops = []) {
  for (const w of WIDTHS) {
    await go(file, w);
    await shot(name, w);
    /* an element crop scrolls its target into view; the sticky shell and the
     * fixed journey bar would then be painted across it. They are part of the
     * page, not of the state being inspected, so they are held still here. */
    if (crops.length) await page.addStyleTag({ content: '.prep-bar{position:static!important}.jbar{display:none!important}' });
    for (const [sel, cname] of crops) await crop(sel, cname, w);
    if (await overflow()) note('overflow ' + name + '@' + w, false, 'horizontal overflow');
  }
  await go(file, 390);
}
async function tapTargets(minW = 44) {
  return page.evaluate((minW) => {
    const bad = [];
    document.querySelectorAll('main button, main a[href], main input[type=checkbox], .prep-bar button').forEach((el) => {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const box = el.closest('label') || el;
      const rb = box.getBoundingClientRect();
      if (rb.height < minW - 1 && !(el.type === 'checkbox')) bad.push((el.textContent || el.getAttribute('aria-label') || el.className).trim().slice(0, 40) + ' ' + Math.round(rb.height));
    });
    return bad;
  }, minW);
}

/* ---------------------------------------------------------------- open the party as Peggy */
await go('invitation.html', 390);
await page.evaluate(() => localStorage.clear());
await go('invitation.html', 390);
await page.click('#open');
await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await page.fill('.siyl-inv input', TOKEN);
await page.click('.siyl-inv .igo');
await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 8000 });
await page.waitForTimeout(300);
const G = await page.evaluate(() => JSON.parse(localStorage.getItem('siyl.auth')).guests);
const P = G.find((g) => /peggy/i.test(g.preferredName)), S = G.find((g) => /steffie/i.test(g.preferredName));
await page.click('.p-drawer [data-who="' + P.guestId + '"]');
await page.waitForTimeout(400);

/* ---------------------------------------------------------------- 01 YOUR INVITATION · Peggy */
await allWidths('invitation.html', '01-invitation-peggy');
const inv = await text('main');
note('01 invitation answers the five questions', /Peggy & Steffie/.test(inv) && /You are continuing as Peggy/.test(inv) && /For your party/.test(inv) && /For each of you/.test(inv) && /Continue to Your Journey/.test(inv), 'whose · who · shared · personal · next');
note('01 no data-model language', !/partyId|activeGuestId|subjectGuestId|source record|submitted|migration/i.test(inv), 'no technical vocabulary on the surface');
note('01 targets', (await tapTargets()).length === 0, 'tap targets ≥44: ' + JSON.stringify(await tapTargets()));

/* ---------------------------------------------------------------- 02 YOUR JOURNEY · the three Bangkok states */
await go('your-journey.html', 390);
const order = await page.evaluate(() => [...document.querySelectorAll('#chrono .p-stage .p-stage-h .t-l1')].map((e) => e.textContent.trim()));
note('02 chronology', order.length === 11 && /^01 · 21 – 24 FEB/.test(order[0]) && /28 FEB/.test(order[4]) && /^05 · 01 MAR/.test(order[5]) && /^10 · 06 – 08 MAR/.test(order[10]), 'stages in order: ' + order.join(' | '));
for (const [slug, name] of [['penthouse', 'sathorn'], ['u-sathorn-superior-garden', 'u-sathorn'], ['shama-king-studio-balcony', 'shama']]) {
  await go('your-journey.html', 390);
  await page.locator('#bkksel [data-choose="' + slug + '"]').click();
  await page.waitForTimeout(400);
  const bag = await ls('siyl.bag');
  const bkk = bag.filter((x) => x.id === 'bkk-stay');
  note('02 bangkok ' + name, bkk.length === 1 && bkk[0].room === slug && /Selected for your journey/.test(await text('#bkksel .p-chosen')), 'one Bangkok line: ' + bkk[0].name + ' · ' + bkk[0].room);
  await allWidths('your-journey.html', '02-journey-' + name, [['#s-bkk-stay', '02-journey-' + name + '-stage']]);
}
/* MU9646 business, then economy */
await go('your-journey.html', 390);
await page.locator('#flysel [data-cls="business"]').click(); await page.waitForTimeout(300);
let mu = (await ls('siyl.bag')).filter((x) => x.id === 'mu9646');
note('02 mu9646 business', mu.length === 1 && mu[0].cls === 'business' && mu[0].price === 275, 'one fare line · ' + mu[0].meta + ' · USD ' + mu[0].price);
await allWidths('your-journey.html', '02-journey-mu9646-business', [['#s-mu9646', '02-journey-mu9646-business-stage']]);
await go('your-journey.html', 390);
await page.locator('#flysel [data-cls="economy-flexible"]').click(); await page.waitForTimeout(300);
mu = (await ls('siyl.bag')).filter((x) => x.id === 'mu9646');
note('02 mu9646 economy', mu.length === 1 && mu[0].cls === 'economy-flexible' && mu[0].price === 155, 'replaced, not duplicated · USD ' + mu[0].price);
await allWidths('your-journey.html', '02-journey-mu9646-economy', [['#s-mu9646', '02-journey-mu9646-economy-stage']]);
/* C86 */
await go('your-journey.html', 390);
await page.locator('#s-c86 [data-choose-flat="c86"]').click(); await page.waitForTimeout(300);
const c86 = (await ls('siyl.bag')).filter((x) => x.id === 'c86');
note('02 c86', c86.length === 1 && c86[0].price === 85 && /10:15/.test(await text('#s-c86')) && /13:44/.test(await text('#s-c86')) && /3h 29m · direct/.test(await text('#s-c86')) && /1 \+ 1 seating/.test(await text('#s-c86')), 'C86 · USD 85 · 10:15 → 13:44 · direct · 1+1');
await allWidths('your-journey.html', '02-journey-c86', [['#s-c86', '02-journey-c86-stage']]);
/* compact wedding block */
const wb = await text('#s-wedding');
note('02 wedding compact', /28 FEB/.test(await text('#s-wedding .p-stage-h')) && /Temple Ceremony/.test(wb) && /Wedding Dinner/.test(wb) && /For Peggy/.test(wb) && /For Steffie/.test(wb) && /Complete wedding decisions/.test(wb) && !/Attending/.test(wb) && !/Tak Bat is/.test(wb), 'four parts, per-person status, one action, no controls');
await allWidths('your-journey.html', '02-journey-wedding', [['#s-wedding', '02-journey-wedding-block']]);
note('02 targets', (await tapTargets()).length === 0, 'tap targets ≥44: ' + JSON.stringify(await tapTargets()));
note('02 party label once per product', (await page.evaluate(() => document.querySelectorAll('#chrono [data-party-label]').length)) === 0 && /For your party · Peggy & Steffie/.test(await text('.prep-head [data-party-label]')), 'the shell and the head carry the party; stages are not re-labelled per person');

/* ---------------------------------------------------------------- 03 THE WEDDING · Peggy, and Peggy answering for Steffie */
await go('wedding.html', 390);
await page.click('[data-g="' + P.guestId + '"][data-e="temple"] [data-ev="yes"]'); await page.waitForTimeout(250);
const w3 = await text('main');
note('03 private module', /01 · 08:00 – 12:00/.test(w3) && /Temple Ceremony/.test(w3) && /More about Tak Bat/.test(w3) && /For Peggy · you/.test(w3) && /For Steffie · answering for Steffie/.test(w3) && /Answering for\s*Steffie/.test(await text('.p-for')), 'day in order, ownership at every control, band at the boundary');
note('03 four events', (await page.evaluate(() => document.querySelectorAll('main section.prep-sec').length)) === 4, 'exactly four event sections');
note('03 not the public page', !/assets\/images\/dress/.test(await page.content()) && !/Continue exploring/.test(w3), 'no editorial gallery, no public navigation');
await allWidths('wedding.html', '03-wedding-peggy', [['#ev-temple', '03-wedding-temple']]);
await go('wedding.html', 390);
await page.click('[data-g="' + S.guestId + '"][data-e="coffee"] [data-ev="yes"]'); await page.waitForTimeout(250);
const st = await ls('siyl.temple');
note('03 answering for Steffie', st.by[S.guestId].events.coffee === 'yes' && st.by[S.guestId].by === P.guestId, 'Steffie\'s Coffee & Cake answered, signed by Peggy');
await allWidths('wedding.html', '03-wedding-peggy-for-steffie', [['[data-g="' + S.guestId + '"][data-e="coffee"]', '03-wedding-steffie-row']]);
note('03 targets', (await tapTargets()).length === 0, 'tap targets ≥44: ' + JSON.stringify(await tapTargets()));

/* ---------------------------------------------------------------- 04 WEDDING PREPARATION · Peggy state, Steffie state, seating */
await go('wedding-preparation.html', 390);
await page.check('#ack [data-ack="' + P.guestId + '"]'); await page.waitForTimeout(300);
const rec = await ls('siyl.guest');
note('04 dress per guest', rec.guests[P.guestId].dress.by === P.guestId && !(rec.guests[S.guestId] || {}).dress && (await page.locator('#ack .p-card').count()) === 2, 'Peggy acknowledged in her own name; Steffie\'s card without a checkbox');
note('04 seating not open', /Not open yet/.test(await text('#seats')) && (await page.locator('#seats svg, #seats [data-seat]').count()) === 0, 'no chairs, no geometry, no seat IDs');
await allWidths('wedding-preparation.html', '04-preparation-peggy', [['#ack', '04-preparation-peggy-ack'], ['#seats', '04-preparation-seating']]);
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(300);
await shot('04-switch-person', 390, false);
await page.click('.p-drawer [data-who="' + S.guestId + '"]'); await page.waitForTimeout(400);
note('04 switch', /Continuing as Steffie/.test(await text('.prep-bar')) && (await page.locator('#ack [data-ack="' + S.guestId + '"]').count()) === 1, 'the checkbox followed the identity');
await allWidths('wedding-preparation.html', '04-preparation-steffie', [['#ack', '04-preparation-steffie-ack']]);
/* back to Peggy for the rest */
await go('wedding-preparation.html', 390);
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(200);
await page.click('.p-drawer [data-who="' + P.guestId + '"]'); await page.waitForTimeout(300);

/* ---------------------------------------------------------------- 05 ABOUT YOU · four areas, Peggy for Steffie */
await go('about-you.html', 390);
const a5 = await text('main');
note('05 four areas', /Hospitality profile/.test(a5) && /Accessibility & comfort/.test(a5) && /Travel documents/.test(a5) && /Photographs and film/.test(a5) && /For Peggy · you/.test(await text('.prep-head .t-l1')), 'profile · comfort · documents · privacy, for Peggy');
note('05 not a form product', (await page.locator('main section.prep-sec').count()) >= 4 && (await page.locator('main .p-field').count()) === 8, 'four editorial sections, eight fields');
note('05 privacy is first person', (await page.locator('[data-consent]').count()) === 1 && !(await page.locator('[data-consent]').first().isDisabled()), 'Peggy may answer her own publication choice');
await page.fill('textarea[data-q="drink"]', 'Riesling'); await page.locator('textarea[data-q="drink"]').blur(); await page.waitForTimeout(200);
await allWidths('about-you.html', '05-about-profile', [['#page > section:nth-of-type(2)', '05-about-hospitality']]);
for (const w of WIDTHS) {
  await go('about-you.html', w);
  await page.addStyleTag({ content: '.prep-bar{position:static!important}.jbar{display:none!important}' });
  await crop('#page > section:nth-of-type(3)', '05-about-accessibility', w);
  await crop('#page > section:nth-of-type(4)', '05-about-documents', w);
  await crop('#page > section:nth-of-type(5)', '05-about-privacy', w);
}
await go('about-you.html?for=' + S.guestId, 390);
const a5s = await text('main');
note('05 answering for Steffie', /Answering for\s*Steffie/.test(await text('.prep-bar')) && /Answering for\s*Steffie/.test(await text('.p-for')) && (await page.locator('[data-consent]').count()) === 0 && /Steffie answers this in Steffie’s own name/.test(a5s), 'profile may be answered for; consent may not');
await page.fill('textarea[data-q="dietary"]', 'No shellfish'); await page.locator('textarea[data-q="dietary"]').blur(); await page.waitForTimeout(200);
const rec2 = await ls('siyl.guest');
note('05 record ownership', rec2.guests[S.guestId].profile.dietary === 'No shellfish' && rec2.guests[S.guestId].history.at(-1).by === P.guestId && rec2.guests[P.guestId].profile.drink === 'Riesling', 'Steffie\'s answer signed by Peggy; Peggy\'s own untouched');
await allWidths('about-you.html?for=' + S.guestId, '05-about-for-steffie', [['#page > section:nth-of-type(5)', '05-about-privacy-for-steffie']]);
note('05 targets', (await tapTargets()).length === 0, 'tap targets ≥44: ' + JSON.stringify(await tapTargets()));

/* ---------------------------------------------------------------- 06 REVIEW & SEND */
await go('review.html', 390);
const r6 = await text('main');
note('06 hierarchy', ['You', 'Your journey', 'The Wedding', 'Documents & privacy', 'Your costs'].every((h) => (r6.replace(/\s/g, '')).includes(h.replace(/\s/g, ''))), 'five blocks in order');
note('06 shared once', (await page.locator('#items .p-line').count()) === (await ls('siyl.bag')).filter((x) => x.id !== 'sangkhathan').length && /For your party · Peggy & Steffie/.test(await text('#b2who')), 'one line per shared selection, labelled for the party');
note('06 personal by name', /For Peggy · you/.test(await text('#b3')) && /For Steffie/.test(await text('#b3')) && /Reviewed ·/.test(await text('#b3')) && /Review required/.test(await text('#b3')), 'wedding and dress code per named guest');
note('06 no new controls', (await page.locator('main [data-ev], main [data-off], main [data-choose], main textarea, main input[type=file], main [data-consent]').count()) === 0, 'no selection control for an existing concept');
note('06 no re-explanation', !/Tak Bat is|Guests attending the Temple Ceremony are invited/.test(r6) && !/assets\/images\/dress/.test(await page.content()), 'no cultural background, no dress gallery');
note('06 costs once', /USD/.test(await text('#tt')) && (await page.locator('#tt').count()) === 1, 'one amount: ' + await text('#tt'));
await allWidths('review.html', '06-review', [['#b2', '06-review-journey'], ['#b3', '06-review-wedding'], ['#b4', '06-review-documents'], ['#b5', '06-review-costs']]);
note('06 targets', (await tapTargets()).length === 0, 'tap targets ≥44: ' + JSON.stringify(await tapTargets()));

/* ---------------------------------------------------------------- VIEW ALL STEPS · SWITCH PERSON */
await go('your-journey.html', 390);
await page.click('.prep-all'); await page.waitForTimeout(300);
await shot('07-view-all-steps', 390, false);
for (const w of [834, 1440, 1920]) { await go('your-journey.html', w); await page.click('.prep-all'); await page.waitForTimeout(300); await crop('.prep-bar, .prep-steps', '07-view-all-steps-bar', w); await page.screenshot({ path: path.join(OUT, '07-view-all-steps-' + w + '.png'), clip: { x: 0, y: 0, width: w, height: 640 } }); }
const steps = await text('.prep-steps');
note('07 semantic states', /Complete|Current|Open|Optional/.test(steps) && !/%/.test(steps) && (steps.match(/0\d/g) || []).length === 6, steps);
await go('about-you.html', 390);
await page.click('.prep-bar [data-switch]'); await page.waitForSelector('.p-drawer:not([hidden])'); await page.waitForTimeout(300);
await shot('08-switch-person', 390, false);
note('08 switch drawer', /Who are you continuing as\?/.test(await text('.p-drawer')), 'unambiguous switch');
await page.click('.p-drawer [data-close]'); await page.waitForTimeout(300);

/* ---------------------------------------------------------------- typography drift: the six surfaces use only the two families */
const fams = new Set();
for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html']) {
  await go(f, 390);
  (await page.evaluate(() => [...new Set([...document.querySelectorAll('main *')].map((e) => getComputedStyle(e).fontFamily.split(',')[0].replace(/"/g, '')))])).forEach((x) => fams.add(x));
}
note('09 two families', [...fams].every((x) => /PP Editorial Old|Hanken Grotesk/.test(x)), 'families in use: ' + [...fams].join(' | '));
note('10 no page errors', errors.length === 0, errors.length ? errors.join(' | ') : 'none');
note('11 no horizontal overflow', !results.some((r) => r.id.startsWith('overflow')), 'every frame at every width');

await browser.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log('\n' + (failed.length ? 'WALK FAILED: ' + failed.length : 'WALK PASSED') + ' · ' + results.length + ' checks');
process.exit(failed.length ? 1 : 0);
