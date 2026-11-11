import type { QrDesignConfig, QrFrameFont } from "./api";

export interface QrPreset {
  id: string;
  name: string;
  previewGradient: string;
  config: QrDesignConfig;
}

export const DEFAULT_QR_CONFIG: QrDesignConfig = {
  presetId: "indigo-pulse",
  dotsType: "rounded",
  cornersSquareType: "extra-rounded",
  cornersDotType: "dot",
  useGradient: true,
  fgColor: "#4338ca",
  fgColorSecondary: "#06b6d4",
  gradientDirection: 45,
  bgColor: "#ffffff",
  logoMode: "video",
  logoSize: 0.34,
  frameEnabled: true,
  frameStyle: "gradient-glow",
  frameBorderStyle: "solid",
  frameThickness: "medium",
  frameRadius: "rounded",
  frameUseGradient: true,
  frameColor: "#4338ca",
  frameColorSecondary: "#06b6d4",
  frameTextColor: "#ffffff",
  frameLabel: "Quét để xem ngay",
  frameSublabel: "",
  frameIcon: "scan",
  frameFont: "sans",
  frameFontBold: true,
  frameFontItalic: false,
  frameFontScale: 1,
  frameSublabelMatchFont: false,
  frameShadow: true,
  customFrameQrScale: 0.64,
  customFrameQrOffsetY: 0,
  customFrameShowLabel: false,
  errorCorrectionLevel: "H",
};

/**
 * Merge partial or legacy saved QR configs safely with all current defaults.
 */
export function resolveQrConfig(partial?: Partial<QrDesignConfig> | null): QrDesignConfig {
  if (!partial) return { ...DEFAULT_QR_CONFIG };
  const merged: QrDesignConfig = {
    ...DEFAULT_QR_CONFIG,
    ...partial,
  };
  if (partial.frameEnabled === false && !partial.frameStyle) {
    merged.frameStyle = "none";
  }
  return merged;
}

export function getFontCssValue(font: QrFrameFont | undefined): string {
  switch (font) {
    case "script":
      return "var(--font-script-vn), cursive, system-ui";
    case "charm":
      return "var(--font-charm-vn), cursive, serif";
    case "greatvibes":
      return "var(--font-greatvibes-vn), cursive, serif";
    case "serif":
      return "var(--font-serif-vn), Georgia, serif";
    case "cute":
      return "var(--font-cute-vn), system-ui, sans-serif";
    case "pacifico":
      return "var(--font-pacifico-vn), cursive, sans-serif";
    case "poster":
      return "var(--font-poster-vn), system-ui, sans-serif";
    case "sans":
    default:
      return "var(--font-sans-vn), system-ui, sans-serif";
  }
}

export function getCanvasFontFamily(font: QrFrameFont | undefined): string {
  if (typeof window === "undefined") return "system-ui, sans-serif";
  const styles = getComputedStyle(document.documentElement);
  const pick = (varName: string, fallback: string) =>
    styles.getPropertyValue(varName).trim() || fallback;
  switch (font) {
    case "script":
      return `${pick("--font-script-vn", "Dancing Script")}, cursive, sans-serif`;
    case "charm":
      return `${pick("--font-charm-vn", "Charm")}, cursive, serif`;
    case "greatvibes":
      return `${pick("--font-greatvibes-vn", "Great Vibes")}, cursive, serif`;
    case "serif":
      return `${pick("--font-serif-vn", "Playfair Display")}, Georgia, serif`;
    case "cute":
      return `${pick("--font-cute-vn", "Baloo 2")}, sans-serif`;
    case "pacifico":
      return `${pick("--font-pacifico-vn", "Pacifico")}, cursive, sans-serif`;
    case "poster":
      return `${pick("--font-poster-vn", "Oswald")}, system-ui, sans-serif`;
    case "sans":
    default:
      return `${pick("--font-sans-vn", "Plus Jakarta Sans")}, system-ui, sans-serif`;
  }
}

export interface ResolvedFrameTypography {
  font: QrFrameFont;
  fontWeight: 400 | 700;
  fontStyle: "italic" | "normal";
  fontScale: number;
  isScriptLike: boolean;
}

export function getResolvedFrameTypography(config: QrDesignConfig): ResolvedFrameTypography {
  const font: QrFrameFont = config.frameFont || "sans";
  const fontScale = Math.min(1.25, Math.max(0.75, config.frameFontScale ?? 1));
  return {
    font,
    fontWeight: config.frameFontBold === false ? 400 : 700,
    fontStyle: config.frameFontItalic ? "italic" : "normal",
    fontScale,
    isScriptLike:
      font === "script" || font === "charm" || font === "greatvibes" || font === "pacifico",
  };
}

export const QR_PRESETS: QrPreset[] = [
  {
    id: "indigo-pulse",
    name: "Indigo Glow",
    previewGradient: "linear-gradient(135deg, #4338ca, #06b6d4)",
    config: { ...DEFAULT_QR_CONFIG },
  },
  {
    id: "floral-sakura",
    name: "Hoa Anh Đào",
    previewGradient: "linear-gradient(135deg, #f472b6, #fbcfe8)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "floral-sakura",
      dotsType: "extra-rounded",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#9d174d",
      fgColorSecondary: "#ec4899",
      bgColor: "#ffffff",
      logoMode: "flower",
      frameStyle: "floral-blossom",
      frameColor: "#db2777",
      frameColorSecondary: "#f472b6",
      frameTextColor: "#881337",
      frameLabel: "Quét để xem ngay",
      frameIcon: "heart",
      frameFont: "script",
    },
  },
  {
    id: "kawaii-kitty",
    name: "Kawaii Kitty",
    previewGradient: "linear-gradient(135deg, #f43f5e, #f9a8d4)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "kawaii-kitty",
      dotsType: "dots",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#db2777",
      fgColorSecondary: "#f43f5e",
      bgColor: "#ffffff",
      logoMode: "bow",
      frameStyle: "kawaii-kitty",
      frameColor: "#ec4899",
      frameColorSecondary: "#fb7185",
      frameTextColor: "#ffffff",
      frameLabel: "Quét dễ thương",
      frameIcon: "heart",
      frameFont: "cute",
    },
  },
  {
    id: "teachers-2011",
    name: "Nhà Giáo 20/11",
    previewGradient: "linear-gradient(135deg, #15803d, #dc2626)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "teachers-2011",
      dotsType: "classy-rounded",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#14532d",
      fgColorSecondary: "#b45309",
      bgColor: "#ffffff",
      logoMode: "flower",
      frameStyle: "teachers-day-2011",
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
    id: "vintage-royal",
    name: "Hoa Văn Cổ Điển",
    previewGradient: "linear-gradient(135deg, #b45309, #eab308)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "vintage-royal",
      dotsType: "classy",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#78350f",
      fgColorSecondary: "#b45309",
      bgColor: "#ffffff",
      logoMode: "crown",
      frameStyle: "vintage-filigree",
      frameColor: "#b45309",
      frameColorSecondary: "#eab308",
      frameTextColor: "#78350f",
      frameLabel: "Quét Mã Tại Đây",
      frameIcon: "spark",
      frameFont: "serif",
    },
  },
  {
    id: "anime-pop",
    name: "Anime Manga",
    previewGradient: "linear-gradient(135deg, #7c3aed, #06b6d4)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "anime-pop",
      dotsType: "rounded",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#4f46e5",
      fgColorSecondary: "#06b6d4",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameStyle: "anime-manga",
      frameColor: "#6366f1",
      frameColorSecondary: "#06b6d4",
      frameTextColor: "#ffffff",
      frameLabel: "MỞ VIDEO NGAY!",
      frameIcon: "play",
      frameFont: "cute",
    },
  },
  {
    id: "tet-holiday",
    name: "Tết Hoa Mai",
    previewGradient: "linear-gradient(135deg, #b91c1c, #f59e0b)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "tet-holiday",
      dotsType: "rounded",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#991b1b",
      fgColorSecondary: "#d97706",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameStyle: "tet-holiday",
      frameColor: "#b91c1c",
      frameColorSecondary: "#f59e0b",
      frameTextColor: "#7c2d12",
      frameLabel: "Chúc Mừng Năm Mới",
      frameIcon: "spark",
      frameFont: "script",
    },
  },
  {
    id: "christmas-noel",
    name: "Giáng Sinh Noel",
    previewGradient: "linear-gradient(135deg, #166534, #dc2626)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "christmas-noel",
      dotsType: "dots",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#14532d",
      fgColorSecondary: "#dc2626",
      bgColor: "#ffffff",
      logoMode: "spark",
      frameStyle: "christmas-festive",
      frameColor: "#166534",
      frameColorSecondary: "#dc2626",
      frameTextColor: "#ffffff",
      frameLabel: "Merry Christmas!",
      frameIcon: "spark",
      frameFont: "script",
    },
  },
  {
    id: "emerald-neon",
    name: "Camera Scan",
    previewGradient: "linear-gradient(135deg, #059669, #0ea5e9)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "emerald-neon",
      dotsType: "dots",
      cornersSquareType: "extra-rounded",
      cornersDotType: "dot",
      useGradient: true,
      fgColor: "#047857",
      fgColorSecondary: "#0ea5e9",
      frameStyle: "viewfinder",
      frameUseGradient: true,
      frameColor: "#047857",
      frameColorSecondary: "#0ea5e9",
      frameLabel: "Quét để mở Media",
      frameIcon: "scan",
      frameFont: "sans",
    },
  },
  {
    id: "obsidian-pro",
    name: "Smartphone",
    previewGradient: "linear-gradient(135deg, #0f172a, #334155)",
    config: {
      ...DEFAULT_QR_CONFIG,
      presetId: "obsidian-pro",
      dotsType: "rounded",
      cornersSquareType: "square",
      cornersDotType: "square",
      useGradient: false,
      fgColor: "#0f172a",
      fgColorSecondary: "#334155",
      frameStyle: "phone-mockup",
      frameUseGradient: false,
      frameColor: "#0f172a",
      frameColorSecondary: "#334155",
      frameLabel: "Mở Camera Quét",
      frameSublabel: "VIDEO • SNAPQR",
      frameIcon: "scan",
      frameFont: "sans",
    },
  },
];

export function buildBuiltinLogoSvgDataUrl(
  mode: QrDesignConfig["logoMode"],
  accentColor: string,
): string | undefined {
  if (mode === "none" || mode === "custom") return undefined;

  const palette: Record<string, { bg: string; inner: string }> = {
    video: {
      bg: accentColor,
      inner: `<polygon points="19,14 35,24 19,34" fill="#ffffff"/>`,
    },
    file: {
      bg: accentColor,
      inner: `<path d="M18 13h9l7 7v15a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2z" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round"/><polyline points="27 13 27 20 34 20" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round"/>`,
    },
    music: {
      bg: accentColor,
      inner: `<path d="M21 31V17l11-2v14" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="18" cy="32" r="3.2" fill="#ffffff"/><circle cx="29" cy="30" r="3.2" fill="#ffffff"/>`,
    },
    spark: {
      bg: accentColor,
      inner: `<path d="M24 11l3.2 8.8L36 23l-8.8 3.2L24 35l-3.2-8.8L12 23l8.8-3.2z" fill="#ffffff"/>`,
    },
    bow: {
      bg: "#fdf2f8",
      inner: `<path d="M22,23 C12,13 8,33 22,25 Z" fill="#ec4899"/><path d="M26,23 C36,13 40,33 26,25 Z" fill="#ec4899"/><circle cx="24" cy="24" r="4.5" fill="#f43f5e"/><circle cx="15" cy="22" r="1.4" fill="#ffffff"/><circle cx="33" cy="22" r="1.4" fill="#ffffff"/>`,
    },
    flower: {
      bg: "#fff1f2",
      inner: `<g transform="translate(24,24)">
        <circle cx="0" cy="-7.5" r="5" fill="#f472b6"/>
        <circle cx="7.1" cy="-2.3" r="5" fill="#f472b6"/>
        <circle cx="4.4" cy="6.1" r="5" fill="#f472b6"/>
        <circle cx="-4.4" cy="6.1" r="5" fill="#f472b6"/>
        <circle cx="-7.1" cy="-2.3" r="5" fill="#f472b6"/>
        <circle cx="0" cy="0" r="4.2" fill="#facc15"/>
      </g>`,
    },
    heart: {
      bg: "#fff1f2",
      inner: `<path d="M24,35 C13,27 11,17 17,14 C21,12 24,16 24,16 C24,16 27,12 31,14 C37,17 35,27 24,35 Z" fill="#e11d48"/>`,
    },
    crown: {
      bg: "#fffbeb",
      inner: `<path d="M13,31 L11,18 L19,23 L24,14 L29,23 L37,18 L35,31 Z" fill="#d97706" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round"/><rect x="13" y="32" width="22" height="3.5" rx="1.5" fill="#b45309"/>`,
    },
  };

  const chosen = palette[mode] || palette.video;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">
    <rect x="1.5" y="1.5" width="45" height="45" rx="13" fill="#ffffff"/>
    <rect x="4.5" y="4.5" width="39" height="39" rx="10" fill="${chosen.bg}"/>
    ${chosen.inner}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const num = parseInt(cleaned, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Computes contrast ratio between QR foreground color and background color
 * to warn users before exporting unreadable low-contrast QR codes.
 */
export function getQrContrastRatio(fgHex: string, bgHex: string): number {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  if (!fg || !bg) return 21;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
