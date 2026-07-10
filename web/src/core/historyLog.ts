// 6.3「履歴の担保」: 演出を見逃しても情報が失われないよう、直近の変化を遡れるログを保持する。
export interface HistoryEntry {
  id: string;
  text: string;
  time: number;
}

let entries: HistoryEntry[] = [];
const listeners = new Set<(entries: HistoryEntry[]) => void>();

export function pushHistory(text: string) {
  entries = [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, time: Date.now() }, ...entries].slice(0, 60);
  listeners.forEach((fn) => fn(entries));
}

export function subscribeHistory(fn: (entries: HistoryEntry[]) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getHistory(): HistoryEntry[] {
  return entries;
}

export function clearHistory() {
  entries = [];
  listeners.forEach((fn) => fn(entries));
}
