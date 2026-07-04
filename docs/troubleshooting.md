# Troubleshooting

Tài liệu này ghi lại các lỗi thường gặp khi phát triển hệ thống và cách xử lý.

## Git báo có thư mục lạ chưa track

Ví dụ:

```text
?? face-recognition-door-lock/
```

Nguyên nhân thường là bạn clone repository mới lồng bên trong repository cũ.

Cách xử lý:

- Không dùng `git add .`.
- Kiểm tra thư mục đó có cần giữ không.
- Nếu không cần, xóa thư mục clone lồng bằng Finder hoặc lệnh phù hợp.
- Khi commit, chỉ add đúng file cần thiết.

## Sparse checkout báo lỗi với README.md

Lỗi:

```text
fatal: 'README.md' is not a directory
```

Nguyên nhân: `git sparse-checkout set` ở chế độ `--cone` chỉ nhận thư mục, không nhận file đơn lẻ.

Cách đúng:

```bash
git sparse-checkout init --cone
git sparse-checkout set backend docs tests
```

File gốc như `README.md` thường vẫn tự hiện.

## Nhánh feature hiện toàn bộ thư mục

Đây là hành vi bình thường. Mỗi nhánh vẫn chứa toàn bộ repository để dễ merge về `dev`.

Không nên xóa thư mục khác khỏi nhánh feature chỉ để giao diện GitHub gọn hơn.

Quy tắc:

- Nhánh backend chỉ sửa `backend/`, `docs/api.md`, test backend.
- Nhánh firmware chỉ sửa `firmware/`, `hardware/`, test phần cứng.
- Nhánh AI chỉ sửa `ai-model/`.
- Nhánh web chỉ sửa `dashboard/`, `web/`.

## Không thấy thay đổi trên GitHub

Kiểm tra các bước:

```bash
git status
git branch --show-current
git log --oneline -3
git push origin <ten-nhanh>
```

Đảm bảo bạn đang xem đúng branch trên GitHub.

## Merge vào dev bị conflict

Cách xử lý:

```bash
git fetch origin
git switch feature/backend-api
git merge origin/dev
```

Sau đó mở file conflict, sửa thủ công, rồi:

```bash
git add <file-da-sua>
git commit
git push origin feature/backend-api
```

## Backend không chạy

Kiểm tra:

- Đã cài Node.js LTS chưa.
- Đã chạy `npm install` trong thư mục `backend/` chưa.
- `package.json` đã có script `dev` hoặc `start` chưa.
- File `.env` có đủ biến môi trường chưa.
- Port đang dùng có bị trùng không.

## Database không kết nối được

Kiểm tra:

- `DATABASE_URL` đúng chưa.
- Database server có đang chạy không.
- User/password database đúng chưa.
- Migration/schema đã được chạy chưa.

## AI model không nhận diện đúng

Kiểm tra:

- Ảnh đầu vào có rõ mặt không.
- Dataset có đủ ảnh cho từng người không.
- Ngưỡng confidence có quá cao hoặc quá thấp không.
- Model và `labels.json` có khớp nhau không.

## Firmware không upload được

Kiểm tra:

- Board đã cắm USB chưa.
- Đã chọn đúng port chưa.
- Driver USB/serial đã cài chưa.
- Board có cần giữ nút BOOT khi upload không.
- `platformio.ini` đã chọn đúng board chưa.

## Relay/servo không hoạt động

Kiểm tra:

- Nguồn cấp đủ dòng chưa.
- GND giữa board và module đã nối chung chưa.
- Chân điều khiển khai báo đúng chưa.
- Relay/servo có cần nguồn riêng không.
- Không cấp tải khóa điện trực tiếp từ chân GPIO.

## Dashboard không gọi được API

Kiểm tra:

- Backend đã chạy chưa.
- Endpoint API đúng chưa.
- CORS đã được cấu hình chưa.
- Token/API key có hợp lệ không.
- Biến môi trường frontend trỏ đúng backend chưa.

