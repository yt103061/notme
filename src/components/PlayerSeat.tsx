import { betLabel, type BetChoice, type PlayerState } from '../engine/game';
import { CardView } from './CardView';
import * as S from '../strings';

const AVATAR: Record<number, string> = { 0: '🙂', 1: '🔥', 2: '🛡️', 3: '🎭' };

interface PlayerSeatProps {
  player: PlayerState;
  emote?: string;
  isActingNow?: boolean;
  /** せーの同時公開バッジ（賭け選択） */
  decisionBadge?: BetChoice;
  badgeDelaySec?: number;
  /** カードフライト演出の発着点として、このプレイヤーの notMe 要素を登録する */
  notMeRef?: (el: HTMLElement | null) => void;
}

/** 卓の向こう側に座る対戦相手。コンパクトな浮遊席。相手の not me は自分から見えている */
export function PlayerSeat({
  player,
  emote,
  isActingNow,
  decisionBadge,
  badgeDelaySec = 0,
  notMeRef,
}: PlayerSeatProps) {
  return (
    <div
      className={['oppo', player.folded ? 'oppo--folded' : '', isActingNow ? 'oppo--active' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {decisionBadge ? null : (
        emote && !player.folded && (
          <div key={emote} className="oppo__emote">
            {emote}
          </div>
        )
      )}

      <div className="oppo__plate">
        <span className="oppo__avatar" aria-hidden>
          {AVATAR[player.id] ?? '🙂'}
        </span>
        <span className="oppo__name">{player.name}</span>
        <span className="oppo__score">
          {S.CHIP_ICON}
          {player.stack}
        </span>
      </div>

      <div className="oppo__cards">
        <CardView variant="hiddenOpponent" size="sm" />
        <CardView variant="hiddenOpponent" size="sm" />
        <div ref={notMeRef}>
          <CardView card={player.notMe} variant="faceUp" size="sm" highlighted />
        </div>
      </div>

      {player.folded && <div className="oppo__foldedBadge">降り</div>}

      {decisionBadge && (
        <div
          className={`oppo__decision oppo__decision--${decisionBadge === 'fold' ? 'fold' : 'stay'}`}
          style={{ animationDelay: `${badgeDelaySec}s` }}
        >
          {decisionBadge === 'fold' ? S.BADGE_FOLD : betLabel(decisionBadge)}
        </div>
      )}
    </div>
  );
}
