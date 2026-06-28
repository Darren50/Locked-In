import math
import cv2
import numpy as np

LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]
POSE_IDX  = [1, 199, 33, 263, 61, 291]

MODEL_POINTS = np.array([
    (0.0,    0.0,    0.0),
    (0.0,   -63.6,  -12.5),
    (-43.3,  32.7,  -26.0),
    (43.3,   32.7,  -26.0),
    (-28.9, -28.9,  -24.1),
    (28.9,  -28.9,  -24.1),
], dtype=np.float64)

def _ear(landmarks, idx, w, h):
    p = [(landmarks[i].x * w, landmarks[i].y * h) for i in idx]
    v1 = math.dist(p[1], p[5])
    v2 = math.dist(p[2], p[4])
    hd = math.dist(p[0], p[3])
    return (v1 + v2) / (2.0 * hd + 1e-6)

def eyes_closed(landmarks, w, h, thresh=0.20):
    ear = (_ear(landmarks, LEFT_EYE, w, h) + _ear(landmarks, RIGHT_EYE, w, h)) / 2.0
    return ear < thresh, ear

NOSE_TIP   = 1
LEFT_EDGE  = 234     # left boundary of face
RIGHT_EDGE = 454     # right boundary of face

def horizontal_ratio(landmarks):
    """0.5 = nose centered (facing forward); drifts toward 0 or 1 when turned."""
    nose  = landmarks[NOSE_TIP].x
    left  = landmarks[LEFT_EDGE].x
    right = landmarks[RIGHT_EDGE].x
    return (nose - left) / ((right - left) + 1e-6)

def looking_away(landmarks, w, h, center=0.5, tol=0.18):
    r = horizontal_ratio(landmarks)
    return abs(r - center) > tol, r