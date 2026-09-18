#!/usr/bin/env python3
"""008 — COPY AUDIT · the public copies of the corpus. The extraction runs against the real register (so every reachable
state renders), but the repository is public: every surname from the register is replaced by an initial before a corpus
file is committed. First names are what the website itself shows to signed-in guests; codes never appear (SECRET SCAN).
  python3 docs/review/008-copy-audit/scrub.py <file>…   (writes <file> in place; the private original stays in the scratchpad)
"""
import csv, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..'))
rows = list(csv.DictReader(open(os.path.join(ROOT, 'src/invitation-tokens.private.csv'), encoding='utf8')))
firsts = sorted({(r.get('name') or '').split()[0] for r in rows if (r.get('name') or '').strip()}, key=len, reverse=True)
# a surname is whatever follows a register first name as a capitalised word — "Peggy Berger" → "Peggy B."
pat = re.compile(r'\b(' + '|'.join(re.escape(f) for f in firsts) + r') ([A-Z][a-zà-ÿ]{2,})\b')
KEEP = {'Test', 'Demo', 'Example', 'And', 'The'}   # synthetic surnames used by the tests stay readable; two capitalised words that are not names
for f in sys.argv[1:]:
    s = open(f, encoding='utf8').read()
    found = {m.group(2) for m in pat.finditer(s) if m.group(2) not in KEEP}
    n = 0
    for sn in sorted(found, key=len, reverse=True):
        s, k = re.subn(r'\b' + re.escape(sn) + r'\b', sn[0] + '.', s); n += k
    open(f, 'w', encoding='utf8').write(s)
    print('%s: %d surname occurrences replaced' % (os.path.relpath(f, ROOT), n))
