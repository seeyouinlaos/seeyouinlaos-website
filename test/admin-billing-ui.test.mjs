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
  /* Owners' review, 18 Nov 2026: the line-by-line comparison is part of Finance (its "Budget detail"); Revenue is guest revenue only */
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
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
  /* 1.1.0: committed, paid and outstanding stand apart; what is owed is the 007 total less the payments counted */
  assert.match(h, /Committed \(007 totals, as typed\)/); assert.match(h, /Paid to suppliers \(007, counted\)/);
  assert.match(h, /Outstanding to suppliers \(007 total less counted payments\)/); assert.match(h, /data-l="Outstanding"/);
  const supTable = h.slice(h.indexOf('Supplier (007)'));
  assert.match(supTable, /data-l="Outstanding"[^>]*>(<[^>]+>)*USD 300\.00/, 'nothing paid yet: the whole typed total is owed');
  assert.match(h, /data-ab-inventory/);
  /* every cell of the report — the comparison included — carries its label for the phone layout */
  const sec = h.slice(h.indexOf('data-ab-exec'), h.indexOf('data-ab-bd="fin-progress"'));
  assert.ok(sec.length > 1000 && (sec.match(/<td(?![^>]*data-l=)/g) || []).length === 0, 'a table cell without data-l');
  assert.ok(calls.every((c) => c.method === 'GET'), 'Finance only reads');
  assert.ok(calls.some((c) => /\/api\/billing\/revenue/.test(c.url)));
  /* the Revenue tab keeps the quota panel and no longer repeats the budget */
  const rv = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#revenue' });
  await tick(30);
  assert.match(rv.root.innerHTML, /Quota utilisation/, 'the existing quota panel stays as it was');
  assert.doesNotMatch(rv.root.innerHTML, /data-ab-budget-main|Revenue and budget — 004_Budget_Finance/, 'one figure, one place');
});

test('REVENUE AND BUDGET UI · a comparison that could not be built is said in its place; the quota table stays', async () => {
  const revenue = { ok: true, asOf: '2026-11-17', counts: {}, quotaUtilisation: [{ Item_ID: 'D1-X', Quota_Unit: 'ROOM', Quota: 2, used: 1, remaining: 1 }],
    budget: { available: false, gap: 'The budget tabs (004, 007, 002, 009, 006) could not be read from Google just now — every revenue figure above stands as it is' } };
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
  await tick(30);
  assert.match(root.innerHTML, /could not be read from Google just now — every revenue figure above stands as it is/);
  assert.doesNotMatch(root.innerHTML, /data-ab-budget-main/);
  const rv = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#revenue' });
  await tick(30);
  assert.match(rv.root.innerHTML, /Quota utilisation/);
});

test('REVENUE AND BUDGET UI 1.1 · outstanding, possible duplicates, nights without a line and a summary cell\'s range are said as the server says them — the nights listed apart from the difference', async () => {
  const budget = budgetFixture();
  const s = budget.suppliers.find((x) => /^Souphattra/.test(x.vendor));
  const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100 });
  Object.assign(s, { outstanding: null, paidAbove: null, contractVsPlan: usd(360000), possibleDuplicates: { rows: [], amount: null, partlyRows: [24] },
    outstandingWhy: 'payments B16, B25 recorded in 007 but not counted (dated 03.09.2031, after today — not counted as paid)',
    stays: [{ stage: 'D1', uncovered: [{ night: '2031-02-27', items: ['The Heritage'], others: [{ row: 23, why: 'names A & B — their own place or ticket (A-2)' }] }] }], notPlaced: [] });
  Object.assign(budget.categories.find((c) => c.category === 'Accommodation'), { possibleDuplicates: { rows: [], amount: null, partlyRows: [24] }, outstanding: [], paidAbove: [], outstandingNotStated: [s.vendor] });
  budget.reconciliation.budget004.checks = [
    { what: 'the positive lines', cell: 'A5', sheet: usd(3138854), lines: usd(3208454), equal: false, formula: '=SUMIF(K8:K87, ">0")', range: { from: 8, to: 87 }, outside: [{ row: 88, amount: usd(69600) }], carries: null },
    { what: 'the positive lines less the planned guest contributions', cell: 'J5', sheet: usd(2730854), lines: usd(2800454), equal: false, formula: '=A5-G5', range: null, outside: [], carries: ['A5'] }];
  const revenue = { ok: true, asOf: '2026-11-17', counts: {}, bookedRevenue: { cents: 24500, amount: 245, complete: true }, quotaUtilisation: [{ Item_ID: 'D1-X', Quota_Unit: 'ROOM', Quota: 2, used: 1, remaining: 1 }], budget };
  const { root, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
  await tick(30);
  const h = root.innerHTML;
  assert.match(h, /not stated: payments B16, B25 recorded in 007 but not counted \(dated 03\.09\.2031, after today — not counted as paid\)/);
  assert.match(h, /not stated for Souphattra Heritage Vientiane \(see the supplier table\)/);
  assert.match(h, /possibly counted twice in 004 \(assumption A-5\): row 24 partly or unclear, no amount/);
  assert.match(h, /Beside the 007 totals — listed apart, not a breakdown of any difference/);
  assert.match(h, /nights of its stays with no approved 004 line for the guests(&#39;|')s? rooms — D1: 27\.02\.2031 \(row 23 — names A &amp; B — their own place or ticket \(A-2\)\)/);
  const cell = (h.match(/data-l="Contract vs 004"[^]*?<\/td>/) || [''])[0];
  assert.match(cell, /USD 3,600\.00/); assert.match(cell, /007 does not say what its total covers/); assert.doesNotMatch(cell, /row 23|27\.02/, 'the nights are not set under the difference');
  assert.match(h, /its formula sums rows 8–87; row 88 \(USD 696\.00\) outside it\./);
  assert.match(h, /J5 is =A5-G5 and carries A5(&#39;|')s difference\./);
  assert.ok(calls.every((c) => c.method === 'GET'), 'still read only');
});

/* ---- THE OWNERS' REVIEW (18 Nov 2026): Guests with their rooms and a CSV, Rooms & rates by hotel and period, Finance as a report
   A–E, Revenue as guest revenue only — every figure the server's, read only ---- */
const { financeReportOf } = await import('../src/billing/finance-report.js');
function reviewRevenue() {
  const usd = (cents) => ({ currency: 'USD', cents, amount: cents / 100, display: 'USD ' + (cents / 100).toFixed(2) });
  const plan = [{ stay: 'W1', place: 'Hotel Alpha · wedding stay', from: '2031-02-27', to: '2031-03-01', rooms: [
    { key: 'wed/exec', label: 'F', type: 'Grand Exec', item: 'W1-EXEC', places: 2, extraBeds: 1, occupants: [{ guestId: 'GT1', name: 'Guest 1', bed: false }, { guestId: 'GT2', name: 'Guest 2', bed: false }, { guestId: 'GT3', name: 'Guest 3', bed: true }] },
    { key: 'wed/exec', label: 'G', type: 'Grand Exec', item: 'W1-EXEC', places: 2, extraBeds: 0, occupants: [] }] }];
  const centres = [{ id: 'W1', place: 'Hotel Alpha · wedding stay', status: 'COMPLETE', missing: [], rooms: [{ label: 'F', item: 'W1-EXEC', lines: [
    { person: 'GT1', amount: usd(29000), statement: 'S-T1-0001', rateSource: '002' }, { person: 'GT2', amount: usd(0), complimentaryNights: 2, rateSource: '009' }, { person: 'GT3', amount: usd(7500), rateSource: '009' }] }] }];
  const contracts = [{ stay: 'W1', items: '*', ratePerRoomNight: 150 }];
  const dashboard = { costs: { original: usd(500000), forecast: usd(560000), adjustments: [{ vendor: 'Hotel Beta', category: 'Accommodation', stages: ['W1'], difference: usd(60000) }] }, position: { stated: true, projectedOwnerFunded: usd(523500), coverageProjected: 6.5 } };
  /* the guests' billing by class as the server splits it (revenue-classes) — synthetic */
  const four = (b, i, r, o) => ({ booked: usd(b), invoiced: usd(i), received: usd(r), outstanding: usd(o) });
  const classes = { version: 'revenue-classes/1.0.0', complete: true, classes: { SOUPHATTRA_ACCOMMODATION: { label: 'x', ...four(36500, 39000, 0, 39000), guests: 3, rooms: 1, roomNights: 2 },
      OTHER_ACCOMMODATION: four(0, 0, 0, 0), PASS_THROUGH: four(0, 0, 0, 0), NOT_CLASSIFIED: four(0, 0, 0, 0) }, china: four(0, 0, 0, 0), totalGuestBilling: four(36500, 39000, 0, 39000),
    souphattra: { guestsAcrossPeriods: 3, byPeriod: [{ window: 'wed', stage: 'W1', label: 'Wedding stay', ...four(36500, 39000, 0, 39000), guests: 3, rooms: 1, roomNights: 2 }],
      byCategory: [{ Item_ID: 'W1-EXEC', ...four(36500, 39000, 0, 39000), guests: 3, rooms: 1 }],
      byBooking: [{ Booking_ID: 'BK-T1', Holder_ID: 'INV-T1', Item_ID: 'W1-EXEC', Person_ID: 'GT1', period: 'Wedding stay', nights: 2, booked: usd(29000), invoiced: usd(29000), status: 'UNPAID' }] },
    otherAccommodation: [], passThrough: [{ Item_ID: 'T-OFFER', china: false, basis: 'collected and passed on', confirmed: null, ...four(0, 0, 0, 0), guests: 0 }], notClassified: [], unallocated: { statements: [] }, excluded: [], reconciliation: {} };
  const report = financeReportOf({ budget: { totals: { totalBudget: 4000, totalBudgetCell: 'A2', budgetLeft: -1000, budgetLeftCell: 'F2' }, lines: [
      { row: 8, item: 'Hotel Alpha', vendor: 'Hotel Alpha', category: 'Accommodation', details: 'All Categories Rooms', rate: 150, qty: 2, mult: 2, budget: 600, paid: null, readable: true, periodText: '27.02-01.03.2031', period: { from: '2031-02-27', to: '2031-03-01' } },
      { row: 9, item: 'Rooms', vendor: 'Hotel Beta', category: 'Accommodation', budget: 4400, paid: null, readable: true }] },
    suppliers: [{ vendor: 'Sky Bakery', stages: [], contract: { currency: 'THB', cents: 3000000, amount: 30000 }, payments: [] }], centres, plan, contracts, dashboard,
    roomContractMeta: { ratePerRoomNight: 150, rooms: { W1: '*' }, agreement: { rooms: { W1: 2 }, total: 600 }, additional: { ratePerRoomNight: 150 }, supplement: { perRoomNight: 60, confirmed: true } },
    rule: { category: 'Accommodation', item: /^hotel alpha\b/i }, vendor: /^hotel alpha\b/i, revenue: { booked: { cents: 36500, complete: true }, classes }, receipts: { cashCollected: { cents: 0, complete: true } },
    list012: [{ row: 2, building: 'C', roomType: 'Grand Exec (Twin)', roomNo: '203', checkIn: '27.02.2031', checkOut: '01.03.2031', guests: ['Guest', 'Guest', 'Guest'] }] });
  for (const u of plan[0].rooms) {
    const l = report.purchase.lines.find((x) => x.label === u.label);
    Object.assign(u, { room012: report.rooms012.units['W1|' + u.key + '|' + u.label] || null,
      /* the hotel's own room (src/hotel-rooms.js, Owners 18 / 19 Nov 2026) as the server sets it — synthetic */
      hotelRoom: u.label === 'F' ? { hotel: 'Hotel Alpha', numbers: ['203'], display: '203', building: 'C', type: 'Grand Exec (Twin)', suite: false } : null, hotelCost: usd(30000), hotelCostBasis: 'CONTRACT', hotelNights: { contract: 2, additional: 0 }, hotelStatus: l.status,
      hotelSupplement: l.cost.supplement ? usd(l.cost.supplement) : null, hotelIn004: { contract: l.rows.contract, additional: l.rows.additional, supplement: l.rows.supplement } });
  }
  return { ok: true, asOf: '2026-11-18', calculatedAt: '2026-11-18T08:00:00.000Z', counts: {}, classes, bookedRevenue: usd(36500), issuedRevenue: usd(39000), notYetInvoiced: usd(7500), changedSinceIssue: usd(-10000),
    invoicedNotBooked: usd(0), outstanding: usd(39000), cashCollected: usd(0), overdue: usd(0), paymentsReported: usd(0),
    holders: [{ Holder_ID: 'INV-T1', Settlement_ID: 'S-T1-0001', revision: 1, issueDate: '2026-10-07', dueDate: '2026-10-28', issued: usd(39000), cashCollected: usd(0), outstanding: usd(39000), overdue: usd(0), paymentStatus: 'UNPAID', changedSinceIssue: usd(-10000), invoicedNotBooked: usd(0) }],
    budget: { available: true, version: 'billing-budget/1.2.0', asOf: '2026-11-18', dashboard, report, roomPlan: plan, roomContracts: contracts, centres, categories: [], suppliers: [], checks: [], questions: [], reconciliation: {} } };
}

test('REVIEW · Guests: each guest\'s stay, room, hotel room number and building, extra bed and complimentary nights; CSV of all or the filter — BOM, chosen delimiter, no formula, no code', async () => {
  const revenue = reviewRevenue();
  const { root, A, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/readiness': { ok: true, rows: [] }, revenue });
  await tick(60);
  const h = root.innerHTML;
  assert.match(h, /<th>Stays &amp; rooms<\/th>/);
  const row = (id) => h.split('data-ab-open="' + id + '"')[1].split('</tr>')[0];
  assert.match(row('INV-T1'), /Grand Exec · Room F<\/span> · hotel room <b data-i18n-skip>203<\/b> <span class="ab-mute" data-i18n-skip>· building C<\/span>/); assert.match(row('INV-T1'), /invoiced/);
  assert.doesNotMatch(h, /012 ref\./, 'the hotel room number is the official list\'s, no longer a 012 reference');
  assert.match(row('INV-T2'), /2 nights complimentary/); assert.match(row('INV-T3'), /extra bed/);
  assert.match(row('INV-T5'), /no room/);
  assert.match(row('INV-T1'), /GT1 · INV-T1/, 'the Guest ID beside the invitation'); assert.match(row('INV-T1'), /S-T1-0001/, 'the statement number');
  assert.match(h, /data-ab-csv="guests-all"/); assert.match(h, /data-ab-csv="guests-shown"/);
  assert.ok(calls.every((c) => c.method === 'GET'), 'the list only reads');
  const csv = A.csv.guests('all');
  assert.equal(csv.charCodeAt(0), 0xFEFF); assert.match(csv, /\r\n/);
  const sep = csv.indexOf('Guest ID;') >= 0 ? ';' : ',';
  assert.ok(csv.indexOf(['Guest ID', 'Guest', 'Invitation'].join(sep)) > 0);
  assert.ok(csv.split('\r\n').some((l) => l.startsWith(['GT1', 'Guest 1', 'INV-T1', 'Hotel Alpha · wedding stay', '2031-02-27', '2031-03-01', '2', 'F', '203', 'C', 'Grand Exec'].join(sep))));
  assert.ok(csv.indexOf(['Room', 'Hotel room no.', 'Building', 'Room category'].join(sep)) > 0);
  assert.doesNotMatch(csv, /bearer|token|invite=/i);
  assert.equal(A.csv.cell('=SUM(A1)', ','), '\'=SUM(A1)'); assert.equal(A.csv.cell(-5, ','), '-5'); assert.equal(A.csv.cell(1234.5, ';'), '1234,5');
  assert.equal(A.csv.cell('a;b', ';'), '"a;b"'); assert.equal(A.csv.cell('say "x"', ','), '"say ""x"""');
});

test('REVIEW · Rooms & rates: by hotel and period, hotel room no. and building (the official list), occupancy, nights, purchase and sale per room, subtotals, rooming list', async () => {
  const revenue = reviewRevenue();
  const { root, A } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#rooms' });
  await tick(40);
  const h = root.innerHTML;
  assert.match(h, /data-ab-rooms="W1"/); assert.match(h, /Room F<span class="ab-id">hotel room <b data-i18n-skip>203<\/b> <span class="ab-mute" data-i18n-skip>· building C<\/span>/);
  assert.match(h, /data-l="Occupancy" class="num">3 \/ 2/); assert.match(h, /data-l="Nights" class="num">2</);
  assert.match(h, /data-l="Hotel cost \(purchase\)" class="num"><span data-i18n-skip>USD 420\.00<span class="ab-why">agreement · 2 nights × USD 150\.00 · \+ USD 120\.00 additional-person charge<\/span><span class="ab-why">agreement: 004 row 8 · additional-person charge: not in 004 — proposed<\/span>/);
  assert.match(h, /data-l="Guest revenue \(sale\)" class="num"><span data-i18n-skip>USD 365\.00/);
  assert.doesNotMatch(h, /012 ref\./, 'no 012 reference beside the room any more');
  assert.match(h, /class="ab-total"/); assert.match(h, /Rooms without guests — Grand Exec: G/);
  assert.match(h, /data-ab-csv="rooming"/);
  const csv = A.csv.rooming(); const sep = csv.indexOf('Stay;') >= 0 ? ';' : ',';
  const lines = csv.split('\r\n');
  assert.ok(lines.some((l) => l.startsWith(['Stay', 'Hotel', 'Room', 'Room category', 'Hotel room no.', 'Building', 'Guest ID', 'Guest', 'Invitation', 'Booking ID', 'Booking status'].join(sep))));
  const g1 = lines.find((l) => l.startsWith(['W1', 'Hotel Alpha · wedding stay', 'F', 'Grand Exec', '203', 'C', 'GT1', 'Guest 1'].join(sep)));
  assert.ok(g1, 'the first guest row of room F'); assert.ok(g1.includes(['2', '0', '150', '300', '120', 'agreement: 004 row 8 · additional-person charge: not in 004 — proposed'].join(sep)), 'the room\'s purchase on its first guest row');
  const g2 = lines.find((l) => l.startsWith(['W1', 'Hotel Alpha · wedding stay', 'F', 'Grand Exec', '203', 'C', 'GT2'].join(sep)));
  assert.ok(g2.includes(['', '', '', '', '', ''].join(sep)), 'never twice: the second guest row leaves the room\'s purchase empty');
  assert.match(g2, /complimentary/); assert.doesNotMatch(csv, /bearer|token|invite=/i);
  assert.ok((h.match(/<td(?![^>]*data-l=)/g) || []).length === 0, 'every cell named for the phone');
});

test('FINANCE B · each hotel on its own (HS-012.2): a row (a card on a phone) per hotel with its guest revenue, the Accommodation sub-total under them, the category alone where the split is not there; the CSV names each row\'s kind', async () => {
  const revenue = reviewRevenue();
  const H = revenue.budget.report.byHotel;
  assert.ok(H && H.reconciliation.rawAgree, 'the report splits Accommodation by hotel');
  const { root, A } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
  await tick(40);
  const h = root.innerHTML;
  const b = h.split('data-ab-budget-vs')[1].split('</table>')[0];
  assert.match(b, /<th class="num">Guest revenue<\/th>/);
  assert.match(b, /data-ab-hotel="SOUPHATTRA"><td data-l="Category"><b data-i18n-skip>Souphattra Heritage · Vientiane<\/b>/);
  assert.match(b, /data-ab-hotel="SOUPHATTRA">.*data-l="Guest revenue" class="num"><span data-i18n-skip>booked USD 365\.00<br>invoiced USD 390\.00<br>received USD 0\.00<br>outstanding USD 390\.00/);
  assert.match(b, /data-ab-hotel="NO-HOTEL"><td data-l="Category"><b data-i18n-skip>Accommodation — no hotel stated<\/b><span class="ab-id">Accommodation · 004 rows 8–9 · location not recorded/);
  assert.match(b, /class="ab-subtotal"><td data-l="Category"><b>Accommodation · all hotels<\/b>/);
  assert.ok(b.indexOf('data-ab-hotel="SOUPHATTRA"') < b.indexOf('ab-subtotal'), 'the hotels first, their sub-total under them');
  assert.doesNotMatch(b, /<td data-l="Category">Accommodation<span/, 'no combined Accommodation row on its own');
  assert.match(h, /The hotel rows add up to "Accommodation · all hotels"/);
  assert.ok((b.match(/<td(?![^>]*data-l=)/g) || []).length === 0, 'every cell named for the phone');
  const csv = A.csv.finance('budget-vs-actual');
  assert.match(csv, /Row,004 category · hotel,Gross USD \(004\)/);
  assert.match(csv, /CATEGORY,Accommodation,/); assert.match(csv, /HOTEL \(part of the category above\),Souphattra Heritage · Vientiane,/);
  assert.match(csv, /TOTAL,The wedding \(total\)/); assert.match(csv, /Guest revenue booked USD/);
  assert.match(b, /data-ab-hotel="SOUPHATTRA">.*3 guests · 1 room · 2 room nights/, 'guests, rooms and room nights per hotel, as the Revenue tab counts them');
  { const r3 = reviewRevenue(); r3.budget.report.byHotel = { ...H, revenueAvailable: false };
    const L3 = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue: r3 }, { hash: '#finance' }); await tick(40);
    assert.match(L3.root.innerHTML, /data-ab-hotel="SOUPHATTRA">.*guest revenue not available just now/); assert.doesNotMatch(L3.root.innerHTML.split('data-ab-budget-vs')[1].split('</table>')[0], /no booked guest stay/); }
  /* the split not there, or not adding up: the category row stands, as before */
  for (const bad of [null, { ...H, reconciliation: { ...H.reconciliation, rawAgree: false } }]) {
    const r2 = reviewRevenue(); r2.budget.report.byHotel = bad;
    const L = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue: r2 }, { hash: '#finance' });
    await tick(40);
    const b2 = L.root.innerHTML.split('data-ab-budget-vs')[1].split('</table>')[0];
    assert.match(b2, /<td data-l="Category">Accommodation/); assert.doesNotMatch(b2, /data-ab-hotel=/);
    assert.match(L.A.csv.finance('budget-vs-actual'), /CATEGORY,Accommodation,/); assert.doesNotMatch(L.A.csv.finance('budget-vs-actual'), /HOTEL \(part/);
  }
});

test('REVIEW · Finance: A executive summary, B budget vs actual, C guest billing by class, D Souphattra financial performance, E exceptions; print and CSVs; Revenue keeps guest revenue only', async () => {
  const revenue = reviewRevenue();
  const { root, A, calls } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
  await tick(40);
  const h = root.innerHTML;
  for (const t of ['Executive summary', 'Budget vs actual and forecast', 'Guest billing by class, revenue and receivables', 'Souphattra Heritage – Financial Performance', 'Reconciliation and exceptions']) assert.ok(h.indexOf(t) > 0, t);
  assert.ok(h.indexOf('Executive summary') < h.indexOf('Budget vs actual') && h.indexOf('Souphattra Heritage – Financial Performance') < h.indexOf('Reconciliation and exceptions'), 'the report\'s order');
  assert.match(h, /Approved wedding budget<\/p><p class="t-h1" data-i18n-skip>USD 4,000\.00/); assert.match(h, /Wedding budget variance<\/p><p class="t-h1" data-i18n-skip>\+USD 1,600\.00/);
  /* the Owners' order of 19 Nov 2026: the Souphattra's own revenue, its purchase and the difference by their exact name; no "Surplus", no "Profit" */
  assert.match(h, /Souphattra Heritage – Accommodation Revenue<\/p><p class="t-h1" data-i18n-skip>USD 365\.00/);
  assert.match(h, /data-ab-souphattra-fp/); assert.match(h, /Accommodation Revenue – Hotel Purchase Cost Difference/);
  assert.match(h, /data-ab-classes/); assert.match(h, /Total guest billing/); assert.match(h, /China \/ private travel/);
  assert.match(h, /data-ab-signed004/); assert.match(h, /Planned, net \(004\)/);
  { const m = h.match(/.{80}(Surplus|surplus|Net Profit|net profit).{40}/); assert.ok(!m, 'never "Surplus", never "Net Profit": ' + (m && m[0])); }
  assert.match(h, /THB 30,000\.00/); assert.doesNotMatch(h, /USD 30,000/, 'THB keeps THB');
  assert.match(h, /USD equivalent <span class="ab-id">at the reporting reference rates — a reference, not a transaction rate<\/span>.*≈ USD 890\.74/, 'beside it, labelled');
  assert.match(h, /Remaining wedding budget<\/p><p class="t-h1" data-i18n-skip>−USD 1,600\.00/); assert.match(h, /004 F2 "Budget left" states −USD 1,000\.00/);
  assert.match(h, /Projected wedding financial position<\/p><p class="t-h1" data-i18n-skip>−USD 5,235\.00/);
  assert.match(h, /Additional hotel purchase costs<\/p><p class="t-h1" data-i18n-skip>USD 120\.00/);
  assert.match(h, /Souphattra Heritage · the bookings beside 004/); assert.match(h, /data-ab-recon/); assert.match(h, /Proposed 004 additions · awaiting your approval/);
  assert.match(h, /data-ab-proposals.*additional-person charge.*Guest 3 \(GT3\).*USD 120\.00/);
  assert.doesNotMatch(h, /Triple occupancy|Approve a reporting rate|Update 004\?/, 'decided by the Owners on 18 Nov 2026');
  assert.match(h, /data-ab-csv="reconciliation-004"/);
  assert.match(h, /data-ab-print/); assert.match(h, /data-ab-csv="finance-summary"/); assert.match(h, /data-ab-csv="budget-vs-actual"/);
  assert.match(h, /class="ab-print-head"/);
  assert.ok(calls.every((c) => c.method === 'GET'), 'Finance only reads');
  const fin = A.csv.finance('finance-summary'); assert.match(fin, /Approved wedding budget/); assert.match(fin, /Souphattra Heritage – Accommodation Revenue,365/); assert.match(fin, /Data as of/); assert.match(fin, /Currency/);
  const bva = A.csv.finance('budget-vs-actual'); assert.match(bva, /Approved budget \(004 A2, total only\)/); assert.match(bva, /Committed, USD equivalent \(reference rate\)/);
  const rc = A.csv.finance('reconciliation-004'); assert.match(rc, /004 row as written,8,hotel agreement,set against the booked rooms/);
  assert.match(rc, /Proposed addition,,additional-person charge,new entry,W1,F,Grand Exec,Guest 3,GT3/); assert.match(rc, /awaiting the Owners' approval — not written to 004/);
  const rv = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#revenue' });
  await tick(40);
  assert.match(rv.root.innerHTML, /data-ab-receivables/); assert.match(rv.root.innerHTML, /S-T1-0001 · V1/); assert.match(rv.root.innerHTML, /data-ab-csv="receivables"/);
  /* the Souphattra's accommodation revenue is the Revenue tab's first, standalone figure */
  const rh = rv.root.innerHTML;
  assert.ok(rh.indexOf('data-ab-souphattra') > 0 && rh.indexOf('data-ab-souphattra') < rh.indexOf('data-ab-rev-main'), 'first, before all guest billing');
  assert.match(rh, /Booked accommodation revenue<\/p><p class="t-h1" data-i18n-skip>USD 365\.00/); assert.match(rh, /data-ab-rev-classes/); assert.match(rh, /data-ab-csv="souphattra-revenue"/);
  assert.match(rv.A.csv.classes('souphattra-revenue'), /Total,Souphattra Heritage – Accommodation Revenue,,,3,1,2,365,390,0,390/);
  assert.match(rv.A.csv.classes('pass-through'), /T-OFFER,no,collected and passed on,to confirm/);
  assert.match(rv.A.csv.classes('revenue-by-class'), /Total guest billing,each line once/);
  assert.doesNotMatch(rh, /Surplus|Net Profit/);
  assert.doesNotMatch(rv.root.innerHTML, /Executive summary|Approved budget/, 'costs and budget stay in Finance');
  assert.match(rv.A.csv.receivables(), /INV-T1/);
});

/* ---------------------------------------------------------------- DOWNLOAD ORIGINAL PDF (Owners, 18 Nov 2026) */
test('ADMIN UI · Download Original PDF: in a guest\'s row (the current version, the row is not opened) and per version in the guest view (current and superseded originals) — the guest\'s own file from /api/billing/pdf, nothing issued or sent', async () => {
  const pdfs = [];
  const answers = { 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, 'admin/readiness': { ok: true, rows: [] },
    pdf: (url) => { pdfs.push(url); return { ok: true, status: 200, json: async () => ({}), blob: async () => ({ size: 1 }) }; } };
  const L1 = load(answers);
  await tick();
  const b = el(L1.root, 'data-ab-row-pdf', 'INV-T1');
  assert.ok(b, 'the row of the issued statement offers its original'); assert.equal(b.getAttribute('data-ab-pdf-rev'), '1');
  assert.match(L1.root.innerHTML, /Download Original PDF · V1/);
  assert.equal((L1.root.innerHTML.match(/data-ab-row-pdf=/g) || []).length, 1, 'only issued statements');
  let stopped = false;
  b.onclick({ stopPropagation: () => { stopped = true; } }); await tick();
  assert.equal(stopped, true, 'the row itself is not opened');
  assert.match(pdfs[0], /^\/api\/billing\/pdf\?holder=INV-T1&rev=1$/);
  /* the guest view: every version, each its own original */
  const issued = HOLDER({ issued: { Settlement_ID: 'S-T2-0001', revision: 2, issueDate: '2026-10-09', dueDate: '2026-10-30', total: 245, hostedValue: 0, lines: [], fx: { FX_USD_EUR: 0.89, FX_USD_THB: 33.68 }, method: 'PAYPAL_EUR', currency: 'EUR' },
    settlement: { Settlement_ID: 'S-T2-0001', state: 'ISSUED', latestRevision: 2, revisions: [
      { Revision: 1, Revision_State: 'SUPERSEDED', Issue_Date: '2026-10-07', Due_Date: '2026-10-28', total: 230, issuedAt: '2026-10-07T10:00:00Z', issuedBy: 'GROOM', supersededAt: '2026-10-09T10:00:00Z' },
      { Revision: 2, Revision_State: 'ISSUED', Issue_Date: '2026-10-09', Due_Date: '2026-10-30', total: 245, issuedAt: '2026-10-09T10:00:00Z', issuedBy: 'BRIDE', supersededAt: null }] } });
  const L2 = load({ ...answers, 'admin/holder': issued, 'admin/owner-bookings': { ok: true, entries: [] } }, { hash: '#holder=INV-T2' });
  await tick();
  el(L2.root, 'data-ab-act', 'view').onclick({}); await tick();
  const h = L2.root.innerHTML;
  assert.match(h, /data-ab-act="download"[^>]*>Download Original PDF</);
  assert.match(h, /V1 · superseded \(historical original\)[\s\S]*?Download Original PDF · V1/); assert.match(h, /V2 · current[\s\S]*?Download Original PDF · V2/);
  el(L2.root, 'data-ab-pdf', '1').onclick({}); await tick();
  assert.ok(pdfs.some((u) => u === '/api/billing/pdf?holder=INV-T2&rev=1'), 'the superseded original, by its own version');
  assert.ok(!L1.calls.concat(L2.calls).some((c) => c.method === 'POST'), 'a download writes nothing');
});

test('REVIEW 19 Nov · Souphattra Heritage – Financial Performance counts the confirmed purchase only: a held room\'s cost is named apart, never in the difference', async () => {
  const revenue = reviewRevenue();
  const hp = revenue.budget.report.purchase;
  const confirmedCost = hp.totals.contract.cents + hp.confirmed.additional.cents + hp.confirmed.supplement.cents;
  /* a held room: in the purchase's totals and its pending, never in the confirmed parts */
  hp.totals = { ...hp.totals, additional: { currency: 'USD', cents: hp.totals.additional.cents + 30000, amount: (hp.totals.additional.cents + 30000) / 100 }, total: { currency: 'USD', cents: hp.totals.total.cents + 30000, amount: (hp.totals.total.cents + 30000) / 100 } };
  hp.pending = { currency: 'USD', cents: 30000, amount: 300 };
  const { root } = load({ 'admin/overview': OVERVIEW, 'admin/status': statusAnswer, revenue }, { hash: '#finance' });
  await tick(40);
  const d = root.innerHTML.split('data-ab-souphattra-fp')[1].split('</table>')[0];
  const usdOf = (c) => 'USD ' + (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
  assert.ok(d.includes('Total hotel purchase cost</b><span class="ab-id">confirmed bookings</span></td><td data-l="USD" class="num"><span data-i18n-skip><b>' + usdOf(confirmedCost)), 'the confirmed purchase');
  assert.match(d, /Held, not confirmed — not counted.*USD 300\.00/);
  const diff = 36500 - confirmedCost;
  assert.ok(d.includes((diff < 0 ? '−' : '+') + usdOf(Math.abs(diff))), 'revenue − the confirmed purchase');
});
