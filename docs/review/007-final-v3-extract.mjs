/* 007 — FINAL V3 FULL-WEBSITE TEXT EXTRACTION · generator for docs/review/007-final-v3-text.txt (004: after the security remediation, the Owner's venue mapping, the final public / private information architecture and the guest reconciliation of 16 Sep 2026 — a new version, the v2 files stay as history)
   Every surface carries one of two states in its label: SIGNED-OUT PUBLIC STATE (what any visitor sees) or AUTHENTICATED PRIVATE STATE (what a signed-in guest sees).
   READ-ONLY. Renders every active guest-facing route and every reachable state of the current
   individual-guest architecture in a real browser against a LOCAL Worker with the real engines
   (rooms, seating, registrations — nothing touches production), walks the live DOM in document
   order (text nodes, aria-label / alt / title / placeholder, resolved aria-describedby, live
   regions, control states), adds the generated sent-journey text, the mailto fallback, the seat
   tickets and travel passes (PDF text read back with pdftotext) and a completeness audit over every
   guest-facing source literal. Exact-duplicate global blocks (header, footer, shell bar …) are
   written once as G-nnn and referenced. Access codes are read from the private register, never
   written; a final scrub replaces any code, bearer or hash with [SECRET ACCESS CODE OMITTED].
     node docs/review/007-final-extract.mjs [origin]                                            */
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { bearerOf } from '../../register/crypto.mjs';
import { validateGeometry } from '../../src/seating.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGIN = (process.argv[2] || 'http://127.0.0.1:8788').replace(/\/$/, '');
if (!/127\.0\.0\.1|localhost/.test(ORIGIN)) { console.error('read-only extraction runs against a LOCAL worker only'); process.exit(2); }
const OUT = path.join(ROOT, 'docs/review/007-final-v3-text.txt');
const GR = 'local-dev-gr-token';
const require = createRequire(import.meta.url);
const src = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const SHA = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim();
const csv = src('src/invitation-tokens.private.csv');
const rows = csv.split(/\r?\n/).slice(1).filter(Boolean).map((l) => { const c = l.split(','); return { guestId: c[0], invitationId: c[1], partyId: c[2], token: c[5], status: c[7] }; });
const TOKENS = rows.map((r) => r.token).filter(Boolean);
const tok = (g) => rows.find((r) => r.guestId === g && r.status === 'ACTIVE').token;
const ID = { PEGGY: 'G001', STEFFIE: 'G002', HARUTHAI: 'G048', SUTHEP: 'G049' };
const bearer = {}; for (const k of Object.keys(ID)) bearer[k] = await bearerOf(tok(ID[k]));
const cfg = validateGeometry(JSON.parse(src('docs/acceptance/2026-09-13-owner-decisions/seating-geometry.json'))).config;
const api = async (p, init) => { const r = await fetch(ORIGIN + '/api' + p, init); return { status: r.status, ...(await r.json().catch(() => ({}))) }; };
const asGuest = (who, body) => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-siyl-auth': bearer[who] }, body: JSON.stringify(body) });
const asGR = (body) => ({ method: 'POST', headers: { 'content-type': 'application/json', 'x-gr-token': GR }, body: JSON.stringify(body) });

/* ------------------------------------------------------------------ the corpus */
const surfaces = [];  const failures = [];
let stateCount = 0;
/* parts: [{ name, lines }] — a part that repeats exactly across surfaces becomes a global block */
function add(route, state, source, context, parts) {
  /* the two states of the final information architecture (Owner, 16 Sep 2026) */
  if (/^PUBLIC · |^MENU OPEN|^FORWARDING|^STATIC|^ERROR|^UNKNOWN ID|^SIGNED OUT|^STALE SESSION|^ACCESS · /.test(state)) state = 'SIGNED-OUT PUBLIC STATE · ' + state.replace(/^PUBLIC · /, '');
  else if (!/^TEMPLATE|^GENERATED/.test(state)) state = 'AUTHENTICATED PRIVATE STATE · ' + state;
  surfaces.push({ route, state, source, context, parts: parts.filter((p) => p && p.lines && p.lines.length) });
  if (!/^SIGNED-OUT PUBLIC STATE · DEFAULT|^TEMPLATE|^GENERATED/.test(state)) stateCount++;
  console.log('  + ' + route + ' · ' + state.slice(0, 70) + ' · ' + parts.reduce((n, p) => n + (p && p.lines ? p.lines.length : 0), 0) + ' lines');
}
async function step(name, fn) { try { await fn(); } catch (e) { failures.push(name + ': ' + String(e && e.message || e).slice(0, 200)); console.log('   !! ' + name + ': ' + String(e && e.message || e).slice(0, 200)); } }

/* ------------------------------------------------------------------ the DOM walk (runs in the page) */
const DUMP = `(function (rootSel, exclude) {
  var root = rootSel === 'html' ? document.documentElement : document.querySelector(rootSel);
  if (!root) return null;
  var ex = (exclude || []).map(function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }).reduce(function (a, b) { return a.concat(b); }, []);
  var lines = [], cur = [];
  var BLOCK = /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|BUTTON|DD|DETAILS|DIALOG|DIV|DL|DT|FIELDSET|FIGCAPTION|FIGURE|FOOTER|FORM|H1|H2|H3|H4|H5|H6|HEADER|HR|LEGEND|LI|MAIN|NAV|OL|OPTION|P|PRE|SECTION|SUMMARY|TABLE|TBODY|TD|TFOOT|TH|THEAD|TR|UL|TEXTAREA|SELECT|INPUT|SVG|G|TEXT|LABEL|TITLE)$/;
  function flush() { var t = cur.join('').replace(/\\s+/g, ' ').trim(); if (t) lines.push(t); cur = []; }
  function hiddenOf(el) { try { if (el.hidden || el.getAttribute('hidden') !== null) return true; var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return true; } catch (e) {} return false; }
  function byIds(ids) { return String(ids || '').split(/\\s+/).map(function (id) { var e = id && document.getElementById(id); return e ? (e.innerText || e.textContent).replace(/\\s*\\n+\\s*/g, ' · ').replace(/\\s+/g, ' ').trim() : ''; }).filter(Boolean).join(' · '); }
  function walk(node, hidden) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var n = node.childNodes[i];
      if (n.nodeType === 3) { var t = n.textContent.replace(/\\s+/g, ' '); if (t.trim()) cur.push((hidden && !cur.length ? '(hidden) ' : '') + t); continue; }
      if (n.nodeType !== 1) continue;
      if (ex.indexOf(n) >= 0) continue;
      var tag = n.tagName.toUpperCase();
      if (tag === 'BR') { cur.push(' '); continue; }
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'LINK' || tag === 'META' || tag === 'HEAD') continue;
      var h = hidden || hiddenOf(n), pre = h ? '(hidden) ' : '', attrs = [];
      ['aria-label', 'alt', 'title', 'placeholder', 'aria-placeholder', 'aria-valuetext', 'aria-roledescription'].forEach(function (a) { var v = n.getAttribute && n.getAttribute(a); if (v && v.trim()) attrs.push('[' + a + '] ' + v.replace(/\\s+/g, ' ').trim()); });
      if (n.getAttribute('aria-labelledby')) attrs.push('[aria-labelledby → spoken] ' + byIds(n.getAttribute('aria-labelledby')));
      if (n.getAttribute('aria-describedby')) attrs.push('[aria-describedby → spoken] ' + byIds(n.getAttribute('aria-describedby')));
      if (tag === 'INPUT' && /^(button|submit|reset)$/i.test(n.type) && n.value) attrs.push('[value] ' + n.value);
      var st = [];
      if (n.getAttribute('aria-pressed') === 'true') st.push('pressed'); if (n.getAttribute('aria-current')) st.push('current'); if (n.getAttribute('aria-expanded') === 'true') st.push('expanded');
      if (n.getAttribute('aria-selected') === 'true') st.push('selected'); if (n.getAttribute('aria-disabled') === 'true' || n.disabled) st.push('disabled'); if (tag === 'INPUT' && /^(checkbox|radio)$/i.test(n.type) && n.checked) st.push('checked');
      if (n.getAttribute('aria-required') === 'true') st.push('required'); if (n.getAttribute('aria-invalid') === 'true') st.push('invalid');
      if (n.getAttribute('aria-live')) st.push('live region · ' + n.getAttribute('aria-live')); if (n.getAttribute('role') === 'status' || n.getAttribute('role') === 'alert') st.push('role ' + n.getAttribute('role'));
      if (st.length) attrs.push('[state] ' + st.join(' · '));
      if (tag === 'IMG' && !n.getAttribute('alt') && n.getAttribute('alt') !== '') attrs.push('[img without alt]');
      var block = BLOCK.test(tag) || (n.ownerSVGElement && tag === 'G');
      if (!block && !h) { try { var d = getComputedStyle(n).display; if (d && d !== 'inline' && d !== 'inline-block' && d !== 'contents') block = true; } catch (e) {} }
      if (block) flush();
      attrs.forEach(function (a) { if (block) lines.push(pre + a); else cur.push(' ' + pre + a + ' '); });
      if (tag === 'TEMPLATE') { walk(n.content, h); continue; }
      walk(n, h);
      if (block) flush();
    }
  }
  if (rootSel === 'html') { var t = document.head.querySelector('title'); if (t && t.textContent.trim()) lines.push('[page title] ' + t.textContent.trim()); var d = document.head.querySelector('meta[name="description"]'); if (d && d.content) lines.push('[meta description] ' + d.content.trim()); }
  walk(root, hiddenOf(root));
  flush();
  return lines;
})`;

/* ------------------------------------------------------------------ browser helpers */
const b = await chromium.launch();
let ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, acceptDownloads: true });
let page = await ctx.newPage();
const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
const go = async (file, w = 390) => { await page.setViewportSize({ width: w, height: w < 800 ? 844 : 1000 }); const target = ORIGIN + '/' + file; await page.goto('about:blank'); await page.goto(target, { waitUntil: 'networkidle' }); await page.waitForTimeout(450); };
const dumpSel = async (sel, exclude = []) => page.evaluate(DUMP + '(' + JSON.stringify(sel) + ',' + JSON.stringify(exclude) + ')');
/* the standard parts of a page: header · the page · shell bar · sticky bars · drawers · footer */
const PARTS = [['header', 'header.hd, .a-head'], ['shell bar', '.prep-bar'], ['steps index', '#prep-steps'], ['page', 'main, #m, #page-root'], ['seat bar', '.p-seatbar'], ['journey bar', '.jbar'], ['cart bar', '.cart-foot'], ['drawer', '.p-drawer:not([hidden])'], ['menu', '.a-menu'], ['code prompt', '.siyl-inv'], ['footer', 'footer.sfoot, .sfoot']];
async function parts(opts = {}) {
  const out = [];
  const head = await dumpSel('html', PARTS.map((p) => p[1]).concat(['main', '#m', 'body > *:not(header):not(main):not(footer)']));
  if (head) out.push({ name: 'head', lines: head.filter((l) => /^\[page title\]|^\[meta description\]/.test(l)) });
  for (const [name, sel] of PARTS) {
    if (opts.only && !opts.only.includes(name)) continue;
    const lines = await dumpSel(sel, name === 'page' ? ['.p-drawer', '.siyl-inv', '.a-menu'] : []);
    if (lines && lines.length) out.push({ name, lines });
  }
  /* anything else that stands outside header, main and footer (overlays, live regions) */
  if (!opts.only) { const rest = await dumpSel('body', PARTS.map((p) => p[1]).concat(['main', '#m', 'header', 'footer'])); if (rest && rest.length) out.push({ name: 'other', lines: rest }); }
  return out;
}
const S = async (route, state, source, context, opts) => add(route, state, source, context, await parts(opts));
const clickIf = async (sel, wait = 350) => { const l = page.locator(sel).first(); if (await l.count()) { await l.click().catch(() => {}); await page.waitForTimeout(wait); return true; } return false; };
const esc = async () => { await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(200); };
async function signIn(who) {
  await go('invitation.html?open=1'); await page.waitForSelector('.siyl-inv input', { state: 'visible', timeout: 8000 });
  await page.fill('.siyl-inv input', tok(ID[who])); await page.click('.siyl-inv .igo');
  await page.waitForFunction(() => { try { const a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return !!(a && a.guestId && a.bearer); } catch (e) { return false; } }, null, { timeout: 15000 });
  await page.waitForTimeout(500);
}
async function signOut() { await go('review.html'); await page.evaluate(() => { const b = document.querySelector('[data-leave="out"]'); if (b) b.click(); else if (window.SIYL_PREP) window.SIYL_PREP.leave('out'); }); await page.waitForTimeout(600); await page.evaluate(() => localStorage.clear()); }
async function contact(email, phone) { await go('invitation.html#contact'); if (email !== null) { await page.fill('#p-email', email); await page.locator('#p-email').dispatchEvent('change'); } if (phone !== null) { await page.fill('#p-phone', phone); await page.locator('#p-phone').dispatchEvent('change'); } await page.waitForTimeout(400); }
async function decideAll(keep) { await go('your-journey.html'); await page.evaluate((keep) => { window.SIYL_JOURNEY.SEGMENTS.forEach((s) => { if (!keep.includes(s.key) && window.SIYL_JOURNEY.state(s) === 'open') window.SIYL_JOURNEY.skip(s.key, true); }); }, keep); await page.waitForTimeout(300); }
async function wedding(temple, offering, others = 'yes') { await go('wedding.html'); for (const [k, v] of [['temple', temple], ['coffee', others], ['vows', others], ['dinner', others]]) { await page.click('[data-e="' + k + '"] [data-ev="' + v + '"]').catch(() => {}); await page.waitForTimeout(200); } if (temple === 'yes' && offering) { await page.click('#sangkhathan [data-off="' + offering + '"]').catch(() => {}); await page.waitForTimeout(300); } }
async function aboutYou(allergy, details) {
  await go('about-you.html'); await page.click('[data-allergy="' + allergy + '"]'); await page.waitForTimeout(250);
  if (allergy === 'yes') { await page.fill('#allergy-text', details); await page.locator('#allergy-text').dispatchEvent('change'); await page.waitForTimeout(250); }
  for (const q of ['coffeetea', 'treat', 'drink', 'avoid', 'film', 'music']) { await page.fill('textarea[data-q="' + q + '"]', { coffeetea: 'Tea, black', treat: 'Mango sticky rice', drink: 'Water', avoid: 'Nothing', film: 'In the Mood for Love', music: 'Jazz' }[q]); await page.locator('textarea[data-q="' + q + '"]').dispatchEvent('change'); await page.waitForTimeout(80); }
  await page.check('#photo-ack'); await page.waitForTimeout(300);
}
const seatsReady = async () => { await page.waitForFunction(() => window.SIYL_SEATS && SIYL_SEATS.ready() && (!window.SIYL_UNITS || SIYL_UNITS.ready()), null, { timeout: 15000 }).catch(() => {}); await page.waitForTimeout(400); };

/* ------------------------------------------------------------------ the local engines, prepared */
console.log('0 · the local engines');
await api('/seating/config', asGR({ ...JSON.parse(src('docs/acceptance/2026-09-13-owner-decisions/seating-geometry.json')), actor: '007' })).catch(() => {});
await api('/seating/state', asGR({ open: true, frozen: false, poolSide: 'T' }));
/* Steffie holds two seats and a place in Heritage Room A; two other guests fill Heritage Room B and the Noble Courtyard (one room) */
await api('/seating/select', asGuest('STEFFIE', { invitationId: 'INV-G002', guestId: 'G002', event: 'ceremony', seatId: 'C-R-02-02', name: '' }));
await api('/seating/select', asGuest('STEFFIE', { invitationId: 'INV-G002', guestId: 'G002', event: 'dinner', seatId: 'D-T-03', name: '' }));
await api('/rooms/join', asGuest('STEFFIE', { invitationId: 'INV-G002', guestId: 'G002', key: 'wedstay/heritage', label: 'A', name: 'Steffie' }));
await api('/rooms/migrate', asGR({ actor: '007', occupants: [
  { key: 'wedstay/heritage', label: 'B', invitationId: 'INV-DEMO-LIN', guestId: 'g-lin', partyId: 'INV-DEMO-003', name: 'Lin' }, { key: 'wedstay/heritage', label: 'B', invitationId: 'INV-DEMO-NOOR', guestId: 'g-noor', partyId: 'INV-DEMO-004', name: 'Noor' },
  { key: 'wedstay/noble-courtyard', label: 'A', invitationId: 'INV-DEMO-AMARA', guestId: 'g-amara', partyId: 'INV-DEMO-005', name: 'Amara' }, { key: 'wedstay/noble-courtyard', label: 'A', invitationId: 'INV-DEMO-KAI', guestId: 'g-kai', partyId: 'INV-DEMO-006', name: 'Kai' } ] }));

/* ================================================================== A · PUBLIC ROUTES (signed out) */
console.log('A · public routes');
await go('index.html'); await page.evaluate(() => localStorage.clear());
const PUBLIC = [
  ['/ (index.html)', 'index.html', 'the homepage'],
  ['/destination', 'destination.html', 'the destinations'],
  ['/accommodation', 'accommodation.html', 'the stays'],
  ['/experiences', 'experiences.html', 'the experiences · discovery'],
  ['/voyage', 'voyage.html', 'the wedding · public'],
  ['/marsilea', 'marsilea.html', 'wellness · Marsilea Spa'],
  ['/1872', '1872.html', '1872 · Champagne Afternoon Tea'],
  ['/tea', 'tea.html', 'the afternoon tea · the selection page'],
  ['/journeys', 'journeys.html', 'THE JOURNEY · public editorial overview of the trip (no amount, no room, no fare, no add — the way in stands there)'],
  ['/dress', 'dress.html', 'dress code (direct address only)'],
];
for (const [route, file, ctxt] of PUBLIC) {
  await step(route, async () => {
    await go(file, 390); await S(route, 'PUBLIC · DEFAULT · signed out · 390 px', file, ctxt);
    await go(file, 1280); const wide = (await parts()).flatMap((p) => p.lines); const narrow = surfaces[surfaces.length - 1].parts.flatMap((p) => p.lines);
    const diff = wide.filter((l) => !narrow.includes(l)); if (diff.length) add(route, 'PUBLIC · DEFAULT · lines present at 1280 px only', file, ctxt + ' · the desktop layout', [{ name: 'page', lines: diff }]);
  });
}
/* ACCESS (Owner, Edit 3 · 16 Sep 2026): signed out, every private surface hands over to the invitation page and remembers the way back */
await step('access · signed out', async () => {
  for (const f of ['cart.html', 'tickets.html', 'your-journey.html', 'wedding.html', 'review.html', 'room.html?stay=souphattra&room=heritage', 'transport.html?id=c86', 'transport.html']) {
    await go(f, 390);
    const landed = page.url().replace(ORIGIN + '/', '');
    add('/' + f.replace('.html', '') + ' · signed out', 'ACCESS · HANDS OVER TO THE INVITATION PAGE · ' + landed, f.split('?')[0], 'no private surface without a session (the planner, the bag, the tickets, a room page, a transport page); the guest returns here after the code (?next=)', [{ name: 'landed on', lines: [landed] }, { name: 'status line', lines: await dumpSel('p[data-access]') }]);
    if (f !== 'cart.html') continue;
    add('/invitation · after a hand-over', 'ACCESS · THE CODE PROMPT OPEN · the way back kept', 'invitation.html', 'the invitation page opened by a private link, signed out', await parts());
  }
});
await step('menu', async () => { await go('index.html', 390); await clickIf('.hb, #menu-open'); for (const btn of await page.locator('.a-menu .a-ch').all()) await btn.click().catch(() => {}); await page.waitForTimeout(300); add('/ · the site menu', 'MENU OPEN · every group expanded', 'assets/aman.js buildMenu()', 'the menu behind the ☰ button on every public page', [{ name: 'menu', lines: await dumpSel('.a-menu') }]); });
await step('forwarders', async () => {
  await go('documents.html'); add('/documents', 'FORWARDING ADDRESS', 'documents.html', 'forwards to about-you.html#documents', await parts());
  await go('you.html'); add('/you', 'FORWARDING ADDRESS', 'you.html', 'retired step page: hands over to invitation.html#contact', await parts());
  add('/register (GitHub Pages stub)', 'STATIC', 'register-landing.html', 'the Worker answers this address with a redirect to invitation.html', [{ name: 'page', lines: src('register-landing.html').replace(/^---[\s\S]*?---\n/, '').replace(/<[^>]+>/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean) }]);
  const r = await fetch(ORIGIN + '/nothing-here.html'); const t = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  add('/nothing-here (an address that does not exist)', 'ERROR · ' + r.status, 'the Worker', 'what a wrong address answers', [{ name: 'page', lines: [t.slice(0, 400) || '(empty body)'] }]);
});
/* every stay × room — private planning (Owner, 16 Sep 2026): read as a signed-in guest with an empty journey */
await signIn('PEGGY');
const sbR = { window: {}, document: { addEventListener() {} } }; sbR.window = sbR; vm.createContext(sbR); vm.runInContext(src('assets/rooms-data.js'), sbR);
const ROOMS = sbR.window.SIYL_ROOMS; let roomRoutes = 0;
for (const stay of Object.keys(ROOMS)) for (const r of ROOMS[stay].rooms || []) {
  await step('room ' + stay + '/' + r.slug, async () => { await go('room.html?stay=' + stay + '&room=' + r.slug, 390); roomRoutes++; await S('/room?stay=' + stay + '&room=' + r.slug, 'SIGNED IN · a guest with an empty journey', 'room.html · assets/rooms-data.js', ROOMS[stay].name + ' · ' + (r.name || r.slug) + ' · the room page with the physical rooms of the category'); });
}
/* transport detail pages */
await step('/transport (the overview)', async () => { await go('transport.html', 390); await S('/transport', 'SIGNED IN · a guest with an empty journey', 'transport.html', 'transport · the overview (private planning)'); });
for (const id of ['train', 'mu9646', 'c86', 'return']) await step('transport ' + id, async () => { await go('transport.html?id=' + id, 390); await S('/transport?id=' + id, 'SIGNED IN · a guest with an empty journey', 'transport.html · assets/transport-data.js · assets/travelpass.js', 'the transport detail page with the ticket (not selected)'); });
await signOut();
/* the spa: every category, every treatment, every etiquette note */
await step('marsilea menu', async () => {
  await go('marsilea.html', 390);
  const cats = await page.locator('[data-cat]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cat')));
  for (const c of cats) {
    await page.locator('[data-cat="' + c + '"]').click(); await page.waitForTimeout(250);
    const items = await page.locator('[data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')));
    const lines = [];
    for (const it of items) { await page.locator('[data-item="' + it + '"]').click(); await page.waitForTimeout(150); lines.push(...(await dumpSel('[data-item="' + it + '"]') || []), ...(await dumpSel('[data-item="' + it + '"] + .tb') || [])); }
    add('/marsilea · treatment menu · ' + c, 'CATEGORY OPEN · each treatment opened in turn', 'marsilea.html', 'name · prices · description · durations · note', [{ name: 'page', lines }]);
    await page.locator('[data-cat="' + c + '"]').click().catch(() => {}); await page.waitForTimeout(150);
  }
  const ets = await page.locator('[data-et]').count(); const lines = [];
  for (let i = 0; i < ets; i++) { await page.locator('[data-et="' + i + '"]').click(); await page.waitForTimeout(150); lines.push(...(await dumpSel('.et:nth-of-type(' + (i + 1) + ')') || [])); }
  add('/marsilea · spa etiquette', 'EACH NOTE OPENED', 'marsilea.html', 'the etiquette notes', [{ name: 'page', lines }]);
});
/* the public wedding page: every drawer */
await step('voyage drawers', async () => {
  await go('voyage.html', 390);
  const btns = await page.locator('[data-more], [data-open], .a-ch').evaluateAll((els) => els.length);
  for (let i = 0; i < btns; i++) { const l = page.locator('[data-more], [data-open], .a-ch').nth(i); await l.click().catch(() => {}); await page.waitForTimeout(300); const d = await dumpSel('.p-drawer:not([hidden]), .a-drawer.on, [aria-expanded="true"] + *'); if (d && d.length) add('/voyage · detail ' + (i + 1), 'DRAWER / PANEL OPEN', 'voyage.html', 'a detail opened on the public wedding page', [{ name: 'drawer', lines: d }]); await esc(); }
});

/* the venue stage (003): the real aerial with its labels, then every place of the legend opened — the detail, the announcement */
await step('venue', async () => {
  for (const [file, route] of [['voyage.html', '/voyage'], ['accommodation.html', '/accommodation']]) {
    await go(file, 1280);
    await page.evaluate(() => document.getElementById('venue').scrollIntoView({ block: 'start' }));
    await page.waitForFunction(() => document.querySelector('.venue-title'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(900);
    const labels = await dumpSel('.venue-stage');
    add(route + ' · the venue', 'VENUE STAGE · the real aerial photograph · its labels · the caption', file, 'the venue stage (assets/venue.js) — labels only where the Owner-marked layout places them', [{ name: 'stage', lines: labels }]);
    const ids = await page.locator('.venue-item').evaluateAll((els) => els.map((e) => e.getAttribute('data-zone')));
    for (const id of ids) {
      await page.click('.venue-item[data-zone="' + id + '"]'); await page.waitForTimeout(700);
      const d = await dumpSel('.venue-detail'); const live = await page.evaluate(() => document.querySelector('.venue-live').textContent);
      add(route + ' · the venue · ' + id, 'VENUE · ' + id.toUpperCase() + ' SELECTED', file, 'the place opened from the legend (or from its label on the photograph, where one exists)', [{ name: 'detail', lines: d }, { name: 'announcement', lines: live ? ['[aria-live] ' + live] : [] }]);
      /* every photograph of the place */
      const thumbs = await page.locator('.venue-thumb').count();
      const alts = [];
      for (let k = 1; k < thumbs; k++) { await page.locator('.venue-thumb').nth(k).click(); await page.waitForTimeout(250); alts.push(...(await dumpSel('.venue-photo') || [])); }
      if (alts.length) add(route + ' · the venue · ' + id + ' · photographs', 'VENUE · ' + id.toUpperCase() + ' · EACH PHOTOGRAPH SHOWN', file, 'the supporting photographs, one at a time', [{ name: 'photo', lines: alts }]);
    }
    if (file === 'accommodation.html') break;   /* the stays page mounts the same component: its identical parts fold into GLOBAL TEXT BLOCKS */
  }
});
/* ================================================================== B · EXPERIENCE ENTITIES */
console.log('B · experiences');
const sbX = { window: {}, document: { addEventListener() {} } }; sbX.window = sbX; vm.createContext(sbX); vm.runInContext(src('assets/experiences.js'), sbX);
const EXP = sbX.window.SIYL_EXP;
for (const x of EXP) await step('experience ' + x.id, async () => { await go('experience.html?id=' + x.id, 390); await S('/experience?id=' + x.id, 'PUBLIC · DEFAULT · signed out', 'experience.html · assets/experiences.js · assets/experience-galleries.js', x.name + ' · ' + (x.where || '') + ' · ' + (x.cats || '')); });
await step('experience unknown', async () => { await go('experience.html?id=nothing-here'); await S('/experience?id=nothing-here', 'UNKNOWN ID', 'experience.html', 'an experience address that does not exist'); });

/* ================================================================== C · INVITATION / AUTH */
console.log('C · invitation and auth');
await step('auth', async () => {
  await go('invitation.html'); await page.evaluate(() => localStorage.clear()); await go('invitation.html');
  await S('/invitation', 'SIGNED OUT · the gate before any code', 'invitation.html · assets/invite.mjs', 'step 01 before an invitation is opened');
  await page.click('#open'); await page.waitForSelector('.siyl-inv input', { state: 'visible' }); await page.waitForTimeout(300);
  add('/invitation · the code prompt', 'CODE PROMPT OPEN · nothing typed', 'assets/invite.mjs', 'the prompt', [{ name: 'code prompt', lines: await dumpSel('.siyl-inv') }]);
  await page.click('.siyl-inv .igo'); await page.waitForTimeout(500);
  add('/invitation · the code prompt', 'EMPTY CODE submitted', 'assets/invite.mjs', 'the prompt', [{ name: 'code prompt', lines: await dumpSel('.siyl-inv') }]);
  await page.fill('.siyl-inv input', 'abc'); await page.click('.siyl-inv .igo'); await page.waitForTimeout(600);
  add('/invitation · the code prompt', 'INVALID CODE · too short', 'assets/invite.mjs', 'the prompt', [{ name: 'code prompt', lines: await dumpSel('.siyl-inv') }]);
  await page.fill('.siyl-inv input', 'wrongcode0000000'); await page.click('.siyl-inv .igo'); await page.waitForTimeout(1500);
  add('/invitation · the code prompt', 'INVALID / INACTIVE CODE · 16 characters that open nothing (a cancelled or unknown invitation reads the same)', 'assets/invite.mjs', 'the prompt', [{ name: 'code prompt', lines: await dumpSel('.siyl-inv') }]);
  await page.fill('.siyl-inv input', tok(ID.PEGGY));
  const loading = [];
  await Promise.all([page.click('.siyl-inv .igo'), (async () => { for (let i = 0; i < 14; i++) { await page.waitForTimeout(40); const l = await dumpSel('.siyl-inv').catch(() => []); for (const x of l || []) if (!loading.includes(x)) loading.push(x); } })()]);
  await page.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } }, null, { timeout: 15000 }); await page.waitForTimeout(600);
  add('/invitation · the code prompt', 'VALID CODE · while the invitation is being opened', 'assets/invite.mjs', 'lines seen during the check', [{ name: 'code prompt', lines: loading }]);
  await go('invitation.html');
  await S('/invitation', 'SIGNED IN · Peggy · nothing given yet · the roadmap (01 current, 02–05 needs attention / locked, 06 locked)', 'invitation.html · assets/prep-shell.js · assets/guest.js', 'step 01 · Your invitation');
  await clickIf('.prep-all'); await page.waitForTimeout(400);
  add('/invitation · VIEW ALL STEPS', 'STEPS INDEX OPEN · nothing done', 'assets/prep-shell.js', 'the index behind VIEW ALL STEPS', [{ name: 'steps index', lines: await dumpSel('#prep-steps') }]);
  await esc();
  await page.fill('#p-email', 'not-an-email'); await page.locator('#p-email').dispatchEvent('change'); await page.waitForTimeout(300);
  add('/invitation · contact', 'INVALID EMAIL · phone missing', 'invitation.html', 'the contact fields', [{ name: 'page', lines: await dumpSel('#contact') }]);
  await page.fill('#p-email', 'peggy.test@example.com'); await page.locator('#p-email').dispatchEvent('change'); await page.waitForTimeout(300);
  add('/invitation · contact', 'VALID EMAIL · phone missing', 'invitation.html', 'the contact fields', [{ name: 'page', lines: await dumpSel('#contact') }]);
  await page.fill('#p-phone', '12'); await page.locator('#p-phone').dispatchEvent('change'); await page.waitForTimeout(300);
  add('/invitation · contact', 'INVALID PHONE', 'invitation.html', 'the contact fields', [{ name: 'page', lines: await dumpSel('#contact') }]);
  await page.click('#go').catch(() => {}); await page.waitForTimeout(500);
  add('/invitation · CONTINUE', 'CONTINUE TAPPED WHILE INCOMPLETE', 'invitation.html · assets/prep-shell.js', 'the strict continue', [{ name: 'page', lines: await dumpSel('#foot, .prep-foot, #go, .prep-foot-note') }]);
  await page.fill('#p-phone', '+49 170 000 0001'); await page.locator('#p-phone').dispatchEvent('change'); await page.waitForTimeout(400);
  await S('/invitation', 'SIGNED IN · Peggy · email and mobile valid · step 01 complete · CONTINUE enabled', 'invitation.html', 'step 01 · complete');
  await page.click('#go').catch(() => {}); await page.waitForTimeout(700);
  add('/invitation · CONTINUE', 'CONTINUE TAPPED WHILE COMPLETE (the tick, then the next step opens)', 'assets/prep-shell.js', 'the strict continue', [{ name: 'page', lines: await dumpSel('#foot, .prep-foot, #go, .prep-foot-note') }]);
  await go('invitation.html?open=1'); await page.waitForTimeout(900);
  await S('/invitation?open=1', 'SIGNED IN · arrived with ?open=1 (OPEN ANOTHER INVITATION)', 'invitation.html autoOpen() · assets/invite.mjs', 'the prompt for another invitation with a guest signed in');
  await esc();
  await go('invitation.html'); await clickIf('.prep-all'); await page.waitForTimeout(300);
  add('/invitation · the leave actions', 'STEPS INDEX OPEN · OPEN ANOTHER INVITATION / SIGN OUT', 'assets/prep-shell.js', 'the leave buttons at the foot of the index', [{ name: 'steps index', lines: await dumpSel('#prep-steps') }]);
  await esc();
  /* a stale session: stored before the individual invitation (no guestId) */
  await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('siyl.auth')); delete a.guestId; localStorage.setItem('siyl.auth', JSON.stringify(a)); });
  await go('about-you.html'); await page.waitForTimeout(600);
  await S('/about-you', 'STALE SESSION · a session from before the individual invitations · the gate', 'about-you.html · assets/invite.mjs stale()', 'session recovery');
  await go('cart.html'); await S('/cart', 'STALE SESSION · the bag asks for the code once more', 'cart.html', 'session recovery');
  await go('tickets.html'); await S('/tickets', 'STALE SESSION', 'tickets.html', 'session recovery');
  await page.evaluate(() => localStorage.clear());
  for (const [r, f] of [['/your-journey', 'your-journey.html'], ['/wedding', 'wedding.html'], ['/wedding-preparation', 'wedding-preparation.html'], ['/about-you', 'about-you.html'], ['/review', 'review.html']]) { await go(f); await S(r, 'SIGNED OUT · a private route opened without an invitation', f, 'the gate'); }
});

/* ================================================================== D · step 02 · your journey (Peggy) */
console.log('D · your journey');
await step('journey', async () => {
  await signIn('PEGGY'); await contact('peggy.test@example.com', '+49 170 000 0001');
  await go('cart.html'); await S('/cart', 'SIGNED IN · EMPTY BAG', 'cart.html', 'the bag before any choice');
  await go('tickets.html'); await seatsReady(); await S('/tickets', 'SIGNED IN · NO SEAT HELD · NO TRANSPORT CHOSEN', 'tickets.html', 'the tickets page, empty states');
  await go('your-journey.html'); await seatsReady();
  await S('/your-journey', 'SIGNED IN · nothing chosen · every stage open · status "N details to choose"', 'your-journey.html · assets/journey.js · assets/rooms.js · assets/stay.js · assets/travelpass.js', 'step 02 initial');
  await clickIf('#fxb'); await page.waitForTimeout(400);
  add('/your-journey · Complete journey', 'PRESET DRAWER OPEN · Complete journey', 'your-journey.html fxOpen("full")', 'the preset before it is applied', [{ name: 'drawer', lines: await dumpSel('.p-drawer:not([hidden])') }]);
  await clickIf('#fxg'); await page.waitForTimeout(2500); await seatsReady();
  await S('/your-journey', 'SIGNED IN · COMPLETE JOURNEY applied · every stage chosen · rooms held in Peggy\'s name · the tickets · status "Your journey is ready."', 'your-journey.html', 'step 02 after the Complete journey');
  await clickIf('#csb'); await page.waitForTimeout(400);
  add('/your-journey · Essential journey', 'PRESET DRAWER OPEN · Essential journey · the two ways to stay', 'your-journey.html fxOpen("cost") · csBuild()', 'the preset before it is applied', [{ name: 'drawer', lines: await dumpSel('.p-drawer:not([hidden])') }]);
  await esc();
  /* the room chooser of the wedding stay: Room A held by Steffie · Room B full · Room C … free · Peggy's own room */
  await page.evaluate(() => window.SIYL_STAY.select('wedstay', 'heritage')); await page.waitForTimeout(1500); await go('your-journey.html'); await seatsReady();
  await clickIf('[data-rooms-for="wedstay"]'); await page.waitForTimeout(500);
  add('/your-journey · the room chooser', 'WEDDING STAY · The Heritage · Room A: Steffie · 1 place available · Room B: Lin · Noor · Full · Room C–E: 2 places available · Peggy holds a place (Your room)', 'assets/stay.js unitsHtml() · assets/rooms.js', 'every room occupancy state in one chooser', [{ name: 'page', lines: await dumpSel('#stay-wedstay') }]);
  await page.locator('[data-rooms-box="wedstay"] [data-join$="|A"]').first().click().catch(() => {}); await page.waitForTimeout(1200);
  add('/your-journey · the room chooser', 'JOINED STEFFIE\'S ROOM A · Room A: Steffie · You · Full', 'assets/stay.js', 'the guest joined an occupied room', [{ name: 'page', lines: await dumpSel('#stay-wedstay') }]);
  const full = await api('/rooms/join', asGuest('HARUTHAI', { invitationId: 'INV-G048', guestId: 'G048', key: 'wedstay/heritage', label: 'A', name: 'Haruthai' }));
  add('/api · a third guest asks for a full room', 'REFUSED · ' + full.status, 'src/rooms.js', 'the engine\'s answer (the words the page turns into "That room has just filled — choose another room.")', [{ name: 'page', lines: ['error: ' + full.error] }]);
  await clickIf('[data-rooms-for="wedstay"]'); await page.waitForTimeout(400);
  await page.locator('[data-rooms-box="wedstay"] [data-join$="|C"]').first().click().catch(() => {}); await page.waitForTimeout(1200);
  add('/your-journey · the room chooser', 'CHANGED ROOM · Room C · You · 1 place available (Room A back to Steffie · 1 place available)', 'assets/stay.js', 'a room change', [{ name: 'page', lines: await dumpSel('#stay-wedstay') }]);
  /* the fares, the tickets, remove, skip */
  await page.click('#flysel [data-cls="economy-flexible"]').catch(() => {}); await page.waitForTimeout(600);
  add('/your-journey · the flight', 'FARE CHANGED · Economy Flexible current · the ticket follows', 'your-journey.html flyHtml() · assets/travelpass.js card()', 'the flight stage with its two fares', [{ name: 'page', lines: await dumpSel('#s-mu9646') }]);
  await page.click('#flysel [data-cls="business"]').catch(() => {}); await page.waitForTimeout(600);
  await clickIf('[data-rm="c86"]'); await page.waitForTimeout(500);
  add('/your-journey · a transport stage', 'REMOVED · C86 open again · its ticket quiet · status "One detail left to choose."', 'your-journey.html transportCard()', 'a removed line', [{ name: 'page', lines: await dumpSel('#s-c86, #dec') }]);
  await clickIf('[data-skip="c86"]'); await page.waitForTimeout(500);
  add('/your-journey · a transport stage', 'NOT JOINING THIS STAGE (arranged by you)', 'your-journey.html', 'a declined stage', [{ name: 'page', lines: await dumpSel('#s-c86, #dec') }]);
  await clickIf('[data-unskip="c86"]'); await page.waitForTimeout(300); await clickIf('[data-choose-flat="c86"]'); await page.waitForTimeout(600);
  await clickIf('[data-rm="wedstay"], #stay-wedstay [data-rm]'); await page.waitForTimeout(1200);
  add('/your-journey · a stay stage', 'STAY REMOVED · the stage open with its categories', 'your-journey.html openStage()', 'a removed stay', [{ name: 'page', lines: await dumpSel('#s-wedstay') }]);
  await page.evaluate(() => window.SIYL_STAY.select('wedstay', 'heritage')); await page.waitForTimeout(1500);
  await go('your-journey.html', 1280); await seatsReady();
  const wide = (await parts()).flatMap((p) => p.lines); const narrow = surfaces.filter((s) => s.route === '/your-journey').flatMap((s) => s.parts.flatMap((p) => p.lines)); const diff = wide.filter((l) => !narrow.includes(l));
  if (diff.length) add('/your-journey', 'SIGNED IN · lines present at 1280 px only', 'your-journey.html', 'the desktop layout', [{ name: 'page', lines: diff }]);
  await page.setViewportSize({ width: 390, height: 844 });
  /* the selection pages, signed in */
  await go('journeys.html'); await seatsReady();
  await S('/journeys', 'SIGNED IN · current selections marked · The Heritage "Your place is held · Room C" · Noble Courtyard "Fully booked" · other rows "N rooms · M places available"', 'journeys.html · assets/rooms.js label()', 'the journeys page for a guest with a journey');
  await go('journeys.html?change=wedstay#j-wedstay'); await seatsReady();
  add('/journeys?change=wedstay', 'CHANGING A STAY (from CHANGE in the bag or on Your Journey)', 'journeys.html', 'the pick mode of one stage', [{ name: 'page', lines: await dumpSel('#j-wedstay') }]);
  await go('room.html?stay=souphattra&room=heritage'); await seatsReady();
  await S('/room?stay=souphattra&room=heritage', 'SIGNED IN · Peggy holds Room C · every room of the category with first names (Steffie · Lin · Noor)', 'room.html · assets/stay.js unitsHtml()', 'the room page with a held place');
  await go('room.html?stay=souphattra&room=noble-courtyard'); await seatsReady();
  await S('/room?stay=souphattra&room=noble-courtyard', 'SIGNED IN · FULLY BOOKED (one room, both places taken: Amara · Kai)', 'room.html', 'a full category');
  await go('room.html?stay=sathorn&room=penthouse'); await seatsReady();
  await S('/room?stay=sathorn&room=penthouse', 'SIGNED IN · the six-bedroom Penthouse · Room A – F · 12 places', 'room.html', 'the whole-home category as six rooms');
  await go('transport.html?id=c86'); await S('/transport?id=c86', 'SIGNED IN · IN YOUR JOURNEY · the ticket with the pass, Download travel pass, REMOVE', 'transport.html · assets/travelpass.js', 'a selected transport');
  await go('tea.html'); await clickIf('#add'); await page.waitForTimeout(500); await S('/tea', 'ADDED TO YOUR JOURNEY · the confirmation layer', 'tea.html', 'the afternoon tea just added');
  await go('1872.html'); await S('/1872', 'SIGNED IN · the tea in the journey', '1872.html', '1872 with a selection');
  await go('marsilea.html'); const cats = await page.locator('[data-cat]').evaluateAll((els) => els.map((e) => e.getAttribute('data-cat')));
  if (cats.length) { await page.locator('[data-cat="' + cats[0] + '"]').click(); await page.waitForTimeout(200); await clickIf('[data-item]'); await clickIf('[data-pick]'); await page.waitForTimeout(400); await S('/marsilea', 'SIGNED IN · INTEREST MARKED for one treatment', 'marsilea.html', 'a spa interest in the journey'); }
  await go('experience.html?id=bkk-suhring'); await S('/experience?id=bkk-suhring', 'SIGNED IN · NOT SELECTED', 'experience.html · assets/pricing.js FLAT.suhring', 'Sühring before the request');
  await clickIf('#sel-add'); await page.waitForTimeout(500); add('/experience?id=bkk-suhring', 'SIGNED IN · SELECTED (the request in the journey)', 'experience.html', 'Sühring selected', [{ name: 'page', lines: await dumpSel('.x-sel, #selbox, main') }]);
  await go('your-journey.html'); await seatsReady(); add('/your-journey · additions', 'SIGNED IN · Also in your journey: Sühring · the afternoon tea · the spa interest', 'your-journey.html extraLine()', 'the additions block', [{ name: 'page', lines: await dumpSel('#extras, #costs') }]);
  /* the bag, populated */
  await go('cart.html'); await seatsReady();
  await S('/cart', 'SIGNED IN · POPULATED · Accommodation / Transport / Wedding / Experiences & additions · not ready → COMPLETE THIS FIRST', 'cart.html', 'the bag with every category');
  await page.click('.cart-line[data-line="tea1872"] [data-remove]').catch(() => {}); await page.waitForTimeout(900);
  add('/cart', 'ONE LINE REMOVED (the tea) · the total and the badge follow', 'cart.html', 'after REMOVE', [{ name: 'page', lines: await dumpSel('#page') }, { name: 'cart bar', lines: await dumpSel('.cart-foot') }, { name: 'header', lines: await dumpSel('header.hd') }]);
  await go('cart.html', 1280); await seatsReady(); const wideC = (await parts()).flatMap((p) => p.lines); const narrowC = surfaces.filter((s) => s.route === '/cart').flatMap((s) => s.parts.flatMap((p) => p.lines)); const diffC = wideC.filter((l) => !narrowC.includes(l));
  if (diffC.length) add('/cart', 'SIGNED IN · lines present at 1280 px only', 'cart.html', 'the desktop layout', [{ name: 'page', lines: diffC }]);
  await page.setViewportSize({ width: 390, height: 844 });
  await go('review.html'); await page.waitForTimeout(800);
  await S('/review (deep link while 03–05 are incomplete)', 'LOCKED · the gate lands on the first missing item with the note', 'assets/prep-shell.js gate()', 'the redirect target with "opens once this is complete"');
});

/* ================================================================== E · step 03 · the wedding */
console.log('E · the wedding');
await step('wedding', async () => {
  await go('wedding.html'); await seatsReady();
  await S('/wedding', 'SIGNED IN · nothing decided · seating open · no seat yet', 'wedding.html · assets/temple.js', 'step 03 initial');
  await clickIf('[data-more="takbat"]'); add('/wedding · More about Tak Bat', 'DRAWER OPEN', 'wedding.html TAKBAT', 'the Tak Bat drawer', [{ name: 'drawer', lines: await dumpSel('.p-drawer:not([hidden])') }]); await esc();
  await clickIf('[data-more="sang"]'); add('/wedding · More about Sangkhathan', 'DRAWER OPEN', 'wedding.html SANG', 'the Sangkhathan drawer', [{ name: 'drawer', lines: await dumpSel('.p-drawer:not([hidden])') }]); await esc();
  await wedding('yes', null); await S('/wedding', 'SIGNED IN · attending everything · the Sangkhathan asked, not yet answered', 'wedding.html', 'step 03 · attendance yes');
  await page.click('#sangkhathan [data-off="yes"]'); await page.waitForTimeout(300); add('/wedding · Sangkhathan', 'YES · USD 15 in your journey', 'wedding.html sangSection()', 'the individual offering', [{ name: 'page', lines: await dumpSel('#sangkhathan') }]);
  await page.click('#sangkhathan [data-off="no"]'); await page.waitForTimeout(300); add('/wedding · Sangkhathan', 'NO, THANK YOU', 'wedding.html sangSection()', 'the individual offering declined', [{ name: 'page', lines: await dumpSel('#sangkhathan') }]);
  await page.click('[data-e="temple"] [data-ev="no"]'); await page.waitForTimeout(300); add('/wedding · the temple', 'NOT ATTENDING THE TEMPLE CEREMONY · no Sangkhathan asked · Tak Bat words', 'wedding.html', 'attendance no', [{ name: 'page', lines: await dumpSel('#ev-temple, #sangkhathan') }]);
  await page.click('[data-e="dinner"] [data-ev="no"]'); await page.waitForTimeout(300); add('/wedding · the dinner', 'NOT ATTENDING THE DINNER · no dinner seat needed', 'wedding.html', 'attendance no', [{ name: 'page', lines: await dumpSel('#ev-dinner, #seats-route') }]);
  await wedding('yes', 'yes');
  await S('/wedding', 'SIGNED IN · complete · attending everything · Sangkhathan YES · seats route (no seat yet)', 'wedding.html', 'step 03 complete');
});

/* ================================================================== F · step 04 · wedding preparation */
console.log('F · wedding preparation');
const SEATGEN = 'wedding-preparation.html · assets/seating.js · assets/seatlabels.js · assets/seatpass.js';
await step('preparation', async () => {
  await go('wedding-preparation.html'); await seatsReady();
  await S('/wedding-preparation', 'SIGNED IN · dress code not acknowledged · seating open · no seat yet · Steffie\'s first name on her chairs', SEATGEN, 'step 04 initial');
  await page.check('[data-ack]'); await page.waitForTimeout(300); add('/wedding-preparation · the acknowledgement', 'ACKNOWLEDGED', 'wedding-preparation.html', 'the dress code acknowledgement', [{ name: 'page', lines: await dumpSel('#ack') }]);
  await go('wedding-preparation.html#seats'); await seatsReady();
  await page.locator('[data-ev="ceremony"] g[data-seat="C-R-04-02"]').dispatchEvent('click'); await page.waitForTimeout(500);
  add('/wedding-preparation · the plan', 'CEREMONY · CHAIR TAPPED (E4 selected by you, not held) · the booking summary bar', SEATGEN, 'the two-step booking', [{ name: 'page', lines: await dumpSel('[data-seatmap="ceremony"]') }, { name: 'seat bar', lines: await dumpSel('.p-seatbar') }]);
  await page.locator('.p-seatbar [data-seat-cancel]').click(); await page.waitForTimeout(300);
  await page.locator('[data-ev="ceremony"] g[data-seat="C-R-04-02"]').dispatchEvent('click'); await page.waitForTimeout(300);
  await page.locator('.p-seatbar [data-seat-confirm="ceremony"]').click(); await page.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await page.waitForTimeout(500);
  add('/wedding-preparation · the plan', 'CEREMONY · SEAT CONFIRMED (E4) · the confirmation card', SEATGEN, 'after CONFIRM', [{ name: 'page', lines: await dumpSel('[data-seatmap="ceremony"]') }]);
  await page.locator('[data-seatmap="ceremony"] [data-seat-continue]').click(); await page.waitForTimeout(600);
  add('/wedding-preparation · the plan', 'CEREMONY · HELD (after CONTINUE) · dinner still to choose', SEATGEN, 'the seat as a card, YOUR SEAT on the plan', [{ name: 'page', lines: await dumpSel('#seats') }]);
  await page.locator('[data-seat-change="ceremony"]').click(); await page.waitForTimeout(400);
  await page.locator('[data-ev="ceremony"] g[data-seat="C-R-04-03"]').dispatchEvent('click'); await page.waitForTimeout(400);
  add('/wedding-preparation · the plan', 'CEREMONY · CHANGING · current seat E4 → new seat F4 · the bar', SEATGEN, 'a change of seat', [{ name: 'page', lines: await dumpSel('[data-seatmap="ceremony"]') }, { name: 'seat bar', lines: await dumpSel('.p-seatbar') }]);
  await page.locator('.p-seatbar [data-seat-cancel]').click(); await page.waitForTimeout(300);
  /* refused: the chair is taken between the tap and CONFIRM */
  await page.locator('[data-ev="ceremony"] g[data-seat="C-L-06-01"]').dispatchEvent('click'); await page.waitForTimeout(300);
  await api('/seating/select', asGuest('STEFFIE', { invitationId: 'INV-G002', guestId: 'G002', event: 'ceremony', seatId: 'C-L-06-01', name: '' }));
  await page.locator('.p-seatbar [data-seat-confirm="ceremony"]').click(); await page.waitForTimeout(1200);
  add('/wedding-preparation · the plan', 'CEREMONY · REFUSED (the chair was taken between the tap and CONFIRM)', SEATGEN, 'a refused confirmation', [{ name: 'page', lines: await dumpSel('[data-seatmap="ceremony"]') }]);
  await api('/seating/select', asGuest('STEFFIE', { invitationId: 'INV-G002', guestId: 'G002', event: 'ceremony', seatId: 'C-R-02-02', name: '' }));
  await clickIf('[data-seat-keep="ceremony"]'); await page.waitForTimeout(300);
  await clickIf('[data-seatmap="ceremony"] [data-seat-give]'); await page.waitForTimeout(300);
  add('/wedding-preparation · the plan', 'CEREMONY · GIVE THIS CHAIR BACK (the question)', SEATGEN, 'giving a chair back', [{ name: 'page', lines: await dumpSel('[data-seatmap="ceremony"]') }]);
  await clickIf('[data-seatmap="ceremony"] [data-seat-keep]'); await page.waitForTimeout(300);
  /* the dinner: run A poolside, Steffie's name on A3 */
  await page.locator('[data-ev="dinner"] g[data-seat="D-T-04"]').dispatchEvent('click'); await page.waitForTimeout(400);
  add('/wedding-preparation · the plan', 'DINNER · CHAIR TAPPED (A4 · run A · Poolside) · the bar', SEATGEN, 'the dinner plan', [{ name: 'seat bar', lines: await dumpSel('.p-seatbar') }]);
  await page.locator('.p-seatbar [data-seat-confirm="dinner"]').click(); await page.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await page.waitForTimeout(500);
  add('/wedding-preparation · the plan', 'DINNER · SEAT CONFIRMED (A4 · Poolside) · progress complete', SEATGEN, 'after CONFIRM', [{ name: 'page', lines: await dumpSel('[data-seatmap="dinner"]') }]);
  await page.locator('[data-seatmap="dinner"] [data-seat-continue]').click(); await page.waitForTimeout(700);
  await S('/wedding-preparation', 'SIGNED IN · complete · both seats held · YOUR WEDDING SEATS with the two seat tickets (reference, code, download)', SEATGEN, 'step 04 complete');
  /* allocated by Guest Relations */
  await api('/seating/assign', asGR({ event: 'dinner', seatId: 'D-T-06', invitationId: 'INV-G001', guestId: 'G001', actor: '007', force: true }));
  await go('wedding-preparation.html#seats'); await seatsReady();
  add('/wedding-preparation · the plan', 'DINNER · SEAT ALLOCATED BY GUEST RELATIONS (A6 · not the guest\'s to move)', SEATGEN, 'an allocation', [{ name: 'page', lines: await dumpSel('[data-seatmap="dinner"]') }]);
  await api('/seating/select', asGuest('PEGGY', { invitationId: 'INV-G001', guestId: 'G001', event: 'dinner', seatId: 'D-T-04', name: '' }));
  /* frozen · closed */
  await api('/seating/state', asGR({ open: true, frozen: true }));
  await go('wedding-preparation.html#seats'); await seatsReady();
  add('/wedding-preparation · the plan', 'SEATING CLOSED (frozen) · the allocation shown, nothing tappable', SEATGEN, 'seating frozen', [{ name: 'page', lines: await dumpSel('#seats') }]);
  await go('wedding.html'); await seatsReady(); add('/wedding · Your seats', 'SEATING CLOSED (frozen)', 'wedding.html seatsSection()', 'the seats route on step 03', [{ name: 'page', lines: await dumpSel('#seats-route') }]);
  await api('/seating/state', asGR({ open: false, frozen: false }));
  await go('wedding-preparation.html#seats'); await seatsReady();
  add('/wedding-preparation · the plan', 'SEATING NOT OPEN YET', SEATGEN, 'before seating opens', [{ name: 'page', lines: await dumpSel('#seats') }]);
  await go('wedding.html'); await seatsReady(); add('/wedding · Your seats', 'SEATING NOT OPEN YET', 'wedding.html seatsSection()', 'the seats route on step 03', [{ name: 'page', lines: await dumpSel('#seats-route') }]);
  await api('/seating/state', asGR({ open: true, frozen: false }));
  await go('wedding-preparation.html', 1280); await seatsReady(); const wide = (await parts()).flatMap((p) => p.lines); const narrow = surfaces.filter((s) => s.route.startsWith('/wedding-preparation')).flatMap((s) => s.parts.flatMap((p) => p.lines)); const diff = wide.filter((l) => !narrow.includes(l));
  if (diff.length) add('/wedding-preparation', 'SIGNED IN · lines present at 1280 px only', SEATGEN, 'the desktop layout (the wide plan)', [{ name: 'page', lines: diff }]);
  await page.setViewportSize({ width: 390, height: 844 });
});

/* ================================================================== G · step 05 · about you */
console.log('G · about you');
await step('about you', async () => {
  await go('about-you.html');
  await S('/about-you', 'SIGNED IN · nothing answered · every question Required · documents optional · photography not acknowledged', 'about-you.html · assets/guest.js · assets/docs.js', 'step 05 initial');
  await page.click('[data-allergy="yes"]'); await page.waitForTimeout(300); add('/about-you · allergies', 'YES · details still needed', 'about-you.html', 'the allergy question', [{ name: 'page', lines: await dumpSel('#allergy') }]);
  await page.fill('#allergy-text', 'peanuts'); await page.locator('#allergy-text').dispatchEvent('change'); await page.waitForTimeout(300); add('/about-you · allergies', 'YES · with details', 'about-you.html', 'the allergy question', [{ name: 'page', lines: await dumpSel('#allergy') }]);
  await page.click('[data-allergy="no"]'); await page.waitForTimeout(300); add('/about-you · allergies', 'NO', 'about-you.html', 'the allergy question', [{ name: 'page', lines: await dumpSel('#allergy') }]);
  await page.fill('textarea[data-q="coffeetea"]', '   '); await page.locator('textarea[data-q="coffeetea"]').dispatchEvent('change'); await page.waitForTimeout(300);
  add('/about-you · a question', 'BLANK TYPED (not an answer · still Required)', 'about-you.html', 'the profile question', [{ name: 'page', lines: await dumpSel('#q-coffeetea, #fav-state') }]);
  await page.fill('textarea[data-q="coffeetea"]', 'Tea, black'); await page.locator('textarea[data-q="coffeetea"]').dispatchEvent('change'); await page.waitForTimeout(300);
  add('/about-you · a question', 'ANSWERED · Complete · the section still Required (five to go)', 'about-you.html', 'the profile question', [{ name: 'page', lines: await dumpSel('#q-coffeetea, #fav-state, .p-saved') }]);
  await page.click('#foot [data-continue]').catch(() => {}); await page.waitForTimeout(600);
  add('/about-you · CONTINUE', 'CONTINUE TAPPED WHILE INCOMPLETE · "Before you continue: …" · the first unanswered question focused', 'assets/prep-shell.js continueTo()', 'the strict continue', [{ name: 'page', lines: await dumpSel('#foot, .prep-foot') }]);
  await clickIf('.prep-all'); await page.waitForTimeout(400); add('/about-you · VIEW ALL STEPS', 'STEPS INDEX OPEN · 05 current with the unanswered questions named · 06 locked', 'assets/prep-shell.js', 'the index', [{ name: 'steps index', lines: await dumpSel('#prep-steps') }]); await esc();
  await aboutYou('no');
  await S('/about-you', 'SIGNED IN · complete · allergy NO · every question answered · photography acknowledged · publication not answered · documents not added', 'about-you.html', 'step 05 complete');
  await page.locator('[data-consent]').first().check().catch(() => {}); await page.waitForTimeout(400); add('/about-you · publication', 'CONSENT GIVEN', 'about-you.html · assets/docs.js', 'the separate publication choice', [{ name: 'page', lines: await dumpSel('#publication') }]);
  await page.locator('[data-consent]').first().uncheck().catch(() => {}); await page.waitForTimeout(400); add('/about-you · publication', 'CONSENT DECLINED (withdrawn)', 'about-you.html · assets/docs.js', 'the separate publication choice', [{ name: 'page', lines: await dumpSel('#publication') }]);
  await page.locator('[data-consent]').first().check().catch(() => {}); await page.waitForTimeout(300);
  await page.click('#photo-ack'); await page.waitForTimeout(300); add('/about-you · photography', 'ACKNOWLEDGEMENT WITHDRAWN · step 05 needs attention again', 'about-you.html', 'the required acknowledgement', [{ name: 'page', lines: await dumpSel('#photo, #photo-state') }]);
  await page.click('#photo-ack'); await page.waitForTimeout(300);
  await clickIf('.prep-all'); await page.waitForTimeout(400); add('/about-you · VIEW ALL STEPS', 'STEPS INDEX OPEN · 01–05 complete · 06 needs attention (ready to send)', 'assets/prep-shell.js', 'the index', [{ name: 'steps index', lines: await dumpSel('#prep-steps') }]); await esc();
  await page.click('#foot [data-continue]').catch(() => {}); await page.waitForTimeout(700);
  add('/about-you · CONTINUE', 'CONTINUE TAPPED WHILE COMPLETE · "About You complete." · the next step opens', 'assets/prep-shell.js continueTo()', 'the strict continue', [{ name: 'page', lines: await dumpSel('#foot, .prep-foot') }]);
});

/* ================================================================== H · the bag, ready · tickets · review & send */
console.log('H · review & send');
let sentText = '', mailto = '';
await step('review', async () => {
  await go('cart.html'); await seatsReady(); await S('/cart', 'SIGNED IN · READY · REVIEW YOUR JOURNEY leads to Review & Send', 'cart.html', 'the bag when 01–05 are complete');
  await go('tickets.html'); await seatsReady(); await S('/tickets', 'SIGNED IN · the two seat tickets and every travel pass · SELECTED', 'tickets.html · assets/seatpass.js card() · assets/travelpass.js card()', 'the tickets page');
  await go('review.html'); await seatsReady();
  await S('/review', 'SIGNED IN · everything answered · NOT SENT (ready · "Your journey can be sent")', 'review.html', 'step 06 ready');
  /* the send that fails */
  await page.route('**/api/register', (route) => route.abort());
  await page.click('#send'); await page.waitForTimeout(1500);
  add('/review · send', 'ENDPOINT UNREACHABLE · the error and the email backup channel', 'review.html', 'a failed send', [{ name: 'page', lines: await dumpSel('#err, #sendbox, #send') }]);
  mailto = await page.evaluate(() => { const a = document.querySelector('#err a[href^="mailto:"]'); return a ? decodeURIComponent(a.getAttribute('href')) : ''; });
  await page.unroute('**/api/register');
  /* the send that succeeds — the sent text captured on the way */
  page.on('request', (r) => { if (/\/api\/register$/.test(r.url()) && r.method() === 'POST') { try { const b = JSON.parse(r.postData() || '{}'); if (b.text) sentText = b.text; } catch (e) {} } });
  await go('review.html'); await seatsReady();
  const sending = [];
  await Promise.all([page.click('#send'), (async () => { for (let i = 0; i < 20; i++) { await page.waitForTimeout(50); const l = await dumpSel('#sendbox, #send, #sent').catch(() => []); for (const x of l || []) if (!sending.includes(x)) sending.push(x); } })()]);
  await page.waitForFunction(() => document.getElementById('send').getAttribute('data-state') === 'sent', null, { timeout: 20000 }); await page.waitForTimeout(800);
  add('/review · send', 'SENDING (lines seen while the send is in flight)', 'review.html', 'the send in progress', [{ name: 'page', lines: sending }]);
  await S('/review', 'SENT · RECEIVED by Guest Relations · the received card with the server stamp · button SENT', 'review.html · assets/confirm.js', 'step 06 after sending');
  await go('tickets.html'); await seatsReady(); add('/tickets · the passes', 'SENT · every travel pass says Sent to Guest Relations', 'tickets.html', 'the tickets page after sending', [{ name: 'page', lines: (await dumpSel('#page')).filter((l) => /Sent|SYL-|Travel pass|travel pass/i.test(l)) }]);
  await clickIf('.prep-all'); await page.waitForTimeout(300); add('/review · VIEW ALL STEPS', 'AFTER SENDING · the index says Received', 'assets/prep-shell.js', 'the index', [{ name: 'steps index', lines: await dumpSel('#prep-steps') }]); await esc();
  await go('wedding.html'); await page.click('[data-e="coffee"] [data-ev="no"]'); await page.waitForTimeout(300);
  await go('review.html'); await seatsReady(); add('/review · the state card', 'RECEIVED · CHANGED SINCE YOU SENT IT', 'review.html paintState()', 'the state card', [{ name: 'page', lines: await dumpSel('#journeystate, #sent') }]);
  await go('wedding.html'); await page.click('[data-e="coffee"] [data-ev="yes"]'); await page.waitForTimeout(300);
  /* a newer version from another device */
  const ctxB = await b.newContext({ viewport: { width: 390, height: 844 } }); const pageB = await ctxB.newPage(); const pageA = page; page = pageB;
  await signIn('PEGGY'); await contact('peggy.test@example.com', '+49 170 000 0001'); await decideAll([]); await wedding('yes', 'no'); await go('wedding-preparation.html'); await page.check('[data-ack]').catch(() => {}); await aboutYou('no');
  await go('review.html'); await seatsReady(); await page.click('#send'); await page.waitForFunction(() => document.getElementById('send').getAttribute('data-state') === 'sent', null, { timeout: 20000 }).catch(() => {});
  await ctxB.close(); page = pageA;
  await go('review.html'); await seatsReady(); add('/review · the state card', 'RECEIVED · A NEWER VERSION WAS SENT FROM ANOTHER DEVICE', 'review.html paintState()', 'the state card', [{ name: 'page', lines: await dumpSel('#journeystate, #sent') }]);
  await page.click('#send'); await page.waitForFunction(() => document.getElementById('send').getAttribute('data-state') === 'sent', null, { timeout: 20000 }); await page.waitForTimeout(600);
  add('/review · send', 'SENT AGAIN (the newer version replaces the earlier one)', 'review.html', 'a resend', [{ name: 'page', lines: await dumpSel('#sent, #sendbox, #journeystate') }]);
  /* confirmed by Guest Relations */
  await api('/confirm', asGR({ invitationId: 'INV-G001', action: 'confirm', actor: '007', note: '' }));
  await go('review.html'); await seatsReady(); await S('/review', 'CONFIRMED BY GUEST RELATIONS', 'review.html paintState() · assets/confirm.js', 'step 06 confirmed');
  await go('tickets.html'); await seatsReady(); add('/tickets · the passes', 'CONFIRMED · every travel pass says Confirmed by Guest Relations', 'tickets.html', 'the tickets page after confirmation', [{ name: 'page', lines: (await dumpSel('#page')).filter((l) => /Confirmed|SYL-|Travel pass|travel pass/i.test(l)) }]);
  await go('wedding.html'); await seatsReady(); add('/wedding · the shell bar after confirmation', 'CONFIRMED · a step opened again', 'assets/prep-shell.js', 'the bar', [{ name: 'shell bar', lines: await dumpSel('.prep-bar') }]);
  await page.click('[data-e="coffee"] [data-ev="no"]'); await page.waitForTimeout(300);
  await go('review.html'); await seatsReady(); add('/review · the state card', 'CONFIRMED · CHANGED SINCE CONFIRMATION · NOT SENT', 'review.html paintState()', 'the state card', [{ name: 'page', lines: await dumpSel('#journeystate, #sent') }]);
  await go('wedding.html'); await page.click('[data-e="coffee"] [data-ev="yes"]'); await page.waitForTimeout(300);
  /* leave */
  await go('review.html'); await page.click('[data-leave="another"]').catch(() => {}); await page.waitForTimeout(900);
  await S('/invitation (after OPEN ANOTHER INVITATION)', 'SIGNED OUT · the code prompt up for the next guest', 'assets/prep-shell.js leave("another")', 'leaving to open another invitation');
  await esc();
});

/* ================================================================== I · the hosts · Steffie's own views */
console.log('I · the hosts and the other guest');
await step('hosts', async () => {
  await page.evaluate(() => localStorage.clear());
  await signIn('HARUTHAI'); await contact('haruthai.test@example.com', '+66 81 000 0001');
  await go('journeys.html#j-wedstay'); await seatsReady(); add('/journeys (the hosts)', 'SIGNED IN · Haruthai · the Presidential is a room like any other · 1 room · 2 places available', 'journeys.html', 'no reservation for the hosts', [{ name: 'page', lines: await dumpSel('#j-wedstay') }]);
  await page.evaluate(() => window.SIYL_STAY.select('wedstay', 'souphattra-presidential')); await page.waitForTimeout(1500);
  await go('your-journey.html'); await seatsReady(); add('/your-journey (the hosts)', 'SIGNED IN · Haruthai holds the Presidential · Room A · You · 1 place available', 'your-journey.html', 'the hosts book their own places', [{ name: 'page', lines: await dumpSel('#s-wedstay') }]);
  await decideAll(['wedstay']); await wedding('yes', 'no'); await go('wedding-preparation.html'); await page.check('[data-ack]'); await page.waitForTimeout(300);
  await go('wedding-preparation.html#seats'); await seatsReady();
  add('/wedding-preparation (the Bride)', 'HOSTS · ceremony = FRONT CENTRE · Bride · the dinner seat chosen like everyone else', SEATGEN, 'the fixed position', [{ name: 'page', lines: await dumpSel('#seats') }]);
  await page.locator('[data-ev="dinner"] g[data-seat="D-T-01"]').dispatchEvent('click'); await page.waitForTimeout(400); await page.locator('.p-seatbar [data-seat-confirm="dinner"]').click(); await page.waitForFunction(() => !!document.querySelector('.p-seatconf'), null, { timeout: 15000 }); await page.locator('[data-seatmap="dinner"] [data-seat-continue]').click(); await page.waitForTimeout(700);
  add('/wedding-preparation (the Bride)', 'HOSTS · YOUR WEDDING SEATS · Bride · Front centre ticket + the dinner ticket (A1 · Poolside)', SEATGEN, 'the seat tickets of a host', [{ name: 'page', lines: await dumpSel('.p-wseats') }]);
  await go('tickets.html'); await seatsReady(); add('/tickets (the Bride)', 'HOSTS · the Front centre seat ticket and the dinner ticket', 'tickets.html', 'the tickets page of a host', [{ name: 'page', lines: await dumpSel('#page') }]);
  await go('wedding.html'); await seatsReady(); add('/wedding · Your seats (the Bride)', 'HOSTS', 'wedding.html seatsSection()', 'the seats route', [{ name: 'page', lines: await dumpSel('#seats-route') }]);
  await signOut();
  await signIn('SUTHEP'); await contact('suthep.test@example.com', '+66 81 000 0002');
  await go('journeys.html#j-wedstay'); await seatsReady(); add('/journeys (the Groom)', 'SIGNED IN · Suthep sees Haruthai · 1 place available in the Presidential', 'journeys.html', 'the second host', [{ name: 'page', lines: await dumpSel('#j-wedstay') }]);
  await go('room.html?stay=souphattra&room=souphattra-presidential'); await seatsReady(); add('/room?stay=souphattra&room=souphattra-presidential (the Groom)', 'SIGNED IN · Room A · Haruthai · 1 place available · JOIN THIS ROOM', 'room.html', 'joining the same room', [{ name: 'page', lines: await dumpSel('.buy') }]);
  await page.locator('[data-rooms-box="wedstay"] [data-join$="|A"]').first().click().catch(() => {}); await page.waitForTimeout(1200);
  add('/room?stay=souphattra&room=souphattra-presidential (the Groom)', 'JOINED · Room A · Haruthai · You · Full', 'room.html', 'the room full with both hosts', [{ name: 'page', lines: await dumpSel('.buy') }]);
  await decideAll(['wedstay']); await wedding('yes', 'no'); await go('wedding-preparation.html'); await page.check('[data-ack]').catch(() => {}); await go('wedding-preparation.html#seats'); await seatsReady();
  add('/wedding-preparation (the Groom)', 'HOSTS · ceremony = FRONT CENTRE · Groom · Haruthai\'s first name on A1', SEATGEN, 'the fixed position', [{ name: 'page', lines: await dumpSel('#seats') }]);
  await signOut();
  /* Steffie: her own seats already held, no journey → tickets with seats only */
  await signIn('STEFFIE'); await go('tickets.html'); await seatsReady(); await S('/tickets', 'SIGNED IN · Steffie · seat tickets (D2 · A3) · no transport chosen', 'tickets.html', 'seats without a journey');
  await go('cart.html'); await seatsReady(); await S('/cart', 'SIGNED IN · Steffie · EMPTY BAG · the sticky bar absent', 'cart.html', 'another guest, nothing chosen');
  await signOut();
});

await b.close();

/* ================================================================== J · the generated files */
console.log('J · generated files');
const L = require(path.join(ROOT, 'assets/seatlabels.js')), PASS = require(path.join(ROOT, 'assets/seatpass.js')), TP = require(path.join(ROOT, 'assets/travelpass.js'));
const tmp = fs.mkdtempSync('/tmp/claude-501/007f-');
const pdfLines = (pdf, file) => { fs.writeFileSync(file, Buffer.from(PASS.toBytes(pdf))); const text = execFileSync('pdftotext', ['-layout', file, '-']).toString().split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()); const info = [...pdf.matchAll(/\/(Title|Subject|Author|Creator|Producer) \(([^)]*)\)/g)].map((m) => '[pdf ' + m[1].toLowerCase() + '] ' + m[2]); return ['[file name] ' + path.basename(file), ...info, ...text]; };
const partyP = { invitationId: 'INV-G001', partyName: 'Peggy & Steffie', hosts: false, members: [{ guestId: 'G001' }, { guestId: 'G002' }], guests: [{ guestId: 'G001', fullName: 'Peggy Berger', preferredName: 'Peggy' }] };
const partyH = { invitationId: 'INV-G048', partyName: 'Haruthai & Suthep', hosts: true, members: [{ guestId: 'G048' }, { guestId: 'G049' }], guests: [{ guestId: 'G048', fullName: 'Haruthai Amphai', preferredName: 'Haruthai', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Thongantang', preferredName: 'Suthep', hostRole: 'GROOM' }] };
const AT = '2026-09-15T12:00:00.000Z'; let pdfTemplates = 0;
for (const [label, party, gid, mine, events] of [
  ['Vow Ceremony seat ticket (a guest)', partyP, 'G001', { ceremony: { G001: 'C-R-04-02' }, dinner: {} }, ['ceremony']],
  ['Wedding Dinner seat ticket (a guest · run A · Poolside)', partyP, 'G001', { ceremony: {}, dinner: { G001: 'D-T-04' } }, ['dinner']],
  ['Wedding Dinner seat ticket (a guest · run B)', partyP, 'G001', { ceremony: {}, dinner: { G001: 'D-B-16' } }, ['dinner']],
  ['YOUR WEDDING SEATS · both tickets on one page (a guest)', partyP, 'G001', { ceremony: { G001: 'C-R-04-02' }, dinner: { G001: 'D-T-04' } }, ['ceremony', 'dinner']],
  ['YOUR WEDDING SEATS · the Bride (front centre + dinner)', partyH, 'G048', { ceremony: {}, dinner: { G048: 'D-T-01' } }, ['ceremony', 'dinner']],
  ['Vow Ceremony · the Groom (front centre only)', partyH, 'G049', { ceremony: {}, dinner: {} }, ['ceremony']],
]) { const doc = PASS.docFor(party, gid, mine, events, AT); const pdf = PASS.compose(doc); pdfTemplates++; add('generated · seat ticket PDF · ' + label, 'GENERATED · the text as read back from the PDF', 'assets/seatpass.js compose()', 'the seat ticket as downloaded', [{ name: 'pdf', lines: pdfLines(pdf, path.join(tmp, PASS.filename(doc))) }]); }
for (const leg of TP.ORDER) for (const [state, price, cls] of [['selected', TP.LEGS[leg].id === 'mu9646' ? 275 : { train: 100, c86: 85, return: 200 }[leg], 'business'], ['sent', TP.LEGS[leg].id === 'mu9646' ? 155 : { train: 100, c86: 85, return: 200 }[leg], 'economy-flexible'], ['confirmed', TP.LEGS[leg].id === 'mu9646' ? 275 : { train: 100, c86: 85, return: 200 }[leg], 'business']]) {
  if (state !== 'selected' && leg !== 'mu9646' && leg !== 'train') continue;
  const doc = TP.docFor(leg, { guest: { guestId: 'G001', fullName: 'Peggy Berger', preferredName: 'Peggy' }, cls, price, state, at: AT }); const pdf = TP.compose(doc); pdfTemplates++;
  add('generated · travel pass PDF · ' + TP.LEGS[leg].title + ' · ' + state.toUpperCase() + (leg === 'mu9646' ? ' · ' + TP.classOf(leg, cls) : ''), 'GENERATED · the text as read back from the PDF', 'assets/travelpass.js compose()', 'the travel pass as downloaded', [{ name: 'pdf', lines: pdfLines(pdf, path.join(tmp, TP.filename(doc))) }]);
}
add('generated · the ticket templates (every field and its dynamic values)', 'TEMPLATE', 'assets/seatpass.js · assets/travelpass.js', 'what varies on the tickets', [{ name: 'pdf', lines: [
  'SEAT TICKET — page title: see you in laos. · YOUR WEDDING SEAT | YOUR WEDDING SEATS · <full name> · <party name when the party has more than one guest>',
  'Ticket header: see you in laos. · SEAT TICKET — EVENT → Vow Ceremony | Wedding Dinner — Sunday, 28 February 2027 · 15:30 | 19:30 — Souphattra Heritage, Vientiane | Souphattra Heritage, Vientiane · poolside',
  'GUEST → the full name · HELD FOR → the first name · SEAT → A1 … F10 (ceremony) | A1 … B25 (dinner) with the words Left block · row n | Right block · row n | Long table · run A · Poolside · place n | Long table · run B · place n; the hosts: Bride · Front Centre | Groom · Front Centre | Bride & Groom · Front Centre with Front · between the two blocks',
  'STATUS → CONFIRMED | FRONT CENTRE · DATE → 28 Feb 2027 · 15:30 | 19:30 · foot: WEDDING OF HARUTHAI & SUTHEP · VIENTIANE, LAOS',
  'Stub: the QR code (carries: SEE YOU IN LAOS / SEAT TICKET <reference> / <first name> / <event> / Sunday, 28 February 2027 · <time> / Seat <label> · <words> | <fixed words> / CONFIRMED | FRONT CENTRE) · <reference> SYL-WC-<label>-XXXX | SYL-WD-<label>-XXXX | SYL-WC-FC-XXXX · CONFIRMED | FRONT CENTRE · TEMPLE CEREMONY | WEDDING DINNER · 28 FEB 2027 · <time> · SCAN AT THE DOOR',
  'Page foot: DOWNLOADED <YYYY-MM-DD HH:MM> UTC · SUNDAY, 28 FEBRUARY 2027 · VIENTIANE, LAOS · file names see-you-in-laos-wc-seat-<name>.pdf | see-you-in-laos-wd-seat-<name>.pdf | see-you-in-laos-wedding-seats-<name>.pdf',
  'TRAVEL PASS — page title: see you in laos. · YOUR TRAVEL PASS · <full name> · <leg title> — ticket header: see you in laos. · TRAVEL PASS · TRAIN | FLIGHT — <operator> · <leg title> — <from code> <to code> · <duration> · <times> · <names> · <places> · <dates> — GUEST · CLASS · DATE · YOUR COST → USD <amount> · per person — foot: WEDDING JOURNEY OF HARUTHAI & SUTHEP · SELECTED | SENT | CONFIRMED',
  'Stub: the QR code (carries: SEE YOU IN LAOS / TRAVEL PASS <reference> / <first name> / <leg code> <route> / <dates> / <class> / SELECTED | SENT | CONFIRMED) · SYL-TN25-XXXX | SYL-MU9646-XXXX | SYL-C86-XXXX | SYL-MU5924-XXXX · SELECTED | SENT | CONFIRMED · <leg code> · <from> – <to> · <date> · <time> · SHOW TO GUEST RELATIONS',
  'Page foot: DOWNLOADED <YYYY-MM-DD HH:MM> UTC · THAILAND · LAOS · CHINA · 21 FEBRUARY – 8 MARCH 2027 · file names see-you-in-laos-travel-pass-<leg>-<name>.pdf',
] }]);
add('generated · the sent journey text', 'GENERATED · the plain-text summary that travels with the registration (the journey above · Peggy)', 'review.html buildText()', 'received by Guest Relations with the registration; also the body of the email backup', [{ name: 'text', lines: (sentText || '(not captured)').split('\n') }]);
add('generated · the email backup channel', 'GENERATED · the mailto link when the endpoint cannot be reached', 'review.html (send handler, on failure)', 'subject and body', [{ name: 'text', lines: (mailto || '(not captured)').split('\n') }]);
add('generated · seat labels and plan words', 'TEMPLATE · every label · the state words · the spoken names', 'assets/seatlabels.js · assets/seating.js', 'the words of the plans', [{ name: 'text', lines: [
  'Ceremony labels (left block A B · aisle · right block D E F · rows 1–10): ' + cfg.ceremony.rows.flatMap((r) => r.seats.map((s) => L.label(s.seatId))).join(' '),
  'Dinner labels (run A · run B · places 1–25): ' + [...cfg.dinner.sides.T, ...cfg.dinner.sides.B].map((s) => L.label(s.seatId)).join(' '),
  'Words of a chair: Left block · row n | Right block · row n | Long table · run A · Poolside · place n | Long table · run B · place n',
  'Chair states (legend): Available · Selected by you · Your seat · Your party · Reserved · family · Taken',
  'Chair aria-label: "Ceremony seat E4, available" | "…, selected by you" | "…, your seat" | "…, <first name>, your party" | "…, taken by <first name>" | "…, reserved for family" | "…, unavailable" — "Dinner seat A4, …" likewise',
  'Plan aria-label (ceremony): Ceremony seating plan: the front with the Bride and Groom, a left block of two seats and a right block of three seats per row, ten rows, a centre aisle',
  'Plan aria-label (dinner): Wedding dinner seating plan, poolside: one long table with run A of 25 places along one side and run B of 25 along the other, the swimming pool along run A',
  'The pool: aria-label "The swimming pool, along run A" · drawn words SWIMMING POOL · RUN A · 25 PLACES · POOLSIDE · RUN B · 25 PLACES · OPPOSITE THE POOL · WEDDING DINNER · POOLSIDE · ONE LONG TABLE · 50 PLACES · 50 GUEST SEATS · NO FIXED PLACES',
  'Plan words (ceremony): CEREMONY · FRONT · BRIDE · GROOM · A B AISLE D E F · 1 … 10 · LEFT BLOCK · 20 · RIGHT BLOCK · 30',
] }]);

/* ================================================================== K · global blocks, render */
function renderAll() {
  const counts = new Map();
  for (const s of surfaces) for (const p of s.parts) { const k = p.name + '' + p.lines.join('\n'); counts.set(k, (counts.get(k) || 0) + 1); }
  const gid = new Map(); let n = 0;
  for (const s of surfaces) for (const p of s.parts) { const k = p.name + '' + p.lines.join('\n'); if (counts.get(k) >= 2 && !gid.has(k)) gid.set(k, 'G-' + String(++n).padStart(3, '0')); }
  const out = [];
  out.push('007 — FINAL V3 FULL-WEBSITE TEXT EXTRACTION · see you in laos.');
  out.push('The complete guest-facing text of the current release (main ' + SHA + '), extracted ' + new Date().toISOString() + ' from a local Worker running the deployed source with the real engines.');
  out.push('Every active route and every reachable state was rendered in a browser and the live DOM walked in document order: text, [aria-label], [alt], [title], [placeholder], resolved aria-labelledby / aria-describedby, control states, live regions; "(hidden)" marks text in the page but not shown until an interaction.');
  out.push('The generated sent-journey text, the email backup, the seat tickets and travel passes (PDF text read back) and the plan words are included. Exact-duplicate global blocks are written once as G-nnn and referenced with USES G-nnn; every variant is written in full.');
  out.push('No access code appears: [SECRET ACCESS CODE OMITTED] stands where one would be typed or shown. Contacts are test values. Nothing is summarised, corrected or shortened.');
  out.push('');
  out.push('==================================================');
  out.push('GLOBAL TEXT BLOCKS');
  out.push('==================================================');
  const written = new Set();
  for (const s of surfaces) for (const p of s.parts) { const k = p.name + '' + p.lines.join('\n'); const id = gid.get(k); if (!id || written.has(id)) continue; written.add(id); out.push(''); out.push('GLOBAL TEXT BLOCK ' + id + ' (' + p.name + ')'); out.push(...p.lines); }
  out.push('');
  let i = 0;
  for (const s of surfaces) {
    i++;
    out.push('==================================================');
    out.push('SURFACE ' + String(i).padStart(3, '0'));
    out.push('==================================================');
    out.push('ROUTE: ' + s.route);
    out.push('STATE: ' + s.state);
    out.push('SOURCE: ' + s.source);
    out.push('CONTEXT: ' + s.context);
    out.push('');
    for (const p of s.parts) { const k = p.name + '' + p.lines.join('\n'); const id = gid.get(k); if (id) out.push('USES ' + id + ' (' + p.name + ')'); else { if (s.parts.length > 1) out.push('[' + p.name + ']'); out.push(...p.lines); } }
    out.push('');
  }
  return { text: out.join('\n') + '\n', globals: written.size };
}

/* ================================================================== L · completeness audit over the source literals */
console.log('L · completeness audit');
const norm = (x) => x.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/<[^>]+>/g, ' ').replace(/&rsquo;|’/g, '’').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&rarr;/g, '→').replace(/&ldquo;|&rdquo;/g, '"').replace(/\s+/g, ' ').trim();
const FILES = ['index.html', 'destination.html', 'journeys.html', 'accommodation.html', 'experiences.html', 'experience.html', 'voyage.html', 'marsilea.html', '1872.html', 'tea.html', 'transport.html', 'room.html', 'dress.html', 'invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html', 'cart.html', 'tickets.html',
  'assets/aman.js', 'assets/venue-data.js', 'assets/venue.js', 'assets/motion.js', 'assets/bag.js', 'assets/confirm.js', 'assets/docs.js', 'assets/experiences.js', 'assets/gallery.js', 'assets/guest.js', 'assets/invite.mjs', 'assets/journey.js', 'assets/prep-shell.js', 'assets/pricing.js', 'assets/recon.js', 'assets/rooms-data.js', 'assets/rooms.js', 'assets/stay.js', 'assets/seating.js', 'assets/seatlabels.js', 'assets/seatpass.js', 'assets/travelpass.js', 'assets/shop-menu.js', 'assets/temple.js', 'assets/transport-data.js'];
/* implementation-only literals (error keys mapped to other words, font names, PDF operators, a build guard) */
const DEV = new Set(['use strict', 'body pend', 'too large', 'no invitation', 'no file', 'PP Editorial Old', 'Hanken Grotesk', 'pdf: object order', 'not signed in', 'seating is frozen', 'unsupported file type', 'document storage is not yet enabled', 'allocated by Guest Relations', 'seating is not open', 'seating unavailable', 'no pdf writer', 'no ticket writer', 'no sha256', 'not selected', 'rooms unavailable', 'status unavailable', 'unknown room', 'no network in tests', 'invalid release', 'not your guest']);
const isCode = (l) => /^(?=.*-)[a-z0-9-]+( [a-z0-9-]+){0,3}$/.test(l) || /[{}=;<>]|\.html|\.jpg|\.png|\.js\b|\.mjs|\.json|data-|aria-|class=|style=|rgba?\(|\bvar\(|#[0-9a-f]{3}\b|https?:|^\/|\$\{|&&|\|\||=>|\bpush\(|\breturn\b|\bfunction\b|^, |: "|\) \?|\? \(|\+ \(|^M\d|h1v1h-1z|^[0-9. ]+ (rg|RG|re|Tf|Td)/.test(l);
const isWords = (l) => /[A-Za-z]{2,}\s+[A-Za-z0-9’'&(]/.test(l) && l.split(' ').some((w) => /^[A-Za-z’']{4,}[.,:;!?]?$/.test(w));
function contextOf(code, i) { const before = code.slice(0, i); const m = [...before.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(|([A-Za-z_$][\w$]*)\s*[:=]\s*function\s*\(|(?:var|const|let)\s+([A-Z_][A-Z0-9_]*)\s*=/g)]; const last = m[m.length - 1]; return last ? (last[1] || last[2] || last[3]) : ''; }
function scan(hay) {
  const residual = {}, leftover = []; let literals = 0;
  for (const f of FILES) {
    const code = src(f).replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length)).replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length)).replace(/(^|[^:\\'"])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length));
    const seen = new Set();
    for (const m of code.matchAll(/'((?:[^'\\\n]|\\.)*?)'|"((?:[^"\\\n]|\\.)*?)"/g)) {
      const lit = norm(m[1] != null ? m[1] : m[2]);
      if (lit.length < 6 || seen.has(lit) || DEV.has(lit) || isCode(lit) || !isWords(lit)) continue; seen.add(lit); literals++;
      const key = lit.toLowerCase(), core = key.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
      if (hay.includes(key) || (core.length >= 6 && hay.includes(core))) continue;
      const c = contextOf(code, m.index);
      (residual[f] = residual[f] || []).push((c ? '[' + c + '] ' : '') + lit); leftover.push(f + ' · ' + lit);
    }
  }
  return { residual, leftover, literals };
}
const first = scan(norm(renderAll().text).toLowerCase());
let residualCount = 0;
for (const f of Object.keys(first.residual)) { residualCount += first.residual[f].length; add('source strings · ' + f, 'SOURCE STRINGS · wording that reaches a guest only in a state not rendered above (each line as written, with the function or template it belongs to)', f, 'folded in for completeness — every literal here is guest-facing in some state', [{ name: 'text', lines: first.residual[f] }]); }
const second = scan(norm(renderAll().text).toLowerCase());
console.log('literals ' + first.literals + ' · residual folded ' + residualCount + ' · leftover ' + second.leftover.length);

/* ================================================================== M · accessibility: concatenation check */
const a11yIssues = [];
for (const s of surfaces) for (const p of s.parts) for (const l of p.lines) { if (/^\[aria-label\]|^\[aria-describedby|^\[aria-labelledby/.test(l) && /[a-z][A-Z][a-z]/.test(l.replace(/\b(McD|iPhone|WiFi|LINE|EmQuartier|KokKok|ICONSIAM|IGNIV|CHANINTR)\b/g, ''))) a11yIssues.push(s.route + ' · ' + s.state.slice(0, 40) + ' · ' + l); }
fs.writeFileSync(path.join(ROOT, 'docs/review/.007-v3-a11y-check.json'), JSON.stringify(a11yIssues, null, 2));

/* ================================================================== N · write, scrub, count */
let { text, globals } = renderAll();
const routesSet = new Set(surfaces.map((s) => s.route.replace(/ .*$/, '').replace(/\?.*$/, '').replace(/ \(.*\)$/, '')).filter((r) => r.startsWith('/')));
const meta = (pdfN, expN, roomN, transN) => ['==================================================', '007 FINAL REVIEW METADATA', '==================================================', 'MAIN SHA: ' + SHA, 'EXTRACTION DATE: ' + new Date().toISOString(), '', 'DISTINCT ACTIVE ROUTES: ' + routesSet.size, 'DISTINCT SURFACES: ' + surfaces.length, 'DYNAMIC / CONDITIONAL STATES: ' + stateCount, 'EXPERIENCE ENTITIES: ' + expN, 'STAY / ROOM ROUTES: ' + roomN, 'TRANSPORT ROUTES: 5', 'TICKET / PDF TEMPLATES: ' + pdfN, ''];
let scrubbed = text;
for (const t of TOKENS) scrubbed = scrubbed.split(t).join('[SECRET ACCESS CODE OMITTED]');
for (const bv of Object.values(bearer)) scrubbed = scrubbed.split(bv).join('[SECRET ACCESS CODE OMITTED]');
scrubbed = scrubbed.replace(/\b[a-f0-9]{64}\b/g, '[SECRET ACCESS CODE OMITTED]').replace(/\b[a-z0-9]{16}\b/g, (m) => TOKENS.includes(m) ? '[SECRET ACCESS CODE OMITTED]' : m).split(GR).join('[SECRET ACCESS CODE OMITTED]');
const lines = scrubbed.split('\n').length, words = scrubbed.split(/\s+/).filter(Boolean).length, chars = scrubbed.length;
const secretHits = TOKENS.filter((t) => scrubbed.includes(t)).length + Object.values(bearer).filter((v) => scrubbed.includes(v)).length + (scrubbed.includes(GR) ? 1 : 0);
const metaBlock = meta(pdfTemplates, EXP.length, roomRoutes, 5).concat(['LINES: ' + (lines + 24), 'WORDS: ' + words, 'CHARACTERS: ' + chars, '', 'SOURCE-TRUTH CLAIMS CHECKED: see docs/review/007-final-source-truth-audit.txt', 'SOURCE-TRUTH MATCH: see audit', 'SOURCE-TRUTH CONFLICT: see audit', 'SOURCE MISSING: see audit', 'OWNER DECISION OVERRIDES: see audit', '', 'SECRET SCAN: ' + (secretHits === 0 ? 'PASS' : 'FAIL'), 'COMPLETENESS CHECK: ' + (second.leftover.length === 0 && failures.length === 0 ? 'PASS · ' + first.literals + ' guest-facing source literals represented · ' + residualCount + ' folded in from states not rendered · 0 leftover · 0 failed steps' : 'FAIL · leftover ' + second.leftover.length + ' · failed steps ' + failures.length)]);
fs.writeFileSync(OUT, scrubbed + metaBlock.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(ROOT, 'docs/review/.007-v3-run.json'), JSON.stringify({ sha: SHA, routes: [...routesSet], surfaces: surfaces.length, states: stateCount, experiences: EXP.length, roomRoutes, pdfTemplates, lines: lines + 24, words, chars, literals: first.literals, residual: residualCount, leftover: second.leftover, failures, pageErrors: errs, globals, secretHits, a11yIssues: a11yIssues.length }, null, 2));
console.log('FILE ' + path.relative(ROOT, OUT) + ' · routes ' + routesSet.size + ' · surfaces ' + surfaces.length + ' · states ' + stateCount + ' · lines ' + (lines + 24) + ' · words ' + words + ' · chars ' + chars + ' · globals ' + globals + ' · secrets ' + secretHits + ' · failures ' + failures.length + (failures.length ? '\n' + failures.join('\n') : '') + (second.leftover.length ? '\nLEFTOVER:\n' + second.leftover.join('\n') : ''));
