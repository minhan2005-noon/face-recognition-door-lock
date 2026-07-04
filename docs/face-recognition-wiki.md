# Wiki: Face Recognition

Trang wiki này mô tả phạm vi làm việc của nhánh `feature/face-recognition`.

## Mục tiêu

Nhánh `feature/face-recognition` dùng để phát triển phần AI nhận diện khuôn mặt cho hệ thống khóa cửa.

## Phạm vi công việc

- Thu thập và tổ chức dataset.
- Tiền xử lý ảnh khuôn mặt.
- Phát hiện khuôn mặt trong ảnh hoặc video.
- Trích xuất embedding.
- So khớp người dùng đã đăng ký.
- Tạo model hoặc file dữ liệu phục vụ inference.
- Gửi kết quả nhận diện về backend.

## Thư mục được phép chỉnh sửa

- `ai-model/`
- `ai-model/dataset/`
- `ai-model/training/`
- `ai-model/inference/`
- `ai-model/models/`
- `tests/unit/` nếu test logic AI
- `tests/integration/` nếu test luồng AI với backend
- `docs/api.md` nếu cần thống nhất payload recognition event

## Không chỉnh sửa

- `firmware/` nếu không thống nhất với nhóm firmware.
- `dashboard/` hoặc `web/` nếu không thống nhất với nhóm frontend.
- `backend/` nếu không thống nhất với nhóm backend.

## Cấu trúc AI dự kiến

```text
ai-model/
├── dataset/
│   ├── authorized_users/
│   └── test_images/
├── training/
│   ├── preprocess.py
│   └── train.py
├── inference/
│   ├── face_detector.py
│   ├── recognizer.py
│   └── embeddings.py
└── models/
    ├── face_recognition_model.onnx
    └── labels.json
```

## Luồng nhận diện

1. Nhận ảnh từ camera hoặc file test.
2. Phát hiện khuôn mặt.
3. Cắt và căn chỉnh khuôn mặt.
4. Tạo embedding.
5. So khớp với dữ liệu người dùng đã đăng ký.
6. Trả kết quả gồm `recognized`, `userId`, `confidence`.
7. Gửi kết quả về backend nếu chạy theo mô hình service.

## Cài đặt

```bash
cd ai-model
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Lưu ý dữ liệu

- Không commit ảnh khuôn mặt thật lên repository công khai.
- Mỗi người dùng nên có nhiều ảnh ở nhiều góc và điều kiện sáng khác nhau.
- Dataset test phải khác dataset huấn luyện.
- Cần ghi rõ model version khi thay đổi thuật toán.

## Pull Request

Pull Request vào `dev` cần ghi:

- Model/thuật toán đã dùng.
- Dataset test đã dùng.
- Ngưỡng confidence đề xuất.
- Cách chạy inference.
- Payload gửi sang backend nếu có thay đổi.

