/* ============================================================================
   THE SEE YOU IN LAOS VISUAL INTERACTION SYSTEM — the served proof.
   One Cherry (#74070E), six meanings, on every surface a guest meets: the
   navigation, the hero, the journey, availability, Discover, My Profile, My
   Trip, My Bag, Review & Send — and the keyboard's own ring.
   ========================================================================== */
import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices, webkit } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const S = process.argv[2], OUT = process.argv[3], O = 'http://127.0.0.1:8788';
fs.mkdirSync(OUT, { recursive: true });
const codes = JSON.parse(fs.readFileSync(S + '/synth-codes.json', 'utf8'));
const CHERRY = 'rgb(116, 7, 14)', IVORY = 'rgb(242, 236, 225)';
const R = []; const note = (id, ok, d) => { R.push({ id, ok: !!ok, d: String(d).slice(0, 700) }); console.log((ok ? 'PASS ' : 'FAIL ') + id + ' — ' + String(d).slice(0, ok ? 230 : 700)); };
const b = await chromium.launch(), wk = await webkit.launch();
const fresh = async (w, h) => { const ctx = await (w <= 430 ? wk : b).newContext(w <= 430 ? Object.assign({}, devices['iPhone 13'], { viewport: { width: w, height: h } }) : { viewport: { width: w, height: h } }); return ctx.newPage(); };
const shot = async (p, n) => { await p.screenshot({ path: path.join(OUT, n + '.jpg'), type: 'jpeg', quality: 74 }); };
const signIn = async (p, id) => { await p.goto(O + '/invitation.html?open=1', { waitUntil: 'load' });
  await p.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 20000 });
  await p.fill('.siyl-inv input', codes[id]); await p.click('.siyl-inv .igo');
  await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 20000 });
  await p.waitForTimeout(1800); };

/* ===== 1 · THE ONE COLOUR, AT EVERY CLASS ===== */
for (const [w, h, name] of [[390, 844, '390'], [834, 1194, '834x1194'], [1194, 834, '1194x834'], [1440, 900, '1440']]) {
  const p = await fresh(w, h);
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(3400);
  const one = await p.evaluate(() => {
    const cs = (el) => el ? getComputedStyle(el) : null;
    const root = getComputedStyle(document.documentElement);
    const dot = document.querySelector('.a-mhd .a-brand .dot');
    const hero = document.querySelector('.a-hero-dot.is-on i');
    const heroOff = document.querySelector('.a-hero-dot:not(.is-on) i');
    const cg = document.querySelector('.cg-dots i.on'), cgOff = document.querySelector('.cg-dots i:not(.on)');
    const arc = document.querySelector('.av-arc'), run = document.querySelector('.sbar-run');
    /* how much Cherry is on the page at all: every element whose colour or background is Cherry */
    let cherryEls = 0, all = document.querySelectorAll('body *');
    all.forEach((el) => { const c = getComputedStyle(el); if (/116, 7, 14/.test(c.color + c.backgroundColor + c.borderTopColor + c.stroke)) cherryEls++; });
    return { ground: cs(document.body).backgroundColor,
      ivory: root.getPropertyValue('--ivory').trim(), ink: root.getPropertyValue('--ink').trim(), cherry: root.getPropertyValue('--cherry').trim(),
      wordmarkDot: dot ? cs(dot).color : null,
      heroActive: hero ? cs(hero).backgroundColor : null, heroInactive: heroOff ? cs(heroOff).backgroundColor : null,
      galleryActive: cg ? cs(cg).backgroundColor : null, galleryInactive: cgOff ? cs(cgOff).backgroundColor : null,
      availabilityArc: arc ? cs(arc).stroke : null, planningRun: run ? cs(run).backgroundColor : null,
      cherryElements: cherryEls, elements: all.length,
      ov: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  note('one-cherry-' + name, one.cherry === '#74070E' && one.ivory === '#F2ECE1' && one.ink === '#211F1C' &&
    one.ground === IVORY && one.wordmarkDot === CHERRY && one.heroActive === CHERRY && one.galleryActive === CHERRY &&
    one.availabilityArc === CHERRY && one.planningRun === CHERRY &&
    one.heroInactive !== CHERRY && one.galleryInactive !== CHERRY && one.ov <= 1,
    JSON.stringify(one));
  /* RATIONED: Cherry must stay a punctuation mark, never a colour scheme */
  note('cherry-stays-rationed-' + name, one.cherryElements > 0 && one.cherryElements / one.elements < 0.05,
    one.cherryElements + ' of ' + one.elements + ' elements carry Cherry (' + ((one.cherryElements / one.elements) * 100).toFixed(1) + ' %)');
  await shot(p, name + '-home');
  await p.evaluate(() => { const el = document.querySelector('[data-availability]'); if (el) el.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(1800);
  await shot(p, name + '-availability');
  await p.context().close();
}

/* ===== 2 · THE NAVIGATION AND THE KEYBOARD ===== */
{
  const p = await fresh(1440, 900);
  await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(2000);
  const nav = await p.evaluate(() => {
    const cur = document.querySelector('.a-mrow > a[aria-current]');
    const mark = cur ? getComputedStyle(cur, '::after') : null;
    return { current: cur ? cur.textContent.trim() : null, mark: mark ? mark.backgroundColor : null,
      width: mark ? mark.width : null, others: [...document.querySelectorAll('.a-mrow > a:not([aria-current])')].map((a) => getComputedStyle(a).color) };
  });
  note('navigation-marks-only-the-current-page', nav.mark === CHERRY && parseFloat(nav.width) <= 6 &&
    nav.others.every((c) => c !== CHERRY), JSON.stringify(nav));
  /* the keyboard's own ring, in the brand's colour */
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(300);
  const focus = await p.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a);
    return { tag: a.tagName, label: (a.textContent || a.getAttribute('aria-label') || '').trim().slice(0, 40), outline: c.outlineColor, width: c.outlineWidth, style: c.outlineStyle }; });
  note('keyboard-focus-is-the-brand-ring', focus.outline === CHERRY && parseFloat(focus.width) >= 2 && focus.style !== 'none', JSON.stringify(focus));
  await shot(p, '1440-focus-ring');
  await p.context().close();
}

/* ===== 3 · DISCOVER: the current place in a rail, and the one chosen category ===== */
{
  const p = await fresh(1194, 834);
  await p.goto(O + '/experiences.html', { waitUntil: 'load' }); await p.waitForTimeout(2800);
  const rail = await p.evaluate(() => {
    const rails = [...document.querySelectorAll('.arail')];
    const first = rails[0] ? rails[0].querySelector('i') : null;
    return { rails: rails.length, track: rails[0] ? getComputedStyle(rails[0]).backgroundColor : null,
      run: first ? getComputedStyle(first).backgroundColor : null, height: first ? getComputedStyle(first).height : null,
      categories: [...new Set([...document.querySelectorAll('[data-category]')].map((e) => e.getAttribute('data-category')))].length };
  });
  note('discover-rails-mark-the-current-place', rail.rails > 0 && rail.run === CHERRY && rail.track !== CHERRY &&
    parseFloat(rail.height) <= 3, JSON.stringify(rail));
  await shot(p, '1194x834-discover');
  await p.goto(O + '/accommodation.html', { waitUntil: 'load' }); await p.waitForTimeout(2400);
  /* the index marks nothing until the guest chooses a place — then it marks exactly that one */
  await p.click('.venue-item'); await p.waitForTimeout(600);
  const d = await p.evaluate(() => {
    const on = document.querySelector('.venue-item[aria-pressed="true"]');
    const off = [...document.querySelectorAll('.venue-item[aria-pressed="false"]')].slice(0, 6);
    return { active: on ? getComputedStyle(on.querySelector('.venue-t')).color : null,
      activeName: on ? on.querySelector('.venue-t').textContent.trim() : null,
      inactive: off.map((e) => getComputedStyle(e.querySelector('.venue-t')).color),
      count: document.querySelectorAll('.venue-item').length };
  });
  note('venue-index-marks-one-place', d.active === CHERRY && d.inactive.length > 0 && d.inactive.every((c) => c !== CHERRY),
    JSON.stringify({ active: d.activeName, activeColour: d.active, inactive: d.inactive.length + ' others, none Cherry', of: d.count }));
  await shot(p, '1194x834-venue-index');
  await p.context().close();
}

/* ===== 4 · THE GUEST'S OWN SURFACES ===== */
{
  const p = await fresh(1194, 834); await signIn(p, 'T001');
  for (const [page, name] of [['your-journey.html', 'mytrip'], ['profile.html', 'profile'], ['cart.html', 'bag']]) {
    await p.goto(O + '/' + page, { waitUntil: 'load' }); await p.waitForTimeout(2600);
    await shot(p, '1194x834-' + name);
  }
  const guest = await p.evaluate(() => {
    const ring = getComputedStyle(document.documentElement).getPropertyValue('--p-accent').trim();
    const focus = getComputedStyle(document.documentElement).getPropertyValue('--p-focus').trim();
    const tick = document.querySelector('.prep-tick');
    return { accent: ring, focus, tick: tick ? getComputedStyle(tick).backgroundColor : 'none',
      paper: getComputedStyle(document.documentElement).getPropertyValue('--p-paper').trim() };
  });
  note('the-guest-surfaces-share-the-one-accent', guest.accent === '#74070E' && guest.focus === '#74070E' && guest.paper === '#F2ECE1',
    JSON.stringify(guest));
  await p.context().close();
}

/* ===== 5 · REDUCED MOTION: the final state, at once ===== */
{
  const ctx = await b.newContext({ viewport: { width: 1194, height: 834 }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  await p.goto(O + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(2600);
  const calm = await p.evaluate(() => {
    const av = document.querySelector('[data-availability]');
    const hero = document.querySelector('.a-hero-dot.is-on i');
    const cg = document.querySelector('.cg-dots i.on');
    return { availability: av ? av.getAttribute('data-av-state') : null,
      heroTransition: hero ? getComputedStyle(hero).transitionDuration : null,
      galleryTransition: cg ? getComputedStyle(cg).transitionDuration : null,
      heroColour: hero ? getComputedStyle(hero).backgroundColor : null };
  });
  note('reduced-motion-arrives-finished', calm.availability === 'settled' && /^0s/.test(calm.heroTransition || '') &&
    /^0s/.test(calm.galleryTransition || '') && calm.heroColour === CHERRY, JSON.stringify(calm));
  await ctx.close();
}

fs.writeFileSync(path.join(OUT, 'ci-proof.json'), JSON.stringify(R, null, 1));
console.log(R.filter((r) => r.ok).length + '/' + R.length + ' checks passed');
await b.close(); await wk.close();
process.exit(R.every((r) => r.ok) ? 0 : 1);
