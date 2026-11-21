#!/usr/bin/env node
/* ============================================================================
   PAYMENT RECONCILIATION · one run (HS-054 phase A · Owners HS-PROMPT-054/-055) — READ ONLY.

   The Owners say "Reconcile payments." in Claude Code. Claude reads the Drive folder "001 Financial Receipt" with the Owners'
   own Drive connector and writes what each receipt shows (statement numbers, amount, currency, date, reference, method, payer and
   payee masked to their last four digits, the file's Drive version) into a PRIVATE receipts file. This script then:
     · reads 008_Payment_Journal and 007 from Google — read only, one read each (the local service account)
     · reads the statements' state with ONE light admin/overview call (SIYL_ADMIN_INVITATION, as the pricing guard does)
     · reconciles with src/billing/payment-evidence.js (pure) against the previous private registry
     · writes ONLY the private registry (src/payment-evidence.private.json) and a private report — never Google, the ledger,
       Drive or the Worker. Nothing is confirmed, booked, edited, refunded or sent.

   Usage: SIYL_ADMIN_INVITATION=<admin invitation> node src/payment-reconcile.mjs --receipts <private receipts.json> [--no-ledger] [--report-dir <dir>]
   ========================================================================== */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const ORIGIN = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const REGISTRY = path.join(ROOT, 'src/payment-evidence.private.json');
const REPORTS = arg('report-dir', path.join(os.homedir(), 'SeeYouInLaos-PRIVATE', 'payment-reconciliation'));

const { reconcile, nextRegistry, maskDigits, STATUS } = await import(path.join(ROOT, 'src/billing/payment-evidence.js'));
const { loadPaymentJournal } = await import(path.join(ROOT, 'src/billing/source.js'));
const { batchReadRanges } = await import(path.join(ROOT, 'src/google-sheets.js'));
const { parseVendors007 } = await import(path.join(ROOT, 'src/billing/budget-source.js'));

/* a private place only: under ~/SeeYouInLaos-PRIVATE, or inside the checkout where git confirms the path is ignored */
const PRIVATE_HOME = path.join(os.homedir(), 'SeeYouInLaos-PRIVATE');
function isPrivatePath(p) {
  const abs = path.resolve(p);
  if (abs === PRIVATE_HOME || abs.startsWith(PRIVATE_HOME + path.sep)) return true;
  if (!abs.startsWith(ROOT + path.sep)) return false;
  try { execFileSync('git', ['-C', ROOT, 'check-ignore', '-q', path.relative(ROOT, abs)]); return true; } catch (e) { return false; }
}
const file = arg('receipts');
if (!file || !fs.existsSync(file)) { console.error('RECONCILE: --receipts <private receipts file> is required'); process.exit(2); }
if (!isPrivatePath(file)) { console.error('RECONCILE: the receipts file must be private (under ~/SeeYouInLaos-PRIVATE, or git-ignored)'); process.exit(2); }
if (!isPrivatePath(REPORTS)) { console.error('RECONCILE: the report directory must be private (under ~/SeeYouInLaos-PRIVATE, or git-ignored)'); process.exit(2); }
/* account numbers never travel further than this line: masked on reading, whatever the file holds */
const receipts = JSON.parse(fs.readFileSync(file, 'utf8')).map((r) => ({ ...r, payer: maskDigits(r.payer), payee: maskDigits(r.payee) }));

const env = { GOOGLE_SERVICE_ACCOUNT_JSON: fs.readFileSync(path.join(ROOT, 'src/google-service-account.private.json'), 'utf8') };
const sheet = fs.readFileSync(path.join(ROOT, 'wrangler.jsonc'), 'utf8').match(/"SHEETS_ID"\s*:\s*"([^"]+)"/)[1];
const journal = await loadPaymentJournal(env, { spreadsheetId: sheet, asOf: new Date().toISOString().slice(0, 10) }, { fresh: true });
const TAB = "'007_Deposit/Payment_Details'!A1:AZ60";
const [g007] = await batchReadRanges(env, sheet, [TAB]);
const [f007] = await batchReadRanges(env, sheet, [TAB], { render: 'FORMULA' });
const vendors = parseVendors007(g007, f007).vendors || [];

/* ONE light read of the console's own guest list — never revenue, reconcile or a holder loop (HS-032) */
let statements = null, ledgerNote = '';
if (!flag('no-ledger')) {
  try {
    const admin = String(process.env.SIYL_ADMIN_INVITATION || '').trim();
    const csv = fs.readFileSync(path.join(ROOT, 'src/invitation-tokens.private.csv'), 'utf8').split(/\r?\n/).filter(Boolean);
    const h = csv[0].split(','), row = csv.slice(1).map((l) => l.split(',')).find((c) => c[h.indexOf('invitationId')] === admin);
    if (!row) throw new Error('SIYL_ADMIN_INVITATION names no admin in the local token file');
    const { bearerOf } = await import(path.join(ROOT, 'register/crypto.mjs'));
    const r = await fetch(ORIGIN + '/api/billing/admin/overview', { headers: { 'x-siyl-auth': await bearerOf(row[h.indexOf('token')]) }, cache: 'no-store' });
    const j = await r.json();
    if (!r.ok || !j.ok) throw new Error('admin/overview answered ' + r.status);
    statements = {};
    for (const x of j.holders || []) if (x.settlement && x.settlement.Settlement_ID) statements[x.settlement.Settlement_ID] = { revision: x.settlement.issuedRevision || null, total: x.settlement.issuedTotal,
      paymentStatus: x.payment ? x.payment.status : null, balance: x.payment ? x.payment.balance : null, channel: x.method ? x.method.channel || null : null };
  } catch (e) { ledgerNote = 'the statements\' state could not be read just now (' + String(e && e.message).slice(0, 120) + ')'; }
} else ledgerNote = 'the statements\' state was not read (--no-ledger)';

const registry = fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, 'utf8')) : null;
const result = reconcile({ receipts, journal, statements, vendors, registry });
const runAt = new Date().toISOString();

/* the report — private, German headings for the Owners, the codes as the engine names them */
const money = (c, cur) => (c == null ? '—' : (c / 100).toLocaleString('en-US', { minimumFractionDigits: 2 }) + ' ' + cur);
const L = [];
L.push('# Zahlungsabgleich · ' + runAt.slice(0, 16).replace('T', ' ') + ' UTC', '', 'Nur lesend. Nichts wurde bestätigt, gebucht, geändert oder gesendet. ' + (ledgerNote || 'Statement-Stand: ein Abruf der Konsole.'), '');
L.push('**Ergebnis:** ' + Object.entries(result.counts).map(([k, n]) => n + ' × ' + k).join(' · ') + ' · neu: ' + result.newFiles.length + ' · geändert: ' + result.changedFiles.length + ' · entfernt: ' + result.removedFiles.length, '');
L.push('| Datei | Art | Statement(s) | Beleg | Status | Ledger | Abweichungen / Hinweise |', '|---|---|---|---|---|---|---|');
for (const x of result.receipts) {
  const led = x.ledger.map((l) => (l.statement ? l.statement + ' V' + (l.revision || '?') + ' ' + (l.paymentStatus || '?') + ' · 008: ' + (l.rows.map((r) => r.status + ' ' + money(r.amount, r.currency) + ' ref ' + r.reference).join(', ') || 'keine Zeile') : '007: ' + (l.supplier || 'nicht erfasst'))).join('<br>');
  const dev = x.deviations.map((d) => (d.info ? 'ℹ ' : '⚠ ') + d.code + ': ' + d.text).concat(x.notes.map((n) => '· ' + n)).join('<br>');
  L.push('| ' + [x.fileId.slice(0, 6) + '…' + x.fileId.slice(-4), x.kind, x.statements.join(', ') || '—', money(x.amount, x.currency) + ' · ' + x.date + ' · ' + (x.method || '—'), x.status, led || '—', dev || '—'].map((c) => String(c).replace(/\|/g, '/')).join(' | ') + ' |');
}
if (result.removedFiles.length) L.push('', '**Aus dem Ordner entfernt:** ' + result.removedFiles.join(', ') + ' (im Register behalten, Ledger unberührt).');
const open = result.receipts.filter((x) => x.status === STATUS.VERIFY || x.status === STATUS.NEW || x.status === STATUS.MATCHED);
L.push('', '## Für Haruthai und Suthep', '', open.length ? open.map((x) => '- ' + (x.statements.join(', ') || x.title) + ': **' + x.status + '**' + (x.status === STATUS.MATCHED ? ' — Zahlung gemeldet und belegt; im Ledger als erhalten festhalten (Verify in der Konsole oder ausdrücklicher Auftrag)' : x.status === STATUS.NEW ? ' — keine Buchung vorhanden; zuordnen (Aufnahmeweg E43 bzw. 007)' : ' — Abweichung prüfen')).join('\n') : '- nichts offen');
if (result.unassignedRows.length) L.push('', '**008-Zeilen, die keinem Beleg gehören:** ' + result.unassignedRows.length + ' (Payment_IDs im Register-Lauf).');
fs.mkdirSync(REPORTS, { recursive: true });
const out = path.join(REPORTS, 'reconciliation-' + runAt.slice(0, 19).replace(/[:T]/g, '-') + '.md');
fs.writeFileSync(out, L.join('\n') + '\n');
/* the report first, then the registry — atomically, so a failed run never loses its "new / changed" signal */
const tmp = path.join(ROOT, 'src/payment-evidence.tmp.private.json');
fs.writeFileSync(tmp, JSON.stringify(nextRegistry(registry, result, runAt), null, 1));
fs.renameSync(tmp, REGISTRY);
console.log('RECONCILE: ' + result.receipts.length + ' receipts · ' + Object.entries(result.counts).map(([k, n]) => k + ' ' + n).join(' · ') + ' · new ' + result.newFiles.length + ' · changed ' + result.changedFiles.length + ' · removed ' + result.removedFiles.length + (ledgerNote ? ' · ' + ledgerNote : ''));
console.log('RECONCILE: report ' + out + ' · registry src/payment-evidence.private.json (private) · nothing written anywhere else');
