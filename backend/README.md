# Backend

Backend cung cấp REST API cho hệ thống khóa cửa nhận diện khuôn mặt. API dùng Node.js, Express và SQLite cho môi trường phát triển.

## Cài đặt

```bash
cd backend
npm install
```

Tham khảo biến môi trường trong:

```text
backend/.env.example
```

## Chạy server

```bash
npm run dev
```

Hoặc chạy production:

```bash
npm start
```

## Chạy bằng Docker

Build image backend:

```bash
cd backend
docker build -t face-door-lock-backend .
```

Chạy container không MQTT:

```bash
docker run --rm -p 3000:3000 face-door-lock-backend
```

Chạy container có MQTT broker trên máy host:

```bash
docker run --rm -p 3000:3000 \
  -e API_KEY=dev-secret-key \
  -e MQTT_URL=mqtt://host.docker.internal:1883 \
  face-door-lock-backend
```

Mặc định API chạy tại `http://localhost:3000`. Giao diện web nằm trong `../web/app` và chạy riêng bằng Vite.

## Bảo mật API

Backend hỗ trợ API key cho các endpoint riêng tư. Nếu không cấu hình `API_KEY`, backend vẫn chạy ở chế độ development và chỉ cảnh báo trong terminal.

Chạy backend với API key:

```bash
API_KEY=dev-secret-key npm run dev
```

Gọi API cần gửi một trong hai header sau:

```http
X-API-Key: dev-secret-key
```

Hoặc:

```http
Authorization: Bearer dev-secret-key
```

Ví dụ:

```bash
curl http://localhost:3000/api/users \
  -H "X-API-Key: dev-secret-key"
```

Endpoint public không cần API key:

```text
GET /api/health
```

Các endpoint còn lại dưới `/api` sẽ cần API key khi biến môi trường `API_KEY` được bật.

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

Nếu broker có username/password:

```bash
MQTT_URL=mqtt://localhost:1883 \
MQTT_USERNAME=doorlock_backend \
MQTT_PASSWORD=strong_password \
npm run dev
```

Cài và chạy broker local bằng Mosquitto trên macOS:

```bash
brew install mosquitto
brew services start mosquitto
```

Kiểm tra broker:

```bash
brew services list | grep mosquitto
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

## WebSocket

Backend hỗ trợ WebSocket để web dashboard hoặc tool giám sát nhận dữ liệu realtime mà không cần refresh liên tục.

Endpoint mặc định:

```text
ws://localhost:3000/ws
```

Các event backend broadcast:

```text
recognition.event -> khi có sự kiện nhận diện mới
lock.command      -> khi tạo lệnh lock/unlock
lock.command.status -> khi trạng thái lệnh lock/unlock thay đổi
device.status     -> khi nhận status từ MQTT của thiết bị
connection        -> khi client WebSocket kết nối thành công
```

Ví dụ client JavaScript:

```js
const socket = new WebSocket('ws://localhost:3000/ws');

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message.type, message.data);
};
```

Nếu bật `API_KEY`, WebSocket client cần truyền key qua query string:

```js
const socket = new WebSocket('ws://localhost:3000/ws?apiKey=dev-secret-key');
```

Kiểm tra trạng thái WebSocket:

```bash
curl http://localhost:3000/api/health
```

Response sẽ có:

```json
{
  "websocket": {
    "enabled": true,
    "path": "/ws",
    "clients": 0,
    "protected": true
  }
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
- `GET /api/lock/commands`
- `PATCH /api/lock/commands/:id/status`
- `POST /api/lock/unlock`
- `POST /api/lock/lock`

## Ví dụ nhanh

Tạo user:

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-secret-key" \
  -d '{"name":"Nguyen Van A","role":"resident"}'
```

Gửi kết quả nhận diện:

```bash
curl -X POST http://localhost:3000/api/recognition-events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-secret-key" \
  -d '{"deviceId":"door_lock_001","recognized":true,"userId":"USER_ID","confidence":0.92}'
```



```bảo mật
  xong phần KEY-API,
```