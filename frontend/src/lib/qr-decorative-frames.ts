import type { QrFrameStyle } from "./api";

export interface DecorativeCtaCurve {
  /** Centerline Y at left & right ends of ctaBox inside 896x1200 coords */
  endY: number;
  /** Centerline Y at horizontal midpoint of ctaBox (< endY = arches upward) */
  peakY: number;
}

export interface DecorativeFrameLayout {
  imageUrl: string;
  viewBoxW: number;
  viewBoxH: number;
  /** Measured pixel coordinates inside the 896x1200 illustrated frame image */
  qrBox: { x: number; y: number; size: number };
  /** Measured CTA banner coordinates inside the 896x1200 illustrated frame image */
  ctaBox: { x: number; y: number; w: number; h: number };
  /** Optional curved ribbon centerline arch so preview & PNG export curve text along the banner */
  ctaCurve?: DecorativeCtaCurve;
  /** Safe inner horizontal & vertical coordinates for sublabel inside 896x1200 */
  sublabelBox: { x: number; y: number; w: number };
  sublabelColor: string;
}

export const DECORATIVE_FRAME_STYLES: ReadonlySet<QrFrameStyle> = new Set<QrFrameStyle>([
  "floral-blossom",
  "vintage-filigree",
  "kawaii-kitty",
  "anime-manga",
  "teachers-day-2011",
  "tet-holiday",
  "christmas-festive",
]);

const DECORATIVE_FRAME_REGISTRY: Record<string, DecorativeFrameLayout> = {
  "floral-blossom": {
    imageUrl: "/frames/floral-blossom.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 241, y: 353, size: 414 },
    ctaBox: { x: 238, y: 906, w: 420, h: 68 },
    sublabelBox: { x: 238, y: 1004, w: 420 },
    sublabelColor: "#9d174d",
  },
  "vintage-filigree": {
    imageUrl: "/frames/vintage-filigree.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 220, y: 263, size: 456 },
    ctaBox: { x: 220, y: 864, w: 456, h: 80 },
    sublabelBox: { x: 205, y: 1034, w: 486 },
    sublabelColor: "#78350f",
  },
  "kawaii-kitty": {
    imageUrl: "/frames/kawaii-kitty.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 174, y: 362, size: 548 },
    ctaBox: { x: 190, y: 1028, w: 516, h: 64 },
    // Fits cleanly inside the lower interior of the 120px-tall pink pill without hitting bottom edge
    sublabelBox: { x: 215, y: 1106, w: 466 },
    sublabelColor: "#ffffff",
  },
  "anime-manga": {
    imageUrl: "/frames/anime-manga.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 160, y: 256, size: 576 },
    ctaBox: { x: 256, y: 966, w: 384, h: 52 },
    ctaCurve: { endY: 1012, peakY: 992 },
    sublabelBox: { x: 268, y: 1072, w: 360 },
    sublabelColor: "#e0f2fe",
  },
  "teachers-day-2011": {
    imageUrl: "/frames/teachers-day-2011.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 256, y: 300, size: 384 },
    ctaBox: { x: 268, y: 818, w: 360, h: 48 },
    ctaCurve: { endY: 876, peakY: 841 },
    sublabelBox: { x: 248, y: 936, w: 390 },
    sublabelColor: "#fef08a",
  },
  "tet-holiday": {
    imageUrl: "/frames/tet-holiday.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 202, y: 272, size: 492 },
    ctaBox: { x: 260, y: 932, w: 376, h: 86 },
    ctaCurve: { endY: 981, peakY: 973 },
    sublabelBox: { x: 268, y: 1054, w: 360 },
    sublabelColor: "#fef08a",
  },
  "christmas-festive": {
    imageUrl: "/frames/christmas-noel.jpg",
    viewBoxW: 896,
    viewBoxH: 1200,
    qrBox: { x: 176, y: 267, size: 544 },
    ctaBox: { x: 248, y: 958, w: 400, h: 72 },
    ctaCurve: { endY: 1010, peakY: 989 },
    sublabelBox: { x: 210, y: 1126, w: 476 },
    sublabelColor: "#14532d",
  },
};

export function getDecorativeFrameLayout(style: QrFrameStyle): DecorativeFrameLayout | null {
  return DECORATIVE_FRAME_REGISTRY[style] ?? null;
}

export interface CtaQuadCurveGeometry {
  pathD: string;
  length: number;
  sampleAtArcLength: (s: number) => {
    x: number;
    y: number;
    angleRad: number;
    angleDeg: number;
  };
}

/**
 * Compute quadratic Bezier centerline & arc-length sampler so preview SVG and PNG export align identically.
 */
export function computeCtaQuadCurve(
  ctaBox: { x: number; w: number },
  curve: DecorativeCtaCurve,
): CtaQuadCurveGeometry {
  const x0 = ctaBox.x;
  const x1 = ctaBox.x + ctaBox.w;
  const y0 = curve.endY;
  const cx = (x0 + x1) / 2;
  const cy = 2 * curve.peakY - curve.endY;

  const steps = 160;
  const xs = new Float64Array(steps + 1);
  const ys = new Float64Array(steps + 1);
  const cumLen = new Float64Array(steps + 1);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const omt = 1 - t;
    const px = omt * omt * x0 + 2 * omt * t * cx + t * t * x1;
    const py = omt * omt * y0 + 2 * omt * t * cy + t * t * y0;
    xs[i] = px;
    ys[i] = py;
    if (i > 0) {
      const dx = px - xs[i - 1];
      const dy = py - ys[i - 1];
      cumLen[i] = cumLen[i - 1] + Math.hypot(dx, dy);
    }
  }

  const totalLen = cumLen[steps];

  const sampleAtArcLength = (sInput: number) => {
    const s = Math.max(0, Math.min(totalLen, sInput));
    let lo = 0;
    let hi = steps;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cumLen[mid] <= s) lo = mid;
      else hi = mid;
    }
    const segLen = Math.max(1e-6, cumLen[hi] - cumLen[lo]);
    const frac = (s - cumLen[lo]) / segLen;
    const t = (lo + frac) / steps;
    const omt = 1 - t;
    const x = omt * omt * x0 + 2 * omt * t * cx + t * t * x1;
    const y = omt * omt * y0 + 2 * omt * t * cy + t * t * y0;
    const dxdt = 2 * omt * (cx - x0) + 2 * t * (x1 - cx);
    const dydt = 2 * omt * (cy - y0) + 2 * t * (y0 - cy);
    const angleRad = Math.atan2(dydt, dxdt);
    return {
      x,
      y,
      angleRad,
      angleDeg: (angleRad * 180) / Math.PI,
    };
  };

  return {
    pathD: `M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y0}`,
    length: totalLen,
    sampleAtArcLength,
  };
}
