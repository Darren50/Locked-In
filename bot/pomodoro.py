import time
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FB_DEVICE = "/dev/fb1"
W, H = 320, 240

FOCUS_MINS = 25

try:
    FONT_BIG   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 68)
    FONT_MED   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
    FONT_SMALL = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except:
    FONT_BIG = FONT_MED = FONT_SMALL = None

def write_lcd(img):
    rotated = img.rotate(-90, expand=True)
    arr = np.frombuffer(rotated.tobytes(), dtype=np.uint8) \
            .reshape(320, 240, 3).astype(np.uint16)
    rgb565 = ((arr[:,:,0] & 0xF8) << 8) | \
             ((arr[:,:,1] & 0xFC) << 3) | \
              (arr[:,:,2] >> 3)
    with open(FB_DEVICE, "wb") as f:
        f.write(rgb565.tobytes())

def draw_timer(t, total):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((12, 10), "LOCKED IN", fill=(160, 160, 220), font=FONT_MED)
    mins, secs = divmod(t, 60)
    draw.text((45, 75), f"{mins:02d}:{secs:02d}", fill="white", font=FONT_BIG)
    bar_w = int(300 * (total - t) / total)
    draw.rectangle([10, 185, 310, 191], fill=(40, 40, 60))
    draw.rectangle([10, 185, 10+bar_w, 191], fill=(220, 80, 80))
    return img

total = FOCUS_MINS * 60
for t in range(total, -1, -1):
    write_lcd(draw_timer(t, total))
    if t > 0:
        time.sleep(1)

print("Session done")