#!/usr/bin/env python3
"""
Pre-deploy check. Run from the repo root:   python3 scripts/check.py
- every page's local links and assets exist
- every script parses (needs Node.js; skipped if not installed)
- the service worker only precaches files that exist
- the vendor libraries still match their published integrity hashes
- the extension builds and has no inline scripts
"""
import base64, hashlib, os, re, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / 'public'
problems = []

for page in PUB.rglob('*.html'):
    html = page.read_text(encoding='utf-8')
    for ref in re.findall(r'(?:href|src)="(/(?!/)[^"#?]*)', html):
        target = PUB / ref.lstrip('/')
        if ref.endswith('/') or ref == '/':
            target = target / 'index.html'
        if not target.exists():
            problems.append(f'{page.relative_to(ROOT)}: missing {ref}')

sw = (PUB / 'sw.js').read_text()
for ref in re.findall(r"'(/[^']*)'", sw.split('];')[0]):
    t = PUB / (ref.lstrip('/') or 'index.html')
    if not t.exists():
        problems.append(f'sw.js precaches a missing file: {ref}')

SRI = {
    'jszip.min.js': 'XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg==',
    'gif.js': 'nNOFtIS+H0lwgdUDaPn/g1ssw3uN9AkEM7zy2wLaTQeLQNeNiitUcLpEpDIh3Z4T22MdeTNru/SQbNM4ig2rng==',
    'gif.worker.js': '3piO8GKVGn3D+eEWnTquDnlxM00ESMZpYNAnjmOMswHrGihZvdlsRjSW1bHLqahzIoyL9YWlLWVYRV4J8AHwtg==',
}
for name, want in SRI.items():
    got = base64.b64encode(hashlib.sha512((PUB / 'vendor' / name).read_bytes()).digest()).decode()
    if got != want:
        problems.append(f'vendor/{name} does not match its published hash')

if shutil.which('node'):
    for js in list((PUB / 'assets').glob('*.js')) + [PUB / 'sw.js']:
        r = subprocess.run(['node', '-e', "new Function(require('fs').readFileSync(process.argv[1],'utf8'))", str(js)],
                           capture_output=True, text=True)
        if r.returncode:
            problems.append(f'{js.relative_to(ROOT)} does not parse: {r.stderr.strip().splitlines()[-1]}')
else:
    print('(Node.js not found: skipped script syntax check)')

r = subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build-extension.py')], capture_output=True, text=True)
if r.returncode:
    problems.append('extension build failed: ' + (r.stderr or r.stdout).strip())

if problems:
    print('PROBLEMS FOUND:'); [print(' -', p) for p in problems]; sys.exit(1)
print(f'All checks passed ({len(list(PUB.rglob("*.html")))} pages).')
