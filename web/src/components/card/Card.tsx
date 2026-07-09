import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import { CardPhysicsEngine } from "../../core/cardPhysics";
import { SPRINGS } from "../../core/spring";
import { onCross90 } from "../../core/flip";
import { playCardSound } from "../../core/sound";
import { usePressTilt } from "../gestures/usePressTilt";
import { useDragCard } from "../gestures/useDragCard";
import type { CardInstance } from "../../data/cards";
import "./Card.css";

export type PulseKind = "damage" | "buff" | "destroy" | "rare-reveal";

export interface CardHandle {
  engine: CardPhysicsEngine;
  pulse: (kind: PulseKind) => void;
}

export interface CardProps {
  instance: CardInstance;
  faceUp?: boolean;
  size?: "sm" | "md" | "lg";
  playable?: boolean;
  disabled?: boolean;
  draggable?: boolean;
  interactive?: boolean;
  onTap?: (rect: DOMRect) => void;
  onDrop?: (zoneId: string) => void;
  onRejected?: () => void;
  /** 初回マウント時、この画面座標(中心)から飛んでくるように演出する(山札から手札へ、等)。 */
  enterFrom?: { x: number; y: number };
  style?: CSSProperties;
  className?: string;
}

export const Card = forwardRef<CardHandle, CardProps>(function Card(
  {
    instance,
    faceUp = true,
    size = "md",
    playable = false,
    disabled = false,
    draggable = false,
    interactive = true,
    onTap,
    onDrop,
    onRejected,
    enterFrom,
    style,
    className,
  },
  ref,
) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const holoRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const pulseRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CardPhysicsEngine>(new CardPhysicsEngine({ flip: faceUp ? 0 : 180 }));

  // レイアウト位置が変わった(手札→盤面、並び替え等)場合に旧位置からのオフセットを
  // ジャンプさせ、0へスプリングで戻すことで「飛んで新しい場所に収まる」動きを作る(FLIP法)。
  const lastRectRef = useRef<DOMRect | null>(null);
  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const prev = lastRectRef.current;
    if (prev) {
      const dx = prev.left - rect.left;
      const dy = prev.top - rect.top;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        engineRef.current.x.value += dx;
        engineRef.current.y.value += dy;
        engineRef.current.setTarget({ x: 0, y: 0 }, SPRINGS.deal);
      }
    } else if (enterFrom) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      engineRef.current.jumpTo({ x: enterFrom.x - centerX, y: enterFrom.y - centerY, scale: 0.7 });
      engineRef.current.setTarget({ x: 0, y: 0, scale: 1 }, SPRINGS.deal);
    }
    lastRectRef.current = rect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    engineRef.current.setRefs({
      body: bodyRef.current,
      shadow: shadowRef.current,
      glare: glareRef.current,
      holo: holoRef.current,
      ring: ringRef.current,
    });
    engineRef.current.start();
    return () => engineRef.current.destroy();
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const target = faceUp ? 0 : 180;
    if (Math.abs(engine.flip.target - target) < 1) return;
    engine.setTarget({ flip: target }, SPRINGS.flip);
    engine.setTarget({ scale: 1.06 });
    window.setTimeout(() => engine.setTarget({ scale: 1 }), 160);
    const stop = onCross90(engine.flip, () => playCardSound("flip", 0.5));
    return stop;
  }, [faceUp]);

  useImperativeHandle(ref, () => ({
    engine: engineRef.current,
    pulse: (kind) => {
      const engine = engineRef.current;
      const el = pulseRef.current;
      if (kind === "damage") {
        engine.x.addVelocity(-260);
        engine.setTarget({ rz: -4 });
        window.setTimeout(() => engine.setTarget({ rz: 0 }), 120);
      }
      if (kind === "destroy") {
        engine.setTarget({ scale: 0.85, ry: engine.ry.value + 40, elevation: 0 }, SPRINGS.settle);
      }
      if (el) {
        el.dataset.kind = kind;
        el.classList.remove("card-pulse--active");
        // reflow を挟んで再アニメーションを保証する
        void el.offsetWidth;
        el.classList.add("card-pulse--active");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  const pressTiltEnabled = interactive && !draggable;
  usePressTilt(engineRef.current, slotRef, {
    enabled: pressTiltEnabled,
    onTap,
  });
  useDragCard(engineRef.current, slotRef, {
    enabled: interactive && draggable,
    disabled,
    uid: instance.uid,
    onTap,
    onDrop,
    onRejected,
  });

  const def = instance.def;
  const hp = instance.currentHp ?? def.hp;
  const atk = instance.currentAttack ?? def.attack;

  return (
    <div
      ref={slotRef}
      className={`card-slot card-slot--${size} ${className ?? ""} ${disabled ? "card-slot--disabled" : ""}`}
      style={style}
      data-uid={instance.uid}
    >
      <div ref={shadowRef} className="card-shadow" />
      <div ref={bodyRef} className="card-body">
        <div className="card-face card-face--back">
          <div className="card-back-pattern" />
        </div>
        <div className="card-face card-face--front" style={{ ["--hue" as string]: def.hue }}>
          <div className="card-artwork">
            <span className="card-symbol">{def.symbol}</span>
          </div>
          <div ref={holoRef} className={`card-holo ${def.rarity === "rare" ? "card-holo--rare" : ""}`} />
          <div ref={glareRef} className="card-glare" />
          <div className="card-frame">
            <span className="card-cost">{def.cost}</span>
            <span className="card-name">{def.name}</span>
            {def.kind === "creature" && (
              <span className="card-stats">
                <span className="card-atk">⚔{atk}</span>
                <span className="card-hp">♥{hp}</span>
              </span>
            )}
          </div>
          <div ref={ringRef} className={`card-state-ring ${playable ? "card-state-ring--playable" : ""}`} />
          <div ref={pulseRef} className="card-pulse" />
        </div>
      </div>
    </div>
  );
});
