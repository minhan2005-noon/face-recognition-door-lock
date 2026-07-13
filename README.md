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

## Chạy Bằng Docker

Docker giúp chạy từng phần của hệ thống trong container, giảm lỗi do khác môi trường giữa các máy.

### 1. Cài Docker

Cài Docker Desktop cho macOS:

```text
https://www.docker.com/products/docker-desktop/
```

Sau khi cài xong, mở Docker Desktop và kiểm tra:

```bash
docker --version
docker compose version
```

### 2. Build Backend Image

```bash
cd /Users/hoangminhan/face-recognition-door-lock/backend
docker build -t face-door-lock-backend .
```

### 3. Chạy Backend Container

Không bật API key:

```bash
docker run --rm -p 3000:3000 face-door-lock-backend
```

Bật API key:

```bash
docker run --rm -p 3000:3000 \
  -e API_KEY=minhan123 \
  face-door-lock-backend
```

Bật API key và kết nối MQTT broker đang chạy trên máy host:

```bash
docker run --rm -p 3000:3000 \
  -e API_KEY=minhan123 \
  -e MQTT_URL=mqtt://host.docker.internal:1883 \
  face-door-lock-backend
```

Kiểm tra backend:

```bash
curl http://localhost:3000/api/health
```

Nếu bật `API_KEY`, gọi API riêng tư bằng:

```bash
curl http://localhost:3000/api/users \
  -H "X-API-Key: minhan123"
```

### 4. Build Web Image

```bash
cd /Users/hoangminhan/face-recognition-door-lock/web/app
docker build -t face-door-lock-web .
```

### 5. Chạy Web Container

```bash
docker run --rm -p 8080:80 face-door-lock-web
```

Mở trình duyệt:

```text
http://localhost:8080
```

### 6. Chạy Chung Backend + Web + MQTT Bằng Docker Compose

Từ thư mục root của project:

```bash
cd /Users/hoangminhan/face-recognition-door-lock
docker compose up --build
```

Sau khi chạy xong:

```text
Web dashboard: http://localhost:8080
Backend API:   http://localhost:3000
MQTT broker:   localhost:1883
API key:       minhan123
```

Kiểm tra backend:

```bash
curl http://localhost:3000/api/health
```

Kiểm tra API riêng tư:

```bash
curl http://localhost:3000/api/devices \
  -H "X-API-Key: minhan123"
```

Chạy ở chế độ nền:

```bash
docker compose up -d --build
```

Xem log toàn hệ thống:

```bash
docker compose logs -f
```

Xem log từng service:

```bash
docker compose logs -f backend
docker compose logs -f web
docker compose logs -f mqtt
```

Dừng toàn bộ:

```bash
docker compose down
```

Dừng và xóa cả volume database/MQTT local:

```bash
docker compose down -v
```

Đổi API key khi chạy:

```bash
API_KEY=my-secret-key docker compose up -d --build
```

Trong Docker Compose, backend kết nối MQTT bằng:

```text
mqtt://mqtt:1883
```

Vì `mqtt` là tên service broker trong mạng Docker Compose.

### 7. Lệnh Docker Hữu Ích

Xem container đang chạy:

```bash
docker ps
```

Dừng container:

```bash
docker stop <container_id>
```

Xem log container:

```bash
docker logs <container_id>
```

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
