/* THE GUEST'S OWN WORD (Owners, 18 Nov 2026 — "Registrierung nutzen"): where the person's 006 row holds no nationality, the
   nationality the guest stated in their own SENT registration routes the payment method. Synthetic people only. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { routeFor, statedNationality, effectivePreference, registrationNationalityKind } from '../src/billing/preference.js';

const reg = (v) => ({ found: true, value: v, reason: null });
const blank = reg('');
const sent = (nat, extra = {}) => ({ submissionId: 'SYL-X1-1', guestId: 'GX1', registration: { guestId: 'GX1', contactId: 'CON-X1', personal: { guestId: 'GX1', nationality: nat } }, ...extra });
const own = (r, c) => statedNationality({ record: r, contact: c, guestId: 'GX1', contactId: 'CON-X1' });

test('ROUTE · 006 blank: the guest\'s own sent "Thai" routes THB (PromptPay), a non-Thai word EUR (PayPal, SEPA)', () => {
  const thb = routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent('Thai')) });
  assert.equal(thb.route, 'THB'); assert.equal(thb.default, 'PROMPTPAY_THB'); assert.equal(thb.basis, 'REGISTRATION_THAI');
  const eur = routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent('German')) });
  assert.equal(eur.route, 'EUR'); assert.deepEqual([...eur.options], ['SEPA_EUR', 'PAYPAL_EUR']); assert.equal(eur.default, 'SEPA_EUR'); assert.equal(eur.basis, 'REGISTRATION_NON_THAI');
  const p = effectivePreference({ record: null, route: thb });
  assert.equal(p.determined, true); assert.equal(p.channel, 'PROMPTPAY_THB'); assert.equal(p.source, 'DEFAULT_ROUTING');
});

test('ROUTE · 006 always wins where it holds a nationality; a person 006 does not hold is not routed by the registration', () => {
  const r = routeFor({ holderId: 'INV-X1', nationality: reg('German'), stated: own(sent('Thai')) });
  assert.equal(r.route, 'EUR'); assert.equal(r.basis, 'NATIONALITY_NON_THAI');
  const none = routeFor({ holderId: 'INV-X1', nationality: { found: false, value: null, reason: 'PERSON_NOT_IN_REGISTER' }, stated: own(sent('Thai')) });
  assert.equal(none.route, null); assert.equal(none.reason, 'PERSON_NOT_IN_REGISTER');
  const amb = routeFor({ holderId: 'INV-X1', nationality: { found: false, value: null, reason: 'REGISTER_ID_AMBIGUOUS' }, stated: own(sent('Thai')) });
  assert.equal(amb.route, null); assert.equal(amb.reason, 'REGISTER_ID_AMBIGUOUS');
});

test('ROUTE · never a guess: Thai with another nationality, nothing sent, nothing stated, two statements that disagree — undetermined', () => {
  const mixed = routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent('Thai, German')) });
  assert.equal(mixed.route, null); assert.equal(mixed.reason, 'NATIONALITY_MIXED_WITH_THAI');
  assert.equal(routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(null) }).reason, 'NATIONALITY_MISSING');
  assert.equal(routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent('')) }).reason, 'NATIONALITY_MISSING');
  assert.equal(routeFor({ holderId: 'INV-X1', nationality: blank, stated: null }).reason, 'NATIONALITY_MISSING');
  const conflict = routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent('Thai'), { nationality: 'German' }) });
  assert.equal(conflict.route, null); assert.equal(conflict.reason, 'REGISTRATION_NATIONALITY_CONFLICT');
});

test('STATED · only the person this invitation names: a record or contact of another guest or another 006 person is never read', () => {
  assert.deepEqual(own(null), { found: false, value: null, reason: 'NOT_SENT' });
  assert.equal(own(sent('Thai', { guestId: 'GX2' })).reason, 'REGISTRATION_OTHER_PERSON');
  const otherRow = sent('Thai'); otherRow.registration.contactId = 'CON-X9';
  assert.equal(own(otherRow).reason, 'REGISTRATION_OTHER_PERSON');
  const noId = { submissionId: 'SYL-X1-1', registration: { personal: { nationality: 'Thai' } } };
  assert.equal(own(noId).reason, 'REGISTRATION_OTHER_PERSON', 'a record that names nobody is nobody\'s');
  /* the value is always the one SENT, read as Guest Relations' e-mail reads it: personal, then guestRecord.contact, then contact */
  const older = sent(''); older.registration.guestRecord = { contact: { nationality: 'Thai' } };
  assert.deepEqual(own(older), { found: true, value: 'Thai', reason: null });
  const oldest = sent(''); oldest.registration.contact = { nationality: 'German' };
  assert.deepEqual(own(oldest), { found: true, value: 'German', reason: null });
  /* the current contact is a check, never a source */
  assert.equal(own(sent(''), { guestId: 'GX1', nationality: 'Thai' }).reason, 'NATIONALITY_MISSING');
  assert.equal(own(sent('Thai'), { guestId: 'GX2', nationality: 'German' }).found, true, 'another guest\'s contact is not read');
  /* the same word spelled differently is no conflict */
  assert.deepEqual(own(sent('Thai'), { nationality: 'Thailand' }), { found: true, value: 'Thai', reason: null });
  assert.deepEqual(own(sent('Thai'), { nationality: '\u0e44\u0e17\u0e22' }), { found: true, value: 'Thai', reason: null });
  /* nothing sent without a submission; a store that cannot be read is said as such */
  const draftOnly = sent('Thai'); delete draftOnly.submissionId;
  assert.equal(own(draftOnly).reason, 'NOT_SENT');
  assert.equal(statedNationality({ unreadable: true }).reason, 'REGISTRATION_UNREADABLE');
  assert.equal(routeFor({ holderId: 'INV-X1', nationality: blank, stated: statedNationality({ unreadable: true }) }).reason, 'REGISTRATION_UNREADABLE');
});

test('ROUTE · the couple and the explicit Owner decisions come first, as before', () => {
  assert.equal(routeFor({ holderId: 'INV-G023', nationality: blank, stated: own(sent('German')) }).basis, 'OWNER_DECISION');
  assert.equal(routeFor({ holderId: 'INV-G071', nationality: blank, stated: own(sent('Thai')) }).route, 'EUR');
});

test('FREE TEXT · the guest\'s own word is read strictly: THB only for "Thai" itself; Thai beside anything else, a code, a placeholder or another script is never routed', () => {
  const route = (v) => { const r = routeFor({ holderId: 'INV-X1', nationality: blank, stated: own(sent(v)) }); return r.route || r.reason; };
  for (const v of ['Thai', 'thai', 'THAI', 'Thailand', 'thailändisch', '\u0e44\u0e17\u0e22', '\u0e2a\u0e31\u0e0d\u0e0a\u0e32\u0e15\u0e34\u0e44\u0e17\u0e22']) assert.equal(route(v), 'THB', v);
  for (const v of ['\u0e44\u0e17\u0e22, \u0e40\u0e22\u0e2d\u0e23\u0e21\u0e31\u0e19', 'Thai German', 'Thai-German', 'Thai (German)', 'Thai/German', 'German and Thai', 'Thai national', 'Thai + Lao'])
    assert.equal(route(v), 'NATIONALITY_MIXED_WITH_THAI', v);
  for (const v of ['TH', 'DE', '\u4e2d\u56fd', 'German1', 'n/a x', 'Tha\u00ef', 'Tha\u00eflandaise', 'Tailandese', 'Tailand\u00e9s', 'THA', 'Siamese']) assert.equal(route(v), 'REGISTRATION_NATIONALITY_UNRECOGNISED', v);
  for (const v of ['-', '?', 'n/a', 'none', 'unknown', '...']) assert.equal(route(v), 'NATIONALITY_MISSING', v);
  for (const v of ['German', 'Deutsch', 'Lao', 'British', 'German, Austrian', 'Österreichisch']) assert.equal(route(v), 'EUR', v);
  /* American (Owners, 20 Nov 2026 · HS-004.19): PromptPay — alone or beside Thai; beside another nationality decided per person */
  for (const v of ['American', 'american', 'USA', 'U.S.A.', 'US', 'United States', 'United States of America', 'US-American', 'Amerikanisch', 'Thai / American', 'American, Thai'])
    assert.equal(route(v), 'THB', v);
  for (const v of ['American, German', 'German / American', 'American and British', 'African American', 'Latin American', 'South American']) assert.equal(route(v), 'NATIONALITY_MIXED_WITH_AMERICAN', v);
  assert.equal(registrationNationalityKind('Thai').kind, 'THAI');
});
