/* MY PROFILE · THE RETURN PAGE (Owner, 21 Sep 2026): who's joining us (the Worker's community read), the countdown, the journey
   in numbers, the in-prose link (the strikethrough on the Owner's iPhone). */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, plain, src, PEGGY } from './sandbox.mjs';

const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
async function assetsFor(entries) { const index = JSON.stringify({ v: 2, entries }); return { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('not found', { status: 404 }) }; }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix)).map((name) => ({ name })), list_complete: true }), delete: async (k) => { m.delete(k); } }; }
const reg = (inv, gid, o = {}) => JSON.stringify({ invitationId: inv, guestId: gid, hosts: !!o.hosts, submittedAt: o.at || '2026-09-18T10:00:00.000Z', firstSentAt: o.at || '2026-09-18T10:00:00.000Z', version: o.v || 1,
  registration: { guestId: gid, contact: { email: gid.toLowerCase() + '@example.org', phone: '+66 81 000 0000' }, selections: [{ id: 'wedstay', room: 'heritage', price: 145 }], guestRecord: { scope: o.scope || { bangkok: false, vientianePreWedding: false, vientianeWedding: true, china: false, none: false }, contact: { email: 'x@example.org' }, guests: [{ guestId: gid, name: o.name || gid, source: { fullName: (o.name || gid) + ' Example', preferredName: o.name || gid }, submitted: o.submitted || {} }] } } });
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('demo-peggy-comm'), steffie = await bearerOf('demo-steffie-comm');
  const entries = {}; entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' }; entries[await authIdOf(steffie)] = { i: 'INV-G002', g: 'G002', p: 'INV-002', c: 'CON004', k: 'COUPL002' };
  /* the couple, by the register's role — never by a name */
  entries['a'.repeat(64)] = { i: 'INV-G049', g: 'G049', p: 'INV-001', h: 1, r: 'G', c: 'CON001', k: 'COUPL001' }; entries['b'.repeat(64)] = { i: 'INV-G048', g: 'G048', p: 'INV-001', h: 1, r: 'B', c: 'CON002', k: 'COUPL001' };
  const store = kv(); const env = { ASSETS: await assetsFor(entries), REG_KV: store, GR_TOKEN: 'gr-secret' };
  return { w, env, store, peggy, steffie };
}
const get = (h, bearer, path) => h.w.fetch(new Request(ORIGIN + (path || '/api/community'), { headers: bearer ? { 'x-siyl-auth': bearer } : {} }), h.env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null), h: r.headers }));

test('WHO\'S JOINING US · the Worker: an authenticated read only; the Groom and the Bride always first (by the register\'s role, named as they spell themselves, a day only when a trip was genuinely sent); then every guest whose trip was sent and who is joining — first names as currently spelled, a portrait flag, the day; declines are not guests; the hosts are never counted as guests; newest first; nothing private; nothing written', async () => {
  const h = await harness();
  assert.equal((await get(h, null)).status, 401);
  assert.equal((await h.w.fetch(new Request(ORIGIN + '/api/community', { method: 'POST', headers: { 'x-siyl-auth': h.peggy } }), h.env)).status, 405);
  let r = await get(h, h.peggy); assert.equal(r.status, 200);
  assert.deepEqual(r.d.guests, [{ guestId: 'G049', name: 'Suthep', photo: false, joinedAt: null, role: 'Groom' }, { guestId: 'G048', name: 'Haruthai', photo: false, joinedAt: null, role: 'Bride' }], 'before anyone has sent a trip the couple already stands there — no record, no day, the first names every page prints');
  assert.equal(r.d.count, 2); assert.equal(r.d.couple, 2);
  const m = h.store.m;
  m.set('reg:INV-G010', { v: reg('INV-G010', 'G010', { name: 'Peggy', at: '2026-09-18T10:00:00.000Z' }) });
  m.set('reg:INV-G011', { v: reg('INV-G011', 'G011', { name: 'Lin', at: '2026-09-20T12:00:00.000Z', submitted: { preferredName: 'Linnea' } }) });
  m.set('reg:INV-G012', { v: reg('INV-G012', 'G012', { name: 'Sam', at: '2026-09-19T08:00:00.000Z' }) });
  m.set('contact:INV-G012', { v: JSON.stringify({ email: 's@example.org', phone: '+66', firstName: 'Samuel', lastName: 'Acker', birthdate: '1990-05-17' }) });
  m.set('reg:INV-G013', { v: reg('INV-G013', 'G013', { name: 'Nora', scope: { none: true } }) });                /* responded: not joining */
  m.set('reg:INV-G048', { v: reg('INV-G048', 'G048', { name: 'Haruthai', hosts: true, at: '2026-09-15T09:00:00.000Z' }) });   /* the Bride's own record: she keeps her place, gains her day, is never a guest */
  m.set('contact:INV-G049', { v: JSON.stringify({ email: 'g@example.org', phone: '+66', firstName: 'Thep', lastName: 'T' }) });   /* the Groom as he spells himself */
  m.set('avatar:INV-G049', { v: new Uint8Array([9]).buffer, meta: { type: 'image/jpeg', at: 'x' } });
  m.set('avatar:INV-G012', { v: new Uint8Array([1, 2, 3]).buffer, meta: { type: 'image/jpeg', at: 'x' } });
  m.set('draft:INV-G099', { v: JSON.stringify({ keys: {} }) });                                                    /* a draft alone is no answer */
  m.set('reg:INV-G010:prev:2026-09-17T10:00:00.000Z', { v: reg('INV-G010', 'G010', { name: 'Peggy', at: '2026-09-17T10:00:00.000Z' }) });   /* an earlier version of a sent trip — never a second guest */
  r = await get(h, h.peggy); assert.equal(r.status, 200); assert.equal(r.d.count, 5, 'the count is the visible population: the couple and three guests'); assert.equal(r.d.couple, 2);
  assert.deepEqual(r.d.guests.slice(0, 2), [{ guestId: 'G049', name: 'Thep', photo: true, joinedAt: null, role: 'Groom' }, { guestId: 'G048', name: 'Haruthai', photo: false, joinedAt: '2026-09-15', role: 'Bride' }], 'Groom then Bride; his portrait and his own spelling; her genuine day');
  assert.deepEqual(r.d.guests.slice(2), [{ guestId: 'G011', name: 'Linnea', photo: false, joinedAt: '2026-09-20' }, { guestId: 'G012', name: 'Samuel', photo: true, joinedAt: '2026-09-19' }, { guestId: 'G010', name: 'Peggy', photo: false, joinedAt: '2026-09-18' }], 'the contact\'s first name wins, then the submitted one, then the invitation\'s; newest first');
  const text = JSON.stringify(r.d); for (const bad of ['@example.org', '+66', 'birthdate', 'Acker', 'wedstay', 'heritage', 'INV-', 'selections', 'email']) assert.ok(!text.includes(bad), 'never ' + bad);
  assert.match(r.h.get('cache-control') || '', /private/);
  const before = [...m.keys()].sort().join(); await get(h, h.steffie); assert.equal([...m.keys()].sort().join(), before, 'a read writes nothing');
  assert.equal((await get(h, h.steffie)).d.count, 5, 'the partner reads the same community — identity information only');
  assert.doesNotMatch(src('src/worker.js'), /===\s*['"]Suthep['"]|===\s*['"]Haruthai['"]/, 'the couple is chosen by role, never by a name match');
  assert.match(src('register/auth-index.json'), /"i":"INV-G049","g":"G049","p":"INV-001","h":1,"r":"G"/); assert.match(src('register/auth-index.json'), /"i":"INV-G048","g":"G048","p":"INV-001","h":1,"r":"B"/, 'the register names the roles'); assert.equal((src('register/auth-index.json').match(/"r":/g) || []).length, 2, 'two roles, no more');
});

test('THE COUNTDOWN · days to 21 February 2027 from the clock; the wedding once the journey has begun; never negative; the hours are never a clock', () => {
  const w = page({ auth: PEGGY, modules: ['assets/community.js'] }); const C = w.SIYL_COMMUNITY;
  const at = (y, mo, d, h) => new Date(y, mo - 1, d, h == null ? 12 : h);
  assert.deepEqual(plain(C.countdown(at(2026, 9, 21))), { phase: 'before', n: 153, unit: 'days', lead: 'The journey begins in', tail: '21 February 2027 · Bangkok' });
  assert.equal(C.countdown(at(2026, 9, 21, 23)).n, 153, 'a day is a day, whatever the hour'); assert.equal(C.countdown(at(2026, 9, 22, 0)).n, 152);
  assert.equal(C.countdown(at(2027, 2, 20)).n, 1); assert.equal(C.countdown(at(2027, 2, 20)).unit, 'day');
  assert.deepEqual(plain(C.countdown(at(2027, 2, 21))), { phase: 'start', n: 0, unit: 'today', lead: 'The journey begins', tail: 'Today · 21 February 2027 · Bangkok' });
  const j = C.countdown(at(2027, 2, 24)); assert.equal(j.phase, 'journey'); assert.equal(j.n, 4); assert.match(j.tail, /28 February 2027 · Vientiane · day 04 of the journey/);
  assert.equal(C.countdown(at(2027, 2, 28)).phase, 'wedding'); assert.equal(C.countdown(at(2027, 2, 28)).n, 0);
  const a = C.countdown(at(2027, 3, 4)); assert.equal(a.phase, 'after'); assert.equal(a.n, 12); assert.equal(a.unit, 'of 16 days');
  const d = C.countdown(at(2027, 4, 1)); assert.equal(d.phase, 'done'); assert.equal(d.n, 16);
  for (const t of [at(2026, 1, 1), at(2027, 2, 21), at(2027, 2, 28), at(2027, 3, 8), at(2028, 1, 1)]) assert.ok(C.countdown(t).n >= 0, 'never negative');
  assert.doesNotMatch(src('assets/community.js'), /\b15[0-9]\b\s*(days|,)/, 'no remaining-days value is written into the code'); assert.doesNotMatch(src('assets/community.js'), /setInterval/, 'no ticking clock');
  const html = C.countdownHtml(at(2026, 9, 21)); assert.match(html, /data-countdown="before"/); assert.match(html, /data-count-to="153"/); assert.match(html, /The journey begins · in/); assert.match(html, /21 February 2027 · Bangkok/); assert.match(html, /data-count-to="160"/, 'the wedding count, 22 Sep 2026: wedding first');
});

test('THE JOURNEY IN NUMBERS · every number counted from the canonical data on the page; nothing invented; a category that cannot be counted is absent', () => {
  const w = page({ auth: PEGGY, modules: ['assets/rooms-data.js', 'assets/stay-media.js', 'assets/transport-data.js', 'assets/experiences.js', 'assets/discover.js', 'assets/stage-graph.js', 'assets/community.js'] });
  const N = plain(w.SIYL_COMMUNITY.numbers()); const by = {}; N.forEach((x) => { by[x.key] = x; });
  const M = w.SIYL_STAY_MEDIA, E = Object.values(w.SIYL_EXP), T = w.SIYL_TRANSPORT;
  assert.equal(by.countries.n, 3); assert.equal(by.countries.note, 'Thailand · Laos · China');
  assert.equal(by.cities.n, new Set(Object.keys(M).map((k) => M[k].city).filter(Boolean)).size); assert.equal(by.cities.n, 4);
  assert.equal(by.stays.n, Object.keys(M).filter((k) => k !== '_taxonomy').length); assert.equal(by.stays.n, 9);
  assert.equal(by.nights.n, 3 + 2 + 2 + 3 + 2 + 2 + 1, 'the six stays of the journey and the night on the train'); assert.equal(by.days.n, 16); assert.match(by.days.note, /21 February – 8 March 2027/);
  assert.equal(by.trains.n, Object.values(T).filter((t) => /railway/i.test(t.operator)).length); assert.equal(by.trains.n, 2);
  assert.equal(by.flights.n, 3); assert.equal(by.flights.note, 'MU9646 · MU5922 · MU741');
  /* THE TAXONOMY (Owner, 22 Sep 2026): one place, one category, counted once — never lunch + café for one house, never café + bar for one bar */
  const cat = (x) => x.category;
  assert.equal(by.restaurants.n, E.filter((x) => cat(x) === 'restaurant').length); assert.equal(by.cafes.n, E.filter((x) => cat(x) === 'cafe').length); assert.equal(by.bars.n, E.filter((x) => cat(x) === 'bar' || cat(x) === 'club').length);
  assert.equal(by.museums.n, E.filter((x) => cat(x) === 'experience' && /Museum/.test(x.cats)).length); assert.equal(by.temples.n, E.filter((x) => cat(x) === 'experience' && /Temple|Stupa/.test(x.cats)).length);
  assert.deepEqual({ r: by.restaurants.n, c: by.cafes.n, b: by.bars.n, m: by.museums.n, t: by.temples.n }, { r: 14, c: 10, b: 6, m: 4, t: 2 }, 'the real totals of the corrected dataset: 14 restaurants (Petits Plats and Cam On in, Time Space / Moo Yoo / Kaogee out) · 10 cafés · 6 bars & nightlife (BARON, Selene, Firefly in; Sona once) · 4 museums (Wat Si Saket gone) · 2 temples & stupas (Wat Ong Teu, Pha That Luang)');
  assert.equal(by.bars.label, 'Bars & nightlife');
  const names = (c) => E.filter((x) => cat(x) === c).map((x) => x.name);
  assert.ok(names('restaurant').includes('Petits Plats Bangkok') && !names('restaurant').includes('Time Space Cafe') && !names('restaurant').includes('Moo Yoo Rose House') && !names('restaurant').includes('Kaogee Le Triomphe'));
  assert.ok(names('cafe').includes('Harudot') && names('cafe').includes('Time Space Cafe') && names('cafe').includes('Moo Yoo Rose House') && names('cafe').includes('Kaogee Le Triomphe') && !names('cafe').includes('Sona Cafe and Bar'));
  assert.ok(names('bar').includes('Sona Cafe and Bar') && names('club').includes('BARON Vientiane') && names('experience').includes('Wat Ong Teu') && !E.some((x) => /That Dam|Wat Si Saket|Wat Si Muang/.test(x.name)));
  assert.equal(by.michelin, undefined, 'Michelin stars: only one record carries a structured star (Cannubi) — not shown rather than guessed');
  assert.equal(N.length, 12); assert.ok(N.every((x) => Number.isInteger(x.n) && x.n > 0 && x.label));
  const bare = page({ auth: PEGGY, modules: ['assets/community.js'] }); assert.deepEqual(plain(bare.SIYL_COMMUNITY.numbers()), [], 'no data on the page, no numbers'); assert.equal(bare.SIYL_COMMUNITY.numbersHtml(), '');
  const html = w.SIYL_COMMUNITY.numbersHtml(); assert.match(html, /The journey in numbers/); assert.equal((html.match(/data-count-to=/g) || []).length, 12); assert.doesNotMatch(html, /data-stat="michelin"/);
});

test('WHO\'S JOINING US · the page: the count, the names, initials where no photo, the portrait through the existing authenticated read, small and empty states, no private field on the page', async () => {
  const w = page({ auth: PEGGY, modules: ['assets/community.js'] }); const C = w.SIYL_COMMUNITY;
  assert.match(C.communityHtml(null), /data-community="loading"/);
  assert.match(C.communityHtml({ ok: true, count: 0, guests: [] }), /data-community="0"/); assert.match(C.communityHtml({ ok: true, count: 0, guests: [] }), /yours could be the first/);
  const d = { ok: true, count: 2, guests: [{ guestId: 'G011', name: 'Linnea', photo: false, joinedAt: '2026-09-20' }, { guestId: PEGGY.guestId, name: 'Peggy', photo: true, joinedAt: '2026-09-18' }] };
  const h = C.communityHtml(d); assert.match(h, /data-community="2"/); assert.match(h, /2 guests have joined so far/, 'without the couple the guest wording stands'); assert.match(h, /You are among them/); assert.match(h, /data-ava="G011"[^>]*aria-label="Linnea"><i aria-hidden="true">L<\/i>/, 'initials until a portrait arrives'); assert.match(h, /Recently joined/); assert.doesNotMatch(h, /@|\+66|INV-/);
  const one = C.communityHtml({ ok: true, count: 1, guests: [{ guestId: 'G011', name: 'Linnea', photo: false, joinedAt: null }] }); assert.match(one, /1 guest has joined so far/);
  const c = C.communityHtml({ ok: true, count: 4, couple: 2, guests: [{ guestId: 'G049', name: 'Suthep', photo: true, joinedAt: null, role: 'Groom' }, { guestId: 'G048', name: 'Haruthai', photo: false, joinedAt: null, role: 'Bride' }, { guestId: 'G011', name: 'Linnea', photo: false, joinedAt: '2026-09-20' }, { guestId: PEGGY.guestId, name: 'Peggy', photo: true, joinedAt: '2026-09-18' }] }, PEGGY);
  assert.match(c, /data-community="4" data-couple="2"/); assert.match(c, /4 of us are joining so far/, 'one inclusive wording when the couple stands in the count'); assert.doesNotMatch(c, /guests have joined/);
  assert.match(c, /data-person="G049" data-role="Groom"[^]*?<span class="pf-person-n">Suthep<\/span><span class="pf-person-r">Groom<\/span>/); assert.match(c, /data-person="G048" data-role="Bride"[^]*?<span class="pf-person-n">Haruthai<\/span><span class="pf-person-r">Bride<\/span>/, 'SUTHEP · GROOM and HARUTHAI · BRIDE (uppercase by the stylesheet)');
  assert.ok(c.indexOf('data-person="G049"') < c.indexOf('data-person="G048"') && c.indexOf('data-person="G048"') < c.indexOf('data-person="G011"'), 'the couple first');
  assert.match(c, /Recently joined<\/p><p class="t-b1">Linnea · Peggy<\/p>/, 'RECENTLY JOINED lists genuine days only, newest first — the couple without a day is not in it'); assert.match(c, /You are among them/);
  assert.match(src('profile.html'), /\.pf-person-r\{[^}]*text-transform:uppercase/);
  assert.match(src('profile.html'), /CM\.countdownHtml\(\)\+CM\.communityHtml\(CM\.data\(\),me\)\+CM\.numbersHtml\(\)/, 'the three stand between the account and the arrangements'); assert.match(src('profile.html'), /<script src="assets\/community\.js/);
  assert.match(src('assets/community.js'), /AV\.of\(gid\)/, 'portraits through SIYL_AVATAR.of — the existing authenticated read'); assert.doesNotMatch(src('assets/community.js'), /photo\?of=|api\/profile\/photo/, 'no photo URL of its own');
  assert.match(src('assets/community.js'), /prefers-reduced-motion: reduce/); assert.match(src('profile.html'), /@media\(prefers-reduced-motion:reduce\)\{\.pf-person\{opacity:1;transform:none;transition:none\}\}/);
});

test('THE STRIKETHROUGH (the Owner\'s iPhone): a .p-link inside running prose is an inline word with its own underline — never the 44 px action box whose border ran through the next line', () => {
  const css = src('assets/prep.css');
  assert.match(css, /\.t-b1 \.p-link, \.t-b2 \.p-link, \.p-prose \.p-link \{ display: inline; min-height: 0; padding: 0 0 1px; line-height: inherit; vertical-align: baseline; \}/);
  assert.match(src('invitation.html'), /<p class="t-b2 measure-w">'\+\(G\.edited\(me\.guestId,'fullName'\)\?'Corrected by you':'From your invitation'\)\+' · <a class="p-link" href="#p-firstName">correct your name<\/a>/, 'the link stays a link inside the sentence');
});
