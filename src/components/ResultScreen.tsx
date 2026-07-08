import { useState } from 'react';
import type { PlayerState } from '../engine/game';
import * as S from '../strings';
import { analytics } from '../platform/analytics';

interface ResultScreenProps {
  players: PlayerState[];
  onPlayAgain: () => void;
}

export function ResultScreen({ players, onPlayAgain }: ResultScreenProps) {
  const [shared, setShared] = useState(false);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const topScore = sorted[0].score;
  const winners = sorted.filter((p) => p.score === topScore);
  const human = players.find((p) => p.isHuman)!;

  async function handleShare() {
    analytics.track('share_clicked', { score: human.score });
    const text = S.SHARE_TEXT(human.score);
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try {
        await navigator.share({ text, url, title: S.APP_NAME });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // clipboard unavailable — no-op, button remains as-is
    }
  }

  return (
    <div className="result">
      <h2 className="result__title">
        {winners.length > 1 ? S.RESULT_DRAW : S.RESULT_WINNER(winners[0].name)}
      </h2>
      <div className="result__board">
        {sorted.map((p, i) => (
          <div key={p.id} className={`result__row ${p.score === topScore ? 'result__row--winner' : ''}`}>
            <span className="result__rank">{i + 1}</span>
            <span className="result__name">{p.name}</span>
            <span className="result__score">{p.score}点</span>
          </div>
        ))}
      </div>
      <div className="result__actions">
        <button className="btn btn--secondary" onClick={handleShare}>
          {shared ? 'コピーしました！' : S.SHARE_BUTTON}
        </button>
        <button className="btn btn--primary" onClick={onPlayAgain}>
          {S.PLAY_AGAIN}
        </button>
      </div>
    </div>
  );
}
