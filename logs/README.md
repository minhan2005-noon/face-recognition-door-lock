# Logs

Thư mục này dành cho log mẫu hoặc log cục bộ trong quá trình phát triển.

## Cần làm

- Lưu log truy cập trong `access_logs/` nếu cần debug.
- Lưu log hệ thống trong `system_logs/`.
- Không commit log nhạy cảm hoặc log có token.

## Lưu ý

- Môi trường production nên ghi log vào database hoặc logging service.
- Thư mục này nên được cấu hình trong `.gitignore` khi có log thật.

