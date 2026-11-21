import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
SITE, OUT = sys.argv[1], sys.argv[2]
BG=(18,18,18); BG_L=(34,34,34); GOLD=(201,162,39); WHITE=(255,255,255); GREY=(190,190,190)
def outfit(size, wght):
    f = ImageFont.truetype(SITE+'/Outfit-Variable.ttf', size); f.set_variation_by_axes([wght]); return f
src = Image.open(SITE+'/Icon-512.png').convert('RGBA'); src = src.crop(src.getbbox())
_p = Image.new('RGBA', (src.width+40, src.height+40), (0,0,0,0)); _p.paste(src, (20,20)); src = _p
_a = src.getchannel('A').point(lambda v: 255 if v > 90 else 0).resize((src.width*4, src.height*4), Image.LANCZOS)
_a = _a.filter(ImageFilter.GaussianBlur(10)).point(lambda v: 255 if v > 128 else 0).resize(src.size, Image.LANCZOS)
src = Image.new('RGBA', src.size, GOLD+(255,)); src.putalpha(_a)
src = src.crop(src.getbbox())
def glow_of(m, strength, radius):
    pad = radius*3; g = Image.new('RGBA', (m.width+2*pad, m.height+2*pad), GOLD+(0,))
    a = Image.new('L', g.size, 0); a.paste(m.getchannel('A').point(lambda v: int(v*strength)), (pad, pad))
    g.putalpha(a.filter(ImageFilter.GaussianBlur(radius))); return g, pad
def paw(w, alpha=255, color=GOLD):
    p = src.resize((w, int(w*src.height/src.width)), Image.LANCZOS)
    a = p.getchannel('A').point(lambda v: v*alpha//255)
    out = Image.new('RGBA', p.size, color+(0,)); out.putalpha(a); return out
W,H = 2560,1440
ban = Image.new('RGB', (W,H), BG)
g = Image.new('L', (W,H), 0); gd = ImageDraw.Draw(g)
for r in range(1400, 0, -6):   # soft spotlight behind the safe area
    gd.ellipse([1280-r*1.6, 720-r*0.75, 1280+r*1.6, 720+r*0.75], fill=int(255*(1-r/1400)**1.4))
ban.paste(Image.new('RGB',(W,H),BG_L), mask=g); ban = ban.convert('RGBA')
for x,y,a,s in [(120,140,-20,170),(400,300,15,130),(170,980,10,150),(440,1190,-15,120),(2230,120,20,160),
                (2400,360,-10,120),(2150,1000,-25,150),(2380,1200,12,130),(770,1240,5,110),(1720,1230,-8,110),
                (820,70,-12,100),(1680,60,18,110)]:
    ban.alpha_composite(paw(s, 26).rotate(-a, expand=True, resample=Image.BICUBIC), (x, y))
d = ImageDraw.Draw(ban)
for yy in (420, 1014):
    for x in range(500, 2060):
        t = 1 - abs((x-1280)/780)**2
        d.line([(x,yy),(x,yy+3)], fill=GOLD+(int(220*max(0,t)),))
title = outfit(128, 700); sub = outfit(42, 400)
mark = paw(200)
glow, gpad = glow_of(mark, 0.4, 22)
t1, t2 = 'Golden Paw ', 'Studios'
w1 = d.textlength(t1, font=title); w2 = d.textlength(t2, font=title)
tag = 'Dog care tips  ·  Grooming  ·  Happy, healthy pups'
block = mark.width + 56 + max(w1+w2, d.textlength(tag, font=sub)); x0 = int((W-block)/2); cy = 720
my = cy - mark.height//2 - 6
ban.alpha_composite(glow, (x0-gpad, my-gpad))
ban.alpha_composite(mark, (x0, my))
tx = x0 + mark.width + 56
d.text((tx, cy-18), t1, font=title, fill=WHITE, anchor='ls')
d.text((tx+w1, cy-18), t2, font=title, fill=GOLD, anchor='ls')
d.text((tx+3, cy+58), tag, font=sub, fill=GREY, anchor='ls')
ban.convert('RGB').save(OUT+'/banner-2560x1440.png', optimize=True)
pv = ban.convert('RGB').resize((1280,720), Image.LANCZOS); pd = ImageDraw.Draw(pv); lf = outfit(20, 500)
for (a,b,c,e,lab,col) in [(0,254,2560,1186,'Desktop',(80,160,255)),(507,508,2053,931,'Phone (safe area)',(255,90,90))]:
    pd.rectangle([a/2,b/2,c/2-1,e/2], outline=col, width=3); pd.text((a/2+8,b/2+6), lab, fill=col, font=lf)
pv.save(OUT+'/banner-crop-preview.png', optimize=True)
# matching profile picture: site paw on dark background
pp = Image.new('RGBA', (800,800), BG+(255,)); gg = Image.new('L',(800,800),0); ggd = ImageDraw.Draw(gg)
for r in range(560,0,-4): ggd.ellipse([400-r,400-r,400+r,400+r], fill=int(255*(1-r/560)**1.2))
pp.paste(Image.new('RGBA',(800,800),BG_L+(255,)), mask=gg)
m = paw(440); gl, gp = glow_of(m, 0.35, 24)
pp.alpha_composite(gl, ((800-m.width)//2-gp, (800-m.height)//2-gp))
pp.alpha_composite(m, ((800-m.width)//2, (800-m.height)//2))
pp.convert('RGB').save(OUT+'/profile-picture-800x800.png', optimize=True)
print('ok')
