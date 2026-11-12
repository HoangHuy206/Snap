"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: "default" | "footer";
}

/**
 * Scroll-triggered reveal wrapper ("kéo đến đâu hiện nội dung tới đó").
 * Keeps SSR HTML & above-the-fold content visible immediately for LCP/SEO,
 * stages off-screen sections below the fold, and smoothly reveals each block
 * once when scrolled into view while respecting prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  className = "",
  delayMs = 0,
  variant = "default",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const initialRect = el.getBoundingClientRect();
    if (initialRect.top <= window.innerHeight - 28) return;

    el.classList.add("vidqr-reveal-pending");

    let revealed = false;
    let observer: IntersectionObserver | null = null;
    let rafId = 0;
    let cleanupTimer: number | null = null;

    const triggerReveal = () => {
      if (revealed) return;
      revealed = true;
      observer?.disconnect();
      window.removeEventListener("scroll", checkBottomOrViewport);

      el.classList.remove("vidqr-reveal-pending");
      el.classList.add("vidqr-reveal-entering");

      // Remove transition class after completion so sticky children remain unaffected.
      cleanupTimer = window.setTimeout(() => {
        el.classList.remove("vidqr-reveal-entering");
      }, delayMs + 800);
    };

    const checkBottomOrViewport = () => {
      const rect = el.getBoundingClientRect();
      const nearViewportTrigger =
        rect.top <= window.innerHeight - (variant === "footer" ? 12 : 48);
      const reachedPageBottom =
        variant === "footer" &&
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 24;

      if (nearViewportTrigger || reachedPageBottom) {
        triggerReveal();
      }
    };

    rafId = window.requestAnimationFrame(() => {
      const rectAfterPaint = el.getBoundingClientRect();
      if (rectAfterPaint.top <= window.innerHeight - 28) {
        triggerReveal();
        return;
      }

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (
              entry.isIntersecting ||
              entry.boundingClientRect.top <= window.innerHeight - 28
            ) {
              triggerReveal();
              break;
            }
          }
        },
        {
          threshold: 0.04,
          rootMargin:
            variant === "footer" ? "0px 0px -12px 0px" : "0px 0px -56px 0px",
        }
      );

      observer.observe(el);
      window.addEventListener("scroll", checkBottomOrViewport, {
        passive: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(rafId);
      if (cleanupTimer !== null) window.clearTimeout(cleanupTimer);
      observer?.disconnect();
      window.removeEventListener("scroll", checkBottomOrViewport);
      el.classList.remove("vidqr-reveal-pending", "vidqr-reveal-entering");
    };
  }, [delayMs, variant]);

  const revealStyle =
    delayMs > 0
      ? ({ "--vidqr-reveal-delay": `${delayMs}ms` } as CSSProperties)
      : undefined;

  return (
    <div ref={ref} style={revealStyle} className={className || undefined}>
      {children}
    </div>
  );
}
