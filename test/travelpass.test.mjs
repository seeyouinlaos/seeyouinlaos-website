/* ============================================================================
   THE TRAVEL PASS (Owner, 15 Sep 2026) — every transport leg is a ticket with
   a code to scan; the same pass on Your Journey, the transport page, the bag
   and Review & Send; a real PDF; C86 USD 105 everywhere (the current Operations Master, release 014 · 19 Sep 2026); no checkout words.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { page, src, PEGGY, HARUTHAI, CORE } from './sandbox.mjs';

const require = createRequire(import.meta.url);
const T = require('../assets/travelpass.js');
const WITH_PASS = [...CORE, 'assets/seatpass.js', 'assets/vendor/qrcode.js', 'assets/travelpass.js'];
const guest = { guestId: 'g-peggy', fullName: 'Peggy Demo', preferredName: 'Peggy' };

test('LEGS: the four transport legs, from the source facts — codes, times, dates, classes', () => {
  assert.deepEqual(T.ORDER, ['train', 'mu9646', 'c86', 'return']);
  const tn = T.LEGS.train; assert.equal(tn.kind, 'train'); assert.equal(tn.from.time, '20:25'); assert.equal(tn.to.time, '06:25'); assert.equal(tn.from.date, '24 Feb 2027'); assert.equal(tn.to.date, '25 Feb 2027');
  assert.equal(tn.from.place, 'Krung Thep Aphiwat Central Terminal'); assert.match(tn.cls, /First Class Sleeper/);
  const fl = T.LEGS.mu9646; assert.equal(fl.kind, 'flight'); assert.equal(fl.from.code, 'VTE'); assert.equal(fl.to.code, 'KMG'); assert.equal(fl.from.time, '15:50'); assert.equal(fl.to.time, '18:25');
  assert.equal(T.classOf('mu9646', 'business'), 'Business Class'); assert.equal(T.classOf('mu9646', 'economy-flexible'), 'Economy Flexible'); assert.equal(T.classOf('mu9646', ''), 'Business Class');
  const c86 = T.LEGS.c86; assert.equal(c86.kind, 'train'); assert.equal(c86.from.code, 'KMG'); assert.equal(c86.to.code, 'LJG'); assert.equal(c86.from.time, '10:15'); assert.equal(c86.to.time, '13:44'); assert.equal(c86.cls, 'Business Class'); assert.equal(c86.operator, 'China Railway'); assert.equal(c86.duration, '3 h 29 min · direct'); assert.equal(fl.duration, '1 h 35 min · non-stop');
  const rt = T.LEGS['return']; assert.equal(rt.kind, 'flight'); assert.equal(rt.from.code, 'LJG'); assert.equal(rt.to.code, 'BKK'); assert.equal(rt.from.time, '10:00'); assert.equal(rt.to.time, '14:55'); assert.equal(rt.cls, 'Economy Flexible'); assert.equal(rt.duration, '5 h 55 min in all · 2 h 20 min in Kunming'); assert.equal(rt.code, 'MU5922'); assert.match(rt.title, /^MU5922 \+ MU741/); assert.match(rt.to.place, /2 h 20 m/);   /* the Owner-confirmed return flights, 20 Sep 2026 */
  assert.equal(T.isLeg('wedstay'), false); assert.equal(T.isLeg('c86'), true);
  /* nothing invented: no airport names the source does not carry */
  assert.doesNotMatch(src('assets/travelpass.js'), /Suvarnabhumi|Changshui|Sanyi|Wattay|Don Mueang/);
});

test('REFERENCE: deterministic per guest · leg · class, never the access code, never the invitation id', () => {
  const a = T.ref('g-peggy', 'c86', ''), b = T.ref('g-peggy', 'c86', '');
  assert.equal(a, b); assert.match(a, /^SYL-C86-[23456789BCDFGHJKMNPQRSTVWXZ]{4}$/);
  assert.notEqual(T.ref('g-peggy', 'c86', ''), T.ref('g-steffie', 'c86', ''), 'each guest their own');
  assert.notEqual(T.ref('g-peggy', 'mu9646', 'business'), T.ref('g-peggy', 'mu9646', 'economy-flexible'), 'a class change is a new pass');
  assert.match(T.ref('g-peggy', 'mu9646', 'business'), /^SYL-MU9646-/); assert.match(T.ref('g-peggy', 'train', ''), /^SYL-TN25-/); assert.match(T.ref('g-peggy', 'return', ''), /^SYL-MU5922-/);
  assert.equal(T.ref('g-peggy', 'wedstay', ''), null); assert.equal(T.ref('', 'c86', ''), null);
});

test('THE CODE: a real QR (UTF-8 byte mode) that carries the pass and nothing secret; the SVG is crisp modules', () => {
  const d = T.docFor('c86', { guest, price: 105, state: 'selected' });
  const p = T.payload(d);
  assert.match(p, /^SEE YOU IN LAOS\nTRAVEL PASS SYL-C86-[A-Z0-9]{4}\nPeggy\nC86 Kunming → Lijiang\n4 March 2027\nBusiness Class\nSELECTED$/);   /* dates without a leading zero (Window 007) */
  assert.doesNotMatch(p, /INV-|g-peggy|USD|\b85\b|105/, 'no invitation id, no guest id, no price in the code');
  const m = T.modules(p); assert.ok(m.length >= 21 && m.length % 4 === 1, 'a QR version'); assert.equal(m[0].length, m.length);
  /* the finder pattern in the top-left corner: a 7 × 7 frame */
  assert.deepEqual(m[0].slice(0, 7), [true, true, true, true, true, true, true]); assert.deepEqual(m[1].slice(0, 7), [true, false, false, false, false, false, true]);
  const svg = T.qrSvg(p, 96, 'x');
  assert.match(svg, /^<svg class="p-qr" viewBox="0 0 \d+ \d+" width="96" height="96" shape-rendering="crispEdges" role="img" aria-label="x">/);
  assert.match(svg, /fill="#313131"/); assert.doesNotMatch(svg, /#0000ff|#1e90ff|#2196f3/i, 'ink, not blue');
  /* the payload changes with the state, so a downloaded pass says what it was */
  assert.notEqual(T.payload(T.docFor('c86', { guest, state: 'sent' })), p);
});

test('THE DOCUMENT: state words Selected / Sent to us / Confirmed by Guest Relations; the guest; the class from the bag line', () => {
  /* the one state grammar (Window 007 · TO-00542 / TO-01584): Selected → Sent to us → Confirmed by Guest Relations */
  assert.equal(T.docFor('train', { guest, state: 'selected' }).stateWords, 'Selected');
  assert.equal(T.docFor('train', { guest, state: 'sent' }).stateWords, 'Sent to us');
  assert.equal(T.docFor('train', { guest, state: 'confirmed' }).stateWords, 'Confirmed by Guest Relations');
  assert.equal(T.docFor('train', { guest: null }), null, 'no guest, no pass');
  assert.equal(T.docFor('wedstay', { guest }), null, 'a stay is not a ticket');
  const eco = T.docFor('mu9646', { guest, cls: 'economy-flexible', price: 155 }); assert.equal(eco.cls, 'Economy Flexible'); assert.equal(eco.price, 155);
});

test('THE PDF: a real document with the route, the guest, the class, the reference, the code as rectangles — and honest words', () => {
  const d = T.docFor('mu9646', { guest, cls: 'business', price: 275, state: 'selected', at: '2026-09-15T10:00:00.000Z' });
  const pdf = T.compose(d);
  assert.match(pdf, /^%PDF-1\.4\n/); assert.match(pdf, /%%EOF\n$/); assert.match(pdf, /\/Type \/Catalog/);
  assert.match(pdf, /\(TRAVEL PASS \\267 FLIGHT\)/); assert.match(pdf, /\(YOUR TRAVEL PASS\)/); assert.match(pdf, /\(MU9646 \\267 Vientiane \\226 Kunming\)/, 'the arrow becomes an en dash on paper'); assert.doesNotMatch(pdf, /\?/, 'no character lost to WinAnsi'); assert.match(pdf, /\(VTE\)/); assert.match(pdf, /\(KMG\)/);
  assert.match(pdf, /\(Peggy Demo\)/); assert.match(pdf, /\(Business Class\)/); assert.match(pdf, new RegExp('\\(' + d.ref + '\\)'));
  assert.match(pdf, /\(YOUR TOTAL\) Tj[\s\S]*?\(USD 275 per person\)/); assert.match(pdf, /\(SELECTED\)/); assert.match(pdf, /\(FOR YOUR RECORDS\)/, 'TO-01598'); assert.doesNotMatch(pdf, /SHOW TO GUEST RELATIONS/);
  /* a ticket: the frame, the perforation, the stub; nothing clipped */
  assert.match(pdf, /\[3 3\] 0 d /); assert.match(pdf, / c h B/);
  const geo = require('../assets/seatpass.js').writer.within(T.compose.lastPage); assert.equal(geo.ok, true, JSON.stringify(geo.outside.slice(0, 3)));
  /* the honest words (Window 007 · TO-01600 … TO-01605): not a ticket, nothing paid, what the code holds, the latest pass counts */
  assert.match(pdf, /Nothing is paid on this website/); assert.match(pdf, /\(Not a ticket \\227 Guest Relations sends you the carrier\\222s ticket\.\)/);
  assert.match(pdf, /\(This travel pass shows your choice for the wedding journey of Haruthai & Suthep, as it stood when you\) Tj[\s\S]*?\(downloaded it\.\)/, 'wrapped across lines, the words are all there');
  assert.match(pdf, /You have not sent this choice to us yet\./); assert.match(pdf, /If you change your trip, download a new pass \\227 the latest one is the one that counts\./);
  assert.match(pdf, /\(DOWNLOADED ON 15 SEPTEMBER 2026, 10:00 UTC\)/, 'TO-01531');
  const rects = (pdf.match(/ re f/g) || []).length; assert.ok(rects > 300, 'the code is drawn module by module: ' + rects);
  assert.doesNotMatch(pdf, /INV-|g-peggy|siyl\.bearer/, 'no invitation id, no guest id, no secret');
  assert.equal(T.filename(d), 'see-you-in-laos-travel-pass-mu9646-peggy.pdf');
  const bytes = T.compose(T.docFor('train', { guest, price: 100, state: 'confirmed' })); assert.match(bytes, /\(Guest Relations has confirmed this journey\.\)/, 'TO-01601'); assert.match(bytes, /\(CONFIRMED BY GUEST\)/);
  for (const leg of ['train', 'mu9646', 'c86', 'return']) { T.compose(T.docFor(leg, { guest: { guestId: 'g', fullName: 'A Very Long Guest Name Indeed', preferredName: 'A' }, price: 1, state: 'sent' })); assert.equal(require('../assets/seatpass.js').writer.within(T.compose.lastPage).ok, true, leg + ' fits'); }
});

test('THE CARD on the page: the ticket grammar — both ends, times, class, guest, reference, code — for a selected leg; a quiet card otherwise', () => {
  const w = page({ modules: WITH_PASS, seed: { 'siyl.bag': [{ id: 'c86', name: 'C86 · Kunming → Lijiang', meta: '4 March 2027 · Business Class', price: 105 }] } });
  const on = w.SIYL_TRAVELPASS.card('c86', { selected: true, price: 'USD 105', actions: w.SIYL_TRAVELPASS.button('c86') });
  /* TO-03577 “Train · China Railway”; the head reads the line's state word (“Selected”), no “Current selection” */
  assert.match(on, /class="p-ticket on" data-ticket="c86"/); assert.match(on, /<p class="t-l1">Train · China Railway<\/p>/); assert.match(on, /data-ticket-state><i class="prep-tick" aria-hidden="true"><\/i>Selected<\/p>/); assert.doesNotMatch(on, /Current selection/);
  assert.match(on, /Not a ticket — Guest Relations sends you the carrier’s ticket\./);
  assert.match(on, /<b class="p-ticket-code">KMG<\/b><span class="p-ticket-time">10:15<\/span>/); assert.match(on, /<b class="p-ticket-code">LJG<\/b><span class="p-ticket-time">13:44<\/span>/);
  assert.match(on, />4 Mar 2027</); assert.match(on, /<p class="t-l1">Class<\/p><p class="t-b1">Business Class<\/p>/); assert.match(on, /<p class="t-l1">Guest<\/p><p class="t-b1">Peggy<\/p>/);
  assert.match(on, /<span class="ref">SYL-C86-[A-Z0-9]{4}<\/span>/); assert.match(on, /<svg class="p-qr"/); assert.match(on, /<\/svg><p class="t-l1">Selected<\/p>/);
  assert.match(on, /Your total<\/p><p class="t-b1">USD 105<\/p>/); assert.match(on, /data-travel-pass="c86">Download travel pass</); assert.match(on, /p-ticket-tear/); assert.match(on, /p-ticket-train/);
  const off = w.SIYL_TRAVELPASS.card('train', { selected: false });
  assert.match(off, /class="p-ticket" data-ticket="train"/); assert.match(off, /Not selected/); assert.doesNotMatch(off, /p-qr|SYL-TN25/, 'no pass before the selection');
  assert.match(off, /Appears once you choose this journey/, 'TO-01587'); assert.match(off, /p-ticket-train/);
  assert.match(w.SIYL_TRAVELPASS.card('mu9646', { selected: false }), /p-ticket-flight/);
  /* the strip: the same pass in one row, for the bag and Review & Send */
  const strip = w.SIYL_TRAVELPASS.strip('c86');
  assert.match(strip, /class="p-pass" data-pass="c86"/); assert.match(strip, /<b>KMG<\/b> 10:15 .*<b>LJG<\/b> 13:44/); assert.match(strip, /4 March 2027 · Business Class/); assert.match(strip, /Travel pass <span class="ref">SYL-C86-[A-Z0-9]{4}<\/span> · Selected/);
  assert.equal(w.SIYL_TRAVELPASS.strip('train'), '', 'no line, no strip');
  /* deliver refuses a leg that is not in the journey */
  const refused = w.SIYL_TRAVELPASS.deliver('train'); assert.equal(refused.ok, false); assert.equal(refused.error, 'not selected');
});

test('THE STATE follows Review & Send: once received, every pass says Sent; the reference stays the same', () => {
  const w = page({ modules: WITH_PASS, seed: { 'siyl.bag': [{ id: 'train', name: 'Special Express No. 25', meta: 'x', price: 100 }] } });
  const before = w.SIYL_TRAVELPASS.docFromPage('train');
  assert.equal(before.state, 'selected');
  w.SIYL_CONFIRM.noteReceived('2026-09-15T10:00:00.000Z');
  const after = w.SIYL_TRAVELPASS.docFromPage('train');
  assert.equal(after.state, 'sent'); assert.equal(after.ref, before.ref); assert.equal(after.sentAt, '2026-09-15T10:00:00.000Z');
  assert.match(w.SIYL_TRAVELPASS.card('train', { selected: true }), /prep-tick"[^>]*><\/i>Sent to us</, 'TO-01584');
});

test('SURFACES: TICKET = TICKET · CART = CART · REVIEW = REVIEW (Owner, 15 Sep 2026)', () => {
  const yj = src('your-journey.html'), tr = src('transport.html'), ct = src('cart.html'), rv = src('review.html'), tk = src('tickets.html');
  /* the pass stands where the leg is chosen, on the transport page and on the tickets page */
  for (const f of [yj, tr, tk]) { assert.match(f, /assets\/vendor\/qrcode\.js/); assert.match(f, /assets\/travelpass\.js/); assert.match(f, /assets\/seatpass\.js/); }
  assert.match(yj, /TP\.card\(seg\.key,\{selected:sel/); assert.match(yj, /TP\.card\('mu9646',\{selected:!!line,cls:cur\|\|'business'/); assert.match(yj, /SIYL_TRAVELPASS\.wire\(box\)/);
  assert.match(tr, /<div class="ticket" id="ticket"><\/div>/); assert.match(tr, /function paintTicket\(\)/); assert.match(tr, /assets\/prep\.css/);
  assert.match(tk, /PASS\.card\(doc/); assert.match(tk, /TP\.card\(l,\{selected:true/); assert.match(tk, /Seat tickets/); assert.match(tk, /Travel passes/);
  /* the cart carries no ticket code, no pass strip, no QR — selected items, change/remove/view details, the total */
  assert.doesNotMatch(ct, /travelpass\.js|qrcode\.js|seatpass\.js|TP\.strip|cart-pass|p-qr|data-travel-pass|SIYL_TRAVELPASS/);
  assert.match(ct, /data-change=/); assert.match(ct, /data-remove=/); assert.match(ct, /href="'\+detailHref\(x\)\+'">Details<\/a>/, 'TO-01623'); assert.doesNotMatch(ct, /View details/i); assert.match(ct, /Your total/);
  /* Review shows the selection and points to the tickets; the sent text still names the pass reference per leg for Guest Relations */
  assert.doesNotMatch(rv, /TP\.strip|cart-pass|PASS\.card|p-qr/); assert.match(rv, /href="tickets\.html">Your tickets/); assert.match(rv, /' · TRAVEL PASS '\+pd\.ref/);
  /* the seat ticket carries its code too — on the ticket, from the shared writer */
  assert.match(src('assets/seatpass.js'), /Page\.prototype\.qr = /); assert.match(src('assets/seatpass.js'), /function card\(doc, opts\)/);
  assert.match(src('wedding-preparation.html'), /PASS\.card\(doc,\{actions:passLink/);
  assert.match(src('assets/shop-menu.js'), /tickets\.html">Your tickets/);
});

test('ONE PRICE SOURCE (Owner, 15 Sep 2026 · Edit 2): a bag line saved at C86 85 is re-derived to 105 on load; the line, its words, the total, removing and re-adding, and every surface agree', () => {
  /* the guest's bag as the Owner's Edit 2 screenshot had it: C86 saved at the superseded 85, beside a flight saved at a wrong amount */
  const w = page({ modules: ['assets/bag.js', 'assets/rooms-data.js', 'assets/pricing.js', 'assets/guest.js', 'assets/temple.js', 'assets/confirm.js', 'assets/seatlabels.js', 'assets/seating.js', 'assets/rooms.js', 'assets/stay.js', 'assets/transport-data.js', 'assets/journey.js'],
    seed: { 'siyl.bag': [{ id: 'train', name: 'Special Express No. 25', meta: '24 – 25 February 2027 · First Class Sleeper', price: 100, qty: 1 }, { id: 'c86', name: 'C86 · Kunming → Lijiang', meta: '04 March 2027 · Business Class', price: 85, qty: 1 }, { id: 'mu9646', name: 'MU9646 · Vientiane → Kunming', meta: 'x', price: 250, qty: 1, cls: 'business' }] } });
  const B = w.SIYL_BAG, P = w.SIYL_PRICE, J = w.SIYL_JOURNEY;
  const c86 = B.get().find((x) => x.id === 'c86');
  assert.equal(P.FLAT.c86.price, 105, 'the authoritative price');
  assert.equal(c86.price, 105, 'the cart\'s prominent line price is the authoritative one, not the saved 85');
  assert.equal(c86.meta, '4 March 2027 · Business Class', 'the meta is re-derived as well (no leading zero)');
  assert.match(J.meta(c86).basis, /^USD 105 per person · 1 seat · Business Class$/, 'the descriptive line');
  assert.equal(B.get().find((x) => x.id === 'mu9646').price, 275, 'every flat line is re-derived, the chosen class kept');
  assert.equal(B.total(), 100 + 105 + 275, 'the total is the sum of authoritative amounts');
  /* removing C86 takes exactly 105 off; adding it back puts exactly 105 on — from the source, not from any saved amount */
  const before = B.total(); B.remove('c86'); assert.equal(B.total(), before - 105);
  B.put(P.items('c86')[0]); assert.equal(B.total(), before); assert.equal(B.get().find((x) => x.id === 'c86').price, 105);
  /* every surface reads the same line and the same total: no second arithmetic anywhere */
  assert.match(src('cart.html'), /'<p class="p-line-amt">'\+money\(x\.price\|\|0\)\+'<span class="t-l1">'\+\(x\.id==='1872'\|\|x\.id==='tea1872'\?'for the table':'per person'\)\+'<\/span><\/p>'/, 'the cart line price is the line, with its basis (PRQ-04-11)');
  assert.match(src('cart.html'), /money\(B\.total\(\)\)/); assert.match(src('assets/bag.js'), /B\.money\(B\.total\(\)\)/, 'the sticky bar');
  assert.match(src('your-journey.html'), /money\(SIYL_BAG\.total\(\)\)/); assert.match(src('review.html'), /SIYL_BAG\.total\(\)\.toLocaleString/, 'Review & Send');
  assert.match(src('review.html'), /'TOTAL: USD '\+SIYL_BAG\.total\(\)\.toLocaleString/, 'the sent journey');
  assert.match(src('review.html'), /' · USD '\+\(x\.price\|\|0\)/, 'the sent lines carry the line amount');
  assert.match(src('assets/pricing.js'), /\(function repriceFlat\(\) \{/);
  for (const f of ['cart.html', 'your-journey.html', 'review.html', 'assets/bag.js', 'assets/journey.js']) assert.doesNotMatch(src(f), /price\s*[:=]\s*(85|105)\b|\bUSD (85|105)\b/, f + ': no C86 amount of its own');
});

test('C86 = USD 105 everywhere active — no mixed legacy amount, no active 85 (the current Operations Master, release 014 · 19 Sep 2026)', () => {
  const w = page({ modules: WITH_PASS });
  assert.equal(w.SIYL_PRICE.FLAT.c86.price, 105); assert.equal(w.SIYL_PRICE.items('c86')[0].price, 105); assert.match(w.SIYL_PRICE.FLAT.c86.basis, /USD 105 per person/);
  assert.match(src('journeys.html'), /<p class="pp" data-private>USD 105 per person<\/p><button class="add" data-private data-add='\{"id":"c86"/); assert.match(src('journeys.html'), /"id":"c86"[^']*"price":105/);
  assert.match(src('register/data.mjs'), /id: 'kmg-ljg'[^\n]*contribution: 105/);
  for (const f of ['assets/pricing.js', 'journeys.html', 'your-journey.html', 'transport.html', 'assets/transport-data.js', 'assets/journey.js', 'cart.html', 'review.html', 'register/data.mjs', 'assets/travelpass.js']) {
    const s = src(f);
    assert.doesNotMatch(s.replace(/\/\*[\s\S]*?\*\//g, ''), /c86[^\n]{0,80}\b85\b/i, f + ' still carries C86 at 85');
    assert.doesNotMatch(s, /USD 85 per person[^\n]{0,60}(Business|C86|Lijiang)/, f + ' still says USD 85 for C86');
  }
  /* the journey, the bag, the sticky total and Review & Send are one calculation */
  w.SIYL_BAG.put(w.SIYL_PRICE.items('c86')[0]);
  assert.equal(w.SIYL_BAG.total(), 105);
  assert.equal(w.SIYL_TRAVELPASS.docFromPage('c86').price, 105);
});

test('NO CHECKOUT LANGUAGE on the bag, the tickets or the passes — this is a private journey, not a shop', () => {
  for (const f of ['cart.html', 'assets/travelpass.js', 'assets/bag.js', 'transport.html', 'your-journey.html', 'review.html', 'tickets.html', 'assets/seatpass.js']) {
    const s = src(f).replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(s, /\b(checkout|check out|delivery|payment method|card details|add to cart|boarding pass|gate closes|seat \d+[A-F]\b)/i, f);
    assert.doesNotMatch(s, /data-qty|class="qty|stepper|aria-label="Quantity|Quantity<|B\.qty\(|SIYL_BAG\.qty\(/, f + ': no quantity controls');
  }
  /* the page is “My Bag” (Window 007 · TO-01629 / TO-01633): “Your bag” is retired; empty reads “Nothing chosen yet” */
  assert.match(src('cart.html'), /<h1 class="t-d1">My Bag<\/h1>/); assert.match(src('cart.html'), /Nothing chosen yet · USD 0/); assert.doesNotMatch(src('cart.html'), /Your bag/);
  assert.match(src('cart.html'), /Your total/); assert.match(src('cart.html'), /Review (&amp;|&) Send/);
  assert.match(src('cart.html'), /data-change=/); assert.match(src('cart.html'), /data-remove=/); assert.match(src('cart.html'), />Details<\/a>/);
});

test('THE TICKET GRAMMAR lives in the one design system — paper, ink, the tear; no bright blue; reduced motion respected', () => {
  const css = src('assets/prep.css');
  for (const r of ['.p-ticket {', '.p-ticket.on {', '.p-ticket-route {', '.p-ticket-code {', '.p-ticket-tear {', '.p-ticket-facts {', '.p-ticket-code-box {', '.p-ticket-event {', '.p-tickets > .p-ticket + .p-ticket {']) assert.ok(css.includes(r), r + ' missing');
  const ticket = css.slice(css.indexOf('THE TRAVEL PASS'));
  assert.doesNotMatch(ticket, /#(0000ff|1e90ff|2196f3|00bfff|007aff)/i);
  assert.match(ticket, /prefers-reduced-motion: reduce\) \{ \.p-ticket \{ transition: none; \}/);
  assert.match(ticket, /@media \(min-width: 560px\)/, 'mobile first, one breakpoint up');
});
