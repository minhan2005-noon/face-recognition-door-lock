# Web App

Ứng dụng web quản trị cho hệ thống khóa cửa nhận diện khuôn mặt. App chạy bằng Vite và gọi backend API tại `http://localhost:3000/api`.

Dashboard hiện có:

- Tổng quan trạng thái API, MQTT, WebSocket.
- Danh sách thiết bị và nút gửi lệnh khóa/mở khóa.
- Lịch sử ra vào mới nhất.
- Cảnh báo vận hành tính từ device/log/command hiện có.
- Báo cáo nhanh từ access logs, users và lock commands.
- Form tạo user và form gửi recognition event mẫu.
- Bảng API contract để thấy nút nào đang gọi endpoint nào.

## Cài đặt

```bash
cd web/app
npm install
```

## Chạy development

Mở terminal 1 để chạy backend:

```bash
cd backend
API_KEY=minhan123 MQTT_URL= npm run dev
```

Mở terminal 2 để chạy web:

```bash
cd web/app
npm run dev
```

Sau đó mở:

```text
http://localhost:5173
```

Trên dashboard nhập:

```text
Backend API: http://localhost:3000/api
API key: minhan123
```

Sau đó bấm `Lưu cấu hình`.

## API dashboard đang dùng

Dashboard không hard-code endpoint lạ. Mỗi nút điều khiển bám theo API hiện có của backend:

```text
GET    /api/health
GET    /api/devices
PATCH  /api/devices/:id/status
GET    /api/users
POST   /api/users
DELETE /api/users/:id
GET    /api/access-logs
GET    /api/lock/commands
POST   /api/lock/unlock
POST   /api/lock/lock
POST   /api/recognition-events
```

Ví dụ:

- Bấm `Mở khóa` gọi `POST /api/lock/unlock`.
- Bấm `Khóa cửa` gọi `POST /api/lock/lock`.
- Bấm `Online` hoặc `Offline` gọi `PATCH /api/devices/:id/status`.
- Phần latest/history đọc từ `GET /api/access-logs`.
- Phần reports/alerts được tính từ dữ liệu API hiện có, chưa cần endpoint riêng.

## Chạy bằng Docker

Build image web:

```bash
cd web/app
docker build -t face-door-lock-web .
```

Chạy container:

```bash
docker run --rm -p 8080:80 face-door-lock-web
```

Sau đó mở:

```text
http://localhost:8080
```

## Đổi URL backend

Nếu backend không chạy ở port `3000`, tạo file `.env` trong `web/app`:

```env
VITE_API_URL=http://localhost:3000/api
```
