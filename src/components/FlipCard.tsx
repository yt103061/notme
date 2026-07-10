import { useEffect, useRef } from 'react';
import type { Card } from '../engine/cards';
import { CardView } from './CardView';
import { CardPhysicsEngine } from '../core/cardPhysics';
import { SPRINGS } from '../core/spring';
import { onCross90 } from '../core/flip';
import { playCardSound } from '../core/sound';

interface FlipCardProps {
  card: Card;
  revealed: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** めくりを遅らせてスタッガー演出にする */
  delayMs?: number;
  glow?: boolean;
}

/**
 * 裏面から表面へスプリング駆動で回転してめくれるカード(plan.md 3.5)。
 * 90度を通過した瞬間に「めくり音」を鳴らし、視覚と聴覚のタイミングを一致させる。
 */
export function FlipCard({ card, revealed, size = 'md', delayMs = 0, glow }: FlipCardProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CardPhysicsEngine>(new CardPhysicsEngine({ flip: revealed ? 180 : 0 }));

  useEffect(() => {
    const engine = engineRef.current;
    engine.setRefs({ body: innerRef.current });
    engine.start();
    return () => engine.destroy();
  }, []);

  useEffect(() => {
    const engine = engineRef.current;
    const target = revealed ? 180 : 0;
    if (Math.abs(engine.flip.target - target) < 1) return;
    const timer = window.setTimeout(() => {
      engine.setTarget({ flip: target }, SPRINGS.flip);
      const stop = onCross90(engine.flip, () => playCardSound('flip', 0.6));
      window.setTimeout(stop, 900);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [revealed, delayMs]);

  return (
    <div className={`flip flip--${size} ${glow ? 'flip--glow' : ''}`}>
      <div ref={innerRef} className="flip__inner">
        <div className="flip__face flip__face--back">
          <CardView variant="hiddenOpponent" size={size} />
        </div>
        <div className="flip__face flip__face--front">
          <CardView card={card} variant="faceUp" size={size} />
        </div>
      </div>
    </div>
  );
}
