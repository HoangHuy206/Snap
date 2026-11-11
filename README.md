# SnapQR — Media-to-QR Studio & Social Media Downloader

Nền tảng web đa năng gồm 2 công cụ tích hợp:
1. **Media / File → Dynamic QR Studio:** Upload video (MP4, WebM, MOV...) hoặc bất kỳ tệp nào (ảnh, PDF, tài liệu, ZIP, audio...) để tạo trang xem/tải riêng biệt và xuất mã QR tùy biến đẹp mắt (chấm tròn, gradient, chèn logo, khung viền Call-to-Action, xuất PNG/SVG, hỗ trợ **Dynamic QR** thay đổi file bên trong mà không đổi mã QR).
2. **Tải Video & Ảnh MXH không dính logo:** Dán liên kết TikTok, YouTube (Video & Shorts), Instagram, Facebook, X/Twitter... để phân tích chất lượng, tải video không dính watermark nền tảng, tách âm thanh MP3, tải ảnh bộ sưu tập, hoặc chuyển thẳng thành mã QR chia sẻ chỉ với 1 cú nhấp chuột.

---

## Cấu trúc dự án

- `frontend/` — Next.js (App Router, TypeScript, Tailwind CSS) + `qr-code-styling`
- `backend/` — FastAPI + SQLAlchemy (PostgreSQL / SQLite) + Boto3 (Cloudflare R2 / S3 / Local Disk) + `yt-dlp` + `ffmpeg`
- `docker-compose.yml` & `DEPLOY.md` — Hướng dẫn triển khai lên Internet

---

## Chạy thử trên máy (Local Development)

### 1. Chạy Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Mặc định khi chạy local không cấu hình biến môi trường, backend tự dùng **SQLite** (`backend/data/snapqr.db`) và lưu file trên ổ cứng (`backend/data/uploads/`).

### 2. Chạy Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Mở trình duyệt tại `http://localhost:3000`.
