import { useEffect, useRef } from 'react';
import type { Card } from '../engine/cards';
import { CardView } from './CardView';
import { Spring, SPRINGS } from '../core/spring';
import { addTicker } from '../core/ticker';
import { playCardSound } from '../core/sound';

/** notMe の交換を「実際にカードが飛ぶ」演出で表す1本分の軌跡 */
export interface FlightLeg {
  id: string;
  card: Card;
  fromRect: DOMRect;
  toRect: DOMRect;
  startAppearance: 'faceUp' | 'hiddenSelf';
  endAppearance: 'faceUp' | 'hiddenSelf';
  /** 山札交換の2本目など、少し遅れて飛ばす場合に使う */
  delayMs?: number;
}

interface CardFlightProps {
  legs: FlightLeg[];
  onSettle: () => void;
}

const REFERENCE_SIZE = 52; // CardView "md" の基準幅。piece の scale で実際の座席サイズに合わせる
const DURATION_MS = 560;

interface LegRuntime {
  x: Spring;
  y: Spring;
  rot: Spring;
  scale: Spring;
  el: HTMLDivElement | null;
  faceStart: HTMLDivElement | null;
  faceEnd: HTMLDivElement | null;
  crossfade: boolean;
}

/**
 * plan.md の原則(durationイージング禁止・速度を持ったスプリングのみ)に従い、
 * CSS transitionではなく手書きスプリングでカードの軌跡を描く。
 */
export function CardFlight({ legs, onSettle }: CardFlightProps) {
  const runtimeRef = useRef(new Map<string, LegRuntime>());

  useEffect(() => {
    const runtime = runtimeRef.current;
    for (const leg of legs) {
      const fromCx = leg.fromRect.left + leg.fromRect.width / 2;
      const fromCy = leg.fromRect.top + leg.fromRect.height / 2;
      const dx = leg.toRect.left - leg.fromRect.left;
      const startRot = dx >= 0 ? -6 : 6;
      const startScale = leg.fromRect.width / REFERENCE_SIZE;
      runtime.set(leg.id, {
        x: new Spring(fromCx, SPRINGS.deal),
        y: new Spring(fromCy, SPRINGS.deal),
        rot: new Spring(startRot, SPRINGS.deal),
        scale: new Spring(startScale, SPRINGS.deal),
        el: null,
        faceStart: null,
        faceEnd: null,
        crossfade: leg.startAppearance !== leg.endAppearance,
      });
    }

    const timers: number[] = legs.map((leg) =>
      window.setTimeout(() => {
        const rt = runtime.get(leg.id);
        if (!rt) return;
        const toCx = leg.toRect.left + leg.toRect.width / 2;
        const toCy = leg.toRect.top + leg.toRect.height / 2;
        rt.x.set(toCx);
        rt.y.set(toCy);
        rt.rot.set(0);
        rt.scale.set(leg.toRect.width / REFERENCE_SIZE);
        playCardSound('lift', 0.5);
        if (rt.faceStart) rt.faceStart.style.opacity = rt.crossfade ? '0' : '1';
        if (rt.faceEnd) rt.faceEnd.style.opacity = '1';
      }, leg.delayMs ?? 0),
    );

    const stopTicker = addTicker((dt) => {
      for (const leg of legs) {
        const rt = runtime.get(leg.id);
        if (!rt || !rt.el) continue;
        rt.x.step(dt);
        rt.y.step(dt);
        rt.rot.step(dt);
        rt.scale.step(dt);
        rt.el.style.left = `${rt.x.value}px`;
        rt.el.style.top = `${rt.y.value}px`;
        rt.el.style.transform = `translate(-50%, -50%) scale(${rt.scale.value}) rotate(${rt.rot.value}deg)`;
      }
    });

    const total = Math.max(...legs.map((l) => (l.delayMs ?? 0) + DURATION_MS + 200), DURATION_MS + 200);
    const settleTimer = window.setTimeout(() => {
      playCardSound('land', 0.6);
      onSettle();
    }, total);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.clearTimeout(settleTimer);
      stopTicker();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cardFlight" aria-hidden>
      {legs.map((leg) => (
        <div
          key={leg.id}
          className="cardFlight__piece"
          ref={(el) => {
            const rt = runtimeRef.current.get(leg.id);
            if (rt) rt.el = el;
          }}
          style={{
            left: leg.fromRect.left + leg.fromRect.width / 2,
            top: leg.fromRect.top + leg.fromRect.height / 2,
            transform: `translate(-50%, -50%) scale(${leg.fromRect.width / REFERENCE_SIZE})`,
          }}
        >
          <div className="cardFlight__stack">
            <div
              className="cardFlight__face"
              ref={(el) => {
                const rt = runtimeRef.current.get(leg.id);
                if (rt) rt.faceStart = el;
              }}
            >
              <CardView card={leg.card} variant={leg.startAppearance} size="md" />
            </div>
            {leg.startAppearance !== leg.endAppearance && (
              <div
                className="cardFlight__face cardFlight__face--end"
                style={{ opacity: 0 }}
                ref={(el) => {
                  const rt = runtimeRef.current.get(leg.id);
                  if (rt) rt.faceEnd = el;
                }}
              >
                <CardView card={leg.card} variant={leg.endAppearance} size="md" />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
