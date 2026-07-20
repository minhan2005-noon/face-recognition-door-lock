# Components

Danh sách linh kiện cần mua cho nguyên mẫu khóa cửa nhận diện khuôn mặt.

## Phương án đề xuất

Hệ thống dùng ESP32-CAM để chụp ảnh/kết nối Wi-Fi, backend xử lý nhận diện và gửi lệnh mở khóa qua API/MQTT. ESP32-CAM điều khiển module relay, relay đóng/ngắt nguồn cho khóa điện.

## Danh sách linh kiện chính

| STT | Linh kiện | Số lượng | Thông số gợi ý | Vai trò | Bắt buộc |
| --- | --- | ---: | --- | --- | --- |
| 1 | ESP32-CAM AI-Thinker | 1 | Wi-Fi 2.4 GHz, camera OV2640 | Camera và bộ điều khiển IoT | Có |
| 2 | Mạch nạp USB to TTL cho ESP32-CAM | 1 | 5V/3.3V, chip CP2102/CH340/FT232 | Nạp firmware và debug serial | Có |
| 3 | Module relay 1 kênh | 1 | Relay 5V, opto cách ly nếu có | Đóng/ngắt khóa điện | Có |
| 4 | Khóa chốt điện/solenoid lock | 1 | 12V DC, loại fail-secure hoặc phù hợp cửa | Cơ cấu khóa/mở cửa | Có |
| 5 | Nguồn 12V DC | 1 | Dòng tối thiểu theo khóa, nên từ 2A trở lên | Cấp nguồn riêng cho khóa điện | Có |
| 6 | Module hạ áp DC-DC buck | 1 | 12V xuống 5V, dòng 2A trở lên | Cấp 5V ổn định cho ESP32-CAM/relay | Có |
| 7 | Breadboard hoặc board hàn lỗ | 1 | Kích thước vừa mạch thử nghiệm | Lắp và cố định mạch | Có |
| 8 | Dây jumper Dupont | 1 bộ | Đực-cái, cái-cái, đực-đực | Đấu nối tín hiệu và nguồn | Có |
| 9 | Dây điện cấp nguồn khóa | 1 bộ | Dây chịu dòng phù hợp khóa 12V | Nối nguồn qua relay tới khóa | Có |
| 10 | Jack DC cái/đầu nối terminal | 2-4 | Jack 5.5x2.1mm hoặc domino terminal | Kết nối nguồn chắc chắn | Nên có |

## Linh kiện phụ trợ nên mua

| STT | Linh kiện | Số lượng | Gợi ý dùng khi nào |
| --- | --- | ---: | --- |
| 1 | Nút nhấn mở cửa từ bên trong | 1 | Cho phép mở khóa thủ công khi ở trong phòng |
| 2 | Công tắc từ/cảm biến cửa | 1 | Kiểm tra cửa đang đóng hay mở |
| 3 | LED trạng thái | 2-3 | Báo nguồn, Wi-Fi, trạng thái khóa |
| 4 | Điện trở 220 ohm | 2-3 | Hạn dòng cho LED |
| 5 | Buzzer 5V hoặc 3.3V | 1 | Báo mở khóa, lỗi hoặc truy cập bị từ chối |
| 6 | Vỏ hộp nhựa | 1 | Bảo vệ ESP32-CAM và mạch relay |
| 7 | Ốc, ke góc, băng keo hai mặt | 1 bộ | Cố định mạch và khóa khi lắp thực tế |
| 8 | Tản nhiệt nhỏ cho ESP32-CAM | 1 | Hữu ích nếu thiết bị chạy lâu trong hộp kín |

## Phương án thay thế

| Nhu cầu | Linh kiện thay thế | Ghi chú |
| --- | --- | --- |
| Muốn xử lý ảnh bằng máy tính/Raspberry Pi | Camera USB + ESP32 DevKit | Camera USB gửi ảnh cho AI, ESP32 chỉ điều khiển khóa |
| Muốn thử cơ cấu nhẹ trước khi dùng khóa điện | Servo SG90/MG996R | Phù hợp mô hình demo, không nên dùng thay khóa thật nếu cần bảo mật |
| Muốn điều khiển tải 12V gọn hơn relay | MOSFET driver module | Cần chọn đúng dòng tải và có diode bảo vệ nếu tải cảm ứng |
| Muốn ổn định nguồn hơn | Adapter 5V riêng cho ESP32-CAM | Vẫn cần nối chung GND với mạch điều khiển nếu có tín hiệu chung |

## Tổng hợp số lượng cần mua

| Nhóm | Số món |
| --- | ---: |
| Linh kiện bắt buộc | 9 |
| Linh kiện nên có | 1 |
| Linh kiện phụ trợ tùy chọn | 8 |
| Tổng nếu mua đủ cả phụ trợ | 18 |

## Lưu ý an toàn

- Không cấp nguồn khóa điện trực tiếp từ chân GPIO của ESP32-CAM.
- Dùng nguồn riêng cho khóa điện nếu khóa cần dòng lớn.
- Nối chung GND giữa ESP32-CAM, relay và module nguồn liên quan.
- Kiểm tra điện áp kích relay trước khi đấu với ESP32-CAM.
- Test mở/đóng khóa trên bàn trước khi lắp lên cửa thật.
