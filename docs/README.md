# Docs

Thư mục tài liệu chính của dự án.

## Cần làm

- `architecture.md`: kiến trúc tổng thể.
- `api.md`: mô tả REST API.
- `setup.md`: hướng dẫn cài đặt.
- `troubleshooting.md`: lỗi thường gặp.
- `backend-api-wiki.md`: phạm vi làm việc của nhánh backend/API.
- `esp32-firmware-wiki.md`: phạm vi làm việc của nhánh firmware.
- `face-recognition-wiki.md`: phạm vi làm việc của nhánh AI nhận diện khuôn mặt.
- `web-dashboard-wiki.md`: phạm vi làm việc của nhánh dashboard/web.

## Cách viết

- Cập nhật tài liệu mỗi khi thay đổi hành vi hệ thống.
- Ghi lệnh cài đặt có thể copy/chạy được.
- Tài liệu nên viết bằng tiếng Việt có dấu.
- Khi thay đổi API, cập nhật `api.md` và ghi chú trong Pull Request.

## Chạy Backend Bằng Docker Kèm MQTT

Phần này hướng dẫn cách chạy backend trong Docker và kết nối cùng lúc với MQTT broker Mosquitto trên máy host.

### 1. Điều kiện cần có

Máy cần cài:

- Docker Desktop.
- Mosquitto MQTT broker.
- Source code backend đã có `backend/Dockerfile`.

Kiểm tra Docker:

```bash
docker --version
docker compose version
```

Kiểm tra Mosquitto:

```bash
brew services list | grep mosquitto
```

Nếu Mosquitto chưa chạy:

```bash
brew services start mosquitto
```

### 2. Build Backend Image

Từ thư mục project:

```bash
cd /Users/hoangminhan/face-recognition-door-lock/backend
docker build -t face-door-lock-backend .
```

Nếu build thành công, Docker sẽ tạo image:

```text
face-door-lock-backend
```

### 3. Dừng Container Cũ Nếu Đang Chạy

Xem container đang chạy:

```bash
docker ps
```

Nếu backend cũ đang chạy ở port `3000`, dừng nó:

```bash
docker stop <container_name_or_id>
```

Ví dụ:

```bash
docker stop face-door-lock-backend
```

Nếu container đã tồn tại nhưng đang dừng, xóa nó trước khi tạo container mới cùng tên:

```bash
docker rm face-door-lock-backend
```

### 4. Chạy Backend Container Có API Key Và MQTT

Chạy backend container ở chế độ nền:

```bash
docker run -d --name face-door-lock-backend \
  -p 3000:3000 \
  -e API_KEY=minhan123 \
  -e MQTT_URL=mqtt://host.docker.internal:1883 \
  face-door-lock-backend
```

Giải thích:

- `-d`: chạy container ở background.
- `--name face-door-lock-backend`: đặt tên container cho dễ quản lý.
- `-p 3000:3000`: map port `3000` của máy host vào port `3000` trong container.
- `-e API_KEY=minhan123`: bật bảo mật API key.
- `-e MQTT_URL=mqtt://host.docker.internal:1883`: cho container kết nối MQTT broker đang chạy trên máy Mac.
- `face-door-lock-backend`: tên image backend đã build.

Lưu ý: khi chạy Docker trên macOS, container không dùng `localhost` để gọi service trên máy host. Vì vậy cần dùng:

```text
host.docker.internal
```

Thay vì:

```text
localhost
```

### 5. Kiểm Tra Log Container

Xem log backend:

```bash
docker logs -f face-door-lock-backend
```

Nếu chạy đúng, log sẽ có:

```text
Backend API is running at http://localhost:3000
WebSocket gateway is running at ws://localhost:3000/ws
MQTT connected: mqtt://host.docker.internal:1883
```

Thoát màn hình log bằng:

```text
Ctrl + C
```

Container vẫn tiếp tục chạy nền.

### 6. Kiểm Tra API Health

Gọi health check:

```bash
curl http://localhost:3000/api/health
```

Kết quả đúng sẽ có:

```json
{
  "success": true,
  "status": "ok",
  "service": "backend-api",
  "mqtt": {
    "enabled": true,
    "connected": true,
    "brokerUrl": "mqtt://host.docker.internal:1883"
  },
  "websocket": {
    "enabled": true,
    "path": "/ws",
    "protected": true
  }
}
```

Nếu thấy:

```json
"mqtt": {
  "enabled": false
}
```

nghĩa là container được chạy thiếu biến môi trường `MQTT_URL`.

Nếu thấy:

```json
"mqtt": {
  "enabled": true,
  "connected": false
}
```

nghĩa là backend đã bật MQTT nhưng chưa kết nối được broker. Cần kiểm tra Mosquitto.

### 7. Test API Có API Key

Vì container chạy với:

```bash
-e API_KEY=minhan123
```

nên các endpoint riêng tư cần gửi header:

```http
X-API-Key: minhan123
```

Ví dụ:

```bash
curl http://localhost:3000/api/users \
  -H "X-API-Key: minhan123"
```

Test tạo lệnh mở khóa:

```bash
curl -X POST http://localhost:3000/api/lock/unlock \
  -H "Content-Type: application/json" \
  -H "X-API-Key: minhan123" \
  -d '{"deviceId":"door_lock_001","reason":"docker_mqtt_test"}'
```

### 8. Test MQTT Realtime

Mở terminal 1 để subscribe command:

```bash
mosquitto_sub -h localhost -p 1883 -t doorlock/device/door_lock_001/command
```

Mở terminal 2 gọi API unlock:

```bash
curl -X POST http://localhost:3000/api/lock/unlock \
  -H "Content-Type: application/json" \
  -H "X-API-Key: minhan123" \
  -d '{"deviceId":"door_lock_001","reason":"mqtt_realtime_test"}'
```

Nếu MQTT hoạt động, terminal 1 sẽ nhận được message command.

### 9. Lệnh Quản Lý Container

Xem container đang chạy:

```bash
docker ps
```

Xem toàn bộ container, kể cả container đã dừng:

```bash
docker ps -a
```

Dừng backend:

```bash
docker stop face-door-lock-backend
```

Xóa container:

```bash
docker rm face-door-lock-backend
```

Xem log:

```bash
docker logs -f face-door-lock-backend
```

### 10. Khi Nào Cần Chạy Lại Container?

Các biến môi trường như `API_KEY`, `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` được đọc lúc container khởi động.

Nếu muốn đổi các biến này, cần dừng container cũ và chạy container mới.

Ví dụ muốn đổi API key:

```bash
docker stop face-door-lock-backend
docker rm face-door-lock-backend

docker run -d --name face-door-lock-backend \
  -p 3000:3000 \
  -e API_KEY=new-secret-key \
  -e MQTT_URL=mqtt://host.docker.internal:1883 \
  face-door-lock-backend
```

### 11. Tóm Tắt Lệnh Nhanh

```bash
brew services start mosquitto

cd /Users/hoangminhan/face-recognition-door-lock/backend
docker build -t face-door-lock-backend .

docker stop face-door-lock-backend 2>/dev/null
docker rm face-door-lock-backend 2>/dev/null

docker run -d --name face-door-lock-backend \
  -p 3000:3000 \
  -e API_KEY=minhan123 \
  -e MQTT_URL=mqtt://host.docker.internal:1883 \
  face-door-lock-backend

curl http://localhost:3000/api/health
```
