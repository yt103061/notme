// 共有rAFループ。すべての物理更新はこの1つのループから駆動する(Reactの再レンダーを挟まない)。
type TickFn = (dt: number) => void;

const tickers = new Set<TickFn>();
let rafHandle: number | null = null;
let lastTime = 0;

function frame(t: number) {
  if (lastTime === 0) lastTime = t;
  const dt = Math.min((t - lastTime) / 1000, 1 / 30);
  lastTime = t;
  tickers.forEach((fn) => fn(dt));
  if (tickers.size > 0) {
    rafHandle = requestAnimationFrame(frame);
  } else {
    rafHandle = null;
    lastTime = 0;
  }
}

export function addTicker(fn: TickFn): () => void {
  tickers.add(fn);
  if (rafHandle === null) {
    lastTime = 0;
    rafHandle = requestAnimationFrame(frame);
  }
  return () => tickers.delete(fn);
}
