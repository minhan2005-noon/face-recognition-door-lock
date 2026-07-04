# Firmware ESP32

Thư mục này dành cho firmware ESP32/ESP32-CAM dùng PlatformIO.

## Cần làm

- Cấu hình board trong `platformio.ini`.
- Thêm file chương trình chính trong `main/`.
- Đặt header dùng chung trong `include/`.
- Đặt thư viện nội bộ trong `lib/`.
- Thiết lập Wi-Fi, camera, giao tiếp API/MQTT và điều khiển khóa.

## Cài đặt

- Cài PlatformIO Core: `pip install platformio`.
- Kiểm tra board: `pio boards esp32`.
- Kết nối board qua USB.

## Chạy

- Build: `pio run`.
- Upload: `pio run --target upload`.
- Mở serial monitor: `pio device monitor`.

