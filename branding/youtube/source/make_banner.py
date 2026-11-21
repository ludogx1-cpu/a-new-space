import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SITE, OUT = sys.argv[1], sys.argv[2]
NAVY=(11,15,25); NAVY_D=(6,9,17); NAVY_L=(24,32,52); GOLD=(201,162,39); TEXT=(248,250,252); TEXT_L=(203,213,225); MUTED=(148,163,184)
def outfit(size, w):
    f = ImageFont.truetype(SITE+'/Outfit-Variable.ttf', size); f.set_variation_by_axes([w]); return f
# Solid paw mask from the site's icon, cleaned and padded
src = Image.open(SITE+'/Icon-512.png').convert('RGBA'); src = src.crop(src.getbbox())
pad = Image.new('L', (src.width+80, src.height+80), 0); pad.paste(src.getchannel('A').point(lambda v: 255 if v>90 else 0), (40,40))
big = pad.resize((pad.width*4, pad.height*4), Image.LANCZOS).filter(ImageFilter.GaussianBlur(10)).point(lambda v: 255 if v>128 else 0)
def outline_mask(stroke_frac):
    """Outline paw like the Studios icon: the shape minus a rounded inset copy of itself."""
    r = big.width*stroke_frac
    inner = big.filter(ImageFilter.GaussianBlur(r)).point(lambda v: 255 if v > 250 else 0)
    inner = inner.filter(ImageFilter.GaussianBlur(4)).point(lambda v: 255 if v > 128 else 0)
    m = big.copy(); m.paste(0, mask=inner)
    return m.filter(ImageFilter.GaussianBlur(2))
_si = Image.open(SITE+'/studios_icon.png').convert('RGBA').getchannel('A')
_si = _si.crop(_si.getbbox()); _sp = Image.new('L', (_si.width+24, _si.height+24), 0); _sp.paste(_si, (12,12))
_up = _sp.resize((_sp.width*8, _sp.height*8), Image.LANCZOS).filter(ImageFilter.GaussianBlur(7)).point(lambda v: 255 if v > 128 else 0)
OUT_MASK = _up.filter(ImageFilter.GaussianBlur(2))  # the Studios paw from goldenpaw.dog/studios, upscaled
def paw(w, alpha=255, mask=None):
    mk = (mask or OUT_MASK); bb = mk.getbbox(); mk = mk.crop(bb)
    mk = mk.resize((w, int(w*mk.height/mk.width)), Image.LANCZOS).point(lambda v: v*alpha//255)
    p = Image.new('RGBA', mk.size, GOLD+(0,)); p.putalpha(mk); return p
def glow_of(m, strength, radius):
    pd = radius*3; g = Image.new('RGBA', (m.width+2*pd, m.height+2*pd), GOLD+(0,))
    a = Image.new('L', g.size, 0); a.paste(m.getchannel('A').point(lambda v: int(v*strength)), (pd, pd))
    g.putalpha(a.filter(ImageFilter.GaussianBlur(radius))); return g, pd
def backdrop(W, H, cx, cy, rx, ry):
    img = Image.new('RGB', (W,H), NAVY_D); g = Image.new('L', (W,H), 0); gd = ImageDraw.Draw(g)
    for r in range(100, 0, -1):
        f = r/100; gd.ellipse([cx-rx*f, cy-ry*f, cx+rx*f, cy+ry*f], fill=int(255*(1-f)**1.3))
    img.paste(Image.new('RGB',(W,H),NAVY_L), mask=g); return img.convert('RGBA')

# ---------- Banner ----------
W,H = 2560,1440
ban = backdrop(W, H, 1280, 720, 1700, 760)
solid = big.filter(ImageFilter.GaussianBlur(1))
for x,y,a,s in [(120,140,-20,170),(400,300,15,130),(170,980,10,150),(440,1190,-15,120),(2230,120,20,160),
                (2400,360,-10,120),(2150,1000,-25,150),(2380,1200,12,130),(770,1240,5,110),(1720,1230,-8,110),
                (820,70,-12,100),(1680,60,18,110)]:
    ban.alpha_composite(paw(s, 34).rotate(-a, expand=True, resample=Image.BICUBIC), (x, y))
d = ImageDraw.Draw(ban)
for yy in (420, 1014):
    for x in range(500, 2060):
        t = 1 - abs((x-1280)/780)**2
        d.line([(x,yy),(x,yy+3)], fill=GOLD+(int(200*max(0,t)),))
title = outfit(124, 700); sub = outfit(40, 400); url = outfit(34, 600)
mark = paw(196); glow, gpad = glow_of(mark, 0.55, 20)
t1, t2 = 'Golden Paw ', 'Studios'
w1 = d.textlength(t1, font=title); w2 = d.textlength(t2, font=title)
tag = 'Games  ·  Digital goodies  ·  Websites & social for small businesses'
wt = d.textlength(tag, font=sub)
gap = 56; block = mark.width + gap + max(w1+w2, wt); x0 = int((W-block)/2); cy = 706
my = cy - mark.height//2 + 4
ban.alpha_composite(glow, (x0-gpad, my-gpad)); ban.alpha_composite(mark, (x0, my))
tx = x0 + mark.width + gap
d.text((tx, cy-24), t1, font=title, fill=TEXT, anchor='ls')
d.text((tx+w1, cy-24), t2, font=title, fill=GOLD, anchor='ls')
d.text((tx+3, cy+44), tag, font=sub, fill=TEXT_L, anchor='ls')
d.text((tx+3, cy+104), 'goldenpaw.dog/studios', font=url, fill=GOLD, anchor='ls')
assert x0 >= 507 and x0+block <= 2053, ('outside safe area', x0, x0+block)
ban.convert('RGB').save(OUT+'/banner-2560x1440.png', optimize=True)
pv = ban.convert('RGB').resize((1280,720), Image.LANCZOS); pd_ = ImageDraw.Draw(pv); lf = outfit(20, 500)
for (a,b,c,e,lab,col) in [(0,254,2560,1186,'Desktop',(80,160,255)),(507,508,2053,931,'Phone (safe area)',(255,90,90))]:
    pd_.rectangle([a/2,b/2,c/2-1,e/2], outline=col, width=3); pd_.text((a/2+8,b/2+6), lab, fill=col, font=lf)
pv.save(OUT+'/banner-crop-preview.png', optimize=True)

# ---------- Profile picture ----------
pp = backdrop(800, 800, 400, 400, 560, 560)
m = paw(430); gl, gp = glow_of(m, 0.5, 22)
x, y = (800-m.width)//2, (800-m.height)//2
pp.alpha_composite(gl, (x-gp, y-gp)); pp.alpha_composite(m, (x, y))
pp.convert('RGB').save(OUT+'/profile-picture-800x800.png', optimize=True)
print('ok', x0, x0+block)
