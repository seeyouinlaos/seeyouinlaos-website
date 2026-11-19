/* ============================================================================
   STATEMENT PDF LAYOUT 1.3 — THE APPROVED "see you in laos." LOGO (Owners, 19 Nov 2026). Synthetic statements only.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { renderSettlementPdf, PDF_WRITER_VERSION } from '../src/billing/pdf.js';
import { BRAND_LOGO, BRAND_PAPER_RGB, BRAND_SOURCE } from '../src/billing/pdf-brand.js';
import { runLength } from '../src/billing/pdf-image.js';

const raw = (b) => Buffer.from(b).toString('latin1');
const L = (o) => ({ Billing_Category: 'GUEST_SETTLEMENT_REQUIRED', rateSource: 'STANDARD', quantity: 1, modifiers: [], block: 'A', ...o });
const SNAP = { Settlement_ID: 'S-BRAND-0001', Revision: 1, Holder_ID: 'INV-T1', Issue_Date: '2026-11-19', Due_Date: '2026-12-10', FX_USD_THB: 33.68, FX_USD_EUR: 0.89,
  Currency: 'USD', Engine_Version: 'billing-engine/test', Source_Hash: 'f'.repeat(64), Payment_Preference: 'PAYPAL_EUR',
  lines: [L({ Person_ID: 'GT1', Item_ID: 'TEMPLE-OFFERING', Rate_Basis: 'PER_PERSON', rateCents: 1500, nights: 1, amountCents: 1500 })],
  Block_A_Total_Cents: 1500, Total_Payable_Cents: 1500, Block_B_Informational: [] };
const LOGO_DATA_SHA16 = '4106e7b43d856181';   /* the logo's embedded bytes as released with layout 1.3 */
const pagesOf = (b) => [...raw(b).matchAll(/<< \/Length \d+ >>\nstream\n([\s\S]*?)\nendstream/g)].map((m) => m[1]);

test('BRAND · the logo is the approved original\'s own pixels — the asset unchanged since the module was built, nothing redrawn', () => {
  const png = fs.readFileSync(new URL('../' + BRAND_SOURCE.path, import.meta.url));
  assert.equal(crypto.createHash('sha256').update(png).digest('hex'), BRAND_SOURCE.sha256, 'the approved file is the one the PDF logo was built from');
  const rgb = zlib.inflateSync(Buffer.from(BRAND_LOGO.data));
  assert.equal(rgb.length, BRAND_LOGO.width * BRAND_LOGO.height * 3);
  assert.equal(crypto.createHash('sha256').update(rgb).digest('hex'), BRAND_SOURCE.pixelSha256);
  /* the PNG decoded independently here: the same pixels */
  let o = 8; const idat = []; while (o + 8 <= png.length) { const n = png.readUInt32BE(o), k = png.toString('latin1', o + 4, o + 8); if (k === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + n)); o += 12 + n; }
  const r = zlib.inflateSync(Buffer.concat(idat)), W = BRAND_LOGO.width, st = W * 4; let prev = Buffer.alloc(st); const px = Buffer.alloc(W * BRAND_LOGO.height * 4);
  const pa = (a, b, c) => { const p = a + b - c, x = Math.abs(p - a), y = Math.abs(p - b), z = Math.abs(p - c); return x <= y && x <= z ? a : y <= z ? b : c; };
  for (let y = 0; y < BRAND_LOGO.height; y++) { const f = r[y * (st + 1)], row = r.subarray(y * (st + 1) + 1, (y + 1) * (st + 1)), cur = px.subarray(y * st, (y + 1) * st);
    for (let x = 0; x < st; x++) { const a = x >= 4 ? cur[x - 4] : 0, b = prev[x], c = x >= 4 ? prev[x - 4] : 0; cur[x] = (row[x] + [0, a, b, (a + b) >> 1, pa(a, b, c)][f]) & 255; } prev = cur; }
  for (let i = 0; i < W * BRAND_LOGO.height; i += 997) for (let k = 0; k < 3; k++) assert.equal(rgb[i * 3 + k], px[i * 4 + k]);
  assert.deepEqual([...BRAND_PAPER_RGB], [px[0], px[1], px[2]], 'the band is the logo\'s own paper colour');
  /* every pixel of the logo's border is that paper, opaque — so the band meets the image without a seam */
  const H = BRAND_LOGO.height; let border = 0;
  for (let x = 0; x < W; x++) for (const y of [0, H - 1]) { const i = (y * W + x) * 4; assert.deepEqual([px[i], px[i + 1], px[i + 2], px[i + 3]], [...BRAND_PAPER_RGB, 255]); border++; }
  for (let y = 0; y < H; y++) for (const x of [0, W - 1]) { const i = (y * W + x) * 4; assert.deepEqual([px[i], px[i + 1], px[i + 2], px[i + 3]], [...BRAND_PAPER_RGB, 255]); border++; }
  assert.equal(border, 2 * W + 2 * H);
  /* the embedded bytes are pinned: regenerating them (another zlib) is a new layout, never a silent change of an original's bytes */
  assert.equal(crypto.createHash('sha256').update(Buffer.from(BRAND_LOGO.data)).digest('hex').slice(0, 16), LOGO_DATA_SHA16);
  /* the red final period is in it */
  let red = 0; for (let i = 0; i < rgb.length; i += 3) if (rgb[i] > 110 && rgb[i] - rgb[i + 1] > 50 && rgb[i] - rgb[i + 2] > 50) red++;
  assert.ok(red > 20, 'the red dot');
});

test('BRAND · layout 1.3: the first page opens on the band — the logo once, the couple\'s names unbroken — further pages keep their "continued" line; the same statement gives the same bytes', () => {
  assert.equal(PDF_WRITER_VERSION, 'guest-settlement-pdf/1.3');
  const many = { ...SNAP, lines: Array.from({ length: 30 }, (_, i) => L({ Person_ID: 'GT1', Item_ID: 'X' + i + '-ITEM', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 1000, nights: 2, payableNights: 2, amountCents: 2000 })),
    Block_A_Total_Cents: 60000, Total_Payable_Cents: 60000 };
  const a = renderSettlementPdf(many, {}), b = renderSettlementPdf(many, {});
  assert.deepEqual(a, b, 'deterministic');
  const r = raw(a), pages = pagesOf(a);
  assert.ok(pages.length >= 2);
  assert.match(pages[0], /^q 0\.9490 0\.9255 0\.8824 rg 0 749\.89 595\.28 92 re f Q\nq 595\.28 0 0 92 0 749\.89 cm \/Im1 Do Q\n/, 'the band first, edge to edge: its colour, then its pixel');
  assert.match(r, /\/Subtype \/Image \/Width 1 \/Height 1 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/RunLengthDecode \/Length 5 >>\nstream\n\x02\xf2\xec\xe1\x80\nendstream/, 'one pixel of the logo\'s paper');
  assert.match(pages[0], /\/Im2 Do Q/, 'the logo'); assert.match(pages[0], /\(Haruthai & Suthep\) Tj/); assert.match(pages[0], /\(Wedding \\267 Vientiane \\267 28 February 2027\) Tj/);
  for (const p of pages.slice(1)) { assert.doesNotMatch(p, /Do Q/); assert.ok(p.includes('\\(continued\\)) Tj'), 'the continued line'); }
  assert.equal((r.match(/\/Subtype \/Image /g) || []).length, 2, 'one band and one logo object, however many pages');
  assert.match(r, /\/Subtype \/Image \/Width 560 \/Height 130 \/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode/);
  assert.equal((r.match(/\/XObject <</g) || []).length, 1, 'only the first page names the logo in its resources');
  /* the masthead and the statement below the band unchanged in wording */
  for (const s of ['Guest Settlement', 'S-BRAND-0001 \\267 Revision V1', 'Payable to Haruthai & Suthep']) assert.ok(pages[0].includes('(' + s + ') Tj'), s);
  assert.ok(pages.join('\n').includes('(Total payable to Haruthai & Suthep) Tj'));
  /* every payment variant carries the same band */
  for (const payment of [{ method: 'PAYPAL_EUR', amount: { currency: 'EUR', amount: 13.35 }, recipient: 'Suthep', reference: 'S-BRAND-0001' },
    { method: 'PROMPTPAY_THB', amount: { currency: 'THB', amount: 505.2 }, recipient: 'Haruthai', reference: 'S-BRAND-0001' },
    { method: 'SEPA_EUR', amount: { currency: 'EUR', amount: 13.35 }, recipient: 'Sample', iban: 'DE00000000000000000000', reference: 'S-BRAND-0001' }, { nothingDue: true }]) {
    const p0 = pagesOf(renderSettlementPdf(SNAP, { payment }))[0];
    assert.ok(/^q 0\.9490 0\.9255 0\.8824 rg [^\n]+ re f Q\nq 595\.28 0 0 92 0 749\.89 cm \/Im1 Do Q\n/.test(p0) && /\/Im2 Do Q/.test(p0), JSON.stringify(payment).slice(0, 40));
  }
});

test('RUN LENGTH · the worst case of PackBits (single bytes between pairs) fits; a flat payment code gives the very bytes it gave before', () => {
  const alt = new Uint8Array(3000); for (let i = 0; i < alt.length; i++) alt[i] = i % 3 === 0 ? i & 255 : 7;   /* A B B C D D … */
  const enc = runLength(alt);
  /* decode PackBits and compare */
  const dec = []; for (let i = 0; i < enc.length;) { const n = enc[i++]; if (n === 128) break; if (n < 128) { for (let k = 0; k <= n; k++) dec.push(enc[i++]); } else { const v = enc[i++]; for (let k = 0; k < 257 - n; k++) dec.push(v); } }
  assert.deepEqual(Uint8Array.from(dec), alt);
  /* the encoder as it was before 1.3 (its smaller buffer the only difference): every input it could encode gives the same bytes */
  function before(src) {
    const out = new Uint8Array(src.length + Math.ceil(src.length / 128) + 2); let o = 0, i = 0;
    const push = (...v) => { for (const x of v) out[o++] = x; };
    while (i < src.length) {
      let run = 1; while (i + run < src.length && run < 128 && src[i + run] === src[i]) run++;
      if (run >= 2) { push(257 - run, src[i]); i += run; continue; }
      const start = i; let lit = 0;
      while (i < src.length && lit < 128 && !(i + 1 < src.length && src[i + 1] === src[i])) { i++; lit++; }
      if (!lit) { i++; lit = 1; }
      out[o++] = lit - 1; out.set(src.subarray(start, start + lit), o); o += lit;
    }
    out[o++] = 128;
    return out.slice(0, o);
  }
  const flat = new Uint8Array(6000).fill(255); flat.fill(0, 1000, 3000); for (let i = 4000; i < 4100; i++) flat[i] = (i * 37) & 255;
  assert.deepEqual(runLength(flat), before(flat), 'a payment code: the very bytes it gave before');
});

test('BRAND · page 1 is shorter by the band: for every payment method and 1 – 40 lines, the payment section and its code stay on one page, nothing enters the footer, every page is numbered', () => {
  const img = { width: 4, height: 6, colorSpace: 'DeviceRGB', filter: 'FlateDecode', data: new Uint8Array(zlib.deflateSync(Buffer.alloc(72, 9))) };
  const pays = [{ method: 'PAYPAL_EUR', amount: { currency: 'EUR', amount: 13.35 }, recipient: 'Suthep', reference: 'S-BRAND-0001', qr: img },
    { method: 'PROMPTPAY_THB', amount: { currency: 'THB', amount: 505.2 }, recipient: 'Haruthai', reference: 'S-BRAND-0001', qr: { ...img, height: 8 } },
    { method: 'SEPA_EUR', amount: { currency: 'EUR', amount: 13.35 }, recipient: 'Sample', iban: 'DE00000000000000000000', reference: 'S-BRAND-0001' }];
  for (const payment of pays) for (let n = 1; n <= 40; n++) {
    const s = { ...SNAP, lines: Array.from({ length: n }, (_, i) => L({ Person_ID: 'GT1', Item_ID: 'X' + i + '-ITEM', Rate_Basis: 'PER_PERSON_PER_NIGHT', rateCents: 1000, nights: 2, payableNights: 2, amountCents: 2000 })),
      Block_A_Total_Cents: 2000 * n, Total_Payable_Cents: 2000 * n, Payment_Preference: payment.method };
    const pages = pagesOf(renderSettlementPdf(s, { payment }));
    const at = pages.findIndex((p) => p.includes('(How to pay) Tj'));
    assert.ok(at >= 0, payment.method + ' ' + n + ': the payment section');
    if (payment.qr) assert.ok(pages[at].includes('/Im3 Do Q'), payment.method + ' ' + n + ': the code on the page of its section');
    else assert.ok(pages[at].includes('(IBAN) Tj'), n + ': the account on the page of its section');
    pages.forEach((p, i) => {
      assert.ok(p.includes('(page ' + (i + 1) + ' of ' + pages.length + ') Tj'), payment.method + ' ' + n + ': page ' + (i + 1));
      for (const m of p.matchAll(/BT \/F\d ([\d.]+) Tf 1 0 0 1 [\d.]+ ([\d.]+) Tm/g)) { const y = +m[2], size = +m[1]; if (y > 78) assert.ok(y - 0.23 * size >= 90, payment.method + ' ' + n + ' page ' + (i + 1) + ': text in the footer band'); }
    });
  }
});
