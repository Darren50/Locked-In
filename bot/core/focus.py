import time
import threading

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