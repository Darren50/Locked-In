import time
import threading
from config import FOCUS_MINS, SHORT_BREAK_MINS, LONG_BREAK_MINS, SESSIONS_BEFORE_LONG
from core.focus import focus
from core.session import session_tracker
from services import sounds

class PomodoroTimer:
    def __init__(self, on_focus_end=None, on_focus_start=None):
        self._lock     = threading.Lock()
        self.session   = 1
        self.time_left = FOCUS_MINS * 60
        self.total     = FOCUS_MINS * 60
        self.mode      = "FOCUS"
        self.paused    = True
        self.active    = False
        self.on_focus_end   = on_focus_end   or (lambda completed: None)
        self.on_focus_start = on_focus_start or (lambda session:  None)

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
        if self.mode == "FOCUS":
            self.on_focus_end(True)
            sounds.play("session_complete")

        if self.mode == "FOCUS":
            is_long    = self.session % SESSIONS_BEFORE_LONG == 0
            self.mode  = "LONG BREAK" if is_long else "BREAK"
            self.total = LONG_BREAK_MINS * 60 if is_long else SHORT_BREAK_MINS * 60
        else:
            self.session += 1
            self.mode    = "FOCUS"
            self.total   = FOCUS_MINS * 60
            self.on_focus_start(self.session)
            sounds.play("break_over")

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


timer = PomodoroTimer(
    on_focus_end=lambda c: threading.Thread(
        target=session_tracker.end, args=(c,), daemon=True).start(),
    on_focus_start=lambda s: threading.Thread(
        target=session_tracker.start, args=(s,), daemon=True).start(),
)

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

def start_thread():
    threading.Thread(target=_timer_thread, daemon=True).start()