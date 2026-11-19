/* HS-004.9 · the statement's product names are the website's own, generated into a server-side module — in sync, complete, printable */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_WORDS } from '../src/billing/product-words.js';
import { productWords, moduleText } from '../src/build-product-words.mjs';
import { isPrintable } from '../src/billing/pdf.js';
import fs from 'node:fs';

test('PRODUCT WORDS · generated from the website catalogue and in sync; every name printable; never a technical key', () => {
  assert.deepEqual(PRODUCT_WORDS, productWords(), 'regenerate with node src/build-product-words.mjs');
  assert.equal(fs.readFileSync(new URL('../src/billing/product-words.js', import.meta.url), 'utf8'), moduleText(productWords()));
  for (const [k, w] of Object.entries(PRODUCT_WORDS)) {
    assert.ok(w.name && w.detail, k);
    assert.ok(isPrintable(w.name) && isPrintable(w.detail), k + ' printable');
    assert.doesNotMatch(w.name, /\b[A-Z]\d?-[A-Z]{3,}/, k + ': no product key in the name');
  }
  assert.equal(PRODUCT_WORDS['bkk-stay/u-sathorn-superior-garden'].name, 'U Sathorn Bangkok · Superior Room With Garden View');
  assert.equal(PRODUCT_WORDS.sangkhathan.name, 'Sangkhathan Temple Offering');
});
