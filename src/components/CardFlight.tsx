import { useEffect, useState } from 'react';
import type { Card } from '../engine/cards';
import { CardView } from './CardView';

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

const REFERENCE_SIZE = 52; // CardView "md" の基準幅。wrapper の scale で実際の座席サイズに合わせる
const DURATION_MS = 560;

export function CardFlight({ legs, onSettle }: CardFlightProps) {
  const [flown, setFlown] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setFlown(true));
    const total = Math.max(...legs.map((l) => (l.delayMs ?? 0) + DURATION_MS + 200), DURATION_MS + 200);
    const t = window.setTimeout(onSettle, total);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cardFlight" aria-hidden>
      {legs.map((leg) => {
        const rect = flown ? leg.toRect : leg.fromRect;
        const scale = rect.width / REFERENCE_SIZE;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = leg.toRect.left - leg.fromRect.left;
        const rot = flown ? 0 : dx >= 0 ? -6 : 6;
        const crossfade = leg.startAppearance !== leg.endAppearance;
        return (
          <div
            key={leg.id}
            className="cardFlight__piece"
            style={{
              left: cx,
              top: cy,
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${rot}deg)`,
              transitionDelay: `${leg.delayMs ?? 0}ms`,
            }}
          >
            <div className="cardFlight__stack">
              <div className="cardFlight__face" style={{ opacity: crossfade && flown ? 0 : 1 }}>
                <CardView card={leg.card} variant={leg.startAppearance} size="md" />
              </div>
              {crossfade && (
                <div className="cardFlight__face cardFlight__face--end" style={{ opacity: flown ? 1 : 0 }}>
                  <CardView card={leg.card} variant={leg.endAppearance} size="md" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
