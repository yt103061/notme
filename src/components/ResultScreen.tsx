import { useEffect, useState } from 'react';
import type { PlayerState } from '../engine/game';
import type { DailyBonusStatus } from '../platform/wallet';
import * as S from '../strings';
import { analytics } from '../platform/analytics';
import { Confetti } from './Confetti';
import { sfx } from '../audio/sfx';

interface ResultScreenProps {
  players: PlayerState[];
  onPlayAgain: () => void;
  chipDelta: number;
  chipBalance: number;
  canAfford: boolean;
  dailyBonus: DailyBonusStatus;
  onClaimBonus: () => void;
  onHome: () => void;
  onRandomMatch: () => void;
}

export function ResultScreen({
  players,
  onPlayAgain,
  chipDelta,
  chipBalance,
  canAfford,
  dailyBonus,
  onClaimBonus,
  onHome,
  onRandomMatch,
}: ResultScreenProps) {
  const [shared, setShared] = useState(false);
  const sorted = [...players].sort((a, b) => b.stack - a.stack);
  const topStack = sorted[0].stack;
  const winners = sorted.filter((p) => p.stack === topStack);
  const humanIsChampion = winners.some((p) => p.isHuman);

  useEffect(() => {
    sfx.play(humanIsChampion ? 'fanfare' : 'lose');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleShare() {
    analytics.track('share_clicked', { chipDelta });
    const text = S.SHARE_TEXT(chipDelta);
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
      {humanIsChampion && <Confetti count={36} />}
      <div className="result__trophy" aria-hidden>
        {humanIsChampion ? '🏆' : '🎴'}
      </div>
      <h2 className="result__title">
        {winners.length > 1 ? S.RESULT_DRAW : S.RESULT_WINNER(winners[0].name)}
      </h2>
      <div className="result__chipDelta">
        <span className={chipDelta >= 0 ? 'result__chipDelta--plus' : 'result__chipDelta--minus'}>
          {S.RESULT_CHIP_DELTA(chipDelta)}
        </span>
        <span className="result__chipBalance">{S.RESULT_NEW_BALANCE(chipBalance)}</span>
      </div>
      <div className="result__board">
        {sorted.map((p, i) => (
          <div
            key={p.id}
            className={`result__row ${p.stack === topStack ? 'result__row--winner' : ''}`}
            style={{ animationDelay: `${0.2 + i * 0.15}s` }}
          >
            <span className="result__rank">{i + 1}</span>
            <span className="result__name">
              {p.name}
              {p.stack === topStack && ' 👑'}
            </span>
            <span className="result__score">
              {S.CHIP_ICON} {p.stack}
            </span>
          </div>
        ))}
      </div>

      {dailyBonus.available && (
        <button className="btn btn--secondary" onClick={onClaimBonus}>
          🎁 {S.DAILY_BONUS_BUTTON}（+{dailyBonus.amount}{S.CHIP_ICON}）
        </button>
      )}

      <div className="result__actions">
        <button className="btn btn--secondary" onClick={handleShare}>
          {shared ? 'コピーしました！' : S.SHARE_BUTTON}
        </button>
        <button className="btn btn--ghost" onClick={onHome}>
          {S.ACTION_HOME}
        </button>
        <button className="btn btn--secondary" onClick={onRandomMatch}>
          {S.PLAY_RANDOM_MATCH}
        </button>
        <button className="btn btn--primary" onClick={onPlayAgain} disabled={!canAfford}>
          {S.PLAY_AGAIN}
        </button>
      </div>
      {!canAfford && <p className="result__insufficient">{S.INSUFFICIENT_CHIPS_TITLE}</p>}
    </div>
  );
}
