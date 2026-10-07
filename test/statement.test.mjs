/* ============================================================================
   YOUR STATEMENT on My Profile (Owner, 6 Oct 2026) — assets/statement.js as the
   page loads it, against a fake server. Fictional guests and figures only.
     · before a statement is issued: one sentence, no total, no instructions, no QR
     · after: the issued revision's own figures, the server's frozen-FX amount,
       the method's destination, the private QR and PDF fetched with the bearer
     · the method choice, and I HAVE PAID only after an explicit confirmation
     · the guest's own statement only; nothing of the previous guest survives
   ========================================================================== */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, src, PEGGY, STEFFIE } from './sandbox.mjs';

const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };
const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => ({ size: 1, type: 'x' }) });

const PAYPAL = { method: 'PAYPAL_EUR', recipient: 'Test Recipient', currency: 'EUR', complete: true };
const SEPA = { method: 'SEPA_EUR', recipient: 'Test Recipient', currency: 'EUR', complete: true, iban: 'XX00TEST0000000000000001' };
const PROMPTPAY = { method: 'PROMPTPAY_THB', recipient: 'Test Recipient', currency: 'THB', complete: true };
const NONE = { ok: true, issued: false, Settlement_ID: null, revision: null };
function issued(over = {}) {
  return {
    ok: true, issued: true, Settlement_ID: 'S-TEST-0001', revision: 2, issueDate: '2026-10-07', dueDate: '2026-10-28',
    issuedTotal: 1234, draftTotal: 987654,
    payment: { status: 'UNPAID', ist: 0, balance: 1234, balanceCents: 123400, flags: [], pendingCount: 0 },
    Payment_Preference: 'PAYPAL_EUR',
    paymentPreference: { Payment_Preference: 'PAYPAL_EUR', currency: 'EUR', determined: true, locked: false, options: [PAYPAL, SEPA], destination: PAYPAL },
    /* deliberately not 1234 × 0.9: the page shows the server's conversion and never multiplies */
    amountInPreferredCurrency: { currency: 'EUR', amount: 1111.11, rate: 0.9 },
    fx: { source: 'ISSUED_REVISION', FX_USD_EUR: 0.9, FX_USD_THB: 33 },
    pdf: '/api/billing/pdf?rev=2',
    ...over,
  };
}

/* the page with a fake server: `answers` maps a path (no query) to a body or a function of the request */
function load(answers, opts = {}) {
  const calls = [];
  let blobs = 0;
  const w = page({
    path: 'profile.html', modules: ['assets/statement.js'], auth: opts.auth,
    fetch: (url, init = {}) => {
      calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body ? JSON.parse(init.body) : null });
      const a = answers[url.split('?')[0]];
      const out = typeof a === 'function' ? a(url, init) : a;
      return out instanceof Error ? Promise.reject(out) : Promise.resolve(out).then((o) => (o && o.status ? o : res(200, o)));
    },
  });
  w.URL = { createObjectURL: () => 'blob:test/' + (++blobs), revokeObjectURL() {} };
  const saved = [];
  w.document.createElement = () => ({ click() { saved.push({ href: this.href, download: this.download }); }, remove() {} });
  return { w, calls, saved, S: w.SIYL_STATEMENT };
}
/* a stand-in for the rendered section: finds the controls the markup carries */
function mount(w) {
  const html = w.SIYL_STATEMENT.html();
  const nodes = {};
  const radios = [...html.matchAll(/name="st-method" value="([^"]+)"/g)].map((m) => ({ value: m[1], onchange: null }));
  const el = {
    html, radios,
    matches: (s) => s === '[data-statement]',
    querySelector(sel) {
      const m = sel.match(/^\[([a-z-]+)\]$/); if (!m) return null;
      const hit = html.match(new RegExp(m[1] + '(?:="([^"]*)")?[\\s>]')); if (!hit) return null;
      return nodes[m[1]] || (nodes[m[1]] = { onclick: null, oninput: null, value: '', getAttribute: () => hit[1] || '' });
    },
    querySelectorAll: (sel) => (sel === 'input[name="st-method"]' ? radios : []),
  };
  w.SIYL_STATEMENT.wire(el);
  return el;
}
const click = async (w, attr) => { const el = mount(w); const b = el.querySelector('[' + attr + ']'); assert.ok(b && b.onclick, attr + ' is offered'); b.onclick(); await tick(); };

test('STATEMENT · before one is issued: "No statement has been issued yet." — no total, no instructions, no QR', async () => {
  const { w, calls, S } = load({ '/api/billing/mine': NONE });
  assert.match(S.html(), /Looking up your statement/);
  await S.load();
  const h = S.html();
  assert.match(h, /No statement has been issued yet\./);
  assert.match(h, /settled within 21 days after it is issued/);
  for (const never of [/USD/, /EUR/, /IBAN/, /data-st-qr/, /<img/, /I have paid/, /Download statement/, /How to pay/]) assert.doesNotMatch(h, never);
  mount(w); await tick();
  assert.deepEqual(calls.map((c) => c.url), ['/api/billing/mine?view=statement'], 'one read, nothing else is asked for');
  assert.equal(calls[0].headers['x-siyl-auth'], PEGGY.bearer, 'the guest\'s own bearer');
  assert.ok(!/holder=/.test(calls[0].url), 'no other holder can be named');
});

test('STATEMENT · issued: number, version, dates, total, paid, outstanding, status — the issued figures, never the draft', async () => {
  const { S } = load({ '/api/billing/mine': issued() });
  await S.load();
  const h = S.html();
  assert.match(h, /S-TEST-0001/); assert.match(h, /version 2/);
  assert.match(h, /Issued<\/span> 7 October 2026/); assert.match(h, /Due by<\/span> 28 October 2026/);
  assert.match(h, /Total<\/span> <span data-i18n-skip>USD 1,234\.00<\/span>/);
  assert.match(h, /Paid<\/span> <span data-i18n-skip>USD 0\.00<\/span>/);
  assert.match(h, /Outstanding<\/span> <span data-i18n-skip>USD 1,234\.00<\/span>/);
  assert.match(h, /Not paid yet/);
  assert.doesNotMatch(h, /987,654|987654/, 'the current draft is not the statement');
  assert.match(h, /Download statement/);
});

test('STATEMENT · the euro amount is the server\'s, at the statement\'s own frozen rate; every amount is out of the display-currency switch', async () => {
  const { S } = load({ '/api/billing/mine': issued() });
  await S.load();
  const h = S.html();
  assert.match(h, /In euros<\/span> <span data-i18n-skip>EUR 1,111\.11<\/span>/);
  assert.match(h, /Amount to pay<\/span> <b><span data-i18n-skip>EUR 1,111\.11<\/span><\/b>/);
  assert.match(h, /1 USD = 0\.9 EUR/);
  assert.doesNotMatch(h, /1,110\.6/, 'nothing is multiplied in the browser');
  const amounts = h.match(/(USD|EUR|THB) [\d,]+\.\d\d/g);
  const shielded = h.match(/data-i18n-skip>(USD|EUR|THB) [\d,]+\.\d\d/g);
  assert.equal(amounts.length, shielded.length, 'no amount can be re-converted at a display rate');
  /* a preview rate is never shown as a statement's rate */
  const preview = load({ '/api/billing/mine': issued({ fx: { source: 'CURRENT_PREVIEW' } }) });
  await preview.S.load();
  assert.doesNotMatch(preview.S.html(), /In euros|Amount to pay/);
});

test('STATEMENT · PAYPAL_EUR: PayPal in euros, the QR fetched privately with the bearer and shown only from memory', async () => {
  const { w, calls, S } = load({ '/api/billing/mine': issued(), '/api/billing/qr': res(200, null) });
  await S.load();
  const before = S.html();
  assert.match(before, /How to pay<\/p><h3 class="t-h2">PayPal<\/h3>/); assert.match(before, /Currency<\/span> Euro \(EUR\)/);
  assert.match(before, /Recipient<\/span> <span data-i18n-skip>Test Recipient/); assert.match(before, /Reference no\.<\/span> <span data-i18n-skip>S-TEST-0001/);
  assert.doesNotMatch(before, /<img/, 'no empty image while the code loads');
  assert.doesNotMatch(before, /IBAN/);
  mount(w); await tick();
  const qr = calls.find((c) => c.url.startsWith('/api/billing/qr'));
  assert.equal(qr.url, '/api/billing/qr?channel=PAYPAL_EUR'); assert.equal(qr.headers['x-siyl-auth'], PEGGY.bearer);
  assert.match(S.html(), /<img src="blob:test\/1" alt="PayPal payment code"/);
  mount(w); await tick();
  assert.equal(calls.filter((c) => c.url.startsWith('/api/billing/qr')).length, 1, 'fetched once, kept in memory');
});

test('STATEMENT · SEPA_EUR: the bank transfer shows the configured IBAN and account holder; no QR is fetched', async () => {
  const sepa = issued({ Payment_Preference: 'SEPA_EUR', paymentPreference: { Payment_Preference: 'SEPA_EUR', currency: 'EUR', determined: true, locked: false, options: [PAYPAL, SEPA], destination: SEPA } });
  const { w, calls, S } = load({ '/api/billing/mine': sepa });
  await S.load();
  const h = S.html();
  assert.match(h, /<h3 class="t-h2">Bank transfer \(SEPA\)<\/h3>/);
  assert.match(h, /IBAN<\/span> <span data-i18n-skip[^>]*>XX00 TEST 0000 0000 0000 0001<\/span>/);
  assert.match(h, /Account holder<\/span> <span data-i18n-skip>Test Recipient/);
  mount(w); await tick();
  assert.equal(calls.filter((c) => c.url.startsWith('/api/billing/qr')).length, 0);
  /* a SEPA destination without its configured account is never shown half */
  const missing = load({ '/api/billing/mine': issued({ paymentPreference: { ...sepa.paymentPreference, destination: { ...SEPA, iban: null, complete: false } } }) });
  await missing.S.load();
  assert.doesNotMatch(missing.S.html(), /IBAN/); assert.match(missing.S.html(), /bank details cannot be shown/);
});

test('STATEMENT · PROMPTPAY_THB: PromptPay in baht with its own QR, and no method to choose on a one-method route', async () => {
  const thb = issued({
    Payment_Preference: 'PROMPTPAY_THB',
    paymentPreference: { Payment_Preference: 'PROMPTPAY_THB', currency: 'THB', determined: true, locked: false, options: [PROMPTPAY], destination: PROMPTPAY },
    amountInPreferredCurrency: { currency: 'THB', amount: 41234.5, rate: 33.4 },
  });
  const { w, calls, S } = load({ '/api/billing/mine': thb, '/api/billing/qr': res(200, null) });
  await S.load();
  const h = S.html();
  assert.match(h, /<h3 class="t-h2">PromptPay<\/h3>/); assert.match(h, /Thai baht \(THB\)/);
  assert.match(h, /THB 41,234\.50/);
  assert.doesNotMatch(h, /st-method/, 'one route, one method');
  mount(w); await tick();
  assert.equal(calls.find((c) => c.url.startsWith('/api/billing/qr')).url, '/api/billing/qr?channel=PROMPTPAY_THB');
});

test('STATEMENT · the method can be changed where the route offers a choice — and never once it is fixed', async () => {
  let current = issued();
  const { w, calls, S } = load({
    '/api/billing/mine': () => res(200, current),
    '/api/billing/preference': () => { current = issued({ Payment_Preference: 'SEPA_EUR', paymentPreference: { ...current.paymentPreference, Payment_Preference: 'SEPA_EUR', destination: SEPA } }); return res(200, { ok: true }); },
  });
  await S.load();
  const el = mount(w);
  assert.deepEqual(el.radios.map((r) => r.value), ['PAYPAL_EUR', 'SEPA_EUR']);
  el.radios[1].onchange(); await tick();
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0, 'choosing alone changes nothing');
  assert.match(S.html(), /Use Bank transfer \(SEPA\)/);
  await click(w, 'data-st-method-save');
  const post = calls.find((c) => c.url === '/api/billing/preference');
  assert.equal(post.method, 'POST'); assert.deepEqual(post.body, { Payment_Preference: 'SEPA_EUR' }); assert.equal(post.headers['x-siyl-auth'], PEGGY.bearer);
  assert.match(S.html(), /<h3 class="t-h2">Bank transfer \(SEPA\)<\/h3>/);
  assert.match(S.html(), /Your payment method is changed\./);

  const locked = load({ '/api/billing/mine': issued({ paymentPreference: { ...issued().paymentPreference, locked: true } }) });
  await locked.S.load();
  assert.doesNotMatch(locked.S.html(), /st-method/); assert.match(locked.S.html(), /fixed since your first verified payment/);
});

test('STATEMENT · I HAVE PAID: the amount, then an explicit confirmation, then ONE report in the method\'s currency', async () => {
  let reported = 0;
  const { w, calls, S } = load({
    '/api/billing/mine': () => res(200, issued({ payment: { ...issued().payment, pendingCount: reported, flags: reported ? ['PENDING_VERIFICATION'] : [] } })),
    '/api/billing/payment/report': () => { reported++; return res(200, { ok: true, recorded: 'REPORTED' }); },
  });
  await S.load();
  await click(w, 'data-st-paid');
  assert.match(S.html(), /Amount paid in EUR/);
  assert.match(S.html(), /value="1111\.11" data-st-amount/, 'the open balance in euros, as the server converted it');
  let el = mount(w);
  el.querySelector('[data-st-amount]').value = '1.000,50'; el.querySelector('[data-st-amount]').oninput();
  el.querySelector('[data-st-ref]').value = '  PP-TEST-7  '; el.querySelector('[data-st-ref]').oninput();
  el.querySelector('[data-st-next]').onclick(); await tick();
  assert.equal(calls.filter((c) => c.url.includes('payment/report')).length, 0, 'nothing is reported before the confirmation');
  const confirm = S.html();
  assert.match(confirm, /Please confirm what you are reporting/);
  assert.match(confirm, /EUR 1,000\.50/); assert.match(confirm, /PP-TEST-7/);
  await click(w, 'data-st-report');
  const posts = calls.filter((c) => c.url === '/api/billing/payment/report');
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body, { Method: 'PAYPAL_EUR', Currency_Paid: 'EUR', Amount_Paid: 1000.5, Provider_Reference: 'PP-TEST-7' });
  assert.equal(posts[0].headers['x-siyl-auth'], PEGGY.bearer);
  const after = S.html();
  assert.match(after, /Your payment is reported/);
  assert.match(after, /One payment you reported is waiting for Guest Relations to verify it\./);
  assert.match(after, /Outstanding<\/span> <span data-i18n-skip>USD 1,234\.00/, 'a reported payment changes no balance');
  /* a second click on a spent confirmation sends nothing */
  el = mount(w); assert.equal(el.querySelector('[data-st-report]'), null);
});

test('STATEMENT · I HAVE PAID refuses an amount it cannot read, and a refused report says nothing was saved', async () => {
  const { w, calls, S } = load({
    '/api/billing/mine': issued(),
    '/api/billing/payment/report': res(409, { ok: false, retry: true, error: 'FX' }),
  });
  await S.load();
  await click(w, 'data-st-paid');
  let el = mount(w);
  el.querySelector('[data-st-amount]').value = 'about 50'; el.querySelector('[data-st-amount]').oninput();
  el.querySelector('[data-st-next]').onclick(); await tick();
  assert.match(S.html(), /Please enter the amount you paid/); assert.doesNotMatch(S.html(), /Please confirm/);
  el = mount(w);
  el.querySelector('[data-st-amount]').value = '50'; el.querySelector('[data-st-amount]').oninput();
  el.querySelector('[data-st-next]').onclick(); await tick();
  await click(w, 'data-st-report');
  assert.equal(calls.filter((c) => c.url.includes('payment/report')).length, 1);
  assert.match(S.html(), /cannot be recorded just yet\. Nothing was saved/);
  assert.doesNotMatch(S.html(), /FX/, 'the server\'s own words are not shown');
});

test('STATEMENT · a paid statement offers no payment, no QR and no I HAVE PAID', async () => {
  const { w, calls, S } = load({ '/api/billing/mine': issued({ payment: { status: 'PAID', ist: 1234, balance: 0, balanceCents: 0, flags: [], pendingCount: 0 } }) });
  await S.load();
  const h = S.html();
  assert.match(h, /Nothing is outstanding on this statement/);
  for (const never of [/I have paid/, /data-st-qr/, /st-method/, /Amount to pay/]) assert.doesNotMatch(h, never);
  mount(w); await tick();
  assert.equal(calls.filter((c) => c.url.startsWith('/api/billing/qr')).length, 0);
});

test('STATEMENT · DOWNLOAD STATEMENT fetches the issued PDF with the bearer and saves it — never a shareable link', async () => {
  const { w, calls, saved, S } = load({ '/api/billing/mine': issued(), '/api/billing/pdf': res(200, null) });
  await S.load();
  assert.doesNotMatch(S.html(), /href="\/api\/billing\/pdf/);
  await click(w, 'data-st-pdf');
  const pdf = calls.find((c) => c.url.startsWith('/api/billing/pdf'));
  assert.equal(pdf.url, '/api/billing/pdf?rev=2'); assert.equal(pdf.headers['x-siyl-auth'], PEGGY.bearer);
  assert.equal(saved.length, 1); assert.match(saved[0].href, /^blob:test\/\d+$/);
  assert.equal(saved[0].download, 'Statement-S-TEST-0001-V2.pdf');
});

test('STATEMENT · an undetermined method: Guest Relations tells the guest — no default destination is guessed', async () => {
  const { S } = load({ '/api/billing/mine': issued({ Payment_Preference: null, paymentPreference: { Payment_Preference: null, determined: false, options: [], destination: null, locked: false }, amountInPreferredCurrency: null }) });
  await S.load();
  const h = S.html();
  assert.match(h, /Guest Relations will tell you how to pay this statement/);
  for (const never of [/PayPal/, /IBAN/, /I have paid/, /data-st-qr/]) assert.doesNotMatch(h, never);
});

test('STATEMENT · the guest\'s own only: another guest on this device starts from nothing; a late answer for the first is dropped', async () => {
  let release;
  const slow = new Promise((r) => { release = r; });
  const { w, calls, S } = load({ '/api/billing/mine': (url, init) => (init.headers['x-siyl-auth'] === PEGGY.bearer ? slow.then(() => res(200, issued())) : res(200, NONE)) });
  const first = S.load();
  w.localStorage.setItem('siyl.auth', JSON.stringify(STEFFIE));
  w.document.dispatchEvent(new w.CustomEvent('siyl:auth'));
  await tick();
  assert.equal(calls[1].headers['x-siyl-auth'], STEFFIE.bearer);
  release(); await first; await tick();
  assert.match(S.html(), /No statement has been issued yet/, 'Peggy\'s statement never reaches Steffie');
  assert.doesNotMatch(S.html(), /S-TEST-0001/);
  w.document.dispatchEvent(new w.CustomEvent('siyl:signout'));
  w.localStorage.removeItem('siyl.auth');
  assert.equal(S.html(), '', 'signed out: nothing');
  assert.equal(S.state(), 'idle');
});

test('STATEMENT · a guest not joining reads a statement only once one is issued', async () => {
  const none = load({ '/api/billing/mine': NONE });
  await none.S.load();
  assert.equal(none.S.html({ quiet: true }), '');
  const one = load({ '/api/billing/mine': issued() });
  await one.S.load();
  assert.match(one.S.html({ quiet: true }), /S-TEST-0001/);
});

test('STATEMENT · a failed read offers a retry and shows no figures', async () => {
  const { w, S } = load({ '/api/billing/mine': res(503, { ok: false }) });
  await S.load();
  assert.match(S.html(), /cannot be shown just now/); assert.doesNotMatch(S.html(), /USD|No statement/);
  assert.ok(mount(w).querySelector('[data-st-retry]').onclick);
});

test('STATEMENT · no administration on My Profile: only the guest routes, never a holder named, never issue/verify/approve', () => {
  const code = src('assets/statement.js');
  const routes = [...code.matchAll(/'\/api\/billing\/([a-z/]+)/g)].map((m) => m[1]).sort();
  assert.deepEqual(routes, ['mine', 'payment/report', 'preference', 'qr']);
  for (const never of [/holder=/, /holderId/, /\/issue/, /payment\/verify/, /payment\/reject/, /gate/, /override/, /reconcile/, /revenue/]) assert.doesNotMatch(code, never);
  const profile = src('profile.html');
  assert.match(profile, /<script src="assets\/statement\.js\?v=[0-9a-f]{8}"><\/script>/);
  assert.match(profile, /status\(p\)\+stm\+yourStay\(me\)/, 'right after the trip status');
  assert.doesNotMatch(profile, /api\/billing\/(issue|holders|gate|payment\/verify)/);
});

test('CLOSEOUT (Owner, 7 Oct 2026) · no seven- or fourteen-day payment wording anywhere a guest reads — the registration system, the pages, the scripts, the e-mails, the Thai; the SEPA account holder is the full name', async () => {
  const { readdirSync } = await import('node:fs');
  const files = ['register/data.mjs', 'register/app.mjs', 'register/logic.mjs', 'register/index.html', 'src/mail-templates.js', 'src/billing/pdf.js',
    ...readdirSync(new URL('../', import.meta.url)).filter((f) => f.endsWith('.html')),
    ...readdirSync(new URL('../assets/', import.meta.url)).filter((f) => f.endsWith('.js')).map((f) => 'assets/' + f)];
  const code = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const f of files) {
    const t = code(src(f));
    assert.doesNotMatch(t, /seven days|within 7 days|7-day|14 days after booking|charged within 14/i, f);
  }
  assert.match(src('register/data.mjs'), /payment: 'Nothing is paid on this website\. No deposit is required\. Once your arrangements are confirmed and your statement is issued, it appears in My Profile, with its due date and how to pay\. It is settled within 21 days after it is issued\.'/);
  const th = JSON.parse(src('src/i18n-th.json'));
  assert.doesNotMatch(JSON.stringify(th), /14 days after booking|seven days/);
  for (const k of ['Will be booked by the bride & groom. It is settled within 21 days after your statement is issued.', 'Account holder',
    'Nothing is paid on this website. No deposit is required. Once your arrangements are confirmed and your statement is issued, it appears in My Profile, with its due date and how to pay. It is settled within 21 days after it is issued.']) assert.ok(th.exact[k], 'Thai for ' + k);
  const { destinationOf, CHANNEL_DESTINATION } = await import('../src/billing/preference.js');
  assert.equal(CHANNEL_DESTINATION.SEPA_EUR.recipient, 'Suthep Thongantang');
  assert.equal(destinationOf('SEPA_EUR', { BILLING_SEPA_IBAN: 'XX00TEST0000000000000001' }).recipient, 'Suthep Thongantang');
  assert.match(src('assets/statement.js'), /row\('Account holder', '<span data-i18n-skip>' \+ esc\(dest\.recipient\)/);
  assert.equal(CHANNEL_DESTINATION.PAYPAL_EUR.recipient, 'Suthep', 'PayPal unchanged'); assert.equal(CHANNEL_DESTINATION.PROMPTPAY_THB.recipient, 'Haruthai', 'PromptPay unchanged');
});

test('WORDING · the obsolete seven-day invoice is gone; the statement is settled within 21 days after it is issued', () => {
  for (const f of ['profile.html', 'review.html', 'src/mail-templates.js']) {
    const s = src(f);
    assert.doesNotMatch(s, /seven days|sends you an invoice/, f);
    assert.match(s, /settled within 21 days after it is issued/, f);
  }
  const th = JSON.parse(src('src/i18n-th.json'));
  const all = JSON.stringify(th);
  assert.doesNotMatch(all, /seven days/);
  assert.doesNotMatch(all, /ชำระภายในเจ็ดวัน|ชำระภายใน 7 วัน/);
  for (const k of ['No statement has been issued yet.', 'Your statement', 'Download statement', 'I have paid', 'Yes, report this payment']) assert.ok(th.exact[k], 'Thai for ' + k);
});

/* ---- Codex round 9 (6 Oct 2026) ---- */
test('ROUND 9 · an unreadable answer to a report is uncertain, never "nothing was saved": the confirmation is spent, the count re-read', async () => {
  const { w, calls, S } = load({
    '/api/billing/mine': issued(),
    '/api/billing/payment/report': { ok: true, status: 200, json: async () => { throw new Error('truncated'); } },
  });
  await S.load();
  await click(w, 'data-st-paid');
  mount(w).querySelector('[data-st-next]').onclick(); await tick();
  await click(w, 'data-st-report');
  const h = S.html();
  assert.match(h, /could not be confirmed just now/); assert.doesNotMatch(h, /Nothing was saved/);
  assert.equal(mount(w).querySelector('[data-st-report]'), null, 'no second report from the same confirmation');
  assert.equal(calls.filter((c) => c.url.startsWith('/api/billing/mine')).length, 2, 'the waiting count is read again');
  assert.equal(calls.filter((c) => c.url.includes('payment/report')).length, 1);
});

test('ROUND 9 · a saved method is shown at once — a failed refresh never leaves the old instructions beside "changed"', async () => {
  let reads = 0;
  const { w, S } = load({
    '/api/billing/mine': () => (++reads === 1 ? res(200, issued()) : new Error('offline')),
    '/api/billing/preference': res(200, { ok: true, paymentPreference: { Payment_Preference: 'SEPA_EUR', currency: 'EUR', determined: true, locked: false, options: [PAYPAL, SEPA], destination: SEPA } }),
  });
  await S.load();
  const el = mount(w); el.radios[1].onchange(); await tick();
  await click(w, 'data-st-method-save');
  const h = S.html();
  assert.match(h, /Your payment method is changed\./);
  assert.match(h, /<h3 class="t-h2">Bank transfer \(SEPA\)<\/h3>/); assert.match(h, /IBAN/);
  assert.doesNotMatch(h, /Scan the code with the PayPal app/);
});

test('ROUND 9 · signed out in another tab: My Profile removes the drawn statement at once', () => {
  const profile = src('profile.html');
  const handler = profile.slice(profile.indexOf("document.addEventListener('siyl:statement'"), profile.indexOf("/* the community arrives"));
  assert.match(handler, /t\.innerHTML=G\.me\(\)\?SM\.html\(\{quiet:quiet\}\):''/);
  assert.match(handler, /if\(!fresh\)\{old\.remove\(\);return\}/);
  assert.doesNotMatch(handler, /if\(!SM\|\|!G\.me\(\)\)return/, 'no early return that keeps a signed-out statement on screen');
});
