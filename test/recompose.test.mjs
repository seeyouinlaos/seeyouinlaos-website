/* ============================================================================
   D · RECOMPOSE ALL SIX PREPARATION SURFACES — regression checks.

   One shell, one design system, one ownership model, one product grammar,
   one information hierarchy. These tests hold the shape of the six surfaces:
   exactly six steps, no seventh; documents, dress and seating inside their
   steps; four wedding events; retired products absent; shared selections
   once; personal acknowledgements per guest; no page-local design left.
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const SIX = ['invitation.html', 'your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html'];

test('exactly six Preparation steps, and documents, dress and seating are not a seventh', () => {
  const shell = read('assets/prep-shell.js');
  const steps = [...shell.matchAll(/\{ n: '(\d\d)', key: '([a-z]+)',\s*label: '([^']+)',\s+file: '([^']+)'/g)];
  assert.equal(steps.length, 6);
  assert.deepEqual(steps.map((m) => m[4]), SIX);
  const files = steps.map((m) => m[4]);
  ['documents.html', 'dress.html', 'seating.html', 'you.html'].forEach((f) => assert.ok(!files.includes(f), f + ' must not be a step'));
  /* the guest record agrees: six, in order */
  const g = read('assets/guest.js');
  assert.equal((g.slice(g.indexOf('STEP_DEFS: ['), g.indexOf('],', g.indexOf('STEP_DEFS: ['))).match(/\{ key:/g) || []).length, 6);
});

test('the six surfaces are one system: the shell, the design system, no page-local design, no public desktop layer', () => {
  for (const f of SIX) {
    const page = read(f);
    assert.ok(page.includes('assets/prep-shell.js'), f + ' is outside the shell');
    assert.ok(page.includes('assets/prep.css'), f + ' is outside the design system');
    assert.ok(!page.includes('assets/desktop.css'), f + ' still loads the public desktop layer');
    assert.ok(!page.includes('assets/prep.js'), f + ' still loads the retired rail');
    assert.match(page, /<main[^>]*>/);
    /* the only page-local CSS is the shared site chrome (fonts, header, badge) */
    const local = page.slice(page.indexOf('<style>') + 7, page.indexOf('</style>'));
    const selectors = [...local.matchAll(/(^|\})\s*([^{}]+)\{/g)].map((m) => m[2].trim()).filter((x) => !x.startsWith('@font-face'));
    const allowed = /^(\*|body|\.hd|\.hb|\.hb i|\.bd|\.bd \.dot|\.bag|\.bag \.bgi|\.bb)$/;
    selectors.forEach((sel) => assert.ok(allowed.test(sel), f + ' keeps a page-local rule: ' + sel));
    /* every heading and control on the surface is a system role */
    assert.doesNotMatch(page, /class="(cta|gbtn|tlink|nav|tab|grow|gap|blk|bhd|bedit|bsub|pline|row|th|nm|mt|when|cat|basis|ln|tot|dlist|drow|fxcta|fxalt|fxo|fxs|cscard|q|qq|qn|qh|qw|forwho|tabs|opsec|opl|none|saved|ifor|iperson|ipn|ipf|ipr|iblk|step|stepn|stept|stepd|stepr|ihero|ieyebrow|iname|ilede|ibody|gate|heldbox|wedth|wprog|wp|wpt|wpm|wps|wpeople|wcost|wpd|wpa|wpl|tmpl|acts|rm|ch|bf|hostln|modes|selfl|avline|empty|note|sub|lede|body|dack|consent|ackrow|dbtn|dl|dh|dstate|dmeta|derr|dbtns|gcard|gname|fld|src|hist|req)"/, f + ' still uses a legacy class');
  }
});

test('the legacy normalisation layer is gone from the design system', () => {
  const sys = read('assets/prep.css');
  assert.ok(!/LEGACY NORMALISATION/.test(sys), 'the compatibility map is still declared');
  assert.ok(!/THE SYSTEM WINS/.test(sys), 'the override-of-the-override block is still declared');
  assert.equal((sys.match(/body\.prep [.#]/g) || []).length, 0, 'element-scoped legacy overrides remain: ' + (sys.match(/body\.prep [^{]+/g) || []).join(' | '));
  assert.equal((sys.match(/!important/g) || []).length, 0, 'no rule needs !important once nothing collides');
  /* two families, six roles, three controls — unchanged since A */
  ['.t-d1', '.t-h1', '.t-h2', '.t-b1', '.t-b2', '.t-l1'].forEach((r) => assert.ok(sys.includes(r + ' {'), r));
  ['.p-act {', '.p-link {', '.p-sel {'].forEach((r) => assert.ok(sys.includes(r), r));
  const fams = [...new Set((sys.match(/font-family:[^;]+/g) || []).map((f) => f.trim()))];
  assert.deepEqual(fams.sort(), ['font-family: var(--f-ed)', 'font-family: var(--f-ui)']);
});

test('the journey is the authoritative chronology, never insertion order', () => {
  const yj = read('your-journey.html');
  assert.match(yj, /J\.SEGMENTS\.forEach\(function\(seg,i\)\{h\+=stageHtml\(seg,i\);if\(seg\.key==='wedstay'\)h\+=weddingHtml\(\)\}\)/,
    'stages render from the chronology, with THE WEDDING inside the Wedding Stay');
  const j = read('assets/journey.js');
  const keys = [...j.slice(j.indexOf('var SEG = ['), j.indexOf('/* Chronological position')).matchAll(/\{ key: '([a-z0-9-]+)'/g)].map((m) => m[1]);
  assert.deepEqual(keys, ['bkk-stay', 'train', 'prewed', 'wedstay', 'mu9646', 'kmg', 'c86', 'ljg', 'return', 'kempinski']);
  /* every shared product says whose it is, once — never per person */
  assert.match(yj, /data-party-label/);
  assert.doesNotMatch(yj, /labelFor\(g\.guestId\)\)\+'<\/b><\/p><p class="t-b2">Wedding decisions[\s\S]{0,400}data-choose/, 'no personal product duplication');
});

test('the shared journey selection appears once on every surface', () => {
  const yj = read('your-journey.html'), rv = read('review.html');
  /* one Bangkok line, one fare line, one C86 line: a change REPLACES */
  assert.match(yj, /P\.ids\('bkk-stay'\)\.forEach\(function\(id\)\{SIYL_BAG\.remove\(id\)\}\);\s*P\.items\('bkk-stay'/, 'a new Bangkok choice must replace the previous one atomically');
  assert.match(yj, /if\(SIYL_BAG\.has\(id\)\)return;/, 'a flat product is never added twice');
  /* the journey block on Review is filtered from the bag, not composed per guest */
  assert.match(rv, /\.filter\(function\(x\)\{return !\(window\.SIYL_JOURNEY&&SIYL_JOURNEY\.isWedding\(x\)\)\}\)/);
  assert.doesNotMatch(rv, /p\.guests\.forEach\([^)]*\)\s*\{[^}]*SIYL_BAG\.get\(\)/, 'costs are never multiplied by the party');
});

test('retired products never reach the active journey', () => {
  for (const f of ['your-journey.html', 'review.html', 'assets/journey.js', 'assets/pricing.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /MU9632|MU9602|C642 ·|'c642'|'mu9632'/, f + ' still names a retired service as active');
  }
  const bag = read('assets/bag.js');
  assert.match(bag, /c642:\{id:'c86'/, 'the retired train migrates to C86');
  assert.match(bag, /mu9632:\{id:'mu9646'/, 'the retired flight migrates to MU9646');
});

test('the Bangkok choice is exactly three addresses, one active, in the accepted vocabulary', () => {
  const yj = read('your-journey.html');
  assert.match(yj, /SIYL_ROOMS\.sathorn/);
  const rooms = read('assets/rooms-data.js');
  const sathorn = rooms.slice(rooms.indexOf('sathorn: {'), rooms.indexOf('kunming: {'));
  assert.deepEqual([...sathorn.matchAll(/property: '([^']+)'/g)].map((m) => m[1]),
    ['Sathorn Penthouse Bangkok', 'U Sathorn Bangkok', 'Shama Yen-Akat Bangkok']);
  assert.match(yj, /Select this stay/);
  assert.match(yj, /Selected for your journey/);
  assert.doesNotMatch(yj, /CHOOSE THIS ADDRESS|Choose this address|SEE THE ROOMS|See the rooms/i);
});

test('MU9646 and C86 are preserved exactly, with decision-critical benefits only', () => {
  const yj = read('your-journey.html');
  assert.match(yj, /MU9646 · Vientiane &rarr; Kunming/);
  assert.match(yj, /15:50 <span>VTE · Terminal 1<\/span>/);
  assert.match(yj, /18:25 <span>KMG<\/span>/);
  assert.match(yj, /1h 35m · non-stop/);
  const p = read('assets/pricing.js');
  assert.match(p, /slug: 'business'[\s\S]{0,120}price: 275/);
  assert.match(p, /slug: 'economy-flexible'[\s\S]{0,120}price: 155/);
  assert.match(p, /'c86':\s*\{ price: 85/);
  assert.match(yj, /dep:\['10:15','Kunming'\],arr:\['13:44','Lijiang'\],dur:'3h 29m · direct',cls:'Business Class · 1 \+ 1 seating'/);
  const c86 = yj.slice(yj.indexOf("c86:{"), yj.indexOf("'return':{"));
  assert.ok((c86.match(/ben:\[([^\]]+)\]/)[1].split("','").length) <= 4, 'C86 carries at most four benefits in the selector');
});

test('exactly four Wedding Programme events, and step 03 is the private module, not voyage.html', () => {
  const t = read('assets/temple.js');
  const ev = t.slice(t.indexOf('var EVENTS = ['), t.indexOf('];', t.indexOf('var EVENTS = [')));
  assert.deepEqual([...ev.matchAll(/label: '([^']+)'/g)].map((m) => m[1]), ['Temple Ceremony', 'Coffee & Cake', 'Vow Ceremony', 'Wedding Dinner']);
  const wd = read('wedding.html');
  assert.match(wd, /T\.EVENTS\.forEach\(function\(e,i\)/, 'the day renders in its order');
  assert.doesNotMatch(wd, /Sacred Morning Ritual|Welcome Dinner|Alms Giving/);
  assert.doesNotMatch(wd, /assets\/images\/dress\//, 'no dress gallery on step 03');
  assert.match(wd, /data-more="takbat"/);
  assert.match(wd, /data-more="sang"/);
  assert.match(read('assets/prep-shell.js'), /file: 'wedding\.html'/);
  assert.doesNotMatch(read('assets/prep-shell.js'), /file: 'voyage\.html'/);
  /* the journey keeps the wedding compact */
  const yj = read('your-journey.html');
  assert.doesNotMatch(yj, /data-ev=|data-off=|data-ack=|assets\/images\/dress\//);
});

test('the dress code is understood once, in step 04, and acknowledged per guest — nowhere else', () => {
  const wp = read('wedding-preparation.html');
  assert.match(wp, /setDressAck\(c\.getAttribute\('data-ack'\)/);
  assert.match(wp, /p\.guests\.forEach\(function\(g\)\{/);
  assert.equal((wp.match(/assets\/images\/dress\//g) || []).length, 18);
  for (const f of ['invitation.html', 'your-journey.html', 'wedding.html', 'about-you.html', 'review.html']) {
    const page = read(f);
    assert.doesNotMatch(page, /data-ack=|setDressAck\(/, f + ' carries a dress acknowledgement outside step 04');
    assert.doesNotMatch(page, /assets\/images\/dress\//, f + ' repeats the dress gallery');
  }
  /* seating: not open, nothing invented */
  assert.match(wp, /Not open yet/);
  /* G · the seat map is drawn from server configuration; the page itself carries no geometry */
  assert.doesNotMatch(wp, /seatId:\s*'[CD]-|rows:\s*\[\s*\{|'C-[LR]-\d+-\d+'|'D-[LRTB]-\d+'/);
});

test('Review introduces no new selection control for an existing concept', () => {
  const rv = read('review.html');
  const main = rv.slice(rv.indexOf('<main>'), rv.indexOf('</main>'));
  assert.doesNotMatch(main, /data-choose|data-cls|data-ev=|data-off=|data-ack=|data-consent|<textarea|type="file"/);
  assert.doesNotMatch(rv, /data-choose|data-cls|data-ev=|data-off=|data-ack=|data-consent|<textarea|type="file"/);
  /* the one action is SEND; everything else is an EDIT back to a primary home */
  assert.equal((rv.match(/class="p-act" id="send"/g) || []).length, 1);
  ['you.html#you', 'your-journey.html', 'voyage.html#temple-decision', 'wedding-preparation.html#ack', 'about-you.html#about-you', 'documents.html']
    .forEach((href) => assert.ok(rv.includes('href="' + href + '"'), href));
});

test('ABOUT YOU is four editorial areas, subject-driven, with documents inside and privacy first person', () => {
  const ab = read('about-you.html');
  ['01 · ', '02 · Operational', '03 · Optional · can be added later', '04 · Privacy'].forEach((h) => assert.ok(ab.includes(h), h));
  assert.match(ab, /G\.subject\(\)\.guestId/);
  assert.match(ab, /D\.mayConsent\(id\)/);
  assert.match(ab, /D\.send\(gid,kind,f\)/);
  assert.doesNotMatch(ab, /localStorage\.setItem/, 'no document byte in the browser');
  /* the name selector is the system's selection control */
  assert.match(ab, /class="p-sel" aria-pressed="[^"]*" data-who=/);
});

test('the shell foot is the one continuation on every surface', () => {
  ['your-journey.html', 'wedding.html', 'wedding-preparation.html', 'about-you.html', 'review.html'].forEach((f) => {
    assert.match(read(f), /\.foot\(document\.getElementById\('foot'\)\)/, f + ' has no shell continuation');
  });
  assert.match(read('invitation.html'), /Continue to Your Journey/);
  assert.match(read('invitation.html'), /setIdentityReviewed\(true\)/);
});
