"use client";

import Link from "next/link";
import { ArrowUp, DownloadCloud, MessageSquareHeart, QrCode, ShieldCheck, Sparkles } from "lucide-react";

interface FooterProps {
  onSelectTab?: (tab: "qr" | "social") => void;
}

export function Footer({ onSelectTab }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleTabJump = (tab: "qr" | "social") => {
    if (onSelectTab) {
      onSelectTab(tab);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFeedbackJump = () => {
    const el = document.getElementById("feedback-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleScrollTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="mt-10 sm:mt-14 border-t border-slate-200/90 dark:border-slate-800/80 bg-white/80 dark:bg-[#0d121f]/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl snap-safe-bottom pt-8 sm:pt-10 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-7 sm:gap-8">
          {/* Brand & Summary */}
          <div className="lg:col-span-5 space-y-3">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <span className="inline-flex shrink-0 items-center justify-center rounded-xl transition-colors dark:bg-white/95 dark:px-2.5 dark:py-1 dark:shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/vidqr-logo.png"
                  alt="VidQR"
                  width={991}
                  height={607}
                  loading="lazy"
                  className="h-9 w-auto block object-contain"
                />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                <Sparkles className="size-3" aria-hidden="true" />
                Studio
              </span>
            </Link>

            <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-md">
              Nền tảng tạo mã QR động cho Video &amp; Tài liệu kèm khung viền thiết kế riêng, kết hợp công cụ tải Video &amp; Ảnh mạng xã hội không logo tốc độ cao.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
                Dynamic QR đổi file giữ nguyên mã
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-400">
                PNG HD &amp; Vector SVG
              </span>
            </div>
          </div>

          {/* Quick Navigation */}
          <nav aria-label="Điều hướng chân trang" className="lg:col-span-3 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Tính năng nhanh
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
              <li>
                {onSelectTab ? (
                  <button
                    type="button"
                    onClick={() => handleTabJump("qr")}
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <QrCode className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />
                    <span>Tạo QR Video &amp; File</span>
                  </button>
                ) : (
                  <Link
                    href="/?tab=qr"
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <QrCode className="size-4 shrink-0 text-indigo-500" aria-hidden="true" />
                    <span>Tạo QR Video &amp; File</span>
                  </Link>
                )}
              </li>
              <li>
                {onSelectTab ? (
                  <button
                    type="button"
                    onClick={() => handleTabJump("social")}
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <DownloadCloud className="size-4 shrink-0 text-cyan-500" aria-hidden="true" />
                    <span>Tải Video &amp; Ảnh MXH</span>
                  </button>
                ) : (
                  <Link
                    href="/?tab=social"
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <DownloadCloud className="size-4 shrink-0 text-cyan-500" aria-hidden="true" />
                    <span>Tải Video &amp; Ảnh MXH</span>
                  </Link>
                )}
              </li>
              <li>
                {onSelectTab ? (
                  <button
                    type="button"
                    onClick={handleFeedbackJump}
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    <MessageSquareHeart className="size-4 shrink-0 text-rose-500" aria-hidden="true" />
                    <span>Góp ý &amp; Đề xuất khung QR</span>
                  </button>
                ) : (
                  <Link
                    href="/#feedback-section"
                    className="inline-flex min-h-[36px] items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <MessageSquareHeart className="size-4 shrink-0 text-rose-500" aria-hidden="true" />
                    <span>Góp ý &amp; Đề xuất khung QR</span>
                  </Link>
                )}
              </li>
            </ul>
          </nav>

          {/* Supported Ecosystem & Top button */}
          <div className="lg:col-span-4 space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Định dạng &amp; Nền tảng hỗ trợ
            </h2>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Tệp QR:</strong>{" "}
              Video MP4, MOV, WebM, Ảnh HD, PDF, Audio, Tài liệu &amp; ZIP lên tới 200 MB.
            </p>
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <strong className="font-semibold text-slate-800 dark:text-slate-200">Tải MXH:</strong>{" "}
              TikTok, YouTube &amp; Shorts, Instagram Reels, Facebook, X / Twitter.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleScrollTop}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <ArrowUp className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Lên đầu trang</span>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left text-xs text-slate-500 dark:text-slate-400">
          <p>
            &copy; {currentYear}{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-300">VidQR Studio</span>. Tất cả công cụ miễn phí cho cộng đồng.
          </p>
          <p>Hỗ trợ Cloudflare R2 / S3, PostgreSQL, Dynamic QR &amp; Media Extractor</p>
        </div>
      </div>
    </footer>
  );
}
