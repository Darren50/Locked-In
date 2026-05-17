import time
import threading
import lgpio
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FB_DEVICE = "/dev/fb1"  #for  second monitor spi
W, H = 320, 240
FOCUS_MINS = 25
SHORT_BREAK_MINS = 5
SESSIONS_BEFORE_LONG = 4

PIN_K1, PIN_K2, PIN_K3 = 4, 23, 24 #key1 mapped to gpio  4, 2 to 23, 3 to 24, 4 to 25

chip = lgpio.gpiochip_open(0)
for pin in [PIN_K1, PIN_K2, PIN_K3]:
    lgpio.gpio_claim_input(chip, pin, lgpio.SET_PULL_UP)

k1 = threading.Event()
k2 = threading.Event()
k3 = threading.Event()


def poll_buttons():
    prev = {PIN_K1: 1, PIN_K2: 1, PIN_K3: 1}
    pmap = {PIN_K1: k1, PIN_K2: k2, PIN_K3: k3}
    while True:
        for pin in [PIN_K1, PIN_K2, PIN_K3]:
            val = lgpio.gpio_read(chip, pin)
            if val == 0 and prev[pin] == 1:
                pmap[pin].set()
            prev[pin] = val
        time.sleep(0.05)

threading.Thread(target=poll_buttons, daemon=True).start()

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

paused  = threading.Event()
do_skip = threading.Event()
do_reset = threading.Event()

def draw_timer(t, total, is_paused):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((12, 10), "LOCKED IN", fill=(160, 160, 220), font=FONT_MED)
    mins, secs = divmod(t, 60)
    draw.text((45, 75), f"{mins:02d}:{secs:02d}",
              fill=(140, 140, 140) if is_paused else "white", font=FONT_BIG)
    if is_paused:
        draw.text((125, 57), "PAUSED", fill=(220, 200, 80), font=FONT_SMALL)
    bar_w = int(300 * (total - t) / total)
    draw.rectangle([10, 185, 310, 191], fill=(40, 40, 60))
    draw.rectangle([10, 185, 10+bar_w, 191], fill=(220, 80, 80))
    draw.text((12, 222), "K1 Pause  K2 Skip  K3 Reset",
              fill=(60, 60, 80), font=FONT_SMALL)
    return img

def countdown(duration):
    t         = duration
    last_tick = time.time()
    while t >= 0:
        if k3.is_set(): k3.clear(); return "reset"
        if k2.is_set(): k2.clear(); return "skip"
        if k1.is_set():
            k1.clear()
            if paused.is_set(): paused.clear()
            else: paused.set()
        now = time.time()
        if not paused.is_set() and now - last_tick >= 1.0:
            t -= 1
            last_tick = now
        write_lcd(draw_timer(t, duration, paused.is_set()))
        time.sleep(0.1)
    return "done"

session = 1
while True:
    result = countdown(FOCUS_MINS * 60)
    if result == "reset":
        session = 1
        continue
    print(f"Session {session} done!")
    result = countdown(SHORT_BREAK_MINS * 60)
    if result == "reset":
        session = 1
        continue
    session += 1