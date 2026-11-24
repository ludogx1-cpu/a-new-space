#!/usr/bin/env python3
"""
Build a copy of the website that lives under a sub-folder of another site,
e.g. goldenpaw.dog/studios/animation/.

    python3 scripts/build-subpath.py                       # /studios/animation, goldenpaw.dog
    python3 scripts/build-subpath.py /studios/animation https://goldenpaw.dog

Output: dist/subpath/ (copy its contents into the host site's web/studios/animation/).
Every root-relative link the tool uses ("/assets/...", "/editor.html", "/", ...) is
prefixed, and the stand-alone address (https://animate.goldenpaw.dog) becomes the new one.
Files only the stand-alone site needs (robots, ads.txt, sitemap) are left out: the
host site provides those.
"""
import re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
OUT = ROOT / 'dist' / 'subpath'

prefix = (sys.argv[1] if len(sys.argv) > 1 else '/studios/animation').rstrip('/')
host = (sys.argv[2] if len(sys.argv) > 2 else 'https://goldenpaw.dog').rstrip('/')
OLD_HOST = 'https://animate.goldenpaw.dog'
assert prefix.startswith('/') and not prefix.endswith('/')

SKIP = {'robots.txt', 'ads.txt', 'sitemap.xml'}
TEXT = {'.html', '.js', '.css', '.json', '.webmanifest', '.xml', '.txt', '.mjs'}
# Root-relative paths the tool uses. A quote (or "(") followed by "/" and one of these.
TOOL_PATH = re.compile(
    r'''(?P<q>["'(`])/(?=(?:assets|vendor|fonts|models|showcase|guides)/'''
    r'''|(?:index|editor|how-to-use|get-the-app|ai-plugin|pro|about|contact|privacy|terms|404)\.html'''
    r'''|sw\.js|site\.webmanifest|\?|(?P=q))''')

if OUT.exists():
    shutil.rmtree(OUT)
shutil.copytree(PUB, OUT, ignore=shutil.ignore_patterns(*SKIP))

changed = 0
for f in OUT.rglob('*'):
    if not f.is_file() or f.suffix not in TEXT or f.name.endswith('.min.js') or 'vendor' in f.parts:
        continue
    s = f.read_text(encoding='utf-8')
    t = s.replace(OLD_HOST + '/', host + prefix + '/').replace(OLD_HOST, host + prefix)
    t = TOOL_PATH.sub(lambda m: m.group('q') + prefix + '/', t)
    if t != s:
        f.write_text(t, encoding='utf-8')
        changed += 1

# Anything still pointing at the old root paths would break under the sub-folder.
left = []
for f in OUT.rglob('*.html'):
    for ref in re.findall(r'(?:href|src)="(/[^"]*)"', f.read_text(encoding='utf-8')):
        if not ref.startswith(prefix + '/') and not ref.startswith('//'):
            left.append(f'{f.relative_to(OUT)}: {ref}')
if left:
    raise SystemExit('Unprefixed links left:\n  ' + '\n  '.join(left))

size = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
print(f'Built {OUT.relative_to(ROOT)} for {host}{prefix}/  ({changed} files rewritten, {size // 1_000_000} MB)')
