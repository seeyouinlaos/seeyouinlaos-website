/* THE GUEST LIST SYNC (28 Sep 2026 · the live 006_Guestlist → the register → the codes): the real importer
   (src/guestlist-from-contacts.cjs) and the real builder (src/build-invitations.cjs), run twice on a SYNTHETIC sheet in a folder of
   their own (SIYL_REGISTER_WORKDIR) — the first read, then a later read with changes. The person id (CONxxx) is the identity; an
   existing code is never changed; a new guest gets one new code; a blank or unnamed row gets none; the sheet's RSVP never takes an
   invitation away (a guest's participation is their own answer on the website). And the shipped register carries no code. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bearerOf, authIdOf } from '../register/crypto.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const HEAD = ['ID', 'Firstname', 'Surname', 'Nickname', 'Couple', 'Letter', 'Birthdate', 'Nationality', 'RSVP', 'Role', 'Sending Invitation', 'Phone', 'Email', 'Address', 'Instagram', 'Facebook', 'LinkIn', 'Notes'];
const row = (o) => HEAD.map((h) => o[h] || '').join('\t');
const HOSTS = [{ ID: 'CONT001', Firstname: 'Haruthai', Surname: 'Testhost', Couple: 'COUPLT01', Role: 'Document Owner' }, { ID: 'CONT002', Firstname: 'Suthep', Surname: 'Testhost', Couple: 'COUPLT01', Role: 'Document Owner' }];
const G = (id, first, sur, couple, extra) => ({ ID: id, Firstname: first, Surname: sur, Couple: couple, Role: 'Guest - Suthep', 'Sending Invitation': 'Line', Nationality: 'Testland', ...(extra || {}) });
const V1 = [...HOSTS, G('CONT003', 'Anna', 'Alpha', 'COUPLT02'), G('CONT004', 'Ben', 'Beta', 'COUPLT02'), G('CONT005', 'Chen', 'Gamma', 'SIGL', { RSVP: 'Not Attending' })];
const V2 = [...HOSTS,
  G('CONT003', 'Anna', 'Alpha-Delta', 'COUPLT02', { Nickname: 'Annie', Email: 'annie@example.org' }),         /* 2 · details changed */
  G('CONT004', 'Ben', 'Beta', 'COUPLT02'),                                                                    /* 1 · unchanged */
  G('CONT005', 'Chen', 'Gamma', 'COUPLT04', { RSVP: 'Not Attending' }),                                       /* 7 · explicit Not Attending; now a couple */
  G('CONT006', 'Dana', 'Gamma', 'COUPLT04'),                                                                  /* 4 · new, in CONT005's party */
  G('CONT007', 'Eve', 'Epsilon', 'COUPLT06', { RSVP: 'Not Attending Wedding/just room' }),                     /* 5 · 8 · two new, room only */
  G('CONT008', 'Finn', 'Phi', 'COUPLT06', { RSVP: 'Not Attending Wedding/just room' }),
  { ID: 'CONT009' },                                                                                          /* 6 · a blank placeholder row */
  G('CONT010', 'No name', '', 'COUPLT06'),                                                                    /* 6 · the sheet's "No name" */
  G('CONT011', 'Nara', 'Numone', 'SIGL'), G('CONT012', 'Nara', 'Numtwo', 'SIGL'),                       /* 9 · the same first name, two people */
  G('CONT013', 'Nara', 'Numone', 'SIGL')];                                                                 /* 9 · the same full name twice: one person */

function run(dir, rows) {
  const tsv = path.join(dir, 'sheet.tsv'); fs.writeFileSync(tsv, [HEAD.join('\t')].concat(rows.map(row)).join('\n') + '\n');
  const env = { ...process.env, SIYL_REGISTER_WORKDIR: dir };
  execFileSync('node', [path.join(ROOT, 'src/guestlist-from-contacts.cjs'), '--write', tsv], { env, stdio: 'pipe' });
  execFileSync('node', [path.join(ROOT, 'src/build-invitations.cjs')], { env, stdio: 'pipe' });
  const tok = fs.readFileSync(path.join(dir, 'invitation-tokens.private.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  const list = JSON.parse(fs.readFileSync(path.join(dir, 'guestlist.private.json'), 'utf8'));
  const byCon = {}; for (const p of list) for (const g of p.guests) if (g.contactId) byCon[g.contactId] = { ...g, partyId: p.invitationId, partyStatus: p.status || 'ACTIVE' };
  const codeOf = (gid) => { const r = tok.find((x) => x[0] === gid && x[7] === 'ACTIVE'); return r ? r[5] : null; };
  return { list, byCon, codeOf, tok, index: JSON.parse(fs.readFileSync(path.join(dir, 'auth-index.json'), 'utf8')).entries, enc: fs.readFileSync(path.join(dir, 'invitations.enc.json'), 'utf8') };
}

let A, B;
test.before(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siyl-sync-'));
  fs.writeFileSync(path.join(dir, 'guestlist.private.json'), JSON.stringify([{ invitationId: 'INV-001', partyName: 'Haruthai & Suthep', partyLead: 'G048', hosts: true, givingEligibility: 'PAIR',
    guests: [{ guestId: 'G048', fullName: 'Haruthai Testhost', preferredName: 'Haruthai', contactId: 'CONT001', couple: 'COUPLT01', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Testhost', preferredName: 'Suthep', contactId: 'CONT002', couple: 'COUPLT01', hostRole: 'GROOM' }] }]));
  A = run(dir, V1); B = run(dir, V2);
});

test('1 · 2 · 11 · AN EXISTING GUEST KEEPS THEIR CODE — unchanged, or with a new spelling, a nickname, an email — and the old link opens the same guest', async () => {
  for (const con of ['CONT001', 'CONT002', 'CONT003', 'CONT004', 'CONT005']) {
    const a = A.byCon[con], b = B.byCon[con]; assert.equal(b.guestId, a.guestId, con + ' keeps its guest id');
    const code = A.codeOf(a.guestId); assert.ok(code && code.length === 16, con); assert.equal(B.codeOf(b.guestId), code, con + ' keeps its code');
    const e = B.index[await authIdOf(await bearerOf(code))]; assert.equal(e.g, a.guestId); assert.equal(e.c, con, con + ' the old link opens the same person');
  }
  assert.equal(B.byCon.CONT003.preferredName, 'Annie', 'the details follow the sheet'); assert.equal(B.byCon.CONT003.fullName, 'Anna Alpha-Delta');
});

test('3 · 4 · 5 · NEW GUESTS GET ONE NEW CODE EACH — two new guests two distinct codes; a new guest joins an existing party without touching the member\'s code', () => {
  const news = ['CONT006', 'CONT007', 'CONT008', 'CONT011', 'CONT012'].map((c) => B.byCon[c]);
  const codes = news.map((g) => B.codeOf(g.guestId));
  assert.ok(codes.every((c) => /^[a-hj-km-np-z2-9]{16}$/.test(c)), 'the builder\'s own format');
  assert.equal(new Set(codes).size, codes.length, 'distinct');
  const all = B.tok.filter((x) => x[7] === 'ACTIVE').map((x) => x[5]); assert.equal(new Set(all).size, all.length, 'no code twice in the register');
  for (const g of news) { assert.equal(A.byCon[g.contactId], undefined, g.contactId + ' is new'); assert.ok(!A.tok.some((x) => x[5] === B.codeOf(g.guestId)), 'never an old code'); }
  assert.equal(B.byCon.CONT006.partyId, A.byCon.CONT005.partyId, 'CONT006 joins the party of CONT005');
  assert.equal(B.codeOf(B.byCon.CONT005.guestId), A.codeOf(A.byCon.CONT005.guestId), 'the existing member keeps the code');
  assert.equal(B.byCon.CONT007.partyId, B.byCon.CONT008.partyId, 'the new couple is one party');
  for (const g of news) { const c = B.codeOf(g.guestId); assert.ok(!c.includes(g.contactId.toLowerCase()) && !c.includes(g.preferredName.toLowerCase()), 'no id or name in a code'); }
});

test('6 · 9 · NO CODE FOR A BLANK OR UNNAMED ROW; THE SAME FIRST NAME IS TWO PEOPLE, THE SAME FULL NAME ONE', () => {
  assert.equal(B.byCon.CONT009, undefined); assert.equal(B.byCon.CONT010, undefined, '"No name" is never invented');
  assert.notEqual(B.byCon.CONT011.guestId, B.byCon.CONT012.guestId); assert.notEqual(B.codeOf(B.byCon.CONT011.guestId), B.codeOf(B.byCon.CONT012.guestId));
  assert.equal(B.byCon.CONT013, undefined, 'the same full name twice: one identity, one code');
  assert.equal(Object.values(B.index).filter((e) => e.c === 'CONT011').length, 1);
});

test('7 · 8 · THE SHEET\'S RSVP NEVER TAKES AN INVITATION AWAY — Not Attending and "just room" guests keep or receive their own code; participation stays their own answer', () => {
  assert.equal(B.byCon.CONT005.status, undefined, 'Not Attending stays an active guest'); assert.ok(B.codeOf(B.byCon.CONT005.guestId));
  for (const c of ['CONT007', 'CONT008']) { assert.ok(B.codeOf(B.byCon[c].guestId), c); assert.equal(B.byCon[c].hosts, undefined); }
  for (const p of B.list) for (const g of p.guests) assert.equal(g.rsvp, undefined, 'no RSVP is carried into the register');
});

test('10 · A NEW CODE SIGNS IN AS ITS OWN PERSON — the Worker resolves the bearer to the right guest, invitation, party and person id', async () => {
  const w = (await import('../src/worker.js')).default;
  const index = JSON.stringify({ v: 2, entries: B.index });
  const env = { ASSETS: { fetch: async (r) => new URL(r.url).pathname === '/register/auth-index.json' ? new Response(index, { headers: { 'content-type': 'application/json' } }) : new Response('', { status: 404 }) } };
  for (const c of ['CONT006', 'CONT007', 'CONT008', 'CONT003']) {
    const g = B.byCon[c], bearer = await bearerOf(B.codeOf(g.guestId));
    const r = await w.fetch(new Request('https://seeyouinlaos-website.suthep-hrg.workers.dev/api/gifts', { headers: { 'x-siyl-auth': bearer } }), env);
    assert.equal(r.status, 200, c); assert.equal((await r.json()).guestId, g.guestId, c);
    const e = B.index[await authIdOf(bearer)]; assert.deepEqual([e.i, e.g, e.p, e.c], ['INV-' + g.guestId, g.guestId, g.partyId, c]);
  }
});

test('12 · NO CODE IN WHAT IS SHIPPED — the synthetic bundle, and the real register, pages and scripts carry no invitation code', () => {
  for (const [gid, , , , , code] of B.tok) if (code) { assert.ok(!B.enc.includes(code) && !JSON.stringify(B.index).includes(code), gid); }
  const priv = path.join(ROOT, 'src/invitation-tokens.private.csv');
  if (!fs.existsSync(priv)) return;   /* a checkout without the private register (CI) checks the synthetic bundle only */
  const codes = fs.readFileSync(priv, 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')[5]).filter(Boolean);
  const shipped = ['register/auth-index.json', 'register/invitations.enc.json'].concat(fs.readdirSync(ROOT).filter((f) => f.endsWith('.html')), fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => f.endsWith('.js')).map((f) => 'assets/' + f), fs.readdirSync(path.join(ROOT, 'src')).filter((f) => /\.(js|mjs|cjs|json)$/.test(f) && !/private/.test(f)).map((f) => 'src/' + f));
  const text = shipped.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  assert.ok(codes.length >= 100); for (const c of codes) assert.ok(!text.includes(c), 'a code appears in a shipped file');
});
