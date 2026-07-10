import { betLabel, type DecisionTell, type PlayerState, type TellKind } from '../engine/game';
import { CardView } from './CardView';
import * as S from '../strings';

const AVATAR: Record<number, string> = { 0: '🙂', 1: '🔥', 2: '🛡️', 3: '🎭' };

interface PlayerSeatProps {
  player: PlayerState;
  emote?: string;
  isActingNow?: boolean;
  /** せーの同時公開バッジ＋漏れテル */
  decisionTell?: DecisionTell;
  badgeDelaySec?: number;
  /** カードフライト演出の発着点として、このプレイヤーの notMe 要素を登録する */
  notMeRef?: (el: HTMLElement | null) => void;
}

/** 卓の向こう側に座る対戦相手。コンパクトな浮遊席。相手の not me は自分から見えている */
function tellIcon(tell: TellKind) {
  if (tell === 'snap') return '⚡';
  if (tell === 'tank') return '⏳';
  if (tell === 'panic') return '!';
  return '●';
}

function TellStack({ tell, delaySec = 0 }: { tell?: DecisionTell | null; delaySec?: number }) {
  if (!tell) return null;
  return (
    <div className="oppo__tellStack" style={{ animationDelay: `${delaySec}s` }}>
      <div className={`oppo__decision oppo__decision--${tell.choice === 'fold' ? 'fold' : 'stay'}`}>
        {tell.choice === 'fold' ? S.BADGE_FOLD : betLabel(tell.choice)}
      </div>
      <div className={`oppo__tell oppo__tell--${tell.tell}`}>
        <span>{tellIcon(tell.tell)}</span>
        <span>{tell.tell}</span>
        {tell.wavered && <span className="oppo__waver">≈</span>}
      </div>
    </div>
  );
}

export function PlayerSeat({
  player,
  emote,
  isActingNow,
  decisionTell,
  badgeDelaySec = 0,
  notMeRef,
}: PlayerSeatProps) {
  return (
    <div
      className={['oppo', player.folded ? 'oppo--folded' : '', isActingNow ? 'oppo--active' : '']
        .filter(Boolean)
        .join(' ')}
    >
      {decisionTell ? null : (
        (emote || player.lastTell?.reaction) && !player.folded && (
          <div key={emote ?? player.lastTell?.reaction} className="oppo__emote">
            {emote ?? player.lastTell?.reaction}
          </div>
        )
      )}

      <div className="oppo__plate">
        <span className="oppo__avatar" aria-hidden>
          {AVATAR[player.id] ?? '🙂'}
        </span>
        <span className="oppo__name">{player.name}</span>
        <span className="oppo__status">{player.folded ? 'FOLD' : isActingNow ? 'TURN' : player.staked > 0 ? `BET ${player.staked}` : 'WATCH'}</span>
        <span className="oppo__score">
          {S.CHIP_ICON}
          {player.stack}
        </span>
      </div>

      <div className="oppo__cards">
        <div className="oppo__hiddenStack" aria-label="相手の手札2枚">
          <CardView variant="hiddenOpponent" size="xs" />
          <CardView variant="hiddenOpponent" size="xs" />
          <span>手札×2</span>
        </div>
        <div className="oppo__notMe" ref={notMeRef}>
          <CardView card={player.notMe} variant="faceUp" size="sm" highlighted />
          <span>not me</span>
        </div>
      </div>

      {player.folded && <div className="oppo__foldedBadge">降り</div>}

      <TellStack tell={decisionTell ?? player.lastTell} delaySec={badgeDelaySec} />
    </div>
  );
}
