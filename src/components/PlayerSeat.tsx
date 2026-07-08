import type { PlayerState } from '../engine/game';
import { CardView, type CardVariant } from './CardView';

const AVATAR: Record<number, string> = { 0: '🙂', 1: '🔥', 2: '🛡️', 3: '🎭' };

interface PlayerSeatProps {
  player: PlayerState;
  emote?: string;
  /** 0=未公開 1=フリップ中演出 2=公開済み */
  showdownStage?: 0 | 1 | 2;
  isActingNow?: boolean;
}

export function PlayerSeat({ player, emote, showdownStage = 0, isActingNow }: PlayerSeatProps) {
  const revealed = showdownStage >= 1;
  const notMeVariant: CardVariant = player.isHuman && !revealed ? 'hiddenSelf' : 'faceUp';

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

      {emote && <div className="seat__emote">{emote}</div>}

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
          variant={notMeVariant}
          size="sm"
          highlighted={!player.isHuman || revealed}
          flipping={player.isHuman && showdownStage === 1}
        />
      </div>

      {player.isHuman && player.hint && <div className="seat__hint">ヒント: {player.hint.label}</div>}
      {player.folded && <div className="seat__foldedBadge">降り</div>}
    </div>
  );
}
