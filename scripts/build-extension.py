#!/usr/bin/env python3
"""
Build the Chrome / Edge extension from the website files.

    python3 scripts/build-extension.py

Output: dist/extension/ (load unpacked) and dist/golden-paw-animate-extension.zip
(upload to the Chrome Web Store / Edge Add-ons). The tool pages are copied as-is;
site.js notices it is running inside an extension and switches off ads, analytics
and the service worker, and sends links to non-bundled pages to the website.
"""
import json, re, shutil, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB, SRC, OUT = ROOT / 'public', ROOT / 'extension-src', ROOT / 'dist' / 'extension'

PAGES = ['index.html', 'editor.html', 'how-to-use.html']
DIRS = ['assets', 'vendor', 'showcase']
SKIP = {'og-image.png'}  # only used for social sharing

if OUT.exists():
    shutil.rmtree(OUT)
OUT.mkdir(parents=True)

for d in DIRS:
    shutil.copytree(PUB / d, OUT / d, ignore=shutil.ignore_patterns(*SKIP))

for page in PAGES:
    html = (PUB / page).read_text(encoding='utf-8')
    # chrome-extension://<id>/ does not serve index.html for "/", so point at it directly.
    html = re.sub(r'href="/"', 'href="/index.html"', html)
    # Remote/meta-only tags that make no sense inside an extension.
    html = re.sub(r'\s*<meta name="google-adsense-account"[^>]*>', '', html)
    html = re.sub(r'\s*<link rel="manifest"[^>]*>', '', html)
    if re.search(r'<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>', html):
        raise SystemExit(f'{page} has an inline script; MV3 extensions block those. Move it to a .js file.')
    if re.search(r'\son[a-z]+="', html):
        raise SystemExit(f'{page} has an inline event handler; MV3 extensions block those.')
    (OUT / page).write_text(html, encoding='utf-8')

for f in SRC.iterdir():
    (shutil.copytree if f.is_dir() else shutil.copy2)(f, OUT / f.name)

# Keep the extension version in step with a VERSION file if present.
manifest = json.loads((OUT / 'manifest.json').read_text())
vfile = ROOT / 'VERSION'
if vfile.exists():
    manifest['version'] = vfile.read_text().strip()
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2))

zip_path = ROOT / 'dist' / 'golden-paw-animate-extension.zip'
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(OUT.rglob('*')):
        if p.is_file():
            z.write(p, p.relative_to(OUT))

size = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
print(f'Built {OUT.relative_to(ROOT)} ({size // 1024} KB), version {manifest["version"]}')
print(f'Zip:  {zip_path.relative_to(ROOT)}')
