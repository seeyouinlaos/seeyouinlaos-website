/* Re-evaluation (read-only) of the two checks whose first assertion was wrong in the script, not in the product:
   07.4 — where the stage records a decline; 16.2 — the approved PDF status words. Local stage only. */
import fs from 'node:fs'; import zlib from 'node:zlib'; import path from 'node:path';
import { chromium } from '/Users/thongantang/.npm-global/lib/node_modules/playwright/index.mjs';
const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'out'), O = 'http://127.0.0.1:8788';
const codes = JSON.parse(fs.readFileSync('/private/tmp/claude-501/-Users-thongantang--codex--chatgpt-projects-g-p-69d7e35621808191994b683d453244bf-seeyouinlaos-website/d5f48d27-a903-48b0-a354-134d90b6eb57/scratchpad/synth-codes.json', 'utf8'));
const pdfText = (buf) => { const out = []; const raw = buf.toString('latin1'); const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g; let m; while ((m = re.exec(raw))) { let s = Buffer.from(m[1], 'latin1'); try { s = zlib.inflateSync(s); } catch (e) {} const t = s.toString('latin1'); const tj = /\(((?:\\.|[^\\)])*)\)\s*Tj/g; let q; while ((q = tj.exec(t))) out.push(q[1].replace(/\\267/g, '·').replace(/\\227/g, '—').replace(/\\([()\\])/g, '$1')); } return out; };
const R = [];
const pdf = fs.readdirSync(OUT).find((f) => /^J16-.*\.pdf$/.test(f));
const st = pdfText(fs.readFileSync(path.join(OUT, pdf)));
R.push({ id: '16.2 (recheck)', ok: st.includes('HELD') && st.includes('This ticket shows the seat held for you when you downloaded it.') && st.includes('A9') && !st.some((x) => /^HELD FOR$/.test(x) || /confirmed/i.test(x)), d: JSON.stringify(st.filter((x) => /HELD|held|STATUS|Confirmed|^[AB]\d+$/.test(x))) });
const b = await chromium.launch(); const p = await (await b.newContext()).newPage();
await p.goto(O + '/invitation.html?open=1'); await p.waitForSelector('.siyl-inv input', { state: 'visible' }); await p.fill('.siyl-inv input', codes.T003); await p.click('.siyl-inv .igo');
await p.waitForFunction(() => { try { return !!JSON.parse(localStorage.getItem('siyl.auth') || 'null').bearer; } catch (e) { return false; } });
const sub = await p.evaluate(async () => { const a = JSON.parse(localStorage.getItem('siyl.auth')); return (await (await fetch('/api/draft', { headers: { 'x-siyl-auth': a.bearer } })).json()).submission; });
R.push({ id: '07.4 (recheck)', ok: sub.declined === true && sub.version === 5, d: JSON.stringify({ declined: sub.declined, version: sub.version, lastSentAt: sub.lastSentAt, status: sub.submissionStatus }) });
await b.close();
fs.writeFileSync(path.join(OUT, 'recheck.json'), JSON.stringify(R, null, 1)); R.forEach((r) => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.id + ' — ' + r.d));
