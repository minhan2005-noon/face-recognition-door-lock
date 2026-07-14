from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "inference"))

from embeddings import build_embedding  # noqa: E402
from face_detector import FaceDetector  # noqa: E402


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_DATASET_DIR = ROOT / "dataset" / "authorized_users"
DEFAULT_MODEL_PATH = ROOT / "models" / "face_embeddings.npz"
DEFAULT_LABELS_PATH = ROOT / "models" / "labels.json"


def iter_images(dataset_dir: Path):
    if not dataset_dir.exists():
        raise FileNotFoundError(f"Dataset directory not found: {dataset_dir}")

    for user_dir in sorted(path for path in dataset_dir.iterdir() if path.is_dir()):
        for image_path in sorted(user_dir.rglob("*")):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                yield user_dir.name, image_path


def train(dataset_dir: Path, model_path: Path, labels_path: Path, fallback_to_full_image: bool) -> int:
    detector = FaceDetector()
    embeddings = []
    labels = []
    skipped = []

    for label, image_path in iter_images(dataset_dir):
        image = cv2.imread(str(image_path))
        if image is None:
            skipped.append({"path": str(image_path), "reason": "cannot_read"})
            continue

        face, face_box = detector.crop_largest_face(
            image,
            fallback_to_full_image=fallback_to_full_image,
        )
        if face is None:
            skipped.append({"path": str(image_path), "reason": "no_face"})
            continue

        embeddings.append(build_embedding(face))
        labels.append(label)
        if face_box is None:
            skipped.append({"path": str(image_path), "reason": "used_full_image_fallback"})

    if not embeddings:
        raise RuntimeError(
            "No training images were processed. Put images under "
            "`ai-model/dataset/authorized_users/<person_name>/`."
        )

    model_path.parent.mkdir(parents=True, exist_ok=True)
    embedding_matrix = np.vstack(embeddings).astype("float32")
    label_array = np.array(labels)

    np.savez_compressed(
        model_path,
        embeddings=embedding_matrix,
        labels=label_array,
    )

    label_summary = {
        "modelFile": model_path.name,
        "embeddingCount": len(labels),
        "users": sorted(set(labels)),
        "samplesPerUser": {label: labels.count(label) for label in sorted(set(labels))},
        "skipped": skipped,
    }
    labels_path.write_text(json.dumps(label_summary, ensure_ascii=False, indent=2), encoding="utf-8")

    return len(labels)


def main() -> int:
    parser = argparse.ArgumentParser(description="Train local face embeddings from authorized users.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--labels", type=Path, default=DEFAULT_LABELS_PATH)
    parser.add_argument(
        "--strict-face",
        action="store_true",
        help="Skip images where OpenCV cannot detect a face.",
    )
    args = parser.parse_args()

    count = train(
        dataset_dir=args.dataset,
        model_path=args.model,
        labels_path=args.labels,
        fallback_to_full_image=not args.strict_face,
    )
    print(f"Trained embeddings: {count}")
    print(f"Model: {args.model}")
    print(f"Labels: {args.labels}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
