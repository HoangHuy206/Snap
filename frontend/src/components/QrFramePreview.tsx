"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Download, Heart, Play, ScanLine, Sparkles } from "lucide-react";
import type { QrDesignConfig, QrFrameFont, QrFrameIcon } from "@/lib/api";
import {
  DECORATIVE_FRAME_STYLES,
  computeCtaQuadCurve,
  getDecorativeFrameLayout,
  type DecorativeCtaCurve,
} from "@/lib/qr-decorative-frames";
import { getFontCssValue, getResolvedFrameTypography } from "@/lib/qr-presets";

interface QrFramePreviewProps {
  config: QrDesignConfig;
  children: ReactNode;
}

function getPreviewCtaFontSizePx(
  label: string,
  font: QrFrameFont | undefined,
  boxWidthRatio: number,
  boxHeightRatio: number,
  hasIcon: boolean,
  fontScale = 1,
): number {
  const isScript = font === "script" || font === "charm" || font === "greatvibes" || font === "pacifico";
  const isMostlyUpper =
    label.length >= 6 && label.replace(/[^A-ZÀ-Ỹ]/g, "").length > label.length * 0.6;
  const effectiveChars = Math.max(4, label.length + (hasIcon ? 3.2 : 0));
  const approxAvailW = Math.max(72, 316 * boxWidthRatio - 14);
  const approxBoxH = Math.max(12, 424 * boxHeightRatio);
  const baseCharFactor =
    font === "greatvibes"
      ? 0.46
      : isScript
      ? 0.50
      : font === "poster"
      ? 0.44
      : font === "cute"
      ? 0.56
      : 0.54;
  const charFactor = baseCharFactor + (isMostlyUpper ? 0.08 : 0);
  const maxByWidth = approxAvailW / (effectiveChars * charFactor);
  const maxByHeight = approxBoxH * (isScript ? 0.74 : 0.64);
  const targetMax =
    font === "greatvibes" ? 16 : isScript ? 14.5 : font === "serif" ? 13 : 12.5;
  const clampedScale = Math.min(1.25, Math.max(0.75, fontScale));
  const scaled = Math.min(targetMax * clampedScale, maxByWidth, maxByHeight * Math.max(1, Math.min(1.12, clampedScale)));
  return Math.max(7.5, Math.round(scaled * 10) / 10);
}

function getPreviewSublabelFontSizePx(sublabel: string, boxWidthRatio: number): number {
  const approxAvailW = Math.max(90, 316 * boxWidthRatio - 10);
  const maxByWidth = approxAvailW / Math.max(8, sublabel.length * 0.64);
  return Math.max(6.5, Math.round(Math.min(9.5, maxByWidth) * 10) / 10);
}

function FrameCtaIcon({ icon, color, small = false }: { icon: QrFrameIcon; color: string; small?: boolean }) {
  if (icon === "none") return null;
  const props = {
    className: small ? "size-3.5 shrink-0" : "size-4 shrink-0",
    style: { color },
    "aria-hidden": true as const,
  };
  switch (icon) {
    case "scan":
      return <ScanLine {...props} />;
    case "play":
      return <Play {...props} />;
    case "download":
      return <Download {...props} />;
    case "spark":
      return <Sparkles {...props} />;
    case "heart":
      return <Heart {...props} />;
  }
}

function CurvedSvgIcon({
  icon,
  color,
  x,
  y,
  size,
  angleDeg,
}: {
  icon: QrFrameIcon;
  color: string;
  x: number;
  y: number;
  size: number;
  angleDeg: number;
}) {
  if (icon === "none") return null;
  const scale = size / 24;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${angleDeg}) scale(${scale}) translate(-12, -12)`}>
      {icon === "heart" && (
        <path
          d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          fill="none"
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {icon === "play" && (
        <polygon
          points="6 3 20 12 6 21 6 3"
          fill={color}
          stroke={color}
          strokeWidth={1.6}
          strokeLinejoin="round"
        />
      )}
      {icon === "spark" && (
        <path
          d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
          fill={color}
        />
      )}
      {icon === "download" && (
        <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </g>
      )}
      {icon === "scan" && (
        <g fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <line x1="7" x2="17" y1="12" y2="12" />
        </g>
      )}
    </g>
  );
}

function CurvedRibbonCta({
  viewBoxW,
  viewBoxH,
  ctaBox,
  ctaCurve,
  label,
  font,
  fontFamily,
  fontWeight,
  fontStyle,
  fontScale,
  color,
  icon,
}: {
  viewBoxW: number;
  viewBoxH: number;
  ctaBox: { x: number; y: number; w: number; h: number };
  ctaCurve: DecorativeCtaCurve;
  label: string;
  font: QrFrameFont | undefined;
  fontFamily: string;
  fontWeight: 400 | 700;
  fontStyle: "italic" | "normal";
  fontScale: number;
  color: string;
  icon: QrFrameIcon;
}) {
  const rawId = useId();
  const pathId = `qr-curve-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const textRef = useRef<SVGTextElement | null>(null);
  const textPathRef = useRef<SVGTextPathElement | null>(null);

  const curve = useMemo(() => computeCtaQuadCurve(ctaBox, ctaCurve), [ctaBox, ctaCurve]);

  const baseSvgFont = useMemo(() => {
    const px = getPreviewCtaFontSizePx(
      label,
      font,
      ctaBox.w / viewBoxW,
      ctaBox.h / viewBoxH,
      icon !== "none",
      fontScale,
    );
    return Math.round(px * 2.8 * 10) / 10;
  }, [label, font, ctaBox.w, ctaBox.h, viewBoxW, viewBoxH, icon, fontScale]);

  const [measured, setMeasured] = useState<{ key: string; width: number; scale: number } | null>(null);
  const measureKey = `${label}|${font ?? "sans"}|${fontWeight}|${fontStyle}|${icon}|${ctaBox.x}:${ctaBox.w}|${baseSvgFont}`;

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const el = textPathRef.current ?? textRef.current;
      if (!el) return;
      const rawW = el.getComputedTextLength();
      if (!rawW || Number.isNaN(rawW)) return;
      const iconAllowance = icon !== "none" ? baseSvgFont * 1.2 : 0;
      const maxSpan = curve.length * 0.9;
      setMeasured((prev) => {
        const curScale = prev && prev.key === measureKey ? prev.scale : 1;
        const unscaledW = rawW / curScale;
        const nextScale =
          unscaledW + iconAllowance > maxSpan
            ? Math.max(0.58, (maxSpan - iconAllowance * 0.6) / Math.max(1, unscaledW))
            : 1;
        const clampedW = unscaledW * nextScale;
        if (
          prev &&
          prev.key === measureKey &&
          Math.abs(prev.width - clampedW) < 1 &&
          Math.abs(prev.scale - nextScale) < 0.02
        ) {
          return prev;
        }
        return { key: measureKey, width: clampedW, scale: nextScale };
      });
    };

    const raf = requestAnimationFrame(measure);
    if ("fonts" in document) {
      void document.fonts.ready.then(() => {
        if (!cancelled) requestAnimationFrame(measure);
      });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [measureKey, baseSvgFont, icon, curve.length]);

  const scaleFactor = measured && measured.key === measureKey ? measured.scale : 1;
  const svgFontSize = Math.max(18, Math.round(baseSvgFont * scaleFactor * 10) / 10);
  const iconSize = icon !== "none" ? Math.round(svgFontSize * 0.85) : 0;
  const iconGap = icon !== "none" ? Math.round(svgFontSize * 0.34) : 0;
  const iconTotal = icon !== "none" ? iconSize + iconGap : 0;

  const estimatedWidth = label.length * svgFontSize * (font === "script" ? 0.48 : 0.56);
  const textWidth = measured && measured.key === measureKey ? measured.width : estimatedWidth;

  const centerArcS = curve.length / 2;
  const textStartOffset = centerArcS + iconTotal / 2;
  const iconArcS = Math.max(iconSize / 2 + 4, centerArcS - (textWidth + iconTotal) / 2 + iconSize / 2);
  const iconPoint = curve.sampleAtArcLength(iconArcS);

  return (
    <svg
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[3] size-full overflow-visible"
    >
      <defs>
        <path id={pathId} d={curve.pathD} fill="none" />
      </defs>
      {icon !== "none" && (
        <CurvedSvgIcon
          icon={icon}
          color={color}
          x={iconPoint.x}
          y={iconPoint.y}
          size={iconSize}
          angleDeg={iconPoint.angleDeg}
        />
      )}
      <text
        ref={textRef}
        fill={color}
        fontSize={svgFontSize}
        fontWeight={fontWeight}
        fontStyle={fontStyle}
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily }}
      >
        <textPath ref={textPathRef} href={`#${pathId}`} startOffset={textStartOffset}>
          {label}
        </textPath>
      </text>
    </svg>
  );
}

function getBorderWidthPx(
  thickness: QrDesignConfig["frameThickness"],
  borderStyle: QrDesignConfig["frameBorderStyle"],
): number {
  const base = thickness === "thin" ? 3 : thickness === "thick" ? 8 : 5;
  if (borderStyle === "double") return base + 3;
  return base;
}

function getRadiusPx(radius: QrDesignConfig["frameRadius"]): number {
  switch (radius) {
    case "sharp":
      return 10;
    case "pill":
      return 34;
    case "rounded":
    default:
      return 24;
  }
}

export function QrFramePreview({ config, children }: QrFramePreviewProps) {
  const activeStyle = config.frameEnabled ? config.frameStyle : "none";
  const isDecorative = DECORATIVE_FRAME_STYLES.has(activeStyle);
  const isCustomOverlay = activeStyle === "custom-overlay";

  const decorative = useMemo(() => {
    if (!isDecorative) return null;
    return getDecorativeFrameLayout(activeStyle);
  }, [isDecorative, activeStyle]);

  const typo = getResolvedFrameTypography(config);
  const fontFamily = getFontCssValue(typo.font);
  const gradientBg = `linear-gradient(135deg, ${config.frameColor}, ${config.frameColorSecondary})`;

  const radiusPx = getRadiusPx(config.frameRadius);
  const borderWidthPx = getBorderWidthPx(config.frameThickness, config.frameBorderStyle);
  const shadowStyle = config.frameShadow
    ? activeStyle === "gradient-glow"
      ? `0 18px 42px -10px ${config.frameColor}66, 0 8px 20px -8px ${config.frameColorSecondary}55`
      : "0 18px 36px -12px rgba(15, 23, 42, 0.35)"
    : "none";

  const labelText = (config.frameLabel || "Quét để xem ngay").slice(0, 30);
  const sublabelText = (config.frameSublabel || "").trim().slice(0, 36);

  const isNone = activeStyle === "none";
  const isGlow = activeStyle === "gradient-glow";
  const isRibbonTop = activeStyle === "ribbon-top";
  const isViewfinder = activeStyle === "viewfinder";
  const isTicket = activeStyle === "polaroid-ticket";
  const isPhone = activeStyle === "phone-mockup";
  const isDoubleOrnate = activeStyle === "double-ornate";
  const innerRadiusPx = Math.max(8, radiusPx - 6);

  // Use explicit longhand CSS properties everywhere so React never warns on shorthand/longhand transitions
  const outerStyle: React.CSSProperties =
    isDecorative || isCustomOverlay
      ? {
          aspectRatio: "896 / 1200",
          borderRadius: "24px",
          backgroundColor: isCustomOverlay ? config.bgColor : "transparent",
          backgroundImage: "none",
          borderWidth: "0px",
          borderStyle: "solid",
          borderColor: "transparent",
          padding: "0px",
          boxShadow: shadowStyle,
        }
      : isNone
      ? {
          backgroundColor: config.bgColor,
          backgroundImage: "none",
          borderRadius: `${radiusPx}px`,
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "rgba(148, 163, 184, 0.35)",
          padding: "0px",
          boxShadow: shadowStyle,
        }
      : isGlow
      ? {
          backgroundColor: config.frameColor,
          backgroundImage: config.frameUseGradient ? gradientBg : "none",
          borderRadius: `${radiusPx}px`,
          borderWidth: "0px",
          borderStyle: "solid",
          borderColor: "transparent",
          padding: `${borderWidthPx + 3}px`,
          boxShadow: shadowStyle,
        }
      : isPhone
      ? {
          backgroundColor: config.frameColor,
          backgroundImage: config.frameUseGradient ? gradientBg : "none",
          borderRadius: `${Math.max(radiusPx, 32)}px`,
          borderWidth: "0px",
          borderStyle: "solid",
          borderColor: "transparent",
          padding: "12px",
          boxShadow: shadowStyle,
        }
      : isViewfinder
      ? {
          backgroundColor: config.bgColor,
          backgroundImage: "none",
          borderRadius: `${radiusPx}px`,
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "rgba(148, 163, 184, 0.25)",
          padding: "0px",
          boxShadow: shadowStyle,
        }
      : {
          backgroundColor: config.bgColor,
          backgroundImage: "none",
          borderRadius: `${radiusPx}px`,
          borderColor: config.frameColor,
          borderStyle: isDoubleOrnate ? "double" : config.frameBorderStyle,
          borderWidth: `${isDoubleOrnate ? Math.max(borderWidthPx, 7) : borderWidthPx}px`,
          padding: "0px",
          boxShadow: shadowStyle,
        };

  const innerCardStyle: React.CSSProperties =
    isDecorative || isCustomOverlay
      ? { position: "relative", width: "100%", height: "100%", backgroundColor: "transparent" }
      : isGlow
      ? { backgroundColor: config.bgColor, borderRadius: `${innerRadiusPx}px` }
      : isPhone
      ? { backgroundColor: config.bgColor, borderRadius: `${Math.max(innerRadiusPx, 22)}px` }
      : { backgroundColor: "transparent" };

  const ctaBadgeStyle: React.CSSProperties = {
    backgroundColor: config.frameColor,
    backgroundImage: config.frameUseGradient ? gradientBg : "none",
    color: config.frameTextColor,
    fontFamily,
    fontWeight: typo.fontWeight,
    fontStyle: typo.fontStyle,
  };

  const qrSlotStyle: React.CSSProperties =
    isDecorative && decorative
      ? {
          position: "absolute",
          left: `${(decorative.qrBox.x / decorative.viewBoxW) * 100}%`,
          top: `${(decorative.qrBox.y / decorative.viewBoxH) * 100}%`,
          width: `${(decorative.qrBox.size / decorative.viewBoxW) * 100}%`,
          height: `${(decorative.qrBox.size / decorative.viewBoxH) * 100}%`,
          zIndex: 2,
        }
      : isCustomOverlay
      ? {
          position: "absolute",
          left: "50%",
          top: `${50 + (config.customFrameQrOffsetY ?? 0)}%`,
          width: `${Math.round((config.customFrameQrScale ?? 0.64) * 100)}%`,
          aspectRatio: "1 / 1",
          transform: "translate(-50%, -50%)",
          zIndex: 2,
        }
      : {};

  const geometricFontSize = getPreviewCtaFontSizePx(
    labelText,
    typo.font,
    0.72,
    0.09,
    config.frameIcon !== "none",
    typo.fontScale,
  );

  return (
    <div className="relative w-full max-w-[330px] mx-auto pt-2 pb-1 qr-frame-container">
      {/* Top Ribbon Badge (geometric ribbon-top) */}
      {isRibbonTop && (
        <div
          className="relative z-10 mx-auto -mb-4 w-[84%] rounded-2xl px-3 py-2 text-center shadow-md"
          style={ctaBadgeStyle}
        >
          <div
            className="flex items-center justify-center gap-1.5 font-bold tracking-normal leading-tight text-center"
            style={{ fontSize: `${geometricFontSize}px` }}
          >
            <FrameCtaIcon icon={config.frameIcon} color={config.frameTextColor} />
            <span>{labelText}</span>
          </div>
          {sublabelText && (
            <p
              className="text-[10px] opacity-90 font-medium tracking-wider uppercase leading-tight mt-0.5"
              style={{
                fontFamily: config.frameSublabelMatchFont ? fontFamily : undefined,
                fontWeight: config.frameSublabelMatchFont ? typo.fontWeight : 500,
                fontStyle: config.frameSublabelMatchFont ? typo.fontStyle : "normal",
              }}
            >
              {sublabelText}
            </p>
          )}
        </div>
      )}

      <div className="relative transition-all duration-200 overflow-clip" style={outerStyle}>
        <div
          className={
            isDecorative || isCustomOverlay
              ? "relative size-full"
              : `relative transition-all duration-200 ${
                  isNone
                    ? "p-3"
                    : isGlow
                    ? "p-3.5"
                    : isPhone
                    ? "px-3.5 pt-3 pb-3.5"
                    : isRibbonTop
                    ? "px-4 pt-7 pb-4"
                    : "p-4"
                }`
          }
          style={innerCardStyle}
        >
          {/* High-Res Illustrated Frame Image Layer */}
          {isDecorative && decorative && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={decorative.imageUrl}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full object-cover select-none z-[1]"
            />
          )}

          {/* Custom User-Uploaded Frame Layer */}
          {isCustomOverlay && config.customFrameDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={config.customFrameDataUrl}
              alt="Khung viền tùy chọn"
              className="pointer-events-none absolute inset-0 size-full object-contain select-none z-[1]"
            />
          )}

          {/* Phone Mockup Dynamic Island */}
          {isPhone && (
            <div className="mb-3 flex justify-center">
              <div
                className="h-4 w-24 rounded-full flex items-center justify-end px-2"
                style={{ backgroundColor: "#0f172a" }}
              >
                <span className="size-2 rounded-full bg-indigo-400/70" />
              </div>
            </div>
          )}

          {/* Double Ornate inner hairline & corner dots */}
          {isDoubleOrnate && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-2.5 border"
              style={{
                borderRadius: `${Math.max(6, innerRadiusPx - 4)}px`,
                borderColor: `${config.frameColor}55`,
              }}
            >
              <span className="absolute -top-1 -left-1 size-2.5 rounded-full" style={{ backgroundColor: config.frameColor }} />
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full" style={{ backgroundColor: config.frameColor }} />
              <span className="absolute -bottom-1 -left-1 size-2.5 rounded-full" style={{ backgroundColor: config.frameColor }} />
              <span className="absolute -bottom-1 -right-1 size-2.5 rounded-full" style={{ backgroundColor: config.frameColor }} />
            </div>
          )}

          {/* STABLE QR Mounting Slot */}
          <div
            className={
              isDecorative || isCustomOverlay
                ? "flex items-center justify-center"
                : "relative flex items-center justify-center p-1.5"
            }
            style={qrSlotStyle}
          >
            {isViewfinder && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <span
                  className="absolute top-0 left-0 size-8 border-t-[5px] border-l-[5px] rounded-tl-xl"
                  style={{ borderColor: config.frameColor }}
                />
                <span
                  className="absolute top-0 right-0 size-8 border-t-[5px] border-r-[5px] rounded-tr-xl"
                  style={{ borderColor: config.frameUseGradient ? config.frameColorSecondary : config.frameColor }}
                />
                <span
                  className="absolute bottom-0 left-0 size-8 border-b-[5px] border-l-[5px] rounded-bl-xl"
                  style={{ borderColor: config.frameUseGradient ? config.frameColorSecondary : config.frameColor }}
                />
                <span
                  className="absolute bottom-0 right-0 size-8 border-b-[5px] border-r-[5px] rounded-br-xl"
                  style={{ borderColor: config.frameColor }}
                />
              </div>
            )}

            <div className="size-full flex items-center justify-center overflow-clip rounded-xl [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!max-w-[248px] [&_canvas]:block relative z-[1]">
              {children}
            </div>
          </div>

          {/* Illustrated Frame CTA Text Overlay */}
          {isDecorative && decorative && (() => {
            const isKawaii = config.frameStyle === "kawaii-kitty";
            const ctaBox = isKawaii
              ? { ...decorative.ctaBox, y: 1028, h: sublabelText ? 62 : 104 }
              : decorative.ctaBox;
            const sublabelY = isKawaii ? 1106 : decorative.sublabelBox.y;
            return (
              <>
                {decorative.ctaCurve ? (
                  <CurvedRibbonCta
                    viewBoxW={decorative.viewBoxW}
                    viewBoxH={decorative.viewBoxH}
                    ctaBox={ctaBox}
                    ctaCurve={decorative.ctaCurve}
                    label={labelText}
                    font={typo.font}
                    fontFamily={fontFamily}
                    fontWeight={typo.fontWeight}
                    fontStyle={typo.fontStyle}
                    fontScale={typo.fontScale}
                    color={config.frameTextColor}
                    icon={config.frameIcon}
                  />
                ) : (
                  <div
                    className="pointer-events-none absolute z-[3] flex items-center justify-center gap-1 px-1.5 tracking-normal leading-none whitespace-nowrap text-center"
                    style={{
                      left: `${(ctaBox.x / decorative.viewBoxW) * 100}%`,
                      top: `${(ctaBox.y / decorative.viewBoxH) * 100}%`,
                      width: `${(ctaBox.w / decorative.viewBoxW) * 100}%`,
                      height: `${(ctaBox.h / decorative.viewBoxH) * 100}%`,
                      color: config.frameTextColor,
                      fontFamily,
                      fontWeight: typo.fontWeight,
                      fontStyle: typo.fontStyle,
                      fontSize: `clamp(6.5px, ${(
                        (getPreviewCtaFontSizePx(
                          labelText,
                          typo.font,
                          ctaBox.w / decorative.viewBoxW,
                          ctaBox.h / decorative.viewBoxH,
                          config.frameIcon !== "none",
                          typo.fontScale,
                        ) /
                          316) *
                        100
                      ).toFixed(2)}cqi, 18px)`,
                    }}
                  >
                    <FrameCtaIcon icon={config.frameIcon} color={config.frameTextColor} small />
                    <span>{labelText}</span>
                  </div>
                )}
                {sublabelText && (
                  <p
                    className="pointer-events-none absolute z-[3] -translate-y-1/2 whitespace-nowrap text-center font-bold tracking-[0.02em] uppercase leading-none px-1"
                    style={{
                      left: `${(decorative.sublabelBox.x / decorative.viewBoxW) * 100}%`,
                      width: `${(decorative.sublabelBox.w / decorative.viewBoxW) * 100}%`,
                      top: `${(sublabelY / decorative.viewBoxH) * 100}%`,
                      fontFamily: config.frameSublabelMatchFont ? fontFamily : undefined,
                      fontWeight: config.frameSublabelMatchFont ? typo.fontWeight : 700,
                      fontStyle: config.frameSublabelMatchFont ? typo.fontStyle : "normal",
                      fontSize: `clamp(5.5px, ${(
                        (getPreviewSublabelFontSizePx(
                          sublabelText,
                          decorative.sublabelBox.w / decorative.viewBoxW,
                        ) /
                          316) *
                        100
                      ).toFixed(2)}cqi, 10.5px)`,
                      color: decorative.sublabelColor,
                    }}
                  >
                    {sublabelText}
                  </p>
                )}
              </>
            );
          })()}

          {/* Custom Overlay Optional CTA Pill */}
          {isCustomOverlay && config.customFrameShowLabel && (
            <div
              className="pointer-events-none absolute z-[3] bottom-[5%] left-[14%] right-[14%] rounded-2xl px-3 py-2 text-center shadow-md"
              style={ctaBadgeStyle}
            >
              <div className="flex items-center justify-center gap-1.5 font-bold text-xs tracking-wide truncate">
                <FrameCtaIcon icon={config.frameIcon} color={config.frameTextColor} />
                <span className="truncate">{labelText}</span>
              </div>
            </div>
          )}

          {isCustomOverlay && !config.customFrameDataUrl && (
            <p className="pointer-events-none absolute z-[3] top-3 inset-x-4 text-center text-[11px] font-semibold text-slate-500">
              Hãy tải ảnh khung PNG/JPG từ máy ở bảng bên phải
            </p>
          )}

          {isTicket && (
            <div className="relative my-3 flex items-center">
              <span
                aria-hidden="true"
                className="absolute -left-6 size-5 rounded-full border-r"
                style={{ backgroundColor: "var(--surface)", borderColor: config.frameColor }}
              />
              <div className="w-full border-t-2 border-dashed" style={{ borderColor: `${config.frameColor}66` }} />
              <span
                aria-hidden="true"
                className="absolute -right-6 size-5 rounded-full border-l"
                style={{ backgroundColor: "var(--surface)", borderColor: config.frameColor }}
              />
            </div>
          )}

          {/* Geometric Bottom CTA Section */}
          {!isDecorative && !isCustomOverlay && !isNone && !isRibbonTop && (
            <div className={isTicket ? "mt-1 text-center space-y-1" : "mt-3 space-y-1.5"}>
              <div
                className={`${isTicket ? "rounded-xl py-2" : "rounded-2xl py-2.5 shadow-sm"} px-3 text-center`}
                style={ctaBadgeStyle}
              >
                <div
                  className="flex items-center justify-center gap-1.5 font-bold tracking-normal leading-tight text-center"
                  style={{ fontSize: `${geometricFontSize}px` }}
                >
                  <FrameCtaIcon icon={config.frameIcon} color={config.frameTextColor} />
                  <span>{labelText}</span>
                </div>
              </div>
              {sublabelText && (
                <p
                  className="text-center text-[10.5px] font-semibold tracking-wide uppercase leading-tight px-2"
                  style={{
                    color: config.frameColor,
                    fontFamily: config.frameSublabelMatchFont ? fontFamily : undefined,
                    fontWeight: config.frameSublabelMatchFont ? typo.fontWeight : 600,
                    fontStyle: config.frameSublabelMatchFont ? typo.fontStyle : "normal",
                  }}
                >
                  {sublabelText}
                </p>
              )}
            </div>
          )}

          {isRibbonTop && (
            <div className="mt-2 flex items-center justify-center gap-1.5">
              <span className="h-1 w-8 rounded-full opacity-40" style={{ backgroundColor: config.frameColor }} />
              <span className="size-1.5 rounded-full opacity-60" style={{ backgroundColor: config.frameColor }} />
              <span className="h-1 w-8 rounded-full opacity-40" style={{ backgroundColor: config.frameColor }} />
            </div>
          )}

          {isPhone && (
            <div className="mt-3 flex justify-center">
              <div className="h-1.5 w-24 rounded-full opacity-30" style={{ backgroundColor: config.frameColor }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
