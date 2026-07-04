# face-recognition-door-lock
An AI-powered smart door lock system that uses facial recognition to identify authorized users and automatically unlock the door.
# Face Recognition Door Lock

Hệ thống khóa cửa thông minh sử dụng trí tuệ nhân tạo (AI) và công nghệ nhận diện khuôn mặt để xác thực người dùng được cấp quyền và tự động mở cửa. Dự án kết hợp thị giác máy tính (Computer Vision), phần cứng nhúng (Embedded Systems) và giao tiếp IoT nhằm mang lại giải pháp kiểm soát truy cập an toàn và tiện lợi.

## Tính năng

* Phát hiện và nhận diện khuôn mặt theo thời gian thực.
* Tự động mở khóa cửa cho người dùng được cấp quyền.
* Đăng ký người dùng và quản lý cơ sở dữ liệu khuôn mặt.
* Ghi nhật ký và giám sát lịch sử truy cập.
* Tích hợp với phần cứng nhúng.
* Hỗ trợ giám sát từ xa thông qua giao diện web (tùy chọn).
* Hỗ trợ các mô-đun camera như ESP32-CAM hoặc camera USB.
* Xác thực và kiểm soát truy cập an toàn.

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
│
├── firmware/
│   ├── esp32/
│   │   ├── main/
│   │   ├── include/
│   │   ├── lib/
│   │   └── platformio.ini
│   │
│   └── arduino/
│       ├── src/
│       └── include/
│
├── ai-model/
│   ├── dataset/
│   │   ├── authorized_users/
│   │   └── test_images/
│   │
│   ├── training/
│   │   ├── train.py
│   │   └── preprocess.py
│   │
│   ├── inference/
│   │   ├── face_detector.py
│   │   ├── recognizer.py
│   │   └── embeddings.py
│   │
│   └── models/
│       ├── face_recognition_model.onnx
│       └── labels.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── app.js
│   │
│   ├── database/
│   │   ├── migrations/
│   │   └── schema.sql
│   │
│   └── package.json
│
├── dashboard/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── hardware/
│   ├── schematic/
│   ├── pcb/
│   ├── wiring/
│   └── components/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── setup.md
│   └── troubleshooting.md
│
├── logs/
│   ├── access_logs/
│   └── system_logs/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── hardware/
│
├── scripts/
│   ├── setup.sh
│   ├── deploy.sh
│   └── backup.sh
│
├── .gitignore
├── LICENSE
└── README.md
```

## Công nghệ sử dụng

### Trí tuệ nhân tạo (AI)

* OpenCV
* Face Recognition
* Mô hình học sâu (Deep Learning)
* ONNX Runtime

### Backend

* Node.js
* Express.js
* REST API

### Cơ sở dữ liệu

* MySQL / PostgreSQL
* SQLite (dành cho môi trường phát triển)

### Hệ thống nhúng

* ESP32-CAM
* ESP32
* Servo Motor hoặc khóa điện tử
* Mô-đun Relay

### Frontend

* React
* Vite

## Quy trình hoạt động

1. Camera thu nhận hình ảnh khuôn mặt.
2. Hệ thống phát hiện khuôn mặt trong ảnh.
3. Trích xuất đặc trưng khuôn mặt.
4. So sánh với dữ liệu người dùng đã đăng ký.
5. Xác thực danh tính.
6. Gửi lệnh mở khóa đến bộ điều khiển cửa.
7. Ghi nhận lịch sử truy cập.
8. Gửi thông báo cho quản trị viên (nếu cần).

## Hướng phát triển trong tương lai

* Hỗ trợ ứng dụng di động.
* Xác thực đa lớp (Multi-Factor Authentication).
* Đồng bộ dữ liệu lên đám mây.
* Quản lý khách truy cập.
* Phát hiện giả mạo bằng ảnh hoặc video (Liveness Detection).
* Thông báo theo thời gian thực.
* Tích hợp trợ lý giọng nói AI.

## Giấy phép

Dự án được phát hành theo giấy phép MIT License.
