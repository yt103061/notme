import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { Card } from '../engine/cards';
import { rankLabel, SUIT_SYMBOLS, isRed } from '../engine/cards';
import { CardPhysicsEngine } from '../core/cardPhysics';
import { SPRINGS } from '../core/spring';
import { usePressTilt } from '../gestures/usePressTilt';

export type CardVariant = 'faceUp' | 'hiddenSelf' | 'hiddenOpponent';

export interface CardHandle {
  engine: CardPhysicsEngine;
}

interface CardViewProps {
  card?: Card;
  variant: CardVariant;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  highlighted?: boolean;
  /** 触れると持ち上がり・傾き・光沢が反応する(plan.md 3.1/3.2)。手前のあなたのカードにのみ有効化する */
  interactive?: boolean;
  onTap?: (rect: DOMRect) => void;
  /** マウント時、この画面座標(中心)から飛んでくるように演出する(タップした元位置→詳細ビュー中央、等) */
  enterFrom?: { x: number; y: number };
}

function faceClasses(card: Card | undefined, variant: CardVariant, size: string, highlighted?: boolean) {
  const classes = ['card', `card--${size}`];
  if (highlighted) classes.push('card--highlighted');
  if (variant === 'faceUp' && card) classes.push('card--face', isRed(card) ? 'card--red' : 'card--black');
  else if (variant === 'hiddenSelf') classes.push('card--hidden-self');
  else classes.push('card--hidden-opponent');
  return classes.join(' ');
}

function FaceContent({ card, variant }: { card?: Card; variant: CardVariant }) {
  if (variant === 'faceUp' && card) {
    return (
      <>
        <span className="card__rank">{rankLabel(card.rank)}</span>
        <span className="card__suit">{SUIT_SYMBOLS[card.suit]}</span>
      </>
    );
  }
  if (variant === 'hiddenSelf') return <span className="card__mystery">?</span>;
  return null;
}

export const CardView = forwardRef<CardHandle, CardViewProps>(function CardView(
  { card, variant, size = 'md', highlighted, interactive = false, onTap, enterFrom },
  ref,
) {
  const slotRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const shadowRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CardPhysicsEngine>(new CardPhysicsEngine());

  useEffect(() => {
    if (!interactive) return;
    engineRef.current.setRefs({ body: bodyRef.current, shadow: shadowRef.current, glare: glareRef.current });
    engineRef.current.start();
    return () => engineRef.current.destroy();
  }, [interactive]);

  useEffect(() => {
    if (!interactive || !enterFrom) return;
    const el = slotRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    engineRef.current.jumpTo({ x: enterFrom.x - centerX, y: enterFrom.y - centerY, scale: 0.55 });
    engineRef.current.setTarget({ x: 0, y: 0, scale: 1 }, SPRINGS.deal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({ engine: engineRef.current }), []);

  usePressTilt(engineRef.current, slotRef, { enabled: interactive, hoverTilt: true, onTap });

  if (!interactive) {
    return (
      <div className={faceClasses(card, variant, size, highlighted)}>
        <FaceContent card={card} variant={variant} />
      </div>
    );
  }

  return (
    <div ref={slotRef} className={`card-physics card--${size}`}>
      <div ref={shadowRef} className="card-physics__shadow" />
      <div ref={bodyRef} className={faceClasses(card, variant, size, highlighted)}>
        <FaceContent card={card} variant={variant} />
        <div ref={glareRef} className="card-physics__glare" />
      </div>
    </div>
  );
});
