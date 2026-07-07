# Wiki: Backend API

Trang wiki này mô tả phạm vi làm việc của nhánh `feature/backend-api` trong dự án khóa cửa nhận diện khuôn mặt.

## Mục tiêu

Nhánh `feature/backend-api` dùng để phát triển phần backend và REST API của hệ thống. Backend chịu trách nhiệm quản lý dữ liệu người dùng, lịch sử ra vào, xác thực quyền truy cập và giao tiếp với các thành phần khác như AI model, dashboard và firmware.

## Phạm vi công việc

- Xây dựng REST API cho hệ thống.
- Quản lý người dùng được phép mở khóa.
- Lưu thông tin liên quan đến dữ liệu khuôn mặt hoặc embedding.
- Ghi nhận lịch sử truy cập.
- Xử lý lệnh khóa/mở khóa.
- Kết nối và quản lý cơ sở dữ liệu.
- Kết nối MQTT broker để gửi lệnh realtime tới thiết bị.
- Mở WebSocket gateway để web/dashboard nhận cập nhật realtime.
- Bảo vệ API bằng API key trong môi trường dev/demo.
- Thiết kế middleware xác thực, phân quyền, logging và xử lý lỗi.
- Viết tài liệu API để các nhóm frontend, AI và firmware có thể tích hợp.

## Thư mục được phép chỉnh sửa

Các file và thư mục chính nên chỉnh sửa trên nhánh này:

- `backend/`
- `backend/src/`
- `backend/src/controllers/`
- `backend/src/services/`
- `backend/src/routes/`
- `backend/src/middleware/`
- `backend/database/`
- `docs/api.md`
- `tests/unit/` nếu test liên quan backend
- `tests/integration/` nếu test liên quan API hoặc database

## Không chỉnh sửa

Không chỉnh sửa hoặc xóa các phần không thuộc phạm vi backend:

- `ai-model/`
- `firmware/`
- `dashboard/`
- `web/`
- `hardware/`
- Các file cấu hình chung nếu chưa thống nhất với nhóm

Nếu bắt buộc phải sửa file ngoài phạm vi backend, cần báo trước cho nhóm và ghi rõ lý do trong Pull Request.

## Cấu trúc backend dự kiến

```text
backend/
├── src/
│   ├── controllers/   # Xử lý request và response
│   ├── services/      # Logic nghiệp vụ
│   ├── routes/        # Khai báo endpoint API
│   ├── middleware/    # Xác thực, validate, xử lý lỗi
│   └── app.js         # Điểm khởi tạo ứng dụng
├── database/
│   ├── migrations/    # Các thay đổi schema theo thời gian
│   └── schema.sql     # Schema database ban đầu
└── package.json       # Dependencies và scripts của backend
```

## API dự kiến

Các nhóm endpoint có thể triển khai:

- `GET /api/health`: kiểm tra trạng thái backend.
- `GET /api/users`: lấy danh sách người dùng.
- `POST /api/users`: tạo người dùng mới.
- `GET /api/access-logs`: lấy lịch sử ra vào.
- `POST /api/recognition-events`: nhận kết quả nhận diện từ AI service.
- `GET /api/lock/commands`: lấy danh sách lệnh khóa/mở khóa để firmware polling khi cần.
- `PATCH /api/lock/commands/:id/status`: cập nhật trạng thái xử lý lệnh.
- `POST /api/lock/unlock`: gửi lệnh mở khóa.
- `POST /api/lock/lock`: gửi lệnh khóa lại.
- `ws://localhost:3000/ws`: WebSocket realtime cho dashboard/tool giám sát.

Chi tiết endpoint nên được cập nhật trong `docs/api.md`.

## Biến môi trường quan trọng

Tham khảo `backend/.env.example`.

- `PORT`: port backend API.
- `DATABASE_PATH`: đường dẫn SQLite database.
- `API_KEY`: khóa bảo vệ các endpoint riêng tư.
- `MQTT_URL`: URL MQTT broker.
- `MQTT_USERNAME` và `MQTT_PASSWORD`: thông tin đăng nhập MQTT nếu broker bật xác thực.
- `WS_PATH`: đường dẫn WebSocket.

## Quy trình làm việc

1. Chuyển sang nhánh backend:

```bash
git switch feature/backend-api
```

2. Cập nhật code mới nhất từ remote:

```bash
git pull origin feature/backend-api
```

3. Nếu cần lấy thay đổi mới từ `dev`:

```bash
git fetch origin
git merge origin/dev
```

4. Chỉ chỉnh sửa các file thuộc phạm vi backend.

5. Commit thay đổi:

```bash
git add backend docs/api.md docs/backend-api-wiki.md tests
git commit -m "Thêm chức năng backend API"
```

6. Push lên GitHub:

```bash
git push origin feature/backend-api
```

7. Tạo Pull Request từ `feature/backend-api` vào `dev`.

## Quy tắc commit

Nên đặt commit message rõ ràng, ví dụ:

- `Thêm route quản lý người dùng`
- `Thêm schema cho access logs`
- `Thêm middleware xác thực API`
- `Cập nhật tài liệu API backend`

Không nên commit chung nhiều phần không liên quan trong cùng một commit.

## Quy tắc Pull Request

Pull Request vào `dev` cần có:

- Mô tả ngắn gọn thay đổi đã làm.
- Danh sách endpoint mới hoặc endpoint đã sửa.
- Ghi chú thay đổi database nếu có.
- Hướng dẫn test nếu có.
- Ảnh chụp hoặc log test nếu cần.

Không merge Pull Request nếu còn lỗi chạy server, lỗi database hoặc xung đột với nhánh `dev`.

## Ghi chú tích hợp

- Nhóm dashboard cần đọc `docs/api.md` để gọi đúng endpoint.
- Nhóm AI cần thống nhất payload gửi kết quả nhận diện.
- Nhóm firmware cần thống nhất cách backend gửi lệnh khóa/mở khóa.
- Mọi thay đổi ảnh hưởng đến nhóm khác cần được ghi trong Pull Request.
