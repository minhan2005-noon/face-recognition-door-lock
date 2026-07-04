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

