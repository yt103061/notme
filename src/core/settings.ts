// Phase6: reduced-motion / 音 / 触覚のユーザー設定。localStorageに永続化し、購読者へ通知する。
export type MotionMode = "full" | "reduced";

export interface Settings {
  motion: MotionMode;
  soundOn: boolean;
  hapticsOn: boolean;
  nudgesOn: boolean; // 7.2 の「そっと促す」演出のオン/オフ
}

const STORAGE_KEY = "card-ui-settings";

function systemPrefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function loadSettings(): Settings {
  const defaults: Settings = {
    motion: systemPrefersReducedMotion() ? "reduced" : "full",
    soundOn: true,
    hapticsOn: true,
    nudgesOn: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

let current: Settings = loadSettings();
const subscribers = new Set<(s: Settings) => void>();

export function getSettings(): Settings {
  return current;
}

export function getMotionMode(): MotionMode {
  return current.motion;
}

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    /* localStorageが使えない環境でも動作は継続する */
  }
  subscribers.forEach((fn) => fn(current));
}

export function subscribeSettings(fn: (s: Settings) => void): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
