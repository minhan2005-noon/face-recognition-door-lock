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

