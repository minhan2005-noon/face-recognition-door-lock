# Suy luận

Thư mục này chứa module suy luận dùng khi camera nhận diện khuôn mặt.

## Cần làm

- `face_detector.py`: phát hiện vị trí khuôn mặt.
- `embeddings.py`: trích xuất vector đặc trưng.
- `recognizer.py`: so khớp với người dùng đã đăng ký.

## Cài đặt

- Dùng cùng môi trường Python với phần huấn luyện.
- Đảm bảo model trong `../models/` tồn tại trước khi chạy.

## Kiểm tra

- Kiểm tra với ảnh người được phép.
- Kiểm tra với ảnh người lạ.
- Ghi nhận ngưỡng chấp nhận/từ chối.

## Chạy dự đoán hiện tại

Sau khi train xong:

```bash
python3 ai-model/inference/recognizer.py ai-model/dataset/test_images/test.jpg
```

Nếu muốn chỉnh ngưỡng nhận diện:

```bash
python3 ai-model/inference/recognizer.py ai-model/dataset/test_images/test.jpg --threshold 0.7
```

Output trả JSON gồm `recognized`, `label`, `bestLabel`, `confidence`, `threshold`, `faceDetected`.

## Scan bằng camera Mac

Sau khi train xong model:

```bash
python3 ai-model/inference/camera_scan.py
```

Script sẽ mở webcam, detect mặt và hiển thị nhãn dự đoán trực tiếp trên khung hình. Nhấn `q` để dừng.

Nếu macOS hỏi quyền camera, cấp quyền cho Terminal/Python. Có thể đổi camera index bằng:

```bash
python3 ai-model/inference/camera_scan.py --camera 1
```
