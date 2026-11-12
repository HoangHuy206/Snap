"use client";

import React, { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Flower2,
  Link2,
  QrCode,
  RotateCcw,
  Sparkles,
  Trees,
} from "lucide-react";
import { MagicTreeCanvas, type MagicTreeCanvasHandle } from "@/components/MagicTreeCanvas";
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
}

export function MagicTreeStudio({ initialConfig, compactViewer = false }: MagicTreeStudioProps) {
  const initialUrl = initialConfig?.url ?? DEFAULT_MAGIC_URL;
  const [urlInput, setUrlInput] = useState<string>(initialUrl);
  const [activeUrl, setActiveUrl] = useState<string>(initialUrl);
  const [season, setSeason] = useState<SeasonId>(initialConfig?.season ?? "spring");
  const [flowerColor, setFlowerColor] = useState<FlowerColorId>(
    initialConfig?.flowerColor ?? "rose"
  );
  const [mode, setMode] = useState<"tree" | "qr">("tree");
  const [urlError, setUrlError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [showControlsInViewer, setShowControlsInViewer] = useState(!compactViewer);

  const canvasRef = useRef<MagicTreeCanvasHandle>(null);

  const sharePath = useMemo(() => {
    const token = encodeMagicPayload({ url: activeUrl, season, flowerColor });
    return `/magic?q=${encodeURIComponent(token)}`;
  }, [activeUrl, season, flowerColor]);

  const applyUrlValue = (raw: string) => {
    const res = normalizeMagicUrl(raw);
    if (!res.valid) {
      setUrlError(res.error ?? "Đường dẫn chưa hợp lệ.");
      return false;
    }
    setUrlError(null);
    setUrlInput(res.url);
    setActiveUrl(res.url);
    return true;
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    applyUrlValue(urlInput);
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
    const slug = mode === "tree" ? `vidqr-magic-tree-${season}` : `vidqr-magic-qr-${season}`;
    canvasRef.current?.exportCurrentPng(`${slug}.png`);
  };

  const handleReset = () => {
    setUrlError(null);
    setUrlInput(DEFAULT_MAGIC_URL);
    setActiveUrl(DEFAULT_MAGIC_URL);
    setSeason("spring");
    setFlowerColor("rose");
    setMode("tree");
  };

  return (
    <section
      aria-label="Tạo QR Hoạt Ảnh 3D Magic Tree cho Link"
      className="mx-auto w-full max-w-5xl space-y-6"
    >
      {/* Main Interactive Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-gradient-to-b from-[#faf6ee] via-[#f6f1e6] to-[#efe8d8] dark:from-[#121622] dark:via-[#10141f] dark:to-[#0d101a] p-4 sm:p-6 shadow-sm">
        {/* Top stage info bar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 dark:border-indigo-500/30 bg-white/80 dark:bg-slate-900/70 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-indigo-200 backdrop-blur-sm">
            <Sparkles className="size-3.5 text-amber-500 dark:text-indigo-400" aria-hidden="true" />
            <span>QR Hoạt Ảnh 3D • Chỉ áp dụng cho Link URL</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-xs text-slate-600 dark:text-slate-400">
              {mode === "tree"
                ? "Kéo ngang trên cây để xoay 3D (±24°)"
                : "Mặt phẳng QR độ tương phản cao — sẵn sàng quét"}
            </span>
            <button
              type="button"
              onClick={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
        <div className="mt-3 flex flex-col items-center gap-2 text-center">
          <button
            type="button"
            onClick={() => setMode((prev) => (prev === "tree" ? "qr" : "tree"))}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-slate-300/70 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 px-4 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 shadow-xs hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {mode === "tree" ? "Chạm vào cây để biến thành Mã QR" : "Chạm lại để bung thành Cây 3D"}
          </button>

          <p className="max-w-full truncate px-3 text-xs text-slate-500 dark:text-slate-400">
            Đích đến khi quét:{" "}
            <a
              href={activeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-700 dark:text-indigo-400 underline underline-offset-2"
            >
              {activeUrl}
            </a>
          </p>
        </div>
      </div>

      {/* Viewer mode toggle when opened via /magic?q=... */}
      {compactViewer && !showControlsInViewer && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownloadPng}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="size-4 text-indigo-500" aria-hidden="true" />
            <span>{mode === "tree" ? "Tải ảnh Cây 3D (PNG)" : "Tải ảnh QR Quét (PNG)"}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowControlsInViewer(true)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Flower2 className="size-4" aria-hidden="true" />
            <span>Tùy biến mùa &amp; tạo cây của bạn</span>
          </button>
        </div>
      )}

      {/* Customization Controls Card */}
      {showControlsInViewer && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-5 sm:p-6 shadow-sm space-y-5">
          {/* URL Form */}
          <form onSubmit={handleFormSubmit} className="space-y-2">
            <label
              htmlFor="magic-tree-url-input"
              className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <Link2 className="size-4 text-indigo-500" aria-hidden="true" />
              <span>Nhập đường dẫn URL cần biến thành QR Hoạt Ảnh 3D</span>
            </label>

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
                Tạo Cây QR 3D
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

          {/* Season Picker */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Chọn mùa &amp; không khí
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

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
                    className={`flex flex-col items-start rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {preset.ambientEmoji} {preset.label}
                    </span>
                    <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {preset.shortDesc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flower Palette Swatches */}
          <div className="space-y-2.5">
            <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              Chọn màu hoa nở trên tán cây
            </span>
            <div className="flex flex-wrap items-center gap-3">
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
                    className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <span
                      className="size-4 rounded-full border border-black/15 shrink-0"
                      style={{ backgroundColor: palette.swatchHex }}
                    />
                    <span>{palette.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Share & Export Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  <span>Đã copy link hoạt ảnh!</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" aria-hidden="true" />
                  <span>Copy link hoạt ảnh (/magic)</span>
                </>
              )}
            </button>

            {!compactViewer && (
              <Link
                href={sharePath}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="size-4 text-indigo-500" aria-hidden="true" />
                <span>Mở trang xem /magic</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleDownloadPng}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Download className="size-4 text-indigo-500" aria-hidden="true" />
              <span>{mode === "tree" ? "Tải ảnh Cây 3D (PNG)" : "Tải ảnh QR Quét (PNG)"}</span>
            </button>
          </div>

          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <strong>Mẹo:</strong> File ảnh <code>.png</code> là ảnh tĩnh để chèn vào bài đăng/thiết
            kế. Để người nhận thấy <strong>hiệu ứng cây 3D xoay và bung nở thành mã QR</strong>, hãy
            bấm <em>Copy link hoạt ảnh (/magic)</em> để gửi trực tiếp đường dẫn tương tác!
          </p>
        </div>
      )}
    </section>
  );
}
