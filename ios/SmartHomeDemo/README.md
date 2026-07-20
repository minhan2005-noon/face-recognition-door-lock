# SmartHomeDemo iOS

App iOS demo cho người dùng cuối của dự án khóa cửa nhận diện mặt và nhà thông minh AI.

## Chạy demo

1. Mở `ios/SmartHomeDemo/SmartHomeDemo.xcodeproj` bằng Xcode.
2. Chọn iPhone Simulator hoặc iPhone thật.
3. Chạy backend local:

```bash
cd backend
PORT=3303 DATABASE_PATH=/tmp/door-lock-smart-check-v2.sqlite API_KEY=test-key MQTT_URL= node src/server.js
```

4. Trong app, giữ cấu hình mặc định nếu chạy Simulator:

```text
http://localhost:3303/api
test-key
```

Nếu chạy trên iPhone thật, đổi `localhost` thành IP của Mac trong cùng Wi-Fi, ví dụ:

```text
http://192.168.1.10:3303/api
```

## Chức năng

- Xem nhiệt độ trong nhà.
- Xem TV đang bật hay tắt.
- Xem đèn đang bật hay tắt.
- Xem có người lạ đang cố mở cửa hay không.
- Xem khuôn mặt vừa được dashboard quét là chủ nhà, người thân, khách hay người lạ.
- Xem thang máy mô hình đang chạy hay đang đứng.
- Bật camera để demo nhận diện khuôn mặt.
- Chụp mô phỏng nếu không cấp quyền camera.
- Gửi kết quả nhận diện về backend.
- Chạy mô phỏng Admin về nhà, khách hợp lệ, người lạ.
- Điều khiển đèn, quạt, TV, thang máy mô hình.
- Gửi lệnh giọng nói dạng text.

## API nhiệt độ

Xem nhiệt độ trong phòng và ngoài phòng:

```bash
curl -H 'X-API-Key: test-key' http://localhost:3303/api/smart-home/temperatures
```

## API trạng thái khuôn mặt

Dashboard/camera gửi kết quả quét mặt:

```bash
curl -H 'Content-Type: application/json' \
  -H 'X-API-Key: test-key' \
  -d '{"deviceId":"door_lock_001","recognized":false,"confidence":0.21}' \
  http://localhost:3303/api/recognition-events
```

App iOS đọc trạng thái khuôn mặt mới nhất:

```bash
curl -H 'X-API-Key: test-key' \
  http://localhost:3303/api/smart-home/face-status
```

Cập nhật nhiệt độ demo:

```bash
curl -H 'Content-Type: application/json' \
  -H 'X-API-Key: test-key' \
  -d '{"indoor":28.7,"outdoor":33.4}' \
  http://localhost:3303/api/smart-home/temperatures
```
