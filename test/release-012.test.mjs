/* RELEASE 012 (Owner, 19 Sep 2026) — the media model of The Journey and the Experiences, and the Riverside Hotel.
   · THE JOURNEY: every accommodation card is a gallery composed from the stay media record (src/stay-media.json → assets/stay-media.js):
     a window with several hotels shows every hotel by name; the transport galleries stay; one gallery grammar (arrows, swipe,
     keyboard, 1 / N, lazy frames, stable geometry)
   · THE STAY MEDIA RECORD: the hotel taxonomy, every frame with its kind, caption and Owner source; the lead shows the house
   · THE EXPERIENCE TAXONOMY: every frame carries its kind; no restaurant, café or bar shows a dish or a glass; Bar Us' rejected
     cocktail set is gone from the record and from disk; Thong Smith, Tang Jai Yang and Le Du Kaan show the place
   · CAFÉS: the eight Café entries of Restaurant_Experience,Cafe,Bar_Details carry the cafe role on the website
   · THE RIVERSIDE HOTEL: package D3 in the inventory, the pricing, the journey, the stage maps, the emails, the menu, THE HOUSES */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { src, page, PEGGY, doState } from './sandbox.mjs';
import { Rooms } from '../src/rooms.js';
import { SEED } from '../src/inventory-seed.js';
import { composeGuestMail } from '../src/mail-templates.js';

const load = () => { const w = {}; new Function('window', src('assets/experiences.js'))(w); new Function('window', src('assets/experience-galleries.js'))(w); new Function('window', src('assets/stay-media.js'))(w); new Function('window', src('assets/rooms-data.js'))(w); return w; };
const W = load();
const REC = JSON.parse(src('src/experience-galleries.json')), STAY = JSON.parse(src('src/stay-media.json'));
const rolesOf = Object.fromEntries(W.SIYL_EXP.map((x) => [x.id, x.roles]));
const catOf = (id) => { const r = rolesOf[id] || []; return r.includes('bar') ? 'bar' : r.includes('cafe') ? 'cafe' : r.some((x) => /lunch|dinner|breakfast/.test(x)) ? 'restaurant' : 'experience'; };

test('STAY MEDIA · the record is the module; every frame is a hotel kind of the hotel it names, on disk, captioned, sourced; the lead shows the house; the Riverside Hotel has no frame and says why', () => {
  assert.equal(execFileSync('node', ['src/build-stay-media.cjs', '--check'], { cwd: process.cwd() }).toString().trim(), 'STAY MEDIA: current (9 hotels)');
  const kinds = STAY._taxonomy.hotel;
  assert.deepEqual(kinds, ['exterior', 'architecture', 'lobby', 'room', 'suite', 'pool', 'grounds', 'facilities']);
  for (const [key, h] of Object.entries(STAY)) {
    if (key.startsWith('_')) continue;
    const seen = new Set();
    for (const im of h.images) { assert.ok(kinds.includes(im.kind), key + ' ' + im.kind); assert.ok(existsSync(im.src), im.src); assert.ok(im.caption && /Owner Drive/.test(im.source), key + ' caption and source'); assert.ok(!seen.has(im.src), key + ' no duplicate'); seen.add(im.src); }
    assert.deepEqual(W.SIYL_STAY_MEDIA[key].images.map((im) => im.src), h.images.map((im) => im.src), key + ' module = record');
    if (h.images.length && !h.lead) assert.ok(!h.images.some((im) => ['exterior', 'architecture', 'pool', 'grounds', 'lobby'].includes(im.kind)) || ['exterior', 'architecture', 'pool', 'grounds', 'lobby'].includes(h.images[0].kind), key + ' leads with the house');
  }
  assert.equal(STAY.riverside.images.length, 0); assert.match(STAY.riverside.note, /No photograph of the Riverside Hotel exists in the Owner's Drive/);
  /* every hotel's frames are its own: the folder in `source` names the hotel */
  const own = { sathornPenthouse: /020/, uSathorn: /026/, shamaYenAkat: /027/, souphattra: /021/, privateResidence: /022/, wanxiang: /023/, luyeBaisha: /024/, kempinski: /025/ };
  for (const [k, rx] of Object.entries(own)) for (const im of STAY[k].images) assert.match(im.source, rx, k + ' · ' + im.src + ' comes from its own folder');
});

test('THE JOURNEY · every accommodation card is a stay gallery from the record — Bangkok Before the Wedding shows its three addresses, the Wedding window its three (Souphattra · Private Residence · Riverside), the transport galleries stay', () => {
  const j = src('journeys.html');
  assert.match(j, /<script src="assets\/stay-media\.js(?:\?v=[0-9a-f]{8})?"><\/script>/, 'the record is loaded');
  assert.doesNotMatch(j, /class="pimg"/, 'no single-photograph accommodation card remains');
  const gal = Object.fromEntries([...j.matchAll(/<div class="p" id="(j-[a-z-]+)"[^>]*><div class="pgal stay" data-stay-gal="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(gal, { 'j-bkk-stay': 'sathornPenthouse,uSathorn,shamaYenAkat', 'j-prewed': 'souphattra', 'j-wedstay': 'souphattra', 'j-residence': 'privateResidence', 'j-riverside': 'riverside', 'j-kmg': 'wanxiang', 'j-ljg': 'luyeBaisha', 'j-kempinski': 'kempinski' });
  for (const keys of Object.values(gal)) for (const k of keys.split(',')) assert.ok(STAY[k], k + ' is a hotel of the record');
  assert.equal((j.match(/<div class="pgal" data-gal="/g) || []).length, 4, 'the four transport galleries stay (the train, MU9646, C86, the return)');
  assert.match(j, /three addresses for this window: the Souphattra Heritage, the Private Residence and the Riverside Hotel/);
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
    if (cat !== 'experience') assert.ok(['interior', 'dining-room', 'counter', 'architecture', 'exterior', 'design'].includes(g.images[0].kind), id + ' leads with the place, not ' + g.images[0].kind);
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

test('CAFÉ CATEGORY AUDIT · the eight Café entries of Restaurant_Experience,Cafe,Bar_Details carry the cafe role; the Cafés rail is exactly them', () => {
  /* the Cafe column of the details tab (8) plus Kaogee Le Triomphe, which the Overview's Cafe column (Day 06) and the Owner's folder "128 - Cafe - Kaogee Le Triomphe" carry as a café beside its restaurant listing */
  const sourceCafes = { 'bkk-diorlv': 'Dior and LV Cafe', 'bkk-timespace': 'Time Space Cafe', 'bkk-mooyoo': 'Moo Yoo Rose House', 'bkk-whispering': 'Whispering Cafe', 'bkk-madeleine': 'Cafe Madeleine', 'bkk-harudot': 'Harudot', 'vte-sona': 'Sona Cafe and Bar', 'vte-lacuna': 'Lacuna VTE', 'vte-kaogee': 'Kaogee Le Triomphe' };
  for (const id of Object.keys(sourceCafes)) assert.ok(rolesOf[id].includes('cafe'), sourceCafes[id] + ' is a café on the website');
  const websiteCafes = W.SIYL_EXP.filter((x) => x.roles.includes('cafe')).map((x) => x.id).sort();
  assert.deepEqual(websiteCafes, Object.keys(sourceCafes).sort(), 'no café beyond the source, none missing');
  assert.match(src('experiences.html'), /\['Cafés', \['cafe'\]\]/, 'the rail is the cafe role');
  assert.ok(rolesOf['bkk-mooyoo'].includes('lunch'), 'Moo Yoo stays a lunch place too (Overview Day 03)');
});

test('RIVERSIDE HOTEL · package D3 everywhere: the inventory (6 rooms · 2 places, the wedding window), the pricing (USD 30 × 2 nights), the journey ids, the stage maps, the engine, the emails, the menu, THE HOUSES, the room page', async () => {
  const unit = SEED['riverside/superior-window']; assert.deepEqual(unit, { unit: 'room', capacity: 6, occupancy: 2, held: 0, name: 'Superior Room With Window', stay: 'Riverside Hotel Vientiane' });
  const w = page({ auth: PEGGY }); const P = w.SIYL_PRICE, J = w.SIYL_JOURNEY, R = w.SIYL_ROOMS;
  assert.equal(R.riverside.name, 'Riverside Hotel Vientiane'); assert.equal(R.riverside.rooms[0].rate, 30); assert.equal(R.riverside.rooms[0].facts[0][1], '22 sq.m.'); assert.equal(R.riverside.rooms[0].gallery.length, 0, 'no Owner photograph exists: nothing invented');
  const q = P.quote('riverside', 'superior-window'); assert.equal(q.total, 60); assert.equal(q.nights, 2); assert.equal(q.pay, 2); assert.equal(q.hosted, 0); assert.equal(q.breakfast, 'Breakfast included'); assert.match(q.nightsList.join(' '), /27 → 28 February.*28 February → 01 March/);
  const it = P.items('riverside', 'superior-window')[0]; assert.equal(it.price, 60); assert.equal(it.name, 'Riverside Hotel Vientiane'); assert.equal(it.img, null);
  assert.deepEqual(JSON.parse(JSON.stringify(J.SEGMENTS.find((s) => s.key === 'wedstay').ids)), ['wedstay', 'airbnb-2br', 'riverside'], 'one wedding-window stage, three addresses');
  assert.equal(w.SIYL_UNITS.stageOf('riverside/superior-window'), 'wedstay');
  for (const f of ['src/rooms.js', 'src/mail-templates.js', 'assets/rooms.js']) assert.match(src(f), /riverside: 'wedstay'/, f + ' stage map');
  /* the engine: a Riverside hold and a Souphattra hold are the same stage — one replaces the other */
  const rooms = new Rooms(doState()); const me = { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false };
  const call = async (op, body) => { const r = await rooms.fetch(new Request('https://x/api/rooms/' + op, { method: 'POST', headers: { 'x-siyl-identity': JSON.stringify(me) }, body: JSON.stringify(body || {}) })); return { status: r.status, d: await r.json() }; };
  let r = await call('join', { invitationId: me.invitationId, guestId: me.guestId, key: 'riverside/superior-window', label: 'A', name: 'Peggy' }); assert.equal(r.status, 200); assert.deepEqual(r.d.mine, { wedstay: { key: 'riverside/superior-window', label: 'A' } });
  assert.equal(r.d.units['riverside/superior-window'].length, 6); assert.equal(r.d.summary['riverside/superior-window'].places, 12);
  r = await call('join', { invitationId: me.invitationId, guestId: me.guestId, key: 'wedstay/heritage', label: 'A', name: 'Peggy' }); assert.equal(r.status, 200); assert.deepEqual(r.d.mine, { wedstay: { key: 'wedstay/heritage', label: 'A' } }); assert.equal(r.d.units['riverside/superior-window'][0].taken, 0, 'the Riverside place was released');
  /* the emails name the stay from the seed */
  const rec = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', kind: 'initial', version: 1, submittedAt: '2026-09-19T10:00:00.000Z', firstSentAt: '2026-09-19T10:00:00.000Z', lastSentAt: '2026-09-19T10:00:00.000Z', recipient: { email: 'sam@example.org', phone: '+66 81 000 0000' },
    rooms: { wedstay: { stage: 'wedstay', key: 'riverside/superior-window', label: 'B', name: 'Superior Room With Window', stay: 'Riverside Hotel Vientiane', room: 'Room B' } },
    registration: { channel: 'journey-shop', guestId: 'G777', totalUsd: 60, contact: { email: 'sam@example.org', phone: '+66 81 000 0000' }, selections: [it], guestRecord: { guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } };
  const m = composeGuestMail(rec); assert.ok(m.text.includes('Riverside Hotel Vientiane'), 'the stay'); assert.ok(m.text.includes('Room B'), 'the room'); assert.ok(m.text.includes('USD 60'), 'the amount');
  /* the surfaces */
  assert.match(src('assets/aman.js'), /\['Riverside Hotel Vientiane', 'room\.html\?stay=riverside&room=superior-window'\]/, 'the menu');
  assert.match(src('accommodation.html'), /<h3>Riverside Hotel<\/h3>/); assert.match(src('accommodation.html'), /Seven places<br>along one journey/); assert.match(src('accommodation.html'), /am-pend[^>]*>\s*<span>Photography to follow<\/span>/);
  assert.match(src('journeys.html'), /<div class="p" id="j-riverside">/); assert.match(src('journeys.html'), /href="room\.html\?stay=riverside&amp;room=superior-window">View the hotel<\/a>/);
  assert.match(src('room.html'), /Photography to follow/, 'the room page keeps the frame when a stay has no photograph');
});

/* CODEX 012-1 (final pass, 19 Sep 2026) · ONE SELECTION PER STAGE. The Wedding Stay is answered by Souphattra, the private
   residence or the Riverside Hotel: the engine holds one place per stage, so the Bag carries one line per stage — switching
   hotels never leaves the previous priced line behind, a leftover line never releases the current hold, the total is the
   chosen hotel's alone, readiness never names a stale room. */
test('ONE WEDDING STAY · switching among Souphattra, the residence and the Riverside Hotel in every direction: one Bag line, one total, one engine hold, readiness clean; a leftover line leaves without touching the current hold', async () => {
  const { roomsFetch } = await import('./sandbox.mjs');
  const me = { invitationId: PEGGY.invitationId, guestId: PEGGY.guestId, partyId: PEGGY.partyId, hosts: false };
  const rooms = new Rooms(doState());
  const w = page({ auth: PEGGY, fetch: await roomsFetch(rooms, me) }); await w.SIYL_UNITS.load(true);
  const B = w.SIYL_BAG, ST = w.SIYL_STAY, U = w.SIYL_UNITS, G = w.SIYL_GUEST, J = w.SIYL_JOURNEY, P = w.SIYL_PRICE;
  G.setContact('email', 'guest@example.com'); G.setContact('phone', '+66 81 234 5678'); G.setScope({ vientiane: true });
  const HOTELS = [['wedstay', 'heritage', 145], ['riverside', 'superior-window', 60], ['airbnb-2br', 'private-residence', 0]];
  const stageLines = () => B.get().filter((x) => J.SEGMENTS.find((s) => s.key === 'wedstay').ids.includes(x.id));
  const taken = (key) => (U.view().units[key] || []).reduce((n, u) => n + (u.taken || 0), 0);
  assert.deepEqual(JSON.parse(JSON.stringify(ST.stageIds('riverside'))).sort(), ['airbnb-2br', 'riverside', 'wedstay', 'wedstay-n1', 'wedstay-n2'].sort(), 'every id that answers the stage, the legacy rows included');
  for (const [w1, s1, t1] of HOTELS) for (const [w2, s2, t2] of HOTELS) {
    if (w1 === w2) continue;
    B.set([]); await ST.remove(w1); await ST.remove(w2);
    assert.equal((await ST.select(w1, s1)).ok, true, w1 + ' first');
    assert.equal(stageLines().length, 1); assert.equal(B.total(), t1);
    assert.equal(ST.sibling(w2) && ST.sibling(w2).id, P.ids(w1)[0], 'the other hotel\'s page knows what it replaces');
    assert.equal((await ST.select(w2, s2)).ok, true, w1 + ' → ' + w2);
    const lines = stageLines();
    assert.equal(lines.length, 1, w1 + ' → ' + w2 + ': one line'); assert.equal(lines[0].id, w2); assert.equal(B.total(), t2, w1 + ' → ' + w2 + ': the total is the chosen hotel\'s alone');
    assert.deepEqual(JSON.parse(JSON.stringify(U.view().mine)), { wedstay: { key: w2 + '/' + s2, label: U.view().mine.wedstay.label } }, 'one engine hold');
    assert.equal(taken(w1 + '/' + s1), 0, w1 + ' released'); assert.equal(taken(w2 + '/' + s2), 1, w2 + ' held');
    assert.equal(ST.held(lines[0]), true); assert.deepEqual(JSON.parse(JSON.stringify(G.staleFor())), [], 'nothing held outside the trip');
    assert.equal(G.missingFor('journey').some((m) => /^room:/.test(m.key)), false, w1 + ' → ' + w2 + ': readiness names no stale room');
  }
  /* a leftover line (an older draft, another device): the engine holds the Riverside, the Bag also carries Souphattra */
  B.set([]); await ST.remove('wedstay'); await ST.remove('riverside');
  assert.equal((await ST.select('riverside', 'superior-window')).ok, true);
  P.items('wedstay', 'heritage').forEach((it) => { it.qty = 1; it.unit = 'A'; B.put(it); });
  assert.equal(stageLines().length, 2); assert.equal(B.total(), 205, 'the state Codex reproduced');
  /* removing the leftover line does NOT release the Riverside hold */
  assert.deepEqual(JSON.parse(JSON.stringify(await ST.remove('wedstay'))), { ok: true });
  assert.equal(stageLines().length, 1); assert.equal(stageLines()[0].id, 'riverside'); assert.equal(B.total(), 60);
  assert.equal(U.view().mine.wedstay.key, 'riverside/superior-window', 'the current hold stays'); assert.equal(taken('riverside/superior-window'), 1);
  /* the same leftover is dropped by the engine sync on any page load */
  P.items('wedstay', 'heritage').forEach((it) => { it.qty = 1; it.unit = 'A'; B.put(it); }); assert.equal(stageLines().length, 2);
  ST.sync(); assert.equal(stageLines().length, 1); assert.equal(stageLines()[0].id, 'riverside'); assert.equal(B.total(), 60, 'sync keeps the held hotel only');
  /* Not joining the stage with a leftover present: the leftover leaves, the held place is released, the stage is declined */
  P.items('wedstay', 'heritage').forEach((it) => { it.qty = 1; it.unit = 'A'; B.put(it); });
  const d = await J.decline(J.SEGMENTS.find((s) => s.key === 'wedstay')); assert.deepEqual(JSON.parse(JSON.stringify(d)), { ok: true });
  assert.equal(stageLines().length, 0); assert.deepEqual(JSON.parse(JSON.stringify(U.view().mine)), {}, 'the engine holds nothing'); assert.equal(taken('riverside/superior-window'), 0);
  assert.equal(J.isSkipped('wedstay'), true);
  /* the surfaces say what is replaced */
  assert.match(src('room.html'), /var ids = ST && ST\.stageIds \? ST\.stageIds\(w\.id\) : P\.ids\(w\.id\);/, 'the room page reads the stage');
  assert.match(src('room.html'), /\(elsewhere \? ' at ' \+ ST\.houseOf\(other\) : ''\) \+ ' for this stay — adding this room replaces it\.'/);
  assert.equal(ST.houseOf(P.items('wedstay', 'heritage')[0]), 'Souphattra Heritage Vientiane', 'the house is named, never the window'); assert.equal(ST.houseOf(P.items('riverside', 'superior-window')[0]), 'Riverside Hotel Vientiane');
  assert.match(src('journeys.html'), /var sib=ST\.sibling\?ST\.sibling\(win\):null;/); assert.match(src('journeys.html'), /for this stay — choosing a room here replaces it\./);
});
