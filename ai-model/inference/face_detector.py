from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2


@dataclass(frozen=True)
class FaceBox:
    x: int
    y: int
    width: int
    height: int

    @property
    def area(self) -> int:
        return self.width * self.height


class FaceDetector:
    """Detects the largest frontal face in an image with OpenCV Haar cascade."""

    def __init__(self, scale_factor: float = 1.1, min_neighbors: int = 5):
        cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        self.classifier = cv2.CascadeClassifier(str(cascade_path))
        if self.classifier.empty():
            raise RuntimeError(f"Cannot load OpenCV face cascade: {cascade_path}")

        self.scale_factor = scale_factor
        self.min_neighbors = min_neighbors

    def detect(self, image) -> list[FaceBox]:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        boxes = self.classifier.detectMultiScale(
            gray,
            scaleFactor=self.scale_factor,
            minNeighbors=self.min_neighbors,
            minSize=(48, 48),
        )
        return [FaceBox(int(x), int(y), int(w), int(h)) for x, y, w, h in boxes]

    def largest_face(self, image) -> FaceBox | None:
        faces = self.detect(image)
        if not faces:
            return None
        return max(faces, key=lambda face: face.area)

    def crop_largest_face(self, image, margin: float = 0.22, fallback_to_full_image: bool = True):
        face = self.largest_face(image)
        if face is None:
            if fallback_to_full_image:
                return image, None
            return None, None

        image_height, image_width = image.shape[:2]
        pad_x = int(face.width * margin)
        pad_y = int(face.height * margin)

        x1 = max(face.x - pad_x, 0)
        y1 = max(face.y - pad_y, 0)
        x2 = min(face.x + face.width + pad_x, image_width)
        y2 = min(face.y + face.height + pad_y, image_height)

        return image[y1:y2, x1:x2], face
