import time
import threading
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
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    was_focused = True

    while True:
        frame   = cam.capture_array()
        results = detector.process(frame)

        if results.multi_face_landmarks:
            lm = results.multi_face_landmarks[0].landmark
            away,   yaw, pitch = vision.looking_away(lm, W, H)
            closed, ear        = vision.eyes_closed(lm, W, H)
            focus.update(True, looking_away=away, eyes_closed=closed)
            # print(f"yaw={yaw:5.1f} pitch={pitch:5.1f} ear={ear:.3f} state={focus.get_state()}")
        else:
            focus.update(False)

        ts = timer.state()
        if ts['active'] and ts['mode'] == "FOCUS":
            if not focus.is_focused() and not ts['paused']:
                timer.toggle_pause()
                print(f"Auto-paused — {focus.get_state()}")
            elif focus.is_focused() and ts['paused'] and not was_focused:
                timer.toggle_pause()
                print("Auto-resumed — back and focused")

        was_focused = focus.is_focused()
        time.sleep(0.1)

def init():
    threading.Thread(target=_camera_thread, daemon=True).start()