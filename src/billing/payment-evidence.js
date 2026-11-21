/* ============================================================================
   PAYMENT EVIDENCE · the reconciliation of the Owners' payment receipts (HS-054 phase A · Owners HS-PROMPT-054/-055, 21 Nov 2026)

   Pure: no I/O, no clock, no network, no write. It takes what a run has read —
     · receipts   the receipts of the Drive folder "001 Financial Receipt", their fields as read from each file (kind, statement
                  numbers, amount, currency, date, reference, method, payer/payee masked) and the file's Drive version
     · journal    008_Payment_Journal as it stands (the guests' payments: REPORTED / VERIFIED / REJECTED)
     · statements the console's own statement state per Settlement_ID (issued revision, total, payment status, channel), or null
     · vendors    007 as parseVendors007 reads it (the suppliers' payments)
     · registry   the previous run's private registry
   and returns, per receipt, what it is, which 008 rows (or which 007 payment) are ITS OWN, what differs, and one status:
     New evidence · Matched · Already recorded · Needs verification · Rejected

   EVERY 008 ROW BELONGS TO AT MOST ONE RECEIPT (review F1/F2): by its reference (equal, contained, cut short), by the mutual swap
   of two receipts' references, or — a row without reference — only where exactly one receipt of its statement can take it. A
   receipt is compared with its own rows only. A row nobody can take, a reference used twice, a statement already paid without this
   receipt's row: a contradiction ("Needs verification") — the Owners' rule of 21 Nov 2026 makes every receipt authorised evidence,
   it never makes a contradiction disappear. Nothing here confirms, books, edits or sends; no exchange rate is used.
   ========================================================================== */

export const PAYMENT_EVIDENCE_VERSION = 'payment-evidence/1.1.0';
export const STATUS = Object.freeze({ NEW: 'New evidence', MATCHED: 'Matched', RECORDED: 'Already recorded', VERIFY: 'Needs verification', REJECTED: 'Rejected' });
const CHANNEL_CURRENCY = Object.freeze({ PROMPTPAY_THB: 'THB', PAYPAL_EUR: 'EUR', SEPA_EUR: 'EUR' });
const MIN_REF = 6;

const arr = (v) => (Array.isArray(v) ? v : []);
const clean = (v) => String(v == null ? '' : v).trim();
const own = (o, k) => (o != null && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
const cents = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : Number(clean(v).replace(/,/g, '')); return Number.isFinite(n) ? Math.round(n * 100) : null; };
export const normRef = (v) => clean(v).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
/* an account number is never shown whole: every run of six or more digits keeps its last four */
export const maskDigits = (v) => clean(v).replace(/\d[\d\s-]{4,}\d/g, (m) => { const d = m.replace(/\D/g, ''); return d.length >= 6 ? '…' + d.slice(-4) : m; });
const STMT = /\bH[SA][-_ ]?(\d{4})[-_ ]?(\d{4})\b/gi;
const STMT_ID = /^HS-\d{4}-\d{4}$/;
const isoDay = (v) => (/^\d{4}-\d{2}-\d{2}/.test(clean(v)) ? clean(v).slice(0, 10) : null);
const dayDiff = (a, b) => (a && b ? Math.round((Date.parse(a + 'T00:00:00Z') - Date.parse(b + 'T00:00:00Z')) / 86400000) : null);

/* the statement numbers a text names — a mistyped prefix (HA-, HS_) is read, and marked */
export function statementsIn(text) {
  const out = [], typo = [];
  for (const m of clean(text).matchAll(STMT)) { const id = 'HS-' + m[1] + '-' + m[2]; if (!out.includes(id)) out.push(id); if (!/^HS-\d{4}-\d{4}$/.test(m[0].toUpperCase()) && !typo.includes(id)) typo.push(id); }
  return { ids: out.sort(), typo: typo.sort() };
}
/* what a receipt is — the reader's word, checked: a guest payment names statements; a supplier payment is the Owners' own payment
   to someone else (never an internal transfer, never with a statement number) */
export function kindOf(r) {
  const k = clean(r.kind).toUpperCase(), st = arr(r.statements);
  if (k === 'GUEST') return st.length ? 'GUEST' : 'UNKNOWN';
  if (k === 'SUPPLIER') return !st.length && !r.internal ? 'SUPPLIER' : 'UNKNOWN';
  if (st.length) return 'GUEST';
  if (!r.internal && r.payerIsOwner && /\bdeposit\b|\bsupplier\b|\bvendor\b/i.test(clean(r.title) + ' ' + clean(r.memo))) return 'SUPPLIER';
  return 'UNKNOWN';
}
/* the key one transaction has, whatever file it arrives in — without a reference: amount, currency, date and time, statements */
export const dedupeKey = (r) => (normRef(r.reference).length >= MIN_REF
  ? ['REF', normRef(r.reference), cents(r.amount), clean(r.currency).toUpperCase()].join('|')
  : ['NOREF', cents(r.amount), clean(r.currency).toUpperCase(), clean(r.date), arr(r.statements).slice().sort().join(',')].join('|'));
const refMatches = (rowRef, ref) => { const a = normRef(rowRef), b = normRef(ref); return b.length >= MIN_REF && !!a && (a === b || a.includes(b)); };
const refTruncated = (rowRef, ref) => { const a = normRef(rowRef), b = normRef(ref); return b.length > MIN_REF && !!a && !a.includes(b) && a.includes(b.slice(0, -1)); };
const isPayment = (x) => !clean(x.Entry_Type) || clean(x.Entry_Type).toUpperCase() === 'PAYMENT';
const versionOf = (r) => (clean(r.md5) ? 'md5:' + clean(r.md5) : clean(r.size) && clean(r.modifiedTime) ? clean(r.size) + '|' + clean(r.modifiedTime) : '');

export function reconcile(input) {
  const I = input || {};
  const receipts = arr(I.receipts).slice().sort((a, b) => (clean(a.fileId) < clean(b.fileId) ? -1 : clean(a.fileId) > clean(b.fileId) ? 1 : 0));
  const vendors = arr(I.vendors), registry = (I.registry && I.registry.files) || {};
  const statementsRead = I.statements != null, statements = I.statements || {};
  const rows = arr(I.journal).filter((x) => clean(x.Settlement_ID)).map((x, i) => ({ x, i, s: clean(x.Settlement_ID), owner: null, how: null }));
  const R = receipts.map((r) => ({ r, kind: kindOf(r), deviations: [], notes: [], rows: [] }));
  const dev = (e, code, text, info) => e.deviations.push(info ? { code, text, info: true } : { code, text });
  const guests = R.filter((e) => e.kind === 'GUEST');

  /* ---- 1 · every 008 row to at most one receipt ---- */
  for (const w of rows) {
    const cands = guests.filter((e) => arr(e.r.statements).includes(w.s));
    const byRef = cands.filter((e) => refMatches(w.x.Provider_Reference, e.r.reference) || refTruncated(w.x.Provider_Reference, e.r.reference));
    if (byRef.length === 1) { w.owner = byRef[0]; w.how = refMatches(w.x.Provider_Reference, byRef[0].r.reference) ? 'MATCH' : 'TRUNCATED'; continue; }
    if (byRef.length > 1) { w.how = 'AMBIGUOUS'; for (const e of byRef) dev(e, 'ROW_CLAIMED_TWICE', w.s + ': one 008 row fits more than one receipt'); continue; }
    /* the row carries another receipt's reference: a mutual swap of two receipts' references is noted (E42) — anything else is a
       reference used twice */
    const other = guests.find((e) => !arr(e.r.statements).includes(w.s) && refMatches(w.x.Provider_Reference, e.r.reference));
    if (other) {
      const mine = cands.length === 1 ? cands[0] : null;
      const back = mine && rows.some((v) => v !== w && arr(other.r.statements).includes(v.s) && refMatches(v.x.Provider_Reference, mine.r.reference));
      if (mine && back) { w.owner = mine; w.how = 'SWAPPED'; }
      else { w.how = 'FOREIGN_REFERENCE'; dev(other, 'REFERENCE_USED_ELSEWHERE', 'its reference is on the row of ' + w.s); }
      continue;
    }
    if (normRef(w.x.Provider_Reference)) { w.how = 'DIFFERENT_REFERENCE'; continue; }
    /* a row without reference: only where exactly one receipt of its statement can take it (and its amount fits, if several could) */
    const free = cands.filter((e) => !rows.some((v) => v.owner === e && v.s === w.s));
    const fit = free.filter((e) => cents(e.r.amount) === cents(w.x.Amount_Paid) && clean(e.r.currency).toUpperCase() === clean(w.x.Currency_Paid).toUpperCase());
    if (free.length === 1) { w.owner = free[0]; w.how = 'ONLY_RECEIPT'; }
    else if (fit.length === 1) { w.owner = fit[0]; w.how = 'AMOUNT'; }
    else w.how = 'UNASSIGNED';
  }
  for (const w of rows) if (w.owner) w.owner.rows.push(w);

  /* ---- 2 · each receipt on its own ---- */
  const keyCount = new Map(); for (const e of R) { const k = dedupeKey(e.r); keyCount.set(k, (keyCount.get(k) || 0) + 1); }
  const out = [];
  for (const e of R) {
    const r = e.r, amount = cents(r.amount), currency = clean(r.currency).toUpperCase(), date = clean(r.date);
    const prev = own(registry, clean(r.fileId)) || null, version = versionOf(r);
    const fileState = !prev ? 'NEW_FILE' : prev.version !== version ? 'CHANGED_FILE' : 'KNOWN';
    if (!version) dev(e, 'NO_FILE_VERSION', 'the file\'s Drive version (size + modified time, or checksum) is missing — a change could not be noticed');
    if (fileState === 'CHANGED_FILE') dev(e, 'FILE_CHANGED', 'the file changed since the last run — its earlier result is reopened');
    if (keyCount.get(dedupeKey(r)) > 1) dev(e, 'DUPLICATE_FILE', 'the same transaction is in more than one file');
    if (amount == null || !/^[A-Z]{3}$/.test(currency) || !isoDay(date)) dev(e, 'UNREADABLE', 'amount, currency or date not reliably readable');
    const badIds = arr(r.statements).filter((s) => !STMT_ID.test(clean(s)));
    if (badIds.length) dev(e, 'UNREADABLE', 'statement number not in the form HS-yyyy-nnnn: ' + badIds.join(', '));
    if (arr(r.statementTypos).length) e.notes.push('statement number written differently on the receipt (' + r.statementTypos.join(', ') + ') — corroborated by amount and reference');
    if (r.internal) e.notes.push('internal transfer between the Owners\' own accounts — accepted (Owners, 21 Nov 2026)');
    if (r.thirdParty) e.notes.push('paid by someone other than the guest — accepted with the receipt (Owners, 21 Nov 2026)');
    let status = STATUS.VERIFY;
    const ledger = [];
    if (e.kind === 'GUEST') {
      for (const s of arr(r.statements)) {
        const st = statementsRead ? own(statements, s) || null : null;
        const all = rows.filter((w) => w.s === s), mine = e.rows.filter((w) => w.s === s);
        ledger.push({ statement: s, revision: st ? st.revision : null, total: st ? st.total : null, paymentStatus: st ? st.paymentStatus : null, balance: st ? st.balance : null,
          rows: mine.map((w) => ({ paymentId: clean(w.x.Payment_ID), status: clean(w.x.Record_Status), type: clean(w.x.Entry_Type) || 'PAYMENT', revisionRef: clean(w.x.Revision_Ref),
            amount: cents(w.x.Amount_Paid), currency: clean(w.x.Currency_Paid).toUpperCase(), reference: w.how })), otherRows: all.length - mine.length });
        if (statementsRead) {
          if (!st) dev(e, 'STATEMENT_UNKNOWN', s + ' is not a statement in the console');
          else if (!st.revision) dev(e, 'STATEMENT_NOT_ISSUED', s + ' has no issued revision');
          else {
            const cc = own(CHANNEL_CURRENCY, clean(st.channel));
            if (cc && currency && cc !== currency) dev(e, 'CURRENCY_NOT_THE_STATEMENTS', s + ' is paid in ' + cc + ' (' + clean(st.channel) + '), the receipt is in ' + currency);
            if (!mine.length && st.paymentStatus === 'PAID') dev(e, 'STATEMENT_ALREADY_PAID', s + ' is already PAID without this receipt\'s row — recording it would pay twice');
            if (st.paymentStatus === 'OVERPAID') dev(e, 'STATEMENT_OVERPAID', s + ' is OVERPAID in the ledger');
          }
        }
        if (!mine.length && all.some((w) => w.how === 'DIFFERENT_REFERENCE')) dev(e, 'ROW_REFERENCE_DIFFERS', s + ': the 008 row carries a different reference than the receipt');
        if (!mine.length && all.some((w) => w.how === 'UNASSIGNED')) dev(e, 'ROW_UNASSIGNED', s + ': a 008 row without reference cannot be given to one receipt');
        for (const w of mine) {
          if (w.how === 'TRUNCATED') dev(e, 'REFERENCE_TRUNCATED', s + ': the reference in 008 lacks its last character(s) — noted only, 008 stays as it is (E42)', true);
          if (w.how === 'SWAPPED') dev(e, 'REFERENCE_SWAPPED', s + ': the 008 references of this receipt and its partner are swapped — noted only, 008 stays as it is (E42)', true);
          if (!isPayment(w.x)) e.notes.push(s + ': a ' + clean(w.x.Entry_Type) + ' row is not a payment — shown, never added to the receipt');
          if (!/^(REPORTED|VERIFIED|REJECTED)$/.test(clean(w.x.Record_Status))) dev(e, 'ROW_STATUS_UNKNOWN', s + ': 008 status "' + clean(w.x.Record_Status) + '"');
          if (clean(w.x.Currency_Paid).toUpperCase() && currency && clean(w.x.Currency_Paid).toUpperCase() !== currency) dev(e, 'CURRENCY_DIFFERS', s + ': 008 ' + clean(w.x.Currency_Paid) + ', receipt ' + currency);
          if (st && st.revision && clean(w.x.Revision_Ref) && clean(w.x.Revision_Ref) !== 'V' + st.revision) {
            if (st.paymentStatus === 'PAID') e.notes.push(s + ': recorded against ' + clean(w.x.Revision_Ref) + ', the current revision is V' + st.revision + ' — counted, status PAID');
            else dev(e, 'REVISION_DIFFERS', s + ': recorded against ' + clean(w.x.Revision_Ref) + ', the current revision is V' + st.revision + ' and the statement is ' + (st.paymentStatus || 'not paid'));
          }
        }
      }
      const pay = e.rows.filter((w) => isPayment(w.x)), live = pay.filter((w) => clean(w.x.Record_Status) !== 'REJECTED');
      const sum = live.reduce((n, w) => n + (cents(w.x.Amount_Paid) || 0), 0);
      if (!pay.length) status = e.deviations.some((d) => !d.info) ? STATUS.VERIFY : STATUS.NEW;
      else if (!live.length) { status = STATUS.REJECTED; dev(e, 'REJECTED_IN_LEDGER', 'the receipt\'s 008 rows are REJECTED — an authorised receipt against a rejected entry'); }
      else if (amount != null && sum !== amount) { dev(e, 'AMOUNT_DIFFERS', 'its 008 rows ' + (sum / 100).toFixed(2) + ' against the receipt ' + (amount / 100).toFixed(2) + ' ' + currency + (sum > amount ? ' — more than the receipt pays' : '')); }
      else if (live.every((w) => clean(w.x.Record_Status) === 'VERIFIED')) status = STATUS.RECORDED;
      else status = STATUS.MATCHED;
      if (!statementsRead) e.notes.push('the statements\' state was not read this run');
    } else if (e.kind === 'SUPPLIER') {
      const exact = [], near = [];
      for (const v of vendors) for (const p of arr(v.payments)) {
        if (cents(p.amount) !== amount) continue;
        const pc = clean(p.currency).toUpperCase(), dd = dayDiff(isoDay(p.date), isoDay(date));
        const hit = { vendor: clean(v.vendor), cell: clean(p.cell), method: clean(p.method), currency: pc, days: dd };
        if (pc === currency && dd === 0) exact.push(hit); else if ((!pc || pc === currency) && dd != null && Math.abs(dd) <= 3) near.push(hit);
      }
      ledger.push({ supplier: (exact.length ? exact : near).map((h) => h.vendor + ' (' + h.cell + ')').join(', ') || null });
      if (exact.length === 1 && !near.length) {
        status = STATUS.RECORDED;
        const m = exact[0].method.toLowerCase().split(/\s+/)[0];
        if (r.method && m && clean(r.method).toLowerCase().indexOf(m) < 0) dev(e, 'METHOD_DIFFERS', '007 says "' + exact[0].method + '", the receipt shows ' + clean(r.method), true);
      } else if (exact.length + near.length) {
        dev(e, exact.length > 1 ? 'SUPPLIER_AMBIGUOUS' : 'SUPPLIER_NEAR_MATCH', exact.length > 1 ? 'more than one 007 payment matches' : 'a 007 payment of this amount differs in date or states no currency — check before entering it again');
      } else status = STATUS.NEW;
    } else dev(e, 'KIND_UNKNOWN', 'neither a guest payment with statement numbers nor a supplier payment of the Owners');
    /* a contradiction keeps the receipt for the Owners, whatever the ledger says */
    if (e.deviations.some((d) => !d.info && d.code !== 'FILE_CHANGED')) status = STATUS.VERIFY;
    out.push({ fileId: clean(r.fileId), title: clean(r.title), kind: e.kind, statements: arr(r.statements), amount, currency, date: isoDay(date), method: clean(r.method),
      payer: maskDigits(r.payer), payee: maskDigits(r.payee), status, fileState, ledger, deviations: e.deviations, notes: e.notes, version });
  }
  const seen = new Set(out.map((x) => x.fileId));
  /* a file that left the folder is reported once — the registry keeps it, marked removed */
  const removed = Object.keys(registry).filter((id) => !seen.has(id) && !(registry[id] && registry[id].removed)).sort();
  const counts = {}; for (const x of out) counts[x.status] = (counts[x.status] || 0) + 1;
  const unassignedRows = rows.filter((w) => !w.owner && guests.some((e) => arr(e.r.statements).includes(w.s))).map((w) => clean(w.x.Payment_ID)).sort();
  return { version: PAYMENT_EVIDENCE_VERSION, receipts: out, removedFiles: removed, counts, unassignedRows,
    newFiles: out.filter((x) => x.fileState === 'NEW_FILE').map((x) => x.fileId), changedFiles: out.filter((x) => x.fileState === 'CHANGED_FILE').map((x) => x.fileId) };
}

/* the next registry: what this run saw, per file — a changed file keeps its earlier values in its history; a removed file is
   kept, marked removed; nothing is ever deleted */
export function nextRegistry(prev, result, runAt) {
  const files = Object.assign({}, (prev && prev.files) || {});
  for (const x of result.receipts) {
    const before = own(files, x.fileId);
    const now = { title: x.title, version: x.version, kind: x.kind, statements: x.statements, amount: x.amount, currency: x.currency, date: x.date, status: x.status, deviations: x.deviations.map((d) => d.code) };
    const history = arr(before && before.history).slice();
    if (before && before.version !== x.version) history.push({ until: runAt, version: before.version, amount: before.amount, currency: before.currency, status: before.status, statements: before.statements });
    files[x.fileId] = Object.assign(now, { firstSeen: (before && before.firstSeen) || runAt, lastSeen: runAt }, history.length ? { history } : {});
  }
  for (const id of result.removedFiles) files[id] = Object.assign({}, files[id], { removed: true, removedAt: runAt });
  const runs = arr(prev && prev.runs).concat([{ at: runAt, receipts: result.receipts.length, counts: result.counts, newFiles: result.newFiles.length, changedFiles: result.changedFiles.length, removedFiles: result.removedFiles.length }]).slice(-200);
  return { version: PAYMENT_EVIDENCE_VERSION, files, runs };
}
