from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2

import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "inference"))

from face_detector import FaceDetector  # noqa: E402


DEFAULT_OUTPUT_ROOT = ROOT / "dataset" / "authorized_users"


def main() -> int:
    parser = argparse.ArgumentParser(description="Collect authorized-user face samples from a webcam.")
    parser.add_argument("label", help="User label folder, for example: minhan")
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--interval", type=float, default=0.35)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--headless", action="store_true")
    args = parser.parse_args()

    output_dir = args.output_root / args.label
    output_dir.mkdir(parents=True, exist_ok=True)

    detector = FaceDetector()
    capture = cv2.VideoCapture(args.camera)
    if not capture.isOpened():
        raise RuntimeError(
            f"Cannot open camera index {args.camera}. Check macOS camera permission for Terminal/Python."
        )

    saved = 0
    last_saved_at = 0.0

    try:
        while saved < args.count:
            ok, frame = capture.read()
            if not ok:
                raise RuntimeError("Failed to read frame from camera.")

            face_image, face_box = detector.crop_largest_face(frame, fallback_to_full_image=False)
            now = time.time()

            if face_box is not None:
                cv2.rectangle(
                    frame,
                    (face_box.x, face_box.y),
                    (face_box.x + face_box.width, face_box.y + face_box.height),
                    (30, 160, 60),
                    2,
                )

                if now - last_saved_at >= args.interval:
                    target = output_dir / f"{args.label}_{int(now * 1000)}.jpg"
                    cv2.imwrite(str(target), face_image)
                    saved += 1
                    last_saved_at = now
                    print(f"Saved {saved}/{args.count}: {target}", flush=True)

            if not args.headless:
                text = f"Collecting {args.label}: {saved}/{args.count}"
                cv2.rectangle(frame, (12, 12), (420, 52), (0, 0, 0), -1)
                cv2.putText(
                    frame,
                    text,
                    (24, 39),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.72,
                    (255, 255, 255),
                    2,
                    cv2.LINE_AA,
                )
                cv2.imshow("Face Recognition Door Lock - Collect Samples", frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break
    finally:
        capture.release()
        if not args.headless:
            cv2.destroyAllWindows()

    print(f"Collected samples: {saved}")
    print(f"Output: {output_dir}")
    return 0 if saved > 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
