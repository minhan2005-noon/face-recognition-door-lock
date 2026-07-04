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
- Cài gói cần thiết sau khi có `requirements.txt`: `pip install -r requirements.txt`.

## Gợi ý thư viện

- OpenCV cho camera và xử lý ảnh.
- face-recognition hoặc insightface cho embedding.
- onnxruntime nếu dùng model ONNX.

