# Tài liệu API

Tài liệu này mô tả các REST API dự kiến cho hệ thống khóa cửa nhận diện khuôn mặt. Backend sẽ là điểm trung gian giữa dashboard, AI service, firmware và database.

## Quy ước chung

- Base URL môi trường phát triển: `http://localhost:3000`
- Định dạng request/response: JSON
- Header mặc định:

```http
Content-Type: application/json
X-API-Key: <api_key>
```

`GET /api/health` là endpoint public. Các endpoint còn lại dưới `/api` cần API key khi backend chạy với biến môi trường `API_KEY`.

## Mã trạng thái

- `200 OK`: xử lý thành công.
- `201 Created`: tạo tài nguyên thành công.
- `400 Bad Request`: dữ liệu gửi lên không hợp lệ.
- `401 Unauthorized`: chưa đăng nhập hoặc token không hợp lệ.
- `403 Forbidden`: không đủ quyền.
- `404 Not Found`: không tìm thấy tài nguyên.
- `409 Conflict`: dữ liệu bị trùng hoặc xung đột.
- `500 Internal Server Error`: lỗi hệ thống.

## Response lỗi chuẩn

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errorCode": "ERROR_CODE"
}
```

## Health Check

### `GET /api/health`

Kiểm tra backend còn hoạt động hay không.

Response:

```json
{
  "success": true,
  "status": "ok",
  "service": "backend-api",
  "mqtt": {
    "enabled": true,
    "connected": true,
    "brokerUrl": "mqtt://localhost:1883"
  },
  "websocket": {
    "enabled": true,
    "path": "/ws",
    "clients": 0,
    "protected": true
  }
}
```

## Users

### `GET /api/users`

Lấy danh sách người dùng được phép mở khóa.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "user_001",
      "name": "Nguyễn Văn A",
      "role": "resident",
      "status": "active",
      "createdAt": "2026-07-04T08:00:00.000Z"
    }
  ]
}
```

### `POST /api/users`

Tạo người dùng mới.

Request:

```json
{
  "name": "Nguyễn Văn A",
  "role": "resident"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "user_001",
    "name": "Nguyễn Văn A",
    "role": "resident",
    "status": "active"
  }
}
```

### `PATCH /api/users/:id`

Cập nhật thông tin người dùng.

Request:

```json
{
  "name": "Nguyễn Văn A",
  "status": "inactive"
}
```

### `DELETE /api/users/:id`

Vô hiệu hóa hoặc xóa người dùng khỏi hệ thống.

## Face Data

### `POST /api/users/:id/face-data`

Lưu thông tin khuôn mặt hoặc embedding cho người dùng.

Request:

```json
{
  "embeddingId": "embedding_001",
  "modelVersion": "v1",
  "metadata": {
    "imageCount": 10
  }
}
```

## Recognition Events

### `POST /api/recognition-events`

AI service gửi kết quả nhận diện về backend.

Request:

```json
{
  "deviceId": "esp32_cam_001",
  "recognized": true,
  "userId": "user_001",
  "confidence": 0.92,
  "capturedAt": "2026-07-04T08:10:00.000Z"
}
```

Response:

```json
{
  "success": true,
  "decision": "unlock",
  "message": "Người dùng hợp lệ",
  "data": {
    "event": {
      "id": "event_001",
      "deviceId": "door_lock_001",
      "userId": "user_001",
      "recognized": true,
      "confidence": 0.92,
      "decision": "unlock"
    },
    "command": {
      "id": "cmd_001",
      "deviceId": "door_lock_001",
      "action": "unlock",
      "status": "queued"
    }
  }
}
```

## Lock Control

### `POST /api/lock/unlock`

Gửi lệnh mở khóa tới thiết bị.

Request:

```json
{
  "deviceId": "door_lock_001",
  "reason": "recognized_user",
  "userId": "user_001"
}
```

### `POST /api/lock/lock`

Gửi lệnh khóa cửa lại.

Request:

```json
{
  "deviceId": "door_lock_001",
  "reason": "manual"
}
```

### `GET /api/lock/commands`

Lấy danh sách lệnh khóa/mở khóa. Firmware có thể dùng endpoint này để polling lệnh nếu MQTT chưa sẵn sàng.

Query params:

- `deviceId`: lọc theo thiết bị.
- `status`: lọc theo trạng thái, ví dụ `queued`, `sent`, `completed`, `failed`.

### `PATCH /api/lock/commands/:id/status`

Firmware cập nhật trạng thái sau khi xử lý lệnh.

Request:

```json
{
  "status": "completed"
}
```

## Access Logs

### `GET /api/access-logs`

Lấy lịch sử ra vào.

Query params:

- `from`: thời gian bắt đầu.
- `to`: thời gian kết thúc.
- `userId`: lọc theo người dùng.
- `deviceId`: lọc theo thiết bị.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "log_001",
      "userId": "user_001",
      "deviceId": "door_lock_001",
      "action": "unlock",
      "result": "allowed",
      "createdAt": "2026-07-04T08:10:00.000Z"
    }
  ]
}
```

## Devices

### `GET /api/devices`

Lấy danh sách thiết bị trong hệ thống.

### `PATCH /api/devices/:id/status`

Cập nhật trạng thái thiết bị.

Request:

```json
{
  "status": "online",
  "batteryLevel": 86,
  "lastSeenAt": "2026-07-04T08:20:00.000Z"
}
```

## Bảo mật API

- Endpoint riêng tư dùng API key qua `X-API-Key` hoặc `Authorization: Bearer <api_key>`.
- Endpoint nhận dữ liệu từ AI/firmware nên dùng API key riêng cho thiết bị khi có thiết bị thật.
- Không trả về embedding khuôn mặt nếu frontend không thật sự cần.
- Không log token, mật khẩu hoặc dữ liệu khuôn mặt thô.

## MQTT

Backend có thể kết nối MQTT broker bằng biến môi trường:

```bash
MQTT_URL=mqtt://localhost:1883 npm run dev
```

Nếu broker có username/password:

```bash
MQTT_URL=mqtt://localhost:1883 \
MQTT_USERNAME=doorlock_backend \
MQTT_PASSWORD=strong_password \
npm run dev
```

Topic mặc định:

- `doorlock/device/{deviceId}/command`
- `doorlock/device/{deviceId}/decision`
- `doorlock/device/{deviceId}/status`

## WebSocket

Endpoint realtime:

```text
ws://localhost:3000/ws
```

Nếu bật `API_KEY`, kết nối bằng:

```text
ws://localhost:3000/ws?apiKey=<api_key>
```

Event realtime:

- `connection`: client kết nối thành công.
- `recognition.event`: có sự kiện nhận diện mới.
- `lock.command`: có lệnh khóa/mở khóa mới.
- `lock.command.status`: trạng thái lệnh khóa/mở khóa thay đổi.
- `device.status`: thiết bị gửi trạng thái qua MQTT.
