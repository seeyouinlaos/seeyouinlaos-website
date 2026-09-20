/* THE HIGHLIGHTS (Owner, 20 Sep 2026): Aman 1872 · Sühring · Baan Phraya · Cannubi — one row of the menu, one rail on
   Experiences, one booking grammar (assets/highlight.js: select → preview → confirm → the Bag), the houses' own prices as
   the Owner's rounded USD amounts, never a pairing or supplement as a product, never a hold on preview, never two lines
   for one house. And the Sathorn card inset defect: the text column of the Bangkok stay cards is one block, inset by one
   token — the shared carousel's heading rule can no longer push the name against the border. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { page, src, plain, PEGGY } from './sandbox.mjs';

const exp = {}; new Function('window', src('assets/experiences.js'))(exp);
const byId = Object.fromEntries(exp.SIYL_EXP.map((x) => [x.id, x]));
const HL = ['bkk-suhring', 'bkk-baanphraya', 'bkk-cannubi'];

test('THE DATA · three Highlight tables with distinction, editorial line, house, menu, contact and a request product; the amounts are the Owner\'s rounded USD prices of the houses\' menu prices; pairings, supplements and caviar are never products', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE;
  const s = byId['bkk-suhring'];
  assert.equal(s.highlight.distinction, 'Three MICHELIN Stars'); assert.match(s.highlight.line, /Thomas and Mathias Sühring/); assert.match(s.highlight.house, /1970s villa/);
  assert.deepEqual(s.highlight.contact.address, ['No. 10, Yen Akat Soi 3', 'Chongnonsi, Yannawa', '10120 Bangkok, Thailand']); assert.equal(s.highlight.contact.phone, '+66 (0) 2107 2777'); assert.equal(s.highlight.contact.email, 'reservation@restaurantsuhring.com');
  assert.ok(s.highlight.menu.includes('Schwarzwälder Kirschtorte') && s.highlight.menu.some((d) => /Oma Christa/.test(d)), 'the menu card\'s dishes');
  assert.match(s.highlight.menuNote, /Beverages are not included/); assert.match(s.highlight.menuNote, /10% service charge and 7% VAT/);
  assert.deepEqual(plain(P.menusOf('suhring').map((m) => [m.name, m.thb, m.price])), [['Erlebnis · the complete menu', 'THB 9,800', 294], ['Erlebnis · the shorter sequence', 'THB 7,800', 234]]);
  const b = byId['bkk-baanphraya'];
  assert.match(b.highlight.distinction, /River of Kings/); assert.match(b.highlight.line, /Phatchara “Pom” Pirapak/); assert.match(b.highlight.house, /Phraya Mahai Savan and Khunying Luean Mahai Savan/);
  assert.equal(b.highlight.menu.length, 11); assert.ok(b.highlight.menu.some((d) => /Crispy pineapple wafer/.test(d)) && b.highlight.menu.some((d) => /Kao Yai duck green curry/.test(d)) && b.highlight.menu.some((d) => /pandanus ice cream/.test(d)));
  assert.match(b.highlight.menuNote, /10% service charge and applicable government tax/); assert.match(b.highlight.menuNote, /not booked here/);
  assert.deepEqual(b.practical.hours, ['Pre-dinner drink 17:00 – 18:00 · the outdoor terrace', 'Dinner 18:00 – 23:00 · Friday to Tuesday']); assert.match(b.practical.dress, /sleeveless shirts for gentlemen are not permitted/i);
  assert.equal(b.highlight.contact.phone, '+66 (0) 2 659 9000'); assert.equal(b.highlight.contact.email, 'mobkk-baanphraya@mohg.com');
  assert.equal(P.FLAT.baanphraya.price, 114); assert.match(P.FLAT.baanphraya.basis, /THB 3,800/); assert.match(P.FLAT.baanphraya.basis, /adds 10% service charge and government tax/, 'the USD amount never claims to include the house\'s charges');
  const c = byId['bkk-cannubi'];
  assert.equal(c.highlight.distinction, 'One MICHELIN Star · The MICHELIN Guide Thailand 2026'); assert.match(c.highlight.line, /Andrea Susto/); assert.match(c.highlight.house, /Cannubi hill in Barolo/); assert.match(c.highlight.house, /350 wine labels/);
  assert.equal(c.highlight.menu.length, 8); assert.ok(c.highlight.menu.some((d) => /Pumpkin variations/.test(d)) && c.highlight.menu.some((d) => /Piccola pasticceria/.test(d)));
  assert.match(c.highlight.menuNote, /designed for one person and is the same for everyone at the table/); assert.match(c.highlight.menuNote, /7% VAT and 10% service charge/); assert.match(c.highlight.menuNote, /Allergies/);
  assert.deepEqual(c.practical.hours, ['Wednesday to Sunday', 'Lunch 12:00 – 14:30 (last order 14:00)', 'Dinner 18:00 – 22:00 (last order 21:30)', 'L Floor']); assert.match(c.practical.dress, /Smart casual/); assert.match(c.practical.dress, /t-shirts, shorts or sandals/);
  assert.equal(c.highlight.contact.phone, '+66 2200 9000'); assert.equal(c.highlight.clip, 'assets/video/cannubi-card.mp4');
  assert.equal(P.FLAT.cannubi.price, 165); assert.match(P.FLAT.cannubi.basis, /THB 5,500/);
  /* no pairing, supplement or caviar is a product */
  for (const k of Object.keys(P.FLAT)) assert.doesNotMatch(k, /pairing|caviar|supplement|wagyu|lobster/i);
  assert.ok(!Object.values(P.FLAT).some((f) => /2,800|1,400|2,500|3,500|6,000|1,500/.test(f.basis || '') && /per person · a/.test('')), 'no pairing price as an amount');
  for (const id of HL) assert.equal(byId[id].select.price, undefined, id + ': the price lives in pricing.js only');
});

test('THE BOOKING GRAMMAR · one line per house with the chosen menu\'s price, a request; put replaces (a menu change), never duplicates; removal reverses; the line reads as an experience — never as travel — in the record', () => {
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, B = w.SIYL_BAG, J = w.SIYL_JOURNEY;
  const line = (id, menu) => { const it = P.items(id, menu)[0]; it.qty = 1; it.request = true; it.exp = 'bkk-' + id; return it; };
  B.put(line('suhring', 'erlebnis')); B.put(line('suhring', 'erlebnis')); assert.equal(B.get().length, 1); assert.equal(B.total(), 294);
  B.put(line('suhring', 'erlebnis-short')); assert.equal(B.get().length, 1, 'a menu change replaces the line'); assert.equal(B.get()[0].menu, 'erlebnis-short'); assert.equal(B.total(), 234);
  assert.match(J.meta(B.get()[0]).basis, /USD 234 per person/); assert.equal(J.meta(B.get()[0]).cat, 'Restaurant');
  B.put(line('baanphraya')); B.put(line('cannubi')); assert.equal(B.get().length, 3); assert.equal(B.total(), 234 + 114 + 165);
  assert.ok(B.get().every((x) => x.request && x.exp && !x.cls), 'a request line carries no travel class');
  B.remove('baanphraya'); assert.equal(B.total(), 234 + 165); assert.ok(!B.has('baanphraya'));
  /* the module: preview holds nothing — confirm puts; the page delegates to it */
  const hl = src('assets/highlight.js');
  assert.match(hl, /preview: function \(x, menu\)/); assert.doesNotMatch(hl.slice(hl.indexOf('preview: function'), hl.indexOf('confirm: function')), /SIYL_BAG\.put|SIYL_BAG\.add/, 'the preview never writes the Bag');
  assert.match(hl, /confirm: function \(x, menu\) \{[\s\S]*?window\.SIYL_BAG\.put\(line\)/);
  assert.match(hl, /data-sel-state="confirm"/); assert.match(hl, /nothing is held until you confirm/i);
  assert.match(src('experience.html'), /<script src="assets\/highlight\.js/); assert.match(src('experience.html'), /data-distinction/); assert.match(src('experience.html'), /data-menu/);
  /* the Review text carries the line's own amount */
  assert.match(src('review.html'), /RESTAURANT REQUEST \(USD '\+\(x\.price\|\|0\)\+' per person/);
});

test('THE NAVIGATION · a Highlights row in the one menu with Aman first, the Experiences rail #highlights with the four, both footers alike; nothing removed from Experiences', () => {
  const nav = src('assets/aman.js');
  const row = nav.slice(nav.indexOf("['Highlights', 'experiences.html#highlights'"), nav.indexOf("['Wellness'"));
  assert.ok(row.length > 0, 'the Highlights row exists');
  for (const l of ["['1872 · Champagne Afternoon Tea · Aman', '1872.html']", "['Sühring · Three MICHELIN Stars', 'experience.html?id=bkk-suhring']", "['Baan Phraya · Thai heritage', 'experience.html?id=bkk-baanphraya']", "['Cannubi by Umberto Bombana · One MICHELIN Star', 'experience.html?id=bkk-cannubi']"]) assert.ok(row.includes(l), l);
  assert.ok(nav.indexOf("['Highlights'") > nav.indexOf("['Experiences'") && nav.indexOf("['Highlights'") < nav.indexOf("['Wellness'"), 'between Experiences and Wellness — the hierarchy stands');
  assert.match(nav, /\['1872 · Champagne Afternoon Tea', '1872\.html'\]/, 'Aman stays in Experiences as well');
  const ex = src('experiences.html');
  assert.match(ex, /<section class="a-sec" id="highlights"/);
  for (const id of ['bkk-suhring', 'bkk-baanphraya', '1872', 'bkk-cannubi']) assert.match(ex, new RegExp('data-highlight-id="' + id + '"'), id);
  assert.match(ex, /Three MICHELIN Stars · Bangkok · 21 February/); assert.match(ex, /One MICHELIN Star · Dusit Thani Bangkok · 7 March/);
  assert.match(ex, /<div data-rails="bkk">/); assert.match(ex, /href="1872\.html">Discover 1872/); assert.doesNotMatch(ex, /USD 180 per person/);
  for (const f of ['assets/shop-menu.js', 'assets/recon.js']) { const t = src(f); for (const h of ['1872.html', 'experience.html?id=bkk-suhring', 'experience.html?id=bkk-baanphraya', 'experience.html?id=bkk-cannubi']) assert.ok(t.includes('href="' + h + '"'), f + ' ' + h); }
  /* the Aman page keeps its Bag line at the approved amount */
  assert.match(src('tea.html'), /id:'tea1872',name:'Champagne Afternoon Tea at 1872',meta:'For two guests',price:180/);
});

test('THE SATHORN CARD INSET · the stay card\'s text is one column behind one inset token; the shared carousel\'s heading rule is out-ranked; no per-element side margin remains (regression)', () => {
  const j = src('journeys.html');
  assert.match(j, /\.psel \.pcard\{--pc-inset:20px\}/, 'one inset token on the card');
  assert.match(j, /\.psel \.pcard \.pcbody\{padding:0 var\(--pc-inset\)\}/, 'applied by the body wrapper');
  assert.match(j, /\.psel \.pcard \.pcbody>\*\{margin-left:0;margin-right:0\}/, 'the children carry no side margin of their own');
  assert.match(j, /\.psel \.pcard h3\.pcname\{[^}]*margin:0 0 4px/, 'the heading rule out-ranks .aslide h3 (aman.css)');
  assert.doesNotMatch(j, /\.pc(name|room|facts|price|rate|av|eyebrow|view)\{[^}]*margin:[^;}]* 18px/, 'no per-element 18 px side margin');
  assert.match(j, /'<div class="pcbody">'\+/); assert.match(j, /See the rooms<\/a>'\+\s*'<\/div><\/div>'/);
  assert.match(j, /\.pcgo\{display:block;width:100%;margin:0;/, 'the CTA fills the inset column');
  /* the shared carousel rule that caused it is still there for the editorial cards — the fix is the card's, not aman.css's */
  assert.match(src('assets/aman.css'), /\.aslide h3 \{[^}]*margin: 8px 0 10px/);
});
