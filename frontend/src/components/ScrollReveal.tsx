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
 * Uses native CSS Scroll-Driven Animations when supported, and cleanly falls
 * back to IntersectionObserver on older browsers without hiding SSR/hero content.
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

    const supportsScrollDriven =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports(
        "(animation-timeline: view()) and (animation-range: entry)"
      );
    if (supportsScrollDriven) return;

    // Only stage elements that currently start below the fold so LCP & above-the-fold stay instant.
    const rect = el.getBoundingClientRect();
    if (rect.top <= window.innerHeight * 0.96) return;

    el.classList.add("vidqr-reveal-pending");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight * 0.96) {
            el.classList.remove("vidqr-reveal-pending");
            el.classList.add("vidqr-reveal-visible");
            observer.unobserve(el);
            break;
          }
        }
      },
      {
        threshold: 0.04,
        rootMargin: "0px 0px -4% 0px",
      }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      el.classList.remove("vidqr-reveal-pending");
    };
  }, []);

  const revealStyle =
    delayMs > 0
      ? ({ "--vidqr-reveal-delay": `${delayMs}ms` } as CSSProperties)
      : undefined;

  const variantClass = variant === "footer" ? "vidqr-reveal--footer" : "";

  return (
    <div
      ref={ref}
      style={revealStyle}
      className={`vidqr-reveal ${variantClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
