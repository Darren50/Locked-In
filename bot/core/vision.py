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

def head_pose(landmarks, w, h):
    image_points = np.array(
        [(landmarks[i].x * w, landmarks[i].y * h) for i in POSE_IDX],
        dtype=np.float64,
    )
    focal = w
    cam_matrix = np.array([
        [focal, 0,     w / 2],
        [0,     focal, h / 2],
        [0,     0,     1],
    ], dtype=np.float64)
    dist = np.zeros((4, 1))
    ok, rvec, _ = cv2.solvePnP(MODEL_POINTS, image_points, cam_matrix, dist,
                               flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return 0.0, 0.0
    rmat, _ = cv2.Rodrigues(rvec)
    angles, *_ = cv2.RQDecomp3x3(rmat)
    return angles[1], angles[0]   # yaw, pitch

def looking_away(landmarks, w, h, yaw_thresh=25.0, pitch_up_thresh=20.0):
    yaw, pitch = head_pose(landmarks, w, h)
    return (abs(yaw) > yaw_thresh) or (pitch > pitch_up_thresh), yaw, pitch