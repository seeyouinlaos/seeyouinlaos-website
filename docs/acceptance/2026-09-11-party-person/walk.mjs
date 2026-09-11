/* ============================================================================
   C · PARTY / PERSON STATE SEPARATION — the rendered acceptance walk.

   Peggy & Steffie (INV-002), the real invitation code, the real pages, at
   390 · 834 · 1440 · 1920. Every frame is a real render; every assertion is
   read back from the page. Nothing here is a unit test: it is the walk 002
   asked for, captured so it can be opened and inspected.

     node docs/acceptance/2026-09-11-party-person/walk.mjs [origin] [outdir]

   Default origin http://127.0.0.1:8787 (python3 -m http.server 8787 at the
   repository root). Frames land beside this file. A results JSON says, per
   state, what was on the screen.
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
if (!TOKEN) { console.error('no guest code: set SIYL_TOKEN or provide src/invitation-tokens.private.csv'); process.exit(2); }   /* INV-002 · Peggy & Steffie */
const WIDTHS = [390, 834, 1440, 1920];
const PEGGY = 'g-peggy', STEFFIE = 'g-steffie';   /* resolved below from the real bundle */

const results = [];
const note = (id, ok, detail) => { results.push({ id, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + detail); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));

async function go(file, width) {
  await page.setViewportSize({ width, height: width < 800 ? 844 : 1000 });
  await page.goto(ORIGIN + '/' + file, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
}
async function shot(name, width, full = true) {
  const f = path.join(OUT, name + '-' + width + '.png');
  await page.screenshot({ path: f, fullPage: full });
  return f;
}
async function text(sel) { return (await page.locator(sel).first().textContent().catch(() => '')) || ''; }
async function bar() { return (await text('.prep-bar')).replace(/\s+/g, ' ').trim(); }
async function overflow() {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}
async function ls(k) { return page.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), k); }
async function guests() { return page.evaluate(() => (JSON.parse(localStorage.getItem('siyl.auth') || 'null') || {}).guests || []); }

/* ---------------------------------------------------------------- 0 · clean */
await go('invitation.html', 390);
await page.evaluate(() => localStorage.clear());
await go('invitation.html', 390);
note('00 boundary', (await bar()).includes('Open your invitation to begin') && !(await bar()).includes('/ 06'),
  'before authentication there is no 01–06: "' + (await bar()) + '"');
await shot('00-boundary', 390);

/* ---------------------------------------------------------------- 1 · AUTH ENTRY */
await page.click('#open');
await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await shot('01-auth-entry', 390, false);
await page.fill('.siyl-inv input', TOKEN);
await page.click('.siyl-inv .igo');
await page.waitForSelector('.p-drawer:not([hidden])', { timeout: 8000 });
await page.waitForTimeout(400);
const G = await guests();
const P = G.find((g) => /peggy/i.test(g.preferredName)), S = G.find((g) => /steffie/i.test(g.preferredName));
note('01 party', !!P && !!S && G.length === 2, 'the code opened the PARTY: ' + G.map((g) => g.preferredName).join(' & '));
note('01 no identity yet', (await ls('siyl.who')) === null, 'activeGuestId is not set by the code');

/* ---------------------------------------------------------------- 2 · WHO ARE YOU */
const drawer = (await text('.p-drawer')).replace(/\s+/g, ' ');
note('02 who are you', /Who are you\?/.test(drawer) && /belongs to Peggy & Steffie/.test(drawer), 'the question after the code: ' + drawer.slice(0, 120));
await shot('02-who-are-you', 390, false);
await page.click('.p-drawer [data-who="' + P.guestId + '"]');
await page.waitForTimeout(500);
const who1 = await ls('siyl.who');
note('02 active = Peggy', who1 && who1.guestId === P.guestId && who1.partyId === 'INV-002', 'siyl.who = ' + JSON.stringify(who1));
note('02 bar', /Continuing as Peggy/.test(await bar()) && /Peggy & Steffie/.test(await bar()), 'bar: ' + await bar());
for (const w of WIDTHS) { await go('invitation.html', w); await shot('03-invitation-peggy', w); }
note('03 invitation says who continues', /You are continuing as Peggy/.test(await text('main')) && /You are making decisions for/.test(await text('main')), 'step 01 ownership block present');

/* ---------------------------------------------------------------- 3 · PARTY STATE · step 02 */
await go('your-journey.html', 390);
note('04 journey label', /For your party · Peggy & Steffie/.test(await text('.prep-head [data-party-label]')), 'label: ' + (await text('.prep-head [data-party-label]')).trim());
/* Peggy picks Shama for the party — the real selection control */
await page.locator('#bkksel [data-choose="shama-king-studio-balcony"]').click();
await page.waitForTimeout(400);
note('04 Peggy chose Shama', /Selected/.test(await text('#bkksel .p-chosen')) && /Shama/.test(await text('#bkksel .p-chosen')), 'chosen card: ' + (await text('#bkksel .p-chosen .t-h1')).trim());
const bagP = await ls('siyl.bag');
for (const w of WIDTHS) { await go('your-journey.html', w); await shot('04-journey-party-peggy', w); }
note('04 party state written', Array.isArray(bagP), 'bag lines as Peggy: ' + (bagP || []).map((x) => x.id).join(', '));

/* ---------------------------------------------------------------- 4 · PERSONAL STATE · step 05 as Peggy */
await go('about-you.html', 390);
note('05 subject defaults to active', /For Peggy · you/.test(await text('.prep-head')) && !/Answering for/.test(await bar()),
  'about you opens answering for Peggy herself');
await page.fill('textarea[data-q="drink"]', 'Riesling');
await page.locator('textarea[data-q="drink"]').blur();
await page.waitForTimeout(250);
await shot('05-about-peggy-self', 390);

/* ---------------------------------------------------------------- 5 · ANSWERING FOR Steffie */
await page.click('.p-sel[data-who="' + S.guestId + '"]');
await page.waitForTimeout(400);
const barFor = await bar();
note('06 ANSWERING FOR in the shell', /Answering for/.test(barFor) && /Steffie/.test(barFor) && /Continuing as Peggy/.test(barFor), 'bar: ' + barFor);
note('06 ANSWERING FOR on the page', /Answering for/.test(await text('.p-for')) && /continuing as Peggy/.test(await text('.p-for')), 'page band: ' + (await text('.p-for')).replace(/\s+/g, ' ').trim().slice(0, 140));
await page.fill('textarea[data-q="dietary"]', 'No shellfish');
await page.locator('textarea[data-q="dietary"]').blur();
await page.waitForTimeout(250);
for (const w of WIDTHS) {
  await go('about-you.html?for=' + S.guestId, w);
  await shot('06-about-answering-for-steffie', w);
}
const rec = await ls('siyl.guest');
const stR = rec.guests[S.guestId], pgR = rec.guests[P.guestId];
note('06 record ownership', stR.profile.dietary === 'No shellfish' && !pgR.profile.dietary && pgR.profile.drink === 'Riesling',
  'Steffie.dietary=' + stR.profile.dietary + ' · Peggy.dietary=' + (pgR.profile.dietary || '—') + ' · Peggy.drink=' + pgR.profile.drink);
note('06 signed', stR.history.every((h) => h.by === P.guestId), 'Steffie history by: ' + stR.history.map((h) => h.by).join(','));
note('06 subject not persisted', (await ls('siyl.who')).subjectGuestId === undefined, 'siyl.who carries no subject');
/* a fresh page without the deep link answers for Peggy again */
await go('about-you.html', 390);
note('06 fresh page = yourself', /For Peggy · you/.test(await text('.prep-head')) && !/Answering for/.test(await bar()), 'no silent carry-over of the subject');

/* ---------------------------------------------------------------- 6 · step 03 as Peggy */
await go('wedding.html', 390);
await page.click('[data-g="' + P.guestId + '"][data-e="temple"] [data-ev="yes"]');
await page.waitForTimeout(250);
const secS = await text('[data-g="' + S.guestId + '"][data-e="temple"]'), band = await text('.p-for');
note('07 wedding ownership', /For Peggy · you/.test(await text('[data-g="' + P.guestId + '"][data-e="temple"]')) && /For Steffie · answering for Steffie/.test(secS) && /Answering for/.test(band) && /continuing as Peggy/.test(band),
  'FOR PEGGY · you / FOR STEFFIE · answering for, band at the boundary');
for (const w of WIDTHS) { await go('wedding.html', w); await shot('07-wedding-peggy', w); }

/* ---------------------------------------------------------------- 7 · step 04 · dress is personal */
await go('wedding-preparation.html', 390);
const cards = await page.locator('#ack .p-card').count();
note('08 two acknowledgements', cards === 2, cards + ' acknowledgement cards, one per named guest');
await page.check('#ack [data-ack="' + P.guestId + '"]');
await page.waitForTimeout(300);
const rec2 = await ls('siyl.guest');
note('08 Peggy ticks for Peggy only', !!rec2.guests[P.guestId].dress && rec2.guests[P.guestId].dress.by === P.guestId && !(rec2.guests[S.guestId] || {}).dress,
  'Peggy.dress.by=' + rec2.guests[P.guestId].dress.by + ' · Steffie.dress=' + JSON.stringify((rec2.guests[S.guestId] || {}).dress || null));
const cardS = await text('#ack [data-g="' + S.guestId + '"]');
note('08 Steffie card is hers', /cannot be ticked for Steffie/.test(cardS) && /Switch to Steffie/.test(cardS) && (await page.locator('#ack [data-g="' + S.guestId + '"] input').count()) === 0,
  'no checkbox for Steffie while Peggy continues; switch offered');
for (const w of WIDTHS) { await go('wedding-preparation.html', w); await shot('08-preparation-peggy', w); await page.locator('#ack').screenshot({ path: path.join(OUT, '08-preparation-peggy-ack-' + w + '.png') }); }

/* ---------------------------------------------------------------- 8 · REVIEW as Peggy */
await go('review.html', 390);
const b3 = await text('#b3');
note('09 review dress by name', /For Peggy · you/.test(b3) && /For Steffie/.test(b3) && /Review required/.test(b3) && !/for your whole party/.test(b3), 'block 03 names each acknowledgement');
note('09 review party label', /For your party · Peggy & Steffie/.test(await text('#b2who')) && /For your party · Peggy & Steffie/.test(await text('#b5who')), 'blocks 02 and 05 say FOR YOUR PARTY · PEGGY & STEFFIE');
note('09 review you block', /continuing as Peggy/.test(await text('#b1')) && /Answer for Steffie/.test(await text('#b1')), 'block 01 says who continues and offers answering for');
for (const w of WIDTHS) { await go('review.html', w); await shot('09-review-peggy', w);
  await page.locator('#b1').screenshot({ path: path.join(OUT, '09-review-peggy-you-' + w + '.png') });
  await page.locator('#b3').screenshot({ path: path.join(OUT, '09-review-peggy-wedding-' + w + '.png') }); }

/* ---------------------------------------------------------------- 9 · SWITCH IDENTITY → Steffie */
await go('wedding-preparation.html', 390);
await page.click('.prep-bar [data-switch]');
await page.waitForSelector('.p-drawer:not([hidden])');
await page.waitForTimeout(300);
const sw = (await text('.p-drawer')).replace(/\s+/g, ' ');
note('10 switch drawer', /Who are you continuing as\?/.test(sw) && /changes nobody/.test(sw), 'switch copy: ' + sw.slice(0, 160));
await shot('10-switch-drawer', 390, false);
await page.click('.p-drawer [data-who="' + S.guestId + '"]');
await page.waitForTimeout(500);
note('10 active = Steffie', (await ls('siyl.who')).guestId === S.guestId && /Continuing as Steffie/.test(await bar()), 'bar: ' + await bar());
const rec3 = await ls('siyl.guest');
note('10 Peggy untouched by the switch', rec3.guests[P.guestId].profile.drink === 'Riesling' && rec3.guests[P.guestId].dress && rec3.guests[P.guestId].dress.by === P.guestId,
  'Peggy.drink=Riesling · Peggy.dress.by=' + rec3.guests[P.guestId].dress.by);
/* Steffie acknowledges in her own name */
note('10 Steffie now has her checkbox', (await page.locator('#ack [data-ack="' + S.guestId + '"]').count()) === 1 && (await page.locator('#ack [data-ack="' + P.guestId + '"]').count()) === 0, 'the checkbox followed the identity');
await page.check('#ack [data-ack="' + S.guestId + '"]');
await page.waitForTimeout(300);
const rec4 = await ls('siyl.guest');
note('10 both acknowledged, each by themselves', rec4.guests[S.guestId].dress.by === S.guestId && rec4.guests[P.guestId].dress.by === P.guestId, 'dress.by: Peggy=' + rec4.guests[P.guestId].dress.by + ' Steffie=' + rec4.guests[S.guestId].dress.by);
for (const w of WIDTHS) { await go('wedding-preparation.html', w); await shot('10-preparation-steffie', w); await page.locator('#ack').screenshot({ path: path.join(OUT, '10-preparation-steffie-ack-' + w + '.png') }); }

/* Steffie sees Peggy's party choice, and her own personal record */
await go('your-journey.html', 390);
const bagS = await ls('siyl.bag');
note('11 party state shared', JSON.stringify(bagS) === JSON.stringify(bagP), 'Steffie sees the same journey Peggy chose');
await go('about-you.html', 390);
note('11 Steffie answers for herself', /For Steffie · you/.test(await text('.prep-head')) && (await page.inputValue('textarea[data-q="dietary"]')) === 'No shellfish' && (await page.inputValue('textarea[data-q="drink"]')) === '',
  'her dietary answer (written for her by Peggy) is there; Peggy\'s drink is not');
for (const w of WIDTHS) { await go('about-you.html', w); await shot('11-about-steffie-self', w); }
await go('wedding.html', 390);
const secP = await text('[data-g="' + P.guestId + '"][data-e="temple"]'), band2 = await text('.p-for');
note('11 wedding flips', /For Steffie · you/.test(await text('[data-g="' + S.guestId + '"][data-e="temple"]')) && /For Peggy · answering for Peggy/.test(secP) && /continuing as Steffie/.test(band2), 'FOR STEFFIE · you / FOR PEGGY · answering for');
for (const w of WIDTHS) { await go('wedding.html', w); await shot('11-wedding-steffie', w); }
for (const w of WIDTHS) { await go('review.html', w); await shot('11-review-steffie', w);
  await page.locator('#b3').screenshot({ path: path.join(OUT, '11-review-steffie-wedding-' + w + '.png') }); }
const b3s = await text('#b3');
note('11 review both reviewed', (b3s.match(/Reviewed ·/g) || []).length >= 2 && !/Review required/.test(b3s), 'block 03: both acknowledgements reviewed');

/* ---------------------------------------------------------------- 10 · VIEW ALL STEPS */
await go('about-you.html', 390);
await page.click('.prep-all');
await page.waitForTimeout(300);
await shot('12-all-steps', 390, false);
const steps = (await text('.prep-steps')).replace(/\s+/g, ' ');
note('12 semantic states', /Complete|Current|Open|Optional/.test(steps) && !/%/.test(steps), 'view all steps: ' + steps.slice(0, 200));

/* ---------------------------------------------------------------- 11 · STALE-SESSION RECOVERY */
await page.evaluate(() => localStorage.setItem('siyl.who', JSON.stringify({ partyId: 'INV-999', guestId: 'somebody', at: 'x' })));
await go('about-you.html', 390);
await page.waitForTimeout(500);
const d2 = (await text('.p-drawer')).replace(/\s+/g, ' ');
note('13 identity from another invitation is dropped', /Who are you\?/.test(d2) && !/Continuing as/.test(await bar()), 'WHO ARE YOU asked again: ' + d2.slice(0, 80));
await shot('13-recovery-who', 390, false);
await page.click('.p-drawer [data-who="' + P.guestId + '"]');
await page.waitForTimeout(300);
const rec5 = await ls('siyl.guest');
note('13 nothing lost', rec5.guests[P.guestId].profile.drink === 'Riesling' && rec5.guests[S.guestId].dress.by === S.guestId && JSON.stringify(await ls('siyl.bag')) === JSON.stringify(bagP), 'records and journey intact after recovery');
/* a session from before the names existed */
await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); delete a.guests; localStorage.setItem('siyl.auth', JSON.stringify(a)); });
await go('about-you.html', 390);
note('13 stale session gate', /Open your invitation once more/.test(await text('#page')) && /Open your invitation to begin/.test(await bar()), 'no names → gate, no identity, no personal surface');
await shot('13-recovery-stale', 390);
/* the code once more brings everything back */
await page.click('#open');
await page.waitForSelector('.siyl-inv input', { state: 'visible' });
await page.fill('.siyl-inv input', TOKEN);
await page.click('.siyl-inv .igo');
await page.waitForTimeout(800);
note('13 recovered', ((await guests()).length === 2) && (await ls('siyl.guest')).guests[P.guestId].profile.drink === 'Riesling', 'names back, records back');

/* ---------------------------------------------------------------- overflow at every width */
for (const f of ['about-you.html?for=' + S.guestId, 'wedding.html', 'wedding-preparation.html', 'review.html']) {
  for (const w of WIDTHS) { await go(f, w); if (await overflow()) note('overflow ' + f + '@' + w, false, 'horizontal overflow'); }
}
note('14 no horizontal overflow', !results.some((r) => r.id.startsWith('overflow')), 'four surfaces × four widths');

await browser.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results }, null, 2));
const failed = results.filter((r) => !r.ok);
console.log('\n' + (failed.length ? 'WALK FAILED: ' + failed.length : 'WALK PASSED') + ' · ' + results.length + ' checks');
process.exit(failed.length ? 1 : 0);
