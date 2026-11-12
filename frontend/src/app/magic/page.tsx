import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { MagicTreeViewer } from "@/components/MagicTreeViewer";

export default function MagicTreePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/?tab=magic"
            className="inline-flex min-h-[38px] items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-4 text-indigo-500" aria-hidden="true" />
            <span>Quay lại VidQR Studio</span>
          </Link>

          <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
            QR Hoạt Ảnh 3D • Magic Tree
          </h1>
        </div>

        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Đang dựng cây QR hoạt ảnh 3D...
            </div>
          }
        >
          <MagicTreeViewer />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
