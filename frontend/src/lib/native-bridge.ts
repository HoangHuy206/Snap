export type NativeMediaKind = "video" | "image" | "audio";

export interface NativeMediaSaveResult {
  savedTo: "photos" | "downloads" | "files";
  filename: string;
  kind?: NativeMediaKind;
}

interface VidQRMediaPlugin {
  readClipboard?: () => Promise<{ value?: string }>;
  saveMediaFromUrl?: (options: {
    url: string;
    method?: "GET" | "POST";
    body?: string;
    filename?: string;
    kind?: NativeMediaKind;
  }) => Promise<NativeMediaSaveResult>;
}

interface CapacitorWindow extends Window {
  Capacitor?: {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: {
      VidQRMedia?: VidQRMediaPlugin;
    };
  };
}

function getCap(): CapacitorWindow["Capacitor"] | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as CapacitorWindow).Capacitor;
}

export function isCapacitorNativeApp(): boolean {
  try {
    const cap = getCap();
    if (!cap) return false;
    if (typeof cap.isNativePlatform === "function") {
      return cap.isNativePlatform();
    }
    const platform = cap.getPlatform?.();
    return platform === "ios" || platform === "android";
  } catch {
    return false;
  }
}

export function getVidQRMediaPlugin(): VidQRMediaPlugin | null {
  const plugin = getCap()?.Plugins?.VidQRMedia;
  return plugin ?? null;
}

export async function readNativeOrWebClipboard(): Promise<string> {
  const nativeClipboard = getVidQRMediaPlugin()?.readClipboard;
  if (nativeClipboard) {
    try {
      const result = await nativeClipboard();
      if (typeof result?.value === "string") {
        return result.value.trim();
      }
    } catch {
      // Fallback to browser Clipboard API below
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.readText) {
    return (await navigator.clipboard.readText()).trim();
  }

  throw new Error("CLIPBOARD_UNAVAILABLE");
}

export function lockNativeViewportZoom(): void {
  if (typeof document === "undefined" || !isCapacitorNativeApp()) return;

  document.documentElement.setAttribute("data-native-app", "true");
  let viewportMeta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (!viewportMeta) {
    viewportMeta = document.createElement("meta");
    viewportMeta.name = "viewport";
    document.head.appendChild(viewportMeta);
  }
  viewportMeta.content =
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover";
}
