# Kiến trúc hệ thống

Tài liệu này mô tả kiến trúc tổng thể của hệ thống khóa cửa nhận diện khuôn mặt.

## Mục tiêu kiến trúc

- Nhận diện người dùng được cấp quyền bằng khuôn mặt.
- Gửi lệnh mở khóa an toàn tới phần cứng.
- Ghi lại lịch sử ra vào.
- Cho phép quản trị viên theo dõi trạng thái qua dashboard.
- Tách rõ trách nhiệm giữa AI, backend, frontend và firmware.

## Thành phần chính

```text
Camera / ESP32-CAM
        │
        ▼
AI Model / Face Recognition
        │
        ▼
Backend API ─────► Database
        │
        ├──────► Dashboard / Web App
        │
        └──────► Firmware / Door Controller
```

## Luồng nhận diện và mở khóa

1. Camera chụp ảnh hoặc truyền khung hình.
2. AI model phát hiện khuôn mặt.
3. AI model trích xuất đặc trưng khuôn mặt.
4. Hệ thống so khớp với dữ liệu người dùng đã đăng ký.
5. Backend nhận kết quả nhận diện.
6. Backend kiểm tra quyền truy cập và trạng thái thiết bị.
7. Nếu hợp lệ, backend gửi lệnh mở khóa tới firmware.
8. Firmware điều khiển relay/servo/khóa điện.
9. Backend ghi log sự kiện truy cập.
10. Dashboard hiển thị trạng thái và lịch sử.

## Backend

Backend là trung tâm điều phối của hệ thống.

Trách nhiệm:

- Cung cấp REST API.
- Quản lý người dùng.
- Quản lý thiết bị.
- Quản lý lịch sử truy cập.
- Nhận kết quả nhận diện từ AI service.
- Gửi lệnh khóa/mở khóa tới firmware.
- Xử lý xác thực và phân quyền.

## AI Model

AI model chịu trách nhiệm xử lý ảnh và nhận diện khuôn mặt.

Trách nhiệm:

- Tiền xử lý ảnh.
- Phát hiện khuôn mặt.
- Trích xuất embedding.
- So khớp người dùng.
- Gửi kết quả nhận diện về backend.

## Firmware

Firmware chạy trên ESP32/ESP32-CAM hoặc Arduino.

Trách nhiệm:

- Điều khiển relay, servo hoặc khóa điện.
- Nhận lệnh từ backend.
- Báo cáo trạng thái thiết bị.
- Xử lý lỗi phần cứng cơ bản.

## Dashboard / Web App

Dashboard là giao diện quản trị hệ thống.

Trách nhiệm:

- Xem trạng thái thiết bị.
- Quản lý người dùng.
- Xem lịch sử ra vào.
- Gửi lệnh khóa/mở khóa thủ công nếu được phép.

## Database

Database lưu dữ liệu phục vụ vận hành hệ thống.

Bảng dự kiến:

- `users`: thông tin người dùng.
- `face_embeddings`: thông tin nhận diện khuôn mặt.
- `devices`: thông tin thiết bị.
- `access_logs`: lịch sử ra vào.
- `admins`: tài khoản quản trị nếu cần.

## Bảo mật

- Token/API key cần lưu trong biến môi trường.
- Không commit ảnh khuôn mặt thật lên repository công khai.
- Không log dữ liệu nhạy cảm.
- Endpoint mở khóa phải yêu cầu xác thực.
- Nên có cơ chế chống gọi lệnh mở khóa lặp liên tục.

## Mở rộng trong tương lai

- Thêm xác thực hai lớp.
- Thêm chống giả mạo bằng ảnh.
- Thêm thông báo thời gian thực.
- Thêm ứng dụng di động.
- Đồng bộ cloud hoặc triển khai edge/local tùy nhu cầu.

