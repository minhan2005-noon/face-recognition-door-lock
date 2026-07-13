# Huấn luyện

Thư mục này chứa script tiền xử lý và huấn luyện model.

## Cần làm

- `preprocess.py`: đọc ảnh, phát hiện mặt, cắt/căn chỉnh khuôn mặt.
- `train.py`: tạo embedding hoặc huấn luyện classifier.
- Xuất model/embedding vào `../models/`.

## Cài đặt

- Tạo virtual environment Python.
- Cài OpenCV, numpy và thư viện nhận diện khuôn mặt sẽ dùng.
- Tạo `requirements.txt` khi bắt đầu viết code thật.

## Chạy dự kiến

- Tiền xử lý: `python preprocess.py`.
- Huấn luyện: `python train.py`.

## Chạy hiện tại

Từ thư mục root project:

```bash
python3 ai-model/training/train.py
```

Hoặc từ thư mục `ai-model`:

```bash
python3 training/train.py
```

Yêu cầu ảnh nằm theo dạng:

```text
dataset/authorized_users/<ten_nguoi_dung>/*.jpg
```

Script sẽ tạo:

```text
models/face_embeddings.npz
models/labels.json
```

Thu mẫu trực tiếp bằng camera Mac:

```bash
python3 ai-model/training/camera_collect.py minhan
```

Script sẽ lưu ảnh vào:

```text
ai-model/dataset/authorized_users/minhan/
```
