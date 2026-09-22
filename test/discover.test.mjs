/* THE DISCOVER RECONCILIATION (Owner, 22 Sep 2026): a place's category says what it IS; one canonical identity, one card, its
   itinerary date on it; every rail in the order of the days; BARON Vientiane the club of the wedding night with its own films;
   Petits Plats with its own photographs; Wat Ong Teu the temple of the wedding morning; That Dam, Wat Si Saket and Wat Si Muang
   gone; the journey in numbers counted from unique places. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, src } from './sandbox.mjs';

const W = {}; new Function('window', src('assets/experiences.js'))(W); new Function('window', src('assets/discover.js'))(W); new Function('window', src('assets/experience-galleries.js'))(W);
const X = W.SIYL_EXP, D = W.SIYL_DISCOVER, GAL = W.SIYL_EXP_GALLERY;
const by = Object.fromEntries(X.map((x) => [x.id, x]));
const rendered = (chapter) => D.rails(chapter).map((r) => ({ title: r.title, ids: r.items.map((x) => x.id) }));
const everywhere = (id) => ['bkk', 'laos', 'china'].flatMap((c) => rendered(c).filter((r) => r.ids.includes(id)).map((r) => c + '/' + r.title));

test('THE TAXONOMY · one category per place (what it IS), one role, no duplicate id; the Owner\'s placements: Harudot · Time Space · Moo Yoo · Kaogee = CAFÉ once; Sona = BAR once; the Night Market = a PLACE once; That Dam · Wat Si Saket · Wat Si Muang gone; Wat Ong Teu an EXPERIENCE once; BARON a CLUB once; Petits Plats a RESTAURANT once', () => {
  const ids = X.map((x) => x.id); assert.equal(new Set(ids).size, ids.length, 'no duplicate canonical id');
  for (const x of X) { assert.ok(['restaurant', 'cafe', 'bar', 'club', 'experience', 'place'].includes(x.category), x.id + ' category'); assert.equal(x.roles.length, 1, x.id + ' one role'); assert.ok(x.visits === undefined || Array.isArray(x.visits), x.id + ' visits'); }
  const R = { restaurant: ['breakfast', 'lunch', 'dinner'], cafe: ['cafe'], bar: ['bar'], club: ['club'], experience: ['experience'], place: ['place'] };
  for (const x of X) assert.ok(R[x.category].includes(x.roles[0]), x.id + ': the role ' + x.roles[0] + ' is not a ' + x.category + ' role');
  for (const [id, cat, where] of [['bkk-dior', 'cafe', 'bkk/Cafés'], ['bkk-lvcafe', 'cafe', 'bkk/Cafés'], ['bkk-harudot', 'cafe', 'bkk/Cafés'], ['bkk-timespace', 'cafe', 'bkk/Cafés'], ['bkk-mooyoo', 'cafe', 'bkk/Cafés'], ['vte-kaogee', 'cafe', 'laos/Cafés'], ['vte-sona', 'bar', 'laos/Bars & nightlife'], ['vte-nightmarket', 'place', 'laos/Shopping & places'], ['vte-ongteu', 'experience', 'laos/Experiences'], ['vte-baron', 'club', 'laos/Bars & nightlife'], ['bkk-petitsplats', 'restaurant', 'bkk/Restaurants']]) {
    assert.equal(by[id].category, cat, id); assert.deepEqual(everywhere(id), [where], id + ' renders exactly once, in ' + where);
  }
  assert.equal(by['bkk-diorlv'], undefined, 'the combined Dior · Café LV card is retired'); assert.ok(!X.some((x) => /Café LV|Dior · /.test(x.name)));
  assert.equal(by['bkk-dior'].name, 'Dior Café'); assert.equal(by['bkk-lvcafe'].name, 'LV Café');
  assert.deepEqual(by['bkk-dior'].visits, by['bkk-lvcafe'].visits, 'both keep the visit of Day 02 · 22.02.2027');
  assert.deepEqual(by['bkk-dior'].visits, [{ day: 2, date: '2027-02-22', seq: 1245, what: 'Coffee' }]);
  for (const gone of ['vte-thatdam', 'vte-sisaket', 'vte-simuang']) { assert.equal(by[gone], undefined, gone + ' is gone'); assert.ok(!existsSync(join(ROOT, 'assets/images/experiences/' + gone + '-01.jpg')), gone + ' photograph retired'); }
  assert.ok(!X.some((x) => /That Dam|Wat Si Saket|Wat Si Muang/.test(x.name)));
  /* every place renders exactly once across every chapter */
  for (const x of X) assert.equal(everywhere(x.id).length, 1, x.id + ' renders once: ' + everywhere(x.id).join(', '));
  /* the labels: Harudot never CAFÉ · EXPERIENCE again */
  assert.equal(D.LABEL[by['bkk-harudot'].category], 'Café'); assert.doesNotMatch(src('experiences.html'), /roles\.map|CAFÉ · EXPERIENCE/);
  assert.equal(by['bkk-harudot'].leg, undefined, 'no return duplicate of Harudot'); assert.doesNotMatch(src('experiences.html'), /data-rails="bkk-return"/);
});

test('THE DATES · every itinerary-linked card names its date(s) as words, never a time; each rail is in the order of the days, same-day places in the schedule\'s sequence; a place visited twice is one card with both days; undated places close the rail', () => {
  const laosRails = Object.fromEntries(rendered('laos').map((r) => [r.title, r.ids])), bkkRails = Object.fromEntries(rendered('bkk').map((r) => [r.title, r.ids]));
  assert.deepEqual(bkkRails['Cafés'], ['bkk-dior', 'bkk-lvcafe', 'bkk-mooyoo', 'bkk-timespace', 'bkk-whispering', 'bkk-harudot', 'bkk-madeleine', 'bkk-cafecraft'], 'Dior Café and LV Café (both 22.02, two locations since 22 Sep 2026) · Moo Yoo 11:45 · Time Space 13:15 · Whispering 15:15 · Harudot (23.02) · Madeleine (24.02) · Café Craft (07.03)');
  assert.deepEqual(bkkRails['Restaurants'], ['bkk-suhring', 'bkk-curvy', 'bkk-phranakorn', 'bkk-baanphraya', 'bkk-thongsmith', 'bkk-tangjaiyang', 'bkk-alati', 'bkk-cannubi', 'bkk-petitsplats', 'bkk-ledukaan'], 'Sühring 21.02 first … Petits Plats 08.03, the undated Le Du Kaan last');
  assert.deepEqual(laosRails['Bars & nightlife'], ['vte-sona', 'vte-selene', 'vte-baron'], 'Sona 25.02 · Selene 27.02 · BARON 28.02');
  assert.deepEqual(laosRails['Experiences'].slice(0, 3), ['vte-thatluang', 'vte-silkresidence', 'vte-ongteu'], 'Pha That Luang 25.02 09:45 · the Silk Residence 25.02 · Wat Ong Teu 28.02; the undated portrait after');
  assert.deepEqual(rendered('china'), [{ title: 'Experiences', ids: ['cn-blossom'] }], 'the China rail renders the cherry blossoms');
  assert.equal(D.dateWords(by['bkk-suhring']), 'Sunday, 21 February 2027'); assert.equal(D.dateWords(by['bkk-harudot']), 'Tuesday, 23 February · Sunday, 7 March 2027', 'one card, two days'); assert.equal(D.dateWords(by['vte-ongteu']), 'Sunday, 28 February 2027'); assert.equal(D.dateWords(by['vte-baron']), 'Sunday, 28 February 2027');
  assert.equal(D.dateWords(by['bkk-ledukaan']), '', 'an undated place shows no date'); assert.equal(D.dateWords(by['vte-patuxai']), '');
  for (const x of X) for (const v of x.visits || []) { assert.match(v.date, /^2027-0[23]-\d{2}$/, x.id + ' a real date'); assert.equal(typeof v.seq, 'number', x.id + ' a sequence'); assert.ok(v.day >= 1 && v.day <= 16); }
  /* the card: the date as words, in its own line, no clock */
  const card = src('experiences.html').slice(src('experiences.html').indexOf('function card(x)'), src('experiences.html').indexOf('function rail('));
  assert.match(card, /'<p class="x-when">' \+ esc\(when\) \+ '<\/p>'/); assert.doesNotMatch(card, /seq|\d\d:\d\d/, 'never a time on the card');
  assert.match(src('experiences.html'), /\.aslide \.x-when \{ font-family: 'PP Editorial Old'/, 'the date treatment is the editorial serif, italic, muted');
  const dated = X.filter((x) => x.visits && x.visits.length).length; assert.ok(dated >= 40 && X.length - dated <= 7, 'the itinerary dates every place the Operations Master schedules; the Vientiane portrait and one Bangkok address stay undated (' + (X.length - dated) + ')');
});

test('BARON VIENTIANE · the club of the wedding night: once, a CLUB in Bars & nightlife, the highlight rail\'s closing card, its own approved photographs (seven, the Owner\'s folder) and three films with sound; nothing borrowed, nothing leaked into another gallery', () => {
  const b = by['vte-baron'];
  assert.equal(b.where, 'Vientiane'); assert.equal(b.category, 'club'); assert.deepEqual(b.visits, [{ day: 8, date: '2027-02-28', seq: 2230, what: 'VIP After Party' }]);
  assert.match(b.practical.address.join(' '), /2nd floor above Starbucks/); assert.match(b.teaser, /VIP after party/);
  assert.equal(GAL['vte-baron'].images.length, 7); for (const im of GAL['vte-baron'].images) { assert.match(im.src, /^assets\/images\/experiences\/vte-baron-0[1-7]\.jpg$/); assert.ok(existsSync(join(ROOT, im.src))); assert.ok(['atmosphere', 'stage'].includes(im.kind)); }
  const rec = JSON.parse(src('src/experience-galleries.json'))['vte-baron']; assert.equal(rec.folderId, '1EUYKKbv78a3_zIkWFZG1y8KhxDV08H0b', 'the Owner\'s BARON folder'); for (const im of rec.images) assert.match(im.file, /^IMG_27(20|21|22|23|26|27|28)\.JPG$/);
  assert.equal(b.clips.length, 3); for (const c of b.clips) { assert.match(c.src, /^assets\/video\/baron-0[123]\.mp4$/); assert.ok(existsSync(join(ROOT, c.src)), c.src); assert.ok(existsSync(join(ROOT, c.poster)), c.poster); assert.match(c.poster, /^assets\/video\/baron-0[123]-poster\.jpg$/); }
  for (const c of b.clips) { const meta = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', join(ROOT, c.src)]).toString(); assert.match(meta, /audio/, c.src + ' carries a sound track'); }
  /* no BARON frame in any other record, no other record's frame in BARON */
  for (const [id, g] of Object.entries(GAL)) for (const im of g.images) assert.equal(/vte-baron/.test(im.src), id === 'vte-baron', im.src + ' belongs to ' + id);
  assert.ok(!Object.values(W.SIYL_EXP).some((x) => x.id !== 'vte-baron' && JSON.stringify(x).includes('baron')), 'no other record names BARON media');
  /* the highlight rail: BARON closes it; the detail page: the films with sound through the shared clip module */
  const h = src('experiences.html'); assert.match(h, /data-highlight-id="vte-baron"/); assert.ok(h.indexOf('data-highlight-id="vte-baron"') > h.indexOf('data-highlight-id="bkk-cannubi"'), 'the closing card');
  const e = src('experience.html'); assert.match(e, /<script src="assets\/clip\.js/); assert.match(e, /data-clip-sound aria-label="Sound on"/); assert.match(e, /if \(window\.SIYL_CLIP\) SIYL_CLIP\.init\(\);/); assert.match(e, /\.x-film\.is-tall \{ aspect-ratio: 9 \/ 16; \}/);
  assert.match(src('assets/clip.js'), /v\.muted = !wantSound;/, 'the film starts with sound where the browser allows, muted where it does not — the guest\'s tap on SOUND ON is the rule'); assert.doesNotMatch(src('assets/clip.js'), /muted = true;\s*$/m);
});

test('PETITS PLATS BANGKOK · one restaurant, Bangkok, 08.03.2027 (the last dinner), five photographs of its own folder, never another house\'s; WAT ONG TEU · one experience, the temple of the Alms Giving Ceremony (Sunday 28.02.2027), its photograph from the temple\'s own folder; the six overview venues the Discover had missed stand without a photograph', () => {
  const p = by['bkk-petitsplats']; assert.equal(p.category, 'restaurant'); assert.equal(p.where, 'Bangkok'); assert.deepEqual(p.visits, [{ day: 16, date: '2027-03-08', seq: 1900, what: 'Dinner' }]);
  assert.equal(GAL['bkk-petitsplats'].images.length, 5); assert.equal(p.img, GAL['bkk-petitsplats'].images[0].src);
  const rec = JSON.parse(src('src/experience-galleries.json')); assert.equal(rec['bkk-petitsplats'].folderId, '12W_HGO-5KHEbGXiw86FlHdzRUtlWSuNs'); for (const im of rec['bkk-petitsplats'].images) { assert.match(im.file, /^IMG_27(29|30|31|32|33)\.JPG$/); assert.match(im.src, /^assets\/images\/experiences\/bkk-petitsplats-0[1-5]\.jpg$/); assert.ok(!['food', 'drink'].includes(im.kind)); }
  const t = by['vte-ongteu']; assert.equal(t.category, 'experience'); assert.equal(t.where, 'Vientiane'); assert.deepEqual(t.visits, [{ day: 8, date: '2027-02-28', seq: 900, what: 'Alms Giving Ceremony' }]); assert.match(t.cats, /Temple/);
  assert.equal(t.img, 'assets/images/experiences/vte-ongteu-01.jpg'); assert.ok(existsSync(join(ROOT, t.img)));
  const inv = JSON.parse(src('src/experience-inventory.json')); const ti = inv.find((e) => e.id === 'vte-ongteu'); assert.equal(ti.drive, '050 - Event - Temple Ceremony - Wat Ong Teu Vientiane'); assert.match(ti.note, /DSC07779/);
  assert.match(src('voyage.html'), /Wat Ong Teu, Vientiane/, 'the same temple the ceremony names');
  /* THE SEVEN VENUES (Owner, 22 Sep 2026): each has the photographs of its own Drive folder — never a fallback, never another house's */
  const FOLDER = { 'bkk-cafecraft': '1nCcRkh44-OQMUMp0F0A8ZFXYRxC5joLq', 'bkk-siamparagon': '1QxgoS2aWXC2DWKh_c6Y0fTYOz06JhW8r', 'bkk-firefly': '1LCCnMXVkMkPnyhmprr0OHPyEHJBCLAqt', 'vte-camon': '1PkPZxgrH9-RVegM0LNkOw8TVozD0ejZ7', 'vte-lecafe': '1KvH_yBzmFYbVAYppbFgOCSg0m8-L3LVB', 'vte-selene': '14s46H44ZY51udx9TA6ts5QyAxN7snjUK', 'vte-ongteu': '1N-LCD10lVQrR6bqh9BxqRKsuhdYtO7Wl', 'bkk-dior': '1T8LtqEK358_5mdEC-y_Uu5HnZ8Jnyv4h', 'bkk-lvcafe': '1oBn04Bq8QBQglAzOrtKFtxRtD_AYzweS' };
  const REC = JSON.parse(src('src/experience-galleries.json'));
  for (const [id, folderId] of Object.entries(FOLDER)) {
    assert.ok(by[id], id); assert.ok(by[id].img && existsSync(join(ROOT, by[id].img)), id + ' lead on disk');
    assert.ok(GAL[id] && GAL[id].images.length >= 2, id + ' gallery'); assert.equal(GAL[id].images[0].src, by[id].img, id + ' leads with its lead');
    assert.equal(REC[id].folderId, folderId, id + ' from its own Drive folder');
    for (const im of GAL[id].images) { assert.ok(im.src.startsWith('assets/images/experiences/' + REC[id].slug + '-'), im.src + ' carries ' + id + '\'s own slug'); assert.ok(existsSync(join(ROOT, im.src)), im.src); assert.ok(!['food', 'drink'].includes(im.kind), im.src + ' is never a dish or a glass'); }
    assert.ok(by[id].visits.length >= 1, id + ' dated');
  }
  /* no frame of these venues appears in any other record */
  for (const [id, g] of Object.entries(GAL)) for (const im of g.images) { const owner = Object.keys(FOLDER).find((k) => im.src.includes('/' + REC[k].slug + '-')); if (owner) assert.equal(owner, id, im.src + ' belongs to ' + owner + ', not ' + id); }
  assert.equal(by['vte-lacuna'].category, 'cafe'); assert.deepEqual(by['vte-lacuna'].visits.map((v) => v.what), ['Coffee', 'Evening drinks'], 'Lacuna: one café card, its evening noted — never a second bar card');
  /* the photographs on disk: every one a frame of a record or a lead; every record's frame on disk */
  const onDisk = readdirSync(join(ROOT, 'assets/images/experiences')).filter((f) => /\.jpg$/.test(f));
  const known = new Set(Object.values(GAL).flatMap((g) => g.images.map((im) => im.src.split('/').pop())).concat(X.map((x) => x.img && x.img.split('/').pop()).filter(Boolean)));
  for (const f of onDisk) assert.ok(known.has(f) || f === 'vte-oathhouse.jpg', f + ' is a frame of a record'); for (const f of known) assert.ok(onDisk.includes(f), f + ' on disk');
});

test('THE JOURNEY IN NUMBERS · counted from unique places: 14 restaurants · 11 cafés · 6 bars & nightlife · 4 museums · 2 temples & stupas — no house counted twice, nothing gone still counted', () => {
  assert.deepEqual(D.counts(), { restaurants: 14, cafes: 11, nightlife: 6, museums: 4, temples: 2 }, 'recomputed from the canonical records — eleven cafés since Dior and LV became two places');
  const names = (c) => X.filter((x) => x.category === c).map((x) => x.name).sort();
  assert.deepEqual(names('restaurant'), ['3 Merchants Restaurant', 'ALATi', 'Baan Phraya', 'Cam On Restaurant', 'Cannubi by Umberto Bombana', 'Curvy.Dining', 'Lao Derm', 'Le Du Kaan', 'Petits Plats Bangkok', 'Phra Nakhon', 'River Moon', 'Sühring', 'Tang Jai Yang', 'Thong Smith']);
  assert.deepEqual(names('cafe'), ['Cafe Madeleine', 'Café Craft by CHANINTR', 'Dior Café', 'Harudot', 'Kaogee Le Triomphe', 'LV Café', 'Lacuna VTE', 'Le Café at Souphattra Heritage', 'Moo Yoo Rose House', 'Time Space Cafe', 'Whispering Cafe']);
  assert.deepEqual(names('bar').concat(names('club')), ['BKK Social Club', 'Bar Us', 'Firefly Bar, Siam Kempinski', 'Selene Sky Bar', 'Sona Cafe and Bar', 'BARON Vientiane']);
  assert.match(src('assets/community.js'), /var D = window\.SIYL_DISCOVER, c = D \? D\.counts\(\) : null;/, 'the numbers read the one taxonomy'); assert.match(src('profile.html'), /<script src="assets\/discover\.js/);
});
