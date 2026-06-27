import math
from PIL import Image, ImageDraw
from config import W, H
from fonts import FONT_MED, FONT_SMALL, FONT_TINY

def draw_cute(t, ts=None):
    BG = (238, 230, 255)
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    bob   = math.sin(t * 1.2) * 5
    eye_y = int(102 + bob * 0.4)
    lcx, rcx, er = 105, 215, 36
    blink = (t % 5.0) < 0.15

    if blink:
        for ex in [lcx, rcx]:
            draw.line([ex-er+6, eye_y, ex+er-6, eye_y], fill=(30, 18, 60), width=6)
    else:
        for ex in [lcx, rcx]:
            draw.ellipse([ex-er, eye_y-er, ex+er, eye_y+er], fill=(30, 18, 60))
            draw.ellipse([ex-13, eye_y-17, ex+3,  eye_y-1],  fill="white")
            draw.ellipse([ex+8,  eye_y-9,  ex+15, eye_y-2],  fill="white")

    for bx in [lcx-50, rcx+50]:
        draw.ellipse([bx-20, eye_y+12, bx+20, eye_y+28], fill=(245, 160, 185))

    draw.arc([W//2-48, eye_y+38, W//2+48, eye_y+98], start=12, end=168, fill=(30, 18, 60), width=5)
    draw.text((10, 8), "LOCKED IN", fill=(105, 78, 195), font=FONT_MED)

    if ts and ts['active'] and "BREAK" in ts['mode']:
        mins, secs = divmod(ts['time_left'], 60)
        draw.text((175, 10), f"BREAK {mins:02d}:{secs:02d}", fill=(70, 190, 110), font=FONT_TINY)

    draw.text((10, 218), "K1 Timer  K2 Tasks  K3 AI", fill=(155, 135, 210), font=FONT_SMALL)
    return img

def draw_serious(t, ts):
    BG = (14, 8, 22)
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    bob   = math.sin(t * 0.8) * 2
    eye_y = int(108 + bob * 0.2)
    lcx, rcx = 105, 215
    ew, eh   = 44, 24

    by = eye_y - eh - 14
    draw.line([lcx-ew+2, by-5, lcx+ew-2, by+7], fill=(215, 205, 235), width=6)
    draw.line([rcx-ew+2, by+7, rcx+ew-2, by-5], fill=(215, 205, 235), width=6)

    draw.rectangle([lcx-ew-12, eye_y-eh-4, rcx+ew+12, eye_y+eh+4], fill=(8, 8, 10))
    draw.rectangle([lcx+ew-4,  eye_y-7,    rcx-ew+4,  eye_y+7],    fill=(8, 8, 10))

    for ex in [lcx, rcx]:
        draw.rectangle([ex-ew+2, eye_y-eh+1, ex+ew-2, eye_y+eh-1], fill=(65, 7, 7))
        draw.rectangle([ex-ew+7, eye_y-eh+4, ex-3,    eye_y+2],    fill=(130, 22, 22))

    draw.line([W//2-24, eye_y+62, W//2+24, eye_y+62], fill=(195, 185, 215), width=5)

    mins, secs = divmod(ts['time_left'], 60)
    st = "⏸" if ts['paused'] else "▶"
    draw.text((10, 8), f"{st} FOCUS  {mins:02d}:{secs:02d}  S{ts['session']}", fill=(210, 65, 65), font=FONT_SMALL)
    draw.text((10, 218), "K1 Timer  K2 Tasks  K3 AI", fill=(110, 90, 135), font=FONT_SMALL)
    return img