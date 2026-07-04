# Controllers

Controllers nhận request từ routes và trả response cho client.

## Cần làm

- Tách controller theo miền nghiệp vụ: users, access logs, lock commands.
- Gọi services để xử lý logic.
- Không truy cập database trực tiếp nếu đã có service layer.

