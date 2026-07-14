# AI Model

Thư mục này chứa dữ liệu, huấn luyện, suy luận và model nhận diện khuôn mặt.

## Cần làm

- Thu thập ảnh người được phép vào `dataset/authorized_users/`.
- Viết bước tiền xử lý ảnh trong `training/preprocess.py`.
- Huấn luyện hoặc tạo embedding trong `training/train.py`.
- Viết module phát hiện và nhận diện trong `inference/`.
- Lưu model và label trong `models/`.

## Cài đặt

- Tạo môi trường Python: `python -m venv .venv`.
- Kích hoạt môi trường: `source .venv/bin/activate`.
- Cài gói cần thiết: `pip install -r requirements.txt`.

## Chạy AI trên máy tính

Không cần build firmware để kiểm tra phần dự đoán AI. Chuẩn bị ảnh theo cấu trúc:

```text
ai-model/dataset/authorized_users/
├── user_001/
│   ├── image_1.jpg
│   └── image_2.jpg
└── user_002/
    ├── image_1.jpg
    └── image_2.jpg
```

Tên thư mục con là nhãn người dùng mà model sẽ trả về. Sau đó train:

```bash
cd ai-model
python3 training/train.py
```

Model sẽ được lưu ở:

```text
ai-model/models/face_embeddings.npz
ai-model/models/labels.json
```

Đặt ảnh cần kiểm thử vào `dataset/test_images/`, rồi dự đoán:

```bash
python3 inference/recognizer.py dataset/test_images/test.jpg
```

Output mẫu:

```json
{
  "imagePath": "dataset/test_images/test.jpg",
  "recognized": true,
  "label": "user_001",
  "bestLabel": "user_001",
  "confidence": 0.91,
  "threshold": 0.82,
  "faceDetected": true
}
```

Nếu `recognized` là `false` nhưng `bestLabel` đúng, giảm thử threshold:

```bash
python3 inference/recognizer.py dataset/test_images/test.jpg --threshold 0.7
```

Quét trực tiếp bằng camera trên Mac:

```bash
python3 inference/camera_scan.py
```

Trong cửa sổ camera, nhấn `q` để thoát. Nếu muốn chỉ in JSON mà không mở cửa sổ:

```bash
python3 inference/camera_scan.py --headless
```

Nếu chưa có ảnh train, có thể thu mẫu bằng camera trước:

```bash
python3 training/camera_collect.py minhan
python3 training/train.py
python3 inference/camera_scan.py
```

Pipeline hiện dùng OpenCV + embedding ảnh nhẹ để test offline trên máy tính. Khi cần độ chính xác cao hơn, có thể thay phần embedding bằng FaceNet/ArcFace/InsightFace nhưng vẫn giữ cùng luồng train/predict.

## Gợi ý thư viện

- OpenCV cho camera và xử lý ảnh.
- face-recognition hoặc insightface cho embedding.
- onnxruntime nếu dùng model ONNX.
