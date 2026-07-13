from __future__ import annotations

import argparse
from pathlib import Path

import cv2

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "inference"))

from face_detector import FaceDetector  # noqa: E402


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
DEFAULT_DATASET_DIR = ROOT / "dataset" / "authorized_users"
DEFAULT_OUTPUT_DIR = ROOT / "models" / "preprocessed_faces"


def iter_images(dataset_dir: Path):
    for user_dir in sorted(path for path in dataset_dir.iterdir() if path.is_dir()):
        for image_path in sorted(user_dir.rglob("*")):
            if image_path.suffix.lower() in IMAGE_EXTENSIONS:
                yield user_dir.name, image_path


def preprocess(dataset_dir: Path, output_dir: Path, size: int = 160) -> tuple[int, int]:
    detector = FaceDetector()
    processed = 0
    skipped = 0

    output_dir.mkdir(parents=True, exist_ok=True)

    for label, image_path in iter_images(dataset_dir):
        image = cv2.imread(str(image_path))
        if image is None:
            skipped += 1
            continue

        face, face_box = detector.crop_largest_face(image, fallback_to_full_image=False)
        if face is None or face_box is None:
            skipped += 1
            continue

        face = cv2.resize(face, (size, size), interpolation=cv2.INTER_AREA)
        target_dir = output_dir / label
        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = target_dir / f"{image_path.stem}_face.jpg"
        cv2.imwrite(str(target_path), face)
        processed += 1

    return processed, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description="Crop detected faces from authorized user images.")
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--size", type=int, default=160)
    args = parser.parse_args()

    processed, skipped = preprocess(args.dataset, args.output, args.size)
    print(f"Preprocessed faces: {processed}")
    print(f"Skipped images: {skipped}")
    print(f"Output: {args.output}")
    return 0 if processed > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
