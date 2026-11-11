"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { QrCode, Sparkles, Sun, Moon, Monitor } from "lucide-react";

type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "snapqr_theme";
const THEME_EVENT = "snapqr-theme-change";

function applyThemeToDom(next: ThemePref): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (next === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", next);
  }
}

function getThemeSnapshot(): ThemePref {
  if (typeof window === "undefined") return "system";
  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

function getServerThemeSnapshot(): ThemePref {
  return "system";
}

function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(THEME_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(THEME_EVENT, handler);
  };
}

export function Header() {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const cycleTheme = () => {
    const order: ThemePref[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    window.localStorage.setItem(THEME_KEY, next);
    applyThemeToDom(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const themeLabel =
    theme === "system" ? "Giao diện: Tự động" : theme === "light" ? "Giao diện: Sáng" : "Giao diện: Tối";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-[#090b10]/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl snap-safe-top py-2.5 sm:py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white shadow-sm">
            <QrCode className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight truncate">SnapQR</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800/60">
                <Sparkles className="size-3" aria-hidden="true" />
                Studio
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 truncate">
              <span className="sm:hidden">QR Động • Tải MXH Không Logo</span>
              <span className="hidden sm:inline">QR Video &amp; File Động • Tải MXH Không Logo</span>
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={themeLabel}
            title={themeLabel}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center sm:justify-start gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {theme === "system" && <Monitor className="size-4" aria-hidden="true" />}
            {theme === "light" && <Sun className="size-4" aria-hidden="true" />}
            {theme === "dark" && <Moon className="size-4" aria-hidden="true" />}
            <span className="hidden sm:inline">{themeLabel}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
