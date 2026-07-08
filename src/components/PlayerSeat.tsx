import type { PlayerState } from '../engine/game';
import { CardView } from './CardView';
import * as S from '../strings';

const AVATAR: Record<number, string> = { 0: '🙂', 1: '🔥', 2: '🛡️', 3: '🎭' };

interface PlayerSeatProps {
  player: PlayerState;
  emote?: string;
  isActingNow?: boolean;
  /** せーの同時公開バッジ。'stay' | 'fold' */
  decisionBadge?: 'stay' | 'fold';
  badgeDelaySec?: number;
}

export function PlayerSeat({ player, emote, isActingNow, decisionBadge, badgeDelaySec = 0 }: PlayerSeatProps) {
  return (
    <div
      className={['seat', player.folded ? 'seat--folded' : '', isActingNow ? 'seat--active' : '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="seat__header">
        <span className="seat__avatar" aria-hidden>
          {AVATAR[player.id] ?? '🙂'}
        </span>
        <span className="seat__name">{player.name}</span>
        <span className="seat__score">{player.score}</span>
      </div>

      {emote && !player.folded && (
        <div key={emote} className="seat__emote">
          {emote}
        </div>
      )}

      <div className="seat__cards">
        {player.isHuman ? (
          player.hole.map((card, i) => <CardView key={i} card={card} variant="faceUp" size="sm" />)
        ) : (
          <>
            <CardView variant="hiddenOpponent" size="sm" />
            <CardView variant="hiddenOpponent" size="sm" />
          </>
        )}
        <CardView
          card={player.notMe}
          variant={player.isHuman ? 'hiddenSelf' : 'faceUp'}
          size="sm"
          highlighted={!player.isHuman}
        />
      </div>

      {player.isHuman && player.hint && <div className="seat__hint">ヒント: {player.hint.label}</div>}
      {player.folded && <div className="seat__foldedBadge">降り</div>}

      {decisionBadge && (
        <div
          className={`seat__decision seat__decision--${decisionBadge}`}
          style={{ animationDelay: `${badgeDelaySec}s` }}
        >
          {decisionBadge === 'stay' ? S.BADGE_STAY : S.BADGE_FOLD}
        </div>
      )}
    </div>
  );
}
