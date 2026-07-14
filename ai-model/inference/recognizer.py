from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2
import numpy as np

from embeddings import build_embedding, cosine_similarity
from face_detector import FaceDetector


DEFAULT_MODEL_PATH = Path(__file__).resolve().parents[1] / "models" / "face_embeddings.npz"
DEFAULT_THRESHOLD = 0.82


@dataclass
class Prediction:
    imagePath: str
    recognized: bool
    label: str | None
    bestLabel: str
    confidence: float
    threshold: float
    faceDetected: bool


class FaceRecognizer:
    def __init__(self, model_path: Path = DEFAULT_MODEL_PATH, threshold: float = DEFAULT_THRESHOLD):
        self.model_path = Path(model_path)
        self.threshold = threshold
        self.detector = FaceDetector()
        self.labels: list[str] = []
        self.embeddings: np.ndarray | None = None
        self._load()

    def _load(self) -> None:
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model not found: {self.model_path}. Run `python training/train.py` first."
            )

        model = np.load(self.model_path, allow_pickle=False)
        self.embeddings = model["embeddings"].astype("float32")
        self.labels = [str(label) for label in model["labels"]]

        if len(self.labels) != len(self.embeddings):
            raise ValueError("Invalid model: labels and embeddings length mismatch.")

    def predict(self, image_path: Path) -> Prediction:
        image_path = Path(image_path)
        image = cv2.imread(str(image_path))
        if image is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")

        face_image, face_box = self.detector.crop_largest_face(image, fallback_to_full_image=True)
        query_embedding = build_embedding(face_image)

        scores = np.array(
            [cosine_similarity(query_embedding, known) for known in self.embeddings],
            dtype="float32",
        )
        best_index = int(np.argmax(scores))
        confidence = float(scores[best_index])
        label = self.labels[best_index]
        recognized = confidence >= self.threshold

        return Prediction(
            imagePath=str(image_path),
            recognized=recognized,
            label=label if recognized else None,
            bestLabel=label,
            confidence=round(confidence, 4),
            threshold=self.threshold,
            faceDetected=face_box is not None,
        )


def main() -> int:
    parser = argparse.ArgumentParser(description="Predict an authorized face from a local image.")
    parser.add_argument("image", type=Path, help="Path to the test image.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    args = parser.parse_args()

    recognizer = FaceRecognizer(model_path=args.model, threshold=args.threshold)
    prediction = recognizer.predict(args.image)
    print(json.dumps(asdict(prediction), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
