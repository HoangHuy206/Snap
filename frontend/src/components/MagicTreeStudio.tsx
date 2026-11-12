"use client";

import React, { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Film,
  Flower2,
  Image as ImageIcon,
  Link2,
  QrCode,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trees,
} from "lucide-react";
import { MagicTreeCanvas, type MagicTreeCanvasHandle } from "@/components/MagicTreeCanvas";
import {
  formatBytes,
  getShareUrl,
  uploadMediaWithProgress,
  type MediaItem,
} from "@/lib/api";
import { saveQrHistoryEntry } from "@/lib/history";
import { DEFAULT_QR_CONFIG } from "@/lib/qr-presets";
import {
  DEFAULT_MAGIC_URL,
  FLOWER_PALETTES,
  SEASON_PRESETS,
  encodeMagicPayload,
  normalizeMagicUrl,
  type FlowerColorId,
  type MagicTreeConfig,
  type SeasonId,
} from "@/lib/magic-tree";

interface MagicTreeStudioProps {
  initialConfig?: MagicTreeConfig;
  compactViewer?: boolean;
  linkedMedia?: MediaItem | null;
  pendingFile?: File | null;
  pendingTitle?: string;
  pendingExpiryDays?: number;
  creatingPending?: boolean;
  createPendingProgress?: number;
  createPendingError?: string;
  onPickPendingFile?: (file: File | undefined) => void;
  onCreatePendingQr?: () => void;
  onMediaUploaded?: (item: MediaItem) => void;
}

type SourceTab = "media" | "url";

export function MagicTreeStudio({
  initialConfig,
  compactViewer = false,
  linkedMedia = null,
  pendingFile = null,
  pendingTitle = "",
  pendingExpiryDays = 7,
  creatingPending = false,
  createPendingProgress = 0,
  createPendingError = "",
  onPickPendingFile,
  onCreatePendingQr,
  onMediaUploaded,
}: MagicTreeStudioProps) {
  const initialUrl =
    initialConfig?.url ?? (linkedMedia ? getShareUrl(linkedMedia.code) : DEFAULT_MAGIC_URL);

  const [sourceTab, setSourceTab] = useState<SourceTab>("media");
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [customUrl, setCustomUrl] = useState<string>(initialUrl);
  const [localMedia, setLocalMedia] = useState<MediaItem | null>(null);
  const [localPendingFile, setLocalPendingFile] = useState<File | null>(null);
  const [mediaTitle, setMediaTitle] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(7);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [season, setSeason] = useState<SeasonId>(initialConfig?.season ?? "spring");
  const [flowerColor, setFlowerColor] = useState<FlowerColorId>(
    initialConfig?.flowerColor ?? "rose"
  );
  const [mode, setMode] = useState<"tree" | "qr">("tree");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [showControlsInViewer, setShowControlsInViewer] = useState(!compactViewer);

  const fileInputId = useId();
  const canvasRef = useRef<MagicTreeCanvasHandle>(null);

  const isEmbeddedInStudio = Boolean(onCreatePendingQr);
  const attachedMedia = linkedMedia ?? localMedia;
  const effectivePendingFile = isEmbeddedInStudio ? pendingFile : localPendingFile;
  const effectiveCreating = isEmbeddedInStudio ? creatingPending : uploadingMedia;
  const effectiveProgress = isEmbeddedInStudio ? createPendingProgress : uploadProgress;
  const effectiveError = uploadError || (isEmbeddedInStudio ? createPendingError : "") || null;
  const canExportOrShare = sourceTab === "url" || Boolean(attachedMedia);
  const activeUrl =
    sourceTab === "url"
      ? customUrl
      : attachedMedia
        ? getShareUrl(attachedMedia.code)
        : (initialConfig?.url ?? DEFAULT_MAGIC_URL);

  const sharePath = useMemo(() => {
    const token = encodeMagicPayload({ url: activeUrl, season, flowerColor });
    return `/magic?q=${encodeURIComponent(token)}`;
  }, [activeUrl, season, flowerColor]);

  const isVidQrMediaLink = useMemo(() => /\/v\/[A-Za-z0-9_-]+/.test(activeUrl), [activeUrl]);

  const applyUrlValue = (raw: string) => {
    const res = normalizeMagicUrl(raw);
    if (!res.valid) {
      setUrlError(res.error ?? "Đường dẫn chưa hợp lệ.");
      return false;
    }
    setUrlError(null);
    setUrlInput(res.url);
    setCustomUrl(res.url);
    if (!localMedia || getShareUrl(localMedia.code) !== res.url) {
      setLocalMedia(null);
    }
    return true;
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    applyUrlValue(urlInput);
  };

  const handleFileInputPicked = (file: File | undefined) => {
    if (!file) return;
    setUploadError(null);
    setSourceTab("media");
    if (onPickPendingFile) {
      onPickPendingFile(file);
    } else {
      setLocalPendingFile(file);
      if (!mediaTitle.trim()) {
        setMediaTitle(file.name.replace(/\.[^/.]+$/, "").slice(0, 120));
      }
    }
  };

  const handleCreateMediaQr = async () => {
    if (onCreatePendingQr) {
      onCreatePendingQr();
      return;
    }
    if (!localPendingFile) {
      setUploadError("Vui lòng chọn Video, Ảnh hoặc Tệp tin trước khi tạo QR 3D.");
      return;
    }

    setUploadingMedia(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const derivedTitle =
        mediaTitle.trim() ||
        localPendingFile.name.replace(/\.[^/.]+$/, "").slice(0, 120) ||
        localPendingFile.name;
      const created = await uploadMediaWithProgress(
        {
          file: localPendingFile,
          title: derivedTitle,
          expiryDays,
          qrConfig: DEFAULT_QR_CONFIG,
        },
        (pct) => setUploadProgress(pct)
      );
      const nextUrl = getShareUrl(created.code);
      saveQrHistoryEntry(created, DEFAULT_QR_CONFIG);
      setLocalMedia(created);
      setCustomUrl(nextUrl);
      setUrlInput(nextUrl);
      setUrlError(null);
      setLocalPendingFile(null);
      setMediaTitle("");
      onMediaUploaded?.(created);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Không thể tải Video/Ảnh lên.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePasteUrl = async () => {
    setPasteNote(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteNote("Bộ nhớ tạm đang trống.");
        return;
      }
      setUrlInput(text.trim());
      if (applyUrlValue(text)) {
        setPasteNote("Đã dán và cập nhật link!");
        window.setTimeout(() => setPasteNote(null), 2200);
      }
    } catch {
      setPasteNote("Trình duyệt chưa cấp quyền đọc clipboard, hãy Ctrl+V.");
      window.setTimeout(() => setPasteNote(null), 3000);
    }
  };

  const handleCopyShareLink = async () => {
    if (!canExportOrShare) return;
    const absoluteUrl =
      typeof window !== "undefined" ? `${window.location.origin}${sharePath}` : sharePath;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      setUrlError("Không thể tự động sao chép — hãy mở trang /magic rồi copy URL.");
    }
  };

  const handleDownloadPng = () => {
    if (!canExportOrShare) return;
    const slug = mode === "tree" ? `vidqr-magic-tree-${season}` : `vidqr-magic-qr-${season}`;
    canvasRef.current?.exportCurrentPng(`${slug}.png`);
  };

  const handleReset = () => {
    setUrlError(null);
    setUploadError(null);
    const resetTarget = attachedMedia ? getShareUrl(attachedMedia.code) : DEFAULT_MAGIC_URL;
    setUrlInput(resetTarget);
    setCustomUrl(resetTarget);
    setSeason("spring");
    setFlowerColor("rose");
    setMode("tree");
  };

  return (
    <section
      aria-label="Tạo QR Hoạt Ảnh 3D cho Video, Ảnh, Tệp tin và Link URL"
      className={`mx-auto w-full ${
        showControlsInViewer ? "grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" : "max-w-3xl space-y-4"
      }`}
    >
      {/* Main Interactive Stage */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-[#faf6ee] via-[#f6f1e6] to-[#efe8d8] dark:from-[#121622] dark:via-[#10141f] dark:to-[#0d101a] p-3 sm:p-4 shadow-sm ${
          showControlsInViewer ? "lg:col-span-6 lg:sticky lg:top-16" : ""
        }`}
      >
        {/* Top stage info bar */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/70 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-indigo-200 backdrop-blur-sm">
            <Sparkles className="size-3 text-amber-500 dark:text-indigo-400" aria-hidden="true" />
            <span>QR 3D • Video, Ảnh &amp; Link</span>
          </div>

          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {mode === "tree" ? (
              <>
                <QrCode className="size-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Xem mã QR quét</span>
              </>
            ) : (
              <>
                <Trees className="size-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Biến thành Cây 3D</span>
              </>
            )}
          </button>
        </div>

        {/* Canvas */}
        <MagicTreeCanvas
          ref={canvasRef}
          url={activeUrl}
          season={season}
          flowerColor={flowerColor}
          mode={mode}
          onToggleMode={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
        />

        {/* Bottom quick interaction pill */}
        <div className="mt-2.5 flex flex-col items-center gap-1.5 text-center">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-300/70 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-3.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {mode === "tree"
                ? "Chạm cây xem Mã QR • Kéo để xoay"
                : "Chạm lại để bung Cây 3D"}
            </button>

            {isVidQrMediaLink && (
              <a
                href={activeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors"
              >
                <Film className="size-3.5" aria-hidden="true" />
                <span>Mở Video / Ảnh</span>
              </a>
            )}
          </div>

          {showControlsInViewer && (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2.5 mt-1 border-t border-slate-200/70 dark:border-slate-800/80">
              {sourceTab === "media" ? (
                attachedMedia ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600/90 text-white px-4 py-2 text-xs sm:text-sm font-semibold shadow-xs cursor-default"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    <span>Đã tạo QR 3D</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={effectiveCreating}
                    onClick={() => void handleCreateMediaQr()}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
                  >
                    {effectiveCreating ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                        <span>Đang tạo QR ({effectiveProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="size-4" aria-hidden="true" />
                        <span>Tạo QR Ngay</span>
                      </>
                    )}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
                >
                  {mode === "tree" ? (
                    <>
                      <QrCode className="size-4" aria-hidden="true" />
                      <span>Xem mã QR quét</span>
                    </>
                  ) : (
                    <>
                      <Trees className="size-4" aria-hidden="true" />
                      <span>Xem Cây 3D</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                disabled={!canExportOrShare}
                onClick={handleDownloadPng}
                title={!canExportOrShare ? "Hãy bấm Tạo QR Ngay trước khi lưu PNG" : undefined}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 px-4 py-2 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                <Download className="size-4" aria-hidden="true" />
                <span>{mode === "tree" ? "Lưu Cây PNG" : "Lưu QR PNG"}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Viewer mode toggle when opened via /magic?q=... */}
      {compactViewer && !showControlsInViewer && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="size-4 text-indigo-500" aria-hidden="true" />
            <span>{mode === "tree" ? "Tải ảnh Cây 3D (PNG)" : "Tải ảnh QR Quét (PNG)"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowControlsInViewer(true)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Flower2 className="size-4" aria-hidden="true" />
            <span>Gắn Video / Ảnh hoặc tùy biến</span>
          </button>
        </div>
      )}

      {/* Customization Controls Card */}
      {showControlsInViewer && (
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-3.5 sm:p-4 shadow-sm space-y-4">
          {/* Source Selector: Video/Image/File OR Direct Link URL */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                1. Chọn nội dung gắn vào QR Cây 3D
              </span>

              <div
                role="group"
                aria-label="Chọn nguồn nội dung cho QR 3D"
                className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-1 gap-1"
              >
                <button
                  type="button"
                  aria-pressed={sourceTab === "media"}
                  onClick={() => setSourceTab("media")}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    sourceTab === "media"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <Film className="size-3.5" aria-hidden="true" />
                  <span>Video / Ảnh / Tệp</span>
                </button>
                <button
                  type="button"
                  aria-pressed={sourceTab === "url"}
                  onClick={() => setSourceTab("url")}
                  className={`inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                    sourceTab === "url"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                  }`}
                >
                  <Link2 className="size-3.5" aria-hidden="true" />
                  <span>Dán Link URL</span>
                </button>
              </div>
            </div>

            {sourceTab === "media" ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 sm:p-4">
                {attachedMedia ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-300/70 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/35 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {attachedMedia.media_kind === "image" ? (
                        <ImageIcon className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <Film className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100 truncate">
                        Đang gắn: {attachedMedia.title} ({formatBytes(attachedMedia.file_size)})
                      </span>
                    </div>
                    <a
                      href={getShareUrl(attachedMedia.code)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-emerald-700 dark:text-emerald-300 underline shrink-0"
                    >
                      Mở xem
                    </a>
                  </div>
                ) : effectivePendingFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-indigo-300/80 dark:border-indigo-700/80 bg-indigo-50/80 dark:bg-indigo-950/35 px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      {effectivePendingFile.type.startsWith("image/") ? (
                        <ImageIcon className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                      ) : (
                        <Film className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-indigo-950 dark:text-indigo-100 truncate">
                          {effectivePendingFile.name} ({formatBytes(effectivePendingFile.size)})
                        </p>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 truncate">
                          {isEmbeddedInStudio
                            ? `Đã tự động thêm từ Bước 1 • Lưu ${pendingExpiryDays} ngày${
                                pendingTitle.trim() ? ` • "${pendingTitle.trim()}"` : ""
                              }`
                            : "Đã sẵn sàng — bấm Tạo QR Ngay bên dưới"}
                        </p>
                      </div>
                    </div>
                    <label
                      htmlFor={fileInputId}
                      className="font-semibold text-indigo-700 dark:text-indigo-300 underline cursor-pointer shrink-0"
                    >
                      Đổi tệp
                    </label>
                  </div>
                ) : null}

                {!isEmbeddedInStudio && !attachedMedia && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <input
                      type="text"
                      maxLength={200}
                      value={mediaTitle}
                      onChange={(e) => setMediaTitle(e.target.value)}
                      placeholder="Tiêu đề Video / Ảnh (tùy chọn)..."
                      aria-label="Tiêu đề Video hoặc Ảnh"
                      className="sm:col-span-8 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                    />
                    <select
                      value={expiryDays}
                      onChange={(e) => setExpiryDays(Number(e.target.value))}
                      aria-label="Thời hạn lưu trữ"
                      className="sm:col-span-4 min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
                    >
                      <option value={1}>Lưu 1 ngày</option>
                      <option value={7}>Lưu 7 ngày</option>
                      <option value={14}>Lưu 14 ngày</option>
                      <option value={30}>Lưu 30 ngày</option>
                    </select>
                  </div>
                )}

                <input
                  id={fileInputId}
                  type="file"
                  disabled={effectiveCreating}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    handleFileInputPicked(f);
                  }}
                  className="visually-hidden"
                />

                {!effectivePendingFile && !attachedMedia && (
                  <label
                    htmlFor={fileInputId}
                    className={`flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors ${
                      effectiveCreating
                        ? "border-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-200 cursor-wait"
                        : "border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 cursor-pointer"
                    }`}
                  >
                    <FileUp className="size-4" aria-hidden="true" />
                    <span>Chọn Video, Ảnh hoặc Tệp tin từ máy để gắn vào QR 3D</span>
                  </label>
                )}

                {effectiveCreating && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-indigo-700 dark:text-indigo-300">
                      <span>Đang tải tệp lên để tạo QR 3D...</span>
                      <span>{effectiveProgress}%</span>
                    </div>
                    <progress
                      className="snap-progress"
                      max={100}
                      value={effectiveProgress}
                      aria-label="Tiến độ tải Video/Ảnh lên"
                    />
                  </div>
                )}

                {effectiveError && (
                  <p
                    role="alert"
                    className="flex items-start gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400"
                  >
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{effectiveError}</span>
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <div className="relative flex-1 flex items-center">
                    <input
                      id="magic-tree-url-input"
                      type="text"
                      inputMode="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      placeholder="https://example.com hoặc link TikTok, YouTube, website..."
                      className="w-full min-h-[46px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/70 pl-4 pr-24 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <button
                      type="button"
                      onClick={handlePasteUrl}
                      title="Dán link từ clipboard"
                      className="absolute right-2 inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="size-3.5"
                        aria-hidden="true"
                      >
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      </svg>
                      <span>Dán</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="min-h-[46px] shrink-0 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    Cập nhật QR 3D
                  </button>
                </div>

                {urlError && (
                  <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
                    {urlError}
                  </p>
                )}
                {pasteNote && !urlError && (
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {pasteNote}
                  </p>
                )}
              </form>
            )}
          </div>

          {/* Season Picker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                2. Chọn mùa &amp; không khí
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                <span>Mặc định</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SEASON_PRESETS.map((preset) => {
                const isSelected = season === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSeason(preset.id);
                      setFlowerColor(preset.defaultFlower);
                    }}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {preset.ambientEmoji} {preset.label}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {preset.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flower Palette Swatches */}
          <div className="space-y-2">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              3. Chọn màu hoa &amp; lá
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {FLOWER_PALETTES.map((palette) => {
                const isSelected = flowerColor === palette.id;
                return (
                  <button
                    key={palette.id}
                    type="button"
                    aria-label={`Chọn màu hoa ${palette.label}`}
                    aria-pressed={isSelected}
                    title={palette.label}
                    onClick={() => setFlowerColor(palette.id)}
                    className={`group flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span
                      className="size-3.5 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: palette.swatchHex }}
                    />
                    <span>{palette.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share & Export Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            {sourceTab === "media" && !attachedMedia && (
              <button
                type="button"
                disabled={effectiveCreating}
                onClick={() => void handleCreateMediaQr()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
              >
                {effectiveCreating ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                    <span>Đang tạo QR ({effectiveProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="size-4" aria-hidden="true" />
                    <span>Tạo QR Ngay</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              disabled={!canExportOrShare}
              onClick={handleCopyShareLink}
              title={!canExportOrShare ? "Hãy bấm Tạo QR Ngay trước khi copy link 3D" : undefined}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  <span>Đã copy link 3D!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  <span>Copy link 3D (/magic)</span>
                </>
              )}
            </button>

            {!compactViewer &&
              (canExportOrShare ? (
                <Link
                  href={sharePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="size-3.5 text-indigo-500" aria-hidden="true" />
                  <span>Mở /magic</span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Hãy bấm Tạo QR Ngay trước khi mở /magic"
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 opacity-45 cursor-not-allowed"
                >
                  <ExternalLink className="size-3.5 text-indigo-500" aria-hidden="true" />
                  <span>Mở /magic</span>
                </button>
              ))}
          </div>

          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {canExportOrShare ? (
              <>
                <strong>Mẹo:</strong> Gửi <em>Copy link 3D (/magic)</em> để người nhận xem hiệu ứng cây hoa xoay và chạm bung thành mã QR kèm Video/Ảnh.
              </>
            ) : effectivePendingFile ? (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                Đã gắn tệp! Bấm <strong>Tạo QR Ngay</strong> để tạo link QR 3D thật và mở khóa Lưu PNG / Copy link 3D.
              </span>
            ) : (
              <span className="text-amber-700 dark:text-amber-300 font-medium">
                Chọn Video, Ảnh hoặc Tệp tin trước rồi bấm <strong>Tạo QR Ngay</strong> để tạo mã 3D thật.
              </span>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
