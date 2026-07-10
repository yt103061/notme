import { addTicker } from "./ticker";
import type { Spring } from "./spring";

/** flipスプリングが90度を通過した瞬間に一度だけコールバックする(めくり音のタイミング用)。 */
export function onCross90(flip: Spring, cb: () => void) {
  let last = flip.value;
  const stop = addTicker(() => {
    const now = flip.value;
    if ((last < 90 && now >= 90) || (last > 90 && now <= 90)) {
      cb();
      stop();
    }
    last = now;
  });
  return stop;
}
