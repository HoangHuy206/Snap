"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  FileUp,
  Film,
  KeyRound,
  Plus,
  QrCode,
  Settings2,
  Trees,
  AlertCircle,
} from "lucide-react";
import {
  formatBytes,
  getShareUrl,
  updateMediaMetadata,
  uploadMediaWithProgress,
  type MediaItem,
  type QrDesignConfig,
} from "@/lib/api";
import { saveQrHistoryEntry, updateHistoryItemInfo } from "@/lib/history";
import { DEFAULT_QR_CONFIG, resolveQrConfig } from "@/lib/qr-presets";
import { QrCustomizer } from "./QrCustomizer";
import { MagicTreeStudio } from "./MagicTreeStudio";
import { ScrollReveal } from "./ScrollReveal";

type QrPresentationMode = "static" | "magic";

interface QrStudioProps {
  initialItem?: MediaItem | null;
  onItemSaved?: () => void;
}

function getInitialQrConfig(item?: MediaItem | null): QrDesignConfig {
  if (!item) return DEFAULT_QR_CONFIG;
  if (item.qr_config) {
    return resolveQrConfig(item.qr_config);
  }
  return {
    ...DEFAULT_QR_CONFIG,
    logoMode:
      item.media_kind === "video" ? "video" : item.media_kind === "audio" ? "music" : "file",
  };
}

export function QrStudio({ initialItem = null, onItemSaved }: QrStudioProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(7);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeItem, setActiveItem] = useState<MediaItem | null>(initialItem);
  const [qrConfig, setQrConfig] = useState<QrDesignConfig>(() => getInitialQrConfig(initialItem));
  const [qrPresentation, setQrPresentation] = useState<QrPresentationMode>("static");
  const [savingConfig, setSavingConfig] = useState(false);
  const [copiedKey, setCopiedKey] = useState<"share" | "manage" | null>(null);

  const fileInputId = useId();
  const titleInputId = useId();
  const descInputId = useId();
  const expirySelectId = useId();

  const handleFilePick = (file: File | undefined) => {
    if (!file) return;
    setSelectedFile(file);
    setErrorMsg("");
    if (!title.trim()) {
      const base = file.name.replace(/\.[^/.]+$/, "");
      setTitle(base.slice(0, 120));
    }
    if (file.type.startsWith("video/")) {
      setQrConfig((prev) => ({
        ...prev,
        logoMode: "video",
        frameIcon: "play",
        frameLabel: "Quét để xem video",
      }));
    } else if (file.type.startsWith("audio/")) {
      setQrConfig((prev) => ({
        ...prev,
        logoMode: "music",
        frameIcon: "play",
        frameLabel: "Quét để nghe âm thanh",
      }));
    } else {
      setQrConfig((prev) => ({
        ...prev,
        logoMode: "file",
        frameIcon: "download",
        frameLabel: "Quét để xem & tải tệp",
      }));
    }
  };

  const handleCreateQr = async () => {
    if (!selectedFile) {
      setErrorMsg("Vui lòng chọn Video, Ảnh hoặc Tệp tin ở Bước 1 trước khi tạo QR.");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setErrorMsg("");

    try {
      const created = await uploadMediaWithProgress(
        {
          file: selectedFile,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          expiryDays,
          qrConfig,
        },
        (pct) => setUploadProgress(pct),
      );
      setActiveItem(created);
      saveQrHistoryEntry(created, qrConfig);
      onItemSaved?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải tệp lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleCreateQr();
  };

  const handleSaveConfigToServer = async () => {
    if (!activeItem?.edit_token) return;
    setSavingConfig(true);
    try {
      const updated = await updateMediaMetadata(activeItem.code, activeItem.edit_token, {
        qr_config: qrConfig,
      });
      setActiveItem({ ...updated, edit_token: activeItem.edit_token });
      updateHistoryItemInfo(activeItem.code, { qrConfig });
      onItemSaved?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể lưu giao diện QR.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCopy = async (text: string, key: "share" | "manage") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const resetCreator = () => {
    setActiveItem(null);
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    setUploadProgress(0);
    setErrorMsg("");
  };

  const shareUrl = activeItem ? getShareUrl(activeItem.code) : "https://vidqr.app/v/demo";
  const manageUrl =
    activeItem && typeof window !== "undefined" && activeItem.edit_token
      ? `${window.location.origin}/manage/${activeItem.code}?token=${encodeURIComponent(activeItem.edit_token)}`
      : "";

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Step 1: Upload Form OR Active QR Summary */}
      {!activeItem ? (
        <form
          onSubmit={handleUploadSubmit}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-3.5 sm:p-5 shadow-sm space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                1. Tải Video, Ảnh hoặc Tệp tin lên
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Hỗ trợ Video, Ảnh, PDF, Tài liệu, Audio, ZIP (tối đa 200 MB) tạo ngay QR động.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
            {/* Compact Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFilePick(e.dataTransfer.files?.[0]);
              }}
              className={`md:col-span-5 relative flex items-center justify-center rounded-xl border-2 border-dashed p-3.5 sm:p-4 text-center transition-colors ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/30"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40"
              }`}
            >
              <input
                id={fileInputId}
                type="file"
                onChange={(e) => handleFilePick(e.target.files?.[0])}
                className="visually-hidden"
              />
              <label
                htmlFor={fileInputId}
                className="flex flex-row md:flex-col items-center justify-center gap-2.5 cursor-pointer w-full text-left md:text-center"
              >
                <span className="inline-flex size-10 sm:size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  {selectedFile?.type.startsWith("video/") ? (
                    <Film className="size-5" aria-hidden="true" />
                  ) : (
                    <FileUp className="size-5" aria-hidden="true" />
                  )}
                </span>

                {selectedFile ? (
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-sm truncate">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {formatBytes(selectedFile.size)} • Nhấn để đổi tệp
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm">
                      Kéo thả Video / Ảnh / File hoặc{" "}
                      <span className="text-indigo-600 dark:text-indigo-400 underline">chọn từ máy</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      MP4, MOV, PNG, JPG, PDF, ZIP...
                    </p>
                  </div>
                )}
              </label>
            </div>

            {/* Compact Metadata & Submit Grid */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-2.5 content-between">
              <div className="sm:col-span-8 space-y-1">
                <label htmlFor={titleInputId} className="block text-xs font-semibold">
                  Tiêu đề hiển thị (khi quét QR)
                </label>
                <input
                  id={titleInputId}
                  type="text"
                  maxLength={200}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Video hướng dẫn / Ảnh kỷ niệm..."
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label htmlFor={expirySelectId} className="block text-xs font-semibold">
                  Thời hạn lưu
                </label>
                <select
                  id={expirySelectId}
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-sm"
                >
                  <option value={1}>1 ngày</option>
                  <option value={7}>7 ngày</option>
                  <option value={14}>14 ngày</option>
                  <option value={30}>30 ngày</option>
                </select>
              </div>

              <div className="sm:col-span-12 space-y-1">
                <label htmlFor={descInputId} className="block text-xs font-semibold">
                  Ghi chú ngắn (tùy chọn)
                </label>
                <input
                  id={descInputId}
                  type="text"
                  maxLength={500}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả ngắn cho người quét QR..."
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {uploading && (
            <div role="status" aria-live="polite" className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
                <span>Đang tải tệp lên hệ thống lưu trữ...</span>
                <span>{uploadProgress}%</span>
              </div>
              <progress className="snap-progress" max={100} value={uploadProgress} aria-label="Tiến độ tải lên" />
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}
        </form>
      ) : (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/25 p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-bold text-white">
                  Đã tạo QR
                </span>
                <h2 className="text-lg font-bold truncate">{activeItem.title}</h2>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                {activeItem.original_filename} • {formatBytes(activeItem.file_size)}
              </p>
            </div>

            <button
              type="button"
              onClick={resetCreator}
              className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Plus className="size-4" aria-hidden="true" />
              Upload Video / File khác
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Share URL box */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2 min-w-0">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Link trang xem / tải khi quét QR
              </span>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  aria-label="Đường dẫn chia sẻ"
                  className="w-full sm:w-auto sm:flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs !min-h-[42px]"
                />
                <button
                  type="button"
                  onClick={() => handleCopy(shareUrl, "share")}
                  className="flex-1 sm:flex-none inline-flex min-h-[42px] items-center justify-center gap-1 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-3 text-xs font-semibold cursor-pointer shrink-0"
                >
                  {copiedKey === "share" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copiedKey === "share" ? "Đã chép" : "Copy"}
                </button>
                <Link
                  href={`/v/${activeItem.code}`}
                  target="_blank"
                  aria-label="Mở trang xem"
                  className="inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
                >
                  <ExternalLink className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>

            {/* Dynamic QR Manage Link */}
            {activeItem.edit_token && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-2 min-w-0">
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                  <KeyRound className="size-3.5" aria-hidden="true" />
                  Link quản lý Dynamic QR (đổi video không cần đổi mã QR)
                </span>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
                  <input
                    type="text"
                    readOnly
                    value={manageUrl}
                    aria-label="Đường dẫn quản lý Dynamic QR"
                    className="w-full sm:w-auto sm:flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs !min-h-[42px]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCopy(manageUrl, "manage")}
                    className="flex-1 sm:flex-none inline-flex min-h-[42px] items-center justify-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                  >
                    {copiedKey === "manage" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copiedKey === "manage" ? "Đã chép" : "Copy"}
                  </button>
                  <Link
                    href={`/manage/${activeItem.code}?token=${encodeURIComponent(activeItem.edit_token)}`}
                    className="flex-1 sm:flex-none inline-flex min-h-[42px] items-center justify-center gap-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 text-xs font-semibold shrink-0"
                  >
                    <Settings2 className="size-3.5" aria-hidden="true" />
                    Quản lý
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: QR Studio Customizer */}
      <ScrollReveal>
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-3.5 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight">2. Tùy biến QR đẹp &amp; nổi bật</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {qrPresentation === "static"
                  ? "Chỉnh kiểu chấm, màu Gradient, logo & khung — sau đó bấm Tạo QR Ngay và Lưu PNG."
                  : "Biến Video, Ảnh, Tệp tin (hoặc Link URL) thành Cây Hoa 3D tương tác chạm mở mã QR."}
              </p>
            </div>

            <div
              role="group"
              aria-label="Chọn kiểu hiển thị QR"
              className="grid grid-cols-2 sm:inline-flex gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-1 shrink-0"
            >
              <button
                type="button"
                aria-pressed={qrPresentation === "static"}
                onClick={() => setQrPresentation("static")}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  qrPresentation === "static"
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <QrCode className="size-4 shrink-0" aria-hidden="true" />
                <span>QR Khung Tĩnh</span>
              </button>

              <button
                type="button"
                aria-pressed={qrPresentation === "magic"}
                onClick={() => setQrPresentation("magic")}
                className={`inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  qrPresentation === "magic"
                    ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-300 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <Trees className="size-4 shrink-0" aria-hidden="true" />
                <span>QR Cây 3D Hoạt Ảnh</span>
              </button>
            </div>
          </div>

          {qrPresentation === "static" ? (
            <QrCustomizer
              qrValue={shareUrl}
              config={qrConfig}
              onChange={setQrConfig}
              isLiveLinked={Boolean(activeItem)}
              hasSelectedFile={Boolean(selectedFile)}
              creating={uploading}
              createProgress={uploadProgress}
              onCreateQr={() => void handleCreateQr()}
              onSaveConfigToServer={activeItem?.edit_token ? handleSaveConfigToServer : undefined}
              savingConfig={savingConfig}
            />
          ) : (
            <MagicTreeStudio
              linkedMedia={activeItem}
              pendingFile={selectedFile}
              pendingTitle={title}
              pendingExpiryDays={expiryDays}
              creatingPending={uploading}
              createPendingProgress={uploadProgress}
              createPendingError={errorMsg}
              onPickPendingFile={handleFilePick}
              onCreatePendingQr={() => void handleCreateQr()}
              initialConfig={
                activeItem
                  ? { url: shareUrl, season: "spring", flowerColor: "rose" }
                  : undefined
              }
              onMediaUploaded={(created) => {
                setActiveItem(created);
                onItemSaved?.();
              }}
            />
          )}
        </section>
      </ScrollReveal>
    </div>
  );
}
