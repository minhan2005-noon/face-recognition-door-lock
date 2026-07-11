# Web App

Ứng dụng web/app cho người dùng hoặc màn hình vận hành.

## Chạy bằng Docker

Build image web:

```bash
cd web/app
docker build -t face-door-lock-web .
```

Chạy container:

```bash
docker run --rm -p 8080:80 face-door-lock-web
```

Sau đó mở:

```text
http://localhost:8080
```

## Cần làm

- Xác định mục đích app: user portal, kiosk, mobile-web hay monitor.
- Tạo frontend bằng React/Vite nếu đi theo công nghệ trong README gốc.
- Gọi backend để xem trạng thái và lịch sử cần thiết.

## Cài đặt

- Cài Node.js LTS.
- Chạy `npm install` sau khi thêm dependencies.
- Chạy development server bằng `npm run dev` khi có script.

## Cấu trúc gợi ý

- `src/`: mã nguồn ứng dụng.
- `public/`: static assets.
- `package.json`: dependencies và scripts.
