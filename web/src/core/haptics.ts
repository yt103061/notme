import { getSettings } from "./settings";

// navigator.vibrate が使える環境(主にAndroid Chrome)のみ有効。プログレッシブエンハンスメントとして扱う。
type HapticPattern = "light" | "medium" | "heavy" | "selection";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: [18, 10, 24],
  selection: 4,
};

export function vibrate(pattern: HapticPattern) {
  if (!getSettings().hapticsOn) return;
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* 対応していない環境では無視する */
  }
}
