"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, MessageSquareHeart, Send } from "lucide-react";
import { submitFeedback, type FeedbackCategory } from "@/lib/api";

const CATEGORIES: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "feature", label: "Đề xuất tính năng" },
  { value: "ui", label: "Khung QR & Giao diện" },
  { value: "bug", label: "Báo lỗi" },
  { value: "other", label: "Góp ý khác" },
];

export function FeedbackSection() {
  const [category, setCategory] = useState<FeedbackCategory>("feature");
  const [message, setMessage] = useState("");
  const [senderName, setSenderName] = useState("");
  const [contact, setContact] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const headingId = useId();
  const messageId = useId();
  const messageHintId = useId();
  const nameId = useId();
  const contactId = useId();
  const honeypotId = useId();
  const messageRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = message.trim();
    if (cleaned.length < 5) {
      setErrorMsg("Vui lòng nhập nội dung góp ý tối thiểu 5 ký tự.");
      setSuccessMsg("");
      messageRef.current?.focus();
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await submitFeedback({
        category,
        message: cleaned,
        sender_name: senderName.trim() || undefined,
        contact: contact.trim() || undefined,
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
        website: honeypot || undefined,
      });
      setSuccessMsg(res.message);
      setMessage("");
      setSenderName("");
      setContact("");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Gửi góp ý thất bại, vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="feedback-section"
      aria-labelledby={headingId}
      className="mt-8 sm:mt-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111520] p-4 sm:p-7 shadow-sm scroll-mt-20"
    >
      <div className="max-w-3xl space-y-5">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/70 dark:border-indigo-800/70">
            <MessageSquareHeart className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg sm:text-xl font-bold tracking-tight">
              Góp ý &amp; Đề xuất nâng cấp TiaQR
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
              Bạn muốn thêm khung QR chủ đề mới, font chữ hay gặp lỗi ở bước nào? Gửi trực tiếp để quản trị viên nhận ngay qua Telegram.
            </p>
          </div>
        </div>

        <form method="POST" aria-labelledby={headingId} onSubmit={handleSubmit} className="space-y-4">
          {/* Honeypot field hidden from human users & assistive tech */}
          <div className="visually-hidden" aria-hidden="true">
            <label htmlFor={honeypotId}>Website</label>
            <input
              id={honeypotId}
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Loại góp ý
            </legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((opt) => {
                const selected = category === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold cursor-pointer transition-colors ${
                      selected
                        ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-600"
                        : "border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={opt.value}
                      checked={selected}
                      onChange={() => setCategory(opt.value)}
                      className="size-4 accent-indigo-600 shrink-0"
                    />
                    <span className="leading-snug">{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor={messageId} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nội dung góp ý <span className="text-rose-500" aria-hidden="true">*</span>
              </label>
              <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                {message.trim().length}/1500
              </span>
            </div>
            <textarea
              ref={messageRef}
              id={messageId}
              name="message"
              required
              minLength={5}
              maxLength={1500}
              rows={4}
              value={message}
              aria-describedby={messageHintId}
              aria-invalid={Boolean(errorMsg) || undefined}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errorMsg) setErrorMsg("");
              }}
              placeholder="Ví dụ: Mong muốn thêm khung QR chủ đề Sinh nhật / Cưới hỏi, hoặc góp ý về tốc độ tải video..."
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm resize-y"
            />
            <p id={messageHintId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tối thiểu 5 ký tự, tối đa 1.500 ký tự.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor={nameId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Tên của bạn (tùy chọn)
              </label>
              <input
                id={nameId}
                name="sender_name"
                type="text"
                maxLength={80}
                autoComplete="name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor={contactId}
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Telegram / Email / SĐT nhận phản hồi (tùy chọn)
              </label>
              <input
                id={contactId}
                name="contact"
                type="text"
                maxLength={120}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="send"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="VD: @username hoặc email@domain.com"
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm"
              />
            </div>
          </div>

          <div role="status" aria-live="polite" className="min-h-[1rem]">
            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/50 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
                <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tin nhắn được chuyển trực tiếp về bot Telegram của quản trị viên.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors cursor-pointer shrink-0"
            >
              <Send className="size-4 shrink-0" aria-hidden="true" />
              {submitting ? "Đang gửi góp ý..." : "Gửi góp ý ngay"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
