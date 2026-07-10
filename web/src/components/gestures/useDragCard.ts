import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CardPhysicsEngine } from "../../core/cardPhysics";
import { playCardSound } from "../../core/sound";
import { vibrate } from "../../core/haptics";
import {
  publishDragStart,
  publishDragMove,
  publishDragEnd,
  findDropZoneAt,
} from "../../core/dropZones";
import { SPRINGS } from "../../core/spring";

interface DragCardOptions {
  enabled: boolean;
  /** コスト不足などで条件未達のカード。掴むこと自体は許すが、持ち上がりを浅くする(6.2)。 */
  disabled?: boolean;
  uid: string;
  onTap?: (rect: DOMRect) => void;
  onDrop?: (zoneId: string) => void;
  onRejected?: () => void;
  flickThreshold?: number;
}

const DRAG_THRESHOLD = 8;
const FLICK_VELOCITY = 1200; // px/s

/**
 * 手札のカード向け:タッチダウン(3.1)→ホールドチルト(3.2)→ドラッグ(3.3)→
 * リリース/フリック(3.4)を1つの連続したジェスチャーとして扱う。
 */
export function useDragCard(
  engine: CardPhysicsEngine,
  elRef: RefObject<HTMLElement | null>,
  options: DragCardOptions,
) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = elRef.current;
    if (!el || !options.enabled) return;

    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let mode: "idle" | "press" | "drag" = "idle";
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let vx = 0;
    let vy = 0;
    const maxTilt = 12;

    const computeTilt = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const nx = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const ny = (clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      engine.setTarget({ rx: -ny * maxTilt, ry: nx * maxTilt });
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerId = e.pointerId;
      startX = lastX = e.clientX;
      startY = lastY = e.clientY;
      lastT = performance.now();
      vx = 0;
      vy = 0;
      mode = "press";
      el.setPointerCapture(pointerId);
      const liftElevation = optsRef.current.disabled ? 0.15 : 0.3;
      engine.setTarget({ scale: 1.04, elevation: liftElevation }, SPRINGS.follow);
      computeTilt(e.clientX, e.clientY);
      playCardSound("touch", optsRef.current.disabled ? 0.15 : 0.3);
      vibrate("light");
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null) return;
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 1 / 240);
      vx = (e.clientX - lastX) / dt;
      vy = (e.clientY - lastY) / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (mode === "press" && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        mode = "drag";
        const disabled = optsRef.current.disabled;
        engine.setTarget({ scale: disabled ? 1.03 : 1.08, elevation: disabled ? 0.15 : 1 }, SPRINGS.follow);
        playCardSound(disabled ? "invalid" : "lift", disabled ? 0.2 : 0.5);
        vibrate(disabled ? "selection" : "medium");
        publishDragStart(optsRef.current.uid, e.clientX, e.clientY);
      }

      if (mode === "drag") {
        engine.setTarget({ x: dx, y: dy, rz: Math.max(-6, Math.min(6, vx / 250)) }, SPRINGS.follow);
        publishDragMove(e.clientX, e.clientY);
      } else {
        computeTilt(e.clientX, e.clientY);
      }
    };

    const finishDrag = (e: PointerEvent) => {
      const speed = Math.hypot(vx, vy);
      const zoneId = findDropZoneAt(e.clientX, e.clientY, optsRef.current.uid);
      publishDragEnd();

      if (zoneId) {
        engine.setTarget({ x: 0, y: 0, rz: 0, scale: 0.98, elevation: 0.15 }, SPRINGS.settle);
        window.setTimeout(() => engine.setTarget({ scale: 1, elevation: 0 }, SPRINGS.settle), 90);
        playCardSound("land", Math.min(1, speed / 1500 + 0.3));
        vibrate("heavy");
        optsRef.current.onDrop?.(zoneId);
      } else {
        // 無効な場所: 投げた方向へ弧を描いて戻る(速度を引き継ぐ)
        engine.x.addVelocity(vx * 0.4);
        engine.y.addVelocity(vy * 0.4);
        engine.setTarget({ x: 0, y: 0, rx: 0, ry: 0, rz: 0, scale: 1, elevation: 0 }, SPRINGS.settle);
        if (optsRef.current.disabled || speed > (optsRef.current.flickThreshold ?? FLICK_VELOCITY)) {
          playCardSound("invalid", 0.4);
        }
        optsRef.current.onRejected?.();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (pointerId === null) return;
      if (mode === "drag") {
        finishDrag(e);
      } else {
        engine.setTarget({ scale: 1, elevation: 0, rx: 0, ry: 0 }, SPRINGS.tilt);
        optsRef.current.onTap?.(el.getBoundingClientRect());
      }
      pointerId = null;
      mode = "idle";
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, elRef, options.enabled]);
}
