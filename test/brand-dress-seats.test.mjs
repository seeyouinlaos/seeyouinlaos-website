/* THE INTEGRATED CORRECTION (Owner, 25 Sep 2026): the emails carry the real "see you in laos." identity; the Lao Traditional
   Dress Rental says who pays and links the shop; the Wedding Dinner is fifty seats. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { src, ROOT } from './sandbox.mjs';
import { composeOwnerMail, composeGuestMail, LOGO_URL, SITE } from '../src/mail-templates.js';
import * as S from '../src/seating.js';

const REC = { invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-TEST0001', version: 1, kind: 'initial', submittedAt: '2026-09-25T09:00:00.000Z', lastSentAt: '2026-09-25T09:00:00.000Z',
  recipient: { email: 'sam.example@example.org', phone: '+66 81 000 0000' },
  registration: { lang: 'en', contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, personal: { firstName: 'Sam', lastName: 'Example', birthdate: '1990-05-17', nationality: 'Thai', address1: 'Street 1', postal: '10110', city: 'Bangkok', country: 'Thailand' },
    selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 }], totalUsd: 100,
    guestRecord: { partyName: 'Sam', scope: { bangkok: true, vientianePreWedding: true, vientianeWedding: false, china: false, none: false }, guests: [{ guestId: 'G777', source: { fullName: 'Sam Example', preferredName: 'Sam' }, profile: {} }] } } };

test('EMAIL · the official wordmark heads and closes BOTH emails — the original artwork on its Ivory ground, served by the one Worker, readable with images off; the canonical Ivory; no retired colour', () => {
  const png = 'assets/brand/see-you-in-laos-email.png';
  assert.ok(existsSync(png), 'the email logo is in the Worker\'s own assets');
  assert.equal(execFileSync('magick', ['identify', '-format', '%wx%h', png], { encoding: 'utf8' }), '560x130', 'the original 3986 × 924 artwork, scaled proportionally (2× for 280 px)');
  const hash = execFileSync('shasum', ['-a', '256', png], { encoding: 'utf8' }).slice(0, 8);
  assert.equal(LOGO_URL, SITE + '/assets/brand/see-you-in-laos-email.png?v=' + hash, 'the URL carries the file\'s content hash');
  assert.doesNotMatch(readFileSync(ROOT + '/.assetsignore', 'utf8'), /^assets\/?$|^assets\/brand/m, 'the brand folder is served');
  for (const m of [composeGuestMail(REC), composeOwnerMail(REC)]) {
    const imgs = m.html.match(/<img [^>]*>/g) || [];
    assert.equal(imgs.length, 2, 'the masthead and the footer');
    for (const i of imgs) { assert.match(i, / alt="see you in laos\."/, 'images off: the wordmark in words'); assert.match(i, /src="https:\/\/[^"]+\/assets\/brand\/see-you-in-laos-email\.png\?v=[0-9a-f]{8}"/); assert.match(i, /font-family:Georgia/); }
    assert.match(imgs[0], /width="280" height="65"/); assert.match(imgs[1], /width="150" height="35"/);
    assert.match(m.html, /background:#F2ECE1/); assert.doesNotMatch(m.html, /#8a5a55|#f4eee5/i);
    assert.match(m.html, /<meta name="color-scheme" content="light only">/);
    assert.match(m.html, /@media only screen and \(max-width:640px\)/, 'the narrow layout');
    assert.doesNotMatch(m.html, /<svg|display:\s*flex|display:\s*grid|position:\s*absolute/, 'nothing an email client does not render');
    assert.ok(m.text && !/<[a-z]/i.test(m.text), 'a plain-text alternative without markup');
    /* a table row is only ever inside a table: a stray row is moved by every client (the snapshot's labels once landed above the email) */
    assert.doesNotMatch(m.html, /<\/table><tr|<\/p><tr|<\/div><tr/, 'no row outside a table');
    for (const i of imgs) assert.match(i, /max-height:\d+px/, 'images off: the box keeps the logo\'s height, never a square');
  }
});

test('EMAIL · the recovery snapshot stays Guest Relations\' own: the guest\'s copy carries no snapshot, no date of birth, no address, no register id — the internal copy keeps every field of 4f41523', () => {
  const g = composeGuestMail(REC), o = composeOwnerMail(REC);
  for (const s of ['RECOVERY SNAPSHOT', 'Recovery snapshot', '1990-05-17', '17 May 1990', 'Street 1', 'Person ID']) assert.ok(!g.text.includes(s) && !g.html.includes(s), 'guest: ' + s);
  for (const s of ['RECOVERY SNAPSHOT · THE COMPLETE SUBMITTED RECORD', '· Date of birth: 17 May 1990 (1990-05-17)', '· Person ID: G777', '· Street and house number: Street 1', '· Special Express No. 25: code train · quantity 1']) assert.ok(o.text.includes(s), 'internal: ' + s);
  assert.match(o.html, /Recovery snapshot · the complete submitted record/);
});

test('LAO TRADITIONAL DRESS RENTAL · the guest\'s own cost, paid at the shop; Guest Relations can book the fitting; the shop\'s page linked and named — in English and Thai, nothing invented', () => {
  const s = src('assets/experiences.js');
  const rec = s.slice(s.indexOf("{ id: 'vte-laodress'"), s.indexOf('/* BARON VIENTIANE'));
  assert.match(rec, /link: 'https:\/\/www\.facebook\.com\/profile\.php\?id=61573790998776', linkLabel: 'The rental shop on Facebook'/);
  assert.match(rec, /'The rental is your own cost, paid directly at the shop\. If you would like, Guest Relations will book your fitting appointment with the shop for you\.'/);
  assert.match(rec, /priceNote: 'Your own cost, paid at the shop'/);
  assert.doesNotMatch(rec, /complimentary|hosted|included in|we pay|guarantee|cancellation|deposit/i, 'self-pay is never hosted, complimentary or guaranteed');
  assert.match(src('experience.html'), /esc\(x\.linkLabel \|\| 'Website'\)/, 'the link says where it goes');
  assert.match(src('experience.html'), /target="_blank" rel="noopener"/);
  const th = JSON.parse(src('src/i18n-th.json')).exact;
  assert.match(th['The rental is your own cost, paid directly at the shop. If you would like, Guest Relations will book your fitting appointment with the shop for you.'], /ค่าใช้จ่ายในส่วนของคุณ.*ชำระที่ร้าน.*Guest Relations/);
  assert.equal(th['Your own cost, paid at the shop'], 'ค่าใช้จ่ายในส่วนของคุณ ชำระที่ร้าน');
  assert.equal(th['The rental shop on Facebook'], 'ร้านเช่าชุดบน Facebook');
  const inv = JSON.parse(src('src/experience-inventory.json')).find((x) => x.id === 'vte-laodress');
  assert.equal(inv.link, 'https://www.facebook.com/profile.php?id=61573790998776', 'the inventory records the same link');
});

test('WEDDING DINNER · 50 seats (Owner override, 25 Sep 2026): 25 per side, A1–A12 A14–A26 · B1–B12 B14–B26, no 13, no duplicate, B12 kept, nothing renumbered; no active surface still says 48 or 24', () => {
  const d = S.seatsOf({ dinner: { sides: { T: [], B: [] } } }, 'dinner');
  assert.equal(d.length, 50); assert.equal(new Set(d.map((x) => x.seatId)).size, 50);
  assert.equal(d.filter((x) => x.side === 'T').length, 25); assert.equal(d.filter((x) => x.side === 'B').length, 25);
  for (const id of ['D-T-26', 'D-B-26', 'D-B-12', 'D-T-14']) assert.ok(d.some((x) => x.seatId === id), id);
  assert.ok(!d.some((x) => /-13$/.test(x.seatId)));
  assert.equal(S.CAPACITY.dinner.guestSeats, 50);
  for (const f of ['wedding.html', 'wedding-preparation.html', 'voyage.html', 'assets/seating.js', 'assets/seatlabels.js', 'assets/wedding-dinner.js', 'assets/venue-data.js', 'src/seating.js', 'src/mail-templates.js']) {
    assert.doesNotMatch(src(f), /\b48 (guest )?seats\b|\b24 seats\b|forty-eight|twenty-four seats|A14–A25|B14–B25/i, f + ' carries no retired seat count');
  }
  const th = JSON.parse(src('src/i18n-th.json'));
  assert.doesNotMatch(JSON.stringify(th.exact), /48 ที่นั่ง|24 ที่นั่ง/, 'no fixed old count in Thai');
});
