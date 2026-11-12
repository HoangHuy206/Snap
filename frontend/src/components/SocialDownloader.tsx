"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardPaste,
  Download,
  Image as ImageIcon,
  Link2,
  Music,
  QrCode,
  Search,
  ShieldCheck,
  Video,
} from "lucide-react";
import {
  downloadSocialMediaFile,
  formatBytes,
  formatDuration,
  getProxyImageUrl,
  inspectSocialLink,
  saveSocialMediaToQr,
  type MediaItem,
  type SocialInspectResult,
} from "@/lib/api";

interface SocialDownloaderProps {
  onSendToQrStudio: (item: MediaItem) => void;
}

const SUPPORTED_PLATFORMS = [
  "TikTok",
  "YouTube & Shorts",
  "Instagram",
  "Facebook",
  "Douyin",
  "X (Twitter)",
];

export function SocialDownloader({ onSendToQrStudio }: SocialDownloaderProps) {
  const [urlInput, setUrlInput] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [result, setResult] = useState<SocialInspectResult | null>(null);
  const [pasteFeedback, setPasteFeedback] = useState<{
    state: "idle" | "pasted" | "error";
    message: string;
  }>({ state: "idle", message: "" });

  const urlInputId = useId();
  const pasteStatusId = useId();
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPasteStatusRef = useRef("");

  useEffect(() => {
    return () => {
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    };
  }, []);

  const showPasteStatus = (state: "pasted" | "error", rawMessage: string) => {
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    const message =
      rawMessage === lastPasteStatusRef.current ? `${rawMessage}\u00A0` : rawMessage;
    lastPasteStatusRef.current = message;
    setPasteFeedback({ state, message });
    pasteTimerRef.current = setTimeout(() => {
      setPasteFeedback({ state: "idle", message: "" });
    }, 3000);
  };

  const handlePasteFromClipboard = async () => {
    if (!navigator.clipboard?.readText) {
      urlInputRef.current?.focus();
      showPasteStatus(
        "error",
        "Trình duyệt không hỗ trợ đọc bộ nhớ tạm ở kết nối này — nhấn giữ ô nhập hoặc bấm Ctrl+V để dán.",
      );
      return;
    }

    try {
      const clipText = (await navigator.clipboard.readText()).trim();
      if (!clipText) {
        urlInputRef.current?.focus();
        showPasteStatus(
          "error",
          "Bộ nhớ tạm đang trống — hãy sao chép liên kết video trước rồi bấm Dán.",
        );
        return;
      }

      setUrlInput(clipText);
      if (errorMsg) setErrorMsg("");
      urlInputRef.current?.focus();
      showPasteStatus("pasted", "Đã dán liên kết từ bộ nhớ tạm!");
    } catch {
      urlInputRef.current?.focus();
      showPasteStatus(
        "error",
        "Bạn chưa cấp quyền đọc bộ nhớ tạm — hãy cho phép hoặc bấm Ctrl+V vào ô nhập.",
      );
    }
  };

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = urlInput.trim();
    if (!cleaned) {
      setErrorMsg("Vui lòng dán liên kết video hoặc ảnh từ mạng xã hội.");
      return;
    }

    setInspecting(true);
    setErrorMsg("");
    setStatusMsg("");
    setResult(null);

    try {
      const data = await inspectSocialLink(cleaned);
      setResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể phân tích liên kết này.");
    } finally {
      setInspecting(false);
    }
  };

  const handleDownload = async (formatId: string, ext: string) => {
    if (!result) return;
    setBusyActionId(`dl:${formatId}`);
    setErrorMsg("");
    setStatusMsg("Đang trích xuất luồng sạch không logo và gửi về máy của bạn...");
    try {
      await downloadSocialMediaFile(result.source_url, formatId, result.title, ext);
      setStatusMsg("Tải xuống hoàn tất!");
    } catch (err) {
      setStatusMsg("");
      setErrorMsg(err instanceof Error ? err.message : "Tải tệp thất bại.");
    } finally {
      setBusyActionId(null);
    }
  };

  const handleCreateQrFromSocial = async (formatId: string) => {
    if (!result) return;
    setBusyActionId(`qr:${formatId}`);
    setErrorMsg("");
    setStatusMsg("Đang lưu video sạch lên bộ nhớ đám mây và tạo mã QR...");
    try {
      const created = await saveSocialMediaToQr({
        url: result.source_url,
        formatId,
        title: result.title,
        expiryDays: 7,
      });
      onSendToQrStudio(created);
    } catch (err) {
      setStatusMsg("");
      setErrorMsg(err instanceof Error ? err.message : "Không thể chuyển sang mã QR.");
    } finally {
      setBusyActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input Card */}
      <form
        onSubmit={handleInspect}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-7 shadow-sm space-y-5"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">Tải Video &amp; Ảnh Mạng Xã Hội Không Logo</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Dán đường dẫn bài viết/video để lấy luồng gốc sạch watermark nền tảng, tải về máy hoặc biến ngay thành mã QR chia sẻ.
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {SUPPORTED_PLATFORMS.map((p) => (
              <span
                key={p}
                className="rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor={urlInputId} className="block text-sm font-semibold">
            Đường dẫn Video / Ảnh (URL)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Link2
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                aria-hidden="true"
              />
              <input
                ref={urlInputRef}
                id={urlInputId}
                name="url"
                type="url"
                required
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (pasteFeedback.state !== "idle") {
                    setPasteFeedback({ state: "idle", message: "" });
                  }
                }}
                placeholder="https://www.tiktok.com/@user/video/... hoặc https://youtu.be/..."
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="go"
                aria-describedby={pasteStatusId}
                className="w-full min-h-[52px] sm:min-h-[48px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-28 py-2.5 text-sm"
              />
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                title="Dán liên kết từ bộ nhớ tạm"
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex min-h-[42px] sm:min-h-[36px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  pasteFeedback.state === "pasted"
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300"
                    : "border-indigo-200/90 dark:border-indigo-800/80 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300"
                }`}
              >
                {pasteFeedback.state === "pasted" ? (
                  <ClipboardCheck className="size-4 shrink-0" aria-hidden="true" />
                ) : (
                  <ClipboardPaste className="size-4 shrink-0" aria-hidden="true" />
                )}
                <span>{pasteFeedback.state === "pasted" ? "Đã dán" : "Dán"}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={inspecting}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Search className="size-4" aria-hidden="true" />
              {inspecting ? "Đang phân tích..." : "Phân tích link"}
            </button>
          </div>
          <p
            id={pasteStatusId}
            role="status"
            className={
              pasteFeedback.message
                ? `text-xs font-medium ${
                    pasteFeedback.state === "pasted"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  }`
                : "sr-only"
            }
          >
            {pasteFeedback.message}
          </p>
        </div>

        {inspecting && (
          <div role="status" aria-live="polite" className="space-y-1.5">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Đang kết nối trích xuất dữ liệu gốc không watermark...
            </p>
            <progress className="snap-progress" aria-label="Đang phân tích liên kết" />
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
          <span>
            Hệ thống ưu tiên luồng phát gốc chưa đóng dấu logo nền tảng. Lưu ý: logo do chủ kênh chèn cứng vào khung hình video sẽ không bị xóa.
          </span>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {statusMsg && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200"
          >
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{statusMsg}</span>
          </div>
        )}
      </form>

      {/* Result Preview & Formats */}
      {result && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-7 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
            {/* Thumbnail */}
            <div className="md:col-span-4 rounded-xl overflow-clip border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 aspect-video relative">
              {result.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getProxyImageUrl(result.thumbnail)}
                  alt={result.title}
                  className="size-full object-cover block"
                />
              ) : (
                <div className="size-full flex items-center justify-center text-slate-400">
                  <Video className="size-10" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Metadata + Formats */}
            <div className="md:col-span-8 space-y-4 min-w-0">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2.5 py-0.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                    {result.platform}
                  </span>
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Sạch Watermark nền tảng
                  </span>
                  {result.duration ? (
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {formatDuration(result.duration)}
                    </span>
                  ) : null}
                </div>
                <h3 className="text-lg font-bold leading-snug break-words">{result.title}</h3>
                {result.uploader && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">Kênh / Tác giả: {result.uploader}</p>
                )}
              </div>

              {/* Format Rows */}
              <div className="space-y-2.5">
                {result.formats.map((fmt) => {
                  const dlBusy = busyActionId === `dl:${fmt.id}`;
                  const qrBusy = busyActionId === `qr:${fmt.id}`;
                  return (
                    <div
                      key={fmt.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                          {fmt.kind === "audio" ? (
                            <Music className="size-4 text-pink-600 dark:text-pink-400" aria-hidden="true" />
                          ) : fmt.kind === "image" ? (
                            <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          ) : (
                            <Video className="size-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm">{fmt.label}</span>
                            {fmt.recommended && (
                              <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                                Đề xuất
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Định dạng .{fmt.ext.toUpperCase()}
                            {fmt.filesize_approx ? ` • ~${formatBytes(fmt.filesize_approx)}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={busyActionId !== null}
                          onClick={() => handleDownload(fmt.id, fmt.ext)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 px-3 sm:px-4 py-2 text-xs font-bold text-white cursor-pointer transition-colors"
                        >
                          <Download className="size-3.5 shrink-0" aria-hidden="true" />
                          {dlBusy ? "Đang tải..." : "Tải về máy"}
                        </button>
                        <button
                          type="button"
                          disabled={busyActionId !== null}
                          onClick={() => handleCreateQrFromSocial(fmt.id)}
                          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 disabled:opacity-60 px-3 sm:px-3.5 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 cursor-pointer transition-colors"
                        >
                          <QrCode className="size-3.5 shrink-0" aria-hidden="true" />
                          {qrBusy ? "Đang tạo QR..." : "Tạo mã QR"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Multi-item / Photo Gallery grid if present */}
          {result.gallery_items.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-sm">
                Ảnh / Slide trích xuất từ bài đăng ({result.gallery_items.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {result.gallery_items.map((item) => (
                  <div
                    key={item.index}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-clip flex flex-col"
                  >
                    <div className="aspect-square bg-slate-200 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getProxyImageUrl(item.thumbnail)}
                        alt={item.title}
                        className="size-full object-cover block"
                      />
                    </div>
                    <div className="p-2.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium truncate">#{item.index}</span>
                      {item.kind === "image" && (
                        <a
                          href={getProxyImageUrl(item.url, true, `vidqr_${item.index}.${item.ext}`)}
                          className="inline-flex min-h-[44px] items-center gap-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 text-xs font-semibold"
                        >
                          <Download className="size-3" aria-hidden="true" />
                          Tải ảnh
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
