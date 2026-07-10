import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CardPhysicsEngine } from "../core/cardPhysics";
import { playCardSound } from "../core/sound";
import { vibrate } from "../core/haptics";

interface PressTiltOptions {
  enabled: boolean;
  maxTilt?: number;
  hoverTilt?: boolean;
  onTap?: (rect: DOMRect) => void;
}

/**
 * ドラッグしないカード(盤面のクリーチャー等)向けの押下チルト+タップ検出。
 * 3.1(タッチダウン)と3.2(ホールド&チルト)を担当する。
 */
export function usePressTilt(
  engine: CardPhysicsEngine,
  elRef: RefObject<HTMLElement | null>,
  options: PressTiltOptions,
) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = elRef.current;
    if (!el || !options.enabled) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let moved = false;
    const maxTilt = options.maxTilt ?? 8;

    const computeTilt = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const nx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      engine.setTarget({ rx: -ny * maxTilt, ry: nx * maxTilt });
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      moved = false;
      el.setPointerCapture(pointerId);
      engine.setTarget({ scale: 1.04, elevation: 0.3 });
      computeTilt(e.clientX, e.clientY);
      playCardSound("touch", 0.3);
      vibrate("light");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 4) moved = true;
      computeTilt(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      if (pointerId === null) return;
      engine.setTarget({ scale: 1, elevation: 0, rx: 0, ry: 0 });
      if (!moved) optsRef.current.onTap?.(el.getBoundingClientRect());
      pointerId = null;
    };

    const onPointerEnter = () => {
      if (!optsRef.current.hoverTilt || pointerId !== null) return;
      engine.setTarget({ scale: 1.015, elevation: 0.1 });
    };

    const onPointerLeave = () => {
      if (pointerId !== null) return;
      engine.setTarget({ scale: 1, elevation: 0, rx: 0, ry: 0 });
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("pointerenter", onPointerEnter);
    el.addEventListener("pointerleave", onPointerLeave);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("pointerenter", onPointerEnter);
      el.removeEventListener("pointerleave", onPointerLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, elRef, options.enabled]);
}
