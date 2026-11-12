"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bold,
  CheckCircle2,
  Download,
  Frame,
  ImagePlus,
  Italic,
  Palette,
  QrCode,
  RefreshCw,
  Save,
  Shapes,
  Sparkles,
  Type,
} from "lucide-react";
import type QRCodeStylingType from "qr-code-styling";
import type {
  QrDesignConfig,
  QrFrameBorderStyle,
  QrFrameFont,
  QrFrameIcon,
  QrFrameRadius,
  QrFrameStyle,
  QrFrameThickness,
} from "@/lib/api";
import { renderQrCardBlob } from "@/lib/qr-card-export";
import {
  DECORATIVE_FRAME_STYLES,
  getDecorativeFrameLayout,
} from "@/lib/qr-decorative-frames";
import {
  QR_PRESETS,
  buildBuiltinLogoSvgDataUrl,
  getFontCssValue,
  getQrContrastRatio,
  resolveQrConfig,
} from "@/lib/qr-presets";
import { QrFramePreview } from "./QrFramePreview";

interface QrCustomizerProps {
  qrValue: string;
  config: QrDesignConfig;
  onChange: (next: QrDesignConfig) => void;
  isLiveLinked: boolean;
  hasSelectedFile?: boolean;
  creating?: boolean;
  createProgress?: number;
  onCreateQr?: () => void;
  onSaveConfigToServer?: () => Promise<void>;
  savingConfig?: boolean;
}

type StudioSection = "frame" | "style" | "color";

const DOT_OPTIONS: Array<{ value: QrDesignConfig["dotsType"]; label: string }> = [
  { value: "rounded", label: "Bo tròn" },
  { value: "dots", label: "Chấm tròn" },
  { value: "extra-rounded", label: "Mềm mại" },
  { value: "classy", label: "Cổ điển" },
  { value: "classy-rounded", label: "Thanh lịch" },
  { value: "square", label: "Vuông nét" },
];

const CORNER_OPTIONS: Array<{ value: QrDesignConfig["cornersSquareType"]; label: string }> = [
  { value: "extra-rounded", label: "Góc bo tròn" },
  { value: "dot", label: "Mắt tròn" },
  { value: "square", label: "Vuông góc" },
];

const LOGO_MODES: Array<{ value: QrDesignConfig["logoMode"]; label: string }> = [
  { value: "none", label: "Không logo" },
  { value: "video", label: "Play Video" },
  { value: "file", label: "Tệp tin" },
  { value: "music", label: "Âm nhạc" },
  { value: "spark", label: "Ngôi sao" },
  { value: "bow", label: "Nơ hồng" },
  { value: "flower", label: "Hoa đào" },
  { value: "heart", label: "Trái tim" },
  { value: "crown", label: "Vương miện" },
];

const THEME_FRAME_STYLES: Array<{
  value: QrFrameStyle;
  label: string;
  desc: string;
  defaults?: Partial<QrDesignConfig>;
}> = [
  {
    value: "floral-blossom",
    label: "Hoa Anh Đào",
    desc: "Màu nước hoa lá",
    defaults: {
      fgColor: "#9d174d",
      fgColorSecondary: "#ec4899",
      bgColor: "#ffffff",
      logoMode: "flower",
      frameColor: "#db2777",
      frameColorSecondary: "#f472b6",
      frameTextColor: "#881337",
      frameLabel: "Quét để xem ngay",
      frameSublabel: "",
      frameIcon: "heart",
      frameFont: "script",
    },
  },
  {
    value: "vintage-filigree",
    label: "Hoa Văn Cổ Điển",
    desc: "Vàng kim hoàng gia",
    defaults: {
      fgColor: "#78350f",
      fgColorSecondary: "#b45309",
      bgColor: "#ffffff",
      logoMode: "crown",
      frameColor: "#b45309",
      frameColorSecondary: "#eab308",
      frameTextColor: "#78350f",
      frameLabel: "Quét Mã Tại Đây",
      frameSublabel: "",
      frameIcon: "spark",
      frameFont: "serif",
    },
  },
  {
    value: "kawaii-kitty",
    label: "Kawaii Tai Mèo",
    desc: "Tai mèo & nơ hồng",
    defaults: {
      fgColor: "#db2777",
      fgColorSecondary: "#f43f5e",
      bgColor: "#ffffff",
      logoMode: "bow",
      frameColor: "#ec4899",
      frameColorSecondary: "#fb7185",
      frameTextColor: "#ffffff",
      frameLabel: "Quét dễ thương",
      frameSublabel: "",
      frameIcon: "heart",
      frameFont: "cute",
    },
  },
  {
    value: "anime-manga",
    label: "Anime / Manga",
    desc: "Ánh sáng & anh đào",
    defaults: {
      fgColor: "#4f46e5",
      fgColorSecondary: "#06b6d4",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameColor: "#6366f1",
      frameColorSecondary: "#06b6d4",
      frameTextColor: "#ffffff",
      frameLabel: "MỞ VIDEO NGAY!",
      frameSublabel: "",
      frameIcon: "play",
      frameFont: "cute",
    },
  },
  {
    value: "teachers-day-2011",
    label: "Nhà Giáo 20/11",
    desc: "Bảng xanh & hoa tri ân",
    defaults: {
      fgColor: "#14532d",
      fgColorSecondary: "#b45309",
      bgColor: "#ffffff",
      logoMode: "flower",
      frameColor: "#14532d",
      frameColorSecondary: "#dc2626",
      frameTextColor: "#ffffff",
      frameLabel: "Tri ân Thầy Cô 20/11",
      frameSublabel: "CHÚC MỪNG NGÀY NHÀ GIÁO VIỆT NAM",
      frameIcon: "heart",
      frameFont: "script",
    },
  },
  {
    value: "tet-holiday",
    label: "Tết Hoa Mai",
    desc: "Đèn lồng & mai vàng",
    defaults: {
      fgColor: "#991b1b",
      fgColorSecondary: "#d97706",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameColor: "#b91c1c",
      frameColorSecondary: "#f59e0b",
      frameTextColor: "#7c2d12",
      frameLabel: "Chúc Mừng Năm Mới",
      frameSublabel: "",
      frameIcon: "spark",
      frameFont: "script",
    },
  },
  {
    value: "christmas-festive",
    label: "Giáng Sinh Noel",
    desc: "Lá thông & chuông vàng",
    defaults: {
      fgColor: "#14532d",
      fgColorSecondary: "#dc2626",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameColor: "#166534",
      frameColorSecondary: "#dc2626",
      frameTextColor: "#ffffff",
      frameLabel: "Merry Christmas!",
      frameSublabel: "",
      frameIcon: "spark",
      frameFont: "script",
    },
  },
  {
    value: "custom-overlay",
    label: "Tải Khung Riêng",
    desc: "PNG/JPG từ máy bạn",
    defaults: {
      frameTextColor: "#ffffff",
      frameLabel: "Quét để xem ngay",
      frameSublabel: "",
    },
  },
];

const FRAME_STYLES: Array<{ value: QrFrameStyle; label: string; desc: string }> = [
  { value: "gradient-glow", label: "Viền Neon", desc: "Gradient phát sáng" },
  { value: "classic-pill", label: "Thẻ Bo Viền", desc: "Cổ điển gọn gàng" },
  { value: "viewfinder", label: "Góc Camera", desc: "4 góc ngắm Scan" },
  { value: "ribbon-top", label: "Nhãn Đỉnh", desc: "Dải huy hiệu trên" },
  { value: "polaroid-ticket", label: "Vé / Polaroid", desc: "Rãnh vé + nét đứt" },
  { value: "phone-mockup", label: "Điện Thoại", desc: "Khung Smartphone" },
  { value: "double-ornate", label: "Khung Kép", desc: "Viền đôi sang trọng" },
  { value: "none", label: "Không Khung", desc: "Chỉ mã QR thuần" },
];

const BORDER_STYLES: Array<{ value: QrFrameBorderStyle; label: string }> = [
  { value: "solid", label: "Nét liền" },
  { value: "dashed", label: "Nét đứt" },
  { value: "double", label: "Viền kép" },
];

const THICKNESS_OPTIONS: Array<{ value: QrFrameThickness; label: string }> = [
  { value: "thin", label: "Mỏng" },
  { value: "medium", label: "Vừa" },
  { value: "thick", label: "Dày" },
];

const RADIUS_OPTIONS: Array<{ value: QrFrameRadius; label: string }> = [
  { value: "sharp", label: "Vuông nhẹ" },
  { value: "rounded", label: "Bo tròn" },
  { value: "pill", label: "Siêu bo" },
];

const FRAME_ICONS: Array<{ value: QrFrameIcon; label: string }> = [
  { value: "scan", label: "Quét QR" },
  { value: "play", label: "Play" },
  { value: "download", label: "Tải về" },
  { value: "spark", label: "Ngôi sao" },
  { value: "heart", label: "Trái tim" },
  { value: "none", label: "Không icon" },
];

const FRAME_FONTS: Array<{ value: QrFrameFont; label: string; sample: string }> = [
  { value: "sans", label: "Hiện đại", sample: "Quét Ngay" },
  { value: "script", label: "Viết tay", sample: "Tri ân 20/11" },
  { value: "charm", label: "Thư pháp", sample: "Chúc Tết" },
  { value: "greatvibes", label: "Hoàng gia", sample: "Hoa Hồng" },
  { value: "serif", label: "Cổ điển", sample: "Cổ Điển" },
  { value: "cute", label: "Kawaii tròn", sample: "Dễ thương" },
  { value: "pacifico", label: "Cọ Retro", sample: "Vui Tết" },
  { value: "poster", label: "Poster đậm", sample: "MỞ VIDEO" },
];

function FrameMiniDiagram({ style }: { style: QrFrameStyle }) {
  const layout = getDecorativeFrameLayout(style);
  if (layout) {
    return (
      <div className="w-9 h-12 rounded-md border border-slate-300 dark:border-slate-700 overflow-clip shrink-0 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={layout.imageUrl} alt="" aria-hidden="true" className="size-full object-cover block" />
      </div>
    );
  }

  const base = "w-9 h-10 rounded-md border flex flex-col items-center justify-center p-1 relative shrink-0";
  switch (style) {
    case "none":
      return (
        <div className={`${base} border-dashed border-slate-400/70`}>
          <div className="size-5 rounded-sm bg-current opacity-25" />
        </div>
      );
    case "gradient-glow":
      return (
        <div className={`${base} border-2 border-indigo-500 shadow-sm shadow-indigo-500/40`}>
          <div className="size-4 rounded-sm bg-current opacity-30" />
          <div className="mt-1 h-1.5 w-6 rounded-full bg-indigo-500" />
        </div>
      );
    case "viewfinder":
      return (
        <div className={`${base} border-slate-300/60 dark:border-slate-700`}>
          <span className="absolute top-1 left-1 size-1.5 border-t-2 border-l-2 border-emerald-500" />
          <span className="absolute top-1 right-1 size-1.5 border-t-2 border-r-2 border-emerald-500" />
          <span className="absolute bottom-2.5 left-1 size-1.5 border-b-2 border-l-2 border-emerald-500" />
          <span className="absolute bottom-2.5 right-1 size-1.5 border-b-2 border-r-2 border-emerald-500" />
          <div className="size-3.5 rounded-sm bg-current opacity-25 mb-1" />
          <div className="h-1.5 w-6 rounded-full bg-emerald-500" />
        </div>
      );
    case "ribbon-top":
      return (
        <div className={`${base} border-rose-500 pt-2`}>
          <div className="absolute -top-1 h-2 w-7 rounded-full bg-rose-500" />
          <div className="size-5 rounded-sm bg-current opacity-30" />
        </div>
      );
    case "polaroid-ticket":
      return (
        <div className={`${base} border-violet-500 justify-between py-1`}>
          <div className="size-4 rounded-sm bg-current opacity-30" />
          <div className="w-full border-t border-dashed border-violet-400" />
          <div className="h-1.5 w-6 rounded bg-violet-500" />
        </div>
      );
    case "phone-mockup":
      return (
        <div className={`${base} border-2 border-slate-700 dark:border-slate-300 rounded-lg justify-between py-1`}>
          <div className="h-0.5 w-3 rounded-full bg-current opacity-60" />
          <div className="size-4 rounded-sm bg-current opacity-30" />
          <div className="h-1.5 w-5 rounded-full bg-current opacity-70" />
        </div>
      );
    case "double-ornate":
      return (
        <div className={`${base} border-[3px] border-double border-amber-500`}>
          <div className="size-4 rounded-sm bg-current opacity-30" />
          <div className="mt-1 h-1.5 w-6 rounded-sm bg-amber-500" />
        </div>
      );
    case "custom-overlay":
      return (
        <div className={`${base} border-2 border-dashed border-sky-500`}>
          <ImagePlus className="size-4 text-sky-500" aria-hidden="true" />
        </div>
      );
    case "classic-pill":
    default:
      return (
        <div className={`${base} border-2 border-pink-500`}>
          <div className="size-4 rounded-sm bg-current opacity-30" />
          <div className="mt-1 h-1.5 w-6 rounded-full bg-pink-500" />
        </div>
      );
  }
}

export function QrCustomizer({
  qrValue,
  config: rawConfig,
  onChange,
  isLiveLinked,
  hasSelectedFile = false,
  creating = false,
  createProgress = 0,
  onCreateQr,
  onSaveConfigToServer,
  savingConfig,
}: QrCustomizerProps) {
  const config = useMemo(() => resolveQrConfig(rawConfig), [rawConfig]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<QRCodeStylingType | null>(null);
  const [section, setSection] = useState<StudioSection>("frame");
  const [exporting, setExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  const logoInputId = useId();
  const customFrameInputId = useId();
  const customScaleId = useId();
  const customOffsetId = useId();
  const frameLabelId = useId();
  const frameSublabelId = useId();
  const fgColorId = useId();
  const fgSecondaryId = useId();
  const bgColorId = useId();
  const frameColorId = useId();
  const frameColorSecId = useId();
  const frameTextColorId = useId();
  const tabFrameId = useId();
  const tabStyleId = useId();
  const tabColorId = useId();

  const effectiveLogo = useMemo(() => {
    if (config.logoMode === "custom") {
      return config.customLogoDataUrl;
    }
    return buildBuiltinLogoSvgDataUrl(config.logoMode, config.fgColor);
  }, [config.logoMode, config.customLogoDataUrl, config.fgColor]);

  const contrastRatio = useMemo(
    () => getQrContrastRatio(config.fgColor, config.bgColor),
    [config.fgColor, config.bgColor],
  );

  // Only QR-module options live here so changing frames never re-renders the QR matrix unnecessarily
  const buildOptions = useMemo(() => {
    const rad = (config.gradientDirection * Math.PI) / 180;
    const dotsColorOption = config.useGradient
      ? {
          gradient: {
            type: "linear" as const,
            rotation: rad,
            colorStops: [
              { offset: 0, color: config.fgColor },
              { offset: 1, color: config.fgColorSecondary },
            ],
          },
        }
      : { color: config.fgColor };

    return {
      width: 248,
      height: 248,
      type: "canvas" as const,
      data: qrValue,
      margin: 8,
      qrOptions: {
        errorCorrectionLevel: config.errorCorrectionLevel,
      },
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: config.logoSize,
        margin: 6,
        crossOrigin: "anonymous" as const,
        saveAsBlob: false,
      },
      image: effectiveLogo,
      dotsOptions: {
        type: config.dotsType,
        ...dotsColorOption,
      },
      cornersSquareOptions: {
        type: config.cornersSquareType,
        ...dotsColorOption,
      },
      cornersDotOptions: {
        type: config.cornersDotType,
        ...dotsColorOption,
      },
      backgroundOptions: {
        color: config.bgColor,
      },
    };
  }, [
    qrValue,
    effectiveLogo,
    config.gradientDirection,
    config.useGradient,
    config.fgColor,
    config.fgColorSecondary,
    config.errorCorrectionLevel,
    config.logoSize,
    config.dotsType,
    config.cornersSquareType,
    config.cornersDotType,
    config.bgColor,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      if (cancelled || !containerRef.current) return;
      if (!qrRef.current) {
        const instance = new QRCodeStyling(buildOptions);
        qrRef.current = instance;
        containerRef.current.innerHTML = "";
        instance.append(containerRef.current);
      } else {
        qrRef.current.update(buildOptions);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [buildOptions]);

  const handleCustomLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setStatusMessage("Logo vượt quá 2MB, vui lòng chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onChange({
          ...config,
          logoMode: "custom",
          customLogoDataUrl: reader.result,
          errorCorrectionLevel: "H",
        });
        setStatusMessage("Đã gắn logo vào giữa mã QR.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomFrameUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      setStatusMessage("Ảnh khung vượt quá 6MB, vui lòng chọn ảnh nhỏ hơn.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const img = new Image();
      img.onload = () => {
        // Resize cleanly onto a transparent PNG canvas max 1200px so it stays sharp and lightweight
        const maxDim = 1200;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedDataUrl = canvas.toDataURL("image/png");
        onChange({
          ...config,
          presetId: "custom",
          frameEnabled: true,
          frameStyle: "custom-overlay",
          customFrameDataUrl: compressedDataUrl,
        });
        setStatusMessage("Đã tải khung viền riêng! Bạn có thể chỉnh kích thước & vị trí QR bên dưới.");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadPng = async () => {
    if (!isLiveLinked || !qrRef.current) return;
    setExporting(true);
    setStatusMessage("");
    try {
      const { default: QRCodeStyling } = await import("qr-code-styling");
      const hiResQr = new QRCodeStyling({
        ...buildOptions,
        width: 840,
        height: 840,
        margin: 24,
      });

      const raw = await hiResQr.getRawData("png");
      if (!raw) throw new Error("Không thể tạo ảnh PNG.");
      const qrBlob =
        raw instanceof Blob ? raw : new Blob([new Uint8Array(raw)], { type: "image/png" });

      const finalBlob = await renderQrCardBlob(qrBlob, config);
      const outUrl = URL.createObjectURL(finalBlob);
      const link = document.createElement("a");
      link.href = outUrl;
      link.download =
        config.frameEnabled && config.frameStyle !== "none" ? "vidqr-card.png" : "vidqr-code.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(outUrl), 1500);
      setStatusMessage(
        config.frameEnabled && config.frameStyle !== "none"
          ? "Đã tải xuống thẻ QR kèm khung viền sắc nét."
          : "Đã tải xuống mã QR PNG độ phân giải cao.",
      );
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : "Xuất ảnh thất bại.");
    } finally {
      setExporting(false);
    }
  };

  const isDecorativeFrame = DECORATIVE_FRAME_STYLES.has(config.frameStyle);
  const isCustomFrame = config.frameStyle === "custom-overlay";

  const showBorderCustomization =
    config.frameEnabled &&
    !isDecorativeFrame &&
    !isCustomFrame &&
    config.frameStyle !== "none" &&
    config.frameStyle !== "viewfinder" &&
    config.frameStyle !== "phone-mockup";

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-5 items-start">
      {/* Left: Sticky Live QR Preview & Export */}
      <div className="md:col-span-5 md:sticky md:top-16 flex flex-col items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3 sm:p-4">
        <div className="flex w-full items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Sparkles className="size-3.5 text-indigo-500" aria-hidden="true" />
            Xem trước QR
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isLiveLinked
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
            }`}
          >
            {isLiveLinked ? "Đã gắn link thật" : "Bản xem trước mẫu"}
          </span>
        </div>

        {/* Framed QR Card */}
        <QrFramePreview config={config}>
          <div ref={containerRef} />
        </QrFramePreview>

        {/* Contrast indicator */}
        {contrastRatio < 3.0 ? (
          <div
            role="status"
            className="w-full flex items-start gap-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200"
          >
            <AlertTriangle className="size-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Độ tương phản thấp ({contrastRatio.toFixed(1)}:1). Nên chọn màu mã đậm hơn nền để điện thoại quét nhạy.
            </span>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
            <span>Độ tương phản chuẩn ({contrastRatio.toFixed(1)}:1) • Dễ quét trên mọi camera</span>
          </div>
        )}

        {/* Action buttons: Create QR (left) & Save PNG (right, locked until QR is created) */}
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {isLiveLinked ? (
            <button
              type="button"
              disabled
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600/90 text-white px-4 py-2.5 text-sm font-semibold shadow-sm cursor-default"
            >
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Đã tạo QR
            </button>
          ) : (
            <button
              type="button"
              disabled={creating}
              onClick={onCreateQr}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors cursor-pointer"
            >
              {creating ? (
                <>
                  <RefreshCw className="size-4 animate-spin" aria-hidden="true" />
                  Đang tạo QR ({createProgress}%)...
                </>
              ) : (
                <>
                  <QrCode className="size-4" aria-hidden="true" />
                  Tạo QR Ngay
                </>
              )}
            </button>
          )}
          <button
            type="button"
            disabled={!isLiveLinked || exporting}
            onClick={handleDownloadPng}
            title={!isLiveLinked ? "Hãy bấm Tạo QR Ngay trước khi lưu PNG" : undefined}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-slate-800 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Download className="size-4" aria-hidden="true" />
            {exporting ? "Đang lưu..." : "Lưu PNG"}
          </button>
        </div>

        {!isLiveLinked && (
          <p className="w-full text-center text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
            {hasSelectedFile
              ? "Đã sẵn sàng tệp! Bấm Tạo QR Ngay để tạo mã và mở khóa Lưu PNG."
              : "Chọn Video / Ảnh / Tệp ở Bước 1 trước, rồi bấm Tạo QR Ngay để mở khóa Lưu PNG."}
          </p>
        )}

        {isLiveLinked && onSaveConfigToServer && (
          <button
            type="button"
            disabled={savingConfig}
            onClick={onSaveConfigToServer}
            className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-4 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors cursor-pointer"
          >
            <Save className="size-4" aria-hidden="true" />
            {savingConfig ? "Đang lưu giao diện QR..." : "Lưu kiểu QR này vào link quản lý"}
          </button>
        )}

        <div role="status" aria-live="polite" className="min-h-[1.25rem] text-xs text-center text-slate-600 dark:text-slate-400">
          {statusMessage}
        </div>
      </div>

      {/* Right: Organized Studio Controls */}
      <div className="md:col-span-7 space-y-4 min-w-0">
        {/* Quick Presets always visible at top */}
        <fieldset className="space-y-2 min-w-0">
          <legend className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="size-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            Bộ mẫu thiết kế đẹp có sẵn (1-click)
          </legend>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 snap-x">
            {QR_PRESETS.map((preset) => {
              const active = config.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...preset.config,
                      customLogoDataUrl: config.customLogoDataUrl,
                    })
                  }
                  className={`inline-flex shrink-0 snap-start whitespace-nowrap min-h-[36px] items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-600"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full border border-black/15 shrink-0"
                    style={{ background: preset.previewGradient }}
                    aria-hidden="true"
                  />
                  {preset.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Section Tabs */}
        <div
          role="tablist"
          aria-label="Nhóm tùy chỉnh QR"
          className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70 p-1"
        >
          <button
            id={tabFrameId}
            type="button"
            role="tab"
            aria-selected={section === "frame"}
            onClick={() => setSection("frame")}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-lg border-b-2 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors ${
              section === "frame"
                ? "border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Frame className="size-3.5 sm:size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Khung &amp; Chữ</span>
          </button>

          <button
            id={tabStyleId}
            type="button"
            role="tab"
            aria-selected={section === "style"}
            onClick={() => setSection("style")}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-lg border-b-2 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors ${
              section === "style"
                ? "border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Shapes className="size-3.5 sm:size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Chấm &amp; Góc</span>
          </button>

          <button
            id={tabColorId}
            type="button"
            role="tab"
            aria-selected={section === "color"}
            onClick={() => setSection("color")}
            className={`inline-flex min-h-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-lg border-b-2 px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold cursor-pointer transition-colors ${
              section === "color"
                ? "border-indigo-600 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm"
                : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Palette className="size-3.5 sm:size-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Màu &amp; Logo</span>
          </button>
        </div>

        {/* Section 1: Frame & Border Studio */}
        <div role="tabpanel" aria-labelledby={tabFrameId} hidden={section !== "frame"}>
          <div className="space-y-4">
            {/* Group A: Artistic & Theme Frames */}
            <fieldset className="space-y-2">
              <legend className="text-xs sm:text-sm font-semibold">
                Khung Nghệ Thuật &amp; Chủ Đề (Hoa lá, Cổ điển, Anime, 20/11...)
              </legend>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {THEME_FRAME_STYLES.map((item) => {
                  const active = config.frameEnabled && config.frameStyle === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...config,
                          frameFontBold: true,
                          frameFontItalic: false,
                          frameFontScale: 1,
                          frameSublabelMatchFont: false,
                          ...(item.defaults || {}),
                          presetId: "custom",
                          frameEnabled: true,
                          frameStyle: item.value,
                        })
                      }
                      className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all cursor-pointer min-h-[52px] ${
                        active
                          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-1 ring-indigo-600"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <FrameMiniDiagram style={item.value} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-snug">{item.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Custom Uploaded Frame Controls */}
            {config.frameEnabled && isCustomFrame && (
              <div className="rounded-xl border border-sky-300 dark:border-sky-800/80 bg-sky-50/60 dark:bg-sky-950/25 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold">Khung viền PNG/JPG của riêng bạn</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Tải khung hoa lá / thiệp từ Canva, Pngtree hoặc Pinterest để lồng mã QR vào giữa.
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      id={customFrameInputId}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCustomFrameUpload}
                      className="visually-hidden"
                    />
                    <label
                      htmlFor={customFrameInputId}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-3.5 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      <ImagePlus className="size-4" aria-hidden="true" />
                      {config.customFrameDataUrl ? "Đổi ảnh khung" : "Tải ảnh khung lên"}
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label htmlFor={customScaleId} className="flex justify-between text-xs font-medium">
                      <span>Kích thước QR trong khung</span>
                      <span className="font-mono">{Math.round((config.customFrameQrScale ?? 0.64) * 100)}%</span>
                    </label>
                    <input
                      id={customScaleId}
                      type="range"
                      min={45}
                      max={88}
                      value={Math.round((config.customFrameQrScale ?? 0.64) * 100)}
                      onChange={(e) =>
                        onChange({ ...config, customFrameQrScale: Number(e.target.value) / 100 })
                      }
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor={customOffsetId} className="flex justify-between text-xs font-medium">
                      <span>Căn chỉnh lên / xuống</span>
                      <span className="font-mono">{config.customFrameQrOffsetY ?? 0}%</span>
                    </label>
                    <input
                      id={customOffsetId}
                      type="range"
                      min={-18}
                      max={18}
                      value={config.customFrameQrOffsetY ?? 0}
                      onChange={(e) =>
                        onChange({ ...config, customFrameQrOffsetY: Number(e.target.value) })
                      }
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={Boolean(config.customFrameShowLabel)}
                    onChange={(e) => onChange({ ...config, customFrameShowLabel: e.target.checked })}
                    className="size-4 rounded"
                  />
                  Hiển thị thêm thanh chữ kêu gọi quét ở đáy
                </label>
              </div>
            )}

            {/* Group B: Modern & Geometric Frames */}
            <fieldset className="space-y-2">
              <legend className="text-xs sm:text-sm font-semibold">Khung Hiện Đại &amp; Thẻ QR</legend>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {FRAME_STYLES.map((item) => {
                  const active =
                    item.value === "none"
                      ? !config.frameEnabled || config.frameStyle === "none"
                      : config.frameEnabled && config.frameStyle === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        const leavingThemeFrame =
                          DECORATIVE_FRAME_STYLES.has(config.frameStyle) ||
                          config.frameStyle === "custom-overlay";
                        const themeDefaultLabels = new Set(
                          THEME_FRAME_STYLES.map((t) => t.defaults?.frameLabel).filter(
                            (v): v is string => Boolean(v),
                          ),
                        );
                        onChange({
                          ...config,
                          presetId: "custom",
                          frameEnabled: item.value !== "none",
                          frameStyle: item.value,
                          ...(leavingThemeFrame
                            ? {
                                frameColor: "#4338ca",
                                frameColorSecondary: "#06b6d4",
                                frameTextColor: "#ffffff",
                                frameFont: "sans",
                                frameFontBold: true,
                                frameFontItalic: false,
                                frameFontScale: 1,
                                frameSublabelMatchFont: false,
                                frameIcon: "scan",
                                frameSublabel: "",
                                frameLabel: themeDefaultLabels.has(config.frameLabel)
                                  ? "Quét để xem ngay"
                                  : config.frameLabel,
                              }
                            : {}),
                        });
                      }}
                      className={`flex items-center gap-2.5 rounded-xl border p-2 text-left transition-all cursor-pointer min-h-[52px] ${
                        active
                          ? "border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 ring-1 ring-indigo-600"
                          : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <FrameMiniDiagram style={item.value} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-snug">{item.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-1">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {/* Detailed Frame & Border Controls */}
            {config.frameEnabled && config.frameStyle !== "none" && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 space-y-3">
                {/* Border style, thickness, radius (for geometric frames) */}
                {!isDecorativeFrame && !isCustomFrame && (
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
                    {showBorderCustomization && (
                      <div className="space-y-1">
                        <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Kiểu nét viền
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {BORDER_STYLES.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                onChange({ ...config, presetId: "custom", frameBorderStyle: opt.value })
                              }
                              className={`min-h-[34px] rounded-lg border px-1.5 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                                config.frameBorderStyle === opt.value
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {showBorderCustomization && (
                      <div className="space-y-1">
                        <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                          Độ dày viền
                        </span>
                        <div className="grid grid-cols-3 gap-1">
                          {THICKNESS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() =>
                                onChange({ ...config, presetId: "custom", frameThickness: opt.value })
                              }
                              className={`min-h-[34px] rounded-lg border px-1.5 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                                config.frameThickness === opt.value
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <span className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Bo góc khung
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {RADIUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() =>
                              onChange({ ...config, presetId: "custom", frameRadius: opt.value })
                            }
                            className={`min-h-[34px] rounded-lg border px-1.5 text-[11px] font-medium whitespace-nowrap cursor-pointer ${
                              config.frameRadius === opt.value
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Frame Colors & Shadow */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {isDecorativeFrame ? "Màu chữ & Hiệu ứng thẻ" : "Màu khung & Hiệu ứng thẻ"}
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                      {!isDecorativeFrame && (
                        <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={config.frameUseGradient}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameUseGradient: e.target.checked,
                              })
                            }
                            className="size-4 rounded"
                          />
                          Gradient khung
                        </label>
                      )}
                      <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.frameShadow}
                          onChange={(e) =>
                            onChange({ ...config, presetId: "custom", frameShadow: e.target.checked })
                          }
                          className="size-4 rounded"
                        />
                        Đổ bóng 3D
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {!isDecorativeFrame && (
                      <div className="space-y-1">
                        <label htmlFor={frameColorId} className="block text-xs text-slate-600 dark:text-slate-400">
                          Màu khung chính
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                          <input
                            id={frameColorId}
                            type="color"
                            value={config.frameColor}
                            onChange={(e) =>
                              onChange({ ...config, presetId: "custom", frameColor: e.target.value })
                            }
                            className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="font-mono text-xs">{config.frameColor}</span>
                        </div>
                      </div>
                    )}

                    {!isDecorativeFrame && config.frameUseGradient && (
                      <div className="space-y-1">
                        <label
                          htmlFor={frameColorSecId}
                          className="block text-xs text-slate-600 dark:text-slate-400"
                        >
                          Màu khung phụ
                        </label>
                        <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                          <input
                            id={frameColorSecId}
                            type="color"
                            value={config.frameColorSecondary}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameColorSecondary: e.target.value,
                              })
                            }
                            className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                          />
                          <span className="font-mono text-xs">{config.frameColorSecondary}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label
                        htmlFor={frameTextColorId}
                        className="block text-xs text-slate-600 dark:text-slate-400"
                      >
                        Màu chữ nhãn
                      </label>
                      <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                        <input
                          id={frameTextColorId}
                          type="color"
                          value={config.frameTextColor}
                          onChange={(e) =>
                            onChange({
                              ...config,
                              presetId: "custom",
                              frameTextColor: e.target.value,
                            })
                          }
                          className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                        />
                        <span className="font-mono text-xs">{config.frameTextColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Labels & Collapsible Font / Icon */}
                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label
                        htmlFor={frameLabelId}
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        Chữ kêu gọi quét (CTA)
                      </label>
                      <input
                        id={frameLabelId}
                        type="text"
                        maxLength={30}
                        value={config.frameLabel}
                        onChange={(e) => onChange({ ...config, frameLabel: e.target.value })}
                        placeholder="Quét để xem video"
                        className="w-full min-h-[38px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={frameSublabelId}
                        className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                      >
                        Dòng phụ dưới nhãn (tùy chọn)
                      </label>
                      <input
                        id={frameSublabelId}
                        type="text"
                        maxLength={36}
                        value={config.frameSublabel}
                        onChange={(e) => onChange({ ...config, frameSublabel: e.target.value })}
                        placeholder="VD: VIDEO HD • VIDQR"
                        className="w-full min-h-[38px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>

                  <details className="group rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2">
                    <summary className="cursor-pointer list-none flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 select-none">
                      <span className="inline-flex items-center gap-1.5">
                        <Type className="size-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
                        <span>
                          Font chữ, Cỡ chữ &amp; Biểu tượng CTA (
                          {FRAME_FONTS.find((f) => f.value === (config.frameFont || "sans"))?.label ?? "Hiện đại"})
                        </span>
                      </span>
                      <span className="text-indigo-500 transition-transform group-open:rotate-45 text-base leading-none shrink-0">
                        +
                      </span>
                    </summary>

                    <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Chọn kiểu chữ &amp; định dạng:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameFontBold: config.frameFontBold === false,
                              })
                            }
                            aria-pressed={config.frameFontBold !== false}
                            title="Chữ đậm"
                            className={`inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border text-xs font-bold cursor-pointer transition-colors ${
                              config.frameFontBold !== false
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            }`}
                          >
                            <Bold className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">In đậm</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameFontItalic: !config.frameFontItalic,
                              })
                            }
                            aria-pressed={Boolean(config.frameFontItalic)}
                            title="Chữ nghiêng"
                            className={`inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border text-xs cursor-pointer transition-colors ${
                              config.frameFontItalic
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            }`}
                          >
                            <Italic className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">In nghiêng</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {FRAME_FONTS.map((f) => {
                          const selected = (config.frameFont || "sans") === f.value;
                          return (
                            <button
                              key={f.value}
                              type="button"
                              onClick={() =>
                                onChange({ ...config, presetId: "custom", frameFont: f.value })
                              }
                              className={`flex flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center cursor-pointer transition-all min-h-[48px] ${
                                selected
                                  ? "border-indigo-600 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-200 ring-1 ring-indigo-600"
                                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span
                                className="text-xs sm:text-sm leading-tight truncate max-w-full"
                                style={{
                                  fontFamily: getFontCssValue(f.value),
                                  fontWeight: config.frameFontBold === false ? 400 : 700,
                                  fontStyle: config.frameFontItalic ? "italic" : "normal",
                                }}
                              >
                                {f.sample}
                              </span>
                              <span className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                {f.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
                        <label className="flex items-center gap-2 text-xs font-medium flex-1 min-w-[160px]">
                          <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            Cỡ chữ ({Math.round((config.frameFontScale ?? 1) * 100)}%)
                          </span>
                          <input
                            type="range"
                            min={75}
                            max={125}
                            step={5}
                            value={Math.round((config.frameFontScale ?? 1) * 100)}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameFontScale: Number(e.target.value) / 100,
                              })
                            }
                            className="w-full accent-indigo-600 cursor-pointer"
                          />
                        </label>
                        <label className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer text-slate-700 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={Boolean(config.frameSublabelMatchFont)}
                            onChange={(e) =>
                              onChange({
                                ...config,
                                presetId: "custom",
                                frameSublabelMatchFont: e.target.checked,
                              })
                            }
                            className="size-4 rounded"
                          />
                          Font cho dòng phụ
                        </label>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[11px] font-medium text-slate-600 dark:text-slate-400">
                          Biểu tượng trên nhãn CTA
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {FRAME_ICONS.map((ic) => (
                            <button
                              key={ic.value}
                              type="button"
                              onClick={() => onChange({ ...config, frameIcon: ic.value })}
                              className={`min-h-[34px] rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer ${
                                config.frameIcon === ic.value
                                  ? "border-indigo-600 bg-indigo-600 text-white"
                                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                              }`}
                            >
                              {ic.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Dots & Corner Styles */}
        <div role="tabpanel" aria-labelledby={tabStyleId} hidden={section !== "style"}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <fieldset className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 space-y-2">
              <legend className="text-xs sm:text-sm font-semibold px-1">Kiểu chấm QR</legend>
              <div className="grid grid-cols-2 gap-1.5">
                {DOT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onChange({ ...config, presetId: "custom", dotsType: opt.value })}
                    className={`min-h-[38px] rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      config.dotsType === opt.value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 space-y-2">
              <legend className="text-xs sm:text-sm font-semibold px-1">Kiểu mắt góc QR</legend>
              <div className="grid grid-cols-1 gap-1.5">
                {CORNER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        presetId: "custom",
                        cornersSquareType: opt.value,
                        cornersDotType: opt.value === "square" ? "square" : "dot",
                      })
                    }
                    className={`min-h-[38px] rounded-lg border px-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      config.cornersSquareType === opt.value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        {/* Section 3: Colors & Center Logo */}
        <div role="tabpanel" aria-labelledby={tabColorId} hidden={section !== "color"}>
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 sm:p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">Màu sắc &amp; Gradient mã QR</span>
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.useGradient}
                    onChange={(e) =>
                      onChange({ ...config, presetId: "custom", useGradient: e.target.checked })
                    }
                    className="size-4 rounded"
                  />
                  Dùng Gradient 2 màu
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label htmlFor={fgColorId} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Màu mã chính
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                    <input
                      id={fgColorId}
                      type="color"
                      value={config.fgColor}
                      onChange={(e) =>
                        onChange({ ...config, presetId: "custom", fgColor: e.target.value })
                      }
                      className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs">{config.fgColor}</span>
                  </div>
                </div>

                {config.useGradient && (
                  <div className="space-y-1">
                    <label
                      htmlFor={fgSecondaryId}
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      Màu chuyển tiếp
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                      <input
                        id={fgSecondaryId}
                        type="color"
                        value={config.fgColorSecondary}
                        onChange={(e) =>
                          onChange({
                            ...config,
                            presetId: "custom",
                            fgColorSecondary: e.target.value,
                          })
                        }
                        className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                      />
                      <span className="font-mono text-xs">{config.fgColorSecondary}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor={bgColorId} className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Màu nền QR
                  </label>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 bg-white dark:bg-slate-900">
                    <input
                      id={bgColorId}
                      type="color"
                      value={config.bgColor}
                      onChange={(e) =>
                        onChange({ ...config, presetId: "custom", bgColor: e.target.value })
                      }
                      className="size-7 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <span className="font-mono text-xs">{config.bgColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold">Logo ở giữa mã QR</span>
                <div className="relative">
                  <input
                    id={logoInputId}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleCustomLogoUpload}
                    className="visually-hidden"
                  />
                  <label
                    htmlFor={logoInputId}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 cursor-pointer"
                  >
                    <ImagePlus className="size-3.5" aria-hidden="true" />
                    Tải logo riêng
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {LOGO_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...config,
                        logoMode: m.value,
                        errorCorrectionLevel: m.value === "none" ? "Q" : "H",
                      })
                    }
                    className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-medium cursor-pointer ${
                      config.logoMode === m.value
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
                {config.customLogoDataUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...config, logoMode: "custom", errorCorrectionLevel: "H" })
                    }
                    className={`min-h-[38px] rounded-lg border px-3 py-1 text-xs font-medium cursor-pointer ${
                      config.logoMode === "custom"
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    }`}
                  >
                    Logo đã tải
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
