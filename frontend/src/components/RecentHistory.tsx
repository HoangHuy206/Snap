"use client";

import Link from "next/link";
import { Film, FileText, Image as ImageIcon, Music, FileArchive, ExternalLink, Settings2, Trash2, Clock } from "lucide-react";
import { formatBytes } from "@/lib/api";
import type { LocalQrHistoryEntry } from "@/lib/history";

interface RecentHistoryProps {
  items: LocalQrHistoryEntry[];
  onSelectForQr: (entry: LocalQrHistoryEntry) => void;
  onRemove: (code: string) => void;
}

function KindIcon({ kind }: { kind: LocalQrHistoryEntry["mediaKind"] }) {
  switch (kind) {
    case "video":
      return <Film className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />;
    case "image":
      return <ImageIcon className="size-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />;
    case "audio":
      return <Music className="size-5 text-pink-600 dark:text-pink-400" aria-hidden="true" />;
    case "pdf":
      return <FileText className="size-5 text-rose-600 dark:text-rose-400" aria-hidden="true" />;
    default:
      return <FileArchive className="size-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />;
  }
}

export function RecentHistory({ items, onSelectForQr, onRemove }: RecentHistoryProps) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-history-heading" className="mt-8 sm:mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
          <h2 id="recent-history-heading" className="text-lg font-bold">
            Mã QR bạn đã tạo gần đây
          </h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Lưu trên trình duyệt này (kèm quyền sửa Dynamic QR)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((entry) => (
          <div
            key={entry.code}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <KindIcon kind={entry.mediaKind} />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{entry.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  /{entry.code} • {formatBytes(entry.fileSize)}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onSelectForQr(entry)}
                className="flex-1 sm:flex-none inline-flex min-h-[44px] items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 transition-colors cursor-pointer"
              >
                Mở QR
              </button>
              <Link
                href={`/manage/${entry.code}?token=${encodeURIComponent(entry.editToken)}`}
                title="Quản lý Dynamic QR"
                aria-label={`Quản lý mã QR ${entry.title}`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Settings2 className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href={`/v/${entry.code}`}
                target="_blank"
                title="Mở trang xem"
                aria-label={`Xem trang chia sẻ ${entry.title}`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
              <button
                type="button"
                onClick={() => onRemove(entry.code)}
                title="Xóa khỏi lịch sử trình duyệt"
                aria-label={`Xóa ${entry.title} khỏi lịch sử`}
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
