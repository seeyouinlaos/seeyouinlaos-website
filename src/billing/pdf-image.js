/* ============================================================================
   SEE YOU IN LAOS — THE PAYMENT CODE, AS THE STATEMENT PDF EMBEDS IT (Owners, 18 Nov 2026).

   The Owners' decision: every statement PDF produced from now on carries the complete payment section, the approved payment code
   (QR) included — the very image the guest's statement page shows (R2 billing/qr/…), never a code generated here.

   This turns that image into what the hand-written PDF writer (src/billing/pdf.js) can place: a JPEG is passed through as it is
   (/DCTDecode); a PNG (8-bit, not interlaced: grey, RGB, grey + alpha, RGBA) is decoded, its transparency laid on white, and
   written again run-length encoded (/RunLengthDecode). Anything else is refused (null) — the PDF then says the code is in My Profile, it never draws
   a code it could not read faithfully. No dependency: the platform's DecompressionStream reads the PNG; the RGB is written
   run-length encoded by hand (/RunLengthDecode), so the same code always gives the same bytes on every runtime.
   ========================================================================== */

async function inflate(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
/* PackBits / PDF RunLengthDecode — written here, so the same image always gives the same bytes on every runtime */
export function runLength(src) {
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

function jpegInfo(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    if (b[i + 1] === 0xff) { i++; continue; }   /* fill bytes */
    const m = b[i + 1];
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    /* SOF0 (baseline) · SOF1 · SOF2 (progressive): height, width, components */
    if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
      const height = (b[i + 5] << 8) | b[i + 6], width = (b[i + 7] << 8) | b[i + 8], comps = b[i + 9];
      if (!width || !height || (comps !== 1 && comps !== 3)) return null;
      return { width, height, colorSpace: comps === 1 ? 'DeviceGray' : 'DeviceRGB' };
    }
    i += 2 + len;
  }
  return null;
}

const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

async function pngToRgb(b) {
  const u32 = (o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  let o = 8, width = 0, height = 0, depth = 0, type = -1, interlace = 0;
  const idat = [];
  while (o + 8 <= b.length) {
    const len = u32(o), kind = String.fromCharCode(b[o + 4], b[o + 5], b[o + 6], b[o + 7]), data = b.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') { width = u32(o + 8); height = u32(o + 12); depth = b[o + 16]; type = b[o + 17]; interlace = b[o + 20]; }
    else if (kind === 'IDAT') idat.push(data);
    else if (kind === 'IEND') break;
    o += 12 + len;
  }
  const channels = { 0: 1, 2: 3, 4: 2, 6: 4 }[type];
  /* a payment code, never a photograph: anything above 4 megapixels is refused before it is inflated (the Worker's memory) */
  if (!width || !height || width * height > 4e6 || depth !== 8 || interlace !== 0 || !channels || !idat.length) return null;
  const joined = new Uint8Array(idat.reduce((n, d) => n + d.length, 0));
  let p = 0; for (const d of idat) { joined.set(d, p); p += d.length; }
  const raw = await inflate(joined);
  const stride = width * channels;
  if (raw.length < height * (stride + 1)) return null;
  const rgb = new Uint8Array(width * height * 3);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0, up = prev[x], c = x >= channels ? prev[x - channels] : 0;
      const v = row[x];
      cur[x] = (f === 0 ? v : f === 1 ? v + a : f === 2 ? v + up : f === 3 ? v + ((a + up) >> 1) : f === 4 ? v + paeth(a, up, c) : -1) & 0xff;
      if (f > 4) return null;
    }
    for (let x = 0; x < width; x++) {
      const s = x * channels, d = (y * width + x) * 3;
      const r = cur[s], g = channels >= 3 ? cur[s + 1] : cur[s], bl = channels >= 3 ? cur[s + 2] : cur[s];
      const al = channels === 4 ? cur[s + 3] : channels === 2 ? cur[s + 1] : 255;
      /* transparency laid on white — the code is printed on white paper */
      rgb[d] = Math.round((r * al + 255 * (255 - al)) / 255); rgb[d + 1] = Math.round((g * al + 255 * (255 - al)) / 255); rgb[d + 2] = Math.round((bl * al + 255 * (255 - al)) / 255);
    }
    const t = prev; prev = cur; cur = t;
  }
  return { width, height, colorSpace: 'DeviceRGB', filter: 'RunLengthDecode', data: runLength(rgb) };
}

/** bytes (Uint8Array) of the approved payment code → { width, height, colorSpace, filter, data } or null */
export async function qrImageOf(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : bytes ? new Uint8Array(bytes) : null;
  if (!b || b.length < 16) return null;
  try {
    if (b[0] === 0xff && b[1] === 0xd8) { const i = jpegInfo(b); return i ? { ...i, filter: 'DCTDecode', data: b } : null; }
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return await pngToRgb(b);
  } catch (e) { return null; }
  return null;
}
