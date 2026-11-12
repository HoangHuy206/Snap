"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { Sparkles, Sun, Moon, Monitor } from "lucide-react";

type ThemePref = "system" | "light" | "dark";
const THEME_KEY = "snapqr_theme";
const THEME_EVENT = "snapqr-theme-change";

function applyThemeToDom(next: ThemePref): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (next === "system") {
    root.removeAttribute("data-theme");
    if (meta) meta.setAttribute("content", "light dark");
  } else {
    root.setAttribute("data-theme", next);
    if (meta) meta.setAttribute("content", next);
  }
}

function getThemeSnapshot(): ThemePref {
  if (typeof window === "undefined") return "system";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
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

  const selectTheme = (next: ThemePref) => {
    try {
      if (next === "system") {
        window.localStorage.removeItem(THEME_KEY);
      } else {
        window.localStorage.setItem(THEME_KEY, next);
      }
    } catch {
      // Ignore storage access errors in restricted browsing contexts.
    }
    applyThemeToDom(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const options: Array<{
    value: ThemePref;
    label: string;
    title: string;
    icon: React.ReactNode;
  }> = [
    {
      value: "light",
      label: "Sáng",
      title: "Chế độ Sáng",
      icon: <Sun className="size-3.5 shrink-0" aria-hidden="true" />,
    },
    {
      value: "dark",
      label: "Tối",
      title: "Chế độ Tối",
      icon: <Moon className="size-3.5 shrink-0" aria-hidden="true" />,
    },
    {
      value: "system",
      label: "Tự động",
      title: "Theo cài đặt hệ thống",
      icon: <Monitor className="size-3.5 shrink-0" aria-hidden="true" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-300/80 dark:border-slate-800 bg-white/90 dark:bg-[#0b101b]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl snap-safe-top py-2.5 sm:py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 group">
          <span className="inline-flex shrink-0 items-center justify-center rounded-xl transition-colors dark:bg-white/95 dark:px-2.5 dark:py-1 dark:shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/vidqr-logo.png"
              alt="VidQR"
              width={991}
              height={607}
              className="h-9 sm:h-11 w-auto block object-contain"
            />
          </span>
          <div className="min-w-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
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

        <div
          role="group"
          aria-label="Chọn giao diện Sáng / Tối"
          className="inline-flex items-center gap-0.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-900/90 p-1 shrink-0"
        >
          {options.map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectTheme(opt.value)}
                aria-pressed={active}
                title={opt.title}
                aria-label={opt.title}
                className={`inline-flex min-h-[36px] sm:min-h-[38px] items-center justify-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
