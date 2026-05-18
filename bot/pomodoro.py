import time
import threading
import math
import mmap
import lgpio
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FB_DEVICE = "/dev/fb1"
W, H = 320, 240
FOCUS_MINS = 25
SHORT_BREAK_MINS = 5
LONG_BREAK_MINS = 15
SESSIONS_BEFORE_LONG = 4

PIN_K1, PIN_K2, PIN_K3, PIN_K4 = 4, 23, 24, 25

chip = lgpio.gpiochip_open(0)
for pin in [PIN_K1, PIN_K2, PIN_K3, PIN_K4]:
    lgpio.gpio_claim_input(chip, pin, lgpio.SET_PULL_UP)

k1 = threading.Event()
k2 = threading.Event()
k3 = threading.Event()
k4 = threading.Event()

def poll_buttons():
    prev = {PIN_K1: 1, PIN_K2: 1, PIN_K3: 1, PIN_K4: 1}
    pmap = {PIN_K1: k1, PIN_K2: k2, PIN_K3: k3, PIN_K4: k4}
    while True:
        for pin in [PIN_K1, PIN_K2, PIN_K3, PIN_K4]:
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
    FONT_TINY  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
except:
    FONT_BIG = FONT_MED = FONT_SMALL = FONT_TINY = None

_fb_file = open(FB_DEVICE, 'r+b')
_fb_mmap = mmap.mmap(_fb_file.fileno(), 240 * 320 * 2)

def write_lcd(img):
    rotated = img.rotate(-90, expand=True)
    arr = np.frombuffer(rotated.tobytes(), dtype=np.uint8) \
            .reshape(320, 240, 3).astype(np.uint16)
    rgb565 = ((arr[:,:,0] & 0xF8) << 8) | \
             ((arr[:,:,1] & 0xFC) << 3) | \
              (arr[:,:,2] >> 3)
    _fb_mmap.seek(0)
    _fb_mmap.write(rgb565.tobytes())

def fade(from_img, duration=0.25):
    black = Image.new("RGB", (W, H), (0, 0, 0))
    start = time.time()
    while True:
        alpha = (time.time() - start) / duration
        if alpha >= 1.0: break
        write_lcd(Image.blend(from_img, black, min(alpha, 1.0)))

def draw_cute(t):
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
            draw.ellipse([ex-13, eye_y-17, ex+3, eye_y-1], fill="white")
            draw.ellipse([ex+8, eye_y-9, ex+15, eye_y-2], fill="white")
    for bx in [lcx-50, rcx+50]:
        draw.ellipse([bx-20, eye_y+12, bx+20, eye_y+28], fill=(245, 160, 185))
    draw.arc([W//2-48, eye_y+38, W//2+48, eye_y+98],
             start=12, end=168, fill=(30, 18, 60), width=5)
    draw.text((10, 8), "LOCKED IN", fill=(105, 78, 195), font=FONT_MED)
    draw.text((18, 218), "K1 Start Timer    K2 Tasks",
              fill=(155, 135, 210), font=FONT_SMALL)
    return img

class PomodoroTimer:
    def __init__(self):
        self._lock = threading.Lock()
        self.session = 1
        self.time_left = FOCUS_MINS * 60
        self.total = FOCUS_MINS * 60
        self.mode = "FOCUS"
        self.paused = True
        self.active = False

    def start(self):
        with self._lock:
            self.paused = False
            self.active = True

    def toggle_pause(self):
        with self._lock:
            if self.active:
                self.paused = not self.paused

    def skip(self):
        with self._lock:
            self._next_phase()

    def full_stop(self):
        with self._lock:
            self.session = 1
            self.time_left = FOCUS_MINS * 60
            self.total = FOCUS_MINS * 60
            self.mode = "FOCUS"
            self.paused = True
            self.active = False

    def _next_phase(self):
        if self.mode == "FOCUS":
            is_long = self.session % SESSIONS_BEFORE_LONG == 0
            self.mode = "LONG BREAK" if is_long else "BREAK"
            self.total = LONG_BREAK_MINS * 60 if is_long else SHORT_BREAK_MINS * 60
        else:
            self.session += 1
            self.mode = "FOCUS"
            self.total = FOCUS_MINS * 60
        self.time_left = self.total
        self.paused = True

    def tick(self):
        with self._lock:
            if self.active and not self.paused and self.time_left > 0:
                self.time_left -= 1
                if self.time_left == 0:
                    self._next_phase()

    def state(self):
        with self._lock:
            return dict(session=self.session, time_left=self.time_left,
                        total=self.total, mode=self.mode,
                        paused=self.paused, active=self.active)

timer = PomodoroTimer()

def _timer_thread():
    last = time.time()
    while True:
        now = time.time()
        if now - last >= 1.0:
            timer.tick()
            last = now
        time.sleep(0.05)

threading.Thread(target=_timer_thread, daemon=True).start()

def draw_pomodoro(ts):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    accent = (220, 80, 80) if ts['mode'] == "FOCUS" else (80, 200, 120)
    bg_badge = (60, 15, 15) if ts['mode'] == "FOCUS" else (15, 55, 25)
    draw.text((12, 10), "LOCKED IN", fill=(160, 160, 220), font=FONT_MED)
    draw.rounded_rectangle([200, 7, 308, 30], radius=7, fill=bg_badge, outline=accent, width=1)
    draw.text((208, 11), "BREAK" if "BREAK" in ts['mode'] else ts['mode'],
              fill=accent, font=FONT_SMALL)
    mins, secs = divmod(ts['time_left'], 60)
    if not ts['active']:
        timer_col = (85, 85, 105)
        draw.text((72, 57), "PRESS K1 TO START", fill=(175, 170, 95), font=FONT_TINY)
    elif ts['paused']:
        timer_col = (140, 140, 140)
        draw.text((120, 57), "PAUSED", fill=(220, 200, 80), font=FONT_SMALL)
    else:
        timer_col = "white"
    draw.text((45, 75), f"{mins:02d}:{secs:02d}", fill=timer_col, font=FONT_BIG)
    bar_w = int(300 * (ts['total'] - ts['time_left']) / max(ts['total'], 1))
    draw.rectangle([10, 185, 310, 191], fill=(40, 40, 60))
    draw.rectangle([10, 185, 10+bar_w, 191], fill=accent)
    draw.text((12, 200), f"Session {ts['session']} of {SESSIONS_BEFORE_LONG}",
              fill=(120, 120, 140), font=FONT_SMALL)
    draw.text((12, 222), "K1 Pause  K2 Skip  K3 End  K4 Home",
              fill=(60, 60, 80), font=FONT_SMALL)
    return img

def run_idle(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img: fade(last_img)
    start = time.time()
    while True:
        t = time.time() - start
        write_lcd(draw_cute(t))
        if k1.is_set():
            k1.clear(); return "pomodoro", draw_cute(t)
        if k2.is_set():
            k2.clear(); return "tasks", draw_cute(t)
        k4.clear()

def run_pomodoro(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img: fade(last_img)
    while True:
        ts  = timer.state()
        img = draw_pomodoro(ts)
        write_lcd(img)
        if k4.is_set():
            k4.clear(); return "idle", img
        if k3.is_set() and ts['active']:
            k3.clear(); timer.full_stop(); return "idle", img
        if k2.is_set() and ts['active']:
            k2.clear(); timer.skip()
        if k1.is_set():
            k1.clear()
            if not ts['active']: timer.start()
            else: timer.toggle_pause()

def run_tasks(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img: fade(last_img)
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((48, 90), "Tasks coming soon!", fill="white", font=FONT_MED)
    draw.text((65, 218), "K1 Back    K4 Home", fill=(80, 80, 100), font=FONT_SMALL)
    write_lcd(img)
    while True:
        if k1.is_set() or k4.is_set():
            k1.clear(); k4.clear(); return "idle", img

def main():
    state, last_img = "idle", None
    print("Locked-In started!")
    while True:
        if   state == "idle":     state, last_img = run_idle(last_img)
        elif state == "pomodoro": state, last_img = run_pomodoro(last_img)
        elif state == "tasks":    state, last_img = run_tasks(last_img)

if __name__ == "__main__":
    main()