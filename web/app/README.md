# Web App

Ứng dụng web quản trị cho hệ thống khóa cửa nhận diện khuôn mặt. App chạy bằng Vite và gọi backend API tại `http://localhost:3000/api`.

## Cài đặt

```bash
cd web/app
npm install
```

## Chạy development

Mở terminal 1 để chạy backend:

```bash
cd backend
npm run dev
```

Mở terminal 2 để chạy web:

```bash
cd web/app
npm run dev
```

Sau đó mở:

```text
http://localhost:5173
```

## Đổi URL backend

Nếu backend không chạy ở port `3000`, tạo file `.env` trong `web/app`:

```env
VITE_API_URL=http://localhost:3000/api
```
