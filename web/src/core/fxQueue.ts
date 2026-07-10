// 6.1「注意のヒエラルキー」に基づく演出キュー。
// L2は因果の順に直列再生し(同時多発イベントを一度に光らせない)、L3はプレイヤーがスキップできる。
// 同一演出が繰り返された場合は自動的にテンポを短縮する(6.4)。
export type FxLevel = "L2" | "L3";

export interface FxEvent {
  kind: string;
  level: FxLevel;
  run: () => void;
  duration: number; // ms
}

type L3Listener = (event: FxEvent | null) => void;

class FxQueue {
  private items: FxEvent[] = [];
  private draining = false;
  private repeatCount = new Map<string, number>();
  private l3Listeners = new Set<L3Listener>();
  private resolveL3: (() => void) | null = null;

  push(event: FxEvent) {
    this.items.push(event);
    void this.drain();
  }

  pushAll(events: FxEvent[]) {
    this.items.push(...events);
    void this.drain();
  }

  subscribeL3(fn: L3Listener): () => void {
    this.l3Listeners.add(fn);
    return () => this.l3Listeners.delete(fn);
  }

  skipL3() {
    this.resolveL3?.();
  }

  private async drain() {
    if (this.draining) return;
    this.draining = true;
    while (this.items.length > 0) {
      const event = this.items.shift()!;
      event.run();

      if (event.level === "L3") {
        this.l3Listeners.forEach((fn) => fn(event));
        await new Promise<void>((resolve) => {
          this.resolveL3 = resolve;
          const timer = window.setTimeout(resolve, 2200);
          const wrappedResolve = () => {
            window.clearTimeout(timer);
            resolve();
          };
          this.resolveL3 = wrappedResolve;
        });
        this.l3Listeners.forEach((fn) => fn(null));
      } else {
        const count = (this.repeatCount.get(event.kind) ?? 0) + 1;
        this.repeatCount.set(event.kind, count);
        const decay = Math.max(0.5, 1 - Math.max(0, count - 3) * 0.2);
        await delay(event.duration * decay);
      }
    }
    this.draining = false;
    this.repeatCount.clear();
  }
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, Math.max(0, ms)));
}

export const fxQueue = new FxQueue();
