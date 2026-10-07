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
const statusAnswer = (url) => {
  const ids = decodeURIComponent(url.split('ids=')[1]).split(',');
  return res(200, { ok: true, rows: ids.map((id) => ({ Holder_ID: id, confirmation: { state: id === 'INV-T2' ? 'CONFIRMED' : 'NONE' },
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
  assert.match(h, /USD 245\.00 · draft/, 'a draft total is marked as such');
  /* filters and search change only what is shown */
  el(root, 'data-ab-filter', 'review').onclick(); await tick();
  assert.match(root.innerHTML, /Guest 2/); assert.match(root.innerHTML, /Guest 3/); assert.doesNotMatch(root.innerHTML, /Guest 4</);
  assert.ok(A.state().filter === 'review');
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
  assert.match(root.innerHTML, /Preview · the Billing Engine/); assert.match(root.innerHTML, /USD 245\.00/); assert.match(root.innerHTML, /T-STAY/);
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
