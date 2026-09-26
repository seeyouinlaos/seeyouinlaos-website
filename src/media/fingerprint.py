# THE MEDIA AGENT'S FINGERPRINT (Owner, 26 Sep 2026): a 256-bit difference hash of an image (or a film's frame at 0.5 s) and
# its pixel size — used to recognise which Drive source a website asset was made from (crops and re-encodes keep the hash
# close; a different photograph does not). Usage: python3 src/media/fingerprint.py out.json file…  (PIL; ffmpeg for films)
import sys, json, os, subprocess, tempfile, warnings
warnings.filterwarnings('ignore')
from PIL import Image, ImageOps
try:
    from pillow_heif import register_heif_opener; register_heif_opener()
except Exception:
    pass

def dhash(im, n=16):
    g = ImageOps.exif_transpose(im).convert('L').resize((n + 1, n), Image.LANCZOS)
    px = list(g.getdata()); bits = 0
    for r in range(n):
        for c in range(n):
            bits = (bits << 1) | (1 if px[r * (n + 1) + c] > px[r * (n + 1) + c + 1] else 0)
    return format(bits, '064x')

def open_any(path):
    ext = path.lower().rsplit('.', 1)[-1]
    if ext in ('mp4', 'mov', 'm4v', 'webm'):
        t = tempfile.mktemp(suffix='.png')
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.5', '-i', path, '-frames:v', '1', t], check=False)
        return Image.open(t) if os.path.exists(t) else None
    if ext in ('heic', 'heif'):
        t = tempfile.mktemp(suffix='.png')
        subprocess.run(['sips', '-s', 'format', 'png', path, '--out', t], capture_output=True)
        return Image.open(t) if os.path.exists(t) else None
    try:
        return Image.open(path)
    except Exception:
        return None

out = []
for p in sys.argv[2:]:
    im = open_any(p)
    if im is None:
        out.append({'file': p, 'error': 'unreadable'}); continue
    im = ImageOps.exif_transpose(im)
    out.append({'file': p, 'w': im.size[0], 'h': im.size[1], 'hash': dhash(im)})
json.dump(out, open(sys.argv[1], 'w'))
print(len(out), 'fingerprints')
