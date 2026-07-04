# Wiki: ESP32 Firmware

Trang wiki này mô tả phạm vi làm việc của nhánh `feature/esp32-firmware`.

## Mục tiêu

Nhánh `feature/esp32-firmware` dùng để phát triển phần firmware điều khiển thiết bị khóa cửa, bao gồm ESP32, ESP32-CAM, relay, servo, khóa điện và các cảm biến liên quan.

## Phạm vi công việc

- Cấu hình firmware cho ESP32/ESP32-CAM.
- Điều khiển relay, servo hoặc khóa điện.
- Nhận lệnh khóa/mở khóa từ backend.
- Báo cáo trạng thái thiết bị.
- Kết nối Wi-Fi.
- Kiểm tra camera nếu dùng ESP32-CAM.
- Viết checklist kiểm thử phần cứng.

## Thư mục được phép chỉnh sửa

- `firmware/`
- `firmware/esp32/`
- `firmware/arduino/`
- `hardware/`
- `tests/hardware/`
- `docs/setup.md` nếu bổ sung hướng dẫn cài firmware
- `docs/troubleshooting.md` nếu bổ sung lỗi phần cứng

## Không chỉnh sửa

- `backend/` nếu không thống nhất với nhóm backend.
- `ai-model/` nếu không thống nhất với nhóm AI.
- `dashboard/` hoặc `web/` nếu không thống nhất với nhóm frontend.

## Cấu trúc firmware dự kiến

```text
firmware/
├── esp32/
│   ├── main/          # Chương trình chính
│   ├── include/       # Header và cấu hình
│   ├── lib/           # Module nội bộ
│   └── platformio.ini # Cấu hình PlatformIO
└── arduino/
    ├── src/
    └── include/
```

## Luồng hoạt động

1. ESP32 khởi động.
2. Thiết bị kết nối Wi-Fi.
3. Thiết bị đăng ký trạng thái với backend.
4. Backend gửi lệnh mở khóa khi người dùng hợp lệ.
5. Firmware kích relay/servo trong thời gian an toàn.
6. Firmware khóa lại và báo trạng thái về backend.

## Cài đặt

```bash
cd firmware/esp32
pio run
pio run --target upload
pio device monitor
```

## Quy tắc an toàn

- Không cấp nguồn khóa điện trực tiếp từ chân GPIO.
- Dùng relay hoặc mạch driver phù hợp.
- Dùng nguồn riêng nếu khóa/servo cần dòng lớn.
- Nối chung GND giữa board và module điều khiển.
- Kiểm tra cơ chế mở khóa trên bàn trước khi lắp lên cửa thật.

## Pull Request

Pull Request vào `dev` cần ghi:

- Board đã test.
- Chân kết nối đã dùng.
- Cách cấp nguồn.
- Cách test relay/servo.
- Lỗi phần cứng còn tồn tại nếu có.

