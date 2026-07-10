import { useState } from "react";
import { Card, type CardHandle } from "../card/Card";
import type { CardInstance } from "../../data/cards";
import "./CardFan.css";

export interface CardFanProps {
  cards: CardInstance[];
  playableIds?: Set<string>;
  disabledIds?: Set<string>;
  interactive?: boolean;
  faceUp?: boolean;
  size?: "sm" | "md" | "lg";
  onPlay?: (uid: string, zoneId: string) => void;
  onTapCard?: (uid: string, rect: DOMRect) => void;
  enterFromByUid?: Map<string, { x: number; y: number }>;
  registerHandle?: (uid: string, handle: CardHandle | null) => void;
  align?: "bottom" | "top";
}

/**
 * 手札の弧配置。ポインタが乗ったカードの近傍が左右に逃げて隙間を作る(3.6)。
 * 並び替えはCard内部のFLIP機構がレイアウト差分から自動でスプリング補間する。
 */
export function CardFan({
  cards,
  playableIds,
  disabledIds,
  interactive = true,
  faceUp = true,
  size = "md",
  onPlay,
  onTapCard,
  enterFromByUid,
  registerHandle,
  align = "bottom",
}: CardFanProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const total = cards.length;
  const angleStep = total > 1 ? Math.min(10, 26 / (total - 1)) : 0;

  return (
    <div className={`card-fan card-fan--${align}`}>
      {cards.map((card, i) => {
        const angle = (i - (total - 1) / 2) * angleStep;
        const dist = hoverIndex === null ? 0 : i - hoverIndex;
        const spread = hoverIndex === null ? 0 : Math.max(0, 26 - Math.abs(dist) * 10) * Math.sign(dist || 1);
        const translateX = angle * 2.6 + (dist === 0 ? 0 : spread);
        const translateY = Math.abs(angle) * 1.6 - (hoverIndex === i ? 16 : 0);
        const rotate = align === "bottom" ? angle : -angle;

        return (
          <div
            key={card.uid}
            className="card-fan__item"
            style={{
              transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
              zIndex: hoverIndex === i ? 50 : i,
            }}
            onMouseEnter={() => setHoverIndex(i)}
            onMouseLeave={() => setHoverIndex((h) => (h === i ? null : h))}
          >
            <Card
              ref={(handle) => registerHandle?.(card.uid, handle)}
              instance={card}
              faceUp={faceUp}
              size={size}
              draggable={interactive}
              interactive={interactive}
              playable={playableIds?.has(card.uid) ?? false}
              disabled={disabledIds?.has(card.uid) ?? false}
              enterFrom={enterFromByUid?.get(card.uid)}
              onTap={(rect) => onTapCard?.(card.uid, rect)}
              onDrop={(zoneId) => onPlay?.(card.uid, zoneId)}
            />
          </div>
        );
      })}
    </div>
  );
}
