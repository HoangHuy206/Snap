import type { MediaItem, QrDesignConfig } from "./api";

export interface LocalQrHistoryEntry {
  code: string;
  title: string;
  originalFilename: string;
  mediaKind: MediaItem["media_kind"];
  fileSize: number;
  editToken: string;
  createdAt: string;
  expiresAt: string | null;
  qrConfig?: QrDesignConfig | null;
}

const STORAGE_KEY = "snapqr_history_v1";
const HISTORY_EVENT = "snapqr-history-change";
const MAX_ENTRIES = 25;
const EMPTY_HISTORY: LocalQrHistoryEntry[] = [];

let cachedRaw: string | null = null;
let cachedParsed: LocalQrHistoryEntry[] = EMPTY_HISTORY;

export function loadQrHistory(): LocalQrHistoryEntry[] {
  if (typeof window === "undefined") return EMPTY_HISTORY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw) return cachedParsed;
    cachedRaw = raw;
    if (!raw) {
      cachedParsed = EMPTY_HISTORY;
      return cachedParsed;
    }
    const parsed = JSON.parse(raw);
    cachedParsed = Array.isArray(parsed) ? parsed : EMPTY_HISTORY;
    return cachedParsed;
  } catch {
    return EMPTY_HISTORY;
  }
}

export function getServerHistorySnapshot(): LocalQrHistoryEntry[] {
  return EMPTY_HISTORY;
}

export function subscribeQrHistory(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => callback();
  window.addEventListener("storage", handler);
  window.addEventListener(HISTORY_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(HISTORY_EVENT, handler);
  };
}

function writeHistory(entries: LocalQrHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const raw = JSON.stringify(entries);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRaw = raw;
    cachedParsed = entries;
    window.dispatchEvent(new Event(HISTORY_EVENT));
  } catch {
    // Ignore storage quota errors
  }
}

export function saveQrHistoryEntry(item: MediaItem, qrConfig?: QrDesignConfig | null): void {
  if (typeof window === "undefined" || !item.edit_token) return;
  const current = loadQrHistory().filter((entry) => entry.code !== item.code);
  const next: LocalQrHistoryEntry = {
    code: item.code,
    title: item.title,
    originalFilename: item.original_filename,
    mediaKind: item.media_kind,
    fileSize: item.file_size,
    editToken: item.edit_token,
    createdAt: item.created_at,
    expiresAt: item.expires_at,
    qrConfig: qrConfig ?? item.qr_config ?? null,
  };
  writeHistory([next, ...current].slice(0, MAX_ENTRIES));
}

export function updateHistoryItemInfo(
  code: string,
  patch: Partial<Pick<LocalQrHistoryEntry, "title" | "originalFilename" | "mediaKind" | "fileSize" | "expiresAt" | "qrConfig">>,
): void {
  if (typeof window === "undefined") return;
  const list = loadQrHistory().map((entry) =>
    entry.code === code ? { ...entry, ...patch } : entry,
  );
  writeHistory(list);
}

export function removeQrHistoryEntry(code: string): void {
  if (typeof window === "undefined") return;
  writeHistory(loadQrHistory().filter((entry) => entry.code !== code));
}

export function findStoredEditToken(code: string): string | null {
  const match = loadQrHistory().find((entry) => entry.code === code);
  return match?.editToken || null;
}
