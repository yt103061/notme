import type { Card } from '../engine/cards';
import { CardView } from './CardView';

interface FlipCardProps {
  card: Card;
  revealed: boolean;
  size?: 'sm' | 'md' | 'lg';
  /** めくりを遅らせてスタッガー演出にする */
  delayMs?: number;
  glow?: boolean;
}

/** 裏面から表面へ 3D 回転でめくれるカード。ショーダウンの「数字が捲られる」瞬間を担う */
export function FlipCard({ card, revealed, size = 'md', delayMs = 0, glow }: FlipCardProps) {
  return (
    <div className={`flip flip--${size} ${glow ? 'flip--glow' : ''}`}>
      <div
        className={`flip__inner ${revealed ? 'flip__inner--revealed' : ''}`}
        style={{ transitionDelay: `${delayMs}ms` }}
      >
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
