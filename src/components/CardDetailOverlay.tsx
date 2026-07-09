import { useRef, useState } from 'react';
import { CardView, type CardHandle, type CardVariant } from './CardView';
import { useFreeRotate } from '../gestures/useFreeRotate';
import type { Card } from '../engine/cards';

export interface CardDetailOverlayProps {
  card?: Card;
  variant: CardVariant;
  originRect: DOMRect;
  onClose: () => void;
}

/**
 * plan.md 3.7: タップしたカードそのものを中央へ拡大し、ドラッグで自由に傾けて眺められるようにする。
 * 下フリック、または背景タップで元の場所へ戻す。
 */
export function CardDetailOverlay({ card, variant, originRect, onClose }: CardDetailOverlayProps) {
  const [handle, setHandle] = useState<CardHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useFreeRotate(handle?.engine ?? null, stageRef, { enabled: !!handle, onDismiss: onClose });

  const enterFrom = { x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2 };

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-overlay__backdrop" />
      <div className="card-detail-overlay__stage" ref={stageRef} onClick={(e) => e.stopPropagation()}>
        <CardView ref={setHandle} card={card} variant={variant} size="xl" interactive enterFrom={enterFrom} />
      </div>
      <div className="card-detail-overlay__hint">ドラッグで傾ける・下へフリックまたはタップで戻る</div>
    </div>
  );
}
