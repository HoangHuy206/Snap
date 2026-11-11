import type { QrDesignConfig, QrFrameIcon } from "./api";
import {
  DECORATIVE_FRAME_STYLES,
  computeCtaQuadCurve,
  getDecorativeFrameLayout,
  type DecorativeCtaCurve,
} from "./qr-decorative-frames";
import { getCanvasFontFamily, getResolvedFrameTypography } from "./qr-presets";

function getAccentFill(
  ctx: CanvasRenderingContext2D,
  config: QrDesignConfig,
  x: number,
  y: number,
  w: number,
  h: number,
): string | CanvasGradient {
  if (!config.frameUseGradient) return config.frameColor;
  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, config.frameColor);
  grad.addColorStop(1, config.frameColorSecondary);
  return grad;
}

function getBorderWidth(config: QrDesignConfig): number {
  const base = config.frameThickness === "thin" ? 10 : config.frameThickness === "thick" ? 26 : 16;
  return config.frameBorderStyle === "double" ? base + 8 : base;
}

function getCornerRadius(config: QrDesignConfig): number {
  switch (config.frameRadius) {
    case "sharp":
      return 28;
    case "pill":
      return 96;
    case "rounded":
    default:
      return 64;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Lỗi tải ảnh khung để xuất PNG."));
    img.src = src;
  });
}

function drawCtaIcon(
  ctx: CanvasRenderingContext2D,
  icon: QrFrameIcon,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  if (icon === "none") return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(3, size * 0.11);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const half = size / 2;
  if (icon === "play") {
    ctx.beginPath();
    ctx.moveTo(cx - half * 0.5, cy - half * 0.75);
    ctx.lineTo(cx + half * 0.85, cy);
    ctx.lineTo(cx - half * 0.5, cy + half * 0.75);
    ctx.closePath();
    ctx.fill();
  } else if (icon === "scan") {
    const b = half * 0.8;
    const arm = half * 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - b, cy - b + arm);
    ctx.lineTo(cx - b, cy - b);
    ctx.lineTo(cx - b + arm, cy - b);
    ctx.moveTo(cx + b - arm, cy - b);
    ctx.lineTo(cx + b, cy - b);
    ctx.lineTo(cx + b, cy - b + arm);
    ctx.moveTo(cx - b, cy + b - arm);
    ctx.lineTo(cx - b, cy + b);
    ctx.lineTo(cx - b + arm, cy + b);
    ctx.moveTo(cx + b - arm, cy + b);
    ctx.lineTo(cx + b, cy + b);
    ctx.lineTo(cx + b, cy + b - arm);
    ctx.moveTo(cx - b * 0.65, cy);
    ctx.lineTo(cx + b * 0.65, cy);
    ctx.stroke();
  } else if (icon === "download") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half * 0.75);
    ctx.lineTo(cx, cy + half * 0.35);
    ctx.moveTo(cx - half * 0.5, cy - half * 0.1);
    ctx.lineTo(cx, cy + half * 0.4);
    ctx.lineTo(cx + half * 0.5, cy - half * 0.1);
    ctx.moveTo(cx - half * 0.75, cy + half * 0.75);
    ctx.lineTo(cx + half * 0.75, cy + half * 0.75);
    ctx.stroke();
  } else if (icon === "spark") {
    ctx.beginPath();
    ctx.moveTo(cx, cy - half * 0.9);
    ctx.lineTo(cx + half * 0.28, cy - half * 0.28);
    ctx.lineTo(cx + half * 0.9, cy);
    ctx.lineTo(cx + half * 0.28, cy + half * 0.28);
    ctx.lineTo(cx, cy + half * 0.9);
    ctx.lineTo(cx - half * 0.28, cy + half * 0.28);
    ctx.lineTo(cx - half * 0.9, cy);
    ctx.lineTo(cx - half * 0.28, cy - half * 0.28);
    ctx.closePath();
    ctx.fill();
  } else if (icon === "heart") {
    ctx.beginPath();
    ctx.moveTo(cx, cy + half * 0.75);
    ctx.bezierCurveTo(cx - half * 1.15, cy + half * 0.05, cx - half * 0.85, cy - half * 0.9, cx, cy - half * 0.3);
    ctx.bezierCurveTo(cx + half * 0.85, cy - half * 0.9, cx + half * 1.15, cy + half * 0.05, cx, cy + half * 0.75);
    ctx.fill();
  }
  ctx.restore();
}

function drawFittedCtaText(
  ctx: CanvasRenderingContext2D,
  config: QrDesignConfig,
  x: number,
  y: number,
  w: number,
  h: number,
  baseFontPx: number,
): void {
  ctx.save();
  const label = (config.frameLabel || "Quét để xem ngay").slice(0, 30);
  const typo = getResolvedFrameTypography(config);
  const family = getCanvasFontFamily(typo.font);
  const fontPrefix = `${typo.fontStyle === "italic" ? "italic " : ""}${typo.fontWeight}`;

  const maxHeightFont = Math.max(
    20,
    Math.round(h * (typo.isScriptLike ? 0.74 : 0.64) * Math.max(1, Math.min(1.12, typo.fontScale))),
  );
  const targetBase = Math.round(
    baseFontPx * (typo.font === "greatvibes" ? 1.28 : typo.isScriptLike ? 1.18 : 1) * typo.fontScale,
  );
  let fontSize = Math.min(targetBase, maxHeightFont);
  const hasIcon = config.frameIcon !== "none";
  const iconSize = Math.round(fontSize * 0.9);
  const gap = hasIcon ? Math.round(fontSize * 0.36) : 0;
  const maxTextArea = w - 36 - (hasIcon ? iconSize + gap : 0);

  ctx.font = `${fontPrefix} ${fontSize}px ${family}`;
  while (ctx.measureText(label).width > maxTextArea && fontSize > 20) {
    fontSize -= 2;
    ctx.font = `${fontPrefix} ${fontSize}px ${family}`;
  }

  ctx.fillStyle = config.frameTextColor;
  ctx.textBaseline = "middle";
  const textWidth = ctx.measureText(label).width;
  const totalWidth = textWidth + (hasIcon ? iconSize + gap : 0);
  const startX = x + (w - totalWidth) / 2;
  const centerY = y + h / 2 + 1;

  if (hasIcon) {
    drawCtaIcon(ctx, config.frameIcon, startX + iconSize / 2, centerY, iconSize, config.frameTextColor);
  }
  ctx.textAlign = "left";
  ctx.fillText(label, startX + (hasIcon ? iconSize + gap : 0), centerY);
  ctx.restore();
}

function splitGraphemes(text: string): string[] {
  const normalized = text.normalize("NFC");
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter("vi", { granularity: "grapheme" });
    return Array.from(seg.segment(normalized), (item) => item.segment);
  }
  return Array.from(normalized);
}

function drawCurvedCtaText(
  ctx: CanvasRenderingContext2D,
  config: QrDesignConfig,
  ctaBox: { x: number; y: number; w: number; h: number },
  ctaCurve: DecorativeCtaCurve,
  scale: number,
  baseFontPx: number,
): void {
  ctx.save();
  const label = (config.frameLabel || "Quét để xem ngay").slice(0, 30);
  const typo = getResolvedFrameTypography(config);
  const family = getCanvasFontFamily(typo.font);
  const fontPrefix = `${typo.fontStyle === "italic" ? "italic " : ""}${typo.fontWeight}`;
  const curve = computeCtaQuadCurve(ctaBox, ctaCurve);
  const curveLenPx = curve.length * scale;
  const hPx = ctaBox.h * scale;

  const maxHeightFont = Math.max(
    20,
    Math.round(hPx * (typo.isScriptLike ? 0.74 : 0.64) * Math.max(1, Math.min(1.12, typo.fontScale))),
  );
  const targetBase = Math.round(
    baseFontPx * (typo.font === "greatvibes" ? 1.28 : typo.isScriptLike ? 1.18 : 1) * typo.fontScale,
  );
  let fontSize = Math.min(targetBase, maxHeightFont);
  const hasIcon = config.frameIcon !== "none";
  const getIconSize = (fs: number) => Math.round(fs * 0.88);
  const getGap = (fs: number) => (hasIcon ? Math.round(fs * 0.34) : 0);

  ctx.font = `${fontPrefix} ${fontSize}px ${family}`;
  while (
    ctx.measureText(label).width + (hasIcon ? getIconSize(fontSize) + getGap(fontSize) : 0) >
      curveLenPx * 0.9 &&
    fontSize > 20
  ) {
    fontSize -= 2;
    ctx.font = `${fontPrefix} ${fontSize}px ${family}`;
  }

  const iconSize = hasIcon ? getIconSize(fontSize) : 0;
  const gap = hasIcon ? getGap(fontSize) : 0;
  const iconTotal = hasIcon ? iconSize + gap : 0;
  const textWidth = ctx.measureText(label).width;
  const totalWidth = textWidth + iconTotal;
  const blockStartPx = (curveLenPx - totalWidth) / 2;

  ctx.fillStyle = config.frameTextColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (hasIcon) {
    const iconPt = curve.sampleAtArcLength((blockStartPx + iconSize / 2) / scale);
    ctx.save();
    ctx.translate(iconPt.x * scale, iconPt.y * scale);
    ctx.rotate(iconPt.angleRad);
    drawCtaIcon(ctx, config.frameIcon, 0, 0, iconSize, config.frameTextColor);
    ctx.restore();
  }

  const textStartPx = blockStartPx + iconTotal;
  const graphemes = splitGraphemes(label);
  let prefix = "";
  for (const g of graphemes) {
    const wPrev = ctx.measureText(prefix).width;
    const wNext = ctx.measureText(prefix + g).width;
    const midS = (textStartPx + (wPrev + wNext) / 2) / scale;
    const pt = curve.sampleAtArcLength(midS);
    ctx.save();
    ctx.translate(pt.x * scale, pt.y * scale);
    ctx.rotate(pt.angleRad);
    ctx.fillText(g, 0, 0);
    ctx.restore();
    prefix += g;
  }
  ctx.restore();
}

function drawCtaPill(
  ctx: CanvasRenderingContext2D,
  config: QrDesignConfig,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.save();
  ctx.fillStyle = getAccentFill(ctx, config, x, y, w, h);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.restore();
  drawFittedCtaText(ctx, config, x, y, w, h, 44);
}

/**
 * Render high-resolution QR Card PNG matching illustrated artwork, custom overlays, and geometric frames.
 */
export async function renderQrCardBlob(
  qrPngBlob: Blob,
  config: QrDesignConfig,
): Promise<Blob> {
  if (!config.frameEnabled || config.frameStyle === "none") {
    return qrPngBlob;
  }

  if (typeof document !== "undefined" && "fonts" in document) {
    await document.fonts.ready;
  }

  const imgUrl = URL.createObjectURL(qrPngBlob);
  let qrImage: HTMLImageElement;
  try {
    qrImage = await loadImage(imgUrl);
  } finally {
    URL.revokeObjectURL(imgUrl);
  }

  const sublabel = (config.frameSublabel || "").trim().slice(0, 36);
  const hasSublabel = Boolean(sublabel);
  const style = config.frameStyle;

  // 1. Studio-Illustrated Theme Frames (/frames/*.jpg at 1080x1446 crisp resolution)
  if (DECORATIVE_FRAME_STYLES.has(style)) {
    const layout = getDecorativeFrameLayout(style);
    if (!layout) return qrPngBlob;

    const frameImg = await loadImage(layout.imageUrl);
    const outW = 1080;
    const scale = outW / layout.viewBoxW;
    const outH = Math.round(layout.viewBoxH * scale);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");

    const isKawaii = style === "kawaii-kitty";
    const effectiveCtaBox = isKawaii
      ? { ...layout.ctaBox, y: 1028, h: hasSublabel ? 62 : 104 }
      : layout.ctaBox;
    const effectiveSublabelY = isKawaii ? 1106 : layout.sublabelBox.y;

    ctx.drawImage(frameImg, 0, 0, outW, outH);
    ctx.drawImage(
      qrImage,
      Math.round(layout.qrBox.x * scale),
      Math.round(layout.qrBox.y * scale),
      Math.round(layout.qrBox.size * scale),
      Math.round(layout.qrBox.size * scale),
    );
    if (layout.ctaCurve) {
      drawCurvedCtaText(ctx, config, effectiveCtaBox, layout.ctaCurve, scale, 40);
    } else {
      drawFittedCtaText(
        ctx,
        config,
        Math.round(effectiveCtaBox.x * scale),
        Math.round(effectiveCtaBox.y * scale),
        Math.round(effectiveCtaBox.w * scale),
        Math.round(effectiveCtaBox.h * scale),
        40,
      );
    }

    if (hasSublabel) {
      ctx.save();
      const typo = getResolvedFrameTypography(config);
      const maxSubW = Math.round(layout.sublabelBox.w * scale);
      const subText = sublabel.toUpperCase();
      let subSize = 26;
      const subFamily = getCanvasFontFamily(
        config.frameSublabelMatchFont ? typo.font : "sans",
      );
      const subPrefix = config.frameSublabelMatchFont
        ? `${typo.fontStyle === "italic" ? "italic " : ""}${typo.fontWeight}`
        : "700";
      ctx.font = `${subPrefix} ${subSize}px ${subFamily}`;
      while (ctx.measureText(subText).width > maxSubW && subSize > 14) {
        subSize -= 1;
        ctx.font = `${subPrefix} ${subSize}px ${subFamily}`;
      }
      ctx.fillStyle = layout.sublabelColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(subText, outW / 2, Math.round(effectiveSublabelY * scale), maxSubW);
      ctx.restore();
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Không thể xuất PNG.");
    return blob;
  }

  // 2. Custom User-Uploaded Frame PNG/JPG
  if (style === "custom-overlay") {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1446;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");

    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(0, 0, 1080, 1446, 48);
    ctx.fill();

    if (config.customFrameDataUrl) {
      const customImg = await loadImage(config.customFrameDataUrl);
      const scale = Math.min(1080 / customImg.width, 1446 / customImg.height);
      const dw = customImg.width * scale;
      const dh = customImg.height * scale;
      ctx.drawImage(customImg, (1080 - dw) / 2, (1446 - dh) / 2, dw, dh);
    }

    const qrScale = config.customFrameQrScale ?? 0.64;
    const qrSize = Math.round(1080 * qrScale);
    const offsetY = Math.round(1446 * ((config.customFrameQrOffsetY ?? 0) / 100));
    const qx = Math.round((1080 - qrSize) / 2);
    const qy = Math.round((1446 - qrSize) / 2) + offsetY;
    ctx.drawImage(qrImage, qx, qy, qrSize, qrSize);

    if (config.customFrameShowLabel) {
      drawCtaPill(ctx, config, 160, 1220, 760, 116, 36);
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Không thể xuất PNG.");
    return blob;
  }

  // 3. Geometric & Device Frames
  const cardW = 1080;
  const cardH = style === "ribbon-top" ? 1240 : hasSublabel ? 1360 : 1300;

  const canvas = document.createElement("canvas");
  canvas.width = cardW;
  canvas.height = cardH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ Canvas 2D.");

  const radius = getCornerRadius(config);
  const borderW = getBorderWidth(config);
  const pad = 42;
  const bodyX = pad;
  const bodyY = style === "ribbon-top" ? 96 : pad;
  const bodyW = cardW - pad * 2;
  const bodyH = cardH - bodyY - pad;

  if (config.frameShadow) {
    ctx.save();
    ctx.shadowColor = style === "gradient-glow" ? `${config.frameColor}66` : "rgba(15, 23, 42, 0.25)";
    ctx.shadowBlur = 42;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, bodyW, bodyH, radius);
    ctx.fill();
    ctx.restore();
  }

  if (style === "gradient-glow") {
    ctx.fillStyle = getAccentFill(ctx, config, bodyX, bodyY, bodyW, bodyH);
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, bodyW, bodyH, radius);
    ctx.fill();

    const inset = borderW + 10;
    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(bodyX + inset, bodyY + inset, bodyW - inset * 2, bodyH - inset * 2, Math.max(18, radius - 14));
    ctx.fill();
  } else if (style === "phone-mockup") {
    ctx.fillStyle = getAccentFill(ctx, config, bodyX, bodyY, bodyW, bodyH);
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, bodyW, bodyH, Math.max(radius, 86));
    ctx.fill();

    const bezel = 30;
    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(bodyX + bezel, bodyY + bezel, bodyW - bezel * 2, bodyH - bezel * 2, Math.max(radius - 18, 60));
    ctx.fill();

    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(cardW / 2 - 115, bodyY + 58, 230, 38, 19);
    ctx.fill();
  } else {
    ctx.fillStyle = config.bgColor;
    ctx.beginPath();
    ctx.roundRect(bodyX, bodyY, bodyW, bodyH, radius);
    ctx.fill();

    if (style !== "viewfinder") {
      ctx.save();
      ctx.strokeStyle = getAccentFill(ctx, config, bodyX, bodyY, bodyW, bodyH);
      ctx.lineWidth = style === "double-ornate" ? Math.max(borderW, 20) : borderW;
      if (config.frameBorderStyle === "dashed" && style !== "double-ornate") {
        ctx.setLineDash([28, 18]);
      }
      ctx.beginPath();
      ctx.roundRect(
        bodyX + ctx.lineWidth / 2,
        bodyY + ctx.lineWidth / 2,
        bodyW - ctx.lineWidth,
        bodyH - ctx.lineWidth,
        Math.max(12, radius - 4),
      );
      ctx.stroke();

      if (style === "double-ornate" || config.frameBorderStyle === "double") {
        ctx.setLineDash([]);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `${config.frameColor}77`;
        const gap = style === "double-ornate" ? 34 : 24;
        ctx.beginPath();
        ctx.roundRect(
          bodyX + gap,
          bodyY + gap,
          bodyW - gap * 2,
          bodyH - gap * 2,
          Math.max(10, radius - 18),
        );
        ctx.stroke();

        if (style === "double-ornate") {
          ctx.fillStyle = config.frameColor;
          const pts = [
            [bodyX + gap, bodyY + gap],
            [bodyX + bodyW - gap, bodyY + gap],
            [bodyX + gap, bodyY + bodyH - gap],
            [bodyX + bodyW - gap, bodyY + bodyH - gap],
          ];
          for (const [px, py] of pts) {
            ctx.beginPath();
            ctx.arc(px, py, 11, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
  }

  const qrSize = 840;
  const qrX = (cardW - qrSize) / 2;
  const qrY =
    style === "ribbon-top"
      ? bodyY + 115
      : style === "phone-mockup"
      ? bodyY + 128
      : bodyY + 72;
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  if (style === "viewfinder") {
    ctx.save();
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const arm = 92;
    const padVF = 16;
    const x1 = qrX - padVF;
    const y1 = qrY - padVF;
    const x2 = qrX + qrSize + padVF;
    const y2 = qrY + qrSize + padVF;

    ctx.strokeStyle = config.frameColor;
    ctx.beginPath();
    ctx.moveTo(x1, y1 + arm);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 + arm, y1);
    ctx.moveTo(x2 - arm, y2);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2, y2 - arm);
    ctx.stroke();

    ctx.strokeStyle = config.frameUseGradient ? config.frameColorSecondary : config.frameColor;
    ctx.beginPath();
    ctx.moveTo(x2 - arm, y1);
    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y1 + arm);
    ctx.moveTo(x1, y2 - arm);
    ctx.lineTo(x1, y2);
    ctx.lineTo(x1 + arm, y2);
    ctx.stroke();
    ctx.restore();
  }

  if (style === "polaroid-ticket") {
    const divY = qrY + qrSize + 28;
    ctx.save();
    ctx.strokeStyle = `${config.frameColor}77`;
    ctx.lineWidth = 5;
    ctx.setLineDash([18, 14]);
    ctx.beginPath();
    ctx.moveTo(bodyX + 46, divY);
    ctx.lineTo(bodyX + bodyW - 46, divY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(bodyX + 6, divY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyX + bodyW - 6, divY, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = config.frameColor;
    ctx.lineWidth = Math.max(6, borderW * 0.65);
    ctx.beginPath();
    ctx.arc(bodyX + 6, divY, 26, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bodyX + bodyW - 6, divY, 26, Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }

  if (style === "ribbon-top") {
    const ribW = 780;
    const ribH = hasSublabel ? 136 : 110;
    const ribX = (cardW - ribW) / 2;
    const ribY = 34;
    drawCtaPill(ctx, config, ribX, ribY, ribW, ribH, 36);

    if (hasSublabel) {
      ctx.save();
      const typo = getResolvedFrameTypography(config);
      const subFamily = getCanvasFontFamily(config.frameSublabelMatchFont ? typo.font : "sans");
      const subPrefix = config.frameSublabelMatchFont
        ? `${typo.fontStyle === "italic" ? "italic " : ""}${typo.fontWeight}`
        : "600";
      ctx.fillStyle = config.frameColor;
      ctx.font = `${subPrefix} 30px ${subFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(sublabel.toUpperCase(), cardW / 2, bodyY + bodyH - 58);
      ctx.restore();
    }
  } else {
    const pillW = 840;
    const pillH = 138;
    const pillX = (cardW - pillW) / 2;
    const pillY = qrY + qrSize + (style === "polaroid-ticket" ? 64 : 50);
    drawCtaPill(ctx, config, pillX, pillY, pillW, pillH, 38);

    if (hasSublabel) {
      ctx.save();
      const typo = getResolvedFrameTypography(config);
      const subFamily = getCanvasFontFamily(config.frameSublabelMatchFont ? typo.font : "sans");
      const subPrefix = config.frameSublabelMatchFont
        ? `${typo.fontStyle === "italic" ? "italic " : ""}${typo.fontWeight}`
        : "700";
      ctx.fillStyle = config.frameColor;
      ctx.font = `${subPrefix} 30px ${subFamily}`;
      ctx.textAlign = "center";
      ctx.fillText(sublabel.toUpperCase(), cardW / 2, pillY + pillH + 46);
      ctx.restore();
    }

    if (style === "phone-mockup") {
      ctx.save();
      ctx.fillStyle = `${config.frameColor}55`;
      ctx.beginPath();
      ctx.roundRect(cardW / 2 - 120, bodyY + bodyH - 64, 240, 12, 6);
      ctx.fill();
      ctx.restore();
    }
  }

  const finalBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!finalBlob) throw new Error("Không thể xuất PNG.");
  return finalBlob;
}
