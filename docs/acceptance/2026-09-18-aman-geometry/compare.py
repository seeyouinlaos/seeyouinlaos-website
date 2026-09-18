#!/usr/bin/env python3
"""AMAN REFERENCE | CURRENT BEFORE | SIYL AFTER — side-by-side sheets at 390 CSS px with measured guides
(viewport gutters at 24 px, the principal image bounds, the text column, the CTA bounds) drawn on every column,
plus the measurement table. Aman screenshots are the Owner's supplied iPhone captures (1170 px = 3× 390), status bar
and browser chrome cropped; SIYL columns are Playwright captures at 390 (2×).
  python3 docs/acceptance/2026-09-18-aman-geometry/compare.py <uploadsDir> <shotsDir> <outDir>
"""
import glob, json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
UP, SH, OUT = sys.argv[1:4]; os.makedirs(OUT, exist_ok=True)
CW = 390  # css px
def upload(prefix):
    for f in glob.glob(os.path.join(UP, '*', prefix + '*')):
        return f
def aman(prefix):
    f = upload(prefix); im = Image.open(f).convert('RGB'); W, H = im.size; s = W / CW
    im = im.crop((0, int(47 * s), W, H - int(83 * s)))          # status bar · Safari chrome
    return im.resize((CW * 2, int(im.height / s * 2)))            # 2× like the Playwright captures
def siyl(name, tag, w=390):
    f = os.path.join(SH, f'{name}-{tag}-{w}.png')
    return Image.open(f).convert('RGB') if os.path.exists(f) else None
def bounds(im):
    """the principal photograph (largest non-ivory block), the text column, the first CTA-like dark bar — in css px"""
    a = np.asarray(im).astype(int); s = im.width / CW
    diff = np.abs(a - np.array([243, 238, 231])).sum(axis=2); sat = a.max(axis=2) - a.min(axis=2)
    photo = (diff > 90) & (sat > 18); rows = photo.sum(axis=1) > 0.4 * im.width
    best = None; y = 0
    while y < len(rows):
        if rows[y]:
            y0 = y
            while y < len(rows) and rows[y]: y += 1
            if y - y0 > 40 * s and (best is None or (y - y0) > (best[1] - best[0])): best = (y0, y)
        else: y += 1
    out = {}
    if best:
        cols = np.where(photo[best[0]:best[1]].sum(axis=0) > 0.5 * (best[1] - best[0]))[0]
        if len(cols): out['image'] = {'left': round(cols[0] / s, 1), 'right': round((im.width - 1 - cols[-1]) / s, 1), 'width': round((cols[-1] - cols[0] + 1) / s, 1), 'top': round(best[0] / s, 1), 'height': round((best[1] - best[0]) / s, 1), 'ratio': round((cols[-1] - cols[0] + 1) / (best[1] - best[0]), 2)}
    ink = (a.sum(axis=2) < 420) & (~photo); cols = np.where(ink.sum(axis=0) > 3 * s)[0]
    if len(cols): out['text'] = {'left': round(cols[0] / s, 1), 'right': round((im.width - 1 - cols[-1]) / s, 1)}
    dark = (a.sum(axis=2) < 200); drows = np.where(dark.sum(axis=1) > 0.6 * im.width)[0]
    if len(drows): out['cta'] = {'top': round(drows[0] / s, 1), 'height': round((drows[-1] - drows[0] + 1) / s, 1)}
    return out
def guides(im, b):
    d = ImageDraw.Draw(im, 'RGBA'); s = im.width / CW
    for x in (24, CW - 24): d.line([(x * s, 0), (x * s, im.height)], fill=(200, 40, 40, 140), width=2)   # the 24 px gutters
    if 'image' in b:
        i = b['image']; x0, x1, y0, y1 = i['left'] * s, (CW - i['right']) * s, i['top'] * s, (i['top'] + i['height']) * s
        d.rectangle([x0, y0, x1, y1], outline=(30, 90, 200, 220), width=3); d.text((x0 + 6, y0 + 6), f"img {i['width']:.0f}×{i['height']:.0f} · {i['ratio']}", fill=(30, 90, 200, 255))
    if 'text' in b:
        t = b['text']; d.line([(t['left'] * s, 0), (t['left'] * s, im.height)], fill=(40, 160, 90, 120), width=2); d.line([((CW - t['right']) * s, 0), ((CW - t['right']) * s, im.height)], fill=(40, 160, 90, 120), width=2)
    if 'cta' in b:
        c = b['cta']; d.rectangle([0, c['top'] * s, im.width, (c['top'] + c['height']) * s], outline=(200, 120, 20, 220), width=3)
    return im
PAIRS = [  # component: (Aman upload prefix, SIYL before shot, SIYL after shot)
 ('editorial hero', '39c97537', 'home', 'home'),
 ('destination card', '39c97537', 'home-pair', 'home-pair'),
 ('horizontal rail', 'b390034e', 'home-rail', 'home-rail'),
 ('accommodation card', 'c240d56d', 'stays-rail', 'stays-rail'),
 ('room detail', '77f1c207', 'room-detail', 'room-detail-signed-in'),
 ('My Trip', '39c97537', 'my-trip', 'my-trip'),
 ('My Bag', 'bc45c406', 'my-bag', 'my-bag'),
 ('Review & Send', '7ea46198', 'review', 'review'),
]
table = ['| Component | Column | Image left/right (px) | Image width × height (px) | Ratio | Text column left/right | CTA height |', '|---|---|---|---|---|---|---|']
for comp, ref, before, after in PAIRS:
    cols = [('AMAN REFERENCE', aman(ref)), ('CURRENT BEFORE', siyl(before, 'before') or siyl(before, 'before', 390)), ('SIYL AFTER', siyl(after, 'after'))]
    H = 844 * 2; cw = CW * 2; sheet = Image.new('RGB', (3 * (cw + 12), H + 36), (235, 235, 235)); d = ImageDraw.Draw(sheet)
    for k, (label, im) in enumerate(cols):
        x = k * (cw + 12)
        d.rectangle([x, 0, x + cw, 30], fill=(20, 20, 20)); d.text((x + 8, 8), f'{comp} · {label}', fill=(255, 255, 255))
        if im is None: d.text((x + 8, 60), 'no capture', fill=(0, 0, 0)); continue
        crop = im.crop((0, 0, cw, min(im.height, H))); b = bounds(crop); crop = guides(crop, b); sheet.paste(crop, (x, 36))
        i = b.get('image', {}); t = b.get('text', {}); c = b.get('cta', {})
        table.append(f"| {comp} | {label} | {i.get('left', '—')} / {i.get('right', '—')} | {i.get('width', '—')} × {i.get('height', '—')} | {i.get('ratio', '—')} | {t.get('left', '—')} / {t.get('right', '—')} | {c.get('height', '—')} |")
    name = comp.lower().replace(' & ', '-').replace(' ', '-'); sheet.save(os.path.join(OUT, f'compare-{name}-390.jpg'), quality=82); print('sheet', name)
open(os.path.join(OUT, 'measurement-table.md'), 'w').write('# Measured at 390 CSS px (Aman reference · current before · SIYL after)\n\n' + '\n'.join(table) + '\n')
print('\n'.join(table))
