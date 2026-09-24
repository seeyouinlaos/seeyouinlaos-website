/* RELEASE 012 (Owner, 19 Sep 2026) — the media model of The Journey and the Experiences, and the Riverside Hotel.
   · THE JOURNEY: every accommodation card is a gallery composed from the stay media record (src/stay-media.json → assets/stay-media.js):
     a window with several hotels shows every hotel by name; the transport galleries stay; one gallery grammar (arrows, swipe,
     keyboard, 1 / N, lazy frames, stable geometry)
   · THE STAY MEDIA RECORD: the hotel taxonomy, every frame with its kind, caption and Owner source; the lead shows the house
   · THE EXPERIENCE TAXONOMY: every frame carries its kind; no restaurant, café or bar shows a dish or a glass; Bar Us' rejected
     cocktail set is gone from the record and from disk; Thong Smith, Tang Jai Yang and Le Du Kaan show the place
   · CAFÉS: the eight Café entries of Restaurant_Experience,Cafe,Bar_Details carry the cafe role on the website
   · THE RIVERSIDE HOTEL: package D3 in the inventory, the pricing, the journey, the stage maps, the emails, the menu, THE HOUSES
   RELEASE 014 (Owner, 19 Sep 2026): the "Private Residence" is gone — the wedding window's second address is D2 · Guest House
   complimentary (record key guestHouse, window guesthouse, room guest-house, card #j-guesthouse); the Riverside Hotel's frames
   come from the Owner's Riverside folder and are read from the record, never pinned to a count. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { src, page, plain, PEGGY, doState } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { composeGuestMail } from '../src/mail-templates.js';

const load = () => { const w = {}; new Function('window', src('assets/experiences.js'))(w); new Function('window', src('assets/experience-galleries.js'))(w); new Function('window', src('assets/stay-media.js'))(w); new Function('window', src('assets/rooms-data.js'))(w); return w; };
const W = load();
const REC = JSON.parse(src('src/experience-galleries.json')), STAY = JSON.parse(src('src/stay-media.json'));
const rolesOf = Object.fromEntries(W.SIYL_EXP.map((x) => [x.id, x.roles]));
const categoryOf = Object.fromEntries(W.SIYL_EXP.map((x) => [x.id, x.category]));
/* the taxonomy (22 Sep 2026): the category is the record's own field; a shopping place shows its venue context as an experience does */
const catOf = (id) => { const c = categoryOf[id]; return c === 'place' ? 'experience' : c; };

test('STAY MEDIA · the record is the module; every frame is a hotel kind of the hotel it names, on disk, captioned, sourced; the lead shows the house; the Riverside Hotel\'s frames are read from the record (the Owner\'s folder, never a fixed count); the Guest House complimentary replaces the "Private Residence"', () => {
  assert.equal(execFileSync('node', ['src/build-stay-media.cjs', '--check'], { cwd: process.cwd() }).toString().trim(), 'STAY MEDIA: current (6 hotels)', 'the Sathorn Penthouse deleted (Edit 6) and Shama Yen-Akat deleted (24 Sep 2026): six hotels');
  const kinds = STAY._taxonomy.hotel;
  assert.deepEqual(kinds, ['exterior', 'architecture', 'lobby', 'room', 'suite', 'pool', 'grounds', 'facilities']);
  for (const [key, h] of Object.entries(STAY)) {
    if (key.startsWith('_')) continue;
    const seen = new Set();
    for (const im of h.images) { assert.ok(kinds.includes(im.kind), key + ' ' + im.kind); assert.ok(existsSync(im.src), im.src); assert.ok(im.caption && /Owner Drive/.test(im.source), key + ' caption and source'); assert.ok(!seen.has(im.src), key + ' no duplicate'); seen.add(im.src); }
    assert.deepEqual(W.SIYL_STAY_MEDIA[key].images.map((im) => im.src), h.images.map((im) => im.src), key + ' module = record');
    if (h.images.length && !h.lead) assert.ok(!h.images.some((im) => ['exterior', 'architecture', 'pool', 'grounds', 'lobby'].includes(im.kind)) || ['exterior', 'architecture', 'pool', 'grounds', 'lobby'].includes(h.images[0].kind), key + ' leads with the house');
  }
  /* the Riverside Hotel is read from the record, never pinned to a count (release 014: the Owner's Riverside folder replaced the
     release-012 'Photography to follow' frame): with frames, none is invented and the note never claims there is none; without
     any, the note says why */
  /* RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026): it is not a hotel of the record any more */
  assert.equal(STAY.riverside, undefined, 'the retired Riverside is still in the media record');
  if (false) assert.doesNotMatch('', /never/, 'a photographed hotel never says it has no frame');
  /* D2 · Guest House complimentary (Owner, 19 Sep 2026): the record key is guestHouse; no "Private Residence" key, name or caption remains */
  assert.equal(STAY.privateResidence, undefined); assert.equal(W.SIYL_STAY_MEDIA.privateResidence, undefined);
  assert.equal(STAY.guestHouse.name, 'Guest House complimentary · Vientiane'); assert.ok(STAY.guestHouse.images.length > 0, 'the guest house shows its frames');
  for (const im of STAY.guestHouse.images) assert.match(im.src, /^assets\/images\/guesthouse\/guesthouse-0[1-6]\.jpg$/, 'the guest house frames live in their own folder');
  assert.doesNotMatch(src('src/stay-media.json') + src('assets/stay-media.js'), /Private Residence|privateResidence|up to 4/, 'the invented label is gone from the record and the module');
  /* every hotel's frames are its own: the folder in `source` names the hotel */
  /* SATHORN PENTHOUSE BANGKOK IS DELETED (Owner, 24 Sep 2026 · Edit 6): not a hotel of the record, not in the module */
  assert.equal(STAY.sathornPenthouse, undefined, 'the deleted Penthouse is still in the media record'); assert.equal(W.SIYL_STAY_MEDIA.sathornPenthouse, undefined);
  /* SHAMA YEN-AKAT BANGKOK IS DELETED (Owner, 24 Sep 2026): not a hotel of the record, not in the module, nothing replaces it */
  assert.equal(STAY.shamaYenAkat, undefined, 'the deleted Shama is still in the media record'); assert.equal(W.SIYL_STAY_MEDIA.shamaYenAkat, undefined);
  assert.doesNotMatch(src('src/stay-media.json') + src('assets/stay-media.js'), /Shama|images\/shama\//, 'no Shama frame, name or caption remains in the record or the module');
  const own = { uSathorn: /026/, souphattra: /021/, guestHouse: /022/, wanxiang: /023/, luyeBaisha: /024/, kempinski: /025/ };
  for (const [k, rx] of Object.entries(own)) for (const im of STAY[k].images) assert.match(im.source, rx, k + ' · ' + im.src + ' comes from its own folder');
});

test('THE JOURNEY · every accommodation card is a stay gallery from the record — Bangkok Before the Wedding shows its one address (U Sathorn; the Penthouse and Shama deleted), the Wedding window its two (Souphattra · Guest House complimentary), the transport galleries stay', () => {
  const j = src('journeys.html');
  assert.match(j, /<script src="assets\/stay-media\.js(?:\?v=[0-9a-f]{8})?"><\/script>/, 'the record is loaded');
  assert.doesNotMatch(j, /class="pimg"/, 'no single-photograph accommodation card remains');
  const gal = Object.fromEntries([...j.matchAll(/<div class="p" id="(j-[a-z-]+)"[^>]*><div class="pgal stay" data-stay-gal="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(gal, { 'j-bkk-stay': 'uSathorn', 'j-prewed': 'souphattra', 'j-wedstay': 'souphattra', 'j-guesthouse': 'guestHouse', 'j-kmg': 'wanxiang', 'j-ljg': 'luyeBaisha', 'j-kempinski': 'kempinski' });
  for (const keys of Object.values(gal)) for (const k of keys.split(',')) assert.ok(STAY[k], k + ' is a hotel of the record');
  assert.doesNotMatch(j, /sathornPenthouse|Sathorn Penthouse/, 'The Journey names no Penthouse');
  assert.doesNotMatch(j.replace(/<!--[\s\S]*?-->/g, ''), /shamaYenAkat|Shama/, 'The Journey names no Shama');
  assert.equal((j.match(/<div class="pgal" data-gal="/g) || []).length, 4, 'the four transport galleries stay (the train, MU9646, C86, the return)');
  assert.match(j, /two addresses for this window: the Souphattra Heritage and the Guest House complimentary below/, 'Souphattra · Guest House (Owner, 23 Sep 2026: the Riverside is retired)');
  /* D2 · Guest House complimentary (Owner, 19 Sep 2026): its card names the house, its status, four shared places (one bedroom, Edit 7), the room page; the invented label is gone */
  assert.match(j, /<div class="p" id="j-guesthouse">[^]*?<p class="pn">Guest House complimentary<\/p>[^]*?<p class="pp" data-private>USD 0 · Complimentary<\/p><p class="pb" data-private>Both nights hosted by Haruthai &amp; Suthep · four shared places · nothing to pay<\/p><a class="vw" data-cta-swap href="room\.html\?stay=guesthouse&amp;room=guest-house">View the guest house<\/a>/);
  assert.doesNotMatch(j, /Private Residence|j-residence|privateResidence|airbnb-2br|up to 4/, 'no "Private Residence", no "up to 4" on The Journey');
  /* one grammar: frames name their hotel in a multi-hotel window; arrows, keyboard, lazy frames, the empty frame */
  assert.match(j, /out\.push\(\[im\.src,\(multi\?h\.name\+' · ':''\)\+im\.caption,h\.name,im\.kind\]\)/, 'a multi-hotel gallery names the hotel on every frame');
  assert.match(j, /aria-roledescription="carousel"/); assert.match(j, /e\.key==='ArrowRight'/); assert.match(j, /e\.key==='ArrowLeft'/); assert.match(j, /e\.key==='Home'/); assert.match(j, /e\.key==='End'/);
  assert.match(j, /data-bg="'\+x\[0\]\+'"/, 'frames after the first two load when the guest moves'); assert.match(j, /Photography to follow/);
  assert.match(j, /\.pgal\.stay \.ph\{aspect-ratio:5\/4\}/, 'the card keeps the 5:4 photograph geometry on the phone'); assert.match(src("assets/desktop.css"), /\.gal \.ph, \.trk \.ph, \.pgal\.stay \.ph \{ aspect-ratio: 3 \/ 2; \}/, "and 3:2 on the desktop, as before");
  assert.match(j, /aria-label="Previous photograph"/); assert.match(j, /aria-label="Next photograph"/);
});

test('MEDIA TAXONOMY · every experience frame carries its kind; no restaurant, café or bar shows a dish or a glass; the builder is the gate', () => {
  const tax = REC._taxonomy; assert.deepEqual(tax.never, ['food', 'drink']);
  const gal = W.SIYL_EXP_GALLERY;
  for (const [id, g] of Object.entries(REC)) {
    if (id.startsWith('_')) continue;
    const cat = catOf(id), allowed = tax[cat];
    for (const im of g.images) { assert.ok(im.kind, id + ' kind'); assert.ok(!tax.never.includes(im.kind), id + ' never a ' + im.kind); assert.ok(allowed.includes(im.kind), id + ' ' + im.kind + ' is a ' + cat + ' kind'); assert.ok(existsSync(im.src), im.src); }
    assert.deepEqual(gal[id].images.map((im) => im.kind), g.images.map((im) => im.kind), id + ' module carries the kinds');
    if (cat !== 'experience' && cat !== 'club') assert.ok(['interior', 'dining-room', 'counter', 'architecture', 'exterior', 'design'].includes(g.images[0].kind), id + ' leads with the place, not ' + g.images[0].kind);
    if (cat === 'club') assert.ok(['atmosphere', 'stage', 'interior'].includes(g.images[0].kind), id + ' leads with the night');
  }
  /* the builder refuses a dish */
  const bad = JSON.parse(JSON.stringify(REC)); bad['bkk-thongsmith'].images[0].kind = 'food';
  const r = execFileSync('node', ['-e', `
    const fs=require('fs');const p='src/experience-galleries.json';const orig=fs.readFileSync(p,'utf8');fs.writeFileSync(p,${JSON.stringify(JSON.stringify(bad))});
    const cp=require('child_process');const res=cp.spawnSync('node',['src/build-experience-galleries.cjs'],{encoding:'utf8'});fs.writeFileSync(p,orig);
    cp.spawnSync('node',['src/build-experience-galleries.cjs']);process.stdout.write(String(res.status)+' '+(res.stderr||''));`], { cwd: process.cwd() }).toString();
  assert.match(r, /^1 EXPERIENCE GALLERIES: bkk-thongsmith .*a food photograph never stands for a place/);
});

test('RESTAURANT MEDIA AUDIT · Thong Smith, Tang Jai Yang and Le Du Kaan show the place; Bar Us\' rejected cocktail set is gone from the record and from disk; the retired frames are not served', () => {
  for (const id of ['bkk-thongsmith', 'bkk-tangjaiyang', 'bkk-ledukaan', 'bkk-suhring', 'vte-laoderm', 'bkk-alati', 'bkk-phranakorn', 'vte-3merchants']) {
    for (const im of REC[id].images) assert.ok(!/food|drink/.test(im.kind) && !/dish|bowl|noodle|plate|dessert|cake|cocktail|martini|brunch plates/i.test(im.alt), id + ' · ' + im.alt);
    assert.equal(W.SIYL_EXP.find((x) => x.id === id).img, REC[id].images[0].src, id + ' lead = first frame');
  }
  assert.deepEqual(REC['bkk-thongsmith'].images.map((im) => im.kind), ['interior', 'interior', 'exterior', 'exterior']);
  assert.deepEqual(REC['bkk-tangjaiyang'].images.map((im) => im.kind), ['interior'], 'the Owner\'s folder holds one photograph of the room (the other four are dishes)');
  assert.deepEqual(REC['bkk-ledukaan'].images.map((im) => im.kind), ['interior', 'architecture', 'dining-room', 'atmosphere']);
  /* Bar Us: the tray martini (Drive 15HTZthAvxk6mjhd1Jtsucf0hy9Z-qRfb) and every cocktail frame are gone — not moved */
  const barus = REC['bkk-barus'];
  assert.deepEqual(barus.images.map((im) => im.kind), ['interior', 'counter']);
  for (const drive of ['15HTZthAvxk6mjhd1Jtsucf0hy9Z-qRfb', '1tFixLwt0Iu8_D1Jxnb0zDnzHROx6njle', '16LVMqf2mn9RF8kqCXCftmTfpc4PrZwg1', '1RuU_cAASbSHBdVUtvG1yvy9mc5e451ic', '1sX4tYMsaOAxCUDEaJewcoPtcstyn_glf']) assert.ok(!barus.images.some((im) => im.drive === drive), 'rejected ' + drive + ' absent');
  for (const f of ['bkk-barus-01.jpg', 'bkk-barus-02.jpg', 'bkk-barus-03.jpg', 'bkk-barus-04.jpg', 'bkk-barus-05.jpg']) assert.ok(!existsSync('assets/images/experiences/' + f), f + ' not on disk');
  assert.doesNotMatch(src('assets/experiences.js') + src('assets/experience-galleries.js') + src('assets/images/ASSET-MAP.md'), /bkk-barus-0[1-5]\.jpg/, 'no page, module or map references a rejected frame');
  const inv = JSON.parse(src('src/experience-inventory.json'));
  for (const e of inv) if (REC[e.id]) { assert.deepEqual(e.gallery, REC[e.id].images.map((im) => im.src), e.id + ' inventory gallery'); assert.equal(e.primary, REC[e.id].images[0].src); }
  /* no orphan frame on disk */
  const frames = new Set(Object.entries(REC).filter(([k]) => !k.startsWith('_')).flatMap(([, g]) => g.images.map((im) => im.src.split('/').pop())));
  const leads = new Set([...src('assets/experiences.js').matchAll(/img: 'assets\/images\/experiences\/([^']+)'/g)].map((m) => m[1]));
  for (const f of readdirSync('assets/images/experiences')) assert.ok(frames.has(f) || leads.has(f) || f === 'vte-oathhouse.jpg', f + ' orphan');
});

test('CAFÉ CATEGORY AUDIT · the cafés of the source carry the cafe category — one each, never a lunch or a bar beside it (the taxonomy, 22 Sep 2026); Sona is the bar it is; the Cafés rail is the cafe category', () => {
  /* the Cafe column of the details tab plus Kaogee Le Triomphe (the Overview's Cafe column, Day 06) and the two cafés the overview named on 07.03 and 27.02 */
  /* TWO HOUSES (Owner, 22 Sep 2026): the source's "Cafe Dior / LV Cafe" is two places, each its own café card */
  const sourceCafes = { 'bkk-dior': 'Dior Café', 'bkk-lvcafe': 'LV Café', 'bkk-timespace': 'Time Space Cafe', 'bkk-mooyoo': 'Moo Yoo Rose House', 'bkk-whispering': 'Whispering Cafe', 'bkk-madeleine': 'Cafe Madeleine', 'bkk-harudot': 'Harudot', 'vte-lacuna': 'Lacuna VTE', 'vte-kaogee': 'Kaogee Le Triomphe', 'bkk-cafecraft': 'Café Craft by CHANINTR', 'vte-lecafe': 'Le Café at Souphattra Heritage' };
  for (const id of Object.keys(sourceCafes)) assert.deepEqual(rolesOf[id], ['cafe'], sourceCafes[id] + ' is a café on the website, and only that');
  const websiteCafes = W.SIYL_EXP.filter((x) => x.category === 'cafe').map((x) => x.id).sort();
  assert.deepEqual(websiteCafes, Object.keys(sourceCafes).sort(), 'no café beyond the source, none missing');
  assert.deepEqual(rolesOf['vte-sona'], ['bar'], 'Sona Cafe and Bar is the bar it is (Owner, 22 Sep 2026) — never a second café card');
  assert.deepEqual(rolesOf['bkk-mooyoo'], ['cafe'], 'Moo Yoo is a café — lunch there does not make it a restaurant');
  assert.match(src('assets/discover.js'), /\{ key: 'cafe', title: 'Cafés', cats: \['cafe'\] \}/, 'the rail is the cafe category');
});

test('RIVERSIDE HOTEL VIENTIANE IS COMPLETELY RETIRED (Owner, 23 Sep 2026): no stock, no property record, no media, no price, no card, no link', () => {
  /* the stock of both its products is gone, and nothing replaced them */
  assert.equal(SEED['riverside/superior-window'], undefined, 'the wedding-stay Riverside still has stock');
  assert.equal(SEED['stayext/riverside-superior'], undefined, 'the retired extension still has stock');
  assert.equal(Object.keys(SEED).filter((k) => /riverside/i.test(k)).length, 0);
  const w = page({ auth: PEGGY, modules: ['assets/rooms-data.js', 'assets/stay-media.js', 'assets/pricing.js', 'assets/journey.js'] });
  assert.equal(w.SIYL_ROOMS.riverside, undefined, 'the property record is gone');
  assert.equal(w.SIYL_STAY_MEDIA.riverside, undefined, 'the media record is gone');
  assert.equal(w.SIYL_PRICE.quote('riverside', 'superior-window'), null, 'there is no price');
  /* the wedding stage answers with the Souphattra and the Guest House alone */
  assert.deepEqual(plain(w.SIYL_JOURNEY.SEGMENTS.find((s) => s.key === 'wedstay').ids), ['wedstay', 'guesthouse']);
  /* and no guest-facing surface links to it */
  for (const f of ['accommodation.html', 'journeys.html', 'voyage.html', 'profile.html', 'room.html', 'assets/aman.js', 'assets/rooms-data.js', 'assets/stay-media.js']) {
    const body = src(f).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(body, /riverside/i, f + ' still names the retired house');
  }
});

test('ONE WEDDING STAY · switching between Souphattra and the Guest House complimentary in every direction: one Bag line, one total, one engine hold, readiness clean; a leftover line leaves without touching the current hold', async () => {
  const { roomsFetch } = await import('./sandbox.mjs');
  const me = { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false };
  const rooms = new Rooms(doState());
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS, G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, P = w.SIYL_PRICE;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); G.setScope({ vientiane: true });
  const HOTELS = [['wedstay', 'heritage', 145], ['guesthouse', 'guest-house', 0]];
  const stageLines = () => B.get().filter((x) => J.SEGMENTS.find((s) => s.key === 'wedstay').ids.includes(x.id));
  const taken = (key) => (U.view().units[key] || []).reduce((n, u) => n + (u.taken || 0), 0);
  assert.deepEqual(JSON.parse(JSON.stringify(ST.stageIds('guesthouse'))).sort(), ['guesthouse', 'wedstay', 'wedstay-n1', 'wedstay-n2'].sort(), 'every id that answers the stage, the legacy rows included');
  for (const [w1, s1, t1] of HOTELS) for (const [w2, s2, t2] of HOTELS) {
    if (w1 === w2) continue;
    B.set([]); await ST.remove(w1); await ST.remove(w2);
    assert.equal((await ST.select(w1, s1)).ok, true, w1 + ' first');
    assert.equal(stageLines().length, 1); assert.equal(B.total(), t1);
    assert.equal(ST.sibling(w2) && ST.sibling(w2).id, P.ids(w1)[0], 'the other hotel\'s page knows what it replaces');
    assert.equal((await ST.select(w2, s2)).ok, true, w1 + ' → ' + w2);
    const lines = stageLines();
    assert.equal(lines.length, 1, w1 + ' → ' + w2 + ': one line'); assert.equal(lines[0].id, w2); assert.equal(B.total(), t2, w1 + ' → ' + w2 + ': the total is the chosen hotel\'s alone');
    if (w2 === 'guesthouse') { assert.equal(lines[0].complimentary, true, 'the guest house line is complimentary'); assert.equal(lines[0].price, 0); assert.equal(lines[0].interest, false, 'a place actually held, never an interest'); assert.equal(lines[0].unit, 'A', 'the one shared unit of the house'); }
    assert.deepEqual(JSON.parse(JSON.stringify(U.view().mine)), { wedstay: { key: w2 + '/' + s2, label: U.view().mine.wedstay.label } }, 'one engine hold');
    assert.equal(taken(w1 + '/' + s1), 0, w1 + ' released'); assert.equal(taken(w2 + '/' + s2), 1, w2 + ' held');
    assert.equal(ST.held(lines[0]), true); assert.deepEqual(JSON.parse(JSON.stringify(G.staleFor())), [], 'nothing held outside the trip');
    assert.equal(G.missingFor('journey').some((m) => /^room:/.test(m.key)), false, w1 + ' → ' + w2 + ': readiness names no stale room');
  }
  /* a leftover line (an older draft, another device): the engine holds the Guest House, the Bag also carries Souphattra — the
     state is written behind the Bag's back (a Bag change is reconciled at once, see 012-2) */
  B.set([]); await ST.remove('wedstay'); await ST.remove('guesthouse');
  assert.equal((await ST.select('guesthouse', 'guest-house')).ok, true);
  const leftover = () => { const it = P.items('wedstay', 'heritage')[0]; it.qty = 1; it.unit = 'A'; w.localStorage.setItem('siyl.bag', JSON.stringify(B.get().concat([it]))); };
  leftover(); assert.equal(stageLines().length, 2); assert.equal(B.total(), 145, 'the state Codex reproduced');
  /* removing the leftover line does NOT release the Guest House hold */
  assert.deepEqual(JSON.parse(JSON.stringify(await ST.remove('wedstay'))), { ok: true });
  assert.equal(stageLines().length, 1); assert.equal(stageLines()[0].id, 'guesthouse'); assert.equal(B.total(), 0);
  assert.equal(U.view().mine.wedstay.key, 'guesthouse/guest-house', 'the current hold stays'); assert.equal(taken('guesthouse/guest-house'), 1);
  /* the same leftover is dropped by the engine sync on any page load */
  leftover(); assert.equal(stageLines().length, 2);
  ST.sync(); assert.equal(stageLines().length, 1); assert.equal(stageLines()[0].id, 'guesthouse'); assert.equal(B.total(), 0, 'sync keeps the held hotel only');
  /* Not joining the stage with a leftover present: the leftover leaves, the held place is released, the stage is declined */
  leftover(); assert.equal(stageLines().length, 2);
  const d = await J.decline(J.SEGMENTS.find((s) => s.key === 'wedstay')); assert.deepEqual(JSON.parse(JSON.stringify(d)), { ok: true });
  assert.equal(stageLines().length, 0); assert.deepEqual(JSON.parse(JSON.stringify(U.view().mine)), {}, 'the engine holds nothing'); assert.equal(taken('guesthouse/guest-house'), 0);
  assert.equal(J.isSkipped('wedstay'), true);
  /* the surfaces say what is replaced */
  assert.match(src('room.html'), /var ids = ST && ST\.stageIds \? ST\.stageIds\(w\.id\) : P\.ids\(w\.id\);/, 'the room page reads the stage');
  assert.match(src('room.html'), /\(elsewhere \? ' at ' \+ ST\.houseOf\(other\) : ''\) \+ ' for this stay — adding this room replaces it\.'/);
  assert.equal(ST.houseOf(P.items('wedstay', 'heritage')[0]), 'Souphattra Heritage Vientiane', 'the house is named, never the window'); /* the retired Riverside has no product to name */ assert.equal(P.items('riverside', 'superior-window').length, 0); assert.equal(ST.houseOf(P.items('guesthouse', 'guest-house')[0]), 'Guest House complimentary');
  assert.match(src('journeys.html'), /var sib=ST\.sibling\?ST\.sibling\(win\):null;/); assert.match(src('journeys.html'), /for this stay — choosing a room here replaces it\./);
});

/* CODEX 012-2 (confirming pass, 19 Sep 2026) · two orderings: (a) a device whose engine view is older than the guest's switch
   removes its Souphattra line — the release must not take the Riverside the guest holds meanwhile; (b) a delayed draft copy
   replayed onto a fresh choice carries the other hotel's line back — the engine remains the truth and the leftover leaves. */
test('ONE WEDDING STAY · a stale device\'s Remove releases only its own window; a replayed draft copy never keeps two hotels', async () => {
  const { roomsFetch } = await import('./sandbox.mjs');
  const me = { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false };
  const rooms = new Rooms(doState());
  const call = async (op, body) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
  /* (a) the engine: a release that names its window */
  let r = await call('join', { invitationId: me.invitationId, guestId: me.guestId, key: 'guesthouse/guest-house', label: 'A', name: 'Peggy' }); assert.equal(r.status, 200);
  r = await call('leave', { invitationId: me.invitationId, guestId: me.guestId, stage: 'wedstay', window: 'wedstay' });
  assert.equal(r.status, 200); assert.deepEqual(r.d.released, [], 'nothing of the Souphattra window is held: nothing goes'); assert.equal(r.d.mine.wedstay.key, 'guesthouse/guest-house', 'the Riverside hold stays');
  r = await call('leave', { invitationId: me.invitationId, guestId: me.guestId, stage: 'wedstay', window: 'guesthouse' });
  assert.deepEqual(r.d.released, [{ key: 'guesthouse/guest-house', label: 'A' }]); assert.deepEqual(r.d.mine, {});
  r = await call('join', { invitationId: me.invitationId, guestId: me.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }); assert.equal(r.status, 200);
  r = await call('leave', { invitationId: me.invitationId, guestId: me.guestId, stage: 'wedstay' }); assert.equal(r.d.released.length, 1, 'without a window the stage-wide release stays as it was (the planner\'s reconciliation)');
  /* the two devices: both read the engine while Souphattra is held; device 1 switches to the Riverside; device 2 still shows Souphattra */
  const d1 = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await d1.SIYL_UNITS.load(true);
  const d2 = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) });
  assert.equal((await d1.SIYL_STAY.select('wedstay', 'heritage')).ok, true);
  await d2.SIYL_UNITS.load(true); d2.SIYL_STAY.sync(); assert.equal(d2.SIYL_BAG.get()[0].id, 'wedstay', 'device 2 carries the Souphattra line from the engine');
  assert.equal((await d1.SIYL_STAY.select('guesthouse', 'guest-house')).ok, true); assert.equal(d1.SIYL_BAG.total(), 0);
  assert.equal(d2.SIYL_UNITS.mine('wedstay').key, 'wedstay/heritage', 'device 2 has not read the engine since');
  const rm = await d2.SIYL_STAY.remove('wedstay'); assert.equal(rm.ok, true);
  assert.equal(d2.SIYL_UNITS.mine('wedstay').key, 'guesthouse/guest-house', 'the release answered with the truth: the houseside is still held');
  assert.equal(d2.SIYL_BAG.get().length, 1); assert.equal(d2.SIYL_BAG.get()[0].id, 'guesthouse', 'device 2 now carries the held hotel, never nothing, never both'); assert.equal(d2.SIYL_BAG.total(), 0);
  const v = await call('mine', {}); assert.equal(v.d.mine.wedstay.key, 'guesthouse/guest-house');
  /* (b) the draft replay: the copy read before the choice had no stay line, the server's copy carries Souphattra, the device
     chose the Riverside meanwhile — the replay keeps both (the draft module knows no stages) and the engine sync settles it */
  const D = d1.SIYL_DRAFT || (() => { const w = page({ auth: PEGGY, modules: ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/draft.js'] }); return w.SIYL_DRAFT; })();
  const souphattra = d1.SIYL_PRICE.items('wedstay', 'heritage')[0], house = d1.SIYL_BAG.get()[0];
  const replayed = JSON.parse(D._replay('siyl.bag', '[]', JSON.stringify([house]), JSON.stringify([souphattra])));
  assert.deepEqual(replayed.map((x) => x.id).sort(), ['guesthouse', 'wedstay'], 'the replay alone would carry both');
  const settled = () => new Promise((res) => setTimeout(res, 30));
  d1.localStorage.setItem('siyl.bag', JSON.stringify(replayed)); d1.document.dispatchEvent(new d1.CustomEvent('siyl:bag'));
  assert.equal(d1.SIYL_BAG.get().length, 2, 'nothing is dropped on this device\'s copy of the engine'); await settled();
  assert.deepEqual(JSON.parse(JSON.stringify(d1.SIYL_BAG.get().map((x) => x.id))), ['guesthouse'], 'the engine was read again and the sync settled it: the leftover left'); assert.equal(d1.SIYL_BAG.total(), 0);
  /* the same replay on a device whose engine view is OLDER than the switch (it still shows Souphattra): the fresh read wins —
     the held Riverside line is kept, never dropped on the stale copy */
  const d3 = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await d3.SIYL_UNITS.load(true); d3.SIYL_STAY.sync();
  d3.SIYL_UNITS._set(Object.assign({}, d3.SIYL_UNITS.view(), { mine: { wedstay: { key: 'wedstay/heritage', label: 'A' } } }));
  d3.localStorage.setItem('siyl.bag', JSON.stringify(replayed)); d3.document.dispatchEvent(new d3.CustomEvent('siyl:bag'));
  assert.equal(d3.SIYL_BAG.get().length, 2); await settled();
  assert.deepEqual(JSON.parse(JSON.stringify(d3.SIYL_BAG.get().map((x) => x.id))), ['guesthouse'], 'the stale device keeps the held hotel, drops the leftover'); assert.equal(d3.SIYL_UNITS.mine('wedstay').key, 'guesthouse/guest-house');
  assert.match(src('assets/stay.js'), /document\.addEventListener\('siyl:bag', function \(\) \{ ST\.settle\(\); \}\);/);
  /* a Bag change that does not look like two hotels in one stage reads nothing and changes nothing: a held stay removed behind
     the engine's back is NOT brought back here (the planner's reconciliation keeps its order — CODEX 011-7) */
  d1.SIYL_BAG.remove('guesthouse'); assert.equal(d1.SIYL_STAY.settle(), false); await settled(); assert.equal(d1.SIYL_BAG.get().length, 0, 'no line comes back on a Bag change'); assert.equal(d1.SIYL_UNITS.mine('wedstay').key, 'guesthouse/guest-house');
  d1.SIYL_STAY.sync(); assert.equal(d1.SIYL_BAG.get()[0].id, 'guesthouse', 'the engine sync brings the held line back, as before');
  assert.match(src('assets/stay.js'), /return u\.leave\(stageOf\(win\), win\)\.then/, 'a Remove names its window'); assert.match(src('src/rooms.js'), /const win = String\(body && body\.window \|\| ''\)\.trim\(\);/);
});
