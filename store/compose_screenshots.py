#!/usr/bin/env python3
"""Compose 6.5" (1284x2778) App Store screenshots for Chores from raw iPhone captures.

Each entry: source capture, output name, headline, subline, and the vertical
slices of the capture to keep (status bar cropped off; the tab bar can be
stitched back under the content so half-visible sections don't show).
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'raw')
OUT = os.path.join(HERE, 'screenshots')
FONTS = os.environ.get('FONT_DIR', os.path.join(HERE, 'fonts'))
os.makedirs(OUT, exist_ok=True)

W, H = 1284, 2778
BG_TOP, BG_BOTTOM = (22, 36, 28), (11, 18, 14)  # from darkTheme.bg #0E1611
HEAD = (236, 246, 239)
ACCENT = (111, 211, 160)  # darkTheme.accent #6FD3A0
EDGE = (40, 60, 48)

H1 = ImageFont.truetype(os.path.join(FONTS, 'inter-latin-800-normal.woff'), 116)
H1_BIG = ImageFont.truetype(os.path.join(FONTS, 'inter-latin-800-normal.woff'), 150)
SUB = ImageFont.truetype(os.path.join(FONTS, 'inter-latin-500-normal.woff'), 54)

TAB = (1628, 1792)  # tab bar on an 828x1792 capture
SHOTS = [
    # src, out, headline, subline, slices, big headline
    ('today.png', '01_today.png', 'Cleaning\nSchedule', 'Only what’s due today', [(110, 1590), TAB], True),
    ('areas.png', '02_areas.png', 'Every Room on\nIts Own Rhythm', 'Rooms, pets, the yard and the car', [(110, 1215), TAB], False),
    ('chart.png', '03_chart.png', 'A Chore Chart\nfor the Family', 'Take turns and see who did what', [(110, 1558), TAB], False),
    # pdf.png is page 1 of the printed chart rendered at 300 dpi; shown as a sheet of paper
    ('pdf.png', '04_print.png', 'Print It for\nthe Fridge', 'A box for every day a chore is due', 'paper', False),
    ('checklist.png', '05_pick.png', 'Tick the Chores\nYou Do', 'Start from the usual ones or add your own', [(108, 1792)], False),
]


def gradient(w, h, top, bottom):
    col = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / (h - 1)
        col.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return col.resize((w, h))


def stitch(im, slices):
    if not slices:
        return im
    parts = [im.crop((0, a, im.width, b)) for a, b in slices]
    out = Image.new('RGB', (im.width, sum(p.height for p in parts)))
    y = 0
    for p in parts:
        out.paste(p, (0, y))
        y += p.height
    return out


def centered(draw, text, font, y, fill, gap):
    for line in text.split('\n'):
        box = draw.textbbox((0, 0), line, font=font)
        draw.text(((W - (box[2] - box[0])) / 2 - box[0], y), line, font=font, fill=fill)
        y += gap
    return y


def compose(src, out, title, sub, slices, big):
    path = os.path.join(SRC, src)
    if not os.path.exists(path):
        print('skip (no capture yet):', src)
        return
    canvas = gradient(W, H, BG_TOP, BG_BOTTOM).convert('RGBA')
    d = ImageDraw.Draw(canvas)
    font = H1_BIG if big else H1
    y = centered(d, title, font, 150, HEAD, int(font.size * 1.14))
    y = centered(d, sub, SUB, y + 28, ACCENT, 70) + 70

    paper = slices == 'paper'
    shot = Image.open(path).convert('RGB')
    if paper:
        # trim the blank bottom of the page so the sheet ends under the last row
        px = shot.load()
        bottom = shot.height - 1
        while bottom > 0 and all(px[x, bottom][0] > 250 for x in range(0, shot.width, 25)):
            bottom -= 1
        shot = shot.crop((0, 0, shot.width, min(shot.height, bottom + 90)))
        # the printed page sits close to the edge; give the sheet a paper margin
        pad = int(shot.width * 0.03)
        sheet = Image.new('RGB', (shot.width + 2 * pad, shot.height + pad), (255, 255, 255))
        sheet.paste(shot, (pad, pad))
        shot = sheet
    else:
        shot = stitch(shot, slices)
    max_w, max_h = (W - 60 if paper else W - 180), H - y - 110
    scale = min(max_w / shot.width, max_h / shot.height)
    sw, sh = int(shot.width * scale), int(shot.height * scale)
    shot = shot.resize((sw, sh), Image.LANCZOS)
    x = (W - sw) // 2
    r = 18 if paper else 54

    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x - 4, y + 18, x + sw + 4, y + sh + 30], radius=r, fill=(0, 0, 0, 170))
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(30)))

    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=r, fill=255)
    canvas.paste(shot, (x, y), mask)
    if not paper:
        edge = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(edge).rounded_rectangle([x - 3, y - 3, x + sw + 2, y + sh + 2], radius=r + 3, outline=EDGE + (255,), width=4)
        canvas = Image.alpha_composite(canvas, edge)
    canvas.convert('RGB').save(os.path.join(OUT, out), 'PNG')
    print(out, canvas.size, 'shot', (sw, sh), 'scale %.2f' % scale)


for s in SHOTS:
    compose(*s)
