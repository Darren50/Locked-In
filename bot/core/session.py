import time
import threading
from datetime import datetime, timezone
from firebase_admin import firestore as fb_firestore
from config import USER_UID, FOCUS_MINS
from services import db as db_service

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
        db_service.db.collection("users").document(USER_UID) \
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
            pct           = round(self.focused_secs / max(self.total_secs, 1), 2)
            duration_mins = self.focused_secs / 60
            doc_id        = self.doc_id
            self.doc_id   = None
        db_service.db.collection("users").document(USER_UID) \
          .collection("sessions").document(doc_id).update({
            "endTime":         datetime.now(timezone.utc),
            "focusPercent":    pct,
            "totalSecs":       self.total_secs,
            "focusedSecs":     int(self.focused_secs),
            "completed":       completed,
            "durationMinutes": duration_mins,
        })
        summary_ref = db_service.db.collection("users").document(USER_UID) \
                       .collection("stats").document("summary")
        summary_ref.set({
            "totalFocusMinutes": fb_firestore.Increment(duration_mins),
            "totalSessions":     fb_firestore.Increment(1 if completed else 0),
            "lastSessionAt":     datetime.now(timezone.utc).isoformat(),
        }, merge=True)
        print(f"Session saved → focusPercent: {pct}, duration: {duration_mins:.2f}m")

session_tracker = SessionTracker()