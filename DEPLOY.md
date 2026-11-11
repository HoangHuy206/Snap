# Hướng dẫn Deploy SnapQR lên Internet

Dự án được thiết kế sẵn để chạy linh hoạt từ máy local đến môi trường production trên internet.

---

## Phương án 1 (Khuyên dùng): Vercel + Railway/Render + Cloudflare R2 + PostgreSQL

Đây là kiến trúc tối ưu chi phí và băng thông nhất:
- **Frontend (Next.js):** Deploy lên **Vercel** (miễn phí, CDN toàn cầu, tự động HTTPS).
- **Backend (FastAPI + yt-dlp + ffmpeg):** Deploy bằng `backend/Dockerfile` lên **Railway** hoặc **Render** (vì `yt-dlp` và `ffmpeg` cần runtime Python + binary hệ thống).
- **Lưu trữ Video & File:** **Cloudflare R2** (miễn phí 10GB đầu tiên và **miễn phí 100% băng thông tải ra / egress** khi nhiều người quét QR xem video).
- **Database:** **Neon** hoặc **Supabase PostgreSQL** (miễn phí gói Starter).

### Bước 1: Tạo Cloudflare R2 Bucket
1. Vào Cloudflare Dashboard → **R2 Object Storage** → **Create bucket** (ví dụ `snapqr-media`).
2. Vào **Manage R2 API Tokens** → tạo token có quyền **Object Read & Write** cho bucket vừa tạo, lưu lại:
   - `S3_ACCESS_KEY_ID`
   - `S3_SECRET_ACCESS_KEY`
   - `S3_ENDPOINT_URL`: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
3. *(Tùy chọn)* Gắn Custom Domain (ví dụ `https://cdn.tenmiencuaban.com`) vào bucket R2 và điền vào `S3_PUBLIC_BASE_URL` để phát video cực nhanh qua CDN Cloudflare.
4. *(Nếu bật `USE_PRESIGNED_UPLOAD=true`)* Vào tab **Settings → CORS Policy** của bucket R2, dán cấu hình:
```json
[
  {
    "AllowedOrigins": ["https://tenmiencuaban.com"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Bước 2: Deploy Backend lên Railway hoặc Render
1. Đẩy code lên GitHub.
2. Trên **Railway** (hoặc **Render** Blueprint với file `render.yaml`), tạo service mới trỏ vào thư mục `backend/` (dùng `backend/Dockerfile`).
3. Thêm biến môi trường:
   - `ENVIRONMENT=production`
   - `DATABASE_URL=postgresql://...` (từ Neon/Supabase/Railway Postgres)
   - `CORS_ORIGINS=https://tenmiencuaban.vercel.app` (thêm domain thật của bạn)
   - `STORAGE_BACKEND=s3`
   - `S3_ENDPOINT_URL=https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
   - `S3_REGION=auto`
   - `S3_BUCKET=snapqr-media`
   - `S3_ACCESS_KEY_ID=...`
   - `S3_SECRET_ACCESS_KEY=...`
   - `MAX_FILE_SIZE_MB=200`
4. Kiểm tra healthcheck: `https://<backend-url>/api/health` trả về `"status": "ok"`, `"storage_mode": "s3"`, `"ffmpeg_ready": true`.

### Bước 3: Deploy Frontend lên Vercel
1. Trên Vercel, chọn **Add New Project** → import repo GitHub.
2. Đặt **Root Directory** là `frontend`.
3. Thêm Environment Variable:
   - `NEXT_PUBLIC_API_URL=https://<backend-url>` (không có dấu `/` ở cuối)
4. Deploy và quay lại cập nhật `CORS_ORIGINS` ở Backend đúng domain Vercel vừa cấp!

---

## Phương án 2: Deploy trọn bộ lên 1 VPS (Ubuntu + Docker Compose)

Nếu bạn có VPS riêng (DigitalOcean, Hetzner, Vultr, Vietnix...):

1. Cài Docker & Docker Compose trên VPS.
2. Tạo file `.env` ở thư mục gốc dự án với các biến:
```env
POSTGRES_PASSWORD=mat_khau_db_rat_manh
CORS_ORIGINS=https://tenmiencuaban.com
NEXT_PUBLIC_API_URL=https://api.tenmiencuaban.com
# Có thể để trống S3_* để lưu thẳng trên ổ cứng VPS, hoặc điền R2 để lưu lên cloud
```
3. Chạy lệnh:
```bash
docker compose up -d --build
```
4. Cấu hình Nginx hoặc Caddy làm Reverse Proxy trỏ domain vào cổng `3000` (frontend) và `8000` (backend) kèm SSL Let's Encrypt.

---

## Lưu ý vận hành thực tế cho tính năng tải MXH
- **Chặn IP Cloud:** YouTube hoặc TikTok đôi khi yêu cầu xác minh đối với IP máy chủ datacenter (AWS/GCP/Render). Nếu gặp lỗi bị chặn khi chạy public, bạn có thể cấu hình `YTDLP_PROXY` (residential proxy) hoặc `YTDLP_COOKIES_FILE` trong biến môi trường backend.
- **Cập nhật `yt-dlp` định kỳ:** Các nền tảng MXH thường xuyên thay đổi cấu trúc API. Khi rebuild Docker image (`pip install yt-dlp`), hệ thống sẽ tự kéo bản mới nhất.
