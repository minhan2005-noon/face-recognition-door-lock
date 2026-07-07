# Cài Đặt Và Sử Dụng MQTT Broker

Tài liệu này hướng dẫn cách cài đặt, chạy, kiểm tra và sử dụng MQTT broker cho dự án khóa cửa nhận diện khuôn mặt. Tài liệu cũng giải thích vai trò của DevOps trong dự án để nhóm có thể hiểu rõ phần hạ tầng, cách chạy service và cách kết nối backend với thiết bị ESP32.

## 1. Mục Đích Của MQTT Broker

Trong hệ thống khóa cửa nhận diện khuôn mặt, MQTT broker đóng vai trò là trung gian truyền tin realtime giữa backend và thiết bị IoT như ESP32, ESP32-CAM, relay hoặc servo điều khiển khóa cửa.

Backend không nên điều khiển phần cứng bằng cách truy cập trực tiếp vào ESP32. Thay vào đó, backend gửi một message lên MQTT broker. ESP32 subscribe topic tương ứng, nhận message và thực hiện lệnh.

Ví dụ:

```text
Backend quyết định mở khóa
        ↓
Backend publish lệnh unlock lên MQTT broker
        ↓
ESP32 đang subscribe topic command
        ↓
ESP32 nhận lệnh
        ↓
ESP32 điều khiển relay/servo mở khóa
```

MQTT broker giúp hệ thống:

- Giao tiếp realtime giữa backend và thiết bị.
- Tách backend khỏi phần cứng.
- Giảm việc thiết bị phải gọi API liên tục để hỏi có lệnh mới không.
- Phù hợp với hệ thống IoT vì MQTT nhẹ, nhanh và dễ chạy trên ESP32.
- Cho phép nhiều thiết bị cùng kết nối tới một broker.

## 2. MQTT Khác SQL Như Thế Nào?

MQTT và SQL không thay thế nhau. Hai phần này có mục đích khác nhau.

SQL/database dùng để lưu dữ liệu lâu dài:

- Người dùng.
- Dữ liệu khuôn mặt.
- Thiết bị.
- Lịch sử ra vào.
- Sự kiện nhận diện.
- Lệnh khóa/mở khóa.

MQTT dùng để truyền message realtime:

- Backend gửi lệnh mở khóa cho ESP32.
- Backend gửi quyết định nhận diện cho thiết bị.
- ESP32 gửi trạng thái online/offline về backend.
- ESP32 gửi phần trăm pin hoặc trạng thái khóa.

Tóm tắt:

```text
SQL  -> lưu dữ liệu
MQTT -> truyền lệnh và trạng thái realtime
```

## 3. Vai Trò Của DevOps Trong Dự Án

DevOps là phần giúp hệ thống chạy được ổn định, dễ cài đặt, dễ kiểm tra và dễ deploy. Trong dự án này, DevOps không trực tiếp viết thuật toán nhận diện khuôn mặt, nhưng chịu trách nhiệm để các thành phần có thể chạy cùng nhau.

Các thành phần cần DevOps hỗ trợ:

```text
Web App
  ↓
Backend API
  ↓
Database

Backend API
  ↕
MQTT Broker
  ↕
ESP32 / Door Lock / Camera
```

DevOps phụ trách:

- Cài đặt môi trường chạy project.
- Quản lý biến môi trường.
- Chạy backend, web app, database và MQTT broker.
- Kiểm tra port và service.
- Xử lý lỗi khi service bị crash.
- Chuẩn bị Docker hoặc Docker Compose.
- Hỗ trợ deploy lên server/cloud.
- Quản lý quy trình branch, test và release.

Trong dự án này:

- Backend viết code kết nối MQTT trong `backend/src/services/mqttService.js`.
- DevOps cài và vận hành MQTT broker, ví dụ Mosquitto.
- Firmware/ESP32 subscribe topic để nhận lệnh và publish trạng thái.

## 4. Các Port Quan Trọng

```text
3000 -> Backend API
5173 -> Web App
1883 -> MQTT Broker
```

## 5. Cài Đặt Mosquitto Broker Trên macOS

Mosquitto là MQTT broker phổ biến, nhẹ và phù hợp cho môi trường development.

Cài Mosquitto:

```bash
brew install mosquitto
```

Kiểm tra Mosquitto:

```bash
which mosquitto
mosquitto -h
```

File cấu hình thường nằm ở:

```text
/opt/homebrew/etc/mosquitto/mosquitto.conf
```

Cấu hình local cơ bản:

```conf
listener 1883 localhost
allow_anonymous true

persistence true
persistence_location /opt/homebrew/var/mosquitto/

log_dest file /opt/homebrew/var/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
```

Chạy broker:

```bash
brew services start mosquitto
```

Restart broker:

```bash
brew services restart mosquitto
```

Dừng broker:

```bash
brew services stop mosquitto
```

Kiểm tra broker:

```bash
brew services list | grep mosquitto
lsof -i :1883
```

## 6. Test MQTT Broker

Terminal 1 subscribe topic:

```bash
mosquitto_sub -h localhost -p 1883 -t doorlock/test
```

Terminal 2 publish message:

```bash
mosquitto_pub -h localhost -p 1883 -t doorlock/test -m "hello mqtt"
```

Nếu terminal 1 nhận được:

```text
hello mqtt
```

nghĩa là broker hoạt động.

## 7. Kết Nối Backend Với Broker

Chạy backend không MQTT:

```bash
cd backend
npm run dev
```

Chạy backend có MQTT:

```bash
cd backend
MQTT_URL=mqtt://localhost:1883 npm run dev
```

Kiểm tra:

```bash
curl http://localhost:3000/api/health
```

Nếu MQTT kết nối thành công, response có:

```json
{
  "mqtt": {
    "enabled": true,
    "connected": true,
    "brokerUrl": "mqtt://localhost:1883"
  }
}
```

## 8. Bảo Mật 2 Lớp Trong Giai Đoạn Chưa Có Thiết Bị

Khi chưa có ESP32 thật, hệ thống nên làm trước 2 lớp bảo mật:

```text
1. API key cho REST API
2. Username/password cho MQTT broker
```

Hai lớp này đủ gọn cho giai đoạn dev/demo nhưng vẫn thể hiện rõ ý thức bảo mật.

## 9. Bảo Mật REST API Bằng API Key

Backend hỗ trợ biến môi trường:

```env
API_KEY=dev-secret-key
```

Khi `API_KEY` được bật, các endpoint dưới `/api` sẽ cần API key, trừ:

```text
GET /api/health
```

Client gửi API key bằng header:

```http
X-API-Key: dev-secret-key
```

Hoặc:

```http
Authorization: Bearer dev-secret-key
```

Chạy backend có API key:

```bash
cd backend
API_KEY=dev-secret-key npm run dev
```

Chạy backend có cả API key và MQTT:

```bash
cd backend
API_KEY=dev-secret-key \
MQTT_URL=mqtt://localhost:1883 \
npm run dev
```

Ví dụ gọi API:

```bash
curl http://localhost:3000/api/users \
  -H "X-API-Key: dev-secret-key"
```

Nếu thiếu hoặc sai API key, backend trả:

```json
{
  "success": false,
  "message": "API key không hợp lệ hoặc bị thiếu.",
  "errorCode": "UNAUTHORIZED"
}
```

## 10. Bảo Mật MQTT Bằng Username Và Password

Trong môi trường local ban đầu có thể dùng:

```conf
allow_anonymous true
```

Nhưng khi muốn tăng bảo mật, đổi thành:

```conf
allow_anonymous false
password_file /opt/homebrew/etc/mosquitto/passwd
```

Tạo user MQTT:

```bash
mosquitto_passwd -c /opt/homebrew/etc/mosquitto/passwd doorlock_backend
```

Lệnh trên sẽ yêu cầu nhập password.

Restart broker:

```bash
brew services restart mosquitto
```

Chạy backend với MQTT username/password:

```bash
cd backend
MQTT_URL=mqtt://localhost:1883 \
MQTT_USERNAME=doorlock_backend \
MQTT_PASSWORD=strong_password \
npm run dev
```

Test publish có username/password:

```bash
mosquitto_pub -h localhost -p 1883 \
  -u doorlock_backend \
  -P strong_password \
  -t doorlock/test \
  -m "hello secure mqtt"
```

Test subscribe có username/password:

```bash
mosquitto_sub -h localhost -p 1883 \
  -u doorlock_backend \
  -P strong_password \
  -t doorlock/test
```

## 11. Topic MQTT Trong Dự Án

Backend publish lệnh khóa/mở khóa:

```text
doorlock/device/{deviceId}/command
```

Backend publish quyết định nhận diện:

```text
doorlock/device/{deviceId}/decision
```

ESP32 publish trạng thái:

```text
doorlock/device/{deviceId}/status
```

Ví dụ command:

```json
{
  "commandId": "cmd_xxx",
  "action": "unlock",
  "reason": "recognized_user",
  "userId": "user_xxx"
}
```

Ví dụ status:

```json
{
  "status": "online",
  "batteryLevel": 86
}
```

## 12. Luồng Xử Lý Có MQTT Và Bảo Mật

```text
Web/Firmware/AI gửi request kèm API key
        ↓
Backend kiểm tra API key
        ↓
Backend xử lý logic và database
        ↓
Backend kết nối MQTT bằng username/password
        ↓
Backend publish command lên Mosquitto
        ↓
ESP32 nhận command và điều khiển khóa
```

## 13. Lỗi Thường Gặp

Port backend bị chiếm:

```bash
lsof -i :3000
kill -9 PID
```

Broker chưa chạy:

```bash
brew services list | grep mosquitto
brew services start mosquitto
```

Chạy npm sai thư mục:

```bash
cd /Users/hoangminhan/face-recognition-door-lock/backend
npm run dev
```

API báo unauthorized:

```text
Kiểm tra đã gửi đúng X-API-Key chưa.
```

MQTT không connect khi đã bật password:

```text
Kiểm tra MQTT_USERNAME và MQTT_PASSWORD có khớp user trong password_file không.
```
