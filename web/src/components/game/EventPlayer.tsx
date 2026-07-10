import { useEffect, useState } from "react";
import { fxQueue, type FxEvent } from "../../core/fxQueue";
import "./EventPlayer.css";

const LABELS: Record<string, string> = {
  damageFace: "会心の一撃!",
  gameOver: "",
};

/** 6.1 L3「見得」: プレイを止めて見せる瞬間。必ずタップでスキップできる。 */
export function EventPlayer() {
  const [current, setCurrent] = useState<FxEvent | null>(null);

  useEffect(() => fxQueue.subscribeL3((ev) => {
    if (ev?.kind === "gameOver") {
      // 勝敗はResult画面側で見せるため、ここでは即座に流す
      fxQueue.skipL3();
      return;
    }
    setCurrent(ev);
  }), []);

  if (!current) return null;

  return (
    <div className="event-player" onClick={() => fxQueue.skipL3()}>
      <div className="event-player__flash" />
      <div className="event-player__label">{LABELS[current.kind] ?? ""}</div>
      <div className="event-player__hint">タップでスキップ</div>
    </div>
  );
}
