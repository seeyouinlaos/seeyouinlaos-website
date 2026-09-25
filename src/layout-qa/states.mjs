/* THE AUDIT'S GUEST STATES (Owner, 25 Sep 2026 · the site-wide layout QA agent). Brings SYNTHETIC stage guests into the
 * materially different states the auditor renders (src/layout-routes.cjs · STATES), through the site's own client code —
 * exactly what a guest's taps would do. LOCAL STAGE ONLY: every function refuses an origin that is not the local wrangler
 * stage, so production is never written. The synthetic codes and the stage's Guest Relations token come from the
 * environment (LAYOUT_QA_CODES = a JSON file { "T001": code, … }, LAYOUT_QA_GR_TOKEN); nothing secret is in this file. */
import fs from 'fs';

export const isLocal = (origin) => /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
function guard(origin) { if (!isLocal(origin)) throw new Error('layout QA states are local-stage only — refusing ' + origin); }

export function stageSecrets() {
  const file = process.env.LAYOUT_QA_CODES, token = process.env.LAYOUT_QA_GR_TOKEN;
  if (!file || !token) return null;
  return { codes: JSON.parse(fs.readFileSync(file, 'utf8')), token };
}

/* sign a synthetic guest in, in a fresh context of the given browser (the invitation form, as a guest does) */
export async function signIn(browser, origin, code, ctxOpts) {
  guard(origin);
  const ctx = await browser.newContext(ctxOpts);
  const p = await ctx.newPage();
  await p.goto(origin + '/invitation.html?open=1');
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', code);
  await p.evaluate(() => document.querySelector('.siyl-inv .igo').click());
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  const storage = await ctx.storageState();
  await ctx.close();
  return storage;
}

/* THE CLEAN RESET of the stage's guest state (release 013's three-mode reset, snapshot first) */
export async function reset(origin, token) {
  guard(origin);
  const h = { 'content-type': 'application/json', 'x-gr-token': token };
  const s = await (await fetch(origin + '/api/gr/reset', { method: 'POST', headers: h, body: JSON.stringify({ dryRun: true, snapshot: true }) })).json();
  const e = await (await fetch(origin + '/api/gr/reset', { method: 'POST', headers: h, body: JSON.stringify({ dryRun: false, confirm: 'RESET ALL GUEST STATE', digest: s.digest }) })).json();
  if (!e.ok) throw new Error('stage reset failed');
}

/* fictional personal details for the synthetic guests (never a real person) */
const PERSONAL = {
  T001: { firstName: 'Ada', lastName: 'Layout-Test', birthdate: '1984-09-04', nationality: 'German', phone: '+49 170 0000001', email: 'ada.layout@example.org', address1: 'Teststrasse 1', postal: '20259', city: 'Hamburg', country: 'Germany' },
  T002: { firstName: 'Ben', lastName: 'Layout-Test', birthdate: '1979-12-01', nationality: 'Swedish', phone: '+46 70 0000002', email: 'ben.layout@example.org', address1: 'Testgatan 2', postal: '11455', city: 'Stockholm', country: 'Sweden' },
  T003: { firstName: 'Cleo', lastName: 'Layout-Test', birthdate: '1992-02-29', nationality: 'Thai', phone: '+66 81 0000003', email: 'cleo.layout@example.org', address1: '1 Test Road', postal: '10110', city: 'Bangkok', country: 'Thailand' }
};
const settle = (p, ms) => p.waitForTimeout(ms || 1500);
async function page(browser, origin, storage) { const ctx = await browser.newContext({ storageState: storage, viewport: { width: 390, height: 844 } }); const p = await ctx.newPage(); await p.goto(origin + '/your-journey.html'); await settle(p, 2500); return p; }
const personal = (p, id) => p.evaluate(async (P) => {
  for (const [k, v] of Object.entries(P)) SIYL_GUEST.setContact(k, v);
  await SIYL_GUEST.pushContact();
  const me = SIYL_GUEST.me().guestId; if (!SIYL_GUEST.allergy()) SIYL_GUEST.setAllergy('no', '');
  for (const [k, v] of [['coffeetea', 'Tea'], ['flavor', 'Pandan'], ['drink', 'Water'], ['film', 'Amélie']]) { if (!(SIYL_GUEST.rec(me).profile || {})[k]) SIYL_GUEST.setProfile(me, k, v); }
  await SIYL_DRAFT.flush();
}, PERSONAL[id]);
const holdRoom = (p, win) => p.evaluate(async (win) => {
  const R0 = window.SIYL_ROOMS || {}; let slug = null;
  for (const k of Object.keys(R0)) { const st = R0[k]; if ((st.windows || []).some((w) => w.id === win)) { const rs = Array.isArray(st.rooms) ? st.rooms : Object.values(st.rooms || {}); const pick = rs.find((r) => r && r.slug && !r.reserved) || rs[0]; slug = pick && (pick.slug || pick.id); break; } }
  const r = await SIYL_STAY.select(win, slug, null, SIYL_STAY.need(win)); await SIYL_DRAFT.flush(); return r && r.ok !== false;
}, win);
const declineOpen = (p) => p.evaluate(async () => { const J = SIYL_JOURNEY; for (const s of J.relevantSegments()) { if (J.state(s) === 'open' && !J.mandatory(s)) await J.decline(s); } await SIYL_DRAFT.flush(); });

/* THE RECIPES — each returns the signed-in storage state the auditor renders the state with */
export const RECIPES = {
  /* a guest who has just opened the invitation */
  async reset(browser, origin, S) { guard(origin); await reset(origin, S.token); return signIn(browser, origin, S.codes.T001); },
  /* a stay held and the train chosen: a filled Bag, the steps part-done */
  async plan(browser, origin, S) {
    guard(origin);
    const storage = await signIn(browser, origin, S.codes.T001);
    const p = await page(browser, origin, storage); await personal(p, 'T001');
    await p.evaluate(() => SIYL_GUEST.setScope({ bangkok: true, vientianePreWedding: true })); await settle(p);
    await p.goto(origin + '/your-journey.html'); await settle(p, 2500);
    await p.evaluate(() => { const b = document.querySelector('[data-choose-flat="train"]'); b && b.click(); }); await settle(p, 2000);
    await holdRoom(p, 'prewed'); await settle(p);
    const out = await p.context().storageState(); await p.context().close(); return out;
  },
  /* a party member who declines the whole trip (the mixed-attendance case for the partner) */
  async decline(browser, origin, S) {
    guard(origin);
    const storage = await signIn(browser, origin, S.codes.T002);
    const p = await page(browser, origin, storage); await personal(p, 'T002');
    await p.evaluate(() => SIYL_GUEST.setScope({ none: true })); await settle(p);
    await p.goto(origin + '/your-journey.html#scope'); await settle(p, 2000);
    await p.evaluate(() => { const b = document.querySelector('[data-decline-send]'); b && b.click(); });
    await p.waitForFunction(() => SIYL_DRAFT.words().key === 'sent', null, { timeout: 25000 }).catch(() => {});
    const out = await p.context().storageState(); await p.context().close(); return out;
  },
  /* a complete trip sent through Review & Send */
  async send(browser, origin, S) {
    guard(origin);
    const storage = await signIn(browser, origin, S.codes.T003);
    const p = await page(browser, origin, storage); await personal(p, 'T003');
    await p.evaluate(() => SIYL_GUEST.setScope({ bangkok: true, vientianePreWedding: true })); await settle(p);
    await p.goto(origin + '/your-journey.html'); await settle(p, 2500);
    await p.evaluate(() => { const b = document.querySelector('[data-choose-flat="train"]'); b && b.click(); }); await settle(p, 2000);
    await holdRoom(p, 'prewed'); await declineOpen(p); await settle(p);
    await p.goto(origin + '/review.html'); await settle(p, 3000);
    await p.evaluate(() => { const x0 = document.getElementById('send'); const x = (x0 && !x0.hidden ? x0 : null) || [...document.querySelectorAll('button')].find((b) => /^(Send my trip|Send the update|Send my reply)$/.test(b.textContent.trim()) && b.offsetParent !== null); x && x.click(); });
    await p.waitForFunction(() => SIYL_DRAFT.words().key === 'sent', null, { timeout: 25000 }).catch(() => {});
    const sent = await p.evaluate(() => SIYL_DRAFT.words().key);
    const out = await p.context().storageState(); await p.context().close();
    if (sent !== 'sent') throw new Error('the synthetic send did not complete (' + sent + ')');
    return out;
  }
};
