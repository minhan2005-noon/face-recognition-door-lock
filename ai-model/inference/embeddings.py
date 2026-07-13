from __future__ import annotations

import cv2
import numpy as np


def build_embedding(face_image, size: tuple[int, int] = (112, 112)) -> np.ndarray:
    """Build a deterministic local embedding from a cropped face image.

    This is a lightweight baseline for computer-only testing. It is not as strong
    as FaceNet/ArcFace, but it lets the project train and predict without firmware.
    """

    if face_image is None or face_image.size == 0:
        raise ValueError("Cannot build embedding from an empty image.")

    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
    gray = cv2.resize(gray, size, interpolation=cv2.INTER_AREA)
    gray = cv2.equalizeHist(gray)

    pixels = gray.astype("float32").reshape(-1) / 255.0
    pixels = pixels - pixels.mean()
    norm = np.linalg.norm(pixels)
    if norm > 0:
        pixels = pixels / norm

    hist = cv2.calcHist([gray], [0], None, [32], [0, 256]).astype("float32").reshape(-1)
    hist_norm = np.linalg.norm(hist)
    if hist_norm > 0:
        hist = hist / hist_norm

    return np.concatenate([pixels, hist]).astype("float32")


def cosine_similarity(left: np.ndarray, right: np.ndarray) -> float:
    left_norm = np.linalg.norm(left)
    right_norm = np.linalg.norm(right)
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return float(np.dot(left, right) / (left_norm * right_norm))
