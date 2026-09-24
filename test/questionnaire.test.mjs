/* THE QUESTIONNAIRE (Owner, 22 Sep 2026): one canonical schema (src/questionnaire.js, its generated copy for the pages) — what
   is REQUIRED before SEND, on the page and on the server. A WISH FROM THE BRIDE & GROOM: the pool jump or BARON, never
   preselected, never defaulted, persisted under the guest's own identity. THE MUSIC: the genres, many, at least one, stored as
   the array they are. The passport never blocks. A refused SEND names what is missing and destroys nothing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { bearerOf, authIdOf } from '../register/crypto.mjs';
import { page, plain, src, PEGGY, ROOT } from './sandbox.mjs';
import { complete } from './complete.mjs';
import { PROFILE, GENRES, FINALE, profileMissing, finaleOf, REQUIRED } from '../src/questionnaire.js';

test('THE SCHEMA · one source, its generated copy byte-current, every guest page loads it before guest.js; the genres are the Owner\'s ten plus three broad ones; the song line optional; the passport and the flight never required', () => {
  const r = execFileSync('node', [ROOT + '/src/build-questionnaire.cjs', '--check'], { encoding: 'utf8', cwd: ROOT }); assert.match(r, /questionnaire: current/);
  assert.deepEqual(GENRES.slice(0, 10), ['90s', 'Classics / Oldies', 'Blues', 'Jazz', 'R&B', 'Hip-Hop', 'Pop', 'Rock', 'EDM / Electronic', 'Latin']); assert.ok(GENRES.length <= 14, 'no encyclopaedia');
  assert.deepEqual(PROFILE.map((q) => [q.key, q.required, q.type]), [['coffeetea', true, 'text'], ['flavor', true, 'choice'], ['drink', true, 'text'], ['film', true, 'text'], ['genres', true, 'multi'], ['music', false, 'text']]);
  assert.deepEqual(REQUIRED.optional, ['music', 'passport', 'flight', 'consent']); assert.ok(REQUIRED.wedding.includes('finale'));
  assert.deepEqual(FINALE.options.map((o) => o.key), ['pool', 'baron']); assert.match(FINALE.options[0].line, /pool jump/i); assert.match(FINALE.options[1].line, /BARON Vientiane · VIP after party/);
  assert.equal(finaleOf('pool'), 'pool'); assert.equal(finaleOf('BARON Vientiane · VIP after party'), 'baron'); assert.equal(finaleOf(''), null); assert.equal(finaleOf('both'), null); assert.equal(finaleOf(undefined), null);
  for (const f of ['about-you.html', 'wedding.html', 'review.html', 'your-journey.html', 'profile.html', 'invitation.html']) { const h = src(f); assert.ok(h.indexOf('assets/questionnaire.js') < h.indexOf('assets/guest.js') && h.indexOf('assets/questionnaire.js') > 0, f + ' loads the questionnaire before guest.js'); }
  assert.match(src('assets/guest.js'), /if \(!Q\) throw new Error\('assets\/questionnaire\.js must load before guest\.js'\);/);
  assert.deepEqual(profileMissing({}).map((m) => m.key), ['profile:coffeetea', 'profile:flavor', 'profile:drink', 'profile:film', 'profile:genres']);
  assert.deepEqual(profileMissing({ coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: ['Jazz'] }), [], 'the song line is not required');
  assert.deepEqual(profileMissing({ coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: [] }).map((m) => m.key), ['profile:genres'], 'an empty set is no answer');
  assert.deepEqual(profileMissing({ coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: 'Jazz' }).map((m) => m.key), ['profile:genres'], 'a string is not the structured answer');
  assert.deepEqual(profileMissing({ coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: ['Polka'] }).map((m) => m.key), ['profile:genres'], 'an unknown genre is no answer');
});

test('THE PAGE · the final act: null until the guest chooses, one of two, either may be chosen, the choice persists in the guest\'s own record and is the guest\'s alone; the genres: many, at least one, the array stored, toggled in the Owner\'s order; nothing preselected', () => {
  const w = page({ auth: PEGGY }); const G = w.SIYL_GUEST, T = w.SIYL_TEMPLE, id = 'g-peggy';
  assert.equal(T.finaleOf(id), null, 'never preselected');
  assert.equal(T.setFinale('g-steffie', 'pool'), false, 'the partner answers for herself');
  assert.equal(T.setFinale(id, 'both'), true); assert.equal(T.finaleOf(id), null, 'only the two acts are answers');
  T.setFinale(id, 'pool'); assert.equal(T.finaleOf(id), 'pool'); T.setFinale(id, 'baron'); assert.equal(T.finaleOf(id), 'baron', 'the choice may change');
  const stored = JSON.parse(w.localStorage.getItem('siyl.temple')); assert.equal(stored.by[id].finale, 'baron'); assert.equal(stored.by[id].by, id);
  assert.equal(JSON.parse(w.localStorage.getItem('siyl.temple')).by['g-steffie'], undefined);
  /* in the record for Guest Relations: the words and the key */
  T.setAttendance(id, 'no'); ['coffee', 'vows', 'dinner'].forEach((k) => T.setEvent(id, k, 'yes'));
  const rec = plain(T.operational()); const me = rec.guests.find((g) => g.guestId === id); assert.equal(me.finale, 'BARON Vientiane · VIP after party'); assert.equal(me.finaleKey, 'baron');
  /* the genres */
  assert.deepEqual(plain(G.profile(id, 'genres')), [], 'nothing pressed until the guest presses');
  assert.deepEqual(plain(G.toggleGenre(id, 'Jazz')), ['Jazz']); assert.deepEqual(plain(G.toggleGenre(id, '90s')), ['90s', 'Jazz'], 'the Owner\'s order, not the click order'); assert.deepEqual(plain(G.toggleGenre(id, 'Latin')), ['90s', 'Jazz', 'Latin']);
  assert.deepEqual(plain(G.toggleGenre(id, 'Jazz')), ['90s', 'Latin'], 'off again'); assert.deepEqual(plain(G.profile(id, 'genres')), ['90s', 'Latin']);
  G.setProfile(id, 'genres', ['Polka', 'Rock']); assert.deepEqual(plain(G.profile(id, 'genres')), ['Rock'], 'only the Owner\'s genres');
  const g = JSON.parse(w.localStorage.getItem('siyl.guest')).guests[id]; assert.deepEqual(g.profile.genres, ['Rock'], 'stored as the array it is — never flattened to prose'); assert.equal(g.history.filter((h) => h.field === 'profile.genres').length, 5);
  /* the wedding step needs the final act; About You needs the genres; the song line never */
  assert.ok(G.missingFor('wedding').every((m) => m.key !== 'finale'), 'answered'); T.setFinale(id, null); assert.ok(G.missingFor('wedding').some((m) => m.key === 'finale' && m.href === 'wedding.html#finale'));
  G.setAllergy('no'); G.setPhotoAck(true); for (const [k, v] of [['coffeetea', 'Tea'], ['flavor', 'Pandan'], ['drink', 'Water'], ['film', 'Ran']]) G.setProfile(id, k, v);
  assert.deepEqual(plain(G.missingFor('about').map((m) => m.key)), [], 'Rock answers the music; no song line needed');
  G.setProfile(id, 'genres', []); assert.deepEqual(plain(G.missingFor('about').map((m) => m.key)), ['profile:genres']);
  G.setProfile(id, 'music', 'Blue in Green'); assert.deepEqual(plain(G.missingFor('about').map((m) => m.key)), ['profile:genres'], 'the song line does not stand in for the genres');
  /* the markup: nothing preselected, the two acts, the genres as checkboxes */
  const wh = src('wedding.html'); assert.match(wh, /data-finale="'\+o\.key\+'"/, 'one control per act of the schema (pool · baron)'); assert.match(wh, /aria-pressed="'\+\(v===o\.key\)\+'"/, 'pressed only when chosen'); assert.match(wh, /Required · not decided/); assert.match(wh, /page\.querySelectorAll\('#finale \[data-finale\]'\)/);
  const ah = src('about-you.html'); assert.match(ah, /role="checkbox" aria-checked="'\+\(on\?'true':'false'\)\+'"/); assert.match(ah, /Choose at least one/); assert.match(ah, /G\.toggleGenre\(/);
});

/* ---- the Worker: the same rule, authoritative ---- */
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
function req(path, headers = {}, body, method) { return new Request(ORIGIN + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json', ...headers }, body: body ? JSON.stringify(body) : undefined }); }
function kv() { const m = new Map(); return { m, get: async (k) => (m.has(k) ? m.get(k).v : null), getWithMetadata: async (k) => (m.has(k) ? { value: m.get(k).v, metadata: m.get(k).meta || null } : { value: null, metadata: null }), put: async (k, v, o) => { m.set(k, { v, meta: o && o.metadata }); }, delete: async (k) => { m.delete(k); }, list: async ({ prefix }) => ({ keys: [...m.keys()].filter((n) => n.startsWith(prefix || '')).map((name) => ({ name })), list_complete: true }) }; }
async function harness() {
  const w = (await import('../src/worker.js')).default;
  const peggy = await bearerOf('q-peggy-g001');
  const entries = {}; entries[await authIdOf(peggy)] = { i: 'INV-G001', g: 'G001', p: 'INV-002', c: 'CON003', k: 'COUPL002' };
  const index = JSON.stringify({ v: 2, entries });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) }, REG_KV: kv(), GR_TOKEN: 'gr-secret' };
  /* STEP 01 IS REQUIRED ON THE SERVER (Owner, 24 Sep 2026): the guest's stored contact carries the required personal details — synthetic */
  await env.REG_KV.put('contact:INV-G001', JSON.stringify({ invitationId: 'INV-G001', guestId: 'G001', email: 'peggy@example.org', phone: '+49 170 000 0001', birthdate: '1990-01-01', nationality: 'Testland', address1: '1 Test Street', postal: '10000', city: 'Testcity', country: 'Testland', at: '2026-09-24T00:00:00.000Z' }));
  const send = (registration) => w.fetch(req('/api/register', { 'x-siyl-auth': peggy }, { invitationId: 'INV-G001', registration, text: 'SEE YOU IN LAOS — test' }), env).then(async (r) => ({ status: r.status, d: await r.json().catch(() => null) }));
  return { w, env, peggy, send };
}
const REG = () => ({ channel: 'journey-shop', guestId: 'G001', partyId: 'INV-002', selections: [], totalUsd: 0, contact: { email: 'peggy@example.org', phone: '+49 170 1' }, guestRecord: { guests: [{ guestId: 'G001', name: 'Peggy', source: { fullName: 'Peggy Berger', preferredName: 'Peggy' }, profile: { coffeetea: 'Tea', flavor: 'Pandan', drink: 'Water', film: 'Ran', genres: ['Jazz', 'Latin'] } }], allergy: { answer: 'no' }, photo: { at: 'x' }, dress: { all: true } } });
const withWedding = (o) => complete(REG(), { scope: { vientianeWedding: true }, stages: { wedstay: 'declined' }, ...(o || {}) });

test('THE WORKER · the same rule: a trip without the final act is refused (422, the item named, the way to it, nothing stored); with the pool jump or BARON it is accepted and the words kept; the genres are required and kept as the array; the song line and the passport are never required; a refused SEND keeps every other answer in the guest\'s own draft', async () => {
  const h = await harness();
  const base = withWedding(); base.templeCeremony.guests[0].finale = 'Not decided'; base.templeCeremony.guests[0].finaleKey = null;
  let r = await h.send(base); assert.equal(r.status, 422); assert.equal(r.d.error, 'incomplete');
  assert.deepEqual(r.d.missing.filter((m) => m.key === 'finale'), [{ key: 'finale', label: 'A wish from the Bride & Groom — the pool jump or BARON', step: 'wedding', href: 'wedding.html#finale' }]);
  assert.equal(h.env.REG_KV.m.has('reg:INV-G001'), false, 'nothing stored');
  const pool = withWedding(); r = await h.send(pool); assert.ok(r.status === 200 || r.status === 202, JSON.stringify(r.d).slice(0, 200));
  let rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G001').v); const recPool = rec; assert.equal(rec.registration.templeCeremony.guests[0].finale, 'The pool jump'); assert.deepEqual(rec.registration.guestRecord.guests[0].profile.genres, ['Jazz', 'Latin'], 'the array, kept');
  const baron = withWedding(); baron.templeCeremony.guests[0].finale = 'BARON Vientiane · VIP after party'; baron.templeCeremony.guests[0].finaleKey = 'baron';
  r = await h.send(baron); assert.ok(r.status === 200 || r.status === 202); rec = JSON.parse(h.env.REG_KV.m.get('reg:INV-G001').v); assert.equal(rec.registration.templeCeremony.guests[0].finaleKey, 'baron'); assert.equal(rec.version, 2);
  /* the words alone are enough (an older device) */
  const words = withWedding(); delete words.templeCeremony.guests[0].finaleKey; words.templeCeremony.guests[0].finale = 'The pool jump'; r = await h.send(words); assert.ok(r.status === 200 || r.status === 202);
  /* the genres: missing → refused; a string → refused; the song line and the passport never asked */
  const noGenres = withWedding(); noGenres.guestRecord.guests[0].profile.genres = []; r = await h.send(noGenres); assert.equal(r.status, 422); assert.deepEqual(r.d.missing.map((m) => m.key), ['profile:genres']); assert.equal(r.d.missing[0].href, 'about-you.html#q-genres');
  const strGenres = withWedding(); strGenres.guestRecord.guests[0].profile.genres = 'Jazz'; r = await h.send(strGenres); assert.equal(r.status, 422);
  const noSong = withWedding(); delete noSong.guestRecord.guests[0].profile.music; r = await h.send(noSong); assert.ok(r.status === 200 || r.status === 202, 'the song line is optional');
  assert.ok(!JSON.stringify(r.d).includes('passport'), 'the passport is never in the way');
  const noFlavor = withWedding(); noFlavor.guestRecord.guests[0].profile.flavor = ''; r = await h.send(noFlavor); assert.equal(r.status, 422); assert.deepEqual(r.d.missing.map((m) => m.key), ['profile:flavor']);
  /* a guest not joining the trip owes no answer */
  const away = complete(REG(), { scope: { none: true } }); r = await h.send(away); assert.ok(r.status === 200 || r.status === 202, JSON.stringify(r.d).slice(0, 200));
  /* a Bangkok-only guest: no wedding, so no final act — but the genres still */
  const bkk = complete(REG(), { scope: { bangkok: true }, stages: { 'bkk-stay': 'declined', kempinski: 'declined' } }); r = await h.send(bkk); assert.ok(r.status === 200 || r.status === 202, JSON.stringify(r.d).slice(0, 200));
  const bkkNoGenres = complete(REG(), { scope: { bangkok: true }, stages: { 'bkk-stay': 'declined', kempinski: 'declined' } }); bkkNoGenres.guestRecord.guests[0].profile.genres = []; r = await h.send(bkkNoGenres); assert.equal(r.status, 422);
  /* the emails carry the answers */
  const { composeGuestMail, composeOwnerMail } = await import('../src/mail-templates.js');
  const gm = composeGuestMail(recPool), om = composeOwnerMail(recPool, ORIGIN + '/api/status?invitation=INV-G001');
  assert.match(gm.text, /After the dinner: The pool jump/); assert.match(gm.text, /Your music \(genres\): Jazz · Latin/); assert.match(om.text, /After the dinner: The pool jump/); assert.match(om.text, /Jazz · Latin/);
});

test('THE REVIEW PAGE · a refused SEND says what is missing and where, and leaves the draft untouched (the other answers stand); the client checks readiness before it sends', () => {
  const rv = src('review.html');
  assert.match(rv, /if\(r\.status===422\)\{var inc=null;try\{inc=await r\.json\(\)\}catch\(e2\)\{\}var m0=inc&&inc\.missing&&inc\.missing\[0\];btn\.disabled=false;err\.innerHTML='Your trip is not complete yet'/, 'the first missing item, named, with its way');
  assert.doesNotMatch(rv.slice(rv.indexOf('if(r.status===422)'), rv.indexOf('if(r.status===422)') + 600), /localStorage\.removeItem|SIYL_BAG\.set\(\[\]\)|clear\(/, 'a refusal destroys nothing');
  assert.match(src('assets/guest.js'), /if \(!this\.mayEnter\('review'\)\) \{ var fm = this\.firstMissing\(\);/, 'Review & Send opens only when every step is complete');
});
