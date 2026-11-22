#!/usr/bin/env python3
"""Draws the Golden Paw glowing outline paw icon at every size the site, app and extension need.
    python3 scripts/make-icons.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parent.parent
GOLD = (201, 162, 39)
S = 1600  # master canvas; everything downsampled from here

def holes_mask():
    m = Image.new('L', (S, S), 0); d = ImageDraw.Draw(m)
    k = S / 800
    def ell(cx, cy, rx, ry, ang=0):
        pts = []
        for i in range(180):
            t = 2 * math.pi * i / 180; x, y = rx * math.cos(t), ry * math.sin(t); a = math.radians(ang)
            pts.append(((cx + x * math.cos(a) - y * math.sin(a)) * k, (cy + x * math.sin(a) + y * math.cos(a)) * k))
        d.polygon(pts, fill=255)
    # toe holes
    ell(345, 282, 40, 58, -4); ell(455, 282, 40, 58, 4)
    ell(260, 375, 38, 57, -22); ell(540, 375, 38, 57, 22)
    # main pad hole: a rounded triangle with a gentle dip at the bottom, built from
    # a polygon and then smoothed so there are no lumps.
    pad = Image.new('L', (S, S), 0); pd = ImageDraw.Draw(pad)
    pts = [(400, 372), (452, 392), (505, 452), (535, 515), (528, 560), (490, 578), (445, 570),
           (400, 562), (355, 570), (310, 578), (272, 560), (265, 515), (295, 452), (348, 392)]
    pd.polygon([(x * k, y * k) for x, y in pts], fill=255)
    pad = pad.filter(ImageFilter.GaussianBlur(22 * k)).point(lambda v: 255 if v > 120 else 0)
    m = ImageChops.lighter(m, pad)
    return m

def dilate(mask, r):
    # Round dilation: blur then threshold.
    b = mask.filter(ImageFilter.GaussianBlur(r * 0.55))
    return b.point(lambda v: 255 if v > 18 else 0)

def master():
    holes = holes_mask()
    # Morphological closing (grow further, then shrink back) so the outline is one solid
    # shape with no pinholes where the toe and pad rings nearly meet.
    big = dilate(holes, 76)
    outer = big.filter(ImageFilter.GaussianBlur(14 * 0.55)).point(lambda v: 255 if v > 237 else 0)
    ring = ImageChops.subtract(outer, holes)
    ring = ring.filter(ImageFilter.GaussianBlur(1.2))  # anti-alias edges
    return ring

RING = master()

def background(size, rounded):
    bg = Image.new('RGBA', (size, size))
    px = bg.load()
    c = size / 2
    for y in range(size):
        for x in range(size):
            t = min(1, math.hypot(x - c, y - c) / (size * 0.72))
            px[x, y] = (int(22 - 12 * t), int(30 - 17 * t), int(50 - 28 * t), 255)
    if rounded:
        m = Image.new('L', (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.22), fill=255)
        bg.putalpha(m)
    return bg

def icon(size, paw_scale=0.62, rounded=True, glow=True):
    bg = background(size, rounded)
    span = int(size * paw_scale / 0.53)          # paw spans ~53% of the master canvas
    ring = RING.resize((span, span), Image.LANCZOS)
    layer = Image.new('L', (size, size), 0)
    off = ((size - span) // 2, (size - span) // 2 + int(size * 0.01))
    layer.paste(ring, off)
    if glow and size >= 48:
        g = layer.filter(ImageFilter.GaussianBlur(size * 0.025)).point(lambda v: int(v * 0.85))
        bg.alpha_composite(Image.merge('RGBA', (*[Image.new('L', (size, size), c) for c in GOLD], g)))
    bg.alpha_composite(Image.merge('RGBA', (*[Image.new('L', (size, size), c) for c in GOLD], layer)))
    if rounded:  # keep transparent corners after compositing
        a = bg.split()[3]
        m = Image.new('L', (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], int(size * 0.22), fill=255)
        bg.putalpha(ImageChops.multiply(a, m))
    return bg

if __name__ == '__main__':
    A = ROOT / 'public' / 'assets'
    icon(192).save(A / 'paw-logo-192.png', optimize=True)          # nav logo + favicon
    icon(192).save(A / 'icon-192.png', optimize=True)
    icon(512).save(A / 'icon-512.png', optimize=True)
    icon(512, 0.5, rounded=False).save(A / 'icon-maskable-512.png', optimize=True)  # safe zone for Android masks
    icon(180, 0.6, rounded=False).save(A / 'apple-touch-icon.png', optimize=True)
    icon(800, 0.53, rounded=False).save(A / 'icon-800.png', optimize=True)
    E = ROOT / 'extension-src' / 'icons'
    for s in (16, 32, 48, 128):
        icon(s * 4, 0.78 if s <= 32 else 0.66, glow=s >= 48).resize((s, s), Image.LANCZOS).save(E / f'icon-{s}.png', optimize=True)
    print('icons written')
