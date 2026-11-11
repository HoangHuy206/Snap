"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileText,
  Film,
  Image as ImageIcon,
  Music,
  QrCode,
  Settings2,
  Volume2,
} from "lucide-react";
import { Header } from "@/components/Header";
import {
  fetchMediaMetadata,
  formatBytes,
  getMediaStreamUrl,
  type MediaItem,
} from "@/lib/api";
import { findStoredEditToken } from "@/lib/history";

function AutoPlayVideo({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [autoMutedNotice, setAutoMutedNotice] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    const tryAutoPlay = async () => {
      if (cancelled) return;
      try {
        await video.play();
      } catch {
        if (cancelled) return;
        // Mobile browsers block unmuted autoplay; fall back to muted autoplay immediately.
        video.muted = true;
        setAutoMutedNotice(true);
        try {
          await video.play();
        } catch {
          // Leave native controls ready if strict power-saving mode pauses autoplay.
        }
      }
    };

    void tryAutoPlay();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return (
    <div className="relative bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        controls
        autoPlay
        playsInline
        preload="auto"
        src={src}
        onVolumeChange={() => {
          if (videoRef.current && !videoRef.current.muted) {
            setAutoMutedNotice(false);
          }
        }}
        className="w-full max-h-[70dvh] object-contain bg-black block"
      />
      {autoMutedNotice && (
        <button
          type="button"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = false;
            setAutoMutedNotice(false);
            void video.play().catch(() => {});
          }}
          className="absolute top-3 right-3 z-10 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-950/85 hover:bg-slate-900 text-white border border-white/25 px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-sm cursor-pointer transition-colors"
        >
          <Volume2 className="size-4 shrink-0" aria-hidden="true" />
          Bấm để bật tiếng
        </button>
      )}
    </div>
  );
}

export default function ViewMediaPage() {
  const params = useParams<{ code: string }>();
  const code = params?.code || "";

  const [item, setItem] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [storedToken, setStoredToken] = useState<string | null>(null);
  const fetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!code || fetchedRef.current === code) return;
    fetchedRef.current = code;
    setStoredToken(findStoredEditToken(code));

    (async () => {
      try {
        const data = await fetchMediaMetadata(code, true);
        setItem(data);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Không thể tải nội dung mã QR.");
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const streamUrl = code ? getMediaStreamUrl(code, false) : "";
  const downloadUrl = code ? getMediaStreamUrl(code, true) : "";

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-4xl px-3.5 sm:px-6 py-4 sm:py-8">
        {loading && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-8 text-center space-y-3">
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Đang tải nội dung từ mã QR...
            </p>
            <progress className="snap-progress max-w-sm mx-auto" />
          </div>
        )}

        {!loading && errorMsg && (
          <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-[#111520] p-8 text-center space-y-4">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <AlertCircle className="size-7" aria-hidden="true" />
            </span>
            <h1 className="text-xl font-bold">Không thể mở nội dung</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">{errorMsg}</p>
            <Link
              href="/"
              className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              <QrCode className="size-4" aria-hidden="true" />
              Tạo mã QR mới
            </Link>
          </div>
        )}

        {!loading && item && (
          <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-7 shadow-sm space-y-5">
            {/* Title & Meta */}
            <header className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 px-3 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/70">
                  {item.media_kind === "video" && <Film className="size-3.5" aria-hidden="true" />}
                  {item.media_kind === "image" && <ImageIcon className="size-3.5" aria-hidden="true" />}
                  {item.media_kind === "audio" && <Music className="size-3.5" aria-hidden="true" />}
                  {item.media_kind === "pdf" && <FileText className="size-3.5" aria-hidden="true" />}
                  {item.media_kind === "file" && <FileArchive className="size-3.5" aria-hidden="true" />}
                  {item.media_kind.toUpperCase()}
                </span>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {item.view_count} lượt xem
                  </span>
                  <span>{formatBytes(item.file_size)}</span>
                  {item.expires_at && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-3.5" aria-hidden="true" />
                      HSD: {new Date(item.expires_at).toLocaleDateString("vi-VN")}
                    </span>
                  )}
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight break-words">
                {item.title}
              </h1>
              {item.description && (
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line">
                  {item.description}
                </p>
              )}
            </header>

            {/* Media Renderer */}
            <div className="rounded-2xl overflow-clip border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
              {item.media_kind === "video" && <AutoPlayVideo src={streamUrl} />}

              {item.media_kind === "image" && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={streamUrl}
                  alt={item.title}
                  className="w-full max-h-[72dvh] object-contain mx-auto block"
                />
              )}

              {item.media_kind === "audio" && (
                <div className="p-6 flex flex-col items-center gap-4">
                  <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400">
                    <Music className="size-8" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-medium break-all text-center">{item.original_filename}</p>
                  <audio controls src={streamUrl} className="w-full max-w-md" />
                </div>
              )}

              {item.media_kind === "pdf" && (
                <iframe
                  title={item.title}
                  src={streamUrl}
                  className="w-full h-[65dvh] bg-white block"
                />
              )}

              {item.media_kind === "file" && (
                <div className="p-8 flex flex-col items-center text-center gap-3">
                  <span className="inline-flex size-16 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <FileArchive className="size-8" aria-hidden="true" />
                  </span>
                  <p className="font-semibold text-base break-all">{item.original_filename}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {formatBytes(item.file_size)} • {item.content_type}
                  </p>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3 pt-1">
              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5">
                <a
                  href={downloadUrl}
                  download={item.original_filename}
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors"
                >
                  <Download className="size-4 shrink-0" aria-hidden="true" />
                  Tải xuống tệp gốc
                </a>

                {(item.media_kind === "pdf" || item.media_kind === "image" || item.media_kind === "video") && (
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold"
                  >
                    <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                    Mở tab riêng
                  </a>
                )}
              </div>

              {storedToken && (
                <Link
                  href={`/manage/${code}?token=${encodeURIComponent(storedToken)}`}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  <Settings2 className="size-4 shrink-0" aria-hidden="true" />
                  Đổi file / Quản lý QR
                </Link>
              )}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
