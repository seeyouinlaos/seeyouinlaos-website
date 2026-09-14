/* OWNER CORRECTIONS FROM GUEST TESTING · 13 Sep 2026 — the browser walk.
   Local origin with the real encrypted bundle (INV-002 and INV-001 codes from
   the private register; never printed). The Worker's status and seating
   routes are mocked (seating OPEN on the accepted geometry with the couple's
   ceremony positions); nothing is written to production.
     node docs/acceptance/2026-09-13-owner-decisions/guest-testing-walk.mjs <origin> [out.json] */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import { validateGeometry } from '../../../src/seating.js';
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const OUT = process.argv[3] || null;
const WORKER = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const csv = fs.readFileSync(new URL('../../../src/invitation-tokens.private.csv', import.meta.url), 'utf8');
const tok = (id) => csv.split(/\r?\n/).find((l) => l.startsWith(id + ',')).match(/[a-z0-9]{16}/)[0];
const T2 = tok('INV-002'), T1 = tok('INV-001');
const geometry = JSON.parse(fs.readFileSync(new URL('./seating-geometry.json', import.meta.url), 'utf8'));
const cfg = validateGeometry(geometry).config;
const R = []; const note = (id, ok, d) => { R.push({ id, ok, d }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + d); };
const b = await chromium.launch();

/* the mocked ledger, shared by every page of the run */
const holds = {};
const view = (inv) => {
  const mine = { ceremony: {}, dinner: {} };
  const dress = (s, ev) => { const h = holds[ev + ':' + s.seatId]; const row = { seatId: s.seatId, family: false, state: h ? (h.inv === inv ? 'yours' : 'taken') : 'available' }; if (row.state === 'yours') { row.guestId = h.guestId; mine[ev][h.guestId] = s.seatId; } return row; };
  return { ok: true, open: true, frozen: false, configured: { ceremony: true, dinner: true }, capacity: { ceremony: { guestSeats: 50, left: 20, right: 30, fixed: 2 }, dinner: { guestSeats: 50, top: 25, bottom: 25, totalPeople: 50 } }, mine,
    ceremony: { rows: cfg.ceremony.rows.map((r) => ({ side: r.side, row: r.row, seats: r.seats.map((s) => dress(s, 'ceremony')) })), fixed: ['BRIDE', 'GROOM'] },
    dinner: { sides: { T: cfg.dinner.sides.T.map((s) => dress(s, 'dinner')), B: cfg.dinner.sides.B.map((s) => dress(s, 'dinner')) }, totalPeople: 50 } };
};
async function wire(page) {
  await page.route(WORKER + '/api/**', async (route) => {
    const url = new URL(route.request().url()), json = (status, body) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(body) });
    if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
    if (url.pathname === '/api/status') return json(200, { ok: true, received: false, confirmed: false });
    if (url.pathname === '/api/inventory' || url.pathname.startsWith('/api/inventory')) return json(200, { ok: true, windows: {} });
    if (url.pathname.startsWith('/api/seating')) {
      const inv = url.searchParams.get('invitation') || '';
      if (url.pathname.endsWith('/select')) { const q = JSON.parse(route.request().postData() || '{}'); const k = q.event + ':' + q.seatId; const cur = holds[k]; if (cur && !(cur.inv === q.invitationId && cur.guestId === q.guestId)) return json(409, { ok: false, error: 'taken', ...view(q.invitationId) }); for (const kk of Object.keys(holds)) if (kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId) delete holds[kk]; holds[k] = { inv: q.invitationId, guestId: q.guestId }; return json(200, { ok: true, ...view(q.invitationId) }); }
      if (url.pathname.endsWith('/release')) { const q = JSON.parse(route.request().postData() || '{}'); for (const kk of Object.keys(holds)) if (kk.startsWith(q.event + ':') && holds[kk].inv === q.invitationId && holds[kk].guestId === q.guestId) delete holds[kk]; return json(200, { ok: true, ...view(q.invitationId) }); }
      return json(200, view(inv));
    }
    return json(404, { ok: false });
  });
}
const signIn = async (p, token, who) => {
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' });
  await p.click('#open'); await p.fill('.siyl-inv input', token); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])', { timeout: 10000 }); await p.waitForTimeout(300);
  const g = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
  const me = g.guests.find((x) => new RegExp(who, 'i').test(x.preferredName)); await p.click('.p-drawer [data-who="' + me.guestId + '"]'); await p.waitForTimeout(400); return g;
};
const tap = async (p, sel) => { const bb = await p.locator(sel).first().boundingBox(); await p.mouse.click(bb.x + Math.min(120, bb.width / 2), bb.y + bb.height / 2); };
const txt = async (p, sel) => ((await p.locator(sel).first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();

/* ================================================================ 1 · JOURNEY SELECTION TRUTH (390) */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await wire(p);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Access to fetch|ERR_FAILED|Failed to load resource/.test(m.text())) errs.push(m.text().slice(0, 120)); });
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear());
  const G = await signIn(p, T2, 'Peggy'); const P = G.guests.find((x) => /peggy/i.test(x.preferredName)), S = G.guests.find((x) => /steffie/i.test(x.preferredName));
  await p.goto(ORIGIN + '/your-journey.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  /* the guest chooses U Sathorn by hand */
  await p.locator('#bkksel [data-choose="u-sathorn-superior-garden"]').click(); await p.waitForTimeout(500);
  const bag = async () => JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.bag') || '[]'));
  let card = await p.evaluate(() => { const c = document.querySelector('#bkksel .p-chosen'); return c ? { slug: c.dataset.slug, label: c.querySelector('.t-l1').textContent.trim(), control: (c.querySelector('.is-current') || {}).textContent, selectBtn: !!c.querySelector('button[data-choose]'), framed: getComputedStyle(c).boxShadow !== 'none' } : null; });
  note('1 U Sathorn chosen → the card says so, from the bag', card && card.slug === 'u-sathorn-superior-garden' && (await bag()).some((x) => x.room === 'u-sathorn-superior-garden') && /Selected for your journey/i.test(card.label) && /Current selection/.test(card.control) && !card.selectBtn && card.framed, JSON.stringify(card));
  const alt = await p.evaluate(() => [...document.querySelectorAll('#bkksel .p-stay:not(.p-chosen)')].map((c) => ({ slug: c.dataset.slug, btn: (c.querySelector('button[data-choose]') || {}).textContent, current: !!c.querySelector('.is-current') })));
  note('1 alternatives keep their action', alt.length === 2 && alt.every((a) => /Select this stay/.test(a.btn) && !a.current), JSON.stringify(alt));
  /* FULL EXPERIENCE must not touch it */
  await p.locator('#fxb').click(); await p.waitForSelector('#fxg'); await p.waitForTimeout(300);
  const fxCopy = await txt(p, '#fxp');
  await p.locator('#fxg').click(); await p.waitForTimeout(900);
  const after = await bag();
  note('1 Full Experience keeps the manual U Sathorn', after.some((x) => x.room === 'u-sathorn-superior-garden') && !after.some((x) => x.room === 'penthouse') && after.filter((x) => x.by === 'full').length >= 8 && /stays exactly as you chose it/.test(fxCopy), 'bag: ' + after.map((x) => x.id + (x.room ? ':' + x.room : '')).join(' '));
  const chosenNow = await p.evaluate(() => (document.querySelector('#bkksel .p-chosen') || {}).dataset?.slug);
  note('1 card still U Sathorn after Full Experience', chosenNow === 'u-sathorn-superior-garden', chosenNow);
  /* Special Express: same rule; reload keeps it; remove updates card and total */
  const train = await p.evaluate(() => { const c = document.querySelector('#s-train .p-sum'); return c ? { on: c.classList.contains('on'), control: (c.querySelector('.is-current') || {}).textContent, selectBtn: !!c.querySelector('button[data-choose-flat]'), remove: !!c.querySelector('[data-rm="train"]') } : null; });
  note('1 Special Express No. 25: current state from the bag, inert control, remove offered', train && train.on && /Current selection/.test(train.control) && !train.selectBtn && train.remove, JSON.stringify(train));
  const totalBefore = await txt(p, '.p-journey-bar, #jbar, .jbar');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const afterReload = await p.evaluate(() => ({ bkk: (document.querySelector('#bkksel .p-chosen') || {}).dataset?.slug, train: !!document.querySelector('#s-train .p-sum.on .is-current') }));
  note('1 reload keeps the selections', afterReload.bkk === 'u-sathorn-superior-garden' && afterReload.train, JSON.stringify(afterReload));
  await p.locator('#s-train [data-rm="train"]').click(); await p.waitForTimeout(500);
  const removed = await p.evaluate(() => ({ inBag: JSON.parse(localStorage.getItem('siyl.bag') || '[]').some((x) => x.id === 'train'), card: !!document.querySelector('#s-train .p-sum.on'), select: !!document.querySelector('#s-train button[data-choose-flat="train"]') }));
  note('1 remove updates bag, card and action', !removed.inBag && !removed.card && removed.select, JSON.stringify(removed));
  /* switching Peggy → Steffie inherits nothing personal, keeps the party journey */
  await tap(p, '.prep-bar [data-switch]'); await p.waitForSelector('.p-drawer:not([hidden])'); await p.click('.p-drawer [data-who="' + S.guestId + '"]'); await p.waitForTimeout(500);
  note('1 switch keeps the party journey', (await bag()).some((x) => x.room === 'u-sathorn-superior-garden') && /Continuing as Steffie/i.test(await txt(p, '.prep-bar')), 'party-level choice unchanged for Steffie');
  note('1 errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  await ctx.close();
}

/* ================================================================ 2 · RAIL GEOMETRY at every width */
for (const W of [320, 375, 390, 430, 1280]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 900 }, isMobile: W < 800, hasTouch: W < 800 }); const p = await ctx.newPage(); await wire(p);
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear());
  await signIn(p, T2, 'Peggy');
  await p.goto(ORIGIN + '/your-journey.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  await p.locator('#bkksel [data-choose="penthouse"]').click().catch(() => {}); await p.waitForTimeout(400);
  const m = await p.evaluate(() => [...document.querySelectorAll('#bkksel .p-stay')].map((c) => { const img = c.querySelector('.p-stay-img'), r = img.getBoundingClientRect(), t = c.querySelector('.t-l1').getBoundingClientRect(); const bg = getComputedStyle(img).backgroundSize; return { slug: c.dataset.slug, imgTop: Math.round(r.top), imgH: Math.round(r.height), imgW: Math.round(r.width), labelTop: Math.round(t.top), cardH: Math.round(c.getBoundingClientRect().height), cover: bg === 'cover', chosen: c.classList.contains('p-chosen') }; }));
  const tops = new Set(m.map((x) => x.imgTop)), labels = new Set(m.map((x) => x.labelTop)), heights = new Set(m.map((x) => x.cardH));
  note('2 rail@' + W + ' media and text start on one line, cover never stretches', tops.size === 1 && labels.size === 1 && heights.size === 1 && m.every((x) => x.cover) && m.filter((x) => x.chosen).length === 1, 'imgTop ' + [...tops].join('/') + ' · labelTop ' + [...labels].join('/') + ' · cardH ' + [...heights].join('/') + ' · ' + m.length + ' cards');
  const clip = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  note('2 no horizontal clipping@' + W, !clip, 'page width stays inside the viewport');
  await ctx.close();
}

/* ================================================================ 3 · SEATS: route, booking, hosts (390 + 1280) */
for (const W of [390, 1280]) {
  const ctx = await b.newContext({ viewport: { width: W, height: W < 800 ? 844 : 900 }, isMobile: W < 800, hasTouch: W < 800 }); const p = await ctx.newPage(); await wire(p);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  for (const k of Object.keys(holds)) delete holds[k];
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear());
  const G = await signIn(p, T2, 'Peggy'); const P = G.guests.find((x) => /peggy/i.test(x.preferredName)), S = G.guests.find((x) => /steffie/i.test(x.preferredName));
  await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const route = await p.evaluate(() => [...document.querySelectorAll('#seats-route [data-seat-cta]')].map((a) => a.getAttribute('data-seat-cta') + ':' + a.dataset.state + ':' + a.textContent.trim() + ':' + a.getAttribute('href')));
  note('3 wedding@' + W + ' names the route to both seats, per guest', route.length === 4 && route.filter((r) => /^ceremony:open:Choose your ceremony seat:wedding-preparation\.html\?for=G\d+#seats$/.test(r)).length === 2 && route.filter((r) => /^dinner:open:Choose your dinner seat:/.test(r)).length === 2, route.join(' | '));
  /* Peggy takes the ceremony route */
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), p.locator('#seats-route [data-seat-cta="ceremony"]').first().click()]); await p.waitForTimeout(900);
  const landed = await p.evaluate(() => { const s = document.getElementById('seats'); const r = s.getBoundingClientRect(); const bar = document.querySelector('.prep-bar').getBoundingClientRect(); return { file: location.pathname.split('/').pop(), below: r.top >= bar.bottom - 1 && r.top < bar.bottom + 140, who: [...document.querySelectorAll('[data-seat-who]')].find((b) => b.getAttribute('aria-pressed') === 'true')?.getAttribute('data-seat-who'), cards: [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.seatmap + ':' + c.dataset.state + ':' + c.querySelector('h3').textContent.trim()), bride: document.querySelectorAll('[data-ev="ceremony"] g.fixed').length, dinnerFixed: document.querySelectorAll('[data-ev="dinner"] g.fixed').length }; });
  note('3 route@' + W + ' lands on the seats, for Peggy, both maps titled to the task, couple at the front', /wedding-preparation/.test(landed.file) && landed.below && landed.who === P.guestId && landed.cards.join('|') === 'ceremony:open:Choose your ceremony seat|dinner:open:Choose your dinner seat' && landed.bride === 1 && landed.dinnerFixed === 0, JSON.stringify(landed));
  const bride = await p.evaluate(() => { const g = document.querySelector('[data-ev="ceremony"] g.fixed'); return { label: g.getAttribute('aria-label'), selectable: !!g.getAttribute('data-seat') || g.getAttribute('role') === 'button', chairs: document.querySelectorAll('[data-ev="ceremony"] g.seat').length }; });
  note('3 ceremony@' + W + ' BRIDE and GROOM: front centre, never selectable, not counted', bride.label === 'BRIDE and GROOM, fixed positions at the front centre' && !bride.selectable && bride.chairs === 50, JSON.stringify(bride));
  /* 002 (14 Sep): the booking is two steps — tap a chair (nothing held), read the summary, CONFIRM; then the confirmation, CONTINUE */
  const book = async (ev, seatId) => { await p.locator('[data-ev="' + ev + '"] g[data-seat="' + seatId + '"]').click(); await p.waitForTimeout(400); const pend = !holds[ev + ':' + seatId]; await p.locator('.p-seatbar.on [data-seat-confirm="' + ev + '"]').click(); await p.waitForTimeout(700); const conf = await txt(p, '[data-seatmap="' + ev + '"][data-state="confirmed"]'); await p.locator('[data-seat-continue="' + ev + '"]').click(); await p.waitForTimeout(500); return { pend, conf }; };
  const b1 = await book('ceremony', 'C-L-02-01'), b2 = await book('dinner', 'D-T-03');
  note('3 two-step@' + W + ' nothing held on the tap, held on CONFIRM, the confirmation says guest · event · seat A2 / A3 · reference', b1.pend && b2.pend && /SEAT CONFIRMED/i.test(b1.conf) && /Peggy Berger/.test(b1.conf) && /Temple Ceremony/.test(b1.conf) && /\bA2\b/.test(b1.conf) && /SYL-TC-A2-/.test(b1.conf) && /Wedding Dinner/.test(b2.conf) && /\bA3\b/.test(b2.conf) && /Download seat confirmation/i.test(b1.conf), (b1.conf + ' || ' + b2.conf).slice(0, 300));
  const booked = await p.evaluate(() => [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.seatmap + ':' + c.dataset.state + ':' + c.querySelector('h3').textContent.trim() + ':' + (c.querySelector('.t-l1').textContent.replace(/\s+/g, ' ').trim().slice(0, 40)) + ':' + (c.querySelector('.p-seatlabel')?.dataset.seatLabel || '')));
  note('3 booked@' + W + ' state: seat confirmed · A2 / A3 by label · Change seat offered', /^ceremony:booked:Your ceremony seat:Seat confirmed:A2$/.test(booked[0]) && /^dinner:booked:Your dinner seat:Seat confirmed:A3$/.test(booked[1]) && (await p.locator('[data-seat-change="ceremony"]').count()) === 1 && !/C-L-02-01|D-T-03/.test(await txt(p, '#seatbox')), booked.join(' | '));
  /* change seat: CHANGE SEAT → tap another chair → CONFIRM CHANGE; the old one stays until the new hold succeeds */
  await p.locator('[data-seat-change="ceremony"]').click(); await p.waitForTimeout(400);
  await p.locator('[data-ev="ceremony"] g[data-seat="C-R-05-02"]').click(); await p.waitForTimeout(400);
  const chg = await txt(p, '.p-seatbar.on');
  const stillOld = holds['ceremony:C-L-02-01'] && holds['ceremony:C-L-02-01'].guestId === P.guestId && !holds['ceremony:C-R-05-02'];
  await p.locator('.p-seatbar.on [data-seat-confirm="ceremony"]').click(); await p.waitForTimeout(700); await p.locator('[data-seat-continue="ceremony"]').click(); await p.waitForTimeout(400);
  note('3 change seat@' + W + ' A2 → E5: summary names current and new, old authoritative until confirmed, then atomic', /Current seat A2 · New seat E5/.test(chg) && stillOld && holds['ceremony:C-R-05-02'] && holds['ceremony:C-R-05-02'].guestId === P.guestId && !holds['ceremony:C-L-02-01'], chg.slice(0, 160));
  /* Steffie books her own; cannot take Peggy's */
  await p.locator('[data-seat-who="' + S.guestId + '"]').first().click(); await p.waitForTimeout(400);
  const peggyChair = await p.evaluate(() => { const g = document.querySelector('[data-ev="dinner"] g[data-label="A3"]'); return g ? g.getAttribute('aria-disabled') === 'true' && !g.getAttribute('data-seat') && /Dinner seat A3, Peggy.s seat/.test(g.getAttribute('aria-label')) : null; });
  await book('dinner', 'D-T-04');
  note('3 two guests@' + W + ' independent seats, duplicate refused', peggyChair === true && holds['dinner:D-T-04'] && holds['dinner:D-T-04'].guestId === S.guestId && holds['dinner:D-T-03'].guestId === P.guestId, 'Peggy A3 · Steffie A4');
  await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const route2 = await p.evaluate(() => [...document.querySelectorAll('#seats-route [data-seat-cta]')].map((a) => a.getAttribute('data-seat-cta') + ':' + a.dataset.state + ':' + a.textContent.trim()));
  note('3 wedding@' + W + ' shows booked seats by label with Change seat and the download', route2.filter((r) => /:booked:Change seat$/.test(r)).length === 3 && route2.filter((r) => /^ceremony:open:Choose your ceremony seat$/.test(r)).length === 1 && /Seat E5/i.test(await txt(p, '#seats-route')) && !/C-R-05-02|D-T-0/.test(await txt(p, '#seats-route')) && (await p.locator('#seats-route [data-seat-pass]').count()) >= 3, route2.join(' | '));
  const rev = await p.goto(ORIGIN + '/review.html', { waitUntil: 'networkidle' }).then(() => p.waitForTimeout(900)).then(() => txt(p, 'main'));
  note('3 review@' + W + ' seats by the ledger, per guest, by label with the reference', /Seat E5/i.test(rev) && /Seat A3/i.test(rev) && /Seat A4/i.test(rev) && /SYL-TC-E5-/.test(rev) && !/C-R-05-02|D-T-03|D-T-04/.test(rev) && /Choose your ceremony seat/i.test(rev), 'Peggy 2 seats · Steffie dinner + open ceremony link · ' + (rev.match(/Ceremony seat[^]{0,120}/gi) || []).join(' || ').slice(0, 260));
  note('3 errors@' + W, errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  await ctx.close();
}

/* ================================================================ 4 · AUTH: sign out · another invitation · second party · the hosts (390) */
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage(); await wire(p);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  for (const k of Object.keys(holds)) delete holds[k];
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => localStorage.clear());
  await signIn(p, T2, 'Peggy');
  await p.goto(ORIGIN + '/your-journey.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  await p.locator('#bkksel [data-choose="u-sathorn-superior-garden"]').click(); await p.waitForTimeout(400);
  /* the actions live in the step index, on every step */
  await tap(p, '.prep-bar .prep-all'); await p.waitForTimeout(400);
  const leave = await p.evaluate(() => [...document.querySelectorAll('.prep-steps [data-leave]')].map((b) => b.getAttribute('data-leave') + ':' + b.textContent.trim()));
  note('4 both actions in the step index', leave.join('|') === 'another:Open another invitation|out:Sign out', leave.join(' | '));
  /* SIGN OUT: session gone, draft kept aside, Back shows nothing */
  await Promise.all([p.waitForNavigation({ waitUntil: 'networkidle' }), tap(p, '.prep-steps [data-leave="out"]')]); await p.waitForTimeout(600);
  const out = await p.evaluate(() => ({ file: location.pathname.split('/').pop(), auth: localStorage.getItem('siyl.auth'), bag: localStorage.getItem('siyl.bag'), aside: !!localStorage.getItem('siyl.party.INV-002'), gate: /Open your invitation/.test(document.body.innerText), party: /Peggy/.test(document.body.innerText) }));
  note('4 sign out → clean code screen, session cleared, draft set aside', /invitation/.test(out.file) && !out.auth && !out.bag && out.aside && out.gate && !out.party, JSON.stringify(out));
  await p.goBack({ waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(900);
  const back = await p.evaluate(() => ({ file: location.pathname.split('/').pop(), party: /Peggy|Steffie|U Sathorn/.test(document.querySelector('main')?.innerText || ''), bar: (document.querySelector('.prep-bar')?.innerText || '').replace(/\s+/g, ' ') }));
  note('4 back after sign out reveals no party', !back.party && /Open your invitation to begin/i.test(back.bar), JSON.stringify(back));
  /* OPEN ANOTHER INVITATION: the hosts' party signs in; nothing of INV-002 leaks */
  await p.goto(ORIGIN + '/invitation.html?open=1', { waitUntil: 'networkidle' }); await p.waitForTimeout(700);
  note('4 ?open=1 presents the code prompt', await p.evaluate(() => document.body.classList.contains('siyl-inv-open')), 'prompt open');
  await p.fill('.siyl-inv input', T1); await p.click('.siyl-inv .igo'); await p.waitForSelector('.p-drawer:not([hidden])'); await p.waitForTimeout(300);
  const g1 = JSON.parse(await p.evaluate(() => localStorage.getItem('siyl.auth')));
  await p.click('.p-drawer [data-who="' + g1.guests[0].guestId + '"]'); await p.waitForTimeout(400);
  const second = await p.evaluate(() => ({ inv: JSON.parse(localStorage.getItem('siyl.auth')).invitationId, hosts: JSON.parse(localStorage.getItem('siyl.auth')).hosts, bag: JSON.parse(localStorage.getItem('siyl.bag') || '[]').length, aside2: !!localStorage.getItem('siyl.party.INV-002') }));
  note('4 second party opens clean', second.inv === 'INV-001' && second.hosts === true && second.bag === 0 && second.aside2, JSON.stringify(second));
  await p.goto(ORIGIN + '/wedding.html', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const hosts = await p.evaluate(() => ({ front: ((document.querySelector('#seats-route')?.innerText || '').match(/front centre/gi) || []).length, ceremonyCta: document.querySelectorAll('#seats-route [data-seat-cta="ceremony"]').length, dinnerCta: document.querySelectorAll('#seats-route [data-seat-cta="dinner"]').length }));
  note('4 the hosts: ceremony = front centre for both, dinner chosen like everyone', hosts.front >= 2 && hosts.ceremonyCta === 0 && hosts.dinnerCta === 2, JSON.stringify(hosts));
  await p.goto(ORIGIN + '/wedding-preparation.html#seats', { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
  const hostCards = await p.evaluate(() => [...document.querySelectorAll('[data-seatmap]')].map((c) => c.dataset.seatmap + ':' + (c.dataset.hosts || c.dataset.state) + ':' + c.querySelector('h3').textContent.trim()));
  note('4 hosts on step 04: no ceremony map, front centre by role, dinner map open', hostCards.join('|') === 'ceremony:true:Your ceremony place|dinner:open:Choose your dinner seat' && /Front centre · (Bride|Groom)/i.test(await txt(p, '[data-seatmap="ceremony"]')) && (await p.locator('[data-ev="ceremony"]').count()) === 0 && (await p.locator('[data-ev="dinner"] g.seat').count()) === 50, hostCards.join(' | '));
  /* SWITCH stays inside the party */
  await tap(p, '.prep-bar [data-switch]'); await p.waitForSelector('.p-drawer:not([hidden])'); await p.waitForTimeout(200);
  const who = await p.evaluate(() => [...document.querySelectorAll('.p-drawer [data-who]')].map((b) => b.textContent.trim()));
  note('4 SWITCH offers only this party', who.length === 2 && /Haruthai/.test(who[0]) && /Suthep/.test(who[1]), who.join(' / '));
  await p.click('.p-drawer [data-who="' + g1.guests[1].guestId + '"]'); await p.waitForTimeout(400);
  /* back to INV-002: its draft returns */
  await p.goto(ORIGIN + '/invitation.html', { waitUntil: 'networkidle' }); await p.evaluate(() => window.SIYL_PREP && SIYL_PREP.leave('another')); await p.waitForTimeout(900);
  await p.fill('.siyl-inv input', T2); await p.click('.siyl-inv .igo');
  /* the draft comes back with its own "who": no identity question this time */
  await p.waitForFunction(() => (JSON.parse(localStorage.getItem('siyl.auth') || 'null') || {}).invitationId === 'INV-002'); await p.waitForTimeout(400);
  const back2 = await p.evaluate(() => ({ inv: JSON.parse(localStorage.getItem('siyl.auth')).invitationId, usathorn: JSON.parse(localStorage.getItem('siyl.bag') || '[]').some((x) => x.room === 'u-sathorn-superior-garden'), aside: !!localStorage.getItem('siyl.party.INV-002') }));
  note('4 INV-002 returns to its own draft', back2.inv === 'INV-002' && back2.usathorn && !back2.aside, JSON.stringify(back2));
  note('4 errors', errs.length === 0, errs.slice(0, 2).join(' | ') || 'none');
  await ctx.close();
}

/* ================================================================ 5 · PUBLIC: the China card */
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(ORIGIN + '/index.html', { waitUntil: 'networkidle' });
  const china = await p.evaluate(() => { const a = document.querySelector('a.am[href="destination.html#china"]'); return a ? { bg: getComputedStyle(a).backgroundImage, label: a.getAttribute('aria-label') } : null; });
  note('5 China card carries the Lijiang file', china && /004-lijiang-black-dragon-pool\.jpg/.test(china.bg) && !/kunming-jinma/.test(china.bg) && /Black Dragon Pool/.test(china.label), JSON.stringify(china));
  const ok = await p.evaluate(async () => { const r = await fetch('assets/images/city/004-lijiang-black-dragon-pool.jpg'); return r.status; });
  note('5 the file is served', ok === 200, 'HTTP ' + ok);
  const after = await p.evaluate(async () => { const a = document.querySelector('a.am[href="journeys.html#j-mu9646"]'); const r = await fetch('assets/images/city/004-lijiang-old-town-roofs-jade-dragon.jpg'); return { bg: a ? getComputedStyle(a).backgroundImage : '', status: r.status }; });
  note('5 After the Wedding card carries the Lijiang old-town file', /004-lijiang-old-town-roofs-jade-dragon\.jpg/.test(after.bg) && after.status === 200, JSON.stringify(after));
  await p.close();
}

const total = R.length, pass = R.filter((r) => r.ok).length;
if (OUT) fs.writeFileSync(OUT, JSON.stringify({ origin: ORIGIN, at: new Date().toISOString(), results: R }, null, 2));
console.log(pass + '/' + total + ' guest-testing checks pass on ' + ORIGIN);
await b.close();
process.exit(pass === total ? 0 : 1);
