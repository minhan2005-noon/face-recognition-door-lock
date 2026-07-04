# Firmware

Thư mục này chứa mã nguồn điều khiển phần cứng của khóa cửa thông minh.

## Cần làm

- Chọn nền tảng chính: ESP32-CAM, ESP32 riêng với camera USB, hoặc Arduino.
- Định nghĩa chân điều khiển relay, servo, nút nhấn, đèn trạng thái và cảm biến cửa.
- Nhận lệnh mở khóa từ backend hoặc từ bộ nhận diện chạy cục bộ.
- Báo cáo trạng thái thiết bị và lỗi phần cứng.

## Cài đặt

- Cài PlatformIO nếu dùng ESP32: `pip install platformio`.
- Cài Arduino IDE nếu dùng thư mục `arduino/`.
- Cài driver USB/serial phù hợp với board.

## Kiểm tra

- Biên dịch firmware trên máy tính.
- Nạp vào board thật.
- Kiểm tra relay/servo hoạt động với nguồn riêng phù hợp.

