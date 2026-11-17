/* ============================================================================
   THE H&S ADMIN CONSOLE · the page module (assets/admin-billing.js) as the page
   loads it, against a fake server and a tiny stand-in for the rendered markup.
   Fictional guests and figures only.
     · a guest sees "for Haruthai and Suthep only" and nothing else; signed out, a sign-in
     · the list reads the overview, then Guest Relations' status in chunks of ≤ 10
     · opening a guest only reads; Issue needs the preview AND an explicit tick, and
       confirms the previewed statement's hash; Send needs its own tick and shows the
       recipient; Verify / Reject need a confirmation, Reject a reason
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, SUTHEP, PEGGY } from './sandbox.mjs';

const tick = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => ({ size: 1 }) });

/* the rendered markup, as far as the module's wiring asks: attribute selectors only */
function fakeRoot() {
  let html = '', cache = {};
  const parse = (attr) => {
    const out = [];
    const re = /<([a-z0-9]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/gi;
    let m;
    while ((m = re.exec(html))) {
      const attrs = {};
      m[2].replace(/([a-z-]+)(?:="([^"]*)")?/gi, (x, k, v) => { attrs[k] = v === undefined ? '' : v; return x; });
      if (!(attr in attrs)) continue;
      out.push({ tag: m[1], attrs, getAttribute: (k) => (k in attrs ? attrs[k] : null), value: attrs.value || '', checked: 'checked' in attrs, disabled: 'disabled' in attrs,
        focus() {}, setSelectionRange() {}, selectionStart: 0 });
    }
    return out;
  };
  return {
    get innerHTML() { return html; },
    set innerHTML(v) { html = String(v); cache = {}; },
    querySelectorAll(sel) { const m = /^\[([a-z-]+)\]$/.exec(sel); if (!m) return []; return cache[sel] || (cache[sel] = parse(m[1])); },
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
  };
}
function load(answers, opts = {}) {
  const calls = [];
  const w = page({
    path: 'admin/billing', modules: ['assets/admin-billing.js'], auth: opts.auth === undefined ? SUTHEP : opts.auth,
    fetch: (url, init = {}) => {
      calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
      const key = url.replace(/^\/api\/billing\//, '').split('?')[0];
      const a = answers[key];
      const out = typeof a === 'function' ? a(url, init) : a;
      return Promise.resolve(out && out.status ? out : res(200, out || { ok: true }));
    },
  });
  w.location.hash = opts.hash || '';
  const root = fakeRoot();
  w.SIYL_ADMIN_BILLING.boot(root);
  return { w, root, calls, A: w.SIYL_ADMIN_BILLING };
}
const el = (root, attr, value) => root.querySelectorAll('[' + attr + ']').find((e) => value == null || e.getAttribute(attr) === value);

const HOLDERS = Array.from({ length: 23 }, (_, i) => ({
  Holder_ID: 'INV-T' + (i + 1), guestId: 'GT' + (i + 1), hosts: false, name: { full: 'Guest ' + (i + 1) }, billingAdmin: false,
  settlement: i === 0 ? { Settlement_ID: 'S-T1-0001', state: 'ISSUED', latestRevision: 1, issuedRevision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', issuedTotal: 390 } : null,
  payment: i === 0 ? { status: 'UNPAID', ist: 0, balance: 390, overdue: false, pendingCount: 1, flags: [] } : null,
  method: { channel: i === 2 ? null : 'PAYPAL_EUR', currency: 'EUR', determined: i !== 2 }, drift: { count: 0, blocking: 0 },
}));
const OVERVIEW = { ok: true, asOf: '2026-10-07', audience: 'GROOM', chunk: 10, gate: { approved: true }, holders: HOLDERS };
const BOOKED = { 'INV-T1': { source: 'CURRENT_SELECTION', total: 390, selected: 2, lines: 2, onRequest: 0, unmapped: [] },
  'INV-T2': { source: 'CURRENT_SELECTION', total: 1248, selected: 3, lines: 3, onRequest: 1, unmapped: [] },
  'INV-T4': { source: 'SENT_VERSION', total: 510, selected: 2, lines: 2, onRequest: 0, unmapped: [] } };
const statusAnswer = (url) => {
  const ids = decodeURIComponent(url.split('ids=')[1]).split(',');
  return res(200, { ok: true, rows: ids.map((id) => ({ Holder_ID: id, confirmation: { state: id === 'INV-T2' ? 'CONFIRMED' : id === 'INV-T4' ? 'UNCONFIRMED' : 'NONE' },
    booked: BOOKED[id] || { source: 'NONE', total: 0, selected: 0, lines: 0, onRequest: 0, unmapped: [] },
    draft: id === 'INV-T2' ? { total: 245, lines: 1, manualReview: id === 'INV-T2' ? 1 : 0, unmapped: [] } : null })) });
};
const HOLDER = (over) => ({
  ok: true, asOf: '2026-10-07', Holder_ID: 'INV-T2',
  guest: { name: { full: 'Guest 2' }, guestId: 'GT2', email: 'guest2@example.invalid', emailSource: 'CONTACT' },
  confirmation: { state: 'CONFIRMED', version: 1, confirmedAt: '2026-10-02T09:00:00Z' },
  method: { channel: 'PAYPAL_EUR', currency: 'EUR', determined: true, locked: false, destinationComplete: true },
  settlement: { Settlement_ID: null, state: null, latestRevision: 0, revisions: [] },
  preview: { total: 245, hostedValue: 0, lines: [{ Person_ID: 'GT2', person: 'Guest 2', Item_ID: 'T-STAY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rate: 122.5, payableNights: 2, quantity: 1, amount: 245, block: 'A' }],
    blockB: [], manualReview: [], unmapped: [], issueDate: '2026-10-07', dueDate: '2026-10-28', fx: { FX_USD_EUR: 0.89, FX_USD_THB: 33.68 },
    inCurrency: { currency: 'EUR', amount: 218.05, rate: 0.89 }, issuable: true, reasons: [], proposalHash: 'a'.repeat(64), gate: { stored: true }, drifts: [] },
  issued: null, payment: null, payments: [], mail: null, ...(over || {}),
});

test('ADMIN UI · signed out: a sign-in, and no request at all', async () => {
  const { root, calls } = load({}, { auth: null });
  await tick();
  assert.match(root.innerHTML, /Sign in first/); assert.equal(calls.length, 0);
});

test('ADMIN UI · a guest: "for Haruthai and Suthep only" — no list, no figures', async () => {
  const { root, calls } = load({ 'admin/overview': res(403, { ok: false, error: 'billing administration is restricted' }) }, { auth: PEGGY });
  await tick();
  assert.match(root.innerHTML, /This page is for Haruthai and Suthep only\./);
  assert.doesNotMatch(root.innerHTML, /USD|INV-|Guest \d/);
  assert.equal(calls.length, 1); assert.equal(calls[0].headers['x-siyl-auth'], PEGGY.bearer);
});

test('ADMIN UI · the list: overview first, then Guest Relations\' status ten at a time, one request after another', async () => {
  const { root, calls, A } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer });
  await tick(30);
  const status = calls.filter((c) => c.url.startsWith('/api/billing/admin/status'));
  assert.equal(status.length, 3, '23 guests → 10 + 10 + 3');
  status.forEach((c) => assert.ok(decodeURIComponent(c.url.split('ids=')[1]).split(',').length <= 10));
  assert.ok(calls.every((c) => c.method === 'GET'), 'opening the console only reads');
  const h = root.innerHTML;
  assert.match(h, /Guest 1/); assert.match(h, /INV-T23/);
  assert.match(h, /Issued · V1/); assert.match(h, /USD 390\.00/);
  assert.match(h, /Not issued <span class="ab-n">22<\/span>/); assert.match(h, /Issued <span class="ab-n">1<\/span>/);
  assert.match(h, /Outstanding <span class="ab-n">1<\/span>/);
  assert.match(h, /Manual review <span class="ab-n">2<\/span>/, 'a draft line under review and a method to state');
  assert.match(h, /Booked <span class="ab-n">3<\/span>/);
  /* filters and search change only what is shown */
  el(root, 'data-ab-filter', 'review').onclick(); await tick();
  assert.match(root.innerHTML, /Guest 2/); assert.match(root.innerHTML, /Guest 3/); assert.doesNotMatch(root.innerHTML, /Guest 4</);
  assert.ok(A.state().filter === 'review');
});

test('BOOKED VALUE · the list shows what each guest has selected now — beside, never in place of, the statement figures', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer });
  await tick(30);
  const h = root.innerHTML;
  assert.match(h, /<th class="num">Booked value<\/th>/); assert.match(h, /<th class="num">Statement total<\/th>/);
  assert.doesNotMatch(h, /<th class="num">Total<\/th>/, 'no bare "Total" that could mean either');
  assert.doesNotMatch(h, /· draft/, 'the statement total never shows anything but an issued statement');
  const row = (id) => h.split('data-ab-open="' + id + '"')[1].split('</tr>')[0];
  /* not sent, nothing issued: a booked value, and dashes for every statement figure */
  const t2 = row('INV-T2');
  assert.match(t2, /data-l="Booked value" class="num"><span data-i18n-skip><b>USD 1,248\.00<\/b><\/span><br><span class="ab-mute">current selection<\/span><br><span class="ab-mute">\+ 1 on request/);
  for (const col of ['Statement total', 'Paid', 'Outstanding']) assert.match(t2, new RegExp('data-l="' + col + '" class="num"><span class="ab-mute">—</span>'), col);
  /* sent, not confirmed: the value as sent */
  assert.match(row('INV-T4'), /USD 510\.00<\/b><\/span><br><span class="ab-mute">as sent/);
  /* no selection */
  assert.match(row('INV-T5'), /Nothing selected/);
  /* an issued statement: the booked value and the statement total, each its own */
  const t1 = row('INV-T1');
  assert.match(t1, /data-l="Booked value" class="num"><span data-i18n-skip><b>USD 390\.00/); assert.match(t1, /data-l="Statement total" class="num"><span data-i18n-skip>USD 390\.00/);
  assert.match(h, /<b>Booked value<\/b> — what the guest has selected now/);
});

test('BOOKED VALUE · a status request that failed shows "not readable", never an endless "…"', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': res(503, { ok: false, error: 'down' }) });
  await tick(60);
  const t2 = root.innerHTML.split('data-ab-open="INV-T2"')[1].split('</tr>')[0];
  assert.match(t2, /data-l="Booked value" class="num"><span class="ab-chip open">not readable<\/span>/);
});

test('BOOKED VALUE · the guest view shows the lines behind it, and Issue stays disabled until Guest Relations confirms', async () => {
  const unconfirmed = HOLDER({
    confirmation: { state: 'UNCONFIRMED', version: 1 },
    booked: { source: 'CURRENT_SELECTION', updatedAt: '2026-10-06T09:00:00Z', total: 1248, selected: 2, lines: 2, onRequest: 0, unmapped: [],
      items: [{ person: 'Guest 2', Item_ID: 'T-STAY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rate: 145, payableNights: 2, quantity: 1, amount: 290, block: 'A' },
        { person: 'Guest 2', Item_ID: 'T-JOURNEY', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rate: 958, payableNights: 1, quantity: 1, amount: 958, block: 'A' }],
      blockB: [], sent: { version: 1, lastSentAt: '2026-10-05T09:00:00Z', total: 290, differs: true } },
    preview: { ...HOLDER().preview, total: 0, lines: [], issuable: false, proposalHash: null, reasons: ['BOOKING_NOT_CONFIRMED: UNCONFIRMED — Guest Relations confirms the sent trip first'] },
  });
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': unconfirmed }, { hash: '#holder=INV-T2' });
  await tick(30);
  const h = root.innerHTML;
  assert.match(h, /Booked value · the current selection, not a statement/);
  assert.match(h, /<h3 class="t-h1" data-i18n-skip>USD 1,248\.00<\/h3>/);
  assert.match(h, /T-JOURNEY/); assert.match(h, /USD 958\.00/);
  assert.match(h, /is worth <b data-i18n-skip>USD 290\.00<\/b> — the guest has changed the selection since/);
  assert.match(h, /does not make the guest issuable/);
  assert.match(h, /Statement total<\/span> <span>—/);
  el(root, 'data-ab-act', 'preview').onclick(); await tick();
  assert.equal(el(root, 'data-ab-act', 'issue').disabled, true, 'a booked value never makes a guest issuable');
  assert.match(root.innerHTML, /Statement preview · what Issue would freeze now/);
});

test('ADMIN UI · a guest: Issue only after Preview AND an explicit tick, confirming the previewed statement', async () => {
  let issued = false;
  const { root, calls } = load({
    'admin/overview': OVERVIEW, 'admin/status': statusAnswer,
    'admin/holder': () => res(200, issued ? HOLDER({ issued: { Settlement_ID: 'S-T2-0001', revision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', total: 245, hostedValue: 0, lines: [], fx: { FX_USD_EUR: 0.89, FX_USD_THB: 33.68 }, method: 'PAYPAL_EUR', currency: 'EUR' } }) : HOLDER()),
    issue: () => { issued = true; return res(200, { ok: true, Settlement_ID: 'S-T2-0001', revision: 1, totalPayable: 245, dueDate: '2026-10-28' }); },
  }, { hash: '#holder=INV-T2' });
  await tick(30);
  assert.match(root.innerHTML, /Guest 2/); assert.match(root.innerHTML, /guest2@example\.invalid/);
  const issueBtn = () => el(root, 'data-ab-act', 'issue');
  assert.equal(issueBtn().disabled, true, 'no issue before the preview is open');
  assert.match(root.innerHTML, /Open the preview first\./);
  assert.match(root.innerHTML, /Payments · 008, append-only/); assert.match(root.innerHTML, /No statement is issued for this guest yet\./);
  el(root, 'data-ab-act', 'preview').onclick(); await tick();
  assert.match(root.innerHTML, /Statement preview · what Issue would freeze now/); assert.match(root.innerHTML, /USD 245\.00/); assert.match(root.innerHTML, /T-STAY/);
  assert.equal(issueBtn().disabled, false);
  issueBtn().onclick(); await tick();
  assert.match(root.innerHTML, /Issue statement · final/);
  assert.equal(el(root, 'data-ab-issue-go').disabled, true, 'the tick comes first');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0);
  const box = el(root, 'data-ab-issue-check'); box.checked = true; box.onchange(); await tick();
  el(root, 'data-ab-issue-go').onclick(); await tick(20);
  const post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 1); assert.equal(post[0].url, '/api/billing/issue');
  assert.deepEqual(post[0].body, { holderId: 'INV-T2', expectedProposal: 'a'.repeat(64) });
  assert.match(root.innerHTML, /is issued/); assert.match(root.innerHTML, /Nothing has been e-mailed/);
});

test('ADMIN UI · a statement that cannot be issued says why, and offers no Issue', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer,
    'admin/holder': HOLDER({ preview: { ...HOLDER().preview, issuable: false, proposalHash: null, reasons: ['BOOKING_NOT_CONFIRMED: UNCONFIRMED — Guest Relations confirms the sent trip first'] } }) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(root, 'data-ab-act', 'preview').onclick(); await tick();
  assert.equal(el(root, 'data-ab-act', 'issue').disabled, true);
  assert.match(root.innerHTML, /BOOKING_NOT_CONFIRMED/);
  assert.equal(el(root, 'data-ab-act', 'send').disabled, true); assert.match(root.innerHTML, /Only an issued statement can be sent\./);
});

test('ADMIN UI · Send shows the recipient, e-mail, Statement ID, total and due date — and sends only on its own tick', async () => {
  const issuedHolder = HOLDER({ issued: { Settlement_ID: 'S-T2-0001', revision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', total: 245, hostedValue: 0, lines: [], fx: { FX_USD_EUR: 0.89, FX_USD_THB: 33.68 }, method: 'PAYPAL_EUR', currency: 'EUR' },
    payment: { status: 'UNPAID', soll: 245, ist: 0, balance: 245, pendingCount: 0, flags: [], overdue: false } });
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': issuedHolder,
    'admin/send': (url, init) => (init.method === 'POST' ? res(200, { ok: true, outcome: 'SENT' })
      : res(200, { ok: true, issued: true, recipientName: 'Guest 2', email: 'guest2@example.invalid', Settlement_ID: 'S-T2-0001', revision: 1, totalPayable: 245, dueDate: '2026-10-28', attempts: [] })) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(root, 'data-ab-act', 'send').onclick(); await tick(10);
  const h = root.innerHTML;
  for (const want of [/Guest 2/, /guest2@example\.invalid/, /S-T2-0001/, /USD 245\.00/, /28 Oct 2026/]) assert.match(h, want);
  assert.equal(el(root, 'data-ab-send-go').disabled, true);
  const box = el(root, 'data-ab-send-check'); box.checked = true; box.onchange(); await tick();
  el(root, 'data-ab-send-go').onclick(); await tick(20);
  const post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 1); assert.equal(post[0].url, '/api/billing/admin/send');
  assert.equal(post[0].body.holderId, 'INV-T2'); assert.equal(post[0].body.email, 'guest2@example.invalid'); assert.equal(post[0].body.revision, 1);
  assert.match(post[0].body.sendKey, /^[0-9a-f]{32}$/); assert.equal(post[0].body.again, false);
  assert.match(root.innerHTML, /The statement was sent to the guest\./);
});

test('ADMIN UI · Verify needs a confirmation; Reject needs a reason', async () => {
  const issuedHolder = HOLDER({ issued: { Settlement_ID: 'S-T2-0001', revision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', total: 245, hostedValue: 0, lines: [], fx: {}, method: 'PAYPAL_EUR', currency: 'EUR' },
    payment: { status: 'UNPAID', soll: 245, ist: 0, balance: 245, pendingCount: 2, flags: [], overdue: false },
    payments: [{ Payment_ID: 'PAY-A', Entry_Type: 'PAYMENT', Method: 'PAYPAL_EUR', Amount_Paid: 100, Currency_Paid: 'EUR', Amount_USD: 112.36, Reported_At: '2026-10-06T10:00:00Z', Record_Status: 'REPORTED', decision: null },
      { Payment_ID: 'PAY-B', Entry_Type: 'PAYMENT', Method: 'PAYPAL_EUR', Amount_Paid: 50, Currency_Paid: 'EUR', Amount_USD: 56.18, Reported_At: '2026-10-06T11:00:00Z', Record_Status: 'REPORTED', decision: null }] });
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': issuedHolder,
    'payment/verify': res(200, { ok: true }), 'payment/reject': res(200, { ok: true }) }, { hash: '#holder=INV-T2' });
  await tick(30);
  assert.match(root.innerHTML, /PAY-A/); assert.match(root.innerHTML, /EUR 100\.00/);
  root.querySelectorAll('[data-ab-pay]').find((e) => e.getAttribute('data-ab-pay') === 'verify' && e.getAttribute('data-id') === 'PAY-A').onclick(); await tick();
  assert.match(root.innerHTML, /Count this payment towards Paid\?/);
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0, 'nothing before the confirmation');
  el(root, 'data-ab-pay-go').onclick(); await tick(20);
  let post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 1); assert.equal(post[0].url, '/api/billing/payment/verify'); assert.deepEqual(post[0].body, { Payment_ID: 'PAY-A' });
  root.querySelectorAll('[data-ab-pay]').find((e) => e.getAttribute('data-ab-pay') === 'reject' && e.getAttribute('data-id') === 'PAY-B').onclick(); await tick();
  assert.equal(el(root, 'data-ab-pay-go').disabled, true, 'no rejection without a reason');
  const reason = el(root, 'data-ab-pay-reason'); reason.value = 'not on the PayPal statement'; reason.oninput();
  el(root, 'data-ab-pay-go').onclick(); await tick(20);
  post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 2); assert.deepEqual(post[1].body, { Payment_ID: 'PAY-B', Reject_Reason: 'not on the PayPal statement' });
});

test('ADMIN UI · every in-page link names the console itself (the page has <base href="/">: "#revenue" alone would leave it)', async () => {
  const { root, A } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue: { ok: true, asOf: '2026-10-07', counts: {} } });
  await tick(30);
  const hrefs = [...root.innerHTML.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2);
  for (const h of hrefs) assert.doesNotMatch(h, /^#/, 'a bare fragment link: ' + h);
  assert.ok(hrefs.includes('/admin/billing#revenue') && hrefs.includes('/admin/billing#guests'));
  el(root, 'data-ab-tab', '#revenue').onclick({ preventDefault() {} }); await tick(10);
  assert.equal(A.state().route.view, 'revenue');
  assert.match(root.innerHTML, /Booked revenue \(confirmed\)/);
  /* the revenue overview 2.3.0 (Owner, 15 Nov 2026): booked, invoiced, open, received and reported; by room category, by room, extras */
  for (const t of ['Invoiced', 'Booked, not yet invoiced', 'Open receivables', 'Of which overdue', 'Payments received (verified)', 'Payments reported, to verify',
    'Accommodation by room category', 'Accommodation by room', 'Extra services', 'Invoiced and open, by payment method', 'Payments, by method']) assert.ok(root.innerHTML.includes(t), t);
});

test('ADMIN UI · the page module calls only billing routes, sends the bearer, and never stores what it reads', () => {
  const code = src('assets/admin-billing.js');
  assert.doesNotMatch(code, /localStorage\.setItem|sessionStorage|indexedDB/);
  assert.doesNotMatch(code, /window\.(confirm|alert|prompt)\(/, 'confirmations are on the page, never browser dialogs');
  const html = src('src/admin/billing.html');
  assert.match(html, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(html, /<base href="\/">/);
  assert.match(html, /<script src="assets\/admin-billing\.js\?v=[0-9a-f]{8}"><\/script>/);
  /* the Worker serves exactly this page (src/admin-page.js, generated) — and the page is never a public static file */
  assert.ok(src('src/admin-page.js').includes(JSON.stringify(html)), 'src/admin-page.js is the current page — run node src/build-admin-page.cjs');
  assert.match(src('.assetsignore'), /^src$/m, 'src/ — and with it the page source — is never a public static file');
  const worker = src('src/worker.js');
  assert.match(worker, /url\.pathname === '\/admin\/billing'/);
  assert.match(worker, /'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow',\s*'x-frame-options': 'DENY'/);
});

test('REVIEW · a lost answer to Issue or Send is never "nothing happened": the guest is read again, a send counts as uncertain', async () => {
  let reads = 0;
  const issuedHolder = HOLDER({ issued: { Settlement_ID: 'S-T2-0001', revision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', total: 245, hostedValue: 0, lines: [], fx: {}, method: 'PAYPAL_EUR', currency: 'EUR' } });
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer,
    'admin/holder': () => { reads++; return res(200, reads > 1 ? issuedHolder : HOLDER()); },
    issue: res(502, null) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(root, 'data-ab-act', 'preview').onclick(); await tick();
  el(root, 'data-ab-act', 'issue').onclick(); await tick();
  const box = el(root, 'data-ab-issue-check'); box.checked = true; box.onchange(); await tick();
  el(root, 'data-ab-issue-go').onclick(); await tick(20);
  assert.match(root.innerHTML, /The answer to the issue was lost/);
  assert.equal(reads, 2, 'the guest was read again');
  assert.doesNotMatch(root.innerHTML, /data-ab-issue-go/, 'no second issue is offered from the same confirmation');

  const s = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': issuedHolder,
    'admin/send': (url, init) => (init.method === 'POST' ? res(503, null)
      : res(200, { ok: true, issued: true, recipientName: 'Guest 2', email: 'guest2@example.invalid', Settlement_ID: 'S-T2-0001', revision: 1, totalPayable: 245, dueDate: '2026-10-28', attempts: [] })) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(s.root, 'data-ab-act', 'send').onclick(); await tick(10);
  const b2 = el(s.root, 'data-ab-send-check'); b2.checked = true; b2.onchange(); await tick();
  el(s.root, 'data-ab-send-go').onclick(); await tick(20);
  assert.match(s.root.innerHTML, /It may have reached the guest/);
  assert.equal(s.calls.filter((c) => c.method === 'POST').length, 1);
});

/* ================================================================ CONFIRM BOOKING (Owner, 7 Oct 2026) */
const SUBMITTED = { submitted: true, state: 'UNCONFIRMED', version: 2, sentAt: '2026-10-05T09:30:00Z', confirmedVersion: null, confirmedAt: null, confirmedBy: null, role: null, source: null };
const WAITING_HOLDER = (over) => HOLDER({ confirmation: { state: 'UNCONFIRMED', version: 2 }, submission: SUBMITTED,
  preview: { ...HOLDER().preview, issuable: false, proposalHash: null, reasons: ['BOOKING_NOT_CONFIRMED: UNCONFIRMED — waiting for confirmation — Haruthai or Suthep can confirm this submitted booking (Confirm booking)'] }, ...(over || {}) });
const CONFIRMED_HOLDER = HOLDER({ confirmation: { state: 'CONFIRMED', version: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'GROOM' },
  submission: { ...SUBMITTED, state: 'CONFIRMED', confirmedVersion: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'GROOM', role: 'BILLING_ADMIN', source: 'admin-billing' } });
const CTX = (over) => ({ ok: true, Holder_ID: 'INV-T2', name: { full: 'Guest 2' }, submitted: true, state: 'UNCONFIRMED', canConfirm: true,
  confirmation: { state: 'UNCONFIRMED' }, snapshot: { submissionId: 'SYL-T2-1', version: 2, sentAt: '2026-10-05T09:30:00Z', digest: 'd'.repeat(64) },
  sent: { total: 1248, payableLines: 3, onRequest: 0, selected: 3, providerSettled: 1, complete: true, unmapped: [] },
  current: { readable: true, changed: false }, afterConfirm: { assumedVersion: 2, issuable: true, reasons: [], total: 1248, dueDate: '2026-10-28' }, ...(over || {}) });
const isPost = (init) => (init && init.method) === 'POST';

test('CONFIRM BOOKING UI · sent, not confirmed: Confirm booking is offered with the waiting wording; the dialog shows the exact submitted version; after it, Issue is available', async () => {
  let confirmed = false;
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer,
    'admin/holder': () => res(200, confirmed ? CONFIRMED_HOLDER : WAITING_HOLDER()),
    'admin/confirm': (url, init) => {
      if (!isPost(init)) return res(200, CTX());
      confirmed = true;
      return res(200, { ok: true, Holder_ID: 'INV-T2', unchanged: false, confirmation: { state: 'CONFIRMED', confirmedVersion: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'GROOM', role: 'BILLING_ADMIN', source: 'admin-billing' } });
    } }, { hash: '#holder=INV-T2' });
  await tick(30);
  let h = root.innerHTML;
  assert.deepEqual([...h.matchAll(/data-ab-act="([a-z]+)"/g)].map((m) => m[1]), ['preview', 'confirm', 'issue', 'view', 'download', 'send'],
    'Preview → Confirm booking → Issue → View → Download → Send');
  assert.equal(el(root, 'data-ab-act', 'confirm').disabled, false);
  assert.match(h, /Waiting for confirmation — Haruthai or Suthep can confirm this submitted booking\./);
  assert.doesNotMatch(h, /Guest Relations confirms the sent trip first/);
  assert.match(h, /<span class="ab-chip open">Waiting for confirmation<\/span> <span class="ab-mute">version 2 sent 5 Oct, 09:30 UTC/);
  assert.equal(el(root, 'data-ab-act', 'issue').disabled, true);

  el(root, 'data-ab-act', 'confirm').onclick(); await tick(10);
  h = root.innerHTML;
  assert.match(h, /Confirm booking · the submitted version/);
  assert.match(h, /Guest<\/span> <span><b>Guest 2<\/b>/);
  assert.match(h, /Submitted<\/span> <span>version 2 · sent 5 Oct, 09:30 UTC/);
  assert.match(h, /Submitted booking value<\/span> <span><b data-i18n-skip>USD 1,248\.00<\/b>/);
  assert.match(h, /Payable lines<\/span> <span>3 <span class="ab-mute">· 1 settled with the provider/);
  assert.match(h, /This confirms exactly the version the guest submitted — version 2, sent 5 Oct, 09:30 UTC — and nothing else\. It counts as Guest Relations' confirmation for billing\. Nothing is issued and nothing is e-mailed\./);
  assert.match(h, /After confirmation, Issue statement becomes available: the statement preview would be <b data-i18n-skip>USD 1,248\.00<\/b>, due 28 Oct 2026/);
  assert.doesNotMatch(h, /data-ab-confirm-ack/, 'nothing changed since the submission: no acknowledgement asked');
  assert.equal(el(root, 'data-ab-confirm-go').disabled, true, 'the tick comes first');
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0, 'opening the dialog only reads');
  const box = el(root, 'data-ab-confirm-check'); box.checked = true; box.onchange(); await tick();
  el(root, 'data-ab-confirm-go').onclick(); await tick(20);
  const post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 1); assert.equal(post[0].url, '/api/billing/admin/confirm');
  assert.deepEqual(post[0].body, { holderId: 'INV-T2', expected: { submissionId: 'SYL-T2-1', version: 2, digest: 'd'.repeat(64) }, acknowledgeChange: false });
  h = root.innerHTML;
  assert.match(h, /Confirmed: Guest 2's submitted booking, version 2, by Suthep, 7 Oct, 10:00 UTC\. Issue statement is available from Preview once every other check passes\. Nothing was issued or e-mailed\./);
  assert.match(h, /<span class="ab-chip on">Confirmed<\/span> <span class="ab-mute">version 2 · 7 Oct 2026 · by Suthep/);
  assert.equal(el(root, 'data-ab-act', 'confirm').disabled, true);
  assert.match(h, /Confirmed · version 2 · 7 Oct 2026 · by Suthep\./);
  assert.match(h, /Statement preview · what Issue would freeze now: the confirmed submitted booking/, 'the guest is read again, the preview open');
  assert.equal(el(root, 'data-ab-act', 'issue').disabled, false, 'ISSUE STATEMENT is available now');
  assert.equal(calls.filter((c) => c.url.startsWith('/api/billing/admin/holder')).length, 2, 'read again from the server, never patched');
});

test('CONFIRM BOOKING UI · not sent: Confirm booking stays disabled — "The guest has not submitted this trip yet." — and nothing is asked', async () => {
  const notSent = HOLDER({ confirmation: { state: 'NONE' }, submission: { submitted: false, state: 'NONE', version: null, sentAt: null },
    preview: { ...HOLDER().preview, issuable: false, proposalHash: null, reasons: ['BOOKING_NOT_CONFIRMED: NONE — the guest has not submitted this trip yet'] },
    booked: { source: 'CURRENT_SELECTION', total: 1248, selected: 2, lines: 2, onRequest: 0, unmapped: [], items: [], blockB: [], sent: null } });
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': notSent }, { hash: '#holder=INV-T2' });
  await tick(30);
  assert.equal(el(root, 'data-ab-act', 'confirm').disabled, true);
  const slot = root.innerHTML.split('data-ab-act="confirm"')[1].split('</div>')[0];
  assert.match(slot, /The guest has not submitted this trip yet\./);
  assert.match(root.innerHTML, /<span class="ab-chip ">Not sent<\/span>/);
  assert.match(root.innerHTML, /Booked value<\/span> <span><b data-i18n-skip>USD 1,248\.00<\/b>/, 'the booked value is still shown');
  el(root, 'data-ab-act', 'preview').onclick(); await tick();
  assert.match(root.innerHTML, /<li>The guest has not submitted this trip yet\. <span class="ab-mute" data-i18n-skip>BOOKING_NOT_CONFIRMED: NONE<\/span><\/li>/);
  assert.equal(calls.filter((c) => c.url.indexOf('admin/confirm') >= 0).length, 0);
});

test('CONFIRM BOOKING UI · CURRENT SELECTION HAS CHANGED SINCE SUBMISSION: sent value vs current booked value, and its own acknowledgement before anything is confirmed', async () => {
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': WAITING_HOLDER(),
    'admin/confirm': (url, init) => (isPost(init) ? res(200, { ok: true, confirmation: { state: 'CONFIRMED', confirmedVersion: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'BRIDE', role: 'BILLING_ADMIN' } })
      : res(200, CTX({ current: { readable: true, changed: true, total: 1310, onRequest: 1, updatedAt: '2026-10-06T08:00:00Z' } }))) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(root, 'data-ab-act', 'confirm').onclick(); await tick(10);
  const h = root.innerHTML;
  assert.match(h, /<div class="ab-warn" role="note"><p class="t-l1">Current selection has changed since submission<\/p>/);
  assert.match(h, /Submitted · version 2<\/span> <span><b data-i18n-skip>USD 1,248\.00<\/b>/);
  assert.match(h, /Current selection · Booked value<\/span> <span><b data-i18n-skip>USD 1,310\.00<\/b> <span class="ab-mute">\+ 1 on request/);
  assert.match(h, /You confirm the submitted version 2 only\. The newer selection is not confirmed and is never billed until the guest sends it and it is confirmed\./);
  const check = el(root, 'data-ab-confirm-check'); check.checked = true; check.onchange(); await tick();
  assert.equal(el(root, 'data-ab-confirm-go').disabled, true, 'the difference must be acknowledged too');
  const ack = el(root, 'data-ab-confirm-ack'); ack.checked = true; ack.onchange(); await tick();
  assert.match(root.innerHTML, /I confirm the submitted version 2, not the current selection\./);
  assert.equal(el(root, 'data-ab-confirm-go').disabled, false);
  el(root, 'data-ab-confirm-go').onclick(); await tick(20);
  const post = calls.filter((c) => c.method === 'POST');
  assert.equal(post.length, 1); assert.equal(post[0].body.acknowledgeChange, true);
  assert.deepEqual(post[0].body.expected, { submissionId: 'SYL-T2-1', version: 2, digest: 'd'.repeat(64) }, 'the submitted version — never the newer selection');
  assert.match(root.innerHTML, /by Haruthai/);
});

test('CONFIRM BOOKING UI · a lost answer re-reads the guest and offers nothing blind; another version sent meanwhile re-reads the dialog', async () => {
  let reads = 0;
  const lost = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer,
    'admin/holder': () => { reads++; return res(200, WAITING_HOLDER()); },
    'admin/confirm': (url, init) => (isPost(init) ? res(502, null) : res(200, CTX())) }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(lost.root, 'data-ab-act', 'confirm').onclick(); await tick(10);
  const b = el(lost.root, 'data-ab-confirm-check'); b.checked = true; b.onchange(); await tick();
  el(lost.root, 'data-ab-confirm-go').onclick(); await tick(20);
  assert.match(lost.root.innerHTML, /The answer to the confirmation was lost\. The guest is read again/);
  assert.equal(reads, 2); assert.doesNotMatch(lost.root.innerHTML, /data-ab-confirm-go/, 'no second confirmation from the same dialog');

  let gets = 0;
  const moved = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': WAITING_HOLDER(),
    'admin/confirm': (url, init) => {
      if (isPost(init)) return res(409, { ok: false, error: 'The guest has sent another version since this dialog was opened; nothing was confirmed.', reasons: ['SENT_CHANGED'] });
      gets++; return res(200, gets > 1 ? CTX({ snapshot: { submissionId: 'SYL-T2-1', version: 3, sentAt: '2026-10-07T09:00:00Z', digest: 'e'.repeat(64) } }) : CTX());
    } }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(moved.root, 'data-ab-act', 'confirm').onclick(); await tick(10);
  const c = el(moved.root, 'data-ab-confirm-check'); c.checked = true; c.onchange(); await tick();
  el(moved.root, 'data-ab-confirm-go').onclick(); await tick(20);
  assert.equal(gets, 2, 'the dialog is read again');
  assert.match(moved.root.innerHTML, /The guest sent another version meanwhile\. Nothing was confirmed/);
  assert.match(moved.root.innerHTML, /version 3 · sent 7 Oct, 09:00 UTC/);
  assert.equal(el(moved.root, 'data-ab-confirm-go').disabled, true, 'the new version needs its own tick');
});

test('CONFIRM BOOKING UI · the list says who waits for confirmation, and "To confirm" finds them', async () => {
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer });
  await tick(30);
  const h = root.innerHTML;
  assert.match(h.split('data-ab-open="INV-T4"')[1].split('</tr>')[0], /<span class="ab-chip open">Waiting for confirmation<\/span>/);
  assert.match(h, /To confirm <span class="ab-n">1<\/span>/);
  el(root, 'data-ab-filter', 'toConfirm').onclick(); await tick();
  assert.match(root.innerHTML, /INV-T4/); assert.doesNotMatch(root.innerHTML, /data-ab-open="INV-T2"/);
});

test('CONFIRM BOOKING UI · the guest edits the trip while the dialog is open: the dialog is read again and the difference can be acknowledged', async () => {
  let gets = 0, posts = [];
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': WAITING_HOLDER(),
    'admin/confirm': (url, init) => {
      if (isPost(init)) { posts.push(JSON.parse(init.body)); return posts.length === 1 ? res(409, { ok: false, error: 'The current selection has changed since submission', reasons: ['ACKNOWLEDGE_CHANGE'], changed: true })
        : res(200, { ok: true, confirmation: { state: 'CONFIRMED', confirmedVersion: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'GROOM', role: 'BILLING_ADMIN' } }); }
      gets++; return res(200, gets > 1 ? CTX({ current: { readable: true, changed: true, total: 1310, onRequest: 0 } }) : CTX());
    } }, { hash: '#holder=INV-T2' });
  await tick(30);
  el(root, 'data-ab-act', 'confirm').onclick(); await tick(10);
  const c = el(root, 'data-ab-confirm-check'); c.checked = true; c.onchange(); await tick();
  el(root, 'data-ab-confirm-go').onclick(); await tick(20);
  assert.equal(gets, 2, 'read again, never stuck on an acknowledgement it cannot give');
  assert.match(root.innerHTML, /current selection changed while this dialog was open\. Nothing was confirmed/);
  assert.match(root.innerHTML, /Current selection has changed since submission/);
  const c2 = el(root, 'data-ab-confirm-check'); c2.checked = true; c2.onchange(); await tick();
  const a2 = el(root, 'data-ab-confirm-ack'); a2.checked = true; a2.onchange(); await tick();
  el(root, 'data-ab-confirm-go').onclick(); await tick(20);
  assert.deepEqual(posts.map((p) => p.acknowledgeChange), [false, true]);
  assert.match(root.innerHTML, /by Suthep/);
});

test('CONFIRM BOOKING UI · "by Haruthai / Suthep" only for a BILLING_ADMIN\'s confirmation — a Guest Relations actor is never read as a name', () => {
  const { A } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/holder': HOLDER({
    submission: { ...SUBMITTED, state: 'CONFIRMED', confirmedVersion: 2, confirmedAt: '2026-10-07T10:00:00Z', confirmedBy: 'GROOM', role: 'GUEST_RELATIONS', source: 'gr-endpoint' } }) }, { hash: '#holder=INV-T2' });
  return tick(30).then(() => {
    const h = A.page();
    assert.match(h, /version 2 · 7 Oct 2026 · by Guest Relations/); assert.doesNotMatch(h, /by Suthep/);
  });
});

/* REVENUE AND BUDGET (billing-budget/1.0.0 · Owners, 15 Nov 2026): the comparison as the server builds it (src/billing/budget.js on
   invented grids), arranged on the Revenue tab — Accommodation and Transportation side by side, each stay / route opened to its
   rooms, guests and budget lines, the inventory in place of the quota table. Read only: the tab asks for nothing but the revenue. */
const { buildBudgetComparison } = await import('../src/billing/budget.js');
const BS = await import('../src/billing/budget-source.js');
function budgetFixture() {
  const items = {
    'D1-X': { Item_ID: 'D1-X', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Basis: 'PER_PERSON_PER_NIGHT', Standard_Rate: 145, Quota: 2, Quota_Unit: 'ROOM', Site_Product_Key: 'wedstay/heritage', 'Number of Nights': 1 },
    'B-T': { Item_ID: 'B-T', Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', Rate_Basis: 'PER_PERSON', Standard_Rate: 100, Quota: 12, Quota_Unit: 'PERSON', Site_Product_Key: 'train' },
  };
  const display = BS.parseItemDisplay([['Name', 'The Heritage', 'Night train'], ['Check In Date', '27.02.2031', '24.02.2031'], ['Check Out Date', '28.02.2031', '25.02.2031'],
    ['Number of Nights', 1, 1], ['Rooms available', 2, ''], ['Room', 'The Heritage', 'Train'], ['Package', 'D1', 'B'], ['Category', 'Accommodation', 'Transportation'], ['Item_ID', 'D1-X', 'B-T']]);
  const H = ['Item', 'Vendor', 'Category', 'Details', 'Rate USD', 'Qty', 'Nights, Rooms, EA', 'Budget USD', 'Actual USD', 'Amount paid USD', 'Status', 'Date or period', 'Currency', 'Suthep approval'];
  const budget = BS.parseBudget004([H,
    ['Souphattra Heritage Vientiane', 'S', 'Accommodation', 'All Categories Rooms', 150, 2, 1, 300, 300, '', '', '27-28.02.2031', 'USD', 'Approve by S.'],
    ['Train Bangkok - Nong Khai', 'R', 'Transportation', 'Guests', 80, 1, 1, 80, 80, '', '', '24.02.2031', 'USD', 'Approve by S.'],
    ['Train Bangkok - Nong Khai, Alex', 'R', 'Transportation', 'Seat', 80, 1, 1, 80, 80, '', '', '24.02.2031', 'USD', 'Approve by S.']], []);
  const vendors = BS.parseVendors007([['Vendor', 'Souphattra Heritage Vientiane', 'U Sathorn Bangkok'], ['Total Price USD', 300, ''], ['Total Price THB', '', 9000]],
    [['Vendor', 'Souphattra Heritage Vientiane', 'U Sathorn Bangkok'], ['Total Price USD', 300, ''], ['Total Price THB', '', 9000]]);
  const line = (p, item, unit, cents, extra) => ({ Booking_ID: 'BK·INV-T1·' + p + '·' + item, Holder_ID: 'INV-T1', Bill_To_Holder_ID: 'INV-T1', Person_ID: p, Item_ID: item,
    Room_Unit_ID: unit ? 'RU·' + item + '·' + unit : null, block: 'A', amountCents: cents, rateCents: cents, rateSource: 'STANDARD_RATE', quantity: 1, ...(extra || {}) });
  const booked = { holders: [{ Holder_ID: 'INV-T1', Settlement_ID: 'S-T1-0001', gapReason: null, lines: [
    line('GT1', 'D1-X', 'A', 14500, { Rate_Basis: 'PER_PERSON_PER_NIGHT', nights: 1, payableNights: 1 }), line('GT1', 'B-T', null, 10000, { Rate_Basis: 'PER_PERSON' })] }], extraBedIds: [] };
  return buildBudgetComparison({ asOf: '2026-11-17', booked, items, display, budget, vendors, rates009: { ok: true, rows: [] },
    names: { persons: { GT1: 'Guest 1' }, holders: { 'INV-T1': 'Guest 1' } }, rooms: null, quota: [{ Item_ID: 'D1-X', used: 1, remaining: 1 }],
    bookedRevenue: { cents: 24500, complete: true }, receipts: null, unresolved: [], readProblems: [] });
}

test('REVENUE AND BUDGET UI · Accommodation and Transportation side by side, traced to rooms, guests and budget lines; inventory in place of the quota table; read only', async () => {
  const budget = budgetFixture();
  assert.equal(budget.available, true);
  const revenue = { ok: true, asOf: '2026-11-17', counts: {}, bookedRevenue: { cents: 24500, amount: 245, complete: true }, quotaUtilisation: [{ Item_ID: 'D1-X', Quota_Unit: 'ROOM', Quota: 2, used: 1, remaining: 1 }], budget };
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#revenue' });
  await tick(30);
  const h = root.innerHTML;
  assert.match(h, /Revenue and budget — 004_Budget_Finance/);
  const main = h.slice(h.indexOf('data-ab-budget-main'));
  assert.ok(main.indexOf('data-ab-bcat="Accommodation"') >= 0 && main.indexOf('data-ab-bcat="Transportation"') > main.indexOf('data-ab-bcat="Accommodation"'), 'side by side, Accommodation first');
  assert.match(h, /Cost still to be covered by the hosts/); assert.match(h, /Cost still to be covered by the hosts USD 155\.00/, 'the stay: USD 145 against the block of USD 300 — the label carries the sign');
  assert.match(h, /No difference yet/, 'the route lacks its van');
  assert.match(h, /data-ab-bd="D1"/); assert.match(h, /data-ab-bd="B"/);
  assert.match(h, /Room A · The Heritage/); assert.match(h, /Guest 1/); assert.match(h, /budget row 2 · USD 150\.00 per room-night \(block rate\)/);
  assert.match(h, /a named person&#39;s own place or ticket|a named person's own place or ticket/);
  assert.match(h, /no approved supplier cost for the guests&#39; van in 004|no approved supplier cost for the guests' van in 004/);
  assert.match(h, /THB 9,000\.00/); assert.doesNotMatch(h, /USD 9,300|9,300\.00/, 'currencies stand apart, never added');
  assert.match(h, /data-ab-inventory/); assert.match(h, /Quota utilisation/, 'the existing quota panel stays as it was');
  /* every cell of the comparison carries its label for the phone layout */
  const sec = h.slice(h.indexOf('data-ab-budget'), h.indexOf('data-ab-rev-rooms'));
  assert.ok((sec.match(/<td(?![^>]*data-l=)/g) || []).length === 0, 'a table cell without data-l');
  assert.ok(calls.every((c) => c.method === 'GET'), 'the Revenue tab only reads');
  assert.ok(calls.some((c) => /\/api\/billing\/revenue/.test(c.url)));
});

test('REVENUE AND BUDGET UI · a comparison that could not be built is said in its place; the quota table stays', async () => {
  const revenue = { ok: true, asOf: '2026-11-17', counts: {}, quotaUtilisation: [{ Item_ID: 'D1-X', Quota_Unit: 'ROOM', Quota: 2, used: 1, remaining: 1 }],
    budget: { available: false, gap: 'The budget tabs (004, 007, 002, 009, 006) could not be read from Google just now — every revenue figure above stands as it is' } };
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#revenue' });
  await tick(30);
  assert.match(root.innerHTML, /could not be read from Google just now — every revenue figure above stands as it is/);
  assert.match(root.innerHTML, /Quota utilisation/); assert.doesNotMatch(root.innerHTML, /data-ab-budget-main/);
});
