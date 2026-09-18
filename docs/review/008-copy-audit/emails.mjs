/* 008 — COPY AUDIT · EMAIL TEXT EXTRACTION. Renders both emails (initial + update, guest + Guest Relations) from the same
   synthetic record the mail CI test uses, plus a host record with a fixed arrangement, and writes subjects, the plain-text
   fallback and the HTML reduced to its visible text. Synthetic guest only; no code, no bearer.
     node docs/review/008-copy-audit/emails.mjs  → docs/review/008-copy-audit/emails.txt */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { composeGuestMail, composeOwnerMail } from '../../../src/mail-templates.js';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const REG = { channel: 'journey-shop', guestId: 'G777', totalUsd: 292, contact: { email: 'sam.example@example.org', phone: '+66 81 000 0000' },
  selections: [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100 }, { id: 'bkk-stay', name: 'U Sathorn Bangkok', meta: '21 – 24 February 2027 · Superior Room With Garden View', price: 192, stay: 'sathorn', room: 'u-sathorn-superior-garden', breakfast: 'Breakfast included', unit: 'B', unitName: 'Room B' }, { id: 'sangkhathan', name: 'Sangkhathan Temple Offering', meta: 'Sunday, 28 February 2027 · Temple Ceremony', price: 15 }],
  templeCeremony: { guests: [{ guestId: 'G777', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Not joining' } }] },
  guestRecord: { partyName: 'Sam & Alex', dress: { all: true }, photo: { acknowledged: true }, guests: [{ guestId: 'G777', name: 'Sam', source: { fullName: 'Sam Example', preferredName: 'Sam' }, allergy: { answer: 'yes', details: 'Peanuts' }, profile: { coffeetea: 'Oolong', drink: 'Fresh lime soda' }, dress: { acknowledged: true, at: '2026-09-16T17:52:35.999Z', textVersion: '2026-09-09' } }] },
  documents: { guests: [{ guestId: 'G777', documents: [{ kind: 'passport', label: 'Passport', state: 'Not provided' }], publication: 'Given' }] },
  seats: { ceremony: { G777: 'C-R-05-02' }, dinner: { G777: 'D-T-05' } } };
const rec = (extra) => ({ invitationId: 'INV-G777', guestId: 'G777', submissionId: 'SYL-G777-34DBEFD3', registration: REG, recipient: { email: 'sam.example@example.org', phone: '+66 81 000 0000' }, rooms: { 'bkk-stay': { key: 'bkk-stay/u-sathorn-superior-garden', label: 'C', room: 'Room C', name: 'Superior Room With Garden View' } }, kind: 'initial', version: 1, submittedAt: '2026-09-16T17:52:41.404Z', lastSentAt: '2026-09-16T17:52:41.696Z', firstSentAt: '2026-09-16T17:52:41.404Z', ...(extra || {}) });
const HOSTREG = { ...REG, guestId: 'G049', totalUsd: 100, selections: [REG.selections[0]], guestRecord: { partyName: 'Haruthai & Suthep', dress: { all: true }, photo: { acknowledged: true }, guests: [{ guestId: 'G049', name: 'Suthep', source: { fullName: 'Suthep Test', preferredName: 'Suthep' }, allergy: { answer: 'no' }, profile: {} }] }, templeCeremony: { guests: [{ guestId: 'G049', events: { temple: 'Joining', coffee: 'Joining', vows: 'Joining', dinner: 'Joining' } }] }, documents: { guests: [] }, seats: {} };
const host = { invitationId: 'INV-G049', guestId: 'G049', submissionId: 'SYL-G049-00000000', registration: HOSTREG, recipient: { email: 'groom.test@example.org', phone: '' }, rooms: { 'bkk-stay': { key: 'bkk-stay/penthouse', label: 'A', room: 'Room A', name: 'Elegant 6BR Sathon Penthouse', fixed: true } }, kind: 'initial', version: 1, submittedAt: '2026-09-16T17:52:41.404Z', lastSentAt: '2026-09-16T17:52:41.696Z', firstSentAt: '2026-09-16T17:52:41.404Z' };
const strip = (html) => html.replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<\/(p|div|tr|td|h\d|li|table)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
const out = [];
const block = (title, m) => { out.push('=================================================='); out.push(title); out.push('=================================================='); out.push('SUBJECT: ' + m.subject); out.push(''); out.push('--- HTML (visible text) ---'); out.push(strip(m.html)); out.push(''); out.push('--- PLAIN TEXT ---'); out.push(m.text); out.push(''); };
block('GUEST EMAIL · INITIAL (journey received)', composeGuestMail(rec()));
block('GUEST EMAIL · UPDATE (journey updated, version 2)', composeGuestMail(rec({ kind: 'update', version: 2, lastSentAt: '2026-09-16T18:10:03.000Z' })));
block('GUEST EMAIL · HOST WITH A FIXED ARRANGEMENT', composeGuestMail(host));
block('GUEST RELATIONS EMAIL · INITIAL', composeOwnerMail(rec(), 'https://seeyouinlaos-website.suthep-hrg.workers.dev/register-landing.html'));
block('GUEST RELATIONS EMAIL · UPDATE', composeOwnerMail(rec({ kind: 'update', version: 2, lastSentAt: '2026-09-16T18:10:03.000Z' }), 'https://seeyouinlaos-website.suthep-hrg.workers.dev/register-landing.html'));
fs.writeFileSync(path.join(ROOT, 'docs/review/008-copy-audit/emails.txt'), out.join('\n') + '\n');
console.log('emails.txt', out.join('\n').split('\n').length, 'lines');
