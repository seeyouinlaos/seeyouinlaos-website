#!/usr/bin/env python3
"""007 — FINAL V2 DELTA · docs/review/007-final-v2-delta.md
Compares the pre-patch review (007-final-full-website-text.txt · 007-final-source-truth-audit.txt) with the
final V2 (007-final-v2-text.txt · 007-final-v2-source-truth-audit.txt): the unique text lines that appeared
and disappeared, grouped by what they belong to, and the source-truth classifications that changed. Concise —
the corpus is never repeated here.  python3 docs/review/007-final-v2-delta.py"""
import re, pathlib, collections, datetime
ROOT = pathlib.Path(__file__).resolve().parents[2]
rd = lambda f: (ROOT / 'docs/review' / f).read_text()
pre, v2 = rd('007-final-full-website-text.txt'), rd('007-final-v2-text.txt')
def lines(t):
    out = collections.Counter()
    for l in t.split('\n'):
        l = l.strip()
        if not l or l.startswith(('SURFACE:', 'STATE:', 'SOURCE:', 'CONTEXT:', 'USES G-', 'GLOBAL TEXT BLOCK', '=====', 'MAIN SHA', 'EXTRACTION DATE', 'LINES:', 'WORDS:', 'CHARACTERS:', 'DISTINCT', 'DYNAMIC', 'EXPERIENCE ENT', 'STAY / ROOM', 'TRANSPORT ROUTES', 'TICKET / PDF', 'SOURCE-TRUTH', 'SOURCE MISSING', 'OWNER DECISION', 'SECRET SCAN', 'COMPLETENESS', '007 ')): continue
        if re.match(r'^(Submitted via Review & Send|DOWNLOADED \d{4}|SYL-[A-Z0-9-]+|\[download stamp\])', l): continue
        out[re.sub(r'SYL-[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]{4}', 'SYL-…', l)] += 1
    return out
A, B = lines(pre), lines(v2)
added = sorted(set(B) - set(A)); removed = sorted(set(A) - set(B))
def group(ls, pats):
    g = collections.OrderedDict((k, []) for k, _ in pats); g['other'] = []
    for l in ls:
        for k, p in pats:
            if re.search(p, l, re.I): g[k].append(l); break
        else: g['other'].append(l)
    return g
PATS = [
  ('Temple Ceremony time (08:00 → 09:00 – approximately 12:00)', r'08:00|09:00 – approximately 12:00|approximately 12:00'),
  ('C86 price (USD 105 → USD 85)', r'\bC86\b|USD 105|USD 85\b|2,175|2,155|USD 3,7|kmg-ljg'),
  ('Wedding (Vow) Ceremony 15:30 · seat model (temple → Souphattra Heritage)', r'Vow Ceremony|Wedding Ceremony|16:30|15:30|Wat Ong Teu · 28|Souphattra Heritage · 28|Temple Ceremony|SYL-WC|SYL-TC|Front Centre|front centre|Ceremony seat|ceremony place|WEDDING · TEMPLE|Wedding · Temple|Wedding · Dinner|Wedding Dinner · Poolside'),
  ('The venue stage (new guest-facing text)', r'venue|Souphattra Heritage Vientiane from above|Lobby|Courtyard garden|Swimming pool|Coffee & Cake · Breakfast|heritage houses|Arrival · 27 February|Every day of the stay|Between the houses|Photographs of|the real photograph|lounge|chandelier|breakfast|balconies|medallion|gateway|terrace|loungers|dim sum|sharing menu|Choose your room|The Vow Ceremony|The Wedding Dinner|Two nights · 27'),
  ('Accessibility text (aria / alt / live regions)', r'^\[aria-|^\[alt\]|^\[title\]|^\[aria-live\]|\[state\]'),
  ('Totals and amounts that follow C86', r'USD [0-9,]+'),
]
ga, gr = group(added, PATS), group(removed, PATS)
out = []
w = out.append
w('# 007 — FINAL V2 DELTA (pre-patch → final)'); w('')
w('Generated ' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d %H:%M UTC') + ' by docs/review/007-final-v2-delta.py.'); w('')
w('PRE-PATCH: docs/review/007-final-full-website-text.txt (MAIN SHA ' + re.search(r'MAIN SHA: (\w+)', pre).group(1) + ') · docs/review/007-final-source-truth-audit.txt')
w('FINAL:     docs/review/007-final-v2-text.txt (MAIN SHA ' + re.search(r'MAIN SHA: (\w+)', v2).group(1) + ') · docs/review/007-final-v2-source-truth-audit.txt'); w('')
def meta(t, k): m = re.search(r'^' + re.escape(k) + r': (.+)$', t, re.M); return m.group(1) if m else '—'
w('| metric | pre-patch | final |'); w('|---|---|---|')
for k in ['DISTINCT ACTIVE ROUTES', 'DISTINCT SURFACES', 'DYNAMIC / CONDITIONAL STATES', 'EXPERIENCE ENTITIES', 'STAY / ROOM ROUTES', 'TRANSPORT ROUTES', 'TICKET / PDF TEMPLATES', 'LINES', 'WORDS', 'SOURCE-TRUTH CLAIMS CHECKED', 'SOURCE-TRUTH MATCH', 'SOURCE-TRUTH CONFLICT', 'SOURCE MISSING', 'OWNER DECISION OVERRIDES', 'STALE / RETIRED SOURCE', 'SECRET SCAN', 'COMPLETENESS CHECK']:
    w('| ' + k + ' | ' + meta(pre, k) + ' | ' + meta(v2, k) + ' |')
w(''); w('Unique text lines (surfaces, states, templates; references and stamps normalised): ' + str(len(A)) + ' → ' + str(len(B)) + ' · appeared ' + str(len(added)) + ' · disappeared ' + str(len(removed))); w('')
def dump(title, g):
    w('## ' + title); w('')
    for k, ls in g.items():
        if not ls: continue
        w('### ' + k + ' (' + str(len(ls)) + ')'); w('')
        for l in ls[:60]: w('- ' + l[:220])
        if len(ls) > 60: w('- … ' + str(len(ls) - 60) + ' more')
        w('')
dump('Text that APPEARED in the final', ga)
dump('Text that DISAPPEARED from the final (removed active text — each line checked: retired by the Owner patch, moved into the venue stage, or a stamp)', gr)
# classifications
pa, pb = rd('007-final-source-truth-audit.txt'), rd('007-final-v2-source-truth-audit.txt')
def issues(t):
    out = {}
    for m in re.finditer(r'ISSUE ST-(\d+)\n\nSURFACE: (.+)\nCURRENT WEBSITE: (.+)\n(?:.*\n)*?CLASSIFICATION: (.+)\n', t):
        out[m.group(2).strip()] = (m.group(1), m.group(3).strip(), m.group(4).strip())
    return out
ia, ib = issues(pa), issues(pb)
w('## Source-truth classifications that changed'); w('')
w('| surface | pre-patch | final |'); w('|---|---|---|')
seen = set()
for s, (n, web, cls) in ib.items():
    old = ia.get(s)
    if old and old[2] == cls and old[1] == web: continue
    seen.add(s)
    w('| ' + s[:90] + ' | ' + (old[2] + ' — ' + old[1][:80] if old else 'new claim') + ' | ' + cls + ' — ' + web[:80] + ' |')
for s, (n, web, cls) in ia.items():
    if s not in ib: w('| ' + s[:90] + ' | ' + cls + ' — ' + web[:80] + ' | claim retired |')
w(''); w('## Newly introduced source-truth conflicts'); w('')
new_conf = [s for s, (n, web, cls) in ib.items() if cls.startswith('CONFLICT') and not (ia.get(s) and ia[s][2].startswith('CONFLICT'))]
w('- none' if not new_conf else '\n'.join('- ' + s for s in new_conf))
w(''); w('## Still needing an Owner decision'); w('')
need = [s + ' — ' + cls for s, (n, web, cls) in ib.items() if 'NEEDS OWNER DECISION' in cls]
w('- none' if not need else '\n'.join('- ' + s for s in need))
(ROOT / 'docs/review/007-final-v2-delta.md').write_text('\n'.join(out) + '\n')
print('delta written · appeared', len(added), '· disappeared', len(removed), '· changed classifications', len(seen), '· new conflicts', len(new_conf))
