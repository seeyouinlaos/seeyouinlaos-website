/* ============================================================================
   SEE YOU IN LAOS — YOUR STATEMENT (My Profile · Owner, 6 Oct 2026).

   The guest's own Guest Settlement statement, read from the server
   (GET /api/billing/mine) with the guest's own bearer — the server answers for
   this invitation only, so no other guest's statement can ever be asked for.

   BEFORE A STATEMENT IS ISSUED: one sentence — "No statement has been issued
   yet." No total, no payment instructions, no QR code: a draft is not a
   statement.

   AFTER IT IS ISSUED: what the issued revision froze — its number, issue date,
   due date and total — with the verified payments, the open balance and the
   payment status the server calculates; the payment method, its currency and
   where the money goes; the balance in that currency at the statement's OWN
   frozen rate (the server converts; nothing is multiplied here).
     · DOWNLOAD STATEMENT — the issued PDF, fetched with the guest's bearer
       (GET /api/billing/pdf) and saved; never a public link.
     · the payment method — chosen among the methods the guest's route offers,
       until the first verified payment fixes it (POST /api/billing/preference).
     · I HAVE PAID — the guest reports a payment made outside the website, after
       an explicit confirmation (POST /api/billing/payment/report). Only Guest
       Relations' verification changes the balance; the guest is told so.
     · the QR codes stay private: fetched with the bearer, shown from memory.

   NOTHING HERE ISSUES, VERIFIES OR ADMINISTERS ANYTHING. There are no admin
   controls on My Profile; a statement is only ever issued by a BILLING_ADMIN.
   ========================================================================== */
(function () {
  'use strict';

  function auth() {
    try { var a = JSON.parse(localStorage.getItem('siyl.auth') || 'null'); return a && a.bearer ? a : null; } catch (e) { return null; }
  }
  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function emit() { try { document.dispatchEvent(new CustomEvent('siyl:statement')); } catch (e) { /* nothing listens */ } }
  /* AN AMOUNT IS SHOWN AS ISSUED. The site's display-currency switch turns every
     "USD n" it can read into an approximate equivalent at a display rate; the
     statement's own figures are kept out of its reach (data-i18n-skip), because
     an issued statement converts only at its own frozen rate. */
  function amount(cur, n) {
    if (n == null || n === '' || !isFinite(Number(n))) return '';
    return '<span data-i18n-skip>' + esc(cur + ' ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + '</span>';
  }
  function usd(n) { return amount('USD', n); }
  function day(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).slice(0, 10) + 'T12:00:00Z');
    return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  var METHOD = {
    PAYPAL_EUR: { label: 'PayPal', currency: 'EUR', words: 'PayPal, in euros (EUR)' },
    SEPA_EUR: { label: 'Bank transfer (SEPA)', currency: 'EUR', words: 'Bank transfer (SEPA), in euros (EUR)' },
    PROMPTPAY_THB: { label: 'PromptPay', currency: 'THB', words: 'PromptPay, in Thai baht (THB)' }
  };
  var CURRENCY = { EUR: 'Euro (EUR)', THB: 'Thai baht (THB)' };
  var STATUS = {
    UNPAID: { words: 'Not paid yet', tone: 'open' },
    PARTIAL: { words: 'Partly paid', tone: 'open' },
    PAID: { words: 'Paid', tone: 'on' },
    OVERPAID: { words: 'Paid in full — Guest Relations refunds the difference', tone: 'on' },
    NOTHING_DUE: { words: 'Nothing to pay', tone: 'on' }
  };
  var MUTE = ' style="color:var(--p-mute)"';

  /* the state of THIS guest's statement; a different bearer starts from nothing */
  function fresh() { return { owner: null, phase: 'idle', data: null, msg: '', pdfMsg: '', busy: false, pick: null, form: null, qr: {}, qrWait: {}, qrFail: {} }; }
  var st = fresh();
  function reset() {
    Object.keys(st.qr).forEach(function (k) { try { URL.revokeObjectURL(st.qr[k]); } catch (e) {} });
    st = fresh();
  }
  function mine() { var a = auth(); return !!(a && st.owner && a.bearer === st.owner); }
  function headers(json) { var a = auth(), h = { 'x-siyl-auth': a ? a.bearer : '' }; if (json) h['content-type'] = 'application/json'; return h; }
  function answer(r) { return r.json().catch(function () { return null; }).then(function (j) { return { r: r, j: j }; }); }

  function load() {
    var a = auth();
    if (!a) { reset(); emit(); return Promise.resolve(null); }
    if (st.owner !== a.bearer) { reset(); st.owner = a.bearer; }
    var bearer = a.bearer;
    st.phase = st.data ? 'ready' : 'loading';
    return fetch('/api/billing/mine?view=statement', { headers: headers(false), cache: 'no-store' })
      .then(answer)
      .then(function (x) {
        if (!auth() || auth().bearer !== bearer) return null;            /* the guest changed meanwhile: dropped, unseen */
        if (x.r.ok && x.j && x.j.ok === true) { st.data = x.j; st.phase = 'ready'; }
        else if (!st.data) st.phase = 'error';
        emit(); return st.data;
      }, function () {
        if (!auth() || auth().bearer !== bearer) return null;
        if (!st.data) st.phase = 'error';
        emit(); return null;
      });
  }

  function issued() { var d = st.data; return !!(d && d.issued === true && d.revision != null && d.Settlement_ID); }
  function pref() { var d = st.data; return (d && d.paymentPreference) || null; }
  /* the open balance in the payment currency — the server's conversion at the statement's own frozen rate */
  function owed() {
    var d = st.data, c = d && d.amountInPreferredCurrency, pay = (d && d.payment) || {};
    return d && d.fx && d.fx.source === 'ISSUED_REVISION' && c && c.amount != null && Number(pay.balanceCents) > 0 ? c : null;
  }

  /* ---------------------------------------------------------------- render */
  function section(inner) { return '<section class="prep-sec" id="statement" data-statement><p class="t-l1">Your statement</p>' + inner + '</section>'; }
  function row(k, v) { return '<p class="t-b2"><span class="t-l1">' + esc(k) + '</span> ' + v + '</p>'; }

  /* opts.quiet — a guest not joining reads a statement only once one is issued */
  function html(opts) {
    if (!auth()) return '';
    if (opts && opts.quiet && !issued()) return '';
    if (st.phase === 'idle' || st.phase === 'loading') {
      return section('<div class="p-card"><p class="t-b2"' + MUTE + '>Looking up your statement…</p></div>');
    }
    if (st.phase === 'error' && !st.data) {
      return section('<div class="p-card"><p class="t-b1 measure">Your statement cannot be shown just now. Please try again in a moment.</p>' +
        '<div class="p-actions"><button type="button" class="p-link" data-st-retry>Try again</button></div></div>');
    }
    if (!issued()) {
      return section('<div class="p-card" data-st-none><h3 class="t-h1">No statement has been issued yet.</h3>' +
        '<p class="t-b2 measure">Once Guest Relations has confirmed your arrangements and issued your statement, it appears here, with its total, its due date and how to pay. It is settled within 21 days after it is issued.</p></div>');
    }
    return section(summaryCard() + payCard());
  }

  function summaryCard() {
    var d = st.data, pay = d.payment || {}, s = STATUS[pay.status] || { words: 'With Guest Relations for review', tone: 'open' };
    var overdue = Array.isArray(pay.flags) && pay.flags.indexOf('OVERDUE') >= 0;
    var pending = Number(pay.pendingCount) || 0;
    var settled = pay.status === 'PAID' || pay.status === 'NOTHING_DUE' || pay.status === 'OVERPAID';
    var balance = pay.balance != null ? pay.balance : d.issuedTotal;
    var c = owed();
    var rows =
      row('Statement', '<span data-i18n-skip>' + esc(d.Settlement_ID) + '</span> · <span>version ' + esc(d.revision) + '</span>') +
      row('Issued', esc(day(d.issueDate))) +
      row('Due by', esc(day(d.dueDate))) +
      row('Total', usd(d.issuedTotal)) +
      row('Paid', usd(pay.ist != null ? pay.ist : 0)) +
      row('Outstanding', usd(Math.max(0, Number(balance) || 0))) +
      (c ? row(c.currency === 'THB' ? 'In baht' : 'In euros', amount(c.currency, c.amount)) +
           row('Rate', '<span data-i18n-skip>' + esc('1 USD = ' + c.rate + ' ' + c.currency) + '</span>') : '');
    return '<div class="p-card" data-st-summary>' +
      '<p class="t-l1 ' + (overdue ? 'open' : s.tone) + '">' + esc(overdue ? 'Overdue' : s.words) + '</p>' +
      '<h3 class="t-h1">' + (settled ? esc(s.words) : usd(Math.max(0, Number(balance) || 0))) + '</h3>' +
      '<div class="pf-rows">' + rows + '</div>' +
      (pending ? '<p class="t-b2 measure">' + esc(pending === 1 ? 'One payment you reported is waiting for Guest Relations to verify it.' : pending + ' payments you reported are waiting for Guest Relations to verify them.') + '</p>' : '') +
      '<p class="t-b2 measure"' + MUTE + '>Only payments Guest Relations has verified count towards Paid. Amounts in euros or baht use this statement\'s own rate, fixed when it was issued.</p>' +
      '<div class="p-actions"><button type="button" class="p-act" data-st-pdf' + (st.pdfMsg === 'Preparing your statement…' ? ' disabled' : '') + '>Download statement</button></div>' +
      (st.pdfMsg ? '<p class="t-b2" role="status"' + MUTE + '>' + esc(st.pdfMsg) + '</p>' : '') + '</div>';
  }

  /* the code is shown only once its private copy is in memory — never a public URL, never an empty image */
  function qrHtml(ch) {
    var box = 'width:220px;max-width:100%;';
    var alt = ch === 'PAYPAL_EUR' ? 'PayPal payment code' : 'PromptPay payment code';
    if (st.qr[ch]) return '<p><img src="' + esc(st.qr[ch]) + '" alt="' + esc(alt) + '" width="220" height="220" style="' + box + 'height:auto;display:block;background:#fff"></p>';
    return '<p class="t-b2" data-st-qr="' + esc(ch) + '" style="' + box + 'color:var(--p-mute)">' +
      esc(st.qrFail[ch] ? 'The payment code cannot be shown just now. Please reload the page, or ask Guest Relations.' : 'Loading the payment code…') + '</p>';
  }

  function destinationHtml(p, d) {
    var ch = p.Payment_Preference, dest = p.destination || {};
    var ref = row('Reference no.', '<span data-i18n-skip>' + esc(d.Settlement_ID) + '</span>');
    if (ch === 'SEPA_EUR') {
      if (!dest.complete || !dest.iban) return '<p class="t-b2 measure">The bank details cannot be shown just now. Please choose PayPal, or ask Guest Relations.</p>';
      var iban = String(dest.iban).replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
      return '<p class="t-b2 measure">Transfer the amount to pay by SEPA bank transfer, and add your reference to the transfer.</p>' +
        '<div class="pf-rows">' + row('Account name', '<span data-i18n-skip>' + esc(dest.recipient) + '</span>') +
        /* on its own line, never broken, one tap selects it whole */
        '<p class="t-b2"><span class="t-l1">IBAN</span> <span data-i18n-skip style="display:block;white-space:nowrap;user-select:all;-webkit-user-select:all">' + esc(iban) + '</span></p>' + ref + '</div>';
    }
    if (ch === 'PAYPAL_EUR' || ch === 'PROMPTPAY_THB') {
      return '<p class="t-b2 measure">' + esc(ch === 'PAYPAL_EUR'
        ? 'Scan the code with the PayPal app and send the amount to pay. Please add your reference as a note.'
        : 'Scan the code with your banking app (PromptPay) and send the amount to pay.') + '</p>' +
        qrHtml(ch) + '<div class="pf-rows">' + row('Recipient', '<span data-i18n-skip>' + esc(dest.recipient) + '</span>') + ref + '</div>';
    }
    return '';
  }

  function payCard() {
    var d = st.data, p = pref(), pay = d.payment || {};
    if (!p || !p.determined || !p.Payment_Preference || !METHOD[p.Payment_Preference]) {
      return '<div class="p-card" style="margin-top:var(--s3)" data-st-pay><p class="t-l1">How to pay</p><p class="t-b2 measure">Guest Relations will tell you how to pay this statement.</p></div>';
    }
    var m = METHOD[p.Payment_Preference];
    var open = pay.status === 'UNPAID' || pay.status === 'PARTIAL';
    var c = owed();
    var facts = row('Currency', esc(CURRENCY[m.currency] || m.currency)) +
      (open && c ? row('Amount to pay', '<b>' + amount(c.currency, c.amount) + '</b>') : '');
    var opts = Array.isArray(p.options) ? p.options.filter(function (o) { return o && METHOD[o.method]; }) : [];
    var choose = '';
    if (open && !p.locked && opts.length > 1) {
      var picked = st.pick || p.Payment_Preference;
      choose = '<fieldset class="p-field" data-st-methods style="border:0;padding:0;min-width:0"><legend class="t-l1">Choose how you pay</legend>' +
        opts.map(function (o) {
          return '<label class="p-check t-b2"><input type="radio" name="st-method" value="' + esc(o.method) + '"' + (o.method === picked ? ' checked' : '') + (st.busy ? ' disabled' : '') + '><span>' + esc(METHOD[o.method].words) + '</span></label>';
        }).join('') +
        (picked !== p.Payment_Preference ? '<div class="p-actions"><button type="button" class="p-act" data-st-method-save' + (st.busy ? ' disabled' : '') + '>Use ' + esc(METHOD[picked].label) + '</button><button type="button" class="p-link mute" data-st-method-cancel>Keep ' + esc(m.label) + '</button></div>' : '') +
        '</fieldset>';
    } else if (open && p.locked) {
      choose = '<p class="t-b2"' + MUTE + '>Your payment method is fixed since your first verified payment.</p>';
    }
    return '<div class="p-card" style="margin-top:var(--s3)" data-st-pay><p class="t-l1">How to pay</p>' +
      '<h3 class="t-h2">' + esc(m.label) + '</h3><div class="pf-rows">' + facts + '</div>' +
      (open ? destinationHtml(p, d) : '<p class="t-b2 measure">Nothing is outstanding on this statement.</p>') +
      choose + (open ? paidHtml(p) : '') +
      (st.msg ? '<p class="t-b2" role="status">' + esc(st.msg) + '</p>' : '') + '</div>';
  }

  function paidHtml(p) {
    var m = METHOD[p.Payment_Preference], f = st.form;
    if (!f) return '<div class="p-actions"><button type="button" class="p-act" data-st-paid>I have paid</button></div>';
    if (f.confirm) {
      return '<div class="p-card flat" data-st-confirm style="margin-top:var(--s4)"><p class="t-l1">I have paid</p>' +
        '<p class="t-b1 measure">Please confirm what you are reporting to Guest Relations.</p>' +
        '<div class="pf-rows">' + row('Amount paid', '<b>' + amount(m.currency, f.amount) + '</b>') + row('Method', esc(m.label)) +
        (f.reference ? row('Reference no.', '<span data-i18n-skip>' + esc(f.reference) + '</span>') : '') + '</div>' +
        '<p class="t-b2 measure">Guest Relations checks every payment before your balance changes.</p>' +
        '<div class="p-actions"><button type="button" class="p-act" data-st-report' + (st.busy ? ' disabled' : '') + '>Yes, report this payment</button><button type="button" class="p-link mute" data-st-edit' + (st.busy ? ' disabled' : '') + '>Change</button></div></div>';
    }
    return '<div class="p-card flat" data-st-form style="margin-top:var(--s4)"><p class="t-l1">I have paid</p>' +
      '<div class="p-field"><label class="t-l1" for="st-amount">Amount paid in ' + esc(m.currency) + '</label><input id="st-amount" type="text" inputmode="decimal" autocomplete="off" value="' + esc(f.amount) + '" data-st-amount></div>' +
      '<div class="p-field"><label class="t-l1" for="st-ref">Payment reference (optional)</label><input id="st-ref" type="text" maxlength="120" autocomplete="off" value="' + esc(f.reference) + '" data-st-ref></div>' +
      '<div class="p-actions"><button type="button" class="p-act" data-st-next>Continue</button><button type="button" class="p-link mute" data-st-cancel>Cancel</button></div></div>';
  }

  /* ------------------------------------------------------------------ wire */
  function wire(root) {
    var el = root && (root.matches && root.matches('[data-statement]') ? root : root.querySelector('[data-statement]'));
    if (!el) return;
    var q = function (s) { return el.querySelector(s); };
    var b;
    if ((b = q('[data-st-retry]'))) b.onclick = function () { st.phase = 'loading'; emit(); load(); };
    if ((b = q('[data-st-pdf]'))) b.onclick = download;
    el.querySelectorAll('input[name="st-method"]').forEach(function (i) { i.onchange = function () { st.pick = i.value; st.msg = ''; emit(); }; });
    if ((b = q('[data-st-method-save]'))) b.onclick = saveMethod;
    if ((b = q('[data-st-method-cancel]'))) b.onclick = function () { st.pick = null; emit(); };
    if ((b = q('[data-st-paid]'))) b.onclick = function () {
      var c = owed();
      st.form = { amount: c ? c.amount.toFixed(2) : '', reference: '', confirm: false }; st.msg = ''; emit();
    };
    var amt = q('[data-st-amount]'), ref = q('[data-st-ref]');
    if (amt) amt.oninput = function () { if (st.form) st.form.amount = amt.value; };
    if (ref) ref.oninput = function () { if (st.form) st.form.reference = ref.value; };
    if ((b = q('[data-st-cancel]'))) b.onclick = function () { st.form = null; st.msg = ''; emit(); };
    if ((b = q('[data-st-next]'))) b.onclick = function () {
      var raw = String(st.form && st.form.amount || '').replace(/\s/g, '');
      /* "1.234,56" and "1,234.56" both mean the same payment; a lone comma is the decimal mark */
      var norm = /,\d{1,2}$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
      var v = /^\d+(\.\d{1,2})?$/.test(norm) ? Number(norm) : NaN;
      if (!isFinite(v) || v <= 0) { st.msg = 'Please enter the amount you paid, for example 250.00.'; emit(); return; }
      st.form.amount = v.toFixed(2); st.form.reference = String(st.form.reference || '').trim().slice(0, 120);
      st.form.confirm = true; st.msg = ''; emit();
    };
    if ((b = q('[data-st-edit]'))) b.onclick = function () { if (st.form) st.form.confirm = false; emit(); };
    if ((b = q('[data-st-report]'))) b.onclick = report;
    paintQr(el);
  }

  function paintQr(el) {
    var wait = el.querySelector('[data-st-qr]');
    if (!wait || !mine()) return;
    var ch = wait.getAttribute('data-st-qr');
    if (st.qr[ch] || st.qrWait[ch] || st.qrFail[ch]) return;
    var bearer = st.owner;
    st.qrWait[ch] = true;
    fetch('/api/billing/qr?channel=' + encodeURIComponent(ch), { headers: headers(false), cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('qr ' + r.status); return r.blob(); })
      .then(function (blob) {
        if (!mine() || st.owner !== bearer) return;
        st.qrWait[ch] = false; st.qr[ch] = URL.createObjectURL(blob); emit();
      }, function () {
        if (!mine() || st.owner !== bearer) return;
        st.qrWait[ch] = false; st.qrFail[ch] = true; emit();
      });
  }

  /* the issued PDF, fetched with the guest's own bearer and saved — never a shareable link */
  function download() {
    var d = st.data;
    if (!d || !d.pdf || !mine() || st.pdfMsg === 'Preparing your statement…') return;
    var bearer = st.owner;
    st.pdfMsg = 'Preparing your statement…'; emit();
    fetch(d.pdf, { headers: headers(false), cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('pdf ' + r.status); return r.blob(); })
      .then(function (blob) {
        if (!mine() || st.owner !== bearer) return;
        var url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'Statement-' + d.Settlement_ID + '-V' + d.revision + '.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
        st.pdfMsg = ''; emit();
      }, function () {
        if (!mine() || st.owner !== bearer) return;
        st.pdfMsg = 'Your statement could not be downloaded just now. Please try again.'; emit();
      });
  }

  function saveMethod() {
    var p = pref(); if (!p || !st.pick || st.busy || !mine()) return;
    var bearer = st.owner;
    st.busy = true; st.msg = ''; emit();
    fetch('/api/billing/preference', { method: 'POST', headers: headers(true), cache: 'no-store', body: JSON.stringify({ Payment_Preference: st.pick }) })
      .then(answer)
      .then(function (x) {
        if (!mine() || st.owner !== bearer) return;
        st.busy = false; st.pick = null;
        if (x.r.ok && x.j && x.j.ok) {
          /* the saved method is shown at once — even if the refresh below fails, no old instructions remain */
          var now = x.j.paymentPreference, d = st.data, c = d && d.amountInPreferredCurrency;
          if (d && now && now.Payment_Preference) {
            d.paymentPreference = now; d.Payment_Preference = now.Payment_Preference;
            if (c && c.currency !== now.currency) d.amountInPreferredCurrency = null;
          }
          st.msg = 'Your payment method is changed.'; emit();
          return load();
        }
        st.msg = x.j && x.j.locked ? 'Your payment method is fixed since your first verified payment.' : 'Your payment method could not be changed just now. Please try again.';
        emit();
      }, function () {
        if (!mine() || st.owner !== bearer) return;
        st.busy = false; st.msg = 'Your payment method could not be changed just now. Please try again.'; emit();
      });
  }

  /* a failed answer does not prove nothing was written: the guest checks the waiting count before reporting again */
  var UNSURE = 'Your report could not be confirmed just now. Please reload this page in a moment: if your payment is not shown as waiting for verification, report it again.';
  function report() {
    var p = pref(), f = st.form; if (!p || !f || !f.confirm || st.busy || !mine()) return;
    var m = METHOD[p.Payment_Preference]; if (!m) return;
    var bearer = st.owner;
    st.busy = true; emit();
    fetch('/api/billing/payment/report', {
      method: 'POST', headers: headers(true), cache: 'no-store',
      body: JSON.stringify({ Method: p.Payment_Preference, Currency_Paid: m.currency, Amount_Paid: Number(f.amount), Provider_Reference: f.reference || '' })
    }).then(answer)
      .then(function (x) {
        if (!mine() || st.owner !== bearer) return;
        st.busy = false;
        if (x.r.ok && x.j && x.j.ok) {
          st.form = null;
          st.msg = 'Thank you. Your payment is reported. Guest Relations verifies it, and your balance changes once it is verified.';
          return load();
        }
        /* only a refusal (4xx) proves nothing was written; anything else — a server failure, an unreadable
           answer — may have recorded it: the confirmation is spent and the waiting count is read again */
        if (!(x.r.status >= 400 && x.r.status < 500)) { st.form = null; st.msg = UNSURE; emit(); return load(); }
        st.msg = x.j && x.j.retry
          ? 'Your payment cannot be recorded just yet. Nothing was saved. Please try again later, or tell Guest Relations.'
          : 'Your payment could not be recorded. Nothing was saved. Please check the amount and try again, or tell Guest Relations.';
        emit();
      }, function () {
        if (!mine() || st.owner !== bearer) return;
        st.busy = false; st.form = null; st.msg = UNSURE; emit(); load();
      });
  }

  window.SIYL_STATEMENT = { html: html, wire: wire, load: load, state: function () { return st.phase; } };

  document.addEventListener('siyl:signout', function () { reset(); emit(); });
  function moved() { var a = auth(); if (!a || a.bearer !== st.owner) { reset(); emit(); if (a) load(); } }
  document.addEventListener('siyl:auth', moved);
  /* signed out, or signed in as someone else, in another tab of this browser */
  if (typeof window.addEventListener === 'function') window.addEventListener('storage', function (e) { if (e && e.key === 'siyl.auth') moved(); });
})();
