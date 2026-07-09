import { useEffect } from "react";
import { Card } from "../card/Card";
import type { CardInstance } from "../../data/cards";
import type { Side } from "../game/gameEngine";
import { playCardSound } from "../../core/sound";
import "./ResultScreen.css";

export interface ResultScreenProps {
  winner: Side;
  highlightCard: CardInstance | null;
  onRestart: () => void;
}

/**
 * 7.3/7.4: 勝因になった1手を主役に見得を切り、素早くリトライ導線へつなげる。
 */
export function ResultScreen({ winner, highlightCard, onRestart }: ResultScreenProps) {
  const won = winner === "player";

  useEffect(() => {
    playCardSound(won ? "victory" : "invalid", 1);
  }, [won]);

  return (
    <div className={`result-screen ${won ? "result-screen--win" : "result-screen--lose"}`}>
      <div className="result-screen__banner">{won ? "勝利" : "敗北"}</div>
      {highlightCard && (
        <div className="result-screen__highlight">
          <Card instance={highlightCard} faceUp interactive={false} size="lg" />
          <p className="result-screen__highlight-label">決め手の1枚</p>
        </div>
      )}
      <button className="result-screen__restart" onClick={onRestart}>
        もう1回
      </button>
    </div>
  );
}
