const DEFAULT_SITE_URL = "https://vidqr-studio.vercel.app";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "") ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    DEFAULT_SITE_URL;

  const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return normalized.replace(/\/+$/, "");
}

export const SITE_INFO = {
  name: "VidQR",
  fullName: "VidQR Studio",
  tagline: "Tạo QR Video & File Động • Tải Video MXH Không Logo",
  description:
    "Nền tảng miễn phí tạo mã QR động cho Video (MP4, MOV, WebM), PDF, Ảnh, Tài liệu kèm khung viền thiết kế tùy chỉnh và công cụ tải video/ảnh TikTok, YouTube Shorts, Instagram Reels, Facebook không dính logo.",
  locale: "vi_VN",
} as const;

export const MOBILE_APP_DOWNLOADS = {
  androidApkUrl: "https://github.com/HoangHuy206/Snap/releases/latest/download/VidQR-Studio.apk",
  iosIpaUrl: "https://github.com/HoangHuy206/Snap/releases/latest/download/VidQR-Studio-unsigned.ipa",
  releasesUrl: "https://github.com/HoangHuy206/Snap/releases/latest",
} as const;
