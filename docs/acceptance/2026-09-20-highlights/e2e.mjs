/* THE HIGHLIGHTS + THE SATHORN INSET — E2E on the isolated stage worker (Owner, 20 Sep 2026). Synthetic guests only (T003 Cleo);
   codes read from the scratchpad, never printed.   node docs/acceptance/2026-09-20-highlights/e2e.mjs <scratchpad> <outDir> [origin]
   Sections: the menu row · the Experiences rail · Sühring (Three MICHELIN Stars, two menus, preview → confirm → the Bag, change,
   remove, a fresh device) · Baan Phraya (USD 114) · Cannubi (One MICHELIN Star, USD 165, the clip) · Aman 1872 (USD 180) · My Bag and
   Review & Send totals · signed-out surfaces · the Sathorn card inset at 320 · 390 · 834 · 1440 · overflow · console. */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const N = process.argv[2], OUT = process.argv[3], O = (process.argv[4] || 'http://127.0.0.1:8788').replace(/\/$/, ''); fs.mkdirSync(OUT, { recursive: true });
const LIVE = process.env.LIVE === '1';
const codes = LIVE ? {} : JSON.parse(fs.readFileSync(N + '/synth-codes.json', 'utf8'));
const GR = 'local-dev-gr-token';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 300) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, 220)); };
const b = await chromium.launch();
const errors = new Map();
const fresh = async (w, opts) => { const ctx = await b.newContext(Object.assign({ viewport: { width: w || 390, height: 844 }, deviceScaleFactor: 2, isMobile: (w || 390) <= 390, hasTouch: (w || 390) <= 390 }, opts || {})); const p = await ctx.newPage(); p.on('pageerror', (e) => errors.set(p.url() + ' ' + e.message, 1)); p.on('console', (m) => { if (m.type() === 'error' && !/404|409|Failed to load resource/.test(m.text())) errors.set(p.url() + ' ' + m.text(), 1); }); return p; };
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' }); await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 }); await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo'); await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 }); await p.waitForTimeout(2200); };
const contact = async (p, email) => { await p.goto(O + '/invitation.html', { waitUntil: 'load' }); await p.waitForSelector('input[data-c="email"]', { timeout: 20000 }); await p.fill('input[data-c="email"]', email); await p.dispatchEvent('input[data-c="email"]', 'change'); await p.fill('input[data-c="phone"]', '+66 81 000 0000'); await p.dispatchEvent('input[data-c="phone"]', 'change'); await p.waitForTimeout(1500); };
const api = (p, path, init) => p.evaluate(async ([path, init]) => { const a = JSON.parse(localStorage.getItem('siyl.auth')); const r = await fetch(path, Object.assign({ headers: { 'x-siyl-auth': a.bearer, 'content-type': 'application/json' } }, init || {})); let body = null; try { body = await r.clone().json(); } catch (e) {} return { status: r.status, body }; }, [path, init]);
const gr = async (route, body, method) => { const r = await fetch(O + route, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', 'x-gr-token': GR }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, body: await r.json().catch(() => null) }; };
const need = (p) => p.evaluate(() => { const r = SIYL_GUEST.readiness(); return { ok: r.ok, n: r.need.length, first: r.first ? r.first.href : null, keys: r.need.map((x) => x.key) }; });
const trip = async (p) => { await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1800); };
const mine = async (p) => (await api(p, '/api/rooms/mine', { method: 'POST', body: '{}' })).body;
const wedding = async (p, temple, ev) => { await p.goto(O + '/wedding.html', { waitUntil: 'load' }); await p.waitForTimeout(800); for (const [k, v] of [['temple', temple || 'no'], ['coffee', ev || 'yes'], ['vows', ev || 'yes'], ['dinner', ev || 'yes']]) { const el = await p.$('[data-e="' + k + '"] [data-ev="' + v + '"]'); if (el) { await el.click(); await p.waitForTimeout(150); } } const off = await p.$('#sangkhathan [data-off="no"]'); if (off) await off.click(); await p.waitForTimeout(1200); };
const prep = async (p) => { await p.goto(O + '/wedding-preparation.html', { waitUntil: 'load' }); await p.waitForTimeout(600); await p.evaluate(() => { const a = document.querySelector('[data-ack]'); if (a && !a.checked) a.click(); }); await p.waitForTimeout(1200); };
const about = async (p, flavor) => { await p.goto(O + '/about-you.html', { waitUntil: 'load' }); await p.waitForSelector('[data-allergy="no"]', { timeout: 20000 }); await p.click('[data-allergy="no"]'); await p.click('[data-choice="flavor"] [data-pick="' + (flavor || 'Pandan') + '"]'); for (const [k, v] of [['coffeetea', 'Oolong'], ['drink', 'Lime'], ['film', 'Film'], ['music', 'Music']]) { const el = await p.$('textarea[data-q="' + k + '"]'); if (el) { await el.fill(v); await el.dispatchEvent('change'); } } const pa = await p.$('[data-photo-ack]'); if (pa && !(await pa.evaluate((e) => e.checked || e.getAttribute('aria-pressed') === 'true'))) await pa.click(); await p.waitForTimeout(1600); };
const resetGuest = async (id) => { const p = await fresh(); await signIn(p, id);
  for (const ev of ['ceremony', 'dinner']) await api(p, '/api/seating/release', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, event: ev }) });
  for (const stage of ['bkk-stay', 'prewed', 'wedstay', 'kmg', 'ljg', 'kempinski']) { await api(p, '/api/rooms/leave', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); await api(p, '/api/rooms/unwait', { method: 'POST', body: JSON.stringify({ invitationId: 'INV-' + id, guestId: id, stage }) }); }
  /* the server-side draft too: an empty Bag and no declines pushed as the guest's own save, so the next sign-in restores nothing */
  await p.goto(O + '/your-journey.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  await p.evaluate(async () => { localStorage.setItem('siyl.bag', '[]'); localStorage.setItem('siyl.skip', '[]'); localStorage.setItem('siyl.skip.by', '{}'); try { await window.SIYL_DRAFT.flush('reset'); } catch (e) {} });
  await p.waitForTimeout(800);
  await p.evaluate(() => { ['siyl.guest', 'siyl.bag', 'siyl.temple', 'siyl.docs', 'siyl.sent', 'siyl.skip', 'siyl.skip.by', 'siyl.wait', 'siyl.draft.meta', 'siyl.draft.base'].forEach((k) => localStorage.removeItem(k)); });
  await p.context().close(); };
const bag = (p) => p.evaluate(() => ({ lines: SIYL_BAG.get().map((x) => x.id + ':' + (x.menu || '') + ':' + x.price), total: SIYL_BAG.total() }));
const openHighlight = async (p, id) => { await p.goto(O + '/experience.html?id=' + id, { waitUntil: 'load' }); await p.waitForTimeout(1800); };
const previewConfirm = async (p) => { await p.click('#hl-preview'); await p.waitForTimeout(500); const before = await p.evaluate(() => ({ held: SIYL_BAG.get().length, sheet: document.body.classList.contains('hl-show'), confirm: !!document.querySelector('#hl-confirm'), words: (document.getElementById('hl-ov') || {}).innerText || '' })); await p.click('#hl-confirm'); await p.waitForTimeout(700); return before; };

if (!LIVE) {
  await resetGuest('T003');
  /* ===== 1 · THE MENU: a Highlights row between Experiences and Wellness, Aman first; the Experiences submenu keeps 1872 ===== */
  {
    const p = await fresh(390); await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.click('#menu-open, .hb'); await p.waitForTimeout(600);
    const menu = await p.evaluate(() => { const rows = [...document.querySelectorAll('.a-menu .a-mrow > a')].map((a) => a.textContent.trim()); const i = rows.indexOf('Highlights'); const sub = i >= 0 ? [...document.querySelectorAll('#a-sub-' + i + ' a')].map((a) => a.getAttribute('href') + ' · ' + a.textContent.trim()) : []; const m = document.querySelector('.a-menu'); return { rows, sub, scroll: m ? getComputedStyle(m).overflowY : '' }; });
    await p.click('.a-menu .a-mrow:nth-child(' + (menu.rows.indexOf('Highlights') * 2 + 1) + ') .a-ch').catch(() => {});
    await p.waitForTimeout(400); await shot(p, '390-menu-highlights');
    note('menu-highlights-row', menu.rows.join(',') === 'Destinations,The Journey,Stays,Experiences,Highlights,Wellness,The Wedding,My Trip' && menu.sub.length === 4 && /^1872\.html · 1872 · Champagne Afternoon Tea · Aman$/.test(menu.sub[0]) && menu.sub.some((s) => /bkk-suhring · Sühring · Three MICHELIN Stars/.test(s)) && menu.sub.some((s) => /bkk-baanphraya/.test(s)) && menu.sub.some((s) => /bkk-cannubi · Cannubi by Umberto Bombana · One MICHELIN Star/.test(s)) && /auto|scroll/.test(menu.scroll), JSON.stringify(menu));
    await p.context().close();
  }
  /* ===== 2 · THE EXPERIENCES RAIL #highlights: four cards, every image served, the four pages reachable ===== */
  {
    const p = await fresh(390); await p.goto(O + '/experiences.html#highlights', { waitUntil: 'load' }); await p.waitForTimeout(1200);
    const rail = await p.evaluate(() => [...document.querySelectorAll('[data-highlights] .aslide')].map((a) => ({ id: a.getAttribute('data-highlight-id'), href: a.querySelector('a.am').getAttribute('href'), img: (a.querySelector('a.am').style.backgroundImage.match(/url\("?([^")]+)"?\)/) || [])[1] })));
    let served = 0; for (const c of rail) { const r = await fetch(O + '/' + c.img); if (r.status === 200) served++; const h = await fetch(O + '/' + c.href); if (h.status !== 200) served -= 10; }
    await shot(p, '390-experiences-highlights');
    note('experiences-highlights-rail', rail.map((c) => c.id).join() === 'bkk-suhring,bkk-baanphraya,1872,bkk-cannubi' && served === 4, JSON.stringify(rail.map((c) => c.id)) + ' served ' + served);
    await p.context().close();
  }
  /* ===== 3 · SÜHRING: the Highlight, two menus, preview → confirm → the Bag, the change, a fresh device, the removal ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await contact(p, 'cleo.test@example.org');
    await openHighlight(p, 'bkk-suhring');
    const pg = await p.evaluate(() => ({ dist: (document.querySelector('[data-distinction]') || {}).innerText || '', line: (document.querySelector('.x-line') || {}).innerText || '', menu: document.querySelectorAll('[data-menu] .x-menu li').length, radios: [...document.querySelectorAll('[data-menu-pick]')].map((b) => b.innerText.replace(/\s+/g, ' ')), contact: (document.querySelector('.x-contact') || {}).innerText || '', preview: !!document.querySelector('#hl-preview'), held: SIYL_BAG.get().length, text: document.body.innerText }));
    await shot(p, '390-suhring-highlight');
    note('suhring-highlight-page', /Three MICHELIN Stars/i.test(pg.dist) && /Thomas and Mathias Sühring/.test(pg.line) && pg.menu >= 12 && pg.radios.length === 2 && /USD 294/.test(pg.radios[0]) && /USD 234/.test(pg.radios[1]) && /Yen Akat Soi 3/.test(pg.contact) && /reservation@restaurantsuhring\.com/.test(pg.contact) && pg.preview && pg.held === 0 && /Beverages are not included/.test(pg.text) && !/USD 180/.test(pg.text), JSON.stringify({ dist: pg.dist, menu: pg.menu, radios: pg.radios, held: pg.held }));
    const pv = await previewConfirm(p);
    const b1 = await bag(p);
    await shot(p, '390-suhring-added');
    note('suhring-preview-then-confirm', pv.held === 0 && pv.sheet && pv.confirm && /USD 294 per person · your cost/.test(pv.words) && /nothing is held until you confirm/i.test(pv.words) && b1.lines.join() === 'suhring:erlebnis:294' && b1.total === 294, JSON.stringify({ before: { held: pv.held, sheet: pv.sheet }, after: b1 }));
    /* the change: the shorter sequence replaces the line — never two */
    await p.click('#hl-cancel').catch(() => {}); await p.waitForTimeout(300);
    await p.click('#hl-change'); await p.waitForTimeout(400); await p.click('[data-menu-pick="erlebnis-short"]'); await p.waitForTimeout(400);
    const pv2 = await previewConfirm(p);
    const b2 = await bag(p);
    note('suhring-change-menu-replaces', /replaces your current selection \(USD 294\)/i.test(pv2.words) && b2.lines.join() === 'suhring:erlebnis-short:234' && b2.total === 234, JSON.stringify(b2));
    await p.click('#hl-cancel').catch(() => {}); await p.evaluate(async () => { await SIYL_DRAFT.flush('e2e'); }); await p.waitForTimeout(800);
    /* a fresh device of the same guest reads the same line (the draft) */
    const p2 = await fresh(390); await signIn(p2, 'T003'); await p2.goto(O + '/cart.html', { waitUntil: 'load' }); await p2.waitForTimeout(3000);
    const cross = await p2.evaluate(() => ({ lines: SIYL_BAG.get().map((x) => x.id + ':' + (x.menu || '') + ':' + x.price), text: document.body.innerText.replace(/\s+/g, ' ') }));
    note('suhring-cross-device', cross.lines.join() === 'suhring:erlebnis-short:234' && /Sühring/.test(cross.text) && /USD 234/.test(cross.text) && /Erlebnis · the shorter sequence/.test(cross.text), JSON.stringify(cross.lines));
    await p2.context().close();
    /* removal reverses it; the page shows the preview again */
    await openHighlight(p, 'bkk-suhring'); await p.click('#hl-remove'); await p.waitForTimeout(500);
    const b3 = await bag(p); const again = await p.evaluate(() => !!document.querySelector('#hl-preview'));
    note('suhring-remove', b3.lines.length === 0 && b3.total === 0 && again, JSON.stringify(b3));
    /* back in, for the totals below */
    await p.click('#hl-preview'); await p.waitForTimeout(400); await p.click('#hl-confirm'); await p.waitForTimeout(600); await p.click('#hl-cancel').catch(() => {}); await p.evaluate(async () => { await SIYL_DRAFT.flush('e2e'); }); await p.waitForTimeout(500);
    await p.context().close();
  }
  /* ===== 4 · BAAN PHRAYA · CANNUBI · AMAN 1872 ===== */
  {
    const p = await fresh(390); await signIn(p, 'T003'); await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);   /* the draft of the last device arrives */
    await openHighlight(p, 'bkk-baanphraya');
    const bp = await p.evaluate(() => ({ dist: (document.querySelector('[data-distinction]') || {}).innerText || '', menu: document.querySelectorAll('[data-menu] .x-menu li').length, price: (document.querySelector('#selamt') || {}).innerText || '', text: document.body.innerText, imgs: [...document.querySelectorAll('.x-gal img, .x-gal [style*="background-image"]')].length }));
    const pvb = await previewConfirm(p); const bb = await bag(p);
    await shot(p, '390-baanphraya-highlight');
    note('baanphraya-highlight-and-booking', /River of Kings/i.test(bp.dist) && bp.menu === 11 && /USD 114/.test(bp.price) && /Pom/.test(bp.text) && /Pre-dinner drink 17:00 – 18:00/.test(bp.text) && /mobkk-baanphraya@mohg\.com/.test(bp.text) && !/2,800|1,400/.test(bp.price) && pvb.held === 1 && /USD 114 per person/.test(pvb.words) && bb.lines.includes('baanphraya::114') && bb.total === 294 + 114, JSON.stringify({ dist: bp.dist, menu: bp.menu, price: bp.price, bag: bb }));
    await p.click('#hl-cancel').catch(() => {});
    await openHighlight(p, 'bkk-cannubi'); await p.waitForTimeout(1500);
    const cb = await p.evaluate(() => ({ dist: (document.querySelector('[data-distinction]') || {}).innerText || '', menu: document.querySelectorAll('[data-menu] .x-menu li').length, price: (document.querySelector('#selamt') || {}).innerText || '', text: document.body.innerText, clip: (document.querySelector('.x-clip .am') || {}).getAttribute ? document.querySelector('.x-clip .am').getAttribute('data-video') : null, state: (document.querySelector('.x-clip .am') || {}).getAttribute ? document.querySelector('.x-clip .am').getAttribute('data-video-state') : null, video: !!document.querySelector('.x-clip video.am-clip') }));
    const clipOk = (await fetch(O + '/assets/video/cannubi-card.mp4')).status === 200;
    const pvc = await previewConfirm(p); const bc = await bag(p);
    await shot(p, '390-cannubi-highlight');
    note('cannubi-highlight-and-booking', /One MICHELIN Star/i.test(cb.dist) && /2026/.test(cb.dist) && cb.menu === 8 && /USD 165/.test(cb.price) && /Andrea Susto/.test(cb.text) && /350 wine labels/.test(cb.text) && /L Floor/.test(cb.text) && /\+66 2200 9000/.test(cb.text) && cb.clip === 'assets/video/cannubi-card.mp4' && clipOk && (cb.video || cb.state === 'still' || cb.state === 'loading' || cb.state === 'playing') && pvc.held === 2 && bc.lines.includes('cannubi::165') && bc.total === 294 + 114 + 165, JSON.stringify({ dist: cb.dist, menu: cb.menu, price: cb.price, clip: cb.clip, state: cb.state, video: cb.video, bag: bc }));
    await p.click('#hl-cancel').catch(() => {});
    /* Aman 1872: the approved page, its own add, USD 180 for two */
    await p.goto(O + '/tea.html', { waitUntil: 'load' }); await p.waitForTimeout(1500); await p.click('#add'); await p.waitForTimeout(800);
    const ba = await bag(p); const ov = await p.evaluate(() => (document.getElementById('ov') || {}).innerHTML || '');
    note('aman-1872-still-bookable', ba.lines.includes('tea1872::180') && ba.total === 294 + 114 + 165 + 180 && /Added to My Bag/.test(ov), JSON.stringify(ba));
    /* My Bag: four lines, one total; repeated adds never duplicate */
    await openHighlight(p, 'bkk-cannubi'); await p.click('#hl-change').catch(() => {}); const dup = await p.evaluate(() => { const l = SIYL_BAG.get().filter((x) => x.id === 'cannubi'); return l.length; });
    await p.goto(O + '/cart.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
    const cart = await p.evaluate(() => ({ n: document.querySelectorAll('.cart-line').length, total: SIYL_BAG.total(), text: document.body.innerText.replace(/\s+/g, ' ') }));
    await shot(p, '390-cart-highlights');
    note('my-bag-four-highlights-one-total', dup === 1 && cart.n === 4 && cart.total === 753 && /Sühring/.test(cart.text) && /Baan Phraya/.test(cart.text) && /Cannubi/.test(cart.text) && /1872/.test(cart.text) && /USD 753/.test(cart.text) && /Requested through Guest Relations/i.test(cart.text), JSON.stringify({ n: cart.n, total: cart.total, req: /Requested through Guest Relations/i.test(cart.text), t: /USD 753/.test(cart.text) }));
    /* Review & Send: the four requests with their amounts and the one total */
    await trip(p); await p.evaluate(() => { SIYL_GUEST.setScope({ bangkok: true }); }); await trip(p);
    await p.evaluate(async () => { for (const k of ['bkk-stay', 'train', 'kempinski']) { const s = SIYL_JOURNEY.SEGMENTS.find((x) => x.key === k); if (s && SIYL_JOURNEY.relevant(s)) await SIYL_JOURNEY.decline(s); } });
    await wedding(p, 'no', 'no'); await prep(p); await about(p, 'Pandan');
    await p.goto(O + '/review.html', { waitUntil: 'load' }); await p.waitForTimeout(2500);
    const rev = await p.evaluate(() => ({ url: location.pathname, text: document.body.innerText.replace(/\s+/g, ' '), total: SIYL_BAG.total(), send: !!document.querySelector('#send:not([disabled])') }));
    await shot(p, '390-review-highlights');
    note('review-carries-the-highlights', /review/.test(rev.url) && /Sühring/.test(rev.text) && /Baan Phraya/.test(rev.text) && /Cannubi/.test(rev.text) && /1872/.test(rev.text) && /USD 753/.test(rev.text) && rev.total === 753 && rev.send, JSON.stringify({ url: rev.url, total: rev.total, send: rev.send, found: ['Sühring', 'Baan Phraya', 'Cannubi', '1872'].filter((n) => rev.text.includes(n)) }));
    await p.context().close(); await resetGuest('T003');
  }
  /* ===== 5 · SIGNED OUT: the Highlight pages show no price and no add — the way in ===== */
  {
    const p = await fresh(390); await openHighlight(p, 'bkk-suhring');
    const out = await p.evaluate(() => ({ sel: (document.getElementById('selbox') || {}).innerHTML || '', way: !!document.querySelector('.x-sel [data-private-cta]'), priceHidden: [...document.querySelectorAll('[data-private]')].every((e) => getComputedStyle(e).display === 'none'), dist: (document.querySelector('[data-distinction]') || {}).innerText || '' }));
    note('signed-out-highlight', out.sel === '' && out.way && out.priceHidden && /Three MICHELIN Stars/i.test(out.dist), JSON.stringify({ sel: out.sel.length, way: out.way, priceHidden: out.priceHidden }));
    await p.context().close();
  }
  /* ===== 6 · THE SATHORN CARD INSET at four widths: the whole text column at one inset ≥ 18 px, image edge-to-edge, no overflow ===== */
  {
    for (const w of [320, 390, 834, 1440]) {
      const p = await fresh(w); await signIn(p, 'T003'); await p.goto(O + '/journeys.html#j-bkk-stay', { waitUntil: 'load' }); await p.waitForTimeout(2500);
      const m = await p.evaluate(() => { const cards = [...document.querySelectorAll('#j-bkk-stay .pcard')]; return cards.map((c) => { const r = c.getBoundingClientRect(); const q = (s) => { const e = c.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return Math.round(b.left - r.left); }; const img = c.querySelector('.pcimg').getBoundingClientRect(); return { name: c.querySelector('.pcname').textContent.trim(), eyebrow: q('.pceyebrow'), heading: q('.pcname'), room: q('.pcroom'), facts: q('.pcfacts'), price: q('.pcprice'), rate: q('.pcrate'), cta: q('.pcgo'), view: q('.pcview'), imgInset: Math.round(img.left - r.left), w: Math.round(r.width) }; }); });
      const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const ok = m.length === 3 && m.every((c) => { const v = [c.eyebrow, c.heading, c.room, c.facts, c.price, c.rate, c.cta, c.view]; return v.every((x) => x !== null && x >= 18 && x <= 24) && new Set(v).size === 1 && c.imgInset <= 1 && c.w >= 190; }) && ov <= 1;
      const el = await p.$('#j-bkk-stay .psel'); if (el) await el.screenshot({ path: path.join(OUT, w + '-sathorn-cards.png') });
      note('sathorn-inset-' + w, ok, JSON.stringify(m.map((c) => [c.name.slice(0, 18), c.eyebrow, c.heading, c.room, c.facts, c.price, c.rate, c.cta, c.view, c.imgInset, c.w])) + ' overflow ' + ov);
      await p.context().close();
    }
  }
  /* ===== 7 · widths and the console on the Highlight pages ===== */
  for (const w of [320, 834]) { const p = await fresh(w); const over = []; for (const f of ['experience.html?id=bkk-suhring', 'experience.html?id=bkk-baanphraya', 'experience.html?id=bkk-cannubi', 'experiences.html', '1872.html']) { await p.goto(O + '/' + f, { waitUntil: 'load' }); await p.waitForTimeout(900); const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (ov > 1) over.push(f + ':' + ov); } note('no-horizontal-overflow-' + w, over.length === 0, over.join(' ') || 'no overflow'); await p.context().close(); }
  await resetGuest('T003');
}
note('console-errors', errors.size === 0, [...errors.keys()].slice(0, 3).join(' | ') || 'no script or console error');
await b.close();
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(R, null, 1));
const fails = R.filter((r) => !r.ok); console.log((R.length - fails.length) + '/' + R.length + ' checks passed' + (fails.length ? ' · FAILED: ' + fails.map((f) => f.id).join(', ') : '')); process.exit(fails.length ? 1 : 0);
