import { useRef, useState } from "react";
import { Card, type CardHandle } from "../card/Card";
import { useFreeRotate } from "../gestures/useFreeRotate";
import { useFlip } from "../gestures/useFlip";
import type { CardInstance } from "../../data/cards";
import "./CardDetailOverlay.css";

export interface CardDetailOverlayProps {
  instance: CardInstance;
  originRect: DOMRect;
  onClose: () => void;
}

/**
 * 3.7 詳細ビュー: タップしたカードそのものが中央へ拡大移動する(enterFromで発地点を渡す)。
 * ドラッグで自由回転し、下フリックまたは背景タップで元の場所へ帰る。
 */
export function CardDetailOverlay({ instance, originRect, onClose }: CardDetailOverlayProps) {
  const [faceUp, setFaceUp] = useState(true);
  const [handle, setHandle] = useState<CardHandle | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useFreeRotate(handle?.engine ?? null, stageRef, { enabled: !!handle, onDismiss: onClose });
  useFlip(stageRef, { enabled: true, onFlip: () => setFaceUp((f) => !f) });

  const enterFrom = { x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2 };

  return (
    <div className="card-detail-overlay" onClick={onClose}>
      <div className="card-detail-overlay__backdrop" />
      <div className="card-detail-overlay__stage" ref={stageRef} onClick={(e) => e.stopPropagation()}>
        <Card
          ref={setHandle}
          instance={instance}
          faceUp={faceUp}
          size="lg"
          interactive={false}
          draggable={false}
          enterFrom={enterFrom}
        />
      </div>
      <div className="card-detail-overlay__hint">ドラッグで回転・ダブルタップで裏返す・下へフリックで戻る</div>
    </div>
  );
}
