import { useEffect, useRef } from "react";
import { Card } from "../card/Card";
import type { CardInstance } from "../../data/cards";
import "./CardStack.css";

export interface CardStackProps {
  count: number;
  label: string;
  topCard?: CardInstance;
  faceUp?: boolean;
  onTapTop?: () => void;
  onRectChange?: (rect: DOMRect) => void;
}

/**
 * 山札・捨て札。下のカードを1pxずつずらして厚みを表現する(3.6)。
 */
export function CardStack({ count, label, topCard, faceUp = false, onTapTop, onRectChange }: CardStackProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const layers = Math.min(5, Math.max(1, count));

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !onRectChange) return;
    onRectChange(el.getBoundingClientRect());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  return (
    <div ref={rootRef} className="card-stack" onClick={onTapTop}>
      <div className="card-stack__pile">
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className="card-stack__layer"
            style={{ transform: `translate(${i * 1}px, ${-i * 1.4}px)`, zIndex: i }}
          />
        ))}
        {topCard && faceUp && (
          <div className="card-stack__top">
            <Card instance={topCard} faceUp interactive={false} size="sm" />
          </div>
        )}
      </div>
      <span className="card-stack__count">{label} {count}</span>
    </div>
  );
}
