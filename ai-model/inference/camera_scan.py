from __future__ import annotations

import argparse
import json
import time
from dataclasses import asdict, dataclass
from pathlib import Path

import cv2

from embeddings import build_embedding, cosine_similarity
from face_detector import FaceDetector
from recognizer import DEFAULT_MODEL_PATH, DEFAULT_THRESHOLD, FaceRecognizer


@dataclass
class ScanResult:
    recognized: bool
    label: str | None
    bestLabel: str | None
    confidence: float
    threshold: float
    faceDetected: bool
    capturedAt: float


def predict_frame(recognizer: FaceRecognizer, detector: FaceDetector, frame) -> tuple[ScanResult, object | None]:
    face_image, face_box = detector.crop_largest_face(frame, fallback_to_full_image=False)
    if face_image is None:
        return (
            ScanResult(
                recognized=False,
                label=None,
                bestLabel=None,
                confidence=0.0,
                threshold=recognizer.threshold,
                faceDetected=False,
                capturedAt=time.time(),
            ),
            None,
        )

    query_embedding = build_embedding(face_image)
    scores = [
        cosine_similarity(query_embedding, known_embedding)
        for known_embedding in recognizer.embeddings
    ]
    best_index = max(range(len(scores)), key=lambda index: scores[index])
    confidence = float(scores[best_index])
    best_label = recognizer.labels[best_index]
    recognized = confidence >= recognizer.threshold

    return (
        ScanResult(
            recognized=recognized,
            label=best_label if recognized else None,
            bestLabel=best_label,
            confidence=round(confidence, 4),
            threshold=recognizer.threshold,
            faceDetected=True,
            capturedAt=time.time(),
        ),
        face_box,
    )


def draw_overlay(frame, result: ScanResult, face_box) -> None:
    if face_box is not None:
        color = (30, 160, 60) if result.recognized else (20, 80, 230)
        cv2.rectangle(
            frame,
            (face_box.x, face_box.y),
            (face_box.x + face_box.width, face_box.y + face_box.height),
            color,
            2,
        )

    if result.faceDetected:
        label = result.label if result.recognized else f"Unknown / best: {result.bestLabel}"
        text = f"{label} | confidence {result.confidence:.2f}"
    else:
        text = "No face detected"

    cv2.rectangle(frame, (12, 12), (min(frame.shape[1] - 12, 560), 52), (0, 0, 0), -1)
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Open local webcam and scan faces with the trained model.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--threshold", type=float, default=DEFAULT_THRESHOLD)
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--interval", type=float, default=0.5, help="Seconds between predictions.")
    parser.add_argument("--headless", action="store_true", help="Print JSON only, without opening a window.")
    parser.add_argument("--max-frames", type=int, default=0, help="Stop after N frames. 0 means run until q.")
    args = parser.parse_args()

    recognizer = FaceRecognizer(model_path=args.model, threshold=args.threshold)
    detector = FaceDetector()
    capture = cv2.VideoCapture(args.camera)

    if not capture.isOpened():
        raise RuntimeError(
            f"Cannot open camera index {args.camera}. Check macOS camera permission for Terminal/Python."
        )

    last_prediction_at = 0.0
    last_result = ScanResult(False, None, None, 0.0, args.threshold, False, time.time())
    last_face_box = None
    frame_count = 0

    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                raise RuntimeError("Failed to read frame from camera.")

            frame_count += 1
            now = time.time()
            if now - last_prediction_at >= args.interval:
                last_result, last_face_box = predict_frame(recognizer, detector, frame)
                last_prediction_at = now
                print(json.dumps(asdict(last_result), ensure_ascii=False), flush=True)

            if not args.headless:
                draw_overlay(frame, last_result, last_face_box)
                cv2.imshow("Face Recognition Door Lock - Camera Scan", frame)
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break

            if args.max_frames and frame_count >= args.max_frames:
                break
    finally:
        capture.release()
        if not args.headless:
            cv2.destroyAllWindows()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
