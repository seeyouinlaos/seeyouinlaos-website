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
import { execFileSync, spawnSync } from 'node:child_process';
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
  return state(dir);
}
/* what the folder holds now: the register, the codes, the shipped index and bundle */
function state(dir) {
  const tok = fs.readFileSync(path.join(dir, 'invitation-tokens.private.csv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split(','));
  const list = JSON.parse(fs.readFileSync(path.join(dir, 'guestlist.private.json'), 'utf8'));
  const byCon = {}; for (const p of list) for (const g of p.guests) if (g.contactId) byCon[g.contactId] = { ...g, partyId: p.invitationId, partyStatus: p.status || 'ACTIVE' };
  const codeOf = (gid) => { const r = tok.find((x) => x[0] === gid && x[7] === 'ACTIVE'); return r ? r[5] : null; };
  return { list, byCon, codeOf, tok, index: JSON.parse(fs.readFileSync(path.join(dir, 'auth-index.json'), 'utf8')).entries, enc: fs.readFileSync(path.join(dir, 'invitations.enc.json'), 'utf8') };
}

/* a fresh folder holding only the hosts (the FIXED allocation) */
function seeded(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  fs.writeFileSync(path.join(dir, 'guestlist.private.json'), JSON.stringify([{ invitationId: 'INV-001', partyName: 'Haruthai & Suthep', partyLead: 'G048', hosts: true, givingEligibility: 'PAIR',
    guests: [{ guestId: 'G048', fullName: 'Haruthai Testhost', preferredName: 'Haruthai', contactId: 'CONT001', couple: 'COUPLT01', hostRole: 'BRIDE' }, { guestId: 'G049', fullName: 'Suthep Testhost', preferredName: 'Suthep', contactId: 'CONT002', couple: 'COUPLT01', hostRole: 'GROOM' }] }]));
  return dir;
}
/* the importer alone, as the Owner's run would be: its exit status and what it printed */
function importOnly(dir, rows, extra) {
  const tsv = path.join(dir, 'sheet.tsv'); fs.writeFileSync(tsv, [HEAD.join('\t')].concat(rows.map(row)).join('\n') + '\n');
  return spawnSync('node', [path.join(ROOT, 'src/guestlist-from-contacts.cjs'), '--write', tsv].concat(extra || []), { env: { ...process.env, SIYL_REGISTER_WORKDIR: dir }, encoding: 'utf8' });
}

let A, B;
test.before(() => {
  const dir = seeded('siyl-sync-');
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

/* THE SAME PERSON (Owner, 14 Oct 2026 · a reused or renamed person id): a register guest is matched only while the row still names
   that person. A row whose names no longer meet the register's is an IDENTITY CONFLICT: --write refuses, nothing is written, no
   code, id or journey moves to another person. The Owner's word for one run (--same-person CONTxxx=Gxxx) keeps the guest, the code
   and the person id under the corrected name, and stamps the day (`named`) so the website asks an older session for the code once
   more. A married surname or a new nickname needs no word; a shared surname alone is never enough. */
test('13 · A ROW THAT NOW NAMES ANOTHER PERSON — refused until the Owner\'s word; with it the same guest keeps id, code and person id under the corrected name', () => {
  const dir = seeded('siyl-same-'), before = run(dir, V1);
  const ben = before.byCon.CONT004, anna = before.byCon.CONT003, chen = before.byCon.CONT005;
  const files = () => ['guestlist.private.json', 'invitation-tokens.private.csv'].map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\u0000');
  const backups = () => fs.readdirSync(dir).filter((f) => /backup/.test(f)).length;
  const was = files(), nBackups = backups();
  /* CONT004: every name new (a reused id) · CONT005: the same surname, another first name (a relative) · CONT003: a married surname */
  const V3 = V1.map((r) => (r.ID === 'CONT004' ? G('CONT004', 'Zed', 'Zulu', 'COUPLT02') : r.ID === 'CONT005' ? G('CONT005', 'Cora', 'Gamma', 'SIGL', { RSVP: 'Not Attending' }) : r.ID === 'CONT003' ? G('CONT003', 'Anna', 'Omega', 'COUPLT02', { Nickname: 'Annie' }) : r));
  const refused = importOnly(dir, V3);
  assert.equal(refused.status, 1, 'refused'); assert.match(refused.stdout, /IDENTITY CONFLICT: CONT004 \(register G\d{3}\), CONT005 \(register G\d{3}\)/); assert.match(refused.stdout, /REFUSED — nothing written/);
  assert.doesNotMatch(refused.stdout, /CONT003/, 'a married surname with the same first name is the same person');
  for (const n of ['Zed', 'Zulu', 'Cora', 'Ben', 'Beta', 'Chen']) assert.ok(!refused.stdout.includes(n), 'no name on the terminal: ' + n);
  assert.equal(files(), was, 'nothing written'); assert.equal(backups(), nBackups, 'not even a backup');
  /* a word that names another guest, or a row that is no conflict, decides nothing */
  const wrong = importOnly(dir, V3, ['--same-person', 'CONT004=' + anna.guestId + ',CONT005=' + chen.guestId]);
  assert.equal(wrong.status, 1); assert.match(wrong.stdout, /IDENTITY CONFLICT: CONT004/); assert.equal(files(), was);
  const idle = importOnly(dir, V3, ['--same-person', 'CONT004=' + ben.guestId + ',CONT005=' + chen.guestId + ',CONT003=' + anna.guestId]);
  assert.equal(idle.status, 1); assert.match(idle.stdout, /MET NO CONFLICT: CONT003=/); assert.equal(files(), was);
  assert.notEqual(importOnly(dir, V3, ['--same-person', 'CONT004=G999']).status, 0, 'no such register guest'); assert.equal(files(), was);
  /* the Owner's word for both: the same guests, codes and person ids under the corrected names, the day stamped */
  const ok = importOnly(dir, V3, ['--same-person', 'CONT004=' + ben.guestId + ',CONT005=' + chen.guestId]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  execFileSync('node', [path.join(ROOT, 'src/build-invitations.cjs')], { env: { ...process.env, SIYL_REGISTER_WORKDIR: dir }, stdio: 'pipe' });
  const after = state(dir);
  const today = new Date().toISOString().slice(0, 10);
  for (const [con, g] of [['CONT004', ben], ['CONT005', chen], ['CONT003', anna]]) {
    const a = after.byCon[con]; assert.equal(a.guestId, g.guestId, con + ' keeps the guest id'); assert.equal(after.codeOf(a.guestId), before.codeOf(g.guestId), con + ' keeps the code');
    assert.equal(a.named, today, con + ': the day the name was corrected');
  }
  assert.equal(after.byCon.CONT004.fullName, 'Zed Zulu'); assert.equal(after.byCon.CONT003.fullName, 'Anna Omega'); assert.equal(after.byCon.CONT006, undefined);
  assert.equal(after.byCon.CONT001.named, undefined, 'an unchanged name carries no date');
  assert.equal(after.tok.filter((x) => x[7] === 'ACTIVE').length, before.tok.filter((x) => x[7] === 'ACTIVE').length, 'nobody new, nobody cancelled');
  /* the index is the same: one-way ids, no name — the corrected record opens with the same code */
  assert.deepEqual(after.index, before.index);
});

test('14 · A NAME OR AN ALIAS NEVER MOVES A GUEST TO ANOTHER PERSON ID — the register guest of CONT004 named again on a new row is a conflict', () => {
  const dir = seeded('siyl-move-'), before = run(dir, V1);
  const was = fs.readFileSync(path.join(dir, 'guestlist.private.json'), 'utf8');
  /* the same person's name on a new row id, the old row gone: a name match onto the person CONT004 */
  const V4 = V1.filter((r) => r.ID !== 'CONT004').concat([G('CONT020', 'Ben', 'Beta', 'COUPLT02')]);
  const moved = importOnly(dir, V4);
  assert.equal(moved.status, 1); assert.match(moved.stdout, new RegExp('IDENTITY CONFLICT: CONT020 \\(register ' + before.byCon.CONT004.guestId + '\\)'));
  assert.equal(fs.readFileSync(path.join(dir, 'guestlist.private.json'), 'utf8'), was, 'nothing written');
  /* the old row blank (it names nobody): still the same refusal — the person did not become someone new */
  const blank = importOnly(dir, V1.map((r) => (r.ID === 'CONT004' ? { ID: 'CONT004' } : r)).concat([G('CONT020', 'Ben', 'Beta', 'COUPLT02')]));
  assert.equal(blank.status, 1); assert.match(blank.stdout, /IDENTITY CONFLICT: CONT020/);
  /* the old row still names its person (here: not attending): this row is someone else — a NEW guest with a NEW code, nothing moved */
  const other = importOnly(dir, V1.map((r) => (r.ID === 'CONT004' ? { ...r, Notes: 'Not Attend' } : r)).concat([G('CONT020', 'Ben', 'Beta', 'COUPLT02')]));
  assert.equal(other.status, 0, other.stdout + other.stderr);
  execFileSync('node', [path.join(ROOT, 'src/build-invitations.cjs')], { env: { ...process.env, SIYL_REGISTER_WORKDIR: dir }, stdio: 'pipe' });
  const now = state(dir), ben = before.byCon.CONT004;
  assert.notEqual(now.byCon.CONT020.guestId, ben.guestId); assert.ok(now.codeOf(now.byCon.CONT020.guestId)); assert.notEqual(now.codeOf(now.byCon.CONT020.guestId), before.codeOf(ben.guestId));
  assert.equal(now.byCon.CONT004.status, 'CANCELLED', 'the not-attending person keeps their id, their code is retired'); assert.equal(now.codeOf(ben.guestId), null);
});

