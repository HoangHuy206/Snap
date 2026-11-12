"use client";

import { Suspense, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  Eye,
  FileUp,
  KeyRound,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  deleteMediaItem,
  formatBytes,
  getShareUrl,
  replaceMediaFileWithProgress,
  updateMediaMetadata,
  verifyManageToken,
  type MediaItem,
} from "@/lib/api";
import {
  findStoredEditToken,
  removeQrHistoryEntry,
  updateHistoryItemInfo,
} from "@/lib/history";

function ManageQrContent() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = params?.code || "";

  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [item, setItem] = useState<MediaItem | null>(null);
  const [verifying, setVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  // Edit metadata
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // Replace file (Dynamic QR)
  const [newFile, setNewFile] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceProgress, setReplaceProgress] = useState(0);

  // Delete confirmation
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tokenFieldId = useId();
  const titleFieldId = useId();
  const descFieldId = useId();
  const replaceFileId = useId();

  const authenticateWithToken = async (candidate: string) => {
    setVerifying(true);
    setErrorMsg("");
    try {
      const verified = await verifyManageToken(code, candidate);
      setItem(verified);
      setToken(candidate);
      setTitle(verified.title);
      setDescription(verified.description || "");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Token quản lý không hợp lệ.");
      setItem(null);
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    if (!code) return;
    let active = true;
    const urlToken = searchParams.get("token");
    const localToken = findStoredEditToken(code);
    const initial = urlToken || localToken || "";

    (async () => {
      if (!initial) {
        if (active) setVerifying(false);
        return;
      }
      try {
        const verified = await verifyManageToken(code, initial);
        if (!active) return;
        setItem(verified);
        setToken(initial);
        setTokenInput(initial);
        setTitle(verified.title);
        setDescription(verified.description || "");
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : "Token quản lý không hợp lệ.");
        setItem(null);
      } finally {
        if (active) setVerifying(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [code, searchParams]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    authenticateWithToken(tokenInput.trim());
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !token) return;
    setSavingMeta(true);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const updated = await updateMediaMetadata(code, token, {
        title: title.trim() || item.title,
        description: description.trim(),
      });
      setItem(updated);
      updateHistoryItemInfo(code, { title: updated.title });
      setStatusMsg("Đã lưu thông tin mới cho mã QR.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Cập nhật thất bại.");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleReplaceFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile || !token) return;
    setReplacing(true);
    setReplaceProgress(0);
    setErrorMsg("");
    setStatusMsg("");
    try {
      const updated = await replaceMediaFileWithProgress(
        {
          code,
          editToken: token,
          file: newFile,
          title: title.trim() || undefined,
        },
        (pct) => setReplaceProgress(pct),
      );
      setItem(updated);
      setNewFile(null);
      updateHistoryItemInfo(code, {
        title: updated.title,
        originalFilename: updated.original_filename,
        mediaKind: updated.media_kind,
        fileSize: updated.file_size,
      });
      setStatusMsg("Đã thay thế tệp mới! Mã QR và đường dẫn chia sẻ vẫn giữ nguyên.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Thay thế tệp thất bại.");
    } finally {
      setReplacing(false);
    }
  };

  const handleDelete = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      await deleteMediaItem(code, token);
      removeQrHistoryEntry(code);
      router.push("/");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể xóa.");
      setDeleting(false);
    }
  };

  if (verifying) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-8 text-center space-y-3">
        <p className="text-sm font-medium">Đang xác thực quyền quản lý Dynamic QR...</p>
        <progress className="snap-progress max-w-sm mx-auto" />
      </div>
    );
  }

  if (!item) {
    return (
      <form
        onSubmit={handleTokenSubmit}
        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-6 sm:p-8 max-w-xl mx-auto space-y-4"
      >
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <h1 className="text-xl font-bold">Nhập mã quản lý Dynamic QR</h1>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Nhập Edit Token được cấp khi tạo mã QR <span className="font-mono font-semibold">/{code}</span> để thay đổi video/file bên trong hoặc xem thống kê.
        </p>

        <div className="space-y-1.5">
          <label htmlFor={tokenFieldId} className="block text-sm font-semibold">
            Edit Token
          </label>
          <input
            id={tokenFieldId}
            type="text"
            required
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Dán token quản lý..."
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 font-mono text-sm"
          />
        </div>

        {errorMsg && (
          <div role="alert" className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          type="submit"
          className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white cursor-pointer"
        >
          Mở bảng quản lý
        </button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Summary & Stats */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-7 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Quản lý Dynamic QR • /{item.code}
            </span>
            <h1 className="text-xl sm:text-2xl font-extrabold break-words">{item.title}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-all">
              Link công khai: <span className="font-mono">{getShareUrl(item.code)}</span>
            </p>
          </div>
          <Link
            href={`/v/${item.code}`}
            target="_blank"
            className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Xem trang QR
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-3.5 min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Eye className="size-3.5 shrink-0" aria-hidden="true" /> Lượt xem / quét
            </span>
            <p className="text-xl font-extrabold mt-1">{item.view_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-3.5 min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Download className="size-3.5 shrink-0" aria-hidden="true" /> Lượt tải xuống
            </span>
            <p className="text-xl font-extrabold mt-1">{item.download_count}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-3.5 min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Dung lượng hiện tại</span>
            <p className="text-lg font-bold mt-1">{formatBytes(item.file_size)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 sm:p-3.5 min-w-0">
            <span className="text-xs text-slate-500 dark:text-slate-400">Tệp hiện tại</span>
            <p className="text-xs font-mono font-semibold mt-1.5 truncate">{item.original_filename}</p>
          </div>
        </div>

        {statusMsg && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200"
          >
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-800 dark:text-rose-200"
          >
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dynamic QR Replace File */}
        <form
          onSubmit={handleReplaceFile}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-5 sm:p-6 space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold">Đổi Video / File (Dynamic QR)</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Thay nội dung mới mà vẫn giữ nguyên đường dẫn và mã QR đã in.
            </p>
          </div>

          <div className="rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 p-5 text-center">
            <input
              id={replaceFileId}
              type="file"
              onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              className="visually-hidden"
            />
            <label htmlFor={replaceFileId} className="flex flex-col items-center gap-2 cursor-pointer">
              <FileUp className="size-7 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span className="text-sm font-semibold break-all">
                {newFile ? `${newFile.name} (${formatBytes(newFile.size)})` : "Chọn Video hoặc Tệp thay thế"}
              </span>
            </label>
          </div>

          {replacing && (
            <div role="status" className="space-y-1">
              <progress className="snap-progress" max={100} value={replaceProgress} />
              <p className="text-xs text-slate-500">{replaceProgress}%</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!newFile || replacing}
            className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2.5 text-sm font-bold text-white cursor-pointer"
          >
            <RefreshCw className={`size-4 ${replacing ? "animate-spin" : ""}`} aria-hidden="true" />
            {replacing ? "Đang thay thế..." : "Cập nhật File mới vào QR"}
          </button>
        </form>

        {/* Edit Title & Description */}
        <form
          onSubmit={handleSaveMetadata}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-5 sm:p-6 space-y-4"
        >
          <h2 className="text-lg font-bold">Chỉnh sửa thông tin hiển thị</h2>

          <div className="space-y-1.5">
            <label htmlFor={titleFieldId} className="block text-sm font-semibold">
              Tiêu đề
            </label>
            <input
              id={titleFieldId}
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={descFieldId} className="block text-sm font-semibold">
              Ghi chú
            </label>
            <textarea
              id={descFieldId}
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={savingMeta}
            className="w-full inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2.5 text-sm font-bold cursor-pointer"
          >
            <Save className="size-4" aria-hidden="true" />
            {savingMeta ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <section className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-rose-800 dark:text-rose-200">Xóa vĩnh viễn mã QR &amp; tệp tin</h2>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
            Hành động này xóa file khỏi bộ nhớ và vô hiệu hóa đường dẫn chia sẻ ngay lập tức.
          </p>
        </div>

        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 cursor-pointer shrink-0"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Xóa mã QR
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex-1 sm:flex-none min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex-1 sm:flex-none min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              {deleting ? "Đang xóa..." : "Xác nhận xóa vĩnh viễn"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function ManageQrPage() {
  return (
    <div className="min-h-[100dvh] flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-5xl px-3.5 sm:px-6 py-5 sm:py-8">
        <Suspense
          fallback={
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-8 text-center">
              <p className="text-sm text-slate-500">Đang tải trang quản lý...</p>
            </div>
          }
        >
          <ManageQrContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
