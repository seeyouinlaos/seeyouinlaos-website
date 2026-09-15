#!/usr/bin/env python3
"""THE VENUE IMAGES — built from the Owner's Drive originals, never from anything generated.
   Normal web treatment only: resize, crop (the mobile art direction), encode. No retouching,
   no colour work beyond the encoder, nothing added, nothing removed.
     python3 docs/venue/build-images.py <folder with the Drive originals>
   The originals are named <driveId>__<title> as the download tool persists them."""
import os, sys, subprocess, glob
from PIL import Image, ImageOps
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'images', 'venue')
os.makedirs(OUT, exist_ok=True)

def find(drive_id):
    m = glob.glob(os.path.join(SRC, drive_id + '__*'))
    if not m: raise SystemExit('missing original ' + drive_id)
    return m[0]

def encode(im, name, widths, quality=82):
    """one PIL image → jpg + webp + avif at each width (never upscaled)"""
    for w in widths:
        if w > im.width: continue
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS)
        base = os.path.join(OUT, f'{name}-{w}')
        r.save(base + '.jpg', 'JPEG', quality=quality, optimize=True, progressive=True)
        r.save(base + '.png', 'PNG')  # lossless hand-off to the encoders
        subprocess.run(['cwebp', '-quiet', '-q', str(quality), '-m', '6', base + '.png', '-o', base + '.webp'], check=True)
        subprocess.run(['avifenc', '--min', '18', '--max', '30', '-s', '4', '-j', 'all', base + '.png', base + '.avif'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        os.remove(base + '.png')
        print(name, w, 'x', h)

# 1 · THE BASE — Heritage_0631, the real top-down aerial (003 - Hotel - Pool & Garden), 2560 × 1440
base = ImageOps.exif_transpose(Image.open(find('1VIz9oIZDOUlktJD7pase7e4UilhvsO9j'))).convert('RGB')
assert base.size == (2560, 1440), base.size
encode(base, 'souphattra-aerial', [2560, 1600, 1000])
# the mobile art direction: a 4:5 crop centred on the pool and the courtyard (x 26 % → 71 % of the frame)
x0 = 665; tall = base.crop((x0, 0, x0 + 1152, 1440))
assert tall.size == (1152, 1440)
encode(tall, 'souphattra-aerial-tall', [1152, 800, 600])

# 2 · SUPPORTING PHOTOGRAPHY — the Drive files not yet in the repository
for drive_id, name, widths in [
    ('13o95npqGfPMooOpwRqd2kcpB_l83nYJO', 'pool-terrace-oblique', [1600, 1000]),   # Heritage_0640 · 003 - Hotel - Pool & Garden
    ('1XVYr1DrvJ4CAafFrL1B-9BvPfsUYTltz', 'lobby-lounge', [1600, 1000]),           # Heritage_0702 · 002 - Hotel - Lobby & Public Areas
    ('1CMdx_ytO_Uy6oDJkYNdf-iMv0kQv00Ha', 'lobby-clock', [1200, 800]),             # 5.jpg · 002
    ('1pTzQswtYwQv_nL6NTXtNRQyHlkKvmr-6', 'lobby-gallery-wall', [1600, 1000]),     # 2025-12-18_Souphattra … · 002
    ('1Eaxqak_sWkVphdVeqGD7daO9Jzxzn2zb', 'breakfast-01', [1100, 700]),            # Breakfast_01 · 004 - Hotel - Breakfast
    ('1Zrjx_EeCDOtdXRpb8AG46h1cgmKR8s7i', 'breakfast-02', [1100, 700]),            # Breakfast_02 · 004
    # Breakfast_03 (1h4QR9yvMU9TAejRMxpV5EdQCZ5_6nkDC) is a near-duplicate framing of Breakfast_02 — inspected, not built
]:
    im = ImageOps.exif_transpose(Image.open(find(drive_id))).convert('RGB')
    encode(im, name, widths)
# 3 · THUMBNAILS — 320 px, for the gallery strip (every photograph the stage shows, from the built file or the repository file)
TH = os.path.join(OUT, 'thumbs'); os.makedirs(TH, exist_ok=True)
REPO = os.path.join(os.path.dirname(__file__), '..', '..')
def thumb(src_path, base):
    im = ImageOps.exif_transpose(Image.open(src_path)).convert('RGB')
    w = 320; h = round(im.height * w / im.width)
    im.resize((w, h), Image.LANCZOS).save(os.path.join(TH, base + '-320.jpg'), 'JPEG', quality=72, optimize=True, progressive=True)
    print('thumb', base)
for name in ['lobby-lounge', 'lobby-clock', 'lobby-gallery-wall', 'breakfast-01', 'breakfast-02', 'pool-terrace-oblique']:
    biggest = sorted(glob.glob(os.path.join(OUT, name + '-*.jpg')), key=lambda f: int(f.rsplit('-', 1)[1][:-4]))[-1]
    thumb(biggest, name)
for rel in ['souphattra/heritage-balconies.jpg', 'souphattra/heritage-room.jpg', 'souphattra/heritage-lao-reading.jpg', 'event/051-coffee-and-cake-patisserie.jpg', 'event/051-coffee-and-cake-salon.jpg', 'event/052-vow-ceremony-green-door-entrance.jpg', 'event/052-ceremony-green-gateway.jpg', 'event/052-vow-ceremony-green-door.jpg', 'event/053-wedding-dinner-courtyard-from-above.jpg', 'event/053-wedding-dinner-courtyard-wide.jpg', 'event/053-wedding-dinner-sharing-menu.jpg', 'souphattra/heritage-courtyard-pool.jpg', 'event/053-wedding-dinner-courtyard-villa.jpg', 'event/053-wedding-dinner-courtyard-loungers.jpg', 'event/053-wedding-dinner-garden-terrace.jpg', 'event/053-wedding-dinner-courtyard-gallery-view.jpg']:
    thumb(os.path.join(REPO, 'assets', 'images', rel), os.path.basename(rel)[:-4])
print('done')
