import qrcode from "qrcode-generator";

export type SeasonId = "spring" | "summer" | "autumn" | "tet";
export type FlowerColorId =
  | "rose"
  | "violet"
  | "crimson"
  | "amber"
  | "sky"
  | "frost";

export interface MagicTreeConfig {
  url: string;
  season: SeasonId;
  flowerColor: FlowerColorId;
}

export interface SeasonPreset {
  id: SeasonId;
  label: string;
  shortDesc: string;
  defaultFlower: FlowerColorId;
  grassPalette: string[];
  grassScanInk: string[];
  trunkPalette: string[];
  trunkScanInk: string;
  petalColors: string[];
  stageLightBg: string;
  stageDarkBg: string;
  ambientEmoji: string;
}

export interface FlowerPalette {
  id: FlowerColorId;
  label: string;
  swatchHex: string;
  /** Bright pastel/vibrant tones rendered in 3D tree mode (t = 1) */
  treeShades: string[];
  /** Higher-contrast tones interpolated at flat QR mode (t = 0) so every camera scans reliably */
  qrScanShades: string[];
}

export const SEASON_PRESETS: SeasonPreset[] = [
  {
    id: "spring",
    label: "Xuân Đào",
    shortDesc: "Hoa anh đào nở rộ, cánh rơi nhẹ",
    defaultFlower: "rose",
    grassPalette: ["#84cc16", "#65a30d", "#a3e635", "#4d7c0f"],
    grassScanInk: ["#3f6212", "#4d7c0f", "#365314"],
    trunkPalette: ["#7c4a2d", "#6b3e26", "#8d5838"],
    trunkScanInk: "#4a2c18",
    petalColors: ["#fbcfe8", "#f9a8d4", "#f472b6"],
    stageLightBg: "#f6f1e7",
    stageDarkBg: "#0f172a",
    ambientEmoji: "🌸",
  },
  {
    id: "summer",
    label: "Hạ Xanh",
    shortDesc: "Tán lá xanh mát, nắng rực rỡ",
    defaultFlower: "sky",
    grassPalette: ["#22c55e", "#16a34a", "#4ade80", "#15803d"],
    grassScanInk: ["#14532d", "#166534", "#15803d"],
    trunkPalette: ["#6d4c3d", "#5b3d2e", "#7e5a48"],
    trunkScanInk: "#3f281d",
    petalColors: ["#bbf7d0", "#86efac", "#bae6fd"],
    stageLightBg: "#eef6f0",
    stageDarkBg: "#0c1a1c",
    ambientEmoji: "🌿",
  },
  {
    id: "autumn",
    label: "Thu Vàng",
    shortDesc: "Lá phong hổ phách & nắng chiều",
    defaultFlower: "crimson",
    grassPalette: ["#a3a635", "#859326", "#ca8a04", "#717c1d"],
    grassScanInk: ["#4d5312", "#5c4d11", "#3f460f"],
    trunkPalette: ["#6b3c25", "#5a311c", "#7d4930"],
    trunkScanInk: "#422214",
    petalColors: ["#fb923c", "#f97316", "#facc15"],
    stageLightBg: "#f8efe4",
    stageDarkBg: "#1b1412",
    ambientEmoji: "🍁",
  },
  {
    id: "tet",
    label: "Tết Mai",
    shortDesc: "Hoa mai vàng rực đón xuân may mắn",
    defaultFlower: "amber",
    grassPalette: ["#65a30d", "#4d7c0f", "#84cc16", "#3f6212"],
    grassScanInk: ["#365314", "#3f6212", "#2f4b10"],
    trunkPalette: ["#723f24", "#5d321b", "#854c2d"],
    trunkScanInk: "#432211",
    petalColors: ["#fde047", "#facc15", "#fef08a"],
    stageLightBg: "#faf2df",
    stageDarkBg: "#1b150e",
    ambientEmoji: "🌼",
  },
];

export const FLOWER_PALETTES: FlowerPalette[] = [
  {
    id: "rose",
    label: "Hồng Đào",
    swatchHex: "#f472b6",
    treeShades: ["#fbcfe8", "#f9a8d4", "#f472b6", "#f08ab8"],
    qrScanShades: ["#9d2a58", "#b23668", "#831f47", "#a6305f"],
  },
  {
    id: "violet",
    label: "Tím Lavender",
    swatchHex: "#a78bfa",
    treeShades: ["#ddd6fe", "#c4b5fd", "#a78bfa", "#b79cf9"],
    qrScanShades: ["#5b21b6", "#6d28d9", "#4c1d95", "#6025c0"],
  },
  {
    id: "crimson",
    label: "Đỏ Phong",
    swatchHex: "#ef4444",
    treeShades: ["#fca5a5", "#f87171", "#ef4444", "#fb923c"],
    qrScanShades: ["#991b1b", "#b91c1c", "#7f1d1d", "#a8241b"],
  },
  {
    id: "amber",
    label: "Vàng Mai",
    swatchHex: "#f59e0b",
    treeShades: ["#fef08a", "#fde047", "#facc15", "#fbbf24"],
    qrScanShades: ["#92400e", "#a16207", "#78350f", "#854d0e"],
  },
  {
    id: "sky",
    label: "Xanh Ngọc",
    swatchHex: "#38bdf8",
    treeShades: ["#bae6fd", "#7dd3fc", "#38bdf8", "#86efac"],
    qrScanShades: ["#0369a1", "#075985", "#0c4a6e", "#047857"],
  },
  {
    id: "frost",
    label: "Tuyết Trắng",
    swatchHex: "#cbd5e1",
    treeShades: ["#f8fafc", "#e2e8f0", "#cbd5e1", "#e0f2fe"],
    qrScanShades: ["#334155", "#475569", "#1e293b", "#3b4c63"],
  },
];

export const DEFAULT_MAGIC_URL = "https://snap-nine-dusky.vercel.app/";

export function getSeasonPreset(id: SeasonId): SeasonPreset {
  return SEASON_PRESETS.find((s) => s.id === id) ?? SEASON_PRESETS[0];
}

export function getFlowerPalette(id: FlowerColorId): FlowerPalette {
  return FLOWER_PALETTES.find((f) => f.id === id) ?? FLOWER_PALETTES[0];
}

export function normalizeMagicUrl(raw: string): {
  url: string;
  valid: boolean;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      url: "",
      valid: false,
      error: "Vui lòng nhập hoặc dán một liên kết URL.",
    };
  }

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return {
      url: "",
      valid: false,
      error: "Liên kết không hợp lệ. Chỉ hỗ trợ đường dẫn web http:// hoặc https://.",
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(candidate);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      !parsed.hostname.includes(".")
    ) {
      return {
        url: "",
        valid: false,
        error: "Đường dẫn chưa đúng định dạng web (ví dụ: https://tiktok.com/...).",
      };
    }
    if (candidate.length > 900) {
      return {
        url: "",
        valid: false,
        error: "Liên kết quá dài (tối đa 900 ký tự để mã QR luôn sắc nét và dễ quét).",
      };
    }
    return { url: parsed.toString(), valid: true };
  } catch {
    return {
      url: "",
      valid: false,
      error: "Đường dẫn không hợp lệ. Hãy kiểm tra lại URL bạn vừa nhập.",
    };
  }
}

/** Encodes MagicTreeConfig into a compact URL-safe token for `/magic?q=...` */
export function encodeMagicPayload(config: MagicTreeConfig): string {
  const payload = JSON.stringify({
    u: config.url,
    s: config.season,
    c: config.flowerColor,
  });
  const bytes = new TextEncoder().encode(payload);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeMagicPayload(
  token: string | null | undefined
): MagicTreeConfig | null {
  if (!token) return null;
  try {
    const padded = token.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (padded.length % 4)) % 4;
    const binary = atob(padded + "=".repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Partial<{
      u: string;
      s: string;
      c: string;
    }>;
    if (!parsed.u) return null;
    const normalized = normalizeMagicUrl(parsed.u);
    if (!normalized.valid) return null;

    const season: SeasonId = SEASON_PRESETS.some((s) => s.id === parsed.s)
      ? (parsed.s as SeasonId)
      : "spring";
    const flowerColor: FlowerColorId = FLOWER_PALETTES.some(
      (f) => f.id === parsed.c
    )
      ? (parsed.c as FlowerColorId)
      : getSeasonPreset(season).defaultFlower;

    return { url: normalized.url, season, flowerColor };
  } catch {
    return null;
  }
}

export interface QrMatrixData {
  size: number;
  modules: boolean[][];
  isFinder: boolean[][];
}

export function buildQrMatrix(value: string): QrMatrixData {
  const qr = qrcode(0, "M");
  qr.addData(value || DEFAULT_MAGIC_URL);
  qr.make();
  const size = qr.getModuleCount();

  const modules: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => qr.isDark(r, c))
  );

  const isFinder: boolean[][] = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (__, c) => {
      const topLeft = r < 8 && c < 8;
      const topRight = r < 8 && c >= size - 8;
      const bottomLeft = r >= size - 8 && c < 8;
      return topLeft || topRight || bottomLeft;
    })
  );

  return { size, modules, isFinder };
}
