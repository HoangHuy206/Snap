import {
  CheckCircle2,
  DownloadCloud,
  HelpCircle,
  Layers,
  QrCode,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { VIDQR_FAQ_ITEMS, VIDQR_HOWTO_STEPS } from "@/lib/seo-content";
import { getSiteUrl, SITE_INFO } from "@/lib/site";

export function SeoGeoSection() {
  const siteUrl = getSiteUrl();

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "HowTo",
        "@id": `${siteUrl}/#howto`,
        name: "Cách tạo mã QR Động cho Video & Tệp tin hoặc tải Video MXH không logo trên VidQR",
        description: SITE_INFO.description,
        inLanguage: "vi",
        totalTime: "PT1M",
        step: VIDQR_HOWTO_STEPS.map((item) => ({
          "@type": "HowToStep",
          position: item.step,
          name: item.title,
          text: item.description,
        })),
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        inLanguage: "vi",
        mainEntity: VIDQR_FAQ_ITEMS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <section
      id="vidqr-guide"
      aria-labelledby="vidqr-guide-heading"
      className="mt-10 sm:mt-14 space-y-8 sm:space-y-10"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Section Intro */}
      <ScrollReveal>
        <div className="text-center max-w-3xl mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/70 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Hướng dẫn &amp; Giới thiệu VidQR Studio</span>
          </div>
          <h2
            id="vidqr-guide-heading"
            className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white"
          >
            Tạo QR Video Động &amp; Tải Video MXH Với VidQR Studio Trong 3 Bước
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
            Công cụ xử lý trực tiếp trên trình duyệt — không cần cài phần mềm, không cần tạo tài khoản và giữ nguyên chất lượng gốc.
          </p>
        </div>
      </ScrollReveal>

      {/* Brand Showcase Card for Google Images & Visual Clarity */}
      <ScrollReveal>
        <figure className="max-w-2xl mx-auto overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/vidqr-studio-banner.png"
            alt="VidQR Studio — Tạo QR Video & File Động, Tải Video TikTok YouTube Reels Facebook Không Logo"
            width={1200}
            height={630}
            loading="lazy"
            className="w-full h-auto block object-cover"
          />
          <figcaption className="px-4 py-2.5 text-center text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 border-t border-slate-200/80 dark:border-slate-800/80">
            VidQR Studio — Tạo mã QR Động cho Video &amp; File và tải media mạng xã hội không dính logo
          </figcaption>
        </figure>
      </ScrollReveal>

      {/* 3-Step HowTo Cards */}
      <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 list-none p-0 m-0">
        {VIDQR_HOWTO_STEPS.map((item, idx) => (
          <li key={item.step} className="h-full">
            <ScrollReveal delayMs={idx * 70} className="h-full">
              <article className="h-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 p-5 shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white text-sm font-bold shadow-xs">
                    {item.step}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </article>
            </ScrollReveal>
          </li>
        ))}
      </ol>

      {/* Spec Summary Cards (Structured facts for humans & AI search engines) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <ScrollReveal>
          <article className="h-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 p-5 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                <QrCode className="size-4.5" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thông số Studio Tạo Mã QR Động (Dynamic QR)
              </h3>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Định dạng tệp hỗ trợ:</strong> Video (MP4, MOV, WebM), Hình ảnh HD (PNG, JPG, WebP), PDF, Tài liệu, Audio (MP3, WAV) và file ZIP tối đa 200 MB.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Đổi tệp giữ nguyên mã QR:</strong> Cập nhật video/tài liệu mới qua link quản lý riêng mà không phải in lại mã QR cũ.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Thiết kế &amp; xuất file:</strong> Gắn logo giữa tâm, phối màu Gradient, khung chủ đề tiếng Việt và xuất PNG HD / Vector SVG chuẩn in ấn.
                </span>
              </li>
            </ul>
          </article>
        </ScrollReveal>

        <ScrollReveal delayMs={80}>
          <article className="h-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/75 p-5 sm:p-6 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400">
                <DownloadCloud className="size-4.5" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Tải Video &amp; Ảnh Mạng Xã Hội Không Logo
              </h3>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <Layers className="size-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Nền tảng tích hợp:</strong> TikTok, Douyin, YouTube &amp; YouTube Shorts, Instagram Reels, Facebook và X (Twitter).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Thao tác nhanh 1 chạm:</strong> Nút Dán liên kết từ bộ nhớ tạm, chọn chất lượng Video/Audio gốc hoặc biến ngay thành mã QR chia sẻ.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" aria-hidden="true" />
                <span>
                  <strong>Quyền riêng tư:</strong> Không yêu cầu đăng nhập; mọi trang xem tệp (/v/) và quản lý (/manage/) đều có chỉ thị noindex ẩn khỏi Google.
                </span>
              </li>
            </ul>
          </article>
        </ScrollReveal>
      </div>

      {/* Visible FAQ Grid */}
      <div className="space-y-4">
        <ScrollReveal>
          <div className="flex items-center gap-2">
            <HelpCircle className="size-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Câu hỏi thường gặp về VidQR
            </h3>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
          {VIDQR_FAQ_ITEMS.map((faq, idx) => (
            <ScrollReveal key={faq.question} delayMs={(idx % 2) * 60} className="h-full">
              <article className="h-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/85 dark:bg-slate-900/70 p-4 sm:p-5 shadow-xs space-y-2">
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                  {faq.question}
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
