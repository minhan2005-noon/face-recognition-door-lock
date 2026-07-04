# Hướng dẫn cài đặt

Tài liệu này hướng dẫn chuẩn bị môi trường phát triển cho toàn bộ dự án.

## Yêu cầu chung

- Git
- Node.js LTS
- Python 3.10 trở lên
- PlatformIO hoặc Arduino IDE nếu làm firmware
- SQLite, PostgreSQL hoặc MySQL tùy lựa chọn database
- VS Code hoặc IDE tương đương

## Clone repository

```bash
git clone https://github.com/minhan2005-noon/face-recognition-door-lock.git
cd face-recognition-door-lock
```

## Chọn nhánh làm việc

```bash
git switch feature/backend-api
```

Các nhánh chính:

- `main`: bản ổn định.
- `dev`: nhánh tích hợp.
- `feature/backend-api`: backend/API.
- `feature/esp32-firmware`: firmware.
- `feature/face-recognition`: AI model.
- `feature/web-dashboard`: dashboard/web.

## Cài đặt backend

```bash
cd backend
npm install
```

Sau khi có script trong `package.json`, có thể chạy:

```bash
npm run dev
```

Biến môi trường dự kiến:

```env
PORT=3000
DATABASE_URL=sqlite://./database/dev.sqlite
JWT_SECRET=change_me
DEVICE_API_KEY=change_me
```

Không commit file `.env` thật lên Git.

## Cài đặt AI model

```bash
cd ai-model
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Nếu chưa có `requirements.txt`, nhóm AI cần tạo khi bắt đầu triển khai.

## Cài đặt dashboard/web

```bash
cd dashboard
npm install
npm run dev
```

Hoặc với `web/app`:

```bash
cd web/app
npm install
npm run dev
```

## Cài đặt firmware ESP32

```bash
cd firmware/esp32
pio run
```

Upload firmware:

```bash
pio run --target upload
```

Mở serial monitor:

```bash
pio device monitor
```

## Quy trình làm việc nhóm

1. Luôn làm trên nhánh feature đúng phần việc.
2. Trước khi làm, kéo code mới nhất:

```bash
git pull origin <ten-nhanh>
```

3. Nếu cần cập nhật từ `dev`:

```bash
git fetch origin
git merge origin/dev
```

4. Commit phần việc:

```bash
git add <file-hoac-thu-muc-lien-quan>
git commit -m "Mô tả thay đổi"
git push origin <ten-nhanh>
```

5. Tạo Pull Request vào `dev`.

## Lưu ý

- Không dùng `git add .` nếu trong repo có file/thư mục lạ chưa kiểm tra.
- Không xóa thư mục của nhóm khác trên nhánh feature.
- Nếu sửa file chung, cần báo trong Pull Request.
- Dữ liệu khuôn mặt thật không nên commit lên repository.

