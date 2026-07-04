# Khóa cửa nhận diện khuôn mặt

Dự án này xây dựng hệ thống khóa cửa thông minh dùng trí tuệ nhân tạo để nhận diện khuôn mặt người dùng được cấp quyền và tự động mở cửa.

Hệ thống kết hợp thị giác máy tính, phần cứng nhúng và giao tiếp IoT để tạo một giải pháp kiểm soát ra vào an toàn, thuận tiện và có thể mở rộng.

## Tính năng

- Phát hiện và nhận diện khuôn mặt theo thời gian thực.
- Tự động mở khóa cho người dùng được cấp quyền.
- Đăng ký người dùng và quản lý cơ sở dữ liệu khuôn mặt.
- Ghi lại lịch sử ra vào.
- Tích hợp phần cứng nhúng.
- Hỗ trợ bảng điều khiển web để giám sát từ xa.
- Hỗ trợ camera như ESP32-CAM hoặc camera USB.
- Xác thực và kiểm soát truy cập an toàn.

## Kiến trúc hệ thống

```text
Camera
   │
   ▼
Phát hiện khuôn mặt
   │
   ▼
Nhận diện khuôn mặt
   │
   ├── Người dùng hợp lệ ──► Mở khóa cửa
   │
   └── Người lạ ───────────► Từ chối truy cập
```

## Cấu trúc dự án

```text
face-recognition-door-lock/
├── firmware/      # Firmware cho ESP32/Arduino
├── ai-model/      # Dữ liệu, huấn luyện và suy luận AI
├── backend/       # REST API, cơ sở dữ liệu và nghiệp vụ
├── dashboard/     # Giao diện quản trị
├── web/app/       # Ứng dụng web bổ sung
├── hardware/      # Sơ đồ mạch, PCB, đấu dây và linh kiện
├── docs/          # Tài liệu kỹ thuật
├── logs/          # Log cục bộ hoặc log mẫu
├── tests/         # Kiểm thử
├── scripts/       # Script hỗ trợ cài đặt, triển khai, sao lưu
└── README.md
```

## Công nghệ dự kiến

### Trí tuệ nhân tạo

- OpenCV
- Face Recognition
- Mô hình học sâu
- ONNX Runtime

### Backend

- Node.js
- Express.js
- REST API

### Cơ sở dữ liệu

- MySQL hoặc PostgreSQL
- SQLite cho môi trường phát triển

### Hệ thống nhúng

- ESP32-CAM
- ESP32
- Servo motor hoặc khóa điện
- Module relay

### Frontend

- React
- Vite

## Luồng hoạt động

1. Camera chụp ảnh hoặc truyền khung hình.
2. Hệ thống phát hiện khuôn mặt.
3. Trích xuất đặc trưng khuôn mặt.
4. So khớp với cơ sở dữ liệu người dùng đã đăng ký.
5. Xác minh danh tính.
6. Gửi lệnh mở khóa tới bộ điều khiển cửa.
7. Ghi lại sự kiện truy cập.
8. Thông báo cho quản trị viên nếu cần.

## Hướng dẫn bắt đầu

1. Đọc README trong từng thư mục con để biết vai trò và cách cài đặt từng phần.
2. Chuẩn bị phần cứng: camera, board điều khiển, relay/servo hoặc khóa điện.
3. Chuẩn bị môi trường backend và AI model.
4. Chạy thử nhận diện trên ảnh mẫu trước khi kết nối khóa thật.
5. Kiểm thử kỹ nguồn điện và cơ chế mở khóa trước khi lắp đặt thực tế.

## Hướng phát triển

- Ứng dụng di động.
- Xác thực nhiều lớp.
- Đồng bộ dữ liệu lên cloud.
- Quản lý khách vãng lai.
- Chống giả mạo bằng ảnh.
- Thông báo thời gian thực.
- Tích hợp trợ lý giọng nói.

## Giấy phép

Dự án sử dụng giấy phép MIT.
