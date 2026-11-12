# VidQR Studio — Tạo QR Video & File Động • Tải Video MXH Không Logo

![VidQR Studio — Tạo QR Video Động & Tải Video MXH Không Logo](frontend/public/brand/vidqr-studio-banner.png)

Truy cập trực tuyến miễn phí tại: **https://snap-nine-dusky.vercel.app/**

**VidQR Studio** là nền tảng web miễn phí tích hợp 2 công cụ chuyên dụng:

1. **Media / File → Dynamic QR Studio:** Upload video (MP4, MOV, WebM...) hoặc bất kỳ tệp tin nào (ảnh HD, PDF, tài liệu, ZIP, audio lên tới 200 MB) để tạo trang xem riêng biệt và xuất mã QR tùy biến đẹp mắt (chấm tròn, gradient, chèn logo, khung viền chủ đề kèm nhãn tiếng Việt, xuất PNG HD & Vector SVG, hỗ trợ **Dynamic QR** thay đổi file bên trong mà vẫn giữ nguyên mã QR đã in).
2. **Tải Video & Ảnh MXH không dính logo:** Dán liên kết TikTok, Douyin, YouTube (Video & Shorts), Instagram Reels, Facebook, X/Twitter với nút Dán 1 chạm để phân tích chất lượng, tải video không dính watermark nền tảng, tách âm thanh MP3, tải ảnh bộ sưu tập, hoặc chuyển thẳng thành mã QR chia sẻ tức thì.

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
