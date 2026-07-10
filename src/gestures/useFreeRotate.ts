import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { CardPhysicsEngine } from "../core/cardPhysics";
import { SPRINGS } from "../core/spring";

interface FreeRotateOptions {
  enabled: boolean;
  onDismiss?: () => void;
}

const DISMISS_VELOCITY = 900;

/**
 * 詳細ビュー(3.7)向け:ドラッグでカードを自由回転させ、離すと慣性で少し回ってから正面へ戻る。
 * 下方向へのフリックで一覧へ戻る合図として使う。
 */
export function useFreeRotate(
  engine: CardPhysicsEngine | null,
  elRef: RefObject<HTMLElement | null>,
  options: FreeRotateOptions,
) {
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    const el = elRef.current;
    if (!el || !engine || !options.enabled) return;

    let pointerId: number | null = null;
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let vx = 0;
    let vy = 0;

    engine.setTarget({ rx: 0, ry: 0, scale: 1 }, SPRINGS.tilt);

    const onPointerDown = (e: PointerEvent) => {
      pointerId = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      vx = 0;
      vy = 0;
      el.setPointerCapture(pointerId);
      engine.setTarget({ scale: 1.04 });
    };

    const onPointerMove = (e: PointerEvent) => {
      if (pointerId === null) return;
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 1 / 240);
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      vx = dx / dt;
      vy = dy / dt;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;

      engine.ry.set(engine.ry.target + dx * 0.5);
      engine.ry.config = { stiffness: 500, damping: 45, mass: 1 };
      engine.rx.set(engine.rx.target - dy * 0.5);
      engine.rx.config = { stiffness: 500, damping: 45, mass: 1 };
      engine.y.set(engine.y.target + dy * 0.3);
    };

    const onPointerUp = () => {
      if (pointerId === null) return;
      pointerId = null;
      engine.setTarget({ scale: 1 });

      if (Math.abs(vy) > DISMISS_VELOCITY && vy > 0) {
        optsRef.current.onDismiss?.();
        return;
      }

      // 慣性を少し残しつつ、揺れながら正面へ戻る
      engine.ry.addVelocity(vx * 0.15);
      engine.rx.addVelocity(-vy * 0.15);
      engine.setTarget({ rx: 0, ry: 0, y: 0 }, SPRINGS.tilt);
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
