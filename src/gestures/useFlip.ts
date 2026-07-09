import { useEffect, useRef } from "react";
import type { RefObject } from "react";

interface FlipOptions {
  enabled: boolean;
  onFlip: () => void;
}

const DOUBLE_TAP_MS = 320;

/** 3.5: ダブルタップ/ダブルクリックでカードを裏返すジェスチャーを検出する。 */
export function useFlip(elRef: RefObject<HTMLElement | null>, options: FlipOptions) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = elRef.current;
    if (!el || !options.enabled) return;

    let lastTap = 0;

    const onPointerUp = () => {
      const now = performance.now();
      if (now - lastTap < DOUBLE_TAP_MS) {
        optsRef.current.onFlip();
        lastTap = 0;
      } else {
        lastTap = now;
      }
    };

    el.addEventListener("pointerup", onPointerUp);
    return () => el.removeEventListener("pointerup", onPointerUp);
  }, [elRef, options.enabled]);
}
