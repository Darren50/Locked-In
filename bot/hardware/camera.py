import time
import threading
from services import sounds
from picamera2 import Picamera2
import mediapipe as mp
from config import W, H
from core.focus import focus
from core.timer import timer
from core import vision

def _camera_thread():
    cam = Picamera2()
    cfg = cam.create_preview_configuration(main={"size": (W, H), "format": "RGB888"})
    cam.configure(cfg)
    cam.start()
    time.sleep(1)

    mp_mesh  = mp.solutions.face_mesh
    detector = mp_mesh.FaceMesh(
        max_num_faces=1,
        refine_landmarks=False,
        min_detection_confidence=0.4,
        min_tracking_confidence=0.4,
    )

    TOL          = 0.18      # deviation from baseline that counts as "away"
    CALIB_FRAMES = 30        # ~3 s of calibration at start of a session
    baseline     = None
    calib        = []
    last_session = None
    was_focused  = True

    while True:
        if not focus.is_enabled():
            time.sleep(0.3)
            continue
        frame   = cam.capture_array()
        results = detector.process(frame)
        ts      = timer.state()

        # Re-calibrate whenever a NEW focus session begins
        if ts['active'] and ts['mode'] == "FOCUS" and ts['session'] != last_session:
            baseline = None
            calib    = []
            last_session = ts['session']

        if results.multi_face_landmarks:
            lm          = results.multi_face_landmarks[0].landmark
            r           = vision.horizontal_ratio(lm)
            closed, ear = vision.eyes_closed(lm, W, H)

            if baseline is None:
                calib.append(r)
                if len(calib) >= CALIB_FRAMES:
                    baseline = sum(calib) / len(calib)
                    print(f"Calibrated baseline = {baseline:.3f}")
                away = False                     # don't flag while calibrating
            else:
                away = abs(r - baseline) > TOL    # FIXED baseline — no drift

            focus.update(True, looking_away=away, eyes_closed=closed)
            print(f"r={r:.3f} base={baseline} away={away} "
                  f"ear={ear:.3f} -> {focus.get_state()}")
        else:
            focus.update(False)
            print("NO FACE")

        if ts['active'] and ts['mode'] == "FOCUS":
            if not focus.is_focused() and not ts['paused']:
                timer.toggle_pause()
                sounds.play("alert")
                print(f"Auto-paused — {focus.get_state()}")
            elif focus.is_focused() and ts['paused'] and not was_focused:
                timer.toggle_pause()
                print("Auto-resumed — back and focused")

        was_focused = focus.is_focused()
        time.sleep(0.1)

def init():
    threading.Thread(target=_camera_thread, daemon=True).start()
