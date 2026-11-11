"use client";

import { useState, useSyncExternalStore } from "react";
import { DownloadCloud, QrCode, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { QrStudio } from "@/components/QrStudio";
import { SocialDownloader } from "@/components/SocialDownloader";
import { RecentHistory } from "@/components/RecentHistory";
import type { MediaItem } from "@/lib/api";
import {
  getServerHistorySnapshot,
  loadQrHistory,
  removeQrHistoryEntry,
  saveQrHistoryEntry,
  subscribeQrHistory,
  type LocalQrHistoryEntry,
} from "@/lib/history";

type ActiveTab = "qr" | "social";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("qr");
  const [selectedQrItem, setSelectedQrItem] = useState<MediaItem | null>(null);
  const [studioResetKey, setStudioResetKey] = useState(0);

  const history = useSyncExternalStore(
    subscribeQrHistory,
    loadQrHistory,
    getServerHistorySnapshot,
  );

  const handleSendToQrStudio = (item: MediaItem) => {
    saveQrHistoryEntry(item, item.qr_config);
    setSelectedQrItem({ ...item });
    setStudioResetKey((k) => k + 1);
    setActiveTab("qr");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectHistory = (entry: LocalQrHistoryEntry) => {
    setSelectedQrItem({
      code: entry.code,
      title: entry.title,
      description: null,
      original_filename: entry.originalFilename,
      content_type: "",
      media_kind: entry.mediaKind,
      file_size: entry.fileSize,
      view_count: 0,
      download_count: 0,
      qr_config: entry.qrConfig || null,
      created_at: entry.createdAt,
      updated_at: entry.createdAt,
      expires_at: entry.expiresAt,
      edit_token: entry.editToken,
    });
    setStudioResetKey((k) => k + 1);
    setActiveTab("qr");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRemoveHistory = (code: string) => {
    removeQrHistoryEntry(code);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-6xl px-3.5 sm:px-6 py-5 sm:py-9">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4 mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/70 bg-indigo-50/80 dark:bg-indigo-950/50 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3.5 shrink-0" aria-hidden="true" />
            <span>Tạo QR Video / File Động &amp; Tải Media Không Logo</span>
          </div>
          <h1 className="text-[clamp(1.625rem,1.15rem+2.2vw,2.375rem)] font-extrabold tracking-tight leading-tight">
            Đưa Video &amp; File thành{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              Mã QR Nổi Bật
            </span>
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Upload video hoặc tệp tin để tạo mã QR thiết kế riêng có logo, đổi file bên trong không cần in lại QR — hoặc tải video/ảnh TikTok, YouTube, IG sạch watermark về máy.
          </p>

          {/* Main Tab Switcher */}
          <div
            role="tablist"
            aria-label="Chọn chức năng chính"
            className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex gap-1.5 sm:gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-1.5 shadow-sm mt-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "qr"}
              onClick={() => setActiveTab("qr")}
              className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "qr"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <QrCode className="size-4 shrink-0" aria-hidden="true" />
              <span>Tạo QR Video &amp; File</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "social"}
              onClick={() => setActiveTab("social")}
              className={`inline-flex min-h-[46px] items-center justify-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-5 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === "social"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <DownloadCloud className="size-4 shrink-0" aria-hidden="true" />
              <span>Tải Video &amp; Ảnh MXH</span>
            </button>
          </div>
        </section>

        {/* Active Workspace */}
        {activeTab === "qr" ? (
          <QrStudio
            key={`${selectedQrItem?.code ?? "new"}-${studioResetKey}`}
            initialItem={selectedQrItem}
          />
        ) : (
          <SocialDownloader onSendToQrStudio={handleSendToQrStudio} />
        )}

        <RecentHistory
          items={history}
          onSelectForQr={handleSelectHistory}
          onRemove={handleRemoveHistory}
        />
      </main>

      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 pt-5 snap-safe-bottom text-center text-xs text-slate-500 dark:text-slate-400">
        SnapQR — Hỗ trợ Cloudflare R2 / S3, PostgreSQL, Dynamic QR &amp; Media Extractor
      </footer>
    </div>
  );
}
