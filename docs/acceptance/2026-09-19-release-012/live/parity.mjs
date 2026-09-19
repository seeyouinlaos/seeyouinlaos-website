import fs from 'node:fs'; import crypto from 'node:crypto'; import path from 'node:path';
const ROOT = process.argv[2] || process.cwd(), O = 'https://seeyouinlaos-website.suthep-hrg.workers.dev';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !/^(register-landing)/.test(f));
const assets = ['assets/stay-media.js', 'assets/experience-galleries.js', 'assets/experiences.js', 'assets/rooms-data.js', 'assets/journey.js', 'assets/stay.js', 'assets/rooms.js', 'assets/pricing.js', 'assets/aman.js', 'assets/aman.css', 'assets/desktop.css', 'assets/guest.js', 'assets/draft.js', 'assets/bag.js', 'assets/temple.js', 'assets/seating.js', 'assets/mail-templates.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));
const W = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'assets/stay-media.js'), 'utf8'))(W); new Function('window', fs.readFileSync(path.join(ROOT, 'assets/experience-galleries.js'), 'utf8'))(W);
const imgs = [...new Set(Object.values(W.SIYL_STAY_MEDIA).map((h) => h.images).flat().map((f) => f.src).concat(Object.keys(W.SIYL_EXP_GALLERY).filter((k) => k[0] !== '_').map((k) => W.SIYL_EXP_GALLERY[k].images).flat().map((f) => f.src)))];
const register = ['register/auth-index.json', 'register/invitations.enc.json'].filter((f) => fs.existsSync(path.join(ROOT, f)));
const list = [...pages, ...assets, ...register, ...imgs];
let same = 0, diff = [], missing = [];
for (const f of list) {
  const local = fs.readFileSync(path.join(ROOT, f));
  const r = await fetch(O + '/' + f, { cache: 'no-store', headers: { 'cache-control': 'no-cache' } });
  if (r.status !== 200) { missing.push(f + ':' + r.status); continue; }
  const remote = Buffer.from(await r.arrayBuffer());
  if (sha(local) === sha(remote)) same++; else diff.push(f);
}
/* the pages are served with the .html dropped too; the Worker may rewrite nothing — a diff on a page is a real diff */
console.log(JSON.stringify({ checked: list.length, same, diff, missing, version: (await fetch(O + '/', { cache: 'no-store' })).headers.get('cf-ray') ? 'cloudflare' : '?' }, null, 1));
fs.writeFileSync(process.argv[3] || 'parity.json', JSON.stringify({ at: new Date().toISOString(), checked: list.length, same, diff, missing }, null, 1));
