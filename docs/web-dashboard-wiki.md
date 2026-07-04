# Wiki: Web Dashboard

Trang wiki này mô tả phạm vi làm việc của nhánh `feature/web-dashboard`.

## Mục tiêu

Nhánh `feature/web-dashboard` dùng để phát triển giao diện web quản trị và theo dõi hệ thống khóa cửa nhận diện khuôn mặt.

## Phạm vi công việc

- Xây dựng dashboard quản trị.
- Hiển thị trạng thái thiết bị.
- Hiển thị lịch sử ra vào.
- Quản lý người dùng được phép.
- Gọi API backend.
- Hiển thị trạng thái loading, error và empty.
- Thiết kế giao diện dễ dùng cho quản trị viên.

## Thư mục được phép chỉnh sửa

- `dashboard/`
- `dashboard/src/`
- `dashboard/public/`
- `web/`
- `web/app/`
- `docs/setup.md` nếu bổ sung hướng dẫn chạy frontend
- `docs/api.md` nếu cần ghi chú endpoint frontend đang dùng

## Không chỉnh sửa

- `backend/` nếu không thống nhất với nhóm backend.
- `ai-model/` nếu không thống nhất với nhóm AI.
- `firmware/` nếu không thống nhất với nhóm firmware.

## Cấu trúc frontend dự kiến

```text
dashboard/
├── src/       # Mã nguồn React/Vite
├── public/    # Static assets
└── package.json

web/app/
├── src/
├── public/
└── package.json
```

## Màn hình dự kiến

- Trang tổng quan thiết bị.
- Trang danh sách người dùng.
- Trang lịch sử ra vào.
- Trang chi tiết thiết bị.
- Trang cấu hình hệ thống nếu cần.

## Cài đặt

```bash
cd dashboard
npm install
npm run dev
```

Hoặc:

```bash
cd web/app
npm install
npm run dev
```

## Quy tắc tích hợp API

- Không hard-code URL backend trong component.
- Đặt API endpoint trong biến môi trường.
- Hiển thị lỗi dễ hiểu khi backend không phản hồi.
- Không lưu token nhạy cảm theo cách không an toàn.
- Đồng bộ payload với `docs/api.md`.

## Pull Request

Pull Request vào `dev` cần ghi:

- Màn hình đã làm.
- API endpoint đã dùng.
- Cách chạy frontend.
- Ảnh chụp màn hình nếu có giao diện mới.
- Lỗi hoặc phần chưa hoàn thiện nếu có.

