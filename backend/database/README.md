# Database

Thư mục này chứa schema và migration database.

## Cần làm

- Thiết kế bảng users, face_embeddings, access_logs và devices.
- Viết schema ban đầu trong `schema.sql`.
- Đặt migration trong `migrations/`.

## Cài đặt

- Dùng SQLite cho development nếu muốn gọn nhẹ.
- Dùng PostgreSQL hoặc MySQL cho môi trường thật.
- Lưu connection string trong `.env`, không commit secret.

