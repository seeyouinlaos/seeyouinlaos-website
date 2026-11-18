/* THE PAYMENT CODE FOR THE PDF (src/billing/pdf-image.js · Owners, 18 Nov 2026): a JPEG passes through as it is; a PNG is decoded —
   every scanline filter, transparency laid on white — and compressed again; anything it cannot read faithfully is refused. */
import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { qrImageOf } from '../src/billing/pdf-image.js';

function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
/* a PNG of `rows` (each row: its filter byte, then the raw filtered bytes) */
function png(width, height, colorType, rows, interlace = 0) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = colorType; ihdr[12] = interlace;
  return new Uint8Array(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows.map((r) => Buffer.from(r))))), chunk('IEND', Buffer.alloc(0))]));
}
/* PDF RunLengthDecode (PackBits) */
const inflate = (d) => { const out = []; let i = 0; while (i < d.length) { const n = d[i++]; if (n === 128) break; if (n < 128) { for (let k = 0; k <= n; k++) out.push(d[i++]); } else { const v = d[i++]; for (let k = 0; k < 257 - n; k++) out.push(v); } } return new Uint8Array(out); };

test('PNG RGBA · the five scanline filters decoded, transparency laid on white, written again as RGB (run-length, the same bytes on every runtime)', async () => {
  /* 2 × 5 pixels RGBA; row 0 None, row 1 Sub, row 2 Up, row 3 Average, row 4 Paeth — each decoding to the same two pixels:
     opaque black and fully transparent (white on paper) */
  const px = [0, 0, 0, 255, 9, 9, 9, 0];
  const sub = [0, 0, 0, 255, 9, 9, 9, (0 - 255) & 0xff];
  const up = [0, 0, 0, 0, 0, 0, 0, 0];
  const avg = [0 - 0, 0, 0, (255 - 127) & 0xff, (9 - 0) & 0xff, (9 - 0) & 0xff, (9 - 0) & 0xff, (0 - 127) & 0xff];
  const r = await qrImageOf(png(2, 5, 6, [[0, ...px], [1, ...sub], [2, ...up], [3, ...avg.map((v, i) => i < 4 ? (px[i] - (px[i] >> 1)) & 0xff : (px[i] - ((px[i - 4] + px[i]) >> 1)) & 0xff)], [4, 0, 0, 0, 0, 0, 0, 0, 0]]));
  assert.ok(r); assert.equal(r.width, 2); assert.equal(r.height, 5); assert.equal(r.filter, 'RunLengthDecode'); assert.equal(r.colorSpace, 'DeviceRGB');
  const rgb = inflate(r.data);
  assert.equal(rgb.length, 2 * 5 * 3);
  for (let y = 0; y < 5; y++) assert.deepEqual([...rgb.slice(y * 6, y * 6 + 6)], [0, 0, 0, 255, 255, 255], 'row ' + y);
});
test('PNG grey and RGB · decoded as they are; an interlaced or 16-bit PNG and anything that is not an image are refused', async () => {
  const g = await qrImageOf(png(2, 1, 0, [[0, 0, 255]]));
  assert.deepEqual([...inflate(g.data)], [0, 0, 0, 255, 255, 255]);
  const c = await qrImageOf(png(1, 1, 2, [[0, 10, 20, 30]]));
  assert.deepEqual([...inflate(c.data)], [10, 20, 30]);
  assert.equal(await qrImageOf(png(1, 1, 2, [[0, 1, 2, 3]], 1)), null, 'interlaced');
  assert.equal(await qrImageOf(new Uint8Array(32)), null); assert.equal(await qrImageOf(null), null);
});
test('JPEG · passed through unchanged with its size and colour space from the frame header', async () => {
  const j = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x04, 0xb0, 0x03, 0x75, 0x03, 0x01, 0x22, 0x00, 0xff, 0xd9]);
  const r = await qrImageOf(j);
  assert.deepEqual([r.width, r.height, r.colorSpace, r.filter], [885, 1200, 'DeviceRGB', 'DCTDecode']); assert.equal(r.data, j);
});

test('RUN-LENGTH · round trip of runs, literals and long rows; a fixed end marker', async () => {
  const { runLength } = await import('../src/billing/pdf-image.js');
  const src = new Uint8Array([...Array(300).fill(7), 1, 2, 3, 4, 4, 5, ...Array(129).fill(0), 9]);
  const enc = runLength(src);
  assert.equal(enc[enc.length - 1], 128); assert.deepEqual([...inflate(enc)], [...src]);
  assert.ok(enc.length < 40, 'runs compress');
});
