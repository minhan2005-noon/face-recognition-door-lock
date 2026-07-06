# Backend

Backend cung cấp REST API cho hệ thống khóa cửa nhận diện khuôn mặt. API dùng Node.js, Express và SQLite cho môi trường phát triển.

## Cài đặt

```bash
cd backend
npm install
```

## Chạy server

```bash
npm run dev
```

Hoặc chạy production:

```bash
npm start
```

Mặc định API chạy tại `http://localhost:3000`. Giao diện web nằm trong `../web/app` và chạy riêng bằng Vite.

## Database

SQLite database sẽ được tự tạo tại:

```text
backend/database/door-lock.sqlite
```

Schema nằm trong:

```text
backend/database/schema.sql
```

Bạn có thể đổi đường dẫn database bằng biến môi trường:

```bash
DATABASE_PATH=/absolute/path/door-lock.sqlite npm start
```

## MQTT

Backend hỗ trợ MQTT để gửi lệnh khóa/mở khóa tới thiết bị và nhận trạng thái từ ESP32/camera. Nếu không cấu hình `MQTT_URL`, MQTT sẽ tắt và REST API vẫn chạy bình thường.

Ví dụ chạy với broker local:

```bash
MQTT_URL=mqtt://localhost:1883 npm run dev
```

Topic mặc định:

```text
doorlock/device/{deviceId}/command
doorlock/device/{deviceId}/decision
doorlock/device/{deviceId}/status
```

Backend publish command:

```json
{
  "commandId": "cmd_xxx",
  "action": "unlock",
  "reason": "recognized_user",
  "userId": "user_xxx",
  "createdAt": "2026-07-06T00:00:00.000Z"
}
```

Thiết bị publish status:

```json
{
  "status": "online",
  "batteryLevel": 86,
  "lastSeenAt": "2026-07-06T00:00:00.000Z"
}
```

## Endpoint chính

- `GET /api/health`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/:id/face-data`
- `GET /api/devices`
- `POST /api/devices`
- `PATCH /api/devices/:id/status`
- `GET /api/access-logs`
- `POST /api/recognition-events`
- `POST /api/lock/unlock`
- `POST /api/lock/lock`

## Ví dụ nhanh

Tạo user:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Nguyen Van A","role":"resident"}'
```

Gửi kết quả nhận diện:

```bash
curl -X POST http://localhost:3000/api/recognition-events \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"door_lock_001","recognized":true,"userId":"USER_ID","confidence":0.92}'
```
