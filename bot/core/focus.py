import time
import threading

import time
import threading

class FocusMonitor:
    def __init__(self):
        self.focused = True
        self.state   = "FOCUSED"
        self._since  = None
        self._reason = None
        self.AWAY_LIMIT     = 3.0
        self.DISTRACT_LIMIT = 1.5
        self.DROWSY_LIMIT   = 2.0
        self._lock = threading.Lock()
        self.enabled = True

    def update(self, face_detected, looking_away=False, eyes_closed=False):
        with self._lock:
            now = time.time()

            if not face_detected:
                reason = "AWAY"
            elif eyes_closed:
                reason = "DROWSY"
            elif looking_away:
                reason = "DISTRACTED"
            else:
                reason = None

            if reason is None:
                self.focused = True
                self.state   = "FOCUSED"
                self._since  = None
                self._reason = None
            else:
                if self._since is None or self._reason != reason:
                    self._since  = now
                    self._reason = reason

                if reason == "DROWSY":
                    grace = self.DROWSY_LIMIT
                elif reason == "DISTRACTED":
                    grace = self.DISTRACT_LIMIT
                else:
                    grace = self.AWAY_LIMIT

                if now - self._since >= grace:
                    self.focused = False
                    self.state   = reason

    def is_focused(self):
        with self._lock:
            return self.focused

    def get_state(self):
        with self._lock:
            return self.state

    def toggle_enabled(self):
        with self._lock:
            self.enabled = not self.enabled
            # reset so a stale AWAY/DROWSY doesn't linger after re-enabling
            self.focused = True
            self.state   = "FOCUSED"
            self._since  = None
            self._reason = None
            return self.enabled

    def is_enabled(self):
        with self._lock:
            return self.enabled

focus = FocusMonitor()