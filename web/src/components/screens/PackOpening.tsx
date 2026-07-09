import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "../card/Card";
import { CARD_DEFS, makeInstance, type CardInstance } from "../../data/cards";
import { playCardSound } from "../../core/sound";
import { vibrate } from "../../core/haptics";
import "./PackOpening.css";

const PACK_SIZE = 5;

function drawPackCards(): CardInstance[] {
  const rareDefs = CARD_DEFS.filter((d) => d.rarity === "rare");
  const commonDefs = CARD_DEFS.filter((d) => d.rarity === "common");
  const cards: CardInstance[] = [];
  const guaranteedRare = rareDefs[Math.floor(Math.random() * rareDefs.length)];
  for (let i = 0; i < PACK_SIZE - 1; i++) {
    const def = commonDefs[Math.floor(Math.random() * commonDefs.length)];
    cards.push(makeInstance(def.id));
  }
  cards.splice(Math.floor(Math.random() * PACK_SIZE), 0, makeInstance(guaranteedRare.id));
  return cards;
}

type Stage = "sealed" | "torn" | "revealing" | "done";

export function PackOpening() {
  const [stage, setStage] = useState<Stage>("sealed");
  const [tear, setTear] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [currentFlipped, setCurrentFlipped] = useState(false);
  const packRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const startX = useRef(0);

  const cards = useMemo(() => drawPackCards(), [stage === "sealed" ? 0 : 1]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = (e: React.PointerEvent) => {
    if (stage !== "sealed") return;
    dragging.current = true;
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    playCardSound("touch", 0.3);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || stage !== "sealed") return;
    const el = packRef.current;
    if (!el) return;
    const width = el.getBoundingClientRect().width;
    const progress = Math.max(0, Math.min(1, (e.clientX - startX.current) / (width * 0.8)));
    setTear(progress);
    if (progress > 0.02) playCardSound("fan", 0.3 + progress * 0.4);
    if (progress >= 1) {
      dragging.current = false;
      setStage("torn");
      playCardSound("rare", 0.6);
      vibrate("heavy");
      window.setTimeout(() => setStage("revealing"), 500);
    }
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (tear < 1) setTear(0);
  };

  const currentCard = cards[revealed];
  const isLast = revealed >= cards.length;

  useEffect(() => {
    if (stage === "revealing" && isLast) setStage("done");
  }, [stage, isLast]);

  const advance = () => {
    if (stage !== "revealing" || isLast) return;
    if (!currentFlipped) {
      setCurrentFlipped(true);
      if (currentCard.def.rarity === "rare") {
        playCardSound("rare", 0.8);
        vibrate("heavy");
      } else {
        playCardSound("flip", 0.5);
        vibrate("selection");
      }
      window.setTimeout(() => {
        setRevealed((r) => r + 1);
        setCurrentFlipped(false);
      }, 900);
    } else {
      setRevealed((r) => r + 1);
      setCurrentFlipped(false);
    }
  };

  const collected = cards.slice(0, revealed);

  return (
    <div className="pack-opening">
      {stage === "sealed" && (
        <div
          ref={packRef}
          className="pack-opening__pack"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ ["--tear" as string]: tear }}
        >
          <div className="pack-opening__seal-left" />
          <div className="pack-opening__seal-right" />
          <div className="pack-opening__label">左右にスワイプして封を切る</div>
        </div>
      )}

      {(stage === "torn" || stage === "revealing" || stage === "done") && (
        <div className="pack-opening__reveal">
          {!isLast && stage === "revealing" && (
            <div
              className={`pack-opening__current ${!currentFlipped && currentCard.def.rarity === "rare" ? "pack-opening__current--glow" : ""}`}
              onClick={advance}
            >
              <Card instance={currentCard} faceUp={currentFlipped} interactive={false} size="lg" />
            </div>
          )}
          {(isLast || stage === "done") && <div className="pack-opening__hint">開封完了</div>}
          {!isLast && stage === "revealing" && (
            <div className="pack-opening__hint">タップでめくる ({revealed}/{cards.length})</div>
          )}
          {collected.length > 0 && (
            <div className="pack-opening__collected">
              {collected.map((card) => (
                <div key={card.uid} className="pack-opening__collected-item">
                  <Card instance={card} faceUp interactive={false} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
