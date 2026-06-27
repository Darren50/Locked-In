import time
import threading
from picamera2 import Picamera2
import mediapipe as mp
from core.focus import focus
from core.timer import timer

def _camera_thread():
    cam = Picamera2()
    cfg = cam.create_preview_configuration(main={"size": (320, 240), "format": "RGB888"})
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

def init():
    threading.Thread(target=_camera_thread, daemon=True).start()