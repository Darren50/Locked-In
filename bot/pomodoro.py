import time
import threading
import math
import mmap
import lgpio
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from picamera2 import Picamera2
import mediapipe as mp
import firebase_admin
from firebase_admin import credentials, firestore as fb_firestore
from datetime import datetime, timezone

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

# ── FIREBASE ──────────────────────────────────────────────────

USER_UID = "WQDfEKX62kRbmdnhZL5gSGd4zuq1"

cred = credentials.Certificate("/home/darren/firebase-key.json")
firebase_admin.initialize_app(cred)
db = fb_firestore.client()

# ── BACKGROUND TIMER ──────────────────────────────────────────

class PomodoroTimer:
    def __init__(self):
        self._lock     = threading.Lock()
        self.session   = 1
        self.time_left = FOCUS_MINS * 60
        self.total     = FOCUS_MINS * 60
        self.mode      = "FOCUS"
        self.paused    = True
        self.active    = False

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
            self.session   = 1
            self.time_left = FOCUS_MINS * 60
            self.total     = FOCUS_MINS * 60
            self.mode      = "FOCUS"
            self.paused    = True
            self.active    = False

    def _next_phase(self):
        # Save session if ending a focus phase
        if self.mode == "FOCUS":
            threading.Thread(
                target=session_tracker.end,
                args=(True,),
                daemon=True
            ).start()

        if self.mode == "FOCUS":
            is_long    = self.session % SESSIONS_BEFORE_LONG == 0
            self.mode  = "LONG BREAK" if is_long else "BREAK"
            self.total = LONG_BREAK_MINS * 60 if is_long else SHORT_BREAK_MINS * 60
        else:
            self.session += 1
            self.mode    = "FOCUS"
            self.total   = FOCUS_MINS * 60
            # Start tracking new focus session
            threading.Thread(
                target=session_tracker.start,
                args=(self.session,),
                daemon=True
            ).start()

        self.time_left = self.total
        self.paused    = True

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
            ts = timer.state()
            timer.tick()
            if ts['active'] and not ts['paused'] and ts['mode'] == "FOCUS":
                session_tracker.tick(focus.is_focused())
            last = now
        time.sleep(0.05)

threading.Thread(target=_timer_thread, daemon=True).start()

# ── FOCUS MONITOR ─────────────────────────────────────────────

class FocusMonitor:
    def __init__(self):
        self.focused    = True
        self.away_since = None
        self.AWAY_LIMIT = 3.0
        self._lock      = threading.Lock()

    def update(self, face_detected):
        with self._lock:
            if face_detected:
                self.focused    = True
                self.away_since = None
            else:
                if self.away_since is None:
                    self.away_since = time.time()
                if time.time() - self.away_since >= self.AWAY_LIMIT:
                    self.focused = False

    def is_focused(self):
        with self._lock:
            return self.focused

focus = FocusMonitor()

def _camera_thread():
    cam = Picamera2()
    cfg = cam.create_preview_configuration(
        main={"size": (320, 240), "format": "RGB888"}
    )
    cam.configure(cfg)
    cam.start()
    time.sleep(1)

    mp_face  = mp.solutions.face_detection
    detector = mp_face.FaceDetection(min_detection_confidence=0.5)
    was_focused = True

    while True:
        frame         = cam.capture_array()
        results       = detector.process(frame)
        face_detected = bool(results.detections)
        focus.update(face_detected)

        ts = timer.state()
        if ts['active'] and ts['mode'] == "FOCUS":
            if not focus.is_focused() and not ts['paused']:
                timer.toggle_pause()
                print("Auto-paused — user away")
            elif focus.is_focused() and ts['paused'] and not was_focused:
                timer.toggle_pause()
                print("Auto-resumed — user back")

        was_focused = focus.is_focused()
        time.sleep(0.1)

threading.Thread(target=_camera_thread, daemon=True).start()

# ── SESSION TRACKER ───────────────────────────────────────────

class SessionTracker:
    def __init__(self):
        self._lock        = threading.Lock()
        self.doc_id       = None
        self.total_secs   = 0
        self.focused_secs = 0.0

    def start(self, session_num):
        with self._lock:
            self.doc_id       = f"session_{int(time.time())}"
            self.total_secs   = 0
            self.focused_secs = 0.0
            doc_id            = self.doc_id
        db.collection("users").document(USER_UID) \
          .collection("sessions").document(doc_id).set({
            "startTime":     datetime.now(timezone.utc),
            "startedAt":     datetime.now(timezone.utc).isoformat(),
            "sessionNumber": session_num,
            "plannedMins":   FOCUS_MINS,
            "completed":     False,
            "focusPercent":  0,
        })
        print(f"Session {session_num} started → Firestore")

    def tick(self, face_present):
        with self._lock:
            self.total_secs += 1
            if face_present:
                self.focused_secs += 1

    def end(self, completed):
        with self._lock:
            if self.doc_id is None:
                return
            pct          = round(self.focused_secs / max(self.total_secs, 1), 2)
            duration_mins = round(self.focused_secs / 60, 1)
            doc_id       = self.doc_id
            self.doc_id  = None
        db.collection("users").document(USER_UID) \
          .collection("sessions").document(doc_id).update({
            "endTime":         datetime.now(timezone.utc),
            "focusPercent":    pct,
            "totalSecs":       self.total_secs,
            "focusedSecs":     int(self.focused_secs),
            "completed":       completed,
            "durationMinutes": duration_mins,
        })
        summary_ref = db.collection("users").document(USER_UID) \
                       .collection("stats").document("summary")
        summary_ref.set({
            "totalFocusMinutes": fb_firestore.Increment(duration_mins),
            "totalSessions":     fb_firestore.Increment(1 if completed else 0),
            "lastSessionAt":     datetime.now(timezone.utc).isoformat(),
        }, merge=True)
        print(f"Session saved → focusPercent: {pct}, duration: {duration_mins}m")

session_tracker = SessionTracker()

# ── LCD ───────────────────────────────────────────────────────

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
        if alpha >= 1.0:
            break
        write_lcd(Image.blend(from_img, black, min(alpha, 1.0)))

# ── CUTE FACE ─────────────────────────────────────────────────

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
            draw.line([ex-er+6, eye_y, ex+er-6, eye_y],
                      fill=(30, 18, 60), width=6)
    else:
        for ex in [lcx, rcx]:
            draw.ellipse([ex-er, eye_y-er, ex+er, eye_y+er], fill=(30, 18, 60))
            draw.ellipse([ex-13, eye_y-17, ex+3,  eye_y-1],  fill="white")
            draw.ellipse([ex+8,  eye_y-9,  ex+15, eye_y-2],  fill="white")

    for bx in [lcx-50, rcx+50]:
        draw.ellipse([bx-20, eye_y+12, bx+20, eye_y+28], fill=(245, 160, 185))

    draw.arc([W//2-48, eye_y+38, W//2+48, eye_y+98],
             start=12, end=168, fill=(30, 18, 60), width=5)

    draw.text((10, 8), "LOCKED IN", fill=(105, 78, 195), font=FONT_MED)

    if ts and ts['active'] and "BREAK" in ts['mode']:
        mins, secs = divmod(ts['time_left'], 60)
        draw.text((175, 10), f"BREAK {mins:02d}:{secs:02d}",
                  fill=(70, 190, 110), font=FONT_TINY)
        draw.text((18, 218), "K1 Resume    K2 Tasks",
                  fill=(155, 135, 210), font=FONT_SMALL)
    else:
        draw.text((18, 218), "K1 Start Timer    K2 Tasks",
                  fill=(155, 135, 210), font=FONT_SMALL)
    return img

# ── SERIOUS FACE ──────────────────────────────────────────────

def draw_serious(t, ts):
    BG = (14, 8, 22)
    img  = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    bob   = math.sin(t * 0.8) * 2
    eye_y = int(108 + bob * 0.2)
    lcx, rcx = 105, 215
    ew, eh   = 44, 24

    by = eye_y - eh - 14
    draw.line([lcx-ew+2, by-5, lcx+ew-2, by+7],  fill=(215, 205, 235), width=6)
    draw.line([rcx-ew+2, by+7, rcx+ew-2, by-5],  fill=(215, 205, 235), width=6)

    draw.rectangle([lcx-ew-12, eye_y-eh-4, rcx+ew+12, eye_y+eh+4], fill=(8, 8, 10))
    draw.rectangle([lcx+ew-4,  eye_y-7,    rcx-ew+4,  eye_y+7],    fill=(8, 8, 10))

    for ex in [lcx, rcx]:
        draw.rectangle([ex-ew+2, eye_y-eh+1, ex+ew-2, eye_y+eh-1], fill=(65, 7, 7))
        draw.rectangle([ex-ew+7, eye_y-eh+4, ex-3,    eye_y+2],    fill=(130, 22, 22))

    draw.line([W//2-24, eye_y+62, W//2+24, eye_y+62],
              fill=(195, 185, 215), width=5)

    mins, secs = divmod(ts['time_left'], 60)
    st = "⏸" if ts['paused'] else "▶"
    draw.text((10, 8), f"{st} FOCUS  {mins:02d}:{secs:02d}  S{ts['session']}",
              fill=(210, 65, 65), font=FONT_SMALL)
    draw.text((18, 218), "K1 Resume Timer    K2 Tasks",
              fill=(110, 90, 135), font=FONT_SMALL)
    return img

# ── IDLE ──────────────────────────────────────────────────────

def run_idle(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)
    start = time.time()
    while True:
        t        = time.time() - start
        ts       = timer.state()
        on_focus = ts['active'] and ts['mode'] == "FOCUS"
        img = draw_serious(t, ts) if on_focus else draw_cute(t, ts)
        write_lcd(img)

        if k1.is_set():
            k1.clear(); return "pomodoro", img
        if k2.is_set():
            k2.clear(); return "tasks", img
        k4.clear()

# ── POMODORO ──────────────────────────────────────────────────

def draw_pomodoro(ts):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)

    accent   = (220, 80, 80)  if ts['mode'] == "FOCUS" else (80, 200, 120)
    bg_badge = (60, 15, 15)   if ts['mode'] == "FOCUS" else (15, 55, 25)

    draw.text((12, 10), "LOCKED IN", fill=(160, 160, 220), font=FONT_MED)
    draw.rounded_rectangle([200, 7, 308, 30], radius=7,
                            fill=bg_badge, outline=accent, width=1)
    draw.text((208, 11),
              "BREAK" if "BREAK" in ts['mode'] else ts['mode'],
              fill=accent, font=FONT_SMALL)

    mins, secs = divmod(ts['time_left'], 60)

    if not ts['active']:
        timer_col = (85, 85, 105)
        draw.text((72, 57), "PRESS K1 TO START",
                  fill=(175, 170, 95), font=FONT_TINY)
    elif ts['paused']:
        timer_col = (140, 140, 140)
        draw.text((120, 57), "PAUSED", fill=(220, 200, 80), font=FONT_SMALL)
    else:
        timer_col = "white"

    draw.text((45, 75), f"{mins:02d}:{secs:02d}", fill=timer_col, font=FONT_BIG)

    if not focus.is_focused() and ts['active'] and ts['mode'] == "FOCUS":
        draw.rounded_rectangle([10, 50, 310, 72], radius=6, fill=(180, 40, 40))
        draw.text((30, 55), "⚠ Come back! Timer paused.",
                  fill="white", font=FONT_SMALL)

    bar_w = int(300 * (ts['total'] - ts['time_left']) / max(ts['total'], 1))
    draw.rectangle([10, 185, 310, 191], fill=(40, 40, 60))
    draw.rectangle([10, 185, 10+bar_w, 191], fill=accent)

    draw.text((12, 200), f"Session {ts['session']} of {SESSIONS_BEFORE_LONG}",
              fill=(120, 120, 140), font=FONT_SMALL)

    if not ts['active']:
        draw.text((12, 222), "K1 Start                        K4 Home",
                  fill=(60, 60, 80), font=FONT_SMALL)
    else:
        draw.text((12, 222), "K1 Pause  K2 Skip  K3 End  K4 Home",
                  fill=(60, 60, 80), font=FONT_SMALL)
    return img

def run_pomodoro(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)
    while True:
        ts  = timer.state()
        img = draw_pomodoro(ts)
        write_lcd(img)

        if k4.is_set():
            k4.clear(); return "idle", img

        if k3.is_set() and ts['active']:
            k3.clear(); return "confirm_end", img

        if k2.is_set() and ts['active']:
            k2.clear()
            if ts['mode'] == "FOCUS":
                session_tracker.end(completed=False)
            timer.skip()
            if timer.state()['mode'] == "FOCUS":
                session_tracker.start(timer.state()['session'])

        if k1.is_set():
            k1.clear()
            if not ts['active']:
                timer.start()
                session_tracker.start(ts['session'])
            else:
                timer.toggle_pause()

# ── CONFIRM END ───────────────────────────────────────────────

def run_confirm_end(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)

    img  = Image.new("RGB", (W, H), (15, 10, 25))
    draw = ImageDraw.Draw(img)
    draw.text((78, 42),  "End Session?",           fill="white",         font=FONT_MED)
    draw.text((42, 82),  "Timer will reset to session 1.", fill=(160, 150, 180), font=FONT_SMALL)
    draw.rounded_rectangle([28,  118, 142, 165], radius=10, fill=(155, 30, 30))
    draw.text((57,  130), "YES", fill="white", font=FONT_MED)
    draw.rounded_rectangle([178, 118, 292, 165], radius=10, fill=(30, 125, 65))
    draw.text((207, 130), "NO",  fill="white", font=FONT_MED)
    draw.text((22, 218), "K1 Yes, end it    K2 No, go back",
              fill=(100, 90, 120), font=FONT_SMALL)
    write_lcd(img)

    while True:
        if k1.is_set():
            k1.clear()
            session_tracker.end(completed=False)
            timer.full_stop()
            return "idle", img
        if k2.is_set() or k4.is_set():
            k2.clear(); k4.clear(); return "pomodoro", img

# ── TASKS ─────────────────────────────────────────────────────

VISIBLE_ROWS = 5

def draw_tasks(tasks, selected_idx, scroll_offset, loading=False):
    img  = Image.new("RGB", (W, H), (10, 10, 25))
    draw = ImageDraw.Draw(img)

    draw.text((12, 8), "TASKS", fill=(160, 160, 220), font=FONT_MED)

    if loading:
        draw.text((100, 110), "Loading...", fill=(120, 120, 140), font=FONT_MED)
        draw.text((18, 222), "K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
        return img

    if not tasks:
        draw.text((72, 110), "No tasks yet!", fill=(120, 120, 140), font=FONT_MED)
        draw.text((18, 222), "K4 Home", fill=(60, 60, 80), font=FONT_SMALL)
        return img

    done_count = sum(1 for t in tasks if t.get("done"))
    count_str  = f"{done_count}/{len(tasks)} done"
    draw.text((W - 10 - len(count_str)*6, 12), count_str, fill=(100, 100, 130), font=FONT_TINY)

    draw.line([10, 34, W-10, 34], fill=(40, 40, 60), width=1)

    visible = tasks[scroll_offset : scroll_offset + VISIBLE_ROWS]
    for i, task in enumerate(visible):
        abs_idx = scroll_offset + i
        row_y   = 40 + i * 32

        if abs_idx == selected_idx:
            draw.rounded_rectangle([8, row_y-2, W-8, row_y+26], radius=5, fill=(40, 40, 70))

        if task.get("done"):
            cb_col, cb_label, txt_col = (80, 200, 120), "[x]", (120, 120, 140)
        else:
            cb_col, cb_label, txt_col = (140, 140, 160), "[ ]", (210, 210, 225)

        draw.text((14, row_y+2), cb_label, fill=cb_col, font=FONT_SMALL)
        text = task.get("text", "")
        if len(text) > 36:
            text = text[:35] + "…"
        draw.text((52, row_y+2), text, fill=txt_col, font=FONT_SMALL)

    if scroll_offset > 0:
        draw.text((W-16, 38), "▲", fill=(100, 100, 140), font=FONT_TINY)
    if scroll_offset + VISIBLE_ROWS < len(tasks):
        draw.text((W-16, 196), "▼", fill=(100, 100, 140), font=FONT_TINY)

    draw.text((12, 222), "K1 Toggle  K2↓  K3↑  K4 Home",
              fill=(60, 60, 80), font=FONT_SMALL)
    return img


def run_tasks(last_img=None):
    k1.clear(); k2.clear(); k3.clear(); k4.clear()
    if last_img:
        fade(last_img)

    # Show loading until first snapshot arrives
    write_lcd(draw_tasks([], 0, 0, loading=True))

    tasks      = []
    tasks_lock = threading.Lock()
    first_snap = threading.Event()

    def _on_tasks(docs, changes, read_time):
        new_tasks = sorted(
            [{"id": d.id, **d.to_dict()} for d in docs],
            key=lambda t: t.get("order", 0)
        )
        with tasks_lock:
            tasks[:] = new_tasks
        first_snap.set()

    watch = db.collection("users").document(USER_UID) \
               .collection("tasks").on_snapshot(_on_tasks)

    first_snap.wait(timeout=5)  # wait up to 5s for first data

    selected_idx  = 0
    scroll_offset = 0

    while True:
        with tasks_lock:
            snapshot = list(tasks)

        # Clamp selection if tasks were deleted
        if snapshot:
            selected_idx = min(selected_idx, len(snapshot) - 1)

        img = draw_tasks(snapshot, selected_idx, scroll_offset)
        write_lcd(img)

        if k4.is_set():
            k4.clear()
            watch.unsubscribe()
            return "idle", img

        if k1.is_set() and snapshot:
            k1.clear()
            t        = snapshot[selected_idx]
            new_done = not t.get("done", False)
            with tasks_lock:
                tasks[selected_idx]["done"] = new_done
            db.collection("users").document(USER_UID) \
              .collection("tasks").document(t["id"]) \
              .update({"done": new_done})

        if k2.is_set() and snapshot:
            k2.clear()
            selected_idx = min(selected_idx + 1, len(snapshot) - 1)
            if selected_idx >= scroll_offset + VISIBLE_ROWS:
                scroll_offset += 1

        if k3.is_set() and snapshot:
            k3.clear()
            selected_idx = max(selected_idx - 1, 0)
            if selected_idx < scroll_offset:
                scroll_offset -= 1

# ── MAIN ──────────────────────────────────────────────────────

def main():
    state, last_img = "idle", None
    print("Locked-In started!")
    while True:
        if   state == "idle":        state, last_img = run_idle(last_img)
        elif state == "pomodoro":    state, last_img = run_pomodoro(last_img)
        elif state == "confirm_end": state, last_img = run_confirm_end(last_img)
        elif state == "tasks":       state, last_img = run_tasks(last_img)

if __name__ == "__main__":
    main()
