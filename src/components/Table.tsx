import { useEffect, useState } from 'react';
import { betLabel, type BetChoice, type GameState, type PlayerState } from '../engine/game';
import { CardView } from './CardView';
import { FlipCard } from './FlipCard';
import { PlayerSeat } from './PlayerSeat';
import { sfx } from '../audio/sfx';
import { HAND_LABEL, SUDDEN_DEATH_BADGE } from '../strings';
import * as S from '../strings';

interface TableProps {
  state: GameState;
  emotes: Record<number, string>;
  actingPlayerId?: number;
  /** せーの同時公開中：playerId -> その人の賭け選択 */
  decisionReveal?: Record<number, BetChoice> | null;
}

export function Table({ state, emotes, actingPlayerId, decisionReveal }: TableProps) {
  const human = state.players.find((p) => p.isHuman)!;
  const opponents = state.players.filter((p) => !p.isHuman);

  const badgeFor = (id: number): BetChoice | undefined => {
    if (!decisionReveal || !(id in decisionReveal)) return undefined;
    return decisionReveal[id];
  };
  const revealIds = decisionReveal ? Object.keys(decisionReveal).map(Number) : [];
  const badgeDelay = (id: number) => 0.25 + revealIds.indexOf(id) * 0.22;

  // 場札は「配られてすぐ」ではなく「一拍おいてめくれる」演出にする（表示アクションを明示するため）
  const [revealedCount, setRevealedCount] = useState(0);
  useEffect(() => {
    if (state.community.length > revealedCount) {
      const t = window.setTimeout(() => {
        setRevealedCount(state.community.length);
        sfx.play('flip');
      }, 320);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.community.length]);

  const humanBadge = badgeFor(human.id);

  return (
    <div className="arena" key={`${state.handNumber}-${state.isSuddenDeath ? 'sd' : ''}`}>
      {/* 卓の面（奥に向かって沈む楕円フェルト）。カードやUIはこの上に平置きされる */}
      <div className="arena__felt" aria-hidden>
        <div className="arena__feltRim" />
        <div className="arena__feltGlow" />
      </div>

      {/* 上部の浮遊バー：ハンド数 */}
      <div className="arena__topbar">
        <span className="arena__handLabel">{HAND_LABEL(state.handNumber, state.totalHands)}</span>
        {state.isSuddenDeath && <span className="arena__suddenDeath">{SUDDEN_DEATH_BADGE}</span>}
      </div>

      {/* 卓の向こう側に並ぶ対戦相手（円卓のアーチ状に配置） */}
      <div className="arena__opponents">
        {opponents.map((p) => (
          <PlayerSeat
            key={p.id}
            player={p}
            emote={emotes[p.id]}
            isActingNow={actingPlayerId === p.id}
            decisionBadge={badgeFor(p.id)}
            badgeDelaySec={badgeDelay(p.id)}
          />
        ))}
      </div>

      {/* 卓の中心のスポットライト：ポット＋共有の場札 */}
      <div className="arena__center">
        <div className="arena__pot">
          <span className="arena__potLabel">{S.POT_LABEL}</span>
          <span className="arena__potValue">
            {S.CHIP_ICON} {state.pot}
          </span>
        </div>
        <span className="arena__centerLabel">場札</span>
        <div className="arena__community">
          {[0, 1].map((i) => (
            <div key={i} className="arena__flopSlot">
              {i < state.community.length ? (
                <FlipCard card={state.community[i]} revealed={i < revealedCount} size="md" />
              ) : (
                <div className="arena__emptySlot" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 手前＝あなた。カードを大きく主役として見せる */}
      <div
        className={['arena__hero', human.folded ? 'arena__hero--folded' : '', actingPlayerId === human.id ? 'arena__hero--active' : '']
          .filter(Boolean)
          .join(' ')}
      >
        <HeroInfo player={human} />
        <div className="arena__heroCards">
          <div className="arena__heroCard arena__heroCard--l">
            <CardView card={human.hole[0]} variant="faceUp" size="xl" />
          </div>
          <div className="arena__heroCard arena__heroCard--r">
            <CardView card={human.hole[1]} variant="faceUp" size="xl" />
          </div>
          <div className="arena__heroCard arena__heroCard--notme">
            <CardView card={human.notMe} variant="hiddenSelf" size="xl" />
            <span className="arena__notmeTag">not me</span>
          </div>
        </div>

        {emotes[human.id] && !human.folded && (
          <div key={emotes[human.id]} className="arena__heroEmote">
            {emotes[human.id]}
          </div>
        )}
        {humanBadge && (
          <div
            className={`arena__heroDecision arena__heroDecision--${humanBadge === 'fold' ? 'fold' : 'stay'}`}
            style={{ animationDelay: `${badgeDelay(human.id)}s` }}
          >
            {humanBadge === 'fold' ? S.BADGE_FOLD : betLabel(humanBadge)}
          </div>
        )}
        {human.folded && <div className="arena__heroFolded">降り</div>}
      </div>
    </div>
  );
}

/** あなたの名前・スタック・ヒントを表す浮遊チップ列 */
function HeroInfo({ player }: { player: PlayerState }) {
  return (
    <div className="arena__heroInfo">
      <span className="arena__heroName">
        <span className="arena__heroAvatar" aria-hidden>
          🙂
        </span>
        {player.name}
      </span>
      <span className="arena__heroScore">
        {S.CHIP_ICON} {player.stack}
      </span>
      {player.hint && <span className="arena__heroHint">ヒント：{player.hint.label}</span>}
    </div>
  );
}
