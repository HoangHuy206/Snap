export const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

export type QrFrameStyle =
  | "none"
  | "classic-pill"
  | "gradient-glow"
  | "ribbon-top"
  | "viewfinder"
  | "polaroid-ticket"
  | "phone-mockup"
  | "double-ornate"
  | "floral-blossom"
  | "vintage-filigree"
  | "kawaii-kitty"
  | "anime-manga"
  | "teachers-day-2011"
  | "tet-holiday"
  | "christmas-festive"
  | "custom-overlay";

export type QrFrameBorderStyle = "solid" | "dashed" | "double";
export type QrFrameThickness = "thin" | "medium" | "thick";
export type QrFrameRadius = "sharp" | "rounded" | "pill";
export type QrFrameIcon = "none" | "scan" | "play" | "download" | "spark" | "heart";
export type QrFrameFont =
  | "sans"
  | "script"
  | "charm"
  | "greatvibes"
  | "serif"
  | "cute"
  | "pacifico"
  | "poster";

export interface QrDesignConfig {
  presetId: string;
  dotsType: "square" | "dots" | "rounded" | "extra-rounded" | "classy" | "classy-rounded";
  cornersSquareType: "square" | "dot" | "extra-rounded";
  cornersDotType: "square" | "dot";
  useGradient: boolean;
  fgColor: string;
  fgColorSecondary: string;
  gradientDirection: number;
  bgColor: string;
  logoMode: "none" | "video" | "file" | "music" | "spark" | "bow" | "flower" | "heart" | "crown" | "custom";
  customLogoDataUrl?: string;
  logoSize: number;
  frameEnabled: boolean;
  frameStyle: QrFrameStyle;
  frameBorderStyle: QrFrameBorderStyle;
  frameThickness: QrFrameThickness;
  frameRadius: QrFrameRadius;
  frameUseGradient: boolean;
  frameColor: string;
  frameColorSecondary: string;
  frameTextColor: string;
  frameLabel: string;
  frameSublabel: string;
  frameIcon: QrFrameIcon;
  frameFont?: QrFrameFont;
  frameFontBold?: boolean;
  frameFontItalic?: boolean;
  frameFontScale?: number;
  frameSublabelMatchFont?: boolean;
  frameShadow: boolean;
  customFrameDataUrl?: string;
  customFrameQrScale?: number;
  customFrameQrOffsetY?: number;
  customFrameShowLabel?: boolean;
  errorCorrectionLevel: "M" | "Q" | "H";
}

export interface MediaItem {
  code: string;
  title: string;
  description: string | null;
  original_filename: string;
  content_type: string;
  media_kind: "video" | "image" | "audio" | "pdf" | "file";
  file_size: number;
  storage_backend?: string;
  view_count: number;
  download_count: number;
  qr_config: QrDesignConfig | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  edit_token?: string;
}

export interface SocialFormatOption {
  id: string;
  label: string;
  kind: "video" | "audio" | "image";
  ext: string;
  resolution: string | null;
  filesize_approx: number | null;
  watermark_free: boolean;
  recommended: boolean;
}

export interface SocialGalleryItem {
  index: number;
  kind: "image" | "video";
  ext: string;
  url: string;
  thumbnail: string;
  title: string;
}

export interface SocialInspectResult {
  source_url: string;
  platform: string;
  title: string;
  uploader: string | null;
  duration: number | null;
  thumbnail: string | null;
  ffmpeg_ready: boolean;
  formats: SocialFormatOption[];
  gallery_items: SocialGalleryItem[];
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "Không rõ";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 100 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}:${String(remMins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function getShareUrl(code: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/v/${code}`;
  }
  return `/v/${code}`;
}

export function getMediaStreamUrl(code: string, download = false): string {
  return `${API_BASE_URL}/api/media/${encodeURIComponent(code)}/file${download ? "?download=1" : ""}`;
}

export function getProxyImageUrl(remoteUrl: string, download = false, filename?: string): string {
  const params = new URLSearchParams({ url: remoteUrl });
  if (download) params.set("download", "1");
  if (filename) params.set("filename", filename);
  return `${API_BASE_URL}/api/social/proxy-image?${params.toString()}`;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data?.detail) return String(data.detail);
  } catch {
    // Ignore non-JSON body
  }
  return fallback;
}

export function uploadMediaWithProgress(
  params: {
    file: File;
    title?: string;
    description?: string;
    expiryDays?: number;
    qrConfig?: QrDesignConfig;
  },
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/api/media/upload`);

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        try {
          resolve(JSON.parse(xhr.responseText) as MediaItem);
        } catch {
          reject(new Error("Phản hồi máy chủ không hợp lệ."));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          reject(new Error(parsed?.detail || `Tải lên thất bại (${xhr.status})`));
        } catch {
          reject(new Error(`Tải lên thất bại (${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Không thể kết nối tới máy chủ Backend. Hãy kiểm tra API URL hoặc mạng."));
    });

    const form = new FormData();
    form.append("file", params.file);
    if (params.title) form.append("title", params.title);
    if (params.description) form.append("description", params.description);
    if (params.expiryDays) form.append("expiry_days", String(params.expiryDays));
    if (params.qrConfig) form.append("qr_config_json", JSON.stringify(params.qrConfig));
    xhr.send(form);
  });
}

export function replaceMediaFileWithProgress(
  params: {
    code: string;
    editToken: string;
    file: File;
    title?: string;
  },
  onProgress: (percent: number) => void,
): Promise<MediaItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `${API_BASE_URL}/api/media/${encodeURIComponent(params.code)}/file`);
    xhr.setRequestHeader("X-Edit-Token", params.editToken);

    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        try {
          resolve(JSON.parse(xhr.responseText) as MediaItem);
        } catch {
          reject(new Error("Phản hồi không hợp lệ."));
        }
      } else {
        try {
          const parsed = JSON.parse(xhr.responseText);
          reject(new Error(parsed?.detail || "Không thể thay thế tệp."));
        } catch {
          reject(new Error("Không thể thay thế tệp."));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Lỗi kết nối khi thay thế tệp.")));

    const form = new FormData();
    form.append("file", params.file);
    if (params.title) form.append("title", params.title);
    xhr.send(form);
  });
}

export async function fetchMediaMetadata(code: string, trackView = false): Promise<MediaItem> {
  const res = await fetch(
    `${API_BASE_URL}/api/media/${encodeURIComponent(code)}?track_view=${trackView ? "true" : "false"}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(await parseError(res, "Không tìm thấy nội dung hoặc mã QR đã hết hạn."));
  }
  return res.json();
}

export async function verifyManageToken(code: string, editToken: string): Promise<MediaItem> {
  const res = await fetch(`${API_BASE_URL}/api/media/${encodeURIComponent(code)}/verify-token`, {
    method: "POST",
    headers: { "X-Edit-Token": editToken },
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Token quản lý không chính xác."));
  }
  const data = await res.json();
  return data.item as MediaItem;
}

export async function updateMediaMetadata(
  code: string,
  editToken: string,
  payload: {
    title?: string;
    description?: string;
    qr_config?: QrDesignConfig;
    extend_days?: number;
  },
): Promise<MediaItem> {
  const res = await fetch(`${API_BASE_URL}/api/media/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Edit-Token": editToken,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Không thể cập nhật thông tin."));
  }
  return res.json();
}

export async function deleteMediaItem(code: string, editToken: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/media/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: { "X-Edit-Token": editToken },
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Không thể xóa mã QR."));
  }
}

export async function inspectSocialLink(url: string): Promise<SocialInspectResult> {
  const res = await fetch(`${API_BASE_URL}/api/social/inspect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Không thể phân tích đường dẫn này."));
  }
  return res.json();
}

export async function downloadSocialMediaFile(url: string, formatId: string, suggestedTitle: string, ext: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/social/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, format_id: formatId }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Tải media thất bại."));
  }
  const blob = await res.blob();
  const disposition = res.headers.get("content-disposition") || "";
  let filename = `${suggestedTitle.slice(0, 60) || "vidqr_media"}.${ext || "mp4"}`;
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      filename = decodeURIComponent(utfMatch[1]);
    } catch {
      // keep fallback
    }
  }
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

export async function saveSocialMediaToQr(params: {
  url: string;
  formatId: string;
  title?: string;
  expiryDays?: number;
}): Promise<MediaItem> {
  const res = await fetch(`${API_BASE_URL}/api/social/save-to-qr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: params.url,
      format_id: params.formatId,
      title: params.title,
      expiry_days: params.expiryDays || 7,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Không thể chuyển video sang mã QR."));
  }
  return res.json();
}

export type FeedbackCategory = "feature" | "bug" | "ui" | "other";

export interface FeedbackSubmitPayload {
  category: FeedbackCategory;
  message: string;
  sender_name?: string;
  contact?: string;
  page_url?: string;
  website?: string;
}

export interface FeedbackSubmitResponse {
  ok: boolean;
  delivered_telegram: boolean;
  message: string;
}

export async function submitFeedback(payload: FeedbackSubmitPayload): Promise<FeedbackSubmitResponse> {
  const res = await fetch(`${API_BASE_URL}/api/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(await parseError(res, "Không thể gửi góp ý lúc này. Vui lòng thử lại sau."));
  }
  return res.json();
}
